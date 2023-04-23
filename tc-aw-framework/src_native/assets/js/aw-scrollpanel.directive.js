// Copyright (c) 2020 Siemens

/**
 * Provide a container with scroll
 *
 * @module js/aw-scrollpanel.directive
 */
import app from 'app';

/**
 * This directive can be used to replace divs like this in declaritive html: <div class="aw-base-scrollPanel
 * aw-layout-flexColumn"> The intent is to keep the decl views free of css impl details.
 *
 * @example <aw-scrollpanel> contents... </aw-scrollpanel>
 *
 * @member aw-scrollpanel
 * @memberof NgElementDirectives
 */
app.directive( 'awScrollpanel', function() {
    return {
        restrict: 'AE',
        link: function( scope, element ) {
            element.addClass( 'aw-base-scrollPanel' );
        }
    };
} );
