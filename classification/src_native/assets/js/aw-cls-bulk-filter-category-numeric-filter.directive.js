// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/*global
 define
 */

/**
 * @module js/aw-cls-bulk-filter-category-numeric-filter.directive
 * @deprecated
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/localeService';
import 'js/aw-cls-filter-category-numeric-range-filter.directive';
import 'js/aw-cls-filter-category-contents.directive';

/**
 * Directive to display search numeric categories
 *
 * @example <aw-filter-bulk-category-numeric-filter category="category" filter-action="filterAction"
 *          search-action="searchAction"
 *          add-action="addAction"
 *          checkbox-action="checkboxAction"
 *          is-bulk-filter="isBulkFilter"> </aw-filter-bulk-category-numeric-filter>
 *
 * @member aw-cls-filter-bulk-category-numeric-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awClsBulkFilterCategoryNumericFilter', [ 'viewModelService', 'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                expandCollapseAction: '@',
                filterAction: '=',
                searchAction: '=',
                checkboxAction: '=?',
                isBulkFilter: '=?',
                category: '='
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );

                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.moreText = localTextBundle.MORE_LINK_TEXT;
                    $scope.lessText = localTextBundle.LESS_LINK_TEXT;
                    $scope.filterText = localTextBundle.FILTER_TEXT;
                } );

                $scope.toggleFilters = function() {
                    $scope.category.showMoreFilter = !$scope.category.showMoreFilter;
                    var context = {
                        category: $scope.category
                    };
                    eventBus.publish( 'toggleFilters', context );
                };

                $scope.toggleFiltersSoa = function() {
                    //handle 3 cases
                    //if clicked on client 'More'
                    if( $scope.category.showMoreFilter ) {
                        $scope.toggleFilters();
                    }
                    //if clicked on server 'More'
                    else if( !$scope.category.showMoreFilter && $scope.category.hasMoreFacetValues ) {
                        $scope.category.isMoreClicked = true;
                        $scope.category.isSelected = true;
                        $scope.category.startIndexForFacetSearch = $scope.category.filterValues.length;
                        $scope.ctx.search.valueCategory = $scope.category;
                        var context = {
                            source: 'filterPanel',
                            category: $scope.category,
                            expand: $scope.category.expand
                        };
                        eventBus.publish( 'toggleExpansionUnpopulated', context );
                    }
                    //if clicked on 'Less'
                    else if( !$scope.category.showMoreFilter && !$scope.category.hasMoreFacetValues ) {
                        $scope.toggleFilters();
                        var numOfFacets = $scope.category.filterValues.length;
                        if( numOfFacets > 100 ) {
                            $scope.ctx.searchResponseInfo.searchFilterMap[ $scope.category.internalName ].splice( 100, numOfFacets );
                            $scope.category.hasMoreFacetValues = true;
                            $scope.category.endIndex = 100;
                            // Adding valueCategory while doing less since it will updateOnlySelectedCategory
                            $scope.ctx.search.valueCategory = $scope.category;
                            eventBus.publish( 'updateFilterPanel', {} );
                        }
                    }
                };
            } ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-bulk-filter-category-numeric-filter.directive.html'
        };
    }
] );
