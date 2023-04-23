// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * A service that manages the unassigned command specific service.<br>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/partitionUnassignedService
 */
import app from 'app';
import occmgmtSplitViewUpdateService from 'js/occmgmtSplitViewUpdateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';

var exports = {};
var _addElementListener = null;
var _removeElementListener = null;

let refreshInactiveView = function() {
        var isUnassignedMode = appCtxSvc.getCtx( 'occmgmtContext2.supportedFeatures.Awb0UnassignedFeature' );
        if ( isUnassignedMode !== undefined && isUnassignedMode === true ) {
            var inactiveView = occmgmtSplitViewUpdateService.getInactiveViewKey();
            if ( inactiveView ) {
                eventBus.publish( 'acePwa.reset', { retainTreeExpansionStates: true, viewToReset: inactiveView, silentReload: true } );
            }
        }
};

export let initializeUnassignedService = function() {
    _addElementListener = eventBus.subscribe( 'addElement.elementsAdded', function( event ) {
        refreshInactiveView();
    } );

    _removeElementListener = eventBus.subscribe( 'ace.elementsRemoved', function( event ) {
        refreshInactiveView();
    } );

    eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if ( eventData.name === 'splitView' && appCtxSvc.ctx.occmgmtContext2 !== undefined ) {
            if ( ( _removeElementListener || _addElementListener ) && appCtxSvc.ctx.occmgmtContext2.supportedFeatures.Awb0UnassignedFeature !== undefined
                && appCtxSvc.ctx.occmgmtContext2.supportedFeatures.Awb0UnassignedFeature === true ) {
                eventBus.unsubscribe( _removeElementListener );
                eventBus.unsubscribe( _addElementListener );
            }
        }
    } );
};


export default exports = {
    initializeUnassignedService
};
/**
 * Service
 *
 * @memberof NgServices
 * @member partitionUnassignedService
 */
app.factory( 'partitionUnassignedService', () => exports );
