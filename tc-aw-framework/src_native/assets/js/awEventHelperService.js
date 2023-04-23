// Copyright (c) 2020 Siemens

/**
 * This module provides event building support
 *
 * @module js/awEventHelperService
 */

import _ from 'lodash';
import browserUtils from 'js/browserUtils';

let exports = {};

/**
 * 
 * @param {Object} targetObject - Map for object default and mobile counterpart
 * @param {Object} eventObject - Map for event type to mobile counterpart for all mouseevents click, mousedown, mouseup, etc. 
 * @param {Function} eventHandler - handler function, takes event as single argument 
 */
export let subscribeMouseEvent = function( targetObject, eventObject, eventHandler ) {
    _.forEach( Object.keys( eventObject ), ( eventName ) => {
        /* Register the event type -> eventHandler */
        if( targetObject.default.on ) {
            // if jQuery object
            targetObject.default.on( eventName, eventHandler );
        } else {
            // if Element
            targetObject.default.addEventListener( eventName, eventHandler );
        }
        /* If mobile device, make sure the mobile event is bound to desktop event so we catch what we are listening to in mobile */
        if( browserUtils.isMobileOS && targetObject.mobile ) {
            var mobileBlurLock = false;
            var mobileHandler = function( mobileEvent ) {
                if( !mobileBlurLock ) {
                    mobileEvent.preventDefault();
                    var mouseEvent = document.createEvent( 'MouseEvent' );
                    mouseEvent.initMouseEvent( eventName, true, false, window,
                        1, mobileEvent.screenX, mobileEvent.screenY, mobileEvent.clientX, mobileEvent.clientY,
                        mobileEvent.ctrlKey, mobileEvent.altKey, mobileEvent.shiftKey, mobileEvent.metaKey,
                        1, null );
                    mobileEvent.target.dispatchEvent( mouseEvent );
                }
                mobileBlurLock = false;
            };
            /* If user moves while touch or cancels event, cancel the mobile -> default click dispatch for later */
            _.forEach( [ 'touchmove', 'touchcancel' ], function( blurEvent ) {
                targetObject.mobile[ `on${blurEvent}` ] = function() {
                    mobileBlurLock = true;
                };
            } );
            targetObject.mobile[ `on${eventObject[ eventName ]}` ] = mobileHandler;
        }
    } );
};

exports = {
    subscribeMouseEvent
};
export default exports;
