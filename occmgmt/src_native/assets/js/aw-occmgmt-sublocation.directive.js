// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to display the selection summary of multiple model objects.
 *
 * @module js/aw-occmgmt-sublocation.directive
 */
import app from 'app';
import 'angular';
import 'js/aw-include.directive';
import 'js/aw.occmgmt.sublocation.controller';

'use strict';

/**
 * Directive to display the selection summary of multiple model objects.
 *
 * @example <aw-occmgmt-sublocation></aw-occmgmt-sublocation>
 *
 * @member aw-occmgmt-sublocation
 * @memberof NgElementDirectives
 */
app.directive( 'awOccmgmtSublocation', [ function() {
    return {
        restrict: 'E',
        templateUrl: app.getBaseUrlPath() + '/html/aw.occmgmt.sublocation.html',
        transclude: true,
        scope: {
            provider: '=',
            baseSelection: '='
        },
        controller: 'OccMgmtSubLocationCtrl'
    };
} ] );
