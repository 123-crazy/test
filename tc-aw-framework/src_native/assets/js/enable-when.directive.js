// Copyright (c) 2020 Siemens

/**
 * @module js/enable-when.directive
 */
import app from 'app';
import ngModule from 'angular';

/**
 * Attribute Directive to change the enablement of an element based on a condition *
 *
 * @example <aw-button action="submit" enable-when="someCondition">Submit</aw-button>
 *
 * @member enable-when
 * @memberof NgAttributeDirectives
 */

const enabledElem = 'input, button, textarea, a, label:empty, span:empty';

app.directive( 'enableWhen', function() {
    return {
        restrict: 'A',

        link: function( scope, element, att ) {
            var disableTabForFocusableElements = function( value ) {
                var elems = element.find( enabledElem );
                if( value ) {
                    elems.prop( 'tabindex', '0' );
                } else {
                    elems.prop( 'tabindex', '-1' );
                }
            };
            /**
             * Sync 'prop'(viewModelProperty, if available) with element's enabled/disabled state.
             * @param element: the element which may have prop (viewModelProperty)
             * @param isEnabled: true or false
             */
            var syncPropState = function( element, isEnabled ) {
                var ele = ngModule.element( element );
                var scope = ele.scope();
                if( scope && scope.prop && scope.prop.isEnabled !== undefined ) {
                    scope.prop.isEnabled = isEnabled;
                }
            };
            // disable mouse event
            var clickHandler = function( event ) {
                event.stopPropagation();
                event.preventDefault();
            };
            scope.$watch( att.enableWhen, function( value ) {
                var ele = ngModule.element( element );
                /* to add disable class in first div element which is present inside the custom tag
                becasue in chrome, opacity doesn't work as the custom tag width and height is auto * auto */
                var firstDiv = ele.find( 'div,input' ).first();
                if( value ) {
                    ele.prop( 'disabled', false );
                    ele.removeClass( 'disabled' );
                    ele.removeClass( 'aw-enableWhen-tooltip' );
                    if( firstDiv.length === 1 ) {
                        firstDiv.removeClass( 'disabled' );
                        syncPropState( firstDiv, value );
                    }
                } else {
                    ele.prop( 'disabled', true );
                    ele.addClass( 'disabled' );
                    if( ele.attr( 'extended-tooltip' ) ) {
                        ele.addClass( 'aw-enableWhen-tooltip' );
                        ele.mouseenter( clickHandler ).mouseleave( clickHandler ).click( clickHandler );
                    }

                    if( firstDiv.length === 1 ) {
                        firstDiv.addClass( 'disabled' );
                        syncPropState( firstDiv, value );
                    }
                }
                disableTabForFocusableElements( value );
            } );

            // to remove keyboard focus, tabindex must be set to -1 to prevent focusing the disabled element using "tab" key
            scope.$watch( function() {
                return element.find( enabledElem ).length;
            }, function() {
                //Rectified implementation. earlier a att.enableWhen was passed as argument,
                //which was always evaluated as a defined string
                //and disableTabForFocusableElements always introduced tabindex=0
                scope.$evalAsync( att.enableWhen, function( value ) {
                    disableTabForFocusableElements( value );
                } );
            } );
        }
    };
} );
