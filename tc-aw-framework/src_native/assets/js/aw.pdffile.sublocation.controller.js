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
 * Defines the {@link NgControllers.PDFFileSubLocationCtrl}
 * 
 * @module js/aw.pdffile.sublocation.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/aw.base.sublocation.controller';
import 'js/aw-base-sublocation.directive';

/**
 * PDFFile sublocation controller.
 * 
 * @class PDFFileSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'PDFFileSubLocationCtrl', [ '$scope', '$controller', function( $scope, $controller ) {
    var ctrl = this;

    //DefaultSubLocationCtrl will handle setting up context correctly
    ngModule.extend( ctrl, $controller( 'BaseSubLocationCtrl', {
        $scope: $scope
    } ) );
} ] );
