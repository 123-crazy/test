// Copyright (c) 2020 Siemens

/**
 * Directive to perform action on enter
 *
 * @module js/aw-enter-key.directive
 */
import app from 'app';
import 'js/viewModelService';

// eslint-disable-next-line valid-jsdoc
/**
 * Directive to perform action on enter key
 *
 * @example aw-enter-key="<Name of action>"
 *
 * @member aw-enter-key
 * @memberof NgAttributeDirectives
 */
app.directive( 'awEnterKey', [
    'viewModelService',
    function( viewModelSvc ) {
        return function( $scope, $element, attrs ) {
            $element.bind( 'keydown keypress', function( event ) {
                if( event.which === 13 ) {
                    $scope.$evalAsync( function() {
                        var declViewModel = viewModelSvc.getViewModel( $scope, true );

                        viewModelSvc.executeCommand( declViewModel, attrs.awEnterKey, $scope );
                    } );

                    event.preventDefault();
                }
            } );
        };
    }
] );
