// Copyright (c) 2020 Siemens

/**
 * Definition for the <aw-property-string-val> directive.
 *
 * @module js/aw-property-string-val.directive
 */
import app from 'app';
import 'js/aw-property-lov-val.directive';
import 'js/aw-property-rendering-hint.directive';
import 'js/aw-property-rich-text-area-val.directive';
import 'js/aw-property-text-area-val.directive';
import 'js/aw-property-text-box-val.directive';

/**
 * Definition for the <aw-property-string-val> directive.
 *
 * @example TODO
 *
 * @member aw-property-string-val
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.3.0.
 * @alternative none, not used anymore
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awPropertyStringVal', function() {
    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '=',
            inTableCell: '@'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-property-string-val.directive.html'
    };
} );
