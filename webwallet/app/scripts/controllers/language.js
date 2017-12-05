/*global angular*/

/**
 * Language Controller
 *
 * Set language.
 *
 * @see  index.html
 */
angular.module('webwalletApp').controller('LanguageCtrl', function (
	$rootScope,
    $scope,
    $translate) {

    'use strict';
    
    var ENGLISH = 'english', CHINESE = 'chinese';

    angular.element("#nav-language").click(function () {
        $scope.toggleLanguage();
        return false;
    });
    
    $rootScope.languages = [{code: ENGLISH, label: 'English'}, {code: CHINESE, label: '中文'}];
    
    $rootScope.$on('$translateChangeEnd', function (event, args) {
        console.log('[LanguageCtrl] current language: ', args.language);
        $rootScope.language = localeToLanguage(args.language);
        
        /*
        $translate('logo-img').then(function (translation) {
            angular.element("#logo-img").attr('src', translation);
        });
        */
        if ($rootScope.language == CHINESE) {
        	angular.element("#logo-img-english").hide();
        	angular.element("#logo-img-chinese").show();
        	
        	angular.element("#nav-what").attr('href', 'http://www.bidingxing.com/bwallet');
        	angular.element("#nav-resources").attr('href', 'http://mybwallet.com/resources/zh/');
        } else {
        	angular.element("#logo-img-chinese").hide();
        	angular.element("#logo-img-english").show();
        	
        	angular.element("#nav-what").attr('href', 'http://www.bidingxing.com/en/bwallet');
        	angular.element("#nav-resources").attr('href', 'http://mybwallet.com/resources/en/');
        }
        
        $translate(['nav-wallet', 'nav-what', 'nav-news', 'nav-help', 'nav-support', 'nav-language', 'nav-resources']).then(function (translations) {
            for ( var t in translations ){
            	angular.element("#" + t).html(translations[t]);
            }
        });
    });
    
    function localeToLanguage(locale) {
    	if (locale && locale.indexOf('zh') >= 0) {
    		return CHINESE;
    	} else {
    		return ENGLISH;
    	}
    }

    $scope.toggleLanguage = function () {
    	if ($rootScope.language == CHINESE)
            $translate.use('en');
        else 
            $translate.use('zh');
    }
});
