// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This is a contribution for a login process blocking step definition
 *
 * @module js/confidentialityAgreementPipelineContrib
 */
import app from 'app';
import tcSesnData from 'js/TcSessionData';

    'use strict';

    var contribution = {
        getPipelineStepDefinition: function() {
            // get the service

            var confAgreementStepDefn = {
                name: 'ConfidentialityAgreement',
                active: false,
                routeName: 'confidentialityAgreement', // either routeName or workFunction, not both
                workFunction: null
            };

            confAgreementStepDefn.active = true;

            return confAgreementStepDefn;
        }
    };

    export default function( key, deferred ) {
        if( key === 'postLoginPipeline' ) {
            deferred.resolve( contribution );
        } else {
            deferred.resolve();
        }
    }
