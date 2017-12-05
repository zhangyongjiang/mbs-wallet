/**
 * Main
 *
 * - Load Transport.
 * - Bootstrap Angular app.
 * - Register Bitcoin URI handler.
 */
(function (angular) {
    'use strict';

    angular.module('webwalletApp', [
        'ngRoute',
        'ngSanitize',
        'ngCookies',
        'ui.bootstrap',
        'ja.qr',
        'pascalprecht.translate'
    ]);
	
    angular.module('webwalletApp').config(function($translateProvider) {
        $translateProvider.useStaticFilesLoader({
            prefix : '/i18n/locale-',
            suffix : '.json?v=2'
        }); 
        $translateProvider.registerAvailableLanguageKeys(['en', 'zh'], {
            'en_US' : 'en',
            'en_UK' : 'en',
            'zh_CN' : 'zh',
            'zh_TW' : 'zh',
            'zh_HK' : 'zh',
            'zh_SG' : 'zh',
            'zh_MO' : 'zh'
        }).fallbackLanguage('en');
        $translateProvider.useCookieStorage();
        $translateProvider.determinePreferredLanguage();
    });

    // Load the Transport and bootstrap the Angular app.
    angular.element(document).ready(function () {
        init(
            loadConfig()
        );
        registerUriHandler();
    });

    /**
     * Try to load the Transport and then bootstrap the Angular app.
     *
     * @param {Object} config  Configuration
     *
     * @see  acquireTransport()
     * @see  createApp()
     */
    function init(config) {
        var bridgeUrl = config.bridge.url,
            bridgeConfigUrl = config.bridge.configUrl,
            bridgeConfigPromise = window.trezor.http(bridgeConfigUrl);

        acquireTransport(bridgeUrl)
            .then(function (transport) {
                return bridgeConfigPromise
                    .then(function (config) {
                        return transport.configure(config);
                    })
                    .then(function () {
                        createApp(null, transport);
                    });
            })
            .catch(function (err) {
                createApp(err);
            });
    }

    /**
     * Inject and return the config service.
     *
     * @return {Object}  Config service
     */
    function loadConfig() {
        var injector = angular.injector(['webwalletApp']);
        return injector.get('config');
    }

    /**
     * Acquire Transport
     *
     * @param {String} bridgeUrl  Trezor Bridge URL read from the config
     * @return {Promise}          If the Transport was loaded, the Promise is
     *                            resolved with an instance of `HttpTransport`
     *                            or `PluginTransport`.  If loading failed
     *                            the Promise is failed.
     */
    function acquireTransport(bridgeUrl) {
        var trezor = window.trezor;

        function loadHttp() {
            return trezor.HttpTransport.connect(bridgeUrl).then(
                function (info) {
                    console.log('[app] Loading http transport successful',
                                info);
                    return new trezor.HttpTransport(bridgeUrl);
                },
                function (err) {
                    console.error('[app] Loading http transport failed', err);
                    throw err;
                }
            );
        }

        function loadPlugin() {
            return trezor.PluginTransport.loadPlugin().then(function (plugin) {
                return new trezor.PluginTransport(plugin);
            });
        }
		
		function loadApplet() {
            return trezor.AppletTransport.loadApplet().then(function (applet) {
                return new trezor.AppletTransport(applet);
            });
        }
		
        return loadHttp().catch(loadApplet);
    }

    /**
     * Bootstrap (create and initialize) the Angular app.
     *
     * Pass to the app the reference to the Transport object.
     *
     * @param {Error|null} err    Error from the Transport loading process
     * @param {Object} transport  Transport object
     */
    function createApp(err, transport) {
        // Create module.
        var app = angular.module('webwalletApp'),
            container = document.getElementById('webwalletApp-container');

        // Attach routes.
        if (!err) {
            app.config(attachRoutes);
        } else {
            console.error(err);
        }
        // Pass Transport reference.
        app
            .value('trezorError', err)
            .value('trezorApi', window.trezor)
            .value('trezor', transport);

        // Initialize Angular.js.
        try {
            angular.bootstrap(container, ['webwalletApp']);
        } catch (err2) {
            console.error('[app] Error occured while bootstrapping ' +
                'the Angular.js app.');
            console.error(err2);
            container.innerHTML = [
                '<div class="page-container container">',
                '  <div class="row" ng-if="installed">',
                '    <div class="col-md-6 col-md-offset-3">',
                '      <div class="alert alert-danger">',
                '        <h4>Plugin loading failed :(</h4>',
                '        <textarea>',
                err || '',
                err2,
                '        </textarea>',
                '      </div>',
                '    </div>',
                '  </div>',
                '</div>'
            ].join('');
            container.removeAttribute('ng-cloak');
        }
        
        angular.element("#app-loading").hide();
    }

    /**
     * Attach routes to passed $routeProvider.
     *
     * @param {Object} $routeProvider  Angular $routeProvider as returned
     *                                 by `app.config()`.
     */
    function attachRoutes($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/main.html'
            })
            .when('/import', {
                templateUrl: 'views/import.html'
            })
            .when('/device/:deviceId', {
                templateUrl: 'views/device/index.html'
            })
            .when('/device/:deviceId/load', {
                templateUrl: 'views/device/load.html'
            })
            .when('/device/:deviceId/recovery', {
                templateUrl: 'views/device/recovery.html'
            })
            .when('/device/:deviceId/wipe', {
                templateUrl: 'views/device/wipe.html'
            })
            .when('/device/:deviceId/account/:accountId', {
                templateUrl: 'views/account/index.html'
            })
            .when('/device/:deviceId/account/:accountId/send', {
                templateUrl: 'views/account/send.html'
            })
            .when('/device/:deviceId/account/:accountId/send/:output', {
                templateUrl: 'views/account/send.html'
            })
            .when('/device/:deviceId/account/:accountId/send/:output/amount/:amount', {
                templateUrl: 'views/account/send.html'
            })
            .when('/device/:deviceId/account/:accountId/receive', {
                templateUrl: 'views/account/receive.html'
            })
            .when('/device/:deviceId/account/:accountId/sign', {
                templateUrl: 'views/account/sign.html'
            })
            .when('/send/:uri*', {
                resolve: {
                    uriRedirect: 'uriRedirect'
                }
            })
            .otherwise({
                redirectTo: '/'
            });
    }

    /**
     * Register Bitcoin URI handler
     *
     * Requests to this URI are then handled by the `uriRedirect` service.
     *
     * @see  services/uriRedirect.js
     */
    function registerUriHandler() {
        var URI_PROTOCOL = 'bitcoin',
            URI_TEMPLATE = '/#/send/%s',
            URI_NAME = 'MyBWallet: Send Bitcoins to address',
            url;

        url = location.protocol + '//' + location.host + URI_TEMPLATE;
        if (navigator.registerProtocolHandler &&
            (!navigator.isProtocolHandlerRegistered ||
             !navigator.isProtocolHandlerRegistered(URI_PROTOCOL, url))) {
            navigator.registerProtocolHandler(
                URI_PROTOCOL,
                url,
                URI_NAME
            );
        }
    }

}(this.angular));
