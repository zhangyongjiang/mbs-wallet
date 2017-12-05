/**
 * Copyright (c) 2011-2013 libwallet developers (see AUTHORS)
 *
 * This file is part of libwallet.
 *
 * libwallet is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
#include <wallet/stealth.hpp>

#include <bitcoin/utility/assert.hpp>
#include <bitcoin/utility/base58.hpp>
#include <bitcoin/utility/checksum.hpp>
#include <bitcoin/utility/hash.hpp>
#include <bitcoin/format.hpp>

namespace libwallet {

constexpr uint8_t stealth_version_byte = 0x2a;

BCW_API bool stealth_address::set_encoded(const std::string& encoded_address)
{
    data_chunk raw_addr = decode_base58(encoded_address);
    if (!verify_checksum(raw_addr))
        return false;
    BITCOIN_ASSERT(raw_addr.size() >= 4);
    auto checksum_begin = raw_addr.end() - 4;
    // Delete checksum bytes.
    raw_addr.erase(checksum_begin, raw_addr.end());
    // https://wiki.unsystem.net/index.php/DarkWallet/Stealth#Address_format
    // [version] [options] [scan_key] [N] ... [Nsigs] [prefix_length] ...
    size_t estimated_data_size = 1 + 1 + 33 + 1 + 1 + 1;
    BITCOIN_ASSERT(raw_addr.size() >= estimated_data_size);
    auto iter = raw_addr.begin();
    uint8_t version = *iter;
    if (version != stealth_version_byte)
        return false;
    ++iter;
    options = *iter;
    ++iter;
    auto scan_key_begin = iter;
    iter += 33;
    scan_pubkey = ec_point(scan_key_begin, iter);
    uint8_t number_spend_pubkeys = *iter;
    ++iter;
    estimated_data_size += number_spend_pubkeys * 33;
    BITCOIN_ASSERT(raw_addr.size() >= estimated_data_size);
    for (size_t i = 0; i < number_spend_pubkeys; ++i)
    {
        auto spend_key_begin = iter;
        iter += 33;
        spend_pubkeys.emplace_back(ec_point(spend_key_begin, iter));
    }
    number_signatures = *iter;
    ++iter;
    prefix.number_bits = *iter;
    ++iter;
    size_t number_bitfield_bytes = 0;
    if (prefix.number_bits > 0)
        number_bitfield_bytes = prefix.number_bits / 8 + 1;
    estimated_data_size += number_bitfield_bytes;
    BITCOIN_ASSERT(raw_addr.size() >= estimated_data_size);
    // Unimplemented currently!
    BITCOIN_ASSERT(number_bitfield_bytes == 0);
    return true;
}

BCW_API std::string stealth_address::encoded() const
{
    data_chunk raw_addr;
    raw_addr.push_back(stealth_version_byte);
    raw_addr.push_back(options);
    extend_data(raw_addr, scan_pubkey);
    uint8_t number_spend_pubkeys = static_cast<uint8_t>(spend_pubkeys.size());
    raw_addr.push_back(number_spend_pubkeys);
    for (const ec_point& pubkey: spend_pubkeys)
        extend_data(raw_addr, pubkey);
    raw_addr.push_back(number_signatures);
    BITCOIN_ASSERT_MSG(prefix.number_bits == 0, "Not yet implemented!");
    raw_addr.push_back(0);
    append_checksum(raw_addr);
    return encode_base58(raw_addr);
}

ec_secret shared_secret(const ec_secret& secret, ec_point point)
{
    bool success = ec_multiply(point, secret);
    BITCOIN_ASSERT(success);
    return sha256_hash(point);
}

BCW_API ec_point initiate_stealth(
    const ec_secret& ephem_secret, const ec_point& scan_pubkey,
    const ec_point& spend_pubkey)
{
    ec_point final = spend_pubkey;
    ec_secret shared = shared_secret(ephem_secret, scan_pubkey);
    bool success = ec_tweak_add(final, shared);
    BITCOIN_ASSERT(success);
    return final;
}

BCW_API ec_point uncover_stealth(
    const ec_point& ephem_pubkey, const ec_secret& scan_secret,
    const ec_point& spend_pubkey)
{
    ec_point final = spend_pubkey;
    ec_secret shared = shared_secret(scan_secret, ephem_pubkey);
    bool success = ec_tweak_add(final, shared);
    BITCOIN_ASSERT(success);
    return final;
}

BCW_API ec_secret uncover_stealth_secret(
    const ec_point& ephem_pubkey, const ec_secret& scan_secret,
    const ec_secret& spend_secret)
{
    ec_secret final = spend_secret;
    ec_secret shared = shared_secret(scan_secret, ephem_pubkey);
    bool success = ec_add(final, shared);
    BITCOIN_ASSERT(success);
    return final;
}

} // namespace libwallet

