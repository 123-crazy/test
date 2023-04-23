// Copyright (c) 2020 Siemens

/**
 * @module js/aw-enter.directive
 */
import app from 'app';

/**
 * Attribute directive to support enter key presss
 *
 * @example <input type="password" ng-model="password" aw-enter='login()'></input>
 *
 * @member aw-enter
 * @memberof NgElementDirectives
 */
app.directive( 'awEnter', function() {
    return function( scope, element, attrs ) {
        element.bind( 'keydown', function( event ) {
            var keyCode = event.which || event.keyCode;
            if( keyCode === 13 ) {
                scope.$apply( function() {
                    scope.$eval( attrs.awEnter );
                } );
            }
        } );
    };
} );
