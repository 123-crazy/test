// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-filter-category-date-contents.directive
 * @deprecated
 */
import app from 'app';
import declUtils from 'js/declUtils';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-checkbox.directive';
import 'js/aw-repeat.directive';
import 'js/filterPanelService';


/**
 * Directive to display search category date filters
 *
 * @example <aw-cls-filter-category-date-contents search-action="searchAction" filter="item" category= "category"
 *          ng-repeat="item in category.filterValues | limitTo: category.showMoreFilter ? category.count+1 :
 *          category.filterValues.length"> </aw-cls-filter-category-date-contents >
 *
 * @member aw-cls-filter-category-date-contents
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFilterCategoryDateContents', [
    'viewModelService',
    'filterPanelService',
    function( viewModelSvc, filterPanelSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filter: '=',
                category: '=',
                searchAction: '=',
                checkboxAction: '=?',
                isBulkFilter: '=?'
            },
            controller: [
                '$scope',
                function( $scope ) {
                    viewModelSvc.getViewModel( $scope, true );
                        $scope.filter.itemInfo = {
                            displayName: '',
                            dispValue: '',
                            propertyDisplayName: '',
                            type: 'BOOLEAN',
                            isRequired: 'true',
                            vertical: true,
                            isEditable: true,
                            isEnabled: true,
                            dbValue: $scope.filter.selected || false,
                            propertyLabelDisplay: 'PROPERTY_LABEL_AT_RIGHT',
                            labelPosition: 'PROPERTY_LABEL_AT_RIGHT'
                        };

                    /**
                     * publish event to select category header
                     *
                     */
                    $scope.select = function( category, filter, $event ) {
                        if( !$scope.isBulkFilter ) {
                            if( $event !== undefined ) {
                                filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );
                            }

                            //call 'selectFilter' actin from json
                            var declViewModel = viewModelSvc.getViewModel( $scope, true );
                            viewModelSvc.executeCommand( declViewModel, $scope.searchAction, declUtils
                                .cloneData( $scope ) );
                        }
                    };
                }
            ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-filter-category-date-contents.directive.html'
        };
    }
] );
