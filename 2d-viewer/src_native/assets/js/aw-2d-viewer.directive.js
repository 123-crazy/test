// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to show 2d viewer
 *
 * @module js/aw-2d-viewer.directive
 */
import app from 'app';
import 'js/aw-flex-row.directive';

'use strict';

/**
 * 2D viewer directive
 *
 * @member aw-2d-viewer
 * @memberof NgElementDirectives
 *
 * @return {Void} none
 */
app.directive( 'aw2dViewer', [
    function( ) {
        return {
            restrict: 'E',
            transclude: true,
            replace: false,
            scope: {
                prop: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-2d-viewer.directive.html',
            link: function( $scope, $element ) {
                if( $scope.prop ) {
                    $scope.prop.viewerContainerDiv = $element.find( 'div#aw2dViewer' );
                } else {
                    let currScope = $scope;
                    while( currScope && !currScope.hasOwnProperty( 'data' ) ) {
                        currScope = currScope.$parent;
                    }
                    if( currScope ) {
                        currScope.data.viewContainerProp = {};
                        currScope.data.viewContainerProp.viewerContainerDiv = $element.find( 'div#aw2dViewer' );
                    }
                }
            }
        };
    }
] );
