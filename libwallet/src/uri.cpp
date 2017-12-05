/*
 * Copyright (c) 2011-2013 libwallet developers (see AUTHORS)
 *
 * This file is part of libwallet.
 *
 * libwallet is free software: you can redistribute it and/or modify
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
#include <wallet/define.hpp>
#include <wallet/uri.hpp>

#include <boost/algorithm/string.hpp>
#include <bitcoin/bitcoin.hpp>

namespace libwallet {

static bool is_digit(const char c)
{
    return '0' <= c && c <= '9';
}
static bool is_hex(const char c)
{
    return is_digit(c) || ('A' <= c && c <= 'F') || ('a' <= c && c <= 'f');
}
static bool is_qchar(const char c)
{
    return
        ('A' <= c && c <= 'Z') || ('a' <= c && c <= 'z') || is_digit(c) ||
        '-' == c || '.' == c || '_' == c || '~' == c || // unreserved
        '!' == c || '$' == c || '\'' == c || '(' == c || ')' == c ||
        '*' == c || '+' == c || ',' == c || ';' == c || // sub-delims
        ':' == c || '@' == c || // pchar
        '/' == c || '?' == c;   // query
}
static bool isnt_amp(const char c)
{
    return '&' != c;
}

static unsigned from_hex(const char c)
{
    if ('A' <= c && c <= 'F')
        return 10 + c - 'A';
    if ('a' <= c && c <= 'f')
        return 10 + c - 'a';
    return c - '0';
}

/**
 * Unescapes a percent-encoded string while advancing the iterator.
 * @param i set to one-past the last-read character on return.
 */
typedef std::string::const_iterator sci;
static std::string unescape(sci& i, sci end, bool (*is_valid)(const char))
{
    auto j = i;
    size_t count = 0;
    while (end != i && (is_valid(i[0]) ||
        ('%' == *i && 2 < end - i && is_hex(i[1]) && is_hex(i[2]))))
    {
        ++count;
        if ('%' == *i)
            i += 3;
        else
            ++i;
    }
    std::string out;
    out.reserve(count);
    while (j != i)
    {
        if ('%' == *j)
        {
            out.push_back(from_hex(j[1]) << 4 | from_hex(j[2]));
            j += 3;
        }
        else
            out.push_back(*j++);
    }
    return out;
}

/**
 * Parses a URI string into its individual components.
 * @param strict Only accept properly-escaped parameters. Some bitcoin
 * software does not properly escape URI parameters, and setting strict to
 * false allows these malformed URI's to parse anyhow.
 * @return false if the URI is malformed.
 */
BCW_API bool uri_parse(const std::string& uri, uri_visitor& result, 
    bool strict)
{
    auto i = uri.begin();

    // URI scheme (this approach does not depend on the current locale):
    const char* lower = "bitcoin:";
    const char* upper = "BITCOIN:";
    while (*lower != '\0')
    {
        if (uri.end() == i || (*lower != *i && *upper != *i))
            return false;
        ++lower; ++upper; ++i;
    }

    // Payment address:
    std::string address = unescape(i, uri.end(), libbitcoin::is_base58);
    if (uri.end() != i && '?' != *i)
        return false;
    if (!address.empty() && !result.got_address(address))
        return false;

    // Parameters:
    while (uri.end() != i)
    {
        ++i; // Consume '?' or '&'
        std::string key = unescape(i, uri.end(), is_qchar);
        std::string value;
        if (uri.end() != i && '=' == *i)
        {
            ++i; // Consume '='
            if (key.empty())
                return false;
            if (strict)
                value = unescape(i, uri.end(), is_qchar);
            else
                value = unescape(i, uri.end(), isnt_amp);
        }
        if (uri.end() != i && '&' != *i)
            return false;
        if (!key.empty() && !result.got_param(key, value))
            return false;
    }
    return true;
}

BCW_API bool uri_parse_result::got_address(std::string& address)
{
    libbitcoin::payment_address payaddr;
    if (!payaddr.set_encoded(address))
        return false;
    this->address.reset(payaddr);
    return true;
}

BCW_API bool uri_parse_result::got_param(std::string& key, std::string& value)
{
    if (key == "amount")
    {
        uint64_t amount = parse_amount(value);
        if (invalid_amount == amount)
            return false;
        this->amount.reset(amount);
    }
    else if (key == "label")
        label.reset(value);
    else if (key == "message")
        message.reset(value);
    else if (key == "r")
        r.reset(value);
    else if (!key.compare(0, 4, "req-"))
        return false;
    return true;
}

BCW_API uint64_t parse_amount(const std::string& amount, 
    unsigned decmial_place)
{
    auto i = amount.begin();
    uint64_t value = 0;
    unsigned places = 0;

    while (amount.end() != i && is_digit(*i))
    {
        value = 10*value + (*i - '0');
        ++i;
    }
    if (amount.end() != i && '.' == *i)
    {
        ++i;
        while (amount.end() != i && is_digit(*i))
        {
            if (places < decmial_place)
                value = 10*value + (*i - '0');
            else if (places == decmial_place && '5' <= *i)
                value += 1;
            ++places;
            ++i;
        }
    }
    while (places < decmial_place)
    {
        value *= 10;
        ++places;
    }
    if (amount.end() != i)
        return invalid_amount;
    return value;
}

/**
 * Percent-encodes a string.
 * @param is_valid a function returning true for acceptable characters.
 */
static std::string escape(const std::string& in, bool (*is_valid)(char))
{
    std::ostringstream stream;
    stream << std::hex << std::uppercase << std::setfill('0');
    for (auto c: in)
    {
        if (is_valid(c))
            stream << c;
        else
            stream << '%' << std::setw(2) << +c;
    }
    return stream.str();
}

BCW_API uri_writer::uri_writer()
  : first_param_{true}
{
    stream_ << "bitcoin:";
}

BCW_API void uri_writer::write_address(
    const libbitcoin::payment_address& address)
{
    write_address(address.encoded());
}

BCW_API void uri_writer::write_amount(uint64_t satoshis)
{
    // Format as a fixed-point number:
    uint64_t bitcoin = satoshis / libbitcoin::coin_price();
    satoshis = satoshis % libbitcoin::coin_price();
    std::ostringstream stream;
    stream << bitcoin << '.' << std::setw(8) << std::setfill('0') << satoshis;
    // Trim trailing zeros:
    auto string = stream.str();
    boost::algorithm::trim_right_if(string, [](char c){ return '0' == c; });
    boost::algorithm::trim_right_if(string, [](char c){ return '.' == c; });
    write_param("amount", string);
}

BCW_API void uri_writer::write_label(const std::string& label)
{
    write_param("label", label);
}

BCW_API void uri_writer::write_message(const std::string& message)
{
    write_param("message", message);
}

BCW_API void uri_writer::write_r(const std::string& r)
{
    write_param("r", r);
}

BCW_API void uri_writer::write_address(const std::string& address)
{
    stream_ << address;
}

BCW_API void uri_writer::write_param(const std::string& key, 
    const std::string& value)
{
    if (first_param_)
        stream_ << '?';
    else
        stream_ << '&';
    first_param_ = false;
    stream_ << escape(key, is_qchar) << '=' << escape(value, is_qchar);
}

BCW_API std::string uri_writer::string() const
{
    return stream_.str();
}

} // namespace libwallet
