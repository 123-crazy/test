// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
   define
 */
/**
 * @module js/awStructureCompareColorService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _t from 'js/splmTableNative';

var exports = {};
var cssName = '';
var flag = false;

var _checkHighlightProcessing = function( row, col ) {
    var columnPropertyName = col.field;
    var lookupKey = row.uid + '$' + columnPropertyName;
    var propertyDiffs = appCtxSvc.getCtx( 'compareContext.propertyDiffs' );
    if( propertyDiffs ) {
        var value = propertyDiffs[ lookupKey ];
        if( value === 2 ) {
            cssName = 'aw-structurecompare-propertydiff';
            flag = true;
        } else {
            cssName = '';
            flag = false;
        }
    }
    return {
        status: flag,
        name: cssName
    };
};

export let gridCellClass = function( grid, row, col ) {
    var columnPropertyName = col.colDef.propertyName;
    var lookupKey = row.entity.uid + '$' + columnPropertyName;
    var propertyDiffs = appCtxSvc.getCtx( 'compareContext.propertyDiffs' );
    if( propertyDiffs ) {
        var value = propertyDiffs[ lookupKey ];
        if( value === 2 ) {
            return 'aw-structurecompare-propertydiff';
        }
    }
    return null;
};

export let pltableCellClass = function( row, col ) {
    var output = _checkHighlightProcessing( row, col );
    return output.name;
};

export let pltableCellClassCond = function( row, col ) {
    var output = _checkHighlightProcessing( row, col );
    return output.status;
};

export let popupGridCellClass = function( grid, row, col ) {
    var columnPropertyName = row.entity.facet.key;
    var lookupKey = col.colDef.field + '$' + columnPropertyName;
    var propertyDiffs = appCtxSvc.getCtx( 'compareContext.propertyDiffs' );
    if( propertyDiffs ) {
        var value = propertyDiffs[ lookupKey ];
        if( value === 2 ) {
            return 'aw-structurecompare-propertydiff';
        }
    }
    return null;
};

export let prophighlightRenderer = {
    action: function( column, vmo, tableElem ) {
        var cellContent = _t.Cell.createElement( column, vmo, tableElem );

        if( appCtxSvc.ctx.cellClass &&
            appCtxSvc.ctx.cellClass.pltablePropRender ) {
            var cssName = exports.pltableCellClass( vmo, column );
            if( cssName.length > 0 ) {
                cellContent.classList.add( cssName );
            }
        }

        return cellContent;
    },
    condition: function( column, vmo, tableElem ) {
        if( appCtxSvc.ctx.cellClass &&
            appCtxSvc.ctx.cellClass.pltablePropRender ) {
            return exports.pltableCellClassCond( vmo, column );
        }
        return false;
    },
    name:'prophighlightRenderer'
};

/**
 * @member awStructureCompareColorService
 */

export default exports = {
    gridCellClass,
    pltableCellClass,
    pltableCellClassCond,
    popupGridCellClass,
    prophighlightRenderer
};
app.factory( 'awStructureCompareColorService', () => exports );
