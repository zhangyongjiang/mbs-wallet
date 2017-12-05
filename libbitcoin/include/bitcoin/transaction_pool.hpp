/*
 * Copyright (c) 2011-2013 libbitcoin developers (see AUTHORS)
 *
 * This file is part of libbitcoin.
 *
 * libbitcoin is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License with
 * additional permissions to the one published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version. For more information see LICENSE.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
#ifndef LIBBITCOIN_TRANSACTION_POOL_HPP
#define LIBBITCOIN_TRANSACTION_POOL_HPP

#include <functional>
#include <boost/circular_buffer.hpp>

#include <bitcoin/threadpool.hpp>
#include <bitcoin/types.hpp>
#include <bitcoin/primitives.hpp>
#include <bitcoin/blockchain/blockchain.hpp>

namespace libbitcoin {

struct BC_API transaction_entry_info
{
    typedef std::function<void (const std::error_code&)> confirm_handler;
    hash_digest hash;
    transaction_type tx;
    confirm_handler handle_confirm;
};

typedef boost::circular_buffer<transaction_entry_info> pool_buffer;

/**
 * Before bitcoin transactions make it into a block, they go into
 * a transaction memory pool. This class encapsulates that functionality
 * performing the neccessary validation of a transaction before accepting
 * it into its internal buffer.
 *
 * The interface has been deliberately kept simple to minimise overhead.
 * This class attempts no tracking of inputs or spends and only provides
 * a store/fetch paradigm. Tracking must be performed externally and make
 * use of store's handle_store and handle_confirm to manage changes in the
 * state of memory pool transactions.
 *
 * @code
 *  threadpool pool(1);
 *  // transaction_pool needs access to the blockchain
 *  blockchain* chain = load_our_backend();
 *  // create and initialize the transaction memory pool
 *  transaction_pool txpool(pool, *chain);
 *  txpool.start();
 * @endcode
 */
class transaction_pool
{
public:
    typedef std::function<
        void (const std::error_code&, const index_list&)> validate_handler;

    typedef std::function<
        void (const std::error_code&, const transaction_type&)>
            fetch_handler;

    typedef std::function<void (bool)> exists_handler;

    typedef transaction_entry_info::confirm_handler confirm_handler;

    BC_API transaction_pool(threadpool& pool, blockchain& chain);
    BC_API void start();

    /// Non-copyable class
    transaction_pool(const transaction_pool&) = delete;
    /// Non-copyable class
    void operator=(const transaction_pool&) = delete;

    /**
     * Set the size of the circular buffer. Defaults to 2000.
     */
    BC_API void set_capacity(size_t capacity);

    /**
     * Validate a transaction without storing it.
     *
     * handle_validate is called on completion. The second argument is a list
     * of unconfirmed input indexes. These inputs refer to a transaction
     * that is not in the blockchain and is currently in the memory pool.
     *
     * In the case where store results in error::input_not_found, the
     * unconfirmed field refers to the single problematic input.
     *
     * If the maximum capacity of this container is reached and a
     * transaction is removed prematurely, then handle_confirm()
     * will be called with the error_code error::forced_removal.
     *
     * @param[in]   tx                  Transaction to store
     * @param[in]   handle_confirm      Handler for when transaction
     *                                  becomes confirmed.
     * @code
     *  void handle_confirm(
     *      const std::error_code& ec    // Status of operation
     *  );
     * @endcode
     * @param[in]   handle_validate     Completion handler for
     *                                  validate operation.
     * @code
     *  void handle_validate(
     *      const std::error_code& ec,      // Status of operation
     *      const index_list& unconfirmed   // Unconfirmed input indexes
     *  );
     * @endcode
     */
    BC_API void validate(const transaction_type& tx,
        validate_handler handle_validate);

    /**
     * Attempt to validate and store a transaction.
     *
     * handle_validate is called on completion. The second argument is a list
     * of unconfirmed input indexes. These inputs refer to a transaction
     * that is not in the blockchain and is currently in the memory pool.
     *
     * In the case where store results in error::input_not_found, the
     * unconfirmed field refers to the single problematic input.
     *
     * If the maximum capacity of this container is reached and a
     * transaction is removed prematurely, then handle_confirm()
     * will be called with the error_code error::forced_removal.
     *
     * @param[in]   tx                  Transaction to store
     * @param[in]   handle_confirm      Handler for when transaction
     *                                  becomes confirmed.
     * @code
     *  void handle_confirm(
     *      const std::error_code& ec    // Status of operation
     *  );
     * @endcode
     * @param[in]   handle_validate     Completion handler for
     *                                  validate and store operation.
     * @code
     *  void handle_validate(
     *      const std::error_code& ec,      // Status of operation
     *      const index_list& unconfirmed   // Unconfirmed input indexes
     *  );
     * @endcode
     */
    BC_API void store(const transaction_type& tx,
        confirm_handler handle_confirm, validate_handler handle_validate);

    /**
     * Fetch transaction by hash.
     *
     * @param[in]   transaction_hash  Transaction's hash
     * @param[in]   handle_fetch      Completion handler for fetch operation.
     * @code
     *  void handle_fetch(
     *      const std::error_code& ec,  // Status of operation
     *      const transaction_type& tx  // Transaction
     *  );
     * @endcode
     */
    BC_API void fetch(const hash_digest& transaction_hash,
        fetch_handler handle_fetch);

    /**
     * Is this transaction in the pool?
     *
     * @param[in]   transaction_hash  Transaction's hash
     * @param[in]   handle_exists     Completion handler for exists operation.
     * @code
     *  void handle_exists(bool);
     * @endcode
     */
    BC_API void exists(const hash_digest& transaction_hash,
        exists_handler handle_exists);

private:
    void do_validate(const transaction_type& tx,
        validate_handler handle_validate);
    void validation_complete(
        const std::error_code& ec, const index_list& unconfirmed,
        const hash_digest& tx_hash, validate_handler handle_validate);

    bool tx_exists(const hash_digest& tx_hash);

    void reorganize(const std::error_code& ec,
        size_t fork_point,
        const blockchain::block_list& new_blocks,
        const blockchain::block_list& replaced_blocks);
    void invalidate_pool();
    void takeout_confirmed(const blockchain::block_list& new_blocks);
    void try_delete(const hash_digest& tx_hash);

    async_strand strand_;
    blockchain& chain_;
    pool_buffer pool_;
};

} // namespace libbitcoin

#endif

