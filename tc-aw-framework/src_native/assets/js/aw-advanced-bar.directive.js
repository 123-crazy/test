// Copyright (c) 2020 Siemens

/**
 * The ui element provides a Bar which can incorporate any view.
 *
 * @module js/aw-advanced-bar.directive
 */
import app from 'app';
import 'js/viewModelService';
import logger from 'js/logger';
import 'js/aw-transclude.directive';

/**
 * Directive to display a link element
 *
 * @example <aw-advanced-bar orientation="HORIZONTAL"></aw-advanced-bar>
 * @example <aw-advanced-bar orientation="VERTICAL" negative></aw-advanced-bar>
 *
 * @attribute orientation: hint to layout the toolbar, it takes one of the values ['VERTICAL','HORIZONTAL']. By default it layouts the toolbar horizontally.
 * @attribute negative: If kept negative, the tool bar will use the background color. This is boolean attribute, no value is required.
 * @memberof NgElementDirectives
 */
app.directive( 'awAdvancedBar', [
    'viewModelService',
    function( viewModelSvc ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                type: '@',
                orientation: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-advanced-bar.directive.html',

            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
            } ],

            link: function( $scope, $element, $attrs ) {
                var _types = {
                    TOOLBAR: 'TOOLBAR',
                    TASKBAR: 'TASKBAR',
                    FOOTER: 'FOOTER'
                };
                if( !$scope.type ) {
                    logger.error( 'Advanced bar type is undefined, failed to render aw-advanced-bar.' );
                    return;
                }

                if( $scope.type in _types ) {
                    if( $scope.type === _types.TOOLBAR ) {
                        $scope.orientation = $scope.orientation === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL';
                        $scope.negative = $attrs.negative;
                    } else {
                        $scope.orientation = 'HORIZONTAL';
                        $scope.negative = null;
                    }
                } else {
                    logger.error( 'Advanced bar type should be from [TOOLBAR, TASKBAR, FOOTER], failed to render aw-advanced-bar.' );
                    return;
                }
            }
        };
    }
] );
