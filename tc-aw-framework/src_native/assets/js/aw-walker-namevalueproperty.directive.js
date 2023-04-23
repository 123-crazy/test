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
 * @module js/aw-walker-namevalueproperty.directive
 */
import * as app from 'app';
import 'js/aw-walker-namevalueproperty.controller';
import 'js/aw-splm-table.directive';
import 'js/aw-scrollpanel.directive';
import 'js/aw-command-bar.directive';
import 'js/aw-icon.directive';
import 'js/exist-when.directive';

/*
 * Directive to display table property grid.
 *
 * @example <aw-walker-namevalueproperty namevaluepropertydata="data"></aw-walker-namevalueproperty>
 *
 * @member aw-walker-view
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerNamevalueproperty', [ function() {
    return {
        restrict: 'E',
        scope: {
            namevaluepropertydata: '=',
            viewModel: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-namevalueproperty.directive.html',
        controller: 'awWalkerNameValuepropertyController',
        link: {
            pre: function( $scope, $element, attrs, ctrl ) {
                if( $scope.namevaluepropertydata ) {
                    ctrl.init();
                }
            }
        }
    };
} ] );
