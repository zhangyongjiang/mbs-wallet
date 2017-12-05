/*global angular*/

angular.module('webwalletApp').factory('TrezorDevice', function (
    _,
    $q,
    config,
    utils,
    TrezorAccount,
    $rootScope,
    $translate,
    $log,
    BigInteger) {

    'use strict';

    function TrezorDevice(desc) {
        this.id = desc.id || null;
        this.path = desc.path || null;
        this.accounts = [];
        this.features = null;
        this.error = null;
        this.forgetOnDisconnect = null;

        this._passphrase = null;
        this._session = null;
        this._desc = null;
        this._statusLabel = null;
        this._loadingLevel = 0;
        
        this._language = this.DEFAULT_LANGUAGE;
        if ($rootScope.language) {
    	    this._language = $rootScope.language;
        }
        $rootScope.$watch('language',function(){
    	    this._language = $rootScope.language;
    	    if (this._session) {
    	    	this._session.setLanguage(this._language);
    	    }
        }.bind(this));
    }

    TrezorDevice.prototype.DEFAULT_LABEL = 'My BWallet';
    TrezorDevice.prototype.DEFAULT_LANGUAGE = 'english';
    TrezorDevice.prototype.LABEL_MAX_LENGTH = 16;

    TrezorDevice.EVENT_PIN = 'pin';
    TrezorDevice.EVENT_BUTTON = 'button';
    TrezorDevice.EVENT_PASSPHRASE = 'passphrase';
    TrezorDevice.EVENT_WORD = 'word';
    TrezorDevice.EVENT_SEND = 'send';
    TrezorDevice.EVENT_ERROR = 'error';
    TrezorDevice.EVENT_RECEIVE = 'receive';

    TrezorDevice.EVENT_CONNECT = 'connect';
    TrezorDevice.EVENT_DISCONNECT = 'disconnect';

    TrezorDevice.EVENT_PREFIX = 'device.';
    TrezorDevice.EVENT_TYPES = [
        TrezorDevice.EVENT_PIN,
        TrezorDevice.EVENT_PASSPHRASE,
        TrezorDevice.EVENT_BUTTON,
        TrezorDevice.EVENT_WORD,
        TrezorDevice.EVENT_SEND,
        TrezorDevice.EVENT_ERROR,
        TrezorDevice.EVENT_RECEIVE
    ];

    TrezorDevice.REQ_BUTTON_FIRMWARE = 'ButtonRequest_FirmwareCheck';

    /**
     * Disconnect the device and unsubscribe from account updates from the
     * server backend.
     */
    TrezorDevice.prototype.destroy = function () {
        this.disconnect();
        this.unsubscribe();
    };

    TrezorDevice.deserialize = function (data) {
        var dev = new TrezorDevice(data);

        dev._passphrase = data.passphrase;
        dev.features = data.features;
        dev.accounts = data.accounts.map(function (item) {
            return TrezorAccount.deserialize(item);
        });
        dev.forgetOnDisconnect = data.forgetOnDisconnect;

        return dev;
    };

    TrezorDevice.prototype.serialize = function () {
        return {
            id: this.id,
            path: this.path,
            passphrase: this._passphrase,
            features: this.features,
            accounts: this.accounts.map(function (acc) {
                return acc.serialize();
            }),
            forgetOnDisconnect: this.forgetOnDisconnect
        };
    };

    //
    // Status & features
    //

    TrezorDevice.prototype.isLoading = function () {
        return !!this._loadingLevel;
    };

    TrezorDevice.prototype.withLoading = function (fn) {
        var self = this;

        self._loadingLevel++;
        return $q.when(fn()).finally(function () {
            self._loadingLevel--;
        });
    };

    TrezorDevice.prototype.withStatusLabel = function (label, fn) {
        var self = this,
            label0 = this._statusLabel;

        self._statusLabel = label;
        return $q.when(fn()).finally(function () {
            self._statusLabel = label0;
        });
    };

    TrezorDevice.prototype.status = function () {
        if (this.isLoading()) return 'loading';
        if (this.isConnected()) return 'connected';
        return 'disconnected';
    };

    TrezorDevice.prototype.label = function () {
        if (this.features && this.features.label)
            return this.features.label;
        else
            return this.DEFAULT_LABEL;
    };
    
    TrezorDevice.prototype.bootloaderHash = function () {
        if (this.features && this.features.bootloader_hash)
            return this.features.bootloader_hash;
        else
            return '';
    };

    TrezorDevice.prototype.statusLabel = function () {
        return this._statusLabel;
    };

    TrezorDevice.prototype.balance = function () {
        return this.accounts.reduce(function (bal, acc) {
            return bal.add(acc.balance || BigInteger.ZERO);
        }, BigInteger.ZERO);
    };

    TrezorDevice.prototype.defaultCoin = function () {
        return _.find(this.features.coins, { coin_name: config.coin });
    };

    //
    // Passphrase
    //

    TrezorDevice.prototype.hasSavedPassphrase = function () {
        return !!this._passphrase;
    };

    TrezorDevice.prototype.checkPassphraseAndSave = function (passphrase) {
        var hash = this._hashPassphrase(passphrase);

        if (this._passphrase)
            return this._passphrase === hash;
        else {
            this._passphrase = hash;
            return true;
        }
    };

    TrezorDevice.prototype._hashPassphrase = function (passphrase) {
        var secret = 'TREZOR#' + this.id + '#' + passphrase;
        return utils.sha256x2(secret);
    };

    //
    // HW connections
    //

    TrezorDevice.prototype.isConnected = function () {
        return !!this._session;
    };

    TrezorDevice.prototype.connect = function (session) {
        this._session = session;
        this._session.setLanguage(this._language);
        this.on = this._session.on.bind(this._session);
        this.once = this._session.once.bind(this._session);
        this.removeListener = this._session.removeListener.bind(this._session);
    };

    TrezorDevice.prototype.disconnect = function () {
        if (this._session)
            this._session.release();
        this._session = null;
    };

    //
    // HW initialization
    //

    TrezorDevice.prototype.isEmpty = function () {
        return !this.features || !this.features.initialized;
    };

    TrezorDevice.prototype.initializeDevice = function () {
        var self = this,
            delay = 3000, // delay between attempts
            max = 60; // give up after n attempts

        // keep trying to initialize
        return utils.endure(callInitialize, delay, max)
            .then(
                function (res) {
                    return (self.features = res.message);
                },
                function (err) {
                    self.features = null;
                    throw err;
                }
            );

        function callInitialize() {
            if (!self.isConnected()) // return falsey to cancel endure()
                return false;

            // language option for bootloader mode
            return self._session.initialize($rootScope.language).then(
                function (res) {
                    var features = res.message;
                    if (features.bootloader_mode) {
                        self.id = self.path;
                    } else {
                        self.id = features.device_id;
                    }
                    self.error = null;
                    return res;
                },
                function (err) {
                    self.error = err.message || 'Failed to initialize the device.';
                    throw err;
                }
            );
        }
    };

    TrezorDevice.prototype.initializeAccounts = function () {
        var self = this, 
            coin = this.defaultCoin();

        // reset accounts if the device is empty, make sure to deregister
        // existing accounts first
        if (this.isEmpty())
            return this.unsubscribe().then(function () {
                return (self.accounts = []);
            });

        // if the device is not empty and no accounts are present, add the first
        // account and start the account discovery
        if (!this.accounts.length)
            return this.addAccount().then(function () {
                return self.discoverAccounts();
            });

        this.accounts.forEach(function(acc, idx) {
            self._session.getAccountLabels(coin, true, 1).then(function(res) {
                var label = _.find(res.message.labels, { index: (+idx + 1) });
                if (label != null) {
                    acc.setLabelInDevice(label.label);
                }
                return acc;
            }, function(err) {
                $log.warn('[device] AccountLabels unsupported', self.features);
                return acc;
            });
        });

        return $q.when(this.accounts);
    };

    //
    // Account management
    //

    TrezorDevice.prototype.subscribe = function () {
        return $q.all(this.accounts.map(function (acc) {
            return acc.subscribe();
        }));
    };

    /**
     * Initialize the device -- subscribe to account updates from the
     * server backend.
     */
    TrezorDevice.prototype.init = TrezorDevice.prototype.subscribe;

    TrezorDevice.prototype.unsubscribe = function () {
        return $q.all(this.accounts.map(function (acc) {
            return acc.unsubscribe();
        }));
    };

    TrezorDevice.prototype.account = function (id) {
        return _.find(this.accounts, { id: id });
    };

    /**
     * Get the default account
     *
     * That is currently the first device.
     */
    TrezorDevice.prototype.getDefaultAccount = function () {
        return this.accounts[0];
    };

    TrezorDevice.prototype.accountPath = function (id, coin) {
        if (config.useBip44) {
            return [
                (44 | 0x80000000) >>> 0, // purpose 44' (BIP-0044)
                (config.indices[coin.coin_name] | 0x80000000) >>> 0, // coin_type
                (id | 0x80000000) >>> 0 // account'
            ];
        } else {
            return [
                config.indices[coin.coin_name], // cointype
                (0 | 0x80000000) >>> 0, // reserved'
                (id | 0x80000000) >>> 0 // account'
            ];
        }
    };

    // Account adding

    TrezorDevice.prototype.canAddAccount = function () {
        var lastAcc = this.accounts[this.accounts.length-1];

        return this.isConnected() // hw is available
            && !this.isEmpty() // hw is not empty
            && (!lastAcc || !lastAcc.isEmpty()); // last account is not empty
    };

    TrezorDevice.prototype.addAccount = function () {
        var self = this;

        if (!this.canAddAccount())
            return $q.reject(new Error('Cannot add any more accounts'));

        return this._createAccount(this.accounts.length).then(function (acc) {
            self.accounts.push(acc);
            acc.subscribe();
            return acc;
        });
    };

    // Account hiding

    TrezorDevice.prototype.canHideAccount = function (acc) {
        var lastAcc = this.accounts[this.accounts.length-1];

        return acc.isEmpty() // is empty
            && acc.id === lastAcc.id // is the last
            && this.accounts.length > 1; // is not the only one
    };

    TrezorDevice.prototype.hideAccount = function (acc) {
        if (!this.canHideAccount(acc))
            throw new Error($translate.instant('js.services.TrezorDevice.cannot-hide-account'));

        return _.remove(this.accounts, { id: acc.id });
    };

    // Account discovery

    TrezorDevice.prototype.discoverAccounts = function () {
        var self = this,
            start = this.accounts.length;

        return discoverAccount(start).then(function () {
            return self.accounts;
        });

        function discoverAccount(n) {
            return self._createAccount(n).then(function (acc) {
                return acc.subscribe().then(function () {
                    // stop the discovery if empty
                    if (acc.isEmpty())
                        return acc.unsubscribe();

                    // add to list and continue
                    self.accounts.push(acc);
                    return discoverAccount(n + 1);
                });
            });
        }
    };

    TrezorDevice.prototype._createAccount = function (id) {
        var self = this,
            coin = this.defaultCoin(),
            accPath = this.accountPath(id, coin),
            vfSuffix = [0],
            vfPath = accPath.concat(vfSuffix),
            // device always responds with Bitcoin version
            version = config.versions.Bitcoin;

        return this._session.getPublicKey(accPath).then(function (res) {
            var accNode = res.message.node,
                compAccXpub = utils.node2xpub(accNode, version),
                accXpub = accNode.xpub || compAccXpub;

            if (accXpub !== compAccXpub)
                throw new Error('Invalid public key transmission detected - ' +
                                'invalid xpub check. ' +
                                'Key: ' + accXpub + ', ' +
                                'Received: ' + accNode.xpub);

            return self._session.getPublicKey(vfPath).then(function (res) {
                var vfNode = res.message.node,
                    compVfNode = derivePath(accNode, vfSuffix),
                    vfXpub = utils.node2xpub(vfNode, version),
                    compVfXpub = utils.node2xpub(compVfNode, version);

                if (vfXpub !== compVfXpub)
                    throw new Error('Invalid public key transmission detected - ' +
                                    'invalid child cross-check. ' +
                                    'Key: ' + accXpub + ', ' +
                                    'Computed: ' + compVfXpub + ', ' +
                                    'Received: ' + vfXpub);
                var account = new TrezorAccount(id, coin, accNode);
                return account;
            }).then(function(acc) {
                return self._session.getAccountLabels(coin, true, 1).then(function(res) {
                    var label = _.find(res.message.labels, { index: (+id + 1) });
                    if (label != null) {
                        acc.setLabelInDevice(label.label);
                    }
                    return acc;
                }, function(err) {
                    $log.warn('[device] AccountLabels unsupported', self.features);
                    return acc;
                });
            });
        });

        function derivePath(node, path) {
            return path.reduce(function (n, i) {
                return utils.deriveChildNode(n, i);
            }, node);
        }
    };

    //
    // Device calls
    //

    TrezorDevice.prototype.measureTx = function (tx, coin) {
        return this._session.measureTx(tx.inputs, tx.outputs, coin);
    };

    TrezorDevice.prototype.signTx = function (tx, refTxs, coin) {
        return this._session.signTx(tx.inputs, tx.outputs, refTxs, coin);
    };

    TrezorDevice.prototype.signMessage = function (address_n, message, coin) {
        return this._session.signMessage(address_n, message, coin);
    };

    TrezorDevice.prototype.verifyMessage = function (address, signature, message) {
        return this._session.verifyMessage(address, signature, message);
    };

    TrezorDevice.prototype.flash = function (firmware) {
        var self = this;

        return self._session.eraseFirmware().then(function () {
            return self._session.uploadFirmware(firmware);
        });
    };

    TrezorDevice.prototype.wipe = function () {
        var self = this;

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () { return self._session.wipeDevice(); })
                .then(function () { return self.unsubscribe(); });
        });
    };

    TrezorDevice.prototype.reset = function (settings) {
        var self = this,
            sett = angular.copy(settings);

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () { return self._session.resetDevice(sett); })
                .then(function () { return self.initializeDevice(); })
                .then(function () { return self.initializeAccounts(); });
        });
    };

    TrezorDevice.prototype.load = function (settings) {
        var self = this,
            sett = angular.copy(settings);

        try { // try to decode as xprv
            sett.node = utils.xprv2node(sett.payload);
        } catch (e) { // use as mnemonic on fail
            sett.mnemonic = sett.payload;
        }
        delete sett.payload;

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () { return self._session.loadDevice(sett); })
                .then(function () { return self.initializeDevice(); })
                .then(function () { return self.initializeAccounts(); });
        });
    };

    TrezorDevice.prototype.recover = function (settings) {
        var self = this,
            sett = angular.copy(settings);

        sett.enforce_wordlist = true;

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () { return self._session.recoverDevice(sett); })
                .then(function () { return self.initializeDevice(); })
                .then(function () { return self.initializeAccounts(); });
        });
    };

    TrezorDevice.prototype.changeLabel = function (label) {
        var self = this;

        if (label.length > this.LABEL_MAX_LENGTH) {
            label = label.slice(0, this.LABEL_MAX_LENGTH);
        }

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () {
                    return self._session.applySettings({ label: label });
                })
                .then(function () { return self.initializeDevice(); });
        });
    };

	TrezorDevice.prototype.applySettings = function (settings) {
        var self = this;

        if (settings.label.length > this.LABEL_MAX_LENGTH) {
            settings.label = settings.label.slice(0, this.LABEL_MAX_LENGTH);
        }

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () {
                    return self._session.applySettings(settings);
                })
                .then(function () { return self.initializeDevice(); });
        });
    };

    TrezorDevice.prototype.changePin = function () {
        var self = this;

        return self.withLoading(function () {
            return self._session.initialize()
                .then(function () { return self._session.changePin(); })
                .then(function () { return self.initializeDevice(); });
        });
    };

    TrezorDevice.prototype.ratePin = function (pin) {
        var digits, strength;

        if (pin.length > 9)
            return 0;

        digits = _.uniq(pin.split('')).length;
        strength  = fac(9) / fac(9 - digits);

        return strength;

        function fac(n) {
            var i, nf = 1;
            for (i = 2; i <= n; i++) nf *= i;
            return nf;
        }
    };

    return TrezorDevice;

});
