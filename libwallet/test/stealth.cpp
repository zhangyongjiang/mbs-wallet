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
#include <boost/test/unit_test.hpp>
#include <bitcoin/bitcoin.hpp>
#include <wallet/wallet.hpp>

using namespace bc;

BOOST_AUTO_TEST_CASE(stealth)
{
    bc::ec_secret ephem_privkey{{
        95, 112, 167, 123, 50, 38, 10, 122, 50, 198, 34, 66, 56, 31, 186, 44,
        244, 12, 14, 32, 158, 102, 90, 121, 89, 65, 142, 174, 79, 45, 162,
        43}};
    bc::ec_secret scan_privkey{{
        250, 99, 82, 30, 51, 62, 75, 159, 106, 152, 161, 66, 104, 13, 58, 239,
        77, 142, 127, 121, 114, 60, 224, 4, 54, 145, 219, 85, 195, 107, 217,
        5}};
    bc::ec_secret spend_privkey{{
        220, 193, 37, 11, 81, 192, 240, 58, 228, 233, 120, 224, 37, 110, 222,
        81, 220, 17, 68, 227, 69, 201, 38, 38, 43, 151, 23, 177, 188, 201,
        189, 27}};
    BOOST_REQUIRE(ephem_privkey.size() == bc::ec_secret_size);
    BOOST_REQUIRE(scan_privkey.size() == bc::ec_secret_size);
    BOOST_REQUIRE(spend_privkey.size() == bc::ec_secret_size);
    bc::ec_secret c{{
        75,73,116,38,110,230,200,190,217,239,242,205,16,135,187,193,16,31,23,
        186,217,195,120,20,248,86,27,103,245,80,197,68}};

    bc::ec_point scan_pubkey = bc::secret_to_public_key(scan_privkey);
    BOOST_REQUIRE(scan_pubkey.size() == bc::ec_compressed_size);
    bc::ec_point spend_pubkey = bc::secret_to_public_key(spend_privkey);
    BOOST_REQUIRE(spend_pubkey.size() == bc::ec_compressed_size);
    bc::ec_point ephem_pubkey = bc::secret_to_public_key(ephem_privkey);
    BOOST_REQUIRE(ephem_pubkey.size() == bc::ec_compressed_size);

    // Sender
    bc::ec_point pubkey_1 = libwallet::initiate_stealth(
        ephem_privkey, scan_pubkey, spend_pubkey);
    // Receiver
    bc::ec_point pubkey_2 = libwallet::uncover_stealth(
        ephem_pubkey, scan_privkey, spend_pubkey);
    BOOST_REQUIRE(pubkey_1 == pubkey_2);
    // Receiver (secret)
    bc::ec_secret privkey = libwallet::uncover_stealth_secret(
        ephem_pubkey, scan_privkey, spend_privkey);
    BOOST_REQUIRE(secret_to_public_key(privkey) == pubkey_1);

    // sx ec-tweak-add
    //   03d5b3853bbee336b551ff999b0b1d656e65a7649037ae0dcb02b3c4ff5f29e5be
    //   4b4974266ee6c8bed9eff2cd1087bbc1101f17bad9c37814f8561b67f550c544
    //   | sx addr
    // 1Gvq8pSTRocNLDyf858o4PL3yhZm5qQDgB

    bc::payment_address payaddr;
    set_public_key(payaddr, pubkey_1);
    BOOST_REQUIRE(payaddr.encoded() == "1Gvq8pSTRocNLDyf858o4PL3yhZm5qQDgB");
}

BOOST_AUTO_TEST_CASE(stealth_addr_encoding)
{
    const std::string addr_str =
        "vJmzLu29obZcUGXXgotapfQLUpz7dfnZpbr4xg1R75qctf8xaXAteRdi3ZUk3T2Z"
        "MSad5KyPbve7uyH6eswYAxLHRVSbWgNUeoGuXp";
    libwallet::stealth_address addr;
    addr.set_encoded(addr_str);
    BOOST_REQUIRE(addr.encoded() == addr_str);
}

