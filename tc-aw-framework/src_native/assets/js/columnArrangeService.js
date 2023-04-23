// Copyright (c) 2020 Siemens

/**
 * This service handles setting or resetting the number and order of columns in a table.
 *
 * @module js/columnArrangeService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import actionSvc from 'js/actionService';
import appCtxSvc from 'js/appCtxService';
import awColumnSvc from 'js/awColumnService';
import assert from 'assert';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Process the results from the dataProvider's saveColumn/saveColumnAndLoad action.
 *
 * @param {Object} result - saveColumn action response result
 * @param {Object} dataProvider - data provider
 * @param {Object} eventInfo - event data for eventBus publish
 */
let saveColumnProcessResults = function( result, dataProvider, eventInfo ) {
    if( result.searchResultsJSON && !result.searchResults ) {
        result.searchResults = JSON.parse( result.searchResultsJSON );
        delete result.searchResultsJSON;
    }
    if( result.searchResults ) {
        eventInfo = eventInfo ? eventInfo : {};

        eventInfo.viewModelObjects = result.searchResults;
        eventInfo.noResults = dataProvider.noResults;
        eventInfo.totalFound = result.totalFound;

        // set incompleteTail to enable scrolling after vmo reset done by column config
        if( result.totalLoaded < result.totalFound ) {
            if( eventInfo.viewModelObjects.length ) {
                _.last( eventInfo.viewModelObjects ).incompleteTail = true;
            } else if( eventInfo.viewModelObjects.objects && eventInfo.viewModelObjects.objects.length ) {
                _.last( eventInfo.viewModelObjects.objects ).incompleteTail = true;
            }
        }

        // Publish event
        eventBus.publish( dataProvider.name + '.modelObjectsUpdated', eventInfo );
    }
    dataProvider.newColumns = null;
};

/**
 * Arrange the table columns
 *
 * @param {Object} declViewModel - The DeclViewModel to execute the event within.
 * @param {Object} eventData - The event info containing the following properties:
 *
 * <pre>
 *  {String} arrangeType - Operation to perform 'reset', 'saveColumnAction' or 'saveColumnAndLoadAction'.
 *  {AwTableColumnInfoArray} columns - When type is a 'Column' action this array specifies the desired columns in the desired order.
 * </pre>
 *
 * @return {Promise} A promise which is resolved (with no data object being returned) when the operation
 *         specified in the 'eventData' has been performed.
 */
export let arrangeColumns = function( declViewModel, eventData ) {
    declUtils.assertValidModel( declViewModel );

    var sourceGrid = declViewModel.grids[ eventData.name ];

    // If grid id in model doesn't match the one in eventData, then just return doing nothing.
    // Because eventData.name itself is current grid id.
    if( !sourceGrid ) {
        return AwPromiseService.instance.resolve();
    }

    var gridsToArrange = {};
    gridsToArrange[ eventData.name ] = sourceGrid;

    if( eventData.objectSetUri ) {
        _.forEach( declViewModel.grids, function( currentGrid, currentGridName ) {
            var columnProvider = declViewModel.columnProviders[ currentGrid.columnProvider ];

            if( !gridsToArrange[ currentGridName ] && eventData.objectSetUri === columnProvider.objectSetUri ) {
                gridsToArrange[ currentGridName ] = currentGrid;
            }
        } );
    }

    _.forEach( gridsToArrange, function( declGrid ) {
        var colProvider = declViewModel.columnProviders[ declGrid.columnProvider ];

        assert( colProvider, 'Invalid columnProvider' );

        var dataProvider = declViewModel.dataProviders[ declGrid.dataProvider ];

        assert( dataProvider, 'Invalid dataProvider' );

        var evaluationCtx;
        var arrangeType = eventData.arrangeType;

        if( dataProvider.columnConfig ) {
            if( arrangeType === 'reset' && colProvider.resetColumnAction ) {
                // Clean collapse cache
                dataProvider.resetCollapseCache();

                var resetColumnAction = declViewModel.getAction( colProvider.resetColumnAction );

                if( resetColumnAction ) {
                    evaluationCtx = {
                        data: declViewModel,
                        ctx: appCtxSvc.ctx
                    };

                    var inputOpType = resetColumnAction.inputData.getOrResetUiConfigsIn &&
                        resetColumnAction.inputData.getOrResetUiConfigsIn[ 0 ] &&
                        resetColumnAction.inputData.getOrResetUiConfigsIn[ 0 ].columnConfigQueryInfos[ 0 ] &&
                        resetColumnAction.inputData.getOrResetUiConfigsIn[ 0 ].columnConfigQueryInfos[ 0 ].operationType;
                    //typesForArrange stores typeNames of currently loaded objects. This parameter is used
                    //in a query that fetches columns along with clientScopeUri, operationType etc.
                    var inputTypesForArrange = dataProvider.columnConfig.typesForArrange;

                    var postResetFunc = function() {
                        _.forEach( dataProvider.resetColumnConfigs, function( config ) {
                            _.forEach( config.columnConfigurations, function( innerConfig ) {
                                if( innerConfig.columnConfigId === dataProvider.columnConfig.columnConfigId ) {
                                    _.forEach( innerConfig.columns, function( col ) {
                                        // reset soa is still returning some fields on a propDesc
                                        if( col.propDescriptor ) {
                                            col.displayName = col.propDescriptor.displayName;
                                            col.name = col.propDescriptor.propertyName;
                                            col.propertyName = col.propDescriptor.propertyName;
                                            col.typeName = col.columnSrcType;
                                        }
                                    } );

                                    // there is a bug in tc10/11 where opType is not retured from the reset SOA
                                    // work-around by assuming that it isn't changing
                                    if( !innerConfig.operationType ) {
                                        innerConfig.operationType = inputOpType;
                                    }
                                    //Restore typesForArrange when typesForArrange is not returned from the reset SOA.
                                    if( !innerConfig.typesForArrange && inputTypesForArrange ) {
                                        innerConfig.typesForArrange = inputTypesForArrange;
                                    }
                                    dataProvider.columnConfig = innerConfig;
                                    dataProvider.resetColumnConfigs = null;
                                    return false;
                                }
                            } );
                        } );
                    };

                    let columnsArrangedData = {
                        columns: []
                    };
                    eventBus.publish( dataProvider.name + '.columnsArranged', columnsArrangedData );

                    if( resetColumnAction.deps ) {
                        return declUtils.loadDependentModule( resetColumnAction.deps ).then(
                            function( debModuleObj ) {
                                return actionSvc.executeAction( declViewModel, resetColumnAction, evaluationCtx,
                                    debModuleObj ).then( postResetFunc );
                            } );
                    }

                    return actionSvc.executeAction( declViewModel, resetColumnAction, evaluationCtx, null ).then(
                        postResetFunc );
                }

                return AwPromiseService.instance.reject( 'Invalid resetColumnAction specified: ' + colProvider.resetColumnAction );
            } else if( arrangeType === 'saveColumnAndLoadAction' || arrangeType === 'saveColumnAction' ) {
                // Clean collapse cache only for reload
                if( arrangeType === 'saveColumnAndLoadAction' ) {
                    dataProvider.resetCollapseCache();
                }

                // Make sure when 'saveColumnAction' is used, that ViewModel has defined one, otherwise use saveColumnAndLoadAction as default
                var saveActionByArrangeType = arrangeType === 'saveColumnAction' && colProvider.saveColumnAction ? colProvider.saveColumnAction :
                    colProvider.saveColumnAndLoadAction;

                var saveColumnAction = declViewModel.getAction( saveActionByArrangeType );

                if( saveColumnAction ) {
                    let soaColumnInfos = [];
                    let newCols = [];
                    let index = 100;
                    let staticFirstColumnName = '';

                    // Build a map for columns
                    let columns = {};
                    _.forEach( dataProvider.columnConfig.columns, function( col ) {
                        columns[ col.propertyName ] = col;
                    } );

                    // restore first column. this is necessary when updating cols from arrange panel since
                    // static first col is not shown on that panel and needs to be added back in...
                    if( declGrid.gridOptions.useStaticFirstCol ) {
                        let firstPropName = dataProvider.columnConfig.columns[ 0 ].propertyName;
                        let newFirstPropName = eventData.columns[ 0 ].propertyName;
                        if( newFirstPropName && newFirstPropName !== firstPropName && newFirstPropName !== 'icon' ) {
                            let firstColumnInfo = awColumnSvc.createSoaColumnInfo(
                                dataProvider.columnConfig.columns[ 0 ], index );
                            staticFirstColumnName = dataProvider.columnConfig.columns[ 0 ].propertyName;

                            // TARGET_AW43
                            // Soas need to be updated to allow new column def flags
                            // Until then we have to manually remove isFilteringEnabled to avoid
                            // schema validation failing and throwing errors
                            // Remove this line when soa is updated
                            delete firstColumnInfo.isFilteringEnabled;

                            soaColumnInfos.push( firstColumnInfo );
                            index += 100;

                            // Find old column from map, clone new column, and update its values
                            let column = columns[ dataProvider.columnConfig.columns[ 0 ].propertyName ];
                            if( column ) {
                                newCols.push( column );
                            }
                        }
                    }

                    let arrangedData = eventData.columns;

                    // Handle excluded columns - enableColumnHiding = false cols

                    for( let idx = 0; idx < dataProvider.columnConfig.columns.length; idx++ ) {
                        let oldCol = dataProvider.columnConfig.columns[ idx ];
                        if( oldCol.propertyName === staticFirstColumnName || oldCol.enableColumnHiding !== false ) {
                            continue;
                        }

                        // Check if column exists in new arrangedData
                        let filter = _.filter( arrangedData, { propertyName: oldCol.propertyName } );
                        if( filter.length === 0 ) {
                            // Put column into position it was in before
                            arrangedData.splice( idx - 1, 0, oldCol );
                        }
                    }

                    // Update the column for sending via SOA
                    _.forEach( eventData.columns, function( col ) {
                        // Before saving, remove the icon column and skip the already added static col
                        if( col.name === 'icon' || col.name === staticFirstColumnName ) {
                            return;
                        }

                        var soaColumnInfo = awColumnSvc.createSoaColumnInfo( col, index );

                        // TARGET_AW43
                        // Soas need to be updated to allow new column def flags
                        // Until then we have to manually remove isFilteringEnabled to avoid
                        // schema validation failing and throwing errors
                        // Remove this line when soa is updated
                        delete soaColumnInfo.isFilteringEnabled;

                        soaColumnInfos.push( soaColumnInfo );

                        // Find column from map and update its values
                        var column = columns[ col.propertyName ];
                        if( column ) {
                            column.hiddenFlag = col.hiddenFlag;
                            column.isFilteringEnabled = col.isFilteringEnabled;
                            column.pixelWidth = col.pixelWidth;
                            column.sortDirection = col.sortDirection;
                            column.sortPriority = col.sortPriority;
                            column.columnOrder = index;
                            newCols.push( column );
                        } else {
                            column = awColumnSvc.createColumnInfo( col );
                            column.columnOrder = index;
                            newCols.push( column );
                        }
                        index += 100;
                    } );

                    dataProvider.newColumns = soaColumnInfos;
                    dataProvider.columnConfig.columns = newCols;

                    evaluationCtx = {
                        data: declViewModel,
                        ctx: appCtxSvc.ctx,
                        eventData: eventData
                    };

                    let columnsArrangedData = {
                        columns: newCols
                    };

                    eventBus.publish( dataProvider.name + '.columnsArranged', columnsArrangedData );

                    // Reset start index because we are replacing vmos with this data load
                    dataProvider.startIndex = 0;

                    if( saveColumnAction.deps ) {
                        return declUtils.loadDependentModule( saveColumnAction.deps ).then(
                            function( debModuleObj ) {
                                return actionSvc.executeAction( declViewModel, saveColumnAction, evaluationCtx,
                                    debModuleObj ).then( function( result ) {
                                    saveColumnProcessResults( result, dataProvider, eventData );
                                } );
                            }
                        );
                    }

                    return actionSvc.executeAction( declViewModel, saveColumnAction, evaluationCtx, null ).then(
                        function( result ) {
                            saveColumnProcessResults( result, dataProvider, eventData );
                        }
                    );
                }

                return AwPromiseService.instance.reject( 'Invalid saveColumnAction specified: ' + saveActionByArrangeType );
            } else if( arrangeType === 'saveAsNewColumnAndLoadAction' ) {
                var saveAsNewColumnAndLoadAction = declViewModel.getAction( colProvider.saveAsNewColumnAndLoadAction );
                // If the action is defined, call custom action
                if( saveAsNewColumnAndLoadAction ) {
                    evaluationCtx = {
                        data: declViewModel,
                        ctx: appCtxSvc.ctx
                    };
                    return actionSvc.executeAction( declViewModel, saveAsNewColumnAndLoadAction, evaluationCtx, null );
                }
                eventBus.publish( 'saveNewArrangementDefaultEvent' );
            }
        }
    } );

    return AwPromiseService.instance.resolve( null );
};

/**
 * Return the type names from search filter map
 *
 * @param {Object} searchFilterMap - Search Filter Map
 *
 * @return {StringArray} The type names array
 */
export let getTypeNames = function( searchFilterMap ) {
    var typeNames = [];
    var filters = _.get( searchFilterMap, 'WorkspaceObject.object_type' );
    if( !filters ) {
        filters = _.get( searchFilterMap, 'SAVED_QUERY_RESULT_TYPES' );
    }
    var hasSelectedFilters = false;
    if( _.isArray( filters ) ) {
        _.forEach( filters, function( searchFilter ) {
            if( searchFilter.selected ) {
                hasSelectedFilters = true;
            }
        } );

        _.forEach( filters, function( searchFilter ) {
            var addType = true;
            if( hasSelectedFilters && !searchFilter.selected ) {
                addType = false;
            }

            if( addType ) {
                var typeName = _.get( searchFilter, 'stringValue' );
                if( typeNames.indexOf( typeName ) < 0 ) {
                    typeNames.push( typeName );
                }
            }
        } );
    }

    if( typeNames.length === 0 ) {
        typeNames.push( 'WorkspaceObject' );
    }
    var indexOfNone = typeNames.indexOf( '$NONE' );
    if( indexOfNone > 0 ) {
        typeNames.splice( indexOfNone, 1 );
    }

    return typeNames;
};

export let processArrangeSettings = function( dataProvider, gridId, gridOptions ) {
    var cols = _.clone( dataProvider.cols );

    // internal gwt arrange panel blindly strips the first column assuming it is icon but when we are using a static
    // first column (tree / quickTable), we want to also strip the first prop column since that can't be rearranged.
    // so pre-emptively slice off the icon column... This fragile dependency should be re-worked when the native
    // arrange panel is written.
    if( gridOptions.useStaticFirstCol && cols[ 0 ].name === 'icon' ) {
        cols.splice( 0, 1 );
    }

    var grididSetting = {
        name: gridId,
        columnConfigId: dataProvider.columnConfig.columnConfigId,
        objectSetUri: dataProvider.objectSetUri,
        columns: cols,
        useStaticFirstCol: Boolean( gridOptions.useStaticFirstCol ),
        showFirstColumn: true
    };

    // If objectset arrange, we need the operationType, otherwise searchResponseInfo will be used in arrange.service
    if( dataProvider.objectSetUri ) {
        grididSetting.operationType = dataProvider.columnConfig.operationType;
    }

    appCtxSvc.registerCtx( 'ArrangeClientScopeUI', grididSetting );
};

exports = {
    arrangeColumns,
    getTypeNames,
    processArrangeSettings
};
export default exports;
/**
 * Register this service with AngularJS.
 *
 * @member columnArrangeService
 * @memberof NgServices
 */
app.factory( 'columnArrangeService', () => exports );
