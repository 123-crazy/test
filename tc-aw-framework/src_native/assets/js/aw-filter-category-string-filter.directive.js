// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-string-filter.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/exist-when.directive';
import 'js/aw-repeat.directive';
import 'js/localeService';
import 'js/aw-filter-category-contents.directive';
import 'js/aw-filter-category-searchbox.directive';
import 'js/filterPanelService';
import 'js/aw-enter.directive';
import wcagSvc from 'js/wcagService';

// eslint-disable-next-line valid-jsdoc
/**
 * Directive to display search categories
 *
 * @example <aw-filter-category-string-filter category="category" filter-action="filterAction"
 *          search-action="searchAction"> </aw-filter-category-string-filter>
 *
 * @member aw-filter-category-string-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryStringFilter', [
    'viewModelService', 'localeService', 'filterPanelService',
    function( viewModelSvc, localeSvc, filterPanelService ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filterAction: '=',
                searchAction: '=',
                category: '=',
                disableTypeAheadFacetSearch: '='
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
                $scope.disableTypeAheadFacetSearch = $scope.disableTypeAheadFacetSearch && $scope.disableTypeAheadFacetSearch.toLowerCase() === 'true';
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
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-string-filter.directive.html'
        };
    }
] );
