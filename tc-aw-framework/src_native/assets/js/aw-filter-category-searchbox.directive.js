// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-searchbox.directive
 */
import app from 'app';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/localeService';
import 'js/filterPanelService';
import 'js/extended-tooltip.directive';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display search categories
 *
 * @example <aw-filter-category-searchbox index="category.index" visible-when="category.showFilterText"
 *          filter-action="filterAction" > </aw-filter-category-searchbox>
 *
 * @member aw-filter-category-searchbox
 * @memberof NgElementDirectives
 */
app.filter( 'filterInFilters', [ '$filter', function( $filter ) {
    return function( items, text ) {
        if( text === undefined || !text || text.length === 0 ) {
            return items;
        }
        var _text = text;
        if( _text.indexOf( '*' ) > -1 ) {
            _text = _text.replace( /[*]/gi, ' ' );
        }
        // split search text on space
        var searchTerms = _text.split( ' ' );

        // search for single terms.
        // this reduces the item list step by step
        searchTerms.forEach( function( term ) {
            if( term && term.length ) {
                items = $filter( 'filter' )( items, {
                    name: term
                } );
            }
        } );

        return items;
    };
} ] );
app.directive( 'awFilterCategorySearchbox', [
    'viewModelService',
    'localeService',
    'appCtxService',
    'filterPanelService',
    function( viewModelSvc, localeSvc, appCtxService, filterPanelService ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filterAction: '=',
                index: '=',
                prop1: '=',
                category: '=',
                disableTypeAheadFacetSearch: '='
            },
            controller: [
                '$scope',
                function( $scope ) {
                    localeSvc.getTextPromise().then( function( localTextBundle ) {
                        $scope.resetText = localTextBundle.RESET_TEXT;
                    } );
                    viewModelSvc.getViewModel( $scope, true );

                    localeSvc.getTextPromise().then( function( localTextBundle ) {
                        $scope.filterText = localTextBundle.FILTER_TEXT;
                    } );

                    $scope.doChangeAction = function() {
                        if( $scope.changeAction ) {
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, $scope.changeAction, $scope );
                        }
                    };

                    $scope.reset = function( isFocused ) {
                        $scope.category.filterCriteria = '';
                        $scope.doChangeAction();
                    };

                    $scope.setFocus = function( isFocused ) {
                        $scope.focused = isFocused;
                        if( $scope.$parent.focusEvent ) {
                            $scope.$parent.focusEvent( isFocused );
                        }
                    };
                    var delayTime = appCtxService.ctx.preferences.AW_TypeAheadFacetSearch_Delay;
                    var tempDelayTime = delayTime[ 0 ] > 0 ? delayTime[ 0 ] : 500;
                    $scope.delayedTime = delayTime && tempDelayTime;
                    $scope.prevFilterBy = undefined;
                    if( !$scope.ctx.search ) {
                        $scope.ctx.search = {};
                    }
                    $scope.evalKeyup = function( $event ) {
                        $scope.keyCode = $event.keyCode;
                        if( $scope.disableTypeAheadFacetSearch ) {
                            //when type-ahead is turned off, only do filtering when ENTER key is pressed.
                            $scope.processEvalKeyUp( $event );
                        } else {
                            $scope.delayedPerformFacetSearch();
                        }
                    };

                    /**
                     * processEvalKeyUp
                     * @param {Object} $event The Event
                     */
                    $scope.processEvalKeyUp = function( $event ) {
                        if( $event.keyCode === 13 ) {
                            $scope.category.filterBy = $scope.category.filterCriteria;
                            $scope.performFacetSearch();
                        }
                    };

                    /**
                     * Perform filter in filter values on server side
                     */
                    $scope.delayedPerformFacetSearch = _.debounce( function() {
                        $scope.performFacetSearch();
                    }, $scope.delayedTime );

                    $scope.evalSearchIconClick = function() {
                        $scope.category.filterBy = $scope.category.filterCriteria;
                        $scope.performFacetSearch();
                    };

                    /**
                     * Process type-ahead.
                     * @param {Object} doServerSearch doServerSearch
                     */
                    $scope.processTypeAhead = function( doServerSearch ) {
                        if( $scope.category.filterBy.indexOf( $scope.category.prevFilterBy ) > -1 ) {
                            //it's a type-ahead (i.e., the old filterBy is part of the new filterBy ).
                            $scope.category.prevFilterBy = $scope.category.filterBy;
                            if( !$scope.category.hasMoreFacetValues ) {
                                doServerSearch.isServerSearch = false;
                                $scope.ctx.search.valueCategory = $scope.category;
                                eventBus.publish( 'filterPanel.updateRefineCategoriesAfterUpdate' );
                            }
                        }
                    };

                    /**
                     * Perform filter in filter values on server side
                     */
                    $scope.performFacetSearch = function() {
                        if( $scope.filterAction ) {
                            // call custom action
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, $scope.filterAction, declUtils
                                .cloneData( $scope ) );
                        } else if ( !$scope.category.isServerSearch ) {
                            $scope.ctx.search.valueCategory = $scope.category;
                            eventBus.publish( 'filterPanel.updateRefineCategoriesAfterUpdate' );
                        } else {
                            $scope.performSearchInternal();
                        }
                    };

                    /**
                     * Perform filter in filter values on server side
                     */
                    $scope.performSearchInternal = function() {
                        var doServerSearch = {
                            isServerSearch: true
                        };

                        if( $scope.category.filterBy !== '' && $scope.category.prevFilterBy ) {
                            $scope.processTypeAhead( doServerSearch );
                        }
                        if( doServerSearch.isServerSearch ) {
                            $scope.category.prevFilterBy = $scope.category.filterBy;
                            // clear existing filter values before call to server
                            $scope.executeServerFilterInFilter();
                        }
                    };

                    /**
                     * Perform filter in filter values on server side
                     */
                    $scope.executeServerFilterInFilter = function() {
                        $scope.ctx.search.valueCategory = $scope.category;
                        $scope.ctx.search.valueCategory.startIndexForFacetSearch = 0;
                        eventBus.publish( 'filterInFilter.serverFilter', $scope.ctx.search.valueCategory );
                    };

                    /**
                     * Check to see if space or enter were pressed on perform search in Filter Searchbox
                     */
                    $scope.performSearchFilterCategoryKeyPress = function( $event, action ) {
                        if( wcagSvc.isValidKeyPress( $event ) ) {
                            $scope.evalSearchIconClick();
                        }
                    };

                    /** clearFilterCategoryKeyPress
                     * Check to see if space or enter were pressed on clear search in Filter Searchbox
                     */
                    $scope.clearFilterCategoryKeyPress = function( $event, action ) {
                        if( wcagSvc.isValidKeyPress( $event ) ) {
                            $scope.reset();
                        }
                    };
                }
            ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-searchbox.directive.html'
        };
    }
] );
