/*global angular*/

/**
 * Navigation Controller
 *
 * Manage device and account navigation and account adding.
 *
 * @see  nav.html
 */
angular.module('webwalletApp').controller('NavCtrl', function (
    $scope,
    $location,
    deviceList,
    $translate,
    flash) {

    'use strict';

    $scope.devices = function () {
        return deviceList.all();
    };

    $scope.isActive = function (path) {
        return $location.path().match(path);
    };

    $scope.addingInProgress = false;

    $scope.addAccount = function (dev) {
        $scope.addingInProgress = true;
        dev.addAccount().then(
            function (acc) {
                $location.path('/device/' + dev.id + '/account/' + acc.id);
                $scope.addingInProgress = false;
            },
            function (err) {
                flash.error(err.message || $translate.instant('js.controllers.nav.add-account-failed'));
            }
        );
    };

    $scope.accountLink = function (dev, acc) {
        var link = '#/device/' + dev.id + '/account/' + acc.id;
        if ($scope.isActive('/receive$')) link += '/receive';
        if ($scope.isActive('/send$')) link += '/send';
        return link;
    };

    $scope.forget = function (dev) {
        deviceList.forget(dev);
    };

});
