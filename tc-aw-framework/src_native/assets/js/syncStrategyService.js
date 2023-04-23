/* eslint-disable require-jsdoc */
// Copyright (c) 2020 Siemens

/* global */

/**
 * This service is used to manage the sync strategies.
 *
 * @module js/syncStrategyService
 *
 */

import 'config/syncStrategy';
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import cfgSvc from 'js/configurationService';
import viewModelSvc from 'js/viewModelService';
import conditionSvc from 'js/conditionService';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import syncViewModelCacheService from 'js/syncViewModelCacheService';
import actionService from 'js/actionService';

let _syncStrategyMap;
const _vmPathCache = {};
var _strategies = null;
let _declViewModel = null;
var exports = {};

/**
 * Create the declartive viewModel from all combined syncStrategy.json
 *
 * @param {Object} viewModel - event data information with name and value of changes
 * @returns {Promise} promise with decl view model json
 */
function createViewModel( viewModel ) {
    viewModel._viewModelId = 'syncStrategyViewModel_' + Math.random();
    viewModel.skipClone = true;
    return viewModelSvc.populateViewModelPropertiesFromJson( viewModel, null, null, true )
        .then( function( populatedViewModelJson ) {
            return populatedViewModelJson;
        } );
}

export const loadConfiguration = function() {
    _strategies = cfgSvc.getCfgCached( 'syncStrategy' );
    _syncStrategyMap = new Map();
    // handler relatioin w.r.t to source
    if( !_vmPathCache.handlersRelation ) {
        _vmPathCache.handlersRelation = {};
    }

    // target relation with source
    if( !_vmPathCache.targetRelationToSource ) {
        _vmPathCache.targetRelationToSource = {};
    }

    /*
        <sourceView>: {
            "<port1>": ['<handler1>', '<handler2>'],
            "<port2>": ['<handler3>', '<handler4>'],
        }
    */
    for( var key in _strategies.syncStrategyHandlers ) {
        let handler = _strategies.syncStrategyHandlers[ key ];
        let syncStrategyId = handler.id;
        let synConfigObject = _strategies.syncStrategies[ syncStrategyId ];
        let sPort = synConfigObject.source.port;
        let sViewHierarchy = synConfigObject.source.view.split( '/' );
        let sView = sViewHierarchy[ sViewHierarchy.length - 1 ];

        if( !_syncStrategyMap.has( sView ) ) {
            _syncStrategyMap.set( sView, { ports: {} } );
        }
        if( !_syncStrategyMap.get( sView ).ports[ sPort ] ) {
            _syncStrategyMap.get( sView ).ports[ sPort ] = [];
        }

        _syncStrategyMap.get( sView ).ports[ sPort ].push( key );
    }
};

const getDeclViewModel = function() {
    return createViewModel( _strategies ).then( function( declViewModel ) {
        _declViewModel = declViewModel;
    } );
};

const _fireTargetAction = function( targetViewModel, value, strategyConfig ) {
    if( targetViewModel && targetViewModel.data ) {
        const targetPort = targetViewModel.data.getPortById( strategyConfig.target.port );
        // if port of target is present, then only fire action
        if( targetPort ) {
            // adding input object to targets port
            targetPort.syncObject = value;
            // adding ports as a sibling to data in VM.
            targetViewModel.ports = {
                ...targetViewModel.ports,
                [ strategyConfig.target.port ]: targetPort
            };
            return viewModelSvc.executeCommand( viewModelSvc.getViewModel( targetViewModel, true ), targetPort.onChangeAction, targetViewModel );
        }
        return AwPromiseService.instance.resolve( { errorCode: 'NO_TARGET_PORT_FOUND', errorMessage: `No port is configured for view: ${targetViewModel.data._internal.viewId}` } );
    }
    return AwPromiseService.instance.resolve();
};

const _executePreProcessingAction = function( actionName, syncContext, value ) {
    var deferred = AwPromiseService.instance.defer();
    var action = _strategies.actions[ actionName ];
    if( action.deps ) {
        /** action ID will be used for better logging */
        action.actionId = action.method;

        var doAction = function( depModuleObj ) {
            if( _declViewModel.isDestroyed() ) {
                logger.warn( 'Attempt to execute a command after its DeclViewModel was destroyed...' +
                    '\n' + 'Action was therefore not executed...continuing.' + '\n' + //
                    'DeclViewModel: ' + _declViewModel + '\n' + //
                    'Action       : ' + action );
                return AwPromiseService.instance.reject();
            }
            /**
             * Check if the $scope we need has been destroyed (due to DOM manipulation) since the action
             * event processing was started.
             */
            _declViewModel.value = value;
            var dataCtxNode = {
                data: _declViewModel,
                ctx: appCtxSvc.ctx,
                syncContext: syncContext
            };
            var localDataCtx = declUtils.resolveLocalDataCtx( _declViewModel, dataCtxNode );

            // _deps will be undefined when try to load viewModelService inside itself
            var _depModuleObj = depModuleObj;
            return actionService.executeAction( _declViewModel, action, localDataCtx, _depModuleObj, true );
        };
        var depModuleObj = declUtils.getDependentModule( action.deps );
        if( depModuleObj ) {
            return doAction( depModuleObj );
        }
        return declUtils.loadDependentModule( action.deps ).then( doAction );
    }
    return deferred.Promise;
};

const _runAction = function( handler, syncContext, value, targetViewModel, syncStrategyDef ) {
    return _executePreProcessingAction( handler.action, syncContext, value ).then( function( response ) {
        // response data is avaiable on response.actionData
        return _fireTargetAction( targetViewModel, response.actionData, syncStrategyDef );
    } );
};

const _executeHandlerAction = function( handler, syncContext, value, targetViewModel, syncStrategyDef ) {
    if( !_declViewModel ) {
        return getDeclViewModel().then( function() {
            return _runAction( handler, syncContext, value, targetViewModel, syncStrategyDef );
        } );
    }
    return _runAction( handler, syncContext, value, targetViewModel, syncStrategyDef );
};

const _evaluateActiveWhen = function( strategyObject, syncContext ) {
    return conditionSvc.evaluateConditionExpression( strategyObject, { syncContext: syncContext, ctx: appCtxSvc.ctx }, { clauseName: 'activeWhen', conditionList:_strategies } );
};

const _requestUpdate = function( viewId, modelId, portName, value ) {
    if( _syncStrategyMap.get( viewId ) && _syncStrategyMap.get( viewId ).ports[ portName ] ) {
        const srcObj = _vmPathCache[ viewId ][ modelId ];
        var allHandlers = _syncStrategyMap.get( viewId ).ports[ portName ];
        var syncExecutePromises = [];
        _.forEach( srcObj.handlers, function( handler, name ) {
            if( allHandlers.indexOf( name ) > -1 && handler.target ) {
                _.forEach( handler.target, ( targetViewModel ) => {
                    const syncStrategyDef = _strategies.syncStrategies[ handler.id ];
                    const syncContext = { targetViewModel: targetViewModel, sourceViewModel: srcObj.vm };
                    // evaluate activewhen
                    if( _evaluateActiveWhen( handler, syncContext ) ) {
                        if( handler.action ) {
                            var launch = _executeHandlerAction( handler, syncContext, value, targetViewModel, syncStrategyDef );
                            syncExecutePromises.push( launch );
                        } else {
                            syncExecutePromises.push( _fireTargetAction( targetViewModel, value, syncStrategyDef ) );
                        }
                    }
                } );
            }
        } );
        if( syncExecutePromises.length ) {
            return AwPromiseService.instance.all( syncExecutePromises );
        }
    }
    return AwPromiseService.instance.resolve( { errorCode: 'NO_ACTIVE_ACTION_FOUND', errorMessage: `No sync action fired for view: ${viewId} with port: ${portName}` } );
};

/**
 * triggerSyncStrategy
 * @param {Object} declViewModel decl view model of source
 * @param {String} inputData resolved inputData from actionService
 *
 * @return {Promise} A promise object resolved with the results of the sync action call (or rejected if there is a problem).
 */
export const updatePort = function( declViewModel, inputData ) {
    const viewId = declViewModel._internal.viewId;
    const modelId = declViewModel._internal.modelId;
    const portName = inputData.port;
    const newValue = inputData.syncObject;
    const vmCacheMap = syncViewModelCacheService.get( 'syncViewModelCache' );

    if( vmCacheMap[ viewId ] && vmCacheMap[ viewId ][ modelId ] ) {
        const sourceVm = vmCacheMap[ viewId ][ modelId ];
        if( sourceVm && sourceVm.data && sourceVm.data.getPortById( portName ) ) {
            let sourceVmData = sourceVm.data;
            let sPortObject = sourceVmData.getPortById( portName );
            sPortObject.syncObject = newValue ? newValue : sourceVm.ports[ portName ].syncObject;
            // adding ports as a sibling to data in VM.
            sourceVm.ports = {
                ...sourceVm.ports,
                [ portName ]: sPortObject
            };
            return _requestUpdate( viewId, modelId, portName, newValue );
        }
    }
    return AwPromiseService.instance.resolve( { errorCode: 'NO_PORT_FOUND', errorMessage: `No port is configured for view: ${viewId}` } );
};

export const getElementArray = function( viewPath ) {
    var elementString = '';
    var body = document.body;
    var elementPathArray = viewPath.split( '/' );
    if( elementPathArray && elementPathArray.length > 1 ) {
        // aw-include[name='commonRoot'] aw-include[name='commonLocation'] aw-include[name='showcaseMain']"
        elementPathArray.forEach( function( viewName ) {
            elementString = elementString + 'aw-include[name="' + viewName + '"] ';
        } );
    } else {
        // aw-include[view-id='commonRoot']
        var uniqueViewElement = body.querySelectorAll( 'aw-include[view-id="' + elementPathArray[ 0 ] + '"] ' );
        if( uniqueViewElement && uniqueViewElement.length === 1 ) {
            return uniqueViewElement;
        }
        // aw-include[name='commonRoot']
        elementString = 'aw-include[name="' + elementPathArray[ 0 ] + '"] ';
    }

    return body.querySelectorAll( elementString );
};

const getViewNameFromPath = function( viewPath ) {
    const viewPathArray = viewPath.split( '/' );
    return viewPathArray[ viewPathArray.length - 1 ];
};

const _addToCachePaths = function( declViewModel ) {
    const viewId = declViewModel.data._internal.viewId;
    const modelId = declViewModel.data._internal.modelId;
    const vmCacheMap = syncViewModelCacheService.get( 'syncViewModelCache' );

    const _cachingAsSource = () => {
        const allHandlersName = Object.values( _syncStrategyMap.get( viewId ).ports ).flatMap( h => h );

        const handlers = allHandlersName.reduce( ( handlersObj, name ) => {
            const { id, action, activeWhen } = _strategies.syncStrategyHandlers[ name ];
            if( exports.getElementArray( _strategies.syncStrategies[ id ].source.view ).length ) {
                const targetObj = _strategies.syncStrategies[ id ].target;
                const targetVm = vmCacheMap[ getViewNameFromPath( targetObj.view ) ];
                handlersObj[ name ] = {
                    id,
                    action,
                    activeWhen,
                    target: targetVm ? targetVm : {}
                };

                _vmPathCache.handlersRelation[ name ] = {
                    viewId: viewId,
                    modelId: modelId
                };
            }

            return handlersObj;
        }, {} );

        // handling for multiple entry for same viewId
        if( !_vmPathCache[ viewId ] ) {
            _vmPathCache[ viewId ] = {};
        }
        _vmPathCache[ viewId ][ modelId ] = {
            vm: declViewModel,
            handlers: handlers
        };
    };

    // vm act as source
    if( _syncStrategyMap.get( viewId ) && ( !_vmPathCache[ viewId ] || !_vmPathCache[ viewId ][ modelId ] ) ) {
        _cachingAsSource();
    }

    // vm act as target
    const asTarget = Object.entries( _strategies.syncStrategies ).reduce( ( acc, obj ) => {
        if( exports.getElementArray( obj[ 1 ].target.view ).length && getViewNameFromPath( obj[ 1 ].target.view ) === viewId ) {
            acc.push( obj[ 0 ] );
        }
        return acc;
    }, [] );

    const _cachingAsTarget = () => {
        const targetHandler = Object.entries( _strategies.syncStrategyHandlers ).reduce( ( acc, obj ) => {
            if( asTarget.indexOf( obj[ 1 ].id ) > -1 ) {
                acc[ obj[ 0 ] ] = obj[ 1 ];
            }
            return acc;
        }, {} );

        _.forEach( targetHandler, ( obj, key ) => {
            const matchingSrc = _vmPathCache.handlersRelation[ key ];
            if( matchingSrc && _syncStrategyMap.get( matchingSrc.viewId ) ) {
                const view = getViewNameFromPath( _strategies.syncStrategies[ obj.id ].target.view );
                const trgVm = vmCacheMap[ view ];
                const handlers = _vmPathCache[ matchingSrc.viewId ][ matchingSrc.modelId ].handlers;
                handlers[ key ].target = trgVm ? trgVm : {};

                if( !_vmPathCache.targetRelationToSource[ view ] ) {
                    _vmPathCache.targetRelationToSource[ view ] = [];
                }
                _vmPathCache.targetRelationToSource[ view ].push( {
                    source: {
                        viewId: matchingSrc.viewId,
                        modelId: matchingSrc.modelId
                    },
                    modelId: modelId,
                    handlerId: obj.id,
                    handlerName: key
                } );
            }
        } );
    };

    if( asTarget && asTarget.length ) {
        _cachingAsTarget();
    }
};

const _removeFromCachePaths = function( declViewModel ) {
    const viewId = declViewModel.data._internal.viewId;

    // clear relations
    _.forEach( _vmPathCache.handlersRelation, ( obj, key ) => {
        obj.viewId === viewId ? delete _vmPathCache.handlersRelation[ key ] : false;
    } );

    // clear target relation with source
    if( _vmPathCache.targetRelationToSource[ viewId ] ) {
        delete _vmPathCache.targetRelationToSource[ viewId ];
    }
    // clear vm from vmPathCache
    if( _vmPathCache[ viewId ] ) {
        delete _vmPathCache[ viewId ];
    }
};

const _updateOnMount = function( declVm ) {
    const syncExecutePromises = [];
    const viewId = declVm.data._internal.viewId;
    const allRelations = _vmPathCache.targetRelationToSource[ viewId ];
    allRelations && allRelations.forEach( ( relObj ) => {
        const strategyDef = _strategies.syncStrategies[ relObj.handlerId ];
        const sourceObj = _vmPathCache[ relObj.source.viewId ][ relObj.source.modelId ];
        // check whether the src is loaded or not
        if( sourceObj ) {
            const handler = _strategies.syncStrategyHandlers[ relObj.handlerName ];
            const sourceVm = sourceObj.vm;
            let srcPortData = sourceVm.ports ? sourceVm.ports[ strategyDef.source.port ] : null;
            const syncContext = { targetViewModel: declVm, sourceViewModel: sourceVm };

            // evaluate activewhen
            const isActive = _evaluateActiveWhen( handler, syncContext );
            if( isActive && handler.action ) {
                const launch = _executeHandlerAction( handler, syncContext, srcPortData, declVm, strategyDef );
                syncExecutePromises.push( launch );
            } else if( isActive ) {
                srcPortData = srcPortData ? srcPortData.syncObject : null;
                syncExecutePromises.push( _fireTargetAction( declVm, srcPortData, strategyDef ) );
            }
        }
    } );

    if( syncExecutePromises.length ) {
        return AwPromiseService.instance.all( syncExecutePromises );
    }
    return AwPromiseService.instance.resolve( { code: 'NO_OUTSTANDING_REQUEST_PRESENT', message: 'view model mount completed' } );
};

const _updateOnUnmount = function( declVm ) {
    const syncExecutePromises = [];

    const viewId = declVm.data._internal.viewId;
    const modelId = declVm.data._internal.modelId;
    if( _vmPathCache[ viewId ] ) {
        const allHandlers = Object.values( _vmPathCache[ viewId ][ modelId ] )[ 1 ];

        _.forEach( allHandlers, ( handler ) => {
            const syncStrategyDef = _strategies.syncStrategies[ handler.id ];
            syncExecutePromises.push( _fireTargetAction( Object.values( handler.target )[ 0 ], '', syncStrategyDef ) );
        } );
    }

    if( syncExecutePromises.length ) {
        return AwPromiseService.instance.all( syncExecutePromises );
    }
    return AwPromiseService.instance.resolve( { code: 'NO_OUTSTANDING_REQUEST_PRESENT', message: 'view model unmount completed' } );
};

/**
 * triggerSyncStrategy
 * @param {Object} declVm decl viewModel of view
 * @param {String} isMount if vm loaded, then true. if vm unloaded, then false
 *
 * @return {Promise} A promise object resolved with the results of the sync action call (or rejected if there is a problem).
 */
export const updateVmOnMountUnmount = function( declVm, isMount ) {
    if( isMount ) {
        // need to add entry to cache as src and trg
        _addToCachePaths( declVm );
        // target mounted
        return _updateOnMount( declVm );
    }
    // if source unmount, reset all the targets.
    _updateOnUnmount( declVm );
    // need to remove entry from cache
    return _removeFromCachePaths( declVm );
};

loadConfiguration();

exports = {
    updatePort,
    updateVmOnMountUnmount,
    loadConfiguration,
    getElementArray
};

export default exports;
