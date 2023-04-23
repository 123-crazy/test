// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
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
 * @module js/aw-walker-view.directive
 */
import * as app from 'app';
import 'js/aw-walker-element.directive';
import 'js/aw-column.directive';
import 'js/aw-panel-section.directive';
import xrtObjectSetHelperService from 'js/xrtObjectSetHelperService';

/**
 * Directive to display panel body.
 *
 * @example <aw-walker-view data="data"></aw-walker-view>
 *
 * @member aw-walker-view
 * @memberof NgElementDirectives
 * @returns {Object} -
 */
app.directive( 'awWalkerView', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-view.directive.html',
        link: function( $scope, $element, attrs, ctrl ) {
            if( $scope.data && $scope.data._pageRendering ) {
                let renderings = $scope.data._pageRendering;
                xrtObjectSetHelperService.parseRenderingsForSmartObjectSet( renderings );
            }
        }
    };
} ] );
