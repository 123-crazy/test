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
 * @module js/Aqc0CharLibraryTreeTableService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import _aqc0CharManagerUtils from 'js/Aqc0CharManagerUtils';
import Aqc0CharManagerUtils2 from 'js/Aqc0CharManagerUtils2';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';

var _deferExpandTreeNodeArray = [];
var _prev_location_context = '';
var _mapOfCharGroupAndSpecification = new Map();
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

appCtxService.registerCtx( 'pinnedToForm', false );
appCtxService.registerCtx( 'unpinnedToForm', true );


/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data ) {
    if ( !appCtxService.ctx.currentTypeSelection ) {
        _aqc0CharManagerUtils.getCurrentType();
    }
    var cur_location_context = appCtxService.ctx.currentTypeSelection.dbValue;
    if ( !_treeTableColumnInfos || cur_location_context !== _prev_location_context ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos( data );
        _prev_location_context = cur_location_context;
    }

    return _treeTableColumnInfos;
}
/**
 * @return {displayName} Object Name for column header of table
 */

function findDisplayName( data ) {
    var displayName = appCtxService.ctx.currentTypeSelection.dbValue;
    if ( displayName === 'Qc0CharacteristicsGroup' ) { return data.i18n.Name; }
    if ( displayName === 'Acp0Rule' ) { return data.i18n.Aqc0RuleTitle; }
    if ( displayName === 'Acp0NamingConvention' ) { return data.i18n.Aqc0NamingConventionTitle; }
}

/**

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
        propertyName: 'object_name',
        displayName: findDisplayName( data ),
        width: 250,
        minWidth: 150,
        typeName: 'String',
        enableColumnResizing: true,
        enableColumnMoving: false,
        isTreeNavigation: true
    } ) );
    if ( appCtxService.ctx.currentTypeSelection.dbValue === 'Qc0CharacteristicsGroup' ) {
        awColumnInfos.push( awColumnSvc.createColumnInfo( {
            name: 'qc0CharacteristicsType',
            propertyName: 'qc0CharacteristicsType',
            displayName: data.i18n.Type,
            width: 250,
            minWidth: 150,
            typeName: 'String',
            enableColumnResizing: true,
            enableColumnMoving: false,
            isTreeNavigation: false
        } ) );
        awColumnInfos.push( awColumnSvc.createColumnInfo( {
            name: 'object_desc',
            propertyName: 'object_desc',
            displayName: data.i18n.Description,
            width: 250,
            minWidth: 150,
            typeName: 'String',
            enableColumnResizing: true,
            enableColumnMoving: false,
            isTreeNavigation: false
        } ) );
        if ( appCtxService.ctx.isTC13_2OnwardsSupported ) {
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
    }
    for ( var index = 0; index < awColumnInfos.length; index++ ) {
        var column = awColumnInfos[index];
        column.cellRenderers = [];
    }
    var sortCriteria = appCtxService.ctx.charLibmanagercontext.sortCriteria;
    if ( !_.isEmpty( sortCriteria ) ) {
        if ( sortCriteria[0].fieldName && _.eq( awColumnInfos[0].name, sortCriteria[0].fieldName ) ) {
            awColumnInfos[0].sort = {};
            awColumnInfos[0].sort.direction = sortCriteria[0].sortDirection.toLowerCase();
            awColumnInfos[0].sort.priority = 0;
        }
    }
    return awColumnInfos;
}

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
 */
function _buildTreeTableStructure( columnInfos, parentNode, nChildren, isLoadAllEnabled ) {
    var children = [];

    _mapNodeId2ChildArray[parentNode.id] = children;

    var levelNdx = parentNode.levelNdx + 1;

    for ( var childNdx = 1; childNdx <= nChildren.length; childNdx++ ) {
        /**
         * Create a new node for this level. and Create props for it
         */
        var vmNode = exports.createVmNodeUsingNewObjectInfo( nChildren[childNdx - 1], levelNdx, childNdx, isLoadAllEnabled, columnInfos );
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
 * function to evaluate if an object contains children
 * @param {objectType} objectType object type
 * @return {boolean} if node contains child
 */
function containChildren( props, vmNode ) {
    var deferred = AwPromiseService.instance.defer();
    var containChild = false;
    if ( vmNode.type === 'Qc0CharacteristicsGroup' ) {
        var specsList = _mapOfCharGroupAndSpecification.get( vmNode.uid );
        if ( specsList && specsList.length > 0 ) {
            vmNode.isLeaf = containChild;
        } else {
            vmNode.isLeaf = !containChild;
        }
    } else {
        vmNode.isLeaf = !containChild;
    }
    if ( !vmNode.isLeaf && appCtxService.ctx.charLibmanagercontext.parentElement && vmNode.uid === appCtxService.ctx.charLibmanagercontext.parentElement.uid ) {
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
    var targetNode;
    // this context value comes true only when breadcrumb is updated from chevron
    if ( !parentNode.isExpanded ) {
        var locationCtx = appCtxService.getCtx( 'locationContext' );
        targetNode = locationCtx.modelObject;
    } else {
        targetNode = parentNode;
    }

    if ( !parentNode.isLeaf ) {
        // get props with intial tree for now. In future, should set this to false and populate
        // the props seperately.
        var soaInput = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: ''
            },
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Awp0SavedQuerySearchProvider',
                searchCriteria: getSearchCriteriaInputForCharLib(),
                cursor: {
                    startIndex: 0
                },
                searchSortCriteria: [],
                searchFilterFieldSortType: 'Priority'

            }
        };

        _populateSortCriteriaParameters( soaInput.searchInput.searchSortCriteria, treeLoadInput );
        if ( parentNode.levelNdx < 0 ) {
            var isLoadAllEnabled = true;
            var children = [];

            return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then(
                function( response ) {
                    if ( response.searchResultsJSON ) {
                        var loadChxObjectInputArr = [];
                        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                        if ( searchResults ) {
                            for ( var x = 0; x < searchResults.objects.length; ++x ) {
                                var uid = searchResults.objects[x].uid;
                                var obj = response.ServiceData.modelObjects[uid];
                                if ( obj ) {
                                    children.push( obj );
                                    loadChxObjectInputArr.push( obj );
                                }
                            }
                            var loadChxObjectInput = {
                                objects: loadChxObjectInputArr,
                                attributes: [ 'qc0SpecificationList' ]
                            };
                            if ( _mapOfCharGroupAndSpecification.size === 0 && appCtxService.ctx.currentTypeSelection.dbValue === 'Qc0CharacteristicsGroup' ) {
                                var policyJson = {
                                    types: [ {
                                        name: 'Qc0MasterCharSpec',
                                        properties: [ {
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
                                var policyId = propertyPolicySvc.register( policyJson );
                                soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', loadChxObjectInput ).then( function( getPropertiesResponse ) {
                                    if( policyId ) {
                                        propertyPolicySvc.unregister( policyId );
                                    }
                                    var charGroups = getPropertiesResponse.plain;
                                    for ( var charGroup of charGroups ) {
                                        var charSpecs = cdm.getObject( charGroup ).props.qc0SpecificationList.dbValues;
                                        _mapOfCharGroupAndSpecification.set( charGroup, charSpecs );
                                    }
                                    eventBus.publish( 'charLibraryTree.plTable.reload' );
                                    deferred.resolve( getPropertiesResponse );
                                } );
                            }
                        }
                    }
                    if ( response.totalFound === 0 ) {
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
                    appCtxService.ctx.search.totalFound = response.totalFound;
                    appCtxService.ctx.search.filterMap = response.totalLoaded;
                } );
        }
        if ( parentNode.levelNdx < _maxTreeLevel ) {
            var isLoadAllEnabled = true;
            var children = [];
            soaInput.searchInput.searchCriteria.parentGUID = targetNode.uid;
            if ( parentNode.type === 'Qc0CharacteristicsGroup' ) {
                var specsList = _mapOfCharGroupAndSpecification.get( parentNode.uid );
                if ( specsList && specsList.length > 0 ) {
                    for ( var i = 0; i < specsList.length; i++ ) {
                        children.push( cdm.getObject( specsList[i] ) );
                    }
                    var treeLoadResult = _getTreeLoadResult( parentNode, children, isLoadAllEnabled, treeLoadInput );
                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                } else {
                    parentNode.isLeaf = true;
                    var endReached = true;
                    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                        endReached, null );
                    deferred.resolve( {
                        treeLoadResult: treeLoadResult
                    } );
                }
            } else {
                parentNode.isLeaf = true;
                var endReached = true;
                var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, children, false, true,
                    endReached, null );
                deferred.resolve( {
                    treeLoadResult: treeLoadResult
                } );
            }
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
    if ( parentNode.children !== undefined && parentNode.children !== null ) {
        var mockChildNodes = parentNode.children.concat( _mapNodeId2ChildArray[parentNode.id] );
    } else {
        var mockChildNodes = _mapNodeId2ChildArray[parentNode.id];
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
    if ( _deferExpandTreeNodeArray.length > 0 ) {
        _.defer( function() {
            // send event that will be handled in this file to check
            // if there are nodes to be expanded. This defer is needed
            // to make sure tree nodes are actually loaded before we attempt
            // to expand them. Fixes a timing issue if not deferred.
            eventBus.publish( 'charLibraryExpandTreeNodeEvent' );
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
    if ( isLoadAllEnabled ) {
        if ( !vmNode.props ) {
            vmNode.props = {};
        }

        var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( cdm.getObject( vmNode.uid ), 'EDIT' );

        tcViewModelObjectService.mergeObjects( vmNode, vmo );
    }
}

var exports = {};

export let createVmNodeUsingNewObjectInfo = function( modelObject, levelNdx, childNdx, isLoadAllEnabled, columnInfos ) {
    var nodeId = modelObject.uid;
    var type = modelObject.type;
    var displayName = modelObject.props.object_name.dbValues[0];

    var iconURL = iconSvc.getTypeIconURL( type );

    var vmNode = awTableSvc.createViewModelTreeNode( nodeId, type, displayName, levelNdx, childNdx, iconURL );
    vmNode.modelType = modelObject.modelType;

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
    var treeLoadInput = arguments[0];
    var sortCriteria = appCtxService.getCtx( 'charLibmanagercontext' ).sortCriteria;

    if ( arguments[4] ) {
        if ( !_.eq( arguments[4], sortCriteria ) ) {
            appCtxService.updatePartialCtx( 'charLibmanagercontext.sortCriteria', arguments[4] );
            treeLoadInput.retainTreeExpansionStates = true;
        }
    }

    treeLoadInput.sortCriteria = appCtxService.getCtx( 'charLibmanagercontext' ).sortCriteria;
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

    for ( var ndx = 0; ndx < arguments.length; ndx++ ) {
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
 * This makes sure, edited object is selected
 * @param {data} data
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function( data, selectionModel ) {
    var selectedModelObject = appCtxService.ctx.charLibmanagercontext.selectedNodes;

    //get s_uid from browser url to set/maintain the selection ,only when object is not newly created, used specially at browser refresh
    if ( !appCtxService.ctx.createdObjUid ) {
        Aqc0CharManagerUtils2.setQueryParams( selectionModel );
    }

    //scenario -create version / save as
    if ( appCtxService.ctx.createdObjectForTreeFromAddAction ) {
        selectionModel.setSelection( appCtxService.ctx.createdObjectForTreeFromAddAction );
    }

    //scenario -create version using save/discard popup (selection change)
    if ( !appCtxService.ctx.createdObjectForTreeFromAddAction && selectedModelObject && selectedModelObject.length > 0 ) {
        selectionModel.setSelection( selectedModelObject );
    }

    //scenario - collapse/expand should remove the selection
    if ( !appCtxService.ctx.versionCreatedFlag && !appCtxService.ctx.AddSpecificationFlagForTree && data.treeLoadInput.parentNode.isExpanded === true &&
        selectedModelObject && selectedModelObject.length > 0 && selectedModelObject[0].modelType.typeHierarchyArray.indexOf( 'Qc0MasterCharSpec' ) > -1 &&
        data.treeLoadInput.parentNode.uid === selectedModelObject[0].props.qc0GroupReference.dbValues[0] ) {
        //scenario - to remove the selection when user collapse/expand the group
        if ( appCtxService.ctx.selected && appCtxService.ctx.createdObjectForTreeFromAddAction &&
            appCtxService.ctx.selected.uid !== appCtxService.ctx.createdObjectForTreeFromAddAction.uid ) {
            selectionModel.setSelection( [] );
        }
        selectionModel.setSelection( [] );
    }

    //scenario - SAVE AS specification in a group which is not expanded (group should be selected)
    if ( appCtxService.ctx.createdObjectForTreeFromAddAction &&
        ( appCtxService.ctx.createdObjectForTreeFromAddAction.props.qc0GroupReference &&
            appCtxService.ctx.createdObjectForTreeFromAddAction.props.qc0GroupReference.dbValues[0] !== data.treeLoadInput.parentNode.uid && appCtxService.ctx.AddSpecificationFlagForTree ) ) {
        _.forEach( appCtxService.ctx.treeVMO.viewModelCollection.loadedVMObjects, function( object ) {
            if ( object.uid === appCtxService.ctx.createdObjectForTreeFromAddAction.props.qc0GroupReference.dbValues[0] ) {
                //selectionModel.setSelection( object );
                object.isExpanded = true;
                _deferExpandTreeNodeArray.push( object );
                charLibraryExpandTreeNode();
                selectionModel.setSelection( appCtxService.ctx.createdObjectForTreeFromAddAction );
            }
        } );
    }
};

/**
 * This wll close any tools and info panel if any open
 * @param {object} data data of viewmodel
 */
export let selectionChanged = function( data ) {
    appCtxService.ctx.createdObjectForTreeFromAddAction = undefined;
    appCtxService.ctx.AddSpecificationFlagForTree = false;
    appCtxService.ctx.versionCreatedFlag = false;
    var selectedNodes = data.eventData.selectedObjects;
    if ( selectedNodes.length > 0 ) {
        if ( appCtxService.ctx.charLibmanagercontext === undefined ||
            appCtxService.ctx.charLibmanagercontext === '' ) {
            appCtxService.ctx.charLibmanagercontext = {};
        }
    }
    appCtxService.ctx.charLibmanagercontext.selectedNodes = selectedNodes;
    Aqc0CharManagerUtils2.addQueryParamsToBrowserURL();
};

export let charLibraryExpandTreeNode = function() {
    _.defer( function() {
        // _deferExpandTreeNodeArray contains nodes we want to expand. We
        // had to make these deferred calls to allow the tree to draw before
        // we asked it to expand a node.
        for ( var x = 0; x < _deferExpandTreeNodeArray.length; x++ ) {
            eventBus.publish( 'charLibraryDataProvider.expandTreeNode', {
                // ask tree to expand a node
                parentNode: _deferExpandTreeNodeArray[x]
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
    appCtxService.ctx.charLibmanagercontext = {};
    appCtxService.ctx.charLibmanagercontext.selectedNodes = [];
    if ( data.pinnedToForm.dbValue ) {
        appCtxService.ctx.charLibmanagercontext.selectedNodes = data.selectedNodes;
    } else {
        if ( appCtxService.ctx.selected ) {
            appCtxService.ctx.charLibmanagercontext.selectedNodes.push( appCtxService.ctx.selected );
        }
    }
};

/**
 * Returns the search criteria with vaild inputs for characteristics library sublocation.
 * It also populates the search filter information.
 */
export let getSearchCriteriaInputForCharLib = function() {
    var searchCriteriaInput = {};
    if ( appCtxService.ctx.search && appCtxService.ctx.search.criteria ) {
        var criteria = appCtxService.ctx.search.criteria;
        // Populate the search criteria input
        searchCriteriaInput = {
            queryName: criteria.queryName,
            searchID: criteria.searchID,
            lastEndIndex: criteria.lastEndIndex,
            totalObjectsFoundReportedToClient: criteria.totalObjectsFoundReportedToClient,
            typeOfSearch: criteria.typeOfSearch,
            utcOffset: criteria.utcOffset,
            Type: appCtxService.ctx.currentTypeSelection.dbValue
        };
        // Add the 'name' key to the search createria only if a vaild search filter is present.
        if ( criteria.searchString && criteria.searchString.trim().length > 0 ) {
            searchCriteriaInput.Name = exports.getSearchFailureFilterBoxValue( criteria.searchString );
        }
    }
    return searchCriteriaInput;
};
/**
 *Returns the search filter string .wild character is returned if an empty string is passed.
 *
 * @param {Sting} filterString filter string
 * @returns {Sting}  filter string or wild character
 */
export let getSearchFailureFilterBoxValue = function( filterString ) {
    if ( filterString && filterString.trim() !== '' ) {
        return '*' + filterString + '*';
    }
    return '*';
};

/**
 * This method is clear the content of Map used to store the Char Groups and Its specifications
 */
export let clearMapOfCharGroupAndSpecification = function() {
    _mapOfCharGroupAndSpecification.clear();
};

// This method to update pin unpin status of char spec panel
export let updatePinnedToForm = function( data ) {
    appCtxService.updateCtx( 'pinnedToForm',  data.pinnedToForm.dbValue );
    appCtxService.updateCtx( 'unpinnedToForm',  data.unpinnedToForm.dbValue );
};

export default exports = {
    createVmNodeUsingNewObjectInfo,
    loadTreeTableColumns,
    loadTreeTableData,
    loadTreeTableProperties,
    processPWASelection,
    selectionChanged,
    charLibraryExpandTreeNode,
    selectNewlyAddedElement,
    getSearchCriteriaInputForCharLib,
    getSearchFailureFilterBoxValue,
    clearMapOfCharGroupAndSpecification,
    updatePinnedToForm
};
/**
 * @memberof NgServices
 * @member Aqc0CharLibraryTreeTableService
 */
app.factory( 'Aqc0CharLibraryTreeTableService', () => exports );
