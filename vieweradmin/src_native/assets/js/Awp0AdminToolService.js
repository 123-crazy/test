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
 * @module js/Awp0AdminToolService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';

var exports = {};

/**
 * Update Health data
 *
 * @param {Object} data model
 * @returns {Object} updated health data
 */
export let updateHealthData = function( data ) {
    data.nodeProp.displayName = appCtxSvc.ctx.viewerAdmin.selectedNodeType;
    data.nodeProp.dbValue = appCtxSvc.ctx.viewerAdmin.selectedNodeProperties;
    return data;
};

export default exports = {
    updateHealthData
};
/**
 * @member Awp0AdminToolService
 * @memberof NgServices
 */
app.factory( 'Awp0AdminToolService', () => exports );
