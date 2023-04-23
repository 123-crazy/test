/* eslint-disable class-methods-use-this */
// Copyright (c) 2020 Siemens

/**
 * This service is used to manage the configuration of the paste operation.
 *
 * Please refer {@link https://gitlab.industrysoftware.automation.siemens.com/Apollo/afx/wikis/solution#solution-configuration-for-paste-handling|Solution configuration for paste handling}
 *
 * @module js/pasteService
 *
 * @publishedApolloService
 *
 */

import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cfgSvc from 'js/configurationService';
import appCtxService from 'js/appCtxService';
import adapterSvc from 'js/adapterService';
import localeSvc from 'js/localeService';
import messagingSvc from 'js/messagingService';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import declUtils from 'js/declUtils';
import viewModelService from 'js/viewModelService';
import actionService from 'js/actionService';
import conditionSvc from 'js/conditionService';
import expParUtils from 'js/expressionParserUtils';
import 'config/paste';
import ccu from 'js/commandConfigUtils.service';
import awConfiguration from 'js/awConfiguration';
/**
 * This object represents the union of all module level 'paste.json' configurations for the current AW
 * application.
 *
 * Content & Structure of the 'paste.json' file located:<BR>
 * WAR: <war_root>\assets\config\paste.json <BR>
 * Kit: <dev_root>\out\kit\tcawframework_aws2stage.zip\stage\repo\gwt\tc-aw-framework\module.json
 *
 * The 'paste.json' module is used during Drag-and-Drop operations to specify which types of objects
 * being dragged (i.e. the 'source' types) are valid to drop onto a specific type object (i.e. the 'target'
 * type). If no source/target match is found, the drop will not be allowed and the user will see the 'drop not
 * allowed' symbol for their cursor.
 * <P>
 * The most specific type in an object's type hierarchy is used. <BR>
 * There is no inheritance between properties in this file.
 * <P>
 *
 * For Each (sourceType) and (targetType) section must be specify with action
 * <P>
 * All 'source' object types must be valid for a specific 'target' before the drop will be allowed.
 *
 * Note 1: This mapping only applies for dropping 'source' objects onto a single 'target' object. When dropping
 * into an 'objectSet' of an XRT stylesheet, the relation information in the 'source' attribute of the
 * 'objectSet' is used.
 *
 *
 * The JSON object generically is structured as:
 *
 * <pre>
 * {
    "schemaVersion": "1.0.0",
    "pasteHandlers": {
        "handlerName": {
            "action": "HandlerAction",
            "activeWhen": {
                "condition": "conditionToActiveTheHandler"
            }
        }
    },
    "actions": {
        "HandlerAction": {
          // declartive action that we follow in commandsViewModel / ViewModel.json
        }
    },
    "conditions": {
        "conditionToActiveTheHandler": {
            "expression": {
                "$and": [ {
                        "$source": "pasteContext.targetObject",
                        "$query": {
                            "$typeOf": "nameOfTargetObject"
                        }
                    },
                    {
                        "$source": "pasteContext.sourceObject",
                        "$query": {
                            "$typeOf": "nameOfSourceObject"
                        }
                    }
                ]
            }
        }
    }
}
 * </pre>
 *
 * Example: The following specifies that:<BR>
 * a) any 'target' of type 'Folder' should use the 'customPasteHandler' defined in the JS file
 * 'js/pasteHandlers.js' when items of type 'ItemRevision' are pasted on them
 * <P>
 * Similary we can create following combination
 * b) any 'target' of type 'WorkspaceObject' should use the 'tcDefaultPasteHandler' with default relations when
 * items of type 'ItemRevision' or 'DocumentRevision' are pasted on them.
 * <P>
 * c) any 'target' of type 'DocumentRevision' should use the 'defaultFilePasteHandler' specifying the
 * 'TC_Attaches' relations (and other datasetInfo properties) when objects of type 'Dataset' are pasted on them.
 *
 * <pre>
 * {
    "schemaVersion": "1.0.0",
    "pasteHandlers": {
        "defaultPasteHandlerForImpactAnalysis": {
            "action": "defaultPasteHandlerForImpactAnalysis",
            "activeWhen": {
                "condition": "conditions.isPasteHandlerActiveForImpactAnalysisNew"
            }
        }
    },
    "actions": {
        "defaultPasteHandlerForImpactAnalysis": {
            "actionType": "JSFunction",
            "method": "customPasteHandler",
            "deps": "js/pasteHandlers",
            "inputData": {
                "targetObject": "{{pasteContext.targetObject}}",
                "sourceObject": "{{pasteContext.sourceObject}}"
            },
            "events": {
                "success": [ {
                    "name": "dragDrop.success",
                    "condition": "pasteContext.isDragDropIntent",
                    "eventData": {
                        "sourceObjects": "{{pasteContext.sourceObject}}",
                        "targetObject": "{{pasteContext.targetObject}}"
                    }
                } ]
            }
        }
    },
    "conditions": {
        "isPasteHandlerActiveForImpactAnalysisNew": {
            "expression": {
                "$and": [ {
                        "$source": "pasteContext.targetObject",
                        "$query": {
                            "$typeOf": "Folder"
                        }
                    },
                    {
                        "$source": "pasteContext.sourceObject",
                        "$query": {
                            "$typeOf": "ItemRevision"
                        }
                    }
                ]
            }
        }
    }
}
* </pre>
*/

var _pasteConfig;

var _pasteConfigMap;

var targetSourceMap;

var _declViewModel;

/**
 * ############################################################<BR>
 * Define the public functions exposed by this module.<BR>
 * ############################################################<BR>
 * @ignore
 */
let exports;

/**
 * Create the declartive viewModel from all combined paste.json
 *
 * @param {Object} viewModel - event data information with name and value of changes
 * @returns {Promise} promise with decl view model json
 */
function createViewModel( viewModel ) {
    viewModel._viewModelId = 'pasteViewModel_' + Math.random;
    viewModel.skipClone = true;
    return viewModelService.populateViewModelPropertiesFromJson( viewModel, null, null, true )
        .then( function( populatedViewModelJson ) {
            return populatedViewModelJson;
        } );
}

/**
 * Update the '_pasteConfigMap' on with all combine paste.json
 *
 */
function updateThePasteConfig() {
    targetSourceMap = new Map();

    _.forEach( _pasteConfig.pasteHandlers, function( value, key ) {
        if( value.activeWhen ) {
            var condition = value.activeWhen.condition;
            var conditionExpression = null;
            var sourceObject;
            var targetObject;
            if( _.startsWith( condition, 'conditions.' ) ) {
                conditionExpression = _.get( _pasteConfig, condition );
            } else {
                conditionExpression = condition;
            }
            if( conditionExpression && conditionExpression.expression ) {
                udpateMap( conditionExpression.expression, key, sourceObject, targetObject );
            }
        }
    } );

    _pasteConfigMap = targetSourceMap;
}

var udpateMap = function( query, key, sourceObject, targetObject ) {
    var queryToUse = query;
    var matchAll = queryToUse[ expParUtils.$ALL ];
    queryToUse = matchAll || queryToUse;
    var performAND = queryToUse[ expParUtils.$AND ] || queryToUse[ expParUtils.$ALL ];
    var performOR = queryToUse[ expParUtils.$OR ];
    var evalChecks = performAND || performOR || [ queryToUse ];
    _.forEach( evalChecks, function( evalCheck ) {
        var path = expParUtils.resolve( expParUtils.$SOURCE, evalCheck );
        var condition = expParUtils.resolve( expParUtils.$QUERY, evalCheck ) || evalCheck;
        if( path === 'pasteContext.sourceObject' ) {
            sourceObject = condition.$typeOf;
        } else if( path === 'pasteContext.targetObject' ) {
            targetObject = condition.$typeOf;
        }
        if( sourceObject && targetObject && path ) {
            if( !targetSourceMap.has( targetObject ) ) {
                targetSourceMap.set( targetObject, { sourceTypes: {} } );
            }
            if( !targetSourceMap.get( targetObject ).sourceTypes[ sourceObject ] ) {
                targetSourceMap.get( targetObject ).sourceTypes[ sourceObject ] = [];
            }
            targetSourceMap.get( targetObject ).sourceTypes[ sourceObject ].push( key );
        }
        var recurseExpressionEvaluation = condition && ( condition[ expParUtils.$ALL ] || condition[ expParUtils.$AND ] || condition[ expParUtils.$OR ] || condition[ expParUtils.$SOURCE ] );
        if( recurseExpressionEvaluation ) {
            udpateMap( condition, key, sourceObject, targetObject );
        }
    } );
};

/**
 * Update the 'selectedModelTypeRelations' on the appCtx for the one step Paste command.
 *
 * @param {Object} eventData - event data information with name and value of changes
 */
function changeValidSourceTypesForSelected( eventData ) {
    if( eventData.name === 'mselected' && eventData.value && eventData.value.length === 1 ) {
        var objectValidSourceTypes = exports.getObjectValidSourceTypes( eventData.value[ 0 ] );
        objectValidSourceTypes = objectValidSourceTypes || {};
        appCtxService.registerCtx( 'selectedModelTypeRelations', Object.keys( objectValidSourceTypes ) );
    }
}

/**
 * create Success Message For DND
 *
 * @param {sourceObjects} sourceObjects -Service to use.
 * @param {targetObject} targetObject -Service to use.
 *
 * invoke success message
 */
function createSuccessMessageForDND( sourceObjects, targetObject ) {
    var pasteSuccessMessage = {
        messageText: '',
        messageTextParams: []
    };

    if( sourceObjects.length > 1 ) {
        localeSvc.getLocalizedTextFromKey( 'pasteCommandMessages.pasteMultipleSuccessfulMessage' ).then( function( response ) {
            pasteSuccessMessage.messageText = response;
            pasteSuccessMessage.messageTextParams = [
                sourceObjects.length,
                targetObject.props.object_string.uiValues[ 0 ]
            ];
            var messageText = messagingSvc.applyMessageParamsWithoutContext( pasteSuccessMessage.messageText, pasteSuccessMessage.messageTextParams );
            messagingSvc.showInfo( messageText );
        } );
    } else {
        localeSvc.getLocalizedTextFromKey( 'pasteCommandMessages.pasteSuccessfulMessage' ).then( function( response ) {
            pasteSuccessMessage.messageText = response;
            const sourceObjectName = sourceObjects && sourceObjects[ 0 ].props && sourceObjects[ 0 ].props.object_string ?
                sourceObjects[ 0 ].props.object_string.uiValues[ 0 ] : sourceObjects[ 0 ].name;
            pasteSuccessMessage.messageTextParams = [
                sourceObjectName,
                targetObject.props.object_string.uiValues[ 0 ]
            ];
            var messageText = messagingSvc.applyMessageParamsWithoutContext( pasteSuccessMessage.messageText, pasteSuccessMessage.messageTextParams );
            messagingSvc.showInfo( messageText );
        } );
    }
}

/**
 * create Failure Message For DND
 *
 * @param {errorReason} errorReason -Service to use.
 *
 *  invokes  failure message
 */
function createFailureMessageForDND( errorReason ) {
    localeSvc.getLocalizedTextFromKey( 'pasteCommandMessages.pasteFailedMessage' ).then( result => {
        var pasteFailureMessage = result;
        var errorText = pasteFailureMessage + ':';
        _.forEach( errorReason.message.split( /\n/g ), function( messageLine ) {
            errorText = errorText + '<br>' + messageLine;
        } );
        messagingSvc.showInfo( errorText );
    } );
}

/**
 * handler for dragDrop event
 * @param {Array} sourceObjects source objects drag frim
 * @param {Object} targetObject target object drop to
 */
function handleSuccess( sourceObjects, targetObject ) {
    var adaptedSourceObjects = adapterSvc.getAdaptedObjectsSync( sourceObjects );
    createSuccessMessageForDND( adaptedSourceObjects, targetObject );
}

export const getTargetType = function( targetObject ) {
    var targetTypes = getTargetTypes();
    var typeHier = declUtils.getTypeHierarchy( targetObject ) || [ targetObject.type ];

    if( typeHier[ 0 ] ) {
        for( var ii = 0; ii < typeHier.length; ii++ ) {
            var typeName = typeHier[ ii ];
            if( targetTypes.has( typeName ) ) {
                return targetTypes.get( typeName );
            }
        }
    }
    return null;
};

export const getSourceType = function( sourceTypes, sourceObject ) {
    var typeHier = declUtils.getTypeHierarchy( sourceObject ) || [ sourceObject.type ];

    if( typeHier[ 0 ] ) {
        for( var ii = 0; ii < typeHier.length; ii++ ) {
            var typeName = typeHier[ ii ];
            if( sourceTypes[ typeName ] ) {
                return sourceTypes[ typeName ];
            }
        }
    }
    return null;
};

/**
 * To Paste objects with single relationType
 *
 * This would
 * 1. use bestTargetFitFinder function to find the best possible Target Fit for the given target object by reading the paste configuration.
 * 2. use bestSourceFitFinder function to find the best possible Source Fit for the given source object by reading the paste configuration.
 * 3. Invoke the configured pasteHandler for the target + source type combination.
 * 4. If no suitable target + source type combination for paste handler is found then (configured) default paste handler is invoked.
 *
 * @param {Object} targetObject - The 'target' Object for the paste.
 * @param {Array} sourceObjects - Array of 'source' Objects to paste onto the 'target' Object.
 * @param {String} relationType - Relation type name
 * @param {String} isDragDropIntent - intent of execution
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export let execute = function( targetObject, sourceObjects, relationType, isDragDropIntent ) {
    var queue = {};
    var defaultPasteHandlerConfiguration = awConfiguration.get( 'defaultPasteHandlerConfiguration' );

    var doAction = function( defaultPasteHandler, declViewModel ) {
        _.forEach( sourceObjects, function( sourceObject ) {
            var pasteContext = { targetObject: targetObject, sourceObject: sourceObject, relationType: relationType };
            var targetTypeConfig = null;
            if( typeof defaultPasteHandlerConfiguration === 'object' ) {
                targetTypeConfig = defaultPasteHandler[ defaultPasteHandlerConfiguration.bestTargetFitFinder ]( targetObject );
            } else {
                targetTypeConfig = getTargetType( targetObject );
            }
            var action = null;
            var actionName = null;

            if( targetTypeConfig ) {
                var sourceTypeConfig = null;
                if( typeof defaultPasteHandlerConfiguration === 'object' ) {
                    sourceTypeConfig = defaultPasteHandler[ defaultPasteHandlerConfiguration.bestSourceFitFinder ]( targetTypeConfig.sourceTypes, sourceObject );
                } else {
                    sourceTypeConfig = getSourceType( targetTypeConfig.sourceTypes, sourceObject );
                }
                var length = 0;
                var currentLength;

                if( sourceTypeConfig ) {
                    _.forEach( sourceTypeConfig, function( pasteHandlers ) {
                        var pasteHandlerObject = _pasteConfig.pasteHandlers[ pasteHandlers ];
                        var conditionResult = false;

                        var conditionExpression = pasteHandlerObject.activeWhen.condition;
                        if( _.startsWith( pasteHandlerObject.activeWhen.condition, 'conditions.' ) ) {
                            conditionExpression = _.get( _pasteConfig, pasteHandlerObject.activeWhen.condition );
                        }
                        if( conditionExpression !== null ) {
                            currentLength = ccu.getExpressionLength( conditionExpression.expression, declViewModel );
                            conditionResult = conditionSvc.evaluateCondition( {
                                ctx: appCtxService.ctx,
                                pasteContext: pasteContext
                            }, conditionExpression.expression );
                        }
                        if( conditionResult && currentLength > length ) {
                            length = currentLength;
                            action = _pasteConfig.actions[ pasteHandlerObject.action ];
                            actionName = pasteHandlerObject.action;
                        }
                    } );
                }
            }

            if( !actionName && typeof defaultPasteHandlerConfiguration === 'object' ) {
                var handlerFunctionName = defaultPasteHandlerConfiguration.pasteHandler;
                actionName = _pasteConfig.pasteHandlers[ handlerFunctionName ].action;
                action = _pasteConfig.actions[ actionName ];

                logger.warn( 'No configured paste handler found for source object: \'' + sourceObject +
                    '\' when target object: \'' + targetObject + '\'' + '\n' +
                    'RelationType: \'' + relationType + '\'' + '\n' +
                    '...Assuming default handler' );
            }

            if( actionName ) {
                if( !queue.hasOwnProperty( actionName ) ) {
                    queue[ actionName ] = {};
                }
                if( !queue[ actionName ].hasOwnProperty( 'sourceObjs' ) ) {
                    queue[ actionName ].sourceObjs = [];
                }
                queue[ actionName ].sourceObjs.push( sourceObject );
                if( action ) {
                    queue[ actionName ].handlerAction = action;
                }
            }
        } );

        /**
         * Loop for each unique 'handler' and build up a promise chain.
         */

        var promiseArray = [];
        _.forEach( queue, function( queuedSrcObjInfo ) {
            var depFileToLoad = queuedSrcObjInfo.handlerAction.deps;
            var depModuleObj = null;
            var dataCtxNode = {
                data: declViewModel,
                ctx: appCtxService.ctx,
                pasteContext: { targetObject: targetObject, sourceObject: queuedSrcObjInfo.sourceObjs, relationType: relationType, isDragDropIntent: Boolean( isDragDropIntent ) }
            };

            if( depFileToLoad ) {
                depModuleObj = declUtils.getDependentModule( queuedSrcObjInfo.handlerAction.deps );
                if( !depModuleObj ) {
                    promiseArray.push( declUtils.loadDependentModule( queuedSrcObjInfo.handlerAction.deps ).then( function( pasteHandler ) {
                        depModuleObj = pasteHandler;
                        return actionService.executeAction( declViewModel, queuedSrcObjInfo.handlerAction, dataCtxNode, depModuleObj, false );
                    } ) );
                } else {
                    promiseArray.push( actionService.executeAction( declViewModel, queuedSrcObjInfo.handlerAction, dataCtxNode, depModuleObj, false ) );
                }
            } else {
                promiseArray.push( actionService.executeAction( declViewModel, queuedSrcObjInfo.handlerAction, dataCtxNode, depModuleObj, false ) );
            }
        } );
        return AwPromiseService.instance.all( promiseArray );
    };

    var performAction = function( declViewModel ) {
        if( defaultPasteHandlerConfiguration.deps ) {
            var defaultPasteHandler = declUtils.getDependentModule( defaultPasteHandlerConfiguration.deps );
            if( !defaultPasteHandler ) {
                return declUtils.loadDependentModule( defaultPasteHandlerConfiguration.deps ).then( function( pasteHandler ) {
                    return doAction( pasteHandler, declViewModel );
                } );
            }
            return doAction( defaultPasteHandler, declViewModel );
        }
        return doAction( null, declViewModel );
    };
    if( !_declViewModel ) {
        return createViewModel( _pasteConfig ).then( function( declViewModel ) {
            _declViewModel = declViewModel;
            return performAction( _declViewModel );
        } );
    }
    return performAction( _declViewModel );
};

/**
 * To Paste objects with different relationTypes
 * Same as {@link module:js/pasteService.execute|execute} except that this executes with multiple source object + relation types for a single target object.
 *
 * @param {Object} targetObject - the target object to paste the source objects to
 * @param {Object} relationTypeToSources - an object of key/value: relationType/array-of-sourceObjects
 *
 * @returns {Promise} Resolved when all processing is complete.
 */
export let executeWithMultipleRelations = function( targetObject, relationTypeToSources ) {
    var allPromises = [];

    _.forOwn( relationTypeToSources, function( sourceObjects, relationType ) {
        allPromises.push( exports.execute( targetObject, sourceObjects, relationType ) );
    } );

    return AwPromiseService.instance.all( allPromises );
};

export const determineActiveHandler = ( sourceObjects, targetObject ) => {
    var conditionResult = false;
    _.forOwn( _pasteConfig.pasteHandlers, ( pasteHandlerObject ) => {
        var conditionExpression = pasteHandlerObject.activeWhen ? pasteHandlerObject.activeWhen.condition : null;
        if( conditionExpression ) {
            if( _.startsWith( pasteHandlerObject.activeWhen.condition, 'conditions.' ) ) {
                conditionExpression = _.get( _pasteConfig, pasteHandlerObject.activeWhen.condition );
            }
            if( conditionExpression !== null ) {
                conditionResult = conditionResult || conditionSvc.evaluateCondition( {
                    ctx: appCtxService.ctx,
                    pasteContext: {
                        targetObject: targetObject,
                        sourceObject: sourceObjects,
                        relationType: ''
                    }
                }, conditionExpression.expression );
            }
        }
    } );
    return conditionResult;
};

/**
 * Gets all of the available targetTypes configured in paste.json files from different modules.
 *
 * @return {Object} The 'targetTypes' from the 'pasteConfig'
 */
export let getTargetTypes = function() {
    return _pasteConfigMap ? _pasteConfigMap : {};
};

/**
 * @param {Object} targetObject - The 'target' IModelObject to use when determining which 'source' types are
 *            potentially valid to be dropped upon it.
 * @return {Object|null} The 'sourceTypes' property from the 'pasteConfig' for the given 'target' object type or its
 *         ancestor types up the hierarchy (or NULL if no match was found).
 */
export let getObjectValidSourceTypes = function( targetObject ) {
    if( targetObject && targetObject.modelType && targetObject.modelType.typeHierarchyArray || targetObject && targetObject.typeHierarchy ) {
        var typeHier = declUtils.getTypeHierarchy( targetObject );

        /**
         * Starting at the 'target' object's actual type, try to find a matching 'targetType' property in the
         * 'pasteConfig'. If an exact match is not found, try the super type of the 'target' up its hierarchy tree. Stop
         * looking when the 1st one (i.e. the 'closest' one) is found.
         */
        var targetTypes = exports.getTargetTypes();

        for( var ii = 0; ii < typeHier.length; ii++ ) {
            var typeName = typeHier[ ii ];

            if( targetTypes.has( typeName ) ) {
                return targetTypes.get( typeName ).sourceTypes;
            }
        }
    }

    return null;
};

/**
 * Get underlying BO for view model objects
 *
 * @param {Array} viewModelObjects - view model objects to adapt
 * @return {input} adapted object
 */
export let adaptedInput = function( viewModelObjects ) {
    if( viewModelObjects ) {
        var objectsToAdapt = _.isArray( viewModelObjects ) ? viewModelObjects : [ viewModelObjects ];
        return adapterSvc.getAdaptedObjectsSync( objectsToAdapt );
    }
    return [];
};

export let loadConfiguration = function() {
    _pasteConfig = cfgSvc.getCfgCached( 'paste' );

    updateThePasteConfig();

    eventBus.subscribe( 'appCtx.register', changeValidSourceTypesForSelected );
    eventBus.subscribe( 'dragDrop.success', function( event ) {
        handleSuccess( event.sourceObjects, event.targetObject );
    } );
    eventBus.subscribe( 'dragDrop.failure', function( event ) {
        createFailureMessageForDND( event.reason );
    } );

    eventBus.subscribePostal( {
        channel: 'paste',
        topic: 'drop',
        callback: function( eventData ) {
            if( eventData && eventData.pasteInput ) {
                _.forEach( eventData.pasteInput, function( pasteInput ) {
                    var targetObject = pasteInput.targetObject;
                    var relationType = pasteInput.relationType;
                    var sourceObjects = pasteInput.sourceObjects;

                    exports.execute( targetObject, sourceObjects, relationType, true ).then( function() {
                        var eventData = {
                            relatedModified: [ targetObject ],
                            refreshLocationFlag: false,
                            createdObjects: sourceObjects
                        };
                        eventBus.publish( 'cdm.relatedModified', eventData );
                    } );
                } );
            }
        }
    } );
};

exports = {
    execute,
    executeWithMultipleRelations,
    getTargetTypes,
    getObjectValidSourceTypes,
    adaptedInput,
    loadConfiguration,
    determineActiveHandler
};
export default exports;

loadConfiguration();

/**
 * @memberof NgServices
 * @member pasteService
 *
 * @param {$q} $q - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {adapterService} adapterSvc - Service to use.
 * @param {localeService} localeSvc -Service to use.
 * @param {messagingService} messagingSvc -Service to use.
 * @param {viewModelService} viewModelService -Service to use.
 * @param {actionService} actionService -Service to use.
 * @param {conditionService} conditionService -Service to use.
 * @param {commandConfigUtils} ccu -Service to use.

 * @returns {pasteService} Reference to service API Object.
 */
app.factory( 'pasteService', () => exports );
