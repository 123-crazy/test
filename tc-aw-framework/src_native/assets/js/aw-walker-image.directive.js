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
 * Directive to display walker view
 *
 * @module js/aw-walker-image.directive
 */
import * as app from 'app';
import 'js/aw-model-thumbnail.directive';
import 'js/aw-3d-viewer-default.directive';

/**
 * Directive to display panel body.
 *
 * @example <aw-walker-image></aw-walker-image>
 *
 * @member aw-walker-image
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerImage', [ function() {
    return {
        restrict: 'E',
        scope: {
            imgdata: '=',
            viewModel: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-image.directive.html'
    };
} ] );
