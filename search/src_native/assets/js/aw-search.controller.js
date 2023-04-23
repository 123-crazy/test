// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global*/

/**
 * Controller for aw search directive
 *
 * @module js/aw-search.controller
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import localStrg from 'js/localStorage';
import 'js/appCtxService';
import 'js/aw.searchFilter.service';
import 'js/Awp0SearchHighlightingService';
import 'js/globalSearchService';
import 'js/sanitizer';
import 'js/viewModelService';
import analyticsSvc from 'js/analyticsService';

//
'use strict';
/*eslint-disable-next-line valid-jsdoc*/
/**
 * Define search controller
 *
 * @member awSearchController
 * @memberof NgControllers
 *
 */
app.controller( 'awSearchController', [ //
    '$scope', //
    '$state', //
    'viewModelService', //
    'appCtxService', //
    '$http', //
    '$timeout', //
    '$element',
    'searchFilterService', //
    'Awp0SearchHighlightingService', //
    'globalSearchService', //
    'sanitizer', //
    function( $scope, $state, viewModelSvc, appCtxService, $http, $timeout, $element, searchFilterService, Awp0SearchHighlightingService, globalSearchService, sanitizer ) {
        var ctrl = this;

        //Local storage topic
        var _LS_TOPIC = '';

        //Search name token
        var SEARCH_NAME_TOKEN = 'teamcenter_search_search';

        var declViewModel = viewModelSvc.getViewModel( $scope, true );

        var _sanitizer = sanitizer;

        $scope.showPopup = false;
        $scope.isFocused = false;
        $scope.showRecentSearch = false;
        $scope.disableListUpdate = false;

        $scope.filterItems = '';

        $scope.currentIndex = -1;

        if( appCtxService.ctx.search !== undefined && appCtxService.ctx.search.criteria !== undefined ) {
            $scope.prop.dbValue = appCtxService.ctx.search.criteria.searchString;
        }

        /* Unescape html entities */
        var unEscapeSearchHtmlEntities = function( escapedHtmlEntities ) {
            return escapedHtmlEntities.replace( /&amp;/ig, '&' ).replace( /&lt;/ig, '<' ).replace( /&gt;/ig, '>' ).replace(
                /&quot;/ig, '"' ).replace( /&#39;/ig, '\'' );
        };

        /**
         * Execute search based on item selected from suggestion list
         *
         * @memberof NgControllers.awSearchController
         * @param {*} item item
         */
        $scope.selectAndExecuteSuggestionSearch = function( item ) {
            if( $scope.showPopup && item ) {
                $scope.currentIndex = -1;
                $scope.publishGlobalSearchBoxSelectEvent();
                $scope.data.searchBox.dbValue = item;

                var filterMap = {};
                var catFilter = appCtxService.ctx.searchPreFilters.catPrefilters;
                var ownFilter = appCtxService.ctx.searchPreFilters.ownPrefilters;

                var filterCat = {
                    key: catFilter.filterInternalName,
                    values: [ catFilter.selectedCategory ]
                };

                var filterOwn = {
                    key: ownFilter.filterInternalName,
                    values: [ ownFilter.selectedOwner ]
                };

                filterMap[ filterOwn.key ] = filterOwn.values;
                filterMap[ filterCat.key ] = filterCat.values;

                globalSearchService.forceSearch2( item, filterMap );

                var recentSearchObject = {};
                recentSearchObject.value = {};
                recentSearchObject.key = item;
                recentSearchObject.value.criteria = item;
                recentSearchObject.value.filterMap = null;
                recentSearchObject.value.date_created = new Date().getTime();
                $scope.saveCurrentSearch( recentSearchObject );

                var analyticsEvtData = globalSearchService.populateAnalyticsParams( 'SuggestionSearch', 'Complete Suggestion Search' );
                analyticsSvc.logNonDeclarativeCommands( analyticsEvtData );
            }
        };

        /**
         * Execute the selected recent search from recent search list
         *
         * @memberof NgControllers.awSearchController
         * @param {*} item item
         */
        $scope.selectAndExecuteRecentSearch = function( item ) {
            if( $scope.showRecentSearch && item ) {
                $scope.currentIndex = -1;
                $scope.publishGlobalSearchBoxSelectEvent();
                $scope.data.searchBox.dbValue = item;

                for( var i = 0; i < $scope.myRecentSearches.length; i++ ) {
                    if( $scope.myRecentSearches[ i ].value.criteria === item ) {
                        var filterMap = {};
                        var catFilter = appCtxService.ctx.searchPreFilters.catPrefilters;
                        var ownFilter = appCtxService.ctx.searchPreFilters.ownPrefilters;

                        var filterCat = {
                            key: catFilter.filterInternalName,
                            values: [ catFilter.selectedCategory ]
                        };

                        var filterOwn = {
                            key: ownFilter.filterInternalName,
                            values: [ ownFilter.selectedOwner ]
                        };

                        filterMap[ filterOwn.key ] = filterOwn.values;
                        filterMap[ filterCat.key ] = filterCat.values;

                        var criteria = unEscapeSearchHtmlEntities( $scope.myRecentSearches[ i ].value.criteria );
                        globalSearchService.forceSearch2( criteria, filterMap );

                        var analyticsEvtData = globalSearchService.populateAnalyticsParams( 'Awp0RecentSearch', 'Complete Recent Search' );
                        analyticsSvc.logNonDeclarativeCommands( analyticsEvtData );
                    }
                }
            }
        };

        /**
         * Populate search box
         *
         * @param {*} item string to populate search box
         */
        $scope.populateSearchBox = function( item ) {
            if( item ) {
                $scope.data.searchBox.dbValue = item;
            }
        };

        /**
         * Evaluate key events
         * @param {*} $event event data
         */
        $scope.evalKeyup = function( $event ) {
            //if up arrow, down arrow is pressed
            if( $event.keyCode === 38 || $event.keyCode === 40 ) {
                switch ( $event.keyCode ) {
                    case 38: //up arrow
                        if( $scope.currentIndex > -1 ) {
                            $scope.currentIndex--;
                        }
                        break;
                    case 40: //down arrow
                        $scope.currentIndex++;
                        break;
                }

                if( !$scope.showRecentSearch ) {
                    $scope.showRecentSearch = true;
                }
                if( !$scope.showPopup ) {
                    $scope.showPopup = true;
                }
                var context = {
                    currentIndex: $scope.currentIndex,
                    keyCode: $event.keyCode
                };
                $scope.disableListUpdate = true;
                eventBus.publish( 'searchbox.keypressed', context );
            } else {
                //reset selection for other keys
                $scope.currentIndex = -1;
                $scope.disableListUpdate = false;
                //also handle escape key
                if( $event.keyCode === 27 || $event.keyCode === 9 ) {
                    $scope.showPopup = false;
                    $scope.showRecentSearch = false;
                } else {
                    if( $scope.showSuggestions && $scope.suggestionAction ) {
                        if( $scope.prop.dbValue === '' ||  $event.key === 'Enter'  ) {
                            $scope.showPopup = false;
                            $scope.showRecentSearch = false;
                            return;
                        }

                        if( $scope.myRecentSearches && $scope.myRecentSearches.length > 0 ) {
                            $scope.showRecentSearch = true;
                        } else {
                            $scope.showRecentSearch = false;
                        }
                    }
                    $scope.executeSearchSuggestion();
                }
            }
        };

        /**
         * Perform get search suggestions request
         */
        $scope.executeSearchSuggestion = _.debounce( function() {
            viewModelSvc.executeCommand( declViewModel, $scope.suggestionAction, $scope );
        }, 500 );

        //Utility function get filter map from active filter map
        var getFilterMap = function( activeFilterMap ) {
            var filterMap = {};
            _.forEach( activeFilterMap, function( value, key ) {
                var values = [];
                for( var i = 0; i < value.length; i++ ) {
                    values.push( value[ i ].stringValue );
                }
                filterMap[ key ] = values;
            } );
            return filterMap;
        };

        //Event listeners
        ctrl.handleSearchListener = function() {
            //Action invoked when perform search event encountered
            var handlePerformSearchEvent = function( eventData ) {
                if( !eventData ) {
                    return;
                }
                if( !eventData.criteria || eventData.criteria === '' ) {
                    return;
                }
                eventData.criteria = _sanitizer.htmlEscapeAllowEntities( eventData.criteria );
                var currentSearch = {
                    key: eventData.criteria,
                    value: {
                        criteria: eventData.criteria,
                        filter: ngModule.copy( eventData.filterMap ),
                        date_created: new Date().getTime()
                    }
                };
                $scope.saveCurrentSearch( currentSearch );
                $scope.showRecentSearch = false;
                $scope.showPopup = false;
            };

            //Listen to global search event
            var doSearchListener = eventBus.subscribe( 'search.doSearch', function( eventData ) {
                handlePerformSearchEvent( eventData );
            } );

            //Listen to global search 2 event
            var doSearchListener2 = eventBus.subscribe( 'search.doSearch2', function( eventData ) {
                handlePerformSearchEvent( eventData );
            } );

            //Listen to global search 3 event
            var doSearchListener3 = eventBus.subscribe( 'targetFilterCategoryUpdated', function( eventData ) {
                $scope.showRecentSearch = false;
                $scope.showPopup = false;
            } );

            //Listen to selectFilter event
            var doSelectFilterListener = eventBus.subscribe( 'selectFilter', function( eventData ) {
                var searchCtx = appCtxService.getCtx( 'search' );
                var currentSearch = {};
                var activeFilterMap = ngModule.copy( getFilterMap( searchCtx.activeFilterMap ) );
                if( activeFilterMap[ eventData.categoryName ] ) {
                    activeFilterMap[ eventData.categoryName ].push( eventData.filterName );
                } else {
                    activeFilterMap[ eventData.categoryName ] = [ eventData.filterName ];
                }

                if( searchCtx ) {
                    currentSearch = {
                        key: searchCtx.criteria.searchString,
                        value: {
                            criteria: searchCtx.criteria.searchString,
                            filter: activeFilterMap,
                            date_created: new Date().getTime()
                        }
                    };
                    $scope.saveCurrentSearch( currentSearch );
                    $scope.showRecentSearch = false;
                }
            } );

            //Listen for recent search cache clear event
            var doRecentSearchCacheClearListener = eventBus.subscribe( 'awRecentSearch.recentSearchCleared', function() {
                $scope.myRecentSearches = $scope.retrieveRecentSearchObjects();
            } );

            //React to when focus is off from the directive
            var onFocusOff = function() {
                //If we ignored Undo, delete all recent searches
                if( !$scope.displayClearAll ) {
                    $scope.clearLocalStorage();
                }
                $scope.displayClearAll = true;

                //If search box is not selected
                $scope.$evalAsync( function() {
                    if( !$scope.searchBoxSelected ) {
                        $scope.showPopup = false;
                        $scope.showRecentSearch = false;
                        $scope.data.suggestions = [];
                    } else {
                        $scope.showRecentSearch = !$scope.showRecentSearch;
                        if( !$scope.myRecentSearches || $scope.myRecentSearches.length === 0 ) {
                            $scope.showRecentSearch = false;
                        }
                        if( $scope.showPopup ) {
                            $scope.showPopup = false;
                            $scope.data.suggestions = [];
                        }
                    }
                    $scope.disableListUpdate = false;
                } );
            };

            $( window ).on( 'click', onFocusOff );

            //Remove listeners on destroy
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( doSearchListener );
                eventBus.unsubscribe( doSearchListener2 );
                eventBus.unsubscribe( doSearchListener3 );
                eventBus.unsubscribe( doSelectFilterListener );
                eventBus.unsubscribe( doRecentSearchCacheClearListener );
                $( window ).off( 'click', onFocusOff );
            } );
        };

        /**
         * Initializes the widget
         *
         * @memberof NgControllers.awSearchController
         */
        ctrl.initWidget = function() {
            var userUidString = $scope.getCurrentUserUID();
            _LS_TOPIC = userUidString + '__awRecentSearchObjectList';
            $scope.searchBoxSelected = false;
            $scope.showRecentSearch = false;
            $scope.myRecentSearches = $scope.retrieveRecentSearchObjects();
        };

        //Utility function to create a name for recent search
        var convertToKey = function( keyString ) {
            if( !keyString ) {
                return '';
            }
            return keyString.replace( /\s/g, '_' );
        };
        /**
         * Saves the passed search object in the local storage
         *
         * @memberof NgControllers.awSearchController
         * @param {Object} currentSearch currentSearch
         */
        $scope.saveCurrentSearch = function( currentSearch ) {
            var cache = localStrg.get( _LS_TOPIC );
            currentSearch.key = convertToKey( currentSearch.key );

            var cachedSearchObjects = [];
            var duplicate = false;
            if( cache === null || cache === undefined || cache === 'undefined' ) {
                cachedSearchObjects = [];
            } else {
                cachedSearchObjects = JSON.parse( cache );
                for( var i = 0; i < cachedSearchObjects.length; i++ ) {
                    if( cachedSearchObjects[ i ].key === currentSearch.key ) {
                        duplicate = true;
                        cachedSearchObjects[ i ].value.filter = ngModule.copy( currentSearch.value.filter );
                        cachedSearchObjects[ i ].value.date_created = currentSearch.value.date_created;
                        break;
                    }
                }
            }

            if( !duplicate ) {
                cachedSearchObjects.push( currentSearch );
            }

            cachedSearchObjects.sort( function( a, b ) {
                return b.value.date_created - a.value.date_created;
            } );

            //Limit the size to 100
            if( cachedSearchObjects.length > 100 ) {
                cachedSearchObjects = cachedSearchObjects.slice( 0, 100 );
            }

            $scope.myRecentSearches = cachedSearchObjects;
            $scope.publishSavedSearchList( $scope.myRecentSearches );
        };

        /**
         * Retrieves all recent searches for the active user
         *
         * @memberof NgControllers.awSearchController
         *
         * @return {ObjectArray} Array of recent search objects
         */
        $scope.retrieveRecentSearchObjects = function() {
            var recentSearchObjs = [];
            var cache = localStrg.get( _LS_TOPIC );
            if( cache !== null && cache !== undefined && cache !== 'undefined' ) {
                var cachedSearchObjects = JSON.parse( cache );
                if( cachedSearchObjects.length ) {
                    cachedSearchObjects.sort( function( a, b ) {
                        return b.value.date_created - a.value.date_created;
                    } );

                    for( var i = 0; i < cachedSearchObjects.length; i++ ) {
                        recentSearchObjs.push( cachedSearchObjects[ i ] );
                    }
                }
            }
            return recentSearchObjs;
        };

        //Publish the search list to the local storage
        $scope.publishSavedSearchList = function( savedSearchList ) {
            localStrg.publish( _LS_TOPIC, JSON.stringify( savedSearchList ) );
        };

        //Unpublish the search list from the local storage
        $scope.clearLocalStorage = function() {
            localStrg.removeItem( _LS_TOPIC );
            //Force all instances of this widget to refresh their recent search list
            eventBus.publish( 'awRecentSearch.recentSearchCleared' );
        };

        /**
         * Bolds the passed text string in the supplied string - item
         *
         * @memberof NgControllers.awSearchController
         * @param {*} item item
         * @param {String} text text
         * @return {Object} HTML element with highlighted string
         */
        $scope.highlight = function( item, text ) {
            return Awp0SearchHighlightingService.highlightSearchResults( item, text );
        };

        /**
         * Update search box selected state
         * @param {*} searchBoxSelected true if search box is selected
         */
        $scope.focusEvent = function( searchBoxSelected ) {
            if( searchBoxSelected ) {
                $scope.searchBoxSelected = true;
            } else {
                $scope.searchBoxSelected = false;
            }
        };

        /**
         * Clears the recent search list. This operation followed by clearLocalStorage will permanently delete all
         * recent searches
         *
         * @memberof NgControllers.awSearchController
         */
        $scope.deleteAllRecentSearches = function() {
            $scope.myRecentSearches = [];
            $scope.displayClearAll = false;
            $scope.showRecentSearch = true;
        };

        /**
         * Undos the delete done by deleteAllRecentSearches
         *
         * @memberof NgControllers.awSearchController
         */
        $scope.undoDeleteAllRecentSearches = function() {
            $scope.myRecentSearches = $scope.retrieveRecentSearchObjects();
            $scope.displayClearAll = true;

            $scope.publishGlobalSearchBoxSelectEvent();
        };

        /**
         * Executes a search by reading the passed recent search object
         *
         * @memberof NgControllers.awSearchController
         *
         * @param {Object} recentSearchObject recentSearchObject
         */
        $scope.executeRecentSearch = function( recentSearchObject ) {
            var criteria = recentSearchObject.value.criteria;
            var filterMap = recentSearchObject.value.filter;
            searchFilterService.doSearch( SEARCH_NAME_TOKEN, criteria, filterMap );
        };

        /**
         * Enables/disables the show more/show less options
         *
         * @memberof NgControllers.awSearchController
         */
        $scope.toggleShowMoreFlag = function() {
            $scope.showMoreFlag = !$scope.showMoreFlag;
            $scope.publishGlobalSearchBoxSelectEvent();
        };

        /**
         * Returns the currently logged in user's UID
         *
         * @memberof NgControllers.awSearchController
         *
         * @return {String} current user's uid
         */
        $scope.getCurrentUserUID = function() {
            return appCtxService.ctx.user.uid;
        };

        /**
         * Returns the list of recent searches currently in memory
         *
         * @memberof NgControllers.awSearchController
         *
         * @return {ObjectArray} Array list of recent searches in memory
         */
        $scope.getCurrentRecentSearchList = function() {
            return $scope.myRecentSearches;
        };

        //Publish selectSearchBox event
        $scope.publishGlobalSearchBoxSelectEvent = function() {
            var context = {
                action: 'doGlobalSearch'
            };
            eventBus.publish( 'search.selectSearchBox', context );
        };
    }
] );
