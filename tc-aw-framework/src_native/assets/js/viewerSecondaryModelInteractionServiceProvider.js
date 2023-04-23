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
 * This service is used to interact with viewer secondary model.
 * 
 * @module js/viewerSecondaryModelInteractionServiceProvider
 */
import * as app from 'app';
import viewerSecondaryModelInteractionServiceGWT from 'js/viewerSecondaryModelInteractionServiceGWT';
import viewerSecondaryModelInteractionService from 'js/viewerSecondaryModelInteractionService';

/**
 * viewer secondary model interaction service instance for GWT stack
 */

/**
 * viewer secondary model interaction service instance for JS stack
 */

var exports = {};

/**
 * Provides an instance of viewer interaction service
 * 
 * @param {String} viewerType Type of viewer
 * @return {viewerSecondaryModelInteractionServiceProvider} Returns viewer interaction service provider
 */
export let getViewerSecondaryModelInteractionServiceProvider = function( viewerType ) {
    return new viewerSecondaryModelInteractionServiceProvider( viewerType );
};

/**
 * Class used to act as service provider for viewer interaction
 * 
 * @constructor viewerSecondaryModelInteractionServiceProvider
 * @param {String} viewerType Type of viewer
 */
var viewerSecondaryModelInteractionServiceProvider = function( viewerType ) {
    var self = this;

    self.viewerType = viewerType;

    /**
     * Get viewer interaction service
     * 
     * @return {Object} A service instance that interacts with viewer.
     */
    self.getViewerSecondaryModelInteractionService = function() {
        if( self.viewerType === 'GwtViewer' ) {
            return viewerSecondaryModelInteractionServiceGWT;
        } else if( self.viewerType === 'JsViewer' ) {
            return viewerSecondaryModelInteractionService;
        }
    };
};

export default exports = {
    getViewerSecondaryModelInteractionServiceProvider
};
/**
 * This service is used for interaction with viewer
 * 
 * @memberof NgServices
 */
app.factory( 'viewerSecondaryModelInteractionServiceProviderFactory', () => exports );
