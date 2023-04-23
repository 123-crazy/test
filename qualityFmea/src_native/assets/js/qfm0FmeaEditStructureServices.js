// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This file is used as services file for FMEA structure edit for quality Fmea module
 *
 * @module js/qfm0FmeaEditStructureServices
 */
import eventBus from 'js/eventBus';
import assert from 'assert';
import _ from 'lodash';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import fmeaTreeTableService from 'js/fmeaTreeTableService';
import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
import soaSvc from 'soa/kernel/soaService';
import parsingUtils from 'js/parsingUtils';
import localeSvc from 'js/localeService';

import cdm from 'soa/kernel/clientDataModel';
import 'soa/kernel/clientMetaModel';
import 'js/messagingService';

import 'js/commandPanel.service';
import 'soa/dataManagementService';

const _qfm0FMEANode = 'Qfm0FMEANode';
const _qfm0FailureElement = 'Qfm0FailureElement';
const _qfm0FunctionElement = 'Qfm0FunctionElement';
const _qfm0SystemElement = 'Qfm0SystemElement';
const _qam0QualityAction = 'Qam0QualityAction';
const _pseudoFolderType = 'PseudoFolder';

var _fmeaRootNodeUid;
var fmeaMsgResource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
var localTextBundle = localeSvc.getLoadedText( fmeaMsgResource );
var externalFunctionText = localTextBundle.qfm0ExternalFunctionNodeName;
var externalFailureText = localTextBundle.qfm0ExternalFailureNodeName;

var exports = {};

function _updateParentTreeNode( parentTreeNode, deletedNode ) {
    if ( !parentTreeNode.children || parentTreeNode.children && parentTreeNode.children.length === 0 ) {
        return parentTreeNode;
    }
    var index = parentTreeNode.children.findIndex( function( child ) {
        return child.uid === deletedNode;
    } );
    if( index > -1 ) {
        parentTreeNode.children.splice( index, 1 );
    }
    return parentTreeNode;
}

export let updateFmeaTreeOnDelete = function( ctx, data ) {
    var deferred = AwPromiseService.instance.defer();
    var vmCollection = appCtxService.ctx.treeVMO.viewModelCollection;
    var areDeletedObjectsActions = false;
    var showActionsInFmeaTree = _getPreferenceValueForShowingActions();
    var objForSelection = _getObjectForSelectionAfterDeletion( ctx, data );

    for ( var i = 0; i < data.deletedFmeaObjects.length; i++ ) {
        let isParentFailureCause = false;
        var dltdIndx = _.findLastIndex( ctx.mselected, function( vmo ) {
            return vmo.uid === data.deletedFmeaObjects[i];
        } );
        if ( dltdIndx > -1 ) {
            let deletedObject = ctx.mselected[dltdIndx];
            let parentElementUid;
            if( deletedObject && deletedObject.props && deletedObject.props.qfm0ParentElement && deletedObject.props.qfm0ParentElement.dbValues ) {
                parentElementUid = deletedObject.props.qfm0ParentElement.dbValues[0];
            } else if( deletedObject && deletedObject.modelType && deletedObject.modelType.typeHierarchyArray.indexOf( _qam0QualityAction ) > -1 ) {
                // If deleted object is an Action or Action Group then find its parent element
                areDeletedObjectsActions = true;
                if( showActionsInFmeaTree ) {
                    let fmeaContext = appCtxService.getCtx( 'fmeaContext' );
                    let failureCauseUid = fmeaContext && fmeaContext.selectedUidsCauseFailure && fmeaContext.selectedUidsCauseFailure.length > 0 ? fmeaContext.selectedUidsCauseFailure[0] : '';
                    if( deletedObject.props.qam0QualityActionSubtype && deletedObject.props.qam0QualityActionSubtype.dbValues && deletedObject.props.qam0QualityActionSubtype.dbValues.length > 0 ) {
                        if( deletedObject.props.qam0QualityActionSubtype.dbValues[0] === 'Action Group' ) {
                            // If deleted current object is Action Group
                            parentElementUid = failureCauseUid;
                            isParentFailureCause = true;
                        } else {
                            // If deleted current object is a Dependent Action
                            parentElementUid = _findParentNodeForDeletedDependentAction( vmCollection, failureCauseUid, deletedObject );
                        }
                    }
                }
            }
            if( parentElementUid && !( objForSelection && ctx.locationContext.modelObject.uid === objForSelection.uid ) ) {
                let parentElement = cdm.getObject( parentElementUid );
                let parentUid;                
                parentUid = parentElementUid;

                var parentIdx = _.findLastIndex( vmCollection.loadedVMObjects, function( vmo ) {
                    return vmo.uid === parentUid;
                } );

                var parentVMO;
                if ( parentIdx > -1 ) {
                    parentVMO = vmCollection.getViewModelObject( parentIdx );

                    //Remove deleted child from Parent Node's children
                    parentVMO = _updateParentTreeNode( parentVMO, data.deletedFmeaObjects[i] );
                    if ( parentVMO ) {
                        _updateParentNodeStateOnDelete( parentVMO ).then( function( result ) {
                            let parentVMO = result.parentVMO;
                            if ( parentVMO.totalChildCount < 1 ) {                                
                                vmCollection = _createParentNodeHavingNoChild( parentVMO, vmCollection );
                            }
                            deferred.resolve();
                        } );
                    }
                }
            }
        }
    }

    if( !areDeletedObjectsActions && ( ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_ProcessFlowChart' && ctx.xrtPageContext.primaryXrtPageID !== 'tc_xrt_ProcessFlowChart' ) ) {
        if( objForSelection && ctx.locationContext.modelObject.uid === objForSelection.uid ) {
            vmCollection.loadedVMObjects = [];
            eventBus.publish( 'fmeaTree.plTable.reload' );
        } else{
            var eventData = {
                objForSelection: objForSelection
            };
            eventBus.publish( 'updateParentStateOnDelete', eventData );
            return deferred.promise;
        }
    }
};

/**
 * Get object for setting selection after deletion
 * @param {Object} ctx
 * @param {Object} data
 * @returns objForSelection
 */
function _getObjectForSelectionAfterDeletion( ctx, data ) {
    _fmeaRootNodeUid = qfm0FmeaManagerUtils.getFmeaRootNodeUid();
    var rootNode = cdm.getObject( _fmeaRootNodeUid );
    var objForSelection;
    if ( ctx.pselected ) {
        var pindex = _.findLastIndex( data.deletedFmeaObjects, function( deletedObject ) {
            return deletedObject === ctx.pselected.uid;
        } );
        if ( pindex > -1 ) {
            // When deletion is done from Net View and the element for which Net View is open, also gets deleted
            if ( appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 ) {
                if ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_StructureAnalysis'
                    || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Function_Analysis' && appCtxService.ctx.showFunctionNetView
                    || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Failure_Analysis' && appCtxService.ctx.showFailureNetView ) {
                    objForSelection = rootNode;
                }
            } else {
                objForSelection = ctx.locationContext.modelObject;
            }
        } else {
            objForSelection = ctx.pselected;
        }
    } else{
        objForSelection = rootNode;
    }
    return objForSelection;
}

/**
 * Create tree node for parent object which has no children
 * @param {Object} parentVMO
 * @param {Object} vmCollection
 * @returns {Object} vmCollection
 */
function _createParentNodeHavingNoChild( parentVMO, vmCollection ) {
    let newParentVMO = fmeaTreeTableService.createVmNodeUsingNewObjectInfo( parentVMO, parentVMO.levelNdx, parentVMO.childNdx, true );
    let index = vmCollection.loadedVMObjects.findIndex( function( treeNode ) {
        return treeNode.uid === parentVMO.uid;
    } );
    newParentVMO.isLeaf = true;
    newParentVMO.isExpanded = false;
    newParentVMO.expanded = false;
    vmCollection.loadedVMObjects.splice( index, 1, newParentVMO );
    return vmCollection;
}

/**
 * Find parent action group tree node for the deleted dependent quality action
 * @param {Object} vmCollection
 * @param {String} failureCauseUid
 * @param {Object} deletedObject
 * @returns {String} parentElementUid
 */
function _findParentNodeForDeletedDependentAction( vmCollection, failureCauseUid, deletedObject ) {
    let parentElementUid;
    let failureCauseIndexInTree = vmCollection.loadedVMObjects.findIndex( function( treeNode ) {
        return treeNode.uid === failureCauseUid;
    } );
    if ( failureCauseIndexInTree > -1 ) {
        let failureCauseTreeNode = vmCollection.loadedVMObjects[failureCauseIndexInTree];
        if( failureCauseTreeNode.children && failureCauseTreeNode.children.length > 0 ) {
            for ( let childIndex = 0; childIndex < failureCauseTreeNode.children.length; childIndex++ ) {
                let actionGroupObject = vmCollection.loadedVMObjects.find( ( node ) => {
                    if ( failureCauseTreeNode.children[childIndex] ) {
                        return node.uid === failureCauseTreeNode.children[childIndex].uid;
                    }
                } );
                if( actionGroupObject && actionGroupObject.props && actionGroupObject.props.qam0DependentQualityActions && actionGroupObject.props.qam0DependentQualityActions.dbValues
                    && actionGroupObject.props.qam0DependentQualityActions.dbValues.length > 0 ) {
                    let deletedDependentActionIndex = actionGroupObject.props.qam0DependentQualityActions.dbValues.indexOf( deletedObject.uid );
                    if( deletedDependentActionIndex > -1 ) {
                        parentElementUid = actionGroupObject.uid;
                        break;
                    }
                }
            }
        }
    }
    return parentElementUid;
}

/**
 * Add newly added element to the tree and update the selection to this node.
 *@param {ModelObject} addElementInput Created object response from SOA
 */
export let addNewElement = function( addElementInput ) {
    if ( appCtxService.ctx.treeVMO.viewModelCollection.loadedVMObjects.length === 0 && appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_FormSheet' ) {
        eventBus.publish( 'primaryWorkarea.reset' );
    } else {
        if ( addElementInput.length > 0 ) {
            _wrapper_insertElementIntoParent( addElementInput )
                .then(
                    function() {
                        var ctxSearch = appCtxService.getCtx( 'search' );
                        ctxSearch.totalFound = addElementInput.length + appCtxService.ctx.treeVMO.viewModelCollection.loadedVMObjects.length;
                        var eventData = {
                            objectsToSelect: [ addElementInput ]
                        };
                        eventBus.publish( 'qfm0ElementSelectionUpdateEvent', eventData );
                    }
                );
        }
    }
};

export let _wrapper_insertElementIntoParent = function( addElementInput ) {
    var deferred = AwPromiseService.instance.defer();
    for ( var i = 0; i < addElementInput.length; i++ ) {
        var parentElementUid;
        if( addElementInput[i].objects[0].modelType.typeHierarchyArray.indexOf( _qam0QualityAction ) > -1 ) {
            parentElementUid = appCtxService.getCtx( 'mselected' ) && appCtxService.getCtx( 'mselected' )[0] ? appCtxService.getCtx( 'mselected' )[0].uid : '';
        } else {
            parentElementUid = addElementInput[i].objects[0] && addElementInput[i].objects[0].props.qfm0ParentElement ? addElementInput[i].objects[0].props.qfm0ParentElement.dbValues[0] : null;
        }
        var parentElement = cdm.getObject( parentElementUid );
        var updatedParentElementUid;

        var externalElementType;
        let externalNodeObj;
        if(addElementInput[i].objects[0].modelType.typeHierarchyArray.indexOf( _qfm0FunctionElement ) > -1){
            externalElementType=  _qfm0FunctionElement;
        }else if(addElementInput[i].objects[0].modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1){
            externalElementType =  _qfm0FailureElement;
        }
        if( (parentElement.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1) && externalElementType!== undefined){
        
        var viewModelCollection = appCtxService.ctx.treeVMO.viewModelCollection;
            for ( let childIndex = 0; childIndex < viewModelCollection.loadedVMObjects.length; childIndex++ ) {
                var viewModelObj = viewModelCollection.loadedVMObjects[childIndex];
                if(viewModelObj.type=== _pseudoFolderType && viewModelObj.displayName === externalFunctionText && 
                    (addElementInput[i].objects[0].modelType.typeHierarchyArray.indexOf( _qfm0FunctionElement ) > -1) ) {
                    externalNodeObj = viewModelObj;
                    break;
                }else if(viewModelObj.type=== _pseudoFolderType && viewModelObj.displayName === externalFailureText && 
                    (addElementInput[i].objects[0].modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1)){
                    externalNodeObj = viewModelObj;
                    break;
                }else if(childIndex === (viewModelCollection.loadedVMObjects.length-1) ){
                    var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
                        return vmo.uid === parentElementUid;
                    } );
                    _updateParentNodeState( viewModelCollection, parentElementUid, parentIdx, true, externalElementType ).then( function() {                        
                        deferred.resolve();
                    } );
                    break;
            }
    
        }
        if(externalNodeObj){
            if(externalNodeObj.isExpanded){
                updatedParentElementUid = externalNodeObj.uid;
                _insertAddedElementIntoVMOForSelectedParent( appCtxService.ctx.treeVMO.viewModelCollection, updatedParentElementUid, addElementInput[i].objects[0] )
                .then(
                    function() {
                        deferred.resolve();
                    }
                );
                }
            }
        }else{
            updatedParentElementUid = parentElementUid;
            _insertAddedElementIntoVMOForSelectedParent( appCtxService.ctx.treeVMO.viewModelCollection, updatedParentElementUid, addElementInput[i].objects[0] )
            .then(
                function() {
                    deferred.resolve();
                }

            );
        }            
    }
    return deferred.promise;
};

/**
 * Get updated object from response
 *  @param {ModelObject} updateElementResponse modelObjects in ServiceData
 * @param {ViewModelObject} updatedElementUid uid of the element that is updated
 */
export let getObjectToSelect = function( updateElementResponse, updatedElementUid ) {
    return updateElementResponse.ServiceData.modelObjects[updatedElementUid];
};

/**
 * Inserts objects added under selected parent(contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} inputParentElement The input parent element on which addd is initiated.
 * @param {Object} newElement new element to add
 *
 */
function _insertAddedElementIntoVMOForSelectedParent( viewModelCollection, inputParentElement,
    newElement ) {
    var deferred = AwPromiseService.instance.defer();
    //First find if the parent exists in the viewModelCollection
    var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === inputParentElement;
    } );

    if ( parentIdx > -1 ) {
        var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
        // First add the children for selected parent node.
        _updateParentNodeState( viewModelCollection, parentVMO.uid, parentIdx, false ).then( function() {
            if ( parentVMO ) {
                var childIdx = _.findLastIndex( parentVMO.children, function( vmo ) {
                    return vmo.uid === newElement.uid;
                } );
                if ( childIdx < 0 ) {
                    _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                        parentVMO, parentIdx, -1, newElement );
                }
            } else {
                //Top level case
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                    null, parentIdx, -1, newElement );
            }
            deferred.resolve();
        }, function() {
            if ( parentVMO ) {
                var childIdx = _.findLastIndex( parentVMO.children, function( vmo ) {
                    return vmo.uid === newElement.uid;
                } );
                if ( childIdx < 0 ) {
                    _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                        parentVMO, parentIdx, -1, newElement );
                }
            } else {
                //Top level case
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                    null, parentIdx, -1, newElement );
            }
            deferred.resolve();
        } );
    } else {
        let parentObj = cdm.getObject( inputParentElement );

        if ( parentObj && parentObj.modelType && parentObj.modelType.typeHierarchyArray.indexOf( 'Qfm0FMEANode' ) > -1 ) {
            var numFirstLevelChildren = 0;
                if ( viewModelCollection.loadedVMObjects.length > 0 ) {
                    for ( var i = parentIdx + 1; i < viewModelCollection.loadedVMObjects.length; i++ ) {
                        if ( viewModelCollection.loadedVMObjects[i].levelNdx === 0 ) {
                            numFirstLevelChildren++;
                        }
                    }
                }
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                    null, parentIdx, numFirstLevelChildren + 1, newElement );                
        }
        deferred.resolve();
    }
    return deferred.promise;
}

/**
 * Inserts objects added (contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} parentVMO (null if no parentVMO)
 * @param {Number} parentIdx - index of the parentVMO in the viewModelCollection (-1 if no parentVMO)
 * @param {Number} newChildIdx - index of the newchild in the SOA response (-1 if not found)
 * @param {Object} childOccurrence - child occurrence to add
 */
function _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
    parentVMO, parentIdx, newChildIdx, childOccurrence ) {
    //check to see if childOcc already has vmTreeNode in the viewModelCollection
    var ndx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === childOccurrence.uid;
    } );
    if ( ndx > -1 ) {
        // already have a vmTreeNode with the same uid in the viewModelCollection -- nothing to do
        return;
    }

    var childlevelIndex = 0;
    if ( parentVMO ) {
        childlevelIndex = parentVMO.levelNdx + 1;
    }

    //Find the childIndex in the childOccurences (if we can)
    var childIdx = -1;
    if ( newChildIdx > -1 ) {
        childIdx = newChildIdx;
    } else {
        childIdx = parentVMO && parentVMO.children ? parentVMO.children.length + 1 : 1;
    }

    //corner case not in pagedChildOccs and has no length it is truly empty
    if ( childIdx < 0 ) {
        childIdx = 0;
    }

    //Create the viewModelTreeNode from the child ModelObject, child index and level index
    var childVMO = fmeaTreeTableService.createVmNodeUsingNewObjectInfo( childOccurrence, childlevelIndex, childIdx, true );
    if( childVMO.type === _pseudoFolderType){
        childVMO.expanded = false;
        childVMO.isExpanded = false;
    }

    //Add the new treeNode to the parentVMO (if one exists) children array
    if ( parentVMO && parentVMO.children ) {
        parentVMO.children.push( childVMO );
        parentVMO.isLeaf = false;
        parentVMO.totalChildCount = parentVMO.children.length;
    }

    //See if we have any expanded children to skip over in the viewModelCollection
    var numFirstLevelChildren = 0;
    for ( var i = parentIdx + 1; i < viewModelCollection.loadedVMObjects.length; i++ ) {
        if ( numFirstLevelChildren === childIdx && viewModelCollection.loadedVMObjects[i].levelNdx <= childlevelIndex ) {
            break;
        }
        if ( viewModelCollection.loadedVMObjects[i].levelNdx === childlevelIndex ) {
            numFirstLevelChildren++;
        }
        if ( viewModelCollection.loadedVMObjects[i].type === 'Qfm0SystemElement' ) {
            if ( childVMO.type === 'Qfm0FunctionElement' ) {
                // Add newly added function element just before the system elements
                break;
            }
        }

        if ( viewModelCollection.loadedVMObjects[i].type === _pseudoFolderType ) {
            if ( childVMO.type === _pseudoFolderType && childVMO.displayName === externalFunctionText) {
                // Add newly added External Function container node just before container node of External failure
                break;
            }
        }
        if ( viewModelCollection.loadedVMObjects[i].levelNdx < childlevelIndex ) {
            // no longer looking at first level children (now looking at an uncle)
            break;
        }
    }
    var newIndex = i;
    viewModelCollection.loadedVMObjects.splice( newIndex, 0, childVMO );
}

/**
 * Update parentVMO state ( mark as expanded=true, isLeaf=false)
 */

/**
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {String} parentUid single new element info to add
 */
 function _updateParentNodeState( viewModelCollection, parentUid, parentIdx, newExtNodeToBeCreated, externalElementType ) {
    var deferred = AwPromiseService.instance.defer();
    //First find if the parent exists in the viewModelCollection
    var idx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === parentUid;
    } );

    _fmeaRootNodeUid = qfm0FmeaManagerUtils.getFmeaRootNodeUid();

    //Now get the exact viewModelTreeNode for the parent Occ in the viewModelCollection
    var parentVMO = viewModelCollection.getViewModelObject( idx );

    if ( parentVMO ) {
        //the parent exists in the VMO lets make sure it is now marked as parent and expanded
        if (!parentVMO.isExpanded || newExtNodeToBeCreated === true) {
            var soaInput2 = {
                columnConfigInput: {
                    clientName: 'AWClient',
                    clientScopeURI: ''
                },
                searchInput: {
                    maxToLoad: 100,
                    maxToReturn: 100,
                    providerName: 'Qfm0FMEADataProvider',
                    searchCriteria: {
                        parentUid:  parentVMO.type === _pseudoFolderType  ? _fmeaRootNodeUid : parentVMO.uid,
                        View : 'FmeaTreeView'
                    },
                    startIndex: 0,
                    searchSortCriteria: []
                }
            };
            if( parentUid ===  _fmeaRootNodeUid ) {
                soaInput2.searchInput.searchCriteria.ElementType = _qfm0SystemElement;
            }
            return soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput2 ).then(
                function( response ) {
                    var children = [];
                    if ( response.searchResultsJSON ) {
                        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                        if ( searchResults ) {
                            for ( var x = 0; x < searchResults.objects.length; ++x ) {
                                var uid = searchResults.objects[x].uid;
                                var obj = response.ServiceData.modelObjects[uid];
                                if( obj ) {
                                    if( (newExtNodeToBeCreated === true) ) {
                                        if(obj.type === _pseudoFolderType)
                                        {
                                            if( obj.props && obj.props.object_string && obj.props.object_string.dbValues[0] === externalFunctionText && externalElementType === _qfm0FunctionElement ) {
                                                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                                                    parentVMO, idx, parentVMO.children.length , obj );
                                                break;
                                            } else if( obj.props && obj.props.object_string && obj.props.object_string.dbValues[0] === externalFailureText && externalElementType === _qfm0FailureElement) {
                                                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                                                    parentVMO, idx, parentVMO.children.length + 1 , obj );
                                                break;
                                            }
                                        }                                        
                                    }else{
                                        children.push( obj );
                                    }                       
                                    
                                }
                            }
                        }
                    }

                    parentVMO.expanded = true;
                    parentVMO.isExpanded = true;
                    parentVMO.isLeaf = false;
                    if ( !parentVMO.children ) {
                        parentVMO.children = [];
                        if ( children.length > 0 ) {
                            //In a collapsed parent there will be no child occs in the viewModelCollection.  Need to add them
                            //back by looping through each of the children
                            _.forEach( children, function( child ) {
                                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection,
                                    parentVMO, parentIdx, -1, child );
                            } );
                        }
                    }
                    deferred.resolve();
                } );
        }
        deferred.resolve();
    }
    return deferred.promise;
}

/**
 * Get children count for given parent tree node (parentVMO)
 * @param {Object} parentVMO
 * @returns
 */
function _updateParentNodeStateOnDelete( parentVMO ) {
    var deferred = AwPromiseService.instance.defer();

    if( !_fmeaRootNodeUid ) {
        _fmeaRootNodeUid = qfm0FmeaManagerUtils.getFmeaRootNodeUid();
    }

    if ( parentVMO ) {
        var soaInput2 = {
            columnConfigInput: {
                clientName: 'AWClient',
                clientScopeURI: ''
            },
            searchInput: {
                maxToLoad: 100,
                maxToReturn: 100,
                providerName: 'Qfm0FMEADataProvider',
                searchCriteria: {
                    parentUid: parentVMO.uid,
                    View : 'FmeaTreeView'
                },
                startIndex: 0,
                searchSortCriteria: []
            }
        };
        soaSvc.postUnchecked( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput2 ).then( function( response ) {
            var children = [];
            if ( response.searchResultsJSON ) {
                var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
                if ( searchResults ) {
                    for ( var x = 0; x < searchResults.objects.length; ++x ) {
                        var uid = searchResults.objects[x].uid;
                        var obj = response.ServiceData.modelObjects[uid];
                        if( obj ) {                            
                            children.push( obj );
                        }
                    }
                }
            }

            if ( children.length > 0 ) {
                parentVMO.isLeaf = false;
                parentVMO.totalChildCount = children.length;
            } else{
                parentVMO.children = [];
                parentVMO.totalChildCount = 0;
                parentVMO.isLeaf = true;
            }
            let parentLatestInfo = {
                parentVMO: parentVMO
            };
            deferred.resolve( parentLatestInfo );
        } );
    } else {
        deferred.resolve();
    }

    return deferred.promise;
}
/**
 * Get preference value for showing actions in tree
 * @returns true/false
 */
function _getPreferenceValueForShowingActions() {
    let ctxPreferences = appCtxService.getCtx( 'preferences' );
    return Boolean( ctxPreferences && ctxPreferences.Show_actions_in_FMEA_tree && ctxPreferences.Show_actions_in_FMEA_tree[0] &&
    ctxPreferences.Show_actions_in_FMEA_tree[0].toUpperCase() === 'TRUE' );
}

export default exports = {
    addNewElement,
    getObjectToSelect,
    updateFmeaTreeOnDelete
};
app.factory( 'qfm0FmeaEditStructureServices', () => exports );
