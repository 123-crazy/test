// Copyright (c) 2020 Siemens

/**
 * @module js/hoverManager
 *
 * This module defines hover in/out internal operations/processing
 */

import Debug from 'Debug';
let trace = new Debug( 'hoverManager' );

// margin: to extend the hot area
let extendRect = ( targetRect, margin = 0 ) => {
    let result = {
        ...targetRect,
        left: Math.floor( targetRect.left - margin ),
        top: Math.floor( targetRect.top - margin ),
        right: Math.ceil( targetRect.right + margin ),
        bottom: Math.ceil( targetRect.bottom + margin )
    };
    return result;
};

let updateRectByEvent = function( targetRect, event ) {
    let left = event.clientX;
    let top = event.clientY;

    let isVertical = i => [ 'left', 'right' ].indexOf( i ) !== -1;
    let isStart = i => [ 'left', 'top' ].indexOf( i ) !== -1;
    [ 'left', 'top', 'right', 'bottom' ].forEach( ( item )=>{
        let is_start = isStart( item );
        let expected = isVertical( item ) ? left : top;
        let result = targetRect[item] - expected;
        result = is_start ?  result : -result;
        if( result > 0 ) { targetRect[item] = expected; }
    } );
};

let updateRect = function( targetRect  ) {
    let isStart = i => [ 'left', 'top' ].indexOf( i ) !== -1;
    [ 'left', 'top', 'right', 'bottom' ].forEach( ( item )=>{
        let offset = isStart( item ) ? 1 : -1;
        targetRect[item] += offset;
    } );
};


let insideHotArea = ( event, targetRect ) => {
    let left = event.clientX;
    let top = event.clientY;

    let result = false;
    if ( left >= targetRect.left && left <= targetRect.right &&
        top >= targetRect.top && top <= targetRect.bottom ) {
        result = true;
    }

    trace( `guard result: ${result}  point: ${left},${top}, targetRect: ${targetRect.left}, ${targetRect.top}, ${targetRect.right}, ${targetRect.bottom}` );
    return result;
};

/**
 * MoveManager class to manage move event
 *
 */
function MoveManager() {
    this.hooks = [];
    this.initialize();
}
MoveManager.prototype.moveHandler = function( event ) {
    if( !this.hooks || this.hooks.length  === 0 ) { return; }
    this.hooks.forEach( ( item )=>{ item( event ); } );
};
MoveManager.prototype.initialize = function() {
    let moveHandler = this.moveHandler.bind( this );
    document.body.addEventListener( 'mousemove', moveHandler );
};
MoveManager.prototype.addHook = function( item ) {
    if( this.hooks.indexOf( item ) === -1 ) { this.hooks.push( item ); }
};
MoveManager.prototype.removeHook = function( item ) {
    let index = this.hooks.indexOf( item );
    if( index !== -1 ) { this.hooks.splice( index, 1 ); }
};

// singleton instance
let moveManager = new MoveManager();

/**
 *
 * HoverManager to manage hover event
 *
 * @param {!element} element the target element
 * @param {!hoverInFn} hoverInFn the hoverInFn
 * @param {!hoverOutFn} hoverOutFn the hoverOutFn
 * @param {!margin} margin the margin used to extend hot areas
 *
 * @final @constructor
 */
function HoverManager( element, hoverInFn, hoverOutFn, margin = 0 ) {
    this._removeListeners = [];
    this._progress = false;
    this._enter = false;
    this._leave = false;
    this.target = element;
    this.margin = margin;
    this.targetRect = null;

    this.hoverInFn = hoverInFn;
    this.hoverOutFn = hoverOutFn;

    this._addEventListeners();
}

HoverManager.prototype.reset = function() {
    this._progress = false;
    this._enter = false;
    this._leave = false;
};

HoverManager.prototype.getTargetRect = function() {
    return extendRect( this.target.getBoundingClientRect(), this.margin );
};

HoverManager.prototype._addEventListeners = function() {
    this._enterHandler = this.enterHandler.bind( this );
    this._leaveHandler = this.leaveHandler.bind( this );
    this._moveHandler = this.moveHandler.bind( this );
    this._clickHandler = this.clickHandler.bind( this );

    this.target.addEventListener( 'mouseenter', this._enterHandler );
    this.target.addEventListener( 'mouseleave', this._leaveHandler );
    this.target.addEventListener( 'click', this._clickHandler, true );
    moveManager.addHook( this._moveHandler );

    // Queue remove listeners function
    this._removeListeners.push( () => {
        this.target.removeEventListener( 'mouseenter', this._enterHandler );
        this.target.removeEventListener( 'mouseleave', this._leaveHandler );
        this.target.removeEventListener( 'click', this._clickHandler );
        moveManager.removeHook( this._moveHandler );
    } );
};
HoverManager.prototype.internalHoverOutHandler = function( event, force = false ) {
    if ( !force
        &&
        // only continue to exit when have a valid enter and leave
        ( !this._enter || !this._leave ) ) { return; }

    if ( this._progress ) {
        // TODO, promise case need to cancel that promise
    }

    this.reset();

    this.hoverOutFn && this.hoverOutFn( event );
};

HoverManager.prototype.enterHandler = function( event ) {
    // update the rect in case target position updated.
    this.targetRect = this.getTargetRect();
    updateRectByEvent( this.targetRect, event );

    if ( this._progress || this._enter ) { return; }

    this._enter = true;
    this._progress = true;
    this.hoverInFn && this.hoverInFn( event );
    trace( 'enterHandler go: a true enter' );
};

HoverManager.prototype.leaveHandler = function( event ) {
    // update the rect in case target position updated.
    this.targetRect = this.getTargetRect();
    updateRect( this.targetRect );

    if ( this._leave ) { return; }
    trace( 'leaveHandler go: a true leave' );
    this._moveHandler( event );
};

HoverManager.prototype.moveHandler = function( event ) {
    if ( !this._enter || this._leave ) { return; }

    if ( !insideHotArea( event, this.targetRect ) ) {
        trace( 'moveHandler go: a true exit' );
        this._leave = true;
        this.internalHoverOutHandler( event );
    }
};

HoverManager.prototype.clickHandler = function( event ) {
    this.hoverOutFn && this.hoverOutFn( event );
};

HoverManager.prototype.clear = function() {
    this._removeListeners.forEach( ( item ) => {
        item && item();
    } );

    delete this._removeListeners;
    delete this.target;
};


export { HoverManager };
export default HoverManager;
