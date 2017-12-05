/*global angular*/

angular.module('webwalletApp').factory('mockDevice', function (
    $q) {

    'use strict';

    /**
     * Mock Device
     *
     * Replace dangerous methods on a TrezorDevice object with safe
     * alternatives that only pretend that they are doing something.
     *
     * This method currently replaces following TrezorDevice methods:
     *
     * - `TrezorDevice#wipe()`
     *
     * @param {TrezorDevice} device  Device object
     * @return {TrezorDevice}        Device with dangerous methods replaced
     */
    function mockDevice(device) {
        device.wipe = function () {
            device.disconnect();
            return $q.when(true);
        };

        return device;
    }

    return mockDevice;

});
