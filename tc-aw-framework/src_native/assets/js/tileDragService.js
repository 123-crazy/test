// Copyright (c) 2020 Siemens

/**
 * This service manages tiles drag and reorder functionality.
 *
 * @module js/tileDragService
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import logger from 'js/logger';

var exports = {};

/**
 * Static Strings referencing css classes
 */
var TILEMAIN_CSS_CLASS = 'aw-tile-tileMain';
var TILE_CONT_CSS_CLASS = 'aw-tile-tileContainer';
var TILE_DRAGGABLE_CSS_CLASS = 'aw-tile-draggable';
var TILEGROUP_CSS_CLASS = 'aw-tile-tileGroup';
var PLACEHOLDER_GROUP_CSS_CLASS = 'aw-tile-placeHolderGroupSep';
var PLACEHOLDER_TILE_CSS_CLASS = 'aw-tile-placeHolderTile';
var DRAGTILE_CSS_CLASS = 'aw-tile-dragTile';
var DRAGTILE_CONT_CSS_CLASS = 'aw-tile-dragTileCont';
var TILE_GROUP_TAGNAME = 'aw-tile-group';
var TILE_MAIN_CONTAINER_CSS_CLASS = 'aw-tile-mainContainer';

/**
 * <pre>
 * Greater Than 0 If some basic event activity should be logged.
 * Greater Than 1 If some more fine-grained event activity should be logged.
 * </pre>
 */
var _debug_logEventActivity = 0;

var placeHolderTile;

/**
 * Return the 'source' element from the given drag event. The name of the element in the event can vary
 * depending on the browser the client is running with.
 *
 * @param {DragEvent} event - The event to extract the 'source' element from.
 *
 * @return {Element} The DOM element considered the 'source' of the given drag event.
 */
var _getEventSource = function( event ) {
    if( event.srcElement ) {
        return event.srcElement;
    }

    return event.target;
};

/**
 * Return the data associated with the element passed in
 *
 * @param {Element} element - The DOM element to retrieve the data associated to it.
 *
 * @return {Object} Element's data
 */
var _getElementScope = function( element ) {
    return ngModule.element( element ).scope();
};

/**
 * Return the data associated with the element passed in
 *
 * @param {Element} element - The DOM element to retrieve the data associated to it.
 *
 * @return {Object} tile object referenced with element's data
 */
var _getElementTileFn = function( element ) {
    var tileElem;
    var tileData;

    if( $( element ).hasClass( TILEMAIN_CSS_CLASS ) && $( element ).hasClass( TILE_DRAGGABLE_CSS_CLASS ) ) {
        tileElem = element;
        tileData = _getElementScope( tileElem ).tile;
    } else {
        tileElem = $( element ).closest( '.' + TILEMAIN_CSS_CLASS + '.' + TILE_DRAGGABLE_CSS_CLASS );
        if( tileElem && tileElem.length > 0 ) {
            tileData = _getElementScope( tileElem ).tile;
        }
    }

    return tileData;
};

/**
 * Retrieve the closest tileGroup parent element and return the data associated with it.
 *
 * @param {Element} element - The DOM element to retrieve the tileGroup data associated to it closest parent.
 *
 * @return {Object} tileGroup object referenced with element's closest tileGroup parent element
 */
var _getElementTileGroupFn = function( element ) {
    var tileGroupData;
    var tileGroupElem = $( element ).closest( TILE_GROUP_TAGNAME );
    if( tileGroupElem && tileGroupElem.length > 0 ) {
        tileGroupData = _getElementScope( tileGroupElem ).tileGroup;
    } else {
        tileGroupElem = $( element ).closest( '.' + TILEGROUP_CSS_CLASS );

        if( tileGroupElem && tileGroupElem.length > 0 ) {
            tileGroupData = _getElementScope( tileGroupElem ).tileGroup;
        }
    }

    return tileGroupData;
};

/**
 * Check if <b>everything</b> in the 'dataTransfer' is valid to drop on the 'target'.
 *
 * @param {DragEvent} event - The event containing the details of the 'dataTransfer' and 'target' element to
 *            test.
 * @return {Boolean} TRUE if something in the 'dataTransfer' is valid to drop on the 'target'.
 */
var _isValidToDrop = function( event ) {
    return true;
};

/**
 * Starting with the 'target' of the given DragEvent and walking up the DOM, looking for tileGroup separator element that
 * represents to create a new group OR placeHolder tile element to find out the reorder position
 *
 * @param {DragEvent} event - The event to start the search at.
 * @param {Boolean} isNewGroup - If a new tile group is to be created
 *
 * @return {Element} The Element where we need to reorder and insert dragged tile after this.
 */
var _findDropTargetElement = function( event, isNewGroup ) {
    var dropTarget = {};
    dropTarget.inPlace = false;
    var eventSrc = _getEventSource( event );

    if( isNewGroup ) {
        var placeholderGroup = $( '.' + TILE_MAIN_CONTAINER_CSS_CLASS ).find( '.' + PLACEHOLDER_GROUP_CSS_CLASS );
        dropTarget.element = placeholderGroup.prev( '.' + TILEGROUP_CSS_CLASS );

        // For the use case of the previous element not being an actual tile group
        while( dropTarget.element.hasClass( 'aw-tile-emptyTileGroup' ) ) {
            dropTarget.element = dropTarget.element.prev( '.' + TILEGROUP_CSS_CLASS );
        }

        // If the new group is in the 1st tile group location
        if( dropTarget.element.length === 0 ) {
            dropTarget.element = dropTarget.element.prevObject;
        }

        dropTarget.element = dropTarget.element[ 0 ];
        return dropTarget;
    }

    dropTarget.element = $( '.aw-tile-mainContainer .aw-tile-placeHolderTile' );

    if( dropTarget.element.length === 0 ) {
        if( !$( eventSrc ).hasClass( TILE_DRAGGABLE_CSS_CLASS ) ) {
            // find the closest
            var parentTileElem = $( eventSrc ).closest( '.' + TILE_DRAGGABLE_CSS_CLASS );
            // if its not on the parent level, then try to find it in the children
            if( parentTileElem.length === 0 ) {
                parentTileElem = $( eventSrc ).find( '.' + TILE_DRAGGABLE_CSS_CLASS );
            }

            if( parentTileElem && parentTileElem.length > 0 ) {
                dropTarget.element = parentTileElem[ 0 ];
            }
        } else {
            dropTarget.element = eventSrc;
        }
    } else {
        //  If we are the first tile && the next tile is a valid tile, use the next tile and drop the tile 'inPlace'
        if( dropTarget.element[ 0 ].style.order === '0' && dropTarget.element.next().length !== 0 ) {
            dropTarget.element = dropTarget.element.next();
            dropTarget.inPlace = true;
        } else {
            dropTarget.element = dropTarget.element.prev();
        }
    }

    return dropTarget;
};

/**
 * Starting with the 'target' of the given DragEvent and walking up the DOM, looking for tileGroup separator element that
 * represents to create a new group OR placeHolder tile element to find out the reorder position
 *
 * @param {DragEvent} event - The event to start the search at.
 *
 * @return {Element} The Element where we need to insert placeHolders by showing indication about new order
 * of dragged tile.
 */
var _findDragEnterElement = function( event ) {
    var dragEnterElement;

    var eventSrc = _getEventSource( event );
    // find the closest
    var parentTileElem = $( eventSrc ).closest( '.' + TILE_DRAGGABLE_CSS_CLASS );

    if( parentTileElem && parentTileElem.length > 0 ) {
        dragEnterElement = parentTileElem[ 0 ];
    } else if( $( eventSrc ).hasClass( TILEGROUP_CSS_CLASS ) ) {
        dragEnterElement = $( eventSrc );
    }

    return dragEnterElement;
};

/**
 * Remove place holder elements from DOM.
 */
var _removePlaceHolders = function() {
    $( '.' + PLACEHOLDER_TILE_CSS_CLASS + '.' + TILEMAIN_CSS_CLASS ).remove();
    $( '.' + TILEGROUP_CSS_CLASS + '.' + PLACEHOLDER_GROUP_CSS_CLASS ).remove();
};

/**
 * Create dummy placeHolder TileGroup element to represent the position in the UI before dropping
 *
 * @return {Element} The Element which represents dummy placeHolder tileGroup
 */
var _createPlaceHolderTileGroup = function() {
    // hidden tile to place it where dragging tile will dropped
    var newTileGroup = $( '<div class="' + TILEGROUP_CSS_CLASS + '"></div>' );
    newTileGroup.addClass( PLACEHOLDER_GROUP_CSS_CLASS );
    return newTileGroup;
};

/**
 * Create dummy placeHolder Tile element to represent the position in the UI before dropping
 *
 * @param {Object} sourceTile - based on source Tile size we need to create the placeHolder element
 *
 * @return {Element} The Element which represents dummy placeHolder tile
 */
var _createPlaceHolderTile = function( sourceTile ) {
    // hidden tile to place it where dragging tile will dropped
    placeHolderTile = $( '<div class="' + PLACEHOLDER_TILE_CSS_CLASS + '"></div>' );
    placeHolderTile.addClass( TILEMAIN_CSS_CLASS );

    if( $( sourceTile ).hasClass( 'aw-tile-doubleSize' ) ) {
        placeHolderTile.addClass( 'aw-tile-doubleSize' );
    } else if( $( sourceTile ).hasClass( 'aw-tile-tripleSize' ) ) {
        placeHolderTile.addClass( 'aw-tile-tripleSize' );
    } else if( $( sourceTile ).hasClass( 'aw-tile-quadroSize' ) ) {
        placeHolderTile.addClass( 'aw-tile-quadroSize' );
    }

    if( $( sourceTile ).hasClass( 'aw-tile-doubleVerticalSize' ) ) {
        placeHolderTile.addClass( 'aw-tile-doubleVerticalSize' );
    } else if( $( sourceTile ).hasClass( 'aw-tile-tripleVerticalSize' ) ) {
        placeHolderTile.addClass( 'aw-tile-tripleVerticalSize' );
    } else if( $( sourceTile ).hasClass( 'aw-tile-quadroVerticalSize' ) ) {
        placeHolderTile.addClass( 'aw-tile-quadroVerticalSize' );
    }

    return placeHolderTile;
};

/**
 * Cleanup CSS classes and attributes added as part of drag events and remove the placeHolder elements
 *
 * @param {Element} dragTileIn - The DOM element for dragging tile
 * @param {Element} element - container element for dragging tile
 */
var _cleanUp = function( dragTileIn, element ) {
    _removePlaceHolders();

    if( dragTileIn ) {
        $( dragTileIn ).removeAttr( 'id' );
    } else {
        var dragTile = element.find( '#draggedTile' );
        $( dragTile ).removeClass( DRAGTILE_CSS_CLASS );
        $( dragTile ).parent().css( 'min-width', '' );
        $( dragTile ).removeAttr( 'id' );

        var tileContElem = $( dragTile ).find( '.' + TILE_CONT_CSS_CLASS );
        $( tileContElem ).removeClass( DRAGTILE_CONT_CSS_CLASS );
    }

    placeHolderTile = null;

    if( _debug_logEventActivity >= 1 ) {
        logger.info( 'Cleaning up' );
    }
};

/**
 * Handle caching of DnD mapping data on the 'target' element's 'drop container' the 1st time we encounter the
 * 'target'.
 *
 * @param {DragEvent} event - The drag event with the 'target' to process.
 * @param {Element} targetElement - The target element associate with dragEnter event
 */
var _processDragEnterInternal = function( event, targetElement ) {
    event.preventDefault();

    // place phantom tile instead dragging one
    if( placeHolderTile && targetElement ) {
        // reordering in existing tiles
        if( $( targetElement ).hasClass( TILEMAIN_CSS_CLASS ) && $( targetElement ).hasClass( TILE_DRAGGABLE_CSS_CLASS ) ) {
            _removePlaceHolders();

            var targetCssOrder = targetElement.style.order;
            var order = parseInt( targetCssOrder, 10 );

            var side;
            var element = $( targetElement )[ 0 ];
            var mouseX = event.clientX;
            var elementWidth = element.offsetWidth;
            var halfElementWidth = elementWidth / 2;
            if( mouseX > halfElementWidth + element.offsetLeft ) {
                side = 'right';
            } else {
                side = 'left';
            }

            // If mouse is on left side of first gateway tile, place placeHolderTile before 1st tile. Else, put it after
            if( order === 0 && side === 'left' ) {
                placeHolderTile.insertBefore( targetElement );
                $( placeHolderTile ).css( 'order', 0 );
            } else {
                placeHolderTile.insertAfter( targetElement );
                $( placeHolderTile ).css( 'order', order++ );
            }

            _.forEach( $( placeHolderTile ).nextAll(), function( nextSib ) {
                if( nextSib ) {
                    nextSib.style.order = order++;
                }
            } );

            if( _debug_logEventActivity >= 1 ) {
                var tgtTile = _getElementTileFn( targetElement );

                logger.info( 'processDragEnter - PlaceHolder Tile Inserted: ' + tgtTile.displayName );
            }
        } else if( $( targetElement ).hasClass( TILEGROUP_CSS_CLASS ) ) { // vertically or horizontally creating new group
            _removePlaceHolders();

            var targetGroupElem = $( targetElement );
            var placeHolderTileGroup = _createPlaceHolderTileGroup();
            placeHolderTileGroup.insertBefore( targetGroupElem[ 0 ] );

            if( _debug_logEventActivity >= 1 ) {
                logger.info( 'processDragEnter - Insert vertical or horizontal placeHolder Group' );
            }
        }
    }
};

/**
 * Get base order value from the input parameter's order number
 * <p>
 * ex: 212 -> returns 200; 399 -> returns 300
 *
 * @param {Number} orderNumber - order number
 * @returns {Number} base order number if orderNumber is defined, otherwise 0
 */
export let getBaseOrder = function( orderNumber ) {
    if( !orderNumber ) {
        return 0;
    }
    var tensAndOnesDigits = orderNumber % 100;
    return orderNumber - tensAndOnesDigits;
};

/**
 * Add the given map of 'dragData' name/value pairs to the 'dataTransfer' property of the given DragEvent.
 *
 * @param {DragEvent} event - The DragEvent to set the DragData on.
 * @param {Object} dragDataMap - Map of name/value pairs to add.
 */
export let addDragDataToDragEvent = function( event, dragDataMap ) {
    if( event.dataTransfer && dragDataMap ) {
        event.dataTransfer.setData( 'text', JSON.stringify( {
            sourceTile: dragDataMap.sourceTile,
            sourceGroupName: dragDataMap.sourceTileGroup.groupName
        } ) );
    }
};

/**
 * Update the drag image for the DragEvent based on draggable element.
 *
 * @param {DragEvent} event - The DragEvent to set the image on.
 * @param {DOMElement} draggableElem - element being dragged.
 */
export let updateDragImage = function( event, draggableElem ) {
    /**
     * Internet Explorer doesn't support setDragImage at all.
     * <P>
     * See: http://mereskin.github.io/dnd/
     */
    if( !browserUtils.isIE && event.dataTransfer ) {
        /**
         * The NX web browser (QT?) currently has a problem with child elements containing float elements. This
         * should be resolved after moving the list view to a flex display.
         */
        event.dataTransfer.setDragImage( draggableElem, 0, 0 );
    }
};

/**
 * Processes drag start event
 *
 * @param {DragEvent} event - The event to extract the 'source' element from.
 * @param {Element} element - The DOM element considered the 'source' of the given drag event.
 * @param {Object} callBackAPIs - Callback functions used for various interaction reasons.
 */
export let processDragStart = function( event, element, callBackAPIs ) {
    var srcElement = _getEventSource( event );
    var sourceTile = _getElementTileFn( srcElement );
    var sourceTileGroup = _getElementTileGroupFn( srcElement );

    var tileContElem = $( srcElement ).find( '.' + TILE_CONT_CSS_CLASS )[ 0 ];

    if( sourceTile ) {
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'processDragStart - Source Tile name: ' + sourceTile.displayName +
                ' && Source Tile Group name: ' + sourceTileGroup.groupName );
        }

        element.data( 'dragging', true );
        var containerId = element.data( 'containerId' );

        if( !containerId ) {
            containerId = Date.now();
            element.data( 'containerId', containerId );
        }

        var width = 0;
        for( var index = 0; index < 3; index++ ) {
            if ( index < sourceTileGroup.tiles.length ) {
                width += sourceTileGroup.tiles[index].tileSize + 1;
            } else {
                break;
            }
        }

        // Default width for the single width tile
        var parentTileMinWidth;
        parentTileMinWidth = 155 * width + 'px';

        $( srcElement ).parent().css( 'min-width', parentTileMinWidth );

        $( srcElement ).attr( 'id', 'draggedTile' );
        $( srcElement ).addClass( DRAGTILE_CSS_CLASS );
        $( tileContElem ).addClass( DRAGTILE_CONT_CSS_CLASS );

        if( event.dataTransfer ) {
            event.dataTransfer.effectAllowed = 'move'; // only allow moves
        }

        exports.updateDragImage( event, tileContElem );
        exports.addDragDataToDragEvent( event, {
            sourceTile: sourceTile,
            sourceTileGroup: sourceTileGroup
        } );

        placeHolderTile = _createPlaceHolderTile( _getEventSource( event ) );
    } else {
        if( _debug_logEventActivity >= 2 ) {
            logger.info( 'processDragStart - no tile Info, Set element data "dragging" to false' );
        }

        // No data so there is no reason to let the object be dragged.
        element.data( 'dragging', false );
        exports.removeDragAndReorderListeners( element, callBackAPIs );
        event.preventDefault();
    }
};

/**
 * Processes drag over event
 *
 * @param {DragEvent} event - The event to extract the 'source' element from.
 */
export let processDragOver = function( event ) {
    if( event.dataTransfer ) {
        event.dataTransfer.effectAllowed = 'move'; // only allow moves
    }
};

/**
 * Processes drag enter event
 *
 * @param {DragEvent} event - The event to extract the 'target' element from.
 * @param {Element} targetElement - The DOM element considered the 'target' of the given drag event.
 */
export let processDragEnter = function( event, targetElement ) {
    if( _isValidToDrop( event ) ) {
        var targetData = _getElementTileFn( targetElement );
        var targetTileGroup = _getElementTileGroupFn( targetElement );

        if( !targetData ) {
            targetData = _getElementScope( targetElement );
        }

        if( targetData ) {
            if( _debug_logEventActivity >= 2 ) {
                if( targetData.tiles ) {
                    logger.info( 'processDragEnter - Target tileGroup: ' + targetData.groupName );
                } else if( targetTileGroup && targetData.displayName ) {
                    logger.info( 'processDragEnter - Target tile: ' + targetData.displayName +
                        ' && Target Item tileGroup: ' + targetTileGroup.groupName );
                } else if( targetTileGroup && !targetData.displayName ) {
                    logger.info( 'processDragEnter - Target Item tileGroup: ' + targetTileGroup.groupName );
                }
            }

            if( !targetData.tiles && ( !targetTileGroup || !targetTileGroup.groupName ) ) {
                return;
            }

            if( event.dataTransfer ) {
                event.dataTransfer.effectAllowed = 'move'; // only allow moves
            }

            var debounceProcessDragEnter = _.debounce( _processDragEnterInternal, 100 );
            debounceProcessDragEnter( event, targetElement );
        }
    }
};

/**
 * Processes drag leave event
 *
 * @param {DragEvent} event - The event to extract the 'target' element from.
 */
export let processDragLeave = function( event ) {
    event.preventDefault();

    if( event.dataTransfer ) {
        event.dataTransfer.effectAllowed = 'move'; // only allow moves
    }
};

/**
 * Processes drag end event
 *
 * @param {DragEvent} event - The event to extract the 'target' element from.
 * @param {Element} element - The DOM element considered the 'target' of the given drag event.
 */
export let processDragEnd = function( event, element ) {
    event.preventDefault();

    if( _debug_logEventActivity >= 1 ) {
        logger.info( 'processDragEnd - Processing drag end' );
    }

    var evtElement = _getEventSource( event );
    $( evtElement ).removeClass( DRAGTILE_CSS_CLASS );
    $( evtElement ).parent().css( 'min-width', '' );
    $( evtElement ).removeAttr( 'id' );

    var tileContElem = $( evtElement ).find( '.' + TILE_CONT_CSS_CLASS );
    $( tileContElem ).removeClass( DRAGTILE_CONT_CSS_CLASS );

    _cleanUp( null, element );
};

/**
 * @param {DragEvent} event - The drag event with the 'target' to process.
 * @param {Object} callBackAPIs - Callback functions used for various interaction reasons.
 * @param {Element} element - The DOM element considered the 'target' of the given drag event.
 */
export let processDrop = function( event, callBackAPIs, element ) {
    event.stopPropagation();
    event.preventDefault();

    if( _debug_logEventActivity >= 1 ) {
        logger.info( 'processDrop - Processing drop' );
    }

    var dragTile = element.find( '#draggedTile' );
    var isNewGroup = false;
    $( dragTile ).removeClass( DRAGTILE_CSS_CLASS );
    $( dragTile ).parent().css( 'min-width', '' );

    var tileContElem = $( dragTile ).find( '.' + TILE_CONT_CSS_CLASS );
    $( tileContElem ).removeClass( DRAGTILE_CONT_CSS_CLASS );

    if( $( '.' + PLACEHOLDER_TILE_CSS_CLASS + '.' + TILEMAIN_CSS_CLASS ).length > 0 ) {
        var prevSiblings = $( '.' + PLACEHOLDER_TILE_CSS_CLASS + '.' + TILEMAIN_CSS_CLASS ).prevAll();
        var nextSiblings = $( '.' + PLACEHOLDER_TILE_CSS_CLASS + '.' + TILEMAIN_CSS_CLASS ).nextAll();
        var prevSibLength = prevSiblings.length;
        var index = 0;

        _.forEachRight( prevSiblings, function( sibling ) {
            if( sibling.id !== 'draggedTile' ) {
                sibling.style.order = index;
            }
            index++;
        } );

        if( dragTile && dragTile.length > 0 ) {
            $( dragTile )[ 0 ].style.order = prevSibLength;

            if( _debug_logEventActivity >= 1 ) {
                logger.info( 'processDrop - Set new order style for dragged tile' );
            }
        }

        _.forEach( nextSiblings, function( sibling ) {
            if( sibling.id !== 'draggedTile' ) {
                sibling.style.order = index;
            }
            index++;
        } );
    } else if( $( '.' + TILEGROUP_CSS_CLASS + '.' + PLACEHOLDER_GROUP_CSS_CLASS ).length > 0 ) {
        isNewGroup = true;
    }

    var targetElement = _findDropTargetElement( event, isNewGroup );
    if( !targetElement.element ) {
        _cleanUp( dragTile );
        return;
    }

    var draggingData = event.dataTransfer.getData( 'text' );

    if( _debug_logEventActivity >= 1 ) {
        logger.info( 'processDrop - Retrieving drag data' );
    }

    if( draggingData ) {
        var dragDataTile = JSON.parse( draggingData );
        var targetTile = _getElementTileFn( targetElement.element );

        if( !isNewGroup && callBackAPIs.updateOrder && targetTile !== dragDataTile.sourceTile ) {
            var targetTileGroup = _getElementTileGroupFn( targetElement.element );
            callBackAPIs.updateOrder( dragDataTile.sourceTile, dragDataTile.sourceGroupName, targetTile, targetTileGroup, targetElement.inPlace );
        } else if( isNewGroup && callBackAPIs.createNewGroup ) {
            var tileGroupElemData = _getElementScope( targetElement.element );
            var tileGroupData;

            if( tileGroupElemData ) {
                tileGroupData = tileGroupElemData.tileGroup;
            }
            callBackAPIs.createNewGroup( dragDataTile.sourceTile, dragDataTile.sourceGroupName, tileGroupData );
        }

        if( _debug_logEventActivity >= 1 ) {
            logger.info( 'processDrop - Dropping data: ' + draggingData );
        }
    }

    _cleanUp( dragTile );
};

/**
 * Setup drag and reorder listeners for tiles
 *
 * @param {Element} panelElement - The DOM element that is the overall container/frame for a collection of
 *            tiles.
 *
 * @param {Object} callBackAPIs - Callback functions used for various reasons of interaction with the
 *            container/frame:
 *            <P>
 *            updateOrder: Used to update order of tiles after rearrange.
 *            <P>
 *            createNewGroup: Used to create new tile group.
 *
 */
export let setupDragAndReorder = function( panelElement, callBackAPIs ) {
    var jqElement = $( panelElement );

    if( _debug_logEventActivity >= 2 ) {
        logger.info( 'Setting up drag and re-order listeners' );
    }

    callBackAPIs.dragStartFn = function( event ) {
        if( event.target.nodeName === '#text' ) {
            jqElement.data( 'dragging', false );
            event.preventDefault();
        } else {
            if( _debug_logEventActivity >= 2 ) {
                logger.info( 'dragstart: ' + event );
            }

            exports.processDragStart( event, jqElement, callBackAPIs );
        }
    };

    callBackAPIs.dragOverFn = function( event ) {
        if( event ) {
            if( _debug_logEventActivity >= 2 ) {
                logger.info( 'dragover: ' + event );
            }

            if( _isValidToDrop( event ) ) {
                if( event.dataTransfer && !browserUtils.isQt ) {
                    event.dataTransfer.dropEffect = 'move'; // only allow moves
                }

                event.stopPropagation();
                event.preventDefault();

                var debounceProcessDragOver = _.debounce( exports.processDragOver, 100 );
                debounceProcessDragOver( event );
            }
        }
    };

    callBackAPIs.dragEnterFn = function( event ) {
        if( event ) {
            if( _debug_logEventActivity >= 2 ) {
                logger.info( 'dragenter: ' + event );
            }

            var target = _findDragEnterElement( event );
            if( !target ) {
                return;
            }

            exports.processDragEnter( event, target );
        }
    };

    callBackAPIs.dragLeaveFn = function( event ) {
        if( event ) {
            if( _debug_logEventActivity >= 2 ) {
                logger.info( 'dragleave: ' + event );
            }

            var debounceProcessDragLeave = _.debounce( exports.processDragLeave, 100 );
            debounceProcessDragLeave( event );
        }
    };

    callBackAPIs.dragEndFn = function( event ) {
        if( event ) {
            if( _debug_logEventActivity >= 2 ) {
                logger.info( 'dragend: ' + event );
            }

            jqElement.data( 'dragging', false );

            var target = _findDropTargetElement( event );
            if( !target ) {
                return;
            }

            exports.processDragEnd( event, jqElement );
        }
    };

    callBackAPIs.dropFn = function( event ) {
        if( event ) {
            if( _debug_logEventActivity >= 2 ) {
                logger.info( 'drop: ' + event );
            }

            jqElement.data( 'dragging', false );
            exports.processDrop( event, callBackAPIs, jqElement );
        }
    };

    panelElement.addEventListener( 'dragstart', callBackAPIs.dragStartFn );
    panelElement.addEventListener( 'dragend', callBackAPIs.dragEndFn );
    panelElement.addEventListener( 'dragover', callBackAPIs.dragOverFn );
    panelElement.addEventListener( 'dragenter', callBackAPIs.dragEnterFn );
    panelElement.addEventListener( 'dragleave', callBackAPIs.dragLeaveFn );
    panelElement.addEventListener( 'drop', callBackAPIs.dropFn );
};

/**
 * Remove drag and reorder listeners for tiles
 *
 * @param {Element} panelElement - The DOM element that is the overall container/frame for a collection of
 *            tiles.
 *
 * @param {Object} callBackAPIs - Callback functions used for various reasons of interaction with the
 *            container/frame:
 *            <P>
 *            updateOrder: Used to update order of tiles after rearrange.
 *            <P>
 *            createNewGroup: Used to create new tile group.
 *
 */
export let removeDragAndReorderListeners = function( panelElement, callBackAPIs ) {
    if( _debug_logEventActivity >= 2 ) {
        logger.info( 'Remove drag and re-order listeners' );
    }

    panelElement.removeEventListener( 'dragstart', callBackAPIs.dragStartFn );
    panelElement.removeEventListener( 'dragend', callBackAPIs.dragEndFn );
    panelElement.removeEventListener( 'dragover', callBackAPIs.dragOverFn );
    panelElement.removeEventListener( 'dragenter', callBackAPIs.dragEnterFn );
    panelElement.removeEventListener( 'dragleave', callBackAPIs.dragLeaveFn );
    panelElement.removeEventListener( 'drop', callBackAPIs.dropFn );
};

exports = {
    getBaseOrder,
    addDragDataToDragEvent,
    updateDragImage,
    processDragStart,
    processDragOver,
    processDragEnter,
    processDragLeave,
    processDragEnd,
    processDrop,
    setupDragAndReorder,
    removeDragAndReorderListeners
};
export default exports;
/**
 * This service manages tiles drag and reorder functionality
 *
 * @memberof NgServices
 * @member tileDragService
 *
 * @returns {Object} - tileDragService API object
 */
app.factory( 'tileDragService', () => exports );
