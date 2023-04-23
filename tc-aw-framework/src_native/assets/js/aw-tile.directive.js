// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-tile) directive.
 *
 * @module js/aw-tile.directive
 */
import app from 'app';
import 'js/aw-tile.controller';
import 'js/aw-icon.directive';
import 'js/aw-tile-icon.directive';
import 'js/aw-right-click.directive';
import 'js/aw-long-press.directive';

/**
 * Definition for the (aw-tile) directive.
 *
 * @example <aw-tile tile="tile"></aw-tile>
 *
 * @member aw-tile
 * @memberof NgElementDirectives
 *
 * @returns {Object} - Directive's declaration details
 */
app.directive( 'awTile', function() {
    return {
        restrict: 'E',
        scope: {
            tile: '='
        },
        controller: 'awTileController',
        templateUrl: app.getBaseUrlPath() + '/html/aw-tile.directive.html'
    };
} );
