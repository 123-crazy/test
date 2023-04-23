// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-bulk-filter-category.directive
 * @deprecated
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/visible-when.directive';
import 'js/aw-cls-bulk-filter-category-string-filter.directive';
import 'js/aw-cls-bulk-filter-category-numeric-filter.directive';
import 'js/aw-cls-filter-category-date-filter.directive';
import 'js/aw-filter-category-numeric-filter.directive';
import 'js/aw-filter-category-date-filter.directive';
import 'js/aw-filter-category-contents.directive';
import 'js/aw-filter-category-toggle-filter.directive';
import 'js/aw-hierarchical-navigation.directive';
import 'js/aw-transclude.directive';
import 'js/aw-checkbox.directive';
import 'js/filterPanelService';
import 'js/aw-class.directive';
import 'js/exist-when.directive';
import 'js/localeService';


/**
 * Directive to display search categories
 *
 * @example <aw-cls-bulk-filter-category category-action="'selectCategory'" filter-action="filterSearchText"
 *          search-action="'selectFilter'"
 *          add-action="addAction"
 *          checkbox-action="checkboxAction"
 *          is-bulk-filter="isBulkFilter"
 *          category="item" aw-repeat="item : data.categories track by $index" >
 *          </aw-cls-bulk-filter-category>
 *
 * @member aw-cls-bulk-filter-category
 * @memberof NgElementDirectives
 */

app.directive( 'awClsBulkFilterCategory', [ 'viewModelService', 'filterPanelService',
    function( viewModelSvc, filterPanelSvc ) {
        return {

            transclude: true,
            restrict: 'E',
            scope: {
                expandAction: '@',
                categoryAction: '@',
                addAction: '@?',
                checkboxAction: '@?',
                isBulkFilter: '=?',
                filterAction: '@',
                searchAction: '@',
                category: '='
            },
            controller: [ '$scope', 'localeService', function( $scope, localeSvc ) {
                localeSvc.getTextPromise( 'ClassificationPanelMessages' ).then( function( textBundle ) {
                    $scope.expand = textBundle.expand;
                    $scope.collapse = textBundle.collapse;
                } );

                viewModelSvc.getViewModel( $scope, true );

                $scope.toggleExpansion = function() {
                    $scope.category.expand = !$scope.category.expand;
                    var context = {
                        source: 'filterPanel',
                        category: $scope.category,
                        expand: $scope.category.expand
                    };
                    eventBus.publish( 'toggleExpansion', context );
                };

                /**
                 * publish event to select category header
                 *
                 */

                $scope.select = function( $event ) {
                    filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );

                    //Call selectCategory action from json file
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    if( $scope.category && $scope.category.filterValues !== undefined && $scope.category.filterValues ) {
                        viewModelSvc.executeCommand( declViewModel, $scope.categoryAction, $scope );
                    }
                };

                $scope.toggleExpansionSoa = function() {
                    $scope.category.isSelected = true;
                    $scope.category.expand = !$scope.category.expand;
                    $scope.ctx.search.valueCategory = $scope.category;
                    var context = {
                        source: 'filterPanel',
                        category: $scope.category,
                        expand: $scope.category.expand
                    };
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );
                    eventBus.publish( 'toggleExpansionUnpopulated', context );
                };

                $scope.toggleExpansionSwitch = function() {
                    if( !$scope.category.isPopulated && !$scope.category.expand ) {
                        $scope.toggleExpansionSoa();
                    } else {
                        $scope.toggleExpansion();
                    }
                };
            } ],
            link: function( $scope, element ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );

                $scope.$watch( 'data.' + $scope.action, function( value ) {
                    $scope.action = value;
                } );

                element.addClass( 'aw-ui-categoryWrapper' );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-bulk-filter-category.directive.html'
        };
    }
] );
