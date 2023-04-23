// Copyright (c) 2020 Siemens

/**
 * @module js/actionParserService
 */
import app from 'app';
import _ from 'lodash';
import localeSvc from 'js/localeService';
import nodeDefSvc from 'js/nodeDefinitionService';
import viewModelCacheSvc from 'js/viewModelCacheService';
import commandConfigUtils from 'js/commandConfigUtils.service';
import AwPromiseService from 'js/awPromiseService';

let activities;
let operators;
let abMsgs = {};

var exports = {};
var CONST = {
    startEdge: 'startEdge',
    endEdge: 'endEdge',
    startNode: 'startNode',
    endNode: 'endNode',

    evtBSplit: '_eventBSplitNode',
    evtBSplitEdge: '_eventBSplitEdge',

    evtExSplitSuc: '_eventExSplitSuccess',
    evtExSplitFail: '_eventExSplitFailure',
    evtExSplitSEdge: '_ExSplitSucEventEdge',
    evtExSplitFEdge: '_ExSplitFailEventEdge',

    evtSucEndEdge: '_eventSuccessEndEdge',
    evtFailEndEdge: '_eventFailureEndEdge',

    evtAction: '_eventAction',

    aMsgsBSplit: '_actionMessagesBSplitNode',
    aMsgsExSplitSuc: '_actionMessagesExSplitSuccess',
    aMsgsExSplitFail: '_actionMessagesExSplitFailure',

    aMsgSuc: '_actionMessageSuccess',
    aMsgFail: '_actionMessageFailure',

    aMsgsBSplitEdge: '_actionMessagesBinarySplitEdge',
    aMsgsExSplitSEdge: '_actionMsgsExSplitSucEdge',
    aMsgsExSplitFEdge: '_actionMsgsExSplitFailEdge',
    amSucEndEdge: '_actionMessageSuccessEndEdge',
    amFailEndEdge: '_actionMessageFailureEndEdge',

    aEndEdge: 'actionEndEdge'
};

/**
 * Build node object
 *
 * @param {String} type - node type
 * @param {String} id - node ID
 * @param {String} title - node title
 * @param {Array} inEdges - array of inEdges for this node
 * @param {Array} outEdges - array of outEdges for this node
 * @param {Object} additionalProps - additional properties
 *
 * @returns {Object} node object
 */
var _buildNode = function( type, id, title, inEdges, outEdges, additionalProps ) {
    var node = {
        id: id,
        name: title,
        type: type,
        displayInfos: [ 'Name\\:' + title, 'ID\\:' + title ],
        degrees: {
            in: inEdges,
            out: outEdges
        }
    };

    if( additionalProps ) {
        node.actionDef = additionalProps.definition;

        if( activities[ type ] ) {
            node.propsView = activities[ type ].propsView;
        } else if( operators[ type ] ) {
            node.propsView = operators[ type ].propsView;
        }

        node.messageDef = additionalProps.messageDef;
        node.eventDef = additionalProps.eventDef;

        if( additionalProps.type ) {
            node.nodeType = additionalProps.type;
            node.displayInfos.push( 'nodeType\\:' + node.nodeType );
        }
    }

    return node;
};

/**
 * Build edge object
 *
 * @param {String} id - edge ID
 * @param {String} label - edge Label
 * @param {String} startNodeId - start node ID for this edge
 * @param {String} endNodeId - end node ID for this edge
 * @param {Boolean} success - true for success false for failure
 *
 * @returns {Object} edge object
 */
var _buildEdge = function( id, label, startNodeId, endNodeId, success ) {
    return {
        id: id,
        type: success ? 'success' : 'failure',
        displayName: success ? abMsgs.success : abMsgs.failure,
        props: {
            startNodeId: startNodeId,
            endNodeId: endNodeId,
            startLocation: 'RIGHT',
            endLocation: 'LEFT'
        },
        propsView: 'connectionProperties',
        actionDef: {
            actionType: success ? 'success' : 'failure'
        }
    };
};

/**
 * Retreive end node if its created already
 *
 * @param {Array} nodes - array of nodes
 * @returns {Object} end node if exists or null
 */
var _retrieveEndNode = function( nodes ) {
    for( var index in nodes ) {
        if( nodes[ index ] && nodes[ index ].id === CONST.endNode ) {
            return nodes[ index ];
        }
    }

    return null;
};

/**
 * Returns flag to determine whether end node is created
 *
 * @param {Array} nodes - array of nodes
 * @returns {Boolean} TRUE if end node is created
 */
var _isEndNodeCreated = function( nodes ) {
    var endNodeCreated = false;
    for( var index in nodes ) {
        if( nodes[ index ] && nodes[ index ].id === CONST.endNode ) {
            endNodeCreated = true;
        }
    }

    return endNodeCreated;
};

/**
 * Get event definition for given event
 *
 * @param {Object} event - event object
 * @param {Object} actionFlow - action flow object
 *
 * @returns {Array} flow event actions array
 */
var _getEventDefinition = function( event, actionFlow ) {
    return actionFlow.onEvent.filter( obj => {
        if( obj.eventId === event.name ) {
            return obj;
        }
        return 0;
    } );
};

/**
 * Handle events success
 *
 * @param {Object} event - event object
 * @param {Object} graphData - graph data
 * @param {Object} actionFlow - action flow object
 *
 * @returns {Array} flow event actions array
 */
var _parseEventActionChain = function( event, graphData, actionFlow ) {
    var flowEvtActions = _getEventDefinition( event, actionFlow );

    _.forEach( flowEvtActions, function( flowEvt ) {
        var flowAction = actionFlow.actions[ flowEvt.action ];

        // EDGE from (Event node -> Chain Action Node)
        graphData.edges.push( _buildEdge( event.name + '_' + flowEvt.action, event.name, operators.onEvent.id + '_' + event.name, flowEvt.action, true ) );

        var index = _.findIndex( graphData.nodes, function( o ) { return o.id === operators.onEvent.id + '_' + event.name; } );
        if( index !== -1 ) {
            graphData.nodes[ index ].degrees.out.push( event.name + '_' + flowEvt.action );
        }

        _parseAction( flowEvt.action, flowAction, event.name + '_' + flowEvt.action, actionFlow, graphData );

        // EDGE from (Chain Action Node -> End Node)
        if( !_isEndNodeCreated( graphData.nodes ) ) {
            var actionMsgFailureEndEdge = _buildEdge( CONST.aEndEdge, abMsgs.end, flowEvt.action, CONST.endNode, true );
            var actionEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ CONST.aEndEdge ], [] );
            graphData.nodes.push( actionEndNode );
            graphData.edges.push( actionMsgFailureEndEdge );
        }
    } );

    return flowEvtActions;
};

/**
 * Handle events success
 *
 * @param {String} actionId - action id
 * @param {Object} events - events success object
 * @param {Object} graphData - graph data
 * @param {Object} actionFlow - action flow object
 * @param {Boolean} success - TRUE if success event
 */
var _handleMultipleEvents = function( actionId, events, graphData, actionFlow, success ) {
    var evtEndEdgeId = CONST.evtSucEndEdge;
    var evtStartEdgeId = CONST.evtBSplitEdge;

    let evtTypeStr = 'true';
    if( !success ) {
        evtTypeStr = 'false';
        evtEndEdgeId = CONST.evtFailEndEdge;
        evtStartEdgeId = CONST.evtExSplitFEdge;
    }

    _.forEach( events, function( evt ) {
        let nodeAlreadyCreated = false;
        let existNode = graphData.nodes.filter( function( node ) {
            if( node.id === operators.onEvent.id + '_' + evt.name ) {
                nodeAlreadyCreated = true;
                return nodeAlreadyCreated;
            }
            return false;
        } );

        // Event node
        let evtNode;
        let evtEdge;
        if( !nodeAlreadyCreated ) {
            evtNode = _buildNode( operators.onEvent.id, operators.onEvent.id + '_' + evt.name, evt.name,
            [ actionId + operators.onEvent.id + '_' + evt.name + '_' + evtTypeStr ], [], {
                definition: evt,
                eventDef: _getEventDefinition( evt, actionFlow )[ 0 ]
            } );
            graphData.nodes.push( evtNode );

            // EDGE from (action Node -> Event Node)
            evtEdge = _buildEdge( actionId + operators.onEvent.id + '_' + evt.name + '_' + evtTypeStr, evt.name, actionId, operators.onEvent.id + '_' + evt.name, success );
            graphData.edges.push( evtEdge );
        } else {
            existNode[0].degrees.in.push( actionId + operators.onEvent.id + '_' + evt.name + '_' + evtTypeStr );

            // EDGE from (action Node -> Event Node)
            evtEdge = _buildEdge( actionId + operators.onEvent.id + '_' + evt.name + '_' + evtTypeStr, evt.name, actionId, operators.onEvent.id + '_' + evt.name, success );
            graphData.edges.push( evtEdge );
        }

        // chain actions
        if( actionFlow ) {
            var flowEvtActions = _parseEventActionChain( evt, graphData, actionFlow );
            if( _.isEmpty( flowEvtActions ) ) {
                // EDGE from (Evet Node -> End Node)
                var evtEndEdge = _buildEdge( evt.name + evtEndEdgeId, abMsgs.end, operators.onEvent.id + '_' + evt.name, CONST.endNode, true );

                if( _isEndNodeCreated( graphData.nodes ) ) {
                    _retrieveEndNode( graphData.nodes ).degrees.in.push( actionId + evtStartEdgeId );
                } else {
                    // End Node
                    var evtEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ actionId + evtStartEdgeId ], [] );
                    graphData.nodes.push( evtEndNode );
                }
                graphData.edges.push( evtEndEdge );
            }
        }
    } );
};

/**
 * Handle events success
 *
 * @param {String} actionId - action id
 * @param {Object} success - events success object
 * @param {Object} graphData - graph data
 * @param {Object} actionFlow - action flow object
 */
var _handleEventSuccess = function( actionId, success, graphData, actionFlow ) {
    if( success && success.length > 0 ) {
        _handleMultipleEvents( actionId, success, graphData, actionFlow, true );
    }
};

/**
 * Handle events failure
 *
 * @param {String} actionId - action id
 * @param {Object} failure - events failure object
 * @param {Object} graphData - graph data
 * @param {Object} actionFlow - action flow object
 */
var _handleEventFailure = function( actionId, failure, graphData, actionFlow ) {
    if( failure && failure.length > 0 ) {
        _handleMultipleEvents( actionId, failure, graphData, actionFlow, false );
    }
};

/**
 * Handle action messages success
 *
 * @param {String} actionId - action id
 * @param {Object} actionMessages - action messages success object
 * @param {Object} graphData - graph data
 * @param {Boolean} success - TRUE if success event
 * @param {Boolean} messageData - messages definition
 * @param {Object} actionFlow - action flow
 */
var _handleMultipleActionMessages = function( actionId, actionMessages, graphData, success, messageData, actionFlow ) {
    var aMsgEndEdgeId = CONST.amSucEndEdge;
    var aMsgStartEdgeId = CONST.aMsgsExSplitSEdge;

    if( !success ) {
        aMsgEndEdgeId = CONST.amFailEndEdge;
        aMsgStartEdgeId = CONST.aMsgsExSplitFEdge;
    }

    _.forEach( actionMessages, function( actionMsg ) {
        var messageId = activities.showInfoMessage.id;
        if( messageData && messageData[ actionMsg.message ] ) {
            if( messageData[ actionMsg.message ].messageType === 'WARNING' ) {
                messageId = activities.showWarningMessage.id;
                // Parse messageData to see if any other actions are triggered for buttons
                if( messageData[ actionMsg.message ].navigationOptions && messageData[ actionMsg.message ].navigationOptions.length > 0 ) {
                    _.forEach( messageData[ actionMsg.message ].navigationOptions, function( option ) {
                        if( option.action ) {
                            var msgChainEdge = _buildEdge( actionMsg.message + option.action, actionMsg.message, actionMsg.message, option.action, success );
                            graphData.edges.push( msgChainEdge );

                            _parseAction( option.action, actionFlow.actions[ option.action ], actionMsg.message + '_' + option.action, actionFlow, graphData );
                        }
                    } );
                }
            } else if( messageData[ actionMsg.message ].messageType === 'ERROR' ) {
                messageId = activities.showErrorMessage.id;
            }
        }

        // Message Node
        var actionMsgNode = _buildNode( messageId, actionMsg.message, actionMsg.message,
            [ actionMsg.message ], [ CONST.endEdge ], {
                definition: actionMsg,
                messageDef: messageData[ actionMsg.message ]
            } );
        // EDGE from (action node -> message node)
        var actionMsgEdge = _buildEdge( actionMsg.message, actionMsg.message, actionId, actionMsg.message, success );

        graphData.nodes.push( actionMsgNode );
        graphData.edges.push( actionMsgEdge );

        if( messageData[ actionMsg.message ].messageType !== 'WARNING' ) {
            // EDGE from (message Node -> End Node)
            var actionMsgEndEdge = _buildEdge( actionMsg.message + aMsgEndEdgeId, abMsgs.endEdge, actionMsg.message, CONST.endNode, true );

            if( _isEndNodeCreated( graphData.nodes ) ) {
                _retrieveEndNode( graphData.nodes ).degrees.in.push( aMsgStartEdgeId );
            } else {
                // End Node
                var actionMsgEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ aMsgStartEdgeId ], [] );
                graphData.nodes.push( actionMsgEndNode );
            }
            graphData.edges.push( actionMsgEndEdge );
        }
    } );
};

/**
 * Handle action messages success
 *
 * @param {String} actionId - action id
 * @param {Object} actionMessages - action messages success object
 * @param {Object} graphData - graph data
 * @param {Boolean} messageData - messages definition
 */
var _handleActionMessagesSuccess = function( actionId, actionMessages, graphData, messageData, actionFlow ) {
    if( actionMessages && actionMessages.length > 0 ) {
        _handleMultipleActionMessages( actionId, actionMessages, graphData, true, messageData, actionFlow );
    }
};

/**
 * Handle action messages failure
 *
 * @param {String} actionId - action id
 * @param {Object} actionMessages - action messages failure object
 * @param {Object} graphData - graph data
 * @param {Boolean} messageData - messages definition
 */
var _handleActionMessagesFailure = function( actionId, actionMessages, graphData, messageData, actionFlow ) {
    if( actionMessages && actionMessages.length > 0 ) {
        _handleMultipleActionMessages( actionId, actionMessages, graphData, false, messageData, actionFlow );
    }
};

/**
 * Parse action object to build graphData object
 *
 * @param {String} actionId - action id
 * @param {Object} actionDef - action definition object
 * @param {String} fromEdgeId - ID of from edge
 * @param {Object} actionFlow - action flow object
 *
 * @return {Object} object which contains graph data
 */
var _parseAction = function( actionId, actionDef, fromEdgeId, actionFlow, graphDataIn ) {
    var graphData = {
        nodes: [],
        edges: [],
        ports: []
    };

    if( graphDataIn ) {
        graphData = graphDataIn;
    }

    var fromEdge = fromEdgeId ? fromEdgeId : CONST.startEdge;
    var actionNode = _buildNode( actionDef.actionType, actionId, actionId, [ fromEdge ], [ actionId + CONST.evtBSplitEdge ], {
        definition: actionDef
    } );

    if( actionNode.type ) {
        graphData.nodes.push( actionNode );
    }

    if( actionDef ) {
        if( actionDef.events && !_.isEmpty( actionDef.events ) ) {
            _handleEventSuccess( actionId, actionDef.events.success, graphData, actionFlow );
            _handleEventFailure( actionId, actionDef.events.failure, graphData, actionFlow );
        }

        if( actionDef.actionMessages && !_.isEmpty( actionDef.actionMessages ) ) {
            _handleActionMessagesSuccess( actionId, actionDef.actionMessages.success, graphData, actionFlow.messages, actionFlow );
            _handleActionMessagesFailure( actionId, actionDef.actionMessages.failure, graphData, actionFlow.messages, actionFlow );
        }

        if( !actionDef.events && !actionDef.actionMessages ) {
            // EDGE from (action Node -> End Node)
            var actionEndEdge = _buildEdge( actionId + CONST.aEndEdge, abMsgs.end, actionId, CONST.endNode, true );
            if( _isEndNodeCreated( graphData.nodes ) ) {
                _retrieveEndNode( graphData.nodes ).degrees.in.push( CONST.aEndEdge );
            } else {
                // End Node
                var evtEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ CONST.aEndEdge ], [] );
                graphData.nodes.push( evtEndNode );
            }
            graphData.edges.push( actionEndEdge );
        }
    }

    return graphData;
};

/**
 * Retrieve graph data from response object
 *
 * @param {Object} response - response object
 * @return {Object} object which contains graph data
 */
export let getGraphDataFromResponse = function( response ) {
    if( !response || !response.data || !response.data.action ) {
        return undefined;
    }
    var action = response.data.action;
    var startEdge;
    var startNode;
    var graphData;
    var actionGraphData;
    var actionMsgFailureEndEdge;
    var actionEndNode;

    //Check to see if this is a stub action.
    if( action.flow.actions[ action.id ].actionType ) {
        action = response.data.action;

        startEdge = _buildEdge( CONST.startEdge, abMsgs.start, CONST.startNode, action.id, true );
        startNode = _buildNode( operators.start.id, CONST.startNode, abMsgs.start, [], [ CONST.startEdge ] );

        graphData = {
            nodes: [ startNode ],
            edges: [ startEdge ],
            ports: [],
            direction: 'out',
            rootNodes: [ CONST.startNode ]
        };

        actionGraphData = _parseAction( action.id, action.flow.actions[ action.id ], null, action.flow );

        graphData.nodes = _.concat( graphData.nodes, actionGraphData.nodes );
        graphData.edges = _.concat( graphData.edges, actionGraphData.edges );

        if( !_isEndNodeCreated( graphData.nodes ) ) {
            actionMsgFailureEndEdge = _buildEdge( CONST.aEndEdge, abMsgs.end, action.id, CONST.endNode, true );
            actionEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ CONST.aEndEdge ], [] );
            graphData.nodes.push( actionEndNode );
            graphData.edges.push( actionMsgFailureEndEdge );
        }
    } else {
        action = response.data.action;
        var targetEndID = CONST.endNode;
        var targetStartID = CONST.startNode;
        startEdge = _buildEdge( CONST.startEdge, abMsgs.start, CONST.startNode, targetEndID, true );
        startNode = _buildNode( operators.start.id, CONST.startNode, abMsgs.start, [], [ CONST.startEdge ] );
        graphData = {
            nodes: [ startNode ],
            edges: [ startEdge ],
            ports: [],
            direction: 'out',
            rootNodes: [ CONST.startNode ]
        };

        actionGraphData = _parseAction( action.id, action.flow.actions[ action.id ], null, action.flow );

        graphData.nodes = _.concat( graphData.nodes, actionGraphData.nodes );
        graphData.edges = _.concat( graphData.edges, actionGraphData.edges );

        if( !_isEndNodeCreated( graphData.nodes ) ) {
            if( action.flow.actions[ action.id ].type ) {
                actionMsgFailureEndEdge = _buildEdge( CONST.aEndEdge, abMsgs.end, targetStartID, CONST.endNode, true );
                graphData.edges.push( actionMsgFailureEndEdge );
            }
            actionEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ CONST.aEndEdge ], [] );
            graphData.nodes.push( actionEndNode );
        }
        graphData.nodes = _.concat( graphData.nodes, actionGraphData.nodes );
        graphData.edges = _.concat( graphData.edges, actionGraphData.edges );

        if( !_isEndNodeCreated( graphData.nodes ) ) {
            if( action.flow.actions[ action.id ].type ) {
                actionMsgFailureEndEdge = _buildEdge( CONST.aEndEdge, abMsgs.end, targetStartID, CONST.endNode, true );
                graphData.edges.push( actionMsgFailureEndEdge );
            }
            actionEndNode = _buildNode( operators.end.id, CONST.endNode, abMsgs.end, [ CONST.aEndEdge ], [] );
            graphData.nodes.push( actionEndNode );
        }
    }

    return graphData;
};

export let retriveGraphInfo = function( actionId, viewModelId ) {
    return viewModelCacheSvc.getViewModel( viewModelId ).then( function( viewModel ) {
        let optimizedViewModel = commandConfigUtils.getOptimizedViewModel( viewModel, [], [], actionId );
        return {
            data: {
                action: {
                    flow: {
                        actions: optimizedViewModel.actions,
                        messages: optimizedViewModel.messages,
                        onEvent: optimizedViewModel.onEvent ? optimizedViewModel.onEvent : []
                    },
                    id: actionId
                }
            }
        };
    } );
};

export let connectGraphData = function( selActionId, dropActionId, viewModelId, eventName ) {
    let selPromise = exports.retriveGraphInfo( selActionId, viewModelId );
    let dropPromise = exports.retriveGraphInfo( dropActionId, viewModelId );

    return AwPromiseService.instance.all( [ selPromise, dropPromise ] ).then( function( results ) {
        var onEventObj = {
            eventId: eventName,
            action: dropActionId
        };

        if( _.indexOf( results[ 0 ].data.action.flow.onEvent, onEventObj ) === -1 ) {
            results[ 0 ].data.action.flow.onEvent.push( onEventObj );
        }
        _.merge( results[ 0 ].data.action.flow, results[ 1 ].data.action.flow );

        return results[ 0 ];
    } );
};

let loadConfiguration = function() {
    let nodeDefsResponse = nodeDefSvc.getNodeDefinitionSync();
    activities = nodeDefsResponse.objectActivities;
    operators = nodeDefsResponse.operators;
    abMsgs.start = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.start' );
    abMsgs.end = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.end' );
    abMsgs.endEdge = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.endEdge' );
    abMsgs.succAbbr = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.succAbbr' );
    abMsgs.success = localeSvc.getLoadedTextFromKey( 'UIMessages.successInfo' );
    abMsgs.failAbbr = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.failAbbr' );
    abMsgs.failure = localeSvc.getLoadedTextFromKey( 'ActionBuilderMessages.failure' );
};

exports = {
    getGraphDataFromResponse,
    retriveGraphInfo,
    connectGraphData
};
export default exports;

loadConfiguration();

/**
 * This factory creates a service and returns exports
 *
 * @member actionParserService
 */
app.factory( 'actionParserService', () => exports );
