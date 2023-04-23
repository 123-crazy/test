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
 * Defines {@link NgServices.viewerInteractionServiceGWT} which provides utility functions for viewer
 * 
 * @module js/viewerInteractionServiceGWT
 * @requires app
 */
import * as app from 'app';

let exports = {};

/**
 * Object that provides access to viewer api's
 */
var viewerApi = {};

var _viewerCtxSvc = null;

/**
 * Set the viewer context service
 * 
 * @param {Object} viewerCtxSvc - viewer context service instance
 */
export let setViewerContextService = function( viewerCtxSvc ) {
    _viewerCtxSvc = viewerCtxSvc;
};

/**
 * Get the viewer api object
 * 
 * @return {Object} An object that provides access to viewer api's
 */
export let getViewerApi = function() {
    return viewerApi;
};

export default exports = {
    setViewerContextService,
    getViewerApi
};
/**
 * Set of utility functions for GWT viewer
 * 
 * @class viewerInteractionServiceGWT
 * @memberOf NgServices
 */
app.factory( 'viewerInteractionServiceGWT', () => exports );
