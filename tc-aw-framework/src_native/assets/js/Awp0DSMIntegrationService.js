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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * This service updates the DSM integration status in local storage using DSM
 * "com.siemens.splm.clientfx.ui.DataShareManagerIntegrationStatus" as key below are the DSM status are in local storage
 *
 * 0 : Data Share Manager not installed on this device. 1 : Data Share Manager is installed on this device. 2 : Use Data
 * Share Manager on this device
 *
 * @module js/Awp0DSMIntegrationService
 */
import * as app from 'app';
import dsmUtils from 'js/dsmUtils';

var exports = {};

/**
 * DSM Panel section to be shown on on Windows, Mac and Linux operating systems, Sets showDSMSection to true on data
 * for Windows, Mac and Linux operating systems; false for other operating systems.
 */
export let showDSMSection = function( data ) {
    data.showDSMSection = false;
    if( window.navigator.userAgent.indexOf( "Win" ) ) {
        data.showDSMSection = true;
    } else if( window.navigator.userAgent.indexOf( "Mac" ) ) {
        data.showDSMSection = true;
    } else if( window.navigator.userAgent.indexOf( "Linux" ) ) {
        data.showDSMSection = true;
    }
};

/**
 * If user check/uncheck "Use Data Share Manager on this device" check box, updates the local storage with
 * appropriate value.
 *
 * If Use Data Share Manager on this device check box is selected, this function will set DSM integration status
 * local storage to 2, else will set 1 if only "Data Share Manager is installed on this device" check box is
 * selected, 0 for both check boxes are not selected..
 *
 */
export let useDSMClick = function( data ) {
    var useDSMValue = data.useDSM.dbValue;
    var dsmInstalledValue = data.dsmInstalled.dbValue;

    if( useDSMValue && dsmInstalledValue ) {

        dsmUtils.updateDSMIntegrationStatus( 2 );

    } else if( useDSMValue && !dsmInstalledValue ) {

        data.dsmInstalled.dbValue = true;

    } else if( !useDSMValue && dsmInstalledValue ) {

        dsmUtils.updateDSMIntegrationStatus( 1 );

    } else {

        dsmUtils.updateDSMIntegrationStatus( 0 );
    }
};

/**
 * On reveal, Reads value from local storage and updates the DSM check boxes on the DSM panel section.
 */
export let onDSMReveal = function( data ) {
    exports.showDSMSection( data );
    if( data.showDSMSection ) {
        var val = dsmUtils.getDSMIntegrationStatus();
        if( val === "2" ) {
            data.useDSM.dbValue = true;
            data.dsmInstalled.dbValue = true;
        } else if( val === "1" ) {
            data.dsmInstalled.dbValue = true;
            data.useDSM.dbValue = false;
        }
    }
};

/**
 * If user check/uncheck "Data Share Manager is installed on this device" check box, updates the local storage with
 * appropriate value.
 *
 * If "Data Share Manager is installed on this device" check box is not selected, this function will set DSM
 * integration status local storage to 0, else will set 2 if "Use Data Share Manager on this device" check box also
 * selected, 0 for both check boxes are not selected.
 */
export let dsmInstalledClick = function( data ) {

    var useDSMValue = data.useDSM.dbValue;
    var dsmInstalledValue = data.dsmInstalled.dbValue;

    if( dsmInstalledValue && useDSMValue ) {

        dsmUtils.updateDSMIntegrationStatus( 2 );

    } else if( dsmInstalledValue && !useDSMValue ) {

        dsmUtils.updateDSMIntegrationStatus( 1 );

    } else if( !dsmInstalledValue && useDSMValue ) {

        data.useDSM.dbValue = false;

    } else {

        dsmUtils.updateDSMIntegrationStatus( 0 );
    }
};

export default exports = {
    showDSMSection,
    useDSMClick,
    onDSMReveal,
    dsmInstalledClick
};
/**
 *
 * @member Awp0DSMIntegrationService
 * @memberof NgServices
 */
app.factory( 'Awp0DSMIntegrationService', () => exports );
