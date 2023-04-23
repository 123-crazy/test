// Copyright (c) 2020 Siemens

/**
 * Definition for the (aw-sortable) directive.
 *
 * @module js/aw-sortable.directive
 */
import app from 'app';
import ngModule from 'angular';

/**
 * Definition for the (aw-sortable) directive.
 *
 * @example TODO
 *
 * @member aw-sortable
 * @memberof NgAttributeDirectives
 * @deprecated afx@4.1.0.
 * @alternative NA
 * @obsoleteIn afx@5.0.0
 */
app.directive( 'awSortable', function() {
    return {
        restrict: 'A',
        link: function( scope, $element ) {
            $element.sortable( {
                revert: true,
                handle: 'button',
                cancel: ''
            } );
            $element.disableSelection();
            $element.on( 'sortdeactivate', function( event, ui ) {
                var from = ngModule.element( ui.item ).scope().$index;
                var to = $element.children().index( ui.item );
                if( to >= 0 ) {
                    scope.$apply( function() {
                        if( from >= 0 ) {
                            scope.$emit( 'my-sorted', {
                                from: from,
                                to: to
                            } );
                        }
                    } );
                }
            } );
        }
    };
} );
