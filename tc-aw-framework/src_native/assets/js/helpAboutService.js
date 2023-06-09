// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines {@link helpAboutService} which provides services for the help about command
 *
 * @module js/helpAboutService
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import messagingSvc from 'js/messagingService';
import cfgSvc from 'js/configurationService';
import localeSvc from 'js/localeService';
import 'js/localStorage';

/** object to export */
let exports = {};

/** Reference to appCtxService service */

/**
 * Display the "Help About" Information popup
 */
export let showHelpAbout = function() {
    var textBundle = {};
    cfgSvc.getCfg( 'versionConstants' ).then( function( versionConstants ) {
        textBundle.clientBuild = localeSvc.getLoadedTextFromKey( 'UIElementsMessages.clientBuild' );
        textBundle.logFile = localeSvc.getLoadedTextFromKey( 'UIElementsMessages.logFile' );
        var helpAboutStr = versionConstants.name + '@' + versionConstants.version + ' (' + versionConstants.description + ')<br>';
        if( versionConstants.afx ) {
            helpAboutStr += versionConstants.afx.name + '@' + versionConstants.afx.version + ' (' + versionConstants.afx.description + ')<br>';
        }
        helpAboutStr += textBundle.clientBuild + ': ' + versionConstants.buildTime + '<br>';
        helpAboutStr += appCtxService.ctx.tcSessionData.serverVersion + '<br>';
        helpAboutStr = helpAboutStr.replace( /\n/g, '<br>' );
        if( appCtxService.ctx.tcSessionData.logFile ) {
            helpAboutStr += textBundle.logFile + ': ' + appCtxService.ctx.tcSessionData.logFile;
        }
        messagingSvc.showInfo( helpAboutStr );
    } );
};

/**
 * @class helpAboutService
 */

export default exports = {
    showHelpAbout
};
app.factory( 'helpAboutService', () => exports );
