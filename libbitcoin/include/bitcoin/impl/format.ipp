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
#ifndef LIBBITCOIN_FORMAT_IPP
#define LIBBITCOIN_FORMAT_IPP

namespace libbitcoin {

template <typename D, typename T>
void extend_data(D& data, const T& other)
{
    data.insert(std::end(data), std::begin(other), std::end(other));
}

#define VERIFY_UNSIGNED(T) static_assert(std::is_unsigned<T>::value, \
    "The endian functions only work on unsigned types")

template <typename T, typename Iterator>
T from_big_endian(Iterator in)
{
    VERIFY_UNSIGNED(T);
    T out = 0;
    size_t i = sizeof(T);
    while (0 < i)
        out |= static_cast<T>(*in++) << (8 * --i);
    return out;
}

template <typename T, typename Iterator>
T from_little_endian(Iterator in)
{
    VERIFY_UNSIGNED(T);
    T out = 0;
    size_t i = 0;
    while (i < sizeof(T))
        out |= static_cast<T>(*in++) << (8 * i++);
    return out;
}

template <typename T>
byte_array<sizeof(T)> to_big_endian(T n)
{
    VERIFY_UNSIGNED(T);
    byte_array<sizeof(T)> out;
    for (auto i = out.rbegin(); i != out.rend(); ++i)
    {
        *i = n;
        n >>= 8;
    }
    return out;
}

template <typename T>
byte_array<sizeof(T)> to_little_endian(T n)
{
    VERIFY_UNSIGNED(T);
    byte_array<sizeof(T)> out;
    for (auto i = out.begin(); i != out.end(); ++i)
    {
        *i = n;
        n >>= 8;
    }
    return out;
}

#undef VERIFY_UNSIGNED

template <typename T>
std::string encode_hex(T data)
{
    std::stringstream ss;
    ss << std::hex;
    for (int val: data)
        ss << std::setw(2) << std::setfill('0') << val;
    return ss.str();
}

} // libbitcoin

#endif

