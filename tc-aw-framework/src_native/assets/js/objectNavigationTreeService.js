// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */
/**
 * @module js/objectNavigationTreeService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import treeTableDataService from 'js/treeTableDataService';
import cdm from 'soa/kernel/clientDataModel';
import awColumnSvc from 'js/awColumnService';
import awIconService from 'js/awIconService';
import { sortResults, getDefaultPageSize, updateNavigateContext, clearRelatedModifiedInfo } from 'js/objectNavigationService';
import AwStateService from 'js/awStateService';
import { getEvaluatedObjsForSelection } from 'js/awConfiguredRevService';
import assert from 'assert';
import _ from 'lodash';
import { drop } from 'js/awDragAndDropService';

import 'js/tcViewModelObjectService';

var exports = {};
var _firstColumnPropertyName = null;
var rootFolderTotalFound = null;
var autoExpandNodeUid = null;

var policyIOverride = {
    types: [ {
        name: 'WorkspaceObject',
        properties: [ {
            name: 'object_name'
        } ]
    }, {
        name: 'Folder',
        properties: [ {
            name: 'awp0HasChildren'
        } ]
    } ]
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
export let loadTreeTableColumns = function( uwDataProvider ) {
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

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

    return deferred.promise;
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
 * Function to update tree table columns
 * @param {Object} data Contains data
 * @param {Object} dataProvider Contains data provider for the tree table
 */
export let updateObjNavTreeTableColumns = function( data, dataProvider ) {
    if( dataProvider && data.newColumnConfig ) {
        var propColumns = data.newColumnConfig.columns;
        updateColumnPropsAndNodeIconURLs( propColumns, dataProvider.getViewModelCollection().getLoadedViewModelObjects() );
        data.newColumnConfig.columns = propColumns;
        dataProvider.columnConfig = data.newColumnConfig;
    }
};

/**
 * Function to update tree table columns props and icon urls
 * @param {Object} propColumns Contains prop columns
 * @param {Object} childNodes Contains tree nodes
 */
function updateColumnPropsAndNodeIconURLs( propColumns, childNodes ) {
    _.forEach( propColumns, function( col ) {
        if( !col.typeName && col.associatedTypeName ) {
            col.typeName = col.associatedTypeName;
        }
    } );
    propColumns[ 0 ].enableColumnMoving = false;
    _firstColumnPropertyName = propColumns[ 0 ].propertyName;

    _.forEach( childNodes, function( childNode ) {
        childNode.iconURL = awIconService.getTypeIconFileUrl( childNode );
        treeTableDataService.updateVMODisplayName( childNode, _firstColumnPropertyName );
    } );
}

/**
 * Makes sure the displayName on the ViewModelTreeNode is the same as the Column 0 ViewModelProperty
 * @param {Object} eventData Contains viewModelObjects and modifiedObjects
 */
export let updateDisplayNames = function( eventData ) {
    //update the display name for all ViewModelObjects which should be viewModelTreeNodes
    if( eventData && eventData.viewModelObjects ) {
        _.forEach( eventData.viewModelObjects, function( updatedVMO ) {
            treeTableDataService.updateVMODisplayName( updatedVMO, _firstColumnPropertyName );
        } );
    }

    if( eventData && eventData.modifiedObjects && eventData.vmc ) {
        var loadedVMObjects = eventData.vmc.loadedVMObjects;
        _.forEach( eventData.modifiedObjects, function( modifiedObject ) {
            var modifiedVMOs = loadedVMObjects.filter( function( vmo ) { return vmo.id === modifiedObject.uid; } );
            _.forEach( modifiedVMOs, function( modifiedVMO ) {
                treeTableDataService.updateVMODisplayName( modifiedVMO, _firstColumnPropertyName );
            } );
        } );
    }
};

/**
 * Updates the mseleted with updated vmNode value for enabling paste command condition
 * @param {Object} vmNodes Contains ViewModelTreeNodes objects
 */
export let updateMSelectedWithProperties = function( vmNodes ) {
    var mSelected = appCtxSvc.getCtx( 'mselected' );
    if( mSelected.length === 1 ) {
        _.forEach( vmNodes, function( vmNode ) {
            if( vmNode.alternateID === mSelected[ 0 ].alternateID ) {
                appCtxSvc.registerCtx( 'mselected', [ vmNode ] );
            }
        } );
    }
};

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
 * Get a page of row column data for a tree-table.
 *
 * Note: This method assumes there is a single argument object being passed to it and that this object has the
 * following property(ies) defined in it.
 * <P>
 * {PropertyLoadInput} propertyLoadInput - (found within the 'arguments' property passed to this function) The
 * PropertyLoadInput contains an array of PropertyLoadRequest objects this action function is invoked to
 * resolve.
 *
 * @return {Promise} A Promise resolved with a 'PropertyLoadResult' object containing the details of the result.
 */
export let loadTreeTableProperties = function() {
    arguments[ 0 ].updateColumnPropsCallback = getDataForUpdateColumnPropsAndNodeIconURLs();
    arguments[ 0 ].propertyLoadInput.propertyLoadRequests[ 0 ].childNodes = arguments[ 0 ].uwDataProvider.viewModelCollection.loadedVMObjects;
    return AwPromiseService.instance.resolve( treeTableDataService.loadTreeTableProperties( arguments[ 0 ] ) );
};

export let loadTreeTableData = function( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput, relatedModifiedInfo ) {
    assert( searchInput, 'Missing search input' );
    assert( treeLoadInput, 'Missing tree load input' );

    treeLoadInput.displayMode = 'Tree';

    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        return AwPromiseService.instance.reject( failureReason );
    }

    return AwPromiseService.instance.resolve( _buildTreeTableStructure( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput, relatedModifiedInfo ) );
};

let initiateNavContextUpdateBeforeSort = ( searchResults, searchInputSearchCriteriaParentUid, relatedModifiedInfo ) => {
    if( relatedModifiedInfo && relatedModifiedInfo.relatedModified && ( relatedModifiedInfo.createdObjects || relatedModifiedInfo.childObjects ) ) {
        //commenting the below lines as navigationContext update (resulting into showing up of newly created object at top of the list)
        // is not supported in the original feature; will be reinstated and further worked upon if customer requirement arises

        /*let relatedModified = relatedModifiedInfo.relatedModified[ relatedModifiedInfo.relatedModified.length - 1 ];
        let { createdObjects, childObjects } = relatedModifiedInfo;
        if( searchInputSearchCriteriaParentUid === relatedModified.uid ) {
            let { evaluatedObjs, objsFound } = getEvaluatedObjsForSelection( createdObjects, searchResults );
            if( objsFound ) {
                updateNavigateContext( relatedModified.uid, evaluatedObjs, childObjects );
            }
        }*/
        expandRelatedModifiedIfCollapsed( relatedModifiedInfo.relatedModified );
    }
};

/**
 * @param {SearchInput} searchInput - search input for SOA
 * @param {ColumnConfigInput} columnConfigInput - column config for SOA
 * @param {SaveColumnConfigData} saveColumnConfigData - save column config for SOA
 * @param {TreeLoadInput} treeLoadInput - tree load input
 * @return {Promise} A Promise resolved with a 'TreeLoadResult' object containing the details of the result.
 */
function _buildTreeTableStructure( searchInput, columnConfigInput, saveColumnConfigData, treeLoadInput, relatedModifiedInfo ) {
    var target = {};
    var soaSearchInput = searchInput;
    var parentNode = treeLoadInput.parentNode;
    var treeLoadOutput = {};

    if( !parentNode.isExpanded ) {
        target.uid = AwStateService.instance.params.uid;
    } else {
        target.uid = parentNode.uid;
        target.type = parentNode.type;
    }

    treeLoadInput.parentElement = target.levelNdx === -1 ? 'AAAAAAAAAAAAAA' : target.uid;
    treeLoadInput.displayMode = 'Tree';
    soaSearchInput.searchCriteria.parentUid = treeLoadInput.parentElement;

    return getTableSummary( soaSearchInput, columnConfigInput, saveColumnConfigData, relatedModifiedInfo ).then( function( response ) {
        var vmNodes = [];
        if( !parentNode.isExpanded ) {
            var emptyFolderOpened = _.isEmpty( response.searchResults ) && response.totalFound === 0;

            var rootPathNodes = _buildRootPath( cdm.getObject( target.uid ), !emptyFolderOpened, response );

            if( rootPathNodes.length > 0 ) {
                treeLoadOutput.rootPathNodes = rootPathNodes;
                treeLoadOutput.newTopNode = _.first( treeLoadOutput.rootPathNodes );
            }
        }

        if( !emptyFolderOpened ) {
            if( response.searchResultsJSON ) {
                var searchResults = JSON.parse( response.searchResultsJSON );
                if( searchResults ) {
                    for( var x = 0; x < searchResults.objects.length; ++x ) {
                        var uid = searchResults.objects[ x ].uid;
                        var obj = cdm.getObject( uid );
                        if( obj ) {
                            vmNodes.push( obj );
                        }
                    }
                }
            }
        } else {
            vmNodes.push( _.first( rootPathNodes ) );
        }

        var treeLoadResult = exports.createTreeLoadResult( response, treeLoadInput, vmNodes );

        _.forEach( treeLoadOutput, function( value, name ) {
            if( !_.isUndefined( value ) ) {
                treeLoadResult[ name ] = value;
            }
        } );

        return AwPromiseService.instance.resolve( {
            treeLoadResult: treeLoadResult
        } );
    } );
}

/**
 * Function
 *
 * @param {*} parentModelObj parentOccurrence of getOccurrences response
 * @param {*} addExtraTopNodeInRootPathHierarchy true if showTopNode is true
 * @param {*} totalFound totalFound for the expanded node
 * @returns{*} rootPath Hierarchy for given parentModelObj
 */
function _buildRootPath( parentModelObj, addExtraTopNodeInRootPathHierarchy, response ) {
    /**
     * Determine the path to the 'root' occurrence IModelObject starting at the immediate 'parent' (t_uid)
     * object.
     */
    var rootPathNodes = [];
    var rootPathObjects = [];
    var pathModelObject = parentModelObj;

    if( pathModelObject ) {
        rootPathObjects.push( pathModelObject );

        if( addExtraTopNodeInRootPathHierarchy ) {
            rootPathObjects.push( pathModelObject );
        }
    }

    /**
     * Determine new 'top' node by walking back from bottom-to-top of the rootPathObjects and creating nodes to
     * wrap them.
     */
    var nextLevelNdx = -1;

    for( var ndx = rootPathObjects.length - 1; ndx >= 0; ndx-- ) {
        var currNode = createVMNodeUsingObjectInfo( rootPathObjects[ ndx ], 0, nextLevelNdx++ );
        var rootPathNodesLength = rootPathObjects.length - 1;
        /**
         * Note: We mark all necessary 'parent' path nodes as 'placeholders' so that we can find them later and
         * fill them out as needed (when they come into view)
         */
        var isPlaceholder = !( ndx === rootPathNodesLength || addExtraTopNodeInRootPathHierarchy && ndx === rootPathNodesLength - 1 );
        currNode.alternateID = getUniqueIdForEachNode( currNode );
        currNode.isExpanded = true;
        currNode.isPlaceholder = isPlaceholder;
        currNode.totalFound = response.totalFound;
        if( response.totalFound > 0 ) {
            currNode.isLeaf = false;
        }
        if( ndx === 0 && response.cursor ) {
            currNode.cursorObject = response.cursor;
        }
        if( currNode.alternateID === AwStateService.instance.params.s_uid ) {
            appCtxSvc.updatePartialCtx( 'search.totalFound', currNode.totalFound );
        }
        rootPathNodes.push( currNode );
    }

    /**
     * Breadcrumb reflects the count which is fetched from ctx entry 'search.totalFound'. For reflecting this count, we are storing the
     * totalFound of each expanded parent node in its child nodes. When we select and unselect a tree node, we are not getting any selected
     * node in $scope.updatePrimarySelection code block. As when no node is selected then the selection is shown as root folder.
     * We have to update the selection to root folder and totalFound count along with it. For showing the same we are adding this variable.
     */
    rootFolderTotalFound = _.last( rootPathNodes ).totalFound;

    return rootPathNodes;
}

/**
 * @param {SearchInput} searchInput - search input for SOA
 * @param {ColumnConfigInput} columnConfigInput - column config for SOA
 * @param {SaveColumnConfigData} saveColumnConfigData - save column config for SOA
 * @param {TreeLoadInput} treeLoadInput - tree load input
 * @return {Response} response A response object containing the details of the result.
 */
function getTableSummary( searchInput, columnConfigInput, saveColumnConfigData, relatedModifiedInfo ) {
    return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', {
            columnConfigInput: columnConfigInput,
            saveColumnConfigData: saveColumnConfigData,
            searchInput: searchInput,
            inflateProperties: false,
            noServiceData: false
        }, policyIOverride )
        .then(
            function( response ) {
                if( response.searchResultsJSON ) {
                    response.searchResults = JSON.parse( response.searchResultsJSON );
                }
                initiateNavContextUpdateBeforeSort( response.searchResults.objects, searchInput.searchCriteria.parentUid, relatedModifiedInfo );
                // Create view model objects
                response.searchResults = response.searchResults &&
                    response.searchResults.objects ? response.searchResults.objects
                    .map( function( vmo ) {
                        return viewModelObjectService
                            .createViewModelObject( vmo.uid, 'EDIT', null, vmo );
                    } ) : [];

                // Collect all the prop Descriptors
                var propDescriptors = [];
                _.forEach( response.searchResults, function( vmo ) {
                    _.forOwn( vmo.propertyDescriptors, function( value ) {
                        propDescriptors.push( value );
                    } );
                } );

                // Weed out the duplicate ones from prop descriptors
                response.propDescriptors = _.uniq( propDescriptors, false,
                    function( propDesc ) {
                        return propDesc.name;
                    } );

                //Sort by creation date if the context is set
                response.searchResults = sortResults(
                    searchInput.searchCriteria.parentUid, response.searchResults );
                return response;
            } );
}

/**
 * Get created object. Return ItemRev if the creation type is Item.
 *
 * @param {Object} response the response of createRelateAndSubmitObjects SOA call
 * @param {Object} treeLoadInput the response of createRelateAndSubmitObjects SOA call
 * @param {Object} vmNodes objects to process ViewModelTreeNode
 * @return {TreeLoadResult} treeLoadResult A treeLoadResult object containing the details of the result.
 */
export let createTreeLoadResult = function( response, treeLoadInput, vmNodes ) {
    var endReachedVar = response.totalLoaded + treeLoadInput.startChildNdx === response.totalFound;

    var tempCursorObject = {
        endReached: endReachedVar,
        startReached: true
    };
    if( response.cursor ) {
        tempCursorObject = response.cursor;
    }
    treeLoadInput.parentNode.totalFound = response.totalFound;
    var treeLoadResult = processProviderResponse( treeLoadInput, vmNodes, true, tempCursorObject.endReached );

    treeLoadResult.parentNode.cursorObject = tempCursorObject;
    treeLoadResult.searchResults = response.searchResults;
    treeLoadResult.totalLoaded = response.totalLoaded;
    treeLoadResult.searchFilterCategories = response.searchFilterCategories;
    treeLoadResult.objectsGroupedByProperty = response.objectsGroupedByProperty;
    treeLoadResult.searchFilterMap6 = response.searchFilterMap6;

    return treeLoadResult;
};

/**
 * @param {TreeLoadInput} treeLoadInput - treeLoadInput Parameters for the operation.
 * @param {Object} searchResults - searchResults object processed from SOA call.
 * @param {Boolean} startReached - parameter for the operation.
 * @param {Boolean} endReached - parameter for the operation.
 * @return {TreeLoadResult} treeLoadResult A treeLoadResult object containing the details of the result.
 */
function processProviderResponse( treeLoadInput, searchResults, startReached, endReached ) {
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;

    var levelNdx = parentNode.levelNdx + 1;

    var vmNodes = [];
    var vmNode;
    for( var childNdx = 0; childNdx < searchResults.length; childNdx++ ) {
        var object = searchResults[ childNdx ];

        if( !awTableSvc.isViewModelTreeNode( object ) ) {
            vmNode = createVMNodeUsingObjectInfo( object, childNdx, levelNdx );

            if( vmNode ) {
                vmNode.alternateID = getUniqueIdForEachNode( vmNode, parentNode );
                vmNode.parentTotalFound = parentNode.totalFound;
                if( vmNode.alternateID === AwStateService.instance.params.s_uid ) {
                    appCtxSvc.updatePartialCtx( 'search.totalFound', vmNode.parentTotalFound );
                }

                /* autoExpandNodeUid field is populated in variable and during node creation it is utilized for expansion of relatedModified node.
                This case will be invoked when item or BO is added to empty of non-expanded folder */
                if( autoExpandNodeUid && vmNode.alternateID === autoExpandNodeUid ) {
                    vmNode.isExpanded = true;
                    eventBus.publish( 'objNavTree.plTable.toggleTreeNode', vmNode );
                    // Destroying the variable upon expansion of relatedModified node
                    autoExpandNodeUid = null;
                }
            }
        } else {
            vmNode = object;
        }
        vmNodes.push( vmNode );
    }

    // Third Paramter is for a simple vs ??? tree
    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, startReached,
        endReached, treeLoadInput.parentNode );
}

/**
 * @param {Object} obj - object for creating view model tree node.
 * @param {int} childNdx - int value for child index.
 * @param {int} levelNdx - int value for level index.
 * @return {Object} vmNode A view model node object containing the details of the node.
 */
function createVMNodeUsingObjectInfo( obj, childNdx, levelNdx ) {
    var displayName;
    var objUid = obj.uid;
    var objType = obj.type;
    var hasChildren = containChildren( obj.props );

    if( obj.props ) {
        if( obj.props.object_name ) {
            displayName = obj.props.object_name.uiValues[ 0 ];
        }
    }

    // get Icon for node
    var iconURL = awIconService.getTypeIconFileUrl( obj );

    var vmNode = awTableSvc
        .createViewModelTreeNode( objUid, objType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = !hasChildren;

    return vmNode;
}

/**
 * Tree/Table widget require the rendered objects to be unique. Currently expansion state is maintained in local storage and is based
 * on "id" property of the nodes which is nothing but "uid" property of an element. When duplicate folder nodes exist in tree table,
 * the uid of these nodes happen to get repeated in viewModelCollection. This causes infinite loop when a folder
 * within the same folder node is expanded and causes a browser hung state. Also, the expansion state is lost. It
 * is important from user perspective that we maintain expansion state. Also, it is required that if a 'n'th instance of a
 * duplicate occuring node appears in the tree and is expanded , the child nodes get associated to the 'nth' occurence of the node itself
 * and not the first instance of the node in the tree.  In order to achieve this ,
 * the SWF alternateID attribute which sits on 'ViewModelTreeNode' and 'ViewModelObject' object is leveraged. The 'alternateID' is
 * generated by evaluating the parent node alternateID of a particular node. The comma separated uid string
 * is stored on alternateID on vmNode and is always unique whatever be the expansion state of the tree . The comma separated uid path
 * being stored in alternateID also ensures that when an object is selected and in all but tree mode and when the mode is changed to tree ,
 * with the suid, duid, uid combination in the state params the exact node in the tree is selected .
 *
 * @param {ViewModelTreeNode} vmNode - the tree node object for which unique id needs to be evaluated
 * @param {ViewModelTreeNode} parentNode - the parent node of vmNode for evaluating unique id
 * @return {String} uidString - returns comma separated uid for every node . uids are made of hierarchy for each node
 */
var getUniqueIdForEachNode = function( vmNode, parentNode ) {
    if( parentNode ) {
        return parentNode.alternateID ? vmNode.uid + ',' + parentNode.alternateID : vmNode.uid + ',' + parentNode.uid;
    }
    return vmNode.uid;
};

/**
 * @param {Object} props - object for getting contain children value.
 * @return {Boolean} Returns boolean.
 */
function containChildren( props ) {
    if( props && props.awp0HasChildren && props.awp0HasChildren.dbValues[ 0 ] === '1' ) {
        return true;
    }
    return false;
}
/**
 * @param {Object} relatedModified - object which has been modified with paste/cut/delete operation
 */
let expandRelatedModifiedIfCollapsed = relatedModified => {
    /* Adding item to empty folder or non-expanded folder, adds the newly added item to selection but as the folder is not in expanded
           state, selection is not visible. This causes the breadcrumb to break. For fixing this issue, autoExpandNodeUid variable is populated
           and during node creation it is utilized for expansion of relatedModified node. */
    if( _.isArray( relatedModified ) && !relatedModified[ relatedModified.length - 1 ].isExpanded ) {
        if( relatedModified[ relatedModified.length - 1 ].alternateID ) {
            autoExpandNodeUid = relatedModified[ relatedModified.length - 1 ].alternateID;
        } else {
            autoExpandNodeUid = relatedModified[ relatedModified.length - 1 ].uid;
        }
    }
};

/** After relatedModified operation, during node expansion , decide whether its time to start comparing created object against loaded VMOs
 * @param {Object} data - declViewModel informaton
 * @return {Boolean} Returns boolean.
 */
let shouldCreatedObjsBeComparedAgainstLoadedVMOs = data => {
    let bool = false;
    let parentNode = data.treeLoadInput.parentNode;
    let relatedMod = data.relatedModified[ data.relatedModified.length - 1 ];
    if( parentNode.alternateID ) {
        if( parentNode.alternateID === relatedMod.alternateID ) {
            bool = true;
        }
    } else {
        if( parentNode.uid === relatedMod.uid ) {
            bool = true;
        }
    }
    return bool;
};

/**
 * Get the default page size used for max to load/return.
 *
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultTreePageSize = function( defaultPageSizePreference ) {
    return getDefaultPageSize( defaultPageSizePreference );
};

/**
 * Function to update d_uids param upon selection
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} selection - base selection node
 */
export let updateDUidParamForTreeSelection = function( viewMode, selection ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var newDuid = '';
        var navigationParam = {};

        var stateInstance = AwStateService.instance;
        var selectedNode = selection[ selection.length - 1 ];
        var selectedNodeAlternateId = selectedNode.alternateID;
        var uidArray = selectedNodeAlternateId.split( ',' );
        var topNodeUid = uidArray[ uidArray.length - 1 ];

        if( uidArray[ uidArray.length - 1 ] ) {
            uidArray.splice( uidArray.length - 1, 1 );
        }

        if( uidArray[ 0 ] ) {
            uidArray.splice( 0, 1 );
        }

        if( uidArray.length > 0 ) {
            uidArray = _.reverse( uidArray );

            _.forEach( uidArray, function( d_uid ) {
                newDuid = newDuid === '' ? newDuid + d_uid : newDuid + '^' + d_uid;
            } );

            navigationParam.d_uids = newDuid;
        } else {
            navigationParam.d_uids = '';
        }

        appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', topNodeUid );
        appCtxSvc.updatePartialCtx( 'search.totalFound', selectedNode.parentTotalFound ? selectedNode.parentTotalFound : selectedNode.totalFound );
        stateInstance.go( '.', navigationParam, { location: 'replace' } );
    }
};

/**
 * Updates the parent hierarchy based on params.
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} selectedNode - base selection node
 */
export let updateParentHierarchyInURL = function( viewMode, selectedNode ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var navigationParam = AwStateService.instance.params;
        appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', selectedNode.uid );
        var d_uids = navigationParam.d_uids ? navigationParam.d_uids.split( '^' ) : [];
        var d_uid = d_uids[ 0 ] ? d_uids[ d_uids.length - 1 ] : navigationParam.uid;
        // If uid parameter was set to base selection then clear selection and set selection to root node
        if( navigationParam.s_uid && d_uid && navigationParam.s_uid === d_uid ) {
            navigationParam.d_uids = '';
            navigationParam.s_uid = selectedNode.uid;
            appCtxSvc.updatePartialCtx( 'search.totalFound', rootFolderTotalFound );
            AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
        }
    }
};

/**
 * Utility to get parent model object of selection
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} baseSelection - base selection node
 * @param {Object} selection - base selection node
 * @return {Object} Returns parent model object.
 */
export let getParentOfSelection = function( viewMode, baseSelection, selection ) {
    if( exports.isTreeViewMode( viewMode ) ) {
        var uidArray;
        var selectedNodeAlternateId = selection[ selection.length - 1 ].alternateID;
        if( selectedNodeAlternateId ) {
            uidArray = selectedNodeAlternateId.split( ',' );
        }
        var uid = uidArray && uidArray.length > 1 ? uidArray[ 1 ] : selection[ 0 ].uid;
        return cdm.getObject( uid );
    }
    return baseSelection;
};

/**
 * Utility to get set selection object based on view mode
 *
 * @param {Object} viewMode - current view mode
 * @param {Object} object - selected object
 * @return {Object} Returns object for selection
 */
export let checkViewModeAndSetSelection = function( viewMode, object ) {
    return object;
};

/**
 * Utility to get set selection object based on view mode
 *
 * @param {Object} viewMode - current view mode
 * @return {Boolean} Returns Boolean based on view mode
 */
export let isTreeViewMode = function( viewMode ) {
    return viewMode === 'tree';
};

/**
 * Function to update the selected node by mapping uid to alternateID and alternateID to uid based on view mode.
 *
 * @param {Object} viewMode - current view mode
 * @return {Object} Returns object of selected uid / alternateID depending on view mode
 */
export let getSelectedObjectsOnViewModeChange = function( viewMode ) {
    var mSelectedNodes = [];
    var navigationParam = AwStateService.instance.params;
    // Get the selected objects from mselected for selecting correct previous objects in switched view mode.
    var mSelected = appCtxSvc.getCtx( 'mselected' );

    if( exports.isTreeViewMode( viewMode ) ) {
        // When page is refreshed then the s_uid is already present in mselected. In that case we do not have to populate the uids.
        if( mSelected && mSelected[ mSelected.length - 1 ] && mSelected[ mSelected.length - 1 ].props ) {
            // Create alternateID using mselected object uid, d_uids and uid for selected objects retention
            _.forEach( mSelected, function( mo ) {
                var nodeAlternateID = [];
                var d_uidsForNodeSelection = navigationParam.d_uids && navigationParam.d_uids !== navigationParam.s_uid ? navigationParam.d_uids.split( '^' ) : [];
                d_uidsForNodeSelection = _.reverse( d_uidsForNodeSelection ).join();

                // In other modes navigation to some folder sets folder uid to d_uids and s_uid.
                // As we are getting the s_uid in d_uidsForNodeSelection already, this indexOf condition is added.
                if( mo && mo.uid && d_uidsForNodeSelection.indexOf( mo.uid ) !== 0 && mo.uid !== navigationParam.uid ) {
                    nodeAlternateID.push( mo.uid );
                }

                if( d_uidsForNodeSelection !== '' ) {
                    nodeAlternateID.push( d_uidsForNodeSelection );
                }

                // When view mode is toggled from root node then s_uid and uid both are same.
                // This condition is added to prevent the addition of same uid again.
                if( navigationParam.uid ) {
                    nodeAlternateID.push( navigationParam.uid );
                }

                mSelectedNodes.push( _.join( nodeAlternateID, ',' ) );
            } );
        }
    } else {
        var d_uid = navigationParam.d_uids ? navigationParam.d_uids.split( '^' ) : [ navigationParam.uid ];
        _.forEach( mSelected, function( mo ) {
            mSelectedNodes.push( mo.uid );
        } );
        // On view mode changes, using d_uid param navigation to respective folder is done.
        appCtxSvc.updatePartialCtx( 'search.criteria.parentUid', d_uid[ d_uid.length - 1 ] );
    }
    return mSelectedNodes;
};

/**
 * Function to update alternateID attribute on related modified objects.
 *
 * @param {Object} data - related modified event data
 * @return {Object} Returns Object with added alternateID attribute
 */
export let updateAlternateIDForRelatedModifiedObjects = function( data ) {
    let { childObjects, relatedModified, createdObjects } = data;
    if( childObjects ) {
        var alternateID = childObjects[ childObjects.length - 1 ].alternateID ? childObjects[ childObjects.length - 1 ].alternateID.split( ',' ) : [];
        if( alternateID.length > 1 ) {
            relatedModified[ 0 ].alternateID = alternateID.slice( 1, alternateID.length ).join();
        }
    } else {
        if( relatedModified && relatedModified[ relatedModified.length - 1 ] && createdObjects ) {
            _.forEach( createdObjects, function( createdObject ) {
                createdObject.alternateID = getUniqueIdForEachNode( createdObject, relatedModified[ relatedModified.length - 1 ] );
            } );
        }
    }

    return data;
};

/**
 * Function to remove alternateID attribute from related modified, created and child objects.
 *
 * @param {Object} data - related modified event data
 * @param {Boolean} isObjectFoundInLoadedVMOs - whether created object/(s) have been found in loaded VMOs
 */
export let removeAlternateIdFromRelatedModified = function( data, isObjectFoundInLoadedVMOs ) {
    let { childObjects, relatedModified, createdObjects } = data;
    _.forEach( relatedModified, function( relatedModified ) {
        if( !awTableSvc.isViewModelTreeNode( relatedModified ) ) {
            delete relatedModified.alternateID;
        }
    } );

    _.forEach( createdObjects, function( createdObject ) {
        if( !awTableSvc.isViewModelTreeNode( createdObject ) ) {
            delete createdObject.alternateID;
        }
    } );

    _.forEach( childObjects, function( childObject ) {
        if( !awTableSvc.isViewModelTreeNode( childObject ) ) {
            delete childObject.alternateID;
        }
    } );
    if( isObjectFoundInLoadedVMOs ) {
        clearRelatedModifiedInfo( data );
        data.dropOnTreeNode = undefined;
    }
};

export const handleObjSelectionAfterRelatedModification = ( propertyTreeLoadResult, notValidData, data, selectionModel ) => {
    if( data.relatedModified ) {
        let objsMatchedWithVMOs = false;
        // On Add, paste operation 'cdm.relatedModified' event is published with 'data.createdObjects' consisting of newly created model
        // objects. On cut operation 'data.childObjects' consists of ViewModelTreeNodes on which cut operation is performed.
        // Creation of alternateID for these created / cut object retains selection.

        let loadedVMTreeNodes = data.dataProviders.objNavTreeDataProvider.viewModelCollection.loadedVMObjects;
        updateAlternateIDForRelatedModifiedObjects( data );

        if( shouldCreatedObjsBeComparedAgainstLoadedVMOs( data ) === true ) {
            let { evaluatedObjs, objsFound } = getEvaluatedObjsForSelection( data.createdObjects, loadedVMTreeNodes );
            objsMatchedWithVMOs = objsFound;
            data.createdObjects = evaluatedObjs;
        }

        //If new objects were created , the panel isn't pinned , and the createdObjs have matched against the loadedVMOs , update the selection
        if( data.createdObjects && !data.isPinnedFlag && objsMatchedWithVMOs ) {
            if( data.dropOnTreeNode ) {
                selectionModel.setSelection( data.relatedModified );
            } else {
                // Select the newly created objects
                selectionModel.setSelection( data.createdObjects );
            }
        } else if( data.childObjects ) {
            selectionModel.setSelection( data.relatedModified );
        }
        // After BO or Item addition in tree view, alternateId attribute is created on relatedModified or createdObjects which is used for selection.
        // Removing alternateId attribute after selection from objects as selection model is updated with created node alternateId.
        removeAlternateIdFromRelatedModified( data, objsMatchedWithVMOs );
    }
};

export const processDropOnTree = ( dragAndDropParams ) => {
    if( dragAndDropParams.declViewModel ) {
        dragAndDropParams.declViewModel.dropOnTreeNode = true;
    }
    drop( dragAndDropParams );
};

export default exports = {
    loadTreeTableColumns,
    updateObjNavTreeTableColumns,
    updateDisplayNames,
    updateMSelectedWithProperties,
    loadTreeTablePropertiesOnInitialLoad,
    loadTreeTableProperties,
    getDefaultTreePageSize,
    loadTreeTableData,
    processDropOnTree,
    handleObjSelectionAfterRelatedModification,
    createTreeLoadResult,
    updateDUidParamForTreeSelection,
    updateParentHierarchyInURL,
    getParentOfSelection,
    checkViewModeAndSetSelection,
    isTreeViewMode,
    getSelectedObjectsOnViewModeChange,
    updateAlternateIDForRelatedModifiedObjects,
    removeAlternateIdFromRelatedModified
};
/**
 * @memberof NgServices
 * @member objectNavigationTreeService
 */
app.factory( 'objectNavigationTreeService', () => exports );
