// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* *
 * @module js/aceInlineAuthoringRenderingService
 */
import * as app from 'app';
import occmgmtCellRenderingService from 'js/occmgmtCellRenderingService';
import awSPLMTableCellRendererFactory from 'js/awSPLMTableCellRendererFactory';
import appCtxSvc from 'js/appCtxService';
import _t from 'js/splmTableNative';

var exports = {};

/**
 *  inline row background renderer
 */
var _rowBackgroundRenderer = {
    action: function( column, vmo, tableElem, rowElem ) {
        var cellContent = _t.Cell.createElement( column, vmo, tableElem, rowElem );

        if( rowElem ) {
            rowElem.classList.add( 'aw-occmgmtjs-inlineRow' );
        }

        //Add required indicator
        if( vmo.props[ column.field ].isRequired === true ) {
            cellContent.classList.add( 'aw-widgets-propertyError' );
        }
        //Remove required indicator
        if( vmo.props[ column.field ].dbValues[ 0 ] !== undefined && vmo.props[ column.field ].dbValues[ 0 ] !== '' && vmo.props[ column.field ].dbValues[ 0 ] !== null ||
            vmo.props[ column.field ].dbValue !== undefined && vmo.props[ column.field ].dbValue !== '' && vmo.props[ column.field ].dbValue !== null &&
            vmo.props[ column.field ].isRequired === true ) {
            cellContent.classList.remove( 'aw-widgets-propertyError' );
        }

        return cellContent;
    },
    condition: function( column, vmo, tableElem ) {
        return vmo.isInlineRow;
    },
    name: '_rowBackgroundRenderer'
};

/**
 *  inline row cell renderer
 */
var _inlineIconCellRenderer = {
    action: function( column, vmo, tableElem ) {
        var cellContent = _t.Cell.createElement( column, vmo, tableElem );

        cellContent.appendChild( awSPLMTableCellRendererFactory.createCellCommandElement( column, vmo, tableElem ) );
        cellContent.classList.add( 'aw-occmgmtjs-removeInlineRowCommand' );
        return cellContent;
    },
    condition: function( column, vmo, tableElem ) {
        return vmo.isInlineRow && ( column.isTableCommand === true || column.isTreeNavigation === true );
    },
    name: '_inlineIconCellRenderer'
};

/**
 * Sets inline authoring renderers
 * @param {Object} colDefs - columns
 */
export let setInlineAuthoringRenderers = function( colDefs ) {
    occmgmtCellRenderingService.setOccmgmtCellTemplate( colDefs, [ _rowBackgroundRenderer, _inlineIconCellRenderer ] );
    if( !appCtxSvc.ctx.customRendererForColumns ) {
        appCtxSvc.ctx.customRendererForColumns = {};
        appCtxSvc.ctx.customRendererForColumns.aceInLineAuth = [ _rowBackgroundRenderer, _inlineIconCellRenderer ];
    }
};

export default exports = {
    setInlineAuthoringRenderers
};
/**
 * Ace Inline Authoring Rendering Service
 * @memberof NgServices
 * @member aceInlineAuthoringRenderingService
 * @param {Object} occmgmtCellRenderingService - occmgmtCellRenderingService
 * @param {Object} awSPLMTableCellRendererFactory - awSPLMTableCellRendererFactory
 * @returns {aceInlineAuthoringRenderingService} Reference to service's API object.
 */
app.factory( 'aceInlineAuthoringRenderingService', () => exports );
