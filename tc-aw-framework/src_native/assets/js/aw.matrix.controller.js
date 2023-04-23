// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw.matrix.controller
 */
import * as app from 'app';
import $ from 'jquery';
import 'ui.grid';

var _template = '<div title={{row.entity.descriptor.displayName}} __rowid={{row.entity.descriptor.id}} aw-matrix-click-row-header class="ui-grid-cell-contents" >' +
    '<aw-matrix-row-header context={{row.entity.descriptor.id}}></aw-matrix-row-header></div>';

/**
 * Defines the Matrix controller
 * 
 * @memberof NgControllers
 * @member awMatrixController
 */
app
    .controller(
        'awMatrixController',
        [
            '$scope',
            function( $scope ) {
                var self = {};
                self = this;
                self.whatamI = "awMatrixController"; //debug aid

                // rudimentary factory method to create a rowMaster instance
                // the rowMaster is what the grid uses for lookup to the data.   Dependency on referencing the data.
                var rowMasterFactory = function( rowDescriptors, visible ) {
                    var rowMaster = {};
                    rowMaster.descriptor = rowDescriptors;
                    rowMaster.isVisible = visible;
                    rowMaster.descriptor.id = rowDescriptors.id;

                    // function to get the content for the display of this row.
                    rowMaster.getRowHeader = function() {
                        return getRowTemplateString( rowMaster.descriptor );
                    };

                    rowMaster.rowDisplay = function() {
                        // return the data for display in column 0 (row header)
                        return rowMaster.descriptor.displayName;
                    };
                    // this is the cell data retrieval function call.
                    // it gets called from the uiGrid to get the cell value for
                    // specific row, col coordinate.   For the matrix case, this gets directed back
                    // up to the containerVM for resolution.
                    rowMaster.getValueForColumn = function( colKey ) {
                        var rowKey = rowMaster.descriptor.id;
                        if( self.containerVM.api && self.containerVM.api.getCellValue ) {
                            return self.containerVM.api.getCellValue( rowKey, colKey );
                        }
                        return ""; // null or empty object?
                    };

                    //this is to highlight row  based on row header selection
                    rowMaster.onRowHeaderClick = function( rowId, event ) {
                        rowHeaderSelection( rowId, event );
                    };

                    return rowMaster;
                };

                var getRowTemplateString = function( rowDescriptor ) {
                    var response = '{{ ' + rowDescriptor.rowHeaderTemplate ? rowDescriptor.rowHeaderTemplate :
                        self.containerVM.api.rowHeaderTemplate ? self.containerVM.api
                        .rowHeaderTemplate( rowDescriptor ) : '<div class="aw-matrix-rowHeader">' +
                        rowDescriptor.displayName + '</div> }}';
                    return response;
                };

                // static first grid column which holds the row headers
                var firstColumn = {
                    // placeholder - this is the first column which holds the "row" names, no title or column level interaction.
                    name: "",
                    field: "rowDisplay()",
                    cellTemplate: _template,
                    displayName: '', // empty
                    pinnedLeft: true,
                    enableSelection: false,
                    enableCellSelection: false,
                    enableColumnMenu: false, // hides all the column header stuff in this field - should be blank.
                    enableSorting: false,
                    minWidth: 100,
                    width: 190,
                    maxWidth: 250
                };

                // default column defs - single row header to start with
                $scope.columnDefinitions = [ firstColumn ];

                // generate a column master instance to represent the column of data.
                var columnMatrixMasterFactory = function( cInfo, visible ) {
                    var columnMaster = {};
                    // could use this visible flag to control UI visibility
                    columnMaster.isVisible = visible;
                    columnMaster.data = cInfo;
                    columnMaster.key = cInfo.id; // need unique lookup id per column
                    columnMaster.displayName = cInfo.displayName;

                    return columnMaster;
                };

                // utility function to create the columnMaster object per column info.
                var generateColumnMastersForInfo = function( columnInfos ) {
                    var columnMasterList = [];
                    // generate column master bound to each data object.
                    if( columnInfos && columnInfos.length ) {
                        for( var idx = 0; idx < columnInfos.length; idx++ ) {
                            var cm = columnMatrixMasterFactory( columnInfos[ idx ], true );
                            columnMasterList.push( cm );
                        }
                    }
                    return columnMasterList;
                };

                var getColumnHeaderTemplate = function( colDescriptor ) {

                    var colSafeUid = colDescriptor.id;

                    var tempStr = '{{ ' + colDescriptor.columnHeaderTemplate ? colDescriptor.columnHeaderTemplate :
                        self.containerVM.api.columnHeaderTemplate ? self.containerVM.api
                        .columnHeaderTemplate( colDescriptor ) : '<div class="aw-matrix-header">' +
                        colDescriptor.displayName + '</div> }}';

                    var response = '<div title="' + colDescriptor.displayName +
                        '" class="aw-matrix-header" aw-matrix-click-col __colid = "' + colSafeUid + '">' +
                        tempStr + '</div>';

                    return response;
                };

                // exposed function that triggers column generation for the grid.
                var generateMatrixColumns = function( containerVM, modCols ) {
                    // create column master which is sort of the main binding target for uiGrid column
                    var masterList = generateColumnMastersForInfo( modCols );

                    // now create the list of uiGrid columnDef instances that the grid will render.
                    for( var idx = 0; idx < masterList.length; idx++ ) {
                        var clMaster = masterList[ idx ];
                        var colSafeUid = clMaster.data.id;
                        var cdef = {};
                        cdef.name = clMaster.key;
                        cdef.field = 'getValueForColumn("' + colSafeUid + '")';
                        cdef.displayName = clMaster.displayName;
                        cdef.headerCellTemplate = getColumnHeaderTemplate( clMaster.data );
                        cdef.cellTemplate = getCellTemplate( colSafeUid );
                        cdef.cellClass = function( grid, row, col, rowRenderIndex, colRenderIndex ) {
                            var odd = false;
                            var even = isEven( rowRenderIndex, colRenderIndex );
                            if( !even ) {
                                odd = isOdd( rowRenderIndex, colRenderIndex );
                            }

                            var rowid = row.entity.descriptor.id;
                            var colid = col.name;
                            if( rowid === colid ) {
                                return 'aw-matrix-novalue';
                            } else if( even ) {
                                return 'aw-matrix-evencell';
                            } else if( odd ) {
                                return 'aw-matrix-oddcell';
                            }

                            return 'aw-matrix-mixcell';
                        };

                        cdef.width = 48;
                        cdef.minWidth = 48;
                        cdef.enablePinning = false;
                        cdef.enableSorting = false;

                        cdef.onCtrlClick = function( rowId, colId, event ) {
                            $scope.select = true;
                            $scope.needReset = true;
                            ctrlSelect( rowId, colId, event );
                        };

                        cdef.onColClick = function( colId, event ) {
                            colHeaderSelection( colId, event );
                        };

                        $scope.columnDefinitions.push( cdef );
                    }
                    return $scope.columnDefinitions;
                };

                var isEven = function( rowIndex, colIndex ) {
                    var rowIsEven = rowIndex % 2 === 0;
                    var colIsEven = colIndex % 2 === 0;
                    if( rowIsEven && colIsEven ) {
                        return true;
                    }
                    return false;
                };

                var isOdd = function( rowIndex, colIndex ) {
                    var rowIsOdd = rowIndex % 2 !== 0;
                    var colIsOdd = colIndex % 2 !== 0;
                    if( rowIsOdd && colIsOdd ) {
                        return true;
                    }
                    return false;
                };

                var getCellTemplate = function( colId ) {
                    var cellElt = '<div title="{{COL_FIELD}}" __colid="' + colId +
                        '" __rowid= {{row.entity.descriptor.id}}' +
                        ' __rowIndex={{rowRenderIndex}}  __colIndex="{{colRenderIndex}}" ' +
                        ' class ="ui-grid-cell-contents aw-matrix-cell" aw-matrix-click-cell>{{COL_FIELD}}</div>';
                    return cellElt;
                };

                //contains css class as string
                var cssForSelectedCol = 'ui-grid-matrix-header-cell-selected';
                var cssForSelectedRow = 'ui-grid-matrix-header-cell-selected';
                var cssForUnselection = 'ui-grid-matrix-header-cell-unselected';

                //function for header selection this is only to highlight the section under column head
                var colHeaderSelection = function( colId, event ) {
                    var colSelected = event.currentTarget;
                    var colHeaderDiv = $( colSelected ).parent();
                    var gridHtml = self.gridApi.grid.element[ 0 ];

                    var getFocusedCells = $( gridHtml ).find( 'div' ).filter( '[class*="ui-grid-cell-focus"]' );
                    var isCellFocused = getFocusedCells.hasClass( 'ui-grid-cell-focus' );

                    $scope.isColHeadSelected = true;

                    var filter = "[__colid='" + colId + "']";
                    var cellDivs = $( "div" ).find( filter );

                    var isSelected = $( colHeaderDiv ).hasClass( cssForSelectedCol );
                    if( isSelected ) {
                        if( isCellFocused ) {
                            resetSelected( gridHtml, true );
                        }
                        colHeaderDiv.removeClass( cssForSelectedCol );
                        cellDivs.removeClass( cssForSelectedCol );
                        if( colId ) {
                            self.containerVM.events.handleColumnSelection( colId, false );
                        }
                    } else {
                        resetSelected( gridHtml, true );
                        colHeaderDiv.addClass( cssForSelectedCol );
                        cellDivs.addClass( cssForSelectedCol );
                        if( colId ) {
                            self.containerVM.events.handleColumnSelection( colId, true );
                        }
                    }
                };

                //function for header selection this is only to highlight the section under row head
                var rowHeaderSelection = function( rowId, event ) {
                    var rowSelected = event.currentTarget;
                    var rowHeaderDiv = $( rowSelected ).parent().parent();
                    var gridHtml = self.gridApi.grid.element[ 0 ];

                    var filter = "[__rowid='" + rowId + "']";
                    var cellDivs = $( "div" ).find( filter );

                    $scope.isRowHeadSelected = true;

                    var isSelected = $( rowHeaderDiv ).hasClass( cssForSelectedRow );
                    if( isSelected ) {
                        resetSelected( gridHtml, true );
                        if( rowId ) {
                            self.containerVM.events.handleRowSelection( rowId, false );
                        }
                    } else {
                        resetSelected( gridHtml, true );
                        rowHeaderDiv.addClass( cssForSelectedRow );
                        cellDivs.addClass( cssForSelectedRow );
                        $scope.isColHeadSelected = false;
                        if( rowId ) {
                            self.containerVM.events.handleRowSelection( rowId, true );
                        }
                    }
                };

                //function to handle multiselect (ctrl+click) in matrix
                var ctrlSelect = function( rowId, colId, event ) {

                    var cellSelected = event.currentTarget;

                    //toggles the cell selection for multiselect ctrl+click
                    $( cellSelected ).toggleClass( "ui-grid-cell-focus" );

                    //if cell is unselected using ctrl+click then set flag to false
                    if( !$( cellSelected ).hasClass( "ui-grid-cell-focus" ) ) {
                        $scope.select = false;
                        if( rowId && colId ) {
                            self.containerVM.events.handleCellNavigation( colId, rowId, false );
                        }
                    } else if( rowId && colId ) {
                        self.containerVM.events.handleCellNavigation( colId, rowId, true );
                    }

                    var top = $( cellSelected ).offsetParent().offsetParent().offsetParent().offsetParent()
                        .get( 0 );

                    var colHead = $( top ).find( "div" ).filter( '[__colid="' + colId + '"]' ).get( 0 );
                    var rowHead = $( top ).find( "aw-matrix-row-header" ).filter( '[context="' + rowId + '"]' )
                        .get( 0 );

                    var colParentLocator = $( colHead ).parent();
                    var rowParentLocator = $( rowHead ).parent().parent();

                    var colCellsLocator = $( top ).find( "div" ).filter( '[__colid="' + colId + '"]' );
                    var rowCellsLocator = $( top ).find( "div" ).filter( '[__rowid="' + rowId + '"]' );

                    var isColCellSelected = colCellsLocator.hasClass( "ui-grid-cell-focus" );
                    var isRowCellSelected = rowCellsLocator.hasClass( "ui-grid-cell-focus" );

                    if( $scope.isColHeadSelected ) {
                        resetSelected( top, false );
                        $scope.isColHeadSelected = false;
                    }

                    if( $scope.isRowHeadSelected ) {
                        resetSelected( top, true );
                        $scope.isRowHeadSelected = false;
                    }

                    //if multiple cells are selected under a column then keep column head as selected
                    if( isColCellSelected ) {
                        $( colParentLocator ).addClass( cssForSelectedCol ).removeClass( cssForUnselection );
                    } else {
                        $( colParentLocator ).removeClass( cssForSelectedCol ).addClass( cssForUnselection );
                    }

                    //if multiple cells are selected under a row then keep row head as selected
                    if( isRowCellSelected ) {
                        $( rowParentLocator ).addClass( cssForSelectedRow );
                    } else {
                        $( rowParentLocator ).removeClass( cssForSelectedRow ).removeClass( cssForUnselection );
                        self.containerVM.events.handleCellNavigation( colId, rowId, false );
                    }
                };

                // created list of rowMasters (for grid binding)
                var rowMasterMatrix = [];

                var noOldRc = function( newColHead, newRowHead, newColId, newRowId ) {
                    $( newColHead ).addClass( cssForSelectedCol ).removeClass( cssForUnselection );
                    $( newRowHead ).addClass( cssForSelectedRow ).removeClass( cssForUnselection );
                    self.containerVM.events.handleCellNavigation( newColId, newRowId, true );
                };

                var selectNewColAndOldRow = function( newColHead, oldColHead, oldRowHead, newColId, oldRowId ) {
                    $( newColHead ).addClass( cssForSelectedCol ).removeClass( cssForUnselection );
                    $( oldColHead ).removeClass( cssForSelectedCol ).addClass( cssForUnselection );
                    $( oldRowHead ).addClass( cssForSelectedRow ).removeClass( cssForUnselection );
                    self.containerVM.events.handleCellNavigation( newColId, oldRowId, true );
                };

                var selectNewRowAndOldCol = function( newRowHead, oldRowHead, oldColHead, oldColId, newRowId ) {
                    $( newRowHead ).addClass( cssForSelectedRow ).removeClass( cssForUnselection );
                    $( oldRowHead ).removeClass( cssForSelectedRow ).addClass( cssForUnselection );
                    $( oldColHead ).addClass( cssForSelectedCol ).removeClass( cssForUnselection );
                    self.containerVM.events.handleCellNavigation( oldColId, newRowId, true );
                };

                var selectNewRowAndNewCol = function( newColHead, newRowHead, oldColHead, oldRowHead, newColId,
                    newRowId ) {
                    $( oldColHead ).removeClass( cssForSelectedCol ).addClass( cssForUnselection );
                    $( oldRowHead ).removeClass( cssForSelectedRow ).addClass( cssForUnselection );
                    $( newColHead ).addClass( cssForSelectedCol ).removeClass( cssForUnselection );
                    $( newRowHead ).addClass( cssForSelectedRow ).removeClass( cssForUnselection );
                    self.containerVM.events.handleCellNavigation( newColId, newRowId, true );
                };

                var resetSelected = function( gridHtml, removeCellFocus ) {
                    var gridElement = $( gridHtml ).offsetParent();
                    var selectedCol = $( gridElement ).find( 'div' ).filter(
                        '[class*="' + cssForSelectedCol + '"]' );
                    var selectedRow = $( gridElement ).find( 'div' ).filter(
                        '[class*="' + cssForSelectedRow + '"]' );

                    var parentSelectedRow = $( selectedRow[ 0 ] ).parent();
                    var isParentRowSelected = parentSelectedRow.hasClass( 'ui-grid-row-header-cell-over' );
                    if( isParentRowSelected ) {
                        parentSelectedRow.removeClass( 'ui-grid-row-header-cell-over' );
                    }
                    selectedRow.removeClass( cssForSelectedRow );
                    selectedCol.removeClass( cssForSelectedCol );
                    if( removeCellFocus ) {
                        var getFocusedCells = $( gridElement ).find( 'div' ).filter(
                            '[class*="ui-grid-cell-focus"]' );
                        getFocusedCells.removeClass( "ui-grid-cell-focus" );
                    }
                };

                // uiGrid settings/configuration
                var gridOptions = {
                    //enableSorting: true, // skip the header sort interaction
                    enableColumnMenus: false, // no menus
                    enableRowHeaderSelection: false,
                    rowHeight: 48,
                    data: rowMasterMatrix,
                    columnDefs: $scope.columnDefinitions,
                    modifierKeysToMultiSelectCells: true,
                    onRegisterApi: function( gridApi ) {
                        self.gridApi = gridApi;

                        //cell Navigation for selection of the cell based user click on cell
                        if( gridApi.cellNav ) {
                            gridApi.cellNav.on.navigate( gridApi.grid.appScope,
                                function( newRowCol, oldRowCol ) {

                                    //cell Navigation logic for selecting column and row headers based on cell focused
                                    var top = gridApi.grid.element[ 0 ];

                                    var newColId = newRowCol.col.name;
                                    var newRowId = newRowCol.row.entity.descriptor.id;

                                    var ncolFilter = '[__colid="' + newColId + '"]';
                                    var nrowFilter = '[context="' + newRowId + '"]';
                                    var newCol = $( top ).find( "div" ).filter( ncolFilter ).get( 0 );
                                    var newRow = $( top ).find( "aw-matrix-row-header" ).filter( nrowFilter )
                                        .get( 0 );

                                    var newColHead = $( newCol ).parent();
                                    var newRowHead = $( newRow ).parent().parent();

                                    if( $scope.isColHeadSelected ) {
                                        resetSelected( top, false );
                                        $scope.isColHeadSelected = false;
                                    }

                                    //if there is no previous selection
                                    if( !oldRowCol ) {
                                        noOldRc( newColHead, newRowHead, newColId, newRowId );
                                    }

                                    //if current selection is not multiselect
                                    if( !$scope.select ) {
                                        /***********************************************************************
                                         * if last selection was multiselect and new selection is single select
                                         * then reset all selection except if row header is selected
                                         **********************************************************************/
                                        if( $scope.needReset && !$scope.isRowHeadSelected ) {
                                            resetSelected( top, false );
                                        }
                                        //if Row header is selected then do not execute cell nav(skipping the execution as row header selection fires cell Nav event as well)
                                        if( ( newColId === "" ) && ( $scope.isRowHeadSelected ) ) {
                                            return;
                                        }

                                        if( $scope.isRowHeadSelected ) {
                                            resetSelected( top, true );
                                            $scope.isRowHeadSelected = false;
                                        }

                                        $scope.needReset = false;
                                        //if old selection exists
                                        if( oldRowCol ) {
                                            var oldColId = oldRowCol.col.name;
                                            var oldRowId = oldRowCol.row.entity.descriptor.id;

                                            var ocolFilter = '[__colid="' + oldColId + '"]';
                                            var orowFilter = '[context="' + oldRowId + '"]';

                                            var oldCol = $( top ).find( "div" ).filter( ocolFilter ).get( 0 );
                                            var oldRow = $( top ).find( "aw-matrix-row-header" ).filter(
                                                orowFilter ).get( 0 );

                                            var oldColHead = $( oldCol ).parent();
                                            var oldRowHead = $( oldRow ).parent().parent();
                                            //if new selection is different cell
                                            if( newRowCol !== oldRowCol ) {

                                                if( newRowCol.row === oldRowCol.row &&
                                                    newRowCol.col !== oldRowCol.col ) {
                                                    /**
                                                     * if the new cell is selected under new column header but
                                                     * row is same then select new column header and unselect
                                                     * old column header
                                                     */
                                                    selectNewColAndOldRow( newColHead, oldColHead, oldRowHead,
                                                        newColId, oldRowId );
                                                } else if( newRowCol.row !== oldRowCol.row &&
                                                    newRowCol.col === oldRowCol.col ) {
                                                    /**
                                                     * if the new cell is selected under new row header but
                                                     * column is same then select new row header and unselect
                                                     * old row header
                                                     */
                                                    selectNewRowAndOldCol( newRowHead, oldRowHead, oldColHead,
                                                        oldColId, newRowId );
                                                } else {
                                                    /**
                                                     * if the new cell is selected under new row header and new
                                                     * column then select new row and column header and unselect
                                                     * old row and column header
                                                     */
                                                    selectNewRowAndNewCol( newColHead, newRowHead, oldColHead,
                                                        oldRowHead, newColId, newRowId );
                                                }

                                            }
                                        }
                                    }
                                    $scope.select = false;
                                } );
                        }
                    }
                }; // end gridOptions

                $scope.gridMatrixOptions = gridOptions;

                // reference to the gridOptions object (bound to ui grid via scope)
                self.gridOpts = gridOptions;

                $scope.hideTheWidget = false; // normally show the grid

                /**
                 * @memberof NgControllers.awMatrixController
                 * 
                 * @param {Object} containerVM - the containerVM
                 */
                self.setContainerVM = function( containerVM ) {
                    // keep a reference to the containerVM
                    self.containerVM = containerVM;
                    containerVM.gridOptions = self.gridOpts;
                    $scope.$evalAsync( function() {
                        // ensure we update to the latest VM data
                        $scope.updateRowInfoDefs( containerVM );
                        $scope.updateColumnInfoDefs( containerVM );
                    } ); // evalAsync

                };

                /**
                 * Trigger an update of the rowDescriptors from the VM list. In order to allow for empty XRT
                 * Object sets, if there is no object data (dataPage), then we won't display the rows.
                 * 
                 * @memberof NgControllers.awMatrixController
                 * 
                 * @param {Object} containerVM - the containerVM
                 */
                $scope.updateRowInfoDefs = function( containerVM ) {
                    var rowDescriptors = containerVM.rowDescriptors;

                    if( rowDescriptors && rowDescriptors.length > 0 ) {
                        // empty existing
                        rowMasterMatrix.length = 0;

                        // render grid if row object is available
                        $scope.hideTheWidget = false; // render the grid
                        for( var idx = 0; idx < rowDescriptors.length; idx++ ) {
                            rowMasterMatrix.push( rowMasterFactory( rowDescriptors[ idx ], true ) );
                        }
                    }
                };

                /**
                 * Trigger an update of the column info from the VM list. This represents the columns of display
                 * data.
                 * 
                 * @member of NgControllers.awMatrixController
                 * 
                 * @param {object} containerVM An object container for column and row data
                 */
                $scope.updateColumnInfoDefs = function( containerVM ) {
                    var modCols = containerVM.colDescriptors;

                    if( modCols && modCols.length > 0 ) {

                        var columns = generateMatrixColumns( containerVM, modCols );
                        // update the instances (Columns) for the matrix case.
                        if( containerVM.gridOptions ) {
                            containerVM.gridOptions.columnDefs = columns;
                        }
                    }
                };
            }
        ] );
