// Copyright (c) 2020 Siemens

/* eslint-disable no-extend-native */

/**
 * This module provides a centralized polyfill support for commonly used APIs in JavaScript that aren't available in all
 * browsers (i.e. IE11).
 * <P>
 * Note: This modules does not create an injectable service.
 *
 * @module js/aw_polyfill
 */

/**
 * Augment the String prototype to add a format method "{0} is dead, but {1} is alive {0} {2}".format("Java",
 * "JavaScript") results in Java is dead, but JavaScript is alive. Java {2}
 */
if( !String.prototype.format ) {
    Object.defineProperty( String.prototype, 'format', {
        value: function() {
            var args = arguments;
            return this.replace( /{(\d+)}/g, function( match, number ) {
                return typeof args[ number ] !== 'undefined' ? args[ number ] : match;
            } );
        }
    } );
}

if( !( 'remove' in Element.prototype ) ) {
    Element.prototype.remove = function() {
        if( this.parentNode ) {
            this.parentNode.removeChild( this );
        }
    };
}

//Polyfill from https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
if( !Element.prototype.matches ) {
    Element.prototype.matches =
        Element.prototype.msMatchesSelector ||
        Element.prototype.webkitMatchesSelector;
}

if( !Element.prototype.closest ) {
    Element.prototype.closest = function( s ) {
        // eslint-disable-next-line consistent-this
        var el = this;

        do {
            if( Element.prototype.matches.call( el, s ) ) { return el; }
            el = el.parentElement || el.parentNode;
        } while( el !== null && el.nodeType === 1 );
        return null;
    };
}
