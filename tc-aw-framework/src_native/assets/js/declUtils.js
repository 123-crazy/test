// Copyright (c) 2020 Siemens

/* global afxDynamicImport afxWeakImport */

/**
 * Thue module defines helpful shared APIs and constants used throughout the DeclarativeUI code base.
 * <P>
 * Note: This modules does not create an injectable service.
 *
 * @module js/declUtils
 */
import app from 'app';
import $ from 'jquery';
import assert from 'assert';
import _ from 'lodash';
import logger from 'js/logger';
import appCtxSvc from 'js/appCtxService';
import parsingUtils from 'js/parsingUtils';
import browserUtils from 'js/browserUtils';

// Service
import AwPromiseService from 'js/awPromiseService';
import AwParseService from 'js/awParseService';
import AwBaseService from 'js/awBaseService';

var exports = {};

var MSG_1 = 'Required DeclViewModel not specified';

var MSG_PREFIX_1 = 'Invalid to process with destroyed DeclViewModel: ';

var MSG_PREFIX_2 = 'Invalid to process with destroyed DataContextNode: ';

/**
 * {StringAray} Props to include when logging the properties of a dseclAction.
 */
var _actionPropsToLog = [ 'actionId', 'actionType', 'method', 'serviceName', 'deps', 'steps' ];

/**
 * {Boolean} TRUE if activity interupted by a destroyed {DeclViewModel} should be logged to the log service.
 * <P>
 * Note: This flag is controlled by the existence of the 'logLifeCycleIssues' attribute in the current document's
 * URL.
 */
var _debug_logLifeCycleIssues = browserUtils.getUrlAttributes().logLifeCycleIssues !== undefined;

/**
 * Format a message with the given information and log a 'warning' if the 'logLifeCycleIssue' URL flag has been set.
 *
 * @param {DeclViewModel} declViewModel - (Optional) The {DeclViewModel} that was destroyed and thus caused the life
 * cycle issue.
 *
 * @param {DeclAction} action - (Optional) The {DeclAction} Being processed when the issue was detected.
 *
 * @param {String} consequence - (Optional) Text describing what is NOT going to happen since the {DeclViewModel}
 * has been destroyed.
 *
 * @param {String} methodName - Name of the method where the issues was found.
 *
 * @returns {String} Formatted message
 */
export let buildLifeCycleIssueMessage = function( declViewModel, action, consequence, methodName ) {
    var errorMsg = 'Attempted processing after an associated DeclViewModel was destroyed...';

    if( consequence ) {
        errorMsg += '\n';
        errorMsg += consequence;
    }

    if( declViewModel ) {
        errorMsg += '\n';
        errorMsg += 'DeclViewModel: ';
        errorMsg += declViewModel;
    }

    if( methodName ) {
        errorMsg += '\n';
        errorMsg += 'Method: ';
        errorMsg += methodName;
    }

    if( action ) {
        errorMsg += '\n';
        errorMsg += 'Action:';
        errorMsg += '\n';
        errorMsg += JSON.stringify( action, _actionPropsToLog, 2 );
    }

    return errorMsg;
};

/**
 * Format a message with the given information and log a 'warning' if the 'logLifeCycleIssue' URL flag has been set.
 *
 * @param {DeclViewModel} declViewModel - (Optional) The {DeclViewModel} that was destroyed and thus caused the life
 * cycle issue.
 *
 * @param {DeclAction} action - (Optional) The {DeclAction} Being processed when the issue was detected.
 *
 * @param {String} consequence - (Optional) Text describing what is NOT going to happen since the {DeclViewModel}
 * has been destroyed.
 *
 * @param {String} methodName - Name of the method where the issues was found.
 *
 * @returns {String} Formatted message
 */
export let logLifeCycleIssue = function( declViewModel, action, consequence, methodName ) {
    var errorMsg = exports.buildLifeCycleIssueMessage( declViewModel, action, consequence, methodName );

    if( _debug_logLifeCycleIssues ) {
        logger.warn( errorMsg );
    }

    return errorMsg;
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * an 'assert' failure will be thrown.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 */
export let assertValidModel = function( declViewModel ) {
    assert( declViewModel, MSG_1 );

    if( !declViewModel._internal || declViewModel._internal.isDestroyed ) {
        assert( false, MSG_PREFIX_1 + declViewModel );
    }
};

/**
 * Clone scope without copying angular scope's internal properties.
 *
 * @param {Object} scope - Object to clone.
 *
 * @return {Object} an object that holds data from provided Object
 */
export let cloneData = function( scope ) {
    var object = {};
    _.forOwn( scope, function( value, key ) {
        if( !_.startsWith( key, '$' ) ) {
            object[ key ] = value;
        }
    } );
    return object;
};

/**
 * update data for fileData
 *
 * @param {Object} fileData - key string value the location of the file
 * @param {Object} data the view model data object
 */
export let updateFormData = function( fileData, data ) {
    if( fileData && fileData.value ) {
        var form = $( '#fileUploadForm' );
        data.formData = new FormData( $( form )[ 0 ] );
        data.formData.append( fileData.key, fileData.value );
    }
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * an 'assert' failure will be thrown.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 */
export let assertValidModelWithOriginalJSON = function( declViewModel ) {
    assert( declViewModel, MSG_1 );

    if( !declViewModel._internal || declViewModel._internal.isDestroyed ) {
        assert( false, MSG_PREFIX_1 + declViewModel );
    }

    assert( declViewModel._internal.origDeclViewModelJson, 'Required DeclViewModel JSON object not specified' );
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * an 'assert' failure will be thrown.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 * @param {Object} dataCtxNode - The context object to test.
 */
export let assertValidModelAndDataCtxNode = function( declViewModel, dataCtxNode ) {
    assert( declViewModel, MSG_1 );

    if( !declViewModel._internal || declViewModel._internal.isDestroyed ) {
        assert( false, MSG_PREFIX_1 + declViewModel );
    }

    if( !declViewModel.isUnmounting && ( !dataCtxNode || dataCtxNode.$$destroyed ) ) {
        assert( false, MSG_PREFIX_2 + ( dataCtxNode ? dataCtxNode.$id : '???' ) + ' DeclViewModel=' + declViewModel );
    }
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * a 'warning' will be logged and this function will return FALSE.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 * @param {Object} dataCtxNode - The context object to test.
 *
 * @returns {Boolean} FALSE  if any of the given parameters does not exist, has been destroyed or has invalid
 * properties set. TRUE otherwise.
 */
export let isValidModelAndDataCtxNode = function( declViewModel, dataCtxNode ) {
    if( !declViewModel ) {
        if( _debug_logLifeCycleIssues ) {
            logger.warn( MSG_1 );
        }
        return false;
    }

    if( !declViewModel._internal || declViewModel._internal.isDestroyed ) {
        exports.logLifeCycleIssue( declViewModel, null, null, 'isValidModelAndDataCtxNode' );
        return false;
    }

    if( !declViewModel.isUnmounting && dataCtxNode && dataCtxNode.$$destroyed ) {
        if( _debug_logLifeCycleIssues ) {
            logger.warn( MSG_PREFIX_2 + dataCtxNode.$id + ' DeclViewModel=' + declViewModel );
        }
        return false;
    }

    return true;
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * an 'assert' failure will be thrown.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 * @param {Object} dataCtxNode - The context object to test.
 * @param {DeclAction} action - The declAction object to test.
 */
export let assertValidModelDataCtxNodeAndAction = function( declViewModel, dataCtxNode, action ) {
    assert( declViewModel, MSG_1 );

    if( declViewModel._internal.isDestroyed ) {
        assert( false, MSG_PREFIX_1 + declViewModel +
            ' actionType: ' + action.actionType +
            ' method: ' + action.method +
            ' deps: ' + action.deps );
    }

    if( !declViewModel.isUnmounting && ( !dataCtxNode || dataCtxNode.$$destroyed ) ) {
        assert( false, MSG_PREFIX_2 + ( dataCtxNode ? dataCtxNode.$id : '???' ) +
            ' DeclViewModel=' + declViewModel +
            ' actionType: ' + action.actionType +
            ' method: ' + action.method +
            ' deps: ' + action.deps );
    }
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * an 'assert' failure will be thrown.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 *
 * @param {Object} dataCtxNode - The context object to test.
 *
 * @param {DeclAction} action - The declAction object to test.
 *
 * @param {String} consequence - (Optional) Text describing what is NOT going to happen since the {DeclViewModel}
 * has been destroyed.
 *
 * @param {String} methodName - Name of the method where the issues was found.
 */
export let assertValidModelDataCtxNodeAndAction2 = function( declViewModel, dataCtxNode, action, consequence, methodName ) {
    assert( declViewModel, MSG_1 );

    if( declViewModel._internal.isDestroyed ) {
        assert( false, exports.buildLifeCycleIssueMessage( declViewModel, action, consequence, methodName ) );
    }

    if( !declViewModel.isUnmounting && ( !dataCtxNode || dataCtxNode.$$destroyed ) ) {
        assert( false, MSG_PREFIX_2 + ( dataCtxNode ? dataCtxNode.$id : '???' ) +
            exports.buildLifeCycleIssueMessage( declViewModel, action, consequence, methodName ) );
    }
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * an 'assert' failure will be thrown.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 * @param {Object} eventData - The object used in an event to test. Any optional dataCtxNode will be tested for
 *            validity.
 */
export let assertValidModelAndEventData = function( declViewModel, eventData ) {
    assert( declViewModel, MSG_1 );

    if( !declViewModel._internal || declViewModel._internal.isDestroyed ) {
        assert( false, MSG_PREFIX_1 + declViewModel );
    }

    if( eventData && eventData.scope && eventData.scope.$$destroyed ) {
        assert( false, MSG_PREFIX_2 + ( eventData.scope ? eventData.scope.$id : '???' ) + ' DeclViewModel=' + declViewModel );
    }
};

/**
 * Validate if any of the given parameters does not exist, has been destroyed or has invalid properties set. If so,
 * a 'warning' will be logged and this function will return FALSE.
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel to test.
 *
 * @param {Object} eventData - The object used in an event to test. Any optional dataCtxNode will be tested for
 *            validity.
 *
 * @returns {Boolean} FALSE  if any of the given parameters does not exist, has been destroyed or has invalid
 * properties set. TRUE otherwise.
 */
export let isValidModelAndEventData = function( declViewModel, eventData ) {
    if( !declViewModel ) {
        logger.warn( MSG_1 );
        return false;
    }

    if( !declViewModel._internal || declViewModel._internal.isDestroyed ) {
        logger.warn( MSG_PREFIX_1 + declViewModel );
        return false;
    }

    if( eventData && eventData.scope && eventData.scope.$$destroyed ) {
        logger.warn( MSG_PREFIX_2 + ( eventData.scope ? eventData.scope.$id : '???' ) + ' DeclViewModel=' + declViewModel );
        return false;
    }

    return true;
};

/**
 * Check if the given dataCtxNode we need has been destroyed (due to DOM manipulation?) since processing was
 * started.
 * <P>
 * If so: Use the dataCtxNode the DeclViewModel was originally created on.
 * <P>
 * Note: This case can happen when, say, an event is thrown by a 'source' data context that was destroyed before the
 * event was processed.
 *
 * @param {DeclViewModel} declViewModel - The {DeclDataModel} to check
 * @param {Object} dataCtxNode - The 'dataCtxNode' to return if NOT destroyed.
 *
 * @returns {Object} The dataCtxNode object to use.
 */
export let resolveLocalDataCtx = function( declViewModel, dataCtxNode ) {
    if( dataCtxNode.$$destroyed ) {
        return declViewModel._internal.origCtxNode;
    }

    return dataCtxNode;
};

/**
 * Return true if provided value is 'nil' (i.e. not null or undefined).
 *
 * @param {Object} value - The value to test.
 *
 * @returns {Boolean|null} true if provided value is 'nil' (i.e. not null or undefined).
 */
export let isNil = function( value ) {
    return value === undefined || value === null;
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
 * @param {AppCtxService} appCtxSvc - A reference to the service to set on the 'dataCtxNode' IFF 'setInScope' is
 *            TRUE.
 *
 * @return {DeclViewModel} The 'declViewModel' found.
 */
export let findViewModel = function( dataCtxNode, setInScope ) {
    /**
     * Check for the case where the declViewModel is already set on the given node.
     */
    if( dataCtxNode.data ) {
        if( setInScope && appCtxSvc && !dataCtxNode.ctx ) {
            dataCtxNode.ctx = appCtxSvc.ctx;
        }

        return dataCtxNode.data;
    }

    /**
     * Look for the model on a 'parent' node.
     */
    var currCtxNode = dataCtxNode;

    while( currCtxNode && !currCtxNode.data ) {
        currCtxNode = currCtxNode.$parent;
    }

    if( currCtxNode ) {
        if( setInScope ) {
            dataCtxNode.data = currCtxNode.data;

            if( appCtxSvc ) {
                dataCtxNode.ctx = appCtxSvc.ctx;
            }

            //if subPanelContext is available on scope then add it dataCtxNode
            if( currCtxNode.subPanelContext ) {
                dataCtxNode.subPanelContext = currCtxNode.subPanelContext;
            }

            /**
             * Setup to clean up these references when this particular 'dataCtxNode' is later destroyed.
             */
            if( dataCtxNode.$on ) {
                dataCtxNode.$on( '$destroy', function( data ) {
                    data.currentScope.data = null;
                    data.currentScope.ctx = null;
                } );
            }
        }

        return currCtxNode.data;
    }

    return null;
};

/**
 * Consolidate the second object's properties into the first one
 *
 * @param {Object} targetObj - The 'target' object to merge to
 * @param {Object} sourceObj - The 'source' object to be merge from
 *
 * @return {Object} The 'target' object, updated (or a new object set to the 'source' if the 'target' did not exist.
 */
export let consolidateObjects = function( targetObj, sourceObj ) {
    var returnObj = null;

    if( targetObj ) {
        returnObj = targetObj;

        _.forEach( sourceObj, function( n, key ) {
            returnObj[ key ] = n;
        } );
    } else if( sourceObj ) {
        returnObj = sourceObj;
    }

    return returnObj;
};

/**
 * Create custom event. Mainly for IE
 *
 * @param {String} eventName - Name of the event
 *
 * @param {Object} eventDetail - Object for event detail

 * @param {Object} canBubble -is bubble is up/down

 * @param {Object} isCancellable - event can ne canclable or not
 *
 * @return {DOMElement} created DOMElement
 */
export let createCustomEvent = function( eventName, eventDetail, canBubble, isCancellable ) {
    if( browserUtils.isNonEdgeIE ) {
        var evt = document.createEvent( 'CustomEvent' );
        evt.initCustomEvent( eventName, canBubble, isCancellable, eventDetail );
        return evt;
    }
    return new CustomEvent( eventName, {
        detail: eventDetail,
        bubbles: canBubble
    } );
};

/**
 * Evaluate condition expression
 *
 * @param {DeclViewModel} declViewModel - (Not Used) The model to use when evaluating.
 * @param {String} expression expression {note: currently supporting ==,!=,&&,>,>=,<,<=}
 * @param {Object} evaluationEnv - the data environment for expression evaluation
 * evaluation
 *
 * @return {Boolean} the evaluated condition result
 */
export let evaluateCondition = function( declViewModel, expression, evaluationEnv ) {
    let parse = AwParseService.instance;
    return parse( expression )( evaluationEnv );
};

/**
 * Evaluate condition expression
 *
 * @param {DeclViewModel} declViewModel - (Not Used) The model to use when evaluating.
 * @param {String} condition name of condition
 *
 * @return {String} the evaluated condition result
 */
export let getConditionExpression = function( declViewModel, condition ) {
    var conditionExpression = null;

    if( _.startsWith( condition, 'conditions.' ) ) {
        var conditionObject = _.get( declViewModel._internal, condition );

        conditionExpression = conditionObject.expression;
    } else {
        conditionExpression = condition;
    }
    return conditionExpression;
};

/**
 * Evaluate condition name
 *
 * @param {String} conditionString name of condition
 *
 * @return {String} the evaluated condition result
 */
export let getConditionName = function( conditionString ) {
    if( _.startsWith( conditionString, 'conditions.' ) ) {
        var index = conditionString.indexOf( '.' );
        return conditionString.substr( index + 1 );
    }
    return null;
};

/**
 * Get angular injected module if necessary
 *
 * @param {*} moduleObj - The loaded module
 * @return {Object} Updated dep module
 */
var getAngularModule = function( moduleObj ) {
    // this injector will be here unitl we shut the gate
    // but for the service which take out moduleServiceNameToInject
    // it is not loaded at run time
    let injector = app.getInjector();
    if( moduleObj ) {
        if( moduleObj.moduleServiceNameToInject && injector.has( moduleObj.moduleServiceNameToInject ) ) {
            return injector.get( moduleObj.moduleServiceNameToInject );
        } else if( moduleObj.prototype instanceof AwBaseService ) {
            return moduleObj.instance;
        }
    }
    return moduleObj;
};

/**
 * Get a module synchronously. Returns null if module is not loaded.
 *
 * @param {*} depModuleName -
 *
 * @returns {Object|null} Reference to module API object.
 */
export let getDependentModule = function( depModuleName ) {
    // LCS-299148 Beyond Angular: Clean up app.getInjector usage
    // afxWeakImport will be setup either in aw_polyfill or afxImport
    const depModule = afxWeakImport( depModuleName );
    if( depModule && Object.keys( depModule ).length ) {
        return getAngularModule( depModule );
    }
    return null;
};

/**
 * @param {String} depModule - The dependent module to load.
 *
 * @return {Promise} This promise will be resolved with the service (or module) API object when the given module has
 * been loaded.
 */
export let loadDependentModule = function( depModule ) {
    return AwPromiseService.instance( function( resolve, reject ) {
        if( depModule ) {
            afxDynamicImport( [ depModule ], function( depModule2 ) {
                resolve( getAngularModule( depModule2 ) );
            }, reject );
        } else {
            resolve();
        }
    } );
};

export let loadStaticDependentModule = function( depModule ) {
    if( depModule ) {
        return getAngularModule( depModule );
    }
    return undefined;
};

/**
 * @param {String[]} depModules - The dependent modules to load.
 * @return {Promise} This promise will be resolved when the given module has been loaded.
 */
export let loadDependentModules = function( depModules ) {
    return AwPromiseService.instance( function( resolve, reject ) {
        if( depModules && depModules.length > 0 ) {
            afxDynamicImport( depModules, function() {
                let retModulesMap = {};
                // LCS-299148 Beyond Angular: Clean up app.getInjector usage
                // This interface has bug for the else block, in no case it
                // will return arg as string which can run injector.get(arg)
                // who is using this interface will only supports angularJS service
                // with other limitaton
                //
                // They are:
                // - AFX
                //   - find function.deps in actionService
                //     - Example: src\thinclient\requirementscommandpanelsjs\src\viewmodel\Arm0ExportToRoundTripWordDocumentViewModel.json
                //     - in this use case after loadDependentModules, structure depModuleObj['appCtxService'] = appCtxSvc
                //       will be constructed. The downstream code will loop the whole depModuleObj and find the matching method
                //       - It is guessing filePath.includes(serviceName) -> for example 'js/appCtxService'.includes('appCtxService')
                //   - colorDecoratorService -> this caller is guessing fileName = 'js/' + serviceName :)
                //   - highlighterService -> this is fine which is a blind load
                // - AW
                //   - Ase0DualSaveHandler -> this is fine which is a blind load
                //   - aw-gantt.controller -> this is fine which is a blind load
                //
                // - Long term solution
                //   - Rewrite the interface to retrun array only. Refactor all caller
                // - Short term solution
                //   - try to fake fileName = 'js/' + serviceName to satisfy all our friends :)
                //
                // - How function definition works today
                //   - Not all function definition supports deps, only function in viewModel ( details see schema )
                //   - all the function imple should be sync otherwise you will get a unexpected promise object
                //   - It has different behavior in different place:
                //     - inputData.data: "{{function:testFunc}}"
                //       - When define {{function:testFunc}}, it SHOULD BE the key of the function definition.
                //       - While loading the deps by this function, it will blindly add key-module pare to depModules,
                //         For example you will get someActionService['functionSvcName'] = functionService, with all
                //         method provided by someActionService together...
                //       - During eval(declarativeDataCtxSvc.applyScope), it has the intellegence to loop depModules
                //         recursively to get the corrct function
                //         - But if a same function exist in someActionService, it will still take priority...
                //
                //     - outputData: "{{function: testFunc}}"
                //       - When define {{function:aaa}}, the aaa is NOT the key you defined in functions, BUT SHOULD
                //         BE the actual key in deps. For example:
                //         - You define { functions: { aaa: { functionName: showInfo }}}
                //         - When use it, we use {{function:showInfo}}, not {{function:aaa}}
                //       - No matter what you put in deps, it will always go to main dep (action dep)
                //         to try to evaluate your function name (declarativeDataCtxSvc.getOutput)
                let injector = app.getInjector();
                _.forEach( arguments, function( arg, idx ) {
                    if( arg.moduleServiceNameToInject ) {
                        retModulesMap[ arg.moduleServiceNameToInject ] = injector.get( arg.moduleServiceNameToInject );
                    } else {
                        let moduleName = depModules[ idx ].replace( /^.*\//, '' );

                        if( arg.prototype instanceof AwBaseService ) {
                            retModulesMap[ moduleName ] = arg.instance;
                        } else {
                            retModulesMap[ moduleName ] = arg;
                        }
                    }
                } );
                resolve( retModulesMap );
            }, reject );
        } else {
            resolve();
        }
    } );
};

/**
 * Get dirty properties of the view model object
 *
 * @param {Object} vmo - the view model object
 *
 * @return {Array} the dirty properties of the view model object
 */
export let getAllModifiedValues = function( vmo ) {
    var modifiedProperties = [];
    if( vmo ) {
        modifiedProperties = vmo.getDirtyProps();
    }
    return modifiedProperties;
};

/**
 * Loading the imported JS
 *
 * @param {StringArray} moduleNames - Array of module's to 'import'.
 *
 * @return {PromiseArray} Promise resolved with references to the module/service APIs of the given dependent
 *         modules.
 */
export let loadImports = function( moduleNames ) {
    return AwPromiseService.instance( function( resolve, reject ) {
        if( moduleNames && moduleNames.length > 0 ) {
            afxDynamicImport( moduleNames, function() {
                // LCS-299148 Beyond Angular: Clean up app.getInjector usage
                // this injector will be here unitl we shut the gate
                // but for the service which take out moduleServiceNameToInject
                // it is not loaded at run time
                var injector = app.getInjector();
                var moduleObjs = [];
                _.forEach( arguments, function( arg ) {
                    if( arg ) {
                        if( arg.moduleServiceNameToInject ) {
                            moduleObjs.push( injector.get( arg.moduleServiceNameToInject ) );
                        } else if( arg.prototype instanceof AwBaseService ) {
                            moduleObjs.push( arg.instance );
                        } else {
                            moduleObjs.push( arg );
                        }
                    }
                } );
                resolve( moduleObjs );
            }, reject );
        } else {
            resolve();
        }
    } );
};

/**
 * Update the properties of the view model property with new values
 *
 * @param {Object} dataObject - view model object.
 * @param {Object} dataProperty - view model object property.
 * @param {Object} dataPropertyValue - view model object property value.
 */
export let updatePropertyValues = function( dataObject, dataProperty, dataPropertyValue ) {
    dataObject[ dataProperty ] = dataPropertyValue;
};

/**
 * get type hierarchy from modleObject or view model Object
 *
 * @param {Object} dataObject - view model object.
 *
 *  @return {Array} - hierarchy of model object names

 */
export let getTypeHierarchy = function( dataObject ) {
    return dataObject.typeHierarchy || dataObject.modelType && dataObject.modelType.typeHierarchyArray;
};
/**
 *  get functions used in action input/output data
 */
let getActionDataFunc = function( value, functionsUsedInActions ) {
    if( typeof value === 'string' ) {
        var results = value.match( parsingUtils.REGEX_DATABINDING );
        if( results && results.length === 4 ) {
            var newVal = results[ 2 ];
            if( _.startsWith( newVal, 'function:' ) ) {
                functionsUsedInActions.push( newVal.replace( 'function:', '' ) );
            }
        }
    }
    return functionsUsedInActions;
};

/**
 * Get Function dependancies
 *
 * @param {Object} action - The action object
 *
 * @param {Object} viewModel - The view model
 *
 * @return {Array} - The Array contains function dependancies to load.
 */
export let getFunctionDeps = function( action, viewModel ) {
    var depsToLoad = [];
    var functionsUsedInActions = [];
    const functions = viewModel.functions;
    // get functions used in action input data
    if( action && action.inputData ) {
        _.forEach( action.inputData.request, function( value ) {
            getActionDataFunc( value, functionsUsedInActions );
        } );
    }
    if( action && action.outputData ) {
        _.forEach( action.outputData, function( value ) {
            getActionDataFunc( value, functionsUsedInActions );
        } );
    }
    if( action && action.dataParsers && action.dataParsers.length ) {
        _.forEach( action.dataParsers, dataParser => {
            const dataParserDef = viewModel.dataParseDefinitions[ dataParser.id ];
            const fnUsedInDataParsers = getFunctionUsageRecursive( dataParserDef );
            _.forEach( fnUsedInDataParsers, fnUsed => getActionDataFunc( fnUsed, functionsUsedInActions ) );
        } );
    }
    if( functions ) {
        _.forEach( functions, function( func ) {
            if( func.deps && depsToLoad.includes( func.deps ) === false &&
                functionsUsedInActions.includes( func.functionName ) ) {
                depsToLoad.push( func.deps );
            }
        } );
    }
    return depsToLoad;
};

const getFunctionUsageRecursive = ( object ) => {
    let values = [];
    _.each( object, ( value ) => {
        if( _.isString( value ) && value.startsWith( '{{function:' ) ) {
            values.push( value );
        } else if( _.isObject( value ) ) {
            values = values.concat( getFunctionUsageRecursive( value ) );
        }
    } );
    return values;
};

exports = {
    buildLifeCycleIssueMessage,
    logLifeCycleIssue,
    assertValidModel,
    cloneData,
    updateFormData,
    assertValidModelWithOriginalJSON,
    assertValidModelAndDataCtxNode,
    isValidModelAndDataCtxNode,
    assertValidModelDataCtxNodeAndAction,
    assertValidModelDataCtxNodeAndAction2,
    assertValidModelAndEventData,
    isValidModelAndEventData,
    resolveLocalDataCtx,
    isNil,
    findViewModel,
    consolidateObjects,
    createCustomEvent,
    evaluateCondition,
    getConditionExpression,
    getConditionName,
    getDependentModule,
    loadDependentModule,
    loadStaticDependentModule,
    loadDependentModules,
    getAllModifiedValues,
    loadImports,
    updatePropertyValues,
    getFunctionDeps,
    getTypeHierarchy
};
export default exports;
