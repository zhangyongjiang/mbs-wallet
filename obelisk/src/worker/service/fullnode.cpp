#include "fullnode.hpp"

#include "../node_impl.hpp"
#include "../echo.hpp"
#include "fetch_x.hpp"

namespace obelisk {

using namespace bc;
using std::placeholders::_1;
using std::placeholders::_2;

void fullnode_fetch_history(node_impl& node,
    const incoming_message& request, queue_send_callback queue_send)
{
    payment_address payaddr;
    uint32_t from_height;
    if (!unwrap_fetch_history_args(payaddr, from_height, request))
        return;
    // TODO: Slows down queries!
    //log_debug(LOG_WORKER) << "fetch_history("
    //    << payaddr.encoded() << ", from_height=" << from_height << ")";
    fetch_history(node.blockchain(), node.transaction_indexer(),
        payaddr,
        std::bind(send_history_result, _1, _2, request, queue_send),
        from_height);
}

} // namespace obelisk

