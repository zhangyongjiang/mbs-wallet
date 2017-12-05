/*
 * Copyright (c) 2011-2013 libczmq++ developers (see AUTHORS)
 *
 * This file is part of libczmq++.
 *
 * libczmq++ is free software: you can redistribute it and/or modify
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
#include <czmq++/thread.hpp>

namespace czmqpp {

void internal_call_func(void* args, zctx_t*, void* pipe)
{
    fork_callback* cb = static_cast<fork_callback*>(args);
    czmqpp::socket pipe_socket(pipe);
    (*cb)(pipe_socket);
    delete cb;
}

czmqpp::socket thread_fork(czmqpp::context& ctx, fork_callback callback)
{
    fork_callback* cb_copy = new fork_callback(callback);
    void *pipe = zthread_fork(ctx.self(), internal_call_func, cb_copy);
    return czmqpp::socket(pipe);
}

} // namespace czmqpp

