// Copyright (c) 2020 Siemens

/**
 * This file provides helper functions for table selection
 *
 * @module js/splmTableSelectionHelper
 */
import _t from 'js/splmTableNative';
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import eventBus from 'js/eventBus';
import selectionHelper from 'js/selectionHelper';
import _ from 'lodash';

/**
 *
 * Handles other select through selection handler
 *
 * @param {Object} rowVmoArray - array of VMOs to select
 * @param {Object} selectionModel - the selection model
 * @param {Object} event - event from the tap/click action
 * @param {Object} dataProvider - declarative dataProvider
 */
const handleNonContextMenuSelect = function( rowVmoArray, selectionModel, event, dataProvider ) {
    selectionHelper.handleSelectionEvent( rowVmoArray, selectionModel, event, dataProvider );
};

const selectCell = function( cell, gridOptions, columnDefs, idx, cellRenderer, selectionModel, pinElem, rowElem, table ) {
    cell.classList.add( _t.Const.CLASS_CELL_SELECTED );
    if( gridOptions.transpose === true ) {
        cell.classList.add( 'ui-grid-column-selected' );
        return;
    }
    const isCommandNeeded = columnDefs[ idx ] && ( columnDefs[ idx ].isTableCommand || columnDefs[ idx ].isTreeNavigation );
    if( !isCommandNeeded ) {
        return;
    }

    let cellTop = cell.children[ 0 ];
    if( columnDefs[ idx ] && columnDefs[ idx ].isTreeNavigation ) {
        cellTop = cell.getElementsByClassName( 'aw-jswidgets-tableNonEditContainer' )[ 0 ];
    }
    cellRenderer.resetHoverCommandElement();
    // process OOTB cmd cell
    if( cellTop.lastChild && cellTop.lastChild.classList && cellTop.lastChild.classList.contains( _t.Const.CLASS_NATIVE_CELL_COMMANDS ) ) {
        _t.util.destroyNgElement( cellTop.lastChild );
    }

    // process customize cmd cell
    if( cellTop.lastChild && cellTop.lastChild.classList && cellTop.lastChild.classList.contains( _t.Const.CLASS_AW_CELL_COMMANDS ) ) {
        if( selectionModel.multiSelectEnabled ) {
            cellTop.lastChild.style.display = 'none';
        }
    }
    // set checkbox when item is selected
    if( pinElem.getElementsByClassName( _t.Const.CLASS_CELL_CHECKBOX_BUTTON ).length > 0 ) {
        pinElem.getElementsByClassName( _t.Const.CLASS_CELL_CHECKBOX_BUTTON )[ 0 ].checked = true;
    }

    if( rowElem.vmo.props ) {
        if( !cellTop.lastChild || cellTop.lastChild && cellTop.lastChild.classList && !cellTop.lastChild.classList.contains( _t.Const.CLASS_AW_CELL_COMMANDS ) ) {
            if( !selectionModel.multiSelectEnabled && selectionModel.getCurrentSelectedCount() === 1 ) {
                const markElem = awSPLMTableCellRendererFactory.createCellCommandElement( columnDefs[ idx ], rowElem.vmo, table, true );
                cellTop.appendChild( markElem );
            }
        }
    }
};

const deselectCell = function( cell, gridOptions, columnDefs, idx, cellRenderer, pinElem, selectionModel ) {
    if( cell.classList.contains( _t.Const.CLASS_CELL_SELECTED ) ) {
        cell.classList.remove( _t.Const.CLASS_CELL_SELECTED );
    }
    if( gridOptions.transpose === true ) {
        cell.classList.remove( 'ui-grid-column-selected' );
        return;
    }

    if( columnDefs[ idx ] && ( columnDefs[ idx ].isTableCommand || columnDefs[ idx ].isTreeNavigation ) ) {
        let cellTop = cell.children[ 0 ];
        if( columnDefs[ idx ].isTreeNavigation ) {
            if( cell.getElementsByClassName( 'aw-jswidgets-tableNonEditContainer' ).length > 0 ) {
                cellTop = cell.getElementsByClassName( 'aw-jswidgets-tableNonEditContainer' )[ 0 ];
            }
        }
        // Process OOTB cmd cell
        if( cellTop.lastChild && cellTop.lastChild.classList &&
            cellTop.lastChild.classList.contains( _t.Const.CLASS_NATIVE_CELL_COMMANDS ) ) {
            _t.util.destroyNgElement( cellTop.lastChild );
            cellRenderer.destroyHoverCommandElement();
        }
        // unset checkbox when item is not selected.
        if( pinElem.getElementsByClassName( _t.Const.CLASS_CELL_CHECKBOX_BUTTON ).length > 0 ) {
            pinElem.getElementsByClassName( _t.Const.CLASS_CELL_CHECKBOX_BUTTON )[ 0 ].checked = false;
        }

        // Process customize cmd cell
        if( cellTop.lastChild && cellTop.lastChild.classList &&
            cellTop.lastChild.classList.contains( _t.Const.CLASS_AW_CELL_COMMANDS ) ) {
            if( selectionModel.multiSelectEnabled ) {
                cellTop.lastChild.style.display = 'none';
            } else {
                cellTop.lastChild.style.removeProperty( 'display' );
            }
        }
    }
};

const updateCellSelectedClass = ( rowCells, gridOptions, pinElem, rowElem, table, columnDefs, selectionModel ) => {
    // Add cell selected class to each cell
    _.forEach( rowCells, function( cell, idx ) {
        const vmo = gridOptions.transpose === true ? cell.columnDef.vmo : rowElem.vmo;
        const cellRenderer = table._tableInstance.cellRenderer;
        if( vmo && selectionModel.isSelected( vmo ) ) {
            selectCell( cell, gridOptions, columnDefs, idx, cellRenderer, selectionModel, pinElem, rowElem, table );
        } else {
            deselectCell( cell, gridOptions, columnDefs, idx, cellRenderer, pinElem, selectionModel );
        }
    } );
};

// LCS-145673 - Make 'Show Children' command visible in table rows
// We need to make the selection code be compatible with:
// 1. When cellRenderer contains command cell by default
// 2. When cellRenderer does not contains command cell
// Code in this method work for both as design above
export const updateContentRowSelection = function( selectionModel, columnDefs, pinRowElements, scrollRowElements, table ) {
    const cnt = pinRowElements.length;
    const gridOptions = table._tableInstance.gridOptions;

    if( gridOptions.transpose === true ) {
        const trv = new _t.Trv( table );
        const headerElements = trv.getHeaderCellElementsFromTable();
        for( let i = 0; i < headerElements.length; i++ ) {
            const headerElement = headerElements[ i ];
            const columnDefElement = headerElements[ i ].getElementsByClassName( _t.Const.CLASS_COLUMN_DEF )[ 0 ];
            if( columnDefElement && columnDefElement.columnDef.vmo && selectionModel.isSelected( columnDefElement.columnDef.vmo ) ) {
                headerElement.classList.add( _t.Const.CLASS_HEADER_CELL_SELECTED );
            } else {
                headerElement.classList.remove( _t.Const.CLASS_HEADER_CELL_SELECTED );
            }
        }
    }

    for( let i = 0; i < cnt; i++ ) {
        const rowElem = scrollRowElements[ i ];
        const pinElem = pinRowElements[ i ];
        let rowCells = Array.prototype.slice.call( pinElem.getElementsByClassName( _t.Const.CLASS_CELL ) );
        rowCells = rowCells.concat( Array.prototype.slice.call( rowElem.getElementsByClassName( _t.Const.CLASS_CELL ) ) );

        if( !rowElem.vmo ) {
            rowElem.classList.remove( _t.Const.CLASS_ROW_SELECTED );
            rowElem.classList.remove( _t.Const.CLASS_STATE_SELECTED );
            pinElem.classList.remove( _t.Const.CLASS_ROW_SELECTED );
            pinElem.classList.remove( _t.Const.CLASS_STATE_SELECTED );

            // remove cell selected class to each cell
            _.forEach( rowCells, function( cell ) {
                cell.classList.remove( _t.Const.CLASS_CELL_SELECTED );
            } );
            continue;
        }

        if( selectionModel.isSelected( rowElem.vmo ) ) {
            rowElem.classList.add( _t.Const.CLASS_ROW_SELECTED );
            rowElem.classList.add( _t.Const.CLASS_STATE_SELECTED );
            rowElem.setAttribute( 'aria-selected', 'true' );
            pinElem.classList.add( _t.Const.CLASS_ROW_SELECTED );
            pinElem.classList.add( _t.Const.CLASS_STATE_SELECTED );
            pinElem.setAttribute( 'aria-selected', 'true' );
            updateCellSelectedClass( rowCells, gridOptions, pinElem, rowElem, table, columnDefs, selectionModel );
            continue;
        }

        if( rowElem.classList.contains( _t.Const.CLASS_ROW_SELECTED ) || rowElem.classList.contains( _t.Const.CLASS_STATE_SELECTED ) ) {
            rowElem.classList.remove( _t.Const.CLASS_ROW_SELECTED );
            rowElem.classList.remove( _t.Const.CLASS_STATE_SELECTED );
            if( rowElem.hasAttribute( 'aria-selected' ) ) {
                rowElem.removeAttribute( 'aria-selected' );
            }
        }

        if( pinElem.classList.contains( _t.Const.CLASS_ROW_SELECTED ) || pinElem.classList.contains( _t.Const.CLASS_STATE_SELECTED ) ) {
            pinElem.classList.remove( _t.Const.CLASS_ROW_SELECTED );
            pinElem.classList.remove( _t.Const.CLASS_STATE_SELECTED );
            if( pinElem.hasAttribute( 'aria-selected' ) ) {
                pinElem.removeAttribute( 'aria-selected' );
            }
        }
        updateCellSelectedClass( rowCells, gridOptions, pinElem, rowElem, table, columnDefs, selectionModel );
    }
};

const handleSelect = function( selectedVmo, event, selectionModel, dataProvider, tableElem ) {
    handleNonContextMenuSelect( [ selectedVmo ], selectionModel, event, dataProvider );
    /**
     * If we already have row selected, then ctrl + select the same row, we need to update selected row to provide checkmark
     * Dataprovider watcher evaluates by checking if currently selected has changed. This wont catch for selecting same row in multi
     * instead of single
     */
    if( event.ctrlKey ) {
        const _trv = new _t.Trv( tableElem );
        updateContentRowSelection( selectionModel, dataProvider.cols, _trv.getPinContentRowElementsFromTable(), _trv.getScrollContentRowElementsFromTable(), tableElem );
    }
    _t.util.getElementScope( tableElem ).$apply();
    // This event is used to denote a selection performed by user click on a row.
    const gridId = tableElem._tableInstance.gridId;
    eventBus.publish( gridId + '.gridSelection', {
        selectedObjects: dataProvider.getSelectedObjects()
    } );
};

/**
 *
 * Callback method when a table row gets selected/clicked
 *
 * @param {DOMElement} tableElem - the table element
 * @param {Event} [keyboardTargetElement] - the destination of keyboard event (Optional)
 * @return {function} selection handler function
 */
export const selectionChanged = function( tableElem, keyboardTargetElement ) {
    return function( event ) {
        const target = keyboardTargetElement || event.target;

        // Do not trigger selection if clicking on link
        if( target.tagName.toLowerCase() === 'a' && target.href !== '' ) {
            return;
        }

        // Do not trigger selection if clicking on tree expand/collapse icon
        if( _t.util.closestElement( target, `.${_t.Const.CLASS_TREE_ROW_HEADER_BUTTONS}` ) ) {
            return;
        }

        // Get target vmo that was selected
        let selectedRow = _t.util.closestElement( target, '.' + _t.Const.CLASS_ROW );
        let selectedVmo = selectedRow && selectedRow.vmo;
        let selectedCell = _t.util.closestElement( target, '.' + _t.Const.CLASS_CELL );
        if( !selectedCell && event.currentTarget.columnDef ) {
            selectedCell = event.currentTarget;
        }
        const gridOptions = tableElem._tableInstance.gridOptions;
        if( gridOptions.transpose === true ) {
            if( selectedCell && selectedCell.columnDef && selectedCell.columnDef.vmo ) {
                selectedVmo = selectedCell.columnDef.vmo;
            } else {
                return;
            }
        }

        const dataProvider = tableElem._tableInstance.dataProvider;
        const selectionModel = dataProvider.selectionModel;
        if( selectionModel && selectedVmo && selectedVmo.props ) {
            // Valid Selections Use Cases:
            // 1. Selecting vmo that is not selected
            const vmoNotSelected = !selectedVmo.selected;
            // 2. Selecting row selection checkbox
            const selectedRowCheckbox = _t.util.closestElement( event.target, '.' + _t.Const.CLASS_CELL_CHECKBOX );
            // 3. Deselecting vmo with Ctrl key
            const deselectingVmo = selectedVmo.selected && event.ctrlKey;
            // 4. Selecting already selected vmo when other selections are present and multiselection mode is off
            const selectedLength = dataProvider.getSelectedObjects().length;
            const keepVmoSelectedButDeselectOthers = selectedVmo.selected && selectedLength > 1 && !selectionModel.multiSelectEnabled;

            if( vmoNotSelected || selectedRowCheckbox || deselectingVmo || keepVmoSelectedButDeselectOthers ) {
                handleSelect( selectedVmo, event, selectionModel, dataProvider, tableElem );
            }
        }
    };
};

export default {
    selectionChanged,
    updateContentRowSelection
};
