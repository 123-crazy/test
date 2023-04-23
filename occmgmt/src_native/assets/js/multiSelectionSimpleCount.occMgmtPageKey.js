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
 * This is the multiSelectionSimpleCount occ mgmt page contribution.
 *
 * @module js/multiSelectionSimpleCount.occMgmtPageKey
 */

'use strict';

var contribution = {
    label: {
        source: '/i18n/OccurrenceManagementConstants',
        key: 'selectionSummaryTabTitle'
    },
    priority: 0,
    pageNameToken: 'aceSelectionSummary',
    condition: 'selected.length > 1'
};

export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
