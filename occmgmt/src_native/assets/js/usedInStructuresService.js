// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */
/**
 * @module js/usedInStructuresService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import awTableSvc from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import awColumnSvc from 'js/awColumnService';
import iconSvc from 'js/iconService';
import tcVmoService from 'js/tcViewModelObjectService';

import _ from 'lodash';
import 'soa/kernel/clientMetaModel';

var exports = {};

/**
 * initialize contextKey in Used In Structures View
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {subPanelContext} subPanelContext - subPanelContext of this view
 */
export let initializeUsedInStructuresView = function( data, subPanelContext ) {
    data.contextKey = null;
    if( !_.isUndefined( subPanelContext ) && !_.isUndefined( subPanelContext.contextKey ) ) {
        data.contextKey = subPanelContext.contextKey;
    }
};

/**
 * reset used in structures cursorInfo for the selected element.
 * @param {treeLoadInput} treeLoadInput Tree Load Input
 */
export let resetTreeData = function( treeLoadInput ) {
    treeLoadInput.parentNode.cursorInfo = {};
};

var IModelObject = function( uid, type ) {
    this.uid = uid;
    this.type = type;
};

/**
* Get used in structures data for the selected element.

* @param {treeLoadInput} treeLoadInput Tree Load Input
* @param {object} uwDataProvider data provider
*
* @return {Promise} Resolved with an object containing the results of the operation.
*/
export let loadWhereUsedTree = function( treeLoadInput, uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();

    var reverseTreeSelectionUid;
    if( data.contextKey !== null ) {
        var currentSelection = appCtxSvc.ctx[ data.contextKey ].selectedModelObjects[ 0 ];
        reverseTreeSelectionUid = currentSelection.props.awb0UnderlyingObject.dbValues[ 0 ];
    } else {
        reverseTreeSelectionUid = appCtxSvc.ctx.selected.uid;
    }

    treeLoadInput.displayMode = 'Tree';
    var failureReason = awTableSvc
        .validateTreeLoadInput( treeLoadInput );

    if( failureReason ) {
        deferred.reject( failureReason );
        return deferred.promise;
    }

    var isRootNode = treeLoadInput.parentNode.levelNdx === -1;
    if( !isRootNode ) {
        reverseTreeSelectionUid = treeLoadInput.parentNode.uid;
    }

    var clientScopeURI = 'awb0Structure';
    //Set on Data which will ne used in case of reset or update column configuration
    data.clientScopeURI = clientScopeURI;
    uwDataProvider.objectSetUri = clientScopeURI;

    var reverseeTreeNode = new IModelObject( reverseTreeSelectionUid, 'ItemRevision' );
    //Prepare SOA input
    var soaInput = {
        whereUsedInput: {
            inputObject: reverseeTreeNode,
            additionalInfo: {},
            cursorInfo: treeLoadInput.parentNode.cursorInfo,
            pageSize: 100,
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: clientScopeURI,
                columnsToExclude: [],
                hostingClientName: '',
                operationType: ''
            }
        }
    };

    buildTreeTableStructure( treeLoadInput, soaInput, uwDataProvider, deferred );
    return deferred.promise;
};

/**
 * reset used in structures data.
 * @param {data} data  Used In Structures Data
 */
 export let resetUsedInStructuresData = function( data ) {
    data.dataProviders.usedInStructuresDataProvider.viewModelCollection.loadedVMObjects = [];
    data.isDataLoadDone = false;
    eventBus.publish( 'usedInStructuresGrid.plTable.reload' );
};

/**
 * calls SOA
 * @param {Object} treeLoadInput Tree Load Input
 * @param {Object} soaInput inputData Input for SOA
 * @param {object} uwDataProvider data provider
 * @param {Object} deferred deferred input
 */
function buildTreeTableStructure( treeLoadInput, soaInput, uwDataProvider, deferred ) {
    //call SOA
    soaSvc.postUnchecked( 'Internal-Structure-2020-12-WhereUsed', 'getWhereUsedInfo', soaInput ).then(
        function( response ) {
            // if retrieving first level than set columns for table
            var retrievingFirstLevel = treeLoadInput.parentNode.levelNdx === -1;
            if( retrievingFirstLevel ) {
                initColumsForUsedInStructuresTable( response.columnConfigOutput, uwDataProvider );
            }

            var modelObjects = [];
            if( response.childToParentMap ) {
                for( var indx = 0; indx < response.childToParentMap[ 0 ].length; indx++ ) {
                    for( var jndx = 0; jndx < response.childToParentMap[ 1 ][ indx ].length; jndx++ ) {
                        var obj = response.childToParentMap[ 1 ][ indx ][ jndx ];
                        var modelObject = obj.resultObject;
                        modelObject.props.hasParent = obj.hasParent;
                        modelObjects.push( modelObject );
                    }
                }
            }

            if( response.cursorInfo ) {
                treeLoadInput.parentNode.cursorObject = response.cursorInfo[ soaInput.whereUsedInput.inputObject.uid ];
                treeLoadInput.parentNode.cursorInfo = response.cursorInfo;
            }

            // prepare view model tree nodes for table
            var treeLoadResult = createViewModelTreeNode( treeLoadInput, modelObjects );
            treeLoadResult.parentNode.cursorObject = treeLoadInput.parentNode.cursorObject;

            //resolve deferred result
            deferred.resolve( {
                treeLoadResult: treeLoadResult
            } );
        } );
}

/**
 * @param {TreeLoadInput} treeLoadInput - Parameters for the operation.
 * @param {modelObjects} modelObjects input view model objects
 * @return {object} response
 */
function createViewModelTreeNode( treeLoadInput, modelObjects ) {
    var vmNodes = [];
    // This is the "root" node of the tree or the node that was selected for expansion
    var parentNode = treeLoadInput.parentNode;
    var levelNdx = parentNode.levelNdx + 1;
    treeLoadInput.pageSize = modelObjects.length;
    for( var childNdx = 0; childNdx < modelObjects.length; childNdx++ ) {
        var modelObj = modelObjects[ childNdx ];
        var displayName = modelObj.props.object_string.uiValues[ 0 ];
        var iconType = modelObj.type;
        var iconURL = iconSvc.getTypeIconURL( iconType );
        var hasParent = modelObjects[ childNdx ].props.hasParent;

        //Create treeModelObject
        var treeVmNode = awTableSvc
            .createViewModelTreeNode( modelObj.uid, modelObj.type, displayName, levelNdx, childNdx, iconURL );

        //Generating unique id for each row. We can't reply on uid as we can have same object multiple time in same table.
        var id = treeVmNode.id + treeLoadInput.parentNode.id + childNdx + treeLoadInput.parentNode.levelNdx;
        treeVmNode.id = id;
        treeVmNode.alternateID = id;

        //copy properties from model object to tree model object
        tcVmoService.mergeObjects( treeVmNode, modelObj );

        //set isLeaf on TreeModelObject
        treeVmNode.isLeaf = !hasParent;

        if( treeVmNode ) {
            vmNodes.push( treeVmNode );
        }
    }

    return awTableSvc.buildTreeLoadResult( treeLoadInput, vmNodes, true, true, treeLoadInput.parentNode.cursorObject.endReached, true );
}

/**
 * Build column information for Used In Structure Table.
 *
 * @param {ColumConfi} columnConfig - Column config returned by SOA
 * @param {UwDataProvider} dataProvider - The data provider for Used In Structure Table
 *
 */
function initColumsForUsedInStructuresTable( columnConfig, dataProvider ) {
    // Build AW Columns
    var awColumnInfos = [];
    var columnConfigCols = columnConfig.columns;
    for( var index = 0; index < columnConfigCols.length; index++ ) {
        // fix to increase column width for first column
        var pixelWidth = columnConfigCols[ index ].pixelWidth;
        var columnInfo = {
            field: columnConfigCols[ index ].propertyName,
            name: columnConfigCols[ index ].propertyName,
            propertyName: columnConfigCols[ index ].propertyName,
            displayName: columnConfigCols[ index ].displayName,
            typeName: columnConfigCols[ index ].typeName,
            pixelWidth: pixelWidth,
            hiddenFlag: columnConfigCols[ index ].hiddenFlag,
            enableColumnResizing: true,
            pinnedRight: false,
            enablePinning: false,
            enableCellEdit: false
        };
        var awColumnInfo = awColumnSvc.createColumnInfo( columnInfo );

        awColumnInfos.push( awColumnInfo );
    }

    // Set columnConfig to Data Provider.
    dataProvider.columnConfig = {
        columnConfigId: columnConfig.columnConfigId,
        columns: awColumnInfos
    };
}

export default exports = {
    loadWhereUsedTree,
    initializeUsedInStructuresView,
    resetTreeData,
    resetUsedInStructuresData
};

app.factory( 'usedInStructuresService', () => exports );
