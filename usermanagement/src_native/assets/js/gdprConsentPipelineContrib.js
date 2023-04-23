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
 * @module js/gdprConsentPipelineContrib
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';

'use strict';

var contribution = {
    getPipelineStepDefinition: function() {
        // get the service

        var gdprConsentStepDefn = {
            name: 'GDPRConsent',
            active: false,
            routeName: 'gdprConsent', // either routeName or workFunction, not both
            workFunction: null
        };

        if ( appCtxSvc.ctx.userSession.props.fnd0ShowGDPR && appCtxSvc.ctx.userSession.props.fnd0ShowGDPR.dbValues[ 0 ] === '1' ) {
            gdprConsentStepDefn.active = true;
            }

    return gdprConsentStepDefn;
    }
};

export default function( key, deferred ) {
    if( key === 'postLoginPipeline' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
