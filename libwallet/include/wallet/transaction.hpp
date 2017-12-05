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
#ifndef LIBWALLET_TRANSACTION_HPP
#define LIBWALLET_TRANSACTION_HPP

#include <bitcoin/transaction.hpp>
#include <wallet/define.hpp>

namespace libwallet {

using namespace libbitcoin;

// Result for call to select_outputs()
struct BCW_API select_outputs_result
{
    output_point_list points;
    uint64_t change;
};

// Algorithm for call to select_outputs()
enum class select_outputs_algorithm
{
    greedy
};

/**
 * Select optimal outputs for a send from unspent outputs list.
 * Returns output list and remaining change to be sent to
 * a change address.
 */
BCW_API select_outputs_result select_outputs(
    output_info_list unspent, uint64_t min_value,
    select_outputs_algorithm alg=select_outputs_algorithm::greedy);

} // namespace libwallet

#endif

