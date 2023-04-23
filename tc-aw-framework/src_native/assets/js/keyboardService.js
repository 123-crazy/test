// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/keyboardService
 */
import app from 'app';
import $ from 'jquery';

/**
 * Define public API
 */
var exports = {};

export let keyCmdIdMap = {
    67: [ 'Awp0Copy' ],
    86: [ 'Awp0Paste', 'Awp0PasteGroup' ],
    88: [ 'Awp0Cut', 'Awb0RemoveElement' ]
};

/**
 * register keydown event
 */
export let registerKeyDownEvent = function() {
    // unregister key down event before registering it.
    exports.unRegisterKeyDownEvent();
    $( 'body' ).on( 'keydown', function( event ) {
        exports.checkForPressedKey( event );
    } );
};

/**
 * unRegister keydown event
 */
export let unRegisterKeyDownEvent = function() {
    $( 'body' ).off( 'keydown' );
};

/**
 * Get text selected in browser
 *
 * @return selectedText
 */
export let getSelectionText = function() {
    var selectedText = '';
    if( window.getSelection ) {
        selectedText = window.getSelection().toString();
    }
    return selectedText;
};

/**
 * Check if selection/range is valid to process hotkey
 */
export let isSelectionValid = function( event ) {
    var selectedText = exports.getSelectionText();
    if( selectedText === '' ) {
        var targetCss = event.target.getAttribute( 'class' );
        if( !targetCss ||
            targetCss.indexOf( 'aw-widgets-propertyEditValue' ) === -1 && targetCss
            .indexOf( 'aw-uiwidgets-searchBox' ) === -1 ) {
            return true;
        }
    }

    return false;
};

/**
 * check for pressed key and do necessary actions
 */
export let checkForPressedKey = function( event ) {
    var keyId = event.which || event.keyCode;
    var ctrl = event.ctrlKey;
    if( ctrl && keyId !== 17 ) {
        var proceed = exports.isSelectionValid( event );
        if( proceed && exports.keyCmdIdMap[ keyId ] ) {
            var cmdIds = exports.keyCmdIdMap[ keyId ];
            for( var i = 0; i < cmdIds.length; i++ ) {
                var commands = document.querySelectorAll( '[button-id=' + cmdIds[ i ] + ']' );
                // click on first active command
                if( commands[ 0 ] && !$( commands[0] ).hasClass( 'disabled' ) ) {
                    commands[0].click();
                    break;
                }
            }
        }
    }
};

exports = {
    keyCmdIdMap,
    registerKeyDownEvent,
    unRegisterKeyDownEvent,
    getSelectionText,
    isSelectionValid,
    checkForPressedKey
};
export default exports;
/**
 * This service provides helpful APIs to register key down event and handles ctrl+c, ctrl+v and ctrl+x keyboard
 * shortcuts.
 *
 * @memberof NgServices
 * @member keyboardService
 */
app.factory( 'keyboardService', () => exports );
