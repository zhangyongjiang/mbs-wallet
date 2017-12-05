/*global angular*/

angular.module('webwalletApp').controller('ImportCtrl', function (
    deviceList,
    TrezorDevice,
    TrezorAccount,
    config,
    utils,
    $scope,
    $log) {

    'use strict';

    $scope.coins = {
        Bitcoin: {
            address_type: 0,
            coin_name: "Bitcoin",
            coin_shortcut: "BTC",
            maxfee_kb: 10000
        },
        Testnet: {
            address_type: 111,
            coin_name: "Testnet",
            coin_shortcut: "TEST",
            maxfee_kb: 10000000
        }
    };

    $scope.settings = {
        id: randomDeviceId()
    };

    function randomDeviceId() {
        return Math.random().toString(36).substr(2);
    }

    function parseAccounts(device, payload) {
        var coin = device.defaultCoin();

        return (payload.match(/[^\r\n]+/g) || [])
            .map(function parseXpub(line) {
                line = line.split(':');
                line = line[line.length - 1];
                line = line.trim();
                if (line.match(/\w+/))
                    return line;
                return null;
            })
            .map(function createAccount(xpub, index) {
                var node, account;

                node = utils.xpub2node(xpub);
                node.path = device.accountPath(index, coin);

                $log.log('Importing account', node);
                account = new TrezorAccount(index, coin, node);
                account.subscribe();
                return account;
            });
    }

    $scope.importDevice = function () {
        var id = $scope.settings.id,
            payload = $scope.settings.payload,
            device;

        console.log('[import] Importing device', id);
        device = new TrezorDevice({ id: id });
        device.features = {
            'device_id': id,
            'coins': $scope.coins,
            'initialized': true,
            'imported': true,
            'major_version': 0,
            'minor_version': 0,
            'patch_version': 0,
            'pin_protection': false,
            'passphrase_protection': false,
            'revision': 'deadbeef',
            'bootloader_hash': 'deafbeef',
            'vendor': 'bitcointrezor.com'
        };

        if (payload)
            device.accounts = parseAccounts(device, payload);
        deviceList.add(device);
    };

});
