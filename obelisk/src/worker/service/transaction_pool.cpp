#include "transaction_pool.hpp"

#include "../node_impl.hpp"
#include "../echo.hpp"
#include "fetch_x.hpp"

namespace obelisk {

using namespace bc;
using std::placeholders::_1;
using std::placeholders::_2;

void transaction_validated(
    const std::error_code& ec, const index_list& unconfirmed,
    const incoming_message& request, queue_send_callback queue_send);
void transaction_pool_validate(node_impl& node,
    const incoming_message& request, queue_send_callback queue_send)
{
    const data_chunk& raw_tx = request.data();
    transaction_type tx;
    try
    {
        satoshi_load(raw_tx.begin(), raw_tx.end(), tx);
    }
    catch (end_of_stream)
    {
        // error
        transaction_validated(error::bad_stream, index_list(),
            request, queue_send);
        return;
    }
    node.transaction_pool().validate(tx,
        std::bind(transaction_validated, _1, _2, request, queue_send));
}
void transaction_validated(
    const std::error_code& ec, const index_list& unconfirmed,
    const incoming_message& request, queue_send_callback queue_send)
{
    data_chunk result(4 + unconfirmed.size() * 4);
    auto serial = make_serializer(result.begin());
    write_error_code(serial, ec);
    BITCOIN_ASSERT(serial.iterator() == result.begin() + 4);
    for (uint32_t unconfirm_index: unconfirmed)
        serial.write_4_bytes(unconfirm_index);
    BITCOIN_ASSERT(serial.iterator() == result.end());
    log_debug(LOG_REQUEST)
        << "transaction_pool.validate() finished. Sending response: "
        << "ec=" << ec.message();
    outgoing_message response(request, result);
    queue_send(response);
}

void transaction_pool_fetch_transaction(node_impl& node,
    const incoming_message& request, queue_send_callback queue_send)
{
    hash_digest tx_hash;
    if (!unwrap_fetch_transaction_args(tx_hash, request))
        return;
    log_debug(LOG_REQUEST) << "transaction_pool.fetch_transaction("
        << tx_hash << ")";
    node.transaction_pool().fetch(tx_hash,
        std::bind(transaction_fetched, _1, _2, request, queue_send));
}

} // namespace obelisk

