#ifndef OBELISK_CLIENT_PROTOCOL_HPP
#define OBELISK_CLIENT_PROTOCOL_HPP

#include <bitcoin/bitcoin.hpp>
#include <obelisk/client/backend.hpp>

namespace obelisk {

class protocol_interface
{
public:
    typedef std::function<void (const std::error_code&)> broadcast_handler;

    protocol_interface(backend_cluster& backend);
    void broadcast_transaction(const bc::transaction_type& tx,
        broadcast_handler handle_broadcast);
private:
    backend_cluster& backend_;
};

} // namespace obelisk

#endif

