// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Defines {@link classifyFullViewModeService} which manages the full screen for change summary
 *
 * @module js/classifyFullViewModeService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import fullModeServ from 'js/fullViewModeService';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Class names to reference elements for full screen mode
 */
var classesToHide = [ '.aw-layout-headerPanel', '.aw-layout-globalToolbarPanel',
    '.aw-layout-subLocationTitles', '.aw-layout-workareaTitle', '.afx-layout-header-container'
];


export let updateApplicationCommandContext = function() {
    //  var contextFullScreen = appCtxSvc.ctx.fullscreen;
    var narrowModeActive = $( document ).width() < 460;
    if( narrowModeActive ) {
        appCtxSvc.registerCtx( 'classifyFullscreen', narrowModeActive );
    } else {
        eventBus.publish( 'commandBarResized', {} );
    }
};

/**
 * updateOrAddHeightStyle
 *
 * @param {Object} column- column
 * @param {Object} isFullscreen - true if fullscreen, false otherwise
 */
function updateFlexStyle( column, isFullscreen ) {
    if( column ) {
        var style = column.getAttribute( 'style' );
        var tokens = style ? style.split( ' ' ) : [];
        var newStyle = '';
        _.forEach( tokens, function( token ) {
            if( token.indexOf( 'px' ) !== -1 || token.indexOf( 'em' ) !== -1 || token.indexOf( '%' ) !== -1 ) {
                // token = width.toString() + 'px';
                token = isFullscreen ? '100%' : '25em';
            }
            newStyle += token + ' ';
        } );
        newStyle = newStyle.trim();
        column.setAttribute( 'style', newStyle );
    }
}

export let classifyFullScreen = function( fullScreenCmd ) {
    $( 'aw-sublocation-body' ).find( '.aw-xrt-tabsContainer' ).addClass( 'aw-viewerjs-hideContent' );
    $( 'aw-sublocation-body' ).find( '.aw-layout-splitter' ).addClass( 'aw-viewerjs-hideContent' );
    var ctxCreate = appCtxSvc.getCtx( 'classifyCreate' );
    var classifyTab = $( '.aw-clspanel-fullViewClassify' );
    var layoutColumns = $( classifyTab ).find( '.aw-flex-column' );
    for( var col = 0; col < layoutColumns.length; col++ ) {
        var checkViewIsPresent = $( layoutColumns[ col ] ).find( '.aw-clspanel-fullViewVerticalFlexBox' );
        var classificationsPresent = $( checkViewIsPresent ).find( '.aw-clspanel-fullViewClassifications' );
        if( classificationsPresent && classificationsPresent.length ) {
            //check if images or property groups are present
            var imagesPresent = $( checkViewIsPresent ).find( '.aw-clspanel-images' );
            var propGrpsPresent = $( checkViewIsPresent ).find( '.aw-clspanel-propGroup' );
            if( ctxCreate || imagesPresent.length === 0 && propGrpsPresent.length === 0 ) {
                $( layoutColumns[ col ] ).removeClass( 'aw-viewerjs-fullViewActive' );
                $( layoutColumns[ col ] ).addClass( 'aw-viewerjs-hideContent' );
            } else {
                $( classificationsPresent ).removeClass( 'aw-viewerjs-fullViewActive' );
                $( classificationsPresent ).addClass( 'aw-viewerjs-hideContent' );
            }
        }
        checkViewIsPresent = $( checkViewIsPresent ).find( 'aw-clspanel-fullViewClassFlexBox' );
        if( checkViewIsPresent && checkViewIsPresent.length ) {
            $( layoutColumns[ col ] ).removeClass( 'aw-viewerjs-fullViewActive' );
            $( layoutColumns[ col ] ).addClass( 'aw-viewerjs-hideContent' );
        }
    }
};

export let toggleApplicationFullScreenMode = function( fullScreenCmd ) {
    // Switch to full screen mode via universal viewer's fullscreen
    for( var counter = 0; counter < classesToHide.length; counter++ ) {
        $( classesToHide[ counter ] ).addClass( 'aw-viewerjs-hideContent' );
    }

    // Check if One Step Full Screen command is active
    var fullViewModeActive = appCtxSvc.getCtx( fullScreenCmd );
    if( fullViewModeActive ) {
        exitFullScreenMode( fullScreenCmd, fullViewModeActive );
    } else {
        $( '.aw-layout-primaryWorkarea' ).addClass( 'aw-viewerjs-hideContent' );
        fullModeServ.toggleCommandStates( 'Awp0FullScreen', true, false );

        //Update application command context
        exports.updateApplicationCommandContext();
        if( fullScreenCmd === 'classifyFullscreen' ) {
            appCtxSvc.registerCtx( 'classifyFullscreen', !fullViewModeActive );
        }
    }
};

/**
 * Function that exits the full screen mode when the 'Exit Full Screen' command is clicked.
 *
 */
export let exitFullScreenMode = function( fullScreenCmd, fullViewModeActive ) {
    // Exit full screen mode -- addition
    fullModeServ.removeClass( 'aw-viewerjs-hideContent' );
    document.body.classList.remove( 'aw-viewerjs-fullViewActiveBody' );

    // removing viewer css from sections
    var allColumns = document.getElementsByClassName( 'aw-xrt-columnContentPanel' );
    if( allColumns && allColumns.length ) {
        for( var col = 0; col < allColumns.length; col++ ) {
            allColumns[ col ].classList.contains( 'aw-viewerjs-fullViewActive' ) ? allColumns[ col ].classList.remove( 'aw-viewerjs-fullViewActive' ) : null;
        }
    }

    //Update application command context based on Selection and UiConfig Mode
    exports.updateApplicationCommandContext();

    // Update full screen command enabled state
    appCtxSvc.registerCtx( fullScreenCmd, !fullViewModeActive );
};

/**
 * Switch to Full Screen for properties or images related information.
 *
 * @param {Object} fullScreenCmd - full screen command to indicate image or properties section
 * @function toggleFullScreen
 * @memberOf classifyFullViewModeService
 */
function toggleFullScreen( fullScreenCmd ) {
    exports.toggleApplicationFullScreenMode( fullScreenCmd );

    var fullViewModeActive = appCtxSvc.getCtx( fullScreenCmd );
    if( fullViewModeActive ) {
        exports.classifyFullScreen( fullScreenCmd );
    } else {
        var classifyTab = $( '.aw-clspanel-fullViewClassify' );
        var layoutColumns = $( classifyTab ).find( '.aw-flex-column' );
        updateFlexStyle( layoutColumns[ 0 ], false );
        //Ensure images returns to original width
        layoutColumns.removeClass( 'aw-viewerjs-fullViewActive' );
        $( 'aw-sublocation-body' ).find( '.aw-layout-panelSectionTitle' ).removeClass( 'aw-viewerjs-fullViewActive' );
    }
}

/**
 * Switch to Full Screen for properties related information.
 *
 *
 * @function toggleFullScreen
 * @memberOf classifyFullViewModeService
 */
export let togglePropFullScreen = function() {
    toggleFullScreen( 'classifyFullscreen' );
    eventBus.publish( 'classify.adjustTableForFullScreen' );
};

/**
 * The Classification full view mode service
 *
 * @member classifyFullViewModeService
 * @param {fullViewModeService} fullModeServ - Framewrok full mode service
 * @return {Object} Directive's definition object.
 */

export default exports = {
    updateApplicationCommandContext,
    classifyFullScreen,
    toggleApplicationFullScreenMode,
    togglePropFullScreen,
    exitFullScreenMode
};

app.factory( 'classifyFullViewModeService', () => exports );
