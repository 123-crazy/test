// Copyright (c) 2020 Siemens

/**
 * Directive for search result filters.
 *
 * @module js/aw-search-result-filter.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/aw-icon.directive';
import 'js/localeService';
import wcagSvc from 'js/wcagService';
/**
 * Directive to display a search result filter when user has filtered the search results.
 *
 * @example <aw-search-result-filter prop="data.resultMultiFilter"></aw-search-result-filter>
 *
 * @member aw-search-result-filter
 * @memberof NgElementDirectives
 */
app.directive( 'awSearchResultFilter', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            action: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-search-result-filter.directive.html',
        controller: [ '$scope', 'localeService', function( $scope, localeSvc ) {
            $scope.i18n = {};
            localeSvc.getLocalizedTextFromKey( 'BaseMessages.REMOVE_BUTTON_TITLE', true ).then( result => $scope.i18n.remove = result );
            localeSvc.getLocalizedTextFromKey( 'awAddDirectiveMessages.nSelected', true ).then(
                result => $scope.i18n.selectedCount = result );
            $scope.removeObjectSet = function( $event, isCategory, filterValue ) {
                var context = {
                    prop: $scope.prop,
                    filterValue: filterValue
                };
                eventBus.publish( 'awSearchTab.filtersRemoved', context );
            };

            $scope.openObjectRecipes = function() {
                if( !$scope.showObjectRecipes ) {
                    $scope.showObjectRecipes = false;
                }
                $scope.showObjectRecipes = !$scope.showObjectRecipes;
            };

            /**
             * Check to see if space or enter were pressed on multiple breadcrumb link in add panel search
             */
            $scope.openObjectRecipesKeyPress = function( $event ) {
                if( wcagSvc.isValidKeyPress( $event ) ) {
                    $scope.openObjectRecipes();
                }
            };

            /**
             * Check to see if space or enter were pressed on remove breadcrumb in add panel search
             */
            $scope.removeBreadcrumbAddPanelKeyPress = function( $event ) {
                if( wcagSvc.isValidKeyPress( $event ) ) {
                    $scope.removeObjectSet( $event, true, null );
                }
            };

            /**
             * Check to see if space or enter were pressed on clear breadcrumb in add panel search
             */
            $scope.clearBreadcrumbAddPanelKeyPress = function( $event, filterVal ) {
                if( wcagSvc.isValidKeyPress( $event ) ) {
                    $scope.removeObjectSet( $event, false, filterVal );
                }
            };
        } ]
    };
} ] );
