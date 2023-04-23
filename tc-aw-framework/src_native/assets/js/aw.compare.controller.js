// Copyright (c) 2020 Siemens

/**
 * @module js/aw.compare.controller
 */
import app from 'app';
import $ from 'jquery';
import 'js/compareService';
import 'js/command.service';

/**
 * Defines the compare controller
 *
 * @memberof NgControllers
 * @member awCompareController
 */
app.controller( 'awCompareController', [
    '$scope',
    'commandService',
    'compareService',
    function( $scope, commandSvc, compareSvc ) {
        var self = this; // eslint-disable-line no-invalid-this

        var _columnsById = {};

        self.containerVM = null;

        // these become the backing store for the column definitions.
        var columnMasterList = [];

        // created list of rowMasters (for grid binding)
        var rowMasterMatrix = [];

        // little facet structure - (basically the prop lookup key and the display name for the "row")
        var facetFactory = function( key, displayName ) {
            var facet = {};
            facet.key = key;
            facet.displayName = displayName;
            return facet;
        };

        // factory method to create a rowMaster instance
        // the rowMaster is what the grid uses to represent the data. The cellData for the row
        // will have a property from each column data object instance.
        var rowMasterFactory = function( facet ) {
            var rowMaster = {};
            rowMaster.facet = facet;
            rowMaster.rowDisplayName = function() {
                return facet.displayName;
            };
            rowMaster.cellData = {}; // cell storage for the cellVMs of this row, one per column.

            // RMB event - pass in on to the registered event handler
            rowMaster.onRMBEvent = function( event ) {
                self.containerVM.events.onRMB( event.clientX, event.clientY, event );
            };

            // on click event on cell which has already focused with cellNav event
            // main behavior is in cellNav handling, this only has to deal with clicks
            // on the currently "Nav'd" cell
            rowMaster.onClickEvent = function( event ) {
                var $currentCell = $( event.currentTarget );
                // click on cell that already has focus should toggle OFF the selection.
                if( $currentCell.hasClass( 'ui-grid-cell-focus' ) ) {
                    // is the focus cell already selected?
                    var isCurrentlySelected = $currentCell.hasClass( 'aw-jswidgets-selectedObject' );
                    var myColKey = $currentCell.attr( '__colid' );

                    // get the master instance
                    if( _columnsById[ myColKey ] ) {
                        var master = _columnsById[ myColKey ];
                        if( master ) {
                            if( isCurrentlySelected ) {
                                clearSelectedColumns(); // eslint-disable-line no-use-before-define
                                master.objInfo.selected = false;
                                selectNotification( myColKey, false ); // eslint-disable-line no-use-before-define
                            } else {
                                // clear current selection first
                                clearSelectedColumns(); // eslint-disable-line no-use-before-define
                                master.objInfo.selected = true;
                                selectNotification( myColKey, true ); // eslint-disable-line no-use-before-define
                            }
                        }
                    }
                }
            };

            return rowMaster;
        };

        // take the current list of field definitions, and the current column set and
        // populate or update the cell data structures within the rows
        var populateRowDataCells = function() {
            for( var colIdx = 0; colIdx < columnMasterList.length; colIdx++ ) {
                var colMaster = columnMasterList[ colIdx ];
                var sharedColObj = colMaster.objInfo; // shared state for every row with this column
                for( var rowIdx = 0; rowIdx < rowMasterMatrix.length; rowIdx++ ) {
                    var rowMstr = rowMasterMatrix[ rowIdx ];
                    var rowKey = rowMstr.facet.key;

                    // if there is already a cellData instance, update it.  (If we skipped updating,
                    // the binding gets out of date, and the UI doesn't update.)
                    // if there is no cellData instance yet -- create one.
                    var cellVM;
                    if( rowMstr.cellData[ colMaster.key ] ) {
                        // already have the cellVM, just replace it's contents
                        cellVM = rowMstr.cellData[ colMaster.key ];
                    } else {
                        cellVM = {};
                    }

                    cellVM.objInfo = sharedColObj; // shared state
                    if( colMaster.data && colMaster.data.props[ rowKey ] ) {
                        cellVM.data = colMaster.data;
                    } else {
                        cellVM.data = {}; // no data
                    }

                    rowMstr.cellData[ colMaster.key ] = cellVM;
                }
            }
        };

        // when compare items get unselected, the columns go away, but the row cellData instances
        // won't be automatically cleaned up - use this function to check for and remove any
        // cellData that no longer corresponds to a column
        var cleanDataCellsForDeletedColumns = function() {
            var numColumns = columnMasterList.length ? columnMasterList.length : 0;
            var colKeyList = null;
            if( rowMasterMatrix && rowMasterMatrix.length ) {
                for( var rowIdx = 0; rowIdx < rowMasterMatrix.length; rowIdx++ ) {
                    var rowMstr = rowMasterMatrix[ rowIdx ];
                    if( rowMstr && rowMstr.cellData &&
                        Object.keys( rowMstr.cellData ).length > numColumns ) {
                        // the cellData count is larger than the column count, need to cleanup

                        // create the colKeyList on first need
                        if( !colKeyList ) {
                            colKeyList = [];
                            for( var colIdx = 0; colIdx < columnMasterList.length; colIdx++ ) {
                                colKeyList.push( columnMasterList[ colIdx ].key );
                            }
                        }
                        var propKeys = Object.keys( rowMstr.cellData );
                        // iterate thru the cellData js props, cross check against the current
                        // set of column keys, if the cellData prop key is not in that list, remove it
                        for( var cellKeyidx = 0; cellKeyidx < propKeys.length; cellKeyidx++ ) {
                            var cellKey = propKeys[ cellKeyidx ];
                            if( colKeyList.indexOf( cellKey ) === -1 ) {
                                // not a valid columnn anymore, remove the data to avoid a leak
                                delete rowMstr.cellData[ cellKey ];
                            }
                        }
                    }
                }
            }
        };

        // function to sanitize the uid string to remove any characters (especially periods)
        // that cause issues with ui grid evaluation.   UI Grid logic was processing
        // the dot as an object reference notation.   The dynamic or bom line uid strings
        // contained various odd characters - dots, comma, etc which normal uids don't have.
        // for now just replace the dots/periods with dash
        var genSafeUid = function( uid ) {
            if( uid ) {
                return uid.replace( /\./g, '-' );
            }
            return '';
        };

        // factory method to create a columnmaster instance.  Each column is one distinct object.
        // The column key uniquely identifies the columnMaster.   In some cases we have to sanitize the uid string
        // to avoid special characters (dot, period, etc)
        var columnMasterFactory = function( data ) {
            var columnMaster = {};
            columnMaster.data = data; // keep a ref to the data object
            // shared info for all the rows under this column.  Provides a common shared binding source
            // ui state + references.
            columnMaster.objInfo = {
                selected: false
                // dataObj : data,  // may want the object data available for future binding?
            };
            columnMaster.key = genSafeUid( data.uid );
            return columnMaster;
        };

        // define the compare fixed first column - shows the properties for each row.
        var firstColumn = {
            // placeholder - this is the first column which holds the "row" names, no title or column
            // level interaction.
            name: '',
            field: 'rowDisplayName()',
            displayName: '', // empty
            cellTemplate: '<div aw-compare-right-click class="ui-grid-cell-contents" title="{{row.entity.facet.displayName}}"> {{row.entity.facet.displayName}} </div>',
            pinnedLeft: true,
            enableColumnMenu: false, // hides all the column header stuff in this field - should be blank.
            enableColumnMoving: false,
            enableSorting: false,
            allowCellFocus: false,
            width: 125,
            headerCellTemplate: //
                '<div class="aw-jswidgets-compareHeader ui-grid-cell-contents">' + //
                '<div class="aw-base-icon"></div>' + //
                '</div><div class="aw-jswidgets-headerTitle ui-grid-cell-contents"></div>'
        };

        // the column definitions - single row header (prop name) to start with
        var columnDefinitions = [ firstColumn ];

        // utility function to create the columnMaster object - one per data object.
        var generateColumnMastersForObjs = function( objData ) {
            var masterList = [];
            _columnsById = {}; // clear the list
            // generate column master bound to each data object.
            if( objData && objData.length ) {
                for( var idx = 0; idx < objData.length; idx++ ) {
                    var cm = columnMasterFactory( objData[ idx ] );
                    masterList.push( cm );
                    _columnsById[ cm.key ] = cm;
                }
            }
            return masterList;
        };

        // used to generate the column header cell template.  It is given the data object (ModelObject) as input.
        // presently there is not always an image URL available, so it calls back into the viewmodel to retrieve an image URL to display.
        // for the display name, if the object_string property is available, we will bind to that, otherwise show an empty string.
        var getColumnHeaderTemplate = function( obj ) {
            var safeName = genSafeUid( obj.uid );

            var valueString = 'col.colDef.awColMaster.data.props.object_string ? col.colDef.awColMaster.data.props.object_string.uiValues[0] : ' +
                'col.colDef.awColMaster.data.props.object_name ? col.colDef.awColMaster.data.props.object_name.uiValues[0] : \'\'';

            // the data object (native model object) is chained off the uigrid col object via the colDef, colMaster.data
            // priority is to use object_string, if that is not available
            // try object_name,  otherwise use blank.  So ternary binding expression
            // line limit length led to multi line string.
            // the firstColumn headerCellTemplate is a stripped down version of this result - update if this changes
            return '<div class="aw-jswidgets-compareHeader ui-grid-cell-contents" aw-compare-header-click __colid = "' +
                safeName +
                '" ng-class="{\'aw-jswidgets-selectedObject\' : col.colDef.awColMaster.objInfo.selected}"  >' +
                '<aw-model-icon vmo=\"col.colDef.awColMaster.data\" ></aw-model-icon>' +
                '</div>' +
                '<div class="aw-jswidgets-headerTitle ui-grid-cell-contents" ng-class="{\'aw-jswidgets-selectedObject\' : col.colDef.awColMaster.objInfo.selected}" ' +
                ' aw-compare-header-click __colid = "' +
                safeName +
                '" title="{{' +
                valueString +
                '}}">{{' + valueString + '}}</div>';
        };

        // function to clear selection state on all columnMasters.
        // used when changing selection
        var clearSelectedColumns = function() {
            if( columnMasterList ) {
                for( var idx = 0; idx < columnMasterList.length; idx++ ) {
                    if( columnMasterList[ idx ].objInfo && columnMasterList[ idx ].objInfo.selected ) {
                        columnMasterList[ idx ].objInfo.selected = false;
                    }
                }
            }
        };

        // the column Masters with a key lookup
        // track the last row object to be Navigated to or scrolled to.  Use this for Header
        // selection interaction to mark the row within the selected column.
        var _lastNavRow = null;

        // create the uiGrid column for each object. Create a unique column per object.
        var generateColumns = function( objData ) {
            var masterList = generateColumnMastersForObjs( objData );
            columnMasterList = masterList;

            var columns = [ firstColumn ];
            for( var idx = 0; idx < masterList.length; idx++ ) {
                var clMaster = masterList[ idx ];
                var safeName = clMaster.key;

                var cdef = {};
                cdef.name = safeName;
                cdef.awColMaster = clMaster; // hold a ref to the columnMaster
                cdef.field = safeName; // id key

                // pretty ugly cell template - the first part is binding the selection state, the __colid attribute provides
                // the column/object matching key for any lookup requirements.
                // The actual cell/prop value binding has to go from the row, then the column in that row via the cellData.
                // that cell then points back to the corresponding model object, and we need the property from that object
                // which corresponds to the row being displayed - so the entity.facet.key is the property name for the
                // property to be bound.   It looks a bit circular, but in order to see edit value updates we have to go back
                // through the model object reference since the property instances get replaced.
                cdef.cellTemplate = '<div class="ng-binding ng-scope ui-grid-cell-contents" ' +
                    ' ng-class="{\'aw-jswidgets-selectedObject\' : row.entity.cellData[col.colDef.field].objInfo.selected}" ' +
                    ' aw-compare-click __colid = "' +
                    safeName +
                    '"><ul class="aw-jswidgets-compareVal">' +
                    '<li ng-repeat="val in row.entity.cellData[col.colDef.field].data.props[row.entity.facet.key].uiValues" title="{{val}}">{{val}}</li></ul></div>';
                cdef.displayName = clMaster.displayName;
                cdef.headerCellTemplate = getColumnHeaderTemplate( clMaster.data );
                cdef.minWidth = 100;
                cdef.enablePinning = false;
                // on click event on header to toggle select for entire column
                cdef.onHeaderClickEvent = function( event ) {
                    var $currentCell = $( event.currentTarget );
                    var myColKey = $currentCell.attr( '__colid' );

                    // get the column def which matches the target colid value
                    var thisColDef = null;
                    for( var idx = 0; idx < columnDefinitions.length; idx++ ) {
                        if( columnDefinitions[ idx ].field === myColKey ) {
                            thisColDef = columnDefinitions[ idx ];
                            break;
                        }
                    }

                    // get the column master instance
                    if( _columnsById[ myColKey ] ) {
                        var master = _columnsById[ myColKey ];
                        if( master ) {
                            var isCurrentlySelected = master.objInfo.selected;
                            if( isCurrentlySelected ) {
                                // toggle it off - unselecting this column
                                self.gridApi.grid.cellNav.clearFocus();
                                clearSelectedColumns();
                                selectNotification( master.key, false );
                                self.gridApi.grid.cellNav.lastRowCol = null;
                                $scope.$evalAsync();
                            } else {
                                // want to set this column as selected.  Have to check current focusCell
                                // as that will determine if the cellNav handles selection or we have to
                                // do it explicitly here.
                                var navrc = self.gridApi.cellNav.getFocusedCell();
                                if( navrc && navrc.col.field === myColKey ) {
                                    // focused cell in same column - Nav won't fire, so set explicitly
                                    master.objInfo.selected = true;
                                }

                                // last row that was clicked or within scroll range.
                                var scrollRow = _lastNavRow;
                                if( !scrollRow && self.gridApi.grid.getVisibleRowCount() ) {
                                    // if there is no last nav row then get first visible (we haven't CellNavigated yet}
                                    var visRows = self.gridApi.grid.getVisibleRows();
                                    scrollRow = visRows[ 0 ];
                                }

                                if( scrollRow ) {
                                    // set focus somewhere in the column and allow the cellNav logic to manage selection
                                    self.gridApi.cellNav.scrollToFocus( scrollRow.entity, thisColDef );
                                }
                            }
                        }
                    }
                };
                columns.push( cdef );
            }

            columnDefinitions = columns;
            return columns;
        };

        // functions to support selection interaction

        // Method to single selection change to selection
        var selectNotification = function( columnName, selState ) {
            self.containerVM.events.handleSingleSelection( columnName, selState );
        };

        var gridOptions = {
            enableSorting: false, // skip the header sort interaction
            enableColumnMenus: false, // no menus
            enableRowSelection: false,
            enableMinHeightCheck: false,
            data: rowMasterMatrix,
            columnDefs: columnDefinitions,
            onRegisterApi: function( gridApi ) {
                self.gridApi = gridApi;

                gridApi.core.on.scrollEnd( gridApi.grid.appScope, function( scrollData ) {
                    // on a vertical scroll, we want to track what the visible range is
                    // so that if a header selection is done, we keep the ui showing that
                    // range of objects and we don't set ui focus somewhere else in the list
                    // of rows.   Note that the visible row set used here is more than just
                    // what is shown in the DOM.
                    // get the visible row count and relative scroll percent to determine
                    // the row index to set during header click.  Watch out for the upper bound.
                    if( scrollData && scrollData.grid && scrollData.y ) {
                        var rowCount = scrollData.grid.getVisibleRowCount();
                        var vertPercent = scrollData.y.percentage;
                        var rowToSet = Math.ceil( rowCount * vertPercent );
                        // adjust at upper bound point, don't want selection right at the bottom
                        if( rowToSet >= rowCount && rowToSet > 3 ) {
                            rowToSet -= 2;
                        }
                        // sanity check for out of range
                        if( rowToSet > rowCount - 1 ) {
                            rowToSet = rowCount - 1;
                        }
                        _lastNavRow = scrollData.grid.getVisibleRows()[ rowToSet ];
                    }
                } );

                // enable the cellNav module
                if( gridApi.cellNav ) {
                    gridApi.cellNav.on.navigate( gridApi.grid.appScope, function( newRc, oldRc ) {
                        var colid = newRc.col.colDef.name; // key

                        // get the master instance
                        if( _columnsById[ colid ] ) {
                            var master = _columnsById[ colid ];

                            if( master ) {
                                var isCurrentlySelected = master.objInfo.selected;
                                // no old Rc, add the highlight on column and select the object
                                if( !oldRc ) { // eslint-disable-line no-negated-condition
                                    if( isCurrentlySelected ) {
                                        // if there is no old header and is already selected, unselect the object
                                        master.objInfo.selected = false;
                                        selectNotification( colid, false );
                                    } else {
                                        // clear the old selection
                                        clearSelectedColumns();
                                        master.objInfo.selected = true;
                                        selectNotification( colid, true );
                                    }
                                } else {
                                    // have an oldRc
                                    // if the old Rc column and new Rc col are different, then remove the highlight on old col and add highlight to new column and select new object
                                    if( oldRc.col !== newRc.col ) { // eslint-disable-line no-lonely-if
                                        _lastNavRow = newRc.row; // cell Nav horizontal
                                        if( isCurrentlySelected ) {
                                            // if there is  old header and is already selected, unselect the object
                                            clearSelectedColumns();
                                            selectNotification( colid, false );
                                        } else {
                                            clearSelectedColumns();
                                            // select the new ones
                                            master.objInfo.selected = true;
                                            selectNotification( colid, true );
                                        }
                                    } else if( oldRc.row.uid === newRc.row.uid ) {
                                        // highlight the column during the scroll bar clear focus for selected object
                                        // this may be a scroll triggered Nav event.
                                        // this path is hit during scrolling, also if you select a cell via Nav, then do a header click
                                        // and then come back to the same row
                                        if( !_lastNavRow ) {
                                            clearSelectedColumns(); // no scroll info, valid navigation,
                                            master.objInfo.selected = true;
                                            // No event notification
                                        }
                                    } else if( isCurrentlySelected ) {
                                        // if the old Rc column and new Rc col are same and object is selected . then remove the highlight on old col and unselect object
                                        _lastNavRow = newRc.row; // same column different row
                                        master.objInfo.selected = false;
                                        selectNotification( colid, false );
                                    } else {
                                        // if the old Rc column and new Rc col are same and object is unselected . then add the highlight on new col and select object
                                        _lastNavRow = newRc.row; // same column different row
                                        clearSelectedColumns();
                                        // select the new ones
                                        master.objInfo.selected = true;
                                        selectNotification( colid, true );
                                    }
                                }
                            }
                        }
                    } );
                }

                if( gridApi.colMovable ) {
                    gridApi.colMovable.on.columnPositionChanged( gridApi.grid.appScope, function(
                        colDef, originalPosition, newPosition ) {
                        self.containerVM.events.columnPositionChanged( colDef.name, originalPosition,
                            newPosition );
                    } );
                }
            }
        }; // end gridOptions

        /**
         * Setup arrange columns
         */
        function _setupArrangeColumns( gridOptions ) {
            var cmdID = 'Awp0ColumnConfig';

            commandSvc.getCommand( cmdID ).then( function( command ) {
                if( command ) {
                    gridOptions.gridMenuCustomItems = [ {
                        title: command.title,

                        action: function() {
                            compareSvc.arrangeColumns( $scope.columnDefs );
                        }
                    } ];

                    // override grid menu setting if hidden
                    gridOptions.enableGridMenu = true;
                    gridOptions.gridMenuShowHideColumns = false;
                }
            } );
        }

        if( $scope.enableArrangeMenu ) {
            _setupArrangeColumns( gridOptions );
        }

        $scope.gridCompareOptions = gridOptions;

        // reference to the gridOptions object (bound to ui grid via scope)
        self.gridOpts = gridOptions;

        $scope.hideTheWidget = false; // normally show the grid

        /**
         * Set the View Model reference. The VM is the source object for all the information
         *
         * @memberof NgControllers.awCompareController
         *
         * @param {Object} containerVM - the containerVM
         */
        self.setContainerVM = function( containerVM ) {
            // keep a reference to the containerVM
            self.containerVM = containerVM;
            containerVM.gridOptions = self.gridOpts;
            $scope.$evalAsync( function() {
                // ensure we update to the latest VM data
                $scope.updateFieldDefs( containerVM );
                $scope.setDataAdapter( containerVM );
            } ); // evalAsync
        };

        /**
         * get a new data adapter - set the displayed data content based on this adapter. For compare -
         * the data objects become the columns
         *
         * @param {Object} containerVM - the containerVM
         */
        $scope.setDataAdapter = function( containerVM ) {
            // trigger the loading of the initial data
            if( containerVM.uiDataAdapter && containerVM.uiDataAdapter.bindingCollection &&
                containerVM.uiDataAdapter.bindingCollection.data ) {
                var columns = generateColumns( containerVM.uiDataAdapter.bindingCollection.data );
                populateRowDataCells();
                // this would be the point we could check for old data in the rowDataCells -
                cleanDataCellsForDeletedColumns();
                // update the instances (Columns) for the compare case.
                if( containerVM.gridOptions ) {
                    containerVM.gridOptions.columnDefs = columns;
                }
            }
        };

        /**
         * simple utility function that checks if the grid field list doesn't match the VM and triggers
         * an update. Due to async timing differences this may happen during data updates.
         */
        $scope.checkFieldDefUpdates = function( containerVM ) {
            if( containerVM && containerVM.fields && self.gridOpts && self.gridOpts.data ) {
                if( containerVM.fields.length !== self.gridOpts.data.length ) {
                    $scope.updateFieldDefs( containerVM );
                }
            }
        };

        /**
         * Trigger an update of the property list info from the VM column list. In the compare case, the
         * columns drive the row master definitions. In order to allow for empty XRT Object sets, if
         * there is no object data (dataPage), then we won't display the rows.
         *
         * @memberof NgControllers.awCompareController
         *
         * @param {Object} containerVM - the containerVM
         */
        $scope.updateFieldDefs = function( containerVM ) {
            var fieldList = containerVM.fields;
            if( fieldList && fieldList.length > 0 ) {
                // empty existing
                rowMasterMatrix.length = 0;

                // if there are no objects (XRT case for empty set), don't show rowMasters
                if( containerVM.uiDataAdapter && containerVM.uiDataAdapter.bindingCollection &&
                    containerVM.uiDataAdapter.bindingCollection.data &&
                    containerVM.uiDataAdapter.bindingCollection.data.length ) {
                    $scope.hideTheWidget = false; // render the grid
                    for( var idx = 0; idx < fieldList.length; idx++ ) {
                        rowMasterMatrix.push( rowMasterFactory( facetFactory( fieldList[ idx ].name,
                            fieldList[ idx ].displayName ) ) );
                    }
                    populateRowDataCells();
                } else {
                    // no data to show
                    $scope.hideTheWidget = true; // don't render the grid
                }
            }
        };

        /**
         * take the input list of uids and sync the column master selection state have to check &
         * potentially adjust the selection state of every column master may include clearing a current
         * selection
         */
        $scope.syncSelectionList = function( selectedIdList ) {
            if( selectedIdList && selectedIdList.length >= 0 && columnMasterList &&
                columnMasterList.length ) {
                for( var cIdx = 0; cIdx < columnMasterList.length; cIdx++ ) {
                    var master = columnMasterList[ cIdx ];
                    var selKey = master.data.uid;

                    if( selectedIdList.indexOf( selKey ) > -1 ) {
                        // it should be selected
                        master.objInfo.selected = true;
                    } else {
                        // should NOT be selected
                        master.objInfo.selected = false;
                    }
                }

                if( self.gridApi ) {
                    // tell uiGrid to redraw
                    self.gridApi.core.notifyDataChange( 'all' );
                }
            }
        };
    }
] );
