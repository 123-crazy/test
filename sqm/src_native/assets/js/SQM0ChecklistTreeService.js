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
 * @module js/SQM0ChecklistTreeService
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
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import assert from 'assert';
import _t from 'js/splmTableNative';
import parsingUtils from 'js/parsingUtils';
import dms from 'soa/dataManagementService';
import colorDecoratorService from 'js/colorDecoratorService';

//Constants for Psi0 RYG decorator style
var RYG_DECORATOR_STYLE = {
    Red: {
        cellDecoratorStyle: 'aw-prgSchedulemanager-checklistRedColor',
        gridDecoratorStyle: 'aw-prgSchedulemanager-checklistTableRedColor'

    },
    Green: {
        cellDecoratorStyle: 'aw-prgSchedulemanager-checklistGreenColor',
        gridDecoratorStyle: 'aw-prgSchedulemanager-checklistTableGreenColor'
    },
    Yellow: {
        cellDecoratorStyle: 'aw-prgSchedulemanager-checklistYellowColor',
        gridDecoratorStyle: 'aw-prgSchedulemanager-checklistTableYellowColor'
    }
};

var _propertyLoadResult = null;
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
    /**
     * Set 1st column to special 'name' column to support tree-table.
     */

    var awColumnInfos = [];
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'object_name',
        displayName: 'Name',
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );
    for( var index = 0; index < awColumnInfos.length; index++ ) {
        var column = awColumnInfos[ index ];
        column.cellRenderers = [];
        column.cellRenderers.push( _treeCmdCellRender() );
    }
    var sortCriteria = appCtxService.ctx.qualityChecklistManagerContext ? appCtxService.ctx.qualityChecklistManagerContext.sortCriteria : undefined;

    appCtxService.updatePartialCtx( 'qualityChecklistManagerContext', '' );
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
        condition: function( column ) {
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
    setDecoratorStyles( children, false );
}

/**
 * Load properties for Tree
 *
 * @param {PropertyLoadRequest} propertyLoadRequests - Parameters for accessing desired result.
 *
 * @param {PropertyLoadContext} propertyLoadContext - (Optional) The context to use for accessing desired
 *            result.
 * @param {declViewModel} ViewModel backing the tree table
 *
 * @returns {Promise} A Promise resolved with an object containing a 'propertyLoadResult' property set with the
 *          results of the operation.
 */
function _loadProperties( propertyLoadInput, propertyLoadContext, contextKey, declViewModel, uwDataProvider ) {
    var propertyLoadContextLcl = propertyLoadContext ? propertyLoadContext : {};
    var allChildNodes = [];

    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props || !_.size( childNode.props ) ) {
                childNode.props = {};

                if( cdm.isValidObjectUid( childNode.uid ) ) {
                    allChildNodes.push( childNode );
                }
            }
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    // if( uwDataProvider && !uwDataProvider.topTreeNode.props ) {
    //     allChildNodes.push( uwDataProvider.topTreeNode );
    // }

    if( _.isEmpty( allChildNodes ) ) {
        if( !_.isUndefined( uwDataProvider.columnConfig ) ) {
            propertyLoadResult.columnConfig = uwDataProvider.columnConfig;
        }

        return AwPromiseService.instance.resolve( {
            propertyLoadResult: propertyLoadResult
        } );
    }

    return tcViewModelObjectService.getTableViewModelProperties( allChildNodes, propertyLoadContextLcl ).then(
        function( response ) {
            if( response && !declViewModel.isDestroyed() ) {
                // munge columns and include on result

                var propColumns = response.output.columnConfig.columns;

                // first column is special here
                propColumns[ 0 ].isTreeNavigation = true;
            }

            return {
                propertyLoadResult: propertyLoadResult
            };
        } );
}

/**
 * function to evaluate if an object contains children
 * @param {objectType} objectType object type
 * @return {boolean} if node contains child
 */
function containChildren( props, vmNode ) {
    var containChild = false;
    if( vmNode.modelType.typeHierarchyArray.indexOf( 'Apm0QualityChecklist' ) > -1 && props.apm0QualityChecklistList.dbValues.length > 0 ) {
        vmNode.isLeaf = containChild;
    } else {
        vmNode.isLeaf = !containChild;
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
    var targetNode = parentNode;

    if( !parentNode.isLeaf ) {
        // get props with intial tree for now. In future, should set this to false and populate
        // the props seperately.
        var selected = appCtxService.getCtx( 'locationContext' );
        var soaInput = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: 'CAW0ChecklistColumns'
            },
            searchInput: {
                maxToLoad: 110,
                maxToReturn: 110,
                providerName: 'Awp0ObjectSetRowProvider',
                searchCriteria: {
                    objectSet: 'Sqm0QualityChecklistRel.Apm0QualityChecklist',
                    parentUid: appCtxService.ctx.selected.uid
                },
                startIndex: treeLoadInput.startChildNdx,
                searchSortCriteria: []
            }
        };

        var policyId = propertyPolicySvc.register( {
            types: [ {
                    name: 'Apm0QualityChecklist',
                    properties: [ {
                            name: 'object_name'
                        },
                        {
                            name: 'apm0ChecklistType'
                        },
                        {
                            name: 'apm0Mandatory'
                        },
                        {
                            name: 'apm0AssessmentRequired'
                        },
                        {
                            name: 'psi0State'
                        },
                        {
                            name: 'apm0Answer'
                        },
                        {
                            name: 'psi0Comment'
                        },
                        {
                            name: 'psi0ResponsibleUser'
                        },
                        {
                            name: 'apm0QualityChecklistList'
                        },
                        {
                            name: 'apm0ParentChecklist'
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
        } );

        _populateSortCriteriaParameters( soaInput.searchInput.searchSortCriteria, treeLoadInput );
        if( parentNode.levelNdx < 0 ) {
            var isLoadAllEnabled = true;
            var children = [];
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
                        var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                            endReached, null );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult,
                            columnConfig: response.columnConfig
                        } );
                    } else {
                        var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput );
                        deferred.resolve( {
                            treeLoadResult: treeLoadResult,
                            columnConfig: response.columnConfig
                        } );
                    }
                } );
        } else if( parentNode.levelNdx < _maxTreeLevel ) {
            var isLoadAllEnabled = true;
            var children = [];

            if( parentNode.props.apm0QualityChecklistList ) {
                for( var x = 0; x < parentNode.props.apm0QualityChecklistList.dbValues.length; ++x ) {
                    var uid = parentNode.props.apm0QualityChecklistList.dbValues[ x ];
                    var obj = cdm.getObject( uid );
                    if( obj ) {
                        children.push( obj );
                    }
                }
            }
            var objs = cdm.getObjects( parentNode.props.apm0QualityChecklistList.dbValues );
            soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', { objects: objs, attributes: [ 'apm0QualityChecklistList', 'apm0ParentChecklist' ] } )
                .then(
                    function() {
                        if( parentNode.props.apm0QualityChecklistList.dbValues.length === 0 ) {
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
                    }
                );
        } else {
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
    return treeLoadResult;
}

/**
 * @param {ObjectArray} columnInfos -
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 */
function _populateColumns( isLoadAllEnabled, vmNode ) {
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

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled ) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = modelObject.props.object_name.uiValues[ 0 ];

    var iconURL = iconSvc.getTypeIconURL( type );

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
    vmNode.modelType = modelObject.modelType;

    !containChildren( modelObject.props, vmNode );

    vmNode.selected = true;

    _populateColumns( isLoadAllEnabled, vmNode );
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

export let loadTreeTablePropertiesOnInitialLoad = function( vmNodes, declViewModel, uwDataProvider, context ) {
    var propertyLoadContextLcl = context ? context : {};
    _propertyLoadResult = awTableSvc.createPropertyLoadResult( vmNodes );

    var allChildNodes = [];

    if( uwDataProvider && uwDataProvider.columnConfig !== undefined && !uwDataProvider.columnConfig.columnConfigId ) {
        uwDataProvider.columnConfigLoadingInProgress = true;
        var loadVMOPropsThreshold = 0;

        _.forEach( vmNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};

                if( cdm.isValidObjectUid( childNode.uid ) && loadVMOPropsThreshold <= 50 ) {
                    allChildNodes.push( childNode );
                    loadVMOPropsThreshold++;
                }
            }
        } );

        if( uwDataProvider && !uwDataProvider.topTreeNode.props ) {
            allChildNodes.push( uwDataProvider.topTreeNode );
        }

        return tcViewModelObjectService.getTableViewModelProperties( allChildNodes, propertyLoadContextLcl ).then( function( response ) {
            if( response && !declViewModel.isDestroyed() ) {
                // munge columns and include on result
                var propColumns = response.output.columnConfig.columns;
                _.forEach( propColumns, function( col ) {
                    if( !col.typeName && col.associatedTypeName ) {
                        col.typeName = col.associatedTypeName;
                    }
                } );
                // first column is special here
                propColumns[ 0 ].isTreeNavigation = true;
                uwDataProvider.columnConfig = response.output.columnConfig;
                delete uwDataProvider.columnConfigLoadingInProgress;
            }
        } );
    }
    _propertyLoadResult.columnConfig = uwDataProvider.columnConfig;

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: _propertyLoadResult
    } );
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
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    var sortCriteria = appCtxService.getCtx( 'qualityChecklistManagerContext' ).sortCriteria;

    if( arguments[ 4 ] ) {
        if( !_.eq( arguments[ 4 ], sortCriteria ) ) {
            appCtxService.updatePartialCtx( 'qualityChecklistManagerContext.sortCriteria', arguments[ 4 ] );
            treeLoadInput.retainTreeExpansionStates = true;
        }
    }

    treeLoadInput.sortCriteria = appCtxService.getCtx( 'qualityChecklistManagerContext' ).sortCriteria;

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
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 */
export let loadTreeTableProperties = function() { // eslint-disable-line no-unused-vars
    /**
     * Extract action parameters from the arguments to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].propertyLoadInput, 'Missing argument property' );

    var uwDataProvider = arguments[ 0 ].uwDataProvider;
    var declViewModel = arguments[ 0 ].declViewModel;
    var propertyLoadInput = arguments[ 0 ].propertyLoadInput;
    var contextKey = arguments[ 0 ].contextKey;
    var propLoadCtxt = arguments[ 0 ].propertyLoadContext;

    if( uwDataProvider && !_.isUndefined( uwDataProvider.columnConfigLoadingInProgress ) ) {
        return AwPromiseService.instance.resolve( {
            propertyLoadResult: _propertyLoadResult
        } );
    }

    return _loadProperties( propertyLoadInput, propLoadCtxt, contextKey, declViewModel, uwDataProvider );
};

/**
 * Method to set Grid and Cell Decorator calls setDecoratorStyles function
 * @param {ViewModelObject} vmo - ViewModelObject(s) to set style on
 */

export let groupObjectsForDecorators = function( vmos, modifiedObjects ) {
    exports.setDecoratorStyles( vmos, false );
};

var setRYGDecorators = function( objectsToDecorate ) {
    _.forEach( objectsToDecorate, function( objInArr ) {
        var rygValue = objInArr.rygObject.props.apm0Rating.dbValues[ 0 ];
        if( rygValue ) {
            var rygDecoratorMap = RYG_DECORATOR_STYLE;
            if( rygDecoratorMap && rygDecoratorMap[ rygValue ].cellDecoratorStyle ) {
                objInArr.viewModelTreeNode.cellDecoratorStyle = rygDecoratorMap[ rygValue ].cellDecoratorStyle;
            }
            if( rygDecoratorMap && rygDecoratorMap[ rygValue ].gridDecoratorStyle ) {
                objInArr.viewModelTreeNode.gridDecoratorStyle = rygDecoratorMap[ rygValue ].gridDecoratorStyle;
            }
        } else {
            objInArr.viewModelTreeNode.cellDecoratorStyle = '';
            objInArr.viewModelTreeNode.gridDecoratorStyle = '';
        }
    } );
};
/**
 * Method to set Grid and Cell Decorator style to vmo
 * @param {ViewModelObject} vmos - ViewModelObject(s) to set style on
 * @param {Boolean} clearStyles - Clear style passed as false
 */

export let setDecoratorStyles = function( vmos, clearStyles, modifiedObjects ) {
    let objectSetRowVMOs = vmos.filter( vmo => vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) > -1 );
    if( objectSetRowVMOs.length > 0 ) {
        _.forEach( objectSetRowVMOs, function( vmo ) {
            setRYGDecorator( vmo );
        } );
        vmos = vmos.filter( vmo => vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) === -1 );
    }

    function rygObjectFilter( obj ) {
        return obj.modelType.typeHierarchyArray.indexOf( 'Apm0RYG' ) > -1 && !( obj.props && obj.props.hasOwnProperty( 'apm0RatedObject' ) && obj.props.hasOwnProperty( 'apm0Rating' ) );
    }
    var RYGObjects;
    if( modifiedObjects && Array.isArray( modifiedObjects ) && modifiedObjects.length > 0 ) {
        RYGObjects = modifiedObjects.filter( rygObjectFilter );
    }
    if( RYGObjects && RYGObjects.length > 0 ) {
        soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', { objects: RYGObjects, attributes: [ 'apm0RatedObject', 'apm0Rating' ] } )
            .then( function() {
                var objectsToDecorate = [];
                _.forEach( modifiedObjects, function( mod ) {
                    var vmo;
                    var rygObject;
                    var vmto;
                    if( mod.modelType.typeHierarchyArray.indexOf( 'Apm0RYG' ) > -1 ) {
                        rygObject = mod;
                        let vmoTag = mod.props.apm0RatedObject.dbValues[ 0 ];
                        vmo = cdm.getObject( vmoTag );
                        vmto = vmos.find( obj => obj.uid === vmo.uid );
                    } else if( mod.modelType.typeHierarchyArray.indexOf( 'Psi0AbsChecklist' ) > -1 ) {
                        vmo = mod;
                        let rygtag = mod.props.apm0RatedReference.dbValues[ 0 ];
                        rygObject = cdm.getObject( rygtag );
                        vmto = vmos.find( vmo => vmo.uid === mod.uid );
                    }
                    if( rygObject && vmto ) {
                        objectsToDecorate.push( {
                            rygObject: rygObject,
                            viewModelTreeNode: vmto
                        } );
                    }
                } );
                if( objectsToDecorate && objectsToDecorate.length > 0 ) {
                    setRYGDecorators( objectsToDecorate );
                    colorDecoratorService.setDecoratorStyles( objectsToDecorate.map( obj => obj.viewModelTreeNode ) );
                }
            } );
    } else if( modifiedObjects && Array.isArray( modifiedObjects ) && modifiedObjects.length > 0 ) {
        var objectsToDecorate = [];
        _.forEach( modifiedObjects, function( mod ) {
            var vmo;
            var rygObject;
            var vmto;
            if( mod.modelType.typeHierarchyArray.indexOf( 'Apm0RYG' ) > -1 ) {
                rygObject = mod;
                let vmoTag = mod.props.apm0RatedObject.dbValues[ 0 ];
                vmo = cdm.getObject( vmoTag );
                vmto = vmos.find( obj => obj.uid === vmo.uid );
            } else if( mod.modelType.typeHierarchyArray.indexOf( 'Psi0AbsChecklist' ) > -1 ) {
                vmo = mod;
                if( mod.props && mod.props.apm0RatedReference ) {
                    let rygtag = mod.props.apm0RatedReference.dbValues[ 0 ];
                    rygObject = cdm.getObject( rygtag );
                }
                vmto = vmos.find( vmo => vmo.uid === mod.uid );
            }
            if( rygObject && vmto ) {
                objectsToDecorate.push( {
                    rygObject: rygObject,
                    viewModelTreeNode: vmto
                } );
            }
        } );
        if( objectsToDecorate && objectsToDecorate.length > 0 ) {
            setRYGDecorators( objectsToDecorate );
            colorDecoratorService.setDecoratorStyles( objectsToDecorate.map( obj => obj.viewModelTreeNode ) );
        }
    } else {
        if( vmos && vmos.length > 0 ) {
            var RYGObjectTags = vmos.map( obj => obj.props.apm0RatedReference.dbValues[ 0 ] );
            RYGObjects = cdm.getObjects( RYGObjectTags );
            var RYGObjectsWOProps = RYGObjects.filter( rygObjectFilter );
            if( RYGObjectsWOProps && RYGObjectsWOProps.length > 0 ) {
                soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', { objects: RYGObjectsWOProps, attributes: [ 'apm0RatedObject', 'apm0Rating' ] } )
                    .then( function() {
                        var objectsToDecorate = [];
                        _.forEach( vmos, function( mod ) {
                            var rygObject;
                            var vmto;
                            if( mod.modelType.typeHierarchyArray.indexOf( 'Psi0AbsChecklist' ) > -1 ) {
                                let rygtag = mod.props.apm0RatedReference.dbValues[ 0 ];
                                rygObject = RYGObjects.find( obj => obj.uid === rygtag );
                                vmto = mod;
                            }
                            if( rygObject ) {
                                objectsToDecorate.push( {
                                    rygObject: rygObject,
                                    viewModelTreeNode: vmto
                                } );
                            }
                        } );
                        if( objectsToDecorate && objectsToDecorate.length > 0 ) {
                            setRYGDecorators( objectsToDecorate );
                            colorDecoratorService.setDecoratorStyles( objectsToDecorate.map( obj => obj.viewModelTreeNode ) );
                        }
                    } );
            } else {
                var objectsToDecorate = [];
                _.forEach( vmos, function( mod ) {
                    var rygObject;
                    var vmto;
                    if( mod.modelType.typeHierarchyArray.indexOf( 'Psi0AbsChecklist' ) > -1 ) {
                        let rygtag = mod.props.apm0RatedReference.dbValues[ 0 ];
                        rygObject = RYGObjects.find( obj => obj.uid === rygtag );
                        vmto = mod;
                    }
                    if( rygObject && vmto ) {
                        objectsToDecorate.push( {
                            rygObject: rygObject,
                            viewModelTreeNode: vmto
                        } );
                    }
                } );
                if( objectsToDecorate && objectsToDecorate.length > 0 ) {
                    setRYGDecorators( objectsToDecorate );
                    colorDecoratorService.setDecoratorStyles( objectsToDecorate.map( obj => obj.viewModelTreeNode ) );
                }
            }
        }
    }
};

/**
 * Method to set Grid and Cell Decorator style to vmo through Constant Map
 * @param {ViewModelObject} vmo - ViewModelObject(s) to set style on
 */

var setRYGDecorator = function( vmo ) {
    var vmObj = vmo;
    if( vmo.modelType.typeHierarchyArray.indexOf( 'Awp0XRTObjectSetRow' ) > -1 ) {
        if( vmo.props.awp0Target.dbValue ) {
            vmObj = cdm.getObject( vmo.props.awp0Target.dbValue );
        }
    }

    if( vmObj.props.apm0RatedReference ) {
        var targetUid = vmObj.props.apm0RatedReference.dbValues;
        var targetObj = cdm.getObject( targetUid );
        var propsToLoad = [ 'apm0Rating' ];
        var uidArr = [ targetUid ];

        dms.getProperties( uidArr, propsToLoad )
            .then(
                function() {
                    var rygValue = targetObj.props.apm0Rating.dbValues[ 0 ];

                    if( rygValue ) {
                        var rygDecoratorMap = RYG_DECORATOR_STYLE;
                        if( rygDecoratorMap && rygDecoratorMap[ rygValue ].cellDecoratorStyle ) {
                            vmo.cellDecoratorStyle = rygDecoratorMap[ rygValue ].cellDecoratorStyle;
                        }
                        if( rygDecoratorMap && rygDecoratorMap[ rygValue ].gridDecoratorStyle ) {
                            vmo.gridDecoratorStyle = rygDecoratorMap[ rygValue ].gridDecoratorStyle;
                        }
                    } else {
                        vmo.cellDecoratorStyle = '';
                        vmo.gridDecoratorStyle = '';
                    }
                }
            );
    }
};

/**
 * Method to set properties on failure cause and effect Business Object modifiable
 * @param {Object} columnConfig - columnConfig to set the properties non-modifiable
 * @returns {Object}
 */
export let setNonModifiablePropForChecklist = function( response ) {
    if( response && response.columnConfig && response.columnConfig.columns ) {
        for( var index = 0; index < response.columnConfig.columns.length; index++ ) {
            if( response.columnConfig.columns[ index ].propertyName === 'apm0Answer' ) {
                response.columnConfig.columns[ index ].modifiable = false;
            }
        }
        return response.columnConfig;
    }
};
export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableProperties,
    loadTreeTablePropertiesOnInitialLoad,
    groupObjectsForDecorators,
    setDecoratorStyles,
    setNonModifiablePropForChecklist
};
/**
 * @memberof NgServices
 * @member SQM0ChecklistTreeService
 */
app.factory( 'SQM0ChecklistTreeService', () => exports );
