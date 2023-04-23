// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/aw-numeric.directive';
import 'js/visible-when.directive';
import 'js/aw-filter-category-string-filter.directive';
import 'js/aw-filter-category-numeric-filter.directive';
import 'js/aw-filter-category-date-filter.directive';
import 'js/aw-filter-category-toggle-filter.directive';
import 'js/aw-filter-category-contents.directive';
import 'js/aw-hierarchical-navigation.directive';
import 'js/aw-transclude.directive';
import 'js/filterPanelService';
import 'js/filterPanelUtils';
import 'js/localeService';
import 'js/aw-enter.directive';
import wcagSvc from 'js/wcagService';
import $ from 'jquery';

/**
 * Directive to display search categories
 *
 * @example <aw-filter-category category-action="'selectCategory'" filter-action="filterSearchText"
 *          search-action="'selectFilter'" category="item" aw-repeat="item : data.categories track by $index" >
 *          </aw-filter-category>
 *
 * @member aw-filter-category
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategory', [
    'viewModelService', 'filterPanelService', 'filterPanelUtils',
    function( viewModelSvc, filterPanelSvc, filterPanelUtils ) {
        return {

            transclude: true,
            restrict: 'E',
            scope: {
                categoryAction: '@',
                filterAction: '@',
                searchAction: '@',
                category: '=',
                disableTypeAheadFacetSearch: '@?'
            },
            controller: [ '$scope', 'localeService', '$timeout', function( $scope, localeSvc, $timeout ) {
                localeSvc.getLocalizedTextFromKey( 'BaseMessages.EXPAND', true ).then( result => $scope.expand = result );
                localeSvc.getLocalizedTextFromKey( 'BaseMessages.COLLAPSE', true ).then( result => $scope.collapse = result );
                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.noFiltersText = localTextBundle.NO_RESULTS_FOUND;
                } );
                viewModelSvc.getViewModel( $scope, true );

                $scope.toggleExpansion = function( event, isExpand ) {
                    filterPanelSvc.clearMostRecentSearchFilter();
                    $scope.category.expansionClicked = true;
                    $scope.category.expand = !$scope.category.expand;

                    var context = {
                        source: 'filterPanel',
                        category: $scope.category,
                        expand: $scope.category.expand
                    };
                    filterPanelUtils.ifLimitedCategoriesEnabledThenProcessList( $scope.category );
                    eventBus.publish( 'toggleExpansion', context );
                    var filterCategory = $( event.target ).closest( '.aw-ui-filterCategory' );
                    var arrow;
                    $timeout( function () {
                    if ( isExpand ) {
                        arrow = $( filterCategory ).find( '.aw-search-filterCategoryLabelCollapse' );
                    } else {
                        arrow = $( filterCategory ).find( '.aw-search-filterCategoryLabelExpand' );
                    }
                    if( arrow && arrow.length > 0 ) {
                        arrow[0].focus();
                    } else{
                        var categoryLabel = $( filterCategory ).find( '.aw-ui-filterCategoryLabel' );
                        if ( categoryLabel && categoryLabel.length > 0 ) {
                            categoryLabel[0].focus();
                        }
                    } }, 50 );
                };

                $scope.toggleExpansionSoa = function( event, isExpand ) {
                    filterPanelSvc.clearMostRecentSearchFilter();
                    $scope.category.expansionClicked = true;
                    $scope.category.isSelected = true;
                    $scope.category.expand = !$scope.category.expand;
                    filterPanelUtils.checkIfSearchCtxExists();
                    $scope.ctx.search.valueCategory = $scope.category;
                    var context = {
                        source: 'filterPanel',
                        category: $scope.category,
                        expand: $scope.category.expand
                    };
                    filterPanelUtils.ifLimitedCategoriesEnabledThenProcessList( $scope.category );
                    if( !filterPanelUtils.checkIfFilterValuesExist( $scope.category ) ) {
                        eventBus.publish( 'toggleExpansionUnpopulated', context );
                    }
                    var filterCategory = $( event.target ).closest( '.aw-ui-filterCategory' );
                    var arrow;
                    $timeout( function () {
                    if ( isExpand ) {
                        arrow = $( filterCategory ).find( '.aw-search-filterCategoryLabelCollapse' );
                    } else {
                        arrow = $( filterCategory ).find( '.aw-search-filterCategoryLabelExpand' );
                    }
                    if( arrow && arrow.length > 0 ) {
                        arrow[0].focus();
                    } else{
                        var categoryLabel = $( filterCategory ).find( '.aw-ui-filterCategoryLabel' );
                        if ( categoryLabel && categoryLabel.length > 0 ) {
                            categoryLabel[0].focus();
                        }
                    } }, 50 );
                };

                /**
                 * publish event to select category header
                 *
                 */
                $scope.select = function( $event ) {
                    filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );

                    // Call selectCategory action from json file
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    if( $scope.category && $scope.category.filterValues !== undefined && $scope.category.filterValues ) {
                        viewModelSvc.executeCommand( declViewModel, $scope.categoryAction, $scope );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on the category label
                 */
                $scope.categoryLabelKeyPress = function( $event ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.select( $event );
                        var clearLastSelected = null;
                        filterPanelSvc.updateMostRecentSearchFilter( clearLastSelected, clearLastSelected );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on the toggleExpansionSoa
                 */
                $scope.toggleExpansionSoaKeyPress = function( $event, isExpand ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.toggleExpansionSoa( $event, isExpand );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on toggleExpansion
                 */
                $scope.toggleExpansionKeyPress = function( $event, isExpand ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.toggleExpansion( $event, isExpand );
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
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category.directive.html'
        };
    }
] );
