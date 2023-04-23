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
 * @module js/aw-xrteditor-xrtCtxBreadcrumb.directive
 */
import * as app from 'app';
import 'js/aw-xrteditor-xrtContextUtils.service';
import 'js/aw-i18n.directive';

/**
 * Breadcrumb directive
 *
 * @example <xrt-ctx-breadcrumb></xrt-ctx-breadcrumb>
 *
 * @memberof NgElementDirectives
 * @member xrt-ctx-breadcrumb
 */
app.directive( 'xrtCtxBreadcrumb', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-xrteditor-xrtCtxBreadcrumb.directive.html'
    };
} ] );
