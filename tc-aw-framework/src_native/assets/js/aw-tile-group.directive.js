// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-tile-group) directive.
 *
 * @module js/aw-tile-group.directive
 */
import app from 'app';
import 'js/aw-tile.directive';

/**
 * Definition for the (aw-tile-group) directive.
 *
 * @example <aw-tile-group tile-group="tileGroup"></aw-tile-group>
 *
 * @member aw-tile-group
 * @memberof NgElementDirectives
 *
 * @returns {Object} - Directive's declaration details
 */
app.directive( 'awTileGroup', function() {
    return {
        restrict: 'E',
        scope: {
            tileGroup: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-tile-group.directive.html'
    };
} );
