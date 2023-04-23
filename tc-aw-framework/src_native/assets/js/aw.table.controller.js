/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/**
 * @module js/aw.table.controller
 */
import app from 'app';
import ngModule from 'angular';
import assert from 'assert';
import $ from 'jquery';
import _ from 'lodash';
import arrayUtils from 'js/arrayUtils';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import parsingUtils from 'js/parsingUtils';
import 'js/appCtxService';
import 'js/dragAndDropService';
import 'js/viewModelService';
import 'js/selectionHelper';
import 'js/awTableService';
import 'js/awTableStateService';
import 'js/uiGridService';
import 'js/uwPropertyService';
import 'js/actionService';
import 'js/editHandlerService';
import 'js/contextMenuService';
import 'js/localeService';
import 'js/popupService';
import ngUtils from 'js/ngUtils';

var _urlAttributes = browserUtils.getUrlAttributes();
/**
 * {Boolean} TRUE if various scroll activities of this controller should be logged.
 */
var _debug_logTableScrollActivity = _urlAttributes.logTableScrollActivity !== undefined;

/**
 * {Boolean} TRUE if various loading activities of this controller should be logged.
 */
var _debug_logTableLoadActivity = _urlAttributes.logTableLoadActivity !== undefined;

/**
 * {Boolean} TRUE if various expansion activities of this controller should be logged.
 */
var _debug_logTreeExpandActivity = _urlAttributes.logTreeExpandActivity !== undefined;

/**
 * {Boolean} TRUE if various property loading activities of this controller should be logged.
 */
var _debug_logPropertyLoadActivity = _urlAttributes.logPropertyLoadActivity !== undefined;

/**
 * {Boolean} TRUE if various redraw activities of this controller should be logged.
 */
var _debug_logRedrawActivity = _urlAttributes.logRedrawActivity !== undefined;

/**
 * {Boolean} TRUE if various focus activities of this controller should be logged.
 */
var _debug_logFocusActivity = _urlAttributes.logFocusActivity !== undefined;

/**
 * {Boolean} TRUE if various scroll activities of this controller should be logged.
 */
var _debug_logScrollActivity = _urlAttributes.logScrollActivity !== undefined;

/**
 * {Number} The debug ID of the 'next' AwTableController.
 */
var _debug_nextControllerId = 0;

/**
 * {String} ui-grid treeNode.state value used when a node is expanded.
 */
var _EXPANDED = 'expanded';

/**
 * {String} ui-grid treeNode.state value used when a node is collapsed.
 */
var _COLLAPSED = 'collapsed';

/**
 * {StringMap} Map of default message IDs to localized values used for table UI managed by this service.
 */
var _defaultTextBundle = {
    TwistieTooltipCollapsed: 'Open',
    TwistieTooltipExpanded: 'Close'
};

/**
 * Defines the grid controller - pure native prototype
 * <P>
 * Note: Either the 'declViewModel' AND 'gridid' Parameters are specified OR the 'tableViewModelIn' should be.
 *
 * @class AwTableController
 *
 * @memberof module:js/aw.table.controller
 *
 * @param {Object} $scope - The AngularJS data context node this controller is being created on.
 *
 * @param {Object} $q - The queuing service to use.
 *
 * @param {$injector} $injector - The AngularJS $injector service.
 *
 * @param {$ocLazyLoad} $ocLazyLoad - The AngularJS $injector service.
 *
 * @param {appCtxService} appCtxSvc - The service to use.
 *
 * @param {selectionHelper} selectionHelper - The service to use.
 *
 * @param {actionService} actionSvc - The service to use.
 *
 * @param {awTableService} awTableSvc - The service to use.
 *
 * @param {awTableStateService} awTableStateSvc - The service to use.
 *
 * @param {DeclViewModel} declViewModel - (Optional) The 'DeclViewModel' containing the grid definition.
 *
 * @param {String} gridid - (Optional) ID of the 'declGrid' in the 'declViewModel' to base the new object upon.
 *
 * @param {Element} panelElement - The DOM Element of panel that contains this aw-table.
 *
 * @param {editHandlerService} editHandlerSvc - The DOM Element of panel that contains this aw-table.
 *
 * @param {contextMenuService} cnxtMenuSvc - The service to use.
 *
 * @param {localeService} localeSvc - The service to use.
 *
 * @param {popupService} popupSvc - The service to use.
 */
function AwTableController( $scope, $q, $injector, $ocLazyLoad, appCtxSvc, selectionHelper, actionSvc,
    awTableSvc, awTableStateSvc, declViewModel, gridid, panelElement, editHandlerSvc, cnxtMenuSvc, localeSvc, popupSvc ) {
    var tcSelf = this; // eslint-disable-line consistent-this

    // --------------------------------------------------------------
    // Class Properties (Public)
    // --------------------------------------------------------------

    /**
     * Table starts out in loading state. This is used by autotests in order to know when loading has completed.
     * Eventually may want to add gridID into the name for cases where there are multiples in the same ctx.
     */
    appCtxSvc.ctx.state.isLoading = true;

    /**
     * Set the ID of this instance.
     */
    tcSelf.id = _debug_nextControllerId++;

    // --------------------------------------------------------------
    // Class Properties (Private)
    // --------------------------------------------------------------

    /**
     * The 'awTableVideModel' used as the basis for this 'AwTableController' data and behavior.
     *
     * @private
     */
    tcSelf._awTableViewModel = null;

    /**
     * TRUE if the next 'modelObjectsUpdated' event will be the 1st for this 'AwTableController'.
     *
     * @private
     */
    tcSelf._firstTime = true;

    /**
     * @private
     */
    tcSelf._stopReload = false;

    /**
     * Cached reference to the 'declViewModel' used as the basis for the 'AwTableViewModel' behind the
     * 'aw-table'.
     *
     * @private
     */
    tcSelf._declViewModel = declViewModel;

    /**
     * Cached reference to ID of the 'DeclGrid' used as the basis for the 'AwTableViewModel' behind the
     * 'aw-table'.
     *
     * @private
     */
    tcSelf._gridId = gridid;

    /**
     * TRUE if the occurrence and timing of sorting requests should be logged to the console.
     *
     * @private
     */
    tcSelf._logSortActivity = false;

    /**
     * TRUE if the occurrence and timing of column filter requests should be logged to the console.
     *
     * @private
     */
    tcSelf._logFilterActivity = false;

    /**
     * The 'UiGridWrapper' or 'AgGridWrapper' handling interaction with the underlying grid APIs.
     *
     * @private
     */
    tcSelf._gridWrapper = null;

    /**
     * {ViewModelObjectArray} Array containing object that were added to the table before any columns were set.
     * This array is later null'ed out when the columns are later added.
     */
    tcSelf.cachedVMOs = null;

    /**
     * {Boolean} TRUE if any col (except default pinned columns) is frozen.
     *
     * @private
     */
    tcSelf.colPinned = false;

    /**
     * {Object} Stores the frozen column details.
     *
     * @private
     */
    tcSelf.frozenCol = null;

    /**
     * {ObjectArray} Collection of eventBus subscription definitions to be un-subscribed from when this
     * AwTableController is later destroyed.
     */
    tcSelf._eventBusSubDefs = [];

    /**
     * {Boolean} Last 'GridMultiSelect' broadcast.
     */
    var _currGridMultiSelectEnabled;

    /**
     * {Number} The # of milliseconds after the LAST '_pingRedrawDebounce' is called before we scan the visible
     * rows to see if any more rows need to be loaded because of being 'incompleteHead', 'incompleteTail' or
     * 'expanded'.
     */
    var _redrawDebounceTime = 10;

    /**
     * {Number} The # of milliseconds after the LAST '_pingScrollEndDebounce' is called before we call
     * '_processScrollViewportChange' to load any newly exposed properties.
     */
    var _scrollDebounceTime = 10;

    /**
     * {Number} The # of milliseconds after the LAST '_pingPropertyLoadDebounce' is called before we call
     * '_loadProps' to load any newly exposed properties.
     */
    var _propertyLoadDebounceTime = 10;

    // ---------------------------------------------------------
    // Private functions
    // ---------------------------------------------------------

    /**
     * Use the UwDataProvider set on the controller.
     *
     * @param {DeclGrid} gridObj - The DeclGrid object defined in the DeclViewModel.
     */
    function _setUpDataProvider( gridObj ) {
        var uwDataProvider = tcSelf._uwDataProvider;

        /**
         * Check if the UwDataProvider has a 'source' that looks like a 'performSearch' type action.
         * <P>
         * If so: Merge column attributes with search criteria and setup to listen when an update to the
         * 'viewModelCollection'.
         */
        if( uwDataProvider.action && uwDataProvider.action.inputData &&
            uwDataProvider.action.inputData.searchInput ) {
            var searchInput = uwDataProvider.action.inputData.searchInput;

            /**
             * Setup columns based on attributes being inflated during the search
             */
            var uwColumnInfos = tcSelf._awTableViewModel.getColumnProvider().getColumns();

            var columnAttrs = [];

            _.forEach( uwColumnInfos, function( uwColumnInfo ) {
                columnAttrs.push( uwColumnInfo.name );
            } );

            if( searchInput.attributesToInflate ) {
                searchInput.attributesToInflate = _.union( searchInput.attributesToInflate, columnAttrs );
            } else {
                searchInput.attributesToInflate = columnAttrs;
            }
        }

        /**
         * Watch for changes in the configuration of the definitions of the AwTableColumnInfoArray
         */
        uwDataProvider.columnConfig = {};
        uwDataProvider.columnConfig.columns = [];

        /**
         * Watch for changes in the definitions of the AwTableColumnInfoArray from the data provider
         * <P>
         * Note: AngularJS checks for actually changes in the watch return and so we do not need to check that
         * again here. We have seen where the data can be updated between calls. We need to trust AngularJS on
         * this one.
         */
        // LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis is bad - Framework Fixes
        // This watcher impacts performance a lot for the 2-time loading case in ACE, actually when the
        // tmpColumnInfo is same as last time, why we do column update?
        tcSelf._tmpColumnInfos = null;
        $scope.$watch( function _watchDataProviderCols() {
            return tcSelf._uwDataProvider.cols;
        }, function( newColumnInfos ) {
            if( !_.isEmpty( newColumnInfos ) &&
                !_.isEqual( tcSelf._tmpColumnInfos, newColumnInfos ) ) {
                tcSelf._tmpColumnInfos = newColumnInfos;
                tcSelf._gridWrapper.setColumnInfos( newColumnInfos );
                if( !_.isEmpty( tcSelf.cachedVMOs ) ) {
                    _setTableRowData( tcSelf.cachedVMOs );
                }

                tcSelf.cachedVMOs = null;

                if( tcSelf.colPinned ) {
                    var renderContainers = tcSelf._gridWrapper.getRenderContainers();
                    _freezeColumns( renderContainers.body.grid.columns, tcSelf.frozenCol, true );
                }
            }
        } );

        $scope.$watch( function _watchColumnConfigColumns() {
            return tcSelf._uwDataProvider.columnConfig.columns;
        }, function( newColumnInfos ) {
            if( !_.isEmpty( newColumnInfos ) ) {
                tcSelf._awTableViewModel.getColumnProvider().buildDynamicColumns( newColumnInfos, true );
            }
        } );

        /**
         * Update the table rows once the columns and model objects have been retrieved.
         *
         * @param {ViewModelObjectArray} newVMOs - objects to update the table with
         *
         * @memberOf module:js/aw.table.controller.AwTableController
         * @private
         */
        function _setTableRowData( newVMOs ) {
            var gridWrapper = tcSelf._gridWrapper;

            /**
             * Added this block to make sure that objects in selectionModel should be marked as "selected" on
             * VMO
             */
            newVMOs.map( function( vmo ) {
                vmo.selected = tcSelf._uwDataProvider.selectionModel.isSelected( vmo );
            } );

            gridWrapper.setGridData( newVMOs );

            tcSelf.setGridMultiSelect( tcSelf._uwDataProvider.selectionModel.multiSelectEnabled );

            /**
             * Set localized column display names the 1st time we get any valid data (just use the 1st row).
             */
            var columnsChanged = false;

            if( tcSelf._firstTime && newVMOs.length > 0 ) {
                tcSelf._firstTime = false;

                columnsChanged = gridWrapper.setColumnDisplayNames( newVMOs[ 0 ] );
                _controlCommandVisiblityForGrid();
            }

            /**
             * Check if the 'declGrid' has a dependent module where a 'gridRenderCallBack' function is possibly
             * defined.
             */
            if( gridObj && gridObj.deps ) {
                declUtils.loadDependentModule( gridObj.deps, $q, $injector ).then( function( depModuleObj ) {
                    if( depModuleObj.gridRenderCallBack ) {
                        var uiColumnDefs = depModuleObj.gridRenderCallBack( $scope );

                        if( uiColumnDefs ) {
                            gridWrapper.setColumnDefs( uiColumnDefs );
                            gridWrapper.notifyColumnChanges();
                        }

                        gridWrapper.announceChanges( tcSelf._uwDataProvider, true );
                    } else {
                        gridWrapper.announceChanges( tcSelf._uwDataProvider, columnsChanged );
                    }
                } );
            } else {
                gridWrapper.announceChanges( tcSelf._uwDataProvider, columnsChanged );
            }
        } // _setTableRowData

        /**
         * The below method is used for unfreezing all the columns
         *
         * @param {Object} allCols - allCols
         */
        function _unfreezeColumns( allCols ) {
            tcSelf.colPinned = false;

            // index 0 is for icon index 1 is for display name which should be pinned always.
            for( var colIndex = 2; colIndex < allCols.length; colIndex++ ) {
                allCols[ colIndex ].colDef.pinnedLeft = false;
                allCols[ colIndex ].colDef.pinnedRight = false;
                allCols[ colIndex ].renderContainer = undefined;
            }
        }

        /**
         * The below method is used for freezing the desired columns
         *
         * @param {Object} allCols - allCols
         * @param {Object} rightClickedCol - rightClickedCol
         * @param {Object} freezeColBoolean - freezeColBoolean
         */
        function _freezeColumns( allCols, rightClickedCol, freezeColBoolean ) {
            tcSelf.colPinned = true;

            var indicesToBePinned = true;
            for( var index = 0; index < allCols.length; index++ ) {
                if( indicesToBePinned && freezeColBoolean ) {
                    allCols[ index ].colDef.pinnedLeft = true;
                    if( allCols[ index ].colDef.field === rightClickedCol[ 0 ].field ) {
                        indicesToBePinned = false;
                    }
                } else {
                    allCols[ index ].colDef.pinnedLeft = false;
                    allCols[ index ].colDef.pinnedRight = false;
                    allCols[ index ].renderContainer = undefined;
                }
            }
        }

        /**
         * Setup to listen for post processing events from the specific 'uwDataProvider'.
         */
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( uwDataProvider.name + '.modelObjectsUpdated',
            function( event ) {
                if( _.isEmpty( tcSelf._awTableViewModel.getColumnProvider().getColumns() ) ||
                    !tcSelf._gridWrapper._gridApi || !tcSelf._gridWrapper._gridApi.grid ) {
                    if( !_.isEmpty( event.viewModelObjects ) ) {
                        tcSelf.cachedVMOs = event.viewModelObjects;
                    }
                } else {
                    _setTableRowData( event.viewModelObjects );
                }
            } ) );

        /**
         * Setup to listen for post processing 'expand' events from the specific 'uwDataProvider'.
         */
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( uwDataProvider.name + '.expandTreeNode', function(
            eventData ) {
            if( eventData.parentNode && !eventData.parentNode.isExpanded ) {
                tcSelf._gridWrapper.expandRow( eventData.parentNode );
            }
        } ) );

        /**
         * Setup to listen for announcements of external changes to the columns attributes for this specific
         * 'declGrid'.
         */
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( tcSelf._gridId + '.columnsChanged', function() {
            if( tcSelf._gridWrapper._gridApi ) {
                tcSelf._gridWrapper._gridApi.core.notifyDataChange( 'column' );
            }
        } ) );

        if( uwDataProvider ) {
            /**
             * Setup to listen for resetScroll if data provider is reinitialized.
             */
            tcSelf._eventBusSubDefs.push( eventBus.subscribe( uwDataProvider.name + '.resetScroll', function() {
                /**
                 * Resets the scroll position to the top.
                 */
                tcSelf._gridWrapper._gridApi.infiniteScroll.resetScroll();

                /**
                 * These changes are necessary to keep the scroll position reset.
                 * <P>
                 * If they are not manually set to 0, the saveScrollPercentage() call from
                 * uiGridService.announceChanges(), would put the scroll bar back to its pre-reset position
                 * which can cause unwanted paging to occur.
                 **/
                tcSelf._gridWrapper._gridApi.grid.infiniteScroll.previousVisibleRows = 0;
                tcSelf._gridWrapper._gridApi.grid.infiniteScroll.prevScrollTop = 0;
                tcSelf._gridWrapper._gridApi.grid.renderContainers.body.prevScrollTop = 0;
                tcSelf._gridWrapper._gridApi.grid.renderContainers.body.visibleRowCache.length = 0;
            } ) );
        }

        /**
         * Setup to listen for stop table reload
         */
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( 'aw.stopTableReload', function( newValue ) {
            tcSelf._stopReload = newValue;
        } ) );

        /**
         * Setup to listen to change filter values
         */
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( 'aw.tableDataLoaded', function() {
            var gridApi = tcSelf._gridWrapper._gridApi;
            if( gridApi ) {
                var eventData = {
                    gridApi: gridApi,
                    stopReload: tcSelf._stopReload
                };
                eventBus.publish( 'aw.tableDataLoadComplete', eventData );
            }
        } ) );

        /**
         * Setup to listen for freeze/unfreeze of columns
         */
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( tcSelf._gridId + '.tableFreezeColumns', function(
            gridData ) {
            tcSelf.frozenCol = [ gridData.grid.context.col ];
            if( gridData.freezeColBoolean ) {
                _freezeColumns( gridData.grid.grid.columns, [ gridData.grid.context.col ],
                    gridData.freezeColBoolean );
            } else {
                _unfreezeColumns( gridData.grid.grid.columns );
            }
            gridData.grid.grid.api.core.notifyDataChange( 'column' );
        } ) );

        if( _debug_logTableLoadActivity ) {
            tcSelf._eventBusSubDefs.push( eventBus.subscribe( uwDataProvider.name + '.treeNodesLoaded',
                function( eventData ) {
                    var nChildLoaded = eventData.treeLoadResult.childNodes.length;

                    logger.info( 'treeNodesLoaded: nChild: ' + nChildLoaded );
                } ) );
        }
    } // _setUpDataProvider

    /**
     *
     */
    function _controlCommandVisiblityForGrid() {
        $( '.ui-grid-menu-button' ).click( function() {
            localeSvc.getLocalizedTextFromKey( 'treeTableMessages.removeAllFilters' ).then( result => {
                var columnFilterState = appCtxSvc.getCtx( 'columnFilter' );
                var clearAllFilterTitle = result;
                if( columnFilterState ) {
                    if( !columnFilterState.isFilteringOn ) {
                        $( 'button.ui-grid-menu-item:contains(' + clearAllFilterTitle + ')' ).hide();
                    }
                }
            } );
        } );
    }

    /**
     * Fetch the properties from all currently visible rows that have no props loaded yet.
     *
     * @return {Promise} Resolved when the
     */
    function _loadProps() {
        var emptyPropRows = tcSelf._gridWrapper.findEmptyRenderedRows();

        var uwDataProvider = tcSelf._uwDataProvider;

        /**
         * Include 'top' node if it does not have 'props' set yet.
         */
        if( !uwDataProvider.topTreeNode.props ) {
            var topNodeUid = uwDataProvider.topTreeNode.uid;

            var foundTop = false;

            for( var ndx = 0; ndx < emptyPropRows.length; ndx++ ) {
                if( emptyPropRows[ ndx ].uid === topNodeUid ) {
                    foundTop = true;
                    break;
                }
            }

            if( !foundTop ) {
                emptyPropRows.push( uwDataProvider.topTreeNode );
            }
        }

        if( _.isEmpty( emptyPropRows ) ) {
            appCtxSvc.ctx.state.isLoading = false;

            return $q.resolve();
        }

        if( _debug_logPropertyLoadActivity ) {
            logger.info( '_loadProps: nRows: ' + emptyPropRows.length );
        }

        var columnInfos = [];

        _.forEach( uwDataProvider.cols, function( columnInfo ) {
            if( !columnInfo.isTreeNavigation ) {
                columnInfos.push( columnInfo );
            }
        } );

        var eventData = {
            treeLoadInput: {
                parentNode: null
            },
            treeLoadResult: {
                childNodes: emptyPropRows
            }
        };

        var propLoadReq = awTableSvc.createPropertyLoadRequest( eventData.treeLoadInput,
            eventData.treeLoadResult, columnInfos );

        var propertyLoadInput = awTableSvc.createPropertyLoadInput( [ propLoadReq ] );

        return tcSelf._uwPropProvider.getProperties( $scope, propertyLoadInput ).then(
            function( propertyLoadResult ) {
                // property loading has completed
                var topNodeUid = uwDataProvider.topTreeNode.uid;

                appCtxSvc.ctx.state.isLoading = false;

                var gridApi = tcSelf._gridWrapper.getGridApi();

                var selectedLoads = [];

                var selectionModel = tcSelf._uwDataProvider.selectionModel;

                _.forEach( propertyLoadResult.updatedNodes, function( vmo ) {
                    var gridRow = gridApi.getRow( vmo );

                    if( gridRow ) {
                        gridRow.enableSelection = true;

                        /**
                         * Check if this node we just loaded is known to be selected.
                         * <P>
                         * If so: Set the ui-grid row to indicate this.
                         */
                        gridRow.isSelected = selectionModel.isSelected( vmo );

                        if( gridRow.isSelected ) {
                            selectedLoads.push( vmo );
                        }
                    }

                    if( vmo.uid === topNodeUid ) {
                        _.assign( uwDataProvider.topTreeNode.props, vmo.props );
                    }
                } );

                if( selectedLoads.length === 1 ) {
                    $scope.$emit( 'updateBreadCrumbs', {
                        lastSelection: selectedLoads[ 0 ]
                    } );
                }

                /**
                 * Note: The scroll region may have changed since this load operation was started (which blocks
                 * any other simultaneous loading). So we need to ping to catch up here.
                 */
                tcSelf._pingPropertyLoadDebounce();
            },
            function( err ) {
                appCtxSvc.ctx.state.isLoading = false;

                return $q.reject( err );
            } );
    } // _loadProps

    /**
     * @param {QueueService} $q -
     *
     * @return {Promise} A promise that is resolved when scrolling is complete
     */
    function _scrollToFocus( $q ) {
        if( tcSelf._uwDataProvider.isFocusedLoad ) {
            // @TODO for now we are using the currently selected occurrence. However we really should use the
            // passed down focus occurrence once it is available.
            var selection = tcSelf._uwDataProvider.selectionModel.getSelection();

            var rowToScrollTo;

            if( !_.isEmpty( selection ) ) {
                rowToScrollTo = selection[ 0 ];
            } else {
                rowToScrollTo = tcSelf._gridWrapper.firstNormalRowId;
            }

            if( rowToScrollTo ) {
                var vmCollection = tcSelf._uwDataProvider.viewModelCollection;

                if( _debug_logFocusActivity ) {
                    var scrollTargetNdx = vmCollection.findViewModelObjectById( rowToScrollTo );

                    if( scrollTargetNdx !== -1 ) {
                        logger.info( '_scrollToFocus: scrollTarget=' +
                            vmCollection.getViewModelObject( scrollTargetNdx ) );
                    } else {
                        logger.info( '_scrollToFocus: rowToScrollTo=' + rowToScrollTo );
                    }
                }

                return tcSelf._gridWrapper.scrollToRow( vmCollection, rowToScrollTo );
            }
        } else {
            if( _debug_logFocusActivity ) {
                logger.info( '_scrollToFocus: Ignored since isFocusedLoad=false' );
            }
        }

        return $q.resolve();
    }

    /**
     * This property loading function is 'debounced' to only get data from the server after loading of
     * tree-table rows 'quiets down' for ~.5 seconds.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     * @private
     */
    tcSelf._pingPropertyLoadDebounce = _.debounce( function() {
        /**
         * Since debounced functions have a slight chance of being fired off after a maxWait and after the
         * declViewModel has been destroyed (and before the debounce 'cancel' function is called), we want to
         * check for that case here.
         */
        if( tcSelf._declViewModel.isDestroyed() ) {
            appCtxSvc.ctx.state.isLoading = false;

            return;
        }

        if( _debug_logPropertyLoadActivity ) {
            logger.info( '_pingPropertyLoadDebounce: Loading props after debounce..._propLoadInProgress: ' +
                tcSelf._propLoadInProgress );
        }

        /**
         * Check if we have a prop provider
         * <P>
         * If So: trigger prop loading directly
         */
        if( tcSelf._uwPropProvider && !tcSelf._propLoadInProgress ) {
            tcSelf._propLoadInProgress = true;

            _loadProps().then( function() {
                delete tcSelf._propLoadInProgress;

                if( _debug_logPropertyLoadActivity ) {
                    logger.info( '_pingPropertyLoadDebounce: Props loaded...' );
                }
            } );
        }
    }, _propertyLoadDebounceTime, {
        maxWait: 10000,
        trailing: true,
        leading: false
    } );

    /**
     * This property loading function is 'debounced' to only get data from the server after loading of
     * tree-table rows 'quiets down' for ~.5 seconds.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     * @private
     */
    tcSelf._pingSetScrollDebounce = _.debounce( function() {
        if( _debug_logScrollActivity ) {
            logger.info( '_pingSetScrollDebounce: Setting scroll...' + 'isFocusedLoad: ' +
                tcSelf._uwDataProvider.isFocusedLoad );
        }

        _scrollToFocus( $q ).then( function() {
            // In a perfect world this would be set to true last. Once we are sure that the focus has ended.
            tcSelf._gridWrapper.evaluatePlaceHolders = true;

            /**
             * Check if there are any rendered rows to scroll to.
             */
            var renderedRows = tcSelf._gridWrapper.getRenderedGridRows();

            if( !_.isEmpty( renderedRows ) ) {
                tcSelf._pingRedrawDebounce( renderedRows );
            }
        } );
    }, 500, {
        maxWait: 10000,
        trailing: true,
        leading: false
    } );

    /**
     * Ensure the row selection state matches the entity selection state.
     */
    tcSelf.syncSelectedStates = function() {
        var visibleGridRows = tcSelf._gridWrapper.getVisibleGridRows();

        if( visibleGridRows ) {
            visibleGridRows.map( function( gridRow ) {
                // VMO controls selection state - grid row should always match
                gridRow.isSelected = gridRow.entity.selected;
            } );
        }
    };

    /**
     * This property loading function is 'debounced' to only get data from the server after loading of
     * tree-table rows 'quiets down' for ~1 second.
     *
     * @param {UiGridRowArray} renderedRows - Array of currently visible ui-grid rows.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     * @private
     */
    tcSelf._pingRedrawDebounce = _.debounce( function( renderedRows ) {
        /**
         * Since debounced functions have a slight chance of being fired off after a maxWait and after the
         * declViewModel has been destroyed (and before the debounce 'cancel' function is called), we want to
         * check for that case here.
         */
        if( tcSelf._declViewModel.isDestroyed() ) {
            return;
        }

        /**
         * Check If we are currently editing
         * <P>
         * If so: We do not want to load or change anything in the table.
         */
        if( editHandlerSvc.editInProgress().editInProgress ) {
            return;
        }

        /**
         * Stop any property loading that may have been pending since we need to evaluate what rows are
         * currently visible and that may change exactly what properties to load.
         */
        tcSelf._pingPropertyLoadDebounce.cancel();
        tcSelf._pingSetScrollDebounce.cancel();

        /**
         * Log useful details (if necessary)
         */
        if( _debug_logRedrawActivity ) {
            var length = renderedRows.length;

            var msg = '_pingRedrawDebounce...nRows: ' + length;

            if( length ) {
                var vmCollection = tcSelf.getViewModelCollection();
                var vmNodes = vmCollection.getLoadedViewModelObjects();

                msg += '\n';
                msg += ' 1st  : ' + renderedRows[ 0 ].entity;
                msg += '\n';
                msg += ' last : ' + renderedRows[ length - 1 ].entity;
                msg += '\n';
                msg += ' total: ' + vmNodes.length;
            }

            logger.info( msg );
        }

        var loadHeadPublished = false;
        var loadTailPublished = false;
        var expansionPublished = false;
        var focusPublished = false;

        if( !_.isEmpty( renderedRows ) ) {
            /**
             * Set ui-grid states to match node states. If it is a focus load we must align all nodes. Otherwise
             * we will only align the rendered nodes.
             */
            if( tcSelf._uwDataProvider.isFocusedLoad ) {
                _alignNodeStates( tcSelf._gridWrapper._gridApi.grid.rows );
            } else {
                _alignNodeStates( renderedRows );
            }

            /**
             * Check if we are looking to find more data to load AND we are NOT currently editing this table.
             */
            if( tcSelf._gridWrapper.evaluatePlaceHolders && !tcSelf._gridWrapper._editing ) {
                /**
                 * Load any 'incompleteHead' nodes that need loading.
                 */
                loadHeadPublished = _loadFirstIncompleteHead( renderedRows );

                if( !loadHeadPublished ) {
                    /**
                     * Load any 'incompleteHead' nodes that need loading.
                     */
                    loadTailPublished = _loadFirstIncompleteTail( renderedRows );

                    if( !loadTailPublished && tcSelf._uwDataProvider.accessMode === 'tree' ) {
                        /**
                         * Expand first visible row that need expanding.
                         */
                        expansionPublished = _expandFirstVisibleNode( renderedRows );

                        if( !expansionPublished ) {
                            /**
                             * Load siblings of the last place holder.
                             */
                            focusPublished = _focusLastPlaceHolderNode( renderedRows );

                            if( !focusPublished ) {
                                /**
                                 * Trigger prop loading directly
                                 */
                                _scrollToFocus( $q ).then( function() {
                                    if( tcSelf._uwDataProvider.isFocusedLoad ) {
                                        if( _debug_logFocusActivity ) {
                                            logger.info( '_pingRedrawDebounce: Resetting isFocusedLoad' );
                                        }

                                        // <pre>
                                        // Possible fix for scroll to problem...investigate later
                                        // var selection = tcSelf._uwDataProvider.selectionModel.getSelection();
                                        // var selectionInVP = false;
                                        //
                                        // for( var ndx = 0; ndx < renderedRows.length; ndx++ ) {
                                        //     var gridRow = renderedRows[ ndx ];
                                        //
                                        //     if( gridRow.entity.id === selection[ 0 ] ) {
                                        //         selectionInVP = true;
                                        //         break;
                                        //     }
                                        // }
                                        //
                                        // expansionPublished = _expandFirstVisibleNode( renderedRows );
                                        //
                                        // if( !expansionPublished && selectionInVP ) {
                                        //     delete tcSelf._uwDataProvider.isFocusedLoad;
                                        // }
                                        // </pre>

                                        delete tcSelf._uwDataProvider.isFocusedLoad;
                                    }

                                    tcSelf._pingPropertyLoadDebounce();
                                } );
                            }
                        }
                    } else {
                        /**
                         * This is for table only. Removes the focus flag as the focus load has completed.
                         */
                        delete tcSelf._uwDataProvider.isFocusedLoad;
                    }
                }
            } else {
                tcSelf._pingSetScrollDebounce();
            }
        }

        if( _debug_logRedrawActivity ) {
            if( loadHeadPublished || loadTailPublished || expansionPublished || focusPublished ) {
                logger.info( //
                    '_pingRedrawDebounce...' + '\n' + //
                    'loadHeadPublished : ' + loadHeadPublished + '\n' + //
                    'loadTailPublished : ' + loadTailPublished + '\n' + //
                    'expansionPublished: ' + expansionPublished + '\n' + //
                    'focusPublished    : ' + focusPublished );
            }
        }

        tcSelf.syncSelectedStates();
    }, _redrawDebounceTime, {
        maxWait: 5000,
        trailing: true,
        leading: false
    } );

    /**
     * This data update function is 'debounced' to only get data from the server once the sort column change
     * requests 'quiet down' for ~1 second.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     * @private
     */
    tcSelf._pingFilterChangeDebounce = _.debounce( function( grid ) {
        var uwDataProvider = tcSelf._uwDataProvider;
        var columnNameAndFilterValueMap = [];

        if( uwDataProvider ) {
            uwDataProvider.filterMap = {};

            var columnName;

            _.forEach( grid.columns, function( columnInfo ) {
                if( columnInfo.colDef.name !== 'icon' && columnInfo.filters && columnInfo.filters[ 0 ].term && columnInfo.filters[ 0 ].term.length > 0 ) {
                    var filterCriteria = [ {
                        searchFilterType: 'StringFilter',
                        stringValue: columnInfo.filters[ 0 ].term
                    } ];
                    uwDataProvider.filterMap[ 'WorkspaceObject.' + columnInfo.field ] = filterCriteria;
                    columnName = columnInfo.displayName;
                    if( columnName.indexOf( ' ' ) > -1 ) {
                        columnName = '"' + columnName + '"';
                    }
                    columnNameAndFilterValueMap[ columnName ] = columnInfo.filters[ 0 ].term;
                } else if( columnInfo.colDef.name !== 'icon' && columnInfo.filters[ 0 ].hasOwnProperty( 'term' ) && ( columnInfo.filters[ 0 ].term === null || columnInfo.filters[ 0 ].term === '' || columnInfo.filters[ 0 ].term === undefined ) ) {
                    columnName = columnInfo.displayName;
                    if( columnName.indexOf( ' ' ) > -1 ) {
                        columnName = '"' + columnName + '"';
                    }
                    columnNameAndFilterValueMap[ columnName ] = null;
                }
            } );

            var startTime = null;

            if( tcSelf._logFilterActivity ) {
                startTime = Date.now();

                logger.trace( 'Filter Column(s): ' + JSON.stringify( uwDataProvider.filterMap ) );
            }

            eventBus.publish( 'aw.columnFilterValuesUpdated', columnNameAndFilterValueMap );

            if( !tcSelf._stopReload ) {
                tcSelf.reloadData().then( function() {
                    if( startTime ) {
                        logger.trace( 'Filter Column(s): DONE - ' + Date.now() - startTime + ' ms.' );
                    }
                } );
            } else {
                tcSelf._stopReload = false;
            }
        }
    }, 1000, {
        maxWait: 3000,
        trailing: true,
        leading: false
    } );

    /**
     * This data update function is 'debounced' to only get data from the server once the sort column change
     * requests 'quiet down' for ~1 second.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     * @private
     */
    tcSelf._pingSortChangeDebounce = _.debounce( function( sortColumns ) {
        var columnProvider = tcSelf._awTableViewModel.getColumnProvider();
        if( columnProvider ) {
            var newSortCriteria = [];

            _.forEach( sortColumns, function( sortColumn ) {
                var searchSortDir = 'ASC';

                if( sortColumn.sort.direction === 'desc' ) {
                    searchSortDir = 'DESC';
                }

                newSortCriteria.push( {
                    fieldName: sortColumn.field,
                    sortDirection: searchSortDir
                } );
            } );

            appCtxSvc.updatePartialCtx( appCtxSvc.ctx.sublocation.clientScopeURI + '.sortCriteria', newSortCriteria );
            appCtxSvc.ctx.sublocation.sortCriteria = newSortCriteria;
            columnProvider.setSortCriteria( newSortCriteria );

            var startTime = null;

            if( tcSelf._logSortActivity ) {
                startTime = Date.now();

                logger.trace( 'Sort Column(s): ' + JSON.stringify( columnProvider.getSortCriteria() ) );
            }

            tcSelf.reloadData().then( function() {
                if( startTime ) {
                    logger.trace( 'Sort Column(s): DONE - ' + Date.now() - startTime + ' ms.' );
                }
            } );
        }
    }, 500, {
        maxWait: 1000,
        trailing: true,
        leading: false
    } );

    /**
     * This function is 'debounced' so as to only compute and save the current 'top row' in the local storage
     * once scrolling has slowed down.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     * @private
     */
    tcSelf._pingScrollEndDebounce = _.debounce( function( scrollEvent, renderedRows ) {
        /**
         * Determine the top row currently rendered
         */
        var topTreeNode = null;

        if( !_.isEmpty( renderedRows ) ) {
            topTreeNode = _processScrollViewportChange( scrollEvent.grid.renderContainers.body );
        } else {
            if( _debug_logTableScrollActivity ) {
                logger.info( 'scrollEnd...' + 'Nothing rendered yet' );
            }

            if( !_.isEmpty( scrollEvent.grid.options.data ) ) {
                var rowFraction = 0;

                if( scrollEvent.newScrollTop ) {
                    rowFraction = scrollEvent.newScrollTop / scrollEvent.grid.options.rowHeight;
                }

                var rowNdx = Math.round( rowFraction );

                if( rowNdx >= scrollEvent.grid.options.data.length ) {
                    rowNdx = scrollEvent.grid.options.data.length - 1;
                }

                topTreeNode = scrollEvent.grid.options.data[ rowNdx ];

                if( _debug_logTableScrollActivity ) {
                    logger.info( 'scrollEnd...' + 'topRow: ' + topTreeNode.displayName + '     id:' +
                        topTreeNode.id );
                }
            }
        }

        /**
         * Check if we have rows in the table
         * <P>
         * If so: Save it away
         * <P>
         * Note: When clearing the tree we will use a 'blank' topTreeNode with 'no data'
         */
        if( topTreeNode && topTreeNode.id ) {
            awTableStateSvc.saveScrollTopRow( tcSelf._declViewModel, tcSelf._gridId, topTreeNode );
        }
    }, _scrollDebounceTime, {
        maxWait: 10000,
        trailing: true,
        leading: false
    } );

    /**
     * Visit the given nodes and make sure:
     * <P>
     * _The ui-grid row state matches the equivelent state in the ViewModelTreeNode
     * <P>
     *  _Selection is enabled if properties have been loaded
     * <P>
     *  _The tooltip and icon for expansion state is updated
     *
     * @param {UiGridRowArray} renderedGridRows - The currently visible ui-grid rows to test.
     */
    function _alignNodeStates( renderedGridRows ) {
        var stateChanged = false;

        var gridOptions = $scope.gridOptions;
        var editInProgress = editHandlerSvc.editInProgress().editInProgress;

        for( var ndx = 0; ndx < renderedGridRows.length; ndx++ ) {
            var gridRow = renderedGridRows[ ndx ];

            if( gridRow.treeNode ) {
                var uiGridExpanded = gridRow.treeNode.state === _EXPANDED;

                var vmNode = gridRow.entity;

                var awNodeExpanded = vmNode.isLeaf ? false : declUtils.isNil( vmNode.isExpanded ) ? false :
                    vmNode.isExpanded;

                if( uiGridExpanded !== awNodeExpanded ) {
                    gridRow.treeNode.state = awNodeExpanded ? _EXPANDED : _COLLAPSED;

                    stateChanged = true;
                }

                gridRow.enableSelection = !_.isEmpty( vmNode.props );

                if( gridOptions.textBundle ) {
                    vmNode._twistieTitle = vmNode.isLeaf || editInProgress ? '' :
                        uiGridExpanded ? gridOptions.textBundle.TwistieTooltipExpanded :
                        gridOptions.textBundle.TwistieTooltipCollapsed;
                } else {
                    vmNode._twistieTitle = vmNode.isLeaf || editInProgress ? '' :
                        uiGridExpanded ? _defaultTextBundle.TwistieTooltipExpanded :
                        _defaultTextBundle.TwistieTooltipCollapsed;
                }
            }
        }

        if( stateChanged ) {
            tcSelf._gridWrapper.getGridApi().queueGridRefresh();
        }
    } // _alignNodeStates

    /**
     * @param {ViewModelTreeNode} vmNode - The node to focus on relative to its immediate parent.
     *
     * @return {Promise} Resolved when the results of the operation have been integrated into the dataProvider's
     *         viewModelCollection.
     */
    function _doFocusPlaceholder( vmNode ) {
        /**
         * Make sure we can find the 'placeholder' node in the vmCollection.
         */
        var uwDataProvider = tcSelf._uwDataProvider;

        var vmCollection = uwDataProvider.viewModelCollection;

        var cursorNdx = vmCollection.findViewModelObjectById( vmNode.uid );

        assert( cursorNdx !== -1, 'Unable to locate node in dataProvider collection' );

        /**
         * Find 'parent' node of the 'placeholder' node in the vmCollection
         */
        var phParentNode;

        var cursorNode = vmCollection.getViewModelObject( cursorNdx );

        var parentLevelNdx = cursorNode.levelNdx - 1;

        if( parentLevelNdx === -1 ) {
            phParentNode = uwDataProvider.topTreeNode;
        } else {
            for( var rowNdx = cursorNdx - 1; rowNdx >= 0; rowNdx-- ) {
                var currRow = vmCollection.getViewModelObject( rowNdx );

                if( currRow.levelNdx === parentLevelNdx ) {
                    phParentNode = currRow;
                    break;
                }
            }
        }

        assert( phParentNode, 'Unable to locate parent node in dataProvider collection' );

        /**
         * Load, using the 'focusAction', the siblings of the 'placeholder' in the context of its immediate
         * 'parent'.
         * <P>
         * Note: We want to use a smaller page size here to minimize the loading.
         */
        var treeLoadInput = awTableSvc.createTreeLoadInput( phParentNode, 0, null, vmNode.id, uwDataProvider.treePageSize, true, null );

        var loadIDs = {
            t_uid: uwDataProvider.topTreeNode.uid,
            o_uid: phParentNode ? phParentNode.uid : null,
            c_uid: vmNode.uid,
            uid: null
        };

        var actionRequestObj = {
            treeLoadInput: treeLoadInput,
            loadIDs: loadIDs
        };

        /**
         * Change 'suffix' text to indicate we are attempting to load more rows.
         */
        vmNode.loadingStatus = true;

        return uwDataProvider.someDataProviderSvc.executeLoadAction( uwDataProvider.focusAction,
            uwDataProvider.json, $scope, actionRequestObj ).then( function( response ) {
            /**
             * Locate cursor node in original collection & find/collect all contained 'child' nodes.
             */
            var cursorId = cursorNode.id;
            var cursorLevel = cursorNode.levelNdx;

            var vmCollection = uwDataProvider.viewModelCollection;

            var cursorNdxInOrig = vmCollection.findViewModelObjectById( cursorId );
            var loadedVMObjects = vmCollection.loadedVMObjects;

            var cursorVMObjects = [ loadedVMObjects[ cursorNdxInOrig ] ];

            for( var l = cursorNdxInOrig + 1; l < loadedVMObjects.length; l++ ) {
                var currNode = loadedVMObjects[ l ];

                if( currNode.levelNdx <= cursorLevel ) {
                    break;
                }

                cursorVMObjects.push( currNode );
            }

            /**
             * Re-order the childNdx values of the sibling nodes relative to initial placeholder as 0;
             */
            var treeLoadResult = response.actionResultObj.responseObj.treeLoadResult;

            var newVMObjects = treeLoadResult.childNodes;

            var cursorNdxInNew;

            for( var i = 0; i < newVMObjects.length; i++ ) {
                if( newVMObjects[ i ].id === cursorId ) {
                    cursorNdxInNew = i;
                    break;
                }
            }

            assert( cursorNdxInNew >= 0, 'Unable to locate placeHolder node in focus operation result' );

            for( var j = 0; j < newVMObjects.length; j++ ) {
                newVMObjects[ j ].childNdx = j - cursorNdxInNew;
            }

            /**
             * Check if the 'fresh' cursor node is at either end of the 'sibling' list and is now known to be an
             * 'incompleteHead' or 'incompleteTail'
             * <P>
             * If so: Move that status over to the 'original' cursor node.
             * <P>
             * Note: We are about to replace the 'fresh' node in the set of its siblings just returned and we do
             * not want to lose this important information.
             */
            if( cursorNdxInNew === 0 && newVMObjects[ 0 ].incompleteHead ) {
                cursorNode.incompleteHead = true;
            }

            var lastNodeNdx = newVMObjects.length - 1;

            if( cursorNdxInNew === lastNodeNdx && newVMObjects[ lastNodeNdx ].incompleteTail ) {
                cursorNode.incompleteTail = true;
            }

            /**
             * Make sure the placeholder 'parent' node gets its 'children' set (a shallow clone is good enough).
             * <P>
             * Replace the 'fresh' cursor node with the 'original' cursor node since it holds important state
             * and hierarchy info.
             */
            phParentNode.children = _.clone( newVMObjects );

            phParentNode.children[ cursorNdxInNew ] = cursorNode;

            /**
             * Remove the 'fresh' cursor node from the array of its siblings.
             * <P>
             * Insert the cursor node (and all of its children from the original array) into the array of new
             * nodes.
             * <P>
             * Remove the cursor node (and all of its children) from the original array
             * <P>
             * Insert the new nodes (updated with the cursor node and all of its children from the original
             * array) into the vmCollection array of nodes.
             * <P>
             * Clear the loading status of the cursor node.
             */
            newVMObjects.splice( cursorNdxInNew, 1 );

            var insertNdx = cursorNdxInNew - 1;

            if( _debug_logRedrawActivity ) {
                logger.info( '_doFocusPlaceholder: ' + '\n' + //
                    'loadedVMObjects #: ' + loadedVMObjects.length + '\n' + //
                    'cursorNdxInOrig  : ' + cursorNdxInOrig + '\n' + //
                    'cursorVMObjects #: ' + cursorVMObjects.length + '\n' + //
                    '\n' + //
                    'cursorNdxInNew   : ' + cursorNdxInNew + '\n' + //
                    'newVMObjects #   : ' + ( newVMObjects.length + 1 ) + '\n' + //
                    '\n' + //
                    'insertNdx        : ' + insertNdx + '\n' //
                );
            }

            arrayUtils.insert( newVMObjects, insertNdx, cursorVMObjects );

            loadedVMObjects.splice( cursorNdxInOrig, cursorVMObjects.length );

            arrayUtils.insert( loadedVMObjects, cursorNdxInOrig - 1, newVMObjects );

            delete vmNode.loadingStatus;

            /**
             * Fire a 'treeNodesLoaded' event, sourced to the uwDataProvider, for all tree-table changes. This
             * event includes only the input/result structures for the current load operation. This event is
             * used to load additional properties in an async fashion.
             */
            eventBus.publish( uwDataProvider.name + '.treeNodesLoaded', {
                treeLoadInput: treeLoadInput,
                treeLoadResult: treeLoadResult
            } );

            /**
             * Fire a 'modelObjectsUpdated' event, sourced to the uwDataProvider, for all tree-table changes.
             * This event includes the complete array of nodes in the collection.
             */
            eventBus.publish( uwDataProvider.name + '.modelObjectsUpdated', {
                viewModelObjects: loadedVMObjects,
                noResults: false
            } );

            /**
             * Since we have just added some rows, queue up an evaluation of what is now loaded.
             */
            tcSelf._pingRedrawDebounce( tcSelf._gridWrapper.getRenderedGridRows() );
        } );
    } // _doFocusPlaceholder

    /**
     * @param {ViewModelTreeNode} vmNode - The node to insert the next page of sibling nodes above.
     *
     * @return {Promise} Resolved when the results of the operation have been integrated into the dataProvider's
     *         viewModelCollection.
     */
    function _doLoadNextPage( vmNode ) {
        /**
         * Change 'suffix' text to indicate we are attempting to load mode rows.
         */
        vmNode.loadingStatus = true;

        // distinguish ACE use-cases
        if( tcSelf._uwDataProvider.accessMode === 'tree' ) {
            /**
             * Setup to load the 'previous' page of sibling rows of this node.
             */
            if( vmNode.levelNdx === 0 ) {
                return tcSelf._uwDataProvider.getNextPage( $scope ).then( function() {
                    delete vmNode.loadingStatus;
                } );
            }

            return tcSelf._uwDataProvider.getTreeNodePage( $scope, null, vmNode.uid, true, null ).then(
                function() {
                    delete vmNode.loadingStatus;
                } );
        }

        return tcSelf._uwDataProvider.getNextPage( $scope ).then( function() {
            delete vmNode.loadingStatus;
        } );
    } // _doLoadNextPage

    /**
     * @param {ViewModelTreeNode} vmNode - The node to insert the previous page of sibling nodes above.
     *
     * @return {Promise} Resolved when the results of the operation have been integrated into the dataProvider's
     *         viewModelCollection.
     */
    function _doLoadPreviousPage( vmNode ) {
        /**
         * Change 'suffix' text to indicate we are attempting to load mode rows.
         */
        vmNode.loadingStatus = true;

        /**
         * Setup to load the 'previous' page of sibling rows of this node.
         */
        if( vmNode.levelNdx === 0 ) {
            return tcSelf._uwDataProvider.getPreviousPage( $scope ).then( function() {
                delete vmNode.loadingStatus;
            } );
        }

        return tcSelf._uwDataProvider.getTreeNodePage( $scope, null, vmNode.id, false, null ).then( function() {
            delete vmNode.loadingStatus;
        } );
    } // _doLoadPreviousPage

    /**
     * Check if we have any nodes previously skipped for expansion since they were non-visible nodes. See if any
     * of them are visible now.
     * <P>
     * If so: Find the one closest to the top row start the expansion of it. This will enable a 'depth first'
     * expansion pattern.
     *
     * @param {UiGridRowArray} renderedGridRows - The currently visible ui-grid rows to test.
     *
     * @return {Boolean} TRUE if an expansion request was published.
     */
    function _expandFirstVisibleNode( renderedGridRows ) {
        if( _debug_logTreeExpandActivity ) {
            logger.info( '_expandFirstVisibleNode: evaluate' );
        }

        var ttState;

        for( var ndx = 0; ndx < renderedGridRows.length; ndx++ ) {
            var gridRow = renderedGridRows[ ndx ];

            var vmNode = gridRow.entity;

            /**
             * Check if this one is in the process of being expanded.
             * <P>
             * If so: We want to let it finish before we try to expand any other visible nodes.
             */
            if( vmNode._expandRequested ) {
                if( _debug_logRedrawActivity ) {
                    logger.info( '_expandFirstVisibleNode:...waiting on expand action: ' + vmNode );
                }

                return true;
            }

            /**
             * Check if node is NOT a 'leaf' AND ui-grid 'thinks' this is NOT a treeNode or it is NOT expanded.
             */
            if( !vmNode.isLeaf && ( !gridRow.treeNode || gridRow.treeNode.state !== _EXPANDED ) ) {
                /**
                 * Check if we 'think' the row SHOULD be expanded.
                 */
                if( !ttState ) {
                    ttState = awTableStateSvc.getTreeTableState( tcSelf._declViewModel, tcSelf._gridId );
                }

                if( awTableStateSvc.isNodeExpanded( ttState, vmNode ) ) {
                    if( _debug_logTreeExpandActivity ) {
                        logger.info( '_expandFirstVisibleNode: rowNdx: ' + ndx + ' expanding: ' + vmNode );
                    }

                    if( _debug_logRedrawActivity ) {
                        logger.info( '_expandFirstVisibleNode: +++Start expand action: ' + vmNode );
                    }

                    /**
                     * Mark the row as its expansion in now in progress.
                     */
                    tcSelf._gridWrapper.expandRow( vmNode );

                    if( _debug_logRedrawActivity ) {
                        logger.info( '_expandFirstVisibleNode: ---End expand action: ' + vmNode );
                    }

                    return true;
                }
            }
        }

        return false;
    } // _expandFirstVisibleNode

    /**
     * Check if we have any nodes previously skipped for expansion since they were non-visible nodes. See if any
     * of them are visible now.
     * <P>
     * If so: Find the one closest to the top row start the expansion of it. This will enable a 'depth first'
     * expansion pattern.
     *
     * @param {UiGridRowArray} renderedGridRows - The currently visible ui-grid rows to test.
     *
     * @return {Boolean} TRUE if an placeholder focus request was published.
     */
    function _focusLastPlaceHolderNode( renderedGridRows ) {
        if( _debug_logTreeExpandActivity ) {
            logger.info( '_focusLastPlaceHolderNode: evaluate' );
        }

        var uwDataProvider = tcSelf._uwDataProvider;

        if( uwDataProvider.focusAction ) {
            var nonPlaceholderFound = false;

            for( var ndx = renderedGridRows.length - 1; ndx >= 0; ndx-- ) {
                /**
                 * Check if this one is in the process of being focused.
                 * <P>
                 * If so: We want to let it finish before we try to expand any other visible nodes.
                 */
                var vmNode = renderedGridRows[ ndx ].entity;

                if( vmNode._focusRequested ) {
                    if( _debug_logRedrawActivity ) {
                        logger.info( '_focusLastPlaceHolderNode: ...waiting on focus action: ' + vmNode );
                    }
                    return true;
                }

                /**
                 * Check if this node is a 'placeholder'
                 */
                if( vmNode.isPlaceholder ) { // ...use .isPlaceholder or .isFocusParent instead
                    if( nonPlaceholderFound ) {
                        delete vmNode.isPlaceholder;

                        vmNode._focusRequested = true;

                        if( _debug_logRedrawActivity ) {
                            logger.info( '_focusLastPlaceHolderNode: +++Start focus action: ' + vmNode );
                        }

                        _doFocusPlaceholder( vmNode ).then( function() {
                            if( _debug_logRedrawActivity ) {
                                logger.info( '_focusLastPlaceHolderNode: ---End focus action: ' + vmNode );
                            }

                            _scrollToFocus( $q ).then( function() {
                                delete vmNode._focusRequested;
                            } );
                        }, function( err ) {
                            logger.error( err + '\n' + vmNode );

                            delete vmNode._focusRequested;
                        } );

                        return true;
                    }
                } else {
                    nonPlaceholderFound = true;
                }
            }
        }

        return false;
    } // _focusLastPlaceHolderNode

    /**
     * Find the 'incompleteHead' node closest to the top row and start loading the previous page of node above
     * it.
     *
     * @param {UiGridRowArray} renderedGridRows - The currently visible ui-grid rows to test.
     *
     * @return {Boolean} TRUE if an 'incompleteHead' was found and a load previous page request was published.
     */
    function _loadFirstIncompleteHead( renderedGridRows ) {
        if( _debug_logTreeExpandActivity ) {
            logger.info( '_loadFirstIncompleteHead: evaluate' );
        }

        var uwDataProvider = tcSelf._uwDataProvider;

        if( uwDataProvider.previousAction ) {
            for( var ndx = 0; ndx < renderedGridRows.length; ndx++ ) {
                /**
                 * Check if this one is in the process of being loaded.
                 * <P>
                 * If so: We want to let it finish before we try to load any other nodes.
                 */
                var vmNode = renderedGridRows[ ndx ].entity;

                if( vmNode._loadHeadRequested ) {
                    if( _debug_logRedrawActivity ) {
                        logger.info( '_loadFirstIncompleteHead: ...waiting on load previous action: ' + vmNode );
                    }

                    return true;
                }

                /**
                 * Check if this node is a 'incompleteHead'
                 */
                if( vmNode.incompleteHead && vmNode.levelNdx >= 0 ) {
                    delete vmNode.incompleteHead;

                    vmNode._loadHeadRequested = true;

                    if( _debug_logRedrawActivity ) {
                        logger.info( '_loadFirstIncompleteHead: +++Start load previous action: ' + vmNode );
                    }

                    _doLoadPreviousPage( vmNode ).then( function() {
                        if( _debug_logRedrawActivity ) {
                            logger.info( '_loadFirstIncompleteHead: ---End load previous action: ' + vmNode );
                        }

                        _scrollToFocus( $q ).then( function() {
                            delete vmNode._loadHeadRequested;
                        } );
                    }, function( err ) {
                        logger.error( err + '\n' + vmNode );

                        delete vmNode._loadHeadRequested;
                    } );

                    return true;
                }
            }
        }

        return false;
    } // _loadFirstIncompleteHead

    /**
     * Find the 'incompleteHead' node closest to the top row and start loading the previous page of node above
     * it.
     *
     * @param {UiGridRowArray} renderedGridRows - The currently visible ui-grid rows to test.
     *
     * @return {Boolean} TRUE if an 'incompleteHead' was found and a load previous page request was published.
     */
    function _loadFirstIncompleteTail( renderedGridRows ) {
        if( _debug_logTreeExpandActivity ) {
            logger.info( '_loadFirstIncompleteTail: evaluate' );
        }

        var uwDataProvider = tcSelf._uwDataProvider;

        if( uwDataProvider.nextAction || uwDataProvider.action ) {
            for( var ndx = 0; ndx < renderedGridRows.length; ndx++ ) {
                /**
                 * Check if this one is in the process of being loaded.
                 * <P>
                 * If so: We want to let it finish before we try to load any other nodes.
                 */
                var vmNode = renderedGridRows[ ndx ].entity;

                if( vmNode._loadTailRequested ) {
                    if( _debug_logRedrawActivity ) {
                        logger.info( '_loadFirstIncompleteTail: ...waiting on load next action: ' + vmNode );
                    }

                    return true;
                }

                /**
                 * Check if this node is a 'incompleteTail'
                 */
                if( vmNode.incompleteTail && ( vmNode.levelNdx === undefined || vmNode.levelNdx >= 0 ) ) {
                    delete vmNode.incompleteTail;

                    vmNode._loadTailRequested = true;

                    if( _debug_logRedrawActivity ) {
                        logger.info( '_loadFirstIncompleteTail: +++Start load next action: ' + vmNode );
                    }

                    _doLoadNextPage( vmNode ).then( function() {
                        if( _debug_logRedrawActivity ) {
                            logger.info( '_loadFirstIncompleteTail: ---End load next action: ' + vmNode );
                        }

                        _scrollToFocus( $q ).then( function() {
                            delete vmNode._loadTailRequested;
                        } );
                    }, function( err ) {
                        logger.error( err + '\n' + vmNode );

                        delete vmNode._loadTailRequested;
                    } );

                    return true;
                }
            }
        }

        return false;
    } // _loadFirstIncompleteTail

    /**
     * To save memory, free-up the resources used by the 'props' property in all nodes 'above' and 'below' the
     * currently visible 'first' and 'last' rows (plus a couple of rows margin).
     *
     * @param {Object} sourceRowContainer - ...
     *
     * @return {ViewModelTreeNode} The 'node' currently displayed at the top of the tree UI.
     */
    function _processScrollViewportChange( sourceRowContainer ) {
        var firstRowIndex = sourceRowContainer.currentTopRow;

        var renderedRows = sourceRowContainer.renderedRows;

        var length = renderedRows.length;

        var lastRowIndex = firstRowIndex + length;

        var topTreeNode = sourceRowContainer.visibleRowCache[ firstRowIndex ].entity;

        if( _debug_logTableScrollActivity ) {
            if( length > 0 ) {
                var vmCollection = tcSelf.getViewModelCollection();

                var vmNodesDbg = vmCollection.getLoadedViewModelObjects();

                logger.info( //
                    '_processScrollViewportChange: nRows: ' + length + '\n' + //
                    ' 1st     : ' + renderedRows[ 0 ].entity + '\n' + //
                    ' last    : ' + renderedRows[ length - 1 ].entity + '\n' + //
                    ' firstNdx: ' + firstRowIndex + '\n' + //
                    ' lastNdx : ' + lastRowIndex + '\n' + //
                    ' topRow  : ' + topTreeNode + '\n' + //
                    ' total   : ' + vmNodesDbg.length );
            } else {
                logger.info( '_processScrollViewportChange: nRows: ' + length );
            }
        }

        /**
         * Check if we want to clear out all the ViewModelProperty arrays from hidden rows.
         * <P>
         * Note: The optional 'keepHiddenProperties' property is TRUE by default.
         */
        var declGrid = tcSelf._declViewModel.grids[ tcSelf._gridId ];

        if( !declUtils.isNil( declGrid.keepHiddenProperties ) && !declGrid.keepHiddenProperties ) {
            var margin = 5;

            var vmNodes = tcSelf.getViewModelCollection().getLoadedViewModelObjects();

            var endNdx = firstRowIndex - margin;

            if( endNdx > 0 ) {
                for( var ndx1 = 0; ndx1 < endNdx; ndx1++ ) {
                    var currNode1 = vmNodes[ ndx1 ];

                    if( currNode1.props ) {
                        delete currNode1.props;
                    }
                }
            }

            var begNdx = lastRowIndex + margin;

            if( begNdx < vmNodes.length ) {
                for( var ndx2 = begNdx; ndx2 < vmNodes.length; ndx2++ ) {
                    var currNode2 = vmNodes[ ndx2 ];

                    if( currNode2.props ) {
                        delete currNode2.props;
                    }
                }
            }
        }

        return topTreeNode;
    } // _processScrollViewportChange

    /**
     * Set selection local grid options based on the given selectionModel and publish a 'xxx.gridSelection'
     * event.
     *
     * @param {UwSelectionModel} selectionModel - selection model
     */
    function _syncSelectionAndPublish( selectionModel ) {
        // Broadcast multiple selection enablement
        tcSelf.setGridMultiSelect( selectionModel.multiSelectEnabled );

        selectionModel.evaluateSelectionStatusSummary( tcSelf._uwDataProvider );

        // Publish the current grid selection
        eventBus.publish( tcSelf._gridId + '.gridSelection', {
            selectedObjects: tcSelf._uwDataProvider.getSelectedObjects()
        } );
    }

    /**
     * Set selection local grid options based on the given dataProvider and publish a 'xxx.gridSelection' event.
     *
     * @param {UwDataProvider} uwDataProvider - The dataProvider who's selection model to use.
     * @param {Number} newRowCol - represents the new selection of Matrix row and column object
     * @param {Number} oldRowCol - represents the previous selection of Matrix row and column object
     * @param {ui-grid} grid -
     * @param {Object} event - event
     */
    function _syncCellSelectionAndPublish( uwDataProvider, newRowCol, oldRowCol, grid, event ) {
        // Publish the current grid cell selection
        var gridid = tcSelf._awTableViewModel.getGridId();

        eventBus.publish( gridid + '.gridCellSelection', {
            selectedObjects: newRowCol,
            oldRowCol: oldRowCol,
            grid: grid,
            ctrlKey: event.ctrlKey,
            currentTarget: event.currentTarget
        } );
    }

    // ---------------------------------------------------------
    // Public functions
    // ---------------------------------------------------------

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @return {AwTableViewModel} The 'AwTableViewModel' used as the basis for this 'AwTableController'.
     */
    tcSelf.getTableViewModel = function() {
        return tcSelf._awTableViewModel;
    };

    /**
     * Set $scope's multi-select mode and broadcasts an event so that child directives know information about
     * it.
     *
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @param {Boolean} isEnabled - TRUE if the table should allow multiple rows to be selected at one time.
     */
    tcSelf.setGridMultiSelect = function( isEnabled ) {
        if( _currGridMultiSelectEnabled === undefined || _currGridMultiSelectEnabled !== isEnabled ) {
            _currGridMultiSelectEnabled = isEnabled;
            $scope.$broadcast( 'table.multiSelectModeChanged', isEnabled );
        }
    };

    /**
     * Handles table selection
     *
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @param {Event} event - the event object generated by hammer
     * @param {ViewModelObject} selectedObject - selected object
     * @param {UwSelectionModel} selectionModel - the selection model
     * @param {Object} dataCtxNode - The AngularJS scope of this data provider
     * @param {Array} selObjects - selected objects array (this is only used for shift + multiSelect)
     */
    tcSelf.handleSelection = function( event, selectedObject, selectionModel, dataCtxNode, selObjects ) {
        if( !selectionModel.isSelectionEnabled() ) {
            return;
        }

        selectionHelper.handleSelectionEvent( selObjects ? selObjects : [ selectedObject ], selectionModel, event );

        /**
         * Check if there are any rendered rows to handle selection state on.
         */
        var renderedRows = tcSelf._gridWrapper.getRenderedGridRows();

        if( !_.isEmpty( renderedRows ) ) {
            tcSelf._pingRedrawDebounce( tcSelf._gridWrapper.getRenderedGridRows() );
        }
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @return {UwSelectionModel} Associated selection model.
     */
    tcSelf.getSelectionModel = function() {
        return tcSelf._uwDataProvider.selectionModel;
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @return {ViewModelCollection} Associated ViewModelCollection.
     */
    tcSelf.getViewModelCollection = function() {
        return tcSelf._uwDataProvider.viewModelCollection;
    };

    /**
     * Async behavior - invoke the 'dataProvider' which will load an initial page of data to the binding
     * collection and update status.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @return {Promise} Resolved (without any additional response object) once data is loaded. The gridWrapper
     *         will be notified via the eventBus.
     */
    tcSelf.reloadData = function() {
        if( tcSelf._uwDataProvider ) {
            /**
             * delete firstPage results if any before re-initializing dataProvider
             */
            if( tcSelf._uwDataProvider.json.firstPage ) {
                delete tcSelf._uwDataProvider.json.firstPage;
            }

            return tcSelf._uwDataProvider.initialize( $scope );
        }

        return $q.resolve();
    }; // reloadData

    /**
     * Free up all resources held by this object.
     * <P>
     * Note: After this function, no API call should be considered valid. This function is intended to be called
     * when the $scope of any associated viewModel is also being 'destroyed'. After this call (and a GC event),
     * any objects managed by this class may be considered a 'memory leak'.
     *
     * @memberof module:js/aw.table.controller.AwTableController
     */
    tcSelf.destroy = function() {
        if( tcSelf._awTableViewModel ) {
            tcSelf._awTableViewModel.destroy();

            tcSelf._awTableViewModel = null;
        }

        if( tcSelf._gridWrapper ) {
            tcSelf._gridWrapper.destroy();
            tcSelf._gridWrapper = null;
        }

        _.forEach( tcSelf._eventBusSubDefs, function( subDef ) {
            eventBus.unsubscribe( subDef );
        } );

        if( tcSelf._pingPropertyLoadDebounce ) {
            tcSelf._pingPropertyLoadDebounce.cancel();
            tcSelf._pingPropertyLoadDebounce = null;
        }

        if( tcSelf._pingSetScrollDebounce ) {
            tcSelf._pingSetScrollDebounce.cancel();
            tcSelf._pingSetScrollDebounce = null;
        }

        if( tcSelf._pingRedrawDebounce ) {
            tcSelf._pingRedrawDebounce.cancel();
            tcSelf._pingRedrawDebounce = null;
        }

        if( tcSelf._pingFilterChangeDebounce ) {
            tcSelf._pingFilterChangeDebounce.cancel();
            tcSelf._pingFilterChangeDebounce = null;
        }

        if( tcSelf._pingSortChangeDebounce ) {
            tcSelf._pingSortChangeDebounce.cancel();
            tcSelf._pingSortChangeDebounce = null;
        }

        tcSelf._uwDataProvider = null;
        tcSelf._uwPropProvider = null;

        tcSelf._eventBusSubDefs = null;

        tcSelf.cachedVMOs = null;

        tcSelf._declViewModel = null;

        $scope.handleRightClick = null;
        $scope.handlePressAndHold = null;
        $scope.isSelectionEnabled = null;

        tcSelf = null;
    };

    // -----------------------------------------------------------------
    // cbAdapter functions used by xxGridWrapper classes to interOp
    // ----------------------------------------------------------------

    var cbAdapter = tcSelf;

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     */
    cbAdapter.onRegister = function() {
        if( !_.isEmpty( tcSelf.cachedVMOs ) ) {
            tcSelf._gridWrapper.setGridData( tcSelf.cachedVMOs );

            tcSelf.cachedVMOs = null;
        }
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @return {DeclViewModel} The view model used as the basis for this 'AwTableController'.
     */
    cbAdapter.getDeclViewModel = function() {
        return tcSelf._declViewModel;
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @param {ViewModelTreeNode} expandedNode - Node being expanded.
     *
     * @return {Promise} A promise resolved when the expansion is complete and the backing ViewModelCollection
     *         is updated. Resolved object is a reference to the 'ViewModelColection' object managed by the
     *         associated uwDataProvider.
     */
    cbAdapter.rowExpanded = function( expandedNode ) {
        /**
         * Check if we have not previously expanded this node AND
         * <P>
         * It has no children AND
         * <P>
         * We are not currently expanding it.
         */
        if( !expandedNode.isLeaf && _.isEmpty( expandedNode.children ) && !expandedNode._expandRequested ) {
            awTableStateSvc.saveRowExpanded( tcSelf._declViewModel, tcSelf._gridId, expandedNode );

            // expansion triggers a loading event
            appCtxSvc.ctx.state.isLoading = true;

            expandedNode.isExpanded = true;

            expandedNode.loadingStatus = true;
            expandedNode._expandRequested = true;

            /**
             * Request the 'child' nodes to be loaded now.
             */
            return tcSelf._uwDataProvider.expandObject( $scope, expandedNode ).then( function( vmCollection ) {
                if( _debug_logTreeExpandActivity ) {
                    logger.info( 'expandRequestComplete: ' + expandedNode );
                }

                /**
                 * Check if we ended up with no 'child' nodes.
                 * <P>
                 * If so: Then they must be filtered or some other error occurred. Either way, we want to make
                 * sure any properties of the 'parent' get processed (and since no rows were added the
                 * '_pingRedrawDebounce' will not be called.
                 * <P>
                 * Also, since the grid was not modified (and UI not updated), we need to kick off a (soft) redraw
                 * so that any pending incompleteHead/Tail, expand or placeHolder rows are still being considered
                 * after this expand.
                 */
                if( _.isEmpty( expandedNode.children ) ) {
                    tcSelf._pingPropertyLoadDebounce();
                    tcSelf.redrawInPlace( false );
                }

                delete expandedNode.loadingStatus;
                delete expandedNode._expandRequested;

                return $q.resolve( vmCollection );
            }, function( err ) {
                appCtxSvc.ctx.state.isLoading = false;

                delete expandedNode.loadingStatus;
                delete expandedNode._expandRequested;

                return $q.reject( err );
            } );
        }

        delete expandedNode._expandRequested;

        return $q.resolve( [] );
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @param {ViewModelTreeNode} collapsedNode - Node being collapsed
     *
     * @return {Promise} A promise resolved when the collapse is complete and the backing ViewModelCollection is
     *         updated. Resolved object is a reference to the 'ViewModelColection' object managed by the
     *         associated uwDataProvider.
     */
    cbAdapter.rowCollapsed = function( collapsedNode ) {
        /**
         * Remember we are collapsing this node.
         */
        awTableStateSvc.saveRowCollapsed( tcSelf._declViewModel, tcSelf._gridId, collapsedNode );

        delete collapsedNode.isExpanded;

        /**
         * Request the 'child' nodes to be removed from the dataProvider now.
         */
        return tcSelf._uwDataProvider.collapseObject( $scope, collapsedNode );
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @param {String} name -
     * @param {Number} deltaChange -
     */
    cbAdapter.columnSizeChanged = function( name, deltaChange ) {
        tcSelf._awTableViewModel.getColumnProvider().columnSizeChanged( name, deltaChange );
    };

    /**
     * @memberof module:js/aw.table.controller.AwTableController
     *
     * @param {String} name -
     * @param {Number} origPosition -
     * @param {Number} newPosition -
     */
    cbAdapter.columnPositionChanged = function( name, origPosition, newPosition ) {
        tcSelf._awTableViewModel.getColumnProvider().columnOrderChanged( name, origPosition, newPosition );
    };

    /**
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @param {Object} row - row
     * @param {Object} event - event
     */
    cbAdapter.rowSelectionChanged = function( row, event ) {
        if( row.isSelected === row.entity.selected ) {
            // If the row & VMO are in sync, ignore this event.
            return;
        }

        var selectionModel = tcSelf._uwDataProvider.selectionModel;

        if( selectionModel && selectionModel.isSelectionEnabled() ) {
            /**
             * Check if we have a 'left click'
             * <P>
             * AND nothing to unselect (if we're enabling multi select mode)
             * <P>
             * AND If unselecting the row already, there's nothing to do.
             * <P>
             * AND Grid has multiSelect enabled & hasn't already deselected the other row
             * <P>
             * AND Selection model isn't in multiple select mode
             */
            if( event && event.button === 0 && !event.ctrlKey && !event.shiftKey && row.isSelected &&
                row.grid.options.multiSelect && !selectionModel.multiSelectEnabled ) {
                /**
                 * unselect previous selection
                 */
                tcSelf._gridWrapper.unSelectRows( selectionModel );
            }

            tcSelf.handleSelection( event, row.entity, selectionModel, $scope );

            _syncSelectionAndPublish( selectionModel );
        } else {
            row.isSelected = false;
        }
    };

    /**
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @param {UiGridRowArray} gridRows - Array of ui-grid rows that have some change in selection state.
     */
    cbAdapter.rowSelectionChangedBatch = function( gridRows ) {
        var selectionModel = tcSelf._uwDataProvider.selectionModel;

        if( selectionModel && selectionModel.isSelectionEnabled() ) {
            var rowsToAdd = gridRows.filter( function( row ) {
                return row.isSelected;
            } ).map( function( row ) {
                return row.entity;
            } );

            var rowsToRemove = gridRows.filter( function( row ) {
                return !row.isSelected;
            } ).map( function( row ) {
                return row.entity;
            } );

            if( rowsToAdd && !_.isEmpty( rowsToAdd ) ) {
                // add any rows that ui-grid believes should be selected into the selection model
                selectionModel.addToSelection( rowsToAdd );
            }

            if( rowsToRemove && !_.isEmpty( rowsToRemove ) ) {
                // add any rows that ui-grid believes should be selected into the selection model
                selectionModel.removeFromSelection( rowsToRemove );
            }

            // Broadcast multiple selection enablement
            tcSelf.setGridMultiSelect( selectionModel.isMultiSelectionEnabled() );
        }
    };

    /**
     * The below method is used for single and multiple cells selection in matrix and highlighting the
     * corresponding row headers and column headers
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @param {Object} newRowCol - newRowCol
     * @param {Object} oldRowCol - oldRowCol
     * @param {Object} event - Event to publish
     */
    cbAdapter.navigate = function( newRowCol, oldRowCol, event ) {
        // cell Navigation logic for selecting column and row headers based on cell focused
        var gridApi = tcSelf._gridWrapper.getGridApi();

        gridApi.options.enableFullRowSelection = false;
        gridApi.options.enableRowSelection = false;
        // Publish grid cell selection event
        _syncCellSelectionAndPublish( tcSelf._uwDataProvider, newRowCol, oldRowCol, gridApi, event );
    };

    /**
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @param {ui-grid} grid -
     * @param {ColumnArray} sortColumns -
     */
    cbAdapter.sortChanged = function( grid, sortColumns ) {
        tcSelf._pingSortChangeDebounce( sortColumns );
    };

    /**
     * @memberOf module:js/aw.table.controller.AwTableController
     */
    cbAdapter.filterChanged = function() {
        tcSelf._pingFilterChangeDebounce( this.grid );
    };

    /**
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @param {UiGridScrollEvent} scrollEvent -
     */
    cbAdapter.scrollEnd = function( scrollEvent ) {
        // set class for drop shadow based on scroll state
        if( scrollEvent.newScrollTop ) {
            scrollEvent.grid.element.addClass( 'aw-table-scrolled' );
        } else {
            scrollEvent.grid.element.removeClass( 'aw-table-scrolled' );
        }

        /**
         * Check if ui-grid has generated a 'container' of rendered rows.
         * <P>
         * If so: Determine the top row currently rendered
         */
        var renderedRows = scrollEvent.grid.renderContainers.body.renderedRows;

        /**
         * Expand any visible rows that need expanding.
         * LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis is bad - Framework Fixes
         * only do this logic for vertical scroll
         */
        if( !_.isEmpty( renderedRows ) && scrollEvent.y ) {
            tcSelf._pingScrollEndDebounce( scrollEvent, renderedRows );
            tcSelf._pingRedrawDebounce( renderedRows );
        }
    };

    /**
     * Note: This is a slightly modified version of this same function in ui-grid. The ui-grid version is
     * replaced by this on during the 'on register' phase of ui-grid initialization. This function is called
     * frequently by ui-grid. It is also called when the actual 'rendered' rows and columns in their
     * 'containers' are decided/changed. It is after this we want to check if any rendered rows need to be
     * expanded or props loaded.
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     *
     * @param {Boolean} rowsAdded - TRUE if row have just been added
     */
    cbAdapter.redrawInPlace = function( rowsAdded ) {
        if( tcSelf._gridWrapper ) {
            var renderContainers = tcSelf._gridWrapper.getRenderContainers();

            for( var i in renderContainers ) {
                var container = renderContainers[ i ];

                if( rowsAdded ) {
                    container.adjustRows( container.prevScrollTop, null );
                    container.adjustColumns( container.prevScrollLeft, null );
                } else {
                    if( container.prevScrolltopPercentage ) {
                        container.adjustRows( null, container.prevScrolltopPercentage );
                    } else {
                        container.adjustRows( null, 0 );
                    }
                    container.adjustColumns( null, container.prevScrollleftPercentage );
                }
            }

            tcSelf._pingRedrawDebounce( renderContainers.body.renderedRows );
        } else {
            logger.error( 'redrawInPlace: ' + 'Invalid AwTableController' );
        }
    };

    /**
     * Note: This is a modified version of this same function in ui-grid. The ui-grid version is replaced by
     * this on during the 'on register' phase of ui-grid initialization. This function is called frequently by
     * ui-grid. The original casued and extra $digest cycle (via $timeout) that was not necessary for aw
     * purposes since so many $digests 'naturally occur'.
     * <P>
     * Even though the original returned a 'refreshCanceller', it weas never used in the rest of the ui-grid
     * code.
     *
     * LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis is bad - Framework Fixes
     * The approach for no digest is good but async here is still needed. we can try $timeout(func, 0, false);
     * Or just use debounce
     *
     * @memberOf module:js/aw.table.controller.AwTableController
     */
    cbAdapter.queueRefresh = function() {
        if( tcSelf._gridWrapper ) {
            // <pre>
            // For reference, Original ui - grid code is commented out
            //
            // var self = this;
            //
            // if( self.refreshCanceller ) {
            //     $timeout.cancel( self.refreshCanceller );
            // }
            //
            // self.refreshCanceller = $timeout( function() {
            // self.refreshCanvas( true );
            // </pre>

            tcSelf._queueRefreshDebounce();

            // <pre>
            // });
            //
            // self.refreshCanceller.then(function (){
            //    self.refreshCanceller = null;
            // }).catch(angular.noop);
            //
            // return self.refreshCanceller;
            // </pre>
        } else {
            logger.error( 'queueRefresh: ' + 'Invalid AwTableController' );
        }
    };

    cbAdapter._queueRefreshDebounce = _.debounce( function() {
        if( tcSelf._gridWrapper ) {
            tcSelf._gridWrapper._grid.refreshCanvas( true );
        }
    }, browserUtils.isIE ? 150 : 0 );

    // ---------------------------------------------------------
    // Constructor initialization
    // ---------------------------------------------------------

    /**
     * Cache the VMOs that come in while we're attempting to get the configuration information for the grid.
     */
    var declGrid = null;

    if( tcSelf._declViewModel ) {
        /**
         * Create a AwTableViewModel based on the 'declViewModel' properties
         */
        tcSelf._awTableViewModel = awTableSvc.createViewModel( tcSelf._declViewModel, tcSelf._gridId, $scope );

        tcSelf._uwDataProvider = tcSelf._awTableViewModel.getDataProvider();
        tcSelf._uwPropProvider = tcSelf._awTableViewModel.getPropertyProvider();

        declGrid = tcSelf._declViewModel._internal.grids[ tcSelf._gridId ];
    }

    if( tcSelf._uwDataProvider ) {
        _setUpDataProvider( declGrid );

        // listen for dataProvider switch event
        tcSelf._eventBusSubDefs.push( eventBus.subscribe( tcSelf._gridId + '.switchDataProvider', function( newName ) {
            tcSelf.getDeclViewModel().grids[ tcSelf._gridId ].dataProvider = newName;

            // clear current dp's vmc
            tcSelf._uwDataProvider.getViewModelCollection().clear();

            // set new dp, set it up, and reload data
            tcSelf._uwDataProvider = tcSelf.getDeclViewModel().dataProviders[ newName ];

            _setUpDataProvider();

            tcSelf.reloadData();
        } ) );
    }

    // --------------------------------------------------------------------
    // Define functions used by the cell templates
    // --------------------------------------------------------------------

    /**
     * Sets up multi selection
     *
     * @param {Event} event - the event object generated by hammer
     */
    function triggerMultiSelection( event ) {
        var rowScope = tcSelf._gridWrapper.findCellRowElement( $( event.target ) ).scope();

        if( !rowScope || !rowScope.row ) {
            return;
        }

        var selectionModel = tcSelf._uwDataProvider.selectionModel;

        if( !selectionModel.isSelected( rowScope.row.entity ) ) {
            selectionHelper.handleSelectionEvent( [ rowScope.row.entity ], selectionModel, event );
        }

        _syncSelectionAndPublish( selectionModel );
    }
    /**
     * Handles right click event
     *
     * @param {Event} event - the event object
     */
    $scope.handleRightClick = function( event ) {
        // to stop it firing due to hold and press touch event
        if( !event.target || event.which !== 3 ) {
            return;
        }

        triggerMultiSelection( event );
        if( panelElement.find( 'aw-popup-command-bar' ).length > 0 ) {
            var ele = panelElement.find( 'aw-popup-command-bar' );
            var scope = ngUtils.getElementScope( ele, true );
            scope.showPopup( event );
        }
    };

    /**
     * Handles (long press/press and hold) event
     *
     * @param {Event} hammerEvent - the event object of hammer
     */
    $scope.handlePressAndHold = function( hammerEvent ) {
        var event = hammerEvent.srcEvent || hammerEvent;
        if( !event.target ) {
            return;
        }

        var rowElement = tcSelf._gridWrapper.findCellRowElement( $( event.target ) );

        var rowScope = rowElement.scope();

        if( !rowScope || !rowScope.row ) {
            return;
        }

        var selectionModel = tcSelf._uwDataProvider.selectionModel;

        if( selectionModel.isSelectionEnabled() ) {
            var dragging = panelElement.data( 'dragging' );

            if( !dragging ) {
                selectionModel.setMultiSelectionEnabled( true );

                // Broadcast multiple selection enablement
                tcSelf.setGridMultiSelect( selectionModel.multiSelectEnabled );

                rowScope.row.setSelected( true );

                tcSelf.handleSelection( event, rowScope.row.entity, selectionModel, $scope );
            }
        }
    };

    $scope.isSelectionEnabled = function() {
        var selectionModel = tcSelf._uwDataProvider.selectionModel;
        if( selectionModel ) {
            return selectionModel.isSelectionEnabled();
        }
    };
} // AwTableController

/**
 * Defines the controller used with 'aw-table' directive. It is based on the API defined in 'AwTableController'.
 *
 * @member awTableController
 * @memberof NgControllers
 */

app.controller( 'awTableController', [
    '$scope',
    '$q',
    '$injector',
    '$element',
    '$ocLazyLoad',
    'appCtxService',
    'dragAndDropService',
    'viewModelService',
    'selectionHelper',
    'awTableService',
    'awTableStateService',
    'uiGridService',
    'uwPropertyService',
    'actionService',
    'editHandlerService',
    'localeService',
    'contextMenuService',
    'popupService',
    function( $scope, $q, $injector, $element, $ocLazyLoad, appCtxSvc, dragAndDropSvc, viewModelSvc,
        selectionHelper, awTableSvc, awTableStateSvc, uiGridSvc, uwPropertySvc, actionSvc, editHandlerSvc,
        localeSvc, cnxtMenuSvc, popupSvc ) {
        assert( $scope.gridid, 'No grid ID specified for the awTableController' );

        /**
         * {SubscriptionDefinitionArray}
         */
        var _eventBusSubDefs = [];

        /**
         * {String} UID of the most resent selection.
         */
        var _previousSelection;

        /**
         * Check if we have either an 'id' AND a 'declViewModel' OR we have a 'viewmodel' to base the grid
         * controller upon.
         */
        var gridid = $scope.gridid;

        var declViewModel = viewModelSvc.getViewModel( $scope, true );

        /**
         * Convert to gridWrapper options
         * <P>
         * Note: The AwTableViewModel is the overall view model for all UI aspects of the grid directive.
         */
        if( !declViewModel._internal.grids[ gridid ] ) {
            logger.error( 'Grid ' + gridid + ' does not exist.' );

            return null;
        }

        $scope.isEditing = false;
        $scope.isDragEnabled = true;
        $scope.enableSelection = true;

        var awTableController = new AwTableController( $scope, $q, $injector, $ocLazyLoad, appCtxSvc,
            selectionHelper, actionSvc, awTableSvc, awTableStateSvc, declViewModel, gridid, $element,
            editHandlerSvc, cnxtMenuSvc, localeSvc, popupSvc );

        /**
         * Construct a wrapper specific to the 3rd-party grid being used
         */
        var tableViewModel = awTableController.getTableViewModel();

        awTableController._gridWrapper = uiGridSvc.createGridWrapper( $scope, tableViewModel,
            awTableController );

        /**
         * Grid wrapper options needs to be published to the controller's scope
         */
        $scope.gridOptions = awTableController._gridWrapper.getOptions();

        var dataProviderName = awTableController._uwDataProvider.name;

        // Set initial decorator state.
        awTableController._uwDataProvider.showDecorators = appCtxSvc.ctx.decoratorToggle;

        /**
         * Add eventBus listeners for various events (selection, editHandler arrange panel state changes, etc.)
         * that are keyed to the specific declDataProvider associated with the awTableController.
         */
        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.isSelectionEnabledChanged',
            function( context ) {
                $scope.isDragEnabled = context.isSelectionEnabled;
                $scope.enableSelection = context.isSelectionEnabled;

                awTableController._gridWrapper.setSelectionEnabled( context.isSelectionEnabled );
            }, 'aw.table.controller' ) );

        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.selectAll', function() {
            awTableController._gridWrapper.getOptions().enableSelectAll = true;
            awTableController._gridWrapper.selectAll();
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( 'LayoutChangeEvent', function( data ) {
            if( data && data.rowHeight ) {
                var rowHeight = data.rowHeight;
                awTableController._gridWrapper.getOptions().rowHeight = rowHeight;
                var gridApi = awTableController._gridWrapper.getGridApi();
                for( var i = 0; i < gridApi.rows.length; i++ ) {
                    gridApi.rows[ i ].$$height = rowHeight;
                }
                gridApi.updateCanvasHeight();
                gridApi.api.grid.queueGridRefresh();
            }
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.selectNone', function() {
            awTableController._gridWrapper.getOptions().enableSelectAll = false;
            awTableController._gridWrapper.selectNone();
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.selectionChangeEvent', function() {
            /**
             * Check if there are any rendered row to update selection on.
             */
            var renderedRows = awTableController._gridWrapper.getRenderedGridRows();

            if( !_.isEmpty( renderedRows ) ) {
                awTableController._pingRedrawDebounce( renderedRows );
            }
        } ) );

        /**
         * Add eventBus listeners for various events (edit, state changes, etc.) etc.) that are NOT keyed to the
         * specific declDataProvider associated with the awTableController.
         */
        _eventBusSubDefs.push( eventBus.subscribe( 'editHandlerStateChange', function( event ) {
            if( event.dataProvider && event.dataProvider.name === dataProviderName ) {
                $scope.isEditing = event.state === 'starting';
            }
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( 'primaryWorkarea.reloadTop', function( event ) {
            var clearAllStates = !( event && event.retainAllStates );

            if( clearAllStates ) {
                awTableStateSvc
                    .clearAllStates( awTableController._declViewModel, awTableController._gridId );
            }

            awTableController.reloadData();
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.reset', function() {
            if( awTableController._uwDataProvider.accessMode !== 'tree' ) {
                awTableController.reloadData();
            }
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.resetState', function() {
            awTableStateSvc.clearAllStates( awTableController._declViewModel, awTableController._gridId );
            awTableController._uwDataProvider.isFocusedLoad = true;
        } ) );

        _eventBusSubDefs.push( eventBus.subscribe( dataProviderName + '.saveRowExpanded', function(
            expandedNode ) {
            if( expandedNode.isExpanded ) {
                awTableStateSvc.saveRowExpanded( awTableController._declViewModel,
                    awTableController._gridId, expandedNode );
            }
        } ) );

        /**
         * Setup to react to changes in selection within the dataProvider.
         *
         * @param {Object} event - Angular $scope event.
         * @param {Object} data - Data associated with the event.
         */
        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            var selection = data.selectionModel.getSelection();

            /**
             * Check if we have axactly 1 thing selected and different than previously selected.
             * <P>
             * If so: Scroll to that selection.
             */
            if( selection.length === 1 && selection[ 0 ] !== _previousSelection ) {
                _previousSelection = selection[ 0 ];

                awTableController._gridWrapper.scrollToRow(
                    awTableController._uwDataProvider.viewModelCollection, _previousSelection );
            } else if( selection.length === 0 ) {
                /**
                 * If nothing is selected, then there is nothing 'previous' any more.
                 * <P>
                 * Fix for LCS-150929 - (Grid) ACE - In context search do not focus selected node in Tree view
                 */
                _previousSelection = null;
            }
        } );

        /**
         * Setup to react to request for node expansions.
         *
         * @param {Object} event -
         * @param {Object} data -
         */
        $scope.$on( 'expandTreeNode', function( event, data ) {
            var vmCollection = awTableController.getViewModelCollection();

            var rowNdx = vmCollection.findViewModelObjectById( data.parentNodeUid );

            if( rowNdx !== -1 ) {
                var parentNode = vmCollection.getViewModelObject( rowNdx );

                awTableController._gridWrapper.expandRow( parentNode );
            }
        } );

        /**
         * Setup to remove the above event subscription when the $scope is later destroyed.
         */
        $scope.$on( '$destroy', function() {
            _.forEach( _eventBusSubDefs, function( subDef ) {
                eventBus.unsubscribe( subDef );
            } );

            _eventBusSubDefs = null;

            if( awTableController.selectionEnabledSubDef ) {
                eventBus.unsubscribe( awTableController.selectionEnabledSubDef );

                awTableController.selectionEnabledSubDef = null;
            }

            if( awTableController ) {
                awTableController.destroy();
                awTableController = null;
            }

            $scope.gridOptions = null; // Note: We did not create this object, so it's not ours to destroy
            $scope.grid = null;
            $scope.data = null;
            $scope.ctx = null;
            $scope.i18n = null;
            $scope.dataprovider = null;
        } );

        // update v-m values based on a fill event data has propName, endTarget, source, and direction
        $scope.$on( 'awFill.completeEvent', function( event, data ) {
            // get the VMOs from the table
            var VMOs = awTableController._gridWrapper.getOptions().data;

            var targetProp;

            var $source = VMOs.filter( function( vmo ) {
                return vmo.uid === data.source;
            } );

            var sourceProp = $source[ 0 ].props[ data.propName ];

            var foundLastTarget = false;

            // start with the target furthest from the source and work back
            var inx;

            if( data.direction === 'up' ) {
                for( inx = 0; inx < VMOs.length; inx++ ) {
                    if( !foundLastTarget && VMOs[ inx ].uid === data.endTarget ) {
                        foundLastTarget = true;
                    }

                    if( foundLastTarget ) {
                        if( VMOs[ inx ].uid === data.source ) {
                            // reached source, we are done
                            break;
                        }

                        // update the target using the source
                        targetProp = VMOs[ inx ].props[ data.propName ];

                        targetProp.uiValue = sourceProp.uiValue;
                        targetProp.dbValue = sourceProp.dbValue;
                        targetProp.valueUpdated = true;
                        uwPropertySvc.updateViewModelProperty( targetProp );
                    }
                }
            } else {
                // direction is down; start from bottom and work up
                for( inx = VMOs.length - 1; inx >= 0; inx-- ) {
                    if( !foundLastTarget && VMOs[ inx ].uid === data.endTarget ) {
                        foundLastTarget = true;
                    }

                    if( foundLastTarget ) {
                        if( VMOs[ inx ].uid === data.source ) {
                            // reached source, we are done
                            break;
                        }

                        // update the target using the source
                        targetProp = VMOs[ inx ].props[ data.propName ];

                        targetProp.uiValue = sourceProp.uiValue;
                        targetProp.dbValue = sourceProp.dbValue;
                        targetProp.valueUpdated = true;
                        uwPropertySvc.updateViewModelProperty( targetProp );
                    }
                }
            }
        } );

        $scope.$watch( function _watchDecoratorToggle() {
            return appCtxSvc.ctx.decoratorToggle;
        }, function( newVal, oldVal ) {
            if( newVal !== oldVal ) {
                eventBus.publish( $scope.dataprovider.name + '.toggleCellDecorators', {
                    toggleState: newVal
                } );
            }
        } );

        $scope.setupDragAndDrop = function( elem ) {
            var callbackAPIs = {
                /**
                 * Use the given DOM Element to find the ViewModelObject(s) associated with that element.
                 *
                 * @param {Element} element - The 'source' or 'target' DOM element to query.
                 *
                 * @param {boolean} isTarget - TRUE if the given element is a 'target' and so only a single
                 *            ViewModelObject is expected. FALSE if the given element is a 'source' and so
                 *            multiple ViewModelObjects are possible (e.g. all currently selected objects in the
                 *            collection).
                 *
                 * @return {ViewModelObjectArray} The ViewModelObject(s) associated with the given DOM Element
                 *         (or NULL if none can be determined).
                 */
                getElementViewModelObjectFn: function( element, isTarget ) {
                    /**
                     * Merge event 'target' with any other objects currently selected.
                     */
                    var targetObjs = [];
                    var jqElement = $( element );

                    var jqRowElement = awTableController._gridWrapper.findCellRowElement( jqElement );

                    if( jqRowElement && jqRowElement.length > 0 ) {
                        var elemScope = ngModule.element( jqRowElement ).scope();

                        if( elemScope && elemScope.row && elemScope.row.entity ) {
                            var targetUid = '';

                            if( elemScope.row.entity ) {
                                targetObjs.push( elemScope.row.entity );
                                targetUid = elemScope.row.entity.uid;
                            }

                            if( !isTarget ) {
                                var sourceObjects = dragAndDropSvc.getSourceObjects(
                                    awTableController._uwDataProvider, targetUid ).filter( function( obj ) {
                                    return targetObjs.indexOf( obj ) === -1;
                                } );
                                targetObjs = targetObjs.concat( sourceObjects );
                            }

                            return targetObjs;
                        }
                    } else {
                        elemScope = ngModule.element( jqElement ).scope();
                        var objUid = parsingUtils.parentGet( elemScope, 'data.uid' );
                        if( objUid ) {
                            targetObjs.push( dragAndDropSvc.getTargetObjectByUid( objUid ) );
                        }
                        return targetObjs;
                    }

                    return null;
                },
                /**
                 * @param {ViewModelObject} targetVMO -
                 */
                clearSelectionFn: function( targetVMO ) { // eslint-disable-line
                    // Handle clear previous selection
                    awTableController._uwDataProvider.selectNone();
                },
                /**
                 *
                 * @param {DOMElement} targetElement -
                 * @param {ViewModelObject} targetVMO -
                 */
                selectResultFn: function( targetElement, targetVMO ) {
                    /**
                     * Setup to listen when the 'drop' is complete
                     */
                    if( !awTableController.selectionEnabledSubDef ) {
                        awTableController.selectionEnabledSubDef = eventBus.subscribe( 'cdm.relatedModified',
                            function() {
                                /**
                                 * Stop listening
                                 */
                                if( awTableController.selectionEnabledSubDef ) {
                                    eventBus.unsubscribe( awTableController.selectionEnabledSubDef );

                                    awTableController.selectionEnabledSubDef = null;
                                }

                                var jqRowElement = awTableController._gridWrapper
                                    .findCellRowElement( $( targetElement ) );

                                if( jqRowElement && jqRowElement.length > 0 ) {
                                    var elemScope = ngModule.element( jqRowElement ).scope();

                                    elemScope.row.isSelected = true;

                                    var selectionModel = awTableController.getSelectionModel();

                                    awTableController.handleSelection( null, targetVMO, selectionModel, $scope,
                                        null );
                                }
                            } );
                    }
                }
            };

            /**
             * Hook-up this aw-table to participate in drag-n-drop UI.
             */
            dragAndDropSvc.setupDragAndDrop( elem[ 0 ], callbackAPIs );
        };

        var clearDataProviderWatch = $scope.$watch( $scope.dataProvider, function() {
            /**
             * Hook-up this aw-table to participate in drag-n-drop UI.
             */
            $scope.setupDragAndDrop( $element );
            clearDataProviderWatch();
        } );

        /**
        * Merge all of the text bundle's properties to the default text bundle used for the UI managed by
        * this service.
        */
        localeSvc.getLocalizedTextFromKey( 'treeTableMessages.TwistieTooltipCollapsed' ).then( result => _.assign( _defaultTextBundle.TwistieTooltipCollapsed, result ) );
        localeSvc.getLocalizedTextFromKey( 'treeTableMessages.TwistieTooltipExpanded' ).then( result => _.assign( _defaultTextBundle.TwistieTooltipExpanded, result ) );

        return awTableController;
    }
] );
