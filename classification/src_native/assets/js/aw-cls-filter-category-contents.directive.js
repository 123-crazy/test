// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-cls-filter-category-contents.directive
 * @deprecated
 */
import app from 'app';
import declUtils from 'js/declUtils';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/aw-checkbox.directive';
import 'js/aw-icon.directive';
import 'js/filterPanelService';


/**
 * Directive to display search category filters
 *
 * @example <aw-cls-filter-category-contents search-action="searchAction" filter="item" category= "category"
 *          ng-repeat="item in category.filterValues | limitTo: category.showMoreFilter ? category.count+1 :
 *          category.filterValues.length"> </aw-cls-filter-category-contents >
 *
 * @member aw-cls-filter-category-contents
 * @memberof NgElementDirectives
 */
app.directive( 'awClsFilterCategoryContents', [ 'viewModelService', 'filterPanelService',

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
            controller: [ '$scope', function( $scope ) {
              //  if( typeof $scope.filter.itemInfo === 'undefined' ) {
                 //   var displayName = $scope.filter.name + '(' + $scope.filter.count + ')';
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
              //  }

                viewModelSvc.getViewModel( $scope, true );

                /**
                 * publish event to select category header
                 *
                 */
                $scope.select = function( category, filter, $event ) {
                    if( !$scope.isBulkFilter ) {
                        filterPanelSvc.updateScrollInfo( $event.currentTarget.offsetTop );

                        //call 'selectFilter' actin from json
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );

                        declViewModel.selectedFilterVal = filter;
                        viewModelSvc.executeCommand( declViewModel, $scope.searchAction, declUtils.cloneData( $scope ) );
                    }
                };
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-cls-filter-category-contents.directive.html'
        };
    }
] );
