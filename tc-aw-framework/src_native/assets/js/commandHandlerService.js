// Copyright (c) 2020 Siemens

/**
 * This is the primary service used to create, test and manage the internal properties of CommandHandler Objects used in
 * AW.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/commandHandlerService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Define the base object used to provide all of this module's external API.
 *
 * @private
 */
let exports;

/**
 * Hide the command panel if the handler is active
 *
 * @param {CommandHandler} commandHdlr - The command handler
 */
var hideIfActive = function( commandHdlr ) {
    var activeCommandContexts = [ 'activeNavigationCommand', 'activeToolsAndInfoCommand', 'sidenavCommandId' ];
    var commandIdArray = [];
    activeCommandContexts
        .forEach( function( ctx ) {
            // Zero compile commands share visibility which means the "open" command will only have same commandId
            var isCommandOpen = appCtxService.getCtx( ctx + '.commandId' ) &&
                appCtxService.getCtx( ctx + '.commandId' ) === commandHdlr.commandId ||
                appCtxService.getCtx( ctx ) &&
                appCtxService.getCtx( ctx ) === commandHdlr.commandId;
            if( isCommandOpen ) {
                var commandId = appCtxService.getCtx( ctx + '.commandId' ) === commandHdlr.commandId ? appCtxService.getCtx( ctx + '.commandId' ) : appCtxService.getCtx( ctx );
                if( !commandIdArray.includes( commandId ) ) {
                    var id = null;
                    if( ctx === 'activeNavigationCommand' ) {
                        id = 'aw_navigation';
                    } else if( ctx === 'activeToolsAndInfoCommand' ) {
                        id = 'aw_toolsAndInfo';
                    }
                    eventBus.publish( 'awsidenav.openClose', {
                        id: id,
                        commandId: commandId
                    } );
                    commandIdArray.push( commandId );
                }
            }
        } );
};

/**
 * Change the icon of a command handler
 *
 * @param {CommandHandler} commandHdlr Handler to update
 * @param {String} iconId Icon id
 */
export let setIcon = function( commandHdlr, iconId ) {
    commandHdlr.iconId = iconId;
};

/**
 * Set 'isVisible' state of command handler
 *
 * @param {CommandHandler} commandHdlr - command handler object that will be updated
 * @param {Boolean} isVisible - is visible flag
 */
export let setIsVisible = function( commandHdlr, isVisible ) {
    if( commandHdlr.visible !== isVisible ) {
        commandHdlr.visible = isVisible;
        if( !commandHdlr.visible ) {
            hideIfActive( commandHdlr );
        }
    }
};

/**
 * Set 'isEnabled' state of command handler
 *
 * @param {CommandHandler} commandHdlr - command handler object that will be updated
 * @param {Boolean} isEnabled - is enabled flag
 */
export let setIsEnabled = function( commandHdlr, isEnabled ) {
    if( commandHdlr.enabled !== isEnabled ) {
        commandHdlr.enabled = isEnabled;
        if( !commandHdlr.enabled ) {
            hideIfActive( commandHdlr );
        }
    }
};

/**
 * Set 'isSelected' state of the command
 *
 * @param {CommandHandler} commandHdlr - command handler object that will be updated
 * @param {boolean} isSelected - is selected flag
 */
export let setSelected = function( commandHdlr, isSelected ) {
    commandHdlr.isSelected = isSelected;
};

/**
 * Set 'isGroupCommand' of command handler
 *
 * @param {CommandHandler} commandHdlr - command handler object that will be updated
 * @param {Boolean} nameToken - is group command flag
 * @returns {Promise} Promise resolved when done
 */
export let getPanelLifeCycleClose = function( commandHdlr, nameToken ) {
    var deferred = AwPromiseService.instance.defer();
    commandHdlr.callbackApi.getPanelLifeCycleClose( nameToken, deferred );
    return deferred.promise;
};

/**
 * Do any setup the command handler requires before creating the view
 *
 * @param {CommandHandler} commandHdlr - The command handler
 *
 * @return {Promise} A promise resolved when done
 */
export let setupDeclarativeView = function( commandHdlr ) {
    var deferred = AwPromiseService.instance.defer();
    commandHdlr.setupDeclarativeView( deferred );
    return deferred.promise;
};

/**
 * Change the icon/title that a toggle command is currently using
 *
 * @param {Object} commandExecuted - Whether the command was executed
 * @param {Object} selectionValueOnEvent - Whether the command was selected
 * @param {Object} outputCommand - Command overlay
 */
export let swapIconTitle = function( commandExecuted, selectionValueOnEvent, outputCommand ) {
    let tempIconId;
    let tempTitle;
    let tempExtendedTitle;
    let tempDescription;

    if( commandExecuted ) {
        if( _.isUndefined( outputCommand.selectedIconId ) ) {
            tempIconId = outputCommand.iconIdWithoutSelection;
        } else {
            if( outputCommand.iconId === outputCommand.selectedIconId ) {
                tempIconId = outputCommand.iconIdWithoutSelection;
            } else {
                tempIconId = outputCommand.selectedIconId;
            }
        }
        if( outputCommand.title === outputCommand.selectedTitle ) {
            tempTitle = outputCommand.titleWithoutSelection;
        } else {
            tempTitle = outputCommand.selectedTitle ? outputCommand.selectedTitle :
                outputCommand.title;
        }
        if( outputCommand.description === outputCommand.selectedDescription ) {
            tempDescription = outputCommand.descriptionWithoutSelection;
        } else {
            tempDescription = outputCommand.selectedDescription ? outputCommand.selectedDescription : outputCommand.description;
        }
    } else {
        if( selectionValueOnEvent ) {
            if( _.isUndefined( outputCommand.selectedIconId ) ) {
                tempIconId = outputCommand.iconIdWithoutSelection;
            } else {
                tempIconId = outputCommand.selectedIconId;
                tempTitle = outputCommand.selectedTitle ? outputCommand.selectedTitle :
                    outputCommand.title;
                tempDescription = outputCommand.selectedDescription ? outputCommand.selectedDescription :
                    outputCommand.description;
                tempExtendedTitle = outputCommand.selectedExtendedTooltip;
            }
            if( _.isUndefined( outputCommand.selectedTitle ) ) {
                tempTitle = outputCommand.titleWithoutSelection;
            } else {
                tempTitle = outputCommand.selectedTitle;
                tempExtendedTitle = outputCommand.selectedExtendedTooltip;
            }
            if( _.isUndefined( outputCommand.selectedDescription ) ) {
                tempDescription = outputCommand.descriptionWithoutSelection;
            } else {
                tempDescription = outputCommand.selectedDescription;
            }
        } else {
            tempIconId = outputCommand.iconIdWithoutSelection;
            tempTitle = outputCommand.titleWithoutSelection;
            tempDescription = outputCommand.descriptionWithoutSelection;
            tempExtendedTitle = outputCommand.extendedtitleWithoutSelection;
        }
    }
    if ( tempIconId ) {
        exports.setIcon( outputCommand, tempIconId );
    }
    outputCommand.title = tempTitle !== undefined ? tempTitle : outputCommand.title;
    outputCommand.extendedTooltip = tempExtendedTitle !== undefined ? tempExtendedTitle : outputCommand.extendedTooltip;
    outputCommand.description = tempDescription;
};

/* eslint-disable-next-line valid-jsdoc*/

exports = {
    setIcon,
    setIsVisible,
    setIsEnabled,
    setSelected,
    getPanelLifeCycleClose,
    setupDeclarativeView,
    swapIconTitle
};
export default exports;

/**
 * This is the primary service used to create, test and manage the properties of CommandHandler Objects used in
 * AW.
 *
 * @memberof NgServices
 * @member commandHandlerService
 */
app.factory( 'commandHandlerService', () => exports );
