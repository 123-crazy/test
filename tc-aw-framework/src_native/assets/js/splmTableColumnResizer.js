// Copyright (c) 2020 Siemens

/**
 * This service is used for simpletabe as Column Resizer, all column resize logic are here for now
 *
 * @module js/splmTableColumnResizer
 *
 */
import _ from 'lodash';
import _t from 'js/splmTableNative';
import splmTableDragHandler from 'js/splmTableDragHandler';

// Write it here for reuse purporse

var exports = {};

/**
 * @memberOf js/splmTableColumnResizer
 *
 * apply column resize logic to splitter
 * @param {Object} tableCtrl - PL Table Controller
 * @param {DOMElement} elem - Column header splitter element
 */
export let applyColumnResizeHandler = function( tableCtrl, elem, menuService ) {
    var _startPageX = -1;
    var _gripPosX = -1;
    var _deltaWidth = -1;
    var columDef = elem.parentElement.children[ 1 ].columnDef;
    var _columnIdx = columDef.index;

    splmTableDragHandler.enableDragging( elem );
    elem.addEventListener( _t.Const.EVENT_ON_ELEM_DRAG_START, function( customEvent ) {
        var e = customEvent.detail;
        _startPageX = e.pageX;
        _deltaWidth = 0;

        // Clean up menu if exist
        menuService.ensureAllTableMenusDismissed();

        // Scroll left adjustment is not needed if the column is pinned
        var scrollLeft = columDef.pinnedLeft === true ? tableCtrl.getPinCanvasScrollLeftPosition() : tableCtrl.getScrollCanvasScrollLeftPosition();

        _gripPosX = tableCtrl.getTotalColumnWidth( _columnIdx ) - ( _t.Const.WIDTH_COLUMN_SPLITTER - e.offsetX ) + scrollLeft;

        tableCtrl.showColumnGrip( _gripPosX );
    } );

    elem.addEventListener( _t.Const.EVENT_ON_ELEM_DRAG, function( customEvent ) {
        var e = customEvent.detail;
        var deltaWidth = e.pageX - _startPageX;
        if( tableCtrl.isColumnWidthChangeValid( _columnIdx, deltaWidth ) ) {
            _deltaWidth = deltaWidth;
            tableCtrl.setColumnGripPosition( _gripPosX + _deltaWidth );
        }
    } );

    elem.addEventListener( _t.Const.EVENT_ON_ELEM_DRAG_END, function() {
        tableCtrl.hideColumnGrip();
        tableCtrl.updateColumnWidth( _columnIdx, _deltaWidth );
    } );

    elem.addEventListener( 'dblclick', function() {
        tableCtrl.fitColumnWidth( _columnIdx );
    } );
};

exports = {
    applyColumnResizeHandler
};
export default exports;
