// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Defines {@link fullViewModeService} which manages the Universal Viewer full screen/view layout
 *
 * @module js/fullViewModeService
 */
import * as app from 'app';
import appContextService from 'js/appCtxService';
import _commandService from 'js/command.service';
import commandHandlerService from 'js/commandHandlerService';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Class names to reference elements for full screen mode
 */
var classesToHide = [ '.aw-layout-headerPanel', '.aw-layout-globalToolbarPanel',
    '.aw-layout-subLocationTitles', '.aw-layout-workareaTitle', '.afx-layout-header-container'
];

let _locationChangeSubscription = null;

/**
 * Determines if Full View Mode is currently active
 *
 * @param cssClass {String} - The class name to identify hidden content
 * @function isFullViewModeActive
 * @memberOf NgServices.fullViewModeService
 */
export let isFullViewModeActive = function( cssClass ) {
    var header = $( '.aw-layout-headerPanel' );
    if( header && header.hasClass( cssClass ) ) {
        return true;
    }
    return false;
};

/**
 * Removes specified CSS class name from elements
 *
 * @function removeClass
 * @param cssClass {String} - The class name to remove
 * @memberOf NgServices.fullViewModeService
 */
export let removeClass = function( cssClass ) {
    var elements = $( '.' + cssClass );
    if( elements && elements.length ) {
        for( var inx = 0; inx < elements.length; inx++ ) {
            $( elements[ inx ] ).removeClass( cssClass );
        }
    }
};

/**
 * Toggles command states
 *
 * @param commandId {String} - ID of target command
 * @param isEnabled {boolean} - True is command is enabled, false otherwise
 * @param isSelected {boolean} - True is command is selected, false otherwise
 * @function toggleCommandStates
 * @memberOf NgServices.fullViewModeService
 */
export let toggleCommandStates = function( commandId, isEnabled, isSelected ) {
    _commandService.getCommand( commandId ).then( function( command ) {
        if( command ) {
            commandHandlerService.setIsEnabled( command, isEnabled );
            commandHandlerService.setIsVisible( command, isEnabled );
            commandHandlerService.setSelected( command, isSelected );
        }
    } );
};

/**
 * Updates context for viewer command visibility
 *
 * @param commandId {String} - ID of target command
 * @param isVisible {boolean} - True if target command is visible, false otherwise
 * @function updateViewerCommandContext
 * @memberOf NgServices.fullViewModeService
 */
export let updateViewerCommandContext = function( commandId, isVisible ) {
    var context = appContextService.getCtx( 'viewerContext' );
    if( context && context.commands ) {
        var command = context.commands[ commandId ];
        var narrowModeActive = $( document ).width() < 460;
        if( narrowModeActive ) {
            command.visible = narrowModeActive;
        } else {
            command.visible = isVisible;
        }
    }
};

/**
 * Updates context for command visibility
 *
 * @param commandId {String} - ID of target command
 * @param isVisible {boolean} - True if target command is visible, false otherwise
 * @function updateApplicationCommandContext
 * @memberOf NgServices.fullViewModeService
 */
export let updateApplicationCommandContext = function() {
    //  var contextFullScreen = appContextService.ctx.fullscreen;
    var narrowModeActive = $( document ).width() < 460;
    if( narrowModeActive ) {
        appContextService.registerCtx( 'fullscreen', narrowModeActive );
    } else {
        eventBus.publish( 'commandBarResized', {} );
    }
};

/**
 * Toggles Full View Mode for Application. All other columns/sections other than Secondary workarea section will
 * be hidden/displayed based on current view state.
 *
 * @function toggleApplicationFullScreenMode
 * @memberOf NgServices.fullViewModeService
 */
export let toggleApplicationFullScreenMode = function() {
    // Check if One Step Full Screen command is active
    var fullViewModeActive = appContextService.getCtx( 'fullscreen' );
    var enabled = appContextService.ctx.fullscreen && !appContextService.ctx.aw_hosting_enabled;

    if( fullViewModeActive ) {
        // Exit full screen mode -- addition
        exports.removeClass( 'aw-viewerjs-hideContent' );
        document.body.classList.remove( 'aw-viewerjs-fullViewActiveBody' );

        // removing viewer css from sections
        var allColumns = $( '.aw-xrt-columnContentPanel, .aw-layout-column' );
        if( allColumns && allColumns.length ) {
            for( var col = 0; col < allColumns.length; col++ ) {
                if( allColumns[ col ].classList.contains( 'aw-viewerjs-fullViewActive' ) ) {
                    allColumns[ col ].classList.remove( 'aw-viewerjs-fullViewActive' );
                }
            }
        }

        // Update viewer command context
        var isFullScreenActive = exports.isFullViewModeActive( 'hidden' );
        exports.updateViewerCommandContext( 'fullViewMode', !isFullScreenActive );

        //Update application command context based on Selection and UiConfig Mode
        exports.updateApplicationCommandContext();
        exports.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        exports.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, false );
        // Update full screen command enabled state
        appContextService.registerCtx( 'fullscreen', !fullViewModeActive );

        // Exiting fullscreen so we can unsubscribe to the locationchangestart event
        if( _locationChangeSubscription ) {
            eventBus.unsubscribe( _locationChangeSubscription );
        }
    } else {
        /**
         * Class names to reference elements for full screen mode
         *
         * aw-layout-headerPanel", ".aw-layout-globalToolbarPanel",".aw-layout-subLocationTitles",
         * ".aw-commandId-Awp0ModelObjListDisplayToggles" These classes visibility are handled through ng-class.
         *
         * Update full screen command enabled state
         */

        exports.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        exports.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, true );

        //Update application command context
        exports.updateApplicationCommandContext();

        appContextService.registerCtx( 'fullscreen', !fullViewModeActive );
        exports.updateViewerCommandContext( 'fullViewMode', false );
    }
};
/**
 * Switch to full screen mode via universal viewer's fullscreen. It doesn't toggle as the exit fullscreen
 * functionality is overridden via
 *
 * @function toggleViewerFullScreenMode
 * @memberOf NgServices.fullViewModeService
 */
export let toggleViewerFullScreenMode = function() {
    // Switch to full screen mode via universal viewer's fullscreen
    for( var counter = 0; counter < classesToHide.length; counter++ ) {
        $( classesToHide[ counter ] ).addClass( 'aw-viewerjs-hideContent' );
    }

    // hide the panel section title and tab container if it is in SWA
    $( 'aw-sublocation-body' ).find( '.aw-layout-panelSectionTitle' ).addClass( 'aw-viewerjs-hideContent' );
    $( 'aw-sublocation-body' ).find( '.aw-xrt-tabsContainer' ).addClass( 'aw-viewerjs-hideContent' );

    // Hide the primary work area only when secondary work area is visible
    if( $( '.aw-layout-secondaryWorkarea' ).length > 0 && !$( '.aw-layout-secondaryWorkarea' ).hasClass( 'hidden' ) ) {
        $( '.aw-layout-primaryWorkarea' ).addClass( 'aw-viewerjs-hideContent' );
    }

    // Hide the Toggle Display Commands
    $( '.aw-commandbar-container .aw-commands-commandBarHorizontalLeft button#Awp0ModelObjListDisplayToggles' )
        .addClass( 'aw-viewerjs-hideContent' );

    // Hide sections excluding the one that contains viewer gallery
    var allColumnsInsideXRT = $( '.aw-xrt-columnContentPanel, .aw-layout-column, .aw-layout-panelSection' );
    // LCS-629518 - Limit hiding of elements to secondary work area or full show object when the object is opened.
    var allColumns = $( 'aw-secondary-workarea, aw-showobject-page' ).find( allColumnsInsideXRT );
    if( allColumns && allColumns.length > 0 ) {
        for( let column of allColumns ) {
            var checkViewIsPresent = $( column ).find( '.aw-viewer-gallery' );
            var viewForUserSettingsBar = $( column ).closest( '.aw-layout-headerContext, .global-navigation' );
            if( checkViewIsPresent && checkViewIsPresent.length ) {
                $( column ).addClass( 'aw-viewerjs-fullViewActive' );
            } else if( !viewForUserSettingsBar.length ) {
                $( column ).addClass( 'aw-viewerjs-hideContent' );
            }
        }
    }
    document.body.classList.add( 'aw-viewerjs-fullViewActiveBody' );
    appContextService.registerCtx( 'fullscreen', true );

    // Update full screen command enabled state
    exports.toggleCommandStates( 'Awp0FullScreen', false, false );
    exports.toggleCommandStates( 'Awp0ExitFullScreen', true, true );

    // Update viewer command context
    exports.updateViewerCommandContext( 'fullViewMode', false );

    // When leaving the location, check if full screen is enabled, if so, then disable it
    _locationChangeSubscription = eventBus.subscribe( '$locationChangeStart', function() {
        if( appContextService.ctx.fullscreen === true ) {
            exports.toggleApplicationFullScreenMode();
        }
    } );
};

// Initialize context variables

export default exports = {
    isFullViewModeActive,
    removeClass,
    toggleCommandStates,
    updateViewerCommandContext,
    updateApplicationCommandContext,
    toggleApplicationFullScreenMode,
    toggleViewerFullScreenMode
};

/**
 * The full view mode service
 *
 * @member fullViewModeService
 * @memberOf NgServices.fullViewModeService
 */
app.factory( 'fullViewModeService', () => exports );
