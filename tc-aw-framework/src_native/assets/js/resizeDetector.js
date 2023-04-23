// Copyright (c) 2020 Siemens

/**
 * @module js/resizeDetector
 */
import browserUtils from 'js/browserUtils';

// the timeout for element resize polling, only used for Firefox
const RESIZE_POLLING_TIMEOUT = 60000;


let checkResize = ( element, oldSize, cb = null )=>{
    return ( event = null )=>{
        let sizeChanged = false;
        let width = element.offsetWidth;
        let height = element.offsetHeight;
        if( width !== oldSize.width || height !== oldSize.height ) {
            cb && cb( element, event );
            oldSize = { width, height };
            sizeChanged = true;
        }
        return sizeChanged;
    };
};

/**
 * Register resize detector on given element, the callback function will be called on element resized
 * @param {Element} el the element to detect size change
 * @param {Function} cb the callback function when size changed
 * @returns {Function} the cancel function to remove resize detector
 */
let resizeDetector = ( el, cb ) => {
    // create iframe element and insert to the element detect the target element size change
    var iframe = document.createElement( 'iframe' );
    //wcag accessibility compliance for iframe.
    iframe.setAttribute( 'aria-hidden', 'true' );
    iframe.setAttribute( 'title', ' ' );

    iframe.setAttribute( 'class', 'aw-popup-resize-detector' );
    el.appendChild( iframe );

    // record size of current element
    let oldSize = { width:el.offsetWidth, height: el.offsetHeight };
    let detector = checkResize( el, oldSize, cb );

    let noResizeTimeStart = Date.now();
    // as Firefox, IE doesn't support iframe resize event well, so use polling to detect size change
    let resizeTimer;
    if( browserUtils.isFirefox || browserUtils.isIE ) {
        resizeTimer = setInterval( () => {
            if( detector() ) {
                noResizeTimeStart = Date.now();
            } else {
                let noResizeTime = Date.now() - noResizeTimeStart;
                noResizeTime > RESIZE_POLLING_TIMEOUT && clearInterval( resizeTimer );
            }
        }, 50 );
    } else {
        iframe.contentWindow.onresize = detector;
    }

    // return the cancel function to remove size detector
    return () => {
        if( browserUtils.isFirefox || browserUtils.isIE ) {
            clearInterval( resizeTimer );
        } else {
            if ( iframe.contentWindow ) { iframe.contentWindow.onresize = null; }
        }
    };
};

export {
    checkResize,
    resizeDetector
};

export default resizeDetector;
