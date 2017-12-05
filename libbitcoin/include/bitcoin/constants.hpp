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
#ifndef LIBBITCOIN_CONSTANTS_HPP
#define LIBBITCOIN_CONSTANTS_HPP

#include <cstdint>
#include <bitcoin/define.hpp>
#include <bitcoin/utility/big_number.hpp>

namespace libbitcoin {

constexpr uint32_t protocol_version = 60000;

constexpr uint64_t block_reward = 50;
// 210000 ~ 4 years / 10 minutes
constexpr uint64_t reward_interval = 210000;

constexpr size_t coinbase_maturity = 100;

#ifdef ENABLE_TESTNET
constexpr uint32_t protocol_port = 18333;
#else
constexpr uint32_t protocol_port = 8333;
#endif

// Threshold for nLockTime: below this value it is
// interpreted as block number, otherwise as UNIX timestamp.
// Tue Nov 5 00:53:20 1985 UTC
constexpr uint32_t locktime_threshold = 500000000;

constexpr uint64_t max_money_recursive(uint64_t current)
{
    return (current > 0) ?
        current + max_money_recursive(current >> 1) : 0;
}

constexpr uint64_t coin_price(uint64_t value=1)
{
    return value * 100000000;
}

constexpr uint64_t max_money()
{
    return reward_interval * max_money_recursive(coin_price(block_reward));
}

const hash_digest null_hash = { 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
const short_hash null_short_hash = { 
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

constexpr uint32_t max_bits = 0x1d00ffff;
BC_API big_number max_target();
BC_API uint32_t magic_value();

#ifdef _MSC_VER
constexpr uint32_t max_index = UINT_LEAST32_MAX;
#else
constexpr uint32_t max_index = std::numeric_limits<uint32_t>::max();
#endif

// Every two weeks we readjust target
constexpr uint64_t target_timespan = 14 * 24 * 60 * 60;
// Aim for blocks every 10 mins
constexpr uint64_t target_spacing = 10 * 60;
// Two weeks worth of blocks = readjust interval = 2016
constexpr uint64_t readjustment_interval = target_timespan / target_spacing;

#ifdef ENABLE_TESTNET
// Block 514 is the first block after Feb 15 2014.
// Testnet started bip16 before mainnet.
constexpr uint32_t bip16_switchover_timestamp = 1333238400;
constexpr uint32_t bip16_switchover_height = 514;
#else
// April 1 2012
constexpr uint32_t bip16_switchover_timestamp = 1333238400;
constexpr uint32_t bip16_switchover_height = 173805;
#endif

} // namespace libbitcoin

#endif

