// Copyright (c) 2020 Siemens

/**
 * @module js/editEventsService
 */
import eventBus from 'js/eventBus';
import editHandlerService from 'js/editHandlerService';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';

const startEditRequestedEventName = 'startEditForNewVmosRequested';
const saveEditsRequestedEventName = 'saveEditsRequested';

/**
 * Publishes saveEditsRequested via eventBus.
 *
 */
export const publishSaveEditsRequested = function() {
    eventBus.publish( saveEditsRequestedEventName );
};

/**
 * Keydown event listener for saveEdits.
 * On "ctrl + s", publishes saveEditsRequested via eventBus or saves the edit
 * handler directly if it is passed in.
 *
 * @param {Object} editHandler - the edit handler
 * @param {Function} removeSaveListener - the callback to remove savelistener on save
 * @return {Function} save listener function
 */
export const saveEditsListener = function( editHandler, removeSaveListener ) {
    return function( event ) {
        if( event.ctrlKey && ( event.key === 's' || event.key === 'S' ) ) {
            if( editHandler ) {
                // Save the edit handler directly if it was passed in
                editHandler.saveEdits();
            } else {
                publishSaveEditsRequested();
            }
            event.preventDefault();
            removeSaveListener();
        }
    };
};

/**
 * Helper function for starting edit.
 * Call editHandler.startEdit to handle pagination/expand cases
 *
 * @param {String} editContext - the edit context for the edit handler
 */
export const startEditForNewVmos = function( editContext ) {
    const editHandler = editHandlerService.getEditHandler( editContext );
    if( editHandler.editInProgress() ) {
        editHandler.startEdit();
    }
};

/**
 * Publishes dataProviderName.startEditRequested  via eventBus.
 *
 * @param {object} dataProvider - the dataProvider
 */
export const publishStartEditRequested = function( dataProvider ) {
    if( dataProvider && dataProvider.name ) {
        eventBus.publish( dataProvider.name + '.' + startEditRequestedEventName );
    }
};

export default {
    saveEditsListener,
    startEditForNewVmos,
    publishStartEditRequested,
    publishSaveEditsRequested
};
