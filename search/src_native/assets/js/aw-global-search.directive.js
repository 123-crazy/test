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
 * Defines the {@link NgElementDirectives.aw-global-search}
 *
 * @module js/aw-global-search.directive
 * @requires app
 * @requires js/aw-include.directive
 * @requires js/workspaceValidationService
 */
import app from 'app';
import 'js/aw-include.directive';
import 'js/workspaceValidationService';

'use strict';

/**
 * Directive to display the Global Search Control.
 *
 *
 * @example <aw-global-search></aw-global-search>
 *
 * @member aw-global-search
 * @memberof NgElementDirectives
 * @param {_workspaceValSvc} _workspaceValSvc workspaceValidationService object
 */
app.directive( 'awGlobalSearch', [ 'workspaceValidationService', function( _workspaceValSvc ) {
    return {
        restrict: 'E',
        scope: {},
        template: '<div class="aw-search-searchContainer" role="search" exist-when="' + _workspaceValSvc.isValidPage( "teamcenter_search_search" ) + '"><aw-include name="globalSearch"></aw-include></div>'
    };
} ] );
