// Copyright (c) 2020 Siemens

/**
 * @deprecated : 'aw-title-link' is deprecated we should use <aw-link> instead.
 *
 * Directive to display a title link element
 *
 * @module js/aw-title-link.directive
 */
import app from 'app';
import 'js/viewModelService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display a title link element
 *
 * <pre>
 * {String} action - The action to be performed when the link is clicked
 * {Object} prop - The property to display in the link
 * </pre>
 *
 * @example <aw-title-link action="clickAction" prop="linkProp"></aw-title-link>
 *
 * @member aw-navigation-widget
 * @memberof NgElementDirectives
 */
app.directive( 'awTitleLink', [ 'viewModelService', function( viewModelSvc ) {
    return {
        restrict: 'E',
        scope: {
            action: '@',
            prop: '='
        },
        controller: [ '$scope', function( $scope ) {
            $scope.doit = function( action, selectedProp ) {
                $scope.selectedprop = selectedProp;
                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                viewModelSvc.executeCommand( declViewModel, action, $scope );
            };

            $scope.handleKeyDown = ( event, action, selectedProp ) => {
                if ( wcagSvc.isValidKeyPress( event ) ) {
                    $scope.doit( action, selectedProp );
                }
            };
        } ],
        template: `<div role="button" class="aw-layout-panelSectionTitle">
                        <a class="aw-aria-border link-style-5" ng-click="doit(action, prop)" aria-label="{{prop.propertyDisplayName}}" tabindex="0" ng-keydown="handleKeyDown($event, action, prop)">
                            {{prop.propertyDisplayName}}
                        </a>
                    </div>`
    };
} ] );
