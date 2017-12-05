/*global angular*/

/**
 * Device Controller
 */
angular.module('webwalletApp').controller('DeviceCtrl', function (
    $modal,
    $scope,
    $rootScope,
    $location,
    $routeParams,
    $document,
    $translate,
    flash,
    TrezorDevice,
    deviceList,
    deviceService) {

    'use strict';

    var disconnectModal = null;

    // Get current device or go to homepage.
    $scope.device = deviceList.get($routeParams.deviceId);
    if (!$scope.device) {
        $location.path('/');
        return;
    }

    // Handle device events -- buttons and disconnect.
    $scope.$on(TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_PIN,
               promptPin);
    $scope.$on(TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_BUTTON,
               handleButton);
    $scope.$on(TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_PASSPHRASE,
               promptPassphrase);
    $scope.$on(deviceService.EVENT_ASK_FORGET, forgetOnDisconnect);
    $scope.$on(deviceService.EVENT_ASK_DISCONNECT, askToDisconnectOnForget);
    $scope.$on(deviceService.EVENT_CLOSE_DISCONNECT, closeDisconnect);

    /**
     * When a device is disconnected, ask the user if he/she wants to
     * forget it or remember.
     *
     * If the user chooses to forget the device, forget it immediately.
     *
     * If the user chooses to remember the device, keep the device and store
     * this answer to localStorage so that the next time the device is
     * disconnected it is automatically remembered without asking the user
     * again.
     *
     * @param {Object} e             Event object
     * @param {TrezorDevice} device  Device that was disconnected
     */
    function forgetOnDisconnect(e, device) {
        if (device.forgetOnDisconnect === null ||
            device.forgetOnDisconnect === undefined) {
            promptForget()
                .then(function () {
                    device.forgetOnDisconnect = true;
                    deviceList.forget(device);
                }, function () {
                    device.forgetOnDisconnect = false;
                });
        } else if (device.forgetOnDisconnect) {
            deviceList.forget(device);
        }
    }

    /**
     * Ask the user to disconnect the device and then forget it when it's
     * disconnected.
     *
     * Passed `param` object has these mandatory properties:
     * - {TrezorDevice} `dev`: Device instance
     * - {Boolean} `requireDisconnect`: Is the user allowed to cancel the
     *      modal, or does he/she have to disconnect the device?
     *
     * @see  deviceService.forget()
     *
     * @param {Object} param  Parameters in format:
     *                        {dev: TrezorDevice,
     *                        requireDisconnect: Boolean}
     */
    function askToDisconnectOnForget(e, param) {
        promptDisconnect(param.requireDisconnect)
            .then(function () {
                deviceList.forget();
            }, function () {
                deviceService.forgetRequestCancelled();
            });
    }

    /**
     * Change device PIN
     *
     * Ask the user to set the PIN and then save the value.
     */
    $scope.changePin = function () {
        $scope.device.changePin().then(
            function () {
                flash.success($translate.instant('js.controllers.device.device.pin-change-successful'));
            },
            function (err) {
                flash.error(err.message || $translate.instant('js.controllers.device.device.pin-change-failed'));
            }
        );
    };

    /**
     * Ask the user to set the device label and then store filled value.
     *
     * If he/she fills in an empty value, the default label is used (read from
     * `TrezorDevice#DEFAULT_LABEL`).
     */
    $scope.changeLabel = function () {
        promptLabel()
            .then(function (settings) {
                settings.label = settings.label.trim() || $scope.device.DEFAULT_LABEL;
                return $scope.device.applySettings(settings);
            })
            .then(
                function () {
                    flash.success($translate.instant('js.controllers.device.device.label-change-successful'));
                },
                function (err) {
                    /*
                     * Show error message only if there actually was an
                     * error.  Closing the label modal triggers rejection
                     * as well, but without an error.
                     */
                    if (err) {
                        flash.error(err.message ||
                                    $translate.instant('js.controllers.device.device.label-change-failed'));
                    }
                }
            );
    };

    /**
     * Ask the user to disconnect the device.
     *
     * Returns a Promise which is resolved if the user disconnects the device
     * and failed if the user closes the modal dialog.
     *
     * @see  `askToDisconnectOnForget()`
     *
     * @param {Boolean} disableCancel  Forbid closing/cancelling the modal
     *
     * @return {Promise}
     */
    function promptDisconnect(disableCancel) {
        var scope,
            modal;

        scope = angular.extend($scope.$new(), {
            disableCancel: disableCancel
        });

        modal = $modal.open({
            templateUrl: 'views/modal/disconnect.html',
            size: 'sm',
            backdrop: 'static',
            keyboard: false,
            scope: scope
        });

        modal.opened.then(function () {
            $scope.$emit('modal.disconnect.show');
        });
        modal.result.finally(function () {
            $scope.$emit('modal.disconnect.hide');
        });

        disconnectModal = modal;

        return modal.result;
    }

    /**
     * Close the modal dialog asking the user to disconnect the device.
     */
    function closeDisconnect() {
        if (disconnectModal) {
            disconnectModal.close();
        }
    }

    /**
     * Ask the user if he/she wants to forget or remember the device.
     *
     * Returns a promise that is resolved if the user chooses to forget the
     * device and failed if the user chooses to remember it.
     *
     * @see  `forgetOnDisconnect()`
     *
     * @return {Promise}
     */
    function promptForget() {
        var modal = $modal.open({
            templateUrl: 'views/modal/forget.html',
            backdrop: 'static',
            keyboard: false
        });
        modal.opened.then(function () {
            $scope.$emit('modal.forget.show');
        });
        modal.result.finally(function () {
            $scope.$emit('modal.forget.hide');
        });

        return modal.result;
    }

    /**
     * Ask the user to set the device label.
     */
    function promptLabel() {
        var scope,
            modal;
        
        scope = angular.extend($scope.$new(), {
            label: $scope.device.features.label || '',
            language: $scope.device.features.language || $scope.device.DEFAULT_LANGUAGE,
            languages: $rootScope.languages
        });

        modal = $modal.open({
            templateUrl: 'views/modal/label.html',
            //size: 'sm',
            windowClass: 'labelmodal',
            backdrop: 'static',
            keyboard: false,
            scope: scope,
        });
        modal.opened.then(function () {
            scope.$emit('modal.label.show');
        });
        modal.result.finally(function () {
            scope.$emit('modal.label.hide');
        });

        return modal.result;
    }

    /**
     * Ask the user to set the device PIN.
     *
     * Bind keypress events that allow the user to control the number
     * buttons (dial) using a keyboard.
     *
     * @param {Event} event        Event object
     * @param {TrezorDevice} dev   Device
     * @param {String} type        Action type.  Possible values:
     *                                 - 'PinMatrixRequestType_Current'
     *                                 - 'PinMatrixRequestType_NewFirst'
     *                                 - 'PinMatrixRequestType_NewSecond'
     * @param {Function} callback  Called as `callback(err, res)`
     */
    function promptPin(e, dev, type, callback) {
        var scope, modal;

        if (dev.id !== $scope.device.id)
            return;

        scope = angular.extend($scope.$new(), {
            pin: '',
            type: type
        });

        scope.addPin = function (num) {
            scope.pin = scope.pin + num.toString();
            /*
             * When the user clicks a number button, the button gets focus.
             * Then when the user presses Enter it triggers another click on the
             * button instead of submiting the whole Pin Modal.  Therefore we need
             * to focus the document after each click on a number button.
             */
            $document.focus();
        };

        scope.delPin = function () {
            scope.pin = scope.pin.slice(0, -1);
        };

        scope.isPinSet = function () {
            return scope.pin.length > 0;
        };

        modal = $modal.open({
            templateUrl: 'views/modal/pin.html',
            size: 'sm',
            windowClass: 'pinmodal',
            backdrop: 'static',
            keyboard: false,
            scope: scope
        });
        modal.opened.then(function () {
            scope.$emit('modal.pin.show', type);
        });
        modal.result.finally(function () {
            scope.$emit('modal.pin.hide');
        });

        $document.on('keydown', _pinKeydownHandler);
        $document.focus();

        modal.result.then(
            function (res) {
                $document.off('keydown', _pinKeydownHandler);
                callback(null, res);
            },
            function (err) {
                $document.off('keydown', _pinKeydownHandler);
                callback(err);
            }
        );

        function _pinKeydownHandler(e) {
            var k = e.which,
                num;
            if (k === 8) { // Backspace
                scope.delPin();
                scope.$digest();
                return false;
            } else if (k === 13) { // Enter
                modal.close(scope.pin);
                return false;
            } else if (_isNumericKey(k)) {
                num = _getNumberFromKey(k);
                scope.addPin(String.fromCharCode(num));
                scope.$digest();
            }
        }

        function _isNumericKey(k) {
            return (k >= 49 && k <= 57) || (k >= 97 && k <= 105);
        }

        function _getNumberFromKey(k) {
            return (k >= 97) ? (k - (97 - 49)) : k;
        }
    }

    function promptPassphrase(e, dev, callback) {
        var scope,
            modal;

        if (dev.id !== $scope.device.id) {
            return;
        }

        scope = angular.extend($scope.$new(), {
            check: !$scope.device.hasSavedPassphrase(),
            checkCorrect: false,
            values: {
                passphrase: '',
                passphraseCheck: ''
            },
            installHandler: installSubmitHandlers
        });

        modal = $modal.open({
            templateUrl: 'views/modal/passphrase.html',
            size: 'sm',
            windowClass: 'passphrasemodal',
            backdrop: 'static',
            keyboard: false,
            scope: scope
        });
        modal.opened.then(function () {
            scope.$emit('modal.passphrase.show');
        });
        modal.result.finally(function () {
            scope.$emit('modal.passphrase.hide');
        });

        modal.result.then(
            function (res) {
                if (!$scope.device.checkPassphraseAndSave(res)) {
                    callback(new Error('Invalid passphrase'));
                } else {
                    callback(null, res);
                }
            },
            function (err) {
                callback(err);
            }
        );

        scope.$watch('values.passphrase', checkPassphrase);
        scope.$watch('values.passphraseCheck', checkPassphrase);

        function checkPassphrase() {
            var v = scope.values;
            if (!scope.check) {
                scope.checkCorrect = true;
                return;
            }
            scope.checkCorrect =
                (v.passphrase === v.passphraseCheck) &&
                (v.passphrase.length <= 50);
        }

        function installSubmitHandlers() {
            var submit = document.getElementById('passphrase-submit'),
                form = document.getElementById('passphrase-form');

            submit.addEventListener('submit', submitModal, false);
            submit.addEventListener('click', submitModal, false);
            form.addEventListener('submit', submitModal, false);
            form.addEventListener('keypress', function (e) {
                if (e.keyCode === 13 && scope.checkCorrect) {
                    submitModal();
                }
            }, true);

            function submitModal () {
                modal.close(scope.values.passphrase);
                return false;
            }
        }
    }

    function handleButton(e, dev, code) {
        var ignore = [
            'ButtonRequest_ConfirmWord',
            'ButtonRequest_FirmwareCheck'
        ];

        if ((dev.id === $scope.device.id) &&
            (ignore.indexOf(code) < 0)) {

            promptButton(code);
        }
    }

    function promptButton(code) {
        var scope,
            modal;

        scope = angular.extend($scope.$new(), {
            code: code
        });

        modal = $modal.open({
            templateUrl: 'views/modal/button.html',
            size: 'lg',
            windowClass: 'buttonmodal',
            backdrop: 'static',
            keyboard: false,
            scope: scope
        });
        modal.opened.then(function () {
            scope.$emit('modal.button.show', code);
        });
        modal.result.finally(function () {
            scope.$emit('modal.button.hide');
        });

        $scope.device.once(TrezorDevice.EVENT_RECEIVE, function () {
            modal.close();
        });
        $scope.device.once(TrezorDevice.EVENT_ERROR, function () {
            modal.close();
        });
    }
});
