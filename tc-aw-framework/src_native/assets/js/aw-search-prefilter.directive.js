// Copyright (c) 2020 Siemens

/**
 * Directive to display search-prefilter.
 *
 * @module js/aw-search-prefilter.directive
 */
import app from 'app';
import 'js/aw-listbox.directive';

/**
 * Directive to display search-prefilter.
 *
 * @example <aw-search-prefilter></aw-search-prefilter>
 *
 * @member aw-search-prefilter
 * @memberof NgElementDirectives
 */
app.directive( 'awSearchPrefilter', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '=',
            list: '=',
            action: '@?',
            defaultSelectionValue: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-search-prefilter.directive.html',
        link: function( $scope ) {
            $scope.prop.defaultSelectionValue = $scope.defaultSelectionValue;
            $scope.prop.isSearchPrefilter = true;
        }
    };
} ] );
