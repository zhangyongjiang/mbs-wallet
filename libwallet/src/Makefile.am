AUTOMAKE_OPTIONS = subdir-objects

lib_LTLIBRARIES = libwallet.la
AM_CPPFLAGS = -I$(srcdir)/../include $(libbitcoin_CFLAGS)
libwallet_la_SOURCES = \
    electrum_keys.cpp \
    mnemonic.cpp \
    transaction.cpp \
    hd_keys.cpp \
    key_formats.cpp \
    stealth.cpp \
    uri.cpp

libwallet_la_LIBADD = $(libbitcoin_LIBS)

