// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-numeric-filter.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/exist-when.directive';
import 'js/aw-repeat.directive';
import 'js/localeService';
import 'js/aw-filter-category-numeric-range-filter.directive';
import 'js/aw-filter-category-contents.directive';
import 'js/filterPanelUtils';
import 'js/filterPanelService';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display search numeric categories
 *
 * @example <aw-filter-category-numeric-filter category="category" filter-action="filterAction"
 *          search-action="searchAction"> </aw-filter-category-numeric-filter>
 *
 * @member aw-filter-category-numeric-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryNumericFilter', [
    'viewModelService', 'localeService', 'filterPanelUtils', 'filterPanelService',
    function( viewModelSvc, localeSvc, filterPanelUtils, filterPanelService ) {
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
                    $scope.noFiltersText = localTextBundle.NO_RESULTS_FOUND;
                } );

                $scope.toggleFiltersSoa = function( isMore ) {
                    filterPanelService.toggleFiltersSoa( isMore, $scope.category );
                };

                /**
                 * Check to see if space or enter were pressed on the More button
                 */
                $scope.moreFilterKeyPress = function( $event ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.toggleFiltersSoa( true );
                    }
                };

                /**
                 * Check to see if space or enter were pressed on the Less button
                 */
                $scope.lessFilterKeyPress = function( $event ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.toggleFiltersSoa( false );
                    }
                };
            } ],

            link: function( $scope ) {
                $scope.$watch( 'data.' + $scope.item, function( value ) {
                    $scope.item = value;
                } );
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-numeric-filter.directive.html'
        };
    }
] );
