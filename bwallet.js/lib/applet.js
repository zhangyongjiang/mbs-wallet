'use strict';

var console = require('console'),
    extend = require('extend'),
    Promise = require('promise'),
    bowser = require('bowser'),
    deployJava = require('./deployJava'),
    platform = require('platform');

// Try to load a applet with given options, returns promise. In case of
// rejection, err contains `installed` property.
module.exports.load = function (options) {
    var o = extend(options, {
        // name of the callback in the global namespace
        fname: '__bwalletAppletLoaded',
        // id of the applet element
        id: '__bwallet-applet',
        // time to wait until timeout, in msec
        timeout: 500
    });

    // if we know for sure that the applet is installed, timeout after
    // 10 seconds
    var installed = isInstalled(),
        timeout = installed ? 30000 : o.timeout;

    // if the applet is already loaded, use it
    var applet = document.getElementById(o.id);
    if (applet)
        return Promise.from(applet);

    // inject or reject after timeout
    return Promise.race([
        injectApplet(o.id, o.fname),
        rejectAfter(timeout, new Error('Loading timed out'))
    ]).catch(function (err) {
        err.installed = installed;
        if (!installed) {
            console.log('[bwallet] Detected environment : ' + platform.description);
            err.javaLink = 'http://java.com/en/download/index.jsp';
            if (platform.os.family != null && platform.os.family.indexOf('Win') >= 0) {
                if (platform.os.architecture == 64 && platform.description.indexOf('32-bit') < 0) {
                    err.javaLink = 'http://javadl.sun.com/webapps/download/AutoDL?BundleId=106248';
                } else {
                    err.javaLink = 'http://javadl.sun.com/webapps/download/AutoDL?BundleId=106246';
                }
            }
        }
        
        err.env = {};
        if (bowser.browser.msie && bowser.browser.version >= 10)
            err.env.ie10 = true;
        else 
            err.env.ie10 = false;
        // TODO a bug here on Mac OS X, platform.os.architecture return a invaild value 32
        if (platform.os.architecture == 64) {
        	err.env.os64 = true;
        	if (platform.description.indexOf('32-bit') < 0) 
        		err.env.browser64 = true;
        	else
        	    err.env.browser64 = false;
        } else {
        	err.env.os64 = false;
        	err.env.browser64 = false;
        }
        err.env.browser = platform.name;
        err.env.os = platform.os.family;
        
        throw err;
    }).then(
        function (applet) {
            console.log('[bwallet] Loaded applet ' + applet.version);
            return applet;
        },
        function (err) {
            console.error('[bwallet] Failed to load applet: ' + err.message);
            throw err;
        }
    );
};

// Injects the applet object into the page and waits until it loads.
function injectApplet(id, fname) {
    return new Promise(function (resolve, reject) {
        var body = document.getElementsByTagName('body')[0],
            elem = document.createElement('div');

        // register load function
        window[fname] = function () {
            var applet = document.getElementById(id);
            if (applet)
                resolve(applet);
            else
                reject(new Error('Applet not found'));
        }
        ;
        // inject object elem
        body.appendChild(elem);
        var html = "";
        if (bowser.browser.msie && bowser.browser.version >= 11) {
            html = 
            '<embed id="'+id+'" '+
                'archive="bwallet-applet-0.0.5.jar" '+
                'code="com/bdx/bwallet/applet/BWalletApplet.class" '+
                'codebase="data/jars" '+
                'width="1" height="1" '+
                'type="application/x-java-applet;version=1.6" '+
                'onload="'+fname+'" '+
                'pluginspage="http://java.sun.com/j2se/1.6.0/download.html" '+
                'java_arguments="-Djnlp.packEnabled=true" >'+
            '</embed>';
        } else {
            html = 
            '<object id="'+id+'" classid="java:com/bdx/bwallet/applet/BWalletApplet.class"'+
                    'type="application/x-java-applet"'+
                    'height="1" width="1" >'+
                '<param name="code" value="com.bdx.bwallet.applet.BWalletApplet" />'+
                '<param name="archive" value="bwallet-applet-0.0.5.jar" />'+
                '<param name="codebase" value="data/jars" />'+
                '<param name="persistState" value="false" />'+
                '<param name="onload" value="'+fname+'" />'+
                '<param name="java_arguments" value="-Djnlp.packEnabled=true" />'+
            '</object>';
        }
        elem.innerHTML = html;
    });
}

// If given timeout, gets rejected after n msec, otherwise never resolves.
function rejectAfter(msec, val) {
    return new Promise(function (resolve, reject) {
        if (msec > 0)
            setTimeout(function () { reject(val); }, msec);
    });
}

// Returns true if applet with a given mimetype is installed.
function isInstalled() {
    return deployJava.versionCheck("1.6+");
}
