// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Directive to show native text viewer
 *
 * @module js/aw-text-viewer.directive
 */
import * as app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-universal-viewer.controller';
import 'js/aw-viewer-header.directive';
import 'js/appCtxService';
import 'js/Awp0ViewerGalleryUtils';
import 'js/viewModelService';
import localeSvc from 'js/localeService';

'use strict';

var scope;

/**
 * Directive to show native text viewer. Accepts viewer data through isolated scope. The structure of
 * viewer data is defined in universal controller.
 *
 * @example <aw-text-viewer data='viewerData'></aw-text-viewer>
 * @member aw-text-viewer
 * @memberof NgElementDirectives
 *
 * @return {Void}
 */
app.directive( 'awTextViewer', [ 'appCtxService', 'Awp0ViewerGalleryUtils', 'viewModelService',
    function( appCtxService, viewerGalleryUtils, viewModelService ) {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-text-viewer.directive.html',
            scope: { //isolate the scope
                data: '='
            },
            link: function( $scope, $element, attrs, controller ) {
                /**
                 * Qualifier for current controller
                 */
                $scope.whoAmI = 'awtextViewer';

                /**
                 * Store reference to scope for processing on resolution of promise
                 */
                scope = $scope;

                /**
                 * Convert plain string to safe HTML string that keeps spaces
                 *
                 * @param {String} string - the original string
                 * @return {String} the safe HTML string that keeps spaces
                 */
                function toSafeHtmlKeepSpace( string ) {
                    var cols = string.split( '\t' );
                    var safe = '';
                    for( var i = 0; i < cols.length; i++ ) {
                        safe += cols[ i ].replace( /&/g, '&amp;' );
                        if( i < cols.length - 1 ) {
                            var len = 8 - cols[ i ].length % 8;
                            for( var j = 0; j < len; j++ ) {
                                safe += '&nbsp;';
                            }
                        }
                    }

                    var patt = new RegExp( '[ ][ ]+' );
                    var res = patt.exec( safe );
                    while( res ) {
                        var rep = res[ 0 ].replace( /[ ]/g, '&nbsp;' );
                        safe = safe.replace( res[ 0 ], rep );
                        res = patt.exec( safe );
                    }

                    return safe.replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
                }

                function setContent() {                    
                    var viewerCtx = appCtxService.getCtx( 'viewerContext' );
                    var reader = new FileReader();
                    reader.onload = function() {
                        var data = reader.result;
                        var page = $scope._element.find( '#aw-text-page' );
                        var lineNumbers = $scope._element.find( '#aw-text-lines' );

                        if( data && page[ 0 ] && lineNumbers[ 0 ] ) {
                            var lines = data.split( /\r?\n/ );
                            var maxLen = 0;

                            page.empty();
                            lineNumbers.empty();
                            for( var i = 0; i < lines.length; i++ ) {
                                var safeHtml = toSafeHtmlKeepSpace( lines[ i ] );
                                if( maxLen < safeHtml.length ) {
                                    maxLen = safeHtml.length;
                                }
                                page.append( '<div>' + safeHtml + '<br/></div>' );
                                lineNumbers.append( '<div>' + ( i + 1 ) + '<br/></div>' );
                            }

                            page.css( 'maxWidth', maxLen + 'em' );
                        }
                    };
                    reader.readAsText( $scope.blob, viewerCtx.textEncoding );
                }

                /**
                 * Initialize Text Viewer
                 *
                 * @param {Element} _element the directive element
                 */
                $scope.initTextViewer = function( _element ) {
                    $scope._element = _element;

                    var xhr = new XMLHttpRequest();
                    xhr.open( 'GET', $scope.fileUrl, true );
                    xhr.responseType = 'blob';
                    xhr.onload = function( e ) {
                        if ( this.status === 200 ) {
                            $scope.blob = this.response;
                            setContent();
                        }
                    };
                    xhr.send();

                    var viewerCtx = appCtxService.getCtx( 'viewerContext' );
                    if( viewerCtx ) {
                        viewerCtx.showWordWrap = true;
                        viewerCtx.wordWrapped = true;

                        var locale = localeSvc.getLocale();
                        var charset = {
                            ja_JP: 'Shift-JIS',
                            zh_CN: 'GB2312',
                            zh_TW: 'Big5',
                            ko_KR: 'EUC-KR'
                        };

                        viewerCtx.textLocale = charset[ locale ];
                        viewerCtx.textUnicode = 'UTF-8';
                        viewerCtx.textEncoding = viewerCtx.textUnicode;
                    }
                };

                /**
                 * initialize the viewer for
                 *      1. size the viewer based on available height
                 *      2. Get the ticket
                 *      3. Get localized message to display till file is loaded
                 *
                 *@param {Element} $element - angular element
                 */
                var promise = controller.initViewer( $element );
                promise.then( function() {
                    scope.initTextViewer( $element );
                } );

                var refetchText = eventBus.subscribe( 'fileReplace.success', function() {
                    var declViewModel = viewModelService.getViewModel( $scope, false );
                    viewerGalleryUtils.refetchViewer( declViewModel ).then(
                        function() {
                            $scope.data = declViewModel.viewerData;
                            $scope.fileUrl = declViewModel.viewerData.fileData.fileUrl;
                            controller.initViewer( $element ).then( function() {
                                scope.initTextViewer( $element );
                            } );
                        }
                    );
                } );

                var textEncodingChanged = eventBus.subscribe( 'textEditor.encodingChanged', function() {
                    var viewerCtx = appCtxService.getCtx( 'viewerContext' );
                    if( $scope.blob ) {
                        var value = viewerCtx.textEncoding === viewerCtx.textUnicode ? viewerCtx.textLocale : viewerCtx.textUnicode;
                        viewerCtx.textEncoding = value;
                        setContent();
                    }
                } );

                /**
                 * Cleanup all watchers and instance members when this scope is destroyed.
                 */
                $scope.$on( '$destroy', function() {
                    $element = null;
                    eventBus.unsubscribe( refetchText );
                    eventBus.unsubscribe( textEncodingChanged );
                } );
            },
            controller: 'awUniversalViewerController'
        };
    }
] );
