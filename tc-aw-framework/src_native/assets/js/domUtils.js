/* eslint-disable require-jsdoc */
// Copyright (c) 2020 Siemens

/**
 * This module defines shared APIs to substitute jquery.<P>
 * Ref: http://youmightnotneedjquery.com/
 *
 * Note: This modules does not create an injectable service.
 *
 * @module js/domUtils
 */
import _ from 'lodash';

var exports = {};

var reUnit = /width|height|top|left|right|bottom|margin|padding/i;

var DOMAPIs = {
    get: function( selector, parent ) {
        var root = parent || document;
        return root.querySelector( selector );
    },
    getAll: function( selector, parent ) {
        var root = parent || document;
        return root.querySelectorAll( selector ) || [];
    },
    closest: function( el, selector ) {
        if( !el || !( el instanceof Node ) ) { return null; }
        const matchesSelector = this._getMatchesSelector( el );
        while( el ) {
            if( matchesSelector.call( el, selector ) ) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    },
    parentsUntil: function( el, selector, filter ) {
        const result = [];
        const matchesSelector = this._getMatchesSelector( el );
        // match start from parent
        el = el.parentElement;
        while( el && !matchesSelector.call( el, selector ) ) {
            if( !filter ) {
                result.push( el );
            } else {
                if( matchesSelector.call( el, filter ) ) {
                    result.push( el );
                }
            }
            el = el.parentElement;
        }
        return result;
    },
    // el can be an Element, NodeList or selector
    addClass: function( el, className ) {
        if( typeof el === 'string' ) { el = this.getAll( el ); }
        var els = el instanceof NodeList ? [].slice.call( el ) : [ el ];

        els.forEach( e => {
            if( this.hasClass( e, className ) ) { return; }

            if( e.classList ) {
                e.classList.add( className );
            } else {
                e.className += ' ' + className;
            }
        } );
    },

    // el can be an Element, NodeList or selector
    removeClass: function( el, className ) {
        if( typeof el === 'string' ) { el = this.getAll( el ); }
        var els = el instanceof NodeList ? [].slice.call( el ) : [ el ];

        els.forEach( e => {
            if( this.hasClass( e, className ) ) {
                if( e.classList ) {
                    e.classList.remove( className );
                } else {
                    e.className = e.className.replace( new RegExp( '(^|\\b)' + className.split( ' ' ).join( '|' ) + '(\\b|$)', 'gi' ), ' ' );
                }
            }
        } );
    },

    // el can be an Element or selector
    hasClass: function( el, className ) {
        if( typeof el === 'string' ) { el = this.get( el ); }
        if( el.classList ) {
            return el.classList.contains( className );
        }
        return new RegExp( '(^| )' + className + '( |$)', 'gi' ).test( el.className );
    },

    // el can be an Element or selector
    toggleClass: function( el, className ) {
        if( typeof el === 'string' ) { el = this.get( el ); }
        const flag = this.hasClass( el, className );
        if( flag ) {
            this.removeClass( el, className );
        } else {
            this.addClass( el, className );
        }
        return flag;
    },
    // el can be an Element, NodeList or query string
    remove: function( el ) {
        if( typeof el === 'string' ) {
            [].forEach.call( this.getAll( el ), node => {
                node.parentNode.removeChild( node );
            } );
        } else if( el.parentNode ) {
            // it's an Element
            el.parentNode.removeChild( el );
        } else if( _.isArrayLike( el ) ) {
            // it's an array of elements
            [].forEach.call( el, node => {
                node.parentNode.removeChild( node );
            } );
        }
    },
    append: function( el, parent ) {
        if( typeof el === 'string' ) {
            [].forEach.call( this.getAll( el ), node => {
                ( parent || node.parentNode ).appendChild( node );
            } );
        } else if( el.parentNode ) {
            ( parent || el.parentNode ).appendChild( el );
        } else if( el instanceof Node ) {
            parent.appendChild( el );
        } else if( el instanceof NodeList ) {
            [].forEach.call( el, node => {
                ( parent || node.parentNode ).appendChild( node );
            } );
        }
    },
    getComputedStyles: function( el ) {
        return el.ownerDocument.defaultView.getComputedStyle( el, null );
    },
    getOffset: function( el ) {
        const html = el.ownerDocument.documentElement;
        let box = { top: 0, left: 0 };
        // If we don't have gBCR, just use 0,0 rather than error
        // BlackBerry 5, iOS 3 (original iPhone)
        if( typeof el.getBoundingClientRect !== 'undefined' ) {
            box = el.getBoundingClientRect();
        }
        return {
            top: box.top + window.pageYOffset - html.clientTop,
            left: box.left + window.pageXOffset - html.clientLeft
        };
    },
    getPosition: function( el ) {
        if( !el ) {
            return {
                left: 0,
                top: 0
            };
        }
        return {
            left: el.offsetLeft,
            top: el.offsetTop
        };
    },
    setStyle: function( node, att, val, style ) {
        style = style || node.style;
        if( style ) {
            if( val === null || val === '' ) { // normalize unsetting
                val = '';
            } else if( !isNaN( Number( val ) ) && reUnit.test( att ) ) { // number values may need a unit
                val += 'px';
            }
            if( att === '' ) {
                att = 'cssText';
                val = '';
            }
            style[ att ] = val;
        }
    },
    clearStyles: function( el ) {
        el.setAttribute( 'style', '' );
    },
    setStyles: function( el, hash, clearExisting = false ) {
        clearExisting && this.clearStyles( el );

        const HAS_CSSTEXT_FEATURE = typeof el.style.cssText !== 'undefined';

        function trim( str ) {
            return str.replace( /^\s+|\s+$/g, '' );
        }
        let originStyleText;
        const originStyleObj = {};
        if( HAS_CSSTEXT_FEATURE ) {
            originStyleText = el.style.cssText;
        } else {
            originStyleText = el.getAttribute( 'style' );
        }
        originStyleText.split( ';' ).forEach( item => {
            if( item.indexOf( ':' ) !== -1 ) {
                const obj = item.split( ':' );
                originStyleObj[ trim( obj[ 0 ] ) ] = trim( obj[ 1 ] );
            }
        } );
        const styleObj = {};
        Object.keys( hash ).forEach( item => {
            this.setStyle( el, item, hash[ item ], styleObj );
        } );
        const mergedStyleObj = Object.assign( {}, originStyleObj, styleObj );
        const styleText = Object.keys( mergedStyleObj )
            .map( item => item + ': ' + mergedStyleObj[ item ] + ';' )
            .join( ' ' );
        if( HAS_CSSTEXT_FEATURE ) {
            el.style.cssText = styleText;
        } else {
            el.setAttribute( 'style', styleText );
        }
    },
    getStyle: function( el, att, style ) {
        style = style || el.style;
        let val = '';
        if( style ) {
            val = style[ att ];
            if( val === '' ) {
                val = this.getComputedStyle( el, att );
            }
        }
        return val;
    },
    getComputedStyle: function( el, att ) {
        const win = el.ownerDocument.defaultView;
        // null means not return presudo styles
        const computed = win.getComputedStyle( el, null );
        return att ? computed[ att ] : computed;
    },
    uniqueId: ( function() {
        var uuid = 0;
        return function( el ) {
            if( !el.id ) {
                uuid++;
                el.id = 'ui-id-' + uuid;
            }
        };
    } )(),
    removeUniqueId: function( el ) {
        if( /^ui-id-\d+$/.test( el.id ) ) {
            el.removeAttribute( 'id' );
        }
    },
    _getMatchesSelector: function( el ) {
        return el.matches ||
            el.webkitMatchesSelector ||
            el.mozMatchesSelector ||
            el.msMatchesSelector ||
            function( s ) {
                const matches = el.ownerDocument.querySelectorAll( s );
                let idx = matches.length - 1;
                while ( idx >= 0 && matches.item( idx ) !== el ) {  idx--; }
                return idx > -1;
            };
    },
    match: function( el, selector ) {
        return this._getMatchesSelector( el ).call( el, selector );
    },
    on: function( el, eventNames, fn ) {
        eventNames.split( /\s+|,/ ).forEach( item => {
            el.addEventListener( item.trim(), fn );
        } );
        return this;
    },
    off: function( el, eventNames, fn ) {
        eventNames.split( /\s+|,/ ).forEach( item => {
            el.removeEventListener( item.trim(), fn );
        } );
        return this;
    },
    setAttribute: function( el, attr, value ) {
        var els = el instanceof NodeList ? [].slice.call( el ) : [ el ];
        els.forEach( e => { e.setAttribute( attr, value ); } );
    },
    removeAttribute: function( el, attr ) {
        var els = el instanceof NodeList ? [].slice.call( el ) : [ el ];
        els.forEach( e => { e.removeAttribute( attr ); } );
    },
    getParent: function( el, level = 1 ) {
        if( !el ) { return null; }
        let result = [];
        let els = el instanceof NodeList ? [].slice.call( el ) : [ el ];
        let path = '.parentNode'.repeat( Math.max( level, 1 ) ).replace( /^\./, '' );
        els.forEach( e => { result.push( _.get( e, path ) ); } );
        return result;
    },
    inDOM: function( node ) { return node.mock || document.body.contains( node ) && getComputedStyle( node ).display !== 'none'; }
};

export { DOMAPIs as DOMAPIs };

exports = {
    DOMAPIs
};
export default exports;
