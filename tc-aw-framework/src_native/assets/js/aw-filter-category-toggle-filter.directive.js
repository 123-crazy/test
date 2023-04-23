// Copyright (c) 2020 Siemens

/**
 * @module js/aw-filter-category-toggle-filter.directive
 */
import app from 'app';
import 'js/viewModelService';
import 'js/aw-icon.directive';
import 'js/visible-when.directive';
import 'js/aw-repeat.directive';
import 'js/localeService';
import 'js/aw-filter-category-searchbox.directive';
import 'js/aw-radiobutton.directive';
import 'js/aw-filter-category-contents.directive';

/**
 * Directive to display search categories
 *
 * @example <aw-filter-category-toggle-filter category="category" filter-action="filterAction"
 *          search-action="searchAction"> </aw-filter-category-toggle-filter>
 *
 * @member aw-filter-category-toggle-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awFilterCategoryToggleFilter', [
    'viewModelService',
    function( viewModelSvc ) {
        return {
            transclude: true,
            restrict: 'E',
            scope: {
                filterAction: '=',
                searchAction: '=',
                category: '=',
                filter: '=',
                action: '@'
            },
            controller: [ '$scope', function( $scope ) {
                viewModelSvc.getViewModel( $scope, true );
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-filter-category-toggle-filter.directive.html'
        };
    }
] );
