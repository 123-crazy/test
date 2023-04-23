/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/**
 * This module defines the edit function for PL Table.
 *
 * @module js/splmTableEditor
 */

import SPLMTableFillDown from 'js/splmTableFillDown';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import appCtxService from 'js/appCtxService';
import editHandlerSvc from 'js/editHandlerService';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import popupService from 'js/popupService';
import uwPropertyService from 'js/uwPropertyService';
import { getEditContext, displayAutoSaveOnGuidanceMessage, displayCellEditDisabledGuidanceMessage } from 'js/splmTableDirectEditUtils';
import browserUtils from 'js/browserUtils';

var SPLMTableEditor = function( tableElem, directiveElem ) {
    let _trv = new _t.Trv( tableElem );
    let _ctx = _t.util.getCtxObject( directiveElem );
    let _fillDown = new SPLMTableFillDown( tableElem );
    let _lovValueChangedEventSubs = {};
    let _blurHandler = null;
    let _focusProp = null;
    let _tableInstance = _t.util.getTableInstance( tableElem );
    let _selectedCell = null;
    let _saveEditPromise = null;
    let _escapeKeyHandler = null;
    let _enterKeyHandler = null;
    let _fillDownSaveInprogress = false;
    const ariaReadOnly = 'aria-readonly';
    const ariaActiveDescendant = 'aria-activedescendant';

    let _eventBusSubs = [];

    let self = this; // eslint-disable-line no-invalid-this

    const destroyLovEventListeners = function() {
        _.forEach( _lovValueChangedEventSubs, function( subscription ) {
            eventBus.unsubscribe( subscription );
        } );
        _lovValueChangedEventSubs = {};
    };

    self.cleanupEventBusSubscriptions = function() {
        destroyLovEventListeners();
        _.forEach( _eventBusSubs, function( sub ) {
            eventBus.unsubscribe( sub );
        } );
        _eventBusSubs = [];
    };

    self.setFocusProp = function( prop ) {
        _focusProp = prop;
    };

    const triggerBlurHandler = function() {
        if( _blurHandler ) {
            _blurHandler();
        }
    };

    self.updateEditStatus = function() {
        triggerBlurHandler();
        var cellElems = _trv.getContentCellElementsFromTable();
        _.forEach( cellElems, function( elem ) {
            self.updateEditStatusForCell( elem );
        } );
        if( !_t.util.isBulkEditing( tableElem ) ) {
            _focusProp = null;
            destroyLovEventListeners();
        }
    };

    const toggleLinkStyle = function( element, isLinkStyle ) {
        if( isLinkStyle ) {
            // disabled to active link
            var linkElements = element.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS_DISABLED );
            for( var i = linkElements.length; i > 0; i-- ) {
                var linkElem = linkElements[ i - 1 ];
                if( linkElem && linkElem.classList ) {
                    linkElem.classList.add( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS );
                    linkElem.classList.remove( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS_DISABLED );
                }
            }
        } else {
            // active to disabled links
            linkElements = element.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS );
            for( var j = linkElements.length; j > 0; j-- ) {
                var linkElem1 = linkElements[ j - 1 ];
                if( linkElem1 && linkElem1.classList ) {
                    linkElem1.classList.add( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS_DISABLED );
                    linkElem1.classList.remove( _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS );
                }
            }
        }
    };

    /**
     * Ensure the drag handle is the last element in the parent container.
     *
     * @param {DOMElement} cell - cell with drag handle to re-append
     */
    const ensureDragHandleLastChild = function( cell ) {
        var dragHandleElements = cell.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_CELL_DRAG_HANDLE );
        if( dragHandleElements.length > 0 ) {
            dragHandleElements[ 0 ].parentElement.appendChild( dragHandleElements[ 0 ] );
        }
    };

    const reverseEditCell = function( cell, vmo, column, cellElemProperty ) {
        if( cell.parentElement === null ) {
            return;
        }
        cell.isElementInEdit = false;
        var editCells = cell.getElementsByClassName( _t.Const.CLASS_TABLE_EDIT_CELL_TOP );
        var isErrorProperty = false;
        var cellTopElement = _t.Cell.createElement( column, vmo, tableElem, cell.parentElement );
        if( _tableInstance.dynamicRowHeightStatus === true ) {
            _t.Cell.addDynamicCellHeight( vmo, cellTopElement );
        }
        if( editCells.length > 0 ) {
            var editCell = editCells[ 0 ];
            if( cellElemProperty.isArray && self.popupRef ) {
                popupService.hide( self.popupRef );
                self.popupRef = null;
            } else {
                editCell.parentElement.removeChild( editCell );
            }

            setTimeout( function() {
                var propertyErrorElements = editCell.getElementsByClassName( 'aw-widgets-propertyError' );
                if( propertyErrorElements.length > 0 ) {
                    isErrorProperty = true;
                }
                if( isErrorProperty ) {
                    cellTopElement.classList.add( 'aw-widgets-propertyError' );
                }!cellElemProperty.isArray && _t.util.destroyNgElement( editCell );
            }, 1000 );
        }

        cell.classList.remove( _t.Const.CLASS_AW_IS_EDITING );
        cell.appendChild( cellTopElement );

        var cellTopElements = cell.getElementsByClassName( _t.Const.CLASS_TABLE_CELL_TOP );

        if( cellTopElements.length > 0 ) {
            cellTopElements[ 0 ].classList.add( _t.Const.CLASS_AW_EDITABLE_CELL );
        }

        ensureDragHandleLastChild( cell );
    };

    const removeFocusEvents = function( cellElem ) {
        const useCapture = true;
        cellElem.removeEventListener( 'focus', cellElem.onFocusEvent, useCapture );
        cellElem.onFocusEvent = null;
        cellElem.removeEventListener( 'mousedown', cellElem.onFocusClickEvent );
        cellElem.onFocusClickEvent = null;
    };

    const getClickEventForIE = function( ctrlKey, shiftKey ) {
        let event = document.createEvent( 'MouseEvent' );
        event.initMouseEvent( 'click', true, true, window, 0, event.screenX, event.screenY, event.clientX, event.clientY, ctrlKey, false, shiftKey, false, 0, null );
        return event;
    };

    let _isUserClick = false;
    let _isCtrlKey = false;
    const addFocusEvent = function( cellElem, vmo ) {
        removeFocusEvents( cellElem );
        const onFocusEvent = function() {
            // Update row selection if clicking on editable cell. This is needed because UW widget stops propagation of the event
            // to the row element when it is created.
            if( _isUserClick ) {
                // Support for IE
                let eventObj;
                if( browserUtils.isIE ) {
                    eventObj = getClickEventForIE( _isCtrlKey, false );
                } else {
                    eventObj = new MouseEvent( 'click', { ctrlKey: _isCtrlKey } );
                }
                cellElem.parentElement.dispatchEvent( eventObj );
                _isUserClick = false;
                _isCtrlKey = false;
            }
            self.editCell( cellElem, vmo );
        };

        cellElem.onFocusEvent = onFocusEvent;
        const useCapture = true;
        // LCS-357443: IE does not focus the cell when using element.onfocus.
        // Instead focus event must be added with addEventListener and useCapture as true.
        cellElem.addEventListener( 'focus', onFocusEvent, useCapture );

        const isFocusClickEvent = function( event ) {
            _isUserClick = true;
            _isCtrlKey = event.ctrlKey;
        };
        cellElem.isFocusClickEvent = isFocusClickEvent;
        cellElem.addEventListener( 'mousedown', isFocusClickEvent );
    };

    const addEditStatus = function( cellElem, cellElemProperty, vmo ) {
        if( cellElem.children[ 0 ] ) {
            cellElem.children[ 0 ].classList.add( _t.Const.CLASS_AW_EDITABLE_CELL );
            var rowHeight = _t.util.getTableRowHeight( _tableInstance.gridOptions, undefined );
            if( rowHeight !== undefined ) {
                cellElem.children[ 0 ].style.height = rowHeight + 'px';
            }
        } else {
            logger.debug( cellElem.propName + ' has no child' );
        }

        addFocusEvent( cellElem, vmo );

        if( !cellElemProperty.isArray ) {
            _fillDown.enableFillDown( cellElem );
        }
        toggleLinkStyle( cellElem, false );

        // for saved cells in partial edit status
        var cellTop = cellElem.getElementsByClassName( _t.Const.CLASS_TABLE_CELL_TOP )[ 0 ] || cellElem.getElementsByClassName( _t.Const.CLASS_TABLE_EDIT_CELL_TOP )[ 0 ];
        _t.Cell.updateCellChangedClass( cellElemProperty, cellTop );

        if( _focusProp === cellElem.prop ) {
            self.editCell( cellElem, vmo );
        }
    };

    const removeBlurHandler = function() {
        const useCapture = true;
        _trv.getRootElement().removeEventListener( 'click', _blurHandler, useCapture );
    };

    const removeEscapeAndEnterHandlers = function( cell ) {
        document.body.removeEventListener( 'keydown', _escapeKeyHandler, true );
        cell.removeEventListener( 'keydown', _enterKeyHandler, true );
        _escapeKeyHandler = null;
        _enterKeyHandler = null;
    };

    const setBlurHandler = function( blurHandler ) {
        _blurHandler = blurHandler;
    };

    const removeEditStatus = function( cellElem, cellElemProperty, vmo, skipCellCreation ) {
        const cellTopElem = cellElem.getElementsByClassName( _t.Const.CLASS_TABLE_CELL_TOP )[ 0 ];
        if( cellTopElem && ( cellTopElem.classList.contains( _t.Const.CLASS_AW_EDITABLE_CELL ) || cellTopElem.classList.contains( _t.Const.CLASS_CELL_CHANGED ) ) ||
            cellElem.propIsEditableCache ) {
            if( !cellElemProperty.isArray && !cellElem.isSelected ) {
                _fillDown.disableFillDown( cellElem );
            }
            if( !skipCellCreation ) {
                cellElem.removeChild( cellTopElem );
                reverseEditCell( cellElem, vmo, cellElem.columnDef, cellElemProperty );
            }
            cellElem.children[ 0 ].classList.remove( _t.Const.CLASS_AW_EDITABLE_CELL );
            removeFocusEvents( cellElem );
        }
        toggleLinkStyle( cellElem, true );
    };

    self.updateEditStatusForCell = function( cellElem ) {
        var cellElemProperty = cellElem.prop;
        var vmo = _t.util.getViewModelObjectByCellElement( cellElem );

        if( cellElem.propName && cellElemProperty && cellElem.columnDef.isTreeNavigation !== true ) {
            // LCS-142669 - read modifiable besides of isEditable
            if( cellElemProperty.isEditable && cellElem.columnDef.modifiable !== false && _t.util.isBulkEditing( tableElem ) ) {
                addEditStatus( cellElem, cellElemProperty, vmo );
            } else if( cellElem.isSelected && cellElem.propIsEditableCache && cellElemProperty.isPropInEdit ) {
                addEditStatus( cellElem, cellElemProperty, vmo );
            } else {
                removeEditStatus( cellElem, cellElemProperty, vmo );
                if( _t.util.isBulkEditing( tableElem ) ) {
                    cellElem.setAttribute( ariaReadOnly, 'true' );
                } else if( cellElem.hasAttribute( ariaReadOnly ) && cellElem.propIsEditableCache !== false ) {
                    cellElem.removeAttribute( ariaReadOnly );
                }
            }
        } else if( _t.util.isBulkEditing( tableElem ) ) {
            cellElem.setAttribute( ariaReadOnly, 'true' );
        } else if( cellElem.hasAttribute( ariaReadOnly ) && cellElem.propIsEditableCache !== false ) {
            cellElem.removeAttribute( ariaReadOnly );
        }
    };

    /**
     * Subscribe to lovValueChangedEvent. Update dependent cells
     *
     * @param {HTMLElement} cell - the cell element
     * @param {ViewModelObject} vmo - the view model object
     * @param {ViewModelProperty} prop - the property
     *
     * @return {Object} the eventBus subscription
     */
    const subscribeToLovValueChangedEvent = function( cell, vmo, prop ) {
        return eventBus.subscribe( prop.propertyName + '.lovValueChanged', function() {
            // Update dependent LOVS only
            if( !prop.lovApi || !prop.lovApi.result || prop.lovApi.result.behaviorData.style !== 'Interdependent' ) {
                return;
            }

            prop.lovApi.result.behaviorData.dependendProps.forEach( function( propertyName ) {
                // Only update cells for other props
                if( prop.propertyName !== propertyName ) {
                    var row = cell.parentElement;
                    // Find the cell
                    _.forEach( row.children, function( cellElem ) {
                        if( cellElem.propName === propertyName ) {
                            // Update cell content
                            var oldCellTop = cellElem.children[ 0 ];
                            var newCellTop = _t.Cell.createElement( cellElem.columnDef, row.vmo, tableElem, row );
                            if( _tableInstance.dynamicRowHeightStatus === true ) {
                                _t.Cell.addDynamicCellHeight( vmo, newCellTop );
                            }
                            newCellTop.classList.add( _t.Const.CLASS_AW_EDITABLE_CELL );
                            cellElem.replaceChild( newCellTop, oldCellTop );
                            cellElem.isDependantEdit = true;
                            if( !_t.util.isBulkEditing( tableElem ) && _t.util.isAutoSaveEnabled( tableElem ) ) {
                                self.removeAllCellSelection();
                                self.editCell( cellElem, vmo );
                            }
                            return false;
                        }
                        return true;
                    } );
                }
            } );
        } );
    };

    /**
     * Cancels edits if isDirty() comes back false
     */
    const cancelEditsIfNotDirty = function() {
        const context = getEditContext( _tableInstance );
        let editHandler = null;
        let isDirtyPromise;
        if( context ) {
            editHandler = editHandlerSvc.getEditHandler( context );
            isDirtyPromise = editHandler.isDirty();
        } else if( _tableInstance.dataProvider.getEditConfiguration() ) {
            isDirtyPromise = _tableInstance.dataProvider.isDirty();
        } else if( _tableInstance.declViewModel.getEditConfiguration() ) {
            isDirtyPromise = _tableInstance.declViewModel.isDirty();
        }

        if( isDirtyPromise ) {
            isDirtyPromise.then( function( isDirty ) {
                // If the handler is not dirty cancel edits to get out of edit mode.
                if( !isDirty ) {
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
            } );
        }
    };

    /**
     * Handles cell editing functionality for the blur event
     * @param {Event} event - the blur event
     * @param {DOMElement} cell - The cell element
     * @param {ViewModelProperty} prop - The property
     * @param {ViewModelObject} vmo - The view model object
     */
    const handleCellEditBlur = function( event, cell, prop, vmo ) {
        // Autosave the cell on blur when in autosave mode
        if( !_t.util.isBulkEditing( tableElem ) && _t.util.isAutoSaveEnabled( tableElem ) && event && !_fillDownSaveInprogress ) {
            // Stop the event bubbling so save can finish first, we will resend the click when save is finished
            event.stopPropagation();
            event.preventDefault();
            _fillDown.disableFillDown( cell );
            const handleSaveEditPromise = function() {
                _saveEditPromise = null;
                let clickElement = event.target;
                // Elements like svg don't have a click function, so bubble up till we have a clickable element.
                while( !clickElement.click ) {
                    clickElement = clickElement.parentElement;
                }
                // Without setTimeout, angular is giving a $digest already in progress error.
                setTimeout( function() {
                    clickElement.click();
                }, 0 );
            };
            _saveEditPromise = self.saveEdit( [ cell ] ).catch( logger.error ).finally( handleSaveEditPromise );
        } else if( !_t.util.isBulkEditing( tableElem ) && !_t.util.isAutoSaveEnabled( tableElem ) ) {
            cancelEditsIfNotDirty();
            removeEditStatus( cell, prop, vmo, true );
        }
    };

    /**
     * Returns the focusable cell info if it is focusable
     *
     * @param {Object} column - the column
     * @param {ViewModelObject} vmo - the vmo
     *
     * @return {Object} the focusable cell's info
     */
    const getFocusableCellInfo = function( column, vmo ) {
        if( column.modifiable !== false && !column.isTreeNavigation ) {
            const propName = column.propertyName || column.field;
            const prop = vmo.props[ propName ];
            if( prop && prop.isEditable ) {
                return {
                    vmo: vmo,
                    column: column
                };
            }
        }
    };

    /**
     * Returns the info of the next focusable cell
     *
     * @param {ViewModelObject} currentVMO - the current vmo
     * @param {Object} currentColumn - the current column
     * @param {boolean} reverseDirection - true if going in the reverse direction
     *
     * @return {Object} the next focusable cell's info
     */
    const getNextFocusableCellInfo = ( currentVMO, currentColumn, reverseDirection ) => {
        let columns = _tableInstance.dataProvider.cols.filter( function( col ) {
            return !col.hiddenFlag;
        } );
        const currentIdx = columns.indexOf( currentColumn );

        // Reverse the columns order if we are going in reverse
        if( reverseDirection ) {
            columns = columns.slice().reverse();
        }

        for( let i = currentIdx + 1; i < columns.length; i++ ) {
            const col = columns[ i ];
            const focusableCellInfo = getFocusableCellInfo( col, currentVMO );
            if( focusableCellInfo ) {
                return focusableCellInfo;
            }
        }

        // If no cell was found, check next vmo until found  -- Limit - Until end of data, will not page while looking
        const loadedVMOs = _tableInstance.dataProvider.viewModelCollection.loadedVMObjects;
        const currentVMOIndex = _tableInstance.dataProvider.viewModelCollection.findViewModelObjectById( currentVMO.uid );
        for( let i = currentVMOIndex + 1; i < loadedVMOs.length; i++ ) {
            const nextVMO = loadedVMOs[ i ];
            for( let y = 0; y < columns.length; y++ ) {
                const col = columns[ y ];
                const focusableCellInfo = getFocusableCellInfo( col, nextVMO );
                if( focusableCellInfo ) {
                    return focusableCellInfo;
                }
            }
        }

        // If we still haven't found anything, then there are no more editable cells available, return null
        return null;
    };

    const attachKeydownHandler = ( cellElem ) => {
        cellElem.onkeydown = ( event ) => {
            if( event.code !== 'Tab' ) {
                return;
            }

            let reverseTab = false;
            if( event.shiftKey ) {
                reverseTab = true;
            }

            // Now check vmo for next editable column.
            const closestVMO = event.target.closest( '.ui-grid-row' ).vmo;
            const column = event.target.closest( '.ui-grid-cell' ).columnDef;
            const nextEditableInfo = getNextFocusableCellInfo( closestVMO, column, reverseTab );

            // Scroll to that cell if exists
            if( nextEditableInfo ) {
                event.preventDefault();
                event.stopPropagation();

                const vmoIndex = _tableInstance.dataProvider.viewModelCollection.findViewModelObjectById( nextEditableInfo.vmo.uid );

                triggerBlurHandler();

                _tableInstance.renderer.scrollToRowIndex( [ vmoIndex ] );
                if( !nextEditableInfo.column.pinnedLeft ) {
                    _tableInstance.renderer.scrollToColumn( nextEditableInfo.column );
                }

                setTimeout( () => {
                    // Get the cell and focus it after it is scrolled into view
                    const firstRowOnDom = tableElem.getElementsByClassName( 'ui-grid-row' )[ 0 ];
                    if( firstRowOnDom ) {
                        const editableRowRelativeIdx = vmoIndex - firstRowOnDom.getAttribute( 'data-indexNumber' );
                        let rowElem;
                        if( nextEditableInfo.column.pinnedLeft ) {
                            rowElem = _trv.getPinContentRowElementFromTable( editableRowRelativeIdx );
                        } else {
                            rowElem = _trv.getScrollContentRowElementFromTable( editableRowRelativeIdx );
                        }
                        const cellElems = rowElem && rowElem.getElementsByClassName( 'ui-grid-cell' ) || [];
                        const cellElem = _.filter( cellElems, { columnDef: nextEditableInfo.column } )[ 0 ];
                        if( cellElem ) {
                            self.editCell( cellElem, nextEditableInfo.vmo );
                        }
                    }
                }, 200 );
            }
        };
    };

    const attachEscapeKeyHandler = ( cell, prop, vmo, column ) => {
        // Set listener for Escape key and reverse edit cell
        _escapeKeyHandler = ( event ) => {
            if( event.key !== 'Escape' ) {
                return;
            }

            const currentCell = _t.util.closestElement( event.target, '.' + _t.Const.CLASS_CELL );
            if( currentCell === cell && cell.isElementInEdit ) {
                event.stopPropagation();
                uwPropertyService.resetUpdates( prop );
                reverseEditCell( cell, vmo, column, prop );
                if( !_t.util.isBulkEditing( tableElem ) ) {
                    prop.isPropInEdit = false;
                    removeEditStatus( cell, prop, vmo, true );

                    // Check if isDirty still, is so, do nothing, else cancel edits
                    cancelEditsIfNotDirty();
                    removeEscapeAndEnterHandlers( cell );
                    cell.focus();
                } else {
                    // Readd click handler to allow cell to go back into edit
                    addFocusEvent( cell, vmo );
                }
            } else {
                const context = getEditContext( _tableInstance );
                let editHandler = editHandlerSvc.getEditHandler( context );
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
        document.body.addEventListener( 'keydown', _escapeKeyHandler, true );
    };

    const attachEnterKeyHandler = ( cell, blurHandler ) => {
        const hasPopupExpanded = ( element ) => {
            const popupVisible = element.getElementsByClassName( 'aw-jswidgets-popUpVisible' );
            const expanded = element.getElementsByClassName( 'aw-jswidgets-expanded' );
            return popupVisible.length + expanded.length > 0;
        };

        _enterKeyHandler = ( event ) => {
            if( event.key === 'Enter' && !event.altKey && !_t.util.isBulkEditing( tableElem ) ) {
                const currentCell = _t.util.closestElement( event.target, '.' + _t.Const.CLASS_CELL );
                // Special handling for array properties
                const isArrayProperty = currentCell.prop && currentCell.prop.isArray;
                if( isArrayProperty ) {
                    if( event.target.value === '' ) {
                        event.stopPropagation();
                        blurHandler( event );
                        if( !_t.util.isBulkEditing( tableElem ) ) {
                            currentCell.focus();
                        }
                    }
                } else {
                    // If there isn't a popup in the children, then call blurhandler
                    if( currentCell && !hasPopupExpanded( currentCell ) ) {
                        event.stopPropagation();
                        blurHandler( event );
                        if( _saveEditPromise ) {
                            _saveEditPromise.then( function() {
                                currentCell.focus();
                            } );
                        } else {
                            currentCell.focus();
                        }
                    }
                }
            }
        };
        cell.addEventListener( 'keydown', _enterKeyHandler, true );
    };

    const publishCellStartEditEvent = ( cell, vmo ) => {
        const eventData = {
            columnInfo: cell.columnDef,
            gridId: tableElem.id,
            vmo: vmo
        };

        eventBus.publish( tableElem.id + '.cellStartEdit', eventData );
    };

    const handleLovValueChangedEvent = ( cell, vmo, prop ) => {
        const lovValueChangedEventSub = subscribeToLovValueChangedEvent( cell, vmo, prop );
        var oldLovSubscr = _lovValueChangedEventSubs[ prop.parentUid + prop.propertyName ];
        if( oldLovSubscr ) {
            eventBus.unsubscribe( oldLovSubscr );
            delete _lovValueChangedEventSubs[ prop.parentUid + prop.propertyName ];
        }
        _lovValueChangedEventSubs[ prop.parentUid + prop.propertyName ] = lovValueChangedEventSub;
    };

    const isUserInteractingWithDropDown = ( prop, event ) => {
        if( prop.hasLov && event ) {
            const listBoxDrop = document.getElementsByClassName( 'aw-jswidgets-drop' )[ 0 ];
            if( listBoxDrop && listBoxDrop.contains( event.target ) ) {
                return true;
            }
        } else if( prop.type && event && ( prop.type === 'DATE' || prop.type === 'DATEARRAY' ) ) {
            const datePicker = document.getElementsByClassName( 'aw-jswidgets-datepicker' )[ 0 ];
            if( datePicker && datePicker.contains( event.target ) ) {
                return true;
            }
            const dateTimeDrop = document.getElementsByClassName( 'aw-jswidgets-dateTimeDrop' )[ 0 ];
            if( dateTimeDrop && dateTimeDrop.contains( event.target ) ) {
                return true;
            }
        }
    };

    const createAndAttachEditCell = ( prop, column, cell ) => {
        // for array fields, application should use popup to display it,
        // or you will face cut off issues: LCS-161794
        const editNonArrayClass = prop.isArray ? '' : ' ' + _t.Const.CLASS_TABLE_EDIT_CELL_NON_ARRAY;
        const html = '<div class="aw-splm-tableEditCellTop' + editNonArrayClass + '"><div class="aw-jswidgets-tableEditContainer aw-jswidgets-cellTop">' +
            '<aw-property-val prop="prop" hint="hint" in-table-cell="true"></aw-property-val></div></div>';

        prop.autofocus = true;

        const cellScope = {
            prop: prop,
            hint: column.renderingHint
        };

        const compiledElem = _t.util.createNgElement( html, cell, cellScope );

        attachKeydownHandler( compiledElem );

        _t.Cell.updateCellChangedClass( prop, compiledElem.getElementsByClassName( _t.Const.CLASS_AW_JS_CELL_TOP )[ 0 ] );
        if( prop.isArray ) {
            popupService.show( {
                domElement: compiledElem,
                context: _t.util.getElementScope( compiledElem, true ),
                options: {
                    whenParentScrolls: 'follow',
                    parent: cell,
                    reference: cell,
                    overlapOnReference: true,
                    containerWidth: cell.getBoundingClientRect().width,
                    forceCloseOthers: false
                }
            } ).then( ( popupRef ) => {
                self.popupRef = popupRef;
            } );
        } else {
            cell.insertBefore( compiledElem, cell.childNodes[ 0 ] );
        }
    };

    /**
     * Starts the edit of the cell
     * @param {DOMElement} cell The cell element
     * @param {Object} vmo the view model object
     */
    self.editCell = function( cell, vmo ) {
        const column = cell.columnDef;
        const prop = cell.prop;
        if( !cell.isSelected && !_t.util.isBulkEditing( tableElem ) && !cell.isDependantEdit || cell.isElementInEdit === true ) {
            return;
        }

        publishCellStartEditEvent( cell, vmo );

        // Trigger the previous blur handler
        triggerBlurHandler();

        cell.isElementInEdit = true;
        prop.isPropInEdit = true;

        cell.classList.add( _t.Const.CLASS_AW_IS_EDITING );

        // Handle possible lov value changes
        handleLovValueChangedEvent( cell, vmo, prop );

        // Remove cell top
        var editableGridCell = cell.getElementsByClassName( _t.Const.CLASS_TABLE_CELL_TOP )[ 0 ];
        if( editableGridCell ) {
            cell.removeChild( editableGridCell );
        }

        var originAutoFocus = prop.autofocus;
        createAndAttachEditCell( prop, column, cell );
        removeFocusEvents( cell );

        var blurHandler = function( event ) {
            let selectedCell = null;
            if( event && event.type !== 'keydown' ) {
                _focusProp = null;
                selectedCell = _t.util.closestElement( event.target, '.' + _t.Const.CLASS_CELL );
            }
            if( !cell.isElementInEdit ) {
                removeBlurHandler();
                removeEscapeAndEnterHandlers( cell );
            } else if( selectedCell !== cell && cell.isElementInEdit ) {
                // Close panels
                if( _ctx.panelContext && _ctx.panelContext.addTypeRef === true ) {
                    // If clicking on different cell close the panel else leave it open
                    if( cell.propName !== prop.propertyName || cell.parentElement.vmo.uid !== prop.parentUid ) {
                        eventBus.publish( 'completed', {
                            source: 'toolAndInfoPanel'
                        } );
                    } else {
                        return;
                    }
                }

                if( isUserInteractingWithDropDown( prop, event ) ) {
                    return true;
                }

                // Remove the blur handler since cell is going out of edit
                removeBlurHandler();
                removeEscapeAndEnterHandlers( cell );

                // Reverse the cell edit
                reverseEditCell( cell, vmo, column, prop );

                prop.autofocus = originAutoFocus;
                prop.isPropInEdit = false;

                cell.isSelected = false;
                delete cell.isDependantEdit;

                // Handle cell editing functionality on blur
                handleCellEditBlur( event, cell, prop, vmo );

                // Readd click handler to allow cell to go back into edit
                addFocusEvent( cell, vmo );
            }
        };

        // Add blur handler to take cell out of edit on click away
        removeBlurHandler();
        removeEscapeAndEnterHandlers( cell );

        // Setting useCapture to true is needed for autosave since it allows us to detect the click before the target
        // element does.
        const useCapture = true;
        _trv.getRootElement().addEventListener( 'click', blurHandler, useCapture );

        attachEscapeKeyHandler( cell, prop, vmo, column );
        attachEnterKeyHandler( cell, blurHandler );

        setBlurHandler( blurHandler );
    };

    /**
     * Checks the cell prop's isEditable property
     * @param {DOMElement} cellElem The cell element
     * @returns {Boolean} if the prop is editable
     */
    const checkPropIsEditable = function( cellElem ) {
        return cellElem && cellElem.prop && cellElem.prop.isEditable && cellElem.prop.isEnabled !== false;
    };

    self.isPropertiesEditablePromise = function( editOptions ) {
        let editPromise;
        const editContext = getEditContext( _tableInstance );
        if( editContext ) {
            // Trigger leave confirmation on previous active handler in case it was editing since only one editHandler
            // can be editing at any given time.
            const previousActiveHandler = editHandlerSvc.getActiveEditHandler();
            if( previousActiveHandler && previousActiveHandler !== editHandlerSvc.getEditHandler( editContext ) && previousActiveHandler.editInProgress() ) {
                editPromise = new Promise( ( resolve ) => {
                    previousActiveHandler.leaveConfirmation( () => {
                        editHandlerSvc.setActiveEditHandlerContext( editContext );
                        editHandlerSvc.startEdit( editOptions ).then( () => {
                            resolve();
                        } );
                    } );
                } );
            } else {
                editHandlerSvc.setActiveEditHandlerContext( editContext );
                editPromise = editHandlerSvc.startEdit( editOptions );
            }
        } else if( _tableInstance.dataProvider.getEditConfiguration() ) {
            const dataCtxNode = {
                data: _tableInstance.declViewModel,
                ctx: appCtxService.ctx
            };
            editPromise = _tableInstance.dataProvider.startEdit( dataCtxNode, _tableInstance.declViewModel, editOptions );
        } else if( _tableInstance.declViewModel.getEditConfiguration() ) {
            editPromise = _tableInstance.declViewModel.startEdit( editOptions );
        }

        return editPromise ? editPromise : Promise.resolve( false );
    };

    /**
     * Checks if the provided cell/property is editable by calling startEdit on the editHandler or editConfig
     * @param {Object} vmo The view model object
     * @param {DOMElement} cellElem The cell element
     *
     * @returns {Promise<Boolean>} Promise that will resolve to the editability of the property
     */
    const isCellEditable = function( vmo, cellElem ) {
        const _isCellEditablePromise = function() {
            const prop = cellElem.prop;
            let propertyNames = [ prop.propertyName ];
            // Need to pass all dependent props to ensure we have latest lsd
            if( prop.lovApi && prop.lovApi.result && prop.lovApi.result.behaviorData.style === 'Interdependent' ) {
                propertyNames = prop.lovApi.result.behaviorData.dependendProps;
            }
            let editOpts = {
                vmos: [ vmo ],
                propertyNames: propertyNames,
                autoSave: _t.util.isAutoSaveEnabled( tableElem )
            };
            return self.isPropertiesEditablePromise( editOpts ).then( function( result ) {
                if( result === false ) {
                    return false;
                }
                return checkPropIsEditable( cellElem );
            } );
        };

        // Allow save to finish before checking start edit
        if( _saveEditPromise ) {
            return _saveEditPromise.then( () => {
                return _isCellEditablePromise();
            } );
        }

        return _isCellEditablePromise();
    };

    /**
     * Saved the provided cell/property that was edited
     * @param {DOMElement[]} cells the cells to save
     * @returns {Promise<Boolean>} Promise that will resolve when save is complete
     */
    self.saveEdit = function( cells ) {
        // Clear prop is editable cache to ensure newly selected cell makes a startEdit call, since
        // our save call will likely invalidate the editable cache. This is also ensuring that double click on
        // another cell takes that cell into edit instead of selected state.
        const persistEditableFlag = true;
        self.clearPropIsEditableCache( persistEditableFlag );
        let isPartialSaveDisabled = true;
        let editPromise = null;
        const editContext = getEditContext( _tableInstance );
        if( editContext ) {
            editPromise = editHandlerSvc.saveEdits( editContext, isPartialSaveDisabled, _t.util.isAutoSaveEnabled( tableElem ) );
        } else if( _tableInstance.dataProvider.getEditConfiguration() ) {
            const dataCtxNode = {
                data: _tableInstance.declViewModel,
                ctx: appCtxService.ctx
            };
            editPromise = _tableInstance.dataProvider.saveEdits( dataCtxNode, _tableInstance.declViewModel );
        } else if( _tableInstance.declViewModel.getEditConfiguration() ) {
            editPromise = _tableInstance.declViewModel.saveEdits();
        }

        if( editPromise ) {
            return editPromise.finally( function() {
                self.setCellEditingContext( false );
                for( let i = 0; i < cells.length; i++ ) {
                    if( document.body.contains( cells[ i ] ) ) {
                        self.updateEditStatusForCell( cells[ i ] );
                    }
                }
            } );
        }
        return Promise.resolve( false );
    };

    /**
     * Removes the selected and selectedEditable css classes from any elements that have them
     */
    const removeCellSelection = function() {
        // Remove all other "selected" classes from cells
        let selected1 = Array.prototype.slice.call( tableElem.getElementsByClassName( _t.Const.CLASS_TABLE_CELL_SELECTED_EDITABLE ) );
        let selected2 = Array.prototype.slice.call( tableElem.getElementsByClassName( _t.Const.CLASS_TABLE_CELL_SELECTED ) );
        let elems = selected1.concat( selected2 );
        for( let i = 0; i < elems.length; i++ ) {
            elems[ i ].classList.remove( _t.Const.CLASS_TABLE_CELL_SELECTED_EDITABLE );
            elems[ i ].classList.remove( _t.Const.CLASS_TABLE_CELL_SELECTED );
            let containerElement = null;
            // The below method can result in undefined value.
            containerElement = _trv.getTableContainerElementFromTable();
            if( containerElement && containerElement.hasAttribute( ariaActiveDescendant ) ) {
                containerElement.removeAttribute( ariaActiveDescendant );
            }
        }
    };

    /**
     * Updates the cell to be selected and sets selection/edit info to false on old selected cell
     * @param {DOMElement} cell The new selected cell
     * @param {Boolean} persistEditableFlag flag to denote if isEditable should be persisted
     */
    const updateSelectedCell = function( cell, persistEditableFlag ) {
        if( _selectedCell ) {
            _selectedCell.isSelected = false;
            // If prop edit is not enabled we should not touch the prop.isEditable flag
            if( !persistEditableFlag && _selectedCell.prop && _t.util.isPropEditEnabled( tableElem ) && !_t.util.isBulkEditing( tableElem ) ) {
                _selectedCell.prop.isEditable = false;
            }
        }

        if( cell ) {
            cell.classList.add( _t.Const.CLASS_TABLE_CELL_SELECTED );
            cell.isSelected = true;
            _selectedCell = cell;
            let containerElement = null;
            // The below method can result in undefined value.
            containerElement = _trv.getTableContainerElementFromTable();
            if( containerElement ) {
                containerElement.setAttribute( ariaActiveDescendant, cell.getAttribute( 'id' ) );
            }
        } else {
            _selectedCell = null;
        }
    };

    self.clearPropIsEditableCache = function( persistEditableFlag ) {
        const cellElems = _trv.getContentCellElementsFromTable();
        _.forEach( cellElems, function( elem ) {
            delete elem.propIsEditableCache;
            if( elem.hasAttribute( ariaReadOnly ) ) {
                elem.removeAttribute( ariaReadOnly );
            }
        } );
        // Reset cell selection since we are clearing editibility cache
        // making the editability selection classes no longer valid
        removeCellSelection();
        const currentSelectedCell = _selectedCell;
        updateSelectedCell( null, persistEditableFlag );
        if( currentSelectedCell ) {
            setTimeout( function() {
                const eventObject = {
                    ctrlKey: false,
                    shiftKey: false,
                    type: 'click'
                };
                self.onClickHandler( eventObject, currentSelectedCell, _t.util.getViewModelObjectByCellElement( currentSelectedCell ) );
            }, 0 );
        }
    };

    /**
     * Update the cell editability by using the cached editability or loading the editability if it is not cached
     * @param {DOMElement} cell - The cell element to get editability for
     * @param {Object} vmo - the row's view model object
     */
    const updateCellEditability = ( cell, vmo ) => {
        // Make some SOA call here for getting the editability
        removeCellSelection();
        updateSelectedCell( cell );

        // Check if cellEdit is enabled and if this cell/prop type supports edit
        const isCellEditSupported = _t.util.isPropEditEnabled( tableElem ) && cell.propName && cell.prop && cell.columnDef.isTreeNavigation !== true;
        if( !isCellEditSupported ) {
            cell.setAttribute( ariaReadOnly, 'true' );
            return;
        }

        // If prop is modified we can restore editability cache since we know it has not been saved
        // and was previously editable
        if( uwPropertyService.isModified( cell.prop ) && cell.propIsEditableCache === undefined && !_t.util.isAutoSaveEnabled( tableElem ) ) {
            cell.propIsEditableCache = true;
        }

        // Check if editability info exists, if not
        // Check columnDef if editable, if not add readonly class
        // If editable, make startEdit call to get editability for cell
        if( cell.columnDef.name !== 'icon' && cell.columnDef.modifiable !== false && cell.propIsEditableCache === undefined ) {
            cell.isCellEditablePromise = isCellEditable( vmo, cell ).then( function( isEditable ) {
                cell.propIsEditableCache = isEditable;
                if( cell.propIsEditableCache === false ) {
                    cell.setAttribute( ariaReadOnly, 'true' );
                } else if( cell.hasAttribute( ariaReadOnly ) ) {
                    cell.removeAttribute( ariaReadOnly );
                }
                if( cell.isSelected ) {
                    if( isEditable ) {
                        cell.classList.add( _t.Const.CLASS_TABLE_CELL_SELECTED_EDITABLE );
                    }
                    if( !cell.prop.isArray ) {
                        _fillDown.enableFillDown( cell );
                    }
                }
            } ).then( function() {
                delete cell.isCellEditablePromise;
            } );
            return;
        }

        if( cell.propIsEditableCache ) {
            // Mark the prop as editable since the cache tells us it is editable
            cell.prop.isEditable = true;
            cell.classList.add( _t.Const.CLASS_TABLE_CELL_SELECTED_EDITABLE );
            if( cell.hasAttribute( ariaReadOnly ) ) {
                cell.removeAttribute( ariaReadOnly );
            }
        } else if( cell.propIsEditableCache === false ) {
            cell.setAttribute( ariaReadOnly, 'true' );
        }
    };

    let _guidanceMessageInitialized = false;

    /**
     * Updates ctx and the editHandler/editConfig to be in editing mode when autosave is off.
     * Doing this ensures the edit command will get toggled when editing in autosave off mode.
     * @param {Boolean} isEditing - If in edit
     */
    self.setCellEditingContext = function( isEditing ) {
        // Enable/disable caching
        if( isEditing ) {
            _tableInstance.dataProvider.cacheCollapse = isEditing;
        } else {
            _tableInstance.dataProvider.restoreInitialCacheCollapseState();
        }
        _tableInstance.controller.setDraggable( !isEditing );

        // For autosave off we need to see _editing flag and update ctx to get commands to switch over
        if( !_t.util.isAutoSaveEnabled( tableElem ) ) {
            const editContext = getEditContext( _tableInstance );
            if( editContext ) {
                const editHandler = editHandlerSvc.getEditHandler( editContext );
                editHandler._editing = isEditing;
                // Add to the appCtx about the editing state
                appCtxService.updateCtx( 'editInProgress', editHandler._editing );
                // Need to ensure this handler is active so that save command will call this handler
                editHandlerSvc.setActiveEditHandlerContext( editContext );
            } else if( _tableInstance.dataProvider.getEditConfiguration() ) {
                _tableInstance.dataProvider._editing = isEditing;
                // Add to the appCtx about the editing state
                appCtxService.updateCtx( _tableInstance.dataProvider._appCtxEditInProgress, _tableInstance.dataProvider._editing );
            } else if( _tableInstance.declViewModel.getEditConfiguration() ) {
                _tableInstance.declViewModel._editing = isEditing;
                // Add to the appCtx about the editing state
                appCtxService.updateCtx( _tableInstance.declViewModel._internal.eventTopicEditInProgress, _tableInstance.declViewModel._editing );
            }
        }

        // Display guidance message when auto save is off for auto save only table
        const isAutoSaveContextTrue = appCtxService.getCtx( 'autoSave' ) && appCtxService.getCtx( 'autoSave.dbValue' );
        if( !isAutoSaveContextTrue && tableElem._tableInstance.gridOptions.forceAutoSave && isEditing && !_t.util.isCellEditing( tableElem ) && !_guidanceMessageInitialized ) {
            _guidanceMessageInitialized = true;
            displayAutoSaveOnGuidanceMessage( tableElem );
        }

        _t.util.setIsCellEditing( tableElem, isEditing );
    };

    let _cellEditDisabledMessageInitialized = null;

    const publishCellNotEditable = function( vmo, prop ) {
        eventBus.publish( _tableInstance.gridId + '.plTable.cellNotEditable', {
            vmo: vmo,
            prop: prop
        } );
    };

    /**
     * Click handler for cell/row. Will select the cell and row or start edit as needed
     *
     * @param {Event} event the click event
     * @param {DOMElement} cell the cell in question
     * @param {ViewModelObject} vmo The vmo for the row
     */
    self.onClickHandler = ( event, cell, vmo ) => {
        if( _t.util.isBulkEditing( tableElem ) ) {
            return;
        }

        if( event.ctrlKey ) {
            triggerBlurHandler();
            removeCellSelection();
            updateSelectedCell( null );
            return;
        }

        if( cell.isSelected && cell.propIsEditableCache && !cell.isElementInEdit ) {
            // Start edit
            removeCellSelection();
            // Trigger leave confirmation on previous active handler in case it was editing since only one editHandler
            // can be editing at any given time.
            const editContext = getEditContext( _tableInstance );
            const previousActiveHandler = editHandlerSvc.getActiveEditHandler();
            if( editContext && previousActiveHandler && previousActiveHandler !== editHandlerSvc.getEditHandler( editContext ) && previousActiveHandler.editInProgress() ) {
                previousActiveHandler.leaveConfirmation( () => {
                    editHandlerSvc.setActiveEditHandlerContext( editContext );
                    // Reregister leaveHandler since we are making the handler active again without calling startEdit
                    editHandlerSvc.getEditHandler( editContext ).reregisterLeaveHandler();
                    self.editCell( cell, vmo );
                    self.setCellEditingContext( true );
                } );
            } else {
                self.editCell( cell, vmo );
                self.setCellEditingContext( true );
            }
        } else if( cell.isSelected && _t.util.isPropEditEnabled( tableElem ) === false && !_cellEditDisabledMessageInitialized ) {
            // Display guidance message when cell editing is disabled
            _cellEditDisabledMessageInitialized = true;
            displayCellEditDisabledGuidanceMessage( tableElem );
        } else if( cell.isSelected && cell.isCellEditablePromise && !cell.isCellEditablePromiseResolving ) {
            // Prevent multiple calls to resolve editable promise
            cell.isCellEditablePromiseResolving = true;
            cell.isCellEditablePromise.then( function() {
                delete cell.isCellEditablePromiseResolving;
                if( cell.isSelected ) {
                    if( cell.propIsEditableCache ) {
                        _focusProp = cell.prop;
                        removeCellSelection();
                        self.editCell( cell, vmo );
                        self.setCellEditingContext( true );
                    } else {
                        publishCellNotEditable( vmo, cell.prop );
                    }
                }
            } );
        } else if( !cell.isSelected && !event.shiftKey ) {
            updateCellEditability( cell, vmo );
            if( cell.prop && !cell.prop.isArray ) {
                _fillDown.enableFillDown( cell );
            }
        } else if( event.shiftKey ) {
            triggerBlurHandler();
            removeCellSelection();
            updateSelectedCell( null );
        } else if( cell.isSelected && cell.prop.isEditable === false ) {
            publishCellNotEditable( vmo, cell.prop );
        }
    };

    /**
     * Adds the onclick event listener for an indivdual cell and gets its editability
     * @param {DOMElement} cell - The cell to set the listener for
     * @param {Object} vmo - The row's VMO
     */
    self.addCellClickListener = function( cell, vmo ) {
        cell.onclick = function( event ) {
            self.onClickHandler( event, cell, vmo );
        };

        cell.oncontextmenu = function() {
            if( !_t.util.isBulkEditing( tableElem ) && !cell.isSelected ) {
                updateCellEditability( cell, vmo );
            }
        };
    };

    /**
     * Removes the cell selected classes as well as the selected attribute for the cell.
     */
    self.removeAllCellSelection = function() {
        removeCellSelection();
        updateSelectedCell();
    };

    /**
     * Checks if the current selected cell is on the newly selected vmo(s), if not remove selection
     * @param {Object} eventData event data
     */
    const checkCellAndVMOSelection = function( eventData ) {
        let selectedObjects = eventData.selectedObjects;
        if( _selectedCell && _selectedCell.parentElement && _selectedCell.parentElement.vmo ) {
            const vmo = _selectedCell.parentElement.vmo;
            if( selectedObjects.indexOf( vmo ) === -1 ) {
                self.removeAllCellSelection();
            }
        }
    };

    const isEligibleForCopyDown = function( columnDef ) {
        if( _t.util.isPropEditEnabled( tableElem ) && columnDef.isTreeNavigation !== true && columnDef.name !== 'icon' && columnDef.modifiable !== false ) {
            return true;
        }
        return false;
    };

    const copyPropertyToCellContent = function( sourceProperty, vmoUid ) {
        let cellElements = _t.util.getCellElementsByPropertyAndUid( tableElem, sourceProperty.propertyName, vmoUid );
        for( let i = 0; i < cellElements.length; i++ ) {
            let cellElem = cellElements[ i ];
            let row = cellElem.parentElement;
            let oldCellTop = cellElem.children[ 0 ];
            let newCellTop = _t.Cell.createElement( cellElem.columnDef, row.vmo, tableElem, row );
            if( _t.util.isBulkEditing( tableElem ) ) {
                newCellTop.classList.add( _t.Const.CLASS_AW_EDITABLE_CELL );
            }
            cellElem.replaceChild( newCellTop, oldCellTop );
        }
    };

    const copyFillDownProperty = function( targetProperty, sourceProperty ) {
        targetProperty.uiValue = sourceProperty.uiValue;
        targetProperty.dbValue = sourceProperty.dbValue;
        targetProperty.valueUpdated = true;
        uwPropertyService.updateViewModelProperty( targetProperty );
    };

    const loadCellEditabilityForTargetCells = function( uid2CellMap, vmos, propertyNames ) {
        let editOpts = {
            vmos: vmos,
            propertyNames: propertyNames,
            autoSave: _t.util.isAutoSaveEnabled( tableElem )
        };

        return self.isPropertiesEditablePromise( editOpts ).then( function( result ) {
            for( let currentVmo of vmos ) {
                let cell = uid2CellMap[ currentVmo.uid ];
                if( cell ) {
                    cell.propIsEditableCache = result === false ? false : cell.prop && cell.prop.isEditable;
                    if( cell.propIsEditableCache === false ) {
                        cell.setAttribute( ariaReadOnly, 'true' );
                    }
                }
            }
            return Promise.resolve( result );
        } );
    };

    const modifyPropsForCellEdit = function( result, vmosToEdit, eventData, cellsToSave, cellMap, sourceProp ) {
        if( result === false ) {
            return;
        }
        let propsModified = false;
        for( let i = 0; i < vmosToEdit.length; i++ ) {
            let currentVMO = vmosToEdit[ i ];
            const targetProp = currentVMO.props[ eventData.propertyName ];

            if( sourceProp && targetProp && targetProp.isPropertyModifiable && targetProp.editable ) {
                propsModified = true;
                cellsToSave.push( cellMap[ currentVMO.uid ] );
                // update the target using the source
                copyFillDownProperty( targetProp, sourceProp );
                copyPropertyToCellContent( sourceProp, currentVMO.uid );
            }
        }
        if( propsModified ) {
            if( _t.util.isAutoSaveEnabled( tableElem ) ) {
                self.saveEdit( cellsToSave );
            } else {
                self.setCellEditingContext( true );
            }
        }
    };

    const prepareTargetCellPropsInfo = function( vmo, eventData, vmosToEdit, columnDef ) {
        if( isEligibleForCopyDown( columnDef ) ) {
            vmosToEdit.push( vmo );
        }
    };

    const populateTargetCellPropsLegacyEdit = function( vmo, eventData, sourceProp ) {
        const targetProp = vmo.props[ eventData.propertyName ];
        if( sourceProp && targetProp && targetProp.isPropertyModifiable && targetProp.editable ) {
            // update the target using the source
            copyFillDownProperty( targetProp, sourceProp );
            copyPropertyToCellContent( sourceProp, vmo.uid );
        }
    };

    self.fillDownCompleteHandler = ( eventData ) => {
        // get the VMOs from the table
        let VMOs = _tableInstance.dataProvider.viewModelCollection.loadedVMObjects;

        let $source = VMOs.filter( function( vmo ) {
            return vmo.uid === eventData.source;
        } );

        let sourceProp = $source[ 0 ] && $source[ 0 ].props[ eventData.propertyName ];
        let vmosToEdit = [];
        let cellMap = {};
        let cellsToSave = [];

        // Reverse the vmo order if we are going down
        if( eventData.direction !== 'up' ) {
            VMOs = VMOs.slice().reverse();
        }

        // Attempt to apply the source value to the target properties
        let foundLastTarget = false;
        for( let vmo of VMOs ) {
            // Iterate over the vmos until we find the last target prop.
            if( !foundLastTarget && vmo.uid === eventData.endTarget ) {
                foundLastTarget = true;
            }
            if( !foundLastTarget ) {
                continue;
            }

            // Stop iterating if we reach the source prop
            if( vmo.uid === eventData.source ) {
                break;
            }

            const columnDef = _t.util.getColumnDef( eventData.propertyName, _tableInstance.dataProvider );

            // Populate target cell props ( bulk edit mode ) or prepare the target prop info ( direct edit )
            if( _t.util.isBulkEditing( tableElem ) ) {
                populateTargetCellPropsLegacyEdit( vmo, eventData, sourceProp );
            } else {
                const targetCell = _t.util.getCellElementsByPropertyAndUid( tableElem, eventData.propertyName, vmo.uid )[ 0 ];
                if( targetCell ) {
                    cellMap[ vmo.uid ] = targetCell;
                }
                prepareTargetCellPropsInfo( vmo, eventData, vmosToEdit, columnDef );
            }
        }

        // Load editabilty and apply value to editable cells
        if( !_t.util.isBulkEditing( tableElem ) ) {
            _fillDownSaveInprogress = true;
            let propertyNames = [ eventData.propertyName ];
            loadCellEditabilityForTargetCells( cellMap, vmosToEdit, propertyNames ).then( ( result ) => {
                modifyPropsForCellEdit( result, vmosToEdit, eventData, cellsToSave, cellMap,
                    sourceProp );
                _fillDownSaveInprogress = false;
            } );
        }
    };

    _eventBusSubs.push( eventBus.subscribe( `${_tableInstance.dataProvider.name}.selectNone`, self.removeAllCellSelection ) );
    _eventBusSubs.push( eventBus.subscribe( `${_tableInstance.dataProvider.name}.selectAll`, self.removeAllCellSelection ) );
    _eventBusSubs.push( eventBus.subscribe( `${_tableInstance.dataProvider.name}.selectionChangeEvent`, checkCellAndVMOSelection ) );
};

export default SPLMTableEditor;
