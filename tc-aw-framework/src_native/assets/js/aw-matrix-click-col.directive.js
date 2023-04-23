// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Define a directive that is used for click event on column header.
 * 
 * @module js/aw-matrix-click-col.directive
 */
import * as app from 'app';

/**
 * Define a directive that is used for click event on column header.
 * 
 * @member aw-matrix-click-col
 * @memberof NgMixedDirective
 */
app.directive( 'awMatrixClickCol', function() {
    return {
        link: function( scope, element ) {
            element.bind( "click", function( e ) {
                var colData = scope.col.colDef;
                var colId = element.attr( "__colid" );
                colData.onColClick( colId, e );
            } );
        }
    };
} );
