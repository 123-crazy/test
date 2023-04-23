// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines {@link NgServices.viewerProgressIndicatorService} which provides utility to initialize viewer progress indicator.
 *
 * @module js/viewerProgressIndicatorService
 * @requires app
 */
import * as app from 'app';
import eventBus from 'js/eventBus';

/**
 * reference to self
 */
let exports = {};

/**
 * Flag to identify progress indicator initialization.
 */
var isProgessIndicatorInitialised = false;

/**
 * Flags set to track status of request queue created to publish progress indicator events.
 */
var emmStart = null;

/**
 * Allows initialization of viewer progress indicator life cycle.
 *
 * @param {Object} view - Viewer view on which progress indicator is to be initialized for.
 * @param {String} viewerCtxName - Viewer context name
 */
export let init = function( view, viewerCtxName ) {
    if( !isProgessIndicatorInitialised ) {
        var listener = generateListener( viewerCtxName );
        view.listenerMgr.addBusyListener( listener );
    }
};

/**
 * Creates a listener object to be passed on to Viewer Listener Manager.
 * @param {String} viewerCtxName - Viewer context name
 * @returns {Object} listener object
 */
var generateListener = function( viewerCtxName ) {
    var listener = {
        emmSeriesStart: function() {
            if( !emmStart ) {
                emmStart = setTimeout( function() {
                    publishEmmEvent( true, viewerCtxName );
                }, 2000 );
            }
        },
        emmSeriesEnd: function() {
            if( emmStart ) {
                clearTimeout( emmStart );
                emmStart = null;
            }
            eventBus.publish( 'emmProgressIndicator', {
                emmProgressIndicatorStatus: false,
                viewerContext: viewerCtxName
            } );
        },
        renderStart: function() {
            eventBus.publish( 'progressIndicator', {
                progressIndicatorStatus: true,
                viewerContext: viewerCtxName
            } );
        },
        renderEnd: function() {
            eventBus.publish( 'progressIndicator', {
                progressIndicatorStatus: false,
                viewerContext: viewerCtxName
            } );

        }
    };
    return listener;
};

var publishEmmEvent = function( statusFlag, viewerCtxName ) {
    eventBus.publish( 'emmProgressIndicator', {
        emmProgressIndicatorStatus: statusFlag,
        viewerContext: viewerCtxName
    } );
    emmStart = null;

};

export default exports = {
    init
};
/**
 * Service to initialize viewer progress indicator life cycle.
 *
 * @class viewerProgressIndicatorService
 * @memberOf NgServices
 */
app.factory( 'viewerProgressIndicatorService', () => exports );
