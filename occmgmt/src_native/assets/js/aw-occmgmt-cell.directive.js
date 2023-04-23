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
 * occMgmt cell directive to be used within a cell list
 * 
 * @module js/aw-occmgmt-cell.directive
 */
import app from 'app';
import 'js/aw-model-icon.directive';
import 'js/aw-default-cell-content.directive';
import 'js/aw-occmgmt-cell.controller';

'use strict';

/**
 * 
 * 
 * @example <aw-occmgmt-cell vmo="model"></aw-occmgmt-cell>
 * 
 * @member aw-occmgmt-cell.directive
 * @memberof NgElementDirectives
 */
app.directive( 'awOccmgmtCell', [ function() {
    return {
        restrict: 'E',
        scope: {
            vmo: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-occmgmt-cell.directive.html',
        controller: 'OccMgmtCellCtrl'
    };
} ] );
