// Copyright (c) 2020 Siemens

/**
 * This service is for utility functions that we want available, but don't make sense as part of the other property
 * render JS files
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/uwUtilService
 */
import app from 'app';
import $ from 'jquery';
import browserUtils from 'js/browserUtils';

/**
 * The ammount the input box is allowed to move to the left/right before the UI popup (e.g. calendar, LOV ) is
 * collapsed/hidden.
 */
var _MAX_X = 45;

/**
 * The about the input box is allowed to move to the up/down before the UI popup (e.g. calendar, LOV ) is
 * collapsed/hidden.
 */
var _MAX_Y = 40;

var exports = {};

/**
 * Determines if element has scrollBar by comparing the scrollHeight with clientHeight
 *
 * @param {JqueryElement} element - The JQuery element to test
 * @returns {Boolean} 'true' if scrollBar is present
 */
export let hasScrollBar = function( element ) {
    if( element && element.get( 0 ) ) {
        // removing 10 pixels from scrollHeight and comparing because in IE even when there is
        // no scroll bar it shows couple of pixels difference between scrollHeight and clientHeight.
        return element.get( 0 ).scrollHeight - 10 > element.get( 0 ).clientHeight;
    }
    return false;
};

/**
 * TODO
 *
 * @param {Object} scope - TODO
 * @param {Object} $element - TODO
 * @param {String} scrollNamespace - TODO
 * @param {Function} cb - TODO
 */
export let handleScroll = function( scope, $element, scrollNamespace, cb ) {
    // Check for mobile OS
    if( !browserUtils.isMobileOS ) {
        // Get the closest scroll panel
        scope.$scrollPanel = $element.closest( '.ui-grid-viewport, .aw-base-scrollPanel' );

        // When scroll element is found and it doesn't have scrollBar, then traverse through the DOM until
        // '.aw-layout-panelMain' and see if there are any scroll elements who has scrollBar
        if( scope.$scrollPanel && !exports.hasScrollBar( scope.$scrollPanel ) ) {
            var scrollElement = scope.$scrollPanel.parentsUntil( $( '.aw-layout-panelMain' ),
                '.aw-base-scrollPanel' ).filter( function() {
                return exports.hasScrollBar( $( this ) ); // eslint-disable-line no-invalid-this
            } );

            if( scrollElement.hasClass( 'aw-base-scrollPanel' ) ) {
                scope.$scrollPanel = scrollElement;
            }
        }

        // Add scroll listener only when scroll bar is present for the element
        if( scope.$scrollPanel && exports.hasScrollBar( scope.$scrollPanel ) ) {
            var oldX = scope.$scrollPanel.scrollTop();
            var oldY = scope.$scrollPanel.scrollLeft();

            var eventName = 'scroll.' + scrollNamespace;

            scope.$scrollPanel.on( eventName, function() {
                if( scope.$scrollPanel ) {
                    var curX = scope.$scrollPanel.scrollTop();
                    var curY = scope.$scrollPanel.scrollLeft();

                    if( Math.abs( oldX - curX ) > _MAX_X || Math.abs( oldY - curY ) > _MAX_Y ) {
                        oldX = curX;
                        oldY = curY;
                        cb();
                    }
                }
            } );
        }
    }
};

/**
 * Evaluate the correct identifier of an object
 * preference in the decreasing order alternateID , id , uid
 *
 * @param {OBJECT} objectToEvaluate - the object for which the identifier is to be evaluated - can be a ViewModelObject, ViewModelTreeNode or a plain JS Object
 * @return {String } unique identifier on this object if an object is passed or else return the input passed
 */

export let getEvaluatedId = function( objectToEvaluate ) {
    if( objectToEvaluate && typeof objectToEvaluate === 'object' ) {
        if( objectToEvaluate.alternateID !== null && objectToEvaluate.alternateID !== undefined ) {
            return objectToEvaluate.alternateID;
        }
        if( objectToEvaluate.id !== null && objectToEvaluate.id !== undefined ) {
            return objectToEvaluate.id;
        }
        if( objectToEvaluate.uid !== null && objectToEvaluate.uid !== undefined ) {
            return objectToEvaluate.uid;
        }
    }
    return objectToEvaluate;
};

/**
 * Check whether the given value is a valid number
 *
 * @return TRUE if input value is valid number
 */
export let isValidNumber = function( value ) {
    if( value !== null && value !== undefined && isFinite( value ) ) {
        return true;
    }
    return false;
};

/**
 * Check whether the given element exists
 *
 * @return TRUE if element exists
 */
export let ifElementExists = function( element ) {
    if( element && element.length ) {
        return true;
    }
    return false;
};

/**
 * Check to see if the event is a result of a click in the element referenced in the query string
 *
 * There is no single way to determine what the target is, rather it varies based on the browser
 *
 * @param {Event} blurEvent - The blur event
 * @param {String} queryString - jQuery string to identify the element we're checking as the potential target
 *
 * @return TRUE if the query string finds an element that matches in the click target, FALSE otherwise
 */
export let isBlurTarget = function( blurEvent, queryString ) {
    var isTarget = $( blurEvent.relatedTarget ).closest( queryString ).length > 0; // Chrome Check

    if( !isTarget && blurEvent.originalEvent && blurEvent.originalEvent.explicitOriginalTarget ) {
        isTarget = $( blurEvent.originalEvent.explicitOriginalTarget ).closest( queryString ).length > 0; // Firefox Check
    }

    if( !isTarget ) {
        isTarget = $( document.activeElement ).closest( queryString ).length > 0; // IE11
    }
    return isTarget;
};

exports = {
    hasScrollBar,
    handleScroll,
    isValidNumber,
    getEvaluatedId,
    ifElementExists,
    isBlurTarget
};
export default exports;
/**
 * Utility functions that we want to be available, but don't make sense as part of the other property render JS
 * files.
 *
 * @memberof NgServices
 * @member uwUtilService
 */
app.factory( 'uwUtilService', () => exports );
