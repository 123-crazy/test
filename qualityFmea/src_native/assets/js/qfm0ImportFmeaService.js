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
 * This file provided the method that will be used for import / export for workflow templates.
 *
 * @module js/qfm0ImportFmeaService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import _ from 'lodash';
import _localeSvc from 'js/localeService';

/**
 * Define public API
 */
var exports = {};

/**
 * This method is used to get the LOV values for the versioning panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    if( response !== null ) {
        var lovsValue = response.lovValues.map( function( obj ) {
            return {
                propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
                propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
                propInternalValue: obj.propInternalValues.lov_values[ 0 ]
            };
        } );

        if( appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 13 ) {
            lovsValue.unshift( {
                propDisplayValue: '',
                propDisplayDescription: '',
                propInternalValue: ''
            } );
        }
        return lovsValue;
    }
    return null;
};

/**
 * getFmeaGuideLineObjectLovUID
 * @param {*} response
 */
export let getFmeaGuideLineObjectLovUID = function( response ) {
    return response.inputTypeNameToLOVOutput.Qfm0FMEANode[ 0 ].lov.uid;
};

/**
 * getImportFmeaFromMsrXMLInput
 * @param {*} uid
 * @param {*} fmsTicket
 */
export let getImportFmeaFromMsrXMLInput = function( uid, fmsTicket ) {
    var inputFormat = {};
    inputFormat[ uid ] = [ fmsTicket ];
    return inputFormat;
};

/**
 * showInProgressMessage
 * @param {*} fileName
 */
export let showInProgressMessage = function( fileName ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var message = localTextBundle.qfm0ImportFmeaInProgress;
    message = message.replace( '{0}', fileName );

    messagingService.showInfo( message );
    return null;
};

/**
 * This factory creates a service and returns exports
 *
 * @member qfm0ImportFmeaPanelService
 */

export default exports = {
    getLOVList,
    getFmeaGuideLineObjectLovUID,
    getImportFmeaFromMsrXMLInput,
    showInProgressMessage
};
app.factory( 'qfm0ImportFmeaPanelService', () => exports );
