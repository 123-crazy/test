// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-filter-category-date-range-filter.directive
 * @deprecated
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
import 'js/aw-cls-filter-category-date-contents.directive';


/**
 * Directive to display date range filter
 *
 * @example <aw-cls-filter-category-date-range-filter ng-if="category.showDateRangeFilter" search-action="searchAction"
 *          category= "category" > </aw-cls-filter-category-date-range-filter >
 *
 * @member aw-cls-filter-category-date-range-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFilterCategoryDateRangeFilter', [
    'viewModelService',
    'localeService',
    'dateTimeService',
    'filterPanelService',
    'filterPanelUtils',
    function( viewModelSvc, localeSvc, dateTimeSvc, filterPanelSvc, filterPanelUtils ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                id: '@',
                filterAction: '=',
                searchAction: '=',
                category: '=',
                checkboxAction: '=?',
                isBulkFilter: '=?'
            },
            controller: [
                '$scope',
                function( $scope ) {
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

                    $scope.select = function( category, id ) {
                        if( id === category.displayName ) {
                            //call 'selectDateRange' actin from json
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, 'selectDateRange', declUtils
                                .cloneData( $scope ) );
                        }
                    };

                    $scope.add = function( category, id ) {
                        if( id === category.displayName ) {
                            //call 'selectDateRange' actin from json
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, 'addDateRange', declUtils
                                .cloneData( $scope ) );
                        }
                    };

                    //start date
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

                    //enddate
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

            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-filter-category-date-range-filter.directive.html'
        };
    }
] );
