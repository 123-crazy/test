/* eslint-disable no-unused-vars */
// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do debugging.
 *
 * @module js/debugService
 *
 * @namespace debugService
 */

import logger from 'js/logger';
import _ from 'lodash';
import breakpointSvc from 'js/breakpointService';

export let debugActionStart = function( action, declViewModel, inputData ) {
    if( !logger.isDeclarativeLogEnabled() || action.actionType === 'Event' ) {
        return;
    }
    // action, declViewModel, $scope, inputData
    var declTraceObject = {
        type: 'action',
        operation: 'start',
        name: action.actionId,
        payload: {
            viewModel: declViewModel._internal.panelId,
            def: action,
            resolvedInput: inputData
        }
    };
    logger.declarativeLog( 'DECLARATIVE TRACE - Action start : %O ', declTraceObject );
};

export let debugEventPub = function( action, event, declViewModel, context, eventDataToPublish ) {
    // action, event, declViewModel, $scope, eventDataToPublish
    if( logger.isDeclarativeLogEnabled() ) {
        var viewModelName = declViewModel._internal ? declViewModel._internal.panelId : declViewModel.panelId;
        var declTraceObject = {
            type: 'event',
            operation: 'publish',
            name: event.name,
            payload: {
                viewModel: viewModelName,
                def: action,
                resolvedInput: eventDataToPublish && eventDataToPublish.scope ? {} : eventDataToPublish
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - Event publish : %O ', declTraceObject );
    }
};

export let debugEventSub = function( eventDef, declViewModel, context, condition ) {
    // eventObj, declViewModel, context, isEventExecutable
    var declTraceObject = {
        type: 'event',
        operation: 'subscribe',
        name: eventDef.eventId,
        payload: {
            viewModel: declViewModel._internal.panelId,
            def: eventDef,
            condition: condition,
            input: {
                context: context && context.scope ? {} : context
            }

        }
    };

    if( logger.isDeclarativeLogEnabled() ) {
        logger.declarativeLog( 'DECLARATIVE TRACE - Event subscribe : %O ', declTraceObject );
    }
};

export let debugActionEnd = function( action, declViewModel, resolvedAssignments ) {
    if( !logger.isDeclarativeLogEnabled() ) {
        return;
    }
    // action, declViewModel, dataCtxNode, actionResponseObj
    var declTraceObject = {
        type: 'action',
        operation: 'complete',
        name: action.actionId,
        payload: {
            viewModel: declViewModel._internal.panelId,
            def: action,
            resolvedOutput: resolvedAssignments
        }
    };
    logger.declarativeLog( 'DECLARATIVE TRACE - Action end: %O ', declTraceObject );
};

export let debugMessages = function( message, declViewModel, context ) {
    //
    var declTraceObject = {
        type: 'message',
        payload: {
            viewModel: declViewModel._internal.panelId,
            def: message.messageDefn,
            resolvedOutput: { localizedMessage: message.localizedMessage, messageData: message.messageData },
            input: {
                context: context
            }
        }
    };
    if( logger.isDeclarativeLogEnabled() ) {
        logger.declarativeLog( 'DECLARATIVE TRACE - Messages: %O ', declTraceObject );
    }
};

export let debugViewAndViewModel = function( operation, viewName, declViewModel, subpanelContext ) {
    /*
     * type is 'contentUnloaded' // when view and VM destroy
     * type is 'contentLoaded' // when view and VM rendered
     */
    var declTraceObject = {
        type: 'viewAndViewModel',
        operation: operation,
        payload: {
            viewModel: viewName,
            input: {
                subPanelContext: subpanelContext
            }
        }
    };
    if( logger.isDeclarativeLogEnabled() ) {
        logger.declarativeLog( 'DECLARATIVE TRACE - View and ViewModel ' + operation + ': %O ', declTraceObject );
    }
};

export let debugGetCommandsForAnchor = function( uiAnchor, commandViewModel ) {
    if( uiAnchor && logger.isDeclarativeLogEnabled() ) {
        var declTraceObject = {
            type: 'command',
            operation: 'contributedCommands',
            payload: {
                viewModel: 'commandsViewModel',
                anchorName: uiAnchor,
                commandsOnAchor: commandViewModel.commands
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - All commands against anchor : %O ', declTraceObject );
    }
};

export let debugGetActiveCommandsForAnchor = function( uiAnchor, activeCommands, context ) {
    if( uiAnchor && logger.isDeclarativeLogEnabled() ) {
        var activeCommand = activeCommands.map( ( value ) => {
            return _.pick( value, [ 'commandId', 'title', 'iconId', 'visible', 'isSelected', 'enabled', 'isGroupCommand', 'extendedToolTip',
                'isToggleCommand', 'priority', 'showGroupSelected'
            ] );
        } );
        var declTraceObject = {
            type: 'command',
            operation: 'activeCommands',
            payload: {
                viewModel: 'commandsViewModel',
                anchorName: uiAnchor,
                activeCommands: activeCommand
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - Active commands against Anchor : %O ', declTraceObject );
    }
};

export let debugUpdateHandlerOnCommand = function( handler, activeConditionExpression, oldConditionExpression, commandsViewModel ) {
    if( logger.isDeclarativeLogEnabled() && handler.id && handler.action && handler.handlerName ) {
        var declTraceObject = {
            type: 'command',
            operation: 'activeHandler',
            payload: {
                viewModel: 'commandsViewModel',
                commandId: handler.id,
                action: handler.action,
                handlerName: handler.handlerName
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - Update Handler : %O ', declTraceObject );
    }
};

export let debugPreProcessingDataParser = function( sourceObj, declViewModel, dataParserDef, dataCtxNode ) {
    if( logger.isDeclarativeLogEnabled() ) {
        var declTraceObject = {
            type: 'dataParser',
            operation: 'preProcessing',
            payload: {
                viewModel: declViewModel._internal.panelId,
                def: dataParserDef
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - Pre processing of DataParser: %O ', declTraceObject );
    }
};

export let debugPostProcessingDataParser = function( processedSourceObj, declViewModel, dataParserDef, dataCtxNode ) {
    if( logger.isDeclarativeLogEnabled() ) {
        var declTraceObject = {
            type: 'dataParser',
            operation: 'postProcessing',
            payload: {
                viewModel: declViewModel._internal.panelId,
                def: dataParserDef,
                resolvedIput: processedSourceObj
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - post processing of DataParser: %O ', declTraceObject );
    }
};

export let debugDataProviderInitialize = function( dataProvider, dataProvierAction, dataProviderDef, context, requestObjectForAction, resolvedInput ) {
    if( logger.isDeclarativeLogEnabled() ) {
        var declTraceObject = {
            type: 'dataProvider',
            operation: 'Initialize',
            name: dataProvider.name,
            payload: {
                viewModel: context.panelId || ( context && context.data ? context.data._internal.panelId : '' ),
                def: dataProviderDef,
                action: dataProvierAction,
                resolvedIput: resolvedInput
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - Initialize of Dataprovider: %O ', declTraceObject );
    }
};

export let debugDataProviderNextPage = function( dataProvider, dataProvierAction, dataProviderDef, context, requestObjectForAction ) {
    if( logger.isDeclarativeLogEnabled() ) {
        var declTraceObject = {
            type: 'dataProvider',
            operation: 'NextPage',
            name: dataProvider.name,
            payload: {
                viewModel: context.panelId || ( context && context.data ? context.data._internal.panelId : '' ),
                def: dataProviderDef,
                action: dataProvierAction
            }
        };
        logger.declarativeLog( 'DECLARATIVE TRACE - NextPage of Dataprovider: %O ', declTraceObject );
    }
};

export let debugConditions = function( conditionName, conditionState, conditionExp, declViewModel ) {
    var declTraceObject = {
        type: 'conditions',
        payload: {
            viewModel: declViewModel,
            conditionName: conditionName,
            expression: conditionExp,
            conditionState: conditionState
        }
    };
    if( logger.isDeclarativeLogEnabled() ) {
        logger.declarativeLog( 'DECLARATIVE TRACE - Conditions: %O ', declTraceObject );
    }
};

/**
 *
 * @param {*} arguments[0] type of the breakpoint
 *
 */
export let debug = function() {
    try {
        if( !logger.isDeclarativeLogEnabled() ) {
            return;
        }

        let brkPointType = arguments[ 0 ];

        if( breakpointSvc.hasConditionSatisfied( brkPointType, arguments[ 1 ], arguments[ 2 ], arguments[ 3 ] ) ) {
            // eslint-disable-next-line no-debugger
            debugger;
        }

        if( brkPointType === 'actions' ) {
            switch ( arguments[ 3 ] ) {
                case 'pre':
                    debugActionStart( arguments[ 4 ], arguments[ 5 ], arguments[ 6 ] );
                    break;
                case 'post':
                    debugActionEnd( arguments[ 4 ], arguments[ 5 ], arguments[ 6 ] );
                    break;
                case 'default': //do nothing
                    break;
            }
        }
        // eslint-disable-next-line no-empty
    } catch ( e ) {}
};

export default {
    debugActionStart,
    debugEventPub,
    debugEventSub,
    debugActionEnd,
    debugMessages,
    debugViewAndViewModel,
    debugGetCommandsForAnchor,
    debugGetActiveCommandsForAnchor,
    debugUpdateHandlerOnCommand,
    debugPreProcessingDataParser,
    debugPostProcessingDataParser,
    debugDataProviderNextPage,
    debugDataProviderInitialize,
    debugConditions,
    debug
};
