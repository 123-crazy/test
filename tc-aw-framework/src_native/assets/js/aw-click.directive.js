// Copyright (c) 2020 Siemens

/**
 * @module js/aw-click.directive
 */
import app from 'app';
import _ from 'lodash';

var directiveName = 'awClick';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * aw-click directive
 *
 * This works the same as the ng-click directive from Angular but provides support for
 * some additional options through aw-click-options. Currently supported options are
 *
 * debounceDoubleClick - Will only trigger the function once when user double clicks
 *
 * @example <button aw-click="doit(action)" aw-click-options="{ debounceDoubleClick: true }"></button>
 *
 * @member aw-click
 * @memberof NgElementDirectives
 */
app.directive( directiveName, [ '$parse', function( $parse ) {
    return {
        restrict: 'A',
        compile: function( $element, attr ) {
            var fn = $parse( attr[ directiveName ] );
            var opts = $parse( attr[ directiveName + 'Options' ] )() || {};
            if( opts.debounceDoubleClick ) {
                fn = _.debounce( fn, 500, {
                    leading: true,
                    trailing: false
                } );
            }
            return function ngEventHandler( scope, element ) {
                element.on( 'click', function( event ) {
                    var callback = function() {
                        fn( scope, { $event: event } );
                    };
                    scope.$apply( callback );
                } );
            };
        }
    };
} ] );
