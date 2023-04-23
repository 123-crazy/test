// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display walker command
 *
 * @module js/aw-walker-command.directive
 */
import * as app from 'app';
import 'js/command.service';

/**
 * Directive to display walker command
 *
 * @example <aw-walker-command></aw-walker-command>
 *
 * @member aw-walker-command
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerCommand', function() {
    return {
        restrict: 'E',
        scope: {
            cmddata: '='
        },
        template: '<div></div>',
        link: function() {
            //This directive is for commands elements outside of object sets which are no longer supported
            //Leaving the directive in but disabled to avoid breaking any leftover usages which customers may have
        }
    };
} );
