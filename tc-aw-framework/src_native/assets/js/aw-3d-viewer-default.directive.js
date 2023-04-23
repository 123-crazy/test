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
 * Defines the {@link NgElementDirectives.aw-3d-viewer-default}
 *
 * @module js/aw-3d-viewer-default.directive
 * @requires app
 * @requires js/aw-3d-viewer.directive
 */
import * as app from 'app';
import 'js/aw-include.directive';

/**
 * Directive to display 3D viewer.
 *
 *
 * @example <aw-3d-viewer-default></aw-3d-viewer-default>
 *
 * @member aw-3d-viewer-default
 * @memberof NgElementDirectives
 */
app.directive( 'aw3dViewerDefault', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-3d-viewer-default.directive.html'
    };
} ] );
