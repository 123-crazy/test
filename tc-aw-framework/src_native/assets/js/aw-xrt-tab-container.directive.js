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
 * @module js/aw-xrt-tab-container.directive
 */
import * as app from 'app';

/**
 * Directive to display XRT tabs
 * 
 * @example <aw-xrt-tab-container></aw-xrt-tab-container>
 * 
 * @member aw-xrt-tab-container
 * @memberof NgElementDirectives
 */
app.directive( 'awXrtTabContainer', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        template: '<div class="aw-xrt-summaryXrt" ng-transclude></div>',
        replace: true
    };
} ] );
