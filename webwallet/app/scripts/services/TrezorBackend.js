/*global angular*/

angular.module('webwalletApp').config(function ($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
});

angular.module('webwalletApp').value('backends', {});

angular.module('webwalletApp').factory('TrezorBackend', function (
    backends,
    config,
    utils,
    $http,
    $log) {

    'use strict';

    function TrezorBackend(coin) {
        this.version = config.versions[coin.coin_name];
        this.config = config.backends[coin.coin_name] || {};
        this._clientIdP = null;
        this._stream = null;
        this._handlers = {};

        this._keepConnected();
    }

    TrezorBackend.RECONNECT_DELAY = 5000;

    TrezorBackend.singleton = function (coin) {
        if (!backends[coin.coin_name])
            backends[coin.coin_name] = new TrezorBackend(coin);
        return backends[coin.coin_name];
    };

    TrezorBackend.prototype._streamUrl = function (id) {
        if (id != null)
            return this.config.endpoint + '/lp/' + id;
        else
            return this.config.endpoint + '/lp';
    };

    TrezorBackend.prototype._apiUrl = function (path) {
        return this.config.endpoint + '/trezor/' + path;
    };

    // Stream

    TrezorBackend.prototype._keepConnected = function () {
        utils.endure(function () {
            return this.connect().then(function () {
                return this._stream;
            }.bind(this))
        }.bind(this), TrezorBackend.RECONNECT_DELAY);
    };

    TrezorBackend.prototype.isConnected = function () {
        return this._clientIdP && this._stream;
    };

    TrezorBackend.prototype.connect = function () {
        if (!this._clientIdP)
            this._openStream();
        return this._clientIdP;
    };

    TrezorBackend.prototype._openStream = function () {
        var self = this;

        // setup client ID promise
        $log.log('[backend] Requesting client ID');
        this._clientIdP = $http.post(this._streamUrl(), {}).then(function (res) {
            if (!res.data || res.data.clientId == null)
                throw new Error('Invalid client ID');
            $log.log('[backend] Client ID received');
            return res.data.clientId;
        });

        // reset if the request fails
        this._clientIdP.catch(function (err) {
            $log.error('[backed] Client ID error', err);
            self._clientIdP = null;
        });

        // listen after the stream is opened
        this._clientIdP.then(function (id) {
            self._listenOnStream(id);
        });
    };

    TrezorBackend.prototype._listenOnStream = function (id) {
        var self = this,
            url = this._streamUrl(id),
            throttle = 1000; // polling throttle in msec

        // setup long-polling loop that gets notified with messages
        $log.log('[backend] Listening on client ID', id);
        this._stream = utils.httpPoll({
            method: 'GET',
            url: url
        }, throttle);

        // reset on stream error
        this._stream.catch(function (err) {
            $log.error('[backed] Stream error', err);
            self._stream = null;
            // self._clientIdP = null;
        });

        // process received messages
        this._stream.then(null, null, function (res) {
            if (res.status !== 204 && res.data.forEach)
                res.data.forEach(self._processMessage.bind(self));
        });
    };

    TrezorBackend.prototype._processMessage = function (msg) {
        var xpub = msg.publicMaster;

        if (!this._handlers[xpub]) {
            $log.warn('[backend] Received a message for unknown xpub', xpub);
            return;
        }

        this._handlers[xpub].forEach(function (handler) {
            handler(msg);
        });
    };

    TrezorBackend.prototype.disconnect = function () {
        $log.log('[backend] Closing stream');
        if (this._stream)
            this._stream.cancel();
        this._stream = null;
        this._clientIdP = null;
    };

    TrezorBackend.prototype.subscribe = function (node, handler) {
        var self = this,
            xpub = utils.node2xpub(node, this.version),
            req = {
                publicMaster: xpub,
                after: this.config.after || '2014-01-01',
                lookAhead: this.config.lookAhead || 20,
                firstIndex: this.config.firstIndex || 0
            };

        this._handlers[xpub] = this._handlers[xpub] || [];
        this._handlers[xpub].push(handler);

        $log.log('[backend] Subscribing', xpub);
        return this.connect().then(function (id) {
            return $http.post(self._streamUrl(id), req).then(function (res) {
                self._processMessage(res.data);
            });
        });
    };

    TrezorBackend.prototype.unsubscribe = function (node) {
        var xpub = utils.node2xpub(node, this.version);
        delete this._handlers[xpub];
    };

    // POST

    TrezorBackend.prototype.send = function (txBytes, txHash, publicMaster) {
        $log.log('[backend] Sending', txBytes);
        return $http.post(this._apiUrl('send'), {
            transaction: utils.bytesToBase64(txBytes),
            transactionHash: utils.bytesToBase64(txHash),
            publicMaster: publicMaster
        });
    };

    // GET

    TrezorBackend.prototype.transactions = function (node) {
        var xpub = utils.node2xpub(node, this.version);

        $log.log('[backend] Requesting tx history for', xpub);
        return $http.get(this._apiUrl(xpub + '/transactions')).then(function (res) {
            return res.data;
        });
    };

    TrezorBackend.prototype.transaction = function (node, hash) {
        var xpub = utils.node2xpub(node, this.version);

        $log.log('[backend] Looking up tx', hash, 'for', xpub);
        return $http.get(this._apiUrl(xpub + '/transactions/' + hash)).then(function (res) {
            return res.data;
        });
    };

    return TrezorBackend;

});
