// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-date-contents.directive
 */
import app from 'app';
import declUtils from 'js/declUtils';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/filterPanelService';
import wcagSvc from 'js/wcagService';
import 'js/aw-checkbox.directive';

/**
 * Directive to display search category date filters
 *
 * @example <aw-filter-category-date-contents search-action="searchAction" filter="item" category= "category"
 *          ng-repeat="item in category.filterValues | limitTo: category.showMoreFilter ? category.count+1 :
 *          category.filterValues.length"> </aw-filter-category-date-contents >
 *
 * @member aw-filter-category-date-contents
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryDateContents', [
    'viewModelService',
    'filterPanelService',
    function( viewModelSvc, filterPanelSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filter: '=',
                category: '=',
                searchAction: '='
            },
            controller: [
                '$scope',
                function( $scope ) {
                    viewModelSvc.getViewModel( $scope, true );

                    /**
                     * publish event to select category header
                     *
                     */
                    $scope.select = function( category, filter, $event ) {
                        filterPanelSvc.updateMostRecentSearchFilter( category.displayName, filter.name );
                        if( $event !== undefined ) {
                            filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );
                        }

                        // call 'selectFilter' actin from json
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );
                        viewModelSvc.executeCommand( declViewModel, $scope.searchAction, declUtils
                            .cloneData( $scope ) );
                    };

                    /**
                     * Check to see if space or enter were pressed
                     */
                    $scope.selectionKeyPress = function( category, filter, $event ) {
                        if( wcagSvc.isValidKeyPress( $event ) ) {
                            $scope.select( category, filter, $event );
                        }
                    };
                }
            ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-date-contents.directive.html'
        };
    }
] );
