// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgElementDirectives.aw-req-viewer}
 * @module js/aw-req-viewer.directive
 * @requires app
 */
import app from 'app';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/aw-requirement-content.directive';

'use strict';

/**
 * Directive to display the Requirement Universal viewer.
 * @example <aw-req-viewer></aw-req-viewer>
 *
 * @member aw-req-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awReqViewer', [ function() {
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-req-viewer.directive.html',
        link: function( $scope, $element, attrs, controller ) {
            if ( $scope.data ) {
                $scope.data.useParentDimensions = true;
                var ele = $element[0];
                while ( ele !== null && !ele.classList.contains( 'aw-xrt-columnContentPanel' ) ) {
                    ele = ele.parentElement;
                }
                if( ele && ele.clientHeight ) {
                    var parentHeight = ele.clientHeight;
                    $scope.resizeViewer = function() {
                        $scope.viewerHeight = parentHeight - 135 + 'px';
                    };
                    controller.setResizeCallback( $scope.resizeViewer );
                }
            }
            controller.initViewer( $element, true );
            if ( $scope.data ) {
                $scope.viewerHeight = parentHeight - 135 + 'px';
            }

            /**
             * Cleanup all watchers and instance members when this scope is destroyed.
             */
            $scope.$on( '$destroy', function() {
                //Cleanup
                $element = null;
            } );
        },
        controller: 'awUniversalViewerController'
    };
} ] );
