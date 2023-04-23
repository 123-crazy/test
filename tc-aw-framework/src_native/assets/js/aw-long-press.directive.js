// Copyright (c) 2020 Siemens

/**
 * Attribute directive to handle (long press/press and hold) event.
 *
 * @module js/aw-long-press.directive
 */
import app from 'app';

/**
 * Attribute directive to long press. Uses hammer.js to manage the js events.
 *
 * @example <div aw-long-press="myFunction()"></div>
 *
 * @member aw-long-press
 * @memberof NgElementDirectives
 */
app.directive( 'awLongPress', [ function() {
    return {
        restrict: 'A',
        link: function( $scope, $element, $attrs ) {
            /**
             * Prevent the next click event
             *
             * @param {*} event - JQuery click event.
             */
            var stopNextClick = function( event ) {
                event.stopPropagation();
                $element.off( 'click', stopNextClick );
            };

            var timeoutId = null;
            var processLongPress = function( event ) {
                $element.on( 'mouseup touchend mouseleave', cancelLongPress );
                timeoutId = setTimeout( function() {
                    // NOTE: stopNextClick is from the original implementation (Hammer version), which is wrong.
                    // Usually the click operation is hook on cell, but this approach is trying to stop it at prarent.
                    // The behavior is not guaranteed.
                    //
                    // You will see some side effects in different context, like:
                    // - In folder list of summary view, XRT Table, you will see that the multi-select does not happen until you release
                    //   your mouse.
                    // - In folder table view, you will see that the multi-select does not happen until you release your mouse.
                    // - In folder table with summary view, PWA table, when the item is not much, the multi-select happens when you press for
                    //   a while, and de-select after you release your mouse.
                    // - In tree view (Tractor_BOM, * as subset def), the multi-select happens when you press for a while, and de-select
                    //   after you release your mouse.
                    // - In list with summary view, PWA list, it works as expected. ( multi select when you press, and no de-select when you release
                    //   your mouse )
                    // The side effect are same for both hammer version and this version, this refactor is not trying to resolve this issue but just
                    // for avoiding Hammer's performance cost.
                    // In AW4.2 we can make this only for aw-list and in PL Table use another approach.
                    $element.on( 'click', stopNextClick );
                    $scope.$eval( $attrs.awLongPress, {
                        $event: event
                    } );
                    $element.off( 'mouseup touchend mouseleave', cancelLongPress );
                }, 500 );
            };

            var cancelLongPress = function() {
                clearTimeout( timeoutId );
                $element.off( 'mouseup touchend mouseleave', cancelLongPress );
            };

            $element.on( 'mousedown touchstart', processLongPress );

            $scope.$on( '$destroy', function() {
                $element.off( 'mousedown touchstart', processLongPress );
            } );
        }
    };
} ] );
