// Copyright (c) 2020 Siemens

/**
 * This module defines the keyboard interactions for PL Table.
 *
 * @module js/splmTableKeyboardService
 */

import _t from 'js/splmTableNative';
import appCtxService from 'js/appCtxService';
import editHandlerSvc from 'js/editHandlerService';
import splmTableSelectionHelper from 'js/splmTableSelectionHelper';
import wcagService from 'js/wcagService';

/**
 * Keyboard service to handle keyboard interactions for aw-splm-table
 * @param {HTMLElement} tableElem The table element
 * @param {SPLMTableEditor} tableEditor The table editor
 */
const SPLMTableKeyboardService = function( tableElem, tableEditor ) {
    let self = this;

    let _tableElement = tableElem;
    let _tableEditor = tableEditor;
    let _tableInstance = _t.util.getTableInstance( _tableElement );
    let _trv = new _t.Trv( tableElem );
    const dataIndexNumber = 'data-indexNumber';

    /**
     * Prevents default and stops propagation for event
     * @param {Event} event the event
     */
    const preventEventDefaults = function( event ) {
        event.preventDefault();
        event.stopPropagation();
    };

    /**
     * Checks if key pressed is an arrow key
     * @param {String} keyPressed the pressed key to check
     * @returns {String|null} the direction if arrow key, or null if not
     */
    const checkIfArrowKey = function( keyPressed ) {
        switch ( keyPressed ) {
            case 'Up':
            case 'ArrowUp':
                return 'UP';
            case 'Down':
            case 'ArrowDown':
                return 'DOWN';
            case 'Left':
            case 'ArrowLeft':
                return 'LEFT';
            case 'Right':
            case 'ArrowRight':
                return 'RIGHT';
            default:
                return null;
        }
    };

    /**
     * Function for handling onfocus event
     * @param {Event} event event data
     */
    const onFocusFunction = function( event ) {
        event.target.tabIndex = '0';
    };

    /**
     * Function for handling onblur event
     * @param {Event} event eventData
     */
    const onBlurFunction = function( event ) {
        event.target.tabIndex = '-1';
    };

    /**
     * Sets focus and blur event listeners to passed element
     * @param {HTMLElement} element Element to set focus and blur events for
     */
    self.setOnFocusAndBlur = function( element ) {
        element.addEventListener( 'focus', onFocusFunction );
        element.addEventListener( 'blur', onBlurFunction );
    };

    /**
     * Checks if passed element is a header element
     * @param {HTMLElement} element Element to check
     * @returns {Boolean} if the passed element is a header element
     */
    const isHeaderElement = function( element ) {
        return element.classList.contains( _t.Const.CLASS_HEADER_CELL );
    };

    /**
     * Checks if passed element is a cell element
     * @param {HTMLElement} element Element to check
     * @returns {Boolean} if the passed element is a cell element
     */
    const isCellElement = function( element ) {
        return element.classList.contains( _t.Const.CLASS_CELL );
    };

    /**
     * Checks if passed element is the table container
     * @param {HTMLElement} element Element to check
     * @returns {Boolean} if the passed element is table container
     */
    const isTableContainer = function( element ) {
        return element.classList.contains( _t.Const.CLASS_TABLE_CONTAINER );
    };

    /**
     * Checks if passed element is the grid options button
     * @param {HTMLElement} element Element to check
     * @returns {Boolean} if the passed element is grid options button
     */
    const isGridOptionsButton = function( element ) {
        return _t.util.closestElement( element, `.${_t.Const.CLASS_TABLE_MENU_BUTTON}` );
    };

    const hasFocusableElements = function( element ) {
        return wcagService.findFocusableChildren( element ).length > 0;
    };

    /**
     * Focus' the grid options button for table
     */
    const focusGridOptionsButton = function() {
        const gridMenuButton = _tableElement.querySelector( `.${_t.Const.CLASS_TABLE_MENU_BUTTON} button` );
        gridMenuButton.focus();
    };

    /**
     * Gets the visible column defs for the table
     * @returns {AwTableColumnInfo[]} Array of visible column defs
     */
    const getColumnDefs = function() {
        let colDefs;
        if( _tableInstance.gridOptions.transpose ) {
            colDefs = _tableInstance.controller.getColumnDefs();
        } else {
            colDefs = _tableInstance.dataProvider.cols;
            colDefs = colDefs.filter( function( colDef ) {
                return colDef.hiddenFlag !== true;
            } );
        }
        return colDefs;
    };

    /**
     * Calculates the scrollLeft for when focusing an element in the scroll container when navigating left or right
     *
     * @param {HTMLElement} currentElem The currently focused cell
     * @param {Number} currentRowIdx The current focused element's aria-rowindex
     * @param {Number} currentColIdx The current focused element aria-colindex
     * @param {Number} nextColIdx The next column index that will be focused
     * @returns {Number} Returns the scrollLeft value if a change is needed, or null if no need to set.
     */
    const calculateScrollLeft = function( currentElem, currentRowIdx, currentColIdx, nextColIdx ) {
        const colDefs = getColumnDefs();
        let currentDef = currentElem.columnDef || currentElem.getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ].columnDef;
        let defIndex = colDefs.indexOf( currentDef );
        let scrollLeft = null;

        let nextDef = colDefs[ defIndex + ( nextColIdx - currentColIdx ) ];
        if( currentDef && nextDef && currentDef.pinnedLeft && !nextDef.pinnedLeft ) {
            // set scrollLeft to 0
            scrollLeft = 0;
        } else if( currentRowIdx === 1 && nextDef && !nextDef.pinnedLeft ) {
            scrollLeft = nextDef.startPosition;
        }
        return scrollLeft;
    };

    const getNewRowAndColumnIndex = ( currentElem, direction, colDefs, currentRowIdx, numberOfRows ) => {
        let newIndexes = {
            newRowIdx: null,
            newColIdx: null,
            scrollLeft: null
        };

        if( !currentElem ) {
            // No current element provided, focus very first header cell
            newIndexes.newColIdx = 1;
            newIndexes.newRowIdx = 1;
            return newIndexes;
        } else if( isGridOptionsButton( currentElem ) ) {
            if( direction === 'LEFT' ) {
                newIndexes.newColIdx = colDefs.length;
                newIndexes.newRowIdx = 1;
            } else if( direction === 'DOWN' ) {
                newIndexes.newRowIdx = 2;
                newIndexes.newColIdx = colDefs.length;
                newIndexes.scrollLeft = colDefs[ colDefs.length - 1 ].startPosition;
            }
            return newIndexes;
        }
        const currentColIdx = parseInt( currentElem.getAttribute( 'aria-colindex' ) );

        switch ( direction ) {
            case 'UP':
                if( currentRowIdx <= 1 ) {
                    return;
                }
                newIndexes.newColIdx = currentColIdx;
                newIndexes.newRowIdx = currentRowIdx - 1;
                break;
            case 'DOWN':
                // row index starts at 1
                if( currentRowIdx >= numberOfRows.length ) {
                    return;
                }
                newIndexes.newColIdx = currentColIdx;
                newIndexes.newRowIdx = currentRowIdx + 1;
                break;
            case 'LEFT':
                if( currentColIdx <= 1 ) {
                    return;
                }
                newIndexes.newColIdx = currentColIdx - 1;
                newIndexes.newRowIdx = currentRowIdx;
                break;
            case 'RIGHT':
                // index for aria-colindex starts at 1
                if( currentColIdx >= colDefs.length ) {
                    if( isHeaderElement( currentElem ) ) {
                        focusGridOptionsButton();
                    }
                    return;
                }
                newIndexes.newColIdx = currentColIdx + 1;
                newIndexes.newRowIdx = currentRowIdx;
                break;
            default:
                break;
        }
        // Set scrollLeft as needed
        if( newIndexes.newColIdx !== currentColIdx ) {
            newIndexes.scrollLeft = calculateScrollLeft( currentElem, currentRowIdx, currentColIdx, newIndexes.newColIdx );
        }
        return newIndexes;
    };

    /**
     * Handles the cell navigation in table. If no element provided, focuses the first header cell. Otherwise
     * handles navigation based on current element and direction passed
     * @param {HTMLElement} currentElem The currently focused element
     * @param {String} direction The direction to navigate - UP, DOWN, LEFT, or RIGHT
     */
    const handleCellNavigation = ( currentElem, direction ) => {
        const colDefs = getColumnDefs();
        let numberOfRows;
        if( _tableInstance.gridOptions.transpose ) {
            numberOfRows = _tableInstance.dataProvider.cols.length + 1;
        } else {
            numberOfRows = _tableInstance.dataProvider.viewModelCollection.getLoadedViewModelObjects().length + 1;
        }

        const currentRowIdx = currentElem ? parseInt( currentElem.parentElement.getAttribute( 'aria-rowindex' ) ) : null;
        const newIndexes = getNewRowAndColumnIndex( currentElem, direction, colDefs, currentRowIdx, numberOfRows );
        if( !newIndexes ) {
            return;
        }
        const newRowIdx = newIndexes.newRowIdx;
        const newColIdx = newIndexes.newColIdx;
        const scrollLeft = newIndexes.scrollLeft;

        let scrollContainer = _trv.getScrollContainerElementFromTable();
        let viewport = scrollContainer.getElementsByClassName( _t.Const.CLASS_VIEWPORT )[ 0 ];

        if( currentRowIdx === 1 && newRowIdx === 2 ) {
            // Going from header row to first row, need to set scroll top to 0
            viewport.scrollTop = 0;
        }

        if( scrollLeft !== null ) {
            viewport.scrollLeft = scrollLeft;
        }
        // Find the correct next element to focus
        setTimeout( function() {
            let queryString = `[aria-rowindex='${newRowIdx}'] [aria-colindex='${newColIdx}']`;
            let element = _tableElement.querySelector( queryString );
            if( element ) {
                element.focus();
            }
        }, 100 );
    };

    /**
     * Focuses the first or last cell in a given row/header row
     * @param {HTMLElement} srcElement The source cell
     * @param {Boolean} focusFirstInRow If user should focus first in row. if false, then last
     */
    const focusFirstOrLastInRow = function( srcElement, focusFirstInRow ) {
        const colDefs = getColumnDefs();
        if( isHeaderElement( srcElement ) ) {
            if( focusFirstInRow ) {
                handleCellNavigation();
            } else {
                const lastDef = colDefs[ colDefs.length - 1 ];
                const scrollLeft = lastDef.startPosition;
                if( !lastDef.pinnedLeft ) {
                    let container = _trv.getScrollContainerElementFromTable().getElementsByClassName( _t.Const.CLASS_VIEWPORT )[ 0 ];
                    container.scrollLeft = scrollLeft;
                }

                setTimeout( function() {
                    let querySelector = `[aria-rowindex='1'] [aria-colindex='${colDefs.length}']`;
                    let headerCell = _tableElement.querySelector( querySelector );
                    headerCell && headerCell.focus();
                }, 50 );
            }
        } else if( isCellElement( srcElement ) || _t.util.closestElement( srcElement, `.${_t.Const.CLASS_CELL}` ) ) {
            let defToFind;
            let closestCell = _t.util.closestElement( srcElement, `.${_t.Const.CLASS_CELL}` );
            const rowIdx = closestCell ? closestCell.parentElement.getAttribute( dataIndexNumber ) : srcElement.parentElement.getAttribute( dataIndexNumber );
            if( focusFirstInRow ) {
                defToFind = colDefs[ 0 ];
                if( !defToFind.pinnedLeft ) {
                    let scrollContainer = _trv.getScrollContainerElementFromTable();
                    let viewport = scrollContainer.getElementsByClassName( _t.Const.CLASS_VIEWPORT )[ 0 ];
                    viewport.scrollLeft = 0;
                }
            } else {
                defToFind = colDefs[ colDefs.length - 1 ];
                if( !defToFind.pinnedLeft ) {
                    let scrollContainer = _trv.getScrollContainerElementFromTable();
                    let viewport = scrollContainer.getElementsByClassName( _t.Const.CLASS_VIEWPORT )[ 0 ];
                    viewport.scrollLeft = defToFind.startPosition;
                }
            }

            setTimeout( function() {
                let querySelector = `[aria-rowindex='${parseInt( rowIdx ) + 2}'] [aria-colindex='${defToFind.index + 1}']`;
                let focusElem = _tableElement.querySelector( querySelector );
                focusElem && focusElem.focus();
            }, 50 );
        }
    };

    /**
     * Gets the edit context, either from dataProvider.json or declViewModel
     * @returns {String|null} - The edit context, if any, or null
     */
    const getEditContext = function() {
        if( _tableInstance.dataProvider.json && _tableInstance.dataProvider.json.editContext ) {
            return _tableInstance.dataProvider.json.editContext;
        } else if( _tableInstance.declViewModel._internal.editContext ) {
            return _tableInstance.declViewModel._internal.editContext;
        }
        return null;
    };

    /**
     * Handles selection when using keyboard. Will call the click handler and selection helper to handle the selection event
     * @param {HTMLElement} keyboardTargetElement The destination element of the keyboard event (cell)
     * @param {Event} event the event
     */
    const handleKeyboardSelection = function( keyboardTargetElement, event ) {
        let rowVmo = keyboardTargetElement.parentElement && keyboardTargetElement.parentElement.vmo;
        _tableEditor.onClickHandler( event, keyboardTargetElement, rowVmo );
        const selectionHandler = splmTableSelectionHelper.selectionChanged( _tableElement, keyboardTargetElement );
        selectionHandler( event );
    };

    const handleLeftOrRightInternalNavigation = ( event, cellElement, direction ) => {
        preventEventDefaults( event );
        if( document.activeElement === cellElement && direction === 'RIGHT' ) {
            // Navigate inside cell
            _tableEditor.removeAllCellSelection();
            let focusElem = wcagService.findNextFocusableChild( cellElement, true );
            focusElem && focusElem.focus();
        } else if( direction === 'RIGHT' ) {
            let nextFocusableElement = wcagService.findNextFocusableChild( cellElement );
            if( nextFocusableElement ) {
                nextFocusableElement.focus();
            } else {
                handleCellNavigation( cellElement, direction );
            }
        } else {
            let prevFocusableElement = wcagService.findPreviousFocusableChild( cellElement );
            if( prevFocusableElement ) {
                prevFocusableElement.focus();
            } else {
                handleCellNavigation( cellElement, direction );
            }
        }
    };

    self.setupInternalCellNavigation = ( cellElement ) => {
        cellElement.onkeydown = function( event ) {
            const arrowKey = checkIfArrowKey( event.key );
            let containsFocusableElems = hasFocusableElements( cellElement );
            const isInternalCellNavigationAllowed = !_t.util.isBulkEditing( _tableElement ) && !cellElement.isElementInEdit && containsFocusableElems;
            if( !isInternalCellNavigationAllowed ) {
                return;
            }
            if( arrowKey === 'LEFT' || arrowKey === 'RIGHT' ) {
                handleLeftOrRightInternalNavigation( event, cellElement, arrowKey );
            } else if( ( arrowKey === 'DOWN' || arrowKey === 'UP' ) && document.activeElement !== cellElement ) {
                preventEventDefaults( event );
                handleCellNavigation( cellElement, arrowKey );
            }
        };
    };

    const handleTabKey = ( srcElement, event ) => {
        if( isHeaderElement( srcElement ) && !event.shiftKey ) {
            preventEventDefaults( event );
            focusGridOptionsButton();
        } else if( isGridOptionsButton( srcElement ) && event.shiftKey ) {
            preventEventDefaults( event );
            handleCellNavigation();
        } else if( isTableContainer( srcElement ) ) {
            _tableEditor.removeAllCellSelection();
        } else if( document.activeElement.closest( _t.Const.CLASS_TABLE_CONTAINER ) ) {
            _tableEditor.removeAllCellSelection();
        }
    };

    const handleArrowKey = ( srcElement, arrowKey, event ) => {
        if( isCellElement( srcElement ) && event.shiftKey && ( arrowKey === 'DOWN' || arrowKey === 'UP' ) ) {
            preventEventDefaults( event );
            _tableEditor.removeAllCellSelection();
            // Do shift select essentially
            const rowIdx = parseInt( srcElement.parentElement.getAttribute( dataIndexNumber ) );
            const totalRows = _tableInstance.dataProvider.viewModelCollection.getLoadedViewModelObjects().length;
            if( arrowKey === 'DOWN' && rowIdx < totalRows - 1 || arrowKey === 'UP' && rowIdx > 0 ) {
                handleCellNavigation( srcElement, arrowKey );
                setTimeout( function() {
                    handleKeyboardSelection( document.activeElement, event );
                }, 100 );
            }
        } else if( !srcElement.isElementInEdit ) {
            preventEventDefaults( event );
            if( isHeaderElement( srcElement ) || isCellElement( srcElement ) ) {
                _tableEditor.removeAllCellSelection();
                handleCellNavigation( srcElement, arrowKey );
            } else if( isGridOptionsButton( srcElement ) ) {
                handleCellNavigation( srcElement, arrowKey );
            } else if( isTableContainer( srcElement ) ) {
                _tableEditor.removeAllCellSelection();
                handleCellNavigation();
            }
        }
    };

    const handleEscapeKey = ( srcElement ) => {
        if( _t.util.isCellEditing( _tableElement ) && !srcElement.isElementInEdit ) {
            const context = getEditContext();
            let editHandler = null;
            if( context ) {
                editHandler = editHandlerSvc.getEditHandler( context );
            }

            if( editHandler ) {
                editHandler.cancelEdits();
            } else if( _tableInstance.dataProvider.getEditConfiguration() ) {
                const dataCtxNode = {
                    data: _tableInstance.declViewModel,
                    ctx: appCtxService.ctx
                };
                _tableInstance.dataProvider.cancelEdits( dataCtxNode, _tableInstance.declViewModel );
            } else if( _tableInstance.declViewModel.getEditConfiguration() ) {
                _tableInstance.declViewModel.cancelEdits();
            }
        }
    };

    const handleEnterOrSpaceKey = ( srcElement, event ) => {
        if( isCellElement( srcElement ) && !srcElement.isElementInEdit ) {
            preventEventDefaults( event );
            // We have to select the row since this is not a click, it wont trigger the selection change
            handleKeyboardSelection( srcElement, event );
        }
    };

    /**
     * Sets up the onkeydown listener for table. This will add support for tab, arrows keys, enter/return/space, and escape
     */
    self.setupKeyListener = () => {
        _tableElement.onkeydown = ( event ) => {
            // check what srcElement, and key code are
            let srcElement = event.srcElement;
            // if SrcElement is input, then go up to the cell
            if( srcElement.tagName === 'INPUT' || srcElement.tagName === 'TEXTAREA' ) {
                srcElement = _t.util.closestElement( srcElement, `.${_t.Const.CLASS_CELL}` ) || srcElement;
            }

            if( _t.util.isBulkEditing( _tableElement ) ) {
                if( isTableContainer( srcElement ) ) {
                    preventEventDefaults( event );
                    // Focus very first edit cell
                    let editableGridCell = srcElement.getElementsByClassName( 'aw-jswidgets-editableGridCell' )[ 0 ];
                    if( editableGridCell ) {
                        editableGridCell.parentElement.focus();
                    }
                }
                return;
            }

            const keyPressed = event.key;

            const arrowKey = checkIfArrowKey( keyPressed );

            if( keyPressed === 'Tab' ) {
                handleTabKey( srcElement, event );
            } else if( arrowKey ) {
                handleArrowKey( srcElement, arrowKey, event );
            } else if( keyPressed === 'Enter' || keyPressed === 'Space' || keyPressed === ' ' ) {
                handleEnterOrSpaceKey( srcElement, event );
            } else if( keyPressed === 'Escape' || keyPressed === 'Esc' ) {
                handleEscapeKey( srcElement );
            } else if( keyPressed === 'Home' && !srcElement.isElementInEdit ) {
                focusFirstOrLastInRow( srcElement, true );
                _tableEditor.removeAllCellSelection();
            } else if( keyPressed === 'End' && !srcElement.isElementInEdit ) {
                focusFirstOrLastInRow( srcElement, false );
                _tableEditor.removeAllCellSelection();
            }
        };
    };
};

export default SPLMTableKeyboardService;
