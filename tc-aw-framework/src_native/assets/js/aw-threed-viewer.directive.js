// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgElementDirectives.aw-threed-viewer}
 *
 * @module js/aw-threed-viewer.directive
 *
 */
import app from 'app';
import 'js/aw-flex-row.directive';

/**
 * Directive to display the 3d viewer.
 *
 * @example <aw-threed-viewer></aw-threed-viewer>
 *
 * @member aw-threed-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awThreedViewer', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        replace: false,
        scope: {
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-threed-viewer.directive.html',
        link: function( $scope, $element ) {
            if( $scope.prop ) {
                $scope.prop.viewerContainerDiv = $element.find( 'div#awthreeDViewer' );
            } else {
                let currScope = $scope;
                while( currScope && !currScope.hasOwnProperty( 'data' ) ) {
                    currScope = currScope.$parent;
                }
                if( currScope ) {
                    currScope.data.viewContainerProp = {};
                    currScope.data.viewContainerProp.viewerContainerDiv = $element.find( 'div#awthreeDViewer' );
                }
            }
        }
    };
} ] );
