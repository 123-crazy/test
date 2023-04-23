// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-date-filter.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/localeService';
import 'js/aw-filter-category-date-range-filter.directive';
import 'js/aw-filter-category-date-contents.directive';
import 'js/filterPanelService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display search categories
 *
 * @example <aw-filter-category-date-filter category="category" filter-action="filterAction"
 *          search-action="searchAction"> </aw-filter-category-date-filter>
 *
 * @member aw-filter-category-date-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryDateFilter', [
    'viewModelService', 'localeService', 'filterPanelService',
    function( viewModelSvc, localeSvc, filterPanelSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filterAction: '=',
                searchAction: '=',
                category: '='
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.moreText = localTextBundle.MORE_LINK_TEXT;
                    $scope.lessText = localTextBundle.LESS_LINK_TEXT;
                    $scope.filterText = localTextBundle.FILTER_TEXT;
                } );

                $scope.toggleFilters = function( isMore ) {
                    $scope.category.showMoreFilter = !$scope.category.showMoreFilter;
                    var context = {
                        category: $scope.category
                    };
                    filterPanelSvc.updateCategoryResults( $scope.category );
                    eventBus.publish( 'toggleFilters', context );
                };

                /**
                 * Check to see if space or enter were pressed on the More button
                 */
                $scope.moreFilterKeyPress = function( $event ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.toggleFilters( true );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on the Less button
                 */
                $scope.lessFilterKeyPress = function( $event ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.toggleFilters( false );
                    }
                };
            } ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-date-filter.directive.html'
        };
    }
] );
