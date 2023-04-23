// Copyright (c) 2020 Siemens

/**
 * Directive to display a ViewModelProperty of type date.
 *
 * @module js/aw-date.directive
 */
import app from 'app';
import 'js/aw-property-date-time-val.directive';
import 'js/aw-property-label.directive';

/**
 * Directive to display a ViewModelProperty of type date.
 *
 * @example <aw-date prop="data.xxx"></aw-date>
 *
 * @member aw-date
 * @memberof NgElementDirectives
 */
app.directive( 'awDate', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            changeAction: '@?',
            quickNav: '@?'
        },
        controller: [ '$scope', function( $scope ) {
            $scope.prop.dateApi.isDateEnabled = true;
            $scope.prop.dateApi.isTimeEnabled = false;
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-datetime.directive.html'
    };
} ] );
