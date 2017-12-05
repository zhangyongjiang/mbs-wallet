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
#include <bitcoin/bitcoin.hpp>
#include <iostream>
using namespace bc;

void recv_block(std::error_code ec, message::block block)
{
    if (ec)
    {
        std::cerr << ec.message() << "\n";
        return;
    }
    std::cout << "version: " << block.version << "\n";
    std::cout << "timestamp: " << block.timestamp << "\n";
    std::cout << "bits: " << std::hex << block.bits << std::dec << "\n";
    std::cout << "nonce: " << block.nonce << "\n";
    BITCOIN_ASSERT((hash_block_header(block) == hash_digest{0x00, 0x00, 0x00, 0x00, 0xd1, 0x14, 0x57, 0x90, 0xa8, 0x69, 0x44, 0x03, 0xd4, 0x06, 0x3f, 0x32, 0x3d, 0x49, 0x9e, 0x65, 0x5c, 0x83, 0x42, 0x68, 0x34, 0xd4, 0xce, 0x2f, 0x8d, 0xd4, 0xa2, 0xee}));
    BITCOIN_ASSERT(block.transactions.size() == 2);
    std::cout << "\n";
    for (message::transaction tx: block.transactions)
        std::cout << pretty(tx);
}

void loc(const std::error_code& ec, const message::block_locator& ll)
{
    if (ec)
        log_error() << ec.message();
    else
        for (auto h: ll)
            log_debug() << h;
}

void blockchain_started(const std::error_code& ec)
{
    if (ec)
        log_info() << "Blockchain error";
    else
        log_info() << "Blockchain initialized!";
}

int main()
{
    threadpool pool(1);
    bdb_blockchain chain(pool);
    chain.start("database", blockchain_started);
    //fetch_block(chain, 170, recv_block);
    fetch_block_locator(chain, loc);

    //indices_list ind = block_locator_indices(100);
    //for (size_t i: ind)
    //    log_debug() << i;
    std::cin.get();
    pool.stop();
    pool.join();
    chain.stop();
    return 0;
}

