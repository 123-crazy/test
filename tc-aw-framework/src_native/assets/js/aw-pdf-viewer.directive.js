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
 * Directive to show native pdf viewer
 *
 * @module js/aw-pdf-viewer.directive
 */
import * as app from 'app';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import pdfViewerUtils from 'js/pdfViewerUtils';
import 'js/localeService';
import 'js/Awp0ViewerGalleryUtils';
import 'js/viewModelService';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/aw-on-load.directive';

/**
 * Native PDF viewer directive
 *
 * <aw-pdf-viewer/>
 *
 * @member aw-pdf-viewer
 * @memberof NgElementDirectives
 */
app.directive( 'awPdfViewer', [
    'localeService', 'Awp0ViewerGalleryUtils', 'viewModelService', //
    function( localeSvc, viewerGalleryUtils, viewModelService ) {
        return {
            restrict: 'E',
            // Isolate the scope
            scope: {
                data: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-pdf-viewer.directive.html',
            link: function( $scope, $element, attrs, controller ) {
                /**
                 * Initialize _element
                 */
                var _element = $element;
                 /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'awPdfViewer';

                /**
                 * PdfJS viewer html
                 */
                $scope.viewUrl = app.getBaseUrlPath() + '/lib/pdfjsw/viewer.html';
                $scope.frameTitle = localeSvc.getLoadedText( 'Awp0PDFViewerMessages' ).pdfViewerFrameTitle;

                /**
                 * setting the canvas height
                 *
                 */
                $scope.setCanvasHeight = function() {
                    $scope.$evalAsync( function() {
                        var height = window.innerHeight - $element[ 0 ].offsetTop - 50;
                        $scope.frameHeight = height - 10 + 'px';
                    } );
                };

                var loadFile = function() {
                    var frame = _element.find( '.aw-pdfjs-pdfViewerIFrame' );
                    if( frame && frame[ 0 ] ) {
                        var frameContentWindow = frame[ 0 ].contentWindow;
                        var fileUrl = $scope.fileUrl;
                        //str.startsWith not working on IE hence using indexOf instead
                        if( fileUrl && fileUrl.indexOf( 'http' ) < 0 ) {
                            fileUrl = browserUtils.getBaseURL() + fileUrl;
                        }
                        pdfViewerUtils.loadContent( frameContentWindow, fileUrl ); //ticket is set on the scope by the controller
                    }
                };

                /**
                 * Callback function invoked by aw-on-load directive once the iframe has been successfully loaded
                 *
                 * @return {Boolean} to indicate if content is completely loaded
                 */
                $scope.contentLoadComplete = function() {
                    var frame = _element.find( '.aw-pdfjs-pdfViewerIFrame' );
                    if( frame && frame[ 0 ] ) {
                        var frameContentWindow = frame[ 0 ].contentWindow;
                        var frameContentDoc = frame[ 0 ].contentDocument;

                        if( frameContentWindow && frameContentWindow.pdfjsLib && frameContentDoc ) {
                            pdfViewerUtils.initFrame( frameContentWindow, frameContentDoc, localeSvc.getLocale() );
                            pdfViewerUtils.hookOutline( frameContentWindow, frameContentDoc );

                            loadFile();

                            // set the min-width of iframe view to 300px.
                            _element.find( 'iframe' ).contents().find( 'body div#mainContainer' ).css( 'min-width',
                                '220px' );
                            return true;
                        }
                    }
                    return false;
                };

                controller.initViewer( $element );

                /**
                 * Initializes the viewer
                 */
                 var reInitializeViewer = function() {
                    var promise = controller.initViewer( $element );
                    promise.then( function() {
                        loadFile();
                    } );
                };

                var refetchPdf = eventBus.subscribe( 'fileReplace.success', function() {
                    var declViewModel = viewModelService.getViewModel( $scope, false );

                    viewerGalleryUtils.refetchViewer( declViewModel ).then(
                        function() {
                            $scope.data = declViewModel.viewerData;
                            $scope.fileUrl = declViewModel.viewerData.fileData.fileUrl;
                            reInitializeViewer();
                        }
                    );
                } );

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 *
                 * @return {Void}
                 */
                 $scope.$on( '$destroy', function() {
                    //Cleanup
                    _element = null;
                    eventBus.unsubscribe( refetchPdf );
                } );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
