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
 * Directive to show native html viewer
 *
 * @module js/aw-html-viewer.directive
 */
import * as app from 'app';
import $ from 'jquery';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/localeService';

/**
 * Store reference to element for processing when promise is resolved
 */
var _element;

/**
 * Native html viewer directive
 *
 * @member aw-html-viewer
 * @memberof NgElementDirectives
 *
 * @return {Void}
 */
app.directive( 'awHtmlViewer', [ '$http', 'localeService', //
    function( $http, localeSvc ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-html-viewer.directive.html',
            // Isolate the scope
            scope: {
                data: '='
            },
            link: function( $scope, $element, attrs, controller ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'awHtmlViewer';

                /**
                 * Html viewer html
                 */
                $scope.viewUrl = app.getBaseUrlPath() + '/html/html_iframe_content.html';

                $scope.frameTitle = localeSvc.getLoadedText( 'Awp0HTMLViewerMessages' ).htmlViewerFrameTitle;

                /**
                 * Initialize _element
                 */
                _element = $element;

                $scope.processResponse = function( response ) {
                    if( response && response.data ) {
                        var iframe = _element.find( 'iframe' );
                        var iframedoc;
                        if( iframe && iframe[ 0 ].contentDocument ) {
                            iframedoc = iframe[ 0 ].contentDocument;
                        } else if( iframe && iframe[ 0 ].contentWindow ) {
                            iframedoc = iframe[ 0 ].contentWindow.document;
                        }
                        if( iframedoc ) {
                            // Put the content in the iframe
                            iframedoc.open();
                            var iframedocContent = response.data;
                            iframedoc.writeln( iframedocContent );
                            iframedoc.close();
                        }
                    }
                };

                $scope.processTicket = function() {
                    var promise = $http.get( $scope.fileUrl );
                    promise.then( function( response ) {
                        $scope.processResponse( response );
                    } );
                };

                // Populate the iframe with HTML content
                var promise = controller.initViewer( _element );
                promise.then( function() {
                    $scope.processTicket();
                } );

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 *
                 * @return {Void}
                 */
                $scope.$on( '$destroy', function() {
                    //Cleanup
                    $element = null;
                } );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
