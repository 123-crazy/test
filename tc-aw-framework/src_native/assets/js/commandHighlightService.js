/* eslint-disable no-await-in-loop */
// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.commandHighlightService} which manages highlighting commands.
 *
 * @module js/commandHighlightService
 *
 * @namespace commandHighlightService
 */
import commandOverflowService from 'js/commandOverflow.service';
import configurationService from 'js/configurationService';
import _ from 'lodash';
import AwTimeoutService from 'js/awTimeoutService';
import $ from 'jquery';
import tna from 'app';
import wcagSvc from 'js/wcagService';

let exports;

const notInFooterButton = 'not(aw-footer button)';

const notInFooterLi = 'not(aw-footer li)';

const retryMaxCount = 75;

const idleTimeMs = 50;

/**
 * Delay the execution for a given ms
 *
 * @function delay
 * @param {Number} ms - amount of milliseconds to wait
 * @return {Promise} promise - resolved after x amount of milliseconds
 */
const delay = function( ms ) {
    return new Promise( resolve => setTimeout( resolve, ms ) );
};

const find = function( selector, notSelector ) {
    return $( document.body ).find( `${selector}${notSelector}` );
};

/**
 * Click a command with the given name. Differs from original step def as it will also locate the command within a
 * group if necessary.
 *
 * @function getCommandPlacements
 * @param {String} commandId - ID of the command to check for
 * @param {Object} placementInfo - Object with "anchors" and "groups" properties
 */
const getCommandPlacements = async function( commandId ) {
    const commandsViewModel = await configurationService.getCfg( 'commandsViewModel' );

    const placements = _.filter( commandsViewModel.commandPlacements, placement => commandId === placement.id );

    const placementInfo = placements.reduce( ( acc, nxt ) => {
        if( nxt.parentGroupId ) {
            acc.groups[ nxt.parentGroupId ] = true;
        } else {
            acc.anchors[ nxt.uiAnchor ] = true;
        }
        return acc;
    }, {
        anchors: {},
        groups: {}
    } );

    placementInfo.anchors = Object.keys( placementInfo.anchors );
    placementInfo.groups = Object.keys( placementInfo.groups );
    return placementInfo;
};

/**
 * Poll the popup until it populates with a given command ID
 *
 * @function getCommandInPopup
 * @param {String} commandId - the ID to search the page for
 * @param {String} notSelector - selector to ignore during search
 * @return {Element} popupCmdElement - command element in the popup
 */
const getCommandInPopup = async function( commandId, notSelector ) {
    let retryCounter = 0;
    let popupCmdElement;
    let loadingElement;

    setTimeout( function() {
        retryCounter = retryMaxCount; // After 10 seconds just quit
    }, 10000 );

    while( retryCounter < retryMaxCount ) {
        [ loadingElement ] = $( document.body ).find( 'aw-popup-command-bar .aw-jswidgets-loading' );
        if( !loadingElement ) {
            popupCmdElement = find( `li#${commandId}:${notInFooterLi}`, notSelector );
            if( popupCmdElement && popupCmdElement.length > 0 ) {
                return popupCmdElement[ 0 ];
            }
            retryCounter++;
        }
        await delay( idleTimeMs );
    }
};

/**
 * Check if the group command has a given command ID inside it
 *
 * @function checkGroupForElement
 * @param {String} commandId - the ID to search the popup for
 * @param {String} selector - jquery selector to look for
 * @param {String} notSelector - selector to ignore during search
 * @return {Element} commandElement - the command element with ID we were looking for
 */
const checkGroupForElement = async function( commandId, selector, notSelector ) {
    let groupCommand;
    let retryCounter = 0;
    let $timeout = AwTimeoutService.instance;
    // Slight delay as the overflow loading is not instant
    while( retryCounter < retryMaxCount ) {
        groupCommand = find( selector, notSelector );
        if( groupCommand && groupCommand.length > 0 ) {
            break;
        }
        retryCounter++;
        await delay( idleTimeMs );
    }
    if( groupCommand && groupCommand.length > 0 ) {
        await $timeout( () => {
            groupCommand[ 0 ].click();
        }, 500, false );

        const commandElement = await getCommandInPopup( commandId, notSelector );

        if( commandElement ) {
            return commandElement;
        }
    }
};

/**
 * Get command information for a given command ID ie all its anchors, if it is in overflow, and the element itself
 *
 * @function getCommandLocation
 * @param {String} commandId - ID of the command get info for
 * @param {String} notSelector - selector to ignore during search
 * @return {Object} commandInfo - Object with "anchors", "overflow", and "element" properties
 */
const getCommandLocation = function( commandId, notSelector ) {
    let commandInfo = {
        anchor: '',
        overflow: '',
        newOverflowType: false,
        element: ''
    };

    let [ commandElement ] = find( `button[button-id='${commandId}']:${notInFooterButton}`, notSelector );

    if( commandElement ) {
        commandInfo.element = commandElement;
        let [ commandBar ] = $( commandElement ).closest( 'aw-command-bar' );
        let anchor = commandBar.getAttribute( 'anchor' );
        commandInfo.anchor = anchor;
        let alignment = commandBar.getAttribute( 'alignment' );
        let parentToolBar = $( commandElement ).closest( '.aw-toolbar-layout' );
        if( parentToolBar && parentToolBar.length > 0 ) {
            commandInfo.newOverflowType = true;
        } else {
            if( alignment === 'HORIZONTAL' ) {
                commandInfo.newOverflowType = true;
            }
        }

        if( commandInfo.newOverflowType ) {
            commandInfo.overflow = commandOverflowService.hasOverflow( commandBar, alignment, commandElement );
        } else {
            let [ commandOverflow ] = $( commandElement ).closest( '.aw-commands-overflow' );

            if( commandOverflow ) {
                commandInfo.overflow = true;
            } else {
                commandInfo.overflow = false;
            }
        }
    }

    return commandInfo;
};

/**
 * Clicks an element if it exists
 *
 * @function clickElement
 * @param {String} element - the element to click
 */
const clickElement = function( element ) {
    if( element ) {
        element.click();
    }
};

/**
 * Click the overflow button ie '...' or 'More' and then get the command ID element in that popup
 *
 * @function clickOverflowAndGetCommand
 * @param {String} anchor - the anchor the command is on
 * @param {Element} element - the aw-command element
 * @param {String} commandId - the final command ID to return
 * @param {boolean} newOverflowType - new versus old.
 * @param {String} notSelector - selector to ignore during search
 * @param {boolean} checkPopupForCmd - whether to poll the popup for the command or not
 * @return {Element} element - the element in a popup
 */
const clickOverflowAndGetCommand = async function( anchor, element, commandId, newOverflowType, notSelector, checkPopupForCmd = true ) {
    let $timeout = AwTimeoutService.instance;
    if( newOverflowType ) {
        let [ toolbar ] = $( element ).closest( '.aw-toolbar-layout' );

        const firstAnchor = toolbar.getAttribute( 'first-anchor' );
        const commandOverflow = find( `div[first-anchor='${firstAnchor}'] .aw-commands-moreButton button`, notSelector );
        await $timeout( () => {
            clickElement( commandOverflow );
        }, 100, false );

        if( checkPopupForCmd ) {
            const elementInPopup = await getCommandInPopup( commandId, notSelector );
            if( elementInPopup ) {
                return elementInPopup;
            }
        }
    } else {
        const commandOverflow = find( `aw-command-bar[anchor='${anchor}'] .aw-command-overflowIcon button`, notSelector );
        await $timeout( () => {
            clickElement( commandOverflow );
        }, 100, false );
        return element;
    }
};

/**
 * Get the correct HTML element for a given command ID
 *
 * @function getCommandElement
 * @param {String} commandId - the ID to search the page for
 * @param {String} notSelector - selector to ignore during search
 * @return {Element} element - the command element
 */
const getCommandElement = async function( commandId, notSelector ) {
    let { anchor, overflow, newOverflowType, element } = getCommandLocation( commandId, notSelector );

    if( element && !overflow ) {
        return element;
    }

    if( element && overflow ) {
        return await clickOverflowAndGetCommand( anchor, element, commandId, newOverflowType, notSelector );
    }

    const commandPlacements = await getCommandPlacements( commandId );

    for( const groupId of commandPlacements.groups ) {
        let groupCommandLocation = getCommandLocation( commandPlacements.groups, notSelector );
        if( groupCommandLocation.overflow ) {
            await clickOverflowAndGetCommand( groupCommandLocation.anchor, groupCommandLocation.element, commandId, groupCommandLocation.newOverflowType, notSelector, false );
            let commandElement;
            if( groupCommandLocation.newOverflowType ) {
                commandElement = await checkGroupForElement( commandId, `li#${groupId}:${notInFooterLi}`, notSelector );
            } else {
                commandElement = await checkGroupForElement( commandId, `button[button-id='${groupId}']:${notInFooterButton}`, notSelector );
            }
            if( commandElement ) {
                return commandElement;
            }
        } else {
            let commandElement = await checkGroupForElement( commandId, `button[button-id='${groupId}']:${notInFooterButton}`, notSelector );
            if( commandElement ) {
                return commandElement;
            }
        }
    }
};

/**
 * Highlight a given command ID in the LHN/PWA/Right wall
 *
 * @function highlightCommand
 * @param {String} commandId - command ID to highlight
 * @param {String} notSelector - optional selector to exclude parts of the dom.
 * Ex: :not([anchor*=aw_PredictedCmds] button) -> Do not look for commands in the predictive ui command bar
 * Ex: :not([anchor*=aw_PredictedCmds] button):not([anchor=aw_rightWall] button) -> Do not look for commands in the predictive ui or right wall command bars
 * @return {Element} commandElement - the command element with ID we were looking for
 */
export const highlightCommand = async function( commandId, notSelector = '' ) {
    let commandElement = await getCommandElement( commandId, notSelector );
    if( commandElement ) {
        wcagSvc.afxFocusElement( commandElement );
    }
    return commandElement;
};

exports = {
    highlightCommand
};

export default exports;

/**
 * Command service to manage highlighting commands.
 *
 * @member commandHighlightService
 * @memberOf NgServices
 */
tna.factory( 'commandHighlightService', () => exports );
