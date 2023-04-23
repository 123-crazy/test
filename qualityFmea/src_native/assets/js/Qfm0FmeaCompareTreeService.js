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
 * @module js/Qfm0FmeaCompareTreeService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import localeSvc from 'js/localeService';
import awColumnSvc from 'js/awColumnService';
import uwPropertyService from 'js/uwPropertyService';
import messagingService from 'js/messagingService';
import _localeSvc from 'js/localeService';

const _qfm0FMEANode = 'Qfm0FMEANode';
const _qfm0FailureElement = 'Qfm0FailureElement';
const _qfm0FunctionElement = 'Qfm0FunctionElement';
const _qfm0SystemElement = 'Qfm0SystemElement';
const _pseudoFolderType = 'PseudoFolder';

const MESSAGE_File = '/i18n/qualityFmeaMessages';

var _maxTreeLevel = 3;
var _mapNodeId2ChildArray = {};
var exports = {};


/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 * @param {response} response
 **/
var _buildTreeTableStructure = function( columnInfos, parentNode, response, isLoadAllEnabled ) {
    var children = [];

    var modelObjects = response;
    _mapNodeId2ChildArray[parentNode.id] = children;
    if ( modelObjects ) {
        var levelNdx = parentNode.levelNdx + 1;
        for ( var childNdx = 1; childNdx <= modelObjects.length; childNdx++ ) {
            var vmNode = exports.createVmNodeUsingNewObjectInfo( modelObjects[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, columnInfos );
            children.push( vmNode );
        }
    }
    return children;
};

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled, columnInfos ) {
    var nodeDisplayName = modelObject.props.object_string.uiValues[0];
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var iconURL;

    if ( modelObject.type === _pseudoFolderType && modelObject.props.object_string.dbValues[0] === 'External Failures' ) {
        iconURL = iconSvc.getTypeIconFileUrl( 'typeFMEAFailureRepresentationGroup48.svg' );
    } else if (modelObject.type === _pseudoFolderType && modelObject.props.object_string.dbValues[0] === 'External Functions' ) {
        iconURL = iconSvc.getTypeIconFileUrl( 'typeFunctionRepresentationGroup48.svg' );
    } else {
        iconURL = iconSvc.getTypeIconURL( type );
    }

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, nodeDisplayName, levelNdx, childNdx, iconURL );

    if(modelObject.hasNonAlignedChild){
        vmNode.isLeaf = false;
    }else{
        vmNode.isLeaf = true;
    }
    
    vmNode.selected = false;
    vmNode.props = {};
    _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, modelObject );


    return vmNode;
};

/**
 * @param {propName} propName -
 * @param {value} value -
 * @param {displayName} displayName -
 * @return {type} type
 */
function _createViewModelProperty( propName, value, displayName, type ) {
    var vmProp = uwPropertySvc.createViewModelProperty( propName, displayName,
        type, value, value );

    vmProp.dbValues = [ value ];
    vmProp.uiValues = [ value ];
    vmProp.uiValue = value;
    vmProp.propertyDescriptor = {
        displayName: displayName
    };

    uwPropertyService.setIsPropertyModifiable( vmProp, false );

    return vmProp;
}

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 *
 */
function _loadTreeTableRows( deferred, treeLoadInput, differenceType, remarks, name, context, description, Id, sortCriteria, dataProvider ) {
    var parentNode = treeLoadInput.parentNode;
    if ( !parentNode.isLeaf ) {
        var children = [];
        var isLoadAllEnabled = true;
        let sourceNode = cdm.getObject( appCtxService.getCtx( 'locationContext.modelObject.props.qfm0SourceFMEANode.dbValues[0]' ) );
        let targetNode = cdm.getObject( appCtxService.getCtx( 'locationContext.modelObject.props.qfm0TargetFMEANode.dbValues[0]' ) );
        var soaInput2 =
        {
            input: {
                sourceFMEARootNode: {
                    uid: sourceNode.uid,
                    type: sourceNode.type
                },
                targetFMEARootNode: {
                    uid: targetNode.uid,
                    type: targetNode.type
                },
                focusObject: {
                    uid: parentNode.uid,
                    type: parentNode.type
                },
                useLatestRevision: true, // TODO: set to true
                searchInput:
                {
                    searchCriteria: {},
                    cursor:
                    {
                        startIndex: treeLoadInput.startChildNdx
                    },
                    maxToReturn: 100,
                    maxToLoad: 100,
                    startIndex: treeLoadInput.startChildNdx,
                    searchSortCriteria: []
                }
            }
        };
        const colDefs = loadTreeTableColumns( differenceType, remarks, name, context, description, Id );

        if ( parentNode.levelNdx < 0 ) {
            soaInput2.input.focusObject = {
                uid: targetNode.uid,
                type: targetNode.type
            };
            soaInput2.input.searchInput.searchCriteria.ElementType = _qfm0SystemElement;
            let parentNodeModelObj = cdm.getObject( parentNode.uid );
            return soaSvc.postUnchecked( 'Internal-FmeaManager-2022-06-FMEADataManagement', 'getFMEAStructureCompareResult2', soaInput2 ).then(
                function( response ) {
                    if ( response.compareResults.length > 0 ) {
                        let compareResults = response.compareResults;

                        for ( var x = 0; x < compareResults.length; ++x ) {
                            let obj = compareResults[x].fmeaObject;
                            let resource = app.getBaseUrlPath() + MESSAGE_File;
                            let localTextBundle = _localeSvc.getLoadedText( resource );
                            let difference = '';
                            if ( compareResults[x].difference === 'OnlyInTarget' ) {
                                difference = localTextBundle.qfm0OnlyInTarget;
                            } else if ( compareResults[x].difference === 'MissingInTarget' ) {
                                difference = localTextBundle.qfm0MissingInTarget;
                            } else if ( compareResults[x].difference === 'MetaModified' ) {
                                difference = localTextBundle.qfm0MetaModified;
                            } else if ( compareResults[x].difference === 'StructureModified' ) {
                                difference = localTextBundle.qfm0StructureModified;
                            } else if ( compareResults[x].difference === 'MetaAndStructureModified' ) {
                                difference = localTextBundle.qfm0MetaAndStructureModified;
                            }
                            obj.difference = difference;
                            obj.hasNonAlignedChild = compareResults[x].hasNonAlignedChild;
                            obj.remarks = '';
                            children.push( obj );
                        }
                    }

                    var endReached = response.cursor.endReached;
                    var startReached = response.cursor.startReached;
                    if ( response.totalFound === 0 ) {
                        parentNode.isLeaf = true;
                        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, startReached,
                            endReached, null );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult,
                            colDefs
                        } );
                        showNoDiffNotification();
                    } else {
                        var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, colDefs.columns );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult,
                            colDefs
                        } );
                    }
                } );
        }
        if ( parentNode.levelNdx < _maxTreeLevel ) {
            //let _fmeaRootNode = cdm.getObject( qfm0FmeaManagerUtils.getFmeaRootNodeUid() );
            let childLevelParentNode = parentNode.type === _pseudoFolderType ? targetNode : parentNode;
            soaInput2.input.focusObject = {
                uid: childLevelParentNode.uid,
                type: childLevelParentNode.type
            };
            if ( parentNode.type === "Qfm0FMEANode"){
                soaInput2.input.searchInput.searchCriteria.ElementType = _qfm0SystemElement;
            }else if ( parentNode.type === _pseudoFolderType && parentNode.displayName === "External Functions" ) {
                soaInput2.input.searchInput.searchCriteria.ElementType = _qfm0FunctionElement;
            } else if( parentNode.type === _pseudoFolderType && parentNode.displayName === "External Failures" ) {
                soaInput2.input.searchInput.searchCriteria.ElementType = _qfm0FailureElement;
            }
            return soaSvc.postUnchecked( 'Internal-FmeaManager-2022-06-FMEADataManagement', 'getFMEAStructureCompareResult2', soaInput2 ).then(
                function( response ) {
                    if ( response.compareResults.length > 0 ) {
                        let compareResults = response.compareResults;
                        for ( var x = 0; x < compareResults.length; ++x ) {
                            var obj = compareResults[x].fmeaObject;
                            if ( obj ) {
                                let resource = app.getBaseUrlPath() + MESSAGE_File;
                                let localTextBundle = _localeSvc.getLoadedText( resource );
                                let difference = '';
                                if ( compareResults[x].difference === 'OnlyInTarget' ) {
                                    difference = localTextBundle.qfm0OnlyInTarget;
                                } else if ( compareResults[x].difference === 'MissingInTarget' ) {
                                    difference = localTextBundle.qfm0MissingInTarget;
                                } else if ( compareResults[x].difference === 'MetaModified' ) {
                                    difference = localTextBundle.qfm0MetaModified;
                                } else if ( compareResults[x].difference === 'StructureModified' ) {
                                    difference = localTextBundle.qfm0StructureModified;
                                } else if ( compareResults[x].difference === 'MetaAndStructureModified' ) {
                                    difference = localTextBundle.qfm0MetaAndStructureModified;
                                }
                                obj.difference = difference;
                                obj.hasNonAlignedChild = compareResults[x].hasNonAlignedChild;
                                    if ( parentNode.modelType && parentNode.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 ) {
                                        // If parent node is FMEA root node then push only system elements in children array
                                        if ( obj.modelType){
                                            if(obj.modelType.typeHierarchyArray.indexOf( _qfm0SystemElement ) > -1 || (obj.modelType.typeHierarchyArray.indexOf( _pseudoFolderType ) > -1)) {
                                            obj.remarks = '';
                                            children.push( obj );
                                            }
                                        }
                                    } else {
                                        obj.remarks = '';
                                        children.push( obj );
                                    }
                            }
                        }
                    }
                    var endReached = response.cursor.endReached;
                    var startReached = response.cursor.startReached;
                    if ( response.totalFound === 0 ) {
                        parentNode.isLeaf = true;
                        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, true, startReached,
                            endReached, null );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult,
                            colDefs
                        } );
                    } else {
                        var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, colDefs.columns );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult,
                            colDefs
                        } );
                    }
                } );
        }
        parentNode.isLeaf = true;
        var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
        var endReached = parentNode.endReached;
        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, true, true,
            endReached, null );
        deferred.resolve( {
            treeLoadResult: treeLoadResult,
            colDefs
        } );
    }
}

var showNoDiffNotification = function() {
    let resource = app.getBaseUrlPath() + MESSAGE_File;
    let localTextBundle = _localeSvc.getLoadedText( resource );
    let qfm0MasterVariantIdenticalNotifyMsg = localTextBundle.qfm0MasterVariantIdenticalNotify;
    messagingService.showInfo( qfm0MasterVariantIdenticalNotifyMsg );
};

/**
* @param {string}  differenceType - 'difference'
* @param {string}  remarks - 'remarks'
* @param {string}  name - 'name'
* @param {string}  context - 'context'
* @param {string}  description - 'description'
* @param {string}  Id - 'Id'
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
var loadTreeTableColumns = function( differenceType, remarks, name, context, description, Id ) {
    var awColumnInfos = [];
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'difference',
        displayName: differenceType,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_name',
        displayName: name,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'qfm0FmeaRoot',
        displayName: context,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_desc',
        displayName: description,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'qfm0Id',
        displayName: Id,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );
    return {
        columns: awColumnInfos
    };
};

/**
 *
 * @param {parentNode} parentNode -
 * @param {children} children -
 * @param {isLoadAllEnabled} isLoadAllEnabled -
 * @param {treeLoadInput} treeLoadInput -
 * @param {startReached} startReached -
 * @param {endReached} endReached -
 * @param {newColumns} newColumns -
 * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
 **/
function _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, startReached, endReached, newColumns ) {
    _buildTreeTableStructure( newColumns, parentNode, children, isLoadAllEnabled );
    var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
    var tempCursorObject = {
        endReached: endReached,
        startReached: startReached
    };

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, true, startReached,
        endReached, null );
    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    return treeLoadResult;
}

/**
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 * @param {modelObject} modelObject -
 **/
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, modelObject ) {
    if ( isLoadAllEnabled ) {
        if ( !vmNode.props ) {
            vmNode.props = {};
        }
        if ( modelObject ) {
            vmNode.props.remarks = _createViewModelProperty( 'remarks', modelObject.remarks, 'Remarks', 'String' );
            vmNode.props.difference = _createViewModelProperty( 'difference', modelObject.difference, 'Difference', 'String' );
        }
        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
            .getObject( vmNode.uid ), 'EDIT' );

            if(modelObject.type !== _pseudoFolderType){
                tcViewModelObjectService.mergeObjects( vmNode, vmo );
            }

    }
}

/**
 * @param {deferred} deferred -
 * @param {propertyLoadInput} propertyLoadInput -
 */
function _loadProperties( deferred, propertyLoadInput ) {
    var allChildNodes = [];

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if ( !childNode.props ) {
                childNode.props = {};
            }

            _populateColumns( propertyLoadRequest.columnInfos, true, childNode, childNode.childNdx + 1 );

            allChildNodes.push( childNode );
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    var resolutionObj = {
        propertyLoadResult: propertyLoadResult
    };

    deferred.resolve( resolutionObj );
}

/**
 * Get a page of row data for a 'tree' table.
 *
 * @returns {Promise} AwPromise -
 */
export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var propertyLoadInput;

    var delayTimeProperty = 0;

    for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
        if ( arguments[ndx] && arguments[ndx].propertyLoadRequests && arguments[ndx].propertyLoadRequests[0] && arguments[ndx].propertyLoadRequests[0].childNodes &&
            arguments[ndx].propertyLoadRequests[0].childNodes.length > 0 ) {
            var updatedChildNodes = [];
            for ( var i = 0; i < arguments[ndx].propertyLoadRequests[0].childNodes.length; i++ ) {
                if ( arguments[ndx].propertyLoadRequests[0].childNodes[i].type !== _pseudoFolderType ) {
                    updatedChildNodes.push( arguments[ndx].propertyLoadRequests[0].childNodes[i] );
                }
            }
            arguments[ndx].propertyLoadRequests[0].childNodes = updatedChildNodes;
        }

        var arg = arguments[ndx];

        if ( awTableSvc.isPropertyLoadInput( arg ) ) {
            propertyLoadInput = arg;
        } else if ( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeProperty' ) {
            delayTimeProperty = arg.dbValue;
        }
    }

    var deferred = AwPromiseService.instance.defer();

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if ( delayTimeProperty > 0 ) {
        _.delay( _loadProperties, delayTimeProperty, deferred, propertyLoadInput );
    } else {
        if ( propertyLoadInput ) {
            _loadProperties( deferred, propertyLoadInput );
        }
    }

    return deferred.promise;
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

    let differenceType = arguments[5];
    let remarks = arguments[6];
    let name = arguments[7];
    let context = arguments[8];
    let description = arguments[9];
    let id = arguments[10];
    let sortCriteria = arguments[4];
    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if ( delayTimeTree > 0 ) {
        _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput, differenceType, remarks, name, context, description, id, sortCriteria, arguments[3] );
    } else {
        _loadTreeTableRows( deferred, treeLoadInput, differenceType, remarks, name, context, description, id, sortCriteria, arguments[3] );
    }

    return deferred.promise;
};


export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableProperties,
    loadTreeTableData
};
/**
 * @memberof NgServices
 * @member Qfm0FmeaCompareTreeService
 */
app.factory( 'Qfm0FmeaCompareTreeService', () => exports );

