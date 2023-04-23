// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the markupPageKey occ mgmt page contribution.
 *
 * @module js/markup.occMgmtPageKey
 */

'use strict';

var contribution = {
    label: {
        source: '/i18n/OccurrenceManagementConstants',
        key: 'markup'
    },
    priority: 5,
    pageNameToken: 'MarkupPage',
    condition: function( selection, $injector ) {
        var appCtxService = $injector.get( 'appCtxService' );
        return false;
        if( appCtxService.ctx.aceActiveContext.context.isMarkupEnabled && selection.length === 1 && selection[ 0 ].type !== 'Awb0MarkupElement' && !( appCtxService.ctx.splitView && appCtxService.ctx.splitView.mode ) ) {
            if( !appCtxService.ctx.mselected[ 0 ].props.awb0MarkupType || appCtxService.ctx.mselected[ 0 ].props.awb0MarkupType && appCtxService.ctx.mselected[ 0 ].props.awb0MarkupType.dbValues[ 0 ] !== '128' ) {
                return true;
            }
        }
        return false;
    }
};

export default function( key, deferred ) {
    if( key === 'occMgmtPageKey' ) {
        deferred.resolve( contribution );
    } else {
        deferred.resolve();
    }
}
