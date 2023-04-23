//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occmgmtStructureEditService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import occmgmtUtils from 'js/occmgmtUtils';
import contextStateMgmtService from 'js/contextStateMgmtService';
import occmgmtVMTNodeCreateService from 'js/occmgmtViewModelTreeNodeCreateService';
import AwTimeoutService from 'js/awTimeoutService';
import occmgmtSplitViewUpdateService from 'js/occmgmtSplitViewUpdateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import cdm from 'soa/kernel/clientDataModel';
import awDataNavigatorService from 'js/awDataNavigatorService';
/**
 * {EventSubscriptionArray} Collection of eventBuss subscriptions to be removed when the controller is
 * destroyed.
 */
var _eventSubDefs = [];

var exports = {};

var getParentNodeIndex = function( vmc, childItr ) {
    if( childItr < 0 ) {
        return;
    }

    var obj = vmc.loadedVMObjects[ childItr ];
    var childLevelNdx = obj.levelNdx;
    var parentNodeIndex = -1;
    while( obj.levelNdx > 0 ) {
        --childItr;
        obj = vmc.loadedVMObjects[ childItr ];
        if( obj.levelNdx === childLevelNdx - 1 ) {
            parentNodeIndex = childItr;
            break;
        }
    }

    return parentNodeIndex;
};

var getNumberOfChildRows = function( loadedVmosList, removalNodeInfo, nodeIndexInLoadedVmosList ) {
    var totalNumberOfRowsIncludingParentRow = 0;
    var currentNodeLevel = removalNodeInfo.levelNdx;

    for( var i = nodeIndexInLoadedVmosList + 1; i < loadedVmosList.length; i++ ) {
        if( loadedVmosList[ i ].levelNdx > currentNodeLevel ) {
            ++totalNumberOfRowsIncludingParentRow;
        } else {
            break;
        }
    }
    return totalNumberOfRowsIncludingParentRow;
};

export let removeChildFromParentChildrenArray = function( parentNode, childNode ) {
    if( parentNode && parentNode.children && parentNode.children.length > 0 ) {
        var ndx = _.findLastIndex( parentNode.children, function( vmo ) {
            return vmo.stableId === childNode.stableId || vmo.uid === childNode.uid;
        } );

        if( ndx > -1 ) {
            parentNode.children.splice( ndx, 1 );
            if( parentNode.children.length === 0 ) {
                parentNode.expanded = false;
                parentNode.isExpanded = false;
                parentNode.isLeaf = true;
                delete parentNode.children;
            }
        }
    }
};

export let addChildToParentsChildrenArray = function( parentNode, childNode, childNodeIndex ) {
    if( parentNode ) {
        if( !parentNode.children || parentNode.children.length === 0 ) {
            parentNode.expanded = true;
            parentNode.isExpanded = true;
            parentNode.children = [];
        }

        childNodeIndex < parentNode.children.length ? parentNode.children.splice( childNodeIndex, 0, childNode ) :
            parentNode.children.push( childNode );
        parentNode.isLeaf = false;
        parentNode.totalChildCount = parentNode.children.length;
    }
};

var removeNodesFromSelectionModel = function( removeNodesFromSelection ) {
    // remove hidden elements + already parent is hidden hence its changed elements are stale
    if( removeNodesFromSelection.length > 0 ) {
        appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.removeFromSelection( removeNodesFromSelection );
        if( appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.getCurrentSelectedCount() < 2 ) {
            appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.setMultiSelectionEnabled( false );
        }
    }
};

var replaceOldUidWithNewUidInSelectionModel = function( oldUid, newUid ) {
    if( appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.getSelection().includes( oldUid ) ) {
        appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.removeFromSelection( oldUid );
        appCtxSvc.ctx.aceActiveContext.context.pwaSelectionModel.addToSelection( newUid );
    }
};

var createSimilarNodeWithUidUpdated = function( oldNode, newElementInfo ) {
    var childVMO = occmgmtVMTNodeCreateService.createVMNodeUsingOccInfo( newElementInfo, oldNode.childNdx, oldNode.levelNdx );
    childVMO.expanded = oldNode.expanded;
    childVMO.isExpanded = oldNode.isExpanded;
    childVMO.isLeaf = oldNode.isLeaf;

    if( oldNode.children ) {
        childVMO.children = [].concat( oldNode.children );
        delete oldNode.children;
    }

    return childVMO;
};

export let getVmcIndexForParentsNthChildIndex = function( vmc, parentNodeIndex, childIndex ) {
    var parentVMO = vmc.getViewModelObject( parentNodeIndex );
    var expectedVmcIndex = parentNodeIndex + 1;
    for( var i = 0; i < childIndex; i++ ) {
        var nextNodeVMO = vmc.getViewModelObject( expectedVmcIndex );
        // is next node vmo is uncle?
        if( nextNodeVMO.levelNdx <= parentVMO.levelNdx ) {
            break;
        }
        // next vmo node is sibling
        var numberOfChildNodes = getNumberOfChildRows( vmc.loadedVMObjects, vmc.getViewModelObject( expectedVmcIndex ), expectedVmcIndex );
        expectedVmcIndex = expectedVmcIndex + numberOfChildNodes + 1;
    }
    return expectedVmcIndex;
};

var moveNodeAlongWithChildrenNodesToNewLocation = function( vmc, currentVmcIndex, nthChildOfParent, parentNodeIndex ) {
    var childVMO = vmc.getViewModelObject( currentVmcIndex );

    // if child node with same uid is present at same location, do nothing
    var expectedVmcIndex = exports.getVmcIndexForParentsNthChildIndex( vmc, parentNodeIndex, nthChildOfParent );
    var presentVMOAtExpectedLocation = vmc.getViewModelObject( expectedVmcIndex );
    if( currentVmcIndex === expectedVmcIndex && childVMO.uid === presentVMOAtExpectedLocation.uid ) {
        return;
    }

    // remove node from its current location
    var numberOfChildNodes = getNumberOfChildRows( vmc.loadedVMObjects, childVMO, currentVmcIndex );
    var removedChilds = vmc.loadedVMObjects.splice( currentVmcIndex, numberOfChildNodes + 1 );

    // after removal of nodes under parent, expecting vmc index may change hence recollect.
    expectedVmcIndex = exports.getVmcIndexForParentsNthChildIndex( vmc, parentNodeIndex, nthChildOfParent );
    for( var i = 0; i < removedChilds.length; i++, expectedVmcIndex++ ) {
        vmc.loadedVMObjects.splice( expectedVmcIndex, 0, removedChilds[ i ] );
    }
};

var getIndexFromArray = function( arr, nodeInfo ) {
    return arr.findIndex( function( co ) {
        return nodeInfo.stableId && co.stableId === nodeInfo.stableId ||
            nodeInfo.occurrenceId && co.uid === nodeInfo.occurrenceId ||
            nodeInfo.uid && co.uid === nodeInfo.uid;
    } );
};

export let isNodePresentInTree = function( nodeInfo ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    return getIndexFromArray( vmc.loadedVMObjects, nodeInfo ) > -1;
};

export let getTreeNode = function( nodeInfo ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    var parentIdx = getIndexFromArray( vmc.loadedVMObjects, nodeInfo );
    var parentNode;
    if( parentIdx > -1 ) {
        parentNode = vmc.getViewModelObject( parentIdx );
    }
    return parentNode;
};

export let removeNode = function( removalNodeInfo, parentInfo, avoidDeselectOfRemovedNode ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    var removalNodeIndex = getIndexFromArray( vmc.loadedVMObjects, removalNodeInfo );
    // if object doesnt exist, return
    if( removalNodeIndex < 0 ) {
        return;
    }

    var removalNode = vmc.getViewModelObject( removalNodeIndex );
    var parentNodeIndex = parentInfo ? getIndexFromArray( vmc.loadedVMObjects, parentInfo ) : getParentNodeIndex( vmc, removalNodeIndex );

    var numberOfChildNodes = getNumberOfChildRows( vmc.loadedVMObjects, removalNode, removalNodeIndex );
    var removedNodes = vmc.loadedVMObjects.splice( removalNodeIndex, numberOfChildNodes + 1 );
    if( _.isUndefined( avoidDeselectOfRemovedNode ) || avoidDeselectOfRemovedNode === false ) {
        removeNodesFromSelectionModel( removedNodes );
    }

    // if removing 0th level node
    if( parentNodeIndex > -1 ) {
        var parentNode = vmc.getViewModelObject( parentNodeIndex );
        exports.removeChildFromParentChildrenArray( parentNode, removalNode );
    }
};

export let updateNodeIfUidChanged = function( updateNodeInfo, parentInfo ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    var updateNodeIndex = getIndexFromArray( vmc.loadedVMObjects, updateNodeInfo );
    if( updateNodeIndex === -1 ) {
        return;
    }

    // return if found no change in uid
    var updateNode = vmc.getViewModelObject( updateNodeIndex );
    if( updateNode.uid === ( updateNodeInfo.uid || updateNodeInfo.occurrenceId ) ) {
        return;
    }

    // get parent index before removing the child
    var parentNodeIndex = parentInfo ? getIndexFromArray( vmc.loadedVMObjects, parentInfo ) :
        getParentNodeIndex( vmc, updateNodeIndex );

    // replace child with new uid node
    var removedNode = vmc.loadedVMObjects.splice( updateNodeIndex, 1 )[ 0 ];
    var childVMO = createSimilarNodeWithUidUpdated( removedNode, updateNodeInfo );
    vmc.loadedVMObjects.splice( updateNodeIndex, 0, childVMO );
    replaceOldUidWithNewUidInSelectionModel( removedNode.uid, updateNodeInfo.occurrenceId );

    // update parent info
    if( parentNodeIndex > -1 ) {
        var parentNode = vmc.getViewModelObject( parentNodeIndex );
        var childIndexInParent = getIndexFromArray( parentNode.children, removedNode );
        parentNode.children.splice( childIndexInParent, 1 );
        parentNode.children.splice( childIndexInParent, 0, childVMO );
    }
};

export let addChildNode = function( childInfoToAdd, nthChildOfParent, parentInfo ) {
    var vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
    var parentNodeIndex = parentInfo ? getIndexFromArray( vmc.loadedVMObjects, parentInfo ) : -1;
    if( parentNodeIndex < 0 ) {
        return;
    }
    var parentNode = vmc.getViewModelObject( parentNodeIndex );

    // if child already present in vmc
    var currentChildNodeIndex = getIndexFromArray( vmc.loadedVMObjects, childInfoToAdd );
    if( currentChildNodeIndex > -1 ) {
        // if uid is also same move it to given location, else update node with new uid
        vmc.getViewModelObject( currentChildNodeIndex ).uid === ( childInfoToAdd.uid || childInfoToAdd.occurrenceId ) ?
            moveNodeAlongWithChildrenNodesToNewLocation( vmc, currentChildNodeIndex, nthChildOfParent, parentNodeIndex ) :
            exports.updateNodeIfUidChanged( childInfoToAdd, parentInfo );
    } else {
        var newChildNode = occmgmtVMTNodeCreateService.createVMNodeUsingOccInfo( childInfoToAdd, nthChildOfParent, parentNode.levelNdx + 1 );
        var expectedVmcIndex = exports.getVmcIndexForParentsNthChildIndex( vmc, parentNodeIndex, nthChildOfParent );
        vmc.loadedVMObjects.splice( expectedVmcIndex, 0, newChildNode );
        //Add the new treeNode to the parentVMO (if one exists) children array
        exports.addChildToParentsChildrenArray( parentNode, newChildNode, nthChildOfParent );
    }
};

/**
 * Update parentVMO state ( mark as expanded=true, isLeaf=false)
 */

/**
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {String} parentUid single new element info to add
 */
function _upateParentNodeState( viewModelCollection, parentUid ) {
    //First find if the parent exists in the viewModelCollection
    var idx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === parentUid;
    } );

    //Now get the exact viewModelTreeNode for the parent Occ in the viewModelCollection
    var parentVMO = viewModelCollection.getViewModelObject( idx );
    if( parentVMO ) {
        //the parent exists in the VMO lets make sure it is now marked as parent and expanded
        parentVMO.expanded = true;
        parentVMO.isExpanded = true;
        parentVMO.isLeaf = false;
        if( !parentVMO.children ) {
            parentVMO.children = [];
        }
    }
}

/**
 * Inserts objects added under selected parent(contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} inputParentElement The input parent element on which addd is initiated.
 * @param {Object} pagedChildOccurrences childOccurrences from addObject() SOA
 * @param {Object} newElements List of new elements to add
 *
 */
function _insertSingleAddedElementIntoViewModelCollectionForSelectedParent( viewModelCollection, inputParentElement, pagedChildOccurrences,
    newElements ) {
    //First find if the parent exists in the viewModelCollection
    var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === inputParentElement.uid;
    } );
    var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
    var pagedChildIdx;
    for( var i = 0; i < newElements.length; i++ ) {
        var newlyAddedChildElementUid = newElements[ i ].uid;
        /**
         * addObject SOA only returns pagedOccInfo objects for one of the unique parent.
         */
        pagedChildIdx = _.findLastIndex( pagedChildOccurrences, function( co ) {
            return co.occurrenceId === newlyAddedChildElementUid;
        } );
        if( pagedChildIdx > -1 ) {
            break;
        }
    }
    if( pagedChildIdx > -1 ) {
        //In a collapsed parent there will be no child occs in the viewModelCollection.  Need to add them
        //back by looping through each of the pagedOccInfo
        _.forEach( pagedChildOccurrences, function( childOccurrence ) {
            if( parentVMO ) {
                var childIdx = _.findLastIndex( parentVMO.children, function( vmo ) {
                    return vmo.uid === childOccurrence.occurrenceId;
                } );
                if( childIdx < 0 ) {
                    _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                        pagedChildOccurrences, parentVMO, parentIdx, -1, childOccurrence );
                }
            } else {
                //Top level case
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                    pagedChildOccurrences, null, parentIdx, -1, childOccurrence );
            }
        } );
    }
}

/**
 * Inserts objects added for reused parent (contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} newElementInfo Single new element info to add
 *
 */
function _insertSingleAddedElementIntoViewModelCollectionForReusedParents( viewModelCollection,
    newElementInfo ) {
    //First find if the parent exists in the viewModelCollection
    var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === newElementInfo.parentElement.uid;
    } );
    var parentVMO = viewModelCollection.getViewModelObject( parentIdx );

    // This map has the information of new element and its position within parent assembly
    var newElements = newElementInfo.newElementToPositionMap[ 0 ];
    var elementPositions = newElementInfo.newElementToPositionMap[ 1 ];

    // We need to create a sorted map which is sorted by their position.
    // This is required so that elements get added at right position.
    var newElementPositions = [];
    for( var i = 0; i < elementPositions.length; i++ ) {
        var newElement = newElementInfo.newElements.filter( function( newElement ) {
            return newElement.occurrenceId === newElements[ i ].uid;
        } );
        newElementPositions.push( {
            element: newElement[ 0 ],
            position: elementPositions[ i ]
        } );
    }
    var orderedElementPositions = _.orderBy( newElementPositions, [ 'position' ], [ 'asc' ] );

    for( i = 0; i < orderedElementPositions.length; i++ ) {
        var newlyAddedChildElement = orderedElementPositions[ i ].element;
        var newlyAddedChildElementPosition = orderedElementPositions[ i ].position;

        // Add new element at the appropriate position
        if( parentVMO ) {
            var childIdx = _.findLastIndex( parentVMO.children, function( vmo ) {
                return vmo.uid === newlyAddedChildElement.uid;
            } );
            // Only create and insert tree nodes for occs that don't already exist the parents child list
            if( childIdx < 0 ) {
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                    null, parentVMO, parentIdx, newlyAddedChildElementPosition, newlyAddedChildElement );
            }
        } else {
            // top level case (no parent)
            _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                null, null, parentIdx, newlyAddedChildElementPosition, newlyAddedChildElement );
        }
    }
}

/**
 * Inserts objects added (contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} pagedChildOccurrences childOccurrences from addObject() SOA
 * @param {Object} parentVMO (null if no parentVMO)
 * @param {Number} parentIdx - index of the parentVMO in the viewModelCollection (-1 if no parentVMO)
 * @param {Number} newChildIdx - index of the newchild in the SOA response (-1 if not found)
 * @param {Object} childOccurrence - child occurrence to add
 */
function _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
    pagedChildOccurrences, parentVMO, parentIdx, newChildIdx, childOccurrence ) {
    //check to see if childOcc already has vmTreeNode in the viewModelCollection
    var ndx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === childOccurrence.occurrenceId;
    } );
    if( ndx > -1 ) {
        // already have a vmTreeNode with the same uid in the viewModelCollection -- nothing to do
        return;
    }

    var childlevelIndex = 0;
    var parentUid = null;
    if( parentVMO ) {
        childlevelIndex = parentVMO.levelNdx + 1;
        parentUid = parentVMO.uid;
    }

    var childUid = childOccurrence.uid;
    if( childUid === undefined ) {
        childUid = childOccurrence.occurrenceId;
    }
    //Find the childIndex in the childOccurences (if we can)
    var childIdx = -1;
    if( newChildIdx > -1 ) {
        childIdx = newChildIdx;
    } else {
        childIdx = _.findLastIndex( pagedChildOccurrences, function( co ) {
            return co.occurrenceId === childUid;
        } );

        //Child uid does not exist in the pagedChildOccs just add the end
        if( childIdx < 0 ) {
            childIdx = pagedChildOccurrences.length - 1;
        }
    }

    //corner case not in pagedChildOccs and has no length it is truly empty
    if( childIdx < 0 ) {
        childIdx = 0;
    }

    //Create the viewModelTreeNode from the child ModelObject, child index and level index
    var pciUid = appCtxSvc.ctx.aceActiveContext.context.productContextInfo.uid;
    var childVMO = occmgmtVMTNodeCreateService.createVMNodeUsingOccInfo( childOccurrence, childIdx, childlevelIndex, pciUid, parentUid );

    //See if we have any expanded children to skip over in the viewModelCollection
    var numFirstLevelChildren = 0;
    for( var i = parentIdx + 1; i < viewModelCollection.loadedVMObjects.length; i++ ) {
        if( numFirstLevelChildren === childIdx && viewModelCollection.loadedVMObjects[ i ].levelNdx <= childlevelIndex ) {
            break;
        }
        if( viewModelCollection.loadedVMObjects[ i ].levelNdx === childlevelIndex ) {
            numFirstLevelChildren++;
        }
        if( viewModelCollection.loadedVMObjects[ i ].levelNdx < childlevelIndex ) {
            // no longer looking at first level children (now looking at an uncle)
            break;
        }
    }
    var newIndex = i;

    //Add the new treeNode to the parentVMO (if one exists) children array
    if( parentVMO && parentVMO.children ) {
        parentVMO.children.push( childVMO );
        parentVMO.isLeaf = false;
        parentVMO.totalChildCount = parentVMO.children.length;
        // insert the new treeNode in the viewModelCollection at the correct location
        viewModelCollection.loadedVMObjects.splice( newIndex, 0, childVMO );
    }
}

var updateParentsChildrenListWithNewChildNode = function( vmc, parentUid, childIndexToAdd, childNodeToAdd ) {
    // get parent to updates its children
    var parentVmoIndex = vmc.findViewModelObjectById( parentUid );
    if( parentVmoIndex > -1 ) {
        var parentVMO = vmc.getViewModelObject( parentVmoIndex );
        parentVMO.children.splice( childIndexToAdd, 1, childNodeToAdd );
    }
};

var replaceSourceNodeWithTargetNode = function( viewKey, eventData ) {
    var vmc = _.get( appCtxSvc.ctx, viewKey + '.vmc' );
    var objectReplaced = false;
    if( eventData.srcUids && eventData.srcUids.length > 0 ) {
        for( var i = 0; i < eventData.srcUids.length; i++ ) {
            var target = eventData.targetUids ? eventData.targetUids[ i ] : eventData.srcUids[ i ];
            var srcIndex = vmc.findViewModelObjectById( eventData.srcUids[ i ] );
            if( srcIndex > -1 ) {
                var srcNode = vmc.getViewModelObject( srcIndex );
                var numberOfChildRows = getNumberOfChildRows( vmc.loadedVMObjects, srcNode, srcIndex );
                var targetMO = cdmSvc.getObject( target );
                var targetNode = occmgmtVMTNodeCreateService.createVMNodeUsingModelObjectInfo( targetMO, srcNode.childNdx, srcNode.levelNdx );
                //LCS-436500 (manually constructed vmo misses out on selected=true prop)
                if( srcNode.selected ) {
                    targetNode.selected = true;
                }
                updateParentsChildrenListWithNewChildNode( vmc, srcNode.props.awb0Parent.dbValues[ 0 ], srcNode.childNdx, targetNode );
                vmc.loadedVMObjects.splice( srcIndex, 1 + numberOfChildRows );
                vmc.loadedVMObjects.splice( srcIndex, 0, targetNode );

                objectReplaced = true;
            }
        }
    }

    return objectReplaced;
};

var replaceInInactiveView = function( viewKey, eventData ) {
    var affectedElements = occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( viewKey, cdmSvc.getObject( eventData.srcUids[ 0 ] ) );

    var objectsReplaced = replaceSourceNodeWithTargetNode( viewKey, eventData );

    //if objects are replaced in inactive view, means we got updated objects for other view from server. So, reload is not needed.
    if( affectedElements.length > 0 && !objectsReplaced ) {
        for( var i = 0; i < affectedElements.length; i++ ) {
            var affectedObjects = eventData.srcUids.filter( function( mo ) {
                return mo === affectedElements[ i ].id;
            } );
            if( affectedObjects.length === 0 ) {
                _.set( appCtxSvc.ctx, viewKey + '.configContext.startFreshNavigation', true );
                eventBus.publish( 'acePwa.reset', { viewToReset: viewKey, silentReload: true } );
                break;
            }
        }
    }
};

var removeAndDeselectGivenNodeFromVMCollectionIfApplicable = function( vmc, removedObject, view ) {
    _.remove( vmc.loadedVMObjects, function( vmo ) {
        if( vmo.props && removedObject.props &&
            vmo.props.awb0CopyStableId.dbValues[ 0 ] === removedObject.props.awb0CopyStableId.dbValues[ 0 ] ) {
            var parentOfVMO = cdmSvc.getObject( vmo.props.awb0Parent.dbValues[ 0 ] );
            var parentOfDeletedElement = cdmSvc.getObject( removedObject.props.awb0Parent.dbValues[ 0 ] );
            if( parentOfDeletedElement && parentOfVMO.props && parentOfDeletedElement.props &&
                parentOfVMO.props.awb0UnderlyingObject.dbValues[ 0 ] === parentOfDeletedElement.props.awb0UnderlyingObject.dbValues[ 0 ] ) {
                var parentNode = vmc.getViewModelObject( vmc.findViewModelObjectById( vmo.props.awb0Parent.dbValues[ 0 ] ) );
                var childrenNode = vmc.getViewModelObject( vmc.findViewModelObjectById( vmo.uid ) );
                exports.removeChildFromParentChildrenArray( parentNode, childrenNode );
                eventBus.publish( 'aceElementsDeSelectedEvent', {
                    elementsToDeselect: vmo,
                    viewToReact: view,
                    silentSelection: true
                } );
                return true;
            }
        }
    } );
};

var areUnderlyingOrStableIdSame = function( modelObject1, modelObject2 ) {
    var underlyingObjectOfAffectedElement = _.get( modelObject1, 'props.awb0UnderlyingObject.dbValues[0]' );
    var cloneStableIDOfAffectedElement = _.get( modelObject1, 'props.awb0CopyStableId.dbValues[0]' );
    var cloneStableIDOfVMO = _.get( modelObject2, 'props.awb0CopyStableId.dbValues[0]' );
    var underlyingObjectOfVMO = _.get( modelObject2, 'props.awb0UnderlyingObject.dbValues[0]' );
    return !_.isEmpty( cloneStableIDOfVMO ) && !_.isEmpty( cloneStableIDOfAffectedElement ) &&
        _.isEqual( cloneStableIDOfVMO, cloneStableIDOfAffectedElement ) ||
        !_.isEmpty( underlyingObjectOfVMO ) && !_.isEmpty( underlyingObjectOfAffectedElement ) &&
        _.isEqual( underlyingObjectOfVMO, underlyingObjectOfAffectedElement );
};

var deleteExpandedNodeCache = function( viewKey, data ) {
    var vmc = _.get( appCtxSvc.ctx, viewKey + '.vmc' );
    if( vmc ) {
        let updatedHierarchy = [];
        data.updatedObjects.map( function( updatedObject ) {
            updatedHierarchy.push( updatedObject );
            let parentObjectUid = occmgmtUtils.getParentUid( updatedObject );
            while( parentObjectUid ) {
                let parentObject = cdmSvc.getObject( parentObjectUid );
                if( parentObject ) {
                    updatedHierarchy.push( parentObject );
                    parentObjectUid = occmgmtUtils.getParentUid( parentObject );
                }
            }
        } );

        vmc.loadedVMObjects.map( function( vmoNode ) {
            if( vmoNode.__expandState ) {
                updatedHierarchy.map( function( updatedObject ) {
                    if( areUnderlyingOrStableIdSame( vmoNode, updatedObject ) ) {
                        delete vmoNode.__expandState;
                        delete vmoNode.children;
                    }
                } );
            }
            if( vmoNode.isExpanded === true && vmoNode.props &&  vmoNode.props.awb0NumberOfChildren && vmoNode.props.awb0NumberOfChildren.dbValues[0] === '0' && !vmoNode.children ) {
                eventBus.publish( vmc.name + '.addNodeToCollapsedState', vmoNode );
            }
        } );
    }
};

export let initialize = function() {
    _eventSubDefs.push( eventBus.subscribe( 'ace.replaceRowsInTree', function( eventData ) {
        replaceSourceNodeWithTargetNode( appCtxSvc.ctx.aceActiveContext.key, eventData );
        var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
        if( inactiveView ) {
            replaceInInactiveView( inactiveView, eventData );
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'cdm.updated', function( data ) {
        deleteExpandedNodeCache( appCtxSvc.ctx.aceActiveContext.key, data );
        var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
        if( inactiveView ) {
            deleteExpandedNodeCache( inactiveView, data );
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'ace.elementsRemoved', function( eventData ) {
        var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();

        if( inactiveView ) {
            var vmc = appCtxSvc.ctx[ inactiveView ].vmc;
            if( !occmgmtSplitViewUpdateService.isConfigSameInBothViews() ) {
                if( eventData && eventData.removedObjects.length > 0 ) {
                    _.forEach( eventData.removedObjects, function( removedObject ) {
                        removeAndDeselectGivenNodeFromVMCollectionIfApplicable( vmc, removedObject, inactiveView );
                    } );
                    //removeAndDeselectGivenNodeFromVMCollectionIfApplicable has a condition to check if removedObject exist in the vmc.
                    //Since removedObject is in somecases already removed from vmc, thus aceElementsDeSelectedEvent event is not publish for inactiveview.
                    //deSelectFromInactiveView will publish aceElementsDeSelectedEvent if removedObject was selected in inactive view.
                    exports.deSelectFromInactiveView( eventData.removedObjects, inactiveView );
                    vmc.totalObjectsLoaded = vmc.loadedVMObjects.length;
                }
            } else {
                if( eventData && eventData.removedObjects.length > 0 ) {
                    eventBus.publish( 'aceElementsDeSelectedEvent', {
                        elementsToDeselect: eventData.removedObjects,
                        viewToReact: inactiveView,
                        silentSelection: true
                    } );
                }
            }
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'addElement.elementsAdded', function( event ) {
        var updatedParentElement = event.updatedParentElement;
        if( !updatedParentElement ) {
            updatedParentElement = event.addElementInput && event.addElementInput.parent ? event.addElementInput.parent : appCtxSvc.ctx.aceActiveContext.context.addElement.parent;
        }
        addNewlyAddedElement( appCtxSvc.ctx.aceActiveContext.key, event.addElementResponse, updatedParentElement );
        var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
        if( inactiveView ) {
            addNewlyAddedElementToInActiveview( inactiveView, event, updatedParentElement );
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'occurrenceUpdatedByEffectivityEvent', function( data ) {
        if( !occmgmtSplitViewUpdateService.isConfigSameInBothViews() ) {
            var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
            if( inactiveView && occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( inactiveView, appCtxSvc.ctx.selected ).length > 0 ) {
                eventBus.publish( 'acePwa.reset', { viewToReset: inactiveView, silentReload: true } );
            }
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'replaceElement.elementReplacedSuccessfully',
        function( event ) {
            var viewToReact = event && event.viewToReact ? event.viewToReact : appCtxSvc.ctx.aceActiveContext.key;
            //Try to pull all objects in selection model from cdm instead of just the objects in current data provider
            var actualSelections = appCtxSvc.ctx[ viewToReact ].pwaSelectionModel.getSelection().map(
                    function( uid ) {
                        return cdm.getObject( uid );
                    } )
                //Ignore selected model objects that have been unloaded
                .filter( function( mo ) {
                    return mo;
                } );

            let isReplacedElementConfigured = actualSelections.length > 0;
            if( !isReplacedElementConfigured ) {
                return;
            }

            var lastSelection = actualSelections[ actualSelections.length - 1 ];

            //lastSelection could be ViewModelObject or ViewModelTreeNode. BreadCrumb needs IModelObject and its properties.
            var lastSelectedObject = cdm.getObject( lastSelection.uid );

            eventBus.publish( appCtxSvc.ctx[ viewToReact ].breadcrumbConfig.vm + '.refresh', {
                id: appCtxSvc.ctx[ viewToReact ].breadcrumbConfig.id,
                lastSelectedObject: lastSelectedObject
            } );

            var productInfo = awDataNavigatorService.getProductInfoForCurrentSelection( lastSelectedObject, viewToReact );
            awDataNavigatorService.syncRootElementInfoForProvidedSelection( productInfo, viewToReact );
        } ) );

    var addElementsIntoViewModelCollection = function( vmCollection, addElementResponse ) {
        if( addElementResponse.newElementInfos ) {
            for( var i = 0; i < addElementResponse.newElementInfos.length; ++i ) {
                if ( !_.isEmpty( addElementResponse.newElementInfos[ i ].newElementToPositionMap ) ) {
                    var parentIdx = _.findLastIndex( vmCollection.loadedVMObjects, function( vmo ) {
                        return vmo.uid === addElementResponse.newElementInfos[ i ].parentElement.uid;
                    } );
                    if( parentIdx >= 0 ) {
                        var parentVMO = vmCollection.getViewModelObject( parentIdx );
                        // Add the children for expanded parent instances only. If collapsed dont add.
                        if( parentVMO && parentVMO.isExpanded ) {
                            _upateParentNodeState( vmCollection, addElementResponse.newElementInfos[ i ].parentElement.uid );
                            _insertSingleAddedElementIntoViewModelCollectionForReusedParents( vmCollection, addElementResponse.newElementInfos[ i ] );
                        }
                    }
                }
            }
        }
    };

    var expandParentAndReloadGivenView = function( parentElement, view ) {
        if( !parentElement.isExpanded ) {
            eventBus.publish( appCtxSvc.ctx[ view ].vmc.name + '.addNodeToExpansionState', {
                nodeToExpand: parentElement
            } );
        }

        appCtxSvc.ctx[ view ].retainTreeExpansionStateInJitterFreeWay = true;
        appCtxSvc.ctx[ view ].retainTreeExpansionStates = true;

        eventBus.publish( 'acePwa.reset', {
            viewToReset: view,
            silentReload: true
        } );
    };

    var addNewlyAddedElementToInActiveview = function( view, eventData, updatedParentElement ) {
        var parentElement = null;
        if( occmgmtSplitViewUpdateService.isConfigSameInBothViews() ) {
            parentElement = updatedParentElement;
            addNewlyAddedElement( view, eventData.addElementResponse, updatedParentElement );
        } else if( eventData.addElementResponse.newElementInfos && eventData.addElementResponse.newElementInfos.length > 0 ) {
            var isAddNodesWithoutReloadApplicable = true;
            var updatedParents = _.get( eventData.addElementResponse, 'ServiceData.updated' );
            for( var index = 0; index < updatedParents.length; index++ ) {
                parentElement = occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( view, cdmSvc.getObject( updatedParents[ index ] ) )[ 0 ];
                if( parentElement ) {
                    var affectedParent = eventData.addElementResponse.newElementInfos.filter( function( mo ) {
                        return mo.parentElement.uid === parentElement.uid;
                    } );
                    if( affectedParent.length === 0 ) {
                        expandParentAndReloadGivenView( parentElement, view );
                        isAddNodesWithoutReloadApplicable = false;
                        break;
                    }
                }
            }
            if( isAddNodesWithoutReloadApplicable ) {
                var vmCollection = _.get( appCtxSvc.ctx, view + '.vmc' );
                addElementsIntoViewModelCollection( vmCollection, eventData.addElementResponse );
            }
        }
        if( parentElement && _.get( eventData, 'addElementInput.addObjectIntent' ) === 'DragAndDropIntent' ) {
            eventBus.publish( 'aceElementsSelectedEvent', {
                elementsToSelect: parentElement,
                viewToReact: view,
                silentSelection: true
            } );
        }
    };

    var addNewlyAddedElement = function( view, addElementResponse, updatedParentElement ) {
        var context = _.get( appCtxSvc.ctx, view );
        var vmCollection = context.vmc;
        if( addElementResponse && vmCollection ) {
            var isReloadNeeded = addElementResponse.reloadContent;
            if( isReloadNeeded ) {
                // In case we are adding content and the reloadContent is required,
                // then make sure to set the startFreshNavigation as true. This is required by the server.
                context.transientRequestPref.startFreshNavigation = true;

                var newlyAddedChildElementUid;
                if( addElementResponse.selectedNewElementInfo.newElements ) {
                    newlyAddedChildElementUid = addElementResponse.selectedNewElementInfo.newElements[ 0 ].uid;
                } else {
                    newlyAddedChildElementUid = addElementResponse.newElementInfos[ 0 ].newElements[ 0 ].occurrenceId;
                }
                AwTimeoutService.instance( function() {
                    contextStateMgmtService.updateContextState( view, {
                        c_uid: newlyAddedChildElementUid
                    }, true );
                    // In-case of multi-select we are reloading content, as dataProvider does not support focus action for multi-select.
                    if( addElementResponse.selectedNewElementInfo.newElements && addElementResponse.selectedNewElementInfo.newElements.length > 1 ) {
                        eventBus.publish( 'acePwa.reset', {
                            viewToReset: appCtxSvc.ctx.aceActiveContext.key
                        } );
                    }
                }, 300 );
            } else {
                // First add the children for selected parent node.
                _upateParentNodeState( vmCollection, updatedParentElement.uid );
                var pagedChildOccurrences = addElementResponse.selectedNewElementInfo.pagedOccurrencesInfo.childOccurrences;
                if ( pagedChildOccurrences.length > 0 ) {
                    _insertSingleAddedElementIntoViewModelCollectionForSelectedParent( vmCollection, updatedParentElement, pagedChildOccurrences, addElementResponse.selectedNewElementInfo.newElements );
                }

                if( !_.isEmpty( addElementResponse.newElementInfos ) ) {
                    addElementsIntoViewModelCollection( vmCollection, addElementResponse );
                }
            }
        }
    };
};

export let deSelectFromInactiveView = function( removedObjects, inactiveView ) {
    var inactiveContext = appCtxSvc.getCtx( inactiveView );
    var selectedModelObjects = inactiveContext.selectedModelObjects;
    _.forEach( removedObjects, function( removedObject ) {
        var index = _.findLastIndex( selectedModelObjects, function( selected ) {
            if( removedObject.hasOwnProperty( 'props' ) && selected.hasOwnProperty( 'props' ) ) {
                return removedObject.props.awb0CopyStableId.dbValues[ 0 ] === selected.props.awb0CopyStableId.dbValues[
                    0 ]; //check if removedElement was there in the selectedModelObjects list
            }
        } );
        if( index >= 0 ) {
            eventBus.publish( 'aceElementsDeSelectedEvent', {
                elementsToDeselect: [ selectedModelObjects[ index ] ],
                viewToReact: inactiveView,
                silentSelection: true
            } );
        }
    } );
};

export let destroy = function() {
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
};

//eslint-disable-next-line valid-jsdoc
/**
 * Toggle Index Configuration service utility
 */

export default exports = {
    removeChildFromParentChildrenArray,
    addChildToParentsChildrenArray,
    getVmcIndexForParentsNthChildIndex,
    isNodePresentInTree,
    getTreeNode,
    removeNode,
    updateNodeIfUidChanged,
    addChildNode,
    initialize,
    deSelectFromInactiveView,
    destroy
};
app.factory( 'occmgmtStructureEditService', () => exports );
