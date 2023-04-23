// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global
define */

/**
 * Defines structure viewer controller
 *
 * @module js/aw-structure-viewer.controller
 */
import app from 'app';

/**
 * Defines structure viewer controller
 *
 * @member awStructureViewerController
 * @memberof NgControllers
 */
app.controller( 'awStructureViewerController', [ '$scope', function( $scope ) {
    /**
     * Describes the scope
     */
    $scope.whoAmI = 'awStructureViewerController';

    /**
     * Initializes the viewer container element
     *
     * @param {Object} viewElement the directive element
     */
    this.initViewer = function( viewElement ) {
        $scope.prop.viewerContainerDiv = viewElement.find( 'div#awStructureViewer' );
    };
} ] );
