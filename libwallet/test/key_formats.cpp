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
#include <wallet/key_formats.hpp>

using namespace libwallet;

BOOST_AUTO_TEST_CASE(wif_test)
{
    ec_secret secret =
    {{
        0x80, 0x10, 0xB1, 0xBB, 0x11, 0x9A, 0xD3, 0x7D,
        0x4B, 0x65, 0xA1, 0x02, 0x2A, 0x31, 0x48, 0x97,
        0xB1, 0xB3, 0x61, 0x4B, 0x34, 0x59, 0x74, 0x33,
        0x2C, 0xB1, 0xB9, 0x58, 0x2C, 0xF0, 0x35, 0x36
    }};
    std::string compressed =
        "L1WepftUBemj6H4XQovkiW1ARVjxMqaw4oj2kmkYqdG1xTnBcHfC";
    std::string uncompressed =
        "5JngqQmHagNTknnCshzVUysLMWAjT23FWs1TgNU5wyFH5SB3hrP";

    BOOST_REQUIRE(secret_to_wif(secret, true) == compressed);
    BOOST_REQUIRE(secret_to_wif(secret, false) == uncompressed);

    BOOST_REQUIRE(is_wif_compressed(compressed));
    BOOST_REQUIRE(!is_wif_compressed(uncompressed));

    ec_secret from_wif = wif_to_secret(compressed);
    BOOST_REQUIRE(std::equal(secret.begin(), secret.end(), from_wif.begin()));
    from_wif = wif_to_secret(uncompressed);
    BOOST_REQUIRE(std::equal(secret.begin(), secret.end(), from_wif.begin()));
}
