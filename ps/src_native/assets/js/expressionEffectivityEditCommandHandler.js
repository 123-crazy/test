// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This is the command handler for "Edit Expression Effectivity" cell command
 *
 * @module js/expressionEffectivityEditCommandHandler
 */
import app from 'app';
import eventBus from 'js/eventBus';
import viewModelService from 'js/viewModelService';
import appCtxService from 'js/appCtxService';

let exports = {};

/**
 * Get View model
 * @param {Object} scope - scope object.
 * @return {Object} returns view model object
 */
let getViewModel = function( scope ) {
    return viewModelService.getViewModel( scope, true );
};

/**
 * Execute the command.
 * @param {Object} vmo - effectivity vmo
 * @param {Object} $scope - scope object
 */
export let execute = function( vmo, $scope ) {
    let declViewModel = getViewModel( $scope );
    declViewModel.effectivity = vmo;

    let context = {
        destPanelId: 'ps0EditEffectivity',
        title: declViewModel.i18n.startEditButtonText,
        recreatePanel: true,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Sets underlyingPropLoaded flag on ctx to indicate underlying properties are available.
 * @param {Object} ctx appCtx
 */
export let setUnderlyingObjectPropsLoadedFlag = function( ctx ) {
    if ( ctx.expressionEffectivity === undefined || ctx.expressionEffectivity.underlyingPropLoaded === undefined || ctx.expressionEffectivity.underlyingPropLoaded === false ) {
        appCtxService.registerPartialCtx( 'expressionEffectivity.underlyingPropLoaded', true );
    }
};

/**
 * Resets underlyingPropLoaded flag on ctx.
 * @param {Object} ctx appCtx
 */
export let resetUnderlyingObjectPropsLoadedFlag = function( ctx ) {
    if( ctx.expressionEffectivity.underlyingPropLoaded === true ) {
        ctx.expressionEffectivity.underlyingPropLoaded = false;
    }
};

/**
 * Unregister underlyingPropLoaded flag on ctx.
 */
export let unregisterUnderlyingObjectPropsLoadedFlag = function() {
    appCtxService.updatePartialCtx( 'expressionEffectivity.underlyingPropLoaded', undefined );
};


/**
 * "Edit Expression Effectivity" cell command handler factory
 *
 * @member expressionEffectivityEditCommandHandler
 */
export default exports = {
    execute,
    setUnderlyingObjectPropsLoadedFlag,
    resetUnderlyingObjectPropsLoadedFlag,
    unregisterUnderlyingObjectPropsLoadedFlag
};
app.factory( 'expressionEffectivityEditCommandHandler', () => exports );
