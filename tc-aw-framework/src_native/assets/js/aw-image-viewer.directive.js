// @<COPYRIGHT>@
// ==================================================
// Copyright 2022.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Directive to show native image viewer
 *
 * @module js/aw-image-viewer.directive
 */
import * as app from 'app';
import imgViewer from 'js/ImgViewer';
import eventBus from 'js/eventBus';
import iconSvc from 'js/iconService';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/appCtxService';
import 'js/Awp0ViewerGalleryUtils';
import 'js/viewModelService';

var element;
var scope;

/**
 * Native image viewer directive
 *
 * @member aw-image-viewer
 * @memberof NgElementDirectives
 *
 * @return {Void}
 */
app.directive( 'awImageViewer', [
    'appCtxService', 'Awp0ViewerGalleryUtils', 'viewModelService',
    function( appCtxService, viewerGalleryUtils, viewModelService ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-image-viewer.directive.html',
            scope: { //isolate the scope
                data: '='
            },
            link: function( $scope, $element, attrs, controller ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'awImageViewer';

                /**
                 * setting ng element
                 */
                element = $element;

                /**
                 * Store reference to scope for processing on resolution of promise
                 */
                scope = $scope;

                /**
                 *
                 */
                $scope.initImageViewer = function() {
                    var imageViewer = element.find( 'div#imageViewer' )[ 0 ];
                    if( imageViewer && imageViewer.ownerDocument ) {
                        imgViewer.addResource( 'imgPlay', iconSvc.getCmdIcon( 'Play' ) );
                        imgViewer.addResource( 'imgPause', iconSvc.getCmdIcon( 'Pause' ) );
                        imgViewer.init( imageViewer );
                        imgViewer.setImage( $scope.fileUrl );
                        element.find( 'img' ).css( 'display', 'none' );
                    }
                };

                /**
                 * Set callback on window resize
                 */
                controller.setResizeCallback( imgViewer.resize );

                var initializeViewer = function() {
                    var promise = controller.initViewer( $element );
                    promise.then( function() {
                        scope.initImageViewer();
                    } );
                };

                initializeViewer();

                var refetchImage = eventBus.subscribe( 'fileReplace.success', function() {
                    var declViewModel = viewModelService.getViewModel( $scope, false );

                    viewerGalleryUtils.refetchViewer( declViewModel ).then(
                        function() {
                            $scope.data = declViewModel.viewerData;
                            $scope.fileUrl = declViewModel.viewerData.fileData.fileUrl;
                            initializeViewer();
                        }
                    );
                } );

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 */
                $scope.$on( '$destroy', function() {
                    element = null;
                    scope = null;
                    imgViewer.setImage( null );
                    eventBus.unsubscribe( refetchImage );
                } );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
