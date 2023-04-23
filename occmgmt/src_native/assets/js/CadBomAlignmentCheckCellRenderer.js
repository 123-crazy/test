// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/CadBomAlignmentCheckCellRenderer
 */

import app from 'app';
import ngUtils from 'js/ngUtils';
import _t from 'js/splmTableNative';
import eventBus from 'js/eventBus';

let exports = {};
'use strict';

/**
 * Creates the Icon container element for tree command cell.
 *
 * @param {Object} contextObject The context object
 * @param {String} iconURL path of Icon
 * @param {DOMElement} parentElement containerElement
 * @param {String} propName internal name of column 
 * @param {String} tooltipViewName name of view file
 * @param {String} tooltipOptions This attribute is used to configure placement and flipBehavior for extended Tooltip
 *
 * @returns {DOMElement} icon element that suport dynamic toltip
 */
export const getIconCellElement = function( contextObject, iconURL, parentElement, propName, tooltipViewName, tooltipOptions ) {
    if( iconURL !== null ) {
        let cell;
        let tooltipCtx = null;
        if( tooltipViewName ) {
            tooltipCtx = {
                contextObject: {
                    contextObject: contextObject
                }
            };
            if( tooltipOptions ) {
                cell = '<img src="' + iconURL + '" extended-tooltip-context="contextObject" extended-tooltip="' + tooltipViewName + '" extended-tooltip-options="' + tooltipOptions + '" />';
            } else {
                cell = '<img src="' + iconURL + '" extended-tooltip-context="contextObject" extended-tooltip="' + tooltipViewName + '" />';
            }
        } else if( contextObject.vmo && contextObject.vmo.props && contextObject.vmo.props[ propName ] ) {
            let propValue = contextObject.vmo.props[ propName ].displayValues[ 0 ];
            cell = '<img src= "' + iconURL + '" title="' + propValue + '"/>';
        } else {
            cell = '<img src= "' + iconURL + '" />';
        }
        if( cell ) {
            let element = ngUtils.element( cell );
            if( parentElement ) {
                let compiledElement = ngUtils.compile( parentElement, element, null, null, tooltipCtx );
                return compiledElement ? compiledElement[ 0 ] : null;
            }
        }
    }
    return null;
};

/**
 * Creates the title and command container element for tree command cell.
 *
 * @param {Object} vmo the vmo for the cell
 * @param {Object} column the column associated with the cell
 *
 * @returns {DOMElement} title/command container element
 */
export let createTitleElement = function( vmo, column ) {
    let displayName = '';
    if( vmo.props[ column ] && vmo.props[ column ].displayValues.length > 0 ) {
        displayName = vmo.props[ column ].displayValues.reduce( ( appendedName, value ) => {
            return appendedName = appendedName + ', ' + value;
        } );
    }
    var gridCellText = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT, 'aw-mbm-cellText' );
    gridCellText.innerText = displayName;
    gridCellText.title = displayName;
    return gridCellText;
};

/**
 * Add's Handler to container element for tree command cell.
 *
 * @param {DOMElement} element element on which evnet listener will be added
 * @param {DOMElement} vmo the vmo for the eventdata
 * @param {String} sourceContext context name
 * @param {String} eventName Name of event to publish
 * @param {String} intent Intent of click either crossProbe or findAligned
 */
export let addClickHandlerToElement = function( element, vmo, sourceContext, eventName, intent ) {
    if( element ) {
        element.addEventListener( 'click', function( event ) {
            if( vmo.selected ) {
                event.stopImmediatePropagation();
            }
            let eventData = {
                vmo: vmo,
                contextName: sourceContext,
                event:event
            };
            if( intent ) {
                eventData.intent = intent;
            }
            eventBus.publish( eventName, eventData );
        } );
    }
};

export default exports = {
    getIconCellElement,
    createTitleElement,
    addClickHandlerToElement
};
app.factory( 'CadBomAlignmentCheckCellRenderer', () => exports );
