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
 * @module js/aw-cross-selection-viewer.directive
 */
import * as app from 'app';
import 'js/aw-icon-button.directive';
import 'js/aw-model-thumbnail.directive';
import 'js/aw-model-thumbnail.directive';
import 'js/aw-include.directive';
import 'js/aw-panel.directive';
import 'js/exist-when.directive';
import 'js/appCtxService';

/**
 * 
 * @example <aw-cross-selection-viewer></aw-cross-selection-viewer>
 * 
 * @member aw-cross-selection-viewer
 * @memberof NgElementDirectives
 * 
 * @return {Object} Directive's definition object.
 */
app.directive( 'awCrossSelectionViewer', [ function() {
    return {
        restrict: 'E',
        link: function( $scope, $element ) {
            $element.addClass( 'aw-viewerjs-scroll' );
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cross-selection-viewer.directive.html',
        controller: [ '$scope', 'appCtxService', function( $scope, appCtxSvc ) {
            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             * 
             * @return {Void}
             */
            $scope.$on( '$destroy', function() {
                //Cleanup cross selection context on scope destruction
                appCtxSvc.unRegisterCtx( 'crossselection' );
            } );
        } ]
    };
} ] );
