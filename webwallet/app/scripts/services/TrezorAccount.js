/*global angular*/

angular.module('webwalletApp').factory('TrezorAccount', function (
    config,
    utils,
    TrezorBackend,
    _,
    BigInteger,
    Bitcoin,
    $log,
    $q,
    $translate,
    $rootScope) {

    'use strict';

    function TrezorAccount(id, coin, node) {
        this.id = ''+id;
        this.coin = coin;
        this.node = node;
        this.utxos = null;
        this.balance = null;
        this.transactions = null;

        this._deferred = null;
        this._wallet = new Bitcoin.Wallet(coin.address_type);
        this._backend = TrezorBackend.singleton(coin);
        this._externalNode = utils.deriveChildNode(this.node, 0);
        this._changeNode = utils.deriveChildNode(this.node, 1);
        
        this._labelInDevice = null;
        // label translate
        this._label = createLabel('Account', this.id);
        var self = this;
        $translate('common.account').then(function (translation) {
            var prefix = translation;
            if (self._labelInDevice != null)
                prefix = self._labelInDevice;
            self._label = createLabel(prefix, self.id);
        });
        $rootScope.$on('$translateChangeSuccess', function () {
            $translate('common.account').then(function (translation) {
                var prefix = translation;
                if (self._labelInDevice != null)
                    prefix = self._labelInDevice;
                self._label = createLabel(prefix, self.id);
            });
        });
    }

    function createLabel(prefix, id) {
        return prefix + ' #' + (+id + 1);
    }

    TrezorAccount.deserialize = function (data) {
        var acc = new TrezorAccount(
            data.id,
            data.coin,
            data.node
        );
        acc.setLabelInDevice(data.labelInDevice);
        return acc;
    };

    TrezorAccount.prototype.setLabelInDevice = function (labelInDevice) {
        this._labelInDevice = labelInDevice;
        this._label = createLabel(this._labelInDevice, this.id);
        $log.log(this._label);
    };

    TrezorAccount.prototype.serialize = function () {
        return {
            id: this.id,
            coin: this.coin,
            node: this.node,
            labelInDevice: this._labelInDevice
        };
    };

    TrezorAccount.prototype.isOffline = function () {
        return !this._backend.isConnected();
    };

    TrezorAccount.prototype.isEmpty = function () {
        return !this.transactions || !this.transactions.length;
    };

    TrezorAccount.prototype.isInconsistent = function () {
        return !this.isEmpty() // is not empty
            && this.transactions // has txs loaded
            && this.balance // has balance loaded
        // balance of newest tx does not equal balance from server
            && (!this.transactions[0].balance ||
                !this.transactions[0].balance.equals(this.balance));
    };

    TrezorAccount.prototype.label = function () {
        return this._label;
    };

    TrezorAccount.prototype.address = function (n) {
        var index = (this._externalNode.offset || 0) + n,
            addressNode = utils.deriveChildNode(this._externalNode, index),
            address = utils.node2address(addressNode, this.coin.address_type);

        return {
            path: addressNode.path,
            address: address,
            index: index
        };
    };

    TrezorAccount.prototype.publicKey = function () {
        return utils.node2xpub(this.node, config.versions[this.coin.coin_name]);
    };

    /**
     * Get all used addresses on this account
     *
     * TODO Rewrite this completely when we get rid of Bitcoin.Transaction.
     *
     * TODO Consider taking utxos directly from the tx by looking
     * up in the wallet, instead of loading from the balance.
     *
     * @return {Array}  Addresses in format
     *                    [{
     *                      path: Array,
     *                      address: String,
     *                      timestamp: String,
     *                      balance: BigNumber,
     *                      tx: Object
     *                    }]
     */
    TrezorAccount.prototype.usedAddresses = function () {
        var self = this,
            ret = [];

        if (!self.transactions) {
            return ret;
        }

        // zip with summed matching utxos
        self.transactions.forEach(function (tx) {
            // credit outputs
            if (tx.analysis.type === 'recv') {

                self.getTxOuts(tx).map(function (out) {
                    var utxos,
                        balance;

                    utxos = (self.utxos || []).filter(function (utxo) {
                        return utxo.transactionHash === tx.hash && utxo.ix === out.ix;
                    });

                    balance = utxos.reduce(function (bal, utxo) {
                        return bal.add(new BigInteger(
                            utxo.value.toString()
                        ));
                    }, BigInteger.ZERO);

                    ret.push({
                        path: out.path,
                        address: out.address,
                        timestamp: tx.timestamp,
                        balance: balance,
                        tx: tx
                    });
                });
            }
        });

        // sort by address
        ret = ret.sort(function (a, b) {
            if (a.address > b.address) return 1;
            if (a.address < b.address) return -1;
            return 0;
        });

        // aggregate by address, sum balances
        ret = ret.reduce(function (xs, x) {
            var prev = xs[xs.length - 1];
            if (prev && prev.address === x.address)
                prev.balance = prev.balance.add(x.balance);
            else
                xs.push(x);
            return xs;
        }, []);

        // sort by timestamp in reverse
        ret = ret.sort(function (a, b) {
            if (a.timestamp > b.timestamp) return -1;
            if (a.timestamp < b.timestamp) return 1;
            return 0;
        });

        return ret;
    };

    /**
     * Get all used addresses on this account.
     *
     * @return {Array}  Addresses in the same format as #usedAddresses(), sans tx info
     */
    TrezorAccount.prototype.unusedAddresses = function (n) {
        var i,
            adresses = [];
        for (i = 0; i < n; i++) {
            adresses.push(this.address(i));
        }
        return adresses;
    };

    /**
     * Get address path of the first output of passed transaction
     *
     * @param {Object} tx    Bitcoin.js transaction object
     * @return {Array|null}  Address path
     */
    TrezorAccount.prototype.getOutPath = function (tx) {
        var i,
            len = tx.outs.length;

        for (i = 0; i < len; i = i + 1) {
            if (tx.outs[i].path) {
                return tx.outs[i].path;
            }
        }

        return null;
    };

    /**
     * Get all transaction outputs (their paths and addresses).
     *
     * @param {Object} tx  Bitcoin.js transaction object
     * @return {Array}     Outputs in format
     *                       [{
     *                         path: Array,
     *                         address: String,
     *                         amount: BigNumber,
     *                         ix: Number
     *                       }]
     */
    TrezorAccount.prototype.getTxOuts = function (tx) {
        var i,
            len,
            out,
            addrType,
            addrHash,
            ret = [];

        len = tx.outs.length;
        for (i = 0; i < len; i = i + 1) {
            out = tx.outs[i];
            if (!out.path) {
                continue;
            }
            try {
                switch (out.script.getOutType()) {
                case 'Scripthash':
                    addrType = this._wallet.scriptHashVersion;
                    break;
                default:
                    addrType = this._wallet.addressVersion;
                }
                addrHash = utils.address2str(
                    out.script.simpleOutHash(),
                    addrType
                );
                ret.push({
                    path: out.path,
                    address: addrHash,
                    amount: out.value,
                    ix: out.index
                });
            } catch (e) {
                continue;
            }
        }

        return ret;
    };

    //
    // Tx sending
    //

    TrezorAccount.prototype.sendTx = function (tx, device) {
        // TODO: take Bitcoin.Transaction as an input

        var self = this,
            uins, txs;

        // find unique inputs by tx hash
        uins = _.uniq(tx.inputs, 'prev_hash');

        // lookup txs referenced by inputs
        txs = uins.map(function (inp) {
            return self._backend.transaction(self.node, inp.prev_hash);
        });

        // convert to trezor structures
        txs = $q.all(txs).then(function (txs) {
            return txs.map(function (tx) {
                return {
                    hash: tx.hash,
                    version: tx.version,
                    inputs: tx.inputs.map(function (inp) {
                        return {
                            prev_hash: inp.sourceHash,
                            prev_index: inp.ix >>> 0, // can be -1 in coinbase
                            sequence: inp.sequence >>> 0, // usually -1, 0 in coinbase
                            script_sig: utils.bytesToHex(utils.base64ToBytes(inp.script))
                        };
                    }),
                    bin_outputs: tx.outputs.map(function (out) {
                        return {
                            amount: out.value,
                            script_pubkey: utils.bytesToHex(utils.base64ToBytes(out.script))
                        };
                    }),
                    lock_time: tx.lockTime
                };
            });
        });

        // sign by device
        return txs.then(function (txs) {
            return device.signTx(tx, txs, self.coin).then(function (res) {
                var message = res.message,
                    serializedTx = message.serialized.serialized_tx,
                    parsedTx = self._serializedToTx(serializedTx),
                    txBytes,
                    txHash,
                    publicMaster = self.publicKey();

                if (!parsedTx)
                    throw new Error($translate.instant('js.services.TrezorAccount.parse-transaction-failed'));

                if (!self._verifyTx(tx, parsedTx))
                    throw new Error($translate.instant('js.services.TrezorAccount.verify-transaction-failed'));

                txBytes = utils.hexToBytes(serializedTx);
                txHash = utils.sha256x2(txBytes, { asBytes: true });

                return self._backend.send(txBytes, txHash, publicMaster).then(function () {
                    return {
                        bytes: txBytes,
                        hash: txHash
                    };
                }, function (err) {
                	var errorMessage;
                	if (err.data && err.data.message)
                		errorMessage = err.data.message;
                	else 
                		errorMessage = $translate.instant('js.services.TrezorAccount.send-transaction-failed') + JSON.stringify(err) + '`.';
                    throw new TrezorAccountException({
                        message: errorMessage,
                        bytes: txBytes
                    });
                });
            });
        });
    };

    TrezorAccount.prototype._serializedToTx = function (tx) {
        try {
            return Bitcoin.Transaction.deserialize(tx);
        } catch (e) {
            $log.error('Failed to deserialize tx:', e);
            return null;
        }
    };

    TrezorAccount.prototype._verifyTx = function (myTx, trezorTx) {
        return this._verifyTxSize(myTx, trezorTx) // 1. check # of inputs and outputs
            && this._verifyTxAmounts(myTx, trezorTx) // 2. check output amounts
            && this._verifyTxScripts(myTx, trezorTx); // 3. check output scripts
    };

    TrezorAccount.prototype._verifyTxSize = function (myTx, trezorTx) {
        return (myTx.inputs.length === trezorTx.ins.length)
            && (myTx.outputs.length === trezorTx.outs.length);
    };

    TrezorAccount.prototype._verifyTxAmounts = function (myTx, trezorTx) {
        var outputs = _.zip(myTx.outputs, trezorTx.outs);

        return _.every(outputs, function (outs) {
            var o0bn = new BigInteger(outs[0].amount.toString()),
                o1bn = Bitcoin.Util.valueToBigInt(outs[1].value);

            return o0bn.equals(o1bn);
        });
    };

    TrezorAccount.prototype._verifyTxScripts = function (myTx, trezorTx) {
        var self = this,
            outputs = _.zip(myTx.outputs, trezorTx.outs);

        return _.every(outputs, function (outs) {
            var s0 = utils.bytesToHex(computeScript(outs[0])),
                s1 = utils.bytesToHex(outs[1].script.buffer);

            return s0 === s1;
        });

        function computeScript(out) {
            var hash = computePubKeyHash(out);

            switch (out.script_type) {
            case 'PAYTOADDRESS':
                return [
                    0x76, // OP_DUP
                    0xA9, // OP_HASH_160
                    0x14  // push 20 bytes
                ].concat(hash)
                    .concat([
                        0x88, // OP_EQUALVERIFY
                        0xAC  // OP_CHECKSIG
                    ]);

            case 'PAYTOSCRIPTHASH':
                return [
                    0xA9, // OP_HASH_160
                    0x14  // push 20 bytes
                ].concat(hash)
                    .concat([
                        0x87 // OP_EQUAL
                    ]);

            default:
                throw new Error('Unknown script type: ' + out.script_type);
            }
        }

        function computePubKeyHash(out) {
            var address = out.address,
                address_n = out.address_n,
                nodes = [self._externalNode, self._changeNode],
                node, nodeIx, addressIx;

            if (!address) {
                nodeIx = address_n[address_n.length - 2];
                addressIx = address_n[address_n.length - 1];
                node = utils.deriveChildNode(nodes[nodeIx], addressIx);
                address = utils.node2address(node, self.coin.address_type);
            }

            return utils.decodeAddress(address).hash;
        }
    };

    var MIN_OUTPUT_AMOUNT = 5340;

    var TxOutputException = function (message, field) {
        this.message = message;
        this.field = field;
        this.toString = function () {
            return this.field + ': ' + this.message;
        };
    };

    TrezorAccount.prototype.FIELD_AMOUNT = 'amount';

    TrezorAccount.prototype.FIELD_ADDRESS = 'address';

    TrezorAccount.prototype.buildTxOutput = function (address, amount) {
        var addrType = this.coin.address_type,
            scriptTypes = config.scriptTypes[this.coin.coin_name],
            scriptType,
            addrVals;

        if (amount < MIN_OUTPUT_AMOUNT)
            throw new TxOutputException($translate.instant('js.services.TrezorAccount.amount-too-low'), this.FIELD_AMOUNT);

        addrVals = utils.decodeAddress(address);
        if (!addrVals)
            throw new TxOutputException($translate.instant('js.services.TrezorAccount.invalid-address'), this.FIELD_ADDRESS);

        if (addrVals.version === +addrType)
            scriptType = 'PAYTOADDRESS';
        if (!scriptType && scriptTypes && scriptTypes[addrVals.version])
            scriptType = scriptTypes[addrVals.version];
        if (!scriptType)
            throw new TxOutputException($translate.instant('js.services.TrezorAccount.invalid-address-version'),
                                        this.FIELD_ADDRESS);

        return {
            script_type: scriptType,
            address: address,
            amount: amount
        };
    };

    TrezorAccount.prototype.buildTx = function (outputs) {
        var self = this;

        return $q.when(tryToBuild(0));

        function tryToBuild(feeAttempt) {
            var tx = self._constructTx(outputs, feeAttempt);

            if (!tx)
                return $q.reject(new Error('Not enough funds'));

            var kbytes = Math.ceil(self._measureTx(tx) / 1000),
                space = tx.inputSum - tx.outputSum,
                fee = kbytes * config.feePerKb;

            $log.log('[account] Measured tx of', kbytes, 'KB, est. fee is', fee);

            if (fee > space) {
                $log.log('[account] Fee is too high for current inputs, measuring again');
                return tryToBuild(fee); // try again with more inputs
            }
            if (fee === tx.fee) {
                $log.log('[account] Estimated fee matches');
                return tx;
            }
            $log.log('[account] Re-constructing with final fee');
            return self._constructTx(outputs, fee);
        }
    };

    TrezorAccount.prototype._measureTx = function (tx) {
        return 10
            + tx.inputs.length * 149
            + tx.outputs.length * 35;
    };

    TrezorAccount.prototype._constructTx = function (outputs, fee)  {
        var chindex = (this._changeNode.offset || 0),
            chpath = this._changeNode.path.concat([chindex]),
            utxos,
            change,
            inputSum,
            outputSum;

        $log.log('[account] Constructing tx with fee attempt', fee, 'for', outputs);

        outputSum = outputs.reduce(function (a, out) { return a + out.amount; }, 0);
        utxos = this._selectUtxos(outputSum + fee);
        if (!utxos)
            return null;
        inputSum = utxos.reduce(function (a, utxo) { return a + utxo.value; }, 0);

        change = inputSum - outputSum - fee;
        if (change >= MIN_OUTPUT_AMOUNT) {
            outputs = outputs.concat([{ // cannot modify
                script_type: 'PAYTOADDRESS',
                address_n: chpath,
                amount: change
            }]);
            $log.log('[account] Added change output', outputs[outputs.length - 1]);
        } else {
            change = 0;
            fee = inputSum - outputSum;
            $log.log('[account] Change amount', change,
                     'is below dust limit', MIN_OUTPUT_AMOUNT,
                     ', adding to fee');
            $log.log('[account] New fee:', fee);
        }

        // TODO: shuffle before signing, not here?
        outputs = _.sortBy(outputs, function (out) {
            return -out.amount;
        });

        return {
            fee: fee,
            change: change,
            inputSum: inputSum,
            outputSum: outputSum,
            outputs: outputs,
            inputs: utxos.map(function (utxo) {
                return {
                    prev_hash: utxo.transactionHash,
                    prev_index: utxo.ix,
                    address_n: utxo.path
                };
            })
        };
    };

    // selects utxos for a tx
    // sorted by block # asc, value asc
    TrezorAccount.prototype._selectUtxos = function (amount) {
        var self = this,
            utxos = this.utxos.slice(),
            ret = [],
            retval = 0,
            i;

        utxos = utxos.filter(function (out) {
            var txHash =
                    '3c7bcbec143f28b405b53fd12be9a888a9072c09ca8cf10260027dec689862b5';
            return !(out.transactionHash === txHash && out.ix === 0);
        });

        // sort utxos (by block, by value, unconfirmed last)
        utxos = utxos.sort(function (a, b) {
            var txa = self._wallet.txIndex[a.transactionHash],
                txb = self._wallet.txIndex[b.transactionHash],
                hd = txa.block - txb.block, // order by block
                vd = a.value - b.value; // order by value
            if (txa.block == null && txb.block != null) hd = +1;
            if (txa.block != null && txb.block == null) hd = -1;
            return hd !== 0 ? hd : vd;
        });

        // select utxos from start
        for (i = 0; i < utxos.length && retval < amount; i++) {
            if (utxos[i].value >= MIN_OUTPUT_AMOUNT) { // ignore dust outputs
                ret.push(utxos[i]);
                retval += utxos[i].value;
            }
        }

        if (retval >= amount)
            return ret;
    };

    //
    // Backend communication
    //

    TrezorAccount.prototype.subscribe = function () {
        var self = this;

        this._deferred = $q.defer();
        this._backend.connect().then(
            function () {
                self._backend.subscribe(
                    self.node,
                    self._processBalanceDetailsUpdate.bind(self));
            },
            function (err) {
                self._deferred.reject(err);
            }
        );

        return this._deferred.promise;
    };

    TrezorAccount.prototype.unsubscribe = function () {
        this._backend.unsubscribe(this.node);
        this._deferred = null;
        return $q.when();
    };

    TrezorAccount.prototype._processBalanceDetailsUpdate = function (details) {
        $log.log(
            '[account] Received', details.status,
            'balance update for', this.label());

        // ignore pending balance details
        if (details.status === 'PENDING')
            return;

        // update the utxos and balance
        this.utxos = this._constructUtxos(details, this.node.path);
        this.balance = this._constructBalance(details);

        // load transactions
        this.transactions = null;
        this._backend.transactions(this.node).then(
            this._processTransactionsUpdate.bind(this));
    };

    TrezorAccount.prototype._processTransactionsUpdate = function (txs) {
        $log.log('[account] Received txs update for', this.label());

        // update the transactions, add them into the wallet
        this.transactions = this._constructTransactions(txs, this.node.path);
        this.transactions = this._indexTxs(this.transactions, this._wallet);
        this.transactions = this._analyzeTxs(this.transactions, this._wallet);
        this.transactions = this._balanceTxs(this.transactions);

        // update the address offsets
        this._incrementOffsets(this.transactions);

        // the subscription is considered initialized now
        this._deferred.resolve();
    };

    TrezorAccount.prototype._constructUtxos = function (details, basePath) {
        return ['confirmed', 'change', 'receiving']
            .map(function (k) {
                return details[k].map(function (out) {
                    out.state = k;
                    if (out.keyPathForAddress)
                        out.path = basePath.concat(out.keyPathForAddress);
                    return out;
                });
            })
            .reduce(function (xss, xs) { return xss.concat(xs); });
    };

    TrezorAccount.prototype._constructBalance = function (details) {
        return ['confirmed', 'change', 'receiving']
            .map(function (k) { return details[k]; })
            .reduce(function (xss, xs) { return xss.concat(xs); })
            .reduce(function (bal, out) {
                return bal.add(
                    new BigInteger(out.value.toString())
                );
            }, BigInteger.ZERO);
    };

    TrezorAccount.prototype._constructTransactions = function (txs, basePath) {
        return txs.map(transaction);

        function transaction(tx) {
            var ret = new Bitcoin.Transaction({
                hash: tx.hash,
                version: tx.version,
                lock_time: tx.lockTime,
                timestamp: new Date(tx.blockTime).getTime(),
                block: tx.height
            });
            ret.ins = tx.inputs.map(input);
            ret.outs = tx.outputs.map(output);
            return ret;
        }

        function input(inp) {
            return new Bitcoin.TransactionIn({
                outpoint: {
                    hash: inp.sourceHash,
                    index: inp.ix
                },
                script: inp.script,
                sequence: inp.sequence
            });
        }

        function output(out) {
            return new TrezorTransactionOut({
                script: out.script,
                value: out.value.toString(),
                index: out.ix,
                path: out.keyPathForAddress ?
                    basePath.concat(out.keyPathForAddress) :
                    null
            });
        }
    };

    TrezorAccount.prototype._indexTxs = function (txs, wallet) {
        txs.forEach(function (tx) {
            if (wallet.txIndex[tx.hash])
                return;

            // index tx by hash
            wallet.txIndex[tx.hash] = tx;

            // register sendable outputs
            tx.outs
                .filter(function (out) {return out.path;})
                .forEach(function (out) {
                    var hash = utils.bytesToBase64(out.script.simpleOutPubKeyHash()),
                        internal = out.path[out.path.length - 2] === 1;
                    wallet.addressHashes.push(hash);
                    if (internal)
                        wallet.internalAddressHashes.push(hash);
                });
        });

        return txs;
    };

    TrezorAccount.prototype._analyzeTxs = function (txs, wallet) {
        txs.forEach(function (tx) {
            if (tx.analysis)
                return;
            try {
                // compute the impact of the tx on the wallet
                tx.analysis = tx.analyze(wallet);
                // compute the signed impact value
                if (tx.analysis.impact.value)
                    tx.analysis.impact.signedValue = tx.analysis.impact.value.multiply(
                        new BigInteger(tx.analysis.impact.sign.toString()));
            } catch (e) {
                $log.error('[account] Analysis failed for tx', tx.hash, 'with:', e);
                tx.analysis = null;
            }
        });

        return txs;
    };

    TrezorAccount.prototype._balanceTxs = function (txs) {
        txs.sort(combineCmp([timestampCmp, typeCmp]));
        txs = _.uniq(txs, 'hash'); // HACK: backend returns duplicit txs
        txs.reduceRight(function (prev, curr) {
            if (!curr.analysis)
                return prev;
            curr.balance = curr.analysis.impact.signedValue.add(
                prev ? prev.balance : BigInteger.ZERO);
            return curr;
        }, null);

        return txs;

        function combineCmp(fns) {
            return function (a, b) {
                return fns.reduce(function (c, f) {
                    return c ? c : f(a, b);
                }, 0);
            };
        }

        function timestampCmp(a, b) { // compares in reverse
            var x = +a.timestamp || Number.MAX_VALUE,
                y = +b.timestamp || Number.MAX_VALUE;
            if (x > y) return -1;
            if (x < y) return 1;
            return 0;
        }

        function typeCmp(a, b) {
            var map = ['sent', 'self', 'recv'],
                x = map.indexOf(a.analysis.type),
                y = map.indexOf(b.analysis.type);
            if (x > y) return 1;
            if (x < y) return -1;
            return 0;
        }
    };

    TrezorAccount.prototype._incrementOffsets = function (txs) {
        var self = this;

        txs
            .filter(function (tx) { return !!tx.block; }) // only confirmed txs
            .forEach(function (tx) {
                tx.outs
                    .filter(function (out) { return out.path; }) // only our outputs
                    .forEach(function (out) {
                        var id = out.path[out.path.length-1],
                            branch = out.path[out.path.length-2],
                            node;

                        if (branch === 0)
                            node = self._externalNode;
                        else if (branch === 1)
                            node = self._changeNode;
                        else {
                            $log.warn('[account] Tx with unknown branch', tx);
                            return;
                        }

                        if (id >= (node.offset || 0))
                            node.offset = id + 1;
                    });
            });
    };

    // Decorator around Bitcoin.Transaction, contains tx index and BIP32 path

    function TrezorTransactionOut(data) {
        Bitcoin.TransactionOut.call(this, data);
        this.index = data.index;
        this.path = data.path;
    }

    TrezorTransactionOut.prototype = Object.create(Bitcoin.TransactionOut.prototype);

    TrezorTransactionOut.prototype.clone = function () {
        var val = Bitcoin.TransactionOut.clone.call(this);
        val.index = this.index;
        val.path = this.path;
        return val;
    };

    function TrezorAccountException(value) {
        this.value = value;
        this.message = value.message;
        this.toString = function () {
            return this.message + JSON.stringify(this.value);
        };
    }

    return TrezorAccount;

});
