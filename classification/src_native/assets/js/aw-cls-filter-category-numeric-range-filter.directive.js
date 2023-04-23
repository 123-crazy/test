// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-filter-category-numeric-range-filter.directive
 * @deprecated
 */
import app from 'app';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/uwPropertyService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/aw-date.directive';
import 'js/localeService';
import 'js/filterPanelService';
import 'js/filterPanelUtils';
import 'js/dateTimeService';
import 'js/aw-numeric.directive';
import 'js/aw-cls-filter-category-contents.directive';


/**
 * Directive to display numeric range filter
 *
 * @example <aw-cls-filter-category-numeric-range-filter ng-if="category.showNumericRangeFilter"
 *          search-action="searchAction" category= "category" > </aw-cls-filter-category-numeric-range-filter >
 *
 * @member aw-cls-filter-category-numeric-range-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFilterCategoryNumericRangeFilter', [
    'viewModelService',
    'uwPropertyService',
    'localeService',
    'filterPanelService',
    'filterPanelUtils',
    function( viewModelSvc, uwPropertyService, localeSvc, filterPanelSvc, filterPanelUtils ) {
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
                            //call 'selectNumericRange' actin from json
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, 'selectNumericRange', declUtils.cloneData( $scope ) );
                        }
                    };

                    $scope.add = function( category, id ) {
                        if( id === category.displayName ) {
                            //call 'addNumericRange' actin from json
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, 'addNumericRange', declUtils.cloneData( $scope ) );
                        }
                    };

                    $scope.validateRange = function( category, startRange, endRange ) {
                        filterPanelUtils.validateNumericRange( category, startRange, endRange );
                    };

                    $scope.isPropValid = function( prop ) {
                        if( prop.error && prop.error.length > 0 ) {
                            return false;
                        }
                        return true;
                    };

                    $scope.evalKeyup = function( $event ) {
                        var startProp = $scope.category.numericrange.startValue;
                        var endProp = $scope.category.numericrange.endValue;
                        if( $event.key === 'Enter' || startProp.valueUpdated || endProp.valueUpdated ) {
                            $scope.validateRange( $scope.category, startProp.dbValue, endProp.dbValue );
                        }
                    };

                    //startRange
                    $scope.changeEventListener1 = $scope.$watch( function() {
                            return $scope.category.numericrange.startValue.dbValue;
                        },
                        function( newValue, oldValue ) {
                            if( newValue !== oldValue && $scope.isPropValid( $scope.category.numericrange.startValue ) ) {
                                var startRange = parseFloat( newValue );
                                var endRange = parseFloat( $scope.category.numericrange.endValue.dbValue );
                                $scope.validateRange( $scope.category, startRange, endRange );
                            } else {
                                $scope.category.showSearch = false;
                                $scope.category.showAdd = false;
                            }
                        } );

                    //endRange
                    $scope.changeEventListener2 = $scope.$watch( function() {
                        return $scope.category.numericrange.endValue.dbValue;
                    }, function( newValue, oldValue ) {
                        if( newValue !== oldValue && $scope.isPropValid( $scope.category.numericrange.endValue ) ) {
                            var startRange = parseFloat( $scope.category.numericrange.startValue.dbValue );
                            var endRange = parseFloat( newValue );
                            $scope.validateRange( $scope.category, startRange, endRange );
                        } else {
                            $scope.category.showSearch = false;
                            $scope.category.showAdd = false;
                        }
                    } );
                }
            ],

            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-filter-category-numeric-range-filter.directive.html'
        };
    }
] );
