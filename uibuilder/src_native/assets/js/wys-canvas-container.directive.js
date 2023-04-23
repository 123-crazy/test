// Copyright (c) 2020 Siemens

/**
 * This directive is used as place-holder to show sample usage of declarative elements
 *
 * @module js/wys-canvas-container.directive
 */

import app from 'app';

/**
 * Display example .
 *
 * @example <wys-canvas-container></wys-canvas-container>
 * @memberof NgDirectives
 * @member wys-canvas-container
 */
app.directive( 'wysCanvasContainer', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/wys-canvas-container.directive.html',
        link: function( scope, element ) {
            element.off( 'drop' )
                .off( 'dragover' )
                .off( 'dragenter' )
                .on( 'drop', scope.dropHandler )
                .on( 'dragover', scope.dragoverHandler )
                .on( 'dragenter', scope.dragoverHandler );
        }
    };
} ] );
