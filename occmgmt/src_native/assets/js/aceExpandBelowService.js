// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceExpandBelowService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import occmgmtUpdatePwaDisplayService from 'js/occmgmtUpdatePwaDisplayService';
import awTableStateService from 'js/awTableStateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import editHandlerService from 'js/editHandlerService';

var _awTableToggleRowEvetSubscription = null;

var exports = {};

export let performExpandBelow = function( levelsToExpand, viewKey ) {
    var key = viewKey ? viewKey : appCtxService.ctx.aceActiveContext.key;
    var selected = appCtxService.ctx[ key ].selectedModelObjects[ 0 ];
    var vmoId = appCtxService.ctx[ key ].vmc.findViewModelObjectById( selected.uid );
    if( vmoId !== -1 ) {
        var expandBelowPageSize = '500'; // default page size
        if( !_.isUndefined( appCtxService.ctx.preferences ) && !_.isUndefined( appCtxService.ctx.preferences.AWB_ExpandBelowResponsePageSize  ) 
            && appCtxService.ctx.preferences.AWB_ExpandBelowResponsePageSize.length > 0  ) {
            expandBelowPageSize = appCtxService.ctx.preferences.AWB_ExpandBelowResponsePageSize[0];
        }
        appCtxService.updatePartialCtx( key + '.expansionCriteria.expandBelow', 'true' );
        appCtxService.updatePartialCtx( key + '.expansionCriteria.loadTreeHierarchyThreshold', expandBelowPageSize );
        appCtxService.updatePartialCtx( key + '.nodeUnderExpandBelow', selected );

        var vmo = appCtxService.ctx[ key ].vmc.loadedVMObjects[ vmoId ];

        if( parseInt( levelsToExpand ) > 0 ) {
            levelsToExpand = levelsToExpand.toString();
            appCtxService.updatePartialCtx( key + '.expandNLevel', {
                levelsToExpand: levelsToExpand,
                levelsApplicableForExpansion: vmo.$$treeLevel + parseInt( levelsToExpand )
            } );
        } else {
            delete appCtxService.ctx[ key ].expandNLevel;
        }
        appCtxService.updatePartialCtx( key + '.expandStateCache', vmo.__expandState );
        delete vmo.__expandState;
        if( vmo.isExpanded ) {
            //Mark isExpanded false so that "expandTreeNode" event subscription is executed which will mark it as expanded again
            vmo.isExpanded = false;
        }
        eventBus.publish( appCtxService.ctx[ key ].vmc.name + '.expandTreeNode', {
            parentNode: {
                id: selected.uid
            }
        } );
    }
};

export let getCommandContextFromParent = function( parent ) {
    var localParent = parent;
    while( localParent ) {
        if( localParent.context ) {
            break;
        }
        localParent = localParent.$parent;
    }
    return localParent.context;
};

export let performCollapseBelow = function( viewKey ) {
    var key = viewKey ? viewKey : appCtxService.ctx.aceActiveContext.key;

    var vmoId = appCtxService.ctx[ key ].vmc.findViewModelObjectById( appCtxService.ctx[ key ].selectedModelObjects[ 0 ].uid );
    if( vmoId !== -1 ) {
        initializeEventSubscriptions();
        var vmo = appCtxService.ctx[ key ].vmc.loadedVMObjects[ vmoId ];
        var dataProviderId = appCtxService.ctx[ key ].vmc.name;
        eventBus.publish( dataProviderId + '.toggleTreeNodeHierarchy', vmo );
    }
};

var initializeEventSubscriptions = function() {
    if( !_awTableToggleRowEvetSubscription ) {
        _awTableToggleRowEvetSubscription = eventBus.subscribe( 'toggleTreeNodeHierarchy', exports.collapseNodeHierarchy );
    }
};

export let collapseNodeHierarchy = function( eventData ) {
    var gridId = Object.keys( eventData.data.grids )[ 0 ];
    var declGrid = eventData.data._internal.grids[ gridId ];
    var uwDataProvider = eventData.data.dataProviders[ declGrid.dataProvider ];
    // LCS-281388. workaround till the time children get populted on top node after use cases like sort or filter.
    var row = eventData.row;
    var data = eventData.data;

    collapseProvidedRow( gridId, uwDataProvider, row, data );
};

var collapseProvidedRow = function( gridId, uwDataProvider, row, data ) {
    // LCS-281388. workaround till the time children get populted on top node after use cases like sort or filter.
    if( row.levelNdx === 0 && !row.children ) {
        var firstLevelChildren = getExpandedChildrenOfTopNode( uwDataProvider );
    }
    var nodesInfo = getApplicableNodesInfoForCollapse( row.children ? row.children : firstLevelChildren, uwDataProvider );
    var nodesToCollapse = nodesInfo.nodes;
    while( nodesInfo.children.length ) {
        nodesInfo = getApplicableNodesInfoForCollapse( nodesInfo.children, uwDataProvider );
        nodesToCollapse = nodesToCollapse.concat( nodesInfo.nodes );
    }

    nodesToCollapse.reverse().map( function( vmo ) {
        awTableStateService.saveRowCollapsed( data, gridId, vmo );
    } );

    delete row.isExpanded;
    row.isInExpandBelowMode = false;
    eventBus.publish( gridId + '.plTable.toggleTreeNode', row );

    //LCS-352021 : When in edit mode, if you do collapse below and then expand node again, edited information is lost.
    //Reason is nodes are newly getting created. We should think about not cleaning collapse cache always. But
    //for now, we will do it for LCS-352021 use case ie. when in edit mode to keep impact limited if there is any.
    aceStructureConfigurationService.populateContextKey( data );
    const pwaEditHandler = data.viewKey ? editHandlerService.getEditHandler( appCtxService.ctx[ data.viewKey ].vmc.name ) : null;
    if( !pwaEditHandler || !pwaEditHandler.editInProgress() ) {
        delete row.__expandState;
    } else {
        var rowExpansionState = row.__expandState;
        if( rowExpansionState ) {
        var purgedNodesAfterCollapse = rowExpansionState.expandedNodes;

        for( var ndx = 0; ndx < purgedNodesAfterCollapse.length; ndx++ ) {
            if( _.isEqual( purgedNodesAfterCollapse[ ndx ].isExpanded, true ) ) {
                var expandedParentNode = purgedNodesAfterCollapse[ ndx ];

                delete expandedParentNode.isExpanded;
                expandedParentNode.isInExpandBelowMode = false;

                eventBus.publish( gridId + '.plTable.toggleTreeNode', expandedParentNode );

                expandedParentNode.__expandState = {
                    children: expandedParentNode.children,
                    startChildNdx: expandedParentNode.startChildNdx,
                    totalChildCount: expandedParentNode.totalChildCount,
                    cursorObject: expandedParentNode.cursorObject,
                    expandedNodes: expandedParentNode.children
                };
            }
        }
        rowExpansionState.expandedNodes = row.__expandState.children;
    }
    }
};

var getApplicableNodesInfoForCollapse = function( rows, dataProvider ) {
    var nodesInfo = {
        nodes: [],
        children: []
    };
    _.forEach( rows, function( row ) {
        if( awTableStateService.isNodeExpanded( dataProvider.ttState, row ) ) {
            nodesInfo.nodes.push( row );
            if( row.children && row.children.length ) {
                nodesInfo.children = nodesInfo.children.concat( row.children );
            }
        }
    } );

    return nodesInfo;
};

var getExpandedChildrenOfTopNode = function( dataProvider ) {
    return dataProvider.viewModelCollection.loadedVMObjects.filter( function( node ) {
        return node.levelNdx === 1 && awTableStateService.isNodeExpanded( dataProvider.ttState, node );
    } );
};

export let destroy = function() {
    if( _awTableToggleRowEvetSubscription ) {
        eventBus.unsubscribe( _awTableToggleRowEvetSubscription );
        _awTableToggleRowEvetSubscription = null;
    }
};

export default exports = {
    performExpandBelow,
    getCommandContextFromParent,
    performCollapseBelow,
    collapseNodeHierarchy,
    destroy
};
/**
 * @memberof NgServices
 * @member aceExpandBelowService
 */
app.factory( 'aceExpandBelowService', () => exports );
