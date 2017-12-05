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
/*
  Demonstration of HD wallet key generation.
*/
#include <bitcoin/bitcoin.hpp>
#include <wallet/hd_keys.hpp>

constexpr auto hard = libwallet::first_hardened_key;

/**
 * Test vector 1 from BIP 32.
 */
void test_vector_1()
{
    // Generate public keys:
    libbitcoin::data_chunk seed
    {
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
        0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
    };

    libwallet::hd_private_key m(seed);
    auto m0h      = m.      generate_private_key(hard);
    auto m0h1     = m0h.    generate_private_key(1);
    auto m0h12h   = m0h1.   generate_private_key(2 + hard);
    auto m0h12h2  = m0h12h. generate_private_key(2);
    auto m0h12h2x = m0h12h2.generate_private_key(1000000000);

    BITCOIN_ASSERT(m.serialize() ==
        "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPP"
        "qjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi");
    BITCOIN_ASSERT(m0h.serialize() ==
        "xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvU"
        "xt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7");
    BITCOIN_ASSERT(m0h1.serialize() ==
        "xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLn"
        "vSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs");
    BITCOIN_ASSERT(m0h12h.serialize() ==
        "xprv9z4pot5VBttmtdRTWfWQmoH1taj2axGVzFqSb8C9xaxKymcFzXBD"
        "ptWmT7FwuEzG3ryjH4ktypQSAewRiNMjANTtpgP4mLTj34bhnZX7UiM");
    BITCOIN_ASSERT(m0h12h2.serialize() ==
        "xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb"
        "2Tyh8RfQMuPh7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334");
    BITCOIN_ASSERT(m0h12h2x.serialize() ==
        "xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8F"
        "Ha8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76");

    // Generate public keys:
    libwallet::hd_public_key m_pub = m;
    auto m0h_bad      = m_pub.      generate_public_key(hard);
    auto m0h_pub      = m.          generate_public_key(hard);
    auto m0h1_pub     = m0h_pub.    generate_public_key(1);
    auto m0h12h_pub   = m0h1.       generate_public_key(2 + hard);
    auto m0h12h2_pub  = m0h12h_pub. generate_public_key(2);
    auto m0h12h2x_pub = m0h12h2_pub.generate_public_key(1000000000);

    BITCOIN_ASSERT(!m0h_bad.valid());
    BITCOIN_ASSERT(m_pub.serialize() ==
        "xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhe"
        "PY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8");
    BITCOIN_ASSERT(m0h_pub.serialize() ==
        "xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEj"
        "WgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw");
    BITCOIN_ASSERT(m0h1_pub.serialize() ==
        "xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3"
        "UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ");
    BITCOIN_ASSERT(m0h12h_pub.serialize() ==
        "xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VU"
        "NgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5");
    BITCOIN_ASSERT(m0h12h2_pub.serialize() ==
        "xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBq"
        "aGJAyiLjTAwm6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV");
    BITCOIN_ASSERT(m0h12h2x_pub.serialize() ==
        "xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSV"
        "qNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy");
}

/**
 * Test vector 2 from BIP 32.
 */
void test_vector_2()
{
    // Generate private keys:
    libbitcoin::data_chunk seed
    {
        0xff, 0xfc, 0xf9, 0xf6, 0xf3, 0xf0, 0xed, 0xea,
        0xe7, 0xe4, 0xe1, 0xde, 0xdb, 0xd8, 0xd5, 0xd2,
        0xcf, 0xcc, 0xc9, 0xc6, 0xc3, 0xc0, 0xbd, 0xba,
        0xb7, 0xb4, 0xb1, 0xae, 0xab, 0xa8, 0xa5, 0xa2,
        0x9f, 0x9c, 0x99, 0x96, 0x93, 0x90, 0x8d, 0x8a,
        0x87, 0x84, 0x81, 0x7e, 0x7b, 0x78, 0x75, 0x72,
        0x6f, 0x6c, 0x69, 0x66, 0x63, 0x60, 0x5d, 0x5a,
        0x57, 0x54, 0x51, 0x4e, 0x4b, 0x48, 0x45, 0x42
    };

    libwallet::hd_private_key m(seed);
    auto m0       = m.      generate_private_key(0);
    auto m0xH     = m0.     generate_private_key(2147483647 + hard);
    auto m0xH1    = m0xH.   generate_private_key(1);
    auto m0xH1yH  = m0xH1.  generate_private_key(2147483646 + hard);
    auto m0xH1yH2 = m0xH1yH.generate_private_key(2);

    BITCOIN_ASSERT(m.serialize() ==
        "xprv9s21ZrQH143K31xYSDQpPDxsXRTUcvj2iNHm5NUtrGiGG5e2DtAL"
        "Gdso3pGz6ssrdK4PFmM8NSpSBHNqPqm55Qn3LqFtT2emdEXVYsCzC2U");
    BITCOIN_ASSERT(m0.serialize() ==
        "xprv9vHkqa6EV4sPZHYqZznhT2NPtPCjKuDKGY38FBWLvgaDx45zo9WQ"
        "RUT3dKYnjwih2yJD9mkrocEZXo1ex8G81dwSM1fwqWpWkeS3v86pgKt");
    BITCOIN_ASSERT(m0xH.serialize() ==
        "xprv9wSp6B7kry3Vj9m1zSnLvN3xH8RdsPP1Mh7fAaR7aRLcQMKTR2vi"
        "dYEeEg2mUCTAwCd6vnxVrcjfy2kRgVsFawNzmjuHc2YmYRmagcEPdU9");
    BITCOIN_ASSERT(m0xH1.serialize() ==
        "xprv9zFnWC6h2cLgpmSA46vutJzBcfJ8yaJGg8cX1e5StJh45BBciYTR"
        "XSd25UEPVuesF9yog62tGAQtHjXajPPdbRCHuWS6T8XA2ECKADdw4Ef");
    BITCOIN_ASSERT(m0xH1yH.serialize() ==
        "xprvA1RpRA33e1JQ7ifknakTFpgNXPmW2YvmhqLQYMmrj4xJXXWYpDPS"
        "3xz7iAxn8L39njGVyuoseXzU6rcxFLJ8HFsTjSyQbLYnMpCqE2VbFWc");
    BITCOIN_ASSERT(m0xH1yH2.serialize() ==
        "xprvA2nrNbFZABcdryreWet9Ea4LvTJcGsqrMzxHx98MMrotbir7yrKC"
        "EXw7nadnHM8Dq38EGfSh6dqA9QWTyefMLEcBYJUuekgW4BYPJcr9E7j");

    // Generate public keys:
    libwallet::hd_public_key m_pub = m;
    auto m0_pub       = m_pub.      generate_public_key(0);
    auto m0xH_pub     = m0.         generate_public_key(2147483647 + hard);
    auto m0xH1_pub    = m0xH_pub.   generate_public_key(1);
    auto m0xH1yH_pub  = m0xH1.      generate_public_key(2147483646 + hard);
    auto m0xH1yH2_pub = m0xH1yH_pub.generate_public_key(2);

    BITCOIN_ASSERT(m_pub.serialize() ==
        "xpub661MyMwAqRbcFW31YEwpkMuc5THy2PSt5bDMsktWQcFF8syAmRUa"
        "pSCGu8ED9W6oDMSgv6Zz8idoc4a6mr8BDzTJY47LJhkJ8UB7WEGuduB");
    BITCOIN_ASSERT(m0_pub.serialize() ==
        "xpub69H7F5d8KSRgmmdJg2KhpAK8SR3DjMwAdkxj3ZuxV27CprR9Lgpe"
        "yGmXUbC6wb7ERfvrnKZjXoUmmDznezpbZb7ap6r1D3tgFxHmwMkQTPH");
    BITCOIN_ASSERT(m0xH_pub.serialize() ==
        "xpub6ASAVgeehLbnwdqV6UKMHVzgqAG8Gr6riv3Fxxpj8ksbH9ebxaEy"
        "BLZ85ySDhKiLDBrQSARLq1uNRts8RuJiHjaDMBU4Zn9h8LZNnBC5y4a");
    BITCOIN_ASSERT(m0xH1_pub.serialize() ==
        "xpub6DF8uhdarytz3FWdA8TvFSvvAh8dP3283MY7p2V4SeE2wyWmG5mg"
        "5EwVvmdMVCQcoNJxGoWaU9DCWh89LojfZ537wTfunKau47EL2dhHKon");
    BITCOIN_ASSERT(m0xH1yH_pub.serialize() ==
        "xpub6ERApfZwUNrhLCkDtcHTcxd75RbzS1ed54G1LkBUHQVHQKqhMkhg"
        "bmJbZRkrgZw4koxb5JaHWkY4ALHY2grBGRjaDMzQLcgJvLJuZZvRcEL");
    BITCOIN_ASSERT(m0xH1yH2_pub.serialize() ==
        "xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdS"
        "nLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt");
}

int main()
{
    test_vector_1();
    test_vector_2();
    return 0;
}

