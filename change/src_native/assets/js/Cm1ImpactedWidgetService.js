// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */
/**
 * @module js/Cm1ImpactedWidgetService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import awTableSvc from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import awColumnSvc from 'js/awColumnService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import dmSvc from 'soa/dataManagementService';
import iconSvc from 'js/iconService';
import colorDecoratorSvc from 'js/colorDecoratorService';
import pasteSvc from 'js/pasteService';
import tcVmoService from 'js/tcViewModelObjectService';
import messageSvc from 'js/messagingService';
import localeSvc from 'js/localeService';
import eventBus from 'js/eventBus';

import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import 'soa/kernel/clientMetaModel';
import $ from 'jquery';

var probableImpactedTableSelection = [];
var hasProblemItemSelectionChanged;
var exports = {};
        var listenForsublocationChange;

export let getChangeObjectUid = function() {
    var changeObjectUid = '';
    var selectedVmo = appCtxSvc.ctx.selected;
    if ( selectedVmo.modelType && ( selectedVmo.modelType.typeHierarchyArray.indexOf( 'ChangeNoticeRevision' ) > -1 || selectedVmo.modelType.typeHierarchyArray.indexOf( 'ChangeRequestRevision' ) > -1 ) ) {
        changeObjectUid = selectedVmo.uid;
    } else {
        selectedVmo = appCtxSvc.ctx.pselected;

        if ( selectedVmo.modelType && ( selectedVmo.modelType.typeHierarchyArray.indexOf( 'ChangeNoticeRevision' ) > -1 || selectedVmo.modelType.typeHierarchyArray.indexOf( 'ChangeRequestRevision' ) > -1 ) ) {
            changeObjectUid = selectedVmo.uid;
        }
    }
    return changeObjectUid;
};

/**
 * This function will call action event from Impact Analysis
 * @param {commandId} commandId - Command ID for which action has to be triggered
 *
 */
export let publishAddImpactedFromCommandViewModel = function( commandId ) {
    var eventId;
    if ( commandId === 'Cm1AddImpactedItemsCommand' ) {
        eventId = 'createImpactedRelationSoaCall.probableImpactedTable';
    } else if ( commandId === 'Cm1AddRelatedImpactedItemsCommand' ) {
        eventId = 'createImpactedRelationObjectsSoaCall.relatedObjectTable';
    } else if ( commandId === 'Cm1AddImpactedRBCommand' ) {
        eventId = 'createImpactedRelationSoaCallForRelationBrowser.relationBrowser';
    }
    eventBus.publish( eventId, {
        commandId: commandId
    } );
};

/**
 * This function will call action event to set relation context
 * before calling cut Operation for removing Impacted Items in Relation View.
 * This is required because in Relation View , when graph is selected/deselected and
 * then cut operation is called , relation context is lost due to relation browser redefining it.
 * @param {*} commandId
 */
export let publishCutRelationFromCommandViewModel = function( commandId ) {
    if ( commandId === 'Cm1RemoveImpactedItemsCommand' && appCtxSvc.ctx.relationContext === undefined ) {
        eventBus.publish( 'cutRelationForPersistedSelection', {
            commandId: commandId
        } );
    }
};

export let getProblemItemList = function( data ) {
    var deferred = AwPromiseService.instance.defer();

            //set some listener to unregister context
            subscribeEvent( data );

            // Set default view if not set already
            if( !appCtxSvc.ctx.ImpactsViewMode ) {
                var newView = 'TableView';
                appCtxSvc.registerCtx( 'ImpactsViewMode', newView );
                //collects separate viewmodel dataprovider in main viewmodel data for interaction purpose
                //between different tables
                appCtxSvc.registerCtx( 'ImpactsViewData', data );
            }


    //enable decorators
    appCtxSvc.updatePartialCtx( 'decoratorToggle', true );

    //get Problem Items for selected change object
    var changeObjectUid = exports.getChangeObjectUid();

    //set change object on data scope
    data.selectedChangeObjectUid = changeObjectUid;

    var selectedChangeVMO = clientDataModelSvc.getObject( changeObjectUid );

    //set change object on data
    data.selectedChangeVMO = selectedChangeVMO;

    //setting temprorary vmo on data to support drag-drop.
    var impactedChangeVMOs = [];
    var impactedChangeVMO = {
        uid: selectedChangeVMO.uid + 'ChangeImpactedItem',
        type: 'ChangeImpactedItem'
    };
    impactedChangeVMOs.push( impactedChangeVMO );
    clientDataModelSvc.cacheObjects( impactedChangeVMOs );

    impactedChangeVMO = clientDataModelSvc.getObject( selectedChangeVMO.uid + 'ChangeImpactedItem' );
    impactedChangeVMO.modelType = {
        typeHierarchyArray: [ 'ChangeImpactedItem' ]
    };
    impactedChangeVMO.changeVmo = selectedChangeVMO;
    data.changeImpactedVMO = impactedChangeVMO;
    appCtxSvc.ctx.vmo = impactedChangeVMO;
    data.isDropTargetSet = false;

    var allObjectUid = [ selectedChangeVMO.uid ];
    var propToLoad = [ 'CMHasProblemItem' ];

    dmSvc
        .getProperties( allObjectUid, propToLoad )
        .then(
            function() {
                //get latest vmo from cache
                var updatedChangeObject = clientDataModelSvc.getObject( selectedChangeVMO.uid );
                var problemItems = updatedChangeObject.props.CMHasProblemItem;

                var listModels = [];

                // load the list values only if prop has values
                if( problemItems && problemItems.dbValues.length > 0 ) {
                    for( var idx = 0; idx < problemItems.dbValues.length; idx++ ) {
                        var selectedEntry = false;
                        if( idx === 0 ) {
                            selectedEntry = true;
                        }
                        var listModel = {
                            propDisplayValue: problemItems.uiValues[ idx ],
                            propInternalValue: problemItems.dbValues[ idx ],
                            propDisplayDescription: '',
                            dbValue: problemItems.dbValues[ idx ],
                            dispValue: problemItems.uiValues[ idx ],
                            sel: selectedEntry
                        };

                        listModels.push( listModel );
                    }
                }

                deferred.resolve( listModels );
            } );

    return deferred.promise;
};


        /**
         * This function will subscribe the event "appCtx.update" and unregister context
         */
        var subscribeEvent = function( data ) {
            listenForsublocationChange = eventBus.subscribe( 'appCtx.update', function( eventData ) {
                if( eventData.name === 'xrtPageContext' && ( eventData.target === 'secondaryXrtPageID' || eventData.value.primaryXrtPageID === 'tc_xrt_Relations' ) ) {
                    eventBus.unsubscribe( listenForsublocationChange );

                    //Unregister relation browser context set by Change Manager when location is changed
                    appCtxSvc.unRegisterCtx( 'initRelationsBrowserCtx' );
                } else if( eventData.name === 'graph' && eventData.target === 'graphModel.graphData' ) {
                    data.isDropTargetSet = false;
                }
            } );
        };

/**
 * This will be called when problem item is loaded or selection is changed on drop down
 * We need to load other tables only after LOV is completely loaded. By setting variable problemItemLOVLoaded other tables will start loading.
 * If variable problemItemLOVLoaded is already set than it means its selection change in LOV so just realod probableImpacted table.
 * @param {viewmodeldata} data view model data
 *
 * @return {Promise} Resolved with an object containing the results of the operation.
 */

export let handleProblemItemSelection = function( data ) {
    // Set default view if not set already
    if ( !appCtxSvc.ctx.ImpactsViewMode ) {
        var newView = 'TableView';
        appCtxSvc.registerCtx( 'ImpactsViewMode', newView );
    }
    var currentView = appCtxSvc.ctx.ImpactsViewMode;
    //collects separate viewmodel dataprovider in main viewmodel data for interaction purpose
    //between different tables
    appCtxSvc.registerCtx( 'ImpactsViewData', data );
    appCtxSvc.registerCtx( 'cursorIDParent', new Map( [] ) );

    probableImpactedTableSelection = [];

    //set problem Item on relation browser ctx
    var rootId = {
        rootId: data.selectedProblemItem.dbValue,
        defaultActiveView: 'ChangeImpactAnalysis'
    };
    appCtxSvc.registerCtx( 'initRelationsBrowserCtx', rootId );

    if ( appCtxSvc.ctx.selected.type === 'ChangeRequestRevision' || appCtxSvc.ctx.selected.type === 'ChangeNoticeRevision' ) {
        appCtxSvc.registerCtx( 'currentChange', appCtxSvc.ctx.selected );
    }
    if ( data.problemItemLOVLoaded.dbValue === false ) {
        //initialize this variable so other table we can load
        data.problemItemLOVLoaded.dbValue = true;
    } else {
        if ( currentView === 'TableView' ) {
            hasProblemItemSelectionChanged = true;
            eventBus.publish( 'probableImpactedGrid.plTable.reload' );
        }

        if ( currentView === 'RelationView' ) {
            eventBus.publish( 'awGraphLegend.activeViewChanged' );
        }
    }
};

/**
* Get probable impacted for selected problem item.

* @param {treeLoadInput} treeLoadInput Tree Load Input
* @param {object} uwDataProvider data provider
* @param {viewmodeldata} data view model data
*
* @return {Promise} Resolved with an object containing the results of the operation.
*/
export let loadProbableImpactedTree = function( treeLoadInput, uwDataProvider, inContextData ) {
    var deferred = AwPromiseService.instance.defer();

    var sourceProblemItemUid;
    var data = getReInitializedData();
    var currentSelection = appCtxSvc.ctx.selected;
    if ( inContextData !== undefined && inContextData.dataProviders.probableImpactedDataProvider !== undefined
        && inContextData.dataProviders.probableImpactedDataProvider.selectedObjects.length > 0 ) {
        currentSelection = appCtxSvc.ctx.pselected;
    }

    if ( ( data === undefined || data.problemItemLOVLoaded === undefined ) && !isCurrentSelectionChange( currentSelection ) ) {
        if ( currentSelection !== undefined && currentSelection !== null ) {
            if ( currentSelection.props !== undefined
                && currentSelection.props.awb0UnderlyingObject !== undefined && currentSelection.props.awb0UnderlyingObject.dbValues !== undefined ) {
                sourceProblemItemUid = currentSelection.props.awb0UnderlyingObject.dbValues[0];
            } else if ( currentSelection.uid !== undefined ) {
                sourceProblemItemUid = currentSelection.uid;
            }
        }
        appCtxSvc.registerCtx( 'ImpactsViewData', inContextData );
        if ( appCtxSvc.ctx.cursorIDParent === undefined ) {
            appCtxSvc.registerCtx( 'cursorIDParent', new Map( [] ) );
            data = appCtxSvc.ctx.ImpactsViewData;
        }
    } else if ( uwDataProvider.name === 'probableImpactedDataProvider' && ( data.dataProviders.probableImpactedDataProvider === undefined || data.dataProviders.probableImpactedDataProvider.selectionModel === null ) ) {
        data.dataProviders.probableImpactedDataProvider = uwDataProvider;
        data.probableImpactedTableLoaded = inContextData.probableImpactedTableLoaded;
        data.probableImpactedTablePrevSel = inContextData.probableImpactedTablePrevSel;
        data.columnProviders = inContextData.columnProviders;
    }

    // clear selection both tables.
    if ( data.dataProviders.probableImpactedDataProvider !== undefined && data.dataProviders.probableImpactedDataProvider.selectionModel !== null && hasProblemItemSelectionChanged ) {
        data.dataProviders.probableImpactedDataProvider.selectNone();
    }
    if ( data.dataProviders.persistedImpactedDataProvider !== undefined && data.dataProviders.persistedImpactedDataProvider.selectionModel !== null ) {
        data.dataProviders.persistedImpactedDataProvider.selectNone();
    }
    if ( data.dataProviders.relationImpactedDataProvider !== undefined && data.dataProviders.relationImpactedDataProvider.selectionModel !== null ) {
        data.dataProviders.relationImpactedDataProvider.selectNone();
    }

    if ( hasProblemItemSelectionChanged === true ) {
        data.totalFoundRelated = 0;
        probableImpactedTableSelection = [];
    }
    if ( data.dataProviders.probableImpactedDataProvider !== undefined && data.dataProviders.probableImpactedDataProvider.selectedObjects !== undefined
        && data.dataProviders.probableImpactedDataProvider.selectedObjects.length === 0 ) {
        if ( probableImpactedTableSelection.length !== 0 ) {
            var topNode = data.dataProviders.probableImpactedDataProvider.getItemAtIndex( 0 );
            if ( topNode !== undefined && topNode !== null ) {
                data.dataProviders.probableImpactedDataProvider.selectionModel.setSelection( topNode );
            }
        }
    }

    treeLoadInput.displayMode = 'Tree';
    var selectedItemObj = appCtxSvc.getCtx( 'selected' );

    var failureReason = awTableSvc
        .validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }

    //If item is selected from drop down or probable impacted table
    var isProblemItemNode = treeLoadInput.parentNode.levelNdx === -1;
    if ( sourceProblemItemUid === undefined ) {
        sourceProblemItemUid = data.selectedProblemItem.dbValue;
    }

    //If item is selected/expanded from probable impacted table,then get the problem item uid
    if ( !isProblemItemNode ) {
        if ( treeLoadInput.startChildNdx > 0 ) {
            treeLoadInput = processTreeLoadInputForNextPageLoad( treeLoadInput );
        }
        sourceProblemItemUid = treeLoadInput.parentNode.props.cm0ProposedImpactedObject.dbValues[0];
    }
    var treeLevel = treeLoadInput.parentNode.levelNdx + 1; // For problem item from dropdown levelNdx is -1. We are sending "0" if problem item from dropdown is selected.
    var levelString = treeLevel.toString();
    var changeObjectUid = data.selectedChangeObjectUid;
    var returnSourceObject = 'False';
    var returnParentItems = 'False';
    var returnRelatedItems = 'False';

    if( levelString === '0' ) {
        returnSourceObject = 'True';
    } else {
        returnParentItems = 'True';
    }

    var clientScopeURI = 'CMProbableImpactedTable';
    if ( !isCurrentSelectionChange( currentSelection ) ) {
        clientScopeURI = 'ParentTraversalTable';
    }

    //Set on Data which will ne used in case of reset or update column configuration
    inContextData.clientScopeURI = clientScopeURI;
    //Prepare SOA input
    var soaInput = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: clientScopeURI
        },
        inflateProperties: true,
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Cm1ImpactAnalysisProvider',
            searchFilterMap6: {},
            searchCriteria: {
                dcpSortByDataProvider: 'true',
                parentUid: sourceProblemItemUid,
                changeObjectUid: changeObjectUid,
                returnSourceObject: returnSourceObject,
                returnParentItems: returnParentItems,
                returnRelatedItems: returnRelatedItems,
                level: levelString
            },
            searchFilterFieldSortType: 'Alphabetical',
            searchSortCriteria: data.columnProviders.probableImpactedColumnProvider.sortCriteria,
            startIndex: treeLoadInput.startChildNdx
        }
    };

    var policyJson = {
        types: [ {
            name: 'Cm0ProposedImpactedObject',
            properties: [ {
                    name: 'cm0IsAlreadyImpacted'
                },
                {
                    name: 'cm0SourceObject'
                },
                {
                    name: 'cm0Relation'
                },
                {
                    name: 'cm0ProposedImpactedObject',
                    modifiers: [ {
                        name: 'withProperties',
                        Value: 'true'
                    } ]
                },
                {
                    name: 'cm0ProposedImpactedType'
                },
                {
                    name: 'awp0CellProperties'
                },
                {
                    name: 'cm0HasChildren'
                },
                {
                    name: 'cm0Children'
                }
            ]
        } ]
    };

    buildTreeTableStructure( treeLoadInput, selectedItemObj, soaInput, data, uwDataProvider, policyJson, deferred );
    return deferred.promise;
};

/**
 * This function will create treeloadInput for next page load.
 * This treeloadInput will have updated correct parent node(if required),
 * updated start index based on current parent node instead of tree structure as whole.
 * treeLoadInput will also have updated startChildId to cover use-cases of different occurrences
 * of same component at different levels.
 * @param {*} treeLoadInput
 */
function processTreeLoadInputForNextPageLoad( treeLoadInput ) {
    var cursorIDParentMap = appCtxSvc.ctx.cursorIDParent;

    if ( treeLoadInput.cursorNodeId !== null && cursorIDParentMap.has( treeLoadInput.cursorNodeId ) ) {
        var parentContext;
        var parentNodes = cursorIDParentMap.get( treeLoadInput.cursorNodeId );

        // this is for use case when different occurrence of same component
        // is present at two different levels of tree
        for ( var inx = 0; inx < parentNodes.length; inx++ ) {
            if ( parentNodes[inx].uid === treeLoadInput.parentNode.uid ) {
                if ( parentNodes[inx].levelNdx === treeLoadInput.parentNode.levelNdx ) {
                    parentContext = parentNodes[inx];
                    // parent node value needs to be cleared from map to avoid any reload
                    if ( parentNodes.length !== 1 ) {
                        var index = parentNodes.indexOf( parentContext );
                        parentNodes.splice( index, 1 );
                        cursorIDParentMap.set( treeLoadInput.cursorNodeId, parentNodes );
                    }
                    //key deleted for single parent node
                    else {
                        cursorIDParentMap.delete( treeLoadInput.cursorNodeId );
                    }
                    break;
                }
            }
            parentContext = parentNodes[inx];
            if ( parentNodes.length === 1 ) {
                cursorIDParentMap.delete( treeLoadInput.cursorNodeId );
            }
        }
        if ( parentContext === undefined ) {
            parentContext = treeLoadInput.parentNode;
        }
        // for all use-cases:start index needs to updated in context to current parentNode
        // for children to be loaded correctly
        var startChildLoadIndx = parentContext.children.length;
        treeLoadInput.startChildNdx = startChildLoadIndx;
        // this is to identify different occurrences of same component
        var startChildID = parentContext.children[startChildLoadIndx - 1].id;
        treeLoadInput = awTableSvc.createTreeLoadInput( parentContext, treeLoadInput.startChildNdx, treeLoadInput.cursorNodeId, startChildID,
            treeLoadInput.pageSize, true );
    }
    return treeLoadInput;
}


/**
 * Returns list of ViewModel Objects of Related Objects
 * @param {relatedSearchResponse} relatedSearchResponse - response from provider
 *
 * @return {relatedObjectsTableResultRows} list of ViewModel Objects
 */
export let processRelObjectsJSONResponse = function( relatedSearchResponse ) {
    var relatedObjectsTableResultRows = [];
    var relatedSearchResults = parsingUtils.parseJsonString( relatedSearchResponse.searchResultsJSON );
    var viewModeolObjectsFromJson = [];
    _.forEach( relatedSearchResults.objects, function( object ) {
        viewModeolObjectsFromJson.push( object );
    } );

    relatedObjectsTableResultRows = createViewModelTableNode( viewModeolObjectsFromJson );
    return relatedObjectsTableResultRows;
};

/**
 * if the related object search call is because of probable impacted table selection change
 * uid is read from selection
 *
 * if the related object search call is because of column arrange or filter , there can be no selection in
 * probable impacted table and uid is read from saved probable impacted table selection
 */
export let getProbableImpactedUid = function( subPanelContext ) {
    if ( subPanelContext !== undefined && subPanelContext.dataProviders.probableImpactedDataProvider !== undefined
        && subPanelContext.dataProviders.probableImpactedDataProvider.selectedObjects.length === 1 ) {
        return subPanelContext.dataProviders.probableImpactedDataProvider.selectedObjects[0].props.cm0ProposedImpactedObject.dbValue;
    }
    // saved probable impacted table selection
    else if ( probableImpactedTableSelection.length === 1 ) {
        return probableImpactedTableSelection[0].uid;
    }
    return;
};


/**
 * Reinitialize data based on switches to different sublocation.
 * For eg. data needs to be re-initialized if Impact Analysis tab is
 * clicked in 'Change' sublocation, then Where Used Tab is clicked in ACE sublocation
 */
function getReInitializedData() {
    var data;
    if ( appCtxSvc.ctx.ImpactsViewData !== undefined ) {
        data = appCtxSvc.ctx.ImpactsViewData;
        var providers = data.dataProviders;
        var reInitialized = false;
        for ( var providerInx in providers ) {
            if ( reInitialized === false && providers[providerInx] === null ) {
                appCtxSvc.unRegisterCtx( 'ImpactsViewData', data );
                appCtxSvc.unRegisterCtx( 'cursorIDParent', new Map( [] ) );
                data = appCtxSvc.ctx.ImpactsViewData;
                reInitialized = true;
            }
        }
    }
    if ( appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_ImpactAnalysis' || appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_ImpactAnalysis' ) {
        if ( appCtxSvc.ctx.pselected === null || appCtxSvc.ctx.pselected === undefined ) {
            appCtxSvc.updatePartialCtx( 'pselected', data.selectedChangeVMO );
        } else if ( appCtxSvc.ctx.pselected.modelType.typeHierarchyArray.indexOf( 'ChangeItemRevision' ) === -1 ) {
            appCtxSvc.updatePartialCtx( 'pselected', data.selectedChangeVMO );
        }
    }
    return data;
}
/**
 * Checks if the selection is a change to populate tables in Impact Analysis Tab OR
 * it is selection of an object(for eg. component selection in ACE) to populate
 * reverse tree for ProbableImpacted table componetized at some other sublocation.
 * @param {object} currentSelection
 */
function isCurrentSelectionChange( currentSelection ) {
    var isChangeType = false;
    var parentVMO = appCtxSvc.ctx.pselected;
    var selectedVMO = currentSelection;

    var isSelectedChangeType = false;
    var isParentSelectedChangeType = false;
    if ( selectedVMO !== undefined && selectedVMO.modelType && selectedVMO.modelType.typeHierarchyArray.indexOf( 'ChangeItemRevision' ) !== -1 ) {
        isSelectedChangeType = true;
    }

    if ( parentVMO !== undefined && parentVMO !== null && parentVMO.modelType && parentVMO.modelType.typeHierarchyArray.indexOf( 'ChangeItemRevision' ) !== -1 ) {
        isParentSelectedChangeType = true;
    }

    if( isSelectedChangeType || isParentSelectedChangeType ) {
        isChangeType = true;
    }
    return isChangeType;
}

/**
 * calls SOA
 * @param {Object} treeLoadInput Tree Load Input
 * @param {Object} selectedItemObj Selected Item Revision
 * @param {Object} soaInput inputData Input for SOA
 * @param {object} data view model data
 * @param {object} uwDataProvider data provider
 * @param {object} policyJson property policy
 * @param {Object} deferred deferred input
 */
function buildTreeTableStructure( treeLoadInput, selectedItemObj, soaInput, data, uwDataProvider, policyJson, deferred ) {
    // set policy
    var policyId = propertyPolicySvc.register( policyJson );

    //call SOA
    soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
        function( response ) {
            //unset policy
            if( policyId ) {
                propertyPolicySvc.unregister( policyId );
            }

            // if retrieving first level than set columns for table
            var retrievingFirstLevel = treeLoadInput.parentNode.levelNdx === -1;
            if ( retrievingFirstLevel ) {
                initColumsForProbableImpactedTable( response.columnConfig, uwDataProvider );
            }
            var endReachedVar = response.totalLoaded >= response.totalFound;
            var startReachedVar = treeLoadInput.startChildNdx <= 0;


            var tempCursorObject = {
                endReached: endReachedVar,
                startReached: startReachedVar
            };

            var parentNodeOfPaginatedChild = soaInput.searchInput.searchCriteria.parentUid;

            //parse ViewModel JSON to ViewModel objects
            var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );

            // prepare view model object from search results and client cache
            var viewModeolObjectsFromJson = [];
            _.forEach( searchResults.objects, function( object ) {
                viewModeolObjectsFromJson.push( object );
            } );

            // prepare view model tree nodes for table
            var treeLoadResult = createViewModelTreeNode( treeLoadInput, viewModeolObjectsFromJson, data, parentNodeOfPaginatedChild, startReachedVar, endReachedVar );
            treeLoadResult.parentNode.cursorObject = tempCursorObject;
            if ( endReachedVar === false ) {
                collectParentNodesOfCursorID( treeLoadResult );
            }
            // Set this variable so Persisted Impacted table can be loaded now.
            data.probableImpactedTableLoaded.dbValue = true;

            //resolve deferred result
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        } );
}

/**
 * Till this point, previous page has been loaded.Before loading the next page
 * the cursor Id is calculated and added as key in map and the corresponding
 * parent node is collected.Later, when the index moves for next page , with cursor id available,
 * will check this map to get the correct parent, where the next page children should be added.
 * @param {*} treeLoadResult
 */
function collectParentNodesOfCursorID( treeLoadResult ) {
    if ( treeLoadResult.childNodes === undefined || treeLoadResult.childNodes === null ) {
        return;
    }
    var cursorIDParentMap = appCtxSvc.ctx.cursorIDParent;
    var lastLoadedChildIdx = treeLoadResult.childNodes.length - 1;
    var lastUid = treeLoadResult.childNodes[lastLoadedChildIdx].uid;
    var currentParentNode = treeLoadResult.parentNode;

    if ( cursorIDParentMap !== undefined && cursorIDParentMap.has( lastUid ) ) {
        var allParentNodes = cursorIDParentMap.get( lastUid );
        _.forEach( allParentNodes, function( existingNode ) {
            //for different occurrence of same component
            if ( existingNode.uid === currentParentNode.uid ) {
                if ( existingNode.cursorObject.endReached === true ) {
                    var index = allParentNodes.indexOf( existingNode );
                    allParentNodes.splice( index, 1 );
                    allParentNodes.push( currentParentNode );
                  } else {
                    allParentNodes.push( currentParentNode );
                }
            }
            //for different component
            else {
                allParentNodes.push( currentParentNode );
            }
        } );
        cursorIDParentMap.set( lastUid, allParentNodes );
       } else {
        cursorIDParentMap.set( lastUid, [ currentParentNode ] );
    }
    appCtxSvc.updatePartialCtx( 'cursorIDParent', cursorIDParentMap );
}

/**
 * This function will convert the proposedImpacted Objects to View Model Objects
 * and returns the list
 * @param {searchResults} viewModeolObjectsFromJson input view model objects
 *
 * @return {vmNodes} response - list of View Model Objects
 */
function createViewModelTableNode( viewModeolObjectsFromJson ) {
    var vmNodes = [];
    var levelNdx = 0;
    var parentNode = null;
    var rootNode = null;


    for ( var childNdx = 0; childNdx < viewModeolObjectsFromJson.length; childNdx++ ) {
        var proxyObject = viewModeolObjectsFromJson[childNdx]; // view mode object parsed from JSON
        var endObjectVmo = viewModelObjectSvc.createViewModelObject( proxyObject.uid, 'EDIT', proxyObject.uid, proxyObject ); // This will merge JSON proxy object and object from service data

        var displayName = endObjectVmo.props.cm0ProposedImpactedObject.uiValues[0];
        var objType = endObjectVmo.type;
        var objUid = endObjectVmo.uid;

        //we will use icon of underlying object
        var underlyingObjectUid = endObjectVmo.props.cm0ProposedImpactedObject.dbValues[0];
        var underlyingObject = clientDataModelSvc.getObject( underlyingObjectUid );
        var iconType = underlyingObject.type;
        var iconURL = iconSvc.getTypeIconURL( iconType );
        var hasChildren = '0';

        //Create viewModelObject
        var tableVmNode = viewModelObjectSvc.createViewModelObject( underlyingObject.uid, 'EDIT', underlyingObject.uid, underlyingObject );

        tableVmNode.cm0IsAlreadyImpacted = false;
        if ( endObjectVmo.props.cm0IsAlreadyImpacted.dbValue === true ) {
            endObjectVmo.cm0IsAlreadyImpacted = true;
        }

        //copy properties from view model object to table model object
        tcVmoService.mergeObjects( tableVmNode, endObjectVmo );
        tcVmoService.mergeObjects( tableVmNode, underlyingObject );

        //set object_string from underlying object to runtime object
        if ( underlyingObject.props.object_string ) {
            tableVmNode.props.object_string.uiValues = underlyingObject.props.object_string.uiValues;
            tableVmNode.props.object_string.uiValue = underlyingObject.props.object_string.uiValues;
        }

        if ( tableVmNode ) {
            vmNodes.push( tableVmNode );
        }
    }
    colorDecoratorSvc.setDecoratorStyles( vmNodes );

    return vmNodes;
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {searchResults} viewModeolObjectsFromJson input view model objects
 * @param {object} data view model data
 *
 * @return {object} response
 */
function createViewModelTreeNode( treeLoadInput, viewModeolObjectsFromJson, data, parentNodeOfPaginatedChild, startReachedVar, endReachedVar ) {
    var vmNodes = [];
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;
    var levelNdx = parentNode.levelNdx + 1;
    treeLoadInput.pageSize = viewModeolObjectsFromJson.length;
    for( var childNdx = 0; childNdx < viewModeolObjectsFromJson.length; childNdx++ ) {
        var proxyObject = viewModeolObjectsFromJson[ childNdx ]; // view mode object parsed from JSON
        var endObjectVmo = viewModelObjectSvc.createViewModelObject( proxyObject.uid, 'EDIT', proxyObject.uid, proxyObject ); // This will merge JSON proxy object and object from service data

        var displayName = endObjectVmo.props.cm0ProposedImpactedObject.uiValues[ 0 ];
        var objType = endObjectVmo.type;
        var objUid = endObjectVmo.uid;

        //we will use icon of underlying object
        var underlyingObjectUid = endObjectVmo.props.cm0ProposedImpactedObject.dbValues[ 0 ];
        var underlyingObject = clientDataModelSvc.getObject( underlyingObjectUid );
        var iconType = underlyingObject.type;
        var iconURL = iconSvc.getTypeIconURL( iconType );

        //Has children property
        var hasChildren = endObjectVmo.props.cm0HasChildren.dbValues[0];

        //Create treeModelObject
        var treeVmNode = awTableSvc
            .createViewModelTreeNode( underlyingObject.uid, underlyingObject.type, displayName, levelNdx, childNdx, iconURL );

        //Generating unique id for each row. We can't reply on uid as we can have same object multiple time in same table.
        var id = treeVmNode.id + treeLoadInput.parentNode.id + childNdx + treeLoadInput.parentNode.levelNdx;
        treeVmNode.id = id;


        treeVmNode.cm0IsAlreadyImpacted = false;
        if( endObjectVmo.props.cm0IsAlreadyImpacted.dbValue === true && data.dataProviders.persistedImpactedDataProvider !== undefined ) {
            endObjectVmo.cm0IsAlreadyImpacted = true;
        }

        //copy properties from view model object to tree model object
        tcVmoService.mergeObjects( treeVmNode, endObjectVmo );
        tcVmoService.mergeObjects( treeVmNode, underlyingObject );


        //set object_string from underlying object to runtime object
        if( underlyingObject.props.object_string ) {
            treeVmNode.props.object_string.uiValues = underlyingObject.props.object_string.uiValues;
            treeVmNode.props.object_string.uiValue = underlyingObject.props.object_string.uiValues;
        }

        //set uid and type of underlying object otherwise we will have to implement lots of handlers to support adapter object hanndeling.
        //treeVmNode.uid = underlyingObjectUid;
        //treeVmNode.type = endObjectVmo.type;

        //set isLeaf on TreeModelObject
        treeVmNode.isLeaf = hasChildren === '0';

        if( treeVmNode ) {
            vmNodes.push( treeVmNode );
        }
    }
    colorDecoratorSvc.setDecoratorStyles( vmNodes );
    exports.calculateColorIndicatorForPersistedImpactedForExpandedObjects( vmNodes, data );
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReachedVar,
        endReachedVar, null );
}

/**
 * Build column information for Probable Impacted table.
 *
 * @param {ColumConfi} columnConfig - Column config returned by SOA
 * @param {UwDataProvider} dataProvider - The data provider for Probable Impacted table
 *
 */
function initColumsForProbableImpactedTable( columnConfig, dataProvider ) {
    // Build AW Columns
    var awColumnInfos = [];
    var columnConfigCols = columnConfig.columns;
    for ( var index = 0; index < columnConfigCols.length; index++ ) {
        // fix to increase column width for first column of probableImpacted Table
        var pixelWidth = columnConfigCols[index].pixelWidth;
        var enableColHiding = true;
        var sortDirection = '';
        var enableColumnMoving = true;
        if ( index === 0 ) {
            enableColHiding = false;
            sortDirection = 'Descending';
            enableColumnMoving = false;
        }
        var columnInfo = {
            field: columnConfigCols[index].propertyName,
            name: columnConfigCols[index].propertyName,
            propertyName: columnConfigCols[index].propertyName,
            displayName: columnConfigCols[index].displayName,
            typeName: columnConfigCols[index].typeName,
            pixelWidth: pixelWidth,
            hiddenFlag: columnConfigCols[index].hiddenFlag,
            enableColumnResizing: true,
            sortDirection:sortDirection,
            enableColumnMoving:enableColumnMoving,
            enableColumnHiding: enableColHiding,
            pinnedRight: false,
            enablePinning: false,
            enableCellEdit: false
        };
        var awColumnInfo = awColumnSvc.createColumnInfo( columnInfo );

        awColumnInfos.push( awColumnInfo );
    }

    // Set columnConfig to Data Provider.
    dataProvider.columnConfig = {
        columnConfigId: columnConfig.columnConfigId,
        columns: awColumnInfos
    };
}

/**
 * This function will return the Soa Input for createRelations
 * @param {data} data - View Model for Impact Analysis
 *
 * @return {object} createInput to create impacted relation name
 */
export let getCreateInputToCreteImpactedRelation = function( data ) {
    var inputData = {};
    var soaInput = [];

    // primary
    var changeObjectUid = data.selectedChangeObjectUid;
    var changeVMO = clientDataModelSvc.getObject( changeObjectUid );

    //secondary : get selected objects from probable impacted table
    var probableImpacted = [];
    var probableImpactedDataProvider = data.dataProviders.probableImpactedDataProvider;
    var selectedProxyObjects = probableImpactedDataProvider.selectedObjects;

    _.forEach( selectedProxyObjects, function( proxyObject ) {
        var underlyingObjectUid = proxyObject.props.cm0ProposedImpactedObject.dbValues[ 0 ];
        var underlyingObject = clientDataModelSvc.getObject( underlyingObjectUid );
        probableImpacted.push( underlyingObject );
    } );

    //create input
    _.forEach( probableImpacted, function( proxyObject ) {
        inputData = {
            clientId: '',
            primaryObject: changeVMO,
            relationType: 'CMHasImpactedItem',
            secondaryObject: proxyObject,
            userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
        };
        soaInput.push( inputData );
    } );
    return soaInput;
};

/**
 * Initializes Persisted Impacted Table and adds dataprovider to main
 * data of Impact Analysis ViewModel
 * @param {*} inContextData
 */
export let initializePersistedImpactedTable = function( inContextData ) {
    var data;
    if ( appCtxSvc.ctx.ImpactsViewData !== undefined ) {
        data = appCtxSvc.ctx.ImpactsViewData;
    }
    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.persistedImpactedDataProvider === undefined ) {
        data.dataProviders.persistedImpactedDataProvider = inContextData.dataProviders.persistedImpactedDataProvider;
        inContextData.selectedChangeObjectUid = data.selectedChangeObjectUid;
    }
};

/**
 * @param {Object} primaryObject - drop target object
 * @param {Array} secondaryObjects - dragged sources objects
 * @returns {Promise} Resolved when all processing is complete.
 */
export let defaultPasteHandlerForImpactAnalysis = function( primaryObject, secondaryObjects ) {
    var deferred = AwPromiseService.instance.defer();
    var relationType = 'CMHasImpactedItem';
    var input = [];
    var localTextBundle = localeSvc.getLoadedText( 'ChangeMessages' );
    var singleObjectPasted = localTextBundle.pasteImpactedSuccessMessage;
    var multipleObjectsPasted = localTextBundle.pasteMultipleImpactedSuccessMessage;
    singleObjectPasted = singleObjectPasted.replace( '{1}', primaryObject.changeVmo.props.object_string.dbValues[0] );
    multipleObjectsPasted = multipleObjectsPasted.replace( '{1}', primaryObject.changeVmo.props.object_string.dbValues[0] );
    var displayStr = '';
    for( var i = 0; i < secondaryObjects.length; i++ ) {
        var secondaryObject = secondaryObjects[ i ];
        var jsoObj = {
            clientId: '',
            primaryObject: {
                uid: primaryObject.changeVmo.uid,
                type: primaryObject.changeVmo.type
            },
            relationType: relationType,
            secondaryObject: {
                uid: secondaryObject.uid,
                type: secondaryObject.type
            }
        };
        input.push( jsoObj );
        if( secondaryObjects.length === 1 ) {
            displayStr += secondaryObjects[0].props.object_string.uiValues[0];
        }else if( i !== secondaryObjects.length - 1 ) {
            displayStr += secondaryObjects[i].props.object_string.uiValues[0] + ',';
        }else {
            displayStr += secondaryObjects[i].props.object_string.uiValues[0];
        }
    }

    var relInput = {
        input: input
    };

    soaSvc.post( 'Core-2006-03-DataManagement', 'createRelations', relInput ).then( function( response ) {
            eventBus.publish( 'resetPersistedImpactedTable.refreshTable' );
            if( secondaryObjects.length === 1 ) {
                 singleObjectPasted = singleObjectPasted.replace( '{0}', displayStr );
                 messageSvc.showInfo( singleObjectPasted );
             }else {
                 multipleObjectsPasted = multipleObjectsPasted.replace( '{0}', displayStr );
                 messageSvc.showInfo( multipleObjectsPasted );
             }
            deferred.resolve( response );
        },
        function( err ) {
            if( err.cause !== undefined && err.cause.updated !== undefined && err.cause.updated.length > 0 ) {
                eventBus.publish( 'resetPersistedImpactedTable.refreshTable' );
            }
            deferred.reject( err );
        } );


    return deferred.promise;
};

export let calculateColorIndicatorForProbableImpacted = function( data ) {
    if ( appCtxSvc.ctx.ImpactsViewData !== undefined ) {
        data = appCtxSvc.ctx.ImpactsViewData;
    }
    // Need to show color indicators for common items between probable impacted and persisted impacted
    var persistedImpactedUid = [];
    var persistedImpactedVmos = data.dataProviders.persistedImpactedDataProvider.viewModelCollection.loadedVMObjects;
    _.forEach( persistedImpactedVmos, function( vmo ) {
        persistedImpactedUid.push( vmo.uid );
    } );

    var probableImpactedVmos = data.dataProviders.probableImpactedDataProvider.viewModelCollection.loadedVMObjects;
    var modifiedVmo = [];
    _.forEach( probableImpactedVmos, function( vmo ) {
        vmo.colorTitle = '';
        vmo.cellDecoratorStyle = '';
        vmo.gridClassName = '';
        vmo.gridDecoratorStyle = '';

        if( persistedImpactedUid.includes( vmo.uid ) ) {
            vmo.cm0IsAlreadyImpacted = true;
            modifiedVmo.push( vmo );
        } else {
            vmo.cm0IsAlreadyImpacted = false;
            modifiedVmo.push( vmo );
        }
    } );

    colorDecoratorSvc.setDecoratorStyles( modifiedVmo );
    eventBus.publish( 'decoratorsUpdated', modifiedVmo );
};


/**
 * This will update indicator in Related Objects table
 * based on its addition/removal in Impacted Item table
 *
 *  @param {object} data view model data
 */
export let calculateColorIndicatorForRelObjectImpacted = function( data ) {
    if ( appCtxSvc.ctx.ImpactsViewData !== undefined ) {
        data = appCtxSvc.ctx.ImpactsViewData;
    }
    // Need to show color indicators for common items between probable impacted and persisted impacted
    var persistedImpactedUid = [];
    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.persistedImpactedDataProvider !== undefined
        && data.dataProviders.persistedImpactedDataProvider.viewModelCollection !== null ) {
        var persistedImpactedVmos = data.dataProviders.persistedImpactedDataProvider.viewModelCollection.loadedVMObjects;
        _.forEach( persistedImpactedVmos, function( vmo ) {
            persistedImpactedUid.push( vmo.uid );
        } );
    }
    var relationImpactedVmos = [];
    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.relationImpactedDataProvider !== undefined
        && data.dataProviders.relationImpactedDataProvider.viewModelCollection !== null ) {
        relationImpactedVmos = data.dataProviders.relationImpactedDataProvider.viewModelCollection.loadedVMObjects;
    }
    var modifiedVmo = [];
    _.forEach( relationImpactedVmos, function( vmo ) {
        vmo.colorTitle = '';
        vmo.cellDecoratorStyle = '';
        vmo.gridClassName = '';
        vmo.gridDecoratorStyle = '';
        if ( persistedImpactedUid.includes( vmo.uid ) ) {
            vmo.cm0IsAlreadyImpacted = true;
            modifiedVmo.push( vmo );
        } else if ( vmo.selected && vmo.cm0IsAlreadyImpacted === false ) {
            vmo.cm0IsAlreadyImpacted = true;
            modifiedVmo.push( vmo );
        } else {
            vmo.cm0IsAlreadyImpacted = false;
            modifiedVmo.push( vmo );
        }
    } );

    colorDecoratorSvc.setDecoratorStyles( modifiedVmo );
    eventBus.publish( 'decoratorsUpdated', modifiedVmo );
};


export let calculateColorIndicatorForPersistedImpacted = function( data ) {
    // Need to show color indicators for common items between probable impacted and persisted impacted

    if ( appCtxSvc.ctx.ImpactsViewData !== undefined && appCtxSvc.ctx.ImpactsViewMode !== 'RelationView' ) {
        data = appCtxSvc.ctx.ImpactsViewData;
    }
    // no need to calculate indicator in absence of Persisted Impacted table
    if ( data.dataProviders.persistedImpactedDataProvider === undefined ) {
        return;
    }
    var probableImpactedUid = [];
    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.relationImpactedDataProvider !== undefined ) {
        if ( data.dataProviders.relationImpactedDataProvider !== null && data.dataProviders.relationImpactedDataProvider.viewModelCollection !== null ) {
            var relationImpactedVmos = data.dataProviders.relationImpactedDataProvider.viewModelCollection.loadedVMObjects;
            _.forEach( relationImpactedVmos, function( vmo ) {
                probableImpactedUid.push( vmo.uid );
            } );
        }
    }
    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.probableImpactedDataProvider !== undefined ) {
        if ( data.dataProviders.probableImpactedDataProvider !== null && data.dataProviders.probableImpactedDataProvider.viewModelCollection !== null ) {
            var probableImpactedVmos = data.dataProviders.probableImpactedDataProvider.viewModelCollection.loadedVMObjects;
            _.forEach( probableImpactedVmos, function( vmo ) {
                probableImpactedUid.push( vmo.uid );
            } );
        }
    }
    var persistedImpactedVmos = [];

    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.persistedImpactedDataProvider !== null
        && data.dataProviders.persistedImpactedDataProvider.viewModelCollection !== null ) {
        persistedImpactedVmos = data.dataProviders.persistedImpactedDataProvider.viewModelCollection.loadedVMObjects;
    }
    var modifiedVmo = [];
    _.forEach( persistedImpactedVmos, function( vmo ) {
        vmo.colorTitle = '';
        vmo.cellDecoratorStyle = '';
        vmo.gridClassName = '';
        vmo.gridDecoratorStyle = '';
        if( probableImpactedUid.includes( vmo.uid ) ) {
            vmo.cm0IsAlreadyImpacted = true;
            modifiedVmo.push( vmo );
        } else {
            vmo.cm0IsAlreadyImpacted = false;
            modifiedVmo.push( vmo );
        }
    } );

    colorDecoratorSvc.setDecoratorStyles( modifiedVmo );
    eventBus.publish( 'decoratorsUpdated', modifiedVmo );
};

export let calculateColorIndicatorForPersistedImpactedForExpandedObjects = function( extraProbableImpactedVMO, data ) {
    if ( appCtxSvc.ctx.ImpactsViewData !== undefined ) {
        data = appCtxSvc.ctx.ImpactsViewData;
    }
    // Need to show color indicators for common items between probable impacted and persisted impacted
    var probableImpactedUid = [];
    var probableImpactedVmos = data.dataProviders.probableImpactedDataProvider.viewModelCollection.loadedVMObjects;

    //add new vmos to probable list
    _.forEach( extraProbableImpactedVMO, function( vmo ) {
        probableImpactedUid.push( vmo.uid );
    } );

    _.forEach( probableImpactedVmos, function( vmo ) {
        probableImpactedUid.push( vmo.uid );
    } );

    var persistedImpactedVmos = [];
    if ( data !== undefined && data.dataProviders !== undefined && data.dataProviders.persistedImpactedDataProvider !== undefined ) {
        persistedImpactedVmos = data.dataProviders.persistedImpactedDataProvider.viewModelCollection.loadedVMObjects;
    }
    var modifiedVmo = [];
    _.forEach( persistedImpactedVmos, function( vmo ) {
        vmo.colorTitle = '';
        vmo.cellDecoratorStyle = '';
        vmo.gridClassName = '';
        vmo.gridDecoratorStyle = '';
        if( probableImpactedUid.includes( vmo.uid ) ) {
            vmo.cm0IsAlreadyImpacted = true;
            modifiedVmo.push( vmo );
        } else {
            vmo.cm0IsAlreadyImpacted = false;
            modifiedVmo.push( vmo );
        }
    } );

    colorDecoratorSvc.setDecoratorStyles( modifiedVmo );
    eventBus.publish( 'decoratorsUpdated', modifiedVmo );
};

export let processPersistedImpactedTableSelection = function( data ) {
    // set relation context for cut functionality to work.
    var selection = data.dataProviders.persistedImpactedDataProvider.selectedObjects;
    var changeObjectUid = data.selectedChangeObjectUid;
    var changeVMO = clientDataModelSvc.getObject( changeObjectUid );
    appCtxSvc.ctx.relationContext = {};
    appCtxSvc.ctx.relationContext.relationInfo = [];
    if ( selection && selection.length > 0 ) {
        for ( var idx = 0; idx < selection.length; idx++ ) {
            var relInfo = {};
            relInfo.primaryObject = changeVMO;
            relInfo.secondaryObject = selection[idx];
            relInfo.relationType = 'CMHasImpactedItem';
            appCtxSvc.ctx.relationContext.relationInfo.push( relInfo );
        }
    }
    //required for cut operation message , that uses mselected,pselected
    // due to relation browser resetting the pselected/mselected in Relation View ,it is lost.
    appCtxSvc.updatePartialCtx( 'pselected', changeVMO );
    appCtxSvc.updatePartialCtx( 'mselected', selection );
};
/**
 * Deselect Relation Browser Graph selection
 * This is required while selecting in persisted impacted table in Relation View.
 * Also required to deselect graph after adding or removing impacted items in Relation view
 *
 * @param {*} graphModel
 */
export let deSelectRelationBrowserGraph = function( graphModel ) {
    if ( graphModel !== undefined && graphModel !== null && graphModel.numSelected !== undefined && graphModel.numSelected > 0 ) {
        graphModel.graphControl.setSelected( null, false, appCtxSvc.ctx.selectedChangeVmo );
    }
};
/**
 * This will store probableImpacted table selection when its
 * Related Objects are searched.This is done , because the former selection is
 * lost , once its found related objects are selected in related objects table.
 *
 *  @param {object} data view model data
 */
export let saveProbableImpactedTableSelection = function( inContextData ) {
    var data;
    if ( appCtxSvc.ctx.ImpactsViewData !== undefined ) {
        data = appCtxSvc.ctx.ImpactsViewData;
    }
    // when selection is in related table & the related object search is called, it is because of columnArrange or filter or sorting.
    // search will clear any relation item selection, so probable impacted selection should be set.
    // no need to re-save probable impacted selection.
    if ( data.dataProviders.probableImpactedDataProvider.selectedObjects.length === 0 ) {
        if ( data.dataProviders.persistedImpactedDataProvider.selectedObjects.length === 0 ) {
            eventBus.publish( 'setProbableImpactedTableSelection' );
        }
        return;
    }
    if ( data !== undefined && data.dataProviders !== undefined &&
        ( data.dataProviders.relationImpactedDataProvider === undefined || data.dataProviders.relationImpactedDataProvider.selectionModel === null ) ) {
        data.dataProviders.relationImpactedDataProvider = inContextData.dataProviders.relationImpactedDataProvider;
    }
    probableImpactedTableSelection = [];
    if ( data.dataProviders.probableImpactedDataProvider.selectedObjects.length === 1 ) {
        var probableImpactedTableSelObj = data.dataProviders.probableImpactedDataProvider.selectedObjects[0];
        probableImpactedTableSelection.push( probableImpactedTableSelObj );
        data.probableImpactedTablePrevSel.dbValue = probableImpactedTableSelObj.props.cm0ProposedImpactedObject.dbValue;
    } else {
        data.probableImpactedTablePrevSel.dbValue = null;
    }
};

/**
 * This will restore the probableImpacted Table selection,
 * when all the objects in related Object table is deselected.
 *
 *  @param {object} data view model data
 */
export let setProbableImpactedTableSelection = function( data ) {
    data.dataProviders.probableImpactedDataProvider.selectionModel.setSelection( probableImpactedTableSelection );
};
/**
 * This function will expand the loaded first node in probable impacted table,
 * if it is not already expanded. Also it will select the first node and display Related Object table
 * if there are related objects to it.
 *
 * @param {object} data
 * @param {object} loadedTreeNodes loaded tree nodes of probable impacted table
 */
export let expandAndSelectFirstLevelTreeNode = function( data, loadedTreeNodes ) {
    _.defer( function() {
        // The  deferred calls are made
        // to allow the tree to draw before we asked it to expand a node.
        if ( loadedTreeNodes.length > 0 ) {
            var expandNode = loadedTreeNodes[0];

            // Checks if node is not null and not expanded then only set
            // isExpanded to true and fire the event
            if ( expandNode && !expandNode.isExpanded ) {
                expandNode.isExpanded = true;
                eventBus.publish( 'probableImpactedGrid.plTable.toggleTreeNode', expandNode );
            }
            var lastNode = loadedTreeNodes[loadedTreeNodes.length - 1];
            if ( expandNode && expandNode.selected === false && lastNode._expandRequested !== true ) {
                if ( data !== undefined && probableImpactedTableSelection.length === 0 ) {
                    data.dataProviders.probableImpactedDataProvider.selectionModel.setSelection( expandNode );
                    probableImpactedTableSelection[0] = expandNode;
                }
            }
        }
        hasProblemItemSelectionChanged = false;
    } );
};

/**
 * This function sets targetvmo to ChangeImpactedItem for drag and drop
 * on persisted impacted table element. It will also set the allowed source types for drop
 * on this table and will set dropuid to selected change for source to be pasted on.
 * @param {object} data
*/
export let setDropTargetOnPersistedImpactedTable = function( data ) {
    data.vmo = appCtxSvc.ctx.vmo;
};


/**
 * "dropHandlers" are used to enable and customize the drop operation for a view and
 * the components inside it. If a dropHandler is activated for a certain view, then
 * the same dropHandler becomes applicable to all the components inside the view.
 * This means, we can handle any drop/dragEnter/dragOver operation for any component
 * inside a view at the view level. Not all the components used inside a view have
 * drop configured, when a dropHandler is active for a view.
 * The action associated bind-ed with drag actions is expected to be a synchronous
 * javascript action. we can only associate declarative action type syncFunction with
 * drag actions. At runtime the js function (bind-ed with drag action) receives a system
 * generated object as the last parameter of the function.
 *
 * For more info  :- http://swf/showcase/#/showcase/Declarative%20Configuration%20Points/dragAndDrop
 *
 * @param {default parameters for DnD} dragAndDropParams
 */
export let tableViewDragOver = ( dragAndDropParams ) => {
    let targetObjects = dragAndDropParams.targetObjects;
    if( dragAndDropParams.dataProvider && !targetObjects ) {
            return {
                dropEffect: 'copy',
                stopPropagation: true,
                preventDefault : true
            };
   }
   return {
        dropEffect: 'none',
        stopPropagation: true
    };
};

/**
 * Function (dropHandler) to create a relation between the impacted item dragged over on persisted
 * impacted table, and the change object, when that item is dropped over the table.
 *
 * @param {default parameters for DnD} dragAndDropParams
 */
export let tableViewDropOver = ( dragAndDropParams ) => {

    // Below fix is needed as their is one specific issue with firefox where drop object is
    // being opened. Fix for defect # LCS-687300
    dragAndDropParams.event.stopPropagation();
    dragAndDropParams.event.preventDefault();

    if( appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_ImpactAnalysis'
      || appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_ImpactAnalysis' ) {
        let curr = {};
        curr.targetObject = appCtxSvc.ctx.vmo;
        curr.relationType = 'CMHasImpactedItem';
        curr.sourceObjects = appCtxSvc.ctx.mselected;
        eventBus.publishOnChannel( {
            channel: 'paste',
            topic: 'drop',
            data: {
                pasteInput: [ curr ]
            }
        } );
    }
};

export default exports = {
    getChangeObjectUid,
    publishAddImpactedFromCommandViewModel,
    getProblemItemList,
    handleProblemItemSelection,
    loadProbableImpactedTree,
    processRelObjectsJSONResponse,
    getCreateInputToCreteImpactedRelation,
    defaultPasteHandlerForImpactAnalysis,
    calculateColorIndicatorForProbableImpacted,
    calculateColorIndicatorForRelObjectImpacted,
    calculateColorIndicatorForPersistedImpacted,
    calculateColorIndicatorForPersistedImpactedForExpandedObjects,
    processPersistedImpactedTableSelection,
    saveProbableImpactedTableSelection,
    setProbableImpactedTableSelection,
    expandAndSelectFirstLevelTreeNode,
    initializePersistedImpactedTable,
    publishCutRelationFromCommandViewModel,
    deSelectRelationBrowserGraph,
    getProbableImpactedUid,
    setDropTargetOnPersistedImpactedTable,
    tableViewDragOver,
    tableViewDropOver
};
/**
 *
 * @memberof NgServices
 * @member Cm1ImpactedWidgetService
 *
 *  @param {Object} $q: Queue service
 *  @param {Object} clientDataModelSvc: client data model service
 *  @param {Object} awTableSvc: AW Table service
 *  @param {Object} soaSvc: SOA service
 *  @param {Object} appCtxSvc: appCtxService
 *  @param {Object} treeTableUtil: Tree Table Util
 *  @return {Object} service exports exports
 *
 */
app.factory( 'Cm1ImpactedWidgetService', () => exports );
