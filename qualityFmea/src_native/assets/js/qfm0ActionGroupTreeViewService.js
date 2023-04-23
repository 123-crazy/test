// Copyright (c) 2021 Siemens

/**
 * @module js/qfm0ActionGroupTreeViewService
 */
import _ from 'lodash';
import app from 'app';
import appCtxService from 'js/appCtxService';
import soaSrv from 'soa/kernel/soaService';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import uwPropertySvc from 'js/uwPropertyService';
import dms from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import parsingUtils from 'js/parsingUtils';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import iconSvc from 'js/iconService';
import treeTableDataService from 'js/treeTableDataService';
import awIconService from 'js/awIconService';
import uwPropertyService from 'js/uwPropertyService';
import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
import _localeSvc from 'js/localeService';
import messagingService from 'js/messagingService';

var exports = {};
var _maxTreeLevel = 3;
var _mapNodeId2ChildArray = {};
var _firstColumnPropertyName = null;
const _qam0QualityActionURI = 'Qam0QualityActionURI';
const _qam0QualityActionAPURI = 'Qam0QualityActionAPURI';
const _qam0QualityActionRPNURI = 'Qam0QualityActionRPNURI';
const _qfm0ActionPriority = 'Action Priority';
const _qfm0RiskPriorityNumber = 'Risk Priority Number';
const _qualityDependentActionsObjectSet = 'qam0DependentQualityActions.Qam0QualityAction';
const _qfm0ControlActionObjectSet = 'Qfm0ControlAction.WorkspaceObject';
const _qfm0OptimizationActionObjectSet = 'Qfm0OptimizationAction.WorkspaceObject';

//Map of property name and disply value for the SPLM tree table
var _mapOfColPropNameAndDisplayName = new Map();

/**
 * This function is responsible for pre configuration of the tree load input needed to load the tree table rows.
 *
 * @return {Object}  promise
 */
export let loadActionGroupsAndDependentActionsData = function() {
    var treeLoadInput = arguments[0];
    var data = arguments[3];
    treeLoadInput.sortCriteria = arguments[4];
    treeLoadInput.retainTreeExpansionStates = true;
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
        _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput, data );
    } else {
        _loadTreeTableRows( deferred, treeLoadInput, data );
    }
    return deferred.promise;
};

/**
 * This function sets the column configuration of the tree table
* @param {object} data - data object
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
export let loadTreeTableColumns = function( data, uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();
    var colInfos = [];
    _mapOfColPropNameAndDisplayName.clear();
    getFMEAGuidelineObject( deferred ).then( ( response ) => {
        var clientScopeURI = getClientScopeURI();
        if ( clientScopeURI ) {
            _mapOfColPropNameAndDisplayName.set( 'object_name', data.i18n.qfm0Name );
            _mapOfColPropNameAndDisplayName.set( 'qam0QualityActionSubtype', data.i18n.qfm0QualActionSubType );
            _mapOfColPropNameAndDisplayName.set( 'qam0Occurrence', data.i18n.qfm0QualActionOccurence );
            _mapOfColPropNameAndDisplayName.set( 'qam0Detection', data.i18n.qfm0QualActionDetection );
            if ( clientScopeURI === _qam0QualityActionAPURI ) {
                _mapOfColPropNameAndDisplayName.set( 'REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority', data.i18n.qfm0ActionPriority );
            } else if ( clientScopeURI === _qam0QualityActionRPNURI ) {
                _mapOfColPropNameAndDisplayName.set( 'REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN', data.i18n.qfm0RPN );
            }
            _mapOfColPropNameAndDisplayName.set( 'fnd0ActionItemId', data.i18n.qfm0QualActionnItemId );
            _mapOfColPropNameAndDisplayName.set( 'qam0QualityActionStatus', data.i18n.qfm0QualActionStatus );
            _mapOfColPropNameAndDisplayName.set( 'release_status_list', data.i18n.qfm0ReleaseStatus );
            _mapOfColPropNameAndDisplayName.set( 'qam0Comment', data.i18n.qfm0QualActionComment );
            _mapOfColPropNameAndDisplayName.set( 'object_desc', data.i18n.qfm0QualActionDesc );
        }
        if ( _mapOfColPropNameAndDisplayName.size > 0 ) {
            _mapOfColPropNameAndDisplayName.forEach( function( colPropDisplay, colPropName ) {
                colInfos.push( _getColumnInfoForRespectivePropColumn( colPropName, colPropDisplay ) );
            } );
        }

        uwDataProvider.columnConfig = {
            columns: colInfos
        };

        deferred.resolve( {
            columnInfos: colInfos
        } );
    } );
    return deferred.promise;
};

/**
 *This function returns the column info for respective column property
 * @param {colPropName} colPropName - Property name for the column to be displayed
 * @param {colPropDisplay} colPropDisplay - Display name for the column to be displayed
 * @return {AwTableColumnInfo} column related to the row data created by this service.
 **/
function _getColumnInfoForRespectivePropColumn( colPropName, colPropDisplay ) {
    return {
        name: colPropName,
        typeName: 'Qam0QualityAction',
        displayName: colPropDisplay,
        maxWidth: 600,
        minWidth: 40,
        width: 180,
        enableColumnMenu: true,
        enableColumnMoving: true,
        enableColumnResizing: true,
        enableSorting: false,
        headerTooltip: true
    };
}

/**
 * This function will get the quality action and dependent quality actions for the selected failure cause
 *
 * @param {Deferred} deferred - deferred from GET call
 * @param {Object} treeLoadInput - Tree load input object
 * @param {declViewModel}  data - paginated tree data
 * @returns {AwPromise} promise - treeLoadResult
 */
export let _loadTreeTableRows = function( deferred, treeLoadInput, data ) {
    var parentNode = treeLoadInput.parentNode;
    var objectSet;
    if ( appCtxService.getCtx( 'xrtPageContext.secondaryXrtPageID' ) === 'tc_xrt_Risk_Analysis' || appCtxService.getCtx( 'xrtPageContext.primaryXrtPageID' ) === 'tc_xrt_Risk_Analysis' ) {
        objectSet = _qfm0ControlActionObjectSet;
    } else if ( appCtxService.getCtx( 'xrtPageContext.secondaryXrtPageID' ) === 'tc_xrt_Optimization' || appCtxService.getCtx( 'xrtPageContext.primaryXrtPageID' ) === 'tc_xrt_Optimization' ) {
        objectSet = _qfm0OptimizationActionObjectSet;
    }

    var clientScopeURI = getClientScopeURI();

    if ( clientScopeURI ) {
        var soaInput = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: clientScopeURI,
                operationType: 'configured'
            },
            saveColumnConfigData: {
                clientScopeURI: clientScopeURI,
                columnConfigId: data.dataProviders.qfm0ActGrpsAndDepActsDataProvider.columnConfig.columnConfigId,
                columns: data.dataProviders.qfm0ActGrpsAndDepActsDataProvider.newColumns,
                scope: 'LoginUser',
                scopeName: ''
            },
            searchInput: {
                maxToLoad: 110,
                maxToReturn: 110,
                providerName: 'Awp0ObjectSetRowProvider',
                searchCriteria: {
                    objectSet: objectSet,
                    parentUid: appCtxService.getCtx( 'fmeaContext.selectedUidsCauseFailure[0]' ),
                    dcpSortByDataProvider: 'true'
                },
                searchFilterFieldSortType: 'Alphabetical',
                startIndex: data.dataProviders.qfm0ActGrpsAndDepActsDataProvider.startIndex,
                searchSortCriteria: treeLoadInput.sortCriteria,
                columnFilters: ''
            },
            inflateProperties: true,
            noServiceData: false
        };
        var treeLoadResult;
        if ( !parentNode.isLeaf && soaInput.searchInput.searchCriteria.parentUid !== undefined
            && soaInput.searchInput.searchCriteria.parentUid !== '' && soaInput.searchInput.searchCriteria.parentUid !== null ) {
            var isLoadAllEnabled = true;
            var children = [];
            if ( parentNode.levelNdx < 0 ) {
                soaSrv.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then( ( response ) => {
                    if ( response && response.totalFound && response.totalFound > 0 ) {
                        _getActionGroupsForFailureCause( response, treeLoadResult, treeLoadInput, isLoadAllEnabled, children, parentNode, deferred, data );
                    } else {
                        treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true, true, null );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                        return deferred.promise;
                    }
                }, function( reason ) {
                    deferred.reject( reason );
                } );
            } else {
                if ( parentNode.levelNdx < _maxTreeLevel ) {
                    soaInput.searchInput.searchCriteria.objectSet = _qualityDependentActionsObjectSet;
                    soaInput.searchInput.searchCriteria.parentUid = parentNode.uid;
                    soaSrv.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then( ( response ) => {
                        if ( response && response.totalFound && response.totalFound > 0 ) {
                            _getActionGroupsForFailureCause( response, treeLoadResult, treeLoadInput, isLoadAllEnabled, children, parentNode, deferred, data );
                        } else {
                            treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true, true, null );
                            deferred.resolve( {
                                treeLoadResult: treeLoadResult
                            } );
                            return deferred.promise;
                        }
                    }, function( reason ) {
                        deferred.reject( reason );
                    } );
                }
            }
        } else {
            treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, [], false, true, true, null );
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
            return deferred.promise;
        }
    }
};

/**
* This function is responsible for loading the first level of data i.e fetching all the action groups for the selected cause
* @param {parentNode} response - SOA response for Expand GRM for primary
* @param {parentNode} treeLoadResult - Loaded tree result object
* @param {parentNode} treeLoadInput - Input configuration for tree table for properties like 'retain tree expansion' etc.
* @param {parentNode} isLoadAllEnabled - flag for enabling load all
* @param {parentNode} children - Child node(s)
* @param {parentNode} parentNode - Parent node
* @param {parentNode} deferred - deferred object
* @return {promise} return the promise after creating the tree table data
*
*
**/
function _getActionGroupsForFailureCause( response, treeLoadResult, treeLoadInput, isLoadAllEnabled, children, parentNode, deferred, data ) {
    if ( response.ServiceData && response.ServiceData.modelObjects ) {
        let modelObjects = response.ServiceData.modelObjects;
        var xrtRowObjects = [];
        if ( response && response.searchResultsJSON ) {
            var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
            if ( searchResults && searchResults.objects.length > 0 ) {
                _.forEach( searchResults.objects, function( results ) {
                    if ( results ) {
                        var vmo = data.attachModelObject( results.uid, 'EDIT', null, results );
                        xrtRowObjects.push( vmo );
                    }
                } );
            }
        }

        if ( xrtRowObjects.length > 0 ) {
            treeLoadResult = _getTreeLoadResult( parentNode, modelObjects, isLoadAllEnabled, treeLoadInput, xrtRowObjects );
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        } else {
            treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true, true, null );
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        }
        return deferred.promise;
    }
    treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true, true, null );
    deferred.resolve( {
        treeLoadResult: treeLoadResult
    } );
    return deferred.promise;
}

/**
* This function is responsible for creating the tree node input
* @param {parentNode} parentNode - Parent node
* @param {children} children - Child Nodes
* @param {isLoadAllEnabled} isLoadAllEnabled -
* @param {treeLoadInput} treeLoadInput - Tree load input data
* @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
*
**/
function _getTreeLoadResult( parentNode, modelObjects, isLoadAllEnabled, treeLoadInput, xrtRowObjects ) {
    _buildTreeTableStructure( parentNode, modelObjects, isLoadAllEnabled, xrtRowObjects );
    var mockChildNodes;
    if ( parentNode.children !== undefined && parentNode.children !== null ) {
        mockChildNodes = parentNode.children.concat( _mapNodeId2ChildArray[parentNode.id] );
    } else {
        mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
    }
    var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
    var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
    var tempCursorObject = {
        endReached: endReached,
        startReached: true
    };
    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true,
        endReached, null );
    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    return treeLoadResult;
}


/**
 * This function builds the tree structure
* @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
*            ViewModelTreeNodes.
* @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
* @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
*/
function _buildTreeTableStructure( parentNode, modelObjects, isLoadAllEnabled, xrtRowObjects ) {
    var children = [];
    _mapNodeId2ChildArray[parentNode.id] = children;
    var levelNdx = parentNode.levelNdx + 1;
    for ( var childNdx = 1; childNdx <= xrtRowObjects.length; childNdx++ ) {
        /**
         * Create a new node for this level. and Create props for it
         */
        var vmNode = createVmNodeUsingNewObjectInfo( xrtRowObjects[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, modelObjects, parentNode );
        /**
         * Add it to the 'parent' based on its ID
         */
        children.push( vmNode );
    }
}

let createVmNodeUsingNewObjectInfo = function( xrtRowObject, levelNdx, childNdx, isLoadAllEnabled, modelObjects, parentNode ) {
    let currentModelObject = modelObjects[xrtRowObject.props.awp0Secondary.dbValues[0]];
    var nodeDisplayName = currentModelObject.props.object_string.uiValues[0];
    var nodeId = currentModelObject.uid;
    var type = currentModelObject.type;

    var iconURL = iconSvc.getTypeIconURL( type );

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, nodeDisplayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = true;

    //If there are dependent actions for quality actions mark the node as not leaf. This is true only for nodes at level one subsequent
    // nodes are marked as leaf even if they have dependent quality action.
    if ( xrtRowObject.props.qam0DependentQualityActions.dbValues.length > 0 && levelNdx < 1 ) {
        vmNode.isLeaf = false;
    } else {
        vmNode.isLeaf = true;
    }
    vmNode.selected = false;
    vmNode.props = {};
    _populateColumns( isLoadAllEnabled, vmNode, xrtRowObject, parentNode );
    return vmNode;
};

/**This function is responsible for setting the column properties of the table
 * @param {ViewModelTreeNode} isLoadAllEnabled  flag to check if load all is enabled
 * @param {Number} vmNode - view model node
 */
function _populateColumns( isLoadAllEnabled, vmNode, xrtRowObject, parentNode ) {
    if ( isLoadAllEnabled ) {
        if ( !vmNode.props ) {
            vmNode.props = {};
        }
        if ( parentNode.levelNdx < 0 ) {
            var clientScopeURI = getClientScopeURI();
            if ( clientScopeURI === _qam0QualityActionAPURI
                && ( xrtRowObject && ( xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority'] !== null || xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority'] !== 'undefined' ) )
                && ( xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority'].dbValue !== null && xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority'].dbValue !== 'undefined' && xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority'].dbValue !== '' )
            ) {
                vmNode.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority'] = _createViewModelProperty( 'REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0ActionPriority', xrtRowObject, _qfm0ActionPriority, 'String', false );
            } else if ( clientScopeURI === _qam0QualityActionRPNURI
                && ( xrtRowObject && ( xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN'] !== null || xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN'] !== 'undefined' ) )
                && ( xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN'].dbValue !== null && xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN'].dbValue !== 'undefined' && xrtRowObject.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN'].dbValue !== '' )

            ) {
                vmNode.props['REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN'] = _createViewModelProperty( 'REFBY(qfm0ActionReference,Qfm0RiskEvaluation).qfm0RPN', xrtRowObject, 'RPN', 'Integer', false );
            }
        }
        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
            .getObject( vmNode.uid ), 'EDIT' );
        tcViewModelObjectService.mergeObjects( vmNode, vmo );
    }
}

/**
 * @param {AwTableColumnInfo} columnInfo -
 * @param {String} nodeId -
 * @param {Object} prop -
 * @return {ViewModelProperty} vmprop
 */
function _createViewModelProperty( propName, modelObject, displayName, type, isPropertyModifiable ) {
    var dbValues = modelObject.props[propName].dbValues;
    var uiValues = modelObject.props[propName].uiValues;

    var vmProp = uwPropertySvc.createViewModelProperty( propName, displayName,
        type, dbValues, uiValues );

    vmProp.dbValues = vmProp.dbValue;
    vmProp.uiValues = vmProp.uiValue;
    vmProp.propertyDescriptor = {
        displayName: displayName
    };

    uwPropertyService.setIsPropertyModifiable( vmProp, isPropertyModifiable );

    return vmProp;
}

/**
 * Process tree table properties for initial load.
 *
 * @param {Object} vmNodes loadedVMObjects for processing properties on initial load.
 * @param {Object} declViewModel data object.
 * @param {Object} uwDataProvider data provider object.
 * @param {Object} context context object required for SOA call.
 * @param {String} contextKey contextKey string for context retrieval.
 * @return {Promise} promise A Promise containing the PropertyLoadResult.
 */
export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context, contextKey ) {
    var updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTablePropertiesOnInitialLoad( vmNodes, declViewModel, uwDataProvider, context, contextKey, updateColumnPropsCallback ) );
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
    _firstColumnPropertyName = propColumns[0].propertyName;

    _.forEach( childNodes, function( childNode ) {
        childNode.iconURL = awIconService.getTypeIconFileUrl( childNode );
        treeTableDataService.updateVMODisplayName( childNode, _firstColumnPropertyName );
    } );
}

/**
 * Function to set the client URI (splm) table
 * depending upon the availability of Guideline Object and
 * if available then depends on its riskEstimatioinMethod
 */
export let getClientScopeURI = function() {
    var clientScopeURI = '';
    var _fmeaRootNodeUid = qfm0FmeaManagerUtils.getFmeaRootNodeUid();
    var rootNode = cdm.getObject( _fmeaRootNodeUid );
    if ( rootNode.props.qfm0FMEAGuideline &&
        rootNode.props.qfm0FMEAGuideline.dbValues && rootNode.props.qfm0FMEAGuideline.dbValues.length > 0 &&
        rootNode.props.qfm0FMEAGuideline.dbValues[0]
    ) {
        var guidelineObjID = rootNode.props.qfm0FMEAGuideline.dbValues[0];
        var guidelineObj = cdm.getObject( guidelineObjID );
        if ( guidelineObj && guidelineObj.props.qfm0RiskEstimationMethod.dbValues[0] !== null && guidelineObj.props.qfm0RiskEstimationMethod.dbValues[0] !== 'undefined' &&
            guidelineObj.props.qfm0RiskEstimationMethod.dbValues[0] !== '' ) {
            var riskEstimatioinMethod = guidelineObj.props.qfm0RiskEstimationMethod.dbValues[0];
            if ( riskEstimatioinMethod === _qfm0ActionPriority ) {
                clientScopeURI = _qam0QualityActionAPURI;
            } else if ( riskEstimatioinMethod === _qfm0RiskPriorityNumber ) {
                clientScopeURI = _qam0QualityActionRPNURI;
            }
        }
    } else {
        clientScopeURI = _qam0QualityActionURI;
    }
    return clientScopeURI;
};

export let showMessageIfNoGuideline = function() {
    var clientScopeURI = getClientScopeURI();
    if ( clientScopeURI === _qam0QualityActionURI ) {
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );
        var errorMessage = localTextBundle.qfm0RPNandAPMissingError;
        messagingService.showError( errorMessage );
    }
};

export let getFMEAGuidelineObject = function( deferred ) {
    var guidelineObjID = [];
    var _fmeaRootNodeUid = qfm0FmeaManagerUtils.getFmeaRootNodeUid();
    var rootNode = cdm.getObject( _fmeaRootNodeUid );
    if ( rootNode.props.qfm0FMEAGuideline &&
        rootNode.props.qfm0FMEAGuideline.dbValues && rootNode.props.qfm0FMEAGuideline.dbValues.length > 0 &&
        rootNode.props.qfm0FMEAGuideline.dbValues[0]
    ) {
        guidelineObjID = [ rootNode.props.qfm0FMEAGuideline.dbValues[0] ];
    }
    var modelObject = null;

    if ( guidelineObjID.length === 0 ) {
        return;
    }
    dms.loadObjects( guidelineObjID ).then( function() {
        modelObject = cdm.getObject( guidelineObjID );
        if ( modelObject && !_.isEmpty( modelObject.props ) ) {
            deferred.resolve( modelObject );
        }
    } );
    return deferred.promise;
};

export default {
    loadActionGroupsAndDependentActionsData,
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTablePropertiesOnInitialLoad,
    getClientScopeURI,
    showMessageIfNoGuideline,
    getFMEAGuidelineObject
};

app.factory( 'qfm0ActionGroupTreeViewService', () => exports );

