//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 *
 * @module js/inlineEditingInDuplicateModeCellService
 */
import app from 'app';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import appCtxSvc from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import eventBus from 'js/eventBus';
import aceInteractiveDuplicateService from 'js/aceInteractiveDuplicateService';

let exports = {};

const inlineEditingSupportedProperties = [ 'awb0ArchetypeRevName', 'awb0ArchetypeRevDescription' ];

const CSS_CLASS_FOR_EDITABILITY_INDICATOR = 'aw-occmgmt-duplicateEditableIndicator';
/**
 * Cell Renderer for editable properties in duplicate mode for PL Table
 */
let _duplicateEditCellRender = {
    action: function( column, vmo, tableElem ) {
        compareAndUpdateOldValueAndNewValue( vmo );
        let cellContent = _t.Cell.createElement( column, vmo, tableElem );
        cellContent.classList.add( CSS_CLASS_FOR_EDITABILITY_INDICATOR );
        cellContent = populateInlineEditingMouseAdapter( cellContent, column, vmo );
        return cellContent;
    },
    condition: function( column, vmo ) {
        let isInlineEditingSuppForProperty = inlineEditingSupportedProperties.indexOf( column.propertyName ) > -1;
        if( appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled &&
            appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0AdditionalPropertyEditSupportInDuplicateMode &&
            isInlineEditingSuppForProperty &&
            isInlineEditSupportedForCurrentDuplicateAction( vmo ) ) {
            return true;
        }
        return false;
    },
    name: 'cellRendererForInlineEditInDuplicateMode'
};

/**
 * Cell Renderer for editable properties in duplicate mode for PL Table
 */
let _duplicateNonEditCellRender = {
    action: function( column, vmo, tableElem ) {
        let cellContent = _t.Cell.createElement( column, vmo, tableElem );
        let pinnedContentElement = _t.Trv( tableElem ).getPinContentElementFromTable();
        let imgElement = cellContent.getElementsByClassName( _t.Const.CLASS_GRID_CELL_IMAGE )[ 0 ];
        attachResetHandlerToPinnedElement( pinnedContentElement );
        attachResetElementToIMageElement( imgElement );
        resetEditHandlerState();
        return cellContent;
    },
    condition: function( column, vmo ) {
        let isInlineEditingSuppForProperty = inlineEditingSupportedProperties.indexOf( column.propertyName ) > -1;
        if( appCtxSvc.ctx.aceActiveContext.context.isDuplicateEnabled ) {
            if( !isInlineEditingSuppForProperty &&
                appCtxSvc.ctx.aceActiveContext.context.supportedFeatures.Awb0AdditionalPropertyEditSupportInDuplicateMode ) {
                return true;
            } else if( !isInlineEditSupportedForCurrentDuplicateAction( vmo ) ) {
                return true;
            }
        }
        return false;
    },
    name: 'cellRendererForInlineNonEditInDuplicateMode'
};
/**
 * Populate inline Editing Mouse adapter adds some mouse listeners to each cell of the splm table and
 * stores the cell's column and row information.
 *
 * @param {*} cellContent cell element on which mouse adapter will add action listeners
 * @param {*} column holds information of the column
 * @param {*} vmo vmo of the cell.
 */
let populateInlineEditingMouseAdapter = function( cellContent, column, vmo ) {
    let propertyName = column.propertyName;
    vmo.props[ propertyName ].isEditable = true;
    cellContent.addEventListener( 'click', function() {
        vmo.props[ propertyName ].isEditable = true;
        initializeEditState();
        // In next PI we are going to align with framework direct cell editing.
        // This code is a stop gap solution and will be removed in future after alignment.
        let event = new FocusEvent( 'focus' );
        cellContent.dispatchEvent( event );
    } );
    return cellContent;
};

/**
 * This API give us the mark up UI in duplicate mode.
 */
let compareAndUpdateOldValueAndNewValue = function( vmo ) {
    let isRequestUpdateRequired = false;
    for( let propertyName in vmo.props ) {
        let isInlineEditingSuppForProperty = inlineEditingSupportedProperties.indexOf( propertyName ) > -1;
        if( isInlineEditingSuppForProperty ) {
            let vmoProp = vmo.props[ propertyName ];
            // When user changes original value to some new value then we show all affected object in mark up mode.
            if( !_.isUndefined( vmoProp.newValue ) && !_.isEqual( vmoProp.newValue, vmoProp.oldValue ) ) {
                vmoProp.oldValue = vmoProp.prevDisplayValues[ 0 ];
                vmoProp.dbValue = vmoProp.value;
                vmoProp.uiValue = vmoProp.newValue;
                isRequestUpdateRequired = true;
            }
            // When user reverts back to original value we render them as their original way.
            else if( vmoProp.oldValue && _.isEqual( vmoProp.newValue, vmoProp.oldValue ) ) {
                var oldValue = vmoProp.oldValue;
                vmoProp.oldValue = undefined;
                vmoProp.uiValue = oldValue;
                isRequestUpdateRequired = true;
            }
        }
    }
    if( isRequestUpdateRequired ) {
        aceInteractiveDuplicateService.updateCloneObjectInfo( vmo );
    }
};

/**
 * Resets edit handler to non edit mode.
 */
let resetEditHandlerState = function() {
    let editService = editHandlerService.getEditHandler( appCtxSvc.ctx.aceActiveContext.context.vmc.name );
    if( editService._editing ) {
        editService.cancelEdits();
    }
};

/**
 * Notify the save state changes
 */
let initializeEditState = function() {
    let editService = editHandlerService.getEditHandler( appCtxSvc.ctx.aceActiveContext.context.vmc.name );
    let dataSource = editService.getDataSource();
    editService._editing = true;
    // Add to the appCtx about the editing state
    let context = {
        state: 'starting'
    };
    appCtxSvc.updateCtx( 'editInProgress', editService._editing );
    eventBus.publish( 'editInProgress', editService._editing );
    context.dataSource = dataSource.getSourceObject();
    eventBus.publish( 'editHandlerStateChange', context );
};

/**
 * This API checked whether Editability should be enabled or not based on action column value.
 * @param {*} vmo table row's vmo
 */
let isInlineEditSupportedForCurrentDuplicateAction = function( vmo ) {
    let effectiveactionValue = aceInteractiveDuplicateService.getEffectiveDuplicateOperation( vmo );
    if( effectiveactionValue === 0 || effectiveactionValue === 6 ) {
        return true;
    }
    return false;
};

/**
 * This API will make sure that resetEditHandler gets added to the pinned element of
 * splm table widget only once.
 * @param {HTMLElement} pinnedContentElement
 */
let attachResetHandlerToPinnedElement = function( pinnedContentElement ) {
    if( pinnedContentElement ) {
        let isClickListenerAttached = pinnedContentElement.onclick;
        if( !_.isUndefined( isClickListenerAttached ) ) {
            pinnedContentElement.onclick = function() {
                resetEditHandlerState();
            };
        }
    }
};

let attachResetElementToIMageElement = function( imgElement ) {
    if( !_.isUndefined( imgElement ) ) {
        imgElement.addEventListener( 'click', function() {
            resetEditHandlerState();
        } );
    }
};

/**
 * Inline Editing Service in duplicate mode.
 * @param {Object} appCtxSvc - appCtxService to use.
 * @returns {Object} - Object.
 */

export default exports = {
    _duplicateEditCellRender,
    _duplicateNonEditCellRender
};
app.factory( 'inlineEditingInDuplicateModeCellService', () => exports );
