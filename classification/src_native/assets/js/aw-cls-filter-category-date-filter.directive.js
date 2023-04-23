// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-filter-category-date-filter.directive
 * @deprecated
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/localeService';
import 'js/aw-cls-filter-category-date-range-filter.directive';
import 'js/aw-cls-filter-category-date-contents.directive';
import 'js/aw-filter-category-date-contents.directive';


/**
 * Directive to display search categories
 *
 * @example <aw-cls-filter-category-date-filter category="category" filter-action="filterAction"
 *          search-action="searchAction"> </aw-cls-filter-category-date-filter>
 *
 * @member aw-filter-category-date-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFilterCategoryDateFilter', [ 'viewModelService', 'localeService',
    function( viewModelSvc, localeSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                expandCollapseAction: '@',
                filterAction: '=',
                searchAction: '=',
                category: '=',
                checkboxAction: '=?',
                isBulkFilter: '=?'
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
            } ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-filter-category-date-filter.directive.html'
        };
    }
] );
