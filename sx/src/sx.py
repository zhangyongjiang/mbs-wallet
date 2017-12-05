#!/usr/bin/python
import sys
import subprocess
import os
import shutil

SPACING = " " * 30

command_list = {

"satoshi": (
"UTILITY",
"SATOSHI MATH",
"Convert Bitcoins into Satoshis.",

"""\
Usage: sx satoshi BTC
Convert Bitcoins into Satoshis.\
"""
),

"btc": (
"UTILITY",
"SATOSHI MATH",
"Convert Satoshis into Bitcoins.",

"""\
Usage: sx btc SATOSHIS
Convert Satoshis into Bitcoins.\
"""
),

"showscript": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Show the details of a raw script.",

"""\
Usage: sx showscript
Show the details of a raw script.\
"""
),

"scripthash": (
"OFFLINE KEYS AND ADDRESSES",
"MULTISIG ADDRESSES",
"Create BIP 16 script hash address from raw script hex.",

"""\
Usage: sx scripthash
Create BIP 16 script hash address from raw script hex (from STDIN).

EXAMPLE:

  # generate an address for 2-of-3 multisig transactions
  for n in 1 2 3; do echo 'b220b5bd2909df1d74b71c9e664233bf' | sx genpriv $n > key${n}; done
  sx rawscript 2 [ $(cat key1 | sx pubkey) ] [ $(cat key2 | sx pubkey) ] [ $(cat key3 | sx pubkey) ] 3 checkmultisig | sx scripthash
  33opBmv3oJTXu6rxtzsr571SL2Srtw9Cg8

"""
),

"rawscript": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Create the raw hex representation from a script.",

"""\
Usage: sx rawscript [ARGS]...
Create the raw hex representation from a script.\

EXAMPLE:

  $ sx rawscript dup # translate a single opcode just for demonstration, see OP_DUP in https://en.bitcoin.it/wik
  76

"""
),

"initchain": (
"ONLINE (OBELISK)",
"OBELISK ADMIN",
"Initialize a new blockchain.",

"""\
Usage: sx initchain DIRECTORY
Initialize a new blockchain.\
"""
),

"wallet": (
"EXPERIMENTAL",
"APPS",
"Experimental command line wallet.",

"""\
Usage: sx wallet SEED
This is an experimental prototype.\
"""
),

"monitor": (
"ONLINE (OBELISK)",
"BLOCKCHAIN WATCHING",
"Monitor an address.",

"""\
Usage: sx monitor ADDRESS
Monitor an address.\
"""
),

"validaddr": (
"OFFLINE KEYS AND ADDRESSES",
"BASIC",
"Validate an address.",

"""\
Usage: sx validaddr ADDRESS
Validate an address.\
"""
),

"validtx": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Validate a transaction.",

"""\
Usage: sx validtx FILENAME
Query blockchain whether transaction has been confirmed.\
"""
),

"pubkey": (
"OFFLINE KEYS AND ADDRESSES",
"BASIC",
"See the public part of a private key.",

"""\
Usage: sx pubkey
Read private key from STDIN and output the public key. 
"""
),

"addr": (
"OFFLINE KEYS AND ADDRESSES",
"BASIC",
"See Bitcoin address of a public or private key.",

"""\
Usage: sx addr
Read public or private key from STDIN and output Bitcoin address.\
"""
),

"ripemd-hash": (
"UTILITY",
"HASHES",
"RIPEMD hash data from STDIN.",

"""\
Usage: sx ripemd-hash
RIPEMD hash data from STDIN.\
"""
),

"wrap": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Adds version byte and checksum to hexstring.",

"""\
Usage: sx wrap HEXSTRING VERSION_BYTE <or> echo HEXSTRING | sx wrap VERSION_BYTE
Adds version byte and checksum to hexstring.\
"""
),

"unwrap": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Validates checksum and recovers version byte and original data from hexstring.",

"""\
Usage: sx wrap HEXSTRING VERSION_BYTE <or> echo HEXSTRING | sx wrap VERSION_BYTE
Validates checksum and recovers version byte and original data from hexstring.\
"""
),

"base58-decode": (
"UTILITY",
"FORMAT (BASE 58)",
"Convert from base58 to hex",

"""\
Usage: sx base58-decode B58STRING <or> echo B58STRING | sx base58-decode
Convert from base58 to hex.\
"""
),

"base58-encode": (
"UTILITY",
"FORMAT (BASE 58)",
"Convert from hex to base58",

"""\
Usage: sx base58-encode HEXSTRING <or> echo HEXSTRING | sx base58-encode
Convert from hex to base58.\
"""
),

"base58check-decode": (
"UTILITY",
"FORMAT (BASE58CHECK)",
"Convert from base58check to hex",

"""\
Usage: sx base58check-decode B58STRING <or> echo B58STRING | sx base58check-decode
Convert from base58check to hex.\
"""
),

"base58check-encode": (
"UTILITY",
"FORMAT (BASE58CHECK)",
"Convert from hex to base58check",

"""\
Usage: sx base58check-encode HEXSTRING <or> echo HEXSTRING | sx base58check-encode
Convert from hex to base58check.\
"""
),

"sendtx-obelisk": (
"ONLINE (OBELISK)",
"BLOCKCHAIN UPDATES",
"Send tx to obelisk server.",

"""\
Usage: sx sendtx-obelisk FILENAME
Broadcast the transaction to an obelisk server for the network.

  $ sx sendtx-obelisk txfile.tx
\
"""
),

"sendtx-p2p": (
"ONLINE (BITCOIN P2P)",
"BLOCKCHAIN UPDATES",
"Send tx to bitcoin network.",

"""\
Usage: sx sendtx-p2p FILENAME
Broadcast the transaction to the Bitcoin network.

  $ sx sendtx-p2p txfile.tx
\
"""
),

"sendtx-bci": (
"ONLINE (BLOCKCHAIN.INFO)",
"BLOCKCHAIN UPDATES",
"Send tx to blockchain.info/pushtx.",

"""\
Usage: sx bci-push-tx FILENAME
Push tx to blockchain.info/pushtx.

  $ sx sendtx-bci txfile.tx
\
"""
),

"blke-fetch-transaction": (
"ONLINE (BLOCKEXPLORER.COM)",
"BLOCKCHAIN QUERIES (blockexplorer.com)",
"Fetches a transaction from blockexplorer.com",

"""\
Usage: sx blke-fetch-transaction HASH

Fetches a transaction from blockexplorer.com

  $ sx blke-fetch-transaction HASH
\
"""
),

"genpriv": (
"DEPRECATED",
"ELECTRUM STYLE DETERMINISTIC KEYS AND ADDRESSES",
"Generate a private key deterministically from a seed.",

"""\
Usage: sx genpriv N [CHANGE]
Generate private keys from a wallet seed.

  $ cat wallet.seed | sx genpriv 0
  5Jmb4EYzEqj63rkPwADFY7WyGV2kga3YB1HfDAzg9dHNG57NMPu
  $ cat wallet.seed | sx genpriv 1
  5KjCYpPyxU2e88S57b1naKUsJ1JNjCudkFSQPxqcYyBYgzzahNe
\
"""
),

"genpub": (
"DEPRECATED",
"ELECTRUM STYLE DETERMINISTIC KEYS AND ADDRESSES",
"Generate a public key deterministically from a wallet\n" + SPACING + "seed or master public key.",

"""\
Usage: sx genpub N [CHANGE]
Generate public key from a wallet seed or master public key.
The output is non-deterministic if any other input is used.

  $ cat wallet.seed | sx genpub 0
  040a053d0a42d58b7e34346daae9d40ce33fad5d65bbaa6c615a2b76447734b2c712b5d45de839b2e5e7ac00201cbea3d2d376cfcc7a3f3f508f1e6761f6c271bf
\
"""
),

"genaddr": (
"DEPRECATED",
"ELECTRUM STYLE DETERMINISTIC KEYS AND ADDRESSES",
"Generate a Bitcoin address deterministically from a wallet\n" +
SPACING + "seed or master public key.",

"""\
Usage: sx genaddr N [CHANGE]
Generate Bitcoin addresses from a wallet seed or master public key.
The output is non-deterministic if any other input is used.

  $ cat wallet.seed | sx genaddr 0
  1a4b47AC4ydSnAAcTNH1qozHq2pwJb644
\
"""
),

"qrcode": (
"UTILITY",
"MISC",
"Generate Bitcoin QR codes offline.",

"""\
Usage: sx qrcode

Make sure you have the program 'qrencode' installed first.

  $ sudo apt-get install qrencode
  $ sx qrcode 13Ft7SkreJY9D823NPm4t6D1cBqLYTJtAe qrcode.png
\
"""
),

"fetch-block-header": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Fetch raw block header.",

"""\
Usage: sx fetch-block-header [HASH] [HEIGHT]

The fetch-block-header tool uses a network connection to make requests against
the load balancer backend.\
"""
),

"fetch-last-height": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Fetch the last block height.",

"""\
Usage: sx fetch-last-height

The fetch-last-height tool uses a network connection to make requests against
the load balancer backend.\
"""
),

"bci-fetch-last-height": (
"ONLINE (BLOCKCHAIN.INFO)",
"BLOCKCHAIN QUERIES (blockchain.info)",
"Fetch the last block height using blockchain.info.",

"""\
Usage: sx bci-fetch-last-height

Fetch the last block height using blockchain.info.\
"""
),

"fetch-stealth": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Fetch a stealth information using a network connection to\n" +
SPACING + "make requests against the obelisk load balancer backend.",

"""\
Fetch a stealth information using a network connection to
make requests against the obelisk load balancer backend.

Usage: sx fetch-stealth NUMBER_BITS BITFIELD [FROM_HEIGHT]

Default NUMBER_BITS is 0 (if not specified).

EXAMPLE: 

  $ sx fetch-stealth 2 8bf41c69
\
"""
),

"fetch-transaction": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Fetch a raw transaction using a network connection to\n" +
SPACING + "make requests against the obelisk load balancer backend.",

"""\
Fetch a raw transaction using a network connection to
make requests against the obelisk load balancer backend.

Usage: sx fetch-transaction HASH

EXAMPLE: 

  $ sx fetch-transaction 69735d70ada1be32ff39b49c6fc2390b03e9d5eed8918ed10fe42c8cbabf62d4 # fetches raw data
\
"""
),

"fetch-transaction-index": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Fetch block height and index in block of transaction.",

"""\
Usage: sx fetch-transaction-index HASH

The fetch-transaction-index tool uses a network connection to make requests
against the load balancer backend.\
"""
),

"balance": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Show balance of a Bitcoin address in satoshis.",

"""\
Usage: sx balance [-j] ADDRESS1 [ADDRESS2...]

The balance tool uses a network connection to make requests against the
load balancer backend.

  -j, --json                 Enable json parseable output.

Example:

  $ echo 134HfD2fdeBTohfx8YANxEpsYXsv5UoWyz | sx balance
  Address: 134HfD2fdeBTohfx8YANxEpsYXsv5UoWyz
    Paid balance:    0
    Pending balance: 0
    Total received:  100000
\
"""
),

"history": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Get list of output points, values, and their spends for an\n" +
SPACING + "address. grep can filter for just unspent outputs which can\n" +
SPACING + "be fed into mktx.",

"""\
Usage: sx history [-j] ADDRESS1 [ADDRESS2...]

The history tool uses a network connection to make requests against the
load balancer backend.

  -j, --json                 Enable json parseable output.

Example:

  $ echo 134HfD2fdeBTohfx8YANxEpsYXsv5UoWyz | sx history
  Address: 134HfD2fdeBTohfx8YANxEpsYXsv5UoWyz
    output: 97e06e49dfdd26c5a904670971ccf4c7fe7d9da53cb379bf9b442fc9427080b3:1
    output_height: 247683
    value:  100000
    spend: b7354b8b9cc9a856aedaa349cffa289ae9917771f4e06b2386636b3c073df1b5:0
    spend_height: 247742
\
"""
),

"bci-history": (
"ONLINE (BLOCKCHAIN.INFO)",
"BLOCKCHAIN QUERIES (blockchain.info)",
"Get list of output points, values, and their spends\n" +
SPACING + "from blockchain.info",

"""\
Usage: sx bci-history SATOSHIS
Get list of output points, values and spends using blockchain.info.\
"""
),

"get-utxo": (
"ONLINE (OBELISK)",
"BLOCKCHAIN QUERIES",
"Get enough unspent transaction outputs from a given set of\n" +
SPACING + "addresses to pay a given number of satoshis",

"""\
Usage: sx get-utxo ADDRESS1 ADDRESS2... SATOSHIS
Get enough unspent transaction outputs from a given set of addresses to pay a given number of satoshis\
"""
),

"get-pubkey": (
"OFFLINE KEYS AND ADDRESSES",
"BASIC",
"Get the pubkey of an address if available",

"""\
Usage: sx get-pubkey ADDRESS
Get the pubkey of an address if available\
"""
),

"mktx": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Create an unsigned tx.",

"""\
        Usage: sx mktx FILENAME [-i TXHASH:INDEX]... [-o ADDRESS:VALUE] [-o HEXSCRIPT:VALUE]

  -i, --input TXHASH:INDEX      Add input to transaction.
  -o, --output ADDRESS:VALUE or HEXSCRIPT:VALUE
                                Add output to transaction.

Construct the transaction:

  $ sx mktx txfile.tx -i 97e06e49dfdd26c5a904670971ccf4c7fe7d9da53cb379bf9b442fc9427080b3:1 -o 13Ft7SkreJY9D823NPm4t6D1cBqLYTJtAe:90000

FILENAME denotes the output file. If FILENAME is - (a single dash), then
output is written to stdout.

The VALUE field is in Satoshis.\
"""
),

"wif-to-secret": (
"UTILITY",
"FORMAT (WIF)",
"Convert a Wallet Import Format to secret exponent value.",

"""\
Usage: echo WIF | sx wif-to-secret
\
"""
),

"secret-to-wif": (
"UTILITY",
"FORMAT (WIF)",
"Convert a secret exponent value to Wallet Import Format",

"""\
Usage: echo SECRET | sx secret-to-wif
\
"""
),

"sha256": (
"UTILITY",
"HASHES",
"Perform SHA256 hash of data.",

"""\
Usage: sx sha256 DATA

Perform SHA256 hash of data.\
"""
),

"mpk": (
"DEPRECATED",
"ELECTRUM STYLE DETERMINISTIC KEYS AND ADDRESSES",
"Extract a master public key from a deterministic wallet seed.",

"""\
Usage: sx mpk

Extract a master public key from a deterministic wallet seed.

  $ sx newseed > wallet.seed
  $ cat wallet.seed
  b220b5bd2909df1d74b71c9e664233bf
  $ cat wallet.seed | sx mpk > master_public.key
\
"""
),

"newkey": (
"OFFLINE KEYS AND ADDRESSES",
"BASIC",
"Create a new private key.",

"""\
Usage: sx newkey

  $ sx newkey
  5KPFsatiYrJcvCSRrDbtx61822vZjeGGGx3wu38pQDHRF8eVJ8H
\
"""
),

"newseed": (
"DEPRECATED",
"ELECTRUM STYLE DETERMINISTIC KEYS AND ADDRESSES",
"Create a new deterministic wallet seed.",

"""\
Usage: sx newseed

  $ sx newseed
  b220b5bd2909df1d74b71c9e664233bf
\
"""
),

"sendtx-node": (
"ONLINE (BITCOIN P2P)",
"BLOCKCHAIN UPDATES",
"Send transaction to a single node.",

"""\
Usage: sx sendtx-node FILENAME [HOST] [PORT]

HOST and PORT default to localhost:8333.

Send transaction to one Bitcoin node on localhost port 4009:

  $ sx sendtx-node txfile.tx localhost 4009
\
"""
),

"showblkhead": (
"OFFLINE BLOCKCHAIN",
"HEADERS",
"Show the details of a block header.",

"""\
Usage: sx showblkhead FILENAME

'showblkhead' allows inspecting of block headers.

  $ sx showblkhead headerfile.blk
  hash: 4d25b18ed094ad68f75f21692d8540f45ceb90b240a521b8f191e95d8b6b8bb0
  version: 1  locktime: 0
  Input:
    previous output:
  97e06e49dfdd26c5a904670971ccf4c7fe7d9da53cb379bf9b442fc9427080b3:0
    script:   sequence: 4294967295
  Output:
    value: 90000
    script: dup hash160 [ 18c0bd8d1818f1bf99cb1df2269c645318ef7b73 ] equalverify
  checksig
    address: 13Ft7SkreJY9D823NPm4t6D1cBqLYTJtAe
\
"""
),

"showtx": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Show the details of a transaction.",

"""\
Usage: sx showtx [-j] FILENAME

'showtx' allows inspecting of tx files.

  -j, --json                 Enable json parseable output.

Example:

  $ sx fetch-transaction cd484f683bc99c94948613a7f7254880e9c98cd74f2760a2d2c4e372fda1bc6a | sx showtx
  hash: cd484f683bc99c94948613a7f7254880e9c98cd74f2760a2d2c4e372fda1bc6a
  version: 1
  locktime: 0
  Input:
    previous output: f97367c5dc9e521a4c541327cbff69d118e35a2d0b67f91eb7771741a6374b20:0
    script: [ 3046022100f63b1109e1b04c0a4b5230e6f6c75f5e2a10c16d022cdf93de9b3cc946e6e24a022100ae3da40f05504521f2f3557e736a2d1724d6d1d8c18b66a64990bf1afee78dba01 ] [ 028a2adb719bbf7e9cf0cb868d4f30b10551f2a4402eb2ece9b177b49e68e90511 ]
    sequence: 4294967295
    address: 1NYMePixLjAATLaz55vN7FfTLUfFB23Tt
  Output:
    value: 2676400
    script: dup hash160 [ 6ff00bd374abb3a3f19d1576bb36520b2cb15e2d ] equalverify checksig
    address: 1BCsZziw8Q1sMhxr2DjAR7Rmt1qQvYwXSU
  Output:
    value: 1000000
    script: hash160 [ 0db1635fe975792a9a7b6f2d4061b730478dc6b9 ] equal
    address: 32wRDBezxnazSBxMrMqLWqD1ajwEqnDnMc
\
"""
),

"decode-addr": (
"UTILITY",
"FORMAT (BASE58CHECK)",
"Decode a address from base58check form to internal RIPEMD representation",

"""\
Usage: sx decode-addr ADDRESS
Decode an address to its internal RIPEMD representation.\
"""),

"embed-addr": (
"OFFLINE KEYS AND ADDRESSES",
"BASIC",
"Generate an address used for embedding record of data into the blockchain",

"""\
Usage: sx embed-addr
Generate an address used for embedding record of data into the blockchain.

Example:

  $ cat my_sculpture.jpg | sx embed-addr
  1N9v8AKBqst9MNceV3gLmFKsgkKv1bZcBU

Now send some Bitcoin to that address and it'll be embedded in the blockchain
as a record of the data passed in.
\
"""),

"encode-addr": (
"UTILITY",
"FORMAT (BASE58CHECK)",
"Encode an address from internal RIPEMD representation to base58check form",

"""\
Usage: sx encode-addr HASH [VERSION]
Encode an address to base58check form.\
"""),

"validsig": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Validate a transaction input's signature.",

"""\
Usage: sx validsig FILENAME INDEX SCRIPT_CODE SIGNATURE
Validate a transaction input's signature.\
"""),

"brainwallet": (
"OFFLINE KEYS AND ADDRESSES",
"BRAIN STORAGE",
"Make 256 bit bitcoin private key from an arbitrary passphrase.",

"""\
Usage: sx brainwallet password
       sx brainwallet username password
       sx brainwallet password --algo slowsha
       sx brainwallet username password --algo slowsha
Make 256 bit bitcoin private key from an arbitrary passphrase, using sha256.
Unsafe if passphrase is low in entropy.
See diceware and xkcd correct horse battery staple for advice on entropy and generating a safe brainwallet.\
"""
),

#"sign-transaction": (
#"OFFLINE (work in progress)",
#"SIGNING WALLET",
#"Sign a transaction. Output is suitable for sending to bitcoin network.",

#"""\
#Usage: cat unsigned.tx | sx sign-transaction --wallet=sx.wallet.gpg --gpgkey=~/. 
#       sx brainwallet username password
#       sx brainwallet password --algo slowsha
#       sx brainwallet username password --algo slowsha
#Make a private key from a brainwallet.\
#"""
#),

"set-input": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Set a transaction input.",

"""\
Usage: sx set-input TXFILENAME INPUTINDEX SIGNATURE_AND_PUBKEY_SCRIPT
Set a transaction input.
See sx help sign-input for an example.\
"""),

"sign-input": (
"OFFLINE TRANSACTIONS",
"SCRIPTING",
"Sign a transaction input.",

"""\
Usage: cat secret.key | sx sign-input FILENAME INDEX PREVOUT_SCRIPT

Sign a transaction input.



Note how the input script in the following transaction is empty.

  $ sx mktx txfile.tx -i 97e06e49dfdd26c5a904670971ccf4c7fe7d9da53cb379bf9b442fc9427080b3:0 -o 13Ft7SkreJY9D823NPm4t6D1cBqLYTJtAe:90000
  $ sx showtx txfile.tx
  hash: 4d25b18ed094ad68f75f21692d8540f45ceb90b240a521b8f191e95d8b6b8bb0
  version: 1  locktime: 0
  Input:
    previous output:
  97e06e49dfdd26c5a904670971ccf4c7fe7d9da53cb379bf9b442fc9427080b3:0
    script:   sequence: 4294967295
  Output:
    value: 90000
    script: dup hash160 [ 18c0bd8d1818f1bf99cb1df2269c645318ef7b73 ] equalverify
  checksig
    address: 13Ft7SkreJY9D823NPm4t6D1cBqLYTJtAe

We will now sign the first input using our private key.

  $ echo '5KPFsatiYrJcvCSRrDbtx61822vZjeGGGx3wu38pQDHRF8eVJ8H' > private.key
  $ DECODED_ADDR=$(cat private.key | sx addr | sx decode-addr)
  $ PREVOUT_SCRIPT=$(sx rawscript dup hash160 [ $DECODED_ADDR ] equalverify checksig)
  $ SIGNATURE=$(cat private.key | sx sign-input txfile.tx 0 $PREVOUT_SCRIPT)
  $ SIGNATURE_AND_PUBKEY_SCRIPT=$(sx rawscript [ $SIGNATURE ] [ $(cat private.key | sx pubkey) ])
  $ sx set-input txfile.tx 0 $SIGNATURE_AND_PUBKEY_SCRIPT > txfile.tx.signed  # the first input has index 0

Note how the input script in the following transaction is now filled.

  $ cat txfile.tx.signed | sx showtx
  hash: cc5650c69173e7607c095200f4ff36265f9fbb45e112b60cd467d696b2724488
  version: 1
  locktime: 0
  Input:
    previous output: 97e06e49dfdd26c5a904670971ccf4c7fe7d9da53cb379bf9b442fc9427080b3:0
    script: [ 3045022100b778f7fb270b751491ba7e935a6978eaea2a44795b3f6636ea583939697b1ca102203ce47d3ecb0b7e832114e88e549fce476d4ea120ca1e60c508fe8083889a9cba01 ] [ 04c40cbd64c9c608df2c9730f49b0888c4db1c436e\
  8b2b74aead6c6afbd10428c0adb73f303ae1682415253f4411777224ab477ad098347ddb7e0b94d49261e613 ]
    sequence: 4294967295
    address: 1MyKMeDsom7rYcp69KpbKn4DcyuvLMkLYJ
  Output:
    value: 90000
    script: dup hash160 [ 18c0bd8d1818f1bf99cb1df2269c645318ef7b73 ] equalverify checksig
    address: 13Ft7SkreJY9D823NPm4t6D1cBqLYTJtAe


Now the input script is prepared, and the transaction is signed.

\
"""
),

"mnemonic": (
"OFFLINE KEYS AND ADDRESSES",
"BRAIN STORAGE",
"Make 12 word mnemonic out of 128 bit electrum or bip32 seed.",

"""\
Usage: sx mnemonic

Electrum compatible 12 word seeds.

  $ echo 148f0a1d77e20dbaee3ff920ca40240d | sx mnemonic
  people blonde admit dart couple different truth common alas stumble time cookie
  $ echo "people blonde admit dart couple different truth common alas
stumble time cookie" | sx mnemonic
  148f0a1d77e20dbaee3ff920ca40240d
\
"""
),

"watchtx": (
"ONLINE (OBELISK)",
"BLOCKCHAIN WATCHING",
"Watch transactions from the network searching for a certain hash.",

"""\
Usage: sx watchtx [TXHASH]...

Watch transactions from the network searching for a certain hash.\
"""
),

"stealth-initiate": (
"OFFLINE KEYS AND ADDRESSES",
"STEALTH",
"Initiate a new stealth payment.",

"""\
Usage: sx stealth-initiate EPHEM_SECRET SCAN_PUBKEY SPEND_PUBKEY

Initiate a new stealth payment.\
"""
),

"stealth-uncover": (
"OFFLINE KEYS AND ADDRESSES",
"STEALTH",
"Uncover a stealth address.",

"""\
Usage: sx stealth-uncover EPHEM_PUBKEY SCAN_SECRET SPEND_PUBKEY

Uncover a stealth address.\
"""
),

"stealth-uncover-secret": (
"OFFLINE KEYS AND ADDRESSES",
"STEALTH",
"Uncover a stealth secret.",

"""\
Usage: sx stealth-uncover-secret EPHEM_PUBKEY SCAN_SECRET SPEND_SECRET

Uncover a stealth secret.\
"""
),

"stealth-newkey": (
"OFFLINE KEYS AND ADDRESSES",
"STEALTH",
"Generate new stealth keys and an address.",

"""\
Usage: sx stealth-newkey

Generate new stealth keys and an address.\
"""
),

"stealth-addr": (
"OFFLINE KEYS AND ADDRESSES",
"STEALTH",
"See a stealth address from given input.",

"""\
Usage: sx stealth-addr [--reuse-key|-r] [--signatures|-s NSIGS] SCAN_PUBKEY SPEND_PUBKEY1 ...  SPEND_PUBKEYN

See a stealth address from given input.

  --reuse-key -r    Reuse SCAN_PUBKEY for SPEND_PUBKEY
  --signatures -s   Specify NUMBER_SIGNATURES needed.
"""
),

"stealth-show-addr": (
"OFFLINE KEYS AND ADDRESSES",
"STEALTH",
"Show details for a stealth address.",

"""\
Usage: sx stealth-show-addr STEALTH_ADDRESS

Show details for a stealth address.\
"""
),

"hd-seed": (
"OFFLINE KEYS AND ADDRESSES",
"HD / BIP32",
"Create a random new HD key.",

"""\
Usage: sx hd-seed [ENTROPY]

Create a random new HD key.\
"""
),

"hd-priv": (
"OFFLINE KEYS AND ADDRESSES",
"HD / BIP32",
"Create an private HD key from another HD private key.",

"""\
Usage: sx hd-priv [--hard] INDEX

Create an private HD key from another HD private key.\
"""
),

"hd-pub": (
"OFFLINE KEYS AND ADDRESSES",
"HD / BIP32",
"Create an HD public key from another HD private or public key.",

"""\
Usage: sx hd-pub [--hard] INDEX

Create an HD public key from another HD private or public key.
"""
),

"hd-to-address": (
"OFFLINE KEYS AND ADDRESSES",
"HD / BIP32",
"Convert an HD public or private key to a Bitcoin address.",

"""\
Usage: sx hd-to-address

Convert an HD public or private key to a Bitcoin address.\
"""
),

"hd-to-wif": (
"OFFLINE KEYS AND ADDRESSES",
"HD / BIP32",
"Convert an HD private key to a WIF private key.",

"""\
Usage: sx hd-to-wif

Convert an HD private key to a WIF private key.\
"""
),

"ec-multiply": (
"UTILITY",
"EC MATH",
"Multiply an integer and a point together.",

"""\
Usage: sx ec-multiply INTEGER POINT

Multiply an integer and a point together.\
"""
),

"ec-tweak-add": (
"UTILITY",
"EC MATH",
"Calculate the result of POINT + INTEGER * G.",

"""\
Usage: sx ec-tweak-add INTEGER POINT

Calculate the result of POINT + INTEGER * G.\
"""
),

"ec-add-modp": (
"UTILITY",
"EC MATH",
"Calculate the result of INTEGER + INTEGER.",

"""\
Usage: sx ec-add-modp INTEGER INTEGER

Calculate the result of INTEGER + INTEGER.\
"""
),

}

def display_usage():
    print "Usage: sx COMMAND [ARGS]..."
    print
    print "  -c, --config               Specify a config file"
    print
    print "The sx commands are:"
    print
    categorized={}
    for cmd in sorted(command_list.iterkeys()):
        category =    command_list[cmd][0]
        subcategory = command_list[cmd][1]
        if category not in categorized:
            categorized[category] = {}
        subcategorized = categorized[category]

        if subcategory not in subcategorized:
            subcategorized[subcategory] = []


        short_desc = command_list[cmd][2]
        line = "   %s" % cmd
        line += " " * (len(SPACING) - len(cmd) - 3)
        line += short_desc
        categorized[category][subcategory].append(line)
        
    for category, subcategories in sorted(categorized.iteritems()):
        print category
        for subcategory, lines in sorted(subcategories.iteritems()):
            print "  " , subcategory
            for line in lines:
                print "    " , line
        print
    print "See 'sx help COMMAND' for more information on a specific command."
    print
    print "SpesmiloXchange home page: <http://sx.dyne.org/>"

def display_help(command):
    assert command in command_list
    long_desc = command_list[command][3]
    print long_desc
    return 0

def display_bad(command):
    print "sx: '%s' is not a sx command. See 'sx --help'." % command
    return 1

def create_cfg_if_not_exist():
    home = os.path.expanduser("~")
    cfg_path = os.path.join(home, ".sx.cfg")
    if not os.path.exists(cfg_path):
        shutil.copyfile("@cfgdefault@", cfg_path)
        print "Created SX config file:", cfg_path

def main(argv):
    if len(argv) == 1:
        display_usage()
        return 1
    args = argv[1:]
    if args and (args[0] == "-c" or args[0] == "--config"):
        if len(args) < 3:
            display_usage()
            return 1
        use_cfg = args[1]
        if not os.path.isfile(use_cfg):
            print >> sys.stderr, \
                "sx: config file '%s' doesn't exist!" % use_cfg
            return 2
        args = args[2:]
        os.environ["SX_CFG"] = use_cfg
        #print "Using config file:", use_cfg
    else:
        create_cfg_if_not_exist()
    if not args:
        display_usage()
        return 1
    command = args[0]
    # args as one string we can pass to the sx sub-command
    args = args[1:]
    if command == "help" or command == "--help" or command == "-h":
        if not args:
            display_usage()
            return 0
        return display_help(args[0])
    elif command in command_list:
        # make will come and substitute @corebindir@
        binary = "@corebindir@/sx-%s" % command
        return subprocess.call([binary] + args)
    else:
        return display_bad(command)
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))

