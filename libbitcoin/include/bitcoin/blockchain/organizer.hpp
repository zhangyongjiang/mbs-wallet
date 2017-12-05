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
#ifndef LIBBITCOIN_BLOCKCHAIN_ORGANIZER_HPP
#define LIBBITCOIN_BLOCKCHAIN_ORGANIZER_HPP

#include <memory>
#include <boost/circular_buffer.hpp>
#include <bitcoin/block.hpp>
#include <bitcoin/primitives.hpp>
#include <bitcoin/blockchain/blockchain.hpp>
#include <bitcoin/utility/big_number.hpp>

namespace libbitcoin {

// Metadata + block
class block_detail
{
public:
    block_detail(const block_type& actual_block);
    block_detail(const block_header_type& header);
    block_type& actual();
    const block_type& actual() const;
    std::shared_ptr<block_type> actual_ptr() const;
    void mark_processed();
    bool is_processed();
    const hash_digest& hash() const;
    void set_info(const block_info& replace_info);
    const block_info& info() const;
    void set_errc(const std::error_code& ec);
    const std::error_code& errc() const;
private:
    std::shared_ptr<block_type> actual_block_;
    const hash_digest block_hash_;
    bool processed_ = false;

    // Syntax change is woraround for compiler bug as of VS2013 C++11 NOV CTP:
    // http://connect.microsoft.com/VisualStudio/feedback/details/792161/constructor-initializer-list-does-not-support-braced-init-list-form
    // block_info info_{block_status::orphan, 0};
    block_info info_ = block_info{block_status::orphan, 0};

    std::error_code ec_;
};

typedef std::shared_ptr<block_detail> block_detail_ptr;
typedef std::vector<block_detail_ptr> block_detail_list;

// An unordered memory pool for orphan blocks
class orphans_pool
{
public:
    orphans_pool(size_t pool_size);
    bool add(block_detail_ptr incoming_block);
    block_detail_list trace(block_detail_ptr end_block);
    block_detail_list unprocessed();
    void remove(block_detail_ptr remove_block);
private:
    boost::circular_buffer<block_detail_ptr> pool_;
};

typedef std::shared_ptr<orphans_pool> orphans_pool_ptr;

// The actual blockchain is encapsulated by this
class chain_keeper
{
public:
    virtual void start() = 0;
    // Must be able to call stop() twice without problems
    virtual void stop() = 0;

    virtual void add(block_detail_ptr incoming_block) = 0;
    virtual int find_index(const hash_digest& search_block_hash) = 0;
    virtual big_number end_slice_difficulty(size_t slice_begin_index) = 0;
    virtual bool end_slice(size_t slice_begin_index,
        block_detail_list& sliced_blocks) = 0;
};

typedef std::shared_ptr<chain_keeper> chain_keeper_ptr;

// Structure which organises the blocks from the orphan pool to the blockchain
class organizer
{
public:
    organizer(orphans_pool_ptr orphans, chain_keeper_ptr chain);

    void start();

protected:
    virtual std::error_code verify(size_t fork_index,
        const block_detail_list& orphan_chain, size_t orphan_index) = 0;
    virtual void reorganize_occured(
        size_t fork_point,
        const blockchain::block_list& arrivals,
        const blockchain::block_list& replaced) = 0;

private:
    void process(block_detail_ptr process_block);
    void replace_chain(size_t fork_index, block_detail_list& orphan_chain);
    void clip_orphans(block_detail_list& orphan_chain,
        size_t orphan_index, const std::error_code& invalid_reason);
    void notify_reorganize(
        size_t fork_point,
        const block_detail_list& orphan_chain,
        const block_detail_list& replaced_slice);

    orphans_pool_ptr orphans_;
    chain_keeper_ptr chain_;

    block_detail_list process_queue_;
};

typedef std::shared_ptr<organizer> organizer_ptr;

} // namespace libbitcoin

#endif

