/*global angular*/

angular.module('webwalletApp').controller('DeviceWipeCtrl', function (
    $scope,
    flash,
    deviceList,
    $translate,
    $modal) {

    'use strict';

    var _wipeInProgress = false,
        _disconnectModal = null;

    deviceList.registerDisconnectHook(forgetOnDisconnectAfterWipe, 10);

    /**
     * Replace default modal asking the user if he/she wants to forget the
     * device with a custom one that features a message that the wipe was
     * successfully finished.
     *
     * @param {TrezorDevice} dev  Device
     */
    function forgetOnDisconnectAfterWipe(dev) {
        var hideSuccessMessage;
        if (_wipeInProgress) {
            _wipeInProgress = false;
            hideSuccessMessage = _disconnectModal !== null;
            if (_disconnectModal) {
                _disconnectModal.close();
                _disconnectModal = null;
            }
            promptForget(hideSuccessMessage)
                .then(function () {
                    deviceList.forget(dev);
                }, function () {
                    deviceList.navigateTo(dev, true);
                });
            deviceList.abortHook();
        }
    }

    /**
     * Wipe the device
     *
     * Then ask the user if he/she wants to forget it -- this happens
     * automatically, because the disconnect event is fired while wiping the
     * device (the HID ID changes).
     */
    $scope.wipeDevice = function () {
        _wipeInProgress = true;
        $scope.device.wipe().then(
            function () {
                /*
                 * On Mac OS X, the disconnect event doesn't fire on HID ID
                 * change, so we need to ask the user to disconnect the device.
                 */
                if (window.navigator.userAgent.match(/Mac/)) {
                    promptDisconnect();
                }
            },
            function (err) {
                _wipeInProgress = false;
                flash.error(err.message || $translate.instant('js.controllers.device.wipe.wiping-failed'));
            }
        );
    };

    /**
     * Ask user to disconnect the device.
     */
    function promptDisconnect() {
        var modal = $modal.open({
            templateUrl: 'views/modal/disconnect.wipe.html',
            size: 'sm',
            backdrop: 'static',
            keyboard: false
        });
        modal.opened.then(function () {
            $scope.$emit('modal.disconnect.wipe.show');
        });
        modal.result.finally(function () {
            $scope.$emit('modal.disconnect.wipe.hide');
        });

        _disconnectModal = modal;

        return modal.result;
    }

    /**
     * Ask user if he/she wants to forget the device.
     *
     * @param {Boolean} hideSuccessMsg  Hide the success message (it is not
     *                                  necessary if the modal asking to
     *                                  disconnect the device was already
     *                                  shown).
     */
    function promptForget(hideSuccessMsg) {
        var modal,
            scope;

        scope = angular.extend($scope.$new(), {
            hideSuccessMsg: hideSuccessMsg
        });

        modal = $modal.open({
            templateUrl: 'views/modal/forget.wipe.html',
            backdrop: 'static',
            keyboard: false,
            scope: scope
        });
        modal.opened.then(function () {
            $scope.$emit('modal.forget.wipe.show');
        });
        modal.result.finally(function () {
            $scope.$emit('modal.forget.wipe.hide');
        });

        return modal.result;
    }
});
