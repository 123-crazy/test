// Copyright (c) 2020 Siemens
/* eslint-disable-next-line valid-jsdoc*/

/**
 * Defines provider for commands from the View model definition
 *
 * @module js/commandConfigUtils.service
 */
import app from 'app';
import configurationService from 'js/configurationService';
import functional from 'js/functionalUtility.service';
import _ from 'lodash';
import logger from 'js/logger';

/**
 * Expand all of the string based conditions in the view model
 *
 * Dirty - modifies input
 *
 * @param {Object} viewModelJson View model json to modify
 */
var expandStringExpressions = function( viewModelJson ) {
    _.forEach( viewModelJson.conditions, function( condition ) {
        if( condition && _.isString( condition.expression ) ) {
            condition.expression = getRealExpression( condition.expression, viewModelJson );
        }
    } );
};

/**
 * Convert every placement that has "parentGroupID" into a placement with
 * a dynamically generated anchor based on parent
 *
 * Dirty - modifies input
 *
 * @param {Object} viewModelJson View model json to modify
 */
var addChildPlacements = function( viewModelJson ) {
    Object.keys( viewModelJson.commandPlacements ).forEach( function( k ) {
        var placement = viewModelJson.commandPlacements[ k ];
        if( placement.parentGroupId ) {
            viewModelJson.commandPlacements[ '$$' + k + placement.parentGroupId ] = {
                id: placement.id,
                priority: placement.priority,
                relativeTo: placement.relativeTo,
                uiAnchor: placement.parentGroupId
            };
        }
    } );
};

/**
 * Ensure the primary commandsViewModel has all of the expected properties
 *
 * Dirty - modifies input
 *
 * @param {Object} viewModelJson View model json to modify
 */
var ensureProps = function( viewModelJson ) {
    [ 'actions', 'commandHandlers', 'commandPlacements', 'commands', 'conditions', 'messages' ].forEach( function( k ) {
        viewModelJson[ k ] = viewModelJson[ k ] || {};
    } );
    [ 'onEvent' ].forEach( function( k ) {
        viewModelJson[ k ] = viewModelJson[ k ] || [];
    } );
};

/**
 * Convert "true" and "false" shortcuts into actual conditions
 *
 * Dirty - modifies input
 *
 * @param {Object} viewModelJson View model json to modify
 * @param {Object} commandHandlers Command handlers to modify
 */
export let updateShortConditions = function( viewModelJson, commandHandlers ) {
    var trueCondition = {
        condition: 'conditions.true'
    };
    var falseCondition = {
        condition: 'conditions.false'
    };
    _.forEach( commandHandlers, function( handler ) {
        [ 'activeWhen', 'visibleWhen', 'selectWhen', 'enableWhen' ].forEach( function( conditionKey ) {
            if( handler[ conditionKey ] === true ) {
                handler[ conditionKey ] = trueCondition;
            }
            if( handler[ conditionKey ] === false ) {
                handler[ conditionKey ] = falseCondition;
            }
        } );
    } );
    viewModelJson.conditions.true = {
        expression: 'true'
    };
    viewModelJson.conditions.false = {
        expression: 'false'
    };
};

/**
 * Get and pre process the commands view model from config service
 *
 * @returns {Promise<Object>} promise resolved with the commands view model (plain object)
 */
export let getCommandsViewModel = function() {
    return configurationService.getCfg( 'commandsViewModel' )
        .then( function( viewModelJson ) {
            expandStringExpressions( viewModelJson );
            addChildPlacements( viewModelJson );
            ensureProps( viewModelJson );
            updateShortConditions( viewModelJson, viewModelJson.commandHandlers );
            return viewModelJson;
        } );
};

/**
 * Get all matches of a regex in the given string
 *
 * @param {RegExp} re Regex to used
 * @param {String} s String to search
 * @returns {Array<String>} List of all matches
 */
var getAllMatches = function( re, s ) {
    var result = [];
    var m = re.exec( s );
    while( m ) {
        result.push( m[ 1 ] );
        m = re.exec( s );
    }
    return result;
};

/**
 * Get all nested conditions from a condition expression. See unit tests for examples.
 *
 * @param {String|Object} s condition expression
 * @returns {String[]} nested conditions
 */
export let getConditions = function( s ) {
    var re = /conditions\.([a-zA-Z]\w*)(\W*|$)/g;
    if( typeof s === 'string' ) {
        return getAllMatches( re, s );
    }
    if( typeof s === 'object' ) {
        return Object.keys( s ).map( k => s[ k ] ) //Object.values( s ) if not for IE11
            .reduce( ( acc, nxt ) => acc.concat( getConditions( nxt ) ), [] );
    }
    return [];
};

/**
 * Utility to get the actual condition expression from the commands view model
 *
 * @param {Object} commandsViewModel The commands view model
 * @param {String} condition The conditon name ("conditions.asdf")
 * @returns {String|Object} The condition expression (string or object)
 */
export let getConditionExpression = function( commandsViewModel, condition ) {
    var conditionName = condition.split( '.' )[ 1 ];
    var expression = _.get( commandsViewModel, `_internal.conditions.${conditionName}.expression`, null ) ||
        _.get( commandsViewModel, `conditions.${conditionName}.expression`, null );
    if( expression === null ) {
        //If condition does not exist return "false" to avoid console errors (same behavior)
        logger.error( `Reference to missing condition "${conditionName}"` );
        expression = 'false';
    }
    return expression;
};

/**
 * Expand a string based expression to include nested conditions
 *
 * @param {String} expression - a string expression to evaluate
 * @param {Object} internalViewModel - the object containing other expressions
 * @returns {String} the new string expression
 */
export let getRealExpression = function( expression, internalViewModel ) {
    var conditionIndex = expression.indexOf( 'conditions.' );
    if( conditionIndex > -1 ) {
        var substring = expression.substring( conditionIndex );
        var endConditionIndex = substring.search( '[^a-zA-Z0-9._]' );
        endConditionIndex = endConditionIndex > -1 ? conditionIndex + endConditionIndex : expression.length;
        var referenceCondition = expression.substring( conditionIndex, endConditionIndex );
        var evaluatedCondition = _.get( internalViewModel, referenceCondition );
        var returnExpression = expression.replace( referenceCondition, '(' + evaluatedCondition.expression + ')' );
        return getRealExpression( returnExpression, internalViewModel );
    }
    return expression;
};

/**
 * Recurses into the object and sub objects and finds real length of the expression by replacing the
 * references to other condition.xyz conditions
 *
 * @param {Object|String} expression expression whose actual length is desired
 * @param {Object} internalViewModel Object holding all expression definitions
 * @returns {Number} the length of the expression
 */
export let getExpressionLength = function( expression, internalViewModel ) {
    var sum = function( a, b ) {
        return a + b;
    };
    if( typeof expression === 'string' ) {
        return expression.length;
    }
    return _.map( expression, function( value, key ) {
        var length = String( key ).length;
        if( value && _.isString( value ) ) {
            var nestedConditions = getConditions( value );
            if( nestedConditions.length > 0 ) {
                var nestedConditionLength = nestedConditions.map( function( condName ) {
                    return getExpressionLength( getConditionExpression( internalViewModel, 'conditions.' + condName ), internalViewModel );
                } ).reduce( sum );
                return length + nestedConditionLength;
            }
            return length + String( value ).length;
        }
        if( _.isObject( value ) ) {
            return length + getExpressionLength( value, internalViewModel );
        }
        return length + String( value ).length;
    } ).reduce( sum );
};

/**
 * Get the commandPlacements necessary from the given commandsViewModel.
 *
 * Result will include all commands placed directly into the anchor and all of their children.
 *
 * @param {Object} vmJson The commands view model to process
 * @param {Map<String.Boolean>} anchorMap Boolean map of anchors to include
 * @param {Map<String.Boolean>} idMap Boolean map of command ids to include
 * @returns {Map<String,Object>} Map of the placements to include
 */
var getPlacementsToInclude = function( vmJson, anchorMap, idMap ) {
    var parentPlacementsToInclude = _.pickBy( vmJson.commandPlacements, function parentPlacementFilter( placement ) {
        return idMap[ placement.id ] || anchorMap[ placement.uiAnchor ] && !placement.parentGroupId;
    } );
    Object.keys( idMap ).forEach( function( commandId, idx ) {
        parentPlacementsToInclude[ '$$' + commandId + idx ] = {
            id: commandId,
            priority: 0
        };
    } );
    var parentCommandIdMap = _.map( parentPlacementsToInclude, functional.getProp( 'id' ) ).reduce( functional.toBooleanMap, {} );
    var childPlacementsToInclude = _.pickBy( vmJson.commandPlacements, function childPlacementFilter( placement ) {
        return parentCommandIdMap[ placement.parentGroupId ];
    } );
    return _.assign( parentPlacementsToInclude, childPlacementsToInclude );
};

/**
 * Get the commands necessary from the given commandsViewModel.
 *
 * Result will include all commands directly referenced from the placements excluding children of ribbon commands
 *
 * @param {Object} vmJson The commands view model to process
 * @param {Map<String,Object>} includedPlacements The placements that are required
 * @returns {Map<String,Object>} Map of the placements to include
 */
var getCommandsToInclude = function( vmJson, includedPlacements ) {
    var parentCommandIdMap = _.filter( includedPlacements, function( placement ) {
            return !placement.parentGroupId;
        } )
        .map( functional.getProp( 'id' ) )
        .reduce( functional.toBooleanMap, {} );
    var parentCommands = _.pickBy( vmJson.commands, function parentCommandFilter( commandDef, commandId ) {
        return parentCommandIdMap[ commandId ];
    } );
    var childCommandIdMap = _.filter( includedPlacements, function( placement ) {
            var parentCommand = parentCommands[ placement.parentGroupId ];
            return parentCommand && !parentCommand.isRibbon;
        } )
        .map( functional.getProp( 'id' ) )
        .reduce( functional.toBooleanMap, {} );
    var childCommands = _.pickBy( vmJson.commands, function childCommandFilter( commandDef, commandId ) {
        return childCommandIdMap[ commandId ];
    } );
    return _.assign( parentCommands, childCommands );
};

/**
 * Get the command handlers necessary from the given commandsViewModel based on the commands that are necessary
 *
 * @param {Object} vmJson The commands view model to process
 * @param {Map<String, Object>} includedCommands Commands to include
 * @returns {Map<String,Object>} The command handlers to include
 */
var getHandlersToInclude = function( vmJson, includedCommands ) {
    var commandIdMap = Object.keys( includedCommands )
        .reduce( functional.toBooleanMap, {} );
    return _.pickBy( vmJson.commandHandlers, function commandHandlerFilter( commandHandler ) {
        return commandIdMap[ commandHandler.id ];
    } );
};

/**
 * "Trace" the execution of the handlers and include any actions, conditions, event listeners,
 * and messages that they need
 *
 * @param {Object} vmJson  The commands view model to process
 * @param {Map<String,Object>} handlers command handlers to include
 * @returns {Map<String,Object>} Any other information to include
 */
var getAdditionalInformationToInclude = function( vmJson, handlers, actionId ) {
    var optimizedViewModel = {};

    /**
     * Utility function to include some part of the original view model in the optimized view
     * model
     *
     * @param {String} where - Key to insert into (ex "commandPlacements")
     * @returns {Function} Function to insert into key in optimized view model
     */
    var addToOptimizedViewModel = function( where ) {
        return function( id ) {
            optimizedViewModel[ where ] = optimizedViewModel[ where ] || {};
            var value = vmJson[ where ][ id ];
            optimizedViewModel[ where ][ id ] = value;
            return value;
        };
    };

    var actionsToInclude = {};
    var conditionsToInclude = {
        true: true,
        false: true
    };

    if( actionId ) {
        actionsToInclude[ actionId ] = true;
    } else {
        _.forEach( handlers, function( handler ) {
            actionsToInclude[ handler.action ] = true;
            [ 'activeWhen', 'visibleWhen', 'selectWhen', 'enableWhen' ].forEach( function( condType ) {
                var condName = null;
                if( handler[ condType ] && handler[ condType ].condition ) {
                    condName = handler[ condType ].condition.split( '.' ).slice( -1 )[ 0 ];
                    conditionsToInclude[ condName ] = true;
                }
            } );
        } );
    }

    var shouldCheckAgain = true;

    // Insert something into the optimized view model and reset shouldCheckAgain flag if not already there
    var insertAndCheck = function( map ) {
        return function insertAndCheckImpl( key ) {
            if( !map[ key ] ) {
                map[ key ] = true;
                shouldCheckAgain = true;
            }
        };
    };

    // Loop over the "event chain" to determine which events / actions / conditions need to be included
    var eventsToInclude = {};
    var messagesToInclude = {};

    // Mark an event as necessary to include based on something in the view model firing it
    var includeEvent = function( eventFire ) {
        insertAndCheck( eventsToInclude )( eventFire.name );
    };

    // Mark a message as necessary to include based on something in the view model using it
    var includeMessage = function( message ) {
        insertAndCheck( messagesToInclude )( message.message );
    };

    // Include a condition and check if the condition relies on any other conditions that are not included
    var includeNestedConditions = function( condition ) {
        getConditions( condition.expression )
            .map( insertAndCheck( conditionsToInclude ) );
    };

    // Include any actions that a message may trigger
    var includeMessageActions = function( message ) {
        message.navigationOptions
            .map( functional.getProp( 'action' ) )
            .filter( functional.identity )
            .map( insertAndCheck( actionsToInclude ) );
    };

    while( shouldCheckAgain ) {
        shouldCheckAgain = false;

        // Add actions to the optimized view model
        var actions = Object.keys( vmJson.actions )
            .filter( functional.fromMap( actionsToInclude ) )
            .map( addToOptimizedViewModel( 'actions' ) );

        // Add conditions to the optimized view model
        Object.keys( vmJson.conditions )
            .filter( functional.fromMap( conditionsToInclude ) )
            .map( addToOptimizedViewModel( 'conditions' ) )
            .forEach( includeNestedConditions );

        // Determine which events to include
        actions.forEach( function( action ) {
            if( action.events ) {
                Object.keys( action.events )
                    .forEach( function( onEvent ) {
                        action.events[ onEvent ].map( includeEvent );
                    } );
            }
            if( action.method === 'Event' ) {
                action.inputData.events.map( includeEvent );
            }
            if( action.actionMessages ) {
                Object.keys( action.actionMessages )
                    .forEach( function( k ) {
                        action.actionMessages[ k ].map( includeMessage );
                    } );
            }
            // add the batch actions for the commandID
            if( action.actionType === 'batchJob' ) {
                _.forEach( action.steps, function( stepValue ) {
                    insertAndCheck( actionsToInclude )( stepValue.action );
                    if( stepValue.condition ) {
                        var condName = stepValue.condition.split( '.' ).slice( -1 )[ 0 ];
                        insertAndCheck( conditionsToInclude )( condName );
                    }
                } );
            }
        } );

        // Add messages to the optimized view model
        Object.keys( vmJson.messages || {} )
            .filter( functional.fromMap( messagesToInclude ) )
            .map( addToOptimizedViewModel( 'messages' ) )
            .filter( functional.getProp( 'navigationOptions' ) )
            .forEach( includeMessageActions );

        // Update event listeners in optimized view model
        optimizedViewModel.onEvent = ( vmJson.onEvent || [] ).filter( function( eventListener ) {
            return eventsToInclude[ eventListener.eventId ];
        } );

        // Include conditions and actions for event listeners
        optimizedViewModel.onEvent.map( function( eventListener ) {
            if( eventListener.condition ) {
                var condName = eventListener.condition.split( '.' ).slice( -1 )[ 0 ];
                insertAndCheck( conditionsToInclude )( condName );
            }
            if( eventListener.action ) {
                insertAndCheck( actionsToInclude )( eventListener.action );
            }
            if( eventListener.message ) {
                insertAndCheck( messagesToInclude )( eventListener.message );
            }
        } );
    }

    return optimizedViewModel;
};

/**
 * Get a view model optimized for the given anchor or command.
 *
 * Optimization process:
 * commandPlacements - Commands placements relative to the given anchor and any of their child commands will be included
 * commands - Any commands referenced by the command placements that are included
 * commandHandlers - Any commands handlers required by the included commands
 * (remaining) - Everything else remaining is copied over as is
 *
 * @param {Object} vmJson - Full commands view model json
 * @param {String[]} commandAreaNameTokens - Areas to optimize for
 * @param {String[]} commandIds - IDs of the command to optmize for
 * @param {Boolean}
 * @returns {Object} Optimized view model json
 */
export let getOptimizedViewModel = function( vmJson, commandAreaNameTokens, commandIds, actionId ) {
    var optimizedViewModel = {};

    var anchorMap = commandAreaNameTokens.reduce( functional.toBooleanMap, {} );
    var idMap = commandIds.reduce( functional.toBooleanMap, {} );

    optimizedViewModel.commandPlacements = getPlacementsToInclude( vmJson, anchorMap, idMap );
    optimizedViewModel.commands = getCommandsToInclude( vmJson, optimizedViewModel.commandPlacements );
    optimizedViewModel.commandHandlers = getHandlersToInclude( vmJson, optimizedViewModel.commands );

    var additionalInfo = getAdditionalInformationToInclude( vmJson, optimizedViewModel.commandHandlers, actionId );

    // Copy remaining data unfiltered
    // Remaining is just raw data until execution and has minimal impact on performance
    // and duplicating would have a (small) impact on memory
    Object.keys( vmJson )
        .forEach( function( key ) {
            if( !optimizedViewModel[ key ] ) {
                optimizedViewModel[ key ] = additionalInfo[ key ] || vmJson[ key ];
            }
        } );

    return optimizedViewModel;
};

const exports = {
    updateShortConditions,
    getCommandsViewModel,
    getConditions,
    getConditionExpression,
    getRealExpression,
    getExpressionLength,
    getOptimizedViewModel
};
export default exports;

/**
 *  A set of utilities and methods related to processing and modifying the commadns view model
 *
 * @memberOf NgServices
 * @class commandService
 */
app.factory( 'commandConfigUtils', () => exports );
