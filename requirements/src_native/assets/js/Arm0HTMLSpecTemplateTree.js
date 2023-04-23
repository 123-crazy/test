// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/Arm0HTMLSpecTemplateTree
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import arm0HTMLSpecTemplateEdit from 'js/Arm0HTMLSpecTemplateEdit';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/addElementTypeHandler';

var _allowedTypesInfo = null;

var _treeTableColumnInfos = null;
var _numInitialTopChildren = 147;
var _numNextChildren = 53;

var _maxTreeLevel = 3;

var previewElement = null;

var idToChildrenMap = {};
var idToObjectMap = {};
var _idToChildrenMap = {};
var _idToObjectMap = {};
var rootID = null;
var idToObjectMapConst = 'idToObjectMap';

var _data;

/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos() {
    if( !_treeTableColumnInfos ) {
        _treeTableColumnInfos = _buildTreeTableColumnInfos();
    }

    return _treeTableColumnInfos;
}

/**
 * @return {AwTableColumnInfoArray} Array of column information objects set with specific information.
 */
function _buildTreeTableColumnInfos() {
    var columnInfos = [];

    /**
     * Set 1st column to special 'name' column to support tree-table.
     */
    var propName;
    var propDisplayName;
    var isTreeNavigation;
    var width;
    var minWidth;

    for( var colNdx = 0; colNdx < 2; colNdx++ ) {
        /**
         * @property {Number|String} width - Number of pixels
         * @memberOf module:js/awColumnService~AwTableColumnInfo
         */
        if( colNdx === 0 ) {
            propName = 'object_name';
            propDisplayName = _data.i18n.nameLabel;
            isTreeNavigation = true;
            width = 250;
            minWidth = 150;
        } else {
            propName = 'object_type';
            propDisplayName = _data.i18n.specType;
            isTreeNavigation = false;
            minWidth = 150;
            width = 150;
        }

        var columnInfo = awColumnSvc.createColumnInfo();

        /**
         * Set values for common properties
         */
        columnInfo.name = propName;
        columnInfo.displayName = propDisplayName;
        columnInfo.isTreeNavigation = isTreeNavigation;
        columnInfo.width = width;
        columnInfo.minWidth = minWidth;


        /**
         * Set values for un-common properties
         */
        columnInfo.typeName = 'String';
        columnInfo.enablePinning = false;
        columnInfo.enableSorting = false;
        columnInfo.enableColumnHiding = false;
        columnInfo.frozenColumnIndex = -1;


        columnInfos.push( columnInfo );
    }

    return columnInfos;
}

/**
 * @param {AwTableColumnInfoArray} columnInfos - Array of column information objects to use when building the
 *            table rows.
 * @param {ViewModelTreeNode} parentNode - A node that acts 'parent' of a hierarchy of 'child'
 *            ViewModelTreeNodes.
 * @param {Boolean} isLoadAllEnabled - TRUE if all properties should be included.
 */
function _buildTreeTableStructure( columnInfos, parentNode, isLoadAllEnabled ) {
    var children;
    var key;
    var vmNodes = [];
    if( parentNode.id === 'top' ) {
        key = rootID;
    } else {
        key = parentNode.id;
    }
    children = idToChildrenMap[ key ];
    var levelNdx = parentNode.levelNdx + 1;

    for( var i = 0; i < children.length; i++ ) {
        /**
         * Create a new node for this level. and Create props for it
         */
        var node = children[ i ];

        var childNumber = i + 1;

        var name = node.level + ' ' + node.name;

        var type = node.internalType;

        var iconURL = iconSvc.getTypeIconURL( type );

        var vmNode = awTableSvc.createViewModelTreeNode( node.uniqueID, type, name, levelNdx, childNumber, iconURL );

        if( node.children && node.children.length === 0 ) {
            vmNode.isLeaf = true;
        }
        _populateColumns( columnInfos, isLoadAllEnabled, vmNode );

        vmNodes[ i ] = vmNode;
    }
    idToChildrenMap[ key ].vmnodes = vmNodes;
}

/**
 * @param {AwTableColumnInfo} columnInfo -
 * @param {String} name -
 * @param {String} type -
 * @return {ViewModelProperty} vmProp
 */
function _createViewModelProperty( columnInfo, name, type ) {
    var dbValues;
    var uiValues;

    if( columnInfo.isTableCommand || columnInfo.isTreeNavigation ) {
        dbValues = [ name ];
        uiValues = [ name ];
    } else {
        dbValues = [ type ];
        uiValues = [ type ];
    }

    var vmProp = uwPropertySvc.createViewModelProperty( columnInfo.name, columnInfo.displayName,
        columnInfo.typeName, dbValues, uiValues );

    vmProp.propertyDescriptor = {
        displayName: columnInfo.displayName
    };

    if( columnInfo.isTableCommand || columnInfo.isTreeNavigation ) {
        vmProp.typeIconURL = iconSvc.getTypeIconURL( type );
    }

    return vmProp;
}

/**
 * Resolve the row data for the 'next' page of 'children' nodes of the given 'parent'.
 * <P>
 * Note: The paging status is maintained in the 'parent' node.
 *
 * @param {DeferredResolution} deferred -
 * @param {TreeLoadInput} treeLoadInput -
 */
function _loadTreeTableRows( deferred, treeLoadInput ) {
    /**
     * Check if this 'parent' is NOT known to be a 'leaf' and has no 'children' yet.
     */
    var parentNode = treeLoadInput.parentNode;

    if( !parentNode.isLeaf ) {
        var nChild = parentNode.children ? parentNode.children.length : 0;

        if( nChild === 0 ) {
            // get props with intial tree for now. In future, should set this to false and populate
            // the props seperately.
            var isLoadAllEnabled = true;
            if( parentNode.levelNdx < 0 ) {
                _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, _numInitialTopChildren, isLoadAllEnabled );
            } else {
                if( parentNode.levelNdx < _maxTreeLevel ) {
                    _buildTreeTableStructure( _getTreeTableColumnInfos(), parentNode, _numNextChildren -
                        parentNode.levelNdx * 23, isLoadAllEnabled );
                } else {
                    parentNode.isLeaf = true;
                }
            }
        }
    }
    var childNodes;
    var key;
    if( parentNode.id === 'top' ) {
        key = rootID;
        childNodes = idToChildrenMap[ rootID ];
    } else {
        key = parentNode.id;
    }
    childNodes = idToChildrenMap[ key ].vmnodes;

    var treeLoadResult = awTableSvc.buildTreeLoadResult( treeLoadInput, childNodes, false, true,
        true, null );

    deferred.resolve( {
        treeLoadResult: treeLoadResult
    } );
}

/**
 * @param {ObjectArray} columnInfos -
 * @param {Boolean} isLoadAllEnabled -
 * @param {ViewModelTreeNode} vmNode -
 * @param {Number} childNdx -
 */
function _populateColumns( columnInfos, isLoadAllEnabled, vmNode ) {
    if( isLoadAllEnabled ) {
        if( !vmNode.props ) {
            vmNode.props = [];
        }

        _.forEach( columnInfos, function( columnInfo ) {
            /**
             * Do not put any properties in the 'isTreeNavigation' column.
             */
            if( !columnInfos.isTreeNavigation ) {
                vmNode.props[ columnInfo.name ] = _createViewModelProperty( columnInfo, vmNode.name,
                    vmNode.type );
            }
        } );
    }
}

var exports = {};

export let setAllowedTypesInfo = function( allowedTypesInfo ) {
    _allowedTypesInfo = allowedTypesInfo;
};

export let getAllowedTypesInfo = function() {
    return _allowedTypesInfo;
};

export let setMapData = function( objectMap, childMap ) {
    _idToChildrenMap = childMap;
    _idToObjectMap = objectMap;
};

export let getMapData = function() {
    return {
        idToChildrenMap: _idToChildrenMap,
        idToObjectMap: _idToObjectMap
    };
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
    _data = data;
    var deferred = AwPromiseService.instance.defer();

    uwDataProvider.columnConfig = {
        columns: _getTreeTableColumnInfos()
    };

    deferred.resolve( {
        columnInfos: _getTreeTableColumnInfos()
    } );

    return deferred.promise;
};

export let getPreviewContent = function() {
    return previewElement;
};
/**
 * Get a page of row data for a 'tree' table.
 *
 *  treeLoadInput - An Object this action function is invoked from. The object is usually
 *            the result of processing the 'inputData' property of a DeclAction based on data from the current
 *            DeclViewModel on the $scope) . The 'pageSize' properties on this object is used (if defined).
 *
 * <pre>
 * {
 * Extra 'debug' Properties
 *     delayTimeTree: {Number}
 * }
 * </pre>
 * @param {data} data - data Object
 *  @param {ctx} ctx - ctx instance Object
 * @return {Promise} A Promise that will be resolved with a TreeLoadResult object when the requested data is
 *         available.
 */
export let loadTreeTableData = function( data, ctx ) {
    _data = data;

    var treeData = arm0HTMLSpecTemplateEdit.getTreeData( data, ctx );

    if( treeData ) {
        _data.treeData = treeData;
        idToObjectMap = {};
        idToChildrenMap = {};
    }
    if( data.isTreeLoaded === undefined ) {
        data.isTreeLoaded = false;
    }
    if( idToObjectMap && $.isEmptyObject( idToObjectMap ) ) {
        populateTreeTableData( data );
    }
    /**
     * Extract action parameters from the arguments to this function.
     */
    var treeLoadInput = awTableSvc.findTreeLoadInput( arguments );

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
    treeLoadInput.expandBelow = true;
    return deferred.promise;
};

/**
 * to refresh 'tree' table data.
 */
function refreshTreeData() {
    eventBus.publish( 'importPreview.refreshTreeDataProvider' );
}

/**
 *
 * @param {Object} data - the tree data object
 * to popolate tree and Secondary area
 */
function populateTreeTableData( data ) {
    rootID = data.treeData.uniqueID;
    populateChildren( data.treeData, data );
}

/**
 * for crating Map from the JSON data
 * @param {*} previewData //
 * @param {*} data //
 */
function populateChildren( previewData, data ) {
    var children = previewData.children;
    idToChildrenMap[ previewData.uniqueID ] = children;
    idToObjectMap[ previewData.uniqueID ] = previewData;
    for( var i = 0; i < children.length; i++ ) {
        var innerChildren = children[ i ];
        idToObjectMap[ innerChildren.uniqueID ] = innerChildren;
        idToObjectMap[ innerChildren.uniqueID ].parent = previewData;

        if( innerChildren.children && innerChildren.children.length > 0 ) {
            populateChildren( innerChildren, data );
        } else {
            exports.setMapData( idToObjectMap, idToChildrenMap );
        }
    }
}

export let validateSelection = function( selectedObject ) {
    var eventData = {
        selected: selectedObject
    };
    eventBus.publish( 'Arm0HTMLSpecTemplateTree.selectionChangeEvent', eventData );
};

/**
 * This will provide Cross-Probing feature. It Expand node in HTML Spect template tree
 *
 *
 * @param {Object} data - The view model object
 * @param {Object} parentObjectUid - element uid which has to be expanded in tree
 */
export let expandNode = function( data, parentObjectUid ) {
    var provider = data.dataProviders.htmlSpecDataProvider;

    if( provider ) {
        var list = provider.viewModelCollection.getLoadedViewModelObjects();
        for( var i = 0; i < list.length; i++ ) {
            if( list[ i ].uid === parentObjectUid ) {
                eventBus.publish( provider.name + '.expandTreeNode', {
                    parentNode: list[ i ]
                } );
            }
        }
    }
};
/**
 * Select the default Logical Object
 *
 * @param {Object} data - The view model object
 * @param {Object} eventData - the eventData
 */
export let selectTreeObjForCrossProb = function( data, eventData ) {
    var provider = data.dataProviders.htmlSpecDataProvider;
    if( provider ) {
        var vmc = provider.viewModelCollection;
        var index;
        var selectObj = eventData.objectsToSelect[ 0 ].uid;
        index = vmc.findViewModelObjectById( eventData.objectsToSelect[ 0 ].uid );
        if( index === -1 ) {
            var parentIdsToExpand = [];
            getNodesToExpand( data.eventData.objectsToSelect[0].uid, vmc, parentIdsToExpand );
            var i = parentIdsToExpand.length - 1;
            //expand nodes until object is visible in PWA
            expandNode( data, parentIdsToExpand[i] );

            var _treeNodesLoaded = eventBus.subscribe( 'htmlSpecDataProvider.treeNodesLoaded', function( eventData ) {
                if( i === 0 ) {
                    var ind = vmc.findViewModelObjectById( selectObj );
                    var vmo = vmc.getViewModelObject( ind );
                    provider.selectionModel.setSelection( vmo );
                    eventBus.unsubscribe( _treeNodesLoaded );
                }else{
                    i--;
                    expandNode( data, parentIdsToExpand[i] );
                }
            } );
        }else{
            var vmo = vmc.getViewModelObject( index );
            provider.selectionModel.setSelection( vmo );
        }
    }
};

var getNodesToExpand = function( ObjectToSelect, vmc, parentIdsToExpand ) {
    var selectObject = document.getElementById( ObjectToSelect );
    var istopLine = selectObject.getAttribute( 'top_line' );
    var parentId = selectObject.getAttribute( 'parentid' );
    if( istopLine !== 'true' ) {
        var index = vmc.findViewModelObjectById( parentId );
        if( index === -1 ) {
            parentIdsToExpand.push( parentId );
            return getNodesToExpand( parentId, vmc, parentIdsToExpand );
        }
            parentIdsToExpand.push( parentId );
    }
};

/**
 * to Update the MAP(indirectly JSON data as well)
 * @param {Object} selectedSpecID - selected ID of the Element
 * @param {Object} typeOfSpecElement - display name of the selected type
 * @param {Object} internalNameOfSpecElement - intername of the selected type
 */
export let updateDataMap = function( selectedSpecID, typeOfSpecElement, internalNameOfSpecElement ) {
    var mapData = exports.getMapData();
    mapData[ idToObjectMapConst ][ selectedSpecID ].type = typeOfSpecElement;
    updateSecondoryArea( selectedSpecID, typeOfSpecElement, internalNameOfSpecElement );
    refreshTreeData();
};

/**
 * to Update the secondary area
 * @param {String} selectedSpecID - selected ID of the Element
 * @param {String} typeOfSpecElement - display name of the selected type
 * @param {String} internalNameOfSpecElement - intername of the selected type
 *
 */
function updateSecondoryArea( selectedSpecID, typeOfSpecElement, internalNameOfSpecElement ) {
    var selectedItem = $( '#' + selectedSpecID );
    var typeIconElementStrUrl = iconSvc.getTypeIconURL( internalNameOfSpecElement );
    selectedItem.find( 'typeicon' ).attr( 'title', typeOfSpecElement );
    selectedItem.find( 'img.aw-base-icon' ).attr( 'src', typeIconElementStrUrl );
    eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
}

export default exports = {
    setAllowedTypesInfo,
    getAllowedTypesInfo,
    setMapData,
    getMapData,
    loadTreeTableColumns,
    getPreviewContent,
    loadTreeTableData,
    validateSelection,
    expandNode,
    selectTreeObjForCrossProb,
    updateDataMap
};
/**
 * @memberof NgServices
 * @member awTableDataService
 */
app.factory( 'Arm0HTMLSpecTemplateTree', () => exports );
