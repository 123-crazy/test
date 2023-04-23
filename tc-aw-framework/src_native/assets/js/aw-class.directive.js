// Copyright (c) 2020 Siemens

/**
 * @module js/aw-class.directive
 */
import app from 'app';

/* awClass is a wrapper over ngClass.
 * The awClass directive allows to dynamically set CSS classes on an HTML / UI element by
 * data - binding an expression that represents all classes to be added.
 * @example <ANY class="aw-class: expression;"> ... </ANY>
 * @example <ANY ng-class="expression"></ANY>
 * @memberof ngClassDirective
 */
app.directive( 'awClass', [ 'ngClassDirective', function( ngClassDirective ) {
    var ngClass = ngClassDirective[ 0 ];
    return {
        priority: ngClass.priority,
        restrict: ngClass.restrict,
        compile: function( $element, $attr ) {
            var expression = $attr.awClass.trim();
            $attr.ngClass = expression;
            return ngClass.compile.apply( ngClass, arguments );
        }
    };
} ] );
