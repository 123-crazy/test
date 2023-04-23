// Copyright (c) 2020 Siemens

/**
 * @module js/aw-splm-table.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import logger from 'js/logger';
import arrayUtils from 'js/arrayUtils';
import 'js/splmTableFactory';
import 'js/appCtxService';
import 'js/awTableService';
import 'js/viewModelService';
import 'js/awColumnService';
import 'js/splmTableAutoResizeService';
import 'js/awColumnFilterService';
import uwUtilSvc from 'js/uwUtilService';
import viewModelObjectService from 'js/viewModelObjectService';

/**
 * This directive is the root of a simple but fast table implementation
 *
 * @example <aw-splm-table gridid="declGridId" ></aw-splm-table>
 *
 * @member aw-splm-table
 * @memberof NgElementDirectives
 */
app.directive( 'awSplmTable', [
    'splmTableFactory',
    'appCtxService',
    'viewModelService',
    'awTableService',
    'awColumnService',
    'splmTableAutoResizeService',
    'awColumnFilterService',
    'configurationService',
    function( splmTableFactory, appCtxService, viewModelSvc, awTableSvc, awColumnSvc, splmTableAutoResizeService, columnFilterService, cfgSvc ) {
        return {
            restrict: 'E',
            scope: {
                gridid: '@',
                useTree: '<?',
                contentFilter: '=?',
                containerHeight: '<?',
                showContextMenu: '<?',
                showDecorators: '<?',
                showCheckBox: '='
            },
            transclude: false,
            replace: false,
            link: function( $scope, element ) {
                $scope.ctx = appCtxService.ctx;

                var instanceEventSubcr = [];
                var tableInstance = null;
                let tableElem = null;
                var _previousSelections = [];
                let dataProvider = null;

                /**
                 * Refresh the table content by invoking the action to reload first page of data provider
                 */
                var reloadDataProvider = function() {
                    if( $scope.gridid ) {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        var declGrid = declViewModel.grids[ $scope.gridid ];
                        /**
                         * Delete firstPage results only on dataProvider reset
                         */
                        if( $scope.dataprovider && $scope.dataprovider.json && $scope.dataprovider.json.firstPage ) {
                            delete $scope.dataprovider.json.firstPage;
                        }
                        return viewModelSvc.executeCommand( declViewModel, declGrid.dataProvider, $scope );
                    }
                };

                if( $scope.gridid ) {
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    var declGrid = declViewModel.grids[ $scope.gridid ];

                    if( declGrid && declGrid.dataProvider ) {
                        dataProvider = declViewModel.dataProviders[ declGrid.dataProvider ];
                        var propertyProvider = declViewModel.dataProviders[ declGrid.propertyProvider ];
                        var columnProvider = awColumnSvc.createColumnProvider( declViewModel, $scope,
                            dataProvider.commands, $scope.gridid, dataProvider.json.commandsAnchor );

                        $scope.dataprovider = dataProvider;
                        if( !columnProvider.sortCallback ) {
                            columnProvider.sortCallback = function() {
                                reloadDataProvider().then( function() {
                                    if( tableElem._tableInstance.focusHeader && tableElem ) {
                                        let headerDefs = tableElem.getElementsByClassName( _t.Const.CLASS_COLUMN_DEF );
                                        let headerDef = _.filter( headerDefs, { columnDef: { propertyName: tableElem._tableInstance.focusHeader } } )[ 0 ];
                                        headerDef && headerDef.parentElement.focus();
                                        delete tableElem._tableInstance.focusHeader;
                                    }
                                } );
                            };
                        }

                        // Attach enableArrangeMenu to gridOptions because we are not passing grid into splmTable
                        declGrid.gridOptions = declGrid.gridOptions || {};
                        declGrid.gridOptions.enableArrangeMenu = declGrid.enableArrangeMenu;
                        declGrid.gridOptions.showContextMenu = $scope.showContextMenu;
                        declGrid.gridOptions.showDecorators = $scope.showDecorators;
                        declGrid.gridOptions.useTree = $scope.useTree;
                        declGrid.gridOptions.showCheckBox = $scope.showCheckBox;

                        // Turn on grid menu if arrange command is enabled, only if not set by grid
                        if( declGrid.gridOptions.enableGridMenu === undefined && declGrid.gridOptions.enableArrangeMenu ) {
                            declGrid.gridOptions.enableGridMenu = true;
                        }

                        // Turn on XXLARGE header height if enableHeaderIcon is enabled
                        if( declGrid.gridOptions.enableHeaderIcon === true ) {
                            declGrid.gridOptions.headerHeight = 'XXLARGE';
                        }

                        var _loadTreeProperties = function( propertyLoadRequest ) {
                            var propertyLoadInput = awTableSvc.createPropertyLoadInput( [ propertyLoadRequest ] );
                            return propertyProvider.getProperties( $scope, propertyLoadInput ).then( function( propertyLoadResult ) {
                                if( dataProvider.topNodeUid ) {
                                    _.forEach( propertyLoadResult.updatedNodes, function( vmo ) {
                                        if( vmo.uid === dataProvider.topNodeUid ) {
                                            // Assign on props doesn't work if it's undefined, doing this for now to make it work.
                                            if( dataProvider.topTreeNode.props === undefined ) {
                                                dataProvider.topTreeNode.props = {};
                                            }

                                            _.assign( dataProvider.topTreeNode.props, vmo.props );
                                        }
                                        // Reset edit state since props have loaded
                                        viewModelObjectService.setEditState( vmo, false );
                                        delete vmo.isPropLoading;
                                    } );
                                }

                                if( !propertyLoadResult.columnConfig ) {
                                    // Notify table to refresh if no columnConfig change to reflect new prop values in vmos
                                    tableInstance.refresh();
                                } else if( !_.isEqual( propertyLoadResult.columnConfig.columns, dataProvider.columnConfig.columns ) ) {
                                    // LCS-178290 - Redundant refresh in page load
                                    // Do column Refresh only in the case we have new columnConfig from server
                                    columnProvider.buildDynamicColumns( propertyLoadResult.columnConfig.columns, true );
                                }

                                if( _t.util.shouldRequestStartEditPropsLoaded( tableElem ) ) {
                                    _t.util.requestStartEdit( tableElem );
                                }
                            } );
                        };

                        var _loadProps = _.debounce( function( emptyVMOs ) {
                            /**
                             * Since debounced functions have a slight chance of being fired off after a maxWait and after the
                             * declViewModel has been destroyed (and before the debounce 'cancel' function is called), we want to
                             * check for that case here.
                             */

                            if( declViewModel.isDestroyed() ) {
                                return;
                            }

                            /**
                             * Include 'top' node if it does not have 'props' set yet.
                             */
                            if( !dataProvider.topTreeNode.props ) {
                                var topNodeUid = dataProvider.topTreeNode.uid;

                                var foundTop = false;

                                for( var i = 0; i < emptyVMOs.length; i++ ) {
                                    if( emptyVMOs[ i ].uid === topNodeUid ) {
                                        foundTop = true;
                                        break;
                                    }
                                }

                                if( !foundTop ) {
                                    emptyVMOs.push( dataProvider.topTreeNode );
                                }
                            }

                            // Return if there are no props to load
                            if( emptyVMOs.length === 0 ) {
                                return;
                            }

                            var columnInfos = [];

                            _.forEach( dataProvider.cols, function( columnInfo ) {
                                if( !columnInfo.isTreeNavigation ) {
                                    columnInfos.push( columnInfo );
                                }
                            } );

                            _.forEach( emptyVMOs, function( vmo ) {
                                vmo.isPropLoading = true;
                            } );

                            var propertyLoadRequest = {
                                parentNode: null,
                                childNodes: emptyVMOs,
                                columnInfos: columnInfos
                            };

                            _loadTreeProperties( propertyLoadRequest );
                        }, 500, {
                            maxWait: 10000,
                            trailing: true,
                            leading: false
                        } );

                        var initializeProvider = function( dataProvider, columnProvider ) {
                            return columnProvider.initialize().then( function() {
                                /**
                                 * Dont re-initialize DP if it already exists => Doesn't matter if empty table or table with rows
                                 */
                                if( dataProvider.json && dataProvider.json.firstPage ) {
                                    // If first page but no data loaded in loadedVMObjects, try viewModelSvc executing the dataprovider
                                    if( dataProvider.json.firstPage.length > 0 && dataProvider.viewModelCollection &&
                                        dataProvider.viewModelCollection.loadedVMObjects && dataProvider.viewModelCollection.loadedVMObjects.length === 0 ) {
                                        viewModelSvc.executeCommand( declViewModel, declGrid.dataProvider, $scope );
                                    }
                                    // Do Nothing
                                    return null;
                                }
                                return dataProvider.initialize( $scope ).then( function() {
                                    if( !dataProvider.cols || dataProvider.cols.length === 0 ) {
                                        return columnProvider.buildDynamicColumns( dataProvider.columnConfig.columns, true );
                                    }
                                    return null;
                                } );
                            } );
                        };

                        if( declGrid.gridOptions.useTree === true ) {
                            instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.loadProps', function( eventData ) {
                                _loadProps( eventData.VMOs );
                            } ) );

                            instanceEventSubcr.push( eventBus.subscribe( 'primaryWorkarea.reloadTop', function( event ) {
                                var clearAllStates = !( event && event.retainAllStates );

                                if( clearAllStates ) {
                                    _t.util.performStateServiceAction( 'clearAllStates', declViewModel, $scope.gridid );
                                }

                                /*
                                 * delete firstPage results if any before re-initializing dataProvider
                                 */
                                if( dataProvider.json.firstPage ) {
                                    delete dataProvider.json.firstPage;
                                }

                                dataProvider.initialize( $scope );
                            } ) );

                            instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.toggleTreeNode', function( node ) {
                                if( !node.loadingStatus ) {
                                    node.loadingStatus = true;
                                    tableInstance.updateTreeCellIcon( node );
                                    if( document.activeElement && document.activeElement.classList.contains( _t.Const.CLASS_WIDGET_TREE_NODE_TOGGLE_CMD ) ) {
                                        tableElem._tableInstance.focusTreeNodeExpandAfterRender = node;
                                    }
                                    var preExpandVMObjectsLength = dataProvider.viewModelCollection.loadedVMObjects.length;
                                    if( node.isExpanded === true ) {
                                        tableInstance.setNodeExpansionInProgress( true );
                                        node._expandRequested = true;
                                        dataProvider.expandObject( $scope, node ).then( async function( updatedViewModelCollection ) {
                                            // LCS-180794: If Expand did not return any new objects, continue updating the rest of the table
                                            tableInstance.setNodeExpansionInProgress( false );
                                            if( preExpandVMObjectsLength === updatedViewModelCollection.loadedVMObjects.length ) {
                                                delete node.loadingStatus;
                                                await tableInstance.refresh();
                                            }
                                        } ).finally( function() {
                                            // Make sure even when errored that the expansion in progress is set to false
                                            tableInstance.setNodeExpansionInProgress( false );
                                            delete node.loadingStatus;
                                            delete node._expandRequested;
                                            tableInstance.updateTreeCellIcon( node );
                                            if( _t.util.shouldRequestStartEditTreeExpand( tableElem, node, propertyProvider ) ) {
                                                _t.util.requestStartEdit( tableElem );
                                            }
                                        } );
                                        _t.util.performStateServiceAction( 'saveRowExpanded', declViewModel, $scope.gridid, node );
                                    } else {
                                        dataProvider.collapseObject( $scope, node ).then( async function( updatedViewModelCollection ) {
                                            if( preExpandVMObjectsLength === updatedViewModelCollection.loadedVMObjects.length ) {
                                                delete node.loadingStatus;
                                                await tableInstance.refresh();
                                            }
                                        } ).finally( function() {
                                            delete node.loadingStatus;
                                            tableInstance.updateTreeCellIcon( node );
                                        } );
                                        _t.util.performStateServiceAction( 'saveRowCollapsed', declViewModel, $scope.gridid, node );
                                    }
                                }
                            } ) );

                            instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.saveRowExpanded', function( expandedNode ) {
                                if( expandedNode.isExpanded === true ) {
                                    _t.util.performStateServiceAction( 'saveRowExpanded', declViewModel, $scope.gridid, expandedNode );
                                }
                            } ) );

                            instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.doFocusPlaceHolder', function( eventData ) {
                                var vmNode = eventData.vmo;
                                var uwDataProvider = dataProvider;

                                var vmCollection = dataProvider.viewModelCollection;

                                var cursorNdx = vmCollection.findViewModelObjectById( uwUtilSvc.getEvaluatedId( vmNode ) );

                                /**
                                 * Find 'parent' node of the 'placeholder' node in the vmCollection
                                 */
                                var phParentNode = null;

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

                                if( phParentNode === null ) {
                                    return null;
                                }

                                /**
                                 * Load, using the 'focusAction', the siblings of the 'placeholder' in the context of its immediate
                                 * 'parent'.
                                 * <P>
                                 * Note: We want to use a smaller page size here to minimize the loading.
                                 */
                                var treeLoadInput = awTableSvc.createTreeLoadInput( phParentNode, 0, null, vmNode.id, uwDataProvider.treePageSize, true, null );
                                var loadIDs = {
                                    t_uid: uwDataProvider.topTreeNode.uid,
                                    o_uid: phParentNode.uid,
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
                                    var cursorId = uwUtilSvc.getEvaluatedId( cursorNode );
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

                                    var cursorNdxInNew = 0;

                                    for( var i = 0; i < newVMObjects.length; i++ ) {
                                        // comparing the evaluated id instead of id
                                        if( uwUtilSvc.getEvaluatedId( newVMObjects[ i ] ) === cursorId ) {
                                            cursorNdxInNew = i;
                                            break;
                                        }
                                    }

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

                                    // LCS-230184 - In the case where no changes are made to the loadedVMObjects, we must manually refresh
                                    // so that the table can process the remaining rendered nodes for more focus placeholder, expansion
                                    // restoration, or prop loading.
                                    if( newVMObjects.length === 0 ) {
                                        delete vmNode.loadingStatus;
                                        delete vmNode._focusRequested;
                                        tableInstance.refresh();
                                        return;
                                    }

                                    var insertNdx = cursorNdxInNew - 1;

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

                                    delete vmNode._focusRequested;

                                    // Ensure we are scrolled back to selected item after focus place holder occurs
                                    eventBus.publish( 'plTable.scrollToRow', {
                                        gridId: $scope.gridid,
                                        rowUids: dataProvider.selectionModel.getSelection()
                                    } );
                                } );
                            } ) );
                        } else {
                            instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.modelObjectsUpdated', function( event ) {
                                if( event.arrangeType && event.arrangeType === 'saveColumnAndLoadAction' && event.viewModelObjects ) {
                                    // Just update data provider with vmos changed by columnArrangeService
                                    eventBus.publish( dataProvider.name + '.resetScroll' );
                                    dataProvider.update( event.viewModelObjects, event.totalFound );
                                }
                            } ) );
                        }

                        /**
                         * Subscribe to resetState. Clear all states and set isFocusedLoad to true.
                         */
                        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.resetState', function() {
                            _t.util.performStateServiceAction( 'clearAllStates', declViewModel, $scope.gridid );
                            dataProvider.isFocusedLoad = true;
                        } ) );

                        cfgSvc.getCfg( 'propertyRendererTemplates' ).then( function( propRenderJson ) {
                            let oldColumnConfigColumns = dataProvider.columnConfig ? dataProvider.columnConfig.columns : [];
                            initializeProvider( dataProvider, columnProvider ).then( function() {
                                splmTableAutoResizeService.startResizeWatcher( $scope, $scope.gridid );

                                // LCS-190183 - Keep a references to the dataProvider.cols that are used when building the table header
                                // elements. We can't rely on using the old value in the dataProvider.cols watcher below because dataProvider.cols
                                // could change before the watcher first runs. This ensures resetColumns will run if the scenario
                                // mentioned before occurs and the table header elements keep valid references to the columns.
                                var oldColumnInfos = dataProvider.cols;
                                var directiveElement = element[ 0 ];
                                tableInstance = splmTableFactory.createTableObject(
                                    directiveElement, $scope.gridid, dataProvider, columnProvider, declViewModel, $scope.contentFilter, declGrid.gridOptions, $scope
                                    .containerHeight );
                                tableElem = tableInstance.getTableElement();
                                // occmgmtTableDataService does not send any event out, nor update dataprovider.cols,
                                // it uses dataProvider.columnConfig.
                                $scope.$watch( function _watchColumnConfigColumns() {
                                    if( dataProvider.columnConfig && dataProvider.columnConfig.columns ) {
                                        return dataProvider.columnConfig.columns;
                                    }
                                    return null;
                                }, function( newColumnInfos ) {
                                    if( !_.isEmpty( newColumnInfos ) && newColumnInfos !== oldColumnConfigColumns ) {
                                        columnProvider.buildDynamicColumns( newColumnInfos, true );
                                    }
                                    oldColumnConfigColumns = newColumnInfos;
                                } );

                                // 1. buildDynamicColumns is async but did not return any promise
                                // 2. some table user like occmgmtTableDataService just update prop and column without pop any event
                                $scope.$watch( function _watchDataProviderCols() {
                                    return dataProvider.cols;
                                }, function( newColumnInfos ) {
                                    // LCS-137407 - Objectset header created twice on load
                                    // put ( oldVal !== newVal ) to save performance.
                                    if( oldColumnInfos !== newColumnInfos && !_.isEmpty( newColumnInfos ) ) {
                                        tableInstance.resetColumns();
                                    }
                                    oldColumnInfos = newColumnInfos;
                                } );

                                // 20180926
                                // NOTE: Here the table initialization is rely on a watcher, which may not be correct implementation.
                                // The good practice is:
                                // In main JS logic, we initialize the table as much as possible regardless of dataProvider is ready or not.
                                // In this watcher, put condition to 'newValue !== oldVal' for saving the performance
                                // Current implementation is OK but not the best practice
                                $scope.$watchCollection( 'dataprovider.viewModelCollection.loadedVMObjects', tableInstance.refresh );

                                // Event Interface to rerender the table with data currently on the client
                                instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.clientRefresh', function() {
                                    _.defer( function() {
                                        declGrid.gridOptions.showCheckBox = $scope.showCheckBox;
                                        tableInstance.refresh();
                                    } );
                                } ) );
                            } );
                        } );
                        instanceEventSubcr.push( eventBus.subscribe( dataProvider.name + '.columnsArranged', function( eventData ) {
                            if( eventData.columns.length ) {
                                tableInstance.removeStaleFilters( eventData.columns );
                            } else {
                                columnFilterService.removeAllFilters( dataProvider, columnProvider );
                            }
                            if( tableInstance.getDynamicRowHeightStatus() ) {
                                tableInstance.resetDynamicRowHeights();
                            }
                        } ) );
                    }
                }

                var relatedModifiedEvent = eventBus.subscribe( 'cdm.relatedModified', function( eventData ) {
                    eventBus.publish( 'plTable.relatedModified', eventData );
                } );

                instanceEventSubcr.push( relatedModifiedEvent );

                /**
                 * Listen to dataProvider.reset event on the $scope
                 */
                $scope.$on( 'dataProvider.reset', function() {
                    reloadDataProvider();
                } );

                // Event Interface to rerender table with reloaded data from the dataprovider
                instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.reload', reloadDataProvider ) );

                instanceEventSubcr.push( eventBus.subscribe( 'pltable.columnFilterApplied', function( eventData ) {
                    if( $scope.gridid === eventData.gridId ) {
                        dataProvider.isColumnFilterApplied = columnFilterService.isColumnFilterApplied( dataProvider );
                        tableInstance.updateFilterIcons( eventData.columnName );
                        reloadDataProvider();
                    }
                } ) );

                instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.setFilterDisability', function( eventData ) {
                    if( $scope.gridid === eventData.gridId ) {
                        tableInstance.setFilterDisability( eventData.isFilterDisabled );
                    }
                } ) );

                /**
                 *  Listen to the $destroy event on the $scope
                 */
                $scope.$on( '$destroy', function() {
                    var columns = [];
                    if( dataProvider.columnConfig && dataProvider.columnConfig.columns ) {
                        columns = dataProvider.columnConfig.columns;
                    }
                    _.forEach( instanceEventSubcr, function( eventBusSub ) {
                        eventBus.unsubscribe( eventBusSub );
                    } );
                    _t.util.destroyChildNgElements( element[ 0 ] );
                    splmTableFactory.destroyTable( $scope.gridid, element[ 0 ], columns );
                } );

                /**
                 * Setup to react to changes in selection within the dataProvider.
                 *
                 * @param {Object} event -
                 * @param {Object} data -
                 */
                $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
                    if( data && data.selectionModel ) {
                        var selections = data.selectionModel.getSelection();
                        // Set scroll to row in progress
                        if( dataProvider.isFocusedLoad === true && selections.length > 0 ) {
                            dataProvider.isFocusedLoad = false;
                            dataProvider.scrollToRow = true;
                        }

                        if( selections.length > 0 && selections.length >= _previousSelections.length && _.isEqual( _previousSelections, selections ) === false ||
                            dataProvider.scrollToRow === true ) {
                            dataProvider.scrollToRow = true;
                            eventBus.publish( 'plTable.scrollToRow', {
                                gridId: $scope.gridid,
                                rowUids: selections
                            } );
                        }
                        _previousSelections = selections.slice();
                    }
                } );
                var pageLoadInProgress = false;

                const getTreeNodePageCallback = function() {
                    logger.trace( 'AW simple table: Loaded next tree page data' );
                    pageLoadInProgress = false;
                    if( _t.util.shouldRequestStartEditTreePagination( tableElem, propertyProvider ) ) {
                        _t.util.requestStartEdit( tableElem );
                    }
                };

                instanceEventSubcr.push( eventBus.subscribe( $scope.gridid + '.plTable.loadMorePages', function( eventData ) {
                    if( dataProvider.viewModelCollection && pageLoadInProgress === false ) {
                        // Check if next page should be loaded
                        var lastItemIndex = eventData.lastRenderedItem.index;
                        if( lastItemIndex !== 0 && lastItemIndex === dataProvider.viewModelCollection.loadedVMObjects.length - 1 ) {
                            if( dataProvider.nextAction || dataProvider.action ) {
                                var lastNode = dataProvider.viewModelCollection.loadedVMObjects[ lastItemIndex ];
                                if( dataProvider.hasMorePages() && lastNode.incompleteTail ) {
                                    delete lastNode.incompleteTail;
                                    if( eventData.lastRenderedItem.levelNdx > 0 ) {
                                        pageLoadInProgress = true;
                                        dataProvider.getTreeNodePage( $scope, null, eventData.lastRenderedItem.uid, true, null ).then( getTreeNodePageCallback );
                                        return;
                                    }
                                    /**
                                     * REFACTOR: This is how UI Grid checks to see if we actually have more pages to load or not since
                                     * dataProvider.hasMorePages() will always return true, because it sets dataProvider.update(firstPageObjs, firstPageObjs.length + 1)
                                     * in dataProviderFactory and uses these two values for checking for if more pages to load or not.
                                     * Will remove this code in 4.2 when all UIgrid replaced by PL Table
                                     */
                                    var maxToLoad;
                                    if( dataProvider.action && dataProvider.action.inputData ) {
                                        var actionInputData = dataProvider.action.inputData;
                                        if( actionInputData.searchInput ) {
                                            maxToLoad = actionInputData.searchInput.maxToLoad;
                                        }
                                    }

                                    /**
                                     *
                                     * If we have a firstPage and its length is less than maxToLoad, we dont need to load another page.
                                     * All other cases, handle like normally => Try to get next page of data
                                     *
                                     */
                                    if( maxToLoad && dataProvider.json.firstPage && dataProvider.json.firstPage.length < maxToLoad ) {
                                        logger.trace( 'AW simple table: Rendering of all rows below completed' );
                                    } else {
                                        pageLoadInProgress = true;
                                        dataProvider.getNextPage( $scope ).then( function() {
                                            logger.trace( 'AW simple table: Loaded next page data' );
                                            pageLoadInProgress = false;
                                            if( _t.util.shouldRequestStartEditPagination( tableElem ) ) {
                                                _t.util.requestStartEdit( tableElem );
                                            }
                                        } );
                                        return;
                                    }
                                } else {
                                    logger.trace( 'AW simple table: Rendering of all rows below completed' );
                                }
                            }
                        }

                        // Check if previous page should be loaded as long as next page has not already been requested
                        var firstItemIndex = eventData.firstRenderedItem.index;
                        if( firstItemIndex === 0 ) {
                            if( dataProvider.previousAction ) {
                                var firstNode = dataProvider.viewModelCollection.loadedVMObjects[ firstItemIndex ];
                                if( dataProvider.hasMorePagesUp() && firstNode.incompleteHead ) {
                                    delete firstNode.incompleteHead;
                                    eventBus.publish( dataProvider.name + '.plTable.maintainScrollPosition' );
                                    if( eventData.firstRenderedItem.levelNdx > 0 ) {
                                        pageLoadInProgress = true;
                                        dataProvider.getTreeNodePage( $scope, null, eventData.firstRenderedItem.uid, false, null ).then( getTreeNodePageCallback );
                                        return;
                                    }

                                    pageLoadInProgress = true;
                                    dataProvider.getPreviousPage( $scope ).then( function() {
                                        logger.trace( 'AW simple table: Loaded previous page data' );
                                        pageLoadInProgress = false;
                                        if( _t.util.shouldRequestStartEditPagination( tableElem ) ) {
                                            _t.util.requestStartEdit( tableElem );
                                        }
                                    } );
                                    return;
                                }

                                logger.trace( 'AW simple table: Rendering of all rows above completed' );
                            }
                        }

                        // Check for incomplete head/tail on tree node in rendered range
                        if( declGrid.gridOptions.useTree === true ) {
                            var incompleteNode = dataProvider.findIncompleteNodeInRange( firstItemIndex, lastItemIndex );
                            if( incompleteNode !== null && incompleteNode.levelNdx > 0 ) {
                                var loadNextPage = incompleteNode.incompleteTail === true;
                                if( loadNextPage === true && !( dataProvider.nextAction || dataProvider.action ) ) {
                                    return;
                                } else if( loadNextPage === false && !dataProvider.previousAction ) {
                                    return;
                                }
                                delete incompleteNode.incompleteHead;
                                delete incompleteNode.incompleteTail;
                                pageLoadInProgress = true;
                                dataProvider.getTreeNodePage( $scope, null, incompleteNode.uid, loadNextPage, null ).then( getTreeNodePageCallback );
                                return;
                            }
                        }
                    }
                } ) );
            }
        };
    }
] );
