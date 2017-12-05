!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.trezor=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
'use strict';

var console = _dereq_('console'),
    extend = _dereq_('extend'),
    Promise = _dereq_('promise'),
    bowser = _dereq_('bowser'),
    deployJava = _dereq_('./deployJava'),
    platform = _dereq_('platform');

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

},{"./deployJava":2,"bowser":12,"console":18,"extend":30,"platform":31,"promise":33}],2:[function(_dereq_,module,exports){
var deployJava = function() {
    var l = {
        core: ["id", "class", "title", "style"],
        i18n: ["lang", "dir"],
        events: ["onclick", "ondblclick", "onmousedown", "onmouseup", "onmouseover", "onmousemove", "onmouseout", "onkeypress", "onkeydown", "onkeyup"],
        applet: ["codebase", "code", "name", "archive", "object", "width", "height", "alt", "align", "hspace", "vspace"],
        object: ["classid", "codebase", "codetype", "data", "type", "archive", "declare", "standby", "height", "width", "usemap", "name", "tabindex", "align", "border", "hspace", "vspace"]
    };
    var b = l.object.concat(l.core, l.i18n, l.events);
    var m = l.applet.concat(l.core);

    function g(o) {
        if (!d.debug) {
            return
        }
        if (console.log) {
            console.log(o)
        } else {
            alert(o)
        }
    }

    function k(p, o) {
        if (p == null || p.length == 0) {
            return true
        }
        var r = p.charAt(p.length - 1);
        if (r != "+" && r != "*" && (p.indexOf("_") != -1 && r != "_")) {
            p = p + "*";
            r = "*"
        }
        p = p.substring(0, p.length - 1);
        if (p.length > 0) {
            var q = p.charAt(p.length - 1);
            if (q == "." || q == "_") {
                p = p.substring(0, p.length - 1)
            }
        }
        if (r == "*") {
            return (o.indexOf(p) == 0)
        } else {
            if (r == "+") {
                return p <= o
            }
        }
        return false
    }

    function e() {
        var o = "//java.com/js/webstart.png";
        try {
            return document.location.protocol.indexOf("http") != -1 ? o : "http:" + o
        } catch (p) {
            return "http:" + o
        }
    }

    function n(p) {
        var o = "http://java.com/dt-redirect";
        if (p == null || p.length == 0) {
            return o
        }
        if (p.charAt(0) == "&") {
            p = p.substring(1, p.length)
        }
        return o + "?" + p
    }

    function j(q, p) {
        var o = q.length;
        for (var r = 0; r < o; r++) {
            if (q[r] === p) {
                return true
            }
        }
        return false
    }

    function c(o) {
        return j(m, o.toLowerCase())
    }

    function i(o) {
        return j(b, o.toLowerCase())
    }

    function a(o) {
        if ("MSIE" != deployJava.browserName) {
            return true
        }
        if (deployJava.compareVersionToPattern(deployJava.getPlugin().version, ["10", "0", "0"], false, true)) {
            return true
        }
        if (o == null) {
            return false
        }
        return !k("1.6.0_33+", o)
    }
    var d = {
        debug: null,
        version: "20120801",
        firefoxJavaVersion: null,
        myInterval: null,
        preInstallJREList: null,
        returnPage: null,
        brand: null,
        locale: null,
        installType: null,
        EAInstallEnabled: false,
        EarlyAccessURL: null,
        oldMimeType: "application/npruntime-scriptable-plugin;DeploymentToolkit",
        mimeType: "application/java-deployment-toolkit",
        launchButtonPNG: e(),
        browserName: null,
        browserName2: null,
        getJREs: function() {
            var t = new Array();
            if (this.isPluginInstalled()) {
                var r = this.getPlugin();
                var o = r.jvms;
                for (var q = 0; q < o.getLength(); q++) {
                    t[q] = o.get(q).version
                }
            } else {
                var p = this.getBrowser();
                if (p == "MSIE") {
                    if (this.testUsingActiveX("1.7.0")) {
                        t[0] = "1.7.0"
                    } else {
                        if (this.testUsingActiveX("1.6.0")) {
                            t[0] = "1.6.0"
                        } else {
                            if (this.testUsingActiveX("1.5.0")) {
                                t[0] = "1.5.0"
                            } else {
                                if (this.testUsingActiveX("1.4.2")) {
                                    t[0] = "1.4.2"
                                } else {
                                    if (this.testForMSVM()) {
                                        t[0] = "1.1"
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (p == "Netscape Family") {
                        this.getJPIVersionUsingMimeType();
                        if (this.firefoxJavaVersion != null) {
                            t[0] = this.firefoxJavaVersion
                        } else {
                            if (this.testUsingMimeTypes("1.7")) {
                                t[0] = "1.7.0"
                            } else {
                                if (this.testUsingMimeTypes("1.6")) {
                                    t[0] = "1.6.0"
                                } else {
                                    if (this.testUsingMimeTypes("1.5")) {
                                        t[0] = "1.5.0"
                                    } else {
                                        if (this.testUsingMimeTypes("1.4.2")) {
                                            t[0] = "1.4.2"
                                        } else {
                                            if (this.browserName2 == "Safari") {
                                                if (this.testUsingPluginsArray("1.7.0")) {
                                                    t[0] = "1.7.0"
                                                } else {
                                                    if (this.testUsingPluginsArray("1.6")) {
                                                        t[0] = "1.6.0"
                                                    } else {
                                                        if (this.testUsingPluginsArray("1.5")) {
                                                            t[0] = "1.5.0"
                                                        } else {
                                                            if (this.testUsingPluginsArray("1.4.2")) {
                                                                t[0] = "1.4.2"
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (this.debug) {
                for (var q = 0; q < t.length; ++q) {
                    g("[getJREs()] We claim to have detected Java SE " + t[q])
                }
            }
            return t
        },
        installJRE: function(r, p) {
            var o = false;
            if (this.isPluginInstalled() && this.isAutoInstallEnabled(r)) {
                var q = false;
                if (this.isCallbackSupported()) {
                    q = this.getPlugin().installJRE(r, p)
                } else {
                    q = this.getPlugin().installJRE(r)
                }
                if (q) {
                    this.refresh();
                    if (this.returnPage != null) {
                        document.location = this.returnPage
                    }
                }
                return q
            } else {
                return this.installLatestJRE()
            }
        },
        isAutoInstallEnabled: function(o) {
            if (!this.isPluginInstalled()) {
                return false
            }
            if (typeof o == "undefined") {
                o = null
            }
            return a(o)
        },
        isCallbackSupported: function() {
            return this.isPluginInstalled() && this.compareVersionToPattern(this.getPlugin().version, ["10", "2", "0"], false, true)
        },
        installLatestJRE: function(q) {
            if (this.isPluginInstalled() && this.isAutoInstallEnabled()) {
                var r = false;
                if (this.isCallbackSupported()) {
                    r = this.getPlugin().installLatestJRE(q)
                } else {
                    r = this.getPlugin().installLatestJRE()
                }
                if (r) {
                    this.refresh();
                    if (this.returnPage != null) {
                        document.location = this.returnPage
                    }
                }
                return r
            } else {
                var p = this.getBrowser();
                var o = navigator.platform.toLowerCase();
                if ((this.EAInstallEnabled == "true") && (o.indexOf("win") != -1) && (this.EarlyAccessURL != null)) {
                    this.preInstallJREList = this.getJREs();
                    if (this.returnPage != null) {
                        this.myInterval = setInterval("deployJava.poll()", 3000)
                    }
                    location.href = this.EarlyAccessURL;
                    return false
                } else {
                    if (p == "MSIE") {
                        return this.IEInstall()
                    } else {
                        if ((p == "Netscape Family") && (o.indexOf("win32") != -1)) {
                            return this.FFInstall()
                        } else {
                            location.href = n(((this.returnPage != null) ? ("&returnPage=" + this.returnPage) : "") + ((this.locale != null) ? ("&locale=" + this.locale) : "") + ((this.brand != null) ? ("&brand=" + this.brand) : ""))
                        }
                    }
                    return false
                }
            }
        },
        runApplet: function(p, u, r) {
            if (r == "undefined" || r == null) {
                r = "1.1"
            }
            var t = "^(\\d+)(?:\\.(\\d+)(?:\\.(\\d+)(?:_(\\d+))?)?)?$";
            var o = r.match(t);
            if (this.returnPage == null) {
                this.returnPage = document.location
            }
            if (o != null) {
                var q = this.getBrowser();
                if (q != "?") {
                    if (this.versionCheck(r + "+")) {
                        this.writeAppletTag(p, u)
                    } else {
                        if (this.installJRE(r + "+")) {
                            this.refresh();
                            location.href = document.location;
                            this.writeAppletTag(p, u)
                        }
                    }
                } else {
                    this.writeAppletTag(p, u)
                }
            } else {
                g("[runApplet()] Invalid minimumVersion argument to runApplet():" + r)
            }
        },
        writeAppletTag: function(r, w) {
            var o = "<" + "applet ";
            var q = "";
            var t = "<" + "/" + "applet" + ">";
            var x = true;
            if (null == w || typeof w != "object") {
                w = new Object()
            }
            for (var p in r) {
                if (!c(p)) {
                    w[p] = r[p]
                } else {
                    o += (" " + p + '="' + r[p] + '"');
                    if (p == "code") {
                        x = false
                    }
                }
            }
            var v = false;
            for (var u in w) {
                if (u == "codebase_lookup") {
                    v = true
                }
                if (u == "object" || u == "java_object" || u == "java_code") {
                    x = false
                }
                q += '<param name="' + u + '" value="' + w[u] + '"/>'
            }
            if (!v) {
                q += '<param name="codebase_lookup" value="false"/>'
            }
            if (x) {
                o += (' code="dummy"')
            }
            o += ">";
            document.write(o + "\n" + q + "\n" + t)
        },
        versionCheck: function(p) {
            var v = 0;
            var x = "^(\\d+)(?:\\.(\\d+)(?:\\.(\\d+)(?:_(\\d+))?)?)?(\\*|\\+)?$";
            var y = p.match(x);
            if (y != null) {
                var r = false;
                var u = false;
                var q = new Array();
                for (var t = 1; t < y.length; ++t) {
                    if ((typeof y[t] == "string") && (y[t] != "")) {
                        q[v] = y[t];
                        v++
                    }
                }
                if (q[q.length - 1] == "+") {
                    u = true;
                    r = false;
                    q.length--
                } else {
                    if (q[q.length - 1] == "*") {
                        u = false;
                        r = true;
                        q.length--
                    } else {
                        if (q.length < 4) {
                            u = false;
                            r = true
                        }
                    }
                }
                var w = this.getJREs();
                for (var t = 0; t < w.length; ++t) {
                    if (this.compareVersionToPattern(w[t], q, r, u)) {
                        return true
                    }
                }
                return false
            } else {
                var o = "Invalid versionPattern passed to versionCheck: " + p;
                g("[versionCheck()] " + o);
                alert(o);
                return false
            }
        },
        isWebStartInstalled: function(r) {
            var q = this.getBrowser();
            if (q == "?") {
                return true
            }
            if (r == "undefined" || r == null) {
                r = "1.4.2"
            }
            var p = false;
            var t = "^(\\d+)(?:\\.(\\d+)(?:\\.(\\d+)(?:_(\\d+))?)?)?$";
            var o = r.match(t);
            if (o != null) {
                p = this.versionCheck(r + "+")
            } else {
                g("[isWebStartInstaller()] Invalid minimumVersion argument to isWebStartInstalled(): " + r);
                p = this.versionCheck("1.4.2+")
            }
            return p
        },
        getJPIVersionUsingMimeType: function() {
            for (var p = 0; p < navigator.mimeTypes.length; ++p) {
                var q = navigator.mimeTypes[p].type;
                var o = q.match(/^application\/x-java-applet;jpi-version=(.*)$/);
                if (o != null) {
                    this.firefoxJavaVersion = o[1];
                    if ("Opera" != this.browserName2) {
                        break
                    }
                }
            }
        },
        launchWebStartApplication: function(r) {
            var o = navigator.userAgent.toLowerCase();
            this.getJPIVersionUsingMimeType();
            if (this.isWebStartInstalled("1.7.0") == false) {
                if ((this.installJRE("1.7.0+") == false) || ((this.isWebStartInstalled("1.7.0") == false))) {
                    return false
                }
            }
            var u = null;
            if (document.documentURI) {
                u = document.documentURI
            }
            if (u == null) {
                u = document.URL
            }
            var p = this.getBrowser();
            var q;
            if (p == "MSIE") {
                q = "<" + 'object classid="clsid:8AD9C840-044E-11D1-B3E9-00805F499D93" ' + 'width="0" height="0">' + "<" + 'PARAM name="launchjnlp" value="' + r + '"' + ">" + "<" + 'PARAM name="docbase" value="' + u + '"' + ">" + "<" + "/" + "object" + ">"
            } else {
                if (p == "Netscape Family") {
                    q = "<" + 'embed type="application/x-java-applet;jpi-version=' + this.firefoxJavaVersion + '" ' + 'width="0" height="0" ' + 'launchjnlp="' + r + '"' + 'docbase="' + u + '"' + " />"
                }
            }
            if (document.body == "undefined" || document.body == null) {
                document.write(q);
                document.location = u
            } else {
                var t = document.createElement("div");
                t.id = "div1";
                t.style.position = "relative";
                t.style.left = "-10000px";
                t.style.margin = "0px auto";
                t.className = "dynamicDiv";
                t.innerHTML = q;
                document.body.appendChild(t)
            }
        },
        createWebStartLaunchButtonEx: function(q, p) {
            if (this.returnPage == null) {
                this.returnPage = q
            }
            var o = "javascript:deployJava.launchWebStartApplication('" + q + "');";
            document.write("<" + 'a href="' + o + "\" onMouseOver=\"window.status=''; " + 'return true;"><' + "img " + 'src="' + this.launchButtonPNG + '" ' + 'border="0" /><' + "/" + "a" + ">")
        },
        createWebStartLaunchButton: function(q, p) {
            if (this.returnPage == null) {
                this.returnPage = q
            }
            var o = "javascript:" + "if (!deployJava.isWebStartInstalled(&quot;" + p + "&quot;)) {" + "if (deployJava.installLatestJRE()) {" + "if (deployJava.launch(&quot;" + q + "&quot;)) {}" + "}" + "} else {" + "if (deployJava.launch(&quot;" + q + "&quot;)) {}" + "}";
            document.write("<" + 'a href="' + o + "\" onMouseOver=\"window.status=''; " + 'return true;"><' + "img " + 'src="' + this.launchButtonPNG + '" ' + 'border="0" /><' + "/" + "a" + ">")
        },
        launch: function(o) {
            document.location = o;
            return true
        },
        isPluginInstalled: function() {
            var o = this.getPlugin();
            if (o && o.jvms) {
                return true
            } else {
                return false
            }
        },
        isAutoUpdateEnabled: function() {
            if (this.isPluginInstalled()) {
                return this.getPlugin().isAutoUpdateEnabled()
            }
            return false
        },
        setAutoUpdateEnabled: function() {
            if (this.isPluginInstalled()) {
                return this.getPlugin().setAutoUpdateEnabled()
            }
            return false
        },
        setInstallerType: function(o) {
            this.installType = o;
            if (this.isPluginInstalled()) {
                return this.getPlugin().setInstallerType(o)
            }
            return false
        },
        setAdditionalPackages: function(o) {
            if (this.isPluginInstalled()) {
                return this.getPlugin().setAdditionalPackages(o)
            }
            return false
        },
        setEarlyAccess: function(o) {
            this.EAInstallEnabled = o
        },
        isPlugin2: function() {
            if (this.isPluginInstalled()) {
                if (this.versionCheck("1.6.0_10+")) {
                    try {
                        return this.getPlugin().isPlugin2()
                    } catch (o) {}
                }
            }
            return false
        },
        allowPlugin: function() {
            this.getBrowser();
            var o = ("Safari" != this.browserName2 && "Opera" != this.browserName2);
            return o
        },
        getPlugin: function() {
            this.refresh();
            var o = null;
            if (this.allowPlugin()) {
                o = document.getElementById("deployJavaPlugin")
            }
            return o
        },
        compareVersionToPattern: function(v, p, r, t) {
            if (v == undefined || p == undefined) {
                return false
            }
            var w = "^(\\d+)(?:\\.(\\d+)(?:\\.(\\d+)(?:_(\\d+))?)?)?$";
            var x = v.match(w);
            if (x != null) {
                var u = 0;
                var y = new Array();
                for (var q = 1; q < x.length; ++q) {
                    if ((typeof x[q] == "string") && (x[q] != "")) {
                        y[u] = x[q];
                        u++
                    }
                }
                var o = Math.min(y.length, p.length);
                if (t) {
                    for (var q = 0; q < o; ++q) {
                        if (y[q] < p[q]) {
                            return false
                        } else {
                            if (y[q] > p[q]) {
                                return true
                            }
                        }
                    }
                    return true
                } else {
                    for (var q = 0; q < o; ++q) {
                        if (y[q] != p[q]) {
                            return false
                        }
                    }
                    if (r) {
                        return true
                    } else {
                        return (y.length == p.length)
                    }
                }
            } else {
                return false
            }
        },
        getBrowser: function() {
            if (this.browserName == null) {
                var o = navigator.userAgent.toLowerCase();
                g("[getBrowser()] navigator.userAgent.toLowerCase() -> " + o);
                if ((o.indexOf("msie") != -1) && (o.indexOf("opera") == -1)) {
                    this.browserName = "MSIE";
                    this.browserName2 = "MSIE"
                } else {
                    if (o.indexOf("trident") != -1 || o.indexOf("Trident") != -1) {
                        this.browserName = "MSIE";
                        this.browserName2 = "MSIE"
                    } else {
                        if (o.indexOf("iphone") != -1) {
                            this.browserName = "Netscape Family";
                            this.browserName2 = "iPhone"
                        } else {
                            if ((o.indexOf("firefox") != -1) && (o.indexOf("opera") == -1)) {
                                this.browserName = "Netscape Family";
                                this.browserName2 = "Firefox"
                            } else {
                                if (o.indexOf("chrome") != -1) {
                                    this.browserName = "Netscape Family";
                                    this.browserName2 = "Chrome"
                                } else {
                                    if (o.indexOf("safari") != -1) {
                                        this.browserName = "Netscape Family";
                                        this.browserName2 = "Safari"
                                    } else {
                                        if ((o.indexOf("mozilla") != -1) && (o.indexOf("opera") == -1)) {
                                            this.browserName = "Netscape Family";
                                            this.browserName2 = "Other"
                                        } else {
                                            if (o.indexOf("opera") != -1) {
                                                this.browserName = "Netscape Family";
                                                this.browserName2 = "Opera"
                                            } else {
                                                this.browserName = "?";
                                                this.browserName2 = "unknown"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                g("[getBrowser()] Detected browser name:" + this.browserName + ", " + this.browserName2)
            }
            return this.browserName
        },
        testUsingActiveX: function(o) {
            var q = "JavaWebStart.isInstalled." + o + ".0";
            if (typeof ActiveXObject == "undefined" || !ActiveXObject) {
                g("[testUsingActiveX()] Browser claims to be IE, but no ActiveXObject object?");
                return false
            }
            try {
                return (new ActiveXObject(q) != null)
            } catch (p) {
                return false
            }
        },
        testForMSVM: function() {
            var p = "{08B0E5C0-4FCB-11CF-AAA5-00401C608500}";
            if (typeof oClientCaps != "undefined") {
                var o = oClientCaps.getComponentVersion(p, "ComponentID");
                if ((o == "") || (o == "5,0,5000,0")) {
                    return false
                } else {
                    return true
                }
            } else {
                return false
            }
        },
        testUsingMimeTypes: function(p) {
            if (!navigator.mimeTypes) {
                g("[testUsingMimeTypes()] Browser claims to be Netscape family, but no mimeTypes[] array?");
                return false
            }
            for (var q = 0; q < navigator.mimeTypes.length; ++q) {
                s = navigator.mimeTypes[q].type;
                var o = s.match(/^application\/x-java-applet\x3Bversion=(1\.8|1\.7|1\.6|1\.5|1\.4\.2)$/);
                if (o != null) {
                    if (this.compareVersions(o[1], p)) {
                        return true
                    }
                }
            }
            return false
        },
        testUsingPluginsArray: function(p) {
            if ((!navigator.plugins) || (!navigator.plugins.length)) {
                return false
            }
            var o = navigator.platform.toLowerCase();
            for (var q = 0; q < navigator.plugins.length; ++q) {
                s = navigator.plugins[q].description;
                if (s.search(/^Java Switchable Plug-in (Cocoa)/) != -1) {
                    if (this.compareVersions("1.5.0", p)) {
                        return true
                    }
                } else {
                    if (s.search(/^Java/) != -1) {
                        if (o.indexOf("win") != -1) {
                            if (this.compareVersions("1.5.0", p) || this.compareVersions("1.6.0", p)) {
                                return true
                            }
                        }
                    }
                }
            }
            if (this.compareVersions("1.5.0", p)) {
                return true
            }
            return false
        },
        IEInstall: function() {
            location.href = n(((this.returnPage != null) ? ("&returnPage=" + this.returnPage) : "") + ((this.locale != null) ? ("&locale=" + this.locale) : "") + ((this.brand != null) ? ("&brand=" + this.brand) : ""));
            return false
        },
        done: function(p, o) {},
        FFInstall: function() {
            location.href = n(((this.returnPage != null) ? ("&returnPage=" + this.returnPage) : "") + ((this.locale != null) ? ("&locale=" + this.locale) : "") + ((this.brand != null) ? ("&brand=" + this.brand) : "") + ((this.installType != null) ? ("&type=" + this.installType) : ""));
            return false
        },
        compareVersions: function(r, t) {
            var p = r.split(".");
            var o = t.split(".");
            for (var q = 0; q < p.length; ++q) {
                p[q] = Number(p[q])
            }
            for (var q = 0; q < o.length; ++q) {
                o[q] = Number(o[q])
            }
            if (p.length == 2) {
                p[2] = 0
            }
            if (p[0] > o[0]) {
                return true
            }
            if (p[0] < o[0]) {
                return false
            }
            if (p[1] > o[1]) {
                return true
            }
            if (p[1] < o[1]) {
                return false
            }
            if (p[2] > o[2]) {
                return true
            }
            if (p[2] < o[2]) {
                return false
            }
            return true
        },
        enableAlerts: function() {
            this.browserName = null;
            this.debug = true
        },
        poll: function() {
            this.refresh();
            var o = this.getJREs();
            if ((this.preInstallJREList.length == 0) && (o.length != 0)) {
                clearInterval(this.myInterval);
                if (this.returnPage != null) {
                    location.href = this.returnPage
                }
            }
            if ((this.preInstallJREList.length != 0) && (o.length != 0) && (this.preInstallJREList[0] != o[0])) {
                clearInterval(this.myInterval);
                if (this.returnPage != null) {
                    location.href = this.returnPage
                }
            }
        },
        writePluginTag: function() {
            var o = this.getBrowser();
            if (o == "MSIE") {
                document.write("<" + 'object classid="clsid:CAFEEFAC-DEC7-0000-0001-ABCDEFFEDCBA" ' + 'id="deployJavaPlugin" width="0" height="0">' + "<" + "/" + "object" + ">")
            } else {
                if (o == "Netscape Family" && this.allowPlugin()) {
                    this.writeEmbedTag()
                }
            }
        },
        refresh: function() {
            navigator.plugins.refresh(false);
            var o = this.getBrowser();
            if (o == "Netscape Family" && this.allowPlugin()) {
                var p = document.getElementById("deployJavaPlugin");
                if (p == null) {
                    this.writeEmbedTag()
                }
            }
        },
        writeEmbedTag: function() {
			/*
            var o = false;
            if (navigator.mimeTypes != null) {
                for (var p = 0; p < navigator.mimeTypes.length; p++) {
                    if (navigator.mimeTypes[p].type == this.mimeType) {
                        if (navigator.mimeTypes[p].enabledPlugin) {
                            document.write("<" + 'embed id="deployJavaPlugin" type="' + this.mimeType + '" hidden="true" />');
                            o = true
                        }
                    }
                }
                if (!o) {
                    for (var p = 0; p < navigator.mimeTypes.length; p++) {
                        if (navigator.mimeTypes[p].type == this.oldMimeType) {
                            if (navigator.mimeTypes[p].enabledPlugin) {
                                document.write("<" + 'embed id="deployJavaPlugin" type="' + this.oldMimeType + '" hidden="true" />')
                            }
                        }
                    }
                }
            }
			*/
        }
    };
    d.writePluginTag();
    if (d.locale == null) {
        var h = null;
        if (h == null) {
            try {
                h = navigator.userLanguage
            } catch (f) {}
        }
        if (h == null) {
            try {
                h = navigator.systemLanguage
            } catch (f) {}
        }
        if (h == null) {
            try {
                h = navigator.language
            } catch (f) {}
        }
        if (h != null) {
            h.replace("-", "_");
            d.locale = h
        }
    }
    return d
}();

module.exports = deployJava;
},{}],3:[function(_dereq_,module,exports){
var Promise = _dereq_('promise'),
    request = _dereq_('browser-request');

function promiseRequest(options, payload) {
    return new Promise(function (resolve, reject) {
        request(options, function (err, response, body) {
            if (err) {
                reject(err);
                return;
            }

            if (response.statusCode !== 200) {
                if (body && body.error) {
                    err = new Error(body.error);
                } else {
                    err = new Error('Request failed with status '
                                    + response.statusCode);
                }
                reject(err);
            }

            resolve(body);
        });
    });
}

module.exports = promiseRequest;

},{"browser-request":13,"promise":33}],4:[function(_dereq_,module,exports){
'use strict';

// interface Transport {
//
//     function configure(String config) -> Promise()
//
//     function enumerate(Boolean wait) -> Promise([{
//         String path
//         String vendor
//         String product
//         String serialNumber
//         String session
//     }] devices)
//
//     function acquire(String path) -> Promise(String session)
//
//     function release(String session) -> Promise()
//
//     function call(String session, String name, Object data) -> Promise({
//         String name,
//         Object data,
//     })
//
// }

module.exports = {
    HttpTransport: _dereq_('./transport/http'),
    PluginTransport: _dereq_('./transport/plugin'),
    AppletTransport: _dereq_('./transport/applet'),
    Session: _dereq_('./session'),
    installers: _dereq_('./installers'),
    plugin: _dereq_('./plugin'),
    http: _dereq_('./http')
};

},{"./http":3,"./installers":5,"./plugin":6,"./session":7,"./transport/applet":9,"./transport/http":10,"./transport/plugin":11}],5:[function(_dereq_,module,exports){
// var BRIDGE_VERSION_URL = '/data/bridge/latest.txt',
//     BRIDGE_INSTALLERS = [{
//         url: '/data/bridge/%version%/trezor-bridge-%version%-win64.msi',
//         label: 'Windows 64-bit',
//         platform: 'win64'
//     }, {
//         url: '/data/bridge/%version%/trezor-bridge-%version%-win32.msi',
//         label: 'Windows 32-bit',
//         platform: 'win32'
//     }, {
//         url: '/data/bridge/%version%/trezor-bridge-%version%.pkg',
//         label: 'Mac OS X',
//         platform: 'mac'
//     }, {
//         url: '/data/bridge/%version%/trezor-bridge_%version%_amd64.deb',
//         label: 'Linux 64-bit (deb)',
//         platform: 'deb64'
//     }, {
//         url: '/data/bridge/%version%/trezor-bridge-%version%-1.x86_64.rpm',
//         label: 'Linux 64-bit (rpm)',
//         platform: 'rpm64'
//     }, {
//         url: '/data/bridge/%version%/trezor-bridge_%version%_i386.deb',
//         label: 'Linux 32-bit (deb)',
//         platform: 'deb32'
//     }, {
//         url: '/data/bridge/%version%/trezor-bridge-%version%-1.i386.rpm',
//         label: 'Linux 32-bit (rpm)',
//         platform: 'rpm32'
//     }];

var BRIDGE_VERSION_URL = '/data/plugin/latest.txt',
    BRIDGE_INSTALLERS = [{
        url: '/data/plugin/%version%/BitcoinTrezorPlugin-%version%.msi',
        label: 'Windows',
        platform: ['win32', 'win64']
    }, {
        url: '/data/plugin/%version%/trezor-plugin-%version%.dmg',
        label: 'Mac OS X',
        platform: 'mac'
    }, {
        url: '/data/plugin/%version%/browser-plugin-trezor_%version%_amd64.deb',
        label: 'Linux x86_64 (deb)',
        platform: 'deb64'
    }, {
        url: '/data/plugin/%version%/browser-plugin-trezor-%version%.x86_64.rpm',
        label: 'Linux x86_64 (rpm)',
        platform: 'rpm64'
    }, {
        url: '/data/plugin/%version%/browser-plugin-trezor_%version%_i386.deb',
        label: 'Linux i386 (deb)',
        platform: 'deb32'
    }, {
        url: '/data/plugin/%version%/browser-plugin-trezor-%version%.i386.rpm',
        label: 'Linux i386 (rpm)',
        platform: 'rpm32'
    }];

// Returns a list of bridge installers, with download URLs and a mark on
// bridge preferred for the user's platform.
function installers(options) {
    var o = options || {},
        bridgeUrl = o.bridgeUrl || BRIDGE_VERSION_URL,
        version = o.version || requestUri(bridgeUrl).trim(),
        platform = o.platform || preferredPlatform();

    return BRIDGE_INSTALLERS.map(function (bridge) {
        return {
            version: version,
            url: bridge.url.replace(/%version%/g, version),
            label: bridge.label,
            platform: bridge.platform,
            preferred: isPreferred(bridge.platform)
        };
    });

    function isPreferred(installer) {
        if (typeof installer === 'string') { // single platform
            return installer === platform;
        } else { // any of multiple platforms
            for (var i = 0; i < installer.length; i++) {
                if (installer[i] === platform) {
                    return true;
                }
            }
            return false;
        }
    }
};

function preferredPlatform() {
    var ver = navigator.userAgent;

    if (ver.match(/Win64|WOW64/)) return 'win64';
    if (ver.match(/Win/)) return 'win32';
    if (ver.match(/Mac/)) return 'mac';
    if (ver.match(/Linux i[3456]86/))
        return ver.match(/CentOS|Fedora|Mandriva|Mageia|Red Hat|Scientific|SUSE/)
            ? 'rpm32' : 'deb32';
    if (ver.match(/Linux/))
        return ver.match(/CentOS|Fedora|Mandriva|Mageia|Red Hat|Scientific|SUSE/)
            ? 'rpm64' : 'deb64';
}

function requestUri(url) {
    var req = new XMLHttpRequest();

    req.open('get', url, false);
    req.send();

    if (req.status !== 200)
        throw new Error('Failed to GET ' + url);

    return req.responseText;
}

module.exports = installers;

},{}],6:[function(_dereq_,module,exports){
'use strict';

var console = _dereq_('console'),
    extend = _dereq_('extend'),
    Promise = _dereq_('promise');

// Try to load a plugin with given options, returns promise. In case of
// rejection, err contains `installed` property.
module.exports.load = function (options) {
    var o = extend(options, {
        // mimetype of the plugin
        mimetype: 'application/x-bitcointrezorplugin',
        // name of the callback in the global namespace
        fname: '__trezorPluginLoaded',
        // id of the plugin element
        id: '__trezor-plugin',
        // time to wait until timeout, in msec
        timeout: 500
    });

    // if we know for sure that the plugin is installed, timeout after
    // 10 seconds
    var installed = isInstalled(o.mimetype),
        timeout = installed ? 10000 : o.timeout;

    // if the plugin is already loaded, use it
    var plugin = document.getElementById(o.id);
    if (plugin)
        return Promise.from(plugin);

    // inject or reject after timeout
    return Promise.race([
        injectPlugin(o.id, o.mimetype, o.fname),
        rejectAfter(timeout, new Error('Loading timed out'))
    ]).catch(function (err) {
        err.installed = installed;
        throw err;
    }).then(
        function (plugin) {
            console.log('[trezor] Loaded plugin ' + plugin.version);
            return plugin;
        },
        function (err) {
            console.error('[trezor] Failed to load plugin: ' + err.message);
            throw err;
        }
    );
};

// Injects the plugin object into the page and waits until it loads.
function injectPlugin(id, mimetype, fname) {
    return new Promise(function (resolve, reject) {
        var body = document.getElementsByTagName('body')[0],
            elem = document.createElement('div');

        // register load function
        window[fname] = function () {
            var plugin = document.getElementById(id);
            if (plugin)
                resolve(plugin);
            else
                reject(new Error('Plugin not found'));
        };

        // inject object elem
        body.appendChild(elem);
        elem.innerHTML =
            '<object width="1" height="1" id="'+id+'" type="'+mimetype+'">'+
            ' <param name="onload" value="'+fname+'" />'+
            '</object>';
    });
}

// If given timeout, gets rejected after n msec, otherwise never resolves.
function rejectAfter(msec, val) {
    return new Promise(function (resolve, reject) {
        if (msec > 0)
            setTimeout(function () { reject(val); }, msec);
    });
}

// Returns true if plugin with a given mimetype is installed.
function isInstalled(mimetype) {
    navigator.plugins.refresh(false);
    return !!navigator.mimeTypes[mimetype];
}

},{"console":18,"extend":30,"promise":33}],7:[function(_dereq_,module,exports){
'use strict';

var util = _dereq_('util'),
    extend = _dereq_('extend'),
    unorm = _dereq_('unorm'),
    crypto = _dereq_('crypto'),
    Promise = _dereq_('promise'),
    translator = _dereq_('./translator'),
    EventEmitter = _dereq_('events').EventEmitter;

//
// Trezor device session handle. Acts as a event emitter.
//
// Events:
//
//  send: type, message
//  receive: type, message
//  error: error
//
//  button: code
//  pin: type, callback(error, pin)
//  word: callback(error, word)
//  passphrase: callback(error, passphrase)
//
var Session = function (transport, sessionId) {
    this._transport = transport;
    this._sessionId = sessionId;
    this._emitter = this; // TODO: get emitter as a param
    this._language = 'english';
};

util.inherits(Session, EventEmitter);

Session.prototype.release = function () {
    console.log('[trezor] Releasing session');
    return this._transport.release(this._sessionId);
};

Session.prototype.initialize = function (language) {
    return this._typedCommonCall('Initialize', 'Features', language ? {language: language} : {});
};

Session.prototype.getEntropy = function (size) {
    return this._typedCommonCall('GetEntropy', 'Entropy', {
        size: size
    });
};

Session.prototype.getAddress = function (address_n, coin, show_display) {
    return this._typedCommonCall('GetAddress', 'Address', {
        address_n: address_n,
        coin_name: coin.coin_name,
        show_display: !!show_display
    }).then(function (res) {
        res.message.path = address_n || [];
        return res;
    });
};

Session.prototype.getAccountLabels = function (coin, all, index) {
    return this._typedCommonCall('GetAccountLabels', 'AccountLabels', {
        coin_name: coin.coin_name,
        all: !!all,
        index: index
    });
};

Session.prototype.getPublicKey = function (address_n) {
    return this._typedCommonCall('GetPublicKey', 'PublicKey', {
        address_n: address_n
    }).then(function (res) {
        res.message.node.path = address_n || [];
        return res;
    });
};

Session.prototype.wipeDevice = function () {
    return this._commonCall('WipeDevice');
};

Session.prototype.resetDevice = function (settings) {
    return this._commonCall('ResetDevice', settings);
};

Session.prototype.loadDevice = function (settings) {
    return this._commonCall('LoadDevice', settings);
};

Session.prototype.recoverDevice = function (settings) {
    return this._commonCall('RecoveryDevice', settings);
};

Session.prototype.applySettings = function (settings) {
    return this._commonCall('ApplySettings', settings);
};

Session.prototype.changePin = function (remove) {
    return this._commonCall('ChangePin', {
        remove: remove || false
    });
};

Session.prototype.eraseFirmware = function () {
    return this._commonCall('FirmwareErase');
};

Session.prototype.uploadFirmware = function (payload) {
    return this._commonCall('FirmwareUpload', {
        payload: payload
    });
};

Session.prototype.verifyMessage = function (address, signature, message) {
    return this._commonCall('VerifyMessage', {
        address: address,
        signature: signature,
        message: message
    });
};

Session.prototype.signMessage = function (address_n, message, coin) {
    return this._typedCommonCall('SignMessage', 'MessageSignature', {
        address_n: address_n,
        message: message,
        coin_name: coin.coin_name
    });
};

Session.prototype.measureTx = function (inputs, outputs, coin) {
    return this._typedCommonCall('EstimateTxSize', 'TxSize', {
        inputs_count: inputs.length,
        outputs_count: outputs.length,
        coin_name: coin.coin_name
    });
};

Session.prototype.simpleSignTx = function (inputs, outputs, txs, coin) {
    return this._typedCommonCall('SimpleSignTx', 'TxRequest', {
        inputs: inputs,
        outputs: outputs,
        coin_name: coin.coin_name,
        transactions: txs
    });
};

Session.prototype._indexTxsForSign = function (inputs, outputs, txs) {
    var index = {};

    // Tx being signed
    index[''] = {
        inputs: inputs,
        outputs: outputs
    };

    // Referenced txs
    txs.forEach(function (tx) {
        index[tx.hash.toLowerCase()] = tx;
    });

    return index;
};

Session.prototype.signTx = function (inputs, outputs, txs, coin) {
    var self = this,
        index = this._indexTxsForSign(inputs, outputs, txs),
        signatures = [],
        serializedTx = '';

    return this._typedCommonCall('SignTx', 'TxRequest', {
        inputs_count: inputs.length,
        outputs_count: outputs.length,
        coin_name: coin.coin_name
    }).then(process);

    function process(res) {
        var m = res.message,
            ms = m.serialized,
            md = m.details,
            reqTx, resTx;

        if (ms && ms.serialized_tx != null)
            serializedTx += ms.serialized_tx;
        if (ms && ms.signature_index != null)
            signatures[ms.signature_index] = ms.signature;

        if (m.request_type === 'TXFINISHED')
            return { // same format as SimpleSignTx
                message: {
                    serialized: {
                        signatures: signatures,
                        serialized_tx: serializedTx
                    }
                }
            };

        resTx = {};
        reqTx = index[(md.tx_hash || '').toLowerCase()];

        if (!reqTx)
            throw new Error(md.tx_hash
                            ? ('Requested unknown tx: ' + md.tx_hash)
                            : ('Requested tx for signing not indexed')
                           );

        switch (m.request_type) {

        case 'TXINPUT':
            resTx.inputs = [reqTx.inputs[+md.request_index]];
            break;

        case 'TXOUTPUT':
            if (md.tx_hash)
                resTx.bin_outputs = [reqTx.bin_outputs[+md.request_index]];
            else
                resTx.outputs = [reqTx.outputs[+md.request_index]];
            break;

        case 'TXMETA':
            resTx.version = reqTx.version;
            resTx.lock_time = reqTx.lock_time;
            resTx.inputs_cnt = reqTx.inputs.length;
            if (md.tx_hash)
                resTx.outputs_cnt = reqTx.bin_outputs.length;
            else
                resTx.outputs_cnt = reqTx.outputs.length;
            break;

        default:
            throw new Error('Unknown request type: ' + m.request_type);
        }

        return self._typedCommonCall('TxAck', 'TxRequest', {
            tx: resTx
        }).then(process);
    }
};

Session.prototype._typedCommonCall = function (type, resType, msg) {
    var self = this;

    return this._commonCall(type, msg).then(function (res) {
        return self._assertType(res, resType);
    });
};

Session.prototype._assertType = function (res, resType) {
    if (res.type !== resType)
        throw new TypeError('Response of unexpected type: ' + res.type);
    return res;
};

Session.prototype._commonCall = function (type, msg) {
    var self = this,
        callpr = this._call(type, msg);

    return callpr.then(function (res) {
        return self._filterCommonTypes(res);
    });
};

Session.prototype._filterCommonTypes = function (res) {
    var self = this;

    if (res.type === 'Failure') {
        res.message.message = translator(this._language, res.message.message);
        throw res.message;
    }

    if (res.type === 'ButtonRequest') {
        this._emitter.emit('button', res.message.code);
        return this._commonCall('ButtonAck');
    }

    if (res.type === 'EntropyRequest')
        return this._commonCall('EntropyAck', {
            entropy: stringToHex(this._generateEntropy(32))
        });

    if (res.type === 'PinMatrixRequest')
        return this._promptPin(res.message.type).then(
            function (pin) {
                return self._commonCall('PinMatrixAck', { pin: pin });
            },
            function () {
                return self._commonCall('Cancel');
            }
        );

    if (res.type === 'PassphraseRequest')
        return this._promptPassphrase().then(
            function (passphrase) {
                return self._commonCall('PassphraseAck', { passphrase: passphrase });
            },
            function (err) {
                return self._commonCall('Cancel').then(null, function (e) {
                    throw err || e;
                });
            }
        );

    if (res.type === 'WordRequest')
        return this._promptWord().then(
            function (word) {
                return self._commonCall('WordAck', { word: word });
            },
            function () {
                return self._commonCall('Cancel');
            }
        );

    return res;
};

Session.prototype._promptPin = function (type) {
    var self = this;

    return new Promise(function (resolve, reject) {
        if (!self._emitter.emit('pin', type, function (err, pin) {
            if (err || pin == null)
                reject(err);
            else
                resolve(pin);
        })) {
            console.warn('[trezor] PIN callback not configured, cancelling request');
            reject();
        }
    });
};

Session.prototype._promptPassphrase = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        if (!self._emitter.emit('passphrase', function (err, passphrase) {
            if (err || passphrase == null)
                reject(err);
            else
                resolve(passphrase.normalize('NFKD'));
        })) {
            console.warn('[trezor] Passphrase callback not configured, cancelling request');
            reject();
        }
    });
};

Session.prototype._promptWord = function () {
    var self = this;

    return new Promise(function (resolve, reject) {
        if (!self._emitter.emit('word', function (err, word) {
            if (err || word == null)
                reject(err);
            else
                resolve(word.toLocaleLowerCase());
        })) {
            console.warn('[trezor] Word callback not configured, cancelling request');
            reject();
        }
    });
};

Session.prototype._generateEntropy = function (len) {
    return crypto.randomBytes(len).toString('binary');
};

Session.prototype._call = function (type, msg) {
    var self = this,
        logMessage;

    msg = msg || {};
    logMessage = this._filterForLog(type, msg);

    console.log('[trezor] Sending', type, logMessage);
    this._emitter.emit('send', type, msg);

    return this._transport.call(this._sessionId, type, msg).then(
        function (res) {
            var logMessage = self._filterForLog(res.type, res.message);

            console.log('[trezor] Received', res.type, logMessage);
            self._emitter.emit('receive', res.type, res.message);
            return res;
        },
        function (err) {
            console.log('[trezord] Received error', err);
            self._emitter.emit('error', err);
            throw err;
        }
    );
};

Session.prototype._filterForLog = function (type, msg) {
    var redacted = {},
        blacklist = {
            PassphraseAck: {
                passphrase: '(redacted...)'
            }
        };

    return extend(redacted, msg, blacklist[type] || {});
};

Session.prototype.setLanguage = function (language) {
    this._language = language;
};

module.exports = Session;

//
// Hex codec
//

// Encode binary string to hex string
function stringToHex(bin) {
    var i, chr, hex = '';

    for (i = 0; i < bin.length; i++) {
        chr = (bin.charCodeAt(i) & 0xFF).toString(16);
        hex += chr.length < 2 ? '0' + chr : chr;
    }

    return hex;
}

// Decode hex string to binary string
function hexToString(hex) {
    var i, bytes = [];

    for (i = 0; i < hex.length - 1; i += 2)
        bytes.push(parseInt(hex.substr(i, 2), 16));

    return String.fromCharCode.apply(String, bytes);
}

},{"./translator":8,"crypto":20,"events":25,"extend":30,"promise":33,"unorm":36,"util":29}],8:[function(_dereq_,module,exports){
'use strict';

var messages = {
	chinese : {
		"Device not initialized or passphrase request cancelled" : "设备未初始化或已取消输入密码",
		"Invalid signature" : "无效的签名",
		"Not enough funds" : "资金不足",
		"PIN Cancelled" : "PIN码输入已取消",
		"Invalid PIN" : "PIN码错误",
		"PIN removal cancelled" : "PIN码删除已取消",
		"Ping cancelled" : "Ping已取消",
		"PIN change cancelled" : "PIN码修改已取消",
		"PIN change failed" : "PIN码修改失败",
		"Wipe cancelled" : "重置已取消",
		"Entropy cancelled" : "Entropy已取消",
		"Fee over threshold. Signing cancelled." : "手续费超过阈值。签名已取消。",
		"Signing cancelled by user" : "签名已取消",
		"Apply settings cancelled" : "修改标签与语言已取消",
		"Show address cancelled" : "地址显示已取消",
		"Sign message cancelled" : "签名消息已取消",
		"Load cancelled" : "加载已取消",
		"CipherKeyValue cancelled" : "CipherKeyValue已取消",
		"Reset cancelled" : "设置已取消",
		"Not in bootloader mode" : "不在升级模式",
		"Device is already initialized. Use Wipe first." : "设备已经初始化。请先重置设备。",
		"Unknown message" : "消息不可识别",
		"Not in Recovery mode" : "不在恢复模式",
		"Not in Reset mode" : "不在设置模式",
		"Not in Signing mode" : "不在签名模式",
		"No transaction provided" : "没有提供交易",
		"No key provided" : "没有提供键",
		"No value provided" : "没有提供值",
		"Value length must be a multiple of 16" : "值的长度必须是16的倍数",
		"No setting provided" : "没有提供配置",
		"No public key provided" : "没有提供公钥",
		"Invalid public key provided" : "提供的公钥无效",
		"No message provided" : "没有提供消息",
		"Message length must be a multiple of 16" : "消息长度必须是16的倍数",
		"Message too big" : "消息长度过大",
		"Invalid word count (has to be 12, 18 or 24 bits)" : "无效的单词数量（必须是12、18或24个）",
		"Wrong word retyped" : "单词输入错误",
		"Word not found in a wordlist" : "单词表中不存在的单词",
		"Invalid mnemonic, are words in correct order?" : "无效的种子，单词排列顺序是否正确？",
		"Invalid strength (has to be 128, 192 or 256 bits)" : "无效的强度（必须是128、192或256位）",
		"Failed to serialize input" : "系列化输入失败",
		"Failed to serialize output" : "系列化输出失败",
		"Encountered invalid prevhash" : "无效的prevhash",
		"Failed to compile input" : "编制输入失败",
		"Only one change output allowed" : "只允许一个找零输出",
		"Transaction has changed during signing" : "签名期间交易已经改变了",
		"Failed to compile output" : "编制输出失败",
		"Signing error" : "签名出错了",
		"Transaction must have at least one output" : "交易必须至少有一个输出",
		"Transaction must have at least one input" : "交易必须至少有一个输入",
		"Invalid coin name" : "无效的币种",
		"Error signing message" : "签名消息出错了"
	}
};

var translator = function(language, key) {
	if (messages[language] && messages[language][key]) {
		return messages[language][key];
	} else {
		return key;
	}
};

module.exports = translator;
},{}],9:[function(_dereq_,module,exports){
'use strict';

var Promise = _dereq_('promise'),
    applet_ = _dereq_('../applet'),
    traverse = _dereq_('traverse')
//
// Applet transport.
//
var AppletTransport = function (applet) {
    this._applet = applet;
};

// Injects the applet object into the document.
AppletTransport.loadApplet = function () {
    return applet_.load();
};

// BIP32 CKD derivation of the given index
/*
AppletTransport.prototype.deriveChildNode = function (node, index) {
    var child = this._applet.deriveChildNode(node, index);

    if (node.path) {
        child.path = node.path.concat([index]);
    }

    return child;
};
*/

// Configures the applet.
AppletTransport.prototype.configure = function (config) {
    var applet = this._applet;

    return new Promise(function (resolve, reject) {
        try {
            applet.configure(config);
            resolve();
        } catch (e) {
            // In most browsers, exceptions from applet methods are not properly
            // propagated
            reject(new Error(
                'Applet configuration found, but could not be used. ' +
                    'Make sure it has proper format and a valid signature.'
            ));
        }
    });
};

// Enumerates connected devices.
// Requires configured applet.
AppletTransport.prototype.enumerate = function () {
    var applet = this._applet;

    return new Promise(function (resolve) {
        resolve(JSON.parse(applet.devices()));
    });
};

// Opens a device and returns a session object.
AppletTransport.prototype.acquire = function (device) {
    return Promise.resolve({
        session: device
    });
};

// Releases the device handle.
AppletTransport.prototype.release = function (device) {
    var applet = this._applet;

    return new Promise(function (resolve, reject) {
        applet.close(JSON.stringify(device), {
            success: resolve,
            error: reject
        });
    });
};

// Does a request-response call to the device.
AppletTransport.prototype.call = function (device, type, message) {
    var applet = this._applet,
        timeout = false;

    // BitcoinTrezorApplet has a bug, causing different treatment of
    // undefined fields in messages. We need to find all undefined fields
    // and remove them from the message object. `traverse` will delete
    // object fields and splice out array items properly.
    traverse(message).forEach(function (value) {
        if (value === undefined) {
            this.remove();
        }
    });
    // JSON.stringify will contain $$hashKey
    return new Promise(function (resolve, reject) {
        applet.call(JSON.stringify(device), timeout, type, angular.toJson(message), {
            success: function (t, m) {
                resolve({
                    type: t,
                    message: JSON.parse(m)
                });
            },
            error: function (err) {
                reject(new Error(err));
            }
        });
    });
};

module.exports = AppletTransport;

},{"../applet":1,"promise":33,"traverse":35}],10:[function(_dereq_,module,exports){
'use strict';

var extend = _dereq_('extend'),
    http = _dereq_('../http');

//
// HTTP transport.
//
var HttpTransport = function (url) {
    this._url = url;
};

HttpTransport.connect = function (url) {
    return http({
        url: url, json: true
    });
};

HttpTransport.prototype._request = function (options) {
    return http(extend(options, {
        url: this._url + options.url
    }));
};

HttpTransport.prototype.configure = function (config) {
    return this._request({
        method: 'POST', url: '/configure', body: config, json: true
    });
};

HttpTransport.prototype.enumerate = function (wait) {
    return this._request({
        method: 'GET', url: wait ? '/listen' : '/enumerate', json: true
    });
};

HttpTransport.prototype.acquire = function (device) {
    var path = device.path; // TODO: take just path
    return this._request({
        method: 'POST', url: '/acquire/' + path, json: true
    });
};

HttpTransport.prototype.release = function (sessionId) {
    return this._request({
        method: 'POST', url: '/release/' + sessionId, json: true
    });
};

HttpTransport.prototype.call = function (sessionId, type, message) {
    return this._request({
        method: 'POST', url: '/call/' + sessionId, json: {
            type: type,
            message: message
        }
    });
};

module.exports = HttpTransport;

},{"../http":3,"extend":30}],11:[function(_dereq_,module,exports){
'use strict';

var Promise = _dereq_('promise'),
    plugin_ = _dereq_('../plugin'),
    traverse = _dereq_('traverse');

//
// Plugin transport.
//
var PluginTransport = function (plugin) {
    this._plugin = plugin;
};

// Injects the plugin object into the document.
PluginTransport.loadPlugin = function () {
    return plugin_.load();
};

// BIP32 CKD derivation of the given index
PluginTransport.prototype.deriveChildNode = function (node, index) {
    var child = this._plugin.deriveChildNode(node, index);

    if (node.path) {
        child.path = node.path.concat([index]);
    }

    return child;
};

// Configures the plugin.
PluginTransport.prototype.configure = function (config) {
    var plugin = this._plugin;

    return new Promise(function (resolve, reject) {
        try {
            plugin.configure(config);
            resolve();
        } catch (e) {
            // In most browsers, exceptions from plugin methods are not properly
            // propagated
            reject(new Error(
                'Plugin configuration found, but could not be used. ' +
                    'Make sure it has proper format and a valid signature.'
            ));
        }
    });
};

// Enumerates connected devices.
// Requires configured plugin.
PluginTransport.prototype.enumerate = function () {
    var plugin = this._plugin;

    return new Promise(function (resolve) {
        resolve(plugin.devices());
    });
};

// Opens a device and returns a session object.
PluginTransport.prototype.acquire = function (device) {
    return Promise.resolve({
        session: device
    });
};

// Releases the device handle.
PluginTransport.prototype.release = function (device) {
    var plugin = this._plugin;

    return new Promise(function (resolve, reject) {
        plugin.close(device, {
            success: resolve,
            error: reject
        });
    });
};

// Does a request-response call to the device.
PluginTransport.prototype.call = function (device, type, message) {
    var plugin = this._plugin,
        timeout = false;

    // BitcoinTrezorPlugin has a bug, causing different treatment of
    // undefined fields in messages. We need to find all undefined fields
    // and remove them from the message object. `traverse` will delete
    // object fields and splice out array items properly.
    traverse(message).forEach(function (value) {
        if (value === undefined) {
            this.remove();
        }
    });

    return new Promise(function (resolve, reject) {
        plugin.call(device, timeout, type, message, {
            success: function (t, m) {
                resolve({
                    type: t,
                    message: m
                });
            },
            error: function (err) {
                reject(new Error(err));
            }
        });
    });
};

module.exports = PluginTransport;

},{"../plugin":6,"promise":33,"traverse":35}],12:[function(_dereq_,module,exports){
/*!
  * Bowser - a browser detector
  * https://github.com/ded/bowser
  * MIT License | (c) Dustin Diaz 2014
  */

!function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports['browser'] = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else this[name] = definition()
}('bowser', function () {
  /**
    * See useragents.js for examples of navigator.userAgent
    */

  var t = true

  function detect(ua) {

    function getFirstMatch(regex) {
      var match = ua.match(regex);
      return (match && match.length > 1 && match[1]) || '';
    }

    var iosdevice = getFirstMatch(/(ipod|iphone|ipad)/i).toLowerCase()
      , likeAndroid = /like android/i.test(ua)
      , android = !likeAndroid && /android/i.test(ua)
      , versionIdentifier = getFirstMatch(/version\/(\d+(\.\d+)?)/i)
      , tablet = /tablet/i.test(ua)
      , mobile = !tablet && /[^-]mobi/i.test(ua)
      , result

    if (/opera|opr/i.test(ua)) {
      result = {
        name: 'Opera'
      , opera: t
      , version: versionIdentifier || getFirstMatch(/(?:opera|opr)[\s\/](\d+(\.\d+)?)/i)
      }
    }
    else if (/windows phone/i.test(ua)) {
      result = {
        name: 'Windows Phone'
      , windowsphone: t
      , msie: t
      , version: getFirstMatch(/iemobile\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/msie|trident/i.test(ua)) {
      result = {
        name: 'Internet Explorer'
      , msie: t
      , version: getFirstMatch(/(?:msie |rv:)(\d+(\.\d+)?)/i)
      }
    }
    else if (/chrome|crios|crmo/i.test(ua)) {
      result = {
        name: 'Chrome'
      , chrome: t
      , version: getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.\d+)?)/i)
      }
    }
    else if (iosdevice) {
      result = {
        name : iosdevice == 'iphone' ? 'iPhone' : iosdevice == 'ipad' ? 'iPad' : 'iPod'
      }
      // WTF: version is not part of user agent in web apps
      if (versionIdentifier) {
        result.version = versionIdentifier
      }
    }
    else if (/sailfish/i.test(ua)) {
      result = {
        name: 'Sailfish'
      , sailfish: t
      , version: getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/seamonkey\//i.test(ua)) {
      result = {
        name: 'SeaMonkey'
      , seamonkey: t
      , version: getFirstMatch(/seamonkey\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/firefox|iceweasel/i.test(ua)) {
      result = {
        name: 'Firefox'
      , firefox: t
      , version: getFirstMatch(/(?:firefox|iceweasel)[ \/](\d+(\.\d+)?)/i)
      }
      if (/\((mobile|tablet);[^\)]*rv:[\d\.]+\)/i.test(ua)) {
        result.firefoxos = t
      }
    }
    else if (/silk/i.test(ua)) {
      result =  {
        name: 'Amazon Silk'
      , silk: t
      , version : getFirstMatch(/silk\/(\d+(\.\d+)?)/i)
      }
    }
    else if (android) {
      result = {
        name: 'Android'
      , version: versionIdentifier
      }
    }
    else if (/phantom/i.test(ua)) {
      result = {
        name: 'PhantomJS'
      , phantom: t
      , version: getFirstMatch(/phantomjs\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/blackberry|\bbb\d+/i.test(ua) || /rim\stablet/i.test(ua)) {
      result = {
        name: 'BlackBerry'
      , blackberry: t
      , version: versionIdentifier || getFirstMatch(/blackberry[\d]+\/(\d+(\.\d+)?)/i)
      }
    }
    else if (/(web|hpw)os/i.test(ua)) {
      result = {
        name: 'WebOS'
      , webos: t
      , version: versionIdentifier || getFirstMatch(/w(?:eb)?osbrowser\/(\d+(\.\d+)?)/i)
      };
      /touchpad\//i.test(ua) && (result.touchpad = t)
    }
    else if (/bada/i.test(ua)) {
      result = {
        name: 'Bada'
      , bada: t
      , version: getFirstMatch(/dolfin\/(\d+(\.\d+)?)/i)
      };
    }
    else if (/tizen/i.test(ua)) {
      result = {
        name: 'Tizen'
      , tizen: t
      , version: getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.\d+)?)/i) || versionIdentifier
      };
    }
    else if (/safari/i.test(ua)) {
      result = {
        name: 'Safari'
      , safari: t
      , version: versionIdentifier
      }
    }
    else result = {}

    // set webkit or gecko flag for browsers based on these engines
    if (/(apple)?webkit/i.test(ua)) {
      result.name = result.name || "Webkit"
      result.webkit = t
      if (!result.version && versionIdentifier) {
        result.version = versionIdentifier
      }
    } else if (!result.opera && /gecko\//i.test(ua)) {
      result.name = result.name || "Gecko"
      result.gecko = t
      result.version = result.version || getFirstMatch(/gecko\/(\d+(\.\d+)?)/i)
    }

    // set OS flags for platforms that have multiple browsers
    if (android || result.silk) {
      result.android = t
    } else if (iosdevice) {
      result[iosdevice] = t
      result.ios = t
    }

    // OS version extraction
    var osVersion = '';
    if (iosdevice) {
      osVersion = getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i);
      osVersion = osVersion.replace(/[_\s]/g, '.');
    } else if (android) {
      osVersion = getFirstMatch(/android[ \/-](\d+(\.\d+)*)/i);
    } else if (result.windowsphone) {
      osVersion = getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i);
    } else if (result.webos) {
      osVersion = getFirstMatch(/(?:web|hpw)os\/(\d+(\.\d+)*)/i);
    } else if (result.blackberry) {
      osVersion = getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i);
    } else if (result.bada) {
      osVersion = getFirstMatch(/bada\/(\d+(\.\d+)*)/i);
    } else if (result.tizen) {
      osVersion = getFirstMatch(/tizen[\/\s](\d+(\.\d+)*)/i);
    }
    if (osVersion) {
      result.osversion = osVersion;
    }

    // device type extraction
    var osMajorVersion = osVersion.split('.')[0];
    if (tablet || iosdevice == 'ipad' || (android && (osMajorVersion == 3 || (osMajorVersion == 4 && !mobile))) || result.silk) {
      result.tablet = t
    } else if (mobile || iosdevice == 'iphone' || iosdevice == 'ipod' || android || result.blackberry || result.webos || result.bada) {
      result.mobile = t
    }

    // Graded Browser Support
    // http://developer.yahoo.com/yui/articles/gbs
    if ((result.msie && result.version >= 10) ||
        (result.chrome && result.version >= 20) ||
        (result.firefox && result.version >= 20.0) ||
        (result.safari && result.version >= 6) ||
        (result.opera && result.version >= 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] >= 6) ||
        (result.blackberry && result.version >= 10.1)
        ) {
      result.a = t;
    }
    else if ((result.msie && result.version < 10) ||
        (result.chrome && result.version < 20) ||
        (result.firefox && result.version < 20.0) ||
        (result.safari && result.version < 6) ||
        (result.opera && result.version < 10.0) ||
        (result.ios && result.osversion && result.osversion.split(".")[0] < 6)
        ) {
      result.c = t
    } else result.x = t

    return result
  }

  var bowser = detect(typeof navigator !== 'undefined' ? navigator.userAgent : '')


  /*
   * Set our detect method to the main bowser object so we can
   * reuse it to test other user agents.
   * This is needed to implement future tests.
   */
  bowser._detect = detect;

  return bowser
});

},{}],13:[function(_dereq_,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// UMD HEADER START 
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.returnExports = factory();
  }
}(this, function () {
// UMD HEADER END

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }
  
  //BEGIN QS Hack
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }
  
  if(options.qs){
    var qs = (typeof options.qs == 'string')? options.qs : serialize(options.qs);
    if(options.uri.indexOf('?') !== -1){ //no get params
        options.uri = options.uri+'&'+qs;
    }else{ //existing get params
        options.uri = options.uri+'?'+qs;
    }
  }
  //END QS Hack
  
  //BEGIN FORM Hack
  var multipart = function(obj) {
    //todo: support file type (useful?)
    var result = {};
    result.boundry = '-------------------------------'+Math.floor(Math.random()*1000000000);
    var lines = [];
    for(var p in obj){
        if (obj.hasOwnProperty(p)) {
            lines.push(
                '--'+result.boundry+"\n"+
                'Content-Disposition: form-data; name="'+p+'"'+"\n"+
                "\n"+
                obj[p]+"\n"
            );
        }
    }
    lines.push( '--'+result.boundry+'--' );
    result.body = lines.join('');
    result.length = result.body.length;
    result.type = 'multipart/form-data; boundary='+result.boundry;
    return result;
  }
  
  if(options.form){
    if(typeof options.form == 'string') throw('form name unsupported');
    if(options.method === 'POST'){
        var encoding = (options.encoding || 'application/x-www-form-urlencoded').toLowerCase();
        options.headers['content-type'] = encoding;
        switch(encoding){
            case 'application/x-www-form-urlencoded':
                options.body = serialize(options.form).replace(/%20/g, "+");
                break;
            case 'multipart/form-data':
                var multi = multipart(options.form);
                //options.headers['content-length'] = multi.length;
                options.body = multi.body;
                options.headers['content-type'] = multi.type;
                break;
            default : throw new Error('unsupported encoding:'+encoding);
        }
    }
  }
  //END FORM Hack

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}
    return request;
//UMD FOOTER START
}));
//UMD FOOTER END

},{}],14:[function(_dereq_,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = _dereq_('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":29}],15:[function(_dereq_,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = _dereq_('base64-js')
var ieee754 = _dereq_('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":16,"ieee754":17}],16:[function(_dereq_,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],17:[function(_dereq_,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],18:[function(_dereq_,module,exports){
(function (global){
/*global window, global*/
var util = _dereq_("util")
var assert = _dereq_("assert")

var slice = Array.prototype.slice
var console
var times = {}

if (typeof global !== "undefined" && global.console) {
    console = global.console
} else if (typeof window !== "undefined" && window.console) {
    console = window.console
} else {
    console = {}
}

var functions = [
    [log, "log"]
    , [info, "info"]
    , [warn, "warn"]
    , [error, "error"]
    , [time, "time"]
    , [timeEnd, "timeEnd"]
    , [trace, "trace"]
    , [dir, "dir"]
    , [assert, "assert"]
]

for (var i = 0; i < functions.length; i++) {
    var tuple = functions[i]
    var f = tuple[0]
    var name = tuple[1]

    if (!console[name]) {
        console[name] = f
    }
}

module.exports = console

function log() {}

function info() {
    console.log.apply(console, arguments)
}

function warn() {
    console.log.apply(console, arguments)
}

function error() {
    console.warn.apply(console, arguments)
}

function time(label) {
    times[label] = Date.now()
}

function timeEnd(label) {
    var time = times[label]
    if (!time) {
        throw new Error("No such label: " + label)
    }

    var duration = Date.now() - time
    console.log(label + ": " + duration + "ms")
}

function trace() {
    var err = new Error()
    err.name = "Trace"
    err.message = util.format.apply(null, arguments)
    console.error(err.stack)
}

function dir(object) {
    console.log(util.inspect(object) + "\n")
}

function assert(expression) {
    if (!expression) {
        var arr = slice.call(arguments, 1)
        assert.ok(false, util.format.apply(null, arr))
    }
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"assert":14,"util":29}],19:[function(_dereq_,module,exports){
var Buffer = _dereq_('buffer').Buffer;
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

},{"buffer":15}],20:[function(_dereq_,module,exports){
var Buffer = _dereq_('buffer').Buffer
var sha = _dereq_('./sha')
var sha256 = _dereq_('./sha256')
var rng = _dereq_('./rng')
var md5 = _dereq_('./md5')

var algorithms = {
  sha1: sha,
  sha256: sha256,
  md5: md5
}

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)
function hmac(fn, key, data) {
  if(!Buffer.isBuffer(key)) key = new Buffer(key)
  if(!Buffer.isBuffer(data)) data = new Buffer(data)

  if(key.length > blocksize) {
    key = fn(key)
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = new Buffer(blocksize), opad = new Buffer(blocksize)
  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  var hash = fn(Buffer.concat([ipad, data]))
  return fn(Buffer.concat([opad, hash]))
}

function hash(alg, key) {
  alg = alg || 'sha1'
  var fn = algorithms[alg]
  var bufs = []
  var length = 0
  if(!fn) error('algorithm:', alg, 'is not yet supported')
  return {
    update: function (data) {
      if(!Buffer.isBuffer(data)) data = new Buffer(data)
        
      bufs.push(data)
      length += data.length
      return this
    },
    digest: function (enc) {
      var buf = Buffer.concat(bufs)
      var r = key ? hmac(fn, key, buf) : fn(buf)
      bufs = null
      return enc ? r.toString(enc) : r
    }
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) { return hash(alg) }
exports.createHmac = function (alg, key) { return hash(alg, key) }
exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./md5":21,"./rng":22,"./sha":23,"./sha256":24,"buffer":15}],21:[function(_dereq_,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = _dereq_('./helpers');

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":19}],22:[function(_dereq_,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  if (_global.crypto && crypto.getRandomValues) {
    whatwgRNG = function(size) {
      var bytes = new Uint8Array(size);
      crypto.getRandomValues(bytes);
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())

},{}],23:[function(_dereq_,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var helpers = _dereq_('./helpers');

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function sha1(buf) {
  return helpers.hash(buf, core_sha1, 20, true);
};

},{"./helpers":19}],24:[function(_dereq_,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var helpers = _dereq_('./helpers');

var safe_add = function(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

var S = function(X, n) {
  return (X >>> n) | (X << (32 - n));
};

var R = function(X, n) {
  return (X >>> n);
};

var Ch = function(x, y, z) {
  return ((x & y) ^ ((~x) & z));
};

var Maj = function(x, y, z) {
  return ((x & y) ^ (x & z) ^ (y & z));
};

var Sigma0256 = function(x) {
  return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
};

var Sigma1256 = function(x) {
  return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
};

var Gamma0256 = function(x) {
  return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
};

var Gamma1256 = function(x) {
  return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
};

var core_sha256 = function(m, l) {
  var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
  var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;
  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;
  for (var i = 0; i < m.length; i += 16) {
    a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
    for (var j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = m[j + i];
      } else {
        W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
      }
      T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
      T2 = safe_add(Sigma0256(a), Maj(a, b, c));
      h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
    }
    HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
};

module.exports = function sha256(buf) {
  return helpers.hash(buf, core_sha256, 32, true);
};

},{"./helpers":19}],25:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],26:[function(_dereq_,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],27:[function(_dereq_,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],28:[function(_dereq_,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],29:[function(_dereq_,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = _dereq_('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = _dereq_('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,_dereq_("/home/dean/osc-workspaces/ws-bwallet-web/bwallet.js/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":28,"/home/dean/osc-workspaces/ws-bwallet-web/bwallet.js/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":27,"inherits":26}],30:[function(_dereq_,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;
var undefined;

var isPlainObject = function isPlainObject(obj) {
	"use strict";
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval) {
		return false;
	}

	var has_own_constructor = hasOwn.call(obj, 'constructor');
	var has_is_property_of_method = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) {}

	return key === undefined || hasOwn.call(obj, key);
};

module.exports = function extend() {
	"use strict";
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0],
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if (typeof target === "boolean") {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	} else if (typeof target !== "object" && typeof target !== "function" || target == undefined) {
			target = {};
	}

	for (; i < length; ++i) {
		// Only deal with non-null/undefined values
		if ((options = arguments[i]) != null) {
			// Extend the base object
			for (name in options) {
				src = target[name];
				copy = options[name];

				// Prevent never-ending loop
				if (target === copy) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if (deep && copy && (isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))) {
					if (copyIsArray) {
						copyIsArray = false;
						clone = src && Array.isArray(src) ? src : [];
					} else {
						clone = src && isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[name] = extend(deep, clone, copy);

				// Don't bring in undefined values
				} else if (copy !== undefined) {
					target[name] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};


},{}],31:[function(_dereq_,module,exports){
(function (global){
/*!
 * Platform.js v1.3.0 <http://mths.be/platform>
 * Copyright 2010-2014 John-David Dalton <http://allyoucanleet.com/>
 * Available under MIT license <http://mths.be/mit>
 */
;(function() {
  'use strict';

  /** Used to determine if values are of the language type `Object` */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Used as a reference to the global object */
  var root = (objectTypes[typeof window] && window) || this;

  /** Backup possible global object */
  var oldRoot = root;

  /** Detect free variable `exports` */
  var freeExports = objectTypes[typeof exports] && exports;

  /** Detect free variable `module` */
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;

  /** Detect free variable `global` from Node.js or Browserified code and use it as `root` */
  var freeGlobal = freeExports && freeModule && typeof global == 'object' && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal)) {
    root = freeGlobal;
  }

  /**
   * Used as the maximum length of an array-like object.
   * See the [ES6 spec](http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength)
   * for more details.
   */
  var maxSafeInteger = Math.pow(2, 53) - 1;

  /** Opera regexp */
  var reOpera = /\bOpera/;

  /** Possible global object */
  var thisBinding = this;

  /** Used for native method references */
  var objectProto = Object.prototype;

  /** Used to check for own properties of an object */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to resolve the internal `[[Class]]` of values */
  var toString = objectProto.toString;

  /*--------------------------------------------------------------------------*/

  /**
   * Capitalizes a string value.
   *
   * @private
   * @param {string} string The string to capitalize.
   * @returns {string} The capitalized string.
   */
  function capitalize(string) {
    string = String(string);
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  /**
   * A utility function to clean up the OS name.
   *
   * @private
   * @param {string} os The OS name to clean up.
   * @param {string} [pattern] A `RegExp` pattern matching the OS name.
   * @param {string} [label] A label for the OS.
   */
  function cleanupOS(os, pattern, label) {
    // platform tokens defined at
    // http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    // http://web.archive.org/web/20081122053950/http://msdn.microsoft.com/en-us/library/ms537503(VS.85).aspx
    var data = {
      '6.4':  '10',
      '6.3':  '8.1',
      '6.2':  '8',
      '6.1':  'Server 2008 R2 / 7',
      '6.0':  'Server 2008 / Vista',
      '5.2':  'Server 2003 / XP 64-bit',
      '5.1':  'XP',
      '5.01': '2000 SP1',
      '5.0':  '2000',
      '4.0':  'NT',
      '4.90': 'ME'
    };
    // detect Windows version from platform tokens
    if (pattern && label && /^Win/i.test(os) &&
        (data = data[0/*Opera 9.25 fix*/, /[\d.]+$/.exec(os)])) {
      os = 'Windows ' + data;
    }
    // correct character case and cleanup
    os = String(os);

    if (pattern && label) {
      os = os.replace(RegExp(pattern, 'i'), label);
    }

    os = format(
      os.replace(/ ce$/i, ' CE')
        .replace(/\bhpw/i, 'web')
        .replace(/\bMacintosh\b/, 'Mac OS')
        .replace(/_PowerPC\b/i, ' OS')
        .replace(/\b(OS X) [^ \d]+/i, '$1')
        .replace(/\bMac (OS X)\b/, '$1')
        .replace(/\/(\d)/, ' $1')
        .replace(/_/g, '.')
        .replace(/(?: BePC|[ .]*fc[ \d.]+)$/i, '')
        .replace(/\bx86\.64\b/gi, 'x86_64')
        .replace(/\b(Windows Phone) OS\b/, '$1')
        .split(' on ')[0]
    );

    return os;
  }

  /**
   * An iteration utility for arrays and objects.
   *
   * @private
   * @param {Array|Object} object The object to iterate over.
   * @param {Function} callback The function called per iteration.
   */
  function each(object, callback) {
    var index = -1,
        length = object ? object.length : 0;

    if (typeof length == 'number' && length > -1 && length <= maxSafeInteger) {
      while (++index < length) {
        callback(object[index], index, object);
      }
    } else {
      forOwn(object, callback);
    }
  }

  /**
   * Trim and conditionally capitalize string values.
   *
   * @private
   * @param {string} string The string to format.
   * @returns {string} The formatted string.
   */
  function format(string) {
    string = trim(string);
    return /^(?:webOS|i(?:OS|P))/.test(string)
      ? string
      : capitalize(string);
  }

  /**
   * Iterates over an object's own properties, executing the `callback` for each.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} callback The function executed per own property.
   */
  function forOwn(object, callback) {
    for (var key in object) {
      if (hasOwnProperty.call(object, key)) {
        callback(object[key], key, object);
      }
    }
  }

  /**
   * Gets the internal `[[Class]]` of a value.
   *
   * @private
   * @param {*} value The value.
   * @returns {string} The `[[Class]]`.
   */
  function getClassOf(value) {
    return value == null
      ? capitalize(value)
      : toString.call(value).slice(8, -1);
  }

  /**
   * Host objects can return type values that are different from their actual
   * data type. The objects we are concerned with usually return non-primitive
   * types of "object", "function", or "unknown".
   *
   * @private
   * @param {*} object The owner of the property.
   * @param {string} property The property to check.
   * @returns {boolean} Returns `true` if the property value is a non-primitive, else `false`.
   */
  function isHostType(object, property) {
    var type = object != null ? typeof object[property] : 'number';
    return !/^(?:boolean|number|string|undefined)$/.test(type) &&
      (type == 'object' ? !!object[property] : true);
  }

  /**
   * Prepares a string for use in a `RegExp` by making hyphens and spaces optional.
   *
   * @private
   * @param {string} string The string to qualify.
   * @returns {string} The qualified string.
   */
  function qualify(string) {
    return String(string).replace(/([ -])(?!$)/g, '$1?');
  }

  /**
   * A bare-bones `Array#reduce` like utility function.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {*} The accumulated result.
   */
  function reduce(array, callback) {
    var accumulator = null;
    each(array, function(value, index) {
      accumulator = callback(accumulator, value, index, array);
    });
    return accumulator;
  }

  /**
   * Removes leading and trailing whitespace from a string.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} The trimmed string.
   */
  function trim(string) {
    return String(string).replace(/^ +| +$/g, '');
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new platform object.
   *
   * @memberOf platform
   * @param {Object|string} [ua=navigator.userAgent] The user agent string or
   *  context object.
   * @returns {Object} A platform object.
   */
  function parse(ua) {

    /** The environment context object */
    var context = root;

    /** Used to flag when a custom context is provided */
    var isCustomContext = ua && typeof ua == 'object' && getClassOf(ua) != 'String';

    // juggle arguments
    if (isCustomContext) {
      context = ua;
      ua = null;
    }

    /** Browser navigator object */
    var nav = context.navigator || {};

    /** Browser user agent string */
    var userAgent = nav.userAgent || '';

    ua || (ua = userAgent);

    /** Used to flag when `thisBinding` is the [ModuleScope] */
    var isModuleScope = isCustomContext || thisBinding == oldRoot;

    /** Used to detect if browser is like Chrome */
    var likeChrome = isCustomContext
      ? !!nav.likeChrome
      : /\bChrome\b/.test(ua) && !/internal|\n/i.test(toString.toString());

    /** Internal `[[Class]]` value shortcuts */
    var objectClass = 'Object',
        airRuntimeClass = isCustomContext ? objectClass : 'ScriptBridgingProxyObject',
        enviroClass = isCustomContext ? objectClass : 'Environment',
        javaClass = (isCustomContext && context.java) ? 'JavaPackage' : getClassOf(context.java),
        phantomClass = isCustomContext ? objectClass : 'RuntimeObject';

    /** Detect Java environment */
    var java = /\bJava/.test(javaClass) && context.java;

    /** Detect Rhino */
    var rhino = java && getClassOf(context.environment) == enviroClass;

    /** A character to represent alpha */
    var alpha = java ? 'a' : '\u03b1';

    /** A character to represent beta */
    var beta = java ? 'b' : '\u03b2';

    /** Browser document object */
    var doc = context.document || {};

    /**
     * Detect Opera browser (Presto-based)
     * http://www.howtocreate.co.uk/operaStuff/operaObject.html
     * http://dev.opera.com/articles/view/opera-mini-web-content-authoring-guidelines/#operamini
     */
    var opera = context.operamini || context.opera;

    /** Opera `[[Class]]` */
    var operaClass = reOpera.test(operaClass = (isCustomContext && opera) ? opera['[[Class]]'] : getClassOf(opera))
      ? operaClass
      : (opera = null);

    /*------------------------------------------------------------------------*/

    /** Temporary variable used over the script's lifetime */
    var data;

    /** The CPU architecture */
    var arch = ua;

    /** Platform description array */
    var description = [];

    /** Platform alpha/beta indicator */
    var prerelease = null;

    /** A flag to indicate that environment features should be used to resolve the platform */
    var useFeatures = ua == userAgent;

    /** The browser/environment version */
    var version = useFeatures && opera && typeof opera.version == 'function' && opera.version();

    /** A flag to indicate if the OS ends with "/ Version" */
    var isSpecialCasedOS;

    /* Detectable layout engines (order is important) */
    var layout = getLayout([
      'Trident',
      { 'label': 'WebKit', 'pattern': 'AppleWebKit' },
      'iCab',
      'Presto',
      'NetFront',
      'Tasman',
      'KHTML',
      'Gecko'
    ]);

    /* Detectable browser names (order is important) */
    var name = getName([
      'Adobe AIR',
      'Arora',
      'Avant Browser',
      'Breach',
      'Camino',
      'Epiphany',
      'Fennec',
      'Flock',
      'Galeon',
      'GreenBrowser',
      'iCab',
      'Iceweasel',
      { 'label': 'SRWare Iron', 'pattern': 'Iron' },
      'K-Meleon',
      'Konqueror',
      'Lunascape',
      'Maxthon',
      'Midori',
      'Nook Browser',
      'PhantomJS',
      'Raven',
      'Rekonq',
      'RockMelt',
      'SeaMonkey',
      { 'label': 'Silk', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Sleipnir',
      'SlimBrowser',
      'Sunrise',
      'Swiftfox',
      'WebPositive',
      'Opera Mini',
      { 'label': 'Opera Mini', 'pattern': 'OPiOS' },
      'Opera',
      { 'label': 'Opera', 'pattern': 'OPR' },
      'Chrome',
      { 'label': 'Chrome Mobile', 'pattern': '(?:CriOS|CrMo)' },
      { 'label': 'Firefox', 'pattern': '(?:Firefox|Minefield)' },
      { 'label': 'IE', 'pattern': 'IEMobile' },
      { 'label': 'IE', 'pattern': 'MSIE' },
      'Safari'
    ]);

    /* Detectable products (order is important) */
    var product = getProduct([
      { 'label': 'BlackBerry', 'pattern': 'BB10' },
      'BlackBerry',
      { 'label': 'Galaxy S', 'pattern': 'GT-I9000' },
      { 'label': 'Galaxy S2', 'pattern': 'GT-I9100' },
      { 'label': 'Galaxy S3', 'pattern': 'GT-I9300' },
      { 'label': 'Galaxy S4', 'pattern': 'GT-I9500' },
      'Google TV',
      'Lumia',
      'iPad',
      'iPod',
      'iPhone',
      'Kindle',
      { 'label': 'Kindle Fire', 'pattern': '(?:Cloud9|Silk-Accelerated)' },
      'Nook',
      'PlayBook',
      'PlayStation 4',
      'PlayStation 3',
      'PlayStation Vita',
      'TouchPad',
      'Transformer',
      { 'label': 'Wii U', 'pattern': 'WiiU' },
      'Wii',
      'Xbox One',
      { 'label': 'Xbox 360', 'pattern': 'Xbox' },
      'Xoom'
    ]);

    /* Detectable manufacturers */
    var manufacturer = getManufacturer({
      'Apple': { 'iPad': 1, 'iPhone': 1, 'iPod': 1 },
      'Amazon': { 'Kindle': 1, 'Kindle Fire': 1 },
      'Asus': { 'Transformer': 1 },
      'Barnes & Noble': { 'Nook': 1 },
      'BlackBerry': { 'PlayBook': 1 },
      'Google': { 'Google TV': 1 },
      'HP': { 'TouchPad': 1 },
      'HTC': {},
      'LG': {},
      'Microsoft': { 'Xbox': 1, 'Xbox One': 1 },
      'Motorola': { 'Xoom': 1 },
      'Nintendo': { 'Wii U': 1,  'Wii': 1 },
      'Nokia': { 'Lumia': 1 },
      'Samsung': { 'Galaxy S': 1, 'Galaxy S2': 1, 'Galaxy S3': 1, 'Galaxy S4': 1 },
      'Sony': { 'PlayStation 4': 1, 'PlayStation 3': 1, 'PlayStation Vita': 1 }
    });

    /* Detectable OSes (order is important) */
    var os = getOS([
      'Windows Phone ',
      'Android',
      'CentOS',
      'Debian',
      'Fedora',
      'FreeBSD',
      'Gentoo',
      'Haiku',
      'Kubuntu',
      'Linux Mint',
      'Red Hat',
      'SuSE',
      'Ubuntu',
      'Xubuntu',
      'Cygwin',
      'Symbian OS',
      'hpwOS',
      'webOS ',
      'webOS',
      'Tablet OS',
      'Linux',
      'Mac OS X',
      'Macintosh',
      'Mac',
      'Windows 98;',
      'Windows '
    ]);

    /*------------------------------------------------------------------------*/

    /**
     * Picks the layout engine from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected layout engine.
     */
    function getLayout(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the manufacturer from an array of guesses.
     *
     * @private
     * @param {Array} guesses An object of guesses.
     * @returns {null|string} The detected manufacturer.
     */
    function getManufacturer(guesses) {
      return reduce(guesses, function(result, value, key) {
        // lookup the manufacturer by product or scan the UA for the manufacturer
        return result || (
          value[product] ||
          value[0/*Opera 9.25 fix*/, /^[a-z]+(?: +[a-z]+\b)*/i.exec(product)] ||
          RegExp('\\b' + qualify(key) + '(?:\\b|\\w*\\d)', 'i').exec(ua)
        ) && key;
      });
    }

    /**
     * Picks the browser name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected browser name.
     */
    function getName(guesses) {
      return reduce(guesses, function(result, guess) {
        return result || RegExp('\\b' + (
          guess.pattern || qualify(guess)
        ) + '\\b', 'i').exec(ua) && (guess.label || guess);
      });
    }

    /**
     * Picks the OS name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected OS name.
     */
    function getOS(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + '(?:/[\\d.]+|[ \\w.]*)', 'i').exec(ua)
            )) {
          result = cleanupOS(result, pattern, guess.label || guess);
        }
        return result;
      });
    }

    /**
     * Picks the product name from an array of guesses.
     *
     * @private
     * @param {Array} guesses An array of guesses.
     * @returns {null|string} The detected product name.
     */
    function getProduct(guesses) {
      return reduce(guesses, function(result, guess) {
        var pattern = guess.pattern || qualify(guess);
        if (!result && (result =
              RegExp('\\b' + pattern + ' *\\d+[.\\w_]*', 'i').exec(ua) ||
              RegExp('\\b' + pattern + '(?:; *(?:[a-z]+[_-])?[a-z]+\\d+|[^ ();-]*)', 'i').exec(ua)
            )) {
          // split by forward slash and append product version if needed
          if ((result = String((guess.label && !RegExp(pattern, 'i').test(guess.label)) ? guess.label : result).split('/'))[1] && !/[\d.]+/.test(result[0])) {
            result[0] += ' ' + result[1];
          }
          // correct character case and cleanup
          guess = guess.label || guess;
          result = format(result[0]
            .replace(RegExp(pattern, 'i'), guess)
            .replace(RegExp('; *(?:' + guess + '[_-])?', 'i'), ' ')
            .replace(RegExp('(' + guess + ')[-_.]?(\\w)', 'i'), '$1 $2'));
        }
        return result;
      });
    }

    /**
     * Resolves the version using an array of UA patterns.
     *
     * @private
     * @param {Array} patterns An array of UA patterns.
     * @returns {null|string} The detected version.
     */
    function getVersion(patterns) {
      return reduce(patterns, function(result, pattern) {
        return result || (RegExp(pattern +
          '(?:-[\\d.]+/|(?: for [\\w-]+)?[ /-])([\\d.]+[^ ();/_-]*)', 'i').exec(ua) || 0)[1] || null;
      });
    }

    /**
     * Returns `platform.description` when the platform object is coerced to a string.
     *
     * @name toString
     * @memberOf platform
     * @returns {string} Returns `platform.description` if available, else an empty string.
     */
    function toStringPlatform() {
      return this.description || '';
    }

    /*------------------------------------------------------------------------*/

    // convert layout to an array so we can add extra details
    layout && (layout = [layout]);

    // detect product names that contain their manufacturer's name
    if (manufacturer && !product) {
      product = getProduct([manufacturer]);
    }
    // clean up Google TV
    if ((data = /\bGoogle TV\b/.exec(product))) {
      product = data[0];
    }
    // detect simulators
    if (/\bSimulator\b/i.test(ua)) {
      product = (product ? product + ' ' : '') + 'Simulator';
    }
    // detect Opera Mini 8+ running in Turbo/Uncompressed mode on iOS
    if (name == 'Opera Mini' && /\bOPiOS\b/.test(ua)) {
      description.push('running in Turbo/Uncompressed mode');
    }
    // detect iOS
    if (/^iP/.test(product)) {
      name || (name = 'Safari');
      os = 'iOS' + ((data = / OS ([\d_]+)/i.exec(ua))
        ? ' ' + data[1].replace(/_/g, '.')
        : '');
    }
    // detect Kubuntu
    else if (name == 'Konqueror' && !/buntu/i.test(os)) {
      os = 'Kubuntu';
    }
    // detect Android browsers
    else if (manufacturer && manufacturer != 'Google' &&
        ((/Chrome/.test(name) && !/\bMobile Safari\b/i.test(ua)) || /\bVita\b/.test(product))) {
      name = 'Android Browser';
      os = /\bAndroid\b/.test(os) ? os : 'Android';
    }
    // detect false positives for Firefox/Safari
    else if (!name || (data = !/\bMinefield\b|\(Android;/i.test(ua) && /\b(?:Firefox|Safari)\b/.exec(name))) {
      // escape the `/` for Firefox 1
      if (name && !product && /[\/,]|^[^(]+?\)/.test(ua.slice(ua.indexOf(data + '/') + 8))) {
        // clear name of false positives
        name = null;
      }
      // reassign a generic name
      if ((data = product || manufacturer || os) &&
          (product || manufacturer || /\b(?:Android|Symbian OS|Tablet OS|webOS)\b/.test(os))) {
        name = /[a-z]+(?: Hat)?/i.exec(/\bAndroid\b/.test(os) ? os : data) + ' Browser';
      }
    }
    // detect Firefox OS
    if ((data = /\((Mobile|Tablet).*?Firefox\b/i.exec(ua)) && data[1]) {
      os = 'Firefox OS';
      if (!product) {
        product = data[1];
      }
    }
    // detect non-Opera versions (order is important)
    if (!version) {
      version = getVersion([
        '(?:Cloud9|CriOS|CrMo|IEMobile|Iron|Opera ?Mini|OPiOS|OPR|Raven|Silk(?!/[\\d.]+$))',
        'Version',
        qualify(name),
        '(?:Firefox|Minefield|NetFront)'
      ]);
    }
    // detect stubborn layout engines
    if (layout == 'iCab' && parseFloat(version) > 3) {
      layout = ['WebKit'];
    } else if (
        layout != 'Trident' &&
        (data =
          /\bOpera\b/.test(name) && (/\bOPR\b/.test(ua) ? 'Blink' : 'Presto') ||
          /\b(?:Midori|Nook|Safari)\b/i.test(ua) && 'WebKit' ||
          !layout && /\bMSIE\b/i.test(ua) && (os == 'Mac OS' ? 'Tasman' : 'Trident')
        )
    ) {
      layout = [data];
    }
    // detect NetFront on PlayStation
    else if (/\bPlayStation\b(?! Vita\b)/i.test(name) && layout == 'WebKit') {
      layout = ['NetFront'];
    }
    // detect Windows Phone 7 desktop mode
    if (name == 'IE' && (data = (/; *(?:XBLWP|ZuneWP)(\d+)/i.exec(ua) || 0)[1])) {
      name += ' Mobile';
      os = 'Windows Phone ' + (/\+$/.test(data) ? data : data + '.x');
      description.unshift('desktop mode');
    }
    // detect Windows Phone 8+ desktop mode
    else if (/\bWPDesktop\b/i.test(ua)) {
      name = 'IE Mobile';
      os = 'Windows Phone 8+';
      description.unshift('desktop mode');
      version || (version = (/\brv:([\d.]+)/.exec(ua) || 0)[1]);
    }
    // detect IE 11 and above
    else if (name != 'IE' && layout == 'Trident' && (data = /\brv:([\d.]+)/.exec(ua))) {
      if (!/\bWPDesktop\b/i.test(ua)) {
        if (name) {
          description.push('identifying as ' + name + (version ? ' ' + version : ''));
        }
        name = 'IE';
      }
      version = data[1];
    }
    // detect IE Tech Preview
    else if ((name == 'Chrome' || name != 'IE') && (data = /\bEdge\/([\d.]+)/.exec(ua))) {
      name = 'IE';
      version = data[1];
      layout = ['Trident'];
      description.unshift('platform preview');
    }
    // leverage environment features
    if (useFeatures) {
      // detect server-side environments
      // Rhino has a global function while others have a global object
      if (isHostType(context, 'global')) {
        if (java) {
          data = java.lang.System;
          arch = data.getProperty('os.arch');
          os = os || data.getProperty('os.name') + ' ' + data.getProperty('os.version');
        }
        if (isModuleScope && isHostType(context, 'system') && (data = [context.system])[0]) {
          os || (os = data[0].os || null);
          try {
            data[1] = context.require('ringo/engine').version;
            version = data[1].join('.');
            name = 'RingoJS';
          } catch(e) {
            if (data[0].global.system == context.system) {
              name = 'Narwhal';
            }
          }
        }
        else if (typeof context.process == 'object' && (data = context.process)) {
          name = 'Node.js';
          arch = data.arch;
          os = data.platform;
          version = /[\d.]+/.exec(data.version)[0];
        }
        else if (rhino) {
          name = 'Rhino';
        }
      }
      // detect Adobe AIR
      else if (getClassOf((data = context.runtime)) == airRuntimeClass) {
        name = 'Adobe AIR';
        os = data.flash.system.Capabilities.os;
      }
      // detect PhantomJS
      else if (getClassOf((data = context.phantom)) == phantomClass) {
        name = 'PhantomJS';
        version = (data = data.version || null) && (data.major + '.' + data.minor + '.' + data.patch);
      }
      // detect IE compatibility modes
      else if (typeof doc.documentMode == 'number' && (data = /\bTrident\/(\d+)/i.exec(ua))) {
        // we're in compatibility mode when the Trident version + 4 doesn't
        // equal the document mode
        version = [version, doc.documentMode];
        if ((data = +data[1] + 4) != version[1]) {
          description.push('IE ' + version[1] + ' mode');
          layout && (layout[1] = '');
          version[1] = data;
        }
        version = name == 'IE' ? String(version[1].toFixed(1)) : version[0];
      }
      os = os && format(os);
    }
    // detect prerelease phases
    if (version && (data =
          /(?:[ab]|dp|pre|[ab]\d+pre)(?:\d+\+?)?$/i.exec(version) ||
          /(?:alpha|beta)(?: ?\d)?/i.exec(ua + ';' + (useFeatures && nav.appMinorVersion)) ||
          /\bMinefield\b/i.test(ua) && 'a'
        )) {
      prerelease = /b/i.test(data) ? 'beta' : 'alpha';
      version = version.replace(RegExp(data + '\\+?$'), '') +
        (prerelease == 'beta' ? beta : alpha) + (/\d+\+?/.exec(data) || '');
    }
    // detect Firefox Mobile
    if (name == 'Fennec' || name == 'Firefox' && /\b(?:Android|Firefox OS)\b/.test(os)) {
      name = 'Firefox Mobile';
    }
    // obscure Maxthon's unreliable version
    else if (name == 'Maxthon' && version) {
      version = version.replace(/\.[\d.]+/, '.x');
    }
    // detect Silk desktop/accelerated modes
    else if (name == 'Silk') {
      if (!/\bMobi/i.test(ua)) {
        os = 'Android';
        description.unshift('desktop mode');
      }
      if (/Accelerated *= *true/i.test(ua)) {
        description.unshift('accelerated');
      }
    }
    // detect Xbox 360 and Xbox One
    else if (/\bXbox\b/i.test(product)) {
      os = null;
      if (product == 'Xbox 360' && /\bIEMobile\b/.test(ua)) {
        description.unshift('mobile mode');
      }
    }
    // add mobile postfix
    else if ((/^(?:Chrome|IE|Opera)$/.test(name) || name && !product && !/Browser|Mobi/.test(name)) &&
        (os == 'Windows CE' || /Mobi/i.test(ua))) {
      name += ' Mobile';
    }
    // detect IE platform preview
    else if (name == 'IE' && useFeatures && context.external === null) {
      description.unshift('platform preview');
    }
    // detect BlackBerry OS version
    // http://docs.blackberry.com/en/developers/deliverables/18169/HTTP_headers_sent_by_BB_Browser_1234911_11.jsp
    else if ((/\bBlackBerry\b/.test(product) || /\bBB10\b/.test(ua)) && (data =
          (RegExp(product.replace(/ +/g, ' *') + '/([.\\d]+)', 'i').exec(ua) || 0)[1] ||
          version
        )) {
      data = [data, /BB10/.test(ua)];
      os = (data[1] ? (product = null, manufacturer = 'BlackBerry') : 'Device Software') + ' ' + data[0];
      version = null;
    }
    // detect Opera identifying/masking itself as another browser
    // http://www.opera.com/support/kb/view/843/
    else if (this != forOwn && (
          product != 'Wii' && (
            (useFeatures && opera) ||
            (/Opera/.test(name) && /\b(?:MSIE|Firefox)\b/i.test(ua)) ||
            (name == 'Firefox' && /\bOS X (?:\d+\.){2,}/.test(os)) ||
            (name == 'IE' && (
              (os && !/^Win/.test(os) && version > 5.5) ||
              /\bWindows XP\b/.test(os) && version > 8 ||
              version == 8 && !/\bTrident\b/.test(ua)
            ))
          )
        ) && !reOpera.test((data = parse.call(forOwn, ua.replace(reOpera, '') + ';'))) && data.name) {

      // when "indentifying", the UA contains both Opera and the other browser's name
      data = 'ing as ' + data.name + ((data = data.version) ? ' ' + data : '');
      if (reOpera.test(name)) {
        if (/\bIE\b/.test(data) && os == 'Mac OS') {
          os = null;
        }
        data = 'identify' + data;
      }
      // when "masking", the UA contains only the other browser's name
      else {
        data = 'mask' + data;
        if (operaClass) {
          name = format(operaClass.replace(/([a-z])([A-Z])/g, '$1 $2'));
        } else {
          name = 'Opera';
        }
        if (/\bIE\b/.test(data)) {
          os = null;
        }
        if (!useFeatures) {
          version = null;
        }
      }
      layout = ['Presto'];
      description.push(data);
    }
    // detect WebKit Nightly and approximate Chrome/Safari versions
    if ((data = (/\bAppleWebKit\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
      // correct build for numeric comparison
      // (e.g. "532.5" becomes "532.05")
      data = [parseFloat(data.replace(/\.(\d)$/, '.0$1')), data];
      // nightly builds are postfixed with a `+`
      if (name == 'Safari' && data[1].slice(-1) == '+') {
        name = 'WebKit Nightly';
        prerelease = 'alpha';
        version = data[1].slice(0, -1);
      }
      // clear incorrect browser versions
      else if (version == data[1] ||
          version == (data[2] = (/\bSafari\/([\d.]+\+?)/i.exec(ua) || 0)[1])) {
        version = null;
      }
      // use the full Chrome version when available
      data[1] = (/\bChrome\/([\d.]+)/i.exec(ua) || 0)[1];
      // detect Blink layout engine
      if (data[0] == 537.36 && data[2] == 537.36 && parseFloat(data[1]) >= 28 && name != 'IE') {
        layout = ['Blink'];
      }
      // detect JavaScriptCore
      // http://stackoverflow.com/questions/6768474/how-can-i-detect-which-javascript-engine-v8-or-jsc-is-used-at-runtime-in-androi
      if (!useFeatures || (!likeChrome && !data[1])) {
        layout && (layout[1] = 'like Safari');
        data = (data = data[0], data < 400 ? 1 : data < 500 ? 2 : data < 526 ? 3 : data < 533 ? 4 : data < 534 ? '4+' : data < 535 ? 5 : data < 537 ? 6 : data < 538 ? 7 : data < 601 ? 8 : '8');
      } else {
        layout && (layout[1] = 'like Chrome');
        data = data[1] || (data = data[0], data < 530 ? 1 : data < 532 ? 2 : data < 532.05 ? 3 : data < 533 ? 4 : data < 534.03 ? 5 : data < 534.07 ? 6 : data < 534.10 ? 7 : data < 534.13 ? 8 : data < 534.16 ? 9 : data < 534.24 ? 10 : data < 534.30 ? 11 : data < 535.01 ? 12 : data < 535.02 ? '13+' : data < 535.07 ? 15 : data < 535.11 ? 16 : data < 535.19 ? 17 : data < 536.05 ? 18 : data < 536.10 ? 19 : data < 537.01 ? 20 : data < 537.11 ? '21+' : data < 537.13 ? 23 : data < 537.18 ? 24 : data < 537.24 ? 25 : data < 537.36 ? 26 : layout != 'Blink' ? '27' : '28');
      }
      // add the postfix of ".x" or "+" for approximate versions
      layout && (layout[1] += ' ' + (data += typeof data == 'number' ? '.x' : /[.+]/.test(data) ? '' : '+'));
      // obscure version for some Safari 1-2 releases
      if (name == 'Safari' && (!version || parseInt(version) > 45)) {
        version = data;
      }
    }
    // detect Opera desktop modes
    if (name == 'Opera' &&  (data = /\bzbov|zvav$/.exec(os))) {
      name += ' ';
      description.unshift('desktop mode');
      if (data == 'zvav') {
        name += 'Mini';
        version = null;
      } else {
        name += 'Mobile';
      }
      os = os.replace(RegExp(' *' + data + '$'), '');
    }
    // detect Chrome desktop mode
    else if (name == 'Safari' && /\bChrome\b/.exec(layout && layout[1])) {
      description.unshift('desktop mode');
      name = 'Chrome Mobile';
      version = null;

      if (/\bOS X\b/.test(os)) {
        manufacturer = 'Apple';
        os = 'iOS 4.3+';
      } else {
        os = null;
      }
    }
    // strip incorrect OS versions
    if (version && version.indexOf((data = /[\d.]+$/.exec(os))) == 0 &&
        ua.indexOf('/' + data + '-') > -1) {
      os = trim(os.replace(data, ''));
    }
    // add layout engine
    if (layout && !/\b(?:Avant|Nook)\b/.test(name) && (
        /Browser|Lunascape|Maxthon/.test(name) ||
        /^(?:Adobe|Arora|Breach|Midori|Opera|Phantom|Rekonq|Rock|Sleipnir|Web)/.test(name) && layout[1])) {
      // don't add layout details to description if they are falsey
      (data = layout[layout.length - 1]) && description.push(data);
    }
    // combine contextual information
    if (description.length) {
      description = ['(' + description.join('; ') + ')'];
    }
    // append manufacturer
    if (manufacturer && product && product.indexOf(manufacturer) < 0) {
      description.push('on ' + manufacturer);
    }
    // append product
    if (product) {
      description.push((/^on /.test(description[description.length -1]) ? '' : 'on ') + product);
    }
    // parse OS into an object
    if (os) {
      data = / ([\d.+]+)$/.exec(os);
      isSpecialCasedOS = data && os.charAt(os.length - data[0].length - 1) == '/';
      os = {
        'architecture': 32,
        'family': (data && !isSpecialCasedOS) ? os.replace(data[0], '') : os,
        'version': data ? data[1] : null,
        'toString': function() {
          var version = this.version;
          return this.family + ((version && !isSpecialCasedOS) ? ' ' + version : '') + (this.architecture == 64 ? ' 64-bit' : '');
        }
      };
    }
    // add browser/OS architecture
    if ((data = /\b(?:AMD|IA|Win|WOW|x86_|x)64\b/i.exec(arch)) && !/\bi686\b/i.test(arch)) {
      if (os) {
        os.architecture = 64;
        os.family = os.family.replace(RegExp(' *' + data), '');
      }
      if (
          name && (/\bWOW64\b/i.test(ua) ||
          (useFeatures && /\w(?:86|32)$/.test(nav.cpuClass || nav.platform) && !/\bWin64; x64\b/i.test(ua)))
      ) {
        description.unshift('32-bit');
      }
    }

    ua || (ua = null);

    /*------------------------------------------------------------------------*/

    /**
     * The platform object.
     *
     * @name platform
     * @type Object
     */
    var platform = {};

    /**
     * The platform description.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.description = ua;

    /**
     * The name of the browser's layout engine.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.layout = layout && layout[0];

    /**
     * The name of the product's manufacturer.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.manufacturer = manufacturer;

    /**
     * The name of the browser/environment.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.name = name;

    /**
     * The alpha/beta release indicator.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.prerelease = prerelease;

    /**
     * The name of the product hosting the browser.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.product = product;

    /**
     * The browser's user agent string.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.ua = ua;

    /**
     * The browser/environment version.
     *
     * @memberOf platform
     * @type string|null
     */
    platform.version = name && version;

    /**
     * The name of the operating system.
     *
     * @memberOf platform
     * @type Object
     */
    platform.os = os || {

      /**
       * The CPU architecture the OS is built for.
       *
       * @memberOf platform.os
       * @type number|null
       */
      'architecture': null,

      /**
       * The family of the OS.
       *
       * Common values include:
       * "Windows", "Windows Server 2008 R2 / 7", "Windows Server 2008 / Vista",
       * "Windows XP", "OS X", "Ubuntu", "Debian", "Fedora", "Red Hat", "SuSE",
       * "Android", "iOS" and "Windows Phone"
       *
       * @memberOf platform.os
       * @type string|null
       */
      'family': null,

      /**
       * The version of the OS.
       *
       * @memberOf platform.os
       * @type string|null
       */
      'version': null,

      /**
       * Returns the OS string.
       *
       * @memberOf platform.os
       * @returns {string} The OS string.
       */
      'toString': function() { return 'null'; }
    };

    platform.parse = parse;
    platform.toString = toStringPlatform;

    if (platform.version) {
      description.unshift(version);
    }
    if (platform.name) {
      description.unshift(name);
    }
    if (os && name && !(os == String(os).split(' ')[0] && (os == name.split(' ')[0] || product))) {
      description.push(product ? '(' + os + ')' : 'on ' + os);
    }
    if (description.length) {
      platform.description = description.join(' ');
    }
    return platform;
  }

  /*--------------------------------------------------------------------------*/

  // export platform
  // some AMD build optimizers, like r.js, check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // define as an anonymous module so, through path mapping, it can be aliased
    define(function() {
      return parse();
    });
  }
  // check for `exports` after `define` in case a build optimizer adds an `exports` object
  else if (freeExports && freeModule) {
    // in Narwhal, Node.js, Rhino -require, or RingoJS
    forOwn(parse(), function(value, key) {
      freeExports[key] = value;
    });
  }
  // in a browser or Rhino
  else {
    root.platform = parse();
  }
}.call(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],32:[function(_dereq_,module,exports){
'use strict';

var asap = _dereq_('asap')

module.exports = Promise
function Promise(fn) {
  if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
  if (typeof fn !== 'function') throw new TypeError('not a function')
  var state = null
  var value = null
  var deferreds = []
  var self = this

  this.then = function(onFulfilled, onRejected) {
    return new Promise(function(resolve, reject) {
      handle(new Handler(onFulfilled, onRejected, resolve, reject))
    })
  }

  function handle(deferred) {
    if (state === null) {
      deferreds.push(deferred)
      return
    }
    asap(function() {
      var cb = state ? deferred.onFulfilled : deferred.onRejected
      if (cb === null) {
        (state ? deferred.resolve : deferred.reject)(value)
        return
      }
      var ret
      try {
        ret = cb(value)
      }
      catch (e) {
        deferred.reject(e)
        return
      }
      deferred.resolve(ret)
    })
  }

  function resolve(newValue) {
    try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
      if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
      if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
        var then = newValue.then
        if (typeof then === 'function') {
          doResolve(then.bind(newValue), resolve, reject)
          return
        }
      }
      state = true
      value = newValue
      finale()
    } catch (e) { reject(e) }
  }

  function reject(newValue) {
    state = false
    value = newValue
    finale()
  }

  function finale() {
    for (var i = 0, len = deferreds.length; i < len; i++)
      handle(deferreds[i])
    deferreds = null
  }

  doResolve(fn, resolve, reject)
}


function Handler(onFulfilled, onRejected, resolve, reject){
  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
  this.onRejected = typeof onRejected === 'function' ? onRejected : null
  this.resolve = resolve
  this.reject = reject
}

/**
 * Take a potentially misbehaving resolver function and make sure
 * onFulfilled and onRejected are only called once.
 *
 * Makes no guarantees about asynchrony.
 */
function doResolve(fn, onFulfilled, onRejected) {
  var done = false;
  try {
    fn(function (value) {
      if (done) return
      done = true
      onFulfilled(value)
    }, function (reason) {
      if (done) return
      done = true
      onRejected(reason)
    })
  } catch (ex) {
    if (done) return
    done = true
    onRejected(ex)
  }
}

},{"asap":34}],33:[function(_dereq_,module,exports){
'use strict';

//This file contains then/promise specific extensions to the core promise API

var Promise = _dereq_('./core.js')
var asap = _dereq_('asap')

module.exports = Promise

/* Static Functions */

function ValuePromise(value) {
  this.then = function (onFulfilled) {
    if (typeof onFulfilled !== 'function') return this
    return new Promise(function (resolve, reject) {
      asap(function () {
        try {
          resolve(onFulfilled(value))
        } catch (ex) {
          reject(ex);
        }
      })
    })
  }
}
ValuePromise.prototype = Object.create(Promise.prototype)

var TRUE = new ValuePromise(true)
var FALSE = new ValuePromise(false)
var NULL = new ValuePromise(null)
var UNDEFINED = new ValuePromise(undefined)
var ZERO = new ValuePromise(0)
var EMPTYSTRING = new ValuePromise('')

Promise.resolve = function (value) {
  if (value instanceof Promise) return value

  if (value === null) return NULL
  if (value === undefined) return UNDEFINED
  if (value === true) return TRUE
  if (value === false) return FALSE
  if (value === 0) return ZERO
  if (value === '') return EMPTYSTRING

  if (typeof value === 'object' || typeof value === 'function') {
    try {
      var then = value.then
      if (typeof then === 'function') {
        return new Promise(then.bind(value))
      }
    } catch (ex) {
      return new Promise(function (resolve, reject) {
        reject(ex)
      })
    }
  }

  return new ValuePromise(value)
}

Promise.from = Promise.cast = function (value) {
  var err = new Error('Promise.from and Promise.cast are deprecated, use Promise.resolve instead')
  err.name = 'Warning'
  console.warn(err.stack)
  return Promise.resolve(value)
}

Promise.denodeify = function (fn, argumentCount) {
  argumentCount = argumentCount || Infinity
  return function () {
    var self = this
    var args = Array.prototype.slice.call(arguments)
    return new Promise(function (resolve, reject) {
      while (args.length && args.length > argumentCount) {
        args.pop()
      }
      args.push(function (err, res) {
        if (err) reject(err)
        else resolve(res)
      })
      fn.apply(self, args)
    })
  }
}
Promise.nodeify = function (fn) {
  return function () {
    var args = Array.prototype.slice.call(arguments)
    var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
    try {
      return fn.apply(this, arguments).nodeify(callback)
    } catch (ex) {
      if (callback === null || typeof callback == 'undefined') {
        return new Promise(function (resolve, reject) { reject(ex) })
      } else {
        asap(function () {
          callback(ex)
        })
      }
    }
  }
}

Promise.all = function () {
  var calledWithArray = arguments.length === 1 && Array.isArray(arguments[0])
  var args = Array.prototype.slice.call(calledWithArray ? arguments[0] : arguments)

  if (!calledWithArray) {
    var err = new Error('Promise.all should be called with a single array, calling it with multiple arguments is deprecated')
    err.name = 'Warning'
    console.warn(err.stack)
  }

  return new Promise(function (resolve, reject) {
    if (args.length === 0) return resolve([])
    var remaining = args.length
    function res(i, val) {
      try {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          var then = val.then
          if (typeof then === 'function') {
            then.call(val, function (val) { res(i, val) }, reject)
            return
          }
        }
        args[i] = val
        if (--remaining === 0) {
          resolve(args);
        }
      } catch (ex) {
        reject(ex)
      }
    }
    for (var i = 0; i < args.length; i++) {
      res(i, args[i])
    }
  })
}

Promise.reject = function (value) {
  return new Promise(function (resolve, reject) { 
    reject(value);
  });
}

Promise.race = function (values) {
  return new Promise(function (resolve, reject) { 
    values.forEach(function(value){
      Promise.resolve(value).then(resolve, reject);
    })
  });
}

/* Prototype Methods */

Promise.prototype.done = function (onFulfilled, onRejected) {
  var self = arguments.length ? this.then.apply(this, arguments) : this
  self.then(null, function (err) {
    asap(function () {
      throw err
    })
  })
}

Promise.prototype.nodeify = function (callback) {
  if (typeof callback != 'function') return this

  this.then(function (value) {
    asap(function () {
      callback(null, value)
    })
  }, function (err) {
    asap(function () {
      callback(err)
    })
  })
}

Promise.prototype['catch'] = function (onRejected) {
  return this.then(null, onRejected);
}

},{"./core.js":32,"asap":34}],34:[function(_dereq_,module,exports){
(function (process){

// Use the fastest possible means to execute a task in a future turn
// of the event loop.

// linked list of tasks (single, with head node)
var head = {task: void 0, next: null};
var tail = head;
var flushing = false;
var requestFlush = void 0;
var isNodeJS = false;

function flush() {
    /* jshint loopfunc: true */

    while (head.next) {
        head = head.next;
        var task = head.task;
        head.task = void 0;
        var domain = head.domain;

        if (domain) {
            head.domain = void 0;
            domain.enter();
        }

        try {
            task();

        } catch (e) {
            if (isNodeJS) {
                // In node, uncaught exceptions are considered fatal errors.
                // Re-throw them synchronously to interrupt flushing!

                // Ensure continuation if the uncaught exception is suppressed
                // listening "uncaughtException" events (as domains does).
                // Continue in next event to avoid tick recursion.
                if (domain) {
                    domain.exit();
                }
                setTimeout(flush, 0);
                if (domain) {
                    domain.enter();
                }

                throw e;

            } else {
                // In browsers, uncaught exceptions are not fatal.
                // Re-throw them asynchronously to avoid slow-downs.
                setTimeout(function() {
                   throw e;
                }, 0);
            }
        }

        if (domain) {
            domain.exit();
        }
    }

    flushing = false;
}

if (typeof process !== "undefined" && process.nextTick) {
    // Node.js before 0.9. Note that some fake-Node environments, like the
    // Mocha test runner, introduce a `process` global without a `nextTick`.
    isNodeJS = true;

    requestFlush = function () {
        process.nextTick(flush);
    };

} else if (typeof setImmediate === "function") {
    // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
    if (typeof window !== "undefined") {
        requestFlush = setImmediate.bind(window, flush);
    } else {
        requestFlush = function () {
            setImmediate(flush);
        };
    }

} else if (typeof MessageChannel !== "undefined") {
    // modern browsers
    // http://www.nonblocking.io/2011/06/windownexttick.html
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    requestFlush = function () {
        channel.port2.postMessage(0);
    };

} else {
    // old browsers
    requestFlush = function () {
        setTimeout(flush, 0);
    };
}

function asap(task) {
    tail = tail.next = {
        task: task,
        domain: isNodeJS && process.domain,
        next: null
    };

    if (!flushing) {
        flushing = true;
        requestFlush();
    }
};

module.exports = asap;


}).call(this,_dereq_("/home/dean/osc-workspaces/ws-bwallet-web/bwallet.js/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"))
},{"/home/dean/osc-workspaces/ws-bwallet-web/bwallet.js/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":27}],35:[function(_dereq_,module,exports){
var traverse = module.exports = function (obj) {
    return new Traverse(obj);
};

function Traverse (obj) {
    this.value = obj;
}

Traverse.prototype.get = function (ps) {
    var node = this.value;
    for (var i = 0; i < ps.length; i ++) {
        var key = ps[i];
        if (!node || !hasOwnProperty.call(node, key)) {
            node = undefined;
            break;
        }
        node = node[key];
    }
    return node;
};

Traverse.prototype.has = function (ps) {
    var node = this.value;
    for (var i = 0; i < ps.length; i ++) {
        var key = ps[i];
        if (!node || !hasOwnProperty.call(node, key)) {
            return false;
        }
        node = node[key];
    }
    return true;
};

Traverse.prototype.set = function (ps, value) {
    var node = this.value;
    for (var i = 0; i < ps.length - 1; i ++) {
        var key = ps[i];
        if (!hasOwnProperty.call(node, key)) node[key] = {};
        node = node[key];
    }
    node[ps[i]] = value;
    return value;
};

Traverse.prototype.map = function (cb) {
    return walk(this.value, cb, true);
};

Traverse.prototype.forEach = function (cb) {
    this.value = walk(this.value, cb, false);
    return this.value;
};

Traverse.prototype.reduce = function (cb, init) {
    var skip = arguments.length === 1;
    var acc = skip ? this.value : init;
    this.forEach(function (x) {
        if (!this.isRoot || !skip) {
            acc = cb.call(this, acc, x);
        }
    });
    return acc;
};

Traverse.prototype.paths = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.path); 
    });
    return acc;
};

Traverse.prototype.nodes = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.node);
    });
    return acc;
};

Traverse.prototype.clone = function () {
    var parents = [], nodes = [];
    
    return (function clone (src) {
        for (var i = 0; i < parents.length; i++) {
            if (parents[i] === src) {
                return nodes[i];
            }
        }
        
        if (typeof src === 'object' && src !== null) {
            var dst = copy(src);
            
            parents.push(src);
            nodes.push(dst);
            
            forEach(objectKeys(src), function (key) {
                dst[key] = clone(src[key]);
            });
            
            parents.pop();
            nodes.pop();
            return dst;
        }
        else {
            return src;
        }
    })(this.value);
};

function walk (root, cb, immutable) {
    var path = [];
    var parents = [];
    var alive = true;
    
    return (function walker (node_) {
        var node = immutable ? copy(node_) : node_;
        var modifiers = {};
        
        var keepGoing = true;
        
        var state = {
            node : node,
            node_ : node_,
            path : [].concat(path),
            parent : parents[parents.length - 1],
            parents : parents,
            key : path.slice(-1)[0],
            isRoot : path.length === 0,
            level : path.length,
            circular : null,
            update : function (x, stopHere) {
                if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                }
                state.node = x;
                if (stopHere) keepGoing = false;
            },
            'delete' : function (stopHere) {
                delete state.parent.node[state.key];
                if (stopHere) keepGoing = false;
            },
            remove : function (stopHere) {
                if (isArray(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                }
                else {
                    delete state.parent.node[state.key];
                }
                if (stopHere) keepGoing = false;
            },
            keys : null,
            before : function (f) { modifiers.before = f },
            after : function (f) { modifiers.after = f },
            pre : function (f) { modifiers.pre = f },
            post : function (f) { modifiers.post = f },
            stop : function () { alive = false },
            block : function () { keepGoing = false }
        };
        
        if (!alive) return state;
        
        function updateState() {
            if (typeof state.node === 'object' && state.node !== null) {
                if (!state.keys || state.node_ !== state.node) {
                    state.keys = objectKeys(state.node)
                }
                
                state.isLeaf = state.keys.length == 0;
                
                for (var i = 0; i < parents.length; i++) {
                    if (parents[i].node_ === node_) {
                        state.circular = parents[i];
                        break;
                    }
                }
            }
            else {
                state.isLeaf = true;
                state.keys = null;
            }
            
            state.notLeaf = !state.isLeaf;
            state.notRoot = !state.isRoot;
        }
        
        updateState();
        
        // use return values to update if defined
        var ret = cb.call(state, state.node);
        if (ret !== undefined && state.update) state.update(ret);
        
        if (modifiers.before) modifiers.before.call(state, state.node);
        
        if (!keepGoing) return state;
        
        if (typeof state.node == 'object'
        && state.node !== null && !state.circular) {
            parents.push(state);
            
            updateState();
            
            forEach(state.keys, function (key, i) {
                path.push(key);
                
                if (modifiers.pre) modifiers.pre.call(state, state.node[key], key);
                
                var child = walker(state.node[key]);
                if (immutable && hasOwnProperty.call(state.node, key)) {
                    state.node[key] = child.node;
                }
                
                child.isLast = i == state.keys.length - 1;
                child.isFirst = i == 0;
                
                if (modifiers.post) modifiers.post.call(state, child);
                
                path.pop();
            });
            parents.pop();
        }
        
        if (modifiers.after) modifiers.after.call(state, state.node);
        
        return state;
    })(root).node;
}

function copy (src) {
    if (typeof src === 'object' && src !== null) {
        var dst;
        
        if (isArray(src)) {
            dst = [];
        }
        else if (isDate(src)) {
            dst = new Date(src.getTime ? src.getTime() : src);
        }
        else if (isRegExp(src)) {
            dst = new RegExp(src);
        }
        else if (isError(src)) {
            dst = { message: src.message };
        }
        else if (isBoolean(src)) {
            dst = new Boolean(src);
        }
        else if (isNumber(src)) {
            dst = new Number(src);
        }
        else if (isString(src)) {
            dst = new String(src);
        }
        else if (Object.create && Object.getPrototypeOf) {
            dst = Object.create(Object.getPrototypeOf(src));
        }
        else if (src.constructor === Object) {
            dst = {};
        }
        else {
            var proto =
                (src.constructor && src.constructor.prototype)
                || src.__proto__
                || {}
            ;
            var T = function () {};
            T.prototype = proto;
            dst = new T;
        }
        
        forEach(objectKeys(src), function (key) {
            dst[key] = src[key];
        });
        return dst;
    }
    else return src;
}

var objectKeys = Object.keys || function keys (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

function toS (obj) { return Object.prototype.toString.call(obj) }
function isDate (obj) { return toS(obj) === '[object Date]' }
function isRegExp (obj) { return toS(obj) === '[object RegExp]' }
function isError (obj) { return toS(obj) === '[object Error]' }
function isBoolean (obj) { return toS(obj) === '[object Boolean]' }
function isNumber (obj) { return toS(obj) === '[object Number]' }
function isString (obj) { return toS(obj) === '[object String]' }

var isArray = Array.isArray || function isArray (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

forEach(objectKeys(Traverse.prototype), function (key) {
    traverse[key] = function (obj) {
        var args = [].slice.call(arguments, 1);
        var t = new Traverse(obj);
        return t[key].apply(t, args);
    };
});

var hasOwnProperty = Object.hasOwnProperty || function (obj, key) {
    return key in obj;
};

},{}],36:[function(_dereq_,module,exports){
(function (root) {
   "use strict";

/***** unorm.js *****/

/*
 * UnicodeNormalizer 1.0.0
 * Copyright (c) 2008 Matsuza
 * Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
 * $Date: 2008-06-05 16:44:17 +0200 (Thu, 05 Jun 2008) $
 * $Rev: 13309 $
 */

   var DEFAULT_FEATURE = [null, 0, {}];
   var CACHE_THRESHOLD = 10;
   var SBase = 0xAC00, LBase = 0x1100, VBase = 0x1161, TBase = 0x11A7, LCount = 19, VCount = 21, TCount = 28;
   var NCount = VCount * TCount; // 588
   var SCount = LCount * NCount; // 11172

   var UChar = function(cp, feature){
      this.codepoint = cp;
      this.feature = feature;
   };

   // Strategies
   var cache = {};
   var cacheCounter = [];
   for (var i = 0; i <= 0xFF; ++i){
      cacheCounter[i] = 0;
   }

   function fromCache(next, cp, needFeature){
      var ret = cache[cp];
      if(!ret){
         ret = next(cp, needFeature);
         if(!!ret.feature && ++cacheCounter[(cp >> 8) & 0xFF] > CACHE_THRESHOLD){
            cache[cp] = ret;
         }
      }
      return ret;
   }

   function fromData(next, cp, needFeature){
      var hash = cp & 0xFF00;
      var dunit = UChar.udata[hash] || {};
      var f = dunit[cp];
      return f ? new UChar(cp, f) : new UChar(cp, DEFAULT_FEATURE);
   }
   function fromCpOnly(next, cp, needFeature){
      return !!needFeature ? next(cp, needFeature) : new UChar(cp, null);
   }
   function fromRuleBasedJamo(next, cp, needFeature){
      var j;
      if(cp < LBase || (LBase + LCount <= cp && cp < SBase) || (SBase + SCount < cp)){
         return next(cp, needFeature);
      }
      if(LBase <= cp && cp < LBase + LCount){
         var c = {};
         var base = (cp - LBase) * VCount;
         for (j = 0; j < VCount; ++j){
            c[VBase + j] = SBase + TCount * (j + base);
         }
         return new UChar(cp, [,,c]);
      }

      var SIndex = cp - SBase;
      var TIndex = SIndex % TCount;
      var feature = [];
      if(TIndex !== 0){
         feature[0] = [SBase + SIndex - TIndex, TBase + TIndex];
      } else {
         feature[0] = [LBase + Math.floor(SIndex / NCount), VBase + Math.floor((SIndex % NCount) / TCount)];
         feature[2] = {};
         for (j = 1; j < TCount; ++j){
            feature[2][TBase + j] = cp + j;
         }
      }
      return new UChar(cp, feature);
   }
   function fromCpFilter(next, cp, needFeature){
      return cp < 60 || 13311 < cp && cp < 42607 ? new UChar(cp, DEFAULT_FEATURE) : next(cp, needFeature);
   }

   var strategies = [fromCpFilter, fromCache, fromCpOnly, fromRuleBasedJamo, fromData];

   UChar.fromCharCode = strategies.reduceRight(function (next, strategy) {
      return function (cp, needFeature) {
         return strategy(next, cp, needFeature);
      };
   }, null);

   UChar.isHighSurrogate = function(cp){
      return cp >= 0xD800 && cp <= 0xDBFF;
   };
   UChar.isLowSurrogate = function(cp){
      return cp >= 0xDC00 && cp <= 0xDFFF;
   };

   UChar.prototype.prepFeature = function(){
      if(!this.feature){
         this.feature = UChar.fromCharCode(this.codepoint, true).feature;
      }
   };

   UChar.prototype.toString = function(){
      if(this.codepoint < 0x10000){
         return String.fromCharCode(this.codepoint);
      } else {
         var x = this.codepoint - 0x10000;
         return String.fromCharCode(Math.floor(x / 0x400) + 0xD800, x % 0x400 + 0xDC00);
      }
   };

   UChar.prototype.getDecomp = function(){
      this.prepFeature();
      return this.feature[0] || null;
   };

   UChar.prototype.isCompatibility = function(){
      this.prepFeature();
      return !!this.feature[1] && (this.feature[1] & (1 << 8));
   };
   UChar.prototype.isExclude = function(){
      this.prepFeature();
      return !!this.feature[1] && (this.feature[1] & (1 << 9));
   };
   UChar.prototype.getCanonicalClass = function(){
      this.prepFeature();
      return !!this.feature[1] ? (this.feature[1] & 0xff) : 0;
   };
   UChar.prototype.getComposite = function(following){
      this.prepFeature();
      if(!this.feature[2]){
         return null;
      }
      var cp = this.feature[2][following.codepoint];
      return cp ? UChar.fromCharCode(cp) : null;
   };

   var UCharIterator = function(str){
      this.str = str;
      this.cursor = 0;
   };
   UCharIterator.prototype.next = function(){
      if(!!this.str && this.cursor < this.str.length){
         var cp = this.str.charCodeAt(this.cursor++);
         var d;
         if(UChar.isHighSurrogate(cp) && this.cursor < this.str.length && UChar.isLowSurrogate((d = this.str.charCodeAt(this.cursor)))){
            cp = (cp - 0xD800) * 0x400 + (d -0xDC00) + 0x10000;
            ++this.cursor;
         }
         return UChar.fromCharCode(cp);
      } else {
         this.str = null;
         return null;
      }
   };

   var RecursDecompIterator = function(it, cano){
      this.it = it;
      this.canonical = cano;
      this.resBuf = [];
   };

   RecursDecompIterator.prototype.next = function(){
      function recursiveDecomp(cano, uchar){
         var decomp = uchar.getDecomp();
         if(!!decomp && !(cano && uchar.isCompatibility())){
            var ret = [];
            for(var i = 0; i < decomp.length; ++i){
               var a = recursiveDecomp(cano, UChar.fromCharCode(decomp[i]));
               //ret.concat(a); //<-why does not this work?
               //following block is a workaround.
               for(var j = 0; j < a.length; ++j){
                  ret.push(a[j]);
               }
            }
            return ret;
         } else {
            return [uchar];
         }
      }
      if(this.resBuf.length === 0){
         var uchar = this.it.next();
         if(!uchar){
            return null;
         }
         this.resBuf = recursiveDecomp(this.canonical, uchar);
      }
      return this.resBuf.shift();
   };

   var DecompIterator = function(it){
      this.it = it;
      this.resBuf = [];
   };

   DecompIterator.prototype.next = function(){
      var cc;
      if(this.resBuf.length === 0){
         do{
            var uchar = this.it.next();
            if(!uchar){
               break;
            }
            cc = uchar.getCanonicalClass();
            var inspt = this.resBuf.length;
            if(cc !== 0){
               for(; inspt > 0; --inspt){
                  var uchar2 = this.resBuf[inspt - 1];
                  var cc2 = uchar2.getCanonicalClass();
                  if(cc2 <= cc){
                     break;
                  }
               }
            }
            this.resBuf.splice(inspt, 0, uchar);
         } while(cc !== 0);
      }
      return this.resBuf.shift();
   };

   var CompIterator = function(it){
      this.it = it;
      this.procBuf = [];
      this.resBuf = [];
      this.lastClass = null;
   };

   CompIterator.prototype.next = function(){
      while(this.resBuf.length === 0){
         var uchar = this.it.next();
         if(!uchar){
            this.resBuf = this.procBuf;
            this.procBuf = [];
            break;
         }
         if(this.procBuf.length === 0){
            this.lastClass = uchar.getCanonicalClass();
            this.procBuf.push(uchar);
         } else {
            var starter = this.procBuf[0];
            var composite = starter.getComposite(uchar);
            var cc = uchar.getCanonicalClass();
            if(!!composite && (this.lastClass < cc || this.lastClass === 0)){
               this.procBuf[0] = composite;
            } else {
               if(cc === 0){
                  this.resBuf = this.procBuf;
                  this.procBuf = [];
               }
               this.lastClass = cc;
               this.procBuf.push(uchar);
            }
         }
      }
      return this.resBuf.shift();
   };

   var createIterator = function(mode, str){
      switch(mode){
         case "NFD":
            return new DecompIterator(new RecursDecompIterator(new UCharIterator(str), true));
         case "NFKD":
            return new DecompIterator(new RecursDecompIterator(new UCharIterator(str), false));
         case "NFC":
            return new CompIterator(new DecompIterator(new RecursDecompIterator(new UCharIterator(str), true)));
         case "NFKC":
            return new CompIterator(new DecompIterator(new RecursDecompIterator(new UCharIterator(str), false)));
      }
      throw mode + " is invalid";
   };
   var normalize = function(mode, str){
      var it = createIterator(mode, str);
      var ret = "";
      var uchar;
      while(!!(uchar = it.next())){
         ret += uchar.toString();
      }
      return ret;
   };

   /* API functions */
   function nfd(str){
      return normalize("NFD", str);
   }

   function nfkd(str){
      return normalize("NFKD", str);
   }

   function nfc(str){
      return normalize("NFC", str);
   }

   function nfkc(str){
      return normalize("NFKC", str);
   }

/* Unicode data */
UChar.udata={
0:{60:[,,{824:8814}],61:[,,{824:8800}],62:[,,{824:8815}],65:[,,{768:192,769:193,770:194,771:195,772:256,774:258,775:550,776:196,777:7842,778:197,780:461,783:512,785:514,803:7840,805:7680,808:260}],66:[,,{775:7682,803:7684,817:7686}],67:[,,{769:262,770:264,775:266,780:268,807:199}],68:[,,{775:7690,780:270,803:7692,807:7696,813:7698,817:7694}],69:[,,{768:200,769:201,770:202,771:7868,772:274,774:276,775:278,776:203,777:7866,780:282,783:516,785:518,803:7864,807:552,808:280,813:7704,816:7706}],70:[,,{775:7710}],71:[,,{769:500,770:284,772:7712,774:286,775:288,780:486,807:290}],72:[,,{770:292,775:7714,776:7718,780:542,803:7716,807:7720,814:7722}],73:[,,{768:204,769:205,770:206,771:296,772:298,774:300,775:304,776:207,777:7880,780:463,783:520,785:522,803:7882,808:302,816:7724}],74:[,,{770:308}],75:[,,{769:7728,780:488,803:7730,807:310,817:7732}],76:[,,{769:313,780:317,803:7734,807:315,813:7740,817:7738}],77:[,,{769:7742,775:7744,803:7746}],78:[,,{768:504,769:323,771:209,775:7748,780:327,803:7750,807:325,813:7754,817:7752}],79:[,,{768:210,769:211,770:212,771:213,772:332,774:334,775:558,776:214,777:7886,779:336,780:465,783:524,785:526,795:416,803:7884,808:490}],80:[,,{769:7764,775:7766}],82:[,,{769:340,775:7768,780:344,783:528,785:530,803:7770,807:342,817:7774}],83:[,,{769:346,770:348,775:7776,780:352,803:7778,806:536,807:350}],84:[,,{775:7786,780:356,803:7788,806:538,807:354,813:7792,817:7790}],85:[,,{768:217,769:218,770:219,771:360,772:362,774:364,776:220,777:7910,778:366,779:368,780:467,783:532,785:534,795:431,803:7908,804:7794,808:370,813:7798,816:7796}],86:[,,{771:7804,803:7806}],87:[,,{768:7808,769:7810,770:372,775:7814,776:7812,803:7816}],88:[,,{775:7818,776:7820}],89:[,,{768:7922,769:221,770:374,771:7928,772:562,775:7822,776:376,777:7926,803:7924}],90:[,,{769:377,770:7824,775:379,780:381,803:7826,817:7828}],97:[,,{768:224,769:225,770:226,771:227,772:257,774:259,775:551,776:228,777:7843,778:229,780:462,783:513,785:515,803:7841,805:7681,808:261}],98:[,,{775:7683,803:7685,817:7687}],99:[,,{769:263,770:265,775:267,780:269,807:231}],100:[,,{775:7691,780:271,803:7693,807:7697,813:7699,817:7695}],101:[,,{768:232,769:233,770:234,771:7869,772:275,774:277,775:279,776:235,777:7867,780:283,783:517,785:519,803:7865,807:553,808:281,813:7705,816:7707}],102:[,,{775:7711}],103:[,,{769:501,770:285,772:7713,774:287,775:289,780:487,807:291}],104:[,,{770:293,775:7715,776:7719,780:543,803:7717,807:7721,814:7723,817:7830}],105:[,,{768:236,769:237,770:238,771:297,772:299,774:301,776:239,777:7881,780:464,783:521,785:523,803:7883,808:303,816:7725}],106:[,,{770:309,780:496}],107:[,,{769:7729,780:489,803:7731,807:311,817:7733}],108:[,,{769:314,780:318,803:7735,807:316,813:7741,817:7739}],109:[,,{769:7743,775:7745,803:7747}],110:[,,{768:505,769:324,771:241,775:7749,780:328,803:7751,807:326,813:7755,817:7753}],111:[,,{768:242,769:243,770:244,771:245,772:333,774:335,775:559,776:246,777:7887,779:337,780:466,783:525,785:527,795:417,803:7885,808:491}],112:[,,{769:7765,775:7767}],114:[,,{769:341,775:7769,780:345,783:529,785:531,803:7771,807:343,817:7775}],115:[,,{769:347,770:349,775:7777,780:353,803:7779,806:537,807:351}],116:[,,{775:7787,776:7831,780:357,803:7789,806:539,807:355,813:7793,817:7791}],117:[,,{768:249,769:250,770:251,771:361,772:363,774:365,776:252,777:7911,778:367,779:369,780:468,783:533,785:535,795:432,803:7909,804:7795,808:371,813:7799,816:7797}],118:[,,{771:7805,803:7807}],119:[,,{768:7809,769:7811,770:373,775:7815,776:7813,778:7832,803:7817}],120:[,,{775:7819,776:7821}],121:[,,{768:7923,769:253,770:375,771:7929,772:563,775:7823,776:255,777:7927,778:7833,803:7925}],122:[,,{769:378,770:7825,775:380,780:382,803:7827,817:7829}],160:[[32],256],168:[[32,776],256,{768:8173,769:901,834:8129}],170:[[97],256],175:[[32,772],256],178:[[50],256],179:[[51],256],180:[[32,769],256],181:[[956],256],184:[[32,807],256],185:[[49],256],186:[[111],256],188:[[49,8260,52],256],189:[[49,8260,50],256],190:[[51,8260,52],256],192:[[65,768]],193:[[65,769]],194:[[65,770],,{768:7846,769:7844,771:7850,777:7848}],195:[[65,771]],196:[[65,776],,{772:478}],197:[[65,778],,{769:506}],198:[,,{769:508,772:482}],199:[[67,807],,{769:7688}],200:[[69,768]],201:[[69,769]],202:[[69,770],,{768:7872,769:7870,771:7876,777:7874}],203:[[69,776]],204:[[73,768]],205:[[73,769]],206:[[73,770]],207:[[73,776],,{769:7726}],209:[[78,771]],210:[[79,768]],211:[[79,769]],212:[[79,770],,{768:7890,769:7888,771:7894,777:7892}],213:[[79,771],,{769:7756,772:556,776:7758}],214:[[79,776],,{772:554}],216:[,,{769:510}],217:[[85,768]],218:[[85,769]],219:[[85,770]],220:[[85,776],,{768:475,769:471,772:469,780:473}],221:[[89,769]],224:[[97,768]],225:[[97,769]],226:[[97,770],,{768:7847,769:7845,771:7851,777:7849}],227:[[97,771]],228:[[97,776],,{772:479}],229:[[97,778],,{769:507}],230:[,,{769:509,772:483}],231:[[99,807],,{769:7689}],232:[[101,768]],233:[[101,769]],234:[[101,770],,{768:7873,769:7871,771:7877,777:7875}],235:[[101,776]],236:[[105,768]],237:[[105,769]],238:[[105,770]],239:[[105,776],,{769:7727}],241:[[110,771]],242:[[111,768]],243:[[111,769]],244:[[111,770],,{768:7891,769:7889,771:7895,777:7893}],245:[[111,771],,{769:7757,772:557,776:7759}],246:[[111,776],,{772:555}],248:[,,{769:511}],249:[[117,768]],250:[[117,769]],251:[[117,770]],252:[[117,776],,{768:476,769:472,772:470,780:474}],253:[[121,769]],255:[[121,776]]},
256:{256:[[65,772]],257:[[97,772]],258:[[65,774],,{768:7856,769:7854,771:7860,777:7858}],259:[[97,774],,{768:7857,769:7855,771:7861,777:7859}],260:[[65,808]],261:[[97,808]],262:[[67,769]],263:[[99,769]],264:[[67,770]],265:[[99,770]],266:[[67,775]],267:[[99,775]],268:[[67,780]],269:[[99,780]],270:[[68,780]],271:[[100,780]],274:[[69,772],,{768:7700,769:7702}],275:[[101,772],,{768:7701,769:7703}],276:[[69,774]],277:[[101,774]],278:[[69,775]],279:[[101,775]],280:[[69,808]],281:[[101,808]],282:[[69,780]],283:[[101,780]],284:[[71,770]],285:[[103,770]],286:[[71,774]],287:[[103,774]],288:[[71,775]],289:[[103,775]],290:[[71,807]],291:[[103,807]],292:[[72,770]],293:[[104,770]],296:[[73,771]],297:[[105,771]],298:[[73,772]],299:[[105,772]],300:[[73,774]],301:[[105,774]],302:[[73,808]],303:[[105,808]],304:[[73,775]],306:[[73,74],256],307:[[105,106],256],308:[[74,770]],309:[[106,770]],310:[[75,807]],311:[[107,807]],313:[[76,769]],314:[[108,769]],315:[[76,807]],316:[[108,807]],317:[[76,780]],318:[[108,780]],319:[[76,183],256],320:[[108,183],256],323:[[78,769]],324:[[110,769]],325:[[78,807]],326:[[110,807]],327:[[78,780]],328:[[110,780]],329:[[700,110],256],332:[[79,772],,{768:7760,769:7762}],333:[[111,772],,{768:7761,769:7763}],334:[[79,774]],335:[[111,774]],336:[[79,779]],337:[[111,779]],340:[[82,769]],341:[[114,769]],342:[[82,807]],343:[[114,807]],344:[[82,780]],345:[[114,780]],346:[[83,769],,{775:7780}],347:[[115,769],,{775:7781}],348:[[83,770]],349:[[115,770]],350:[[83,807]],351:[[115,807]],352:[[83,780],,{775:7782}],353:[[115,780],,{775:7783}],354:[[84,807]],355:[[116,807]],356:[[84,780]],357:[[116,780]],360:[[85,771],,{769:7800}],361:[[117,771],,{769:7801}],362:[[85,772],,{776:7802}],363:[[117,772],,{776:7803}],364:[[85,774]],365:[[117,774]],366:[[85,778]],367:[[117,778]],368:[[85,779]],369:[[117,779]],370:[[85,808]],371:[[117,808]],372:[[87,770]],373:[[119,770]],374:[[89,770]],375:[[121,770]],376:[[89,776]],377:[[90,769]],378:[[122,769]],379:[[90,775]],380:[[122,775]],381:[[90,780]],382:[[122,780]],383:[[115],256,{775:7835}],416:[[79,795],,{768:7900,769:7898,771:7904,777:7902,803:7906}],417:[[111,795],,{768:7901,769:7899,771:7905,777:7903,803:7907}],431:[[85,795],,{768:7914,769:7912,771:7918,777:7916,803:7920}],432:[[117,795],,{768:7915,769:7913,771:7919,777:7917,803:7921}],439:[,,{780:494}],452:[[68,381],256],453:[[68,382],256],454:[[100,382],256],455:[[76,74],256],456:[[76,106],256],457:[[108,106],256],458:[[78,74],256],459:[[78,106],256],460:[[110,106],256],461:[[65,780]],462:[[97,780]],463:[[73,780]],464:[[105,780]],465:[[79,780]],466:[[111,780]],467:[[85,780]],468:[[117,780]],469:[[220,772]],470:[[252,772]],471:[[220,769]],472:[[252,769]],473:[[220,780]],474:[[252,780]],475:[[220,768]],476:[[252,768]],478:[[196,772]],479:[[228,772]],480:[[550,772]],481:[[551,772]],482:[[198,772]],483:[[230,772]],486:[[71,780]],487:[[103,780]],488:[[75,780]],489:[[107,780]],490:[[79,808],,{772:492}],491:[[111,808],,{772:493}],492:[[490,772]],493:[[491,772]],494:[[439,780]],495:[[658,780]],496:[[106,780]],497:[[68,90],256],498:[[68,122],256],499:[[100,122],256],500:[[71,769]],501:[[103,769]],504:[[78,768]],505:[[110,768]],506:[[197,769]],507:[[229,769]],508:[[198,769]],509:[[230,769]],510:[[216,769]],511:[[248,769]],66045:[,220]},
512:{512:[[65,783]],513:[[97,783]],514:[[65,785]],515:[[97,785]],516:[[69,783]],517:[[101,783]],518:[[69,785]],519:[[101,785]],520:[[73,783]],521:[[105,783]],522:[[73,785]],523:[[105,785]],524:[[79,783]],525:[[111,783]],526:[[79,785]],527:[[111,785]],528:[[82,783]],529:[[114,783]],530:[[82,785]],531:[[114,785]],532:[[85,783]],533:[[117,783]],534:[[85,785]],535:[[117,785]],536:[[83,806]],537:[[115,806]],538:[[84,806]],539:[[116,806]],542:[[72,780]],543:[[104,780]],550:[[65,775],,{772:480}],551:[[97,775],,{772:481}],552:[[69,807],,{774:7708}],553:[[101,807],,{774:7709}],554:[[214,772]],555:[[246,772]],556:[[213,772]],557:[[245,772]],558:[[79,775],,{772:560}],559:[[111,775],,{772:561}],560:[[558,772]],561:[[559,772]],562:[[89,772]],563:[[121,772]],658:[,,{780:495}],688:[[104],256],689:[[614],256],690:[[106],256],691:[[114],256],692:[[633],256],693:[[635],256],694:[[641],256],695:[[119],256],696:[[121],256],728:[[32,774],256],729:[[32,775],256],730:[[32,778],256],731:[[32,808],256],732:[[32,771],256],733:[[32,779],256],736:[[611],256],737:[[108],256],738:[[115],256],739:[[120],256],740:[[661],256]},
768:{768:[,230],769:[,230],770:[,230],771:[,230],772:[,230],773:[,230],774:[,230],775:[,230],776:[,230,{769:836}],777:[,230],778:[,230],779:[,230],780:[,230],781:[,230],782:[,230],783:[,230],784:[,230],785:[,230],786:[,230],787:[,230],788:[,230],789:[,232],790:[,220],791:[,220],792:[,220],793:[,220],794:[,232],795:[,216],796:[,220],797:[,220],798:[,220],799:[,220],800:[,220],801:[,202],802:[,202],803:[,220],804:[,220],805:[,220],806:[,220],807:[,202],808:[,202],809:[,220],810:[,220],811:[,220],812:[,220],813:[,220],814:[,220],815:[,220],816:[,220],817:[,220],818:[,220],819:[,220],820:[,1],821:[,1],822:[,1],823:[,1],824:[,1],825:[,220],826:[,220],827:[,220],828:[,220],829:[,230],830:[,230],831:[,230],832:[[768],230],833:[[769],230],834:[,230],835:[[787],230],836:[[776,769],230],837:[,240],838:[,230],839:[,220],840:[,220],841:[,220],842:[,230],843:[,230],844:[,230],845:[,220],846:[,220],848:[,230],849:[,230],850:[,230],851:[,220],852:[,220],853:[,220],854:[,220],855:[,230],856:[,232],857:[,220],858:[,220],859:[,230],860:[,233],861:[,234],862:[,234],863:[,233],864:[,234],865:[,234],866:[,233],867:[,230],868:[,230],869:[,230],870:[,230],871:[,230],872:[,230],873:[,230],874:[,230],875:[,230],876:[,230],877:[,230],878:[,230],879:[,230],884:[[697]],890:[[32,837],256],894:[[59]],900:[[32,769],256],901:[[168,769]],902:[[913,769]],903:[[183]],904:[[917,769]],905:[[919,769]],906:[[921,769]],908:[[927,769]],910:[[933,769]],911:[[937,769]],912:[[970,769]],913:[,,{768:8122,769:902,772:8121,774:8120,787:7944,788:7945,837:8124}],917:[,,{768:8136,769:904,787:7960,788:7961}],919:[,,{768:8138,769:905,787:7976,788:7977,837:8140}],921:[,,{768:8154,769:906,772:8153,774:8152,776:938,787:7992,788:7993}],927:[,,{768:8184,769:908,787:8008,788:8009}],929:[,,{788:8172}],933:[,,{768:8170,769:910,772:8169,774:8168,776:939,788:8025}],937:[,,{768:8186,769:911,787:8040,788:8041,837:8188}],938:[[921,776]],939:[[933,776]],940:[[945,769],,{837:8116}],941:[[949,769]],942:[[951,769],,{837:8132}],943:[[953,769]],944:[[971,769]],945:[,,{768:8048,769:940,772:8113,774:8112,787:7936,788:7937,834:8118,837:8115}],949:[,,{768:8050,769:941,787:7952,788:7953}],951:[,,{768:8052,769:942,787:7968,788:7969,834:8134,837:8131}],953:[,,{768:8054,769:943,772:8145,774:8144,776:970,787:7984,788:7985,834:8150}],959:[,,{768:8056,769:972,787:8000,788:8001}],961:[,,{787:8164,788:8165}],965:[,,{768:8058,769:973,772:8161,774:8160,776:971,787:8016,788:8017,834:8166}],969:[,,{768:8060,769:974,787:8032,788:8033,834:8182,837:8179}],970:[[953,776],,{768:8146,769:912,834:8151}],971:[[965,776],,{768:8162,769:944,834:8167}],972:[[959,769]],973:[[965,769]],974:[[969,769],,{837:8180}],976:[[946],256],977:[[952],256],978:[[933],256,{769:979,776:980}],979:[[978,769]],980:[[978,776]],981:[[966],256],982:[[960],256],1008:[[954],256],1009:[[961],256],1010:[[962],256],1012:[[920],256],1013:[[949],256],1017:[[931],256]},
1024:{1024:[[1045,768]],1025:[[1045,776]],1027:[[1043,769]],1030:[,,{776:1031}],1031:[[1030,776]],1036:[[1050,769]],1037:[[1048,768]],1038:[[1059,774]],1040:[,,{774:1232,776:1234}],1043:[,,{769:1027}],1045:[,,{768:1024,774:1238,776:1025}],1046:[,,{774:1217,776:1244}],1047:[,,{776:1246}],1048:[,,{768:1037,772:1250,774:1049,776:1252}],1049:[[1048,774]],1050:[,,{769:1036}],1054:[,,{776:1254}],1059:[,,{772:1262,774:1038,776:1264,779:1266}],1063:[,,{776:1268}],1067:[,,{776:1272}],1069:[,,{776:1260}],1072:[,,{774:1233,776:1235}],1075:[,,{769:1107}],1077:[,,{768:1104,774:1239,776:1105}],1078:[,,{774:1218,776:1245}],1079:[,,{776:1247}],1080:[,,{768:1117,772:1251,774:1081,776:1253}],1081:[[1080,774]],1082:[,,{769:1116}],1086:[,,{776:1255}],1091:[,,{772:1263,774:1118,776:1265,779:1267}],1095:[,,{776:1269}],1099:[,,{776:1273}],1101:[,,{776:1261}],1104:[[1077,768]],1105:[[1077,776]],1107:[[1075,769]],1110:[,,{776:1111}],1111:[[1110,776]],1116:[[1082,769]],1117:[[1080,768]],1118:[[1091,774]],1140:[,,{783:1142}],1141:[,,{783:1143}],1142:[[1140,783]],1143:[[1141,783]],1155:[,230],1156:[,230],1157:[,230],1158:[,230],1159:[,230],1217:[[1046,774]],1218:[[1078,774]],1232:[[1040,774]],1233:[[1072,774]],1234:[[1040,776]],1235:[[1072,776]],1238:[[1045,774]],1239:[[1077,774]],1240:[,,{776:1242}],1241:[,,{776:1243}],1242:[[1240,776]],1243:[[1241,776]],1244:[[1046,776]],1245:[[1078,776]],1246:[[1047,776]],1247:[[1079,776]],1250:[[1048,772]],1251:[[1080,772]],1252:[[1048,776]],1253:[[1080,776]],1254:[[1054,776]],1255:[[1086,776]],1256:[,,{776:1258}],1257:[,,{776:1259}],1258:[[1256,776]],1259:[[1257,776]],1260:[[1069,776]],1261:[[1101,776]],1262:[[1059,772]],1263:[[1091,772]],1264:[[1059,776]],1265:[[1091,776]],1266:[[1059,779]],1267:[[1091,779]],1268:[[1063,776]],1269:[[1095,776]],1272:[[1067,776]],1273:[[1099,776]]},
1280:{1415:[[1381,1410],256],1425:[,220],1426:[,230],1427:[,230],1428:[,230],1429:[,230],1430:[,220],1431:[,230],1432:[,230],1433:[,230],1434:[,222],1435:[,220],1436:[,230],1437:[,230],1438:[,230],1439:[,230],1440:[,230],1441:[,230],1442:[,220],1443:[,220],1444:[,220],1445:[,220],1446:[,220],1447:[,220],1448:[,230],1449:[,230],1450:[,220],1451:[,230],1452:[,230],1453:[,222],1454:[,228],1455:[,230],1456:[,10],1457:[,11],1458:[,12],1459:[,13],1460:[,14],1461:[,15],1462:[,16],1463:[,17],1464:[,18],1465:[,19],1466:[,19],1467:[,20],1468:[,21],1469:[,22],1471:[,23],1473:[,24],1474:[,25],1476:[,230],1477:[,220],1479:[,18]},
1536:{1552:[,230],1553:[,230],1554:[,230],1555:[,230],1556:[,230],1557:[,230],1558:[,230],1559:[,230],1560:[,30],1561:[,31],1562:[,32],1570:[[1575,1619]],1571:[[1575,1620]],1572:[[1608,1620]],1573:[[1575,1621]],1574:[[1610,1620]],1575:[,,{1619:1570,1620:1571,1621:1573}],1608:[,,{1620:1572}],1610:[,,{1620:1574}],1611:[,27],1612:[,28],1613:[,29],1614:[,30],1615:[,31],1616:[,32],1617:[,33],1618:[,34],1619:[,230],1620:[,230],1621:[,220],1622:[,220],1623:[,230],1624:[,230],1625:[,230],1626:[,230],1627:[,230],1628:[,220],1629:[,230],1630:[,230],1631:[,220],1648:[,35],1653:[[1575,1652],256],1654:[[1608,1652],256],1655:[[1735,1652],256],1656:[[1610,1652],256],1728:[[1749,1620]],1729:[,,{1620:1730}],1730:[[1729,1620]],1746:[,,{1620:1747}],1747:[[1746,1620]],1749:[,,{1620:1728}],1750:[,230],1751:[,230],1752:[,230],1753:[,230],1754:[,230],1755:[,230],1756:[,230],1759:[,230],1760:[,230],1761:[,230],1762:[,230],1763:[,220],1764:[,230],1767:[,230],1768:[,230],1770:[,220],1771:[,230],1772:[,230],1773:[,220]},
1792:{1809:[,36],1840:[,230],1841:[,220],1842:[,230],1843:[,230],1844:[,220],1845:[,230],1846:[,230],1847:[,220],1848:[,220],1849:[,220],1850:[,230],1851:[,220],1852:[,220],1853:[,230],1854:[,220],1855:[,230],1856:[,230],1857:[,230],1858:[,220],1859:[,230],1860:[,220],1861:[,230],1862:[,220],1863:[,230],1864:[,220],1865:[,230],1866:[,230],2027:[,230],2028:[,230],2029:[,230],2030:[,230],2031:[,230],2032:[,230],2033:[,230],2034:[,220],2035:[,230]},
2048:{2070:[,230],2071:[,230],2072:[,230],2073:[,230],2075:[,230],2076:[,230],2077:[,230],2078:[,230],2079:[,230],2080:[,230],2081:[,230],2082:[,230],2083:[,230],2085:[,230],2086:[,230],2087:[,230],2089:[,230],2090:[,230],2091:[,230],2092:[,230],2093:[,230],2137:[,220],2138:[,220],2139:[,220],2276:[,230],2277:[,230],2278:[,220],2279:[,230],2280:[,230],2281:[,220],2282:[,230],2283:[,230],2284:[,230],2285:[,220],2286:[,220],2287:[,220],2288:[,27],2289:[,28],2290:[,29],2291:[,230],2292:[,230],2293:[,230],2294:[,220],2295:[,230],2296:[,230],2297:[,220],2298:[,220],2299:[,230],2300:[,230],2301:[,230],2302:[,230]},
2304:{2344:[,,{2364:2345}],2345:[[2344,2364]],2352:[,,{2364:2353}],2353:[[2352,2364]],2355:[,,{2364:2356}],2356:[[2355,2364]],2364:[,7],2381:[,9],2385:[,230],2386:[,220],2387:[,230],2388:[,230],2392:[[2325,2364],512],2393:[[2326,2364],512],2394:[[2327,2364],512],2395:[[2332,2364],512],2396:[[2337,2364],512],2397:[[2338,2364],512],2398:[[2347,2364],512],2399:[[2351,2364],512],2492:[,7],2503:[,,{2494:2507,2519:2508}],2507:[[2503,2494]],2508:[[2503,2519]],2509:[,9],2524:[[2465,2492],512],2525:[[2466,2492],512],2527:[[2479,2492],512]},
2560:{2611:[[2610,2620],512],2614:[[2616,2620],512],2620:[,7],2637:[,9],2649:[[2582,2620],512],2650:[[2583,2620],512],2651:[[2588,2620],512],2654:[[2603,2620],512],2748:[,7],2765:[,9],68109:[,220],68111:[,230],68152:[,230],68153:[,1],68154:[,220],68159:[,9]},
2816:{2876:[,7],2887:[,,{2878:2891,2902:2888,2903:2892}],2888:[[2887,2902]],2891:[[2887,2878]],2892:[[2887,2903]],2893:[,9],2908:[[2849,2876],512],2909:[[2850,2876],512],2962:[,,{3031:2964}],2964:[[2962,3031]],3014:[,,{3006:3018,3031:3020}],3015:[,,{3006:3019}],3018:[[3014,3006]],3019:[[3015,3006]],3020:[[3014,3031]],3021:[,9]},
3072:{3142:[,,{3158:3144}],3144:[[3142,3158]],3149:[,9],3157:[,84],3158:[,91],3260:[,7],3263:[,,{3285:3264}],3264:[[3263,3285]],3270:[,,{3266:3274,3285:3271,3286:3272}],3271:[[3270,3285]],3272:[[3270,3286]],3274:[[3270,3266],,{3285:3275}],3275:[[3274,3285]],3277:[,9]},
3328:{3398:[,,{3390:3402,3415:3404}],3399:[,,{3390:3403}],3402:[[3398,3390]],3403:[[3399,3390]],3404:[[3398,3415]],3405:[,9],3530:[,9],3545:[,,{3530:3546,3535:3548,3551:3550}],3546:[[3545,3530]],3548:[[3545,3535],,{3530:3549}],3549:[[3548,3530]],3550:[[3545,3551]]},
3584:{3635:[[3661,3634],256],3640:[,103],3641:[,103],3642:[,9],3656:[,107],3657:[,107],3658:[,107],3659:[,107],3763:[[3789,3762],256],3768:[,118],3769:[,118],3784:[,122],3785:[,122],3786:[,122],3787:[,122],3804:[[3755,3737],256],3805:[[3755,3745],256]},
3840:{3852:[[3851],256],3864:[,220],3865:[,220],3893:[,220],3895:[,220],3897:[,216],3907:[[3906,4023],512],3917:[[3916,4023],512],3922:[[3921,4023],512],3927:[[3926,4023],512],3932:[[3931,4023],512],3945:[[3904,4021],512],3953:[,129],3954:[,130],3955:[[3953,3954],512],3956:[,132],3957:[[3953,3956],512],3958:[[4018,3968],512],3959:[[4018,3969],256],3960:[[4019,3968],512],3961:[[4019,3969],256],3962:[,130],3963:[,130],3964:[,130],3965:[,130],3968:[,130],3969:[[3953,3968],512],3970:[,230],3971:[,230],3972:[,9],3974:[,230],3975:[,230],3987:[[3986,4023],512],3997:[[3996,4023],512],4002:[[4001,4023],512],4007:[[4006,4023],512],4012:[[4011,4023],512],4025:[[3984,4021],512],4038:[,220]},
4096:{4133:[,,{4142:4134}],4134:[[4133,4142]],4151:[,7],4153:[,9],4154:[,9],4237:[,220],4348:[[4316],256],69702:[,9],69785:[,,{69818:69786}],69786:[[69785,69818]],69787:[,,{69818:69788}],69788:[[69787,69818]],69797:[,,{69818:69803}],69803:[[69797,69818]],69817:[,9],69818:[,7]},
4352:{69888:[,230],69889:[,230],69890:[,230],69934:[[69937,69927]],69935:[[69938,69927]],69937:[,,{69927:69934}],69938:[,,{69927:69935}],69939:[,9],69940:[,9],70080:[,9]},
4864:{4957:[,230],4958:[,230],4959:[,230]},
5632:{71350:[,9],71351:[,7]},
5888:{5908:[,9],5940:[,9],6098:[,9],6109:[,230]},
6144:{6313:[,228]},
6400:{6457:[,222],6458:[,230],6459:[,220]},
6656:{6679:[,230],6680:[,220],6752:[,9],6773:[,230],6774:[,230],6775:[,230],6776:[,230],6777:[,230],6778:[,230],6779:[,230],6780:[,230],6783:[,220]},
6912:{6917:[,,{6965:6918}],6918:[[6917,6965]],6919:[,,{6965:6920}],6920:[[6919,6965]],6921:[,,{6965:6922}],6922:[[6921,6965]],6923:[,,{6965:6924}],6924:[[6923,6965]],6925:[,,{6965:6926}],6926:[[6925,6965]],6929:[,,{6965:6930}],6930:[[6929,6965]],6964:[,7],6970:[,,{6965:6971}],6971:[[6970,6965]],6972:[,,{6965:6973}],6973:[[6972,6965]],6974:[,,{6965:6976}],6975:[,,{6965:6977}],6976:[[6974,6965]],6977:[[6975,6965]],6978:[,,{6965:6979}],6979:[[6978,6965]],6980:[,9],7019:[,230],7020:[,220],7021:[,230],7022:[,230],7023:[,230],7024:[,230],7025:[,230],7026:[,230],7027:[,230],7082:[,9],7083:[,9],7142:[,7],7154:[,9],7155:[,9]},
7168:{7223:[,7],7376:[,230],7377:[,230],7378:[,230],7380:[,1],7381:[,220],7382:[,220],7383:[,220],7384:[,220],7385:[,220],7386:[,230],7387:[,230],7388:[,220],7389:[,220],7390:[,220],7391:[,220],7392:[,230],7394:[,1],7395:[,1],7396:[,1],7397:[,1],7398:[,1],7399:[,1],7400:[,1],7405:[,220],7412:[,230]},
7424:{7468:[[65],256],7469:[[198],256],7470:[[66],256],7472:[[68],256],7473:[[69],256],7474:[[398],256],7475:[[71],256],7476:[[72],256],7477:[[73],256],7478:[[74],256],7479:[[75],256],7480:[[76],256],7481:[[77],256],7482:[[78],256],7484:[[79],256],7485:[[546],256],7486:[[80],256],7487:[[82],256],7488:[[84],256],7489:[[85],256],7490:[[87],256],7491:[[97],256],7492:[[592],256],7493:[[593],256],7494:[[7426],256],7495:[[98],256],7496:[[100],256],7497:[[101],256],7498:[[601],256],7499:[[603],256],7500:[[604],256],7501:[[103],256],7503:[[107],256],7504:[[109],256],7505:[[331],256],7506:[[111],256],7507:[[596],256],7508:[[7446],256],7509:[[7447],256],7510:[[112],256],7511:[[116],256],7512:[[117],256],7513:[[7453],256],7514:[[623],256],7515:[[118],256],7516:[[7461],256],7517:[[946],256],7518:[[947],256],7519:[[948],256],7520:[[966],256],7521:[[967],256],7522:[[105],256],7523:[[114],256],7524:[[117],256],7525:[[118],256],7526:[[946],256],7527:[[947],256],7528:[[961],256],7529:[[966],256],7530:[[967],256],7544:[[1085],256],7579:[[594],256],7580:[[99],256],7581:[[597],256],7582:[[240],256],7583:[[604],256],7584:[[102],256],7585:[[607],256],7586:[[609],256],7587:[[613],256],7588:[[616],256],7589:[[617],256],7590:[[618],256],7591:[[7547],256],7592:[[669],256],7593:[[621],256],7594:[[7557],256],7595:[[671],256],7596:[[625],256],7597:[[624],256],7598:[[626],256],7599:[[627],256],7600:[[628],256],7601:[[629],256],7602:[[632],256],7603:[[642],256],7604:[[643],256],7605:[[427],256],7606:[[649],256],7607:[[650],256],7608:[[7452],256],7609:[[651],256],7610:[[652],256],7611:[[122],256],7612:[[656],256],7613:[[657],256],7614:[[658],256],7615:[[952],256],7616:[,230],7617:[,230],7618:[,220],7619:[,230],7620:[,230],7621:[,230],7622:[,230],7623:[,230],7624:[,230],7625:[,230],7626:[,220],7627:[,230],7628:[,230],7629:[,234],7630:[,214],7631:[,220],7632:[,202],7633:[,230],7634:[,230],7635:[,230],7636:[,230],7637:[,230],7638:[,230],7639:[,230],7640:[,230],7641:[,230],7642:[,230],7643:[,230],7644:[,230],7645:[,230],7646:[,230],7647:[,230],7648:[,230],7649:[,230],7650:[,230],7651:[,230],7652:[,230],7653:[,230],7654:[,230],7676:[,233],7677:[,220],7678:[,230],7679:[,220]},
7680:{7680:[[65,805]],7681:[[97,805]],7682:[[66,775]],7683:[[98,775]],7684:[[66,803]],7685:[[98,803]],7686:[[66,817]],7687:[[98,817]],7688:[[199,769]],7689:[[231,769]],7690:[[68,775]],7691:[[100,775]],7692:[[68,803]],7693:[[100,803]],7694:[[68,817]],7695:[[100,817]],7696:[[68,807]],7697:[[100,807]],7698:[[68,813]],7699:[[100,813]],7700:[[274,768]],7701:[[275,768]],7702:[[274,769]],7703:[[275,769]],7704:[[69,813]],7705:[[101,813]],7706:[[69,816]],7707:[[101,816]],7708:[[552,774]],7709:[[553,774]],7710:[[70,775]],7711:[[102,775]],7712:[[71,772]],7713:[[103,772]],7714:[[72,775]],7715:[[104,775]],7716:[[72,803]],7717:[[104,803]],7718:[[72,776]],7719:[[104,776]],7720:[[72,807]],7721:[[104,807]],7722:[[72,814]],7723:[[104,814]],7724:[[73,816]],7725:[[105,816]],7726:[[207,769]],7727:[[239,769]],7728:[[75,769]],7729:[[107,769]],7730:[[75,803]],7731:[[107,803]],7732:[[75,817]],7733:[[107,817]],7734:[[76,803],,{772:7736}],7735:[[108,803],,{772:7737}],7736:[[7734,772]],7737:[[7735,772]],7738:[[76,817]],7739:[[108,817]],7740:[[76,813]],7741:[[108,813]],7742:[[77,769]],7743:[[109,769]],7744:[[77,775]],7745:[[109,775]],7746:[[77,803]],7747:[[109,803]],7748:[[78,775]],7749:[[110,775]],7750:[[78,803]],7751:[[110,803]],7752:[[78,817]],7753:[[110,817]],7754:[[78,813]],7755:[[110,813]],7756:[[213,769]],7757:[[245,769]],7758:[[213,776]],7759:[[245,776]],7760:[[332,768]],7761:[[333,768]],7762:[[332,769]],7763:[[333,769]],7764:[[80,769]],7765:[[112,769]],7766:[[80,775]],7767:[[112,775]],7768:[[82,775]],7769:[[114,775]],7770:[[82,803],,{772:7772}],7771:[[114,803],,{772:7773}],7772:[[7770,772]],7773:[[7771,772]],7774:[[82,817]],7775:[[114,817]],7776:[[83,775]],7777:[[115,775]],7778:[[83,803],,{775:7784}],7779:[[115,803],,{775:7785}],7780:[[346,775]],7781:[[347,775]],7782:[[352,775]],7783:[[353,775]],7784:[[7778,775]],7785:[[7779,775]],7786:[[84,775]],7787:[[116,775]],7788:[[84,803]],7789:[[116,803]],7790:[[84,817]],7791:[[116,817]],7792:[[84,813]],7793:[[116,813]],7794:[[85,804]],7795:[[117,804]],7796:[[85,816]],7797:[[117,816]],7798:[[85,813]],7799:[[117,813]],7800:[[360,769]],7801:[[361,769]],7802:[[362,776]],7803:[[363,776]],7804:[[86,771]],7805:[[118,771]],7806:[[86,803]],7807:[[118,803]],7808:[[87,768]],7809:[[119,768]],7810:[[87,769]],7811:[[119,769]],7812:[[87,776]],7813:[[119,776]],7814:[[87,775]],7815:[[119,775]],7816:[[87,803]],7817:[[119,803]],7818:[[88,775]],7819:[[120,775]],7820:[[88,776]],7821:[[120,776]],7822:[[89,775]],7823:[[121,775]],7824:[[90,770]],7825:[[122,770]],7826:[[90,803]],7827:[[122,803]],7828:[[90,817]],7829:[[122,817]],7830:[[104,817]],7831:[[116,776]],7832:[[119,778]],7833:[[121,778]],7834:[[97,702],256],7835:[[383,775]],7840:[[65,803],,{770:7852,774:7862}],7841:[[97,803],,{770:7853,774:7863}],7842:[[65,777]],7843:[[97,777]],7844:[[194,769]],7845:[[226,769]],7846:[[194,768]],7847:[[226,768]],7848:[[194,777]],7849:[[226,777]],7850:[[194,771]],7851:[[226,771]],7852:[[7840,770]],7853:[[7841,770]],7854:[[258,769]],7855:[[259,769]],7856:[[258,768]],7857:[[259,768]],7858:[[258,777]],7859:[[259,777]],7860:[[258,771]],7861:[[259,771]],7862:[[7840,774]],7863:[[7841,774]],7864:[[69,803],,{770:7878}],7865:[[101,803],,{770:7879}],7866:[[69,777]],7867:[[101,777]],7868:[[69,771]],7869:[[101,771]],7870:[[202,769]],7871:[[234,769]],7872:[[202,768]],7873:[[234,768]],7874:[[202,777]],7875:[[234,777]],7876:[[202,771]],7877:[[234,771]],7878:[[7864,770]],7879:[[7865,770]],7880:[[73,777]],7881:[[105,777]],7882:[[73,803]],7883:[[105,803]],7884:[[79,803],,{770:7896}],7885:[[111,803],,{770:7897}],7886:[[79,777]],7887:[[111,777]],7888:[[212,769]],7889:[[244,769]],7890:[[212,768]],7891:[[244,768]],7892:[[212,777]],7893:[[244,777]],7894:[[212,771]],7895:[[244,771]],7896:[[7884,770]],7897:[[7885,770]],7898:[[416,769]],7899:[[417,769]],7900:[[416,768]],7901:[[417,768]],7902:[[416,777]],7903:[[417,777]],7904:[[416,771]],7905:[[417,771]],7906:[[416,803]],7907:[[417,803]],7908:[[85,803]],7909:[[117,803]],7910:[[85,777]],7911:[[117,777]],7912:[[431,769]],7913:[[432,769]],7914:[[431,768]],7915:[[432,768]],7916:[[431,777]],7917:[[432,777]],7918:[[431,771]],7919:[[432,771]],7920:[[431,803]],7921:[[432,803]],7922:[[89,768]],7923:[[121,768]],7924:[[89,803]],7925:[[121,803]],7926:[[89,777]],7927:[[121,777]],7928:[[89,771]],7929:[[121,771]]},
7936:{7936:[[945,787],,{768:7938,769:7940,834:7942,837:8064}],7937:[[945,788],,{768:7939,769:7941,834:7943,837:8065}],7938:[[7936,768],,{837:8066}],7939:[[7937,768],,{837:8067}],7940:[[7936,769],,{837:8068}],7941:[[7937,769],,{837:8069}],7942:[[7936,834],,{837:8070}],7943:[[7937,834],,{837:8071}],7944:[[913,787],,{768:7946,769:7948,834:7950,837:8072}],7945:[[913,788],,{768:7947,769:7949,834:7951,837:8073}],7946:[[7944,768],,{837:8074}],7947:[[7945,768],,{837:8075}],7948:[[7944,769],,{837:8076}],7949:[[7945,769],,{837:8077}],7950:[[7944,834],,{837:8078}],7951:[[7945,834],,{837:8079}],7952:[[949,787],,{768:7954,769:7956}],7953:[[949,788],,{768:7955,769:7957}],7954:[[7952,768]],7955:[[7953,768]],7956:[[7952,769]],7957:[[7953,769]],7960:[[917,787],,{768:7962,769:7964}],7961:[[917,788],,{768:7963,769:7965}],7962:[[7960,768]],7963:[[7961,768]],7964:[[7960,769]],7965:[[7961,769]],7968:[[951,787],,{768:7970,769:7972,834:7974,837:8080}],7969:[[951,788],,{768:7971,769:7973,834:7975,837:8081}],7970:[[7968,768],,{837:8082}],7971:[[7969,768],,{837:8083}],7972:[[7968,769],,{837:8084}],7973:[[7969,769],,{837:8085}],7974:[[7968,834],,{837:8086}],7975:[[7969,834],,{837:8087}],7976:[[919,787],,{768:7978,769:7980,834:7982,837:8088}],7977:[[919,788],,{768:7979,769:7981,834:7983,837:8089}],7978:[[7976,768],,{837:8090}],7979:[[7977,768],,{837:8091}],7980:[[7976,769],,{837:8092}],7981:[[7977,769],,{837:8093}],7982:[[7976,834],,{837:8094}],7983:[[7977,834],,{837:8095}],7984:[[953,787],,{768:7986,769:7988,834:7990}],7985:[[953,788],,{768:7987,769:7989,834:7991}],7986:[[7984,768]],7987:[[7985,768]],7988:[[7984,769]],7989:[[7985,769]],7990:[[7984,834]],7991:[[7985,834]],7992:[[921,787],,{768:7994,769:7996,834:7998}],7993:[[921,788],,{768:7995,769:7997,834:7999}],7994:[[7992,768]],7995:[[7993,768]],7996:[[7992,769]],7997:[[7993,769]],7998:[[7992,834]],7999:[[7993,834]],8000:[[959,787],,{768:8002,769:8004}],8001:[[959,788],,{768:8003,769:8005}],8002:[[8000,768]],8003:[[8001,768]],8004:[[8000,769]],8005:[[8001,769]],8008:[[927,787],,{768:8010,769:8012}],8009:[[927,788],,{768:8011,769:8013}],8010:[[8008,768]],8011:[[8009,768]],8012:[[8008,769]],8013:[[8009,769]],8016:[[965,787],,{768:8018,769:8020,834:8022}],8017:[[965,788],,{768:8019,769:8021,834:8023}],8018:[[8016,768]],8019:[[8017,768]],8020:[[8016,769]],8021:[[8017,769]],8022:[[8016,834]],8023:[[8017,834]],8025:[[933,788],,{768:8027,769:8029,834:8031}],8027:[[8025,768]],8029:[[8025,769]],8031:[[8025,834]],8032:[[969,787],,{768:8034,769:8036,834:8038,837:8096}],8033:[[969,788],,{768:8035,769:8037,834:8039,837:8097}],8034:[[8032,768],,{837:8098}],8035:[[8033,768],,{837:8099}],8036:[[8032,769],,{837:8100}],8037:[[8033,769],,{837:8101}],8038:[[8032,834],,{837:8102}],8039:[[8033,834],,{837:8103}],8040:[[937,787],,{768:8042,769:8044,834:8046,837:8104}],8041:[[937,788],,{768:8043,769:8045,834:8047,837:8105}],8042:[[8040,768],,{837:8106}],8043:[[8041,768],,{837:8107}],8044:[[8040,769],,{837:8108}],8045:[[8041,769],,{837:8109}],8046:[[8040,834],,{837:8110}],8047:[[8041,834],,{837:8111}],8048:[[945,768],,{837:8114}],8049:[[940]],8050:[[949,768]],8051:[[941]],8052:[[951,768],,{837:8130}],8053:[[942]],8054:[[953,768]],8055:[[943]],8056:[[959,768]],8057:[[972]],8058:[[965,768]],8059:[[973]],8060:[[969,768],,{837:8178}],8061:[[974]],8064:[[7936,837]],8065:[[7937,837]],8066:[[7938,837]],8067:[[7939,837]],8068:[[7940,837]],8069:[[7941,837]],8070:[[7942,837]],8071:[[7943,837]],8072:[[7944,837]],8073:[[7945,837]],8074:[[7946,837]],8075:[[7947,837]],8076:[[7948,837]],8077:[[7949,837]],8078:[[7950,837]],8079:[[7951,837]],8080:[[7968,837]],8081:[[7969,837]],8082:[[7970,837]],8083:[[7971,837]],8084:[[7972,837]],8085:[[7973,837]],8086:[[7974,837]],8087:[[7975,837]],8088:[[7976,837]],8089:[[7977,837]],8090:[[7978,837]],8091:[[7979,837]],8092:[[7980,837]],8093:[[7981,837]],8094:[[7982,837]],8095:[[7983,837]],8096:[[8032,837]],8097:[[8033,837]],8098:[[8034,837]],8099:[[8035,837]],8100:[[8036,837]],8101:[[8037,837]],8102:[[8038,837]],8103:[[8039,837]],8104:[[8040,837]],8105:[[8041,837]],8106:[[8042,837]],8107:[[8043,837]],8108:[[8044,837]],8109:[[8045,837]],8110:[[8046,837]],8111:[[8047,837]],8112:[[945,774]],8113:[[945,772]],8114:[[8048,837]],8115:[[945,837]],8116:[[940,837]],8118:[[945,834],,{837:8119}],8119:[[8118,837]],8120:[[913,774]],8121:[[913,772]],8122:[[913,768]],8123:[[902]],8124:[[913,837]],8125:[[32,787],256],8126:[[953]],8127:[[32,787],256,{768:8141,769:8142,834:8143}],8128:[[32,834],256],8129:[[168,834]],8130:[[8052,837]],8131:[[951,837]],8132:[[942,837]],8134:[[951,834],,{837:8135}],8135:[[8134,837]],8136:[[917,768]],8137:[[904]],8138:[[919,768]],8139:[[905]],8140:[[919,837]],8141:[[8127,768]],8142:[[8127,769]],8143:[[8127,834]],8144:[[953,774]],8145:[[953,772]],8146:[[970,768]],8147:[[912]],8150:[[953,834]],8151:[[970,834]],8152:[[921,774]],8153:[[921,772]],8154:[[921,768]],8155:[[906]],8157:[[8190,768]],8158:[[8190,769]],8159:[[8190,834]],8160:[[965,774]],8161:[[965,772]],8162:[[971,768]],8163:[[944]],8164:[[961,787]],8165:[[961,788]],8166:[[965,834]],8167:[[971,834]],8168:[[933,774]],8169:[[933,772]],8170:[[933,768]],8171:[[910]],8172:[[929,788]],8173:[[168,768]],8174:[[901]],8175:[[96]],8178:[[8060,837]],8179:[[969,837]],8180:[[974,837]],8182:[[969,834],,{837:8183}],8183:[[8182,837]],8184:[[927,768]],8185:[[908]],8186:[[937,768]],8187:[[911]],8188:[[937,837]],8189:[[180]],8190:[[32,788],256,{768:8157,769:8158,834:8159}]},
8192:{8192:[[8194]],8193:[[8195]],8194:[[32],256],8195:[[32],256],8196:[[32],256],8197:[[32],256],8198:[[32],256],8199:[[32],256],8200:[[32],256],8201:[[32],256],8202:[[32],256],8209:[[8208],256],8215:[[32,819],256],8228:[[46],256],8229:[[46,46],256],8230:[[46,46,46],256],8239:[[32],256],8243:[[8242,8242],256],8244:[[8242,8242,8242],256],8246:[[8245,8245],256],8247:[[8245,8245,8245],256],8252:[[33,33],256],8254:[[32,773],256],8263:[[63,63],256],8264:[[63,33],256],8265:[[33,63],256],8279:[[8242,8242,8242,8242],256],8287:[[32],256],8304:[[48],256],8305:[[105],256],8308:[[52],256],8309:[[53],256],8310:[[54],256],8311:[[55],256],8312:[[56],256],8313:[[57],256],8314:[[43],256],8315:[[8722],256],8316:[[61],256],8317:[[40],256],8318:[[41],256],8319:[[110],256],8320:[[48],256],8321:[[49],256],8322:[[50],256],8323:[[51],256],8324:[[52],256],8325:[[53],256],8326:[[54],256],8327:[[55],256],8328:[[56],256],8329:[[57],256],8330:[[43],256],8331:[[8722],256],8332:[[61],256],8333:[[40],256],8334:[[41],256],8336:[[97],256],8337:[[101],256],8338:[[111],256],8339:[[120],256],8340:[[601],256],8341:[[104],256],8342:[[107],256],8343:[[108],256],8344:[[109],256],8345:[[110],256],8346:[[112],256],8347:[[115],256],8348:[[116],256],8360:[[82,115],256],8400:[,230],8401:[,230],8402:[,1],8403:[,1],8404:[,230],8405:[,230],8406:[,230],8407:[,230],8408:[,1],8409:[,1],8410:[,1],8411:[,230],8412:[,230],8417:[,230],8421:[,1],8422:[,1],8423:[,230],8424:[,220],8425:[,230],8426:[,1],8427:[,1],8428:[,220],8429:[,220],8430:[,220],8431:[,220],8432:[,230]},
8448:{8448:[[97,47,99],256],8449:[[97,47,115],256],8450:[[67],256],8451:[[176,67],256],8453:[[99,47,111],256],8454:[[99,47,117],256],8455:[[400],256],8457:[[176,70],256],8458:[[103],256],8459:[[72],256],8460:[[72],256],8461:[[72],256],8462:[[104],256],8463:[[295],256],8464:[[73],256],8465:[[73],256],8466:[[76],256],8467:[[108],256],8469:[[78],256],8470:[[78,111],256],8473:[[80],256],8474:[[81],256],8475:[[82],256],8476:[[82],256],8477:[[82],256],8480:[[83,77],256],8481:[[84,69,76],256],8482:[[84,77],256],8484:[[90],256],8486:[[937]],8488:[[90],256],8490:[[75]],8491:[[197]],8492:[[66],256],8493:[[67],256],8495:[[101],256],8496:[[69],256],8497:[[70],256],8499:[[77],256],8500:[[111],256],8501:[[1488],256],8502:[[1489],256],8503:[[1490],256],8504:[[1491],256],8505:[[105],256],8507:[[70,65,88],256],8508:[[960],256],8509:[[947],256],8510:[[915],256],8511:[[928],256],8512:[[8721],256],8517:[[68],256],8518:[[100],256],8519:[[101],256],8520:[[105],256],8521:[[106],256],8528:[[49,8260,55],256],8529:[[49,8260,57],256],8530:[[49,8260,49,48],256],8531:[[49,8260,51],256],8532:[[50,8260,51],256],8533:[[49,8260,53],256],8534:[[50,8260,53],256],8535:[[51,8260,53],256],8536:[[52,8260,53],256],8537:[[49,8260,54],256],8538:[[53,8260,54],256],8539:[[49,8260,56],256],8540:[[51,8260,56],256],8541:[[53,8260,56],256],8542:[[55,8260,56],256],8543:[[49,8260],256],8544:[[73],256],8545:[[73,73],256],8546:[[73,73,73],256],8547:[[73,86],256],8548:[[86],256],8549:[[86,73],256],8550:[[86,73,73],256],8551:[[86,73,73,73],256],8552:[[73,88],256],8553:[[88],256],8554:[[88,73],256],8555:[[88,73,73],256],8556:[[76],256],8557:[[67],256],8558:[[68],256],8559:[[77],256],8560:[[105],256],8561:[[105,105],256],8562:[[105,105,105],256],8563:[[105,118],256],8564:[[118],256],8565:[[118,105],256],8566:[[118,105,105],256],8567:[[118,105,105,105],256],8568:[[105,120],256],8569:[[120],256],8570:[[120,105],256],8571:[[120,105,105],256],8572:[[108],256],8573:[[99],256],8574:[[100],256],8575:[[109],256],8585:[[48,8260,51],256],8592:[,,{824:8602}],8594:[,,{824:8603}],8596:[,,{824:8622}],8602:[[8592,824]],8603:[[8594,824]],8622:[[8596,824]],8653:[[8656,824]],8654:[[8660,824]],8655:[[8658,824]],8656:[,,{824:8653}],8658:[,,{824:8655}],8660:[,,{824:8654}]},
8704:{8707:[,,{824:8708}],8708:[[8707,824]],8712:[,,{824:8713}],8713:[[8712,824]],8715:[,,{824:8716}],8716:[[8715,824]],8739:[,,{824:8740}],8740:[[8739,824]],8741:[,,{824:8742}],8742:[[8741,824]],8748:[[8747,8747],256],8749:[[8747,8747,8747],256],8751:[[8750,8750],256],8752:[[8750,8750,8750],256],8764:[,,{824:8769}],8769:[[8764,824]],8771:[,,{824:8772}],8772:[[8771,824]],8773:[,,{824:8775}],8775:[[8773,824]],8776:[,,{824:8777}],8777:[[8776,824]],8781:[,,{824:8813}],8800:[[61,824]],8801:[,,{824:8802}],8802:[[8801,824]],8804:[,,{824:8816}],8805:[,,{824:8817}],8813:[[8781,824]],8814:[[60,824]],8815:[[62,824]],8816:[[8804,824]],8817:[[8805,824]],8818:[,,{824:8820}],8819:[,,{824:8821}],8820:[[8818,824]],8821:[[8819,824]],8822:[,,{824:8824}],8823:[,,{824:8825}],8824:[[8822,824]],8825:[[8823,824]],8826:[,,{824:8832}],8827:[,,{824:8833}],8828:[,,{824:8928}],8829:[,,{824:8929}],8832:[[8826,824]],8833:[[8827,824]],8834:[,,{824:8836}],8835:[,,{824:8837}],8836:[[8834,824]],8837:[[8835,824]],8838:[,,{824:8840}],8839:[,,{824:8841}],8840:[[8838,824]],8841:[[8839,824]],8849:[,,{824:8930}],8850:[,,{824:8931}],8866:[,,{824:8876}],8872:[,,{824:8877}],8873:[,,{824:8878}],8875:[,,{824:8879}],8876:[[8866,824]],8877:[[8872,824]],8878:[[8873,824]],8879:[[8875,824]],8882:[,,{824:8938}],8883:[,,{824:8939}],8884:[,,{824:8940}],8885:[,,{824:8941}],8928:[[8828,824]],8929:[[8829,824]],8930:[[8849,824]],8931:[[8850,824]],8938:[[8882,824]],8939:[[8883,824]],8940:[[8884,824]],8941:[[8885,824]]},
8960:{9001:[[12296]],9002:[[12297]]},
9216:{9312:[[49],256],9313:[[50],256],9314:[[51],256],9315:[[52],256],9316:[[53],256],9317:[[54],256],9318:[[55],256],9319:[[56],256],9320:[[57],256],9321:[[49,48],256],9322:[[49,49],256],9323:[[49,50],256],9324:[[49,51],256],9325:[[49,52],256],9326:[[49,53],256],9327:[[49,54],256],9328:[[49,55],256],9329:[[49,56],256],9330:[[49,57],256],9331:[[50,48],256],9332:[[40,49,41],256],9333:[[40,50,41],256],9334:[[40,51,41],256],9335:[[40,52,41],256],9336:[[40,53,41],256],9337:[[40,54,41],256],9338:[[40,55,41],256],9339:[[40,56,41],256],9340:[[40,57,41],256],9341:[[40,49,48,41],256],9342:[[40,49,49,41],256],9343:[[40,49,50,41],256],9344:[[40,49,51,41],256],9345:[[40,49,52,41],256],9346:[[40,49,53,41],256],9347:[[40,49,54,41],256],9348:[[40,49,55,41],256],9349:[[40,49,56,41],256],9350:[[40,49,57,41],256],9351:[[40,50,48,41],256],9352:[[49,46],256],9353:[[50,46],256],9354:[[51,46],256],9355:[[52,46],256],9356:[[53,46],256],9357:[[54,46],256],9358:[[55,46],256],9359:[[56,46],256],9360:[[57,46],256],9361:[[49,48,46],256],9362:[[49,49,46],256],9363:[[49,50,46],256],9364:[[49,51,46],256],9365:[[49,52,46],256],9366:[[49,53,46],256],9367:[[49,54,46],256],9368:[[49,55,46],256],9369:[[49,56,46],256],9370:[[49,57,46],256],9371:[[50,48,46],256],9372:[[40,97,41],256],9373:[[40,98,41],256],9374:[[40,99,41],256],9375:[[40,100,41],256],9376:[[40,101,41],256],9377:[[40,102,41],256],9378:[[40,103,41],256],9379:[[40,104,41],256],9380:[[40,105,41],256],9381:[[40,106,41],256],9382:[[40,107,41],256],9383:[[40,108,41],256],9384:[[40,109,41],256],9385:[[40,110,41],256],9386:[[40,111,41],256],9387:[[40,112,41],256],9388:[[40,113,41],256],9389:[[40,114,41],256],9390:[[40,115,41],256],9391:[[40,116,41],256],9392:[[40,117,41],256],9393:[[40,118,41],256],9394:[[40,119,41],256],9395:[[40,120,41],256],9396:[[40,121,41],256],9397:[[40,122,41],256],9398:[[65],256],9399:[[66],256],9400:[[67],256],9401:[[68],256],9402:[[69],256],9403:[[70],256],9404:[[71],256],9405:[[72],256],9406:[[73],256],9407:[[74],256],9408:[[75],256],9409:[[76],256],9410:[[77],256],9411:[[78],256],9412:[[79],256],9413:[[80],256],9414:[[81],256],9415:[[82],256],9416:[[83],256],9417:[[84],256],9418:[[85],256],9419:[[86],256],9420:[[87],256],9421:[[88],256],9422:[[89],256],9423:[[90],256],9424:[[97],256],9425:[[98],256],9426:[[99],256],9427:[[100],256],9428:[[101],256],9429:[[102],256],9430:[[103],256],9431:[[104],256],9432:[[105],256],9433:[[106],256],9434:[[107],256],9435:[[108],256],9436:[[109],256],9437:[[110],256],9438:[[111],256],9439:[[112],256],9440:[[113],256],9441:[[114],256],9442:[[115],256],9443:[[116],256],9444:[[117],256],9445:[[118],256],9446:[[119],256],9447:[[120],256],9448:[[121],256],9449:[[122],256],9450:[[48],256]},
10752:{10764:[[8747,8747,8747,8747],256],10868:[[58,58,61],256],10869:[[61,61],256],10870:[[61,61,61],256],10972:[[10973,824],512]},
11264:{11388:[[106],256],11389:[[86],256],11503:[,230],11504:[,230],11505:[,230]},
11520:{11631:[[11617],256],11647:[,9],11744:[,230],11745:[,230],11746:[,230],11747:[,230],11748:[,230],11749:[,230],11750:[,230],11751:[,230],11752:[,230],11753:[,230],11754:[,230],11755:[,230],11756:[,230],11757:[,230],11758:[,230],11759:[,230],11760:[,230],11761:[,230],11762:[,230],11763:[,230],11764:[,230],11765:[,230],11766:[,230],11767:[,230],11768:[,230],11769:[,230],11770:[,230],11771:[,230],11772:[,230],11773:[,230],11774:[,230],11775:[,230]},
11776:{11935:[[27597],256],12019:[[40863],256]},
12032:{12032:[[19968],256],12033:[[20008],256],12034:[[20022],256],12035:[[20031],256],12036:[[20057],256],12037:[[20101],256],12038:[[20108],256],12039:[[20128],256],12040:[[20154],256],12041:[[20799],256],12042:[[20837],256],12043:[[20843],256],12044:[[20866],256],12045:[[20886],256],12046:[[20907],256],12047:[[20960],256],12048:[[20981],256],12049:[[20992],256],12050:[[21147],256],12051:[[21241],256],12052:[[21269],256],12053:[[21274],256],12054:[[21304],256],12055:[[21313],256],12056:[[21340],256],12057:[[21353],256],12058:[[21378],256],12059:[[21430],256],12060:[[21448],256],12061:[[21475],256],12062:[[22231],256],12063:[[22303],256],12064:[[22763],256],12065:[[22786],256],12066:[[22794],256],12067:[[22805],256],12068:[[22823],256],12069:[[22899],256],12070:[[23376],256],12071:[[23424],256],12072:[[23544],256],12073:[[23567],256],12074:[[23586],256],12075:[[23608],256],12076:[[23662],256],12077:[[23665],256],12078:[[24027],256],12079:[[24037],256],12080:[[24049],256],12081:[[24062],256],12082:[[24178],256],12083:[[24186],256],12084:[[24191],256],12085:[[24308],256],12086:[[24318],256],12087:[[24331],256],12088:[[24339],256],12089:[[24400],256],12090:[[24417],256],12091:[[24435],256],12092:[[24515],256],12093:[[25096],256],12094:[[25142],256],12095:[[25163],256],12096:[[25903],256],12097:[[25908],256],12098:[[25991],256],12099:[[26007],256],12100:[[26020],256],12101:[[26041],256],12102:[[26080],256],12103:[[26085],256],12104:[[26352],256],12105:[[26376],256],12106:[[26408],256],12107:[[27424],256],12108:[[27490],256],12109:[[27513],256],12110:[[27571],256],12111:[[27595],256],12112:[[27604],256],12113:[[27611],256],12114:[[27663],256],12115:[[27668],256],12116:[[27700],256],12117:[[28779],256],12118:[[29226],256],12119:[[29238],256],12120:[[29243],256],12121:[[29247],256],12122:[[29255],256],12123:[[29273],256],12124:[[29275],256],12125:[[29356],256],12126:[[29572],256],12127:[[29577],256],12128:[[29916],256],12129:[[29926],256],12130:[[29976],256],12131:[[29983],256],12132:[[29992],256],12133:[[30000],256],12134:[[30091],256],12135:[[30098],256],12136:[[30326],256],12137:[[30333],256],12138:[[30382],256],12139:[[30399],256],12140:[[30446],256],12141:[[30683],256],12142:[[30690],256],12143:[[30707],256],12144:[[31034],256],12145:[[31160],256],12146:[[31166],256],12147:[[31348],256],12148:[[31435],256],12149:[[31481],256],12150:[[31859],256],12151:[[31992],256],12152:[[32566],256],12153:[[32593],256],12154:[[32650],256],12155:[[32701],256],12156:[[32769],256],12157:[[32780],256],12158:[[32786],256],12159:[[32819],256],12160:[[32895],256],12161:[[32905],256],12162:[[33251],256],12163:[[33258],256],12164:[[33267],256],12165:[[33276],256],12166:[[33292],256],12167:[[33307],256],12168:[[33311],256],12169:[[33390],256],12170:[[33394],256],12171:[[33400],256],12172:[[34381],256],12173:[[34411],256],12174:[[34880],256],12175:[[34892],256],12176:[[34915],256],12177:[[35198],256],12178:[[35211],256],12179:[[35282],256],12180:[[35328],256],12181:[[35895],256],12182:[[35910],256],12183:[[35925],256],12184:[[35960],256],12185:[[35997],256],12186:[[36196],256],12187:[[36208],256],12188:[[36275],256],12189:[[36523],256],12190:[[36554],256],12191:[[36763],256],12192:[[36784],256],12193:[[36789],256],12194:[[37009],256],12195:[[37193],256],12196:[[37318],256],12197:[[37324],256],12198:[[37329],256],12199:[[38263],256],12200:[[38272],256],12201:[[38428],256],12202:[[38582],256],12203:[[38585],256],12204:[[38632],256],12205:[[38737],256],12206:[[38750],256],12207:[[38754],256],12208:[[38761],256],12209:[[38859],256],12210:[[38893],256],12211:[[38899],256],12212:[[38913],256],12213:[[39080],256],12214:[[39131],256],12215:[[39135],256],12216:[[39318],256],12217:[[39321],256],12218:[[39340],256],12219:[[39592],256],12220:[[39640],256],12221:[[39647],256],12222:[[39717],256],12223:[[39727],256],12224:[[39730],256],12225:[[39740],256],12226:[[39770],256],12227:[[40165],256],12228:[[40565],256],12229:[[40575],256],12230:[[40613],256],12231:[[40635],256],12232:[[40643],256],12233:[[40653],256],12234:[[40657],256],12235:[[40697],256],12236:[[40701],256],12237:[[40718],256],12238:[[40723],256],12239:[[40736],256],12240:[[40763],256],12241:[[40778],256],12242:[[40786],256],12243:[[40845],256],12244:[[40860],256],12245:[[40864],256]},
12288:{12288:[[32],256],12330:[,218],12331:[,228],12332:[,232],12333:[,222],12334:[,224],12335:[,224],12342:[[12306],256],12344:[[21313],256],12345:[[21316],256],12346:[[21317],256],12358:[,,{12441:12436}],12363:[,,{12441:12364}],12364:[[12363,12441]],12365:[,,{12441:12366}],12366:[[12365,12441]],12367:[,,{12441:12368}],12368:[[12367,12441]],12369:[,,{12441:12370}],12370:[[12369,12441]],12371:[,,{12441:12372}],12372:[[12371,12441]],12373:[,,{12441:12374}],12374:[[12373,12441]],12375:[,,{12441:12376}],12376:[[12375,12441]],12377:[,,{12441:12378}],12378:[[12377,12441]],12379:[,,{12441:12380}],12380:[[12379,12441]],12381:[,,{12441:12382}],12382:[[12381,12441]],12383:[,,{12441:12384}],12384:[[12383,12441]],12385:[,,{12441:12386}],12386:[[12385,12441]],12388:[,,{12441:12389}],12389:[[12388,12441]],12390:[,,{12441:12391}],12391:[[12390,12441]],12392:[,,{12441:12393}],12393:[[12392,12441]],12399:[,,{12441:12400,12442:12401}],12400:[[12399,12441]],12401:[[12399,12442]],12402:[,,{12441:12403,12442:12404}],12403:[[12402,12441]],12404:[[12402,12442]],12405:[,,{12441:12406,12442:12407}],12406:[[12405,12441]],12407:[[12405,12442]],12408:[,,{12441:12409,12442:12410}],12409:[[12408,12441]],12410:[[12408,12442]],12411:[,,{12441:12412,12442:12413}],12412:[[12411,12441]],12413:[[12411,12442]],12436:[[12358,12441]],12441:[,8],12442:[,8],12443:[[32,12441],256],12444:[[32,12442],256],12445:[,,{12441:12446}],12446:[[12445,12441]],12447:[[12424,12426],256],12454:[,,{12441:12532}],12459:[,,{12441:12460}],12460:[[12459,12441]],12461:[,,{12441:12462}],12462:[[12461,12441]],12463:[,,{12441:12464}],12464:[[12463,12441]],12465:[,,{12441:12466}],12466:[[12465,12441]],12467:[,,{12441:12468}],12468:[[12467,12441]],12469:[,,{12441:12470}],12470:[[12469,12441]],12471:[,,{12441:12472}],12472:[[12471,12441]],12473:[,,{12441:12474}],12474:[[12473,12441]],12475:[,,{12441:12476}],12476:[[12475,12441]],12477:[,,{12441:12478}],12478:[[12477,12441]],12479:[,,{12441:12480}],12480:[[12479,12441]],12481:[,,{12441:12482}],12482:[[12481,12441]],12484:[,,{12441:12485}],12485:[[12484,12441]],12486:[,,{12441:12487}],12487:[[12486,12441]],12488:[,,{12441:12489}],12489:[[12488,12441]],12495:[,,{12441:12496,12442:12497}],12496:[[12495,12441]],12497:[[12495,12442]],12498:[,,{12441:12499,12442:12500}],12499:[[12498,12441]],12500:[[12498,12442]],12501:[,,{12441:12502,12442:12503}],12502:[[12501,12441]],12503:[[12501,12442]],12504:[,,{12441:12505,12442:12506}],12505:[[12504,12441]],12506:[[12504,12442]],12507:[,,{12441:12508,12442:12509}],12508:[[12507,12441]],12509:[[12507,12442]],12527:[,,{12441:12535}],12528:[,,{12441:12536}],12529:[,,{12441:12537}],12530:[,,{12441:12538}],12532:[[12454,12441]],12535:[[12527,12441]],12536:[[12528,12441]],12537:[[12529,12441]],12538:[[12530,12441]],12541:[,,{12441:12542}],12542:[[12541,12441]],12543:[[12467,12488],256]},
12544:{12593:[[4352],256],12594:[[4353],256],12595:[[4522],256],12596:[[4354],256],12597:[[4524],256],12598:[[4525],256],12599:[[4355],256],12600:[[4356],256],12601:[[4357],256],12602:[[4528],256],12603:[[4529],256],12604:[[4530],256],12605:[[4531],256],12606:[[4532],256],12607:[[4533],256],12608:[[4378],256],12609:[[4358],256],12610:[[4359],256],12611:[[4360],256],12612:[[4385],256],12613:[[4361],256],12614:[[4362],256],12615:[[4363],256],12616:[[4364],256],12617:[[4365],256],12618:[[4366],256],12619:[[4367],256],12620:[[4368],256],12621:[[4369],256],12622:[[4370],256],12623:[[4449],256],12624:[[4450],256],12625:[[4451],256],12626:[[4452],256],12627:[[4453],256],12628:[[4454],256],12629:[[4455],256],12630:[[4456],256],12631:[[4457],256],12632:[[4458],256],12633:[[4459],256],12634:[[4460],256],12635:[[4461],256],12636:[[4462],256],12637:[[4463],256],12638:[[4464],256],12639:[[4465],256],12640:[[4466],256],12641:[[4467],256],12642:[[4468],256],12643:[[4469],256],12644:[[4448],256],12645:[[4372],256],12646:[[4373],256],12647:[[4551],256],12648:[[4552],256],12649:[[4556],256],12650:[[4558],256],12651:[[4563],256],12652:[[4567],256],12653:[[4569],256],12654:[[4380],256],12655:[[4573],256],12656:[[4575],256],12657:[[4381],256],12658:[[4382],256],12659:[[4384],256],12660:[[4386],256],12661:[[4387],256],12662:[[4391],256],12663:[[4393],256],12664:[[4395],256],12665:[[4396],256],12666:[[4397],256],12667:[[4398],256],12668:[[4399],256],12669:[[4402],256],12670:[[4406],256],12671:[[4416],256],12672:[[4423],256],12673:[[4428],256],12674:[[4593],256],12675:[[4594],256],12676:[[4439],256],12677:[[4440],256],12678:[[4441],256],12679:[[4484],256],12680:[[4485],256],12681:[[4488],256],12682:[[4497],256],12683:[[4498],256],12684:[[4500],256],12685:[[4510],256],12686:[[4513],256],12690:[[19968],256],12691:[[20108],256],12692:[[19977],256],12693:[[22235],256],12694:[[19978],256],12695:[[20013],256],12696:[[19979],256],12697:[[30002],256],12698:[[20057],256],12699:[[19993],256],12700:[[19969],256],12701:[[22825],256],12702:[[22320],256],12703:[[20154],256]},
12800:{12800:[[40,4352,41],256],12801:[[40,4354,41],256],12802:[[40,4355,41],256],12803:[[40,4357,41],256],12804:[[40,4358,41],256],12805:[[40,4359,41],256],12806:[[40,4361,41],256],12807:[[40,4363,41],256],12808:[[40,4364,41],256],12809:[[40,4366,41],256],12810:[[40,4367,41],256],12811:[[40,4368,41],256],12812:[[40,4369,41],256],12813:[[40,4370,41],256],12814:[[40,4352,4449,41],256],12815:[[40,4354,4449,41],256],12816:[[40,4355,4449,41],256],12817:[[40,4357,4449,41],256],12818:[[40,4358,4449,41],256],12819:[[40,4359,4449,41],256],12820:[[40,4361,4449,41],256],12821:[[40,4363,4449,41],256],12822:[[40,4364,4449,41],256],12823:[[40,4366,4449,41],256],12824:[[40,4367,4449,41],256],12825:[[40,4368,4449,41],256],12826:[[40,4369,4449,41],256],12827:[[40,4370,4449,41],256],12828:[[40,4364,4462,41],256],12829:[[40,4363,4457,4364,4453,4523,41],256],12830:[[40,4363,4457,4370,4462,41],256],12832:[[40,19968,41],256],12833:[[40,20108,41],256],12834:[[40,19977,41],256],12835:[[40,22235,41],256],12836:[[40,20116,41],256],12837:[[40,20845,41],256],12838:[[40,19971,41],256],12839:[[40,20843,41],256],12840:[[40,20061,41],256],12841:[[40,21313,41],256],12842:[[40,26376,41],256],12843:[[40,28779,41],256],12844:[[40,27700,41],256],12845:[[40,26408,41],256],12846:[[40,37329,41],256],12847:[[40,22303,41],256],12848:[[40,26085,41],256],12849:[[40,26666,41],256],12850:[[40,26377,41],256],12851:[[40,31038,41],256],12852:[[40,21517,41],256],12853:[[40,29305,41],256],12854:[[40,36001,41],256],12855:[[40,31069,41],256],12856:[[40,21172,41],256],12857:[[40,20195,41],256],12858:[[40,21628,41],256],12859:[[40,23398,41],256],12860:[[40,30435,41],256],12861:[[40,20225,41],256],12862:[[40,36039,41],256],12863:[[40,21332,41],256],12864:[[40,31085,41],256],12865:[[40,20241,41],256],12866:[[40,33258,41],256],12867:[[40,33267,41],256],12868:[[21839],256],12869:[[24188],256],12870:[[25991],256],12871:[[31631],256],12880:[[80,84,69],256],12881:[[50,49],256],12882:[[50,50],256],12883:[[50,51],256],12884:[[50,52],256],12885:[[50,53],256],12886:[[50,54],256],12887:[[50,55],256],12888:[[50,56],256],12889:[[50,57],256],12890:[[51,48],256],12891:[[51,49],256],12892:[[51,50],256],12893:[[51,51],256],12894:[[51,52],256],12895:[[51,53],256],12896:[[4352],256],12897:[[4354],256],12898:[[4355],256],12899:[[4357],256],12900:[[4358],256],12901:[[4359],256],12902:[[4361],256],12903:[[4363],256],12904:[[4364],256],12905:[[4366],256],12906:[[4367],256],12907:[[4368],256],12908:[[4369],256],12909:[[4370],256],12910:[[4352,4449],256],12911:[[4354,4449],256],12912:[[4355,4449],256],12913:[[4357,4449],256],12914:[[4358,4449],256],12915:[[4359,4449],256],12916:[[4361,4449],256],12917:[[4363,4449],256],12918:[[4364,4449],256],12919:[[4366,4449],256],12920:[[4367,4449],256],12921:[[4368,4449],256],12922:[[4369,4449],256],12923:[[4370,4449],256],12924:[[4366,4449,4535,4352,4457],256],12925:[[4364,4462,4363,4468],256],12926:[[4363,4462],256],12928:[[19968],256],12929:[[20108],256],12930:[[19977],256],12931:[[22235],256],12932:[[20116],256],12933:[[20845],256],12934:[[19971],256],12935:[[20843],256],12936:[[20061],256],12937:[[21313],256],12938:[[26376],256],12939:[[28779],256],12940:[[27700],256],12941:[[26408],256],12942:[[37329],256],12943:[[22303],256],12944:[[26085],256],12945:[[26666],256],12946:[[26377],256],12947:[[31038],256],12948:[[21517],256],12949:[[29305],256],12950:[[36001],256],12951:[[31069],256],12952:[[21172],256],12953:[[31192],256],12954:[[30007],256],12955:[[22899],256],12956:[[36969],256],12957:[[20778],256],12958:[[21360],256],12959:[[27880],256],12960:[[38917],256],12961:[[20241],256],12962:[[20889],256],12963:[[27491],256],12964:[[19978],256],12965:[[20013],256],12966:[[19979],256],12967:[[24038],256],12968:[[21491],256],12969:[[21307],256],12970:[[23447],256],12971:[[23398],256],12972:[[30435],256],12973:[[20225],256],12974:[[36039],256],12975:[[21332],256],12976:[[22812],256],12977:[[51,54],256],12978:[[51,55],256],12979:[[51,56],256],12980:[[51,57],256],12981:[[52,48],256],12982:[[52,49],256],12983:[[52,50],256],12984:[[52,51],256],12985:[[52,52],256],12986:[[52,53],256],12987:[[52,54],256],12988:[[52,55],256],12989:[[52,56],256],12990:[[52,57],256],12991:[[53,48],256],12992:[[49,26376],256],12993:[[50,26376],256],12994:[[51,26376],256],12995:[[52,26376],256],12996:[[53,26376],256],12997:[[54,26376],256],12998:[[55,26376],256],12999:[[56,26376],256],13000:[[57,26376],256],13001:[[49,48,26376],256],13002:[[49,49,26376],256],13003:[[49,50,26376],256],13004:[[72,103],256],13005:[[101,114,103],256],13006:[[101,86],256],13007:[[76,84,68],256],13008:[[12450],256],13009:[[12452],256],13010:[[12454],256],13011:[[12456],256],13012:[[12458],256],13013:[[12459],256],13014:[[12461],256],13015:[[12463],256],13016:[[12465],256],13017:[[12467],256],13018:[[12469],256],13019:[[12471],256],13020:[[12473],256],13021:[[12475],256],13022:[[12477],256],13023:[[12479],256],13024:[[12481],256],13025:[[12484],256],13026:[[12486],256],13027:[[12488],256],13028:[[12490],256],13029:[[12491],256],13030:[[12492],256],13031:[[12493],256],13032:[[12494],256],13033:[[12495],256],13034:[[12498],256],13035:[[12501],256],13036:[[12504],256],13037:[[12507],256],13038:[[12510],256],13039:[[12511],256],13040:[[12512],256],13041:[[12513],256],13042:[[12514],256],13043:[[12516],256],13044:[[12518],256],13045:[[12520],256],13046:[[12521],256],13047:[[12522],256],13048:[[12523],256],13049:[[12524],256],13050:[[12525],256],13051:[[12527],256],13052:[[12528],256],13053:[[12529],256],13054:[[12530],256]},
13056:{13056:[[12450,12497,12540,12488],256],13057:[[12450,12523,12501,12449],256],13058:[[12450,12531,12506,12450],256],13059:[[12450,12540,12523],256],13060:[[12452,12491,12531,12464],256],13061:[[12452,12531,12481],256],13062:[[12454,12457,12531],256],13063:[[12456,12473,12463,12540,12489],256],13064:[[12456,12540,12459,12540],256],13065:[[12458,12531,12473],256],13066:[[12458,12540,12512],256],13067:[[12459,12452,12522],256],13068:[[12459,12521,12483,12488],256],13069:[[12459,12525,12522,12540],256],13070:[[12460,12525,12531],256],13071:[[12460,12531,12510],256],13072:[[12462,12460],256],13073:[[12462,12491,12540],256],13074:[[12461,12517,12522,12540],256],13075:[[12462,12523,12480,12540],256],13076:[[12461,12525],256],13077:[[12461,12525,12464,12521,12512],256],13078:[[12461,12525,12513,12540,12488,12523],256],13079:[[12461,12525,12527,12483,12488],256],13080:[[12464,12521,12512],256],13081:[[12464,12521,12512,12488,12531],256],13082:[[12463,12523,12476,12452,12525],256],13083:[[12463,12525,12540,12493],256],13084:[[12465,12540,12473],256],13085:[[12467,12523,12490],256],13086:[[12467,12540,12509],256],13087:[[12469,12452,12463,12523],256],13088:[[12469,12531,12481,12540,12512],256],13089:[[12471,12522,12531,12464],256],13090:[[12475,12531,12481],256],13091:[[12475,12531,12488],256],13092:[[12480,12540,12473],256],13093:[[12487,12471],256],13094:[[12489,12523],256],13095:[[12488,12531],256],13096:[[12490,12494],256],13097:[[12494,12483,12488],256],13098:[[12495,12452,12484],256],13099:[[12497,12540,12475,12531,12488],256],13100:[[12497,12540,12484],256],13101:[[12496,12540,12524,12523],256],13102:[[12500,12450,12473,12488,12523],256],13103:[[12500,12463,12523],256],13104:[[12500,12467],256],13105:[[12499,12523],256],13106:[[12501,12449,12521,12483,12489],256],13107:[[12501,12451,12540,12488],256],13108:[[12502,12483,12471,12455,12523],256],13109:[[12501,12521,12531],256],13110:[[12504,12463,12479,12540,12523],256],13111:[[12506,12477],256],13112:[[12506,12491,12498],256],13113:[[12504,12523,12484],256],13114:[[12506,12531,12473],256],13115:[[12506,12540,12472],256],13116:[[12505,12540,12479],256],13117:[[12509,12452,12531,12488],256],13118:[[12508,12523,12488],256],13119:[[12507,12531],256],13120:[[12509,12531,12489],256],13121:[[12507,12540,12523],256],13122:[[12507,12540,12531],256],13123:[[12510,12452,12463,12525],256],13124:[[12510,12452,12523],256],13125:[[12510,12483,12495],256],13126:[[12510,12523,12463],256],13127:[[12510,12531,12471,12519,12531],256],13128:[[12511,12463,12525,12531],256],13129:[[12511,12522],256],13130:[[12511,12522,12496,12540,12523],256],13131:[[12513,12460],256],13132:[[12513,12460,12488,12531],256],13133:[[12513,12540,12488,12523],256],13134:[[12516,12540,12489],256],13135:[[12516,12540,12523],256],13136:[[12518,12450,12531],256],13137:[[12522,12483,12488,12523],256],13138:[[12522,12521],256],13139:[[12523,12500,12540],256],13140:[[12523,12540,12502,12523],256],13141:[[12524,12512],256],13142:[[12524,12531,12488,12466,12531],256],13143:[[12527,12483,12488],256],13144:[[48,28857],256],13145:[[49,28857],256],13146:[[50,28857],256],13147:[[51,28857],256],13148:[[52,28857],256],13149:[[53,28857],256],13150:[[54,28857],256],13151:[[55,28857],256],13152:[[56,28857],256],13153:[[57,28857],256],13154:[[49,48,28857],256],13155:[[49,49,28857],256],13156:[[49,50,28857],256],13157:[[49,51,28857],256],13158:[[49,52,28857],256],13159:[[49,53,28857],256],13160:[[49,54,28857],256],13161:[[49,55,28857],256],13162:[[49,56,28857],256],13163:[[49,57,28857],256],13164:[[50,48,28857],256],13165:[[50,49,28857],256],13166:[[50,50,28857],256],13167:[[50,51,28857],256],13168:[[50,52,28857],256],13169:[[104,80,97],256],13170:[[100,97],256],13171:[[65,85],256],13172:[[98,97,114],256],13173:[[111,86],256],13174:[[112,99],256],13175:[[100,109],256],13176:[[100,109,178],256],13177:[[100,109,179],256],13178:[[73,85],256],13179:[[24179,25104],256],13180:[[26157,21644],256],13181:[[22823,27491],256],13182:[[26126,27835],256],13183:[[26666,24335,20250,31038],256],13184:[[112,65],256],13185:[[110,65],256],13186:[[956,65],256],13187:[[109,65],256],13188:[[107,65],256],13189:[[75,66],256],13190:[[77,66],256],13191:[[71,66],256],13192:[[99,97,108],256],13193:[[107,99,97,108],256],13194:[[112,70],256],13195:[[110,70],256],13196:[[956,70],256],13197:[[956,103],256],13198:[[109,103],256],13199:[[107,103],256],13200:[[72,122],256],13201:[[107,72,122],256],13202:[[77,72,122],256],13203:[[71,72,122],256],13204:[[84,72,122],256],13205:[[956,8467],256],13206:[[109,8467],256],13207:[[100,8467],256],13208:[[107,8467],256],13209:[[102,109],256],13210:[[110,109],256],13211:[[956,109],256],13212:[[109,109],256],13213:[[99,109],256],13214:[[107,109],256],13215:[[109,109,178],256],13216:[[99,109,178],256],13217:[[109,178],256],13218:[[107,109,178],256],13219:[[109,109,179],256],13220:[[99,109,179],256],13221:[[109,179],256],13222:[[107,109,179],256],13223:[[109,8725,115],256],13224:[[109,8725,115,178],256],13225:[[80,97],256],13226:[[107,80,97],256],13227:[[77,80,97],256],13228:[[71,80,97],256],13229:[[114,97,100],256],13230:[[114,97,100,8725,115],256],13231:[[114,97,100,8725,115,178],256],13232:[[112,115],256],13233:[[110,115],256],13234:[[956,115],256],13235:[[109,115],256],13236:[[112,86],256],13237:[[110,86],256],13238:[[956,86],256],13239:[[109,86],256],13240:[[107,86],256],13241:[[77,86],256],13242:[[112,87],256],13243:[[110,87],256],13244:[[956,87],256],13245:[[109,87],256],13246:[[107,87],256],13247:[[77,87],256],13248:[[107,937],256],13249:[[77,937],256],13250:[[97,46,109,46],256],13251:[[66,113],256],13252:[[99,99],256],13253:[[99,100],256],13254:[[67,8725,107,103],256],13255:[[67,111,46],256],13256:[[100,66],256],13257:[[71,121],256],13258:[[104,97],256],13259:[[72,80],256],13260:[[105,110],256],13261:[[75,75],256],13262:[[75,77],256],13263:[[107,116],256],13264:[[108,109],256],13265:[[108,110],256],13266:[[108,111,103],256],13267:[[108,120],256],13268:[[109,98],256],13269:[[109,105,108],256],13270:[[109,111,108],256],13271:[[80,72],256],13272:[[112,46,109,46],256],13273:[[80,80,77],256],13274:[[80,82],256],13275:[[115,114],256],13276:[[83,118],256],13277:[[87,98],256],13278:[[86,8725,109],256],13279:[[65,8725,109],256],13280:[[49,26085],256],13281:[[50,26085],256],13282:[[51,26085],256],13283:[[52,26085],256],13284:[[53,26085],256],13285:[[54,26085],256],13286:[[55,26085],256],13287:[[56,26085],256],13288:[[57,26085],256],13289:[[49,48,26085],256],13290:[[49,49,26085],256],13291:[[49,50,26085],256],13292:[[49,51,26085],256],13293:[[49,52,26085],256],13294:[[49,53,26085],256],13295:[[49,54,26085],256],13296:[[49,55,26085],256],13297:[[49,56,26085],256],13298:[[49,57,26085],256],13299:[[50,48,26085],256],13300:[[50,49,26085],256],13301:[[50,50,26085],256],13302:[[50,51,26085],256],13303:[[50,52,26085],256],13304:[[50,53,26085],256],13305:[[50,54,26085],256],13306:[[50,55,26085],256],13307:[[50,56,26085],256],13308:[[50,57,26085],256],13309:[[51,48,26085],256],13310:[[51,49,26085],256],13311:[[103,97,108],256]},
42496:{42607:[,230],42612:[,230],42613:[,230],42614:[,230],42615:[,230],42616:[,230],42617:[,230],42618:[,230],42619:[,230],42620:[,230],42621:[,230],42655:[,230],42736:[,230],42737:[,230]},
42752:{42864:[[42863],256],43000:[[294],256],43001:[[339],256]},
43008:{43014:[,9],43204:[,9],43232:[,230],43233:[,230],43234:[,230],43235:[,230],43236:[,230],43237:[,230],43238:[,230],43239:[,230],43240:[,230],43241:[,230],43242:[,230],43243:[,230],43244:[,230],43245:[,230],43246:[,230],43247:[,230],43248:[,230],43249:[,230]},
43264:{43307:[,220],43308:[,220],43309:[,220],43347:[,9],43443:[,7],43456:[,9]},
43520:{43696:[,230],43698:[,230],43699:[,230],43700:[,220],43703:[,230],43704:[,230],43710:[,230],43711:[,230],43713:[,230],43766:[,9]},
43776:{44013:[,9]},
53504:{119134:[[119127,119141],512],119135:[[119128,119141],512],119136:[[119135,119150],512],119137:[[119135,119151],512],119138:[[119135,119152],512],119139:[[119135,119153],512],119140:[[119135,119154],512],119141:[,216],119142:[,216],119143:[,1],119144:[,1],119145:[,1],119149:[,226],119150:[,216],119151:[,216],119152:[,216],119153:[,216],119154:[,216],119163:[,220],119164:[,220],119165:[,220],119166:[,220],119167:[,220],119168:[,220],119169:[,220],119170:[,220],119173:[,230],119174:[,230],119175:[,230],119176:[,230],119177:[,230],119178:[,220],119179:[,220],119210:[,230],119211:[,230],119212:[,230],119213:[,230],119227:[[119225,119141],512],119228:[[119226,119141],512],119229:[[119227,119150],512],119230:[[119228,119150],512],119231:[[119227,119151],512],119232:[[119228,119151],512]},
53760:{119362:[,230],119363:[,230],119364:[,230]},
54272:{119808:[[65],256],119809:[[66],256],119810:[[67],256],119811:[[68],256],119812:[[69],256],119813:[[70],256],119814:[[71],256],119815:[[72],256],119816:[[73],256],119817:[[74],256],119818:[[75],256],119819:[[76],256],119820:[[77],256],119821:[[78],256],119822:[[79],256],119823:[[80],256],119824:[[81],256],119825:[[82],256],119826:[[83],256],119827:[[84],256],119828:[[85],256],119829:[[86],256],119830:[[87],256],119831:[[88],256],119832:[[89],256],119833:[[90],256],119834:[[97],256],119835:[[98],256],119836:[[99],256],119837:[[100],256],119838:[[101],256],119839:[[102],256],119840:[[103],256],119841:[[104],256],119842:[[105],256],119843:[[106],256],119844:[[107],256],119845:[[108],256],119846:[[109],256],119847:[[110],256],119848:[[111],256],119849:[[112],256],119850:[[113],256],119851:[[114],256],119852:[[115],256],119853:[[116],256],119854:[[117],256],119855:[[118],256],119856:[[119],256],119857:[[120],256],119858:[[121],256],119859:[[122],256],119860:[[65],256],119861:[[66],256],119862:[[67],256],119863:[[68],256],119864:[[69],256],119865:[[70],256],119866:[[71],256],119867:[[72],256],119868:[[73],256],119869:[[74],256],119870:[[75],256],119871:[[76],256],119872:[[77],256],119873:[[78],256],119874:[[79],256],119875:[[80],256],119876:[[81],256],119877:[[82],256],119878:[[83],256],119879:[[84],256],119880:[[85],256],119881:[[86],256],119882:[[87],256],119883:[[88],256],119884:[[89],256],119885:[[90],256],119886:[[97],256],119887:[[98],256],119888:[[99],256],119889:[[100],256],119890:[[101],256],119891:[[102],256],119892:[[103],256],119894:[[105],256],119895:[[106],256],119896:[[107],256],119897:[[108],256],119898:[[109],256],119899:[[110],256],119900:[[111],256],119901:[[112],256],119902:[[113],256],119903:[[114],256],119904:[[115],256],119905:[[116],256],119906:[[117],256],119907:[[118],256],119908:[[119],256],119909:[[120],256],119910:[[121],256],119911:[[122],256],119912:[[65],256],119913:[[66],256],119914:[[67],256],119915:[[68],256],119916:[[69],256],119917:[[70],256],119918:[[71],256],119919:[[72],256],119920:[[73],256],119921:[[74],256],119922:[[75],256],119923:[[76],256],119924:[[77],256],119925:[[78],256],119926:[[79],256],119927:[[80],256],119928:[[81],256],119929:[[82],256],119930:[[83],256],119931:[[84],256],119932:[[85],256],119933:[[86],256],119934:[[87],256],119935:[[88],256],119936:[[89],256],119937:[[90],256],119938:[[97],256],119939:[[98],256],119940:[[99],256],119941:[[100],256],119942:[[101],256],119943:[[102],256],119944:[[103],256],119945:[[104],256],119946:[[105],256],119947:[[106],256],119948:[[107],256],119949:[[108],256],119950:[[109],256],119951:[[110],256],119952:[[111],256],119953:[[112],256],119954:[[113],256],119955:[[114],256],119956:[[115],256],119957:[[116],256],119958:[[117],256],119959:[[118],256],119960:[[119],256],119961:[[120],256],119962:[[121],256],119963:[[122],256],119964:[[65],256],119966:[[67],256],119967:[[68],256],119970:[[71],256],119973:[[74],256],119974:[[75],256],119977:[[78],256],119978:[[79],256],119979:[[80],256],119980:[[81],256],119982:[[83],256],119983:[[84],256],119984:[[85],256],119985:[[86],256],119986:[[87],256],119987:[[88],256],119988:[[89],256],119989:[[90],256],119990:[[97],256],119991:[[98],256],119992:[[99],256],119993:[[100],256],119995:[[102],256],119997:[[104],256],119998:[[105],256],119999:[[106],256],120000:[[107],256],120001:[[108],256],120002:[[109],256],120003:[[110],256],120005:[[112],256],120006:[[113],256],120007:[[114],256],120008:[[115],256],120009:[[116],256],120010:[[117],256],120011:[[118],256],120012:[[119],256],120013:[[120],256],120014:[[121],256],120015:[[122],256],120016:[[65],256],120017:[[66],256],120018:[[67],256],120019:[[68],256],120020:[[69],256],120021:[[70],256],120022:[[71],256],120023:[[72],256],120024:[[73],256],120025:[[74],256],120026:[[75],256],120027:[[76],256],120028:[[77],256],120029:[[78],256],120030:[[79],256],120031:[[80],256],120032:[[81],256],120033:[[82],256],120034:[[83],256],120035:[[84],256],120036:[[85],256],120037:[[86],256],120038:[[87],256],120039:[[88],256],120040:[[89],256],120041:[[90],256],120042:[[97],256],120043:[[98],256],120044:[[99],256],120045:[[100],256],120046:[[101],256],120047:[[102],256],120048:[[103],256],120049:[[104],256],120050:[[105],256],120051:[[106],256],120052:[[107],256],120053:[[108],256],120054:[[109],256],120055:[[110],256],120056:[[111],256],120057:[[112],256],120058:[[113],256],120059:[[114],256],120060:[[115],256],120061:[[116],256],120062:[[117],256],120063:[[118],256]},
54528:{120064:[[119],256],120065:[[120],256],120066:[[121],256],120067:[[122],256],120068:[[65],256],120069:[[66],256],120071:[[68],256],120072:[[69],256],120073:[[70],256],120074:[[71],256],120077:[[74],256],120078:[[75],256],120079:[[76],256],120080:[[77],256],120081:[[78],256],120082:[[79],256],120083:[[80],256],120084:[[81],256],120086:[[83],256],120087:[[84],256],120088:[[85],256],120089:[[86],256],120090:[[87],256],120091:[[88],256],120092:[[89],256],120094:[[97],256],120095:[[98],256],120096:[[99],256],120097:[[100],256],120098:[[101],256],120099:[[102],256],120100:[[103],256],120101:[[104],256],120102:[[105],256],120103:[[106],256],120104:[[107],256],120105:[[108],256],120106:[[109],256],120107:[[110],256],120108:[[111],256],120109:[[112],256],120110:[[113],256],120111:[[114],256],120112:[[115],256],120113:[[116],256],120114:[[117],256],120115:[[118],256],120116:[[119],256],120117:[[120],256],120118:[[121],256],120119:[[122],256],120120:[[65],256],120121:[[66],256],120123:[[68],256],120124:[[69],256],120125:[[70],256],120126:[[71],256],120128:[[73],256],120129:[[74],256],120130:[[75],256],120131:[[76],256],120132:[[77],256],120134:[[79],256],120138:[[83],256],120139:[[84],256],120140:[[85],256],120141:[[86],256],120142:[[87],256],120143:[[88],256],120144:[[89],256],120146:[[97],256],120147:[[98],256],120148:[[99],256],120149:[[100],256],120150:[[101],256],120151:[[102],256],120152:[[103],256],120153:[[104],256],120154:[[105],256],120155:[[106],256],120156:[[107],256],120157:[[108],256],120158:[[109],256],120159:[[110],256],120160:[[111],256],120161:[[112],256],120162:[[113],256],120163:[[114],256],120164:[[115],256],120165:[[116],256],120166:[[117],256],120167:[[118],256],120168:[[119],256],120169:[[120],256],120170:[[121],256],120171:[[122],256],120172:[[65],256],120173:[[66],256],120174:[[67],256],120175:[[68],256],120176:[[69],256],120177:[[70],256],120178:[[71],256],120179:[[72],256],120180:[[73],256],120181:[[74],256],120182:[[75],256],120183:[[76],256],120184:[[77],256],120185:[[78],256],120186:[[79],256],120187:[[80],256],120188:[[81],256],120189:[[82],256],120190:[[83],256],120191:[[84],256],120192:[[85],256],120193:[[86],256],120194:[[87],256],120195:[[88],256],120196:[[89],256],120197:[[90],256],120198:[[97],256],120199:[[98],256],120200:[[99],256],120201:[[100],256],120202:[[101],256],120203:[[102],256],120204:[[103],256],120205:[[104],256],120206:[[105],256],120207:[[106],256],120208:[[107],256],120209:[[108],256],120210:[[109],256],120211:[[110],256],120212:[[111],256],120213:[[112],256],120214:[[113],256],120215:[[114],256],120216:[[115],256],120217:[[116],256],120218:[[117],256],120219:[[118],256],120220:[[119],256],120221:[[120],256],120222:[[121],256],120223:[[122],256],120224:[[65],256],120225:[[66],256],120226:[[67],256],120227:[[68],256],120228:[[69],256],120229:[[70],256],120230:[[71],256],120231:[[72],256],120232:[[73],256],120233:[[74],256],120234:[[75],256],120235:[[76],256],120236:[[77],256],120237:[[78],256],120238:[[79],256],120239:[[80],256],120240:[[81],256],120241:[[82],256],120242:[[83],256],120243:[[84],256],120244:[[85],256],120245:[[86],256],120246:[[87],256],120247:[[88],256],120248:[[89],256],120249:[[90],256],120250:[[97],256],120251:[[98],256],120252:[[99],256],120253:[[100],256],120254:[[101],256],120255:[[102],256],120256:[[103],256],120257:[[104],256],120258:[[105],256],120259:[[106],256],120260:[[107],256],120261:[[108],256],120262:[[109],256],120263:[[110],256],120264:[[111],256],120265:[[112],256],120266:[[113],256],120267:[[114],256],120268:[[115],256],120269:[[116],256],120270:[[117],256],120271:[[118],256],120272:[[119],256],120273:[[120],256],120274:[[121],256],120275:[[122],256],120276:[[65],256],120277:[[66],256],120278:[[67],256],120279:[[68],256],120280:[[69],256],120281:[[70],256],120282:[[71],256],120283:[[72],256],120284:[[73],256],120285:[[74],256],120286:[[75],256],120287:[[76],256],120288:[[77],256],120289:[[78],256],120290:[[79],256],120291:[[80],256],120292:[[81],256],120293:[[82],256],120294:[[83],256],120295:[[84],256],120296:[[85],256],120297:[[86],256],120298:[[87],256],120299:[[88],256],120300:[[89],256],120301:[[90],256],120302:[[97],256],120303:[[98],256],120304:[[99],256],120305:[[100],256],120306:[[101],256],120307:[[102],256],120308:[[103],256],120309:[[104],256],120310:[[105],256],120311:[[106],256],120312:[[107],256],120313:[[108],256],120314:[[109],256],120315:[[110],256],120316:[[111],256],120317:[[112],256],120318:[[113],256],120319:[[114],256]},
54784:{120320:[[115],256],120321:[[116],256],120322:[[117],256],120323:[[118],256],120324:[[119],256],120325:[[120],256],120326:[[121],256],120327:[[122],256],120328:[[65],256],120329:[[66],256],120330:[[67],256],120331:[[68],256],120332:[[69],256],120333:[[70],256],120334:[[71],256],120335:[[72],256],120336:[[73],256],120337:[[74],256],120338:[[75],256],120339:[[76],256],120340:[[77],256],120341:[[78],256],120342:[[79],256],120343:[[80],256],120344:[[81],256],120345:[[82],256],120346:[[83],256],120347:[[84],256],120348:[[85],256],120349:[[86],256],120350:[[87],256],120351:[[88],256],120352:[[89],256],120353:[[90],256],120354:[[97],256],120355:[[98],256],120356:[[99],256],120357:[[100],256],120358:[[101],256],120359:[[102],256],120360:[[103],256],120361:[[104],256],120362:[[105],256],120363:[[106],256],120364:[[107],256],120365:[[108],256],120366:[[109],256],120367:[[110],256],120368:[[111],256],120369:[[112],256],120370:[[113],256],120371:[[114],256],120372:[[115],256],120373:[[116],256],120374:[[117],256],120375:[[118],256],120376:[[119],256],120377:[[120],256],120378:[[121],256],120379:[[122],256],120380:[[65],256],120381:[[66],256],120382:[[67],256],120383:[[68],256],120384:[[69],256],120385:[[70],256],120386:[[71],256],120387:[[72],256],120388:[[73],256],120389:[[74],256],120390:[[75],256],120391:[[76],256],120392:[[77],256],120393:[[78],256],120394:[[79],256],120395:[[80],256],120396:[[81],256],120397:[[82],256],120398:[[83],256],120399:[[84],256],120400:[[85],256],120401:[[86],256],120402:[[87],256],120403:[[88],256],120404:[[89],256],120405:[[90],256],120406:[[97],256],120407:[[98],256],120408:[[99],256],120409:[[100],256],120410:[[101],256],120411:[[102],256],120412:[[103],256],120413:[[104],256],120414:[[105],256],120415:[[106],256],120416:[[107],256],120417:[[108],256],120418:[[109],256],120419:[[110],256],120420:[[111],256],120421:[[112],256],120422:[[113],256],120423:[[114],256],120424:[[115],256],120425:[[116],256],120426:[[117],256],120427:[[118],256],120428:[[119],256],120429:[[120],256],120430:[[121],256],120431:[[122],256],120432:[[65],256],120433:[[66],256],120434:[[67],256],120435:[[68],256],120436:[[69],256],120437:[[70],256],120438:[[71],256],120439:[[72],256],120440:[[73],256],120441:[[74],256],120442:[[75],256],120443:[[76],256],120444:[[77],256],120445:[[78],256],120446:[[79],256],120447:[[80],256],120448:[[81],256],120449:[[82],256],120450:[[83],256],120451:[[84],256],120452:[[85],256],120453:[[86],256],120454:[[87],256],120455:[[88],256],120456:[[89],256],120457:[[90],256],120458:[[97],256],120459:[[98],256],120460:[[99],256],120461:[[100],256],120462:[[101],256],120463:[[102],256],120464:[[103],256],120465:[[104],256],120466:[[105],256],120467:[[106],256],120468:[[107],256],120469:[[108],256],120470:[[109],256],120471:[[110],256],120472:[[111],256],120473:[[112],256],120474:[[113],256],120475:[[114],256],120476:[[115],256],120477:[[116],256],120478:[[117],256],120479:[[118],256],120480:[[119],256],120481:[[120],256],120482:[[121],256],120483:[[122],256],120484:[[305],256],120485:[[567],256],120488:[[913],256],120489:[[914],256],120490:[[915],256],120491:[[916],256],120492:[[917],256],120493:[[918],256],120494:[[919],256],120495:[[920],256],120496:[[921],256],120497:[[922],256],120498:[[923],256],120499:[[924],256],120500:[[925],256],120501:[[926],256],120502:[[927],256],120503:[[928],256],120504:[[929],256],120505:[[1012],256],120506:[[931],256],120507:[[932],256],120508:[[933],256],120509:[[934],256],120510:[[935],256],120511:[[936],256],120512:[[937],256],120513:[[8711],256],120514:[[945],256],120515:[[946],256],120516:[[947],256],120517:[[948],256],120518:[[949],256],120519:[[950],256],120520:[[951],256],120521:[[952],256],120522:[[953],256],120523:[[954],256],120524:[[955],256],120525:[[956],256],120526:[[957],256],120527:[[958],256],120528:[[959],256],120529:[[960],256],120530:[[961],256],120531:[[962],256],120532:[[963],256],120533:[[964],256],120534:[[965],256],120535:[[966],256],120536:[[967],256],120537:[[968],256],120538:[[969],256],120539:[[8706],256],120540:[[1013],256],120541:[[977],256],120542:[[1008],256],120543:[[981],256],120544:[[1009],256],120545:[[982],256],120546:[[913],256],120547:[[914],256],120548:[[915],256],120549:[[916],256],120550:[[917],256],120551:[[918],256],120552:[[919],256],120553:[[920],256],120554:[[921],256],120555:[[922],256],120556:[[923],256],120557:[[924],256],120558:[[925],256],120559:[[926],256],120560:[[927],256],120561:[[928],256],120562:[[929],256],120563:[[1012],256],120564:[[931],256],120565:[[932],256],120566:[[933],256],120567:[[934],256],120568:[[935],256],120569:[[936],256],120570:[[937],256],120571:[[8711],256],120572:[[945],256],120573:[[946],256],120574:[[947],256],120575:[[948],256]},
55040:{120576:[[949],256],120577:[[950],256],120578:[[951],256],120579:[[952],256],120580:[[953],256],120581:[[954],256],120582:[[955],256],120583:[[956],256],120584:[[957],256],120585:[[958],256],120586:[[959],256],120587:[[960],256],120588:[[961],256],120589:[[962],256],120590:[[963],256],120591:[[964],256],120592:[[965],256],120593:[[966],256],120594:[[967],256],120595:[[968],256],120596:[[969],256],120597:[[8706],256],120598:[[1013],256],120599:[[977],256],120600:[[1008],256],120601:[[981],256],120602:[[1009],256],120603:[[982],256],120604:[[913],256],120605:[[914],256],120606:[[915],256],120607:[[916],256],120608:[[917],256],120609:[[918],256],120610:[[919],256],120611:[[920],256],120612:[[921],256],120613:[[922],256],120614:[[923],256],120615:[[924],256],120616:[[925],256],120617:[[926],256],120618:[[927],256],120619:[[928],256],120620:[[929],256],120621:[[1012],256],120622:[[931],256],120623:[[932],256],120624:[[933],256],120625:[[934],256],120626:[[935],256],120627:[[936],256],120628:[[937],256],120629:[[8711],256],120630:[[945],256],120631:[[946],256],120632:[[947],256],120633:[[948],256],120634:[[949],256],120635:[[950],256],120636:[[951],256],120637:[[952],256],120638:[[953],256],120639:[[954],256],120640:[[955],256],120641:[[956],256],120642:[[957],256],120643:[[958],256],120644:[[959],256],120645:[[960],256],120646:[[961],256],120647:[[962],256],120648:[[963],256],120649:[[964],256],120650:[[965],256],120651:[[966],256],120652:[[967],256],120653:[[968],256],120654:[[969],256],120655:[[8706],256],120656:[[1013],256],120657:[[977],256],120658:[[1008],256],120659:[[981],256],120660:[[1009],256],120661:[[982],256],120662:[[913],256],120663:[[914],256],120664:[[915],256],120665:[[916],256],120666:[[917],256],120667:[[918],256],120668:[[919],256],120669:[[920],256],120670:[[921],256],120671:[[922],256],120672:[[923],256],120673:[[924],256],120674:[[925],256],120675:[[926],256],120676:[[927],256],120677:[[928],256],120678:[[929],256],120679:[[1012],256],120680:[[931],256],120681:[[932],256],120682:[[933],256],120683:[[934],256],120684:[[935],256],120685:[[936],256],120686:[[937],256],120687:[[8711],256],120688:[[945],256],120689:[[946],256],120690:[[947],256],120691:[[948],256],120692:[[949],256],120693:[[950],256],120694:[[951],256],120695:[[952],256],120696:[[953],256],120697:[[954],256],120698:[[955],256],120699:[[956],256],120700:[[957],256],120701:[[958],256],120702:[[959],256],120703:[[960],256],120704:[[961],256],120705:[[962],256],120706:[[963],256],120707:[[964],256],120708:[[965],256],120709:[[966],256],120710:[[967],256],120711:[[968],256],120712:[[969],256],120713:[[8706],256],120714:[[1013],256],120715:[[977],256],120716:[[1008],256],120717:[[981],256],120718:[[1009],256],120719:[[982],256],120720:[[913],256],120721:[[914],256],120722:[[915],256],120723:[[916],256],120724:[[917],256],120725:[[918],256],120726:[[919],256],120727:[[920],256],120728:[[921],256],120729:[[922],256],120730:[[923],256],120731:[[924],256],120732:[[925],256],120733:[[926],256],120734:[[927],256],120735:[[928],256],120736:[[929],256],120737:[[1012],256],120738:[[931],256],120739:[[932],256],120740:[[933],256],120741:[[934],256],120742:[[935],256],120743:[[936],256],120744:[[937],256],120745:[[8711],256],120746:[[945],256],120747:[[946],256],120748:[[947],256],120749:[[948],256],120750:[[949],256],120751:[[950],256],120752:[[951],256],120753:[[952],256],120754:[[953],256],120755:[[954],256],120756:[[955],256],120757:[[956],256],120758:[[957],256],120759:[[958],256],120760:[[959],256],120761:[[960],256],120762:[[961],256],120763:[[962],256],120764:[[963],256],120765:[[964],256],120766:[[965],256],120767:[[966],256],120768:[[967],256],120769:[[968],256],120770:[[969],256],120771:[[8706],256],120772:[[1013],256],120773:[[977],256],120774:[[1008],256],120775:[[981],256],120776:[[1009],256],120777:[[982],256],120778:[[988],256],120779:[[989],256],120782:[[48],256],120783:[[49],256],120784:[[50],256],120785:[[51],256],120786:[[52],256],120787:[[53],256],120788:[[54],256],120789:[[55],256],120790:[[56],256],120791:[[57],256],120792:[[48],256],120793:[[49],256],120794:[[50],256],120795:[[51],256],120796:[[52],256],120797:[[53],256],120798:[[54],256],120799:[[55],256],120800:[[56],256],120801:[[57],256],120802:[[48],256],120803:[[49],256],120804:[[50],256],120805:[[51],256],120806:[[52],256],120807:[[53],256],120808:[[54],256],120809:[[55],256],120810:[[56],256],120811:[[57],256],120812:[[48],256],120813:[[49],256],120814:[[50],256],120815:[[51],256],120816:[[52],256],120817:[[53],256],120818:[[54],256],120819:[[55],256],120820:[[56],256],120821:[[57],256],120822:[[48],256],120823:[[49],256],120824:[[50],256],120825:[[51],256],120826:[[52],256],120827:[[53],256],120828:[[54],256],120829:[[55],256],120830:[[56],256],120831:[[57],256]},
60928:{126464:[[1575],256],126465:[[1576],256],126466:[[1580],256],126467:[[1583],256],126469:[[1608],256],126470:[[1586],256],126471:[[1581],256],126472:[[1591],256],126473:[[1610],256],126474:[[1603],256],126475:[[1604],256],126476:[[1605],256],126477:[[1606],256],126478:[[1587],256],126479:[[1593],256],126480:[[1601],256],126481:[[1589],256],126482:[[1602],256],126483:[[1585],256],126484:[[1588],256],126485:[[1578],256],126486:[[1579],256],126487:[[1582],256],126488:[[1584],256],126489:[[1590],256],126490:[[1592],256],126491:[[1594],256],126492:[[1646],256],126493:[[1722],256],126494:[[1697],256],126495:[[1647],256],126497:[[1576],256],126498:[[1580],256],126500:[[1607],256],126503:[[1581],256],126505:[[1610],256],126506:[[1603],256],126507:[[1604],256],126508:[[1605],256],126509:[[1606],256],126510:[[1587],256],126511:[[1593],256],126512:[[1601],256],126513:[[1589],256],126514:[[1602],256],126516:[[1588],256],126517:[[1578],256],126518:[[1579],256],126519:[[1582],256],126521:[[1590],256],126523:[[1594],256],126530:[[1580],256],126535:[[1581],256],126537:[[1610],256],126539:[[1604],256],126541:[[1606],256],126542:[[1587],256],126543:[[1593],256],126545:[[1589],256],126546:[[1602],256],126548:[[1588],256],126551:[[1582],256],126553:[[1590],256],126555:[[1594],256],126557:[[1722],256],126559:[[1647],256],126561:[[1576],256],126562:[[1580],256],126564:[[1607],256],126567:[[1581],256],126568:[[1591],256],126569:[[1610],256],126570:[[1603],256],126572:[[1605],256],126573:[[1606],256],126574:[[1587],256],126575:[[1593],256],126576:[[1601],256],126577:[[1589],256],126578:[[1602],256],126580:[[1588],256],126581:[[1578],256],126582:[[1579],256],126583:[[1582],256],126585:[[1590],256],126586:[[1592],256],126587:[[1594],256],126588:[[1646],256],126590:[[1697],256],126592:[[1575],256],126593:[[1576],256],126594:[[1580],256],126595:[[1583],256],126596:[[1607],256],126597:[[1608],256],126598:[[1586],256],126599:[[1581],256],126600:[[1591],256],126601:[[1610],256],126603:[[1604],256],126604:[[1605],256],126605:[[1606],256],126606:[[1587],256],126607:[[1593],256],126608:[[1601],256],126609:[[1589],256],126610:[[1602],256],126611:[[1585],256],126612:[[1588],256],126613:[[1578],256],126614:[[1579],256],126615:[[1582],256],126616:[[1584],256],126617:[[1590],256],126618:[[1592],256],126619:[[1594],256],126625:[[1576],256],126626:[[1580],256],126627:[[1583],256],126629:[[1608],256],126630:[[1586],256],126631:[[1581],256],126632:[[1591],256],126633:[[1610],256],126635:[[1604],256],126636:[[1605],256],126637:[[1606],256],126638:[[1587],256],126639:[[1593],256],126640:[[1601],256],126641:[[1589],256],126642:[[1602],256],126643:[[1585],256],126644:[[1588],256],126645:[[1578],256],126646:[[1579],256],126647:[[1582],256],126648:[[1584],256],126649:[[1590],256],126650:[[1592],256],126651:[[1594],256]},
61696:{127232:[[48,46],256],127233:[[48,44],256],127234:[[49,44],256],127235:[[50,44],256],127236:[[51,44],256],127237:[[52,44],256],127238:[[53,44],256],127239:[[54,44],256],127240:[[55,44],256],127241:[[56,44],256],127242:[[57,44],256],127248:[[40,65,41],256],127249:[[40,66,41],256],127250:[[40,67,41],256],127251:[[40,68,41],256],127252:[[40,69,41],256],127253:[[40,70,41],256],127254:[[40,71,41],256],127255:[[40,72,41],256],127256:[[40,73,41],256],127257:[[40,74,41],256],127258:[[40,75,41],256],127259:[[40,76,41],256],127260:[[40,77,41],256],127261:[[40,78,41],256],127262:[[40,79,41],256],127263:[[40,80,41],256],127264:[[40,81,41],256],127265:[[40,82,41],256],127266:[[40,83,41],256],127267:[[40,84,41],256],127268:[[40,85,41],256],127269:[[40,86,41],256],127270:[[40,87,41],256],127271:[[40,88,41],256],127272:[[40,89,41],256],127273:[[40,90,41],256],127274:[[12308,83,12309],256],127275:[[67],256],127276:[[82],256],127277:[[67,68],256],127278:[[87,90],256],127280:[[65],256],127281:[[66],256],127282:[[67],256],127283:[[68],256],127284:[[69],256],127285:[[70],256],127286:[[71],256],127287:[[72],256],127288:[[73],256],127289:[[74],256],127290:[[75],256],127291:[[76],256],127292:[[77],256],127293:[[78],256],127294:[[79],256],127295:[[80],256],127296:[[81],256],127297:[[82],256],127298:[[83],256],127299:[[84],256],127300:[[85],256],127301:[[86],256],127302:[[87],256],127303:[[88],256],127304:[[89],256],127305:[[90],256],127306:[[72,86],256],127307:[[77,86],256],127308:[[83,68],256],127309:[[83,83],256],127310:[[80,80,86],256],127311:[[87,67],256],127338:[[77,67],256],127339:[[77,68],256],127376:[[68,74],256]},
61952:{127488:[[12411,12363],256],127489:[[12467,12467],256],127490:[[12469],256],127504:[[25163],256],127505:[[23383],256],127506:[[21452],256],127507:[[12487],256],127508:[[20108],256],127509:[[22810],256],127510:[[35299],256],127511:[[22825],256],127512:[[20132],256],127513:[[26144],256],127514:[[28961],256],127515:[[26009],256],127516:[[21069],256],127517:[[24460],256],127518:[[20877],256],127519:[[26032],256],127520:[[21021],256],127521:[[32066],256],127522:[[29983],256],127523:[[36009],256],127524:[[22768],256],127525:[[21561],256],127526:[[28436],256],127527:[[25237],256],127528:[[25429],256],127529:[[19968],256],127530:[[19977],256],127531:[[36938],256],127532:[[24038],256],127533:[[20013],256],127534:[[21491],256],127535:[[25351],256],127536:[[36208],256],127537:[[25171],256],127538:[[31105],256],127539:[[31354],256],127540:[[21512],256],127541:[[28288],256],127542:[[26377],256],127543:[[26376],256],127544:[[30003],256],127545:[[21106],256],127546:[[21942],256],127552:[[12308,26412,12309],256],127553:[[12308,19977,12309],256],127554:[[12308,20108,12309],256],127555:[[12308,23433,12309],256],127556:[[12308,28857,12309],256],127557:[[12308,25171,12309],256],127558:[[12308,30423,12309],256],127559:[[12308,21213,12309],256],127560:[[12308,25943,12309],256],127568:[[24471],256],127569:[[21487],256]},
63488:{194560:[[20029]],194561:[[20024]],194562:[[20033]],194563:[[131362]],194564:[[20320]],194565:[[20398]],194566:[[20411]],194567:[[20482]],194568:[[20602]],194569:[[20633]],194570:[[20711]],194571:[[20687]],194572:[[13470]],194573:[[132666]],194574:[[20813]],194575:[[20820]],194576:[[20836]],194577:[[20855]],194578:[[132380]],194579:[[13497]],194580:[[20839]],194581:[[20877]],194582:[[132427]],194583:[[20887]],194584:[[20900]],194585:[[20172]],194586:[[20908]],194587:[[20917]],194588:[[168415]],194589:[[20981]],194590:[[20995]],194591:[[13535]],194592:[[21051]],194593:[[21062]],194594:[[21106]],194595:[[21111]],194596:[[13589]],194597:[[21191]],194598:[[21193]],194599:[[21220]],194600:[[21242]],194601:[[21253]],194602:[[21254]],194603:[[21271]],194604:[[21321]],194605:[[21329]],194606:[[21338]],194607:[[21363]],194608:[[21373]],194609:[[21375]],194610:[[21375]],194611:[[21375]],194612:[[133676]],194613:[[28784]],194614:[[21450]],194615:[[21471]],194616:[[133987]],194617:[[21483]],194618:[[21489]],194619:[[21510]],194620:[[21662]],194621:[[21560]],194622:[[21576]],194623:[[21608]],194624:[[21666]],194625:[[21750]],194626:[[21776]],194627:[[21843]],194628:[[21859]],194629:[[21892]],194630:[[21892]],194631:[[21913]],194632:[[21931]],194633:[[21939]],194634:[[21954]],194635:[[22294]],194636:[[22022]],194637:[[22295]],194638:[[22097]],194639:[[22132]],194640:[[20999]],194641:[[22766]],194642:[[22478]],194643:[[22516]],194644:[[22541]],194645:[[22411]],194646:[[22578]],194647:[[22577]],194648:[[22700]],194649:[[136420]],194650:[[22770]],194651:[[22775]],194652:[[22790]],194653:[[22810]],194654:[[22818]],194655:[[22882]],194656:[[136872]],194657:[[136938]],194658:[[23020]],194659:[[23067]],194660:[[23079]],194661:[[23000]],194662:[[23142]],194663:[[14062]],194664:[[14076]],194665:[[23304]],194666:[[23358]],194667:[[23358]],194668:[[137672]],194669:[[23491]],194670:[[23512]],194671:[[23527]],194672:[[23539]],194673:[[138008]],194674:[[23551]],194675:[[23558]],194676:[[24403]],194677:[[23586]],194678:[[14209]],194679:[[23648]],194680:[[23662]],194681:[[23744]],194682:[[23693]],194683:[[138724]],194684:[[23875]],194685:[[138726]],194686:[[23918]],194687:[[23915]],194688:[[23932]],194689:[[24033]],194690:[[24034]],194691:[[14383]],194692:[[24061]],194693:[[24104]],194694:[[24125]],194695:[[24169]],194696:[[14434]],194697:[[139651]],194698:[[14460]],194699:[[24240]],194700:[[24243]],194701:[[24246]],194702:[[24266]],194703:[[172946]],194704:[[24318]],194705:[[140081]],194706:[[140081]],194707:[[33281]],194708:[[24354]],194709:[[24354]],194710:[[14535]],194711:[[144056]],194712:[[156122]],194713:[[24418]],194714:[[24427]],194715:[[14563]],194716:[[24474]],194717:[[24525]],194718:[[24535]],194719:[[24569]],194720:[[24705]],194721:[[14650]],194722:[[14620]],194723:[[24724]],194724:[[141012]],194725:[[24775]],194726:[[24904]],194727:[[24908]],194728:[[24910]],194729:[[24908]],194730:[[24954]],194731:[[24974]],194732:[[25010]],194733:[[24996]],194734:[[25007]],194735:[[25054]],194736:[[25074]],194737:[[25078]],194738:[[25104]],194739:[[25115]],194740:[[25181]],194741:[[25265]],194742:[[25300]],194743:[[25424]],194744:[[142092]],194745:[[25405]],194746:[[25340]],194747:[[25448]],194748:[[25475]],194749:[[25572]],194750:[[142321]],194751:[[25634]],194752:[[25541]],194753:[[25513]],194754:[[14894]],194755:[[25705]],194756:[[25726]],194757:[[25757]],194758:[[25719]],194759:[[14956]],194760:[[25935]],194761:[[25964]],194762:[[143370]],194763:[[26083]],194764:[[26360]],194765:[[26185]],194766:[[15129]],194767:[[26257]],194768:[[15112]],194769:[[15076]],194770:[[20882]],194771:[[20885]],194772:[[26368]],194773:[[26268]],194774:[[32941]],194775:[[17369]],194776:[[26391]],194777:[[26395]],194778:[[26401]],194779:[[26462]],194780:[[26451]],194781:[[144323]],194782:[[15177]],194783:[[26618]],194784:[[26501]],194785:[[26706]],194786:[[26757]],194787:[[144493]],194788:[[26766]],194789:[[26655]],194790:[[26900]],194791:[[15261]],194792:[[26946]],194793:[[27043]],194794:[[27114]],194795:[[27304]],194796:[[145059]],194797:[[27355]],194798:[[15384]],194799:[[27425]],194800:[[145575]],194801:[[27476]],194802:[[15438]],194803:[[27506]],194804:[[27551]],194805:[[27578]],194806:[[27579]],194807:[[146061]],194808:[[138507]],194809:[[146170]],194810:[[27726]],194811:[[146620]],194812:[[27839]],194813:[[27853]],194814:[[27751]],194815:[[27926]]},
63744:{63744:[[35912]],63745:[[26356]],63746:[[36554]],63747:[[36040]],63748:[[28369]],63749:[[20018]],63750:[[21477]],63751:[[40860]],63752:[[40860]],63753:[[22865]],63754:[[37329]],63755:[[21895]],63756:[[22856]],63757:[[25078]],63758:[[30313]],63759:[[32645]],63760:[[34367]],63761:[[34746]],63762:[[35064]],63763:[[37007]],63764:[[27138]],63765:[[27931]],63766:[[28889]],63767:[[29662]],63768:[[33853]],63769:[[37226]],63770:[[39409]],63771:[[20098]],63772:[[21365]],63773:[[27396]],63774:[[29211]],63775:[[34349]],63776:[[40478]],63777:[[23888]],63778:[[28651]],63779:[[34253]],63780:[[35172]],63781:[[25289]],63782:[[33240]],63783:[[34847]],63784:[[24266]],63785:[[26391]],63786:[[28010]],63787:[[29436]],63788:[[37070]],63789:[[20358]],63790:[[20919]],63791:[[21214]],63792:[[25796]],63793:[[27347]],63794:[[29200]],63795:[[30439]],63796:[[32769]],63797:[[34310]],63798:[[34396]],63799:[[36335]],63800:[[38706]],63801:[[39791]],63802:[[40442]],63803:[[30860]],63804:[[31103]],63805:[[32160]],63806:[[33737]],63807:[[37636]],63808:[[40575]],63809:[[35542]],63810:[[22751]],63811:[[24324]],63812:[[31840]],63813:[[32894]],63814:[[29282]],63815:[[30922]],63816:[[36034]],63817:[[38647]],63818:[[22744]],63819:[[23650]],63820:[[27155]],63821:[[28122]],63822:[[28431]],63823:[[32047]],63824:[[32311]],63825:[[38475]],63826:[[21202]],63827:[[32907]],63828:[[20956]],63829:[[20940]],63830:[[31260]],63831:[[32190]],63832:[[33777]],63833:[[38517]],63834:[[35712]],63835:[[25295]],63836:[[27138]],63837:[[35582]],63838:[[20025]],63839:[[23527]],63840:[[24594]],63841:[[29575]],63842:[[30064]],63843:[[21271]],63844:[[30971]],63845:[[20415]],63846:[[24489]],63847:[[19981]],63848:[[27852]],63849:[[25976]],63850:[[32034]],63851:[[21443]],63852:[[22622]],63853:[[30465]],63854:[[33865]],63855:[[35498]],63856:[[27578]],63857:[[36784]],63858:[[27784]],63859:[[25342]],63860:[[33509]],63861:[[25504]],63862:[[30053]],63863:[[20142]],63864:[[20841]],63865:[[20937]],63866:[[26753]],63867:[[31975]],63868:[[33391]],63869:[[35538]],63870:[[37327]],63871:[[21237]],63872:[[21570]],63873:[[22899]],63874:[[24300]],63875:[[26053]],63876:[[28670]],63877:[[31018]],63878:[[38317]],63879:[[39530]],63880:[[40599]],63881:[[40654]],63882:[[21147]],63883:[[26310]],63884:[[27511]],63885:[[36706]],63886:[[24180]],63887:[[24976]],63888:[[25088]],63889:[[25754]],63890:[[28451]],63891:[[29001]],63892:[[29833]],63893:[[31178]],63894:[[32244]],63895:[[32879]],63896:[[36646]],63897:[[34030]],63898:[[36899]],63899:[[37706]],63900:[[21015]],63901:[[21155]],63902:[[21693]],63903:[[28872]],63904:[[35010]],63905:[[35498]],63906:[[24265]],63907:[[24565]],63908:[[25467]],63909:[[27566]],63910:[[31806]],63911:[[29557]],63912:[[20196]],63913:[[22265]],63914:[[23527]],63915:[[23994]],63916:[[24604]],63917:[[29618]],63918:[[29801]],63919:[[32666]],63920:[[32838]],63921:[[37428]],63922:[[38646]],63923:[[38728]],63924:[[38936]],63925:[[20363]],63926:[[31150]],63927:[[37300]],63928:[[38584]],63929:[[24801]],63930:[[20102]],63931:[[20698]],63932:[[23534]],63933:[[23615]],63934:[[26009]],63935:[[27138]],63936:[[29134]],63937:[[30274]],63938:[[34044]],63939:[[36988]],63940:[[40845]],63941:[[26248]],63942:[[38446]],63943:[[21129]],63944:[[26491]],63945:[[26611]],63946:[[27969]],63947:[[28316]],63948:[[29705]],63949:[[30041]],63950:[[30827]],63951:[[32016]],63952:[[39006]],63953:[[20845]],63954:[[25134]],63955:[[38520]],63956:[[20523]],63957:[[23833]],63958:[[28138]],63959:[[36650]],63960:[[24459]],63961:[[24900]],63962:[[26647]],63963:[[29575]],63964:[[38534]],63965:[[21033]],63966:[[21519]],63967:[[23653]],63968:[[26131]],63969:[[26446]],63970:[[26792]],63971:[[27877]],63972:[[29702]],63973:[[30178]],63974:[[32633]],63975:[[35023]],63976:[[35041]],63977:[[37324]],63978:[[38626]],63979:[[21311]],63980:[[28346]],63981:[[21533]],63982:[[29136]],63983:[[29848]],63984:[[34298]],63985:[[38563]],63986:[[40023]],63987:[[40607]],63988:[[26519]],63989:[[28107]],63990:[[33256]],63991:[[31435]],63992:[[31520]],63993:[[31890]],63994:[[29376]],63995:[[28825]],63996:[[35672]],63997:[[20160]],63998:[[33590]],63999:[[21050]],194816:[[27966]],194817:[[28023]],194818:[[27969]],194819:[[28009]],194820:[[28024]],194821:[[28037]],194822:[[146718]],194823:[[27956]],194824:[[28207]],194825:[[28270]],194826:[[15667]],194827:[[28363]],194828:[[28359]],194829:[[147153]],194830:[[28153]],194831:[[28526]],194832:[[147294]],194833:[[147342]],194834:[[28614]],194835:[[28729]],194836:[[28702]],194837:[[28699]],194838:[[15766]],194839:[[28746]],194840:[[28797]],194841:[[28791]],194842:[[28845]],194843:[[132389]],194844:[[28997]],194845:[[148067]],194846:[[29084]],194847:[[148395]],194848:[[29224]],194849:[[29237]],194850:[[29264]],194851:[[149000]],194852:[[29312]],194853:[[29333]],194854:[[149301]],194855:[[149524]],194856:[[29562]],194857:[[29579]],194858:[[16044]],194859:[[29605]],194860:[[16056]],194861:[[16056]],194862:[[29767]],194863:[[29788]],194864:[[29809]],194865:[[29829]],194866:[[29898]],194867:[[16155]],194868:[[29988]],194869:[[150582]],194870:[[30014]],194871:[[150674]],194872:[[30064]],194873:[[139679]],194874:[[30224]],194875:[[151457]],194876:[[151480]],194877:[[151620]],194878:[[16380]],194879:[[16392]],194880:[[30452]],194881:[[151795]],194882:[[151794]],194883:[[151833]],194884:[[151859]],194885:[[30494]],194886:[[30495]],194887:[[30495]],194888:[[30538]],194889:[[16441]],194890:[[30603]],194891:[[16454]],194892:[[16534]],194893:[[152605]],194894:[[30798]],194895:[[30860]],194896:[[30924]],194897:[[16611]],194898:[[153126]],194899:[[31062]],194900:[[153242]],194901:[[153285]],194902:[[31119]],194903:[[31211]],194904:[[16687]],194905:[[31296]],194906:[[31306]],194907:[[31311]],194908:[[153980]],194909:[[154279]],194910:[[154279]],194911:[[31470]],194912:[[16898]],194913:[[154539]],194914:[[31686]],194915:[[31689]],194916:[[16935]],194917:[[154752]],194918:[[31954]],194919:[[17056]],194920:[[31976]],194921:[[31971]],194922:[[32000]],194923:[[155526]],194924:[[32099]],194925:[[17153]],194926:[[32199]],194927:[[32258]],194928:[[32325]],194929:[[17204]],194930:[[156200]],194931:[[156231]],194932:[[17241]],194933:[[156377]],194934:[[32634]],194935:[[156478]],194936:[[32661]],194937:[[32762]],194938:[[32773]],194939:[[156890]],194940:[[156963]],194941:[[32864]],194942:[[157096]],194943:[[32880]],194944:[[144223]],194945:[[17365]],194946:[[32946]],194947:[[33027]],194948:[[17419]],194949:[[33086]],194950:[[23221]],194951:[[157607]],194952:[[157621]],194953:[[144275]],194954:[[144284]],194955:[[33281]],194956:[[33284]],194957:[[36766]],194958:[[17515]],194959:[[33425]],194960:[[33419]],194961:[[33437]],194962:[[21171]],194963:[[33457]],194964:[[33459]],194965:[[33469]],194966:[[33510]],194967:[[158524]],194968:[[33509]],194969:[[33565]],194970:[[33635]],194971:[[33709]],194972:[[33571]],194973:[[33725]],194974:[[33767]],194975:[[33879]],194976:[[33619]],194977:[[33738]],194978:[[33740]],194979:[[33756]],194980:[[158774]],194981:[[159083]],194982:[[158933]],194983:[[17707]],194984:[[34033]],194985:[[34035]],194986:[[34070]],194987:[[160714]],194988:[[34148]],194989:[[159532]],194990:[[17757]],194991:[[17761]],194992:[[159665]],194993:[[159954]],194994:[[17771]],194995:[[34384]],194996:[[34396]],194997:[[34407]],194998:[[34409]],194999:[[34473]],195000:[[34440]],195001:[[34574]],195002:[[34530]],195003:[[34681]],195004:[[34600]],195005:[[34667]],195006:[[34694]],195007:[[17879]],195008:[[34785]],195009:[[34817]],195010:[[17913]],195011:[[34912]],195012:[[34915]],195013:[[161383]],195014:[[35031]],195015:[[35038]],195016:[[17973]],195017:[[35066]],195018:[[13499]],195019:[[161966]],195020:[[162150]],195021:[[18110]],195022:[[18119]],195023:[[35488]],195024:[[35565]],195025:[[35722]],195026:[[35925]],195027:[[162984]],195028:[[36011]],195029:[[36033]],195030:[[36123]],195031:[[36215]],195032:[[163631]],195033:[[133124]],195034:[[36299]],195035:[[36284]],195036:[[36336]],195037:[[133342]],195038:[[36564]],195039:[[36664]],195040:[[165330]],195041:[[165357]],195042:[[37012]],195043:[[37105]],195044:[[37137]],195045:[[165678]],195046:[[37147]],195047:[[37432]],195048:[[37591]],195049:[[37592]],195050:[[37500]],195051:[[37881]],195052:[[37909]],195053:[[166906]],195054:[[38283]],195055:[[18837]],195056:[[38327]],195057:[[167287]],195058:[[18918]],195059:[[38595]],195060:[[23986]],195061:[[38691]],195062:[[168261]],195063:[[168474]],195064:[[19054]],195065:[[19062]],195066:[[38880]],195067:[[168970]],195068:[[19122]],195069:[[169110]],195070:[[38923]],195071:[[38923]]},
64000:{64000:[[20999]],64001:[[24230]],64002:[[25299]],64003:[[31958]],64004:[[23429]],64005:[[27934]],64006:[[26292]],64007:[[36667]],64008:[[34892]],64009:[[38477]],64010:[[35211]],64011:[[24275]],64012:[[20800]],64013:[[21952]],64016:[[22618]],64018:[[26228]],64021:[[20958]],64022:[[29482]],64023:[[30410]],64024:[[31036]],64025:[[31070]],64026:[[31077]],64027:[[31119]],64028:[[38742]],64029:[[31934]],64030:[[32701]],64032:[[34322]],64034:[[35576]],64037:[[36920]],64038:[[37117]],64042:[[39151]],64043:[[39164]],64044:[[39208]],64045:[[40372]],64046:[[37086]],64047:[[38583]],64048:[[20398]],64049:[[20711]],64050:[[20813]],64051:[[21193]],64052:[[21220]],64053:[[21329]],64054:[[21917]],64055:[[22022]],64056:[[22120]],64057:[[22592]],64058:[[22696]],64059:[[23652]],64060:[[23662]],64061:[[24724]],64062:[[24936]],64063:[[24974]],64064:[[25074]],64065:[[25935]],64066:[[26082]],64067:[[26257]],64068:[[26757]],64069:[[28023]],64070:[[28186]],64071:[[28450]],64072:[[29038]],64073:[[29227]],64074:[[29730]],64075:[[30865]],64076:[[31038]],64077:[[31049]],64078:[[31048]],64079:[[31056]],64080:[[31062]],64081:[[31069]],64082:[[31117]],64083:[[31118]],64084:[[31296]],64085:[[31361]],64086:[[31680]],64087:[[32244]],64088:[[32265]],64089:[[32321]],64090:[[32626]],64091:[[32773]],64092:[[33261]],64093:[[33401]],64094:[[33401]],64095:[[33879]],64096:[[35088]],64097:[[35222]],64098:[[35585]],64099:[[35641]],64100:[[36051]],64101:[[36104]],64102:[[36790]],64103:[[36920]],64104:[[38627]],64105:[[38911]],64106:[[38971]],64107:[[24693]],64108:[[148206]],64109:[[33304]],64112:[[20006]],64113:[[20917]],64114:[[20840]],64115:[[20352]],64116:[[20805]],64117:[[20864]],64118:[[21191]],64119:[[21242]],64120:[[21917]],64121:[[21845]],64122:[[21913]],64123:[[21986]],64124:[[22618]],64125:[[22707]],64126:[[22852]],64127:[[22868]],64128:[[23138]],64129:[[23336]],64130:[[24274]],64131:[[24281]],64132:[[24425]],64133:[[24493]],64134:[[24792]],64135:[[24910]],64136:[[24840]],64137:[[24974]],64138:[[24928]],64139:[[25074]],64140:[[25140]],64141:[[25540]],64142:[[25628]],64143:[[25682]],64144:[[25942]],64145:[[26228]],64146:[[26391]],64147:[[26395]],64148:[[26454]],64149:[[27513]],64150:[[27578]],64151:[[27969]],64152:[[28379]],64153:[[28363]],64154:[[28450]],64155:[[28702]],64156:[[29038]],64157:[[30631]],64158:[[29237]],64159:[[29359]],64160:[[29482]],64161:[[29809]],64162:[[29958]],64163:[[30011]],64164:[[30237]],64165:[[30239]],64166:[[30410]],64167:[[30427]],64168:[[30452]],64169:[[30538]],64170:[[30528]],64171:[[30924]],64172:[[31409]],64173:[[31680]],64174:[[31867]],64175:[[32091]],64176:[[32244]],64177:[[32574]],64178:[[32773]],64179:[[33618]],64180:[[33775]],64181:[[34681]],64182:[[35137]],64183:[[35206]],64184:[[35222]],64185:[[35519]],64186:[[35576]],64187:[[35531]],64188:[[35585]],64189:[[35582]],64190:[[35565]],64191:[[35641]],64192:[[35722]],64193:[[36104]],64194:[[36664]],64195:[[36978]],64196:[[37273]],64197:[[37494]],64198:[[38524]],64199:[[38627]],64200:[[38742]],64201:[[38875]],64202:[[38911]],64203:[[38923]],64204:[[38971]],64205:[[39698]],64206:[[40860]],64207:[[141386]],64208:[[141380]],64209:[[144341]],64210:[[15261]],64211:[[16408]],64212:[[16441]],64213:[[152137]],64214:[[154832]],64215:[[163539]],64216:[[40771]],64217:[[40846]],195072:[[38953]],195073:[[169398]],195074:[[39138]],195075:[[19251]],195076:[[39209]],195077:[[39335]],195078:[[39362]],195079:[[39422]],195080:[[19406]],195081:[[170800]],195082:[[39698]],195083:[[40000]],195084:[[40189]],195085:[[19662]],195086:[[19693]],195087:[[40295]],195088:[[172238]],195089:[[19704]],195090:[[172293]],195091:[[172558]],195092:[[172689]],195093:[[40635]],195094:[[19798]],195095:[[40697]],195096:[[40702]],195097:[[40709]],195098:[[40719]],195099:[[40726]],195100:[[40763]],195101:[[173568]]},
64256:{64256:[[102,102],256],64257:[[102,105],256],64258:[[102,108],256],64259:[[102,102,105],256],64260:[[102,102,108],256],64261:[[383,116],256],64262:[[115,116],256],64275:[[1396,1398],256],64276:[[1396,1381],256],64277:[[1396,1387],256],64278:[[1406,1398],256],64279:[[1396,1389],256],64285:[[1497,1460],512],64286:[,26],64287:[[1522,1463],512],64288:[[1506],256],64289:[[1488],256],64290:[[1491],256],64291:[[1492],256],64292:[[1499],256],64293:[[1500],256],64294:[[1501],256],64295:[[1512],256],64296:[[1514],256],64297:[[43],256],64298:[[1513,1473],512],64299:[[1513,1474],512],64300:[[64329,1473],512],64301:[[64329,1474],512],64302:[[1488,1463],512],64303:[[1488,1464],512],64304:[[1488,1468],512],64305:[[1489,1468],512],64306:[[1490,1468],512],64307:[[1491,1468],512],64308:[[1492,1468],512],64309:[[1493,1468],512],64310:[[1494,1468],512],64312:[[1496,1468],512],64313:[[1497,1468],512],64314:[[1498,1468],512],64315:[[1499,1468],512],64316:[[1500,1468],512],64318:[[1502,1468],512],64320:[[1504,1468],512],64321:[[1505,1468],512],64323:[[1507,1468],512],64324:[[1508,1468],512],64326:[[1510,1468],512],64327:[[1511,1468],512],64328:[[1512,1468],512],64329:[[1513,1468],512],64330:[[1514,1468],512],64331:[[1493,1465],512],64332:[[1489,1471],512],64333:[[1499,1471],512],64334:[[1508,1471],512],64335:[[1488,1500],256],64336:[[1649],256],64337:[[1649],256],64338:[[1659],256],64339:[[1659],256],64340:[[1659],256],64341:[[1659],256],64342:[[1662],256],64343:[[1662],256],64344:[[1662],256],64345:[[1662],256],64346:[[1664],256],64347:[[1664],256],64348:[[1664],256],64349:[[1664],256],64350:[[1658],256],64351:[[1658],256],64352:[[1658],256],64353:[[1658],256],64354:[[1663],256],64355:[[1663],256],64356:[[1663],256],64357:[[1663],256],64358:[[1657],256],64359:[[1657],256],64360:[[1657],256],64361:[[1657],256],64362:[[1700],256],64363:[[1700],256],64364:[[1700],256],64365:[[1700],256],64366:[[1702],256],64367:[[1702],256],64368:[[1702],256],64369:[[1702],256],64370:[[1668],256],64371:[[1668],256],64372:[[1668],256],64373:[[1668],256],64374:[[1667],256],64375:[[1667],256],64376:[[1667],256],64377:[[1667],256],64378:[[1670],256],64379:[[1670],256],64380:[[1670],256],64381:[[1670],256],64382:[[1671],256],64383:[[1671],256],64384:[[1671],256],64385:[[1671],256],64386:[[1677],256],64387:[[1677],256],64388:[[1676],256],64389:[[1676],256],64390:[[1678],256],64391:[[1678],256],64392:[[1672],256],64393:[[1672],256],64394:[[1688],256],64395:[[1688],256],64396:[[1681],256],64397:[[1681],256],64398:[[1705],256],64399:[[1705],256],64400:[[1705],256],64401:[[1705],256],64402:[[1711],256],64403:[[1711],256],64404:[[1711],256],64405:[[1711],256],64406:[[1715],256],64407:[[1715],256],64408:[[1715],256],64409:[[1715],256],64410:[[1713],256],64411:[[1713],256],64412:[[1713],256],64413:[[1713],256],64414:[[1722],256],64415:[[1722],256],64416:[[1723],256],64417:[[1723],256],64418:[[1723],256],64419:[[1723],256],64420:[[1728],256],64421:[[1728],256],64422:[[1729],256],64423:[[1729],256],64424:[[1729],256],64425:[[1729],256],64426:[[1726],256],64427:[[1726],256],64428:[[1726],256],64429:[[1726],256],64430:[[1746],256],64431:[[1746],256],64432:[[1747],256],64433:[[1747],256],64467:[[1709],256],64468:[[1709],256],64469:[[1709],256],64470:[[1709],256],64471:[[1735],256],64472:[[1735],256],64473:[[1734],256],64474:[[1734],256],64475:[[1736],256],64476:[[1736],256],64477:[[1655],256],64478:[[1739],256],64479:[[1739],256],64480:[[1733],256],64481:[[1733],256],64482:[[1737],256],64483:[[1737],256],64484:[[1744],256],64485:[[1744],256],64486:[[1744],256],64487:[[1744],256],64488:[[1609],256],64489:[[1609],256],64490:[[1574,1575],256],64491:[[1574,1575],256],64492:[[1574,1749],256],64493:[[1574,1749],256],64494:[[1574,1608],256],64495:[[1574,1608],256],64496:[[1574,1735],256],64497:[[1574,1735],256],64498:[[1574,1734],256],64499:[[1574,1734],256],64500:[[1574,1736],256],64501:[[1574,1736],256],64502:[[1574,1744],256],64503:[[1574,1744],256],64504:[[1574,1744],256],64505:[[1574,1609],256],64506:[[1574,1609],256],64507:[[1574,1609],256],64508:[[1740],256],64509:[[1740],256],64510:[[1740],256],64511:[[1740],256]},
64512:{64512:[[1574,1580],256],64513:[[1574,1581],256],64514:[[1574,1605],256],64515:[[1574,1609],256],64516:[[1574,1610],256],64517:[[1576,1580],256],64518:[[1576,1581],256],64519:[[1576,1582],256],64520:[[1576,1605],256],64521:[[1576,1609],256],64522:[[1576,1610],256],64523:[[1578,1580],256],64524:[[1578,1581],256],64525:[[1578,1582],256],64526:[[1578,1605],256],64527:[[1578,1609],256],64528:[[1578,1610],256],64529:[[1579,1580],256],64530:[[1579,1605],256],64531:[[1579,1609],256],64532:[[1579,1610],256],64533:[[1580,1581],256],64534:[[1580,1605],256],64535:[[1581,1580],256],64536:[[1581,1605],256],64537:[[1582,1580],256],64538:[[1582,1581],256],64539:[[1582,1605],256],64540:[[1587,1580],256],64541:[[1587,1581],256],64542:[[1587,1582],256],64543:[[1587,1605],256],64544:[[1589,1581],256],64545:[[1589,1605],256],64546:[[1590,1580],256],64547:[[1590,1581],256],64548:[[1590,1582],256],64549:[[1590,1605],256],64550:[[1591,1581],256],64551:[[1591,1605],256],64552:[[1592,1605],256],64553:[[1593,1580],256],64554:[[1593,1605],256],64555:[[1594,1580],256],64556:[[1594,1605],256],64557:[[1601,1580],256],64558:[[1601,1581],256],64559:[[1601,1582],256],64560:[[1601,1605],256],64561:[[1601,1609],256],64562:[[1601,1610],256],64563:[[1602,1581],256],64564:[[1602,1605],256],64565:[[1602,1609],256],64566:[[1602,1610],256],64567:[[1603,1575],256],64568:[[1603,1580],256],64569:[[1603,1581],256],64570:[[1603,1582],256],64571:[[1603,1604],256],64572:[[1603,1605],256],64573:[[1603,1609],256],64574:[[1603,1610],256],64575:[[1604,1580],256],64576:[[1604,1581],256],64577:[[1604,1582],256],64578:[[1604,1605],256],64579:[[1604,1609],256],64580:[[1604,1610],256],64581:[[1605,1580],256],64582:[[1605,1581],256],64583:[[1605,1582],256],64584:[[1605,1605],256],64585:[[1605,1609],256],64586:[[1605,1610],256],64587:[[1606,1580],256],64588:[[1606,1581],256],64589:[[1606,1582],256],64590:[[1606,1605],256],64591:[[1606,1609],256],64592:[[1606,1610],256],64593:[[1607,1580],256],64594:[[1607,1605],256],64595:[[1607,1609],256],64596:[[1607,1610],256],64597:[[1610,1580],256],64598:[[1610,1581],256],64599:[[1610,1582],256],64600:[[1610,1605],256],64601:[[1610,1609],256],64602:[[1610,1610],256],64603:[[1584,1648],256],64604:[[1585,1648],256],64605:[[1609,1648],256],64606:[[32,1612,1617],256],64607:[[32,1613,1617],256],64608:[[32,1614,1617],256],64609:[[32,1615,1617],256],64610:[[32,1616,1617],256],64611:[[32,1617,1648],256],64612:[[1574,1585],256],64613:[[1574,1586],256],64614:[[1574,1605],256],64615:[[1574,1606],256],64616:[[1574,1609],256],64617:[[1574,1610],256],64618:[[1576,1585],256],64619:[[1576,1586],256],64620:[[1576,1605],256],64621:[[1576,1606],256],64622:[[1576,1609],256],64623:[[1576,1610],256],64624:[[1578,1585],256],64625:[[1578,1586],256],64626:[[1578,1605],256],64627:[[1578,1606],256],64628:[[1578,1609],256],64629:[[1578,1610],256],64630:[[1579,1585],256],64631:[[1579,1586],256],64632:[[1579,1605],256],64633:[[1579,1606],256],64634:[[1579,1609],256],64635:[[1579,1610],256],64636:[[1601,1609],256],64637:[[1601,1610],256],64638:[[1602,1609],256],64639:[[1602,1610],256],64640:[[1603,1575],256],64641:[[1603,1604],256],64642:[[1603,1605],256],64643:[[1603,1609],256],64644:[[1603,1610],256],64645:[[1604,1605],256],64646:[[1604,1609],256],64647:[[1604,1610],256],64648:[[1605,1575],256],64649:[[1605,1605],256],64650:[[1606,1585],256],64651:[[1606,1586],256],64652:[[1606,1605],256],64653:[[1606,1606],256],64654:[[1606,1609],256],64655:[[1606,1610],256],64656:[[1609,1648],256],64657:[[1610,1585],256],64658:[[1610,1586],256],64659:[[1610,1605],256],64660:[[1610,1606],256],64661:[[1610,1609],256],64662:[[1610,1610],256],64663:[[1574,1580],256],64664:[[1574,1581],256],64665:[[1574,1582],256],64666:[[1574,1605],256],64667:[[1574,1607],256],64668:[[1576,1580],256],64669:[[1576,1581],256],64670:[[1576,1582],256],64671:[[1576,1605],256],64672:[[1576,1607],256],64673:[[1578,1580],256],64674:[[1578,1581],256],64675:[[1578,1582],256],64676:[[1578,1605],256],64677:[[1578,1607],256],64678:[[1579,1605],256],64679:[[1580,1581],256],64680:[[1580,1605],256],64681:[[1581,1580],256],64682:[[1581,1605],256],64683:[[1582,1580],256],64684:[[1582,1605],256],64685:[[1587,1580],256],64686:[[1587,1581],256],64687:[[1587,1582],256],64688:[[1587,1605],256],64689:[[1589,1581],256],64690:[[1589,1582],256],64691:[[1589,1605],256],64692:[[1590,1580],256],64693:[[1590,1581],256],64694:[[1590,1582],256],64695:[[1590,1605],256],64696:[[1591,1581],256],64697:[[1592,1605],256],64698:[[1593,1580],256],64699:[[1593,1605],256],64700:[[1594,1580],256],64701:[[1594,1605],256],64702:[[1601,1580],256],64703:[[1601,1581],256],64704:[[1601,1582],256],64705:[[1601,1605],256],64706:[[1602,1581],256],64707:[[1602,1605],256],64708:[[1603,1580],256],64709:[[1603,1581],256],64710:[[1603,1582],256],64711:[[1603,1604],256],64712:[[1603,1605],256],64713:[[1604,1580],256],64714:[[1604,1581],256],64715:[[1604,1582],256],64716:[[1604,1605],256],64717:[[1604,1607],256],64718:[[1605,1580],256],64719:[[1605,1581],256],64720:[[1605,1582],256],64721:[[1605,1605],256],64722:[[1606,1580],256],64723:[[1606,1581],256],64724:[[1606,1582],256],64725:[[1606,1605],256],64726:[[1606,1607],256],64727:[[1607,1580],256],64728:[[1607,1605],256],64729:[[1607,1648],256],64730:[[1610,1580],256],64731:[[1610,1581],256],64732:[[1610,1582],256],64733:[[1610,1605],256],64734:[[1610,1607],256],64735:[[1574,1605],256],64736:[[1574,1607],256],64737:[[1576,1605],256],64738:[[1576,1607],256],64739:[[1578,1605],256],64740:[[1578,1607],256],64741:[[1579,1605],256],64742:[[1579,1607],256],64743:[[1587,1605],256],64744:[[1587,1607],256],64745:[[1588,1605],256],64746:[[1588,1607],256],64747:[[1603,1604],256],64748:[[1603,1605],256],64749:[[1604,1605],256],64750:[[1606,1605],256],64751:[[1606,1607],256],64752:[[1610,1605],256],64753:[[1610,1607],256],64754:[[1600,1614,1617],256],64755:[[1600,1615,1617],256],64756:[[1600,1616,1617],256],64757:[[1591,1609],256],64758:[[1591,1610],256],64759:[[1593,1609],256],64760:[[1593,1610],256],64761:[[1594,1609],256],64762:[[1594,1610],256],64763:[[1587,1609],256],64764:[[1587,1610],256],64765:[[1588,1609],256],64766:[[1588,1610],256],64767:[[1581,1609],256]},
64768:{64768:[[1581,1610],256],64769:[[1580,1609],256],64770:[[1580,1610],256],64771:[[1582,1609],256],64772:[[1582,1610],256],64773:[[1589,1609],256],64774:[[1589,1610],256],64775:[[1590,1609],256],64776:[[1590,1610],256],64777:[[1588,1580],256],64778:[[1588,1581],256],64779:[[1588,1582],256],64780:[[1588,1605],256],64781:[[1588,1585],256],64782:[[1587,1585],256],64783:[[1589,1585],256],64784:[[1590,1585],256],64785:[[1591,1609],256],64786:[[1591,1610],256],64787:[[1593,1609],256],64788:[[1593,1610],256],64789:[[1594,1609],256],64790:[[1594,1610],256],64791:[[1587,1609],256],64792:[[1587,1610],256],64793:[[1588,1609],256],64794:[[1588,1610],256],64795:[[1581,1609],256],64796:[[1581,1610],256],64797:[[1580,1609],256],64798:[[1580,1610],256],64799:[[1582,1609],256],64800:[[1582,1610],256],64801:[[1589,1609],256],64802:[[1589,1610],256],64803:[[1590,1609],256],64804:[[1590,1610],256],64805:[[1588,1580],256],64806:[[1588,1581],256],64807:[[1588,1582],256],64808:[[1588,1605],256],64809:[[1588,1585],256],64810:[[1587,1585],256],64811:[[1589,1585],256],64812:[[1590,1585],256],64813:[[1588,1580],256],64814:[[1588,1581],256],64815:[[1588,1582],256],64816:[[1588,1605],256],64817:[[1587,1607],256],64818:[[1588,1607],256],64819:[[1591,1605],256],64820:[[1587,1580],256],64821:[[1587,1581],256],64822:[[1587,1582],256],64823:[[1588,1580],256],64824:[[1588,1581],256],64825:[[1588,1582],256],64826:[[1591,1605],256],64827:[[1592,1605],256],64828:[[1575,1611],256],64829:[[1575,1611],256],64848:[[1578,1580,1605],256],64849:[[1578,1581,1580],256],64850:[[1578,1581,1580],256],64851:[[1578,1581,1605],256],64852:[[1578,1582,1605],256],64853:[[1578,1605,1580],256],64854:[[1578,1605,1581],256],64855:[[1578,1605,1582],256],64856:[[1580,1605,1581],256],64857:[[1580,1605,1581],256],64858:[[1581,1605,1610],256],64859:[[1581,1605,1609],256],64860:[[1587,1581,1580],256],64861:[[1587,1580,1581],256],64862:[[1587,1580,1609],256],64863:[[1587,1605,1581],256],64864:[[1587,1605,1581],256],64865:[[1587,1605,1580],256],64866:[[1587,1605,1605],256],64867:[[1587,1605,1605],256],64868:[[1589,1581,1581],256],64869:[[1589,1581,1581],256],64870:[[1589,1605,1605],256],64871:[[1588,1581,1605],256],64872:[[1588,1581,1605],256],64873:[[1588,1580,1610],256],64874:[[1588,1605,1582],256],64875:[[1588,1605,1582],256],64876:[[1588,1605,1605],256],64877:[[1588,1605,1605],256],64878:[[1590,1581,1609],256],64879:[[1590,1582,1605],256],64880:[[1590,1582,1605],256],64881:[[1591,1605,1581],256],64882:[[1591,1605,1581],256],64883:[[1591,1605,1605],256],64884:[[1591,1605,1610],256],64885:[[1593,1580,1605],256],64886:[[1593,1605,1605],256],64887:[[1593,1605,1605],256],64888:[[1593,1605,1609],256],64889:[[1594,1605,1605],256],64890:[[1594,1605,1610],256],64891:[[1594,1605,1609],256],64892:[[1601,1582,1605],256],64893:[[1601,1582,1605],256],64894:[[1602,1605,1581],256],64895:[[1602,1605,1605],256],64896:[[1604,1581,1605],256],64897:[[1604,1581,1610],256],64898:[[1604,1581,1609],256],64899:[[1604,1580,1580],256],64900:[[1604,1580,1580],256],64901:[[1604,1582,1605],256],64902:[[1604,1582,1605],256],64903:[[1604,1605,1581],256],64904:[[1604,1605,1581],256],64905:[[1605,1581,1580],256],64906:[[1605,1581,1605],256],64907:[[1605,1581,1610],256],64908:[[1605,1580,1581],256],64909:[[1605,1580,1605],256],64910:[[1605,1582,1580],256],64911:[[1605,1582,1605],256],64914:[[1605,1580,1582],256],64915:[[1607,1605,1580],256],64916:[[1607,1605,1605],256],64917:[[1606,1581,1605],256],64918:[[1606,1581,1609],256],64919:[[1606,1580,1605],256],64920:[[1606,1580,1605],256],64921:[[1606,1580,1609],256],64922:[[1606,1605,1610],256],64923:[[1606,1605,1609],256],64924:[[1610,1605,1605],256],64925:[[1610,1605,1605],256],64926:[[1576,1582,1610],256],64927:[[1578,1580,1610],256],64928:[[1578,1580,1609],256],64929:[[1578,1582,1610],256],64930:[[1578,1582,1609],256],64931:[[1578,1605,1610],256],64932:[[1578,1605,1609],256],64933:[[1580,1605,1610],256],64934:[[1580,1581,1609],256],64935:[[1580,1605,1609],256],64936:[[1587,1582,1609],256],64937:[[1589,1581,1610],256],64938:[[1588,1581,1610],256],64939:[[1590,1581,1610],256],64940:[[1604,1580,1610],256],64941:[[1604,1605,1610],256],64942:[[1610,1581,1610],256],64943:[[1610,1580,1610],256],64944:[[1610,1605,1610],256],64945:[[1605,1605,1610],256],64946:[[1602,1605,1610],256],64947:[[1606,1581,1610],256],64948:[[1602,1605,1581],256],64949:[[1604,1581,1605],256],64950:[[1593,1605,1610],256],64951:[[1603,1605,1610],256],64952:[[1606,1580,1581],256],64953:[[1605,1582,1610],256],64954:[[1604,1580,1605],256],64955:[[1603,1605,1605],256],64956:[[1604,1580,1605],256],64957:[[1606,1580,1581],256],64958:[[1580,1581,1610],256],64959:[[1581,1580,1610],256],64960:[[1605,1580,1610],256],64961:[[1601,1605,1610],256],64962:[[1576,1581,1610],256],64963:[[1603,1605,1605],256],64964:[[1593,1580,1605],256],64965:[[1589,1605,1605],256],64966:[[1587,1582,1610],256],64967:[[1606,1580,1610],256],65008:[[1589,1604,1746],256],65009:[[1602,1604,1746],256],65010:[[1575,1604,1604,1607],256],65011:[[1575,1603,1576,1585],256],65012:[[1605,1581,1605,1583],256],65013:[[1589,1604,1593,1605],256],65014:[[1585,1587,1608,1604],256],65015:[[1593,1604,1610,1607],256],65016:[[1608,1587,1604,1605],256],65017:[[1589,1604,1609],256],65018:[[1589,1604,1609,32,1575,1604,1604,1607,32,1593,1604,1610,1607,32,1608,1587,1604,1605],256],65019:[[1580,1604,32,1580,1604,1575,1604,1607],256],65020:[[1585,1740,1575,1604],256]},
65024:{65040:[[44],256],65041:[[12289],256],65042:[[12290],256],65043:[[58],256],65044:[[59],256],65045:[[33],256],65046:[[63],256],65047:[[12310],256],65048:[[12311],256],65049:[[8230],256],65056:[,230],65057:[,230],65058:[,230],65059:[,230],65060:[,230],65061:[,230],65062:[,230],65072:[[8229],256],65073:[[8212],256],65074:[[8211],256],65075:[[95],256],65076:[[95],256],65077:[[40],256],65078:[[41],256],65079:[[123],256],65080:[[125],256],65081:[[12308],256],65082:[[12309],256],65083:[[12304],256],65084:[[12305],256],65085:[[12298],256],65086:[[12299],256],65087:[[12296],256],65088:[[12297],256],65089:[[12300],256],65090:[[12301],256],65091:[[12302],256],65092:[[12303],256],65095:[[91],256],65096:[[93],256],65097:[[8254],256],65098:[[8254],256],65099:[[8254],256],65100:[[8254],256],65101:[[95],256],65102:[[95],256],65103:[[95],256],65104:[[44],256],65105:[[12289],256],65106:[[46],256],65108:[[59],256],65109:[[58],256],65110:[[63],256],65111:[[33],256],65112:[[8212],256],65113:[[40],256],65114:[[41],256],65115:[[123],256],65116:[[125],256],65117:[[12308],256],65118:[[12309],256],65119:[[35],256],65120:[[38],256],65121:[[42],256],65122:[[43],256],65123:[[45],256],65124:[[60],256],65125:[[62],256],65126:[[61],256],65128:[[92],256],65129:[[36],256],65130:[[37],256],65131:[[64],256],65136:[[32,1611],256],65137:[[1600,1611],256],65138:[[32,1612],256],65140:[[32,1613],256],65142:[[32,1614],256],65143:[[1600,1614],256],65144:[[32,1615],256],65145:[[1600,1615],256],65146:[[32,1616],256],65147:[[1600,1616],256],65148:[[32,1617],256],65149:[[1600,1617],256],65150:[[32,1618],256],65151:[[1600,1618],256],65152:[[1569],256],65153:[[1570],256],65154:[[1570],256],65155:[[1571],256],65156:[[1571],256],65157:[[1572],256],65158:[[1572],256],65159:[[1573],256],65160:[[1573],256],65161:[[1574],256],65162:[[1574],256],65163:[[1574],256],65164:[[1574],256],65165:[[1575],256],65166:[[1575],256],65167:[[1576],256],65168:[[1576],256],65169:[[1576],256],65170:[[1576],256],65171:[[1577],256],65172:[[1577],256],65173:[[1578],256],65174:[[1578],256],65175:[[1578],256],65176:[[1578],256],65177:[[1579],256],65178:[[1579],256],65179:[[1579],256],65180:[[1579],256],65181:[[1580],256],65182:[[1580],256],65183:[[1580],256],65184:[[1580],256],65185:[[1581],256],65186:[[1581],256],65187:[[1581],256],65188:[[1581],256],65189:[[1582],256],65190:[[1582],256],65191:[[1582],256],65192:[[1582],256],65193:[[1583],256],65194:[[1583],256],65195:[[1584],256],65196:[[1584],256],65197:[[1585],256],65198:[[1585],256],65199:[[1586],256],65200:[[1586],256],65201:[[1587],256],65202:[[1587],256],65203:[[1587],256],65204:[[1587],256],65205:[[1588],256],65206:[[1588],256],65207:[[1588],256],65208:[[1588],256],65209:[[1589],256],65210:[[1589],256],65211:[[1589],256],65212:[[1589],256],65213:[[1590],256],65214:[[1590],256],65215:[[1590],256],65216:[[1590],256],65217:[[1591],256],65218:[[1591],256],65219:[[1591],256],65220:[[1591],256],65221:[[1592],256],65222:[[1592],256],65223:[[1592],256],65224:[[1592],256],65225:[[1593],256],65226:[[1593],256],65227:[[1593],256],65228:[[1593],256],65229:[[1594],256],65230:[[1594],256],65231:[[1594],256],65232:[[1594],256],65233:[[1601],256],65234:[[1601],256],65235:[[1601],256],65236:[[1601],256],65237:[[1602],256],65238:[[1602],256],65239:[[1602],256],65240:[[1602],256],65241:[[1603],256],65242:[[1603],256],65243:[[1603],256],65244:[[1603],256],65245:[[1604],256],65246:[[1604],256],65247:[[1604],256],65248:[[1604],256],65249:[[1605],256],65250:[[1605],256],65251:[[1605],256],65252:[[1605],256],65253:[[1606],256],65254:[[1606],256],65255:[[1606],256],65256:[[1606],256],65257:[[1607],256],65258:[[1607],256],65259:[[1607],256],65260:[[1607],256],65261:[[1608],256],65262:[[1608],256],65263:[[1609],256],65264:[[1609],256],65265:[[1610],256],65266:[[1610],256],65267:[[1610],256],65268:[[1610],256],65269:[[1604,1570],256],65270:[[1604,1570],256],65271:[[1604,1571],256],65272:[[1604,1571],256],65273:[[1604,1573],256],65274:[[1604,1573],256],65275:[[1604,1575],256],65276:[[1604,1575],256]},
65280:{65281:[[33],256],65282:[[34],256],65283:[[35],256],65284:[[36],256],65285:[[37],256],65286:[[38],256],65287:[[39],256],65288:[[40],256],65289:[[41],256],65290:[[42],256],65291:[[43],256],65292:[[44],256],65293:[[45],256],65294:[[46],256],65295:[[47],256],65296:[[48],256],65297:[[49],256],65298:[[50],256],65299:[[51],256],65300:[[52],256],65301:[[53],256],65302:[[54],256],65303:[[55],256],65304:[[56],256],65305:[[57],256],65306:[[58],256],65307:[[59],256],65308:[[60],256],65309:[[61],256],65310:[[62],256],65311:[[63],256],65312:[[64],256],65313:[[65],256],65314:[[66],256],65315:[[67],256],65316:[[68],256],65317:[[69],256],65318:[[70],256],65319:[[71],256],65320:[[72],256],65321:[[73],256],65322:[[74],256],65323:[[75],256],65324:[[76],256],65325:[[77],256],65326:[[78],256],65327:[[79],256],65328:[[80],256],65329:[[81],256],65330:[[82],256],65331:[[83],256],65332:[[84],256],65333:[[85],256],65334:[[86],256],65335:[[87],256],65336:[[88],256],65337:[[89],256],65338:[[90],256],65339:[[91],256],65340:[[92],256],65341:[[93],256],65342:[[94],256],65343:[[95],256],65344:[[96],256],65345:[[97],256],65346:[[98],256],65347:[[99],256],65348:[[100],256],65349:[[101],256],65350:[[102],256],65351:[[103],256],65352:[[104],256],65353:[[105],256],65354:[[106],256],65355:[[107],256],65356:[[108],256],65357:[[109],256],65358:[[110],256],65359:[[111],256],65360:[[112],256],65361:[[113],256],65362:[[114],256],65363:[[115],256],65364:[[116],256],65365:[[117],256],65366:[[118],256],65367:[[119],256],65368:[[120],256],65369:[[121],256],65370:[[122],256],65371:[[123],256],65372:[[124],256],65373:[[125],256],65374:[[126],256],65375:[[10629],256],65376:[[10630],256],65377:[[12290],256],65378:[[12300],256],65379:[[12301],256],65380:[[12289],256],65381:[[12539],256],65382:[[12530],256],65383:[[12449],256],65384:[[12451],256],65385:[[12453],256],65386:[[12455],256],65387:[[12457],256],65388:[[12515],256],65389:[[12517],256],65390:[[12519],256],65391:[[12483],256],65392:[[12540],256],65393:[[12450],256],65394:[[12452],256],65395:[[12454],256],65396:[[12456],256],65397:[[12458],256],65398:[[12459],256],65399:[[12461],256],65400:[[12463],256],65401:[[12465],256],65402:[[12467],256],65403:[[12469],256],65404:[[12471],256],65405:[[12473],256],65406:[[12475],256],65407:[[12477],256],65408:[[12479],256],65409:[[12481],256],65410:[[12484],256],65411:[[12486],256],65412:[[12488],256],65413:[[12490],256],65414:[[12491],256],65415:[[12492],256],65416:[[12493],256],65417:[[12494],256],65418:[[12495],256],65419:[[12498],256],65420:[[12501],256],65421:[[12504],256],65422:[[12507],256],65423:[[12510],256],65424:[[12511],256],65425:[[12512],256],65426:[[12513],256],65427:[[12514],256],65428:[[12516],256],65429:[[12518],256],65430:[[12520],256],65431:[[12521],256],65432:[[12522],256],65433:[[12523],256],65434:[[12524],256],65435:[[12525],256],65436:[[12527],256],65437:[[12531],256],65438:[[12441],256],65439:[[12442],256],65440:[[12644],256],65441:[[12593],256],65442:[[12594],256],65443:[[12595],256],65444:[[12596],256],65445:[[12597],256],65446:[[12598],256],65447:[[12599],256],65448:[[12600],256],65449:[[12601],256],65450:[[12602],256],65451:[[12603],256],65452:[[12604],256],65453:[[12605],256],65454:[[12606],256],65455:[[12607],256],65456:[[12608],256],65457:[[12609],256],65458:[[12610],256],65459:[[12611],256],65460:[[12612],256],65461:[[12613],256],65462:[[12614],256],65463:[[12615],256],65464:[[12616],256],65465:[[12617],256],65466:[[12618],256],65467:[[12619],256],65468:[[12620],256],65469:[[12621],256],65470:[[12622],256],65474:[[12623],256],65475:[[12624],256],65476:[[12625],256],65477:[[12626],256],65478:[[12627],256],65479:[[12628],256],65482:[[12629],256],65483:[[12630],256],65484:[[12631],256],65485:[[12632],256],65486:[[12633],256],65487:[[12634],256],65490:[[12635],256],65491:[[12636],256],65492:[[12637],256],65493:[[12638],256],65494:[[12639],256],65495:[[12640],256],65498:[[12641],256],65499:[[12642],256],65500:[[12643],256],65504:[[162],256],65505:[[163],256],65506:[[172],256],65507:[[175],256],65508:[[166],256],65509:[[165],256],65510:[[8361],256],65512:[[9474],256],65513:[[8592],256],65514:[[8593],256],65515:[[8594],256],65516:[[8595],256],65517:[[9632],256],65518:[[9675],256]}

};

   /***** Module to export */
   var unorm = {
      nfc: nfc,
      nfd: nfd,
      nfkc: nfkc,
      nfkd: nfkd,
   };

   /*globals module:true,define:true*/

   // CommonJS
   if (typeof module === "object") {
      module.exports = unorm;

   // AMD
   } else if (typeof define === "function" && define.amd) {
      define("unorm", function () {
         return unorm;
      });

   // Global
   } else {
      root.unorm = unorm;
   }

   /***** Export as shim for String::normalize method *****/
   /*
      http://wiki.ecmascript.org/doku.php?id=harmony:specification_drafts#november_8_2013_draft_rev_21

      21.1.3.12 String.prototype.normalize(form="NFC")
      When the normalize method is called with one argument form, the following steps are taken:

      1. Let O be CheckObjectCoercible(this value).
      2. Let S be ToString(O).
      3. ReturnIfAbrupt(S).
      4. If form is not provided or undefined let form be "NFC".
      5. Let f be ToString(form).
      6. ReturnIfAbrupt(f).
      7. If f is not one of "NFC", "NFD", "NFKC", or "NFKD", then throw a RangeError Exception.
      8. Let ns be the String value is the result of normalizing S into the normalization form named by f as specified in Unicode Standard Annex #15, UnicodeNormalizatoin Forms.
      9. Return ns.

      The length property of the normalize method is 0.

      *NOTE* The normalize function is intentionally generic; it does not require that its this value be a String object. Therefore it can be transferred to other kinds of objects for use as a method.
   */
   if (!String.prototype.normalize) {
      String.prototype.normalize = function(form) {
         var str = "" + this;
         form =  form === undefined ? "NFC" : form;

         if (form === "NFC") {
            return unorm.nfc(str);
         } else if (form === "NFD") {
            return unorm.nfd(str);
         } else if (form === "NFKC") {
            return unorm.nfkc(str);
         } else if (form === "NFKD") {
            return unorm.nfkd(str);
         } else {
            throw new RangeError("Invalid normalization form: " + form);
         }
      };
   }
}(this));

},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL2xpYi9hcHBsZXQuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL2RlcGxveUphdmEuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL2h0dHAuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL2luZGV4LmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL2xpYi9pbnN0YWxsZXJzLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL2xpYi9wbHVnaW4uanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL3Nlc3Npb24uanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL3RyYW5zbGF0b3IuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL3RyYW5zcG9ydC9hcHBsZXQuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbGliL3RyYW5zcG9ydC9odHRwLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL2xpYi90cmFuc3BvcnQvcGx1Z2luLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9ib3dzZXIvYm93c2VyLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyLXJlcXVlc3QvaW5kZXguanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Fzc2VydC9hc3NlcnQuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9iYXNlNjQtanMvbGliL2I2NC5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnVmZmVyL25vZGVfbW9kdWxlcy9pZWVlNzU0L2luZGV4LmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jb25zb2xlLWJyb3dzZXJpZnkvaW5kZXguanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NyeXB0by1icm93c2VyaWZ5L2hlbHBlcnMuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NyeXB0by1icm93c2VyaWZ5L2luZGV4LmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jcnlwdG8tYnJvd3NlcmlmeS9tZDUuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2NyeXB0by1icm93c2VyaWZ5L3JuZy5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvY3J5cHRvLWJyb3dzZXJpZnkvc2hhLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9jcnlwdG8tYnJvd3NlcmlmeS9zaGEyNTYuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL2V4dGVuZC9pbmRleC5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvcGxhdGZvcm0vcGxhdGZvcm0uanMiLCIvaG9tZS9kZWFuL29zYy13b3Jrc3BhY2VzL3dzLWJ3YWxsZXQtd2ViL2J3YWxsZXQuanMvbm9kZV9tb2R1bGVzL3Byb21pc2UvY29yZS5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvcHJvbWlzZS9pbmRleC5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvcHJvbWlzZS9ub2RlX21vZHVsZXMvYXNhcC9hc2FwLmpzIiwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy90cmF2ZXJzZS9pbmRleC5qcyIsIi9ob21lL2RlYW4vb3NjLXdvcmtzcGFjZXMvd3MtYndhbGxldC13ZWIvYndhbGxldC5qcy9ub2RlX21vZHVsZXMvdW5vcm0vbGliL3Vub3JtLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3eUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2piQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzllQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4V0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2puQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25IQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMVRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNvbnNvbGUgPSByZXF1aXJlKCdjb25zb2xlJyksXG4gICAgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJyksXG4gICAgUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UnKSxcbiAgICBib3dzZXIgPSByZXF1aXJlKCdib3dzZXInKSxcbiAgICBkZXBsb3lKYXZhID0gcmVxdWlyZSgnLi9kZXBsb3lKYXZhJyksXG4gICAgcGxhdGZvcm0gPSByZXF1aXJlKCdwbGF0Zm9ybScpO1xuXG4vLyBUcnkgdG8gbG9hZCBhIGFwcGxldCB3aXRoIGdpdmVuIG9wdGlvbnMsIHJldHVybnMgcHJvbWlzZS4gSW4gY2FzZSBvZlxuLy8gcmVqZWN0aW9uLCBlcnIgY29udGFpbnMgYGluc3RhbGxlZGAgcHJvcGVydHkuXG5tb2R1bGUuZXhwb3J0cy5sb2FkID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICB2YXIgbyA9IGV4dGVuZChvcHRpb25zLCB7XG4gICAgICAgIC8vIG5hbWUgb2YgdGhlIGNhbGxiYWNrIGluIHRoZSBnbG9iYWwgbmFtZXNwYWNlXG4gICAgICAgIGZuYW1lOiAnX19id2FsbGV0QXBwbGV0TG9hZGVkJyxcbiAgICAgICAgLy8gaWQgb2YgdGhlIGFwcGxldCBlbGVtZW50XG4gICAgICAgIGlkOiAnX19id2FsbGV0LWFwcGxldCcsXG4gICAgICAgIC8vIHRpbWUgdG8gd2FpdCB1bnRpbCB0aW1lb3V0LCBpbiBtc2VjXG4gICAgICAgIHRpbWVvdXQ6IDUwMFxuICAgIH0pO1xuXG4gICAgLy8gaWYgd2Uga25vdyBmb3Igc3VyZSB0aGF0IHRoZSBhcHBsZXQgaXMgaW5zdGFsbGVkLCB0aW1lb3V0IGFmdGVyXG4gICAgLy8gMTAgc2Vjb25kc1xuICAgIHZhciBpbnN0YWxsZWQgPSBpc0luc3RhbGxlZCgpLFxuICAgICAgICB0aW1lb3V0ID0gaW5zdGFsbGVkID8gMzAwMDAgOiBvLnRpbWVvdXQ7XG5cbiAgICAvLyBpZiB0aGUgYXBwbGV0IGlzIGFscmVhZHkgbG9hZGVkLCB1c2UgaXRcbiAgICB2YXIgYXBwbGV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoby5pZCk7XG4gICAgaWYgKGFwcGxldClcbiAgICAgICAgcmV0dXJuIFByb21pc2UuZnJvbShhcHBsZXQpO1xuXG4gICAgLy8gaW5qZWN0IG9yIHJlamVjdCBhZnRlciB0aW1lb3V0XG4gICAgcmV0dXJuIFByb21pc2UucmFjZShbXG4gICAgICAgIGluamVjdEFwcGxldChvLmlkLCBvLmZuYW1lKSxcbiAgICAgICAgcmVqZWN0QWZ0ZXIodGltZW91dCwgbmV3IEVycm9yKCdMb2FkaW5nIHRpbWVkIG91dCcpKVxuICAgIF0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgZXJyLmluc3RhbGxlZCA9IGluc3RhbGxlZDtcbiAgICAgICAgaWYgKCFpbnN0YWxsZWQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbYndhbGxldF0gRGV0ZWN0ZWQgZW52aXJvbm1lbnQgOiAnICsgcGxhdGZvcm0uZGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgZXJyLmphdmFMaW5rID0gJ2h0dHA6Ly9qYXZhLmNvbS9lbi9kb3dubG9hZC9pbmRleC5qc3AnO1xuICAgICAgICAgICAgaWYgKHBsYXRmb3JtLm9zLmZhbWlseSAhPSBudWxsICYmIHBsYXRmb3JtLm9zLmZhbWlseS5pbmRleE9mKCdXaW4nKSA+PSAwKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBsYXRmb3JtLm9zLmFyY2hpdGVjdHVyZSA9PSA2NCAmJiBwbGF0Zm9ybS5kZXNjcmlwdGlvbi5pbmRleE9mKCczMi1iaXQnKSA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyLmphdmFMaW5rID0gJ2h0dHA6Ly9qYXZhZGwuc3VuLmNvbS93ZWJhcHBzL2Rvd25sb2FkL0F1dG9ETD9CdW5kbGVJZD0xMDYyNDgnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyci5qYXZhTGluayA9ICdodHRwOi8vamF2YWRsLnN1bi5jb20vd2ViYXBwcy9kb3dubG9hZC9BdXRvREw/QnVuZGxlSWQ9MTA2MjQ2JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGVyci5lbnYgPSB7fTtcbiAgICAgICAgaWYgKGJvd3Nlci5icm93c2VyLm1zaWUgJiYgYm93c2VyLmJyb3dzZXIudmVyc2lvbiA+PSAxMClcbiAgICAgICAgICAgIGVyci5lbnYuaWUxMCA9IHRydWU7XG4gICAgICAgIGVsc2UgXG4gICAgICAgICAgICBlcnIuZW52LmllMTAgPSBmYWxzZTtcbiAgICAgICAgLy8gVE9ETyBhIGJ1ZyBoZXJlIG9uIE1hYyBPUyBYLCBwbGF0Zm9ybS5vcy5hcmNoaXRlY3R1cmUgcmV0dXJuIGEgaW52YWlsZCB2YWx1ZSAzMlxuICAgICAgICBpZiAocGxhdGZvcm0ub3MuYXJjaGl0ZWN0dXJlID09IDY0KSB7XG4gICAgICAgIFx0ZXJyLmVudi5vczY0ID0gdHJ1ZTtcbiAgICAgICAgXHRpZiAocGxhdGZvcm0uZGVzY3JpcHRpb24uaW5kZXhPZignMzItYml0JykgPCAwKSBcbiAgICAgICAgXHRcdGVyci5lbnYuYnJvd3NlcjY0ID0gdHJ1ZTtcbiAgICAgICAgXHRlbHNlXG4gICAgICAgIFx0ICAgIGVyci5lbnYuYnJvd3NlcjY0ID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIFx0ZXJyLmVudi5vczY0ID0gZmFsc2U7XG4gICAgICAgIFx0ZXJyLmVudi5icm93c2VyNjQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBlcnIuZW52LmJyb3dzZXIgPSBwbGF0Zm9ybS5uYW1lO1xuICAgICAgICBlcnIuZW52Lm9zID0gcGxhdGZvcm0ub3MuZmFtaWx5O1xuICAgICAgICBcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgIH0pLnRoZW4oXG4gICAgICAgIGZ1bmN0aW9uIChhcHBsZXQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbYndhbGxldF0gTG9hZGVkIGFwcGxldCAnICsgYXBwbGV0LnZlcnNpb24pO1xuICAgICAgICAgICAgcmV0dXJuIGFwcGxldDtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignW2J3YWxsZXRdIEZhaWxlZCB0byBsb2FkIGFwcGxldDogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBJbmplY3RzIHRoZSBhcHBsZXQgb2JqZWN0IGludG8gdGhlIHBhZ2UgYW5kIHdhaXRzIHVudGlsIGl0IGxvYWRzLlxuZnVuY3Rpb24gaW5qZWN0QXBwbGV0KGlkLCBmbmFtZSkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciBib2R5ID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2JvZHknKVswXSxcbiAgICAgICAgICAgIGVsZW0gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcblxuICAgICAgICAvLyByZWdpc3RlciBsb2FkIGZ1bmN0aW9uXG4gICAgICAgIHdpbmRvd1tmbmFtZV0gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgYXBwbGV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgICAgICAgICAgaWYgKGFwcGxldClcbiAgICAgICAgICAgICAgICByZXNvbHZlKGFwcGxldCk7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcignQXBwbGV0IG5vdCBmb3VuZCcpKTtcbiAgICAgICAgfVxuICAgICAgICA7XG4gICAgICAgIC8vIGluamVjdCBvYmplY3QgZWxlbVxuICAgICAgICBib2R5LmFwcGVuZENoaWxkKGVsZW0pO1xuICAgICAgICB2YXIgaHRtbCA9IFwiXCI7XG4gICAgICAgIGlmIChib3dzZXIuYnJvd3Nlci5tc2llICYmIGJvd3Nlci5icm93c2VyLnZlcnNpb24gPj0gMTEpIHtcbiAgICAgICAgICAgIGh0bWwgPSBcbiAgICAgICAgICAgICc8ZW1iZWQgaWQ9XCInK2lkKydcIiAnK1xuICAgICAgICAgICAgICAgICdhcmNoaXZlPVwiYndhbGxldC1hcHBsZXQtMC4wLjUuamFyXCIgJytcbiAgICAgICAgICAgICAgICAnY29kZT1cImNvbS9iZHgvYndhbGxldC9hcHBsZXQvQldhbGxldEFwcGxldC5jbGFzc1wiICcrXG4gICAgICAgICAgICAgICAgJ2NvZGViYXNlPVwiZGF0YS9qYXJzXCIgJytcbiAgICAgICAgICAgICAgICAnd2lkdGg9XCIxXCIgaGVpZ2h0PVwiMVwiICcrXG4gICAgICAgICAgICAgICAgJ3R5cGU9XCJhcHBsaWNhdGlvbi94LWphdmEtYXBwbGV0O3ZlcnNpb249MS42XCIgJytcbiAgICAgICAgICAgICAgICAnb25sb2FkPVwiJytmbmFtZSsnXCIgJytcbiAgICAgICAgICAgICAgICAncGx1Z2luc3BhZ2U9XCJodHRwOi8vamF2YS5zdW4uY29tL2oyc2UvMS42LjAvZG93bmxvYWQuaHRtbFwiICcrXG4gICAgICAgICAgICAgICAgJ2phdmFfYXJndW1lbnRzPVwiLURqbmxwLnBhY2tFbmFibGVkPXRydWVcIiA+JytcbiAgICAgICAgICAgICc8L2VtYmVkPic7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodG1sID0gXG4gICAgICAgICAgICAnPG9iamVjdCBpZD1cIicraWQrJ1wiIGNsYXNzaWQ9XCJqYXZhOmNvbS9iZHgvYndhbGxldC9hcHBsZXQvQldhbGxldEFwcGxldC5jbGFzc1wiJytcbiAgICAgICAgICAgICAgICAgICAgJ3R5cGU9XCJhcHBsaWNhdGlvbi94LWphdmEtYXBwbGV0XCInK1xuICAgICAgICAgICAgICAgICAgICAnaGVpZ2h0PVwiMVwiIHdpZHRoPVwiMVwiID4nK1xuICAgICAgICAgICAgICAgICc8cGFyYW0gbmFtZT1cImNvZGVcIiB2YWx1ZT1cImNvbS5iZHguYndhbGxldC5hcHBsZXQuQldhbGxldEFwcGxldFwiIC8+JytcbiAgICAgICAgICAgICAgICAnPHBhcmFtIG5hbWU9XCJhcmNoaXZlXCIgdmFsdWU9XCJid2FsbGV0LWFwcGxldC0wLjAuNS5qYXJcIiAvPicrXG4gICAgICAgICAgICAgICAgJzxwYXJhbSBuYW1lPVwiY29kZWJhc2VcIiB2YWx1ZT1cImRhdGEvamFyc1wiIC8+JytcbiAgICAgICAgICAgICAgICAnPHBhcmFtIG5hbWU9XCJwZXJzaXN0U3RhdGVcIiB2YWx1ZT1cImZhbHNlXCIgLz4nK1xuICAgICAgICAgICAgICAgICc8cGFyYW0gbmFtZT1cIm9ubG9hZFwiIHZhbHVlPVwiJytmbmFtZSsnXCIgLz4nK1xuICAgICAgICAgICAgICAgICc8cGFyYW0gbmFtZT1cImphdmFfYXJndW1lbnRzXCIgdmFsdWU9XCItRGpubHAucGFja0VuYWJsZWQ9dHJ1ZVwiIC8+JytcbiAgICAgICAgICAgICc8L29iamVjdD4nO1xuICAgICAgICB9XG4gICAgICAgIGVsZW0uaW5uZXJIVE1MID0gaHRtbDtcbiAgICB9KTtcbn1cblxuLy8gSWYgZ2l2ZW4gdGltZW91dCwgZ2V0cyByZWplY3RlZCBhZnRlciBuIG1zZWMsIG90aGVyd2lzZSBuZXZlciByZXNvbHZlcy5cbmZ1bmN0aW9uIHJlamVjdEFmdGVyKG1zZWMsIHZhbCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGlmIChtc2VjID4gMClcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkgeyByZWplY3QodmFsKTsgfSwgbXNlYyk7XG4gICAgfSk7XG59XG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBhcHBsZXQgd2l0aCBhIGdpdmVuIG1pbWV0eXBlIGlzIGluc3RhbGxlZC5cbmZ1bmN0aW9uIGlzSW5zdGFsbGVkKCkge1xuICAgIHJldHVybiBkZXBsb3lKYXZhLnZlcnNpb25DaGVjayhcIjEuNitcIik7XG59XG4iLCJ2YXIgZGVwbG95SmF2YSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIGwgPSB7XHJcbiAgICAgICAgY29yZTogW1wiaWRcIiwgXCJjbGFzc1wiLCBcInRpdGxlXCIsIFwic3R5bGVcIl0sXHJcbiAgICAgICAgaTE4bjogW1wibGFuZ1wiLCBcImRpclwiXSxcclxuICAgICAgICBldmVudHM6IFtcIm9uY2xpY2tcIiwgXCJvbmRibGNsaWNrXCIsIFwib25tb3VzZWRvd25cIiwgXCJvbm1vdXNldXBcIiwgXCJvbm1vdXNlb3ZlclwiLCBcIm9ubW91c2Vtb3ZlXCIsIFwib25tb3VzZW91dFwiLCBcIm9ua2V5cHJlc3NcIiwgXCJvbmtleWRvd25cIiwgXCJvbmtleXVwXCJdLFxyXG4gICAgICAgIGFwcGxldDogW1wiY29kZWJhc2VcIiwgXCJjb2RlXCIsIFwibmFtZVwiLCBcImFyY2hpdmVcIiwgXCJvYmplY3RcIiwgXCJ3aWR0aFwiLCBcImhlaWdodFwiLCBcImFsdFwiLCBcImFsaWduXCIsIFwiaHNwYWNlXCIsIFwidnNwYWNlXCJdLFxyXG4gICAgICAgIG9iamVjdDogW1wiY2xhc3NpZFwiLCBcImNvZGViYXNlXCIsIFwiY29kZXR5cGVcIiwgXCJkYXRhXCIsIFwidHlwZVwiLCBcImFyY2hpdmVcIiwgXCJkZWNsYXJlXCIsIFwic3RhbmRieVwiLCBcImhlaWdodFwiLCBcIndpZHRoXCIsIFwidXNlbWFwXCIsIFwibmFtZVwiLCBcInRhYmluZGV4XCIsIFwiYWxpZ25cIiwgXCJib3JkZXJcIiwgXCJoc3BhY2VcIiwgXCJ2c3BhY2VcIl1cclxuICAgIH07XHJcbiAgICB2YXIgYiA9IGwub2JqZWN0LmNvbmNhdChsLmNvcmUsIGwuaTE4biwgbC5ldmVudHMpO1xyXG4gICAgdmFyIG0gPSBsLmFwcGxldC5jb25jYXQobC5jb3JlKTtcclxuXHJcbiAgICBmdW5jdGlvbiBnKG8pIHtcclxuICAgICAgICBpZiAoIWQuZGVidWcpIHtcclxuICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjb25zb2xlLmxvZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhvKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFsZXJ0KG8pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGsocCwgbykge1xyXG4gICAgICAgIGlmIChwID09IG51bGwgfHwgcC5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgciA9IHAuY2hhckF0KHAubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgaWYgKHIgIT0gXCIrXCIgJiYgciAhPSBcIipcIiAmJiAocC5pbmRleE9mKFwiX1wiKSAhPSAtMSAmJiByICE9IFwiX1wiKSkge1xyXG4gICAgICAgICAgICBwID0gcCArIFwiKlwiO1xyXG4gICAgICAgICAgICByID0gXCIqXCJcclxuICAgICAgICB9XHJcbiAgICAgICAgcCA9IHAuc3Vic3RyaW5nKDAsIHAubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgaWYgKHAubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgcSA9IHAuY2hhckF0KHAubGVuZ3RoIC0gMSk7XHJcbiAgICAgICAgICAgIGlmIChxID09IFwiLlwiIHx8IHEgPT0gXCJfXCIpIHtcclxuICAgICAgICAgICAgICAgIHAgPSBwLnN1YnN0cmluZygwLCBwLmxlbmd0aCAtIDEpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHIgPT0gXCIqXCIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIChvLmluZGV4T2YocCkgPT0gMClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAociA9PSBcIitcIikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHAgPD0gb1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGUoKSB7XHJcbiAgICAgICAgdmFyIG8gPSBcIi8vamF2YS5jb20vanMvd2Vic3RhcnQucG5nXCI7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgcmV0dXJuIGRvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sLmluZGV4T2YoXCJodHRwXCIpICE9IC0xID8gbyA6IFwiaHR0cDpcIiArIG9cclxuICAgICAgICB9IGNhdGNoIChwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBcImh0dHA6XCIgKyBvXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG4ocCkge1xyXG4gICAgICAgIHZhciBvID0gXCJodHRwOi8vamF2YS5jb20vZHQtcmVkaXJlY3RcIjtcclxuICAgICAgICBpZiAocCA9PSBudWxsIHx8IHAubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIG9cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHAuY2hhckF0KDApID09IFwiJlwiKSB7XHJcbiAgICAgICAgICAgIHAgPSBwLnN1YnN0cmluZygxLCBwLmxlbmd0aClcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG8gKyBcIj9cIiArIHBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBqKHEsIHApIHtcclxuICAgICAgICB2YXIgbyA9IHEubGVuZ3RoO1xyXG4gICAgICAgIGZvciAodmFyIHIgPSAwOyByIDwgbzsgcisrKSB7XHJcbiAgICAgICAgICAgIGlmIChxW3JdID09PSBwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGMobykge1xyXG4gICAgICAgIHJldHVybiBqKG0sIG8udG9Mb3dlckNhc2UoKSlcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpKG8pIHtcclxuICAgICAgICByZXR1cm4gaihiLCBvLnRvTG93ZXJDYXNlKCkpXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYShvKSB7XHJcbiAgICAgICAgaWYgKFwiTVNJRVwiICE9IGRlcGxveUphdmEuYnJvd3Nlck5hbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGRlcGxveUphdmEuY29tcGFyZVZlcnNpb25Ub1BhdHRlcm4oZGVwbG95SmF2YS5nZXRQbHVnaW4oKS52ZXJzaW9uLCBbXCIxMFwiLCBcIjBcIiwgXCIwXCJdLCBmYWxzZSwgdHJ1ZSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG8gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuICFrKFwiMS42LjBfMzMrXCIsIG8pXHJcbiAgICB9XHJcbiAgICB2YXIgZCA9IHtcclxuICAgICAgICBkZWJ1ZzogbnVsbCxcclxuICAgICAgICB2ZXJzaW9uOiBcIjIwMTIwODAxXCIsXHJcbiAgICAgICAgZmlyZWZveEphdmFWZXJzaW9uOiBudWxsLFxyXG4gICAgICAgIG15SW50ZXJ2YWw6IG51bGwsXHJcbiAgICAgICAgcHJlSW5zdGFsbEpSRUxpc3Q6IG51bGwsXHJcbiAgICAgICAgcmV0dXJuUGFnZTogbnVsbCxcclxuICAgICAgICBicmFuZDogbnVsbCxcclxuICAgICAgICBsb2NhbGU6IG51bGwsXHJcbiAgICAgICAgaW5zdGFsbFR5cGU6IG51bGwsXHJcbiAgICAgICAgRUFJbnN0YWxsRW5hYmxlZDogZmFsc2UsXHJcbiAgICAgICAgRWFybHlBY2Nlc3NVUkw6IG51bGwsXHJcbiAgICAgICAgb2xkTWltZVR5cGU6IFwiYXBwbGljYXRpb24vbnBydW50aW1lLXNjcmlwdGFibGUtcGx1Z2luO0RlcGxveW1lbnRUb29sa2l0XCIsXHJcbiAgICAgICAgbWltZVR5cGU6IFwiYXBwbGljYXRpb24vamF2YS1kZXBsb3ltZW50LXRvb2xraXRcIixcclxuICAgICAgICBsYXVuY2hCdXR0b25QTkc6IGUoKSxcclxuICAgICAgICBicm93c2VyTmFtZTogbnVsbCxcclxuICAgICAgICBicm93c2VyTmFtZTI6IG51bGwsXHJcbiAgICAgICAgZ2V0SlJFczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciB0ID0gbmV3IEFycmF5KCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzUGx1Z2luSW5zdGFsbGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHZhciByID0gdGhpcy5nZXRQbHVnaW4oKTtcclxuICAgICAgICAgICAgICAgIHZhciBvID0gci5qdm1zO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcSA9IDA7IHEgPCBvLmdldExlbmd0aCgpOyBxKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB0W3FdID0gby5nZXQocSkudmVyc2lvblxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIHAgPSB0aGlzLmdldEJyb3dzZXIoKTtcclxuICAgICAgICAgICAgICAgIGlmIChwID09IFwiTVNJRVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVzdFVzaW5nQWN0aXZlWChcIjEuNy4wXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRbMF0gPSBcIjEuNy4wXCJcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50ZXN0VXNpbmdBY3RpdmVYKFwiMS42LjBcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRbMF0gPSBcIjEuNi4wXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlc3RVc2luZ0FjdGl2ZVgoXCIxLjUuMFwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRbMF0gPSBcIjEuNS4wXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVzdFVzaW5nQWN0aXZlWChcIjEuNC4yXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRbMF0gPSBcIjEuNC4yXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50ZXN0Rm9yTVNWTSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0WzBdID0gXCIxLjFcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocCA9PSBcIk5ldHNjYXBlIEZhbWlseVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZ2V0SlBJVmVyc2lvblVzaW5nTWltZVR5cGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuZmlyZWZveEphdmFWZXJzaW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRbMF0gPSB0aGlzLmZpcmVmb3hKYXZhVmVyc2lvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVzdFVzaW5nTWltZVR5cGVzKFwiMS43XCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdFswXSA9IFwiMS43LjBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50ZXN0VXNpbmdNaW1lVHlwZXMoXCIxLjZcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdFswXSA9IFwiMS42LjBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlc3RVc2luZ01pbWVUeXBlcyhcIjEuNVwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdFswXSA9IFwiMS41LjBcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVzdFVzaW5nTWltZVR5cGVzKFwiMS40LjJcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0WzBdID0gXCIxLjQuMlwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmJyb3dzZXJOYW1lMiA9PSBcIlNhZmFyaVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlc3RVc2luZ1BsdWdpbnNBcnJheShcIjEuNy4wXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0WzBdID0gXCIxLjcuMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy50ZXN0VXNpbmdQbHVnaW5zQXJyYXkoXCIxLjZcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0WzBdID0gXCIxLjYuMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnRlc3RVc2luZ1BsdWdpbnNBcnJheShcIjEuNVwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0WzBdID0gXCIxLjUuMFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudGVzdFVzaW5nUGx1Z2luc0FycmF5KFwiMS40LjJcIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRbMF0gPSBcIjEuNC4yXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5kZWJ1Zykge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcSA9IDA7IHEgPCB0Lmxlbmd0aDsgKytxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZyhcIltnZXRKUkVzKCldIFdlIGNsYWltIHRvIGhhdmUgZGV0ZWN0ZWQgSmF2YSBTRSBcIiArIHRbcV0pXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRcclxuICAgICAgICB9LFxyXG4gICAgICAgIGluc3RhbGxKUkU6IGZ1bmN0aW9uKHIsIHApIHtcclxuICAgICAgICAgICAgdmFyIG8gPSBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNQbHVnaW5JbnN0YWxsZWQoKSAmJiB0aGlzLmlzQXV0b0luc3RhbGxFbmFibGVkKHIpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNDYWxsYmFja1N1cHBvcnRlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcSA9IHRoaXMuZ2V0UGx1Z2luKCkuaW5zdGFsbEpSRShyLCBwKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBxID0gdGhpcy5nZXRQbHVnaW4oKS5pbnN0YWxsSlJFKHIpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVmcmVzaCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnJldHVyblBhZ2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IHRoaXMucmV0dXJuUGFnZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBxXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YWxsTGF0ZXN0SlJFKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNBdXRvSW5zdGFsbEVuYWJsZWQ6IGZ1bmN0aW9uKG8pIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmlzUGx1Z2luSW5zdGFsbGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbyA9PSBcInVuZGVmaW5lZFwiKSB7XHJcbiAgICAgICAgICAgICAgICBvID0gbnVsbFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBhKG8pXHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc0NhbGxiYWNrU3VwcG9ydGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXNQbHVnaW5JbnN0YWxsZWQoKSAmJiB0aGlzLmNvbXBhcmVWZXJzaW9uVG9QYXR0ZXJuKHRoaXMuZ2V0UGx1Z2luKCkudmVyc2lvbiwgW1wiMTBcIiwgXCIyXCIsIFwiMFwiXSwgZmFsc2UsIHRydWUpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBpbnN0YWxsTGF0ZXN0SlJFOiBmdW5jdGlvbihxKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzUGx1Z2luSW5zdGFsbGVkKCkgJiYgdGhpcy5pc0F1dG9JbnN0YWxsRW5hYmxlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgciA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNDYWxsYmFja1N1cHBvcnRlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgciA9IHRoaXMuZ2V0UGx1Z2luKCkuaW5zdGFsbExhdGVzdEpSRShxKVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByID0gdGhpcy5nZXRQbHVnaW4oKS5pbnN0YWxsTGF0ZXN0SlJFKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucmV0dXJuUGFnZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmxvY2F0aW9uID0gdGhpcy5yZXR1cm5QYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBwID0gdGhpcy5nZXRCcm93c2VyKCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgbyA9IG5hdmlnYXRvci5wbGF0Zm9ybS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCh0aGlzLkVBSW5zdGFsbEVuYWJsZWQgPT0gXCJ0cnVlXCIpICYmIChvLmluZGV4T2YoXCJ3aW5cIikgIT0gLTEpICYmICh0aGlzLkVhcmx5QWNjZXNzVVJMICE9IG51bGwpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmVJbnN0YWxsSlJFTGlzdCA9IHRoaXMuZ2V0SlJFcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnJldHVyblBhZ2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm15SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChcImRlcGxveUphdmEucG9sbCgpXCIsIDMwMDApXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhyZWYgPSB0aGlzLkVhcmx5QWNjZXNzVVJMO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocCA9PSBcIk1TSUVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5JRUluc3RhbGwoKVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICgocCA9PSBcIk5ldHNjYXBlIEZhbWlseVwiKSAmJiAoby5pbmRleE9mKFwid2luMzJcIikgIT0gLTEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5GRkluc3RhbGwoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYXRpb24uaHJlZiA9IG4oKCh0aGlzLnJldHVyblBhZ2UgIT0gbnVsbCkgPyAoXCImcmV0dXJuUGFnZT1cIiArIHRoaXMucmV0dXJuUGFnZSkgOiBcIlwiKSArICgodGhpcy5sb2NhbGUgIT0gbnVsbCkgPyAoXCImbG9jYWxlPVwiICsgdGhpcy5sb2NhbGUpIDogXCJcIikgKyAoKHRoaXMuYnJhbmQgIT0gbnVsbCkgPyAoXCImYnJhbmQ9XCIgKyB0aGlzLmJyYW5kKSA6IFwiXCIpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBydW5BcHBsZXQ6IGZ1bmN0aW9uKHAsIHUsIHIpIHtcclxuICAgICAgICAgICAgaWYgKHIgPT0gXCJ1bmRlZmluZWRcIiB8fCByID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHIgPSBcIjEuMVwiXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHQgPSBcIl4oXFxcXGQrKSg/OlxcXFwuKFxcXFxkKykoPzpcXFxcLihcXFxcZCspKD86XyhcXFxcZCspKT8pPyk/JFwiO1xyXG4gICAgICAgICAgICB2YXIgbyA9IHIubWF0Y2godCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJldHVyblBhZ2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5QYWdlID0gZG9jdW1lbnQubG9jYXRpb25cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAobyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcSA9IHRoaXMuZ2V0QnJvd3NlcigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHEgIT0gXCI/XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy52ZXJzaW9uQ2hlY2sociArIFwiK1wiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLndyaXRlQXBwbGV0VGFnKHAsIHUpXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaW5zdGFsbEpSRShyICsgXCIrXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlZnJlc2goKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhyZWYgPSBkb2N1bWVudC5sb2NhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMud3JpdGVBcHBsZXRUYWcocCwgdSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUFwcGxldFRhZyhwLCB1KVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZyhcIltydW5BcHBsZXQoKV0gSW52YWxpZCBtaW5pbXVtVmVyc2lvbiBhcmd1bWVudCB0byBydW5BcHBsZXQoKTpcIiArIHIpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHdyaXRlQXBwbGV0VGFnOiBmdW5jdGlvbihyLCB3KSB7XHJcbiAgICAgICAgICAgIHZhciBvID0gXCI8XCIgKyBcImFwcGxldCBcIjtcclxuICAgICAgICAgICAgdmFyIHEgPSBcIlwiO1xyXG4gICAgICAgICAgICB2YXIgdCA9IFwiPFwiICsgXCIvXCIgKyBcImFwcGxldFwiICsgXCI+XCI7XHJcbiAgICAgICAgICAgIHZhciB4ID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYgKG51bGwgPT0gdyB8fCB0eXBlb2YgdyAhPSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgICAgICAgICB3ID0gbmV3IE9iamVjdCgpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiByKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWMocCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB3W3BdID0gcltwXVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBvICs9IChcIiBcIiArIHAgKyAnPVwiJyArIHJbcF0gKyAnXCInKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocCA9PSBcImNvZGVcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHYgPSBmYWxzZTtcclxuICAgICAgICAgICAgZm9yICh2YXIgdSBpbiB3KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodSA9PSBcImNvZGViYXNlX2xvb2t1cFwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdiA9IHRydWVcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh1ID09IFwib2JqZWN0XCIgfHwgdSA9PSBcImphdmFfb2JqZWN0XCIgfHwgdSA9PSBcImphdmFfY29kZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgeCA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBxICs9ICc8cGFyYW0gbmFtZT1cIicgKyB1ICsgJ1wiIHZhbHVlPVwiJyArIHdbdV0gKyAnXCIvPidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXYpIHtcclxuICAgICAgICAgICAgICAgIHEgKz0gJzxwYXJhbSBuYW1lPVwiY29kZWJhc2VfbG9va3VwXCIgdmFsdWU9XCJmYWxzZVwiLz4nXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHgpIHtcclxuICAgICAgICAgICAgICAgIG8gKz0gKCcgY29kZT1cImR1bW15XCInKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG8gKz0gXCI+XCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LndyaXRlKG8gKyBcIlxcblwiICsgcSArIFwiXFxuXCIgKyB0KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdmVyc2lvbkNoZWNrOiBmdW5jdGlvbihwKSB7XHJcbiAgICAgICAgICAgIHZhciB2ID0gMDtcclxuICAgICAgICAgICAgdmFyIHggPSBcIl4oXFxcXGQrKSg/OlxcXFwuKFxcXFxkKykoPzpcXFxcLihcXFxcZCspKD86XyhcXFxcZCspKT8pPyk/KFxcXFwqfFxcXFwrKT8kXCI7XHJcbiAgICAgICAgICAgIHZhciB5ID0gcC5tYXRjaCh4KTtcclxuICAgICAgICAgICAgaWYgKHkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHIgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHZhciB1ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB2YXIgcSA9IG5ldyBBcnJheSgpO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdCA9IDE7IHQgPCB5Lmxlbmd0aDsgKyt0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0eXBlb2YgeVt0XSA9PSBcInN0cmluZ1wiKSAmJiAoeVt0XSAhPSBcIlwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBxW3ZdID0geVt0XTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdisrXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHFbcS5sZW5ndGggLSAxXSA9PSBcIitcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIHIgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBxLmxlbmd0aC0tXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChxW3EubGVuZ3RoIC0gMV0gPT0gXCIqXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcS5sZW5ndGgtLVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChxLmxlbmd0aCA8IDQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHIgPSB0cnVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgdyA9IHRoaXMuZ2V0SlJFcygpO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgdCA9IDA7IHQgPCB3Lmxlbmd0aDsgKyt0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29tcGFyZVZlcnNpb25Ub1BhdHRlcm4od1t0XSwgcSwgciwgdSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBvID0gXCJJbnZhbGlkIHZlcnNpb25QYXR0ZXJuIHBhc3NlZCB0byB2ZXJzaW9uQ2hlY2s6IFwiICsgcDtcclxuICAgICAgICAgICAgICAgIGcoXCJbdmVyc2lvbkNoZWNrKCldIFwiICsgbyk7XHJcbiAgICAgICAgICAgICAgICBhbGVydChvKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc1dlYlN0YXJ0SW5zdGFsbGVkOiBmdW5jdGlvbihyKSB7XHJcbiAgICAgICAgICAgIHZhciBxID0gdGhpcy5nZXRCcm93c2VyKCk7XHJcbiAgICAgICAgICAgIGlmIChxID09IFwiP1wiKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyID09IFwidW5kZWZpbmVkXCIgfHwgciA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICByID0gXCIxLjQuMlwiXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHAgPSBmYWxzZTtcclxuICAgICAgICAgICAgdmFyIHQgPSBcIl4oXFxcXGQrKSg/OlxcXFwuKFxcXFxkKykoPzpcXFxcLihcXFxcZCspKD86XyhcXFxcZCspKT8pPyk/JFwiO1xyXG4gICAgICAgICAgICB2YXIgbyA9IHIubWF0Y2godCk7XHJcbiAgICAgICAgICAgIGlmIChvICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHAgPSB0aGlzLnZlcnNpb25DaGVjayhyICsgXCIrXCIpXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBnKFwiW2lzV2ViU3RhcnRJbnN0YWxsZXIoKV0gSW52YWxpZCBtaW5pbXVtVmVyc2lvbiBhcmd1bWVudCB0byBpc1dlYlN0YXJ0SW5zdGFsbGVkKCk6IFwiICsgcik7XHJcbiAgICAgICAgICAgICAgICBwID0gdGhpcy52ZXJzaW9uQ2hlY2soXCIxLjQuMitcIilcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0SlBJVmVyc2lvblVzaW5nTWltZVR5cGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBwID0gMDsgcCA8IG5hdmlnYXRvci5taW1lVHlwZXMubGVuZ3RoOyArK3ApIHtcclxuICAgICAgICAgICAgICAgIHZhciBxID0gbmF2aWdhdG9yLm1pbWVUeXBlc1twXS50eXBlO1xyXG4gICAgICAgICAgICAgICAgdmFyIG8gPSBxLm1hdGNoKC9eYXBwbGljYXRpb25cXC94LWphdmEtYXBwbGV0O2pwaS12ZXJzaW9uPSguKikkLyk7XHJcbiAgICAgICAgICAgICAgICBpZiAobyAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlZm94SmF2YVZlcnNpb24gPSBvWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChcIk9wZXJhXCIgIT0gdGhpcy5icm93c2VyTmFtZTIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGxhdW5jaFdlYlN0YXJ0QXBwbGljYXRpb246IGZ1bmN0aW9uKHIpIHtcclxuICAgICAgICAgICAgdmFyIG8gPSBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0SlBJVmVyc2lvblVzaW5nTWltZVR5cGUoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNXZWJTdGFydEluc3RhbGxlZChcIjEuNy4wXCIpID09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoKHRoaXMuaW5zdGFsbEpSRShcIjEuNy4wK1wiKSA9PSBmYWxzZSkgfHwgKCh0aGlzLmlzV2ViU3RhcnRJbnN0YWxsZWQoXCIxLjcuMFwiKSA9PSBmYWxzZSkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHUgPSBudWxsO1xyXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRVUkkpIHtcclxuICAgICAgICAgICAgICAgIHUgPSBkb2N1bWVudC5kb2N1bWVudFVSSVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh1ID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHUgPSBkb2N1bWVudC5VUkxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgcCA9IHRoaXMuZ2V0QnJvd3NlcigpO1xyXG4gICAgICAgICAgICB2YXIgcTtcclxuICAgICAgICAgICAgaWYgKHAgPT0gXCJNU0lFXCIpIHtcclxuICAgICAgICAgICAgICAgIHEgPSBcIjxcIiArICdvYmplY3QgY2xhc3NpZD1cImNsc2lkOjhBRDlDODQwLTA0NEUtMTFEMS1CM0U5LTAwODA1RjQ5OUQ5M1wiICcgKyAnd2lkdGg9XCIwXCIgaGVpZ2h0PVwiMFwiPicgKyBcIjxcIiArICdQQVJBTSBuYW1lPVwibGF1bmNoam5scFwiIHZhbHVlPVwiJyArIHIgKyAnXCInICsgXCI+XCIgKyBcIjxcIiArICdQQVJBTSBuYW1lPVwiZG9jYmFzZVwiIHZhbHVlPVwiJyArIHUgKyAnXCInICsgXCI+XCIgKyBcIjxcIiArIFwiL1wiICsgXCJvYmplY3RcIiArIFwiPlwiXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocCA9PSBcIk5ldHNjYXBlIEZhbWlseVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcSA9IFwiPFwiICsgJ2VtYmVkIHR5cGU9XCJhcHBsaWNhdGlvbi94LWphdmEtYXBwbGV0O2pwaS12ZXJzaW9uPScgKyB0aGlzLmZpcmVmb3hKYXZhVmVyc2lvbiArICdcIiAnICsgJ3dpZHRoPVwiMFwiIGhlaWdodD1cIjBcIiAnICsgJ2xhdW5jaGpubHA9XCInICsgciArICdcIicgKyAnZG9jYmFzZT1cIicgKyB1ICsgJ1wiJyArIFwiIC8+XCJcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuYm9keSA9PSBcInVuZGVmaW5lZFwiIHx8IGRvY3VtZW50LmJvZHkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQud3JpdGUocSk7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IHVcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgICAgICAgICAgICAgIHQuaWQgPSBcImRpdjFcIjtcclxuICAgICAgICAgICAgICAgIHQuc3R5bGUucG9zaXRpb24gPSBcInJlbGF0aXZlXCI7XHJcbiAgICAgICAgICAgICAgICB0LnN0eWxlLmxlZnQgPSBcIi0xMDAwMHB4XCI7XHJcbiAgICAgICAgICAgICAgICB0LnN0eWxlLm1hcmdpbiA9IFwiMHB4IGF1dG9cIjtcclxuICAgICAgICAgICAgICAgIHQuY2xhc3NOYW1lID0gXCJkeW5hbWljRGl2XCI7XHJcbiAgICAgICAgICAgICAgICB0LmlubmVySFRNTCA9IHE7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHQpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVdlYlN0YXJ0TGF1bmNoQnV0dG9uRXg6IGZ1bmN0aW9uKHEsIHApIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmV0dXJuUGFnZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJldHVyblBhZ2UgPSBxXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIG8gPSBcImphdmFzY3JpcHQ6ZGVwbG95SmF2YS5sYXVuY2hXZWJTdGFydEFwcGxpY2F0aW9uKCdcIiArIHEgKyBcIicpO1wiO1xyXG4gICAgICAgICAgICBkb2N1bWVudC53cml0ZShcIjxcIiArICdhIGhyZWY9XCInICsgbyArIFwiXFxcIiBvbk1vdXNlT3Zlcj1cXFwid2luZG93LnN0YXR1cz0nJzsgXCIgKyAncmV0dXJuIHRydWU7XCI+PCcgKyBcImltZyBcIiArICdzcmM9XCInICsgdGhpcy5sYXVuY2hCdXR0b25QTkcgKyAnXCIgJyArICdib3JkZXI9XCIwXCIgLz48JyArIFwiL1wiICsgXCJhXCIgKyBcIj5cIilcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNyZWF0ZVdlYlN0YXJ0TGF1bmNoQnV0dG9uOiBmdW5jdGlvbihxLCBwKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJldHVyblBhZ2UgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXR1cm5QYWdlID0gcVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBvID0gXCJqYXZhc2NyaXB0OlwiICsgXCJpZiAoIWRlcGxveUphdmEuaXNXZWJTdGFydEluc3RhbGxlZCgmcXVvdDtcIiArIHAgKyBcIiZxdW90OykpIHtcIiArIFwiaWYgKGRlcGxveUphdmEuaW5zdGFsbExhdGVzdEpSRSgpKSB7XCIgKyBcImlmIChkZXBsb3lKYXZhLmxhdW5jaCgmcXVvdDtcIiArIHEgKyBcIiZxdW90OykpIHt9XCIgKyBcIn1cIiArIFwifSBlbHNlIHtcIiArIFwiaWYgKGRlcGxveUphdmEubGF1bmNoKCZxdW90O1wiICsgcSArIFwiJnF1b3Q7KSkge31cIiArIFwifVwiO1xyXG4gICAgICAgICAgICBkb2N1bWVudC53cml0ZShcIjxcIiArICdhIGhyZWY9XCInICsgbyArIFwiXFxcIiBvbk1vdXNlT3Zlcj1cXFwid2luZG93LnN0YXR1cz0nJzsgXCIgKyAncmV0dXJuIHRydWU7XCI+PCcgKyBcImltZyBcIiArICdzcmM9XCInICsgdGhpcy5sYXVuY2hCdXR0b25QTkcgKyAnXCIgJyArICdib3JkZXI9XCIwXCIgLz48JyArIFwiL1wiICsgXCJhXCIgKyBcIj5cIilcclxuICAgICAgICB9LFxyXG4gICAgICAgIGxhdW5jaDogZnVuY3Rpb24obykge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5sb2NhdGlvbiA9IG87XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBpc1BsdWdpbkluc3RhbGxlZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5nZXRQbHVnaW4oKTtcclxuICAgICAgICAgICAgaWYgKG8gJiYgby5qdm1zKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGlzQXV0b1VwZGF0ZUVuYWJsZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pc1BsdWdpbkluc3RhbGxlZCgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5nZXRQbHVnaW4oKS5pc0F1dG9VcGRhdGVFbmFibGVkKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldEF1dG9VcGRhdGVFbmFibGVkOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNQbHVnaW5JbnN0YWxsZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGx1Z2luKCkuc2V0QXV0b1VwZGF0ZUVuYWJsZWQoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0SW5zdGFsbGVyVHlwZTogZnVuY3Rpb24obykge1xyXG4gICAgICAgICAgICB0aGlzLmluc3RhbGxUeXBlID0gbztcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNQbHVnaW5JbnN0YWxsZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGx1Z2luKCkuc2V0SW5zdGFsbGVyVHlwZShvKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0QWRkaXRpb25hbFBhY2thZ2VzOiBmdW5jdGlvbihvKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzUGx1Z2luSW5zdGFsbGVkKCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmdldFBsdWdpbigpLnNldEFkZGl0aW9uYWxQYWNrYWdlcyhvKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2V0RWFybHlBY2Nlc3M6IGZ1bmN0aW9uKG8pIHtcclxuICAgICAgICAgICAgdGhpcy5FQUluc3RhbGxFbmFibGVkID0gb1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNQbHVnaW4yOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNQbHVnaW5JbnN0YWxsZWQoKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudmVyc2lvbkNoZWNrKFwiMS42LjBfMTArXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZ2V0UGx1Z2luKCkuaXNQbHVnaW4yKClcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChvKSB7fVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYWxsb3dQbHVnaW46IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmdldEJyb3dzZXIoKTtcclxuICAgICAgICAgICAgdmFyIG8gPSAoXCJTYWZhcmlcIiAhPSB0aGlzLmJyb3dzZXJOYW1lMiAmJiBcIk9wZXJhXCIgIT0gdGhpcy5icm93c2VyTmFtZTIpO1xyXG4gICAgICAgICAgICByZXR1cm4gb1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZ2V0UGx1Z2luOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgIHZhciBvID0gbnVsbDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYWxsb3dQbHVnaW4oKSkge1xyXG4gICAgICAgICAgICAgICAgbyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGVwbG95SmF2YVBsdWdpblwiKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBvXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb21wYXJlVmVyc2lvblRvUGF0dGVybjogZnVuY3Rpb24odiwgcCwgciwgdCkge1xyXG4gICAgICAgICAgICBpZiAodiA9PSB1bmRlZmluZWQgfHwgcCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciB3ID0gXCJeKFxcXFxkKykoPzpcXFxcLihcXFxcZCspKD86XFxcXC4oXFxcXGQrKSg/Ol8oXFxcXGQrKSk/KT8pPyRcIjtcclxuICAgICAgICAgICAgdmFyIHggPSB2Lm1hdGNoKHcpO1xyXG4gICAgICAgICAgICBpZiAoeCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdSA9IDA7XHJcbiAgICAgICAgICAgICAgICB2YXIgeSA9IG5ldyBBcnJheSgpO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcSA9IDE7IHEgPCB4Lmxlbmd0aDsgKytxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0eXBlb2YgeFtxXSA9PSBcInN0cmluZ1wiKSAmJiAoeFtxXSAhPSBcIlwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB5W3VdID0geFtxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdSsrXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIG8gPSBNYXRoLm1pbih5Lmxlbmd0aCwgcC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBxID0gMDsgcSA8IG87ICsrcSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoeVtxXSA8IHBbcV0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHlbcV0gPiBwW3FdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBxID0gMDsgcSA8IG87ICsrcSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoeVtxXSAhPSBwW3FdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAocikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAoeS5sZW5ndGggPT0gcC5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGdldEJyb3dzZXI6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5icm93c2VyTmFtZSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgbyA9IG5hdmlnYXRvci51c2VyQWdlbnQudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgIGcoXCJbZ2V0QnJvd3NlcigpXSBuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkgLT4gXCIgKyBvKTtcclxuICAgICAgICAgICAgICAgIGlmICgoby5pbmRleE9mKFwibXNpZVwiKSAhPSAtMSkgJiYgKG8uaW5kZXhPZihcIm9wZXJhXCIpID09IC0xKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlck5hbWUgPSBcIk1TSUVcIjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lMiA9IFwiTVNJRVwiXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvLmluZGV4T2YoXCJ0cmlkZW50XCIpICE9IC0xIHx8IG8uaW5kZXhPZihcIlRyaWRlbnRcIikgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyTmFtZSA9IFwiTVNJRVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lMiA9IFwiTVNJRVwiXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8uaW5kZXhPZihcImlwaG9uZVwiKSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyTmFtZSA9IFwiTmV0c2NhcGUgRmFtaWx5XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lMiA9IFwiaVBob25lXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoby5pbmRleE9mKFwiZmlyZWZveFwiKSAhPSAtMSkgJiYgKG8uaW5kZXhPZihcIm9wZXJhXCIpID09IC0xKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlck5hbWUgPSBcIk5ldHNjYXBlIEZhbWlseVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlck5hbWUyID0gXCJGaXJlZm94XCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8uaW5kZXhPZihcImNocm9tZVwiKSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lID0gXCJOZXRzY2FwZSBGYW1pbHlcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyTmFtZTIgPSBcIkNocm9tZVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8uaW5kZXhPZihcInNhZmFyaVwiKSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyTmFtZSA9IFwiTmV0c2NhcGUgRmFtaWx5XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lMiA9IFwiU2FmYXJpXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoby5pbmRleE9mKFwibW96aWxsYVwiKSAhPSAtMSkgJiYgKG8uaW5kZXhPZihcIm9wZXJhXCIpID09IC0xKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlck5hbWUgPSBcIk5ldHNjYXBlIEZhbWlseVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlck5hbWUyID0gXCJPdGhlclwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvLmluZGV4T2YoXCJvcGVyYVwiKSAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lID0gXCJOZXRzY2FwZSBGYW1pbHlcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5icm93c2VyTmFtZTIgPSBcIk9wZXJhXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmJyb3dzZXJOYW1lID0gXCI/XCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnJvd3Nlck5hbWUyID0gXCJ1bmtub3duXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBnKFwiW2dldEJyb3dzZXIoKV0gRGV0ZWN0ZWQgYnJvd3NlciBuYW1lOlwiICsgdGhpcy5icm93c2VyTmFtZSArIFwiLCBcIiArIHRoaXMuYnJvd3Nlck5hbWUyKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmJyb3dzZXJOYW1lXHJcbiAgICAgICAgfSxcclxuICAgICAgICB0ZXN0VXNpbmdBY3RpdmVYOiBmdW5jdGlvbihvKSB7XHJcbiAgICAgICAgICAgIHZhciBxID0gXCJKYXZhV2ViU3RhcnQuaXNJbnN0YWxsZWQuXCIgKyBvICsgXCIuMFwiO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIEFjdGl2ZVhPYmplY3QgPT0gXCJ1bmRlZmluZWRcIiB8fCAhQWN0aXZlWE9iamVjdCkge1xyXG4gICAgICAgICAgICAgICAgZyhcIlt0ZXN0VXNpbmdBY3RpdmVYKCldIEJyb3dzZXIgY2xhaW1zIHRvIGJlIElFLCBidXQgbm8gQWN0aXZlWE9iamVjdCBvYmplY3Q/XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAobmV3IEFjdGl2ZVhPYmplY3QocSkgIT0gbnVsbClcclxuICAgICAgICAgICAgfSBjYXRjaCAocCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlc3RGb3JNU1ZNOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdmFyIHAgPSBcInswOEIwRTVDMC00RkNCLTExQ0YtQUFBNS0wMDQwMUM2MDg1MDB9XCI7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb0NsaWVudENhcHMgIT0gXCJ1bmRlZmluZWRcIikge1xyXG4gICAgICAgICAgICAgICAgdmFyIG8gPSBvQ2xpZW50Q2Fwcy5nZXRDb21wb25lbnRWZXJzaW9uKHAsIFwiQ29tcG9uZW50SURcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoKG8gPT0gXCJcIikgfHwgKG8gPT0gXCI1LDAsNTAwMCwwXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdGVzdFVzaW5nTWltZVR5cGVzOiBmdW5jdGlvbihwKSB7XHJcbiAgICAgICAgICAgIGlmICghbmF2aWdhdG9yLm1pbWVUeXBlcykge1xyXG4gICAgICAgICAgICAgICAgZyhcIlt0ZXN0VXNpbmdNaW1lVHlwZXMoKV0gQnJvd3NlciBjbGFpbXMgdG8gYmUgTmV0c2NhcGUgZmFtaWx5LCBidXQgbm8gbWltZVR5cGVzW10gYXJyYXk/XCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yICh2YXIgcSA9IDA7IHEgPCBuYXZpZ2F0b3IubWltZVR5cGVzLmxlbmd0aDsgKytxKSB7XHJcbiAgICAgICAgICAgICAgICBzID0gbmF2aWdhdG9yLm1pbWVUeXBlc1txXS50eXBlO1xyXG4gICAgICAgICAgICAgICAgdmFyIG8gPSBzLm1hdGNoKC9eYXBwbGljYXRpb25cXC94LWphdmEtYXBwbGV0XFx4M0J2ZXJzaW9uPSgxXFwuOHwxXFwuN3wxXFwuNnwxXFwuNXwxXFwuNFxcLjIpJC8pO1xyXG4gICAgICAgICAgICAgICAgaWYgKG8gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbXBhcmVWZXJzaW9ucyhvWzFdLCBwKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRlc3RVc2luZ1BsdWdpbnNBcnJheTogZnVuY3Rpb24ocCkge1xyXG4gICAgICAgICAgICBpZiAoKCFuYXZpZ2F0b3IucGx1Z2lucykgfHwgKCFuYXZpZ2F0b3IucGx1Z2lucy5sZW5ndGgpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgbyA9IG5hdmlnYXRvci5wbGF0Zm9ybS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBxID0gMDsgcSA8IG5hdmlnYXRvci5wbHVnaW5zLmxlbmd0aDsgKytxKSB7XHJcbiAgICAgICAgICAgICAgICBzID0gbmF2aWdhdG9yLnBsdWdpbnNbcV0uZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgICAgICBpZiAocy5zZWFyY2goL15KYXZhIFN3aXRjaGFibGUgUGx1Zy1pbiAoQ29jb2EpLykgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb21wYXJlVmVyc2lvbnMoXCIxLjUuMFwiLCBwKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHMuc2VhcmNoKC9eSmF2YS8pICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvLmluZGV4T2YoXCJ3aW5cIikgIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbXBhcmVWZXJzaW9ucyhcIjEuNS4wXCIsIHApIHx8IHRoaXMuY29tcGFyZVZlcnNpb25zKFwiMS42LjBcIiwgcCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbXBhcmVWZXJzaW9ucyhcIjEuNS4wXCIsIHApKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgSUVJbnN0YWxsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgbG9jYXRpb24uaHJlZiA9IG4oKCh0aGlzLnJldHVyblBhZ2UgIT0gbnVsbCkgPyAoXCImcmV0dXJuUGFnZT1cIiArIHRoaXMucmV0dXJuUGFnZSkgOiBcIlwiKSArICgodGhpcy5sb2NhbGUgIT0gbnVsbCkgPyAoXCImbG9jYWxlPVwiICsgdGhpcy5sb2NhbGUpIDogXCJcIikgKyAoKHRoaXMuYnJhbmQgIT0gbnVsbCkgPyAoXCImYnJhbmQ9XCIgKyB0aGlzLmJyYW5kKSA6IFwiXCIpKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBkb25lOiBmdW5jdGlvbihwLCBvKSB7fSxcclxuICAgICAgICBGRkluc3RhbGw6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBsb2NhdGlvbi5ocmVmID0gbigoKHRoaXMucmV0dXJuUGFnZSAhPSBudWxsKSA/IChcIiZyZXR1cm5QYWdlPVwiICsgdGhpcy5yZXR1cm5QYWdlKSA6IFwiXCIpICsgKCh0aGlzLmxvY2FsZSAhPSBudWxsKSA/IChcIiZsb2NhbGU9XCIgKyB0aGlzLmxvY2FsZSkgOiBcIlwiKSArICgodGhpcy5icmFuZCAhPSBudWxsKSA/IChcIiZicmFuZD1cIiArIHRoaXMuYnJhbmQpIDogXCJcIikgKyAoKHRoaXMuaW5zdGFsbFR5cGUgIT0gbnVsbCkgPyAoXCImdHlwZT1cIiArIHRoaXMuaW5zdGFsbFR5cGUpIDogXCJcIikpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvbXBhcmVWZXJzaW9uczogZnVuY3Rpb24ociwgdCkge1xyXG4gICAgICAgICAgICB2YXIgcCA9IHIuc3BsaXQoXCIuXCIpO1xyXG4gICAgICAgICAgICB2YXIgbyA9IHQuc3BsaXQoXCIuXCIpO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBxID0gMDsgcSA8IHAubGVuZ3RoOyArK3EpIHtcclxuICAgICAgICAgICAgICAgIHBbcV0gPSBOdW1iZXIocFtxXSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKHZhciBxID0gMDsgcSA8IG8ubGVuZ3RoOyArK3EpIHtcclxuICAgICAgICAgICAgICAgIG9bcV0gPSBOdW1iZXIob1txXSlcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocC5sZW5ndGggPT0gMikge1xyXG4gICAgICAgICAgICAgICAgcFsyXSA9IDBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocFswXSA+IG9bMF0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHBbMF0gPCBvWzBdKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocFsxXSA+IG9bMV0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHBbMV0gPCBvWzFdKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocFsyXSA+IG9bMl0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHBbMl0gPCBvWzJdKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW5hYmxlQWxlcnRzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5icm93c2VyTmFtZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuZGVidWcgPSB0cnVlXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwb2xsOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5yZWZyZXNoKCk7XHJcbiAgICAgICAgICAgIHZhciBvID0gdGhpcy5nZXRKUkVzKCk7XHJcbiAgICAgICAgICAgIGlmICgodGhpcy5wcmVJbnN0YWxsSlJFTGlzdC5sZW5ndGggPT0gMCkgJiYgKG8ubGVuZ3RoICE9IDApKSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKHRoaXMubXlJbnRlcnZhbCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5yZXR1cm5QYWdlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhdGlvbi5ocmVmID0gdGhpcy5yZXR1cm5QYWdlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCh0aGlzLnByZUluc3RhbGxKUkVMaXN0Lmxlbmd0aCAhPSAwKSAmJiAoby5sZW5ndGggIT0gMCkgJiYgKHRoaXMucHJlSW5zdGFsbEpSRUxpc3RbMF0gIT0gb1swXSkpIHtcclxuICAgICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwodGhpcy5teUludGVydmFsKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJldHVyblBhZ2UgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2F0aW9uLmhyZWYgPSB0aGlzLnJldHVyblBhZ2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgd3JpdGVQbHVnaW5UYWc6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICB2YXIgbyA9IHRoaXMuZ2V0QnJvd3NlcigpO1xyXG4gICAgICAgICAgICBpZiAobyA9PSBcIk1TSUVcIikge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQud3JpdGUoXCI8XCIgKyAnb2JqZWN0IGNsYXNzaWQ9XCJjbHNpZDpDQUZFRUZBQy1ERUM3LTAwMDAtMDAwMS1BQkNERUZGRURDQkFcIiAnICsgJ2lkPVwiZGVwbG95SmF2YVBsdWdpblwiIHdpZHRoPVwiMFwiIGhlaWdodD1cIjBcIj4nICsgXCI8XCIgKyBcIi9cIiArIFwib2JqZWN0XCIgKyBcIj5cIilcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChvID09IFwiTmV0c2NhcGUgRmFtaWx5XCIgJiYgdGhpcy5hbGxvd1BsdWdpbigpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUVtYmVkVGFnKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVmcmVzaDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIG5hdmlnYXRvci5wbHVnaW5zLnJlZnJlc2goZmFsc2UpO1xyXG4gICAgICAgICAgICB2YXIgbyA9IHRoaXMuZ2V0QnJvd3NlcigpO1xyXG4gICAgICAgICAgICBpZiAobyA9PSBcIk5ldHNjYXBlIEZhbWlseVwiICYmIHRoaXMuYWxsb3dQbHVnaW4oKSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHAgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRlcGxveUphdmFQbHVnaW5cIik7XHJcbiAgICAgICAgICAgICAgICBpZiAocCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy53cml0ZUVtYmVkVGFnKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgd3JpdGVFbWJlZFRhZzogZnVuY3Rpb24oKSB7XHJcblx0XHRcdC8qXHJcbiAgICAgICAgICAgIHZhciBvID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IubWltZVR5cGVzICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIHAgPSAwOyBwIDwgbmF2aWdhdG9yLm1pbWVUeXBlcy5sZW5ndGg7IHArKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IubWltZVR5cGVzW3BdLnR5cGUgPT0gdGhpcy5taW1lVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmF2aWdhdG9yLm1pbWVUeXBlc1twXS5lbmFibGVkUGx1Z2luKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC53cml0ZShcIjxcIiArICdlbWJlZCBpZD1cImRlcGxveUphdmFQbHVnaW5cIiB0eXBlPVwiJyArIHRoaXMubWltZVR5cGUgKyAnXCIgaGlkZGVuPVwidHJ1ZVwiIC8+Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvID0gdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCFvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgcCA9IDA7IHAgPCBuYXZpZ2F0b3IubWltZVR5cGVzLmxlbmd0aDsgcCsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYXZpZ2F0b3IubWltZVR5cGVzW3BdLnR5cGUgPT0gdGhpcy5vbGRNaW1lVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hdmlnYXRvci5taW1lVHlwZXNbcF0uZW5hYmxlZFBsdWdpbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LndyaXRlKFwiPFwiICsgJ2VtYmVkIGlkPVwiZGVwbG95SmF2YVBsdWdpblwiIHR5cGU9XCInICsgdGhpcy5vbGRNaW1lVHlwZSArICdcIiBoaWRkZW49XCJ0cnVlXCIgLz4nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblx0XHRcdCovXHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIGQud3JpdGVQbHVnaW5UYWcoKTtcclxuICAgIGlmIChkLmxvY2FsZSA9PSBudWxsKSB7XHJcbiAgICAgICAgdmFyIGggPSBudWxsO1xyXG4gICAgICAgIGlmIChoID09IG51bGwpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGggPSBuYXZpZ2F0b3IudXNlckxhbmd1YWdlXHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGYpIHt9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChoID09IG51bGwpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGggPSBuYXZpZ2F0b3Iuc3lzdGVtTGFuZ3VhZ2VcclxuICAgICAgICAgICAgfSBjYXRjaCAoZikge31cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGggPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaCA9IG5hdmlnYXRvci5sYW5ndWFnZVxyXG4gICAgICAgICAgICB9IGNhdGNoIChmKSB7fVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoaCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGgucmVwbGFjZShcIi1cIiwgXCJfXCIpO1xyXG4gICAgICAgICAgICBkLmxvY2FsZSA9IGhcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZFxyXG59KCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlcGxveUphdmE7IiwidmFyIFByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlJyksXG4gICAgcmVxdWVzdCA9IHJlcXVpcmUoJ2Jyb3dzZXItcmVxdWVzdCcpO1xuXG5mdW5jdGlvbiBwcm9taXNlUmVxdWVzdChvcHRpb25zLCBwYXlsb2FkKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVxdWVzdChvcHRpb25zLCBmdW5jdGlvbiAoZXJyLCByZXNwb25zZSwgYm9keSkge1xuICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgIT09IDIwMCkge1xuICAgICAgICAgICAgICAgIGlmIChib2R5ICYmIGJvZHkuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgZXJyID0gbmV3IEVycm9yKGJvZHkuZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVyciA9IG5ldyBFcnJvcignUmVxdWVzdCBmYWlsZWQgd2l0aCBzdGF0dXMgJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKyByZXNwb25zZS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc29sdmUoYm9keSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHByb21pc2VSZXF1ZXN0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBpbnRlcmZhY2UgVHJhbnNwb3J0IHtcbi8vXG4vLyAgICAgZnVuY3Rpb24gY29uZmlndXJlKFN0cmluZyBjb25maWcpIC0+IFByb21pc2UoKVxuLy9cbi8vICAgICBmdW5jdGlvbiBlbnVtZXJhdGUoQm9vbGVhbiB3YWl0KSAtPiBQcm9taXNlKFt7XG4vLyAgICAgICAgIFN0cmluZyBwYXRoXG4vLyAgICAgICAgIFN0cmluZyB2ZW5kb3Jcbi8vICAgICAgICAgU3RyaW5nIHByb2R1Y3Rcbi8vICAgICAgICAgU3RyaW5nIHNlcmlhbE51bWJlclxuLy8gICAgICAgICBTdHJpbmcgc2Vzc2lvblxuLy8gICAgIH1dIGRldmljZXMpXG4vL1xuLy8gICAgIGZ1bmN0aW9uIGFjcXVpcmUoU3RyaW5nIHBhdGgpIC0+IFByb21pc2UoU3RyaW5nIHNlc3Npb24pXG4vL1xuLy8gICAgIGZ1bmN0aW9uIHJlbGVhc2UoU3RyaW5nIHNlc3Npb24pIC0+IFByb21pc2UoKVxuLy9cbi8vICAgICBmdW5jdGlvbiBjYWxsKFN0cmluZyBzZXNzaW9uLCBTdHJpbmcgbmFtZSwgT2JqZWN0IGRhdGEpIC0+IFByb21pc2Uoe1xuLy8gICAgICAgICBTdHJpbmcgbmFtZSxcbi8vICAgICAgICAgT2JqZWN0IGRhdGEsXG4vLyAgICAgfSlcbi8vXG4vLyB9XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEh0dHBUcmFuc3BvcnQ6IHJlcXVpcmUoJy4vdHJhbnNwb3J0L2h0dHAnKSxcbiAgICBQbHVnaW5UcmFuc3BvcnQ6IHJlcXVpcmUoJy4vdHJhbnNwb3J0L3BsdWdpbicpLFxuICAgIEFwcGxldFRyYW5zcG9ydDogcmVxdWlyZSgnLi90cmFuc3BvcnQvYXBwbGV0JyksXG4gICAgU2Vzc2lvbjogcmVxdWlyZSgnLi9zZXNzaW9uJyksXG4gICAgaW5zdGFsbGVyczogcmVxdWlyZSgnLi9pbnN0YWxsZXJzJyksXG4gICAgcGx1Z2luOiByZXF1aXJlKCcuL3BsdWdpbicpLFxuICAgIGh0dHA6IHJlcXVpcmUoJy4vaHR0cCcpXG59O1xuIiwiLy8gdmFyIEJSSURHRV9WRVJTSU9OX1VSTCA9ICcvZGF0YS9icmlkZ2UvbGF0ZXN0LnR4dCcsXG4vLyAgICAgQlJJREdFX0lOU1RBTExFUlMgPSBbe1xuLy8gICAgICAgICB1cmw6ICcvZGF0YS9icmlkZ2UvJXZlcnNpb24lL3RyZXpvci1icmlkZ2UtJXZlcnNpb24lLXdpbjY0Lm1zaScsXG4vLyAgICAgICAgIGxhYmVsOiAnV2luZG93cyA2NC1iaXQnLFxuLy8gICAgICAgICBwbGF0Zm9ybTogJ3dpbjY0J1xuLy8gICAgIH0sIHtcbi8vICAgICAgICAgdXJsOiAnL2RhdGEvYnJpZGdlLyV2ZXJzaW9uJS90cmV6b3ItYnJpZGdlLSV2ZXJzaW9uJS13aW4zMi5tc2knLFxuLy8gICAgICAgICBsYWJlbDogJ1dpbmRvd3MgMzItYml0Jyxcbi8vICAgICAgICAgcGxhdGZvcm06ICd3aW4zMidcbi8vICAgICB9LCB7XG4vLyAgICAgICAgIHVybDogJy9kYXRhL2JyaWRnZS8ldmVyc2lvbiUvdHJlem9yLWJyaWRnZS0ldmVyc2lvbiUucGtnJyxcbi8vICAgICAgICAgbGFiZWw6ICdNYWMgT1MgWCcsXG4vLyAgICAgICAgIHBsYXRmb3JtOiAnbWFjJ1xuLy8gICAgIH0sIHtcbi8vICAgICAgICAgdXJsOiAnL2RhdGEvYnJpZGdlLyV2ZXJzaW9uJS90cmV6b3ItYnJpZGdlXyV2ZXJzaW9uJV9hbWQ2NC5kZWInLFxuLy8gICAgICAgICBsYWJlbDogJ0xpbnV4IDY0LWJpdCAoZGViKScsXG4vLyAgICAgICAgIHBsYXRmb3JtOiAnZGViNjQnXG4vLyAgICAgfSwge1xuLy8gICAgICAgICB1cmw6ICcvZGF0YS9icmlkZ2UvJXZlcnNpb24lL3RyZXpvci1icmlkZ2UtJXZlcnNpb24lLTEueDg2XzY0LnJwbScsXG4vLyAgICAgICAgIGxhYmVsOiAnTGludXggNjQtYml0IChycG0pJyxcbi8vICAgICAgICAgcGxhdGZvcm06ICdycG02NCdcbi8vICAgICB9LCB7XG4vLyAgICAgICAgIHVybDogJy9kYXRhL2JyaWRnZS8ldmVyc2lvbiUvdHJlem9yLWJyaWRnZV8ldmVyc2lvbiVfaTM4Ni5kZWInLFxuLy8gICAgICAgICBsYWJlbDogJ0xpbnV4IDMyLWJpdCAoZGViKScsXG4vLyAgICAgICAgIHBsYXRmb3JtOiAnZGViMzInXG4vLyAgICAgfSwge1xuLy8gICAgICAgICB1cmw6ICcvZGF0YS9icmlkZ2UvJXZlcnNpb24lL3RyZXpvci1icmlkZ2UtJXZlcnNpb24lLTEuaTM4Ni5ycG0nLFxuLy8gICAgICAgICBsYWJlbDogJ0xpbnV4IDMyLWJpdCAocnBtKScsXG4vLyAgICAgICAgIHBsYXRmb3JtOiAncnBtMzInXG4vLyAgICAgfV07XG5cbnZhciBCUklER0VfVkVSU0lPTl9VUkwgPSAnL2RhdGEvcGx1Z2luL2xhdGVzdC50eHQnLFxuICAgIEJSSURHRV9JTlNUQUxMRVJTID0gW3tcbiAgICAgICAgdXJsOiAnL2RhdGEvcGx1Z2luLyV2ZXJzaW9uJS9CaXRjb2luVHJlem9yUGx1Z2luLSV2ZXJzaW9uJS5tc2knLFxuICAgICAgICBsYWJlbDogJ1dpbmRvd3MnLFxuICAgICAgICBwbGF0Zm9ybTogWyd3aW4zMicsICd3aW42NCddXG4gICAgfSwge1xuICAgICAgICB1cmw6ICcvZGF0YS9wbHVnaW4vJXZlcnNpb24lL3RyZXpvci1wbHVnaW4tJXZlcnNpb24lLmRtZycsXG4gICAgICAgIGxhYmVsOiAnTWFjIE9TIFgnLFxuICAgICAgICBwbGF0Zm9ybTogJ21hYydcbiAgICB9LCB7XG4gICAgICAgIHVybDogJy9kYXRhL3BsdWdpbi8ldmVyc2lvbiUvYnJvd3Nlci1wbHVnaW4tdHJlem9yXyV2ZXJzaW9uJV9hbWQ2NC5kZWInLFxuICAgICAgICBsYWJlbDogJ0xpbnV4IHg4Nl82NCAoZGViKScsXG4gICAgICAgIHBsYXRmb3JtOiAnZGViNjQnXG4gICAgfSwge1xuICAgICAgICB1cmw6ICcvZGF0YS9wbHVnaW4vJXZlcnNpb24lL2Jyb3dzZXItcGx1Z2luLXRyZXpvci0ldmVyc2lvbiUueDg2XzY0LnJwbScsXG4gICAgICAgIGxhYmVsOiAnTGludXggeDg2XzY0IChycG0pJyxcbiAgICAgICAgcGxhdGZvcm06ICdycG02NCdcbiAgICB9LCB7XG4gICAgICAgIHVybDogJy9kYXRhL3BsdWdpbi8ldmVyc2lvbiUvYnJvd3Nlci1wbHVnaW4tdHJlem9yXyV2ZXJzaW9uJV9pMzg2LmRlYicsXG4gICAgICAgIGxhYmVsOiAnTGludXggaTM4NiAoZGViKScsXG4gICAgICAgIHBsYXRmb3JtOiAnZGViMzInXG4gICAgfSwge1xuICAgICAgICB1cmw6ICcvZGF0YS9wbHVnaW4vJXZlcnNpb24lL2Jyb3dzZXItcGx1Z2luLXRyZXpvci0ldmVyc2lvbiUuaTM4Ni5ycG0nLFxuICAgICAgICBsYWJlbDogJ0xpbnV4IGkzODYgKHJwbSknLFxuICAgICAgICBwbGF0Zm9ybTogJ3JwbTMyJ1xuICAgIH1dO1xuXG4vLyBSZXR1cm5zIGEgbGlzdCBvZiBicmlkZ2UgaW5zdGFsbGVycywgd2l0aCBkb3dubG9hZCBVUkxzIGFuZCBhIG1hcmsgb25cbi8vIGJyaWRnZSBwcmVmZXJyZWQgZm9yIHRoZSB1c2VyJ3MgcGxhdGZvcm0uXG5mdW5jdGlvbiBpbnN0YWxsZXJzKG9wdGlvbnMpIHtcbiAgICB2YXIgbyA9IG9wdGlvbnMgfHwge30sXG4gICAgICAgIGJyaWRnZVVybCA9IG8uYnJpZGdlVXJsIHx8IEJSSURHRV9WRVJTSU9OX1VSTCxcbiAgICAgICAgdmVyc2lvbiA9IG8udmVyc2lvbiB8fCByZXF1ZXN0VXJpKGJyaWRnZVVybCkudHJpbSgpLFxuICAgICAgICBwbGF0Zm9ybSA9IG8ucGxhdGZvcm0gfHwgcHJlZmVycmVkUGxhdGZvcm0oKTtcblxuICAgIHJldHVybiBCUklER0VfSU5TVEFMTEVSUy5tYXAoZnVuY3Rpb24gKGJyaWRnZSkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmVyc2lvbjogdmVyc2lvbixcbiAgICAgICAgICAgIHVybDogYnJpZGdlLnVybC5yZXBsYWNlKC8ldmVyc2lvbiUvZywgdmVyc2lvbiksXG4gICAgICAgICAgICBsYWJlbDogYnJpZGdlLmxhYmVsLFxuICAgICAgICAgICAgcGxhdGZvcm06IGJyaWRnZS5wbGF0Zm9ybSxcbiAgICAgICAgICAgIHByZWZlcnJlZDogaXNQcmVmZXJyZWQoYnJpZGdlLnBsYXRmb3JtKVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gaXNQcmVmZXJyZWQoaW5zdGFsbGVyKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaW5zdGFsbGVyID09PSAnc3RyaW5nJykgeyAvLyBzaW5nbGUgcGxhdGZvcm1cbiAgICAgICAgICAgIHJldHVybiBpbnN0YWxsZXIgPT09IHBsYXRmb3JtO1xuICAgICAgICB9IGVsc2UgeyAvLyBhbnkgb2YgbXVsdGlwbGUgcGxhdGZvcm1zXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGluc3RhbGxlci5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpbnN0YWxsZXJbaV0gPT09IHBsYXRmb3JtKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHByZWZlcnJlZFBsYXRmb3JtKCkge1xuICAgIHZhciB2ZXIgPSBuYXZpZ2F0b3IudXNlckFnZW50O1xuXG4gICAgaWYgKHZlci5tYXRjaCgvV2luNjR8V09XNjQvKSkgcmV0dXJuICd3aW42NCc7XG4gICAgaWYgKHZlci5tYXRjaCgvV2luLykpIHJldHVybiAnd2luMzInO1xuICAgIGlmICh2ZXIubWF0Y2goL01hYy8pKSByZXR1cm4gJ21hYyc7XG4gICAgaWYgKHZlci5tYXRjaCgvTGludXggaVszNDU2XTg2LykpXG4gICAgICAgIHJldHVybiB2ZXIubWF0Y2goL0NlbnRPU3xGZWRvcmF8TWFuZHJpdmF8TWFnZWlhfFJlZCBIYXR8U2NpZW50aWZpY3xTVVNFLylcbiAgICAgICAgICAgID8gJ3JwbTMyJyA6ICdkZWIzMic7XG4gICAgaWYgKHZlci5tYXRjaCgvTGludXgvKSlcbiAgICAgICAgcmV0dXJuIHZlci5tYXRjaCgvQ2VudE9TfEZlZG9yYXxNYW5kcml2YXxNYWdlaWF8UmVkIEhhdHxTY2llbnRpZmljfFNVU0UvKVxuICAgICAgICAgICAgPyAncnBtNjQnIDogJ2RlYjY0Jztcbn1cblxuZnVuY3Rpb24gcmVxdWVzdFVyaSh1cmwpIHtcbiAgICB2YXIgcmVxID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG5cbiAgICByZXEub3BlbignZ2V0JywgdXJsLCBmYWxzZSk7XG4gICAgcmVxLnNlbmQoKTtcblxuICAgIGlmIChyZXEuc3RhdHVzICE9PSAyMDApXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIEdFVCAnICsgdXJsKTtcblxuICAgIHJldHVybiByZXEucmVzcG9uc2VUZXh0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc3RhbGxlcnM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjb25zb2xlID0gcmVxdWlyZSgnY29uc29sZScpLFxuICAgIGV4dGVuZCA9IHJlcXVpcmUoJ2V4dGVuZCcpLFxuICAgIFByb21pc2UgPSByZXF1aXJlKCdwcm9taXNlJyk7XG5cbi8vIFRyeSB0byBsb2FkIGEgcGx1Z2luIHdpdGggZ2l2ZW4gb3B0aW9ucywgcmV0dXJucyBwcm9taXNlLiBJbiBjYXNlIG9mXG4vLyByZWplY3Rpb24sIGVyciBjb250YWlucyBgaW5zdGFsbGVkYCBwcm9wZXJ0eS5cbm1vZHVsZS5leHBvcnRzLmxvYWQgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBvID0gZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgLy8gbWltZXR5cGUgb2YgdGhlIHBsdWdpblxuICAgICAgICBtaW1ldHlwZTogJ2FwcGxpY2F0aW9uL3gtYml0Y29pbnRyZXpvcnBsdWdpbicsXG4gICAgICAgIC8vIG5hbWUgb2YgdGhlIGNhbGxiYWNrIGluIHRoZSBnbG9iYWwgbmFtZXNwYWNlXG4gICAgICAgIGZuYW1lOiAnX190cmV6b3JQbHVnaW5Mb2FkZWQnLFxuICAgICAgICAvLyBpZCBvZiB0aGUgcGx1Z2luIGVsZW1lbnRcbiAgICAgICAgaWQ6ICdfX3RyZXpvci1wbHVnaW4nLFxuICAgICAgICAvLyB0aW1lIHRvIHdhaXQgdW50aWwgdGltZW91dCwgaW4gbXNlY1xuICAgICAgICB0aW1lb3V0OiA1MDBcbiAgICB9KTtcblxuICAgIC8vIGlmIHdlIGtub3cgZm9yIHN1cmUgdGhhdCB0aGUgcGx1Z2luIGlzIGluc3RhbGxlZCwgdGltZW91dCBhZnRlclxuICAgIC8vIDEwIHNlY29uZHNcbiAgICB2YXIgaW5zdGFsbGVkID0gaXNJbnN0YWxsZWQoby5taW1ldHlwZSksXG4gICAgICAgIHRpbWVvdXQgPSBpbnN0YWxsZWQgPyAxMDAwMCA6IG8udGltZW91dDtcblxuICAgIC8vIGlmIHRoZSBwbHVnaW4gaXMgYWxyZWFkeSBsb2FkZWQsIHVzZSBpdFxuICAgIHZhciBwbHVnaW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChvLmlkKTtcbiAgICBpZiAocGx1Z2luKVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5mcm9tKHBsdWdpbik7XG5cbiAgICAvLyBpbmplY3Qgb3IgcmVqZWN0IGFmdGVyIHRpbWVvdXRcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgICAgaW5qZWN0UGx1Z2luKG8uaWQsIG8ubWltZXR5cGUsIG8uZm5hbWUpLFxuICAgICAgICByZWplY3RBZnRlcih0aW1lb3V0LCBuZXcgRXJyb3IoJ0xvYWRpbmcgdGltZWQgb3V0JykpXG4gICAgXSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICBlcnIuaW5zdGFsbGVkID0gaW5zdGFsbGVkO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgfSkudGhlbihcbiAgICAgICAgZnVuY3Rpb24gKHBsdWdpbikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1t0cmV6b3JdIExvYWRlZCBwbHVnaW4gJyArIHBsdWdpbi52ZXJzaW9uKTtcbiAgICAgICAgICAgIHJldHVybiBwbHVnaW47XG4gICAgICAgIH0sXG4gICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1t0cmV6b3JdIEZhaWxlZCB0byBsb2FkIHBsdWdpbjogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG4vLyBJbmplY3RzIHRoZSBwbHVnaW4gb2JqZWN0IGludG8gdGhlIHBhZ2UgYW5kIHdhaXRzIHVudGlsIGl0IGxvYWRzLlxuZnVuY3Rpb24gaW5qZWN0UGx1Z2luKGlkLCBtaW1ldHlwZSwgZm5hbWUpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICB2YXIgYm9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdib2R5JylbMF0sXG4gICAgICAgICAgICBlbGVtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG5cbiAgICAgICAgLy8gcmVnaXN0ZXIgbG9hZCBmdW5jdGlvblxuICAgICAgICB3aW5kb3dbZm5hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHBsdWdpbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgICAgIGlmIChwbHVnaW4pXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwbHVnaW4pO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ1BsdWdpbiBub3QgZm91bmQnKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gaW5qZWN0IG9iamVjdCBlbGVtXG4gICAgICAgIGJvZHkuYXBwZW5kQ2hpbGQoZWxlbSk7XG4gICAgICAgIGVsZW0uaW5uZXJIVE1MID1cbiAgICAgICAgICAgICc8b2JqZWN0IHdpZHRoPVwiMVwiIGhlaWdodD1cIjFcIiBpZD1cIicraWQrJ1wiIHR5cGU9XCInK21pbWV0eXBlKydcIj4nK1xuICAgICAgICAgICAgJyA8cGFyYW0gbmFtZT1cIm9ubG9hZFwiIHZhbHVlPVwiJytmbmFtZSsnXCIgLz4nK1xuICAgICAgICAgICAgJzwvb2JqZWN0Pic7XG4gICAgfSk7XG59XG5cbi8vIElmIGdpdmVuIHRpbWVvdXQsIGdldHMgcmVqZWN0ZWQgYWZ0ZXIgbiBtc2VjLCBvdGhlcndpc2UgbmV2ZXIgcmVzb2x2ZXMuXG5mdW5jdGlvbiByZWplY3RBZnRlcihtc2VjLCB2YWwpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAobXNlYyA+IDApXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHsgcmVqZWN0KHZhbCk7IH0sIG1zZWMpO1xuICAgIH0pO1xufVxuXG4vLyBSZXR1cm5zIHRydWUgaWYgcGx1Z2luIHdpdGggYSBnaXZlbiBtaW1ldHlwZSBpcyBpbnN0YWxsZWQuXG5mdW5jdGlvbiBpc0luc3RhbGxlZChtaW1ldHlwZSkge1xuICAgIG5hdmlnYXRvci5wbHVnaW5zLnJlZnJlc2goZmFsc2UpO1xuICAgIHJldHVybiAhIW5hdmlnYXRvci5taW1lVHlwZXNbbWltZXR5cGVdO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKSxcbiAgICBleHRlbmQgPSByZXF1aXJlKCdleHRlbmQnKSxcbiAgICB1bm9ybSA9IHJlcXVpcmUoJ3Vub3JtJyksXG4gICAgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJyksXG4gICAgUHJvbWlzZSA9IHJlcXVpcmUoJ3Byb21pc2UnKSxcbiAgICB0cmFuc2xhdG9yID0gcmVxdWlyZSgnLi90cmFuc2xhdG9yJyksXG4gICAgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG4vL1xuLy8gVHJlem9yIGRldmljZSBzZXNzaW9uIGhhbmRsZS4gQWN0cyBhcyBhIGV2ZW50IGVtaXR0ZXIuXG4vL1xuLy8gRXZlbnRzOlxuLy9cbi8vICBzZW5kOiB0eXBlLCBtZXNzYWdlXG4vLyAgcmVjZWl2ZTogdHlwZSwgbWVzc2FnZVxuLy8gIGVycm9yOiBlcnJvclxuLy9cbi8vICBidXR0b246IGNvZGVcbi8vICBwaW46IHR5cGUsIGNhbGxiYWNrKGVycm9yLCBwaW4pXG4vLyAgd29yZDogY2FsbGJhY2soZXJyb3IsIHdvcmQpXG4vLyAgcGFzc3BocmFzZTogY2FsbGJhY2soZXJyb3IsIHBhc3NwaHJhc2UpXG4vL1xudmFyIFNlc3Npb24gPSBmdW5jdGlvbiAodHJhbnNwb3J0LCBzZXNzaW9uSWQpIHtcbiAgICB0aGlzLl90cmFuc3BvcnQgPSB0cmFuc3BvcnQ7XG4gICAgdGhpcy5fc2Vzc2lvbklkID0gc2Vzc2lvbklkO1xuICAgIHRoaXMuX2VtaXR0ZXIgPSB0aGlzOyAvLyBUT0RPOiBnZXQgZW1pdHRlciBhcyBhIHBhcmFtXG4gICAgdGhpcy5fbGFuZ3VhZ2UgPSAnZW5nbGlzaCc7XG59O1xuXG51dGlsLmluaGVyaXRzKFNlc3Npb24sIEV2ZW50RW1pdHRlcik7XG5cblNlc3Npb24ucHJvdG90eXBlLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ1t0cmV6b3JdIFJlbGVhc2luZyBzZXNzaW9uJyk7XG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zcG9ydC5yZWxlYXNlKHRoaXMuX3Nlc3Npb25JZCk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24gKGxhbmd1YWdlKSB7XG4gICAgcmV0dXJuIHRoaXMuX3R5cGVkQ29tbW9uQ2FsbCgnSW5pdGlhbGl6ZScsICdGZWF0dXJlcycsIGxhbmd1YWdlID8ge2xhbmd1YWdlOiBsYW5ndWFnZX0gOiB7fSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5nZXRFbnRyb3B5ID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICByZXR1cm4gdGhpcy5fdHlwZWRDb21tb25DYWxsKCdHZXRFbnRyb3B5JywgJ0VudHJvcHknLCB7XG4gICAgICAgIHNpemU6IHNpemVcbiAgICB9KTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLmdldEFkZHJlc3MgPSBmdW5jdGlvbiAoYWRkcmVzc19uLCBjb2luLCBzaG93X2Rpc3BsYXkpIHtcbiAgICByZXR1cm4gdGhpcy5fdHlwZWRDb21tb25DYWxsKCdHZXRBZGRyZXNzJywgJ0FkZHJlc3MnLCB7XG4gICAgICAgIGFkZHJlc3NfbjogYWRkcmVzc19uLFxuICAgICAgICBjb2luX25hbWU6IGNvaW4uY29pbl9uYW1lLFxuICAgICAgICBzaG93X2Rpc3BsYXk6ICEhc2hvd19kaXNwbGF5XG4gICAgfSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJlcy5tZXNzYWdlLnBhdGggPSBhZGRyZXNzX24gfHwgW107XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5nZXRBY2NvdW50TGFiZWxzID0gZnVuY3Rpb24gKGNvaW4sIGFsbCwgaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5fdHlwZWRDb21tb25DYWxsKCdHZXRBY2NvdW50TGFiZWxzJywgJ0FjY291bnRMYWJlbHMnLCB7XG4gICAgICAgIGNvaW5fbmFtZTogY29pbi5jb2luX25hbWUsXG4gICAgICAgIGFsbDogISFhbGwsXG4gICAgICAgIGluZGV4OiBpbmRleFxuICAgIH0pO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUuZ2V0UHVibGljS2V5ID0gZnVuY3Rpb24gKGFkZHJlc3Nfbikge1xuICAgIHJldHVybiB0aGlzLl90eXBlZENvbW1vbkNhbGwoJ0dldFB1YmxpY0tleScsICdQdWJsaWNLZXknLCB7XG4gICAgICAgIGFkZHJlc3NfbjogYWRkcmVzc19uXG4gICAgfSkudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJlcy5tZXNzYWdlLm5vZGUucGF0aCA9IGFkZHJlc3NfbiB8fCBbXTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9KTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLndpcGVEZXZpY2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbW1vbkNhbGwoJ1dpcGVEZXZpY2UnKTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLnJlc2V0RGV2aWNlID0gZnVuY3Rpb24gKHNldHRpbmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbW1vbkNhbGwoJ1Jlc2V0RGV2aWNlJywgc2V0dGluZ3MpO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUubG9hZERldmljZSA9IGZ1bmN0aW9uIChzZXR0aW5ncykge1xuICAgIHJldHVybiB0aGlzLl9jb21tb25DYWxsKCdMb2FkRGV2aWNlJywgc2V0dGluZ3MpO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUucmVjb3ZlckRldmljZSA9IGZ1bmN0aW9uIChzZXR0aW5ncykge1xuICAgIHJldHVybiB0aGlzLl9jb21tb25DYWxsKCdSZWNvdmVyeURldmljZScsIHNldHRpbmdzKTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLmFwcGx5U2V0dGluZ3MgPSBmdW5jdGlvbiAoc2V0dGluZ3MpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tbW9uQ2FsbCgnQXBwbHlTZXR0aW5ncycsIHNldHRpbmdzKTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLmNoYW5nZVBpbiA9IGZ1bmN0aW9uIChyZW1vdmUpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tbW9uQ2FsbCgnQ2hhbmdlUGluJywge1xuICAgICAgICByZW1vdmU6IHJlbW92ZSB8fCBmYWxzZVxuICAgIH0pO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUuZXJhc2VGaXJtd2FyZSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tbW9uQ2FsbCgnRmlybXdhcmVFcmFzZScpO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUudXBsb2FkRmlybXdhcmUgPSBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIHJldHVybiB0aGlzLl9jb21tb25DYWxsKCdGaXJtd2FyZVVwbG9hZCcsIHtcbiAgICAgICAgcGF5bG9hZDogcGF5bG9hZFxuICAgIH0pO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUudmVyaWZ5TWVzc2FnZSA9IGZ1bmN0aW9uIChhZGRyZXNzLCBzaWduYXR1cmUsIG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gdGhpcy5fY29tbW9uQ2FsbCgnVmVyaWZ5TWVzc2FnZScsIHtcbiAgICAgICAgYWRkcmVzczogYWRkcmVzcyxcbiAgICAgICAgc2lnbmF0dXJlOiBzaWduYXR1cmUsXG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2VcbiAgICB9KTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLnNpZ25NZXNzYWdlID0gZnVuY3Rpb24gKGFkZHJlc3NfbiwgbWVzc2FnZSwgY29pbikge1xuICAgIHJldHVybiB0aGlzLl90eXBlZENvbW1vbkNhbGwoJ1NpZ25NZXNzYWdlJywgJ01lc3NhZ2VTaWduYXR1cmUnLCB7XG4gICAgICAgIGFkZHJlc3NfbjogYWRkcmVzc19uLFxuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgICAgICBjb2luX25hbWU6IGNvaW4uY29pbl9uYW1lXG4gICAgfSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5tZWFzdXJlVHggPSBmdW5jdGlvbiAoaW5wdXRzLCBvdXRwdXRzLCBjb2luKSB7XG4gICAgcmV0dXJuIHRoaXMuX3R5cGVkQ29tbW9uQ2FsbCgnRXN0aW1hdGVUeFNpemUnLCAnVHhTaXplJywge1xuICAgICAgICBpbnB1dHNfY291bnQ6IGlucHV0cy5sZW5ndGgsXG4gICAgICAgIG91dHB1dHNfY291bnQ6IG91dHB1dHMubGVuZ3RoLFxuICAgICAgICBjb2luX25hbWU6IGNvaW4uY29pbl9uYW1lXG4gICAgfSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5zaW1wbGVTaWduVHggPSBmdW5jdGlvbiAoaW5wdXRzLCBvdXRwdXRzLCB0eHMsIGNvaW4pIHtcbiAgICByZXR1cm4gdGhpcy5fdHlwZWRDb21tb25DYWxsKCdTaW1wbGVTaWduVHgnLCAnVHhSZXF1ZXN0Jywge1xuICAgICAgICBpbnB1dHM6IGlucHV0cyxcbiAgICAgICAgb3V0cHV0czogb3V0cHV0cyxcbiAgICAgICAgY29pbl9uYW1lOiBjb2luLmNvaW5fbmFtZSxcbiAgICAgICAgdHJhbnNhY3Rpb25zOiB0eHNcbiAgICB9KTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLl9pbmRleFR4c0ZvclNpZ24gPSBmdW5jdGlvbiAoaW5wdXRzLCBvdXRwdXRzLCB0eHMpIHtcbiAgICB2YXIgaW5kZXggPSB7fTtcblxuICAgIC8vIFR4IGJlaW5nIHNpZ25lZFxuICAgIGluZGV4WycnXSA9IHtcbiAgICAgICAgaW5wdXRzOiBpbnB1dHMsXG4gICAgICAgIG91dHB1dHM6IG91dHB1dHNcbiAgICB9O1xuXG4gICAgLy8gUmVmZXJlbmNlZCB0eHNcbiAgICB0eHMuZm9yRWFjaChmdW5jdGlvbiAodHgpIHtcbiAgICAgICAgaW5kZXhbdHguaGFzaC50b0xvd2VyQ2FzZSgpXSA9IHR4O1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGluZGV4O1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUuc2lnblR4ID0gZnVuY3Rpb24gKGlucHV0cywgb3V0cHV0cywgdHhzLCBjb2luKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgICBpbmRleCA9IHRoaXMuX2luZGV4VHhzRm9yU2lnbihpbnB1dHMsIG91dHB1dHMsIHR4cyksXG4gICAgICAgIHNpZ25hdHVyZXMgPSBbXSxcbiAgICAgICAgc2VyaWFsaXplZFR4ID0gJyc7XG5cbiAgICByZXR1cm4gdGhpcy5fdHlwZWRDb21tb25DYWxsKCdTaWduVHgnLCAnVHhSZXF1ZXN0Jywge1xuICAgICAgICBpbnB1dHNfY291bnQ6IGlucHV0cy5sZW5ndGgsXG4gICAgICAgIG91dHB1dHNfY291bnQ6IG91dHB1dHMubGVuZ3RoLFxuICAgICAgICBjb2luX25hbWU6IGNvaW4uY29pbl9uYW1lXG4gICAgfSkudGhlbihwcm9jZXNzKTtcblxuICAgIGZ1bmN0aW9uIHByb2Nlc3MocmVzKSB7XG4gICAgICAgIHZhciBtID0gcmVzLm1lc3NhZ2UsXG4gICAgICAgICAgICBtcyA9IG0uc2VyaWFsaXplZCxcbiAgICAgICAgICAgIG1kID0gbS5kZXRhaWxzLFxuICAgICAgICAgICAgcmVxVHgsIHJlc1R4O1xuXG4gICAgICAgIGlmIChtcyAmJiBtcy5zZXJpYWxpemVkX3R4ICE9IG51bGwpXG4gICAgICAgICAgICBzZXJpYWxpemVkVHggKz0gbXMuc2VyaWFsaXplZF90eDtcbiAgICAgICAgaWYgKG1zICYmIG1zLnNpZ25hdHVyZV9pbmRleCAhPSBudWxsKVxuICAgICAgICAgICAgc2lnbmF0dXJlc1ttcy5zaWduYXR1cmVfaW5kZXhdID0gbXMuc2lnbmF0dXJlO1xuXG4gICAgICAgIGlmIChtLnJlcXVlc3RfdHlwZSA9PT0gJ1RYRklOSVNIRUQnKVxuICAgICAgICAgICAgcmV0dXJuIHsgLy8gc2FtZSBmb3JtYXQgYXMgU2ltcGxlU2lnblR4XG4gICAgICAgICAgICAgICAgbWVzc2FnZToge1xuICAgICAgICAgICAgICAgICAgICBzZXJpYWxpemVkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaWduYXR1cmVzOiBzaWduYXR1cmVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VyaWFsaXplZF90eDogc2VyaWFsaXplZFR4XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgIHJlc1R4ID0ge307XG4gICAgICAgIHJlcVR4ID0gaW5kZXhbKG1kLnR4X2hhc2ggfHwgJycpLnRvTG93ZXJDYXNlKCldO1xuXG4gICAgICAgIGlmICghcmVxVHgpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWQudHhfaGFzaFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gKCdSZXF1ZXN0ZWQgdW5rbm93biB0eDogJyArIG1kLnR4X2hhc2gpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAoJ1JlcXVlc3RlZCB0eCBmb3Igc2lnbmluZyBub3QgaW5kZXhlZCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgIHN3aXRjaCAobS5yZXF1ZXN0X3R5cGUpIHtcblxuICAgICAgICBjYXNlICdUWElOUFVUJzpcbiAgICAgICAgICAgIHJlc1R4LmlucHV0cyA9IFtyZXFUeC5pbnB1dHNbK21kLnJlcXVlc3RfaW5kZXhdXTtcbiAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ1RYT1VUUFVUJzpcbiAgICAgICAgICAgIGlmIChtZC50eF9oYXNoKVxuICAgICAgICAgICAgICAgIHJlc1R4LmJpbl9vdXRwdXRzID0gW3JlcVR4LmJpbl9vdXRwdXRzWyttZC5yZXF1ZXN0X2luZGV4XV07XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmVzVHgub3V0cHV0cyA9IFtyZXFUeC5vdXRwdXRzWyttZC5yZXF1ZXN0X2luZGV4XV07XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdUWE1FVEEnOlxuICAgICAgICAgICAgcmVzVHgudmVyc2lvbiA9IHJlcVR4LnZlcnNpb247XG4gICAgICAgICAgICByZXNUeC5sb2NrX3RpbWUgPSByZXFUeC5sb2NrX3RpbWU7XG4gICAgICAgICAgICByZXNUeC5pbnB1dHNfY250ID0gcmVxVHguaW5wdXRzLmxlbmd0aDtcbiAgICAgICAgICAgIGlmIChtZC50eF9oYXNoKVxuICAgICAgICAgICAgICAgIHJlc1R4Lm91dHB1dHNfY250ID0gcmVxVHguYmluX291dHB1dHMubGVuZ3RoO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlc1R4Lm91dHB1dHNfY250ID0gcmVxVHgub3V0cHV0cy5sZW5ndGg7XG4gICAgICAgICAgICBicmVhaztcblxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIHJlcXVlc3QgdHlwZTogJyArIG0ucmVxdWVzdF90eXBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzZWxmLl90eXBlZENvbW1vbkNhbGwoJ1R4QWNrJywgJ1R4UmVxdWVzdCcsIHtcbiAgICAgICAgICAgIHR4OiByZXNUeFxuICAgICAgICB9KS50aGVuKHByb2Nlc3MpO1xuICAgIH1cbn07XG5cblNlc3Npb24ucHJvdG90eXBlLl90eXBlZENvbW1vbkNhbGwgPSBmdW5jdGlvbiAodHlwZSwgcmVzVHlwZSwgbXNnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgcmV0dXJuIHRoaXMuX2NvbW1vbkNhbGwodHlwZSwgbXNnKS50aGVuKGZ1bmN0aW9uIChyZXMpIHtcbiAgICAgICAgcmV0dXJuIHNlbGYuX2Fzc2VydFR5cGUocmVzLCByZXNUeXBlKTtcbiAgICB9KTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLl9hc3NlcnRUeXBlID0gZnVuY3Rpb24gKHJlcywgcmVzVHlwZSkge1xuICAgIGlmIChyZXMudHlwZSAhPT0gcmVzVHlwZSlcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignUmVzcG9uc2Ugb2YgdW5leHBlY3RlZCB0eXBlOiAnICsgcmVzLnR5cGUpO1xuICAgIHJldHVybiByZXM7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5fY29tbW9uQ2FsbCA9IGZ1bmN0aW9uICh0eXBlLCBtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGNhbGxwciA9IHRoaXMuX2NhbGwodHlwZSwgbXNnKTtcblxuICAgIHJldHVybiBjYWxscHIudGhlbihmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgIHJldHVybiBzZWxmLl9maWx0ZXJDb21tb25UeXBlcyhyZXMpO1xuICAgIH0pO1xufTtcblxuU2Vzc2lvbi5wcm90b3R5cGUuX2ZpbHRlckNvbW1vblR5cGVzID0gZnVuY3Rpb24gKHJlcykge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIGlmIChyZXMudHlwZSA9PT0gJ0ZhaWx1cmUnKSB7XG4gICAgICAgIHJlcy5tZXNzYWdlLm1lc3NhZ2UgPSB0cmFuc2xhdG9yKHRoaXMuX2xhbmd1YWdlLCByZXMubWVzc2FnZS5tZXNzYWdlKTtcbiAgICAgICAgdGhyb3cgcmVzLm1lc3NhZ2U7XG4gICAgfVxuXG4gICAgaWYgKHJlcy50eXBlID09PSAnQnV0dG9uUmVxdWVzdCcpIHtcbiAgICAgICAgdGhpcy5fZW1pdHRlci5lbWl0KCdidXR0b24nLCByZXMubWVzc2FnZS5jb2RlKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbW1vbkNhbGwoJ0J1dHRvbkFjaycpO1xuICAgIH1cblxuICAgIGlmIChyZXMudHlwZSA9PT0gJ0VudHJvcHlSZXF1ZXN0JylcbiAgICAgICAgcmV0dXJuIHRoaXMuX2NvbW1vbkNhbGwoJ0VudHJvcHlBY2snLCB7XG4gICAgICAgICAgICBlbnRyb3B5OiBzdHJpbmdUb0hleCh0aGlzLl9nZW5lcmF0ZUVudHJvcHkoMzIpKVxuICAgICAgICB9KTtcblxuICAgIGlmIChyZXMudHlwZSA9PT0gJ1Bpbk1hdHJpeFJlcXVlc3QnKVxuICAgICAgICByZXR1cm4gdGhpcy5fcHJvbXB0UGluKHJlcy5tZXNzYWdlLnR5cGUpLnRoZW4oXG4gICAgICAgICAgICBmdW5jdGlvbiAocGluKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbW1vbkNhbGwoJ1Bpbk1hdHJpeEFjaycsIHsgcGluOiBwaW4gfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLl9jb21tb25DYWxsKCdDYW5jZWwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgIGlmIChyZXMudHlwZSA9PT0gJ1Bhc3NwaHJhc2VSZXF1ZXN0JylcbiAgICAgICAgcmV0dXJuIHRoaXMuX3Byb21wdFBhc3NwaHJhc2UoKS50aGVuKFxuICAgICAgICAgICAgZnVuY3Rpb24gKHBhc3NwaHJhc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5fY29tbW9uQ2FsbCgnUGFzc3BocmFzZUFjaycsIHsgcGFzc3BocmFzZTogcGFzc3BocmFzZSB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbW1vbkNhbGwoJ0NhbmNlbCcpLnRoZW4obnVsbCwgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgZXJyIHx8IGU7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICk7XG5cbiAgICBpZiAocmVzLnR5cGUgPT09ICdXb3JkUmVxdWVzdCcpXG4gICAgICAgIHJldHVybiB0aGlzLl9wcm9tcHRXb3JkKCkudGhlbihcbiAgICAgICAgICAgIGZ1bmN0aW9uICh3b3JkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHNlbGYuX2NvbW1vbkNhbGwoJ1dvcmRBY2snLCB7IHdvcmQ6IHdvcmQgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBzZWxmLl9jb21tb25DYWxsKCdDYW5jZWwnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgIHJldHVybiByZXM7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5fcHJvbXB0UGluID0gZnVuY3Rpb24gKHR5cGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAoIXNlbGYuX2VtaXR0ZXIuZW1pdCgncGluJywgdHlwZSwgZnVuY3Rpb24gKGVyciwgcGluKSB7XG4gICAgICAgICAgICBpZiAoZXJyIHx8IHBpbiA9PSBudWxsKVxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGluKTtcbiAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignW3RyZXpvcl0gUElOIGNhbGxiYWNrIG5vdCBjb25maWd1cmVkLCBjYW5jZWxsaW5nIHJlcXVlc3QnKTtcbiAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5fcHJvbXB0UGFzc3BocmFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBpZiAoIXNlbGYuX2VtaXR0ZXIuZW1pdCgncGFzc3BocmFzZScsIGZ1bmN0aW9uIChlcnIsIHBhc3NwaHJhc2UpIHtcbiAgICAgICAgICAgIGlmIChlcnIgfHwgcGFzc3BocmFzZSA9PSBudWxsKVxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlc29sdmUocGFzc3BocmFzZS5ub3JtYWxpemUoJ05GS0QnKSk7XG4gICAgICAgIH0pKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ1t0cmV6b3JdIFBhc3NwaHJhc2UgY2FsbGJhY2sgbm90IGNvbmZpZ3VyZWQsIGNhbmNlbGxpbmcgcmVxdWVzdCcpO1xuICAgICAgICAgICAgcmVqZWN0KCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cblNlc3Npb24ucHJvdG90eXBlLl9wcm9tcHRXb3JkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGlmICghc2VsZi5fZW1pdHRlci5lbWl0KCd3b3JkJywgZnVuY3Rpb24gKGVyciwgd29yZCkge1xuICAgICAgICAgICAgaWYgKGVyciB8fCB3b3JkID09IG51bGwpXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh3b3JkLnRvTG9jYWxlTG93ZXJDYXNlKCkpO1xuICAgICAgICB9KSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdbdHJlem9yXSBXb3JkIGNhbGxiYWNrIG5vdCBjb25maWd1cmVkLCBjYW5jZWxsaW5nIHJlcXVlc3QnKTtcbiAgICAgICAgICAgIHJlamVjdCgpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5fZ2VuZXJhdGVFbnRyb3B5ID0gZnVuY3Rpb24gKGxlbikge1xuICAgIHJldHVybiBjcnlwdG8ucmFuZG9tQnl0ZXMobGVuKS50b1N0cmluZygnYmluYXJ5Jyk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5fY2FsbCA9IGZ1bmN0aW9uICh0eXBlLCBtc2cpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXMsXG4gICAgICAgIGxvZ01lc3NhZ2U7XG5cbiAgICBtc2cgPSBtc2cgfHwge307XG4gICAgbG9nTWVzc2FnZSA9IHRoaXMuX2ZpbHRlckZvckxvZyh0eXBlLCBtc2cpO1xuXG4gICAgY29uc29sZS5sb2coJ1t0cmV6b3JdIFNlbmRpbmcnLCB0eXBlLCBsb2dNZXNzYWdlKTtcbiAgICB0aGlzLl9lbWl0dGVyLmVtaXQoJ3NlbmQnLCB0eXBlLCBtc2cpO1xuXG4gICAgcmV0dXJuIHRoaXMuX3RyYW5zcG9ydC5jYWxsKHRoaXMuX3Nlc3Npb25JZCwgdHlwZSwgbXNnKS50aGVuKFxuICAgICAgICBmdW5jdGlvbiAocmVzKSB7XG4gICAgICAgICAgICB2YXIgbG9nTWVzc2FnZSA9IHNlbGYuX2ZpbHRlckZvckxvZyhyZXMudHlwZSwgcmVzLm1lc3NhZ2UpO1xuXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW3RyZXpvcl0gUmVjZWl2ZWQnLCByZXMudHlwZSwgbG9nTWVzc2FnZSk7XG4gICAgICAgICAgICBzZWxmLl9lbWl0dGVyLmVtaXQoJ3JlY2VpdmUnLCByZXMudHlwZSwgcmVzLm1lc3NhZ2UpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSxcbiAgICAgICAgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1t0cmV6b3JkXSBSZWNlaXZlZCBlcnJvcicsIGVycik7XG4gICAgICAgICAgICBzZWxmLl9lbWl0dGVyLmVtaXQoJ2Vycm9yJywgZXJyKTtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfVxuICAgICk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5fZmlsdGVyRm9yTG9nID0gZnVuY3Rpb24gKHR5cGUsIG1zZykge1xuICAgIHZhciByZWRhY3RlZCA9IHt9LFxuICAgICAgICBibGFja2xpc3QgPSB7XG4gICAgICAgICAgICBQYXNzcGhyYXNlQWNrOiB7XG4gICAgICAgICAgICAgICAgcGFzc3BocmFzZTogJyhyZWRhY3RlZC4uLiknXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICByZXR1cm4gZXh0ZW5kKHJlZGFjdGVkLCBtc2csIGJsYWNrbGlzdFt0eXBlXSB8fCB7fSk7XG59O1xuXG5TZXNzaW9uLnByb3RvdHlwZS5zZXRMYW5ndWFnZSA9IGZ1bmN0aW9uIChsYW5ndWFnZSkge1xuICAgIHRoaXMuX2xhbmd1YWdlID0gbGFuZ3VhZ2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlc3Npb247XG5cbi8vXG4vLyBIZXggY29kZWNcbi8vXG5cbi8vIEVuY29kZSBiaW5hcnkgc3RyaW5nIHRvIGhleCBzdHJpbmdcbmZ1bmN0aW9uIHN0cmluZ1RvSGV4KGJpbikge1xuICAgIHZhciBpLCBjaHIsIGhleCA9ICcnO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGJpbi5sZW5ndGg7IGkrKykge1xuICAgICAgICBjaHIgPSAoYmluLmNoYXJDb2RlQXQoaSkgJiAweEZGKS50b1N0cmluZygxNik7XG4gICAgICAgIGhleCArPSBjaHIubGVuZ3RoIDwgMiA/ICcwJyArIGNociA6IGNocjtcbiAgICB9XG5cbiAgICByZXR1cm4gaGV4O1xufVxuXG4vLyBEZWNvZGUgaGV4IHN0cmluZyB0byBiaW5hcnkgc3RyaW5nXG5mdW5jdGlvbiBoZXhUb1N0cmluZyhoZXgpIHtcbiAgICB2YXIgaSwgYnl0ZXMgPSBbXTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBoZXgubGVuZ3RoIC0gMTsgaSArPSAyKVxuICAgICAgICBieXRlcy5wdXNoKHBhcnNlSW50KGhleC5zdWJzdHIoaSwgMiksIDE2KSk7XG5cbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGJ5dGVzKTtcbn1cbiIsIid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBtZXNzYWdlcyA9IHtcclxuXHRjaGluZXNlIDoge1xyXG5cdFx0XCJEZXZpY2Ugbm90IGluaXRpYWxpemVkIG9yIHBhc3NwaHJhc2UgcmVxdWVzdCBjYW5jZWxsZWRcIiA6IFwi6K6+5aSH5pyq5Yid5aeL5YyW5oiW5bey5Y+W5raI6L6T5YWl5a+G56CBXCIsXHJcblx0XHRcIkludmFsaWQgc2lnbmF0dXJlXCIgOiBcIuaXoOaViOeahOetvuWQjVwiLFxyXG5cdFx0XCJOb3QgZW5vdWdoIGZ1bmRzXCIgOiBcIui1hOmHkeS4jei2s1wiLFxyXG5cdFx0XCJQSU4gQ2FuY2VsbGVkXCIgOiBcIlBJTueggei+k+WFpeW3suWPlua2iFwiLFxyXG5cdFx0XCJJbnZhbGlkIFBJTlwiIDogXCJQSU7noIHplJnor69cIixcclxuXHRcdFwiUElOIHJlbW92YWwgY2FuY2VsbGVkXCIgOiBcIlBJTueggeWIoOmZpOW3suWPlua2iFwiLFxyXG5cdFx0XCJQaW5nIGNhbmNlbGxlZFwiIDogXCJQaW5n5bey5Y+W5raIXCIsXHJcblx0XHRcIlBJTiBjaGFuZ2UgY2FuY2VsbGVkXCIgOiBcIlBJTueggeS/ruaUueW3suWPlua2iFwiLFxyXG5cdFx0XCJQSU4gY2hhbmdlIGZhaWxlZFwiIDogXCJQSU7noIHkv67mlLnlpLHotKVcIixcclxuXHRcdFwiV2lwZSBjYW5jZWxsZWRcIiA6IFwi6YeN572u5bey5Y+W5raIXCIsXHJcblx0XHRcIkVudHJvcHkgY2FuY2VsbGVkXCIgOiBcIkVudHJvcHnlt7Llj5bmtohcIixcclxuXHRcdFwiRmVlIG92ZXIgdGhyZXNob2xkLiBTaWduaW5nIGNhbmNlbGxlZC5cIiA6IFwi5omL57ut6LS56LaF6L+H6ZiI5YC844CC562+5ZCN5bey5Y+W5raI44CCXCIsXHJcblx0XHRcIlNpZ25pbmcgY2FuY2VsbGVkIGJ5IHVzZXJcIiA6IFwi562+5ZCN5bey5Y+W5raIXCIsXHJcblx0XHRcIkFwcGx5IHNldHRpbmdzIGNhbmNlbGxlZFwiIDogXCLkv67mlLnmoIfnrb7kuI7or63oqIDlt7Llj5bmtohcIixcclxuXHRcdFwiU2hvdyBhZGRyZXNzIGNhbmNlbGxlZFwiIDogXCLlnLDlnYDmmL7npLrlt7Llj5bmtohcIixcclxuXHRcdFwiU2lnbiBtZXNzYWdlIGNhbmNlbGxlZFwiIDogXCLnrb7lkI3mtojmga/lt7Llj5bmtohcIixcclxuXHRcdFwiTG9hZCBjYW5jZWxsZWRcIiA6IFwi5Yqg6L295bey5Y+W5raIXCIsXHJcblx0XHRcIkNpcGhlcktleVZhbHVlIGNhbmNlbGxlZFwiIDogXCJDaXBoZXJLZXlWYWx1ZeW3suWPlua2iFwiLFxyXG5cdFx0XCJSZXNldCBjYW5jZWxsZWRcIiA6IFwi6K6+572u5bey5Y+W5raIXCIsXHJcblx0XHRcIk5vdCBpbiBib290bG9hZGVyIG1vZGVcIiA6IFwi5LiN5Zyo5Y2H57qn5qih5byPXCIsXHJcblx0XHRcIkRldmljZSBpcyBhbHJlYWR5IGluaXRpYWxpemVkLiBVc2UgV2lwZSBmaXJzdC5cIiA6IFwi6K6+5aSH5bey57uP5Yid5aeL5YyW44CC6K+35YWI6YeN572u6K6+5aSH44CCXCIsXHJcblx0XHRcIlVua25vd24gbWVzc2FnZVwiIDogXCLmtojmga/kuI3lj6/or4bliKtcIixcclxuXHRcdFwiTm90IGluIFJlY292ZXJ5IG1vZGVcIiA6IFwi5LiN5Zyo5oGi5aSN5qih5byPXCIsXHJcblx0XHRcIk5vdCBpbiBSZXNldCBtb2RlXCIgOiBcIuS4jeWcqOiuvue9ruaooeW8j1wiLFxyXG5cdFx0XCJOb3QgaW4gU2lnbmluZyBtb2RlXCIgOiBcIuS4jeWcqOetvuWQjeaooeW8j1wiLFxyXG5cdFx0XCJObyB0cmFuc2FjdGlvbiBwcm92aWRlZFwiIDogXCLmsqHmnInmj5DkvpvkuqTmmJNcIixcclxuXHRcdFwiTm8ga2V5IHByb3ZpZGVkXCIgOiBcIuayoeacieaPkOS+m+mUrlwiLFxyXG5cdFx0XCJObyB2YWx1ZSBwcm92aWRlZFwiIDogXCLmsqHmnInmj5DkvpvlgLxcIixcclxuXHRcdFwiVmFsdWUgbGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNlwiIDogXCLlgLznmoTplb/luqblv4XpobvmmK8xNueahOWAjeaVsFwiLFxyXG5cdFx0XCJObyBzZXR0aW5nIHByb3ZpZGVkXCIgOiBcIuayoeacieaPkOS+m+mFjee9rlwiLFxyXG5cdFx0XCJObyBwdWJsaWMga2V5IHByb3ZpZGVkXCIgOiBcIuayoeacieaPkOS+m+WFrOmSpVwiLFxyXG5cdFx0XCJJbnZhbGlkIHB1YmxpYyBrZXkgcHJvdmlkZWRcIiA6IFwi5o+Q5L6b55qE5YWs6ZKl5peg5pWIXCIsXHJcblx0XHRcIk5vIG1lc3NhZ2UgcHJvdmlkZWRcIiA6IFwi5rKh5pyJ5o+Q5L6b5raI5oGvXCIsXHJcblx0XHRcIk1lc3NhZ2UgbGVuZ3RoIG11c3QgYmUgYSBtdWx0aXBsZSBvZiAxNlwiIDogXCLmtojmga/plb/luqblv4XpobvmmK8xNueahOWAjeaVsFwiLFxyXG5cdFx0XCJNZXNzYWdlIHRvbyBiaWdcIiA6IFwi5raI5oGv6ZW/5bqm6L+H5aSnXCIsXHJcblx0XHRcIkludmFsaWQgd29yZCBjb3VudCAoaGFzIHRvIGJlIDEyLCAxOCBvciAyNCBiaXRzKVwiIDogXCLml6DmlYjnmoTljZXor43mlbDph4/vvIjlv4XpobvmmK8xMuOAgTE45oiWMjTkuKrvvIlcIixcclxuXHRcdFwiV3Jvbmcgd29yZCByZXR5cGVkXCIgOiBcIuWNleivjei+k+WFpemUmeivr1wiLFxyXG5cdFx0XCJXb3JkIG5vdCBmb3VuZCBpbiBhIHdvcmRsaXN0XCIgOiBcIuWNleivjeihqOS4reS4jeWtmOWcqOeahOWNleivjVwiLFxyXG5cdFx0XCJJbnZhbGlkIG1uZW1vbmljLCBhcmUgd29yZHMgaW4gY29ycmVjdCBvcmRlcj9cIiA6IFwi5peg5pWI55qE56eN5a2Q77yM5Y2V6K+N5o6S5YiX6aG65bqP5piv5ZCm5q2j56Gu77yfXCIsXHJcblx0XHRcIkludmFsaWQgc3RyZW5ndGggKGhhcyB0byBiZSAxMjgsIDE5MiBvciAyNTYgYml0cylcIiA6IFwi5peg5pWI55qE5by65bqm77yI5b+F6aG75pivMTI444CBMTky5oiWMjU25L2N77yJXCIsXHJcblx0XHRcIkZhaWxlZCB0byBzZXJpYWxpemUgaW5wdXRcIiA6IFwi57O75YiX5YyW6L6T5YWl5aSx6LSlXCIsXHJcblx0XHRcIkZhaWxlZCB0byBzZXJpYWxpemUgb3V0cHV0XCIgOiBcIuezu+WIl+WMlui+k+WHuuWksei0pVwiLFxyXG5cdFx0XCJFbmNvdW50ZXJlZCBpbnZhbGlkIHByZXZoYXNoXCIgOiBcIuaXoOaViOeahHByZXZoYXNoXCIsXHJcblx0XHRcIkZhaWxlZCB0byBjb21waWxlIGlucHV0XCIgOiBcIue8luWItui+k+WFpeWksei0pVwiLFxyXG5cdFx0XCJPbmx5IG9uZSBjaGFuZ2Ugb3V0cHV0IGFsbG93ZWRcIiA6IFwi5Y+q5YWB6K645LiA5Liq5om+6Zu26L6T5Ye6XCIsXHJcblx0XHRcIlRyYW5zYWN0aW9uIGhhcyBjaGFuZ2VkIGR1cmluZyBzaWduaW5nXCIgOiBcIuetvuWQjeacn+mXtOS6pOaYk+W3sue7j+aUueWPmOS6hlwiLFxyXG5cdFx0XCJGYWlsZWQgdG8gY29tcGlsZSBvdXRwdXRcIiA6IFwi57yW5Yi26L6T5Ye65aSx6LSlXCIsXHJcblx0XHRcIlNpZ25pbmcgZXJyb3JcIiA6IFwi562+5ZCN5Ye66ZSZ5LqGXCIsXHJcblx0XHRcIlRyYW5zYWN0aW9uIG11c3QgaGF2ZSBhdCBsZWFzdCBvbmUgb3V0cHV0XCIgOiBcIuS6pOaYk+W/hemhu+iHs+WwkeacieS4gOS4qui+k+WHulwiLFxyXG5cdFx0XCJUcmFuc2FjdGlvbiBtdXN0IGhhdmUgYXQgbGVhc3Qgb25lIGlucHV0XCIgOiBcIuS6pOaYk+W/hemhu+iHs+WwkeacieS4gOS4qui+k+WFpVwiLFxyXG5cdFx0XCJJbnZhbGlkIGNvaW4gbmFtZVwiIDogXCLml6DmlYjnmoTluIHnp41cIixcclxuXHRcdFwiRXJyb3Igc2lnbmluZyBtZXNzYWdlXCIgOiBcIuetvuWQjea2iOaBr+WHuumUmeS6hlwiXHJcblx0fVxyXG59O1xyXG5cclxudmFyIHRyYW5zbGF0b3IgPSBmdW5jdGlvbihsYW5ndWFnZSwga2V5KSB7XHJcblx0aWYgKG1lc3NhZ2VzW2xhbmd1YWdlXSAmJiBtZXNzYWdlc1tsYW5ndWFnZV1ba2V5XSkge1xyXG5cdFx0cmV0dXJuIG1lc3NhZ2VzW2xhbmd1YWdlXVtrZXldO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRyZXR1cm4ga2V5O1xyXG5cdH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gdHJhbnNsYXRvcjsiLCIndXNlIHN0cmljdCc7XG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgncHJvbWlzZScpLFxuICAgIGFwcGxldF8gPSByZXF1aXJlKCcuLi9hcHBsZXQnKSxcbiAgICB0cmF2ZXJzZSA9IHJlcXVpcmUoJ3RyYXZlcnNlJylcbi8vXG4vLyBBcHBsZXQgdHJhbnNwb3J0LlxuLy9cbnZhciBBcHBsZXRUcmFuc3BvcnQgPSBmdW5jdGlvbiAoYXBwbGV0KSB7XG4gICAgdGhpcy5fYXBwbGV0ID0gYXBwbGV0O1xufTtcblxuLy8gSW5qZWN0cyB0aGUgYXBwbGV0IG9iamVjdCBpbnRvIHRoZSBkb2N1bWVudC5cbkFwcGxldFRyYW5zcG9ydC5sb2FkQXBwbGV0ID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBhcHBsZXRfLmxvYWQoKTtcbn07XG5cbi8vIEJJUDMyIENLRCBkZXJpdmF0aW9uIG9mIHRoZSBnaXZlbiBpbmRleFxuLypcbkFwcGxldFRyYW5zcG9ydC5wcm90b3R5cGUuZGVyaXZlQ2hpbGROb2RlID0gZnVuY3Rpb24gKG5vZGUsIGluZGV4KSB7XG4gICAgdmFyIGNoaWxkID0gdGhpcy5fYXBwbGV0LmRlcml2ZUNoaWxkTm9kZShub2RlLCBpbmRleCk7XG5cbiAgICBpZiAobm9kZS5wYXRoKSB7XG4gICAgICAgIGNoaWxkLnBhdGggPSBub2RlLnBhdGguY29uY2F0KFtpbmRleF0pO1xuICAgIH1cblxuICAgIHJldHVybiBjaGlsZDtcbn07XG4qL1xuXG4vLyBDb25maWd1cmVzIHRoZSBhcHBsZXQuXG5BcHBsZXRUcmFuc3BvcnQucHJvdG90eXBlLmNvbmZpZ3VyZSA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICB2YXIgYXBwbGV0ID0gdGhpcy5fYXBwbGV0O1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFwcGxldC5jb25maWd1cmUoY29uZmlnKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gSW4gbW9zdCBicm93c2VycywgZXhjZXB0aW9ucyBmcm9tIGFwcGxldCBtZXRob2RzIGFyZSBub3QgcHJvcGVybHlcbiAgICAgICAgICAgIC8vIHByb3BhZ2F0ZWRcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgJ0FwcGxldCBjb25maWd1cmF0aW9uIGZvdW5kLCBidXQgY291bGQgbm90IGJlIHVzZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnTWFrZSBzdXJlIGl0IGhhcyBwcm9wZXIgZm9ybWF0IGFuZCBhIHZhbGlkIHNpZ25hdHVyZS4nXG4gICAgICAgICAgICApKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxuLy8gRW51bWVyYXRlcyBjb25uZWN0ZWQgZGV2aWNlcy5cbi8vIFJlcXVpcmVzIGNvbmZpZ3VyZWQgYXBwbGV0LlxuQXBwbGV0VHJhbnNwb3J0LnByb3RvdHlwZS5lbnVtZXJhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFwcGxldCA9IHRoaXMuX2FwcGxldDtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuICAgICAgICByZXNvbHZlKEpTT04ucGFyc2UoYXBwbGV0LmRldmljZXMoKSkpO1xuICAgIH0pO1xufTtcblxuLy8gT3BlbnMgYSBkZXZpY2UgYW5kIHJldHVybnMgYSBzZXNzaW9uIG9iamVjdC5cbkFwcGxldFRyYW5zcG9ydC5wcm90b3R5cGUuYWNxdWlyZSA9IGZ1bmN0aW9uIChkZXZpY2UpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgc2Vzc2lvbjogZGV2aWNlXG4gICAgfSk7XG59O1xuXG4vLyBSZWxlYXNlcyB0aGUgZGV2aWNlIGhhbmRsZS5cbkFwcGxldFRyYW5zcG9ydC5wcm90b3R5cGUucmVsZWFzZSA9IGZ1bmN0aW9uIChkZXZpY2UpIHtcbiAgICB2YXIgYXBwbGV0ID0gdGhpcy5fYXBwbGV0O1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgYXBwbGV0LmNsb3NlKEpTT04uc3RyaW5naWZ5KGRldmljZSksIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc29sdmUsXG4gICAgICAgICAgICBlcnJvcjogcmVqZWN0XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLy8gRG9lcyBhIHJlcXVlc3QtcmVzcG9uc2UgY2FsbCB0byB0aGUgZGV2aWNlLlxuQXBwbGV0VHJhbnNwb3J0LnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKGRldmljZSwgdHlwZSwgbWVzc2FnZSkge1xuICAgIHZhciBhcHBsZXQgPSB0aGlzLl9hcHBsZXQsXG4gICAgICAgIHRpbWVvdXQgPSBmYWxzZTtcblxuICAgIC8vIEJpdGNvaW5UcmV6b3JBcHBsZXQgaGFzIGEgYnVnLCBjYXVzaW5nIGRpZmZlcmVudCB0cmVhdG1lbnQgb2ZcbiAgICAvLyB1bmRlZmluZWQgZmllbGRzIGluIG1lc3NhZ2VzLiBXZSBuZWVkIHRvIGZpbmQgYWxsIHVuZGVmaW5lZCBmaWVsZHNcbiAgICAvLyBhbmQgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgbWVzc2FnZSBvYmplY3QuIGB0cmF2ZXJzZWAgd2lsbCBkZWxldGVcbiAgICAvLyBvYmplY3QgZmllbGRzIGFuZCBzcGxpY2Ugb3V0IGFycmF5IGl0ZW1zIHByb3Blcmx5LlxuICAgIHRyYXZlcnNlKG1lc3NhZ2UpLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgLy8gSlNPTi5zdHJpbmdpZnkgd2lsbCBjb250YWluICQkaGFzaEtleVxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIGFwcGxldC5jYWxsKEpTT04uc3RyaW5naWZ5KGRldmljZSksIHRpbWVvdXQsIHR5cGUsIGFuZ3VsYXIudG9Kc29uKG1lc3NhZ2UpLCB7XG4gICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAodCwgbSkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiB0LFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBKU09OLnBhcnNlKG0pXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGVycikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwbGV0VHJhbnNwb3J0O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnZXh0ZW5kJyksXG4gICAgaHR0cCA9IHJlcXVpcmUoJy4uL2h0dHAnKTtcblxuLy9cbi8vIEhUVFAgdHJhbnNwb3J0LlxuLy9cbnZhciBIdHRwVHJhbnNwb3J0ID0gZnVuY3Rpb24gKHVybCkge1xuICAgIHRoaXMuX3VybCA9IHVybDtcbn07XG5cbkh0dHBUcmFuc3BvcnQuY29ubmVjdCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICByZXR1cm4gaHR0cCh7XG4gICAgICAgIHVybDogdXJsLCBqc29uOiB0cnVlXG4gICAgfSk7XG59O1xuXG5IdHRwVHJhbnNwb3J0LnByb3RvdHlwZS5fcmVxdWVzdCA9IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgcmV0dXJuIGh0dHAoZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgdXJsOiB0aGlzLl91cmwgKyBvcHRpb25zLnVybFxuICAgIH0pKTtcbn07XG5cbkh0dHBUcmFuc3BvcnQucHJvdG90eXBlLmNvbmZpZ3VyZSA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLCB1cmw6ICcvY29uZmlndXJlJywgYm9keTogY29uZmlnLCBqc29uOiB0cnVlXG4gICAgfSk7XG59O1xuXG5IdHRwVHJhbnNwb3J0LnByb3RvdHlwZS5lbnVtZXJhdGUgPSBmdW5jdGlvbiAod2FpdCkge1xuICAgIHJldHVybiB0aGlzLl9yZXF1ZXN0KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJywgdXJsOiB3YWl0ID8gJy9saXN0ZW4nIDogJy9lbnVtZXJhdGUnLCBqc29uOiB0cnVlXG4gICAgfSk7XG59O1xuXG5IdHRwVHJhbnNwb3J0LnByb3RvdHlwZS5hY3F1aXJlID0gZnVuY3Rpb24gKGRldmljZSkge1xuICAgIHZhciBwYXRoID0gZGV2aWNlLnBhdGg7IC8vIFRPRE86IHRha2UganVzdCBwYXRoXG4gICAgcmV0dXJuIHRoaXMuX3JlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdQT1NUJywgdXJsOiAnL2FjcXVpcmUvJyArIHBhdGgsIGpzb246IHRydWVcbiAgICB9KTtcbn07XG5cbkh0dHBUcmFuc3BvcnQucHJvdG90eXBlLnJlbGVhc2UgPSBmdW5jdGlvbiAoc2Vzc2lvbklkKSB7XG4gICAgcmV0dXJuIHRoaXMuX3JlcXVlc3Qoe1xuICAgICAgICBtZXRob2Q6ICdQT1NUJywgdXJsOiAnL3JlbGVhc2UvJyArIHNlc3Npb25JZCwganNvbjogdHJ1ZVxuICAgIH0pO1xufTtcblxuSHR0cFRyYW5zcG9ydC5wcm90b3R5cGUuY2FsbCA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHR5cGUsIG1lc3NhZ2UpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVxdWVzdCh7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLCB1cmw6ICcvY2FsbC8nICsgc2Vzc2lvbklkLCBqc29uOiB7XG4gICAgICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICAgICAgbWVzc2FnZTogbWVzc2FnZVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEh0dHBUcmFuc3BvcnQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBQcm9taXNlID0gcmVxdWlyZSgncHJvbWlzZScpLFxuICAgIHBsdWdpbl8gPSByZXF1aXJlKCcuLi9wbHVnaW4nKSxcbiAgICB0cmF2ZXJzZSA9IHJlcXVpcmUoJ3RyYXZlcnNlJyk7XG5cbi8vXG4vLyBQbHVnaW4gdHJhbnNwb3J0LlxuLy9cbnZhciBQbHVnaW5UcmFuc3BvcnQgPSBmdW5jdGlvbiAocGx1Z2luKSB7XG4gICAgdGhpcy5fcGx1Z2luID0gcGx1Z2luO1xufTtcblxuLy8gSW5qZWN0cyB0aGUgcGx1Z2luIG9iamVjdCBpbnRvIHRoZSBkb2N1bWVudC5cblBsdWdpblRyYW5zcG9ydC5sb2FkUGx1Z2luID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBwbHVnaW5fLmxvYWQoKTtcbn07XG5cbi8vIEJJUDMyIENLRCBkZXJpdmF0aW9uIG9mIHRoZSBnaXZlbiBpbmRleFxuUGx1Z2luVHJhbnNwb3J0LnByb3RvdHlwZS5kZXJpdmVDaGlsZE5vZGUgPSBmdW5jdGlvbiAobm9kZSwgaW5kZXgpIHtcbiAgICB2YXIgY2hpbGQgPSB0aGlzLl9wbHVnaW4uZGVyaXZlQ2hpbGROb2RlKG5vZGUsIGluZGV4KTtcblxuICAgIGlmIChub2RlLnBhdGgpIHtcbiAgICAgICAgY2hpbGQucGF0aCA9IG5vZGUucGF0aC5jb25jYXQoW2luZGV4XSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGNoaWxkO1xufTtcblxuLy8gQ29uZmlndXJlcyB0aGUgcGx1Z2luLlxuUGx1Z2luVHJhbnNwb3J0LnByb3RvdHlwZS5jb25maWd1cmUgPSBmdW5jdGlvbiAoY29uZmlnKSB7XG4gICAgdmFyIHBsdWdpbiA9IHRoaXMuX3BsdWdpbjtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwbHVnaW4uY29uZmlndXJlKGNvbmZpZyk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEluIG1vc3QgYnJvd3NlcnMsIGV4Y2VwdGlvbnMgZnJvbSBwbHVnaW4gbWV0aG9kcyBhcmUgbm90IHByb3Blcmx5XG4gICAgICAgICAgICAvLyBwcm9wYWdhdGVkXG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFxuICAgICAgICAgICAgICAgICdQbHVnaW4gY29uZmlndXJhdGlvbiBmb3VuZCwgYnV0IGNvdWxkIG5vdCBiZSB1c2VkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ01ha2Ugc3VyZSBpdCBoYXMgcHJvcGVyIGZvcm1hdCBhbmQgYSB2YWxpZCBzaWduYXR1cmUuJ1xuICAgICAgICAgICAgKSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8vIEVudW1lcmF0ZXMgY29ubmVjdGVkIGRldmljZXMuXG4vLyBSZXF1aXJlcyBjb25maWd1cmVkIHBsdWdpbi5cblBsdWdpblRyYW5zcG9ydC5wcm90b3R5cGUuZW51bWVyYXRlID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwbHVnaW4gPSB0aGlzLl9wbHVnaW47XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUpIHtcbiAgICAgICAgcmVzb2x2ZShwbHVnaW4uZGV2aWNlcygpKTtcbiAgICB9KTtcbn07XG5cbi8vIE9wZW5zIGEgZGV2aWNlIGFuZCByZXR1cm5zIGEgc2Vzc2lvbiBvYmplY3QuXG5QbHVnaW5UcmFuc3BvcnQucHJvdG90eXBlLmFjcXVpcmUgPSBmdW5jdGlvbiAoZGV2aWNlKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgIHNlc3Npb246IGRldmljZVxuICAgIH0pO1xufTtcblxuLy8gUmVsZWFzZXMgdGhlIGRldmljZSBoYW5kbGUuXG5QbHVnaW5UcmFuc3BvcnQucHJvdG90eXBlLnJlbGVhc2UgPSBmdW5jdGlvbiAoZGV2aWNlKSB7XG4gICAgdmFyIHBsdWdpbiA9IHRoaXMuX3BsdWdpbjtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHBsdWdpbi5jbG9zZShkZXZpY2UsIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc29sdmUsXG4gICAgICAgICAgICBlcnJvcjogcmVqZWN0XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxuLy8gRG9lcyBhIHJlcXVlc3QtcmVzcG9uc2UgY2FsbCB0byB0aGUgZGV2aWNlLlxuUGx1Z2luVHJhbnNwb3J0LnByb3RvdHlwZS5jYWxsID0gZnVuY3Rpb24gKGRldmljZSwgdHlwZSwgbWVzc2FnZSkge1xuICAgIHZhciBwbHVnaW4gPSB0aGlzLl9wbHVnaW4sXG4gICAgICAgIHRpbWVvdXQgPSBmYWxzZTtcblxuICAgIC8vIEJpdGNvaW5UcmV6b3JQbHVnaW4gaGFzIGEgYnVnLCBjYXVzaW5nIGRpZmZlcmVudCB0cmVhdG1lbnQgb2ZcbiAgICAvLyB1bmRlZmluZWQgZmllbGRzIGluIG1lc3NhZ2VzLiBXZSBuZWVkIHRvIGZpbmQgYWxsIHVuZGVmaW5lZCBmaWVsZHNcbiAgICAvLyBhbmQgcmVtb3ZlIHRoZW0gZnJvbSB0aGUgbWVzc2FnZSBvYmplY3QuIGB0cmF2ZXJzZWAgd2lsbCBkZWxldGVcbiAgICAvLyBvYmplY3QgZmllbGRzIGFuZCBzcGxpY2Ugb3V0IGFycmF5IGl0ZW1zIHByb3Blcmx5LlxuICAgIHRyYXZlcnNlKG1lc3NhZ2UpLmZvckVhY2goZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICBwbHVnaW4uY2FsbChkZXZpY2UsIHRpbWVvdXQsIHR5cGUsIG1lc3NhZ2UsIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICh0LCBtKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZSh7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHQsXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IG1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZXJyKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBQbHVnaW5UcmFuc3BvcnQ7XG4iLCIvKiFcbiAgKiBCb3dzZXIgLSBhIGJyb3dzZXIgZGV0ZWN0b3JcbiAgKiBodHRwczovL2dpdGh1Yi5jb20vZGVkL2Jvd3NlclxuICAqIE1JVCBMaWNlbnNlIHwgKGMpIER1c3RpbiBEaWF6IDIwMTRcbiAgKi9cblxuIWZ1bmN0aW9uIChuYW1lLCBkZWZpbml0aW9uKSB7XG4gIGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSBtb2R1bGUuZXhwb3J0c1snYnJvd3NlciddID0gZGVmaW5pdGlvbigpXG4gIGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSBkZWZpbmUoZGVmaW5pdGlvbilcbiAgZWxzZSB0aGlzW25hbWVdID0gZGVmaW5pdGlvbigpXG59KCdib3dzZXInLCBmdW5jdGlvbiAoKSB7XG4gIC8qKlxuICAgICogU2VlIHVzZXJhZ2VudHMuanMgZm9yIGV4YW1wbGVzIG9mIG5hdmlnYXRvci51c2VyQWdlbnRcbiAgICAqL1xuXG4gIHZhciB0ID0gdHJ1ZVxuXG4gIGZ1bmN0aW9uIGRldGVjdCh1YSkge1xuXG4gICAgZnVuY3Rpb24gZ2V0Rmlyc3RNYXRjaChyZWdleCkge1xuICAgICAgdmFyIG1hdGNoID0gdWEubWF0Y2gocmVnZXgpO1xuICAgICAgcmV0dXJuIChtYXRjaCAmJiBtYXRjaC5sZW5ndGggPiAxICYmIG1hdGNoWzFdKSB8fCAnJztcbiAgICB9XG5cbiAgICB2YXIgaW9zZGV2aWNlID0gZ2V0Rmlyc3RNYXRjaCgvKGlwb2R8aXBob25lfGlwYWQpL2kpLnRvTG93ZXJDYXNlKClcbiAgICAgICwgbGlrZUFuZHJvaWQgPSAvbGlrZSBhbmRyb2lkL2kudGVzdCh1YSlcbiAgICAgICwgYW5kcm9pZCA9ICFsaWtlQW5kcm9pZCAmJiAvYW5kcm9pZC9pLnRlc3QodWEpXG4gICAgICAsIHZlcnNpb25JZGVudGlmaWVyID0gZ2V0Rmlyc3RNYXRjaCgvdmVyc2lvblxcLyhcXGQrKFxcLlxcZCspPykvaSlcbiAgICAgICwgdGFibGV0ID0gL3RhYmxldC9pLnRlc3QodWEpXG4gICAgICAsIG1vYmlsZSA9ICF0YWJsZXQgJiYgL1teLV1tb2JpL2kudGVzdCh1YSlcbiAgICAgICwgcmVzdWx0XG5cbiAgICBpZiAoL29wZXJhfG9wci9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdPcGVyYSdcbiAgICAgICwgb3BlcmE6IHRcbiAgICAgICwgdmVyc2lvbjogdmVyc2lvbklkZW50aWZpZXIgfHwgZ2V0Rmlyc3RNYXRjaCgvKD86b3BlcmF8b3ByKVtcXHNcXC9dKFxcZCsoXFwuXFxkKyk/KS9pKVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICgvd2luZG93cyBwaG9uZS9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdXaW5kb3dzIFBob25lJ1xuICAgICAgLCB3aW5kb3dzcGhvbmU6IHRcbiAgICAgICwgbXNpZTogdFxuICAgICAgLCB2ZXJzaW9uOiBnZXRGaXJzdE1hdGNoKC9pZW1vYmlsZVxcLyhcXGQrKFxcLlxcZCspPykvaSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoL21zaWV8dHJpZGVudC9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdJbnRlcm5ldCBFeHBsb3JlcidcbiAgICAgICwgbXNpZTogdFxuICAgICAgLCB2ZXJzaW9uOiBnZXRGaXJzdE1hdGNoKC8oPzptc2llIHxydjopKFxcZCsoXFwuXFxkKyk/KS9pKVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICgvY2hyb21lfGNyaW9zfGNybW8vaS50ZXN0KHVhKSkge1xuICAgICAgcmVzdWx0ID0ge1xuICAgICAgICBuYW1lOiAnQ2hyb21lJ1xuICAgICAgLCBjaHJvbWU6IHRcbiAgICAgICwgdmVyc2lvbjogZ2V0Rmlyc3RNYXRjaCgvKD86Y2hyb21lfGNyaW9zfGNybW8pXFwvKFxcZCsoXFwuXFxkKyk/KS9pKVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmIChpb3NkZXZpY2UpIHtcbiAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgbmFtZSA6IGlvc2RldmljZSA9PSAnaXBob25lJyA/ICdpUGhvbmUnIDogaW9zZGV2aWNlID09ICdpcGFkJyA/ICdpUGFkJyA6ICdpUG9kJ1xuICAgICAgfVxuICAgICAgLy8gV1RGOiB2ZXJzaW9uIGlzIG5vdCBwYXJ0IG9mIHVzZXIgYWdlbnQgaW4gd2ViIGFwcHNcbiAgICAgIGlmICh2ZXJzaW9uSWRlbnRpZmllcikge1xuICAgICAgICByZXN1bHQudmVyc2lvbiA9IHZlcnNpb25JZGVudGlmaWVyXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKC9zYWlsZmlzaC9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdTYWlsZmlzaCdcbiAgICAgICwgc2FpbGZpc2g6IHRcbiAgICAgICwgdmVyc2lvbjogZ2V0Rmlyc3RNYXRjaCgvc2FpbGZpc2hcXHM/YnJvd3NlclxcLyhcXGQrKFxcLlxcZCspPykvaSlcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAoL3NlYW1vbmtleVxcLy9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdTZWFNb25rZXknXG4gICAgICAsIHNlYW1vbmtleTogdFxuICAgICAgLCB2ZXJzaW9uOiBnZXRGaXJzdE1hdGNoKC9zZWFtb25rZXlcXC8oXFxkKyhcXC5cXGQrKT8pL2kpXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKC9maXJlZm94fGljZXdlYXNlbC9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdGaXJlZm94J1xuICAgICAgLCBmaXJlZm94OiB0XG4gICAgICAsIHZlcnNpb246IGdldEZpcnN0TWF0Y2goLyg/OmZpcmVmb3h8aWNld2Vhc2VsKVsgXFwvXShcXGQrKFxcLlxcZCspPykvaSlcbiAgICAgIH1cbiAgICAgIGlmICgvXFwoKG1vYmlsZXx0YWJsZXQpO1teXFwpXSpydjpbXFxkXFwuXStcXCkvaS50ZXN0KHVhKSkge1xuICAgICAgICByZXN1bHQuZmlyZWZveG9zID0gdFxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICgvc2lsay9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSAge1xuICAgICAgICBuYW1lOiAnQW1hem9uIFNpbGsnXG4gICAgICAsIHNpbGs6IHRcbiAgICAgICwgdmVyc2lvbiA6IGdldEZpcnN0TWF0Y2goL3NpbGtcXC8oXFxkKyhcXC5cXGQrKT8pL2kpXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKGFuZHJvaWQpIHtcbiAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgbmFtZTogJ0FuZHJvaWQnXG4gICAgICAsIHZlcnNpb246IHZlcnNpb25JZGVudGlmaWVyXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKC9waGFudG9tL2kudGVzdCh1YSkpIHtcbiAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgbmFtZTogJ1BoYW50b21KUydcbiAgICAgICwgcGhhbnRvbTogdFxuICAgICAgLCB2ZXJzaW9uOiBnZXRGaXJzdE1hdGNoKC9waGFudG9tanNcXC8oXFxkKyhcXC5cXGQrKT8pL2kpXG4gICAgICB9XG4gICAgfVxuICAgIGVsc2UgaWYgKC9ibGFja2JlcnJ5fFxcYmJiXFxkKy9pLnRlc3QodWEpIHx8IC9yaW1cXHN0YWJsZXQvaS50ZXN0KHVhKSkge1xuICAgICAgcmVzdWx0ID0ge1xuICAgICAgICBuYW1lOiAnQmxhY2tCZXJyeSdcbiAgICAgICwgYmxhY2tiZXJyeTogdFxuICAgICAgLCB2ZXJzaW9uOiB2ZXJzaW9uSWRlbnRpZmllciB8fCBnZXRGaXJzdE1hdGNoKC9ibGFja2JlcnJ5W1xcZF0rXFwvKFxcZCsoXFwuXFxkKyk/KS9pKVxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIGlmICgvKHdlYnxocHcpb3MvaS50ZXN0KHVhKSkge1xuICAgICAgcmVzdWx0ID0ge1xuICAgICAgICBuYW1lOiAnV2ViT1MnXG4gICAgICAsIHdlYm9zOiB0XG4gICAgICAsIHZlcnNpb246IHZlcnNpb25JZGVudGlmaWVyIHx8IGdldEZpcnN0TWF0Y2goL3coPzplYik/b3Nicm93c2VyXFwvKFxcZCsoXFwuXFxkKyk/KS9pKVxuICAgICAgfTtcbiAgICAgIC90b3VjaHBhZFxcLy9pLnRlc3QodWEpICYmIChyZXN1bHQudG91Y2hwYWQgPSB0KVxuICAgIH1cbiAgICBlbHNlIGlmICgvYmFkYS9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdCYWRhJ1xuICAgICAgLCBiYWRhOiB0XG4gICAgICAsIHZlcnNpb246IGdldEZpcnN0TWF0Y2goL2RvbGZpblxcLyhcXGQrKFxcLlxcZCspPykvaSlcbiAgICAgIH07XG4gICAgfVxuICAgIGVsc2UgaWYgKC90aXplbi9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdUaXplbidcbiAgICAgICwgdGl6ZW46IHRcbiAgICAgICwgdmVyc2lvbjogZ2V0Rmlyc3RNYXRjaCgvKD86dGl6ZW5cXHM/KT9icm93c2VyXFwvKFxcZCsoXFwuXFxkKyk/KS9pKSB8fCB2ZXJzaW9uSWRlbnRpZmllclxuICAgICAgfTtcbiAgICB9XG4gICAgZWxzZSBpZiAoL3NhZmFyaS9pLnRlc3QodWEpKSB7XG4gICAgICByZXN1bHQgPSB7XG4gICAgICAgIG5hbWU6ICdTYWZhcmknXG4gICAgICAsIHNhZmFyaTogdFxuICAgICAgLCB2ZXJzaW9uOiB2ZXJzaW9uSWRlbnRpZmllclxuICAgICAgfVxuICAgIH1cbiAgICBlbHNlIHJlc3VsdCA9IHt9XG5cbiAgICAvLyBzZXQgd2Via2l0IG9yIGdlY2tvIGZsYWcgZm9yIGJyb3dzZXJzIGJhc2VkIG9uIHRoZXNlIGVuZ2luZXNcbiAgICBpZiAoLyhhcHBsZSk/d2Via2l0L2kudGVzdCh1YSkpIHtcbiAgICAgIHJlc3VsdC5uYW1lID0gcmVzdWx0Lm5hbWUgfHwgXCJXZWJraXRcIlxuICAgICAgcmVzdWx0LndlYmtpdCA9IHRcbiAgICAgIGlmICghcmVzdWx0LnZlcnNpb24gJiYgdmVyc2lvbklkZW50aWZpZXIpIHtcbiAgICAgICAgcmVzdWx0LnZlcnNpb24gPSB2ZXJzaW9uSWRlbnRpZmllclxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIXJlc3VsdC5vcGVyYSAmJiAvZ2Vja29cXC8vaS50ZXN0KHVhKSkge1xuICAgICAgcmVzdWx0Lm5hbWUgPSByZXN1bHQubmFtZSB8fCBcIkdlY2tvXCJcbiAgICAgIHJlc3VsdC5nZWNrbyA9IHRcbiAgICAgIHJlc3VsdC52ZXJzaW9uID0gcmVzdWx0LnZlcnNpb24gfHwgZ2V0Rmlyc3RNYXRjaCgvZ2Vja29cXC8oXFxkKyhcXC5cXGQrKT8pL2kpXG4gICAgfVxuXG4gICAgLy8gc2V0IE9TIGZsYWdzIGZvciBwbGF0Zm9ybXMgdGhhdCBoYXZlIG11bHRpcGxlIGJyb3dzZXJzXG4gICAgaWYgKGFuZHJvaWQgfHwgcmVzdWx0LnNpbGspIHtcbiAgICAgIHJlc3VsdC5hbmRyb2lkID0gdFxuICAgIH0gZWxzZSBpZiAoaW9zZGV2aWNlKSB7XG4gICAgICByZXN1bHRbaW9zZGV2aWNlXSA9IHRcbiAgICAgIHJlc3VsdC5pb3MgPSB0XG4gICAgfVxuXG4gICAgLy8gT1MgdmVyc2lvbiBleHRyYWN0aW9uXG4gICAgdmFyIG9zVmVyc2lvbiA9ICcnO1xuICAgIGlmIChpb3NkZXZpY2UpIHtcbiAgICAgIG9zVmVyc2lvbiA9IGdldEZpcnN0TWF0Y2goL29zIChcXGQrKFtfXFxzXVxcZCspKikgbGlrZSBtYWMgb3MgeC9pKTtcbiAgICAgIG9zVmVyc2lvbiA9IG9zVmVyc2lvbi5yZXBsYWNlKC9bX1xcc10vZywgJy4nKTtcbiAgICB9IGVsc2UgaWYgKGFuZHJvaWQpIHtcbiAgICAgIG9zVmVyc2lvbiA9IGdldEZpcnN0TWF0Y2goL2FuZHJvaWRbIFxcLy1dKFxcZCsoXFwuXFxkKykqKS9pKTtcbiAgICB9IGVsc2UgaWYgKHJlc3VsdC53aW5kb3dzcGhvbmUpIHtcbiAgICAgIG9zVmVyc2lvbiA9IGdldEZpcnN0TWF0Y2goL3dpbmRvd3MgcGhvbmUgKD86b3MpP1xccz8oXFxkKyhcXC5cXGQrKSopL2kpO1xuICAgIH0gZWxzZSBpZiAocmVzdWx0LndlYm9zKSB7XG4gICAgICBvc1ZlcnNpb24gPSBnZXRGaXJzdE1hdGNoKC8oPzp3ZWJ8aHB3KW9zXFwvKFxcZCsoXFwuXFxkKykqKS9pKTtcbiAgICB9IGVsc2UgaWYgKHJlc3VsdC5ibGFja2JlcnJ5KSB7XG4gICAgICBvc1ZlcnNpb24gPSBnZXRGaXJzdE1hdGNoKC9yaW1cXHN0YWJsZXRcXHNvc1xccyhcXGQrKFxcLlxcZCspKikvaSk7XG4gICAgfSBlbHNlIGlmIChyZXN1bHQuYmFkYSkge1xuICAgICAgb3NWZXJzaW9uID0gZ2V0Rmlyc3RNYXRjaCgvYmFkYVxcLyhcXGQrKFxcLlxcZCspKikvaSk7XG4gICAgfSBlbHNlIGlmIChyZXN1bHQudGl6ZW4pIHtcbiAgICAgIG9zVmVyc2lvbiA9IGdldEZpcnN0TWF0Y2goL3RpemVuW1xcL1xcc10oXFxkKyhcXC5cXGQrKSopL2kpO1xuICAgIH1cbiAgICBpZiAob3NWZXJzaW9uKSB7XG4gICAgICByZXN1bHQub3N2ZXJzaW9uID0gb3NWZXJzaW9uO1xuICAgIH1cblxuICAgIC8vIGRldmljZSB0eXBlIGV4dHJhY3Rpb25cbiAgICB2YXIgb3NNYWpvclZlcnNpb24gPSBvc1ZlcnNpb24uc3BsaXQoJy4nKVswXTtcbiAgICBpZiAodGFibGV0IHx8IGlvc2RldmljZSA9PSAnaXBhZCcgfHwgKGFuZHJvaWQgJiYgKG9zTWFqb3JWZXJzaW9uID09IDMgfHwgKG9zTWFqb3JWZXJzaW9uID09IDQgJiYgIW1vYmlsZSkpKSB8fCByZXN1bHQuc2lsaykge1xuICAgICAgcmVzdWx0LnRhYmxldCA9IHRcbiAgICB9IGVsc2UgaWYgKG1vYmlsZSB8fCBpb3NkZXZpY2UgPT0gJ2lwaG9uZScgfHwgaW9zZGV2aWNlID09ICdpcG9kJyB8fCBhbmRyb2lkIHx8IHJlc3VsdC5ibGFja2JlcnJ5IHx8IHJlc3VsdC53ZWJvcyB8fCByZXN1bHQuYmFkYSkge1xuICAgICAgcmVzdWx0Lm1vYmlsZSA9IHRcbiAgICB9XG5cbiAgICAvLyBHcmFkZWQgQnJvd3NlciBTdXBwb3J0XG4gICAgLy8gaHR0cDovL2RldmVsb3Blci55YWhvby5jb20veXVpL2FydGljbGVzL2dic1xuICAgIGlmICgocmVzdWx0Lm1zaWUgJiYgcmVzdWx0LnZlcnNpb24gPj0gMTApIHx8XG4gICAgICAgIChyZXN1bHQuY2hyb21lICYmIHJlc3VsdC52ZXJzaW9uID49IDIwKSB8fFxuICAgICAgICAocmVzdWx0LmZpcmVmb3ggJiYgcmVzdWx0LnZlcnNpb24gPj0gMjAuMCkgfHxcbiAgICAgICAgKHJlc3VsdC5zYWZhcmkgJiYgcmVzdWx0LnZlcnNpb24gPj0gNikgfHxcbiAgICAgICAgKHJlc3VsdC5vcGVyYSAmJiByZXN1bHQudmVyc2lvbiA+PSAxMC4wKSB8fFxuICAgICAgICAocmVzdWx0LmlvcyAmJiByZXN1bHQub3N2ZXJzaW9uICYmIHJlc3VsdC5vc3ZlcnNpb24uc3BsaXQoXCIuXCIpWzBdID49IDYpIHx8XG4gICAgICAgIChyZXN1bHQuYmxhY2tiZXJyeSAmJiByZXN1bHQudmVyc2lvbiA+PSAxMC4xKVxuICAgICAgICApIHtcbiAgICAgIHJlc3VsdC5hID0gdDtcbiAgICB9XG4gICAgZWxzZSBpZiAoKHJlc3VsdC5tc2llICYmIHJlc3VsdC52ZXJzaW9uIDwgMTApIHx8XG4gICAgICAgIChyZXN1bHQuY2hyb21lICYmIHJlc3VsdC52ZXJzaW9uIDwgMjApIHx8XG4gICAgICAgIChyZXN1bHQuZmlyZWZveCAmJiByZXN1bHQudmVyc2lvbiA8IDIwLjApIHx8XG4gICAgICAgIChyZXN1bHQuc2FmYXJpICYmIHJlc3VsdC52ZXJzaW9uIDwgNikgfHxcbiAgICAgICAgKHJlc3VsdC5vcGVyYSAmJiByZXN1bHQudmVyc2lvbiA8IDEwLjApIHx8XG4gICAgICAgIChyZXN1bHQuaW9zICYmIHJlc3VsdC5vc3ZlcnNpb24gJiYgcmVzdWx0Lm9zdmVyc2lvbi5zcGxpdChcIi5cIilbMF0gPCA2KVxuICAgICAgICApIHtcbiAgICAgIHJlc3VsdC5jID0gdFxuICAgIH0gZWxzZSByZXN1bHQueCA9IHRcblxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIHZhciBib3dzZXIgPSBkZXRlY3QodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgPyBuYXZpZ2F0b3IudXNlckFnZW50IDogJycpXG5cblxuICAvKlxuICAgKiBTZXQgb3VyIGRldGVjdCBtZXRob2QgdG8gdGhlIG1haW4gYm93c2VyIG9iamVjdCBzbyB3ZSBjYW5cbiAgICogcmV1c2UgaXQgdG8gdGVzdCBvdGhlciB1c2VyIGFnZW50cy5cbiAgICogVGhpcyBpcyBuZWVkZWQgdG8gaW1wbGVtZW50IGZ1dHVyZSB0ZXN0cy5cbiAgICovXG4gIGJvd3Nlci5fZGV0ZWN0ID0gZGV0ZWN0O1xuXG4gIHJldHVybiBib3dzZXJcbn0pO1xuIiwiLy8gQnJvd3NlciBSZXF1ZXN0XG4vL1xuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vICAgICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vLyBVTUQgSEVBREVSIFNUQVJUIFxuKGZ1bmN0aW9uIChyb290LCBmYWN0b3J5KSB7XG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvLyBBTUQuIFJlZ2lzdGVyIGFzIGFuIGFub255bW91cyBtb2R1bGUuXG4gICAgICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgLy8gTm9kZS4gRG9lcyBub3Qgd29yayB3aXRoIHN0cmljdCBDb21tb25KUywgYnV0XG4gICAgICAgIC8vIG9ubHkgQ29tbW9uSlMtbGlrZSBlbnZpcm9tZW50cyB0aGF0IHN1cHBvcnQgbW9kdWxlLmV4cG9ydHMsXG4gICAgICAgIC8vIGxpa2UgTm9kZS5cbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQnJvd3NlciBnbG9iYWxzIChyb290IGlzIHdpbmRvdylcbiAgICAgICAgcm9vdC5yZXR1cm5FeHBvcnRzID0gZmFjdG9yeSgpO1xuICB9XG59KHRoaXMsIGZ1bmN0aW9uICgpIHtcbi8vIFVNRCBIRUFERVIgRU5EXG5cbnZhciBYSFIgPSBYTUxIdHRwUmVxdWVzdFxuaWYgKCFYSFIpIHRocm93IG5ldyBFcnJvcignbWlzc2luZyBYTUxIdHRwUmVxdWVzdCcpXG5yZXF1ZXN0LmxvZyA9IHtcbiAgJ3RyYWNlJzogbm9vcCwgJ2RlYnVnJzogbm9vcCwgJ2luZm8nOiBub29wLCAnd2Fybic6IG5vb3AsICdlcnJvcic6IG5vb3Bcbn1cblxudmFyIERFRkFVTFRfVElNRU9VVCA9IDMgKiA2MCAqIDEwMDAgLy8gMyBtaW51dGVzXG5cbi8vXG4vLyByZXF1ZXN0XG4vL1xuXG5mdW5jdGlvbiByZXF1ZXN0KG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIC8vIFRoZSBlbnRyeS1wb2ludCB0byB0aGUgQVBJOiBwcmVwIHRoZSBvcHRpb25zIG9iamVjdCBhbmQgcGFzcyB0aGUgcmVhbCB3b3JrIHRvIHJ1bl94aHIuXG4gIGlmKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJylcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0JhZCBjYWxsYmFjayBnaXZlbjogJyArIGNhbGxiYWNrKVxuXG4gIGlmKCFvcHRpb25zKVxuICAgIHRocm93IG5ldyBFcnJvcignTm8gb3B0aW9ucyBnaXZlbicpXG5cbiAgdmFyIG9wdGlvbnNfb25SZXNwb25zZSA9IG9wdGlvbnMub25SZXNwb25zZTsgLy8gU2F2ZSB0aGlzIGZvciBsYXRlci5cblxuICBpZih0eXBlb2Ygb3B0aW9ucyA9PT0gJ3N0cmluZycpXG4gICAgb3B0aW9ucyA9IHsndXJpJzpvcHRpb25zfTtcbiAgZWxzZVxuICAgIG9wdGlvbnMgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKTsgLy8gVXNlIGEgZHVwbGljYXRlIGZvciBtdXRhdGluZy5cblxuICBvcHRpb25zLm9uUmVzcG9uc2UgPSBvcHRpb25zX29uUmVzcG9uc2UgLy8gQW5kIHB1dCBpdCBiYWNrLlxuXG4gIGlmIChvcHRpb25zLnZlcmJvc2UpIHJlcXVlc3QubG9nID0gZ2V0TG9nZ2VyKCk7XG5cbiAgaWYob3B0aW9ucy51cmwpIHtcbiAgICBvcHRpb25zLnVyaSA9IG9wdGlvbnMudXJsO1xuICAgIGRlbGV0ZSBvcHRpb25zLnVybDtcbiAgfVxuXG4gIGlmKCFvcHRpb25zLnVyaSAmJiBvcHRpb25zLnVyaSAhPT0gXCJcIilcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJvcHRpb25zLnVyaSBpcyBhIHJlcXVpcmVkIGFyZ3VtZW50XCIpO1xuXG4gIGlmKHR5cGVvZiBvcHRpb25zLnVyaSAhPSBcInN0cmluZ1wiKVxuICAgIHRocm93IG5ldyBFcnJvcihcIm9wdGlvbnMudXJpIG11c3QgYmUgYSBzdHJpbmdcIik7XG5cbiAgdmFyIHVuc3VwcG9ydGVkX29wdGlvbnMgPSBbJ3Byb3h5JywgJ19yZWRpcmVjdHNGb2xsb3dlZCcsICdtYXhSZWRpcmVjdHMnLCAnZm9sbG93UmVkaXJlY3QnXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHVuc3VwcG9ydGVkX29wdGlvbnMubGVuZ3RoOyBpKyspXG4gICAgaWYob3B0aW9uc1sgdW5zdXBwb3J0ZWRfb3B0aW9uc1tpXSBdKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3B0aW9ucy5cIiArIHVuc3VwcG9ydGVkX29wdGlvbnNbaV0gKyBcIiBpcyBub3Qgc3VwcG9ydGVkXCIpXG5cbiAgb3B0aW9ucy5jYWxsYmFjayA9IGNhbGxiYWNrXG4gIG9wdGlvbnMubWV0aG9kID0gb3B0aW9ucy5tZXRob2QgfHwgJ0dFVCc7XG4gIG9wdGlvbnMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCB7fTtcbiAgb3B0aW9ucy5ib2R5ICAgID0gb3B0aW9ucy5ib2R5IHx8IG51bGxcbiAgb3B0aW9ucy50aW1lb3V0ID0gb3B0aW9ucy50aW1lb3V0IHx8IHJlcXVlc3QuREVGQVVMVF9USU1FT1VUXG5cbiAgaWYob3B0aW9ucy5oZWFkZXJzLmhvc3QpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiT3B0aW9ucy5oZWFkZXJzLmhvc3QgaXMgbm90IHN1cHBvcnRlZFwiKTtcblxuICBpZihvcHRpb25zLmpzb24pIHtcbiAgICBvcHRpb25zLmhlYWRlcnMuYWNjZXB0ID0gb3B0aW9ucy5oZWFkZXJzLmFjY2VwdCB8fCAnYXBwbGljYXRpb24vanNvbidcbiAgICBpZihvcHRpb25zLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICBvcHRpb25zLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gJ2FwcGxpY2F0aW9uL2pzb24nXG5cbiAgICBpZih0eXBlb2Ygb3B0aW9ucy5qc29uICE9PSAnYm9vbGVhbicpXG4gICAgICBvcHRpb25zLmJvZHkgPSBKU09OLnN0cmluZ2lmeShvcHRpb25zLmpzb24pXG4gICAgZWxzZSBpZih0eXBlb2Ygb3B0aW9ucy5ib2R5ICE9PSAnc3RyaW5nJylcbiAgICAgIG9wdGlvbnMuYm9keSA9IEpTT04uc3RyaW5naWZ5KG9wdGlvbnMuYm9keSlcbiAgfVxuICBcbiAgLy9CRUdJTiBRUyBIYWNrXG4gIHZhciBzZXJpYWxpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgc3RyID0gW107XG4gICAgZm9yKHZhciBwIGluIG9iailcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgc3RyLnB1c2goZW5jb2RlVVJJQ29tcG9uZW50KHApICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQob2JqW3BdKSk7XG4gICAgICB9XG4gICAgcmV0dXJuIHN0ci5qb2luKFwiJlwiKTtcbiAgfVxuICBcbiAgaWYob3B0aW9ucy5xcyl7XG4gICAgdmFyIHFzID0gKHR5cGVvZiBvcHRpb25zLnFzID09ICdzdHJpbmcnKT8gb3B0aW9ucy5xcyA6IHNlcmlhbGl6ZShvcHRpb25zLnFzKTtcbiAgICBpZihvcHRpb25zLnVyaS5pbmRleE9mKCc/JykgIT09IC0xKXsgLy9ubyBnZXQgcGFyYW1zXG4gICAgICAgIG9wdGlvbnMudXJpID0gb3B0aW9ucy51cmkrJyYnK3FzO1xuICAgIH1lbHNleyAvL2V4aXN0aW5nIGdldCBwYXJhbXNcbiAgICAgICAgb3B0aW9ucy51cmkgPSBvcHRpb25zLnVyaSsnPycrcXM7XG4gICAgfVxuICB9XG4gIC8vRU5EIFFTIEhhY2tcbiAgXG4gIC8vQkVHSU4gRk9STSBIYWNrXG4gIHZhciBtdWx0aXBhcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICAvL3RvZG86IHN1cHBvcnQgZmlsZSB0eXBlICh1c2VmdWw/KVxuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICByZXN1bHQuYm91bmRyeSA9ICctLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tJytNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMTAwMDAwMDAwMCk7XG4gICAgdmFyIGxpbmVzID0gW107XG4gICAgZm9yKHZhciBwIGluIG9iail7XG4gICAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgICAgICAgIGxpbmVzLnB1c2goXG4gICAgICAgICAgICAgICAgJy0tJytyZXN1bHQuYm91bmRyeStcIlxcblwiK1xuICAgICAgICAgICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uOiBmb3JtLWRhdGE7IG5hbWU9XCInK3ArJ1wiJytcIlxcblwiK1xuICAgICAgICAgICAgICAgIFwiXFxuXCIrXG4gICAgICAgICAgICAgICAgb2JqW3BdK1wiXFxuXCJcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgbGluZXMucHVzaCggJy0tJytyZXN1bHQuYm91bmRyeSsnLS0nICk7XG4gICAgcmVzdWx0LmJvZHkgPSBsaW5lcy5qb2luKCcnKTtcbiAgICByZXN1bHQubGVuZ3RoID0gcmVzdWx0LmJvZHkubGVuZ3RoO1xuICAgIHJlc3VsdC50eXBlID0gJ211bHRpcGFydC9mb3JtLWRhdGE7IGJvdW5kYXJ5PScrcmVzdWx0LmJvdW5kcnk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBcbiAgaWYob3B0aW9ucy5mb3JtKXtcbiAgICBpZih0eXBlb2Ygb3B0aW9ucy5mb3JtID09ICdzdHJpbmcnKSB0aHJvdygnZm9ybSBuYW1lIHVuc3VwcG9ydGVkJyk7XG4gICAgaWYob3B0aW9ucy5tZXRob2QgPT09ICdQT1NUJyl7XG4gICAgICAgIHZhciBlbmNvZGluZyA9IChvcHRpb25zLmVuY29kaW5nIHx8ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICBvcHRpb25zLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddID0gZW5jb2Rpbmc7XG4gICAgICAgIHN3aXRjaChlbmNvZGluZyl7XG4gICAgICAgICAgICBjYXNlICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnOlxuICAgICAgICAgICAgICAgIG9wdGlvbnMuYm9keSA9IHNlcmlhbGl6ZShvcHRpb25zLmZvcm0pLnJlcGxhY2UoLyUyMC9nLCBcIitcIik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdtdWx0aXBhcnQvZm9ybS1kYXRhJzpcbiAgICAgICAgICAgICAgICB2YXIgbXVsdGkgPSBtdWx0aXBhcnQob3B0aW9ucy5mb3JtKTtcbiAgICAgICAgICAgICAgICAvL29wdGlvbnMuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSA9IG11bHRpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBvcHRpb25zLmJvZHkgPSBtdWx0aS5ib2R5O1xuICAgICAgICAgICAgICAgIG9wdGlvbnMuaGVhZGVyc1snY29udGVudC10eXBlJ10gPSBtdWx0aS50eXBlO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdCA6IHRocm93IG5ldyBFcnJvcigndW5zdXBwb3J0ZWQgZW5jb2Rpbmc6JytlbmNvZGluZyk7XG4gICAgICAgIH1cbiAgICB9XG4gIH1cbiAgLy9FTkQgRk9STSBIYWNrXG5cbiAgLy8gSWYgb25SZXNwb25zZSBpcyBib29sZWFuIHRydWUsIGNhbGwgYmFjayBpbW1lZGlhdGVseSB3aGVuIHRoZSByZXNwb25zZSBpcyBrbm93bixcbiAgLy8gbm90IHdoZW4gdGhlIGZ1bGwgcmVxdWVzdCBpcyBjb21wbGV0ZS5cbiAgb3B0aW9ucy5vblJlc3BvbnNlID0gb3B0aW9ucy5vblJlc3BvbnNlIHx8IG5vb3BcbiAgaWYob3B0aW9ucy5vblJlc3BvbnNlID09PSB0cnVlKSB7XG4gICAgb3B0aW9ucy5vblJlc3BvbnNlID0gY2FsbGJhY2tcbiAgICBvcHRpb25zLmNhbGxiYWNrID0gbm9vcFxuICB9XG5cbiAgLy8gWFhYIEJyb3dzZXJzIGRvIG5vdCBsaWtlIHRoaXMuXG4gIC8vaWYob3B0aW9ucy5ib2R5KVxuICAvLyAgb3B0aW9ucy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddID0gb3B0aW9ucy5ib2R5Lmxlbmd0aDtcblxuICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gIGlmKCFvcHRpb25zLmhlYWRlcnMuYXV0aG9yaXphdGlvbiAmJiBvcHRpb25zLmF1dGgpXG4gICAgb3B0aW9ucy5oZWFkZXJzLmF1dGhvcml6YXRpb24gPSAnQmFzaWMgJyArIGI2NF9lbmMob3B0aW9ucy5hdXRoLnVzZXJuYW1lICsgJzonICsgb3B0aW9ucy5hdXRoLnBhc3N3b3JkKTtcblxuICByZXR1cm4gcnVuX3hocihvcHRpb25zKVxufVxuXG52YXIgcmVxX3NlcSA9IDBcbmZ1bmN0aW9uIHJ1bl94aHIob3B0aW9ucykge1xuICB2YXIgeGhyID0gbmV3IFhIUlxuICAgICwgdGltZWRfb3V0ID0gZmFsc2VcbiAgICAsIGlzX2NvcnMgPSBpc19jcm9zc0RvbWFpbihvcHRpb25zLnVyaSlcbiAgICAsIHN1cHBvcnRzX2NvcnMgPSAoJ3dpdGhDcmVkZW50aWFscycgaW4geGhyKVxuXG4gIHJlcV9zZXEgKz0gMVxuICB4aHIuc2VxX2lkID0gcmVxX3NlcVxuICB4aHIuaWQgPSByZXFfc2VxICsgJzogJyArIG9wdGlvbnMubWV0aG9kICsgJyAnICsgb3B0aW9ucy51cmlcbiAgeGhyLl9pZCA9IHhoci5pZCAvLyBJIGtub3cgSSB3aWxsIHR5cGUgXCJfaWRcIiBmcm9tIGhhYml0IGFsbCB0aGUgdGltZS5cblxuICBpZihpc19jb3JzICYmICFzdXBwb3J0c19jb3JzKSB7XG4gICAgdmFyIGNvcnNfZXJyID0gbmV3IEVycm9yKCdCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgY3Jvc3Mtb3JpZ2luIHJlcXVlc3Q6ICcgKyBvcHRpb25zLnVyaSlcbiAgICBjb3JzX2Vyci5jb3JzID0gJ3Vuc3VwcG9ydGVkJ1xuICAgIHJldHVybiBvcHRpb25zLmNhbGxiYWNrKGNvcnNfZXJyLCB4aHIpXG4gIH1cblxuICB4aHIudGltZW91dFRpbWVyID0gc2V0VGltZW91dCh0b29fbGF0ZSwgb3B0aW9ucy50aW1lb3V0KVxuICBmdW5jdGlvbiB0b29fbGF0ZSgpIHtcbiAgICB0aW1lZF9vdXQgPSB0cnVlXG4gICAgdmFyIGVyID0gbmV3IEVycm9yKCdFVElNRURPVVQnKVxuICAgIGVyLmNvZGUgPSAnRVRJTUVET1VUJ1xuICAgIGVyLmR1cmF0aW9uID0gb3B0aW9ucy50aW1lb3V0XG5cbiAgICByZXF1ZXN0LmxvZy5lcnJvcignVGltZW91dCcsIHsgJ2lkJzp4aHIuX2lkLCAnbWlsbGlzZWNvbmRzJzpvcHRpb25zLnRpbWVvdXQgfSlcbiAgICByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKVxuICB9XG5cbiAgLy8gU29tZSBzdGF0ZXMgY2FuIGJlIHNraXBwZWQgb3Zlciwgc28gcmVtZW1iZXIgd2hhdCBpcyBzdGlsbCBpbmNvbXBsZXRlLlxuICB2YXIgZGlkID0geydyZXNwb25zZSc6ZmFsc2UsICdsb2FkaW5nJzpmYWxzZSwgJ2VuZCc6ZmFsc2V9XG5cbiAgeGhyLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG9uX3N0YXRlX2NoYW5nZVxuICB4aHIub3BlbihvcHRpb25zLm1ldGhvZCwgb3B0aW9ucy51cmksIHRydWUpIC8vIGFzeW5jaHJvbm91c1xuICBpZihpc19jb3JzKVxuICAgIHhoci53aXRoQ3JlZGVudGlhbHMgPSAhISBvcHRpb25zLndpdGhDcmVkZW50aWFsc1xuICB4aHIuc2VuZChvcHRpb25zLmJvZHkpXG4gIHJldHVybiB4aHJcblxuICBmdW5jdGlvbiBvbl9zdGF0ZV9jaGFuZ2UoZXZlbnQpIHtcbiAgICBpZih0aW1lZF9vdXQpXG4gICAgICByZXR1cm4gcmVxdWVzdC5sb2cuZGVidWcoJ0lnbm9yaW5nIHRpbWVkIG91dCBzdGF0ZSBjaGFuZ2UnLCB7J3N0YXRlJzp4aHIucmVhZHlTdGF0ZSwgJ2lkJzp4aHIuaWR9KVxuXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1N0YXRlIGNoYW5nZScsIHsnc3RhdGUnOnhoci5yZWFkeVN0YXRlLCAnaWQnOnhoci5pZCwgJ3RpbWVkX291dCc6dGltZWRfb3V0fSlcblxuICAgIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuT1BFTkVEKSB7XG4gICAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnUmVxdWVzdCBzdGFydGVkJywgeydpZCc6eGhyLmlkfSlcbiAgICAgIGZvciAodmFyIGtleSBpbiBvcHRpb25zLmhlYWRlcnMpXG4gICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgb3B0aW9ucy5oZWFkZXJzW2tleV0pXG4gICAgfVxuXG4gICAgZWxzZSBpZih4aHIucmVhZHlTdGF0ZSA9PT0gWEhSLkhFQURFUlNfUkVDRUlWRUQpXG4gICAgICBvbl9yZXNwb25zZSgpXG5cbiAgICBlbHNlIGlmKHhoci5yZWFkeVN0YXRlID09PSBYSFIuTE9BRElORykge1xuICAgICAgb25fcmVzcG9uc2UoKVxuICAgICAgb25fbG9hZGluZygpXG4gICAgfVxuXG4gICAgZWxzZSBpZih4aHIucmVhZHlTdGF0ZSA9PT0gWEhSLkRPTkUpIHtcbiAgICAgIG9uX3Jlc3BvbnNlKClcbiAgICAgIG9uX2xvYWRpbmcoKVxuICAgICAgb25fZW5kKClcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBvbl9yZXNwb25zZSgpIHtcbiAgICBpZihkaWQucmVzcG9uc2UpXG4gICAgICByZXR1cm5cblxuICAgIGRpZC5yZXNwb25zZSA9IHRydWVcbiAgICByZXF1ZXN0LmxvZy5kZWJ1ZygnR290IHJlc3BvbnNlJywgeydpZCc6eGhyLmlkLCAnc3RhdHVzJzp4aHIuc3RhdHVzfSlcbiAgICBjbGVhclRpbWVvdXQoeGhyLnRpbWVvdXRUaW1lcilcbiAgICB4aHIuc3RhdHVzQ29kZSA9IHhoci5zdGF0dXMgLy8gTm9kZSByZXF1ZXN0IGNvbXBhdGliaWxpdHlcblxuICAgIC8vIERldGVjdCBmYWlsZWQgQ09SUyByZXF1ZXN0cy5cbiAgICBpZihpc19jb3JzICYmIHhoci5zdGF0dXNDb2RlID09IDApIHtcbiAgICAgIHZhciBjb3JzX2VyciA9IG5ldyBFcnJvcignQ09SUyByZXF1ZXN0IHJlamVjdGVkOiAnICsgb3B0aW9ucy51cmkpXG4gICAgICBjb3JzX2Vyci5jb3JzID0gJ3JlamVjdGVkJ1xuXG4gICAgICAvLyBEbyBub3QgcHJvY2VzcyB0aGlzIHJlcXVlc3QgZnVydGhlci5cbiAgICAgIGRpZC5sb2FkaW5nID0gdHJ1ZVxuICAgICAgZGlkLmVuZCA9IHRydWVcblxuICAgICAgcmV0dXJuIG9wdGlvbnMuY2FsbGJhY2soY29yc19lcnIsIHhocilcbiAgICB9XG5cbiAgICBvcHRpb25zLm9uUmVzcG9uc2UobnVsbCwgeGhyKVxuICB9XG5cbiAgZnVuY3Rpb24gb25fbG9hZGluZygpIHtcbiAgICBpZihkaWQubG9hZGluZylcbiAgICAgIHJldHVyblxuXG4gICAgZGlkLmxvYWRpbmcgPSB0cnVlXG4gICAgcmVxdWVzdC5sb2cuZGVidWcoJ1Jlc3BvbnNlIGJvZHkgbG9hZGluZycsIHsnaWQnOnhoci5pZH0pXG4gICAgLy8gVE9ETzogTWF5YmUgc2ltdWxhdGUgXCJkYXRhXCIgZXZlbnRzIGJ5IHdhdGNoaW5nIHhoci5yZXNwb25zZVRleHRcbiAgfVxuXG4gIGZ1bmN0aW9uIG9uX2VuZCgpIHtcbiAgICBpZihkaWQuZW5kKVxuICAgICAgcmV0dXJuXG5cbiAgICBkaWQuZW5kID0gdHJ1ZVxuICAgIHJlcXVlc3QubG9nLmRlYnVnKCdSZXF1ZXN0IGRvbmUnLCB7J2lkJzp4aHIuaWR9KVxuXG4gICAgeGhyLmJvZHkgPSB4aHIucmVzcG9uc2VUZXh0XG4gICAgaWYob3B0aW9ucy5qc29uKSB7XG4gICAgICB0cnkgICAgICAgIHsgeGhyLmJvZHkgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpIH1cbiAgICAgIGNhdGNoIChlcikgeyByZXR1cm4gb3B0aW9ucy5jYWxsYmFjayhlciwgeGhyKSAgICAgICAgfVxuICAgIH1cblxuICAgIG9wdGlvbnMuY2FsbGJhY2sobnVsbCwgeGhyLCB4aHIuYm9keSlcbiAgfVxuXG59IC8vIHJlcXVlc3RcblxucmVxdWVzdC53aXRoQ3JlZGVudGlhbHMgPSBmYWxzZTtcbnJlcXVlc3QuREVGQVVMVF9USU1FT1VUID0gREVGQVVMVF9USU1FT1VUO1xuXG4vL1xuLy8gZGVmYXVsdHNcbi8vXG5cbnJlcXVlc3QuZGVmYXVsdHMgPSBmdW5jdGlvbihvcHRpb25zLCByZXF1ZXN0ZXIpIHtcbiAgdmFyIGRlZiA9IGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgICB2YXIgZCA9IGZ1bmN0aW9uIChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICBpZih0eXBlb2YgcGFyYW1zID09PSAnc3RyaW5nJylcbiAgICAgICAgcGFyYW1zID0geyd1cmknOiBwYXJhbXN9O1xuICAgICAgZWxzZSB7XG4gICAgICAgIHBhcmFtcyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkocGFyYW1zKSk7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBpIGluIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKHBhcmFtc1tpXSA9PT0gdW5kZWZpbmVkKSBwYXJhbXNbaV0gPSBvcHRpb25zW2ldXG4gICAgICB9XG4gICAgICByZXR1cm4gbWV0aG9kKHBhcmFtcywgY2FsbGJhY2spXG4gICAgfVxuICAgIHJldHVybiBkXG4gIH1cbiAgdmFyIGRlID0gZGVmKHJlcXVlc3QpXG4gIGRlLmdldCA9IGRlZihyZXF1ZXN0LmdldClcbiAgZGUucG9zdCA9IGRlZihyZXF1ZXN0LnBvc3QpXG4gIGRlLnB1dCA9IGRlZihyZXF1ZXN0LnB1dClcbiAgZGUuaGVhZCA9IGRlZihyZXF1ZXN0LmhlYWQpXG4gIHJldHVybiBkZVxufVxuXG4vL1xuLy8gSFRUUCBtZXRob2Qgc2hvcnRjdXRzXG4vL1xuXG52YXIgc2hvcnRjdXRzID0gWyAnZ2V0JywgJ3B1dCcsICdwb3N0JywgJ2hlYWQnIF07XG5zaG9ydGN1dHMuZm9yRWFjaChmdW5jdGlvbihzaG9ydGN1dCkge1xuICB2YXIgbWV0aG9kID0gc2hvcnRjdXQudG9VcHBlckNhc2UoKTtcbiAgdmFyIGZ1bmMgICA9IHNob3J0Y3V0LnRvTG93ZXJDYXNlKCk7XG5cbiAgcmVxdWVzdFtmdW5jXSA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgICBpZih0eXBlb2Ygb3B0cyA9PT0gJ3N0cmluZycpXG4gICAgICBvcHRzID0geydtZXRob2QnOm1ldGhvZCwgJ3VyaSc6b3B0c307XG4gICAgZWxzZSB7XG4gICAgICBvcHRzID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvcHRzKSk7XG4gICAgICBvcHRzLm1ldGhvZCA9IG1ldGhvZDtcbiAgICB9XG5cbiAgICB2YXIgYXJncyA9IFtvcHRzXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGFyZ3VtZW50cywgWzFdKSk7XG4gICAgcmV0dXJuIHJlcXVlc3QuYXBwbHkodGhpcywgYXJncyk7XG4gIH1cbn0pXG5cbi8vXG4vLyBDb3VjaERCIHNob3J0Y3V0XG4vL1xuXG5yZXF1ZXN0LmNvdWNoID0gZnVuY3Rpb24ob3B0aW9ucywgY2FsbGJhY2spIHtcbiAgaWYodHlwZW9mIG9wdGlvbnMgPT09ICdzdHJpbmcnKVxuICAgIG9wdGlvbnMgPSB7J3VyaSc6b3B0aW9uc31cblxuICAvLyBKdXN0IHVzZSB0aGUgcmVxdWVzdCBBUEkgdG8gZG8gSlNPTi5cbiAgb3B0aW9ucy5qc29uID0gdHJ1ZVxuICBpZihvcHRpb25zLmJvZHkpXG4gICAgb3B0aW9ucy5qc29uID0gb3B0aW9ucy5ib2R5XG4gIGRlbGV0ZSBvcHRpb25zLmJvZHlcblxuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IG5vb3BcblxuICB2YXIgeGhyID0gcmVxdWVzdChvcHRpb25zLCBjb3VjaF9oYW5kbGVyKVxuICByZXR1cm4geGhyXG5cbiAgZnVuY3Rpb24gY291Y2hfaGFuZGxlcihlciwgcmVzcCwgYm9keSkge1xuICAgIGlmKGVyKVxuICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyLCByZXNwLCBib2R5KVxuXG4gICAgaWYoKHJlc3Auc3RhdHVzQ29kZSA8IDIwMCB8fCByZXNwLnN0YXR1c0NvZGUgPiAyOTkpICYmIGJvZHkuZXJyb3IpIHtcbiAgICAgIC8vIFRoZSBib2R5IGlzIGEgQ291Y2ggSlNPTiBvYmplY3QgaW5kaWNhdGluZyB0aGUgZXJyb3IuXG4gICAgICBlciA9IG5ldyBFcnJvcignQ291Y2hEQiBlcnJvcjogJyArIChib2R5LmVycm9yLnJlYXNvbiB8fCBib2R5LmVycm9yLmVycm9yKSlcbiAgICAgIGZvciAodmFyIGtleSBpbiBib2R5KVxuICAgICAgICBlcltrZXldID0gYm9keVtrZXldXG4gICAgICByZXR1cm4gY2FsbGJhY2soZXIsIHJlc3AsIGJvZHkpO1xuICAgIH1cblxuICAgIHJldHVybiBjYWxsYmFjayhlciwgcmVzcCwgYm9keSk7XG4gIH1cbn1cblxuLy9cbi8vIFV0aWxpdHlcbi8vXG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5mdW5jdGlvbiBnZXRMb2dnZXIoKSB7XG4gIHZhciBsb2dnZXIgPSB7fVxuICAgICwgbGV2ZWxzID0gWyd0cmFjZScsICdkZWJ1ZycsICdpbmZvJywgJ3dhcm4nLCAnZXJyb3InXVxuICAgICwgbGV2ZWwsIGlcblxuICBmb3IoaSA9IDA7IGkgPCBsZXZlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXZlbCA9IGxldmVsc1tpXVxuXG4gICAgbG9nZ2VyW2xldmVsXSA9IG5vb3BcbiAgICBpZih0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZSAmJiBjb25zb2xlW2xldmVsXSlcbiAgICAgIGxvZ2dlcltsZXZlbF0gPSBmb3JtYXR0ZWQoY29uc29sZSwgbGV2ZWwpXG4gIH1cblxuICByZXR1cm4gbG9nZ2VyXG59XG5cbmZ1bmN0aW9uIGZvcm1hdHRlZChvYmosIG1ldGhvZCkge1xuICByZXR1cm4gZm9ybWF0dGVkX2xvZ2dlclxuXG4gIGZ1bmN0aW9uIGZvcm1hdHRlZF9sb2dnZXIoc3RyLCBjb250ZXh0KSB7XG4gICAgaWYodHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKVxuICAgICAgc3RyICs9ICcgJyArIEpTT04uc3RyaW5naWZ5KGNvbnRleHQpXG5cbiAgICByZXR1cm4gb2JqW21ldGhvZF0uY2FsbChvYmosIHN0cilcbiAgfVxufVxuXG4vLyBSZXR1cm4gd2hldGhlciBhIFVSTCBpcyBhIGNyb3NzLWRvbWFpbiByZXF1ZXN0LlxuZnVuY3Rpb24gaXNfY3Jvc3NEb21haW4odXJsKSB7XG4gIHZhciBydXJsID0gL14oW1xcd1xcK1xcLlxcLV0rOikoPzpcXC9cXC8oW15cXC8/IzpdKikoPzo6KFxcZCspKT8pPy9cblxuICAvLyBqUXVlcnkgIzgxMzgsIElFIG1heSB0aHJvdyBhbiBleGNlcHRpb24gd2hlbiBhY2Nlc3NpbmdcbiAgLy8gYSBmaWVsZCBmcm9tIHdpbmRvdy5sb2NhdGlvbiBpZiBkb2N1bWVudC5kb21haW4gaGFzIGJlZW4gc2V0XG4gIHZhciBhamF4TG9jYXRpb25cbiAgdHJ5IHsgYWpheExvY2F0aW9uID0gbG9jYXRpb24uaHJlZiB9XG4gIGNhdGNoIChlKSB7XG4gICAgLy8gVXNlIHRoZSBocmVmIGF0dHJpYnV0ZSBvZiBhbiBBIGVsZW1lbnQgc2luY2UgSUUgd2lsbCBtb2RpZnkgaXQgZ2l2ZW4gZG9jdW1lbnQubG9jYXRpb25cbiAgICBhamF4TG9jYXRpb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCBcImFcIiApO1xuICAgIGFqYXhMb2NhdGlvbi5ocmVmID0gXCJcIjtcbiAgICBhamF4TG9jYXRpb24gPSBhamF4TG9jYXRpb24uaHJlZjtcbiAgfVxuXG4gIHZhciBhamF4TG9jUGFydHMgPSBydXJsLmV4ZWMoYWpheExvY2F0aW9uLnRvTG93ZXJDYXNlKCkpIHx8IFtdXG4gICAgLCBwYXJ0cyA9IHJ1cmwuZXhlYyh1cmwudG9Mb3dlckNhc2UoKSApXG5cbiAgdmFyIHJlc3VsdCA9ICEhKFxuICAgIHBhcnRzICYmXG4gICAgKCAgcGFydHNbMV0gIT0gYWpheExvY1BhcnRzWzFdXG4gICAgfHwgcGFydHNbMl0gIT0gYWpheExvY1BhcnRzWzJdXG4gICAgfHwgKHBhcnRzWzNdIHx8IChwYXJ0c1sxXSA9PT0gXCJodHRwOlwiID8gODAgOiA0NDMpKSAhPSAoYWpheExvY1BhcnRzWzNdIHx8IChhamF4TG9jUGFydHNbMV0gPT09IFwiaHR0cDpcIiA/IDgwIDogNDQzKSlcbiAgICApXG4gIClcblxuICAvL2NvbnNvbGUuZGVidWcoJ2lzX2Nyb3NzRG9tYWluKCcrdXJsKycpIC0+ICcgKyByZXN1bHQpXG4gIHJldHVybiByZXN1bHRcbn1cblxuLy8gTUlUIExpY2Vuc2UgZnJvbSBodHRwOi8vcGhwanMub3JnL2Z1bmN0aW9ucy9iYXNlNjRfZW5jb2RlOjM1OFxuZnVuY3Rpb24gYjY0X2VuYyAoZGF0YSkge1xuICAgIC8vIEVuY29kZXMgc3RyaW5nIHVzaW5nIE1JTUUgYmFzZTY0IGFsZ29yaXRobVxuICAgIHZhciBiNjQgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89XCI7XG4gICAgdmFyIG8xLCBvMiwgbzMsIGgxLCBoMiwgaDMsIGg0LCBiaXRzLCBpID0gMCwgYWMgPSAwLCBlbmM9XCJcIiwgdG1wX2FyciA9IFtdO1xuXG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cblxuICAgIC8vIGFzc3VtZSB1dGY4IGRhdGFcbiAgICAvLyBkYXRhID0gdGhpcy51dGY4X2VuY29kZShkYXRhKycnKTtcblxuICAgIGRvIHsgLy8gcGFjayB0aHJlZSBvY3RldHMgaW50byBmb3VyIGhleGV0c1xuICAgICAgICBvMSA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBvMiA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuICAgICAgICBvMyA9IGRhdGEuY2hhckNvZGVBdChpKyspO1xuXG4gICAgICAgIGJpdHMgPSBvMTw8MTYgfCBvMjw8OCB8IG8zO1xuXG4gICAgICAgIGgxID0gYml0cz4+MTggJiAweDNmO1xuICAgICAgICBoMiA9IGJpdHM+PjEyICYgMHgzZjtcbiAgICAgICAgaDMgPSBiaXRzPj42ICYgMHgzZjtcbiAgICAgICAgaDQgPSBiaXRzICYgMHgzZjtcblxuICAgICAgICAvLyB1c2UgaGV4ZXRzIHRvIGluZGV4IGludG8gYjY0LCBhbmQgYXBwZW5kIHJlc3VsdCB0byBlbmNvZGVkIHN0cmluZ1xuICAgICAgICB0bXBfYXJyW2FjKytdID0gYjY0LmNoYXJBdChoMSkgKyBiNjQuY2hhckF0KGgyKSArIGI2NC5jaGFyQXQoaDMpICsgYjY0LmNoYXJBdChoNCk7XG4gICAgfSB3aGlsZSAoaSA8IGRhdGEubGVuZ3RoKTtcblxuICAgIGVuYyA9IHRtcF9hcnIuam9pbignJyk7XG5cbiAgICBzd2l0Y2ggKGRhdGEubGVuZ3RoICUgMykge1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICBlbmMgPSBlbmMuc2xpY2UoMCwgLTIpICsgJz09JztcbiAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgIGVuYyA9IGVuYy5zbGljZSgwLCAtMSkgKyAnPSc7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIHJldHVybiBlbmM7XG59XG4gICAgcmV0dXJuIHJlcXVlc3Q7XG4vL1VNRCBGT09URVIgU1RBUlRcbn0pKTtcbi8vVU1EIEZPT1RFUiBFTkRcbiIsIi8vIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1VuaXRfVGVzdGluZy8xLjBcbi8vXG4vLyBUSElTIElTIE5PVCBURVNURUQgTk9SIExJS0VMWSBUTyBXT1JLIE9VVFNJREUgVjghXG4vL1xuLy8gT3JpZ2luYWxseSBmcm9tIG5hcndoYWwuanMgKGh0dHA6Ly9uYXJ3aGFsanMub3JnKVxuLy8gQ29weXJpZ2h0IChjKSAyMDA5IFRob21hcyBSb2JpbnNvbiA8Mjgwbm9ydGguY29tPlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0b1xuLy8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbi8vIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuLy8gc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbi8vIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbi8vIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyB3aGVuIHVzZWQgaW4gbm9kZSwgdGhpcyB3aWxsIGFjdHVhbGx5IGxvYWQgdGhlIHV0aWwgbW9kdWxlIHdlIGRlcGVuZCBvblxuLy8gdmVyc3VzIGxvYWRpbmcgdGhlIGJ1aWx0aW4gdXRpbCBtb2R1bGUgYXMgaGFwcGVucyBvdGhlcndpc2Vcbi8vIHRoaXMgaXMgYSBidWcgaW4gbm9kZSBtb2R1bGUgbG9hZGluZyBhcyBmYXIgYXMgSSBhbSBjb25jZXJuZWRcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbC8nKTtcblxudmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgaWYgKG9wdGlvbnMubWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG9wdGlvbnMubWVzc2FnZTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNZXNzYWdlKHRoaXMpO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IHRydWU7XG4gIH1cbiAgdmFyIHN0YWNrU3RhcnRGdW5jdGlvbiA9IG9wdGlvbnMuc3RhY2tTdGFydEZ1bmN0aW9uIHx8IGZhaWw7XG5cbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgfVxuICBlbHNlIHtcbiAgICAvLyBub24gdjggYnJvd3NlcnMgc28gd2UgY2FuIGhhdmUgYSBzdGFja3RyYWNlXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgIHZhciBvdXQgPSBlcnIuc3RhY2s7XG5cbiAgICAgIC8vIHRyeSB0byBzdHJpcCB1c2VsZXNzIGZyYW1lc1xuICAgICAgdmFyIGZuX25hbWUgPSBzdGFja1N0YXJ0RnVuY3Rpb24ubmFtZTtcbiAgICAgIHZhciBpZHggPSBvdXQuaW5kZXhPZignXFxuJyArIGZuX25hbWUpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIC8vIG9uY2Ugd2UgaGF2ZSBsb2NhdGVkIHRoZSBmdW5jdGlvbiBmcmFtZVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHN0cmlwIG91dCBldmVyeXRoaW5nIGJlZm9yZSBpdCAoYW5kIGl0cyBsaW5lKVxuICAgICAgICB2YXIgbmV4dF9saW5lID0gb3V0LmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuICAgICAgICBvdXQgPSBvdXQuc3Vic3RyaW5nKG5leHRfbGluZSArIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YWNrID0gb3V0O1xuICAgIH1cbiAgfVxufTtcblxuLy8gYXNzZXJ0LkFzc2VydGlvbkVycm9yIGluc3RhbmNlb2YgRXJyb3JcbnV0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLCBFcnJvcik7XG5cbmZ1bmN0aW9uIHJlcGxhY2VyKGtleSwgdmFsdWUpIHtcbiAgaWYgKHV0aWwuaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgcmV0dXJuICcnICsgdmFsdWU7XG4gIH1cbiAgaWYgKHV0aWwuaXNOdW1iZXIodmFsdWUpICYmIChpc05hTih2YWx1ZSkgfHwgIWlzRmluaXRlKHZhbHVlKSkpIHtcbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcoKTtcbiAgfVxuICBpZiAodXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSB8fCB1dGlsLmlzUmVnRXhwKHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZygpO1xuICB9XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gdHJ1bmNhdGUocywgbikge1xuICBpZiAodXRpbC5pc1N0cmluZyhzKSkge1xuICAgIHJldHVybiBzLmxlbmd0aCA8IG4gPyBzIDogcy5zbGljZSgwLCBuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcztcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpIHtcbiAgcmV0dXJuIHRydW5jYXRlKEpTT04uc3RyaW5naWZ5KHNlbGYuYWN0dWFsLCByZXBsYWNlciksIDEyOCkgKyAnICcgK1xuICAgICAgICAgc2VsZi5vcGVyYXRvciArICcgJyArXG4gICAgICAgICB0cnVuY2F0ZShKU09OLnN0cmluZ2lmeShzZWxmLmV4cGVjdGVkLCByZXBsYWNlciksIDEyOCk7XG59XG5cbi8vIEF0IHByZXNlbnQgb25seSB0aGUgdGhyZWUga2V5cyBtZW50aW9uZWQgYWJvdmUgYXJlIHVzZWQgYW5kXG4vLyB1bmRlcnN0b29kIGJ5IHRoZSBzcGVjLiBJbXBsZW1lbnRhdGlvbnMgb3Igc3ViIG1vZHVsZXMgY2FuIHBhc3Ncbi8vIG90aGVyIGtleXMgdG8gdGhlIEFzc2VydGlvbkVycm9yJ3MgY29uc3RydWN0b3IgLSB0aGV5IHdpbGwgYmVcbi8vIGlnbm9yZWQuXG5cbi8vIDMuIEFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBtdXN0IHRocm93IGFuIEFzc2VydGlvbkVycm9yXG4vLyB3aGVuIGEgY29ycmVzcG9uZGluZyBjb25kaXRpb24gaXMgbm90IG1ldCwgd2l0aCBhIG1lc3NhZ2UgdGhhdFxuLy8gbWF5IGJlIHVuZGVmaW5lZCBpZiBub3QgcHJvdmlkZWQuICBBbGwgYXNzZXJ0aW9uIG1ldGhvZHMgcHJvdmlkZVxuLy8gYm90aCB0aGUgYWN0dWFsIGFuZCBleHBlY3RlZCB2YWx1ZXMgdG8gdGhlIGFzc2VydGlvbiBlcnJvciBmb3Jcbi8vIGRpc3BsYXkgcHVycG9zZXMuXG5cbmZ1bmN0aW9uIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgb3BlcmF0b3IsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xuICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHtcbiAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgIGFjdHVhbDogYWN0dWFsLFxuICAgIGV4cGVjdGVkOiBleHBlY3RlZCxcbiAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgc3RhY2tTdGFydEZ1bmN0aW9uOiBzdGFja1N0YXJ0RnVuY3Rpb25cbiAgfSk7XG59XG5cbi8vIEVYVEVOU0lPTiEgYWxsb3dzIGZvciB3ZWxsIGJlaGF2ZWQgZXJyb3JzIGRlZmluZWQgZWxzZXdoZXJlLlxuYXNzZXJ0LmZhaWwgPSBmYWlsO1xuXG4vLyA0LiBQdXJlIGFzc2VydGlvbiB0ZXN0cyB3aGV0aGVyIGEgdmFsdWUgaXMgdHJ1dGh5LCBhcyBkZXRlcm1pbmVkXG4vLyBieSAhIWd1YXJkLlxuLy8gYXNzZXJ0Lm9rKGd1YXJkLCBtZXNzYWdlX29wdCk7XG4vLyBUaGlzIHN0YXRlbWVudCBpcyBlcXVpdmFsZW50IHRvIGFzc2VydC5lcXVhbCh0cnVlLCAhIWd1YXJkLFxuLy8gbWVzc2FnZV9vcHQpOy4gVG8gdGVzdCBzdHJpY3RseSBmb3IgdGhlIHZhbHVlIHRydWUsIHVzZVxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKHRydWUsIGd1YXJkLCBtZXNzYWdlX29wdCk7LlxuXG5mdW5jdGlvbiBvayh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAoIXZhbHVlKSBmYWlsKHZhbHVlLCB0cnVlLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQub2spO1xufVxuYXNzZXJ0Lm9rID0gb2s7XG5cbi8vIDUuIFRoZSBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc2hhbGxvdywgY29lcmNpdmUgZXF1YWxpdHkgd2l0aFxuLy8gPT0uXG4vLyBhc3NlcnQuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT0gZXhwZWN0ZWQpIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09JywgYXNzZXJ0LmVxdWFsKTtcbn07XG5cbi8vIDYuIFRoZSBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciB3aGV0aGVyIHR3byBvYmplY3RzIGFyZSBub3QgZXF1YWxcbi8vIHdpdGggIT0gYXNzZXJ0Lm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdEVxdWFsID0gZnVuY3Rpb24gbm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT0nLCBhc3NlcnQubm90RXF1YWwpO1xuICB9XG59O1xuXG4vLyA3LiBUaGUgZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGEgZGVlcCBlcXVhbGl0eSByZWxhdGlvbi5cbi8vIGFzc2VydC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcEVxdWFsJywgYXNzZXJ0LmRlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkge1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcblxuICB9IGVsc2UgaWYgKHV0aWwuaXNCdWZmZXIoYWN0dWFsKSAmJiB1dGlsLmlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIGlmIChhY3R1YWwubGVuZ3RoICE9IGV4cGVjdGVkLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhY3R1YWwubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhY3R1YWxbaV0gIT09IGV4cGVjdGVkW2ldKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbiAgLy8gNy4yLiBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBEYXRlIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBEYXRlIG9iamVjdCB0aGF0IHJlZmVycyB0byB0aGUgc2FtZSB0aW1lLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNEYXRlKGFjdHVhbCkgJiYgdXRpbC5pc0RhdGUoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMgSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBSZWdFeHAgb2JqZWN0IHdpdGggdGhlIHNhbWUgc291cmNlIGFuZFxuICAvLyBwcm9wZXJ0aWVzIChgZ2xvYmFsYCwgYG11bHRpbGluZWAsIGBsYXN0SW5kZXhgLCBgaWdub3JlQ2FzZWApLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNSZWdFeHAoYWN0dWFsKSAmJiB1dGlsLmlzUmVnRXhwKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuc291cmNlID09PSBleHBlY3RlZC5zb3VyY2UgJiZcbiAgICAgICAgICAgYWN0dWFsLmdsb2JhbCA9PT0gZXhwZWN0ZWQuZ2xvYmFsICYmXG4gICAgICAgICAgIGFjdHVhbC5tdWx0aWxpbmUgPT09IGV4cGVjdGVkLm11bHRpbGluZSAmJlxuICAgICAgICAgICBhY3R1YWwubGFzdEluZGV4ID09PSBleHBlY3RlZC5sYXN0SW5kZXggJiZcbiAgICAgICAgICAgYWN0dWFsLmlnbm9yZUNhc2UgPT09IGV4cGVjdGVkLmlnbm9yZUNhc2U7XG5cbiAgLy8gNy40LiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKCF1dGlsLmlzT2JqZWN0KGFjdHVhbCkgJiYgIXV0aWwuaXNPYmplY3QoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyA3LjUgRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2Uge1xuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiKSB7XG4gIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKGEpIHx8IHV0aWwuaXNOdWxsT3JVbmRlZmluZWQoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuXG4gIGlmIChhLnByb3RvdHlwZSAhPT0gYi5wcm90b3R5cGUpIHJldHVybiBmYWxzZTtcbiAgLy9+fn5JJ3ZlIG1hbmFnZWQgdG8gYnJlYWsgT2JqZWN0LmtleXMgdGhyb3VnaCBzY3Jld3kgYXJndW1lbnRzIHBhc3NpbmcuXG4gIC8vICAgQ29udmVydGluZyB0byBhcnJheSBzb2x2ZXMgdGhlIHByb2JsZW0uXG4gIGlmIChpc0FyZ3VtZW50cyhhKSkge1xuICAgIGlmICghaXNBcmd1bWVudHMoYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gX2RlZXBFcXVhbChhLCBiKTtcbiAgfVxuICB0cnkge1xuICAgIHZhciBrYSA9IG9iamVjdEtleXMoYSksXG4gICAgICAgIGtiID0gb2JqZWN0S2V5cyhiKSxcbiAgICAgICAga2V5LCBpO1xuICB9IGNhdGNoIChlKSB7Ly9oYXBwZW5zIHdoZW4gb25lIGlzIGEgc3RyaW5nIGxpdGVyYWwgYW5kIHRoZSBvdGhlciBpc24ndFxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFfZGVlcEVxdWFsKGFba2V5XSwgYltrZXldKSkgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyA4LiBUaGUgbm9uLWVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBmb3IgYW55IGRlZXAgaW5lcXVhbGl0eS5cbi8vIGFzc2VydC5ub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gbm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwRXF1YWwnLCBhc3NlcnQubm90RGVlcEVxdWFsKTtcbiAgfVxufTtcblxuLy8gOS4gVGhlIHN0cmljdCBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc3RyaWN0IGVxdWFsaXR5LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbi8vIGFzc2VydC5zdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5zdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PT0nLCBhc3NlcnQuc3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG4vLyAxMC4gVGhlIHN0cmljdCBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciBzdHJpY3QgaW5lcXVhbGl0eSwgYXNcbi8vIGRldGVybWluZWQgYnkgIT09LiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gbm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9PScsIGFzc2VydC5ub3RTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChleHBlY3RlZCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQudGVzdChhY3R1YWwpO1xuICB9IGVsc2UgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoZXhwZWN0ZWQuY2FsbCh7fSwgYWN0dWFsKSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgdmFyIGFjdHVhbDtcblxuICBpZiAodXRpbC5pc1N0cmluZyhleHBlY3RlZCkpIHtcbiAgICBtZXNzYWdlID0gZXhwZWN0ZWQ7XG4gICAgZXhwZWN0ZWQgPSBudWxsO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBibG9jaygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgYWN0dWFsID0gZTtcbiAgfVxuXG4gIG1lc3NhZ2UgPSAoZXhwZWN0ZWQgJiYgZXhwZWN0ZWQubmFtZSA/ICcgKCcgKyBleHBlY3RlZC5uYW1lICsgJykuJyA6ICcuJykgK1xuICAgICAgICAgICAgKG1lc3NhZ2UgPyAnICcgKyBtZXNzYWdlIDogJy4nKTtcblxuICBpZiAoc2hvdWxkVGhyb3cgJiYgIWFjdHVhbCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ01pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKCFzaG91bGRUaHJvdyAmJiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ0dvdCB1bndhbnRlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoKHNob3VsZFRocm93ICYmIGFjdHVhbCAmJiBleHBlY3RlZCAmJlxuICAgICAgIWV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fCAoIXNob3VsZFRocm93ICYmIGFjdHVhbCkpIHtcbiAgICB0aHJvdyBhY3R1YWw7XG4gIH1cbn1cblxuLy8gMTEuIEV4cGVjdGVkIHRvIHRocm93IGFuIGVycm9yOlxuLy8gYXNzZXJ0LnRocm93cyhibG9jaywgRXJyb3Jfb3B0LCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC50aHJvd3MgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cy5hcHBseSh0aGlzLCBbdHJ1ZV0uY29uY2F0KHBTbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbi8vIEVYVEVOU0lPTiEgVGhpcyBpcyBhbm5veWluZyB0byB3cml0ZSBvdXRzaWRlIHRoaXMgbW9kdWxlLlxuYXNzZXJ0LmRvZXNOb3RUaHJvdyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MuYXBwbHkodGhpcywgW2ZhbHNlXS5jb25jYXQocFNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xufTtcblxuYXNzZXJ0LmlmRXJyb3IgPSBmdW5jdGlvbihlcnIpIHsgaWYgKGVycikge3Rocm93IGVycjt9fTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4ga2V5cztcbn07XG4iLCIvKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbnZhciBiYXNlNjQgPSByZXF1aXJlKCdiYXNlNjQtanMnKVxudmFyIGllZWU3NTQgPSByZXF1aXJlKCdpZWVlNzU0JylcblxuZXhwb3J0cy5CdWZmZXIgPSBCdWZmZXJcbmV4cG9ydHMuU2xvd0J1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5JTlNQRUNUX01BWF9CWVRFUyA9IDUwXG5CdWZmZXIucG9vbFNpemUgPSA4MTkyXG5cbi8qKlxuICogSWYgYEJ1ZmZlci5fdXNlVHlwZWRBcnJheXNgOlxuICogICA9PT0gdHJ1ZSAgICBVc2UgVWludDhBcnJheSBpbXBsZW1lbnRhdGlvbiAoZmFzdGVzdClcbiAqICAgPT09IGZhbHNlICAgVXNlIE9iamVjdCBpbXBsZW1lbnRhdGlvbiAoY29tcGF0aWJsZSBkb3duIHRvIElFNilcbiAqL1xuQnVmZmVyLl91c2VUeXBlZEFycmF5cyA9IChmdW5jdGlvbiAoKSB7XG4gIC8vIERldGVjdCBpZiBicm93c2VyIHN1cHBvcnRzIFR5cGVkIEFycmF5cy4gU3VwcG9ydGVkIGJyb3dzZXJzIGFyZSBJRSAxMCssIEZpcmVmb3ggNCssXG4gIC8vIENocm9tZSA3KywgU2FmYXJpIDUuMSssIE9wZXJhIDExLjYrLCBpT1MgNC4yKy4gSWYgdGhlIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBhZGRpbmdcbiAgLy8gcHJvcGVydGllcyB0byBgVWludDhBcnJheWAgaW5zdGFuY2VzLCB0aGVuIHRoYXQncyB0aGUgc2FtZSBhcyBubyBgVWludDhBcnJheWAgc3VwcG9ydFxuICAvLyBiZWNhdXNlIHdlIG5lZWQgdG8gYmUgYWJsZSB0byBhZGQgYWxsIHRoZSBub2RlIEJ1ZmZlciBBUEkgbWV0aG9kcy4gVGhpcyBpcyBhbiBpc3N1ZVxuICAvLyBpbiBGaXJlZm94IDQtMjkuIE5vdyBmaXhlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9Njk1NDM4XG4gIHRyeSB7XG4gICAgdmFyIGJ1ZiA9IG5ldyBBcnJheUJ1ZmZlcigwKVxuICAgIHZhciBhcnIgPSBuZXcgVWludDhBcnJheShidWYpXG4gICAgYXJyLmZvbyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDQyIH1cbiAgICByZXR1cm4gNDIgPT09IGFyci5mb28oKSAmJlxuICAgICAgICB0eXBlb2YgYXJyLnN1YmFycmF5ID09PSAnZnVuY3Rpb24nIC8vIENocm9tZSA5LTEwIGxhY2sgYHN1YmFycmF5YFxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cbn0pKClcblxuLyoqXG4gKiBDbGFzczogQnVmZmVyXG4gKiA9PT09PT09PT09PT09XG4gKlxuICogVGhlIEJ1ZmZlciBjb25zdHJ1Y3RvciByZXR1cm5zIGluc3RhbmNlcyBvZiBgVWludDhBcnJheWAgdGhhdCBhcmUgYXVnbWVudGVkXG4gKiB3aXRoIGZ1bmN0aW9uIHByb3BlcnRpZXMgZm9yIGFsbCB0aGUgbm9kZSBgQnVmZmVyYCBBUEkgZnVuY3Rpb25zLiBXZSB1c2VcbiAqIGBVaW50OEFycmF5YCBzbyB0aGF0IHNxdWFyZSBicmFja2V0IG5vdGF0aW9uIHdvcmtzIGFzIGV4cGVjdGVkIC0tIGl0IHJldHVybnNcbiAqIGEgc2luZ2xlIG9jdGV0LlxuICpcbiAqIEJ5IGF1Z21lbnRpbmcgdGhlIGluc3RhbmNlcywgd2UgY2FuIGF2b2lkIG1vZGlmeWluZyB0aGUgYFVpbnQ4QXJyYXlgXG4gKiBwcm90b3R5cGUuXG4gKi9cbmZ1bmN0aW9uIEJ1ZmZlciAoc3ViamVjdCwgZW5jb2RpbmcsIG5vWmVybykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQnVmZmVyKSlcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcihzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKVxuXG4gIHZhciB0eXBlID0gdHlwZW9mIHN1YmplY3RcblxuICAvLyBXb3JrYXJvdW5kOiBub2RlJ3MgYmFzZTY0IGltcGxlbWVudGF0aW9uIGFsbG93cyBmb3Igbm9uLXBhZGRlZCBzdHJpbmdzXG4gIC8vIHdoaWxlIGJhc2U2NC1qcyBkb2VzIG5vdC5cbiAgaWYgKGVuY29kaW5nID09PSAnYmFzZTY0JyAmJiB0eXBlID09PSAnc3RyaW5nJykge1xuICAgIHN1YmplY3QgPSBzdHJpbmd0cmltKHN1YmplY3QpXG4gICAgd2hpbGUgKHN1YmplY3QubGVuZ3RoICUgNCAhPT0gMCkge1xuICAgICAgc3ViamVjdCA9IHN1YmplY3QgKyAnPSdcbiAgICB9XG4gIH1cblxuICAvLyBGaW5kIHRoZSBsZW5ndGhcbiAgdmFyIGxlbmd0aFxuICBpZiAodHlwZSA9PT0gJ251bWJlcicpXG4gICAgbGVuZ3RoID0gY29lcmNlKHN1YmplY3QpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKVxuICAgIGxlbmd0aCA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHN1YmplY3QsIGVuY29kaW5nKVxuICBlbHNlIGlmICh0eXBlID09PSAnb2JqZWN0JylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdC5sZW5ndGgpIC8vIGFzc3VtZSB0aGF0IG9iamVjdCBpcyBhcnJheS1saWtlXG4gIGVsc2VcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZpcnN0IGFyZ3VtZW50IG5lZWRzIHRvIGJlIGEgbnVtYmVyLCBhcnJheSBvciBzdHJpbmcuJylcblxuICB2YXIgYnVmXG4gIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgLy8gUHJlZmVycmVkOiBSZXR1cm4gYW4gYXVnbWVudGVkIGBVaW50OEFycmF5YCBpbnN0YW5jZSBmb3IgYmVzdCBwZXJmb3JtYW5jZVxuICAgIGJ1ZiA9IEJ1ZmZlci5fYXVnbWVudChuZXcgVWludDhBcnJheShsZW5ndGgpKVxuICB9IGVsc2Uge1xuICAgIC8vIEZhbGxiYWNrOiBSZXR1cm4gVEhJUyBpbnN0YW5jZSBvZiBCdWZmZXIgKGNyZWF0ZWQgYnkgYG5ld2ApXG4gICAgYnVmID0gdGhpc1xuICAgIGJ1Zi5sZW5ndGggPSBsZW5ndGhcbiAgICBidWYuX2lzQnVmZmVyID0gdHJ1ZVxuICB9XG5cbiAgdmFyIGlcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMgJiYgdHlwZW9mIHN1YmplY3QuYnl0ZUxlbmd0aCA9PT0gJ251bWJlcicpIHtcbiAgICAvLyBTcGVlZCBvcHRpbWl6YXRpb24gLS0gdXNlIHNldCBpZiB3ZSdyZSBjb3B5aW5nIGZyb20gYSB0eXBlZCBhcnJheVxuICAgIGJ1Zi5fc2V0KHN1YmplY3QpXG4gIH0gZWxzZSBpZiAoaXNBcnJheWlzaChzdWJqZWN0KSkge1xuICAgIC8vIFRyZWF0IGFycmF5LWlzaCBvYmplY3RzIGFzIGEgYnl0ZSBhcnJheVxuICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSlcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdC5yZWFkVUludDgoaSlcbiAgICAgIGVsc2VcbiAgICAgICAgYnVmW2ldID0gc3ViamVjdFtpXVxuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlID09PSAnc3RyaW5nJykge1xuICAgIGJ1Zi53cml0ZShzdWJqZWN0LCAwLCBlbmNvZGluZylcbiAgfSBlbHNlIGlmICh0eXBlID09PSAnbnVtYmVyJyAmJiAhQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiAhbm9aZXJvKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBidWZbaV0gPSAwXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGJ1ZlxufVxuXG4vLyBTVEFUSUMgTUVUSE9EU1xuLy8gPT09PT09PT09PT09PT1cblxuQnVmZmVyLmlzRW5jb2RpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcpIHtcbiAgc3dpdGNoIChTdHJpbmcoZW5jb2RpbmcpLnRvTG93ZXJDYXNlKCkpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgY2FzZSAnYmluYXJ5JzpcbiAgICBjYXNlICdiYXNlNjQnOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldHVybiB0cnVlXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiBmYWxzZVxuICB9XG59XG5cbkJ1ZmZlci5pc0J1ZmZlciA9IGZ1bmN0aW9uIChiKSB7XG4gIHJldHVybiAhIShiICE9PSBudWxsICYmIGIgIT09IHVuZGVmaW5lZCAmJiBiLl9pc0J1ZmZlcilcbn1cblxuQnVmZmVyLmJ5dGVMZW5ndGggPSBmdW5jdGlvbiAoc3RyLCBlbmNvZGluZykge1xuICB2YXIgcmV0XG4gIHN0ciA9IHN0ciArICcnXG4gIHN3aXRjaCAoZW5jb2RpbmcgfHwgJ3V0ZjgnKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggLyAyXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3V0ZjgnOlxuICAgIGNhc2UgJ3V0Zi04JzpcbiAgICAgIHJldCA9IHV0ZjhUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ3Jhdyc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBiYXNlNjRUb0J5dGVzKHN0cikubGVuZ3RoXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3VjczInOlxuICAgIGNhc2UgJ3Vjcy0yJzpcbiAgICBjYXNlICd1dGYxNmxlJzpcbiAgICBjYXNlICd1dGYtMTZsZSc6XG4gICAgICByZXQgPSBzdHIubGVuZ3RoICogMlxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5jb25jYXQgPSBmdW5jdGlvbiAobGlzdCwgdG90YWxMZW5ndGgpIHtcbiAgYXNzZXJ0KGlzQXJyYXkobGlzdCksICdVc2FnZTogQnVmZmVyLmNvbmNhdChsaXN0LCBbdG90YWxMZW5ndGhdKVxcbicgK1xuICAgICAgJ2xpc3Qgc2hvdWxkIGJlIGFuIEFycmF5LicpXG5cbiAgaWYgKGxpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIoMClcbiAgfSBlbHNlIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgIHJldHVybiBsaXN0WzBdXG4gIH1cblxuICB2YXIgaVxuICBpZiAodHlwZW9mIHRvdGFsTGVuZ3RoICE9PSAnbnVtYmVyJykge1xuICAgIHRvdGFsTGVuZ3RoID0gMFxuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICB0b3RhbExlbmd0aCArPSBsaXN0W2ldLmxlbmd0aFxuICAgIH1cbiAgfVxuXG4gIHZhciBidWYgPSBuZXcgQnVmZmVyKHRvdGFsTGVuZ3RoKVxuICB2YXIgcG9zID0gMFxuICBmb3IgKGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXVxuICAgIGl0ZW0uY29weShidWYsIHBvcylcbiAgICBwb3MgKz0gaXRlbS5sZW5ndGhcbiAgfVxuICByZXR1cm4gYnVmXG59XG5cbi8vIEJVRkZFUiBJTlNUQU5DRSBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBfaGV4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSBidWYubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cblxuICAvLyBtdXN0IGJlIGFuIGV2ZW4gbnVtYmVyIG9mIGRpZ2l0c1xuICB2YXIgc3RyTGVuID0gc3RyaW5nLmxlbmd0aFxuICBhc3NlcnQoc3RyTGVuICUgMiA9PT0gMCwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG5cbiAgaWYgKGxlbmd0aCA+IHN0ckxlbiAvIDIpIHtcbiAgICBsZW5ndGggPSBzdHJMZW4gLyAyXG4gIH1cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBieXRlID0gcGFyc2VJbnQoc3RyaW5nLnN1YnN0cihpICogMiwgMiksIDE2KVxuICAgIGFzc2VydCghaXNOYU4oYnl0ZSksICdJbnZhbGlkIGhleCBzdHJpbmcnKVxuICAgIGJ1ZltvZmZzZXQgKyBpXSA9IGJ5dGVcbiAgfVxuICBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9IGkgKiAyXG4gIHJldHVybiBpXG59XG5cbmZ1bmN0aW9uIF91dGY4V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmOFRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYXNjaWlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihhc2NpaVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5mdW5jdGlvbiBfYmluYXJ5V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICByZXR1cm4gX2FzY2lpV3JpdGUoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0V3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIoYmFzZTY0VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlV3JpdGUgKGJ1Ziwgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCkge1xuICB2YXIgY2hhcnNXcml0dGVuID0gQnVmZmVyLl9jaGFyc1dyaXR0ZW4gPVxuICAgIGJsaXRCdWZmZXIodXRmMTZsZVRvQnl0ZXMoc3RyaW5nKSwgYnVmLCBvZmZzZXQsIGxlbmd0aClcbiAgcmV0dXJuIGNoYXJzV3JpdHRlblxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlID0gZnVuY3Rpb24gKHN0cmluZywgb2Zmc2V0LCBsZW5ndGgsIGVuY29kaW5nKSB7XG4gIC8vIFN1cHBvcnQgYm90aCAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpXG4gIC8vIGFuZCB0aGUgbGVnYWN5IChzdHJpbmcsIGVuY29kaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgaWYgKGlzRmluaXRlKG9mZnNldCkpIHtcbiAgICBpZiAoIWlzRmluaXRlKGxlbmd0aCkpIHtcbiAgICAgIGVuY29kaW5nID0gbGVuZ3RoXG4gICAgICBsZW5ndGggPSB1bmRlZmluZWRcbiAgICB9XG4gIH0gZWxzZSB7ICAvLyBsZWdhY3lcbiAgICB2YXIgc3dhcCA9IGVuY29kaW5nXG4gICAgZW5jb2RpbmcgPSBvZmZzZXRcbiAgICBvZmZzZXQgPSBsZW5ndGhcbiAgICBsZW5ndGggPSBzd2FwXG4gIH1cblxuICBvZmZzZXQgPSBOdW1iZXIob2Zmc2V0KSB8fCAwXG4gIHZhciByZW1haW5pbmcgPSB0aGlzLmxlbmd0aCAtIG9mZnNldFxuICBpZiAoIWxlbmd0aCkge1xuICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICB9IGVsc2Uge1xuICAgIGxlbmd0aCA9IE51bWJlcihsZW5ndGgpXG4gICAgaWYgKGxlbmd0aCA+IHJlbWFpbmluZykge1xuICAgICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gICAgfVxuICB9XG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlV3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKGVuY29kaW5nLCBzdGFydCwgZW5kKSB7XG4gIHZhciBzZWxmID0gdGhpc1xuXG4gIGVuY29kaW5nID0gU3RyaW5nKGVuY29kaW5nIHx8ICd1dGY4JykudG9Mb3dlckNhc2UoKVxuICBzdGFydCA9IE51bWJlcihzdGFydCkgfHwgMFxuICBlbmQgPSAoZW5kICE9PSB1bmRlZmluZWQpXG4gICAgPyBOdW1iZXIoZW5kKVxuICAgIDogZW5kID0gc2VsZi5sZW5ndGhcblxuICAvLyBGYXN0cGF0aCBlbXB0eSBzdHJpbmdzXG4gIGlmIChlbmQgPT09IHN0YXJ0KVxuICAgIHJldHVybiAnJ1xuXG4gIHZhciByZXRcbiAgc3dpdGNoIChlbmNvZGluZykge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgICByZXQgPSBfaGV4U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gX3V0ZjhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdhc2NpaSc6XG4gICAgICByZXQgPSBfYXNjaWlTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICdiaW5hcnknOlxuICAgICAgcmV0ID0gX2JpbmFyeVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgICByZXQgPSBfYmFzZTY0U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IF91dGYxNmxlU2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBFcnJvcignVW5rbm93biBlbmNvZGluZycpXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiAnQnVmZmVyJyxcbiAgICBkYXRhOiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCh0aGlzLl9hcnIgfHwgdGhpcywgMClcbiAgfVxufVxuXG4vLyBjb3B5KHRhcmdldEJ1ZmZlciwgdGFyZ2V0U3RhcnQ9MCwgc291cmNlU3RhcnQ9MCwgc291cmNlRW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmNvcHkgPSBmdW5jdGlvbiAodGFyZ2V0LCB0YXJnZXRfc3RhcnQsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNvdXJjZSA9IHRoaXNcblxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgJiYgZW5kICE9PSAwKSBlbmQgPSB0aGlzLmxlbmd0aFxuICBpZiAoIXRhcmdldF9zdGFydCkgdGFyZ2V0X3N0YXJ0ID0gMFxuXG4gIC8vIENvcHkgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0YXJnZXQubGVuZ3RoID09PSAwIHx8IHNvdXJjZS5sZW5ndGggPT09IDApIHJldHVyblxuXG4gIC8vIEZhdGFsIGVycm9yIGNvbmRpdGlvbnNcbiAgYXNzZXJ0KGVuZCA+PSBzdGFydCwgJ3NvdXJjZUVuZCA8IHNvdXJjZVN0YXJ0JylcbiAgYXNzZXJ0KHRhcmdldF9zdGFydCA+PSAwICYmIHRhcmdldF9zdGFydCA8IHRhcmdldC5sZW5ndGgsXG4gICAgICAndGFyZ2V0U3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChzdGFydCA+PSAwICYmIHN0YXJ0IDwgc291cmNlLmxlbmd0aCwgJ3NvdXJjZVN0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHNvdXJjZS5sZW5ndGgsICdzb3VyY2VFbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgLy8gQXJlIHdlIG9vYj9cbiAgaWYgKGVuZCA+IHRoaXMubGVuZ3RoKVxuICAgIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICh0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0IDwgZW5kIC0gc3RhcnQpXG4gICAgZW5kID0gdGFyZ2V0Lmxlbmd0aCAtIHRhcmdldF9zdGFydCArIHN0YXJ0XG5cbiAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0XG5cbiAgaWYgKGxlbiA8IDEwMCB8fCAhQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICB0YXJnZXRbaSArIHRhcmdldF9zdGFydF0gPSB0aGlzW2kgKyBzdGFydF1cbiAgfSBlbHNlIHtcbiAgICB0YXJnZXQuX3NldCh0aGlzLnN1YmFycmF5KHN0YXJ0LCBzdGFydCArIGxlbiksIHRhcmdldF9zdGFydClcbiAgfVxufVxuXG5mdW5jdGlvbiBfYmFzZTY0U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICBpZiAoc3RhcnQgPT09IDAgJiYgZW5kID09PSBidWYubGVuZ3RoKSB7XG4gICAgcmV0dXJuIGJhc2U2NC5mcm9tQnl0ZUFycmF5KGJ1ZilcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmLnNsaWNlKHN0YXJ0LCBlbmQpKVxuICB9XG59XG5cbmZ1bmN0aW9uIF91dGY4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmVzID0gJydcbiAgdmFyIHRtcCA9ICcnXG4gIGVuZCA9IE1hdGgubWluKGJ1Zi5sZW5ndGgsIGVuZClcblxuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIGlmIChidWZbaV0gPD0gMHg3Rikge1xuICAgICAgcmVzICs9IGRlY29kZVV0ZjhDaGFyKHRtcCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgICAgIHRtcCA9ICcnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRtcCArPSAnJScgKyBidWZbaV0udG9TdHJpbmcoMTYpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcyArIGRlY29kZVV0ZjhDaGFyKHRtcClcbn1cblxuZnVuY3Rpb24gX2FzY2lpU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgcmV0ID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKVxuICAgIHJldCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGJ1ZltpXSlcbiAgcmV0dXJuIHJldFxufVxuXG5mdW5jdGlvbiBfYmluYXJ5U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICByZXR1cm4gX2FzY2lpU2xpY2UoYnVmLCBzdGFydCwgZW5kKVxufVxuXG5mdW5jdGlvbiBfaGV4U2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuXG4gIGlmICghc3RhcnQgfHwgc3RhcnQgPCAwKSBzdGFydCA9IDBcbiAgaWYgKCFlbmQgfHwgZW5kIDwgMCB8fCBlbmQgPiBsZW4pIGVuZCA9IGxlblxuXG4gIHZhciBvdXQgPSAnJ1xuICBmb3IgKHZhciBpID0gc3RhcnQ7IGkgPCBlbmQ7IGkrKykge1xuICAgIG91dCArPSB0b0hleChidWZbaV0pXG4gIH1cbiAgcmV0dXJuIG91dFxufVxuXG5mdW5jdGlvbiBfdXRmMTZsZVNsaWNlIChidWYsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGJ5dGVzID0gYnVmLnNsaWNlKHN0YXJ0LCBlbmQpXG4gIHZhciByZXMgPSAnJ1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgcmVzICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnl0ZXNbaV0gKyBieXRlc1tpKzFdICogMjU2KVxuICB9XG4gIHJldHVybiByZXNcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSB0aGlzLmxlbmd0aFxuICBzdGFydCA9IGNsYW1wKHN0YXJ0LCBsZW4sIDApXG4gIGVuZCA9IGNsYW1wKGVuZCwgbGVuLCBsZW4pXG5cbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICByZXR1cm4gQnVmZmVyLl9hdWdtZW50KHRoaXMuc3ViYXJyYXkoc3RhcnQsIGVuZCkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIHNsaWNlTGVuID0gZW5kIC0gc3RhcnRcbiAgICB2YXIgbmV3QnVmID0gbmV3IEJ1ZmZlcihzbGljZUxlbiwgdW5kZWZpbmVkLCB0cnVlKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2xpY2VMZW47IGkrKykge1xuICAgICAgbmV3QnVmW2ldID0gdGhpc1tpICsgc3RhcnRdXG4gICAgfVxuICAgIHJldHVybiBuZXdCdWZcbiAgfVxufVxuXG4vLyBgZ2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAob2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuZ2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy5yZWFkVUludDgob2Zmc2V0KVxufVxuXG4vLyBgc2V0YCB3aWxsIGJlIHJlbW92ZWQgaW4gTm9kZSAwLjEzK1xuQnVmZmVyLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAodiwgb2Zmc2V0KSB7XG4gIGNvbnNvbGUubG9nKCcuc2V0KCkgaXMgZGVwcmVjYXRlZC4gQWNjZXNzIHVzaW5nIGFycmF5IGluZGV4ZXMgaW5zdGVhZC4nKVxuICByZXR1cm4gdGhpcy53cml0ZVVJbnQ4KHYsIG9mZnNldClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHJldHVybiB0aGlzW29mZnNldF1cbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gIH0gZWxzZSB7XG4gICAgdmFsID0gYnVmW29mZnNldF0gPDwgOFxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MTYodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkVUludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbFxuICBpZiAobGl0dGxlRW5kaWFuKSB7XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgPSBidWZbb2Zmc2V0ICsgMl0gPDwgMTZcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgMV0gPDwgOFxuICAgIHZhbCB8PSBidWZbb2Zmc2V0XVxuICAgIGlmIChvZmZzZXQgKyAzIDwgbGVuKVxuICAgICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXQgKyAzXSA8PCAyNCA+Pj4gMClcbiAgfSBlbHNlIHtcbiAgICBpZiAob2Zmc2V0ICsgMSA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAxXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAyIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAyXSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDNdXG4gICAgdmFsID0gdmFsICsgKGJ1ZltvZmZzZXRdIDw8IDI0ID4+PiAwKVxuICB9XG4gIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyTEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkVUludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRVSW50MzIodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDggPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCxcbiAgICAgICAgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIHZhciBuZWcgPSB0aGlzW29mZnNldF0gJiAweDgwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmIC0gdGhpc1tvZmZzZXRdICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDE2IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDE2KGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDE2QkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRJbnQzMiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWwgPSBfcmVhZFVJbnQzMihidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCB0cnVlKVxuICB2YXIgbmVnID0gdmFsICYgMHg4MDAwMDAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmZmZmZiAtIHZhbCArIDEpICogLTFcbiAgZWxzZVxuICAgIHJldHVybiB2YWxcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEludDMyQkUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRGbG9hdCAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdExFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkRmxvYXRCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEZsb2F0KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZERvdWJsZSAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICByZXR1cm4gaWVlZTc1NC5yZWFkKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWREb3VibGVCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZERvdWJsZSh0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQ4ID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCA8IHRoaXMubGVuZ3RoLCAndHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnVpbnQodmFsdWUsIDB4ZmYpXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKSByZXR1cm5cblxuICB0aGlzW29mZnNldF0gPSB2YWx1ZVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MTYgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDIpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlICYgKDB4ZmYgPDwgKDggKiAobGl0dGxlRW5kaWFuID8gaSA6IDEgLSBpKSkpKSA+Pj5cbiAgICAgICAgICAgIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpICogOFxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVVSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZmZmZmZmZilcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGZvciAodmFyIGkgPSAwLCBqID0gTWF0aC5taW4obGVuIC0gb2Zmc2V0LCA0KTsgaSA8IGo7IGkrKykge1xuICAgIGJ1ZltvZmZzZXQgKyBpXSA9XG4gICAgICAgICh2YWx1ZSA+Pj4gKGxpdHRsZUVuZGlhbiA/IGkgOiAzIC0gaSkgKiA4KSAmIDB4ZmZcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlVUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZiwgLTB4ODApXG4gIH1cblxuICBpZiAob2Zmc2V0ID49IHRoaXMubGVuZ3RoKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIHRoaXMud3JpdGVVSW50OCh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydClcbiAgZWxzZVxuICAgIHRoaXMud3JpdGVVSW50OCgweGZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmZmYsIC0weDgwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MTYoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDE2KGJ1ZiwgMHhmZmZmICsgdmFsdWUgKyAxLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MTZCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDMyIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZmZmZmYsIC0weDgwMDAwMDAwKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbiAgZWxzZVxuICAgIF93cml0ZVVJbnQzMihidWYsIDB4ZmZmZmZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQzMkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDMyKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRmxvYXQgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMy40MDI4MjM0NjYzODUyODg2ZSszOCwgLTMuNDAyODIzNDY2Mzg1Mjg4NmUrMzgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCAyMywgNClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVGbG9hdEJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUZsb2F0KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlRG91YmxlIChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDcgPCBidWYubGVuZ3RoLFxuICAgICAgICAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZklFRUU3NTQodmFsdWUsIDEuNzk3NjkzMTM0ODYyMzE1N0UrMzA4LCAtMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZWVlNzU0LndyaXRlKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCA1MiwgOClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZURvdWJsZUJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZURvdWJsZSh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbi8vIGZpbGwodmFsdWUsIHN0YXJ0PTAsIGVuZD1idWZmZXIubGVuZ3RoKVxuQnVmZmVyLnByb3RvdHlwZS5maWxsID0gZnVuY3Rpb24gKHZhbHVlLCBzdGFydCwgZW5kKSB7XG4gIGlmICghdmFsdWUpIHZhbHVlID0gMFxuICBpZiAoIXN0YXJ0KSBzdGFydCA9IDBcbiAgaWYgKCFlbmQpIGVuZCA9IHRoaXMubGVuZ3RoXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICB2YWx1ZSA9IHZhbHVlLmNoYXJDb2RlQXQoMClcbiAgfVxuXG4gIGFzc2VydCh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInICYmICFpc05hTih2YWx1ZSksICd2YWx1ZSBpcyBub3QgYSBudW1iZXInKVxuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnZW5kIDwgc3RhcnQnKVxuXG4gIC8vIEZpbGwgMCBieXRlczsgd2UncmUgZG9uZVxuICBpZiAoZW5kID09PSBzdGFydCkgcmV0dXJuXG4gIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCB0aGlzLmxlbmd0aCwgJ3N0YXJ0IG91dCBvZiBib3VuZHMnKVxuICBhc3NlcnQoZW5kID49IDAgJiYgZW5kIDw9IHRoaXMubGVuZ3RoLCAnZW5kIG91dCBvZiBib3VuZHMnKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgdGhpc1tpXSA9IHZhbHVlXG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS5pbnNwZWN0ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgb3V0ID0gW11cbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBvdXRbaV0gPSB0b0hleCh0aGlzW2ldKVxuICAgIGlmIChpID09PSBleHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTKSB7XG4gICAgICBvdXRbaSArIDFdID0gJy4uLidcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHJldHVybiAnPEJ1ZmZlciAnICsgb3V0LmpvaW4oJyAnKSArICc+J1xufVxuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgYEFycmF5QnVmZmVyYCB3aXRoIHRoZSAqY29waWVkKiBtZW1vcnkgb2YgdGhlIGJ1ZmZlciBpbnN0YW5jZS5cbiAqIEFkZGVkIGluIE5vZGUgMC4xMi4gT25seSBhdmFpbGFibGUgaW4gYnJvd3NlcnMgdGhhdCBzdXBwb3J0IEFycmF5QnVmZmVyLlxuICovXG5CdWZmZXIucHJvdG90eXBlLnRvQXJyYXlCdWZmZXIgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgICAgcmV0dXJuIChuZXcgQnVmZmVyKHRoaXMpKS5idWZmZXJcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGJ1ZiA9IG5ldyBVaW50OEFycmF5KHRoaXMubGVuZ3RoKVxuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGJ1Zi5sZW5ndGg7IGkgPCBsZW47IGkgKz0gMSlcbiAgICAgICAgYnVmW2ldID0gdGhpc1tpXVxuICAgICAgcmV0dXJuIGJ1Zi5idWZmZXJcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdCdWZmZXIudG9BcnJheUJ1ZmZlciBub3Qgc3VwcG9ydGVkIGluIHRoaXMgYnJvd3NlcicpXG4gIH1cbn1cblxuLy8gSEVMUEVSIEZVTkNUSU9OU1xuLy8gPT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBzdHJpbmd0cmltIChzdHIpIHtcbiAgaWYgKHN0ci50cmltKSByZXR1cm4gc3RyLnRyaW0oKVxuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMrfFxccyskL2csICcnKVxufVxuXG52YXIgQlAgPSBCdWZmZXIucHJvdG90eXBlXG5cbi8qKlxuICogQXVnbWVudCBhIFVpbnQ4QXJyYXkgKmluc3RhbmNlKiAobm90IHRoZSBVaW50OEFycmF5IGNsYXNzISkgd2l0aCBCdWZmZXIgbWV0aG9kc1xuICovXG5CdWZmZXIuX2F1Z21lbnQgPSBmdW5jdGlvbiAoYXJyKSB7XG4gIGFyci5faXNCdWZmZXIgPSB0cnVlXG5cbiAgLy8gc2F2ZSByZWZlcmVuY2UgdG8gb3JpZ2luYWwgVWludDhBcnJheSBnZXQvc2V0IG1ldGhvZHMgYmVmb3JlIG92ZXJ3cml0aW5nXG4gIGFyci5fZ2V0ID0gYXJyLmdldFxuICBhcnIuX3NldCA9IGFyci5zZXRcblxuICAvLyBkZXByZWNhdGVkLCB3aWxsIGJlIHJlbW92ZWQgaW4gbm9kZSAwLjEzK1xuICBhcnIuZ2V0ID0gQlAuZ2V0XG4gIGFyci5zZXQgPSBCUC5zZXRcblxuICBhcnIud3JpdGUgPSBCUC53cml0ZVxuICBhcnIudG9TdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9Mb2NhbGVTdHJpbmcgPSBCUC50b1N0cmluZ1xuICBhcnIudG9KU09OID0gQlAudG9KU09OXG4gIGFyci5jb3B5ID0gQlAuY29weVxuICBhcnIuc2xpY2UgPSBCUC5zbGljZVxuICBhcnIucmVhZFVJbnQ4ID0gQlAucmVhZFVJbnQ4XG4gIGFyci5yZWFkVUludDE2TEUgPSBCUC5yZWFkVUludDE2TEVcbiAgYXJyLnJlYWRVSW50MTZCRSA9IEJQLnJlYWRVSW50MTZCRVxuICBhcnIucmVhZFVJbnQzMkxFID0gQlAucmVhZFVJbnQzMkxFXG4gIGFyci5yZWFkVUludDMyQkUgPSBCUC5yZWFkVUludDMyQkVcbiAgYXJyLnJlYWRJbnQ4ID0gQlAucmVhZEludDhcbiAgYXJyLnJlYWRJbnQxNkxFID0gQlAucmVhZEludDE2TEVcbiAgYXJyLnJlYWRJbnQxNkJFID0gQlAucmVhZEludDE2QkVcbiAgYXJyLnJlYWRJbnQzMkxFID0gQlAucmVhZEludDMyTEVcbiAgYXJyLnJlYWRJbnQzMkJFID0gQlAucmVhZEludDMyQkVcbiAgYXJyLnJlYWRGbG9hdExFID0gQlAucmVhZEZsb2F0TEVcbiAgYXJyLnJlYWRGbG9hdEJFID0gQlAucmVhZEZsb2F0QkVcbiAgYXJyLnJlYWREb3VibGVMRSA9IEJQLnJlYWREb3VibGVMRVxuICBhcnIucmVhZERvdWJsZUJFID0gQlAucmVhZERvdWJsZUJFXG4gIGFyci53cml0ZVVJbnQ4ID0gQlAud3JpdGVVSW50OFxuICBhcnIud3JpdGVVSW50MTZMRSA9IEJQLndyaXRlVUludDE2TEVcbiAgYXJyLndyaXRlVUludDE2QkUgPSBCUC53cml0ZVVJbnQxNkJFXG4gIGFyci53cml0ZVVJbnQzMkxFID0gQlAud3JpdGVVSW50MzJMRVxuICBhcnIud3JpdGVVSW50MzJCRSA9IEJQLndyaXRlVUludDMyQkVcbiAgYXJyLndyaXRlSW50OCA9IEJQLndyaXRlSW50OFxuICBhcnIud3JpdGVJbnQxNkxFID0gQlAud3JpdGVJbnQxNkxFXG4gIGFyci53cml0ZUludDE2QkUgPSBCUC53cml0ZUludDE2QkVcbiAgYXJyLndyaXRlSW50MzJMRSA9IEJQLndyaXRlSW50MzJMRVxuICBhcnIud3JpdGVJbnQzMkJFID0gQlAud3JpdGVJbnQzMkJFXG4gIGFyci53cml0ZUZsb2F0TEUgPSBCUC53cml0ZUZsb2F0TEVcbiAgYXJyLndyaXRlRmxvYXRCRSA9IEJQLndyaXRlRmxvYXRCRVxuICBhcnIud3JpdGVEb3VibGVMRSA9IEJQLndyaXRlRG91YmxlTEVcbiAgYXJyLndyaXRlRG91YmxlQkUgPSBCUC53cml0ZURvdWJsZUJFXG4gIGFyci5maWxsID0gQlAuZmlsbFxuICBhcnIuaW5zcGVjdCA9IEJQLmluc3BlY3RcbiAgYXJyLnRvQXJyYXlCdWZmZXIgPSBCUC50b0FycmF5QnVmZmVyXG5cbiAgcmV0dXJuIGFyclxufVxuXG4vLyBzbGljZShzdGFydCwgZW5kKVxuZnVuY3Rpb24gY2xhbXAgKGluZGV4LCBsZW4sIGRlZmF1bHRWYWx1ZSkge1xuICBpZiAodHlwZW9mIGluZGV4ICE9PSAnbnVtYmVyJykgcmV0dXJuIGRlZmF1bHRWYWx1ZVxuICBpbmRleCA9IH5+aW5kZXg7ICAvLyBDb2VyY2UgdG8gaW50ZWdlci5cbiAgaWYgKGluZGV4ID49IGxlbikgcmV0dXJuIGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIGluZGV4ICs9IGxlblxuICBpZiAoaW5kZXggPj0gMCkgcmV0dXJuIGluZGV4XG4gIHJldHVybiAwXG59XG5cbmZ1bmN0aW9uIGNvZXJjZSAobGVuZ3RoKSB7XG4gIC8vIENvZXJjZSBsZW5ndGggdG8gYSBudW1iZXIgKHBvc3NpYmx5IE5hTiksIHJvdW5kIHVwXG4gIC8vIGluIGNhc2UgaXQncyBmcmFjdGlvbmFsIChlLmcuIDEyMy40NTYpIHRoZW4gZG8gYVxuICAvLyBkb3VibGUgbmVnYXRlIHRvIGNvZXJjZSBhIE5hTiB0byAwLiBFYXN5LCByaWdodD9cbiAgbGVuZ3RoID0gfn5NYXRoLmNlaWwoK2xlbmd0aClcbiAgcmV0dXJuIGxlbmd0aCA8IDAgPyAwIDogbGVuZ3RoXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkgKHN1YmplY3QpIHtcbiAgcmV0dXJuIChBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uIChzdWJqZWN0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChzdWJqZWN0KSA9PT0gJ1tvYmplY3QgQXJyYXldJ1xuICB9KShzdWJqZWN0KVxufVxuXG5mdW5jdGlvbiBpc0FycmF5aXNoIChzdWJqZWN0KSB7XG4gIHJldHVybiBpc0FycmF5KHN1YmplY3QpIHx8IEJ1ZmZlci5pc0J1ZmZlcihzdWJqZWN0KSB8fFxuICAgICAgc3ViamVjdCAmJiB0eXBlb2Ygc3ViamVjdCA9PT0gJ29iamVjdCcgJiZcbiAgICAgIHR5cGVvZiBzdWJqZWN0Lmxlbmd0aCA9PT0gJ251bWJlcidcbn1cblxuZnVuY3Rpb24gdG9IZXggKG4pIHtcbiAgaWYgKG4gPCAxNikgcmV0dXJuICcwJyArIG4udG9TdHJpbmcoMTYpXG4gIHJldHVybiBuLnRvU3RyaW5nKDE2KVxufVxuXG5mdW5jdGlvbiB1dGY4VG9CeXRlcyAoc3RyKSB7XG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIHZhciBiID0gc3RyLmNoYXJDb2RlQXQoaSlcbiAgICBpZiAoYiA8PSAweDdGKVxuICAgICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpXG4gICAgZWxzZSB7XG4gICAgICB2YXIgc3RhcnQgPSBpXG4gICAgICBpZiAoYiA+PSAweEQ4MDAgJiYgYiA8PSAweERGRkYpIGkrK1xuICAgICAgdmFyIGggPSBlbmNvZGVVUklDb21wb25lbnQoc3RyLnNsaWNlKHN0YXJ0LCBpKzEpKS5zdWJzdHIoMSkuc3BsaXQoJyUnKVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBoLmxlbmd0aDsgaisrKVxuICAgICAgICBieXRlQXJyYXkucHVzaChwYXJzZUludChoW2pdLCAxNikpXG4gICAgfVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYXNjaWlUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gTm9kZSdzIGNvZGUgc2VlbXMgdG8gYmUgZG9pbmcgdGhpcyBhbmQgbm90ICYgMHg3Ri4uXG4gICAgYnl0ZUFycmF5LnB1c2goc3RyLmNoYXJDb2RlQXQoaSkgJiAweEZGKVxuICB9XG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gdXRmMTZsZVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYywgaGksIGxvXG4gIHZhciBieXRlQXJyYXkgPSBbXVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGMgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGhpID0gYyA+PiA4XG4gICAgbG8gPSBjICUgMjU2XG4gICAgYnl0ZUFycmF5LnB1c2gobG8pXG4gICAgYnl0ZUFycmF5LnB1c2goaGkpXG4gIH1cblxuICByZXR1cm4gYnl0ZUFycmF5XG59XG5cbmZ1bmN0aW9uIGJhc2U2NFRvQnl0ZXMgKHN0cikge1xuICByZXR1cm4gYmFzZTY0LnRvQnl0ZUFycmF5KHN0cilcbn1cblxuZnVuY3Rpb24gYmxpdEJ1ZmZlciAoc3JjLCBkc3QsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBwb3NcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmICgoaSArIG9mZnNldCA+PSBkc3QubGVuZ3RoKSB8fCAoaSA+PSBzcmMubGVuZ3RoKSlcbiAgICAgIGJyZWFrXG4gICAgZHN0W2kgKyBvZmZzZXRdID0gc3JjW2ldXG4gIH1cbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gZGVjb2RlVXRmOENoYXIgKHN0cikge1xuICB0cnkge1xuICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoc3RyKVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpIC8vIFVURiA4IGludmFsaWQgY2hhclxuICB9XG59XG5cbi8qXG4gKiBXZSBoYXZlIHRvIG1ha2Ugc3VyZSB0aGF0IHRoZSB2YWx1ZSBpcyBhIHZhbGlkIGludGVnZXIuIFRoaXMgbWVhbnMgdGhhdCBpdFxuICogaXMgbm9uLW5lZ2F0aXZlLiBJdCBoYXMgbm8gZnJhY3Rpb25hbCBjb21wb25lbnQgYW5kIHRoYXQgaXQgZG9lcyBub3RcbiAqIGV4Y2VlZCB0aGUgbWF4aW11bSBhbGxvd2VkIHZhbHVlLlxuICovXG5mdW5jdGlvbiB2ZXJpZnVpbnQgKHZhbHVlLCBtYXgpIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlID49IDAsICdzcGVjaWZpZWQgYSBuZWdhdGl2ZSB2YWx1ZSBmb3Igd3JpdGluZyBhbiB1bnNpZ25lZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA8PSBtYXgsICd2YWx1ZSBpcyBsYXJnZXIgdGhhbiBtYXhpbXVtIHZhbHVlIGZvciB0eXBlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZzaW50ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZSwgJ3ZhbHVlIGhhcyBhIGZyYWN0aW9uYWwgY29tcG9uZW50Jylcbn1cblxuZnVuY3Rpb24gdmVyaWZJRUVFNzU0ICh2YWx1ZSwgbWF4LCBtaW4pIHtcbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicsICdjYW5ub3Qgd3JpdGUgYSBub24tbnVtYmVyIGFzIGEgbnVtYmVyJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGxhcmdlciB0aGFuIG1heGltdW0gYWxsb3dlZCB2YWx1ZScpXG4gIGFzc2VydCh2YWx1ZSA+PSBtaW4sICd2YWx1ZSBzbWFsbGVyIHRoYW4gbWluaW11bSBhbGxvd2VkIHZhbHVlJylcbn1cblxuZnVuY3Rpb24gYXNzZXJ0ICh0ZXN0LCBtZXNzYWdlKSB7XG4gIGlmICghdGVzdCkgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UgfHwgJ0ZhaWxlZCBhc3NlcnRpb24nKVxufVxuIiwidmFyIGxvb2t1cCA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvJztcblxuOyhmdW5jdGlvbiAoZXhwb3J0cykge1xuXHQndXNlIHN0cmljdCc7XG5cbiAgdmFyIEFyciA9ICh0eXBlb2YgVWludDhBcnJheSAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgPyBVaW50OEFycmF5XG4gICAgOiBBcnJheVxuXG5cdHZhciBQTFVTICAgPSAnKycuY2hhckNvZGVBdCgwKVxuXHR2YXIgU0xBU0ggID0gJy8nLmNoYXJDb2RlQXQoMClcblx0dmFyIE5VTUJFUiA9ICcwJy5jaGFyQ29kZUF0KDApXG5cdHZhciBMT1dFUiAgPSAnYScuY2hhckNvZGVBdCgwKVxuXHR2YXIgVVBQRVIgID0gJ0EnLmNoYXJDb2RlQXQoMClcblxuXHRmdW5jdGlvbiBkZWNvZGUgKGVsdCkge1xuXHRcdHZhciBjb2RlID0gZWx0LmNoYXJDb2RlQXQoMClcblx0XHRpZiAoY29kZSA9PT0gUExVUylcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0gpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcbiIsImV4cG9ydHMucmVhZCA9IGZ1bmN0aW9uKGJ1ZmZlciwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sXG4gICAgICBlTGVuID0gbkJ5dGVzICogOCAtIG1MZW4gLSAxLFxuICAgICAgZU1heCA9ICgxIDw8IGVMZW4pIC0gMSxcbiAgICAgIGVCaWFzID0gZU1heCA+PiAxLFxuICAgICAgbkJpdHMgPSAtNyxcbiAgICAgIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMCxcbiAgICAgIGQgPSBpc0xFID8gLTEgOiAxLFxuICAgICAgcyA9IGJ1ZmZlcltvZmZzZXQgKyBpXTtcblxuICBpICs9IGQ7XG5cbiAgZSA9IHMgJiAoKDEgPDwgKC1uQml0cykpIC0gMSk7XG4gIHMgPj49ICgtbkJpdHMpO1xuICBuQml0cyArPSBlTGVuO1xuICBmb3IgKDsgbkJpdHMgPiAwOyBlID0gZSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KTtcblxuICBtID0gZSAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKTtcbiAgZSA+Pj0gKC1uQml0cyk7XG4gIG5CaXRzICs9IG1MZW47XG4gIGZvciAoOyBuQml0cyA+IDA7IG0gPSBtICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpO1xuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhcztcbiAgfSBlbHNlIGlmIChlID09PSBlTWF4KSB7XG4gICAgcmV0dXJuIG0gPyBOYU4gOiAoKHMgPyAtMSA6IDEpICogSW5maW5pdHkpO1xuICB9IGVsc2Uge1xuICAgIG0gPSBtICsgTWF0aC5wb3coMiwgbUxlbik7XG4gICAgZSA9IGUgLSBlQmlhcztcbiAgfVxuICByZXR1cm4gKHMgPyAtMSA6IDEpICogbSAqIE1hdGgucG93KDIsIGUgLSBtTGVuKTtcbn07XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbihidWZmZXIsIHZhbHVlLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbSwgYyxcbiAgICAgIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDEsXG4gICAgICBlTWF4ID0gKDEgPDwgZUxlbikgLSAxLFxuICAgICAgZUJpYXMgPSBlTWF4ID4+IDEsXG4gICAgICBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMCksXG4gICAgICBpID0gaXNMRSA/IDAgOiAobkJ5dGVzIC0gMSksXG4gICAgICBkID0gaXNMRSA/IDEgOiAtMSxcbiAgICAgIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDA7XG5cbiAgdmFsdWUgPSBNYXRoLmFicyh2YWx1ZSk7XG5cbiAgaWYgKGlzTmFOKHZhbHVlKSB8fCB2YWx1ZSA9PT0gSW5maW5pdHkpIHtcbiAgICBtID0gaXNOYU4odmFsdWUpID8gMSA6IDA7XG4gICAgZSA9IGVNYXg7XG4gIH0gZWxzZSB7XG4gICAgZSA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsdWUpIC8gTWF0aC5MTjIpO1xuICAgIGlmICh2YWx1ZSAqIChjID0gTWF0aC5wb3coMiwgLWUpKSA8IDEpIHtcbiAgICAgIGUtLTtcbiAgICAgIGMgKj0gMjtcbiAgICB9XG4gICAgaWYgKGUgKyBlQmlhcyA+PSAxKSB7XG4gICAgICB2YWx1ZSArPSBydCAvIGM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhbHVlICs9IHJ0ICogTWF0aC5wb3coMiwgMSAtIGVCaWFzKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKys7XG4gICAgICBjIC89IDI7XG4gICAgfVxuXG4gICAgaWYgKGUgKyBlQmlhcyA+PSBlTWF4KSB7XG4gICAgICBtID0gMDtcbiAgICAgIGUgPSBlTWF4O1xuICAgIH0gZWxzZSBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIG0gPSAodmFsdWUgKiBjIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSBlICsgZUJpYXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKTtcbiAgICAgIGUgPSAwO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBtTGVuID49IDg7IGJ1ZmZlcltvZmZzZXQgKyBpXSA9IG0gJiAweGZmLCBpICs9IGQsIG0gLz0gMjU2LCBtTGVuIC09IDgpO1xuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG07XG4gIGVMZW4gKz0gbUxlbjtcbiAgZm9yICg7IGVMZW4gPiAwOyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBlICYgMHhmZiwgaSArPSBkLCBlIC89IDI1NiwgZUxlbiAtPSA4KTtcblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjg7XG59O1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xuLypnbG9iYWwgd2luZG93LCBnbG9iYWwqL1xudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoXCJhc3NlcnRcIilcblxudmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlXG52YXIgY29uc29sZVxudmFyIHRpbWVzID0ge31cblxuaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgJiYgZ2xvYmFsLmNvbnNvbGUpIHtcbiAgICBjb25zb2xlID0gZ2xvYmFsLmNvbnNvbGVcbn0gZWxzZSBpZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3cuY29uc29sZSkge1xuICAgIGNvbnNvbGUgPSB3aW5kb3cuY29uc29sZVxufSBlbHNlIHtcbiAgICBjb25zb2xlID0ge31cbn1cblxudmFyIGZ1bmN0aW9ucyA9IFtcbiAgICBbbG9nLCBcImxvZ1wiXVxuICAgICwgW2luZm8sIFwiaW5mb1wiXVxuICAgICwgW3dhcm4sIFwid2FyblwiXVxuICAgICwgW2Vycm9yLCBcImVycm9yXCJdXG4gICAgLCBbdGltZSwgXCJ0aW1lXCJdXG4gICAgLCBbdGltZUVuZCwgXCJ0aW1lRW5kXCJdXG4gICAgLCBbdHJhY2UsIFwidHJhY2VcIl1cbiAgICAsIFtkaXIsIFwiZGlyXCJdXG4gICAgLCBbYXNzZXJ0LCBcImFzc2VydFwiXVxuXVxuXG5mb3IgKHZhciBpID0gMDsgaSA8IGZ1bmN0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgIHZhciB0dXBsZSA9IGZ1bmN0aW9uc1tpXVxuICAgIHZhciBmID0gdHVwbGVbMF1cbiAgICB2YXIgbmFtZSA9IHR1cGxlWzFdXG5cbiAgICBpZiAoIWNvbnNvbGVbbmFtZV0pIHtcbiAgICAgICAgY29uc29sZVtuYW1lXSA9IGZcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY29uc29sZVxuXG5mdW5jdGlvbiBsb2coKSB7fVxuXG5mdW5jdGlvbiBpbmZvKCkge1xuICAgIGNvbnNvbGUubG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3VtZW50cylcbn1cblxuZnVuY3Rpb24gd2FybigpIHtcbiAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpXG59XG5cbmZ1bmN0aW9uIGVycm9yKCkge1xuICAgIGNvbnNvbGUud2Fybi5hcHBseShjb25zb2xlLCBhcmd1bWVudHMpXG59XG5cbmZ1bmN0aW9uIHRpbWUobGFiZWwpIHtcbiAgICB0aW1lc1tsYWJlbF0gPSBEYXRlLm5vdygpXG59XG5cbmZ1bmN0aW9uIHRpbWVFbmQobGFiZWwpIHtcbiAgICB2YXIgdGltZSA9IHRpbWVzW2xhYmVsXVxuICAgIGlmICghdGltZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBzdWNoIGxhYmVsOiBcIiArIGxhYmVsKVxuICAgIH1cblxuICAgIHZhciBkdXJhdGlvbiA9IERhdGUubm93KCkgLSB0aW1lXG4gICAgY29uc29sZS5sb2cobGFiZWwgKyBcIjogXCIgKyBkdXJhdGlvbiArIFwibXNcIilcbn1cblxuZnVuY3Rpb24gdHJhY2UoKSB7XG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpXG4gICAgZXJyLm5hbWUgPSBcIlRyYWNlXCJcbiAgICBlcnIubWVzc2FnZSA9IHV0aWwuZm9ybWF0LmFwcGx5KG51bGwsIGFyZ3VtZW50cylcbiAgICBjb25zb2xlLmVycm9yKGVyci5zdGFjaylcbn1cblxuZnVuY3Rpb24gZGlyKG9iamVjdCkge1xuICAgIGNvbnNvbGUubG9nKHV0aWwuaW5zcGVjdChvYmplY3QpICsgXCJcXG5cIilcbn1cblxuZnVuY3Rpb24gYXNzZXJ0KGV4cHJlc3Npb24pIHtcbiAgICBpZiAoIWV4cHJlc3Npb24pIHtcbiAgICAgICAgdmFyIGFyciA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICAgICBhc3NlcnQub2soZmFsc2UsIHV0aWwuZm9ybWF0LmFwcGx5KG51bGwsIGFycikpXG4gICAgfVxufVxuXG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBCdWZmZXIgPSByZXF1aXJlKCdidWZmZXInKS5CdWZmZXI7XG52YXIgaW50U2l6ZSA9IDQ7XG52YXIgemVyb0J1ZmZlciA9IG5ldyBCdWZmZXIoaW50U2l6ZSk7IHplcm9CdWZmZXIuZmlsbCgwKTtcbnZhciBjaHJzeiA9IDg7XG5cbmZ1bmN0aW9uIHRvQXJyYXkoYnVmLCBiaWdFbmRpYW4pIHtcbiAgaWYgKChidWYubGVuZ3RoICUgaW50U2l6ZSkgIT09IDApIHtcbiAgICB2YXIgbGVuID0gYnVmLmxlbmd0aCArIChpbnRTaXplIC0gKGJ1Zi5sZW5ndGggJSBpbnRTaXplKSk7XG4gICAgYnVmID0gQnVmZmVyLmNvbmNhdChbYnVmLCB6ZXJvQnVmZmVyXSwgbGVuKTtcbiAgfVxuXG4gIHZhciBhcnIgPSBbXTtcbiAgdmFyIGZuID0gYmlnRW5kaWFuID8gYnVmLnJlYWRJbnQzMkJFIDogYnVmLnJlYWRJbnQzMkxFO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGJ1Zi5sZW5ndGg7IGkgKz0gaW50U2l6ZSkge1xuICAgIGFyci5wdXNoKGZuLmNhbGwoYnVmLCBpKSk7XG4gIH1cbiAgcmV0dXJuIGFycjtcbn1cblxuZnVuY3Rpb24gdG9CdWZmZXIoYXJyLCBzaXplLCBiaWdFbmRpYW4pIHtcbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIoc2l6ZSk7XG4gIHZhciBmbiA9IGJpZ0VuZGlhbiA/IGJ1Zi53cml0ZUludDMyQkUgOiBidWYud3JpdGVJbnQzMkxFO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyci5sZW5ndGg7IGkrKykge1xuICAgIGZuLmNhbGwoYnVmLCBhcnJbaV0sIGkgKiA0LCB0cnVlKTtcbiAgfVxuICByZXR1cm4gYnVmO1xufVxuXG5mdW5jdGlvbiBoYXNoKGJ1ZiwgZm4sIGhhc2hTaXplLCBiaWdFbmRpYW4pIHtcbiAgaWYgKCFCdWZmZXIuaXNCdWZmZXIoYnVmKSkgYnVmID0gbmV3IEJ1ZmZlcihidWYpO1xuICB2YXIgYXJyID0gZm4odG9BcnJheShidWYsIGJpZ0VuZGlhbiksIGJ1Zi5sZW5ndGggKiBjaHJzeik7XG4gIHJldHVybiB0b0J1ZmZlcihhcnIsIGhhc2hTaXplLCBiaWdFbmRpYW4pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHsgaGFzaDogaGFzaCB9O1xuIiwidmFyIEJ1ZmZlciA9IHJlcXVpcmUoJ2J1ZmZlcicpLkJ1ZmZlclxudmFyIHNoYSA9IHJlcXVpcmUoJy4vc2hhJylcbnZhciBzaGEyNTYgPSByZXF1aXJlKCcuL3NoYTI1NicpXG52YXIgcm5nID0gcmVxdWlyZSgnLi9ybmcnKVxudmFyIG1kNSA9IHJlcXVpcmUoJy4vbWQ1JylcblxudmFyIGFsZ29yaXRobXMgPSB7XG4gIHNoYTE6IHNoYSxcbiAgc2hhMjU2OiBzaGEyNTYsXG4gIG1kNTogbWQ1XG59XG5cbnZhciBibG9ja3NpemUgPSA2NFxudmFyIHplcm9CdWZmZXIgPSBuZXcgQnVmZmVyKGJsb2Nrc2l6ZSk7IHplcm9CdWZmZXIuZmlsbCgwKVxuZnVuY3Rpb24gaG1hYyhmbiwga2V5LCBkYXRhKSB7XG4gIGlmKCFCdWZmZXIuaXNCdWZmZXIoa2V5KSkga2V5ID0gbmV3IEJ1ZmZlcihrZXkpXG4gIGlmKCFCdWZmZXIuaXNCdWZmZXIoZGF0YSkpIGRhdGEgPSBuZXcgQnVmZmVyKGRhdGEpXG5cbiAgaWYoa2V5Lmxlbmd0aCA+IGJsb2Nrc2l6ZSkge1xuICAgIGtleSA9IGZuKGtleSlcbiAgfSBlbHNlIGlmKGtleS5sZW5ndGggPCBibG9ja3NpemUpIHtcbiAgICBrZXkgPSBCdWZmZXIuY29uY2F0KFtrZXksIHplcm9CdWZmZXJdLCBibG9ja3NpemUpXG4gIH1cblxuICB2YXIgaXBhZCA9IG5ldyBCdWZmZXIoYmxvY2tzaXplKSwgb3BhZCA9IG5ldyBCdWZmZXIoYmxvY2tzaXplKVxuICBmb3IodmFyIGkgPSAwOyBpIDwgYmxvY2tzaXplOyBpKyspIHtcbiAgICBpcGFkW2ldID0ga2V5W2ldIF4gMHgzNlxuICAgIG9wYWRbaV0gPSBrZXlbaV0gXiAweDVDXG4gIH1cblxuICB2YXIgaGFzaCA9IGZuKEJ1ZmZlci5jb25jYXQoW2lwYWQsIGRhdGFdKSlcbiAgcmV0dXJuIGZuKEJ1ZmZlci5jb25jYXQoW29wYWQsIGhhc2hdKSlcbn1cblxuZnVuY3Rpb24gaGFzaChhbGcsIGtleSkge1xuICBhbGcgPSBhbGcgfHwgJ3NoYTEnXG4gIHZhciBmbiA9IGFsZ29yaXRobXNbYWxnXVxuICB2YXIgYnVmcyA9IFtdXG4gIHZhciBsZW5ndGggPSAwXG4gIGlmKCFmbikgZXJyb3IoJ2FsZ29yaXRobTonLCBhbGcsICdpcyBub3QgeWV0IHN1cHBvcnRlZCcpXG4gIHJldHVybiB7XG4gICAgdXBkYXRlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgaWYoIUJ1ZmZlci5pc0J1ZmZlcihkYXRhKSkgZGF0YSA9IG5ldyBCdWZmZXIoZGF0YSlcbiAgICAgICAgXG4gICAgICBidWZzLnB1c2goZGF0YSlcbiAgICAgIGxlbmd0aCArPSBkYXRhLmxlbmd0aFxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9LFxuICAgIGRpZ2VzdDogZnVuY3Rpb24gKGVuYykge1xuICAgICAgdmFyIGJ1ZiA9IEJ1ZmZlci5jb25jYXQoYnVmcylcbiAgICAgIHZhciByID0ga2V5ID8gaG1hYyhmbiwga2V5LCBidWYpIDogZm4oYnVmKVxuICAgICAgYnVmcyA9IG51bGxcbiAgICAgIHJldHVybiBlbmMgPyByLnRvU3RyaW5nKGVuYykgOiByXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGVycm9yICgpIHtcbiAgdmFyIG0gPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cykuam9pbignICcpXG4gIHRocm93IG5ldyBFcnJvcihbXG4gICAgbSxcbiAgICAnd2UgYWNjZXB0IHB1bGwgcmVxdWVzdHMnLFxuICAgICdodHRwOi8vZ2l0aHViLmNvbS9kb21pbmljdGFyci9jcnlwdG8tYnJvd3NlcmlmeSdcbiAgICBdLmpvaW4oJ1xcbicpKVxufVxuXG5leHBvcnRzLmNyZWF0ZUhhc2ggPSBmdW5jdGlvbiAoYWxnKSB7IHJldHVybiBoYXNoKGFsZykgfVxuZXhwb3J0cy5jcmVhdGVIbWFjID0gZnVuY3Rpb24gKGFsZywga2V5KSB7IHJldHVybiBoYXNoKGFsZywga2V5KSB9XG5leHBvcnRzLnJhbmRvbUJ5dGVzID0gZnVuY3Rpb24oc2l6ZSwgY2FsbGJhY2spIHtcbiAgaWYgKGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwpIHtcbiAgICB0cnkge1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzLCB1bmRlZmluZWQsIG5ldyBCdWZmZXIocm5nKHNpemUpKSlcbiAgICB9IGNhdGNoIChlcnIpIHsgY2FsbGJhY2soZXJyKSB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBCdWZmZXIocm5nKHNpemUpKVxuICB9XG59XG5cbmZ1bmN0aW9uIGVhY2goYSwgZikge1xuICBmb3IodmFyIGkgaW4gYSlcbiAgICBmKGFbaV0sIGkpXG59XG5cbi8vIHRoZSBsZWFzdCBJIGNhbiBkbyBpcyBtYWtlIGVycm9yIG1lc3NhZ2VzIGZvciB0aGUgcmVzdCBvZiB0aGUgbm9kZS5qcy9jcnlwdG8gYXBpLlxuZWFjaChbJ2NyZWF0ZUNyZWRlbnRpYWxzJ1xuLCAnY3JlYXRlQ2lwaGVyJ1xuLCAnY3JlYXRlQ2lwaGVyaXYnXG4sICdjcmVhdGVEZWNpcGhlcidcbiwgJ2NyZWF0ZURlY2lwaGVyaXYnXG4sICdjcmVhdGVTaWduJ1xuLCAnY3JlYXRlVmVyaWZ5J1xuLCAnY3JlYXRlRGlmZmllSGVsbG1hbidcbiwgJ3Bia2RmMiddLCBmdW5jdGlvbiAobmFtZSkge1xuICBleHBvcnRzW25hbWVdID0gZnVuY3Rpb24gKCkge1xuICAgIGVycm9yKCdzb3JyeSwnLCBuYW1lLCAnaXMgbm90IGltcGxlbWVudGVkIHlldCcpXG4gIH1cbn0pXG4iLCIvKlxyXG4gKiBBIEphdmFTY3JpcHQgaW1wbGVtZW50YXRpb24gb2YgdGhlIFJTQSBEYXRhIFNlY3VyaXR5LCBJbmMuIE1ENSBNZXNzYWdlXHJcbiAqIERpZ2VzdCBBbGdvcml0aG0sIGFzIGRlZmluZWQgaW4gUkZDIDEzMjEuXHJcbiAqIFZlcnNpb24gMi4xIENvcHlyaWdodCAoQykgUGF1bCBKb2huc3RvbiAxOTk5IC0gMjAwMi5cclxuICogT3RoZXIgY29udHJpYnV0b3JzOiBHcmVnIEhvbHQsIEFuZHJldyBLZXBlcnQsIFlkbmFyLCBMb3N0aW5ldFxyXG4gKiBEaXN0cmlidXRlZCB1bmRlciB0aGUgQlNEIExpY2Vuc2VcclxuICogU2VlIGh0dHA6Ly9wYWpob21lLm9yZy51ay9jcnlwdC9tZDUgZm9yIG1vcmUgaW5mby5cclxuICovXHJcblxyXG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xyXG5cclxuLypcclxuICogUGVyZm9ybSBhIHNpbXBsZSBzZWxmLXRlc3QgdG8gc2VlIGlmIHRoZSBWTSBpcyB3b3JraW5nXHJcbiAqL1xyXG5mdW5jdGlvbiBtZDVfdm1fdGVzdCgpXHJcbntcclxuICByZXR1cm4gaGV4X21kNShcImFiY1wiKSA9PSBcIjkwMDE1MDk4M2NkMjRmYjBkNjk2M2Y3ZDI4ZTE3ZjcyXCI7XHJcbn1cclxuXHJcbi8qXHJcbiAqIENhbGN1bGF0ZSB0aGUgTUQ1IG9mIGFuIGFycmF5IG9mIGxpdHRsZS1lbmRpYW4gd29yZHMsIGFuZCBhIGJpdCBsZW5ndGhcclxuICovXHJcbmZ1bmN0aW9uIGNvcmVfbWQ1KHgsIGxlbilcclxue1xyXG4gIC8qIGFwcGVuZCBwYWRkaW5nICovXHJcbiAgeFtsZW4gPj4gNV0gfD0gMHg4MCA8PCAoKGxlbikgJSAzMik7XHJcbiAgeFsoKChsZW4gKyA2NCkgPj4+IDkpIDw8IDQpICsgMTRdID0gbGVuO1xyXG5cclxuICB2YXIgYSA9ICAxNzMyNTg0MTkzO1xyXG4gIHZhciBiID0gLTI3MTczMzg3OTtcclxuICB2YXIgYyA9IC0xNzMyNTg0MTk0O1xyXG4gIHZhciBkID0gIDI3MTczMzg3ODtcclxuXHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IHgubGVuZ3RoOyBpICs9IDE2KVxyXG4gIHtcclxuICAgIHZhciBvbGRhID0gYTtcclxuICAgIHZhciBvbGRiID0gYjtcclxuICAgIHZhciBvbGRjID0gYztcclxuICAgIHZhciBvbGRkID0gZDtcclxuXHJcbiAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSsgMF0sIDcgLCAtNjgwODc2OTM2KTtcclxuICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpKyAxXSwgMTIsIC0zODk1NjQ1ODYpO1xyXG4gICAgYyA9IG1kNV9mZihjLCBkLCBhLCBiLCB4W2krIDJdLCAxNywgIDYwNjEwNTgxOSk7XHJcbiAgICBiID0gbWQ1X2ZmKGIsIGMsIGQsIGEsIHhbaSsgM10sIDIyLCAtMTA0NDUyNTMzMCk7XHJcbiAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSsgNF0sIDcgLCAtMTc2NDE4ODk3KTtcclxuICAgIGQgPSBtZDVfZmYoZCwgYSwgYiwgYywgeFtpKyA1XSwgMTIsICAxMjAwMDgwNDI2KTtcclxuICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpKyA2XSwgMTcsIC0xNDczMjMxMzQxKTtcclxuICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpKyA3XSwgMjIsIC00NTcwNTk4Myk7XHJcbiAgICBhID0gbWQ1X2ZmKGEsIGIsIGMsIGQsIHhbaSsgOF0sIDcgLCAgMTc3MDAzNTQxNik7XHJcbiAgICBkID0gbWQ1X2ZmKGQsIGEsIGIsIGMsIHhbaSsgOV0sIDEyLCAtMTk1ODQxNDQxNyk7XHJcbiAgICBjID0gbWQ1X2ZmKGMsIGQsIGEsIGIsIHhbaSsxMF0sIDE3LCAtNDIwNjMpO1xyXG4gICAgYiA9IG1kNV9mZihiLCBjLCBkLCBhLCB4W2krMTFdLCAyMiwgLTE5OTA0MDQxNjIpO1xyXG4gICAgYSA9IG1kNV9mZihhLCBiLCBjLCBkLCB4W2krMTJdLCA3ICwgIDE4MDQ2MDM2ODIpO1xyXG4gICAgZCA9IG1kNV9mZihkLCBhLCBiLCBjLCB4W2krMTNdLCAxMiwgLTQwMzQxMTAxKTtcclxuICAgIGMgPSBtZDVfZmYoYywgZCwgYSwgYiwgeFtpKzE0XSwgMTcsIC0xNTAyMDAyMjkwKTtcclxuICAgIGIgPSBtZDVfZmYoYiwgYywgZCwgYSwgeFtpKzE1XSwgMjIsICAxMjM2NTM1MzI5KTtcclxuXHJcbiAgICBhID0gbWQ1X2dnKGEsIGIsIGMsIGQsIHhbaSsgMV0sIDUgLCAtMTY1Nzk2NTEwKTtcclxuICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpKyA2XSwgOSAsIC0xMDY5NTAxNjMyKTtcclxuICAgIGMgPSBtZDVfZ2coYywgZCwgYSwgYiwgeFtpKzExXSwgMTQsICA2NDM3MTc3MTMpO1xyXG4gICAgYiA9IG1kNV9nZyhiLCBjLCBkLCBhLCB4W2krIDBdLCAyMCwgLTM3Mzg5NzMwMik7XHJcbiAgICBhID0gbWQ1X2dnKGEsIGIsIGMsIGQsIHhbaSsgNV0sIDUgLCAtNzAxNTU4NjkxKTtcclxuICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpKzEwXSwgOSAsICAzODAxNjA4Myk7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsxNV0sIDE0LCAtNjYwNDc4MzM1KTtcclxuICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpKyA0XSwgMjAsIC00MDU1Mzc4NDgpO1xyXG4gICAgYSA9IG1kNV9nZyhhLCBiLCBjLCBkLCB4W2krIDldLCA1ICwgIDU2ODQ0NjQzOCk7XHJcbiAgICBkID0gbWQ1X2dnKGQsIGEsIGIsIGMsIHhbaSsxNF0sIDkgLCAtMTAxOTgwMzY5MCk7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsgM10sIDE0LCAtMTg3MzYzOTYxKTtcclxuICAgIGIgPSBtZDVfZ2coYiwgYywgZCwgYSwgeFtpKyA4XSwgMjAsICAxMTYzNTMxNTAxKTtcclxuICAgIGEgPSBtZDVfZ2coYSwgYiwgYywgZCwgeFtpKzEzXSwgNSAsIC0xNDQ0NjgxNDY3KTtcclxuICAgIGQgPSBtZDVfZ2coZCwgYSwgYiwgYywgeFtpKyAyXSwgOSAsIC01MTQwMzc4NCk7XHJcbiAgICBjID0gbWQ1X2dnKGMsIGQsIGEsIGIsIHhbaSsgN10sIDE0LCAgMTczNTMyODQ3Myk7XHJcbiAgICBiID0gbWQ1X2dnKGIsIGMsIGQsIGEsIHhbaSsxMl0sIDIwLCAtMTkyNjYwNzczNCk7XHJcblxyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krIDVdLCA0ICwgLTM3ODU1OCk7XHJcbiAgICBkID0gbWQ1X2hoKGQsIGEsIGIsIGMsIHhbaSsgOF0sIDExLCAtMjAyMjU3NDQ2Myk7XHJcbiAgICBjID0gbWQ1X2hoKGMsIGQsIGEsIGIsIHhbaSsxMV0sIDE2LCAgMTgzOTAzMDU2Mik7XHJcbiAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSsxNF0sIDIzLCAtMzUzMDk1NTYpO1xyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krIDFdLCA0ICwgLTE1MzA5OTIwNjApO1xyXG4gICAgZCA9IG1kNV9oaChkLCBhLCBiLCBjLCB4W2krIDRdLCAxMSwgIDEyNzI4OTMzNTMpO1xyXG4gICAgYyA9IG1kNV9oaChjLCBkLCBhLCBiLCB4W2krIDddLCAxNiwgLTE1NTQ5NzYzMik7XHJcbiAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSsxMF0sIDIzLCAtMTA5NDczMDY0MCk7XHJcbiAgICBhID0gbWQ1X2hoKGEsIGIsIGMsIGQsIHhbaSsxM10sIDQgLCAgNjgxMjc5MTc0KTtcclxuICAgIGQgPSBtZDVfaGgoZCwgYSwgYiwgYywgeFtpKyAwXSwgMTEsIC0zNTg1MzcyMjIpO1xyXG4gICAgYyA9IG1kNV9oaChjLCBkLCBhLCBiLCB4W2krIDNdLCAxNiwgLTcyMjUyMTk3OSk7XHJcbiAgICBiID0gbWQ1X2hoKGIsIGMsIGQsIGEsIHhbaSsgNl0sIDIzLCAgNzYwMjkxODkpO1xyXG4gICAgYSA9IG1kNV9oaChhLCBiLCBjLCBkLCB4W2krIDldLCA0ICwgLTY0MDM2NDQ4Nyk7XHJcbiAgICBkID0gbWQ1X2hoKGQsIGEsIGIsIGMsIHhbaSsxMl0sIDExLCAtNDIxODE1ODM1KTtcclxuICAgIGMgPSBtZDVfaGgoYywgZCwgYSwgYiwgeFtpKzE1XSwgMTYsICA1MzA3NDI1MjApO1xyXG4gICAgYiA9IG1kNV9oaChiLCBjLCBkLCBhLCB4W2krIDJdLCAyMywgLTk5NTMzODY1MSk7XHJcblxyXG4gICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2krIDBdLCA2ICwgLTE5ODYzMDg0NCk7XHJcbiAgICBkID0gbWQ1X2lpKGQsIGEsIGIsIGMsIHhbaSsgN10sIDEwLCAgMTEyNjg5MTQxNSk7XHJcbiAgICBjID0gbWQ1X2lpKGMsIGQsIGEsIGIsIHhbaSsxNF0sIDE1LCAtMTQxNjM1NDkwNSk7XHJcbiAgICBiID0gbWQ1X2lpKGIsIGMsIGQsIGEsIHhbaSsgNV0sIDIxLCAtNTc0MzQwNTUpO1xyXG4gICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2krMTJdLCA2ICwgIDE3MDA0ODU1NzEpO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krIDNdLCAxMCwgLTE4OTQ5ODY2MDYpO1xyXG4gICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2krMTBdLCAxNSwgLTEwNTE1MjMpO1xyXG4gICAgYiA9IG1kNV9paShiLCBjLCBkLCBhLCB4W2krIDFdLCAyMSwgLTIwNTQ5MjI3OTkpO1xyXG4gICAgYSA9IG1kNV9paShhLCBiLCBjLCBkLCB4W2krIDhdLCA2ICwgIDE4NzMzMTMzNTkpO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krMTVdLCAxMCwgLTMwNjExNzQ0KTtcclxuICAgIGMgPSBtZDVfaWkoYywgZCwgYSwgYiwgeFtpKyA2XSwgMTUsIC0xNTYwMTk4MzgwKTtcclxuICAgIGIgPSBtZDVfaWkoYiwgYywgZCwgYSwgeFtpKzEzXSwgMjEsICAxMzA5MTUxNjQ5KTtcclxuICAgIGEgPSBtZDVfaWkoYSwgYiwgYywgZCwgeFtpKyA0XSwgNiAsIC0xNDU1MjMwNzApO1xyXG4gICAgZCA9IG1kNV9paShkLCBhLCBiLCBjLCB4W2krMTFdLCAxMCwgLTExMjAyMTAzNzkpO1xyXG4gICAgYyA9IG1kNV9paShjLCBkLCBhLCBiLCB4W2krIDJdLCAxNSwgIDcxODc4NzI1OSk7XHJcbiAgICBiID0gbWQ1X2lpKGIsIGMsIGQsIGEsIHhbaSsgOV0sIDIxLCAtMzQzNDg1NTUxKTtcclxuXHJcbiAgICBhID0gc2FmZV9hZGQoYSwgb2xkYSk7XHJcbiAgICBiID0gc2FmZV9hZGQoYiwgb2xkYik7XHJcbiAgICBjID0gc2FmZV9hZGQoYywgb2xkYyk7XHJcbiAgICBkID0gc2FmZV9hZGQoZCwgb2xkZCk7XHJcbiAgfVxyXG4gIHJldHVybiBBcnJheShhLCBiLCBjLCBkKTtcclxuXHJcbn1cclxuXHJcbi8qXHJcbiAqIFRoZXNlIGZ1bmN0aW9ucyBpbXBsZW1lbnQgdGhlIGZvdXIgYmFzaWMgb3BlcmF0aW9ucyB0aGUgYWxnb3JpdGhtIHVzZXMuXHJcbiAqL1xyXG5mdW5jdGlvbiBtZDVfY21uKHEsIGEsIGIsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gc2FmZV9hZGQoYml0X3JvbChzYWZlX2FkZChzYWZlX2FkZChhLCBxKSwgc2FmZV9hZGQoeCwgdCkpLCBzKSxiKTtcclxufVxyXG5mdW5jdGlvbiBtZDVfZmYoYSwgYiwgYywgZCwgeCwgcywgdClcclxue1xyXG4gIHJldHVybiBtZDVfY21uKChiICYgYykgfCAoKH5iKSAmIGQpLCBhLCBiLCB4LCBzLCB0KTtcclxufVxyXG5mdW5jdGlvbiBtZDVfZ2coYSwgYiwgYywgZCwgeCwgcywgdClcclxue1xyXG4gIHJldHVybiBtZDVfY21uKChiICYgZCkgfCAoYyAmICh+ZCkpLCBhLCBiLCB4LCBzLCB0KTtcclxufVxyXG5mdW5jdGlvbiBtZDVfaGgoYSwgYiwgYywgZCwgeCwgcywgdClcclxue1xyXG4gIHJldHVybiBtZDVfY21uKGIgXiBjIF4gZCwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuZnVuY3Rpb24gbWQ1X2lpKGEsIGIsIGMsIGQsIHgsIHMsIHQpXHJcbntcclxuICByZXR1cm4gbWQ1X2NtbihjIF4gKGIgfCAofmQpKSwgYSwgYiwgeCwgcywgdCk7XHJcbn1cclxuXHJcbi8qXHJcbiAqIEFkZCBpbnRlZ2Vycywgd3JhcHBpbmcgYXQgMl4zMi4gVGhpcyB1c2VzIDE2LWJpdCBvcGVyYXRpb25zIGludGVybmFsbHlcclxuICogdG8gd29yayBhcm91bmQgYnVncyBpbiBzb21lIEpTIGludGVycHJldGVycy5cclxuICovXHJcbmZ1bmN0aW9uIHNhZmVfYWRkKHgsIHkpXHJcbntcclxuICB2YXIgbHN3ID0gKHggJiAweEZGRkYpICsgKHkgJiAweEZGRkYpO1xyXG4gIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcclxuICByZXR1cm4gKG1zdyA8PCAxNikgfCAobHN3ICYgMHhGRkZGKTtcclxufVxyXG5cclxuLypcclxuICogQml0d2lzZSByb3RhdGUgYSAzMi1iaXQgbnVtYmVyIHRvIHRoZSBsZWZ0LlxyXG4gKi9cclxuZnVuY3Rpb24gYml0X3JvbChudW0sIGNudClcclxue1xyXG4gIHJldHVybiAobnVtIDw8IGNudCkgfCAobnVtID4+PiAoMzIgLSBjbnQpKTtcclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBtZDUoYnVmKSB7XHJcbiAgcmV0dXJuIGhlbHBlcnMuaGFzaChidWYsIGNvcmVfbWQ1LCAxNik7XHJcbn07XHJcbiIsIi8vIE9yaWdpbmFsIGNvZGUgYWRhcHRlZCBmcm9tIFJvYmVydCBLaWVmZmVyLlxuLy8gZGV0YWlscyBhdCBodHRwczovL2dpdGh1Yi5jb20vYnJvb2ZhL25vZGUtdXVpZFxuKGZ1bmN0aW9uKCkge1xuICB2YXIgX2dsb2JhbCA9IHRoaXM7XG5cbiAgdmFyIG1hdGhSTkcsIHdoYXR3Z1JORztcblxuICAvLyBOT1RFOiBNYXRoLnJhbmRvbSgpIGRvZXMgbm90IGd1YXJhbnRlZSBcImNyeXB0b2dyYXBoaWMgcXVhbGl0eVwiXG4gIG1hdGhSTkcgPSBmdW5jdGlvbihzaXplKSB7XG4gICAgdmFyIGJ5dGVzID0gbmV3IEFycmF5KHNpemUpO1xuICAgIHZhciByO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCBzaXplOyBpKyspIHtcbiAgICAgIGlmICgoaSAmIDB4MDMpID09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBieXRlc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gYnl0ZXM7XG4gIH1cblxuICBpZiAoX2dsb2JhbC5jcnlwdG8gJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcykge1xuICAgIHdoYXR3Z1JORyA9IGZ1bmN0aW9uKHNpemUpIHtcbiAgICAgIHZhciBieXRlcyA9IG5ldyBVaW50OEFycmF5KHNpemUpO1xuICAgICAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhieXRlcyk7XG4gICAgICByZXR1cm4gYnl0ZXM7XG4gICAgfVxuICB9XG5cbiAgbW9kdWxlLmV4cG9ydHMgPSB3aGF0d2dSTkcgfHwgbWF0aFJORztcblxufSgpKVxuIiwiLypcbiAqIEEgSmF2YVNjcmlwdCBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgU2VjdXJlIEhhc2ggQWxnb3JpdGhtLCBTSEEtMSwgYXMgZGVmaW5lZFxuICogaW4gRklQUyBQVUIgMTgwLTFcbiAqIFZlcnNpb24gMi4xYSBDb3B5cmlnaHQgUGF1bCBKb2huc3RvbiAyMDAwIC0gMjAwMi5cbiAqIE90aGVyIGNvbnRyaWJ1dG9yczogR3JlZyBIb2x0LCBBbmRyZXcgS2VwZXJ0LCBZZG5hciwgTG9zdGluZXRcbiAqIERpc3RyaWJ1dGVkIHVuZGVyIHRoZSBCU0QgTGljZW5zZVxuICogU2VlIGh0dHA6Ly9wYWpob21lLm9yZy51ay9jcnlwdC9tZDUgZm9yIGRldGFpbHMuXG4gKi9cblxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL2hlbHBlcnMnKTtcblxuLypcbiAqIENhbGN1bGF0ZSB0aGUgU0hBLTEgb2YgYW4gYXJyYXkgb2YgYmlnLWVuZGlhbiB3b3JkcywgYW5kIGEgYml0IGxlbmd0aFxuICovXG5mdW5jdGlvbiBjb3JlX3NoYTEoeCwgbGVuKVxue1xuICAvKiBhcHBlbmQgcGFkZGluZyAqL1xuICB4W2xlbiA+PiA1XSB8PSAweDgwIDw8ICgyNCAtIGxlbiAlIDMyKTtcbiAgeFsoKGxlbiArIDY0ID4+IDkpIDw8IDQpICsgMTVdID0gbGVuO1xuXG4gIHZhciB3ID0gQXJyYXkoODApO1xuICB2YXIgYSA9ICAxNzMyNTg0MTkzO1xuICB2YXIgYiA9IC0yNzE3MzM4Nzk7XG4gIHZhciBjID0gLTE3MzI1ODQxOTQ7XG4gIHZhciBkID0gIDI3MTczMzg3ODtcbiAgdmFyIGUgPSAtMTAwOTU4OTc3NjtcblxuICBmb3IodmFyIGkgPSAwOyBpIDwgeC5sZW5ndGg7IGkgKz0gMTYpXG4gIHtcbiAgICB2YXIgb2xkYSA9IGE7XG4gICAgdmFyIG9sZGIgPSBiO1xuICAgIHZhciBvbGRjID0gYztcbiAgICB2YXIgb2xkZCA9IGQ7XG4gICAgdmFyIG9sZGUgPSBlO1xuXG4gICAgZm9yKHZhciBqID0gMDsgaiA8IDgwOyBqKyspXG4gICAge1xuICAgICAgaWYoaiA8IDE2KSB3W2pdID0geFtpICsgal07XG4gICAgICBlbHNlIHdbal0gPSByb2wod1tqLTNdIF4gd1tqLThdIF4gd1tqLTE0XSBeIHdbai0xNl0sIDEpO1xuICAgICAgdmFyIHQgPSBzYWZlX2FkZChzYWZlX2FkZChyb2woYSwgNSksIHNoYTFfZnQoaiwgYiwgYywgZCkpLFxuICAgICAgICAgICAgICAgICAgICAgICBzYWZlX2FkZChzYWZlX2FkZChlLCB3W2pdKSwgc2hhMV9rdChqKSkpO1xuICAgICAgZSA9IGQ7XG4gICAgICBkID0gYztcbiAgICAgIGMgPSByb2woYiwgMzApO1xuICAgICAgYiA9IGE7XG4gICAgICBhID0gdDtcbiAgICB9XG5cbiAgICBhID0gc2FmZV9hZGQoYSwgb2xkYSk7XG4gICAgYiA9IHNhZmVfYWRkKGIsIG9sZGIpO1xuICAgIGMgPSBzYWZlX2FkZChjLCBvbGRjKTtcbiAgICBkID0gc2FmZV9hZGQoZCwgb2xkZCk7XG4gICAgZSA9IHNhZmVfYWRkKGUsIG9sZGUpO1xuICB9XG4gIHJldHVybiBBcnJheShhLCBiLCBjLCBkLCBlKTtcblxufVxuXG4vKlxuICogUGVyZm9ybSB0aGUgYXBwcm9wcmlhdGUgdHJpcGxldCBjb21iaW5hdGlvbiBmdW5jdGlvbiBmb3IgdGhlIGN1cnJlbnRcbiAqIGl0ZXJhdGlvblxuICovXG5mdW5jdGlvbiBzaGExX2Z0KHQsIGIsIGMsIGQpXG57XG4gIGlmKHQgPCAyMCkgcmV0dXJuIChiICYgYykgfCAoKH5iKSAmIGQpO1xuICBpZih0IDwgNDApIHJldHVybiBiIF4gYyBeIGQ7XG4gIGlmKHQgPCA2MCkgcmV0dXJuIChiICYgYykgfCAoYiAmIGQpIHwgKGMgJiBkKTtcbiAgcmV0dXJuIGIgXiBjIF4gZDtcbn1cblxuLypcbiAqIERldGVybWluZSB0aGUgYXBwcm9wcmlhdGUgYWRkaXRpdmUgY29uc3RhbnQgZm9yIHRoZSBjdXJyZW50IGl0ZXJhdGlvblxuICovXG5mdW5jdGlvbiBzaGExX2t0KHQpXG57XG4gIHJldHVybiAodCA8IDIwKSA/ICAxNTE4NTAwMjQ5IDogKHQgPCA0MCkgPyAgMTg1OTc3NTM5MyA6XG4gICAgICAgICAodCA8IDYwKSA/IC0xODk0MDA3NTg4IDogLTg5OTQ5NzUxNDtcbn1cblxuLypcbiAqIEFkZCBpbnRlZ2Vycywgd3JhcHBpbmcgYXQgMl4zMi4gVGhpcyB1c2VzIDE2LWJpdCBvcGVyYXRpb25zIGludGVybmFsbHlcbiAqIHRvIHdvcmsgYXJvdW5kIGJ1Z3MgaW4gc29tZSBKUyBpbnRlcnByZXRlcnMuXG4gKi9cbmZ1bmN0aW9uIHNhZmVfYWRkKHgsIHkpXG57XG4gIHZhciBsc3cgPSAoeCAmIDB4RkZGRikgKyAoeSAmIDB4RkZGRik7XG4gIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcbiAgcmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XG59XG5cbi8qXG4gKiBCaXR3aXNlIHJvdGF0ZSBhIDMyLWJpdCBudW1iZXIgdG8gdGhlIGxlZnQuXG4gKi9cbmZ1bmN0aW9uIHJvbChudW0sIGNudClcbntcbiAgcmV0dXJuIChudW0gPDwgY250KSB8IChudW0gPj4+ICgzMiAtIGNudCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNoYTEoYnVmKSB7XG4gIHJldHVybiBoZWxwZXJzLmhhc2goYnVmLCBjb3JlX3NoYTEsIDIwLCB0cnVlKTtcbn07XG4iLCJcbi8qKlxuICogQSBKYXZhU2NyaXB0IGltcGxlbWVudGF0aW9uIG9mIHRoZSBTZWN1cmUgSGFzaCBBbGdvcml0aG0sIFNIQS0yNTYsIGFzIGRlZmluZWRcbiAqIGluIEZJUFMgMTgwLTJcbiAqIFZlcnNpb24gMi4yLWJldGEgQ29weXJpZ2h0IEFuZ2VsIE1hcmluLCBQYXVsIEpvaG5zdG9uIDIwMDAgLSAyMDA5LlxuICogT3RoZXIgY29udHJpYnV0b3JzOiBHcmVnIEhvbHQsIEFuZHJldyBLZXBlcnQsIFlkbmFyLCBMb3N0aW5ldFxuICpcbiAqL1xuXG52YXIgaGVscGVycyA9IHJlcXVpcmUoJy4vaGVscGVycycpO1xuXG52YXIgc2FmZV9hZGQgPSBmdW5jdGlvbih4LCB5KSB7XG4gIHZhciBsc3cgPSAoeCAmIDB4RkZGRikgKyAoeSAmIDB4RkZGRik7XG4gIHZhciBtc3cgPSAoeCA+PiAxNikgKyAoeSA+PiAxNikgKyAobHN3ID4+IDE2KTtcbiAgcmV0dXJuIChtc3cgPDwgMTYpIHwgKGxzdyAmIDB4RkZGRik7XG59O1xuXG52YXIgUyA9IGZ1bmN0aW9uKFgsIG4pIHtcbiAgcmV0dXJuIChYID4+PiBuKSB8IChYIDw8ICgzMiAtIG4pKTtcbn07XG5cbnZhciBSID0gZnVuY3Rpb24oWCwgbikge1xuICByZXR1cm4gKFggPj4+IG4pO1xufTtcblxudmFyIENoID0gZnVuY3Rpb24oeCwgeSwgeikge1xuICByZXR1cm4gKCh4ICYgeSkgXiAoKH54KSAmIHopKTtcbn07XG5cbnZhciBNYWogPSBmdW5jdGlvbih4LCB5LCB6KSB7XG4gIHJldHVybiAoKHggJiB5KSBeICh4ICYgeikgXiAoeSAmIHopKTtcbn07XG5cbnZhciBTaWdtYTAyNTYgPSBmdW5jdGlvbih4KSB7XG4gIHJldHVybiAoUyh4LCAyKSBeIFMoeCwgMTMpIF4gUyh4LCAyMikpO1xufTtcblxudmFyIFNpZ21hMTI1NiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIChTKHgsIDYpIF4gUyh4LCAxMSkgXiBTKHgsIDI1KSk7XG59O1xuXG52YXIgR2FtbWEwMjU2ID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gKFMoeCwgNykgXiBTKHgsIDE4KSBeIFIoeCwgMykpO1xufTtcblxudmFyIEdhbW1hMTI1NiA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIChTKHgsIDE3KSBeIFMoeCwgMTkpIF4gUih4LCAxMCkpO1xufTtcblxudmFyIGNvcmVfc2hhMjU2ID0gZnVuY3Rpb24obSwgbCkge1xuICB2YXIgSyA9IG5ldyBBcnJheSgweDQyOEEyRjk4LDB4NzEzNzQ0OTEsMHhCNUMwRkJDRiwweEU5QjVEQkE1LDB4Mzk1NkMyNUIsMHg1OUYxMTFGMSwweDkyM0Y4MkE0LDB4QUIxQzVFRDUsMHhEODA3QUE5OCwweDEyODM1QjAxLDB4MjQzMTg1QkUsMHg1NTBDN0RDMywweDcyQkU1RDc0LDB4ODBERUIxRkUsMHg5QkRDMDZBNywweEMxOUJGMTc0LDB4RTQ5QjY5QzEsMHhFRkJFNDc4NiwweEZDMTlEQzYsMHgyNDBDQTFDQywweDJERTkyQzZGLDB4NEE3NDg0QUEsMHg1Q0IwQTlEQywweDc2Rjk4OERBLDB4OTgzRTUxNTIsMHhBODMxQzY2RCwweEIwMDMyN0M4LDB4QkY1OTdGQzcsMHhDNkUwMEJGMywweEQ1QTc5MTQ3LDB4NkNBNjM1MSwweDE0MjkyOTY3LDB4MjdCNzBBODUsMHgyRTFCMjEzOCwweDREMkM2REZDLDB4NTMzODBEMTMsMHg2NTBBNzM1NCwweDc2NkEwQUJCLDB4ODFDMkM5MkUsMHg5MjcyMkM4NSwweEEyQkZFOEExLDB4QTgxQTY2NEIsMHhDMjRCOEI3MCwweEM3NkM1MUEzLDB4RDE5MkU4MTksMHhENjk5MDYyNCwweEY0MEUzNTg1LDB4MTA2QUEwNzAsMHgxOUE0QzExNiwweDFFMzc2QzA4LDB4Mjc0ODc3NEMsMHgzNEIwQkNCNSwweDM5MUMwQ0IzLDB4NEVEOEFBNEEsMHg1QjlDQ0E0RiwweDY4MkU2RkYzLDB4NzQ4RjgyRUUsMHg3OEE1NjM2RiwweDg0Qzg3ODE0LDB4OENDNzAyMDgsMHg5MEJFRkZGQSwweEE0NTA2Q0VCLDB4QkVGOUEzRjcsMHhDNjcxNzhGMik7XG4gIHZhciBIQVNIID0gbmV3IEFycmF5KDB4NkEwOUU2NjcsIDB4QkI2N0FFODUsIDB4M0M2RUYzNzIsIDB4QTU0RkY1M0EsIDB4NTEwRTUyN0YsIDB4OUIwNTY4OEMsIDB4MUY4M0Q5QUIsIDB4NUJFMENEMTkpO1xuICAgIHZhciBXID0gbmV3IEFycmF5KDY0KTtcbiAgICB2YXIgYSwgYiwgYywgZCwgZSwgZiwgZywgaCwgaSwgajtcbiAgICB2YXIgVDEsIFQyO1xuICAvKiBhcHBlbmQgcGFkZGluZyAqL1xuICBtW2wgPj4gNV0gfD0gMHg4MCA8PCAoMjQgLSBsICUgMzIpO1xuICBtWygobCArIDY0ID4+IDkpIDw8IDQpICsgMTVdID0gbDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtLmxlbmd0aDsgaSArPSAxNikge1xuICAgIGEgPSBIQVNIWzBdOyBiID0gSEFTSFsxXTsgYyA9IEhBU0hbMl07IGQgPSBIQVNIWzNdOyBlID0gSEFTSFs0XTsgZiA9IEhBU0hbNV07IGcgPSBIQVNIWzZdOyBoID0gSEFTSFs3XTtcbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IDY0OyBqKyspIHtcbiAgICAgIGlmIChqIDwgMTYpIHtcbiAgICAgICAgV1tqXSA9IG1baiArIGldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgV1tqXSA9IHNhZmVfYWRkKHNhZmVfYWRkKHNhZmVfYWRkKEdhbW1hMTI1NihXW2ogLSAyXSksIFdbaiAtIDddKSwgR2FtbWEwMjU2KFdbaiAtIDE1XSkpLCBXW2ogLSAxNl0pO1xuICAgICAgfVxuICAgICAgVDEgPSBzYWZlX2FkZChzYWZlX2FkZChzYWZlX2FkZChzYWZlX2FkZChoLCBTaWdtYTEyNTYoZSkpLCBDaChlLCBmLCBnKSksIEtbal0pLCBXW2pdKTtcbiAgICAgIFQyID0gc2FmZV9hZGQoU2lnbWEwMjU2KGEpLCBNYWooYSwgYiwgYykpO1xuICAgICAgaCA9IGc7IGcgPSBmOyBmID0gZTsgZSA9IHNhZmVfYWRkKGQsIFQxKTsgZCA9IGM7IGMgPSBiOyBiID0gYTsgYSA9IHNhZmVfYWRkKFQxLCBUMik7XG4gICAgfVxuICAgIEhBU0hbMF0gPSBzYWZlX2FkZChhLCBIQVNIWzBdKTsgSEFTSFsxXSA9IHNhZmVfYWRkKGIsIEhBU0hbMV0pOyBIQVNIWzJdID0gc2FmZV9hZGQoYywgSEFTSFsyXSk7IEhBU0hbM10gPSBzYWZlX2FkZChkLCBIQVNIWzNdKTtcbiAgICBIQVNIWzRdID0gc2FmZV9hZGQoZSwgSEFTSFs0XSk7IEhBU0hbNV0gPSBzYWZlX2FkZChmLCBIQVNIWzVdKTsgSEFTSFs2XSA9IHNhZmVfYWRkKGcsIEhBU0hbNl0pOyBIQVNIWzddID0gc2FmZV9hZGQoaCwgSEFTSFs3XSk7XG4gIH1cbiAgcmV0dXJuIEhBU0g7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNoYTI1NihidWYpIHtcbiAgcmV0dXJuIGhlbHBlcnMuaGFzaChidWYsIGNvcmVfc2hhMjU2LCAzMiwgdHJ1ZSk7XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xudmFyIHVuZGVmaW5lZDtcblxudmFyIGlzUGxhaW5PYmplY3QgPSBmdW5jdGlvbiBpc1BsYWluT2JqZWN0KG9iaikge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0aWYgKCFvYmogfHwgdG9TdHJpbmcuY2FsbChvYmopICE9PSAnW29iamVjdCBPYmplY3RdJyB8fCBvYmoubm9kZVR5cGUgfHwgb2JqLnNldEludGVydmFsKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG5cblx0dmFyIGhhc19vd25fY29uc3RydWN0b3IgPSBoYXNPd24uY2FsbChvYmosICdjb25zdHJ1Y3RvcicpO1xuXHR2YXIgaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCA9IG9iai5jb25zdHJ1Y3RvciAmJiBvYmouY29uc3RydWN0b3IucHJvdG90eXBlICYmIGhhc093bi5jYWxsKG9iai5jb25zdHJ1Y3Rvci5wcm90b3R5cGUsICdpc1Byb3RvdHlwZU9mJyk7XG5cdC8vIE5vdCBvd24gY29uc3RydWN0b3IgcHJvcGVydHkgbXVzdCBiZSBPYmplY3Rcblx0aWYgKG9iai5jb25zdHJ1Y3RvciAmJiAhaGFzX293bl9jb25zdHJ1Y3RvciAmJiAhaGFzX2lzX3Byb3BlcnR5X29mX21ldGhvZCkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8vIE93biBwcm9wZXJ0aWVzIGFyZSBlbnVtZXJhdGVkIGZpcnN0bHksIHNvIHRvIHNwZWVkIHVwLFxuXHQvLyBpZiBsYXN0IG9uZSBpcyBvd24sIHRoZW4gYWxsIHByb3BlcnRpZXMgYXJlIG93bi5cblx0dmFyIGtleTtcblx0Zm9yIChrZXkgaW4gb2JqKSB7fVxuXG5cdHJldHVybiBrZXkgPT09IHVuZGVmaW5lZCB8fCBoYXNPd24uY2FsbChvYmosIGtleSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGV4dGVuZCgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdHZhciBvcHRpb25zLCBuYW1lLCBzcmMsIGNvcHksIGNvcHlJc0FycmF5LCBjbG9uZSxcblx0XHR0YXJnZXQgPSBhcmd1bWVudHNbMF0sXG5cdFx0aSA9IDEsXG5cdFx0bGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aCxcblx0XHRkZWVwID0gZmFsc2U7XG5cblx0Ly8gSGFuZGxlIGEgZGVlcCBjb3B5IHNpdHVhdGlvblxuXHRpZiAodHlwZW9mIHRhcmdldCA9PT0gXCJib29sZWFuXCIpIHtcblx0XHRkZWVwID0gdGFyZ2V0O1xuXHRcdHRhcmdldCA9IGFyZ3VtZW50c1sxXSB8fCB7fTtcblx0XHQvLyBza2lwIHRoZSBib29sZWFuIGFuZCB0aGUgdGFyZ2V0XG5cdFx0aSA9IDI7XG5cdH0gZWxzZSBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgdGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIgfHwgdGFyZ2V0ID09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGFyZ2V0ID0ge307XG5cdH1cblxuXHRmb3IgKDsgaSA8IGxlbmd0aDsgKytpKSB7XG5cdFx0Ly8gT25seSBkZWFsIHdpdGggbm9uLW51bGwvdW5kZWZpbmVkIHZhbHVlc1xuXHRcdGlmICgob3B0aW9ucyA9IGFyZ3VtZW50c1tpXSkgIT0gbnVsbCkge1xuXHRcdFx0Ly8gRXh0ZW5kIHRoZSBiYXNlIG9iamVjdFxuXHRcdFx0Zm9yIChuYW1lIGluIG9wdGlvbnMpIHtcblx0XHRcdFx0c3JjID0gdGFyZ2V0W25hbWVdO1xuXHRcdFx0XHRjb3B5ID0gb3B0aW9uc1tuYW1lXTtcblxuXHRcdFx0XHQvLyBQcmV2ZW50IG5ldmVyLWVuZGluZyBsb29wXG5cdFx0XHRcdGlmICh0YXJnZXQgPT09IGNvcHkpIHtcblx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlY3Vyc2UgaWYgd2UncmUgbWVyZ2luZyBwbGFpbiBvYmplY3RzIG9yIGFycmF5c1xuXHRcdFx0XHRpZiAoZGVlcCAmJiBjb3B5ICYmIChpc1BsYWluT2JqZWN0KGNvcHkpIHx8IChjb3B5SXNBcnJheSA9IEFycmF5LmlzQXJyYXkoY29weSkpKSkge1xuXHRcdFx0XHRcdGlmIChjb3B5SXNBcnJheSkge1xuXHRcdFx0XHRcdFx0Y29weUlzQXJyYXkgPSBmYWxzZTtcblx0XHRcdFx0XHRcdGNsb25lID0gc3JjICYmIEFycmF5LmlzQXJyYXkoc3JjKSA/IHNyYyA6IFtdO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRjbG9uZSA9IHNyYyAmJiBpc1BsYWluT2JqZWN0KHNyYykgPyBzcmMgOiB7fTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBOZXZlciBtb3ZlIG9yaWdpbmFsIG9iamVjdHMsIGNsb25lIHRoZW1cblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBleHRlbmQoZGVlcCwgY2xvbmUsIGNvcHkpO1xuXG5cdFx0XHRcdC8vIERvbid0IGJyaW5nIGluIHVuZGVmaW5lZCB2YWx1ZXNcblx0XHRcdFx0fSBlbHNlIGlmIChjb3B5ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHR0YXJnZXRbbmFtZV0gPSBjb3B5O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0Ly8gUmV0dXJuIHRoZSBtb2RpZmllZCBvYmplY3Rcblx0cmV0dXJuIHRhcmdldDtcbn07XG5cbiIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbi8qIVxuICogUGxhdGZvcm0uanMgdjEuMy4wIDxodHRwOi8vbXRocy5iZS9wbGF0Zm9ybT5cbiAqIENvcHlyaWdodCAyMDEwLTIwMTQgSm9obi1EYXZpZCBEYWx0b24gPGh0dHA6Ly9hbGx5b3VjYW5sZWV0LmNvbS8+XG4gKiBBdmFpbGFibGUgdW5kZXIgTUlUIGxpY2Vuc2UgPGh0dHA6Ly9tdGhzLmJlL21pdD5cbiAqL1xuOyhmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIC8qKiBVc2VkIHRvIGRldGVybWluZSBpZiB2YWx1ZXMgYXJlIG9mIHRoZSBsYW5ndWFnZSB0eXBlIGBPYmplY3RgICovXG4gIHZhciBvYmplY3RUeXBlcyA9IHtcbiAgICAnZnVuY3Rpb24nOiB0cnVlLFxuICAgICdvYmplY3QnOiB0cnVlXG4gIH07XG5cbiAgLyoqIFVzZWQgYXMgYSByZWZlcmVuY2UgdG8gdGhlIGdsb2JhbCBvYmplY3QgKi9cbiAgdmFyIHJvb3QgPSAob2JqZWN0VHlwZXNbdHlwZW9mIHdpbmRvd10gJiYgd2luZG93KSB8fCB0aGlzO1xuXG4gIC8qKiBCYWNrdXAgcG9zc2libGUgZ2xvYmFsIG9iamVjdCAqL1xuICB2YXIgb2xkUm9vdCA9IHJvb3Q7XG5cbiAgLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBleHBvcnRzYCAqL1xuICB2YXIgZnJlZUV4cG9ydHMgPSBvYmplY3RUeXBlc1t0eXBlb2YgZXhwb3J0c10gJiYgZXhwb3J0cztcblxuICAvKiogRGV0ZWN0IGZyZWUgdmFyaWFibGUgYG1vZHVsZWAgKi9cbiAgdmFyIGZyZWVNb2R1bGUgPSBvYmplY3RUeXBlc1t0eXBlb2YgbW9kdWxlXSAmJiBtb2R1bGUgJiYgIW1vZHVsZS5ub2RlVHlwZSAmJiBtb2R1bGU7XG5cbiAgLyoqIERldGVjdCBmcmVlIHZhcmlhYmxlIGBnbG9iYWxgIGZyb20gTm9kZS5qcyBvciBCcm93c2VyaWZpZWQgY29kZSBhbmQgdXNlIGl0IGFzIGByb290YCAqL1xuICB2YXIgZnJlZUdsb2JhbCA9IGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUgJiYgdHlwZW9mIGdsb2JhbCA9PSAnb2JqZWN0JyAmJiBnbG9iYWw7XG4gIGlmIChmcmVlR2xvYmFsICYmIChmcmVlR2xvYmFsLmdsb2JhbCA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCB8fCBmcmVlR2xvYmFsLnNlbGYgPT09IGZyZWVHbG9iYWwpKSB7XG4gICAgcm9vdCA9IGZyZWVHbG9iYWw7XG4gIH1cblxuICAvKipcbiAgICogVXNlZCBhcyB0aGUgbWF4aW11bSBsZW5ndGggb2YgYW4gYXJyYXktbGlrZSBvYmplY3QuXG4gICAqIFNlZSB0aGUgW0VTNiBzcGVjXShodHRwOi8vcGVvcGxlLm1vemlsbGEub3JnL35qb3JlbmRvcmZmL2VzNi1kcmFmdC5odG1sI3NlYy10b2xlbmd0aClcbiAgICogZm9yIG1vcmUgZGV0YWlscy5cbiAgICovXG4gIHZhciBtYXhTYWZlSW50ZWdlciA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG5cbiAgLyoqIE9wZXJhIHJlZ2V4cCAqL1xuICB2YXIgcmVPcGVyYSA9IC9cXGJPcGVyYS87XG5cbiAgLyoqIFBvc3NpYmxlIGdsb2JhbCBvYmplY3QgKi9cbiAgdmFyIHRoaXNCaW5kaW5nID0gdGhpcztcblxuICAvKiogVXNlZCBmb3IgbmF0aXZlIG1ldGhvZCByZWZlcmVuY2VzICovXG4gIHZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbiAgLyoqIFVzZWQgdG8gY2hlY2sgZm9yIG93biBwcm9wZXJ0aWVzIG9mIGFuIG9iamVjdCAqL1xuICB2YXIgaGFzT3duUHJvcGVydHkgPSBvYmplY3RQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvKiogVXNlZCB0byByZXNvbHZlIHRoZSBpbnRlcm5hbCBgW1tDbGFzc11dYCBvZiB2YWx1ZXMgKi9cbiAgdmFyIHRvU3RyaW5nID0gb2JqZWN0UHJvdG8udG9TdHJpbmc7XG5cbiAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cbiAgLyoqXG4gICAqIENhcGl0YWxpemVzIGEgc3RyaW5nIHZhbHVlLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gY2FwaXRhbGl6ZS5cbiAgICogQHJldHVybnMge3N0cmluZ30gVGhlIGNhcGl0YWxpemVkIHN0cmluZy5cbiAgICovXG4gIGZ1bmN0aW9uIGNhcGl0YWxpemUoc3RyaW5nKSB7XG4gICAgc3RyaW5nID0gU3RyaW5nKHN0cmluZyk7XG4gICAgcmV0dXJuIHN0cmluZy5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHN0cmluZy5zbGljZSgxKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIHV0aWxpdHkgZnVuY3Rpb24gdG8gY2xlYW4gdXAgdGhlIE9TIG5hbWUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBvcyBUaGUgT1MgbmFtZSB0byBjbGVhbiB1cC5cbiAgICogQHBhcmFtIHtzdHJpbmd9IFtwYXR0ZXJuXSBBIGBSZWdFeHBgIHBhdHRlcm4gbWF0Y2hpbmcgdGhlIE9TIG5hbWUuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbbGFiZWxdIEEgbGFiZWwgZm9yIHRoZSBPUy5cbiAgICovXG4gIGZ1bmN0aW9uIGNsZWFudXBPUyhvcywgcGF0dGVybiwgbGFiZWwpIHtcbiAgICAvLyBwbGF0Zm9ybSB0b2tlbnMgZGVmaW5lZCBhdFxuICAgIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczUzNzUwMyhWUy44NSkuYXNweFxuICAgIC8vIGh0dHA6Ly93ZWIuYXJjaGl2ZS5vcmcvd2ViLzIwMDgxMTIyMDUzOTUwL2h0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9tczUzNzUwMyhWUy44NSkuYXNweFxuICAgIHZhciBkYXRhID0ge1xuICAgICAgJzYuNCc6ICAnMTAnLFxuICAgICAgJzYuMyc6ICAnOC4xJyxcbiAgICAgICc2LjInOiAgJzgnLFxuICAgICAgJzYuMSc6ICAnU2VydmVyIDIwMDggUjIgLyA3JyxcbiAgICAgICc2LjAnOiAgJ1NlcnZlciAyMDA4IC8gVmlzdGEnLFxuICAgICAgJzUuMic6ICAnU2VydmVyIDIwMDMgLyBYUCA2NC1iaXQnLFxuICAgICAgJzUuMSc6ICAnWFAnLFxuICAgICAgJzUuMDEnOiAnMjAwMCBTUDEnLFxuICAgICAgJzUuMCc6ICAnMjAwMCcsXG4gICAgICAnNC4wJzogICdOVCcsXG4gICAgICAnNC45MCc6ICdNRSdcbiAgICB9O1xuICAgIC8vIGRldGVjdCBXaW5kb3dzIHZlcnNpb24gZnJvbSBwbGF0Zm9ybSB0b2tlbnNcbiAgICBpZiAocGF0dGVybiAmJiBsYWJlbCAmJiAvXldpbi9pLnRlc3Qob3MpICYmXG4gICAgICAgIChkYXRhID0gZGF0YVswLypPcGVyYSA5LjI1IGZpeCovLCAvW1xcZC5dKyQvLmV4ZWMob3MpXSkpIHtcbiAgICAgIG9zID0gJ1dpbmRvd3MgJyArIGRhdGE7XG4gICAgfVxuICAgIC8vIGNvcnJlY3QgY2hhcmFjdGVyIGNhc2UgYW5kIGNsZWFudXBcbiAgICBvcyA9IFN0cmluZyhvcyk7XG5cbiAgICBpZiAocGF0dGVybiAmJiBsYWJlbCkge1xuICAgICAgb3MgPSBvcy5yZXBsYWNlKFJlZ0V4cChwYXR0ZXJuLCAnaScpLCBsYWJlbCk7XG4gICAgfVxuXG4gICAgb3MgPSBmb3JtYXQoXG4gICAgICBvcy5yZXBsYWNlKC8gY2UkL2ksICcgQ0UnKVxuICAgICAgICAucmVwbGFjZSgvXFxiaHB3L2ksICd3ZWInKVxuICAgICAgICAucmVwbGFjZSgvXFxiTWFjaW50b3NoXFxiLywgJ01hYyBPUycpXG4gICAgICAgIC5yZXBsYWNlKC9fUG93ZXJQQ1xcYi9pLCAnIE9TJylcbiAgICAgICAgLnJlcGxhY2UoL1xcYihPUyBYKSBbXiBcXGRdKy9pLCAnJDEnKVxuICAgICAgICAucmVwbGFjZSgvXFxiTWFjIChPUyBYKVxcYi8sICckMScpXG4gICAgICAgIC5yZXBsYWNlKC9cXC8oXFxkKS8sICcgJDEnKVxuICAgICAgICAucmVwbGFjZSgvXy9nLCAnLicpXG4gICAgICAgIC5yZXBsYWNlKC8oPzogQmVQQ3xbIC5dKmZjWyBcXGQuXSspJC9pLCAnJylcbiAgICAgICAgLnJlcGxhY2UoL1xcYng4NlxcLjY0XFxiL2dpLCAneDg2XzY0JylcbiAgICAgICAgLnJlcGxhY2UoL1xcYihXaW5kb3dzIFBob25lKSBPU1xcYi8sICckMScpXG4gICAgICAgIC5zcGxpdCgnIG9uICcpWzBdXG4gICAgKTtcblxuICAgIHJldHVybiBvcztcbiAgfVxuXG4gIC8qKlxuICAgKiBBbiBpdGVyYXRpb24gdXRpbGl0eSBmb3IgYXJyYXlzIGFuZCBvYmplY3RzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge0FycmF5fE9iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gY2FsbGVkIHBlciBpdGVyYXRpb24uXG4gICAqL1xuICBmdW5jdGlvbiBlYWNoKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICB2YXIgaW5kZXggPSAtMSxcbiAgICAgICAgbGVuZ3RoID0gb2JqZWN0ID8gb2JqZWN0Lmxlbmd0aCA6IDA7XG5cbiAgICBpZiAodHlwZW9mIGxlbmd0aCA9PSAnbnVtYmVyJyAmJiBsZW5ndGggPiAtMSAmJiBsZW5ndGggPD0gbWF4U2FmZUludGVnZXIpIHtcbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtpbmRleF0sIGluZGV4LCBvYmplY3QpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3JPd24ob2JqZWN0LCBjYWxsYmFjayk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRyaW0gYW5kIGNvbmRpdGlvbmFsbHkgY2FwaXRhbGl6ZSBzdHJpbmcgdmFsdWVzLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gZm9ybWF0LlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHN0cmluZy5cbiAgICovXG4gIGZ1bmN0aW9uIGZvcm1hdChzdHJpbmcpIHtcbiAgICBzdHJpbmcgPSB0cmltKHN0cmluZyk7XG4gICAgcmV0dXJuIC9eKD86d2ViT1N8aSg/Ok9TfFApKS8udGVzdChzdHJpbmcpXG4gICAgICA/IHN0cmluZ1xuICAgICAgOiBjYXBpdGFsaXplKHN0cmluZyk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciBhbiBvYmplY3QncyBvd24gcHJvcGVydGllcywgZXhlY3V0aW5nIHRoZSBgY2FsbGJhY2tgIGZvciBlYWNoLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IFRoZSBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBUaGUgZnVuY3Rpb24gZXhlY3V0ZWQgcGVyIG93biBwcm9wZXJ0eS5cbiAgICovXG4gIGZ1bmN0aW9uIGZvck93bihvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgZm9yICh2YXIga2V5IGluIG9iamVjdCkge1xuICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwob2JqZWN0LCBrZXkpKSB7XG4gICAgICAgIGNhbGxiYWNrKG9iamVjdFtrZXldLCBrZXksIG9iamVjdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIGludGVybmFsIGBbW0NsYXNzXV1gIG9mIGEgdmFsdWUuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gdmFsdWUgVGhlIHZhbHVlLlxuICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgYFtbQ2xhc3NdXWAuXG4gICAqL1xuICBmdW5jdGlvbiBnZXRDbGFzc09mKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09IG51bGxcbiAgICAgID8gY2FwaXRhbGl6ZSh2YWx1ZSlcbiAgICAgIDogdG9TdHJpbmcuY2FsbCh2YWx1ZSkuc2xpY2UoOCwgLTEpO1xuICB9XG5cbiAgLyoqXG4gICAqIEhvc3Qgb2JqZWN0cyBjYW4gcmV0dXJuIHR5cGUgdmFsdWVzIHRoYXQgYXJlIGRpZmZlcmVudCBmcm9tIHRoZWlyIGFjdHVhbFxuICAgKiBkYXRhIHR5cGUuIFRoZSBvYmplY3RzIHdlIGFyZSBjb25jZXJuZWQgd2l0aCB1c3VhbGx5IHJldHVybiBub24tcHJpbWl0aXZlXG4gICAqIHR5cGVzIG9mIFwib2JqZWN0XCIsIFwiZnVuY3Rpb25cIiwgb3IgXCJ1bmtub3duXCIuXG4gICAqXG4gICAqIEBwcml2YXRlXG4gICAqIEBwYXJhbSB7Kn0gb2JqZWN0IFRoZSBvd25lciBvZiB0aGUgcHJvcGVydHkuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSBUaGUgcHJvcGVydHkgdG8gY2hlY2suXG4gICAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgcHJvcGVydHkgdmFsdWUgaXMgYSBub24tcHJpbWl0aXZlLCBlbHNlIGBmYWxzZWAuXG4gICAqL1xuICBmdW5jdGlvbiBpc0hvc3RUeXBlKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICB2YXIgdHlwZSA9IG9iamVjdCAhPSBudWxsID8gdHlwZW9mIG9iamVjdFtwcm9wZXJ0eV0gOiAnbnVtYmVyJztcbiAgICByZXR1cm4gIS9eKD86Ym9vbGVhbnxudW1iZXJ8c3RyaW5nfHVuZGVmaW5lZCkkLy50ZXN0KHR5cGUpICYmXG4gICAgICAodHlwZSA9PSAnb2JqZWN0JyA/ICEhb2JqZWN0W3Byb3BlcnR5XSA6IHRydWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByZXBhcmVzIGEgc3RyaW5nIGZvciB1c2UgaW4gYSBgUmVnRXhwYCBieSBtYWtpbmcgaHlwaGVucyBhbmQgc3BhY2VzIG9wdGlvbmFsLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gcXVhbGlmeS5cbiAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHF1YWxpZmllZCBzdHJpbmcuXG4gICAqL1xuICBmdW5jdGlvbiBxdWFsaWZ5KHN0cmluZykge1xuICAgIHJldHVybiBTdHJpbmcoc3RyaW5nKS5yZXBsYWNlKC8oWyAtXSkoPyEkKS9nLCAnJDE/Jyk7XG4gIH1cblxuICAvKipcbiAgICogQSBiYXJlLWJvbmVzIGBBcnJheSNyZWR1Y2VgIGxpa2UgdXRpbGl0eSBmdW5jdGlvbi5cbiAgICpcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIGNhbGxlZCBwZXIgaXRlcmF0aW9uLlxuICAgKiBAcmV0dXJucyB7Kn0gVGhlIGFjY3VtdWxhdGVkIHJlc3VsdC5cbiAgICovXG4gIGZ1bmN0aW9uIHJlZHVjZShhcnJheSwgY2FsbGJhY2spIHtcbiAgICB2YXIgYWNjdW11bGF0b3IgPSBudWxsO1xuICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgYWNjdW11bGF0b3IgPSBjYWxsYmFjayhhY2N1bXVsYXRvciwgdmFsdWUsIGluZGV4LCBhcnJheSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3VtdWxhdG9yO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgbGVhZGluZyBhbmQgdHJhaWxpbmcgd2hpdGVzcGFjZSBmcm9tIGEgc3RyaW5nLlxuICAgKlxuICAgKiBAcHJpdmF0ZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFRoZSBzdHJpbmcgdG8gdHJpbS5cbiAgICogQHJldHVybnMge3N0cmluZ30gVGhlIHRyaW1tZWQgc3RyaW5nLlxuICAgKi9cbiAgZnVuY3Rpb24gdHJpbShzdHJpbmcpIHtcbiAgICByZXR1cm4gU3RyaW5nKHN0cmluZykucmVwbGFjZSgvXiArfCArJC9nLCAnJyk7XG4gIH1cblxuICAvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAvKipcbiAgICogQ3JlYXRlcyBhIG5ldyBwbGF0Zm9ybSBvYmplY3QuXG4gICAqXG4gICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgKiBAcGFyYW0ge09iamVjdHxzdHJpbmd9IFt1YT1uYXZpZ2F0b3IudXNlckFnZW50XSBUaGUgdXNlciBhZ2VudCBzdHJpbmcgb3JcbiAgICogIGNvbnRleHQgb2JqZWN0LlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBIHBsYXRmb3JtIG9iamVjdC5cbiAgICovXG4gIGZ1bmN0aW9uIHBhcnNlKHVhKSB7XG5cbiAgICAvKiogVGhlIGVudmlyb25tZW50IGNvbnRleHQgb2JqZWN0ICovXG4gICAgdmFyIGNvbnRleHQgPSByb290O1xuXG4gICAgLyoqIFVzZWQgdG8gZmxhZyB3aGVuIGEgY3VzdG9tIGNvbnRleHQgaXMgcHJvdmlkZWQgKi9cbiAgICB2YXIgaXNDdXN0b21Db250ZXh0ID0gdWEgJiYgdHlwZW9mIHVhID09ICdvYmplY3QnICYmIGdldENsYXNzT2YodWEpICE9ICdTdHJpbmcnO1xuXG4gICAgLy8ganVnZ2xlIGFyZ3VtZW50c1xuICAgIGlmIChpc0N1c3RvbUNvbnRleHQpIHtcbiAgICAgIGNvbnRleHQgPSB1YTtcbiAgICAgIHVhID0gbnVsbDtcbiAgICB9XG5cbiAgICAvKiogQnJvd3NlciBuYXZpZ2F0b3Igb2JqZWN0ICovXG4gICAgdmFyIG5hdiA9IGNvbnRleHQubmF2aWdhdG9yIHx8IHt9O1xuXG4gICAgLyoqIEJyb3dzZXIgdXNlciBhZ2VudCBzdHJpbmcgKi9cbiAgICB2YXIgdXNlckFnZW50ID0gbmF2LnVzZXJBZ2VudCB8fCAnJztcblxuICAgIHVhIHx8ICh1YSA9IHVzZXJBZ2VudCk7XG5cbiAgICAvKiogVXNlZCB0byBmbGFnIHdoZW4gYHRoaXNCaW5kaW5nYCBpcyB0aGUgW01vZHVsZVNjb3BlXSAqL1xuICAgIHZhciBpc01vZHVsZVNjb3BlID0gaXNDdXN0b21Db250ZXh0IHx8IHRoaXNCaW5kaW5nID09IG9sZFJvb3Q7XG5cbiAgICAvKiogVXNlZCB0byBkZXRlY3QgaWYgYnJvd3NlciBpcyBsaWtlIENocm9tZSAqL1xuICAgIHZhciBsaWtlQ2hyb21lID0gaXNDdXN0b21Db250ZXh0XG4gICAgICA/ICEhbmF2Lmxpa2VDaHJvbWVcbiAgICAgIDogL1xcYkNocm9tZVxcYi8udGVzdCh1YSkgJiYgIS9pbnRlcm5hbHxcXG4vaS50ZXN0KHRvU3RyaW5nLnRvU3RyaW5nKCkpO1xuXG4gICAgLyoqIEludGVybmFsIGBbW0NsYXNzXV1gIHZhbHVlIHNob3J0Y3V0cyAqL1xuICAgIHZhciBvYmplY3RDbGFzcyA9ICdPYmplY3QnLFxuICAgICAgICBhaXJSdW50aW1lQ2xhc3MgPSBpc0N1c3RvbUNvbnRleHQgPyBvYmplY3RDbGFzcyA6ICdTY3JpcHRCcmlkZ2luZ1Byb3h5T2JqZWN0JyxcbiAgICAgICAgZW52aXJvQ2xhc3MgPSBpc0N1c3RvbUNvbnRleHQgPyBvYmplY3RDbGFzcyA6ICdFbnZpcm9ubWVudCcsXG4gICAgICAgIGphdmFDbGFzcyA9IChpc0N1c3RvbUNvbnRleHQgJiYgY29udGV4dC5qYXZhKSA/ICdKYXZhUGFja2FnZScgOiBnZXRDbGFzc09mKGNvbnRleHQuamF2YSksXG4gICAgICAgIHBoYW50b21DbGFzcyA9IGlzQ3VzdG9tQ29udGV4dCA/IG9iamVjdENsYXNzIDogJ1J1bnRpbWVPYmplY3QnO1xuXG4gICAgLyoqIERldGVjdCBKYXZhIGVudmlyb25tZW50ICovXG4gICAgdmFyIGphdmEgPSAvXFxiSmF2YS8udGVzdChqYXZhQ2xhc3MpICYmIGNvbnRleHQuamF2YTtcblxuICAgIC8qKiBEZXRlY3QgUmhpbm8gKi9cbiAgICB2YXIgcmhpbm8gPSBqYXZhICYmIGdldENsYXNzT2YoY29udGV4dC5lbnZpcm9ubWVudCkgPT0gZW52aXJvQ2xhc3M7XG5cbiAgICAvKiogQSBjaGFyYWN0ZXIgdG8gcmVwcmVzZW50IGFscGhhICovXG4gICAgdmFyIGFscGhhID0gamF2YSA/ICdhJyA6ICdcXHUwM2IxJztcblxuICAgIC8qKiBBIGNoYXJhY3RlciB0byByZXByZXNlbnQgYmV0YSAqL1xuICAgIHZhciBiZXRhID0gamF2YSA/ICdiJyA6ICdcXHUwM2IyJztcblxuICAgIC8qKiBCcm93c2VyIGRvY3VtZW50IG9iamVjdCAqL1xuICAgIHZhciBkb2MgPSBjb250ZXh0LmRvY3VtZW50IHx8IHt9O1xuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0IE9wZXJhIGJyb3dzZXIgKFByZXN0by1iYXNlZClcbiAgICAgKiBodHRwOi8vd3d3Lmhvd3RvY3JlYXRlLmNvLnVrL29wZXJhU3R1ZmYvb3BlcmFPYmplY3QuaHRtbFxuICAgICAqIGh0dHA6Ly9kZXYub3BlcmEuY29tL2FydGljbGVzL3ZpZXcvb3BlcmEtbWluaS13ZWItY29udGVudC1hdXRob3JpbmctZ3VpZGVsaW5lcy8jb3BlcmFtaW5pXG4gICAgICovXG4gICAgdmFyIG9wZXJhID0gY29udGV4dC5vcGVyYW1pbmkgfHwgY29udGV4dC5vcGVyYTtcblxuICAgIC8qKiBPcGVyYSBgW1tDbGFzc11dYCAqL1xuICAgIHZhciBvcGVyYUNsYXNzID0gcmVPcGVyYS50ZXN0KG9wZXJhQ2xhc3MgPSAoaXNDdXN0b21Db250ZXh0ICYmIG9wZXJhKSA/IG9wZXJhWydbW0NsYXNzXV0nXSA6IGdldENsYXNzT2Yob3BlcmEpKVxuICAgICAgPyBvcGVyYUNsYXNzXG4gICAgICA6IChvcGVyYSA9IG51bGwpO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqIFRlbXBvcmFyeSB2YXJpYWJsZSB1c2VkIG92ZXIgdGhlIHNjcmlwdCdzIGxpZmV0aW1lICovXG4gICAgdmFyIGRhdGE7XG5cbiAgICAvKiogVGhlIENQVSBhcmNoaXRlY3R1cmUgKi9cbiAgICB2YXIgYXJjaCA9IHVhO1xuXG4gICAgLyoqIFBsYXRmb3JtIGRlc2NyaXB0aW9uIGFycmF5ICovXG4gICAgdmFyIGRlc2NyaXB0aW9uID0gW107XG5cbiAgICAvKiogUGxhdGZvcm0gYWxwaGEvYmV0YSBpbmRpY2F0b3IgKi9cbiAgICB2YXIgcHJlcmVsZWFzZSA9IG51bGw7XG5cbiAgICAvKiogQSBmbGFnIHRvIGluZGljYXRlIHRoYXQgZW52aXJvbm1lbnQgZmVhdHVyZXMgc2hvdWxkIGJlIHVzZWQgdG8gcmVzb2x2ZSB0aGUgcGxhdGZvcm0gKi9cbiAgICB2YXIgdXNlRmVhdHVyZXMgPSB1YSA9PSB1c2VyQWdlbnQ7XG5cbiAgICAvKiogVGhlIGJyb3dzZXIvZW52aXJvbm1lbnQgdmVyc2lvbiAqL1xuICAgIHZhciB2ZXJzaW9uID0gdXNlRmVhdHVyZXMgJiYgb3BlcmEgJiYgdHlwZW9mIG9wZXJhLnZlcnNpb24gPT0gJ2Z1bmN0aW9uJyAmJiBvcGVyYS52ZXJzaW9uKCk7XG5cbiAgICAvKiogQSBmbGFnIHRvIGluZGljYXRlIGlmIHRoZSBPUyBlbmRzIHdpdGggXCIvIFZlcnNpb25cIiAqL1xuICAgIHZhciBpc1NwZWNpYWxDYXNlZE9TO1xuXG4gICAgLyogRGV0ZWN0YWJsZSBsYXlvdXQgZW5naW5lcyAob3JkZXIgaXMgaW1wb3J0YW50KSAqL1xuICAgIHZhciBsYXlvdXQgPSBnZXRMYXlvdXQoW1xuICAgICAgJ1RyaWRlbnQnLFxuICAgICAgeyAnbGFiZWwnOiAnV2ViS2l0JywgJ3BhdHRlcm4nOiAnQXBwbGVXZWJLaXQnIH0sXG4gICAgICAnaUNhYicsXG4gICAgICAnUHJlc3RvJyxcbiAgICAgICdOZXRGcm9udCcsXG4gICAgICAnVGFzbWFuJyxcbiAgICAgICdLSFRNTCcsXG4gICAgICAnR2Vja28nXG4gICAgXSk7XG5cbiAgICAvKiBEZXRlY3RhYmxlIGJyb3dzZXIgbmFtZXMgKG9yZGVyIGlzIGltcG9ydGFudCkgKi9cbiAgICB2YXIgbmFtZSA9IGdldE5hbWUoW1xuICAgICAgJ0Fkb2JlIEFJUicsXG4gICAgICAnQXJvcmEnLFxuICAgICAgJ0F2YW50IEJyb3dzZXInLFxuICAgICAgJ0JyZWFjaCcsXG4gICAgICAnQ2FtaW5vJyxcbiAgICAgICdFcGlwaGFueScsXG4gICAgICAnRmVubmVjJyxcbiAgICAgICdGbG9jaycsXG4gICAgICAnR2FsZW9uJyxcbiAgICAgICdHcmVlbkJyb3dzZXInLFxuICAgICAgJ2lDYWInLFxuICAgICAgJ0ljZXdlYXNlbCcsXG4gICAgICB7ICdsYWJlbCc6ICdTUldhcmUgSXJvbicsICdwYXR0ZXJuJzogJ0lyb24nIH0sXG4gICAgICAnSy1NZWxlb24nLFxuICAgICAgJ0tvbnF1ZXJvcicsXG4gICAgICAnTHVuYXNjYXBlJyxcbiAgICAgICdNYXh0aG9uJyxcbiAgICAgICdNaWRvcmknLFxuICAgICAgJ05vb2sgQnJvd3NlcicsXG4gICAgICAnUGhhbnRvbUpTJyxcbiAgICAgICdSYXZlbicsXG4gICAgICAnUmVrb25xJyxcbiAgICAgICdSb2NrTWVsdCcsXG4gICAgICAnU2VhTW9ua2V5JyxcbiAgICAgIHsgJ2xhYmVsJzogJ1NpbGsnLCAncGF0dGVybic6ICcoPzpDbG91ZDl8U2lsay1BY2NlbGVyYXRlZCknIH0sXG4gICAgICAnU2xlaXBuaXInLFxuICAgICAgJ1NsaW1Ccm93c2VyJyxcbiAgICAgICdTdW5yaXNlJyxcbiAgICAgICdTd2lmdGZveCcsXG4gICAgICAnV2ViUG9zaXRpdmUnLFxuICAgICAgJ09wZXJhIE1pbmknLFxuICAgICAgeyAnbGFiZWwnOiAnT3BlcmEgTWluaScsICdwYXR0ZXJuJzogJ09QaU9TJyB9LFxuICAgICAgJ09wZXJhJyxcbiAgICAgIHsgJ2xhYmVsJzogJ09wZXJhJywgJ3BhdHRlcm4nOiAnT1BSJyB9LFxuICAgICAgJ0Nocm9tZScsXG4gICAgICB7ICdsYWJlbCc6ICdDaHJvbWUgTW9iaWxlJywgJ3BhdHRlcm4nOiAnKD86Q3JpT1N8Q3JNbyknIH0sXG4gICAgICB7ICdsYWJlbCc6ICdGaXJlZm94JywgJ3BhdHRlcm4nOiAnKD86RmlyZWZveHxNaW5lZmllbGQpJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnSUUnLCAncGF0dGVybic6ICdJRU1vYmlsZScgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0lFJywgJ3BhdHRlcm4nOiAnTVNJRScgfSxcbiAgICAgICdTYWZhcmknXG4gICAgXSk7XG5cbiAgICAvKiBEZXRlY3RhYmxlIHByb2R1Y3RzIChvcmRlciBpcyBpbXBvcnRhbnQpICovXG4gICAgdmFyIHByb2R1Y3QgPSBnZXRQcm9kdWN0KFtcbiAgICAgIHsgJ2xhYmVsJzogJ0JsYWNrQmVycnknLCAncGF0dGVybic6ICdCQjEwJyB9LFxuICAgICAgJ0JsYWNrQmVycnknLFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFMnLCAncGF0dGVybic6ICdHVC1JOTAwMCcgfSxcbiAgICAgIHsgJ2xhYmVsJzogJ0dhbGF4eSBTMicsICdwYXR0ZXJuJzogJ0dULUk5MTAwJyB9LFxuICAgICAgeyAnbGFiZWwnOiAnR2FsYXh5IFMzJywgJ3BhdHRlcm4nOiAnR1QtSTkzMDAnIH0sXG4gICAgICB7ICdsYWJlbCc6ICdHYWxheHkgUzQnLCAncGF0dGVybic6ICdHVC1JOTUwMCcgfSxcbiAgICAgICdHb29nbGUgVFYnLFxuICAgICAgJ0x1bWlhJyxcbiAgICAgICdpUGFkJyxcbiAgICAgICdpUG9kJyxcbiAgICAgICdpUGhvbmUnLFxuICAgICAgJ0tpbmRsZScsXG4gICAgICB7ICdsYWJlbCc6ICdLaW5kbGUgRmlyZScsICdwYXR0ZXJuJzogJyg/OkNsb3VkOXxTaWxrLUFjY2VsZXJhdGVkKScgfSxcbiAgICAgICdOb29rJyxcbiAgICAgICdQbGF5Qm9vaycsXG4gICAgICAnUGxheVN0YXRpb24gNCcsXG4gICAgICAnUGxheVN0YXRpb24gMycsXG4gICAgICAnUGxheVN0YXRpb24gVml0YScsXG4gICAgICAnVG91Y2hQYWQnLFxuICAgICAgJ1RyYW5zZm9ybWVyJyxcbiAgICAgIHsgJ2xhYmVsJzogJ1dpaSBVJywgJ3BhdHRlcm4nOiAnV2lpVScgfSxcbiAgICAgICdXaWknLFxuICAgICAgJ1hib3ggT25lJyxcbiAgICAgIHsgJ2xhYmVsJzogJ1hib3ggMzYwJywgJ3BhdHRlcm4nOiAnWGJveCcgfSxcbiAgICAgICdYb29tJ1xuICAgIF0pO1xuXG4gICAgLyogRGV0ZWN0YWJsZSBtYW51ZmFjdHVyZXJzICovXG4gICAgdmFyIG1hbnVmYWN0dXJlciA9IGdldE1hbnVmYWN0dXJlcih7XG4gICAgICAnQXBwbGUnOiB7ICdpUGFkJzogMSwgJ2lQaG9uZSc6IDEsICdpUG9kJzogMSB9LFxuICAgICAgJ0FtYXpvbic6IHsgJ0tpbmRsZSc6IDEsICdLaW5kbGUgRmlyZSc6IDEgfSxcbiAgICAgICdBc3VzJzogeyAnVHJhbnNmb3JtZXInOiAxIH0sXG4gICAgICAnQmFybmVzICYgTm9ibGUnOiB7ICdOb29rJzogMSB9LFxuICAgICAgJ0JsYWNrQmVycnknOiB7ICdQbGF5Qm9vayc6IDEgfSxcbiAgICAgICdHb29nbGUnOiB7ICdHb29nbGUgVFYnOiAxIH0sXG4gICAgICAnSFAnOiB7ICdUb3VjaFBhZCc6IDEgfSxcbiAgICAgICdIVEMnOiB7fSxcbiAgICAgICdMRyc6IHt9LFxuICAgICAgJ01pY3Jvc29mdCc6IHsgJ1hib3gnOiAxLCAnWGJveCBPbmUnOiAxIH0sXG4gICAgICAnTW90b3JvbGEnOiB7ICdYb29tJzogMSB9LFxuICAgICAgJ05pbnRlbmRvJzogeyAnV2lpIFUnOiAxLCAgJ1dpaSc6IDEgfSxcbiAgICAgICdOb2tpYSc6IHsgJ0x1bWlhJzogMSB9LFxuICAgICAgJ1NhbXN1bmcnOiB7ICdHYWxheHkgUyc6IDEsICdHYWxheHkgUzInOiAxLCAnR2FsYXh5IFMzJzogMSwgJ0dhbGF4eSBTNCc6IDEgfSxcbiAgICAgICdTb255JzogeyAnUGxheVN0YXRpb24gNCc6IDEsICdQbGF5U3RhdGlvbiAzJzogMSwgJ1BsYXlTdGF0aW9uIFZpdGEnOiAxIH1cbiAgICB9KTtcblxuICAgIC8qIERldGVjdGFibGUgT1NlcyAob3JkZXIgaXMgaW1wb3J0YW50KSAqL1xuICAgIHZhciBvcyA9IGdldE9TKFtcbiAgICAgICdXaW5kb3dzIFBob25lICcsXG4gICAgICAnQW5kcm9pZCcsXG4gICAgICAnQ2VudE9TJyxcbiAgICAgICdEZWJpYW4nLFxuICAgICAgJ0ZlZG9yYScsXG4gICAgICAnRnJlZUJTRCcsXG4gICAgICAnR2VudG9vJyxcbiAgICAgICdIYWlrdScsXG4gICAgICAnS3VidW50dScsXG4gICAgICAnTGludXggTWludCcsXG4gICAgICAnUmVkIEhhdCcsXG4gICAgICAnU3VTRScsXG4gICAgICAnVWJ1bnR1JyxcbiAgICAgICdYdWJ1bnR1JyxcbiAgICAgICdDeWd3aW4nLFxuICAgICAgJ1N5bWJpYW4gT1MnLFxuICAgICAgJ2hwd09TJyxcbiAgICAgICd3ZWJPUyAnLFxuICAgICAgJ3dlYk9TJyxcbiAgICAgICdUYWJsZXQgT1MnLFxuICAgICAgJ0xpbnV4JyxcbiAgICAgICdNYWMgT1MgWCcsXG4gICAgICAnTWFjaW50b3NoJyxcbiAgICAgICdNYWMnLFxuICAgICAgJ1dpbmRvd3MgOTg7JyxcbiAgICAgICdXaW5kb3dzICdcbiAgICBdKTtcblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8qKlxuICAgICAqIFBpY2tzIHRoZSBsYXlvdXQgZW5naW5lIGZyb20gYW4gYXJyYXkgb2YgZ3Vlc3Nlcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gZ3Vlc3NlcyBBbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqIEByZXR1cm5zIHtudWxsfHN0cmluZ30gVGhlIGRldGVjdGVkIGxheW91dCBlbmdpbmUuXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0TGF5b3V0KGd1ZXNzZXMpIHtcbiAgICAgIHJldHVybiByZWR1Y2UoZ3Vlc3NlcywgZnVuY3Rpb24ocmVzdWx0LCBndWVzcykge1xuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IFJlZ0V4cCgnXFxcXGInICsgKFxuICAgICAgICAgIGd1ZXNzLnBhdHRlcm4gfHwgcXVhbGlmeShndWVzcylcbiAgICAgICAgKSArICdcXFxcYicsICdpJykuZXhlYyh1YSkgJiYgKGd1ZXNzLmxhYmVsIHx8IGd1ZXNzKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBpY2tzIHRoZSBtYW51ZmFjdHVyZXIgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIG9iamVjdCBvZiBndWVzc2VzLlxuICAgICAqIEByZXR1cm5zIHtudWxsfHN0cmluZ30gVGhlIGRldGVjdGVkIG1hbnVmYWN0dXJlci5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRNYW51ZmFjdHVyZXIoZ3Vlc3Nlcykge1xuICAgICAgcmV0dXJuIHJlZHVjZShndWVzc2VzLCBmdW5jdGlvbihyZXN1bHQsIHZhbHVlLCBrZXkpIHtcbiAgICAgICAgLy8gbG9va3VwIHRoZSBtYW51ZmFjdHVyZXIgYnkgcHJvZHVjdCBvciBzY2FuIHRoZSBVQSBmb3IgdGhlIG1hbnVmYWN0dXJlclxuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IChcbiAgICAgICAgICB2YWx1ZVtwcm9kdWN0XSB8fFxuICAgICAgICAgIHZhbHVlWzAvKk9wZXJhIDkuMjUgZml4Ki8sIC9eW2Etel0rKD86ICtbYS16XStcXGIpKi9pLmV4ZWMocHJvZHVjdCldIHx8XG4gICAgICAgICAgUmVnRXhwKCdcXFxcYicgKyBxdWFsaWZ5KGtleSkgKyAnKD86XFxcXGJ8XFxcXHcqXFxcXGQpJywgJ2knKS5leGVjKHVhKVxuICAgICAgICApICYmIGtleTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFBpY2tzIHRoZSBicm93c2VyIG5hbWUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgYnJvd3NlciBuYW1lLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGdldE5hbWUoZ3Vlc3Nlcykge1xuICAgICAgcmV0dXJuIHJlZHVjZShndWVzc2VzLCBmdW5jdGlvbihyZXN1bHQsIGd1ZXNzKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQgfHwgUmVnRXhwKCdcXFxcYicgKyAoXG4gICAgICAgICAgZ3Vlc3MucGF0dGVybiB8fCBxdWFsaWZ5KGd1ZXNzKVxuICAgICAgICApICsgJ1xcXFxiJywgJ2knKS5leGVjKHVhKSAmJiAoZ3Vlc3MubGFiZWwgfHwgZ3Vlc3MpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUGlja3MgdGhlIE9TIG5hbWUgZnJvbSBhbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqXG4gICAgICogQHByaXZhdGVcbiAgICAgKiBAcGFyYW0ge0FycmF5fSBndWVzc2VzIEFuIGFycmF5IG9mIGd1ZXNzZXMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgT1MgbmFtZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRPUyhndWVzc2VzKSB7XG4gICAgICByZXR1cm4gcmVkdWNlKGd1ZXNzZXMsIGZ1bmN0aW9uKHJlc3VsdCwgZ3Vlc3MpIHtcbiAgICAgICAgdmFyIHBhdHRlcm4gPSBndWVzcy5wYXR0ZXJuIHx8IHF1YWxpZnkoZ3Vlc3MpO1xuICAgICAgICBpZiAoIXJlc3VsdCAmJiAocmVzdWx0ID1cbiAgICAgICAgICAgICAgUmVnRXhwKCdcXFxcYicgKyBwYXR0ZXJuICsgJyg/Oi9bXFxcXGQuXSt8WyBcXFxcdy5dKiknLCAnaScpLmV4ZWModWEpXG4gICAgICAgICAgICApKSB7XG4gICAgICAgICAgcmVzdWx0ID0gY2xlYW51cE9TKHJlc3VsdCwgcGF0dGVybiwgZ3Vlc3MubGFiZWwgfHwgZ3Vlc3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBQaWNrcyB0aGUgcHJvZHVjdCBuYW1lIGZyb20gYW4gYXJyYXkgb2YgZ3Vlc3Nlcy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gZ3Vlc3NlcyBBbiBhcnJheSBvZiBndWVzc2VzLlxuICAgICAqIEByZXR1cm5zIHtudWxsfHN0cmluZ30gVGhlIGRldGVjdGVkIHByb2R1Y3QgbmFtZS5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRQcm9kdWN0KGd1ZXNzZXMpIHtcbiAgICAgIHJldHVybiByZWR1Y2UoZ3Vlc3NlcywgZnVuY3Rpb24ocmVzdWx0LCBndWVzcykge1xuICAgICAgICB2YXIgcGF0dGVybiA9IGd1ZXNzLnBhdHRlcm4gfHwgcXVhbGlmeShndWVzcyk7XG4gICAgICAgIGlmICghcmVzdWx0ICYmIChyZXN1bHQgPVxuICAgICAgICAgICAgICBSZWdFeHAoJ1xcXFxiJyArIHBhdHRlcm4gKyAnICpcXFxcZCtbLlxcXFx3X10qJywgJ2knKS5leGVjKHVhKSB8fFxuICAgICAgICAgICAgICBSZWdFeHAoJ1xcXFxiJyArIHBhdHRlcm4gKyAnKD86OyAqKD86W2Etel0rW18tXSk/W2Etel0rXFxcXGQrfFteICgpOy1dKiknLCAnaScpLmV4ZWModWEpXG4gICAgICAgICAgICApKSB7XG4gICAgICAgICAgLy8gc3BsaXQgYnkgZm9yd2FyZCBzbGFzaCBhbmQgYXBwZW5kIHByb2R1Y3QgdmVyc2lvbiBpZiBuZWVkZWRcbiAgICAgICAgICBpZiAoKHJlc3VsdCA9IFN0cmluZygoZ3Vlc3MubGFiZWwgJiYgIVJlZ0V4cChwYXR0ZXJuLCAnaScpLnRlc3QoZ3Vlc3MubGFiZWwpKSA/IGd1ZXNzLmxhYmVsIDogcmVzdWx0KS5zcGxpdCgnLycpKVsxXSAmJiAhL1tcXGQuXSsvLnRlc3QocmVzdWx0WzBdKSkge1xuICAgICAgICAgICAgcmVzdWx0WzBdICs9ICcgJyArIHJlc3VsdFsxXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY29ycmVjdCBjaGFyYWN0ZXIgY2FzZSBhbmQgY2xlYW51cFxuICAgICAgICAgIGd1ZXNzID0gZ3Vlc3MubGFiZWwgfHwgZ3Vlc3M7XG4gICAgICAgICAgcmVzdWx0ID0gZm9ybWF0KHJlc3VsdFswXVxuICAgICAgICAgICAgLnJlcGxhY2UoUmVnRXhwKHBhdHRlcm4sICdpJyksIGd1ZXNzKVxuICAgICAgICAgICAgLnJlcGxhY2UoUmVnRXhwKCc7ICooPzonICsgZ3Vlc3MgKyAnW18tXSk/JywgJ2knKSwgJyAnKVxuICAgICAgICAgICAgLnJlcGxhY2UoUmVnRXhwKCcoJyArIGd1ZXNzICsgJylbLV8uXT8oXFxcXHcpJywgJ2knKSwgJyQxICQyJykpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBSZXNvbHZlcyB0aGUgdmVyc2lvbiB1c2luZyBhbiBhcnJheSBvZiBVQSBwYXR0ZXJucy5cbiAgICAgKlxuICAgICAqIEBwcml2YXRlXG4gICAgICogQHBhcmFtIHtBcnJheX0gcGF0dGVybnMgQW4gYXJyYXkgb2YgVUEgcGF0dGVybnMuXG4gICAgICogQHJldHVybnMge251bGx8c3RyaW5nfSBUaGUgZGV0ZWN0ZWQgdmVyc2lvbi5cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBnZXRWZXJzaW9uKHBhdHRlcm5zKSB7XG4gICAgICByZXR1cm4gcmVkdWNlKHBhdHRlcm5zLCBmdW5jdGlvbihyZXN1bHQsIHBhdHRlcm4pIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCAoUmVnRXhwKHBhdHRlcm4gK1xuICAgICAgICAgICcoPzotW1xcXFxkLl0rL3woPzogZm9yIFtcXFxcdy1dKyk/WyAvLV0pKFtcXFxcZC5dK1teICgpOy9fLV0qKScsICdpJykuZXhlYyh1YSkgfHwgMClbMV0gfHwgbnVsbDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgYHBsYXRmb3JtLmRlc2NyaXB0aW9uYCB3aGVuIHRoZSBwbGF0Zm9ybSBvYmplY3QgaXMgY29lcmNlZCB0byBhIHN0cmluZy5cbiAgICAgKlxuICAgICAqIEBuYW1lIHRvU3RyaW5nXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmV0dXJucyBgcGxhdGZvcm0uZGVzY3JpcHRpb25gIGlmIGF2YWlsYWJsZSwgZWxzZSBhbiBlbXB0eSBzdHJpbmcuXG4gICAgICovXG4gICAgZnVuY3Rpb24gdG9TdHJpbmdQbGF0Zm9ybSgpIHtcbiAgICAgIHJldHVybiB0aGlzLmRlc2NyaXB0aW9uIHx8ICcnO1xuICAgIH1cblxuICAgIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuICAgIC8vIGNvbnZlcnQgbGF5b3V0IHRvIGFuIGFycmF5IHNvIHdlIGNhbiBhZGQgZXh0cmEgZGV0YWlsc1xuICAgIGxheW91dCAmJiAobGF5b3V0ID0gW2xheW91dF0pO1xuXG4gICAgLy8gZGV0ZWN0IHByb2R1Y3QgbmFtZXMgdGhhdCBjb250YWluIHRoZWlyIG1hbnVmYWN0dXJlcidzIG5hbWVcbiAgICBpZiAobWFudWZhY3R1cmVyICYmICFwcm9kdWN0KSB7XG4gICAgICBwcm9kdWN0ID0gZ2V0UHJvZHVjdChbbWFudWZhY3R1cmVyXSk7XG4gICAgfVxuICAgIC8vIGNsZWFuIHVwIEdvb2dsZSBUVlxuICAgIGlmICgoZGF0YSA9IC9cXGJHb29nbGUgVFZcXGIvLmV4ZWMocHJvZHVjdCkpKSB7XG4gICAgICBwcm9kdWN0ID0gZGF0YVswXTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IHNpbXVsYXRvcnNcbiAgICBpZiAoL1xcYlNpbXVsYXRvclxcYi9pLnRlc3QodWEpKSB7XG4gICAgICBwcm9kdWN0ID0gKHByb2R1Y3QgPyBwcm9kdWN0ICsgJyAnIDogJycpICsgJ1NpbXVsYXRvcic7XG4gICAgfVxuICAgIC8vIGRldGVjdCBPcGVyYSBNaW5pIDgrIHJ1bm5pbmcgaW4gVHVyYm8vVW5jb21wcmVzc2VkIG1vZGUgb24gaU9TXG4gICAgaWYgKG5hbWUgPT0gJ09wZXJhIE1pbmknICYmIC9cXGJPUGlPU1xcYi8udGVzdCh1YSkpIHtcbiAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ3J1bm5pbmcgaW4gVHVyYm8vVW5jb21wcmVzc2VkIG1vZGUnKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IGlPU1xuICAgIGlmICgvXmlQLy50ZXN0KHByb2R1Y3QpKSB7XG4gICAgICBuYW1lIHx8IChuYW1lID0gJ1NhZmFyaScpO1xuICAgICAgb3MgPSAnaU9TJyArICgoZGF0YSA9IC8gT1MgKFtcXGRfXSspL2kuZXhlYyh1YSkpXG4gICAgICAgID8gJyAnICsgZGF0YVsxXS5yZXBsYWNlKC9fL2csICcuJylcbiAgICAgICAgOiAnJyk7XG4gICAgfVxuICAgIC8vIGRldGVjdCBLdWJ1bnR1XG4gICAgZWxzZSBpZiAobmFtZSA9PSAnS29ucXVlcm9yJyAmJiAhL2J1bnR1L2kudGVzdChvcykpIHtcbiAgICAgIG9zID0gJ0t1YnVudHUnO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgQW5kcm9pZCBicm93c2Vyc1xuICAgIGVsc2UgaWYgKG1hbnVmYWN0dXJlciAmJiBtYW51ZmFjdHVyZXIgIT0gJ0dvb2dsZScgJiZcbiAgICAgICAgKCgvQ2hyb21lLy50ZXN0KG5hbWUpICYmICEvXFxiTW9iaWxlIFNhZmFyaVxcYi9pLnRlc3QodWEpKSB8fCAvXFxiVml0YVxcYi8udGVzdChwcm9kdWN0KSkpIHtcbiAgICAgIG5hbWUgPSAnQW5kcm9pZCBCcm93c2VyJztcbiAgICAgIG9zID0gL1xcYkFuZHJvaWRcXGIvLnRlc3Qob3MpID8gb3MgOiAnQW5kcm9pZCc7XG4gICAgfVxuICAgIC8vIGRldGVjdCBmYWxzZSBwb3NpdGl2ZXMgZm9yIEZpcmVmb3gvU2FmYXJpXG4gICAgZWxzZSBpZiAoIW5hbWUgfHwgKGRhdGEgPSAhL1xcYk1pbmVmaWVsZFxcYnxcXChBbmRyb2lkOy9pLnRlc3QodWEpICYmIC9cXGIoPzpGaXJlZm94fFNhZmFyaSlcXGIvLmV4ZWMobmFtZSkpKSB7XG4gICAgICAvLyBlc2NhcGUgdGhlIGAvYCBmb3IgRmlyZWZveCAxXG4gICAgICBpZiAobmFtZSAmJiAhcHJvZHVjdCAmJiAvW1xcLyxdfF5bXihdKz9cXCkvLnRlc3QodWEuc2xpY2UodWEuaW5kZXhPZihkYXRhICsgJy8nKSArIDgpKSkge1xuICAgICAgICAvLyBjbGVhciBuYW1lIG9mIGZhbHNlIHBvc2l0aXZlc1xuICAgICAgICBuYW1lID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIHJlYXNzaWduIGEgZ2VuZXJpYyBuYW1lXG4gICAgICBpZiAoKGRhdGEgPSBwcm9kdWN0IHx8IG1hbnVmYWN0dXJlciB8fCBvcykgJiZcbiAgICAgICAgICAocHJvZHVjdCB8fCBtYW51ZmFjdHVyZXIgfHwgL1xcYig/OkFuZHJvaWR8U3ltYmlhbiBPU3xUYWJsZXQgT1N8d2ViT1MpXFxiLy50ZXN0KG9zKSkpIHtcbiAgICAgICAgbmFtZSA9IC9bYS16XSsoPzogSGF0KT8vaS5leGVjKC9cXGJBbmRyb2lkXFxiLy50ZXN0KG9zKSA/IG9zIDogZGF0YSkgKyAnIEJyb3dzZXInO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkZXRlY3QgRmlyZWZveCBPU1xuICAgIGlmICgoZGF0YSA9IC9cXCgoTW9iaWxlfFRhYmxldCkuKj9GaXJlZm94XFxiL2kuZXhlYyh1YSkpICYmIGRhdGFbMV0pIHtcbiAgICAgIG9zID0gJ0ZpcmVmb3ggT1MnO1xuICAgICAgaWYgKCFwcm9kdWN0KSB7XG4gICAgICAgIHByb2R1Y3QgPSBkYXRhWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkZXRlY3Qgbm9uLU9wZXJhIHZlcnNpb25zIChvcmRlciBpcyBpbXBvcnRhbnQpXG4gICAgaWYgKCF2ZXJzaW9uKSB7XG4gICAgICB2ZXJzaW9uID0gZ2V0VmVyc2lvbihbXG4gICAgICAgICcoPzpDbG91ZDl8Q3JpT1N8Q3JNb3xJRU1vYmlsZXxJcm9ufE9wZXJhID9NaW5pfE9QaU9TfE9QUnxSYXZlbnxTaWxrKD8hL1tcXFxcZC5dKyQpKScsXG4gICAgICAgICdWZXJzaW9uJyxcbiAgICAgICAgcXVhbGlmeShuYW1lKSxcbiAgICAgICAgJyg/OkZpcmVmb3h8TWluZWZpZWxkfE5ldEZyb250KSdcbiAgICAgIF0pO1xuICAgIH1cbiAgICAvLyBkZXRlY3Qgc3R1YmJvcm4gbGF5b3V0IGVuZ2luZXNcbiAgICBpZiAobGF5b3V0ID09ICdpQ2FiJyAmJiBwYXJzZUZsb2F0KHZlcnNpb24pID4gMykge1xuICAgICAgbGF5b3V0ID0gWydXZWJLaXQnXTtcbiAgICB9IGVsc2UgaWYgKFxuICAgICAgICBsYXlvdXQgIT0gJ1RyaWRlbnQnICYmXG4gICAgICAgIChkYXRhID1cbiAgICAgICAgICAvXFxiT3BlcmFcXGIvLnRlc3QobmFtZSkgJiYgKC9cXGJPUFJcXGIvLnRlc3QodWEpID8gJ0JsaW5rJyA6ICdQcmVzdG8nKSB8fFxuICAgICAgICAgIC9cXGIoPzpNaWRvcml8Tm9va3xTYWZhcmkpXFxiL2kudGVzdCh1YSkgJiYgJ1dlYktpdCcgfHxcbiAgICAgICAgICAhbGF5b3V0ICYmIC9cXGJNU0lFXFxiL2kudGVzdCh1YSkgJiYgKG9zID09ICdNYWMgT1MnID8gJ1Rhc21hbicgOiAnVHJpZGVudCcpXG4gICAgICAgIClcbiAgICApIHtcbiAgICAgIGxheW91dCA9IFtkYXRhXTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IE5ldEZyb250IG9uIFBsYXlTdGF0aW9uXG4gICAgZWxzZSBpZiAoL1xcYlBsYXlTdGF0aW9uXFxiKD8hIFZpdGFcXGIpL2kudGVzdChuYW1lKSAmJiBsYXlvdXQgPT0gJ1dlYktpdCcpIHtcbiAgICAgIGxheW91dCA9IFsnTmV0RnJvbnQnXTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IFdpbmRvd3MgUGhvbmUgNyBkZXNrdG9wIG1vZGVcbiAgICBpZiAobmFtZSA9PSAnSUUnICYmIChkYXRhID0gKC87ICooPzpYQkxXUHxadW5lV1ApKFxcZCspL2kuZXhlYyh1YSkgfHwgMClbMV0pKSB7XG4gICAgICBuYW1lICs9ICcgTW9iaWxlJztcbiAgICAgIG9zID0gJ1dpbmRvd3MgUGhvbmUgJyArICgvXFwrJC8udGVzdChkYXRhKSA/IGRhdGEgOiBkYXRhICsgJy54Jyk7XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdkZXNrdG9wIG1vZGUnKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IFdpbmRvd3MgUGhvbmUgOCsgZGVza3RvcCBtb2RlXG4gICAgZWxzZSBpZiAoL1xcYldQRGVza3RvcFxcYi9pLnRlc3QodWEpKSB7XG4gICAgICBuYW1lID0gJ0lFIE1vYmlsZSc7XG4gICAgICBvcyA9ICdXaW5kb3dzIFBob25lIDgrJztcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ2Rlc2t0b3AgbW9kZScpO1xuICAgICAgdmVyc2lvbiB8fCAodmVyc2lvbiA9ICgvXFxicnY6KFtcXGQuXSspLy5leGVjKHVhKSB8fCAwKVsxXSk7XG4gICAgfVxuICAgIC8vIGRldGVjdCBJRSAxMSBhbmQgYWJvdmVcbiAgICBlbHNlIGlmIChuYW1lICE9ICdJRScgJiYgbGF5b3V0ID09ICdUcmlkZW50JyAmJiAoZGF0YSA9IC9cXGJydjooW1xcZC5dKykvLmV4ZWModWEpKSkge1xuICAgICAgaWYgKCEvXFxiV1BEZXNrdG9wXFxiL2kudGVzdCh1YSkpIHtcbiAgICAgICAgaWYgKG5hbWUpIHtcbiAgICAgICAgICBkZXNjcmlwdGlvbi5wdXNoKCdpZGVudGlmeWluZyBhcyAnICsgbmFtZSArICh2ZXJzaW9uID8gJyAnICsgdmVyc2lvbiA6ICcnKSk7XG4gICAgICAgIH1cbiAgICAgICAgbmFtZSA9ICdJRSc7XG4gICAgICB9XG4gICAgICB2ZXJzaW9uID0gZGF0YVsxXTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IElFIFRlY2ggUHJldmlld1xuICAgIGVsc2UgaWYgKChuYW1lID09ICdDaHJvbWUnIHx8IG5hbWUgIT0gJ0lFJykgJiYgKGRhdGEgPSAvXFxiRWRnZVxcLyhbXFxkLl0rKS8uZXhlYyh1YSkpKSB7XG4gICAgICBuYW1lID0gJ0lFJztcbiAgICAgIHZlcnNpb24gPSBkYXRhWzFdO1xuICAgICAgbGF5b3V0ID0gWydUcmlkZW50J107XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdwbGF0Zm9ybSBwcmV2aWV3Jyk7XG4gICAgfVxuICAgIC8vIGxldmVyYWdlIGVudmlyb25tZW50IGZlYXR1cmVzXG4gICAgaWYgKHVzZUZlYXR1cmVzKSB7XG4gICAgICAvLyBkZXRlY3Qgc2VydmVyLXNpZGUgZW52aXJvbm1lbnRzXG4gICAgICAvLyBSaGlubyBoYXMgYSBnbG9iYWwgZnVuY3Rpb24gd2hpbGUgb3RoZXJzIGhhdmUgYSBnbG9iYWwgb2JqZWN0XG4gICAgICBpZiAoaXNIb3N0VHlwZShjb250ZXh0LCAnZ2xvYmFsJykpIHtcbiAgICAgICAgaWYgKGphdmEpIHtcbiAgICAgICAgICBkYXRhID0gamF2YS5sYW5nLlN5c3RlbTtcbiAgICAgICAgICBhcmNoID0gZGF0YS5nZXRQcm9wZXJ0eSgnb3MuYXJjaCcpO1xuICAgICAgICAgIG9zID0gb3MgfHwgZGF0YS5nZXRQcm9wZXJ0eSgnb3MubmFtZScpICsgJyAnICsgZGF0YS5nZXRQcm9wZXJ0eSgnb3MudmVyc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc01vZHVsZVNjb3BlICYmIGlzSG9zdFR5cGUoY29udGV4dCwgJ3N5c3RlbScpICYmIChkYXRhID0gW2NvbnRleHQuc3lzdGVtXSlbMF0pIHtcbiAgICAgICAgICBvcyB8fCAob3MgPSBkYXRhWzBdLm9zIHx8IG51bGwpO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBkYXRhWzFdID0gY29udGV4dC5yZXF1aXJlKCdyaW5nby9lbmdpbmUnKS52ZXJzaW9uO1xuICAgICAgICAgICAgdmVyc2lvbiA9IGRhdGFbMV0uam9pbignLicpO1xuICAgICAgICAgICAgbmFtZSA9ICdSaW5nb0pTJztcbiAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIGlmIChkYXRhWzBdLmdsb2JhbC5zeXN0ZW0gPT0gY29udGV4dC5zeXN0ZW0pIHtcbiAgICAgICAgICAgICAgbmFtZSA9ICdOYXJ3aGFsJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAodHlwZW9mIGNvbnRleHQucHJvY2VzcyA9PSAnb2JqZWN0JyAmJiAoZGF0YSA9IGNvbnRleHQucHJvY2VzcykpIHtcbiAgICAgICAgICBuYW1lID0gJ05vZGUuanMnO1xuICAgICAgICAgIGFyY2ggPSBkYXRhLmFyY2g7XG4gICAgICAgICAgb3MgPSBkYXRhLnBsYXRmb3JtO1xuICAgICAgICAgIHZlcnNpb24gPSAvW1xcZC5dKy8uZXhlYyhkYXRhLnZlcnNpb24pWzBdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHJoaW5vKSB7XG4gICAgICAgICAgbmFtZSA9ICdSaGlubyc7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIGRldGVjdCBBZG9iZSBBSVJcbiAgICAgIGVsc2UgaWYgKGdldENsYXNzT2YoKGRhdGEgPSBjb250ZXh0LnJ1bnRpbWUpKSA9PSBhaXJSdW50aW1lQ2xhc3MpIHtcbiAgICAgICAgbmFtZSA9ICdBZG9iZSBBSVInO1xuICAgICAgICBvcyA9IGRhdGEuZmxhc2guc3lzdGVtLkNhcGFiaWxpdGllcy5vcztcbiAgICAgIH1cbiAgICAgIC8vIGRldGVjdCBQaGFudG9tSlNcbiAgICAgIGVsc2UgaWYgKGdldENsYXNzT2YoKGRhdGEgPSBjb250ZXh0LnBoYW50b20pKSA9PSBwaGFudG9tQ2xhc3MpIHtcbiAgICAgICAgbmFtZSA9ICdQaGFudG9tSlMnO1xuICAgICAgICB2ZXJzaW9uID0gKGRhdGEgPSBkYXRhLnZlcnNpb24gfHwgbnVsbCkgJiYgKGRhdGEubWFqb3IgKyAnLicgKyBkYXRhLm1pbm9yICsgJy4nICsgZGF0YS5wYXRjaCk7XG4gICAgICB9XG4gICAgICAvLyBkZXRlY3QgSUUgY29tcGF0aWJpbGl0eSBtb2Rlc1xuICAgICAgZWxzZSBpZiAodHlwZW9mIGRvYy5kb2N1bWVudE1vZGUgPT0gJ251bWJlcicgJiYgKGRhdGEgPSAvXFxiVHJpZGVudFxcLyhcXGQrKS9pLmV4ZWModWEpKSkge1xuICAgICAgICAvLyB3ZSdyZSBpbiBjb21wYXRpYmlsaXR5IG1vZGUgd2hlbiB0aGUgVHJpZGVudCB2ZXJzaW9uICsgNCBkb2Vzbid0XG4gICAgICAgIC8vIGVxdWFsIHRoZSBkb2N1bWVudCBtb2RlXG4gICAgICAgIHZlcnNpb24gPSBbdmVyc2lvbiwgZG9jLmRvY3VtZW50TW9kZV07XG4gICAgICAgIGlmICgoZGF0YSA9ICtkYXRhWzFdICsgNCkgIT0gdmVyc2lvblsxXSkge1xuICAgICAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ0lFICcgKyB2ZXJzaW9uWzFdICsgJyBtb2RlJyk7XG4gICAgICAgICAgbGF5b3V0ICYmIChsYXlvdXRbMV0gPSAnJyk7XG4gICAgICAgICAgdmVyc2lvblsxXSA9IGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgdmVyc2lvbiA9IG5hbWUgPT0gJ0lFJyA/IFN0cmluZyh2ZXJzaW9uWzFdLnRvRml4ZWQoMSkpIDogdmVyc2lvblswXTtcbiAgICAgIH1cbiAgICAgIG9zID0gb3MgJiYgZm9ybWF0KG9zKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IHByZXJlbGVhc2UgcGhhc2VzXG4gICAgaWYgKHZlcnNpb24gJiYgKGRhdGEgPVxuICAgICAgICAgIC8oPzpbYWJdfGRwfHByZXxbYWJdXFxkK3ByZSkoPzpcXGQrXFwrPyk/JC9pLmV4ZWModmVyc2lvbikgfHxcbiAgICAgICAgICAvKD86YWxwaGF8YmV0YSkoPzogP1xcZCk/L2kuZXhlYyh1YSArICc7JyArICh1c2VGZWF0dXJlcyAmJiBuYXYuYXBwTWlub3JWZXJzaW9uKSkgfHxcbiAgICAgICAgICAvXFxiTWluZWZpZWxkXFxiL2kudGVzdCh1YSkgJiYgJ2EnXG4gICAgICAgICkpIHtcbiAgICAgIHByZXJlbGVhc2UgPSAvYi9pLnRlc3QoZGF0YSkgPyAnYmV0YScgOiAnYWxwaGEnO1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24ucmVwbGFjZShSZWdFeHAoZGF0YSArICdcXFxcKz8kJyksICcnKSArXG4gICAgICAgIChwcmVyZWxlYXNlID09ICdiZXRhJyA/IGJldGEgOiBhbHBoYSkgKyAoL1xcZCtcXCs/Ly5leGVjKGRhdGEpIHx8ICcnKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IEZpcmVmb3ggTW9iaWxlXG4gICAgaWYgKG5hbWUgPT0gJ0Zlbm5lYycgfHwgbmFtZSA9PSAnRmlyZWZveCcgJiYgL1xcYig/OkFuZHJvaWR8RmlyZWZveCBPUylcXGIvLnRlc3Qob3MpKSB7XG4gICAgICBuYW1lID0gJ0ZpcmVmb3ggTW9iaWxlJztcbiAgICB9XG4gICAgLy8gb2JzY3VyZSBNYXh0aG9uJ3MgdW5yZWxpYWJsZSB2ZXJzaW9uXG4gICAgZWxzZSBpZiAobmFtZSA9PSAnTWF4dGhvbicgJiYgdmVyc2lvbikge1xuICAgICAgdmVyc2lvbiA9IHZlcnNpb24ucmVwbGFjZSgvXFwuW1xcZC5dKy8sICcueCcpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgU2lsayBkZXNrdG9wL2FjY2VsZXJhdGVkIG1vZGVzXG4gICAgZWxzZSBpZiAobmFtZSA9PSAnU2lsaycpIHtcbiAgICAgIGlmICghL1xcYk1vYmkvaS50ZXN0KHVhKSkge1xuICAgICAgICBvcyA9ICdBbmRyb2lkJztcbiAgICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnZGVza3RvcCBtb2RlJyk7XG4gICAgICB9XG4gICAgICBpZiAoL0FjY2VsZXJhdGVkICo9ICp0cnVlL2kudGVzdCh1YSkpIHtcbiAgICAgICAgZGVzY3JpcHRpb24udW5zaGlmdCgnYWNjZWxlcmF0ZWQnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gZGV0ZWN0IFhib3ggMzYwIGFuZCBYYm94IE9uZVxuICAgIGVsc2UgaWYgKC9cXGJYYm94XFxiL2kudGVzdChwcm9kdWN0KSkge1xuICAgICAgb3MgPSBudWxsO1xuICAgICAgaWYgKHByb2R1Y3QgPT0gJ1hib3ggMzYwJyAmJiAvXFxiSUVNb2JpbGVcXGIvLnRlc3QodWEpKSB7XG4gICAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ21vYmlsZSBtb2RlJyk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGFkZCBtb2JpbGUgcG9zdGZpeFxuICAgIGVsc2UgaWYgKCgvXig/OkNocm9tZXxJRXxPcGVyYSkkLy50ZXN0KG5hbWUpIHx8IG5hbWUgJiYgIXByb2R1Y3QgJiYgIS9Ccm93c2VyfE1vYmkvLnRlc3QobmFtZSkpICYmXG4gICAgICAgIChvcyA9PSAnV2luZG93cyBDRScgfHwgL01vYmkvaS50ZXN0KHVhKSkpIHtcbiAgICAgIG5hbWUgKz0gJyBNb2JpbGUnO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgSUUgcGxhdGZvcm0gcHJldmlld1xuICAgIGVsc2UgaWYgKG5hbWUgPT0gJ0lFJyAmJiB1c2VGZWF0dXJlcyAmJiBjb250ZXh0LmV4dGVybmFsID09PSBudWxsKSB7XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdwbGF0Zm9ybSBwcmV2aWV3Jyk7XG4gICAgfVxuICAgIC8vIGRldGVjdCBCbGFja0JlcnJ5IE9TIHZlcnNpb25cbiAgICAvLyBodHRwOi8vZG9jcy5ibGFja2JlcnJ5LmNvbS9lbi9kZXZlbG9wZXJzL2RlbGl2ZXJhYmxlcy8xODE2OS9IVFRQX2hlYWRlcnNfc2VudF9ieV9CQl9Ccm93c2VyXzEyMzQ5MTFfMTEuanNwXG4gICAgZWxzZSBpZiAoKC9cXGJCbGFja0JlcnJ5XFxiLy50ZXN0KHByb2R1Y3QpIHx8IC9cXGJCQjEwXFxiLy50ZXN0KHVhKSkgJiYgKGRhdGEgPVxuICAgICAgICAgIChSZWdFeHAocHJvZHVjdC5yZXBsYWNlKC8gKy9nLCAnIConKSArICcvKFsuXFxcXGRdKyknLCAnaScpLmV4ZWModWEpIHx8IDApWzFdIHx8XG4gICAgICAgICAgdmVyc2lvblxuICAgICAgICApKSB7XG4gICAgICBkYXRhID0gW2RhdGEsIC9CQjEwLy50ZXN0KHVhKV07XG4gICAgICBvcyA9IChkYXRhWzFdID8gKHByb2R1Y3QgPSBudWxsLCBtYW51ZmFjdHVyZXIgPSAnQmxhY2tCZXJyeScpIDogJ0RldmljZSBTb2Z0d2FyZScpICsgJyAnICsgZGF0YVswXTtcbiAgICAgIHZlcnNpb24gPSBudWxsO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgT3BlcmEgaWRlbnRpZnlpbmcvbWFza2luZyBpdHNlbGYgYXMgYW5vdGhlciBicm93c2VyXG4gICAgLy8gaHR0cDovL3d3dy5vcGVyYS5jb20vc3VwcG9ydC9rYi92aWV3Lzg0My9cbiAgICBlbHNlIGlmICh0aGlzICE9IGZvck93biAmJiAoXG4gICAgICAgICAgcHJvZHVjdCAhPSAnV2lpJyAmJiAoXG4gICAgICAgICAgICAodXNlRmVhdHVyZXMgJiYgb3BlcmEpIHx8XG4gICAgICAgICAgICAoL09wZXJhLy50ZXN0KG5hbWUpICYmIC9cXGIoPzpNU0lFfEZpcmVmb3gpXFxiL2kudGVzdCh1YSkpIHx8XG4gICAgICAgICAgICAobmFtZSA9PSAnRmlyZWZveCcgJiYgL1xcYk9TIFggKD86XFxkK1xcLil7Mix9Ly50ZXN0KG9zKSkgfHxcbiAgICAgICAgICAgIChuYW1lID09ICdJRScgJiYgKFxuICAgICAgICAgICAgICAob3MgJiYgIS9eV2luLy50ZXN0KG9zKSAmJiB2ZXJzaW9uID4gNS41KSB8fFxuICAgICAgICAgICAgICAvXFxiV2luZG93cyBYUFxcYi8udGVzdChvcykgJiYgdmVyc2lvbiA+IDggfHxcbiAgICAgICAgICAgICAgdmVyc2lvbiA9PSA4ICYmICEvXFxiVHJpZGVudFxcYi8udGVzdCh1YSlcbiAgICAgICAgICAgICkpXG4gICAgICAgICAgKVxuICAgICAgICApICYmICFyZU9wZXJhLnRlc3QoKGRhdGEgPSBwYXJzZS5jYWxsKGZvck93biwgdWEucmVwbGFjZShyZU9wZXJhLCAnJykgKyAnOycpKSkgJiYgZGF0YS5uYW1lKSB7XG5cbiAgICAgIC8vIHdoZW4gXCJpbmRlbnRpZnlpbmdcIiwgdGhlIFVBIGNvbnRhaW5zIGJvdGggT3BlcmEgYW5kIHRoZSBvdGhlciBicm93c2VyJ3MgbmFtZVxuICAgICAgZGF0YSA9ICdpbmcgYXMgJyArIGRhdGEubmFtZSArICgoZGF0YSA9IGRhdGEudmVyc2lvbikgPyAnICcgKyBkYXRhIDogJycpO1xuICAgICAgaWYgKHJlT3BlcmEudGVzdChuYW1lKSkge1xuICAgICAgICBpZiAoL1xcYklFXFxiLy50ZXN0KGRhdGEpICYmIG9zID09ICdNYWMgT1MnKSB7XG4gICAgICAgICAgb3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEgPSAnaWRlbnRpZnknICsgZGF0YTtcbiAgICAgIH1cbiAgICAgIC8vIHdoZW4gXCJtYXNraW5nXCIsIHRoZSBVQSBjb250YWlucyBvbmx5IHRoZSBvdGhlciBicm93c2VyJ3MgbmFtZVxuICAgICAgZWxzZSB7XG4gICAgICAgIGRhdGEgPSAnbWFzaycgKyBkYXRhO1xuICAgICAgICBpZiAob3BlcmFDbGFzcykge1xuICAgICAgICAgIG5hbWUgPSBmb3JtYXQob3BlcmFDbGFzcy5yZXBsYWNlKC8oW2Etel0pKFtBLVpdKS9nLCAnJDEgJDInKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbmFtZSA9ICdPcGVyYSc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKC9cXGJJRVxcYi8udGVzdChkYXRhKSkge1xuICAgICAgICAgIG9zID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXVzZUZlYXR1cmVzKSB7XG4gICAgICAgICAgdmVyc2lvbiA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGxheW91dCA9IFsnUHJlc3RvJ107XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKGRhdGEpO1xuICAgIH1cbiAgICAvLyBkZXRlY3QgV2ViS2l0IE5pZ2h0bHkgYW5kIGFwcHJveGltYXRlIENocm9tZS9TYWZhcmkgdmVyc2lvbnNcbiAgICBpZiAoKGRhdGEgPSAoL1xcYkFwcGxlV2ViS2l0XFwvKFtcXGQuXStcXCs/KS9pLmV4ZWModWEpIHx8IDApWzFdKSkge1xuICAgICAgLy8gY29ycmVjdCBidWlsZCBmb3IgbnVtZXJpYyBjb21wYXJpc29uXG4gICAgICAvLyAoZS5nLiBcIjUzMi41XCIgYmVjb21lcyBcIjUzMi4wNVwiKVxuICAgICAgZGF0YSA9IFtwYXJzZUZsb2F0KGRhdGEucmVwbGFjZSgvXFwuKFxcZCkkLywgJy4wJDEnKSksIGRhdGFdO1xuICAgICAgLy8gbmlnaHRseSBidWlsZHMgYXJlIHBvc3RmaXhlZCB3aXRoIGEgYCtgXG4gICAgICBpZiAobmFtZSA9PSAnU2FmYXJpJyAmJiBkYXRhWzFdLnNsaWNlKC0xKSA9PSAnKycpIHtcbiAgICAgICAgbmFtZSA9ICdXZWJLaXQgTmlnaHRseSc7XG4gICAgICAgIHByZXJlbGVhc2UgPSAnYWxwaGEnO1xuICAgICAgICB2ZXJzaW9uID0gZGF0YVsxXS5zbGljZSgwLCAtMSk7XG4gICAgICB9XG4gICAgICAvLyBjbGVhciBpbmNvcnJlY3QgYnJvd3NlciB2ZXJzaW9uc1xuICAgICAgZWxzZSBpZiAodmVyc2lvbiA9PSBkYXRhWzFdIHx8XG4gICAgICAgICAgdmVyc2lvbiA9PSAoZGF0YVsyXSA9ICgvXFxiU2FmYXJpXFwvKFtcXGQuXStcXCs/KS9pLmV4ZWModWEpIHx8IDApWzFdKSkge1xuICAgICAgICB2ZXJzaW9uID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIC8vIHVzZSB0aGUgZnVsbCBDaHJvbWUgdmVyc2lvbiB3aGVuIGF2YWlsYWJsZVxuICAgICAgZGF0YVsxXSA9ICgvXFxiQ2hyb21lXFwvKFtcXGQuXSspL2kuZXhlYyh1YSkgfHwgMClbMV07XG4gICAgICAvLyBkZXRlY3QgQmxpbmsgbGF5b3V0IGVuZ2luZVxuICAgICAgaWYgKGRhdGFbMF0gPT0gNTM3LjM2ICYmIGRhdGFbMl0gPT0gNTM3LjM2ICYmIHBhcnNlRmxvYXQoZGF0YVsxXSkgPj0gMjggJiYgbmFtZSAhPSAnSUUnKSB7XG4gICAgICAgIGxheW91dCA9IFsnQmxpbmsnXTtcbiAgICAgIH1cbiAgICAgIC8vIGRldGVjdCBKYXZhU2NyaXB0Q29yZVxuICAgICAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy82NzY4NDc0L2hvdy1jYW4taS1kZXRlY3Qtd2hpY2gtamF2YXNjcmlwdC1lbmdpbmUtdjgtb3ItanNjLWlzLXVzZWQtYXQtcnVudGltZS1pbi1hbmRyb2lcbiAgICAgIGlmICghdXNlRmVhdHVyZXMgfHwgKCFsaWtlQ2hyb21lICYmICFkYXRhWzFdKSkge1xuICAgICAgICBsYXlvdXQgJiYgKGxheW91dFsxXSA9ICdsaWtlIFNhZmFyaScpO1xuICAgICAgICBkYXRhID0gKGRhdGEgPSBkYXRhWzBdLCBkYXRhIDwgNDAwID8gMSA6IGRhdGEgPCA1MDAgPyAyIDogZGF0YSA8IDUyNiA/IDMgOiBkYXRhIDwgNTMzID8gNCA6IGRhdGEgPCA1MzQgPyAnNCsnIDogZGF0YSA8IDUzNSA/IDUgOiBkYXRhIDwgNTM3ID8gNiA6IGRhdGEgPCA1MzggPyA3IDogZGF0YSA8IDYwMSA/IDggOiAnOCcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbGF5b3V0ICYmIChsYXlvdXRbMV0gPSAnbGlrZSBDaHJvbWUnKTtcbiAgICAgICAgZGF0YSA9IGRhdGFbMV0gfHwgKGRhdGEgPSBkYXRhWzBdLCBkYXRhIDwgNTMwID8gMSA6IGRhdGEgPCA1MzIgPyAyIDogZGF0YSA8IDUzMi4wNSA/IDMgOiBkYXRhIDwgNTMzID8gNCA6IGRhdGEgPCA1MzQuMDMgPyA1IDogZGF0YSA8IDUzNC4wNyA/IDYgOiBkYXRhIDwgNTM0LjEwID8gNyA6IGRhdGEgPCA1MzQuMTMgPyA4IDogZGF0YSA8IDUzNC4xNiA/IDkgOiBkYXRhIDwgNTM0LjI0ID8gMTAgOiBkYXRhIDwgNTM0LjMwID8gMTEgOiBkYXRhIDwgNTM1LjAxID8gMTIgOiBkYXRhIDwgNTM1LjAyID8gJzEzKycgOiBkYXRhIDwgNTM1LjA3ID8gMTUgOiBkYXRhIDwgNTM1LjExID8gMTYgOiBkYXRhIDwgNTM1LjE5ID8gMTcgOiBkYXRhIDwgNTM2LjA1ID8gMTggOiBkYXRhIDwgNTM2LjEwID8gMTkgOiBkYXRhIDwgNTM3LjAxID8gMjAgOiBkYXRhIDwgNTM3LjExID8gJzIxKycgOiBkYXRhIDwgNTM3LjEzID8gMjMgOiBkYXRhIDwgNTM3LjE4ID8gMjQgOiBkYXRhIDwgNTM3LjI0ID8gMjUgOiBkYXRhIDwgNTM3LjM2ID8gMjYgOiBsYXlvdXQgIT0gJ0JsaW5rJyA/ICcyNycgOiAnMjgnKTtcbiAgICAgIH1cbiAgICAgIC8vIGFkZCB0aGUgcG9zdGZpeCBvZiBcIi54XCIgb3IgXCIrXCIgZm9yIGFwcHJveGltYXRlIHZlcnNpb25zXG4gICAgICBsYXlvdXQgJiYgKGxheW91dFsxXSArPSAnICcgKyAoZGF0YSArPSB0eXBlb2YgZGF0YSA9PSAnbnVtYmVyJyA/ICcueCcgOiAvWy4rXS8udGVzdChkYXRhKSA/ICcnIDogJysnKSk7XG4gICAgICAvLyBvYnNjdXJlIHZlcnNpb24gZm9yIHNvbWUgU2FmYXJpIDEtMiByZWxlYXNlc1xuICAgICAgaWYgKG5hbWUgPT0gJ1NhZmFyaScgJiYgKCF2ZXJzaW9uIHx8IHBhcnNlSW50KHZlcnNpb24pID4gNDUpKSB7XG4gICAgICAgIHZlcnNpb24gPSBkYXRhO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBkZXRlY3QgT3BlcmEgZGVza3RvcCBtb2Rlc1xuICAgIGlmIChuYW1lID09ICdPcGVyYScgJiYgIChkYXRhID0gL1xcYnpib3Z8enZhdiQvLmV4ZWMob3MpKSkge1xuICAgICAgbmFtZSArPSAnICc7XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KCdkZXNrdG9wIG1vZGUnKTtcbiAgICAgIGlmIChkYXRhID09ICd6dmF2Jykge1xuICAgICAgICBuYW1lICs9ICdNaW5pJztcbiAgICAgICAgdmVyc2lvbiA9IG51bGw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBuYW1lICs9ICdNb2JpbGUnO1xuICAgICAgfVxuICAgICAgb3MgPSBvcy5yZXBsYWNlKFJlZ0V4cCgnIConICsgZGF0YSArICckJyksICcnKTtcbiAgICB9XG4gICAgLy8gZGV0ZWN0IENocm9tZSBkZXNrdG9wIG1vZGVcbiAgICBlbHNlIGlmIChuYW1lID09ICdTYWZhcmknICYmIC9cXGJDaHJvbWVcXGIvLmV4ZWMobGF5b3V0ICYmIGxheW91dFsxXSkpIHtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJ2Rlc2t0b3AgbW9kZScpO1xuICAgICAgbmFtZSA9ICdDaHJvbWUgTW9iaWxlJztcbiAgICAgIHZlcnNpb24gPSBudWxsO1xuXG4gICAgICBpZiAoL1xcYk9TIFhcXGIvLnRlc3Qob3MpKSB7XG4gICAgICAgIG1hbnVmYWN0dXJlciA9ICdBcHBsZSc7XG4gICAgICAgIG9zID0gJ2lPUyA0LjMrJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9zID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gc3RyaXAgaW5jb3JyZWN0IE9TIHZlcnNpb25zXG4gICAgaWYgKHZlcnNpb24gJiYgdmVyc2lvbi5pbmRleE9mKChkYXRhID0gL1tcXGQuXSskLy5leGVjKG9zKSkpID09IDAgJiZcbiAgICAgICAgdWEuaW5kZXhPZignLycgKyBkYXRhICsgJy0nKSA+IC0xKSB7XG4gICAgICBvcyA9IHRyaW0ob3MucmVwbGFjZShkYXRhLCAnJykpO1xuICAgIH1cbiAgICAvLyBhZGQgbGF5b3V0IGVuZ2luZVxuICAgIGlmIChsYXlvdXQgJiYgIS9cXGIoPzpBdmFudHxOb29rKVxcYi8udGVzdChuYW1lKSAmJiAoXG4gICAgICAgIC9Ccm93c2VyfEx1bmFzY2FwZXxNYXh0aG9uLy50ZXN0KG5hbWUpIHx8XG4gICAgICAgIC9eKD86QWRvYmV8QXJvcmF8QnJlYWNofE1pZG9yaXxPcGVyYXxQaGFudG9tfFJla29ucXxSb2NrfFNsZWlwbmlyfFdlYikvLnRlc3QobmFtZSkgJiYgbGF5b3V0WzFdKSkge1xuICAgICAgLy8gZG9uJ3QgYWRkIGxheW91dCBkZXRhaWxzIHRvIGRlc2NyaXB0aW9uIGlmIHRoZXkgYXJlIGZhbHNleVxuICAgICAgKGRhdGEgPSBsYXlvdXRbbGF5b3V0Lmxlbmd0aCAtIDFdKSAmJiBkZXNjcmlwdGlvbi5wdXNoKGRhdGEpO1xuICAgIH1cbiAgICAvLyBjb21iaW5lIGNvbnRleHR1YWwgaW5mb3JtYXRpb25cbiAgICBpZiAoZGVzY3JpcHRpb24ubGVuZ3RoKSB7XG4gICAgICBkZXNjcmlwdGlvbiA9IFsnKCcgKyBkZXNjcmlwdGlvbi5qb2luKCc7ICcpICsgJyknXTtcbiAgICB9XG4gICAgLy8gYXBwZW5kIG1hbnVmYWN0dXJlclxuICAgIGlmIChtYW51ZmFjdHVyZXIgJiYgcHJvZHVjdCAmJiBwcm9kdWN0LmluZGV4T2YobWFudWZhY3R1cmVyKSA8IDApIHtcbiAgICAgIGRlc2NyaXB0aW9uLnB1c2goJ29uICcgKyBtYW51ZmFjdHVyZXIpO1xuICAgIH1cbiAgICAvLyBhcHBlbmQgcHJvZHVjdFxuICAgIGlmIChwcm9kdWN0KSB7XG4gICAgICBkZXNjcmlwdGlvbi5wdXNoKCgvXm9uIC8udGVzdChkZXNjcmlwdGlvbltkZXNjcmlwdGlvbi5sZW5ndGggLTFdKSA/ICcnIDogJ29uICcpICsgcHJvZHVjdCk7XG4gICAgfVxuICAgIC8vIHBhcnNlIE9TIGludG8gYW4gb2JqZWN0XG4gICAgaWYgKG9zKSB7XG4gICAgICBkYXRhID0gLyAoW1xcZC4rXSspJC8uZXhlYyhvcyk7XG4gICAgICBpc1NwZWNpYWxDYXNlZE9TID0gZGF0YSAmJiBvcy5jaGFyQXQob3MubGVuZ3RoIC0gZGF0YVswXS5sZW5ndGggLSAxKSA9PSAnLyc7XG4gICAgICBvcyA9IHtcbiAgICAgICAgJ2FyY2hpdGVjdHVyZSc6IDMyLFxuICAgICAgICAnZmFtaWx5JzogKGRhdGEgJiYgIWlzU3BlY2lhbENhc2VkT1MpID8gb3MucmVwbGFjZShkYXRhWzBdLCAnJykgOiBvcyxcbiAgICAgICAgJ3ZlcnNpb24nOiBkYXRhID8gZGF0YVsxXSA6IG51bGwsXG4gICAgICAgICd0b1N0cmluZyc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciB2ZXJzaW9uID0gdGhpcy52ZXJzaW9uO1xuICAgICAgICAgIHJldHVybiB0aGlzLmZhbWlseSArICgodmVyc2lvbiAmJiAhaXNTcGVjaWFsQ2FzZWRPUykgPyAnICcgKyB2ZXJzaW9uIDogJycpICsgKHRoaXMuYXJjaGl0ZWN0dXJlID09IDY0ID8gJyA2NC1iaXQnIDogJycpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgICAvLyBhZGQgYnJvd3Nlci9PUyBhcmNoaXRlY3R1cmVcbiAgICBpZiAoKGRhdGEgPSAvXFxiKD86QU1EfElBfFdpbnxXT1d8eDg2X3x4KTY0XFxiL2kuZXhlYyhhcmNoKSkgJiYgIS9cXGJpNjg2XFxiL2kudGVzdChhcmNoKSkge1xuICAgICAgaWYgKG9zKSB7XG4gICAgICAgIG9zLmFyY2hpdGVjdHVyZSA9IDY0O1xuICAgICAgICBvcy5mYW1pbHkgPSBvcy5mYW1pbHkucmVwbGFjZShSZWdFeHAoJyAqJyArIGRhdGEpLCAnJyk7XG4gICAgICB9XG4gICAgICBpZiAoXG4gICAgICAgICAgbmFtZSAmJiAoL1xcYldPVzY0XFxiL2kudGVzdCh1YSkgfHxcbiAgICAgICAgICAodXNlRmVhdHVyZXMgJiYgL1xcdyg/Ojg2fDMyKSQvLnRlc3QobmF2LmNwdUNsYXNzIHx8IG5hdi5wbGF0Zm9ybSkgJiYgIS9cXGJXaW42NDsgeDY0XFxiL2kudGVzdCh1YSkpKVxuICAgICAgKSB7XG4gICAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQoJzMyLWJpdCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHVhIHx8ICh1YSA9IG51bGwpO1xuXG4gICAgLyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gICAgLyoqXG4gICAgICogVGhlIHBsYXRmb3JtIG9iamVjdC5cbiAgICAgKlxuICAgICAqIEBuYW1lIHBsYXRmb3JtXG4gICAgICogQHR5cGUgT2JqZWN0XG4gICAgICovXG4gICAgdmFyIHBsYXRmb3JtID0ge307XG5cbiAgICAvKipcbiAgICAgKiBUaGUgcGxhdGZvcm0gZGVzY3JpcHRpb24uXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLmRlc2NyaXB0aW9uID0gdWE7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGUgYnJvd3NlcidzIGxheW91dCBlbmdpbmUuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLmxheW91dCA9IGxheW91dCAmJiBsYXlvdXRbMF07XG5cbiAgICAvKipcbiAgICAgKiBUaGUgbmFtZSBvZiB0aGUgcHJvZHVjdCdzIG1hbnVmYWN0dXJlci5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0ubWFudWZhY3R1cmVyID0gbWFudWZhY3R1cmVyO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIGJyb3dzZXIvZW52aXJvbm1lbnQuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLm5hbWUgPSBuYW1lO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGFscGhhL2JldGEgcmVsZWFzZSBpbmRpY2F0b3IuXG4gICAgICpcbiAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm1cbiAgICAgKiBAdHlwZSBzdHJpbmd8bnVsbFxuICAgICAqL1xuICAgIHBsYXRmb3JtLnByZXJlbGVhc2UgPSBwcmVyZWxlYXNlO1xuXG4gICAgLyoqXG4gICAgICogVGhlIG5hbWUgb2YgdGhlIHByb2R1Y3QgaG9zdGluZyB0aGUgYnJvd3Nlci5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0ucHJvZHVjdCA9IHByb2R1Y3Q7XG5cbiAgICAvKipcbiAgICAgKiBUaGUgYnJvd3NlcidzIHVzZXIgYWdlbnQgc3RyaW5nLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgKi9cbiAgICBwbGF0Zm9ybS51YSA9IHVhO1xuXG4gICAgLyoqXG4gICAgICogVGhlIGJyb3dzZXIvZW52aXJvbm1lbnQgdmVyc2lvbi5cbiAgICAgKlxuICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybVxuICAgICAqIEB0eXBlIHN0cmluZ3xudWxsXG4gICAgICovXG4gICAgcGxhdGZvcm0udmVyc2lvbiA9IG5hbWUgJiYgdmVyc2lvbjtcblxuICAgIC8qKlxuICAgICAqIFRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpbmcgc3lzdGVtLlxuICAgICAqXG4gICAgICogQG1lbWJlck9mIHBsYXRmb3JtXG4gICAgICogQHR5cGUgT2JqZWN0XG4gICAgICovXG4gICAgcGxhdGZvcm0ub3MgPSBvcyB8fCB7XG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIENQVSBhcmNoaXRlY3R1cmUgdGhlIE9TIGlzIGJ1aWx0IGZvci5cbiAgICAgICAqXG4gICAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm0ub3NcbiAgICAgICAqIEB0eXBlIG51bWJlcnxudWxsXG4gICAgICAgKi9cbiAgICAgICdhcmNoaXRlY3R1cmUnOiBudWxsLFxuXG4gICAgICAvKipcbiAgICAgICAqIFRoZSBmYW1pbHkgb2YgdGhlIE9TLlxuICAgICAgICpcbiAgICAgICAqIENvbW1vbiB2YWx1ZXMgaW5jbHVkZTpcbiAgICAgICAqIFwiV2luZG93c1wiLCBcIldpbmRvd3MgU2VydmVyIDIwMDggUjIgLyA3XCIsIFwiV2luZG93cyBTZXJ2ZXIgMjAwOCAvIFZpc3RhXCIsXG4gICAgICAgKiBcIldpbmRvd3MgWFBcIiwgXCJPUyBYXCIsIFwiVWJ1bnR1XCIsIFwiRGViaWFuXCIsIFwiRmVkb3JhXCIsIFwiUmVkIEhhdFwiLCBcIlN1U0VcIixcbiAgICAgICAqIFwiQW5kcm9pZFwiLCBcImlPU1wiIGFuZCBcIldpbmRvd3MgUGhvbmVcIlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybS5vc1xuICAgICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgICAqL1xuICAgICAgJ2ZhbWlseSc6IG51bGwsXG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIHZlcnNpb24gb2YgdGhlIE9TLlxuICAgICAgICpcbiAgICAgICAqIEBtZW1iZXJPZiBwbGF0Zm9ybS5vc1xuICAgICAgICogQHR5cGUgc3RyaW5nfG51bGxcbiAgICAgICAqL1xuICAgICAgJ3ZlcnNpb24nOiBudWxsLFxuXG4gICAgICAvKipcbiAgICAgICAqIFJldHVybnMgdGhlIE9TIHN0cmluZy5cbiAgICAgICAqXG4gICAgICAgKiBAbWVtYmVyT2YgcGxhdGZvcm0ub3NcbiAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBPUyBzdHJpbmcuXG4gICAgICAgKi9cbiAgICAgICd0b1N0cmluZyc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gJ251bGwnOyB9XG4gICAgfTtcblxuICAgIHBsYXRmb3JtLnBhcnNlID0gcGFyc2U7XG4gICAgcGxhdGZvcm0udG9TdHJpbmcgPSB0b1N0cmluZ1BsYXRmb3JtO1xuXG4gICAgaWYgKHBsYXRmb3JtLnZlcnNpb24pIHtcbiAgICAgIGRlc2NyaXB0aW9uLnVuc2hpZnQodmVyc2lvbik7XG4gICAgfVxuICAgIGlmIChwbGF0Zm9ybS5uYW1lKSB7XG4gICAgICBkZXNjcmlwdGlvbi51bnNoaWZ0KG5hbWUpO1xuICAgIH1cbiAgICBpZiAob3MgJiYgbmFtZSAmJiAhKG9zID09IFN0cmluZyhvcykuc3BsaXQoJyAnKVswXSAmJiAob3MgPT0gbmFtZS5zcGxpdCgnICcpWzBdIHx8IHByb2R1Y3QpKSkge1xuICAgICAgZGVzY3JpcHRpb24ucHVzaChwcm9kdWN0ID8gJygnICsgb3MgKyAnKScgOiAnb24gJyArIG9zKTtcbiAgICB9XG4gICAgaWYgKGRlc2NyaXB0aW9uLmxlbmd0aCkge1xuICAgICAgcGxhdGZvcm0uZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbi5qb2luKCcgJyk7XG4gICAgfVxuICAgIHJldHVybiBwbGF0Zm9ybTtcbiAgfVxuXG4gIC8qLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0qL1xuXG4gIC8vIGV4cG9ydCBwbGF0Zm9ybVxuICAvLyBzb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBjb25kaXRpb24gcGF0dGVybnMgbGlrZSB0aGUgZm9sbG93aW5nOlxuICBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIHR5cGVvZiBkZWZpbmUuYW1kID09ICdvYmplY3QnICYmIGRlZmluZS5hbWQpIHtcbiAgICAvLyBkZWZpbmUgYXMgYW4gYW5vbnltb3VzIG1vZHVsZSBzbywgdGhyb3VnaCBwYXRoIG1hcHBpbmcsIGl0IGNhbiBiZSBhbGlhc2VkXG4gICAgZGVmaW5lKGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHBhcnNlKCk7XG4gICAgfSk7XG4gIH1cbiAgLy8gY2hlY2sgZm9yIGBleHBvcnRzYCBhZnRlciBgZGVmaW5lYCBpbiBjYXNlIGEgYnVpbGQgb3B0aW1pemVyIGFkZHMgYW4gYGV4cG9ydHNgIG9iamVjdFxuICBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlKSB7XG4gICAgLy8gaW4gTmFyd2hhbCwgTm9kZS5qcywgUmhpbm8gLXJlcXVpcmUsIG9yIFJpbmdvSlNcbiAgICBmb3JPd24ocGFyc2UoKSwgZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgZnJlZUV4cG9ydHNba2V5XSA9IHZhbHVlO1xuICAgIH0pO1xuICB9XG4gIC8vIGluIGEgYnJvd3NlciBvciBSaGlub1xuICBlbHNlIHtcbiAgICByb290LnBsYXRmb3JtID0gcGFyc2UoKTtcbiAgfVxufS5jYWxsKHRoaXMpKTtcblxufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBhc2FwID0gcmVxdWlyZSgnYXNhcCcpXG5cbm1vZHVsZS5leHBvcnRzID0gUHJvbWlzZVxuZnVuY3Rpb24gUHJvbWlzZShmbikge1xuICBpZiAodHlwZW9mIHRoaXMgIT09ICdvYmplY3QnKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdQcm9taXNlcyBtdXN0IGJlIGNvbnN0cnVjdGVkIHZpYSBuZXcnKVxuICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB0aHJvdyBuZXcgVHlwZUVycm9yKCdub3QgYSBmdW5jdGlvbicpXG4gIHZhciBzdGF0ZSA9IG51bGxcbiAgdmFyIHZhbHVlID0gbnVsbFxuICB2YXIgZGVmZXJyZWRzID0gW11cbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgdGhpcy50aGVuID0gZnVuY3Rpb24ob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBoYW5kbGUobmV3IEhhbmRsZXIob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQsIHJlc29sdmUsIHJlamVjdCkpXG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZShkZWZlcnJlZCkge1xuICAgIGlmIChzdGF0ZSA9PT0gbnVsbCkge1xuICAgICAgZGVmZXJyZWRzLnB1c2goZGVmZXJyZWQpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgYXNhcChmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjYiA9IHN0YXRlID8gZGVmZXJyZWQub25GdWxmaWxsZWQgOiBkZWZlcnJlZC5vblJlamVjdGVkXG4gICAgICBpZiAoY2IgPT09IG51bGwpIHtcbiAgICAgICAgKHN0YXRlID8gZGVmZXJyZWQucmVzb2x2ZSA6IGRlZmVycmVkLnJlamVjdCkodmFsdWUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdmFyIHJldFxuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0ID0gY2IodmFsdWUpXG4gICAgICB9XG4gICAgICBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG4gICAgICBkZWZlcnJlZC5yZXNvbHZlKHJldClcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gcmVzb2x2ZShuZXdWYWx1ZSkge1xuICAgIHRyeSB7IC8vUHJvbWlzZSBSZXNvbHV0aW9uIFByb2NlZHVyZTogaHR0cHM6Ly9naXRodWIuY29tL3Byb21pc2VzLWFwbHVzL3Byb21pc2VzLXNwZWMjdGhlLXByb21pc2UtcmVzb2x1dGlvbi1wcm9jZWR1cmVcbiAgICAgIGlmIChuZXdWYWx1ZSA9PT0gc2VsZikgdGhyb3cgbmV3IFR5cGVFcnJvcignQSBwcm9taXNlIGNhbm5vdCBiZSByZXNvbHZlZCB3aXRoIGl0c2VsZi4nKVxuICAgICAgaWYgKG5ld1ZhbHVlICYmICh0eXBlb2YgbmV3VmFsdWUgPT09ICdvYmplY3QnIHx8IHR5cGVvZiBuZXdWYWx1ZSA9PT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgdmFyIHRoZW4gPSBuZXdWYWx1ZS50aGVuXG4gICAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIGRvUmVzb2x2ZSh0aGVuLmJpbmQobmV3VmFsdWUpLCByZXNvbHZlLCByZWplY3QpXG4gICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHN0YXRlID0gdHJ1ZVxuICAgICAgdmFsdWUgPSBuZXdWYWx1ZVxuICAgICAgZmluYWxlKClcbiAgICB9IGNhdGNoIChlKSB7IHJlamVjdChlKSB9XG4gIH1cblxuICBmdW5jdGlvbiByZWplY3QobmV3VmFsdWUpIHtcbiAgICBzdGF0ZSA9IGZhbHNlXG4gICAgdmFsdWUgPSBuZXdWYWx1ZVxuICAgIGZpbmFsZSgpXG4gIH1cblxuICBmdW5jdGlvbiBmaW5hbGUoKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGRlZmVycmVkcy5sZW5ndGg7IGkgPCBsZW47IGkrKylcbiAgICAgIGhhbmRsZShkZWZlcnJlZHNbaV0pXG4gICAgZGVmZXJyZWRzID0gbnVsbFxuICB9XG5cbiAgZG9SZXNvbHZlKGZuLCByZXNvbHZlLCByZWplY3QpXG59XG5cblxuZnVuY3Rpb24gSGFuZGxlcihvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCwgcmVzb2x2ZSwgcmVqZWN0KXtcbiAgdGhpcy5vbkZ1bGZpbGxlZCA9IHR5cGVvZiBvbkZ1bGZpbGxlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uRnVsZmlsbGVkIDogbnVsbFxuICB0aGlzLm9uUmVqZWN0ZWQgPSB0eXBlb2Ygb25SZWplY3RlZCA9PT0gJ2Z1bmN0aW9uJyA/IG9uUmVqZWN0ZWQgOiBudWxsXG4gIHRoaXMucmVzb2x2ZSA9IHJlc29sdmVcbiAgdGhpcy5yZWplY3QgPSByZWplY3Rcbn1cblxuLyoqXG4gKiBUYWtlIGEgcG90ZW50aWFsbHkgbWlzYmVoYXZpbmcgcmVzb2x2ZXIgZnVuY3Rpb24gYW5kIG1ha2Ugc3VyZVxuICogb25GdWxmaWxsZWQgYW5kIG9uUmVqZWN0ZWQgYXJlIG9ubHkgY2FsbGVkIG9uY2UuXG4gKlxuICogTWFrZXMgbm8gZ3VhcmFudGVlcyBhYm91dCBhc3luY2hyb255LlxuICovXG5mdW5jdGlvbiBkb1Jlc29sdmUoZm4sIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XG4gIHZhciBkb25lID0gZmFsc2U7XG4gIHRyeSB7XG4gICAgZm4oZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICBpZiAoZG9uZSkgcmV0dXJuXG4gICAgICBkb25lID0gdHJ1ZVxuICAgICAgb25GdWxmaWxsZWQodmFsdWUpXG4gICAgfSwgZnVuY3Rpb24gKHJlYXNvbikge1xuICAgICAgaWYgKGRvbmUpIHJldHVyblxuICAgICAgZG9uZSA9IHRydWVcbiAgICAgIG9uUmVqZWN0ZWQocmVhc29uKVxuICAgIH0pXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgaWYgKGRvbmUpIHJldHVyblxuICAgIGRvbmUgPSB0cnVlXG4gICAgb25SZWplY3RlZChleClcbiAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vL1RoaXMgZmlsZSBjb250YWlucyB0aGVuL3Byb21pc2Ugc3BlY2lmaWMgZXh0ZW5zaW9ucyB0byB0aGUgY29yZSBwcm9taXNlIEFQSVxuXG52YXIgUHJvbWlzZSA9IHJlcXVpcmUoJy4vY29yZS5qcycpXG52YXIgYXNhcCA9IHJlcXVpcmUoJ2FzYXAnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByb21pc2VcblxuLyogU3RhdGljIEZ1bmN0aW9ucyAqL1xuXG5mdW5jdGlvbiBWYWx1ZVByb21pc2UodmFsdWUpIHtcbiAgdGhpcy50aGVuID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkKSB7XG4gICAgaWYgKHR5cGVvZiBvbkZ1bGZpbGxlZCAhPT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHRoaXNcbiAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmVzb2x2ZShvbkZ1bGZpbGxlZCh2YWx1ZSkpXG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgcmVqZWN0KGV4KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9KVxuICB9XG59XG5WYWx1ZVByb21pc2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShQcm9taXNlLnByb3RvdHlwZSlcblxudmFyIFRSVUUgPSBuZXcgVmFsdWVQcm9taXNlKHRydWUpXG52YXIgRkFMU0UgPSBuZXcgVmFsdWVQcm9taXNlKGZhbHNlKVxudmFyIE5VTEwgPSBuZXcgVmFsdWVQcm9taXNlKG51bGwpXG52YXIgVU5ERUZJTkVEID0gbmV3IFZhbHVlUHJvbWlzZSh1bmRlZmluZWQpXG52YXIgWkVSTyA9IG5ldyBWYWx1ZVByb21pc2UoMClcbnZhciBFTVBUWVNUUklORyA9IG5ldyBWYWx1ZVByb21pc2UoJycpXG5cblByb21pc2UucmVzb2x2ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICBpZiAodmFsdWUgaW5zdGFuY2VvZiBQcm9taXNlKSByZXR1cm4gdmFsdWVcblxuICBpZiAodmFsdWUgPT09IG51bGwpIHJldHVybiBOVUxMXG4gIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gVU5ERUZJTkVEXG4gIGlmICh2YWx1ZSA9PT0gdHJ1ZSkgcmV0dXJuIFRSVUVcbiAgaWYgKHZhbHVlID09PSBmYWxzZSkgcmV0dXJuIEZBTFNFXG4gIGlmICh2YWx1ZSA9PT0gMCkgcmV0dXJuIFpFUk9cbiAgaWYgKHZhbHVlID09PSAnJykgcmV0dXJuIEVNUFRZU1RSSU5HXG5cbiAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHZhbHVlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciB0aGVuID0gdmFsdWUudGhlblxuICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSh0aGVuLmJpbmQodmFsdWUpKVxuICAgICAgfVxuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZWplY3QoZXgpXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgVmFsdWVQcm9taXNlKHZhbHVlKVxufVxuXG5Qcm9taXNlLmZyb20gPSBQcm9taXNlLmNhc3QgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgdmFyIGVyciA9IG5ldyBFcnJvcignUHJvbWlzZS5mcm9tIGFuZCBQcm9taXNlLmNhc3QgYXJlIGRlcHJlY2F0ZWQsIHVzZSBQcm9taXNlLnJlc29sdmUgaW5zdGVhZCcpXG4gIGVyci5uYW1lID0gJ1dhcm5pbmcnXG4gIGNvbnNvbGUud2FybihlcnIuc3RhY2spXG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUodmFsdWUpXG59XG5cblByb21pc2UuZGVub2RlaWZ5ID0gZnVuY3Rpb24gKGZuLCBhcmd1bWVudENvdW50KSB7XG4gIGFyZ3VtZW50Q291bnQgPSBhcmd1bWVudENvdW50IHx8IEluZmluaXR5XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIHdoaWxlIChhcmdzLmxlbmd0aCAmJiBhcmdzLmxlbmd0aCA+IGFyZ3VtZW50Q291bnQpIHtcbiAgICAgICAgYXJncy5wb3AoKVxuICAgICAgfVxuICAgICAgYXJncy5wdXNoKGZ1bmN0aW9uIChlcnIsIHJlcykge1xuICAgICAgICBpZiAoZXJyKSByZWplY3QoZXJyKVxuICAgICAgICBlbHNlIHJlc29sdmUocmVzKVxuICAgICAgfSlcbiAgICAgIGZuLmFwcGx5KHNlbGYsIGFyZ3MpXG4gICAgfSlcbiAgfVxufVxuUHJvbWlzZS5ub2RlaWZ5ID0gZnVuY3Rpb24gKGZuKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgdmFyIGNhbGxiYWNrID0gdHlwZW9mIGFyZ3NbYXJncy5sZW5ndGggLSAxXSA9PT0gJ2Z1bmN0aW9uJyA/IGFyZ3MucG9wKCkgOiBudWxsXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpLm5vZGVpZnkoY2FsbGJhY2spXG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGlmIChjYWxsYmFjayA9PT0gbnVsbCB8fCB0eXBlb2YgY2FsbGJhY2sgPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgcmVqZWN0KGV4KSB9KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXNhcChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2FsbGJhY2soZXgpXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cblByb21pc2UuYWxsID0gZnVuY3Rpb24gKCkge1xuICB2YXIgY2FsbGVkV2l0aEFycmF5ID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMSAmJiBBcnJheS5pc0FycmF5KGFyZ3VtZW50c1swXSlcbiAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChjYWxsZWRXaXRoQXJyYXkgPyBhcmd1bWVudHNbMF0gOiBhcmd1bWVudHMpXG5cbiAgaWYgKCFjYWxsZWRXaXRoQXJyYXkpIHtcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdQcm9taXNlLmFsbCBzaG91bGQgYmUgY2FsbGVkIHdpdGggYSBzaW5nbGUgYXJyYXksIGNhbGxpbmcgaXQgd2l0aCBtdWx0aXBsZSBhcmd1bWVudHMgaXMgZGVwcmVjYXRlZCcpXG4gICAgZXJyLm5hbWUgPSAnV2FybmluZydcbiAgICBjb25zb2xlLndhcm4oZXJyLnN0YWNrKVxuICB9XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICBpZiAoYXJncy5sZW5ndGggPT09IDApIHJldHVybiByZXNvbHZlKFtdKVxuICAgIHZhciByZW1haW5pbmcgPSBhcmdzLmxlbmd0aFxuICAgIGZ1bmN0aW9uIHJlcyhpLCB2YWwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmICh2YWwgJiYgKHR5cGVvZiB2YWwgPT09ICdvYmplY3QnIHx8IHR5cGVvZiB2YWwgPT09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgdmFyIHRoZW4gPSB2YWwudGhlblxuICAgICAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgdGhlbi5jYWxsKHZhbCwgZnVuY3Rpb24gKHZhbCkgeyByZXMoaSwgdmFsKSB9LCByZWplY3QpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYXJnc1tpXSA9IHZhbFxuICAgICAgICBpZiAoLS1yZW1haW5pbmcgPT09IDApIHtcbiAgICAgICAgICByZXNvbHZlKGFyZ3MpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICByZWplY3QoZXgpXG4gICAgICB9XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgcmVzKGksIGFyZ3NbaV0pXG4gICAgfVxuICB9KVxufVxuXG5Qcm9taXNlLnJlamVjdCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyBcbiAgICByZWplY3QodmFsdWUpO1xuICB9KTtcbn1cblxuUHJvbWlzZS5yYWNlID0gZnVuY3Rpb24gKHZhbHVlcykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkgeyBcbiAgICB2YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWx1ZSl7XG4gICAgICBQcm9taXNlLnJlc29sdmUodmFsdWUpLnRoZW4ocmVzb2x2ZSwgcmVqZWN0KTtcbiAgICB9KVxuICB9KTtcbn1cblxuLyogUHJvdG90eXBlIE1ldGhvZHMgKi9cblxuUHJvbWlzZS5wcm90b3R5cGUuZG9uZSA9IGZ1bmN0aW9uIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkge1xuICB2YXIgc2VsZiA9IGFyZ3VtZW50cy5sZW5ndGggPyB0aGlzLnRoZW4uYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IHRoaXNcbiAgc2VsZi50aGVuKG51bGwsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIHRocm93IGVyclxuICAgIH0pXG4gIH0pXG59XG5cblByb21pc2UucHJvdG90eXBlLm5vZGVpZnkgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPSAnZnVuY3Rpb24nKSByZXR1cm4gdGhpc1xuXG4gIHRoaXMudGhlbihmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHZhbHVlKVxuICAgIH0pXG4gIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBhc2FwKGZ1bmN0aW9uICgpIHtcbiAgICAgIGNhbGxiYWNrKGVycilcbiAgICB9KVxuICB9KVxufVxuXG5Qcm9taXNlLnByb3RvdHlwZVsnY2F0Y2gnXSA9IGZ1bmN0aW9uIChvblJlamVjdGVkKSB7XG4gIHJldHVybiB0aGlzLnRoZW4obnVsbCwgb25SZWplY3RlZCk7XG59XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuXG4vLyBVc2UgdGhlIGZhc3Rlc3QgcG9zc2libGUgbWVhbnMgdG8gZXhlY3V0ZSBhIHRhc2sgaW4gYSBmdXR1cmUgdHVyblxuLy8gb2YgdGhlIGV2ZW50IGxvb3AuXG5cbi8vIGxpbmtlZCBsaXN0IG9mIHRhc2tzIChzaW5nbGUsIHdpdGggaGVhZCBub2RlKVxudmFyIGhlYWQgPSB7dGFzazogdm9pZCAwLCBuZXh0OiBudWxsfTtcbnZhciB0YWlsID0gaGVhZDtcbnZhciBmbHVzaGluZyA9IGZhbHNlO1xudmFyIHJlcXVlc3RGbHVzaCA9IHZvaWQgMDtcbnZhciBpc05vZGVKUyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBmbHVzaCgpIHtcbiAgICAvKiBqc2hpbnQgbG9vcGZ1bmM6IHRydWUgKi9cblxuICAgIHdoaWxlIChoZWFkLm5leHQpIHtcbiAgICAgICAgaGVhZCA9IGhlYWQubmV4dDtcbiAgICAgICAgdmFyIHRhc2sgPSBoZWFkLnRhc2s7XG4gICAgICAgIGhlYWQudGFzayA9IHZvaWQgMDtcbiAgICAgICAgdmFyIGRvbWFpbiA9IGhlYWQuZG9tYWluO1xuXG4gICAgICAgIGlmIChkb21haW4pIHtcbiAgICAgICAgICAgIGhlYWQuZG9tYWluID0gdm9pZCAwO1xuICAgICAgICAgICAgZG9tYWluLmVudGVyKCk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGFzaygpO1xuXG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChpc05vZGVKUykge1xuICAgICAgICAgICAgICAgIC8vIEluIG5vZGUsIHVuY2F1Z2h0IGV4Y2VwdGlvbnMgYXJlIGNvbnNpZGVyZWQgZmF0YWwgZXJyb3JzLlxuICAgICAgICAgICAgICAgIC8vIFJlLXRocm93IHRoZW0gc3luY2hyb25vdXNseSB0byBpbnRlcnJ1cHQgZmx1c2hpbmchXG5cbiAgICAgICAgICAgICAgICAvLyBFbnN1cmUgY29udGludWF0aW9uIGlmIHRoZSB1bmNhdWdodCBleGNlcHRpb24gaXMgc3VwcHJlc3NlZFxuICAgICAgICAgICAgICAgIC8vIGxpc3RlbmluZyBcInVuY2F1Z2h0RXhjZXB0aW9uXCIgZXZlbnRzIChhcyBkb21haW5zIGRvZXMpLlxuICAgICAgICAgICAgICAgIC8vIENvbnRpbnVlIGluIG5leHQgZXZlbnQgdG8gYXZvaWQgdGljayByZWN1cnNpb24uXG4gICAgICAgICAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgICAgICAgICBkb21haW4uZXhpdCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZsdXNoLCAwKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tYWluKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvbWFpbi5lbnRlcigpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHRocm93IGU7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gYnJvd3NlcnMsIHVuY2F1Z2h0IGV4Y2VwdGlvbnMgYXJlIG5vdCBmYXRhbC5cbiAgICAgICAgICAgICAgICAvLyBSZS10aHJvdyB0aGVtIGFzeW5jaHJvbm91c2x5IHRvIGF2b2lkIHNsb3ctZG93bnMuXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICAgIH0sIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGRvbWFpbikge1xuICAgICAgICAgICAgZG9tYWluLmV4aXQoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZsdXNoaW5nID0gZmFsc2U7XG59XG5cbmlmICh0eXBlb2YgcHJvY2VzcyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBwcm9jZXNzLm5leHRUaWNrKSB7XG4gICAgLy8gTm9kZS5qcyBiZWZvcmUgMC45LiBOb3RlIHRoYXQgc29tZSBmYWtlLU5vZGUgZW52aXJvbm1lbnRzLCBsaWtlIHRoZVxuICAgIC8vIE1vY2hhIHRlc3QgcnVubmVyLCBpbnRyb2R1Y2UgYSBgcHJvY2Vzc2AgZ2xvYmFsIHdpdGhvdXQgYSBgbmV4dFRpY2tgLlxuICAgIGlzTm9kZUpTID0gdHJ1ZTtcblxuICAgIHJlcXVlc3RGbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgfTtcblxufSBlbHNlIGlmICh0eXBlb2Ygc2V0SW1tZWRpYXRlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAvLyBJbiBJRTEwLCBOb2RlLmpzIDAuOSssIG9yIGh0dHBzOi8vZ2l0aHViLmNvbS9Ob2JsZUpTL3NldEltbWVkaWF0ZVxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHJlcXVlc3RGbHVzaCA9IHNldEltbWVkaWF0ZS5iaW5kKHdpbmRvdywgZmx1c2gpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJlcXVlc3RGbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNldEltbWVkaWF0ZShmbHVzaCk7XG4gICAgICAgIH07XG4gICAgfVxuXG59IGVsc2UgaWYgKHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIC8vIG1vZGVybiBicm93c2Vyc1xuICAgIC8vIGh0dHA6Ly93d3cubm9uYmxvY2tpbmcuaW8vMjAxMS8wNi93aW5kb3duZXh0dGljay5odG1sXG4gICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZsdXNoO1xuICAgIHJlcXVlc3RGbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICB9O1xuXG59IGVsc2Uge1xuICAgIC8vIG9sZCBicm93c2Vyc1xuICAgIHJlcXVlc3RGbHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2V0VGltZW91dChmbHVzaCwgMCk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gYXNhcCh0YXNrKSB7XG4gICAgdGFpbCA9IHRhaWwubmV4dCA9IHtcbiAgICAgICAgdGFzazogdGFzayxcbiAgICAgICAgZG9tYWluOiBpc05vZGVKUyAmJiBwcm9jZXNzLmRvbWFpbixcbiAgICAgICAgbmV4dDogbnVsbFxuICAgIH07XG5cbiAgICBpZiAoIWZsdXNoaW5nKSB7XG4gICAgICAgIGZsdXNoaW5nID0gdHJ1ZTtcbiAgICAgICAgcmVxdWVzdEZsdXNoKCk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBhc2FwO1xuXG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiL2hvbWUvZGVhbi9vc2Mtd29ya3NwYWNlcy93cy1id2FsbGV0LXdlYi9id2FsbGV0LmpzL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiKSkiLCJ2YXIgdHJhdmVyc2UgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICByZXR1cm4gbmV3IFRyYXZlcnNlKG9iaik7XG59O1xuXG5mdW5jdGlvbiBUcmF2ZXJzZSAob2JqKSB7XG4gICAgdGhpcy52YWx1ZSA9IG9iajtcbn1cblxuVHJhdmVyc2UucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwcykge1xuICAgIHZhciBub2RlID0gdGhpcy52YWx1ZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBzLmxlbmd0aDsgaSArKykge1xuICAgICAgICB2YXIga2V5ID0gcHNbaV07XG4gICAgICAgIGlmICghbm9kZSB8fCAhaGFzT3duUHJvcGVydHkuY2FsbChub2RlLCBrZXkpKSB7XG4gICAgICAgICAgICBub2RlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IG5vZGVba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUuaGFzID0gZnVuY3Rpb24gKHBzKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHMubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgIHZhciBrZXkgPSBwc1tpXTtcbiAgICAgICAgaWYgKCFub2RlIHx8ICFoYXNPd25Qcm9wZXJ0eS5jYWxsKG5vZGUsIGtleSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBub2RlID0gbm9kZVtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAocHMsIHZhbHVlKSB7XG4gICAgdmFyIG5vZGUgPSB0aGlzLnZhbHVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHMubGVuZ3RoIC0gMTsgaSArKykge1xuICAgICAgICB2YXIga2V5ID0gcHNbaV07XG4gICAgICAgIGlmICghaGFzT3duUHJvcGVydHkuY2FsbChub2RlLCBrZXkpKSBub2RlW2tleV0gPSB7fTtcbiAgICAgICAgbm9kZSA9IG5vZGVba2V5XTtcbiAgICB9XG4gICAgbm9kZVtwc1tpXV0gPSB2YWx1ZTtcbiAgICByZXR1cm4gdmFsdWU7XG59O1xuXG5UcmF2ZXJzZS5wcm90b3R5cGUubWFwID0gZnVuY3Rpb24gKGNiKSB7XG4gICAgcmV0dXJuIHdhbGsodGhpcy52YWx1ZSwgY2IsIHRydWUpO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiAoY2IpIHtcbiAgICB0aGlzLnZhbHVlID0gd2Fsayh0aGlzLnZhbHVlLCBjYiwgZmFsc2UpO1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLnJlZHVjZSA9IGZ1bmN0aW9uIChjYiwgaW5pdCkge1xuICAgIHZhciBza2lwID0gYXJndW1lbnRzLmxlbmd0aCA9PT0gMTtcbiAgICB2YXIgYWNjID0gc2tpcCA/IHRoaXMudmFsdWUgOiBpbml0O1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNSb290IHx8ICFza2lwKSB7XG4gICAgICAgICAgICBhY2MgPSBjYi5jYWxsKHRoaXMsIGFjYywgeCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYWNjO1xufTtcblxuVHJhdmVyc2UucHJvdG90eXBlLnBhdGhzID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhY2MgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgYWNjLnB1c2godGhpcy5wYXRoKTsgXG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5ub2RlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgYWNjID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgIGFjYy5wdXNoKHRoaXMubm9kZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjYztcbn07XG5cblRyYXZlcnNlLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFyZW50cyA9IFtdLCBub2RlcyA9IFtdO1xuICAgIFxuICAgIHJldHVybiAoZnVuY3Rpb24gY2xvbmUgKHNyYykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwYXJlbnRzW2ldID09PSBzcmMpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbm9kZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGlmICh0eXBlb2Ygc3JjID09PSAnb2JqZWN0JyAmJiBzcmMgIT09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBkc3QgPSBjb3B5KHNyYyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcmVudHMucHVzaChzcmMpO1xuICAgICAgICAgICAgbm9kZXMucHVzaChkc3QpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3JFYWNoKG9iamVjdEtleXMoc3JjKSwgZnVuY3Rpb24gKGtleSkge1xuICAgICAgICAgICAgICAgIGRzdFtrZXldID0gY2xvbmUoc3JjW2tleV0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcmVudHMucG9wKCk7XG4gICAgICAgICAgICBub2Rlcy5wb3AoKTtcbiAgICAgICAgICAgIHJldHVybiBkc3Q7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgICB9XG4gICAgfSkodGhpcy52YWx1ZSk7XG59O1xuXG5mdW5jdGlvbiB3YWxrIChyb290LCBjYiwgaW1tdXRhYmxlKSB7XG4gICAgdmFyIHBhdGggPSBbXTtcbiAgICB2YXIgcGFyZW50cyA9IFtdO1xuICAgIHZhciBhbGl2ZSA9IHRydWU7XG4gICAgXG4gICAgcmV0dXJuIChmdW5jdGlvbiB3YWxrZXIgKG5vZGVfKSB7XG4gICAgICAgIHZhciBub2RlID0gaW1tdXRhYmxlID8gY29weShub2RlXykgOiBub2RlXztcbiAgICAgICAgdmFyIG1vZGlmaWVycyA9IHt9O1xuICAgICAgICBcbiAgICAgICAgdmFyIGtlZXBHb2luZyA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICB2YXIgc3RhdGUgPSB7XG4gICAgICAgICAgICBub2RlIDogbm9kZSxcbiAgICAgICAgICAgIG5vZGVfIDogbm9kZV8sXG4gICAgICAgICAgICBwYXRoIDogW10uY29uY2F0KHBhdGgpLFxuICAgICAgICAgICAgcGFyZW50IDogcGFyZW50c1twYXJlbnRzLmxlbmd0aCAtIDFdLFxuICAgICAgICAgICAgcGFyZW50cyA6IHBhcmVudHMsXG4gICAgICAgICAgICBrZXkgOiBwYXRoLnNsaWNlKC0xKVswXSxcbiAgICAgICAgICAgIGlzUm9vdCA6IHBhdGgubGVuZ3RoID09PSAwLFxuICAgICAgICAgICAgbGV2ZWwgOiBwYXRoLmxlbmd0aCxcbiAgICAgICAgICAgIGNpcmN1bGFyIDogbnVsbCxcbiAgICAgICAgICAgIHVwZGF0ZSA6IGZ1bmN0aW9uICh4LCBzdG9wSGVyZSkge1xuICAgICAgICAgICAgICAgIGlmICghc3RhdGUuaXNSb290KSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnBhcmVudC5ub2RlW3N0YXRlLmtleV0gPSB4O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzdGF0ZS5ub2RlID0geDtcbiAgICAgICAgICAgICAgICBpZiAoc3RvcEhlcmUpIGtlZXBHb2luZyA9IGZhbHNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICdkZWxldGUnIDogZnVuY3Rpb24gKHN0b3BIZXJlKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHN0YXRlLnBhcmVudC5ub2RlW3N0YXRlLmtleV07XG4gICAgICAgICAgICAgICAgaWYgKHN0b3BIZXJlKSBrZWVwR29pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW1vdmUgOiBmdW5jdGlvbiAoc3RvcEhlcmUpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNBcnJheShzdGF0ZS5wYXJlbnQubm9kZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUucGFyZW50Lm5vZGUuc3BsaWNlKHN0YXRlLmtleSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgc3RhdGUucGFyZW50Lm5vZGVbc3RhdGUua2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHN0b3BIZXJlKSBrZWVwR29pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBrZXlzIDogbnVsbCxcbiAgICAgICAgICAgIGJlZm9yZSA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5iZWZvcmUgPSBmIH0sXG4gICAgICAgICAgICBhZnRlciA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5hZnRlciA9IGYgfSxcbiAgICAgICAgICAgIHByZSA6IGZ1bmN0aW9uIChmKSB7IG1vZGlmaWVycy5wcmUgPSBmIH0sXG4gICAgICAgICAgICBwb3N0IDogZnVuY3Rpb24gKGYpIHsgbW9kaWZpZXJzLnBvc3QgPSBmIH0sXG4gICAgICAgICAgICBzdG9wIDogZnVuY3Rpb24gKCkgeyBhbGl2ZSA9IGZhbHNlIH0sXG4gICAgICAgICAgICBibG9jayA6IGZ1bmN0aW9uICgpIHsga2VlcEdvaW5nID0gZmFsc2UgfVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaWYgKCFhbGl2ZSkgcmV0dXJuIHN0YXRlO1xuICAgICAgICBcbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlU3RhdGUoKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHN0YXRlLm5vZGUgPT09ICdvYmplY3QnICYmIHN0YXRlLm5vZGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXRlLmtleXMgfHwgc3RhdGUubm9kZV8gIT09IHN0YXRlLm5vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUua2V5cyA9IG9iamVjdEtleXMoc3RhdGUubm9kZSlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgc3RhdGUuaXNMZWFmID0gc3RhdGUua2V5cy5sZW5ndGggPT0gMDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudHNbaV0ubm9kZV8gPT09IG5vZGVfKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0ZS5jaXJjdWxhciA9IHBhcmVudHNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0YXRlLmlzTGVhZiA9IHRydWU7XG4gICAgICAgICAgICAgICAgc3RhdGUua2V5cyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHN0YXRlLm5vdExlYWYgPSAhc3RhdGUuaXNMZWFmO1xuICAgICAgICAgICAgc3RhdGUubm90Um9vdCA9ICFzdGF0ZS5pc1Jvb3Q7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHVwZGF0ZVN0YXRlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyB1c2UgcmV0dXJuIHZhbHVlcyB0byB1cGRhdGUgaWYgZGVmaW5lZFxuICAgICAgICB2YXIgcmV0ID0gY2IuY2FsbChzdGF0ZSwgc3RhdGUubm9kZSk7XG4gICAgICAgIGlmIChyZXQgIT09IHVuZGVmaW5lZCAmJiBzdGF0ZS51cGRhdGUpIHN0YXRlLnVwZGF0ZShyZXQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKG1vZGlmaWVycy5iZWZvcmUpIG1vZGlmaWVycy5iZWZvcmUuY2FsbChzdGF0ZSwgc3RhdGUubm9kZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIWtlZXBHb2luZykgcmV0dXJuIHN0YXRlO1xuICAgICAgICBcbiAgICAgICAgaWYgKHR5cGVvZiBzdGF0ZS5ub2RlID09ICdvYmplY3QnXG4gICAgICAgICYmIHN0YXRlLm5vZGUgIT09IG51bGwgJiYgIXN0YXRlLmNpcmN1bGFyKSB7XG4gICAgICAgICAgICBwYXJlbnRzLnB1c2goc3RhdGUpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB1cGRhdGVTdGF0ZSgpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBmb3JFYWNoKHN0YXRlLmtleXMsIGZ1bmN0aW9uIChrZXksIGkpIHtcbiAgICAgICAgICAgICAgICBwYXRoLnB1c2goa2V5KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXJzLnByZSkgbW9kaWZpZXJzLnByZS5jYWxsKHN0YXRlLCBzdGF0ZS5ub2RlW2tleV0sIGtleSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkID0gd2Fsa2VyKHN0YXRlLm5vZGVba2V5XSk7XG4gICAgICAgICAgICAgICAgaWYgKGltbXV0YWJsZSAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKHN0YXRlLm5vZGUsIGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUubm9kZVtrZXldID0gY2hpbGQubm9kZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY2hpbGQuaXNMYXN0ID0gaSA9PSBzdGF0ZS5rZXlzLmxlbmd0aCAtIDE7XG4gICAgICAgICAgICAgICAgY2hpbGQuaXNGaXJzdCA9IGkgPT0gMDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAobW9kaWZpZXJzLnBvc3QpIG1vZGlmaWVycy5wb3N0LmNhbGwoc3RhdGUsIGNoaWxkKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBwYXRoLnBvcCgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBwYXJlbnRzLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAobW9kaWZpZXJzLmFmdGVyKSBtb2RpZmllcnMuYWZ0ZXIuY2FsbChzdGF0ZSwgc3RhdGUubm9kZSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gc3RhdGU7XG4gICAgfSkocm9vdCkubm9kZTtcbn1cblxuZnVuY3Rpb24gY29weSAoc3JjKSB7XG4gICAgaWYgKHR5cGVvZiBzcmMgPT09ICdvYmplY3QnICYmIHNyYyAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgZHN0O1xuICAgICAgICBcbiAgICAgICAgaWYgKGlzQXJyYXkoc3JjKSkge1xuICAgICAgICAgICAgZHN0ID0gW107XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNEYXRlKHNyYykpIHtcbiAgICAgICAgICAgIGRzdCA9IG5ldyBEYXRlKHNyYy5nZXRUaW1lID8gc3JjLmdldFRpbWUoKSA6IHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoaXNSZWdFeHAoc3JjKSkge1xuICAgICAgICAgICAgZHN0ID0gbmV3IFJlZ0V4cChzcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzRXJyb3Ioc3JjKSkge1xuICAgICAgICAgICAgZHN0ID0geyBtZXNzYWdlOiBzcmMubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzQm9vbGVhbihzcmMpKSB7XG4gICAgICAgICAgICBkc3QgPSBuZXcgQm9vbGVhbihzcmMpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGlzTnVtYmVyKHNyYykpIHtcbiAgICAgICAgICAgIGRzdCA9IG5ldyBOdW1iZXIoc3JjKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChpc1N0cmluZyhzcmMpKSB7XG4gICAgICAgICAgICBkc3QgPSBuZXcgU3RyaW5nKHNyYyk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoT2JqZWN0LmNyZWF0ZSAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YpIHtcbiAgICAgICAgICAgIGRzdCA9IE9iamVjdC5jcmVhdGUoT2JqZWN0LmdldFByb3RvdHlwZU9mKHNyYykpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHNyYy5jb25zdHJ1Y3RvciA9PT0gT2JqZWN0KSB7XG4gICAgICAgICAgICBkc3QgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHZhciBwcm90byA9XG4gICAgICAgICAgICAgICAgKHNyYy5jb25zdHJ1Y3RvciAmJiBzcmMuY29uc3RydWN0b3IucHJvdG90eXBlKVxuICAgICAgICAgICAgICAgIHx8IHNyYy5fX3Byb3RvX19cbiAgICAgICAgICAgICAgICB8fCB7fVxuICAgICAgICAgICAgO1xuICAgICAgICAgICAgdmFyIFQgPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgICAgIFQucHJvdG90eXBlID0gcHJvdG87XG4gICAgICAgICAgICBkc3QgPSBuZXcgVDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yRWFjaChvYmplY3RLZXlzKHNyYyksIGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGRzdFtrZXldID0gc3JjW2tleV07XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZHN0O1xuICAgIH1cbiAgICBlbHNlIHJldHVybiBzcmM7XG59XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24ga2V5cyAob2JqKSB7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHJlcy5wdXNoKGtleSlcbiAgICByZXR1cm4gcmVzO1xufTtcblxuZnVuY3Rpb24gdG9TIChvYmopIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopIH1cbmZ1bmN0aW9uIGlzRGF0ZSAob2JqKSB7IHJldHVybiB0b1Mob2JqKSA9PT0gJ1tvYmplY3QgRGF0ZV0nIH1cbmZ1bmN0aW9uIGlzUmVnRXhwIChvYmopIHsgcmV0dXJuIHRvUyhvYmopID09PSAnW29iamVjdCBSZWdFeHBdJyB9XG5mdW5jdGlvbiBpc0Vycm9yIChvYmopIHsgcmV0dXJuIHRvUyhvYmopID09PSAnW29iamVjdCBFcnJvcl0nIH1cbmZ1bmN0aW9uIGlzQm9vbGVhbiAob2JqKSB7IHJldHVybiB0b1Mob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nIH1cbmZ1bmN0aW9uIGlzTnVtYmVyIChvYmopIHsgcmV0dXJuIHRvUyhvYmopID09PSAnW29iamVjdCBOdW1iZXJdJyB9XG5mdW5jdGlvbiBpc1N0cmluZyAob2JqKSB7IHJldHVybiB0b1Mob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXScgfVxuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gaXNBcnJheSAoeHMpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbnZhciBmb3JFYWNoID0gZnVuY3Rpb24gKHhzLCBmbikge1xuICAgIGlmICh4cy5mb3JFYWNoKSByZXR1cm4geHMuZm9yRWFjaChmbilcbiAgICBlbHNlIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgZm4oeHNbaV0sIGksIHhzKTtcbiAgICB9XG59O1xuXG5mb3JFYWNoKG9iamVjdEtleXMoVHJhdmVyc2UucHJvdG90eXBlKSwgZnVuY3Rpb24gKGtleSkge1xuICAgIHRyYXZlcnNlW2tleV0gPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgICAgIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICB2YXIgdCA9IG5ldyBUcmF2ZXJzZShvYmopO1xuICAgICAgICByZXR1cm4gdFtrZXldLmFwcGx5KHQsIGFyZ3MpO1xuICAgIH07XG59KTtcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0Lmhhc093blByb3BlcnR5IHx8IGZ1bmN0aW9uIChvYmosIGtleSkge1xuICAgIHJldHVybiBrZXkgaW4gb2JqO1xufTtcbiIsIihmdW5jdGlvbiAocm9vdCkge1xuICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKioqKiB1bm9ybS5qcyAqKioqKi9cblxuLypcbiAqIFVuaWNvZGVOb3JtYWxpemVyIDEuMC4wXG4gKiBDb3B5cmlnaHQgKGMpIDIwMDggTWF0c3V6YVxuICogRHVhbCBsaWNlbnNlZCB1bmRlciB0aGUgTUlUIChNSVQtTElDRU5TRS50eHQpIGFuZCBHUEwgKEdQTC1MSUNFTlNFLnR4dCkgbGljZW5zZXMuXG4gKiAkRGF0ZTogMjAwOC0wNi0wNSAxNjo0NDoxNyArMDIwMCAoVGh1LCAwNSBKdW4gMjAwOCkgJFxuICogJFJldjogMTMzMDkgJFxuICovXG5cbiAgIHZhciBERUZBVUxUX0ZFQVRVUkUgPSBbbnVsbCwgMCwge31dO1xuICAgdmFyIENBQ0hFX1RIUkVTSE9MRCA9IDEwO1xuICAgdmFyIFNCYXNlID0gMHhBQzAwLCBMQmFzZSA9IDB4MTEwMCwgVkJhc2UgPSAweDExNjEsIFRCYXNlID0gMHgxMUE3LCBMQ291bnQgPSAxOSwgVkNvdW50ID0gMjEsIFRDb3VudCA9IDI4O1xuICAgdmFyIE5Db3VudCA9IFZDb3VudCAqIFRDb3VudDsgLy8gNTg4XG4gICB2YXIgU0NvdW50ID0gTENvdW50ICogTkNvdW50OyAvLyAxMTE3MlxuXG4gICB2YXIgVUNoYXIgPSBmdW5jdGlvbihjcCwgZmVhdHVyZSl7XG4gICAgICB0aGlzLmNvZGVwb2ludCA9IGNwO1xuICAgICAgdGhpcy5mZWF0dXJlID0gZmVhdHVyZTtcbiAgIH07XG5cbiAgIC8vIFN0cmF0ZWdpZXNcbiAgIHZhciBjYWNoZSA9IHt9O1xuICAgdmFyIGNhY2hlQ291bnRlciA9IFtdO1xuICAgZm9yICh2YXIgaSA9IDA7IGkgPD0gMHhGRjsgKytpKXtcbiAgICAgIGNhY2hlQ291bnRlcltpXSA9IDA7XG4gICB9XG5cbiAgIGZ1bmN0aW9uIGZyb21DYWNoZShuZXh0LCBjcCwgbmVlZEZlYXR1cmUpe1xuICAgICAgdmFyIHJldCA9IGNhY2hlW2NwXTtcbiAgICAgIGlmKCFyZXQpe1xuICAgICAgICAgcmV0ID0gbmV4dChjcCwgbmVlZEZlYXR1cmUpO1xuICAgICAgICAgaWYoISFyZXQuZmVhdHVyZSAmJiArK2NhY2hlQ291bnRlclsoY3AgPj4gOCkgJiAweEZGXSA+IENBQ0hFX1RIUkVTSE9MRCl7XG4gICAgICAgICAgICBjYWNoZVtjcF0gPSByZXQ7XG4gICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgfVxuXG4gICBmdW5jdGlvbiBmcm9tRGF0YShuZXh0LCBjcCwgbmVlZEZlYXR1cmUpe1xuICAgICAgdmFyIGhhc2ggPSBjcCAmIDB4RkYwMDtcbiAgICAgIHZhciBkdW5pdCA9IFVDaGFyLnVkYXRhW2hhc2hdIHx8IHt9O1xuICAgICAgdmFyIGYgPSBkdW5pdFtjcF07XG4gICAgICByZXR1cm4gZiA/IG5ldyBVQ2hhcihjcCwgZikgOiBuZXcgVUNoYXIoY3AsIERFRkFVTFRfRkVBVFVSRSk7XG4gICB9XG4gICBmdW5jdGlvbiBmcm9tQ3BPbmx5KG5leHQsIGNwLCBuZWVkRmVhdHVyZSl7XG4gICAgICByZXR1cm4gISFuZWVkRmVhdHVyZSA/IG5leHQoY3AsIG5lZWRGZWF0dXJlKSA6IG5ldyBVQ2hhcihjcCwgbnVsbCk7XG4gICB9XG4gICBmdW5jdGlvbiBmcm9tUnVsZUJhc2VkSmFtbyhuZXh0LCBjcCwgbmVlZEZlYXR1cmUpe1xuICAgICAgdmFyIGo7XG4gICAgICBpZihjcCA8IExCYXNlIHx8IChMQmFzZSArIExDb3VudCA8PSBjcCAmJiBjcCA8IFNCYXNlKSB8fCAoU0Jhc2UgKyBTQ291bnQgPCBjcCkpe1xuICAgICAgICAgcmV0dXJuIG5leHQoY3AsIG5lZWRGZWF0dXJlKTtcbiAgICAgIH1cbiAgICAgIGlmKExCYXNlIDw9IGNwICYmIGNwIDwgTEJhc2UgKyBMQ291bnQpe1xuICAgICAgICAgdmFyIGMgPSB7fTtcbiAgICAgICAgIHZhciBiYXNlID0gKGNwIC0gTEJhc2UpICogVkNvdW50O1xuICAgICAgICAgZm9yIChqID0gMDsgaiA8IFZDb3VudDsgKytqKXtcbiAgICAgICAgICAgIGNbVkJhc2UgKyBqXSA9IFNCYXNlICsgVENvdW50ICogKGogKyBiYXNlKTtcbiAgICAgICAgIH1cbiAgICAgICAgIHJldHVybiBuZXcgVUNoYXIoY3AsIFssLGNdKTtcbiAgICAgIH1cblxuICAgICAgdmFyIFNJbmRleCA9IGNwIC0gU0Jhc2U7XG4gICAgICB2YXIgVEluZGV4ID0gU0luZGV4ICUgVENvdW50O1xuICAgICAgdmFyIGZlYXR1cmUgPSBbXTtcbiAgICAgIGlmKFRJbmRleCAhPT0gMCl7XG4gICAgICAgICBmZWF0dXJlWzBdID0gW1NCYXNlICsgU0luZGV4IC0gVEluZGV4LCBUQmFzZSArIFRJbmRleF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgZmVhdHVyZVswXSA9IFtMQmFzZSArIE1hdGguZmxvb3IoU0luZGV4IC8gTkNvdW50KSwgVkJhc2UgKyBNYXRoLmZsb29yKChTSW5kZXggJSBOQ291bnQpIC8gVENvdW50KV07XG4gICAgICAgICBmZWF0dXJlWzJdID0ge307XG4gICAgICAgICBmb3IgKGogPSAxOyBqIDwgVENvdW50OyArK2ope1xuICAgICAgICAgICAgZmVhdHVyZVsyXVtUQmFzZSArIGpdID0gY3AgKyBqO1xuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyBVQ2hhcihjcCwgZmVhdHVyZSk7XG4gICB9XG4gICBmdW5jdGlvbiBmcm9tQ3BGaWx0ZXIobmV4dCwgY3AsIG5lZWRGZWF0dXJlKXtcbiAgICAgIHJldHVybiBjcCA8IDYwIHx8IDEzMzExIDwgY3AgJiYgY3AgPCA0MjYwNyA/IG5ldyBVQ2hhcihjcCwgREVGQVVMVF9GRUFUVVJFKSA6IG5leHQoY3AsIG5lZWRGZWF0dXJlKTtcbiAgIH1cblxuICAgdmFyIHN0cmF0ZWdpZXMgPSBbZnJvbUNwRmlsdGVyLCBmcm9tQ2FjaGUsIGZyb21DcE9ubHksIGZyb21SdWxlQmFzZWRKYW1vLCBmcm9tRGF0YV07XG5cbiAgIFVDaGFyLmZyb21DaGFyQ29kZSA9IHN0cmF0ZWdpZXMucmVkdWNlUmlnaHQoZnVuY3Rpb24gKG5leHQsIHN0cmF0ZWd5KSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKGNwLCBuZWVkRmVhdHVyZSkge1xuICAgICAgICAgcmV0dXJuIHN0cmF0ZWd5KG5leHQsIGNwLCBuZWVkRmVhdHVyZSk7XG4gICAgICB9O1xuICAgfSwgbnVsbCk7XG5cbiAgIFVDaGFyLmlzSGlnaFN1cnJvZ2F0ZSA9IGZ1bmN0aW9uKGNwKXtcbiAgICAgIHJldHVybiBjcCA+PSAweEQ4MDAgJiYgY3AgPD0gMHhEQkZGO1xuICAgfTtcbiAgIFVDaGFyLmlzTG93U3Vycm9nYXRlID0gZnVuY3Rpb24oY3Ape1xuICAgICAgcmV0dXJuIGNwID49IDB4REMwMCAmJiBjcCA8PSAweERGRkY7XG4gICB9O1xuXG4gICBVQ2hhci5wcm90b3R5cGUucHJlcEZlYXR1cmUgPSBmdW5jdGlvbigpe1xuICAgICAgaWYoIXRoaXMuZmVhdHVyZSl7XG4gICAgICAgICB0aGlzLmZlYXR1cmUgPSBVQ2hhci5mcm9tQ2hhckNvZGUodGhpcy5jb2RlcG9pbnQsIHRydWUpLmZlYXR1cmU7XG4gICAgICB9XG4gICB9O1xuXG4gICBVQ2hhci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpe1xuICAgICAgaWYodGhpcy5jb2RlcG9pbnQgPCAweDEwMDAwKXtcbiAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKHRoaXMuY29kZXBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICB2YXIgeCA9IHRoaXMuY29kZXBvaW50IC0gMHgxMDAwMDtcbiAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKE1hdGguZmxvb3IoeCAvIDB4NDAwKSArIDB4RDgwMCwgeCAlIDB4NDAwICsgMHhEQzAwKTtcbiAgICAgIH1cbiAgIH07XG5cbiAgIFVDaGFyLnByb3RvdHlwZS5nZXREZWNvbXAgPSBmdW5jdGlvbigpe1xuICAgICAgdGhpcy5wcmVwRmVhdHVyZSgpO1xuICAgICAgcmV0dXJuIHRoaXMuZmVhdHVyZVswXSB8fCBudWxsO1xuICAgfTtcblxuICAgVUNoYXIucHJvdG90eXBlLmlzQ29tcGF0aWJpbGl0eSA9IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnByZXBGZWF0dXJlKCk7XG4gICAgICByZXR1cm4gISF0aGlzLmZlYXR1cmVbMV0gJiYgKHRoaXMuZmVhdHVyZVsxXSAmICgxIDw8IDgpKTtcbiAgIH07XG4gICBVQ2hhci5wcm90b3R5cGUuaXNFeGNsdWRlID0gZnVuY3Rpb24oKXtcbiAgICAgIHRoaXMucHJlcEZlYXR1cmUoKTtcbiAgICAgIHJldHVybiAhIXRoaXMuZmVhdHVyZVsxXSAmJiAodGhpcy5mZWF0dXJlWzFdICYgKDEgPDwgOSkpO1xuICAgfTtcbiAgIFVDaGFyLnByb3RvdHlwZS5nZXRDYW5vbmljYWxDbGFzcyA9IGZ1bmN0aW9uKCl7XG4gICAgICB0aGlzLnByZXBGZWF0dXJlKCk7XG4gICAgICByZXR1cm4gISF0aGlzLmZlYXR1cmVbMV0gPyAodGhpcy5mZWF0dXJlWzFdICYgMHhmZikgOiAwO1xuICAgfTtcbiAgIFVDaGFyLnByb3RvdHlwZS5nZXRDb21wb3NpdGUgPSBmdW5jdGlvbihmb2xsb3dpbmcpe1xuICAgICAgdGhpcy5wcmVwRmVhdHVyZSgpO1xuICAgICAgaWYoIXRoaXMuZmVhdHVyZVsyXSl7XG4gICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHZhciBjcCA9IHRoaXMuZmVhdHVyZVsyXVtmb2xsb3dpbmcuY29kZXBvaW50XTtcbiAgICAgIHJldHVybiBjcCA/IFVDaGFyLmZyb21DaGFyQ29kZShjcCkgOiBudWxsO1xuICAgfTtcblxuICAgdmFyIFVDaGFySXRlcmF0b3IgPSBmdW5jdGlvbihzdHIpe1xuICAgICAgdGhpcy5zdHIgPSBzdHI7XG4gICAgICB0aGlzLmN1cnNvciA9IDA7XG4gICB9O1xuICAgVUNoYXJJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKCl7XG4gICAgICBpZighIXRoaXMuc3RyICYmIHRoaXMuY3Vyc29yIDwgdGhpcy5zdHIubGVuZ3RoKXtcbiAgICAgICAgIHZhciBjcCA9IHRoaXMuc3RyLmNoYXJDb2RlQXQodGhpcy5jdXJzb3IrKyk7XG4gICAgICAgICB2YXIgZDtcbiAgICAgICAgIGlmKFVDaGFyLmlzSGlnaFN1cnJvZ2F0ZShjcCkgJiYgdGhpcy5jdXJzb3IgPCB0aGlzLnN0ci5sZW5ndGggJiYgVUNoYXIuaXNMb3dTdXJyb2dhdGUoKGQgPSB0aGlzLnN0ci5jaGFyQ29kZUF0KHRoaXMuY3Vyc29yKSkpKXtcbiAgICAgICAgICAgIGNwID0gKGNwIC0gMHhEODAwKSAqIDB4NDAwICsgKGQgLTB4REMwMCkgKyAweDEwMDAwO1xuICAgICAgICAgICAgKyt0aGlzLmN1cnNvcjtcbiAgICAgICAgIH1cbiAgICAgICAgIHJldHVybiBVQ2hhci5mcm9tQ2hhckNvZGUoY3ApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgIHRoaXMuc3RyID0gbnVsbDtcbiAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgfTtcblxuICAgdmFyIFJlY3Vyc0RlY29tcEl0ZXJhdG9yID0gZnVuY3Rpb24oaXQsIGNhbm8pe1xuICAgICAgdGhpcy5pdCA9IGl0O1xuICAgICAgdGhpcy5jYW5vbmljYWwgPSBjYW5vO1xuICAgICAgdGhpcy5yZXNCdWYgPSBbXTtcbiAgIH07XG5cbiAgIFJlY3Vyc0RlY29tcEl0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKXtcbiAgICAgIGZ1bmN0aW9uIHJlY3Vyc2l2ZURlY29tcChjYW5vLCB1Y2hhcil7XG4gICAgICAgICB2YXIgZGVjb21wID0gdWNoYXIuZ2V0RGVjb21wKCk7XG4gICAgICAgICBpZighIWRlY29tcCAmJiAhKGNhbm8gJiYgdWNoYXIuaXNDb21wYXRpYmlsaXR5KCkpKXtcbiAgICAgICAgICAgIHZhciByZXQgPSBbXTtcbiAgICAgICAgICAgIGZvcih2YXIgaSA9IDA7IGkgPCBkZWNvbXAubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgICAgdmFyIGEgPSByZWN1cnNpdmVEZWNvbXAoY2FubywgVUNoYXIuZnJvbUNoYXJDb2RlKGRlY29tcFtpXSkpO1xuICAgICAgICAgICAgICAgLy9yZXQuY29uY2F0KGEpOyAvLzwtd2h5IGRvZXMgbm90IHRoaXMgd29yaz9cbiAgICAgICAgICAgICAgIC8vZm9sbG93aW5nIGJsb2NrIGlzIGEgd29ya2Fyb3VuZC5cbiAgICAgICAgICAgICAgIGZvcih2YXIgaiA9IDA7IGogPCBhLmxlbmd0aDsgKytqKXtcbiAgICAgICAgICAgICAgICAgIHJldC5wdXNoKGFbal0pO1xuICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW3VjaGFyXTtcbiAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmKHRoaXMucmVzQnVmLmxlbmd0aCA9PT0gMCl7XG4gICAgICAgICB2YXIgdWNoYXIgPSB0aGlzLml0Lm5leHQoKTtcbiAgICAgICAgIGlmKCF1Y2hhcil7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgIH1cbiAgICAgICAgIHRoaXMucmVzQnVmID0gcmVjdXJzaXZlRGVjb21wKHRoaXMuY2Fub25pY2FsLCB1Y2hhcik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZXNCdWYuc2hpZnQoKTtcbiAgIH07XG5cbiAgIHZhciBEZWNvbXBJdGVyYXRvciA9IGZ1bmN0aW9uKGl0KXtcbiAgICAgIHRoaXMuaXQgPSBpdDtcbiAgICAgIHRoaXMucmVzQnVmID0gW107XG4gICB9O1xuXG4gICBEZWNvbXBJdGVyYXRvci5wcm90b3R5cGUubmV4dCA9IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgY2M7XG4gICAgICBpZih0aGlzLnJlc0J1Zi5sZW5ndGggPT09IDApe1xuICAgICAgICAgZG97XG4gICAgICAgICAgICB2YXIgdWNoYXIgPSB0aGlzLml0Lm5leHQoKTtcbiAgICAgICAgICAgIGlmKCF1Y2hhcil7XG4gICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNjID0gdWNoYXIuZ2V0Q2Fub25pY2FsQ2xhc3MoKTtcbiAgICAgICAgICAgIHZhciBpbnNwdCA9IHRoaXMucmVzQnVmLmxlbmd0aDtcbiAgICAgICAgICAgIGlmKGNjICE9PSAwKXtcbiAgICAgICAgICAgICAgIGZvcig7IGluc3B0ID4gMDsgLS1pbnNwdCl7XG4gICAgICAgICAgICAgICAgICB2YXIgdWNoYXIyID0gdGhpcy5yZXNCdWZbaW5zcHQgLSAxXTtcbiAgICAgICAgICAgICAgICAgIHZhciBjYzIgPSB1Y2hhcjIuZ2V0Q2Fub25pY2FsQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICAgIGlmKGNjMiA8PSBjYyl7XG4gICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMucmVzQnVmLnNwbGljZShpbnNwdCwgMCwgdWNoYXIpO1xuICAgICAgICAgfSB3aGlsZShjYyAhPT0gMCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5yZXNCdWYuc2hpZnQoKTtcbiAgIH07XG5cbiAgIHZhciBDb21wSXRlcmF0b3IgPSBmdW5jdGlvbihpdCl7XG4gICAgICB0aGlzLml0ID0gaXQ7XG4gICAgICB0aGlzLnByb2NCdWYgPSBbXTtcbiAgICAgIHRoaXMucmVzQnVmID0gW107XG4gICAgICB0aGlzLmxhc3RDbGFzcyA9IG51bGw7XG4gICB9O1xuXG4gICBDb21wSXRlcmF0b3IucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbigpe1xuICAgICAgd2hpbGUodGhpcy5yZXNCdWYubGVuZ3RoID09PSAwKXtcbiAgICAgICAgIHZhciB1Y2hhciA9IHRoaXMuaXQubmV4dCgpO1xuICAgICAgICAgaWYoIXVjaGFyKXtcbiAgICAgICAgICAgIHRoaXMucmVzQnVmID0gdGhpcy5wcm9jQnVmO1xuICAgICAgICAgICAgdGhpcy5wcm9jQnVmID0gW107XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgIH1cbiAgICAgICAgIGlmKHRoaXMucHJvY0J1Zi5sZW5ndGggPT09IDApe1xuICAgICAgICAgICAgdGhpcy5sYXN0Q2xhc3MgPSB1Y2hhci5nZXRDYW5vbmljYWxDbGFzcygpO1xuICAgICAgICAgICAgdGhpcy5wcm9jQnVmLnB1c2godWNoYXIpO1xuICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzdGFydGVyID0gdGhpcy5wcm9jQnVmWzBdO1xuICAgICAgICAgICAgdmFyIGNvbXBvc2l0ZSA9IHN0YXJ0ZXIuZ2V0Q29tcG9zaXRlKHVjaGFyKTtcbiAgICAgICAgICAgIHZhciBjYyA9IHVjaGFyLmdldENhbm9uaWNhbENsYXNzKCk7XG4gICAgICAgICAgICBpZighIWNvbXBvc2l0ZSAmJiAodGhpcy5sYXN0Q2xhc3MgPCBjYyB8fCB0aGlzLmxhc3RDbGFzcyA9PT0gMCkpe1xuICAgICAgICAgICAgICAgdGhpcy5wcm9jQnVmWzBdID0gY29tcG9zaXRlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgIGlmKGNjID09PSAwKXtcbiAgICAgICAgICAgICAgICAgIHRoaXMucmVzQnVmID0gdGhpcy5wcm9jQnVmO1xuICAgICAgICAgICAgICAgICAgdGhpcy5wcm9jQnVmID0gW107XG4gICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICB0aGlzLmxhc3RDbGFzcyA9IGNjO1xuICAgICAgICAgICAgICAgdGhpcy5wcm9jQnVmLnB1c2godWNoYXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMucmVzQnVmLnNoaWZ0KCk7XG4gICB9O1xuXG4gICB2YXIgY3JlYXRlSXRlcmF0b3IgPSBmdW5jdGlvbihtb2RlLCBzdHIpe1xuICAgICAgc3dpdGNoKG1vZGUpe1xuICAgICAgICAgY2FzZSBcIk5GRFwiOlxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZWNvbXBJdGVyYXRvcihuZXcgUmVjdXJzRGVjb21wSXRlcmF0b3IobmV3IFVDaGFySXRlcmF0b3Ioc3RyKSwgdHJ1ZSkpO1xuICAgICAgICAgY2FzZSBcIk5GS0RcIjpcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGVjb21wSXRlcmF0b3IobmV3IFJlY3Vyc0RlY29tcEl0ZXJhdG9yKG5ldyBVQ2hhckl0ZXJhdG9yKHN0ciksIGZhbHNlKSk7XG4gICAgICAgICBjYXNlIFwiTkZDXCI6XG4gICAgICAgICAgICByZXR1cm4gbmV3IENvbXBJdGVyYXRvcihuZXcgRGVjb21wSXRlcmF0b3IobmV3IFJlY3Vyc0RlY29tcEl0ZXJhdG9yKG5ldyBVQ2hhckl0ZXJhdG9yKHN0ciksIHRydWUpKSk7XG4gICAgICAgICBjYXNlIFwiTkZLQ1wiOlxuICAgICAgICAgICAgcmV0dXJuIG5ldyBDb21wSXRlcmF0b3IobmV3IERlY29tcEl0ZXJhdG9yKG5ldyBSZWN1cnNEZWNvbXBJdGVyYXRvcihuZXcgVUNoYXJJdGVyYXRvcihzdHIpLCBmYWxzZSkpKTtcbiAgICAgIH1cbiAgICAgIHRocm93IG1vZGUgKyBcIiBpcyBpbnZhbGlkXCI7XG4gICB9O1xuICAgdmFyIG5vcm1hbGl6ZSA9IGZ1bmN0aW9uKG1vZGUsIHN0cil7XG4gICAgICB2YXIgaXQgPSBjcmVhdGVJdGVyYXRvcihtb2RlLCBzdHIpO1xuICAgICAgdmFyIHJldCA9IFwiXCI7XG4gICAgICB2YXIgdWNoYXI7XG4gICAgICB3aGlsZSghISh1Y2hhciA9IGl0Lm5leHQoKSkpe1xuICAgICAgICAgcmV0ICs9IHVjaGFyLnRvU3RyaW5nKCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmV0O1xuICAgfTtcblxuICAgLyogQVBJIGZ1bmN0aW9ucyAqL1xuICAgZnVuY3Rpb24gbmZkKHN0cil7XG4gICAgICByZXR1cm4gbm9ybWFsaXplKFwiTkZEXCIsIHN0cik7XG4gICB9XG5cbiAgIGZ1bmN0aW9uIG5ma2Qoc3RyKXtcbiAgICAgIHJldHVybiBub3JtYWxpemUoXCJORktEXCIsIHN0cik7XG4gICB9XG5cbiAgIGZ1bmN0aW9uIG5mYyhzdHIpe1xuICAgICAgcmV0dXJuIG5vcm1hbGl6ZShcIk5GQ1wiLCBzdHIpO1xuICAgfVxuXG4gICBmdW5jdGlvbiBuZmtjKHN0cil7XG4gICAgICByZXR1cm4gbm9ybWFsaXplKFwiTkZLQ1wiLCBzdHIpO1xuICAgfVxuXG4vKiBVbmljb2RlIGRhdGEgKi9cblVDaGFyLnVkYXRhPXtcbjA6ezYwOlssLHs4MjQ6ODgxNH1dLDYxOlssLHs4MjQ6ODgwMH1dLDYyOlssLHs4MjQ6ODgxNX1dLDY1OlssLHs3Njg6MTkyLDc2OToxOTMsNzcwOjE5NCw3NzE6MTk1LDc3MjoyNTYsNzc0OjI1OCw3NzU6NTUwLDc3NjoxOTYsNzc3Ojc4NDIsNzc4OjE5Nyw3ODA6NDYxLDc4Mzo1MTIsNzg1OjUxNCw4MDM6Nzg0MCw4MDU6NzY4MCw4MDg6MjYwfV0sNjY6Wywsezc3NTo3NjgyLDgwMzo3Njg0LDgxNzo3Njg2fV0sNjc6Wywsezc2OToyNjIsNzcwOjI2NCw3NzU6MjY2LDc4MDoyNjgsODA3OjE5OX1dLDY4OlssLHs3NzU6NzY5MCw3ODA6MjcwLDgwMzo3NjkyLDgwNzo3Njk2LDgxMzo3Njk4LDgxNzo3Njk0fV0sNjk6Wywsezc2ODoyMDAsNzY5OjIwMSw3NzA6MjAyLDc3MTo3ODY4LDc3MjoyNzQsNzc0OjI3Niw3NzU6Mjc4LDc3NjoyMDMsNzc3Ojc4NjYsNzgwOjI4Miw3ODM6NTE2LDc4NTo1MTgsODAzOjc4NjQsODA3OjU1Miw4MDg6MjgwLDgxMzo3NzA0LDgxNjo3NzA2fV0sNzA6Wywsezc3NTo3NzEwfV0sNzE6Wywsezc2OTo1MDAsNzcwOjI4NCw3NzI6NzcxMiw3NzQ6Mjg2LDc3NToyODgsNzgwOjQ4Niw4MDc6MjkwfV0sNzI6Wywsezc3MDoyOTIsNzc1Ojc3MTQsNzc2Ojc3MTgsNzgwOjU0Miw4MDM6NzcxNiw4MDc6NzcyMCw4MTQ6NzcyMn1dLDczOlssLHs3Njg6MjA0LDc2OToyMDUsNzcwOjIwNiw3NzE6Mjk2LDc3MjoyOTgsNzc0OjMwMCw3NzU6MzA0LDc3NjoyMDcsNzc3Ojc4ODAsNzgwOjQ2Myw3ODM6NTIwLDc4NTo1MjIsODAzOjc4ODIsODA4OjMwMiw4MTY6NzcyNH1dLDc0OlssLHs3NzA6MzA4fV0sNzU6Wywsezc2OTo3NzI4LDc4MDo0ODgsODAzOjc3MzAsODA3OjMxMCw4MTc6NzczMn1dLDc2OlssLHs3Njk6MzEzLDc4MDozMTcsODAzOjc3MzQsODA3OjMxNSw4MTM6Nzc0MCw4MTc6NzczOH1dLDc3OlssLHs3Njk6Nzc0Miw3NzU6Nzc0NCw4MDM6Nzc0Nn1dLDc4OlssLHs3Njg6NTA0LDc2OTozMjMsNzcxOjIwOSw3NzU6Nzc0OCw3ODA6MzI3LDgwMzo3NzUwLDgwNzozMjUsODEzOjc3NTQsODE3Ojc3NTJ9XSw3OTpbLCx7NzY4OjIxMCw3Njk6MjExLDc3MDoyMTIsNzcxOjIxMyw3NzI6MzMyLDc3NDozMzQsNzc1OjU1OCw3NzY6MjE0LDc3Nzo3ODg2LDc3OTozMzYsNzgwOjQ2NSw3ODM6NTI0LDc4NTo1MjYsNzk1OjQxNiw4MDM6Nzg4NCw4MDg6NDkwfV0sODA6Wywsezc2OTo3NzY0LDc3NTo3NzY2fV0sODI6Wywsezc2OTozNDAsNzc1Ojc3NjgsNzgwOjM0NCw3ODM6NTI4LDc4NTo1MzAsODAzOjc3NzAsODA3OjM0Miw4MTc6Nzc3NH1dLDgzOlssLHs3Njk6MzQ2LDc3MDozNDgsNzc1Ojc3NzYsNzgwOjM1Miw4MDM6Nzc3OCw4MDY6NTM2LDgwNzozNTB9XSw4NDpbLCx7Nzc1Ojc3ODYsNzgwOjM1Niw4MDM6Nzc4OCw4MDY6NTM4LDgwNzozNTQsODEzOjc3OTIsODE3Ojc3OTB9XSw4NTpbLCx7NzY4OjIxNyw3Njk6MjE4LDc3MDoyMTksNzcxOjM2MCw3NzI6MzYyLDc3NDozNjQsNzc2OjIyMCw3Nzc6NzkxMCw3Nzg6MzY2LDc3OTozNjgsNzgwOjQ2Nyw3ODM6NTMyLDc4NTo1MzQsNzk1OjQzMSw4MDM6NzkwOCw4MDQ6Nzc5NCw4MDg6MzcwLDgxMzo3Nzk4LDgxNjo3Nzk2fV0sODY6Wywsezc3MTo3ODA0LDgwMzo3ODA2fV0sODc6Wywsezc2ODo3ODA4LDc2OTo3ODEwLDc3MDozNzIsNzc1Ojc4MTQsNzc2Ojc4MTIsODAzOjc4MTZ9XSw4ODpbLCx7Nzc1Ojc4MTgsNzc2Ojc4MjB9XSw4OTpbLCx7NzY4Ojc5MjIsNzY5OjIyMSw3NzA6Mzc0LDc3MTo3OTI4LDc3Mjo1NjIsNzc1Ojc4MjIsNzc2OjM3Niw3Nzc6NzkyNiw4MDM6NzkyNH1dLDkwOlssLHs3Njk6Mzc3LDc3MDo3ODI0LDc3NTozNzksNzgwOjM4MSw4MDM6NzgyNiw4MTc6NzgyOH1dLDk3OlssLHs3Njg6MjI0LDc2OToyMjUsNzcwOjIyNiw3NzE6MjI3LDc3MjoyNTcsNzc0OjI1OSw3NzU6NTUxLDc3NjoyMjgsNzc3Ojc4NDMsNzc4OjIyOSw3ODA6NDYyLDc4Mzo1MTMsNzg1OjUxNSw4MDM6Nzg0MSw4MDU6NzY4MSw4MDg6MjYxfV0sOTg6Wywsezc3NTo3NjgzLDgwMzo3Njg1LDgxNzo3Njg3fV0sOTk6Wywsezc2OToyNjMsNzcwOjI2NSw3NzU6MjY3LDc4MDoyNjksODA3OjIzMX1dLDEwMDpbLCx7Nzc1Ojc2OTEsNzgwOjI3MSw4MDM6NzY5Myw4MDc6NzY5Nyw4MTM6NzY5OSw4MTc6NzY5NX1dLDEwMTpbLCx7NzY4OjIzMiw3Njk6MjMzLDc3MDoyMzQsNzcxOjc4NjksNzcyOjI3NSw3NzQ6Mjc3LDc3NToyNzksNzc2OjIzNSw3Nzc6Nzg2Nyw3ODA6MjgzLDc4Mzo1MTcsNzg1OjUxOSw4MDM6Nzg2NSw4MDc6NTUzLDgwODoyODEsODEzOjc3MDUsODE2Ojc3MDd9XSwxMDI6Wywsezc3NTo3NzExfV0sMTAzOlssLHs3Njk6NTAxLDc3MDoyODUsNzcyOjc3MTMsNzc0OjI4Nyw3NzU6Mjg5LDc4MDo0ODcsODA3OjI5MX1dLDEwNDpbLCx7NzcwOjI5Myw3NzU6NzcxNSw3NzY6NzcxOSw3ODA6NTQzLDgwMzo3NzE3LDgwNzo3NzIxLDgxNDo3NzIzLDgxNzo3ODMwfV0sMTA1OlssLHs3Njg6MjM2LDc2OToyMzcsNzcwOjIzOCw3NzE6Mjk3LDc3MjoyOTksNzc0OjMwMSw3NzY6MjM5LDc3Nzo3ODgxLDc4MDo0NjQsNzgzOjUyMSw3ODU6NTIzLDgwMzo3ODgzLDgwODozMDMsODE2Ojc3MjV9XSwxMDY6Wywsezc3MDozMDksNzgwOjQ5Nn1dLDEwNzpbLCx7NzY5Ojc3MjksNzgwOjQ4OSw4MDM6NzczMSw4MDc6MzExLDgxNzo3NzMzfV0sMTA4OlssLHs3Njk6MzE0LDc4MDozMTgsODAzOjc3MzUsODA3OjMxNiw4MTM6Nzc0MSw4MTc6NzczOX1dLDEwOTpbLCx7NzY5Ojc3NDMsNzc1Ojc3NDUsODAzOjc3NDd9XSwxMTA6Wywsezc2ODo1MDUsNzY5OjMyNCw3NzE6MjQxLDc3NTo3NzQ5LDc4MDozMjgsODAzOjc3NTEsODA3OjMyNiw4MTM6Nzc1NSw4MTc6Nzc1M31dLDExMTpbLCx7NzY4OjI0Miw3Njk6MjQzLDc3MDoyNDQsNzcxOjI0NSw3NzI6MzMzLDc3NDozMzUsNzc1OjU1OSw3NzY6MjQ2LDc3Nzo3ODg3LDc3OTozMzcsNzgwOjQ2Niw3ODM6NTI1LDc4NTo1MjcsNzk1OjQxNyw4MDM6Nzg4NSw4MDg6NDkxfV0sMTEyOlssLHs3Njk6Nzc2NSw3NzU6Nzc2N31dLDExNDpbLCx7NzY5OjM0MSw3NzU6Nzc2OSw3ODA6MzQ1LDc4Mzo1MjksNzg1OjUzMSw4MDM6Nzc3MSw4MDc6MzQzLDgxNzo3Nzc1fV0sMTE1OlssLHs3Njk6MzQ3LDc3MDozNDksNzc1Ojc3NzcsNzgwOjM1Myw4MDM6Nzc3OSw4MDY6NTM3LDgwNzozNTF9XSwxMTY6Wywsezc3NTo3Nzg3LDc3Njo3ODMxLDc4MDozNTcsODAzOjc3ODksODA2OjUzOSw4MDc6MzU1LDgxMzo3NzkzLDgxNzo3NzkxfV0sMTE3OlssLHs3Njg6MjQ5LDc2OToyNTAsNzcwOjI1MSw3NzE6MzYxLDc3MjozNjMsNzc0OjM2NSw3NzY6MjUyLDc3Nzo3OTExLDc3ODozNjcsNzc5OjM2OSw3ODA6NDY4LDc4Mzo1MzMsNzg1OjUzNSw3OTU6NDMyLDgwMzo3OTA5LDgwNDo3Nzk1LDgwODozNzEsODEzOjc3OTksODE2Ojc3OTd9XSwxMTg6Wywsezc3MTo3ODA1LDgwMzo3ODA3fV0sMTE5OlssLHs3Njg6NzgwOSw3Njk6NzgxMSw3NzA6MzczLDc3NTo3ODE1LDc3Njo3ODEzLDc3ODo3ODMyLDgwMzo3ODE3fV0sMTIwOlssLHs3NzU6NzgxOSw3NzY6NzgyMX1dLDEyMTpbLCx7NzY4Ojc5MjMsNzY5OjI1Myw3NzA6Mzc1LDc3MTo3OTI5LDc3Mjo1NjMsNzc1Ojc4MjMsNzc2OjI1NSw3Nzc6NzkyNyw3Nzg6NzgzMyw4MDM6NzkyNX1dLDEyMjpbLCx7NzY5OjM3OCw3NzA6NzgyNSw3NzU6MzgwLDc4MDozODIsODAzOjc4MjcsODE3Ojc4Mjl9XSwxNjA6W1szMl0sMjU2XSwxNjg6W1szMiw3NzZdLDI1Nix7NzY4OjgxNzMsNzY5OjkwMSw4MzQ6ODEyOX1dLDE3MDpbWzk3XSwyNTZdLDE3NTpbWzMyLDc3Ml0sMjU2XSwxNzg6W1s1MF0sMjU2XSwxNzk6W1s1MV0sMjU2XSwxODA6W1szMiw3NjldLDI1Nl0sMTgxOltbOTU2XSwyNTZdLDE4NDpbWzMyLDgwN10sMjU2XSwxODU6W1s0OV0sMjU2XSwxODY6W1sxMTFdLDI1Nl0sMTg4OltbNDksODI2MCw1Ml0sMjU2XSwxODk6W1s0OSw4MjYwLDUwXSwyNTZdLDE5MDpbWzUxLDgyNjAsNTJdLDI1Nl0sMTkyOltbNjUsNzY4XV0sMTkzOltbNjUsNzY5XV0sMTk0OltbNjUsNzcwXSwsezc2ODo3ODQ2LDc2OTo3ODQ0LDc3MTo3ODUwLDc3Nzo3ODQ4fV0sMTk1OltbNjUsNzcxXV0sMTk2OltbNjUsNzc2XSwsezc3Mjo0Nzh9XSwxOTc6W1s2NSw3NzhdLCx7NzY5OjUwNn1dLDE5ODpbLCx7NzY5OjUwOCw3NzI6NDgyfV0sMTk5OltbNjcsODA3XSwsezc2OTo3Njg4fV0sMjAwOltbNjksNzY4XV0sMjAxOltbNjksNzY5XV0sMjAyOltbNjksNzcwXSwsezc2ODo3ODcyLDc2OTo3ODcwLDc3MTo3ODc2LDc3Nzo3ODc0fV0sMjAzOltbNjksNzc2XV0sMjA0OltbNzMsNzY4XV0sMjA1OltbNzMsNzY5XV0sMjA2OltbNzMsNzcwXV0sMjA3OltbNzMsNzc2XSwsezc2OTo3NzI2fV0sMjA5OltbNzgsNzcxXV0sMjEwOltbNzksNzY4XV0sMjExOltbNzksNzY5XV0sMjEyOltbNzksNzcwXSwsezc2ODo3ODkwLDc2OTo3ODg4LDc3MTo3ODk0LDc3Nzo3ODkyfV0sMjEzOltbNzksNzcxXSwsezc2OTo3NzU2LDc3Mjo1NTYsNzc2Ojc3NTh9XSwyMTQ6W1s3OSw3NzZdLCx7NzcyOjU1NH1dLDIxNjpbLCx7NzY5OjUxMH1dLDIxNzpbWzg1LDc2OF1dLDIxODpbWzg1LDc2OV1dLDIxOTpbWzg1LDc3MF1dLDIyMDpbWzg1LDc3Nl0sLHs3Njg6NDc1LDc2OTo0NzEsNzcyOjQ2OSw3ODA6NDczfV0sMjIxOltbODksNzY5XV0sMjI0OltbOTcsNzY4XV0sMjI1OltbOTcsNzY5XV0sMjI2OltbOTcsNzcwXSwsezc2ODo3ODQ3LDc2OTo3ODQ1LDc3MTo3ODUxLDc3Nzo3ODQ5fV0sMjI3OltbOTcsNzcxXV0sMjI4OltbOTcsNzc2XSwsezc3Mjo0Nzl9XSwyMjk6W1s5Nyw3NzhdLCx7NzY5OjUwN31dLDIzMDpbLCx7NzY5OjUwOSw3NzI6NDgzfV0sMjMxOltbOTksODA3XSwsezc2OTo3Njg5fV0sMjMyOltbMTAxLDc2OF1dLDIzMzpbWzEwMSw3NjldXSwyMzQ6W1sxMDEsNzcwXSwsezc2ODo3ODczLDc2OTo3ODcxLDc3MTo3ODc3LDc3Nzo3ODc1fV0sMjM1OltbMTAxLDc3Nl1dLDIzNjpbWzEwNSw3NjhdXSwyMzc6W1sxMDUsNzY5XV0sMjM4OltbMTA1LDc3MF1dLDIzOTpbWzEwNSw3NzZdLCx7NzY5Ojc3Mjd9XSwyNDE6W1sxMTAsNzcxXV0sMjQyOltbMTExLDc2OF1dLDI0MzpbWzExMSw3NjldXSwyNDQ6W1sxMTEsNzcwXSwsezc2ODo3ODkxLDc2OTo3ODg5LDc3MTo3ODk1LDc3Nzo3ODkzfV0sMjQ1OltbMTExLDc3MV0sLHs3Njk6Nzc1Nyw3NzI6NTU3LDc3Njo3NzU5fV0sMjQ2OltbMTExLDc3Nl0sLHs3NzI6NTU1fV0sMjQ4OlssLHs3Njk6NTExfV0sMjQ5OltbMTE3LDc2OF1dLDI1MDpbWzExNyw3NjldXSwyNTE6W1sxMTcsNzcwXV0sMjUyOltbMTE3LDc3Nl0sLHs3Njg6NDc2LDc2OTo0NzIsNzcyOjQ3MCw3ODA6NDc0fV0sMjUzOltbMTIxLDc2OV1dLDI1NTpbWzEyMSw3NzZdXX0sXG4yNTY6ezI1NjpbWzY1LDc3Ml1dLDI1NzpbWzk3LDc3Ml1dLDI1ODpbWzY1LDc3NF0sLHs3Njg6Nzg1Niw3Njk6Nzg1NCw3NzE6Nzg2MCw3Nzc6Nzg1OH1dLDI1OTpbWzk3LDc3NF0sLHs3Njg6Nzg1Nyw3Njk6Nzg1NSw3NzE6Nzg2MSw3Nzc6Nzg1OX1dLDI2MDpbWzY1LDgwOF1dLDI2MTpbWzk3LDgwOF1dLDI2MjpbWzY3LDc2OV1dLDI2MzpbWzk5LDc2OV1dLDI2NDpbWzY3LDc3MF1dLDI2NTpbWzk5LDc3MF1dLDI2NjpbWzY3LDc3NV1dLDI2NzpbWzk5LDc3NV1dLDI2ODpbWzY3LDc4MF1dLDI2OTpbWzk5LDc4MF1dLDI3MDpbWzY4LDc4MF1dLDI3MTpbWzEwMCw3ODBdXSwyNzQ6W1s2OSw3NzJdLCx7NzY4Ojc3MDAsNzY5Ojc3MDJ9XSwyNzU6W1sxMDEsNzcyXSwsezc2ODo3NzAxLDc2OTo3NzAzfV0sMjc2OltbNjksNzc0XV0sMjc3OltbMTAxLDc3NF1dLDI3ODpbWzY5LDc3NV1dLDI3OTpbWzEwMSw3NzVdXSwyODA6W1s2OSw4MDhdXSwyODE6W1sxMDEsODA4XV0sMjgyOltbNjksNzgwXV0sMjgzOltbMTAxLDc4MF1dLDI4NDpbWzcxLDc3MF1dLDI4NTpbWzEwMyw3NzBdXSwyODY6W1s3MSw3NzRdXSwyODc6W1sxMDMsNzc0XV0sMjg4OltbNzEsNzc1XV0sMjg5OltbMTAzLDc3NV1dLDI5MDpbWzcxLDgwN11dLDI5MTpbWzEwMyw4MDddXSwyOTI6W1s3Miw3NzBdXSwyOTM6W1sxMDQsNzcwXV0sMjk2OltbNzMsNzcxXV0sMjk3OltbMTA1LDc3MV1dLDI5ODpbWzczLDc3Ml1dLDI5OTpbWzEwNSw3NzJdXSwzMDA6W1s3Myw3NzRdXSwzMDE6W1sxMDUsNzc0XV0sMzAyOltbNzMsODA4XV0sMzAzOltbMTA1LDgwOF1dLDMwNDpbWzczLDc3NV1dLDMwNjpbWzczLDc0XSwyNTZdLDMwNzpbWzEwNSwxMDZdLDI1Nl0sMzA4OltbNzQsNzcwXV0sMzA5OltbMTA2LDc3MF1dLDMxMDpbWzc1LDgwN11dLDMxMTpbWzEwNyw4MDddXSwzMTM6W1s3Niw3NjldXSwzMTQ6W1sxMDgsNzY5XV0sMzE1OltbNzYsODA3XV0sMzE2OltbMTA4LDgwN11dLDMxNzpbWzc2LDc4MF1dLDMxODpbWzEwOCw3ODBdXSwzMTk6W1s3NiwxODNdLDI1Nl0sMzIwOltbMTA4LDE4M10sMjU2XSwzMjM6W1s3OCw3NjldXSwzMjQ6W1sxMTAsNzY5XV0sMzI1OltbNzgsODA3XV0sMzI2OltbMTEwLDgwN11dLDMyNzpbWzc4LDc4MF1dLDMyODpbWzExMCw3ODBdXSwzMjk6W1s3MDAsMTEwXSwyNTZdLDMzMjpbWzc5LDc3Ml0sLHs3Njg6Nzc2MCw3Njk6Nzc2Mn1dLDMzMzpbWzExMSw3NzJdLCx7NzY4Ojc3NjEsNzY5Ojc3NjN9XSwzMzQ6W1s3OSw3NzRdXSwzMzU6W1sxMTEsNzc0XV0sMzM2OltbNzksNzc5XV0sMzM3OltbMTExLDc3OV1dLDM0MDpbWzgyLDc2OV1dLDM0MTpbWzExNCw3NjldXSwzNDI6W1s4Miw4MDddXSwzNDM6W1sxMTQsODA3XV0sMzQ0OltbODIsNzgwXV0sMzQ1OltbMTE0LDc4MF1dLDM0NjpbWzgzLDc2OV0sLHs3NzU6Nzc4MH1dLDM0NzpbWzExNSw3NjldLCx7Nzc1Ojc3ODF9XSwzNDg6W1s4Myw3NzBdXSwzNDk6W1sxMTUsNzcwXV0sMzUwOltbODMsODA3XV0sMzUxOltbMTE1LDgwN11dLDM1MjpbWzgzLDc4MF0sLHs3NzU6Nzc4Mn1dLDM1MzpbWzExNSw3ODBdLCx7Nzc1Ojc3ODN9XSwzNTQ6W1s4NCw4MDddXSwzNTU6W1sxMTYsODA3XV0sMzU2OltbODQsNzgwXV0sMzU3OltbMTE2LDc4MF1dLDM2MDpbWzg1LDc3MV0sLHs3Njk6NzgwMH1dLDM2MTpbWzExNyw3NzFdLCx7NzY5Ojc4MDF9XSwzNjI6W1s4NSw3NzJdLCx7Nzc2Ojc4MDJ9XSwzNjM6W1sxMTcsNzcyXSwsezc3Njo3ODAzfV0sMzY0OltbODUsNzc0XV0sMzY1OltbMTE3LDc3NF1dLDM2NjpbWzg1LDc3OF1dLDM2NzpbWzExNyw3NzhdXSwzNjg6W1s4NSw3NzldXSwzNjk6W1sxMTcsNzc5XV0sMzcwOltbODUsODA4XV0sMzcxOltbMTE3LDgwOF1dLDM3MjpbWzg3LDc3MF1dLDM3MzpbWzExOSw3NzBdXSwzNzQ6W1s4OSw3NzBdXSwzNzU6W1sxMjEsNzcwXV0sMzc2OltbODksNzc2XV0sMzc3OltbOTAsNzY5XV0sMzc4OltbMTIyLDc2OV1dLDM3OTpbWzkwLDc3NV1dLDM4MDpbWzEyMiw3NzVdXSwzODE6W1s5MCw3ODBdXSwzODI6W1sxMjIsNzgwXV0sMzgzOltbMTE1XSwyNTYsezc3NTo3ODM1fV0sNDE2OltbNzksNzk1XSwsezc2ODo3OTAwLDc2OTo3ODk4LDc3MTo3OTA0LDc3Nzo3OTAyLDgwMzo3OTA2fV0sNDE3OltbMTExLDc5NV0sLHs3Njg6NzkwMSw3Njk6Nzg5OSw3NzE6NzkwNSw3Nzc6NzkwMyw4MDM6NzkwN31dLDQzMTpbWzg1LDc5NV0sLHs3Njg6NzkxNCw3Njk6NzkxMiw3NzE6NzkxOCw3Nzc6NzkxNiw4MDM6NzkyMH1dLDQzMjpbWzExNyw3OTVdLCx7NzY4Ojc5MTUsNzY5Ojc5MTMsNzcxOjc5MTksNzc3Ojc5MTcsODAzOjc5MjF9XSw0Mzk6Wywsezc4MDo0OTR9XSw0NTI6W1s2OCwzODFdLDI1Nl0sNDUzOltbNjgsMzgyXSwyNTZdLDQ1NDpbWzEwMCwzODJdLDI1Nl0sNDU1OltbNzYsNzRdLDI1Nl0sNDU2OltbNzYsMTA2XSwyNTZdLDQ1NzpbWzEwOCwxMDZdLDI1Nl0sNDU4OltbNzgsNzRdLDI1Nl0sNDU5OltbNzgsMTA2XSwyNTZdLDQ2MDpbWzExMCwxMDZdLDI1Nl0sNDYxOltbNjUsNzgwXV0sNDYyOltbOTcsNzgwXV0sNDYzOltbNzMsNzgwXV0sNDY0OltbMTA1LDc4MF1dLDQ2NTpbWzc5LDc4MF1dLDQ2NjpbWzExMSw3ODBdXSw0Njc6W1s4NSw3ODBdXSw0Njg6W1sxMTcsNzgwXV0sNDY5OltbMjIwLDc3Ml1dLDQ3MDpbWzI1Miw3NzJdXSw0NzE6W1syMjAsNzY5XV0sNDcyOltbMjUyLDc2OV1dLDQ3MzpbWzIyMCw3ODBdXSw0NzQ6W1syNTIsNzgwXV0sNDc1OltbMjIwLDc2OF1dLDQ3NjpbWzI1Miw3NjhdXSw0Nzg6W1sxOTYsNzcyXV0sNDc5OltbMjI4LDc3Ml1dLDQ4MDpbWzU1MCw3NzJdXSw0ODE6W1s1NTEsNzcyXV0sNDgyOltbMTk4LDc3Ml1dLDQ4MzpbWzIzMCw3NzJdXSw0ODY6W1s3MSw3ODBdXSw0ODc6W1sxMDMsNzgwXV0sNDg4OltbNzUsNzgwXV0sNDg5OltbMTA3LDc4MF1dLDQ5MDpbWzc5LDgwOF0sLHs3NzI6NDkyfV0sNDkxOltbMTExLDgwOF0sLHs3NzI6NDkzfV0sNDkyOltbNDkwLDc3Ml1dLDQ5MzpbWzQ5MSw3NzJdXSw0OTQ6W1s0MzksNzgwXV0sNDk1OltbNjU4LDc4MF1dLDQ5NjpbWzEwNiw3ODBdXSw0OTc6W1s2OCw5MF0sMjU2XSw0OTg6W1s2OCwxMjJdLDI1Nl0sNDk5OltbMTAwLDEyMl0sMjU2XSw1MDA6W1s3MSw3NjldXSw1MDE6W1sxMDMsNzY5XV0sNTA0OltbNzgsNzY4XV0sNTA1OltbMTEwLDc2OF1dLDUwNjpbWzE5Nyw3NjldXSw1MDc6W1syMjksNzY5XV0sNTA4OltbMTk4LDc2OV1dLDUwOTpbWzIzMCw3NjldXSw1MTA6W1syMTYsNzY5XV0sNTExOltbMjQ4LDc2OV1dLDY2MDQ1OlssMjIwXX0sXG41MTI6ezUxMjpbWzY1LDc4M11dLDUxMzpbWzk3LDc4M11dLDUxNDpbWzY1LDc4NV1dLDUxNTpbWzk3LDc4NV1dLDUxNjpbWzY5LDc4M11dLDUxNzpbWzEwMSw3ODNdXSw1MTg6W1s2OSw3ODVdXSw1MTk6W1sxMDEsNzg1XV0sNTIwOltbNzMsNzgzXV0sNTIxOltbMTA1LDc4M11dLDUyMjpbWzczLDc4NV1dLDUyMzpbWzEwNSw3ODVdXSw1MjQ6W1s3OSw3ODNdXSw1MjU6W1sxMTEsNzgzXV0sNTI2OltbNzksNzg1XV0sNTI3OltbMTExLDc4NV1dLDUyODpbWzgyLDc4M11dLDUyOTpbWzExNCw3ODNdXSw1MzA6W1s4Miw3ODVdXSw1MzE6W1sxMTQsNzg1XV0sNTMyOltbODUsNzgzXV0sNTMzOltbMTE3LDc4M11dLDUzNDpbWzg1LDc4NV1dLDUzNTpbWzExNyw3ODVdXSw1MzY6W1s4Myw4MDZdXSw1Mzc6W1sxMTUsODA2XV0sNTM4OltbODQsODA2XV0sNTM5OltbMTE2LDgwNl1dLDU0MjpbWzcyLDc4MF1dLDU0MzpbWzEwNCw3ODBdXSw1NTA6W1s2NSw3NzVdLCx7NzcyOjQ4MH1dLDU1MTpbWzk3LDc3NV0sLHs3NzI6NDgxfV0sNTUyOltbNjksODA3XSwsezc3NDo3NzA4fV0sNTUzOltbMTAxLDgwN10sLHs3NzQ6NzcwOX1dLDU1NDpbWzIxNCw3NzJdXSw1NTU6W1syNDYsNzcyXV0sNTU2OltbMjEzLDc3Ml1dLDU1NzpbWzI0NSw3NzJdXSw1NTg6W1s3OSw3NzVdLCx7NzcyOjU2MH1dLDU1OTpbWzExMSw3NzVdLCx7NzcyOjU2MX1dLDU2MDpbWzU1OCw3NzJdXSw1NjE6W1s1NTksNzcyXV0sNTYyOltbODksNzcyXV0sNTYzOltbMTIxLDc3Ml1dLDY1ODpbLCx7NzgwOjQ5NX1dLDY4ODpbWzEwNF0sMjU2XSw2ODk6W1s2MTRdLDI1Nl0sNjkwOltbMTA2XSwyNTZdLDY5MTpbWzExNF0sMjU2XSw2OTI6W1s2MzNdLDI1Nl0sNjkzOltbNjM1XSwyNTZdLDY5NDpbWzY0MV0sMjU2XSw2OTU6W1sxMTldLDI1Nl0sNjk2OltbMTIxXSwyNTZdLDcyODpbWzMyLDc3NF0sMjU2XSw3Mjk6W1szMiw3NzVdLDI1Nl0sNzMwOltbMzIsNzc4XSwyNTZdLDczMTpbWzMyLDgwOF0sMjU2XSw3MzI6W1szMiw3NzFdLDI1Nl0sNzMzOltbMzIsNzc5XSwyNTZdLDczNjpbWzYxMV0sMjU2XSw3Mzc6W1sxMDhdLDI1Nl0sNzM4OltbMTE1XSwyNTZdLDczOTpbWzEyMF0sMjU2XSw3NDA6W1s2NjFdLDI1Nl19LFxuNzY4Ons3Njg6WywyMzBdLDc2OTpbLDIzMF0sNzcwOlssMjMwXSw3NzE6WywyMzBdLDc3MjpbLDIzMF0sNzczOlssMjMwXSw3NzQ6WywyMzBdLDc3NTpbLDIzMF0sNzc2OlssMjMwLHs3Njk6ODM2fV0sNzc3OlssMjMwXSw3Nzg6WywyMzBdLDc3OTpbLDIzMF0sNzgwOlssMjMwXSw3ODE6WywyMzBdLDc4MjpbLDIzMF0sNzgzOlssMjMwXSw3ODQ6WywyMzBdLDc4NTpbLDIzMF0sNzg2OlssMjMwXSw3ODc6WywyMzBdLDc4ODpbLDIzMF0sNzg5OlssMjMyXSw3OTA6WywyMjBdLDc5MTpbLDIyMF0sNzkyOlssMjIwXSw3OTM6WywyMjBdLDc5NDpbLDIzMl0sNzk1OlssMjE2XSw3OTY6WywyMjBdLDc5NzpbLDIyMF0sNzk4OlssMjIwXSw3OTk6WywyMjBdLDgwMDpbLDIyMF0sODAxOlssMjAyXSw4MDI6WywyMDJdLDgwMzpbLDIyMF0sODA0OlssMjIwXSw4MDU6WywyMjBdLDgwNjpbLDIyMF0sODA3OlssMjAyXSw4MDg6WywyMDJdLDgwOTpbLDIyMF0sODEwOlssMjIwXSw4MTE6WywyMjBdLDgxMjpbLDIyMF0sODEzOlssMjIwXSw4MTQ6WywyMjBdLDgxNTpbLDIyMF0sODE2OlssMjIwXSw4MTc6WywyMjBdLDgxODpbLDIyMF0sODE5OlssMjIwXSw4MjA6WywxXSw4MjE6WywxXSw4MjI6WywxXSw4MjM6WywxXSw4MjQ6WywxXSw4MjU6WywyMjBdLDgyNjpbLDIyMF0sODI3OlssMjIwXSw4Mjg6WywyMjBdLDgyOTpbLDIzMF0sODMwOlssMjMwXSw4MzE6WywyMzBdLDgzMjpbWzc2OF0sMjMwXSw4MzM6W1s3NjldLDIzMF0sODM0OlssMjMwXSw4MzU6W1s3ODddLDIzMF0sODM2OltbNzc2LDc2OV0sMjMwXSw4Mzc6WywyNDBdLDgzODpbLDIzMF0sODM5OlssMjIwXSw4NDA6WywyMjBdLDg0MTpbLDIyMF0sODQyOlssMjMwXSw4NDM6WywyMzBdLDg0NDpbLDIzMF0sODQ1OlssMjIwXSw4NDY6WywyMjBdLDg0ODpbLDIzMF0sODQ5OlssMjMwXSw4NTA6WywyMzBdLDg1MTpbLDIyMF0sODUyOlssMjIwXSw4NTM6WywyMjBdLDg1NDpbLDIyMF0sODU1OlssMjMwXSw4NTY6WywyMzJdLDg1NzpbLDIyMF0sODU4OlssMjIwXSw4NTk6WywyMzBdLDg2MDpbLDIzM10sODYxOlssMjM0XSw4NjI6WywyMzRdLDg2MzpbLDIzM10sODY0OlssMjM0XSw4NjU6WywyMzRdLDg2NjpbLDIzM10sODY3OlssMjMwXSw4Njg6WywyMzBdLDg2OTpbLDIzMF0sODcwOlssMjMwXSw4NzE6WywyMzBdLDg3MjpbLDIzMF0sODczOlssMjMwXSw4NzQ6WywyMzBdLDg3NTpbLDIzMF0sODc2OlssMjMwXSw4Nzc6WywyMzBdLDg3ODpbLDIzMF0sODc5OlssMjMwXSw4ODQ6W1s2OTddXSw4OTA6W1szMiw4MzddLDI1Nl0sODk0OltbNTldXSw5MDA6W1szMiw3NjldLDI1Nl0sOTAxOltbMTY4LDc2OV1dLDkwMjpbWzkxMyw3NjldXSw5MDM6W1sxODNdXSw5MDQ6W1s5MTcsNzY5XV0sOTA1OltbOTE5LDc2OV1dLDkwNjpbWzkyMSw3NjldXSw5MDg6W1s5MjcsNzY5XV0sOTEwOltbOTMzLDc2OV1dLDkxMTpbWzkzNyw3NjldXSw5MTI6W1s5NzAsNzY5XV0sOTEzOlssLHs3Njg6ODEyMiw3Njk6OTAyLDc3Mjo4MTIxLDc3NDo4MTIwLDc4Nzo3OTQ0LDc4ODo3OTQ1LDgzNzo4MTI0fV0sOTE3OlssLHs3Njg6ODEzNiw3Njk6OTA0LDc4Nzo3OTYwLDc4ODo3OTYxfV0sOTE5OlssLHs3Njg6ODEzOCw3Njk6OTA1LDc4Nzo3OTc2LDc4ODo3OTc3LDgzNzo4MTQwfV0sOTIxOlssLHs3Njg6ODE1NCw3Njk6OTA2LDc3Mjo4MTUzLDc3NDo4MTUyLDc3Njo5MzgsNzg3Ojc5OTIsNzg4Ojc5OTN9XSw5Mjc6Wywsezc2ODo4MTg0LDc2OTo5MDgsNzg3OjgwMDgsNzg4OjgwMDl9XSw5Mjk6Wywsezc4ODo4MTcyfV0sOTMzOlssLHs3Njg6ODE3MCw3Njk6OTEwLDc3Mjo4MTY5LDc3NDo4MTY4LDc3Njo5MzksNzg4OjgwMjV9XSw5Mzc6Wywsezc2ODo4MTg2LDc2OTo5MTEsNzg3OjgwNDAsNzg4OjgwNDEsODM3OjgxODh9XSw5Mzg6W1s5MjEsNzc2XV0sOTM5OltbOTMzLDc3Nl1dLDk0MDpbWzk0NSw3NjldLCx7ODM3OjgxMTZ9XSw5NDE6W1s5NDksNzY5XV0sOTQyOltbOTUxLDc2OV0sLHs4Mzc6ODEzMn1dLDk0MzpbWzk1Myw3NjldXSw5NDQ6W1s5NzEsNzY5XV0sOTQ1OlssLHs3Njg6ODA0OCw3Njk6OTQwLDc3Mjo4MTEzLDc3NDo4MTEyLDc4Nzo3OTM2LDc4ODo3OTM3LDgzNDo4MTE4LDgzNzo4MTE1fV0sOTQ5OlssLHs3Njg6ODA1MCw3Njk6OTQxLDc4Nzo3OTUyLDc4ODo3OTUzfV0sOTUxOlssLHs3Njg6ODA1Miw3Njk6OTQyLDc4Nzo3OTY4LDc4ODo3OTY5LDgzNDo4MTM0LDgzNzo4MTMxfV0sOTUzOlssLHs3Njg6ODA1NCw3Njk6OTQzLDc3Mjo4MTQ1LDc3NDo4MTQ0LDc3Njo5NzAsNzg3Ojc5ODQsNzg4Ojc5ODUsODM0OjgxNTB9XSw5NTk6Wywsezc2ODo4MDU2LDc2OTo5NzIsNzg3OjgwMDAsNzg4OjgwMDF9XSw5NjE6Wywsezc4Nzo4MTY0LDc4ODo4MTY1fV0sOTY1OlssLHs3Njg6ODA1OCw3Njk6OTczLDc3Mjo4MTYxLDc3NDo4MTYwLDc3Njo5NzEsNzg3OjgwMTYsNzg4OjgwMTcsODM0OjgxNjZ9XSw5Njk6Wywsezc2ODo4MDYwLDc2OTo5NzQsNzg3OjgwMzIsNzg4OjgwMzMsODM0OjgxODIsODM3OjgxNzl9XSw5NzA6W1s5NTMsNzc2XSwsezc2ODo4MTQ2LDc2OTo5MTIsODM0OjgxNTF9XSw5NzE6W1s5NjUsNzc2XSwsezc2ODo4MTYyLDc2OTo5NDQsODM0OjgxNjd9XSw5NzI6W1s5NTksNzY5XV0sOTczOltbOTY1LDc2OV1dLDk3NDpbWzk2OSw3NjldLCx7ODM3OjgxODB9XSw5NzY6W1s5NDZdLDI1Nl0sOTc3OltbOTUyXSwyNTZdLDk3ODpbWzkzM10sMjU2LHs3Njk6OTc5LDc3Njo5ODB9XSw5Nzk6W1s5NzgsNzY5XV0sOTgwOltbOTc4LDc3Nl1dLDk4MTpbWzk2Nl0sMjU2XSw5ODI6W1s5NjBdLDI1Nl0sMTAwODpbWzk1NF0sMjU2XSwxMDA5OltbOTYxXSwyNTZdLDEwMTA6W1s5NjJdLDI1Nl0sMTAxMjpbWzkyMF0sMjU2XSwxMDEzOltbOTQ5XSwyNTZdLDEwMTc6W1s5MzFdLDI1Nl19LFxuMTAyNDp7MTAyNDpbWzEwNDUsNzY4XV0sMTAyNTpbWzEwNDUsNzc2XV0sMTAyNzpbWzEwNDMsNzY5XV0sMTAzMDpbLCx7Nzc2OjEwMzF9XSwxMDMxOltbMTAzMCw3NzZdXSwxMDM2OltbMTA1MCw3NjldXSwxMDM3OltbMTA0OCw3NjhdXSwxMDM4OltbMTA1OSw3NzRdXSwxMDQwOlssLHs3NzQ6MTIzMiw3NzY6MTIzNH1dLDEwNDM6Wywsezc2OToxMDI3fV0sMTA0NTpbLCx7NzY4OjEwMjQsNzc0OjEyMzgsNzc2OjEwMjV9XSwxMDQ2OlssLHs3NzQ6MTIxNyw3NzY6MTI0NH1dLDEwNDc6Wywsezc3NjoxMjQ2fV0sMTA0ODpbLCx7NzY4OjEwMzcsNzcyOjEyNTAsNzc0OjEwNDksNzc2OjEyNTJ9XSwxMDQ5OltbMTA0OCw3NzRdXSwxMDUwOlssLHs3Njk6MTAzNn1dLDEwNTQ6Wywsezc3NjoxMjU0fV0sMTA1OTpbLCx7NzcyOjEyNjIsNzc0OjEwMzgsNzc2OjEyNjQsNzc5OjEyNjZ9XSwxMDYzOlssLHs3NzY6MTI2OH1dLDEwNjc6Wywsezc3NjoxMjcyfV0sMTA2OTpbLCx7Nzc2OjEyNjB9XSwxMDcyOlssLHs3NzQ6MTIzMyw3NzY6MTIzNX1dLDEwNzU6Wywsezc2OToxMTA3fV0sMTA3NzpbLCx7NzY4OjExMDQsNzc0OjEyMzksNzc2OjExMDV9XSwxMDc4OlssLHs3NzQ6MTIxOCw3NzY6MTI0NX1dLDEwNzk6Wywsezc3NjoxMjQ3fV0sMTA4MDpbLCx7NzY4OjExMTcsNzcyOjEyNTEsNzc0OjEwODEsNzc2OjEyNTN9XSwxMDgxOltbMTA4MCw3NzRdXSwxMDgyOlssLHs3Njk6MTExNn1dLDEwODY6Wywsezc3NjoxMjU1fV0sMTA5MTpbLCx7NzcyOjEyNjMsNzc0OjExMTgsNzc2OjEyNjUsNzc5OjEyNjd9XSwxMDk1OlssLHs3NzY6MTI2OX1dLDEwOTk6Wywsezc3NjoxMjczfV0sMTEwMTpbLCx7Nzc2OjEyNjF9XSwxMTA0OltbMTA3Nyw3NjhdXSwxMTA1OltbMTA3Nyw3NzZdXSwxMTA3OltbMTA3NSw3NjldXSwxMTEwOlssLHs3NzY6MTExMX1dLDExMTE6W1sxMTEwLDc3Nl1dLDExMTY6W1sxMDgyLDc2OV1dLDExMTc6W1sxMDgwLDc2OF1dLDExMTg6W1sxMDkxLDc3NF1dLDExNDA6Wywsezc4MzoxMTQyfV0sMTE0MTpbLCx7NzgzOjExNDN9XSwxMTQyOltbMTE0MCw3ODNdXSwxMTQzOltbMTE0MSw3ODNdXSwxMTU1OlssMjMwXSwxMTU2OlssMjMwXSwxMTU3OlssMjMwXSwxMTU4OlssMjMwXSwxMTU5OlssMjMwXSwxMjE3OltbMTA0Niw3NzRdXSwxMjE4OltbMTA3OCw3NzRdXSwxMjMyOltbMTA0MCw3NzRdXSwxMjMzOltbMTA3Miw3NzRdXSwxMjM0OltbMTA0MCw3NzZdXSwxMjM1OltbMTA3Miw3NzZdXSwxMjM4OltbMTA0NSw3NzRdXSwxMjM5OltbMTA3Nyw3NzRdXSwxMjQwOlssLHs3NzY6MTI0Mn1dLDEyNDE6Wywsezc3NjoxMjQzfV0sMTI0MjpbWzEyNDAsNzc2XV0sMTI0MzpbWzEyNDEsNzc2XV0sMTI0NDpbWzEwNDYsNzc2XV0sMTI0NTpbWzEwNzgsNzc2XV0sMTI0NjpbWzEwNDcsNzc2XV0sMTI0NzpbWzEwNzksNzc2XV0sMTI1MDpbWzEwNDgsNzcyXV0sMTI1MTpbWzEwODAsNzcyXV0sMTI1MjpbWzEwNDgsNzc2XV0sMTI1MzpbWzEwODAsNzc2XV0sMTI1NDpbWzEwNTQsNzc2XV0sMTI1NTpbWzEwODYsNzc2XV0sMTI1NjpbLCx7Nzc2OjEyNTh9XSwxMjU3OlssLHs3NzY6MTI1OX1dLDEyNTg6W1sxMjU2LDc3Nl1dLDEyNTk6W1sxMjU3LDc3Nl1dLDEyNjA6W1sxMDY5LDc3Nl1dLDEyNjE6W1sxMTAxLDc3Nl1dLDEyNjI6W1sxMDU5LDc3Ml1dLDEyNjM6W1sxMDkxLDc3Ml1dLDEyNjQ6W1sxMDU5LDc3Nl1dLDEyNjU6W1sxMDkxLDc3Nl1dLDEyNjY6W1sxMDU5LDc3OV1dLDEyNjc6W1sxMDkxLDc3OV1dLDEyNjg6W1sxMDYzLDc3Nl1dLDEyNjk6W1sxMDk1LDc3Nl1dLDEyNzI6W1sxMDY3LDc3Nl1dLDEyNzM6W1sxMDk5LDc3Nl1dfSxcbjEyODA6ezE0MTU6W1sxMzgxLDE0MTBdLDI1Nl0sMTQyNTpbLDIyMF0sMTQyNjpbLDIzMF0sMTQyNzpbLDIzMF0sMTQyODpbLDIzMF0sMTQyOTpbLDIzMF0sMTQzMDpbLDIyMF0sMTQzMTpbLDIzMF0sMTQzMjpbLDIzMF0sMTQzMzpbLDIzMF0sMTQzNDpbLDIyMl0sMTQzNTpbLDIyMF0sMTQzNjpbLDIzMF0sMTQzNzpbLDIzMF0sMTQzODpbLDIzMF0sMTQzOTpbLDIzMF0sMTQ0MDpbLDIzMF0sMTQ0MTpbLDIzMF0sMTQ0MjpbLDIyMF0sMTQ0MzpbLDIyMF0sMTQ0NDpbLDIyMF0sMTQ0NTpbLDIyMF0sMTQ0NjpbLDIyMF0sMTQ0NzpbLDIyMF0sMTQ0ODpbLDIzMF0sMTQ0OTpbLDIzMF0sMTQ1MDpbLDIyMF0sMTQ1MTpbLDIzMF0sMTQ1MjpbLDIzMF0sMTQ1MzpbLDIyMl0sMTQ1NDpbLDIyOF0sMTQ1NTpbLDIzMF0sMTQ1NjpbLDEwXSwxNDU3OlssMTFdLDE0NTg6WywxMl0sMTQ1OTpbLDEzXSwxNDYwOlssMTRdLDE0NjE6WywxNV0sMTQ2MjpbLDE2XSwxNDYzOlssMTddLDE0NjQ6WywxOF0sMTQ2NTpbLDE5XSwxNDY2OlssMTldLDE0Njc6WywyMF0sMTQ2ODpbLDIxXSwxNDY5OlssMjJdLDE0NzE6WywyM10sMTQ3MzpbLDI0XSwxNDc0OlssMjVdLDE0NzY6WywyMzBdLDE0Nzc6WywyMjBdLDE0Nzk6WywxOF19LFxuMTUzNjp7MTU1MjpbLDIzMF0sMTU1MzpbLDIzMF0sMTU1NDpbLDIzMF0sMTU1NTpbLDIzMF0sMTU1NjpbLDIzMF0sMTU1NzpbLDIzMF0sMTU1ODpbLDIzMF0sMTU1OTpbLDIzMF0sMTU2MDpbLDMwXSwxNTYxOlssMzFdLDE1NjI6WywzMl0sMTU3MDpbWzE1NzUsMTYxOV1dLDE1NzE6W1sxNTc1LDE2MjBdXSwxNTcyOltbMTYwOCwxNjIwXV0sMTU3MzpbWzE1NzUsMTYyMV1dLDE1NzQ6W1sxNjEwLDE2MjBdXSwxNTc1OlssLHsxNjE5OjE1NzAsMTYyMDoxNTcxLDE2MjE6MTU3M31dLDE2MDg6WywsezE2MjA6MTU3Mn1dLDE2MTA6WywsezE2MjA6MTU3NH1dLDE2MTE6WywyN10sMTYxMjpbLDI4XSwxNjEzOlssMjldLDE2MTQ6WywzMF0sMTYxNTpbLDMxXSwxNjE2OlssMzJdLDE2MTc6WywzM10sMTYxODpbLDM0XSwxNjE5OlssMjMwXSwxNjIwOlssMjMwXSwxNjIxOlssMjIwXSwxNjIyOlssMjIwXSwxNjIzOlssMjMwXSwxNjI0OlssMjMwXSwxNjI1OlssMjMwXSwxNjI2OlssMjMwXSwxNjI3OlssMjMwXSwxNjI4OlssMjIwXSwxNjI5OlssMjMwXSwxNjMwOlssMjMwXSwxNjMxOlssMjIwXSwxNjQ4OlssMzVdLDE2NTM6W1sxNTc1LDE2NTJdLDI1Nl0sMTY1NDpbWzE2MDgsMTY1Ml0sMjU2XSwxNjU1OltbMTczNSwxNjUyXSwyNTZdLDE2NTY6W1sxNjEwLDE2NTJdLDI1Nl0sMTcyODpbWzE3NDksMTYyMF1dLDE3Mjk6WywsezE2MjA6MTczMH1dLDE3MzA6W1sxNzI5LDE2MjBdXSwxNzQ2OlssLHsxNjIwOjE3NDd9XSwxNzQ3OltbMTc0NiwxNjIwXV0sMTc0OTpbLCx7MTYyMDoxNzI4fV0sMTc1MDpbLDIzMF0sMTc1MTpbLDIzMF0sMTc1MjpbLDIzMF0sMTc1MzpbLDIzMF0sMTc1NDpbLDIzMF0sMTc1NTpbLDIzMF0sMTc1NjpbLDIzMF0sMTc1OTpbLDIzMF0sMTc2MDpbLDIzMF0sMTc2MTpbLDIzMF0sMTc2MjpbLDIzMF0sMTc2MzpbLDIyMF0sMTc2NDpbLDIzMF0sMTc2NzpbLDIzMF0sMTc2ODpbLDIzMF0sMTc3MDpbLDIyMF0sMTc3MTpbLDIzMF0sMTc3MjpbLDIzMF0sMTc3MzpbLDIyMF19LFxuMTc5Mjp7MTgwOTpbLDM2XSwxODQwOlssMjMwXSwxODQxOlssMjIwXSwxODQyOlssMjMwXSwxODQzOlssMjMwXSwxODQ0OlssMjIwXSwxODQ1OlssMjMwXSwxODQ2OlssMjMwXSwxODQ3OlssMjIwXSwxODQ4OlssMjIwXSwxODQ5OlssMjIwXSwxODUwOlssMjMwXSwxODUxOlssMjIwXSwxODUyOlssMjIwXSwxODUzOlssMjMwXSwxODU0OlssMjIwXSwxODU1OlssMjMwXSwxODU2OlssMjMwXSwxODU3OlssMjMwXSwxODU4OlssMjIwXSwxODU5OlssMjMwXSwxODYwOlssMjIwXSwxODYxOlssMjMwXSwxODYyOlssMjIwXSwxODYzOlssMjMwXSwxODY0OlssMjIwXSwxODY1OlssMjMwXSwxODY2OlssMjMwXSwyMDI3OlssMjMwXSwyMDI4OlssMjMwXSwyMDI5OlssMjMwXSwyMDMwOlssMjMwXSwyMDMxOlssMjMwXSwyMDMyOlssMjMwXSwyMDMzOlssMjMwXSwyMDM0OlssMjIwXSwyMDM1OlssMjMwXX0sXG4yMDQ4OnsyMDcwOlssMjMwXSwyMDcxOlssMjMwXSwyMDcyOlssMjMwXSwyMDczOlssMjMwXSwyMDc1OlssMjMwXSwyMDc2OlssMjMwXSwyMDc3OlssMjMwXSwyMDc4OlssMjMwXSwyMDc5OlssMjMwXSwyMDgwOlssMjMwXSwyMDgxOlssMjMwXSwyMDgyOlssMjMwXSwyMDgzOlssMjMwXSwyMDg1OlssMjMwXSwyMDg2OlssMjMwXSwyMDg3OlssMjMwXSwyMDg5OlssMjMwXSwyMDkwOlssMjMwXSwyMDkxOlssMjMwXSwyMDkyOlssMjMwXSwyMDkzOlssMjMwXSwyMTM3OlssMjIwXSwyMTM4OlssMjIwXSwyMTM5OlssMjIwXSwyMjc2OlssMjMwXSwyMjc3OlssMjMwXSwyMjc4OlssMjIwXSwyMjc5OlssMjMwXSwyMjgwOlssMjMwXSwyMjgxOlssMjIwXSwyMjgyOlssMjMwXSwyMjgzOlssMjMwXSwyMjg0OlssMjMwXSwyMjg1OlssMjIwXSwyMjg2OlssMjIwXSwyMjg3OlssMjIwXSwyMjg4OlssMjddLDIyODk6WywyOF0sMjI5MDpbLDI5XSwyMjkxOlssMjMwXSwyMjkyOlssMjMwXSwyMjkzOlssMjMwXSwyMjk0OlssMjIwXSwyMjk1OlssMjMwXSwyMjk2OlssMjMwXSwyMjk3OlssMjIwXSwyMjk4OlssMjIwXSwyMjk5OlssMjMwXSwyMzAwOlssMjMwXSwyMzAxOlssMjMwXSwyMzAyOlssMjMwXX0sXG4yMzA0OnsyMzQ0OlssLHsyMzY0OjIzNDV9XSwyMzQ1OltbMjM0NCwyMzY0XV0sMjM1MjpbLCx7MjM2NDoyMzUzfV0sMjM1MzpbWzIzNTIsMjM2NF1dLDIzNTU6WywsezIzNjQ6MjM1Nn1dLDIzNTY6W1syMzU1LDIzNjRdXSwyMzY0OlssN10sMjM4MTpbLDldLDIzODU6WywyMzBdLDIzODY6WywyMjBdLDIzODc6WywyMzBdLDIzODg6WywyMzBdLDIzOTI6W1syMzI1LDIzNjRdLDUxMl0sMjM5MzpbWzIzMjYsMjM2NF0sNTEyXSwyMzk0OltbMjMyNywyMzY0XSw1MTJdLDIzOTU6W1syMzMyLDIzNjRdLDUxMl0sMjM5NjpbWzIzMzcsMjM2NF0sNTEyXSwyMzk3OltbMjMzOCwyMzY0XSw1MTJdLDIzOTg6W1syMzQ3LDIzNjRdLDUxMl0sMjM5OTpbWzIzNTEsMjM2NF0sNTEyXSwyNDkyOlssN10sMjUwMzpbLCx7MjQ5NDoyNTA3LDI1MTk6MjUwOH1dLDI1MDc6W1syNTAzLDI0OTRdXSwyNTA4OltbMjUwMywyNTE5XV0sMjUwOTpbLDldLDI1MjQ6W1syNDY1LDI0OTJdLDUxMl0sMjUyNTpbWzI0NjYsMjQ5Ml0sNTEyXSwyNTI3OltbMjQ3OSwyNDkyXSw1MTJdfSxcbjI1NjA6ezI2MTE6W1syNjEwLDI2MjBdLDUxMl0sMjYxNDpbWzI2MTYsMjYyMF0sNTEyXSwyNjIwOlssN10sMjYzNzpbLDldLDI2NDk6W1syNTgyLDI2MjBdLDUxMl0sMjY1MDpbWzI1ODMsMjYyMF0sNTEyXSwyNjUxOltbMjU4OCwyNjIwXSw1MTJdLDI2NTQ6W1syNjAzLDI2MjBdLDUxMl0sMjc0ODpbLDddLDI3NjU6Wyw5XSw2ODEwOTpbLDIyMF0sNjgxMTE6WywyMzBdLDY4MTUyOlssMjMwXSw2ODE1MzpbLDFdLDY4MTU0OlssMjIwXSw2ODE1OTpbLDldfSxcbjI4MTY6ezI4NzY6Wyw3XSwyODg3OlssLHsyODc4OjI4OTEsMjkwMjoyODg4LDI5MDM6Mjg5Mn1dLDI4ODg6W1syODg3LDI5MDJdXSwyODkxOltbMjg4NywyODc4XV0sMjg5MjpbWzI4ODcsMjkwM11dLDI4OTM6Wyw5XSwyOTA4OltbMjg0OSwyODc2XSw1MTJdLDI5MDk6W1syODUwLDI4NzZdLDUxMl0sMjk2MjpbLCx7MzAzMToyOTY0fV0sMjk2NDpbWzI5NjIsMzAzMV1dLDMwMTQ6WywsezMwMDY6MzAxOCwzMDMxOjMwMjB9XSwzMDE1OlssLHszMDA2OjMwMTl9XSwzMDE4OltbMzAxNCwzMDA2XV0sMzAxOTpbWzMwMTUsMzAwNl1dLDMwMjA6W1szMDE0LDMwMzFdXSwzMDIxOlssOV19LFxuMzA3Mjp7MzE0MjpbLCx7MzE1ODozMTQ0fV0sMzE0NDpbWzMxNDIsMzE1OF1dLDMxNDk6Wyw5XSwzMTU3OlssODRdLDMxNTg6Wyw5MV0sMzI2MDpbLDddLDMyNjM6WywsezMyODU6MzI2NH1dLDMyNjQ6W1szMjYzLDMyODVdXSwzMjcwOlssLHszMjY2OjMyNzQsMzI4NTozMjcxLDMyODY6MzI3Mn1dLDMyNzE6W1szMjcwLDMyODVdXSwzMjcyOltbMzI3MCwzMjg2XV0sMzI3NDpbWzMyNzAsMzI2Nl0sLHszMjg1OjMyNzV9XSwzMjc1OltbMzI3NCwzMjg1XV0sMzI3NzpbLDldfSxcbjMzMjg6ezMzOTg6WywsezMzOTA6MzQwMiwzNDE1OjM0MDR9XSwzMzk5OlssLHszMzkwOjM0MDN9XSwzNDAyOltbMzM5OCwzMzkwXV0sMzQwMzpbWzMzOTksMzM5MF1dLDM0MDQ6W1szMzk4LDM0MTVdXSwzNDA1OlssOV0sMzUzMDpbLDldLDM1NDU6WywsezM1MzA6MzU0NiwzNTM1OjM1NDgsMzU1MTozNTUwfV0sMzU0NjpbWzM1NDUsMzUzMF1dLDM1NDg6W1szNTQ1LDM1MzVdLCx7MzUzMDozNTQ5fV0sMzU0OTpbWzM1NDgsMzUzMF1dLDM1NTA6W1szNTQ1LDM1NTFdXX0sXG4zNTg0OnszNjM1OltbMzY2MSwzNjM0XSwyNTZdLDM2NDA6WywxMDNdLDM2NDE6WywxMDNdLDM2NDI6Wyw5XSwzNjU2OlssMTA3XSwzNjU3OlssMTA3XSwzNjU4OlssMTA3XSwzNjU5OlssMTA3XSwzNzYzOltbMzc4OSwzNzYyXSwyNTZdLDM3Njg6WywxMThdLDM3Njk6WywxMThdLDM3ODQ6WywxMjJdLDM3ODU6WywxMjJdLDM3ODY6WywxMjJdLDM3ODc6WywxMjJdLDM4MDQ6W1szNzU1LDM3MzddLDI1Nl0sMzgwNTpbWzM3NTUsMzc0NV0sMjU2XX0sXG4zODQwOnszODUyOltbMzg1MV0sMjU2XSwzODY0OlssMjIwXSwzODY1OlssMjIwXSwzODkzOlssMjIwXSwzODk1OlssMjIwXSwzODk3OlssMjE2XSwzOTA3OltbMzkwNiw0MDIzXSw1MTJdLDM5MTc6W1szOTE2LDQwMjNdLDUxMl0sMzkyMjpbWzM5MjEsNDAyM10sNTEyXSwzOTI3OltbMzkyNiw0MDIzXSw1MTJdLDM5MzI6W1szOTMxLDQwMjNdLDUxMl0sMzk0NTpbWzM5MDQsNDAyMV0sNTEyXSwzOTUzOlssMTI5XSwzOTU0OlssMTMwXSwzOTU1OltbMzk1MywzOTU0XSw1MTJdLDM5NTY6WywxMzJdLDM5NTc6W1szOTUzLDM5NTZdLDUxMl0sMzk1ODpbWzQwMTgsMzk2OF0sNTEyXSwzOTU5OltbNDAxOCwzOTY5XSwyNTZdLDM5NjA6W1s0MDE5LDM5NjhdLDUxMl0sMzk2MTpbWzQwMTksMzk2OV0sMjU2XSwzOTYyOlssMTMwXSwzOTYzOlssMTMwXSwzOTY0OlssMTMwXSwzOTY1OlssMTMwXSwzOTY4OlssMTMwXSwzOTY5OltbMzk1MywzOTY4XSw1MTJdLDM5NzA6WywyMzBdLDM5NzE6WywyMzBdLDM5NzI6Wyw5XSwzOTc0OlssMjMwXSwzOTc1OlssMjMwXSwzOTg3OltbMzk4Niw0MDIzXSw1MTJdLDM5OTc6W1szOTk2LDQwMjNdLDUxMl0sNDAwMjpbWzQwMDEsNDAyM10sNTEyXSw0MDA3OltbNDAwNiw0MDIzXSw1MTJdLDQwMTI6W1s0MDExLDQwMjNdLDUxMl0sNDAyNTpbWzM5ODQsNDAyMV0sNTEyXSw0MDM4OlssMjIwXX0sXG40MDk2Ons0MTMzOlssLHs0MTQyOjQxMzR9XSw0MTM0OltbNDEzMyw0MTQyXV0sNDE1MTpbLDddLDQxNTM6Wyw5XSw0MTU0OlssOV0sNDIzNzpbLDIyMF0sNDM0ODpbWzQzMTZdLDI1Nl0sNjk3MDI6Wyw5XSw2OTc4NTpbLCx7Njk4MTg6Njk3ODZ9XSw2OTc4NjpbWzY5Nzg1LDY5ODE4XV0sNjk3ODc6WywsezY5ODE4OjY5Nzg4fV0sNjk3ODg6W1s2OTc4Nyw2OTgxOF1dLDY5Nzk3OlssLHs2OTgxODo2OTgwM31dLDY5ODAzOltbNjk3OTcsNjk4MThdXSw2OTgxNzpbLDldLDY5ODE4OlssN119LFxuNDM1Mjp7Njk4ODg6WywyMzBdLDY5ODg5OlssMjMwXSw2OTg5MDpbLDIzMF0sNjk5MzQ6W1s2OTkzNyw2OTkyN11dLDY5OTM1OltbNjk5MzgsNjk5MjddXSw2OTkzNzpbLCx7Njk5Mjc6Njk5MzR9XSw2OTkzODpbLCx7Njk5Mjc6Njk5MzV9XSw2OTkzOTpbLDldLDY5OTQwOlssOV0sNzAwODA6Wyw5XX0sXG40ODY0Ons0OTU3OlssMjMwXSw0OTU4OlssMjMwXSw0OTU5OlssMjMwXX0sXG41NjMyOns3MTM1MDpbLDldLDcxMzUxOlssN119LFxuNTg4ODp7NTkwODpbLDldLDU5NDA6Wyw5XSw2MDk4OlssOV0sNjEwOTpbLDIzMF19LFxuNjE0NDp7NjMxMzpbLDIyOF19LFxuNjQwMDp7NjQ1NzpbLDIyMl0sNjQ1ODpbLDIzMF0sNjQ1OTpbLDIyMF19LFxuNjY1Njp7NjY3OTpbLDIzMF0sNjY4MDpbLDIyMF0sNjc1MjpbLDldLDY3NzM6WywyMzBdLDY3NzQ6WywyMzBdLDY3NzU6WywyMzBdLDY3NzY6WywyMzBdLDY3Nzc6WywyMzBdLDY3Nzg6WywyMzBdLDY3Nzk6WywyMzBdLDY3ODA6WywyMzBdLDY3ODM6WywyMjBdfSxcbjY5MTI6ezY5MTc6WywsezY5NjU6NjkxOH1dLDY5MTg6W1s2OTE3LDY5NjVdXSw2OTE5OlssLHs2OTY1OjY5MjB9XSw2OTIwOltbNjkxOSw2OTY1XV0sNjkyMTpbLCx7Njk2NTo2OTIyfV0sNjkyMjpbWzY5MjEsNjk2NV1dLDY5MjM6WywsezY5NjU6NjkyNH1dLDY5MjQ6W1s2OTIzLDY5NjVdXSw2OTI1OlssLHs2OTY1OjY5MjZ9XSw2OTI2OltbNjkyNSw2OTY1XV0sNjkyOTpbLCx7Njk2NTo2OTMwfV0sNjkzMDpbWzY5MjksNjk2NV1dLDY5NjQ6Wyw3XSw2OTcwOlssLHs2OTY1OjY5NzF9XSw2OTcxOltbNjk3MCw2OTY1XV0sNjk3MjpbLCx7Njk2NTo2OTczfV0sNjk3MzpbWzY5NzIsNjk2NV1dLDY5NzQ6WywsezY5NjU6Njk3Nn1dLDY5NzU6WywsezY5NjU6Njk3N31dLDY5NzY6W1s2OTc0LDY5NjVdXSw2OTc3OltbNjk3NSw2OTY1XV0sNjk3ODpbLCx7Njk2NTo2OTc5fV0sNjk3OTpbWzY5NzgsNjk2NV1dLDY5ODA6Wyw5XSw3MDE5OlssMjMwXSw3MDIwOlssMjIwXSw3MDIxOlssMjMwXSw3MDIyOlssMjMwXSw3MDIzOlssMjMwXSw3MDI0OlssMjMwXSw3MDI1OlssMjMwXSw3MDI2OlssMjMwXSw3MDI3OlssMjMwXSw3MDgyOlssOV0sNzA4MzpbLDldLDcxNDI6Wyw3XSw3MTU0OlssOV0sNzE1NTpbLDldfSxcbjcxNjg6ezcyMjM6Wyw3XSw3Mzc2OlssMjMwXSw3Mzc3OlssMjMwXSw3Mzc4OlssMjMwXSw3MzgwOlssMV0sNzM4MTpbLDIyMF0sNzM4MjpbLDIyMF0sNzM4MzpbLDIyMF0sNzM4NDpbLDIyMF0sNzM4NTpbLDIyMF0sNzM4NjpbLDIzMF0sNzM4NzpbLDIzMF0sNzM4ODpbLDIyMF0sNzM4OTpbLDIyMF0sNzM5MDpbLDIyMF0sNzM5MTpbLDIyMF0sNzM5MjpbLDIzMF0sNzM5NDpbLDFdLDczOTU6WywxXSw3Mzk2OlssMV0sNzM5NzpbLDFdLDczOTg6WywxXSw3Mzk5OlssMV0sNzQwMDpbLDFdLDc0MDU6WywyMjBdLDc0MTI6WywyMzBdfSxcbjc0MjQ6ezc0Njg6W1s2NV0sMjU2XSw3NDY5OltbMTk4XSwyNTZdLDc0NzA6W1s2Nl0sMjU2XSw3NDcyOltbNjhdLDI1Nl0sNzQ3MzpbWzY5XSwyNTZdLDc0NzQ6W1szOThdLDI1Nl0sNzQ3NTpbWzcxXSwyNTZdLDc0NzY6W1s3Ml0sMjU2XSw3NDc3OltbNzNdLDI1Nl0sNzQ3ODpbWzc0XSwyNTZdLDc0Nzk6W1s3NV0sMjU2XSw3NDgwOltbNzZdLDI1Nl0sNzQ4MTpbWzc3XSwyNTZdLDc0ODI6W1s3OF0sMjU2XSw3NDg0OltbNzldLDI1Nl0sNzQ4NTpbWzU0Nl0sMjU2XSw3NDg2OltbODBdLDI1Nl0sNzQ4NzpbWzgyXSwyNTZdLDc0ODg6W1s4NF0sMjU2XSw3NDg5OltbODVdLDI1Nl0sNzQ5MDpbWzg3XSwyNTZdLDc0OTE6W1s5N10sMjU2XSw3NDkyOltbNTkyXSwyNTZdLDc0OTM6W1s1OTNdLDI1Nl0sNzQ5NDpbWzc0MjZdLDI1Nl0sNzQ5NTpbWzk4XSwyNTZdLDc0OTY6W1sxMDBdLDI1Nl0sNzQ5NzpbWzEwMV0sMjU2XSw3NDk4OltbNjAxXSwyNTZdLDc0OTk6W1s2MDNdLDI1Nl0sNzUwMDpbWzYwNF0sMjU2XSw3NTAxOltbMTAzXSwyNTZdLDc1MDM6W1sxMDddLDI1Nl0sNzUwNDpbWzEwOV0sMjU2XSw3NTA1OltbMzMxXSwyNTZdLDc1MDY6W1sxMTFdLDI1Nl0sNzUwNzpbWzU5Nl0sMjU2XSw3NTA4OltbNzQ0Nl0sMjU2XSw3NTA5OltbNzQ0N10sMjU2XSw3NTEwOltbMTEyXSwyNTZdLDc1MTE6W1sxMTZdLDI1Nl0sNzUxMjpbWzExN10sMjU2XSw3NTEzOltbNzQ1M10sMjU2XSw3NTE0OltbNjIzXSwyNTZdLDc1MTU6W1sxMThdLDI1Nl0sNzUxNjpbWzc0NjFdLDI1Nl0sNzUxNzpbWzk0Nl0sMjU2XSw3NTE4OltbOTQ3XSwyNTZdLDc1MTk6W1s5NDhdLDI1Nl0sNzUyMDpbWzk2Nl0sMjU2XSw3NTIxOltbOTY3XSwyNTZdLDc1MjI6W1sxMDVdLDI1Nl0sNzUyMzpbWzExNF0sMjU2XSw3NTI0OltbMTE3XSwyNTZdLDc1MjU6W1sxMThdLDI1Nl0sNzUyNjpbWzk0Nl0sMjU2XSw3NTI3OltbOTQ3XSwyNTZdLDc1Mjg6W1s5NjFdLDI1Nl0sNzUyOTpbWzk2Nl0sMjU2XSw3NTMwOltbOTY3XSwyNTZdLDc1NDQ6W1sxMDg1XSwyNTZdLDc1Nzk6W1s1OTRdLDI1Nl0sNzU4MDpbWzk5XSwyNTZdLDc1ODE6W1s1OTddLDI1Nl0sNzU4MjpbWzI0MF0sMjU2XSw3NTgzOltbNjA0XSwyNTZdLDc1ODQ6W1sxMDJdLDI1Nl0sNzU4NTpbWzYwN10sMjU2XSw3NTg2OltbNjA5XSwyNTZdLDc1ODc6W1s2MTNdLDI1Nl0sNzU4ODpbWzYxNl0sMjU2XSw3NTg5OltbNjE3XSwyNTZdLDc1OTA6W1s2MThdLDI1Nl0sNzU5MTpbWzc1NDddLDI1Nl0sNzU5MjpbWzY2OV0sMjU2XSw3NTkzOltbNjIxXSwyNTZdLDc1OTQ6W1s3NTU3XSwyNTZdLDc1OTU6W1s2NzFdLDI1Nl0sNzU5NjpbWzYyNV0sMjU2XSw3NTk3OltbNjI0XSwyNTZdLDc1OTg6W1s2MjZdLDI1Nl0sNzU5OTpbWzYyN10sMjU2XSw3NjAwOltbNjI4XSwyNTZdLDc2MDE6W1s2MjldLDI1Nl0sNzYwMjpbWzYzMl0sMjU2XSw3NjAzOltbNjQyXSwyNTZdLDc2MDQ6W1s2NDNdLDI1Nl0sNzYwNTpbWzQyN10sMjU2XSw3NjA2OltbNjQ5XSwyNTZdLDc2MDc6W1s2NTBdLDI1Nl0sNzYwODpbWzc0NTJdLDI1Nl0sNzYwOTpbWzY1MV0sMjU2XSw3NjEwOltbNjUyXSwyNTZdLDc2MTE6W1sxMjJdLDI1Nl0sNzYxMjpbWzY1Nl0sMjU2XSw3NjEzOltbNjU3XSwyNTZdLDc2MTQ6W1s2NThdLDI1Nl0sNzYxNTpbWzk1Ml0sMjU2XSw3NjE2OlssMjMwXSw3NjE3OlssMjMwXSw3NjE4OlssMjIwXSw3NjE5OlssMjMwXSw3NjIwOlssMjMwXSw3NjIxOlssMjMwXSw3NjIyOlssMjMwXSw3NjIzOlssMjMwXSw3NjI0OlssMjMwXSw3NjI1OlssMjMwXSw3NjI2OlssMjIwXSw3NjI3OlssMjMwXSw3NjI4OlssMjMwXSw3NjI5OlssMjM0XSw3NjMwOlssMjE0XSw3NjMxOlssMjIwXSw3NjMyOlssMjAyXSw3NjMzOlssMjMwXSw3NjM0OlssMjMwXSw3NjM1OlssMjMwXSw3NjM2OlssMjMwXSw3NjM3OlssMjMwXSw3NjM4OlssMjMwXSw3NjM5OlssMjMwXSw3NjQwOlssMjMwXSw3NjQxOlssMjMwXSw3NjQyOlssMjMwXSw3NjQzOlssMjMwXSw3NjQ0OlssMjMwXSw3NjQ1OlssMjMwXSw3NjQ2OlssMjMwXSw3NjQ3OlssMjMwXSw3NjQ4OlssMjMwXSw3NjQ5OlssMjMwXSw3NjUwOlssMjMwXSw3NjUxOlssMjMwXSw3NjUyOlssMjMwXSw3NjUzOlssMjMwXSw3NjU0OlssMjMwXSw3Njc2OlssMjMzXSw3Njc3OlssMjIwXSw3Njc4OlssMjMwXSw3Njc5OlssMjIwXX0sXG43NjgwOns3NjgwOltbNjUsODA1XV0sNzY4MTpbWzk3LDgwNV1dLDc2ODI6W1s2Niw3NzVdXSw3NjgzOltbOTgsNzc1XV0sNzY4NDpbWzY2LDgwM11dLDc2ODU6W1s5OCw4MDNdXSw3Njg2OltbNjYsODE3XV0sNzY4NzpbWzk4LDgxN11dLDc2ODg6W1sxOTksNzY5XV0sNzY4OTpbWzIzMSw3NjldXSw3NjkwOltbNjgsNzc1XV0sNzY5MTpbWzEwMCw3NzVdXSw3NjkyOltbNjgsODAzXV0sNzY5MzpbWzEwMCw4MDNdXSw3Njk0OltbNjgsODE3XV0sNzY5NTpbWzEwMCw4MTddXSw3Njk2OltbNjgsODA3XV0sNzY5NzpbWzEwMCw4MDddXSw3Njk4OltbNjgsODEzXV0sNzY5OTpbWzEwMCw4MTNdXSw3NzAwOltbMjc0LDc2OF1dLDc3MDE6W1syNzUsNzY4XV0sNzcwMjpbWzI3NCw3NjldXSw3NzAzOltbMjc1LDc2OV1dLDc3MDQ6W1s2OSw4MTNdXSw3NzA1OltbMTAxLDgxM11dLDc3MDY6W1s2OSw4MTZdXSw3NzA3OltbMTAxLDgxNl1dLDc3MDg6W1s1NTIsNzc0XV0sNzcwOTpbWzU1Myw3NzRdXSw3NzEwOltbNzAsNzc1XV0sNzcxMTpbWzEwMiw3NzVdXSw3NzEyOltbNzEsNzcyXV0sNzcxMzpbWzEwMyw3NzJdXSw3NzE0OltbNzIsNzc1XV0sNzcxNTpbWzEwNCw3NzVdXSw3NzE2OltbNzIsODAzXV0sNzcxNzpbWzEwNCw4MDNdXSw3NzE4OltbNzIsNzc2XV0sNzcxOTpbWzEwNCw3NzZdXSw3NzIwOltbNzIsODA3XV0sNzcyMTpbWzEwNCw4MDddXSw3NzIyOltbNzIsODE0XV0sNzcyMzpbWzEwNCw4MTRdXSw3NzI0OltbNzMsODE2XV0sNzcyNTpbWzEwNSw4MTZdXSw3NzI2OltbMjA3LDc2OV1dLDc3Mjc6W1syMzksNzY5XV0sNzcyODpbWzc1LDc2OV1dLDc3Mjk6W1sxMDcsNzY5XV0sNzczMDpbWzc1LDgwM11dLDc3MzE6W1sxMDcsODAzXV0sNzczMjpbWzc1LDgxN11dLDc3MzM6W1sxMDcsODE3XV0sNzczNDpbWzc2LDgwM10sLHs3NzI6NzczNn1dLDc3MzU6W1sxMDgsODAzXSwsezc3Mjo3NzM3fV0sNzczNjpbWzc3MzQsNzcyXV0sNzczNzpbWzc3MzUsNzcyXV0sNzczODpbWzc2LDgxN11dLDc3Mzk6W1sxMDgsODE3XV0sNzc0MDpbWzc2LDgxM11dLDc3NDE6W1sxMDgsODEzXV0sNzc0MjpbWzc3LDc2OV1dLDc3NDM6W1sxMDksNzY5XV0sNzc0NDpbWzc3LDc3NV1dLDc3NDU6W1sxMDksNzc1XV0sNzc0NjpbWzc3LDgwM11dLDc3NDc6W1sxMDksODAzXV0sNzc0ODpbWzc4LDc3NV1dLDc3NDk6W1sxMTAsNzc1XV0sNzc1MDpbWzc4LDgwM11dLDc3NTE6W1sxMTAsODAzXV0sNzc1MjpbWzc4LDgxN11dLDc3NTM6W1sxMTAsODE3XV0sNzc1NDpbWzc4LDgxM11dLDc3NTU6W1sxMTAsODEzXV0sNzc1NjpbWzIxMyw3NjldXSw3NzU3OltbMjQ1LDc2OV1dLDc3NTg6W1syMTMsNzc2XV0sNzc1OTpbWzI0NSw3NzZdXSw3NzYwOltbMzMyLDc2OF1dLDc3NjE6W1szMzMsNzY4XV0sNzc2MjpbWzMzMiw3NjldXSw3NzYzOltbMzMzLDc2OV1dLDc3NjQ6W1s4MCw3NjldXSw3NzY1OltbMTEyLDc2OV1dLDc3NjY6W1s4MCw3NzVdXSw3NzY3OltbMTEyLDc3NV1dLDc3Njg6W1s4Miw3NzVdXSw3NzY5OltbMTE0LDc3NV1dLDc3NzA6W1s4Miw4MDNdLCx7NzcyOjc3NzJ9XSw3NzcxOltbMTE0LDgwM10sLHs3NzI6Nzc3M31dLDc3NzI6W1s3NzcwLDc3Ml1dLDc3NzM6W1s3NzcxLDc3Ml1dLDc3NzQ6W1s4Miw4MTddXSw3Nzc1OltbMTE0LDgxN11dLDc3NzY6W1s4Myw3NzVdXSw3Nzc3OltbMTE1LDc3NV1dLDc3Nzg6W1s4Myw4MDNdLCx7Nzc1Ojc3ODR9XSw3Nzc5OltbMTE1LDgwM10sLHs3NzU6Nzc4NX1dLDc3ODA6W1szNDYsNzc1XV0sNzc4MTpbWzM0Nyw3NzVdXSw3NzgyOltbMzUyLDc3NV1dLDc3ODM6W1szNTMsNzc1XV0sNzc4NDpbWzc3NzgsNzc1XV0sNzc4NTpbWzc3NzksNzc1XV0sNzc4NjpbWzg0LDc3NV1dLDc3ODc6W1sxMTYsNzc1XV0sNzc4ODpbWzg0LDgwM11dLDc3ODk6W1sxMTYsODAzXV0sNzc5MDpbWzg0LDgxN11dLDc3OTE6W1sxMTYsODE3XV0sNzc5MjpbWzg0LDgxM11dLDc3OTM6W1sxMTYsODEzXV0sNzc5NDpbWzg1LDgwNF1dLDc3OTU6W1sxMTcsODA0XV0sNzc5NjpbWzg1LDgxNl1dLDc3OTc6W1sxMTcsODE2XV0sNzc5ODpbWzg1LDgxM11dLDc3OTk6W1sxMTcsODEzXV0sNzgwMDpbWzM2MCw3NjldXSw3ODAxOltbMzYxLDc2OV1dLDc4MDI6W1szNjIsNzc2XV0sNzgwMzpbWzM2Myw3NzZdXSw3ODA0OltbODYsNzcxXV0sNzgwNTpbWzExOCw3NzFdXSw3ODA2OltbODYsODAzXV0sNzgwNzpbWzExOCw4MDNdXSw3ODA4OltbODcsNzY4XV0sNzgwOTpbWzExOSw3NjhdXSw3ODEwOltbODcsNzY5XV0sNzgxMTpbWzExOSw3NjldXSw3ODEyOltbODcsNzc2XV0sNzgxMzpbWzExOSw3NzZdXSw3ODE0OltbODcsNzc1XV0sNzgxNTpbWzExOSw3NzVdXSw3ODE2OltbODcsODAzXV0sNzgxNzpbWzExOSw4MDNdXSw3ODE4OltbODgsNzc1XV0sNzgxOTpbWzEyMCw3NzVdXSw3ODIwOltbODgsNzc2XV0sNzgyMTpbWzEyMCw3NzZdXSw3ODIyOltbODksNzc1XV0sNzgyMzpbWzEyMSw3NzVdXSw3ODI0OltbOTAsNzcwXV0sNzgyNTpbWzEyMiw3NzBdXSw3ODI2OltbOTAsODAzXV0sNzgyNzpbWzEyMiw4MDNdXSw3ODI4OltbOTAsODE3XV0sNzgyOTpbWzEyMiw4MTddXSw3ODMwOltbMTA0LDgxN11dLDc4MzE6W1sxMTYsNzc2XV0sNzgzMjpbWzExOSw3NzhdXSw3ODMzOltbMTIxLDc3OF1dLDc4MzQ6W1s5Nyw3MDJdLDI1Nl0sNzgzNTpbWzM4Myw3NzVdXSw3ODQwOltbNjUsODAzXSwsezc3MDo3ODUyLDc3NDo3ODYyfV0sNzg0MTpbWzk3LDgwM10sLHs3NzA6Nzg1Myw3NzQ6Nzg2M31dLDc4NDI6W1s2NSw3NzddXSw3ODQzOltbOTcsNzc3XV0sNzg0NDpbWzE5NCw3NjldXSw3ODQ1OltbMjI2LDc2OV1dLDc4NDY6W1sxOTQsNzY4XV0sNzg0NzpbWzIyNiw3NjhdXSw3ODQ4OltbMTk0LDc3N11dLDc4NDk6W1syMjYsNzc3XV0sNzg1MDpbWzE5NCw3NzFdXSw3ODUxOltbMjI2LDc3MV1dLDc4NTI6W1s3ODQwLDc3MF1dLDc4NTM6W1s3ODQxLDc3MF1dLDc4NTQ6W1syNTgsNzY5XV0sNzg1NTpbWzI1OSw3NjldXSw3ODU2OltbMjU4LDc2OF1dLDc4NTc6W1syNTksNzY4XV0sNzg1ODpbWzI1OCw3NzddXSw3ODU5OltbMjU5LDc3N11dLDc4NjA6W1syNTgsNzcxXV0sNzg2MTpbWzI1OSw3NzFdXSw3ODYyOltbNzg0MCw3NzRdXSw3ODYzOltbNzg0MSw3NzRdXSw3ODY0OltbNjksODAzXSwsezc3MDo3ODc4fV0sNzg2NTpbWzEwMSw4MDNdLCx7NzcwOjc4Nzl9XSw3ODY2OltbNjksNzc3XV0sNzg2NzpbWzEwMSw3NzddXSw3ODY4OltbNjksNzcxXV0sNzg2OTpbWzEwMSw3NzFdXSw3ODcwOltbMjAyLDc2OV1dLDc4NzE6W1syMzQsNzY5XV0sNzg3MjpbWzIwMiw3NjhdXSw3ODczOltbMjM0LDc2OF1dLDc4NzQ6W1syMDIsNzc3XV0sNzg3NTpbWzIzNCw3NzddXSw3ODc2OltbMjAyLDc3MV1dLDc4Nzc6W1syMzQsNzcxXV0sNzg3ODpbWzc4NjQsNzcwXV0sNzg3OTpbWzc4NjUsNzcwXV0sNzg4MDpbWzczLDc3N11dLDc4ODE6W1sxMDUsNzc3XV0sNzg4MjpbWzczLDgwM11dLDc4ODM6W1sxMDUsODAzXV0sNzg4NDpbWzc5LDgwM10sLHs3NzA6Nzg5Nn1dLDc4ODU6W1sxMTEsODAzXSwsezc3MDo3ODk3fV0sNzg4NjpbWzc5LDc3N11dLDc4ODc6W1sxMTEsNzc3XV0sNzg4ODpbWzIxMiw3NjldXSw3ODg5OltbMjQ0LDc2OV1dLDc4OTA6W1syMTIsNzY4XV0sNzg5MTpbWzI0NCw3NjhdXSw3ODkyOltbMjEyLDc3N11dLDc4OTM6W1syNDQsNzc3XV0sNzg5NDpbWzIxMiw3NzFdXSw3ODk1OltbMjQ0LDc3MV1dLDc4OTY6W1s3ODg0LDc3MF1dLDc4OTc6W1s3ODg1LDc3MF1dLDc4OTg6W1s0MTYsNzY5XV0sNzg5OTpbWzQxNyw3NjldXSw3OTAwOltbNDE2LDc2OF1dLDc5MDE6W1s0MTcsNzY4XV0sNzkwMjpbWzQxNiw3NzddXSw3OTAzOltbNDE3LDc3N11dLDc5MDQ6W1s0MTYsNzcxXV0sNzkwNTpbWzQxNyw3NzFdXSw3OTA2OltbNDE2LDgwM11dLDc5MDc6W1s0MTcsODAzXV0sNzkwODpbWzg1LDgwM11dLDc5MDk6W1sxMTcsODAzXV0sNzkxMDpbWzg1LDc3N11dLDc5MTE6W1sxMTcsNzc3XV0sNzkxMjpbWzQzMSw3NjldXSw3OTEzOltbNDMyLDc2OV1dLDc5MTQ6W1s0MzEsNzY4XV0sNzkxNTpbWzQzMiw3NjhdXSw3OTE2OltbNDMxLDc3N11dLDc5MTc6W1s0MzIsNzc3XV0sNzkxODpbWzQzMSw3NzFdXSw3OTE5OltbNDMyLDc3MV1dLDc5MjA6W1s0MzEsODAzXV0sNzkyMTpbWzQzMiw4MDNdXSw3OTIyOltbODksNzY4XV0sNzkyMzpbWzEyMSw3NjhdXSw3OTI0OltbODksODAzXV0sNzkyNTpbWzEyMSw4MDNdXSw3OTI2OltbODksNzc3XV0sNzkyNzpbWzEyMSw3NzddXSw3OTI4OltbODksNzcxXV0sNzkyOTpbWzEyMSw3NzFdXX0sXG43OTM2Ons3OTM2OltbOTQ1LDc4N10sLHs3Njg6NzkzOCw3Njk6Nzk0MCw4MzQ6Nzk0Miw4Mzc6ODA2NH1dLDc5Mzc6W1s5NDUsNzg4XSwsezc2ODo3OTM5LDc2OTo3OTQxLDgzNDo3OTQzLDgzNzo4MDY1fV0sNzkzODpbWzc5MzYsNzY4XSwsezgzNzo4MDY2fV0sNzkzOTpbWzc5MzcsNzY4XSwsezgzNzo4MDY3fV0sNzk0MDpbWzc5MzYsNzY5XSwsezgzNzo4MDY4fV0sNzk0MTpbWzc5MzcsNzY5XSwsezgzNzo4MDY5fV0sNzk0MjpbWzc5MzYsODM0XSwsezgzNzo4MDcwfV0sNzk0MzpbWzc5MzcsODM0XSwsezgzNzo4MDcxfV0sNzk0NDpbWzkxMyw3ODddLCx7NzY4Ojc5NDYsNzY5Ojc5NDgsODM0Ojc5NTAsODM3OjgwNzJ9XSw3OTQ1OltbOTEzLDc4OF0sLHs3Njg6Nzk0Nyw3Njk6Nzk0OSw4MzQ6Nzk1MSw4Mzc6ODA3M31dLDc5NDY6W1s3OTQ0LDc2OF0sLHs4Mzc6ODA3NH1dLDc5NDc6W1s3OTQ1LDc2OF0sLHs4Mzc6ODA3NX1dLDc5NDg6W1s3OTQ0LDc2OV0sLHs4Mzc6ODA3Nn1dLDc5NDk6W1s3OTQ1LDc2OV0sLHs4Mzc6ODA3N31dLDc5NTA6W1s3OTQ0LDgzNF0sLHs4Mzc6ODA3OH1dLDc5NTE6W1s3OTQ1LDgzNF0sLHs4Mzc6ODA3OX1dLDc5NTI6W1s5NDksNzg3XSwsezc2ODo3OTU0LDc2OTo3OTU2fV0sNzk1MzpbWzk0OSw3ODhdLCx7NzY4Ojc5NTUsNzY5Ojc5NTd9XSw3OTU0OltbNzk1Miw3NjhdXSw3OTU1OltbNzk1Myw3NjhdXSw3OTU2OltbNzk1Miw3NjldXSw3OTU3OltbNzk1Myw3NjldXSw3OTYwOltbOTE3LDc4N10sLHs3Njg6Nzk2Miw3Njk6Nzk2NH1dLDc5NjE6W1s5MTcsNzg4XSwsezc2ODo3OTYzLDc2OTo3OTY1fV0sNzk2MjpbWzc5NjAsNzY4XV0sNzk2MzpbWzc5NjEsNzY4XV0sNzk2NDpbWzc5NjAsNzY5XV0sNzk2NTpbWzc5NjEsNzY5XV0sNzk2ODpbWzk1MSw3ODddLCx7NzY4Ojc5NzAsNzY5Ojc5NzIsODM0Ojc5NzQsODM3OjgwODB9XSw3OTY5OltbOTUxLDc4OF0sLHs3Njg6Nzk3MSw3Njk6Nzk3Myw4MzQ6Nzk3NSw4Mzc6ODA4MX1dLDc5NzA6W1s3OTY4LDc2OF0sLHs4Mzc6ODA4Mn1dLDc5NzE6W1s3OTY5LDc2OF0sLHs4Mzc6ODA4M31dLDc5NzI6W1s3OTY4LDc2OV0sLHs4Mzc6ODA4NH1dLDc5NzM6W1s3OTY5LDc2OV0sLHs4Mzc6ODA4NX1dLDc5NzQ6W1s3OTY4LDgzNF0sLHs4Mzc6ODA4Nn1dLDc5NzU6W1s3OTY5LDgzNF0sLHs4Mzc6ODA4N31dLDc5NzY6W1s5MTksNzg3XSwsezc2ODo3OTc4LDc2OTo3OTgwLDgzNDo3OTgyLDgzNzo4MDg4fV0sNzk3NzpbWzkxOSw3ODhdLCx7NzY4Ojc5NzksNzY5Ojc5ODEsODM0Ojc5ODMsODM3OjgwODl9XSw3OTc4OltbNzk3Niw3NjhdLCx7ODM3OjgwOTB9XSw3OTc5OltbNzk3Nyw3NjhdLCx7ODM3OjgwOTF9XSw3OTgwOltbNzk3Niw3NjldLCx7ODM3OjgwOTJ9XSw3OTgxOltbNzk3Nyw3NjldLCx7ODM3OjgwOTN9XSw3OTgyOltbNzk3Niw4MzRdLCx7ODM3OjgwOTR9XSw3OTgzOltbNzk3Nyw4MzRdLCx7ODM3OjgwOTV9XSw3OTg0OltbOTUzLDc4N10sLHs3Njg6Nzk4Niw3Njk6Nzk4OCw4MzQ6Nzk5MH1dLDc5ODU6W1s5NTMsNzg4XSwsezc2ODo3OTg3LDc2OTo3OTg5LDgzNDo3OTkxfV0sNzk4NjpbWzc5ODQsNzY4XV0sNzk4NzpbWzc5ODUsNzY4XV0sNzk4ODpbWzc5ODQsNzY5XV0sNzk4OTpbWzc5ODUsNzY5XV0sNzk5MDpbWzc5ODQsODM0XV0sNzk5MTpbWzc5ODUsODM0XV0sNzk5MjpbWzkyMSw3ODddLCx7NzY4Ojc5OTQsNzY5Ojc5OTYsODM0Ojc5OTh9XSw3OTkzOltbOTIxLDc4OF0sLHs3Njg6Nzk5NSw3Njk6Nzk5Nyw4MzQ6Nzk5OX1dLDc5OTQ6W1s3OTkyLDc2OF1dLDc5OTU6W1s3OTkzLDc2OF1dLDc5OTY6W1s3OTkyLDc2OV1dLDc5OTc6W1s3OTkzLDc2OV1dLDc5OTg6W1s3OTkyLDgzNF1dLDc5OTk6W1s3OTkzLDgzNF1dLDgwMDA6W1s5NTksNzg3XSwsezc2ODo4MDAyLDc2OTo4MDA0fV0sODAwMTpbWzk1OSw3ODhdLCx7NzY4OjgwMDMsNzY5OjgwMDV9XSw4MDAyOltbODAwMCw3NjhdXSw4MDAzOltbODAwMSw3NjhdXSw4MDA0OltbODAwMCw3NjldXSw4MDA1OltbODAwMSw3NjldXSw4MDA4OltbOTI3LDc4N10sLHs3Njg6ODAxMCw3Njk6ODAxMn1dLDgwMDk6W1s5MjcsNzg4XSwsezc2ODo4MDExLDc2OTo4MDEzfV0sODAxMDpbWzgwMDgsNzY4XV0sODAxMTpbWzgwMDksNzY4XV0sODAxMjpbWzgwMDgsNzY5XV0sODAxMzpbWzgwMDksNzY5XV0sODAxNjpbWzk2NSw3ODddLCx7NzY4OjgwMTgsNzY5OjgwMjAsODM0OjgwMjJ9XSw4MDE3OltbOTY1LDc4OF0sLHs3Njg6ODAxOSw3Njk6ODAyMSw4MzQ6ODAyM31dLDgwMTg6W1s4MDE2LDc2OF1dLDgwMTk6W1s4MDE3LDc2OF1dLDgwMjA6W1s4MDE2LDc2OV1dLDgwMjE6W1s4MDE3LDc2OV1dLDgwMjI6W1s4MDE2LDgzNF1dLDgwMjM6W1s4MDE3LDgzNF1dLDgwMjU6W1s5MzMsNzg4XSwsezc2ODo4MDI3LDc2OTo4MDI5LDgzNDo4MDMxfV0sODAyNzpbWzgwMjUsNzY4XV0sODAyOTpbWzgwMjUsNzY5XV0sODAzMTpbWzgwMjUsODM0XV0sODAzMjpbWzk2OSw3ODddLCx7NzY4OjgwMzQsNzY5OjgwMzYsODM0OjgwMzgsODM3OjgwOTZ9XSw4MDMzOltbOTY5LDc4OF0sLHs3Njg6ODAzNSw3Njk6ODAzNyw4MzQ6ODAzOSw4Mzc6ODA5N31dLDgwMzQ6W1s4MDMyLDc2OF0sLHs4Mzc6ODA5OH1dLDgwMzU6W1s4MDMzLDc2OF0sLHs4Mzc6ODA5OX1dLDgwMzY6W1s4MDMyLDc2OV0sLHs4Mzc6ODEwMH1dLDgwMzc6W1s4MDMzLDc2OV0sLHs4Mzc6ODEwMX1dLDgwMzg6W1s4MDMyLDgzNF0sLHs4Mzc6ODEwMn1dLDgwMzk6W1s4MDMzLDgzNF0sLHs4Mzc6ODEwM31dLDgwNDA6W1s5MzcsNzg3XSwsezc2ODo4MDQyLDc2OTo4MDQ0LDgzNDo4MDQ2LDgzNzo4MTA0fV0sODA0MTpbWzkzNyw3ODhdLCx7NzY4OjgwNDMsNzY5OjgwNDUsODM0OjgwNDcsODM3OjgxMDV9XSw4MDQyOltbODA0MCw3NjhdLCx7ODM3OjgxMDZ9XSw4MDQzOltbODA0MSw3NjhdLCx7ODM3OjgxMDd9XSw4MDQ0OltbODA0MCw3NjldLCx7ODM3OjgxMDh9XSw4MDQ1OltbODA0MSw3NjldLCx7ODM3OjgxMDl9XSw4MDQ2OltbODA0MCw4MzRdLCx7ODM3OjgxMTB9XSw4MDQ3OltbODA0MSw4MzRdLCx7ODM3OjgxMTF9XSw4MDQ4OltbOTQ1LDc2OF0sLHs4Mzc6ODExNH1dLDgwNDk6W1s5NDBdXSw4MDUwOltbOTQ5LDc2OF1dLDgwNTE6W1s5NDFdXSw4MDUyOltbOTUxLDc2OF0sLHs4Mzc6ODEzMH1dLDgwNTM6W1s5NDJdXSw4MDU0OltbOTUzLDc2OF1dLDgwNTU6W1s5NDNdXSw4MDU2OltbOTU5LDc2OF1dLDgwNTc6W1s5NzJdXSw4MDU4OltbOTY1LDc2OF1dLDgwNTk6W1s5NzNdXSw4MDYwOltbOTY5LDc2OF0sLHs4Mzc6ODE3OH1dLDgwNjE6W1s5NzRdXSw4MDY0OltbNzkzNiw4MzddXSw4MDY1OltbNzkzNyw4MzddXSw4MDY2OltbNzkzOCw4MzddXSw4MDY3OltbNzkzOSw4MzddXSw4MDY4OltbNzk0MCw4MzddXSw4MDY5OltbNzk0MSw4MzddXSw4MDcwOltbNzk0Miw4MzddXSw4MDcxOltbNzk0Myw4MzddXSw4MDcyOltbNzk0NCw4MzddXSw4MDczOltbNzk0NSw4MzddXSw4MDc0OltbNzk0Niw4MzddXSw4MDc1OltbNzk0Nyw4MzddXSw4MDc2OltbNzk0OCw4MzddXSw4MDc3OltbNzk0OSw4MzddXSw4MDc4OltbNzk1MCw4MzddXSw4MDc5OltbNzk1MSw4MzddXSw4MDgwOltbNzk2OCw4MzddXSw4MDgxOltbNzk2OSw4MzddXSw4MDgyOltbNzk3MCw4MzddXSw4MDgzOltbNzk3MSw4MzddXSw4MDg0OltbNzk3Miw4MzddXSw4MDg1OltbNzk3Myw4MzddXSw4MDg2OltbNzk3NCw4MzddXSw4MDg3OltbNzk3NSw4MzddXSw4MDg4OltbNzk3Niw4MzddXSw4MDg5OltbNzk3Nyw4MzddXSw4MDkwOltbNzk3OCw4MzddXSw4MDkxOltbNzk3OSw4MzddXSw4MDkyOltbNzk4MCw4MzddXSw4MDkzOltbNzk4MSw4MzddXSw4MDk0OltbNzk4Miw4MzddXSw4MDk1OltbNzk4Myw4MzddXSw4MDk2OltbODAzMiw4MzddXSw4MDk3OltbODAzMyw4MzddXSw4MDk4OltbODAzNCw4MzddXSw4MDk5OltbODAzNSw4MzddXSw4MTAwOltbODAzNiw4MzddXSw4MTAxOltbODAzNyw4MzddXSw4MTAyOltbODAzOCw4MzddXSw4MTAzOltbODAzOSw4MzddXSw4MTA0OltbODA0MCw4MzddXSw4MTA1OltbODA0MSw4MzddXSw4MTA2OltbODA0Miw4MzddXSw4MTA3OltbODA0Myw4MzddXSw4MTA4OltbODA0NCw4MzddXSw4MTA5OltbODA0NSw4MzddXSw4MTEwOltbODA0Niw4MzddXSw4MTExOltbODA0Nyw4MzddXSw4MTEyOltbOTQ1LDc3NF1dLDgxMTM6W1s5NDUsNzcyXV0sODExNDpbWzgwNDgsODM3XV0sODExNTpbWzk0NSw4MzddXSw4MTE2OltbOTQwLDgzN11dLDgxMTg6W1s5NDUsODM0XSwsezgzNzo4MTE5fV0sODExOTpbWzgxMTgsODM3XV0sODEyMDpbWzkxMyw3NzRdXSw4MTIxOltbOTEzLDc3Ml1dLDgxMjI6W1s5MTMsNzY4XV0sODEyMzpbWzkwMl1dLDgxMjQ6W1s5MTMsODM3XV0sODEyNTpbWzMyLDc4N10sMjU2XSw4MTI2OltbOTUzXV0sODEyNzpbWzMyLDc4N10sMjU2LHs3Njg6ODE0MSw3Njk6ODE0Miw4MzQ6ODE0M31dLDgxMjg6W1szMiw4MzRdLDI1Nl0sODEyOTpbWzE2OCw4MzRdXSw4MTMwOltbODA1Miw4MzddXSw4MTMxOltbOTUxLDgzN11dLDgxMzI6W1s5NDIsODM3XV0sODEzNDpbWzk1MSw4MzRdLCx7ODM3OjgxMzV9XSw4MTM1OltbODEzNCw4MzddXSw4MTM2OltbOTE3LDc2OF1dLDgxMzc6W1s5MDRdXSw4MTM4OltbOTE5LDc2OF1dLDgxMzk6W1s5MDVdXSw4MTQwOltbOTE5LDgzN11dLDgxNDE6W1s4MTI3LDc2OF1dLDgxNDI6W1s4MTI3LDc2OV1dLDgxNDM6W1s4MTI3LDgzNF1dLDgxNDQ6W1s5NTMsNzc0XV0sODE0NTpbWzk1Myw3NzJdXSw4MTQ2OltbOTcwLDc2OF1dLDgxNDc6W1s5MTJdXSw4MTUwOltbOTUzLDgzNF1dLDgxNTE6W1s5NzAsODM0XV0sODE1MjpbWzkyMSw3NzRdXSw4MTUzOltbOTIxLDc3Ml1dLDgxNTQ6W1s5MjEsNzY4XV0sODE1NTpbWzkwNl1dLDgxNTc6W1s4MTkwLDc2OF1dLDgxNTg6W1s4MTkwLDc2OV1dLDgxNTk6W1s4MTkwLDgzNF1dLDgxNjA6W1s5NjUsNzc0XV0sODE2MTpbWzk2NSw3NzJdXSw4MTYyOltbOTcxLDc2OF1dLDgxNjM6W1s5NDRdXSw4MTY0OltbOTYxLDc4N11dLDgxNjU6W1s5NjEsNzg4XV0sODE2NjpbWzk2NSw4MzRdXSw4MTY3OltbOTcxLDgzNF1dLDgxNjg6W1s5MzMsNzc0XV0sODE2OTpbWzkzMyw3NzJdXSw4MTcwOltbOTMzLDc2OF1dLDgxNzE6W1s5MTBdXSw4MTcyOltbOTI5LDc4OF1dLDgxNzM6W1sxNjgsNzY4XV0sODE3NDpbWzkwMV1dLDgxNzU6W1s5Nl1dLDgxNzg6W1s4MDYwLDgzN11dLDgxNzk6W1s5NjksODM3XV0sODE4MDpbWzk3NCw4MzddXSw4MTgyOltbOTY5LDgzNF0sLHs4Mzc6ODE4M31dLDgxODM6W1s4MTgyLDgzN11dLDgxODQ6W1s5MjcsNzY4XV0sODE4NTpbWzkwOF1dLDgxODY6W1s5MzcsNzY4XV0sODE4NzpbWzkxMV1dLDgxODg6W1s5MzcsODM3XV0sODE4OTpbWzE4MF1dLDgxOTA6W1szMiw3ODhdLDI1Nix7NzY4OjgxNTcsNzY5OjgxNTgsODM0OjgxNTl9XX0sXG44MTkyOns4MTkyOltbODE5NF1dLDgxOTM6W1s4MTk1XV0sODE5NDpbWzMyXSwyNTZdLDgxOTU6W1szMl0sMjU2XSw4MTk2OltbMzJdLDI1Nl0sODE5NzpbWzMyXSwyNTZdLDgxOTg6W1szMl0sMjU2XSw4MTk5OltbMzJdLDI1Nl0sODIwMDpbWzMyXSwyNTZdLDgyMDE6W1szMl0sMjU2XSw4MjAyOltbMzJdLDI1Nl0sODIwOTpbWzgyMDhdLDI1Nl0sODIxNTpbWzMyLDgxOV0sMjU2XSw4MjI4OltbNDZdLDI1Nl0sODIyOTpbWzQ2LDQ2XSwyNTZdLDgyMzA6W1s0Niw0Niw0Nl0sMjU2XSw4MjM5OltbMzJdLDI1Nl0sODI0MzpbWzgyNDIsODI0Ml0sMjU2XSw4MjQ0OltbODI0Miw4MjQyLDgyNDJdLDI1Nl0sODI0NjpbWzgyNDUsODI0NV0sMjU2XSw4MjQ3OltbODI0NSw4MjQ1LDgyNDVdLDI1Nl0sODI1MjpbWzMzLDMzXSwyNTZdLDgyNTQ6W1szMiw3NzNdLDI1Nl0sODI2MzpbWzYzLDYzXSwyNTZdLDgyNjQ6W1s2MywzM10sMjU2XSw4MjY1OltbMzMsNjNdLDI1Nl0sODI3OTpbWzgyNDIsODI0Miw4MjQyLDgyNDJdLDI1Nl0sODI4NzpbWzMyXSwyNTZdLDgzMDQ6W1s0OF0sMjU2XSw4MzA1OltbMTA1XSwyNTZdLDgzMDg6W1s1Ml0sMjU2XSw4MzA5OltbNTNdLDI1Nl0sODMxMDpbWzU0XSwyNTZdLDgzMTE6W1s1NV0sMjU2XSw4MzEyOltbNTZdLDI1Nl0sODMxMzpbWzU3XSwyNTZdLDgzMTQ6W1s0M10sMjU2XSw4MzE1OltbODcyMl0sMjU2XSw4MzE2OltbNjFdLDI1Nl0sODMxNzpbWzQwXSwyNTZdLDgzMTg6W1s0MV0sMjU2XSw4MzE5OltbMTEwXSwyNTZdLDgzMjA6W1s0OF0sMjU2XSw4MzIxOltbNDldLDI1Nl0sODMyMjpbWzUwXSwyNTZdLDgzMjM6W1s1MV0sMjU2XSw4MzI0OltbNTJdLDI1Nl0sODMyNTpbWzUzXSwyNTZdLDgzMjY6W1s1NF0sMjU2XSw4MzI3OltbNTVdLDI1Nl0sODMyODpbWzU2XSwyNTZdLDgzMjk6W1s1N10sMjU2XSw4MzMwOltbNDNdLDI1Nl0sODMzMTpbWzg3MjJdLDI1Nl0sODMzMjpbWzYxXSwyNTZdLDgzMzM6W1s0MF0sMjU2XSw4MzM0OltbNDFdLDI1Nl0sODMzNjpbWzk3XSwyNTZdLDgzMzc6W1sxMDFdLDI1Nl0sODMzODpbWzExMV0sMjU2XSw4MzM5OltbMTIwXSwyNTZdLDgzNDA6W1s2MDFdLDI1Nl0sODM0MTpbWzEwNF0sMjU2XSw4MzQyOltbMTA3XSwyNTZdLDgzNDM6W1sxMDhdLDI1Nl0sODM0NDpbWzEwOV0sMjU2XSw4MzQ1OltbMTEwXSwyNTZdLDgzNDY6W1sxMTJdLDI1Nl0sODM0NzpbWzExNV0sMjU2XSw4MzQ4OltbMTE2XSwyNTZdLDgzNjA6W1s4MiwxMTVdLDI1Nl0sODQwMDpbLDIzMF0sODQwMTpbLDIzMF0sODQwMjpbLDFdLDg0MDM6WywxXSw4NDA0OlssMjMwXSw4NDA1OlssMjMwXSw4NDA2OlssMjMwXSw4NDA3OlssMjMwXSw4NDA4OlssMV0sODQwOTpbLDFdLDg0MTA6WywxXSw4NDExOlssMjMwXSw4NDEyOlssMjMwXSw4NDE3OlssMjMwXSw4NDIxOlssMV0sODQyMjpbLDFdLDg0MjM6WywyMzBdLDg0MjQ6WywyMjBdLDg0MjU6WywyMzBdLDg0MjY6WywxXSw4NDI3OlssMV0sODQyODpbLDIyMF0sODQyOTpbLDIyMF0sODQzMDpbLDIyMF0sODQzMTpbLDIyMF0sODQzMjpbLDIzMF19LFxuODQ0ODp7ODQ0ODpbWzk3LDQ3LDk5XSwyNTZdLDg0NDk6W1s5Nyw0NywxMTVdLDI1Nl0sODQ1MDpbWzY3XSwyNTZdLDg0NTE6W1sxNzYsNjddLDI1Nl0sODQ1MzpbWzk5LDQ3LDExMV0sMjU2XSw4NDU0OltbOTksNDcsMTE3XSwyNTZdLDg0NTU6W1s0MDBdLDI1Nl0sODQ1NzpbWzE3Niw3MF0sMjU2XSw4NDU4OltbMTAzXSwyNTZdLDg0NTk6W1s3Ml0sMjU2XSw4NDYwOltbNzJdLDI1Nl0sODQ2MTpbWzcyXSwyNTZdLDg0NjI6W1sxMDRdLDI1Nl0sODQ2MzpbWzI5NV0sMjU2XSw4NDY0OltbNzNdLDI1Nl0sODQ2NTpbWzczXSwyNTZdLDg0NjY6W1s3Nl0sMjU2XSw4NDY3OltbMTA4XSwyNTZdLDg0Njk6W1s3OF0sMjU2XSw4NDcwOltbNzgsMTExXSwyNTZdLDg0NzM6W1s4MF0sMjU2XSw4NDc0OltbODFdLDI1Nl0sODQ3NTpbWzgyXSwyNTZdLDg0NzY6W1s4Ml0sMjU2XSw4NDc3OltbODJdLDI1Nl0sODQ4MDpbWzgzLDc3XSwyNTZdLDg0ODE6W1s4NCw2OSw3Nl0sMjU2XSw4NDgyOltbODQsNzddLDI1Nl0sODQ4NDpbWzkwXSwyNTZdLDg0ODY6W1s5MzddXSw4NDg4OltbOTBdLDI1Nl0sODQ5MDpbWzc1XV0sODQ5MTpbWzE5N11dLDg0OTI6W1s2Nl0sMjU2XSw4NDkzOltbNjddLDI1Nl0sODQ5NTpbWzEwMV0sMjU2XSw4NDk2OltbNjldLDI1Nl0sODQ5NzpbWzcwXSwyNTZdLDg0OTk6W1s3N10sMjU2XSw4NTAwOltbMTExXSwyNTZdLDg1MDE6W1sxNDg4XSwyNTZdLDg1MDI6W1sxNDg5XSwyNTZdLDg1MDM6W1sxNDkwXSwyNTZdLDg1MDQ6W1sxNDkxXSwyNTZdLDg1MDU6W1sxMDVdLDI1Nl0sODUwNzpbWzcwLDY1LDg4XSwyNTZdLDg1MDg6W1s5NjBdLDI1Nl0sODUwOTpbWzk0N10sMjU2XSw4NTEwOltbOTE1XSwyNTZdLDg1MTE6W1s5MjhdLDI1Nl0sODUxMjpbWzg3MjFdLDI1Nl0sODUxNzpbWzY4XSwyNTZdLDg1MTg6W1sxMDBdLDI1Nl0sODUxOTpbWzEwMV0sMjU2XSw4NTIwOltbMTA1XSwyNTZdLDg1MjE6W1sxMDZdLDI1Nl0sODUyODpbWzQ5LDgyNjAsNTVdLDI1Nl0sODUyOTpbWzQ5LDgyNjAsNTddLDI1Nl0sODUzMDpbWzQ5LDgyNjAsNDksNDhdLDI1Nl0sODUzMTpbWzQ5LDgyNjAsNTFdLDI1Nl0sODUzMjpbWzUwLDgyNjAsNTFdLDI1Nl0sODUzMzpbWzQ5LDgyNjAsNTNdLDI1Nl0sODUzNDpbWzUwLDgyNjAsNTNdLDI1Nl0sODUzNTpbWzUxLDgyNjAsNTNdLDI1Nl0sODUzNjpbWzUyLDgyNjAsNTNdLDI1Nl0sODUzNzpbWzQ5LDgyNjAsNTRdLDI1Nl0sODUzODpbWzUzLDgyNjAsNTRdLDI1Nl0sODUzOTpbWzQ5LDgyNjAsNTZdLDI1Nl0sODU0MDpbWzUxLDgyNjAsNTZdLDI1Nl0sODU0MTpbWzUzLDgyNjAsNTZdLDI1Nl0sODU0MjpbWzU1LDgyNjAsNTZdLDI1Nl0sODU0MzpbWzQ5LDgyNjBdLDI1Nl0sODU0NDpbWzczXSwyNTZdLDg1NDU6W1s3Myw3M10sMjU2XSw4NTQ2OltbNzMsNzMsNzNdLDI1Nl0sODU0NzpbWzczLDg2XSwyNTZdLDg1NDg6W1s4Nl0sMjU2XSw4NTQ5OltbODYsNzNdLDI1Nl0sODU1MDpbWzg2LDczLDczXSwyNTZdLDg1NTE6W1s4Niw3Myw3Myw3M10sMjU2XSw4NTUyOltbNzMsODhdLDI1Nl0sODU1MzpbWzg4XSwyNTZdLDg1NTQ6W1s4OCw3M10sMjU2XSw4NTU1OltbODgsNzMsNzNdLDI1Nl0sODU1NjpbWzc2XSwyNTZdLDg1NTc6W1s2N10sMjU2XSw4NTU4OltbNjhdLDI1Nl0sODU1OTpbWzc3XSwyNTZdLDg1NjA6W1sxMDVdLDI1Nl0sODU2MTpbWzEwNSwxMDVdLDI1Nl0sODU2MjpbWzEwNSwxMDUsMTA1XSwyNTZdLDg1NjM6W1sxMDUsMTE4XSwyNTZdLDg1NjQ6W1sxMThdLDI1Nl0sODU2NTpbWzExOCwxMDVdLDI1Nl0sODU2NjpbWzExOCwxMDUsMTA1XSwyNTZdLDg1Njc6W1sxMTgsMTA1LDEwNSwxMDVdLDI1Nl0sODU2ODpbWzEwNSwxMjBdLDI1Nl0sODU2OTpbWzEyMF0sMjU2XSw4NTcwOltbMTIwLDEwNV0sMjU2XSw4NTcxOltbMTIwLDEwNSwxMDVdLDI1Nl0sODU3MjpbWzEwOF0sMjU2XSw4NTczOltbOTldLDI1Nl0sODU3NDpbWzEwMF0sMjU2XSw4NTc1OltbMTA5XSwyNTZdLDg1ODU6W1s0OCw4MjYwLDUxXSwyNTZdLDg1OTI6WywsezgyNDo4NjAyfV0sODU5NDpbLCx7ODI0Ojg2MDN9XSw4NTk2OlssLHs4MjQ6ODYyMn1dLDg2MDI6W1s4NTkyLDgyNF1dLDg2MDM6W1s4NTk0LDgyNF1dLDg2MjI6W1s4NTk2LDgyNF1dLDg2NTM6W1s4NjU2LDgyNF1dLDg2NTQ6W1s4NjYwLDgyNF1dLDg2NTU6W1s4NjU4LDgyNF1dLDg2NTY6WywsezgyNDo4NjUzfV0sODY1ODpbLCx7ODI0Ojg2NTV9XSw4NjYwOlssLHs4MjQ6ODY1NH1dfSxcbjg3MDQ6ezg3MDc6WywsezgyNDo4NzA4fV0sODcwODpbWzg3MDcsODI0XV0sODcxMjpbLCx7ODI0Ojg3MTN9XSw4NzEzOltbODcxMiw4MjRdXSw4NzE1OlssLHs4MjQ6ODcxNn1dLDg3MTY6W1s4NzE1LDgyNF1dLDg3Mzk6WywsezgyNDo4NzQwfV0sODc0MDpbWzg3MzksODI0XV0sODc0MTpbLCx7ODI0Ojg3NDJ9XSw4NzQyOltbODc0MSw4MjRdXSw4NzQ4OltbODc0Nyw4NzQ3XSwyNTZdLDg3NDk6W1s4NzQ3LDg3NDcsODc0N10sMjU2XSw4NzUxOltbODc1MCw4NzUwXSwyNTZdLDg3NTI6W1s4NzUwLDg3NTAsODc1MF0sMjU2XSw4NzY0OlssLHs4MjQ6ODc2OX1dLDg3Njk6W1s4NzY0LDgyNF1dLDg3NzE6WywsezgyNDo4NzcyfV0sODc3MjpbWzg3NzEsODI0XV0sODc3MzpbLCx7ODI0Ojg3NzV9XSw4Nzc1OltbODc3Myw4MjRdXSw4Nzc2OlssLHs4MjQ6ODc3N31dLDg3Nzc6W1s4Nzc2LDgyNF1dLDg3ODE6WywsezgyNDo4ODEzfV0sODgwMDpbWzYxLDgyNF1dLDg4MDE6WywsezgyNDo4ODAyfV0sODgwMjpbWzg4MDEsODI0XV0sODgwNDpbLCx7ODI0Ojg4MTZ9XSw4ODA1OlssLHs4MjQ6ODgxN31dLDg4MTM6W1s4NzgxLDgyNF1dLDg4MTQ6W1s2MCw4MjRdXSw4ODE1OltbNjIsODI0XV0sODgxNjpbWzg4MDQsODI0XV0sODgxNzpbWzg4MDUsODI0XV0sODgxODpbLCx7ODI0Ojg4MjB9XSw4ODE5OlssLHs4MjQ6ODgyMX1dLDg4MjA6W1s4ODE4LDgyNF1dLDg4MjE6W1s4ODE5LDgyNF1dLDg4MjI6WywsezgyNDo4ODI0fV0sODgyMzpbLCx7ODI0Ojg4MjV9XSw4ODI0OltbODgyMiw4MjRdXSw4ODI1OltbODgyMyw4MjRdXSw4ODI2OlssLHs4MjQ6ODgzMn1dLDg4Mjc6WywsezgyNDo4ODMzfV0sODgyODpbLCx7ODI0Ojg5Mjh9XSw4ODI5OlssLHs4MjQ6ODkyOX1dLDg4MzI6W1s4ODI2LDgyNF1dLDg4MzM6W1s4ODI3LDgyNF1dLDg4MzQ6WywsezgyNDo4ODM2fV0sODgzNTpbLCx7ODI0Ojg4Mzd9XSw4ODM2OltbODgzNCw4MjRdXSw4ODM3OltbODgzNSw4MjRdXSw4ODM4OlssLHs4MjQ6ODg0MH1dLDg4Mzk6WywsezgyNDo4ODQxfV0sODg0MDpbWzg4MzgsODI0XV0sODg0MTpbWzg4MzksODI0XV0sODg0OTpbLCx7ODI0Ojg5MzB9XSw4ODUwOlssLHs4MjQ6ODkzMX1dLDg4NjY6WywsezgyNDo4ODc2fV0sODg3MjpbLCx7ODI0Ojg4Nzd9XSw4ODczOlssLHs4MjQ6ODg3OH1dLDg4NzU6WywsezgyNDo4ODc5fV0sODg3NjpbWzg4NjYsODI0XV0sODg3NzpbWzg4NzIsODI0XV0sODg3ODpbWzg4NzMsODI0XV0sODg3OTpbWzg4NzUsODI0XV0sODg4MjpbLCx7ODI0Ojg5Mzh9XSw4ODgzOlssLHs4MjQ6ODkzOX1dLDg4ODQ6WywsezgyNDo4OTQwfV0sODg4NTpbLCx7ODI0Ojg5NDF9XSw4OTI4OltbODgyOCw4MjRdXSw4OTI5OltbODgyOSw4MjRdXSw4OTMwOltbODg0OSw4MjRdXSw4OTMxOltbODg1MCw4MjRdXSw4OTM4OltbODg4Miw4MjRdXSw4OTM5OltbODg4Myw4MjRdXSw4OTQwOltbODg4NCw4MjRdXSw4OTQxOltbODg4NSw4MjRdXX0sXG44OTYwOns5MDAxOltbMTIyOTZdXSw5MDAyOltbMTIyOTddXX0sXG45MjE2Ons5MzEyOltbNDldLDI1Nl0sOTMxMzpbWzUwXSwyNTZdLDkzMTQ6W1s1MV0sMjU2XSw5MzE1OltbNTJdLDI1Nl0sOTMxNjpbWzUzXSwyNTZdLDkzMTc6W1s1NF0sMjU2XSw5MzE4OltbNTVdLDI1Nl0sOTMxOTpbWzU2XSwyNTZdLDkzMjA6W1s1N10sMjU2XSw5MzIxOltbNDksNDhdLDI1Nl0sOTMyMjpbWzQ5LDQ5XSwyNTZdLDkzMjM6W1s0OSw1MF0sMjU2XSw5MzI0OltbNDksNTFdLDI1Nl0sOTMyNTpbWzQ5LDUyXSwyNTZdLDkzMjY6W1s0OSw1M10sMjU2XSw5MzI3OltbNDksNTRdLDI1Nl0sOTMyODpbWzQ5LDU1XSwyNTZdLDkzMjk6W1s0OSw1Nl0sMjU2XSw5MzMwOltbNDksNTddLDI1Nl0sOTMzMTpbWzUwLDQ4XSwyNTZdLDkzMzI6W1s0MCw0OSw0MV0sMjU2XSw5MzMzOltbNDAsNTAsNDFdLDI1Nl0sOTMzNDpbWzQwLDUxLDQxXSwyNTZdLDkzMzU6W1s0MCw1Miw0MV0sMjU2XSw5MzM2OltbNDAsNTMsNDFdLDI1Nl0sOTMzNzpbWzQwLDU0LDQxXSwyNTZdLDkzMzg6W1s0MCw1NSw0MV0sMjU2XSw5MzM5OltbNDAsNTYsNDFdLDI1Nl0sOTM0MDpbWzQwLDU3LDQxXSwyNTZdLDkzNDE6W1s0MCw0OSw0OCw0MV0sMjU2XSw5MzQyOltbNDAsNDksNDksNDFdLDI1Nl0sOTM0MzpbWzQwLDQ5LDUwLDQxXSwyNTZdLDkzNDQ6W1s0MCw0OSw1MSw0MV0sMjU2XSw5MzQ1OltbNDAsNDksNTIsNDFdLDI1Nl0sOTM0NjpbWzQwLDQ5LDUzLDQxXSwyNTZdLDkzNDc6W1s0MCw0OSw1NCw0MV0sMjU2XSw5MzQ4OltbNDAsNDksNTUsNDFdLDI1Nl0sOTM0OTpbWzQwLDQ5LDU2LDQxXSwyNTZdLDkzNTA6W1s0MCw0OSw1Nyw0MV0sMjU2XSw5MzUxOltbNDAsNTAsNDgsNDFdLDI1Nl0sOTM1MjpbWzQ5LDQ2XSwyNTZdLDkzNTM6W1s1MCw0Nl0sMjU2XSw5MzU0OltbNTEsNDZdLDI1Nl0sOTM1NTpbWzUyLDQ2XSwyNTZdLDkzNTY6W1s1Myw0Nl0sMjU2XSw5MzU3OltbNTQsNDZdLDI1Nl0sOTM1ODpbWzU1LDQ2XSwyNTZdLDkzNTk6W1s1Niw0Nl0sMjU2XSw5MzYwOltbNTcsNDZdLDI1Nl0sOTM2MTpbWzQ5LDQ4LDQ2XSwyNTZdLDkzNjI6W1s0OSw0OSw0Nl0sMjU2XSw5MzYzOltbNDksNTAsNDZdLDI1Nl0sOTM2NDpbWzQ5LDUxLDQ2XSwyNTZdLDkzNjU6W1s0OSw1Miw0Nl0sMjU2XSw5MzY2OltbNDksNTMsNDZdLDI1Nl0sOTM2NzpbWzQ5LDU0LDQ2XSwyNTZdLDkzNjg6W1s0OSw1NSw0Nl0sMjU2XSw5MzY5OltbNDksNTYsNDZdLDI1Nl0sOTM3MDpbWzQ5LDU3LDQ2XSwyNTZdLDkzNzE6W1s1MCw0OCw0Nl0sMjU2XSw5MzcyOltbNDAsOTcsNDFdLDI1Nl0sOTM3MzpbWzQwLDk4LDQxXSwyNTZdLDkzNzQ6W1s0MCw5OSw0MV0sMjU2XSw5Mzc1OltbNDAsMTAwLDQxXSwyNTZdLDkzNzY6W1s0MCwxMDEsNDFdLDI1Nl0sOTM3NzpbWzQwLDEwMiw0MV0sMjU2XSw5Mzc4OltbNDAsMTAzLDQxXSwyNTZdLDkzNzk6W1s0MCwxMDQsNDFdLDI1Nl0sOTM4MDpbWzQwLDEwNSw0MV0sMjU2XSw5MzgxOltbNDAsMTA2LDQxXSwyNTZdLDkzODI6W1s0MCwxMDcsNDFdLDI1Nl0sOTM4MzpbWzQwLDEwOCw0MV0sMjU2XSw5Mzg0OltbNDAsMTA5LDQxXSwyNTZdLDkzODU6W1s0MCwxMTAsNDFdLDI1Nl0sOTM4NjpbWzQwLDExMSw0MV0sMjU2XSw5Mzg3OltbNDAsMTEyLDQxXSwyNTZdLDkzODg6W1s0MCwxMTMsNDFdLDI1Nl0sOTM4OTpbWzQwLDExNCw0MV0sMjU2XSw5MzkwOltbNDAsMTE1LDQxXSwyNTZdLDkzOTE6W1s0MCwxMTYsNDFdLDI1Nl0sOTM5MjpbWzQwLDExNyw0MV0sMjU2XSw5MzkzOltbNDAsMTE4LDQxXSwyNTZdLDkzOTQ6W1s0MCwxMTksNDFdLDI1Nl0sOTM5NTpbWzQwLDEyMCw0MV0sMjU2XSw5Mzk2OltbNDAsMTIxLDQxXSwyNTZdLDkzOTc6W1s0MCwxMjIsNDFdLDI1Nl0sOTM5ODpbWzY1XSwyNTZdLDkzOTk6W1s2Nl0sMjU2XSw5NDAwOltbNjddLDI1Nl0sOTQwMTpbWzY4XSwyNTZdLDk0MDI6W1s2OV0sMjU2XSw5NDAzOltbNzBdLDI1Nl0sOTQwNDpbWzcxXSwyNTZdLDk0MDU6W1s3Ml0sMjU2XSw5NDA2OltbNzNdLDI1Nl0sOTQwNzpbWzc0XSwyNTZdLDk0MDg6W1s3NV0sMjU2XSw5NDA5OltbNzZdLDI1Nl0sOTQxMDpbWzc3XSwyNTZdLDk0MTE6W1s3OF0sMjU2XSw5NDEyOltbNzldLDI1Nl0sOTQxMzpbWzgwXSwyNTZdLDk0MTQ6W1s4MV0sMjU2XSw5NDE1OltbODJdLDI1Nl0sOTQxNjpbWzgzXSwyNTZdLDk0MTc6W1s4NF0sMjU2XSw5NDE4OltbODVdLDI1Nl0sOTQxOTpbWzg2XSwyNTZdLDk0MjA6W1s4N10sMjU2XSw5NDIxOltbODhdLDI1Nl0sOTQyMjpbWzg5XSwyNTZdLDk0MjM6W1s5MF0sMjU2XSw5NDI0OltbOTddLDI1Nl0sOTQyNTpbWzk4XSwyNTZdLDk0MjY6W1s5OV0sMjU2XSw5NDI3OltbMTAwXSwyNTZdLDk0Mjg6W1sxMDFdLDI1Nl0sOTQyOTpbWzEwMl0sMjU2XSw5NDMwOltbMTAzXSwyNTZdLDk0MzE6W1sxMDRdLDI1Nl0sOTQzMjpbWzEwNV0sMjU2XSw5NDMzOltbMTA2XSwyNTZdLDk0MzQ6W1sxMDddLDI1Nl0sOTQzNTpbWzEwOF0sMjU2XSw5NDM2OltbMTA5XSwyNTZdLDk0Mzc6W1sxMTBdLDI1Nl0sOTQzODpbWzExMV0sMjU2XSw5NDM5OltbMTEyXSwyNTZdLDk0NDA6W1sxMTNdLDI1Nl0sOTQ0MTpbWzExNF0sMjU2XSw5NDQyOltbMTE1XSwyNTZdLDk0NDM6W1sxMTZdLDI1Nl0sOTQ0NDpbWzExN10sMjU2XSw5NDQ1OltbMTE4XSwyNTZdLDk0NDY6W1sxMTldLDI1Nl0sOTQ0NzpbWzEyMF0sMjU2XSw5NDQ4OltbMTIxXSwyNTZdLDk0NDk6W1sxMjJdLDI1Nl0sOTQ1MDpbWzQ4XSwyNTZdfSxcbjEwNzUyOnsxMDc2NDpbWzg3NDcsODc0Nyw4NzQ3LDg3NDddLDI1Nl0sMTA4Njg6W1s1OCw1OCw2MV0sMjU2XSwxMDg2OTpbWzYxLDYxXSwyNTZdLDEwODcwOltbNjEsNjEsNjFdLDI1Nl0sMTA5NzI6W1sxMDk3Myw4MjRdLDUxMl19LFxuMTEyNjQ6ezExMzg4OltbMTA2XSwyNTZdLDExMzg5OltbODZdLDI1Nl0sMTE1MDM6WywyMzBdLDExNTA0OlssMjMwXSwxMTUwNTpbLDIzMF19LFxuMTE1MjA6ezExNjMxOltbMTE2MTddLDI1Nl0sMTE2NDc6Wyw5XSwxMTc0NDpbLDIzMF0sMTE3NDU6WywyMzBdLDExNzQ2OlssMjMwXSwxMTc0NzpbLDIzMF0sMTE3NDg6WywyMzBdLDExNzQ5OlssMjMwXSwxMTc1MDpbLDIzMF0sMTE3NTE6WywyMzBdLDExNzUyOlssMjMwXSwxMTc1MzpbLDIzMF0sMTE3NTQ6WywyMzBdLDExNzU1OlssMjMwXSwxMTc1NjpbLDIzMF0sMTE3NTc6WywyMzBdLDExNzU4OlssMjMwXSwxMTc1OTpbLDIzMF0sMTE3NjA6WywyMzBdLDExNzYxOlssMjMwXSwxMTc2MjpbLDIzMF0sMTE3NjM6WywyMzBdLDExNzY0OlssMjMwXSwxMTc2NTpbLDIzMF0sMTE3NjY6WywyMzBdLDExNzY3OlssMjMwXSwxMTc2ODpbLDIzMF0sMTE3Njk6WywyMzBdLDExNzcwOlssMjMwXSwxMTc3MTpbLDIzMF0sMTE3NzI6WywyMzBdLDExNzczOlssMjMwXSwxMTc3NDpbLDIzMF0sMTE3NzU6WywyMzBdfSxcbjExNzc2OnsxMTkzNTpbWzI3NTk3XSwyNTZdLDEyMDE5OltbNDA4NjNdLDI1Nl19LFxuMTIwMzI6ezEyMDMyOltbMTk5NjhdLDI1Nl0sMTIwMzM6W1syMDAwOF0sMjU2XSwxMjAzNDpbWzIwMDIyXSwyNTZdLDEyMDM1OltbMjAwMzFdLDI1Nl0sMTIwMzY6W1syMDA1N10sMjU2XSwxMjAzNzpbWzIwMTAxXSwyNTZdLDEyMDM4OltbMjAxMDhdLDI1Nl0sMTIwMzk6W1syMDEyOF0sMjU2XSwxMjA0MDpbWzIwMTU0XSwyNTZdLDEyMDQxOltbMjA3OTldLDI1Nl0sMTIwNDI6W1syMDgzN10sMjU2XSwxMjA0MzpbWzIwODQzXSwyNTZdLDEyMDQ0OltbMjA4NjZdLDI1Nl0sMTIwNDU6W1syMDg4Nl0sMjU2XSwxMjA0NjpbWzIwOTA3XSwyNTZdLDEyMDQ3OltbMjA5NjBdLDI1Nl0sMTIwNDg6W1syMDk4MV0sMjU2XSwxMjA0OTpbWzIwOTkyXSwyNTZdLDEyMDUwOltbMjExNDddLDI1Nl0sMTIwNTE6W1syMTI0MV0sMjU2XSwxMjA1MjpbWzIxMjY5XSwyNTZdLDEyMDUzOltbMjEyNzRdLDI1Nl0sMTIwNTQ6W1syMTMwNF0sMjU2XSwxMjA1NTpbWzIxMzEzXSwyNTZdLDEyMDU2OltbMjEzNDBdLDI1Nl0sMTIwNTc6W1syMTM1M10sMjU2XSwxMjA1ODpbWzIxMzc4XSwyNTZdLDEyMDU5OltbMjE0MzBdLDI1Nl0sMTIwNjA6W1syMTQ0OF0sMjU2XSwxMjA2MTpbWzIxNDc1XSwyNTZdLDEyMDYyOltbMjIyMzFdLDI1Nl0sMTIwNjM6W1syMjMwM10sMjU2XSwxMjA2NDpbWzIyNzYzXSwyNTZdLDEyMDY1OltbMjI3ODZdLDI1Nl0sMTIwNjY6W1syMjc5NF0sMjU2XSwxMjA2NzpbWzIyODA1XSwyNTZdLDEyMDY4OltbMjI4MjNdLDI1Nl0sMTIwNjk6W1syMjg5OV0sMjU2XSwxMjA3MDpbWzIzMzc2XSwyNTZdLDEyMDcxOltbMjM0MjRdLDI1Nl0sMTIwNzI6W1syMzU0NF0sMjU2XSwxMjA3MzpbWzIzNTY3XSwyNTZdLDEyMDc0OltbMjM1ODZdLDI1Nl0sMTIwNzU6W1syMzYwOF0sMjU2XSwxMjA3NjpbWzIzNjYyXSwyNTZdLDEyMDc3OltbMjM2NjVdLDI1Nl0sMTIwNzg6W1syNDAyN10sMjU2XSwxMjA3OTpbWzI0MDM3XSwyNTZdLDEyMDgwOltbMjQwNDldLDI1Nl0sMTIwODE6W1syNDA2Ml0sMjU2XSwxMjA4MjpbWzI0MTc4XSwyNTZdLDEyMDgzOltbMjQxODZdLDI1Nl0sMTIwODQ6W1syNDE5MV0sMjU2XSwxMjA4NTpbWzI0MzA4XSwyNTZdLDEyMDg2OltbMjQzMThdLDI1Nl0sMTIwODc6W1syNDMzMV0sMjU2XSwxMjA4ODpbWzI0MzM5XSwyNTZdLDEyMDg5OltbMjQ0MDBdLDI1Nl0sMTIwOTA6W1syNDQxN10sMjU2XSwxMjA5MTpbWzI0NDM1XSwyNTZdLDEyMDkyOltbMjQ1MTVdLDI1Nl0sMTIwOTM6W1syNTA5Nl0sMjU2XSwxMjA5NDpbWzI1MTQyXSwyNTZdLDEyMDk1OltbMjUxNjNdLDI1Nl0sMTIwOTY6W1syNTkwM10sMjU2XSwxMjA5NzpbWzI1OTA4XSwyNTZdLDEyMDk4OltbMjU5OTFdLDI1Nl0sMTIwOTk6W1syNjAwN10sMjU2XSwxMjEwMDpbWzI2MDIwXSwyNTZdLDEyMTAxOltbMjYwNDFdLDI1Nl0sMTIxMDI6W1syNjA4MF0sMjU2XSwxMjEwMzpbWzI2MDg1XSwyNTZdLDEyMTA0OltbMjYzNTJdLDI1Nl0sMTIxMDU6W1syNjM3Nl0sMjU2XSwxMjEwNjpbWzI2NDA4XSwyNTZdLDEyMTA3OltbMjc0MjRdLDI1Nl0sMTIxMDg6W1syNzQ5MF0sMjU2XSwxMjEwOTpbWzI3NTEzXSwyNTZdLDEyMTEwOltbMjc1NzFdLDI1Nl0sMTIxMTE6W1syNzU5NV0sMjU2XSwxMjExMjpbWzI3NjA0XSwyNTZdLDEyMTEzOltbMjc2MTFdLDI1Nl0sMTIxMTQ6W1syNzY2M10sMjU2XSwxMjExNTpbWzI3NjY4XSwyNTZdLDEyMTE2OltbMjc3MDBdLDI1Nl0sMTIxMTc6W1syODc3OV0sMjU2XSwxMjExODpbWzI5MjI2XSwyNTZdLDEyMTE5OltbMjkyMzhdLDI1Nl0sMTIxMjA6W1syOTI0M10sMjU2XSwxMjEyMTpbWzI5MjQ3XSwyNTZdLDEyMTIyOltbMjkyNTVdLDI1Nl0sMTIxMjM6W1syOTI3M10sMjU2XSwxMjEyNDpbWzI5Mjc1XSwyNTZdLDEyMTI1OltbMjkzNTZdLDI1Nl0sMTIxMjY6W1syOTU3Ml0sMjU2XSwxMjEyNzpbWzI5NTc3XSwyNTZdLDEyMTI4OltbMjk5MTZdLDI1Nl0sMTIxMjk6W1syOTkyNl0sMjU2XSwxMjEzMDpbWzI5OTc2XSwyNTZdLDEyMTMxOltbMjk5ODNdLDI1Nl0sMTIxMzI6W1syOTk5Ml0sMjU2XSwxMjEzMzpbWzMwMDAwXSwyNTZdLDEyMTM0OltbMzAwOTFdLDI1Nl0sMTIxMzU6W1szMDA5OF0sMjU2XSwxMjEzNjpbWzMwMzI2XSwyNTZdLDEyMTM3OltbMzAzMzNdLDI1Nl0sMTIxMzg6W1szMDM4Ml0sMjU2XSwxMjEzOTpbWzMwMzk5XSwyNTZdLDEyMTQwOltbMzA0NDZdLDI1Nl0sMTIxNDE6W1szMDY4M10sMjU2XSwxMjE0MjpbWzMwNjkwXSwyNTZdLDEyMTQzOltbMzA3MDddLDI1Nl0sMTIxNDQ6W1szMTAzNF0sMjU2XSwxMjE0NTpbWzMxMTYwXSwyNTZdLDEyMTQ2OltbMzExNjZdLDI1Nl0sMTIxNDc6W1szMTM0OF0sMjU2XSwxMjE0ODpbWzMxNDM1XSwyNTZdLDEyMTQ5OltbMzE0ODFdLDI1Nl0sMTIxNTA6W1szMTg1OV0sMjU2XSwxMjE1MTpbWzMxOTkyXSwyNTZdLDEyMTUyOltbMzI1NjZdLDI1Nl0sMTIxNTM6W1szMjU5M10sMjU2XSwxMjE1NDpbWzMyNjUwXSwyNTZdLDEyMTU1OltbMzI3MDFdLDI1Nl0sMTIxNTY6W1szMjc2OV0sMjU2XSwxMjE1NzpbWzMyNzgwXSwyNTZdLDEyMTU4OltbMzI3ODZdLDI1Nl0sMTIxNTk6W1szMjgxOV0sMjU2XSwxMjE2MDpbWzMyODk1XSwyNTZdLDEyMTYxOltbMzI5MDVdLDI1Nl0sMTIxNjI6W1szMzI1MV0sMjU2XSwxMjE2MzpbWzMzMjU4XSwyNTZdLDEyMTY0OltbMzMyNjddLDI1Nl0sMTIxNjU6W1szMzI3Nl0sMjU2XSwxMjE2NjpbWzMzMjkyXSwyNTZdLDEyMTY3OltbMzMzMDddLDI1Nl0sMTIxNjg6W1szMzMxMV0sMjU2XSwxMjE2OTpbWzMzMzkwXSwyNTZdLDEyMTcwOltbMzMzOTRdLDI1Nl0sMTIxNzE6W1szMzQwMF0sMjU2XSwxMjE3MjpbWzM0MzgxXSwyNTZdLDEyMTczOltbMzQ0MTFdLDI1Nl0sMTIxNzQ6W1szNDg4MF0sMjU2XSwxMjE3NTpbWzM0ODkyXSwyNTZdLDEyMTc2OltbMzQ5MTVdLDI1Nl0sMTIxNzc6W1szNTE5OF0sMjU2XSwxMjE3ODpbWzM1MjExXSwyNTZdLDEyMTc5OltbMzUyODJdLDI1Nl0sMTIxODA6W1szNTMyOF0sMjU2XSwxMjE4MTpbWzM1ODk1XSwyNTZdLDEyMTgyOltbMzU5MTBdLDI1Nl0sMTIxODM6W1szNTkyNV0sMjU2XSwxMjE4NDpbWzM1OTYwXSwyNTZdLDEyMTg1OltbMzU5OTddLDI1Nl0sMTIxODY6W1szNjE5Nl0sMjU2XSwxMjE4NzpbWzM2MjA4XSwyNTZdLDEyMTg4OltbMzYyNzVdLDI1Nl0sMTIxODk6W1szNjUyM10sMjU2XSwxMjE5MDpbWzM2NTU0XSwyNTZdLDEyMTkxOltbMzY3NjNdLDI1Nl0sMTIxOTI6W1szNjc4NF0sMjU2XSwxMjE5MzpbWzM2Nzg5XSwyNTZdLDEyMTk0OltbMzcwMDldLDI1Nl0sMTIxOTU6W1szNzE5M10sMjU2XSwxMjE5NjpbWzM3MzE4XSwyNTZdLDEyMTk3OltbMzczMjRdLDI1Nl0sMTIxOTg6W1szNzMyOV0sMjU2XSwxMjE5OTpbWzM4MjYzXSwyNTZdLDEyMjAwOltbMzgyNzJdLDI1Nl0sMTIyMDE6W1szODQyOF0sMjU2XSwxMjIwMjpbWzM4NTgyXSwyNTZdLDEyMjAzOltbMzg1ODVdLDI1Nl0sMTIyMDQ6W1szODYzMl0sMjU2XSwxMjIwNTpbWzM4NzM3XSwyNTZdLDEyMjA2OltbMzg3NTBdLDI1Nl0sMTIyMDc6W1szODc1NF0sMjU2XSwxMjIwODpbWzM4NzYxXSwyNTZdLDEyMjA5OltbMzg4NTldLDI1Nl0sMTIyMTA6W1szODg5M10sMjU2XSwxMjIxMTpbWzM4ODk5XSwyNTZdLDEyMjEyOltbMzg5MTNdLDI1Nl0sMTIyMTM6W1szOTA4MF0sMjU2XSwxMjIxNDpbWzM5MTMxXSwyNTZdLDEyMjE1OltbMzkxMzVdLDI1Nl0sMTIyMTY6W1szOTMxOF0sMjU2XSwxMjIxNzpbWzM5MzIxXSwyNTZdLDEyMjE4OltbMzkzNDBdLDI1Nl0sMTIyMTk6W1szOTU5Ml0sMjU2XSwxMjIyMDpbWzM5NjQwXSwyNTZdLDEyMjIxOltbMzk2NDddLDI1Nl0sMTIyMjI6W1szOTcxN10sMjU2XSwxMjIyMzpbWzM5NzI3XSwyNTZdLDEyMjI0OltbMzk3MzBdLDI1Nl0sMTIyMjU6W1szOTc0MF0sMjU2XSwxMjIyNjpbWzM5NzcwXSwyNTZdLDEyMjI3OltbNDAxNjVdLDI1Nl0sMTIyMjg6W1s0MDU2NV0sMjU2XSwxMjIyOTpbWzQwNTc1XSwyNTZdLDEyMjMwOltbNDA2MTNdLDI1Nl0sMTIyMzE6W1s0MDYzNV0sMjU2XSwxMjIzMjpbWzQwNjQzXSwyNTZdLDEyMjMzOltbNDA2NTNdLDI1Nl0sMTIyMzQ6W1s0MDY1N10sMjU2XSwxMjIzNTpbWzQwNjk3XSwyNTZdLDEyMjM2OltbNDA3MDFdLDI1Nl0sMTIyMzc6W1s0MDcxOF0sMjU2XSwxMjIzODpbWzQwNzIzXSwyNTZdLDEyMjM5OltbNDA3MzZdLDI1Nl0sMTIyNDA6W1s0MDc2M10sMjU2XSwxMjI0MTpbWzQwNzc4XSwyNTZdLDEyMjQyOltbNDA3ODZdLDI1Nl0sMTIyNDM6W1s0MDg0NV0sMjU2XSwxMjI0NDpbWzQwODYwXSwyNTZdLDEyMjQ1OltbNDA4NjRdLDI1Nl19LFxuMTIyODg6ezEyMjg4OltbMzJdLDI1Nl0sMTIzMzA6WywyMThdLDEyMzMxOlssMjI4XSwxMjMzMjpbLDIzMl0sMTIzMzM6WywyMjJdLDEyMzM0OlssMjI0XSwxMjMzNTpbLDIyNF0sMTIzNDI6W1sxMjMwNl0sMjU2XSwxMjM0NDpbWzIxMzEzXSwyNTZdLDEyMzQ1OltbMjEzMTZdLDI1Nl0sMTIzNDY6W1syMTMxN10sMjU2XSwxMjM1ODpbLCx7MTI0NDE6MTI0MzZ9XSwxMjM2MzpbLCx7MTI0NDE6MTIzNjR9XSwxMjM2NDpbWzEyMzYzLDEyNDQxXV0sMTIzNjU6WywsezEyNDQxOjEyMzY2fV0sMTIzNjY6W1sxMjM2NSwxMjQ0MV1dLDEyMzY3OlssLHsxMjQ0MToxMjM2OH1dLDEyMzY4OltbMTIzNjcsMTI0NDFdXSwxMjM2OTpbLCx7MTI0NDE6MTIzNzB9XSwxMjM3MDpbWzEyMzY5LDEyNDQxXV0sMTIzNzE6WywsezEyNDQxOjEyMzcyfV0sMTIzNzI6W1sxMjM3MSwxMjQ0MV1dLDEyMzczOlssLHsxMjQ0MToxMjM3NH1dLDEyMzc0OltbMTIzNzMsMTI0NDFdXSwxMjM3NTpbLCx7MTI0NDE6MTIzNzZ9XSwxMjM3NjpbWzEyMzc1LDEyNDQxXV0sMTIzNzc6WywsezEyNDQxOjEyMzc4fV0sMTIzNzg6W1sxMjM3NywxMjQ0MV1dLDEyMzc5OlssLHsxMjQ0MToxMjM4MH1dLDEyMzgwOltbMTIzNzksMTI0NDFdXSwxMjM4MTpbLCx7MTI0NDE6MTIzODJ9XSwxMjM4MjpbWzEyMzgxLDEyNDQxXV0sMTIzODM6WywsezEyNDQxOjEyMzg0fV0sMTIzODQ6W1sxMjM4MywxMjQ0MV1dLDEyMzg1OlssLHsxMjQ0MToxMjM4Nn1dLDEyMzg2OltbMTIzODUsMTI0NDFdXSwxMjM4ODpbLCx7MTI0NDE6MTIzODl9XSwxMjM4OTpbWzEyMzg4LDEyNDQxXV0sMTIzOTA6WywsezEyNDQxOjEyMzkxfV0sMTIzOTE6W1sxMjM5MCwxMjQ0MV1dLDEyMzkyOlssLHsxMjQ0MToxMjM5M31dLDEyMzkzOltbMTIzOTIsMTI0NDFdXSwxMjM5OTpbLCx7MTI0NDE6MTI0MDAsMTI0NDI6MTI0MDF9XSwxMjQwMDpbWzEyMzk5LDEyNDQxXV0sMTI0MDE6W1sxMjM5OSwxMjQ0Ml1dLDEyNDAyOlssLHsxMjQ0MToxMjQwMywxMjQ0MjoxMjQwNH1dLDEyNDAzOltbMTI0MDIsMTI0NDFdXSwxMjQwNDpbWzEyNDAyLDEyNDQyXV0sMTI0MDU6WywsezEyNDQxOjEyNDA2LDEyNDQyOjEyNDA3fV0sMTI0MDY6W1sxMjQwNSwxMjQ0MV1dLDEyNDA3OltbMTI0MDUsMTI0NDJdXSwxMjQwODpbLCx7MTI0NDE6MTI0MDksMTI0NDI6MTI0MTB9XSwxMjQwOTpbWzEyNDA4LDEyNDQxXV0sMTI0MTA6W1sxMjQwOCwxMjQ0Ml1dLDEyNDExOlssLHsxMjQ0MToxMjQxMiwxMjQ0MjoxMjQxM31dLDEyNDEyOltbMTI0MTEsMTI0NDFdXSwxMjQxMzpbWzEyNDExLDEyNDQyXV0sMTI0MzY6W1sxMjM1OCwxMjQ0MV1dLDEyNDQxOlssOF0sMTI0NDI6Wyw4XSwxMjQ0MzpbWzMyLDEyNDQxXSwyNTZdLDEyNDQ0OltbMzIsMTI0NDJdLDI1Nl0sMTI0NDU6WywsezEyNDQxOjEyNDQ2fV0sMTI0NDY6W1sxMjQ0NSwxMjQ0MV1dLDEyNDQ3OltbMTI0MjQsMTI0MjZdLDI1Nl0sMTI0NTQ6WywsezEyNDQxOjEyNTMyfV0sMTI0NTk6WywsezEyNDQxOjEyNDYwfV0sMTI0NjA6W1sxMjQ1OSwxMjQ0MV1dLDEyNDYxOlssLHsxMjQ0MToxMjQ2Mn1dLDEyNDYyOltbMTI0NjEsMTI0NDFdXSwxMjQ2MzpbLCx7MTI0NDE6MTI0NjR9XSwxMjQ2NDpbWzEyNDYzLDEyNDQxXV0sMTI0NjU6WywsezEyNDQxOjEyNDY2fV0sMTI0NjY6W1sxMjQ2NSwxMjQ0MV1dLDEyNDY3OlssLHsxMjQ0MToxMjQ2OH1dLDEyNDY4OltbMTI0NjcsMTI0NDFdXSwxMjQ2OTpbLCx7MTI0NDE6MTI0NzB9XSwxMjQ3MDpbWzEyNDY5LDEyNDQxXV0sMTI0NzE6WywsezEyNDQxOjEyNDcyfV0sMTI0NzI6W1sxMjQ3MSwxMjQ0MV1dLDEyNDczOlssLHsxMjQ0MToxMjQ3NH1dLDEyNDc0OltbMTI0NzMsMTI0NDFdXSwxMjQ3NTpbLCx7MTI0NDE6MTI0NzZ9XSwxMjQ3NjpbWzEyNDc1LDEyNDQxXV0sMTI0Nzc6WywsezEyNDQxOjEyNDc4fV0sMTI0Nzg6W1sxMjQ3NywxMjQ0MV1dLDEyNDc5OlssLHsxMjQ0MToxMjQ4MH1dLDEyNDgwOltbMTI0NzksMTI0NDFdXSwxMjQ4MTpbLCx7MTI0NDE6MTI0ODJ9XSwxMjQ4MjpbWzEyNDgxLDEyNDQxXV0sMTI0ODQ6WywsezEyNDQxOjEyNDg1fV0sMTI0ODU6W1sxMjQ4NCwxMjQ0MV1dLDEyNDg2OlssLHsxMjQ0MToxMjQ4N31dLDEyNDg3OltbMTI0ODYsMTI0NDFdXSwxMjQ4ODpbLCx7MTI0NDE6MTI0ODl9XSwxMjQ4OTpbWzEyNDg4LDEyNDQxXV0sMTI0OTU6WywsezEyNDQxOjEyNDk2LDEyNDQyOjEyNDk3fV0sMTI0OTY6W1sxMjQ5NSwxMjQ0MV1dLDEyNDk3OltbMTI0OTUsMTI0NDJdXSwxMjQ5ODpbLCx7MTI0NDE6MTI0OTksMTI0NDI6MTI1MDB9XSwxMjQ5OTpbWzEyNDk4LDEyNDQxXV0sMTI1MDA6W1sxMjQ5OCwxMjQ0Ml1dLDEyNTAxOlssLHsxMjQ0MToxMjUwMiwxMjQ0MjoxMjUwM31dLDEyNTAyOltbMTI1MDEsMTI0NDFdXSwxMjUwMzpbWzEyNTAxLDEyNDQyXV0sMTI1MDQ6WywsezEyNDQxOjEyNTA1LDEyNDQyOjEyNTA2fV0sMTI1MDU6W1sxMjUwNCwxMjQ0MV1dLDEyNTA2OltbMTI1MDQsMTI0NDJdXSwxMjUwNzpbLCx7MTI0NDE6MTI1MDgsMTI0NDI6MTI1MDl9XSwxMjUwODpbWzEyNTA3LDEyNDQxXV0sMTI1MDk6W1sxMjUwNywxMjQ0Ml1dLDEyNTI3OlssLHsxMjQ0MToxMjUzNX1dLDEyNTI4OlssLHsxMjQ0MToxMjUzNn1dLDEyNTI5OlssLHsxMjQ0MToxMjUzN31dLDEyNTMwOlssLHsxMjQ0MToxMjUzOH1dLDEyNTMyOltbMTI0NTQsMTI0NDFdXSwxMjUzNTpbWzEyNTI3LDEyNDQxXV0sMTI1MzY6W1sxMjUyOCwxMjQ0MV1dLDEyNTM3OltbMTI1MjksMTI0NDFdXSwxMjUzODpbWzEyNTMwLDEyNDQxXV0sMTI1NDE6WywsezEyNDQxOjEyNTQyfV0sMTI1NDI6W1sxMjU0MSwxMjQ0MV1dLDEyNTQzOltbMTI0NjcsMTI0ODhdLDI1Nl19LFxuMTI1NDQ6ezEyNTkzOltbNDM1Ml0sMjU2XSwxMjU5NDpbWzQzNTNdLDI1Nl0sMTI1OTU6W1s0NTIyXSwyNTZdLDEyNTk2OltbNDM1NF0sMjU2XSwxMjU5NzpbWzQ1MjRdLDI1Nl0sMTI1OTg6W1s0NTI1XSwyNTZdLDEyNTk5OltbNDM1NV0sMjU2XSwxMjYwMDpbWzQzNTZdLDI1Nl0sMTI2MDE6W1s0MzU3XSwyNTZdLDEyNjAyOltbNDUyOF0sMjU2XSwxMjYwMzpbWzQ1MjldLDI1Nl0sMTI2MDQ6W1s0NTMwXSwyNTZdLDEyNjA1OltbNDUzMV0sMjU2XSwxMjYwNjpbWzQ1MzJdLDI1Nl0sMTI2MDc6W1s0NTMzXSwyNTZdLDEyNjA4OltbNDM3OF0sMjU2XSwxMjYwOTpbWzQzNThdLDI1Nl0sMTI2MTA6W1s0MzU5XSwyNTZdLDEyNjExOltbNDM2MF0sMjU2XSwxMjYxMjpbWzQzODVdLDI1Nl0sMTI2MTM6W1s0MzYxXSwyNTZdLDEyNjE0OltbNDM2Ml0sMjU2XSwxMjYxNTpbWzQzNjNdLDI1Nl0sMTI2MTY6W1s0MzY0XSwyNTZdLDEyNjE3OltbNDM2NV0sMjU2XSwxMjYxODpbWzQzNjZdLDI1Nl0sMTI2MTk6W1s0MzY3XSwyNTZdLDEyNjIwOltbNDM2OF0sMjU2XSwxMjYyMTpbWzQzNjldLDI1Nl0sMTI2MjI6W1s0MzcwXSwyNTZdLDEyNjIzOltbNDQ0OV0sMjU2XSwxMjYyNDpbWzQ0NTBdLDI1Nl0sMTI2MjU6W1s0NDUxXSwyNTZdLDEyNjI2OltbNDQ1Ml0sMjU2XSwxMjYyNzpbWzQ0NTNdLDI1Nl0sMTI2Mjg6W1s0NDU0XSwyNTZdLDEyNjI5OltbNDQ1NV0sMjU2XSwxMjYzMDpbWzQ0NTZdLDI1Nl0sMTI2MzE6W1s0NDU3XSwyNTZdLDEyNjMyOltbNDQ1OF0sMjU2XSwxMjYzMzpbWzQ0NTldLDI1Nl0sMTI2MzQ6W1s0NDYwXSwyNTZdLDEyNjM1OltbNDQ2MV0sMjU2XSwxMjYzNjpbWzQ0NjJdLDI1Nl0sMTI2Mzc6W1s0NDYzXSwyNTZdLDEyNjM4OltbNDQ2NF0sMjU2XSwxMjYzOTpbWzQ0NjVdLDI1Nl0sMTI2NDA6W1s0NDY2XSwyNTZdLDEyNjQxOltbNDQ2N10sMjU2XSwxMjY0MjpbWzQ0NjhdLDI1Nl0sMTI2NDM6W1s0NDY5XSwyNTZdLDEyNjQ0OltbNDQ0OF0sMjU2XSwxMjY0NTpbWzQzNzJdLDI1Nl0sMTI2NDY6W1s0MzczXSwyNTZdLDEyNjQ3OltbNDU1MV0sMjU2XSwxMjY0ODpbWzQ1NTJdLDI1Nl0sMTI2NDk6W1s0NTU2XSwyNTZdLDEyNjUwOltbNDU1OF0sMjU2XSwxMjY1MTpbWzQ1NjNdLDI1Nl0sMTI2NTI6W1s0NTY3XSwyNTZdLDEyNjUzOltbNDU2OV0sMjU2XSwxMjY1NDpbWzQzODBdLDI1Nl0sMTI2NTU6W1s0NTczXSwyNTZdLDEyNjU2OltbNDU3NV0sMjU2XSwxMjY1NzpbWzQzODFdLDI1Nl0sMTI2NTg6W1s0MzgyXSwyNTZdLDEyNjU5OltbNDM4NF0sMjU2XSwxMjY2MDpbWzQzODZdLDI1Nl0sMTI2NjE6W1s0Mzg3XSwyNTZdLDEyNjYyOltbNDM5MV0sMjU2XSwxMjY2MzpbWzQzOTNdLDI1Nl0sMTI2NjQ6W1s0Mzk1XSwyNTZdLDEyNjY1OltbNDM5Nl0sMjU2XSwxMjY2NjpbWzQzOTddLDI1Nl0sMTI2Njc6W1s0Mzk4XSwyNTZdLDEyNjY4OltbNDM5OV0sMjU2XSwxMjY2OTpbWzQ0MDJdLDI1Nl0sMTI2NzA6W1s0NDA2XSwyNTZdLDEyNjcxOltbNDQxNl0sMjU2XSwxMjY3MjpbWzQ0MjNdLDI1Nl0sMTI2NzM6W1s0NDI4XSwyNTZdLDEyNjc0OltbNDU5M10sMjU2XSwxMjY3NTpbWzQ1OTRdLDI1Nl0sMTI2NzY6W1s0NDM5XSwyNTZdLDEyNjc3OltbNDQ0MF0sMjU2XSwxMjY3ODpbWzQ0NDFdLDI1Nl0sMTI2Nzk6W1s0NDg0XSwyNTZdLDEyNjgwOltbNDQ4NV0sMjU2XSwxMjY4MTpbWzQ0ODhdLDI1Nl0sMTI2ODI6W1s0NDk3XSwyNTZdLDEyNjgzOltbNDQ5OF0sMjU2XSwxMjY4NDpbWzQ1MDBdLDI1Nl0sMTI2ODU6W1s0NTEwXSwyNTZdLDEyNjg2OltbNDUxM10sMjU2XSwxMjY5MDpbWzE5OTY4XSwyNTZdLDEyNjkxOltbMjAxMDhdLDI1Nl0sMTI2OTI6W1sxOTk3N10sMjU2XSwxMjY5MzpbWzIyMjM1XSwyNTZdLDEyNjk0OltbMTk5NzhdLDI1Nl0sMTI2OTU6W1syMDAxM10sMjU2XSwxMjY5NjpbWzE5OTc5XSwyNTZdLDEyNjk3OltbMzAwMDJdLDI1Nl0sMTI2OTg6W1syMDA1N10sMjU2XSwxMjY5OTpbWzE5OTkzXSwyNTZdLDEyNzAwOltbMTk5NjldLDI1Nl0sMTI3MDE6W1syMjgyNV0sMjU2XSwxMjcwMjpbWzIyMzIwXSwyNTZdLDEyNzAzOltbMjAxNTRdLDI1Nl19LFxuMTI4MDA6ezEyODAwOltbNDAsNDM1Miw0MV0sMjU2XSwxMjgwMTpbWzQwLDQzNTQsNDFdLDI1Nl0sMTI4MDI6W1s0MCw0MzU1LDQxXSwyNTZdLDEyODAzOltbNDAsNDM1Nyw0MV0sMjU2XSwxMjgwNDpbWzQwLDQzNTgsNDFdLDI1Nl0sMTI4MDU6W1s0MCw0MzU5LDQxXSwyNTZdLDEyODA2OltbNDAsNDM2MSw0MV0sMjU2XSwxMjgwNzpbWzQwLDQzNjMsNDFdLDI1Nl0sMTI4MDg6W1s0MCw0MzY0LDQxXSwyNTZdLDEyODA5OltbNDAsNDM2Niw0MV0sMjU2XSwxMjgxMDpbWzQwLDQzNjcsNDFdLDI1Nl0sMTI4MTE6W1s0MCw0MzY4LDQxXSwyNTZdLDEyODEyOltbNDAsNDM2OSw0MV0sMjU2XSwxMjgxMzpbWzQwLDQzNzAsNDFdLDI1Nl0sMTI4MTQ6W1s0MCw0MzUyLDQ0NDksNDFdLDI1Nl0sMTI4MTU6W1s0MCw0MzU0LDQ0NDksNDFdLDI1Nl0sMTI4MTY6W1s0MCw0MzU1LDQ0NDksNDFdLDI1Nl0sMTI4MTc6W1s0MCw0MzU3LDQ0NDksNDFdLDI1Nl0sMTI4MTg6W1s0MCw0MzU4LDQ0NDksNDFdLDI1Nl0sMTI4MTk6W1s0MCw0MzU5LDQ0NDksNDFdLDI1Nl0sMTI4MjA6W1s0MCw0MzYxLDQ0NDksNDFdLDI1Nl0sMTI4MjE6W1s0MCw0MzYzLDQ0NDksNDFdLDI1Nl0sMTI4MjI6W1s0MCw0MzY0LDQ0NDksNDFdLDI1Nl0sMTI4MjM6W1s0MCw0MzY2LDQ0NDksNDFdLDI1Nl0sMTI4MjQ6W1s0MCw0MzY3LDQ0NDksNDFdLDI1Nl0sMTI4MjU6W1s0MCw0MzY4LDQ0NDksNDFdLDI1Nl0sMTI4MjY6W1s0MCw0MzY5LDQ0NDksNDFdLDI1Nl0sMTI4Mjc6W1s0MCw0MzcwLDQ0NDksNDFdLDI1Nl0sMTI4Mjg6W1s0MCw0MzY0LDQ0NjIsNDFdLDI1Nl0sMTI4Mjk6W1s0MCw0MzYzLDQ0NTcsNDM2NCw0NDUzLDQ1MjMsNDFdLDI1Nl0sMTI4MzA6W1s0MCw0MzYzLDQ0NTcsNDM3MCw0NDYyLDQxXSwyNTZdLDEyODMyOltbNDAsMTk5NjgsNDFdLDI1Nl0sMTI4MzM6W1s0MCwyMDEwOCw0MV0sMjU2XSwxMjgzNDpbWzQwLDE5OTc3LDQxXSwyNTZdLDEyODM1OltbNDAsMjIyMzUsNDFdLDI1Nl0sMTI4MzY6W1s0MCwyMDExNiw0MV0sMjU2XSwxMjgzNzpbWzQwLDIwODQ1LDQxXSwyNTZdLDEyODM4OltbNDAsMTk5NzEsNDFdLDI1Nl0sMTI4Mzk6W1s0MCwyMDg0Myw0MV0sMjU2XSwxMjg0MDpbWzQwLDIwMDYxLDQxXSwyNTZdLDEyODQxOltbNDAsMjEzMTMsNDFdLDI1Nl0sMTI4NDI6W1s0MCwyNjM3Niw0MV0sMjU2XSwxMjg0MzpbWzQwLDI4Nzc5LDQxXSwyNTZdLDEyODQ0OltbNDAsMjc3MDAsNDFdLDI1Nl0sMTI4NDU6W1s0MCwyNjQwOCw0MV0sMjU2XSwxMjg0NjpbWzQwLDM3MzI5LDQxXSwyNTZdLDEyODQ3OltbNDAsMjIzMDMsNDFdLDI1Nl0sMTI4NDg6W1s0MCwyNjA4NSw0MV0sMjU2XSwxMjg0OTpbWzQwLDI2NjY2LDQxXSwyNTZdLDEyODUwOltbNDAsMjYzNzcsNDFdLDI1Nl0sMTI4NTE6W1s0MCwzMTAzOCw0MV0sMjU2XSwxMjg1MjpbWzQwLDIxNTE3LDQxXSwyNTZdLDEyODUzOltbNDAsMjkzMDUsNDFdLDI1Nl0sMTI4NTQ6W1s0MCwzNjAwMSw0MV0sMjU2XSwxMjg1NTpbWzQwLDMxMDY5LDQxXSwyNTZdLDEyODU2OltbNDAsMjExNzIsNDFdLDI1Nl0sMTI4NTc6W1s0MCwyMDE5NSw0MV0sMjU2XSwxMjg1ODpbWzQwLDIxNjI4LDQxXSwyNTZdLDEyODU5OltbNDAsMjMzOTgsNDFdLDI1Nl0sMTI4NjA6W1s0MCwzMDQzNSw0MV0sMjU2XSwxMjg2MTpbWzQwLDIwMjI1LDQxXSwyNTZdLDEyODYyOltbNDAsMzYwMzksNDFdLDI1Nl0sMTI4NjM6W1s0MCwyMTMzMiw0MV0sMjU2XSwxMjg2NDpbWzQwLDMxMDg1LDQxXSwyNTZdLDEyODY1OltbNDAsMjAyNDEsNDFdLDI1Nl0sMTI4NjY6W1s0MCwzMzI1OCw0MV0sMjU2XSwxMjg2NzpbWzQwLDMzMjY3LDQxXSwyNTZdLDEyODY4OltbMjE4MzldLDI1Nl0sMTI4Njk6W1syNDE4OF0sMjU2XSwxMjg3MDpbWzI1OTkxXSwyNTZdLDEyODcxOltbMzE2MzFdLDI1Nl0sMTI4ODA6W1s4MCw4NCw2OV0sMjU2XSwxMjg4MTpbWzUwLDQ5XSwyNTZdLDEyODgyOltbNTAsNTBdLDI1Nl0sMTI4ODM6W1s1MCw1MV0sMjU2XSwxMjg4NDpbWzUwLDUyXSwyNTZdLDEyODg1OltbNTAsNTNdLDI1Nl0sMTI4ODY6W1s1MCw1NF0sMjU2XSwxMjg4NzpbWzUwLDU1XSwyNTZdLDEyODg4OltbNTAsNTZdLDI1Nl0sMTI4ODk6W1s1MCw1N10sMjU2XSwxMjg5MDpbWzUxLDQ4XSwyNTZdLDEyODkxOltbNTEsNDldLDI1Nl0sMTI4OTI6W1s1MSw1MF0sMjU2XSwxMjg5MzpbWzUxLDUxXSwyNTZdLDEyODk0OltbNTEsNTJdLDI1Nl0sMTI4OTU6W1s1MSw1M10sMjU2XSwxMjg5NjpbWzQzNTJdLDI1Nl0sMTI4OTc6W1s0MzU0XSwyNTZdLDEyODk4OltbNDM1NV0sMjU2XSwxMjg5OTpbWzQzNTddLDI1Nl0sMTI5MDA6W1s0MzU4XSwyNTZdLDEyOTAxOltbNDM1OV0sMjU2XSwxMjkwMjpbWzQzNjFdLDI1Nl0sMTI5MDM6W1s0MzYzXSwyNTZdLDEyOTA0OltbNDM2NF0sMjU2XSwxMjkwNTpbWzQzNjZdLDI1Nl0sMTI5MDY6W1s0MzY3XSwyNTZdLDEyOTA3OltbNDM2OF0sMjU2XSwxMjkwODpbWzQzNjldLDI1Nl0sMTI5MDk6W1s0MzcwXSwyNTZdLDEyOTEwOltbNDM1Miw0NDQ5XSwyNTZdLDEyOTExOltbNDM1NCw0NDQ5XSwyNTZdLDEyOTEyOltbNDM1NSw0NDQ5XSwyNTZdLDEyOTEzOltbNDM1Nyw0NDQ5XSwyNTZdLDEyOTE0OltbNDM1OCw0NDQ5XSwyNTZdLDEyOTE1OltbNDM1OSw0NDQ5XSwyNTZdLDEyOTE2OltbNDM2MSw0NDQ5XSwyNTZdLDEyOTE3OltbNDM2Myw0NDQ5XSwyNTZdLDEyOTE4OltbNDM2NCw0NDQ5XSwyNTZdLDEyOTE5OltbNDM2Niw0NDQ5XSwyNTZdLDEyOTIwOltbNDM2Nyw0NDQ5XSwyNTZdLDEyOTIxOltbNDM2OCw0NDQ5XSwyNTZdLDEyOTIyOltbNDM2OSw0NDQ5XSwyNTZdLDEyOTIzOltbNDM3MCw0NDQ5XSwyNTZdLDEyOTI0OltbNDM2Niw0NDQ5LDQ1MzUsNDM1Miw0NDU3XSwyNTZdLDEyOTI1OltbNDM2NCw0NDYyLDQzNjMsNDQ2OF0sMjU2XSwxMjkyNjpbWzQzNjMsNDQ2Ml0sMjU2XSwxMjkyODpbWzE5OTY4XSwyNTZdLDEyOTI5OltbMjAxMDhdLDI1Nl0sMTI5MzA6W1sxOTk3N10sMjU2XSwxMjkzMTpbWzIyMjM1XSwyNTZdLDEyOTMyOltbMjAxMTZdLDI1Nl0sMTI5MzM6W1syMDg0NV0sMjU2XSwxMjkzNDpbWzE5OTcxXSwyNTZdLDEyOTM1OltbMjA4NDNdLDI1Nl0sMTI5MzY6W1syMDA2MV0sMjU2XSwxMjkzNzpbWzIxMzEzXSwyNTZdLDEyOTM4OltbMjYzNzZdLDI1Nl0sMTI5Mzk6W1syODc3OV0sMjU2XSwxMjk0MDpbWzI3NzAwXSwyNTZdLDEyOTQxOltbMjY0MDhdLDI1Nl0sMTI5NDI6W1szNzMyOV0sMjU2XSwxMjk0MzpbWzIyMzAzXSwyNTZdLDEyOTQ0OltbMjYwODVdLDI1Nl0sMTI5NDU6W1syNjY2Nl0sMjU2XSwxMjk0NjpbWzI2Mzc3XSwyNTZdLDEyOTQ3OltbMzEwMzhdLDI1Nl0sMTI5NDg6W1syMTUxN10sMjU2XSwxMjk0OTpbWzI5MzA1XSwyNTZdLDEyOTUwOltbMzYwMDFdLDI1Nl0sMTI5NTE6W1szMTA2OV0sMjU2XSwxMjk1MjpbWzIxMTcyXSwyNTZdLDEyOTUzOltbMzExOTJdLDI1Nl0sMTI5NTQ6W1szMDAwN10sMjU2XSwxMjk1NTpbWzIyODk5XSwyNTZdLDEyOTU2OltbMzY5NjldLDI1Nl0sMTI5NTc6W1syMDc3OF0sMjU2XSwxMjk1ODpbWzIxMzYwXSwyNTZdLDEyOTU5OltbMjc4ODBdLDI1Nl0sMTI5NjA6W1szODkxN10sMjU2XSwxMjk2MTpbWzIwMjQxXSwyNTZdLDEyOTYyOltbMjA4ODldLDI1Nl0sMTI5NjM6W1syNzQ5MV0sMjU2XSwxMjk2NDpbWzE5OTc4XSwyNTZdLDEyOTY1OltbMjAwMTNdLDI1Nl0sMTI5NjY6W1sxOTk3OV0sMjU2XSwxMjk2NzpbWzI0MDM4XSwyNTZdLDEyOTY4OltbMjE0OTFdLDI1Nl0sMTI5Njk6W1syMTMwN10sMjU2XSwxMjk3MDpbWzIzNDQ3XSwyNTZdLDEyOTcxOltbMjMzOThdLDI1Nl0sMTI5NzI6W1szMDQzNV0sMjU2XSwxMjk3MzpbWzIwMjI1XSwyNTZdLDEyOTc0OltbMzYwMzldLDI1Nl0sMTI5NzU6W1syMTMzMl0sMjU2XSwxMjk3NjpbWzIyODEyXSwyNTZdLDEyOTc3OltbNTEsNTRdLDI1Nl0sMTI5Nzg6W1s1MSw1NV0sMjU2XSwxMjk3OTpbWzUxLDU2XSwyNTZdLDEyOTgwOltbNTEsNTddLDI1Nl0sMTI5ODE6W1s1Miw0OF0sMjU2XSwxMjk4MjpbWzUyLDQ5XSwyNTZdLDEyOTgzOltbNTIsNTBdLDI1Nl0sMTI5ODQ6W1s1Miw1MV0sMjU2XSwxMjk4NTpbWzUyLDUyXSwyNTZdLDEyOTg2OltbNTIsNTNdLDI1Nl0sMTI5ODc6W1s1Miw1NF0sMjU2XSwxMjk4ODpbWzUyLDU1XSwyNTZdLDEyOTg5OltbNTIsNTZdLDI1Nl0sMTI5OTA6W1s1Miw1N10sMjU2XSwxMjk5MTpbWzUzLDQ4XSwyNTZdLDEyOTkyOltbNDksMjYzNzZdLDI1Nl0sMTI5OTM6W1s1MCwyNjM3Nl0sMjU2XSwxMjk5NDpbWzUxLDI2Mzc2XSwyNTZdLDEyOTk1OltbNTIsMjYzNzZdLDI1Nl0sMTI5OTY6W1s1MywyNjM3Nl0sMjU2XSwxMjk5NzpbWzU0LDI2Mzc2XSwyNTZdLDEyOTk4OltbNTUsMjYzNzZdLDI1Nl0sMTI5OTk6W1s1NiwyNjM3Nl0sMjU2XSwxMzAwMDpbWzU3LDI2Mzc2XSwyNTZdLDEzMDAxOltbNDksNDgsMjYzNzZdLDI1Nl0sMTMwMDI6W1s0OSw0OSwyNjM3Nl0sMjU2XSwxMzAwMzpbWzQ5LDUwLDI2Mzc2XSwyNTZdLDEzMDA0OltbNzIsMTAzXSwyNTZdLDEzMDA1OltbMTAxLDExNCwxMDNdLDI1Nl0sMTMwMDY6W1sxMDEsODZdLDI1Nl0sMTMwMDc6W1s3Niw4NCw2OF0sMjU2XSwxMzAwODpbWzEyNDUwXSwyNTZdLDEzMDA5OltbMTI0NTJdLDI1Nl0sMTMwMTA6W1sxMjQ1NF0sMjU2XSwxMzAxMTpbWzEyNDU2XSwyNTZdLDEzMDEyOltbMTI0NThdLDI1Nl0sMTMwMTM6W1sxMjQ1OV0sMjU2XSwxMzAxNDpbWzEyNDYxXSwyNTZdLDEzMDE1OltbMTI0NjNdLDI1Nl0sMTMwMTY6W1sxMjQ2NV0sMjU2XSwxMzAxNzpbWzEyNDY3XSwyNTZdLDEzMDE4OltbMTI0NjldLDI1Nl0sMTMwMTk6W1sxMjQ3MV0sMjU2XSwxMzAyMDpbWzEyNDczXSwyNTZdLDEzMDIxOltbMTI0NzVdLDI1Nl0sMTMwMjI6W1sxMjQ3N10sMjU2XSwxMzAyMzpbWzEyNDc5XSwyNTZdLDEzMDI0OltbMTI0ODFdLDI1Nl0sMTMwMjU6W1sxMjQ4NF0sMjU2XSwxMzAyNjpbWzEyNDg2XSwyNTZdLDEzMDI3OltbMTI0ODhdLDI1Nl0sMTMwMjg6W1sxMjQ5MF0sMjU2XSwxMzAyOTpbWzEyNDkxXSwyNTZdLDEzMDMwOltbMTI0OTJdLDI1Nl0sMTMwMzE6W1sxMjQ5M10sMjU2XSwxMzAzMjpbWzEyNDk0XSwyNTZdLDEzMDMzOltbMTI0OTVdLDI1Nl0sMTMwMzQ6W1sxMjQ5OF0sMjU2XSwxMzAzNTpbWzEyNTAxXSwyNTZdLDEzMDM2OltbMTI1MDRdLDI1Nl0sMTMwMzc6W1sxMjUwN10sMjU2XSwxMzAzODpbWzEyNTEwXSwyNTZdLDEzMDM5OltbMTI1MTFdLDI1Nl0sMTMwNDA6W1sxMjUxMl0sMjU2XSwxMzA0MTpbWzEyNTEzXSwyNTZdLDEzMDQyOltbMTI1MTRdLDI1Nl0sMTMwNDM6W1sxMjUxNl0sMjU2XSwxMzA0NDpbWzEyNTE4XSwyNTZdLDEzMDQ1OltbMTI1MjBdLDI1Nl0sMTMwNDY6W1sxMjUyMV0sMjU2XSwxMzA0NzpbWzEyNTIyXSwyNTZdLDEzMDQ4OltbMTI1MjNdLDI1Nl0sMTMwNDk6W1sxMjUyNF0sMjU2XSwxMzA1MDpbWzEyNTI1XSwyNTZdLDEzMDUxOltbMTI1MjddLDI1Nl0sMTMwNTI6W1sxMjUyOF0sMjU2XSwxMzA1MzpbWzEyNTI5XSwyNTZdLDEzMDU0OltbMTI1MzBdLDI1Nl19LFxuMTMwNTY6ezEzMDU2OltbMTI0NTAsMTI0OTcsMTI1NDAsMTI0ODhdLDI1Nl0sMTMwNTc6W1sxMjQ1MCwxMjUyMywxMjUwMSwxMjQ0OV0sMjU2XSwxMzA1ODpbWzEyNDUwLDEyNTMxLDEyNTA2LDEyNDUwXSwyNTZdLDEzMDU5OltbMTI0NTAsMTI1NDAsMTI1MjNdLDI1Nl0sMTMwNjA6W1sxMjQ1MiwxMjQ5MSwxMjUzMSwxMjQ2NF0sMjU2XSwxMzA2MTpbWzEyNDUyLDEyNTMxLDEyNDgxXSwyNTZdLDEzMDYyOltbMTI0NTQsMTI0NTcsMTI1MzFdLDI1Nl0sMTMwNjM6W1sxMjQ1NiwxMjQ3MywxMjQ2MywxMjU0MCwxMjQ4OV0sMjU2XSwxMzA2NDpbWzEyNDU2LDEyNTQwLDEyNDU5LDEyNTQwXSwyNTZdLDEzMDY1OltbMTI0NTgsMTI1MzEsMTI0NzNdLDI1Nl0sMTMwNjY6W1sxMjQ1OCwxMjU0MCwxMjUxMl0sMjU2XSwxMzA2NzpbWzEyNDU5LDEyNDUyLDEyNTIyXSwyNTZdLDEzMDY4OltbMTI0NTksMTI1MjEsMTI0ODMsMTI0ODhdLDI1Nl0sMTMwNjk6W1sxMjQ1OSwxMjUyNSwxMjUyMiwxMjU0MF0sMjU2XSwxMzA3MDpbWzEyNDYwLDEyNTI1LDEyNTMxXSwyNTZdLDEzMDcxOltbMTI0NjAsMTI1MzEsMTI1MTBdLDI1Nl0sMTMwNzI6W1sxMjQ2MiwxMjQ2MF0sMjU2XSwxMzA3MzpbWzEyNDYyLDEyNDkxLDEyNTQwXSwyNTZdLDEzMDc0OltbMTI0NjEsMTI1MTcsMTI1MjIsMTI1NDBdLDI1Nl0sMTMwNzU6W1sxMjQ2MiwxMjUyMywxMjQ4MCwxMjU0MF0sMjU2XSwxMzA3NjpbWzEyNDYxLDEyNTI1XSwyNTZdLDEzMDc3OltbMTI0NjEsMTI1MjUsMTI0NjQsMTI1MjEsMTI1MTJdLDI1Nl0sMTMwNzg6W1sxMjQ2MSwxMjUyNSwxMjUxMywxMjU0MCwxMjQ4OCwxMjUyM10sMjU2XSwxMzA3OTpbWzEyNDYxLDEyNTI1LDEyNTI3LDEyNDgzLDEyNDg4XSwyNTZdLDEzMDgwOltbMTI0NjQsMTI1MjEsMTI1MTJdLDI1Nl0sMTMwODE6W1sxMjQ2NCwxMjUyMSwxMjUxMiwxMjQ4OCwxMjUzMV0sMjU2XSwxMzA4MjpbWzEyNDYzLDEyNTIzLDEyNDc2LDEyNDUyLDEyNTI1XSwyNTZdLDEzMDgzOltbMTI0NjMsMTI1MjUsMTI1NDAsMTI0OTNdLDI1Nl0sMTMwODQ6W1sxMjQ2NSwxMjU0MCwxMjQ3M10sMjU2XSwxMzA4NTpbWzEyNDY3LDEyNTIzLDEyNDkwXSwyNTZdLDEzMDg2OltbMTI0NjcsMTI1NDAsMTI1MDldLDI1Nl0sMTMwODc6W1sxMjQ2OSwxMjQ1MiwxMjQ2MywxMjUyM10sMjU2XSwxMzA4ODpbWzEyNDY5LDEyNTMxLDEyNDgxLDEyNTQwLDEyNTEyXSwyNTZdLDEzMDg5OltbMTI0NzEsMTI1MjIsMTI1MzEsMTI0NjRdLDI1Nl0sMTMwOTA6W1sxMjQ3NSwxMjUzMSwxMjQ4MV0sMjU2XSwxMzA5MTpbWzEyNDc1LDEyNTMxLDEyNDg4XSwyNTZdLDEzMDkyOltbMTI0ODAsMTI1NDAsMTI0NzNdLDI1Nl0sMTMwOTM6W1sxMjQ4NywxMjQ3MV0sMjU2XSwxMzA5NDpbWzEyNDg5LDEyNTIzXSwyNTZdLDEzMDk1OltbMTI0ODgsMTI1MzFdLDI1Nl0sMTMwOTY6W1sxMjQ5MCwxMjQ5NF0sMjU2XSwxMzA5NzpbWzEyNDk0LDEyNDgzLDEyNDg4XSwyNTZdLDEzMDk4OltbMTI0OTUsMTI0NTIsMTI0ODRdLDI1Nl0sMTMwOTk6W1sxMjQ5NywxMjU0MCwxMjQ3NSwxMjUzMSwxMjQ4OF0sMjU2XSwxMzEwMDpbWzEyNDk3LDEyNTQwLDEyNDg0XSwyNTZdLDEzMTAxOltbMTI0OTYsMTI1NDAsMTI1MjQsMTI1MjNdLDI1Nl0sMTMxMDI6W1sxMjUwMCwxMjQ1MCwxMjQ3MywxMjQ4OCwxMjUyM10sMjU2XSwxMzEwMzpbWzEyNTAwLDEyNDYzLDEyNTIzXSwyNTZdLDEzMTA0OltbMTI1MDAsMTI0NjddLDI1Nl0sMTMxMDU6W1sxMjQ5OSwxMjUyM10sMjU2XSwxMzEwNjpbWzEyNTAxLDEyNDQ5LDEyNTIxLDEyNDgzLDEyNDg5XSwyNTZdLDEzMTA3OltbMTI1MDEsMTI0NTEsMTI1NDAsMTI0ODhdLDI1Nl0sMTMxMDg6W1sxMjUwMiwxMjQ4MywxMjQ3MSwxMjQ1NSwxMjUyM10sMjU2XSwxMzEwOTpbWzEyNTAxLDEyNTIxLDEyNTMxXSwyNTZdLDEzMTEwOltbMTI1MDQsMTI0NjMsMTI0NzksMTI1NDAsMTI1MjNdLDI1Nl0sMTMxMTE6W1sxMjUwNiwxMjQ3N10sMjU2XSwxMzExMjpbWzEyNTA2LDEyNDkxLDEyNDk4XSwyNTZdLDEzMTEzOltbMTI1MDQsMTI1MjMsMTI0ODRdLDI1Nl0sMTMxMTQ6W1sxMjUwNiwxMjUzMSwxMjQ3M10sMjU2XSwxMzExNTpbWzEyNTA2LDEyNTQwLDEyNDcyXSwyNTZdLDEzMTE2OltbMTI1MDUsMTI1NDAsMTI0NzldLDI1Nl0sMTMxMTc6W1sxMjUwOSwxMjQ1MiwxMjUzMSwxMjQ4OF0sMjU2XSwxMzExODpbWzEyNTA4LDEyNTIzLDEyNDg4XSwyNTZdLDEzMTE5OltbMTI1MDcsMTI1MzFdLDI1Nl0sMTMxMjA6W1sxMjUwOSwxMjUzMSwxMjQ4OV0sMjU2XSwxMzEyMTpbWzEyNTA3LDEyNTQwLDEyNTIzXSwyNTZdLDEzMTIyOltbMTI1MDcsMTI1NDAsMTI1MzFdLDI1Nl0sMTMxMjM6W1sxMjUxMCwxMjQ1MiwxMjQ2MywxMjUyNV0sMjU2XSwxMzEyNDpbWzEyNTEwLDEyNDUyLDEyNTIzXSwyNTZdLDEzMTI1OltbMTI1MTAsMTI0ODMsMTI0OTVdLDI1Nl0sMTMxMjY6W1sxMjUxMCwxMjUyMywxMjQ2M10sMjU2XSwxMzEyNzpbWzEyNTEwLDEyNTMxLDEyNDcxLDEyNTE5LDEyNTMxXSwyNTZdLDEzMTI4OltbMTI1MTEsMTI0NjMsMTI1MjUsMTI1MzFdLDI1Nl0sMTMxMjk6W1sxMjUxMSwxMjUyMl0sMjU2XSwxMzEzMDpbWzEyNTExLDEyNTIyLDEyNDk2LDEyNTQwLDEyNTIzXSwyNTZdLDEzMTMxOltbMTI1MTMsMTI0NjBdLDI1Nl0sMTMxMzI6W1sxMjUxMywxMjQ2MCwxMjQ4OCwxMjUzMV0sMjU2XSwxMzEzMzpbWzEyNTEzLDEyNTQwLDEyNDg4LDEyNTIzXSwyNTZdLDEzMTM0OltbMTI1MTYsMTI1NDAsMTI0ODldLDI1Nl0sMTMxMzU6W1sxMjUxNiwxMjU0MCwxMjUyM10sMjU2XSwxMzEzNjpbWzEyNTE4LDEyNDUwLDEyNTMxXSwyNTZdLDEzMTM3OltbMTI1MjIsMTI0ODMsMTI0ODgsMTI1MjNdLDI1Nl0sMTMxMzg6W1sxMjUyMiwxMjUyMV0sMjU2XSwxMzEzOTpbWzEyNTIzLDEyNTAwLDEyNTQwXSwyNTZdLDEzMTQwOltbMTI1MjMsMTI1NDAsMTI1MDIsMTI1MjNdLDI1Nl0sMTMxNDE6W1sxMjUyNCwxMjUxMl0sMjU2XSwxMzE0MjpbWzEyNTI0LDEyNTMxLDEyNDg4LDEyNDY2LDEyNTMxXSwyNTZdLDEzMTQzOltbMTI1MjcsMTI0ODMsMTI0ODhdLDI1Nl0sMTMxNDQ6W1s0OCwyODg1N10sMjU2XSwxMzE0NTpbWzQ5LDI4ODU3XSwyNTZdLDEzMTQ2OltbNTAsMjg4NTddLDI1Nl0sMTMxNDc6W1s1MSwyODg1N10sMjU2XSwxMzE0ODpbWzUyLDI4ODU3XSwyNTZdLDEzMTQ5OltbNTMsMjg4NTddLDI1Nl0sMTMxNTA6W1s1NCwyODg1N10sMjU2XSwxMzE1MTpbWzU1LDI4ODU3XSwyNTZdLDEzMTUyOltbNTYsMjg4NTddLDI1Nl0sMTMxNTM6W1s1NywyODg1N10sMjU2XSwxMzE1NDpbWzQ5LDQ4LDI4ODU3XSwyNTZdLDEzMTU1OltbNDksNDksMjg4NTddLDI1Nl0sMTMxNTY6W1s0OSw1MCwyODg1N10sMjU2XSwxMzE1NzpbWzQ5LDUxLDI4ODU3XSwyNTZdLDEzMTU4OltbNDksNTIsMjg4NTddLDI1Nl0sMTMxNTk6W1s0OSw1MywyODg1N10sMjU2XSwxMzE2MDpbWzQ5LDU0LDI4ODU3XSwyNTZdLDEzMTYxOltbNDksNTUsMjg4NTddLDI1Nl0sMTMxNjI6W1s0OSw1NiwyODg1N10sMjU2XSwxMzE2MzpbWzQ5LDU3LDI4ODU3XSwyNTZdLDEzMTY0OltbNTAsNDgsMjg4NTddLDI1Nl0sMTMxNjU6W1s1MCw0OSwyODg1N10sMjU2XSwxMzE2NjpbWzUwLDUwLDI4ODU3XSwyNTZdLDEzMTY3OltbNTAsNTEsMjg4NTddLDI1Nl0sMTMxNjg6W1s1MCw1MiwyODg1N10sMjU2XSwxMzE2OTpbWzEwNCw4MCw5N10sMjU2XSwxMzE3MDpbWzEwMCw5N10sMjU2XSwxMzE3MTpbWzY1LDg1XSwyNTZdLDEzMTcyOltbOTgsOTcsMTE0XSwyNTZdLDEzMTczOltbMTExLDg2XSwyNTZdLDEzMTc0OltbMTEyLDk5XSwyNTZdLDEzMTc1OltbMTAwLDEwOV0sMjU2XSwxMzE3NjpbWzEwMCwxMDksMTc4XSwyNTZdLDEzMTc3OltbMTAwLDEwOSwxNzldLDI1Nl0sMTMxNzg6W1s3Myw4NV0sMjU2XSwxMzE3OTpbWzI0MTc5LDI1MTA0XSwyNTZdLDEzMTgwOltbMjYxNTcsMjE2NDRdLDI1Nl0sMTMxODE6W1syMjgyMywyNzQ5MV0sMjU2XSwxMzE4MjpbWzI2MTI2LDI3ODM1XSwyNTZdLDEzMTgzOltbMjY2NjYsMjQzMzUsMjAyNTAsMzEwMzhdLDI1Nl0sMTMxODQ6W1sxMTIsNjVdLDI1Nl0sMTMxODU6W1sxMTAsNjVdLDI1Nl0sMTMxODY6W1s5NTYsNjVdLDI1Nl0sMTMxODc6W1sxMDksNjVdLDI1Nl0sMTMxODg6W1sxMDcsNjVdLDI1Nl0sMTMxODk6W1s3NSw2Nl0sMjU2XSwxMzE5MDpbWzc3LDY2XSwyNTZdLDEzMTkxOltbNzEsNjZdLDI1Nl0sMTMxOTI6W1s5OSw5NywxMDhdLDI1Nl0sMTMxOTM6W1sxMDcsOTksOTcsMTA4XSwyNTZdLDEzMTk0OltbMTEyLDcwXSwyNTZdLDEzMTk1OltbMTEwLDcwXSwyNTZdLDEzMTk2OltbOTU2LDcwXSwyNTZdLDEzMTk3OltbOTU2LDEwM10sMjU2XSwxMzE5ODpbWzEwOSwxMDNdLDI1Nl0sMTMxOTk6W1sxMDcsMTAzXSwyNTZdLDEzMjAwOltbNzIsMTIyXSwyNTZdLDEzMjAxOltbMTA3LDcyLDEyMl0sMjU2XSwxMzIwMjpbWzc3LDcyLDEyMl0sMjU2XSwxMzIwMzpbWzcxLDcyLDEyMl0sMjU2XSwxMzIwNDpbWzg0LDcyLDEyMl0sMjU2XSwxMzIwNTpbWzk1Niw4NDY3XSwyNTZdLDEzMjA2OltbMTA5LDg0NjddLDI1Nl0sMTMyMDc6W1sxMDAsODQ2N10sMjU2XSwxMzIwODpbWzEwNyw4NDY3XSwyNTZdLDEzMjA5OltbMTAyLDEwOV0sMjU2XSwxMzIxMDpbWzExMCwxMDldLDI1Nl0sMTMyMTE6W1s5NTYsMTA5XSwyNTZdLDEzMjEyOltbMTA5LDEwOV0sMjU2XSwxMzIxMzpbWzk5LDEwOV0sMjU2XSwxMzIxNDpbWzEwNywxMDldLDI1Nl0sMTMyMTU6W1sxMDksMTA5LDE3OF0sMjU2XSwxMzIxNjpbWzk5LDEwOSwxNzhdLDI1Nl0sMTMyMTc6W1sxMDksMTc4XSwyNTZdLDEzMjE4OltbMTA3LDEwOSwxNzhdLDI1Nl0sMTMyMTk6W1sxMDksMTA5LDE3OV0sMjU2XSwxMzIyMDpbWzk5LDEwOSwxNzldLDI1Nl0sMTMyMjE6W1sxMDksMTc5XSwyNTZdLDEzMjIyOltbMTA3LDEwOSwxNzldLDI1Nl0sMTMyMjM6W1sxMDksODcyNSwxMTVdLDI1Nl0sMTMyMjQ6W1sxMDksODcyNSwxMTUsMTc4XSwyNTZdLDEzMjI1OltbODAsOTddLDI1Nl0sMTMyMjY6W1sxMDcsODAsOTddLDI1Nl0sMTMyMjc6W1s3Nyw4MCw5N10sMjU2XSwxMzIyODpbWzcxLDgwLDk3XSwyNTZdLDEzMjI5OltbMTE0LDk3LDEwMF0sMjU2XSwxMzIzMDpbWzExNCw5NywxMDAsODcyNSwxMTVdLDI1Nl0sMTMyMzE6W1sxMTQsOTcsMTAwLDg3MjUsMTE1LDE3OF0sMjU2XSwxMzIzMjpbWzExMiwxMTVdLDI1Nl0sMTMyMzM6W1sxMTAsMTE1XSwyNTZdLDEzMjM0OltbOTU2LDExNV0sMjU2XSwxMzIzNTpbWzEwOSwxMTVdLDI1Nl0sMTMyMzY6W1sxMTIsODZdLDI1Nl0sMTMyMzc6W1sxMTAsODZdLDI1Nl0sMTMyMzg6W1s5NTYsODZdLDI1Nl0sMTMyMzk6W1sxMDksODZdLDI1Nl0sMTMyNDA6W1sxMDcsODZdLDI1Nl0sMTMyNDE6W1s3Nyw4Nl0sMjU2XSwxMzI0MjpbWzExMiw4N10sMjU2XSwxMzI0MzpbWzExMCw4N10sMjU2XSwxMzI0NDpbWzk1Niw4N10sMjU2XSwxMzI0NTpbWzEwOSw4N10sMjU2XSwxMzI0NjpbWzEwNyw4N10sMjU2XSwxMzI0NzpbWzc3LDg3XSwyNTZdLDEzMjQ4OltbMTA3LDkzN10sMjU2XSwxMzI0OTpbWzc3LDkzN10sMjU2XSwxMzI1MDpbWzk3LDQ2LDEwOSw0Nl0sMjU2XSwxMzI1MTpbWzY2LDExM10sMjU2XSwxMzI1MjpbWzk5LDk5XSwyNTZdLDEzMjUzOltbOTksMTAwXSwyNTZdLDEzMjU0OltbNjcsODcyNSwxMDcsMTAzXSwyNTZdLDEzMjU1OltbNjcsMTExLDQ2XSwyNTZdLDEzMjU2OltbMTAwLDY2XSwyNTZdLDEzMjU3OltbNzEsMTIxXSwyNTZdLDEzMjU4OltbMTA0LDk3XSwyNTZdLDEzMjU5OltbNzIsODBdLDI1Nl0sMTMyNjA6W1sxMDUsMTEwXSwyNTZdLDEzMjYxOltbNzUsNzVdLDI1Nl0sMTMyNjI6W1s3NSw3N10sMjU2XSwxMzI2MzpbWzEwNywxMTZdLDI1Nl0sMTMyNjQ6W1sxMDgsMTA5XSwyNTZdLDEzMjY1OltbMTA4LDExMF0sMjU2XSwxMzI2NjpbWzEwOCwxMTEsMTAzXSwyNTZdLDEzMjY3OltbMTA4LDEyMF0sMjU2XSwxMzI2ODpbWzEwOSw5OF0sMjU2XSwxMzI2OTpbWzEwOSwxMDUsMTA4XSwyNTZdLDEzMjcwOltbMTA5LDExMSwxMDhdLDI1Nl0sMTMyNzE6W1s4MCw3Ml0sMjU2XSwxMzI3MjpbWzExMiw0NiwxMDksNDZdLDI1Nl0sMTMyNzM6W1s4MCw4MCw3N10sMjU2XSwxMzI3NDpbWzgwLDgyXSwyNTZdLDEzMjc1OltbMTE1LDExNF0sMjU2XSwxMzI3NjpbWzgzLDExOF0sMjU2XSwxMzI3NzpbWzg3LDk4XSwyNTZdLDEzMjc4OltbODYsODcyNSwxMDldLDI1Nl0sMTMyNzk6W1s2NSw4NzI1LDEwOV0sMjU2XSwxMzI4MDpbWzQ5LDI2MDg1XSwyNTZdLDEzMjgxOltbNTAsMjYwODVdLDI1Nl0sMTMyODI6W1s1MSwyNjA4NV0sMjU2XSwxMzI4MzpbWzUyLDI2MDg1XSwyNTZdLDEzMjg0OltbNTMsMjYwODVdLDI1Nl0sMTMyODU6W1s1NCwyNjA4NV0sMjU2XSwxMzI4NjpbWzU1LDI2MDg1XSwyNTZdLDEzMjg3OltbNTYsMjYwODVdLDI1Nl0sMTMyODg6W1s1NywyNjA4NV0sMjU2XSwxMzI4OTpbWzQ5LDQ4LDI2MDg1XSwyNTZdLDEzMjkwOltbNDksNDksMjYwODVdLDI1Nl0sMTMyOTE6W1s0OSw1MCwyNjA4NV0sMjU2XSwxMzI5MjpbWzQ5LDUxLDI2MDg1XSwyNTZdLDEzMjkzOltbNDksNTIsMjYwODVdLDI1Nl0sMTMyOTQ6W1s0OSw1MywyNjA4NV0sMjU2XSwxMzI5NTpbWzQ5LDU0LDI2MDg1XSwyNTZdLDEzMjk2OltbNDksNTUsMjYwODVdLDI1Nl0sMTMyOTc6W1s0OSw1NiwyNjA4NV0sMjU2XSwxMzI5ODpbWzQ5LDU3LDI2MDg1XSwyNTZdLDEzMjk5OltbNTAsNDgsMjYwODVdLDI1Nl0sMTMzMDA6W1s1MCw0OSwyNjA4NV0sMjU2XSwxMzMwMTpbWzUwLDUwLDI2MDg1XSwyNTZdLDEzMzAyOltbNTAsNTEsMjYwODVdLDI1Nl0sMTMzMDM6W1s1MCw1MiwyNjA4NV0sMjU2XSwxMzMwNDpbWzUwLDUzLDI2MDg1XSwyNTZdLDEzMzA1OltbNTAsNTQsMjYwODVdLDI1Nl0sMTMzMDY6W1s1MCw1NSwyNjA4NV0sMjU2XSwxMzMwNzpbWzUwLDU2LDI2MDg1XSwyNTZdLDEzMzA4OltbNTAsNTcsMjYwODVdLDI1Nl0sMTMzMDk6W1s1MSw0OCwyNjA4NV0sMjU2XSwxMzMxMDpbWzUxLDQ5LDI2MDg1XSwyNTZdLDEzMzExOltbMTAzLDk3LDEwOF0sMjU2XX0sXG40MjQ5Njp7NDI2MDc6WywyMzBdLDQyNjEyOlssMjMwXSw0MjYxMzpbLDIzMF0sNDI2MTQ6WywyMzBdLDQyNjE1OlssMjMwXSw0MjYxNjpbLDIzMF0sNDI2MTc6WywyMzBdLDQyNjE4OlssMjMwXSw0MjYxOTpbLDIzMF0sNDI2MjA6WywyMzBdLDQyNjIxOlssMjMwXSw0MjY1NTpbLDIzMF0sNDI3MzY6WywyMzBdLDQyNzM3OlssMjMwXX0sXG40Mjc1Mjp7NDI4NjQ6W1s0Mjg2M10sMjU2XSw0MzAwMDpbWzI5NF0sMjU2XSw0MzAwMTpbWzMzOV0sMjU2XX0sXG40MzAwODp7NDMwMTQ6Wyw5XSw0MzIwNDpbLDldLDQzMjMyOlssMjMwXSw0MzIzMzpbLDIzMF0sNDMyMzQ6WywyMzBdLDQzMjM1OlssMjMwXSw0MzIzNjpbLDIzMF0sNDMyMzc6WywyMzBdLDQzMjM4OlssMjMwXSw0MzIzOTpbLDIzMF0sNDMyNDA6WywyMzBdLDQzMjQxOlssMjMwXSw0MzI0MjpbLDIzMF0sNDMyNDM6WywyMzBdLDQzMjQ0OlssMjMwXSw0MzI0NTpbLDIzMF0sNDMyNDY6WywyMzBdLDQzMjQ3OlssMjMwXSw0MzI0ODpbLDIzMF0sNDMyNDk6WywyMzBdfSxcbjQzMjY0Ons0MzMwNzpbLDIyMF0sNDMzMDg6WywyMjBdLDQzMzA5OlssMjIwXSw0MzM0NzpbLDldLDQzNDQzOlssN10sNDM0NTY6Wyw5XX0sXG40MzUyMDp7NDM2OTY6WywyMzBdLDQzNjk4OlssMjMwXSw0MzY5OTpbLDIzMF0sNDM3MDA6WywyMjBdLDQzNzAzOlssMjMwXSw0MzcwNDpbLDIzMF0sNDM3MTA6WywyMzBdLDQzNzExOlssMjMwXSw0MzcxMzpbLDIzMF0sNDM3NjY6Wyw5XX0sXG40Mzc3Njp7NDQwMTM6Wyw5XX0sXG41MzUwNDp7MTE5MTM0OltbMTE5MTI3LDExOTE0MV0sNTEyXSwxMTkxMzU6W1sxMTkxMjgsMTE5MTQxXSw1MTJdLDExOTEzNjpbWzExOTEzNSwxMTkxNTBdLDUxMl0sMTE5MTM3OltbMTE5MTM1LDExOTE1MV0sNTEyXSwxMTkxMzg6W1sxMTkxMzUsMTE5MTUyXSw1MTJdLDExOTEzOTpbWzExOTEzNSwxMTkxNTNdLDUxMl0sMTE5MTQwOltbMTE5MTM1LDExOTE1NF0sNTEyXSwxMTkxNDE6WywyMTZdLDExOTE0MjpbLDIxNl0sMTE5MTQzOlssMV0sMTE5MTQ0OlssMV0sMTE5MTQ1OlssMV0sMTE5MTQ5OlssMjI2XSwxMTkxNTA6WywyMTZdLDExOTE1MTpbLDIxNl0sMTE5MTUyOlssMjE2XSwxMTkxNTM6WywyMTZdLDExOTE1NDpbLDIxNl0sMTE5MTYzOlssMjIwXSwxMTkxNjQ6WywyMjBdLDExOTE2NTpbLDIyMF0sMTE5MTY2OlssMjIwXSwxMTkxNjc6WywyMjBdLDExOTE2ODpbLDIyMF0sMTE5MTY5OlssMjIwXSwxMTkxNzA6WywyMjBdLDExOTE3MzpbLDIzMF0sMTE5MTc0OlssMjMwXSwxMTkxNzU6WywyMzBdLDExOTE3NjpbLDIzMF0sMTE5MTc3OlssMjMwXSwxMTkxNzg6WywyMjBdLDExOTE3OTpbLDIyMF0sMTE5MjEwOlssMjMwXSwxMTkyMTE6WywyMzBdLDExOTIxMjpbLDIzMF0sMTE5MjEzOlssMjMwXSwxMTkyMjc6W1sxMTkyMjUsMTE5MTQxXSw1MTJdLDExOTIyODpbWzExOTIyNiwxMTkxNDFdLDUxMl0sMTE5MjI5OltbMTE5MjI3LDExOTE1MF0sNTEyXSwxMTkyMzA6W1sxMTkyMjgsMTE5MTUwXSw1MTJdLDExOTIzMTpbWzExOTIyNywxMTkxNTFdLDUxMl0sMTE5MjMyOltbMTE5MjI4LDExOTE1MV0sNTEyXX0sXG41Mzc2MDp7MTE5MzYyOlssMjMwXSwxMTkzNjM6WywyMzBdLDExOTM2NDpbLDIzMF19LFxuNTQyNzI6ezExOTgwODpbWzY1XSwyNTZdLDExOTgwOTpbWzY2XSwyNTZdLDExOTgxMDpbWzY3XSwyNTZdLDExOTgxMTpbWzY4XSwyNTZdLDExOTgxMjpbWzY5XSwyNTZdLDExOTgxMzpbWzcwXSwyNTZdLDExOTgxNDpbWzcxXSwyNTZdLDExOTgxNTpbWzcyXSwyNTZdLDExOTgxNjpbWzczXSwyNTZdLDExOTgxNzpbWzc0XSwyNTZdLDExOTgxODpbWzc1XSwyNTZdLDExOTgxOTpbWzc2XSwyNTZdLDExOTgyMDpbWzc3XSwyNTZdLDExOTgyMTpbWzc4XSwyNTZdLDExOTgyMjpbWzc5XSwyNTZdLDExOTgyMzpbWzgwXSwyNTZdLDExOTgyNDpbWzgxXSwyNTZdLDExOTgyNTpbWzgyXSwyNTZdLDExOTgyNjpbWzgzXSwyNTZdLDExOTgyNzpbWzg0XSwyNTZdLDExOTgyODpbWzg1XSwyNTZdLDExOTgyOTpbWzg2XSwyNTZdLDExOTgzMDpbWzg3XSwyNTZdLDExOTgzMTpbWzg4XSwyNTZdLDExOTgzMjpbWzg5XSwyNTZdLDExOTgzMzpbWzkwXSwyNTZdLDExOTgzNDpbWzk3XSwyNTZdLDExOTgzNTpbWzk4XSwyNTZdLDExOTgzNjpbWzk5XSwyNTZdLDExOTgzNzpbWzEwMF0sMjU2XSwxMTk4Mzg6W1sxMDFdLDI1Nl0sMTE5ODM5OltbMTAyXSwyNTZdLDExOTg0MDpbWzEwM10sMjU2XSwxMTk4NDE6W1sxMDRdLDI1Nl0sMTE5ODQyOltbMTA1XSwyNTZdLDExOTg0MzpbWzEwNl0sMjU2XSwxMTk4NDQ6W1sxMDddLDI1Nl0sMTE5ODQ1OltbMTA4XSwyNTZdLDExOTg0NjpbWzEwOV0sMjU2XSwxMTk4NDc6W1sxMTBdLDI1Nl0sMTE5ODQ4OltbMTExXSwyNTZdLDExOTg0OTpbWzExMl0sMjU2XSwxMTk4NTA6W1sxMTNdLDI1Nl0sMTE5ODUxOltbMTE0XSwyNTZdLDExOTg1MjpbWzExNV0sMjU2XSwxMTk4NTM6W1sxMTZdLDI1Nl0sMTE5ODU0OltbMTE3XSwyNTZdLDExOTg1NTpbWzExOF0sMjU2XSwxMTk4NTY6W1sxMTldLDI1Nl0sMTE5ODU3OltbMTIwXSwyNTZdLDExOTg1ODpbWzEyMV0sMjU2XSwxMTk4NTk6W1sxMjJdLDI1Nl0sMTE5ODYwOltbNjVdLDI1Nl0sMTE5ODYxOltbNjZdLDI1Nl0sMTE5ODYyOltbNjddLDI1Nl0sMTE5ODYzOltbNjhdLDI1Nl0sMTE5ODY0OltbNjldLDI1Nl0sMTE5ODY1OltbNzBdLDI1Nl0sMTE5ODY2OltbNzFdLDI1Nl0sMTE5ODY3OltbNzJdLDI1Nl0sMTE5ODY4OltbNzNdLDI1Nl0sMTE5ODY5OltbNzRdLDI1Nl0sMTE5ODcwOltbNzVdLDI1Nl0sMTE5ODcxOltbNzZdLDI1Nl0sMTE5ODcyOltbNzddLDI1Nl0sMTE5ODczOltbNzhdLDI1Nl0sMTE5ODc0OltbNzldLDI1Nl0sMTE5ODc1OltbODBdLDI1Nl0sMTE5ODc2OltbODFdLDI1Nl0sMTE5ODc3OltbODJdLDI1Nl0sMTE5ODc4OltbODNdLDI1Nl0sMTE5ODc5OltbODRdLDI1Nl0sMTE5ODgwOltbODVdLDI1Nl0sMTE5ODgxOltbODZdLDI1Nl0sMTE5ODgyOltbODddLDI1Nl0sMTE5ODgzOltbODhdLDI1Nl0sMTE5ODg0OltbODldLDI1Nl0sMTE5ODg1OltbOTBdLDI1Nl0sMTE5ODg2OltbOTddLDI1Nl0sMTE5ODg3OltbOThdLDI1Nl0sMTE5ODg4OltbOTldLDI1Nl0sMTE5ODg5OltbMTAwXSwyNTZdLDExOTg5MDpbWzEwMV0sMjU2XSwxMTk4OTE6W1sxMDJdLDI1Nl0sMTE5ODkyOltbMTAzXSwyNTZdLDExOTg5NDpbWzEwNV0sMjU2XSwxMTk4OTU6W1sxMDZdLDI1Nl0sMTE5ODk2OltbMTA3XSwyNTZdLDExOTg5NzpbWzEwOF0sMjU2XSwxMTk4OTg6W1sxMDldLDI1Nl0sMTE5ODk5OltbMTEwXSwyNTZdLDExOTkwMDpbWzExMV0sMjU2XSwxMTk5MDE6W1sxMTJdLDI1Nl0sMTE5OTAyOltbMTEzXSwyNTZdLDExOTkwMzpbWzExNF0sMjU2XSwxMTk5MDQ6W1sxMTVdLDI1Nl0sMTE5OTA1OltbMTE2XSwyNTZdLDExOTkwNjpbWzExN10sMjU2XSwxMTk5MDc6W1sxMThdLDI1Nl0sMTE5OTA4OltbMTE5XSwyNTZdLDExOTkwOTpbWzEyMF0sMjU2XSwxMTk5MTA6W1sxMjFdLDI1Nl0sMTE5OTExOltbMTIyXSwyNTZdLDExOTkxMjpbWzY1XSwyNTZdLDExOTkxMzpbWzY2XSwyNTZdLDExOTkxNDpbWzY3XSwyNTZdLDExOTkxNTpbWzY4XSwyNTZdLDExOTkxNjpbWzY5XSwyNTZdLDExOTkxNzpbWzcwXSwyNTZdLDExOTkxODpbWzcxXSwyNTZdLDExOTkxOTpbWzcyXSwyNTZdLDExOTkyMDpbWzczXSwyNTZdLDExOTkyMTpbWzc0XSwyNTZdLDExOTkyMjpbWzc1XSwyNTZdLDExOTkyMzpbWzc2XSwyNTZdLDExOTkyNDpbWzc3XSwyNTZdLDExOTkyNTpbWzc4XSwyNTZdLDExOTkyNjpbWzc5XSwyNTZdLDExOTkyNzpbWzgwXSwyNTZdLDExOTkyODpbWzgxXSwyNTZdLDExOTkyOTpbWzgyXSwyNTZdLDExOTkzMDpbWzgzXSwyNTZdLDExOTkzMTpbWzg0XSwyNTZdLDExOTkzMjpbWzg1XSwyNTZdLDExOTkzMzpbWzg2XSwyNTZdLDExOTkzNDpbWzg3XSwyNTZdLDExOTkzNTpbWzg4XSwyNTZdLDExOTkzNjpbWzg5XSwyNTZdLDExOTkzNzpbWzkwXSwyNTZdLDExOTkzODpbWzk3XSwyNTZdLDExOTkzOTpbWzk4XSwyNTZdLDExOTk0MDpbWzk5XSwyNTZdLDExOTk0MTpbWzEwMF0sMjU2XSwxMTk5NDI6W1sxMDFdLDI1Nl0sMTE5OTQzOltbMTAyXSwyNTZdLDExOTk0NDpbWzEwM10sMjU2XSwxMTk5NDU6W1sxMDRdLDI1Nl0sMTE5OTQ2OltbMTA1XSwyNTZdLDExOTk0NzpbWzEwNl0sMjU2XSwxMTk5NDg6W1sxMDddLDI1Nl0sMTE5OTQ5OltbMTA4XSwyNTZdLDExOTk1MDpbWzEwOV0sMjU2XSwxMTk5NTE6W1sxMTBdLDI1Nl0sMTE5OTUyOltbMTExXSwyNTZdLDExOTk1MzpbWzExMl0sMjU2XSwxMTk5NTQ6W1sxMTNdLDI1Nl0sMTE5OTU1OltbMTE0XSwyNTZdLDExOTk1NjpbWzExNV0sMjU2XSwxMTk5NTc6W1sxMTZdLDI1Nl0sMTE5OTU4OltbMTE3XSwyNTZdLDExOTk1OTpbWzExOF0sMjU2XSwxMTk5NjA6W1sxMTldLDI1Nl0sMTE5OTYxOltbMTIwXSwyNTZdLDExOTk2MjpbWzEyMV0sMjU2XSwxMTk5NjM6W1sxMjJdLDI1Nl0sMTE5OTY0OltbNjVdLDI1Nl0sMTE5OTY2OltbNjddLDI1Nl0sMTE5OTY3OltbNjhdLDI1Nl0sMTE5OTcwOltbNzFdLDI1Nl0sMTE5OTczOltbNzRdLDI1Nl0sMTE5OTc0OltbNzVdLDI1Nl0sMTE5OTc3OltbNzhdLDI1Nl0sMTE5OTc4OltbNzldLDI1Nl0sMTE5OTc5OltbODBdLDI1Nl0sMTE5OTgwOltbODFdLDI1Nl0sMTE5OTgyOltbODNdLDI1Nl0sMTE5OTgzOltbODRdLDI1Nl0sMTE5OTg0OltbODVdLDI1Nl0sMTE5OTg1OltbODZdLDI1Nl0sMTE5OTg2OltbODddLDI1Nl0sMTE5OTg3OltbODhdLDI1Nl0sMTE5OTg4OltbODldLDI1Nl0sMTE5OTg5OltbOTBdLDI1Nl0sMTE5OTkwOltbOTddLDI1Nl0sMTE5OTkxOltbOThdLDI1Nl0sMTE5OTkyOltbOTldLDI1Nl0sMTE5OTkzOltbMTAwXSwyNTZdLDExOTk5NTpbWzEwMl0sMjU2XSwxMTk5OTc6W1sxMDRdLDI1Nl0sMTE5OTk4OltbMTA1XSwyNTZdLDExOTk5OTpbWzEwNl0sMjU2XSwxMjAwMDA6W1sxMDddLDI1Nl0sMTIwMDAxOltbMTA4XSwyNTZdLDEyMDAwMjpbWzEwOV0sMjU2XSwxMjAwMDM6W1sxMTBdLDI1Nl0sMTIwMDA1OltbMTEyXSwyNTZdLDEyMDAwNjpbWzExM10sMjU2XSwxMjAwMDc6W1sxMTRdLDI1Nl0sMTIwMDA4OltbMTE1XSwyNTZdLDEyMDAwOTpbWzExNl0sMjU2XSwxMjAwMTA6W1sxMTddLDI1Nl0sMTIwMDExOltbMTE4XSwyNTZdLDEyMDAxMjpbWzExOV0sMjU2XSwxMjAwMTM6W1sxMjBdLDI1Nl0sMTIwMDE0OltbMTIxXSwyNTZdLDEyMDAxNTpbWzEyMl0sMjU2XSwxMjAwMTY6W1s2NV0sMjU2XSwxMjAwMTc6W1s2Nl0sMjU2XSwxMjAwMTg6W1s2N10sMjU2XSwxMjAwMTk6W1s2OF0sMjU2XSwxMjAwMjA6W1s2OV0sMjU2XSwxMjAwMjE6W1s3MF0sMjU2XSwxMjAwMjI6W1s3MV0sMjU2XSwxMjAwMjM6W1s3Ml0sMjU2XSwxMjAwMjQ6W1s3M10sMjU2XSwxMjAwMjU6W1s3NF0sMjU2XSwxMjAwMjY6W1s3NV0sMjU2XSwxMjAwMjc6W1s3Nl0sMjU2XSwxMjAwMjg6W1s3N10sMjU2XSwxMjAwMjk6W1s3OF0sMjU2XSwxMjAwMzA6W1s3OV0sMjU2XSwxMjAwMzE6W1s4MF0sMjU2XSwxMjAwMzI6W1s4MV0sMjU2XSwxMjAwMzM6W1s4Ml0sMjU2XSwxMjAwMzQ6W1s4M10sMjU2XSwxMjAwMzU6W1s4NF0sMjU2XSwxMjAwMzY6W1s4NV0sMjU2XSwxMjAwMzc6W1s4Nl0sMjU2XSwxMjAwMzg6W1s4N10sMjU2XSwxMjAwMzk6W1s4OF0sMjU2XSwxMjAwNDA6W1s4OV0sMjU2XSwxMjAwNDE6W1s5MF0sMjU2XSwxMjAwNDI6W1s5N10sMjU2XSwxMjAwNDM6W1s5OF0sMjU2XSwxMjAwNDQ6W1s5OV0sMjU2XSwxMjAwNDU6W1sxMDBdLDI1Nl0sMTIwMDQ2OltbMTAxXSwyNTZdLDEyMDA0NzpbWzEwMl0sMjU2XSwxMjAwNDg6W1sxMDNdLDI1Nl0sMTIwMDQ5OltbMTA0XSwyNTZdLDEyMDA1MDpbWzEwNV0sMjU2XSwxMjAwNTE6W1sxMDZdLDI1Nl0sMTIwMDUyOltbMTA3XSwyNTZdLDEyMDA1MzpbWzEwOF0sMjU2XSwxMjAwNTQ6W1sxMDldLDI1Nl0sMTIwMDU1OltbMTEwXSwyNTZdLDEyMDA1NjpbWzExMV0sMjU2XSwxMjAwNTc6W1sxMTJdLDI1Nl0sMTIwMDU4OltbMTEzXSwyNTZdLDEyMDA1OTpbWzExNF0sMjU2XSwxMjAwNjA6W1sxMTVdLDI1Nl0sMTIwMDYxOltbMTE2XSwyNTZdLDEyMDA2MjpbWzExN10sMjU2XSwxMjAwNjM6W1sxMThdLDI1Nl19LFxuNTQ1Mjg6ezEyMDA2NDpbWzExOV0sMjU2XSwxMjAwNjU6W1sxMjBdLDI1Nl0sMTIwMDY2OltbMTIxXSwyNTZdLDEyMDA2NzpbWzEyMl0sMjU2XSwxMjAwNjg6W1s2NV0sMjU2XSwxMjAwNjk6W1s2Nl0sMjU2XSwxMjAwNzE6W1s2OF0sMjU2XSwxMjAwNzI6W1s2OV0sMjU2XSwxMjAwNzM6W1s3MF0sMjU2XSwxMjAwNzQ6W1s3MV0sMjU2XSwxMjAwNzc6W1s3NF0sMjU2XSwxMjAwNzg6W1s3NV0sMjU2XSwxMjAwNzk6W1s3Nl0sMjU2XSwxMjAwODA6W1s3N10sMjU2XSwxMjAwODE6W1s3OF0sMjU2XSwxMjAwODI6W1s3OV0sMjU2XSwxMjAwODM6W1s4MF0sMjU2XSwxMjAwODQ6W1s4MV0sMjU2XSwxMjAwODY6W1s4M10sMjU2XSwxMjAwODc6W1s4NF0sMjU2XSwxMjAwODg6W1s4NV0sMjU2XSwxMjAwODk6W1s4Nl0sMjU2XSwxMjAwOTA6W1s4N10sMjU2XSwxMjAwOTE6W1s4OF0sMjU2XSwxMjAwOTI6W1s4OV0sMjU2XSwxMjAwOTQ6W1s5N10sMjU2XSwxMjAwOTU6W1s5OF0sMjU2XSwxMjAwOTY6W1s5OV0sMjU2XSwxMjAwOTc6W1sxMDBdLDI1Nl0sMTIwMDk4OltbMTAxXSwyNTZdLDEyMDA5OTpbWzEwMl0sMjU2XSwxMjAxMDA6W1sxMDNdLDI1Nl0sMTIwMTAxOltbMTA0XSwyNTZdLDEyMDEwMjpbWzEwNV0sMjU2XSwxMjAxMDM6W1sxMDZdLDI1Nl0sMTIwMTA0OltbMTA3XSwyNTZdLDEyMDEwNTpbWzEwOF0sMjU2XSwxMjAxMDY6W1sxMDldLDI1Nl0sMTIwMTA3OltbMTEwXSwyNTZdLDEyMDEwODpbWzExMV0sMjU2XSwxMjAxMDk6W1sxMTJdLDI1Nl0sMTIwMTEwOltbMTEzXSwyNTZdLDEyMDExMTpbWzExNF0sMjU2XSwxMjAxMTI6W1sxMTVdLDI1Nl0sMTIwMTEzOltbMTE2XSwyNTZdLDEyMDExNDpbWzExN10sMjU2XSwxMjAxMTU6W1sxMThdLDI1Nl0sMTIwMTE2OltbMTE5XSwyNTZdLDEyMDExNzpbWzEyMF0sMjU2XSwxMjAxMTg6W1sxMjFdLDI1Nl0sMTIwMTE5OltbMTIyXSwyNTZdLDEyMDEyMDpbWzY1XSwyNTZdLDEyMDEyMTpbWzY2XSwyNTZdLDEyMDEyMzpbWzY4XSwyNTZdLDEyMDEyNDpbWzY5XSwyNTZdLDEyMDEyNTpbWzcwXSwyNTZdLDEyMDEyNjpbWzcxXSwyNTZdLDEyMDEyODpbWzczXSwyNTZdLDEyMDEyOTpbWzc0XSwyNTZdLDEyMDEzMDpbWzc1XSwyNTZdLDEyMDEzMTpbWzc2XSwyNTZdLDEyMDEzMjpbWzc3XSwyNTZdLDEyMDEzNDpbWzc5XSwyNTZdLDEyMDEzODpbWzgzXSwyNTZdLDEyMDEzOTpbWzg0XSwyNTZdLDEyMDE0MDpbWzg1XSwyNTZdLDEyMDE0MTpbWzg2XSwyNTZdLDEyMDE0MjpbWzg3XSwyNTZdLDEyMDE0MzpbWzg4XSwyNTZdLDEyMDE0NDpbWzg5XSwyNTZdLDEyMDE0NjpbWzk3XSwyNTZdLDEyMDE0NzpbWzk4XSwyNTZdLDEyMDE0ODpbWzk5XSwyNTZdLDEyMDE0OTpbWzEwMF0sMjU2XSwxMjAxNTA6W1sxMDFdLDI1Nl0sMTIwMTUxOltbMTAyXSwyNTZdLDEyMDE1MjpbWzEwM10sMjU2XSwxMjAxNTM6W1sxMDRdLDI1Nl0sMTIwMTU0OltbMTA1XSwyNTZdLDEyMDE1NTpbWzEwNl0sMjU2XSwxMjAxNTY6W1sxMDddLDI1Nl0sMTIwMTU3OltbMTA4XSwyNTZdLDEyMDE1ODpbWzEwOV0sMjU2XSwxMjAxNTk6W1sxMTBdLDI1Nl0sMTIwMTYwOltbMTExXSwyNTZdLDEyMDE2MTpbWzExMl0sMjU2XSwxMjAxNjI6W1sxMTNdLDI1Nl0sMTIwMTYzOltbMTE0XSwyNTZdLDEyMDE2NDpbWzExNV0sMjU2XSwxMjAxNjU6W1sxMTZdLDI1Nl0sMTIwMTY2OltbMTE3XSwyNTZdLDEyMDE2NzpbWzExOF0sMjU2XSwxMjAxNjg6W1sxMTldLDI1Nl0sMTIwMTY5OltbMTIwXSwyNTZdLDEyMDE3MDpbWzEyMV0sMjU2XSwxMjAxNzE6W1sxMjJdLDI1Nl0sMTIwMTcyOltbNjVdLDI1Nl0sMTIwMTczOltbNjZdLDI1Nl0sMTIwMTc0OltbNjddLDI1Nl0sMTIwMTc1OltbNjhdLDI1Nl0sMTIwMTc2OltbNjldLDI1Nl0sMTIwMTc3OltbNzBdLDI1Nl0sMTIwMTc4OltbNzFdLDI1Nl0sMTIwMTc5OltbNzJdLDI1Nl0sMTIwMTgwOltbNzNdLDI1Nl0sMTIwMTgxOltbNzRdLDI1Nl0sMTIwMTgyOltbNzVdLDI1Nl0sMTIwMTgzOltbNzZdLDI1Nl0sMTIwMTg0OltbNzddLDI1Nl0sMTIwMTg1OltbNzhdLDI1Nl0sMTIwMTg2OltbNzldLDI1Nl0sMTIwMTg3OltbODBdLDI1Nl0sMTIwMTg4OltbODFdLDI1Nl0sMTIwMTg5OltbODJdLDI1Nl0sMTIwMTkwOltbODNdLDI1Nl0sMTIwMTkxOltbODRdLDI1Nl0sMTIwMTkyOltbODVdLDI1Nl0sMTIwMTkzOltbODZdLDI1Nl0sMTIwMTk0OltbODddLDI1Nl0sMTIwMTk1OltbODhdLDI1Nl0sMTIwMTk2OltbODldLDI1Nl0sMTIwMTk3OltbOTBdLDI1Nl0sMTIwMTk4OltbOTddLDI1Nl0sMTIwMTk5OltbOThdLDI1Nl0sMTIwMjAwOltbOTldLDI1Nl0sMTIwMjAxOltbMTAwXSwyNTZdLDEyMDIwMjpbWzEwMV0sMjU2XSwxMjAyMDM6W1sxMDJdLDI1Nl0sMTIwMjA0OltbMTAzXSwyNTZdLDEyMDIwNTpbWzEwNF0sMjU2XSwxMjAyMDY6W1sxMDVdLDI1Nl0sMTIwMjA3OltbMTA2XSwyNTZdLDEyMDIwODpbWzEwN10sMjU2XSwxMjAyMDk6W1sxMDhdLDI1Nl0sMTIwMjEwOltbMTA5XSwyNTZdLDEyMDIxMTpbWzExMF0sMjU2XSwxMjAyMTI6W1sxMTFdLDI1Nl0sMTIwMjEzOltbMTEyXSwyNTZdLDEyMDIxNDpbWzExM10sMjU2XSwxMjAyMTU6W1sxMTRdLDI1Nl0sMTIwMjE2OltbMTE1XSwyNTZdLDEyMDIxNzpbWzExNl0sMjU2XSwxMjAyMTg6W1sxMTddLDI1Nl0sMTIwMjE5OltbMTE4XSwyNTZdLDEyMDIyMDpbWzExOV0sMjU2XSwxMjAyMjE6W1sxMjBdLDI1Nl0sMTIwMjIyOltbMTIxXSwyNTZdLDEyMDIyMzpbWzEyMl0sMjU2XSwxMjAyMjQ6W1s2NV0sMjU2XSwxMjAyMjU6W1s2Nl0sMjU2XSwxMjAyMjY6W1s2N10sMjU2XSwxMjAyMjc6W1s2OF0sMjU2XSwxMjAyMjg6W1s2OV0sMjU2XSwxMjAyMjk6W1s3MF0sMjU2XSwxMjAyMzA6W1s3MV0sMjU2XSwxMjAyMzE6W1s3Ml0sMjU2XSwxMjAyMzI6W1s3M10sMjU2XSwxMjAyMzM6W1s3NF0sMjU2XSwxMjAyMzQ6W1s3NV0sMjU2XSwxMjAyMzU6W1s3Nl0sMjU2XSwxMjAyMzY6W1s3N10sMjU2XSwxMjAyMzc6W1s3OF0sMjU2XSwxMjAyMzg6W1s3OV0sMjU2XSwxMjAyMzk6W1s4MF0sMjU2XSwxMjAyNDA6W1s4MV0sMjU2XSwxMjAyNDE6W1s4Ml0sMjU2XSwxMjAyNDI6W1s4M10sMjU2XSwxMjAyNDM6W1s4NF0sMjU2XSwxMjAyNDQ6W1s4NV0sMjU2XSwxMjAyNDU6W1s4Nl0sMjU2XSwxMjAyNDY6W1s4N10sMjU2XSwxMjAyNDc6W1s4OF0sMjU2XSwxMjAyNDg6W1s4OV0sMjU2XSwxMjAyNDk6W1s5MF0sMjU2XSwxMjAyNTA6W1s5N10sMjU2XSwxMjAyNTE6W1s5OF0sMjU2XSwxMjAyNTI6W1s5OV0sMjU2XSwxMjAyNTM6W1sxMDBdLDI1Nl0sMTIwMjU0OltbMTAxXSwyNTZdLDEyMDI1NTpbWzEwMl0sMjU2XSwxMjAyNTY6W1sxMDNdLDI1Nl0sMTIwMjU3OltbMTA0XSwyNTZdLDEyMDI1ODpbWzEwNV0sMjU2XSwxMjAyNTk6W1sxMDZdLDI1Nl0sMTIwMjYwOltbMTA3XSwyNTZdLDEyMDI2MTpbWzEwOF0sMjU2XSwxMjAyNjI6W1sxMDldLDI1Nl0sMTIwMjYzOltbMTEwXSwyNTZdLDEyMDI2NDpbWzExMV0sMjU2XSwxMjAyNjU6W1sxMTJdLDI1Nl0sMTIwMjY2OltbMTEzXSwyNTZdLDEyMDI2NzpbWzExNF0sMjU2XSwxMjAyNjg6W1sxMTVdLDI1Nl0sMTIwMjY5OltbMTE2XSwyNTZdLDEyMDI3MDpbWzExN10sMjU2XSwxMjAyNzE6W1sxMThdLDI1Nl0sMTIwMjcyOltbMTE5XSwyNTZdLDEyMDI3MzpbWzEyMF0sMjU2XSwxMjAyNzQ6W1sxMjFdLDI1Nl0sMTIwMjc1OltbMTIyXSwyNTZdLDEyMDI3NjpbWzY1XSwyNTZdLDEyMDI3NzpbWzY2XSwyNTZdLDEyMDI3ODpbWzY3XSwyNTZdLDEyMDI3OTpbWzY4XSwyNTZdLDEyMDI4MDpbWzY5XSwyNTZdLDEyMDI4MTpbWzcwXSwyNTZdLDEyMDI4MjpbWzcxXSwyNTZdLDEyMDI4MzpbWzcyXSwyNTZdLDEyMDI4NDpbWzczXSwyNTZdLDEyMDI4NTpbWzc0XSwyNTZdLDEyMDI4NjpbWzc1XSwyNTZdLDEyMDI4NzpbWzc2XSwyNTZdLDEyMDI4ODpbWzc3XSwyNTZdLDEyMDI4OTpbWzc4XSwyNTZdLDEyMDI5MDpbWzc5XSwyNTZdLDEyMDI5MTpbWzgwXSwyNTZdLDEyMDI5MjpbWzgxXSwyNTZdLDEyMDI5MzpbWzgyXSwyNTZdLDEyMDI5NDpbWzgzXSwyNTZdLDEyMDI5NTpbWzg0XSwyNTZdLDEyMDI5NjpbWzg1XSwyNTZdLDEyMDI5NzpbWzg2XSwyNTZdLDEyMDI5ODpbWzg3XSwyNTZdLDEyMDI5OTpbWzg4XSwyNTZdLDEyMDMwMDpbWzg5XSwyNTZdLDEyMDMwMTpbWzkwXSwyNTZdLDEyMDMwMjpbWzk3XSwyNTZdLDEyMDMwMzpbWzk4XSwyNTZdLDEyMDMwNDpbWzk5XSwyNTZdLDEyMDMwNTpbWzEwMF0sMjU2XSwxMjAzMDY6W1sxMDFdLDI1Nl0sMTIwMzA3OltbMTAyXSwyNTZdLDEyMDMwODpbWzEwM10sMjU2XSwxMjAzMDk6W1sxMDRdLDI1Nl0sMTIwMzEwOltbMTA1XSwyNTZdLDEyMDMxMTpbWzEwNl0sMjU2XSwxMjAzMTI6W1sxMDddLDI1Nl0sMTIwMzEzOltbMTA4XSwyNTZdLDEyMDMxNDpbWzEwOV0sMjU2XSwxMjAzMTU6W1sxMTBdLDI1Nl0sMTIwMzE2OltbMTExXSwyNTZdLDEyMDMxNzpbWzExMl0sMjU2XSwxMjAzMTg6W1sxMTNdLDI1Nl0sMTIwMzE5OltbMTE0XSwyNTZdfSxcbjU0Nzg0OnsxMjAzMjA6W1sxMTVdLDI1Nl0sMTIwMzIxOltbMTE2XSwyNTZdLDEyMDMyMjpbWzExN10sMjU2XSwxMjAzMjM6W1sxMThdLDI1Nl0sMTIwMzI0OltbMTE5XSwyNTZdLDEyMDMyNTpbWzEyMF0sMjU2XSwxMjAzMjY6W1sxMjFdLDI1Nl0sMTIwMzI3OltbMTIyXSwyNTZdLDEyMDMyODpbWzY1XSwyNTZdLDEyMDMyOTpbWzY2XSwyNTZdLDEyMDMzMDpbWzY3XSwyNTZdLDEyMDMzMTpbWzY4XSwyNTZdLDEyMDMzMjpbWzY5XSwyNTZdLDEyMDMzMzpbWzcwXSwyNTZdLDEyMDMzNDpbWzcxXSwyNTZdLDEyMDMzNTpbWzcyXSwyNTZdLDEyMDMzNjpbWzczXSwyNTZdLDEyMDMzNzpbWzc0XSwyNTZdLDEyMDMzODpbWzc1XSwyNTZdLDEyMDMzOTpbWzc2XSwyNTZdLDEyMDM0MDpbWzc3XSwyNTZdLDEyMDM0MTpbWzc4XSwyNTZdLDEyMDM0MjpbWzc5XSwyNTZdLDEyMDM0MzpbWzgwXSwyNTZdLDEyMDM0NDpbWzgxXSwyNTZdLDEyMDM0NTpbWzgyXSwyNTZdLDEyMDM0NjpbWzgzXSwyNTZdLDEyMDM0NzpbWzg0XSwyNTZdLDEyMDM0ODpbWzg1XSwyNTZdLDEyMDM0OTpbWzg2XSwyNTZdLDEyMDM1MDpbWzg3XSwyNTZdLDEyMDM1MTpbWzg4XSwyNTZdLDEyMDM1MjpbWzg5XSwyNTZdLDEyMDM1MzpbWzkwXSwyNTZdLDEyMDM1NDpbWzk3XSwyNTZdLDEyMDM1NTpbWzk4XSwyNTZdLDEyMDM1NjpbWzk5XSwyNTZdLDEyMDM1NzpbWzEwMF0sMjU2XSwxMjAzNTg6W1sxMDFdLDI1Nl0sMTIwMzU5OltbMTAyXSwyNTZdLDEyMDM2MDpbWzEwM10sMjU2XSwxMjAzNjE6W1sxMDRdLDI1Nl0sMTIwMzYyOltbMTA1XSwyNTZdLDEyMDM2MzpbWzEwNl0sMjU2XSwxMjAzNjQ6W1sxMDddLDI1Nl0sMTIwMzY1OltbMTA4XSwyNTZdLDEyMDM2NjpbWzEwOV0sMjU2XSwxMjAzNjc6W1sxMTBdLDI1Nl0sMTIwMzY4OltbMTExXSwyNTZdLDEyMDM2OTpbWzExMl0sMjU2XSwxMjAzNzA6W1sxMTNdLDI1Nl0sMTIwMzcxOltbMTE0XSwyNTZdLDEyMDM3MjpbWzExNV0sMjU2XSwxMjAzNzM6W1sxMTZdLDI1Nl0sMTIwMzc0OltbMTE3XSwyNTZdLDEyMDM3NTpbWzExOF0sMjU2XSwxMjAzNzY6W1sxMTldLDI1Nl0sMTIwMzc3OltbMTIwXSwyNTZdLDEyMDM3ODpbWzEyMV0sMjU2XSwxMjAzNzk6W1sxMjJdLDI1Nl0sMTIwMzgwOltbNjVdLDI1Nl0sMTIwMzgxOltbNjZdLDI1Nl0sMTIwMzgyOltbNjddLDI1Nl0sMTIwMzgzOltbNjhdLDI1Nl0sMTIwMzg0OltbNjldLDI1Nl0sMTIwMzg1OltbNzBdLDI1Nl0sMTIwMzg2OltbNzFdLDI1Nl0sMTIwMzg3OltbNzJdLDI1Nl0sMTIwMzg4OltbNzNdLDI1Nl0sMTIwMzg5OltbNzRdLDI1Nl0sMTIwMzkwOltbNzVdLDI1Nl0sMTIwMzkxOltbNzZdLDI1Nl0sMTIwMzkyOltbNzddLDI1Nl0sMTIwMzkzOltbNzhdLDI1Nl0sMTIwMzk0OltbNzldLDI1Nl0sMTIwMzk1OltbODBdLDI1Nl0sMTIwMzk2OltbODFdLDI1Nl0sMTIwMzk3OltbODJdLDI1Nl0sMTIwMzk4OltbODNdLDI1Nl0sMTIwMzk5OltbODRdLDI1Nl0sMTIwNDAwOltbODVdLDI1Nl0sMTIwNDAxOltbODZdLDI1Nl0sMTIwNDAyOltbODddLDI1Nl0sMTIwNDAzOltbODhdLDI1Nl0sMTIwNDA0OltbODldLDI1Nl0sMTIwNDA1OltbOTBdLDI1Nl0sMTIwNDA2OltbOTddLDI1Nl0sMTIwNDA3OltbOThdLDI1Nl0sMTIwNDA4OltbOTldLDI1Nl0sMTIwNDA5OltbMTAwXSwyNTZdLDEyMDQxMDpbWzEwMV0sMjU2XSwxMjA0MTE6W1sxMDJdLDI1Nl0sMTIwNDEyOltbMTAzXSwyNTZdLDEyMDQxMzpbWzEwNF0sMjU2XSwxMjA0MTQ6W1sxMDVdLDI1Nl0sMTIwNDE1OltbMTA2XSwyNTZdLDEyMDQxNjpbWzEwN10sMjU2XSwxMjA0MTc6W1sxMDhdLDI1Nl0sMTIwNDE4OltbMTA5XSwyNTZdLDEyMDQxOTpbWzExMF0sMjU2XSwxMjA0MjA6W1sxMTFdLDI1Nl0sMTIwNDIxOltbMTEyXSwyNTZdLDEyMDQyMjpbWzExM10sMjU2XSwxMjA0MjM6W1sxMTRdLDI1Nl0sMTIwNDI0OltbMTE1XSwyNTZdLDEyMDQyNTpbWzExNl0sMjU2XSwxMjA0MjY6W1sxMTddLDI1Nl0sMTIwNDI3OltbMTE4XSwyNTZdLDEyMDQyODpbWzExOV0sMjU2XSwxMjA0Mjk6W1sxMjBdLDI1Nl0sMTIwNDMwOltbMTIxXSwyNTZdLDEyMDQzMTpbWzEyMl0sMjU2XSwxMjA0MzI6W1s2NV0sMjU2XSwxMjA0MzM6W1s2Nl0sMjU2XSwxMjA0MzQ6W1s2N10sMjU2XSwxMjA0MzU6W1s2OF0sMjU2XSwxMjA0MzY6W1s2OV0sMjU2XSwxMjA0Mzc6W1s3MF0sMjU2XSwxMjA0Mzg6W1s3MV0sMjU2XSwxMjA0Mzk6W1s3Ml0sMjU2XSwxMjA0NDA6W1s3M10sMjU2XSwxMjA0NDE6W1s3NF0sMjU2XSwxMjA0NDI6W1s3NV0sMjU2XSwxMjA0NDM6W1s3Nl0sMjU2XSwxMjA0NDQ6W1s3N10sMjU2XSwxMjA0NDU6W1s3OF0sMjU2XSwxMjA0NDY6W1s3OV0sMjU2XSwxMjA0NDc6W1s4MF0sMjU2XSwxMjA0NDg6W1s4MV0sMjU2XSwxMjA0NDk6W1s4Ml0sMjU2XSwxMjA0NTA6W1s4M10sMjU2XSwxMjA0NTE6W1s4NF0sMjU2XSwxMjA0NTI6W1s4NV0sMjU2XSwxMjA0NTM6W1s4Nl0sMjU2XSwxMjA0NTQ6W1s4N10sMjU2XSwxMjA0NTU6W1s4OF0sMjU2XSwxMjA0NTY6W1s4OV0sMjU2XSwxMjA0NTc6W1s5MF0sMjU2XSwxMjA0NTg6W1s5N10sMjU2XSwxMjA0NTk6W1s5OF0sMjU2XSwxMjA0NjA6W1s5OV0sMjU2XSwxMjA0NjE6W1sxMDBdLDI1Nl0sMTIwNDYyOltbMTAxXSwyNTZdLDEyMDQ2MzpbWzEwMl0sMjU2XSwxMjA0NjQ6W1sxMDNdLDI1Nl0sMTIwNDY1OltbMTA0XSwyNTZdLDEyMDQ2NjpbWzEwNV0sMjU2XSwxMjA0Njc6W1sxMDZdLDI1Nl0sMTIwNDY4OltbMTA3XSwyNTZdLDEyMDQ2OTpbWzEwOF0sMjU2XSwxMjA0NzA6W1sxMDldLDI1Nl0sMTIwNDcxOltbMTEwXSwyNTZdLDEyMDQ3MjpbWzExMV0sMjU2XSwxMjA0NzM6W1sxMTJdLDI1Nl0sMTIwNDc0OltbMTEzXSwyNTZdLDEyMDQ3NTpbWzExNF0sMjU2XSwxMjA0NzY6W1sxMTVdLDI1Nl0sMTIwNDc3OltbMTE2XSwyNTZdLDEyMDQ3ODpbWzExN10sMjU2XSwxMjA0Nzk6W1sxMThdLDI1Nl0sMTIwNDgwOltbMTE5XSwyNTZdLDEyMDQ4MTpbWzEyMF0sMjU2XSwxMjA0ODI6W1sxMjFdLDI1Nl0sMTIwNDgzOltbMTIyXSwyNTZdLDEyMDQ4NDpbWzMwNV0sMjU2XSwxMjA0ODU6W1s1NjddLDI1Nl0sMTIwNDg4OltbOTEzXSwyNTZdLDEyMDQ4OTpbWzkxNF0sMjU2XSwxMjA0OTA6W1s5MTVdLDI1Nl0sMTIwNDkxOltbOTE2XSwyNTZdLDEyMDQ5MjpbWzkxN10sMjU2XSwxMjA0OTM6W1s5MThdLDI1Nl0sMTIwNDk0OltbOTE5XSwyNTZdLDEyMDQ5NTpbWzkyMF0sMjU2XSwxMjA0OTY6W1s5MjFdLDI1Nl0sMTIwNDk3OltbOTIyXSwyNTZdLDEyMDQ5ODpbWzkyM10sMjU2XSwxMjA0OTk6W1s5MjRdLDI1Nl0sMTIwNTAwOltbOTI1XSwyNTZdLDEyMDUwMTpbWzkyNl0sMjU2XSwxMjA1MDI6W1s5MjddLDI1Nl0sMTIwNTAzOltbOTI4XSwyNTZdLDEyMDUwNDpbWzkyOV0sMjU2XSwxMjA1MDU6W1sxMDEyXSwyNTZdLDEyMDUwNjpbWzkzMV0sMjU2XSwxMjA1MDc6W1s5MzJdLDI1Nl0sMTIwNTA4OltbOTMzXSwyNTZdLDEyMDUwOTpbWzkzNF0sMjU2XSwxMjA1MTA6W1s5MzVdLDI1Nl0sMTIwNTExOltbOTM2XSwyNTZdLDEyMDUxMjpbWzkzN10sMjU2XSwxMjA1MTM6W1s4NzExXSwyNTZdLDEyMDUxNDpbWzk0NV0sMjU2XSwxMjA1MTU6W1s5NDZdLDI1Nl0sMTIwNTE2OltbOTQ3XSwyNTZdLDEyMDUxNzpbWzk0OF0sMjU2XSwxMjA1MTg6W1s5NDldLDI1Nl0sMTIwNTE5OltbOTUwXSwyNTZdLDEyMDUyMDpbWzk1MV0sMjU2XSwxMjA1MjE6W1s5NTJdLDI1Nl0sMTIwNTIyOltbOTUzXSwyNTZdLDEyMDUyMzpbWzk1NF0sMjU2XSwxMjA1MjQ6W1s5NTVdLDI1Nl0sMTIwNTI1OltbOTU2XSwyNTZdLDEyMDUyNjpbWzk1N10sMjU2XSwxMjA1Mjc6W1s5NThdLDI1Nl0sMTIwNTI4OltbOTU5XSwyNTZdLDEyMDUyOTpbWzk2MF0sMjU2XSwxMjA1MzA6W1s5NjFdLDI1Nl0sMTIwNTMxOltbOTYyXSwyNTZdLDEyMDUzMjpbWzk2M10sMjU2XSwxMjA1MzM6W1s5NjRdLDI1Nl0sMTIwNTM0OltbOTY1XSwyNTZdLDEyMDUzNTpbWzk2Nl0sMjU2XSwxMjA1MzY6W1s5NjddLDI1Nl0sMTIwNTM3OltbOTY4XSwyNTZdLDEyMDUzODpbWzk2OV0sMjU2XSwxMjA1Mzk6W1s4NzA2XSwyNTZdLDEyMDU0MDpbWzEwMTNdLDI1Nl0sMTIwNTQxOltbOTc3XSwyNTZdLDEyMDU0MjpbWzEwMDhdLDI1Nl0sMTIwNTQzOltbOTgxXSwyNTZdLDEyMDU0NDpbWzEwMDldLDI1Nl0sMTIwNTQ1OltbOTgyXSwyNTZdLDEyMDU0NjpbWzkxM10sMjU2XSwxMjA1NDc6W1s5MTRdLDI1Nl0sMTIwNTQ4OltbOTE1XSwyNTZdLDEyMDU0OTpbWzkxNl0sMjU2XSwxMjA1NTA6W1s5MTddLDI1Nl0sMTIwNTUxOltbOTE4XSwyNTZdLDEyMDU1MjpbWzkxOV0sMjU2XSwxMjA1NTM6W1s5MjBdLDI1Nl0sMTIwNTU0OltbOTIxXSwyNTZdLDEyMDU1NTpbWzkyMl0sMjU2XSwxMjA1NTY6W1s5MjNdLDI1Nl0sMTIwNTU3OltbOTI0XSwyNTZdLDEyMDU1ODpbWzkyNV0sMjU2XSwxMjA1NTk6W1s5MjZdLDI1Nl0sMTIwNTYwOltbOTI3XSwyNTZdLDEyMDU2MTpbWzkyOF0sMjU2XSwxMjA1NjI6W1s5MjldLDI1Nl0sMTIwNTYzOltbMTAxMl0sMjU2XSwxMjA1NjQ6W1s5MzFdLDI1Nl0sMTIwNTY1OltbOTMyXSwyNTZdLDEyMDU2NjpbWzkzM10sMjU2XSwxMjA1Njc6W1s5MzRdLDI1Nl0sMTIwNTY4OltbOTM1XSwyNTZdLDEyMDU2OTpbWzkzNl0sMjU2XSwxMjA1NzA6W1s5MzddLDI1Nl0sMTIwNTcxOltbODcxMV0sMjU2XSwxMjA1NzI6W1s5NDVdLDI1Nl0sMTIwNTczOltbOTQ2XSwyNTZdLDEyMDU3NDpbWzk0N10sMjU2XSwxMjA1NzU6W1s5NDhdLDI1Nl19LFxuNTUwNDA6ezEyMDU3NjpbWzk0OV0sMjU2XSwxMjA1Nzc6W1s5NTBdLDI1Nl0sMTIwNTc4OltbOTUxXSwyNTZdLDEyMDU3OTpbWzk1Ml0sMjU2XSwxMjA1ODA6W1s5NTNdLDI1Nl0sMTIwNTgxOltbOTU0XSwyNTZdLDEyMDU4MjpbWzk1NV0sMjU2XSwxMjA1ODM6W1s5NTZdLDI1Nl0sMTIwNTg0OltbOTU3XSwyNTZdLDEyMDU4NTpbWzk1OF0sMjU2XSwxMjA1ODY6W1s5NTldLDI1Nl0sMTIwNTg3OltbOTYwXSwyNTZdLDEyMDU4ODpbWzk2MV0sMjU2XSwxMjA1ODk6W1s5NjJdLDI1Nl0sMTIwNTkwOltbOTYzXSwyNTZdLDEyMDU5MTpbWzk2NF0sMjU2XSwxMjA1OTI6W1s5NjVdLDI1Nl0sMTIwNTkzOltbOTY2XSwyNTZdLDEyMDU5NDpbWzk2N10sMjU2XSwxMjA1OTU6W1s5NjhdLDI1Nl0sMTIwNTk2OltbOTY5XSwyNTZdLDEyMDU5NzpbWzg3MDZdLDI1Nl0sMTIwNTk4OltbMTAxM10sMjU2XSwxMjA1OTk6W1s5NzddLDI1Nl0sMTIwNjAwOltbMTAwOF0sMjU2XSwxMjA2MDE6W1s5ODFdLDI1Nl0sMTIwNjAyOltbMTAwOV0sMjU2XSwxMjA2MDM6W1s5ODJdLDI1Nl0sMTIwNjA0OltbOTEzXSwyNTZdLDEyMDYwNTpbWzkxNF0sMjU2XSwxMjA2MDY6W1s5MTVdLDI1Nl0sMTIwNjA3OltbOTE2XSwyNTZdLDEyMDYwODpbWzkxN10sMjU2XSwxMjA2MDk6W1s5MThdLDI1Nl0sMTIwNjEwOltbOTE5XSwyNTZdLDEyMDYxMTpbWzkyMF0sMjU2XSwxMjA2MTI6W1s5MjFdLDI1Nl0sMTIwNjEzOltbOTIyXSwyNTZdLDEyMDYxNDpbWzkyM10sMjU2XSwxMjA2MTU6W1s5MjRdLDI1Nl0sMTIwNjE2OltbOTI1XSwyNTZdLDEyMDYxNzpbWzkyNl0sMjU2XSwxMjA2MTg6W1s5MjddLDI1Nl0sMTIwNjE5OltbOTI4XSwyNTZdLDEyMDYyMDpbWzkyOV0sMjU2XSwxMjA2MjE6W1sxMDEyXSwyNTZdLDEyMDYyMjpbWzkzMV0sMjU2XSwxMjA2MjM6W1s5MzJdLDI1Nl0sMTIwNjI0OltbOTMzXSwyNTZdLDEyMDYyNTpbWzkzNF0sMjU2XSwxMjA2MjY6W1s5MzVdLDI1Nl0sMTIwNjI3OltbOTM2XSwyNTZdLDEyMDYyODpbWzkzN10sMjU2XSwxMjA2Mjk6W1s4NzExXSwyNTZdLDEyMDYzMDpbWzk0NV0sMjU2XSwxMjA2MzE6W1s5NDZdLDI1Nl0sMTIwNjMyOltbOTQ3XSwyNTZdLDEyMDYzMzpbWzk0OF0sMjU2XSwxMjA2MzQ6W1s5NDldLDI1Nl0sMTIwNjM1OltbOTUwXSwyNTZdLDEyMDYzNjpbWzk1MV0sMjU2XSwxMjA2Mzc6W1s5NTJdLDI1Nl0sMTIwNjM4OltbOTUzXSwyNTZdLDEyMDYzOTpbWzk1NF0sMjU2XSwxMjA2NDA6W1s5NTVdLDI1Nl0sMTIwNjQxOltbOTU2XSwyNTZdLDEyMDY0MjpbWzk1N10sMjU2XSwxMjA2NDM6W1s5NThdLDI1Nl0sMTIwNjQ0OltbOTU5XSwyNTZdLDEyMDY0NTpbWzk2MF0sMjU2XSwxMjA2NDY6W1s5NjFdLDI1Nl0sMTIwNjQ3OltbOTYyXSwyNTZdLDEyMDY0ODpbWzk2M10sMjU2XSwxMjA2NDk6W1s5NjRdLDI1Nl0sMTIwNjUwOltbOTY1XSwyNTZdLDEyMDY1MTpbWzk2Nl0sMjU2XSwxMjA2NTI6W1s5NjddLDI1Nl0sMTIwNjUzOltbOTY4XSwyNTZdLDEyMDY1NDpbWzk2OV0sMjU2XSwxMjA2NTU6W1s4NzA2XSwyNTZdLDEyMDY1NjpbWzEwMTNdLDI1Nl0sMTIwNjU3OltbOTc3XSwyNTZdLDEyMDY1ODpbWzEwMDhdLDI1Nl0sMTIwNjU5OltbOTgxXSwyNTZdLDEyMDY2MDpbWzEwMDldLDI1Nl0sMTIwNjYxOltbOTgyXSwyNTZdLDEyMDY2MjpbWzkxM10sMjU2XSwxMjA2NjM6W1s5MTRdLDI1Nl0sMTIwNjY0OltbOTE1XSwyNTZdLDEyMDY2NTpbWzkxNl0sMjU2XSwxMjA2NjY6W1s5MTddLDI1Nl0sMTIwNjY3OltbOTE4XSwyNTZdLDEyMDY2ODpbWzkxOV0sMjU2XSwxMjA2Njk6W1s5MjBdLDI1Nl0sMTIwNjcwOltbOTIxXSwyNTZdLDEyMDY3MTpbWzkyMl0sMjU2XSwxMjA2NzI6W1s5MjNdLDI1Nl0sMTIwNjczOltbOTI0XSwyNTZdLDEyMDY3NDpbWzkyNV0sMjU2XSwxMjA2NzU6W1s5MjZdLDI1Nl0sMTIwNjc2OltbOTI3XSwyNTZdLDEyMDY3NzpbWzkyOF0sMjU2XSwxMjA2Nzg6W1s5MjldLDI1Nl0sMTIwNjc5OltbMTAxMl0sMjU2XSwxMjA2ODA6W1s5MzFdLDI1Nl0sMTIwNjgxOltbOTMyXSwyNTZdLDEyMDY4MjpbWzkzM10sMjU2XSwxMjA2ODM6W1s5MzRdLDI1Nl0sMTIwNjg0OltbOTM1XSwyNTZdLDEyMDY4NTpbWzkzNl0sMjU2XSwxMjA2ODY6W1s5MzddLDI1Nl0sMTIwNjg3OltbODcxMV0sMjU2XSwxMjA2ODg6W1s5NDVdLDI1Nl0sMTIwNjg5OltbOTQ2XSwyNTZdLDEyMDY5MDpbWzk0N10sMjU2XSwxMjA2OTE6W1s5NDhdLDI1Nl0sMTIwNjkyOltbOTQ5XSwyNTZdLDEyMDY5MzpbWzk1MF0sMjU2XSwxMjA2OTQ6W1s5NTFdLDI1Nl0sMTIwNjk1OltbOTUyXSwyNTZdLDEyMDY5NjpbWzk1M10sMjU2XSwxMjA2OTc6W1s5NTRdLDI1Nl0sMTIwNjk4OltbOTU1XSwyNTZdLDEyMDY5OTpbWzk1Nl0sMjU2XSwxMjA3MDA6W1s5NTddLDI1Nl0sMTIwNzAxOltbOTU4XSwyNTZdLDEyMDcwMjpbWzk1OV0sMjU2XSwxMjA3MDM6W1s5NjBdLDI1Nl0sMTIwNzA0OltbOTYxXSwyNTZdLDEyMDcwNTpbWzk2Ml0sMjU2XSwxMjA3MDY6W1s5NjNdLDI1Nl0sMTIwNzA3OltbOTY0XSwyNTZdLDEyMDcwODpbWzk2NV0sMjU2XSwxMjA3MDk6W1s5NjZdLDI1Nl0sMTIwNzEwOltbOTY3XSwyNTZdLDEyMDcxMTpbWzk2OF0sMjU2XSwxMjA3MTI6W1s5NjldLDI1Nl0sMTIwNzEzOltbODcwNl0sMjU2XSwxMjA3MTQ6W1sxMDEzXSwyNTZdLDEyMDcxNTpbWzk3N10sMjU2XSwxMjA3MTY6W1sxMDA4XSwyNTZdLDEyMDcxNzpbWzk4MV0sMjU2XSwxMjA3MTg6W1sxMDA5XSwyNTZdLDEyMDcxOTpbWzk4Ml0sMjU2XSwxMjA3MjA6W1s5MTNdLDI1Nl0sMTIwNzIxOltbOTE0XSwyNTZdLDEyMDcyMjpbWzkxNV0sMjU2XSwxMjA3MjM6W1s5MTZdLDI1Nl0sMTIwNzI0OltbOTE3XSwyNTZdLDEyMDcyNTpbWzkxOF0sMjU2XSwxMjA3MjY6W1s5MTldLDI1Nl0sMTIwNzI3OltbOTIwXSwyNTZdLDEyMDcyODpbWzkyMV0sMjU2XSwxMjA3Mjk6W1s5MjJdLDI1Nl0sMTIwNzMwOltbOTIzXSwyNTZdLDEyMDczMTpbWzkyNF0sMjU2XSwxMjA3MzI6W1s5MjVdLDI1Nl0sMTIwNzMzOltbOTI2XSwyNTZdLDEyMDczNDpbWzkyN10sMjU2XSwxMjA3MzU6W1s5MjhdLDI1Nl0sMTIwNzM2OltbOTI5XSwyNTZdLDEyMDczNzpbWzEwMTJdLDI1Nl0sMTIwNzM4OltbOTMxXSwyNTZdLDEyMDczOTpbWzkzMl0sMjU2XSwxMjA3NDA6W1s5MzNdLDI1Nl0sMTIwNzQxOltbOTM0XSwyNTZdLDEyMDc0MjpbWzkzNV0sMjU2XSwxMjA3NDM6W1s5MzZdLDI1Nl0sMTIwNzQ0OltbOTM3XSwyNTZdLDEyMDc0NTpbWzg3MTFdLDI1Nl0sMTIwNzQ2OltbOTQ1XSwyNTZdLDEyMDc0NzpbWzk0Nl0sMjU2XSwxMjA3NDg6W1s5NDddLDI1Nl0sMTIwNzQ5OltbOTQ4XSwyNTZdLDEyMDc1MDpbWzk0OV0sMjU2XSwxMjA3NTE6W1s5NTBdLDI1Nl0sMTIwNzUyOltbOTUxXSwyNTZdLDEyMDc1MzpbWzk1Ml0sMjU2XSwxMjA3NTQ6W1s5NTNdLDI1Nl0sMTIwNzU1OltbOTU0XSwyNTZdLDEyMDc1NjpbWzk1NV0sMjU2XSwxMjA3NTc6W1s5NTZdLDI1Nl0sMTIwNzU4OltbOTU3XSwyNTZdLDEyMDc1OTpbWzk1OF0sMjU2XSwxMjA3NjA6W1s5NTldLDI1Nl0sMTIwNzYxOltbOTYwXSwyNTZdLDEyMDc2MjpbWzk2MV0sMjU2XSwxMjA3NjM6W1s5NjJdLDI1Nl0sMTIwNzY0OltbOTYzXSwyNTZdLDEyMDc2NTpbWzk2NF0sMjU2XSwxMjA3NjY6W1s5NjVdLDI1Nl0sMTIwNzY3OltbOTY2XSwyNTZdLDEyMDc2ODpbWzk2N10sMjU2XSwxMjA3Njk6W1s5NjhdLDI1Nl0sMTIwNzcwOltbOTY5XSwyNTZdLDEyMDc3MTpbWzg3MDZdLDI1Nl0sMTIwNzcyOltbMTAxM10sMjU2XSwxMjA3NzM6W1s5NzddLDI1Nl0sMTIwNzc0OltbMTAwOF0sMjU2XSwxMjA3NzU6W1s5ODFdLDI1Nl0sMTIwNzc2OltbMTAwOV0sMjU2XSwxMjA3Nzc6W1s5ODJdLDI1Nl0sMTIwNzc4OltbOTg4XSwyNTZdLDEyMDc3OTpbWzk4OV0sMjU2XSwxMjA3ODI6W1s0OF0sMjU2XSwxMjA3ODM6W1s0OV0sMjU2XSwxMjA3ODQ6W1s1MF0sMjU2XSwxMjA3ODU6W1s1MV0sMjU2XSwxMjA3ODY6W1s1Ml0sMjU2XSwxMjA3ODc6W1s1M10sMjU2XSwxMjA3ODg6W1s1NF0sMjU2XSwxMjA3ODk6W1s1NV0sMjU2XSwxMjA3OTA6W1s1Nl0sMjU2XSwxMjA3OTE6W1s1N10sMjU2XSwxMjA3OTI6W1s0OF0sMjU2XSwxMjA3OTM6W1s0OV0sMjU2XSwxMjA3OTQ6W1s1MF0sMjU2XSwxMjA3OTU6W1s1MV0sMjU2XSwxMjA3OTY6W1s1Ml0sMjU2XSwxMjA3OTc6W1s1M10sMjU2XSwxMjA3OTg6W1s1NF0sMjU2XSwxMjA3OTk6W1s1NV0sMjU2XSwxMjA4MDA6W1s1Nl0sMjU2XSwxMjA4MDE6W1s1N10sMjU2XSwxMjA4MDI6W1s0OF0sMjU2XSwxMjA4MDM6W1s0OV0sMjU2XSwxMjA4MDQ6W1s1MF0sMjU2XSwxMjA4MDU6W1s1MV0sMjU2XSwxMjA4MDY6W1s1Ml0sMjU2XSwxMjA4MDc6W1s1M10sMjU2XSwxMjA4MDg6W1s1NF0sMjU2XSwxMjA4MDk6W1s1NV0sMjU2XSwxMjA4MTA6W1s1Nl0sMjU2XSwxMjA4MTE6W1s1N10sMjU2XSwxMjA4MTI6W1s0OF0sMjU2XSwxMjA4MTM6W1s0OV0sMjU2XSwxMjA4MTQ6W1s1MF0sMjU2XSwxMjA4MTU6W1s1MV0sMjU2XSwxMjA4MTY6W1s1Ml0sMjU2XSwxMjA4MTc6W1s1M10sMjU2XSwxMjA4MTg6W1s1NF0sMjU2XSwxMjA4MTk6W1s1NV0sMjU2XSwxMjA4MjA6W1s1Nl0sMjU2XSwxMjA4MjE6W1s1N10sMjU2XSwxMjA4MjI6W1s0OF0sMjU2XSwxMjA4MjM6W1s0OV0sMjU2XSwxMjA4MjQ6W1s1MF0sMjU2XSwxMjA4MjU6W1s1MV0sMjU2XSwxMjA4MjY6W1s1Ml0sMjU2XSwxMjA4Mjc6W1s1M10sMjU2XSwxMjA4Mjg6W1s1NF0sMjU2XSwxMjA4Mjk6W1s1NV0sMjU2XSwxMjA4MzA6W1s1Nl0sMjU2XSwxMjA4MzE6W1s1N10sMjU2XX0sXG42MDkyODp7MTI2NDY0OltbMTU3NV0sMjU2XSwxMjY0NjU6W1sxNTc2XSwyNTZdLDEyNjQ2NjpbWzE1ODBdLDI1Nl0sMTI2NDY3OltbMTU4M10sMjU2XSwxMjY0Njk6W1sxNjA4XSwyNTZdLDEyNjQ3MDpbWzE1ODZdLDI1Nl0sMTI2NDcxOltbMTU4MV0sMjU2XSwxMjY0NzI6W1sxNTkxXSwyNTZdLDEyNjQ3MzpbWzE2MTBdLDI1Nl0sMTI2NDc0OltbMTYwM10sMjU2XSwxMjY0NzU6W1sxNjA0XSwyNTZdLDEyNjQ3NjpbWzE2MDVdLDI1Nl0sMTI2NDc3OltbMTYwNl0sMjU2XSwxMjY0Nzg6W1sxNTg3XSwyNTZdLDEyNjQ3OTpbWzE1OTNdLDI1Nl0sMTI2NDgwOltbMTYwMV0sMjU2XSwxMjY0ODE6W1sxNTg5XSwyNTZdLDEyNjQ4MjpbWzE2MDJdLDI1Nl0sMTI2NDgzOltbMTU4NV0sMjU2XSwxMjY0ODQ6W1sxNTg4XSwyNTZdLDEyNjQ4NTpbWzE1NzhdLDI1Nl0sMTI2NDg2OltbMTU3OV0sMjU2XSwxMjY0ODc6W1sxNTgyXSwyNTZdLDEyNjQ4ODpbWzE1ODRdLDI1Nl0sMTI2NDg5OltbMTU5MF0sMjU2XSwxMjY0OTA6W1sxNTkyXSwyNTZdLDEyNjQ5MTpbWzE1OTRdLDI1Nl0sMTI2NDkyOltbMTY0Nl0sMjU2XSwxMjY0OTM6W1sxNzIyXSwyNTZdLDEyNjQ5NDpbWzE2OTddLDI1Nl0sMTI2NDk1OltbMTY0N10sMjU2XSwxMjY0OTc6W1sxNTc2XSwyNTZdLDEyNjQ5ODpbWzE1ODBdLDI1Nl0sMTI2NTAwOltbMTYwN10sMjU2XSwxMjY1MDM6W1sxNTgxXSwyNTZdLDEyNjUwNTpbWzE2MTBdLDI1Nl0sMTI2NTA2OltbMTYwM10sMjU2XSwxMjY1MDc6W1sxNjA0XSwyNTZdLDEyNjUwODpbWzE2MDVdLDI1Nl0sMTI2NTA5OltbMTYwNl0sMjU2XSwxMjY1MTA6W1sxNTg3XSwyNTZdLDEyNjUxMTpbWzE1OTNdLDI1Nl0sMTI2NTEyOltbMTYwMV0sMjU2XSwxMjY1MTM6W1sxNTg5XSwyNTZdLDEyNjUxNDpbWzE2MDJdLDI1Nl0sMTI2NTE2OltbMTU4OF0sMjU2XSwxMjY1MTc6W1sxNTc4XSwyNTZdLDEyNjUxODpbWzE1NzldLDI1Nl0sMTI2NTE5OltbMTU4Ml0sMjU2XSwxMjY1MjE6W1sxNTkwXSwyNTZdLDEyNjUyMzpbWzE1OTRdLDI1Nl0sMTI2NTMwOltbMTU4MF0sMjU2XSwxMjY1MzU6W1sxNTgxXSwyNTZdLDEyNjUzNzpbWzE2MTBdLDI1Nl0sMTI2NTM5OltbMTYwNF0sMjU2XSwxMjY1NDE6W1sxNjA2XSwyNTZdLDEyNjU0MjpbWzE1ODddLDI1Nl0sMTI2NTQzOltbMTU5M10sMjU2XSwxMjY1NDU6W1sxNTg5XSwyNTZdLDEyNjU0NjpbWzE2MDJdLDI1Nl0sMTI2NTQ4OltbMTU4OF0sMjU2XSwxMjY1NTE6W1sxNTgyXSwyNTZdLDEyNjU1MzpbWzE1OTBdLDI1Nl0sMTI2NTU1OltbMTU5NF0sMjU2XSwxMjY1NTc6W1sxNzIyXSwyNTZdLDEyNjU1OTpbWzE2NDddLDI1Nl0sMTI2NTYxOltbMTU3Nl0sMjU2XSwxMjY1NjI6W1sxNTgwXSwyNTZdLDEyNjU2NDpbWzE2MDddLDI1Nl0sMTI2NTY3OltbMTU4MV0sMjU2XSwxMjY1Njg6W1sxNTkxXSwyNTZdLDEyNjU2OTpbWzE2MTBdLDI1Nl0sMTI2NTcwOltbMTYwM10sMjU2XSwxMjY1NzI6W1sxNjA1XSwyNTZdLDEyNjU3MzpbWzE2MDZdLDI1Nl0sMTI2NTc0OltbMTU4N10sMjU2XSwxMjY1NzU6W1sxNTkzXSwyNTZdLDEyNjU3NjpbWzE2MDFdLDI1Nl0sMTI2NTc3OltbMTU4OV0sMjU2XSwxMjY1Nzg6W1sxNjAyXSwyNTZdLDEyNjU4MDpbWzE1ODhdLDI1Nl0sMTI2NTgxOltbMTU3OF0sMjU2XSwxMjY1ODI6W1sxNTc5XSwyNTZdLDEyNjU4MzpbWzE1ODJdLDI1Nl0sMTI2NTg1OltbMTU5MF0sMjU2XSwxMjY1ODY6W1sxNTkyXSwyNTZdLDEyNjU4NzpbWzE1OTRdLDI1Nl0sMTI2NTg4OltbMTY0Nl0sMjU2XSwxMjY1OTA6W1sxNjk3XSwyNTZdLDEyNjU5MjpbWzE1NzVdLDI1Nl0sMTI2NTkzOltbMTU3Nl0sMjU2XSwxMjY1OTQ6W1sxNTgwXSwyNTZdLDEyNjU5NTpbWzE1ODNdLDI1Nl0sMTI2NTk2OltbMTYwN10sMjU2XSwxMjY1OTc6W1sxNjA4XSwyNTZdLDEyNjU5ODpbWzE1ODZdLDI1Nl0sMTI2NTk5OltbMTU4MV0sMjU2XSwxMjY2MDA6W1sxNTkxXSwyNTZdLDEyNjYwMTpbWzE2MTBdLDI1Nl0sMTI2NjAzOltbMTYwNF0sMjU2XSwxMjY2MDQ6W1sxNjA1XSwyNTZdLDEyNjYwNTpbWzE2MDZdLDI1Nl0sMTI2NjA2OltbMTU4N10sMjU2XSwxMjY2MDc6W1sxNTkzXSwyNTZdLDEyNjYwODpbWzE2MDFdLDI1Nl0sMTI2NjA5OltbMTU4OV0sMjU2XSwxMjY2MTA6W1sxNjAyXSwyNTZdLDEyNjYxMTpbWzE1ODVdLDI1Nl0sMTI2NjEyOltbMTU4OF0sMjU2XSwxMjY2MTM6W1sxNTc4XSwyNTZdLDEyNjYxNDpbWzE1NzldLDI1Nl0sMTI2NjE1OltbMTU4Ml0sMjU2XSwxMjY2MTY6W1sxNTg0XSwyNTZdLDEyNjYxNzpbWzE1OTBdLDI1Nl0sMTI2NjE4OltbMTU5Ml0sMjU2XSwxMjY2MTk6W1sxNTk0XSwyNTZdLDEyNjYyNTpbWzE1NzZdLDI1Nl0sMTI2NjI2OltbMTU4MF0sMjU2XSwxMjY2Mjc6W1sxNTgzXSwyNTZdLDEyNjYyOTpbWzE2MDhdLDI1Nl0sMTI2NjMwOltbMTU4Nl0sMjU2XSwxMjY2MzE6W1sxNTgxXSwyNTZdLDEyNjYzMjpbWzE1OTFdLDI1Nl0sMTI2NjMzOltbMTYxMF0sMjU2XSwxMjY2MzU6W1sxNjA0XSwyNTZdLDEyNjYzNjpbWzE2MDVdLDI1Nl0sMTI2NjM3OltbMTYwNl0sMjU2XSwxMjY2Mzg6W1sxNTg3XSwyNTZdLDEyNjYzOTpbWzE1OTNdLDI1Nl0sMTI2NjQwOltbMTYwMV0sMjU2XSwxMjY2NDE6W1sxNTg5XSwyNTZdLDEyNjY0MjpbWzE2MDJdLDI1Nl0sMTI2NjQzOltbMTU4NV0sMjU2XSwxMjY2NDQ6W1sxNTg4XSwyNTZdLDEyNjY0NTpbWzE1NzhdLDI1Nl0sMTI2NjQ2OltbMTU3OV0sMjU2XSwxMjY2NDc6W1sxNTgyXSwyNTZdLDEyNjY0ODpbWzE1ODRdLDI1Nl0sMTI2NjQ5OltbMTU5MF0sMjU2XSwxMjY2NTA6W1sxNTkyXSwyNTZdLDEyNjY1MTpbWzE1OTRdLDI1Nl19LFxuNjE2OTY6ezEyNzIzMjpbWzQ4LDQ2XSwyNTZdLDEyNzIzMzpbWzQ4LDQ0XSwyNTZdLDEyNzIzNDpbWzQ5LDQ0XSwyNTZdLDEyNzIzNTpbWzUwLDQ0XSwyNTZdLDEyNzIzNjpbWzUxLDQ0XSwyNTZdLDEyNzIzNzpbWzUyLDQ0XSwyNTZdLDEyNzIzODpbWzUzLDQ0XSwyNTZdLDEyNzIzOTpbWzU0LDQ0XSwyNTZdLDEyNzI0MDpbWzU1LDQ0XSwyNTZdLDEyNzI0MTpbWzU2LDQ0XSwyNTZdLDEyNzI0MjpbWzU3LDQ0XSwyNTZdLDEyNzI0ODpbWzQwLDY1LDQxXSwyNTZdLDEyNzI0OTpbWzQwLDY2LDQxXSwyNTZdLDEyNzI1MDpbWzQwLDY3LDQxXSwyNTZdLDEyNzI1MTpbWzQwLDY4LDQxXSwyNTZdLDEyNzI1MjpbWzQwLDY5LDQxXSwyNTZdLDEyNzI1MzpbWzQwLDcwLDQxXSwyNTZdLDEyNzI1NDpbWzQwLDcxLDQxXSwyNTZdLDEyNzI1NTpbWzQwLDcyLDQxXSwyNTZdLDEyNzI1NjpbWzQwLDczLDQxXSwyNTZdLDEyNzI1NzpbWzQwLDc0LDQxXSwyNTZdLDEyNzI1ODpbWzQwLDc1LDQxXSwyNTZdLDEyNzI1OTpbWzQwLDc2LDQxXSwyNTZdLDEyNzI2MDpbWzQwLDc3LDQxXSwyNTZdLDEyNzI2MTpbWzQwLDc4LDQxXSwyNTZdLDEyNzI2MjpbWzQwLDc5LDQxXSwyNTZdLDEyNzI2MzpbWzQwLDgwLDQxXSwyNTZdLDEyNzI2NDpbWzQwLDgxLDQxXSwyNTZdLDEyNzI2NTpbWzQwLDgyLDQxXSwyNTZdLDEyNzI2NjpbWzQwLDgzLDQxXSwyNTZdLDEyNzI2NzpbWzQwLDg0LDQxXSwyNTZdLDEyNzI2ODpbWzQwLDg1LDQxXSwyNTZdLDEyNzI2OTpbWzQwLDg2LDQxXSwyNTZdLDEyNzI3MDpbWzQwLDg3LDQxXSwyNTZdLDEyNzI3MTpbWzQwLDg4LDQxXSwyNTZdLDEyNzI3MjpbWzQwLDg5LDQxXSwyNTZdLDEyNzI3MzpbWzQwLDkwLDQxXSwyNTZdLDEyNzI3NDpbWzEyMzA4LDgzLDEyMzA5XSwyNTZdLDEyNzI3NTpbWzY3XSwyNTZdLDEyNzI3NjpbWzgyXSwyNTZdLDEyNzI3NzpbWzY3LDY4XSwyNTZdLDEyNzI3ODpbWzg3LDkwXSwyNTZdLDEyNzI4MDpbWzY1XSwyNTZdLDEyNzI4MTpbWzY2XSwyNTZdLDEyNzI4MjpbWzY3XSwyNTZdLDEyNzI4MzpbWzY4XSwyNTZdLDEyNzI4NDpbWzY5XSwyNTZdLDEyNzI4NTpbWzcwXSwyNTZdLDEyNzI4NjpbWzcxXSwyNTZdLDEyNzI4NzpbWzcyXSwyNTZdLDEyNzI4ODpbWzczXSwyNTZdLDEyNzI4OTpbWzc0XSwyNTZdLDEyNzI5MDpbWzc1XSwyNTZdLDEyNzI5MTpbWzc2XSwyNTZdLDEyNzI5MjpbWzc3XSwyNTZdLDEyNzI5MzpbWzc4XSwyNTZdLDEyNzI5NDpbWzc5XSwyNTZdLDEyNzI5NTpbWzgwXSwyNTZdLDEyNzI5NjpbWzgxXSwyNTZdLDEyNzI5NzpbWzgyXSwyNTZdLDEyNzI5ODpbWzgzXSwyNTZdLDEyNzI5OTpbWzg0XSwyNTZdLDEyNzMwMDpbWzg1XSwyNTZdLDEyNzMwMTpbWzg2XSwyNTZdLDEyNzMwMjpbWzg3XSwyNTZdLDEyNzMwMzpbWzg4XSwyNTZdLDEyNzMwNDpbWzg5XSwyNTZdLDEyNzMwNTpbWzkwXSwyNTZdLDEyNzMwNjpbWzcyLDg2XSwyNTZdLDEyNzMwNzpbWzc3LDg2XSwyNTZdLDEyNzMwODpbWzgzLDY4XSwyNTZdLDEyNzMwOTpbWzgzLDgzXSwyNTZdLDEyNzMxMDpbWzgwLDgwLDg2XSwyNTZdLDEyNzMxMTpbWzg3LDY3XSwyNTZdLDEyNzMzODpbWzc3LDY3XSwyNTZdLDEyNzMzOTpbWzc3LDY4XSwyNTZdLDEyNzM3NjpbWzY4LDc0XSwyNTZdfSxcbjYxOTUyOnsxMjc0ODg6W1sxMjQxMSwxMjM2M10sMjU2XSwxMjc0ODk6W1sxMjQ2NywxMjQ2N10sMjU2XSwxMjc0OTA6W1sxMjQ2OV0sMjU2XSwxMjc1MDQ6W1syNTE2M10sMjU2XSwxMjc1MDU6W1syMzM4M10sMjU2XSwxMjc1MDY6W1syMTQ1Ml0sMjU2XSwxMjc1MDc6W1sxMjQ4N10sMjU2XSwxMjc1MDg6W1syMDEwOF0sMjU2XSwxMjc1MDk6W1syMjgxMF0sMjU2XSwxMjc1MTA6W1szNTI5OV0sMjU2XSwxMjc1MTE6W1syMjgyNV0sMjU2XSwxMjc1MTI6W1syMDEzMl0sMjU2XSwxMjc1MTM6W1syNjE0NF0sMjU2XSwxMjc1MTQ6W1syODk2MV0sMjU2XSwxMjc1MTU6W1syNjAwOV0sMjU2XSwxMjc1MTY6W1syMTA2OV0sMjU2XSwxMjc1MTc6W1syNDQ2MF0sMjU2XSwxMjc1MTg6W1syMDg3N10sMjU2XSwxMjc1MTk6W1syNjAzMl0sMjU2XSwxMjc1MjA6W1syMTAyMV0sMjU2XSwxMjc1MjE6W1szMjA2Nl0sMjU2XSwxMjc1MjI6W1syOTk4M10sMjU2XSwxMjc1MjM6W1szNjAwOV0sMjU2XSwxMjc1MjQ6W1syMjc2OF0sMjU2XSwxMjc1MjU6W1syMTU2MV0sMjU2XSwxMjc1MjY6W1syODQzNl0sMjU2XSwxMjc1Mjc6W1syNTIzN10sMjU2XSwxMjc1Mjg6W1syNTQyOV0sMjU2XSwxMjc1Mjk6W1sxOTk2OF0sMjU2XSwxMjc1MzA6W1sxOTk3N10sMjU2XSwxMjc1MzE6W1szNjkzOF0sMjU2XSwxMjc1MzI6W1syNDAzOF0sMjU2XSwxMjc1MzM6W1syMDAxM10sMjU2XSwxMjc1MzQ6W1syMTQ5MV0sMjU2XSwxMjc1MzU6W1syNTM1MV0sMjU2XSwxMjc1MzY6W1szNjIwOF0sMjU2XSwxMjc1Mzc6W1syNTE3MV0sMjU2XSwxMjc1Mzg6W1szMTEwNV0sMjU2XSwxMjc1Mzk6W1szMTM1NF0sMjU2XSwxMjc1NDA6W1syMTUxMl0sMjU2XSwxMjc1NDE6W1syODI4OF0sMjU2XSwxMjc1NDI6W1syNjM3N10sMjU2XSwxMjc1NDM6W1syNjM3Nl0sMjU2XSwxMjc1NDQ6W1szMDAwM10sMjU2XSwxMjc1NDU6W1syMTEwNl0sMjU2XSwxMjc1NDY6W1syMTk0Ml0sMjU2XSwxMjc1NTI6W1sxMjMwOCwyNjQxMiwxMjMwOV0sMjU2XSwxMjc1NTM6W1sxMjMwOCwxOTk3NywxMjMwOV0sMjU2XSwxMjc1NTQ6W1sxMjMwOCwyMDEwOCwxMjMwOV0sMjU2XSwxMjc1NTU6W1sxMjMwOCwyMzQzMywxMjMwOV0sMjU2XSwxMjc1NTY6W1sxMjMwOCwyODg1NywxMjMwOV0sMjU2XSwxMjc1NTc6W1sxMjMwOCwyNTE3MSwxMjMwOV0sMjU2XSwxMjc1NTg6W1sxMjMwOCwzMDQyMywxMjMwOV0sMjU2XSwxMjc1NTk6W1sxMjMwOCwyMTIxMywxMjMwOV0sMjU2XSwxMjc1NjA6W1sxMjMwOCwyNTk0MywxMjMwOV0sMjU2XSwxMjc1Njg6W1syNDQ3MV0sMjU2XSwxMjc1Njk6W1syMTQ4N10sMjU2XX0sXG42MzQ4ODp7MTk0NTYwOltbMjAwMjldXSwxOTQ1NjE6W1syMDAyNF1dLDE5NDU2MjpbWzIwMDMzXV0sMTk0NTYzOltbMTMxMzYyXV0sMTk0NTY0OltbMjAzMjBdXSwxOTQ1NjU6W1syMDM5OF1dLDE5NDU2NjpbWzIwNDExXV0sMTk0NTY3OltbMjA0ODJdXSwxOTQ1Njg6W1syMDYwMl1dLDE5NDU2OTpbWzIwNjMzXV0sMTk0NTcwOltbMjA3MTFdXSwxOTQ1NzE6W1syMDY4N11dLDE5NDU3MjpbWzEzNDcwXV0sMTk0NTczOltbMTMyNjY2XV0sMTk0NTc0OltbMjA4MTNdXSwxOTQ1NzU6W1syMDgyMF1dLDE5NDU3NjpbWzIwODM2XV0sMTk0NTc3OltbMjA4NTVdXSwxOTQ1Nzg6W1sxMzIzODBdXSwxOTQ1Nzk6W1sxMzQ5N11dLDE5NDU4MDpbWzIwODM5XV0sMTk0NTgxOltbMjA4NzddXSwxOTQ1ODI6W1sxMzI0MjddXSwxOTQ1ODM6W1syMDg4N11dLDE5NDU4NDpbWzIwOTAwXV0sMTk0NTg1OltbMjAxNzJdXSwxOTQ1ODY6W1syMDkwOF1dLDE5NDU4NzpbWzIwOTE3XV0sMTk0NTg4OltbMTY4NDE1XV0sMTk0NTg5OltbMjA5ODFdXSwxOTQ1OTA6W1syMDk5NV1dLDE5NDU5MTpbWzEzNTM1XV0sMTk0NTkyOltbMjEwNTFdXSwxOTQ1OTM6W1syMTA2Ml1dLDE5NDU5NDpbWzIxMTA2XV0sMTk0NTk1OltbMjExMTFdXSwxOTQ1OTY6W1sxMzU4OV1dLDE5NDU5NzpbWzIxMTkxXV0sMTk0NTk4OltbMjExOTNdXSwxOTQ1OTk6W1syMTIyMF1dLDE5NDYwMDpbWzIxMjQyXV0sMTk0NjAxOltbMjEyNTNdXSwxOTQ2MDI6W1syMTI1NF1dLDE5NDYwMzpbWzIxMjcxXV0sMTk0NjA0OltbMjEzMjFdXSwxOTQ2MDU6W1syMTMyOV1dLDE5NDYwNjpbWzIxMzM4XV0sMTk0NjA3OltbMjEzNjNdXSwxOTQ2MDg6W1syMTM3M11dLDE5NDYwOTpbWzIxMzc1XV0sMTk0NjEwOltbMjEzNzVdXSwxOTQ2MTE6W1syMTM3NV1dLDE5NDYxMjpbWzEzMzY3Nl1dLDE5NDYxMzpbWzI4Nzg0XV0sMTk0NjE0OltbMjE0NTBdXSwxOTQ2MTU6W1syMTQ3MV1dLDE5NDYxNjpbWzEzMzk4N11dLDE5NDYxNzpbWzIxNDgzXV0sMTk0NjE4OltbMjE0ODldXSwxOTQ2MTk6W1syMTUxMF1dLDE5NDYyMDpbWzIxNjYyXV0sMTk0NjIxOltbMjE1NjBdXSwxOTQ2MjI6W1syMTU3Nl1dLDE5NDYyMzpbWzIxNjA4XV0sMTk0NjI0OltbMjE2NjZdXSwxOTQ2MjU6W1syMTc1MF1dLDE5NDYyNjpbWzIxNzc2XV0sMTk0NjI3OltbMjE4NDNdXSwxOTQ2Mjg6W1syMTg1OV1dLDE5NDYyOTpbWzIxODkyXV0sMTk0NjMwOltbMjE4OTJdXSwxOTQ2MzE6W1syMTkxM11dLDE5NDYzMjpbWzIxOTMxXV0sMTk0NjMzOltbMjE5MzldXSwxOTQ2MzQ6W1syMTk1NF1dLDE5NDYzNTpbWzIyMjk0XV0sMTk0NjM2OltbMjIwMjJdXSwxOTQ2Mzc6W1syMjI5NV1dLDE5NDYzODpbWzIyMDk3XV0sMTk0NjM5OltbMjIxMzJdXSwxOTQ2NDA6W1syMDk5OV1dLDE5NDY0MTpbWzIyNzY2XV0sMTk0NjQyOltbMjI0NzhdXSwxOTQ2NDM6W1syMjUxNl1dLDE5NDY0NDpbWzIyNTQxXV0sMTk0NjQ1OltbMjI0MTFdXSwxOTQ2NDY6W1syMjU3OF1dLDE5NDY0NzpbWzIyNTc3XV0sMTk0NjQ4OltbMjI3MDBdXSwxOTQ2NDk6W1sxMzY0MjBdXSwxOTQ2NTA6W1syMjc3MF1dLDE5NDY1MTpbWzIyNzc1XV0sMTk0NjUyOltbMjI3OTBdXSwxOTQ2NTM6W1syMjgxMF1dLDE5NDY1NDpbWzIyODE4XV0sMTk0NjU1OltbMjI4ODJdXSwxOTQ2NTY6W1sxMzY4NzJdXSwxOTQ2NTc6W1sxMzY5MzhdXSwxOTQ2NTg6W1syMzAyMF1dLDE5NDY1OTpbWzIzMDY3XV0sMTk0NjYwOltbMjMwNzldXSwxOTQ2NjE6W1syMzAwMF1dLDE5NDY2MjpbWzIzMTQyXV0sMTk0NjYzOltbMTQwNjJdXSwxOTQ2NjQ6W1sxNDA3Nl1dLDE5NDY2NTpbWzIzMzA0XV0sMTk0NjY2OltbMjMzNThdXSwxOTQ2Njc6W1syMzM1OF1dLDE5NDY2ODpbWzEzNzY3Ml1dLDE5NDY2OTpbWzIzNDkxXV0sMTk0NjcwOltbMjM1MTJdXSwxOTQ2NzE6W1syMzUyN11dLDE5NDY3MjpbWzIzNTM5XV0sMTk0NjczOltbMTM4MDA4XV0sMTk0Njc0OltbMjM1NTFdXSwxOTQ2NzU6W1syMzU1OF1dLDE5NDY3NjpbWzI0NDAzXV0sMTk0Njc3OltbMjM1ODZdXSwxOTQ2Nzg6W1sxNDIwOV1dLDE5NDY3OTpbWzIzNjQ4XV0sMTk0NjgwOltbMjM2NjJdXSwxOTQ2ODE6W1syMzc0NF1dLDE5NDY4MjpbWzIzNjkzXV0sMTk0NjgzOltbMTM4NzI0XV0sMTk0Njg0OltbMjM4NzVdXSwxOTQ2ODU6W1sxMzg3MjZdXSwxOTQ2ODY6W1syMzkxOF1dLDE5NDY4NzpbWzIzOTE1XV0sMTk0Njg4OltbMjM5MzJdXSwxOTQ2ODk6W1syNDAzM11dLDE5NDY5MDpbWzI0MDM0XV0sMTk0NjkxOltbMTQzODNdXSwxOTQ2OTI6W1syNDA2MV1dLDE5NDY5MzpbWzI0MTA0XV0sMTk0Njk0OltbMjQxMjVdXSwxOTQ2OTU6W1syNDE2OV1dLDE5NDY5NjpbWzE0NDM0XV0sMTk0Njk3OltbMTM5NjUxXV0sMTk0Njk4OltbMTQ0NjBdXSwxOTQ2OTk6W1syNDI0MF1dLDE5NDcwMDpbWzI0MjQzXV0sMTk0NzAxOltbMjQyNDZdXSwxOTQ3MDI6W1syNDI2Nl1dLDE5NDcwMzpbWzE3Mjk0Nl1dLDE5NDcwNDpbWzI0MzE4XV0sMTk0NzA1OltbMTQwMDgxXV0sMTk0NzA2OltbMTQwMDgxXV0sMTk0NzA3OltbMzMyODFdXSwxOTQ3MDg6W1syNDM1NF1dLDE5NDcwOTpbWzI0MzU0XV0sMTk0NzEwOltbMTQ1MzVdXSwxOTQ3MTE6W1sxNDQwNTZdXSwxOTQ3MTI6W1sxNTYxMjJdXSwxOTQ3MTM6W1syNDQxOF1dLDE5NDcxNDpbWzI0NDI3XV0sMTk0NzE1OltbMTQ1NjNdXSwxOTQ3MTY6W1syNDQ3NF1dLDE5NDcxNzpbWzI0NTI1XV0sMTk0NzE4OltbMjQ1MzVdXSwxOTQ3MTk6W1syNDU2OV1dLDE5NDcyMDpbWzI0NzA1XV0sMTk0NzIxOltbMTQ2NTBdXSwxOTQ3MjI6W1sxNDYyMF1dLDE5NDcyMzpbWzI0NzI0XV0sMTk0NzI0OltbMTQxMDEyXV0sMTk0NzI1OltbMjQ3NzVdXSwxOTQ3MjY6W1syNDkwNF1dLDE5NDcyNzpbWzI0OTA4XV0sMTk0NzI4OltbMjQ5MTBdXSwxOTQ3Mjk6W1syNDkwOF1dLDE5NDczMDpbWzI0OTU0XV0sMTk0NzMxOltbMjQ5NzRdXSwxOTQ3MzI6W1syNTAxMF1dLDE5NDczMzpbWzI0OTk2XV0sMTk0NzM0OltbMjUwMDddXSwxOTQ3MzU6W1syNTA1NF1dLDE5NDczNjpbWzI1MDc0XV0sMTk0NzM3OltbMjUwNzhdXSwxOTQ3Mzg6W1syNTEwNF1dLDE5NDczOTpbWzI1MTE1XV0sMTk0NzQwOltbMjUxODFdXSwxOTQ3NDE6W1syNTI2NV1dLDE5NDc0MjpbWzI1MzAwXV0sMTk0NzQzOltbMjU0MjRdXSwxOTQ3NDQ6W1sxNDIwOTJdXSwxOTQ3NDU6W1syNTQwNV1dLDE5NDc0NjpbWzI1MzQwXV0sMTk0NzQ3OltbMjU0NDhdXSwxOTQ3NDg6W1syNTQ3NV1dLDE5NDc0OTpbWzI1NTcyXV0sMTk0NzUwOltbMTQyMzIxXV0sMTk0NzUxOltbMjU2MzRdXSwxOTQ3NTI6W1syNTU0MV1dLDE5NDc1MzpbWzI1NTEzXV0sMTk0NzU0OltbMTQ4OTRdXSwxOTQ3NTU6W1syNTcwNV1dLDE5NDc1NjpbWzI1NzI2XV0sMTk0NzU3OltbMjU3NTddXSwxOTQ3NTg6W1syNTcxOV1dLDE5NDc1OTpbWzE0OTU2XV0sMTk0NzYwOltbMjU5MzVdXSwxOTQ3NjE6W1syNTk2NF1dLDE5NDc2MjpbWzE0MzM3MF1dLDE5NDc2MzpbWzI2MDgzXV0sMTk0NzY0OltbMjYzNjBdXSwxOTQ3NjU6W1syNjE4NV1dLDE5NDc2NjpbWzE1MTI5XV0sMTk0NzY3OltbMjYyNTddXSwxOTQ3Njg6W1sxNTExMl1dLDE5NDc2OTpbWzE1MDc2XV0sMTk0NzcwOltbMjA4ODJdXSwxOTQ3NzE6W1syMDg4NV1dLDE5NDc3MjpbWzI2MzY4XV0sMTk0NzczOltbMjYyNjhdXSwxOTQ3NzQ6W1szMjk0MV1dLDE5NDc3NTpbWzE3MzY5XV0sMTk0Nzc2OltbMjYzOTFdXSwxOTQ3Nzc6W1syNjM5NV1dLDE5NDc3ODpbWzI2NDAxXV0sMTk0Nzc5OltbMjY0NjJdXSwxOTQ3ODA6W1syNjQ1MV1dLDE5NDc4MTpbWzE0NDMyM11dLDE5NDc4MjpbWzE1MTc3XV0sMTk0NzgzOltbMjY2MThdXSwxOTQ3ODQ6W1syNjUwMV1dLDE5NDc4NTpbWzI2NzA2XV0sMTk0Nzg2OltbMjY3NTddXSwxOTQ3ODc6W1sxNDQ0OTNdXSwxOTQ3ODg6W1syNjc2Nl1dLDE5NDc4OTpbWzI2NjU1XV0sMTk0NzkwOltbMjY5MDBdXSwxOTQ3OTE6W1sxNTI2MV1dLDE5NDc5MjpbWzI2OTQ2XV0sMTk0NzkzOltbMjcwNDNdXSwxOTQ3OTQ6W1syNzExNF1dLDE5NDc5NTpbWzI3MzA0XV0sMTk0Nzk2OltbMTQ1MDU5XV0sMTk0Nzk3OltbMjczNTVdXSwxOTQ3OTg6W1sxNTM4NF1dLDE5NDc5OTpbWzI3NDI1XV0sMTk0ODAwOltbMTQ1NTc1XV0sMTk0ODAxOltbMjc0NzZdXSwxOTQ4MDI6W1sxNTQzOF1dLDE5NDgwMzpbWzI3NTA2XV0sMTk0ODA0OltbMjc1NTFdXSwxOTQ4MDU6W1syNzU3OF1dLDE5NDgwNjpbWzI3NTc5XV0sMTk0ODA3OltbMTQ2MDYxXV0sMTk0ODA4OltbMTM4NTA3XV0sMTk0ODA5OltbMTQ2MTcwXV0sMTk0ODEwOltbMjc3MjZdXSwxOTQ4MTE6W1sxNDY2MjBdXSwxOTQ4MTI6W1syNzgzOV1dLDE5NDgxMzpbWzI3ODUzXV0sMTk0ODE0OltbMjc3NTFdXSwxOTQ4MTU6W1syNzkyNl1dfSxcbjYzNzQ0Ons2Mzc0NDpbWzM1OTEyXV0sNjM3NDU6W1syNjM1Nl1dLDYzNzQ2OltbMzY1NTRdXSw2Mzc0NzpbWzM2MDQwXV0sNjM3NDg6W1syODM2OV1dLDYzNzQ5OltbMjAwMThdXSw2Mzc1MDpbWzIxNDc3XV0sNjM3NTE6W1s0MDg2MF1dLDYzNzUyOltbNDA4NjBdXSw2Mzc1MzpbWzIyODY1XV0sNjM3NTQ6W1szNzMyOV1dLDYzNzU1OltbMjE4OTVdXSw2Mzc1NjpbWzIyODU2XV0sNjM3NTc6W1syNTA3OF1dLDYzNzU4OltbMzAzMTNdXSw2Mzc1OTpbWzMyNjQ1XV0sNjM3NjA6W1szNDM2N11dLDYzNzYxOltbMzQ3NDZdXSw2Mzc2MjpbWzM1MDY0XV0sNjM3NjM6W1szNzAwN11dLDYzNzY0OltbMjcxMzhdXSw2Mzc2NTpbWzI3OTMxXV0sNjM3NjY6W1syODg4OV1dLDYzNzY3OltbMjk2NjJdXSw2Mzc2ODpbWzMzODUzXV0sNjM3Njk6W1szNzIyNl1dLDYzNzcwOltbMzk0MDldXSw2Mzc3MTpbWzIwMDk4XV0sNjM3NzI6W1syMTM2NV1dLDYzNzczOltbMjczOTZdXSw2Mzc3NDpbWzI5MjExXV0sNjM3NzU6W1szNDM0OV1dLDYzNzc2OltbNDA0NzhdXSw2Mzc3NzpbWzIzODg4XV0sNjM3Nzg6W1syODY1MV1dLDYzNzc5OltbMzQyNTNdXSw2Mzc4MDpbWzM1MTcyXV0sNjM3ODE6W1syNTI4OV1dLDYzNzgyOltbMzMyNDBdXSw2Mzc4MzpbWzM0ODQ3XV0sNjM3ODQ6W1syNDI2Nl1dLDYzNzg1OltbMjYzOTFdXSw2Mzc4NjpbWzI4MDEwXV0sNjM3ODc6W1syOTQzNl1dLDYzNzg4OltbMzcwNzBdXSw2Mzc4OTpbWzIwMzU4XV0sNjM3OTA6W1syMDkxOV1dLDYzNzkxOltbMjEyMTRdXSw2Mzc5MjpbWzI1Nzk2XV0sNjM3OTM6W1syNzM0N11dLDYzNzk0OltbMjkyMDBdXSw2Mzc5NTpbWzMwNDM5XV0sNjM3OTY6W1szMjc2OV1dLDYzNzk3OltbMzQzMTBdXSw2Mzc5ODpbWzM0Mzk2XV0sNjM3OTk6W1szNjMzNV1dLDYzODAwOltbMzg3MDZdXSw2MzgwMTpbWzM5NzkxXV0sNjM4MDI6W1s0MDQ0Ml1dLDYzODAzOltbMzA4NjBdXSw2MzgwNDpbWzMxMTAzXV0sNjM4MDU6W1szMjE2MF1dLDYzODA2OltbMzM3MzddXSw2MzgwNzpbWzM3NjM2XV0sNjM4MDg6W1s0MDU3NV1dLDYzODA5OltbMzU1NDJdXSw2MzgxMDpbWzIyNzUxXV0sNjM4MTE6W1syNDMyNF1dLDYzODEyOltbMzE4NDBdXSw2MzgxMzpbWzMyODk0XV0sNjM4MTQ6W1syOTI4Ml1dLDYzODE1OltbMzA5MjJdXSw2MzgxNjpbWzM2MDM0XV0sNjM4MTc6W1szODY0N11dLDYzODE4OltbMjI3NDRdXSw2MzgxOTpbWzIzNjUwXV0sNjM4MjA6W1syNzE1NV1dLDYzODIxOltbMjgxMjJdXSw2MzgyMjpbWzI4NDMxXV0sNjM4MjM6W1szMjA0N11dLDYzODI0OltbMzIzMTFdXSw2MzgyNTpbWzM4NDc1XV0sNjM4MjY6W1syMTIwMl1dLDYzODI3OltbMzI5MDddXSw2MzgyODpbWzIwOTU2XV0sNjM4Mjk6W1syMDk0MF1dLDYzODMwOltbMzEyNjBdXSw2MzgzMTpbWzMyMTkwXV0sNjM4MzI6W1szMzc3N11dLDYzODMzOltbMzg1MTddXSw2MzgzNDpbWzM1NzEyXV0sNjM4MzU6W1syNTI5NV1dLDYzODM2OltbMjcxMzhdXSw2MzgzNzpbWzM1NTgyXV0sNjM4Mzg6W1syMDAyNV1dLDYzODM5OltbMjM1MjddXSw2Mzg0MDpbWzI0NTk0XV0sNjM4NDE6W1syOTU3NV1dLDYzODQyOltbMzAwNjRdXSw2Mzg0MzpbWzIxMjcxXV0sNjM4NDQ6W1szMDk3MV1dLDYzODQ1OltbMjA0MTVdXSw2Mzg0NjpbWzI0NDg5XV0sNjM4NDc6W1sxOTk4MV1dLDYzODQ4OltbMjc4NTJdXSw2Mzg0OTpbWzI1OTc2XV0sNjM4NTA6W1szMjAzNF1dLDYzODUxOltbMjE0NDNdXSw2Mzg1MjpbWzIyNjIyXV0sNjM4NTM6W1szMDQ2NV1dLDYzODU0OltbMzM4NjVdXSw2Mzg1NTpbWzM1NDk4XV0sNjM4NTY6W1syNzU3OF1dLDYzODU3OltbMzY3ODRdXSw2Mzg1ODpbWzI3Nzg0XV0sNjM4NTk6W1syNTM0Ml1dLDYzODYwOltbMzM1MDldXSw2Mzg2MTpbWzI1NTA0XV0sNjM4NjI6W1szMDA1M11dLDYzODYzOltbMjAxNDJdXSw2Mzg2NDpbWzIwODQxXV0sNjM4NjU6W1syMDkzN11dLDYzODY2OltbMjY3NTNdXSw2Mzg2NzpbWzMxOTc1XV0sNjM4Njg6W1szMzM5MV1dLDYzODY5OltbMzU1MzhdXSw2Mzg3MDpbWzM3MzI3XV0sNjM4NzE6W1syMTIzN11dLDYzODcyOltbMjE1NzBdXSw2Mzg3MzpbWzIyODk5XV0sNjM4NzQ6W1syNDMwMF1dLDYzODc1OltbMjYwNTNdXSw2Mzg3NjpbWzI4NjcwXV0sNjM4Nzc6W1szMTAxOF1dLDYzODc4OltbMzgzMTddXSw2Mzg3OTpbWzM5NTMwXV0sNjM4ODA6W1s0MDU5OV1dLDYzODgxOltbNDA2NTRdXSw2Mzg4MjpbWzIxMTQ3XV0sNjM4ODM6W1syNjMxMF1dLDYzODg0OltbMjc1MTFdXSw2Mzg4NTpbWzM2NzA2XV0sNjM4ODY6W1syNDE4MF1dLDYzODg3OltbMjQ5NzZdXSw2Mzg4ODpbWzI1MDg4XV0sNjM4ODk6W1syNTc1NF1dLDYzODkwOltbMjg0NTFdXSw2Mzg5MTpbWzI5MDAxXV0sNjM4OTI6W1syOTgzM11dLDYzODkzOltbMzExNzhdXSw2Mzg5NDpbWzMyMjQ0XV0sNjM4OTU6W1szMjg3OV1dLDYzODk2OltbMzY2NDZdXSw2Mzg5NzpbWzM0MDMwXV0sNjM4OTg6W1szNjg5OV1dLDYzODk5OltbMzc3MDZdXSw2MzkwMDpbWzIxMDE1XV0sNjM5MDE6W1syMTE1NV1dLDYzOTAyOltbMjE2OTNdXSw2MzkwMzpbWzI4ODcyXV0sNjM5MDQ6W1szNTAxMF1dLDYzOTA1OltbMzU0OThdXSw2MzkwNjpbWzI0MjY1XV0sNjM5MDc6W1syNDU2NV1dLDYzOTA4OltbMjU0NjddXSw2MzkwOTpbWzI3NTY2XV0sNjM5MTA6W1szMTgwNl1dLDYzOTExOltbMjk1NTddXSw2MzkxMjpbWzIwMTk2XV0sNjM5MTM6W1syMjI2NV1dLDYzOTE0OltbMjM1MjddXSw2MzkxNTpbWzIzOTk0XV0sNjM5MTY6W1syNDYwNF1dLDYzOTE3OltbMjk2MThdXSw2MzkxODpbWzI5ODAxXV0sNjM5MTk6W1szMjY2Nl1dLDYzOTIwOltbMzI4MzhdXSw2MzkyMTpbWzM3NDI4XV0sNjM5MjI6W1szODY0Nl1dLDYzOTIzOltbMzg3MjhdXSw2MzkyNDpbWzM4OTM2XV0sNjM5MjU6W1syMDM2M11dLDYzOTI2OltbMzExNTBdXSw2MzkyNzpbWzM3MzAwXV0sNjM5Mjg6W1szODU4NF1dLDYzOTI5OltbMjQ4MDFdXSw2MzkzMDpbWzIwMTAyXV0sNjM5MzE6W1syMDY5OF1dLDYzOTMyOltbMjM1MzRdXSw2MzkzMzpbWzIzNjE1XV0sNjM5MzQ6W1syNjAwOV1dLDYzOTM1OltbMjcxMzhdXSw2MzkzNjpbWzI5MTM0XV0sNjM5Mzc6W1szMDI3NF1dLDYzOTM4OltbMzQwNDRdXSw2MzkzOTpbWzM2OTg4XV0sNjM5NDA6W1s0MDg0NV1dLDYzOTQxOltbMjYyNDhdXSw2Mzk0MjpbWzM4NDQ2XV0sNjM5NDM6W1syMTEyOV1dLDYzOTQ0OltbMjY0OTFdXSw2Mzk0NTpbWzI2NjExXV0sNjM5NDY6W1syNzk2OV1dLDYzOTQ3OltbMjgzMTZdXSw2Mzk0ODpbWzI5NzA1XV0sNjM5NDk6W1szMDA0MV1dLDYzOTUwOltbMzA4MjddXSw2Mzk1MTpbWzMyMDE2XV0sNjM5NTI6W1szOTAwNl1dLDYzOTUzOltbMjA4NDVdXSw2Mzk1NDpbWzI1MTM0XV0sNjM5NTU6W1szODUyMF1dLDYzOTU2OltbMjA1MjNdXSw2Mzk1NzpbWzIzODMzXV0sNjM5NTg6W1syODEzOF1dLDYzOTU5OltbMzY2NTBdXSw2Mzk2MDpbWzI0NDU5XV0sNjM5NjE6W1syNDkwMF1dLDYzOTYyOltbMjY2NDddXSw2Mzk2MzpbWzI5NTc1XV0sNjM5NjQ6W1szODUzNF1dLDYzOTY1OltbMjEwMzNdXSw2Mzk2NjpbWzIxNTE5XV0sNjM5Njc6W1syMzY1M11dLDYzOTY4OltbMjYxMzFdXSw2Mzk2OTpbWzI2NDQ2XV0sNjM5NzA6W1syNjc5Ml1dLDYzOTcxOltbMjc4NzddXSw2Mzk3MjpbWzI5NzAyXV0sNjM5NzM6W1szMDE3OF1dLDYzOTc0OltbMzI2MzNdXSw2Mzk3NTpbWzM1MDIzXV0sNjM5NzY6W1szNTA0MV1dLDYzOTc3OltbMzczMjRdXSw2Mzk3ODpbWzM4NjI2XV0sNjM5Nzk6W1syMTMxMV1dLDYzOTgwOltbMjgzNDZdXSw2Mzk4MTpbWzIxNTMzXV0sNjM5ODI6W1syOTEzNl1dLDYzOTgzOltbMjk4NDhdXSw2Mzk4NDpbWzM0Mjk4XV0sNjM5ODU6W1szODU2M11dLDYzOTg2OltbNDAwMjNdXSw2Mzk4NzpbWzQwNjA3XV0sNjM5ODg6W1syNjUxOV1dLDYzOTg5OltbMjgxMDddXSw2Mzk5MDpbWzMzMjU2XV0sNjM5OTE6W1szMTQzNV1dLDYzOTkyOltbMzE1MjBdXSw2Mzk5MzpbWzMxODkwXV0sNjM5OTQ6W1syOTM3Nl1dLDYzOTk1OltbMjg4MjVdXSw2Mzk5NjpbWzM1NjcyXV0sNjM5OTc6W1syMDE2MF1dLDYzOTk4OltbMzM1OTBdXSw2Mzk5OTpbWzIxMDUwXV0sMTk0ODE2OltbMjc5NjZdXSwxOTQ4MTc6W1syODAyM11dLDE5NDgxODpbWzI3OTY5XV0sMTk0ODE5OltbMjgwMDldXSwxOTQ4MjA6W1syODAyNF1dLDE5NDgyMTpbWzI4MDM3XV0sMTk0ODIyOltbMTQ2NzE4XV0sMTk0ODIzOltbMjc5NTZdXSwxOTQ4MjQ6W1syODIwN11dLDE5NDgyNTpbWzI4MjcwXV0sMTk0ODI2OltbMTU2NjddXSwxOTQ4Mjc6W1syODM2M11dLDE5NDgyODpbWzI4MzU5XV0sMTk0ODI5OltbMTQ3MTUzXV0sMTk0ODMwOltbMjgxNTNdXSwxOTQ4MzE6W1syODUyNl1dLDE5NDgzMjpbWzE0NzI5NF1dLDE5NDgzMzpbWzE0NzM0Ml1dLDE5NDgzNDpbWzI4NjE0XV0sMTk0ODM1OltbMjg3MjldXSwxOTQ4MzY6W1syODcwMl1dLDE5NDgzNzpbWzI4Njk5XV0sMTk0ODM4OltbMTU3NjZdXSwxOTQ4Mzk6W1syODc0Nl1dLDE5NDg0MDpbWzI4Nzk3XV0sMTk0ODQxOltbMjg3OTFdXSwxOTQ4NDI6W1syODg0NV1dLDE5NDg0MzpbWzEzMjM4OV1dLDE5NDg0NDpbWzI4OTk3XV0sMTk0ODQ1OltbMTQ4MDY3XV0sMTk0ODQ2OltbMjkwODRdXSwxOTQ4NDc6W1sxNDgzOTVdXSwxOTQ4NDg6W1syOTIyNF1dLDE5NDg0OTpbWzI5MjM3XV0sMTk0ODUwOltbMjkyNjRdXSwxOTQ4NTE6W1sxNDkwMDBdXSwxOTQ4NTI6W1syOTMxMl1dLDE5NDg1MzpbWzI5MzMzXV0sMTk0ODU0OltbMTQ5MzAxXV0sMTk0ODU1OltbMTQ5NTI0XV0sMTk0ODU2OltbMjk1NjJdXSwxOTQ4NTc6W1syOTU3OV1dLDE5NDg1ODpbWzE2MDQ0XV0sMTk0ODU5OltbMjk2MDVdXSwxOTQ4NjA6W1sxNjA1Nl1dLDE5NDg2MTpbWzE2MDU2XV0sMTk0ODYyOltbMjk3NjddXSwxOTQ4NjM6W1syOTc4OF1dLDE5NDg2NDpbWzI5ODA5XV0sMTk0ODY1OltbMjk4MjldXSwxOTQ4NjY6W1syOTg5OF1dLDE5NDg2NzpbWzE2MTU1XV0sMTk0ODY4OltbMjk5ODhdXSwxOTQ4Njk6W1sxNTA1ODJdXSwxOTQ4NzA6W1szMDAxNF1dLDE5NDg3MTpbWzE1MDY3NF1dLDE5NDg3MjpbWzMwMDY0XV0sMTk0ODczOltbMTM5Njc5XV0sMTk0ODc0OltbMzAyMjRdXSwxOTQ4NzU6W1sxNTE0NTddXSwxOTQ4NzY6W1sxNTE0ODBdXSwxOTQ4Nzc6W1sxNTE2MjBdXSwxOTQ4Nzg6W1sxNjM4MF1dLDE5NDg3OTpbWzE2MzkyXV0sMTk0ODgwOltbMzA0NTJdXSwxOTQ4ODE6W1sxNTE3OTVdXSwxOTQ4ODI6W1sxNTE3OTRdXSwxOTQ4ODM6W1sxNTE4MzNdXSwxOTQ4ODQ6W1sxNTE4NTldXSwxOTQ4ODU6W1szMDQ5NF1dLDE5NDg4NjpbWzMwNDk1XV0sMTk0ODg3OltbMzA0OTVdXSwxOTQ4ODg6W1szMDUzOF1dLDE5NDg4OTpbWzE2NDQxXV0sMTk0ODkwOltbMzA2MDNdXSwxOTQ4OTE6W1sxNjQ1NF1dLDE5NDg5MjpbWzE2NTM0XV0sMTk0ODkzOltbMTUyNjA1XV0sMTk0ODk0OltbMzA3OThdXSwxOTQ4OTU6W1szMDg2MF1dLDE5NDg5NjpbWzMwOTI0XV0sMTk0ODk3OltbMTY2MTFdXSwxOTQ4OTg6W1sxNTMxMjZdXSwxOTQ4OTk6W1szMTA2Ml1dLDE5NDkwMDpbWzE1MzI0Ml1dLDE5NDkwMTpbWzE1MzI4NV1dLDE5NDkwMjpbWzMxMTE5XV0sMTk0OTAzOltbMzEyMTFdXSwxOTQ5MDQ6W1sxNjY4N11dLDE5NDkwNTpbWzMxMjk2XV0sMTk0OTA2OltbMzEzMDZdXSwxOTQ5MDc6W1szMTMxMV1dLDE5NDkwODpbWzE1Mzk4MF1dLDE5NDkwOTpbWzE1NDI3OV1dLDE5NDkxMDpbWzE1NDI3OV1dLDE5NDkxMTpbWzMxNDcwXV0sMTk0OTEyOltbMTY4OThdXSwxOTQ5MTM6W1sxNTQ1MzldXSwxOTQ5MTQ6W1szMTY4Nl1dLDE5NDkxNTpbWzMxNjg5XV0sMTk0OTE2OltbMTY5MzVdXSwxOTQ5MTc6W1sxNTQ3NTJdXSwxOTQ5MTg6W1szMTk1NF1dLDE5NDkxOTpbWzE3MDU2XV0sMTk0OTIwOltbMzE5NzZdXSwxOTQ5MjE6W1szMTk3MV1dLDE5NDkyMjpbWzMyMDAwXV0sMTk0OTIzOltbMTU1NTI2XV0sMTk0OTI0OltbMzIwOTldXSwxOTQ5MjU6W1sxNzE1M11dLDE5NDkyNjpbWzMyMTk5XV0sMTk0OTI3OltbMzIyNThdXSwxOTQ5Mjg6W1szMjMyNV1dLDE5NDkyOTpbWzE3MjA0XV0sMTk0OTMwOltbMTU2MjAwXV0sMTk0OTMxOltbMTU2MjMxXV0sMTk0OTMyOltbMTcyNDFdXSwxOTQ5MzM6W1sxNTYzNzddXSwxOTQ5MzQ6W1szMjYzNF1dLDE5NDkzNTpbWzE1NjQ3OF1dLDE5NDkzNjpbWzMyNjYxXV0sMTk0OTM3OltbMzI3NjJdXSwxOTQ5Mzg6W1szMjc3M11dLDE5NDkzOTpbWzE1Njg5MF1dLDE5NDk0MDpbWzE1Njk2M11dLDE5NDk0MTpbWzMyODY0XV0sMTk0OTQyOltbMTU3MDk2XV0sMTk0OTQzOltbMzI4ODBdXSwxOTQ5NDQ6W1sxNDQyMjNdXSwxOTQ5NDU6W1sxNzM2NV1dLDE5NDk0NjpbWzMyOTQ2XV0sMTk0OTQ3OltbMzMwMjddXSwxOTQ5NDg6W1sxNzQxOV1dLDE5NDk0OTpbWzMzMDg2XV0sMTk0OTUwOltbMjMyMjFdXSwxOTQ5NTE6W1sxNTc2MDddXSwxOTQ5NTI6W1sxNTc2MjFdXSwxOTQ5NTM6W1sxNDQyNzVdXSwxOTQ5NTQ6W1sxNDQyODRdXSwxOTQ5NTU6W1szMzI4MV1dLDE5NDk1NjpbWzMzMjg0XV0sMTk0OTU3OltbMzY3NjZdXSwxOTQ5NTg6W1sxNzUxNV1dLDE5NDk1OTpbWzMzNDI1XV0sMTk0OTYwOltbMzM0MTldXSwxOTQ5NjE6W1szMzQzN11dLDE5NDk2MjpbWzIxMTcxXV0sMTk0OTYzOltbMzM0NTddXSwxOTQ5NjQ6W1szMzQ1OV1dLDE5NDk2NTpbWzMzNDY5XV0sMTk0OTY2OltbMzM1MTBdXSwxOTQ5Njc6W1sxNTg1MjRdXSwxOTQ5Njg6W1szMzUwOV1dLDE5NDk2OTpbWzMzNTY1XV0sMTk0OTcwOltbMzM2MzVdXSwxOTQ5NzE6W1szMzcwOV1dLDE5NDk3MjpbWzMzNTcxXV0sMTk0OTczOltbMzM3MjVdXSwxOTQ5NzQ6W1szMzc2N11dLDE5NDk3NTpbWzMzODc5XV0sMTk0OTc2OltbMzM2MTldXSwxOTQ5Nzc6W1szMzczOF1dLDE5NDk3ODpbWzMzNzQwXV0sMTk0OTc5OltbMzM3NTZdXSwxOTQ5ODA6W1sxNTg3NzRdXSwxOTQ5ODE6W1sxNTkwODNdXSwxOTQ5ODI6W1sxNTg5MzNdXSwxOTQ5ODM6W1sxNzcwN11dLDE5NDk4NDpbWzM0MDMzXV0sMTk0OTg1OltbMzQwMzVdXSwxOTQ5ODY6W1szNDA3MF1dLDE5NDk4NzpbWzE2MDcxNF1dLDE5NDk4ODpbWzM0MTQ4XV0sMTk0OTg5OltbMTU5NTMyXV0sMTk0OTkwOltbMTc3NTddXSwxOTQ5OTE6W1sxNzc2MV1dLDE5NDk5MjpbWzE1OTY2NV1dLDE5NDk5MzpbWzE1OTk1NF1dLDE5NDk5NDpbWzE3NzcxXV0sMTk0OTk1OltbMzQzODRdXSwxOTQ5OTY6W1szNDM5Nl1dLDE5NDk5NzpbWzM0NDA3XV0sMTk0OTk4OltbMzQ0MDldXSwxOTQ5OTk6W1szNDQ3M11dLDE5NTAwMDpbWzM0NDQwXV0sMTk1MDAxOltbMzQ1NzRdXSwxOTUwMDI6W1szNDUzMF1dLDE5NTAwMzpbWzM0NjgxXV0sMTk1MDA0OltbMzQ2MDBdXSwxOTUwMDU6W1szNDY2N11dLDE5NTAwNjpbWzM0Njk0XV0sMTk1MDA3OltbMTc4NzldXSwxOTUwMDg6W1szNDc4NV1dLDE5NTAwOTpbWzM0ODE3XV0sMTk1MDEwOltbMTc5MTNdXSwxOTUwMTE6W1szNDkxMl1dLDE5NTAxMjpbWzM0OTE1XV0sMTk1MDEzOltbMTYxMzgzXV0sMTk1MDE0OltbMzUwMzFdXSwxOTUwMTU6W1szNTAzOF1dLDE5NTAxNjpbWzE3OTczXV0sMTk1MDE3OltbMzUwNjZdXSwxOTUwMTg6W1sxMzQ5OV1dLDE5NTAxOTpbWzE2MTk2Nl1dLDE5NTAyMDpbWzE2MjE1MF1dLDE5NTAyMTpbWzE4MTEwXV0sMTk1MDIyOltbMTgxMTldXSwxOTUwMjM6W1szNTQ4OF1dLDE5NTAyNDpbWzM1NTY1XV0sMTk1MDI1OltbMzU3MjJdXSwxOTUwMjY6W1szNTkyNV1dLDE5NTAyNzpbWzE2Mjk4NF1dLDE5NTAyODpbWzM2MDExXV0sMTk1MDI5OltbMzYwMzNdXSwxOTUwMzA6W1szNjEyM11dLDE5NTAzMTpbWzM2MjE1XV0sMTk1MDMyOltbMTYzNjMxXV0sMTk1MDMzOltbMTMzMTI0XV0sMTk1MDM0OltbMzYyOTldXSwxOTUwMzU6W1szNjI4NF1dLDE5NTAzNjpbWzM2MzM2XV0sMTk1MDM3OltbMTMzMzQyXV0sMTk1MDM4OltbMzY1NjRdXSwxOTUwMzk6W1szNjY2NF1dLDE5NTA0MDpbWzE2NTMzMF1dLDE5NTA0MTpbWzE2NTM1N11dLDE5NTA0MjpbWzM3MDEyXV0sMTk1MDQzOltbMzcxMDVdXSwxOTUwNDQ6W1szNzEzN11dLDE5NTA0NTpbWzE2NTY3OF1dLDE5NTA0NjpbWzM3MTQ3XV0sMTk1MDQ3OltbMzc0MzJdXSwxOTUwNDg6W1szNzU5MV1dLDE5NTA0OTpbWzM3NTkyXV0sMTk1MDUwOltbMzc1MDBdXSwxOTUwNTE6W1szNzg4MV1dLDE5NTA1MjpbWzM3OTA5XV0sMTk1MDUzOltbMTY2OTA2XV0sMTk1MDU0OltbMzgyODNdXSwxOTUwNTU6W1sxODgzN11dLDE5NTA1NjpbWzM4MzI3XV0sMTk1MDU3OltbMTY3Mjg3XV0sMTk1MDU4OltbMTg5MThdXSwxOTUwNTk6W1szODU5NV1dLDE5NTA2MDpbWzIzOTg2XV0sMTk1MDYxOltbMzg2OTFdXSwxOTUwNjI6W1sxNjgyNjFdXSwxOTUwNjM6W1sxNjg0NzRdXSwxOTUwNjQ6W1sxOTA1NF1dLDE5NTA2NTpbWzE5MDYyXV0sMTk1MDY2OltbMzg4ODBdXSwxOTUwNjc6W1sxNjg5NzBdXSwxOTUwNjg6W1sxOTEyMl1dLDE5NTA2OTpbWzE2OTExMF1dLDE5NTA3MDpbWzM4OTIzXV0sMTk1MDcxOltbMzg5MjNdXX0sXG42NDAwMDp7NjQwMDA6W1syMDk5OV1dLDY0MDAxOltbMjQyMzBdXSw2NDAwMjpbWzI1Mjk5XV0sNjQwMDM6W1szMTk1OF1dLDY0MDA0OltbMjM0MjldXSw2NDAwNTpbWzI3OTM0XV0sNjQwMDY6W1syNjI5Ml1dLDY0MDA3OltbMzY2NjddXSw2NDAwODpbWzM0ODkyXV0sNjQwMDk6W1szODQ3N11dLDY0MDEwOltbMzUyMTFdXSw2NDAxMTpbWzI0Mjc1XV0sNjQwMTI6W1syMDgwMF1dLDY0MDEzOltbMjE5NTJdXSw2NDAxNjpbWzIyNjE4XV0sNjQwMTg6W1syNjIyOF1dLDY0MDIxOltbMjA5NThdXSw2NDAyMjpbWzI5NDgyXV0sNjQwMjM6W1szMDQxMF1dLDY0MDI0OltbMzEwMzZdXSw2NDAyNTpbWzMxMDcwXV0sNjQwMjY6W1szMTA3N11dLDY0MDI3OltbMzExMTldXSw2NDAyODpbWzM4NzQyXV0sNjQwMjk6W1szMTkzNF1dLDY0MDMwOltbMzI3MDFdXSw2NDAzMjpbWzM0MzIyXV0sNjQwMzQ6W1szNTU3Nl1dLDY0MDM3OltbMzY5MjBdXSw2NDAzODpbWzM3MTE3XV0sNjQwNDI6W1szOTE1MV1dLDY0MDQzOltbMzkxNjRdXSw2NDA0NDpbWzM5MjA4XV0sNjQwNDU6W1s0MDM3Ml1dLDY0MDQ2OltbMzcwODZdXSw2NDA0NzpbWzM4NTgzXV0sNjQwNDg6W1syMDM5OF1dLDY0MDQ5OltbMjA3MTFdXSw2NDA1MDpbWzIwODEzXV0sNjQwNTE6W1syMTE5M11dLDY0MDUyOltbMjEyMjBdXSw2NDA1MzpbWzIxMzI5XV0sNjQwNTQ6W1syMTkxN11dLDY0MDU1OltbMjIwMjJdXSw2NDA1NjpbWzIyMTIwXV0sNjQwNTc6W1syMjU5Ml1dLDY0MDU4OltbMjI2OTZdXSw2NDA1OTpbWzIzNjUyXV0sNjQwNjA6W1syMzY2Ml1dLDY0MDYxOltbMjQ3MjRdXSw2NDA2MjpbWzI0OTM2XV0sNjQwNjM6W1syNDk3NF1dLDY0MDY0OltbMjUwNzRdXSw2NDA2NTpbWzI1OTM1XV0sNjQwNjY6W1syNjA4Ml1dLDY0MDY3OltbMjYyNTddXSw2NDA2ODpbWzI2NzU3XV0sNjQwNjk6W1syODAyM11dLDY0MDcwOltbMjgxODZdXSw2NDA3MTpbWzI4NDUwXV0sNjQwNzI6W1syOTAzOF1dLDY0MDczOltbMjkyMjddXSw2NDA3NDpbWzI5NzMwXV0sNjQwNzU6W1szMDg2NV1dLDY0MDc2OltbMzEwMzhdXSw2NDA3NzpbWzMxMDQ5XV0sNjQwNzg6W1szMTA0OF1dLDY0MDc5OltbMzEwNTZdXSw2NDA4MDpbWzMxMDYyXV0sNjQwODE6W1szMTA2OV1dLDY0MDgyOltbMzExMTddXSw2NDA4MzpbWzMxMTE4XV0sNjQwODQ6W1szMTI5Nl1dLDY0MDg1OltbMzEzNjFdXSw2NDA4NjpbWzMxNjgwXV0sNjQwODc6W1szMjI0NF1dLDY0MDg4OltbMzIyNjVdXSw2NDA4OTpbWzMyMzIxXV0sNjQwOTA6W1szMjYyNl1dLDY0MDkxOltbMzI3NzNdXSw2NDA5MjpbWzMzMjYxXV0sNjQwOTM6W1szMzQwMV1dLDY0MDk0OltbMzM0MDFdXSw2NDA5NTpbWzMzODc5XV0sNjQwOTY6W1szNTA4OF1dLDY0MDk3OltbMzUyMjJdXSw2NDA5ODpbWzM1NTg1XV0sNjQwOTk6W1szNTY0MV1dLDY0MTAwOltbMzYwNTFdXSw2NDEwMTpbWzM2MTA0XV0sNjQxMDI6W1szNjc5MF1dLDY0MTAzOltbMzY5MjBdXSw2NDEwNDpbWzM4NjI3XV0sNjQxMDU6W1szODkxMV1dLDY0MTA2OltbMzg5NzFdXSw2NDEwNzpbWzI0NjkzXV0sNjQxMDg6W1sxNDgyMDZdXSw2NDEwOTpbWzMzMzA0XV0sNjQxMTI6W1syMDAwNl1dLDY0MTEzOltbMjA5MTddXSw2NDExNDpbWzIwODQwXV0sNjQxMTU6W1syMDM1Ml1dLDY0MTE2OltbMjA4MDVdXSw2NDExNzpbWzIwODY0XV0sNjQxMTg6W1syMTE5MV1dLDY0MTE5OltbMjEyNDJdXSw2NDEyMDpbWzIxOTE3XV0sNjQxMjE6W1syMTg0NV1dLDY0MTIyOltbMjE5MTNdXSw2NDEyMzpbWzIxOTg2XV0sNjQxMjQ6W1syMjYxOF1dLDY0MTI1OltbMjI3MDddXSw2NDEyNjpbWzIyODUyXV0sNjQxMjc6W1syMjg2OF1dLDY0MTI4OltbMjMxMzhdXSw2NDEyOTpbWzIzMzM2XV0sNjQxMzA6W1syNDI3NF1dLDY0MTMxOltbMjQyODFdXSw2NDEzMjpbWzI0NDI1XV0sNjQxMzM6W1syNDQ5M11dLDY0MTM0OltbMjQ3OTJdXSw2NDEzNTpbWzI0OTEwXV0sNjQxMzY6W1syNDg0MF1dLDY0MTM3OltbMjQ5NzRdXSw2NDEzODpbWzI0OTI4XV0sNjQxMzk6W1syNTA3NF1dLDY0MTQwOltbMjUxNDBdXSw2NDE0MTpbWzI1NTQwXV0sNjQxNDI6W1syNTYyOF1dLDY0MTQzOltbMjU2ODJdXSw2NDE0NDpbWzI1OTQyXV0sNjQxNDU6W1syNjIyOF1dLDY0MTQ2OltbMjYzOTFdXSw2NDE0NzpbWzI2Mzk1XV0sNjQxNDg6W1syNjQ1NF1dLDY0MTQ5OltbMjc1MTNdXSw2NDE1MDpbWzI3NTc4XV0sNjQxNTE6W1syNzk2OV1dLDY0MTUyOltbMjgzNzldXSw2NDE1MzpbWzI4MzYzXV0sNjQxNTQ6W1syODQ1MF1dLDY0MTU1OltbMjg3MDJdXSw2NDE1NjpbWzI5MDM4XV0sNjQxNTc6W1szMDYzMV1dLDY0MTU4OltbMjkyMzddXSw2NDE1OTpbWzI5MzU5XV0sNjQxNjA6W1syOTQ4Ml1dLDY0MTYxOltbMjk4MDldXSw2NDE2MjpbWzI5OTU4XV0sNjQxNjM6W1szMDAxMV1dLDY0MTY0OltbMzAyMzddXSw2NDE2NTpbWzMwMjM5XV0sNjQxNjY6W1szMDQxMF1dLDY0MTY3OltbMzA0MjddXSw2NDE2ODpbWzMwNDUyXV0sNjQxNjk6W1szMDUzOF1dLDY0MTcwOltbMzA1MjhdXSw2NDE3MTpbWzMwOTI0XV0sNjQxNzI6W1szMTQwOV1dLDY0MTczOltbMzE2ODBdXSw2NDE3NDpbWzMxODY3XV0sNjQxNzU6W1szMjA5MV1dLDY0MTc2OltbMzIyNDRdXSw2NDE3NzpbWzMyNTc0XV0sNjQxNzg6W1szMjc3M11dLDY0MTc5OltbMzM2MThdXSw2NDE4MDpbWzMzNzc1XV0sNjQxODE6W1szNDY4MV1dLDY0MTgyOltbMzUxMzddXSw2NDE4MzpbWzM1MjA2XV0sNjQxODQ6W1szNTIyMl1dLDY0MTg1OltbMzU1MTldXSw2NDE4NjpbWzM1NTc2XV0sNjQxODc6W1szNTUzMV1dLDY0MTg4OltbMzU1ODVdXSw2NDE4OTpbWzM1NTgyXV0sNjQxOTA6W1szNTU2NV1dLDY0MTkxOltbMzU2NDFdXSw2NDE5MjpbWzM1NzIyXV0sNjQxOTM6W1szNjEwNF1dLDY0MTk0OltbMzY2NjRdXSw2NDE5NTpbWzM2OTc4XV0sNjQxOTY6W1szNzI3M11dLDY0MTk3OltbMzc0OTRdXSw2NDE5ODpbWzM4NTI0XV0sNjQxOTk6W1szODYyN11dLDY0MjAwOltbMzg3NDJdXSw2NDIwMTpbWzM4ODc1XV0sNjQyMDI6W1szODkxMV1dLDY0MjAzOltbMzg5MjNdXSw2NDIwNDpbWzM4OTcxXV0sNjQyMDU6W1szOTY5OF1dLDY0MjA2OltbNDA4NjBdXSw2NDIwNzpbWzE0MTM4Nl1dLDY0MjA4OltbMTQxMzgwXV0sNjQyMDk6W1sxNDQzNDFdXSw2NDIxMDpbWzE1MjYxXV0sNjQyMTE6W1sxNjQwOF1dLDY0MjEyOltbMTY0NDFdXSw2NDIxMzpbWzE1MjEzN11dLDY0MjE0OltbMTU0ODMyXV0sNjQyMTU6W1sxNjM1MzldXSw2NDIxNjpbWzQwNzcxXV0sNjQyMTc6W1s0MDg0Nl1dLDE5NTA3MjpbWzM4OTUzXV0sMTk1MDczOltbMTY5Mzk4XV0sMTk1MDc0OltbMzkxMzhdXSwxOTUwNzU6W1sxOTI1MV1dLDE5NTA3NjpbWzM5MjA5XV0sMTk1MDc3OltbMzkzMzVdXSwxOTUwNzg6W1szOTM2Ml1dLDE5NTA3OTpbWzM5NDIyXV0sMTk1MDgwOltbMTk0MDZdXSwxOTUwODE6W1sxNzA4MDBdXSwxOTUwODI6W1szOTY5OF1dLDE5NTA4MzpbWzQwMDAwXV0sMTk1MDg0OltbNDAxODldXSwxOTUwODU6W1sxOTY2Ml1dLDE5NTA4NjpbWzE5NjkzXV0sMTk1MDg3OltbNDAyOTVdXSwxOTUwODg6W1sxNzIyMzhdXSwxOTUwODk6W1sxOTcwNF1dLDE5NTA5MDpbWzE3MjI5M11dLDE5NTA5MTpbWzE3MjU1OF1dLDE5NTA5MjpbWzE3MjY4OV1dLDE5NTA5MzpbWzQwNjM1XV0sMTk1MDk0OltbMTk3OThdXSwxOTUwOTU6W1s0MDY5N11dLDE5NTA5NjpbWzQwNzAyXV0sMTk1MDk3OltbNDA3MDldXSwxOTUwOTg6W1s0MDcxOV1dLDE5NTA5OTpbWzQwNzI2XV0sMTk1MTAwOltbNDA3NjNdXSwxOTUxMDE6W1sxNzM1NjhdXX0sXG42NDI1Njp7NjQyNTY6W1sxMDIsMTAyXSwyNTZdLDY0MjU3OltbMTAyLDEwNV0sMjU2XSw2NDI1ODpbWzEwMiwxMDhdLDI1Nl0sNjQyNTk6W1sxMDIsMTAyLDEwNV0sMjU2XSw2NDI2MDpbWzEwMiwxMDIsMTA4XSwyNTZdLDY0MjYxOltbMzgzLDExNl0sMjU2XSw2NDI2MjpbWzExNSwxMTZdLDI1Nl0sNjQyNzU6W1sxMzk2LDEzOThdLDI1Nl0sNjQyNzY6W1sxMzk2LDEzODFdLDI1Nl0sNjQyNzc6W1sxMzk2LDEzODddLDI1Nl0sNjQyNzg6W1sxNDA2LDEzOThdLDI1Nl0sNjQyNzk6W1sxMzk2LDEzODldLDI1Nl0sNjQyODU6W1sxNDk3LDE0NjBdLDUxMl0sNjQyODY6WywyNl0sNjQyODc6W1sxNTIyLDE0NjNdLDUxMl0sNjQyODg6W1sxNTA2XSwyNTZdLDY0Mjg5OltbMTQ4OF0sMjU2XSw2NDI5MDpbWzE0OTFdLDI1Nl0sNjQyOTE6W1sxNDkyXSwyNTZdLDY0MjkyOltbMTQ5OV0sMjU2XSw2NDI5MzpbWzE1MDBdLDI1Nl0sNjQyOTQ6W1sxNTAxXSwyNTZdLDY0Mjk1OltbMTUxMl0sMjU2XSw2NDI5NjpbWzE1MTRdLDI1Nl0sNjQyOTc6W1s0M10sMjU2XSw2NDI5ODpbWzE1MTMsMTQ3M10sNTEyXSw2NDI5OTpbWzE1MTMsMTQ3NF0sNTEyXSw2NDMwMDpbWzY0MzI5LDE0NzNdLDUxMl0sNjQzMDE6W1s2NDMyOSwxNDc0XSw1MTJdLDY0MzAyOltbMTQ4OCwxNDYzXSw1MTJdLDY0MzAzOltbMTQ4OCwxNDY0XSw1MTJdLDY0MzA0OltbMTQ4OCwxNDY4XSw1MTJdLDY0MzA1OltbMTQ4OSwxNDY4XSw1MTJdLDY0MzA2OltbMTQ5MCwxNDY4XSw1MTJdLDY0MzA3OltbMTQ5MSwxNDY4XSw1MTJdLDY0MzA4OltbMTQ5MiwxNDY4XSw1MTJdLDY0MzA5OltbMTQ5MywxNDY4XSw1MTJdLDY0MzEwOltbMTQ5NCwxNDY4XSw1MTJdLDY0MzEyOltbMTQ5NiwxNDY4XSw1MTJdLDY0MzEzOltbMTQ5NywxNDY4XSw1MTJdLDY0MzE0OltbMTQ5OCwxNDY4XSw1MTJdLDY0MzE1OltbMTQ5OSwxNDY4XSw1MTJdLDY0MzE2OltbMTUwMCwxNDY4XSw1MTJdLDY0MzE4OltbMTUwMiwxNDY4XSw1MTJdLDY0MzIwOltbMTUwNCwxNDY4XSw1MTJdLDY0MzIxOltbMTUwNSwxNDY4XSw1MTJdLDY0MzIzOltbMTUwNywxNDY4XSw1MTJdLDY0MzI0OltbMTUwOCwxNDY4XSw1MTJdLDY0MzI2OltbMTUxMCwxNDY4XSw1MTJdLDY0MzI3OltbMTUxMSwxNDY4XSw1MTJdLDY0MzI4OltbMTUxMiwxNDY4XSw1MTJdLDY0MzI5OltbMTUxMywxNDY4XSw1MTJdLDY0MzMwOltbMTUxNCwxNDY4XSw1MTJdLDY0MzMxOltbMTQ5MywxNDY1XSw1MTJdLDY0MzMyOltbMTQ4OSwxNDcxXSw1MTJdLDY0MzMzOltbMTQ5OSwxNDcxXSw1MTJdLDY0MzM0OltbMTUwOCwxNDcxXSw1MTJdLDY0MzM1OltbMTQ4OCwxNTAwXSwyNTZdLDY0MzM2OltbMTY0OV0sMjU2XSw2NDMzNzpbWzE2NDldLDI1Nl0sNjQzMzg6W1sxNjU5XSwyNTZdLDY0MzM5OltbMTY1OV0sMjU2XSw2NDM0MDpbWzE2NTldLDI1Nl0sNjQzNDE6W1sxNjU5XSwyNTZdLDY0MzQyOltbMTY2Ml0sMjU2XSw2NDM0MzpbWzE2NjJdLDI1Nl0sNjQzNDQ6W1sxNjYyXSwyNTZdLDY0MzQ1OltbMTY2Ml0sMjU2XSw2NDM0NjpbWzE2NjRdLDI1Nl0sNjQzNDc6W1sxNjY0XSwyNTZdLDY0MzQ4OltbMTY2NF0sMjU2XSw2NDM0OTpbWzE2NjRdLDI1Nl0sNjQzNTA6W1sxNjU4XSwyNTZdLDY0MzUxOltbMTY1OF0sMjU2XSw2NDM1MjpbWzE2NThdLDI1Nl0sNjQzNTM6W1sxNjU4XSwyNTZdLDY0MzU0OltbMTY2M10sMjU2XSw2NDM1NTpbWzE2NjNdLDI1Nl0sNjQzNTY6W1sxNjYzXSwyNTZdLDY0MzU3OltbMTY2M10sMjU2XSw2NDM1ODpbWzE2NTddLDI1Nl0sNjQzNTk6W1sxNjU3XSwyNTZdLDY0MzYwOltbMTY1N10sMjU2XSw2NDM2MTpbWzE2NTddLDI1Nl0sNjQzNjI6W1sxNzAwXSwyNTZdLDY0MzYzOltbMTcwMF0sMjU2XSw2NDM2NDpbWzE3MDBdLDI1Nl0sNjQzNjU6W1sxNzAwXSwyNTZdLDY0MzY2OltbMTcwMl0sMjU2XSw2NDM2NzpbWzE3MDJdLDI1Nl0sNjQzNjg6W1sxNzAyXSwyNTZdLDY0MzY5OltbMTcwMl0sMjU2XSw2NDM3MDpbWzE2NjhdLDI1Nl0sNjQzNzE6W1sxNjY4XSwyNTZdLDY0MzcyOltbMTY2OF0sMjU2XSw2NDM3MzpbWzE2NjhdLDI1Nl0sNjQzNzQ6W1sxNjY3XSwyNTZdLDY0Mzc1OltbMTY2N10sMjU2XSw2NDM3NjpbWzE2NjddLDI1Nl0sNjQzNzc6W1sxNjY3XSwyNTZdLDY0Mzc4OltbMTY3MF0sMjU2XSw2NDM3OTpbWzE2NzBdLDI1Nl0sNjQzODA6W1sxNjcwXSwyNTZdLDY0MzgxOltbMTY3MF0sMjU2XSw2NDM4MjpbWzE2NzFdLDI1Nl0sNjQzODM6W1sxNjcxXSwyNTZdLDY0Mzg0OltbMTY3MV0sMjU2XSw2NDM4NTpbWzE2NzFdLDI1Nl0sNjQzODY6W1sxNjc3XSwyNTZdLDY0Mzg3OltbMTY3N10sMjU2XSw2NDM4ODpbWzE2NzZdLDI1Nl0sNjQzODk6W1sxNjc2XSwyNTZdLDY0MzkwOltbMTY3OF0sMjU2XSw2NDM5MTpbWzE2NzhdLDI1Nl0sNjQzOTI6W1sxNjcyXSwyNTZdLDY0MzkzOltbMTY3Ml0sMjU2XSw2NDM5NDpbWzE2ODhdLDI1Nl0sNjQzOTU6W1sxNjg4XSwyNTZdLDY0Mzk2OltbMTY4MV0sMjU2XSw2NDM5NzpbWzE2ODFdLDI1Nl0sNjQzOTg6W1sxNzA1XSwyNTZdLDY0Mzk5OltbMTcwNV0sMjU2XSw2NDQwMDpbWzE3MDVdLDI1Nl0sNjQ0MDE6W1sxNzA1XSwyNTZdLDY0NDAyOltbMTcxMV0sMjU2XSw2NDQwMzpbWzE3MTFdLDI1Nl0sNjQ0MDQ6W1sxNzExXSwyNTZdLDY0NDA1OltbMTcxMV0sMjU2XSw2NDQwNjpbWzE3MTVdLDI1Nl0sNjQ0MDc6W1sxNzE1XSwyNTZdLDY0NDA4OltbMTcxNV0sMjU2XSw2NDQwOTpbWzE3MTVdLDI1Nl0sNjQ0MTA6W1sxNzEzXSwyNTZdLDY0NDExOltbMTcxM10sMjU2XSw2NDQxMjpbWzE3MTNdLDI1Nl0sNjQ0MTM6W1sxNzEzXSwyNTZdLDY0NDE0OltbMTcyMl0sMjU2XSw2NDQxNTpbWzE3MjJdLDI1Nl0sNjQ0MTY6W1sxNzIzXSwyNTZdLDY0NDE3OltbMTcyM10sMjU2XSw2NDQxODpbWzE3MjNdLDI1Nl0sNjQ0MTk6W1sxNzIzXSwyNTZdLDY0NDIwOltbMTcyOF0sMjU2XSw2NDQyMTpbWzE3MjhdLDI1Nl0sNjQ0MjI6W1sxNzI5XSwyNTZdLDY0NDIzOltbMTcyOV0sMjU2XSw2NDQyNDpbWzE3MjldLDI1Nl0sNjQ0MjU6W1sxNzI5XSwyNTZdLDY0NDI2OltbMTcyNl0sMjU2XSw2NDQyNzpbWzE3MjZdLDI1Nl0sNjQ0Mjg6W1sxNzI2XSwyNTZdLDY0NDI5OltbMTcyNl0sMjU2XSw2NDQzMDpbWzE3NDZdLDI1Nl0sNjQ0MzE6W1sxNzQ2XSwyNTZdLDY0NDMyOltbMTc0N10sMjU2XSw2NDQzMzpbWzE3NDddLDI1Nl0sNjQ0Njc6W1sxNzA5XSwyNTZdLDY0NDY4OltbMTcwOV0sMjU2XSw2NDQ2OTpbWzE3MDldLDI1Nl0sNjQ0NzA6W1sxNzA5XSwyNTZdLDY0NDcxOltbMTczNV0sMjU2XSw2NDQ3MjpbWzE3MzVdLDI1Nl0sNjQ0NzM6W1sxNzM0XSwyNTZdLDY0NDc0OltbMTczNF0sMjU2XSw2NDQ3NTpbWzE3MzZdLDI1Nl0sNjQ0NzY6W1sxNzM2XSwyNTZdLDY0NDc3OltbMTY1NV0sMjU2XSw2NDQ3ODpbWzE3MzldLDI1Nl0sNjQ0Nzk6W1sxNzM5XSwyNTZdLDY0NDgwOltbMTczM10sMjU2XSw2NDQ4MTpbWzE3MzNdLDI1Nl0sNjQ0ODI6W1sxNzM3XSwyNTZdLDY0NDgzOltbMTczN10sMjU2XSw2NDQ4NDpbWzE3NDRdLDI1Nl0sNjQ0ODU6W1sxNzQ0XSwyNTZdLDY0NDg2OltbMTc0NF0sMjU2XSw2NDQ4NzpbWzE3NDRdLDI1Nl0sNjQ0ODg6W1sxNjA5XSwyNTZdLDY0NDg5OltbMTYwOV0sMjU2XSw2NDQ5MDpbWzE1NzQsMTU3NV0sMjU2XSw2NDQ5MTpbWzE1NzQsMTU3NV0sMjU2XSw2NDQ5MjpbWzE1NzQsMTc0OV0sMjU2XSw2NDQ5MzpbWzE1NzQsMTc0OV0sMjU2XSw2NDQ5NDpbWzE1NzQsMTYwOF0sMjU2XSw2NDQ5NTpbWzE1NzQsMTYwOF0sMjU2XSw2NDQ5NjpbWzE1NzQsMTczNV0sMjU2XSw2NDQ5NzpbWzE1NzQsMTczNV0sMjU2XSw2NDQ5ODpbWzE1NzQsMTczNF0sMjU2XSw2NDQ5OTpbWzE1NzQsMTczNF0sMjU2XSw2NDUwMDpbWzE1NzQsMTczNl0sMjU2XSw2NDUwMTpbWzE1NzQsMTczNl0sMjU2XSw2NDUwMjpbWzE1NzQsMTc0NF0sMjU2XSw2NDUwMzpbWzE1NzQsMTc0NF0sMjU2XSw2NDUwNDpbWzE1NzQsMTc0NF0sMjU2XSw2NDUwNTpbWzE1NzQsMTYwOV0sMjU2XSw2NDUwNjpbWzE1NzQsMTYwOV0sMjU2XSw2NDUwNzpbWzE1NzQsMTYwOV0sMjU2XSw2NDUwODpbWzE3NDBdLDI1Nl0sNjQ1MDk6W1sxNzQwXSwyNTZdLDY0NTEwOltbMTc0MF0sMjU2XSw2NDUxMTpbWzE3NDBdLDI1Nl19LFxuNjQ1MTI6ezY0NTEyOltbMTU3NCwxNTgwXSwyNTZdLDY0NTEzOltbMTU3NCwxNTgxXSwyNTZdLDY0NTE0OltbMTU3NCwxNjA1XSwyNTZdLDY0NTE1OltbMTU3NCwxNjA5XSwyNTZdLDY0NTE2OltbMTU3NCwxNjEwXSwyNTZdLDY0NTE3OltbMTU3NiwxNTgwXSwyNTZdLDY0NTE4OltbMTU3NiwxNTgxXSwyNTZdLDY0NTE5OltbMTU3NiwxNTgyXSwyNTZdLDY0NTIwOltbMTU3NiwxNjA1XSwyNTZdLDY0NTIxOltbMTU3NiwxNjA5XSwyNTZdLDY0NTIyOltbMTU3NiwxNjEwXSwyNTZdLDY0NTIzOltbMTU3OCwxNTgwXSwyNTZdLDY0NTI0OltbMTU3OCwxNTgxXSwyNTZdLDY0NTI1OltbMTU3OCwxNTgyXSwyNTZdLDY0NTI2OltbMTU3OCwxNjA1XSwyNTZdLDY0NTI3OltbMTU3OCwxNjA5XSwyNTZdLDY0NTI4OltbMTU3OCwxNjEwXSwyNTZdLDY0NTI5OltbMTU3OSwxNTgwXSwyNTZdLDY0NTMwOltbMTU3OSwxNjA1XSwyNTZdLDY0NTMxOltbMTU3OSwxNjA5XSwyNTZdLDY0NTMyOltbMTU3OSwxNjEwXSwyNTZdLDY0NTMzOltbMTU4MCwxNTgxXSwyNTZdLDY0NTM0OltbMTU4MCwxNjA1XSwyNTZdLDY0NTM1OltbMTU4MSwxNTgwXSwyNTZdLDY0NTM2OltbMTU4MSwxNjA1XSwyNTZdLDY0NTM3OltbMTU4MiwxNTgwXSwyNTZdLDY0NTM4OltbMTU4MiwxNTgxXSwyNTZdLDY0NTM5OltbMTU4MiwxNjA1XSwyNTZdLDY0NTQwOltbMTU4NywxNTgwXSwyNTZdLDY0NTQxOltbMTU4NywxNTgxXSwyNTZdLDY0NTQyOltbMTU4NywxNTgyXSwyNTZdLDY0NTQzOltbMTU4NywxNjA1XSwyNTZdLDY0NTQ0OltbMTU4OSwxNTgxXSwyNTZdLDY0NTQ1OltbMTU4OSwxNjA1XSwyNTZdLDY0NTQ2OltbMTU5MCwxNTgwXSwyNTZdLDY0NTQ3OltbMTU5MCwxNTgxXSwyNTZdLDY0NTQ4OltbMTU5MCwxNTgyXSwyNTZdLDY0NTQ5OltbMTU5MCwxNjA1XSwyNTZdLDY0NTUwOltbMTU5MSwxNTgxXSwyNTZdLDY0NTUxOltbMTU5MSwxNjA1XSwyNTZdLDY0NTUyOltbMTU5MiwxNjA1XSwyNTZdLDY0NTUzOltbMTU5MywxNTgwXSwyNTZdLDY0NTU0OltbMTU5MywxNjA1XSwyNTZdLDY0NTU1OltbMTU5NCwxNTgwXSwyNTZdLDY0NTU2OltbMTU5NCwxNjA1XSwyNTZdLDY0NTU3OltbMTYwMSwxNTgwXSwyNTZdLDY0NTU4OltbMTYwMSwxNTgxXSwyNTZdLDY0NTU5OltbMTYwMSwxNTgyXSwyNTZdLDY0NTYwOltbMTYwMSwxNjA1XSwyNTZdLDY0NTYxOltbMTYwMSwxNjA5XSwyNTZdLDY0NTYyOltbMTYwMSwxNjEwXSwyNTZdLDY0NTYzOltbMTYwMiwxNTgxXSwyNTZdLDY0NTY0OltbMTYwMiwxNjA1XSwyNTZdLDY0NTY1OltbMTYwMiwxNjA5XSwyNTZdLDY0NTY2OltbMTYwMiwxNjEwXSwyNTZdLDY0NTY3OltbMTYwMywxNTc1XSwyNTZdLDY0NTY4OltbMTYwMywxNTgwXSwyNTZdLDY0NTY5OltbMTYwMywxNTgxXSwyNTZdLDY0NTcwOltbMTYwMywxNTgyXSwyNTZdLDY0NTcxOltbMTYwMywxNjA0XSwyNTZdLDY0NTcyOltbMTYwMywxNjA1XSwyNTZdLDY0NTczOltbMTYwMywxNjA5XSwyNTZdLDY0NTc0OltbMTYwMywxNjEwXSwyNTZdLDY0NTc1OltbMTYwNCwxNTgwXSwyNTZdLDY0NTc2OltbMTYwNCwxNTgxXSwyNTZdLDY0NTc3OltbMTYwNCwxNTgyXSwyNTZdLDY0NTc4OltbMTYwNCwxNjA1XSwyNTZdLDY0NTc5OltbMTYwNCwxNjA5XSwyNTZdLDY0NTgwOltbMTYwNCwxNjEwXSwyNTZdLDY0NTgxOltbMTYwNSwxNTgwXSwyNTZdLDY0NTgyOltbMTYwNSwxNTgxXSwyNTZdLDY0NTgzOltbMTYwNSwxNTgyXSwyNTZdLDY0NTg0OltbMTYwNSwxNjA1XSwyNTZdLDY0NTg1OltbMTYwNSwxNjA5XSwyNTZdLDY0NTg2OltbMTYwNSwxNjEwXSwyNTZdLDY0NTg3OltbMTYwNiwxNTgwXSwyNTZdLDY0NTg4OltbMTYwNiwxNTgxXSwyNTZdLDY0NTg5OltbMTYwNiwxNTgyXSwyNTZdLDY0NTkwOltbMTYwNiwxNjA1XSwyNTZdLDY0NTkxOltbMTYwNiwxNjA5XSwyNTZdLDY0NTkyOltbMTYwNiwxNjEwXSwyNTZdLDY0NTkzOltbMTYwNywxNTgwXSwyNTZdLDY0NTk0OltbMTYwNywxNjA1XSwyNTZdLDY0NTk1OltbMTYwNywxNjA5XSwyNTZdLDY0NTk2OltbMTYwNywxNjEwXSwyNTZdLDY0NTk3OltbMTYxMCwxNTgwXSwyNTZdLDY0NTk4OltbMTYxMCwxNTgxXSwyNTZdLDY0NTk5OltbMTYxMCwxNTgyXSwyNTZdLDY0NjAwOltbMTYxMCwxNjA1XSwyNTZdLDY0NjAxOltbMTYxMCwxNjA5XSwyNTZdLDY0NjAyOltbMTYxMCwxNjEwXSwyNTZdLDY0NjAzOltbMTU4NCwxNjQ4XSwyNTZdLDY0NjA0OltbMTU4NSwxNjQ4XSwyNTZdLDY0NjA1OltbMTYwOSwxNjQ4XSwyNTZdLDY0NjA2OltbMzIsMTYxMiwxNjE3XSwyNTZdLDY0NjA3OltbMzIsMTYxMywxNjE3XSwyNTZdLDY0NjA4OltbMzIsMTYxNCwxNjE3XSwyNTZdLDY0NjA5OltbMzIsMTYxNSwxNjE3XSwyNTZdLDY0NjEwOltbMzIsMTYxNiwxNjE3XSwyNTZdLDY0NjExOltbMzIsMTYxNywxNjQ4XSwyNTZdLDY0NjEyOltbMTU3NCwxNTg1XSwyNTZdLDY0NjEzOltbMTU3NCwxNTg2XSwyNTZdLDY0NjE0OltbMTU3NCwxNjA1XSwyNTZdLDY0NjE1OltbMTU3NCwxNjA2XSwyNTZdLDY0NjE2OltbMTU3NCwxNjA5XSwyNTZdLDY0NjE3OltbMTU3NCwxNjEwXSwyNTZdLDY0NjE4OltbMTU3NiwxNTg1XSwyNTZdLDY0NjE5OltbMTU3NiwxNTg2XSwyNTZdLDY0NjIwOltbMTU3NiwxNjA1XSwyNTZdLDY0NjIxOltbMTU3NiwxNjA2XSwyNTZdLDY0NjIyOltbMTU3NiwxNjA5XSwyNTZdLDY0NjIzOltbMTU3NiwxNjEwXSwyNTZdLDY0NjI0OltbMTU3OCwxNTg1XSwyNTZdLDY0NjI1OltbMTU3OCwxNTg2XSwyNTZdLDY0NjI2OltbMTU3OCwxNjA1XSwyNTZdLDY0NjI3OltbMTU3OCwxNjA2XSwyNTZdLDY0NjI4OltbMTU3OCwxNjA5XSwyNTZdLDY0NjI5OltbMTU3OCwxNjEwXSwyNTZdLDY0NjMwOltbMTU3OSwxNTg1XSwyNTZdLDY0NjMxOltbMTU3OSwxNTg2XSwyNTZdLDY0NjMyOltbMTU3OSwxNjA1XSwyNTZdLDY0NjMzOltbMTU3OSwxNjA2XSwyNTZdLDY0NjM0OltbMTU3OSwxNjA5XSwyNTZdLDY0NjM1OltbMTU3OSwxNjEwXSwyNTZdLDY0NjM2OltbMTYwMSwxNjA5XSwyNTZdLDY0NjM3OltbMTYwMSwxNjEwXSwyNTZdLDY0NjM4OltbMTYwMiwxNjA5XSwyNTZdLDY0NjM5OltbMTYwMiwxNjEwXSwyNTZdLDY0NjQwOltbMTYwMywxNTc1XSwyNTZdLDY0NjQxOltbMTYwMywxNjA0XSwyNTZdLDY0NjQyOltbMTYwMywxNjA1XSwyNTZdLDY0NjQzOltbMTYwMywxNjA5XSwyNTZdLDY0NjQ0OltbMTYwMywxNjEwXSwyNTZdLDY0NjQ1OltbMTYwNCwxNjA1XSwyNTZdLDY0NjQ2OltbMTYwNCwxNjA5XSwyNTZdLDY0NjQ3OltbMTYwNCwxNjEwXSwyNTZdLDY0NjQ4OltbMTYwNSwxNTc1XSwyNTZdLDY0NjQ5OltbMTYwNSwxNjA1XSwyNTZdLDY0NjUwOltbMTYwNiwxNTg1XSwyNTZdLDY0NjUxOltbMTYwNiwxNTg2XSwyNTZdLDY0NjUyOltbMTYwNiwxNjA1XSwyNTZdLDY0NjUzOltbMTYwNiwxNjA2XSwyNTZdLDY0NjU0OltbMTYwNiwxNjA5XSwyNTZdLDY0NjU1OltbMTYwNiwxNjEwXSwyNTZdLDY0NjU2OltbMTYwOSwxNjQ4XSwyNTZdLDY0NjU3OltbMTYxMCwxNTg1XSwyNTZdLDY0NjU4OltbMTYxMCwxNTg2XSwyNTZdLDY0NjU5OltbMTYxMCwxNjA1XSwyNTZdLDY0NjYwOltbMTYxMCwxNjA2XSwyNTZdLDY0NjYxOltbMTYxMCwxNjA5XSwyNTZdLDY0NjYyOltbMTYxMCwxNjEwXSwyNTZdLDY0NjYzOltbMTU3NCwxNTgwXSwyNTZdLDY0NjY0OltbMTU3NCwxNTgxXSwyNTZdLDY0NjY1OltbMTU3NCwxNTgyXSwyNTZdLDY0NjY2OltbMTU3NCwxNjA1XSwyNTZdLDY0NjY3OltbMTU3NCwxNjA3XSwyNTZdLDY0NjY4OltbMTU3NiwxNTgwXSwyNTZdLDY0NjY5OltbMTU3NiwxNTgxXSwyNTZdLDY0NjcwOltbMTU3NiwxNTgyXSwyNTZdLDY0NjcxOltbMTU3NiwxNjA1XSwyNTZdLDY0NjcyOltbMTU3NiwxNjA3XSwyNTZdLDY0NjczOltbMTU3OCwxNTgwXSwyNTZdLDY0Njc0OltbMTU3OCwxNTgxXSwyNTZdLDY0Njc1OltbMTU3OCwxNTgyXSwyNTZdLDY0Njc2OltbMTU3OCwxNjA1XSwyNTZdLDY0Njc3OltbMTU3OCwxNjA3XSwyNTZdLDY0Njc4OltbMTU3OSwxNjA1XSwyNTZdLDY0Njc5OltbMTU4MCwxNTgxXSwyNTZdLDY0NjgwOltbMTU4MCwxNjA1XSwyNTZdLDY0NjgxOltbMTU4MSwxNTgwXSwyNTZdLDY0NjgyOltbMTU4MSwxNjA1XSwyNTZdLDY0NjgzOltbMTU4MiwxNTgwXSwyNTZdLDY0Njg0OltbMTU4MiwxNjA1XSwyNTZdLDY0Njg1OltbMTU4NywxNTgwXSwyNTZdLDY0Njg2OltbMTU4NywxNTgxXSwyNTZdLDY0Njg3OltbMTU4NywxNTgyXSwyNTZdLDY0Njg4OltbMTU4NywxNjA1XSwyNTZdLDY0Njg5OltbMTU4OSwxNTgxXSwyNTZdLDY0NjkwOltbMTU4OSwxNTgyXSwyNTZdLDY0NjkxOltbMTU4OSwxNjA1XSwyNTZdLDY0NjkyOltbMTU5MCwxNTgwXSwyNTZdLDY0NjkzOltbMTU5MCwxNTgxXSwyNTZdLDY0Njk0OltbMTU5MCwxNTgyXSwyNTZdLDY0Njk1OltbMTU5MCwxNjA1XSwyNTZdLDY0Njk2OltbMTU5MSwxNTgxXSwyNTZdLDY0Njk3OltbMTU5MiwxNjA1XSwyNTZdLDY0Njk4OltbMTU5MywxNTgwXSwyNTZdLDY0Njk5OltbMTU5MywxNjA1XSwyNTZdLDY0NzAwOltbMTU5NCwxNTgwXSwyNTZdLDY0NzAxOltbMTU5NCwxNjA1XSwyNTZdLDY0NzAyOltbMTYwMSwxNTgwXSwyNTZdLDY0NzAzOltbMTYwMSwxNTgxXSwyNTZdLDY0NzA0OltbMTYwMSwxNTgyXSwyNTZdLDY0NzA1OltbMTYwMSwxNjA1XSwyNTZdLDY0NzA2OltbMTYwMiwxNTgxXSwyNTZdLDY0NzA3OltbMTYwMiwxNjA1XSwyNTZdLDY0NzA4OltbMTYwMywxNTgwXSwyNTZdLDY0NzA5OltbMTYwMywxNTgxXSwyNTZdLDY0NzEwOltbMTYwMywxNTgyXSwyNTZdLDY0NzExOltbMTYwMywxNjA0XSwyNTZdLDY0NzEyOltbMTYwMywxNjA1XSwyNTZdLDY0NzEzOltbMTYwNCwxNTgwXSwyNTZdLDY0NzE0OltbMTYwNCwxNTgxXSwyNTZdLDY0NzE1OltbMTYwNCwxNTgyXSwyNTZdLDY0NzE2OltbMTYwNCwxNjA1XSwyNTZdLDY0NzE3OltbMTYwNCwxNjA3XSwyNTZdLDY0NzE4OltbMTYwNSwxNTgwXSwyNTZdLDY0NzE5OltbMTYwNSwxNTgxXSwyNTZdLDY0NzIwOltbMTYwNSwxNTgyXSwyNTZdLDY0NzIxOltbMTYwNSwxNjA1XSwyNTZdLDY0NzIyOltbMTYwNiwxNTgwXSwyNTZdLDY0NzIzOltbMTYwNiwxNTgxXSwyNTZdLDY0NzI0OltbMTYwNiwxNTgyXSwyNTZdLDY0NzI1OltbMTYwNiwxNjA1XSwyNTZdLDY0NzI2OltbMTYwNiwxNjA3XSwyNTZdLDY0NzI3OltbMTYwNywxNTgwXSwyNTZdLDY0NzI4OltbMTYwNywxNjA1XSwyNTZdLDY0NzI5OltbMTYwNywxNjQ4XSwyNTZdLDY0NzMwOltbMTYxMCwxNTgwXSwyNTZdLDY0NzMxOltbMTYxMCwxNTgxXSwyNTZdLDY0NzMyOltbMTYxMCwxNTgyXSwyNTZdLDY0NzMzOltbMTYxMCwxNjA1XSwyNTZdLDY0NzM0OltbMTYxMCwxNjA3XSwyNTZdLDY0NzM1OltbMTU3NCwxNjA1XSwyNTZdLDY0NzM2OltbMTU3NCwxNjA3XSwyNTZdLDY0NzM3OltbMTU3NiwxNjA1XSwyNTZdLDY0NzM4OltbMTU3NiwxNjA3XSwyNTZdLDY0NzM5OltbMTU3OCwxNjA1XSwyNTZdLDY0NzQwOltbMTU3OCwxNjA3XSwyNTZdLDY0NzQxOltbMTU3OSwxNjA1XSwyNTZdLDY0NzQyOltbMTU3OSwxNjA3XSwyNTZdLDY0NzQzOltbMTU4NywxNjA1XSwyNTZdLDY0NzQ0OltbMTU4NywxNjA3XSwyNTZdLDY0NzQ1OltbMTU4OCwxNjA1XSwyNTZdLDY0NzQ2OltbMTU4OCwxNjA3XSwyNTZdLDY0NzQ3OltbMTYwMywxNjA0XSwyNTZdLDY0NzQ4OltbMTYwMywxNjA1XSwyNTZdLDY0NzQ5OltbMTYwNCwxNjA1XSwyNTZdLDY0NzUwOltbMTYwNiwxNjA1XSwyNTZdLDY0NzUxOltbMTYwNiwxNjA3XSwyNTZdLDY0NzUyOltbMTYxMCwxNjA1XSwyNTZdLDY0NzUzOltbMTYxMCwxNjA3XSwyNTZdLDY0NzU0OltbMTYwMCwxNjE0LDE2MTddLDI1Nl0sNjQ3NTU6W1sxNjAwLDE2MTUsMTYxN10sMjU2XSw2NDc1NjpbWzE2MDAsMTYxNiwxNjE3XSwyNTZdLDY0NzU3OltbMTU5MSwxNjA5XSwyNTZdLDY0NzU4OltbMTU5MSwxNjEwXSwyNTZdLDY0NzU5OltbMTU5MywxNjA5XSwyNTZdLDY0NzYwOltbMTU5MywxNjEwXSwyNTZdLDY0NzYxOltbMTU5NCwxNjA5XSwyNTZdLDY0NzYyOltbMTU5NCwxNjEwXSwyNTZdLDY0NzYzOltbMTU4NywxNjA5XSwyNTZdLDY0NzY0OltbMTU4NywxNjEwXSwyNTZdLDY0NzY1OltbMTU4OCwxNjA5XSwyNTZdLDY0NzY2OltbMTU4OCwxNjEwXSwyNTZdLDY0NzY3OltbMTU4MSwxNjA5XSwyNTZdfSxcbjY0NzY4Ons2NDc2ODpbWzE1ODEsMTYxMF0sMjU2XSw2NDc2OTpbWzE1ODAsMTYwOV0sMjU2XSw2NDc3MDpbWzE1ODAsMTYxMF0sMjU2XSw2NDc3MTpbWzE1ODIsMTYwOV0sMjU2XSw2NDc3MjpbWzE1ODIsMTYxMF0sMjU2XSw2NDc3MzpbWzE1ODksMTYwOV0sMjU2XSw2NDc3NDpbWzE1ODksMTYxMF0sMjU2XSw2NDc3NTpbWzE1OTAsMTYwOV0sMjU2XSw2NDc3NjpbWzE1OTAsMTYxMF0sMjU2XSw2NDc3NzpbWzE1ODgsMTU4MF0sMjU2XSw2NDc3ODpbWzE1ODgsMTU4MV0sMjU2XSw2NDc3OTpbWzE1ODgsMTU4Ml0sMjU2XSw2NDc4MDpbWzE1ODgsMTYwNV0sMjU2XSw2NDc4MTpbWzE1ODgsMTU4NV0sMjU2XSw2NDc4MjpbWzE1ODcsMTU4NV0sMjU2XSw2NDc4MzpbWzE1ODksMTU4NV0sMjU2XSw2NDc4NDpbWzE1OTAsMTU4NV0sMjU2XSw2NDc4NTpbWzE1OTEsMTYwOV0sMjU2XSw2NDc4NjpbWzE1OTEsMTYxMF0sMjU2XSw2NDc4NzpbWzE1OTMsMTYwOV0sMjU2XSw2NDc4ODpbWzE1OTMsMTYxMF0sMjU2XSw2NDc4OTpbWzE1OTQsMTYwOV0sMjU2XSw2NDc5MDpbWzE1OTQsMTYxMF0sMjU2XSw2NDc5MTpbWzE1ODcsMTYwOV0sMjU2XSw2NDc5MjpbWzE1ODcsMTYxMF0sMjU2XSw2NDc5MzpbWzE1ODgsMTYwOV0sMjU2XSw2NDc5NDpbWzE1ODgsMTYxMF0sMjU2XSw2NDc5NTpbWzE1ODEsMTYwOV0sMjU2XSw2NDc5NjpbWzE1ODEsMTYxMF0sMjU2XSw2NDc5NzpbWzE1ODAsMTYwOV0sMjU2XSw2NDc5ODpbWzE1ODAsMTYxMF0sMjU2XSw2NDc5OTpbWzE1ODIsMTYwOV0sMjU2XSw2NDgwMDpbWzE1ODIsMTYxMF0sMjU2XSw2NDgwMTpbWzE1ODksMTYwOV0sMjU2XSw2NDgwMjpbWzE1ODksMTYxMF0sMjU2XSw2NDgwMzpbWzE1OTAsMTYwOV0sMjU2XSw2NDgwNDpbWzE1OTAsMTYxMF0sMjU2XSw2NDgwNTpbWzE1ODgsMTU4MF0sMjU2XSw2NDgwNjpbWzE1ODgsMTU4MV0sMjU2XSw2NDgwNzpbWzE1ODgsMTU4Ml0sMjU2XSw2NDgwODpbWzE1ODgsMTYwNV0sMjU2XSw2NDgwOTpbWzE1ODgsMTU4NV0sMjU2XSw2NDgxMDpbWzE1ODcsMTU4NV0sMjU2XSw2NDgxMTpbWzE1ODksMTU4NV0sMjU2XSw2NDgxMjpbWzE1OTAsMTU4NV0sMjU2XSw2NDgxMzpbWzE1ODgsMTU4MF0sMjU2XSw2NDgxNDpbWzE1ODgsMTU4MV0sMjU2XSw2NDgxNTpbWzE1ODgsMTU4Ml0sMjU2XSw2NDgxNjpbWzE1ODgsMTYwNV0sMjU2XSw2NDgxNzpbWzE1ODcsMTYwN10sMjU2XSw2NDgxODpbWzE1ODgsMTYwN10sMjU2XSw2NDgxOTpbWzE1OTEsMTYwNV0sMjU2XSw2NDgyMDpbWzE1ODcsMTU4MF0sMjU2XSw2NDgyMTpbWzE1ODcsMTU4MV0sMjU2XSw2NDgyMjpbWzE1ODcsMTU4Ml0sMjU2XSw2NDgyMzpbWzE1ODgsMTU4MF0sMjU2XSw2NDgyNDpbWzE1ODgsMTU4MV0sMjU2XSw2NDgyNTpbWzE1ODgsMTU4Ml0sMjU2XSw2NDgyNjpbWzE1OTEsMTYwNV0sMjU2XSw2NDgyNzpbWzE1OTIsMTYwNV0sMjU2XSw2NDgyODpbWzE1NzUsMTYxMV0sMjU2XSw2NDgyOTpbWzE1NzUsMTYxMV0sMjU2XSw2NDg0ODpbWzE1NzgsMTU4MCwxNjA1XSwyNTZdLDY0ODQ5OltbMTU3OCwxNTgxLDE1ODBdLDI1Nl0sNjQ4NTA6W1sxNTc4LDE1ODEsMTU4MF0sMjU2XSw2NDg1MTpbWzE1NzgsMTU4MSwxNjA1XSwyNTZdLDY0ODUyOltbMTU3OCwxNTgyLDE2MDVdLDI1Nl0sNjQ4NTM6W1sxNTc4LDE2MDUsMTU4MF0sMjU2XSw2NDg1NDpbWzE1NzgsMTYwNSwxNTgxXSwyNTZdLDY0ODU1OltbMTU3OCwxNjA1LDE1ODJdLDI1Nl0sNjQ4NTY6W1sxNTgwLDE2MDUsMTU4MV0sMjU2XSw2NDg1NzpbWzE1ODAsMTYwNSwxNTgxXSwyNTZdLDY0ODU4OltbMTU4MSwxNjA1LDE2MTBdLDI1Nl0sNjQ4NTk6W1sxNTgxLDE2MDUsMTYwOV0sMjU2XSw2NDg2MDpbWzE1ODcsMTU4MSwxNTgwXSwyNTZdLDY0ODYxOltbMTU4NywxNTgwLDE1ODFdLDI1Nl0sNjQ4NjI6W1sxNTg3LDE1ODAsMTYwOV0sMjU2XSw2NDg2MzpbWzE1ODcsMTYwNSwxNTgxXSwyNTZdLDY0ODY0OltbMTU4NywxNjA1LDE1ODFdLDI1Nl0sNjQ4NjU6W1sxNTg3LDE2MDUsMTU4MF0sMjU2XSw2NDg2NjpbWzE1ODcsMTYwNSwxNjA1XSwyNTZdLDY0ODY3OltbMTU4NywxNjA1LDE2MDVdLDI1Nl0sNjQ4Njg6W1sxNTg5LDE1ODEsMTU4MV0sMjU2XSw2NDg2OTpbWzE1ODksMTU4MSwxNTgxXSwyNTZdLDY0ODcwOltbMTU4OSwxNjA1LDE2MDVdLDI1Nl0sNjQ4NzE6W1sxNTg4LDE1ODEsMTYwNV0sMjU2XSw2NDg3MjpbWzE1ODgsMTU4MSwxNjA1XSwyNTZdLDY0ODczOltbMTU4OCwxNTgwLDE2MTBdLDI1Nl0sNjQ4NzQ6W1sxNTg4LDE2MDUsMTU4Ml0sMjU2XSw2NDg3NTpbWzE1ODgsMTYwNSwxNTgyXSwyNTZdLDY0ODc2OltbMTU4OCwxNjA1LDE2MDVdLDI1Nl0sNjQ4Nzc6W1sxNTg4LDE2MDUsMTYwNV0sMjU2XSw2NDg3ODpbWzE1OTAsMTU4MSwxNjA5XSwyNTZdLDY0ODc5OltbMTU5MCwxNTgyLDE2MDVdLDI1Nl0sNjQ4ODA6W1sxNTkwLDE1ODIsMTYwNV0sMjU2XSw2NDg4MTpbWzE1OTEsMTYwNSwxNTgxXSwyNTZdLDY0ODgyOltbMTU5MSwxNjA1LDE1ODFdLDI1Nl0sNjQ4ODM6W1sxNTkxLDE2MDUsMTYwNV0sMjU2XSw2NDg4NDpbWzE1OTEsMTYwNSwxNjEwXSwyNTZdLDY0ODg1OltbMTU5MywxNTgwLDE2MDVdLDI1Nl0sNjQ4ODY6W1sxNTkzLDE2MDUsMTYwNV0sMjU2XSw2NDg4NzpbWzE1OTMsMTYwNSwxNjA1XSwyNTZdLDY0ODg4OltbMTU5MywxNjA1LDE2MDldLDI1Nl0sNjQ4ODk6W1sxNTk0LDE2MDUsMTYwNV0sMjU2XSw2NDg5MDpbWzE1OTQsMTYwNSwxNjEwXSwyNTZdLDY0ODkxOltbMTU5NCwxNjA1LDE2MDldLDI1Nl0sNjQ4OTI6W1sxNjAxLDE1ODIsMTYwNV0sMjU2XSw2NDg5MzpbWzE2MDEsMTU4MiwxNjA1XSwyNTZdLDY0ODk0OltbMTYwMiwxNjA1LDE1ODFdLDI1Nl0sNjQ4OTU6W1sxNjAyLDE2MDUsMTYwNV0sMjU2XSw2NDg5NjpbWzE2MDQsMTU4MSwxNjA1XSwyNTZdLDY0ODk3OltbMTYwNCwxNTgxLDE2MTBdLDI1Nl0sNjQ4OTg6W1sxNjA0LDE1ODEsMTYwOV0sMjU2XSw2NDg5OTpbWzE2MDQsMTU4MCwxNTgwXSwyNTZdLDY0OTAwOltbMTYwNCwxNTgwLDE1ODBdLDI1Nl0sNjQ5MDE6W1sxNjA0LDE1ODIsMTYwNV0sMjU2XSw2NDkwMjpbWzE2MDQsMTU4MiwxNjA1XSwyNTZdLDY0OTAzOltbMTYwNCwxNjA1LDE1ODFdLDI1Nl0sNjQ5MDQ6W1sxNjA0LDE2MDUsMTU4MV0sMjU2XSw2NDkwNTpbWzE2MDUsMTU4MSwxNTgwXSwyNTZdLDY0OTA2OltbMTYwNSwxNTgxLDE2MDVdLDI1Nl0sNjQ5MDc6W1sxNjA1LDE1ODEsMTYxMF0sMjU2XSw2NDkwODpbWzE2MDUsMTU4MCwxNTgxXSwyNTZdLDY0OTA5OltbMTYwNSwxNTgwLDE2MDVdLDI1Nl0sNjQ5MTA6W1sxNjA1LDE1ODIsMTU4MF0sMjU2XSw2NDkxMTpbWzE2MDUsMTU4MiwxNjA1XSwyNTZdLDY0OTE0OltbMTYwNSwxNTgwLDE1ODJdLDI1Nl0sNjQ5MTU6W1sxNjA3LDE2MDUsMTU4MF0sMjU2XSw2NDkxNjpbWzE2MDcsMTYwNSwxNjA1XSwyNTZdLDY0OTE3OltbMTYwNiwxNTgxLDE2MDVdLDI1Nl0sNjQ5MTg6W1sxNjA2LDE1ODEsMTYwOV0sMjU2XSw2NDkxOTpbWzE2MDYsMTU4MCwxNjA1XSwyNTZdLDY0OTIwOltbMTYwNiwxNTgwLDE2MDVdLDI1Nl0sNjQ5MjE6W1sxNjA2LDE1ODAsMTYwOV0sMjU2XSw2NDkyMjpbWzE2MDYsMTYwNSwxNjEwXSwyNTZdLDY0OTIzOltbMTYwNiwxNjA1LDE2MDldLDI1Nl0sNjQ5MjQ6W1sxNjEwLDE2MDUsMTYwNV0sMjU2XSw2NDkyNTpbWzE2MTAsMTYwNSwxNjA1XSwyNTZdLDY0OTI2OltbMTU3NiwxNTgyLDE2MTBdLDI1Nl0sNjQ5Mjc6W1sxNTc4LDE1ODAsMTYxMF0sMjU2XSw2NDkyODpbWzE1NzgsMTU4MCwxNjA5XSwyNTZdLDY0OTI5OltbMTU3OCwxNTgyLDE2MTBdLDI1Nl0sNjQ5MzA6W1sxNTc4LDE1ODIsMTYwOV0sMjU2XSw2NDkzMTpbWzE1NzgsMTYwNSwxNjEwXSwyNTZdLDY0OTMyOltbMTU3OCwxNjA1LDE2MDldLDI1Nl0sNjQ5MzM6W1sxNTgwLDE2MDUsMTYxMF0sMjU2XSw2NDkzNDpbWzE1ODAsMTU4MSwxNjA5XSwyNTZdLDY0OTM1OltbMTU4MCwxNjA1LDE2MDldLDI1Nl0sNjQ5MzY6W1sxNTg3LDE1ODIsMTYwOV0sMjU2XSw2NDkzNzpbWzE1ODksMTU4MSwxNjEwXSwyNTZdLDY0OTM4OltbMTU4OCwxNTgxLDE2MTBdLDI1Nl0sNjQ5Mzk6W1sxNTkwLDE1ODEsMTYxMF0sMjU2XSw2NDk0MDpbWzE2MDQsMTU4MCwxNjEwXSwyNTZdLDY0OTQxOltbMTYwNCwxNjA1LDE2MTBdLDI1Nl0sNjQ5NDI6W1sxNjEwLDE1ODEsMTYxMF0sMjU2XSw2NDk0MzpbWzE2MTAsMTU4MCwxNjEwXSwyNTZdLDY0OTQ0OltbMTYxMCwxNjA1LDE2MTBdLDI1Nl0sNjQ5NDU6W1sxNjA1LDE2MDUsMTYxMF0sMjU2XSw2NDk0NjpbWzE2MDIsMTYwNSwxNjEwXSwyNTZdLDY0OTQ3OltbMTYwNiwxNTgxLDE2MTBdLDI1Nl0sNjQ5NDg6W1sxNjAyLDE2MDUsMTU4MV0sMjU2XSw2NDk0OTpbWzE2MDQsMTU4MSwxNjA1XSwyNTZdLDY0OTUwOltbMTU5MywxNjA1LDE2MTBdLDI1Nl0sNjQ5NTE6W1sxNjAzLDE2MDUsMTYxMF0sMjU2XSw2NDk1MjpbWzE2MDYsMTU4MCwxNTgxXSwyNTZdLDY0OTUzOltbMTYwNSwxNTgyLDE2MTBdLDI1Nl0sNjQ5NTQ6W1sxNjA0LDE1ODAsMTYwNV0sMjU2XSw2NDk1NTpbWzE2MDMsMTYwNSwxNjA1XSwyNTZdLDY0OTU2OltbMTYwNCwxNTgwLDE2MDVdLDI1Nl0sNjQ5NTc6W1sxNjA2LDE1ODAsMTU4MV0sMjU2XSw2NDk1ODpbWzE1ODAsMTU4MSwxNjEwXSwyNTZdLDY0OTU5OltbMTU4MSwxNTgwLDE2MTBdLDI1Nl0sNjQ5NjA6W1sxNjA1LDE1ODAsMTYxMF0sMjU2XSw2NDk2MTpbWzE2MDEsMTYwNSwxNjEwXSwyNTZdLDY0OTYyOltbMTU3NiwxNTgxLDE2MTBdLDI1Nl0sNjQ5NjM6W1sxNjAzLDE2MDUsMTYwNV0sMjU2XSw2NDk2NDpbWzE1OTMsMTU4MCwxNjA1XSwyNTZdLDY0OTY1OltbMTU4OSwxNjA1LDE2MDVdLDI1Nl0sNjQ5NjY6W1sxNTg3LDE1ODIsMTYxMF0sMjU2XSw2NDk2NzpbWzE2MDYsMTU4MCwxNjEwXSwyNTZdLDY1MDA4OltbMTU4OSwxNjA0LDE3NDZdLDI1Nl0sNjUwMDk6W1sxNjAyLDE2MDQsMTc0Nl0sMjU2XSw2NTAxMDpbWzE1NzUsMTYwNCwxNjA0LDE2MDddLDI1Nl0sNjUwMTE6W1sxNTc1LDE2MDMsMTU3NiwxNTg1XSwyNTZdLDY1MDEyOltbMTYwNSwxNTgxLDE2MDUsMTU4M10sMjU2XSw2NTAxMzpbWzE1ODksMTYwNCwxNTkzLDE2MDVdLDI1Nl0sNjUwMTQ6W1sxNTg1LDE1ODcsMTYwOCwxNjA0XSwyNTZdLDY1MDE1OltbMTU5MywxNjA0LDE2MTAsMTYwN10sMjU2XSw2NTAxNjpbWzE2MDgsMTU4NywxNjA0LDE2MDVdLDI1Nl0sNjUwMTc6W1sxNTg5LDE2MDQsMTYwOV0sMjU2XSw2NTAxODpbWzE1ODksMTYwNCwxNjA5LDMyLDE1NzUsMTYwNCwxNjA0LDE2MDcsMzIsMTU5MywxNjA0LDE2MTAsMTYwNywzMiwxNjA4LDE1ODcsMTYwNCwxNjA1XSwyNTZdLDY1MDE5OltbMTU4MCwxNjA0LDMyLDE1ODAsMTYwNCwxNTc1LDE2MDQsMTYwN10sMjU2XSw2NTAyMDpbWzE1ODUsMTc0MCwxNTc1LDE2MDRdLDI1Nl19LFxuNjUwMjQ6ezY1MDQwOltbNDRdLDI1Nl0sNjUwNDE6W1sxMjI4OV0sMjU2XSw2NTA0MjpbWzEyMjkwXSwyNTZdLDY1MDQzOltbNThdLDI1Nl0sNjUwNDQ6W1s1OV0sMjU2XSw2NTA0NTpbWzMzXSwyNTZdLDY1MDQ2OltbNjNdLDI1Nl0sNjUwNDc6W1sxMjMxMF0sMjU2XSw2NTA0ODpbWzEyMzExXSwyNTZdLDY1MDQ5OltbODIzMF0sMjU2XSw2NTA1NjpbLDIzMF0sNjUwNTc6WywyMzBdLDY1MDU4OlssMjMwXSw2NTA1OTpbLDIzMF0sNjUwNjA6WywyMzBdLDY1MDYxOlssMjMwXSw2NTA2MjpbLDIzMF0sNjUwNzI6W1s4MjI5XSwyNTZdLDY1MDczOltbODIxMl0sMjU2XSw2NTA3NDpbWzgyMTFdLDI1Nl0sNjUwNzU6W1s5NV0sMjU2XSw2NTA3NjpbWzk1XSwyNTZdLDY1MDc3OltbNDBdLDI1Nl0sNjUwNzg6W1s0MV0sMjU2XSw2NTA3OTpbWzEyM10sMjU2XSw2NTA4MDpbWzEyNV0sMjU2XSw2NTA4MTpbWzEyMzA4XSwyNTZdLDY1MDgyOltbMTIzMDldLDI1Nl0sNjUwODM6W1sxMjMwNF0sMjU2XSw2NTA4NDpbWzEyMzA1XSwyNTZdLDY1MDg1OltbMTIyOThdLDI1Nl0sNjUwODY6W1sxMjI5OV0sMjU2XSw2NTA4NzpbWzEyMjk2XSwyNTZdLDY1MDg4OltbMTIyOTddLDI1Nl0sNjUwODk6W1sxMjMwMF0sMjU2XSw2NTA5MDpbWzEyMzAxXSwyNTZdLDY1MDkxOltbMTIzMDJdLDI1Nl0sNjUwOTI6W1sxMjMwM10sMjU2XSw2NTA5NTpbWzkxXSwyNTZdLDY1MDk2OltbOTNdLDI1Nl0sNjUwOTc6W1s4MjU0XSwyNTZdLDY1MDk4OltbODI1NF0sMjU2XSw2NTA5OTpbWzgyNTRdLDI1Nl0sNjUxMDA6W1s4MjU0XSwyNTZdLDY1MTAxOltbOTVdLDI1Nl0sNjUxMDI6W1s5NV0sMjU2XSw2NTEwMzpbWzk1XSwyNTZdLDY1MTA0OltbNDRdLDI1Nl0sNjUxMDU6W1sxMjI4OV0sMjU2XSw2NTEwNjpbWzQ2XSwyNTZdLDY1MTA4OltbNTldLDI1Nl0sNjUxMDk6W1s1OF0sMjU2XSw2NTExMDpbWzYzXSwyNTZdLDY1MTExOltbMzNdLDI1Nl0sNjUxMTI6W1s4MjEyXSwyNTZdLDY1MTEzOltbNDBdLDI1Nl0sNjUxMTQ6W1s0MV0sMjU2XSw2NTExNTpbWzEyM10sMjU2XSw2NTExNjpbWzEyNV0sMjU2XSw2NTExNzpbWzEyMzA4XSwyNTZdLDY1MTE4OltbMTIzMDldLDI1Nl0sNjUxMTk6W1szNV0sMjU2XSw2NTEyMDpbWzM4XSwyNTZdLDY1MTIxOltbNDJdLDI1Nl0sNjUxMjI6W1s0M10sMjU2XSw2NTEyMzpbWzQ1XSwyNTZdLDY1MTI0OltbNjBdLDI1Nl0sNjUxMjU6W1s2Ml0sMjU2XSw2NTEyNjpbWzYxXSwyNTZdLDY1MTI4OltbOTJdLDI1Nl0sNjUxMjk6W1szNl0sMjU2XSw2NTEzMDpbWzM3XSwyNTZdLDY1MTMxOltbNjRdLDI1Nl0sNjUxMzY6W1szMiwxNjExXSwyNTZdLDY1MTM3OltbMTYwMCwxNjExXSwyNTZdLDY1MTM4OltbMzIsMTYxMl0sMjU2XSw2NTE0MDpbWzMyLDE2MTNdLDI1Nl0sNjUxNDI6W1szMiwxNjE0XSwyNTZdLDY1MTQzOltbMTYwMCwxNjE0XSwyNTZdLDY1MTQ0OltbMzIsMTYxNV0sMjU2XSw2NTE0NTpbWzE2MDAsMTYxNV0sMjU2XSw2NTE0NjpbWzMyLDE2MTZdLDI1Nl0sNjUxNDc6W1sxNjAwLDE2MTZdLDI1Nl0sNjUxNDg6W1szMiwxNjE3XSwyNTZdLDY1MTQ5OltbMTYwMCwxNjE3XSwyNTZdLDY1MTUwOltbMzIsMTYxOF0sMjU2XSw2NTE1MTpbWzE2MDAsMTYxOF0sMjU2XSw2NTE1MjpbWzE1NjldLDI1Nl0sNjUxNTM6W1sxNTcwXSwyNTZdLDY1MTU0OltbMTU3MF0sMjU2XSw2NTE1NTpbWzE1NzFdLDI1Nl0sNjUxNTY6W1sxNTcxXSwyNTZdLDY1MTU3OltbMTU3Ml0sMjU2XSw2NTE1ODpbWzE1NzJdLDI1Nl0sNjUxNTk6W1sxNTczXSwyNTZdLDY1MTYwOltbMTU3M10sMjU2XSw2NTE2MTpbWzE1NzRdLDI1Nl0sNjUxNjI6W1sxNTc0XSwyNTZdLDY1MTYzOltbMTU3NF0sMjU2XSw2NTE2NDpbWzE1NzRdLDI1Nl0sNjUxNjU6W1sxNTc1XSwyNTZdLDY1MTY2OltbMTU3NV0sMjU2XSw2NTE2NzpbWzE1NzZdLDI1Nl0sNjUxNjg6W1sxNTc2XSwyNTZdLDY1MTY5OltbMTU3Nl0sMjU2XSw2NTE3MDpbWzE1NzZdLDI1Nl0sNjUxNzE6W1sxNTc3XSwyNTZdLDY1MTcyOltbMTU3N10sMjU2XSw2NTE3MzpbWzE1NzhdLDI1Nl0sNjUxNzQ6W1sxNTc4XSwyNTZdLDY1MTc1OltbMTU3OF0sMjU2XSw2NTE3NjpbWzE1NzhdLDI1Nl0sNjUxNzc6W1sxNTc5XSwyNTZdLDY1MTc4OltbMTU3OV0sMjU2XSw2NTE3OTpbWzE1NzldLDI1Nl0sNjUxODA6W1sxNTc5XSwyNTZdLDY1MTgxOltbMTU4MF0sMjU2XSw2NTE4MjpbWzE1ODBdLDI1Nl0sNjUxODM6W1sxNTgwXSwyNTZdLDY1MTg0OltbMTU4MF0sMjU2XSw2NTE4NTpbWzE1ODFdLDI1Nl0sNjUxODY6W1sxNTgxXSwyNTZdLDY1MTg3OltbMTU4MV0sMjU2XSw2NTE4ODpbWzE1ODFdLDI1Nl0sNjUxODk6W1sxNTgyXSwyNTZdLDY1MTkwOltbMTU4Ml0sMjU2XSw2NTE5MTpbWzE1ODJdLDI1Nl0sNjUxOTI6W1sxNTgyXSwyNTZdLDY1MTkzOltbMTU4M10sMjU2XSw2NTE5NDpbWzE1ODNdLDI1Nl0sNjUxOTU6W1sxNTg0XSwyNTZdLDY1MTk2OltbMTU4NF0sMjU2XSw2NTE5NzpbWzE1ODVdLDI1Nl0sNjUxOTg6W1sxNTg1XSwyNTZdLDY1MTk5OltbMTU4Nl0sMjU2XSw2NTIwMDpbWzE1ODZdLDI1Nl0sNjUyMDE6W1sxNTg3XSwyNTZdLDY1MjAyOltbMTU4N10sMjU2XSw2NTIwMzpbWzE1ODddLDI1Nl0sNjUyMDQ6W1sxNTg3XSwyNTZdLDY1MjA1OltbMTU4OF0sMjU2XSw2NTIwNjpbWzE1ODhdLDI1Nl0sNjUyMDc6W1sxNTg4XSwyNTZdLDY1MjA4OltbMTU4OF0sMjU2XSw2NTIwOTpbWzE1ODldLDI1Nl0sNjUyMTA6W1sxNTg5XSwyNTZdLDY1MjExOltbMTU4OV0sMjU2XSw2NTIxMjpbWzE1ODldLDI1Nl0sNjUyMTM6W1sxNTkwXSwyNTZdLDY1MjE0OltbMTU5MF0sMjU2XSw2NTIxNTpbWzE1OTBdLDI1Nl0sNjUyMTY6W1sxNTkwXSwyNTZdLDY1MjE3OltbMTU5MV0sMjU2XSw2NTIxODpbWzE1OTFdLDI1Nl0sNjUyMTk6W1sxNTkxXSwyNTZdLDY1MjIwOltbMTU5MV0sMjU2XSw2NTIyMTpbWzE1OTJdLDI1Nl0sNjUyMjI6W1sxNTkyXSwyNTZdLDY1MjIzOltbMTU5Ml0sMjU2XSw2NTIyNDpbWzE1OTJdLDI1Nl0sNjUyMjU6W1sxNTkzXSwyNTZdLDY1MjI2OltbMTU5M10sMjU2XSw2NTIyNzpbWzE1OTNdLDI1Nl0sNjUyMjg6W1sxNTkzXSwyNTZdLDY1MjI5OltbMTU5NF0sMjU2XSw2NTIzMDpbWzE1OTRdLDI1Nl0sNjUyMzE6W1sxNTk0XSwyNTZdLDY1MjMyOltbMTU5NF0sMjU2XSw2NTIzMzpbWzE2MDFdLDI1Nl0sNjUyMzQ6W1sxNjAxXSwyNTZdLDY1MjM1OltbMTYwMV0sMjU2XSw2NTIzNjpbWzE2MDFdLDI1Nl0sNjUyMzc6W1sxNjAyXSwyNTZdLDY1MjM4OltbMTYwMl0sMjU2XSw2NTIzOTpbWzE2MDJdLDI1Nl0sNjUyNDA6W1sxNjAyXSwyNTZdLDY1MjQxOltbMTYwM10sMjU2XSw2NTI0MjpbWzE2MDNdLDI1Nl0sNjUyNDM6W1sxNjAzXSwyNTZdLDY1MjQ0OltbMTYwM10sMjU2XSw2NTI0NTpbWzE2MDRdLDI1Nl0sNjUyNDY6W1sxNjA0XSwyNTZdLDY1MjQ3OltbMTYwNF0sMjU2XSw2NTI0ODpbWzE2MDRdLDI1Nl0sNjUyNDk6W1sxNjA1XSwyNTZdLDY1MjUwOltbMTYwNV0sMjU2XSw2NTI1MTpbWzE2MDVdLDI1Nl0sNjUyNTI6W1sxNjA1XSwyNTZdLDY1MjUzOltbMTYwNl0sMjU2XSw2NTI1NDpbWzE2MDZdLDI1Nl0sNjUyNTU6W1sxNjA2XSwyNTZdLDY1MjU2OltbMTYwNl0sMjU2XSw2NTI1NzpbWzE2MDddLDI1Nl0sNjUyNTg6W1sxNjA3XSwyNTZdLDY1MjU5OltbMTYwN10sMjU2XSw2NTI2MDpbWzE2MDddLDI1Nl0sNjUyNjE6W1sxNjA4XSwyNTZdLDY1MjYyOltbMTYwOF0sMjU2XSw2NTI2MzpbWzE2MDldLDI1Nl0sNjUyNjQ6W1sxNjA5XSwyNTZdLDY1MjY1OltbMTYxMF0sMjU2XSw2NTI2NjpbWzE2MTBdLDI1Nl0sNjUyNjc6W1sxNjEwXSwyNTZdLDY1MjY4OltbMTYxMF0sMjU2XSw2NTI2OTpbWzE2MDQsMTU3MF0sMjU2XSw2NTI3MDpbWzE2MDQsMTU3MF0sMjU2XSw2NTI3MTpbWzE2MDQsMTU3MV0sMjU2XSw2NTI3MjpbWzE2MDQsMTU3MV0sMjU2XSw2NTI3MzpbWzE2MDQsMTU3M10sMjU2XSw2NTI3NDpbWzE2MDQsMTU3M10sMjU2XSw2NTI3NTpbWzE2MDQsMTU3NV0sMjU2XSw2NTI3NjpbWzE2MDQsMTU3NV0sMjU2XX0sXG42NTI4MDp7NjUyODE6W1szM10sMjU2XSw2NTI4MjpbWzM0XSwyNTZdLDY1MjgzOltbMzVdLDI1Nl0sNjUyODQ6W1szNl0sMjU2XSw2NTI4NTpbWzM3XSwyNTZdLDY1Mjg2OltbMzhdLDI1Nl0sNjUyODc6W1szOV0sMjU2XSw2NTI4ODpbWzQwXSwyNTZdLDY1Mjg5OltbNDFdLDI1Nl0sNjUyOTA6W1s0Ml0sMjU2XSw2NTI5MTpbWzQzXSwyNTZdLDY1MjkyOltbNDRdLDI1Nl0sNjUyOTM6W1s0NV0sMjU2XSw2NTI5NDpbWzQ2XSwyNTZdLDY1Mjk1OltbNDddLDI1Nl0sNjUyOTY6W1s0OF0sMjU2XSw2NTI5NzpbWzQ5XSwyNTZdLDY1Mjk4OltbNTBdLDI1Nl0sNjUyOTk6W1s1MV0sMjU2XSw2NTMwMDpbWzUyXSwyNTZdLDY1MzAxOltbNTNdLDI1Nl0sNjUzMDI6W1s1NF0sMjU2XSw2NTMwMzpbWzU1XSwyNTZdLDY1MzA0OltbNTZdLDI1Nl0sNjUzMDU6W1s1N10sMjU2XSw2NTMwNjpbWzU4XSwyNTZdLDY1MzA3OltbNTldLDI1Nl0sNjUzMDg6W1s2MF0sMjU2XSw2NTMwOTpbWzYxXSwyNTZdLDY1MzEwOltbNjJdLDI1Nl0sNjUzMTE6W1s2M10sMjU2XSw2NTMxMjpbWzY0XSwyNTZdLDY1MzEzOltbNjVdLDI1Nl0sNjUzMTQ6W1s2Nl0sMjU2XSw2NTMxNTpbWzY3XSwyNTZdLDY1MzE2OltbNjhdLDI1Nl0sNjUzMTc6W1s2OV0sMjU2XSw2NTMxODpbWzcwXSwyNTZdLDY1MzE5OltbNzFdLDI1Nl0sNjUzMjA6W1s3Ml0sMjU2XSw2NTMyMTpbWzczXSwyNTZdLDY1MzIyOltbNzRdLDI1Nl0sNjUzMjM6W1s3NV0sMjU2XSw2NTMyNDpbWzc2XSwyNTZdLDY1MzI1OltbNzddLDI1Nl0sNjUzMjY6W1s3OF0sMjU2XSw2NTMyNzpbWzc5XSwyNTZdLDY1MzI4OltbODBdLDI1Nl0sNjUzMjk6W1s4MV0sMjU2XSw2NTMzMDpbWzgyXSwyNTZdLDY1MzMxOltbODNdLDI1Nl0sNjUzMzI6W1s4NF0sMjU2XSw2NTMzMzpbWzg1XSwyNTZdLDY1MzM0OltbODZdLDI1Nl0sNjUzMzU6W1s4N10sMjU2XSw2NTMzNjpbWzg4XSwyNTZdLDY1MzM3OltbODldLDI1Nl0sNjUzMzg6W1s5MF0sMjU2XSw2NTMzOTpbWzkxXSwyNTZdLDY1MzQwOltbOTJdLDI1Nl0sNjUzNDE6W1s5M10sMjU2XSw2NTM0MjpbWzk0XSwyNTZdLDY1MzQzOltbOTVdLDI1Nl0sNjUzNDQ6W1s5Nl0sMjU2XSw2NTM0NTpbWzk3XSwyNTZdLDY1MzQ2OltbOThdLDI1Nl0sNjUzNDc6W1s5OV0sMjU2XSw2NTM0ODpbWzEwMF0sMjU2XSw2NTM0OTpbWzEwMV0sMjU2XSw2NTM1MDpbWzEwMl0sMjU2XSw2NTM1MTpbWzEwM10sMjU2XSw2NTM1MjpbWzEwNF0sMjU2XSw2NTM1MzpbWzEwNV0sMjU2XSw2NTM1NDpbWzEwNl0sMjU2XSw2NTM1NTpbWzEwN10sMjU2XSw2NTM1NjpbWzEwOF0sMjU2XSw2NTM1NzpbWzEwOV0sMjU2XSw2NTM1ODpbWzExMF0sMjU2XSw2NTM1OTpbWzExMV0sMjU2XSw2NTM2MDpbWzExMl0sMjU2XSw2NTM2MTpbWzExM10sMjU2XSw2NTM2MjpbWzExNF0sMjU2XSw2NTM2MzpbWzExNV0sMjU2XSw2NTM2NDpbWzExNl0sMjU2XSw2NTM2NTpbWzExN10sMjU2XSw2NTM2NjpbWzExOF0sMjU2XSw2NTM2NzpbWzExOV0sMjU2XSw2NTM2ODpbWzEyMF0sMjU2XSw2NTM2OTpbWzEyMV0sMjU2XSw2NTM3MDpbWzEyMl0sMjU2XSw2NTM3MTpbWzEyM10sMjU2XSw2NTM3MjpbWzEyNF0sMjU2XSw2NTM3MzpbWzEyNV0sMjU2XSw2NTM3NDpbWzEyNl0sMjU2XSw2NTM3NTpbWzEwNjI5XSwyNTZdLDY1Mzc2OltbMTA2MzBdLDI1Nl0sNjUzNzc6W1sxMjI5MF0sMjU2XSw2NTM3ODpbWzEyMzAwXSwyNTZdLDY1Mzc5OltbMTIzMDFdLDI1Nl0sNjUzODA6W1sxMjI4OV0sMjU2XSw2NTM4MTpbWzEyNTM5XSwyNTZdLDY1MzgyOltbMTI1MzBdLDI1Nl0sNjUzODM6W1sxMjQ0OV0sMjU2XSw2NTM4NDpbWzEyNDUxXSwyNTZdLDY1Mzg1OltbMTI0NTNdLDI1Nl0sNjUzODY6W1sxMjQ1NV0sMjU2XSw2NTM4NzpbWzEyNDU3XSwyNTZdLDY1Mzg4OltbMTI1MTVdLDI1Nl0sNjUzODk6W1sxMjUxN10sMjU2XSw2NTM5MDpbWzEyNTE5XSwyNTZdLDY1MzkxOltbMTI0ODNdLDI1Nl0sNjUzOTI6W1sxMjU0MF0sMjU2XSw2NTM5MzpbWzEyNDUwXSwyNTZdLDY1Mzk0OltbMTI0NTJdLDI1Nl0sNjUzOTU6W1sxMjQ1NF0sMjU2XSw2NTM5NjpbWzEyNDU2XSwyNTZdLDY1Mzk3OltbMTI0NThdLDI1Nl0sNjUzOTg6W1sxMjQ1OV0sMjU2XSw2NTM5OTpbWzEyNDYxXSwyNTZdLDY1NDAwOltbMTI0NjNdLDI1Nl0sNjU0MDE6W1sxMjQ2NV0sMjU2XSw2NTQwMjpbWzEyNDY3XSwyNTZdLDY1NDAzOltbMTI0NjldLDI1Nl0sNjU0MDQ6W1sxMjQ3MV0sMjU2XSw2NTQwNTpbWzEyNDczXSwyNTZdLDY1NDA2OltbMTI0NzVdLDI1Nl0sNjU0MDc6W1sxMjQ3N10sMjU2XSw2NTQwODpbWzEyNDc5XSwyNTZdLDY1NDA5OltbMTI0ODFdLDI1Nl0sNjU0MTA6W1sxMjQ4NF0sMjU2XSw2NTQxMTpbWzEyNDg2XSwyNTZdLDY1NDEyOltbMTI0ODhdLDI1Nl0sNjU0MTM6W1sxMjQ5MF0sMjU2XSw2NTQxNDpbWzEyNDkxXSwyNTZdLDY1NDE1OltbMTI0OTJdLDI1Nl0sNjU0MTY6W1sxMjQ5M10sMjU2XSw2NTQxNzpbWzEyNDk0XSwyNTZdLDY1NDE4OltbMTI0OTVdLDI1Nl0sNjU0MTk6W1sxMjQ5OF0sMjU2XSw2NTQyMDpbWzEyNTAxXSwyNTZdLDY1NDIxOltbMTI1MDRdLDI1Nl0sNjU0MjI6W1sxMjUwN10sMjU2XSw2NTQyMzpbWzEyNTEwXSwyNTZdLDY1NDI0OltbMTI1MTFdLDI1Nl0sNjU0MjU6W1sxMjUxMl0sMjU2XSw2NTQyNjpbWzEyNTEzXSwyNTZdLDY1NDI3OltbMTI1MTRdLDI1Nl0sNjU0Mjg6W1sxMjUxNl0sMjU2XSw2NTQyOTpbWzEyNTE4XSwyNTZdLDY1NDMwOltbMTI1MjBdLDI1Nl0sNjU0MzE6W1sxMjUyMV0sMjU2XSw2NTQzMjpbWzEyNTIyXSwyNTZdLDY1NDMzOltbMTI1MjNdLDI1Nl0sNjU0MzQ6W1sxMjUyNF0sMjU2XSw2NTQzNTpbWzEyNTI1XSwyNTZdLDY1NDM2OltbMTI1MjddLDI1Nl0sNjU0Mzc6W1sxMjUzMV0sMjU2XSw2NTQzODpbWzEyNDQxXSwyNTZdLDY1NDM5OltbMTI0NDJdLDI1Nl0sNjU0NDA6W1sxMjY0NF0sMjU2XSw2NTQ0MTpbWzEyNTkzXSwyNTZdLDY1NDQyOltbMTI1OTRdLDI1Nl0sNjU0NDM6W1sxMjU5NV0sMjU2XSw2NTQ0NDpbWzEyNTk2XSwyNTZdLDY1NDQ1OltbMTI1OTddLDI1Nl0sNjU0NDY6W1sxMjU5OF0sMjU2XSw2NTQ0NzpbWzEyNTk5XSwyNTZdLDY1NDQ4OltbMTI2MDBdLDI1Nl0sNjU0NDk6W1sxMjYwMV0sMjU2XSw2NTQ1MDpbWzEyNjAyXSwyNTZdLDY1NDUxOltbMTI2MDNdLDI1Nl0sNjU0NTI6W1sxMjYwNF0sMjU2XSw2NTQ1MzpbWzEyNjA1XSwyNTZdLDY1NDU0OltbMTI2MDZdLDI1Nl0sNjU0NTU6W1sxMjYwN10sMjU2XSw2NTQ1NjpbWzEyNjA4XSwyNTZdLDY1NDU3OltbMTI2MDldLDI1Nl0sNjU0NTg6W1sxMjYxMF0sMjU2XSw2NTQ1OTpbWzEyNjExXSwyNTZdLDY1NDYwOltbMTI2MTJdLDI1Nl0sNjU0NjE6W1sxMjYxM10sMjU2XSw2NTQ2MjpbWzEyNjE0XSwyNTZdLDY1NDYzOltbMTI2MTVdLDI1Nl0sNjU0NjQ6W1sxMjYxNl0sMjU2XSw2NTQ2NTpbWzEyNjE3XSwyNTZdLDY1NDY2OltbMTI2MThdLDI1Nl0sNjU0Njc6W1sxMjYxOV0sMjU2XSw2NTQ2ODpbWzEyNjIwXSwyNTZdLDY1NDY5OltbMTI2MjFdLDI1Nl0sNjU0NzA6W1sxMjYyMl0sMjU2XSw2NTQ3NDpbWzEyNjIzXSwyNTZdLDY1NDc1OltbMTI2MjRdLDI1Nl0sNjU0NzY6W1sxMjYyNV0sMjU2XSw2NTQ3NzpbWzEyNjI2XSwyNTZdLDY1NDc4OltbMTI2MjddLDI1Nl0sNjU0Nzk6W1sxMjYyOF0sMjU2XSw2NTQ4MjpbWzEyNjI5XSwyNTZdLDY1NDgzOltbMTI2MzBdLDI1Nl0sNjU0ODQ6W1sxMjYzMV0sMjU2XSw2NTQ4NTpbWzEyNjMyXSwyNTZdLDY1NDg2OltbMTI2MzNdLDI1Nl0sNjU0ODc6W1sxMjYzNF0sMjU2XSw2NTQ5MDpbWzEyNjM1XSwyNTZdLDY1NDkxOltbMTI2MzZdLDI1Nl0sNjU0OTI6W1sxMjYzN10sMjU2XSw2NTQ5MzpbWzEyNjM4XSwyNTZdLDY1NDk0OltbMTI2MzldLDI1Nl0sNjU0OTU6W1sxMjY0MF0sMjU2XSw2NTQ5ODpbWzEyNjQxXSwyNTZdLDY1NDk5OltbMTI2NDJdLDI1Nl0sNjU1MDA6W1sxMjY0M10sMjU2XSw2NTUwNDpbWzE2Ml0sMjU2XSw2NTUwNTpbWzE2M10sMjU2XSw2NTUwNjpbWzE3Ml0sMjU2XSw2NTUwNzpbWzE3NV0sMjU2XSw2NTUwODpbWzE2Nl0sMjU2XSw2NTUwOTpbWzE2NV0sMjU2XSw2NTUxMDpbWzgzNjFdLDI1Nl0sNjU1MTI6W1s5NDc0XSwyNTZdLDY1NTEzOltbODU5Ml0sMjU2XSw2NTUxNDpbWzg1OTNdLDI1Nl0sNjU1MTU6W1s4NTk0XSwyNTZdLDY1NTE2OltbODU5NV0sMjU2XSw2NTUxNzpbWzk2MzJdLDI1Nl0sNjU1MTg6W1s5Njc1XSwyNTZdfVxuXG59O1xuXG4gICAvKioqKiogTW9kdWxlIHRvIGV4cG9ydCAqL1xuICAgdmFyIHVub3JtID0ge1xuICAgICAgbmZjOiBuZmMsXG4gICAgICBuZmQ6IG5mZCxcbiAgICAgIG5ma2M6IG5ma2MsXG4gICAgICBuZmtkOiBuZmtkLFxuICAgfTtcblxuICAgLypnbG9iYWxzIG1vZHVsZTp0cnVlLGRlZmluZTp0cnVlKi9cblxuICAgLy8gQ29tbW9uSlNcbiAgIGlmICh0eXBlb2YgbW9kdWxlID09PSBcIm9iamVjdFwiKSB7XG4gICAgICBtb2R1bGUuZXhwb3J0cyA9IHVub3JtO1xuXG4gICAvLyBBTURcbiAgIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgIGRlZmluZShcInVub3JtXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgIHJldHVybiB1bm9ybTtcbiAgICAgIH0pO1xuXG4gICAvLyBHbG9iYWxcbiAgIH0gZWxzZSB7XG4gICAgICByb290LnVub3JtID0gdW5vcm07XG4gICB9XG5cbiAgIC8qKioqKiBFeHBvcnQgYXMgc2hpbSBmb3IgU3RyaW5nOjpub3JtYWxpemUgbWV0aG9kICoqKioqL1xuICAgLypcbiAgICAgIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6c3BlY2lmaWNhdGlvbl9kcmFmdHMjbm92ZW1iZXJfOF8yMDEzX2RyYWZ0X3Jldl8yMVxuXG4gICAgICAyMS4xLjMuMTIgU3RyaW5nLnByb3RvdHlwZS5ub3JtYWxpemUoZm9ybT1cIk5GQ1wiKVxuICAgICAgV2hlbiB0aGUgbm9ybWFsaXplIG1ldGhvZCBpcyBjYWxsZWQgd2l0aCBvbmUgYXJndW1lbnQgZm9ybSwgdGhlIGZvbGxvd2luZyBzdGVwcyBhcmUgdGFrZW46XG5cbiAgICAgIDEuIExldCBPIGJlIENoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMgdmFsdWUpLlxuICAgICAgMi4gTGV0IFMgYmUgVG9TdHJpbmcoTykuXG4gICAgICAzLiBSZXR1cm5JZkFicnVwdChTKS5cbiAgICAgIDQuIElmIGZvcm0gaXMgbm90IHByb3ZpZGVkIG9yIHVuZGVmaW5lZCBsZXQgZm9ybSBiZSBcIk5GQ1wiLlxuICAgICAgNS4gTGV0IGYgYmUgVG9TdHJpbmcoZm9ybSkuXG4gICAgICA2LiBSZXR1cm5JZkFicnVwdChmKS5cbiAgICAgIDcuIElmIGYgaXMgbm90IG9uZSBvZiBcIk5GQ1wiLCBcIk5GRFwiLCBcIk5GS0NcIiwgb3IgXCJORktEXCIsIHRoZW4gdGhyb3cgYSBSYW5nZUVycm9yIEV4Y2VwdGlvbi5cbiAgICAgIDguIExldCBucyBiZSB0aGUgU3RyaW5nIHZhbHVlIGlzIHRoZSByZXN1bHQgb2Ygbm9ybWFsaXppbmcgUyBpbnRvIHRoZSBub3JtYWxpemF0aW9uIGZvcm0gbmFtZWQgYnkgZiBhcyBzcGVjaWZpZWQgaW4gVW5pY29kZSBTdGFuZGFyZCBBbm5leCAjMTUsIFVuaWNvZGVOb3JtYWxpemF0b2luIEZvcm1zLlxuICAgICAgOS4gUmV0dXJuIG5zLlxuXG4gICAgICBUaGUgbGVuZ3RoIHByb3BlcnR5IG9mIHRoZSBub3JtYWxpemUgbWV0aG9kIGlzIDAuXG5cbiAgICAgICpOT1RFKiBUaGUgbm9ybWFsaXplIGZ1bmN0aW9uIGlzIGludGVudGlvbmFsbHkgZ2VuZXJpYzsgaXQgZG9lcyBub3QgcmVxdWlyZSB0aGF0IGl0cyB0aGlzIHZhbHVlIGJlIGEgU3RyaW5nIG9iamVjdC4gVGhlcmVmb3JlIGl0IGNhbiBiZSB0cmFuc2ZlcnJlZCB0byBvdGhlciBraW5kcyBvZiBvYmplY3RzIGZvciB1c2UgYXMgYSBtZXRob2QuXG4gICAqL1xuICAgaWYgKCFTdHJpbmcucHJvdG90eXBlLm5vcm1hbGl6ZSkge1xuICAgICAgU3RyaW5nLnByb3RvdHlwZS5ub3JtYWxpemUgPSBmdW5jdGlvbihmb3JtKSB7XG4gICAgICAgICB2YXIgc3RyID0gXCJcIiArIHRoaXM7XG4gICAgICAgICBmb3JtID0gIGZvcm0gPT09IHVuZGVmaW5lZCA/IFwiTkZDXCIgOiBmb3JtO1xuXG4gICAgICAgICBpZiAoZm9ybSA9PT0gXCJORkNcIikge1xuICAgICAgICAgICAgcmV0dXJuIHVub3JtLm5mYyhzdHIpO1xuICAgICAgICAgfSBlbHNlIGlmIChmb3JtID09PSBcIk5GRFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5vcm0ubmZkKHN0cik7XG4gICAgICAgICB9IGVsc2UgaWYgKGZvcm0gPT09IFwiTkZLQ1wiKSB7XG4gICAgICAgICAgICByZXR1cm4gdW5vcm0ubmZrYyhzdHIpO1xuICAgICAgICAgfSBlbHNlIGlmIChmb3JtID09PSBcIk5GS0RcIikge1xuICAgICAgICAgICAgcmV0dXJuIHVub3JtLm5ma2Qoc3RyKTtcbiAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcIkludmFsaWQgbm9ybWFsaXphdGlvbiBmb3JtOiBcIiArIGZvcm0pO1xuICAgICAgICAgfVxuICAgICAgfTtcbiAgIH1cbn0odGhpcykpO1xuIl19
(4)
});
