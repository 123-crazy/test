// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-contents.directive
 */
import app from 'app';
import declUtils from 'js/declUtils';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/filterPanelService';
import 'js/aw-enter.directive';
import 'js/aw-checkbox.directive';
import wcagSvc from 'js/wcagService';

/**
 * Directive to display search category filters
 *
 * @example <aw-filter-category-contents search-action="searchAction" filter="item" category= "category"
 *          ng-repeat="item in category.filterValues | limitTo: category.showMoreFilter ? category.count+1 :
 *          category.filterValues.length"> </aw-filter-category-contents >
 *
 * @member aw-filter-category-contents
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryContents', [
    'viewModelService', 'filterPanelService',
    function( viewModelSvc, filterPanelSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filter: '=',
                category: '=',
                searchAction: '='
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );

                /**
                 * publish event to select category header
                 *
                 */
                $scope.select = function( category, filter, $event ) {
                    filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );
                    filterPanelSvc.updateMostRecentSearchFilter( category.displayName, filter.name );

                    // call 'selectFilter' actin from json
                    var declViewModel = viewModelSvc.getViewModel( $scope, true );

                    declViewModel.selectedFilterVal = filter;
                    viewModelSvc.executeCommand( declViewModel, $scope.searchAction, declUtils.cloneData( $scope ) );
                };

                /**
                 * Check to see if space or enter were pressed
                 */
                $scope.selectionKeyPress = function( category, filter, $event ) {
                    if( wcagSvc.isValidKeyPress( $event ) ) {
                        $scope.select( category, filter, $event );
                    }
                };
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-contents.directive.html'
        };
    }
] );
