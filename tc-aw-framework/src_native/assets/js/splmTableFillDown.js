// Copyright (c) 2020 Siemens

/**
 * This service is used for plTable as Fill Down / Copy Down / Drag Down
 *
 * @module js/splmTableFillDown
 *
 * @publishedApolloService
 *
 */
import _ from 'lodash';
import _t from 'js/splmTableNative';
import SPLMTableFillDownHelper from 'js/splmTableFillDownHelper';

/**
 * Instances of this class represent a fill down helper for PL Table
 *
 * @class SPLMTableFillDown
 * @param {Object} tableElem PL Table DOMElement
 */
function SPLMTableFillDown( tableElem ) {
    let self = this;
    let _helper = new SPLMTableFillDownHelper( tableElem );

    let _draggableOriginal;

    /**
     * Enable FillDown on cell element
     *
     * @param {DOMElement} cellElement - DOMElement for Cell
     *
     */
    self.enableFillDown = function( cellElement ) {
        var dragHandleElement = cellElement.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_DRAG_HANDLE )[ 0 ];
        if( !dragHandleElement ) {
            let row = cellElement.parentElement;
            dragHandleElement = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_DRAG_HANDLE );
            dragHandleElement.addEventListener( 'mouseover', _helper.initialize );
            dragHandleElement.addEventListener( 'mousedown', function() {
                _draggableOriginal = row.draggable;
                row.draggable = false;
            } );
            dragHandleElement.addEventListener( 'mouseup', function() {
                row.draggable = _draggableOriginal;
            } );
            cellElement.appendChild( dragHandleElement );
        }
    };

    /**
     * Disable FillDown on cell element
     *
     * @param {DOMElement} cellElement - DOMElement for Cell
     */
    self.disableFillDown = function( cellElement ) {
        var dragHandleElement = cellElement.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_DRAG_HANDLE )[ 0 ];
        if( dragHandleElement ) {
            cellElement.removeChild( dragHandleElement );
        }
    };

    return self;
}

export default SPLMTableFillDown;
