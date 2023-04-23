// Copyright (c) 2020 Siemens

/**
 * Directive to input password.
 *
 * @module js/aw-password.directive
 */
import app from 'app';
import 'js/aw-textbox.directive';

/**
 * Directive to input password
 *
 * @example <aw-password prop="data.xxx"></aw-password>
 *
 * @member aw-password
 * @memberof NgElementDirectives
 */
app.directive( 'awPassword', [ function() {
    return {
        restrict: 'E',
        scope: {
            prop: '='
        },
        link: function( scope ) {
            scope.prop.inputType = 'password';
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-password.directive.html'
    };
} ] );
