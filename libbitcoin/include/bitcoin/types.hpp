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
#ifndef LIBBITCOIN_TYPES_HPP
#define LIBBITCOIN_TYPES_HPP

#include <boost/asio.hpp>
#include <array>
#include <memory>
#include <sstream>
#include <iomanip>
#include <vector>
#include <bitcoin/define.hpp>

namespace libbitcoin {

using boost::asio::ip::tcp;

#define DECLARE_PTR_TYPE(nametype) \
    class nametype; \
    typedef std::shared_ptr<nametype> nametype##_ptr

DECLARE_PTR_TYPE(acceptor);
DECLARE_PTR_TYPE(channel);

#undef DECLARE_PTR_TYPE

typedef std::shared_ptr<tcp::socket> socket_ptr;

template<size_t Size> using byte_array = std::array<uint8_t, Size>;

constexpr size_t short_hash_size = 20;
constexpr size_t hash_size = 32;
constexpr size_t long_hash_size = 64;

// Standard hash containers.
typedef byte_array<short_hash_size> short_hash;
typedef byte_array<hash_size> hash_digest;
typedef byte_array<long_hash_size> long_hash;

// Arbitrary byte storage.
typedef std::vector<uint8_t> data_chunk;
typedef std::vector<data_chunk> data_stack;

template<typename T>
data_chunk to_data_chunk(T iterable)
{
    return data_chunk(std::begin(iterable), std::end(iterable));
}

// A list of indices. Used for creating block_locator objects or
// Storing list of unconfirmed input indexes in tx pool.
typedef std::vector<size_t> index_list;

// List of hashes. Useful primitive.
typedef std::vector<hash_digest> hash_digest_list;
typedef std::vector<short_hash> short_hash_list;

// Make hash_digest and short_hash hashable for std::*map variants
template <typename HashType>
struct std_hash_wrapper
{
    size_t operator()(const HashType& h) const
    {
        std::hash<std::string> functor;
        return functor(std::string(std::begin(h), std::end(h)));
    }
};

struct BC_API node_address
{
    std::string hostname;
    uint16_t port;
};

} // namespace libbitcoin

// Extend std namespace with our hash wrappers
namespace std
{
    using libbitcoin::std_hash_wrapper;
    using libbitcoin::hash_digest;
    using libbitcoin::short_hash;

    template <>
    struct hash<hash_digest>
      : public std_hash_wrapper<hash_digest>
    {
    };

    template <>
    struct hash<short_hash>
      : public std_hash_wrapper<short_hash>
    {
    };
} // namespace std

#endif

