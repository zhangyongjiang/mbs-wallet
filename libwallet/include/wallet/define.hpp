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
#ifndef LIBWALLET_DEFINE_HPP
#define LIBWALLET_DEFINE_HPP

#include <bitcoin/define.hpp>

// Now we use the generic helper definitions in libbitcoin to
// define BCW_API and BCW_INTERNAL.
// BCW_API is used for the public API symbols. It either DLL imports or
// DLL exports (or does nothing for static build)
// BCW_INTERNAL is used for non-api symbols.

#if defined BCW_STATIC
    #define BCW_API
    #define BCW_INTERNAL
#elif defined BCW_DLL
    #define BCW_API      BC_HELPER_DLL_EXPORT
    #define BCW_INTERNAL BC_HELPER_DLL_LOCAL
#else
    #define BCW_API      BC_HELPER_DLL_IMPORT
    #define BCW_INTERNAL BC_HELPER_DLL_LOCAL
#endif

// Work in progress, to be removed. 
#define USE_OPENSSL_BN
#define USE_OPENSSL_EC
//#define USE_OPENSSL_HM
#define NID_secp256k1 714

#endif

