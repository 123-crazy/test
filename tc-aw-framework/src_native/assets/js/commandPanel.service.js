// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.commandPanelService} which manages command panels.
 *
 * @module js/commandPanel.service
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import { getEditHandler } from 'js/editHandlerService';

/**
 * Command service to manage commands.
 *
 * @param appCtxService {Object} - App context service
 */
let exports = {};

/**
 * Activate a command. Closes any panel that is open in the opposite panel location. If the command is
 * same as the command active at that location it will be closed.
 * If any setup is required for the command just wrap this service.
 *
 * @param {inputObj} inputObj - Input object
 * The input object need to have following values
 * commandId
 * location
 * context
 * push
 * closeWhenCommandHidden
 * config = {}
 * editContext = String
 */

export let activateCommandPanel2 = function( inputObj ) {
    //Create event data for awsidenav.openClose event
    let { commandId, location, context, push, closeWhenCommandHidden, config, editContext } = inputObj;
    //Create config object for achieving slide push
    config = config || {};
    editContext = editContext || 'INFO_PANEL_CONTEXT';
    if( push !== undefined ) {
        config.slide = push === true ? 'PUSH' : 'FLOAT';
    }
    var eventData = {
        id: location,
        commandId: commandId,
        includeView: commandId,
        command: {
            commandId: commandId,
            declarativeCommandId: commandId,

            closeWhenCommandHidden: closeWhenCommandHidden !== false,
            getDeclarativeCommandId: function() {
                return commandId;
            },
            // Register panel context on activation of command
            setupDeclarativeView: function( deferred ) {
                if( context ) {
                    appCtxService.registerCtx( 'panelContext', context );
                }
                deferred.resolve();
            },
            // Unregister panel context on close of command
            callbackApi: {
                getPanelLifeCycleClose: function( _, deferred ) {
                    if( context ) {
                        appCtxService.unRegisterCtx( 'panelContext' );
                    }
                    if( editContext && getEditHandler( editContext ) ) {
                        return getEditHandler( editContext ).leaveConfirmation( function() {
                            deferred.resolve();
                        } );
                    }
                    return deferred.resolve();
                }
            }
        },
        config: config
    };
    eventBus.publish( 'awsidenav.openClose', eventData );
};

/**
 * Activate a command. Closes any panel that is open in the opposite panel location. If the command jas the
 * same is as the command active at that location it will be closed. If any setup is required for the
 * command just wrap this service.
 *
 * @param {String} commandId - ID of the command to open. Should map to the view model to activate.
 * @param {String} location - Which panel to open the command in. "aw_navigation" (left edge of screen) or "aw_toolsAndInfo" (right edge of screen)
 * @param {Object} context - The panel context.
 * @param {Boolean} push - Optional parameter to push workarea content when opening command panel
 * @param {Boolean} closeWhenCommandHidden - Optional parameter to disable the automatic closing of the panel when a command is hidden. Defaults to true.
 * @param {Object} config - Optional parameter to override the configuration attributes of sidenav, which includes width, height and slide.
 */
export let activateCommandPanel = function( commandId, location, context, push, closeWhenCommandHidden, config ) {
    activateCommandPanel2( {
        commandId,
        location,
        context,
        push,
        closeWhenCommandHidden,
        config
    } );
};

exports = {
    activateCommandPanel,
    activateCommandPanel2
};
export default exports;

app.factory( 'commandPanelService', () => exports );
