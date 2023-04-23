// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ctm1ContentMgmtDMCodeService
 */
import app from 'app';

var exports = {};

/**
 * Get SOA input for DM code default values
 * @param {object} ctx context
 * @returns {object} input data to soa operation
 */
export let getSNSInputs = function( ctx ) {
    var input = [];
    var selectedBOMLInes = ctx.ctm1bomlines;

    var inp = {
        clientId: 'SNSDefaultValues-awc',
        object: selectedBOMLInes[0]
    };

    input.push( inp );
    return input;
};

/**
 * Get SOA operation input for DM information code
 * @param {object} data declarative view model data
 * @param {object} ctx context
 * @return {object} input data to soa operation
 */
export let getSNSInputsForInfoCode = function( data, ctx ) {
    var input = [];
    var selectedBOMLInes = ctx.ctm1bomlines;

    var inp = {
        clientId: 'infocode-awc',
        object: selectedBOMLInes[0],
        keyValueArgs: {
            Type: 'InfoCodes',
            TopicType: data.revision__ctm0TopicTypeTagref.displayValues[0]
        }
    };

    input.push( inp );
    return input;
};

/**
 * set DM default value code
 * @param {object} ctx context object
 * @param {object} data view model data
 */
export let setDefaultValuesForDMCode = function( ctx, data ) {
    if ( ctx.ctm1snscodes && ctx.ctm1snscodes.data && ctx.ctm1snscodes.data[ 0 ].defaultValueMap ) {
        var defaultValueMap = ctx.ctm1snscodes.data[ 0 ].defaultValueMap;

        data.revision__skdmodelic.dbValue = defaultValueMap.skdmodelic;
        data.revision__skdsdc.dbValue = defaultValueMap.skdsdc;
        data.revision__skdchapnum.dbValue = defaultValueMap.skdchapnum;
        data.revision__skdsection.dbValue = defaultValueMap.skdsection;
        data.revision__skdsubsection.dbValue = defaultValueMap.skdsubsection;
        data.revision__skdsubject.dbValue = defaultValueMap.skdsubject;
        data.revision__skddiscode.dbValue = defaultValueMap.skddiscode;
        data.revision__skddiscodev.dbValue = defaultValueMap.skddiscodev;
        data.revision__skdincodev.dbValue = 'A';
    }
};

/**
 * set additional DM code default values.
 * @param {object} ctx context object
 */
export let setOtherDefaultValuesForDMCode = function( ctx ) {
    if ( ctx.ctm1snscodes && ctx.ctm1snscodes.data && ctx.ctm1snscodes.data[ 0 ].defaultValueMap ) {
        var defaultValueMap = ctx.ctm1snscodes.data[ 0 ].defaultValueMap;

        ctx.ctm1Civ0DM4OtherCodes.revision__skdsecurity_class.dbValue = defaultValueMap.skdsecurity_class;
        ctx.ctm1Civ0DM4OtherCodes.revision__civ0rpcname.dbValue = defaultValueMap.civ0rpcname;
        ctx.ctm1Civ0DM4OtherCodes.revision__civ0origname.dbValue = defaultValueMap.civ0origname;
        ctx.ctm1Civ0DM4OtherCodes.revision__skdrpc.dbValue = defaultValueMap.skdrpc;
        ctx.ctm1Civ0DM4OtherCodes.revision__skdorig.dbValue = defaultValueMap.skdorig;
    }
};

/**
 * Get info code from soa response.
 * @param {object} response soa response.
 * @returns {Array} an array of information codes.
 */
export let getInfoCodes = function( response ) {
    var codes = [];

    if ( response.data ) {
        var defaultValueMap = response.data[ 0 ].defaultValueMap;
        if ( defaultValueMap ) {
            codes = Object.keys( defaultValueMap );
        }
    }

    return codes;
};

/**
 * Get information code list
 * @param {object} ctx context object
 * @returns {Array} a list of information code.
 */
export let getInfoCodeList = function( ctx ) {
    var codeList = [];

    if ( ctx.ctm1snsinfocodes ) {
        var defaultValueMap = ctx.ctm1snsinfocodes.data[ 0 ].defaultValueMap;
        if ( defaultValueMap ) {
            var codes = Object.keys( defaultValueMap );
            for ( let i = 0; i < codes.length; i++ ) {
                let codeObj = {
                    propDisplayValue: codes[i],
                    propInternalValue: codes[i]
                };
                codeList.push( codeObj );
            }
        }
    }

    return codeList;
};

/**
 * Update info code field.
 * @param {object} ctx context object
 */
export let updateInfoCodes = function( ctx ) {
    if ( ctx.ctm1snsinfocodes &&  ctx.ctm1snsinfocodes.length > 0 ) {
        ctx.ctm1Civ0DM4Codes.revision__skdincode.dbValue = ctx.ctm1snsinfocodes[0];
    }
};

/**
 * register view model for default codes
 * @param {object} ctx context object
 * @param {object} data view model data
 */
export let registerDefaultCodeModel = function( ctx, data ) {
    ctx.ctm1Civ0DM4Codes = data;
};

/**
 * register view model for other default codes
 * @param {object} ctx context object
 * @param {object} data view model data
 */
export let registerOtherCodeModel = function( ctx, data ) {
    ctx.ctm1Civ0DM4OtherCodes = data;
};

/**
 * Ctm1ContentMgmtDMCodeService factory
 */

export default exports = {
    getSNSInputs,
    getSNSInputsForInfoCode,
    setDefaultValuesForDMCode,
    setOtherDefaultValuesForDMCode,
    updateInfoCodes,
    registerOtherCodeModel,
    registerDefaultCodeModel,
    getInfoCodes,
    getInfoCodeList
};
app.factory( 'Ctm1ContentMgmtDMCodeService', () => exports );
