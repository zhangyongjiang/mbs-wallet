#ifndef OBELISK_WORKER_SUBSCRIBE_MANAGER_HPP
#define OBELISK_WORKER_SUBSCRIBE_MANAGER_HPP

#include <unordered_map>
#include <boost/date_time/posix_time/posix_time.hpp>
#include <bitcoin/bitcoin.hpp>
#include <obelisk/message.hpp>
#include "node_impl.hpp"
#include "service/util.hpp"

namespace obelisk {

class subscribe_manager
{
public:
    subscribe_manager(node_impl& node);
    void subscribe(
        const incoming_message& request, queue_send_callback queue_send);
    void renew(
        const incoming_message& request, queue_send_callback queue_send);

    void submit(size_t height, const bc::hash_digest& block_hash,
        const bc::transaction_type& tx);

private:
    struct subscription
    {
        boost::posix_time::ptime expiry_time;
        const bc::data_chunk client_origin;
        queue_send_callback queue_send;
    };

    typedef std::unordered_multimap<bc::payment_address, subscription>
        subscription_map;

    std::error_code add_subscription(
        const incoming_message& request, queue_send_callback queue_send);
    void do_subscribe(
        const incoming_message& request, queue_send_callback queue_send);
    void do_renew(
        const incoming_message& request, queue_send_callback queue_send);

    void do_submit(
        size_t height, const bc::hash_digest& block_hash,
        const bc::transaction_type& tx);
    void post_updates(const bc::payment_address& address,
        size_t height, const bc::hash_digest& block_hash,
        const bc::transaction_type& tx);

    void sweep_expired();

    bc::async_strand strand_;
    size_t subscribe_limit_ = 100000000;
    subscription_map subs_;
};

} // namespace obelisk

#endif

