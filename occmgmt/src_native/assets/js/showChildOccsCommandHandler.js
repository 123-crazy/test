// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define,
 document
 */

/**
 * This is the command handler for show child occurrences command which is contributed to cell list.
 *
 * @module js/showChildOccsCommandHandler
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import aceBreadcrumbService from 'js/aceBreadcrumbService';
import eventBus from 'js/eventBus';

var exports = {};

export let getContextKeyFromParentScope = function( parentScope ) {
    return contextStateMgmtService.getContextKeyFromParentScope( parentScope );
};

export let getContextKeyFromBreadcrumbConfig = function( parentScope ) {
    return aceBreadcrumbService.getContextKeyFromBreadcrumbConfig( parentScope );
};

/**
 * Execute the command.
 * <P>
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let showChildOccurences = function( vmo, contextKey ) {
    eventBus.publish( 'awPopupWidget.close' );
    var newState = {};
    var viewModeInfo = appCtxSvc.ctx.ViewModeContext;

    newState.o_uid = vmo.uid;
    newState.c_uid = vmo.uid;

    contextStateMgmtService.updateContextState( contextKey, newState, true );

    //In Tree View , "Show Children" can be executed from Breadcrumb. It should behave like Node expansion in that case.
    if( viewModeInfo &&
        ( viewModeInfo.ViewModeContext === 'TreeView' || viewModeInfo.ViewModeContext === 'TreeSummaryView' ) ) {
        eventBus.publish( appCtxSvc.ctx[ contextKey ].vmc.name + '.expandTreeNode', {
            parentNode: {
                id: newState.o_uid
            }
        } );
    }
};

export default exports = {
    getContextKeyFromParentScope,
    getContextKeyFromBreadcrumbConfig,
    showChildOccurences
};
/**
 *
 *
 * @memberof NgServices
 * @member showObjectCommandHandler
 */
app.factory( 'showChildOccsCommandHandler', () => exports );
