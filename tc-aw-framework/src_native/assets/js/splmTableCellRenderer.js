// Copyright (c) 2020 Siemens

/**
 * This module provides cell renderer customization mechanism in PL Table.
 *
 * - Below is the cell renderer pattern:
 *   {
 *       action: function( columnDef, vmo, tableElement ) {
 *           // return DOMStructure
 *       },
 *       condition: function( columnDef, vmo, tableElement ) {
 *           // return true to enable this renderer
 *       }
 *   }
 *
 * - Best practice is to make condition to be unique for your case.
 * - If the requirement is overlapping default behavior, just overlap the condition.
 * - If decoration to cell is needed, just write action, do your work without return
 *   value, but the decoration will only happens before OOTB cell renderer, not after.
 *
 * @module js/splmTableCellRenderer
 *
 */
import _ from 'lodash';
import uwPropertyService from 'js/uwPropertyService';
import _t from 'js/splmTableNative';

var exports = {};

export let updateCellChangedClass = function( prop, element ) {
    if( element ) {
        if( uwPropertyService.isModified( prop ) ) {
            prop.dirty = true;
            element.classList.add( _t.Const.CLASS_CELL_CHANGED );
        } else {
            prop.dirty = false;
            element.classList.remove( _t.Const.CLASS_CELL_CHANGED );
        }
    }
};

/**
 * Creates and returns a DOMElement for the propertyCell of the passed in view model object (vmo) which defines the row
 * and the given column (columnInfo )
 * @param {Object} column - Declarative columnInfo object
 * @param {Object} vmo - Declarative view model object (e.g. row)
 * @param {DOMElement} tableElem - Table DOMElement
 * @param {DOMElement} rowElem - Row DOMElement
 * @param {Boolean} dynamicRowHeightEnabled - if dynamic row height is enabled
 * @return {DOMElement} The newly created DOMElement for the property cell content
 */
export let createElement = function( column, vmo, tableElem, rowElem ) {
    var contentElem = null;
    _.forEach( column.cellRenderers, function( renderer ) {
        if( !renderer.processing && renderer.condition( column, vmo, tableElem, rowElem ) ) {
            // NOTE: When ASync rendering happens, this processing mechanism may have issue.
            // But for now the whole PL Table dosen't support ASync Rendering yet.
            renderer.processing = true;
            contentElem = renderer.action( column, vmo, tableElem, rowElem );
            delete renderer.processing;
        }
        return !contentElem;
    } );

    // Default cell renderer for PLTable
    if( !contentElem ) {
        contentElem = document.createElement( 'div' );
        contentElem.classList.add( _t.Const.CLASS_TABLE_CELL_TOP );
        if( vmo.props && vmo.props[ column.field ] && !vmo.props[ column.field ].isArray && vmo.props[ column.field ].uiValue ) {
            contentElem.title = vmo.props[ column.field ].uiValue;
        }

        var gridCellText = document.createElement( 'span' );
        gridCellText.classList.add( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
        gridCellText.textContent = vmo.props && vmo.props[ column.field ] ? vmo.props[ column.field ].uiValue : '';

        if( tableElem && tableElem._tableInstance.dynamicRowHeightStatus ) {
            contentElem.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
        }
        contentElem.appendChild( gridCellText );
    }

    // isDirty update
    if( contentElem && vmo.props && vmo.props[ column.field ] ) {
        updateCellChangedClass( vmo.props[ column.field ], contentElem );
    }

    return contentElem;
};

export let createHeaderElement = function( column, tableElem ) {
    var contentElem = null;
    _.forEach( column.headerRenderers, function( renderer ) {
        if( !renderer.processing && renderer.condition( column, tableElem ) ) {
            // NOTE: When ASync rendering happens, this processing mechanism may have issue.
            // But for now the whole PL Table dosen't support ASync Rendering yet.
            renderer.processing = true;
            contentElem = renderer.action( column, tableElem );
            delete renderer.processing;
        }
        return !contentElem;
    } );

    return contentElem;
};

export const addDynamicCellHeight = function( vmo, cell ) {
    const dynamicCellText = cell.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC )[ 0 ];
    if( dynamicCellText ) {
        dynamicCellText.style.maxHeight = String( vmo.rowHeight ) + 'px';
    }
};

export const updateCell = function( cellElem, rowElem, table, tableEditor ) {
    // If cell is in edit we don't need to update as it is databound and will have latest value
    if( cellElem.isElementInEdit ) {
        return;
    }
    var oldCellTop = cellElem.children[ 0 ];
    var newCellTop = _t.Cell.createElement( cellElem.columnDef, rowElem.vmo, table, rowElem );
    if( table._tableInstance.dynamicRowHeightStatus === true ) {
        _t.Cell.addDynamicCellHeight( rowElem.vmo, newCellTop );
    }

    // LCS-145046 - Launch workflow for schedule Task - Item selected does not show open cell command
    // Move command cell to new cell if present
    //
    // LCS-164398 - ACE - adding child item in table mode, shows two show children icon
    // For the case, which custom cell renderer complies its own command WITH CONDITION, there is
    // a practice:
    // 1. Select item which dose not match the CONDITION. In this case, we will compile a native cell
    //    command for it. It will be dummy since the condition is not match in common case, but the DOM
    //    structure is there.
    // 2. After applying something (Add a child in ACE case), the CONDITION in custom cell renderer becomes
    //    true. Then the custom cell renderer will generate the cell.
    // 3. So for logic below, in this practice, we should not bring the old command - we should use the command
    //    In custom cell.
    // The only 2 cases which is going to have problem is select and hover for now - both of the should be fine
    // here.
    //
    // LCS-166330 Regression caused by Fix for LCS-164398
    // Be careful that all the DOM data structure are not OOTB JS type - in this case the classList is not array
    // but DOMTokenList. so we can't use put empty array as default value and assume it has '.contains'.
    //
    var currentCellLastChildClassList = null;
    var newCellCommandParentElem = null;
    var oldCellCommandParentElem = null;
    if( cellElem.columnDef.isTreeNavigation === true ) {
        newCellCommandParentElem = newCellTop.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_NON_EDIT_CONTAINER )[ 0 ];
        oldCellCommandParentElem = oldCellTop.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_NON_EDIT_CONTAINER )[ 0 ];
    } else {
        newCellCommandParentElem = newCellTop;
        oldCellCommandParentElem = oldCellTop;
    }

    currentCellLastChildClassList = newCellCommandParentElem.lastChild && newCellCommandParentElem.lastChild.classList ?
        newCellCommandParentElem.lastChild.classList : undefined;

    if( !( currentCellLastChildClassList && currentCellLastChildClassList.contains( _t.Const.CLASS_AW_CELL_COMMANDS ) ) &&
        oldCellCommandParentElem.lastChild && oldCellCommandParentElem.lastChild.classList &&
        oldCellCommandParentElem.lastChild.classList.contains( _t.Const.CLASS_NATIVE_CELL_COMMANDS ) ) {
        newCellCommandParentElem.appendChild( oldCellCommandParentElem.lastChild );
    }
    cellElem.replaceChild( newCellTop, oldCellTop );
    tableEditor.updateEditStatusForCell( cellElem );
};

exports = {
    createElement,
    createHeaderElement,
    addDynamicCellHeight,
    updateCell,
    updateCellChangedClass
};
export default exports;
