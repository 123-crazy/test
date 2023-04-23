// Copyright (c) 2020 Siemens

/**
 * Declarative UI data provider service
 *
 * @module js/declDataProviderService
 */
import app from 'app';
import declDataCtxSvc from 'js/declarativeDataCtxService';
import appCtxSvc from 'js/appCtxService';
import lovService from 'js/lovService';
import _ from 'lodash';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import actionSvc from 'js/actionService';

import AwPromiseService from 'js/awPromiseService';

var dataProviderTcLOV = 'TcLOV';

/**
 * Use the 'actionService' to execute the given action and resolve the returned 'promise' with the either no object
 * or a reference to the any dependent module's API object.
 * <P>
 * Note: Any dependent module will be loaded before the action is executed.
 * <P>
 * Note: It is assumed that the action will use its 'input' and 'output' properties to move action related data into
 * or out of the $scope or declViewModel.
 *
 * @param {Object} $scope - The data context node the action is being performed within.
 * @param {DeclViewModel} declViewModel - The view model containing the action to be executed.
 * @param {DeclAction} action - The declarative action to be executed.
 * @param {ModuleObject} depModuleObj - (Optional) Reference to a module containing 'glue code' to assist in the
 *            execution.
 *
 * @return {Promise} A promise resolved with the response/result(s) of the action as properties as follows:
 *
 * <pre>
 * {
 *     responseObj: responseObj,
 *     depModuleObj: depModuleObj
 * }
 * </pre>
 */
function _executeAction( $scope, declViewModel, action, depModuleObj ) {
    declUtils.assertValidModelDataCtxNodeAndAction2( declViewModel, $scope, action, null, '_executeAction' );

    return actionSvc.executeAction( declViewModel, action, $scope, depModuleObj ).then( function( responseObj ) {
        return {
            responseObj: responseObj,
            depModuleObj: depModuleObj
        };
    } );
}

/**
 *
 * @param {DeclViewModel} declViewModel - The view model containing the action to be executed.
 *
 * @param {DeclAction} action - The 'declAction' object to use to get the page data.
 *
 * @param {Object} $scope - The angular scope of this data provider.
 *
 * @param {dataProviderJson} dataProviderJson - The data provider's json object.
 *
 * @param {Object} actionRequestObj - (Optional) An Object holding details of the action's 'inputData' and options
 *            for this load operation. Its properties are accessed via the 'request.' prefix on properties on the
 *            action's 'inputData' (e.g. "myActionParam1": "request.listLoadInput" where 'listLoadInput' is a
 *            parameter on the 'actionRequestObj' object)
 *            <P>
 *            If not provided all action options are resolved solely from action's 'inputData' via the given $scope.
 *            <P>
 *            Note: The properties in this object are guaranteed to be passed to the action being invoked and that
 *            the results of that particular action invocation are returned as the resolution of the promise
 *            returned by this function. Use of the $scope for 'inputData' binding can result in mixed input vs.
 *            output results when multiple async calls are made to the same action.
 *
 * @param {ModuleObject} depModuleObj - (Optional) Reference to a module containing 'glue code' to assist in the
 *            execution.
 *
 * @return {Promise} A promise resolved with the response/result(s) of the action as properties as follows:
 */
function _executeLoadAction( declViewModel, action, $scope, dataProviderJson, actionRequestObj, depModuleObj ) {
    //new in aw4.2
    declUtils.assertValidModelDataCtxNodeAndAction2( declViewModel, $scope, action, null, '_executeLoadAction' );

    var actionFinal = action;

    if( actionRequestObj ) {
        actionFinal = _prepareActionAltInputData( $scope, declViewModel, action, actionRequestObj, depModuleObj );
    }

    return _executeAction( $scope, declViewModel, actionFinal, depModuleObj ).then( function( actionResultObj ) {
        return _postProcessAction( $scope, declViewModel, dataProviderJson, actionResultObj );
    }, function( rejectObj ) {
        return AwPromiseService.instance.reject( rejectObj );
    } );
}

/**
 * @param {Object} $scope - The angular scope of this data provider
 * @param {DeclViewModel} declViewModel - The view model the action is defined within.
 * @param {Object} dataProviderJson - The original JSON definition of the declDataProvider.
 * @param {Object} actionResultObj - The resolved response object from executing the action.
 *
 * @return {Promise} A Promise object resolved with the processed result of the action. The result contains updated
 *         values for all the properties in the given 'dataProviderJson' object.
 */
function _postProcessAction( $scope, declViewModel, dataProviderJson, actionResultObj ) {
    //new in aw4.2
    declUtils.assertValidModelAndDataCtxNode( declViewModel, $scope );

    var responseObj;

    if( dataProviderJson ) {
        var dpResult = _.cloneDeep( dataProviderJson );

        // LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis is bad - Framework Fixes
        // Fix cucumber 'Record Utilization Declarative Panel': depModuleObj is needed for all {{function:}}
        var depModuleObj = actionResultObj && actionResultObj.depModuleObj ? actionResultObj.depModuleObj : null;

        /**
         * Check if the $scope we need has been destroyed (due to DOM manipulation) since the action event
         * processing was started.
         */
        var localDataCtx = declUtils.resolveLocalDataCtx( declViewModel, $scope );

        /**
         * Resolve any other data 'from' the declViewModel and/or $scope
         */
        declDataCtxSvc.applyScope( declViewModel, dpResult, declViewModel._internal.functions, localDataCtx,
            depModuleObj );

        if( actionResultObj ) {
            _.forEach( dpResult, function( fromPath, toPath ) {
                /**
                 * If fromPath has a 'result.' prefix, parse the expression within fromPath to get the correct
                 * value.
                 */
                if( _.isString( fromPath ) && /^action\.result\./.test( fromPath ) ) {
                    var fromResultPath = fromPath.split( 'action.result.' )[ 1 ];

                    var fromObj = _.get( actionResultObj.responseObj, fromResultPath );

                    _.set( dpResult, toPath, fromObj );
                }
            } );
        }

        /**
         * Build the response object from the updated (i.e. data bound) properties in the declDataProvider's JSON
         * definition.
         */
        responseObj = {
            actionResultObj: actionResultObj
        };

        _.forEach( dpResult, function( value, name ) {
            if( name === 'action' ) {
                return;
            }

            /**
             * Handle special case of a mapping to a different property name (e.g. 'response' to 'result').
             */
            if( name === 'response' ) {
                responseObj.results = value;
            } else if( /^ctx\./.test( name ) ) {
                /**
                 * If the name starts with ctx. update the appCtxService
                 */
                var toCtxName = name.split( 'ctx.' )[ 1 ];
                appCtxSvc.updatePartialCtx( toCtxName, value );
            } else {
                responseObj[ name ] = value;
            }
        } );

        /**
         * Make sure the 'totalFound' is set if we had any data returned.
         */
        if( responseObj.results && _.isUndefined( responseObj.totalFound ) ) {
            responseObj.totalFound = responseObj.results.length;
        }
    }

    return AwPromiseService.instance.resolve( responseObj );
}

/**
 * @param {Object} $scope - The angular scope of this data provider
 * @param {Object} dataProviderJson - The original JSON definition of the declDataProvider.
 * @param {Object} response -
 * @return {Object} response
 */
function _postProcessLovServiceOperation( $scope, dataProviderJson, response ) {
    if( dataProviderJson ) {
        return _parseDataproviderJson( dataProviderJson, response, $scope );
    }
    return response;
}

/**
 * this function is parse dataProviderJson
 *
 * @param {Object} dataProviderJson - data provider json object
 * @param {Object} response - A 'raw' response to be used during the parse operation.
 * @param {Object} $scope - The angular scope of this data provider
 *
 * @return {Object} The final response data object
 *
 * <pre>
 * {Number} totalFound -
 * {Object} results -
 * </pre>
 */
function _parseDataproviderJson( dataProviderJson, response, $scope ) {
    var responseObj = {};

    if( dataProviderJson ) {
        var declViewModel = declUtils.findViewModel( $scope, true, appCtxSvc );

        declDataCtxSvc.applyScope( declViewModel, dataProviderJson, null, $scope, null );

        responseObj.totalFound = response.length; // lovValues
        responseObj.results = response;

        if( responseObj.results && _.isUndefined( responseObj.totalFound ) ) {
            responseObj.totalFound = responseObj.results.length;
        }
    }

    return responseObj;
}

/**
 * @param {Object} inputData - Input properties from JSON.
 * @param {Object} altInputData - Input properties to use.
 * @param {Object} actionRequestObj - Object from action to use.
 */
function _applyActionRequestObject( inputData, altInputData, actionRequestObj ) {
    /**
     * Put the specific action's request values on the 'atInputData' of the action's inputData clone.
     */
    _.forEach( inputData, function( fromPath, toPath ) {
        if( _.isString( fromPath ) ) {
            if( /^request\./.test( fromPath ) ) {
                var fromRequestPath = fromPath.split( 'request.' )[ 1 ];

                var fromObj = _.get( actionRequestObj, fromRequestPath );

                _.set( altInputData, toPath, fromObj );
            }
        } else {
            _applyActionRequestObject( fromPath, altInputData[ toPath ], actionRequestObj );
        }
    } );
} // _applyActionRequestObject

/**
 * Note 1: Multiple async load requests can be made before any given one completes. So we cannot put action-related
 * objects on the $scope since the $scope may change before the original $scope is applied to the action the objects
 * were ment for.
 * <P>
 * To address this, the $scope will be applied to the 'inputData' of a clone of the action NOW. This clone (and the
 * now static 'inputData' objects) will be passed to the actionService which will use this 'altInputData' as-is
 * without trying to apply the $scope to it again.
 * <P>
 * Note 2: The post processing of the action results do not have this problem since a new 'outputData' object is
 * created and passed back through the 'promise chain' in a more synchronous fashion. So any output data placed on
 * the $scope is not there long enough to be overwritten by another action completing before it.
 *
 * @param {Object} $scope - The AngularJS $scope context of this operation.
 *
 * @param {DeclViewModel} declViewModel - The 'declViewModel' context the operation is being performed within.
 *
 * @param {DeclAction} action - The 'declAction' object to use to get the page data.
 *
 * @param {Object} actionRequestObj - (Optional) An Object holding details of the action's 'inputData' and options
 *            for this load operation. Its properties are accessed via the 'request.' prefix on properties on the
 *            action's 'inputData' (e.g. "myActionParam1": "request.listLoadInput" where 'listLoadInput' is a
 *            parameter on the 'actionRequestObj' object)
 *
 * @param {Object} depModuleObj - Dependent module object on which the 'apply' method of any named functions will be
 *            called (action.deps).

 *
 * @returns {DeclAction} Action object to actually use.
 */
function _prepareActionAltInputData( $scope, declViewModel, action, actionRequestObj, depModuleObj ) {
    var actionFinal = action;

    if( action.inputData ) {
        /**
         * Make copied of the 'action' and 'inputData' objects (to keep the originals safe from modification)
         */
        actionFinal = _.cloneDeep( action );

        actionFinal.altInputData = _.cloneDeep( action.inputData );

        // LCS-166817 - Active Workspace tree table view performance in IE and embedded in TCVis is bad - Framework Fixes
        // The actonRequestObj, which may be a very complex structure, can be applied after applyScope
        declDataCtxSvc.applyScope( declViewModel, actionFinal.altInputData, declViewModel._internal.functions,
            $scope, depModuleObj );

        /**
         * Put the specific action's request values on the 'atInputData' of the action's inputData clone.
         */
        _applyActionRequestObject( actionFinal.inputData, actionFinal.altInputData, actionRequestObj );
    }

    return actionFinal;
} // _prepareActionAltInputData

/**
 * --------------------------------------------------------------------------<BR>
 * Define external API<BR>
 * --------------------------------------------------------------------------<BR>
 */

var exports = {};

/**
 * validate the LOV sections using the function in the lovService
 *
 * @param {array} lovEntries - The 'lovEntries' to update.
 * @param {Object} dataProviderJson - data provider json object
 * @param {Object} $scope - The angular scope of this data provider
 *
 * @return {Promise} A promise object. validateLOVValueSelections
 */
export let validateLOVSection = function( lovEntries, dataProviderJson, $scope ) {
    var declViewModel = declUtils.findViewModel( $scope, true, appCtxSvc );

    if( dataProviderJson.dataProviderType && dataProviderJson.dataProviderType === dataProviderTcLOV ) {
        declDataCtxSvc.applyScope( declViewModel, dataProviderJson, null, $scope, null );

        var lovConfig = dataProviderJson.lovConfiguration;
        var viewModelObj = lovConfig.viewModelObj;
        var viewProp = lovConfig.viewProp;
        var operationName = lovConfig.operationName;

        return lovService.validateLOVValueSelections( lovEntries, viewProp, operationName, viewModelObj );
    }

    return AwPromiseService.instance.resolve();
};

/**
 * Validate the LOV selections using the function in the dataProvider.
 *
 * @param {DeclAction} action - The 'declAction' object to use.
 * @param {Object} dataProviderJson - data provider json object
 * @param {Object} lovScope - The angular scope of this lov
 * @param {Object} actionRequestObj - (Optional) An Object holding details of the action's 'inputData' and options
 *            for this load operation. Its properties are accessed via the 'request.' prefix on properties on the
 *            action's 'inputData' (e.g. "myActionParam1": "request.listLoadInput" where 'listLoadInput' is a
 *            parameter on the 'actionRequestObj' object)
 *
 * @return {Promise} A promise object.
 */
export let validateSelections = function( action, dataProviderJson, lovScope, actionRequestObj ) {
    return exports.executeLoadAction( action, dataProviderJson, lovScope, actionRequestObj );
};

/**
 * Execute the given action and return results in the async resolution.
 *
 * @param {DeclAction} action - The 'declAction' object to use.
 *
 * @param {dataProviderJson} dataProviderJson - The data provider's JSON object.
 *
 * @param {Object} $scope - The angular scope of this data provider
 *
 * @param {Object} actionRequestObj - (Optional) An Object holding details of the action's 'inputData' and options
 *            for this load operation. Its properties are accessed via the 'request.' prefix on properties on the
 *            action's 'inputData' (e.g. "myActionParam1": "request.listLoadInput" where 'listLoadInput' is a
 *            parameter on the 'actionRequestObj' object)
 *
 * @return {Promise} A promise object resolved with the results (IModelObject, ViewModelObjects, etc.) of the given
 *         action.
 *
 * <pre>
 * If NOT LOV:
 * {Number} totalFound -
 * {Object} results -
 *
 * If LOV:
 * {Object}
 * </pre>
 */
export let executeLoadAction = function( action, dataProviderJson, $scope, actionRequestObj ) {
    if( !action ) {
        logger.error( 'Invalid action specified' );
    }

    /**
     * Execute the action within the context of the DeclViewModel on the $Scope.
     */
    var declViewModel = declUtils.findViewModel( $scope, true, appCtxSvc );

    declUtils.assertValidModelDataCtxNodeAndAction2( declViewModel, $scope, action, 'Load action not executed.', 'executeLoadAction (a)' );

    // Get Function deps
    var functionDeps = declUtils.getFunctionDeps( action, declViewModel._internal );

    if( !_.isEmpty( action.deps ) ) {
        return declUtils.loadDependentModule( action.deps ).then( function( depModuleObj ) {
            //new in aw4.2
            declUtils.assertValidModelDataCtxNodeAndAction2( declViewModel, $scope, action, 'Load action not executed.', 'executeLoadAction (b)' );

            // Load function.deps
            //
            // Note: Even if the list of 'functionDeps' is empty we need to execute the async load since some
            // code (breadcrumbs) needs the extra digest cycle (or two). This is odd since the same 'empty'
            // check later in this function seems to work ok.
            //
            return declUtils.loadDependentModules( functionDeps ).then( function( depFunctionObj ) {
                _.forEach( depFunctionObj, function( depFuncValue, depFuncKey ) {
                    depModuleObj[ depFuncKey ] = depFuncValue;
                } );

                var localScope = declUtils.resolveLocalDataCtx( declViewModel, $scope );

                return _executeLoadAction( declViewModel, action, localScope, dataProviderJson, actionRequestObj,
                    depModuleObj );
            } );
        } );
    }

    if( !_.isEmpty( functionDeps ) ) {
        // Load function.deps
        return declUtils.loadDependentModules( functionDeps ).then( function( depFunctionObj ) {
            var localScope = declUtils.resolveLocalDataCtx( declViewModel, $scope );

            return _executeLoadAction( declViewModel, action, localScope, dataProviderJson, actionRequestObj, depFunctionObj );
        } );
    }

    return _executeLoadAction( declViewModel, action, $scope, dataProviderJson, actionRequestObj, null );
};

/**
 * Get first page of results
 *
 * @param {DeclAction} action - The 'declAction' object to use to get the page data.
 *
 * @param {dataProviderJson} dataProviderJson - The data provider's json object.
 *
 * @param {Object} $scope - The angular scope of this data provider
 *
 * @param {Object} actionRequestObj - (Optional) An Object holding details of the action's 'inputData' and options
 *            for this load operation. Its properties are accessed via the 'request.' prefix on properties on the
 *            action's 'inputData' (e.g. "myActionParam1": "request.listLoadInput" where 'listLoadInput' is a
 *            parameter on the 'actionRequestObj' object)
 *
 * @return {Promise} A promise object resolved with the IModelObject results of this operation.
 *
 * <pre>
 * If NOT LOV:
 * {Number} totalFound -
 * {Object} results -
 *
 * If LOV:
 * {Object}
 * </pre>
 *
 */
export let getFirstPage = function( action, dataProviderJson, $scope, actionRequestObj ) {
    if( action ) {
        return exports.executeLoadAction( action, dataProviderJson, $scope, actionRequestObj );
    }

    /**
     * Execute the action within the context of the DeclViewModel on the $Scope.
     */
    var declViewModel = declUtils.findViewModel( $scope, true, appCtxSvc );

    declUtils.assertValidModelAndDataCtxNode( declViewModel, $scope );

    if( dataProviderJson.dataProviderType && dataProviderJson.dataProviderType === dataProviderTcLOV ) {
        declDataCtxSvc.applyScope( declViewModel, dataProviderJson, null, $scope, null );

        var lovConfig = dataProviderJson.lovConfiguration;

        var filterStr = lovConfig.filterStr;
        var viewModelObj = lovConfig.viewModelObj;
        var viewProp = lovConfig.viewProp;
        var operationName = lovConfig.operationName;
        var maxResults = lovConfig.maxResults;
        var lovPageSize = lovConfig.lovPageSize;
        var sortPropertyName = lovConfig.sortPropertyName;
        var sortOrder = lovConfig.sortOrder;

        var deferedLOV = AwPromiseService.instance.defer();
        lovService.getInitialValues( filterStr, deferedLOV, viewProp, operationName, viewModelObj, maxResults,
            lovPageSize, sortPropertyName, sortOrder );

        /**
         * Process response when LOV 'getInitialValues' has been performed.
         */
        return deferedLOV.promise.then( function( response ) {
            return _postProcessLovServiceOperation( $scope, dataProviderJson, response );
        } );
    }

    /**
     * Support for binding dataProvider's response to a static list, when action is not provided.
     */
    return _postProcessAction( $scope, declViewModel, dataProviderJson, null );
};

/**
 * Get next page of results
 *
 * @param {DeclAction} action - The 'declAction' to perform.
 *
 * @param {Object} dataProviderJson - data provider json object
 *
 * @param {Object} $scope - The angular scope of this data provider
 *
 * @param {Object} actionRequestObj - (Optional) An Object holding details of the action's 'inputData' and options
 *            for this load operation. Its properties are accessed via the 'request.' prefix on properties on the
 *            action's 'inputData' (e.g. "myActionParam1": "request.listLoadInput" where 'listLoadInput' is a
 *            parameter on the 'actionRequestObj' object)
 *
 * @return {Promise} A promise object resolved with the IModelObject results of this operation.
 */
export let getNextPage = function( action, dataProviderJson, $scope, actionRequestObj ) {
    if( action ) {
        return exports.executeLoadAction( action, dataProviderJson, $scope, actionRequestObj );
    }

    /**
     * Execute the action within the context of the DeclViewModel on the $Scope.
     */
    var declViewModel = declUtils.findViewModel( $scope, true, appCtxSvc );

    declUtils.assertValidModelAndDataCtxNode( declViewModel, $scope );

    if( dataProviderJson.dataProviderType && dataProviderJson.dataProviderType === dataProviderTcLOV ) {
        declDataCtxSvc.applyScope( declViewModel, dataProviderJson, null, $scope, null );

        var deferedLOV = AwPromiseService.instance.defer();

        lovService.getNextValues( deferedLOV, dataProviderJson.lovConfiguration.viewProp );

        return deferedLOV.promise.then( function( response ) {
            return _postProcessLovServiceOperation( $scope, dataProviderJson, response );
        } );
    }

    /**
     * Support for binding dataProvider's response to a static list, when action is not provided.
     */
    return _postProcessAction( $scope, declViewModel, dataProviderJson, null );
};

exports = {
    validateLOVSection,
    validateSelections,
    executeLoadAction,
    getFirstPage,
    getNextPage
};
export default exports;
/**
 * This service performs actions to retrieve data in a paged fashion based solely on a given 'declAction' object.
 *
 * @memberof NgServices
 * @member declDataProviderService
 */
app.factory( 'declDataProviderService', () => exports );
