#ifndef OBELISK_CLIENT_TRANSACTION_POOL_HPP
#define OBELISK_CLIENT_TRANSACTION_POOL_HPP

#include <bitcoin/bitcoin.hpp>
#include <obelisk/client/backend.hpp>

namespace obelisk {

class transaction_pool_interface
{
public:
    transaction_pool_interface(backend_cluster& backend);
    void validate(const bc::transaction_type& tx,
        bc::transaction_pool::validate_handler handle_validate);
    void fetch_transaction(const bc::hash_digest& tx_hash,
        bc::transaction_pool::fetch_handler handle_fetch);
private:
    backend_cluster& backend_;
};

} // namespace obelisk

#endif

