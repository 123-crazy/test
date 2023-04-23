// Copyright (c) 2020 Siemens
/* eslint-disable valid-jsdoc */

/**
 * Defines {@link page.service} which serves basic queries related to page.
 *
 * @module js/page.service
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import State from 'js/awStateService';
import RootScope from 'js/awRootScopeService';
import appCtxService from 'js/appCtxService';
import workspaceValidationService from 'js/workspaceValidationService';
import _ from 'lodash';
import conditionService from 'js/conditionService';
import viewModelProcessingFactory from 'js/viewModelProcessingFactory';

/** object to export */
var exports = {};

/** Reference to $state service */

/** Reference to $parse service */

/** Reference to appCtxService service */

/** Reference to {@angular.$q} service */

/** Reference to {@$rootScope} */

/** Reference to {@workspaceValidationService} */

/**
 * Evaluate the provided expression against given environment.
 *
 * @param expression to evaluate.
 * @param evaluationEnvironment against expression to evaluate.
 * @return true if expression is true other-wise false
 */
var _evaluateExpression = function( expression, evaluationEnvironment ) {
    var declViewModel = viewModelProcessingFactory.createDeclViewModel( { _viewModelId: '__pageSvc' } );
    var verdict = conditionService.parseExpression( declViewModel, expression, evaluationEnvironment );
    declViewModel._internal.destroy();
    return verdict;
};

/**
 * Build evaluationEnvironment.
 *
 * @param state a state
 * @param additionalEvalEnvironment provided by consumer
 * @return evaluationEnvironment.
 */
var _buildEvaluationEnvironment = function( state, additionalEvalEnvironment ) {
    return _.assign( {}, {
        data: _.clone( state.data ),
        params: _.clone( state.params ),
        ctx: _.clone( appCtxService.ctx )
    }, additionalEvalEnvironment );
};

/**
 * The method resolve a promise with a list of states which confirm:<br>
 * <ul>
 * <li>The return state should be child state of the parentState, If parentState is not provided, the return state
 * should be child state of the current state's parent</li>
 * <li>And the state's visibleWhen should be evaluates to true.</li>
 * </ul>
 * The visibleWhen's expression can be as defined below while defining a state.<br>
 * <code>
 * "aState": {
 *     "data":{"priority":0},
 *     "controller": "controllerOfThisState",
 *     "parent": "parentState",
 *     "url": "/someUrl",
 *     "visibleWhen":{"expression":"ctx.someVariable==1"}
 *            }
 * </code>
 * Supported contexts: parentState.data, parentState.params, appCtxService.ctx any other additionalEvalEnvironment
 * provided to the method.
 *
 * @param {String} parentState is used to get the children, if not provided current state's parent ({@$state.current.parent})
 *            will be considered as a parent state.
 * @return promise <array>
 *
 */
export let getAvailableSubpages = function( parentState, additionalEvalEnv ) {
    var additionalEvalEnvironment = additionalEvalEnv ? additionalEvalEnv : {};
    var defferd = AwPromiseService.instance.defer();
    var availableStates = [];
    var _parentState = parentState;
    if( !_parentState ) {
        _parentState = State.instance.current.parent;
    }
    State.instance.get().filter( function( state ) {
        return state.parent === _parentState;
    } ).forEach(
        function( state ) {
            if( state.visibleWhen !== undefined && ( state.visibleWhen.expression || state.visibleWhen.condition ) ) {
                var expression = state.visibleWhen.expression ? state.visibleWhen.expression : state.visibleWhen.condition.expression;
                var visibleWhen = _evaluateExpression( expression,
                    _buildEvaluationEnvironment( State.instance.get( _parentState ),
                        additionalEvalEnvironment ) ); // should we consider parent state
                if( visibleWhen ) {
                    availableStates.push( state );
                }
            } else {
                availableStates.push( state );
            }
        } );
    var availableSubPages = availableStates.filter( function( aSubPage ) {
        return workspaceValidationService.isValidPage( aSubPage.name );
    } );
    defferd.resolve( availableSubPages );
    return defferd.promise;
};

/**
 * Return a default sub-page for a given page.This method uses
 * <code>state.data.priority<code> to decide a default sub-page.
 * A page will have a default sub-page X, if following are true:
 * 1) X is a visible(available) page.
 * 2) X has highest priority(state.data.priority) value among available sub-pages.
 * 3) X is available in current workspace.
 *
 * @param {Object} page , a state object.
 * @return promise<page>
 */
export let getDefaultSubPage = function( page ) {
    return getAvailableSubpages( page ).then( function( availableSubPages ) {
        if( availableSubPages && availableSubPages.length > 0 ) {
            availableSubPages.sort( function( o1, o2 ) {
                return _.parseInt( o1.data.priority ) - _.parseInt( o2.data.priority );
            } );
            return availableSubPages[ 0 ];
        }
        return null;
    } );
};

/**
 * If a (parent) page(or location) is revealed application should should find out a visible sub-page (sub-location)
 * which has a highest priority and should reveal it.
 *
 * @param {Object} page - a state
 * @param {Object} toParams
 */
export let navigateToDefaultSubPage = function( page, toParams ) {
    getDefaultSubPage( page.name ).then( function( defaultSubPage ) {
        if( defaultSubPage ) {
            return State.instance.go( defaultSubPage.name, toParams );
        }
    } );
};
/**
 * Register listener for state.visibleWhen.expression
 *
 * @param {Object} state
 * @param {$scope} dataCtxNode
 * @param {Object} additionalEvalEnv
 * @return promise which resolves to listener
 */
var _registerListener = function( state, dataCtxNode, additionalEvalEnv ) {
    var expression = state.visibleWhen.expression ? state.visibleWhen.expression : state.visibleWhen.condition.expression;
    var rootScope = dataCtxNode ? dataCtxNode : RootScope.instance;
    return rootScope.$watch( function() {
        return _evaluateExpression( expression, _buildEvaluationEnvironment( State.instance.get( state.parent ),
            additionalEvalEnv ) );
    }, function( newValue ) {
        state.isVisible = newValue;
    } );
};
/**
 * Unregister active listeners.
 *
 * @param {Array} listeners
 */
var _unRegisterListener = function( listeners ) {
    _.forEach( listeners, function( listener, index ) {
        listeners[ index ].apply( listener );
    } );
};

/**
 * Initialization listeners for all applicable states' visibleWhen.expression. <br>
 * <code>state.isVisible</code> can be used to access the state's visibility.
 *
 * @param {Object} parentState is used to get the children, if not provided current state's parent ({@$state.current.parent})
 *            will be considered as a parent state. Listener will be registered against the children.
 * @param {Object} dataCtxNode scope
 * @param {Object} additionalEvalEnv
 *
 */
export let registerVisibleWhen = function( parentState, dataCtxNode, additionalEvalEnv ) {
    var promises = [];
    var _parentState = parentState;
    if( !_parentState ) {
        _parentState = State.instance.current.parent;
    }
    if( !dataCtxNode ) {
        dataCtxNode = RootScope.instance;
    }
    State.instance.get().filter( function( state ) {
        return state.parent === _parentState;
    } ).forEach( function( state ) {
        if( state.visibleWhen !== undefined && ( state.visibleWhen.expression || state.visibleWhen.condition ) ) {
            promises.push( _registerListener( state, dataCtxNode, additionalEvalEnv ) );
        }
    } );
    AwPromiseService.instance.all( promises ).then( function( arrayOfListeners ) {
        if( arrayOfListeners.length > 0 ) {
            dataCtxNode.$on( '$destroy', function() {
                _unRegisterListener( arrayOfListeners );
            } );
        }
    } );
};

/**
 * @class pageService
 */

exports = {
    getAvailableSubpages,
    getDefaultSubPage,
    navigateToDefaultSubPage,
    registerVisibleWhen
};
export default exports;
app.factory( 'pageService', () => exports );
