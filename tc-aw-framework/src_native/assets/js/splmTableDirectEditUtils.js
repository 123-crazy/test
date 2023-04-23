// Copyright (c) 2020 Siemens

/**
 * This module defines the utils for direct edit in PL Table.
 *
 * @module js/splmTableDirectEditUtils
 */

import _t from 'js/splmTableNative';
import localeService from 'js/localeService';
import 'js/aw-guidance-message.directive';

/**
 * Gets the editContext for the table
 *
 * @param {Object} tableInstance - the table's tableInstance object
 *
 * @return {string} the name of the editContext for this table
 */
export const getEditContext = ( tableInstance ) => {
    if( tableInstance.dataProvider.json && tableInstance.dataProvider.json.editContext ) {
        // Edit context of edit handler for this dataProvider
        return tableInstance.dataProvider.json.editContext;
    } else if( tableInstance.dataProvider.json && tableInstance.dataProvider.json.customPanelEditContext ) {
        // Edit context of parent summary view model ( html panel table using edit via nativeDataLoadEvent usecase )
        return tableInstance.dataProvider.json.customPanelEditContext;
    } else if( tableInstance.declViewModel._internal.editContext ) {
        // Edit context of edit handler for this view model
        return tableInstance.declViewModel._internal.editContext;
    }
    return null;
};

const _displayGuidanceMessage = ( message, tableElem ) => {
    const guidanceContext = {
        _internal: {
            messages: {
                tableMessage: {
                    messageType: 'INFO',
                    messageText: message
                }
            }
        }
    };

    const guidanceMessageHtml = '<aw-guidance-message message="tableMessage" show-type="false" closable="true"></aw-guidance-message>';
    const guidanceElement = _t.util.createNgElement( guidanceMessageHtml, tableElem.parentElement, {}, guidanceContext );
    tableElem.parentElement.insertBefore( guidanceElement, tableElem );
};

/**
 * Displays guidance message above the table to let the user know that auto save is one despite global auto save being turned off
 *
 * @param {HTMLElement} tableElem - the table element
 */
export const displayAutoSaveOnGuidanceMessage = ( tableElem ) => {
    localeService.getLocalizedTextFromKey( 'BaseMessages.AUTO_SAVE_ONLY_TABLE', true ).then( ( message ) => {
        _displayGuidanceMessage( message, tableElem );
    } );
};

/**
 * Displays guidance message above the table to let the user know that cell editing is disabled
 *
 * @param {HTMLElement} tableElem - the table element
 */
export const displayCellEditDisabledGuidanceMessage = ( tableElem ) => {
    localeService.getLocalizedTextFromKey( 'BaseMessages.CELL_EDITING_DISABLED', true ).then( ( message ) => {
        _displayGuidanceMessage( message, tableElem );
    } );
};

export default {
    getEditContext,
    displayAutoSaveOnGuidanceMessage,
    displayCellEditDisabledGuidanceMessage
};
