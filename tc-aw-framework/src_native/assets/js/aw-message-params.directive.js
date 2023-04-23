// Copyright (c) 2020 Siemens

/**
 * Directive to evaluate message and apply message params based on the context provided
 *
 * @module js/aw-message-params.directive
 */
import app from 'app';
import 'js/messagingService';

/**
 * Directive to evaluate message and apply message params based on the context provided
 *
 * @example <aw-message-params context="context" params="params" message="msg"></aw-partial-error>
 *
 * @member aw-message-params
 * @memberof NgElementDirectives
 */
app.directive( 'awMessageParams', [
    'messagingService',
    function( messagingSvc ) {
        return {
            restrict: 'E',
            scope: {
                context: '=',
                params: '=',
                message: '@'
            },
            template: '<div>{{localizedMessage}}</div>',
            link: function( $scope ) {
                if( $scope.message ) {
                    $scope.localizedMessage = messagingSvc.applyMessageParams( $scope.message, $scope.params,
                        $scope.context );
                }
            }
        };
    }
] );
