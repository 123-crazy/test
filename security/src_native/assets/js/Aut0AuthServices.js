// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * This module represents the service API for utility methods that aid the security module.
 *
 * @module js/Aut0AuthServices
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaSvc from 'soa/kernel/soaService';

'use strict';

var exports = {};

/**
 * generate the SOA input data definition for the GetStyleSheet input. Since it's called from several spots, use
 * this common utility.
 *
 * @param {String} busObjTypeName type name
 * @param {String} subLocName sublocation name
 *
 * @return {Object} input data
 */
export let generateGetStyleSheetInputEntry = function( busObjTypeName, subLocName ) {
    var entry = {
        businessObjectType: busObjTypeName,
        businessObject: {
            uid: 'AAAAAAAAAAAAAA',
            type: 'unknownType'
        },
        styleSheetLastModDate: '',
        styleSheetType: 'CREATE',
        targetPage: '',
        clientContext: {
            'ActiveWorkspace:Location': 'com.siemens.splm.client.oar.oarLocation',
            'ActiveWorkspace:SubLocation': subLocName
        }
    };

    return entry;
};

/**
 * shared utility function to invoke Tc SOA call to get a StyleSheet. Handles the details of the SOA request and the
 * Property Policy.
 *
 * @param {Object} policyDef property policy info
 * @param {Object} serviceInput soa input arguments
 *
 * @return {Object} promise
 */
export let getSoaStyleSheet = function( policyDef, serviceInput ) {
    var deferred = AwPromiseService.instance.defer();

    var policyId = policySvc.register( policyDef );

    soaSvc.post( 'Internal-AWS2-2016-12-DataManagement', 'getDeclarativeStyleSheets', serviceInput ).then(
        function( responseData ) {
            if( policyId ) {
                policySvc.unregister( policyId );
            }
            deferred.resolve( responseData );
        },
        function( reason ) {
            if( policyId ) {
                policySvc.unregister( policyId );
            }
            deferred.reject( reason );
        } );

    return deferred.promise;
};

/* eslint-disable-next-line valid-jsdoc*/

export default exports = {
    generateGetStyleSheetInputEntry,
    getSoaStyleSheet
};

/**
 *
 * @memberof NgServices
 * @member Aut0AuthServices
 */
app.factory( 'Aut0AuthServices', () => exports );
