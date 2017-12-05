/*global angular*/

angular.module('webwalletApp').controller('DeviceInfoCtrl', function (
    flash,
    $scope,
    $location) {

    'use strict';

    $scope.highlightedXpub = null;

    $scope.highlightXpub = function (xpub) {
        $scope.highlightedXpub = xpub;
    };

});
