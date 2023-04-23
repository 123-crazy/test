/* eslint-disable max-lines */
/* eslint-disable no-await-in-loop */
// Copyright (c) 2020 Siemens
/**
 * This service is used for simpletabe as Dom Controller, play table row/cell instead of DOM Structure
 *
 * @module js/splmTableDomController
 *
 * DOM Structure
 * <aw-splm-table>
 *   CLASS_TABLE|aw-splm-table
 *     CLASS_TABLE_CONTAINER|aw-splm-tableContainer
 *       CLASS_COLUMN_RESIZE_GRIP|aw-splm-tableColumnResizeGrip -> grip for resize
 *       CLASS_PIN_CONTAINER|aw-splm-tablePinnedContainer
 *           CLASS_HEADER_ROW|aw-splm-tableHeaderRow
 *             CLASS_HEADER_CELL|aw-splm-tableHeaderCell
 *               CLASS_HEADER_CELL_CONTENT|aw-splm-tableHeaderCellContents
 *                 CLASS_HEADER_CELL_LABEL|aw-splm-tableHeaderCellLabel
 *                 CLASS_HEADER_CELL_SORT_ICON|aw-splm-tableHeaderCellSortIcon
 *                 CLASS_HEADER_CELL_MENU_ICON|aw-splm-tableHeaderCellMenuIcon
 *               CLASS_HEADER_CELL_SPLITTER|aw-splm-tableHeaderCellSplitter
 *           CLASS_VIEWPORT|aw-splm-tableViewport
 *             CLASS_ROW|aw-splm-tableRow
 *               CLASS_CELL|ui-grid-cell
 *       CLASS_SCROLL_CONTAINER|aw-splm-tableScrollContainer
 *           CLASS_HEADER_ROW|ui-grid-header-cell-row
 *             CLASS_HEADER_CELL|aw-splm-tableHeaderCell
 *               CLASS_HEADER_CELL_CONTENT|aw-splm-tableHeaderCellContents
 *                 CLASS_HEADER_CELL_LABEL|aw-splm-tableHeaderCellLabel
 *                 CLASS_HEADER_CELL_SORT_ICON|aw-splm-tableHeaderCellSortIcon
 *                 CLASS_HEADER_CELL_MENU_ICON|aw-splm-tableHeaderCellMenuIcon
 *                 CLASS_HEADER_CELL_SPLITTER|aw-splm-tableHeaderCellSplitter
 *           CLASS_VIEWPORT|aw-splm-tableViewport
 *             CLASS_ROW|aw-splm-tableRow
 *             CLASS_CELL|ui-grid-cell
 *     CLASS_TABLE_MENU_CONTAINER|aw-splm-tableMenuContainer
 *       CLASS_TABLE_MENU|aw-splm-tableMenu
 *
 *
 * CLASS_TABLE_MENU_CONTAINER|aw-splm-tableMenuContainer
 *   CLASS_TABLE_MENU|aw-splm-tableMenu
 *     CLASS_TABLE_MENU_ITEM|aw-splm-tableMenuItem
 *
 */
import _ from 'lodash';
import eventBus from 'js/eventBus';
import _t from 'js/splmTableNative';
import logger from 'js/logger';
import splmTableColumnResizer from 'js/splmTableColumnResizer';
import awEventHelperService from 'js/awEventHelperService';
import wcagService from 'js/wcagService';

// Bootstrap for _t to make coding pattern consistent

/**
 * Instances of this class represent a column resizer for PL Table
 *
 * @class SimpleTableDomController
 * @param {DOMElement} tableElem - HTML DOM Element for table
 * @param {Array} columnDefs - Array of Column Definitions
 * @param {Object} tableEditor - the table editor instance
 */
var SPLMTableDomController = function( tableElem, columnDefs, tableEditor ) {
    // Class definition   //Dummy comment
    var self = this;
    var _table = tableElem;
    var _trv = new _t.Trv( tableElem );
    var _menuService = _t.util.getTableMenuService( tableElem );
    var _columnDefs = columnDefs;
    var _tableInstance = tableElem._tableInstance;
    var _keyboardService = _tableInstance.keyboardService;

    var _grip = null;
    // Pin/freeze context
    var _pinColumnCount = 0;
    var _pinContainerWidth = 0;
    var _scrollContainerWidth = 0;
    var _alignContainersForCheckbox = false;
    var _scrollColumnsInView = {
        start: null,
        end: null
    };
    const ariaColIndex = 'aria-colindex';
    const ariaRowIndex = 'aria-rowindex';
    const ariaRowCount = 'aria-rowcount';
    const dataIndexNumber = 'data-indexnumber';

    // ////////////////////////////////////////////////
    // Internal
    // ////////////////////////////////////////////////
    var _getSortClassName = function( sortType ) {
        if( typeof sortType === 'string' ) {
            sortType = sortType.toUpperCase();
            if( sortType === 'ASC' ) {
                return _t.Const.CLASS_ICON_SORT_ASC;
            } else if( sortType === 'DESC' ) {
                return _t.Const.CLASS_ICON_SORT_DESC;
            } else if( sortType === '' ) {
                return _t.Const.CLASS_ICON_SORTABLE;
            }
        }
        return _t.Const.CLASS_ICON_NON_SORTABLE;
    };

    self.setPinContext = function( lastPinIndex ) {
        // Get the right most pinnedLeft option then set pinCount
        if( lastPinIndex !== undefined && lastPinIndex !== null ) {
            _pinColumnCount = lastPinIndex + 1;
        } else {
            var rightMostPinIdx = -1;
            _.forEach( _columnDefs, function( column, idx ) {
                if( column.pinnedLeft === true ) {
                    rightMostPinIdx = idx;
                }
            } );
            // _pinColumnCount will be greater than zero if any column is pinned or frozen by the user.
            // We should not reset this value if it is greater than zero.
            if( _pinColumnCount === 0 ) {
                _pinColumnCount = rightMostPinIdx + 1;
            }
        }

        _pinContainerWidth = 0;
        _scrollContainerWidth = 0;
        for( var i = 0; i < _columnDefs.length; i++ ) {
            if( i < _pinColumnCount ) {
                _columnDefs[ i ].pinnedLeft = true;
                _columnDefs[ i ].startPosition = _pinContainerWidth;
                _pinContainerWidth += _columnDefs[ i ].drawnWidth;
            } else {
                _columnDefs[ i ].pinnedLeft = false;
                _columnDefs[ i ].startPosition = _scrollContainerWidth;
                _scrollContainerWidth += _columnDefs[ i ].drawnWidth;
            }
        }
    };

    /**
     * @memberOf js/splmTableDomController
     *
     * Get pin column count in the table
     *
     * @return {Number} pin column count in the table
     */
    self.getPinColumnCount = function() {
        return _pinColumnCount;
    };

    /**
     * New design decided in 20180724:
     *   1. If width=<number>, we use it.
     *   2. If width = *, we make it as minWidth + 25%* minWidth.
     *   3. If minWidth + 25% > maxWidth, use maxWidth.
     *   4. Don't use ui-grid column splitter design, put the splitter at the right side of the
     *      column. Adapt CSS properly
     *
     * For the issue we faced in real autoWidth design:
     *   1. Horizontal Scroll bar will appear/disappear randomly when sum(cellWidth) == canvasWidth.
     *      - This should be resolved by new design but will rehearsal if it is not.
     *
     *   2. The listener for resize when autoWidth exist.
     *      - This is not needed for new design.
     */
    self.initializeColumnWidths = function() {
        _.forEach( _columnDefs, function( column ) {
            var width = 0;
            if( column.name === 'icon' ) {
                width = _t.util.getTableRowHeight( _tableInstance.gridOptions, _t.Const.WIDTH_DEFAULT_ICON_COLUMN_WIDTH );
                if( width !== _t.Const.WIDTH_DEFAULT_ICON_COLUMN_WIDTH ) {
                    /** We have some pedding in icon rendering column and to render the complete icon, we need to
                     increase width of icon renderer by 8 units **/
                    width += 8;
                }
            } else if( column.width > 0 ) {
                width = column.width;
            } else {
                width = column.minWidth > 0 ? column.minWidth : _t.Const.WIDTH_DEFAULT_MINIMUM_WIDTH;
                width = Math.floor( 1.25 * width );
                width = column.maxWidth > 0 && column.maxWidth < width ? column.maxWidth : width;
            }
            column.width = width;
            column.drawnWidth = width;
        } );
    };

    // set aria-colcount to a number of columns which are visible in the DOM
    self.setAriaColCount = function( tableContainer, columns ) {
        if( columns !== undefined ) {
            var tableCols = columns;
            var visibleCols = tableCols.filter( column => column.hiddenFlag !== undefined && !column.hiddenFlag );
            var visibleColsLength = visibleCols.length;
            //If table has icon column then increase the visibleCols.length by 1 to consider icon column. Icon column doesn't have hiddenFlag variable defined
            if( columns[ 0 ].name === 'icon' ) {
                visibleColsLength++;
            }
            tableContainer.setAttribute( 'aria-colcount', visibleColsLength );
        } else {
            tableContainer.setAttribute( 'aria-colcount', -1 );
        }
    };

    // set aria-colcount to a number of columns which are visible in the DOM
    self.setAriaRowCount = function( tableContainer ) {
        if( _tableInstance.dataProvider.json && _tableInstance.dataProvider.json.firstPage && _tableInstance.dataProvider.action && _tableInstance.dataProvider.action.inputData.searchInput ) {
            tableContainer.setAttribute( ariaRowCount, _tableInstance.dataProvider.json.firstPage.length + 1 );
        } else {
            if( _tableInstance.dataProvider.viewModelCollection && _tableInstance.dataProvider.viewModelCollection.totalFound ) {
                tableContainer.setAttribute( ariaRowCount, _tableInstance.dataProvider.viewModelCollection.totalFound + 1 );
            } else {
                tableContainer.setAttribute( ariaRowCount, -1 );
            }
        }
    };

    // set describedby and aria-labelledby to a caption or label element id which labels or describes the table
    self.setAriaLabelledAndDescribedBy = function( directiveElement, tableContainer ) {
        if( directiveElement ) {
            if( directiveElement.getAttribute( 'labelled-by' ) ) {
                tableContainer.setAttribute( 'aria-labelledby', directiveElement.getAttribute( 'labelled-by' ) );
            }
            if( directiveElement.getAttribute( 'described-by' ) ) {
                tableContainer.setAttribute( 'aria-describedby', directiveElement.getAttribute( 'described-by' ) );
            }
        }
    };
    // Scroll content width must be at least 1px to ensure pin/scroll syncing keeps working
    // when there are no columns in either of the containers
    var _setScrollContentMinWidth = function( scrollContentElement, width ) {
        var adjustedWidth = width > 0 ? width : 1;
        scrollContentElement.style.minWidth = adjustedWidth + 'px';
    };

    var _setPinHeaderWidth = function( width ) {
        var headerElem = _trv.getPinHeaderElementFromTable();
        var pinContentElem = _trv.getPinContentElementFromTable();
        headerElem.style.minWidth = String( width ) + 'px';
        _setScrollContentMinWidth( pinContentElem, width );
    };

    var _setScrollHeaderWidth = function( width ) {
        var headerElem = _trv.getScrollHeaderElementFromTable();
        var scrollContentElem = _trv.getScrollContentElementFromTable();
        headerElem.style.minWidth = String( width ) + 'px';
        var scrollContentMinWidth = parseInt( width, 10 ) - parseInt( scrollContentElem.style.paddingLeft, 10 );
        _setScrollContentMinWidth( scrollContentElem, scrollContentMinWidth );
    };

    var _setHeaderColumnWidth = function( columnIdx, width ) {
        var headerCellElem = _trv.getHeaderCellElementFromTable( columnIdx );

        // update current cell width
        headerCellElem.style.width = String( width ) + 'px';
    };

    var _setContentRowWidth = function( rowElem, width ) {
        rowElem.style.minWidth = String( width ) + 'px';
    };

    var _getContentRowCount = function() {
        var _length = 0;
        var rows = _trv.getScrollContentRowElementsFromTable();
        if( rows ) {
            _length = rows.length;
        }
        return _length;
    };

    var _setContentColumnWidth = function( columnIdx, width ) {
        var rowCnt = _getContentRowCount();
        for( var i = 0; i < rowCnt; i++ ) {
            var rowCellElem = _trv.getContentCellFromTable( i, columnIdx );
            var prevWidth = self.getColumnWidth( columnIdx );
            if( columnIdx < _pinColumnCount ) {
                var pinRowElem = _trv.getPinContentRowElementFromTable( i );
                _setContentRowWidth( pinRowElem, _pinContainerWidth + width - prevWidth );
            } else {
                var scrollRowElem = _trv.getScrollContentRowElementFromTable( i );
                _setContentRowWidth( scrollRowElem, _scrollContainerWidth + width - prevWidth );
            }
            rowCellElem.style.width = String( width ) + 'px';
        }
    };

    /**
     * Set the class and title for the filter icon element.
     *
     * @param {HTMLElement} iconElement - Filter icon element
     * @param {Object} filter - filter object from column
     */
    var _applyFilterIcon = function( iconElement, filter ) {
        iconElement.classList.add( _t.Const.CLASS_HEADER_CELL_FILTER_APPLIED_ICON );
        iconElement.title = filter.summaryText;
    };

    /**
     * Set the class and title for the filter icon element.
     *
     * @param {Object} column - the column
     * @param {number} columnIndex - the column index
     * @param {string} sortDirection - the sort direction
     * @param {number} startPosition - the start position of the column
     *
     * @return {HTMLElement} - the header container
     */
    const _buildHeaderCellContainer = function( column, columnIndex, sortDirection, startPosition ) {
        //Header cell container
        let headerContainer = document.createElement( 'div' );
        headerContainer.classList.add( _t.Const.CLASS_HEADER_CELL, _t.Const.CLASS_NO_SELECT );
        headerContainer.tabIndex = -1;
        _keyboardService.setOnFocusAndBlur( headerContainer );
        headerContainer.setAttribute( 'role', 'columnheader' );
        headerContainer.setAttribute( ariaColIndex, columnIndex + 1 );

        //Column Def Anchor
        let columnDefElem = document.createElement( 'div' );
        columnDefElem.classList.add( _t.Const.CLASS_COLUMN_DEF );
        columnDefElem.classList.add( _t.Const.CLASS_CELL_CONTENTS );
        columnDefElem.classList.add( _t.Const.CLASS_HEADER_CLEARFIX );
        columnDefElem.classList.add( _t.Const.CLASS_HEADER_CELL_CONTENT );
        columnDefElem.style.width = String( column.drawnWidth ) + 'px';
        columnDefElem.columnDef = column;

        // Enable column selection when click on the header element in transpose mode
        if( _tableInstance.gridOptions.transpose === true ) {
            columnDefElem.onclick = _t.SelectionHelper.selectionChanged( _table );
        }

        if( column.headerTooltip !== false && column.headerTooltip === true ) {
            columnDefElem.title = column.displayName;
        }

        headerContainer.appendChild( columnDefElem );

        // Splitter for resize
        // Firefox limitation: element must be appended on left if it has 'float:right'
        let resizeElem = document.createElement( 'div' );
        resizeElem.classList.add( _t.Const.CLASS_HEADER_CELL_SPLITTER );
        if( column.enableColumnResizing ) {
            headerContainer.insertBefore( resizeElem, columnDefElem );
            splmTableColumnResizer.applyColumnResizeHandler( self, resizeElem, _menuService ); //last prop = _menu
        }

        //Create Inner element
        let innerElem = _t.Cell.createHeaderElement( column, tableElem );
        innerElem.classList.add( _t.Const.CLASS_HEADER_CELL_INNER );
        columnDefElem.appendChild( innerElem );

        //Create Sort element
        let sortElem = document.createElement( 'i' );
        sortElem.classList.add( _t.Const.CLASS_HEADER_CELL_SORT_ICON );
        sortElem.classList.add( _getSortClassName( sortDirection ) );
        sortElem.title = '';
        columnDefElem.appendChild( sortElem );
        let sortDir;
        if( sortDirection !== null && sortDirection !== '' ) {
            // aria-sort supported sort values are ascending, descending, none and other.
            sortDir = sortDirection.toLowerCase().includes( 'desc' ) ? 'descending' : 'ascending';
            headerContainer.setAttribute( 'aria-sort', sortDir );
        }

        //Create Filter element
        let filterElem = document.createElement( 'i' );
        filterElem.classList.add( _t.Const.CLASS_HEADER_CELL_FILTER_ICON );
        if( column.filter && column.filter.isFilterApplied ) {
            _applyFilterIcon( filterElem, column.filter );
        } else {
            filterElem.title = '';
        }
        columnDefElem.appendChild( filterElem );

        if( column.enableColumnMenu === true ) {
            columnDefElem.classList.add( _t.Const.CLASS_COLUMN_MENU_ENABLED );
            columnDefElem.setAttribute( 'role', 'button' );
            columnDefElem.setAttribute( 'aria-haspopup', 'true' );
            columnDefElem.addEventListener( 'click', _menuService.columnMenuHandler( columnDefElem ) );
            headerContainer.addEventListener( 'keydown', function( event ) {
                if( wcagService.isValidKeyPress( event ) ) {
                    _menuService.columnMenuHandler( columnDefElem, true )( event );
                }
            } );
        }

        column.startPosition = startPosition;

        return headerContainer;
    };

    var _insertColumnHeaders = function( headerElement, startIdx, endIdx ) {
        let columnDefs = _columnDefs;
        let totalColumnHeaderWidth = 0;
        //only add role=row if we are sure role=columnheader will be added as its descendents else it will cause aria-required-children violation.
        if( startIdx < endIdx ) {
            headerElement.setAttribute( 'role', 'row' );
            //aria-rowindex always starts from 1. For header row, it is 1 and for the actual rows, it starts from 2.
            headerElement.setAttribute( ariaRowIndex, 1 );
        }
        for( let idx = startIdx; idx < endIdx; idx++ ) {
            let column = columnDefs[ idx ];
            let sortDirection = null;

            if( _tableInstance.gridOptions.enableSorting !== false && column.enableSorting ) {
                if( column.sort && column.sort.direction ) {
                    sortDirection = column.sort.direction;
                } else {
                    sortDirection = '';
                }
            }

            const headerContainer = _buildHeaderCellContainer( column, idx, sortDirection, totalColumnHeaderWidth );
            totalColumnHeaderWidth += column.drawnWidth;

            //Add header container to header element
            headerElement.appendChild( headerContainer );
        }
        let headerHeight = _t.util.getTableHeaderHeight( _tableInstance.gridOptions, _t.Const.HEIGHT_HEADER ) + 'px';
        headerElement.style.height = headerHeight;
        headerElement.style.minHeight = headerHeight;
        headerElement.style.maxHeight = headerHeight;
        headerElement.style.minWidth = String( totalColumnHeaderWidth ) + 'px';
    };

    var _createGrip = function() {
        _grip = document.createElement( 'div' );
        _grip.classList.add( _t.Const.CLASS_COLUMN_RESIZE_GRIP );
        _grip.style.position = 'absolute';
        _grip.style.height = '100%';

        // Try to make border in the middle
        var subGrip = document.createElement( 'div' );
        subGrip.style.borderLeft = '1px solid';
        subGrip.style.marginLeft = '30px';
        subGrip.style.height = '100%';
        _grip.appendChild( subGrip );

        _grip.style.zIndex = '1000';
        _grip.style.cursor = 'col-resize';
        _grip.style.outline = '20px transparent';
        _grip.style.width = '60px';
        _grip.style.display = 'none';
        return _grip;
    };

    var removeHoverClassFromRows = function() {
        var rows = _trv.getTableContainerElementFromTable().getElementsByClassName( 'ui-grid-row' );
        for( var i = 0; i < rows.length; i++ ) {
            rows[ i ].classList.remove( _t.Const.CLASS_ROW_HOVER );
        }
    };

    var removeHoverClassesRaf = function() {
        requestAnimationFrame( function() {
            removeHoverClassFromRows();
        } );
    };

    var _constructTableElement = function() {
        var columnDefs = _columnDefs;

        // Table Container
        var tableContainer = document.createElement( 'div' );
        tableContainer.classList.add( _t.Const.CLASS_TABLE_CONTAINER );
        tableContainer.tabIndex = 0;
        if( _tableInstance.gridOptions.useTree === true ) {
            tableContainer.setAttribute( 'role', 'treegrid' );
        } else {
            tableContainer.setAttribute( 'role', 'grid' );
        }
        if( _tableInstance.dataProvider.selectionModel.mode === 'multiple' ) {
            tableContainer.setAttribute( 'aria-multiselectable', 'true' );
        } else {
            tableContainer.setAttribute( 'aria-multiselectable', 'false' );
        }
        self.setAriaRowCount( tableContainer );
        self.setAriaColCount( tableContainer, _tableInstance.dataProvider.cols );

        _table.appendChild( tableContainer );

        self.initializeColumnWidths();

        // Do pin initialization after eval column width so we could
        // Dummy Comment
        // collect container size together
        self.setPinContext();

        // Create dragging grip.
        tableContainer.appendChild( _createGrip() );

        var pinContainer = document.createElement( 'div' );
        pinContainer.classList.add( _t.Const.CLASS_PIN_CONTAINER );
        pinContainer.classList.add( _t.Const.CLASS_PIN_CONTAINER_LEFT );

        var pinHeaderElem = document.createElement( 'div' );
        pinHeaderElem.classList.add( _t.Const.CLASS_HEADER_ROW );
        _insertColumnHeaders( pinHeaderElem, 0, _pinColumnCount );
        pinContainer.appendChild( pinHeaderElem );

        var pinScrollContainer = document.createElement( 'div' );
        pinScrollContainer.classList.add( _t.Const.CLASS_CANVAS );
        pinScrollContainer.classList.add( _t.Const.CLASS_VIEWPORT );

        var pinScrollContents = document.createElement( 'div' );
        pinScrollContents.addEventListener( 'mouseleave', function() {
            removeHoverClassesRaf();
        } );
        pinScrollContents.classList.add( _t.Const.CLASS_SCROLL_CONTENTS );
        _setScrollContentMinWidth( pinScrollContents, parseInt( pinHeaderElem.style.minWidth, 10 ) );

        pinScrollContainer.appendChild( pinScrollContents );
        pinContainer.appendChild( pinScrollContainer );

        tableContainer.appendChild( pinContainer );

        var scrollContainer = document.createElement( 'div' );
        scrollContainer.classList.add( _t.Const.CLASS_SCROLL_CONTAINER );
        scrollContainer.style.marginLeft = String( _pinContainerWidth ) + 'px';

        // Create Columns in memory
        var scrollHeaderElem = document.createElement( 'div' );
        scrollHeaderElem.classList.add( _t.Const.CLASS_HEADER_ROW );
        _insertColumnHeaders( scrollHeaderElem, _pinColumnCount, columnDefs.length );
        scrollContainer.appendChild( scrollHeaderElem );

        // Create row Contents in memory
        var rowsContainer = document.createElement( 'div' );
        rowsContainer.classList.add( _t.Const.CLASS_VIEWPORT );
        rowsContainer.classList.add( _t.Const.CLASS_CANVAS );

        var scrollContents = document.createElement( 'div' );
        scrollContents.addEventListener( 'mouseleave', function() {
            removeHoverClassesRaf();
        } );
        scrollContents.classList.add( _t.Const.CLASS_SCROLL_CONTENTS );
        _setScrollContentMinWidth( scrollContents, parseInt( scrollHeaderElem.style.minWidth, 10 ) );

        rowsContainer.appendChild( scrollContents );

        scrollContainer.appendChild( rowsContainer );
        tableContainer.appendChild( scrollContainer );
    };

    /**
     * @memberOf js/aw-splm-table.directive
     *
     * Creates and returns a DOMElement for the propertyCell of the passed in view model object (vmo) which defines the row
     * and the given column (columnInfo )
     * @param {Object} column - Declarative columnInfo object
     * @param {Object} vmo - Declarative view model object (e.g. row)
     * @param {Number} columnWidth - Width of the iconCellColumn
     * @param {DOMElement} rowElem - row DOMElement
     * @return {HTMLElement} The newly created DOMElement for the property cell
     */
    const _createPropertyCell = async function( column, vmo, columnWidth, rowElem ) {
        const cell = _t.util.createElement( 'div', _t.Const.CLASS_CELL );
        cell.tabIndex = -1;
        if( _tableInstance.dynamicRowHeightStatus ) {
            cell.classList.add( _t.Const.CLASS_CELL_DYNAMIC );
        }

        try {
            cell.appendChild( _t.Cell.createElement( column, vmo, tableElem, rowElem ) );
        } catch ( e ) {
            // some issue in creating element
            logger.error( e );
        }
        cell.style.width = String( columnWidth ) + 'px';
        if( column.field === 'transposedColumnProperty' ) {
            cell.setAttribute( 'role', 'rowheader' );
        } else {
            cell.setAttribute( 'role', 'gridcell' );
        }

        const ctx = _tableInstance.ctx;
        const defaultRowHeight = ctx.layout === 'compact' ? _t.Const.HEIGHT_COMPACT_ROW : _t.Const.HEIGHT_ROW;
        const rowHeight = _t.util.getTableRowHeight( _tableInstance.gridOptions, defaultRowHeight );
        cell.style.height = _tableInstance.dynamicRowHeightStatus ? 'auto' : rowHeight + 'px';
        cell.propName = column.field;
        cell.columnDef = column;
        if( vmo.props ) {
            cell.prop = vmo.props[ column.field ];
        }

        const cellTops = cell.getElementsByClassName( 'aw-splm-tableCellTop' );
        if( cellTops.length > 0 ) {
            _t.util.addCSSClassForRowHeight( cellTops[ 0 ], _tableInstance.gridOptions );
        }

        const idxNum = document.createAttribute( dataIndexNumber );
        idxNum.value = column.index;
        if( column.index >= _pinColumnCount ) {
            idxNum.value = column.index - _pinColumnCount;
        }
        cell.setAttributeNode( idxNum );

        // aria-colindex always starts with index 1.
        cell.setAttribute( ariaColIndex, column.index + 1 );
        // Set click listener for cell to get editable states
        tableEditor.addCellClickListener( cell, vmo );
        _keyboardService.setOnFocusAndBlur( cell );
        _keyboardService.setupInternalCellNavigation( cell );

        return cell;
    };

    /**
     * Adds the aria attributes for tree if the row is part of a tree table
     * @param {HTMLElement} row - the row element
     * @param {Object} vmo - Declarative view model object (e.g. row)
     */
    const _setAriaAttributesForTreeRow = function( row, vmo ) {
        if( _tableInstance.gridOptions.useTree === true ) {
            if( vmo.isLeaf === false ) {
                if( vmo.isExpanded === true ) {
                    row.setAttribute( 'aria-expanded', 'true' );
                } else {
                    row.setAttribute( 'aria-expanded', 'false' );
                }
            }
            // aria-level starts from index 1.
            row.setAttribute( 'aria-level', vmo.levelNdx + 1 );
        }
    };

    /**
     * Adds the mouseenter event listener to apply hover styling to the row.
     * @param {HTMLElement} row - the row element
     */
    const _addRowHoverListener = function( row ) {
        row.addEventListener( 'mouseenter', function( event ) {
            const hoveredRow = event.currentTarget;
            requestAnimationFrame( function() {
                removeHoverClassFromRows();
                const index = _t.util.getIndexInParent( hoveredRow );
                const scrollRow = _trv.getScrollContentRowElementFromTable( index );
                const pinRow = _trv.getPinContentRowElementFromTable( index );
                scrollRow.classList.add( _t.Const.CLASS_ROW_HOVER );
                pinRow.classList.add( _t.Const.CLASS_ROW_HOVER );
            } );
        } );
    };

    /**
     * Adds the selection checkbox to the row
     * @param {HTMLElement} row - the row element
     * @param {HTMLElement} tableElem - the table element
     * @param {Object[]} columnDefs - array of column defs
     */
    const _addRowCheckBox = function( row, tableElem, columnDefs ) {
        const commandBarHtml =
            '<div class="aw-splm-tableCheckBoxPresent" >' + //
            '<a class="aw-commands-cellCommandCommon">' + //
            '<div class="afx-checkbox afx-checkbox-label-side">' + //
            '<input type="checkbox" class="aw-jswidgets-checkboxButton"/>' + //
            '<span class="afx-checkbox-md-style">' + //
            '<span class="check"></span>' + //
            '</span>' + //
            '</div>' + //
            '</a>' + //
            '</div>'; //
        let cellScope = {};

        let checkBox = _t.util.createNgElement( commandBarHtml, tableElem, cellScope );
        let commandDef = columnDefs.filter( function( def ) {
            if( def.isTableCommand || def.isTreeNavigation ) {
                return true;
            }
            return false;
        } )[ 0 ];
        let propName = commandDef && ( commandDef.propertyName || commandDef.name );
        if( propName && row.vmo.props && row.vmo.props[ propName ] ) {
            let value = row.vmo.props[ propName ].uiValue;
            if( checkBox ) {
                checkBox.getElementsByTagName( 'input' )[ 0 ].setAttribute( 'aria-label', value );
            }
        }
        if( checkBox ) {
            row.appendChild( checkBox );
        }
    };

    /**
     * Creates and returns a DOMElement for the TableRow of the passed in view model object (vmo) which defines the row
     * Will Create cells for each column using the vmo properties associated by propertyName.  Also will prepend an
     * iconCell at the beginning of the row.  Appropriate rowSelection callback will be added too.
     * @param {Object} vmo - Declarative view model object (e.g. row)
     * @param {number} rowHeight - the pixel row height
     * @param {number} startIdx - the column start index
     * @param {number} endIdx - the column end index
     *
     * @return {HTMLElement} row - the created row element
     */
    const _createContentRowElement = async function( vmo, rowHeight, startIdx, endIdx ) {
        const columnDefs = _columnDefs;
        const row = _t.util.createElement( 'div', _t.Const.CLASS_ROW, _t.Const.CLASS_UI_GRID_ROW, _t.Const.CLASS_ROW_ICON );
        let rowWidth = 0;
        row.vmo = vmo;
        //only add role=row if we are sure role=gridcell or role=rowheader will be added as its descendents else it will cause aria-required-children violation.
        if( startIdx <= endIdx ) {
            row.setAttribute( 'role', 'row' );
        }

        _setAriaAttributesForTreeRow( row, vmo );

        // LCS-286849 - jQuery has issues with handling touch to click events on mobile
        const target = {
            default: row,
            mobile: row
        };
        const eventObject = {
            click: 'touchend'
        };
        awEventHelperService.subscribeMouseEvent( target, eventObject, _t.SelectionHelper.selectionChanged( _table ) );

        row.oncontextmenu = _menuService.contextSelectionHandler;
        row.draggable = true;

        _addRowHoverListener( row );

        if( vmo.rowStatus && vmo.rowStatus === 'ADDED' ) {
            row.classList.add( 'aw-jswidgets-change' );
        } else if( vmo.rowStatus && vmo.rowStatus === 'REMOVED' ) {
            row.classList.add( 'aw-jswidgets-oldText' );
        }

        let adjustedColumnDefs = _.sortBy( columnDefs, function( columnDef ) {
            return columnDef.index;
        } );

        let cellPromiseArray = [];

        for( let i = startIdx; i <= endIdx; i++ ) {
            const column = adjustedColumnDefs[ i ];
            let _width = column.drawnWidth;
            const showCheckBox = _tableInstance.gridOptions.showCheckBox;
            if( i === 0 && showCheckBox ) {
                _addRowCheckBox( row, tableElem, adjustedColumnDefs );
            }
            cellPromiseArray.push( _createPropertyCell( column, vmo, _width, row ) );

            if( row.vmo.props && row.vmo.props[ column.field ] ) {
                row.vmo.props[ column.field ].renderingHint = column.renderingHint;
            }
            rowWidth += _width;
        }
        let cellsArr = await Promise.allSettled( cellPromiseArray );
        for( let i = 0; i < cellsArr.length; i++ ) {
            row.appendChild( cellsArr[ i ].value );
        }

        row.style.minWidth = String( rowWidth ) + 'px';
        row.style.minHeight = String( rowHeight ) + 'px';

        return row;
    };

    /**
     * Remove the class and title from the filter icon element.
     *
     * @param {HTMLElement} iconElement - Filter icon element
     */
    var _removeFilterIcon = function( iconElement ) {
        iconElement.classList.remove( _t.Const.CLASS_HEADER_CELL_FILTER_APPLIED_ICON );
        iconElement.title = '';
    };

    self.updateScrollColumnsInView = function( scrollLeft, scrollContainerWidth ) {
        var headerCells = _trv.getScrollHeaderElementFromTable().children;
        // Find start and end visible columns
        var extraColumns = 3;
        var start = null;
        var end = null;
        var totalHeaderCells = headerCells.length;

        // Return all columns as in view if container width given is null or undefined
        if( scrollContainerWidth === null || scrollContainerWidth === undefined || scrollContainerWidth === 0 ) {
            _scrollColumnsInView = { start: 0, end: totalHeaderCells - 1 };
            return;
        }

        for( var i = 0; i < totalHeaderCells; i++ ) {
            var column = headerCells[ i ].getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ].columnDef;
            var columnStartPosition = column.startPosition;

            if( columnStartPosition <= scrollLeft ) {
                start = i;
            }
            if( columnStartPosition <= scrollLeft + scrollContainerWidth ) {
                end = i;
            }
        }

        start = start - extraColumns < 0 ? 0 : start - extraColumns;
        end = end + extraColumns > totalHeaderCells - 1 ? totalHeaderCells - 1 : end + extraColumns;

        _scrollColumnsInView = { start: start, end: end };
    };

    self.updateVisibleCells = async function( rowParentElem ) {
        const startColumnIdx = _scrollColumnsInView.start;
        const endColumnIdx = _scrollColumnsInView.end;
        rowParentElem = rowParentElem.childNodes;
        const scrollHeader = _trv.getScrollHeaderElementFromTable();
        const scrollContentElem = _trv.getScrollContentElementFromTable();
        const headerCells = scrollHeader.children;
        let minWidth = 0;

        for( let i = startColumnIdx; i < headerCells.length; i++ ) {
            const column = headerCells[ i ].getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ].columnDef;
            if( startColumnIdx !== null ) {
                minWidth += column.drawnWidth;
            }
        }

        let paddingLeft = null;
        const scrollHeaderElemMinWidth = scrollHeader.style.minWidth;
        if( startColumnIdx > 0 ) {
            const paddingLeftColumnDef = headerCells[ startColumnIdx - 1 ].getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ].columnDef;
            paddingLeft = paddingLeftColumnDef.startPosition + paddingLeftColumnDef.drawnWidth + 'px';
        } else {
            paddingLeft = '0px';
        }
        scrollContentElem.style.paddingLeft = paddingLeft;
        const scrollContentMinWidth = parseInt( scrollHeaderElemMinWidth, 10 ) - parseInt( paddingLeft, 10 );
        _setScrollContentMinWidth( scrollContentElem, scrollContentMinWidth );

        // Update cell visibility
        const scrollRows = rowParentElem;
        for( let j = 0; j < scrollRows.length; j++ ) {
            const rowCells = scrollRows[ j ].children;
            if( rowCells.length === 0 ) {
                continue;
            }
            const row = scrollRows[ j ];
            row.style.minWidth = minWidth + 'px';
            const currentStartIndex = rowCells[ 0 ].columnDef.index;
            const currentEndIndex = rowCells[ rowCells.length - 1 ].columnDef.index;
            const trueStartColumnIndex = startColumnIdx + _pinColumnCount;
            const trueEndColumnIndex = endColumnIdx + _pinColumnCount;
            for( let k = rowCells.length - 1; k >= 0; k-- ) {
                const cell = rowCells[ k ];
                const colIndex = cell.columnDef.index;

                // Remove out of view cells
                if( colIndex < trueStartColumnIndex || colIndex > trueEndColumnIndex ) {
                    _t.util.destroyChildNgElements( cell );
                    cell.parentElement.removeChild( cell );
                }
            }

            for( let l = currentStartIndex - 1; l >= trueStartColumnIndex; l-- ) {
                const newCellInsertBefore = await _createPropertyCell( _columnDefs[ l ], row.vmo, _columnDefs[ l ].drawnWidth, row );
                row.insertBefore( newCellInsertBefore, row.children[ 0 ] );
                tableEditor.updateEditStatusForCell( newCellInsertBefore );
            }

            for( let m = currentEndIndex + 1; m <= trueEndColumnIndex; m++ ) {
                const newCellInsertAfter = await _createPropertyCell( _columnDefs[ m ], row.vmo, _columnDefs[ m ].drawnWidth, row );
                row.appendChild( newCellInsertAfter );
                tableEditor.updateEditStatusForCell( newCellInsertAfter );
            }
        }
    };

    // LCS-323044 - IE11 - aw-splm-table ascending and descending icon not showing
    // IE lacks support for multiple arguments in classlist.remove - https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
    var _removeAllSortDirectionClasses = function( sortElement ) {
        sortElement.classList.remove( _t.Const.CLASS_ICON_SORT_ASC );
        sortElement.classList.remove( _t.Const.CLASS_ICON_SORT_DESC );
        sortElement.classList.remove( _t.Const.CLASS_ICON_NON_SORTABLE );
        sortElement.classList.remove( _t.Const.CLASS_ICON_SORTABLE );
    };

    // ////////////////////////////////////////////////
    // Public method
    // ////////////////////////////////////////////////
    self.getColumnMinWidth = function( columnIdx ) {
        return _columnDefs[ columnIdx ].minWidth;
    };

    self.getColumnMaxWidth = function( columnIdx ) {
        return _columnDefs[ columnIdx ].maxWidth;
    };

    self.getColumnWidth = function( columnIdx ) {
        return _columnDefs[ columnIdx ].drawnWidth;
    };

    var updateColumnStartPositions = function() {
        var pinContainerWidth = 0;
        var scrollContainerWidth = 0;
        for( var i = 0; i < _columnDefs.length; i++ ) {
            if( i < _pinColumnCount ) {
                _columnDefs[ i ].startPosition = pinContainerWidth;
                pinContainerWidth += _columnDefs[ i ].drawnWidth;
            } else {
                _columnDefs[ i ].startPosition = scrollContainerWidth;
                scrollContainerWidth += _columnDefs[ i ].drawnWidth;
            }
        }
    };

    /**
     * @memberOf js/splmTableDomController
     *
     * This method is used for updating the column width
     * This method is also called from resetColumnDefs with 0,0 arguments which needs to be corrected.
     * @param {Number} columnIdx - column index
     * @param {Number} deltaWidth - delta width
     */
    self.updateColumnWidth = function( columnIdx, deltaWidth ) {
        let width = self.getColumnWidth( columnIdx ) + deltaWidth;

        _setHeaderColumnWidth( columnIdx, width );
        _setContentColumnWidth( columnIdx, width );

        if( columnIdx < _pinColumnCount ) {
            // Set container
            _pinContainerWidth += deltaWidth;
            _setPinHeaderWidth( _pinContainerWidth );
            _trv.getScrollContainerElementFromTable().style.marginLeft = String( _pinContainerWidth ) + 'px';
        } else {
            // Set container
            _scrollContainerWidth += deltaWidth;
            _setScrollHeaderWidth( _scrollContainerWidth );
        }

        // Update columnDef start positions
        if( deltaWidth !== 0 ) {
            _columnDefs[ columnIdx ].drawnWidth = width;
            eventBus.publish( 'plTable.columnsResized_' + _table.id, {
                name: _columnDefs[ columnIdx ].name,
                delta: deltaWidth
            } );
        }

        updateColumnStartPositions();
        let scrollCanvasElement = _trv.getScrollCanvasElementFromTable();
        self.updateScrollColumnsInView( scrollCanvasElement.scrollLeft, scrollCanvasElement.offsetWidth );

        if( deltaWidth !== 0 ) {
            self.updateVisibleCells( _trv.getScrollContentElementFromTable() );
        }
    };

    /**
     * Update the filter icon for the header of the column name given.
     *
     * @param {String} columnName - column name for the header to update
     */
    self.updateFilterIcon = function( columnName ) {
        var headerCells = _trv.getHeaderCellElementsFromTable();
        for( var i = 0; i < headerCells.length; i++ ) {
            var columnDef = headerCells[ i ].getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ].columnDef;
            var filterIconElement = headerCells[ i ].getElementsByClassName( _t.Const.CLASS_HEADER_CELL_FILTER_ICON )[ 0 ];

            if( columnDef && columnDef.filter && filterIconElement && columnDef.field === columnName ) {
                if( columnDef.filter.isFilterApplied ) {
                    _applyFilterIcon( filterIconElement, columnDef.filter );
                } else {
                    _removeFilterIcon( filterIconElement );
                }
                break;
            }
        }
    };

    /**
     * Update the filter icon for all column headers.
     */
    self.updateAllFilterIcons = function() {
        var headerCells = _trv.getHeaderCellElementsFromTable();
        for( var i = 0; i < headerCells.length; i++ ) {
            var columnDef = headerCells[ i ].getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ].columnDef;
            var filterIconElement = headerCells[ i ].getElementsByClassName( _t.Const.CLASS_HEADER_CELL_FILTER_ICON )[ 0 ];

            if( columnDef && columnDef.filter && filterIconElement ) {
                if( columnDef.filter.isFilterApplied ) {
                    _applyFilterIcon( filterIconElement, columnDef.filter );
                } else {
                    _removeFilterIcon( filterIconElement );
                }
            }
        }
    };

    /**
     * Fit column width with content in canvas
     * NOTE: This mentod will read computed CSS which may cause reflow
     *
     * @param {Number} columnIdx - Last column index.
     *
     */
    self.fitColumnWidth = function( columnIdx ) {
        var treeNavigation = _columnDefs[ columnIdx ].isTreeNavigation;
        var cellElems = _trv.queryRowColumnCellElementsFromTable( columnIdx );
        var maxWidth = 0;
        var headerTextElement = _trv.getHeaderCellElementFromTable( columnIdx ).getElementsByClassName( _t.Const.CLASS_HEADER_CELL_INNER )[ 0 ];
        maxWidth = _t.util.getElementTextWidth( headerTextElement );

        var filterOption = _tableInstance.gridOptions.isFilteringEnabled;
        var sortOption = _tableInstance.gridOptions.enableSorting;
        // This is the space occupied after the column name which includes column menu, splitter, resizeGrip etc.
        if( filterOption || sortOption ) {
            maxWidth += _t.Const.WIDTH_MINIMUM_EXTRA_SPACE;
        }

        cellElems.forEach( function( cellElem ) {
            var actualWidth;
            // Tree navigation cell
            if( treeNavigation ) {
                // pass entire cellElem into getCellTextWidth because it calculates
                // What the width of an unobstructed element with height and width set to auto will be
                // This will give width of entire cell up until the end of the text for tree nav cells
                actualWidth = _t.util.getElementTextWidth( cellElem );
                maxWidth = actualWidth > maxWidth ? actualWidth : maxWidth;
            } else {
                // cover text and link for now.
                var valueElems = cellElem.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
                if( valueElems.length === 0 ) {
                    valueElems = cellElem.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS );
                }
                for( var i = 0; i < valueElems.length; i++ ) {
                    actualWidth = _t.util.getElementTextWidth( valueElems[ i ] );
                    maxWidth = actualWidth > maxWidth ? actualWidth : maxWidth;
                }
            }
        } );

        if( maxWidth > 0 ) {
            var currentWidth = self.getColumnWidth( columnIdx );
            var validWidth = self.getValidColumnWidth( columnIdx, maxWidth );
            if( currentWidth !== validWidth ) {
                self.updateColumnWidth( columnIdx, validWidth - currentWidth );
            }
        }
    };

    /**
     * Update column visibility for hidden columns
     *
     * @param {String} columnName - column name
     */
    self.updateColumnVisibility = function( columnName ) {
        var adjustedColumnIdx = self.getIdxFromColumnName( columnName );

        // Remove hidden column header from DOM
        var headerCellElem = _trv.getHeaderCellElementFromTable( adjustedColumnIdx );
        if( headerCellElem && headerCellElem.parentElement ) {
            headerCellElem.parentElement.removeChild( headerCellElem );
        }
        // Remove hidden column rows from DOM
        var rowCount = _getContentRowCount();
        for( var i = 0; i < rowCount; i++ ) {
            var rowCellElem = _trv.getContentCellFromTable( i, adjustedColumnIdx );
            if( rowCellElem && rowCellElem.parentElement ) {
                rowCellElem.parentElement.removeChild( rowCellElem );
            }
        }

        _columnDefs[ adjustedColumnIdx ].visible = false;
        _columnDefs.splice( adjustedColumnIdx, 1 );

        // Adjust column indices to account for removed column
        _.forEach( _columnDefs, function( columnDef, index ) {
            columnDef.index = index;
        } );

        self.resetColumnDefs( _columnDefs );

        var scrollCanvasElement = _trv.getScrollCanvasElementFromTable();
        self.updateScrollColumnsInView( scrollCanvasElement.scrollLeft );
        self.updateVisibleCells( _trv.getScrollContentElementFromTable() );
    };

    var _updateCellColumnIndexes = function() {
        var cellElements = _trv.getContentCellElementsFromTable();

        for( var i = 0; i < cellElements.length; i++ ) {
            var cellElement = cellElements[ i ];
            var column = cellElement.columnDef;

            var idxNum = document.createAttribute( dataIndexNumber );
            idxNum.value = column.index;
            if( column.index >= _pinColumnCount ) {
                idxNum.value = column.index - _pinColumnCount;
            }
            cellElement.setAttributeNode( idxNum );
            updateColumnStartPositions();
        }
    };

    var _pinHeader = function( columnIdx ) {
        // Check existing column index
        var newPinCount = columnIdx + 1;
        var oldPinCount = _pinColumnCount;

        // Update Existing DOM
        var headerCellElements = _trv.getHeaderCellElementsFromTable();
        var moveFragment = document.createDocumentFragment();
        var deltaWidth = 0;
        if( oldPinCount < newPinCount ) {
            // Update Header
            for( var i = oldPinCount; i < newPinCount; i++ ) {
                moveFragment.appendChild( headerCellElements[ oldPinCount ] );
                deltaWidth += self.getColumnWidth( i );
            }
            var pinHeaderElem = _trv.queryPinContainerFromTable().toHeader().getElement();
            pinHeaderElem.appendChild( moveFragment );

            _setPinHeaderWidth( _pinContainerWidth + deltaWidth );
            _setScrollHeaderWidth( _scrollContainerWidth - deltaWidth );
            _trv.getScrollContainerElementFromTable().style.marginLeft = String( _pinContainerWidth + deltaWidth ) + 'px';
        } else if( oldPinCount > newPinCount ) {
            // Update Header
            for( var j = newPinCount; j < oldPinCount; j++ ) {
                moveFragment.appendChild( headerCellElements[ newPinCount ] );
                deltaWidth += self.getColumnWidth( j );
            }
            var scrollHeaderElem = _trv.queryScrollContainerFromTable().toHeader().getElement();
            scrollHeaderElem.insertBefore( moveFragment, scrollHeaderElem.childNodes[ 0 ] );
            _setPinHeaderWidth( _pinContainerWidth - deltaWidth );
            _setScrollHeaderWidth( _scrollContainerWidth + deltaWidth );
            _trv.getScrollContainerElementFromTable().style.marginLeft = String( _pinContainerWidth - deltaWidth ) + 'px';
        }
    };

    var _pinContent = function( columnIdx ) {
        // Check existing column index
        var newPinCount = columnIdx + 1;
        var oldPinCount = _pinColumnCount;

        // Update Existing DOM
        var moveFragment = document.createDocumentFragment();
        var pinContentRowElements = _trv.queryPinContainerFromTable().getContentRowElements();
        var scrollContentRowElements = _trv.queryScrollContainerFromTable().getContentRowElements();
        var count = pinContentRowElements.length;
        var deltaWidth = 0;
        if( oldPinCount < newPinCount ) {
            for( var i = 0; i < count; i++ ) {
                deltaWidth = 0;
                for( var j = oldPinCount; j < newPinCount; j++ ) {
                    moveFragment.appendChild( scrollContentRowElements[ i ].children[ 0 ] );
                    deltaWidth += self.getColumnWidth( j );
                }
                pinContentRowElements[ i ].appendChild( moveFragment );
                _setContentRowWidth( pinContentRowElements[ i ], _pinContainerWidth + deltaWidth );
                _setContentRowWidth( scrollContentRowElements[ i ], _scrollContainerWidth - deltaWidth );
            }
        } else if( oldPinCount > newPinCount ) {
            for( var k = 0; k < count; k++ ) {
                deltaWidth = 0;
                for( var l = newPinCount; l < oldPinCount; l++ ) {
                    moveFragment.appendChild( pinContentRowElements[ k ].children[ newPinCount ] );
                    deltaWidth += self.getColumnWidth( l );
                }
                scrollContentRowElements[ k ].insertBefore( moveFragment, scrollContentRowElements[ k ].childNodes[ 0 ] );
                _setContentRowWidth( pinContentRowElements[ k ], _pinContainerWidth - deltaWidth );
                _setContentRowWidth( scrollContentRowElements[ k ], _scrollContainerWidth + deltaWidth );
            }
        }
    };

    /**
     * Pin the table from column 0 to specific column
     *
     * @param {Number} columnIdx - Last column index.
     *
     */
    self.pinToColumn = function( columnIdx ) {
        // Bring back all cells that were virtualized before moving cells to proper container
        var scrollCanvasElement = _trv.getScrollCanvasElementFromTable();
        self.updateScrollColumnsInView( scrollCanvasElement.scrollLeft );
        self.updateVisibleCells( _trv.getScrollContentElementFromTable() );

        _pinHeader( columnIdx );
        _pinContent( columnIdx );

        self.setPinContext( columnIdx );

        let colDef = _columnDefs[ columnIdx ];
        let pinCanvasElement = _trv.getPinCanvasElementFromTable();
        pinCanvasElement.scrollLeft = colDef.startPosition;
        _t.util.syncHeader( _table, true, pinCanvasElement.scrollLeft );

        _updateCellColumnIndexes();

        // Virtualize cells
        self.updateScrollColumnsInView( scrollCanvasElement.scrollLeft, scrollCanvasElement.offsetWidth );
        self.updateVisibleCells( _trv.getScrollContentElementFromTable() );
    };

    /**
     * Finds the current columns that are pinned in the table
     *
     * @returns {Array} all the columns that are pinned
     */
    var _findPinnedColumns = function() {
        var results = [];
        if( _columnDefs && _columnDefs.length ) {
            for( var i = 0; i < _columnDefs.length; i++ ) {
                if( _columnDefs[ i ].pinnedLeft === true ) {
                    results.push( _columnDefs[ i ] );
                }
            }
        }
        return results;
    };

    /**
     * Checks new columns for any previous pinned columns, then returns index of first found.
     *
     * @param {*} newColumns The new columns coming into the table
     * @param {*} pinnedColumns The old pinned columns that were pinned
     * @returns {Number} the first index of an incoming column
     */
    var findPinIndex = function( newColumns, pinnedColumns ) {
        var pinIndex;
        if( _.isArray( pinnedColumns ) && _.isArray( newColumns ) ) {
            for( var i = pinnedColumns.length - 1; i >= 0; i-- ) {
                for( var j = 0; j < newColumns.length; j++ ) {
                    if( pinnedColumns[ i ].name && ( pinnedColumns[ i ].name === newColumns[ j ].name ||
                            pinnedColumns[ i ].name === newColumns[ j ].field ) ) {
                        pinIndex = newColumns[ j ].index;
                        break;
                    }
                }
                if( pinIndex ) {
                    break;
                }
            }
        }
        return pinIndex;
    };

    self.getColumnDefs = function() {
        return _columnDefs;
    };

    self.resetColumnDefs = function( columnDefs ) {
        var previouslyPinnedColumns = _findPinnedColumns();
        var currentPinIndex = findPinIndex( columnDefs, previouslyPinnedColumns );

        _columnDefs = columnDefs;

        self.initializeColumnWidths();
        self.setPinContext( currentPinIndex );

        var pinContainerElem = _trv.getPinContainerElementFromTable();
        var pinHeaderElem = _trv.getPinHeaderElementFromTable();
        var pinContentElem = _trv.getPinContentElementFromTable();
        pinHeaderElem.innerHTML = '';
        _insertColumnHeaders( pinHeaderElem, 0, _pinColumnCount );
        pinContainerElem.replaceChild( pinHeaderElem, pinContainerElem.children[ 0 ] );
        _setScrollContentMinWidth( pinContentElem, parseInt( pinHeaderElem.style.minWidth, 10 ) );

        var scrollContainerElem = _trv.getScrollContainerElementFromTable();
        var scrollHeaderElem = _trv.getScrollHeaderElementFromTable();
        var scrollContentElem = _trv.getScrollContentElementFromTable();
        scrollHeaderElem.innerHTML = '';
        _insertColumnHeaders( scrollHeaderElem, _pinColumnCount, _columnDefs.length );
        var scrollContentMinWidth = parseInt( scrollHeaderElem.style.minWidth, 10 ) - parseInt( scrollContentElem.style.paddingLeft, 10 );
        _setScrollContentMinWidth( scrollContentElem, scrollContentMinWidth );

        if( scrollContainerElem.children.length === 0 ) {
            scrollContainerElem.appendChild( scrollHeaderElem );
        }

        self.updateColumnWidth( 0, 0 );
        self.setAriaColCount( _trv.getTableContainerElementFromTable(), columnDefs );
    };

    self.isColumnWidthChangeValid = function( columnIdx, deltaWidth ) {
        var targetWidth = self.getColumnWidth( columnIdx ) + deltaWidth;
        return self.getValidColumnWidth( columnIdx, targetWidth ) === targetWidth;
    };

    self.getValidColumnWidth = function( columnIdx, targetWidth ) {
        var maxWidth = self.getColumnMaxWidth( columnIdx );
        var minWidth = self.getColumnMinWidth( columnIdx );
        minWidth = minWidth > _t.Const.WIDTH_ALLOWED_MINIMUM_WIDTH ? minWidth : _t.Const.WIDTH_ALLOWED_MINIMUM_WIDTH;

        if( minWidth && targetWidth < minWidth ) {
            targetWidth = minWidth;
        } else if( maxWidth && targetWidth > maxWidth ) {
            targetWidth = maxWidth;
        } else {
            // Do nothing
        }
        return targetWidth;
    };

    self.isColumnSplitterDraggable = function( columnIdx ) {
        return _columnDefs[ columnIdx ].enableColumnResizing !== false;
    };

    self.getTotalColumnWidth = function( columnIdx ) {
        var width = 0;
        var sum = columnIdx + 1;
        for( var i = 0; i < sum; i++ ) {
            width += self.getColumnWidth( i );
        }
        return width;
    };

    self.getIdxFromColumnName = function( columnField ) {
        for( var i = 0; i < _columnDefs.length; i++ ) {
            if( _columnDefs[ i ].field === columnField || _columnDefs[ i ].name === columnField ) {
                return i;
            }
        }
        return -1;
    };

    self.setHeaderCellSortDirection = function( oldColumnIdx, newColumnIdx, sortDirection ) {
        var sortElem;
        var headerCellElem = null;
        var sortDir = null;
        if( sortDirection !== null && sortDirection !== '' ) {
            // aria-sort supported sort values are ascending, descending, none and other.
            sortDir = sortDirection.toLowerCase().includes( 'desc' ) ? 'descending' : 'ascending';
        }
        if( oldColumnIdx > -1 ) {
            sortElem = _trv.getHeaderCellSortIconElementFromTable( oldColumnIdx );
            _removeAllSortDirectionClasses( sortElem );
            sortElem.classList.add( _getSortClassName( '' ) );
            headerCellElem = _trv.getHeaderCellElementFromTable( oldColumnIdx );
            if( headerCellElem !== null && headerCellElem.parentElement.hasAttribute( 'aria-sort' ) ) {
                headerCellElem.parentElement.removeAttribute( 'aria-sort' );
            }
        }

        sortElem = _trv.getHeaderCellSortIconElementFromTable( newColumnIdx );
        _removeAllSortDirectionClasses( sortElem );
        sortElem.classList.add( _getSortClassName( sortDirection ) );
        headerCellElem = _trv.getHeaderCellElementFromTable( newColumnIdx );
        if( headerCellElem !== null && sortDir !== null ) {
            headerCellElem.parentElement.setAttribute( 'aria-sort', sortDir );
        }
    };

    self.getScrollCanvasScrollLeftPosition = function() {
        return _trv.getScrollCanvasElementFromTable().scrollLeft * -1;
    };

    self.getPinCanvasScrollLeftPosition = function() {
        return _trv.getPinCanvasElementFromTable().scrollLeft * -1;
    };

    /**
     * Applies the dynamic row heights to each row
     *
     * @param {DocumentFragment} contentRowFragment - the fragment of content rows to be applied to the DOM
     * @param {DocumentFragment} tempContentRowFragment - the temporary fragment of content rows
     * @param {number} rowHeight - the pixel row height
     */
    const _applyDynamicRowHeights = function( contentRowFragment, tempContentRowFragment, rowHeight ) {
        let tempDivElem = document.createElement( 'div' );
        tempDivElem.style.position = 'absolute';
        tempDivElem.style.visibility = 'hidden';
        tempDivElem.style.height = 'auto';
        tempDivElem.style.width = 'auto';
        const clonedNode = tempContentRowFragment.childNodes.length ? tempContentRowFragment : contentRowFragment.cloneNode( true );
        tempDivElem.appendChild( clonedNode );
        document.body.appendChild( tempDivElem );

        // Now loop through rows
        const newRows = tempDivElem.childNodes;
        const rowsWithVMOs = contentRowFragment.childNodes;

        const maxRowHeight = rowHeight * _t.Const.MAX_ROW_HEIGHT_ROWS;

        for( let i = 0; i < newRows.length; i++ ) {
            const row = newRows[ i ];
            const vmo = rowsWithVMOs[ i ].vmo;
            let height = 0;
            const cells = row.childNodes;

            for( let j = 0; j < cells.length; j++ ) {
                const cell = cells[ j ];
                if( cell.childNodes[ 0 ] && cell.childNodes[ 0 ].classList.contains( _t.Const.CLASS_SPLM_TABLE_ICON_CELL ) ) {
                    continue;
                } else if( cell.childNodes[ 0 ] && cell.childNodes[ 0 ].classList.contains( _t.Const.CLASS_AW_TREE_COMMAND_CELL ) ) {
                    const cellHeight = cell.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT )[ 0 ].offsetHeight + 15;
                    height = cellHeight > height ? cellHeight : height;
                } else {
                    const cellHeight = cell.offsetHeight + 11;
                    height = cellHeight > height ? cellHeight : height;
                }
            }

            // no larger than max height and no smaller than default row height
            height = Math.min( Math.max( height, rowHeight ), maxRowHeight );

            vmo.rowHeight = !vmo.rowHeight || height > vmo.rowHeight ? height : vmo.rowHeight;
            // Mark each actual cell text with height if exists.
            const cellsWithText = rowsWithVMOs[ i ].getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC );
            for( let k = 0; k < cellsWithText.length; k++ ) {
                cellsWithText[ k ].style.maxHeight = String( vmo.rowHeight ) + 'px';
            }
        }

        document.body.removeChild( tempDivElem );
    };

    /**
     * Creates a group of row elements with cells spanning from the start and end column index.
     *
     * @param {Array} vmos - the array of vmos to create rows for
     * @param {number} startIndex - the row start index
     * @param {number} rowHeight - the pixel row height
     * @param {number} startColumnIdx - the column start index
     * @param {number} endColumnIdx - the column end index
     * @param {boolean} isPin - true if the row contents are for the pin container
     *
     * @return {DocumentFragment} Document fragment containing the rows for the passed in vmos
     */
    const _constructContentElement = async function( vmos, startIndex, rowHeight, startColumnIdx, endColumnIdx, isPin ) {
        let contentRowFragment = document.createDocumentFragment();
        let tempContentRowFragment = document.createDocumentFragment();

        for( let keyIdx = 0; keyIdx < vmos.length; keyIdx++ ) {
            let vmo = vmos[ keyIdx ];
            const rowIndex = keyIdx + startIndex;
            const idxNum = document.createAttribute( dataIndexNumber );
            idxNum.value = rowIndex;
            let row = null;
            let mockrow = null;
            if( isPin ) {
                row = await _createContentRowElement( vmo, rowHeight, startColumnIdx, endColumnIdx );
                row.classList.add( _t.Const.CLASS_PINNED_ROW );
            } else {
                if( _scrollColumnsInView.start !== null && _scrollColumnsInView.end !== null ) {
                    startColumnIdx = _scrollColumnsInView.start + _pinColumnCount;
                    endColumnIdx = _scrollColumnsInView.end + _pinColumnCount;
                }
                row = await _createContentRowElement( vmo, rowHeight, startColumnIdx, endColumnIdx );
                if( _tableInstance.dynamicRowHeightStatus ) {
                    // If dynamic row height, we need to get the row height with all cells rendered, so endColumnIdx is the last item in columnDefs.
                    mockrow = await _createContentRowElement( vmo, rowHeight, startColumnIdx, _columnDefs.length - 1 );
                    mockrow.setAttributeNode( idxNum.cloneNode() );
                }
            }

            row.setAttributeNode( idxNum );
            //aria-rowindex always starts from 1. For header row, it is 1 and for the actual rows, it starts from 2.
            row.setAttribute( ariaRowIndex, rowIndex + 2 );

            // Add id attribute to each cell which will be refered by aria-activedescendant at grid level.
            // The id attribute should be unique, so this will be a combination of gridid, aria-rowindex, aria-colindex.
            let cellElements = row.childNodes;
            let uniqueIdForCell;
            for( let i = 0; i < cellElements.length; i++ ) {
                if( cellElements[ i ].hasAttribute( ariaColIndex ) ) {
                    uniqueIdForCell = _tableInstance.gridId + '_row' + row.getAttribute( ariaRowIndex ) + '_col' + cellElements[ i ].getAttribute( ariaColIndex );
                    cellElements[ i ].setAttribute( 'id', uniqueIdForCell );
                }
            }
            contentRowFragment.appendChild( row );
            if( _tableInstance.dynamicRowHeightStatus && mockrow ) {
                tempContentRowFragment.appendChild( mockrow );
            }

            if( isPin !== true && _scrollColumnsInView.start !== null && _scrollColumnsInView.end !== null ) {
                self.updateVisibleCells( contentRowFragment );
            }
        }

        // Dynamic Row Height - When flag is enabled
        // find heights for rows by creating div and adding doc fragment
        if( _tableInstance.dynamicRowHeightStatus ) {
            _applyDynamicRowHeights( contentRowFragment, tempContentRowFragment, rowHeight );
        }

        return contentRowFragment;
    };

    self.constructContentElement = async function( vmos, startIndex, rowHeight, isPin ) {
        if( isPin === true ) {
            // Set container
            var pinHeaderElem = _trv.getPinHeaderElementFromTable();
            if( _tableInstance.gridOptions.showCheckBox === true ) {
                if( !_alignContainersForCheckbox ) {
                    _alignContainersForCheckbox = true;
                    _pinContainerWidth += 32;
                    pinHeaderElem.lastChild.style.width = pinHeaderElem.lastChild.clientWidth + 32 + 'px';
                    _trv.getScrollContainerElementFromTable().style.marginLeft = String( _pinContainerWidth ) + 'px';
                }
            } else if( _tableInstance.gridOptions.showCheckBox === false && _alignContainersForCheckbox ) {
                _alignContainersForCheckbox = false;
                _pinContainerWidth -= 32;

                pinHeaderElem.lastChild.style.width = '';
                _trv.getScrollContainerElementFromTable().style.marginLeft = String( _pinContainerWidth ) + 'px';
            }
            return await _constructContentElement( vmos, startIndex, rowHeight, 0, _pinColumnCount - 1, isPin );
        }

        return await _constructContentElement( vmos, startIndex, rowHeight, _pinColumnCount, _columnDefs.length - 1, isPin );
    };

    var _removeContentElement = function( parent, upperCountIdx, lowerCounterIdx ) {
        var parentElement = parent.getElement();
        var children = parent.getContentRowElements();
        var uCountIdx = upperCountIdx || children.length - 1;
        var lCountIdx = lowerCounterIdx || 0;

        if( children && children.length > 0 ) {
            for( ; uCountIdx >= lCountIdx; uCountIdx-- ) {
                // Clean up edit cell scope if needed
                var editCell = children[ uCountIdx ].getElementsByClassName( _t.Const.CLASS_TABLE_EDIT_CELL_TOP )[ 0 ];
                if( editCell !== undefined && editCell.parentElement.prop !== undefined ) {
                    editCell.parentElement.prop.isEditing = false;
                }

                // Clean up all angularJS Element
                _t.util.destroyChildNgElements( children[ uCountIdx ] );
                parentElement.removeChild( children[ uCountIdx ] );
            }
        }
    };

    self.removeContentElement = function( upperCountIdx, lowerCounterIdx ) {
        _removeContentElement( _trv.queryPinContentFromTable(), upperCountIdx, lowerCounterIdx );
        _removeContentElement( _trv.queryScrollContentFromTable(), upperCountIdx, lowerCounterIdx );
    };

    self.clearScrollContents = function() {
        _trv.getScrollContentElementFromTable().innerHTML = '';
    };

    self.setSelectable = function( selectable ) {
        if( selectable ) {
            _table.classList.add( _t.Const.CLASS_SELECTION_ENABLED );
        } else {
            _table.classList.remove( _t.Const.CLASS_SELECTION_ENABLED );
        }
    };

    self.setDraggable = function( draggable ) {
        var rowElements = _table.getElementsByClassName( _t.Const.CLASS_ROW );
        for( var i = 0; i < rowElements.length; i++ ) {
            rowElements[ i ].draggable = draggable;
        }
    };

    // /////////////////////////////////////////////
    // Column Resize Grip
    // /////////////////////////////////////////////

    self.showColumnGrip = function( posX ) {
        self.setColumnGripPosition( posX );
        _grip.style.removeProperty( 'display' );
    };

    self.setColumnGripPosition = function( posX ) {
        _grip.style.marginLeft = String( posX - 30 /* match with width*/ ) + 'px';
    };

    self.hideColumnGrip = function() {
        _grip.style.display = 'none';
    };

    _constructTableElement();

    self.updateColorIndicatorElements = function( updateVMOs ) {
        var pinRows = _trv.getPinContentRowElementsFromTable();
        _.forEach( pinRows, function( pinRow ) {
            var rowVmo = pinRow.vmo;
            if( updateVMOs.includes( rowVmo ) ) {
                var colorIndicatorElement = pinRow.getElementsByClassName( _t.Const.CLASS_AW_CELL_COLOR_INDICATOR )[ 0 ];
                if( colorIndicatorElement ) {
                    var newColorIndicatorElement = _t.util.createColorIndicatorElement( rowVmo );
                    colorIndicatorElement.parentElement.replaceChild( newColorIndicatorElement, colorIndicatorElement );
                }
            }
        } );
    };

    self.syncContentRowHeights = function( pinnedElems, scrollElems ) {
        if( pinnedElems && pinnedElems.childNodes ) {
            for( let i = 0; i < pinnedElems.childNodes.length; i++ ) {
                let row = pinnedElems.childNodes[ i ];
                let rowVMO = row.vmo;
                row.style.height = String( rowVMO.rowHeight ) + 'px';
            }
        }

        if( scrollElems && scrollElems.childNodes ) {
            for( let i = 0; i < scrollElems.childNodes.length; i++ ) {
                let row = scrollElems.childNodes[ i ];
                let rowVMO = row.vmo;
                row.style.height = String( rowVMO.rowHeight ) + 'px';
            }
        }
    };

    return self;
};

export default SPLMTableDomController;
