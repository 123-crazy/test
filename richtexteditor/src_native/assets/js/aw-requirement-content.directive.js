// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global MathJax */

/**
 * Directive to format/show requirement document content.
 *
 * @module js/aw-requirement-content.directive
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw-requirement-content.controller';
import 'js/aw-panel.directive';
import 'js/aw-panel-body.directive';
import 'js/appCtxService';
import 'js/startEditGroupCommandService';
import browserUtils from 'js/browserUtils';

'use strict';

/**
 * Directive for default cell implementation.
 *
 * @example <aw-requirement-content></aw-requirement-content>
 *
 * @member aw-requirement-content
 * @memberof NgElementDirectives
 */
app.directive( 'awRequirementContent', [
    'appCtxService',
    'startEditGroupCommandService',
    function( _appCtxSvc, _startEditGroupCommandService ) {
        return {
            restrict: 'E',
            controller: 'awRequirementContentController as vm',
            bindToController: true,
            scope: {
                applyBorder: '=?',
                defaultScroll: '=?',
                prop: '=',
                subPanelContext: '='
            },
            link: function( $scope, $element, attrs, controller ) {
                eventBus.publish( 'Arm0Documentation.contentLoaded' );
                $element.addClass( 'aw-requirements-mainPanel' );

                var mainPanelElement = $element[ 0 ];
                var MIN_SCROLL_POS = 2;
                var isScrollAllowed = false;

                var reqContentElement = mainPanelElement.getElementsByClassName( 'aw-requirements-xrtRichText' );

                $scope.allowScrolling = function() {
                    setTimeout( function() {
                        isScrollAllowed = true;
                    }, 500 );
                };

                /**
                 * Resize viewer function
                 *
                 * @function resizeViewer
                 * @memberOf NgElementDirectives.aw-3d-viewer.directive
                 */
                $scope.resizeViewer = function( viewerWidth, viewerHeight ) {
                    if( $scope.subPanelContext ) {
                            var currentElement = mainPanelElement;
                            while( currentElement !== null && !currentElement.classList.contains( 'aw-xrt-columnContentPanel' )  ) {
                                currentElement = currentElement.parentElement;
                            }
                            if( currentElement && currentElement.clientHeight && currentElement.clientWidth ) {
                                var height = currentElement.clientHeight;
                                var width = currentElement.clientWidth;
                                $scope.vm.viewerHeight =  height - 60  + 'px'; //reserving 30 pixels for viewer header labels + + label text when clicked on labels
                                $scope.vm.viewerPanelHeight = height - 60  + 'px';
                                $scope.vm.viewerPanelWidth = width + 'px';
                                $scope.vm.viewerWidth =  width - 23  + 'px'; //reserving 23 pixels for scroll bar displayed on hover if applicable
                            }
                    }
                    isScrollAllowed = false;

                    if( !$scope.vm.defaultScroll ) {
                        var reqContentHeight = 0;

                        if( reqContentElement && reqContentElement.length > 0 ) {
                            reqContentHeight = reqContentElement[ 0 ].scrollHeight;
                        }

                        if( reqContentHeight > 0 && reqContentHeight <= parseInt( viewerHeight ) ) {
                            mainPanelElement.style.height = reqContentHeight - MIN_SCROLL_POS * 2 + 'px';
                            mainPanelElement.style.overflow = 'auto';
                            mainPanelElement.scrollTop = MIN_SCROLL_POS;
                            $scope.allowScrolling();
                            return;
                        }
                        mainPanelElement.style.overflow = 'auto';
                    } else {
                        mainPanelElement.style.overflow = 'auto';
                    }
                    if( $scope.subPanelContext ) {
                        mainPanelElement.style.height = $scope.vm.viewerPanelHeight;
                    }else {
                        mainPanelElement.style.height = viewerHeight;
                    }

                    $scope.allowScrolling();
                };

                if( !$scope.vm.defaultScroll ) {
                    $element.bind( 'scroll', function() {
                        // Close tracelink tootip, if any
                        if( _appCtxSvc.ctx.Arm0TraceLinkTooltipBalloonPopupVisible ) {
                            eventBus.publish( 'Arm0TracelinkTooltip.closeTracelinkTooltip' );
                            eventBus.publish( 'showActionPopup.close' );
                        }
                    } );
                }

                /**
                 * OLE object click listener
                 *
                 * @param {Event} event The event
                 */
                function onClickOnOLEObject( event ) {
                    var target = event.currentTarget;
                    var oleID = target.getAttribute( 'oleid' );
                    var oleObjectUID = target.getAttribute( 'oleObjectUID' );

                    var eventData = {
                        oleid: oleID,
                        oleObjectUID: oleObjectUID,
                        viewerid: $scope.vm.prop.id
                    };

                    eventBus.publish( 'oleObjectClickedRM', eventData );
                }

                /**
                 * Add click event on OLE Objects.
                 *
                 * @param rmElement RM Element
                 */
                var _addEventOnOLEObjects = function( rmElement ) {
                    var imgs = rmElement.getElementsByTagName( 'img' );
                    for( var ii = 0; ii < imgs.length; ii++ ) {
                        var oleElement = imgs[ ii ];

                        if( oleElement.getAttribute( 'oleid' ) ) {
                            oleElement.addEventListener( 'click', onClickOnOLEObject );
                        }
                    }
                };

                /**
                 * @returns {boolean} true, if current active tab is 'Documentation'
                 */
                var _isDocumentationTabActive = function() {
                    if( $scope.ctx && $scope.ctx.xrtPageContext && ( $scope.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Documentation' || $scope.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Documentation' ) ) {
                        return true;
                    }
                    return false;
                };

                $element.bind( 'dblclick', function() {
                    // Put Documentation tab in edit mode, on double click.
                    // Double click should be applicable for only 'Documentation' tab not for 'Preview'
                    if( _isDocumentationTabActive() ) {
                        _startEditGroupCommandService.execute( '', $scope.ctx.ViewModeContext.ViewModeContext );
                    }
                } );

                /**
                 * Set callback on window resize
                 */
                controller.setResizeCallback( $scope.resizeViewer );
                controller.initViewer( $element, true, true );
                $scope.$watch( 'vm.prop.dbValue', function _watchXrtObjectType( newObjectType, oldObjectType ) {
                    if( newObjectType && newObjectType !== oldObjectType ) {
                        reqContentElement[ 0 ].innerHTML = newObjectType;

                        if( !_.includes( reqContentElement[ 0 ].className, 'aw-richtexteditor-documentPaper' ) && $scope.vm.applyBorder ) {
                            reqContentElement[ 0 ].className += ' aw-richtexteditor-documentPaper aw-richtexteditor-document aw-richtexteditor-documentPanel';
                        }

                        _addEventOnOLEObjects( reqContentElement[ 0 ] );

                        var mathJaxJSFilePath = app.getBaseUrlPath() + '/lib/mathJax/MathJax.js?config=TeX-AMS-MML_HTMLorMML';
                        browserUtils.attachScriptToDocument( mathJaxJSFilePath, function() {
                            MathJax.Hub.Queue( [ 'Typeset', MathJax.Hub, reqContentElement[ 0 ] ] );
                            MathJax.Hub.Config( { showMathMenu: false } );
                        } );
                    }
                } );
                $scope.$on( '$destroy', function() {
                    eventBus.publish( 'Arm0Documentation.contentUnloaded' );
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-requirement-content.directive.html'
        };
    }
] );
