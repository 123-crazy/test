// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/VideoReader
 */

'use strict';
//==================================================
// private variables
//==================================================
var container = null;
var videoElement = null;
var videoDiv = null;
var onLoad = null;
var onProgress = null;

//==================================================
// export functions
//==================================================
/**
 * Initialize this module
 *
 * @param {Element} viewerContainer - The viewer container
 */
export function init( viewerContainer ) {
    var doc = viewerContainer.ownerDocument;
    container = viewerContainer;

    if( container.children.videoElement && container.children.videoDiv ) {
        videoElement = container.children.videoElement;
        videoDiv = container.children.videoDiv;
    } else {
        videoElement = doc.createElement( 'video' );
        videoDiv = doc.createElement( 'div' );

        container.appendChild( videoDiv );
        videoDiv.appendChild( videoElement );
        videoDiv.setAttribute( 'style', 'display:none;' );

        videoElement.setAttribute( 'controls', 'true' );
        videoElement.addEventListener( 'progress', videoProgress, false );
        videoElement.addEventListener( 'canplaythrough', videoLoaded, false );
    }
}

/**
 * Load video from the given url
 *
 * @param {String} url - the url
 */
export function load( url ) {
    videoElement.setAttribute( 'src', url );
}

/**
 * Set the on progress callback
 *
 * @param {Function} callback - the function to be called on progress
 */
export function setOnProgress( callback ) {
    onProgress = callback;
}

/**
 * Set the onload callback
 *
 * @param {Function} callback - the function to be called after load
 */
export function setOnLoad( callback ) {
    onLoad = callback;
}

// Private functions
/**
 * The video progress event handler
 *
 * @param {Event} e - the event
 */
function videoProgress( e ) {
    if( onProgress ) {
        if( videoElement.buffered.length > 0 && videoElement.duration > 0 ) {
            onProgress( videoElement.buffered.end(0) / videoElement.duration );
        } else if( e.timeStamp ) {
            onProgress( e.timeStamp % 1000000 / 1000000 );
        }
    }
}

/**
 * Video loaded
 */
function videoLoaded() {
    videoElement.image = videoElement;
    if( onLoad ) {
        onLoad( videoElement );
    }
}

let exports;
export default exports = {
    init,
    load,
    setOnProgress,
    setOnLoad
};
