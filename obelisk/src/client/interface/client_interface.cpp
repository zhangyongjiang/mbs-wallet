#include <obelisk/client/interface.hpp>

#include <bitcoin/bitcoin.hpp>
#include "client_fetch_x.hpp"
#include "client_util.hpp"

namespace obelisk {

using namespace bc;
using std::placeholders::_1;
using std::placeholders::_2;
namespace posix_time = boost::posix_time;
using posix_time::minutes;
using posix_time::second_clock;

#define LOG_SUBSCRIBER "subscriber"

const posix_time::time_duration sub_renew = minutes(2);

subscriber_part::subscriber_part(czmqpp::context& context)
  : socket_block_(context, ZMQ_SUB), socket_tx_(context, ZMQ_SUB)
{
}

bool subscriber_part::setup_socket(
    const std::string& connection, czmqpp::socket& socket)
{
    if (!socket.connect(connection))
    {
        log_warning(LOG_SUBSCRIBER)
            << "Subscriber failed to connect: " << connection;
        return false;
    }
    socket.set_subscribe("");
    return true;
}

bool subscriber_part::subscribe_blocks(const std::string& connection,
    block_notify_callback notify_block)
{
    if (!setup_socket(connection, socket_block_))
        return false;
    notify_block_ = notify_block;
    return true;
}

bool subscriber_part::subscribe_transactions(const std::string& connection,
    transaction_notify_callback notify_tx)
{
    if (!setup_socket(connection, socket_tx_))
        return false;
    notify_tx_ = notify_tx;
    return true;
}

void subscriber_part::update()
{
    czmqpp::poller poller;
    if (socket_tx_.self())
        poller.add(socket_tx_);
    if (socket_block_.self())
        poller.add(socket_block_);
    czmqpp::socket which = poller.wait(0);
    //  Poll socket for a reply, with timeout
    if (socket_tx_.self() && which == socket_tx_)
        recv_tx();
    if (socket_block_.self() && which == socket_block_)
        recv_block();
}

bool read_hash(hash_digest& hash, const data_chunk& raw_hash)
{
    if (raw_hash.size() != hash.size())
    {
        log_warning(LOG_SUBSCRIBER) << "Wrong size for hash. Dropping.";
        return false;
    }
    std::copy(raw_hash.begin(), raw_hash.end(), hash.begin());
    return true;
}

void subscriber_part::recv_tx()
{
    czmqpp::message message;
    bool success = message.receive(socket_tx_);
    BITCOIN_ASSERT(success);
    // [ tx hash ]
    // [ raw tx ]
    const data_stack& parts = message.parts();
    if (parts.size() != 2)
    {
        log_warning(LOG_SUBSCRIBER) << "Malformed tx response. Dropping.";
        return;
    }
    hash_digest tx_hash;
    if (!read_hash(tx_hash, parts[0]))
        return;
    const data_chunk& raw_tx = parts[1];
    transaction_type tx;
    satoshi_load(raw_tx.begin(), raw_tx.end(), tx);
    if (hash_transaction(tx) != tx_hash)
    {
        log_warning(LOG_SUBSCRIBER)
            << "Tx hash and actual tx unmatched. Dropping.";
        return;
    }
    // Everything OK!
    notify_tx_(tx);
}

void subscriber_part::recv_block()
{
    czmqpp::message message;
    bool success = message.receive(socket_block_);
    BITCOIN_ASSERT(success);
    // [ block hash ]
    // [ height ]
    // [ block data ]
    const data_stack& parts = message.parts();
    if (parts.size() != 3)
    {
        log_warning(LOG_SUBSCRIBER) << "Malformed block response. Dropping.";
        return;
    }
    hash_digest blk_hash;
    if (!read_hash(blk_hash, parts[0]))
        return;
    uint32_t height = from_little_endian<uint32_t>(parts[1].begin());
    const data_chunk& raw_blk = parts[2];
    block_type blk;
    satoshi_load(raw_blk.begin(), raw_blk.end(), blk);
    if (hash_block_header(blk.header) != blk_hash)
    {
        log_warning(LOG_SUBSCRIBER)
            << "Block hash and actual block unmatched. Dropping.";
        return;
    }
    // Everything OK!
    notify_block_(height, blk);
}

address_subscriber::address_subscriber(
    threadpool& pool, backend_cluster& backend)
  : backend_(backend), strand_(pool),
    last_renew_(second_clock::universal_time())
{
    backend_.append_filter("address.update",
        strand_.wrap(&address_subscriber::receive_update,
            this, _1, _2));
}

void address_subscriber::subscribe(const payment_address& address,
    update_handler handle_update, subscribe_handler handle_subscribe)
{
    data_chunk data(1 + short_hash_size);
    auto serial = make_serializer(data.begin());
    serial.write_byte(address.version());
    serial.write_short_hash(address.hash());
    BITCOIN_ASSERT(serial.iterator() == data.end());
    backend_.request("address.subscribe", data,
        strand_.wrap(&address_subscriber::receive_subscribe_result,
            this, _1, _2, address, handle_update, handle_subscribe));
}
void address_subscriber::receive_subscribe_result(
    const data_chunk& data, const worker_uuid& worker,
    const payment_address& address,
    update_handler handle_update, subscribe_handler handle_subscribe)
{
    // Insert listener into backend.
    subs_.emplace(address,
        subscription{worker, handle_update});
    // We will periodically send subscription
    // update messages with the Bitcoin address.
    // Decode std::error_code indicating success.
    decode_reply(data, worker, handle_subscribe);
}
void address_subscriber::decode_reply(
    const data_chunk& data, const worker_uuid& worker,
    subscribe_handler handle_subscribe)
{
    std::error_code ec;
    BITCOIN_ASSERT(data.size() == 4);
    auto deserial = make_deserializer(data.begin(), data.end());
    if (!read_error_code(deserial, data.size(), ec))
        return;
    BITCOIN_ASSERT(deserial.iterator() == data.end());
    handle_subscribe(ec, worker);
}

void address_subscriber::receive_update(
    const data_chunk& data, const worker_uuid& worker)
{
    // Deserialize data -> address, height, block hash, tx
    constexpr size_t info_size = 1 + short_hash_size + 4 + hash_size;
    auto deserial = make_deserializer(data.begin(), data.begin() + info_size);
    // [ addr,version ] (1 byte)
    uint8_t version_byte = deserial.read_byte();
    // [ addr.hash ] (20 bytes)
    short_hash addr_hash = deserial.read_short_hash();
    payment_address address(version_byte, addr_hash);
    // [ height ] (4 bytes)
    uint32_t height = deserial.read_4_bytes();
    // [ block_hash ] (32 bytes)
    const hash_digest blk_hash = deserial.read_hash();
    // [ tx ]
    BITCOIN_ASSERT(deserial.iterator() == data.begin() + info_size);
    transaction_type tx;
    satoshi_load(deserial.iterator(), data.end(), tx);
    post_updates(address, worker, height, blk_hash, tx);
}
void address_subscriber::post_updates(
    const bc::payment_address& address, const worker_uuid& worker,
    size_t height, const bc::hash_digest& blk_hash,
    const bc::transaction_type& tx)
{
    auto it = subs_.find(address);
    if (it == subs_.end())
        return;
    const subscription& sub = it->second;
    if (sub.worker != worker)
    {
        log_error(LOG_SUBSCRIBER)
            << "Server sent update from a different worker than expected.";
        return;
    }
    sub.handle_update(std::error_code(), height, blk_hash, tx);
}

void address_subscriber::update()
{
    auto renewal_sent = [](const data_chunk&, const worker_uuid&) {};
    // Loop through subscriptions, send renew packets.
    auto send_renew = [this, renewal_sent](
        const payment_address& address, const worker_uuid& worker)
    {
        data_chunk data(1 + short_hash_size);
        auto serial = make_serializer(data.begin());
        serial.write_byte(address.version());
        serial.write_short_hash(address.hash());
        BITCOIN_ASSERT(serial.iterator() == data.end());
        backend_.request("address.renew", data, renewal_sent, worker);
    };
    auto loop_subs = [this, send_renew]
    {
        for (const auto& keyvalue_pair: subs_)
            send_renew(keyvalue_pair.first, keyvalue_pair.second.worker);
    };
    const posix_time::ptime now = second_clock::universal_time();
    // Send renews...
    if (now - last_renew_ > sub_renew)
    {
        strand_.randomly_queue(loop_subs);
        last_renew_ = now;
    }
}

void address_subscriber::fetch_history(const payment_address& address,
    blockchain::fetch_handler_history handle_fetch,
    size_t from_height, const worker_uuid& worker)
{
    data_chunk data;
    wrap_fetch_history_args(data, address, from_height);
    backend_.request("address.fetch_history", data,
        std::bind(receive_history_result, _1, handle_fetch), worker);
}

fullnode_interface::fullnode_interface(
    threadpool& pool, const std::string& connection,
    const std::string& cert_filename, const std::string& server_pubkey)
  : backend_(pool, context_, connection, cert_filename, server_pubkey),
    blockchain(backend_), transaction_pool(backend_),
    protocol(backend_), address(pool, backend_),
    subscriber_(context_)
{
}

void fullnode_interface::update()
{
    backend_.update();
    subscriber_.update();
    // Address subcomponent.
    address.update();
}

bool fullnode_interface::subscribe_blocks(const std::string& connection,
    subscriber_part::block_notify_callback notify_block)
{
    return subscriber_.subscribe_blocks(connection, notify_block);
}
bool fullnode_interface::subscribe_transactions(const std::string& connection,
    subscriber_part::transaction_notify_callback notify_tx)
{
    return subscriber_.subscribe_transactions(connection, notify_tx);
}

} // namespace obelisk

