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
#include <bitcoin/utility/base58.hpp>

#include <boost/algorithm/string.hpp>
#include <bitcoin/utility/assert.hpp>
#include <bitcoin/format.hpp>

namespace libbitcoin {

const std::string base58_chars =
    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

bool is_base58(const char c)
{
    // This works because the base58 characters happen to be in sorted order
    return std::binary_search(
        base58_chars.begin(), base58_chars.end(), c);
}
bool is_base58(const std::string& text)
{
    return std::all_of(text.begin(), text.end(),
        [](const char c){ return is_base58(c); });
}

template <typename Data>
auto search_first_nonzero(const Data& data)
    -> decltype(data.cbegin())
{
    auto first_nonzero = data.cbegin();
    while (first_nonzero != data.end() && *first_nonzero == 0)
        ++first_nonzero;
    return first_nonzero;
}

size_t count_leading_zeros(const data_chunk& unencoded)
{
    // Skip and count leading '1's.
    size_t leading_zeros = 0;
    for (const uint8_t byte: unencoded)
    {
        if (byte != 0)
            break;
        ++leading_zeros;
    }
    return leading_zeros;
}

void pack_value(data_chunk& indexes, int carry)
{
    // Apply "b58 = b58 * 256 + ch".
    for (auto it = indexes.rbegin(); it != indexes.rend(); ++it)
    {
        carry += 256 * (*it);
        *it = carry % 58;
        carry /= 58;
    }
    BITCOIN_ASSERT(carry == 0);
}

std::string encode_base58(const data_chunk& unencoded)
{
    size_t leading_zeros = count_leading_zeros(unencoded);

    // size = log(256) / log(58), rounded up.
    const size_t number_nonzero = unencoded.size() - leading_zeros;
    const size_t indexes_size = number_nonzero * 138 / 100 + 1;
    // Allocate enough space in big-endian base58 representation.
    data_chunk indexes(indexes_size);

    // Process the bytes.
    for (auto it = unencoded.begin() + leading_zeros;
        it != unencoded.end(); ++it)
    {
        pack_value(indexes, *it);
    }

    // Skip leading zeroes in base58 result.
    auto first_nonzero = search_first_nonzero(indexes);

    // Translate the result into a string.
    std::string encoded;
    const size_t estimated_size =
        leading_zeros + (indexes.end() - first_nonzero);
    encoded.reserve(estimated_size);
    encoded.assign(leading_zeros, '1');
    // Set actual main bytes.
    for (auto it = first_nonzero; it != indexes.end(); ++it)
    {
        const size_t index = *it;
        encoded += base58_chars[index];
    }
    return encoded;
}

size_t count_leading_zeros(const std::string& encoded)
{
    // Skip and count leading '1's.
    size_t leading_zeros = 0;
    for (const uint8_t digit: encoded)
    {
        if (digit != base58_chars[0])
            break;
        ++leading_zeros;
    }
    return leading_zeros;
}

void unpack_char(data_chunk& data, int carry)
{
    for (auto it = data.rbegin(); it != data.rend(); it++)
    {
        carry += 58 * (*it);
        *it = carry % 256;
        carry /= 256;
    }
    BITCOIN_ASSERT(carry == 0);
}

data_chunk decode_base58(std::string encoded)
{
    // Trim spaces and newlines around the string.
    boost::algorithm::trim(encoded);
    size_t leading_zeros = count_leading_zeros(encoded);

    // log(58) / log(256), rounded up.
    const size_t data_size = encoded.size() * 733 / 1000 + 1;
    // Allocate enough space in big-endian base256 representation.
    data_chunk data(data_size);

    // Process the characters.
    for (auto it = encoded.begin() + leading_zeros; it != encoded.end(); ++it)
    {
        size_t carry = base58_chars.find(*it);
        if (carry == std::string::npos)
            return data_chunk();
        unpack_char(data, carry);
    }

    // Skip leading zeroes in data.
    auto first_nonzero = search_first_nonzero(data);

    // Copy result into output vector.
    data_chunk decoded;
    const size_t estimated_size =
        leading_zeros + (data.end() - first_nonzero);
    decoded.reserve(estimated_size);
    decoded.assign(leading_zeros, 0x00);
    decoded.insert(decoded.end(), first_nonzero, data.cend());
    return decoded;
}

} // namespace libbitcoin

