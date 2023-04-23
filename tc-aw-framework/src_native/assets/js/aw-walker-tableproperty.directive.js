// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * Directive to display walker view
 *
 * @module js/aw-walker-tableproperty.directive
 */
import * as app from 'app';
import 'js/aw-walker-tableproperty.controller';
import 'js/aw-splm-table.directive';
import 'js/aw-scrollpanel.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-icon.directive';
import 'js/exist-when.directive';

/*
 * Directive to display table property grid.
 *
 * @example <aw-walker-tableproperty tablepropertydata="data"></aw-walker-tableproperty>
 *
 * @member aw-walker-view
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerTableproperty', [ function() {
    return {
        restrict: 'E',
        scope: {
            tablepropertydata: '=',
            viewModel: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-tableproperty.directive.html',
        controller: 'awWalkerTablepropertyController',
        link: {
            pre: function( $scope, $element, attrs, ctrl ) {
                if( $scope.tablepropertydata ) {
                    ctrl.init();
                }
            }
        }
    };
} ] );
