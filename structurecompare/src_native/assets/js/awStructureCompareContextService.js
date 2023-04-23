// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Wrapper code to process compare context values
 *
 * @module js/awStructureCompareContextService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import 'lodash';

var exports = {};

var _compareContext = null;
var _compareCtxPath = null;

export let setCompareContext = function( cmpCtxPath, cmpCtx ) {
    _compareContext = cmpCtx;
    _compareCtxPath = cmpCtxPath;
    appCtxSvc.updatePartialCtx( _compareCtxPath, _compareContext );
};

export let getCtx = function( ctxPath ) {
    return appCtxSvc.getCtx( ctxPath );
};

export let updatePartialCtx = function( ctxPath, value ) {
    appCtxSvc.updatePartialCtx( ctxPath, value );
};

/**
 * @member awStructureCompareContextService
 */

export default exports = {
    setCompareContext,
    getCtx,
    updatePartialCtx
};
app.factory( 'awStructureCompareContextService', () => exports );
