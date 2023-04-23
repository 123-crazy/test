// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/awMatrixSelectionService
 */
import * as app from 'app';
import selectionService from 'js/selection.service';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Function to highlight the column header
 * @param {*} eventData
 */
export let selectColHeader = function( eventData ) {
    var colObj = eventData.colObj;
    var colVMO = eventData.col;
    var grid = eventData.grid;
    var gridId = grid.appScope.gridid;
    var rows = grid.rows;

    if( colObj.colDef.isColSelected ) {
        _.forEach( rows, function( row ) {
            if( row.entity.isRowSelected ) {
                row.entity.isRowSelected = false;
            }
        } );
        var columns = grid.columns;
        _.forEach( columns, function( column ) {
            if( column.field !== colObj.field ) {
                if( column.colDef.isColSelected ) {
                    column.colDef.isColSelected = false;
                }
            }
        } );
        eventBus.publish( gridId + '.rowColSelection', {
            selectedObjects: [ colVMO ]
        } );
    } else {
        eventBus.publish( gridId + '.rowColSelection', {
            selectedObjects: []
        } );
    }

    var renderIndex = eventData.renderIndex;
    var top = grid.element[ 0 ];
    var selectedColHeads = $( top ).find( "div.ui-grid-column-header-selected" );
    var selectedRowHeads = $( top ).find( "aw-matrix-row-header.ui-grid-column-header-selected" );
    var selectedDiv = $( top ).find( "div.aw-matrix-selectedcell" );
    var colRenderIndex = renderIndex;
    var ncolFilter = '[_colindex="' + colRenderIndex + '"]';
    var newCol = $( top ).find( "aw-matrix-column-header" ).filter( ncolFilter ).get( 0 );
    var newColHead = $( newCol ).parent().get( 0 );

    if( $( newColHead ).hasClass( "ui-grid-column-header-selected" ) ) {
        $( newColHead ).removeClass( "ui-grid-column-header-selected" );
    } else {
        $( newColHead ).addClass( "ui-grid-column-header-selected" );
    }

    var cells = $( top ).find( "aw-matrix-cell" ).filter( ncolFilter );
    for( var j = 0; j < cells.length; j++ ) {
        var parentDiv = $( cells[ j ] ).parent();
        var childDiv = $( cells[ j ] ).children().get( 0 );
        var innerDiv = $( cells[ j ] ).children().children().get( 0 );
        if( $( childDiv ).hasClass( "ui-grid-cell-focus" ) ) {
            $( childDiv ).removeClass( "ui-grid-cell-focus" );
        }
        if( $( innerDiv ).hasClass( "ui-grid-cell-focus" ) ) {
            $( innerDiv ).removeClass( "ui-grid-cell-focus" );
        }
        if( $( parentDiv ).hasClass( "aw-matrix-selectedcell" ) &&
            !$( newColHead ).hasClass( "ui-grid-column-header-selected" ) ) {
            $( newColHead ).addClass( "ui-grid-column-header-selected" );
            $( parentDiv ).removeClass( "aw-matrix-selectedcell" );
        }
    }
    for( var i = 0; i < selectedDiv.length; i++ ) {
        $( selectedDiv[ i ] ).removeClass( "aw-matrix-selectedcell" );
        innerDiv = $( selectedDiv[ i ] ).children().children().get( 0 );
        if( $( innerDiv ).hasClass( "ui-grid-cell-focus" ) ) {
            $( innerDiv ).removeClass( "ui-grid-cell-focus" );
        }
        var innermostDiv = $( selectedDiv[ i ] ).children().children().children().get( 0 );
        if( $( innermostDiv ).hasClass( "ui-grid-cell-focus" ) ) {
            $( innermostDiv ).removeClass( "ui-grid-cell-focus" );
        }
    }
    for( var k = 0; k < selectedColHeads.length; k++ ) {
        if( newColHead !== selectedColHeads[ k ] ) {
            $( selectedColHeads[ k ] ).removeClass( "ui-grid-column-header-selected" );
        }
    }
    for( var l = 0; l < selectedRowHeads.length; l++ ) {
        $( selectedRowHeads[ l ] ).removeClass( "ui-grid-column-header-selected" );
    }
};

/**
 * Function to highlight the row header
 * @param {*} eventData
 */
export let selectRowHeader = function( eventData ) {
    var row = eventData.row;
    var rowVMO = eventData.rowVMO;
    var grid = eventData.grid;
    var gridId = grid.appScope.gridid;
    var rows = grid.rows;

    if( row.entity.isRowSelected ) {
        _.forEach( rows, function( rowObj ) {
            if( row.entity.uid !== rowObj.entity.uid ) {
                if( rowObj.entity.isRowSelected ) {
                    rowObj.entity.isRowSelected = false;
                }
            }
        } );
        var columns = grid.columns;
        _.forEach( columns, function( column ) {
            if( column.colDef.isColSelected ) {
                column.colDef.isColSelected = false;
            }
        } );
        eventBus.publish( gridId + '.rowColSelection', {
            selectedObjects: [ rowVMO ]
        } );

    } else {
        eventBus.publish( gridId + '.rowColSelection', {
            selectedObjects: []
        } );
    }

    var col = eventData.col;
    var rowRenderIndex = eventData.rowRenderIndex;
    var top = grid.element[ 0 ];
    var rowIndex = null;
    var selectedRowHeads = $( top ).find( "aw-matrix-row-header.ui-grid-column-header-selected" );
    var gridCanvasDiv = $( top ).find( "div.ui-grid-canvas" ).get( 0 );

    var newRow = $( gridCanvasDiv ).children().get( rowRenderIndex );
    var newRowHead = $( newRow ).find( "aw-matrix-row-header" ).get( 0 );
    if( $( newRowHead ).hasClass( "ui-grid-column-header-selected" ) ) {
        $( newRowHead ).removeClass( "ui-grid-column-header-selected" );
    } else {
        $( newRowHead ).addClass( "ui-grid-column-header-selected" );
    }
    var newRowHeadChild = $( newRowHead ).children().get( 0 );
    if( $( newRowHeadChild ).hasClass( "ui-grid-cell-focus" ) ) {
        $( newRowHeadChild ).removeClass( "ui-grid-cell-focus" );
    }

    //Remove existing selections
    rowIndex = row.entity.props[ col.field ].propertyDescriptor[ 'rowIdx' ];
    if( rowIndex === rowRenderIndex ) {
        var rowNew = $( gridCanvasDiv ).children().get( rowRenderIndex );
        var cells = $( rowNew ).find( "aw-matrix-cell" );
        for( var ix = 0; ix < cells.length; ix++ ) {
            var parentDiv = $( cells[ ix ] ).parent();
            var childDiv = $( cells[ ix ] ).children().get( 0 );
            var innerDiv = $( cells[ ix ] ).children().children().get( 0 );
            if( $( childDiv ).hasClass( "ui-grid-cell-focus" ) ) {
                $( childDiv ).removeClass( "ui-grid-cell-focus" );
            }
            if( $( innerDiv ).hasClass( "ui-grid-cell-focus" ) ) {
                $( innerDiv ).removeClass( "ui-grid-cell-focus" );
            }
            if( $( parentDiv ).hasClass( "aw-matrix-selectedcell" ) &&
                !$( newRowHead ).hasClass( "ui-grid-column-header-selected" ) ) {
                $( newRowHead ).addClass( "ui-grid-column-header-selected" );
                $( parentDiv ).removeClass( "aw-matrix-selectedcell" );
            }
        }
    }

    for( var k = 0; k < selectedRowHeads.length; k++ ) {
        if( newRowHead !== selectedRowHeads[ k ] ) {
            $( selectedRowHeads[ k ] ).removeClass( "ui-grid-column-header-selected" );
        }
    }
    var selectedColHeads = $( top ).find( "div.ui-grid-column-header-selected" );
    for( var l = 0; l < selectedColHeads.length; l++ ) {
        $( selectedColHeads[ l ] ).removeClass( "ui-grid-column-header-selected" );
    }
};

/**
 * Function to highlight the row header and col header on cell selection
 * @param {*} eventData
 */
export let setCellSelection = function( eventData ) {
    var newRowCol = eventData.selectedObjects;
    var oldRowCol = eventData.oldRowCol;
    var grid = eventData.grid;
    var rows = grid.rows;
    _.forEach( rows, function( row ) {
        if( row.entity.isRowSelected ) {
            row.entity.isRowSelected = false;
        }
    } );
    var columns = grid.columns;
    _.forEach( columns, function( column ) {
        if( column.colDef.isColSelected ) {
            column.colDef.isColSelected = false;
        }
    } );
    if( oldRowCol && oldRowCol.row.isRowSelected ) {
        oldRowCol.row.isRowSelected = false;
        oldRowCol.col.colDef.isColSelected = false;
    }
    if( newRowCol && newRowCol.col.colDef.field !== "object_name" ) {
        newRowCol.row.entity.isRowSelected = true;
        newRowCol.col.colDef.isColSelected = true;
    }
    var currentTarget = eventData.currentTarget;
    var matrixCell = $( currentTarget ).parents( "aw-matrix-cell" ).get( 0 );
    var parentDiv = $( matrixCell ).parent().get( 0 );
    $( parentDiv ).addClass( "aw-matrix-selectedcell" );
    var prevSiblings = $( parentDiv ).prevAll();
    var newRowHeaderDiv = prevSiblings.get( prevSiblings.length - 1 );
    var top = grid.element[ 0 ];
    var newColRenderIndex = 0;
    var oldColRenderIndex = 0;

    for( var iDx = 0; iDx < columns.length; iDx++ ) {
        if( columns[ iDx ].field === newRowCol.col.field ) {
            newColRenderIndex = iDx - 1;
        }
        if( oldRowCol && columns[ iDx ].field === oldRowCol.col.field ) {
            oldColRenderIndex = iDx - 1;
        }
    }

    var ocolFilter;
    var oldRowRenderIndex;
    if( oldRowCol ) {
        ocolFilter = '[_colindex="' + oldColRenderIndex + '"]';
        var oldCol = $( top ).find( "aw-matrix-column-header" ).filter( ocolFilter ).get( 0 );
        if( oldCol ) {
            var oldColHead = $( oldCol ).parent().get( 0 );
            $( oldColHead ).removeClass( "ui-grid-column-header-selected" );
            oldRowRenderIndex = oldRowCol.row.entity.props[ oldRowCol.col.field ].propertyDescriptor[ 'rowIdx' ];
            var gridCanvasDiv = $( top ).find( "div.ui-grid-canvas" ).get( 0 );
            var oldRow = $( gridCanvasDiv ).children().get( oldRowRenderIndex );
            var oldRowHead = $( oldRow ).find( "aw-matrix-row-header" ).get( 0 );
            $( oldRowHead ).removeClass( "ui-grid-column-header-selected" );
        }
    }

    var ncolFilter = '[_colindex="' + newColRenderIndex + '"]';
    var newCol = $( top ).find( "aw-matrix-column-header" ).filter( ncolFilter ).get( 0 );
    var newColHead = $( newCol ).parent().get( 0 );
    $( newColHead ).addClass( "ui-grid-column-header-selected" );
    //Add selected class for row header
    var newRowHead = $( newRowHeaderDiv ).find( "aw-matrix-row-header" ).get( 0 );
    $( newRowHead ).addClass( "ui-grid-column-header-selected" );

    var selectedDiv = $( top ).find( "div.aw-matrix-selectedcell" );
    var selectedColHeads = $( top ).find( "div.ui-grid-column-header-selected" );
    var selectedRowHeads = $( top ).find( "aw-matrix-row-header.ui-grid-column-header-selected" );
    for( var i = 0; i < selectedDiv.length; i++ ) {
        if( parentDiv !== selectedDiv[ i ] ) {
            $( selectedDiv[ i ] ).removeClass( "aw-matrix-selectedcell" );
        }
    }
    for( i = 0; i < selectedColHeads.length; i++ ) {
        if( newColHead !== selectedColHeads[ i ] ) {
            $( selectedColHeads[ i ] ).removeClass( "ui-grid-column-header-selected" );
        }
    }
    for( i = 0; i < selectedRowHeads.length; i++ ) {
        if( newRowHead !== selectedRowHeads[ i ] ) {
            $( selectedRowHeads[ i ] ).removeClass( "ui-grid-column-header-selected" );
        }
    }
    var selectedRowDiv = $( top ).find( "div.ui-grid-row-selected" );
    if( selectedRowDiv ) {
        for( i = 0; i < selectedRowDiv.length; i++ ) {
            $( selectedRowDiv[ i ] ).removeClass( "ui-grid-row-selected" );
        }
    }
};

/**
 * This function is to deselect a matrix cell. In this function we are removing the css of the cell as well as row
 * and column header and unloading the connection table if it was loaded earlier on selection.
 *
 * @param {*} eventData - The event data which gets passed on the gridCellDeSelection event which gets fired from
 *            the aw-matrix cell directive on cell deselection
 */
export let setCellDeSelection = function( eventData ) {
    var lastRowCol = eventData.lastRowCol;
    var grid = eventData.grid;
    var colRenderIndex = eventData.colRenderIndex;
    var element = eventData.deSelectedObject;
    if( lastRowCol ) {
        var top = grid.element[ 0 ];
        var selectedRow = lastRowCol.row;
        var selectedCol = lastRowCol.col;
        selectedRow.isRowSelected = false;
        selectedCol.colDef.isColSelected = false;
        var oldColRenderIndex = colRenderIndex - 1;
        var ocolFilter = '[_colindex="' + oldColRenderIndex + '"]';
        var oldCol = $( top ).find( "aw-matrix-column-header" ).filter( ocolFilter ).get( 0 );
        var oldColHead = $( oldCol ).parent().get( 0 );
        $( oldColHead ).removeClass( "ui-grid-column-header-selected" );
        var oldRowRenderIndex = selectedRow.entity.props[ lastRowCol.col.field ].propertyDescriptor[ 'rowIdx' ];
        var gridCanvasDiv = $( top ).find( "div.ui-grid-canvas" ).get( 0 );
        var oldRow = $( gridCanvasDiv ).children().get( oldRowRenderIndex );
        var oldRowHead = $( oldRow ).find( "aw-matrix-row-header" ).get( 0 );
        $( oldRowHead ).removeClass( "ui-grid-column-header-selected" );
        var parentDiv = element.parent();
        parentDiv.removeClass( 'aw-matrix-selectedcell' );
        var childDiv = element.children().get( 0 );
        if( $( childDiv ).hasClass( 'ui-grid-cell-focus' ) ) {
            $( childDiv ).removeClass( 'ui-grid-cell-focus' );
        }
        var innerDiv = $( childDiv ).children().get( 0 );
        if( $( innerDiv ).hasClass( 'ui-grid-cell-focus' ) ) {
            $( innerDiv ).removeClass( 'ui-grid-cell-focus' );
        }
        selectionService.updateSelection( [] );
    }
};

/**
 * function to select the pinned Column
 * @param {object} eventData
 */
export let selectPinnedColumn = function( eventData ) {
    var colObj = eventData.colObj;
    var colVMO = eventData.selection;
    var grid = eventData.grid;
    var gridId = grid.appScope.gridid;
    var rows = grid.rows;
    var top = grid.element[ 0 ];

    if( colObj.colDef.isColSelected ) {
        _.forEach( rows, function( row ) {
            if( row.entity.isRowSelected ) {
                row.entity.isRowSelected = false;
                var selectedRowHeads = $( top ).find( "aw-matrix-row-header.ui-grid-column-header-selected" );
                _.forEach( selectedRowHeads, function( selectedRow ) {
                    $( selectedRow ).removeClass( "ui-grid-column-header-selected" );
                } );
            }
        } );

        var columns = grid.columns;
        _.forEach( columns, function( column ) {
            if( column.field !== "object_name" ) {
                if( column.colDef.isColSelected ) {
                    column.colDef.isColSelected = false;
                    var selectedColHeads = $( top ).find( "div.ui-grid-column-header-selected" );
                    _.forEach( selectedColHeads, function( selectedCol ) {
                        $( selectedCol ).removeClass( "ui-grid-column-header-selected" );
                    } );
                }
            }
        } );
        eventBus.publish( gridId + '.rowColSelection', {
            selectedObjects: [ colVMO ]
        } );
    } else {
        eventBus.publish( gridId + '.rowColSelection', {
            selectedObjects: []
        } );
    }

    var newColHead = $( top ).find( "div.aw-matrix-pinnedHeader" ).parent();

    if( $( newColHead ).hasClass( "ui-grid-column-header-selected" ) ) {
        $( newColHead ).removeClass( "ui-grid-column-header-selected" );
    } else {
        $( newColHead ).addClass( "ui-grid-column-header-selected" );
    }

    var cells = $( top ).find( "div.aw-matrix-selectedcell" );
    if( cells.length > 0 ) {
        _.forEach( cells, function( cell ) {
            if( $( cell ).hasClass( "aw-matrix-selectedcell" ) ) {
                $( cell ).removeClass( "aw-matrix-selectedcell" );
            }
        } );
    }
    var innerContents = $( top ).find( "div.ui-grid-cell-focus" );
    if( innerContents.length > 0 ) {
        _.forEach( innerContents, function( cellContent ) {
            if( $( cellContent ).hasClass( "ui-grid-cell-focus" ) ) {
                $( cellContent ).removeClass( "ui-grid-cell-focus" );
            }
        } );
    }
};

export default exports = {
    selectColHeader,
    selectRowHeader,
    setCellSelection,
    setCellDeSelection,
    selectPinnedColumn
};
app.factory( 'awMatrixSelectionService', () => exports );
