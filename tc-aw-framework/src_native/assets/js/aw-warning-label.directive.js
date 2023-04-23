// Copyright (c) 2020 Siemens

/**
 * Directive to show a warning label
 *
 * @module js/aw-warning-label.directive
 */
import app from 'app';

/**
 * Directive to show a warning label
 *
 * @member aw-warning-label
 * @memberof NgAttributeDirectives
 */
app.directive( 'awWarningLabel', [ function() {
    return {
        restrict: 'E',
        scope: {
            text: '@'
        },
        template: '<div class="aw-widgets-propertyWarningLabel">{{text}}</div>'
    };
} ] );
