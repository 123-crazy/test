// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgElementDirectives.aw-header-context}
 *
 * @module js/aw-header-context.directive
 */
import app from 'app';
import 'js/aw-context-control.directive';
import 'js/appCtxService';
import 'js/aw-popup-command-bar.directive';
import 'js/aw-include.directive';
import 'js/aw-repeat.directive';
import 'js/aw-flex-row.directive';
import 'js/aw-flex-column.directive';
import 'js/exist-when.directive';
import 'js/aw-icon-button.directive';
import 'js/aw-click.directive';
import AwTimeoutService from 'js/awTimeoutService';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import localeSvc from 'js/localeService';
import resizeObserverSvc from 'js/resizeObserver.service';

/**
 * Directive to display the header context for User/Group/Role etc.
 *
 *
 * @example <aw-header-context></aw-header-context>
 *
 * @member aw-header-context
 * @memberof NgElementDirectives
 */
app.directive( 'awHeaderContext', [
    'appCtxService',
    function( appCtxSvc ) {
        return {
            restrict: 'E',
            scope: {
                alignment: '@?',
                anchor: '=?',
                subTitle: '='
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-header-context.directive.html',
            controller: [
                '$scope', '$element',
                function( $scope, $element ) {
                    /*
                     * once the view model gets populated with the data , flag gets the value true
                     */

                    $scope.ctx = appCtxSvc.ctx;
                    $scope.alignment = $scope.alignment ? $scope.alignment : 'VERTICAL';
                    const THRESHOLD_WIDTH = 200; // Keeping 100px on either side as per UX recommendation

                    /**
                     * Sets the stack direction of user session properties on the user settings bar
                     *
                     * @param {Array} elements - The contributed view elements
                     * @param {Array} stackDirection - The contributed view elements
                     *
                     * @ignore
                     */
                    var setStackStyle = function( elements, stackDirection ) {
                        $.each( elements, function( index, element ) {
                            var columnElement = $( element ).find( 'div.aw-layout-include .aw-layout-column' );
                            if( columnElement.length ) {
                                columnElement[0].style.flexDirection = stackDirection;
                            }
                        } );
                    };

                     /**
                     * Sets the prerequisites for each browser resize - it should show all elements horizontally stacked for calculating width
                     *
                     * @param {Array} elements - The contributed view elements
                     *
                     * @ignore
                     */
                    var setPrerequisitesForCalculation = function( elements ) {
                        $.each( elements, function( index, element ) {
                            $( element ).show();
                        } );

                        setStackStyle( elements, 'row' );
                        $scope.showMoreLink = false;
                    };

                    var showHideElements = function( allElements, moreWidth, parentWidth ) {
                        var currentWidth = 16; // 16px for the close button
                        // Hide elements after the threshold is reached
                        for( var i = 0; i < allElements.length; i++ ) {
                            var elementWidth = $( allElements[ i ] ).width();
                            currentWidth += elementWidth;

                            if( currentWidth + moreWidth < parentWidth ) {
                                $( allElements[ i ] ).show();
                            } else {
                                $( allElements[ i ] ).hide();
                                $scope.showMoreLink = true;
                            }
                        }
                    };

                    /**
                     * Whether a resize is currently active. Used to debounce window resize.
                     *
                     * @private
                     */
                    var updateSize = function() {
                        // Allow rendering to complete
                        // Timeout needs to be greater than DefaultSubLocationView.EVENT_WAIT_TIME * 2 (to allow it to resize parent div)
                        AwTimeoutService.instance( function() {
                            var parentWidth = $element.parent().width();
                            var properties = $element.find( '.aw-widgets-contextSubItem' );
                            var allElements = properties.children();
                            setPrerequisitesForCalculation( allElements );

                            // First pass to check width without vertical two line stacking
                            if( parentWidth - $element.width() < THRESHOLD_WIDTH ) {
                                setStackStyle( allElements, 'column' );
                                var headerContextWidth = $element.width();

                                // Second pass to check width with vertical stacking for showing More... link
                                if( parentWidth -  headerContextWidth < THRESHOLD_WIDTH ) {
                                    var moreWidth = headerContextWidth - properties.width();
                                    showHideElements( allElements, moreWidth, parentWidth - THRESHOLD_WIDTH );
                                }
                            } else {
                                // Reset horizontal stacking if space is available
                                setStackStyle( allElements, 'row' );
                                $scope.showMoreLink = false;
                            }
                        } );
                    };

                    /**
                     * Recalculate footer limit on window resize.
                     */
                     if( resizeObserverSvc.supportsResizeObserver() ) {
                        let headerContextObserver = null;

                        const initializeObserver = () => {
                            const callback = _.debounce( () => {
                                updateSize();
                            }, 50, {
                                maxWait: 10000,
                                trailing: true,
                                leading: false
                            } );
                            if( $scope.alignment === 'HORIZONTAL' ) {
                                headerContextObserver = resizeObserverSvc.observe( document.querySelector( 'footer' ), callback );
                            }
                        };

                        initializeObserver();

                        $scope.$on( '$destroy', function() {
                            if( headerContextObserver ) {
                                headerContextObserver();
                            }
                        } );
                    }

                    $scope.onMoreClick = function() {
                        var sideNavConfig = appCtxSvc.getCtx( 'awSidenavConfig.globalSidenavContext.globalNavigationSideNav' );

                        if( !sideNavConfig || !sideNavConfig.open ) {
                            eventBus.publish( 'awsidenav.openClose', {
                                id: 'globalNavigationSideNav',
                                commandId: 'avatarCommandId',
                                includeView: 'avatar',
                                keepOthersOpen: true
                            } );
                        }
                    };

                    $( '.aw-headerContext-more' ).click( function( event ) {
                        //To stop propagating body click event to sidenav
                        //as this should not toggle the sidenav automatically
                        event.stopPropagation();
                    } );

                    localeSvc.getLocalizedText( 'BaseMessages', 'MORE_LINK_TEXT' ).then( function( result ) {
                        $scope.moreLinkText = result;
                    } );
                }
            ]
        };
    }
] );
