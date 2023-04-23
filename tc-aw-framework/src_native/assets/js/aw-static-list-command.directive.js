// Copyright (c) 2020 Siemens

/**
 * Directive to show command in aw-static-list
 *
 * @module js/aw-static-list-command.directive
 * @requires app
 * @requires js/aw-icon.directive
 * @requires js/aw-list-command.directive
 * @requires js/aw-cell-command-bar.directive
 */
import app from 'app';
import 'js/aw-list-command.directive';
import 'js/aw-cell-command-bar.directive';
import 'js/aw-icon.directive';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Directive to display command for aw-static-list item. Just a simple wrapper for commandContext from performance consediration.
 *
 * @example <aw-static-list-command></aw-static-list-command>
 *
 * @member aw-static-list-command
 * @memberof NgElementDirectives
 */
app.directive( 'awStaticListCommand', [ function() {
    return {
        restrict: 'E',
        replace: true,
        templateUrl: app.getBaseUrlPath() + '/html/aw-static-list-command.directive.html',
        link: function( $scope ) {
            // Setup scope based on item
            $scope.context = { vmo: $scope.item };
        }
    };
} ] );
