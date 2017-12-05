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
#include <wallet/define.hpp>
#include <wallet/transaction.hpp>

#include <bitcoin/bitcoin.hpp>

namespace libwallet {

BCW_API select_outputs_result select_outputs(
    output_info_list unspent, uint64_t min_value,
    select_outputs_algorithm alg)
{
    // Just one default implementation for now.
    // Consider a switch case with greedy_select_outputs(min_value) .etc
    // if this is ever extended with more algorithms.
    BITCOIN_ASSERT(alg == select_outputs_algorithm::greedy);
    // Fail if empty.
    if (unspent.empty())
        return select_outputs_result();
    auto lesser_begin = unspent.begin();
    auto lesser_end = std::partition(unspent.begin(), unspent.end(),
        [min_value](const output_info_type& out_info)
        {
            return out_info.value < min_value;
        });
    auto greater_begin = lesser_end;
    auto greater_end = unspent.end();
    auto min_greater = std::min_element(greater_begin, greater_end,
        [](const output_info_type& info_a, const output_info_type& info_b)
        {
            return info_a.value < info_b.value;
        });
    select_outputs_result result;
    if (min_greater != greater_end)
    {
        result.change = min_greater->value - min_value;
        result.points.push_back(min_greater->point);
        return result;
    }
    // Not found in greaters. Try several lessers instead.
    // Rearrange them from biggest to smallest. We want to use the least
    // amount of inputs as possible.
    std::sort(lesser_begin, lesser_end,
        [](const output_info_type& info_a, const output_info_type& info_b)
        {
            return info_a.value > info_b.value;
        });
    uint64_t accum = 0;
    for (auto it = lesser_begin; it != lesser_end; ++it)
    {
        result.points.push_back(it->point);
        accum += it->value;
        if (accum >= min_value)
        {
            result.change = accum - min_value;
            return result;
        }
    }
    return select_outputs_result();
}

} // namespace libwallet

