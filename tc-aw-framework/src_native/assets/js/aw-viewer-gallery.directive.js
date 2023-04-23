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
 * @module js/aw-viewer-gallery.directive
 */
import * as app from 'app';
import 'js/aw-icon-button.directive';
import 'js/aw-model-thumbnail.directive';
import 'js/aw-model-thumbnail.directive';
import 'js/aw-include.directive';
import 'js/aw-panel.directive';
import 'js/exist-when.directive';

/**
 * 
 * @example <aw-viewer-gallery></aw-viewer-gallery>
 * 
 * @member aw-viewer-gallery
 * @memberof NgElementDirectives
 * 
 * @return {Object} Directive's definition object.
 */
app.directive( 'awViewerGallery', [ function() {
    return {
        restrict: 'E',
        link: function( $scope, $element ) {
            $element.addClass( 'aw-viewerjs-scroll' );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-viewer-gallery.directive.html'
    };
} ] );
