// Copyright (c) 2020 Siemens

/**
 * Directive to display a ViewModelProperty of type datetime.
 *
 * @module js/aw-datetime.directive
 */
import app from 'app';
import 'js/aw-property-date-time-val.directive';
import 'js/aw-property-label.directive';

/**
 * Directive to display a ViewModelProperty of type datetime.
 *
 * @example <aw-datetime prop="data.xxx"></aw-datetime>
 *
 * @member aw-datetime
 * @memberof NgElementDirectives
 */
app.directive( 'awDatetime', [ function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            quickNav: '@?'
        },
        controller: [ '$scope', function( $scope ) {
            $scope.prop.dateApi.isDateEnabled = true;
            $scope.prop.dateApi.isTimeEnabled = true;
        } ],
        templateUrl: app.getBaseUrlPath() + '/html/aw-datetime.directive.html'
    };
} ] );
