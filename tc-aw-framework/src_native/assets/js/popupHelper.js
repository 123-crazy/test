/* eslint-disable require-jsdoc */
// Copyright (c) 2020 Siemens

/**
 * This module defines helpful shared APIs and constants used throughout the popup code base.
 *
 * @module js/popupHelper
 */
import domUtils from 'js/domUtils';
import _ from 'lodash';
var dom = domUtils.DOMAPIs;

/**
 * get the element
 *
 * @param {Element | String} element - can be an Element, or query string
 * @returns {Element} element
 */
let getElement = function( element ) {
    if( _.isString( element ) ) {
        element = dom.get( element );
    }
    return element;
};

function checkIgnore( options, sourceEl ) {
    var set = options.ignoreClicksFrom || [];
    if( options.ignoreClicksFrom ) {
        // force convert to array
        set = [].concat( set );
    }

    if( options.ignoreReferenceClick && options.reference ) {
        set.push( options.reference );
    }

    var found = set.find( ( item ) => {
        let element = getElement( item );
        if( element &&
            ( element === sourceEl || element.contains( sourceEl ) )
        ) {
            return true;
        }
        return false;
    } );

    return Boolean( found );
}

export {
    getElement,
    checkIgnore
};
