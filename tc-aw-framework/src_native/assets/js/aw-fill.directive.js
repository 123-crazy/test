// Copyright (c) 2020 Siemens

/**
 * Directive for the drag handle, which is used to hook the UI event and input for fill down drag.
 * <P>
 * Note: created from aw-drag.directive (gwt table)
 *
 * @module js/aw-fill.directive
 */
import app from 'app';
import logger from 'js/logger';
import 'js/aw.fill.controller';

/**
 * Directive for the drag handle, which is used to hook the UI event and input for fill down drag.
 *
 * @member aw-fill
 * @memberof NgAttributeDirectives
 */
app.directive( 'awFill', function() {
    return {
        restrict: 'A',
        controller: 'awFillController',
        link: function link( scope, element ) {
            try {
                element.off( 'mouseover' ).on( 'mouseover', function( event ) {
                    scope.checkStartRangeSelect( event.originalEvent );
                } );
            } catch ( e ) {
                logger.error( 'awFill exception ' + e );
            }
        }
    };
} );
