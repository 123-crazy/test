// Copyright (c) 2020 Siemens

/**
 * @module js/aw-popup-primary-button.directive
 */
import app from 'app';
import 'js/viewModelService';

/**
 *
 * @deprecated afx@4.2.0.
 * @alternative AwButton
 * @obsoleteIn afx@5.1.0
 *
 * Primary button on the popup.
 *
 * @example <aw-popup-primary-button><aw-i18n>i18n.anyText</aw-i18n></aw-popup-primary-button>
 *
 * @member aw-popup-primary-button
 * @memberof NgElementDirectives
 */
app.directive( 'awPopupPrimaryButton', [ 'viewModelService', function( viewModelService ) {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            action: '@'
        },
        controller: [ '$scope', function( $scope ) {
            $scope.doit = function( action ) {
                var viewModelData = viewModelService.getViewModel( $scope, true );
                viewModelService.executeCommand( viewModelData, action, $scope );
            };
        } ],
        template: '<button class="aw-popup-primaryButton" ng-click="doit(action)" ng-transclude ></button>',
        replace: true
    };
} ] );
