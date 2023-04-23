// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This file is used as utility file for control plan from quality center foundation module
 *
 * @module js/Acp0ControlPlanUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import fullModeServ from 'js/fullViewModeService';
import localeService from 'js/localeService';
import $ from 'jquery';

var exports = {};

/**
 *This method ensures that the it return proper characteristics object to remove the relation from characteristics group
 */
export let getUnderlyingObject = function() {
    var selectedParent = {};
    if( appCtxService.ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Acp0ControlPlanElement' ) > -1 ) {
        selectedParent.type = appCtxService.ctx.pselected.type;
        selectedParent.uid = appCtxService.ctx.pselected.props.awb0UnderlyingObject.dbValues[ 0 ];
    } else {
        selectedParent = appCtxService.ctx.pselected;
    }
    return selectedParent;
};

/**
 *
 */
export let toggleFullScreenForCP = function() {
    // Check if One Step Full Screen command is active
    var fullViewModeActive = appCtxService.getCtx( 'fullscreen' );
    var enabled = appCtxService.ctx.fullscreen && !appCtxService.ctx.aw_hosting_enabled;

    if( fullViewModeActive ) {
        // Exit full screen mode
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
        appCtxService.registerCtx( 'fullscreen', !fullViewModeActive );
    } else {
        //find the respective locale for section names
        var resource = 'ControlInspectionPlanMessages';
        var localeTextBundle = localeService.getLoadedText( resource );
        var pmiTableLocaleText = localeTextBundle.PMI;
        $( 'div[caption=' + pmiTableLocaleText + ']' ).addClass( 'aw-viewerjs-hideContent' );
        $( '.aw-xrt-tabsContainer' ).addClass( 'aw-viewerjs-hideContent' );

        //toggle the command status
        fullModeServ.toggleCommandStates( 'Awp0FullScreen', enabled, false );
        fullModeServ.toggleCommandStates( 'Awp0ExitFullScreen', !enabled, true );

        //Update application command context
        fullModeServ.updateApplicationCommandContext();

        appCtxService.registerCtx( 'fullscreen', !fullViewModeActive );
        fullModeServ.updateViewerCommandContext( 'fullViewMode', false );
    }
};

/**
 *This method is to concat all the partialError messages if any
 */
export let failureMessageConcat = function( data ) {
    //appCtxService.ctx.ErrorName = getErrorMessage( data.ServiceData.ServiceData.partialErrors[0].errorValues );

    var errors = data.ServiceData.ServiceData.partialErrors[ 0 ].errorValues;
    var errorMessage = '';

    for( var i = 0; i < errors.length; i++ ) {
        errorMessage += String( errors[ i ].message );
        if( i !== errors.length - 1 ) { errorMessage += '<BR/>'; }
    }

    appCtxService.ctx.ErrorName = errorMessage;
};

export default exports = {
    getUnderlyingObject,
    toggleFullScreenForCP,
    failureMessageConcat
};
app.factory( 'Acp0ControlPlanUtils', () => exports );
