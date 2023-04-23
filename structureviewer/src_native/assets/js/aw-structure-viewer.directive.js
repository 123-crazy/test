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
 * Defines the {@link NgElementDirectives.aw-structure-viewer}
 *
 * @module js/aw-structure-viewer.directive
 *
 */
import app from 'app';
import analyticsSvc from 'js/analyticsService';
import 'js/aw-structure-viewer.controller';
import 'js/aw-flex-row.directive';

/**
 * Directive to display the 3d viewer for structure.
 *
 * @example <aw-structure-viewer></aw-structure-viewer>
 *
 * @member aw-structure-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awStructureViewer', [ function() {
    return {
        restrict: 'E',
        transclude: true,
        replace: false,
        scope: {
            prop: '='
        },
        templateUrl: app.getBaseUrlPath() + "/html/aw-structure-viewer.directive.html",
        link: function( $scope, $element, attrs, controller ) {
            controller.initViewer( $element );
            // Publish SAN event to log Viewer Resolution to analytics
            sanSendViewerResolution( parseInt( $scope.viewerHeight ), parseInt( $scope.viewerWidth ) );
        },
        controller: 'awStructureViewerController'
    };
} ] );

/**
 * Send the viewer resolution to SAN Analytics
 *
 * @param - {Integer} viewerWidth - width of the 3D viewer in pixels
 * @param - {Integer} viewerHeigt - height of the 3D viewer in pixels
 */
function sanSendViewerResolution( viewerWidth, viewerHeight ) {
    var viewerData = JSON.parse( localStorage.getItem( "sanViewerData" ) );
    var new_viewerData = {
        sanCommandId: "ViewerData",
        sanCommandTitle: "Viewer Window Info",
        sanWidth: viewerWidth,
        sanHeight: viewerHeight
    };

    //if we have a resolution from last time...
    if( viewerData ) {
        //if the viewer resolution has changed since the last time we reported it...
        if( !( viewerData.width === new_viewerData.width && viewerData.height === new_viewerData.height ) ) {
            localStorage.setItem( "sanViewerData", JSON.stringify( new_viewerData ) );
            analyticsSvc.logNonDeclarativeCommands( new_viewerData );
        }
    } else {
        //this is the first time reporting this info, store it in localStorage and publish
        localStorage.setItem( "sanViewerData", JSON.stringify( new_viewerData ) );
        analyticsSvc.logNonDeclarativeCommands( new_viewerData );
    }
}
