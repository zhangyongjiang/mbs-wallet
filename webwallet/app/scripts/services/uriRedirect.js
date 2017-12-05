/*global angular*/

/**
 * URI Redirect Service
 *
 * Parse a Bitcoin URI that was passed as an HTTP GET param and then
 * redirect to the Account Send Controller.
 *
 * Bitcoin URI simple format (unknown fields are ignored):
 *
 * `bitcoin:<address>[?amount=<amount>][?label=<label>][?message=<message>]`
 *
 * Bitcoin URI example:
 *
 * `bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W?amount=50&label=Luke-Jr&message=Donation%20for%20project%20xyz`
 *
 * App URI example (this is how the URI handler calls our app):
 * `http://localhost.mytrezor.com/#/send/bitcoin:175tWpb8K1S7NmH4Zx6rewF9WQrcZv245W%3Famount=50&label=Luke-Jr&message=Donation%2520for%2520project%2520xyz`
 *
 * @see app.js#registerUriHandler()
 */
angular.module('webwalletApp').factory('uriRedirect', function (
    deviceList,
    $route,
    $location) {

    'use strict';

    var PATH_SEND_PATTERN = [
        '/device/',
        null,
        '/account/',
        null,
        '/send/',
        null
    ],
        PATH_SEND_PATTERN_AMOUNT = [
            '/amount/',
            null
        ],
        device,
        account,
        parsedUri,
        redirectUri;

    /**
     * Parse Bitcoin URI
     *
     * Extract address, amount, label, message, etc. from the URI.
     *
     * Example output:
     *
     * Object {
     *     address: "175twpb8k1s7nmh4zx6rewf9wqrczv245w",
     *     amount: "50",
     *     label: "Luke-Jr",
     *     message: "Donation for project xyz",
     *     params: Object {
     *         amount: "50",
     *         label: "Luke-Jr",
     *         message: "Donation for project xyz",
     *     }
     * }
     *
     * @param {String} uri  Bitcoin URI
     * @returns {Dict}  Parsed URI
     */
    function parseUri(uri) {
        var params = {},
            uri_parsed = uri.match(/bitcoin:(\w+)\??(.*)/),
            raw_address,
            raw_params_str,
            raw_params_list;

        if (!uri_parsed) {
            throw new Error('Invalid bitcoin URI');
        }
        raw_address = uri_parsed[1];
        raw_params_str = uri_parsed[2];
        if (raw_params_str) {
            if (raw_params_str.indexOf('&')) {
                raw_params_list = raw_params_str.split('&');
            } else {
                raw_params_list = [raw_params_str];
            }
            raw_params_list.forEach(function (raw_param) {
                var raw_param_key_value;
                if (!raw_param.indexOf('=')) {
                    return;
                }
                raw_param_key_value = raw_param.split('=');
                params[raw_param_key_value[0]] = decodeURI(raw_param_key_value[1]);
            });
        }
        return {
            address: raw_address,
            amount: parseFloat(params.amount) || null,
            label: params.label || null,
            message: params.message || null,
            params: params || null
        };
    }

    // Get default device and default account.
    device = deviceList.getDefault();
    if (!device) {
        console.warn('[uri] Failed to find default device.  No redirect to Send will be made.');
        $location.path('/');
        return;
    }
    account = device.getDefaultAccount();
    if (!account) {
        console.warn('[uri] Failed to find default account.  No redirect to Send will be made.');
        $location.path('/');
        return;
    }

    // Parse Bitcoin URI.
    parsedUri = parseUri($route.current.params.uri);

    // Create path to redirect to.
    PATH_SEND_PATTERN[1] = device.id;
    PATH_SEND_PATTERN[3] = account.id;
    PATH_SEND_PATTERN[5] = parsedUri.address;
    redirectUri = PATH_SEND_PATTERN.join('');
    if (parsedUri.amount) {
        PATH_SEND_PATTERN_AMOUNT[1] = parsedUri.amount;
        redirectUri = redirectUri + PATH_SEND_PATTERN_AMOUNT.join('');
    }

    // Redirect.
    console.log('[uri] redirecting to ' + redirectUri);
    $location.path(redirectUri).replace();
});
