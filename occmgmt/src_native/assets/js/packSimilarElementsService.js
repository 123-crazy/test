//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/packSimilarElementsService
 */
import app from 'app';
import omStateHandler from 'js/occurrenceManagementStateHandler';
import occmgmtUtils from 'js/occmgmtUtils';
import appCtxSvc from 'js/appCtxService';
import occmgmtStructureEditService from 'js/occmgmtStructureEditService';
import _ from 'lodash';
import cdm from 'soa/kernel/clientDataModel';
import acePartialSelectionService from 'js/acePartialSelectionService';

var exports = {};

var productContextInfo = null;

var populateProductContextInfo = function() {
    productContextInfo = omStateHandler.getProductContextInfo();
};

/**
 * Get display mode using add elements service.
 */
export let getTreeOrListDisplayMode = function() {
    var viewModeInfo = appCtxSvc.ctx.ViewModeContext;
    if( viewModeInfo.ViewModeContext === 'TreeView' || viewModeInfo.ViewModeContext === 'TreeSummaryView' ) {
        return 'Tree';
    }
    return 'List';
};

/**
 * Get selections.
 */
 export let getSelections = function() {
    if( appCtxSvc.ctx.mselected.length > 0 ) {
        var mselected = [];
        _.forEach( appCtxSvc.ctx.mselected, function( selected ) {
            if( acePartialSelectionService.isPartiallySelected( selected.uid ) ) {
                var visibleNodeUid = acePartialSelectionService.getVisibleNodeForHiddenNodeInPartialSelection( selected.uid );
                var visibleNode = cdm.getObject(visibleNodeUid);
                if( visibleNode ){
                    mselected.push( visibleNode );
                }
            }
            else {
                mselected.push(selected);
            }
        });
        return mselected;
    }
    return appCtxSvc.ctx.mselected;
};

/*
* Get the array of uids corresponding to selections
*/
export let getSelectedUids = function() {
    var selectedUids = [];
    _.forEach( appCtxSvc.ctx.mselected, function( selected ) {
        if( !_.isUndefined( selected.uid ) ) {
            selectedUids.push( selected.uid );
        }
    });
    return selectedUids;
};

/**
 * Get packed elements from service data.
 */
export let getPackedElements = function( response ) {
    if( response.ServiceData && response.ServiceData.deleted ) {
        var mselected = appCtxSvc.ctx.mselected.map( function( obj ) {
            return obj.uid;
        } );
        return _.intersection( response.ServiceData.deleted, mselected );
    }
};

/**
 * Get Pack Similar Elements Configuration Data
 */
export let getInitialPackSimilarElementsConfigurationData = function( data ) {
    if( data ) {
        populateProductContextInfo();
        if( productContextInfo && productContextInfo.props.awb0PackSimilarElements ) {
            var packSimilarElements = productContextInfo.props.awb0PackSimilarElements.dbValues[ 0 ];
            if( packSimilarElements ) {
                if( packSimilarElements === "1" ) {
                    data.packSimilarElements.dbValue = true;
                } else {
                    data.packSimilarElements.dbValue = false;
                }
            }
        }
    }
};

var updateVmcLoadedObjectsAsPerAllChildren = function( parentInfo, allChildren ) {
    // parent uid may also have changed
    occmgmtStructureEditService.updateNodeIfUidChanged( parentInfo );

    var parentVMO = occmgmtStructureEditService.getTreeNode( parentInfo );
    var childsDeleted = [];
    if( parentVMO.children && parentVMO.children.length > 0 ) {
        var allChildrenStableIds = allChildren.map( function( obj ) { return obj.stableId; } );
        _.forEach( parentVMO.children, function( child ) {
            !allChildrenStableIds.includes( child.stableId ) ? childsDeleted.push( child ) : "";
        } );
    }

    _.forEach( childsDeleted, function( child ) { 
        occmgmtStructureEditService.removeNode( child, parentInfo, true );
    } );
    for( var childIndex = 0; childIndex < allChildren.length; childIndex++ ) {
        occmgmtStructureEditService.addChildNode( allChildren[ childIndex ], childIndex, parentInfo );
    }
    acePartialSelectionService.restorePartialSelection();
};

export let postProcessPackUnpackResponse = function( response ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    if( response.parentChildrenInfos && vmc && occmgmtUtils.isTreeView() ) {
        for( var i = 0; i < response.parentChildrenInfos.length; i++ ) {
            var info = response.parentChildrenInfos[ i ];
            // check parent itself is not hidden when multiselected and packed
            if( occmgmtStructureEditService.isNodePresentInTree( info.parentInfo ) ) {
                updateVmcLoadedObjectsAsPerAllChildren( info.parentInfo, info.childrenInfo );
            }
        }
    }
};

/**
 * Pack Similar Elements Configuration service utility
 */

export default exports = {
    getTreeOrListDisplayMode,
    getSelections,
    getSelectedUids,
    getPackedElements,
    getInitialPackSimilarElementsConfigurationData,
    postProcessPackUnpackResponse
};
app.factory( 'packSimilarElementsService', () => exports );
