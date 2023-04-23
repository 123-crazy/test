// Copyright (c) 2020 Siemens

/**
 * @module js/aw-repeat.directive
 */
import app from 'app';

/**
 *
 * @example <aw-button aw-repeat='item : items'></aw-button>
 *
 * @member aw-repeat
 * @memberof ngRepeatDirective
 */
app.directive( 'awRepeat', [ 'ngRepeatDirective', function( ngRepeatDirective ) {
    var ngRepeat = ngRepeatDirective[ 0 ];
    return {
        transclude: ngRepeat.transclude,
        priority: ngRepeat.priority,
        terminal: ngRepeat.terminal,
        restrict: ngRepeat.restrict,
        multiElement: ngRepeat.multiElement,
        $$tlb: true,
        compile: function( $element, $attr ) {
            var expression = $attr.awRepeat.trim();
            if( expression.match( /([a-z]|[A-Z]|$|_).*:.*/g ) ) {
                expression = expression.replace( ':', ' in ' );
            } else {
                throw 'Invalid expression:' + expression;
            }

            $attr.ngRepeat = expression;
            return ngRepeat.compile.apply( ngRepeat, arguments );
        }
    };
} ] );
