// Copyright (c) 2020 Siemens
// eslint-disable-next-line valid-jsdoc

/**
 * @module js/saveActionFlowService
 */
import app from 'app';
import _ from 'lodash';
import viewModelCacheSvc from 'js/viewModelCacheService';
import appCtxSvc from 'js/appCtxService';
import nodeDefSvc from 'js/nodeDefinitionService';
import messagingSvc from 'js/messagingService';
import graphQLSvc from 'js/graphQLService';
import eventBus from 'js/eventBus';
import leavePlaceService from 'js/leavePlace.service';
import AwPromiseService from 'js/awPromiseService';
import editHdlrService from 'js/editHandlerService';
import localeSvc from 'js/localeService';
import iconSvc from 'js/iconService';
import graphStyleUtils from 'js/graphStyleUtils';
import actionBuilderUtils from 'js/actionBuilderUtils';
import validateFlowSvc from 'js/validateFlowService';
import actionPropertiesSvc from 'js/actionPropertiesService';

/**
 * public API
 */
let exports = {};

/**
 * Setup to map labels to local names.
 */
var localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.invalidJSONErrorMessage', true ).then( result =>  localeMap.invalidJSONErrorMessage = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.viewmodelUpdated', true ).then( result => localeMap.viewmodelUpdated = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.invalidConnection', true ).then( result => localeMap.invalidConnection = result );
    localeSvc.getLocalizedTextFromKey( 'UIMessages.successInfo', true ).then( result => localeMap.success = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.failure', true ).then( result => localeMap.failure = result );
    localeSvc.getLocalizedTextFromKey( 'BuilderMessages.userNotAuthorizedError', true ).then( result => localeMap.userNotAuthorizedError = result );
    localeSvc.getLocalizedTextFromKey( 'BuilderMessages.unableToSaveError', true ).then( result => localeMap.unableToSaveError = result );
};

let onEvent = 'onEvent';
let success = 'success';

let messageRegex = /^(showInfoMessage|showWarningMessage|showErrorMessage)$/;
let messageAndOpRegex = /^(start|end|onEvent|showInfoMessage|showWarningMessage|showErrorMessage)$/;

let _isUnsavedChangesPopupOpen = false;

/**
 * Handle action source node
 *
 * @param {Object} srcData - source node data
 * @param {Object} tgtData - target node data
 * @param {Object} edgeData - edge data
 * @param {Boolean} deleteSuccess - Flag to determine whether to delete success events
 */
var _handleActionSourceNode = function( srcData, tgtData, edgeData, deleteSuccess ) {
    var currentModel = appCtxSvc.ctx.graph.graphModel;
    var nodeModel = currentModel.dataModel.nodeModels[ srcData.id ];
    if( nodeModel.modelObject ) {
        if( !nodeModel.modelObject.actionDef ) {
            nodeModel.modelObject.actionDef = {};
        }

        if( !nodeModel.modelObject.actionDef.events ) {
            nodeModel.modelObject.actionDef.events = {};
        }

        if( edgeData.category === success ) {
            if( !nodeModel.modelObject.actionDef.events.success ) {
                nodeModel.modelObject.actionDef.events.success = [];
            }
            nodeModel.modelObject.actionDef.events.success.push( {
                name: tgtData.modelObject.name
            } );
        } else {
            if( deleteSuccess ) {
                let indx = _.findIndex( nodeModel.modelObject.actionDef.events.success, function( o ) { return o.name === tgtData.modelObject.name; } );
                if( indx !== -1 ) {
                    nodeModel.modelObject.actionDef.events.success.splice( indx );
                }
            }

            if( !nodeModel.modelObject.actionDef.events.failure ) {
                nodeModel.modelObject.actionDef.events.failure = [];
            }
            nodeModel.modelObject.actionDef.events.failure.push( {
                name: tgtData.modelObject.name
            } );
        }
    }
};

/**
 *
 * @param {Object} nodeModel node model for event or action message node
 * @param {Object} graphModel graph  model
 *
 * @return {Object} respective action node model
 */
export let getRespectiveAction = function( nodeModel, graphModel ) {
    if( !nodeModel.degrees && !nodeModel.modelObject ) {
        return null;
    }

    // Ensure that this event/actionMessage is associated to an action
    var srcActionEdgeId = nodeModel.degrees ? nodeModel.degrees.in[ 0 ] : nodeModel.modelObject.degrees.in[ 0 ];
    var srcActionEdgeModel = graphModel.dataModel.edgeModels[ srcActionEdgeId ];

    if( srcActionEdgeModel && srcActionEdgeModel.sourceNode ) {
        var actionNodeModel = srcActionEdgeModel.sourceNode;
        return {
            actionNodeModel: actionNodeModel,
            type: srcActionEdgeModel.category
        };
    }

    return null;
};

/**
 * Update action events
 *
 * @param {Object} nodeModel node model for event or action message node
 * @param {Object} graphModel graph  model
 * @param {Boolean} existing modify existing or create new
 * @param {Object} data declarative view model
 */
var _updateActionEvents = function( nodeModel, graphModel, existing, data ) {
    var actionObj = exports.getRespectiveAction( nodeModel, graphModel );
    if( !actionObj ) {
        return;
    }

    var actionNodeModel = actionObj.actionNodeModel;

    if( actionNodeModel ) {
        if( !actionNodeModel.modelObject.actionDef.events ) {
            actionNodeModel.modelObject.actionDef.events = {};
        }

        if( actionObj.type === success ) {
            if( !actionNodeModel.modelObject.actionDef.events.success ) {
                actionNodeModel.modelObject.actionDef.events.success = [];
            }

            var eventObj = { name: nodeModel.modelObject.name };

            if( existing ) {
                var indx = _.findIndex( actionNodeModel.modelObject.actionDef.events.success, function( o ) { return o.name === eventObj.name; } );
                if( indx !== -1 ) {
                    actionNodeModel.modelObject.actionDef.events.success[ indx ].name = data.eventName.dbValue;
                    actionNodeModel.modelObject.actionDef.events.success[ indx ].condition = data.condition.dbValue;
                }
            } else {
                if( _.findIndex( actionNodeModel.modelObject.actionDef.events.success, function( o ) { return o.name === eventObj.name; } ) === -1 ) {
                    actionNodeModel.modelObject.actionDef.events.success.push( eventObj );
                }
            }
        } else {
            if( !actionNodeModel.modelObject.actionDef.events.failure ) {
                actionNodeModel.modelObject.actionDef.events.failure = [];
            }

            var eventFailObj = { name: nodeModel.modelObject.name };

            if( existing ) {
                var failIndx = _.findIndex( actionNodeModel.modelObject.actionDef.events.failure, function( o ) { return o.name === eventFailObj.name; } );
                if( failIndx !== -1 ) {
                    actionNodeModel.modelObject.actionDef.events.failure[ failIndx ].name = data.eventName.dbValue;
                    actionNodeModel.modelObject.actionDef.events.failure[ failIndx ].condition = data.condition.dbValue;
                }
            } else {
                if( _.findIndex( actionNodeModel.modelObject.actionDef.events.failure, function( o ) { return o.name === eventFailObj.name; } ) === -1 ) {
                    actionNodeModel.modelObject.actionDef.events.failure.push( eventFailObj );
                }
            }
        }
    }
};

/**
 * Handle event source node
 *
 * @param {Object} srcData - source node data
 * @param {Object} tgtData - target node data
 */
var _handleEventSourceNode = function( srcData, tgtData ) {
    var currentModel = appCtxSvc.ctx.graph.graphModel;
    var dataModel = currentModel.dataModel;

    if( !dataModel.onEvent ) {
        dataModel.onEvent = [];
    }

    var onEventObj = {
        eventId: srcData.modelObject.name,
        action: tgtData.modelObject.name
    };

    var indx = _.findIndex( dataModel.onEvent, function( o ) { return o.eventId === onEventObj.eventId; } );
    if( indx === -1 ) {
        dataModel.onEvent.push( onEventObj );

        srcData.modelObject.eventDef = srcData.modelObject.eventDef ? srcData.modelObject.eventDef : {};
        srcData.modelObject.eventDef.action = tgtData.modelObject.name;
    } else {
        dataModel.onEvent[ indx ].action = tgtData.modelObject.name;

        srcData.modelObject.eventDef = srcData.modelObject.eventDef ? srcData.modelObject.eventDef : {};
        srcData.modelObject.eventDef.eventId = srcData.modelObject.name;
        srcData.modelObject.eventDef.action = tgtData.modelObject.name;
    }

    _updateActionEvents( srcData, currentModel );
};

/**
 * Update message definition properties
 *
 * @param {Object} ctx - application context object
 * @param {Object} data - declarative view model 'data' object
 * @param {Object} actionDef - action definition
 */
var _updateMessageProps = function( ctx, data, actionDef ) {
    actionDef.condition = data.condition.dbValue;
    actionDef.message = data.messageName.dbValue;

    var messageDef = ctx.graph.selected.model.modelObject.messageDef ? ctx.graph.selected.model.modelObject.messageDef : {};
    messageDef.messageTextParams = data.messageTextParams.dbValue;
    messageDef.messageKey = data.messageKey.dbValue;
    messageDef.messageData = data.messageData.dbValue;
    messageDef.expression = data.messageExpression.dbValue;
    if( data.messageText.selectedI18nKeyValue && data.messageText.selectedI18nKeyValue.length > 0 ) {
        let i18nKey = data.messageText.selectedI18nKeyValue[ 0 ].i18nKey;
        messageDef.messageText = '{{i18n.' + i18nKey + '}}';
        ctx.graph.graphModel.dataModel.i18n = {};
        ctx.graph.graphModel.dataModel.i18n[ i18nKey ] = [ data.messageText.selectedI18nKeyValue[ 0 ].i18nSource ];
    } else {
        messageDef.messageText = data.messageText.dbValue;
    }

    if( messageDef.i18nSource ) {
        delete messageDef.i18nSource;
    }
    if( !ctx.graph.graphModel.dataModel.messages ) {
        ctx.graph.graphModel.dataModel.messages = {};
    }

    ctx.graph.graphModel.dataModel.messages[ actionDef.message ] = messageDef;
};

/**
 * Update event properties
 *
 * @param {Object} ctx - application context object
 * @param {Object} data - declarative view model
 * @param {Object} actionDef - action definition
 */
var _updateEventProps = function( ctx, data, actionDef ) {
    actionDef.name = data.eventName.dbValue;
    actionDef.condition = data.condition.dbValue;

    var currentModel = ctx.graph.graphModel;
    currentModel.dataModel.onEvent = currentModel.dataModel.onEvent ? currentModel.dataModel.onEvent : [];

    var onEventDefs = currentModel.dataModel.onEvent.filter( function( event ) {
        if( event.eventId === actionDef.name ) {
            return event;
        }
        return 0;
    } );

    var srcData = ctx.graph.selected.model;

    if( onEventDefs.length > 0 ) {
        onEventDefs[ 0 ].eventId = data.eventName.dbValue;
        onEventDefs[ 0 ].action = data.action.dbValue;

        _updateActionEvents( srcData, currentModel, false, data );
    } else {
        currentModel.dataModel.onEvent.push( {
            eventId: data.eventName.dbValue,
            action: data.action.dbValue
        } );

        _updateActionEvents( srcData, currentModel, true, data );
    }
};

/**
 * Get action type
 *
 * @param {Object} ctx - application context object
 * @param {Object} data - declarative view model
 * @returns {String} return action type
 */
var _getActionType = function( ctx, data ) {
    var type;

    if( data.registrationData && data.registrationData.actionType ) {
        type = data.registrationData.actionType;
    } else if( data.actionType && data.actionType.dbValue ) {
        type = data.actionType.dbValue;
    } else {
        if ( ctx.graph.selected.model.nodeObject ) {
            type = ctx.graph.selected.model.nodeObject.category ? ctx.graph.selected.model.nodeObject.category : ctx.graph.selected.model.nodeObject.type;
        } else if ( ctx.graph.selected.model.edgeObject ) {
            type = 'edge';
        }
    }
    return type;
};


/**
 * Update graph model with properties provided in the details panel
 *
 * @param {Object} ctx - global context object
 * @param {Object} data - declarative view model
 * @param {Object} type - action type
 * @param {Object} actionDef - action definition in graph model
 * @param {Object} selModelObject - selected model object in graph model
 * @param {Object} selNodeObject - selected node object in graph model
 */
export let updateAllActionTypeProps = function( ctx, data, type, actionDef, selModelObject, selNodeObject ) {
    if( data.actionProps ) {
        actionPropertiesSvc.updateActionTypeProps( ctx, data, type, actionDef, selModelObject, selNodeObject );
    }

    // Update action name
    if( data.actionName && data.actionName.dbValue ) {
        ctx.graph.graphModel.graphControl.graph.updateNodeBinding( selNodeObject, { Name: data.actionName.dbValue } );
        selModelObject.name = data.actionName.dbValue;
    }

    switch ( type ) {
        case 'showInfoMessage':
        case 'showWarningMessage':
        case 'showErrorMessage':
            if( selModelObject.actionDef.actionType ) {
                actionDef.inputData = {
                    message: data.actionTypeMessageText.dbValue
                };
            } else {
                _updateMessageProps( ctx, data, actionDef );
            }
            break;
        case 'onEvent':
            _updateEventProps( ctx, data, actionDef );

            if( selModelObject ) {
                selModelObject.name = data.eventName.dbValue;
                ctx.graph.graphModel.graphControl.graph.updateNodeBinding( selNodeObject, { Name: data.eventName.dbValue } );
            }
            break;
        case 'edge':
            if( selModelObject ) {
                selModelObject.type = data.connectionType.dbValue;
                selModelObject.category = data.connectionType.dbValue;
                selModelObject.actionDef.actionType = data.connectionType.dbValue;
                selModelObject.displayName =  data.connectionType.dbValue === 'success' ? localeMap.success : localeMap.failure;

                if ( selModelObject.category === 'success' ) {
                    ctx.graph.graphModel.graphControl.graph.setEdgeStyle( selNodeObject, actionBuilderUtils.successStyle );
                    exports.updateGraphModel( selNodeObject.model.sourceNode, selNodeObject.model.targetNode, selNodeObject, true );
                } else {
                    ctx.graph.graphModel.graphControl.graph.setEdgeStyle( selNodeObject, actionBuilderUtils.failureStyle );
                    exports.updateGraphModel( selNodeObject.model.sourceNode, selNodeObject.model.targetNode, selNodeObject, true );
                }
                // clear edge selection
                ctx.graph.graphModel.graphControl.setSelected( null, false );
            }
            break;
        default:
            break;
    }
};

/**
 * Update graph model with properties provided in the details panel
 *
 * @param {Object} ctx - global context object
 * @param {Object} data - declarative view model
 * @param {Boolean} changeActionType - change action type scenario
 */
export let updateGraphModelWithActionProps = function( ctx, data, changeActionType ) {
    var selModelObject = ctx.graph.selected.model.modelObject;
    var selNodeObject = ctx.graph.selected.model.graphItem;
    var actionDef = selModelObject.actionDef;

    if( data.registrationData ) {
        var newRegistrationData = {};
        newRegistrationData.actionType = data.eventData.uid ? data.eventData.uid : data.registrationData.actionType;
        //Preserve events and messages
        if( data.registrationData.events ) {
            newRegistrationData.events = data.registrationData.events;
        }
        if( data.registrationData.actionMessages ) {
            newRegistrationData.actionMessages = data.registrationData.actionMessages;
        }
        data.registrationData = newRegistrationData;
        actionDef = newRegistrationData;

        if( changeActionType ) {
            eventBus.publish( 'actionBuilder.refreshActionProperties' );
        }
    }

    var type = _getActionType( ctx, data );
    if( !changeActionType ) {
        updateAllActionTypeProps( ctx, data, type, actionDef, selModelObject, selNodeObject );
    }

    ctx.graph.selected.model.modelObject.actionDef = actionDef;
    if( actionDef.actionType ) {
        ctx.graph.selected.model.modelObject.type = actionDef.actionType;
        ctx.graph.selected.model.category = actionDef.actionType;
    }

    if( selModelObject && type !== 'onEvent' ) {
        nodeDefSvc.getNodeDefinition().then( function( nodeDefs ) {
            var objectActivities = nodeDefs.objectActivities;
            if( objectActivities[ type ] ) {
                var imageUrl = iconSvc.getTypeIconFileUrl( objectActivities[ type ].icon + '24.svg' );
                var updateNodeType = {};
                updateNodeType.thumbnail_image = graphStyleUtils.getSVGImageTag( imageUrl );
                ctx.graph.graphModel.graphControl.graph.updateNodeBinding( selNodeObject, updateNodeType );
            }
        } );
    }
    exports.saveActionFlow( ctx, false );
};

/**
 * Update graph's selected object action type
 *
 * @param {Object} ctx - global context object
 * @param {Object} data - declarative view model
 */
export let updateSelectedGraphModelActionType = function( ctx, data ) {
    ctx.graph.selected.model.nodeObject.category = data.dataProviders.getObjectActivitiesProvider.selectedObjects[ 0 ].uid;
    ctx.graph.selected.model.modelObject.actionDef.actionType = data.dataProviders.getObjectActivitiesProvider.selectedObjects[ 0 ].uid;
    eventBus.publish( 'actionBuilder.refreshActivityProperty', {
        viewId: data.dataProviders.getObjectActivitiesProvider.selectedObjects[ 0 ].uid
    } );
};

/**
 * Update model
 *
 * @param {Object} srcData - source node data
 * @param {Object} tgtData - target node data
 * @param {Object} nodeDefs - node definitions
 * @param {Object} edgeData - edge data
 * @param {Object} deleteSuccess - Flag which determines whether to delete the event from success block
 */
export let updateModel = function( srcData, tgtData, nodeDefs, edgeData, deleteSuccess ) {
    var operators = nodeDefs.operators;
    var actionTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
        return validateFlowSvc.validActionTypes( key );
    } );
    var messageTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
        return validateFlowSvc.validMessageTypes( key );
    } );

    // if the source node is one of action types
    if( _.has( actionTypes, srcData.category ) ) {
        if( /^(onEvent)$/.test( tgtData.category ) || _.has( messageTypes, tgtData.category ) ) {
            _handleActionSourceNode( srcData, tgtData, edgeData, deleteSuccess );
        }
    } else if( _.has( operators, srcData.category ) ) {
        if( srcData.category === onEvent && ( _.has( messageTypes, tgtData.category )
              || _.has( actionTypes, tgtData.category ) ) ) {
            _handleEventSourceNode( srcData, tgtData );
        }
    }
};

/**
 * Update graph model
 *
 * @param {Object} srcData - source node data
 * @param {Object} tgtData - target node data
 * @param {Object} edge - edge data
 * @param {Boolean} deleteSuccess - Flag which determines whether to delete the event from success block
 *
 * @returns {Promise} Promise
 */
export let updateGraphModel = function( srcData, tgtData, edge, deleteSuccess ) {
    return nodeDefSvc.getNodeDefinition().then( function( nodeDefs ) {
        var isValid = validateFlowSvc.validateEdge( srcData, tgtData, nodeDefs );
        if( isValid ) {
            let messageTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
                return validateFlowSvc.validMessageTypes( key );
            } );
            if( srcData.category === 'start' && _.has( messageTypes, tgtData.category ) ) {
                var currentModel = appCtxSvc.ctx.graph.graphModel;
                var nodeModel = currentModel.dataModel.nodeModels[ tgtData.id ];
                if( nodeModel.modelObject ) {
                    if( !nodeModel.modelObject.actionDef ) {
                        nodeModel.modelObject.actionDef = {};
                    }
                    nodeModel.modelObject.actionDef.actionType = tgtData.category;
                }
            }

            let edgeData = edge.edgeData ? edge.edgeData : edge.model.modelObject;
            exports.updateModel( srcData, tgtData, nodeDefs, edgeData, deleteSuccess );
            exports.saveActionFlow( appCtxSvc.ctx, false );
        } else {
            // Remove invalid edge connection
            var graphModel = appCtxSvc.ctx.graph.graphModel;
            var graph = graphModel.graphControl.graph;
            graph.removeEdges( [ edge ] );

            var layout = graphModel.graphControl.layout;
            layout.removeEdge( edge );
        }
    } );
};

/**
 * Build combined query so that respective actions/events/messages can be saved to microservice
 *
 * @param {Array} tasks - array of actions which are modified
 * @param {Array} events - array of onEvent which are modified
 * @param {Array} messages - array of messages which are modified
 * @param {Array} deletedEvents - array of onEvent which are deleted
 * @param {Array} conditions - array of conditions which are modified
 *
 * @returns {Promise} Promise
 */
let _saveCommandActionFlow = function( tasks, events, messages, deletedEvents, conditions ) {
    let deferred = AwPromiseService.instance.defer();

    let queryString = '';
    let queryVarString = '';
    let taskQueryVarString = '';
    let eventQueryVarString = '';
    let messageQueryVarString = '';
    let delEventQueryVarString = '';
    let condQueryVarString = '';

    let variables = {};
    let query = {};

    let definitionString = '}){definition}';

    let lastKey = _.findLastKey( tasks );
    for( var key in tasks ) {
        // Replace '.' with '_' in variable key to avoid parsing errors
        let keyId = ( key + '_id' ).replace( /\s/g, '' ).replace( /\./g, '_' );
        let keyDef = ( key + '_def' ).replace( /\s/g, '' ).replace( /\./g, '_' );

        variables[ keyId ] = key;
        variables[ keyDef ] = tasks[ key ];
        queryString += key + ': updateCommandAction(input:{id:$' + keyId + ',definition:$' + keyDef + definitionString;
        taskQueryVarString += '$' + keyId + ':ID!, $' + keyDef + ':JSON!';

        if( key !== lastKey ) {
            taskQueryVarString += ',';
        }
    }

    let lastEventKey = _.findLastKey( events );
    for( var eventKey in events ) {
        // Replace '.' with '_' in variable key to avoid parsing errors
        let eventKeyString = ( events[ eventKey ].eventId + eventKey.toString() ).replace( /\s/g, '' ).replace( /\./g, '_' );
        let eventDef = ( eventKeyString + '_eventDef' ).replace( /\s/g, '' ).replace( /\./g, '_' );

        variables[ eventDef ] = events[ eventKey ];
        queryString += eventKeyString + ': updateOnEvent(input:{event:$' + eventDef + definitionString;
        eventQueryVarString += '$' + eventDef + ':JSON!';

        if( eventKey !== lastEventKey ) {
            eventQueryVarString += ',';
        }
    }

    let lastMsgKey = _.findLastKey( messages );
    for( var msgKey in messages ) {
        // Replace '.' with '_' in variable key to avoid parsing errors
        let msgKeyId = ( msgKey + '_id' ).replace( /\s/g, '' ).replace( /\./g, '_' );
        let msgKeyDef = ( msgKey + '_def' ).replace( /\s/g, '' ).replace( /\./g, '_' );

        variables[ msgKeyId ] = msgKey;
        variables[ msgKeyDef ] = messages[ msgKey ];
        queryString += msgKey + ': updateActionMessage(input:{id:$' + msgKeyId + ',definition:$' + msgKeyDef + definitionString;
        messageQueryVarString += '$' + msgKeyId + ':ID!, $' + msgKeyDef + ':JSON!';

        if( msgKey !== lastMsgKey ) {
            messageQueryVarString += ',';
        }
    }

    let lastDelEventKey = _.findLastKey( deletedEvents );
    for( var delEvtKey in deletedEvents ) {
        // Replace '.' with '_' in variable key to avoid parsing errors
        let eventKeyString = ( deletedEvents[ delEvtKey ].eventId + delEvtKey.toString() ).replace( /\s/g, '' ).replace( /\./g, '_' );
        let eventDef = ( eventKeyString + '_eventDef' ).replace( /\s/g, '' ).replace( /\./g, '_' );

        variables[ eventDef ] = deletedEvents[ delEvtKey ];
        queryString += eventKeyString + ': removeOnEvent(input:{event:$' + eventDef + definitionString;
        delEventQueryVarString += '$' + eventDef + ':JSON!';

        if( delEvtKey !== lastDelEventKey ) {
            delEventQueryVarString += ',';
        }
    }

    let lastCondKey = _.findLastKey( conditions );
    for( var condKey in conditions ) {
        // Replace '.' with '_' in variable key to avoid parsing errors
        let condKeyId = ( condKey + '_id' ).replace( /\s/g, '' ).replace( /\./g, '_' );
        let condDef = ( condKey + '_def' ).replace( /\s/g, '' ).replace( /\./g, '_' );

        variables[ condKeyId ] = condKey;
        variables[ condDef ] = conditions[ condKey ].expression;

        let isCondObject = false;
        if( _.isObject( conditions[ condKey ].expression ) ) {
            isCondObject = true;
        }

        if( isCondObject ) {
            queryString += condKeyId + ': updateCommandCondition(input:{id:$' + condKeyId + ',object:$' + condDef + '}){id expression{object}}';
            condQueryVarString += '$' + condKeyId + ':ID!, $' + condDef + ':JSON';
        } else {
            queryString += condKeyId + ': updateCommandCondition(input:{id:$' + condKeyId + ',string:$' + condDef + '}){id expression{string}}';
            condQueryVarString += '$' + condKeyId + ':ID!, $' + condDef + ':String';
        }

        if( condKey !== lastCondKey ) {
            condQueryVarString += ',';
        }
    }

    if( taskQueryVarString ) {
        queryVarString = taskQueryVarString + ',';
    }

    if( eventQueryVarString ) {
        queryVarString += eventQueryVarString + ',';
    }

    if( messageQueryVarString ) {
        queryVarString += messageQueryVarString;
    }

    if( delEventQueryVarString ) {
        queryVarString += delEventQueryVarString + ',';
    }

    if( condQueryVarString ) {
        queryVarString += condQueryVarString + ',';
    }

    query = {
        endPoint: 'graphql',
        request: {
            query: 'mutation(' + queryVarString + '){' + queryString + '}',
            variables: variables
        }
    };

    graphQLSvc.callGraphQL( query ).then( function( response ) {
        if( !response.errors ) {
            deferred.resolve( response );
        } else {
            // Handle error
        }
    } );

    return deferred.promise;
};

/**
 * Save action flow
 *
 * @param {Object} ctx - application context
 * @param {Boolean} persistentSave - if true then trigger server call to save the data to microservice.
 * @param {Object} commandContext - command context
 *
 * @returns {Promise} promise
 */
export let saveActionFlow = function( ctx, persistentSave, commandContext ) {
    var currentActions = {};
    var currentEvents = [];
    var currentMessages = {};
    var removeEvents = [];

    if( !ctx.graph && commandContext ) {
        currentActions = commandContext.actions;
        currentEvents = commandContext.onEvent ? commandContext.onEvent : [];
        currentMessages = commandContext.messages ? commandContext.messages : {};
        var currentConditions = commandContext.conditions ? commandContext.conditions : {};

        if( ctx.actionBuilderEditorInvalid ) {
            messagingSvc.showError( localeMap.invalidJSONErrorMessage );
            return undefined;
        }

        return _saveCommandActionFlow( currentActions, currentEvents, currentMessages, removeEvents, currentConditions ).then( function() {
            delete ctx.actionBuilderEditorIsDirty;
            delete ctx.actionBuilderEditorInvalid;

            messagingSvc.showInfo( localeMap.viewmodelUpdated );
            eventBus.publish( 'actionsList.notifyConfigChange' );
        } );
    }

    if( !persistentSave ) {
        ctx.graph.isDirty = true;
    } else {
        ctx.graph.isDirty = false;
    }

    var currentModel = ctx.graph.graphModel;

    for( var key in currentModel.dataModel.nodeModels ) {
        if( currentModel.dataModel.nodeModels[ key ] ) {
            var value = currentModel.dataModel.nodeModels[ key ];
            if( !messageAndOpRegex.test( value.category ) ) {
                currentActions[ value.modelObject.name ] = value.modelObject.actionDef;
            } else if( value.category === onEvent ) {
                currentEvents = currentModel.dataModel.onEvent;
            } else if( messageRegex.test( value.category ) ) {
                currentMessages = currentModel.dataModel.messages;

                if( value.modelObject && value.modelObject.actionDef && value.modelObject.actionDef.actionType ) {
                    currentActions[ value.modelObject.name ] = value.modelObject.actionDef;
                }
            }
        }
    }

    if( currentModel.dataModel.deletedOnEvent && currentModel.dataModel.deletedOnEvent.length > 0 ) {
        removeEvents = currentModel.dataModel.deletedOnEvent;
    }

    if( ctx.state.params.viewModelId ) {
        return viewModelCacheSvc.getViewModel( ctx.state.params.viewModelId ).then( function( viewModel ) {
            if( !viewModel.onEvent ) {
                viewModel.onEvent = [];
            }

            if( !viewModel.messages ) {
                viewModel.messages = {};
            }

            if( !viewModel.i18n ) {
                viewModel.i18n = {};
            }

            /**
             * Merge graphModel into ViewModel
             */
            _.merge( viewModel.actions, currentActions );
            viewModel.onEvent = _.union( viewModel.onEvent, currentEvents );
            _.merge( viewModel.messages, currentMessages );
            _.merge( viewModel.i18n, currentModel.dataModel.i18n );

            /**
             * fit for purpose solution to add dataParseDefinitions (Mapping)
             */
            _.set( viewModel, 'dataParseDefinitions.search', {
                thumbnailURL: '{{response.thumbnailURL}}',
                type: '{{response.type}}',
                typeHierarchy: '{{response.typeHierarchy}}',
                hasThumbnail: '{{response.hasThumbnail}}',
                identifier: '{{response.uid}}',
                props: '{{response.props}}'
            } );

            _.set( viewModel, 'dataProviders.wysTableDataProvider.response', '{{data.searchResults}}' );

            /**
             * Update ViewModel
             */
            return viewModelCacheSvc.updateViewModel( ctx.state.params.viewModelId, viewModel, persistentSave ).then( function() {
                if( persistentSave ) {
                    viewModelCacheSvc.deleteViewModelFromLocalStorage( ctx.state.params.viewModelId );
                    messagingSvc.showInfo( localeMap.viewmodelUpdated );
                }
            } ).catch( function( error ) {
                if( error && error.status === 403 ) {
                    let notAuthorizedMsg = messagingSvc.applyMessageParamsWithoutContext( localeMap.userNotAuthorizedError, [ ctx.state.params.viewModelId ] );
                    messagingSvc.showError( notAuthorizedMsg );
                } else {
                    let errorMsg = messagingSvc.applyMessageParamsWithoutContext( localeMap.unableToSaveError, [ ctx.state.params.viewModelId ] );
                    messagingSvc.showError( errorMsg );
                }
            } );
        } );
    } else if( !ctx.state.params.viewModelId && persistentSave ) {
        return _saveCommandActionFlow( currentActions, currentEvents, currentMessages, removeEvents ).then( function() {
            messagingSvc.showInfo( localeMap.viewmodelUpdated );
            eventBus.publish( 'actionsList.notifyConfigChange' );
        } );
    }
    return undefined;
};

/**
 * Discard/Save unsaved changes
 *
 * @param {Objec} data - declarative view model
 */
export let unsavedChangesAction = function( data ) {
    _isUnsavedChangesPopupOpen = false;
    if( data.action === 'discard' || data.action === 'save' ) {
        if( data.action === 'discard' ) {
            appCtxSvc.unRegisterCtx( 'actionBuilderEditorIsDirty' );
        }
        // Internal event should not be used outside
        eventBus.publish( 'actionBuilder.leavePlaceNavigation', { success: true } );
    }
};

/**
 * Register leave place handler
 *
 * @returns {Promise} deferred - Promise
 */
export let registerLeaveHandler = function() {
    var leaveHandler = {};

    leaveHandler.leaveConfirmation = function( callback ) {
        var deferred = AwPromiseService.instance.defer();
        var currentGraph = appCtxSvc.getCtx( 'graph' );
        if( currentGraph && currentGraph.isDirty || appCtxSvc.ctx.actionBuilderEditorIsDirty ) {
            // if popup is already open
            if( _isUnsavedChangesPopupOpen ) {
                var subscriptionId = eventBus.subscribe( 'actionBuilder.leavePlaceNavigation', function( data ) {
                    if( _.isFunction( callback ) ) {
                        callback();
                    }

                    eventBus.unsubscribe( subscriptionId );
                    editHdlrService.removeEditHandler( 'NONE' );
                    if( data.success ) {
                        return deferred.resolve();
                    }
                    return deferred.reject();
                } );

                return deferred.promise;
            }
            _isUnsavedChangesPopupOpen = true;

            let evtData = { view: 'Graph' };
            if( appCtxSvc.ctx.actionBuilderEditorIsDirty ) {
                evtData = { view: 'Editor' };
            }

            eventBus.publish( 'actionBuilder.confirmLeave', evtData );
            var subscriptionId2 = eventBus.subscribe( 'actionBuilder.leavePlaceNavigation', function( data ) {
                if( _.isFunction( callback ) ) {
                    callback();
                }

                eventBus.unsubscribe( subscriptionId2 );
                editHdlrService.removeEditHandler( 'NONE' );
                if( data.success ) {
                    return deferred.resolve();
                }
                return deferred.reject();
            } );
            return deferred.promise;
        }

        if( _.isFunction( callback ) ) {
            callback();
        }
        deferred.resolve();

        return deferred.promise;
    };
    // de-register any existing handler.
    leavePlaceService.registerLeaveHandler( null );
    // register again
    leavePlaceService.registerLeaveHandler( {
        okToLeave: function( targetNavDetails ) {
            return leaveHandler.leaveConfirmation( targetNavDetails );
        }
    } );

    return leaveHandler;
};

/**
 * Unregister leave place handler
 */
export let unregisterHandler = function() {
    // de-register any existing handler.
    leavePlaceService.registerLeaveHandler( null );
};

exports = {
    updateGraphModel,
    updateGraphModelWithActionProps,
    updateModel,
    saveActionFlow,
    getRespectiveAction,
    registerLeaveHandler,
    unregisterHandler,
    unsavedChangesAction,
    loadConfiguration,
    updateSelectedGraphModelActionType
};
export default exports;

loadConfiguration();

/**
 * This factory creates a service and returns exports
 *
 * @member saveActionFlowService
 */
app.factory( 'saveActionFlowService', () => exports );
