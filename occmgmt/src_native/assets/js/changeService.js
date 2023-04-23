//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/changeService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import occmgmtUtils from 'js/occmgmtUtils';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

var _aceElementRemovedEvent = null;

var _aceElementDragDropEvent = null;

/**
 * Related the children based on input element uid.
 *
 * @param {String} parentUid Parent element Uid that need to be reloaded
 */
var _reloadParent = function( parentUid ) {
    if( !parentUid ) {
        return;
    }
    var vmoId = appCtxSvc.ctx.aceActiveContext.context.vmc.findViewModelObjectById( parentUid );
    if( vmoId !== -1 ) {
        var vmo = appCtxSvc.ctx.aceActiveContext.context.vmc.loadedVMObjects[ vmoId ];
        delete vmo.isExpanded;
        vmo.isInExpandBelowMode = false;
        eventBus.publish( 'occTreeTable.plTable.toggleTreeNode', vmo );
        vmo.isExpanded = true;
        delete vmo.__expandState;
        delete vmo.loadingStatus;
        eventBus.publish( 'occTreeTable.plTable.toggleTreeNode', vmo );
    }
};


/**
 * Initializes Change service.
 */
export let initialize = function() {
    if( _aceElementRemovedEvent === null ) {
        _aceElementRemovedEvent = eventBus.subscribe( 'ace.elementsRemoved', function( eventData ) {
            var operationName = '';
            if(eventData.operationName) {
                operationName = eventData.operationName;
            }

            if( occmgmtUtils.isTreeView() && operationName === 'removeElement' && appCtxSvc.ctx.aceActiveContext.context.isChangeEnabled ) {
                var parentUid = occmgmtUtils.getParentUid( appCtxSvc.ctx.selected );
                _reloadParent( parentUid );
            }
        } );
    }
    if( _aceElementDragDropEvent === null ) {
        _aceElementDragDropEvent = eventBus.subscribe( 'ace.elementsMoved', function() {
            if( occmgmtUtils.isTreeView() && appCtxSvc.ctx.aceActiveContext.context.isChangeEnabled
                && appCtxSvc.ctx.aceActiveContext.context.addElementInput
                && appCtxSvc.ctx.aceActiveContext.context.addElementInput.moveParentElementUids ) {

                var moveParentElementUids = appCtxSvc.ctx.aceActiveContext.context.addElementInput.moveParentElementUids;
                _.forEach( moveParentElementUids, function ( parentUid ) {
                    _reloadParent( parentUid );
                });
            }
        } );
    }
};

export let destroy = function() {
    if( _aceElementRemovedEvent ) {
        eventBus.unsubscribe( _aceElementRemovedEvent );
        _aceElementRemovedEvent = null;
    }

    if( _aceElementDragDropEvent ) {
        eventBus.unsubscribe( _aceElementDragDropEvent );
        _aceElementDragDropEvent = null;
    }
};

/**
 * Show BOM Change Configuration service utility
 * @param {appCtxService} appCtxSvc - Service to use
 * @param {occmgmtUtils} occmgmtUtils - Service to use
 * @returns {object} - object
 */

export default exports = {
    initialize,
    destroy
};
app.factory( 'changeService', () => exports );
