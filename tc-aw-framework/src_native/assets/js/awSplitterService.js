// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * @module js/awSplitterService
 */

// module
import app from 'app';
import eventBus from 'js/eventBus';
import localStorage from 'js/localStorage';
import logger from 'js/logger';
import _ from 'lodash';
import AwRootScopeService from 'js/awRootScopeService';
import analyticsSvc from 'js/analyticsService';
import appCtxService from 'js/appCtxService';

let exports;

export const constants = {
    gridSystemSize: 12,
    minSize1: 20,
    minSize2: 20
};

// A structure set when a splitter is activated (only one splitter an be active at any time)
// See exports.mouseDownEvent for structure definition
export let activeSplitterData = null;

// Tell the world the areas have changed size through a debounce function.
// The digest cycle is necessary to let the left/right side elements to resize themselves.
let publishNotification = _.debounce( function( splitterData, area1, area2 ) {
    let rootScope = AwRootScopeService.instance;
    eventBus.publish( 'aw-splitter-update', {
        splitter: splitterData.splitter,
        area1: area1,
        area2: area2
    } );
    rootScope.$evalAsync();
}, 1000, {
    maxWait: 20000,
    trailing: true,
    leading: false
} );

/**
 * Initialize a Given Splitter
 *
 * Set the onmousedown event for the splitter and establishes the type of splitter
 *
 * @param {object} scopeElements - The angularJS scope elements used to define the splitter
 * @param {object} attributes - The angularJS scope attributes defined on the splitter
 */
export let initSplitter = function( scopeElements, attributes ) {
    var ctx = appCtxService.ctx;
    var initialSplitterState;
    var splitter = scopeElements[ 0 ];

    var area1 = splitter.previousElementSibling;
    var area2 = splitter.nextElementSibling;

    // If user defines a direction use that. If not, check for row/column on each side. Else default to vertical
    if( attributes.direction ) {
        if( attributes.direction.toUpperCase() === 'HORIZONTAL' ) {
            splitter.style.cursor = 'row-resize';
        } else if( attributes.direction.toUpperCase() === 'VERTICAL' ) {
            splitter.style.cursor = 'col-resize';
        }
    } else if( area1 && area2 ) {
        var classList1 = area1.classList;
        var classList2 = area2.classList;
        if( ( classList1.contains( 'aw-layout-row' ) || classList1.contains( 'aw-flex-row' ) ) && ( classList2.contains( 'aw-layout-row' ) || classList2.contains( 'aw-flex-row' ) ) ) {
            splitter.style.cursor = 'row-resize';
        } else if( ( classList1.contains( 'aw-layout-column' ) || classList1.contains( 'aw-flex-column' ) ) &&
            ( classList2.contains( 'aw-layout-column' ) || classList2.contains( 'aw-flex-column' ) ) ) {
            splitter.style.cursor = 'col-resize';
        }
    } else {
        splitter.style.cursor = 'col-resize';
    }

    splitter.onmousedown = exports.mouseDownEvent;
    splitter.ontouchstart = exports.mouseDownEvent;

    // If this is the primary sash, load its previous position for a specific view.
    if( attributes.isprimarysplitter === 'true' ) {
        if( ctx && ctx.ViewModeContext && ctx.ViewModeContext.ViewModeContext ) {
            exports.viewModeContext = ctx.ViewModeContext.ViewModeContext;
        }
        if( localStorage.get( exports.viewModeContext ) ) {
            initialSplitterState = JSON.parse( localStorage.get( exports.viewModeContext ) );

            if( initialSplitterState && area1 && area2 ) {
                area1.style.flexBasis = initialSplitterState.area1Size + 'px';
                area1.style.webkitFlexBasis = initialSplitterState.area1Size + 'px';
                area1.style.flexGrow = '1';
                area1.style.flexShrink = '1';

                area2.style.flexBasis = initialSplitterState.area2Size + 'px';
                area2.style.webkitFlexBasis = initialSplitterState.area2Size + 'px';
            }
        }
    }
};

// Setup mousemove/mouseup event listeners for iframes
let bubbleIframeMouseMove = function( iframe ) {
    var existingOnMouseMove = iframe.contentWindow.onmousemove;

    iframe.contentWindow.onmousemove = function( e ) {
        // Fire any existing onmousemove listener
        if( existingOnMouseMove ) { existingOnMouseMove( e ); }

        var evt = document.createEvent( 'MouseEvents' );

        var boundingClientRect = iframe.getBoundingClientRect();

        evt.initMouseEvent(
            'mousemove',
            true, // true bubbles the event
            false, // not cancelable
            window,
            e.detail,
            e.screenX,
            e.screenY,
            e.clientX + boundingClientRect.left,
            e.clientY + boundingClientRect.top,
            e.ctrlKey,
            e.altKey,
            e.shiftKey,
            e.metaKey,
            e.button,
            null // no related element
        );

        iframe.dispatchEvent( evt );
    };

    iframe.contentWindow.onmouseup = function( e ) {
        var evt = document.createEvent( 'MouseEvents' );

        var boundingClientRect = iframe.getBoundingClientRect();

        evt.initMouseEvent(
            'mouseup',
            true, // true bubbles the event
            false, // not cancelable
            window,
            e.detail,
            e.screenX,
            e.screenY,
            e.clientX + boundingClientRect.left,
            e.clientY + boundingClientRect.top,
            e.ctrlKey,
            e.altKey,
            e.shiftKey,
            e.metaKey,
            e.button,
            null // no related element
        );

        iframe.dispatchEvent( evt );
    };
};

// Removes iframe mouse event listeners
let removebubbleIframeMouseEvent = function( iframe ) {
    iframe.contentWindow.onmousemove = null;
    iframe.contentWindow.onmouseup = null;
};

// handling DOM exception: if we try to access any event(e.g. onmouseup,onmousedown,etc) for cross-origin, we get DOM exception.
let canAccessIFrame = function( iframe ) {
    try {
        return 'onmousemove' in iframe.contentWindow;
    } catch ( err ) {
        return false;
    }
};

/**
 * Mouse Down Event - initialize the active splitter
 *
 * @param {object} event - mouse down event object
 */
export let mouseDownEvent = function( event ) {
    // Do not allow accidental text selection - which will cause the splitter to lockup
    // Note that there are various CSS properties to control this but not a common one yet (as far as I can tell)
    // Look for user-select: none (also ms-user-select and webkit-user-select and moz-user-select)
    // Until there is a common way to prevent accidental selection - here is the workaround
    event = event || window.event;

    if( window.getSelection ) {
        var selection = window.getSelection();
        var node = selection.focusNode;
        if( node !== null ) {
            selection.removeAllRanges();
        }
    } else {
        if( document.selection ) {
            document.selection.empty();
        }
    }

    event.stopPropagation();
    event.preventDefault();

    // Create the active splitter data structure
    var x = event.clientX;
    var y = event.clientY;
    if( !x && !y ) {
        x = event.touches[ 0 ].clientX;
        y = event.touches[ 0 ].clientY;
    }
    var splitter = event.currentTarget;

    var area1 = splitter.previousElementSibling;
    var area2 = splitter.nextElementSibling;

    var minSize1 = parseInt( splitter.getAttribute( 'min-size-1' ) );
    var minSize2 = parseInt( splitter.getAttribute( 'min-size-2' ) );
    var isPrimarySplitter = splitter.getAttribute( 'isprimarysplitter' );

    // If user did not define minimum sizes, default to 20
    if( !minSize1 && !minSize2 ) {
        minSize1 = exports.constants.minSize1;
        minSize2 = exports.constants.minSize2;
    }

    var direction = splitter.style.cursor;

    exports.activeSplitterData = {
        splitter: splitter, // The splitter element
        area1: area1, // The element to the left or on top
        area2: area2, // The element to the right or on bottom
        minSize1: minSize1, // The element to the left or on top minimum length
        minSize2: minSize2, // The element to the right or on bottom minimum length
        direction: direction, // row-resize or column-resize
        isPrimarySplitter: isPrimarySplitter, // If the current splitter is the primary to remember its position
        x: x,
        y: y
    }; // Last mouse position used to update splitter

    // iframes suppress mouse events so the iframe's mouse events need to be bubbled up to the document level
    var iframes = document.getElementsByTagName( 'iframe' );
    for( var i = 0; i < iframes.length; i++ ) {
        if( canAccessIFrame( iframes[ i ] ) ) {
            bubbleIframeMouseMove( iframes[ i ] );
        }
    }

    document.addEventListener( 'mousemove', mouseMoveEventHandler );
    document.addEventListener( 'mouseup', mouseUpEventHandler );

    document.addEventListener( 'touchmove', mouseMoveEventHandler );
    document.addEventListener( 'touchend', mouseUpEventHandler );
    document.addEventListener( 'touchcancel', mouseUpEventHandler );
};

/**
 * Mouse Up Event Handler - stop the active splitter
 *
 * @param {event} event - Event object
 */
export let mouseUpEventHandler = function() {
    document.removeEventListener( 'mousemove', mouseMoveEventHandler );
    document.removeEventListener( 'mouseup', mouseUpEventHandler );

    document.removeEventListener( 'touchmove', mouseMoveEventHandler );
    document.removeEventListener( 'touchend', mouseUpEventHandler );
    document.removeEventListener( 'touchcancel', mouseUpEventHandler );

    // Remove iframe mouse event listeners on mouseup
    var iframes = document.getElementsByTagName( 'iframe' );
    for( var i = 0; i < iframes.length; i++ ) {
        if( canAccessIFrame( iframes[ i ] ) ) {
            removebubbleIframeMouseEvent( iframes[ i ] );
        }
    }

    // Remember the sash's position for the specific view.
    if( exports.activeSplitterData.isPrimarySplitter && exports.viewModeContext ) {
        // After moving the primary splitter, we want the primary workarea to become a flex-item in order to resize on browser width changes.
        exports.activeSplitterData.area1.style.flexGrow = '1';
        exports.activeSplitterData.area1.style.flexShrink = '1';
        var area1Size = exports.activeSplitterData.area1.clientWidth;
        var area2Size = exports.activeSplitterData.area2.clientWidth;
        var data = {
            area1Size: area1Size,
            area2Size: area2Size
        };
        localStorage.publish( exports.viewModeContext, JSON.stringify( data ) );

        // Publish event to log splitter data to analytics
        var splitterEventData = {};
        splitterEventData.sanAnalyticsType = 'Splitter';
        splitterEventData.sanCommandId = 'Splitter';
        splitterEventData.sanCommandTitle = 'Splitter';
        splitterEventData.sanViewMode = exports.viewModeContext;
        splitterEventData.sanPrimaryPercentage = ( area1Size / ( area1Size + area2Size ) * 100 ).toFixed( 2 );
        splitterEventData.sanPixelSize = area1Size;
        analyticsSvc.logNonDeclarativeCommands( splitterEventData );
    }

    exports.activeSplitterData = null;
};

/**
 * Mouse Move Event Handler - update the active splitter
 *
 * @param {event} event - Event object
 */
export let mouseMoveEventHandler = function( event ) {
    event = event || window.event;
    if( exports.activeSplitterData === null ) {
        return;
    }

    event.preventDefault();

    var x = event.clientX;
    var y = event.clientY;
    if( !x && !y ) {
        var touch = event.originalEvent.touches[ 0 ];
        x = touch.clientX;
        y = touch.clientY;
    }

    exports.updateActiveSplitter( x, y );
};

/**
 * Update Active Splitter
 *
 * For a given mouse position update the size of the associated DIV elements for the active splitter.
 *
 * @param {number} xPos - current mouse X position
 * @param {number} yPos - current mouse Y position
 */
export let updateActiveSplitter = function( xPos, yPos ) {
    var splitterData = exports.activeSplitterData;
    if( !splitterData ) {
        return;
    }

    var xDelta = xPos - splitterData.x;
    var yDelta = yPos - splitterData.y;
    if( xDelta === 0 && yDelta === 0 ) {
        return;
    }

    var area1 = splitterData.area1;
    var area2 = splitterData.area2;

    var minSize1 = splitterData.minSize1;
    var minSize2 = splitterData.minSize2;

    var size1 = parseFloat( area1.style.flexGrow );
    var size2 = parseFloat( area2.style.flexGrow );

    var direction = splitterData.direction;

    if( direction === 'row-resize' ) {
        var h1 = area1.clientHeight;
        var h2 = area2.clientHeight;

        if( exports.splitterLimit( h1, h2, yDelta, minSize1, minSize2 ) ) {
            // make max size/min size if we hit the limit, not at the limit yet & not using flex grow
            if( !size1 && !size2 ) {
                if( yDelta > 0 && h2 !== minSize2 ) {
                    exports.updateAreaSize( area1, size1, h1, h2 - minSize2 );
                    exports.updateAreaSize( area2, size2, minSize2, '' );
                } else if( yDelta < 0 && h1 !== minSize1 ) {
                    exports.updateAreaSize( area1, size1, minSize1, '' );
                    exports.updateAreaSize( area2, size2, h2, h1 - minSize1 );
                }
                splitterData.y = splitterData.splitter.getBoundingClientRect().top - 10;
                splitterData.x = xPos;
            }
            return;
        }

        exports.updateAreaSize( area1, size1, h1, yDelta );
        exports.updateAreaSize( area2, size2, h2, -yDelta );
    } else {
        // direction is column-resize
        var w1 = area1.clientWidth;
        var w2 = area2.clientWidth;

        if( exports.splitterLimit( w1, w2, xDelta, minSize1, minSize2 ) ) {
            // make max size/min size if we hit the limit, not at the limit yet & not using flex grow
            if( !size1 && !size2 ) {
                if( xDelta > 0 && w2 !== minSize2 ) {
                    exports.updateAreaSize( area1, size1, w1, w2 - minSize2 );
                    exports.updateAreaSize( area2, size2, minSize2, '' );
                } else if( xDelta < 0 && w1 !== minSize1 ) {
                    exports.updateAreaSize( area1, size1, minSize1, '' );
                    exports.updateAreaSize( area2, size2, w2, w1 - minSize1 );
                }
                splitterData.x = splitterData.splitter.getBoundingClientRect().right - 10;
                splitterData.y = yPos;
            }
            return;
        }

        exports.updateAreaSize( area1, size1, w1, xDelta );
        exports.updateAreaSize( area2, size2, w2, -xDelta );
    }
    splitterData.x = xPos;
    splitterData.y = yPos;
    publishNotification( splitterData, area1, area2 );
};

/**
 * Update Area Size
 *
 * Update the size of a given area based on a delta amount and the type of area (fixed or proportional)
 *
 * @param {object} area - a row or column element
 * @param {number} oldSize - the previous attribute size value for the row or column
 * @param {number} oldSizePx - the previous rendered size in px for the row or column
 * @param {number} deltaPx - the amount to change the area in px
 */
export let updateAreaSize = function( area, oldSize, oldSizePx, deltaPx ) {
    var newSizePx = oldSizePx + deltaPx;
    var gridSystemSize = exports.constants.gridSystemSize;

    var when = area.getAttribute( 'when' );

    // This is a fixed size
    // Note the size is no longer in units of em because the user has set a fix px size
    if( when ) {
        area.style.maxWidth = '100%';
    }
    area.style.flexBasis = newSizePx.toString() + 'px';
    area.style.webkitFlexBasis = newSizePx.toString() + 'px';
};

/**
 * Splitter Limit - return true if a splitter has hit a limiting size
 *
 * Return true if the limit is being hit for one of the areas The test is done this way because it is possible for
 * areas to become smaller than the limit due to window resizing. We want to be able to grow areas that are too
 * small with a splitter but not continue to shrink those areas
 *
 * @param {number} size1 - Size (width or height) of left or top area for the active splitter
 * @param {number} size2 - Size (width or height) of right or bottom area for the active splitter
 * @param {number} delta - Amount the sizes are being changed
 * @param {number} minSize1 - Minimum size (width or height) of left or top area for the active splitter
 * @param {number} minSize2 - Minimum size (width or height) of right or bottom area for the active splitter
 *
 *
 * @return {boolean} - true if a limit would be hit by the delta change
 */
export let splitterLimit = function( size1, size2, delta, minSize1, minSize2 ) {
    if( delta > 0 ) { // The right or bottom area is being reduced in size
        if( size2 - delta < minSize2 ) {
            return true;
        }
    } else { // delta < 0 - the left or top area is being reduced in size
        if( size1 + delta < minSize1 ) {
            return true;
        }
    }

    return false;
};

/**
 * Report a usage error.
 *
 * @param {string} errorMessage - error to report.
 */
export let reportError = function( errorMessage ) {
    logger.warn( 'awSplitterService:' + errorMessage );
};

exports = {
    constants,
    activeSplitterData,
    initSplitter,
    mouseDownEvent,
    mouseUpEventHandler,
    mouseMoveEventHandler,
    updateActiveSplitter,
    updateAreaSize,
    splitterLimit,
    reportError
};
export default exports;

/**
 * @memberof NgServices
 * @member configurationService
 *
 * @returns {configurationService} Reference to the service API object.
 */
app.factory( 'awSplitterService', () => exports );
