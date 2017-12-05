/*global angular*/

angular.module('webwalletApp').controller('DeviceLoadCtrl', function (
    flash,
    $scope,
    $rootScope,
    $translate,
    $location) {

    'use strict';

    $scope.settings = {
        pin_protection: true,
        language: $scope.device.DEFAULT_LANGUAGE
    };

    if ($rootScope.language) {
    	$scope.settings.language = $rootScope.language;
    }
    $rootScope.$watch('language',function(){
    	$scope.settings.language = $rootScope.language;
    });
    $scope.languages = $rootScope.languages;

    $scope.loadDevice = function () {
        var set = $scope.settings,
            dev = $scope.device;

        if (set.label)
            set.label = set.label.trim();
        set.payload = set.payload.trim();

        dev.load(set).then(
            function () { $location.path('/device/' + dev.id); },
            function (err) { flash.error(err.message || $translate.instant('js.controllers.device.load.importing-failed')); }
        );
    };

});
