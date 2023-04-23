// Copyright (c) 2020 Siemens

/**
 * @module js/extended-tooltip.directive
 */

import app from 'app';
import 'js/command.service';
import 'js/aw-popup-panel2.directive';
import 'js/exist-when.directive';
import 'js/visible-when.directive';
import 'js/extended-tooltip.controller';
import browserUtils from 'js/browserUtils';

/**
 * Attribute Directive for tooltip.
 *
 * @example   <aw-link prop="data.box1" action="buttonAction1"  extended-tooltip="data.listTooltip"></aw-link>
 *
 * @member extended-tooltip
 * @memberof NgAttributeDirectives
 */
app.directive( 'extendedTooltip', [ function() {
    return {
        restrict: 'A',
        controller: 'extendedTooltipController',
        link: function( scope, element, attr ) {
            // extended tooltip should not render on touch device and below code should only execute if attr has tooltip.
            if ( !browserUtils.isTouchDevice && attr.extendedTooltip ) {
                scope.configureTooltip();
            }
        }
        // end
    };
}
] );
