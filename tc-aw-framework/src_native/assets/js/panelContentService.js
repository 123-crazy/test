// Copyright (c) 2020 Siemens

/**
 * This service is used to manage the configuration for fetching the View and ViewModel files.
 *
 * Please refer {@link https://gitlab.industrysoftware.automation.siemens.com/Apollo/afx/-/wikis/viewAndViewModelRepoConfiguration-Solution-configuration | Solution configuration for obtaining declarative View and View Model}
 *
 * @module js/panelContentService
 *
 * @publishedApolloService
 */
import app from 'app';
import AwHttpService from 'js/awHttpService';
import AwPromiseService from 'js/awPromiseService';
import AwRootScopeService from 'js/awRootScopeService';
import AwTemplateCacheService from 'js/awTemplateCacheService';
import AwInterpolateService from 'js/awInterpolateService';
import AwCacheFactoryService from 'js/awCacheFactoryService';
import actionSvc from 'js/actionService';
import cfgSvc from 'js/configurationService';
import vmProcFactory from 'js/viewModelProcessingFactory';
import appCtxService from 'js/appCtxService';
import viewModelService from 'js/viewModelService';
import _ from 'lodash';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import eventBus from 'js/eventBus';

import 'config/viewAndViewModelRepoConfiguration';

var exports = {};

var _darsiViews = [];

/**
 * Return the view model and view for the given declViewAndViewModel Id.
 *
 * @param {String} declViewAndViewModelId - ID of the View and ViewModel.
 *
 * @param {String} declViewAndViewModelUniqueId - unique id for View and ViewModel.
 *
 * @return {promise} Object with 'view' and 'viewModel' set.
 */
export let getPanelContent = function( declViewAndViewModelId, declViewAndViewModelUniqueId ) {
    return getViewAndViewModel( declViewAndViewModelId, false, declViewAndViewModelUniqueId );
};

/**
 * Fetch ViewModel JSON
 *
 * @param {String} declViewModelId - id of viewModel
 *
 * @return {promise} Object with 'viewModel' set.
 */
export let getViewModelById = function( declViewModelId ) {
    return getViewAndViewModel( declViewModelId, true );
};

/**
 * Fetch View and ViewModelJson using Rest API.
 *
 * @param {String} declViewAndViewModelId - ...
 * @param {Object} viewAndViewModelRepoConfiguration - ...
 *
 * @return {Promise} Resolved when 'post' is complete.
 */
var callRestAPI = function( declViewAndViewModelId, viewAndViewModelRepoConfiguration ) {
    viewAndViewModelRepoConfiguration.inputData.panelId = declViewAndViewModelId;

    return AwHttpService.instance.post( viewAndViewModelRepoConfiguration.url, viewAndViewModelRepoConfiguration.inputData );
};

/**
 * Fetch View and ViewModelJson using SOA .
 *
 * @param {String} declViewAndViewModelId - ...
 * @param {Object} viewAndViewModelRepoConfiguration - ...
 *
 * @return {Promise} Resolved when 'SOA Action' is complete.
 */
var callSOA = function( declViewAndViewModelId, viewAndViewModelRepoConfiguration ) {
    /*
     * ========= Get the view and viewmodel from SOA and prepare promise =========
     */
    viewAndViewModelRepoConfiguration.inputData.panelId = declViewAndViewModelId;
    return actionSvc.performSOAAction( viewAndViewModelRepoConfiguration );
};

/**
 * Fetch View and ViewModelJson using GET Url.
 *
 * @param {String} declViewId - ...
 * @param {String} declViewModelId - ...
 * @param {Object} viewAndViewModelRepoConfiguration - ...
 *
 * @return {Promise} Resolved whe operation is complete.
 */
var callGET = function( declViewId, declViewModelId, viewAndViewModelRepoConfiguration ) {
    var viewAndViewModelUrl = {};

    var parseContext = {
        baseUrl: app.getBaseUrlPath(),
        declViewModelId: declViewModelId
    };
    viewAndViewModelUrl.view = AwInterpolateService.instance( viewAndViewModelRepoConfiguration.viewUrl )( parseContext );
    viewAndViewModelUrl.viewModel = AwInterpolateService.instance( viewAndViewModelRepoConfiguration.viewModelUrl )( parseContext );

    var promises = [];
    var viewAndViewModelResponse = {};

    if( declViewId ) {
        // Check if already there in template cache.
        var htmlString = null;
        if( !cfgSvc.isDarsiEnabled() || _darsiViews.includes( viewAndViewModelUrl.view ) ) {
            htmlString = AwTemplateCacheService.instance.get( viewAndViewModelUrl.view );
        }
        if( cfgSvc.isDarsiEnabled() ) {
            viewAndViewModelUrl.view = 'darsi/views/' + declViewId + '/html';
        }
        viewAndViewModelResponse.viewUrl = viewAndViewModelUrl.view;

        if( htmlString ) {
            viewAndViewModelResponse.view = htmlString;
        } else {
            promises.push( AwHttpService.instance.get( viewAndViewModelUrl.view, {
                cache: true
            } ).then( function( response ) {
                viewAndViewModelResponse.view = response.data;
                AwTemplateCacheService.instance.put( viewAndViewModelUrl.view, viewAndViewModelResponse.view );
                _darsiViews.push( viewAndViewModelUrl.view );
                return response;
            } ) );
        }
    }

    if( declViewModelId ) {
        // Through configurationService, get the intended ViewModel, now from "a ViewModels bundle",
        // But before that get that "viewModels bundle" name from "moduleViewModelsMap", residing in assets/config
        promises.push( cfgSvc.getCfg( 'viewmodel.' + declViewModelId ).then( function( viewModel ) {
            // Get the deep clone of the viewmodel object so that original (cached) value remains intact.
            viewAndViewModelResponse.viewModel = _.cloneDeep( viewModel );
            viewAndViewModelResponse.viewModel.skipClone = true;
            return viewAndViewModelResponse.viewModel; // ensure we're done with clone before returning
        } ) );
    }

    return AwPromiseService.instance.all( promises ).then( function() {
        return viewAndViewModelResponse;
    } ).catch( () => {
        //Rejection is already handled in the resolver for this promise
        //adding this block to prevent console error
    } );
};

/**
 * Fetch the viewAndViewModelRepoConfiguration and validate it before returning it.
 *
 * @return {Object} viewAndViewModelRepoConfiguration
 */
function getViewAndViewModelRepoConfiguration() {
    var viewAndViewModelRepoConfiguration = cfgSvc.getCfgCached( 'viewAndViewModelRepoConfiguration' );
    if( viewAndViewModelRepoConfiguration &&
        viewAndViewModelRepoConfiguration.actionType ) {
        if( viewAndViewModelRepoConfiguration.viewUrl ) {
            if( viewAndViewModelRepoConfiguration.viewUrl === '{{baseUrl}}' ) {
                viewAndViewModelRepoConfiguration.viewUrl = '{{baseUrl}}/html/';
            }
            if( viewAndViewModelRepoConfiguration.viewUrl &&
                viewAndViewModelRepoConfiguration.viewUrl.indexOf( '{{declViewModelId}}' ) === -1 ) {
                viewAndViewModelRepoConfiguration.viewUrl += '{{declViewModelId}}View.html';
            }
            if( viewAndViewModelRepoConfiguration.viewModelUrl === '{{baseUrl}}' ) {
                viewAndViewModelRepoConfiguration.viewModelUrl = '{{baseUrl}}/viewmodel/';
            }
            if( viewAndViewModelRepoConfiguration.viewModelUrl &&
                viewAndViewModelRepoConfiguration.viewModelUrl.indexOf( '{{declViewModelId}}' ) === -1 ) {
                viewAndViewModelRepoConfiguration.viewModelUrl += '{{declViewModelId}}ViewModel.json';
            }
        }
        return viewAndViewModelRepoConfiguration;
    }
    return {
        actionType: 'GET',
        viewUrl: '{{baseUrl}}/html/{{declViewModelId}}View.html',
        viewModelUrl: '{{baseUrl}}/viewmodel/{{declViewModelId}}ViewModel.json'
    };
}

/**
 * Fetch View and ViewModelJson using viewAndViewModelRepoConfiguration.
 *
 * @param {String} declViewModelId - ID of the View and ViewModel.
 * @returns {Object} Object with 'view' and 'viewModel' strings.
 */
function getViewAndViewModelPaths( declViewModelId ) {
    var viewAndViewModelRepoConfiguration = getViewAndViewModelRepoConfiguration();
    var parseContext = {
        baseUrl: app.getBaseUrlPath(),
        declViewModelId: declViewModelId
    };
    return {
        view: AwInterpolateService.instance( viewAndViewModelRepoConfiguration.viewUrl )( parseContext ),
        viewModel: AwInterpolateService.instance( viewAndViewModelRepoConfiguration.viewModelUrl )( parseContext )
    };
}

/**
 * Fetch View and ViewModelJson using viewAndViewModelRepoConfiguration.
 *
 * @param {String} declViewAndViewModelId - ID of the View and ViewModel.
 *
 * @param {Boolean} getViewModelOnly - true if only 'viewmodel' is expected.
 *
 * @param {String} declViewAndViewModelUniqueId - unique Id for View and ViewModel
 *
 * @return {Promise} Object with 'view'(optional) and 'viewModel' set.
 */
var getViewAndViewModel = function( declViewAndViewModelId, getViewModelOnly, declViewAndViewModelUniqueId ) {
    var viewAndViewModelRepoConfiguration = getViewAndViewModelRepoConfiguration();
    if( declUtils.isNil( viewAndViewModelRepoConfiguration ) ) {
        logger.error( 'viewAndViewModelRepoConfiguration is missing' );
        return AwPromiseService.instance.reject( 'viewAndViewModelRepoConfiguration is missing' );
    }

    var promise;
    if( viewAndViewModelRepoConfiguration.actionType === 'GET' ) {
        if( getViewModelOnly ) {
            promise = callGET( null, declViewAndViewModelId, viewAndViewModelRepoConfiguration );

            // Mock the configuration output Data for this case where we are loading the view and view model by direct url to the files
            viewAndViewModelRepoConfiguration = {
                outputData: {
                    viewModel: 'viewModel'
                }
            };
        } else {
            promise = callGET( declViewAndViewModelId, declViewAndViewModelId, viewAndViewModelRepoConfiguration );

            // Mock the configuration output Data for this case where we are loading the view and view model by direct url to the files
            viewAndViewModelRepoConfiguration = {
                outputData: {
                    view: 'view',
                    viewModel: 'viewModel'
                }
            };
        }
    } else if( viewAndViewModelRepoConfiguration.actionType === 'RESTService' ) {
        promise = callRestAPI( declViewAndViewModelId, viewAndViewModelRepoConfiguration );
    } else if( viewAndViewModelRepoConfiguration.actionType === 'TcSoaService' ) {
        promise = callSOA( declViewAndViewModelId, viewAndViewModelRepoConfiguration );
    } else {
        var declViewModel = vmProcFactory.createDeclViewModel( {
            _viewModelId: '__panelContentSvc'
        } );
        var dataCtxNode = AwRootScopeService.instance.$new();
        dataCtxNode.name = declViewAndViewModelId;
        dataCtxNode.ctx = appCtxService.ctx;
        dataCtxNode.baseUrl = app.getBaseUrlPath();
        viewModelService.setupLifeCycle( dataCtxNode, declViewModel );
        promise = declUtils.loadDependentModule( viewAndViewModelRepoConfiguration.deps ).then( function( depModuleObj ) {
            return actionSvc.executeAction( declViewModel, viewAndViewModelRepoConfiguration, dataCtxNode, depModuleObj );
        } ).finally( function() {
            dataCtxNode.$destroy();
        } );
    }

    /*
     * ========= Process the returned promise =========
     */
    return promise.then( function( response ) {
        var viewAndViewModel = {};

        if( !declUtils.isNil( response ) ) {
            if( !getViewModelOnly ) {
                viewAndViewModel.view = _.get( response, viewAndViewModelRepoConfiguration.outputData.view );
            }

            viewAndViewModel.viewUrl = response.viewUrl;

            viewAndViewModel.viewModel = _.get( response, viewAndViewModelRepoConfiguration.outputData.viewModel );

            viewAndViewModel.viewModel._viewModelId = declViewAndViewModelId;

            viewAndViewModel.viewModel._uniqueViewModelId = declViewAndViewModelUniqueId;

            viewAndViewModel.viewModel.skipClone = true;

            return viewAndViewModel;
        }

        logger.error( 'Invalid response received' );
        throw new Error( 'Invalid response received' );
    } );
};

export let loadConfiguration = function() {
    eventBus.subscribe( 'configurationChange.viewmodel', function( data ) {
        var viewModelName = data.path.split( '.' )[ 1 ];
        var paths = getViewAndViewModelPaths( viewModelName );
        if( cfgSvc.isDarsiEnabled() ) {
            let darsiView = 'darsi/views/' + viewModelName + '/html';
            AwCacheFactoryService.instance.get( '$http' ).remove( darsiView );
        } else {
            AwCacheFactoryService.instance.get( '$http' ).remove( paths.view );
        }
        AwCacheFactoryService.instance.get( '$http' ).remove( paths.viewModel );
        AwTemplateCacheService.instance.remove( paths.view );
    } );
};

exports = {
    getPanelContent,
    getViewModelById,
    loadConfiguration
};
export default exports;

loadConfiguration();

/**
 * @memberof NgServices
 * @member panelContentService
 */
app.factory( 'panelContentService', () => exports );
