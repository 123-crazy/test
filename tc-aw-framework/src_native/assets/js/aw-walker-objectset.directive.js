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
 * Directive to display XRT objectset
 *
 * @module js/aw-walker-objectset.directive
 */
import * as app from 'app';
import 'js/aw-walker-objectset.controller';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';
import 'js/aw-image-cell.directive';
import 'js/aw-splm-table.directive';
import 'js/aw-compare2.directive';
import 'js/aw-scrollpanel.directive';
import 'js/aw-toolbar.directive';
import 'js/aw-link-with-popup-menu.directive';
import 'js/exist-when.directive';

/**
 * Directive to display XRT objectset.
 *
 * @example <aw-walker-objectset objsetdata="objectSetData" view-model="viewModel"></aw-walker-objectset>
 *
 * @member aw-walker-objectset
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerObjectset', [ function() {
    return {
        restrict: 'E',
        scope: {
            objsetdata: '=',
            viewModel: '=',
            titlekey: '@?',
            displaytitle: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-objectset.directive.html',
        controller: 'awWalkerObjectsetController',
        link: function( $scope, $element, attrs, ctrl ) {
            /**
             * Check if showDropArea flag is set on objsetdata
             */
            $scope.showDropArea = 'true';
            if( $scope.objsetdata.showDropArea !== undefined ) {
                if( $scope.objsetdata.showDropArea === 'false' ) {
                    $scope.showDropArea = 'false';
                }
            }

            ctrl.initialize();
        }
    };
} ] );
