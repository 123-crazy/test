// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines code controller that will be used by code directive
 *
 * @module js/aw-code-viewer.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'soa/kernel/soaService';
import 'js/appCtxService';
import 'js/aw-universal-viewer.controller';
import 'js/sourceEditor.service';
import 'js/messagingService';
import 'js/Awp0ViewerGalleryUtils';
import 'js/viewModelService';

'use strict';

/**
 * Defines code controller that will be used by code directive
 *
 * @member awCodeViewerController
 * @memberof aw-universal-viewer.controller.js
 */
app.controller( 'awCodeViewerController', [
    '$scope',
    '$element',
    '$controller',
    '$q',
    '$timeout',
    'soa_kernel_soaService',
    'sourceEditorService',
    'messagingService',
    'Awp0ViewerGalleryUtils',
    'appCtxService',
    'viewModelService',
    function( $scope, $element, $controller, $q, $timeout, soaSvc, sourceEditorSvc, messagingSvc, viewerGalleryUtils, appCtxSvc, viewModelSvc ) {

        var self = this;
        ngModule.extend( self, $controller( 'awUniversalViewerController', {
            $scope: $scope
        } ) );

        $scope.whoAmI = 'awCodeViewerController';

        $scope.load = function() {
            var xhr = new XMLHttpRequest();
            xhr.open( 'GET', $scope.fileUrl, true );
            xhr.responseType = 'blob';
            xhr.onload = function( e ) {
                if ( this.status === 200 ) {
                    $scope.blob = this.response;
                    setReadOnly();
                    setContent();
                }
            };
            xhr.send();
        };

        $scope.preCheckin = function() {
            var deferred = $q.defer();
            loadSave( 'save', function(){
                setChange( 1 );
                deferred.resolve();
            } );
            return deferred.promise;
        };

        $scope.postCheckin = function() {
            var deferred = $q.defer();
            setReadOnly( true );
            deferred.resolve();
            return deferred.promise;
        };

        $scope.preCheckout = function() {
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        };

        $scope.postCheckout = function() {
            var deferred = $q.defer();
            setReadOnly( false );
            deferred.resolve();
            return deferred.promise;
        };

        $scope.preCancelCheckout = function() {
            var deferred = $q.defer();
            deferred.resolve();
            return deferred.promise;
        };

        $scope.postCancelCheckout = function() {
            var deferred = $q.defer();

            // get the original file url
            var viewerData = $scope.data;
            if( viewerData && viewerData.fileData && viewerData.datasetData ) {
                viewerData.fileData.fileUrl = null;
                viewerData.uid = viewerData.datasetData.uid;
            }

            var waitFileUrl = $q.defer();
            self.setFileUrl( waitFileUrl );
            waitFileUrl.promise.then( function() {
                var xhr = new XMLHttpRequest();
                xhr.open( 'GET', $scope.fileUrl, true );
                xhr.responseType = 'blob';
                xhr.onload = function( e ) {
                    if ( this.status === 200 ) {
                        $scope.blob = this.response;
                        setReadOnly( true );
                        setContent();
                        deferred.resolve();
                    }
                };
                xhr.send();
            } );
            return deferred.promise;
        };

        // Private functions
        function setContent() {
            setChange( 0 );

            var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
            var reader = new FileReader();
            reader.onload = function() {
                $scope.editor.content = reader.result;
            };
            reader.readAsText( $scope.blob, viewerCtx.textEncoding );
        }

        function setChange( value ) {
            $scope.editor.change = value === undefined ? $scope.editor.change + 1 : value;
        }

        function setReadOnly( readOnly ) {
            if( readOnly === undefined && $scope.editor.dataset && $scope.editor.dataset.props ) {
                var props = $scope.editor.dataset.props;
                var isCheckedOut = props.checked_out && props.checked_out.dbValues[ 0 ] === 'Y';
                var isModifiable = props.is_modifiable && props.is_modifiable.dbValues[ 0 ] === '1';
                readOnly = !isCheckedOut || !isModifiable ;
            }

            $scope.readOnly = readOnly;
            sourceEditorSvc.updateOptions( 'awCodeEditor', { readOnly: readOnly } );
            if( !readOnly ) {
                var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
                viewerCtx.textEncoding = viewerCtx.textUnicode;
            }
        }

        function loadSave( method, callback ) {
            if( $scope.editor.dataset ) {
                var inputData = {
                    baseObject: { uid: $scope.editor.dataset.uid },
                    action: method,
                    content: method === 'save' ? $scope.editor.content : ''
                };

                var promise = soaSvc.postUnchecked( 'Internal-DocMgmtAw-2019-12-DocMgmt', 'processTextDataset', inputData );
                promise.then( function( response ) {
                    if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
                        var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
                        if( errValue.level <= 1 ) {
                            messagingSvc.showInfo( errValue.message );
                        } else {
                            messagingSvc.showError( errValue.message );
                        }
                    } else if( callback ) {
                        callback( response );
                    }
                } );
            }
        }

        // Wait to update until after everything is visible
        _.defer( function() {
            $timeout( function() {
                if( self ) {
                    self.updateAfterResize();
                }
            }, 250 );
        } );

        var checkInFailureEventSub = eventBus.subscribe( 'preCheckin.failure', function() {
            return $scope.revealViewer( 'edit', true );
        } );

        var checkOutFailureEventSub = eventBus.subscribe( 'preCheckout.failure', function() {
            return $scope.revealViewer( 'edit', true );
        } );

        self.updateAfterResize = function() {
            var viewer = document.getElementsByTagName( 'aw-code-viewer' );

            if( viewer.length > 0 ) {
                var toolbar = viewer[ 0 ].querySelector( '.aw-commandBar-container' );

                var fromTop = toolbar.offsetTop;
                fromTop += toolbar.offsetHeight;

                var docHeight = document.documentElement.clientHeight;
                var toBottom = docHeight - fromTop; // - 130;
                var proportion = Math.floor( toBottom / 12 ) - 1;

                var flexString = 'flex: 0 0 ' + proportion.toString() + 'em';

                var editor = document.getElementsByTagName( 'aw-source-editor' );

                if( editor.length > 0 ) {
                    var parent = editor[ 0 ].parentElement;
                    parent.style = flexString;
                }
            }
        };

        var contentChangedEvent = eventBus.subscribe( 'sourceEditor.contentChanged', function( data ) {
            setChange();
        } );

        // If the viewer is resized by using the full view button, adjust the height
        var fullScreenEventSubscription = eventBus.subscribe( 'aw-command-logEvent', function( data ) {
            if( data &&
                ( data.sanCommandId === 'Awp0FullScreen' ||
                    data.sanCommandId === 'fullViewMode' || data.sanCommandId === 'Awp0ExitFullScreen' ) ) {
                _.defer( function() {
                    self.updateAfterResize();
                } );
            }
        } );

        var refetchCode = eventBus.subscribe( 'fileReplace.success', function() {
            var declViewModel = viewModelSvc.getViewModel( $scope, false );
            viewerGalleryUtils.refetchViewer( declViewModel ).then( function() {
                $scope.data = declViewModel.viewerData;
                $scope.fileUrl = declViewModel.viewerData.fileData.fileUrl;
                self.initViewer( $element ).then( $scope.initCodeViewer );
            } );
        } );

        var textEncodingChanged = eventBus.subscribe( 'textEditor.encodingChanged', function() {
            var viewerCtx = appCtxSvc.getCtx( 'viewerContext' );
            if( $scope.readOnly && $scope.blob ) {
                var value = viewerCtx.textEncoding === viewerCtx.textUnicode ? viewerCtx.textLocale : viewerCtx.textUnicode;
                viewerCtx.textEncoding = value;
                setContent();
            }
        } );

        $scope.$on( 'windowResize', self.updateAfterResize );

        /**
         * Cleanup up when this scope is destroyed.
         */
        $scope.$on( '$destroy', function() {
            if( $scope.editor.change > 1 ) {
                loadSave( 'save' );
            }

            $scope.hasError = false;
            $scope.whoAmI = null;

            eventBus.unsubscribe( checkInFailureEventSub );
            eventBus.unsubscribe( checkOutFailureEventSub );
            eventBus.unsubscribe( fullScreenEventSubscription );
            eventBus.unsubscribe( contentChangedEvent );
            eventBus.unsubscribe( refetchCode );
            eventBus.unsubscribe( textEncodingChanged );
        } );
    }
] );
