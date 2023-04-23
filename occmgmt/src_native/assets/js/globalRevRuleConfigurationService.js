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
 * @module js/globalRevRuleConfigurationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import revRuleConfigService from 'js/revisionRuleConfigurationService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var _onGlobalRevisionRuleChangeEventListener = null;
var _onAdminPanelRevisionRuleChangedEventListener = null;

export let initialize = function() {
    _onGlobalRevisionRuleChangeEventListener = eventBus
        .subscribe(
            'aw.revisionRuleChangeEvent',
            function() {
                var viewKeys = [];
                if( appCtxSvc.ctx.splitView && appCtxSvc.ctx.splitView.mode ) {
                    _.forEach( appCtxSvc.ctx.splitView.viewKeys, function( viewKey ) {
                        viewKeys.push( viewKey );
                    } );
                } else {
                    viewKeys.push( 'aceActiveContext.context' );
                }
                _.forEach( viewKeys, function( viewKey ) {
                    var contextObject = appCtxSvc.getCtx( viewKey );
                    if( contextObject.supportedFeatures.Awb0EnableUseGlobalRevisionRuleFeature &&
                        contextObject.productContextInfo.props.awb0UseGlobalRevisionRule.dbValues[ 0 ] === '1' ) {
                        appCtxSvc.updatePartialCtx( viewKey + ".transientRequestPref", {
                            "jitterFreePropLoad": true,
                            "userGesture": "REVISION_RULE_CHANGE"
                        } );
                        appCtxSvc.updatePartialCtx( viewKey + ".configContext", {
                            "useGlobalRevRule": true,
                            "startFreshNavigation": true
                        } );
                    }
                } );
            }, 'GlobalRevRuleConfigurationService' );

    _onAdminPanelRevisionRuleChangedEventListener = eventBus
        .subscribe(
            'RevisionRuleAdminPanel.revisionRuleChanged',
            function( eventData ) {
                var viewKey = eventData.contextViewKey;
                var contextObject = appCtxSvc.getCtx( viewKey );
                appCtxSvc.updatePartialCtx( viewKey + ".configContext", {
                    "r_uid": eventData.revisionRule,
                    "useGlobalRevRule": eventData.useGlobalRevRule,
                    "var_uids": revRuleConfigService.evaluateVariantRuleUID( contextObject ),
                    "iro_uid": null,
                    "de": null,
                    "ue": null,
                    "ei_uid": null,
                    "rev_sruid": eventData.rev_sruid,
                    "startFreshNavigation": true
                } );
            }, 'AdminRevRuleConfigurationChange' );
};

export let destroy = function() {
    eventBus.unsubscribe( _onGlobalRevisionRuleChangeEventListener );
    eventBus.unsubscribe( _onAdminPanelRevisionRuleChangedEventListener );
};

/**
 * Global Revision Rule Configuration Service
 */

export default exports = {
    initialize,
    destroy
};
app.factory( 'globalRevRuleConfigurationService', () => exports );
