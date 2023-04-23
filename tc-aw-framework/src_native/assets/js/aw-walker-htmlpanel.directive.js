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
 * Directive to display walker view
 * 
 * @module js/aw-walker-htmlpanel.directive
 */
import * as app from 'app';
import 'js/aw-walker-htmlpanel.controller';

/**
 * Directive to display panel body.
 * 
 * @example <aw-walker-htmlpanel></aw-walker-htmlpanel>
 * 
 * @member aw-walker-htmlpanel
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerHtmlpanel', [ function() {
    return {
        restrict: 'E',
        scope: {
            htmlpaneldata: '=',
            viewModel: '='
        },
        template: '<div class="aw-xrtjs-htmlPanelContainer" ></div>',
        controller: 'awWalkerHtmlPanelController',
        link: function( $scope, $element, attrs, controller ) {
            if( $scope.htmlpaneldata ) {
                controller.initialize();
            }
        }
    };
} ] );
