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
 * Defines {@link NgServices.viewerSecondaryModelInteractionServiceGWT} which provides utility functions for viewer
 * 
 * @module js/viewerSecondaryModelInteractionServiceGWT
 * @requires app
 */
import * as app from 'app';

let exports = {};

/**
 * Object that provides access to viewer api's
 */
var viewerSecondaryApi = {};

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
export let getSecondaryApi = function() {
    return viewerSecondaryApi;
};

export default exports = {
    setViewerContextService,
    getSecondaryApi
};
/**
 * Set of utility functions for GWT viewer
 * 
 * @class viewerSecondaryModelInteractionServiceGWT
 * @memberOf NgServices
 */
app.factory( 'viewerSecondaryModelInteractionServiceGWT', () => exports );
