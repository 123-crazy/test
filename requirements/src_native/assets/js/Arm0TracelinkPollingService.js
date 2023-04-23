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
 * Defines {@link arm0TracelinkPollingService}
 *
 * @module js/Arm0TracelinkPollingService
 * @requires app
 * @requires angulare
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import popupService from 'js/popupService';
import arm0CreateTraceLinkPopup from 'js/Arm0CreateTraceLinkPopupService';
import eventBus from 'js/eventBus';
import localStrg from 'js/localStorage';

let exports = {};

/**
 * Setup to listen to get Tracelink Popup data updated events.
 */
function subscribeEventToHandleTracelinkData() {
    localStrg.subscribe( 'CreateTraceLinkPopup', function( eventData ) {
        setTimeout( function() {
            var traceLinkStorage = localStrg.get( 'CreateTraceLinkPopup' );
            if( !traceLinkStorage ) {
                eventBus.publish( 'CreateTracelinkPopup.Close' );
            } else {
                // Check if popup is shown, if not open it
                if( !appCtxService.ctx.CreateTraceLinkPopupCtx ) {
                    arm0CreateTraceLinkPopup.openTracelinkPopup();
                } else {
                    // If popup already opened, update objects on panel
                    eventBus.publish( 'createTracelink.initStartItemList' );
                }
            }
        }, 100 );
    } );
}

/**
 * Initialize the polling service
 */
export let init = function() {
    // Check AW session
    var traceLinkStorageAwSession = localStrg.get( 'CreateTraceLinkPopupAWSession' );
    var awSession = localStrg.get( 'awSession' );
    if( traceLinkStorageAwSession !== awSession ) {
        localStrg.removeItem( 'CreateTraceLinkPopup' );
    }
    // Check if tracelink popup in localcache, if found open
    var traceLinkStorage = localStrg.get( 'CreateTraceLinkPopup' );
    var locationChangeEventSub;
    var gatewayContentEventSub;
    var traceabilityMatrixContentLoadedEventSub;
    if( traceLinkStorage ) {
        locationChangeEventSub = eventBus.subscribe( 'gwt.SubLocationContentSelectionChangeEvent',
            function() {
                eventBus.unsubscribe( locationChangeEventSub );
                eventBus.unsubscribe( gatewayContentEventSub );
                eventBus.unsubscribe( traceabilityMatrixContentLoadedEventSub );
                setTimeout( function() {
                    arm0CreateTraceLinkPopup.openTracelinkPopup();
                }, 100 );
            } );
        // event when gateway page
        gatewayContentEventSub = eventBus.subscribe( 'gateway.contentLoaded',
            function() {
                eventBus.unsubscribe( locationChangeEventSub );
                eventBus.unsubscribe( gatewayContentEventSub );
                eventBus.unsubscribe( traceabilityMatrixContentLoadedEventSub );
                setTimeout( function() {
                    arm0CreateTraceLinkPopup.openTracelinkPopup();
                }, 100 );
            } );
        // event when Traceability Matrix page
        traceabilityMatrixContentLoadedEventSub = eventBus.subscribe( 'Arm0TraceabilityMatrix.contentLoaded',
            function() {
                eventBus.unsubscribe( locationChangeEventSub );
                eventBus.unsubscribe( gatewayContentEventSub );
                eventBus.unsubscribe( traceabilityMatrixContentLoadedEventSub );
                setTimeout( function() {
                    arm0CreateTraceLinkPopup.openTracelinkPopup();
                }, 100 );
            } );
    }

    subscribeEventToHandleTracelinkData();
};

export default exports = {
    init
};
/**
 *
 *
 * @memberof NgServices
 */
app.factory( 'arm0TracelinkPollingService', () => exports );
