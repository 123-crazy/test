// Copyright (c) 2020 Siemens

/**
 * Directive to display panel body.
 *
 * @module js/aw-panel-body.directive
 */
import app from 'app';
import 'js/viewModelService';
import wcagSvc from 'js/wcagService';

/**
 * Note: Moved outside directive to avoid formatter level wrapping issue.
 */
var template = '<form name="awPanelBody"  class="aw-layout-panelBody aw-base-scrollPanel" ng-class="{\'aw-layout-flexColumn\': noScroll}" ng-transclude novalidate></form>';

/**
 * Directive to display panel body.
 *
 * @example <aw-panel-body></aw-panel-body>
 *
 * @member aw-panel-body
 * @memberof NgElementDirectives
 */
app.directive( 'awPanelBody', [
    'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            template: template,
            controller: [ '$scope', function( $scope ) {
                var declViewModel = viewModelSvc.getViewModel( $scope, true );

                $scope.conditions = declViewModel.getConditionStates();
            } ],
            link: function( scope, element, attr ) {
                if( attr.scrollable === 'false' ) {
                    scope.noScroll = true;
                } else {
                    scope.noScroll = false;
                }
                scope.$applyAsync( function() {
                    wcagSvc.updateMissingButtonInForm( element[0] );
                } );
            },
            replace: true
        };
    }
] );
