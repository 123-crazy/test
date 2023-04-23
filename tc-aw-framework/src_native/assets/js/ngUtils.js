// Copyright (c) 2020 Siemens
/* eslint-env es6 */

import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import logger from 'js/logger';
import AwCompileService from 'js/awCompileService';

/**
 * This module provides reusable functions related to handling AngujarJS operations.
 *
 * @module js/ngUtils
 */

let exports;

/**
 * This function simulates the 'ng-include' directive and allows DOM elements created outside the AngularJS system
 * to be 'compiled' and hooked up into that system.
 *
 * @param {Element} parentElement - The DOM element above the 'ctrlElement' where the parent scope can be gotten
 *            from.
 *
 * @param {Element} ctrlElement - The DOM element containing the HTML tags defining a 'controller' to be 'compiled'
 *            into the AngularJS system.
 *
 * @param {Object} appCtxSvc - The application context service. Required for processing Declarative view returned
 *            from getDeclarativeStyleSheets SOA.
 *
 * @param {DeclViewModel} declViewModel - The object to set as the 'data' property on the controller's '$scope'.
 *
 * @param {Object} scopeData - Arbitrary object to be set as the primary '$scope' (i.e. 'context') of the new
 *            AngularJS controller.
 *
 * @return {Controller} Reference to the new AngularJS controller function that was created/compiled and set onto
 *         the given 'ctrlElement'.
 */
export let include = function( parentElement, ctrlElement, appCtxSvc, declViewModel, scopeData ) {
    var compiledHTMLs = exports.compile( parentElement, ctrlElement, appCtxSvc, declViewModel, scopeData );
    if( compiledHTMLs ) {
        return compiledHTMLs.controller();
    }
    return null;
};

/**
 * This function compiles an angularJS Template to HTML DOMElement, allows us to insert an angularJS Template into
 * non-angularJS Widget.
 *
 * @param {Element} parentElement - The DOM element above the 'ctrlElement' where the parent scope can be gotten
 *            from.
 *
 * @param {Element} ctrlElement - The DOM element containing the HTML tags defining a 'controller' to be 'compiled'
 *            into the AngularJS system.
 *
 * @param {Object} appCtxSvc - The application context service. Required for processing Declarative view returned
 *            from getDeclarativeStyleSheets SOA.
 *
 * @param {DeclViewModel} declViewModel - The object to set as the 'data' property on the controller's '$scope'.
 *
 * @param {Object} scopeData - Arbitrary object to be set as the primary '$scope' (i.e. 'context') of the new
 *            AngularJS controller.
 *
 * @return {Object} Compile result to specific angularJS Template.
 */
export let compile = function( parentElement, ctrlElement, appCtxSvc, declViewModel, scopeData ) {
    try {
        var docNgElement = ngModule.element( document.body );
        var parentNgElement = ngModule.element( parentElement );
        var contrNgElement = ngModule.element( ctrlElement );

        var parentScope = parentNgElement.scope();

        /**
         * Check if the parent scope does not exists OR it is the 'root' scope.<BR>
         * If so: Create a new child scope based on the document's scope.
         * <P>
         * Note: This can occur when the parentElement is part of a DOM tree that is not yet attached into the
         * document (i.e. it is still being built). Currently, when this happens there seems to a node with the
         * class 'locationPanel' at the top of the fragment. A new child scope of the document scope will be added
         * to this 'locationPanel' and used as the parent scope for the ctrlElement.
         * <P>
         * Note: We do not want to use the 'root' scope for inserting new elements into since it hass been shown to
         * not be the one the API is eventually added to (it will be a child of it anyway).
         */
        if( !parentScope || parentScope.$id === 1 ) {
            var docScope = docNgElement.scope();
            if( docScope ) {
                parentScope = docScope.$new();
                $( '.locationPanel' ).data( '$scope', parentScope );
            }
        }

        if( parentScope ) {
            var ctrlScope = parentScope.$new();
            $( ctrlElement ).data( '$scope', ctrlScope );
        }

        var compileFn = AwCompileService.instance;
        if( compileFn ) {
            var compiledFn = compileFn( contrNgElement );

            ctrlScope = contrNgElement.scope();

            if( scopeData ) {
                _.forEach( scopeData, function( propValue, propName ) {
                    ctrlScope[ propName ] = propValue;
                } );
            }

            // "scope.ctx" is required to process Declarative view returned from getDeclarativeStyleSheets SOA
            if( appCtxSvc ) {
                ctrlScope.ctx = appCtxSvc.ctx;
            }

            if( declViewModel ) {
                ctrlScope.data = declViewModel;
            }

            if( ctrlScope && compiledFn ) {
                compiledFn( ctrlScope );

                return contrNgElement;
            }
        }
    } catch ( e ) {
        logger.error( e );
    }

    return null;
};

/**
 * Locate the closest parent element
 * http://stackoverflow.com/a/24107550/888165
 *
 * @param {DOMElement} element element to start search
 *
 * @param {String} selector css selector to use in locating closest element
 *
 * @param {Int} maxLevelsUp the maximum levels up to search
 *
 * @returns {DOMElement} the closest parent element
 */
export let closestElement = function( element, selector, maxLevelsUp ) {
    if( element && typeof element.length !== 'undefined' && element.length ) {
        element = element[ 0 ];
    }

    var matchesFn;

    // find vendor prefix
    [ 'matches', 'webkitMatchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector' ].some( function( fn ) {
        if( typeof document.body[ fn ] === 'function' ) {
            matchesFn = fn;
            return true;
        }
        return false;
    } );

    // traverse parents
    var parent;
    var currLevelUp = 1;
    while( element ) {
        if( maxLevelsUp !== undefined && currLevelUp > maxLevelsUp ) {
            return null;
        }

        parent = element.parentElement;
        if( parent && parent[ matchesFn ]( selector ) ) {
            return parent;
        }
        element = parent;
        currLevelUp++;
    }

    return null;
};

/**
 * Get AngularJS Scope Variable for Element compiled from AngularJS Template
 *
 * @param {DOMElement} element - DOMElement which is compiled from AngularJS Template.
 *
 * @param {Boolean} isIsolated - if true returns isolate scope.
 *
 * @return {Object} Scope object for specific AngularJS Element
 */
export let getElementScope = function( element, isIsolated ) {
    return isIsolated ? exports.element( element ).isolateScope() : exports.element( element ).scope();
};

/**
 * Destroys and removes the passed in angularJS DOMElement
 *
 * @param {DOMElement} element - DOMElement that has an angular scope
 */
export let destroyNgElement = function( element ) {
    var scope = exports.getElementScope( element );
    var parentElement = element.parentElement;
    if( parentElement ) {
        parentElement.removeChild( element );
    }
    if( scope !== undefined ) {
        scope.$destroy();
    }
};

/**
 * Destroys and removes the passed in angularJS DOMElements based under input DOM Element
 *
 * @param {DOMElement} element - DOMElement that has anuglarJS DOM Elements as child elements
 * @param {String} className - class name to locate compiled elements
 */
export let destroyChildNgElements = function( element, className ) {
    var compiledElements = element.getElementsByClassName( className );
    for( var i = compiledElements.length; i > 0; i-- ) {
        var elem = compiledElements[ i - 1 ];
        exports.destroyNgElement( elem );
    }
};

/**
 * This function returns angularJS Element from HTML String. A simple wrapper to angular.element
 * TODO: Can we try to not pass in
 *
 * @param {DOMElement} htmlContent - The Dependend JS File
 *
 * @return {Object} AngularJS Element object.
 */
export let element = function( htmlContent ) {
    return ngModule.element( htmlContent );
};

exports = {
    include,
    compile,
    closestElement,
    getElementScope,
    destroyNgElement,
    destroyChildNgElements,
    element
};
export default exports;
