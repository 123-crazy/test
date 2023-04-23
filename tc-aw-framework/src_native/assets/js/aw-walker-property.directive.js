// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display walker view
 *
 * @module js/aw-walker-property.directive
 */
import * as app from 'app';
import 'js/aw-widget.directive';

/**
 * Directive to display panel body.
 *
 * @example <aw-walker-view></aw-walker-view>
 *
 * @member aw-walker-view
 * @memberof NgElementDirectives
 */
app.directive( 'awWalkerProperty', function() {
    return {
        restrict: 'E',
        scope: {
            propdata: '=',
            viewModel: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-walker-property.directive.html'
    };
} );
