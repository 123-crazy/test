// Copyright (c) 2020 Siemens

/**
 * This service is the entry point for SPLM table. It initializes the table and renders it
 *
 * @module js/splmTableFactory
 */
import SPLMTableColumnRearrangement from 'js/splmTableColumnRearrangement';
import SPLMTableInfiniteScrollService from 'js/splmTableInfiniteScrollService';
import SPLMTableKeyboardService from 'js/splmTableKeyboardService';
import SPLMTableTranspose from 'js/splmTableTranspose';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import app from 'app';
import appCtxService from 'js/appCtxService';
import awColumnFilterService from 'js/awColumnFilterService';
import awIconService from 'js/awIconService';
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import declDragAndDropService from 'js/declDragAndDropService';
import domUtils from 'js/domUtils';
import dragAndDropService from 'js/dragAndDropService';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import selectionHelper from 'js/selectionHelper';
import splmTableDragHandler from 'js/splmTableDragHandler';
import uwUtilSvc from 'js/uwUtilService';

/**
 * Cached reference to the various AngularJS and AW services.
 */
var exports = {};

var _splmTableMessages = {};

var _eventBusSubDefs = {};

var _tableInstances = {};

var _defaultContentFilter = {
    isIdOfObject: function( vmo, evaluatedId ) {
        // comparing the evaluated id instead of uid
        var idToCompare = vmo && uwUtilSvc.getEvaluatedId( vmo );
        return vmo && idToCompare && ( idToCompare === evaluatedId || idToCompare.indexOf( evaluatedId ) !== -1 );
    }
};

const dom = domUtils.DOMAPIs;
/**
 * Check if we are using a 'gridid' in the closest 'declViewModel' in the scope tree.<BR>
 * If so: Use it to display the aw-table data<BR>
 *
 */
export let createTableObject = function( directiveElement, gridid, dataProvider, columnProvider, declViewModel, contentFilter, gridOptions, containerHeight ) {
    // 20180920: put it to null so that it will error out when there is an code error
    var _tableColumns = null;
    var _contentFilter = contentFilter || _defaultContentFilter;

    // setup cell renderer
    var cellRenderer = awSPLMTableCellRendererFactory.createCellRenderer();
    var table = _t.util.createElement( 'div' );
    var _trv = new _t.Trv( table );
    var tableCtrl = null;
    var tableEditor = null;
    var menuService = null;
    var _nodeExpansionInProgress = false;
    let tableScroll = null;
    let columnRearrangementService = null;
    let keyboardService = null;

    // LCS-138303 - Performance tuning for 14 Objectset Table case - implementation
    // Define header and row height here to save computed CSS reading
    var _rowBorderWidth = 1;
    var _rowHeight = appCtxService.ctx.layout === 'compact' ? _t.Const.HEIGHT_COMPACT_ROW : _t.Const.HEIGHT_ROW;
    _rowHeight = _t.util.getTableRowHeight( gridOptions, _rowHeight );

    var _headerHeight = _t.Const.HEIGHT_HEADER;
    _headerHeight = _t.util.getTableHeaderHeight( gridOptions, _headerHeight );

    _tableInstances[ gridid ] = table;

    // This updateColumnDefs function is called as part of the buildDynamicColumns.
    let _updateColumnDefs = function() {
        let columns = dataProvider.cols;
        if( gridOptions.transpose === true ) {
            // Get and assign transposed columns
            columns = SPLMTableTranspose.getTransposedColumns( _tableColumns, dataProvider.viewModelCollection.loadedVMObjects );
        }
        for( let i = 0; i < columns.length; i++ ) {
            columns[ i ].visible = !columns[ i ].hasOwnProperty( 'visible' ) || columns[ i ].visible;
        }

        _tableColumns = _.filter( columns, function( column ) {
            if( column.visible ) {
                return column;
            }
            return false;
        } );

        _.forEach( _tableColumns, function( column, index ) {
            column.index = index;

            if( !column.cellRenderers ) {
                column.cellRenderers = [];
            }
            if( column.name === 'icon' && column.iconCellRenderer ) {
                column.cellRenderers = column.cellRenderers.concat( column.iconCellRenderer );
            }
            column.cellRenderers = column.cellRenderers.concat( cellRenderer.getAwCellRenderers() );
        } );

        _.forEach( _tableColumns, function( column, index ) {
            column.index = index;

            if( !column.headerRenderers ) {
                column.headerRenderers = [];
            }

            column.headerRenderers = column.headerRenderers.concat( cellRenderer.getAwHeaderRenderers() );
        } );

        menuService.loadDefaultColumnMenus( appCtxService );
    };

    let getObjects = function() {
        if( !dataProvider.viewModelCollection ) {
            return [];
        }
        if( gridOptions.transpose === true ) {
            return SPLMTableTranspose.getTransposedVmos( dataProvider.cols, dataProvider.viewModelCollection.loadedVMObjects );
        }
        return dataProvider.viewModelCollection.loadedVMObjects;
    };

    let resetColumns = function() {
        _updateColumnDefs();

        awColumnFilterService.removeStaleFilters( columnProvider, _tableColumns );

        // property loading has completed
        tableCtrl.resetColumnDefs( _tableColumns );
        // Table headers recreated, need to initialize column rearrangement
        columnRearrangementService.initialize();

        // Trick for update scroll container position
        if( tableScroll.isInitialized() ) {
            cellRenderer.resetHoverCommandElement();
            tableScroll.setLoadedVMObjects( getObjects() );
            tableScroll.handleScroll();
        }
    };

    if( gridid ) {
        var instanceEventSubcr = [];

        // Do essential table DOM Element initialization for further processing
        table.id = gridid;

        table.classList.add( _t.Const.CLASS_TABLE );
        table.classList.add( _t.Const.CLASS_WIDGET_GRID );
        table.classList.add( _t.Const.CLASS_LAYOUT_COLUMN );
        table.classList.add( _t.Const.CLASS_WIDGET_TABLE_DROP );
        table.classList.add( _t.Const.CLASS_SELECTION_ENABLED );

        _t.util.setSortCriteriaOnColumns( columnProvider, dataProvider );

        var getContainerHeight = function() {
            if( containerHeight !== undefined ) {
                return containerHeight;
            }

            if( gridOptions.maxRowsToShow !== undefined ) {
                return ( _rowHeight + _rowBorderWidth ) * gridOptions.maxRowsToShow + _t.Const.HEIGHT_HEADER;
            }

            return undefined;
        };

        tableScroll = new SPLMTableInfiniteScrollService( getContainerHeight() );

        table._tableInstance = {
            ctx: appCtxService.ctx,
            messages: _splmTableMessages,
            declViewModel: declViewModel,
            dataProvider: dataProvider,
            columnProvider: columnProvider,
            gridId: gridid,
            gridOptions: gridOptions,
            isBulkEditing: false,
            isCellEditing: false,
            renderer: tableScroll,
            dynamicRowHeightStatus: false,
            cellRenderer: cellRenderer
        };

        tableEditor = new _t.Editor( table, directiveElement );
        table._tableInstance.editor = tableEditor;
        keyboardService = new SPLMTableKeyboardService( table, tableEditor );
        keyboardService.setupKeyListener();
        table._tableInstance.keyboardService = keyboardService;

        menuService = new _t.MenuService( table, directiveElement, table._tableInstance );

        if( gridOptions.enableGridMenu ) {
            menuService.addGridMenu( awIconService );
        }

        if( gridOptions.showContextMenu === true ) {
            menuService.addContextMenu( selectionHelper );
        }

        if( gridOptions.enableDynamicRowHeight ) {
            table._tableInstance.dynamicRowHeightStatus = true;
        }

        _updateColumnDefs();

        tableCtrl = new _t.Ctrl( table, _tableColumns, tableEditor );
        table._tableInstance.controller = tableCtrl;

        // LCS-13247 Pagination SOA performance issue for Objectset Table
        // - Put a debounce here to avoid possible sending traffic jam, the number
        //   is from _pingRedrawDebounce from aw.table.controller
        // - With debounce IE performance improves a lot and no impact to chrome performance,
        //   so leave the debounce for all
        var _loadMorePageDebounce = _.debounce( function( firstRenderedItem, lastRenderedItem ) {
            eventBus.publish( gridid + '.plTable.loadMorePages', {
                firstRenderedItem: firstRenderedItem,
                lastRenderedItem: lastRenderedItem
            } );
        }, 500 );

        var pendingUpdatedProps = {};

        var updateRowContents = function( updatedPropsMaps ) {
            var rowElements = _trv.queryAllRowCellElementsFromTable();
            _.forEach( updatedPropsMaps, function( updatedProps, vmoUid ) {
                _.forEach( rowElements, function( rowElem ) {
                    _.forEach( rowElem.children, function( cellElem ) {
                        // Check if the vmo has been updated, if not continue to next cell
                        let updatedVmo = null;
                        if( rowElem.vmo && rowElem.vmo.uid === vmoUid ) {
                            updatedVmo = rowElem.vmo;
                        } else if( gridOptions.transpose === true && cellElem.columnDef.vmo && cellElem.columnDef.vmo.uid === vmoUid ) {
                            updatedVmo = cellElem.columnDef.vmo;
                        } else {
                            return;
                        }

                        var needsUpdate = false;
                        if( cellElem.columnDef && cellElem.columnDef.name === 'icon' ||
                            gridOptions.transpose === true && rowElem.vmo.props.transposedColumnProperty.dbValue === 'icon' ) {
                            var imgElem = cellElem.getElementsByTagName( 'img' )[ 0 ];
                            if( imgElem && imgElem.getAttribute( 'src' ) !== _t.util.getImgURL( updatedVmo ) ) {
                                needsUpdate = true;
                            }
                        } else {
                            for( var i = 0; i < updatedProps.length; i++ ) {
                                if( cellElem.propName === updatedProps[ i ] ||
                                    gridOptions.transpose === true && rowElem.vmo.props.transposedColumnProperty.dbValue === updatedProps[ i ] ) {
                                    needsUpdate = true;
                                    break;
                                }
                            }
                        }

                        if( needsUpdate ) {
                            _t.Cell.updateCell( cellElem, rowElem, table, tableEditor );
                            if( rowElem.vmo.selected && ( cellElem.columnDef.isTableCommand || cellElem.columnDef.isTreeNavigation ) ) {
                                let cellTop = cellElem.children[ 0 ];
                                if( cellElem.columnDef.isTreeNavigation ) {
                                    cellTop = cellElem.getElementsByClassName( 'aw-jswidgets-tableNonEditContainer' )[ 0 ];
                                }
                                if( !cellTop.lastChild || cellTop.lastChild && cellTop.lastChild.classList && !cellTop.lastChild.classList.contains( _t.Const
                                        .CLASS_AW_CELL_COMMANDS ) ) {
                                    if( dataProvider.selectionModel && !dataProvider.selectionModel.multiSelectEnabled && dataProvider.selectionModel.getCurrentSelectedCount() === 1 ) {
                                        let cellCommand = awSPLMTableCellRendererFactory.createCellCommandElement( cellElem.columnDef, rowElem.vmo, table, true );
                                        cellTop.appendChild( cellCommand );
                                    }
                                }
                            }
                        }
                    } );
                } );
            } );
        };

        var updatePendingProps = _.debounce( function() {
            updateRowContents( pendingUpdatedProps );
            pendingUpdatedProps = {};
        }, 250 );

        instanceEventSubcr.push( eventBus.subscribe( 'viewModelObject.propsUpdated', function( updatedProps ) {
            // Merge the updatedVmos into pendingUpdatedVmos
            for( var vmoUid in updatedProps ) {
                if( pendingUpdatedProps[ vmoUid ] === undefined ) {
                    pendingUpdatedProps[ vmoUid ] = updatedProps[ vmoUid ];
                } else {
                    for( var i = 0; i < updatedProps[ vmoUid ].length; i++ ) {
                        var updatedPropName = updatedProps[ vmoUid ][ i ];
                        if( pendingUpdatedProps[ vmoUid ].indexOf( updatedPropName ) === -1 ) {
                            pendingUpdatedProps[ vmoUid ].push( updatedPropName );
                        }
                    }
                }
            }
            updatePendingProps();
        } ) );

        /**
         * Finds VMOs with undefined props within the specified range.
         *
         * @param {int} startIndex - starting VMO index
         * @param {int} endIndex - edning VMO index
         */
        var findVMOsWithMissingProps = function( startIndex, endIndex ) {
            var emptyVMOs = [];

            for( var i = startIndex; i <= endIndex; i++ ) {
                var vmo = dataProvider.viewModelCollection.loadedVMObjects[ i ];
                if( vmo.isPropLoading ) {
                    continue;
                } else if( !vmo.props ) {
                    emptyVMOs.push( vmo );
                } else {
                    var keys = Object.keys( vmo.props );

                    if( keys.length === 0 ) {
                        emptyVMOs.push( vmo );
                    }
                }
            }

            return emptyVMOs;
        };

        var loadProps = function( emptyVMOs ) {
            eventBus.publish( gridid + '.plTable.loadProps', {
                VMOs: emptyVMOs
            } );
        };

        var editCellElement;

        columnRearrangementService = new SPLMTableColumnRearrangement( table );

        // 20180927: This is not related to global isEdit anymore, feel free
        // to refactor:)
        var updateEditStatusForTableCanvas = function( isEditing ) {
            tableCtrl.setDraggable( !isEditing );
            tableEditor.updateEditStatus( isEditing );
        };

        var _setupTreeForRestrictiveEditing = function( isEditing ) {
            tableScroll.setupTreeEditScroll( isEditing );
        };

        var updateEditState = function( eventData ) {
            // We should not start edit for any non table cases.
            // This should be started only for table cases and also based on the grid id you are on.
            // PWA case the dataSource is the dataProvider, thus has no .dataProviders property (we check if it is the dataProvider in scope with .name)
            // SWA case we have dataSource.dataProvider and can check with dataProviders[ dataProvider.name ]
            if( tableCtrl && eventData.dataSource && ( eventData.dataSource.dataProviders &&
                    eventData.dataSource.dataProviders[ dataProvider.name ] || eventData.dataSource.name === dataProvider.name ) ) {
                var isEditing = eventData.state === 'partialSave' || eventData.state === 'starting';

                // If saving, set all column filters to be stale as data could have changed
                if( eventData.state === 'saved' ) {
                    _.forEach( dataProvider.cols, function( column ) {
                        awColumnFilterService.setColumnFilterStale( column );
                    } );
                    if( !_t.util.isAutoSaveEnabled( table ) ) {
                        tableEditor.clearPropIsEditableCache();
                    }
                    _t.util.setIsCellEditing( table, false );
                } else if( eventData.state === 'canceling' ) {
                    tableEditor.clearPropIsEditableCache();
                    _t.util.setIsCellEditing( table, false );
                }

                // Enable vmo caching on collapse in edit mode
                dataProvider.cacheCollapse = true;

                _t.util.setIsBulkEditing( table, isEditing );

                tableCtrl.setSelectable( !isEditing );

                if( _t.util.isCellEditing( table ) === false || _t.util.isCellEditing( table ) && !_t.util.isAutoSaveEnabled( table ) ) {
                    updateEditStatusForTableCanvas( isEditing );
                }

                if( gridOptions.useTree && !_t.util.isExpandOrPaginationAllowedInEdit( table ) ) {
                    _setupTreeForRestrictiveEditing( isEditing );
                }

                if( !isEditing ) {
                    // Restore original cache collapse state when leaving edit mode
                    dataProvider.restoreInitialCacheCollapseState();
                }
                if( table._tableInstance.dynamicRowHeightStatus === true ) {
                    resetDynamicRowHeights();
                    eventBus.publish( gridid + '.plTable.clientRefresh' );
                }
            }
        };

        instanceEventSubcr.push( eventBus.subscribe( dataProvider._eventTopicEditInProgress, function() {
            const eventData = {
                dataSource: dataProvider,
                state: dataProvider._editingState
            };
            updateEditState( eventData );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( declViewModel._internal.eventTopicEditInProgress, function() {
            const eventData = {
                dataSource: declViewModel,
                state: declViewModel._editingState
            };
            updateEditState( eventData );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'plTable.editStateChange', function( eventData ) {
            updateEditState( eventData );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'editHandlerStateChange', function( eventData ) {
            updateEditState( eventData );
        } ) );

        var _updateAllRowsVisibilityDebounce = _.debounce( function() {
            var rowElements = _trv.queryAllRowCellElementsFromTable();
            _.forEach( rowElements, function( row ) {
                if( row.vmo ) {
                    var cellTopElem = row.getElementsByClassName( _t.Const.CLASS_SPLM_TABLE_ICON_CELL )[ 0 ];
                    if( !cellTopElem ) {
                        cellTopElem = row.getElementsByClassName( _t.Const.CLASS_AW_TREE_COMMAND_CELL )[ 0 ];
                    }
                    if( cellTopElem ) {
                        var iconCellElem = cellTopElem.parentElement;
                        var columnDef = iconCellElem.columnDef;
                        var newCellTop = _t.Cell.createElement( columnDef, row.vmo, table, row );
                        iconCellElem.replaceChild( newCellTop, cellTopElem );
                    }
                }
            } );
        }, 100 );

        /**
         * Subscribe to resetScroll. Clear the tables rendered items cache and scroll to top of table.
         */
        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.resetScroll', function() {
            if( tableScroll && tableScroll.isInitialized() ) {
                tableScroll.resetInfiniteScroll();
            }
        } ) );

        /**
         * Subscribe to unsetScrollToRowIndex. Unset the initial row index for infinite scroll.
         */
        instanceEventSubcr.push( eventBus.subscribe( gridid + '.plTable.unsetScrollToRowIndex', function() {
            if( tableScroll && tableScroll.isInitialized() ) {
                tableScroll.resetInitialRowIndex();
            }
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'plTable.toggleDynamicRowHeight', function( eventData ) {
            if( eventData.gridId && eventData.gridId === gridid ) {
                table._tableInstance.dynamicRowHeightStatus = !table._tableInstance.dynamicRowHeightStatus;
                tableScroll.setDynamicRowHeight( table._tableInstance.dynamicRowHeightStatus );
                eventBus.publish( gridid + '.plTable.clientRefresh' );
                if( !table._tableInstance.dynamicRowHeightStatus ) {
                    resetDynamicRowHeights();
                }
            }
        } ) );

        var verdict = _t.util.validateRowHeightGridOption( table._tableInstance.gridOptions );
        /**
         * Subscribe to LayoutChangeEvent. Update row height to correct value
         */
        if( verdict === false ) {
            instanceEventSubcr.push( eventBus.subscribe( 'LayoutChangeEvent', function( data ) {
                var oldHeight = _rowHeight;
                _rowHeight = data.rowHeight;
                if( oldHeight === _rowHeight ) {
                    return;
                }
                if( tableScroll.isInitialized() ) {
                    tableScroll.setRowHeight( _rowHeight + _rowBorderWidth );

                    var newContainerHeight = getContainerHeight();
                    if( newContainerHeight !== undefined ) {
                        tableScroll.setContainerHeight( newContainerHeight );
                    }
                    // Reinitialize properties so that the rendering calculations are valid
                    tableScroll.initializeProperties();

                    // Reset dynamic row height if enabled
                    if( table._tableInstance.dynamicRowHeightStatus ) {
                        resetDynamicRowHeights();
                    }

                    tableScroll.updateRowAlignment();

                    // Scroll to rows in that were in view before layout change
                    var scrollContainer = _trv.getScrollCanvasElementFromTable();
                    var oldScrollTop = scrollContainer.scrollTop;
                    scrollContainer.scrollTop = oldScrollTop / oldHeight * _rowHeight;
                    tableScroll.handleScroll();
                }
            } ) );
        }

        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.selectionChangeEvent', function() {
            _t.SelectionHelper.updateContentRowSelection( dataProvider.selectionModel, dataProvider.cols,
                _trv.getPinContentRowElementsFromTable(), _trv.getScrollContentRowElementsFromTable(), table );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.selectAll', function() {
            _t.SelectionHelper.updateContentRowSelection( dataProvider.selectionModel, dataProvider.cols,
                _trv.getPinContentRowElementsFromTable(), _trv.getScrollContentRowElementsFromTable(), table );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.selectNone', function() {
            _t.SelectionHelper.updateContentRowSelection( dataProvider.selectionModel, dataProvider.cols,
                _trv.getPinContentRowElementsFromTable(), _trv.getScrollContentRowElementsFromTable(), table );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( gridid + '.plTable.visibilityStateChanged', _updateAllRowsVisibilityDebounce ) );

        instanceEventSubcr.push( eventBus.subscribe( 'awFill.completeEvent_' + gridid, tableEditor.fillDownCompleteHandler ) );

        instanceEventSubcr.push( eventBus.subscribe( gridid + '.plTable.resizeCheck', function() {
            tableScroll.checkForResize();
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'plTable.columnsRearranged_' + gridid, function( eventData ) {
            if( gridOptions.transpose === true ) {
                // Update the dom columns so they reflect correct data
                // and return since the columns represent VMOs and not the columns in
                // the columnProvider
                resetColumns();
                return;
            }
            // Get column position in relation to all columns, not just visible columns
            var originalPosition = eventData.originalPosition;
            var newPosition = null;

            // Get new position index
            _.forEach( dataProvider.cols, function( column ) {
                if( eventData.name === column.name ) {
                    newPosition = column.index;
                }
            } );

            // Adjust for hidden columns
            _.forEach( dataProvider.cols, function( column, index ) {
                if( column.hiddenFlag === true && index <= newPosition ) {
                    newPosition += 1;
                }

                if( column.hiddenFlag === true && index <= originalPosition ) {
                    originalPosition += 1;
                }
            } );

            // awColumnService adjusts the column positions when the icon column is not present.
            // By incrementing the positions by 1, we are able to ensure awColumnService still uses
            // the correct column positions. Once  UI-Grid is removed, we can remove this hack and update awColumnService
            // to not adjust positions when icon column is not present.
            if( dataProvider.cols[ 0 ].name !== 'icon' ) {
                originalPosition += 1;
                newPosition += 1;
            }

            if( originalPosition !== null && newPosition !== null ) {
                columnProvider.columnOrderChanged( eventData.name, originalPosition, newPosition );
            }
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'plTable.columnsResized_' + gridid, function( eventData ) {
            // Prevent columnSizeChanged for transpose mode since the columns in transpose represent VMOs
            // and not the columns in the columnProvider
            if( gridOptions.transpose !== true ) {
                columnProvider.columnSizeChanged( eventData.name, eventData.delta );
            }
            if( table._tableInstance.dynamicRowHeightStatus ) {
                resetDynamicRowHeights();
                eventBus.publish( gridid + '.plTable.clientRefresh' );
            }
        } ) );

        var scrollToRow = function( gridId, rowUids ) {
            if( _t.util.isBulkEditing( table ) ) {
                return;
            }
            var rowIndexes = [];
            for( var i = 0; i < rowUids.length; i++ ) {
                var uid = rowUids[ i ].uid ? rowUids[ i ].uid : rowUids[ i ];
                var rowIndex = dataProvider.viewModelCollection.findViewModelObjectById( uid );
                if( rowIndex !== -1 ) {
                    rowIndexes.push( rowIndex );
                }
            }
            if( rowIndexes.length > 0 && gridid === gridId ) {
                tableScroll.scrollToRowIndex( rowIndexes );
            }

            dataProvider.scrollToRow = false;
        };

        instanceEventSubcr.push( eventBus.subscribe( 'plTable.scrollToRow', function( eventData ) {
            scrollToRow( eventData.gridId, eventData.rowUids );
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.plTable.maintainScrollPosition', function() {
            tableScroll.setScrollPositionToBeMaintained();
        } ) );

        var updateDecoratorVisibility = function( isEnabled ) {
            if( isEnabled === true && gridOptions.showDecorators !== false ) {
                table.classList.add( _t.Const.CLASS_AW_SHOW_DECORATORS );
            } else {
                table.classList.remove( _t.Const.CLASS_AW_SHOW_DECORATORS );
            }
        };

        var decoratorToggle = 'decoratorToggle';

        var showDecorators = appCtxService.getCtx( decoratorToggle );
        updateDecoratorVisibility( showDecorators );

        instanceEventSubcr.push( eventBus.subscribe( 'appCtx.register', function( event ) {
            if( event.name === decoratorToggle ) {
                updateDecoratorVisibility( event.value );
            }
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'appCtx.update', function( event ) {
            if( event.name === decoratorToggle ) {
                updateDecoratorVisibility( event.value.decoratorToggle );
            }
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( 'decoratorsUpdated', function( updateVMOs ) {
            updateVMOs = updateVMOs.length === undefined ? [ updateVMOs ] : updateVMOs;
            tableCtrl.updateColorIndicatorElements( updateVMOs );
        } ) );

        /**
         * React to request for node expansions.
         */
        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.expandTreeNode', function( eventData ) {
            if( eventData.parentNode ) {
                var vmCollection = dataProvider.getViewModelCollection();

                var rowNdx = vmCollection.findViewModelObjectById( eventData.parentNode.id );

                if( rowNdx !== -1 ) {
                    var vmo = vmCollection.getViewModelObject( rowNdx );
                    if( vmo.isExpanded !== true ) {
                        vmo.isExpanded = true;
                        eventBus.publish( table.id + '.plTable.toggleTreeNode', vmo );
                    }
                }
            }
        } ) );

        instanceEventSubcr.push( eventBus.subscribe( gridid + '.plTable.loadFilterFacets', function( filterFacetInput ) {
            if( filterFacetInput ) {
                dataProvider.getFilterFacets( declViewModel, filterFacetInput ).then( function( filterFacetResults ) {
                    var filterFacetValues = {};
                    if( filterFacetResults && filterFacetResults.values ) {
                        _.forEach( filterFacetResults.values, function( value ) {
                            if( !value ) {
                                filterFacetValues[ '(blanks)' ] = true;
                            } else {
                                filterFacetValues[ value ] = true;
                            }
                        } );
                    }

                    if( filterFacetInput.startIndex ) {
                        menuService.addFacets( filterFacetInput.column, awColumnFilterService, filterFacetValues, filterFacetResults.totalFound );
                    } else {
                        menuService.reloadFacets( filterFacetInput.column, awColumnFilterService, filterFacetValues, filterFacetResults.totalFound );
                    }
                } );
            }
        } ) );

        var dragAndDropSelectionSubDef = null;
        const getTargetVmo = function( element, isTarget ) {
            /**
             * Merge event 'target' with any other objects currently selected.
             */
            var targetObjects = [];

            var elementRow = element.classList.contains( _t.Const.CLASS_ROW ) ? element : _t.util.closestElement( element, '.' + _t.Const.CLASS_ROW );

            if( elementRow && elementRow.vmo ) {
                targetObjects.push( elementRow.vmo );
                var targetUid = elementRow.vmo.uid;

                if( !isTarget ) {
                    var sourceObjects = dragAndDropService.getSourceObjects(
                        dataProvider, targetUid ).filter( function( obj ) {
                        return targetObjects.indexOf( obj ) === -1;
                    } );
                    targetObjects = targetObjects.concat( sourceObjects );
                }

                return targetObjects;
            }

            return null;
        };

        const clearRowSelection = ( targetVMO ) => { // eslint-disable-line
            dataProvider.selectNone();
        };

        const selectTarget = ( targetElement, targetVMO ) => { // eslint-disable-line
            /**
             * Setup to listen when the 'drop' is complete
             */
            if( !dragAndDropSelectionSubDef ) {
                dragAndDropSelectionSubDef = eventBus.subscribe( 'plTable.relatedModified',
                    function() {
                        /**
                         * Stop listening
                         */
                        if( dragAndDropSelectionSubDef ) {
                            eventBus.unsubscribe( dragAndDropSelectionSubDef );

                            dragAndDropSelectionSubDef = null;
                        }

                        var selectionModel = dataProvider.selectionModel;

                        if( selectionModel ) {
                            selectionHelper.handleSelectionEvent( [ targetVMO ], selectionModel, null, dataProvider );
                            _t.SelectionHelper.updateContentRowSelection( dataProvider.selectionModel, dataProvider.cols,
                                _trv.getPinContentRowElementsFromTable(), _trv.getScrollContentRowElementsFromTable(), table );
                        }
                    } );
            }
        };

        // This can be cleaned up when AW adapts to new drag and drop design
        let exsistingCallbackApis = {
            getElementViewModelObjectFn: getTargetVmo,
            clearSelectionFn: clearRowSelection,
            selectResultFn: selectTarget
        };

        const isTextNodeDragged = ( dataTranferObj ) => {
            if( dataTranferObj && dataTranferObj.types ) {
                return event.type === 'dragstart' && [ ...dataTranferObj.types ].some( type => type === 'text/plain' || type === 'Text' );
            }
        };

        let newCallbackApis = {
            clearSelection: clearRowSelection,
            setSelection: ( targetVMO ) => {
                selectTarget( null, targetVMO );
            },
            getTargetElementAndVmo: ( event, isSourceEle ) => {
                let targetVMO = null;
                let target = null;
                if( !isTextNodeDragged( event.dataTransfer ) ) {
                    target = dom.closest( event.target, '.ui-grid-row' ) || dom.closest( event.target, '.aw-widgets-droppable' );
                }
                if( target ) {
                    targetVMO = getTargetVmo( target, !isSourceEle );
                }
                return {
                    targetElement: target,
                    targetVMO: targetVMO
                };
            },
            highlightTarget: ( eventData ) => {
                splmTableDragHandler.handleDragDropHighlightPLTable( eventData );
            }
        };
        _eventBusSubDefs[ gridid ] = instanceEventSubcr;

        directiveElement.appendChild( table );

        // Drag and drop service needs to be setup after table has been attached to the directive element so
        // that it can properly get the scope.
        if( gridOptions.enableDragAndDrop !== false ) {
            /**
             * LCS-315044: Setup the drag and drop with the new design pattern if drag and drop
             * handlers are defined for table's container view.
             *
             * The branching is done to support AW, as AW is still consuming the old drag and drop pattern.
             */
            if( declDragAndDropService.areDnDHandelersDefined( declViewModel ) ) {
                declDragAndDropService.setupDragAndDrop( table, newCallbackApis, declViewModel, dataProvider );
            } else {
                dragAndDropService.setupDragAndDrop( table, exsistingCallbackApis, dataProvider );
            }
        } else {
            dragAndDropService.disableDragAndDrop( table );
        }
    }

    var getIconCellId = function( vmo ) {
        if( vmo.loadingStatus ) {
            return 'miscInProcessIndicator';
        } else if( vmo.isLeaf ) {
            return 'typeBlankIcon';
        } else if( vmo.isExpanded ) {
            return 'miscExpandedTree';
        }
        return 'miscCollapsedTree';
    };

    var resetDynamicRowHeights = function() {
        if( dataProvider.viewModelCollection ) {
            _.forEach( dataProvider.viewModelCollection.loadedVMObjects, function( vmo ) {
                delete vmo.rowHeight;
            } );
        }
    };

    return {
        resetDynamicRowHeights: resetDynamicRowHeights,
        getDynamicRowHeightStatus: function() {
            return table._tableInstance.dynamicRowHeightStatus;
        },
        getTableElement: function() {
            return table;
        },
        /**
         * Reset columns for PL Table
         * this method out of exports.initializeTable, cannot do it now since it depends on dataProvider
         * any other members whose scope is inside initializeTable.
         */
        resetColumns: function() {
            resetColumns();
        },
        removeStaleFilters: function( columns ) {
            awColumnFilterService.removeStaleFilters( columnProvider, columns || _tableColumns );
        },
        setNodeExpansionInProgress: function( isInProgress ) {
            _nodeExpansionInProgress = isInProgress;
        },
        updateFilterIcons: function( columnName ) {
            if( columnName ) {
                tableCtrl.updateFilterIcon( columnName );
            } else {
                tableCtrl.updateAllFilterIcons();
            }
        },
        setFilterDisability: function( isDisabled ) {
            menuService.setFilterDisability( isDisabled );
        },
        updateTreeCellIcon: function( vmo ) {
            var rowContents = _trv.queryAllRowCellElementsFromTable();
            _.find( rowContents, function( rowElem ) {
                if( rowElem.vmo ) {
                    var matchingId = _contentFilter.isIdOfObject( rowElem.vmo, uwUtilSvc.getEvaluatedId( vmo ) );
                    if( matchingId === true ) {
                        var iconContainerElement = rowElem.getElementsByTagName( _t.Const.ELEMENT_AW_ICON )[ 0 ];
                        if( iconContainerElement !== undefined ) {
                            var iconCellId = getIconCellId( vmo );
                            iconContainerElement = _t.util.addAttributeToDOMElement( iconContainerElement, 'icon-id', iconCellId );
                            iconContainerElement.title = vmo._twistieTitle;
                            var iconHTML = awIconService.getIconDef( iconCellId );
                            iconContainerElement.innerHTML = iconHTML;
                            return true;
                        }
                    }
                }
                return false;
            } );
        },
        /**
         * Refreshes the content in the table with the data currently in the dataProvider
         */
        refresh: async function() {
            var columnAttrs = [];

            // attributesToInflate at server side cannot accept full name i.e typename.propertyname.
            // we don't need to inflate the attributes or properties that are hidden.
            _.forEach( dataProvider.cols, function( uwColumnInfo ) {
                if( uwColumnInfo.field && uwColumnInfo.hiddenFlag !== true ) {
                    columnAttrs.push( uwColumnInfo.field );
                }
            } );

            if( dataProvider && dataProvider.action && dataProvider.action.inputData ) {
                dataProvider.action.inputData.searchInput = dataProvider.action.inputData.searchInput || {};
                var searchInput = dataProvider.action.inputData.searchInput;

                if( searchInput.attributesToInflate ) {
                    searchInput.attributesToInflate = _.union( searchInput.attributesToInflate, columnAttrs );
                } else {
                    searchInput.attributesToInflate = columnAttrs;
                }
            }

            // Since VMOs represent columns, we need to reset the columns also for transpose mode
            if( gridOptions.transpose === true ) {
                resetColumns();
            }

            // REFACTOR: infinite scroll code should be refactor to follow:
            // 1. DOMElement should be the only interface for interaction between service and function
            // 2. Lot of code below should be pull out from anonymous function, a initialize grid which
            //    is taking 70 line of code is a bad smell.
            if( !tableScroll.isInitialized() ) {
                // Set initial scroll index before table initializes
                if( dataProvider.isFocusedLoad ) {
                    var selection = dataProvider.getSelectedObjects();
                    if( selection.length === 1 ) {
                        scrollToRow( gridid, [ selection[ 0 ].uid ] );
                    }
                }

                tableScroll.initializeGrid( {
                    tableElem: table,
                    directiveElem: directiveElement,
                    scrollViewportElem: _trv.getScrollCanvasElementFromTable(),
                    pinViewportElem: _trv.getPinCanvasElementFromTable(),
                    rowSelector: '.' + _t.Const.CLASS_ROW,
                    rowHeight: _rowHeight + _rowBorderWidth,
                    headerHeight: _headerHeight,
                    dynamicRowHeightStatus: gridOptions.enableDynamicRowHeight,
                    loadedVMObjects: getObjects(),
                    updateVisibleCells: function( rowParentElem ) {
                        tableCtrl.updateVisibleCells( rowParentElem );
                    },
                    updateScrollColumnsInView: function( scrollLeft, scrollContainerWidth ) {
                        tableCtrl.updateScrollColumnsInView( scrollLeft, scrollContainerWidth );
                    },
                    onStartScroll: function() {
                        if( !_t.util.isBulkEditing( table ) || !editCellElement ) {
                            return;
                        }

                        // Close drop down if it is open on the edit cell
                        var cellListElement = editCellElement.getElementsByClassName( 'aw-jswidgets-popUpVisible' )[ 0 ];
                        if( cellListElement ) {
                            editCellElement.click();
                        }
                    },
                    syncHeader: function( isPin, scrollLeft ) {
                        _t.util.syncHeader( table, isPin, scrollLeft );
                    },
                    renderRows: async function( startIndex, endIndex ) {
                        var subVMObjects = getObjects().slice( startIndex, endIndex + 1 );
                        // Return if there is nothing to render
                        if( subVMObjects.length === 0 ) {
                            return;
                        }
                        if( gridOptions.useTree === true ) {
                            let messages = gridOptions.textBundle ? gridOptions.textBundle : _splmTableMessages;
                            _.forEach( subVMObjects, function( vmo ) {
                                if( vmo.isLeaf ) {
                                    vmo._twistieTitle = '';
                                } else {
                                    vmo._twistieTitle = vmo.isExpanded ? messages.TwistieTooltipExpanded : messages.TwistieTooltipCollapsed;
                                }

                                if( !_t.util.isExpandAllowed( table ) ) {
                                    vmo._twistieTitle = '';
                                }
                            } );
                        }
                        var insertBefore = false;
                        var scrollContents = _trv.getScrollContentElementFromTable();
                        var pinContents = _trv.getPinContentElementFromTable();
                        var firstPinElement = pinContents.childElementCount > 0 ? pinContents.childNodes[ 0 ] : 0;
                        var firstScrollElement = scrollContents.childElementCount > 0 ? scrollContents.childNodes[ 0 ] : 0;
                        if( firstScrollElement && firstScrollElement.getAttribute( 'data-indexNumber' ) ) {
                            var firstRowIdx = parseInt( firstScrollElement.getAttribute( 'data-indexNumber' ) );
                            insertBefore = firstRowIdx > startIndex;
                        }
                        var pinContentElement = await tableCtrl.constructContentElement( subVMObjects, startIndex, _rowHeight, true );
                        var scrollContentElement = await tableCtrl.constructContentElement( subVMObjects, startIndex, _rowHeight, false );
                        tableCtrl.setAriaLabelledAndDescribedBy( directiveElement, _trv.getTableContainerElementFromTable() );
                        tableCtrl.setAriaRowCount( _trv.getTableContainerElementFromTable() );
                        if( table._tableInstance.dynamicRowHeightStatus ) {
                            tableCtrl.syncContentRowHeights( pinContentElement, scrollContentElement );
                        }

                        _t.SelectionHelper.updateContentRowSelection( dataProvider.selectionModel, dataProvider.cols,
                            pinContentElement.childNodes, scrollContentElement.childNodes, table );

                        if( insertBefore ) {
                            _trv.getPinContentElementFromTable().insertBefore( pinContentElement, firstPinElement );
                            _trv.getScrollContentElementFromTable().insertBefore( scrollContentElement, firstScrollElement );
                        } else {
                            _trv.getPinContentElementFromTable().appendChild( pinContentElement );
                            _trv.getScrollContentElementFromTable().appendChild( scrollContentElement );
                        }
                    },
                    removeRows: function( upperCount, lowerCounter ) {
                        cellRenderer.resetHoverCommandElement();
                        tableCtrl.removeContentElement( upperCount, lowerCounter );
                        tableCtrl.setAriaRowCount( _trv.getTableContainerElementFromTable() );
                    },
                    afterGridRenderCallback: function( firstRenderedItem, lastRenderedItem ) {
                        let containerElement = _trv.getTableContainerElementFromTable();
                        if( containerElement && containerElement.hasAttribute( 'aria-activedescendant' ) ) {
                            var activedescendantId = containerElement.getAttribute( 'aria-activedescendant' );
                            if( !document.getElementById( activedescendantId ) ) {
                                containerElement.removeAttribute( 'aria-activedescendant' );
                            }
                        }
                        var isEditing = _t.util.isBulkEditing( table );
                        let loadingProps = false;

                        if( isEditing ) {
                            updateEditStatusForTableCanvas( isEditing );
                        }

                        if( gridOptions.useTree === true ) {
                            if( _nodeExpansionInProgress === true ) {
                                return;
                            }

                            var nonPlaceholderFound = false;
                            for( var i = lastRenderedItem.index; i >= firstRenderedItem.index; i-- ) {
                                var vmo = dataProvider.viewModelCollection.loadedVMObjects[ i ];

                                if( dataProvider.focusAction ) {
                                    if( vmo._focusRequested ) {
                                        return;
                                    }

                                    if( vmo.isPlaceholder ) { // ...use .isPlaceholder or .isFocusParent instead
                                        if( nonPlaceholderFound ) {
                                            delete vmo.isPlaceholder;

                                            vmo._focusRequested = true;

                                            eventBus.publish( table.id + '.plTable.doFocusPlaceHolder', { vmo: vmo } );
                                            return;
                                        }
                                    } else {
                                        nonPlaceholderFound = true;
                                    }
                                }
                            }

                            // Find and expand the first of any nodes that need to be expanded
                            for( var j = firstRenderedItem.index; j <= lastRenderedItem.index; j++ ) {
                                var vmObject = dataProvider.viewModelCollection.loadedVMObjects[ j ];
                                var expandNode = false;

                                if( vmObject.isLeaf !== true && vmObject._expandRequested !== true && vmObject.isExpanded !== true ) {
                                    // Mark for expansion if the node was already expanded
                                    if( _t.util.performStateServiceAction( 'isNodeExpanded', declViewModel, gridid, vmObject ) ) {
                                        expandNode = true;
                                    }
                                }

                                // Expand the node
                                if( expandNode === true ) {
                                    vmObject.isExpanded = true;
                                    eventBus.publish( table.id + '.plTable.toggleTreeNode', vmObject );

                                    return;
                                }
                            }

                            // If any VMOs need props to be loaded, we will call for the props to be loaded and not
                            // render the rows. The row rendering will then occur once they props have been loaded.
                            var emptyVMOs = findVMOsWithMissingProps( firstRenderedItem.index, lastRenderedItem.index );
                            if( emptyVMOs.length > 0 ) {
                                loadProps( emptyVMOs );
                                loadingProps = true;
                            }
                        }

                        if( _t.util.isPaginationAllowed( table ) ) {
                            _loadMorePageDebounce( firstRenderedItem, lastRenderedItem );
                        }

                        // Set scrollToRow to false after row is scrolled to and all
                        // visible nodes around the scrolled to row are expanded
                        if( dataProvider.scrollToRow === true && tableScroll.isInitialRowIndexInView() === true ) {
                            dataProvider.scrollToRow = false;
                        }

                        if( table._tableInstance.focusTreeNodeExpandAfterRender && !loadingProps ) {
                            setTimeout( function() {
                                let node = table._tableInstance.focusTreeNodeExpandAfterRender;
                                let rowContents = _trv.queryAllRowCellElementsFromTable();
                                let rowElem = _.filter( rowContents, { vmo: node } )[ 0 ];
                                if( rowElem ) {
                                    let elementToFocus = rowElem.getElementsByClassName( _t.Const.CLASS_WIDGET_TREE_NODE_TOGGLE_CMD )[ 0 ];
                                    elementToFocus && elementToFocus.focus();
                                }
                                delete table._tableInstance.focusTreeNodeExpandAfterRender;
                            }, 50 );
                        }
                    }
                } );
                tableScroll.renderInitialRows();
                var setContainerHeightEvent = eventBus.subscribe(
                    gridid + '.plTable.containerHeightUpdated',
                    function( heightVal ) {
                        tableScroll.setContainerHeight( heightVal );
                        tableScroll.initializeProperties();
                        tableScroll.handleScrollDown();
                    } );
                instanceEventSubcr.push( setContainerHeightEvent );
            } else {
                // reset the row height cache
                tableScroll.resetRowHeightCache();
                // Set the loaded view model objects
                tableScroll.setLoadedVMObjects( getObjects() );

                // Render initial rows if at top of table
                if( _trv.getScrollCanvasElementFromTable().scrollTop === 0 ) {
                    tableScroll.renderInitialRows();
                } else {
                    await tableScroll.handleScroll();
                }
            }
        }
    };
};

/**
 *  Release the resources occupied by SPLM table
 *
 * @param {String} gridId - Grid ID to be destroyed
 * @param {Element} tableElement - The table element
 * @param {Object} columnDefs - The column defs
 */
export let destroyTable = function( gridId, tableElement, columnDefs ) {
    var instanceEventSubcr = _eventBusSubDefs[ gridId ];
    _.forEach( instanceEventSubcr, function( eventBusSub ) {
        if( eventBusSub !== null ) {
            eventBus.unsubscribe( eventBusSub );
        }
    } );
    delete _eventBusSubDefs[ gridId ];

    for( var i = 0; i < columnDefs.length; i++ ) {
        var cellRenderers = columnDefs[ i ].cellRenderers;
        if( cellRenderers ) {
            for( var j = 0; j < cellRenderers.length; j++ ) {
                if( _.isFunction( cellRenderers[ j ].destroy ) ) {
                    cellRenderers[ j ].destroy();
                }
            }
        }
    }

    // Destroy the column/table menu
    var menu = document.getElementById( gridId + '_menuContainer' );
    if( menu !== null ) {
        document.body.removeChild( menu );
    }

    // table editor eventBusSubs unsubscribe
    var table = _tableInstances[ gridId ];
    if( table && table._tableInstance && table._tableInstance.editor ) {
        table._tableInstance.editor.cleanupEventBusSubscriptions();
    }

    // NOTE: This is not need for now since we force every
    // angularJS Compile must based on table scope. But leave
    // it here for now by commenting it out.
    // var cellRenderer = _cellRendererDefs[gridId];
    // cellRenderer.destroyHoverCommandElement();
    // delete _cellRendererDefs[gridId];

    // Destroy table renderer (InfiniteScrollService)
    if( table && table._tableInstance ) {
        table._tableInstance.renderer.destroyGrid();
    }

    delete _tableInstances[ gridId ];

    eventBus.publish( 'tableDestroyed' );
};

_splmTableMessages.arrangeMenu = localeService.getLoadedTextFromKey( 'treeTableMessages.arrangeMenu' );
_splmTableMessages.removeAllFilters = localeService.getLoadedTextFromKey( 'treeTableMessages.removeAllFilters' );
_splmTableMessages.TwistieTooltipExpanded = localeService.getLoadedTextFromKey( 'treeTableMessages.TwistieTooltipExpanded' );
_splmTableMessages.TwistieTooltipCollapsed = localeService.getLoadedTextFromKey( 'treeTableMessages.TwistieTooltipCollapsed' );
_splmTableMessages.hideColumn = localeService.getLoadedTextFromKey( 'treeTableMessages.hideColumn' );
_splmTableMessages.sortAscending = localeService.getLoadedTextFromKey( 'treeTableMessages.sortAscending' );
_splmTableMessages.sortDescending = localeService.getLoadedTextFromKey( 'treeTableMessages.sortDescending' );
_splmTableMessages.removeSort = localeService.getLoadedTextFromKey( 'treeTableMessages.removeSort' );
_splmTableMessages.freezeMenu = localeService.getLoadedTextFromKey( 'treeTableMessages.freezeMenu' );
_splmTableMessages.unfreezeMenu = localeService.getLoadedTextFromKey( 'treeTableMessages.unfreezeMenu' );
_splmTableMessages.visibilityControlsTitle = localeService.getLoadedTextFromKey( 'treeTableMessages.visibilityControlsTitle' );
_splmTableMessages.gridMenu = localeService.getLoadedTextFromKey( 'treeTableMessages.gridMenu' );

exports = {
    createTableObject,
    destroyTable
};
export default exports;
/**
 * This service provides necessary APIs to navigate to a URL within AW.
 *
 * @memberof NgServices
 * @member splmTableFactory
 *
 * @returns {Object} Reference to SPLM table.
 */
app.factory( 'splmTableFactory', () => exports );
