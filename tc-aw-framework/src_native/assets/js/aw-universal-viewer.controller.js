// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines universal controller that will be used by individual native viewer directives
 *
 * @module js/aw-universal-viewer.controller
 */
import * as app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/appCtxService';
import 'js/localeService';
import 'soa/kernel/clientMetaModel';
import 'soa/fileManagementService';

//eslint-disable-next-line valid-jsdoc
/**
 * Defines universal controller that will be used by individual native viewer directives. The structure of viewer
 * data on scope should be as follows:
 *
 * <pre>
 * var viewerData = {
 *      datasetData: {
 *          uid: &quot;uid of dataset object&quot;,
 *          type: &quot;&quot;
 *      },
 *      fileData : {
 *          file: {
 *              uid: &quot;uid of ImanFile object&quot;,
 *              type&quot; &quot;&quot;
 *          },
 *          fileUrl: &quot;file fms ticket&quot;,
 *      },
 *      headerProperties: [
 *          {
 *              property: { view model property object }
 *          },
 *          {
 *              property: { view model property object }
 *          },
 *          {
 *              ........
 *          }
 *      ]
 *      ...
 *      ...
 *      ...
 * </pre>
 *
 * @member awUniversalViewerController
 * @memberof NgControllers
 */
app.controller( 'awUniversalViewerController', [
    '$scope',
    '$q',
    '$timeout',
    'appCtxService',
    'localeService',
    'soa_kernel_clientDataModel',
    'soa_fileManagementService',

    function( $scope, $q, $timeout, appCtx, localeSvc, cdm, fmsSvc ) {
        /**
         * Directive scope
         */
        var self = this; //eslint-disable-line no-invalid-this

        /**
         * Describes the scope
         */
        $scope.whoAmI = 'awUniversalViewerController';

        /**
         * Promise to be invoked to set viewer height
         */
        self.resizePromise = null;

        /**
         * Callback object to be invoked on resize
         */
        self.resizeCallback = null;

        /**
         * Flag to display 'Loading...' message
         */
        $scope.loading = true;

        /**
         * Viewer header properties structure
         */
        $scope.viewerHeaderProperties = null;

        var _prevHeight = 0;

        var _prevWidth = 0;

        /**
         * Delay checking changes in the element size.
         */
        var _pingResizeCheck = _.debounce( function() {
            var height = _prevHeight;
            var width = _prevWidth;

            if( self.panelBody ) {
                height = self.panelBody.height();

                if( !height ) {
                    height = self.element.height();
                }
            }

            if( self.panelSection ) {
                width = self.panelSection.width();

                if( !width ) {
                    width = self.element.width();
                }
            }

            var diffHeight = Math.abs( _prevHeight - height );
            var diffWidth = Math.abs( _prevWidth - width );

            //Filter the initial update
            if( diffHeight > 17 || diffWidth > 17 ) {
                _prevHeight = height;
                _prevWidth = width;

                self.resizeViewer();
            }
        }, 500, {
            maxWait: 10000,
            trailing: true,
            leading: false
        } );

        /**
         * Initializes the viewer height, loading message and file url
         *
         * @param {Element} _element the directive element
         * @param {boolean} skipFmsTicketLoad flag with true indicating not to make server call to load ticket
         * @return {Object} promise object
         */
        self.initViewer = function( _element, skipFmsTicketLoad ) {
            var deferred = $q.defer();

            self.element = _element;
            self.panelBody = self.element.closest( '.aw-layout-panelBody' );
            self.panelSection = self.element.closest( '.aw-layout-panelSection' );
            self.setContextObject();
            self.setViewerDimensions();
            self.setViewerCtx();

            self.setLoadingMsg( 'LOADING_TEXT' );
            self.setViewerHeaderProperties();
            self.setupEventSubscriptions();

            /**
             * Setup watch on viewer dimension(height/width) on resizing typically due to in /out of full screen mode
             */
            $scope.$watch( function _watchUniversalViewResize() {
                _pingResizeCheck();
            } );

            if( !skipFmsTicketLoad ) {
                self.setFileUrl( deferred );
            } else {
                $scope.loading = false;
                deferred.resolve();
            }

            return deferred.promise;
        };

        self.setContextObject = function() {
            var viewerData = $scope.data;
            if( viewerData ) {
                var contextObjectUid = null;
                if( viewerData.datasetData && viewerData.datasetData.uid ) {
                    contextObjectUid = viewerData.datasetData.uid;
                } else if( viewerData.uid ) {
                    contextObjectUid = viewerData.uid;
                }
                var contextObject = cdm.getObject( contextObjectUid );
                $scope.contextObject = contextObject;
            }
        };

        /**
         * Sets context for viewer command bar
         */
        self.setViewerCtx = function() {
            if( !appCtx.getCtx( 'viewerContext' ) ) {
                var type = self.element && self.element[ 0 ] ? self.element[ 0 ].localName : 'unknown';

                var ctx = {
                    vmo: $scope.contextObject,
                    commands: {
                        fullViewMode: {
                            visible: true
                        }
                    },
                    type: type
                };

                if( appCtx.getCtx( 'fullscreen' ) === true ) {
                    ctx.commands.fullViewMode.visible = false;
                }
                appCtx.registerCtx( 'viewerContext', ctx );
            }
        };

        /**
         * @returns {Object} The current viewer context.
         */
        self.getViewerCtx = function() {
            return appCtx.getCtx( 'viewerContext' );
        };

        /**
         * This method builds the structure required by viewer header. The structure is available on the isolate
         * scope by the viewer is nested within declarative viewer gallery. The same needs to be built when the
         * viewer is used stand alone. In both the cases, i.e. when used stand alone or through declarative viewer
         * gallery, each command within the command array needs to be looked up from the command handlers map so as
         * to get relevant details like localized title, dependencies etc.
         */
        self.setViewerHeaderProperties = function() {
            $scope.$evalAsync( function() {
                var viewerData = $scope.data;
                var viewerHeaderProperties = [];
                if( viewerData ) {
                    var headerProp = {};
                    var counter = 0;
                    if( viewerData.headerProperties ) {
                        for( ; counter < viewerData.headerProperties.length; counter++ ) {
                            headerProp = viewerData.headerProperties[ counter ];
                            headerProp.cmdContext = $scope.contextObject;
                            viewerHeaderProperties.push( headerProp );
                        }
                    } else if( viewerData.properties ) {
                        var props = [ 'object_string', 'object_type', 'last_mod_date' ];
                        for( ; counter < props.length; counter++ ) {
                            var property = viewerData.properties[ props[ counter ] ];
                            headerProp.property = property;
                            headerProp.cmdContext = $scope.contextObject;
                            viewerHeaderProperties.push( headerProp );
                        }
                    }
                }

                $scope.viewerHeaderProperties = viewerHeaderProperties;
            } );
        };

        /**
         * Viewer commands require pre and post processing before execution of the actual command. This function
         * check whether currently loaded directive/controller provides implementation for any such pre/post action
         * and invokes the same accordingly.
         */
        self.setupEventSubscriptions = function() {
            self.eventSubDef = eventBus.subscribe( 'uvCommand.executed',
                function( eventData ) {
                    if( $scope.hasOwnProperty( eventData.callback ) &&
                        typeof $scope[ eventData.callback ] === 'function' ) {
                        var funcToInvoke = $scope[ eventData.callback ];
                        funcToInvoke( eventData.vmo ).then( function() {
                            eventBus.publish( eventData.callback + '.success', {} );
                        }, function() {
                            eventBus.publish( eventData.callback + '.failure', {} );
                        } );
                    } else {
                        eventBus.publish( eventData.callback + '.success', {} );
                    }
                } );
        };

        self.setResizeCallback = function( callback ) {
            self.resizeCallback = callback;
        };

        /**
         * Sets the locale specific 'Loading...' message from text bundle
         *
         * @param {String} key -
         */
        self.setLoadingMsg = function( key ) {
            localeSvc.getTextPromise().then( function( localTextBundle ) {
                $scope.$evalAsync( function() {
                    $scope.loadingMsg = localTextBundle[ key ];
                } );
            } );
        };

        /**
         * Sets the viewer height


         */
        self.setViewerDimensions = function() {
            var useParentDimensions = $scope.data && $scope.data.useParentDimensions && $scope.data.useParentDimensions === true;
            if( useParentDimensions ) {
                $scope.viewerHeight = self.element.parent().height() + 'px';
                $scope.viewerWidth = self.element.parent().width() + 'px';
            } else {
                $scope.viewerHeight = Math.max( window.innerHeight - self.element.offset().top - 85, 300 ) + 'px';
                $scope.viewerWidth = self.element.parent().width() + 'px';
            }
        };

        /**
         * Implements promise for window resize event


         */
        self.resizeTimer = function() {
            self.resizePromise = $timeout( function() {
                if( self ) {
                    if( self.setViewerDimensions ) {
                        self.setViewerDimensions();
                    }

                    if( self.resizeCallback ) {
                        self.resizeCallback();
                    }
                }
            }, 100 );
        };

        /**
         * Implements handler for window resize event


         */
        self.resizeViewer = function() {
            if( self.resizePromise ) {
                $timeout.cancel( self.resizePromise );
            }
            self.resizeTimer();
        };

        /**
         * Sets the promise to resolve file object from file url
         *
         * @param {Object} deferred - promise object
         */
        self.setFileUrl = function( deferred ) {
            var viewerData = $scope.data;
            if( viewerData ) {
                if( viewerData.fileData && viewerData.fileData.fileUrl ) {
                    $scope.$evalAsync( function() {
                        $scope.fileUrl = viewerData.fileData.fileUrl;
                        $scope.loading = false;
                        deferred.resolve();
                    } );
                } else if( viewerData.uid ) {
                    var objectToView = cdm.getObject( viewerData.uid );
                    var imanFiles = objectToView.props.ref_list;
                    if( imanFiles && imanFiles.dbValues.length > 0 ) {
                        var imanFileUid = imanFiles.dbValues[ 0 ]; //process only first file uid
                        var imanFileModelObject = cdm.getObject( imanFileUid );
                        var files = [ imanFileModelObject ];
                        fmsSvc.getFileReadTickets( files ).then(
                            function( readFileTicketsResponse ) {
                                $timeout( function() {
                                    $scope.$evalAsync( function() {
                                        if( readFileTicketsResponse && readFileTicketsResponse.tickets &&
                                            readFileTicketsResponse.tickets.length > 1 ) {
                                            var ticketsArray = readFileTicketsResponse.tickets[ 1 ]; //1st element is array of iman file while 2nd element is array of tickets
                                            if( ticketsArray && ticketsArray.length > 0 ) {
                                                $scope.fileUrl = self.getFileUrl( ticketsArray[ 0 ] );
                                                $scope.loading = false;
                                            } else {
                                                self.setLoadingMsg( 'NO_FILE_TO_RENDER_TEXT' );
                                            }
                                        } else {
                                            self.setLoadingMsg( 'NO_FILE_TO_RENDER_TEXT' );
                                        }

                                        deferred.resolve();
                                    } );
                                } );
                            } );
                    } else {
                        self.setLoadingMsg( 'NO_FILE_TO_RENDER_TEXT' );
                    }
                }
            } else {
                self.setLoadingMsg( 'NO_FILE_TO_RENDER_TEXT' );
            }
        };

        /**
         * Gets the file URL from ticket
         *
         * @param {String} ticket the file ticket
         * @return {String} file URL resolved from ticket
         */
        self.getFileUrl = function( ticket ) {
            return 'fms/fmsdownload/?ticket=' + ticket;
        };

        /**
         * generic methods to call tcooService's methods
         *
         * @param {Object} svcName - service name
         * @param {Object} svcFunc - service method name
         * @param {Object} svcInput - service inputs
         *
         * @return {Object} Returned function value.
         */
        self.invokeService = function( svcName, svcFunc, svcInput ) {
            if( svcName.hasOwnProperty( svcFunc ) ) {
                return svcName[ svcFunc ]( svcInput );
            }

            logger.error( svcFunc + '() is not present in service : ' + svcName );

            return null;
        };

        /**
         * Binds window resize event to resizeViewer handler function
         */
        $scope.$on( 'windowResize', self.resizeViewer );

        /**
         * Unbinds window resize event handler and element when controller is destroyed


         */
        self.ctrlCleanup = function() {
            //unregister viewer context
            appCtx.unRegisterCtx( 'viewerContext' );

            if( self.element ) {
                self.element.remove();
            }

            self.resizeCallback = null;
            self.resizePromise = null;

            if( _pingResizeCheck ) {
                _pingResizeCheck.cancel();
                _pingResizeCheck = null;
            }

            //de-reference all instances of header property object within viewerHeaderProperties array
            if( $scope.viewerHeaderProperties ) {
                for( var counter = 0; counter < $scope.viewerHeaderProperties.length; counter++ ) {
                    $scope.viewerHeaderProperties[ counter ].property = null;

                    if( $scope.viewerHeaderProperties[ counter ].commands ) {
                        $scope.viewerHeaderProperties[ counter ].commands.length = 0;
                        $scope.viewerHeaderProperties[ counter ].commands = null;
                    }

                    $scope.viewerHeaderProperties[ counter ].cmdContext = null;
                }

                $scope.viewerHeaderProperties.length = 0;
            }

            $scope.viewerHeaderProperties = null;

            eventBus.unsubscribe( self.eventSubDef );
        };

        /**
         * Cleanup all watchers and instance members when this scope is destroyed.
         *
         * @return {Void}
         */
        $scope.$on( '$destroy', function() {
            //Cleanup
            self.ctrlCleanup();
        } );
    }
] );
