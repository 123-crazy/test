// Copyright (c) 2020 Siemens

/**
 * @module js/autoSaveContextService
 */
import appCtxService from 'js/appCtxService';
import editHandlerService from 'js/editHandlerService';
import localStorage from 'js/localStorage';
import modelPropertyService from 'js/modelPropertyService';
import localeService from 'js/localeService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

const AUTO_SAVE_CTX_PATH = 'autoSave.dbValue';
let autoSaveWorkspaceValue;

/**
 * API to trigger leaveConfirmation, update local storage, and announce changes when the toggle changes
 */
export const autoSaveToggled = function() {
    // Revert toggle value until leave confirmation is finished
    const currentToggleValue = appCtxService.getCtx( AUTO_SAVE_CTX_PATH );
    setAutoSaveToggle( !currentToggleValue );
    editHandlerService.leaveConfirmation().then( () => {
        // Aply new toggle value
        setAutoSaveToggle( currentToggleValue );
        // Update local storage so user value can be persisted
        localStorage.publish( 'autosave', currentToggleValue );
        // Publish event announcing the new value
        eventBus.publish( 'autoSaveToggleChanged', currentToggleValue );
    } );
};

/**
 * API to update the autoSave mode
 *
 * @param {Boolean} enable - true if autoSave should be enabled
 */
export const setAutoSaveToggle = function( enable ) {
    // Do not update value if workspace override is being used
    if( autoSaveWorkspaceValue !== undefined ) {
        return;
    }
    appCtxService.updatePartialCtx( AUTO_SAVE_CTX_PATH, enable );
};

/**
 * API to handler workpace updates in ctx. When workspace is updated this api
 * will check for an autosave override. If the override is given the auto save mode will
 * be updated and the auto save toggle will be hidden in the UI.
 */
const handleWorkspaceAutoSaveSetting = function() {
    // Overwrite overwrite and hide toggle if workspace override exists
    eventBus.subscribe( 'appCtx.update', function( event ) {
        if( event.name === 'workspace' ) {
            autoSaveWorkspaceValue = _.get( event.value, 'settings.autoSave' );
            if( autoSaveWorkspaceValue !== undefined ) {
                setAutoSaveToggle( autoSaveWorkspaceValue );
                // Hide autosave toggle if workspace override is in use
                appCtxService.updateCtx( 'showAutoSaveToggle', false );
            }
        }
    } );
};

/**
 * Sets up autosave in appCtx. Priority is workspace override followed by local storage.
 */
export const initializeAutoSaveContext = async function() {
    // The autoSave context initial value will be true unless local storage or workspace override exists
    let initialAutoSaveValue = true;
    appCtxService.registerCtx( 'showAutoSaveToggle', true );

    // Apply value from local storage if it exists
    const autoSaveLocalStorageValue = localStorage.get( 'autosave' );
    if( autoSaveLocalStorageValue === 'true' || autoSaveLocalStorageValue === 'false' ) {
        initialAutoSaveValue = autoSaveLocalStorageValue === 'true';
    }

    // Aply workspace override if it exists
    handleWorkspaceAutoSaveSetting();

    // Apply initial value to ctx
    const displayName = await localeService.getLocalizedTextFromKey( 'BaseMessages.AUTO_SAVE_TITLE', true );
    appCtxService.registerCtx( 'autoSave', modelPropertyService.createViewModelProperty( {
        displayName: displayName,
        type: 'BOOLEAN',
        dbValue: initialAutoSaveValue
    } ) );
};

export default {
    autoSaveToggled,
    initializeAutoSaveContext,
    setAutoSaveToggle
};
