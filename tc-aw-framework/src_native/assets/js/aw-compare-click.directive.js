// Copyright (c) 2020 Siemens

/**
 * Directive for mouse left click.
 *
 * @module js/aw-compare-click.directive
 */
import app from 'app';

/**
 * Directive for mouse left click.
 *
 * @example TODO
 *
 * @member aw-compare-click
 * @memberof NgElementDirectives
 * @deprecated afx@4.4.0, not required anymore
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awCompareClick', function() {
    return function( scope, element ) {
        element.bind( 'click', function( event ) {
            var rowRef = scope.row.entity;
            rowRef.onClickEvent( event );
        } );
    };
} );
