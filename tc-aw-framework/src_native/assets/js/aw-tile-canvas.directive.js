// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-tile-canvas) directive.
 *
 * @module js/aw-tile-canvas.directive
 */
import app from 'app';
import 'js/aw-tile-canvas.controller';
import 'js/aw-tile-group.directive';

/**
 * Definition for the (aw-tile-canvas) directive.
 *
 * @example <aw-tile-canvas tile-groups="tileGroups"></aw-tile-canvas>
 *
 * @member aw-tile-canvas
 * @memberof NgElementDirectives
 *
 * @returns {Object} - Directive's declaration details
 */
app.directive( 'awTileCanvas', function() {
    return {
        restrict: 'E',
        scope: {
            tileGroups: '='
        },
        controller: 'awTileCanvasController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-tile-canvas.directive.html'
    };
} );
