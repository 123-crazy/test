// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Defines {@link qfm0FullViewModelServices} which manages the Universal Viewer full screen/view layout
 *
 * @module js/qfm0FullViewModelServices
 */
import app from 'app';
import eventBus from 'js/eventBus';
import fullModeServ from 'js/fullViewModeService';
import $ from 'jquery';
import appContextService from 'js/appCtxService';

var exports = {};



/**
 * Toggles Full View Mode for Application. All other columns/sections other than Secondary workarea section will
 * be hidden/displayed based on current view state.
 *
 * @function toggleApplicationFullScreenMode
 * @memberOf NgServices.qfm0FullViewModelServices
 */
export let toggleApplicationFullScreenMode = function() {
    // Check if One Step Full Screen command is active
    var fullViewModeActive = appContextService.getCtx( 'fullscreen' );
    var enabled = appContextService.ctx.fullscreen && !appContextService.ctx.aw_hosting_enabled;

    if( fullViewModeActive ) {
        // Exit full screen mode -- addition
        fullModeServ.removeClass( 'aw-viewerjs-hideContent' );
        document.body.classList.remove( 'aw-viewerjs-fullViewActiveBody' );

        // removing viewer css from sections
        var allColumns = $( '.aw-xrt-columnContentPanel, .aw-layout-column' );
        if( allColumns && allColumns.length ) {
            for( var col = 0; col < allColumns.length; col++ ) {
                allColumns[ col ].classList.contains( 'aw-viewerjs-fullViewActive' ) ? allColumns[ col ].classList.remove( 'aw-viewerjs-fullViewActive' ) : null;
            }
        }

        // Update viewer command context
        var isFullScreenActive = fullModeServ.isFullViewModeActive( 'hidden' );
        fullModeServ.updateViewerCommandContext( 'fullViewMode', !isFullScreenActive );

        //Update application command context based on Selection and UiConfig Mode
        fullModeServ.updateApplicationCommandContext();
        fullModeServ.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        fullModeServ.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, false );
        // Update full screen command enabled state
        appContextService.registerCtx( 'fullscreen', !fullViewModeActive );
    } else {
        /**
         * Class names to reference elements for full screen mode
         *
         * aw-layout-headerPanel", ".aw-layout-globalToolbarPanel",".aw-layout-subLocationTitles",
         * ".aw-commandId-Awp0ModelObjListDisplayToggles" These classes visibility are handled through ng-class.
         *
         * Update full screen command enabled state
         */
        $( '.aw-xrt-tabsContainer' ).addClass( 'aw-viewerjs-hideContent' );

        fullModeServ.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        fullModeServ.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, true );

        //Update application command context
        fullModeServ.updateApplicationCommandContext();

        appContextService.registerCtx( 'fullscreen', !fullViewModeActive );
        fullModeServ.updateViewerCommandContext( 'fullViewMode', false );
    }
    eventBus.publish("Gc1TestHarness.graphUpdated");
};

export default exports = {
    toggleApplicationFullScreenMode
};

/**
 * The full view mode service
 *
 * @member qfm0FullViewModelServices
 * @memberOf NgServices.qfm0FullViewModelServices
 */
app.factory( 'qfm0FullViewModelServices', () => exports );
