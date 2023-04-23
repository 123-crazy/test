// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module controls user adding On Screen 3D markups.
 *
 * @module js/viewer3dMarkupOnScreenService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import markupService from 'js/Awp0MarkupService';
import markupViewModel from 'js/MarkupViewModel';
import viewerSecondaryModelService from 'js/viewerSecondaryModel.service';
import messagingService from 'js/messagingService';
import eventBus from 'js/eventBus';

var exports = {};

var _vsLocationChangeSubscriber = null;
var _vsOpenCloseSubscriber = null;
var _vsAWWindowResizeSubscriber = null;
var _vsFullScreenEventSubscriber = null;

var addAnnotationButtonLabel = 'Add Markup';
var annotationWasAddedMsg = 'New markup was added.';
var addAnnotationErrorMsg = 'Error adding new markup';
var clearAnnotationsErrorMsg = 'Error removing all markups';
var noMarkupContextErrorMsg = 'A context could not be established for markup.';
var noUserSessionErrorMsg = 'Markup could not find a current user.';
localeSvc.getTextPromise( 'ViewerSnapshotMessages', true ).then( function( i18n ) {
    annotationWasAddedMsg = i18n[ '3dOnScreenAnnotationWasAdded' ];
    addAnnotationButtonLabel = i18n[ '3dOnScreenAddAnnotationButtonLabel' ];
    addAnnotationErrorMsg = i18n[ '3dOnScreenAddAnnotationErrorMsg' ];
    clearAnnotationsErrorMsg = i18n[ '3dOnScreenClearAnnotationsErrorMsg' ];
    noMarkupContextErrorMsg = i18n[ '3dOnScreenNoMarkupContextErrorMsg' ];
    noUserSessionErrorMsg = i18n[ '3dOnScreenNoUserSessionErrorMsg' ];
} );

//-----------------------------------------------------------------------------
/**
 * When the LocationChanged event is caught here, it means someone selected any other command/button in the
 * AW UI that transitions away from this snapshot-markup page/context.
 * Do cleanup of the environment and unsubscribe to any events.
 * @param {*} cmdCtx
 * @param {*} data
 */
function _VSLocationChangedEventHandler( cmdCtx, data ) { //$locationChangeStart
    if( cmdCtx.isUnmounting === true ) { // true when hitting home button, etc.
        // don't clean up when double clicking on part
        closeToolsAndInfoPanel(); // Close Panel via event (before removing the handlers)

        removeHandlersForImportantEvents();
        cmdCtx.display3dMarkupToolbar = undefined; // Clean up what we added to the context
        unRegisterOnScreen3dMarkupContext();
    }
}

//-----------------------------------------------------------------------------
/**
 * The OpenClose event is triggered twice, once for an open, and once for a close.  On the close, this happens for
 * both the clicking of the create button, or clicking of the close[x] button.  We'll handle either case the same way
 * by cleaning up the markup environment and getting ready for creation of another markup.
 * @param {*} vmo
 * @param {*} cmdCtx
 * @param {*} data
 */
function _VSOpenCloseEventHandler( vmo, cmdCtx, data ) { //awsidenav.openClose
    let OS3dMrkpCtx = getOnScreen3dMarkupContext();

    if( data.commandId === 'Awp0MarkupEditMain' ) {      // The markup panel is opening or closing
        OS3dMrkpCtx.isMarkupPanelOpen = !OS3dMrkpCtx.isMarkupPanelOpen;

        if( !OS3dMrkpCtx.isMarkupPanelOpen ) { // If the panel is closing, assure proper state of the tool.  (Nothing to do on open)
            onScreen3dSetTool( vmo, cmdCtx, null );
        }
    } else { // Another panel is being opened or closed, such as the Image Gallery
        OS3dMrkpCtx.isMarkupPanelOpen = false;

        if ( OS3dMrkpCtx.otherPanelName === '' ) { //opening new other panel, no other panel is open
            OS3dMrkpCtx.otherPanelName = data.commandId;
            OS3dMrkpCtx.isOtherPanelOpen = true;
            onScreen3dSetTool( vmo, cmdCtx, null ); // Clear the tool and start over
        } else if ( OS3dMrkpCtx.otherPanelName === data.commandId ) { //closing opened other panel
            OS3dMrkpCtx.isOtherPanelOpen = false;
            OS3dMrkpCtx.otherPanelName = '';
        } else { // switching to another other panel, so an other panel is still open
            OS3dMrkpCtx.otherPanelName = data.commandId;
            OS3dMrkpCtx.isOtherPanelOpen = true;
        }
    }
}

//-----------------------------------------------------------------------------
/**
 * Subscribe to the events that are of interest while in the snapshot markup context, such as button presses
 * that take the user out of the context of creating a markup for snapshot, opening/closing side panels and
 * window resize.
 * On receipt of these events, the context and markup system may need to be cleaned up.
 * @param {*} vmo
 * @param {*} cmdCtx
 */
function addHandlersForImportantEvents( vmo, cmdCtx ) {
    if( !_vsLocationChangeSubscriber ) {
        _vsLocationChangeSubscriber = eventBus.subscribe( '$locationChangeStart', function( eventData ) {
            onScreen3dSetTool( vmo, cmdCtx, null ); // Clear the tool and start over
            _VSLocationChangedEventHandler( cmdCtx, eventData );
        } );
    }
    if( !_vsOpenCloseSubscriber ) {
        _vsOpenCloseSubscriber = eventBus.subscribe( 'awsidenav.openClose', function( eventData ) {
            _VSOpenCloseEventHandler( vmo, cmdCtx, eventData );
        } );
    }
    if( !_vsAWWindowResizeSubscriber ) {
        _vsAWWindowResizeSubscriber = eventBus.subscribe( 'aw.windowResize', function() { // No event data is passed
            onScreen3dSetTool( vmo, cmdCtx, null ); // Clear the tool and start over
        } );
    }
    if( !_vsFullScreenEventSubscriber ) {
        _vsFullScreenEventSubscriber = eventBus.subscribe( 'commandBarResized', function() { // No event data is passed
            onScreen3dSetTool( vmo, cmdCtx, null ); // Clear the tool and start over
            closeToolsAndInfoPanel(); // Close Panel via event (before removing the handlers)
        } );
    }
}

//-----------------------------------------------------------------------------
/**
 * While in the snapshot markup context we're interested in certain events.
 * This function removes the handlers that we registered.
 */
function removeHandlersForImportantEvents() {
    eventBus.unsubscribe( _vsOpenCloseSubscriber );
    _vsOpenCloseSubscriber = null;
    eventBus.unsubscribe( _vsLocationChangeSubscriber );
    _vsLocationChangeSubscriber = null;
    eventBus.unsubscribe( _vsAWWindowResizeSubscriber );
    _vsAWWindowResizeSubscriber = null;
    eventBus.unsubscribe( _vsFullScreenEventSubscriber );
    _vsFullScreenEventSubscriber = null;
}

//-----------------------------------------------------------------------------
/**
 * The onScreen3dMarkupContext is responsible for holding the state related to markup including
 * the tool in use, panels opened or closed, etc.
 *
 * @param { ViewModelObject } vmo - the viewModelObject
 * @param { String } viewerType - this viewer type: 'aw-onscreen-3d-markup-viewer'
 */
function registerOnScreen3dMarkupContext( vmo, viewerType ) {
    const ctx = {
        isMarkupPanelOpen: false,
        isOtherPanelOpen: false,
        otherPanelName: '',
        tool: null
    };
    appCtxSvc.registerCtx( 'onScreen3dMarkupContext', ctx );

    if( !appCtxSvc.getCtx( 'viewer' ) ) {
        appCtxSvc.registerCtx( 'viewer', { activeViewerCommandCtx: 'awDefaultViewer' } );
    }

    if( !appCtxSvc.getCtx( 'viewerContext' ) ) {
        appCtxSvc.registerCtx( 'viewerContext', { vmo: vmo, type: viewerType } );
    }
}

//-----------------------------------------------------------------------------
/** Register the onScreen3dMarkupContext with the application context service. */
function unRegisterOnScreen3dMarkupContext() {
    appCtxSvc.unRegisterCtx( 'onScreen3dMarkupContext' );
    appCtxSvc.unRegisterCtx( 'viewerContext' );
}

//-----------------------------------------------------------------------------
/** Get the onScreen3dMarkupContext from the application context service. */
function getOnScreen3dMarkupContext() {
    return appCtxSvc.getCtx( 'onScreen3dMarkupContext' );
}

//-----------------------------------------------------------------------------
/**
 * Set the override functions
 *
 * @param { ViewModelObject } vmo - the viewModelObject
 * @param { String } viewerType - this viewer type: 'aw-onscreen-3d-markup-viewer'
 */
function setOverrideFunctions( vmo, viewerType ) {
    const response = {
        version: '',
        message: 'author',
        markups: '[]'
    };

    markupService.setOverrideLoad( viewerType, function() {
        markupService.processMarkups( response );
    } );

    markupService.setOverrideSave( viewerType, function( baseObject, version, markup ) {
        const json = '[' + markupViewModel.stringifyMarkup( markup ) + ']';
        const container = document.getElementById( 'awStructureViewer' );
        const canvas = container.getElementsByTagName( 'canvas' );
        const rect = canvas && canvas.length > 0 ? canvas[0] : container.getBoundingClientRect();

        viewerSecondaryModelService.addAnnotationLayerInfo( 'awDefaultViewer', json, rect.height, rect.width )
        .then( function( flatBuffer ) {
            // do nothing at this time for success result
        }, function( error ) {
            messagingService.showError( addAnnotationErrorMsg );
        } );

        markupService.processMarkups( response );
    } );

    markupService.setOverrideUiOptions( viewerType, function( baseObject, version, markup ) {
        let options = {
            showTextTab: false,
            showCreateStamp: false,
            showOnPageVisible: false,
            applyOnPageVisible: false,
            showShareAs: false,
            allowCorner: false,
            allowInsertImage: false,
            saveButtonText: addAnnotationButtonLabel
        };

        if( markup && markup.geometry && markup.geometry.list && markup.geometry.list.length === 1 ) {
            const geom = markup.geometry.list[0];
            if( geom.shape === 'rectangle' ) {
                markup.showOnPage = 'all';
                options.showTextTab = true;
                options.applyOnPageVisible = true;
            }
        }

        return options;
    } );
}

//-----------------------------------------------------------------------------
/** Close any tools and info panels open. */
function closeToolsAndInfoPanel() {
    var activeToolAndInfoCmd = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( activeToolAndInfoCmd && activeToolAndInfoCmd.commandId ) {
        eventBus.publish( 'awsidenav.openClose', {
            id: 'aw_toolsAndInfo',
            commandId: activeToolAndInfoCmd.commandId
        } );
    }
}

//-----------------------------------------------------------------------------
// Exported markup functions
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
/**
 * Entry point for the 3dOnScreen markup toolbar and context.
 * @param {*} vmo
 * @param {*} cmdCtx
 */
export let onScreen3dStartMarkup = function( vmo, cmdCtx ) {
    if ( !vmo || !cmdCtx ) {
        return;
    }
    cmdCtx.display3dMarkupToolbar = !cmdCtx.display3dMarkupToolbar;  // Toggle
    closeToolsAndInfoPanel(); // Close Panel if any open

    const viewerType = 'aw-onscreen-3d-markup-viewer';
    if( cmdCtx.display3dMarkupToolbar ) {
        setOverrideFunctions( vmo, viewerType );
        registerOnScreen3dMarkupContext( vmo, viewerType );
        markupService.setContext();
        onScreen3dSetTool( vmo, cmdCtx, 'freehand' ); // make freehand default tool and enable it
        addHandlersForImportantEvents( vmo, cmdCtx );
    } else {
        onScreen3dSetTool( vmo, cmdCtx, null );
        unRegisterOnScreen3dMarkupContext();
        removeHandlersForImportantEvents();
    }
};

//-----------------------------------------------------------------------------
/**
 * This function processes the user input of wanting to remove all active markups. Actual
 * work is done in the MarkupOnScreen3d module.
 * @param {*} vmo
 * @param {*} cmdCtx
 */
export let onScreen3dRemoveAllAnnotations = function( vmo, cmdCtx ) {
    viewerSecondaryModelService.removeAllAnnotationLayerInfo( 'awDefaultViewer' )
    .then( function() {
       // do nothing at this time for success result
    }, function() {
        messagingService.showError( clearAnnotationsErrorMsg );
    } );
};


//-----------------------------------------------------------------------------
/**
 * Selection of the tool & subTool.  This handles the various states and transitions when selecting
 * different tools, taking into account other state such as open panels in the onScreen3dMarkupContext.
 * Current tool state must be one of "none", "freehand", or "shape".  Incoming data to trigger a transition
 * can be one of those, plus the subtool of the markup shape tool.
 * @param {*} vmo
 * @param {*} cmdCtx
 * @param {*} tool
 * @param {*} subTool
 */
export let onScreen3dSetTool = function( vmo, cmdCtx, tool, subTool ) {
    let OS3dMrkpCtx = getOnScreen3dMarkupContext();
    if( !OS3dMrkpCtx || !vmo || !cmdCtx ) {
        return;
    }

    if( OS3dMrkpCtx.isMarkupPanelOpen ) {
        closeToolsAndInfoPanel(); // Close the markup panel
        return;
    } else if( OS3dMrkpCtx.isOtherPanelOpen ) {
        closeToolsAndInfoPanel(); // Close any right-hand panel before continuing to enable markup
        // and continue. . .
    }

    if( tool === 'shape' && subTool !== 'rectangle' && subTool !== 'ellipse' && subTool !== 'arrow' ) {
        // Default and/or catch unintended lack of shape
        subTool = 'rectangle';
    }

    let newTool = OS3dMrkpCtx.tool === tool && OS3dMrkpCtx.subTool === subTool ? null : tool;
    let newSubTool = newTool === 'shape' ? subTool : undefined;
    markupService.selectTool( newTool, newSubTool );

    appCtxSvc.updatePartialCtx( 'onScreen3dMarkupContext.tool', newTool );
    appCtxSvc.updatePartialCtx( 'onScreen3dMarkupContext.subTool', newSubTool );
};

//-----------------------------------------------------------------------------
export default exports = {
    onScreen3dStartMarkup,
    onScreen3dSetTool,
    onScreen3dRemoveAllAnnotations
};

/**
 * This service contributes to Viewer Snapshots in ActiveWorkspace Visualization
 *
 * @member viewer3dMarkupOnScreenService
 * @memberof NgServices
 */
app.factory( 'viewer3dMarkupOnScreenService', () => exports );
