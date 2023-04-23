/* eslint-disable valid-jsdoc */
// Copyright (c) 2020 Siemens

/**
 * This module is part of declarative UI framework and provides service related to displaying notifications.
 *
 * @module js/messagingService
 *
 * @publishedApolloService
 */
import app from 'app';
import notyService from 'js/NotyModule';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import AwInjectorService from 'js/awInjectorService';
import conditionService from 'js/conditionService';

import _ from 'lodash';
import declUtils from 'js/declUtils';
import parsingUtils from 'js/parsingUtils';
import logger from 'js/logger';
import debugService from 'js/debugService';

// Another pattern

var _messageTypes = {
    info: true,
    warning: true,
    error: true
};

var exports = {};

/**
 * Get localized text
 *
 * @param {Object} messageContext - The context object (e.g. a 'declViewModel') that holds the text string map to
 *            search within.
 *
 * @param {String} interpolationString - The string to search.
 *
 * @return {String} Interpolated string.
 * @ignore
 */
export let getLocalizedTextForInterpolationString = function( messageContext, interpolationString ) {
    var textPath = parsingUtils.getStringBetweenDoubleMustaches( interpolationString );

    if( textPath === interpolationString ) {
        return interpolationString;
    }

    return _.get( messageContext, textPath );
};

/**
 * Evaluate message with its parameters
 *
 * @param {String} messageString - The message String.
 *
 * @param {String} messageParams - The message parameters.
 *
 * @param {Object} messageContext - The context object (e.g. a 'declViewModel') that holds the text string map to
 *            search within.
 *
 * @return {String} Result string after applying passed parameters.
 */
export let applyMessageParams = function( messageString, messageParams, messageContext ) {
    var placeHolders = messageString.match( /\{[0-9]*\}/g );

    var resultString = messageString;

    if( placeHolders ) {
        for( var i in placeHolders ) {
            if( placeHolders.hasOwnProperty( i ) ) {
                var placeHolder = placeHolders[ i ];

                var index = placeHolder;
                index = _.trimStart( index, '{' );
                index = _.trimEnd( index, '}' );

                var key = parsingUtils.getStringBetweenDoubleMustaches( messageParams[ index ] );
                var replacementString = _.get( messageContext, key );
                resultString = resultString.replace( placeHolder, replacementString );
            }
        }
    }

    return resultString;
};

/**
 * Evaluate message with its parameters
 *
 * @param {String} messageString - The message String.
 *
 * @param {String} messageParams - The message parameters.
 *
 * @return {String} Result string after applying passed parameters.
 */
export let applyMessageParamsWithoutContext = function( messageString, messageParams ) {
    var placeHolders = messageString.match( /\{[0-9]*\}/g );

    var resultString = messageString;

    if( placeHolders ) {
        for( var i in placeHolders ) {
            if( placeHolders.hasOwnProperty( i ) ) {
                var placeHolder = placeHolders[ i ];
                var replacementString = messageParams[ i ];
                resultString = resultString.replace( placeHolder, replacementString );
            }
        }
    }

    return resultString;
};

/**
 * Evaluate message data
 *
 * @param {String} messageString - The message String.
 *
 * @param {String} messageParams - The message parameters.
 *
 * @param {String} messageData - The message data.
 *
 * @param {Object} messageContext - The context object (e.g. a 'declViewModel') that holds the text string map to
 *            search within.
 *
 * @return {Object} Result object after applying passed parameters.
 * @ignore
 */
export let applyMessageData = function( messageString, messageParams, messageData, messageContext ) {
    if( messageData ) {
        for( var key in messageData ) {
            if( messageData[ key ] ) {
                var parseKey = parsingUtils.getStringBetweenDoubleMustaches( messageData[ key ] );
                var replacementString = _.get( messageContext, parseKey );

                messageData[ key ] = replacementString;
            }
        }

        messageData.context = messageContext;
        messageData.params = messageParams;
    }

    return messageData;
};

/**
 * Report a message using 'NotyJS' API.
 *
 * @param {Object} messageDefn - message definition
 *
 * @param {String} localizedMessage - localizedMessage
 *
 * @param {Object} deferred - promise object
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context object that holds the text string map to
 *            search within.
 *
 * @param {Object} parentScope - The scope of the parent
 *
 * @param {Object} messageData - message data object
 */
var _reportNotyMessageInternal = function( messageDefn, localizedMessage, deferred, declViewModel, parentScope,
    messageData ) {
    var injector = AwInjectorService.instance;
    var buttonsArr = [];

    if( messageDefn.navigationOptions ) {
        _.forEach( messageDefn.navigationOptions, function( navOption ) {
            var button = {};

            button.addClass = 'btn btn-notify';

            button.text = exports.getLocalizedTextForInterpolationString( declViewModel, navOption.text );

            button.onClick = function( $noty ) {
                $noty.close();

                if( injector && navOption.action ) {
                    /**
                     * @param {ModuleObject} viewModelSvc - A reference to the 'viewModelService' module's API.
                     */
                    injector.invoke( [ 'viewModelService', function( viewModelSvc ) {
                        viewModelSvc.executeCommand( declViewModel, navOption.action, parentScope );
                        deferred.resolve();
                    } ] );
                } else {
                    deferred.resolve();
                }
            };

            buttonsArr.push( button );
        } );
    }

    if( messageDefn.messageType === 'INFO' ) {
        exports.showInfo( localizedMessage, messageData, messageDefn, buttonsArr );
        deferred.resolve();
    } else if( messageDefn.messageType === 'WARNING' ) {
        exports.showWarning( localizedMessage, buttonsArr, messageData, messageDefn );
    } else if( messageDefn.messageType === 'ERROR' ) {
        exports.showError( localizedMessage, messageData, messageDefn, buttonsArr );
        deferred.resolve();
    }
};

const _applyErrorMessage = function( messageDefn, context ) {
    const parseKey = parsingUtils.getStringBetweenDoubleMustaches( messageDefn.messageText );
    return _.get( context, parseKey );
};

/**
 * generate a message.
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context object that holds the text string map to search within.
 *
 * @param {Object} messageList - Structure containing action messages.
 *
 * @param {String} message - The action message.
 *
 * @param {Object} parentScope - The scope of the parent
 *
 * @ignore
 */
export let generateMessage = function( declViewModel, messageList, message, parentScope ) {
    if( !messageList ) {
        messageList = declViewModel._internal.messages;
    }
    if( parentScope ) {
        declUtils.assertValidModelAndDataCtxNode( declViewModel, parentScope );
    } else {
        declUtils.assertValidModel( declViewModel );
    }
    var messageDefn = _.cloneDeep( _.get( messageList, message ) );

    if( messageDefn ) {
        var context = {
            data: declViewModel,
            ctx: appCtxService.ctx,
            ports: declViewModel._internal.ports,
            ...parentScope
        };

        if( messageDefn.expression ) {
            var expr = {};
            _.forEach( messageDefn.expression, function( expression, key ) {
                expr[ key ] = conditionService.parseExpression( declViewModel, expression, context );
            } );

            context.expression = expr;
        }

        var localizedMessage = null;
        if( messageDefn.messageText ) {
            localizedMessage = exports.getLocalizedTextForInterpolationString( declViewModel, messageDefn.messageText );
            if( localizedMessage ) {
                localizedMessage = exports.applyMessageParams( localizedMessage, messageDefn.messageTextParams, context );
            } else {
                localizedMessage = _applyErrorMessage( messageDefn, parentScope );
            }
        } else if( messageDefn.messageKey ) {
            var messageData = exports.applyMessageData( localizedMessage, messageDefn.messageTextParams, messageDefn.messageData, context );
            messageData.isCustomElem = true;
            localizedMessage = '<aw-include name="' + messageDefn.messageKey +
                '" sub-panel-context="subPanelContext"></aw-include>';
        } else {
            // Invalid usage of message
            return {};
        }
        return { localizedMessage: localizedMessage, messageData: messageData, messageDefn: messageDefn };
    }
    return {};
};

/**
 * Report a message using 'NotyJS' API.
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context object that holds the text string map to
 *            search within.
 *
 * @param {Object} messageList - Structure containing action messages.
 *
 * @param {String} notyMessage - The action message.
 *
 * @param {Object} parentScope - The scope of the parent
 * @ignore
 */
export let reportNotyMessage = function( declViewModel, messageList, notyMessage, parentScope ) {
    var deferred = AwPromiseService.instance.defer();
    var message = exports.generateMessage( declViewModel, messageList, notyMessage, parentScope );
    var messageDefn = message.messageDefn;
    if( !message.localizedMessage ) {
        deferred.reject( 'resolved message string is empty' );
    } else if( messageDefn && messageDefn.messageType ) {
        if( logger.isDeclarativeLogEnabled() ) {
            debugService.debugMessages( message, declViewModel, parentScope );
        }
        if( messageDefn.messageText ) {
            _reportNotyMessageInternal( messageDefn, message.localizedMessage, deferred, declViewModel, parentScope );
        } else if( messageDefn.messageKey ) {
            _reportNotyMessageInternal( messageDefn, message.localizedMessage, deferred, declViewModel, parentScope, message.messageData );
        } else {
            // Invalid usage of message
            deferred.reject();
        }

        declViewModel.getToken().addAction( messageDefn );
        deferred.promise.then( function() {
            declViewModel.getToken().removeAction( messageDefn );
        } ).catch( function() {
            declViewModel.getToken().removeAction( messageDefn );
        } );
    }
    return deferred.promise;
};

/**
 * Show error message in notification.
 *
 * @param {String} message - error message to show
 * @param {String} messageData – Dynamic data to pass along with message
 * @param {Object} messageDefn - message definition
 * @param {Object} buttonsArr - Array of buttons as user options
 */
export let showError = function( message, messageData, messageDefn, buttonsArr ) {
    if( _messageTypes.error ) {
        logger.error( message );
        notyService.showError( message, messageData, messageDefn, buttonsArr );
    }
};

/**
 * Show informational message in notification.
 *
 * @param {String} message - Informational message to show
 * @param {String} messageData – Dynamic data to pass along with message
 * @param {Object} messageDefn - message definition
 * @param {Object} buttonsArr - Array of buttons as user options
 */
export let showInfo = function( message, messageData, messageDefn, buttonsArr ) {
    if( _messageTypes.info ) {
        logger.info( message );
        notyService.showInfo( message, messageData, messageDefn, buttonsArr );
    }
};

/**
 * Show warning message in notification.
 *
 * @param {String} message - Warning message to show
 * @param {String} buttonsArr  – Array of buttons (like: Cancel, Ok)
 * @param {String} messageData – Dynamic data to pass along with message
 * @param {Object} messageDefn - message definition
 */
export let showWarning = function( message, buttonsArr, messageData, messageDefn ) {
    if( _messageTypes.warning ) {
        logger.warn( message );
        notyService.showWarning( message, buttonsArr, messageData, messageDefn );
    }
};

/**
 * Get SOA error message from error object
 *
 * @param {String} errorJSO - JavaScript Object exception
 *
 * @return {String} message error message to be displayed.
 * @ignore
 */
export let getSOAErrorMessage = function( errorJSO ) {
    if( errorJSO.message ) {
        return errorJSO.message;
    }

    var partialErrors = null;

    if( errorJSO.partialErrors ) {
        partialErrors = errorJSO.partialErrors;
    } else if( errorJSO.cause && errorJSO.cause.partialErrors ) {
        partialErrors = errorJSO.cause.partialErrors;
    }

    errorJSO.message = '';

    if( partialErrors ) {
        for( var ii = 0; ii < partialErrors.length; ii++ ) {
            var errorValues = partialErrors[ ii ].errorValues;

            if( errorValues ) {
                for( var jj = 0; jj < errorValues.length; jj++ ) {
                    if( errorValues[ jj ].message ) {
                        if( errorJSO.message.length > 0 ) {
                            errorJSO.message += '\n';
                        }

                        errorJSO.message += errorValues[ jj ].message;
                    }
                }
            }
        }
    }

    return errorJSO.message;
};

/**
 * Setting custom notification timeout for INFO.
 *
 * @param {String} messageType - type if message INFO/ERROR
 * @param {String} timeoutValue - timeout Value in ms.
 */
export let setTimeout = function( messageType, timeoutValue ) {
    timeoutValue = parseInt( timeoutValue );
    messageType = messageType.toLocaleLowerCase();
    if( !isNaN( timeoutValue ) && timeoutValue > 0 ) {
        timeoutValue = getTimeoutMillis( timeoutValue );
    } else if( timeoutValue <= 0 ) {
        timeoutValue = 0;
    }
    notyService.setTimeout( messageType, timeoutValue );
};

/**
 * API to set the visibility of any type of notification messages.
 *
 * @param {String} messageType - INFO/WARNING/ERROR
 * @param {Boolean} value - set visibility value
 *
 */
export let setMessageVisibility = function( messageType, value ) {
    messageType = messageType.toLocaleLowerCase();
    if( messageType in _messageTypes ) {
        _messageTypes[ messageType ] = value;
    }
};

/*
 * The service to convert seconds in milliseconds.
 */
var getTimeoutMillis = function( timeout ) {
    return timeout * 1000;
};

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which service
 * should be injected to provide the API for this module.
 */

exports = {
    getLocalizedTextForInterpolationString,
    applyMessageParams,
    applyMessageParamsWithoutContext,
    applyMessageData,
    generateMessage,
    reportNotyMessage,
    showError,
    showInfo,
    showWarning,
    getSOAErrorMessage,
    setTimeout,
    setMessageVisibility
};
export default exports;
/**
 * The service to display noty messages.
 *
 * @member messagingService
 * @memberof NgServices
 */
app.factory( 'messagingService', () => exports );
