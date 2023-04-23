// Copyright (c) 2020 Siemens

/**
 * Directive to validate the form
 *
 * @module js/aw-form-validator.directive
 */
import app from 'app';

/**
 * Directive to validate the form for the validation criteria
 *
 * @example <div aw-form-validator ng-model='data'></div>
 *
 * @member aw-form-validator
 * @memberof NgElementDirectives
 */
app.directive( 'awFormValidator', [ function() {
    return {
        restrict: 'A',
        require: '^form',
        link: function( $scope, element, attribute, $ctrl ) {
            var validationHandler = function( event ) {
                if( event.detail !== null ) {
                    $ctrl.$valid = false;
                } else {
                    $ctrl.$valid = true;
                }
            };
            element[ 0 ].addEventListener( 'validationCheck', validationHandler );

            $ctrl.$setValidity = function() {
                var elems = element.find( 'input' );
                var dirtyState = false;
                for( var i = 0; i < elems.length; i++ ) {
                    var inputCtrl = elems.eq( i ).controller( 'ngModel' );
                    if( inputCtrl.$dirty ) {
                        dirtyState = true;
                        break;
                    }
                }
                if( !dirtyState ) {
                    $ctrl.$setPristine();
                }
            };
            $scope.$on( '$destroy', function() {
                element[ 0 ].removeEventListener( 'validationCheck', validationHandler );
            } );
        }
    };
} ] );
