// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/NotyModule
 */
import app from 'app';
import sanitizer from 'js/sanitizer';
import iconSvc from 'js/iconService';
import themeSvc from 'js/theme.service';
import eventBus from 'js/eventBus';

var exports = {};

var timeout = {
    information: 6000,
    error: 60000
};
var modalType = {
    information: false,
    warning: true,
    error: false
};

/**
 * @param {String} notyMessage - noty message
 */
function renderMessage( notyMessage ) {
    // don't load jquery.noty.customized until it's actually needed
    import( 'js/jquery.noty.customized' ).then( function( notyRenderer ) {
        if( notyMessage && notyMessage.type !== 'warning' ) {
            var removeMessagesSubs = eventBus.subscribe( 'removeMessages', function() {
                notyRenderer.close();
                // unregister
                eventBus.unsubscribe( removeMessagesSubs );
            } );
        }
        notyRenderer.setIconService( iconSvc );
        notyRenderer.init( notyMessage );
    } );
}

/**
 * HTML-escapes a string, but does not double-escape HTML-entities already present in the string.
 *
 * @param {String} message - Message to parse.
 * @return {String} Returns escaped and safe HTML.
 */
function getNotyMessage( message, msgType, buttonsArr, messageData ) {
    var isModal = modalType[ msgType ];
    var isTimeout = timeout[ msgType ];
    var closeConfig = [ 'X', 'stayOnClick' ];
    var sanitizedMessage = sanitizer.sanitizeHtmlValue( message );
    var parsedHtml = parseMessage( sanitizedMessage );
    var currentTheme = themeSvc.getTheme() ? themeSvc.getTheme() : 'lightTheme';

    if( buttonsArr && buttonsArr.length > 0 ) {
        isModal = true;
        isTimeout = false;
        closeConfig = [];
    }
    var notyMessage = {
        layout: 'bottom',
        theme: currentTheme,
        type: msgType,
        // Do not pass in escaped or safe html string in case of custom message.
        text: messageData ? sanitizedMessage : parsedHtml,
        dismissQueue: true,
        maxVisible: 3,
        modal: isModal,
        closeWith: closeConfig,

        animation: {
            open: {
                height: 'toggle'
            },
            close: {
                height: 'toggle'
            },
            easing: 'swing',
            speed: 500
        },
        timeout: isTimeout,
        messageData: messageData
    };
    if( buttonsArr && buttonsArr.length > 0 ) {
        notyMessage.buttons = buttonsArr;
    }
    return notyMessage;
}

/**
 * HTML-escapes a string, but does not double-escape HTML-entities already present in the string.
 *
 * @param {String} message - Message to parse.
 * @return {String} Returns escaped and safe HTML.
 */
function parseMessage( message ) {
    var escapedStr = '';
    var parsedHtml = null;
    if( message ) {
        escapedStr = message.replace( /(<br|<\/br)\s*[/]?>/gi, '\n' );
        parsedHtml = sanitizer.htmlEscapeAllowEntities( escapedStr, true, true );
        return parsedHtml;
    }
    return message;
}

/**
 * Get the modal type for the message.
 * messageDefination will get the higest priority
 * user can set globally using the setModelType which get second higest priority
 * OOTB modal type for message type are INFO:false , WARNING:true, ERROR:false
 * @param {String} message - Message to parse.
 * @return {String} Returns escaped and safe HTML.
 */
export let getModalType = function( messageDefn, messageType ) {
    if( messageDefn && messageDefn.hasOwnProperty( 'isModal' ) ) {
        return messageDefn.isModal;
    }
    return modalType[ messageType ];
};

/**
 * Setting custom notification timeout for INFO.
 *
 * @param {String} messageType - type if message INFO/ERROR
 * @param {integer} timeoutValue - timeout Value in ms.
 */
export let setTimeout = function( messageType, timeoutValue ) {
    switch ( messageType ) {
        case 'info':
            timeout.information = timeoutValue;
            timeout.error = timeoutValue * 10;
            break;

        case 'error':
            timeout.error = timeoutValue;
            break;
    }
};

/**
 * Report an 'informational' type pop up message using 'NotyJS' API.
 *
 * @param {String} message - Message to display.
 * @param {String} messageData - data to pass along with noty message
 * @param {Object} messageDefn - message definition
 * @param {Object} buttonsArr - Array of buttons as user options
 */
export let showInfo = function( message, messageData, messageDefn, buttonsArr ) {
    var notyMessage = getNotyMessage( message, 'information', buttonsArr, messageData );
    renderMessage( notyMessage );
};
/**
 * Report an 'alert' type pop up message using 'NotyJS' API.
 *
 * @param {String} message - Message to display.
 * @param {String} messageData - data to pass along with noty message
 */
export let showAlert = function( message, messageData ) {
    var sanitizedMessage = sanitizer.sanitizeHtmlValue( message );
    var parsedHtml = parseMessage( sanitizedMessage );
    var currentTheme = themeSvc.getTheme() ? themeSvc.getTheme() : 'lightTheme';
    var notyMessage = {
        layout: 'bottom',
        theme: currentTheme,
        type: 'alert',
        // Do not pass in escaped or safe html string in case of custom message.
        text: messageData ? sanitizedMessage : parsedHtml,
        dismissQueue: true,
        maxVisible: 3,
        closeWith: [ 'X', 'stayOnClick' ],
        animation: {
            open: {
                height: 'toggle'
            },
            close: {
                height: 'toggle'
            },
            easing: 'swing',
            speed: 500
        },
        timeout: timeout.info,
        messageData: messageData
    };
    renderMessage( notyMessage );
};
/**
 * Report an 'warning' type pop up message using 'NotyJS' API.
 *
 * @param {String} message - Message to display.
 * @param {Object} buttonsArr - Array of buttons as user options
 * @param {String} messageData - data to pass along with noty message
 * @param {Object} messageDefn - message definition
 */
export let showWarning = function( message, buttonsArr, messageData, messageDefn ) {
    var notyMessage = getNotyMessage( message, 'warning', buttonsArr, messageData );
    renderMessage( notyMessage );
};
/**
 * Report an 'error' type pop up message using 'NotyJS' API.
 *
 * @param {String} message - Message to display.
 * @param {String} messageData - data to pass along with noty message
 * @param {Object} messageDefn - message definition
 * @param {Object} buttonsArr - Array of buttons as user options
 */
export let showError = function( message, messageData, messageDefn, buttonsArr ) {
    var notyMessage = getNotyMessage( message, 'error', buttonsArr, messageData );
    renderMessage( notyMessage );
};

exports = {
    getModalType,
    setTimeout,
    showInfo,
    showAlert,
    showWarning,
    showError
};
export default exports;

/**
 * @memberof NgServices
 * @member notyService
 */
app.factory( 'notyService', () => exports );
