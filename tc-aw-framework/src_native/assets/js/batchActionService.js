// Copyright (c) 2020 Siemens

/**
 * This module provides a way for declarative framework to do outgoing calls in batch
 *
 * @module js/batchActionService
 *
 * @namespace batchActionService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import conditionSvc from 'js/conditionService';
import declarativeDataCtxService from 'js/declarativeDataCtxService';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import logger from 'js/logger';

/**
 * Define public API
 */
var exports = {};

/**
 * Execute the given 'all actions in Steps' using the given related parameters
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel the DeclAction is a member of.
 * @param {DeclAction} batchActions - The DeclAction to execute.
 * @param {Object} dataCtxNode - The data context to use during execution.
 *
 */

export let executeBatchActions = function( declViewModel, batchActions, dataCtxNode, actionService ) {
    var tasks = [];
    if( !declUtils.isValidModelAndDataCtxNode( declViewModel, dataCtxNode ) ) {
        return;
    }
    if( batchActions.steps ) {
        for( var step = 0; step < batchActions.steps.length; step++ ) {
            tasks.push( exports._executeActionWrapper( batchActions.steps[ step ], declViewModel, dataCtxNode, actionService ) );
        }
    }
    return tasks.reduce( function( promiseChain, task ) {
        return promiseChain.then( function( respData ) {
            return task( respData );
        } );
    }, AwPromiseService.instance.resolve() );
};

/**
 * Execute the given 'action' using the given related parameters
 *
 * @param {DeclViewModel} declViewModel - The DeclViewModel the DeclAction is a member of.
 * @param {DeclAction} step - The DeclAction to execute.
 * @param {Object} dataCtxNode - The data context to use during execution.
 * @param {Object} index - The current index of action in Steps
 * @param {Object[]} steps - The steps under 'batch' action type
 * @param {Object} actionService - The referance to action service
 * @param {Object} actionResp - the action Response
 *
 */

export let _executeActionWrapper = function( stepDef, declViewModel, dataCtxNode, actionService ) {
    return function( actionResp ) {
        var action = null;
        var outputFlag = false;
        var inputArgs = null;

        if( declViewModel._internal.actions ) {
            action = declViewModel._internal.actions[ stepDef.action ];
        }

        var conditionResult = false;

        if( stepDef.outputArg && action ) {
            outputFlag = true;
            action.outputArg = _.cloneDeep( stepDef.outputArg );
        }

        if( stepDef.condition ) {
            var conditionExpression = declUtils.getConditionExpression( declViewModel, stepDef.condition );
            if( conditionExpression !== null ) {
                conditionResult = conditionSvc.evaluateCondition( {
                    data: declViewModel,
                    ctx: appCtxSvc.ctx,
                    response: actionResp
                }, conditionExpression );
            }
            // if conditionResult is undefined or null we should consider result as false.
            if( !conditionResult ) {
                conditionResult = false;
            }
        }
        var isEventExecutable = stepDef.condition && conditionResult || !stepDef.condition;
        if( isEventExecutable ) {
            if( stepDef.inputArg ) {
                inputArgs = _.cloneDeep( stepDef.inputArg );
                try {
                    declarativeDataCtxService.applyScope( declViewModel, inputArgs, null, actionResp, null );
                } catch ( error ) {
                    throw new Error( error );
                }
                if( dataCtxNode && dataCtxNode.scope ) {
                    dataCtxNode.scope.parameters = inputArgs ? inputArgs : null;
                } else {
                    const  context = {
                        data: declViewModel,
                        ctx: appCtxSvc.ctx,
                        parameters: inputArgs ? inputArgs : null
                    };
                    dataCtxNode = { ...dataCtxNode, ...context };
                }
            }
            if( action.deps ) {
                /** action ID will be used for better logging */
                action.actionId = stepDef.action;

                var doAction = function( depModuleObj ) {
                    if( declViewModel.isDestroyed() ) {
                        logger.warn( 'Attempt to execute a command after its DeclViewModel was destroyed...' +
                            '\n' + 'Action was therefore not executed...continuing.' + '\n' + //
                            'DeclViewModel: ' + declViewModel + '\n' + //
                            'Action       : ' + stepDef.action );
                    } else {
                        /**
                         * Check if the $scope we need has been destroyed (due to DOM manipulation) since the action
                         * event processing was started.
                         */
                        var localDataCtx = declUtils.resolveLocalDataCtx( declViewModel, dataCtxNode );

                        // _deps will be undefined when try to load viewModelService inside itself
                        var _depModuleObj = depModuleObj;
                        return actionService.executeAction( declViewModel, action, localDataCtx, _depModuleObj, outputFlag );
                    }
                    return undefined;
                };
                var depModuleObj = declUtils.getDependentModule( action.deps );
                if( depModuleObj ) {
                    return doAction( depModuleObj );
                }
                return declUtils.loadDependentModule( action.deps ).then( doAction );
            }
            return actionService.executeAction( declViewModel, action, dataCtxNode, null, outputFlag );
        }
        return AwPromiseService.instance.resolve( actionResp );
    };
};

exports = {
    executeBatchActions,
    _executeActionWrapper
};
export default exports;
/**
 * The service to perform batch call of service
 *
 * @member batchActionService
 * @memberof NgServices
 *
 * @param {AwPromiseService.instance} AwPromiseService.instance - Service to use.
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {conditionService} conditionSvc - Service to use.
 * @param {declarativeDataCtxService} declarativeDataCtxService - Service to use.
 *
 * @returns {batchActionService} Instance of the service API object.
 */
app.factory( 'batchActionService', () => exports );
