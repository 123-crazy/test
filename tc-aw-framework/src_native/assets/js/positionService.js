/* eslint-disable max-statements-per-line */
/* eslint-disable require-jsdoc */
// Copyright (c) 2020 Siemens

/**
 * @module js/positionService
 */
import _ from 'lodash';
import popupUtils from 'js/popupUtils';
import domUtils from 'js/domUtils';
import browserUtils from 'js/browserUtils';
import Debug from 'Debug';
import logger from 'js/logger';
let trace = new Debug( 'positionService' );
let dom = domUtils.DOMAPIs;

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-end` (on the side with more space available, alignment depends by placement)
 *
 * @type {Array}
 * @enum {String}
 */
const placements = [
    'top-start',
    'top',
    'top-end',
    'right-start',
    'right',
    'right-end',
    'bottom-end',
    'bottom',
    'bottom-start',
    'left-end',
    'left',
    'left-start'
];

/**
 * the predefined arrow size in px
 */
const arrowSize = 10;
/**
 *
 * @param {Element} reference - the reference element
 * @param {Element} popup - the popup element
 * @param {String} options - the placement related option
 *
 * @returns {Object} the expected offsets
 */
const calculateOffsets = function( reference, popup, options ) {
    if ( !dom.inDOM( reference ) ) { logger.warn( `Invalid reference element: ${reference}` ); }
    let { placement, alternativePlacements, flipBehavior, hasArrow, arrowOptions, minSize, marginBufferSize } = options;
    if ( placements.indexOf( placement ) === -1 ) {
        trace( 'Error parameter `placement` ', placement, '. Please use a valid option: ' + placements );
        return undefined;
    }
    let data = {
        options,
        placement,
        alternativePlacements,
        flipBehavior,
        hasArrow,
        arrowSize,
        arrowOptions,
        minSize,
        marginBufferSize,
        offsets: {}
    };

    data.offsets.boundaries = getBoundaries( options );
    data.offsets.reference = getReferenceOffsets( reference, options );
    // apply placementAttribute if has arrow.
    data.hasArrow && updatePlacementAttribute( popup, data );
    // compute auto placement to support smart position, store placement inside the data object
    let oldPlacement = placement;
    data.placement = computeAutoPlacement( popup, data );
    // if placement changed, need to apply placementAttribute again.
    if ( oldPlacement !== data.placement ) { data.hasArrow && updatePlacementAttribute( popup, data ); }
    data.offsets.popup = getPopupOffsets( popup, data );
    const shiftvariation = data.placement.split( '-' )[ 1 ];
    if ( shiftvariation ) {
        let shiftOffsets = calculateShiftOffsets( data );
        data.offsets.popup = { ...data.offsets.popup, ...shiftOffsets[ shiftvariation ] };
    }
    // if defined overlapOnReference
    options.overlapOnReference && applyOverlap( data );
    // final to getArrowOffsets
    data.offsets.arrow = getArrowOffsets( data );
    return data.offsets;
};
function applyOverlap( data ) {
    let { popup, reference } = data.offsets;
    const basePlacement = data.placement.split( '-' )[ 0 ];
    const isVertical = [ 'bottom', 'top' ].indexOf( basePlacement ) !== -1;
    if ( isVertical ) {
        let sign = basePlacement === 'top' ? 1 : -1;
        popup.top += reference.height * sign;
    }
}
function updatePlacementAttribute( popup, data ) {
    let basePlacement = data.placement.split( '-' )[ 0 ];
    popup.setAttribute( 'x-placement', basePlacement );
}

function getPopupSide( popup, side, boundaries ) {
    let value = 0;
    if ( _.has( popup, side ) ) {
        value = popup[ side ];
    } else {
        const isLeft = side === 'left';
        const start = isLeft ? 'right' : 'bottom';
        const measurement = isLeft ? 'width' : 'height';
        value = boundaries[ measurement ] - popup[ measurement ] - popup[ start ];
    }
    return value;
}
function calculateShiftOffsets( data ) {
    const { placement, options } = data;
    const { reference, popup, boundaries } = data.offsets;
    const basePlacement = placement.split( '-' )[ 0 ];
    const shiftvariation = placement.split( '-' )[ 1 ];
    let shiftOffsets = null;
    // if shift shiftvariation is specified, run the modifier
    if ( shiftvariation ) {
        const isVertical = [ 'bottom', 'top' ].indexOf( basePlacement ) !== -1;
        const side = isVertical ? 'left' : 'top';
        const measurement = isVertical ? 'width' : 'height';
        const padding = isVertical ? 'x' : 'y';

        let offset = options && options.padding ? options.padding[ padding ] || 0 : 0;
        let targetSide = side;
        let start = reference[ side ] + offset;
        let end = reference[ side ] + reference[ measurement ] - popup[ measurement ] - offset;

        const mainSideFlipped = !_.has( popup, side );
        if ( options.advancePositioning && mainSideFlipped ) {
            const popupSideValue = getPopupSide( popup, side, boundaries );
            targetSide = getOppositePlacement( side );
            start = popup[ targetSide ] + ( popupSideValue - reference[ side ] ) - offset;
            end = popup[ targetSide ] + ( popupSideValue + popup[ measurement ] - reference[ side ] - reference[ measurement ] ) + offset;
        }

        // override top / left or bottom / right based on mainSide flip flag
        // if mainSide flipped: means popup was positioned by bottom / right due to content growth, hence override these target side
        shiftOffsets = {
            start: { [ targetSide ]: start },
            end: { [ targetSide ]: end }
        };
    }
    return shiftOffsets;
}

function getReferenceOffsets( reference, options ) {
    // TODO: viewport case need to take case parent container element
    let offset = dom.getOffset( reference );
    let referenceRect = getOuterSizes( reference );
    // support padding
    if ( options && options.padding ) {
        let { x = 0, y = 0 } = options.padding;
        offset.left -= x;
        offset.top -= y;
        referenceRect.width += 2 * x;
        referenceRect.height += 2 * y;
    }
    const offsets = {
        ...offset,
        ...referenceRect
    };
    return getClientRect( offsets );
}

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @param {String} placement - A valid placement
 * @param {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements
 */
function clockwise( placement, counter = false ) {
    const index = placements.indexOf( placement );
    let arr = placements.slice( 0, index );
    let result = placements.slice( index + 1 ).concat( arr );
    return !counter ? result : result.reverse();
}

function getBoundaries( options ) {
    const boundary = options.boundary;
    let offsets = {
        top: window.pageYOffset,
        left: window.pageXOffset,
        width: window.innerWidth,
        height: window.innerHeight
    };
    if ( boundary ) {
        offsets = {
            ...dom.getOffset( boundary ),
            ...getOuterSizes( boundary )
        };
    }
    return getClientRect( offsets );
}

function getSearchOrder( placement, flipBehavior, alternativePlacements ) {
    let searchOrder = [ placement ];
    let alternatives = [];
    alternativePlacements && ( alternatives = alternativePlacements.slice( 0 ) );
    if ( flipBehavior === 'opposite' ) {
        let op = getOppositePlacement( placement );
        alternatives = alternatives.concat( placement.split( '-' )[ 1 ] ? [ getOppositeAlignment( placement ), op, getOppositeAlignment( op ) ] : [ op ] );
    } else if ( flipBehavior !== 'fixed' ) {
        alternatives = alternatives.concat( clockwise( placement, flipBehavior === 'counterclockwise' ) );
    }
    return searchOrder.concat( alternatives );
}
function getArea( { width, height } ) {
    return width * height;
}
function checkSpace( rect, popper, minSize = 0 ) {
    let res = false;
    if ( rect &&
        rect.width >= Math.max( popper.width, minSize ) &&
        rect.height >= Math.max( popper.height, minSize )
    ) {
        res = true;
    }
    return res;
}

function getPlacement( popup, placement, avaliableRects, flipBehavior, data ) {
    let computedPlacement = null;
    const searchOrder = getSearchOrder( placement, flipBehavior, data.alternativePlacements );
    const searchRects = searchOrder.reduce( ( result, item ) => {
        if ( avaliableRects[ item ] ) {
            result[ item ] = avaliableRects[ item ];
            return result;
        }
    }, {} );
    // Get popper node sizes
    // support dynamic update when parent resize or window resize,
    // need to get original popup content size, not the current size.
    clearResize( popup, data );
    const popper = getOuterSizes( popup, data );
    // find an available space with no resize required
    searchOrder.find( ( key ) => {
        let rect = searchRects[ key ];
        if ( checkSpace( rect, popper, data.minSize ) ) {
            computedPlacement = key;
            return true;
        }
    } );

    trace( 'Position info: ' + computedPlacement );
    // then try to find an available space with resize required
    if ( !computedPlacement ) {
        const sortedAreas = Object.keys( searchRects )
            .map( key => ( {
                key,
                ...searchRects[ key ],
                area: getArea( searchRects[ key ] )
            } ) )
            .sort( ( a, b ) => b.area - a.area );
        applyResize( popup, sortedAreas[ 0 ], data );
        computedPlacement = sortedAreas[ 0 ].key;
    }
    return computedPlacement ? computedPlacement : placement;
}
function clearResize( popup, data ) {
    const container = popupUtils.getResizeContainer( popup, data.options.resizeContainer );
    if ( !container ) { return; }
    const css = {
        'max-width': null,
        'max-height': null,
        'min-width': null,
        'min-height': null
    };
    dom.setStyles( container, css );
}
function getArrowMargin( placement, data ) {
    let result = { width: 0, height: 0 };
    if ( data.hasArrow && data.arrowSize ) {
        const basePlacement = placement.split( '-' )[ 0 ];
        const isVertical = [ 'bottom', 'top' ].indexOf( basePlacement ) !== -1;
        const measurement = !isVertical ? 'width' : 'height';
        result[ measurement ] = data.arrowSize;
    }
    return result;
}
function applyResize( popup, area, data ) {
    const marginBufferSize = data.marginBufferSize || 0;
    const container = popupUtils.getResizeContainer( popup, data.options.resizeContainer );
    if ( !container ) { return; }
    const styles = dom.getComputedStyle( container );
    let css = {};
    const props = [ 'width', 'height' ];
    const arrowMargin = getArrowMargin( area.key, data );
    props.forEach( ( item ) => {
        let available = area[ item ] - arrowMargin[ item ];
        // unless space is highly limited, leave a gap for the drop shadow, etc
        if ( item === 'height' && marginBufferSize > 0 ) { available = Math.max( available - marginBufferSize, 0 ); }
        let expected = parseInt( styles[ item ] );
        let maxItem = 'max-' + item;
        let minItem = 'min-' + item;
        let overflowItem = 'overflow-' + ( item === 'width' ? 'x' : 'y' );

        if ( available < expected ) {
            css[ maxItem ] = available;
            css[ overflowItem ] = 'auto';
            if ( styles[ minItem ] && parseInt( styles[ minItem ] ) > available ) {
                css[ minItem ] = available;
            }
        }
    } );
    if ( Object.keys( css ).length > 0 ) {
        dom.setStyles( container, css );
    }
}

function getArrowOffsets( data ) {
    const { placement, arrowSize, arrowOptions } = data;
    const { reference, popup, boundaries } = data.offsets;
    const [ basePlacement, shiftvariation ] = placement.split( '-' );
    let overrideOffsets = null;
    const isVertical = [ 'bottom', 'top' ].indexOf( basePlacement ) !== -1;
    const side = isVertical ? 'left' : 'top';
    const measurement = isVertical ? 'width' : 'height';
    // should shift based on reference in this narrow case
    if ( reference[ measurement ] < popup[ measurement ] ) {
        let base = reference[ side ] - getPopupSide( popup, side, boundaries );
        overrideOffsets = {
            [ side ]: Math.min(
                Math.max( base + reference[ measurement ] / 2 - arrowSize, 0 ),
                popup[ measurement ] - arrowSize * 2
            )
        };
    }
    let shiftOffsets = {};
    // arrowOptions should be null by default,
    if ( arrowOptions && arrowOptions.alignment ) {
        let alignment = arrowOptions.alignment;
        // based on the popup alignment, arrow should be smart position itself.
        if ( alignment === 'auto' ) {
            alignment = shiftvariation ? shiftvariation : 'center';
        }
        shiftOffsets = getArrowShiftOffsets( data );
        // return directly got audit error: TypeError: Cannot read property 'name' of undefined
        return { ...overrideOffsets, ...shiftOffsets[ alignment ] };
    }
    return overrideOffsets;
}
function getArrowShiftOffsets( data ) {
    const { placement, arrowSize, arrowOptions } = data;
    const { reference, popup, boundaries } = data.offsets;
    const basePlacement = placement.split( '-' )[ 0 ];
    const shiftvariation = arrowOptions.alignment;
    let shiftOffsets = null;
    // if shift shiftvariation is specified, run the modifier
    if ( shiftvariation ) {
        // could be positive / negative
        let offset = parseInt( arrowOptions.offset ) || 0;
        //  only accept positive values.
        let shift = Math.max( parseInt( arrowOptions.shift ) || 0, 0 );
        const isVertical = [ 'bottom', 'top' ].indexOf( basePlacement ) !== -1;
        const side = isVertical ? 'left' : 'top';
        const measurement = isVertical ? 'width' : 'height';
        const base = reference[ side ] - getPopupSide( popup, side, boundaries );
        const rectifyOffset = Math.min( offset, popup[ measurement ], reference[ measurement ] );
        const padding = rectifyOffset + 2 * arrowSize;
        const min = Math.min( shift, popup[ measurement ] - arrowSize, reference[ measurement ] - arrowSize );
        const [ lowBound, highBound ] = [ min, positive(
            shift, Math.max( popup[ measurement ] - arrowSize * 2 - shift, shift ),
            reference[ measurement ] + base - arrowSize ) ];
        shiftOffsets = {
            start: {
                [ side ]: positive( lowBound, highBound,
                    base + rectifyOffset )
            },
            center: {
                [ side ]: positive( 0, Math.max( popup[ measurement ], reference[ measurement ] ),   // lowBound, highBound,
                    base + reference[ measurement ] / 2 - arrowSize )
            },  // + offset
            end: {
                [ side ]: positive( lowBound, highBound,
                    base + reference[ measurement ] - padding )
            }
        };
    }
    return shiftOffsets;
}
function positive( lowBound, highBound, ...items ) {
    return Math.min( Math.max( lowBound, ...items ), highBound );
}
function getPopupOffsets( popup, data ) {
    const { reference, boundaries } = data.offsets;
    let placement = data.placement;
    placement = placement.split( '-' )[ 0 ];
    // Get popper node sizes
    const popperRect = getOuterSizes( popup, data );
    // Add position, width and height to our offsets object
    const popperOffsets = {
        width: popperRect.width,
        height: popperRect.height
    };
    // depending by the popper placement we have to compute its offsets slightly differently
    const isHoriz = [ 'right', 'left' ].indexOf( placement ) !== -1;
    const mainSide = isHoriz ? 'top' : 'left';
    const secondarySide = isHoriz ? 'left' : 'top';
    const measurement = isHoriz ? 'height' : 'width';
    const secondaryMeasurement = !isHoriz ? 'height' : 'width';
    // center aligned offsets
    let center = Math.max( 0, reference[ mainSide ] + ( reference[ measurement ] - popperRect[ measurement ] ) / 2 );
    popperOffsets[ mainSide ] = center;
    // support adaptive shift
    if ( data.options.adaptiveShift ) {
        let exceed = center + popperRect[ measurement ] - boundaries[ measurement ];
        let adaptive = exceed < 0 ? center : Math.max( 0, center - exceed );
        popperOffsets[ mainSide ] = adaptive;
        if ( data.options.advancePositioning ) {
            // when popup content growing in corner case, we should flip the mainSide in positioning to enable it grows and gets natural size. Ref: LCS-352837
            if ( exceed >= -50 ) {
                delete popperOffsets[ mainSide ];
                popperOffsets[ getOppositePlacement( mainSide ) ] = exceed < 0 ? -exceed : 0;
            }
        }
    }
    // support flip
    let secondaryOppositeSide = getOppositePlacement( secondarySide );
    if ( placement === secondarySide ) {
        if ( data.options.advancePositioning ) {
            // for traditional top/left positioning, when popup content growing, it could be overlap on reference element,
            // to prevent that, we do this improvement to ensure no overlap:
            // for left placement, calculate top/right for popup
            // for top placement, calculate left/bottom for popup
            popperOffsets[ secondaryOppositeSide ] = Math.max( 0,
                boundaries[ secondaryOppositeSide ] - reference[ secondarySide ] );
        } else {
            popperOffsets[ secondarySide ] = Math.max( 0,
                reference[ secondarySide ] - popperRect[ secondaryMeasurement ] );
        }
    } else {
        popperOffsets[ secondarySide ] = Math.max( 0,
            reference[ secondaryOppositeSide ] );
    }
    // center aligned offsets
    return popperOffsets;
}
/**
 * Get the opposite placement of the given one
 * @param {String} placement - the placement
 * @returns {String} flipped placement
 */
function getOppositePlacement( placement ) {
    const hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
    return placement.replace( /left|right|bottom|top/g, matched => hash[ matched ] );
}
/**
 * Get the opposite alignment of the given one
 * @param {String} placement - the placement
 * @returns {String} flipped placement
 */
function getOppositeAlignment( placement ) {
    const hash = { start: 'end', end: 'start' };
    return placement.replace( /start|end/g, matched => hash[ matched ] );
}
/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @param {Object} offsets - the offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect( offsets ) {
    return {
        ...offsets,
        right: offsets.left + offsets.width,
        bottom: offsets.top + offsets.height
    };
}
/**
 * Get the outer sizes of the given element (offset size + margins)
 * @param {Element} element - the element
 * @param {Object} data - the data object
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes( element, data ) {
    let [ x, y ] = [ 0, 0 ];
    if ( data && data.hasArrow ) {
        const window = element.ownerDocument.defaultView;
        const styles = window.getComputedStyle( element );
        x = parseFloat( styles.marginTop || 0 ) + parseFloat( styles.marginBottom || 0 );
        y = parseFloat( styles.marginLeft || 0 ) + parseFloat( styles.marginRight || 0 );
    }
    // offsetHeight only works for block element, using getBoundingClientRect().height to get height for inline element
    const boundingRect = element.getBoundingClientRect();
    return {
        width: boundingRect.width + y,
        height: boundingRect.height + x
    };
}
function computeAutoPlacement( popup, data ) {
    const { reference, boundaries } = data.offsets;
    let { placement, flipBehavior } = data;
    const h1 = reference.top - boundaries.top;
    const h2 = boundaries.bottom - reference.bottom;
    const h3 = boundaries.height;
    const w1 = reference.left - boundaries.left;
    const w2 = boundaries.right - reference.right;
    const w3 = boundaries.width;
    const rects = {
        top: {
            width: w3,
            height: h1
        },
        'top-start': {
            width: boundaries.right - reference.left,
            height: h1
        },
        'top-end': {
            width: reference.right,
            height: h1
        },
        right: {
            width: w2,
            height: h3
        },
        'right-start': {
            width: w2,
            height: boundaries.bottom - reference.top
        },
        'right-end': {
            width: w2,
            height: reference.bottom
        },
        bottom: {
            width: w3,
            height: h2
        },
        'bottom-start': {
            width: boundaries.right - reference.left,
            height: h2
        },
        'bottom-end': {
            width: reference.right,
            height: h2
        },
        left: {
            width: w1,
            height: h3
        },
        'left-start': {
            width: w1,
            height: boundaries.bottom - reference.top
        },
        'left-end': {
            width: w1,
            height: reference.bottom
        }
    };
    return getPlacement( popup, placement, rects, flipBehavior, data );
}
function getMax( type, boundaries, refRect ) {
    const isHeight = type === 'height';
    const side = isHeight ? 'bottom' : 'right';
    const secondarySide = !isHeight ? 'top' : 'left';
    const measurement = isHeight ? 'height' : 'width';
    const space = Math.min( boundaries[ side ] - refRect[ side ], refRect[ secondarySide ] - boundaries[ secondarySide ] );
    return 2 * space + refRect[ measurement ];
}

export default {
    placements,
    calculateOffsets
};
