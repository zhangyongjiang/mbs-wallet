/*global angular*/

angular.module('webwalletApp').controller('AccountSignCtrl', function (
    utils,
    deviceList,
    $translate,
    $scope) {

    'use strict';

    var _suggestedAddressesCache = [];

    function getAddressPath(address) {
        var i,
            l,
            addresses = $scope.suggestAddressesWithCache(),
            a;

        for (i = 0, l = addresses.length; i < l; i = i + 1) {
            a = addresses[i];
            if (a.address === address) {
                if (a.path) {
                    return a.path;
                } else {
                    return a.acc.getOutPath(a.tx);
                }
            }
        }

        return null;
    }

    $scope.signSaveAddress = function () {
        if (!$scope.sign.address) {
            $scope.sign.address_n = null;
            $scope.sign.address_status = null;
            return false;
        }
        $scope.sign.address_n = getAddressPath($scope.sign.address);
        if (!$scope.sign.address_n) {
            $scope.sign.address_status = 'error';
            return false;
        }
        $scope.sign.address_status = 'success';
        return true;
    };

    $scope.sign = function () {
        var message,
            address_n,
            coin;

        message = utils.bytesToHex(utils.stringToBytes(
            $scope.sign.message
        ));
        address_n = $scope.sign.address_n;
        coin = $scope.device.defaultCoin();

        $scope.device.signMessage(address_n, message, coin).then(
            function (res) {
                $scope.sign.res = null;
                $scope.sign.signature =
                    utils.bytesToBase64(utils.hexToBytes(
                        res.message.signature
                    ));
            },
            function (err) {
                $scope.sign.res = {
                    status: 'error',
                    message: [
                        $translate.instant('js.controllers.account.sign.sign-failed'),
                        err.message,
                        '.'
                    ].join('')
                };
            }
        );
    };

    $scope.verify = function () {
        var message,
            address,
            signature;

        message = utils.bytesToHex(utils.stringToBytes(
            $scope.verify.message
        ));
        address = $scope.verify.address;

        if (!address) {
            $scope.verify.res = {
                status: 'error',
                message: [
                    $translate.instant('js.controllers.account.sign.fill-address')
                ].join('')
            };
            return;
        }

        try {
            signature = utils.bytesToHex(utils.base64ToBytes(
                $scope.verify.signature
            ));
        } catch (e) {
            $scope.verify.res = {
                status: 'error',
                message: $translate.instant('js.controllers.account.sign.verify-failed-invalid-signature')
            };
            return;
        }

        $scope.device.verifyMessage(address, signature, message).then(
            function () {
                $scope.verify.res = {
                    status: 'success',
                    message: $translate.instant('js.controllers.account.sign.verified-successful')
                };
            },
            function (err) {
                $scope.verify.res = {
                    status: 'error',
                    message: [
                        $translate.instant('js.controllers.account.sign.verify-failed'),
                        err.message,
                        '.'
                    ].join('')
                };
            }
        );
    };

    $scope.suggestAddresses = function () {
        var UNUSED_COUNT = 10,
            multipleDevices = deviceList.count() > 1,
            addresses = [];

        deviceList.all().forEach(function (dev) {
            dev.accounts.forEach(function (acc) {
                var label;

                if (multipleDevices) {
                    label = [dev.label(), '/', acc.label()].join(' ');
                } else {
                    label = acc.label();
                }

                acc.usedAddresses()
                    .map(_suggestAddress)
                    .forEach(function (a) { addresses.push(a); });
                acc.unusedAddresses(UNUSED_COUNT)
                    .map(_suggestAddress)
                    .forEach(function (a) { addresses.push(a); });

                function _suggestAddress(address) {
                    return {
                        label: label + ': ' + address.address,
                        address: address.address,
                        path: address.path,
                        tx: address.tx,
                        acc: acc,
                        source: 'Account'
                    };
                }
            });
        });

        return addresses;
    };

    $scope.suggestAddressesWithCache = function () {
        if (!_suggestedAddressesCache.length) {
            _suggestedAddressesCache = $scope.suggestAddresses();
        }
        return _suggestedAddressesCache;
    };

    $scope.resetSign = function () {
        $scope.sign.signature = '';
        $scope.sign.res = null;
    };

    $scope.resetVerify = function () {
        $scope.verify.res = null;
    };

    $scope.isSignValid = function () {
        return $scope.sign.message && $scope.sign.address_n;
    };

    $scope.hasErrorMessage = function (type) {
        return $scope[type] && $scope[type].res &&
            $scope[type].res.message;
    };

    $scope.getAlertClass = function (type) {
        if ($scope[type] && $scope[type].res) {
            if ($scope[type].res.status === 'error') {
                return 'alert-danger';
            }
            if ($scope[type].res.status === 'success') {
                return 'alert-success';
            }
        }
    };

    $scope.getSignAddressClass = function () {
        if ($scope.sign.address_status === 'error') {
            return 'has-error';
        }
        if ($scope.sign.address_status === 'success') {
            return 'has-success';
        }
    };
});
