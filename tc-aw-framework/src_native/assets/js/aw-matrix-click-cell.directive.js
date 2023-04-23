// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Define a directive that is used for click event on cell.
 * 
 * @module js/aw-matrix-click-cell.directive
 */
import * as app from 'app';

/**
 * Define a directive that is used for click event on cell.
 * 
 * @member aw-matrix-click-cell
 * @memberof NgMixedDirectives
 */
app.directive( 'awMatrixClickCell', function() {
    return {
        link: function( scope, element ) {
            element.bind( "click", function( e ) {
                if( e.ctrlKey ) {
                    var colData = scope.col.colDef;
                    var colId = element.attr( "__colid" );
                    var rowId = element.attr( "__rowid" );
                    colData.onCtrlClick( rowId, colId, e );
                }
            } );
        }
    };
} );
