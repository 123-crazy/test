// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw-search-global.directive
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-link-with-popup-menu.directive';
import 'js/aw-search.directive';
import 'js/aw-search-box.directive';
import 'js/aw-link.directive';
import 'js/globalSearchService';
import 'js/aw-search-list.directive';
import 'js/aw-include.directive';
import 'js/aw-search-prefilter.directive';
import 'js/extended-tooltip.directive';
import wcagSvc from 'js/wcagService';

'use strict';

/**
 * Directive to show global search box
 *
 * @example <aw-search-global search-prop="data.searchBox" show-suggestions="true"
 *          suggestion-action="getSuggestions" show-popup="data.showPopup" prefilter1="data.selectPrefilter1"
 *          prefilter1-provider="data.dataProviders.ownerPrefilterProvider" prefilter2="data.selectPrefilter2"
 *          prefilter2-provider="data.dataProviders.categoryPrefilterProvider"
 *          advanced-search-prop="data.advancedSearch" advanced-action="advancedSearchLink" ></aw-search-global>
 *
 * @member aw-search-global
 * @memberof NgElementDirectives
 */
app.directive( 'awSearchGlobal', [
    'viewModelService', 'appCtxService',
    function( viewModelSvc, appCtxService ) {
        return {
            restrict: 'E',
            scope: {
                showSuggestions: '@',
                suggestionAction: '@',
                showPopup: '=',
                searchProp: '=',
                prefilter1: '=',
                prefilter1Provider: '=',
                prefilter2: '=',
                prefilter2Provider: '=',
                advancedSearchProp: '=',
                action: '@',
                conditions: '='
            },
            controller: [ '$scope', 'commandService', 'awSearchService', '$window', '$element',
                function( $scope, commandService, awSearchService, $window, $element ) {
                    viewModelSvc.getViewModel( $scope, true );

                    var handleResize = _.debounce( function() {
                        awSearchService.openSearchPanelAsNeeded( $scope );
                    }, 200 );
                    $window.addEventListener( 'resize', handleResize );

                    var wasClickEventInsideTheElement = function( event ) {
                        var isChild = $element.find( event.target ).length > 0;
                        if ( !isChild ) {
                            //if the click is on the prefilter popup, the popup should still be considered a child.
                            var className = event.target.className;
                            isChild = className && className.toString().indexOf( 'aw-widgets-cellListCellText' ) > -1;
                        }
                        var isSelf = $element[ 0 ] === event.target;
                        return  isChild || isSelf;
                    };

                    var wasPrefilterPopupOpen = function() {
                        var prefilterPopup = '.aw-search-globalSearchPreFilterWrapper .aw-jswidgets-popUpVisible';
                        var prefilterPopupElement = $( prefilterPopup );
                        return prefilterPopupElement && prefilterPopupElement.length > 0;
                    };

                    //React to when focus is off from the directive
                    var onFocusOff = function( event ) {
                        if( !wasClickEventInsideTheElement( event ) && !wasPrefilterPopupOpen() ) {
                            //Box was visible earlier
                            if( $scope.data && $scope.data.showSearchBox && $scope.data.showSearchBox.dbValue &&
                                !$scope.data.searchBox.dbValue ) {
                                $scope.$evalAsync( function() {
                                    $scope.data.showSearchBox.dbValue = false;
                                } );
                            }
                        }
                    };

                    var triggerSelectSearchBoxEvent = _.debounce( function() {
                        if( $scope.data.showSearchBox.dbValue ) {
                            var context = {
                                action: 'doGlobalSearch'
                            };
                            eventBus.publish( 'search.selectSearchBox', context );
                        }
                    }, 700 );

                    var doGlobalSearchButtonListener = eventBus.subscribe( 'search.emptySearch', function() {
                        if( $scope.data && $scope.data.showSearchBox ) {
                            $scope.data.showSearchBox.dbValue = false;
                        }
                    } );

                    $scope.toggleSearchBoxVisibility = function() {
                        if( $scope.data && $scope.data.showSearchBox && typeof $scope.data.showSearchBox.dbValue !== 'undefined' ) {
                            $scope.data.showSearchBox.dbValue = !$scope.data.showSearchBox.dbValue;
                            triggerSelectSearchBoxEvent();
                        }
                    };

                    $scope.toggleNarrowModeSearchPanelVisibility = function() {
                        //toggle narrow mode search panel
                        awSearchService.openNarrowModeSearchPanel( $scope );
                    };

                    $scope.$on( '$destroy', function() {
                        $window.removeEventListener( 'resize', handleResize );
                        eventBus.unsubscribe( doGlobalSearchButtonListener );
                    } );

                    //Turn on the click event listener on and off depending on the state
                    //of the search box (show vs collapsed)
                    $scope.$watch( 'data.showSearchBox.dbValue', function() {
                        if( $scope.data && $scope.data.showSearchBox && $scope.data.showSearchBox.dbValue ) {
                            $( window ).on( 'click', onFocusOff );
                        } else {
                            $( window ).off( 'click', onFocusOff );
                        }
                    } );

                    /**
                     * Check to see if space or enter were pressed on hidden global searchbox icon
                     */
                    $scope.openGlobalSearchKeyPress = function( $event ) {
                        if( wcagSvc.isValidKeyPress( $event ) ) {
                            $scope.toggleSearchBoxVisibility();
                        }
                    };
                }
            ],

            templateUrl: app.getBaseUrlPath() + '/html/aw-search-global.directive.html'
        };
    }
] );
