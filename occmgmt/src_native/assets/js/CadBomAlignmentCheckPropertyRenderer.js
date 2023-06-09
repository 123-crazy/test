// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 *
 *
 * @module js/CadBomAlignmentCheckPropertyRenderer
 * @requires app
 */

import app from 'app';
import CadBomOccAlignmentCheckService from 'js/CadBomOccAlignmentCheckService';
import CadBomAlignmentCheckCellRenderer from 'js/CadBomAlignmentCheckCellRenderer';
import appCtxSvc from 'js/appCtxService';
import cbaConstants from 'js/cbaConstants';
import CadBomOccurrenceAlignmentUtil from 'js/CadBomOccurrenceAlignmentUtil';

'use strict';

let exports = {};

const INDICATOR_ALIGNED = 'indicatorAssigned16.svg';
const INDICATOR_NOT_ALIGNED = 'indicatorNonAssigned16.svg';
const INDICATOR_MISSING_PART_DESIGN = 'indicatorMissingInSourceRed16.svg';
const EVENT_FIND_ALIGNED_OBJECT = 'cba.findAlignedObject';
const INDICATOR_DEFAULT = 'indicatorFindAligned16.svg';

/**
 * Check if mapping UID is available for given object
 *
 * @param {string} context - Source or Target context
 * @param {object} vmo - View Model Object
 * @returns {string} - Indicator object
 */
let _isMappingUIDAvailable = function( context, vmo ) {
    let alignmentCheckInfo = appCtxSvc.getCtx( cbaConstants.CTX_PATH_ALIGNMENT_CHECK_INFO );
    let contextAlignmentCheckInfo = alignmentCheckInfo ? alignmentCheckInfo[ context ] : null;
    if( contextAlignmentCheckInfo && contextAlignmentCheckInfo.differences ) {
        let diff = contextAlignmentCheckInfo.differences[ vmo.uid ];
        return diff && diff.mappingUids && diff.mappingUids.length > 0;
    }
    return false;
};

/**
 * Get alignment indicator object for given status
 *
 * @param {number} status - Indicator status
 * @param {object} vmo - View Model Object
 * @param {string} context - Source or Target context
 * @returns {string} - Indicator object
 */
let _getAlignmentIndicator = function( status, vmo, context ) {
    let alignmentIndicatorObject = {};
    switch ( status ) {
        case 0:
            alignmentIndicatorObject.icon = INDICATOR_DEFAULT;
            alignmentIndicatorObject.clickEvent = EVENT_FIND_ALIGNED_OBJECT;
            alignmentIndicatorObject.intent = cbaConstants.INTENT_FIND_ALIGNED;
            break;
        case 1:
        case 3:
            alignmentIndicatorObject.icon = INDICATOR_NOT_ALIGNED;
            break;
        case 4:
        case 5:
        case 357:
            alignmentIndicatorObject.icon = INDICATOR_ALIGNED;
            if( _isMappingUIDAvailable( context, vmo ) ) {
                alignmentIndicatorObject.clickEvent = EVENT_FIND_ALIGNED_OBJECT;
            }
            break;
        case 2:
        case 6:
        case 102:
        case 614:
            alignmentIndicatorObject.icon = INDICATOR_ALIGNED;
            break;
        case -1:
            alignmentIndicatorObject.icon = INDICATOR_ALIGNED;
            alignmentIndicatorObject.clickEvent = EVENT_FIND_ALIGNED_OBJECT;
            break;
        default:
            alignmentIndicatorObject = null;
    }
    return alignmentIndicatorObject;
};

/**
 * Get alignment advance indicator object for given status
 *
 * @param {number} status - Indicator status
 * @returns {string} - Indicator object
 */
let _getAdvanceIndicator = function( status ) {
    let advanceIndicatorObject = {};
    switch ( status ) {
        case 101:
        case 357:
        case 614:
            advanceIndicatorObject.icon = INDICATOR_MISSING_PART_DESIGN;
            break;
        default:
            advanceIndicatorObject = null;
    }
    return advanceIndicatorObject;
};

/**
 * Append icon element to container element
 *
 * @param {string} context - Source or Target context
 * @param {number} status - Indicator status
 * @param {object} isAdvanceIndicator - true if Advance Indicator column
 * @param {object} vmo - View Model Object
 * @param {object} containerElement - Container element
 * @param {string} columnName - Column name
 * @param {object} tooltip - tooltip defination
 */
let _appendIconElementToContainer = function( context, status, isAdvanceIndicator, vmo, containerElement, columnName, tooltip ) {
    let indicatorObject = isAdvanceIndicator ? _getAdvanceIndicator( status ) : _getAlignmentIndicator( status, vmo, context );
    if( indicatorObject ) {
        let iconSource = CadBomOccurrenceAlignmentUtil.getIconSourcePath( indicatorObject.icon );
        let contextObject = {
            vmo: vmo,
            status: status,
            columnName: columnName
        };

        // This is special case where we will show non clickable align indicator. 
        if( status === 357 && !indicatorObject.clickEvent ) {
            tooltip = 'alignmentSpecialTooltip';
        }

        let iconElement = CadBomAlignmentCheckCellRenderer.getIconCellElement( contextObject, iconSource, containerElement, columnName, tooltip );
        if( iconElement !== null && indicatorObject.clickEvent ) {
            CadBomAlignmentCheckCellRenderer.addClickHandlerToElement( iconElement, vmo, context, indicatorObject.clickEvent, indicatorObject.intent );
            iconElement.classList.add( 'aw-cba-clickableCellIcon' );
        }
            containerElement.appendChild( iconElement );
        }
};

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 */
 export let getSrcAlignmentIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let context = CadBomOccAlignmentCheckService.CBA_SRC_CONTEXT;
    let status = CadBomOccAlignmentCheckService.getStatus( context, vmo );
    _appendIconElementToContainer( context, status, false, vmo, containerElement, columnName, tooltip );
};

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 */
export let getSrcAdvanceIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let context = CadBomOccAlignmentCheckService.CBA_SRC_CONTEXT;
    let status = CadBomOccAlignmentCheckService.getStatus( context, vmo );
    _appendIconElementToContainer( context, status, true, vmo, containerElement, columnName, tooltip );
};

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 */
export let getTrgAlignmentIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let context = CadBomOccAlignmentCheckService.CBA_TRG_CONTEXT;
    let status = CadBomOccAlignmentCheckService.getStatus( context, vmo );
    _appendIconElementToContainer( context, status, false, vmo, containerElement, columnName, tooltip );
};

/**
 * Calls methods to get icon image source and icon element. Appends it to the container element. Also triggers events for the click of the icon.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} containerElement containerElement
 * @param {Object} columnName the column associated with the cell
 * @param {String} tooltip tooltip names from prpertyRendererTemplates
 *
 */
export let getTrgAdvanceIndicationRenderer = function( vmo, containerElement, columnName, tooltip ) {
    let context = CadBomOccAlignmentCheckService.CBA_TRG_CONTEXT;
    let status = CadBomOccAlignmentCheckService.getStatus( context, vmo );
    _appendIconElementToContainer( context, status, true, vmo, containerElement, columnName, tooltip );
};


export default exports = {
    getSrcAlignmentIndicationRenderer,
    getSrcAdvanceIndicationRenderer,
    getTrgAlignmentIndicationRenderer,
    getTrgAdvanceIndicationRenderer
};

app.factory( 'CadBomAlignmentCheckPropertyRenderer', () => exports );
