#include <boost/lexical_cast.hpp>
#include <bitcoin/bitcoin.hpp>
using namespace bc;

int main(int argc, char** argv)
{
    typedef std::vector<std::string> string_list;
    string_list args;
    for (size_t i = 1; i < argc; ++i)
        args.push_back(argv[i]);
    // Check for optional arguments.
    bool reuse_address = false;
    uint8_t number_sigs = 0;
    for (auto it = args.begin(); it != args.end(); )
    {
        if (*it == "--reuse-key" || *it == "-r")
        {
            it = args.erase(it);
            break;
        }
        if (*it == "--signatures" || *it == "-s")
        {
            it = args.erase(it);
            if (it == args.end())
            {
                std::cerr << "sx: --signatures requires a number." << std::endl;
                return -1;
            }
            number_sigs = static_cast<uint8_t>(boost::lexical_cast<int>(*it));
        }
        ++it;
    }
    // Read scan pubkey.
    if (args.empty())
    {
        std::cerr << "sx: Scan pubkey must be provided." << std::endl;
        return -1;
    }
    const data_chunk scan_pubkey = decode_hex(args[0]);
    args.erase(args.begin());
    // Remaining keys are spend_pubkeys.
    typedef std::vector<data_chunk> pubkey_list;
    pubkey_list spend_pubkeys;
    for (const auto& arg: args)
        spend_pubkeys.emplace_back(decode_hex(arg));
    // Now we have the data.
    // Construct actual address.
    // https://wiki.unsystem.net/index.php/DarkWallet/Stealth#Address_format
    data_chunk raw_addr;
    // version byte.
    raw_addr.push_back({0x2a});
    // options byte.
    uint8_t options_bitfield = 0;
    if (reuse_address)
        options_bitfield |= 1;
    raw_addr.push_back(options_bitfield);
    extend_data(raw_addr, scan_pubkey);
    uint8_t number_keys = spend_pubkeys.size();
    raw_addr.push_back(number_keys);
    for (const auto& pubkey: spend_pubkeys)
        extend_data(raw_addr, pubkey);
    // If not configured then set it to the number_keys
    if (!number_sigs)
        number_sigs = number_keys;
    if (reuse_address)
        ++number_sigs;
    raw_addr.push_back(number_sigs);
    // Prefix filter currently unused.
    // Allow configuring this later.
    raw_addr.push_back({0x00});
    uint32_t checksum = bitcoin_checksum(raw_addr);
    append_checksum(raw_addr);
    const std::string stealth_addr = encode_base58(raw_addr);
    std::cout << stealth_addr << std::endl;
    return 0;
}

