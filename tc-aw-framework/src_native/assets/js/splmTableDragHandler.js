// Copyright (c) 2020 Siemens

/**
 * This service is used for triggering drag and click event for PL Table without conflict
 *
 * @module js/splmTableDragHandler
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import _t from 'js/splmTableNative';

var exports = {};

var _dragEventHandler = function( e ) {
    // NOTE: pute every variable's inside this scope for isolation
    var _elem = e.currentTarget;

    // NOTE: This number is based on manual testing. We can adjust it at any time.
    var _clickInterval = 160;

    // For stopping cursor change from darg-and-drop service
    var _cursorMutexListener = function( mutexEvent ) {
        if( mutexEvent.originalEvent ) {
            mutexEvent = mutexEvent.originalEvent;
        }
        mutexEvent.preventDefault();
        return false;
    };

    var _onDragListener = function( dragEvent ) {
        if( dragEvent.originalEvent ) {
            dragEvent = dragEvent.originalEvent;
        }
        dragEvent.preventDefault();
        dragEvent.cancelBubble = true;
        _elem.dispatchEvent( _t.util.createCustomEvent( _t.Const.EVENT_ON_ELEM_DRAG, dragEvent ) );
    };

    var _onDragEndListener = function( dragEndEvent ) {
        if( dragEndEvent.originalEvent ) {
            dragEndEvent = event.originalEvent;
        }
        dragEndEvent.preventDefault();
        document.removeEventListener( 'mouseup', _onDragEndListener );
        document.removeEventListener( 'mousemove', _onDragListener );
        document.removeEventListener( 'mousedown', _cursorMutexListener );
        document.removeEventListener( 'mouseover', _cursorMutexListener );
        dragEndEvent.cancelBubble = true;
        _elem.dispatchEvent( _t.util.createCustomEvent( _t.Const.EVENT_ON_ELEM_DRAG_END, dragEndEvent ) );
    };

    var _onDragStartListener = function( dragStartEvent ) {
        if( dragStartEvent.originalEvent ) {
            dragStartEvent = dragStartEvent.originalEvent;
        }
        dragStartEvent.preventDefault();
        dragStartEvent.cancelBubble = true;

        document.addEventListener( 'mouseup', _onDragEndListener );
        document.addEventListener( 'mousemove', _onDragListener );
        document.addEventListener( 'mousedown', _cursorMutexListener );
        document.addEventListener( 'mouseover', _cursorMutexListener );
        _elem.dispatchEvent( _t.util.createCustomEvent( _t.Const.EVENT_ON_ELEM_DRAG_START, dragStartEvent ) );
    };

    var handleOriginEvent = function( originEvent ) {
        var ticking = false;

        var cleanClickTicking = function() {
            _elem.removeEventListener( 'mouseup', cleanClickTicking );
            ticking = false;
        };

        var setupClickTiking = function() {
            ticking = true;
            _elem.addEventListener( 'mouseup', cleanClickTicking );
        };

        setupClickTiking();
        setTimeout( function() {
            if( ticking === true ) {
                cleanClickTicking();
                _onDragStartListener( originEvent );
            }
        }, _clickInterval );
    };

    handleOriginEvent( e );
};

export let enableDragging = function( elem ) {
    elem.addEventListener( 'mousedown', _dragEventHandler );
};

export let disableDragging = function( elem ) {
    elem.removeEventListener( 'mousedown', _dragEventHandler );
};

/**
 * Listen for DnD highlight/unhighlight event from dragAndDropService
 */
eventBus.subscribe( 'dragDropEvent.highlight', function( eventData ) {
    exports.handleDragDropHighlightPLTable( eventData );
} );

var applyStyleForTableDnD = function( tableElement, applyFlag, style ) {
    if( applyFlag ) {
        if( style ) {
            tableElement.classList.add( style );
        } else {
            tableElement.classList.add( _t.Const.CLASS_THEME_DROP_FRAME );
            tableElement.classList.add( _t.Const.CLASS_WIDGETS_DROP_FRAME );
        }
    } else {
        if( style ) {
            tableElement.classList.remove( style );
        } else {
            tableElement.classList.remove( _t.Const.CLASS_THEME_DROP_FRAME );
            tableElement.classList.remove( _t.Const.CLASS_WIDGETS_DROP_FRAME );
        }
    }
};

var applyStyleToChildrenForAllRows = function( pinnedOrScrollContainerList, isPCList, isGlobalArea, applyFlag ) {
    _.forEach( pinnedOrScrollContainerList, function( pcOrsc ) {
        if( pcOrsc.children ) {
            if( isGlobalArea ) {
                applyStyleForTableDnD( pcOrsc, applyFlag, _t.Const.CLASS_DONOT_HIGHLIGHT_INDIVIDUAL_ROWS );
            } else {
                if( isPCList ) {
                    applyStyleForTableDnD( pcOrsc, applyFlag, _t.Const.CLASS_PINNED_CONTAINER_DROP_FRAME );
                } else {
                    applyStyleForTableDnD( pcOrsc, applyFlag, _t.Const.CLASS_SCROLL_CONTAINER_DROP_FRAME );
                }
            }
            _.forEach( pcOrsc.children, function( eachPcOrSc ) {
                if( isGlobalArea ) {
                    applyStyleForTableDnD( eachPcOrSc, applyFlag, _t.Const.CLASS_DONOT_HIGHLIGHT_INDIVIDUAL_ROWS );
                } else {
                    applyStyleForTableDnD( eachPcOrSc, applyFlag );
                }
            } );
        }
    } );
};

/**
 * Add/Remove the widget  class to the elements of splm table that need highlighting/unhighlighting.
 * @param {DOMElement} rowOrTableElement - The element the mouse is over when the event was fired.
 * @param {Boolean} isHighlightFlag - add or remove the highlight class
 * @param {Boolean} isGlobalArea - is the object drag target over global invalid area or not
 */
var _setHoverStyle = function( rowOrTableElement, isHighlightFlag, isGlobalArea ) {
    var splmTablePinnedContainer = null;
    var splmTableScrollContainer = null;
    if( !isGlobalArea ) { // target on table row
        // find the closest div holding splm table container
        var splmTable = _t.util.closestElement( rowOrTableElement, '.aw-splm-table' );
        splmTablePinnedContainer = splmTable.querySelector( '.aw-splm-tablePinnedContainer' );
        splmTableScrollContainer = splmTable.querySelector( '.aw-splm-tableScrollContainer' );
        var rowIndex = parseInt( rowOrTableElement.getAttribute( 'data-indexnumber' ) );
    } else {
        applyStyleForTableDnD( rowOrTableElement, isHighlightFlag );
        splmTablePinnedContainer = rowOrTableElement.querySelector( '.aw-splm-tablePinnedContainer' );
        splmTableScrollContainer = rowOrTableElement.querySelector( '.aw-splm-tableScrollContainer' );
    }
    if( splmTablePinnedContainer && splmTableScrollContainer ) {
        var pcList = [];
        var scList = [];
        var eachRowPC;
        var eachRowSC;
        if( !_.isUndefined( rowIndex ) ) { // target on table row
            pcList = splmTablePinnedContainer.querySelectorAll( 'div.ui-grid-row[data-indexnumber=\'' + rowIndex + '\']' );
            if( pcList && pcList.length > 0 ) {
                eachRowPC = pcList[ 0 ];
            }
            scList = splmTableScrollContainer.querySelectorAll( 'div.ui-grid-row[data-indexnumber=\'' + rowIndex + '\']' );
            if( scList && scList.length > 0 ) {
                eachRowSC = scList[ 0 ];
            }
        } else { // target on white area
            pcList = splmTablePinnedContainer.querySelectorAll( 'div.ui-grid-row' );
            scList = splmTableScrollContainer.querySelectorAll( 'div.ui-grid-row' );
        }
        // highlight every single row with borders ; this will not be required when drag is over an invalid/white area
        // when over an invalid/white area , border-color will not be required for every single table row ; but only on splm-table-container
        if( !isGlobalArea && !_.isUndefined( rowIndex ) && eachRowPC && eachRowSC ) { // target on table row
            applyStyleForTableDnD( eachRowPC, isHighlightFlag );
            applyStyleForTableDnD( eachRowSC, isHighlightFlag );
        }
        applyStyleToChildrenForAllRows( pcList, true, isGlobalArea, isHighlightFlag );
        applyStyleToChildrenForAllRows( scList, false, isGlobalArea, isHighlightFlag );
    }
};

export let handleDragDropHighlightPLTable = function( eventData ) {
    if( !_.isUndefined( eventData ) && !_.isUndefined( eventData.targetElement ) && eventData.targetElement.classList ) {
        var isHighlightFlag = eventData.isHighlightFlag;
        var target = eventData.targetElement;
        var targetScope;

        if( isHighlightFlag ) {
            if( target.classList.contains( _t.Const.CLASS_ROW ) ) {
                targetScope = ngModule.element( target ).scope();
                if( targetScope.row ) {
                    targetScope.row.hover = true;
                    targetScope.$evalAsync();
                } else {
                    _setHoverStyle( target, true, false );
                }
            } else if( target.classList.contains( _t.Const.CLASS_TABLE ) ) { // this is when current drag is on an invalid/white area
                _setHoverStyle( target, true, true );
            }
        } else {
            if( target.classList.contains( _t.Const.CLASS_ROW ) ) {
                targetScope = ngModule.element( target ).scope();
                if( targetScope.row ) {
                    targetScope.row.hover = true;
                    targetScope.$evalAsync();
                } else {
                    _setHoverStyle( target, false, false );
                }
            } else if( target.classList.contains( _t.Const.CLASS_TABLE ) ) { // this is when current drag is on an invalid/white area
                _setHoverStyle( target, false, true );
            }
        }
    }
};

exports = {
    enableDragging,
    disableDragging,
    handleDragDropHighlightPLTable
};
export default exports;
