/*global angular */

angular.module('webwalletApp').controller('AccountCtrl', function (
    $scope,
    $location,
    $routeParams,
    config) {

    'use strict';

    $scope.account = $scope.device.account($routeParams.accountId);
    if (!$scope.account) {
        $location.path('/');
        return;
    }

    $scope.blockExplorer = config.blockExplorers[config.coin];

    $scope.hideAccount = function () {
        $scope.account.unsubscribe();
        $scope.device.hideAccount($scope.account);
        $location.path('/device/' + $scope.device.id + '/account/'
                       + ($scope.device.accounts.length - 1));
    };

});
