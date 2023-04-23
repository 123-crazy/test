// Copyright (c) 2020 Siemens

/**
 * Directive to display a separator.
 *
 * @module js/aw-context-separator.directive
 */
import app from 'app';

/**
 * Directive to display a separator.
 *
 * @member aw-context-separator
 * @memberof NgElementDirectives
 */
app.directive( 'awContextSeparator', [
    function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                token: '@'
            },

            template: '<span class="aw-seperator-style visible">{{token}}</span>',
            replace: true
        };
    }
] );
