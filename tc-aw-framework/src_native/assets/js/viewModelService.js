// Copyright (c) 2020 Siemens

/**
 * This module is part of declarative UI framework and provides high level functionalities to work with view model.
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/viewModelService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import awDuiLocalizationSvc from 'js/awDuiLocalizationService';
import viewModelProcessingSvc from 'js/viewModelProcessingFactory';
import messagingSvc from 'js/messagingService';
import actionSvc from 'js/actionService';
import conditionSvc from 'js/conditionService';
import appCtxSvc from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import uwPropertySvc from 'js/uwPropertyService';
import declDataCtxService from 'js/declarativeDataCtxService';
import Debug from 'Debug';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import ngUtils from 'js/ngUtils';
import declUtils from 'js/declUtils';
import browserUtils from 'js/browserUtils';
import assert from 'assert';
import debugService from 'js/debugService';
import 'js/uwDirectiveBaseUtils';
import syncViewModelCacheService from 'js/syncViewModelCacheService';

var trace = new Debug( 'viewModel' );

/**
 * Cached reference to the various AngularJS and AW services.
 */

var _urlAttributes = browserUtils.getUrlAttributes();

/**
 * TRUE if the properties that are on a 'declViewModel' but not updated during an 'appCtxService' change event
 * should be logged. This logging is helpful when determining what properties may need extra processing after an
 * update.
 */
var _logNonUpdatedProperties = _urlAttributes.logNonUpdatedProperties !== undefined;

/**
 * {Boolean} TRUE if basic CTX path building info should be logged.
 */
var _logCtxPathActivity_0 = _urlAttributes.logCtxPathActivity_0 !== undefined;

/**
 * {Boolean} TRUE if (lots) more detailed CTX path building info should be logged.
 */
var _logCtxPathActivity_1 = _urlAttributes.logCtxPathActivity_1 !== undefined;

/**
 * {Boolean} TRUE if declVideModel JSON cloning activity should be logged.
 */
var _logCloningActivity = _urlAttributes.logCloningActivity !== undefined;

/**
 * {StringArray}
 */
var _wordBoundary = [ '.', ' ', '=', '!', '}', '|', '&', '[' ];

var exports = {};

/**
 * This function walks recursively down a 'declViewModelJson' object property tree finding any properties that are
 * sensitive to (bound to) any of the given set of 'context' changes. When found, a 'path' to that property is added
 * to the 'boundProps' array.
 *
 * @param {Object} currParent - Current 'parent' object to consider the properties of.
 *
 * @param {String} currPath - The current set of '.' separated property names that represent the 'parent' property
 *            in the original 'declViewModelJson'.
 *
 * @param {ObjectArray} boundProps - Array of context name/value pairs were found to be 'bound' to one or more of
 *            the changes 'contexts'.
 *
 * @param {Number} level - Current recursion level.
 */
var _findCtxBoundProperties = function( currParent, currPath, boundProps, level ) {
    if( _logCtxPathActivity_1 ) {
        logger.info( 'Path: ' + currPath );
    }

    var keys = Object.keys( currParent );
    var keyLength = keys.length;
    for( var i = 0; i < keyLength; i++ ) {
        var propName = keys[ i ];
        var propValue = currParent[ propName ];

        /**
         * Check if this is the 'actions' section of the declVideModel JSON<BR>
         * If so: Skip it, 'actions' bindings are always evaluated at the time they are executed.
         */
        if( level === 0 && ( propName === 'actions' || propName === 'imports' || propName[ 0 ] === '_' ) ) {
            continue;
        }

        /**
         * Check if there is a value to work with AND the property is NOT 'imports' or indicated as 'internal' via a
         * '_' prefix.
         */
        if( propValue ) {
            /**
             * Check if this property possibly binds to a 'ctx' property.
             */
            if( propValue.length > 6 && /^{{[\s\w.=!|&$]*\bctx\..*}}$/.test( propValue ) ) {
                boundProps.push( {
                    path: currPath + '.' + propName,
                    binding: propValue
                } );
            } else if( typeof propValue === 'object' ) {
                var nextPath = currPath.length > 0 ? currPath + '.' + propName : propName;

                if( propValue.text && propValue.params ) {
                    _.forEach( propValue.params, function( propValue2 ) {
                        if( propValue2.length > 6 && /^{{[\s\w.=!|&$]*\bctx\..*}}$/.test( propValue2 ) ) {
                            boundProps.push( {
                                path: currPath + '.' + propName,
                                binding: propValue2
                            } );
                        }
                    } );
                } else {
                    _findCtxBoundProperties( propValue, nextPath, boundProps, level + 1 );
                }
            }
        }
    }
};

/**
 * Update the given 'declViewModel' according to the original view model JSON definition.
 *
 * @param {Object} contexts - The latest 'contexts' of the events that caused the update event.
 *            <P>
 *            Note: There may have been several previous CTX events before this method is called. Those
 *
 * @param {DeclViewModel} declViewModel - Incoming data object
 */
var _updateViewModel = function( contexts, declViewModel ) {
    declUtils.assertValidModelWithOriginalJSON( declViewModel );

    /**
     * Check if the original JSON indicates any bindings to any of these CTX changes.
     */
    if( !declViewModel._internal.declViewModelJsonBoundProps ) {
        var boundPropsRoot = [];

        _findCtxBoundProperties( declViewModel._internal.origDeclViewModelJson, '', boundPropsRoot, 0 );

        declViewModel._internal.declViewModelJsonBoundProps = boundPropsRoot;
    }

    var allBoundProps = declViewModel._internal.declViewModelJsonBoundProps;

    if( allBoundProps.length === 0 ) {
        if( _logCtxPathActivity_0 ) {
            logger.info( '_updateViewModel: ' + declViewModel + '\n' + '...Pending CTX changes: ' +
                JSON.stringify( Object.keys( contexts ) ) + '\n' + '--- No CTX bound properties found' );
        }

        return;
    }

    var changedCtxNames = [];

    _.forEach( contexts, function( ctxValue, ctxName ) {
        changedCtxNames.push( 'ctx.' + ctxName );
    } );

    var boundProps = [];

    for( var indx = 0; indx < allBoundProps.length; indx++ ) {
        var binding = allBoundProps[ indx ].binding;

        /**
         * Check if it is one of the ones that changed.
         */
        for( var ndx = 0; ndx < changedCtxNames.length; ndx++ ) {
            var changedCtxName = changedCtxNames[ ndx ];

            var ctxNdx = binding.indexOf( changedCtxName );

            if( ctxNdx > 0 ) {
                /**
                 * Make sure we match on a valid word boundary (e.g. next char is '.', ' ', '=', '!', '}', '|', '&',
                 * '[')
                 */
                var ctxNdxEnd = ctxNdx + changedCtxName.length;

                if( ctxNdxEnd + 1 < binding.length ) {
                    var nextChar = binding[ ctxNdxEnd ];

                    if( _.includes( _wordBoundary, nextChar ) ) {
                        boundProps.push( allBoundProps[ indx ] );
                    }
                }
            }
        }
    }

    if( boundProps.length === 0 ) {
        if( _logCtxPathActivity_0 ) {
            logger.info( '_updateViewModel: ' + declViewModel + '\n' + '...Pending CTX changes: ' +
                JSON.stringify( Object.keys( contexts ) ) + '\n' + '--- No CTX bound properties found' );
        }

        return;
    }

    if( _logCtxPathActivity_0 ) {
        logger.info( '_updateViewModel: ' + declViewModel + '\n' + '...Pending CTX changes: ' +
            JSON.stringify( Object.keys( contexts ) ) + '\n' + '+++ Bound CTX properties found: ' +
            boundProps.length );
    }

    if( _logCtxPathActivity_1 ) {
        logger.info( '_updateViewModel: ' + declViewModel + '\n' + '...Pending CTX changes: ' +
            JSON.stringify( Object.keys( contexts ) ) + '\n' + '+++ Bound CTX properties found: ' + '\n' +
            JSON.stringify( boundProps, null, 2 ) );
    }

    /**
     * Make a copy of the original
     */
    if( _logCloningActivity ) {
        logger.info( '_updateViewModel: ' + 'Cloning vm JSON: ' + declViewModel );
    }

    var origDeclViewModelJson = declViewModel._internal.origDeclViewModelJson;

    /**
     * Save certain non-JSON provided and '_internal' objects for later.
     */
    var prevInternal = declViewModel._internal;
    var previ18n = declViewModel.i18n;
    var prevPreferences = declViewModel.preferences;

    /**
     * Load up a fresh 'declViewModel' based on the original JSON data.
     */
    viewModelProcessingSvc.processViewModel( origDeclViewModelJson ).then(
        function _processViewModelResult( newDeclViewModel ) {
            var i18nChanged = false;

            _.forEach( boundProps, function( propPath ) {
                /**
                 * We are only interested in the ones that effect 'data' defined properties. Leave the other
                 * '_internal' cases (messages, conditions, etc.)
                 */
                if( /^data\./.test( propPath.path ) ) {
                    var dataPath = propPath.path.substring( 5 );

                    if( viewModelProcessingSvc.updateDataProperty( dataPath, newDeclViewModel, declViewModel ) ) {
                        i18nChanged = true;
                    }
                }

                /**
                 * Update binding of 'command' defined properties.
                 */
                if( /^commands\./.test( propPath.path ) ) {
                    if( viewModelProcessingSvc.updateDataProperty( propPath.path, newDeclViewModel, declViewModel ) ) {
                        i18nChanged = true;
                    }
                }
            } );

            /**
             * Move over to the given 'declViewModel' any just loaded properties. Note:
             * <P>
             * _.assign( declViewModel, newDeclViewModel );
             */

            /**
             * DEBUG: Announce properties on existing 'declViewModel' that were NOT part of the original JSON 'data'
             * defined properties.
             */
            if( _logNonUpdatedProperties ) {
                /**
                 * Log members from the given 'declViewModel' which are not part of the just loaded data.
                 */
                for( var member in declViewModel ) {
                    if( !newDeclViewModel.hasOwnProperty( member ) ) {
                        if( member !== 'preferences' && member !== 'i18n' ) {
                            logger.info( 'Property: ' + member +
                                ' was not updated as part of an appCtxService change.' );
                        }
                    }
                }
            }

            /**
             * We are done with this temporary DeclViewModel, free up it's resources.
             */
            newDeclViewModel._internal.destroy( true );

            /**
             * Re-apply all the previous 'internal' properties.
             */
            if( prevInternal ) {
                declViewModel._internal = prevInternal;
            }

            /**
             * Restore the previous 'preference' strings so that they can be used to replace bound properties on the
             * 'declViewModel.
             */
            if( prevPreferences ) {
                declViewModel.preferences = prevPreferences;
            }

            /**
             * Restore the previous 'i18n' strings so that they can be used to replace bound properties on the
             * 'declViewModel.
             */
            if( previ18n ) {
                declViewModel.i18n = previ18n;

                if( i18nChanged ) {
                    viewModelProcessingSvc.updateI18nTexts( declViewModel, declViewModel, 0 );
                }
            }

            uwPropertySvc.triggerDigestCycle();
        } );
};

/**
 * Process onEvent section to registration event handlers
 *
 * @param {Object} declViewModel - The object loaded from the DeclViewModel JSON file.
 *
 * @param {Object} eventsToRegister - Event registration object
 *
 * @param {Boolean} limitEventScope - (Optional) If true will make event listeners only listen to events fired by
 *            the current view model
 *
 * @return {ObjectArray} Array of the event subscriptions to be used late to unsubscribe from the given event
 *         topics.
 */
var _processEventRegistration = function( declViewModel, eventsToRegister, limitEventScope, subPanelContext ) {
    var subDefs = [];

    _.forEach( eventsToRegister, function( eventObj ) {
        if( eventObj.eventId ) {
            subDefs.push( eventBus.subscribe( eventObj.eventId, function( context ) { // eslint-disable-line complexity
                debugService.debug( 'events', declViewModel._internal.panelId, eventObj.eventId );

                if( limitEventScope && context._source !== declViewModel._internal.modelId ) {
                    return;
                }

                // Check if the event source is set to 'current' and _source id is available.
                // If yes, make event listeners only listen to events fired by the current view model instance.
                if( eventObj.eventSource === 'current' && context._source && context._source !== declViewModel._internal.modelId ) {
                    return;
                }

                if( !declUtils.isValidModelAndEventData( declViewModel, context ) ) {
                    logger.error( '_processEventRegistration: ' + 'Invalid input: eventId=' + eventObj.eventId );
                    return;
                }

                var matched = true;

                /**
                 * @deprecated : 'criteria' is deprecated we should use condition instead.
                 */
                _.forEach( eventObj.criteria, function( value, key ) {
                    // For panel change events, the context doesn't have a scope, so check the properties on context directly.
                    if( _.get( context.scope, key ) !== value && _.get( context, key ) !== value ) {
                        matched = false;
                    }
                } );

                /**
                 * "onEvent": [ { "eventId": "someEvent", "condition": "conditions.shouldIDoSomething",
                 * "action":"doSomething" } ]
                 */
                var conditionResult = false;

                if( eventObj.condition ) {
                    var conditionExpression = null;

                    if( _.startsWith( eventObj.condition, 'conditions.' ) ) {
                        var conditionObject = _.get( declViewModel._internal, eventObj.condition );

                        conditionExpression = conditionObject.expression;
                    } else {
                        conditionExpression = eventObj.condition;
                    }

                    conditionResult = conditionSvc.evaluateCondition( {
                        data: declViewModel,
                        ctx: appCtxSvc.ctx
                    }, conditionExpression, context );

                    // if conditionResult is undefined or null we should consider result as false.
                    if( !conditionResult ) {
                        conditionResult = false;
                    }
                }

                var isEventExecutable = eventObj.condition && conditionResult || eventObj.criteria && matched ||
                    !( eventObj.condition || eventObj.criteria );
                if( logger.isDeclarativeLogEnabled() ) {
                    debugService.debugEventSub( eventObj, declViewModel, context, isEventExecutable );
                }
                if( isEventExecutable ) {
                    var inputArgs = null;
                    // Store the context eventData on declViewModel's eventData
                    if( eventObj.cacheEventData ) {
                        if( eventObj.eventId ) {
                            if( !declViewModel.eventMap ) {
                                declViewModel.eventMap = {};
                            }
                            declViewModel.eventMap[ eventObj.eventId ] = context;
                        }
                        declViewModel.eventData = context;
                    }
                    // If an event has some eventData and the same eventdata is required in the action,
                    // associated with event, then user can construct inputArgs.
                    // "eventId": "AWEvent.test",
                    //     "action": "fireSaveEdit",
                    //         "inputArgs": {
                    //         "param1": "{{eventData.operation1}}",
                    //         "param3": {
                    //             "param4": "{{eventData.operation4}}",
                    //             "param5": "{{eventData.operation5}}"
                    //         }
                    //     }
                    // Later the same input Args can be reused in action through {{parameters.param1}}.

                    if( eventObj.inputArgs ) {
                        var contextObj = {
                            eventData: context
                        };
                        inputArgs = _.cloneDeep( eventObj.inputArgs );
                        if( inputArgs ) {
                            try {
                                declDataCtxService.applyScope( declViewModel, inputArgs, null, contextObj, null );
                            } catch ( error ) {
                                throw new Error( error );
                            }
                        }
                    }

                    if( eventObj.message ) {
                        var allMessages = _.cloneDeep( declViewModel._internal.messages );
                        if( !context.scope ) {
                            context.scope = {
                                data: declViewModel,
                                ctx: appCtxSvc.ctx,
                                parameters: inputArgs ? inputArgs : null
                            };
                        }
                        messagingSvc.reportNotyMessage( declViewModel, allMessages, eventObj.message,
                            context.scope );
                    } else if( context && context.scope ) {
                        context.scope.parameters = inputArgs ? inputArgs : null;
                        exports.executeCommand( declViewModel, eventObj.action, context.scope );
                    } else {
                        var scope = {
                            data: declViewModel,
                            ctx: appCtxSvc.ctx,
                            parameters: inputArgs ? inputArgs : null,
                            subPanelContext: subPanelContext
                        };
                        exports.executeCommand( declViewModel, eventObj.action, scope );
                    }
                }
            }, 'viewModelService' ) );
        }
    } );

    return subDefs;
};

/**
 * Load any dependent modules, register any necessary events and populate the resolved 'declViewModel' object with
 * any data that is bound to various values including localized messages.
 *
 * @param {Object} declViewModelJson - Loaded JSON Object for the 'declViewModel' to populate.
 *            <P>
 *            Note: The JSON contents are actually represented in the 'data' property of this object.
 *
 * @param {Object} declViewModelTarget - (Optional) If specified, the data from the given 'declViewModel' will be
 *            merged into this object (e.g viewModel of subPanel is merged in the parent panel's viewModel)
 *
 * @param {String} subPanelId - (Optional) Id of the sub-panel in case the passed viewModelUrl belongs to a
 *            sub-panel
 * @param {Boolean} limitEventScope - (Optional) If true will make event listeners only listen to events fired by
 *            the current view model
 * @param {String} cacheI18nKey - (Optional) Key value which refers to processed i18n in cached i18n Map.
 *
 * @param {Object} subPanelContext - (Optional) Subpanlecontext attribute of aw-include directive
 *
 * @return {Promise} Resolved with the resulting 'declViewModel' resulting from loading the given DeclViewModel's
 *         JSON.
 */
export let populateViewModelPropertiesFromJson = function( declViewModelJson, declViewModelTarget, subPanelId,
    limitEventScope, cacheI18nKey, subPanelContext ) {
    if( !declViewModelJson ) {
        return AwPromiseService.instance.reject( 'No ViewModel JSON object specified' );
    }

    if( declViewModelTarget ) {
        if( !declViewModelTarget._internal.eventSubscriptions ) {
            return AwPromiseService.instance.reject( 'Target ViewModel missing required event property' );
        }

        if( !declViewModelTarget._internal.origDeclViewModelJson ) {
            return AwPromiseService.instance.reject( 'Target ViewModel missing required JSON object property' );
        }
    }

    /**
     * Process the JSON into a new 'declViewModel' and Move/Merge the properties just loaded into the resolved
     * 'declViewModel'.
     */
    return viewModelProcessingSvc.processViewModel( declViewModelJson, subPanelContext ).then(
        function( newDeclViewModel ) {
            var jsonData = declViewModelJson;

            /**
             * Determine the object to be 'resolved' (i.e. a new one or an existing 'target')
             */
            var resDeclViewModel;

            if( declViewModelTarget ) {
                resDeclViewModel = declViewModelTarget;

                /**
                 * Consolidate 'fresh' JSON properties into the given 'target'
                 * <P>
                 * Move all of the now populated 'data' properties into the 'target'
                 */
                _.forEach( jsonData.data, function( propValue, propName ) {
                    resDeclViewModel[ propName ] = newDeclViewModel[ propName ];
                } );

                resDeclViewModel.dataProviders = declUtils.consolidateObjects( resDeclViewModel.dataProviders,
                    newDeclViewModel.dataProviders );

                resDeclViewModel.grids = declUtils.consolidateObjects( resDeclViewModel.grids,
                    newDeclViewModel.grids );

                resDeclViewModel.columnProviders = declUtils.consolidateObjects( resDeclViewModel.columnProviders,
                    newDeclViewModel.columnProviders );

                resDeclViewModel.chartProviders = declUtils.consolidateObjects( resDeclViewModel.chartProviders,
                    newDeclViewModel.chartProviders );

                resDeclViewModel.commands = declUtils.consolidateObjects( resDeclViewModel.commands,
                    newDeclViewModel.commands );

                resDeclViewModel.commandHandlers = declUtils.consolidateObjects( resDeclViewModel.commandHandlers,
                    newDeclViewModel.commandHandlers );

                resDeclViewModel.commandPlacements = declUtils.consolidateObjects(
                    resDeclViewModel.commandPlacements, newDeclViewModel.commandPlacements );

                // Consolidate all properties from view model object in newDeclViewModel
                var vmo = newDeclViewModel.vmo;
                if( vmo ) {
                    if( jsonData.data.objects ) {
                        // Loop through the objects in jsonData, jsonData may contain multiple vmo in case of object set.
                        //                            _.forEach( jsonData.data.objects, function( dataPropValue, dataPropName ) {
                        //                                var newVmo = resDeclViewModel.attachModelObject( vmo.uid, jsonData.data.operationName,
                        //                                    jsonData.data.owningObjUid, dataPropValue[0] );
                        //                                if( dataPropValue[0].selected ) {
                        //                                    resDeclViewModel.vmo = newVmo;
                        //                                }
                        //                            } );
                        // The above code is no longer required. As there is no need to create a separate viewModelobject instance of
                        // of the same model object multiple times (declViewModelObject.objects and declViewModelObject.vmo),
                        // we already created  resDeclViewModel.vmo instance while forming the
                        // newDeclViewModel.
                        // Also difficult to determine which widgets are binded to which viewModel Object
                        resDeclViewModel.vmo = newDeclViewModel.vmo;
                        resDeclViewModel = declUtils.consolidateObjects( resDeclViewModel,
                            newDeclViewModel.vmo.props );
                        resDeclViewModel.attachEvents();
                    } else {
                        resDeclViewModel.vmo = resDeclViewModel.attachModelObject( vmo.uid,
                            jsonData.data.operationName, jsonData.data.owningObjUid );
                    }
                }

                resDeclViewModel._internal.consolidateJsonData( jsonData );
                newDeclViewModel._internal.destroy( false );
            } else {
                resDeclViewModel = newDeclViewModel;

                /**
                 * Move over fresh JSON properties
                 */
                resDeclViewModel._internal.setJsonData( jsonData );

                /**
                 * Object used to hold details of context changes that are being delayed (debounced).
                 */
                resDeclViewModel._internal.pendingContextChanges = {};

                /**
                 * pingUpdateViewModelInternal
                 *
                 * @param {*} context todo
                 * @param {*} declViewModel todo
                 */
                var pingUpdateViewModelInternal = function( context, declViewModel ) {
                    if( _logCtxPathActivity_1 ) {
                        logger.info( 'appCtx.register Debounce: ' + context.name );
                    }

                    if( !declViewModel._internal.isDestroyed ) {
                        var contextChanges = resDeclViewModel._internal.pendingContextChanges;

                        resDeclViewModel._internal.pendingContextChanges = {};

                        _updateViewModel( contextChanges, declViewModel );
                    }
                };
                /**
                 * This function is used to buffer up some of the appCtx 'noise' and delay the 'update' until things
                 * calm down a bit.
                 *
                 * When running in test mode this function will not be debounced
                 *
                 * @private
                 */
                resDeclViewModel._internal.pingUpdateViewModel = app.isTestMode ? pingUpdateViewModelInternal : _.debounce( pingUpdateViewModelInternal, 100, {
                    maxWait: 10000,
                    trailing: true,
                    leading: false
                } );

                /**
                 * Listener for appCtx registration events
                 */
                var subDef1 = eventBus.subscribe( 'appCtx.register', function( context ) {
                    if( context ) {
                        if( _logCtxPathActivity_1 ) {
                            logger.info( 'appCtx.register Subscribe: ' + context.name );
                        }

                        resDeclViewModel._internal.pendingContextChanges[ context.name ] = context.value;

                        resDeclViewModel._internal.pingUpdateViewModel( context, resDeclViewModel );
                    }
                }, 'viewModelService' );

                /**
                 * Listener for command panel 'reveal' events
                 */
                var subDef2 = eventBus.subscribe( 'awPanel.reveal', function( context ) {
                    /**
                     * Only call the default "reveal" action on reveal of main panel which doesn't have a panel ID
                     * in this context. Check if the view model available on scope is same as the result view model.
                     * In case two declarative panels are displayed on a page, then it results in two subscriptions
                     * to the panel reveal event. Use the decl view model comparison to execute action against
                     * reveal for appropriate panel
                     */
                    if( context.scope && !context.scope.panelId ) {
                        var declViewModel = context.scope.data;

                        if( declViewModel === resDeclViewModel ) {
                            exports.executeCommand( declViewModel, 'reveal', context.scope );
                        }
                    }
                }, 'viewModelService' );

                /**
                 * Remember these subscriptions to allow unsubscribe later.
                 */
                resDeclViewModel._internal.eventSubscriptions.push( subDef1 );
                resDeclViewModel._internal.eventSubscriptions.push( subDef2 );
            }

            /**
             * Register any fresh 'eventBus' conditions
             */
            if( jsonData.onEvent ) {
                var eventSubscriptions = _processEventRegistration( resDeclViewModel, jsonData.onEvent,
                    limitEventScope, subPanelContext );
                if( !declUtils.isNil( subPanelId ) ) {
                    if( !resDeclViewModel._internal.subPanelId2EventSubscriptionsMap[ subPanelId ] ) {
                        resDeclViewModel._internal.subPanelId2EventSubscriptionsMap[ subPanelId ] = eventSubscriptions;
                    } else {
                        _.forEach( eventSubscriptions, function( eventSubs ) {
                            resDeclViewModel._internal.subPanelId2EventSubscriptionsMap[ subPanelId ].push( eventSubs );
                        } );
                    }
                } else {
                    resDeclViewModel._internal.eventSubscriptions = _.union(
                        resDeclViewModel._internal.eventSubscriptions, eventSubscriptions );
                }
            }

            /**
             * Queue up loading and processing of the other model resources
             */
            var importsPromise = null;

            if( jsonData.imports ) {
                importsPromise = declUtils.loadImports( jsonData.imports, AwPromiseService.instance );
            }

            var prefPromise = null;

            if( jsonData.preferences && jsonData.preferences.length > 0 ) {
                prefPromise = preferenceSvc.getMultiStringValues( jsonData.preferences );
            }

            var i18nPromise = null;

            if( jsonData.i18n ) {
                i18nPromise = awDuiLocalizationSvc.populateI18nMap( jsonData.i18n, cacheI18nKey );
            }

            /**
             * Wait for them all to complete
             */
            return AwPromiseService.instance.all( [ resDeclViewModel, prefPromise, i18nPromise, importsPromise ] ).then(
                function( results ) {
                    resDeclViewModel.preferences = declUtils.consolidateObjects( resDeclViewModel.preferences,
                        results[ 1 ] );

                    resDeclViewModel.i18n = declUtils.consolidateObjects( resDeclViewModel.i18n, results[ 2 ] );

                    viewModelProcessingSvc.updateI18nTexts( resDeclViewModel, resDeclViewModel, 0 );

                    return resDeclViewModel;
                } );
        } );
};

/**
 * Insert the HTML string into the 'ctrlElement' and ask AngularJS to 'compile' it (thus initializing any inserted
 * directives and controller) then set the DeclViewModel into the dataCtxNode as the 'dataCtxNode.data' property.
 * Also, setup to call the 'destroy' method on the DeclViewModel when the dataCtxNode is destroyed.
 *
 * @param {String} htmlString - The HTML string to be inserted.
 *
 * @param {Element} parentElement - The DOM element the controller and 'inner' HTML content will be added to.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {NgElement} ctrlElement - The AngularJS Element where the 'controller' is defined.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel the controller is associated with.
 *
 * @param {Boolean} addCtrlToParent - TRUE if the 'parentElement' should be empties and the 'ctrlElement' added as
 *            the sole child.
 */
export let finishInsert = function( htmlString, parentElement, ctrlElement, declViewModel, addCtrlToParent ) {
    ctrlElement.html( htmlString );

    if( addCtrlToParent ) {
        $( parentElement ).empty();
        $( parentElement ).append( ctrlElement );
    }

    ngUtils.include( parentElement, ctrlElement, appCtxSvc, declViewModel );

    var dataCtxNode = ngModule.element( ctrlElement ).scope();

    exports.setupLifeCycle( dataCtxNode, declViewModel );
};

/**
 * The function will attempt to locate the 'nearest' 'declViewModel' in the 'dataCtxTree' starting at the given
 * 'dataCtxNode'.
 *
 * @param {Object} dataCtxNode - The leaf 'dataCtxNode' (a.k.a AngularJS '$scope') in the 'dataCtxTree' to start the
 *            lookup of the 'declViewModel'.
 *
 * @param {Boolean} setInScope - TRUE if, when found, the 'declViewModel' and 'appCtxService.ctx' should be set as
 *            the 'data' and 'ctx' properties (respectively) on the given dataCtxNode object.
 *
 * @return {DeclViewModel} The 'declViewModel' found.
 *         <P>
 *         Note: This function will throw an exception if the 'declViewModel' is NOT found.
 */
export let getViewModel = function( dataCtxNode, setInScope ) {
    return declUtils.findViewModel( dataCtxNode, setInScope, appCtxSvc );
};

/**
 * Inject the DeclViewModel's View HTML into the DOM
 *
 * @param {DeclViewModel} declarativeViewModel - The 'declViewModel' associated with the 'view' being inserted.
 *
 * @param {Object} declarativeView - The View template HTML for the given 'declViewModel'.
 *
 * @param {Element} parentElement - The DOM element the controller (and 'inner' HTML content) will be added to IF
 *            the 'addCtrlToParent' is TRUE.
 *            <P>
 *            Note: All existing 'child' elements of this 'parent' will be removed.
 *
 * @param {NgElement} ctrlElement - The AngularJS Element where the 'controller' is defined.
 *
 * @param {Boolean} addCtrlToParent - TRUE if the 'parentElement' should be empties and the 'ctrlElement' added as
 *            the sole child.
 *
 * @param {String} panelId - (Optional) The ID of the sub-panel being inserted.
 *
 * @return {Promise} The promise will be resolved with the input 'declViewModel' object when the operation is
 *         complete.
 */
export let insertViewTemplate = function( declarativeViewModel, declarativeView, parentElement, ctrlElement,
    addCtrlToParent, panelId ) {
    /**
     * Save panel id of the sub-panel that has been inserted to main-panel.
     */
    if( panelId ) {
        declarativeViewModel.addSubPanel( panelId );
    }

    exports.finishInsert( declarativeView, parentElement, ctrlElement, declarativeViewModel, addCtrlToParent );

    return AwPromiseService.instance.resolve( declarativeViewModel );
};

/**
 * Initialize the binding connections (i.e. $watch) between condition expressions in the 'declViewModelJson' and
 * 'conditionState' in the given 'declViewModel'.
 *
 * @param {DeclViewModel} declViewModel - The populated 'declViewModel' Object to initialize the condition bindings
 *            with.
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') in the 'dataCtxTree' to use when resolving bond
 *            condition variables..
 */
export let bindConditionStates = function( declViewModel, dataCtxNode ) {
    conditionSvc.init( declViewModel, dataCtxNode, declViewModel._internal.conditions );
};

/**
 * @param {Object} dataCtxNode - The 'root' 'dataCtxNode' (aka '$scope') in the 'dataCtxTree' where the
 *            'declViewModel' was created and who's life cycle determines the life cycle of this 'declViewModel'.
 *
 * @param {DeclViewModel} declViewModel -
 */
export let setupLifeCycle = function( dataCtxNode, declViewModel ) {
    dataCtxNode.data = declViewModel;
    dataCtxNode.i18n = declViewModel.i18n;
    dataCtxNode.ctx = appCtxSvc.ctx;

    if( !dataCtxNode.conditions ) {
        exports.bindConditionStates( declViewModel, dataCtxNode );

        dataCtxNode.conditions = declViewModel.getConditionStates();
    }

    debugService.debug( 'lifeCycles', declViewModel._internal.panelId, 'mount' );

    if( declViewModel._internal.ports ) {
        if( !syncViewModelCacheService.get( 'syncViewModelCache' ) ) {
            syncViewModelCacheService.set( 'syncViewModelCache', {} );
        }
        const id = dataCtxNode.data._internal.modelId;
        const path = 'syncViewModelCache.' + dataCtxNode.data._internal.viewId;
        if( syncViewModelCacheService.get( path ) === null || syncViewModelCacheService.get( path ) === undefined ) {
            syncViewModelCacheService.set( 'syncViewModelCache', Object.assign( syncViewModelCacheService.get( 'syncViewModelCache' ), {
                [ dataCtxNode.data._internal.viewId ]: {
                    [ id ]: dataCtxNode
                }
            } ) );
        } else {
            syncViewModelCacheService.set( path, { ...syncViewModelCacheService.get( path ), [ id ]: dataCtxNode } );
        }
        dataCtxNode.ports = declViewModel._internal.ports;
    }

    /**
     * Here we are keeping the original scope id ( the first scope for which declViewModel is created and assigned)
     * in declViewModel. Only when the original scope is destroyed, the corresponding viewModelObject would be
     * destroyed. Any child scope which has the same declViewModel, when destroyed should not destroy the
     * declViewModel.
     * <P>
     * Note: We are adding a reference back to the 'original' dataCtxNode. This is being done to address some very
     * difficult cases when 'child' nodes are destroyed and valid events generated by them are later processed. The
     * process will use this reference to the 'original' to resolve the event processing.
     * <P>
     * This property is nulled out when this declViewModel is destroyed.
     * <P>
     * **** This property should not be used for any other purpose until we can determine it won't cause more memory
     * issues. *****
     */
    if( !dataCtxNode.data._internal.dataCtxNodeId ) {
        dataCtxNode.data._internal.dataCtxNodeId = dataCtxNode.$id;
        dataCtxNode.data._internal.origCtxNode = dataCtxNode;
    }

    /**
     * Setup to clean up properties on this declViewModel when it's 'original' dataCtxNode.
     */
    var handleDestroyEvent = function() {
        var declViewModel2 = dataCtxNode.data;
        var cleanupDataCtxNode = function() {
            // remove vm from the syncViewModelCacheService
            if( declViewModel2 && declViewModel2._internal && declViewModel2._internal.ports ) {
                syncViewModelCacheService.set( 'syncViewModelCache.' + declViewModel2._internal.viewId, null );
            }

            /**
             * This code ensures, Until unless the original scope is destroyed, the declViewModel would not be
             * destroyed.
             */
            if( declViewModel2 && declViewModel2._internal.dataCtxNodeId !== dataCtxNode.$id ) {
                dataCtxNode.data = null;
                dataCtxNode.conditions = null;
                dataCtxNode.ctx = null;
                dataCtxNode.i18n = null;
                dataCtxNode.dataProvider = null;
                dataCtxNode.eventMap = null;
                dataCtxNode.eventData = null;
                dataCtxNode.subPanelContext = null;
                return;
            }

            if( declViewModel2 ) {
                if( declViewModel2._internal.destroy ) {
                    declViewModel2._internal.destroy( true );
                } else {
                    logger.warn( 'Attempt to delete a "dataCtxNode.data" that did not have a destroy method: ' +
                        declViewModel2 );
                }
                dataCtxNode.conditions = null;
                dataCtxNode.data = null;
                dataCtxNode.ctx = null;
                dataCtxNode.i18n = null;
                dataCtxNode.dataProvider = null;
                dataCtxNode.eventMap = null;
                dataCtxNode.eventData = null;
                dataCtxNode.subPanelContext = null;
            }
        };
        debugService.debug( 'lifeCycles', declViewModel._internal.panelId, 'destroy' );
        var onUnmountAction = _.get( declViewModel, '_internal.lifecycleHooks.onUnmount' );
        if( onUnmountAction ) {
            declViewModel.isUnmounting = true;
            exports.executeCommand( declViewModel, onUnmountAction, dataCtxNode ).then( function() {
                cleanupDataCtxNode();
            } );
        } else {
            cleanupDataCtxNode();
        }
    };

    if( dataCtxNode.$$destroyed ) {
        trace( 'View model attached to destroyed scope', declViewModel, dataCtxNode );
        handleDestroyEvent();
    } else {
        dataCtxNode.$on( '$destroy', handleDestroyEvent );
    }

    var onInitAction = _.get( declViewModel, '_internal.lifecycleHooks.onInit' );
    if( onInitAction ) {
        exports.executeCommand( declViewModel, onInitAction, dataCtxNode );
    }
};

/**
 * return true for actionType dataProvider otherwise false
 * @param {string} actionOrProviderId - The name of command action or data provider to be executed.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel context to execute the command with.
 *
 * @returns {true|false} ...
 */
var _isDataProviderAction = function( actionOrProviderId, declViewModel ) {
    if( declViewModel._internal.actions ) {
        var action = declViewModel._internal.actions[ actionOrProviderId ];
        if( action && action.actionType === 'dataProvider' && declViewModel.dataProviders ) {
            return true;
        }
    }
    return false;
};

/**
 * return true for actionType other than dataProvider
 * @param {Object} actionOrProviderId - The name of command action or data provider to be executed.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel context to execute the command with.
 *
 * @returns {true|false} ...
 */
var _isAnAction = function( actionOrProviderId, declViewModel ) {
    return declViewModel._internal.actions && declViewModel._internal.actions[ actionOrProviderId ];
};

/**
 *
 * return true for dataProvider and false for action
 *
 * @param {String} actionOrProviderId - The name of command action or data provider to be executed.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel context to execute the command with.
 *
 * @returns {true|false} ...
 */
var _isDataProvider = function( actionOrProviderId, declViewModel ) {
    return declViewModel.dataProviders && declViewModel.dataProviders[ actionOrProviderId ];
};

/**
 * Execute command
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel context to execute the command with.
 *
 * @param {String} actionOrProviderId - The name of command action or data provider to be executed.
 *
 * @param {String} dataCtxNode - The AngularJS scope of this action command
 *
 * @returns {null|Promise} ...
 */
export let executeCommand = function( declViewModel, actionOrProviderId, dataCtxNode ) {
    if( !declUtils.isValidModelAndDataCtxNode( declViewModel, dataCtxNode ) ) {
        return AwPromiseService.instance.resolve();
    }

    var action = null;

    if( declViewModel._internal.actions ) {
        action = declViewModel._internal.actions[ actionOrProviderId ];
    }

    /**
     * If action is NOT specified, then check for dataProviders and if it's valid, initialize it. <br>
     * If action is specified, check for action type 'dataProvider', if so initialize the given data provider.
     */

    if( _isDataProviderAction( actionOrProviderId, declViewModel ) && action ) {
        /** action ID will be used for better logging */
        action.actionId = actionOrProviderId;
        return actionSvc.performDataProviderAction( declViewModel, action, dataCtxNode );
    } else if( _isAnAction( actionOrProviderId, declViewModel ) ) {
        declViewModel.getToken().addAction( action );
        /** action ID will be used for better logging */
        action.actionId = actionOrProviderId;
        if( action.deps ) {
            var doAction = function( depModuleObj ) {
                /**
                 * Check if the declViewModel got destroyed while we were waiting for the dependent module to be
                 * loaded. This can happen, for example, when multiple subscribers are listening to a common
                 * event like 'selection' and one of them (I'm look at you GWT) causes the panel the
                 * declViewModel is associated with to close (thus destroying the $scope and the declViewModel
                 * associated with it).
                 * <P>
                 * If so: There is nothing more that can be done with the declViewModel and we just want to log
                 * a warning about the situation and move on.
                 */
                if( declViewModel.isDestroyed() ) {
                    declUtils.logLifeCycleIssue( declViewModel, action, 'The command action was therefore not executed.',
                        'executeCommand' );
                } else {
                    /**
                     * Check if the $scope we need has been destroyed (due to DOM manipulation) since the action
                     * event processing was started.
                     */
                    var localDataCtx = declUtils.resolveLocalDataCtx( declViewModel, dataCtxNode );

                    // _deps will be undefined when try to load viewModelService inside itself
                    var _depModuleObj = depModuleObj;

                    if( !depModuleObj && action.deps === 'js/viewModelService' ) {
                        _depModuleObj = exports;
                    }

                    return actionSvc.executeAction( declViewModel, action, localDataCtx, _depModuleObj ).then( function() {
                        declViewModel.getToken().removeAction( action );
                    } ).catch( function( x ) {
                        declViewModel.getToken().removeAction( action );
                        return AwPromiseService.instance.reject( x );
                    } );
                }
            };

            var depModuleObj = declUtils.getDependentModule( action.deps );

            if( depModuleObj ) {
                return doAction( depModuleObj );
            }

            return declUtils.loadDependentModule( action.deps ).then( function( depModuleObject ) {
                return doAction( depModuleObject );
            } );
        }
        return actionSvc.executeAction( declViewModel, action, dataCtxNode, null ).then( function() {
            declViewModel.getToken().removeAction( action );
        } ).catch( function( x ) {
            declViewModel.getToken().removeAction( action );
            return AwPromiseService.instance.reject( x );
        } );
    } else if( _isDataProvider( actionOrProviderId, declViewModel ) ) {
        action = {};
        action.actionType = 'dataProvider';
        action.method = actionOrProviderId;
        return actionSvc.performDataProviderAction( declViewModel, action, dataCtxNode );
    }

    return AwPromiseService.instance.resolve();
};

/**
 * get the DeclViewModel for the given path
 *
 * @param {DeclViewModel} declViewModel - ??? FIXME Not needed after move to exposure of the DeclViewModel as an
 *            object on the dataCtxNode.
 *
 * @param {String} path Path from which to get the view model object
 *
 * @return {Object} returns view model object
 */
export let getViewModelObject = function( declViewModel, path ) {
    return _.get( declViewModel, path );
};

/**
 * Get declarative viewModel for the provided element.
 *
 * @param {DOMElement} element - Element to start search at.
 *
 * @return {Object} returns view model.
 */
export let getViewModelUsingElement = function( element ) {
    var ngEle = ngModule.element( element );
    var scope = ngEle.scope();
    if( scope ) {
        return exports.getViewModel( scope );
    }
    return undefined;
};

/**
 * This method initializes the condition service, register listeners for conditions using the given scope and also
 * creates a listener for condition for a dynamically created viewmodel property
 *
 * @param {Object} declViewModel - The object who properties will be updated when the associated conditions are
 *            updated.
 * @param {String} propertyName - the dynamically created propertyName who properties will be updated
 *                                         when the associated conditions are updated.
 * @param {Object} conditionObj - the conditions object could be
 * 1. {
 *      name: 'checkLabelName',
 *      expression: {
 *      "$source": "data.expirationDate.dateApi.dateValue",
 *      "$query": {
 *      "$lt": "Date({{data.creationDate.dateApi.dateValue}})"
 *       }
 *     }
 *    }
 *  OR
 * 2. {
 *         name: 'checkLabelName',
 *         expression: "data.lotNumber.dbValue.indexOf('PQ') == -1"
 *    }
 * @param {String} msgString - The message which will be shown if the validation criteria doesn't match
 *
 * @param {Object} dataCtxNode - The 'dataCtxNode' (aka '$scope') to register the expression watch against.
 */
export let attachValidationCriteria = function( declViewModel, propertyName, conditionObj, msgString, dataCtxNode ) {
    assert( propertyName, 'Proeprty Name is not defined' );

    var viewModelProperty = declViewModel[ propertyName ];
    assert( viewModelProperty, 'Unable to find propertyName in declViewModel' );
    uwPropertySvc.createValidationCriteria( viewModelProperty, conditionObj.name, msgString );
    conditionSvc.attachDynamicCondition( declViewModel, propertyName, conditionObj, dataCtxNode );
};

exports = {
    populateViewModelPropertiesFromJson,
    finishInsert,
    getViewModel,
    insertViewTemplate,
    bindConditionStates,
    setupLifeCycle,
    executeCommand,
    getViewModelObject,
    getViewModelUsingElement,
    attachValidationCriteria
};
export default exports;
/**
 * The service to process the view model.
 *
 * @member viewModelService
 * @memberof NgServices
 */
app.factory( 'viewModelService', () => exports );
