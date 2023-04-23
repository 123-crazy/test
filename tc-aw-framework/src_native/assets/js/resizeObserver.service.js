// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.resizeObserverService} which manages element callbacks and resize observe/unobserve.
 *
 * @module js/resizeObserver.service
 */

/**
 * Resize observer service to manage element callbacks.
 */
let exports = {};

 // members
 let _observerInstance = null;
 let _entryMap = new Map();

/**
 * A helper service which allows performing custom actions when native DOM elements are resized.
 *
 *    const resizableElement = $element[ 0 ]; //The DOM element to observe
 *
 *    const observer = awResizeObserverService.observe( resizableElement, entry => {
 *      console.log( 'The element has been resized in DOM.' );
 *      console.log( entry.target ); // -> resizableElement
 *      console.log( entry.contentRect.width ); // -> e.g. '230px'
 *    } );
 *
 * By default, it uses the [native DOM resize observer](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
 * under the hood. It does not support any polyfills for the browsers that don't support resize observer.
 */

/**
 * Returns if this browser supports resize observer API
 */
export let supportsResizeObserver = ( ) => {
    return typeof window.ResizeObserver === 'function';
};

/**
 * Creates the single native observer shared across all `ResizeObserver` instances.
 *
 */
let initializeResizeObserver = () => {
    if( !_observerInstance && supportsResizeObserver() ) {
        _observerInstance = new ResizeObserver( entries => {
            entries.forEach( entry => {
                if( _entryMap.has( entry.target ) ) {
                    _entryMap.get( entry.target )( entry );
                }
            } );
        } );
    }
};

/**
 * Registers a new resize callback for the DOM element.
 *
 * @param {HTMLElement} element
 * @param {Function} callback
 */
export let observe = ( element, callback ) => {
    _entryMap.set( element, callback );
    initializeResizeObserver();
    _observerInstance.observe( element );

  /**
   * Destroys the observer which disables the `callback` passed to the observe method.
   */
    return () => {
        _observerInstance.unobserve( element );
        _entryMap.delete( element );
    };
};

exports = {
    observe,
    supportsResizeObserver
};

export default exports;
