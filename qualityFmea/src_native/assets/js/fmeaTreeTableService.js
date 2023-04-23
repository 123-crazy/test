// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/fmeaTreeTableService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import AwPromiseService from 'js/awPromiseService';
import awTableStateService from 'js/awTableStateService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import treeTableDataService from 'js/treeTableDataService';
import localeSvc from 'js/localeService';
import messagingSvc from 'js/messagingService';
import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import awIconService from 'js/awIconService';
import awColumnSvc from 'js/awColumnService';

const _qfm0FMEANode = 'Qfm0FMEANode';
const _qfm0FailureElement = 'Qfm0FailureElement';
const _qfm0FunctionElement = 'Qfm0FunctionElement';
const _qfm0SystemElement = 'Qfm0SystemElement';
const _qam0QualityAction = 'Qam0QualityAction';
const _externalFunctionContainerIconId = 'typeFunctionRepresentationGroup48.svg';
const _externalFailureContainerIconId = 'typeFMEAFailureRepresentationGroup48.svg';
const _qfm0SequenceProperty = 'qfm0Sequence';
const _qam0SequenceProperty = 'qam0Sequence';
const _pseudoFolderType = 'PseudoFolder';

var _mapNodeId2ChildArray = {};
var _fmeaRootNodeUid;
var _maxTreeLevel = _getPreferenceValueForShowingActions() ? 5 : 3;
var fmeaMsgResource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
var localTextBundle = localeSvc.getLoadedText( fmeaMsgResource );
var externalFunctionText = localTextBundle.qfm0ExternalFunctionNodeName;
var externalFailureText = localTextBundle.qfm0ExternalFailureNodeName;

/**
 * Cached static default AwTableColumnInfo.
 */
var _firstColumnConfigColumnPropertyName = 'object_name';

var exports = {};

/**
 * @param {Array} sortCriterias - Array of fieldName and sortCriteria.
 * @param {TreeLoadInput} loadInput - TreeLoadInput
 */
var _populateSortCriteriaParameters = function( sortCriterias, loadInput ) {
    var sortCriteria = {};
    if ( !_.isEmpty( loadInput.sortCriteria ) ) {
        sortCriteria = loadInput.sortCriteria[0];
    }
    sortCriterias.push( sortCriteria );
};

/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 * @param {response} response
 **/
var _buildTreeTableStructure = function( parentNode, response, isLoadAllEnabled ) {
    var children = [];

    var modelObjects = response;
    _mapNodeId2ChildArray[parentNode.id] = children;
    if ( modelObjects ) {
        var levelNdx = parentNode.levelNdx + 1;
        for ( var childNdx = 1; childNdx <= modelObjects.length; childNdx++ ) {
            var vmNode = exports.createVmNodeUsingNewObjectInfo( modelObjects[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled );
            children.push( vmNode );
        }
    }
    return children;
};

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled ) {
    var nodeDisplayName = modelObject.props.object_string.dbValues[0];
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var iconURL;

    if ( modelObject.type === _pseudoFolderType && modelObject.props.object_string.dbValues[0] === externalFailureText ) {
        iconURL = iconSvc.getTypeIconFileUrl( _externalFailureContainerIconId );
    } else if ( modelObject.type === _pseudoFolderType && modelObject.props.object_string.dbValues[0] === externalFunctionText ) {
        iconURL = iconSvc.getTypeIconFileUrl( _externalFunctionContainerIconId );
    } else {
        iconURL = iconSvc.getTypeIconURL( type );
    }

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, nodeDisplayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = true;

    if ( modelObject.type === _pseudoFolderType ) {
        vmNode.isLeaf = false;
        vmNode.props = {};
    }
    var generateFmeaVariantView = appCtxService.getCtx( 'fmeaContext.showGenFmeaVariantView' );

    if ( generateFmeaVariantView && modelObject.props.qfm0ChildSystemElementsList && modelObject.props.qfm0ChildSystemElementsList.dbValues.length > 0
    ||   ( !generateFmeaVariantView || generateFmeaVariantView === undefined ) && ( modelObject.props.qfm0ChildSystemElementsList && modelObject.props.qfm0ChildSystemElementsList.dbValues.length > 0 ||
        modelObject.props.qfm0FunctionsElementsList && modelObject.props.qfm0FunctionsElementsList.dbValues.length > 0 ||
        modelObject.props.qfm0FailureElementsList && modelObject.props.qfm0FailureElementsList.dbValues.length > 0 ||
        modelObject.props.qfm0SystemElementsList && modelObject.props.qfm0SystemElementsList.dbValues.length > 0 ||
        modelObject.props.qam0DependentQualityActions && modelObject.props.qam0DependentQualityActions.dbValues.length > 0 || modelObject.type === _pseudoFolderType ||
        _getPreferenceValueForShowingActions() && modelObject.props.qfm0HasActions && modelObject.props.qfm0HasActions.dbValues &&
        modelObject.props.qfm0HasActions.dbValues[0] === '1' )  ) {
        vmNode.isLeaf = false;
    }
    vmNode.selected = false;
    return vmNode;
};

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 *
 */
function _loadTreeTableRows( deferred, treeLoadInput, dataProvider ) {
    /**
     * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
     */
    var parentNode = treeLoadInput.parentNode;

    var targetNode;
    // this context value comes true only when breadcrumb is updated from chevron
    if ( !parentNode.isExpanded ) {
        var locationCtx = appCtxService.getCtx( 'locationContext' );
        targetNode = locationCtx.modelObject;
    } else {
        targetNode = parentNode;
    }

    if ( !parentNode.isLeaf ) {
        var nChild = parentNode.children ? parentNode.children.length : 0;
        var children = [];
        var searchCriteria = {
            parentUid: parentNode.type === _pseudoFolderType ? _fmeaRootNodeUid : targetNode.uid
        };
        var generateFmeaVariantView = appCtxService.getCtx( 'fmeaContext.showGenFmeaVariantView' );
        if ( generateFmeaVariantView ) {
            searchCriteria.ElementType = _qfm0SystemElement;
        }
        // if (nChild === 0) {
        // get props with intial tree for now. In future, should set this to false and populate
        // the props seperately.
        var isLoadAllEnabled = true;
        var policyId = propertyPolicySvc.register( {
            types: [
                {
                    name: 'Qam0QualityAction',
                    properties: [
                        {
                            name: 'object_name'
                        },
                        {
                            name: 'qam0DependentQualityActions'
                        }
                    ]
                },
                {
                    name: 'Qfm0FailureElement',
                    properties: [
                        {
                            name: 'object_name'
                        },
                        {
                            name: 'qfm0HasActions'
                        }
                    ]
                }
            ]
        } );
        var soaInput2 = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: 'Qfm0FmeaTreeURI',
                operationType: 'as_configured'
            },
            searchInput: {
                maxToLoad: 100,
                maxToReturn: 100,
                providerName: 'Qfm0FMEADataProvider',
                searchCriteria: searchCriteria,
                startIndex: treeLoadInput.startChildNdx,
                searchSortCriteria: [ ]
            }
        };

        if ( !generateFmeaVariantView ) {
            soaInput2.searchInput.searchCriteria.View = 'FmeaTreeView';
        }

        _populateSortCriteriaParameters( soaInput2.searchInput.searchSortCriteria, treeLoadInput );
        if ( parentNode.levelNdx < 0 ) {
            if( generateFmeaVariantView ) {
                soaInput2.searchInput.searchCriteria.returnParent = 'false';
            } else {
                soaInput2.searchInput.searchCriteria.returnParent = 'true';
            }
            soaInput2.searchInput.searchCriteria.ElementType = _qfm0SystemElement;
            return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput2 ).then(
                function( response ) {
                    if ( response.searchResultsJSON ) {
                        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                        if ( searchResults ) {
                            let parentNodeModelObj = cdm.getObject( parentNode.uid );

                            // Add new node for External Function and External Failure if required
                            if ( parentNodeModelObj && parentNodeModelObj.modelType &&
                                ( parentNodeModelObj.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 || parentNodeModelObj.modelType.typeHierarchyArray.indexOf( _qfm0SystemElement ) > -1 ) ) {
                                _fmeaRootNodeUid = qfm0FmeaManagerUtils.getFmeaRootNodeUid();
                                children = _pushSearchResultsToChildrenArray( searchResults, response, children );
                                _buildOrUpdateTreeLoadResult( response, parentNode, treeLoadInput, children, false, isLoadAllEnabled, deferred );
                            }
                        }
                    }
                } );
            } else if ( parentNode.levelNdx < _maxTreeLevel ) {
            soaInput2.searchInput.searchCriteria.returnParent = 'false';
            if ( parentNode.type === 'Qfm0FMEANode' ) {
                soaInput2.searchInput.searchCriteria.ElementType = _qfm0SystemElement;
            }else if ( parentNode.type === _pseudoFolderType && parentNode.displayName === externalFunctionText ) {
                soaInput2.searchInput.searchCriteria.ElementType = _qfm0FunctionElement;
            } else if ( parentNode.type === _pseudoFolderType && parentNode.displayName === externalFailureText ) {
                soaInput2.searchInput.searchCriteria.ElementType = _qfm0FailureElement;
            } else {
                let sortProperty = updateSortProperty( parentNode.uid, soaInput2.searchInput.searchSortCriteria );
                if( soaInput2.searchInput.searchSortCriteria.length > 0 && soaInput2.searchInput.searchSortCriteria[0] ) {
                    soaInput2.searchInput.searchSortCriteria[0].fieldName = sortProperty;
                }
            }
            return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput2 ).then(
                function( response ) {
                    if ( response.searchResultsJSON ) {
                        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                        if ( searchResults ) {
                            let parentNodeModelObj = cdm.getObject( parentNode.uid );
                            for ( var x = 0; x < searchResults.objects.length; ++x ) {
                                var uid = searchResults.objects[x].uid;
                                var obj = response.ServiceData.modelObjects[uid];
                                if ( obj ) {
                                    children.push( obj );
                                }
                            }
                        }
                    }
                    propertyPolicySvc.unregister( policyId );
                    _buildOrUpdateTreeLoadResult( response, parentNode, treeLoadInput, children, true, isLoadAllEnabled, deferred );
                } );
        }

            parentNode.isLeaf = true;
            var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
            var endReached = parentNode.endReached;
            var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, true, true,
                endReached, null );
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
            propertyPolicySvc.unregister( policyId );
    }
}

/**
 * Set Sequence property (qam0Sequence) for Actions in case if sorting is based on FMEA Elements Sequence (qfm0Sequence) property
 * @param {String} parentNodeUid
 * @param {Array} searchSortCriteria
 * @returns {String} sortProperty
 */
 export let updateSortProperty = function( parentNodeUid, searchSortCriteria ) {
    let sortProperty = searchSortCriteria && searchSortCriteria.length > 0 && searchSortCriteria[0] && searchSortCriteria[0].fieldName ? searchSortCriteria[0].fieldName : '';
    let parentObject = cdm.getObject( parentNodeUid );
    if( parentObject && parentObject.modelType && ( parentObject.modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1 ||
    parentObject.modelType.typeHierarchyArray.indexOf( _qam0QualityAction ) > -1 ) ) {
        if( searchSortCriteria && searchSortCriteria.length > 0 && searchSortCriteria[0] &&
            ( !searchSortCriteria[0].fieldName || searchSortCriteria[0].fieldName === _qfm0SequenceProperty ) ) {
            sortProperty = _qam0SequenceProperty;
        }
    }
    return sortProperty;
};

/**
 * Push objects received in search results to children array
 * @param {Object} searchResults
 * @param {Object} response
 * @param {Array} children
 * @returns children array
 */
function _pushSearchResultsToChildrenArray( searchResults, response, children ) {
    for ( var x = 0; x < searchResults.objects.length; ++x ) {
        var uid = searchResults.objects[x].uid;
        var obj = response.ServiceData.modelObjects[uid];
        if ( obj ) {
            children.push( obj );
        }
    }
    return children;
}

/**
 * Build or update treeLoadResult
 */
function _buildOrUpdateTreeLoadResult( response, parentNode, treeLoadInput, children, isRootTreeNode, isLoadAllEnabled, deferred ) {
    var tempCursorObject = {};
    if( response.cursor ) {
        tempCursorObject = response.cursor;
    }
    treeLoadInput.parentNode.totalFound = response.totalFound;
    if ( response.totalFound === 0 ) {
        parentNode.isLeaf = true;
        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, isRootTreeNode, response.cursor.startReached, response.cursor.endReached, null );
        treeLoadResult.parentNode.cursorObject = tempCursorObject;
        deferred.resolve( {
            treeLoadResult: treeLoadResult
        } );
    } else {
        var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, response.cursor.startReached, response.cursor.endReached );
        treeLoadResult.parentNode.cursorObject = tempCursorObject;
        deferred.resolve( {
            treeLoadResult: treeLoadResult
        } );
    }
}

/**
 *
 * @param {parentNode} parentNode -
 * @param {children} children -
 * @param {isLoadAllEnabled} isLoadAllEnabled -
 * @param {actionObjects} actionObjects -
 * @param {treeLoadInput} treeLoadInput -
 * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
 *
 **/
function _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached ) {
    _buildTreeTableStructure( parentNode, children, isLoadAllEnabled );
    var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
    return awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, true, startReached, endReached, null );
}
/**
* Get a page of row data for a 'tree' table.
*
* @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
*            function is invoked from. The object is usually the result of processing the 'inputData' property
*            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
*            properties on this object is used (if defined).
*/

export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    arguments[0].updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    arguments[0].propertyLoadInput.propertyLoadRequests[0].childNodes = arguments[0].uwDataProvider.viewModelCollection.loadedVMObjects;
    let updatedChildNodes = [];
    for ( var i = 0; i < arguments[ 0 ].propertyLoadInput.propertyLoadRequests[0].childNodes.length; i++ ) {
        if( arguments[ 0 ].propertyLoadInput.propertyLoadRequests[0].childNodes[i].type !== _pseudoFolderType ) {
            updatedChildNodes.push( arguments[ 0 ].propertyLoadInput.propertyLoadRequests[0].childNodes[i] );
        }
    }
    arguments[ 0 ].propertyLoadInput.propertyLoadRequests[0].childNodes = updatedChildNodes;
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTableProperties( arguments[0] ) );
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {TreeLoadInput} treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 *
 * <pre>
 * {
 * Extra 'debug' Properties
 *     delayTimeTree: {Number}
 * }
 * </pre>
 *
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableData = function() {
    /**
     * Extract action parameters from the arguments to this function.
     */
    var treeLoadInput = arguments[0];

    if ( arguments[4] ) {
        treeLoadInput.retainTreeExpansionStates = true;
    }
    treeLoadInput.sortCriteria = arguments[4];

    appCtxService.ctx.treeVMO = arguments[3];

    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var delayTimeTree = 0;

    for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ndx];

        if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeTree' ) {
            delayTimeTree = arg.dbValue;
        } else if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'maxTreeLevel' ) {
            _maxTreeLevel = arg.dbValue;
        }
    }

    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if ( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if ( delayTimeTree > 0 ) {
        _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput, arguments[3] );
    } else {
        _loadTreeTableRows( deferred, treeLoadInput, arguments[3] );
    }
    if( treeLoadInput.sortCriteria && treeLoadInput.sortCriteria.length > 0 && treeLoadInput.sortCriteria[0] && treeLoadInput.sortCriteria[0].fieldName === _qam0SequenceProperty ) {
        treeLoadInput.sortCriteria[0].fieldName = _qfm0SequenceProperty;
    }

    return deferred.promise;
};

/**
 * This method ensures that the s_uid in url is selected in the primary workarea.
 * This is required for selection sync of url and primary workarea
 *
 * @param {data} data
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function( selectionModel, data ) {
    var selectedModelObject = {};
    var viewModelCollection = data.dataProviders.fmeaDataProvider.viewModelCollection;
    if ( appCtxService.ctx.fmeaManagerContext ) {
        selectedModelObject = appCtxService.ctx.fmeaManagerContext.selectedNodes;
    }
    if ( selectionModel ) {
        if ( AwStateService.instance.params.hasOwnProperty( 's_uid' ) && AwStateService.instance.params.s_uid === null && appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_FormSheet' ) {
            appCtxService.updateCtx( 'selected', appCtxService.ctx.locationContext.modelObject );
            appCtxService.updateCtx( 'mselected', [ appCtxService.ctx.locationContext.modelObject ] );
        }
        if ( data.eventData && data.eventData.addElementInput && selectedModelObject && selectedModelObject.length > 0 && viewModelCollection.loadedVMObjects.length > 0 ) {
            if ( appCtxService.ctx.tcSessionData.tcMajorVersion < 13 ) {
                if ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_FormSheet' &&
                    appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_NetView' &&
                    appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_ProcessFlowChart' ) {
                    selectionModel.setSelection( selectedModelObject[0] );
                }
            } else if ( appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 ) {
                if ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_FormSheet' &&
                    appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_StructureAnalysis' &&
                    appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_ProcessFlowChart' &&
                    ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_Function_Analysis' && !appCtxService.ctx.showFunctionNetView ) &&
                    ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_Failure_Analysis' && !appCtxService.ctx.showFailureNetView ) ) {
                    selectionModel.setSelection( selectedModelObject[0] );
                }
            }

            if ( data.eventData.addElementInput[0].objects[0].uid === selectedModelObject[0].uid ) {
                var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
                    return vmo.uid === selectedModelObject[0].props.qfm0ParentElement.dbValues[0];
                } );
                if ( parentIdx > -1 ) {
                    var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
                    addNodeToExpansionState( parentVMO, data );
                }
            } else {
                addNodeToExpansionState( selectedModelObject[0], data );
            }

            appCtxService.ctx.fmeaManagerContext.selectedNodes = [];
        }
    }
};

export let updateParentStateOnDelete = function( data ) {
    if ( data.eventData.objForSelection !== undefined ) {
        data.dataProviders.fmeaDataProvider.selectionModel.setSelection( data.eventData.objForSelection );
        appCtxService.updateCtx( 'selected', data.eventData.objForSelection );
    }
};

/**
 * Add local storage entry corresponding to the information sent in.
 *
 * @param node This parameter can either be the node that is to be added to local storage or it can be just the id
 *            of the node
 * @param declViewModel The declarative view model backing this tree
 */
export let addNodeToExpansionState = function( node, declViewModel ) {
    // For now we will use id of the grid that is first in the list of grids in the view model.
    // Once we get this value in treeLoadInput we will shift to using it.
    var gridId = Object.keys( declViewModel.grids )[0];
    awTableStateService.saveRowExpanded( declViewModel, gridId, node );
};

/**
 * Update selected nodes in context based on pin value
 * selected node set as new object if pinnedToForm is true
 * selected node set as current selection if pinnedToForm is false
 * @param {DeclViewModel} data
 */
export let selectNewlyAddedElement = function( data ) {
    appCtxService.ctx.fmeaManagerContext = {};
    appCtxService.ctx.fmeaManagerContext.selectedNodes = [];

    if ( data.dataProviders.loadFilteredList.selectedObjects.length > 1 && appCtxService.ctx.selected.type !== 'Qfm0FMEANode' ) {
        appCtxService.ctx.fmeaManagerContext.selectedNodes.push( appCtxService.ctx.selected );
    } else if ( data.dataProviders.loadFilteredList.selectedObjects.length > 1 && appCtxService.ctx.selected.type === 'Qfm0FMEANode' ) {
        // appCtxService.ctx.fmeaManagerContext.selectedNodes must be empty
    } else {
        if ( data.pinnedToForm.dbValue ) {
            appCtxService.ctx.fmeaManagerContext.selectedNodes = data.selectedNodes;
        } else {
            if ( appCtxService.ctx.selected && appCtxService.ctx.selected.type !== 'Qfm0FMEANode' ) {
                appCtxService.ctx.fmeaManagerContext.selectedNodes.push( appCtxService.ctx.selected );
            }
        }
    }
};

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * eventData : {Object} containing viewModelObjects and totalObjectsFound
 */
export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if ( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnConfigColumnPropertyName );
        } );
    }

    if ( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnConfigColumnPropertyName );
            } );
        } );
    }
};

function _getPreferenceValueForShowingActions() {
    let ctxPreferences = appCtxService.getCtx( 'preferences' );
    return Boolean( ctxPreferences && ctxPreferences.Show_actions_in_FMEA_tree && ctxPreferences.Show_actions_in_FMEA_tree[0] &&
        ctxPreferences.Show_actions_in_FMEA_tree[0].toUpperCase() === 'TRUE' );
}

/**
 * Function to update tree table columns
 * @param {Object} data Contains data
 * @param {Object} dataProvider Contains data provider for the tree table
 */
export let updateFmeaTreeTableColumns = function( data, dataProvider ) {
    let output = {};
    if ( dataProvider && data && data.newColumnConfig ) {
        var propColumns = data.newColumnConfig.columns;
        updateColumnPropsAndNodeIconURLs( propColumns, dataProvider.getViewModelCollection().getLoadedViewModelObjects() );
        data.newColumnConfig.columns = propColumns;
        dataProvider.columnConfig = data.newColumnConfig;
    }
    output.newColumnConfig = data.newColumnConfig;
    output.columnConfig = dataProvider.columnConfig;
    return output;
};


/**
 * Create Callback function.
 *
 * @return {Object} A Object consisting of callback function.
 */
function getDataForUpdateColumnPropsAndNodeIconURLs() {
    var updateColumnPropsCallback = {};

    updateColumnPropsCallback.callUpdateColumnPropsAndNodeIconURLsFunction = function( propColumns, allChildNodes, contextKey, response ) {
        updateColumnPropsAndNodeIconURLs( propColumns, allChildNodes );
        return response.output.columnConfig;
    };

    return updateColumnPropsCallback;
}

/**
 * Function to update tree table columns props and icon urls
 * @param {Object} propColumns Contains prop columns
 * @param {Object} childNodes Contains tree nodes
 */
function updateColumnPropsAndNodeIconURLs( propColumns, childNodes ) {
    _.forEach( propColumns, function( col ) {
        if ( !col.typeName && col.associatedTypeName ) {
            col.typeName = col.associatedTypeName;
        }
    } );
    propColumns[0].enableColumnMoving = false;
    _firstColumnConfigColumnPropertyName = propColumns[0].propertyName;

    _.forEach( childNodes, function( childNode ) {
        if ( childNode.type === _pseudoFolderType && childNode.props.object_string.dbValues[0] === externalFailureText ) {
            childNode.iconURL = iconSvc.getTypeIconFileUrl( _externalFailureContainerIconId );
        } else if ( childNode.type === _pseudoFolderType && childNode.props.object_string.dbValues[0] === externalFunctionText ) {
            childNode.iconURL = iconSvc.getTypeIconFileUrl( _externalFunctionContainerIconId );
        } else {
            childNode.iconURL = awIconService.getTypeIconFileUrl( childNode );
        }
        treeTableDataService.updateVMODisplayName( childNode, _firstColumnConfigColumnPropertyName );
    } );
}


export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey ) {
    var updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    let updatedChildNodes = [];
    for ( var i = 0; i < vmNodes.length; i++ ) {
        if( vmNodes[i].type !== _pseudoFolderType ) {
            updatedChildNodes.push( vmNodes[i] );
        }
    }

    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTablePropertiesOnInitialLoad( updatedChildNodes, declViewModel,
        uwDataProvider, context, contextKey, updateColumnPropsCallback ) );
};

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function() {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [ {
        name: 'object_name',
        displayName: '...',
        typeName: 'WorkspaceObject',
        width: 400,
        isTreeNavigation: true,
        enableColumnMoving: false,
        enableColumnResizing: false
    } ];

    awColumnSvc.createColumnInfo( awColumnInfos );

    deferred.resolve( {
        columns: awColumnInfos
    } );

    return deferred.promise;
};

export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableProperties,
    loadTreeTableData,
    processPWASelection,
    selectNewlyAddedElement,
    updateDisplayNames,
    addNodeToExpansionState,
    updateParentStateOnDelete,
    updateFmeaTreeTableColumns,
    loadTreeTablePropertiesOnInitialLoad,
    loadTreeTableColumns,
    updateSortProperty
};
/**
 * @memberof NgServices
 * @member correctiveActionDataService2
 */
app.factory( 'fmeaTreeTableService', () => exports );

