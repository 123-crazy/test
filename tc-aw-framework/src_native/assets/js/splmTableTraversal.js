// Copyright (c) 2020 Siemens

/**
 * Utility to traverse DOM Element in PL Table
 *
 * @module js/splmTableTraversal
 */
import _ from 'lodash';
import _t from 'js/splmTableNative';

/**
 * Instances of this class represent a traverse utilty in table
 *
 * @class SPLMTableTraversal
 * @param {DOMElement} tableElement - HTML DOM Element for table
 * @param {Number} pinColumnCount - The number of pin column count
 */
var SPLMTableTraversal = function( tableElement ) {
    var _table = tableElement;

    var _elem = _table;
    var self = this;

    // Helper traverse method
    self.getWidth = function() {
        return _t.util.numericProperty( _elem.style.width ) || _t.util.numericProperty( _elem.style.minWidth ) || 0;
    };

    self.getElement = function() {
        return _elem;
    };

    self.toHeader = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_ROW )[ 0 ];
        return this;
    };

    self.toCanvas = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_CANVAS )[ 0 ];
        return this;
    };

    self.toContentRow = function( rowIdx ) {
        _elem = self.getContentRowElements()[ rowIdx ];
        return this;
    };

    self.getContentRowElements = function() {
        return _elem.getElementsByClassName( _t.Const.CLASS_ROW );
    };

    self.getHeaderCellElements = function() {
        return _elem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL );
    };

    self.getContentCellElements = function() {
        return _elem.getElementsByClassName( _t.Const.CLASS_CELL );
    };

    self.toHeaderCell = function( columnIdx ) {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL )[ columnIdx ];
        return this;
    };

    self.toHeaderCellContent = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL_CONTENT )[ 0 ];
        return this;
    };

    self.toMenuItem = function( itemIdx ) {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_AW_CELL_LIST_ITEM )[ itemIdx ];
        return this;
    };

    self.getMenuItemElements = function() {
        return _elem.getElementsByClassName( _t.Const.CLASS_AW_CELL_LIST_ITEM );
    };

    self.toContentCell = function( columnIdx ) {
        var cells = _elem.getElementsByClassName( _t.Const.CLASS_CELL );
        for( var i = 0; i < cells.length; i++ ) {
            if( cells[ i ].columnDef.index === columnIdx ) {
                _elem = cells[ i ];
                return this;
            }
        }
        _elem = null;
        return this;
    };

    self.getAwIconElement = function() {
        return _elem.getElementsByTagName( _t.Const.ELEMENT_AW_ICON )[ 0 ];
    };

    self.getTreeNodeToggleCommandElement = function() {
        return _elem.getElementsByClassName( _t.Const.CLASS_WIDGET_TREE_NODE_TOGGLE_CMD )[ 0 ];
    };

    self.getTreeCommandCellElement = function( rowElement ) {
        return rowElement.getElementsByClassName( _t.Const.CLASS_AW_TREE_COMMAND_CELL )[ 0 ];
    };

    self.toSortIndicator = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL_SORT_ICON )[ 0 ];
        return this;
    };

    self.toColumnSplitter = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL_SPLITTER )[ 0 ];
        return this;
    };

    self.toStringEditBox = function() {
        _elem = _elem.getElementsByTagName( _t.Const.ELEMENT_STRING_EDIT_BOX )[ 0 ];
        return this;
    };

    self.toScrollContents = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_SCROLL_CONTENTS )[ 0 ];
        return this;
    };

    self.toHeaderRow = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_ROW )[ 0 ];
        return this;
    };

    self.toSortIcon = function() {
        _elem = _elem.getElementsByClassName( _t.Const.CLASS_HEADER_CELL_SORT_ICON )[ 0 ];
        return this;
    };

    self.getCellCommandButtonElements = function() {
        var cmdBarElem = _elem.getElementsByClassName( _t.Const.CLASS_CELL_COMMAND_BAR )[ 0 ];
        return cmdBarElem.getElementsByTagName( 'button' );
    };

    // Root traverse method
    self.queryPinContainerFromTable = function() {
        _elem = _table.getElementsByClassName( _t.Const.CLASS_PIN_CONTAINER )[ 0 ];
        return this;
    };

    self.queryScrollContainerFromTable = function() {
        _elem = _table.getElementsByClassName( _t.Const.CLASS_SCROLL_CONTAINER )[ 0 ];
        return this;
    };

    self.queryPinContentFromTable = function() {
        return self.queryPinContainerFromTable().toScrollContents();
    };

    self.queryScrollContentFromTable = function() {
        return self.queryScrollContainerFromTable().toScrollContents();
    };

    self.queryHeaderCellContentFromTable = function( columnIdx ) {
        return self.queryHeaderCellFromTable( columnIdx ).toHeaderCellContent();
    };

    self.queryHeaderCellFromTable = function( columnIdx ) {
        var pinColumnCount = _t.util.getTableController( _table ).getPinColumnCount();
        if( columnIdx < pinColumnCount ) {
            return self.queryPinContainerFromTable().toHeader().toHeaderCell( columnIdx );
        }
        return self.queryScrollContainerFromTable().toHeader().toHeaderCell( columnIdx - pinColumnCount );
    };

    self.queryFirstRowCellFromTable = function( columnIdx ) {
        var firstRowIdx = 0;
        return self.queryContentCellFromTable( firstRowIdx, columnIdx );
    };

    self.queryRowColumnCellElementsFromTable = function( columnIdx ) {
        var idx = 0;
        var rowElems = null;
        var res = [];
        var pinColumnCount = _t.util.getTableController( _table ).getPinColumnCount();
        if( columnIdx < pinColumnCount ) {
            idx = columnIdx;
            rowElems = self.getPinContentRowElementsFromTable();
        } else {
            idx = columnIdx - pinColumnCount;
            rowElems = self.getScrollContentRowElementsFromTable();
        }

        for( var i = 0; i < rowElems.length; i++ ) {
            res.push( rowElems[ i ].getElementsByClassName( _t.Const.CLASS_CELL )[ idx ] );
        }

        return res;
    };

    self.queryAllRowCellElementsFromTable = function() {
        var rowElements = [];
        var pinnedElements = self.getPinContentRowElementsFromTable();
        for( var i = 0; i < pinnedElements.length; i++ ) {
            rowElements.push( pinnedElements[ i ] );
        }
        var scrollContentElements = self.getScrollContentRowElementsFromTable();
        for( var j = 0; j < scrollContentElements.length; j++ ) {
            rowElements.push( scrollContentElements[ j ] );
        }
        return rowElements;
    };

    self.queryContentCellFromTable = function( rowIdx, columnIdx ) {
        var pinColumnCount = _t.util.getTableController( _table ).getPinColumnCount();
        if( columnIdx < pinColumnCount ) {
            return self.queryPinContainerFromTable().toContentRow( rowIdx ).toContentCell( columnIdx );
        }
        return self.queryScrollContainerFromTable().toContentRow( rowIdx ).toContentCell( columnIdx );
    };

    self.queryTableMenu = function( id ) {
        _elem = document.getElementById( id + '_menu' );
        return this;
    };

    self.queryResizeGripFromTable = function() {
        _elem = _table.getElementsByClassName( _t.Const.CLASS_COLUMN_RESIZE_GRIP )[ 0 ];
        return this;
    };

    self.queryContextMenuFromTable = function() {
        _elem = document.getElementsByClassName( _t.Const.CLASS_AW_POPUP )[ 0 ];
        return this;
    };

    self.getContentCellElementsFromTable = function() {
        _elem = _table;
        return self.getContentCellElements();
    };

    // Get element method
    self.getRootElement = function( className ) {
        if( !className ) {
            className = _t.Const.CLASS_AW_ROOT_ELEMENT;
        }

        var rootElem = document.getElementsByClassName( className )[ 0 ];
        if( !rootElem ) {
            rootElem = document;
        }
        return rootElem;
    };

    self.getHeaderCellElementsFromTable = function() {
        return _table.getElementsByClassName( _t.Const.CLASS_HEADER_CELL ) || [];
    };

    self.getHeaderRowWidthFromTable = function() {
        return self.queryPinContainerFromTable().toHeader().getWidth() + self.queryScrollContainerFromTable().toHeader().getWidth();
    };

    self.getContentRowWidthFromTable = function() {
        return self.queryPinContainerFromTable().toContentRow( 0 ).getWidth() + self.queryScrollContainerFromTable().toContentRow( 0 ).getWidth();
    };

    self.getScrollCanvasElementFromTable = function() {
        return self.queryScrollContainerFromTable().toCanvas().getElement();
    };

    self.getPinCanvasElementFromTable = function() {
        return self.queryPinContainerFromTable().toCanvas().getElement();
    };

    self.getPropertyValueLinkElement = function( index, cell ) {
        index = index || 0;
        var elem1 = cell || _elem;
        return elem1.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS )[ index ];
    };

    self.getCellTextElementFromTableCell = function( cellElement, index ) {
        index = index || 0;
        var elem = cellElement || _elem;
        return elem.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT )[ index ];
    };

    self.getTableContainerElementFromTable = function() {
        return _table.getElementsByClassName( _t.Const.CLASS_TABLE_CONTAINER )[ 0 ];
    };

    self.getPinContainerElementFromTable = function() {
        return self.queryPinContainerFromTable().getElement();
    };

    self.getScrollContainerElementFromTable = function() {
        return self.queryScrollContainerFromTable().getElement();
    };

    self.getPinContentElementFromTable = function() {
        return self.queryPinContentFromTable().getElement();
    };

    self.getScrollContentElementFromTable = function() {
        return self.queryScrollContentFromTable().getElement();
    };

    self.getPinContentRowElementsFromTable = function() {
        return self.queryPinContentFromTable().getContentRowElements();
    };

    self.getScrollContentRowElementsFromTable = function() {
        return self.queryScrollContentFromTable().getContentRowElements();
    };

    self.getPinHeaderElementFromTable = function() {
        return self.queryPinContainerFromTable().toHeaderRow().getElement();
    };

    self.getScrollHeaderElementFromTable = function() {
        return self.queryScrollContainerFromTable().toHeaderRow().getElement();
    };

    self.getPinContentRowElementFromTable = function( rowIdx ) {
        return self.getPinContentRowElementsFromTable()[ rowIdx ];
    };

    self.getScrollContentRowElementFromTable = function( rowIdx ) {
        return self.getScrollContentRowElementsFromTable()[ rowIdx ];
    };

    self.getContentCellFromTable = function( rowIdx, colIdx ) {
        return self.queryContentCellFromTable( rowIdx, colIdx ).getElement();
    };

    self.getHeaderCellElementFromTable = function( colIdx ) {
        return self.queryHeaderCellContentFromTable( colIdx ).getElement();
    };

    self.getHeaderCellSortIconElementFromTable = function( colIdx ) {
        return self.queryHeaderCellContentFromTable( colIdx ).toSortIcon().getElement();
    };

    return self;
};

// NOTE: Not all sub-modules needs this way to register itself to _t, the rule is:
// If the sub-module is used heavily by DomCtrl and outer function - us this approach
// If the sub-module is only used by outter function - register it in splmTableNative
//_t.Trv = SPLMTableTraversal;
export default SPLMTableTraversal;
