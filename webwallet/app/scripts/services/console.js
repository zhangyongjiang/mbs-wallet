/**
 * Console wrappers
 *
 * Stores all logs in `window.console.logs` Array.
 */
(function (window) {
    'use strict';

    var orig = {
            error: window.console.error,
            warn: window.console.warn,
            info: window.console.info,
            debug: window.console.debug,
            log: window.console.log
        },
        level;

    window.console.logs = [];

    for (level in orig) {
        if (orig.hasOwnProperty(level)) {
            window.console[level] = createMethod(orig[level], level);
        }
    }

    function createMethod(method, level) {
        return function () {
            var args = Array.prototype.slice.call(arguments),
                time = new Date().toUTCString();
            window.console.logs.push([level, time].concat(args));
            method.apply(window.console, args);
        };
    }

}(this));
