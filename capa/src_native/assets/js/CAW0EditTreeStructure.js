/* eslint-disable require-jsdoc */
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
 * @module js/CAW0EditTreeStructure
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import editHandlerService from 'js/editHandlerService';
import iconSvc from 'js/iconService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import Caw0AnalysisDrawService from 'js/Caw0AnalysisDrawService';
import _dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import assert from 'assert';
import nodeService from 'js/Caw0AnalysisDrawNode';
import _ from 'lodash';

var exports = {};

export let setAddElementResponse = function( response ) {
    appCtxService.ctx.setAddElementResponse = response;
};

export let addNewElement = function( addElementResponse, ctx ) {
    var updatedParentElement = ctx.selected.type === 'CauseGroup' ? ctx.xrtSummaryContextObject : ctx.selected;

    addNewlyAddedElement( addElementResponse, updatedParentElement, ctx );
};

export let setParentNode = function( ctx ) {
    if( ctx.xrtPageContext.primaryXrtPageID !== 'tc_xrt_RootCauseAnalysis' ) {
        return;
    }
    var context = _.get( ctx, 'rootCauseContext' );
    var loadedVMObjects = context.viewModelCollection.loadedVMObjects;
    var selectedIndex = context.getSelectedIndexes()[ 0 ] - 1;
    var levelIndex = context.getSelectedObjects()[ 0 ].levelNdx - 1;

    if( ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ) {
        var deletedObjectUid = ctx.graph.graphModel.graphControl.getSelected( 'Node' )[ 0 ].appData.id;

        var deletedTreeNode = loadedVMObjects.find( obj => obj.uid === deletedObjectUid );

        selectedIndex = loadedVMObjects.findIndex( function( modelObject ) {
            return deletedObjectUid === modelObject.uid;
        } );

        levelIndex = deletedTreeNode.levelNdx - 1;

        ctx.parentTreeNode = loadedVMObjects[ context.getSelectedIndexes()[ 0 ] ];
    }
    for( var i = selectedIndex; i >= 0; i-- ) {
        if( loadedVMObjects[ i ].levelNdx === levelIndex ) {
            ctx.parentTreeNode = loadedVMObjects[ i ];
            break;
        }
    }
    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
        ctx.is5WhyDeleted = true;
    } else {
        ctx.doRefresh = ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) === -1 && ( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -
            1 && ctx.selected.props.caw0Context && ctx.selected.props.caw0Context.dbValues[ 0 ] !== 'Ishikawa' );
    }
};

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _updateParentTreeNode( parentTreeNode, deletedNode ) {
    if( !parentTreeNode.children ) {
        return;
    }
    var index = parentTreeNode.children.findIndex( function( child ) {
        return child.uid === deletedNode.uid;
    } );
    parentTreeNode.children.splice( index, 1 );
    parentTreeNode.totalChildCount = parentTreeNode.children.length;
}

export let updateTreeTableOnDelete = function( ctx ) {
    appCtxService.unRegisterCtx( 'is5WhyDeleted' );
    var deferred = AwPromiseService.instance.defer();
    var parentTreeNode = ctx.parentTreeNode;
    var context = _.get( appCtxService.ctx, 'rootCauseContext' );
    var vmCollection = context.viewModelCollection.loadedVMObjects;

    //Remove deletedChild from Parent Node
    _updateParentTreeNode( parentTreeNode, ctx.selected );

    if( parentTreeNode.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 || ( parentTreeNode.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ( ( ( parentTreeNode.props.caw0Context &&
                parentTreeNode.props.caw0Context.dbValues[ 0 ] === '5Why' ) ||
            parentTreeNode.caw0Context === '5Why' ) || ( ( parentTreeNode.props.caw0Context && parentTreeNode.props.caw0Context.dbValues[ 0 ] === 'Why' ) || parentTreeNode.caw0Context ===
            'Why' ) ) ) ) {
        getUpdatedWhys( parentTreeNode ).then( function( updatedNodes ) {
            ctx.updatedNodes = updatedNodes;
            if( updatedNodes.length > 0 ) {
                //Update parent is marked as leaf
                var index = vmCollection.findIndex( function( treeNode ) {
                    return treeNode.uid === parentTreeNode.uid;
                } );
                vmCollection.splice( index, 1, parentTreeNode );
                for( var i = 0; i < updatedNodes.length; i++ ) {
                    for( var j = 0; j < vmCollection.length; j++ ) {
                        if( vmCollection[ j ].uid === updatedNodes[ i ].uid ) {
                            //Create the viewModelTreeNode from the child ModelObject, child index and level index
                            var childVMO = createVMNodeUsingOccInfo( updatedNodes[ i ], vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                            //Update Node is child present
                            childVMO.isLeaf = vmCollection[ j ].isLeaf;
                            childVMO.isExpanded = vmCollection[ j ].isExpanded;
                            vmCollection.splice( j, 1, childVMO );
                        }
                    }
                }
            }
            deferred.resolve( updatedNodes );
        } );
    } else {
        deferred.resolve();
    }
    //the parent exists in the VMO lets make sure it is now marked as leaf
    if( parentTreeNode.totalChildCount < 1 ) {
        parentTreeNode.isLeaf = true;
        var childVMO = createVMNodeUsingOccInfo( parentTreeNode, parentTreeNode.childNdx, parentTreeNode.levelNdx );
        var index = vmCollection.findIndex( function( treeNode ) {
            return treeNode.uid === parentTreeNode.uid;
        } );
        vmCollection.splice( index, 1, childVMO );
        ctx.selected = parentTreeNode;

        if( ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' ) {
            var node = appCtxService.ctx.graph.graphModel.nodeMap[ parentTreeNode.uid ];
            node.appData.outDegrees = [];
            // Update the binding data
            nodeService.updateNodeBindingData( appCtxService.ctx.graph.graphModel.graphControl.graph, node, { 'inDegrees': node.appData.inDegrees, 'outDegrees': node.appData.outDegrees } );
        }
    }
    if( ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_Methodology' ) {
        context.selectionModel.setSelection( parentTreeNode );
    }
    ctx.selected = parentTreeNode;
    if( ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' ) {
        ctx.mselected[ 0 ] = cdm.getObject( ctx.selected.uid );
    }

    return deferred.promise;
};

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
export let getUpdatedWhys = function( parentTreeNode ) {
    var deferred = AwPromiseService.instance.defer();
    soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
        parentList: [ {
            uid: parentTreeNode.uid,
            type: parentTreeNode.type
        } ],
        level: -1
    } ).then( function( response ) {
        var updatedNodes;
        // if( parentTreeNode.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
        updatedNodes = _getRelatedChildWhyObj( parentTreeNode, response, true );
        // }
        deferred.resolve( updatedNodes );
    } );
    return deferred.promise;
};

// eslint-disable-next-line complexity
export let updateTreeTable = function( ctx, data ) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' ) {
        var context = _.get( appCtxService.ctx, 'rootCauseContext' );
        var vmCollection = context.viewModelCollection.loadedVMObjects;
        var childVMO;
        if( data.serviceData ) {
            var updatedNodes = data.serviceData.ServiceData.updated;
            var modelObjects = data.serviceData.ServiceData.modelObjects;
            if( updatedNodes && updatedNodes.length > 0 ) {
                for( var i = 0; i < updatedNodes.length; i++ ) {
                    for( var j = 0; j < vmCollection.length; j++ ) {
                        if( vmCollection[ j ].uid === updatedNodes[ i ] ) {
                            //Create the viewModelTreeNode from the child ModelObject, child index and level index
                            childVMO = createVMNodeUsingOccInfo( modelObjects[ updatedNodes[ i ] ], vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                            childVMO.isLeaf = vmCollection[ j ].isLeaf;
                            childVMO.expanded = vmCollection[ j ].expanded;
                            childVMO.isExpanded = vmCollection[ j ].isExpanded;
                            vmCollection.splice( j, 1, childVMO );
                        }
                    }
                }
            }
            activeEditHandler.saveEditsPostActions( false );
        } else if( data.eventData === undefined &&
            data.serviceData === undefined && !ctx.INFO_PANEL_CONTEXT ) {
            var updatedNode = ctx.selected;
            if( updatedNode ) {
                /*
                // Commenting this as updating Name prop through server
                */
                if( updatedNode.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 && ctx.tcSessionData.tcMajorVersion < 13 ) {
                    // Call soa to update the name as per 5Why type
                    var propVal;
                    propVal = [ '5Why-' + updatedNode.props.caw05WhyType.uiValues[ 0 ] ];
                    if( ctx.INFO_PANEL_CONTEXT ) {
                        propVal = [ '5Why-' + data.caw05WhyType.uiValue ];
                    }
                    _dmSvc.setProperties( [ {
                        object: updatedNode,
                        vecNameVal: [ {
                            name: 'object_name',
                            values: propVal
                        } ]
                    } ] ).then( function( response ) {
                        var updatedNodeUid = response.ServiceData.updated[ 0 ];
                        var udpated5WHyNode = response.ServiceData.modelObjects[ updatedNodeUid ];
                        for( var j = 0; j < vmCollection.length; j++ ) {
                            if( vmCollection[ j ].uid === udpated5WHyNode.uid ) {
                                childVMO = createVMNodeUsingOccInfo( udpated5WHyNode, vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                                childVMO.isLeaf = vmCollection[ j ].isLeaf;
                                childVMO.expanded = vmCollection[ j ].expanded;
                                childVMO.isExpanded = vmCollection[ j ].isExpanded;
                                vmCollection.splice( j, 1, childVMO );
                            }
                        }
                    } );
                }

                for( var j = 0; j < vmCollection.length; j++ ) {
                    if( vmCollection[ j ].uid === updatedNode.uid ) {
                        //updatedNode.props.object_name.uiValues = updatedNode.props.object_name.newDisplayValues;
                        //Create the viewModelTreeNode from the child ModelObject, child index and level index
                        childVMO = createVMNodeUsingOccInfo( updatedNode, vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                        childVMO.isLeaf = vmCollection[ j ].isLeaf;
                        childVMO.expanded = vmCollection[ j ].expanded;
                        childVMO.isExpanded = vmCollection[ j ].isExpanded;
                        vmCollection.splice( j, 1, childVMO );
                    }
                }
            }
        } else if( data.eventData && data.eventData.dataSource && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
            var id = data.eventData.dataSource.baseselection && data.eventData.dataSource.baseselection.id ? data.eventData.dataSource.baseselection.id : '';
            updatedNode = cdm.getObject( id );

            if( ctx.INFO_PANEL_CONTEXT || data.eventData.dataSource.baseselection === undefined ) {
                updatedNode = cdm.getObject( ctx.selected.uid );
            }
            if( updatedNode ) {
                /*
                // Commenting this as updating Name prop through server
                */
                if( updatedNode.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 && ctx.tcSessionData.tcMajorVersion < 13 ) {
                    //Call soa to update the name as per 5Why type
                    propVal = [ '5Why-' + updatedNode.props.caw05WhyType.uiValues[ 0 ] ];
                    _dmSvc.setProperties( [ {
                        object: updatedNode,
                        vecNameVal: [ {
                            name: 'object_name',
                            values: propVal
                        } ]
                    } ] ).then( function( response ) {
                        var updatedNodeUid = response.ServiceData.updated[ 0 ];
                        var udpated5WHyNode = response.ServiceData.modelObjects[ updatedNodeUid ];
                        for( var j = 0; j < vmCollection.length; j++ ) {
                            if( vmCollection[ j ].uid === udpated5WHyNode.uid ) {
                                childVMO = createVMNodeUsingOccInfo( udpated5WHyNode, vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                                childVMO.isLeaf = vmCollection[ j ].isLeaf;
                                childVMO.expanded = vmCollection[ j ].expanded;
                                childVMO.isExpanded = vmCollection[ j ].isExpanded;
                                vmCollection.splice( j, 1, childVMO );
                            }
                        }
                    } );
                }

                for( var j = 0; j < vmCollection.length; j++ ) {
                    if( vmCollection[ j ].uid === updatedNode.uid ) {
                        //updatedNode.props.object_name.uiValues = updatedNode.props.object_name.newDisplayValues;
                        //Create the viewModelTreeNode from the child ModelObject, child index and level index
                        childVMO = createVMNodeUsingOccInfo( updatedNode, vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                        childVMO.isLeaf = vmCollection[ j ].isLeaf;
                        childVMO.expanded = vmCollection[ j ].expanded;
                        childVMO.isExpanded = vmCollection[ j ].isExpanded;
                        vmCollection.splice( j, 1, childVMO );
                    }
                }
            }
        } else if( ctx.INFO_PANEL_CONTEXT && ctx.selected.modelType && ( ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 || ctx.selected.modelType.typeHierarchyArray.indexOf(
                'CAW0Ishikawa' ) > -1 ) && data.eventData.dataSource.object_name.dbValue !== '' ) {
            _updateTreeTableCommonCode( ctx, data );
        } else if( ctx.selected.modelType && ( ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 || ctx.selected.modelType
                .typeHierarchyArray.indexOf(
                    'CAW0Ishikawa' ) > -1 ) && data.eventData.dataSource.object_name.dbValue !== '' ) {
            _updateTreeTableCommonCode( ctx, data );
        } else {
            if( activeEditHandler ) {
                activeEditHandler.saveEditsPostActions( false );
            }
        }
    }
};

function _updateTreeTableCommonCode( ctx, data ) {
    var updatedNode = ctx.selected;
    var context = _.get( appCtxService.ctx, 'rootCauseContext' );
    var vmCollection = context.viewModelCollection.loadedVMObjects;
    var childVMO;

    if( data.eventData && updatedNode.props.object_name ) {
        updatedNode.props.object_name.dbValue = data.eventData.dataSource.object_name.dbValue;
        updatedNode.props.object_name.dbValues = data.eventData.dataSource.object_name.dbValue;
        updatedNode.props.object_name.uiValue = data.eventData.dataSource.object_name.dbValue;
        updatedNode.props.object_name.uiValues = data.eventData.dataSource.object_name.dbValue;
    }

    if( updatedNode ) {
        if( ctx.updateSelectionForCause && ctx.selected.props.caw0Context && ctx.selected.props.caw0Context.dbValue === 'Ishikawa' && ctx.selected.props.caw0CauseGroup && ctx.updateSelectionForCause !== ctx
            .selected.props
            .caw0CauseGroup.dbValues[ 0 ] ) {
            _dmSvc.setProperties( [ {
                object: updatedNode,
                vecNameVal: [ {
                    name: 'caw0CauseGroup',
                    values: [ ctx.updateSelectionForCause ]
                } ]
            } ] ).then( function( response ) {
                var updatedNodeUid = response.ServiceData.updated[ 0 ];
                var udpated5WHyNode = response.ServiceData.modelObjects[ updatedNodeUid ];
                for( var j = 0; j < vmCollection.length; j++ ) {
                    if( vmCollection[ j ].uid === udpated5WHyNode.uid ) {
                        childVMO = createVMNodeUsingOccInfo( udpated5WHyNode, vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                        childVMO.isLeaf = vmCollection[ j ].isLeaf;
                        childVMO.expanded = vmCollection[ j ].expanded;
                        childVMO.isExpanded = vmCollection[ j ].isExpanded;
                        vmCollection.splice( j, 1, childVMO );
                    }
                }
                if( ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Overview' ) {
                    eventBus.publish( 'updateCauseOnOverviewFromInfo' );
                }
            } );
        }
        for( var j = 0; j < vmCollection.length; j++ ) {
            if( vmCollection[ j ].uid === updatedNode.uid ) {
                //updatedNode.props.object_name.uiValues = updatedNode.props.object_name.newDisplayValues;
                //Create the viewModelTreeNode from the child ModelObject, child index and level index
                childVMO = createVMNodeUsingOccInfo( updatedNode, vmCollection[ j ].childNdx, vmCollection[ j ].levelNdx );
                childVMO.isLeaf = vmCollection[ j ].isLeaf;
                childVMO.expanded = vmCollection[ j ].expanded;
                childVMO.isExpanded = vmCollection[ j ].isExpanded;
                vmCollection.splice( j, 1, childVMO );
            }
        }
    }
}

export let updateTreeTableForRootCause = function( ctx, data ) {
    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' && ctx.tcSessionData.tcMajorVersion >= 13 ) {
        var context = _.get( appCtxService.ctx, 'rootCauseContext' );
        var vmCollection = context.viewModelCollection.loadedVMObjects;
        var updatedNode = data.serviceData.ServiceData.modelObjects[ data.serviceData.successfulObjects[ 0 ].uid ];
        var previousRootcauseObject = _.find( vmCollection, function( object ) {
            return object.isRootCause && object.uid !== updatedNode.uid;
        } );
        var newRootcauseObject = _.find( vmCollection, function( object ) {
            return object.uid === updatedNode.uid;
        } );
        ctx.selected.props.caw0rootCause.dbValues[ 0 ] = updatedNode.props.caw0rootCause.dbValues[ 0 ];
        //Create the viewModelTreeNode from the child ModelObject, child index and level index
        for( var j = 0; j < vmCollection.length; j++ ) {
            if( previousRootcauseObject && vmCollection[ j ].uid === previousRootcauseObject.uid ) {
                //Create the viewModelTreeNode from the child ModelObject, child index and level index
                previousRootcauseObject.props.caw0rootCause.dbValues[ 0 ] = '0';
                var childVMO = createVMNodeUsingOccInfo( previousRootcauseObject, previousRootcauseObject.childNdx, previousRootcauseObject.levelNdx );
                childVMO.isLeaf = vmCollection[ j ].isLeaf;
                childVMO.expanded = vmCollection[ j ].expanded;
                childVMO.isExpanded = vmCollection[ j ].isExpanded;
                vmCollection.splice( j, 1, childVMO );
                previousRootcauseObject.isRootCause = false;
            }
            if( newRootcauseObject && vmCollection[ j ].uid === newRootcauseObject.uid ) {
                //Create the viewModelTreeNode from the child ModelObject, child index and level index//update new Root Cause object
                // newRootcauseObject.isRootCause = updatedNode.props.caw0rootCause.dbValues[ 0 ] !== '0';
                // newRootcauseObject.props.caw0rootCause.dbValues[ 0 ] = updatedNode.props.caw0rootCause.dbValues[ 0 ];
                var childVMO = createVMNodeUsingOccInfo( newRootcauseObject, newRootcauseObject.childNdx, newRootcauseObject.levelNdx );
                childVMO.isLeaf = vmCollection[ j ].isLeaf;
                childVMO.expanded = vmCollection[ j ].expanded;
                childVMO.isExpanded = vmCollection[ j ].isExpanded;
                childVMO.isRootCause = updatedNode.props.caw0rootCause.dbValues[ 0 ] !== '0';
                vmCollection.splice( j, 1, childVMO );
            }
        }
    }

    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' && ctx.tcSessionData.tcMajorVersion < 13 ) {
        var context = _.get( appCtxService.ctx, 'rootCauseContext' );
        var vmCollection = context.viewModelCollection.loadedVMObjects;
        var updatedNodeUid = data.serviceData.ServiceData.plain[ 0 ];
        var previousRootcauseObject = _.find( vmCollection, function( object ) {
            return object.isRootCause && object.uid !== updatedNodeUid;
        } );
        var newRootcauseObject = _.find( vmCollection, function( object ) {
            return object.uid === updatedNodeUid;
        } );
        newRootcauseObject.isRootCause = true;
        //Create the viewModelTreeNode from the child ModelObject, child index and level index
        for( var j = 0; j < vmCollection.length; j++ ) {
            if( previousRootcauseObject && vmCollection[ j ].uid === previousRootcauseObject.uid ) {
                //Create the viewModelTreeNode from the child ModelObject, child index and level index
                previousRootcauseObject.props.caw0rootCause.dbValues[ 0 ] = '0';
                var childVMO = createVMNodeUsingOccInfo( previousRootcauseObject, previousRootcauseObject.childNdx, previousRootcauseObject.levelNdx );
                childVMO.isLeaf = vmCollection[ j ].isLeaf;
                childVMO.expanded = vmCollection[ j ].expanded;
                childVMO.isExpanded = vmCollection[ j ].isExpanded;
                vmCollection.splice( j, 1, childVMO );
                previousRootcauseObject.isRootCause = false;
            }
        }
    }
};

var addNewlyAddedElement = function( addElementResponse, updatedParentElement, ctx ) {
    var context = _.get( appCtxService.ctx, 'rootCauseContext' );
    var vmCollection = context.viewModelCollection;
    if( addElementResponse && vmCollection ) {
        // First add the children for selected parent node.
        if( _getParentNodeStateIsExpanded( vmCollection, updatedParentElement.uid ) ) {
            if( updatedParentElement.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 || updatedParentElement.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ) {
                soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
                    parentList: [ {
                        uid: updatedParentElement.uid,
                        type: updatedParentElement.type
                    } ],
                    level: -1
                } ).then( function( response ) {
                    _upateParentNodeState( vmCollection, updatedParentElement.uid );
                    if( updatedParentElement.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ) {
                        var childDefects = _getRelatedDefectObj( updatedParentElement, response, true );
                    } else {
                        var childDefects = _getChildDefects( updatedParentElement.uid, response );
                        for( var index = 0; index < childDefects.length; index++ ) {
                            childDefects[ index ].leafFlag = !_hasChildDefect( childDefects[ index ].uid, response );
                        }

                    }
                    var newElements = addElementResponse.ServiceData.created.map( function( uid ) {
                        return addElementResponse.ServiceData.modelObjects[ uid ];
                    } );

                    ctx.newlyAddedElement = ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Methodology' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' ) && newElements[ 0 ]
                        .modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) === -1 ? newElements : undefined;
                    _insertSingleAddedElementIntoViewModelCollectionForSelectedParent( vmCollection, updatedParentElement, childDefects, addElementResponse );
                } );
            } else
            if( updatedParentElement.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                soaSvc.post( 'Internal-Capaonawc-2019-06-QualityIssueManagement', 'getChildrenInfo', {
                    parentList: [ {
                        uid: updatedParentElement.uid,
                        type: updatedParentElement.type
                    } ],
                    level: -1
                } ).then( function( response ) {
                    _upateParentNodeState( vmCollection, updatedParentElement.uid );
                    var relatedWhys = _getRelatedWhyObj( updatedParentElement.uid, response );
                    _insertSingleAddedElementIntoViewModelCollectionForSelectedParent( vmCollection, updatedParentElement, relatedWhys, addElementResponse );
                } );
            }
        } else {
            _upateParentNodeState( vmCollection, updatedParentElement.uid );
            var newElements = addElementResponse.ServiceData.created.map( function( uid ) {
                return addElementResponse.ServiceData.modelObjects[ uid ];
            } );
            ctx.newlyAddedElement = ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Methodology' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' ) && newElements[ 0 ].modelType
                .typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) === -1 ? newElements : undefined;
            _insertSingleAddedElementIntoViewModelCollectionForSelectedParent( vmCollection, updatedParentElement, newElements, addElementResponse );

            if( !_.isEmpty( addElementResponse.newElementInfos ) ) {
                // Loop over all the other parent instances.
                for( var i = 0; i < addElementResponse.newElementInfos.length; ++i ) {
                    var parentIdx = _.findLastIndex( vmCollection.loadedVMObjects, function( vmo ) {
                        return vmo.uid === addElementResponse.newElementInfos[ i ].parentElement.uid;
                    } );
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

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _hasChildDefect( parentUid, response ) {
    var childs = response.parentChildren;
    var index = childs[ 0 ].findIndex( function( modelObject ) {
        return parentUid === modelObject.uid;
    } );

    return index > -1 && childs[ 1 ][ index ].length > 0;
}

/**  Function returns modelObjects
 * @param {response} response -
 * @returns {actionObjects}
 **/
function _getChildDefects( parentUid, response ) {
    var childs = response.parentChildren;
    var index = childs[ 0 ].findIndex( function( modelObject ) {
        return parentUid === modelObject.uid;
    } );
    return childs[ 1 ][ index ];
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _getRelatedDefectObj( parentObject, response, addingFlag ) {
    var relatedWhys = [];
    var isParentUpdated = true;
    var sequenceLength = parentObject.props.caw0WhySequence.dbValues[ 0 ] !== "" ? parentObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length : 0;
    var parentObjectIndexlength = addingFlag ? sequenceLength + 1 : sequenceLength;
    while( _hasChildDefect( parentObject.uid, response ) && isParentUpdated ) {
        var childDefect = _getChildDefects( parentObject.uid, response );
        isParentUpdated = false;
        var updatedParentObj;
        childDefect.forEach( ( item, idx ) => {
            var childObjectIndexlength = item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0WhySequence.dbValues[ 0 ] !== "" ? item.props.caw0WhySequence.dbValues[ 0 ]
                .split( '-' )[ 1 ].split( '.' ).length : 1;
            if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" && parentObjectIndexlength === childObjectIndexlength ) {
                relatedWhys = relatedWhys.concat( childDefect[ idx ] );
                updatedParentObj = childDefect[ idx ];
                isParentUpdated = true;
                if( _hasChildDefect( item.uid, response ) ) {
                    var parentChild = item;
                    var childDefectlevel2 = _getChildDefects( parentChild.uid, response );
                    childDefectlevel2.forEach( ( item, idx ) => {
                        if( item.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                            parentChild.leafFlag = false;
                        }
                    } );
                }
            }
            if( ( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" && parentObjectIndexlength < childObjectIndexlength ) || item
                .modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                if( item.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                    if( _hasChildDefect( item.uid, response ) ) {
                        item.leafFlag = false;
                    }
                    relatedWhys = relatedWhys.concat( item );
                }
                parentObject.leafFlag = false;
            }
            if( ( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] !== "Why" && item.props.caw0Context.dbValues[ 0 ] !== "5Why" ) || item
                .modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ) {
                if( _hasChildDefect( item.uid, response ) ) {
                    item.leafFlag = false;
                }
                relatedWhys = relatedWhys.concat( item );
            }
        } );
        parentObject = isParentUpdated ? updatedParentObj : parentObject;
        parentObjectIndexlength = parentObject.props.caw0WhySequence.dbValues[ 0 ] !== "" ? parentObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length : 0;

    }
    return relatedWhys;
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _getRelatedWhyObj( parentUid, response ) {
    var relatedWhys = [];
    var index;
    var fiveWhyArray = [];
    while( _hasChildDefect( parentUid, response ) ) {
        var childDefect = _getChildDefects( parentUid, response );
        var maxCount = 0;

        childDefect.forEach( ( item, idx ) => {
            if( item.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 && maxCount === 0 ) {
                if( relatedWhys.find( obj => obj.uid === parentUid ) ) {
                    relatedWhys.find( obj => obj.uid === parentUid ).leafFlag = false;
                }
                maxCount++;
                fiveWhyArray.push( item.uid ); // push 5why element id in array
            } else if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" ) {
                if( relatedWhys.find( obj => obj.uid === parentUid ) ) {
                    relatedWhys.find( obj => obj.uid === parentUid ).leafFlag = false;
                }
            } else if( item.props && item.props.caw0Context && item.props.caw0Context.dbValues[ 0 ] === "5Why" ) {
                // check if why having 5why as child and some whys associated with this 5why , then skip those whys to display at parent level
                // or To remove duplicate child whys to display at parent level we have added this condition
                var isParentAlreadyExist = fiveWhyArray.includes( parentUid );
                if( isParentAlreadyExist ) {
                    fiveWhyArray.push( item.uid );
                } else {
                    relatedWhys = relatedWhys.concat( childDefect[ idx ] );
                }
            }
        } );

        parentUid = childDefect[ 0 ].uid;

    }
    return relatedWhys;
}

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _getRelatedChildWhyObj( parentObject, response, addingFlag ) {
    var relatedWhys = [];
    var isParentUpdated = true;
    var sequenceLength = parentObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ? parentObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length : 0;
    var parentObjectIndexlength = addingFlag ? sequenceLength + 1 : sequenceLength;
    while( _hasChildDefect( parentObject.uid, response ) && isParentUpdated ) {
        var childDefect = _getChildDefects( parentObject.uid, response );
        isParentUpdated = false;
        var updatedParentObj;
        childDefect.forEach( ( item, idx ) => {
            parentObject.leafFlag = true;
            var childObjectIndexlength = item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ? item.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length : 0;
            if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" && parentObjectIndexlength === childObjectIndexlength ) {
                relatedWhys = relatedWhys.concat( item );
                updatedParentObj = item;
                isParentUpdated = true;
                if( _hasChildDefect( item.uid, response ) ) {
                    var parentChild = item;
                    var childDefectlevel2 = _getChildDefects( parentChild.uid, response );
                    childDefectlevel2.forEach( ( item, idx ) => {
                        if( item.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                            parentChild.leafFlag = false;
                        }
                    } );
                }
            }
            if( ( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "Why" && parentObjectIndexlength < childObjectIndexlength ) || item
                .modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
                relatedWhys = relatedWhys.concat( item );
                if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && _hasChildDefect( item.uid, response ) ) {
                    var sideWhysAnd5Whys = _getRelatedChildWhyObj( item, response, false );
                    relatedWhys = relatedWhys.concat( sideWhysAnd5Whys );
                }
                parentObject.leafFlag = false;
            }
            if( item.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && item.props.caw0Context.dbValues[ 0 ] === "5Why" ) {
                relatedWhys = relatedWhys.concat( item );
                updatedParentObj = item;
                isParentUpdated = true;
            }
        } );
        parentObject = isParentUpdated ? updatedParentObj : parentObject;
        parentObjectIndexlength = parentObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length;

    }
    return relatedWhys;
}

/**
 * Check parentVMO state ( mark as expanded=true, isLeaf=false)
 */

/**
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {String} parentUid single new element info to add
 */
function _getParentNodeStateIsExpanded( viewModelCollection, parentUid ) {
    //First find if the parent exists in the viewModelCollection
    var idx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === parentUid;
    } ); //Now get the exact viewModelTreeNode for the parent Occ in the viewModelCollection

    var parentVMO = viewModelCollection.getViewModelObject( idx );

    if( parentVMO ) {
        return !parentVMO.isExpanded;
    }
}

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
    } ); //Now get the exact viewModelTreeNode for the parent Occ in the viewModelCollection

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
            return newElement.uid === newElements[ i ].uid;
        } );
        newElementPositions.push( {
            element: newElement[ 0 ],
            position: elementPositions[ i ]
        } );
    }
    var orderedElementPositions = _.orderBy( newElementPositions, [ 'position' ], [ 'asc' ] );

    for( var i = 0; i < orderedElementPositions.length; i++ ) {
        var newlyAddedChildElement = orderedElementPositions[ i ].element;
        var newlyAddedChildElementPosition = orderedElementPositions[ i ].position;

        // Add new element at the appropriate position
        if( parentVMO ) {
            var childIdx = parentVMO.children.length;
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
 * Inserts objects added under selected parent(contained in the addElementResponse) into the viewModelCollection
 *
 * @param {Object} viewModelCollection The view model collection to add the object into
 * @param {Object} inputParentElement The input parent element on which addd is initiated.
 * @param {Object} pagedChildOccurrences childOccurrences from addObject() SOA
 * @param {Object} newElements List of new elements to add
 *
 */
function _insertSingleAddedElementIntoViewModelCollectionForSelectedParent( viewModelCollection, inputParentElement, newElements, addElementResponse ) {
    //First find if the parent exists in the viewModelCollection
    var parentIdx = _.findLastIndex( viewModelCollection.loadedVMObjects, function( vmo ) {
        return vmo.uid === inputParentElement.uid;
    } );

    var addedElement = addElementResponse.ServiceData.created.map( function( uid ) {
        return addElementResponse.ServiceData.modelObjects[ uid ];
    } );

    var parentVMO = viewModelCollection.getViewModelObject( parentIdx );
    var pagedChildOccurrences = parentVMO.children;

    for( var i = 0; i < newElements.length; i++ ) {
        /**
         * addObject SOA only returns pagedOccInfo objects for one of the unique parent.
         */

        var pagedChildIdx = pagedChildOccurrences.length;

        if( pagedChildIdx > -1 ) {
            //In a collapsed parent there will be no child occs in the viewModelCollection.  Need to add them
            //back by looping through each of the pagedOccInfo
            // _.forEach( pagedChildOccurrences, function( childOccurrence ) {
            if( parentVMO ) {
                // var childIdx = _.findLastIndex( parentVMO.children, function( vmo ) {
                //     return vmo.uid === childOccurrence.uid;
                // } );

                // if( childIdx < 0 ) {
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection, pagedChildOccurrences, parentVMO, parentIdx, -1, newElements[ i ] );
                //}
            } else {
                //Top level case
                _insertSingleAddedElementIntoParentVMOAndViewModelCollection( viewModelCollection, pagedChildOccurrences, null, parentIdx, -1, newElements[ i ] );
            }
            // } );
        }
    }
    appCtxService.ctx.is5Whyadded = addedElement[ 0 ].modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1;
    eventBus.publish( 'call.caw0SetSelection', {
        createdObject: addedElement[ 0 ]
    } );
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
        return vmo.uid === childOccurrence.uid;
    } );
    if( ndx > -1 ) {
        // already have a vmTreeNode with the same uid in the viewModelCollection -- nothing to do
        return;
    }

    var childlevelIndex = 0;
    if( parentVMO ) {
        childlevelIndex = parentVMO.levelNdx + 1;
    }

    var childUid = childOccurrence.uid;
    //Find the childIndex in the childOccurences (if we can)
    var childIdx = -1;
    if( newChildIdx > -1 ) {
        childIdx = newChildIdx;
    } else {
        childIdx = _.findLastIndex( pagedChildOccurrences, function( co ) {
            return co.uid === childUid;
        } );

        //Child uid does not exist in the pagedChildOccs just add the end
        if( childIdx < 0 ) {
            childIdx = pagedChildOccurrences.length;
        }
    }

    //corner case not in pagedChildOccs and has no length it is truly empty
    if( childIdx < 0 ) {
        childIdx = 0;
    }

    //Create the viewModelTreeNode from the child ModelObject, child index and level index
    var childVMO = createVMNodeUsingOccInfo( childOccurrence, childIdx, childlevelIndex );
    //check if childObject is leaf or not
    childVMO.isLeaf = childOccurrence.leafFlag === undefined ? true : childOccurrence.leafFlag;

    //Add the new treeNode to the parentVMO (if one exists) children array
    if( parentVMO && parentVMO.children ) {
        parentVMO.children.push( childVMO );
        parentVMO.isLeaf = false;
        parentVMO.totalChildCount = parentVMO.children.length;
    }

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

    // insert the new treeNode in the viewModelCollection at the correct location
    viewModelCollection.loadedVMObjects.splice( newIndex, 0, childVMO );
}

/**
 * @param {SoaOccurrenceInfo} occInfo - Occurrence Information returned by server
 * @param {Number} childNdx - child Index
 * @param {Number} levelNdx - Level index
 * @param {String} pciUid - PCI uid of the element which this node is going to represent
 * @param {String} parentUid - Parent uid of vm node
 *
 * @return {ViewModelTreeNode} View Model Tree Node
 */
function createVMNodeUsingOccInfo( occInfo, childNdx, levelNdx, pciUid, parentUid ) {
    var displayName;
    if( occInfo.props.object_name.uiValues ) {
        displayName = typeof occInfo.props.object_name.uiValues === 'string' ? occInfo.props.object_name.uiValues : occInfo.props.object_name.uiValues[ 0 ];
    }
    var occUid = occInfo.uid;
    var type = occInfo.type;
    var props = occInfo.props;
    // var nChild = props && props.awb0NumberOfChildren ? props.awb0NumberOfChildren.dbValues[ 0 ] :
    //     occInfo.numberOfChildren;

    if( !displayName ) {
        displayName = occUid;
    }

    var iconURL = iconSvc.getTypeIconURL( type );

    var vmNode = awTableSvc.createViewModelTreeNode( occUid, type, displayName, levelNdx, childNdx, iconURL );

    // vmNode.isLeaf = nChild <= 0;
    vmNode.isLeaf = true;
    /**
     * "stableId" property on occurrence is intended to be used strictly for maintaining expansion state of nodes in
     * Tree views. DO NOT USE IT FOR OTHER PURPOSES.
     */
    vmNode.stableId = occInfo.stableId;
    vmNode.pciUid = pciUid;
    vmNode.parentUid = parentUid;

    return vmNode;
}

/***
 *** This method set selection on newly added 5Why object
 ***/

export let setSelection = function( data, ctx ) {
    if( data.eventData && data.eventData.createdObject ) {
        if( ctx.rootCauseContext.selectionModel && data.eventData.createdObject.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 || data.eventData.createdObject.modelType.typeHierarchyArray
            .indexOf( 'CAW0Ishikawa' ) > -1 ) {
            ctx.rootCauseContext.selectionModel.setSelection( data.eventData.createdObject.uid );
        }
    }
    // }
    // if( data.eventData.addElementResponse ) {
    //     if( data.eventData.addElementResponse.output[ 0 ].objects[ 0 ].type === 'CAW05Why' || data.eventData.addElementResponse.output[ 0 ].objects[ 0 ].type === 'CAW0Ishikawa' ) {
    //         ctx.rootCauseContext.selectionModel.setSelection( data.eventData.addElementResponse.ServiceData.created[ 0 ] );
    //     }
    // }
};

export default exports = {
    setAddElementResponse,
    addNewElement,
    setParentNode,
    updateTreeTableOnDelete,
    getUpdatedWhys,
    updateTreeTable,
    updateTreeTableForRootCause,
    setSelection
};
/**
 * @memberof NgServices
 * @member correctiveActionDataService
 */
app.factory( 'CAW0EditTreeStructure', () => exports );
