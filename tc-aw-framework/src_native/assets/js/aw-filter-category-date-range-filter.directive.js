// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-date-range-filter.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import declUtils from 'js/declUtils';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/aw-date.directive';
import 'js/localeService';
import 'js/filterPanelService';
import 'js/filterPanelUtils';
import 'js/dateTimeService';
import 'js/aw-filter-category-date-contents.directive';

/**
 * Directive to display date range filter
 *
 * @example <aw-filter-category-date-range-filter ng-if="category.showDateRangeFilter" search-action="searchAction"
 *          category= "category" > </aw-filter-category-date-range-filter >
 *
 * @member aw-filter-category-date-range-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryDateRangeFilter', [
    'viewModelService',
    'localeService',
    'dateTimeService',
    'filterPanelUtils',
    function( viewModelSvc, localeSvc, dateTimeSvc, filterPanelUtils ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                id: '@',
                filterAction: '=',
                searchAction: '=',
                category: '='
            },
            controller: [
                '$scope',
                function( $scope ) {
                    viewModelSvc.getViewModel( $scope, true );

                    localeSvc.getTextPromise().then( function( localTextBundle ) {
                        processGetTextPromiseDateRange( localTextBundle );
                    } );

                    var processGetTextPromiseDateRange = function( localTextBundle ) {
                        $scope.moreText = localTextBundle.MORE_LINK_TEXT;
                        $scope.lessText = localTextBundle.LESS_LINK_TEXT;
                        $scope.filterText = localTextBundle.FILTER_TEXT;
                    };

                    $scope.toggleFilters = function() {
                        processToggleFiltersDateRange();
                    };

                    var processToggleFiltersDateRange = function() {
                        $scope.category.showMoreFilter = !$scope.category.showMoreFilter;
                        var context = {
                            category: $scope.category
                        };
                        eventBus.publish( 'toggleFilters', context );
                    };

                    $scope.select = function( category, id ) {
                        processSelectDateRange( category, id );
                    };

                    var processSelectDateRange = function( category, id ) {
                        if( id === category.displayName ) {
                            // call 'selectDateRange' actin from json
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, 'selectDateRange', declUtils
                                .cloneData( $scope ) );
                        }
                    };

                    // start date
                    $scope.changeEventListener1 = $scope.$watch( function() {
                        return $scope.category.daterange.startDate.dbValue;
                    }, function( newValue, oldValue ) {
                        if( newValue !== oldValue ) {
                            var startDate = dateTimeSvc.getJSDate( newValue );
                            var origStartDate = dateTimeSvc.getJSDate( $scope.category.daterange.startDate.value );
                            var endDate = dateTimeSvc.getJSDate( $scope.category.daterange.endDate.dbValue );
                            filterPanelUtils.validateDates( $scope.category, startDate, origStartDate, endDate,
                                endDate );
                        }
                    } );

                    // enddate
                    $scope.changeEventListener2 = $scope.$watch( function() {
                        return $scope.category.daterange.endDate.dbValue;
                    }, function( newValue, oldValue ) {
                        if( newValue !== oldValue ) {
                            var startDate = dateTimeSvc.getJSDate( $scope.category.daterange.startDate.dbValue );
                            var endDate = dateTimeSvc.getJSDate( newValue );
                            var origEndDate = dateTimeSvc.getJSDate( $scope.category.daterange.endDate.value );
                            filterPanelUtils.validateDates( $scope.category, startDate, startDate, endDate,
                                origEndDate );
                        }
                    } );
                }
            ],

            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-date-range-filter.directive.html'
        };
    }
] );
