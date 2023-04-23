// Copyright (c) 2020 Siemens

/**
 * Image cell controller.
 *
 * @module js/aw-image-cell.controller
 * @requires app
 * @requires js/awIconService
 */
import app from 'app';
import 'js/awIconService';

/**
 * The controller for the aw-command-bar directive
 *
 * @class ImageCellCtrl
 * @param $scope {Object} - Directive scope
 * @param awIconSvc {Object} - Icon service
 * @memberof NgControllers
 */
app.controller( 'ImageCellCtrl', [ '$scope', 'awIconService', function( $scope, awIconSvc ) {
    var ctrl = this;

    /**
     * Update the type icon and thumbnail image based on the current VMO.
     *
     * @method updateIcon
     * @memberOf ImageCellCtrl
     */
    ctrl.updateIcon = function() {
        // Clear any previous thumbnail
        $scope.thumbnailUrl = '';

        // Get the updated type icon url
        $scope.typeIconFileUrl = awIconSvc.getTypeIconFileUrl( $scope.vmo );
        if( $scope.vmo ) {
            // and thumbnail url
            $scope.thumbnailUrl = awIconSvc.getThumbnailFileUrl( $scope.vmo );
        }
    };
} ] );
