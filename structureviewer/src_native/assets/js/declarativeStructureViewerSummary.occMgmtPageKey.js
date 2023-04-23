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
 * This is the structureViewerSummary occ mgmt page contribution.
 *
 * @module js/declarativeStructureViewerSummary.occMgmtPageKey
 */
import appCtxService from 'js/appCtxService';

var contribution = {
    label: {
        source: '/i18n/StructureViewerConstants',
        key: 'structureViewerPageTitle'
    },
    id: 'Awb0ViewerFeature',
    priority: 1,
    pageNameToken: 'Awv0StructureViewerPage',
    condition: function( selection, $injector, contextKey ) {
        let occmgmtContext = appCtxService.getCtx( contextKey );

        // elementToPCIMap links Root Occurrences to Product Set containers. If it's defined we're in a workset, which is important to PlantCadFeature case.
        if( occmgmtContext && occmgmtContext.supportedFeatures && ( occmgmtContext.supportedFeatures.Awb0ViewerFeature &&
            !occmgmtContext.supportedFeatures.Awb0PlantCadFeature || occmgmtContext.supportedFeatures.Awb0PlantCadFeature && occmgmtContext.elementToPCIMap ) ) {
            return true;
        }
        return false;
    }
};

/**
 *
 * @param {*} key
 * @param {*} deferred
 */
export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
