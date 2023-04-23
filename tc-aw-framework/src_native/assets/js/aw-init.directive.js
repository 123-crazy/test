// Copyright (c) 2020 Siemens

/**
 * @module js/aw-init.directive
 */
import app from 'app';

/**
 * The awInit directive allows us to evaluate an expression in the current scope. <br>
 * Note: awInit is a replacement of {@angular's ngInit}
 *
 * @example <aw-div aw-init='maxSize=3'></aw-div>
 *
 * @member aw-init
 * @memberof NgAttributeDirectives
 */
app.directive( 'awInit', [ function() {
    return {
        restrict: 'A',
        priority: 450, // same as ngInit
        compile: function() {
            return {
                pre: function( scope, element, attrs ) {
                    scope.$eval( attrs.awInit );
                }
            };
        }
    };
} ] );
