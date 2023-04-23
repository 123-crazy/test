//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*
 global define
 */

/**
 * @module js/occmgmtViewModelTreeNodeCreateService
 */
import app from 'app';
import awTableSvc from 'js/awTableService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';
import occmgmtIconService from 'js/occmgmtIconService';
import occmgmtUtils from 'js/occmgmtUtils';
import appCtxSvc from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import _ from 'lodash';
/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

let _applyVMNodeCreationStrategy = function( vmNode, vmNodeCreationStrategy ) {
    if( _.isUndefined( vmNode ) || _.isUndefined( vmNodeCreationStrategy ) ) {
        return vmNode;
    }

    var reuseVMNode = _.isUndefined( vmNodeCreationStrategy.reuseVMNode ) ? false : vmNodeCreationStrategy.reuseVMNode;
    var staleVMNodeUids = _.isUndefined( vmNodeCreationStrategy.staleVMNodeUids ) ? [] : vmNodeCreationStrategy.staleVMNodeUids;

    if( reuseVMNode && !_.includes( staleVMNodeUids, vmNode.uid ) ) {
        if( vmNodeCreationStrategy.referenceLoadedVMObjectUidsMap.has( vmNode.uid ) ) {
            var loadedVMNode = vmNodeCreationStrategy.referenceLoadedVMObjectUidsMap.get( vmNode.uid );

            delete vmNode.type;
            if( loadedVMNode.levelNdx <= 0 ) {
                // we should always create new object for root object.
                // the root objects are part of rootPath objects, if we share the same object
                // then it create problem while tree processing.
                vmNode = _.clone( _.assign( loadedVMNode, vmNode ) );
                if( !_.isUndefined( vmNode.isGreyedOutElement ) ) {
                    delete vmNode.isGreyedOutElement;
                }
            } else {
                // we should share the same objects while sharing vmNodes.
                // else the __expandState VMOs might get out of sync with newly created VMNodes.
                vmNode = _.assign( loadedVMNode, vmNode );
            }
        }

        // clear expansion cache
        if( !_.isUndefined( vmNodeCreationStrategy.clearExpandState ) && vmNodeCreationStrategy.clearExpandState === true && !_.isUndefined( vmNode.__expandState ) ) {
            delete vmNode.__expandState;
        }

        // always re-evaluate isExpanded for view model tree node.
        if( !_.isUndefined( vmNode.isExpanded ) && vmNode.isExpanded === true &&
            ( _.isUndefined( vmNode.children ) || _.isEmpty( vmNode.children ) ) ) {
            delete vmNode.isExpanded;
        }

        // always clear the placeholder state with vmNode if any
        // let next code take care of applying placeholder state.
        if( !_.isUndefined( vmNode.isPlaceholder ) ) {
            delete vmNode.isPlaceholder;
        }

        // we should delete markForDeletion flag as we are here to create vmNode
        if( !_.isUndefined( vmNode.markForDeletion ) ) {
            delete vmNode.markForDeletion;
        }
    }
    return vmNode;
};

/**
 * @param {IModelObject} modelObj - IModelObject Information to base the new node upon.
 * @param {Number} childNdx - child Index
 * @param {Number} levelNdx - Level index
 * @param {String} vmNodeCreationStrategy - Strategy whether to reuse view model node from current view model collection.
 *
 * @return {ViewModelTreeNode} View Model Tree Node
 */
export let createVMNodeUsingModelObjectInfo = function( modelObj, childNdx, levelNdx, vmNodeCreationStrategy, pciUid ) {
    var displayName;

    if( modelObj.props && modelObj.props.object_string ) {
        displayName = modelObj.props.object_string.uiValues[ 0 ];
    } else {
        if( modelObj.toString ) {
            displayName = modelObj.toString();
        }
    }

    var occUid = modelObj.uid;
    var occType = modelObj.type;
    var props = modelObj.props;
    var nChild = props && props.awb0NumberOfChildren ? props.awb0NumberOfChildren.dbValues[ 0 ] : 0;

    if( !displayName ) {
        displayName = occUid;
    }

    var iconURL = occmgmtIconService.getTypeIconURL( modelObj, occType );

    var vmNode = awTableSvc.createViewModelTreeNode( occUid, occType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = nChild <= 0;
    /**
     * "stableId" property on occurrence is intended to be used strictly for maintaining expansion state of nodes in
     * Tree views. DO NOT USE IT FOR OTHER PURPOSES.
     */
    if( props && props.awb0Parent && props.awb0CopyStableId ) {
        vmNode.stableId = objectToCSIDGeneratorService.getCloneStableIdChain( modelObj, 'TreeStyleCsidPath' );
        // The following line replaces all instances of "/" in the stableId property with ":" so that it is in sync with the value when sent by server.
        // This is a temporary change and should be rolled back as soon as "objectToCSIDGeneratorService" is changed to use ":" as separator.
        vmNode.stableId = vmNode.stableId.replace( /\//g, ':' );

        var isJitterFreeSupported = false;
        if( pciUid ) {
            var productContextInfo = cdmSvc.getObject( pciUid );
            isJitterFreeSupported = occmgmtUtils.isFeatureSupported( productContextInfo, 'Awb0JitterFreeRefreshBackButton' );
        } else if( appCtxSvc.ctx.aceActiveContext.context.currentState && appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid ) {
            pciUid = appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid;
            var productContextInfo = cdmSvc.getObject( appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid );
            isJitterFreeSupported = occmgmtUtils.isFeatureSupported( productContextInfo, 'Awb0JitterFreeRefreshBackButton' );
        }

        if( isJitterFreeSupported && !_.isUndefined( vmNode.stableId ) && !_.isEmpty( vmNode.stableId ) ) {
            if( vmNode.stableId === ':' && !_.isEmpty( pciUid ) ) {
                vmNode.alternateID = pciUid;
            } else {
                vmNode.alternateID = vmNode.stableId;
            }
        }
    }

    if( props && props.awb0BreadcrumbAncestor ) {
        vmNode.parentUid = props.awb0BreadcrumbAncestor.dbValues[ 0 ];
    }

    vmNode = _applyVMNodeCreationStrategy( vmNode, vmNodeCreationStrategy );

    return vmNode;
}; // _createVMNodeUsingModelObjectInfo

/**
 * Adds two numbers together.
 * @param {ViewModelTreeNode} vmNode Node being created.
 * @param {String} parentUid Parent uid of vm node.
 */
function _propogateParentInformationToVMNode( vmNode, parentUid ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    if( vmc ) {
        var parentObjNdx = vmc.findViewModelObjectById( parentUid );
        var parentNode = vmc.getViewModelObject( parentObjNdx );

        if( parentNode && parentNode.isGreyedOutElement ) {
            vmNode.isGreyedOutElement = parentNode.isGreyedOutElement;
        }
    }
}

/**
 * @param {SoaOccurrenceInfo} occInfo - Occurrence Information returned by server
 * @param {Number} childNdx - child Index
 * @param {Number} levelNdx - Level index
 * @param {String} pciUid - PCI uid of the element which this node is going to represent
 * @param {String} parentUid - Parent uid of vm node
 * @param {String} vmNodeCreationStrategy - Strategy whether to reuse view model node from current view model collection.
 *
 * @return {ViewModelTreeNode} View Model Tree Node
 */
export let createVMNodeUsingOccInfo = function( occInfo, childNdx, levelNdx, pciUid, parentUid, vmNodeCreationStrategy ) {
    var displayName = occInfo.displayName;
    var occUid = occInfo.occurrenceId;
    var occType = occInfo.underlyingObjectType;
    var occurrenceObject = cdmSvc.getObject( occUid );
    var props = occurrenceObject && occurrenceObject.props;
    var nChild = props && props.awb0NumberOfChildren ? props.awb0NumberOfChildren.dbValues[ 0 ] :
        occInfo.numberOfChildren;

    if( !displayName ) {
        displayName = occUid;
    }

    var iconURL = occmgmtIconService.getTypeIconURL( occInfo, occType );

    var vmNode = awTableSvc.createViewModelTreeNode( occUid, occType, displayName, levelNdx, childNdx, iconURL );

    vmNode.isLeaf = nChild <= 0;
    /**
     * "stableId" property on occurrence is intended to be used strictly for maintaining expansion state of nodes in
     * Tree views. DO NOT USE IT FOR OTHER PURPOSES.
     */
    vmNode.stableId = occInfo.stableId;
    vmNode.pciUid = pciUid;

    var isJitterFreeSupported = false;
    if( pciUid ) {
        var productContextInfo = cdmSvc.getObject( pciUid );
        isJitterFreeSupported = occmgmtUtils.isFeatureSupported( productContextInfo, 'Awb0JitterFreeRefreshBackButton' );
    } else if( appCtxSvc.ctx.aceActiveContext.context.currentState && appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid ) {
        var productContextInfo = cdmSvc.getObject( appCtxSvc.ctx.aceActiveContext.context.currentState.pci_uid );
        isJitterFreeSupported = occmgmtUtils.isFeatureSupported( productContextInfo, 'Awb0JitterFreeRefreshBackButton' );
    }

    if( isJitterFreeSupported ) {
        // In case of insertLevel the occInfo.stableId is empty for the new occurrences returned as a part of newElementInfos in the SOA response.
        // So, compute it from the occInfo.
        var stableId = vmNode.stableId;
        if( !stableId && occInfo.occurrence && occInfo.occurrence.props && occInfo.occurrence.props.awb0Parent && occInfo.occurrence.props.awb0CopyStableId ) {
            stableId = objectToCSIDGeneratorService.getCloneStableIdChain( occInfo.occurrence, 'TreeStyleCsidPath' );
            stableId = stableId.replace( /\//g, ':' );
        } else if( !stableId && !_.isUndefined( occInfo ) && ( _.isUndefined( occInfo.occurrence ) || _.isUndefined( occInfo.occurrence.props ) ) ) {
            var occurrence = cdmSvc.getObject( occInfo.occurrenceId );
            if( occurrence && occurrence.props && occurrence.props.awb0Parent && occurrence.props.awb0CopyStableId ) {
                stableId = objectToCSIDGeneratorService.getCloneStableIdChain( occurrence, 'TreeStyleCsidPath' );
                stableId = stableId.replace( /\//g, ':' );
            }
        }

        if( !_.isUndefined( stableId ) && !_.isEmpty( stableId ) ) {
            if( stableId === ':' || stableId.indexOf( ':' ) === -1 ) {
                vmNode.alternateID = pciUid;
            } else {
                vmNode.alternateID = stableId;
            }
        }
    }

    if( parentUid ) {
        var reuseVMNode = _.isUndefined( vmNodeCreationStrategy ) || _.isUndefined( vmNodeCreationStrategy.reuseVMNode ) ? false : vmNodeCreationStrategy.reuseVMNode;
        if( !reuseVMNode ) {
            _propogateParentInformationToVMNode( vmNode, parentUid );
        }
        vmNode.parentUid = parentUid;
    }

    vmNode = _applyVMNodeCreationStrategy( vmNode, vmNodeCreationStrategy );

    return vmNode;
};

export let createVMNodesForGivenOccurrences = function( childOccInfos, levelNdx, pciUid, elementToPciMap, parentUid, vmNodeCreationStrategy ) {
    var vmNodes = [];

    for( var childNdx = 0; childNdx < childOccInfos.length; childNdx++ ) {
        var elementPciUid = pciUid;

        if( elementToPciMap && elementToPciMap[ childOccInfos[ childNdx ].occurrenceId ] ) {
            elementPciUid = elementToPciMap[ childOccInfos[ childNdx ].occurrenceId ];
        }

        var vmNode = exports.createVMNodeUsingOccInfo( childOccInfos[ childNdx ], childNdx, levelNdx, elementPciUid, parentUid, vmNodeCreationStrategy );
        vmNodes.push( vmNode );
    }

    return vmNodes;
};

export default exports = {
    createVMNodeUsingModelObjectInfo,
    createVMNodeUsingOccInfo,
    createVMNodesForGivenOccurrences
};
/**
 * @memberof NgServices
 * @member occmgmtViewModelTreeNodeCreateService
 */
app.factory( 'occmgmtViewModelTreeNodeCreateService', () => exports );
