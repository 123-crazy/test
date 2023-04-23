// Copyright (c) 2020 Siemens

/**
 * Directive to create the command list
 *
 * @module js/aw-popup-command-list.directive
 */
import app from 'app';
import 'js/aw-command.directive';
import 'js/aw-popup-command-cell.directive';

/**
 * Directive to display list of items
 *
 * @example <aw-popup-command-list prop="prop"></aw-popup-command-list>
 *
 * @member aw-popup-command-list
 * @memberof NgElementDirectives
 */
app.directive( 'awPopupCommandList', //
    [ //
        function() {
            return {
                restrict: 'E',
                transclude: true,
                scope: {
                    prop: '='
                },

                templateUrl: function( elem, attrs ) {
                    return app.getBaseUrlPath() + '/html/aw-popup-command-list.directive.html';
                },
                controller: [ '$scope', function( $scope ) {} ]
            };
        }
    ] );
