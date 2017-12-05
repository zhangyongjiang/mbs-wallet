/*global angular*/

angular.module('webwalletApp')
    .value('_', window._)
    .value('BigInteger', window.BigInteger)
    .value('Crypto', window.Crypto)
    .value('Bitcoin', window.Bitcoin)
    .value('jsSHA', window.jsSHA)
    .value('ecurve', window.ecurve)
    .value('Buffer', window.Buffer)
;

angular.module('webwalletApp').directive('debug', function () {
    return {
        restrict: 'E',
        transclude: true,
        template: '<div class="debug" ng-if="debug" ng-transclude></div>',
        controller: function (config, $scope) {
            $scope.debug = config.debug;
        }
    };
});

angular.module('webwalletApp').filter('sign', function () {
    return function (sign) {
        if (sign > 0) return '+';
        if (sign < 0) return '-';
        return '';
    };
});

angular.module('webwalletApp').filter('amount', function (utils) {
    return function (val) {
        if (val) return utils.amount2str(val);
    };
});

angular.module('webwalletApp').filter('ordinal', function () {
    return function (val) {
        var i = 'th';

        switch (+val % 10) {
        case 1: i = 'st'; break;
        case 2: i = 'nd'; break;
        case 3: i = 'rd'; break;
        }
        switch (+val % 100) {
        case 11:
        case 12:
        case 13: i = 'th'; break;
        }

        return '' + val + i;
    };
});

angular.module('webwalletApp').filter('bip32Path', function () {
    return function (val) {
        return 'm/' + val.map(function(x) {
            return (x & 0x80000000) ? (x & 0x7FFFFFFF) + "'" : x;
        }).join('/');
    };
});

angular.module('webwalletApp').service('utils', function Utils(
    trezor,
    trezorApi,
    BigInteger,
    Crypto,
    Bitcoin,
    jsSHA,
    ecurve,
    Buffer,
    _,
    $q,
    $log,
    $http,
    $interval,
    $timeout,
    $location,
    $rootScope) {

    var curve = ecurve.getCurveByName('secp256k1');

    //
    // codecs
    //

    var stringToBytes = Crypto.charenc.Binary.stringToBytes,
        bytesToString = Crypto.charenc.Binary.bytesToString,
        base64ToBytes = Crypto.util.base64ToBytes,
        bytesToBase64 = Crypto.util.bytesToBase64,
        hexToBytes = Bitcoin.Util.hexToBytes,
        bytesToHex = Bitcoin.Util.bytesToHex;

    function utf8ToHex(utf8) {
        var str = unescape(encodeURIComponent(utf8));
        return bytesToHex(stringToBytes(str));
    }

    function hexToUtf8(hex) {
        var str = bytesToString(hexToBytes(hex));
        return decodeURIComponent(escape(str));
    }

    this.stringToBytes = stringToBytes;
    this.bytesToString = bytesToString;

    this.base64ToBytes = base64ToBytes;
    this.bytesToBase64 = bytesToBase64;

    this.hexToBytes = hexToBytes;
    this.bytesToHex = bytesToHex;

    this.utf8ToHex = utf8ToHex;
    this.hexToUtf8 = hexToUtf8;

    //
    // numeric amounts
    //

    function amount2str(n) {
        return Bitcoin.Util.formatValue(n);
    }

    function str2amount(s) {
        return Math.round(s * 100000000);
    }

    this.amount2str = amount2str;
    this.str2amount = str2amount;

    //
    // crypto
    //

    function sha256x2(value, options) {
        return Crypto.SHA256(Crypto.SHA256(value, {asBytes: true}), options);
    }

    this.sha256x2 = sha256x2;

    //
    // http
    //

    function httpPoll(config, throttle) {
        var deferred = $q.defer(),
            promise = deferred.promise,
            cancelled = false,
            request;

        promise.cancel = function () { cancelled = true; };

        request = _.throttle(function () {
            $http(config)
                .then(function (res) {
                    if (!cancelled) {
                        deferred.notify(res);
                        request();
                    }
                })
                .catch(deferred.reject);
        }, throttle);

        request();

        return promise;
    }

    this.httpPoll = httpPoll;

    //
    // hdnode
    //

    // decode private key from xprv base58 string to hdnode structure
    function xprv2node(xprv) {
        var bytes = Bitcoin.Base58.decode(xprv),
            hex = bytesToHex(bytes),
            node = {};

        if (hex.substring(90, 92) !== '00')
            throw new Error('Contains invalid private key');

        node.depth = parseInt(hex.substring(8, 10), 16);
        node.fingerprint = parseInt(hex.substring(10, 18), 16);
        node.child_num = parseInt(hex.substring(18, 26), 16);
        node.chain_code = hex.substring(26, 90);
        node.private_key = hex.substring(92, 156); // skip 0x00 indicating privkey

        return node;
    }

    // decode public key from xpub base58 string to hdnode structure
    function xpub2node(xpub) {
        var bytes = Bitcoin.Base58.decode(xpub),
            hex = bytesToHex(bytes),
            node = {};

        node.depth = parseInt(hex.substring(8, 10), 16);
        node.fingerprint = parseInt(hex.substring(10, 18), 16);
        node.child_num = parseInt(hex.substring(18, 26), 16);
        node.chain_code = hex.substring(26, 90);
        node.public_key = hex.substring(90, 156);

        return node;
    }

    // encode public key hdnode to xpub base58 string
    function node2xpub(node, version) {
        var hex, bytes, chck, xpub;

        hex = hexpad(version, 8)
            + hexpad(node.depth, 2)
            + hexpad(node.fingerprint, 8)
            + hexpad(node.child_num, 8)
            + node.chain_code
            + node.public_key;

        bytes = hexToBytes(hex);
        chck = Crypto.SHA256(Crypto.SHA256(bytes, {asBytes: true}), {asBytes: true});
        xpub = Bitcoin.Base58.encode(bytes.concat(chck.slice(0, 4)));

        return xpub;

        function hexpad(n, l) {
            var s = parseInt(n).toString(16);
            while (s.length < l) s = '0' + s;
            return s;
        }
    }

    function node2address(node, type) {
        var pubkey = node.public_key,
            bytes = hexToBytes(pubkey),
            hash = Bitcoin.Util.sha256ripe160(bytes);

        return address2str(hash, type);
    }

    function address2str(hash, version) {
        var csum,
            bytes,
            hasWithVersion = [+version].concat(hash);

        csum = Crypto.SHA256(
            Crypto.SHA256(hasWithVersion, {asBytes: true}),
            {asBytes: true}
        );
        bytes = hasWithVersion.concat(csum.slice(0, 4));

        return Bitcoin.Base58.encode(bytes);
    }

    function decodeAddress(address) {
        var bytes, hash, csum;

        bytes = Bitcoin.Base58.decode(address);
        hash = bytes.slice(0, 21);
        csum = Crypto.SHA256(Crypto.SHA256(hash, {asBytes: true}), {asBytes: true});

        if (csum[0] === bytes[21] && csum[1] === bytes[22] &&
            csum[2] === bytes[23] && csum[3] === bytes[24]) {
            return {
                version: hash[0],
                hash: hash.slice(1),
                csum: csum
            };
        }
    }

    function deriveChildNode(node, index) {
        var child = _deriveChildNode(node, index);
        _normalizeNode(child);

        if (trezor instanceof trezorApi.PluginTransport) {
            var child2 = trezor.deriveChildNode(node, index);
            _normalizeNode(child2);

            if (!(_.isEqual(child, child2))) {
                $log.error('CKD check failed', {
                    parent: node,
                    jsChild: child,
                    pluginChild: child2
                })
                throw new Error('Child node derivation failed');
            }
        }

        return child;
    }

    function _normalizeNode(node) {
        node.public_key = node.public_key.toUpperCase();
        node.chain_code = node.chain_code.toUpperCase();
        node.fingerprint = node.fingerprint.toString();
        node.child_num = node.child_num.toString();
        node.depth = node.depth.toString();
    }

    function _deriveChildNode(node, index) {
        var indexBytes = [
            (index >> 24) & 0xFF,
            (index >> 16) & 0xFF,
            (index >> 8)  & 0xFF,
            (index >> 0)  & 0xFF
        ];

        var ccBytes = hexToBytes(node.chain_code);

        // data = serP(point(kpar)) || ser32(index)
        //      = serP(Kpar) || ser32(index)
        var sha = new jsSHA(
            node.public_key.concat(bytesToHex(indexBytes)), "HEX");
        var I = hexToBytes(
            sha.getHMAC(bytesToHex(ccBytes), "HEX", "SHA-512", "HEX"));
        var IL = I.slice(0, 32);
        var IR = I.slice(32);

        var pIL = new BigInteger(bytesToHex(IL), 16);

        // In case parse256(IL) >= n, abort
        if (pIL.compareTo(curve.n) >= 0) {
            throw new Error('Invalid CKD: pIL >= n');
        }

        // Ki = point(parse256(IL)) + Kpar
        //    = G*IL + Kpar
        var keyBuffer = new Buffer.Buffer(node.public_key, 'hex');
        var Q = ecurve.Point.decodeFrom(curve, keyBuffer);
        var Ki = curve.G.multiply(pIL).add(Q);

        // In case Ki is the point at infinity, abort
        if (curve.isInfinity(Ki)) {
            throw new Error('Invalid CKD: Ki == Infinity');
        }

        var hash = Bitcoin.Util.sha256ripe160(hexToBytes(node.public_key));
        var fingerprint =
                (hash[0] << 24) |
                (hash[1] << 16) |
                (hash[2] << 8)  |
                (hash[3] << 0);

        return {
            public_key: Ki.getEncoded(true).toString('hex'),
            fingerprint: fingerprint >>> 0,
            depth: +node.depth + 1,
            child_num: index,
            chain_code: bytesToHex(IR),
            path: node.path.concat([index])
        };
    }

    this.xprv2node = xprv2node;
    this.xpub2node = xpub2node;
    this.node2xpub = node2xpub;
    this.node2address = node2address;
    this.address2str = address2str;
    this.decodeAddress = decodeAddress;
    this.deriveChildNode = deriveChildNode;

    //
    // promise utils
    //

    // returns a promise that gets notified every n msec
    function tick(n) {
        return $interval(null, n);
    }

    // keeps calling fn while the returned promise is being rejected
    // fn can cancel by returning falsey
    // if given delay, waits for delay msec before calling again
    // if given max, gives up after max attempts and rejects with
    // the latest error
    function endure(fn, delay, max) {
        var pr = fn();

        if (!pr)
            return $q.reject('Cancelled');

        return pr.then(null, function (err) {

            if (max !== undefined && max < 1) // we have no attempt left
                throw err;

            var retry = function () {
                return endure(fn, delay, max ? max - 1 : max);
            };

            return $timeout(retry, delay); // retry after delay
        });
    }

    this.tick = tick;
    this.endure = endure;

    /**
     * Redirect to passed path.
     *
     * @param {String} path  Path to redirect to
     * @return {Promise}     Promise that is resolved after the redirection is
     *                       complete.
     */
    function redirect(path) {
        var deferred = $q.defer(),
            off;
        if ($location.path() !== path) {
            $location.path(path);
            off = $rootScope.$on('$locationChangeSuccess', function () {
                deferred.resolve();
                off();
            });
        } else {
            deferred.resolve();
        }
        return deferred.promise;
    }

    this.redirect = redirect;

});

/*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
 */

// Closure
(function(){

    /**
     * Decimal adjustment of a number.
     *
     * @param  {String}  type  The type of adjustment.
     * @param  {Number}  value  The number.
     * @param  {Integer}  exp    The exponent (the 10 logarithm of the adjustment base).
     * @returns  {Number}      The adjusted value.
     */
    function decimalAdjust(type, value, exp) {
        // If the exp is undefined or zero...
        if (typeof exp === 'undefined' || +exp === 0) {
            return Math[type](value);
        }
        value = +value;
        exp = +exp;
        // If the value is not a number or the exp is not an integer...
        if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
            return NaN;
        }
        // Shift
        value = value.toString().split('e');
        value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
        // Shift back
        value = value.toString().split('e');
        return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
    }

    // Decimal round
    if (!Math.round10) {
        Math.round10 = function(value, exp) {
            return decimalAdjust('round', value, exp);
        };
    }
    // Decimal floor
    if (!Math.floor10) {
        Math.floor10 = function(value, exp) {
            return decimalAdjust('floor', value, exp);
        };
    }
    // Decimal ceil
    if (!Math.ceil10) {
        Math.ceil10 = function(value, exp) {
            return decimalAdjust('ceil', value, exp);
        };
    }

})();
