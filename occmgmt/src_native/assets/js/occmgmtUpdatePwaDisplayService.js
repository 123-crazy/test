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
 * @module js/occmgmtUpdatePwaDisplayService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import editHandlerSvc from 'js/editHandlerService';
import occmgmtUtils from 'js/occmgmtUtils';
import occmgmtSplitViewUpdateService from 'js/occmgmtSplitViewUpdateService';
import soa_kernel_soaService from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * {EventSubscriptionArray} Collection of eventBuss subscriptions to be removed when the controller is
 * destroyed.
 */
var _eventSubDefs = [];

var exports = {};

export let resetPwaContents = function( data ) {
    if( editHandlerSvc.editInProgress().editInProgress ) {
        editHandlerSvc.leaveConfirmation().then( function() {
            refreshPWA( data );
        } );
    } else {
        refreshPWA( data );
    }
};

var refreshPWA = function( data ) {
    if( occmgmtUtils.isTreeView() ) {
        var retainTreeExpansionStates = data ? data.retainTreeExpansionStates : null;
        if( appCtxSvc.ctx.aceActiveContext.context.requestPref ) {
            appCtxSvc.ctx.aceActiveContext.context.retainTreeExpansionStates = typeof retainTreeExpansionStates === 'boolean' ? retainTreeExpansionStates : true;
            appCtxSvc.ctx.aceActiveContext.context.requestPref.resetTreeDisplay = true;
        }
    }
    eventBus.publish( 'awDataNavigator.reset', data );
};

var _purgeExpandedNode = function( expandedNode, vmc ) {

    if( vmc ) {
        var vmNodes = vmc.loadedVMObjects;

        //Collapse Expanded Object Logic.
        var begNdx = -1;
        var nDelete = 0;

        for( var ndx = 0; ndx < vmNodes.length; ndx++ ) {
            if( vmNodes[ ndx ].id === expandedNode.id ) {
                begNdx = ndx + 1;
                nDelete = 0;
            } else if( begNdx >= 0 ) {
                if( vmNodes[ ndx ].levelNdx > expandedNode.levelNdx ) {
                    nDelete++;
                } else {
                    expandedNode.children = null;
                    break;
                }
            }
        }

        if( nDelete > 0 ) {
            expandedNode.children = null;
            expandedNode.startChildNdx = 0;
            expandedNode.totalChildCount = null;

            vmNodes.splice( begNdx, nDelete );
        }
    }
};

var refreshUpdatedElements = function( data ) {
    var elementsToRefresh = getAffectedElementsWhoseUnderlyingObjectIsModified( data );
    elementsToRefresh = elementsToRefresh.concat( getAffectedElementsWhosePropertiesAreModified( data ) );
    elementsToRefresh = _.uniq( elementsToRefresh );
    if( elementsToRefresh.length ) {
        soa_kernel_soaService.post( 'Core-2007-01-DataManagement', 'refreshObjects', {
            objects: elementsToRefresh
        } );
    }
};

var getAffectedElementsWhosePropertiesAreModified = function( data ) {
    var objectsInInactiveViewWithModifiedProps = [];
    if( occmgmtUtils.isTreeView() && appCtxSvc.ctx.aceActiveContext.context.vmc && occmgmtSplitViewUpdateService.getInactiveViewKey() && !occmgmtSplitViewUpdateService.isConfigSameInBothViews() ) {
        var activeViewEditHandler = editHandlerSvc.getActiveEditHandler();
        var dataSource = activeViewEditHandler ? activeViewEditHandler.getDataSource() : null;
        var _modProps = dataSource ? dataSource.getAllModifiedProperties() : null;
        if( _modProps && _modProps.length > 0 ) {
            var inactiveViewKey = occmgmtSplitViewUpdateService.getInactiveViewKey();
            _.forEach( data.updatedObjects, function _iterateUpdatedObjects( updatedObj ) {
                if( updatedObj.modelType.typeHierarchyArray.indexOf( 'Awb0Element' ) > -1 ) {
                    var affectedElementsInView = occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( inactiveViewKey, updatedObj );
                    _.forEach( affectedElementsInView, function( affectedElement ) {
                        var isAffectedElementAlreadyRefreshed = data.updatedObjects.filter( function( mo ) {
                            return mo.uid === affectedElement.id;
                        } ).length > 0;
                        if( !isAffectedElementAlreadyRefreshed ) {
                            objectsInInactiveViewWithModifiedProps.push( affectedElement );
                            // Force refresh of updated object to avoid continuous refreshObject SOA call.(LCS-304255)
                            objectsInInactiveViewWithModifiedProps.push( updatedObj );
                        }
                    } );
                }
            } );
        }
    }
    return objectsInInactiveViewWithModifiedProps;
};

var getAffectedElementsWhoseUnderlyingObjectIsModified = function( data ) {
    var affectedElementsToRefresh = [];

    // Get Selected Elements in Active View
    var affectedElementsInView = appCtxSvc.ctx.mselected.slice();

    //Get Affected Elements in inactive View
    var inactiveViewKey = occmgmtSplitViewUpdateService.getInactiveViewKey();
    if( inactiveViewKey && appCtxSvc.ctx[ inactiveViewKey ] && appCtxSvc.ctx[ inactiveViewKey ].vmc && !occmgmtSplitViewUpdateService.isConfigSameInBothViews() ) {
        _.forEach( appCtxSvc.ctx.mselected, function( modelObject ) {
            var affectedElementsInInactiveView = occmgmtSplitViewUpdateService.getAffectedElementsPresentInGivenView( inactiveViewKey, modelObject );
            affectedElementsInView = affectedElementsInView.concat( affectedElementsInInactiveView );
        } );
    }

    _.forEach( affectedElementsInView, function( affectedElement ) {
        var underlyingObjectUid = !_.isUndefined( affectedElement.props ) && !_.isUndefined( affectedElement.props.awb0UnderlyingObject ) ?
            affectedElement.props.awb0UnderlyingObject.dbValues[ 0 ] : null;
        var isUnderlyingObjectModified = data.updatedObjects.filter( function( mo ) {
            return mo.uid === underlyingObjectUid;
        } ).length > 0;
        if( isUnderlyingObjectModified ) {
            var isAffectedElementAlreadyRefreshed = data.updatedObjects.filter( function( mo ) {
                return mo.uid === affectedElement.uid;
            } ).length > 0;
            if( !isAffectedElementAlreadyRefreshed ) {
                affectedElementsToRefresh.push( affectedElement );
            }
        }
    } );

    return affectedElementsToRefresh;
};

var updateParentVmoOfDeleted = function( deletedVmo, vmc ) {
    var parentObjectUid = occmgmtUtils.getParentUid( deletedVmo );
    if( vmc ) {
        var parentVmoNdx = vmc.findViewModelObjectById( parentObjectUid );
        var parentObject = vmc.getViewModelObject( parentVmoNdx );
        if( parentObject && parentObject.children && parentObject.children.length ) {
            _.remove( parentObject.children, function( childVmo ) {
                return childVmo.uid === deletedVmo.uid;
            } );
            parentObject.totalChildCount = parentObject.children.length;
        }
    }
};

const updateVMCforDeletedNodes = ( eventData, vmc ) => {
    _.forEach( eventData.deletedObjectUids, function( deletedObjectUid ) {
        _.forEach( vmc.loadedVMObjects, function( vmo ) {
            if( vmo && deletedObjectUid === vmo.uid && vmo.isExpanded ) {
                _purgeExpandedNode( vmo, vmc );
            }
            //Update the parent VMO of deleted uids to reflect the correct children properties ( Drag-Drop, cut, remove)
            if( vmo && deletedObjectUid === vmo.uid ) {
                updateParentVmoOfDeleted( vmo, vmc );
            }
        } );
    } );
};

export let initialize = function() {
    _eventSubDefs.push( eventBus.subscribe( 'acePwa.reset', function( data ) {
        exports.resetPwaContents( data );
    } ) );

    //Setup a listener for cdm.deleted object (will be unregistered onDestroy)
    _eventSubDefs.push( eventBus.subscribe( 'cdm.deleted', function( eventData ) {
        //Check to see if anything was deleted and the current display view mode is tree
        if( appCtxSvc.ctx.aceActiveContext && eventData && eventData.deletedObjectUids && eventData.deletedObjectUids.length > 0 ) {
            if( appCtxSvc.ctx.aceActiveContext.context.vmc ) {
                updateVMCforDeletedNodes( eventData, appCtxSvc.ctx.aceActiveContext.context.vmc );
            }
            var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
            if( inactiveView ) {
                if( occmgmtSplitViewUpdateService.isConfigSameInBothViews() ) {
                    updateVMCforDeletedNodes( eventData, appCtxSvc.ctx[ inactiveView ].vmc );
                }
            }

            if( appCtxSvc.ctx.aceActiveContext.context.elementToPCIMap ) {
                var elementUidsInElementToPCIMap = Object
                    .keys( appCtxSvc.ctx.aceActiveContext.context.elementToPCIMap );
                var keysToRemoveFromElementToPciMap = _.intersection(
                    elementUidsInElementToPCIMap, eventData.deletedObjectUids );

                if( keysToRemoveFromElementToPciMap.length ) {
                    _.forEach( keysToRemoveFromElementToPciMap, function( keyToRemoveFromElementToPciMap ) {
                        delete appCtxSvc.ctx.aceActiveContext.context.elementToPCIMap[ keyToRemoveFromElementToPciMap ];
                    } );

                    var elementsInElementToPCIMap = Object.keys( appCtxSvc.ctx.aceActiveContext.context.elementToPCIMap );
                    appCtxSvc.updatePartialCtx( 'aceActiveContext.context.elementToPCIMapCount', elementsInElementToPCIMap.length );
                }
            }
        }
    } ) );

    _eventSubDefs.push( eventBus.subscribe( 'cdm.updated', function( data ) {
        refreshUpdatedElements( data );
    } ) );
};

export let destroy = function() {
    _.forEach( _eventSubDefs, function( subDef ) {
        eventBus.unsubscribe( subDef );
    } );
};

export default exports = {
    resetPwaContents,
    initialize,
    destroy
};
app.factory( 'occmgmtUpdatePwaDisplayService', () => exports );
