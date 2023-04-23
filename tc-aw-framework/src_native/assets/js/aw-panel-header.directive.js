// Copyright (c) 2020 Siemens

/**
 * Directive to display panel header.
 *
 * @module js/aw-panel-header.directive
 */
import app from 'app';
import 'js/viewModelService';

/**
 * Directive to display panel header.
 *
 * @example <aw-panel-header></aw-panel-header>
 *
 * @member aw-panel-header
 * @memberof NgElementDirectives
 */
app.directive( 'awPanelHeader', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        transclude: true,
        template: '<div class="aw-layout-panelHeader" ng-transclude></div>',
        controller: [ '$scope', function( $scope ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );
            if( declViewModel ) {
                $scope.conditions = declViewModel.getConditionStates();
            }
        } ],
        replace: true
    };
} ] );
