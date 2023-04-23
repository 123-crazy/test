// Copyright (c) 2020 Siemens

/**
 * This service is used to map the declarative resolve configuration to the ui router resolve state functionality.
 *
 * APIs :
 * updateResolveOnState():Create declarative function and update the state object with resolve declarative function.
 * @module js/stateResolveService
 */
import _ from 'lodash';
import 'js/actionService';

var exports = {};

/**
 * Create declarative functions from resolveAction object and set it on the state.resolve
 *
 * @param {Object} state - Routing state.
 *
 */
export let updateResolveOnState = function( state ) {
    state.resolve = state.resolve ? state.resolve : {};
    _.forEach( state.resolveActions, function( action, actionName ) {
        state.resolve[ actionName ] = [
            '$q', '$rootScope', '$injector', '$stateParams', 'viewModelProcessingFactory', 'actionService', 'viewModelService', 'appCtxService',
            function( _$q, _$rootScope, _$injector, _$stateParams, _vmProcFactory, _actionSvc, _viewModelService, _appCtxSvc ) {
                var defer = _$q.defer();
                var declarativeViewModelId = '__stateResolveSvc';
                var declViewModel = _vmProcFactory.createDeclViewModel( {
                    _viewModelId: declarativeViewModelId
                } );
                var dataCtxNode = _$rootScope.$new();
                dataCtxNode.name = declarativeViewModelId;
                dataCtxNode.ctx = _appCtxSvc.ctx;
                // Update the state params on app ctx.
                dataCtxNode.ctx.state = getStateParamsObject( _$stateParams );
                _viewModelService.setupLifeCycle( dataCtxNode, declViewModel );

                import( 'js/declUtils' ).then( function( declUtils ) {
                    declUtils.loadDependentModule( action.deps ).then( function( depModuleObj ) {
                        _actionSvc.executeAction( declViewModel, action, dataCtxNode, depModuleObj ).then( function success() {
                            defer.resolve();
                        }, function reject( error ) {
                            defer.reject( error );
                        } ).finally( function() {
                            dataCtxNode.$destroy();
                        } );
                    } );
                } );
                return defer.promise;
            }
        ];
    } );
};

/**
 * Get the state params object with processed params.
 *
 * @param {Object} stateParams - Routing state params.
 * @return {Object} params - Object of original state params and processed params.
 */
var getStateParamsObject = function( stateParams ) {
    return {
        params: stateParams,
        processed: processParameters( stateParams )
    };
};

/**
 * Filter parameters that are not set and build the new object.
 *
 * @param {Object} stateParams - Routing state params.
 * @return {Object} params - processed paramater object.
 */
var processParameters = function( stateParams ) {
    return Object.keys( stateParams )
        // Filter parameters that are not set
        .filter( function( param ) {
            return stateParams[ param ];
        } )
        // Build the new object
        .reduce( function( acc, nxt ) {
            acc[ nxt ] = stateParams[ nxt ];
            return acc;
        }, {} );
};

exports = {
    updateResolveOnState
};
export default exports;
