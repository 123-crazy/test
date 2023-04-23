//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * This is the digital signature service contribution.
 *
 * @module js/digitalSignature.contributions
 */
import app from 'app';
import declUtils from 'js/declUtils';
import AwPromiseService from 'js/awPromiseService';


var contribution = {
    getDigitalSignatureService: function() {
        var deferred = AwPromiseService.instance.defer();

        declUtils.loadDependentModule( 'js/awDigitalSignatureService' ).then(
            function( depModuleObj ) {
                deferred.resolve( depModuleObj );
            } );

        return deferred.promise;
    }
};

/**
 *
 * @param {*} key
 * @param {*} deferred
 */
export default function( key, deferred ) {
    if( key === 'digitalSignatureService' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
