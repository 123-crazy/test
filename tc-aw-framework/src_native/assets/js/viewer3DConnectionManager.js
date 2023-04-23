// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines {@link NgServices.viewer3DConnectionManager} manages the lifecycle of viewer connections
 *
 * @module js/viewer3DConnectionManager
 */
import * as app from 'app';
import viewerContextService from 'js/viewerContext.service';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

let exports = {};
var awp0OpenGroupEvent = null;
var doExportDocumentEvent = null;
var downloadImageCaptureEvent = null;
var downloadImageCaptureUvEvent = null;
var workinstrDownloadEventSubscription = null;
var beforeUnloadEventHandlerRegistered = false;
var skipBeforeUnloadCall = false;
var userSignOutEvent = null;
var commandsWithOpenWindowCall = [ 'Awp0OpenVVI', 'Awn0OpenNxTcXml', 'Awp0ViewFile', 'Awp0ViewFileForUV' ];

/**
 * Register browser unload listener
 */
export let registerBrowserUnloadListener = () => {
    if( !beforeUnloadEventHandlerRegistered ) {
        beforeUnloadEventHandlerRegistered = true;
        registerListenerToListenWindowOpenCommands();
        registerListenerToListenSignOut();
        $( window ).on( 'beforeunload', () => {
            if( skipBeforeUnloadCall ) {
                exports.setSkipBeforeUnloadCall( false );
            } else {
                viewerContextService.handleBrowserUnload( true );
            }
        } );
    }
};

export let setSkipBeforeUnloadCall = ( shouldBeSkipped ) => {
    skipBeforeUnloadCall = shouldBeSkipped;
};

export let getSkipBeforeUnloadCall = () => {
    return skipBeforeUnloadCall;
};

const registerListenerToListenWindowOpenCommands = () => {
    if( awp0OpenGroupEvent === null ) {
        awp0OpenGroupEvent = eventBus.subscribe( 'Awp0OpenGroup.popupCommandExecuteStart', ( eventData ) => {
            if( _.includes( commandsWithOpenWindowCall, eventData ) ) {
                exports.setSkipBeforeUnloadCall( true );
            }
        }, 'viewer3DConnectionManager' );
    }

    if( doExportDocumentEvent === null ) {
        doExportDocumentEvent = eventBus.subscribe( 'exportToOfficeUtil.doExportDocumentEvent', () => {
            exports.setSkipBeforeUnloadCall( true );
        }, 'viewer3DConnectionManager' );
    }

    if( downloadImageCaptureEvent === null ) {
        downloadImageCaptureEvent = eventBus.subscribe( 'Awp0ShareGroup.popupCommandExecuteStart', ( eventData ) => {
            if( _.includes( commandsWithOpenWindowCall, eventData ) ) {
                exports.setSkipBeforeUnloadCall( true );
            }
        }, 'viewer3DConnectionManager' );
    }

    if( downloadImageCaptureUvEvent === null ) {
        downloadImageCaptureUvEvent = eventBus.subscribe( 'aw_universalViewerLink.popupCommandExecuteStart', ( eventData ) => {
            if( _.includes( commandsWithOpenWindowCall, eventData ) ) {
                exports.setSkipBeforeUnloadCall( true );
            }
        }, 'viewer3DConnectionManager' );
    }

    if( workinstrDownloadEventSubscription === null ) {
        workinstrDownloadEventSubscription = eventBus.subscribe( 'aw-command-logEvent', function( data ) {
            if( data && ( data.sanCommandId === 'workinstr0DownloadSnapshotImg' ||
                    data.sanCommandId === 'openVVIProductSnapshotThumbnailCommand' ||
                    data.sanCommandId === 'openVVIProductSnapshotCellCommand' ||
                    data.sanCommandId === 'Awp0OpenVVI' ) ||
                    data.sanCommandId === 'Ac0OpenVVIDiscussion' ) {
                exports.setSkipBeforeUnloadCall( true );
            }
        }, 'viewer3DConnectionManager' );
    }
};

const registerListenerToListenSignOut = () => {
    if( userSignOutEvent === null ) {
        userSignOutEvent = eventBus.subscribe( 'progress.start', ( eventData ) => {
            if( eventData && eventData.endPoint && _.includes( eventData.endPoint, 'logout' ) ) {
                viewerContextService.handleBrowserUnload( true );
            }
        }, 'viewer3DConnectionManager' );
    }
};

export default exports = {
    registerBrowserUnloadListener,
    setSkipBeforeUnloadCall,
    getSkipBeforeUnloadCall
};
/**
 * Viewer connection manager
 *
 * @class viewer3DConnectionManager
 * @param  {Object} viewerContextService - viewerContextService
 * @memberOf NgServices
 */
app.factory( 'viewer3DConnectionManager', () => exports );
