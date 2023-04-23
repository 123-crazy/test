// Copyright (c) 2020 Siemens

/**
 * Directive for right click.
 *
 * @module js/aw-compare-right-click.directive
 */
import app from 'app';

/**
 * Directive for right click.
 *
 * @member aw-compare-right-click
 * @memberof NgElementDirectives
 * @deprecated afx@4.4.0, not required anymore
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awCompareRightClick', function() {
    return function( scope, element ) {
        element.bind( 'contextmenu', function( event ) {
            var rowRef = scope.row.entity;
            event.preventDefault();
            rowRef.onRMBEvent( event );
        } );
    };
} );
