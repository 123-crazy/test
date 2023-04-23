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
 * @module js/Aqc0FailureSpecTreeTableService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
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
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import eventBus from 'js/eventBus';
import assert from 'assert';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import parsingUtils from 'js/parsingUtils';
import treeTableDataService from 'js/treeTableDataService';

/**
 * Cached static default AwTableColumnInfo.
 */
 var _firstColumnConfigColumnPropertyName = 'object_name';

var _debug_delayEnabled = true;

var _debug_pageDelay = 1000;

var _deferExpandTreeNodeArray = [];

/**
 * Cached static default AwTableColumnInfo.
 */
var _treeTableColumnInfos = null;

/**
 */
var _maxTreeLevel = 3;

/**
 * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
 */
var _mapNodeId2ChildArray = {};

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data ) {
    if( !_treeTableColumnInfos ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos( data );
    }

    return _treeTableColumnInfos;
}

/**
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos( data ) {
    var columnInfos = [];

    /**
     * Set 1st column to special 'name' column to support tree-table.
     */

    var awColumnInfos = [];
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_name',
        displayName: data.i18n.Aqc0ElementName,
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );
    var tcSessionData = appCtxService.getCtx( 'tcSessionData' );
    if ( tcSessionData.tcMajorVersion > 12 ) {
        awColumnInfos.push( awColumnSvc.createColumnInfo( {
            name: 'release_status_list',
            propertyName: 'release_status_list',
            displayName: data.i18n.ReleaseStatus,
            width: 250,
            minWidth: 150,
            typeName: 'String',
            enableColumnResizing: true,
            enableColumnMoving: false,
            isTreeNavigation: false
        } ) );
    }
    for( var index = 0; index < awColumnInfos.length; index++ ) {
        var column = awColumnInfos[ index ];
        column.cellRenderers = [];
        column.cellRenderers.push( _treeCmdCellRender() );
    }
    var sortCriteria = appCtxService.ctx.failureManagerContext.sortCriteria;
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
 * Table Command Cell Renderer for PL Table
 */
var _treeCmdCellRender = function() {
    return {
        action: function( column, vmo, tableElem ) {
            var cellContent = awSPLMTableCellRendererFactory.createTreeCellCommandElement( column, vmo, tableElem );

            // add event for cell image visibility
            var gridCellImageElement = cellContent.getElementsByClassName( _t.Const.CLASS_GRID_CELL_IMAGE )[ 0 ];
            if( gridCellImageElement ) {
                togglePartialVisibility( gridCellImageElement, vmo.visible );
            }

            return cellContent;
        },
        condition: function( column, vmo, tableElem ) {
            return column.isTreeNavigation === true;
        }
    };
};

/**
 * Adds/removes partialVisibility class to element.
 *
 * @param {DOMElement} element DOM element for classes
 * @param {Boolean} isVisible for adding/removing class
 */
var togglePartialVisibility = function( element, isVisible ) {
    if( !isVisible ) {
        element.classList.add( 'aw-widgets-partialVisibility' );
    } else {
        element.classList.remove( 'aw-widgets-partialVisibility' );
    }
};

/**
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
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Number} nChildren - The # of child nodes to add to the given 'parent'.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 */
function _buildTreeTableStructure( columnInfos, parentNode, nChildren, isLoadAllEnabled ) {
    var children = [];

    _mapNodeId2ChildArray[ parentNode.id ] = children;

    var levelNdx = parentNode.levelNdx + 1;

    for( var childNdx = 1; childNdx <= nChildren.length; childNdx++ ) {
        /**
         * Create a new node for this level. and Create props for it
         */
        var vmNode = exports.createVmNodeUsingNewObjectInfo( nChildren[ childNdx - 1 ], levelNdx, childNdx, isLoadAllEnabled, columnInfos );
        /**
         * Add it to the 'parent' based on its ID
         */
        children.push( vmNode );
    }
}

/**
 * @param deferred
 * @param propertyLoadRequests
 */
function _loadProperties( deferred, propertyLoadInput ) {
    var allChildNodes = [];

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
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
 * function to evaluate if an object contains children
 * @param {objectType} objectType object type
 * @return {boolean} if node contains child
 */
function containChildren( props, vmNode ) {
    var deferred = AwPromiseService.instance.defer();
    var containChild = false;
    if( props.qc0FailureList.dbValues.length > 0 ) {
        if( appCtxService.ctx.failureManagerContext.showInactive === false || appCtxService.ctx.failureManagerContext.showInactive === undefined ) {
            if( props && props.aqc0ContainActiveChild && props.aqc0ContainActiveChild.dbValues && props.aqc0ContainActiveChild.dbValues[0] === '1' ) {
                vmNode.isLeaf = containChild;
            } else {
                vmNode.isLeaf = !containChild;
            }
        } else {
            vmNode.isLeaf = containChild;
        }
    } else {
        vmNode.isLeaf = !containChild;
    }

    if( !vmNode.isLeaf && appCtxService.ctx.failureManagerContext.parentElement && vmNode.uid === appCtxService.ctx.failureManagerContext.parentElement.uid ) {
        _deferExpandTreeNodeArray.push( vmNode );
    }
}

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 * @return {Promise} Revolved with a TreeLoadResult object containing result/status information.
 */
function _loadTreeTableRows( deferred, treeLoadInput ) {
    /**
     * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
     */
    var parentNode = treeLoadInput.parentNode;

    if( appCtxService.ctx.sublocation.nameToken === 'qualityfailuremanager' ) {
        var targetNode;
        // this context value comes true only when breadcrumb is updated from chevron
        if( !parentNode.isExpanded ) {
            var locationCtx = appCtxService.getCtx( 'locationContext' );
            targetNode = locationCtx.modelObject;
        } else {
            targetNode = parentNode;
        }
    } else {
        targetNode = parentNode;
    }

    if( !parentNode.isLeaf ) {
        var nChild = parentNode.children ? parentNode.children.length : 0;
        var policyJson = {
            types: [ {
                name: 'Qc0Failure',
                properties: [ {
                        name: 'qc0FailureList'
                    },
                    {
                        name: 'qc0FailurePath'
                    },
                    {
                        name: 'aqc0ContainActiveChild'
                    },
                    {
                        name: 'release_status_list',
                        modifiers:
                        [
                            {
                                name: 'withProperties',
                                Value: 'true'
                            }
                        ]
                    }
                ]
            } ]
        };

        // get props with intial tree for now. In future, should set this to false and populate
        // the props seperately.
        var soaInput = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: ''
            },
            searchInput: {
                maxToLoad: 110,
                maxToReturn: 110,
                providerName: 'Aqc0QualityBaseProvider',
                searchFilterMap6: {
                    'WorkspaceObject.object_type': [ {
                        searchFilterType: 'StringFilter',
                        stringValue: 'Qc0Failure'
                    } ]
                },
                searchCriteria: {
                    parentGUID: '',
                    searchStatus: ( !appCtxService.ctx.failureManagerContext.showInactive ).toString(),
                    catalogueObjectType: ''
                },
                startIndex: treeLoadInput.startChildNdx,
                searchSortCriteria: []
            }
        };

        _populateSortCriteriaParameters( soaInput.searchInput.searchSortCriteria, treeLoadInput );
        if( parentNode.levelNdx < 0 ) {
            if( appCtxService.ctx.sublocation.nameToken === 'qualityfailuremanager' ) {
                soaInput.searchInput.searchCriteria.parentGUID = targetNode.uid;
            } else {
                soaInput.searchInput.searchCriteria.catalogueObjectType = 'Qc0Failure';
            }
            var isLoadAllEnabled = true;
            var children = [];

            var policyId = propertyPolicySvc.register( policyJson );

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
                                if( obj ) {
                                    children.push( obj );
                                }
                            }
                        }
                    }
                    if( response.totalFound === 0 ) {
                        parentNode.isLeaf = true;
                        var endReached = true;
                        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                            endReached, null );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    } else {
                        var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    }
                    appCtxService.ctx.search.totalFound = response.searchFilterMap6.Qc0Failure[ 0 ].count;
                    appCtxService.ctx.search.filterMap = response.searchFilterMap6;
                } );
        }
        if( parentNode.levelNdx < _maxTreeLevel ) {
            var isLoadAllEnabled = true;
            var children = [];
            soaInput.searchInput.searchCriteria.parentGUID = targetNode.uid;
            var policyId = propertyPolicySvc.register( policyJson );
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
                                if( obj ) {
                                    children.push( obj );
                                }
                            }
                        }
                    }
                    if( response.totalFound === 0 ) {
                        parentNode.isLeaf = true;
                        var endReached = true;
                        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                            endReached, null );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    } else {
                        var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult
                        } );
                    }

                    appCtxService.ctx.search.totalFound = response.searchFilterMap6.Qc0Failure[ 0 ].count;
                    appCtxService.ctx.search.filterMap = response.searchFilterMap6;
                } );
        }
        parentNode.isLeaf = true;
        var mockChildNodes = _mapNodeId2ChildArray[ parentNode.id ];
        var mockChildNodesLen = mockChildNodes ? mockChildNodes.length : 0;
        var endReached = parentNode.startChildNdx + treeLoadInput.pageSize > mockChildNodesLen;
        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, mockChildNodes, false, true,
            endReached, null );
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
function _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput ) {
    _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, children, isLoadAllEnabled );
    if( parentNode.children !== undefined && parentNode.children !== null ) {
        var mockChildNodes = parentNode.children.concat( _mapNodeId2ChildArray[ parentNode.id ] );
    } else {
        var mockChildNodes = _mapNodeId2ChildArray[ parentNode.id ];
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
    if( _deferExpandTreeNodeArray.length > 0 ) {
        _.defer( function() {
            // send event that will be handled in this file to check
            // if there are nodes to be expanded. This defer is needed
            // to make sure tree nodes are actually loaded before we attempt
            // to expand them. Fixes a timing issue if not deferred.
            eventBus.publish( 'failureSpecExpandTreeNodeEvent' );
        } );
    }
    return treeLoadResult;
}

/**
 * @param {ObjectArray} columnInfos -
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 */
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, props ) {
    if( isLoadAllEnabled ) {
        if( !vmNode.props ) {
            vmNode.props = {};
        }

        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm
            .getObject( vmNode.uid ), 'EDIT' );

        tcViewModelObjectService.mergeObjects( vmNode, vmo );
    }
}

var exports = {};

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled, columnInfos ) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = modelObject.props.object_name.uiValues[ 0 ];

    var iconURL = iconSvc.getTypeIconURL( type );

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
    vmNode.modelType = modelObject.modelType;

    if( modelObject.props.qc0Status.dbValues[ 0 ] === '0' ) {
        vmNode.visible = false;
    }

    !containChildren( modelObject.props, vmNode );

    vmNode.selected = true;

    _populateColumns( columnInfos, isLoadAllEnabled, vmNode, childNdx, modelObject.props );
    return vmNode;
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
    var sortCriteria = appCtxService.getCtx( 'failureManagerContext' ).sortCriteria;

    if( arguments[ 4 ] ) {
        if( !_.eq( arguments[ 4 ], sortCriteria ) ) {
            appCtxService.updatePartialCtx( 'failureManagerContext.sortCriteria', arguments[ 4 ] );
            treeLoadInput.retainTreeExpansionStates = true;
        }
    }

    treeLoadInput.sortCriteria = appCtxService.getCtx( 'failureManagerContext' ).sortCriteria;

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
 * @param {data} data
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function( data, selectionModel ) {
    var selectedModelObject = appCtxService.ctx.failureManagerContext.selectedNodes;
    var viewModelCollection = data.dataProviders.failureSpecDataProvider.viewModelCollection;
    if( selectedModelObject && selectedModelObject.length > 0 ) {
        _.forEach( selectedModelObject, function( selectedObject ) {
            if( selectedObject.props.qc0Status.dbValues[ 0 ] === '1' || appCtxService.ctx.failureManagerContext.showInactive === true && viewModelCollection.loadedVMObjects.length > 0 ) {
                selectionModel.setSelection( selectedObject );
                var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
                    return vmo.uid === selectedObject.props.qc0ParentFailure.dbValues[ 0 ];
                } );
                if( parentIdx > -1 ) {
                    var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
                    addNodeToExpansionState( parentVMO, data );
                }
            } else if( selectedObject.props.qc0Status.dbValues[ 0 ] === '0' &&
                ( appCtxService.ctx.failureManagerContext.showInactive === false || appCtxService.ctx.failureManagerContext.showInactive === undefined ) ) {
                selectionModel.setSelection( [] );
            }
        } );
    } else if( !selectedModelObject || selectedModelObject && selectedModelObject.length === 0 ) {
        selectionModel.setSelection( [] );
    }
    if( selectionModel.getSelection().length === 0 || selectionModel.getSelection().length > 1 ) {
        var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand && toolsAndInfoCommand.commandId === 'Aqc0ObjectInfo' ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
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
    var gridId = Object.keys( declViewModel.grids )[ 0 ];
    awTableStateService.saveRowExpanded( declViewModel, gridId, node );
};

/**
 * This wll close any tools and info panel if any open
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let selectionChanged = function( data, selectionModel ) {
    var selectedNodes = data.eventData.selectedObjects;
    if( selectedNodes.length > 0 ) {
        if( appCtxService.ctx.failureManagerContext === undefined ||
            appCtxService.ctx.failureManagerContext === '' ) {
            appCtxService.ctx.failureManagerContext = {};
        }
        if( appCtxService.ctx.failureManagerContext.selectedNodes !== undefined && appCtxService.ctx.failureManagerContext.selectedNodes.length > 0 &&
            appCtxService.ctx.failureManagerContext.selectedNodes[ 0 ].uid !== selectedNodes[ 0 ].uid ||
            ( appCtxService.ctx.failureManagerContext.selectedNodes === undefined || appCtxService.ctx.failureManagerContext.selectedNodes.length === 0 ) ) {
            var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
            if( toolsAndInfoCommand && ( toolsAndInfoCommand.commandId === 'Aqc0AddChildFailureSpec' ||
                    toolsAndInfoCommand.commandId === 'Aqc0AddSiblingFailureSpec' ||
                    toolsAndInfoCommand.commandId === 'Aqc0AddRootFailureSpec' ) ) {
                eventBus.publish( 'awsidenav.openClose', {
                    id: 'aw_toolsAndInfo',
                    commandId: toolsAndInfoCommand.commandId
                } );
            }
        }
    } else {
        var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand && ( toolsAndInfoCommand.commandId === 'Aqc0AddChildFailureSpec' ||
                toolsAndInfoCommand.commandId === 'Aqc0AddSiblingFailureSpec' ||
                toolsAndInfoCommand.commandId === 'Aqc0AddRootFailureSpec' ) ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
    }
    appCtxService.ctx.failureManagerContext.selectedNodes = selectedNodes;
    if( selectionModel.getSelection().length === 0 || selectionModel.getSelection().length > 1 ) {
        var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand && toolsAndInfoCommand.commandId === 'Aqc0ObjectInfo' ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
    }
};

export let failureSpecExpandTreeNode = function() {
    _.defer( function() {
        // _deferExpandTreeNodeArray contains nodes we want to expand. We
        // had to make these deferred calls to allow the tree to draw before
        // we asked it to expand a node.
        for( var x = 0; x < _deferExpandTreeNodeArray.length; x++ ) {
            eventBus.publish( 'failureSpecDataProvider.expandTreeNode', {
                // ask tree to expand a node
                parentNode: _deferExpandTreeNodeArray[ x ]
            } );
        }
        _deferExpandTreeNodeArray = []; // clear out the global array
    } );
};

/**
 * Update selected nodes in context based on pin value
 * selected node set as new object if pinnedToForm is true
 * selected node set as current selection if pinnedToForm is false
 * @param {DeclViewModel} data
 */
export let selectNewlyAddedElement = function( data ) {
    appCtxService.ctx.failureManagerContext = {};
    appCtxService.ctx.failureManagerContext.selectedNodes = [];
    if( data.pinnedToForm.dbValue ) {
        appCtxService.ctx.failureManagerContext.selectedNodes = data.selectedNodes;
    } else {
        if( appCtxService.ctx.selected ) {
            appCtxService.ctx.failureManagerContext.selectedNodes.push( appCtxService.ctx.selected );
        }
    }
};
// eslint-disable-next-line valid-jsdoc
/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * eventData : {Object} containing viewModelObjects and totalObjectsFound
 */
 export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnConfigColumnPropertyName );
        } );
    }

    if( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnConfigColumnPropertyName );
            } );
        } );
    }
};
export default exports = {
    updateDisplayNames,
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableProperties,
    processPWASelection,
    selectionChanged,
    failureSpecExpandTreeNode,
    selectNewlyAddedElement,
    addNodeToExpansionState
};
/**
 * @memberof NgServices
 * @member Aqc0FailureSpecTreeTableService
 */
app.factory( 'Aqc0FailureSpecTreeTableService', () => exports );
