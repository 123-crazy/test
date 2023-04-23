// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to manage data navigation
 *
 * @module js/aw-data-navigator.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'angular';
import 'js/aw-include.directive';
import 'js/aw-data-navigator.controller';
import 'js/appCtxService';

'use strict';

/**
 * Directive to manage data navigation
 *
 * @example <aw-data-navigator></aw-data-navigator>
 *
 * @member aw-data-navigator
 * @memberof NgElementDirectives
 */
app.directive( 'awDataNavigator', [ 'appCtxService', function( appCtxService ) {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/aw-data-navigator.directive.html',
        scope: {
            contextKey: '=',
            provider: '=',
            baseSelection: '=',
            layout: '@?'
        },
        controller: 'DataNavigatorCtrl',
        link: function( $scope, $element ) {
            $element.on( 'mouseup', function() {
                $scope.$evalAsync( function() {
                    if( appCtxService.ctx.aceActiveContext.key !== $scope.contextKey ) {
                        eventBus.publish( 'ace.activateWindow', { key: $scope.contextKey } );
                    }
                } );
            } );
        }
    };
} ] );

app.directive( 'awResetDataNavigator', [ function() {
    return {
        restrict: 'A',
        scope: true,
        link: function( $scope ) {
            $scope.$on( 'awDataNavigator.reset', function() {
                $scope.$broadcast( 'dataProvider.reset' );
            } );
            $scope.$on( 'awDataProvider.selectAction', function( event, data ) {
                $scope.$broadcast( 'dataProvider.selectAction', {
                    selectAll: data.selectAll
                } );
            } );
        }
    };
} ] );
