// Copyright (c) 2020 Siemens

/**
 * Directive for the drag handle, which is used to hook the UI event and input for fill down drag.
 *
 * @module js/aw-drag.directive
 */
import app from 'app';
import logger from 'js/logger';

/**
 * Directive for the drag handle, which is used to hook the UI event and input for fill down drag.
 *
 * @member aw-drag
 * @memberof NgAttributeDirectives
 */
app.directive( 'awDrag', function() {
    return {
        restrict: 'A',
        link: function link( scope, element ) {
            try {
                element.off( 'mouseover' ).on( 'mouseover', function( event ) {
                    scope.checkStartRangeSelect( event.originalEvent );
                } );
            } catch ( e ) {
                logger.error( 'awDrag exception ' + e );
            }
        }
    };
} );
