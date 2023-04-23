// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/qa0AuditPlanTreeService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import awTableStateService from 'js/awTableStateService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import cdm from 'soa/kernel/clientDataModel';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';

/**
 * Cached Tree Table Column information.
 */
var _treeTableColumnInfos = null;

/**
 * Default value for maximum tree level.
 */
var _maxTreeLevel = 3;

/**
 * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
 */
var _mapNodeId2ChildArray = {};

/**
 * Get cached tree table column information.
 * @param {DeclViewModel} data - Data view model object.
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data ) {
    if( !_treeTableColumnInfos ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos( data );
    }

    return _treeTableColumnInfos;
}

/**
 * Build tree table column information.
 * @param {DeclViewModel} data - Data view model object.
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos( data ) {
    var awColumnInfos = [];

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_name',
        displayName: data.i18n.qa0TreeColumnName,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_desc',
        displayName: 'Desc',
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'qa0PlannedStartDate',
        displayName: 'Planned Start Date',
        width: 250,
        minWidth: 150,
        typeName: 'Date',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'qa0PlannedEndDate',
        displayName: 'Planned End Date',
        width: 250,
        minWidth: 150,
        typeName: 'Date',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'qa0ActualStartDate',
        displayName: 'Actual Start Date',
        width: 250,
        minWidth: 150,
        typeName: 'Date',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'qa0ActualEndDate',
        displayName: 'Actual End Date',
        width: 250,
        minWidth: 150,
        typeName: 'Date',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: false
    } ) );

    var sortCriteria = appCtxService.ctx.qualityAuditPlanContext.sortCriteria;

    if( !_.isEmpty( sortCriteria ) ) {
        if( sortCriteria[ 0 ].fieldName && _.eq( awColumnInfos[ 0 ].name, sortCriteria[ 0 ].fieldName ) ) {
            awColumnInfos[ 0 ].sort = {};
            awColumnInfos[ 0 ].sort.direction = sortCriteria[ 0 ].sortDirection.toLowerCase();
            awColumnInfos[ 0 ].sort.priority = 0;
        }
    }
    return awColumnInfos;
}

/**
 * Populate sort criterias from input.
 * @param {Array} sortCriterias - Array of fieldName and sortCriteria.
 * @param {TreeLoadInput} loadInput - TreeLoadInput
 */
var _populateSortCriteriaParameters = function( sortCriterias, loadInput ) {
    var sortCriteria = {};

    if( !_.isEmpty( loadInput.sortCriteria ) ) {
        sortCriteria = loadInput.sortCriteria[ 0 ];
    }

    sortCriterias.push( sortCriteria );
};

/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child' ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 * @param {Boolean} hasRelation - True if node has any relation
 */
function _buildTreeTableStructure( columnInfos, parentNode, nChildren, isLoadAllEnabled, hasRelation ) {
    var children = [];

    _mapNodeId2ChildArray[ parentNode.id ] = children;

    var levelNdx = parentNode.levelNdx + 1;

    for( var childNdx = 1; childNdx <= nChildren.length; childNdx++ ) {
        var vmNode = exports.createVmNodeUsingNewObjectInfo( nChildren[ childNdx - 1 ], levelNdx, childNdx, isLoadAllEnabled, columnInfos, hasRelation );
        children.push( vmNode );
    }
}

/**
 * @param {deferred} deferred - $q object to resolve the 'promise'.
 * @param {Object} propertyLoadInput - PropertyLoadInput
 */
function _loadProperties( deferred, propertyLoadInput ) {
    var allChildNodes = [];

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            _populateColumns( true, childNode );

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
 * Evaluate, if the specified node contains children.
 * @param {boolean} hasRelation True, if node has relations.
 * @param {object} vmNode Node to evaluate.
 */
function _evaluteNodeIsLeaf( hasRelation, vmNode ) {
    if( vmNode.modelType.typeHierarchyArray.indexOf( 'Qa0QualityAudit' ) > -1 ) {
        vmNode.isLeaf = true;
    } else if( vmNode.modelType.typeHierarchyArray.indexOf( 'Qa0QualityAuditPlan' ) > -1 && hasRelation ) {
        vmNode.isLeaf = false;
    } else {
        vmNode.isLeaf = true;
    }
}

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 * @return {Promise} Revolved with a TreeLoadResult object containing result/status information.
 */
function _loadTreeTableRows( deferred, treeLoadInput ) {
    /**
     * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
     */
    var parentNode = treeLoadInput.parentNode;
    var isLoadAllEnabled = true;

    if( !parentNode.isLeaf ) {
        var policyJson = {
            types: [ {
                    name: 'Qa0QualityAuditPlan'
                },
                {
                    name: 'Qa0QualityAudit',
                    properties: [ {
                            name: 'object_desc'
                        },
                        {
                            name: 'qa0PlannedStartDate'
                        }
                    ]
                },
                {
                    name: 'Awp0XRTObjectSetRow',
                    properties: [ {
                        name: 'awp0Target'
                    } ]
                }
            ]
        };

        var selected = appCtxService.getCtx( 'locationContext' );

        var soaInput = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: 'Qa0QualityAuditPlanURI'
            },
            searchInput: {
                maxToLoad: 110,
                maxToReturn: 110,
                providerName: 'Awp0ObjectSetRowProvider',
                searchCriteria: {
                    objectSet: 'Qa0QualityAuditPlanRel.Qa0QualityAudit',
                    parentUid: selected.modelObject.uid
                },
                startIndex: treeLoadInput.startChildNdx,
                searchSortCriteria: []
            }
        };

        _populateSortCriteriaParameters( soaInput.searchInput.searchSortCriteria, treeLoadInput );

        var children = [];
        var policyId;
        var treeLoadResult;

        if( parentNode.levelNdx < 0 ) {
            var rootNode = cdm.getObject( selected.modelObject.uid );
            children.push( rootNode );

            policyId = propertyPolicySvc.register( policyJson );

            return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
                function( response ) {
                    if( policyId ) {
                        propertyPolicySvc.unregister( policyId );
                    }

                    treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, response.totalFound > 0 );

                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                } );
        } else if( parentNode.levelNdx === 0 ) {
            policyId = propertyPolicySvc.register( policyJson );

            return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
                function( response ) {
                    if( policyId ) {
                        propertyPolicySvc.unregister( policyId );
                    }

                    if( response.searchResultsJSON ) {
                        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );

                        if( searchResults ) {
                            for( var x = 0; x < searchResults.objects.length; ++x ) {
                                var uid = searchResults.objects[ x ].uid;
                                var obj = response.ServiceData.modelObjects[ uid ];
                                var underlyingObject = cdm.getObject( obj.props.awp0Target.dbValues[ 0 ] );

                                if( underlyingObject ) {
                                    children.push( underlyingObject );
                                }
                            }
                        }
                    }

                    if( response.totalFound === 0 ) {
                        parentNode.isLeaf = true;
                        var endReached = true;

                        treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true, endReached, null );

                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    } else {
                        treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput );

                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    }
                } );
        } else if( parentNode.levelNdx < _maxTreeLevel ) {
            if( parentNode.props.Qa0QualityAuditPlanRel ) {
                for( var x = 0; x < parentNode.props.Qa0QualityAuditPlanRel.dbValues.length; ++x ) {
                    var uid = parentNode.props.Qa0QualityAuditPlanRel.dbValues[ x ];
                    var obj = cdm.getObject( uid );

                    if( obj ) {
                        children.push( obj );
                    }
                }
            }
        } else {
            parentNode.isLeaf = true;

            var mockChildNodes = _mapNodeId2ChildArray[ parentNode.id ];
            var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
            var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;

            treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true, endReached, null );

            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        }
    }
}

/**
 *
 * @param {parentNode} parentNode - Parent Node
 * @param {children} children - List of children nodes
 * @param {isLoadAllEnabled} isLoadAllEnabled -
 * @param {treeLoadInput} treeLoadInput -
 * @param {Boolean} hasRelation - True, if node has any relation
 * @return {awTableSvc.buildTreeLoadResult} awTableSvc.buildTreeLoadResult -
 *
 **/
function _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput, hasRelation ) {
    _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, children, isLoadAllEnabled, hasRelation );

    var mockChildNodes;

    if( parentNode.children !== undefined && parentNode.children !== null ) {
        mockChildNodes = parentNode.children.concat( _mapNodeId2ChildArray[ parentNode.id ] );
    } else {
        mockChildNodes = _mapNodeId2ChildArray[ parentNode.id ];
    }

    var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
    var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;

    var tempCursorObject = {
        endReached: endReached,
        startReached: true
    };

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true, endReached, null );

    treeLoadResult.parentNode.cursorObject = tempCursorObject;

    return treeLoadResult;
}

/**
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 */
function _populateColumns( isLoadAllEnabled, vmNode ) {
    if( isLoadAllEnabled ) {
        if( !vmNode.props ) {
            vmNode.props = {};
        }

        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm.getObject( vmNode.uid ), 'EDIT' );

        tcViewModelObjectService.mergeObjects( vmNode, vmo );
    }
}

var exports = {};

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled, columnInfos, hasRelation ) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = modelObject.props.object_name.uiValues[ 0 ];

    var iconURL = iconSvc.getTypeIconURL( type );

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
    vmNode.modelType = modelObject.modelType;

    _evaluteNodeIsLeaf( hasRelation, vmNode );

    vmNode.selected = true;

    _populateColumns( isLoadAllEnabled, vmNode );
    return vmNode;
};

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this action function is invoked from.
 * @param {DeclViewModel} data - Data view model object
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();

    appCtxService.ctx.treeVMO = uwDataProvider;

    var awColumnInfos = _getTreeTableColumnInfos( data );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

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
export let loadTreeTableData = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     */
    var treeLoadInput = arguments[ 0 ];
    var sortCriteria = appCtxService.getCtx( 'qualityAuditPlanContext' ).sortCriteria;

    if( arguments[ 4 ] && !_.eq( arguments[ 4 ], sortCriteria ) ) {
        appCtxService.updatePartialCtx( 'qualityAuditPlanContext.sortCriteria', arguments[ 4 ] );
        treeLoadInput.retainTreeExpansionStates = true;
    }

    treeLoadInput.sortCriteria = appCtxService.getCtx( 'qualityAuditPlanContext' ).sortCriteria;

    /**
     * Extract action parameters from the arguments to this function.
     * <P>
     * Note: The order or existence of parameters can varey when more-than-one property is specified in the
     * 'inputData' property of a DeclAction JSON. This code seeks out the ones this function expects.
     */
    var delayTimeTree = 0;

    for( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ ndx ];

        if( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeTree' ) {
            delayTimeTree = arg.dbValue;
        } else if( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'maxTreeLevel' ) {
            _maxTreeLevel = arg.dbValue;
        }
    }

    /**
     * Check the validity of the parameters
     */
    var deferred = AwPromiseService.instance.defer();

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if( delayTimeTree > 0 ) {
        _.delay( _loadTreeTableRows, delayTimeTree, deferred, treeLoadInput );
    } else {
        _loadTreeTableRows( deferred, treeLoadInput );
    }

    return deferred.promise;
};

/**
 * Get a page of row data for a 'tree' table.
 *
 * @param {PropertyLoadRequestArray} propertyLoadRequests - An array of PropertyLoadRequest objects this action
 *            function is invoked from. The object is usually the result of processing the 'inputData' property
 *            of a DeclAction based on data from the current DeclViewModel on the $scope) . The 'pageSize'
 *            properties on this object is used (if defined).
 * @returns {Object} Promise for the result
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

    for( var ndx = 0; ndx < arguments.length; ndx++ ) {
        var arg = arguments[ ndx ];

        if( awTableSvc.isPropertyLoadInput( arg ) ) {
            propertyLoadInput = arg;
        } else if( uwPropertySvc.isViewModelProperty( arg ) && arg.propertyName === 'delayTimeProperty' ) {
            delayTimeProperty = arg.dbValue;
        }
    }

    var deferred = AwPromiseService.instance.defer();

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if( delayTimeProperty > 0 ) {
        _.delay( _loadProperties, delayTimeProperty, deferred, propertyLoadInput );
    } else {
        if( propertyLoadInput ) {
            _loadProperties( deferred, propertyLoadInput );
        }
    }

    return deferred.promise;
};

/**
 * This makes sure, edited object is selected
 * @param {DeclViewModel} data - Data view model
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function( data, selectionModel ) {
    var selectedModelObject = appCtxService.ctx.qualityAuditPlanContext.selectedNodes;
    var viewModelCollection = data.dataProviders.auditPlanTreeDataProvider.viewModelCollection;

    if( selectedModelObject && selectedModelObject.length > 0 ) {
        _.forEach( selectedModelObject, function( selectedObject ) {
            if( viewModelCollection.loadedVMObjects.length > 0 ) {
                selectionModel.setSelection( selectedObject );
                var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
                    return vmo.uid === selectedObject.props.qc0ParentChecklistSpec.dbValues[ 0 ];
                } );
                if( parentIdx > -1 ) {
                    var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
                    addNodeToExpansionState( parentVMO, data );
                }
            }
        } );
    } else if( !selectedModelObject || selectedModelObject && selectedModelObject.length === 0 ) {
        selectionModel.setSelection( [] );
    }
};

/**
 * Add local storage entry corresponding to the information sent in.
 *
 * @param {Object} node This parameter can either be the node that is to be added to local storage or it can be just the id
 *            of the node
 * @param {DeclViewModel} declViewModel - Data view model
 */
export let addNodeToExpansionState = function( node, declViewModel ) {
    var gridId = Object.keys( declViewModel.grids )[ 0 ];
    awTableStateService.saveRowExpanded( declViewModel, gridId, node );
};

/**
 * Update selected nodes in context based on pin value
 * selected node set as new object if pinnedToForm is true
 * selected node set as current selection if pinnedToForm is false
 * @param {DeclViewModel} data Data view model
 */
export let selectNewlyAddedElement = function( data ) {
    appCtxService.ctx.qualityAuditPlanContext = {};
    appCtxService.ctx.qualityAuditPlanContext.selectedNodes = [];

    if( data.pinnedToForm.dbValue ) {
        appCtxService.ctx.qualityAuditPlanContext.selectedNodes = data.selectedNodes;
    } else {
        if( appCtxService.ctx.selected ) {
            appCtxService.ctx.qualityAuditPlanContext.selectedNodes.push( appCtxService.ctx.selected );
        }
    }
};

/**
 * Update the audit plan tree when new items are added to it.
 * @param {DeclViewModel} data Data view model
 * @param {ctx} ctx Context object
 */
export let updateAuditPlanTree = function( data, ctx ) {
    var viewModelCollection = ctx.treeVMO.viewModelCollection;
    var audits = viewModelCollection.loadedVMObjects.filter( item => item.type === 'Qa0QualityAudit' );

    if( audits.length === 0 ) {
        var auditPlanVMO = viewModelCollection.loadedVMObjects[ 0 ];
        auditPlanVMO.isLeaf = false;
        auditPlanVMO.isExpanded = true;
    }

    if( data.createdObject ) {
        let auditNode = exports.createVmNodeUsingNewObjectInfo( data.createdObject, 1, 1, true, true, true );
        viewModelCollection.loadedVMObjects.splice( 2 + audits.length, 0, auditNode );
    } else if( data.sourceModelObjects ) {
        let auditNode = exports.createVmNodeUsingNewObjectInfo( data.sourceModelObjects[ 0 ], 1, 1, true, true );
        viewModelCollection.loadedVMObjects.splice( 2 + audits.length, 0, auditNode );
    }
};

/**
 * Update the audit plan tree when new items are removed from it.
 * @param {ctx} ctx Context object
 */
export let updateAuditPlanTreeRemoved = function( ctx ) {
    if( ctx.mselected && ctx.mselected.length > 0 ) {
        var viewModelCollection = ctx.treeVMO.viewModelCollection;
        var treeObjList = viewModelCollection.loadedVMObjects;
        var removedAudits = ctx.mselected.map( s => s.uid );

        for( var i = treeObjList.length; i--; ) {
            if( _.includes( removedAudits, treeObjList[ i ].uid ) ) {
                treeObjList.splice( i, 1 );
            }
        }

        var audits = viewModelCollection.loadedVMObjects.filter( item => item.type === 'Qa0QualityAudit' );

        if( audits.length === 0 ) {
            var auditPlanVMO = viewModelCollection.loadedVMObjects[ 0 ];
            auditPlanVMO.isLeaf = true;
            auditPlanVMO.isExpanded = false;
        }
    }
};

/**
 * This function will create the SOA input for removeChildren for removing audits from the audit plan.
 * @param {Object} auditPlanObject Audit plan object, that contains the audit relation.
 * @param {String} relation name of the audit relation
 * @param {Array} selectedAudits Array of selected audits to be removed
 * @return {Array} Returns inputData array for removeChildren service
 */
export let createRemoveAuditFromAuditPlanInput = function( auditPlanObject, relation, selectedAudits ) {
    var inputData = {};
    var soaInput = [];

    inputData = {
        clientId: 'AWClient',
        parentObj: auditPlanObject,
        childrenObj: [],
        propertyName: relation
    };

    if( auditPlanObject && selectedAudits && selectedAudits.length > 0 ) {
        selectedAudits.forEach( function( selectedObj ) {
            inputData.childrenObj.push( selectedObj );
        } );
    }
    soaInput.push( inputData );

    return soaInput;
};

export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableProperties,
    processPWASelection,
    selectNewlyAddedElement,
    addNodeToExpansionState,
    updateAuditPlanTree,
    updateAuditPlanTreeRemoved,
    createRemoveAuditFromAuditPlanInput
};
/**
 * @memberof NgServices
 * @member qa0AuditPlanTreeService
 */
app.factory( 'qa0AuditPlanTreeService', () => exports );
