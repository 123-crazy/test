// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Define a directive that is used for click event on row header.
 * 
 * @module js/aw-matrix-click-row-header.directive
 */
import * as app from 'app';

/**
 * Define a directive that is used for click event on row header.
 * 
 * @member aw-matrix-click-row-header
 * @memberof NgMixedDirectives
 */
app.directive( 'awMatrixClickRowHeader', function() {
    return {
        link: function( scope, element ) {
            element.bind( "mousedown", function( e ) {
                var rowData = scope.row.entity;
                var rowId = scope.row.entity.descriptor.id;
                rowData.onRowHeaderClick( rowId, e );
            } );
        }
    };
} );
