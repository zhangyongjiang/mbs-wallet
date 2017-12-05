/*global angular */

angular.module('webwalletApp').controller('AccountReceiveCtrl', function (
    $document,
    $scope,
    $timeout) {

    'use strict';

    $scope.activeAddress = null;
    $scope.usedAddresses = [];
    $scope.addresses = [];
    $scope.lookAhead = 20;

    $scope.activate = function (address) {
        $scope.activeAddress = address;

        // select the address text
        $timeout(function () {
            var addr = address.address,
                elem = $document.find('.address-list-address:contains('+addr+')');
            if (elem.length)
                selectRange(elem[0]);
        });
    };

    $scope.more = function () {
        var index = $scope.addresses.length,
            address = $scope.account.address(index);
        $scope.addresses[index] = address;
        $scope.activate(address);
    };

    $scope.more();

    function selectRange(elem) {
        var selection, range,
            document = window.document,
            body = document.body;

        if (body.createTextRange) { // ms
            range = body.createTextRange();
            range.moveToElementText(elem);
            range.select();
            return;
        }

        if (window.getSelection) { // moz, opera, webkit
            selection = window.getSelection();
            range = document.createRange();
            range.selectNodeContents(elem);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
        }
    }

});
