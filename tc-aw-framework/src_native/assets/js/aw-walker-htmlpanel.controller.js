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
 * @module js/aw-walker-htmlpanel.controller
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import uwDirectiveHtmlPanelUtils from 'js/uwDirectiveHtmlPanelUtils';
import 'js/xrtHtmlPanelService';
import 'js/appCtxService';
import 'js/viewModelObjectService';
import 'soa/kernel/clientDataModel';

/**
 * Controller referenced from the 'div' <aw-walker-htmlpanel>
 *
 * @memberof NgController
 * @member awWalkerHtmlPanelController
 *
 * @param {$scope}  $scope - Data context node fore this controller.
 * @param {$element}  $element - DOM Element that holds this controller.
 * @param {$timeout} $timeout  - Service to use.
 * @param {$interval} $interval  - Service to use.
 * @param {xrtHtmlPanelService} xrtHtmlPanelSvc  - Service to use.
 * @param {appCtxService} appCtxSvc  - Service to use.
 * @param {viewModelObjectService} viewModelObjectSvc  - Service to use.
 * @param {soa_kernel_clientDataModel} cdm  - Service to use.
 */
app.controller( 'awWalkerHtmlPanelController', [ //
    '$scope', //
    '$element', //
    '$timeout', //
    '$interval', //
    'xrtHtmlPanelService', //
    'appCtxService', //
    'viewModelObjectService', //
    'soa_kernel_clientDataModel', //
    function( $scope, $element, $timeout, $interval, xrtHtmlPanelSvc, appCtxSvc, viewModelObjectSvc, cdm ) {
        var self = this;

        var eventSub = null;
        var contElement = $element.find( '.aw-xrtjs-htmlPanelContainer' );

        /**
         * Only used when enableresize option is true for htmlPanel
         */
        var scrollElement = null;
        var sectionElem = null;
        var columnElem = null;
        var nonColAndSecElem = null;

        /**
         * Static CSS classes used for htmlPanel enableResize
         */
        var HTMLPANEL_ENABLE_RESIZE = 'aw-xrt-htmlPanelEnableResize';
        var RESIZE_SECTION = 'aw-xrt-htmlPanelResizeSection';
        var RESIZE_COLUMN = 'aw-xrt-htmlPanelResizeColumn';
        var RESIZE_NONCOLUMN_AND_SECTION = 'aw-xrt-htmlPanelResizeContainer';

        /**
         * HTML meta characters will be un-escaped. This method should be used only after sanitizing the input.
         *
         * @private
         *
         * @param {String} escapedSafe - escapedSafe HTML String which needs to be un-escaped.
         *
         * @return {String} Returns un-escaped and safe HTML String.
         */
        var _unEscapeHtml = function( escapedSafe ) { //eslint-disable-line no-unused-vars
            return escapedSafe.replace( /&amp;/ig, '&' ).replace( /&lt;/ig, '<' ).replace( /&gt;/ig, '>' ).replace(
                /&quot;/ig, '"' ).replace( /&apos;/ig, '\'' ).replace( /\\\//g, '/' ).replace( /\\\\/g, '\\' ); //eslint-disable-line no-useless-escape
        };

        /**
         * Ignore and replace string literals with empty characters.
         *
         * @private
         *
         * @param {String} escapedSafe - escapedSafe HTML String which needs to be replacing string literals (\n,
         *            \t, \r, \, /, \b, \f) with empty characters.
         *
         * @return {String} Returns replaced string by removing string literals.
         */
        var _ignoreStringLiterals = function( escapedSafe ) { //eslint-disable-line no-unused-vars
            return escapedSafe.replace( /\\n/g, '' ).replace( /\\t/g, '' ).replace( /\\r/g, '' ).replace( /\\b/g,
                '' ).replace( /\\f/g, '' );
        };

        /**
         * Used only when htmlpanel 'enableresize' option is set to true. </br>
         *
         * Adding CSS class to container element and turning on flex for all the children. With this approach no
         * layout resize listeners are needed and it resizes automatically using CSS flex approach.
         */
        function _addContainerResizeCSS() {
            scrollElement = $element.closest( '.aw-base-scrollPanel' );
            if( scrollElement && scrollElement.length > 0 ) {
                $( scrollElement ).addClass( HTMLPANEL_ENABLE_RESIZE );

                sectionElem = $element.closest( '.aw-layout-sublocationContent .aw-layout-panelSection' );
                columnElem = $element.closest( '.aw-layout-sublocationContent .aw-layout-column' );
                nonColAndSecElem = $element.closest( '.aw-layout-sublocationContent .aw-xrt-nonColumnAndSection' );

                if( sectionElem && sectionElem.length > 0 ) {
                    $( sectionElem ).addClass( RESIZE_SECTION );
                } else if( columnElem && columnElem.length > 0 ) {
                    $( columnElem ).addClass( RESIZE_COLUMN );
                } else if( nonColAndSecElem && nonColAndSecElem.length > 0 ) {
                    $( nonColAndSecElem ).addClass( RESIZE_NONCOLUMN_AND_SECTION );
                }
            }
        }

        /**
         * Clean up resize related css classes on container elements if any on destroy.
         */
        function _cleanUpResizeCSS() {
            if( scrollElement && scrollElement.length > 0 ) {
                $( scrollElement ).removeClass( HTMLPANEL_ENABLE_RESIZE );
            }

            if( sectionElem && sectionElem.length > 0 ) {
                $( sectionElem ).removeClass( RESIZE_SECTION );
            }

            if( columnElem && columnElem.length > 0 ) {
                $( columnElem ).removeClass( RESIZE_COLUMN );
            }

            if( nonColAndSecElem && nonColAndSecElem.length > 0 ) {
                $( nonColAndSecElem ).removeClass( RESIZE_NONCOLUMN_AND_SECTION );
            }
        }

        /**
         * @param {ViewModelObject} parentVMO - VMO to access
         * @param {String} propName - Name of the property to on parent to access for results.
         *
         * @return {HtmlPanelModelObject} New object representing the CDM modelObject at the given property (or {}
         *         if no object found at that property)..
         */
        function _createHtmlPanelModelObject( parentVMO, propName ) {
            var propHtmlPanelObj;

            if( parentVMO.props[ propName ] && !_.isEmpty( parentVMO.props[ propName ].dbValue ) ) {
                var propModelObj = cdm.getObject( parentVMO.props[ propName ].dbValue );

                if( propModelObj ) {
                    var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( propModelObj );

                    propHtmlPanelObj = xrtHtmlPanelSvc.createHtmlPanelModelObjectOverlay( vmo );
                } else {
                    propHtmlPanelObj = {};
                }
            } else {
                propHtmlPanelObj = {};
            }

            return propHtmlPanelObj;
        }

        /**
         * Parses htmlPanel data and initialize ('bootstrap') the angular system and create an angular controller on
         * a new 'child' of the given 'parent' element. . aram {Object} htmlPanelData - The JSON definition of the
         * desired DeclDataProvider object from the DeclViewModel's JSON.
         *
         * @param {Object} htmlPanelData - Object from the XRT tag (e.g. with 'id', 'src', etc.).
         * @param {Element} parentElement - The associated DeclAction object from the DeclViewModel's JSON.
         * @param {Object} data - The object used to 'setData' into the controller.
         * @param {DeclViewModel} viewModel - {DeclViewModel} to add this panel to.
         *
         * @memberof module:js/xrtHtmlPanelService
         */
        self.parseHtmlPanel = function( htmlPanelData, parentElement, data, viewModel ) {
            if( !htmlPanelData ) {
                return;
            }

            if( htmlPanelData.id ) {
                xrtHtmlPanelSvc.parseHtmlPanelId( htmlPanelData, parentElement, data );

                if( !viewModel.gwtPresenters ) {
                    viewModel.gwtPresenters = [];
                }

                viewModel.gwtPresenters.push( htmlPanelData.id );

                return;
            }

            var params = {};

            if( htmlPanelData.src ) {
                var stringArr = [];

                stringArr.push( '<div class="aw-jswidgets-htmlPanelFrame aw-xrt-columnContentPanel">\n' ); //$NON-NLS-1$
                stringArr.push( '<aw-frame url="' ); //$NON-NLS-1$
                stringArr.push( htmlPanelData.src );
                stringArr.push( '"></aw-frame>\n' ); //$NON-NLS-1$
                stringArr.push( '</div>\n' ); //$NON-NLS-1$

                params.panelInnerHtml = stringArr.join( '' );
            } else if( htmlPanelData.CDATA ) {
                if( htmlPanelData.module ) {
                    params.depsModule = htmlPanelData.module;
                }

                var unEscapedHtml = _unEscapeHtml( htmlPanelData.CDATA );

                params.panelInnerHtml = _ignoreStringLiterals( unEscapedHtml );
            } else if( htmlPanelData.declarativeKey ) {
                var awIncludeString = '<aw-include class="aw-jswidgets-declarativeKeyCont" name="' + htmlPanelData.declarativeKey + '"></aw-include>';

                params.panelInnerHtml = awIncludeString;
            }

            if( htmlPanelData.enableresize ) {
                _addContainerResizeCSS();
            }

            /**
             * - Check if we ended up with any parameters to work with
             */
            if( !_.isEmpty( params ) && params.panelInnerHtml ) {
                var userSession = appCtxSvc.getCtx( 'userSession' );

                var userSessionHPMO = xrtHtmlPanelSvc.createHtmlPanelModelObjectOverlay( userSession );

                var userHPMO = _createHtmlPanelModelObject( userSession, 'user' );
                var groupHPMO = _createHtmlPanelModelObject( userSession, 'group' );
                var roleHPMO = _createHtmlPanelModelObject( userSession, 'role' );
                var projectHPMO = _createHtmlPanelModelObject( userSession, 'project' );

                var selectedObj = xrtHtmlPanelSvc.createHtmlPanelModelObjectOverlay( viewModel.vmo );

                var htmlPanelDataCtx = {
                    session: {
                        current_user_session: userSessionHPMO,
                        current_user: userHPMO,
                        current_group: groupHPMO,
                        current_role: roleHPMO,
                        current_project: projectHPMO
                    },
                    selected: selectedObj
                };

                uwDirectiveHtmlPanelUtils.insertPanel( parentElement, params.panelInnerHtml, params.depsModule,
                    htmlPanelDataCtx );
            }
        };

        /**
         * Initialization
         */
        self.initialize = function() {
            self.parseHtmlPanel( $scope.htmlpaneldata, contElement, {
                xrtData: $scope.viewModel.xrtData
            }, $scope.viewModel );

            var nativeDataLoadHandler = function( data ) {
                if( data && data.viewModelObjects ) {
                    if( !$scope.viewModel.customPanel ) {
                        $scope.viewModel.customPanel = {};
                    }
                    if( !$scope.viewModel.customPanel.viewModelCollection ) {
                        $scope.viewModel.customPanel.viewModelCollection = [];
                    }

                    // Identify which dataProvider the viewModelObject's belong to and assign the editContext
                    // to it so that the editHandler can be located for individual table property editing.
                    if( data && data.scope && data.scope.data && data.scope.data.dataProviders ) {
                        for( let dpName in data.scope.data.dataProviders ) {
                            const dataProvider = data.scope.data.dataProviders[ dpName ];
                            if( data.viewModelObjects === dataProvider.viewModelCollection.loadedVMObjects ) {
                                dataProvider.json.customPanelEditContext = $scope.viewModel._internal.editContext;
                            }
                        }
                    }

                    var vmCollection = $scope.viewModel.customPanel.viewModelCollection;
                    _.forEach( data.viewModelObjects, function( viewModelObject ) {
                        var index = _.findIndex( vmCollection, {
                            uid: viewModelObject.uid
                        } );
                        if( index >= 0 ) {
                            vmCollection.splice( index, 1 );
                        }
                        vmCollection.push( viewModelObject );
                    } );
                }
            };

            // The event will be un-subscribed automatically when the declViewModel will be destroyed.
            // declViewModel un-subscribes all the event registered within it before destroying itself.
            var vmInternal = $scope.viewModel._internal;
            if( vmInternal ) {
                var eventSubscriptionMap = vmInternal.subPanelId2EventSubscriptionsMap;
                if( eventSubscriptionMap ) {
                    var nativeDataLoadEvent = eventSubscriptionMap.nativeDataLoadEvent;

                    if( !nativeDataLoadEvent ) {
                        var subdef = eventBus.subscribe( 'nativeDataLoadEvent', nativeDataLoadHandler );
                        $scope.viewModel.addSubPanelEventSubscription( 'nativeDataLoadEvent', subdef );
                    }
                }
            }

            if( $scope.viewModel.gwtPresenters && $scope.viewModel.gwtPresenters.length > 0 ) {
                eventSub = eventBus.subscribe( 'awHTMLPanel.publishViewModel', function( eventData ) {
                    if( !$scope.viewModel.gwtVieModel ) {
                        $scope.viewModel.gwtVieModel = [];
                    }
                    $scope.viewModel.gwtVieModel.push( eventData );
                } );
            }
        };

        /**
         * Destroying events and watchers
         */
        $scope.$on( '$destroy', function handleDestroy() {
            if( self.watchListener ) {
                self.watchListener();
            }

            if( eventSub ) {
                eventBus.unsubscribe( eventSub );
            }

            if( $scope.viewModel.gwtVieModel ) {
                $scope.viewModel.gwtVieModel = null;
            }

            _cleanUpResizeCSS();
        } );
    }
] );
