// Copyright (c) 2020 Siemens

/**
 * Directive used as header property
 *
 * @module js/aw-header-props.directive
 * @requires app
 * @requires js/aw-repeat.directive
 * @requires js/aw-widget.directive
 */
import app from 'app';
import 'js/aw-repeat.directive';
import 'js/aw-widget.directive';

/**
 * Directive used to display the header properties.
 *
 *
 * Parameters:
 * headerProperties - Any properties to display in the header
 *
 * @example <aw-header-props [headerProperties=""]></aw-header--props>
 *
 * @member aw-header-props
 * @memberof NgElementDirectives
 */
app.directive( 'awHeaderProps', function() {
    return {
        restrict: 'E',
        scope: {
            headerProperties: '=?headerproperties'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-header-props.directive.html'
    };
} );
