/* eslint-disable max-lines */
/* eslint-disable no-bitwise */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/*
global
 */

/**
 * This is a utility to format the response for the classification hierarchy to be compatible with the generic
 * property widgets.
 *
 * @module js/classifyAdminTreeTableService
 */
import app from 'app';

import AwPromiseService from 'js/awPromiseService';

import appCtxService from 'js/appCtxService';
import awTableStateService from 'js/awTableStateService';
import awTableSvc from 'js/awTableService';
import awColumnSvc from 'js/awColumnService';
import classifyAdminConstants from 'js/classifyAdminConstants';
import classifyAdminService from 'js/classifyAdminService';
import classifyAdminUtil from 'js/classifyAdminUtil';

import _ from 'lodash';

var exports = {};

var max_safe_number = !Number.MAX_SAFE_INTEGER ? Math.pow( 2, 53 ) - 1 : Number.MAX_SAFE_INTEGER;

/**
 * Following method resets the application context variables, this would get called only while launching the filter panel
 * @param {*} data Declarative view model
 * @param {*} dataProviderName data provider name
 * @param {*} type type
 * @param {*} ctx Application context
 * @return {*} ctx Application context
 */
export let resetScope = function( data, dataProviderName, type, ctx ) {
    if ( ctx === undefined || ctx === null ) {
        ctx = {};
        appCtxService.registerCtx( 'clsAdmin', {} );
    }
    if ( !ctx.clsTree ) {
        var searchCtx = appCtxService.getCtx( 'search' );
        if ( searchCtx ) {
            searchCtx.filterMap = [];
            appCtxService.updateCtx( 'search', searchCtx );
        }
        ctx.clsTree = {
            tableSummaryDataProviderName : dataProviderName,
            selectedTreeNode : null,
            selectedNode : null,
            expansionCounter : 0
        };
        if ( ctx.releases && ctx.releases.selected ) {
            ctx.releases.selected = null;
            ctx.releases.expandedList = null;
        }
        appCtxService.updateCtx( 'clsAdmin', ctx );
        data.tableSummaryDataProviderName = dataProviderName;
    }
    return ctx;
};

/**
 * Builds the row entries for each key in the table
 * @param {Object} treeLoadInput object
 * @param {Object} data Declarative view model
 */
export let loadDataForKeyLOV = function( treeLoadInput, data  ) {
    treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    appCtxService.ctx.treeLoadInput = treeLoadInput;
    appCtxService.ctx.treeLoadInput.displayMode = 'Tree';
    var children = [];

    var arr = appCtxService.ctx.clsAdmin.LOVTypeItems;
    var isTopNode = treeLoadInput.parentNode.levelNdx === -1;
    if( isTopNode ) {
       appCtxService.ctx.clsAdmin.counter = 0;

        for( var i = 0; i < arr.length; i++ ) {
            appCtxService.ctx.clsAdmin.counter  += 1;
            buildEntriesTable( arr[i], children, treeLoadInput.parentNode.levelNdx  );
        }
    } else {
        //find the object based upon displayName
        for( var ii = 0; ii < data.dataProviders.entryDataProvider.viewModelCollection.loadedVMObjects.length; ii++ ) {
            if( treeLoadInput.parentNode.uid === data.dataProviders.entryDataProvider.viewModelCollection.loadedVMObjects[ii].uid  ) {
                var temp = data.dataProviders.entryDataProvider.viewModelCollection.loadedVMObjects[ii];
                //node has been found let's find those nodes from array and pass them

                if( temp.isSubMenu ) {
                    //create plain tree view model
                    children.push( temp.SubMenuItemsNew[0] );
                } else {
                    //create as per data
                    for( var j = 0; j < temp.SubMenuItemsNew.length; j++ ) {
                        children.push( temp.SubMenuItemsNew[j] );
                    }
                }
                break;
            }
        }
    }

    //following is needed to resolve the column update issue
    loadColumnsForKeyLOV( data.dataProviders.entryDataProvider, appCtxService.ctx.clsAdmin.DataType );

    data.treeLoadResult1 = {
        parentNode: treeLoadInput.parentNode,
        childNodes: children,
        totalChildCount: children.length,
        startChildNdx: 0
    };
};

/**
 * Following method builds the entries as per the SOA response
 * @param {Object} obj JavaScript Object from KeyLOV response
 * @param {Array} table Array collection of table entries
 * @param {Integer} parentIndx level within the table
 */
export let buildEntriesTable = function( obj, table, parentIndx ) {
    parentIndx += 1;
    var tempProps = {};
    var vmNode1 = awTableSvc.createViewModelTreeNode(
        '', '',
        '', parentIndx, 0, null );

    vmNode1.isLeaf = true;
    vmNode1.children = [];

    if( verifyDataType( appCtxService.ctx.clsAdmin.DataType, classifyAdminConstants.DATA_TYPE_STRING ) ) {
        buildCell( obj, classifyAdminConstants.TABLE_KEYLOV_STRING, tempProps, vmNode1 );
    } else if( verifyDataType( appCtxService.ctx.clsAdmin.DataType, classifyAdminConstants.DATA_TYPE_INTEGER ) ) {
        buildCell( obj, classifyAdminConstants.TABLE_KEYLOV_INTEGER, tempProps, vmNode1 );
    } else if( verifyDataType( appCtxService.ctx.clsAdmin.DataType, classifyAdminConstants.DATA_TYPE_DOUBLE ) ) {
        buildCell( obj, classifyAdminConstants.TABLE_KEYLOV_DOUBLE, tempProps, vmNode1 );
    } else if( verifyDataType( appCtxService.ctx.clsAdmin.DataType, classifyAdminConstants.DATA_TYPE_DATE ) ) {
        buildCell( obj, classifyAdminConstants.TABLE_KEYLOV_DATE, tempProps, vmNode1 );
    } else if( verifyDataType( appCtxService.ctx.clsAdmin.DataType, classifyAdminConstants.DATA_TYPE_BOOLEAN ) ) {
        buildCell( obj, classifyAdminConstants.TABLE_KEYLOV_BOOLEAN, tempProps, vmNode1 );
    } else if( verifyDataType( appCtxService.ctx.clsAdmin.DataType, classifyAdminConstants.DATA_TYPE_REFERENCE ) ) {
        buildCell( obj, classifyAdminConstants.TABLE_KEYLOV_REFERENCE, tempProps, vmNode1 );
    }

    //Check submenu exists
    var isSubMenu = classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.KEYLOV_IS_SUBMENU );

    if( isSubMenu === true ) {
        vmNode1.isLeaf = false;
        vmNode1.SubMenuItemsNew = [];

        var subMenuTitle = classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.KEYLOV_SUB_MENU_TITLE );

        if( subMenuTitle && subMenuTitle !== '' ) {
            vmNode1.displayName = classifyAdminUtil.getValue( subMenuTitle );
        } else if( classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_VALUE ) &&
            classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_VALUE ) !== '' ) {
            vmNode1.displayName =  classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_VALUE );
        } else {
            vmNode1.displayName = getStringValueAsPerType( obj, appCtxService.ctx.clsAdmin.DataType );
        }
        for( var i = 0; i < obj.SubMenuItems.length; i++ ) {
            appCtxService.ctx.clsAdmin.counter += 1;
           buildEntriesTable(  obj.SubMenuItems[i], vmNode1.SubMenuItemsNew, parentIndx  );
        }
    } else {
        vmNode1.isLeaf = true;
    }

    table.push( vmNode1 );
};

/**
 * Build the cell as per the supplied column and row
 * @param {Object} obj Object containing the array of keys
 * @param {Array} keyArray Key array
 * @param {Object} tempProps object containing the properties
 * @param {Object} vmNode View model tree node
 */
export let buildCell = function( obj, keyArray, tempProps, vmNode ) {
    //table columns names
    _.forEach( keyArray, function( columnName, index ) {
       var valueObj  = classifyAdminUtil.getObjectAsPerKey( obj, columnName );

       if( valueObj && typeof valueObj === 'object' && valueObj !== null ) {
           valueObj = classifyAdminUtil.getValue( valueObj );
       }

       if( index === 0 ) {
            vmNode.displayName = '';
           if( valueObj !== undefined || valueObj !== null ) {
               vmNode.displayName = valueObj.toString();
           }
           vmNode.uid = appCtxService.ctx.clsAdmin.counter.toString();
           vmNode.id = appCtxService.ctx.clsAdmin.counter.toString();
       }

       tempProps[ columnName ] = createCell( columnName, valueObj );
       vmNode.props = tempProps;
   } );
};

/**
 * Creates cell for given table
 * @param {String} key Column name
 * @param {Object} value Field value for cell
 * @return {Object} temp2 Returns the cell object
 */
export let createCell = function( key, value ) {
    if( value === undefined || value === null ) {
        value = '';
    }
    var temp2 = {};
    temp2.name = key;
    temp2.type = 'STRING';
    temp2.value = value.toString();
    temp2.uiValue = value.toString();
    return temp2;
};

/**
 * Following method retrieves the String value representation for given data type
 * @param {Object} obj Passed object to look up for
 * @param {*} dataType Datatype for given object
 * @returns {*} value
 */
export let getStringValueAsPerType = function( obj, dataType ) {
    var value;

    if( verifyDataType( dataType, classifyAdminConstants.DATA_TYPE_STRING ) ) {
        value = classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_KEY_STRING );
    } else if( verifyDataType( dataType, classifyAdminConstants.DATA_TYPE_INTEGER ) ) {
        value = classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_KEY_INTEGER );
    }
    if( verifyDataType( dataType, classifyAdminConstants.DATA_TYPE_DOUBLE ) ) {
        value = classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_KEY_DOUBLE );
    }
    if( verifyDataType( dataType, classifyAdminConstants.DATA_TYPE_DATE ) ) {
        value = classifyAdminUtil.getObjectAsPerKey( obj, classifyAdminConstants.TABLE_COLUMN_KEY_DATE );
    }
    if( value === undefined || value === null ) {
        value = '';
    }
    return value.toString();
};


/**
 * Following method verifies the data type is matching with expect or not
 * @param {String} actual String value for data type
 * @param {*} expect Expected value of data type
 * @returns {*} true if valid, false otherwise
 */
export let verifyDataType = function( actual, expect ) {
    return actual === expect;
};

/**
 * Add a node
 *
 * @param {*} childId child
 * @param {*} childName child name
 * @param {*} type  object type
 * @param {*} parentLevel level
 * @param {*} imageUrl image URL
 * @param {*} numParents number of parents

 * @returns {*} vm node
 */
let addNode = function( childId, childName, type, parentLevel, imageUrl, numParents ) {
    var tempCursorObject = {
        endReached: true,
        startReached: true
    };

    var vmNode =  awTableSvc.createViewModelTreeNode(
        childId, type,
        childName, parentLevel, 0,
        imageUrl );
    vmNode.type = type;
    vmNode.cursorObject = tempCursorObject;
    if ( parentLevel < numParents ) {
        vmNode.children = [];
    }
    return vmNode;
};

/**
 * Insert node and shift remaining items
 * @param {Object} node
 * @param {Object} parentSet
 * @param {Object} parentIdx
 * @returns {Object} inserted index
 */
let insertNode = function( vmCurrentNode, currentNodeIdx, parentSet, childTreeSet, parentIdx, isNextPage ) {
    var tempParentSet;
    var tempChildSet;
    var insertedNdx = -1;
    var parentNode;
    if( parentIdx >= 0 ) {
        //check if there are siblings to current node
        parentNode = parentSet[ parentIdx ];
        var parentNdx = parentNode.levelNdx;
        var kdx;
        for ( kdx = parentIdx + 1; kdx < parentSet.length; kdx++ ) {
           var element = parentSet[ kdx ];
           if ( element.levelNdx <= parentNdx ) {
               break;
           }
        }
        if ( kdx <= parentSet.length ) {
            tempParentSet = parentSet.splice( kdx, parentSet.length );
            tempChildSet = childTreeSet.splice( kdx, childTreeSet.length );
        }
        if ( isNextPage ) {
            var childNdx = _.findIndex( childTreeSet, function( child ) {
                return child.id === parentNode.id;
            } );
            if ( childNdx === -1 ) {
                var parentNdx = _.findIndex( parentSet, function( parent ) {
                    return parent.id === parentNode.id;
                } );
                if ( parentNdx === -1 ) {
                    childTreeSet.push( parentNode );
                }
            }
        }
    }
    if ( currentNodeIdx === -1 ) {
        var currentChildNdx = _.findIndex( childTreeSet, function( child ) {
            return child.id === vmCurrentNode.id;
        } );
        if ( currentChildNdx === -1 ) {
            childTreeSet.push( vmCurrentNode );
        }
        parentSet.push( vmCurrentNode );
        insertedNdx = parentSet.length - 1;
    }
    if ( tempParentSet || tempChildSet ) {
        _.forEach( tempParentSet, function( object ) {
            parentSet.push( object );
        } );
        _.forEach( tempChildSet, function( object ) {
            childTreeSet.push( object );
        } );
    }
    return insertedNdx;
};

/**
 * Creates hierarchy
 *
 * @param {Object} child child id
 * @param {String} type  object type
  * @param {String} imageUrl image url
 * @param {Object} parentSet parent set
 * @param {Boolean} isNextPage true if next page, false otherwise
 */
let createHierarchy = function( child, type, imageUrl, parentSet, childTreeSet, isNextPage ) {
    var numParents = child.parents.length;

    var vmCurrentNode;
    var vmParentNode;
    var parent;
    var level = 0;
    var jdx;
    if ( !childTreeSet ) {
        childTreeSet = [];
    }

    //find if parent is already present.
    var ndx = _.findIndex( parentSet, function( parent ) {
        return parent.id === child.id;
    } );
    if ( ndx === -1 ) {
        vmCurrentNode = addNode( child.id, child.propertyName, type, numParents, imageUrl, numParents );
    } else {
        vmCurrentNode = parentSet[ ndx ];
    }
    vmCurrentNode.isLeaf = !child.hasChildren;
    vmCurrentNode.hasChildren = child.hasChildren;
    vmCurrentNode.parents = child.parents;

    //check if parent found in output set and add if necessary
    var prevParentIdx = -1;
    for ( var idx = numParents - 1;  idx > -1;  idx-- ) {
        parent = child.parents[ idx ];

        var parentImageUrl = parent.imageIconUrl ? parent.imageIconUrl : imageUrl;

        //find if parent is already present.
        jdx = _.findIndex( parentSet, function( object ) {
            return object.id === parent.ID;
        } );

        if ( jdx === -1 ) {
            vmParentNode = addNode( parent.ID, parent.Name, type, level, parentImageUrl, numParents );
            vmParentNode.isLeaf = false;
            vmParentNode.isExpanded = true;
            //insert parent at correct position
            prevParentIdx = insertNode( vmParentNode, jdx, parentSet, childTreeSet, prevParentIdx, isNextPage );
        } else {
            vmParentNode = parentSet[ jdx ];
            vmParentNode.isExpanded = true;
            prevParentIdx = jdx;
        }
        level++;
    }
    //insert the current node and shift remaining items
    if ( ndx === -1 ) {
        insertNode( vmCurrentNode, ndx, parentSet, childTreeSet, prevParentIdx );
    }
};

/**
 * Private function to reduce complexity

 * @param {Object} treeLoadInput Tree load input
 * @param {Object} data The view model data object
 * @param {object} type type
 * @param {Object} ctx context
 * @param {Object} isSearch true if search, false otherwise
 * @param {Object} isNextPage true if next page, false otherwise
 * @returns {Object} tree children
 */
function getChildrenForStructure( treeLoadInput, data, type, ctx, isSearch, isNextPage ) {
    var children1 = [];
    var children = data.children;
    var objectsLoaded;
    var tempCursorObject = {
        endReached: true,
        startReached: true
    };

    var parents = [];
    var objType;
    if( treeLoadInput.parentNode.uid === classifyAdminConstants.TOP || isNextPage ) {
        var currentLevel;
        if ( type === classifyAdminConstants.CLASSES ) {
            currentLevel =  Object.assign( {}, data.classes );
            children = data.classes;
            objectsLoaded = data.classesLoaded;
            objType = classifyAdminConstants.JSON_REQUEST_TYPE_CLASS;
        } else if( type === classifyAdminConstants.PROPERTIES ) {
            currentLevel =  Object.assign( {}, data.properties );
            children = data.properties;
            objectsLoaded = data.propsLoaded;
            objType = classifyAdminConstants.JSON_REQUEST_TYPE_PROP;
        } else if ( type === classifyAdminConstants.KEYLOV ) {
            currentLevel =  Object.assign( {}, data.keylovs );
            children = data.keylovs;
            objectsLoaded = data.keylovLoaded;
            objType = classifyAdminConstants.JSON_REQUEST_TYPE_KEYLOV;
        }else {
            currentLevel =  Object.assign( {}, data.nodes );
            children = data.nodes;
            objectsLoaded = data.nodesLoaded;
            objType = classifyAdminConstants.JSON_REQUEST_TYPE_NODE;
        }
        if ( !isNextPage ) {
            ctx.clsTree.currentLevel = currentLevel;
            ctx.clsTree.initialHierarchy = currentLevel;
            ctx.clsTree.parents = parents;
        }
    }
    if ( isNextPage ) {
        ctx.clsTree.numParents = ctx.clsTree.startChildNdx;
         objectsLoaded += ctx.clsTree.startChildNdx;
    }

    var iconUrl;
    var child;
    if ( isSearch && !treeLoadInput.parentNode._expandRequested ) {
        var parentSet = [];
        if ( isNextPage ) {
            parentSet = data.dataProviders[ data.tableSummaryDataProviderName ].getViewModelCollection().loadedVMObjects;
            ctx.clsTree.numParents = parentSet.length;
        } else {
            ctx.clsTree.treeLoadInput.parentNode.children = null;
        }
        var childTreeSet = [];
        var vmNode;
        var level = ctx.clsTree.treeLoadInput.parentNode.levelNdx;
        for( var i = ctx.clsTree.startChildNdx; i < children.length; i++ ) {
            child = children[ i ];
            var childNdx = -1;
            if ( parentSet && parentSet.length > 0 ) {
                //see if child is already present
                childNdx = _.findIndex( parentSet, function( node ) {
                    return node.id === child.id;
                } );
            }
            if ( childNdx === -1 ) {
                var numParents = child.parents ? child.parents.length : 0;
                level = numParents;
                iconUrl = child.thumbnailURL;
                vmNode = awTableSvc.createViewModelTreeNode(
                    child.id, objType,
                    child.propertyName, level--, 0,
                    iconUrl );
                if ( child.hasChildren === false ) {
                    vmNode.childCount = 0;
                    vmNode.isLeaf = true;
                }
                if ( child.parents && child.parents.length > 0 ) {
                    createHierarchy( child, objType, iconUrl, parentSet, childTreeSet, isNextPage );
                } else {
                    var j = _.findIndex( childTreeSet, function( node ) {
                        return node.id === vmNode.id;
                    } );
                    if ( j === -1 ) {
                        // check if it exists in parentSet
                        var j1 = _.findIndex( parentSet, function( parent ) {
                            return parent.id === vmNode.id;
                        } );
                        if ( j1 === -1 ) {
                            vmNode.cursorObject = tempCursorObject;
                            childTreeSet.push( vmNode );
                            parentSet.push( vmNode );
                        }
                    }
                }
            }
        }

        for( var k = 0; k < childTreeSet.length; k++ ) {
            children1.push( childTreeSet[ k ] );
        }
    } else {
        for( var j = 0; j < children.length; j++ ) {
            child = children[ j ];
            iconUrl = child.thumbnailURL;
            vmNode = awTableSvc.createViewModelTreeNode(
                child.id, objType,
                child.propertyName, ctx.clsTree.treeLoadInput.parentNode.levelNdx + 1, i,
                iconUrl );
            if( child.hasChildren === false ) {
                vmNode.childCount = 0;
                vmNode.isLeaf = true;
            }

            vmNode.parent_Id = ctx.clsTree.treeLoadInput.parentNode.id;
            vmNode.type = child.type;

            vmNode.parent_Id = treeLoadInput.parentNode.id;
            // vmNode.iconURL = iconUrl;
            children1.push( vmNode );
        }
    }
    return {
        children: children,
        children1: children1,
        parentSet: parentSet,
        objectsLoaded : objectsLoaded
    };
}

/**
 * We are using below function when tree needs to be created . Same function will be used in both initialize and next action mode.
 * We need to use it for expanding the tree as well.
 * @param {object} treeLoadInput Tree load input
 * @param {object} data Declarative view model
 * @param {*} dataProviderName data provider name
 * @param {object} type type
 * @param {object} ctx Global context
  * @param {Object} isSearch true if search, false otherwise
 * @return {Promise} Resolved with an object containing the results of the operation.
 */
export let loadTreeTableData = function( treeLoadInput, data, dataProviderName, type, ctx, isSearch ) {
    var deferred = AwPromiseService.instance.defer();

    ctx = resetScope( data, dataProviderName, type, ctx );

    treeLoadInput.pageSize = max_safe_number;
    treeLoadInput = awTableSvc.findTreeLoadInput( arguments );
    var isNextPage = false;
    var isTop = treeLoadInput.parentNode.uid === classifyAdminConstants.TOP;
    isNextPage = isTop && treeLoadInput.startChildNdx > 0;
    if ( !isTop && !treeLoadInput.parentNode._expandRequested  ) {
        ctx.clsTree.startChildNdx = data.tmpObjectsLoaded;
        isNextPage = true;
    }
    if ( isSearch && !isNextPage ) {
        treeLoadInput.parentNode.children = null;
        ctx.clsTree.startChildNdx = 0;
    }

    ctx.clsTree.treeLoadInput = treeLoadInput;
    ctx.clsTree.treeLoadInput.displayMode = 'Tree';
    var failureReason = awTableSvc.validateTreeLoadInput( treeLoadInput );
    if( failureReason ) {
        deferred.reject( failureReason );

        return deferred.promise;
    }

    buildTreeTableStructure( deferred, ctx.clsTree.treeLoadInput, data, type, ctx, isSearch, isNextPage );
    return deferred.promise;
};


/**
 * Private function
 * Calls SOA and handles the response
 * @param {*} deferred deferred input
 * @param {*} treeLoadInput Tree load input
 * @param {*} data The view model data object
 * @param {object} type type
 * @param {*} ctx context
 * @param {Object} isSearch true if search, false otherwise
 * @param {Object} isNextPage true if next page, false otherwise
 */
function buildTreeTableStructure( deferred, treeLoadInput, data, type, ctx, isSearch, isNextPage ) {
    var tempCursorObject = {
        endReached: true,
        startReached: true
    };

    if ( !isSearch ) {
        ctx.clsTree.startChildNdx = treeLoadInput.startChildNdx;
        if ( treeLoadInput.startChildNdx > 0 ) {
            isNextPage = treeLoadInput.startChildNdx > 0;
        }
    }
    classifyAdminService.setNextPage( isNextPage );
    classifyAdminService.getAdminObjectsForSublocation( data, type, treeLoadInput.parentNode, isSearch ).then( function( response )  {
        var children = data.children;
        var childrenTree = getChildrenForStructure( treeLoadInput, data, type, ctx, isSearch, isNextPage );
        children = childrenTree.children;
        var children1 = childrenTree.children1;
        if ( isNextPage ) {
            ctx.clsTree.treeLoadInput.startChildNdx = ctx.clsTree.numParents;
        }

        if ( treeLoadInput.parentNode.uid === classifyAdminConstants.TOP || isNextPage ) {
            //if last child of this set and there are more objects, set incomplete flag
            var searchCtx = appCtxService.getCtx( 'search' );

            if ( data.tmpObjectsLoaded < searchCtx.totalFound ) {
                tempCursorObject.endReached = false;
                //Note: Following code is commented out because the last item from server results may not match in the
                // hierarchy created because of the parents being inserted for each child to display in hierarchy.
                // if ( children1.length !== children.length ) {
                //     //if hierarchy got added for search, find the last item from children in children1.
                //     var lastChild = children[ children.length - 1 ];
                //     var lastChildIdx = _.findIndex( children1, function( child ) {
                //         return child.id === lastChild.id;
                //     } );
                //     if ( lastChildIdx !== -1 ) {
                //         children1[ lastChildIdx ].incompleteTail = true;
                //     }
                // } else {
                    children1[ children1.length - 1 ].incompleteTail = true;
                // }
            }
        }
        var isTopNode = ctx.clsTree.treeLoadInput.parentNode.levelNdx === -1;
        var rootPathNodes = [];
        if( isTopNode || isNextPage ) {
            var vmNode1 = awTableSvc.createViewModelTreeNode(
                ctx.clsTree.treeLoadInput.parentNode.id, '',
                ctx.clsTree.treeLoadInput.parentNode.className, -1, 0, null );

            vmNode1.type = ctx.clsTree.treeLoadInput.parentNode.type;

            rootPathNodes.push( vmNode1 );
            ctx.clsTree.rootNode = treeLoadInput;
        }

        var treeLoadResult = awTableSvc.buildTreeLoadResult( ctx.clsTree.treeLoadInput, children1, false, true, tempCursorObject.endReached, null );
        treeLoadResult.rootPathNodes = rootPathNodes;
        treeLoadResult.parentNode.cursorObject = tempCursorObject;

        var table = data.tableSummaryDataProviderName + classifyAdminConstants.TABLE;
        awTableStateService.clearAllStates( data, table );
        ctx.clsTree.expansionCounter -= 1;

        appCtxService.updateCtx( 'clsAdmin', ctx );

        deferred.resolve( {
            treeLoadResult: treeLoadResult
        } );
    } );
}


/* ----------------------------- TABLE PROPERTIES/COLUMN RELATED -------------------------------------------- */
/**
 * Load properties to be shown in the tree structure
 * @param {object} data The view model data object
 * @param {object} dataProviderName data provider name
  * @param {object} type type
 * @return {object} Output of loadTableProperties
 */
export let loadPropertiesJS = function( data, dataProviderName, type ) { // eslint-disable-line
    if ( !data.tableSummaryDataProviderName ) {
        data.tableSummaryDataProviderName = dataProviderName;
    }
    var viewModelCollection = data.dataProviders[ data.tableSummaryDataProviderName ].getViewModelCollection();
    var loadedVMOs = viewModelCollection.getLoadedViewModelObjects();
    /**
     * Extract action parameters from the arguments to this function.
     */
    var propertyLoadInput = awTableSvc.findPropertyLoadInput( arguments );

    /**
     * Load the 'child' nodes for the 'parent' node.
     */
    if( propertyLoadInput !== null &&
        propertyLoadInput !== undefined &&
        propertyLoadInput !== 'undefined' ) {
        return exports.loadTableProperties( propertyLoadInput, loadedVMOs );
    }
};

/**
 * load Properties required to show in tables'
 * @param {Object} propertyLoadInput - Property Load Input
 * @return {Object} propertyLoadResult
 */
export let loadTableProperties = function( propertyLoadInput ) {
    var allChildNodes = [];
    _.forEach( propertyLoadInput.propertyLoadRequests, function( propertyLoadRequest ) {
        _.forEach( propertyLoadRequest.childNodes, function( childNode ) {
            if( !childNode.props ) {
                childNode.props = {};
            }

            if( childNode.id !== classifyAdminConstants.TOP ) {
                allChildNodes.push( childNode );
            }
        } );
    } );

    var propertyLoadResult = awTableSvc.createPropertyLoadResult( allChildNodes );

    return AwPromiseService.instance.resolve( {
        propertyLoadResult: propertyLoadResult
    } );
};

/**
 * Following method builds the key column
 * @param {Object} awColumnInfos collection of columns
 */
export let buildKeyColumn = function( awColumnInfos ) {
    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: 'Key',
        isTreeNavigation: true,
        isTableCommand: false,
        enableSorting: false,
        enableCellEdit: false,
        width: 200,
        minWidth: 200,
        enableColumnResizing: false,
        enableColumnMoving: false,
        enableFiltering: false
    } ) );
};


/**
 * Following method fills the column with column properties
 * @param {Object} columnInfo Column to be operated upon
 * @param {String} name name of column
 */
export let fillColumnForEntries = function( columnInfo, name ) {
    columnInfo.name = name;
    columnInfo.displayName = name;

    columnInfo.width = 200;
    columnInfo.minWidth = 200;
    columnInfo.enableColumnResizing = true;
    if( name === classifyAdminConstants.TABLE_COLUMN_KEY ) {
        columnInfo.frozenColumnIndex = -1;
        columnInfo.isTreeNavigation = true;
    }
};

/**
 * Loads columns for the column
 * @param {object} ctx context
 * @param {object} uwDataProvider data provider
 * @return {object} promise for async call
 */
export let loadColumns = function( ctx, uwDataProvider ) {
    if ( ctx ) {
        ctx.clsTree = null;
    }
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [];

    awColumnInfos.push( awColumnSvc.createColumnInfo( {
        name: classifyAdminConstants.COLUMN_NAME,
        displayName: classifyAdminConstants.COLUMN_NAME,
        isTreeNavigation: true,
        isTableCommand: false,
        enableSorting: false,
        enableCellEdit: false,
        width: 600,
        minWidth: 200,
        enableColumnResizing: false,
        enableColumnMoving: false,
        enableFiltering: false,
        pinnedLeft : true,
        cellTemplate: '<aw-cls-treetable-command-cell class="aw-jswidgets-tablecell" ' + //
            'prop="row.entity.props[col.field]" vmo="row.entity" ' + //
            'commands="col.colDef.commands" anchor="col.colDef.commandsAnchor" rowindex="rowRenderIndex" row="row" />'
    } ) );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );
    return deferred.promise;
};

/**
 * Builds the columns for KeyLOV table as per the data type
 * @param {object} uwDataProvider data provider
 * @param {String} type Type of Key LOV definition
 * @return {Object} promise for async call
 */
export let loadColumnsForKeyLOV = function( uwDataProvider, type ) {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [];

    //check the type
    if(  verifyDataType( type, classifyAdminConstants.DATA_TYPE_STRING  ) ) {
        loadColumnAsPerType( awColumnInfos, classifyAdminConstants.TABLE_KEYLOV_STRING );
    } else if(  verifyDataType( type, classifyAdminConstants.DATA_TYPE_INTEGER  ) ) {
        loadColumnAsPerType( awColumnInfos, classifyAdminConstants.TABLE_KEYLOV_INTEGER );
    } else if(  verifyDataType( type, classifyAdminConstants.DATA_TYPE_DOUBLE  ) ) {
        loadColumnAsPerType( awColumnInfos, classifyAdminConstants.TABLE_KEYLOV_DOUBLE );
    } else if( verifyDataType( type, classifyAdminConstants.DATA_TYPE_DATE  )  ) {
        loadColumnAsPerType( awColumnInfos, classifyAdminConstants.TABLE_KEYLOV_DATE );
    } else if( verifyDataType( type, classifyAdminConstants.DATA_TYPE_REFERENCE  )  ) {
        loadColumnAsPerType( awColumnInfos, classifyAdminConstants.TABLE_KEYLOV_REFERENCE );
    } else if( verifyDataType( type, classifyAdminConstants.DATA_TYPE_BOOLEAN  )  ) {
        loadColumnAsPerType( awColumnInfos, classifyAdminConstants.TABLE_KEYLOV_BOOLEAN );
    }

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );
    return deferred.promise;
};

/**
 * As per the supplied keys columns are being build
 * @param {Object} awColumnInfos Referenced collection of columns
 * @param {*} keyArr Passed keys for lookup
 */
export let loadColumnAsPerType = function( awColumnInfos, keyArr ) {
    _.forEach( keyArr, function( nameOfColumn ) {
        var columnInfo = awColumnSvc.createColumnInfo();
        fillColumnForEntries( columnInfo, nameOfColumn );
        awColumnInfos.push( columnInfo );
    } );
};


/**
 * Following method keeps counter for expansion, which decides no. of times tree node expansion should happen
 * @param {*} data Declarative view model
 * @param {*} ctx  Application context
 * @returns {bool} false
 */
export let parseExpansion = function( data, ctx ) {
    data.isTreeExpanding = true;
    if( ctx.clsTree && ctx.clsTree.expansionCounter > 0 ) {
        var vmNode = awTableSvc.createViewModelTreeNode(
            ctx.clsTree.selectedNode.id, '',
            ctx.clsTree.selectedNode.className, 0, 0,
            '' );

        if( ctx.clsTree.selectedNode.childCount === 0 ) {
            vmNode.isLeaf = true;
        } else {
            vmNode.isLeaf = false;
        }
        vmNode.childCount = ctx.clsTree.selectedNode.childCount;
        vmNode.type = ctx.clsTree.selectedNode.type;
        data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( vmNode );
        return ctx.clsTree.expansionCounter;
    }

    return false;
};


/**
 * Following method gets used to get selection based upon previously selected node
 * As Framework has obseleted API to remember previous selections. Handling this use case in application code
 * @param {*} data Declarative view - model
 * @param {*} ctx Global context
 */
export let selectPreviousNode = function( data, ctx ) {
    if( ctx.clsTree.selectedTreeNode ) {
        for( var i = 0; i < data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects.length; i++ ) {
            var node = data.dataProviders[ data.tableSummaryDataProviderName ].viewModelCollection.loadedVMObjects[ i ];
            if( node.id === ctx.clsTree.selectedTreeNode.id ) {
                data.dataProviders[ data.tableSummaryDataProviderName ].selectionModel.setSelection( node );
                break;
            }
        }
    }
};

/**
 * Deselect selected tree node
 * @param {*} data Declarative view - model
 * @param {Object} ctx - application context
 */
export let deselectNode = function( data, ctx ) {
    if( ctx && ctx.clsTree && ( ctx.clsTree.selectedTreeNode || ctx.clsTree.selectedNode ) ) {
        ctx.clsTree.selectedTreeNode = undefined;
    }
};

export let checkSearch = function( data ) {
    var isSearch = false;
    var searchCtx = appCtxService.getCtx( 'search' );
    var adminCtx = appCtxService.getCtx( 'clsAdmin' );
    var releasesSelected = adminCtx && adminCtx.releases && adminCtx.releases.selected ? adminCtx.releases.selected.length > 0 : false;
    if (  data.searchBox.dbValue !== null && data.searchBox.dbValue !== ''  ||
          searchCtx && searchCtx.filterMap && searchCtx.filterMap.length > 0 ||
          releasesSelected ) {
        isSearch = true;
    }
    return isSearch;
};

export default exports = {
    buildCell,
    verifyDataType,
    buildEntriesTable,
    checkSearch,
    createCell,
    getStringValueAsPerType,
    deselectNode,
    fillColumnForEntries,
    loadColumns,
    loadColumnsForKeyLOV,
    loadColumnAsPerType,
    loadDataForKeyLOV,
    loadPropertiesJS,
    loadTableProperties,
    loadTreeTableData,
    parseExpansion,
    resetScope,
    selectPreviousNode
};
/*
 * Classification panel service utility
 *
 * @memberof NgServices
 * @member classifyAdminTreeTableService
 */
app.factory( 'classifyAdminTreeTableService', () => exports );
