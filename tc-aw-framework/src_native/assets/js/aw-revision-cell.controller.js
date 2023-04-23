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
 * Revision cell controller.
 * 
 * @module js/aw-revision-cell.controller
 * @requires app
 * @requires js/awIconService
 */
import * as app from 'app';
import 'js/awIconService';

'use strict';

/**
 * The controller for the aw-revision-cell directive
 * 
 * @class RevisionCellCtrl
 * @param $scope {Object} - Directive scope
 * @param awIconSvc {Object} - Icon service
 * @memberof NgControllers
 */
app.controller( 'RevisionCellCtrl', [ '$scope', 'awIconService', function( $scope, awIconSvc ) {

    var ctrl = this;

    /**
     * Update the type icon and thumbnail image based on the current VMO.
     * 
     * @method updateIcon
     * @memberOf RevisionCellCtrl
     */
    ctrl.updateIcon = function() {
        //Clear any previous thumbnail
        $scope.thumbnailUrl = '';

        //Get the updated type icon url
        $scope.typeIconFileUrl = awIconSvc.getTypeIconFileUrl( $scope.vmo );
        if( $scope.vmo ) {
            //and thumbnail url
            $scope.thumbnailUrl = awIconSvc.getThumbnailFileUrl( $scope.vmo );
        }
    };

} ] );
