// Copyright (c) 2020 Siemens

/**
 * @module js/viewModelCacheService
 */
import app from 'app';
import panelContentService from 'js/panelContentService';
import localStrg from 'js/localStorage';
import browserUtils from 'js/browserUtils';
import configurationService from 'js/configurationService';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
// Service
import AwHttpService from 'js/awHttpService';

let exports = {};

export let getViewFromLocalStorage = function( declViewId ) {
    var cacheObject = localStrg.get( 'viewDataCache' );
    if( cacheObject ) {
        cacheObject = JSON.parse( cacheObject );
    }
    var viewData = null;
    if( cacheObject && declViewId === cacheObject.declViewId ) {
        viewData = cacheObject.viewData;
    }
    return viewData;
};

export let deleteViewModelFromLocalStorage = function( declViewModelId ) {
    var cacheObject = localStrg.get( 'viewModelDataCache' );
    if( cacheObject ) {
        cacheObject = JSON.parse( cacheObject );
        if( cacheObject.declViewModelId === declViewModelId ) {
            localStrg.removeItem( 'viewModelDataCache' );
        }
    }
    return;
};

export let deleteViewFromLocalStorage = function( declViewId ) {
    var cacheObject = localStrg.get( 'viewDataCache' );
    if( cacheObject ) {
        cacheObject = JSON.parse( cacheObject );
        if( cacheObject.declViewId === declViewId ) {
            localStrg.removeItem( 'viewDataCache' );
        }
    }
    return;
};

export let deleteViewAndViewModelFromLocalStorage = function( declViewModelId ) {
    exports.deleteViewFromLocalStorage( declViewModelId );
    exports.deleteViewModelFromLocalStorage( declViewModelId );
    return;
};

export let createDefaultViewViewModel = function() {
    return {
        schemaVersion: '1.0.0',
        imports: [],
        data: {},
        actions: {},
        dataProviders: {},
        onEvent: [],
        i18n: {},
        messages: {},
        conditions: {}
    };
};

export let getView = function( declViewId ) {
    var defaultViewData = '';
    return panelContentService.getPanelContent( declViewId ).then( function( declViewAndViewModel ) {
        if( declViewAndViewModel.view.level === 'error' || declViewAndViewModel.viewModel.level === 'error' ) {
            return defaultViewData;
        }
        return declViewAndViewModel.view;
    }, function() {
        return defaultViewData;
    } );
};

export let getViewModel = function( declViewModelId ) {
    var cacheObject = localStrg.get( 'viewModelDataCache' );
    var viewModelData = null;
    if( cacheObject ) {
        cacheObject = JSON.parse( cacheObject );
        var viewModelDataStampDate = cacheObject.timeStamp;
        if( declViewModelId === cacheObject.declViewModelId && viewModelDataStampDate && compareDateHours( new Date( parseInt( viewModelDataStampDate, 10 ) ), new Date() ) > 2 ) {
            localStrg.removeItem( 'viewModelDataCache' );
            cacheObject = null;
        }
        viewModelData = cacheObject ? cacheObject.viewModelData : null;
        viewModelData = viewModelData ? JSON.parse( viewModelData ) : null;
    }
    if( viewModelData === null ) {
        return panelContentService.getPanelContent( declViewModelId ).then( function( declViewModel ) {
            if( declViewModel.view.level === 'error' || declViewModel.viewModel.level === 'error' ) {
                return exports.createDefaultViewViewModel();
            }
            return declViewModel.viewModel;
        }, function() {
            return exports.createDefaultViewViewModel();
        } );
    }
    return Promise.resolve( viewModelData );
};

export let updateView = function( declViewId, viewData, updateDarsi ) {
    var deferred = AwPromiseService.instance.defer();

    var cachedView = {};
    cachedView.declViewId = declViewId;
    cachedView.viewData = viewData;
    localStrg.publish( 'viewDataCache', JSON.stringify( cachedView ) );
    if( updateDarsi ) {
        var request = {};
        request.method = 'PUT';
        request.url = browserUtils.getBaseURL() + 'darsi/views/' + declViewId;
        request.data = {};
        request.data.html = viewData;
        request.withCredentials = false;
        AwHttpService.instance( request ).then( function() {
            deferred.resolve();
        } ).catch( error => {
            deferred.reject( error );
        } );
    }

    deferred.resolve();
    return deferred.promise;
};

export let updateViewModel = function( declViewModelId, viewModelData, updateDarsi ) {
    var deferred = AwPromiseService.instance.defer();

    var cachedViewModel = {};
    cachedViewModel.declViewModelId = declViewModelId;
    cachedViewModel.viewModelData = JSON.stringify( viewModelData );
    cachedViewModel.timeStamp = Date.now();
    localStrg.publish( 'viewModelDataCache', JSON.stringify( cachedViewModel ) );

    configurationService.notifyConfigChange( 'viewmodel.' + declViewModelId );
    if( updateDarsi ) {
        var request = {};
        request.method = 'PUT';
        request.url = browserUtils.getBaseURL() + 'darsi/views/' + declViewModelId;
        request.data = {};

        // delete unnecessary properties in viewmodel before saving the view model
        delete viewModelData.skipClone;
        delete viewModelData._viewModelId;
        delete viewModelData._uniqueViewModelId;
        if( viewModelData.actions ) {
            Object.values( viewModelData.actions ).forEach( actionObj => delete actionObj.actionId );
        }

        request.data.model = viewModelData;
        request.withCredentials = false;
        AwHttpService.instance( request ).then( function() {
            deferred.resolve();
        } ).catch( error => {
            deferred.reject( error );
        } );
    }

    deferred.resolve();
    return deferred.promise;
};

exports = {
    getViewFromLocalStorage,
    deleteViewModelFromLocalStorage,
    deleteViewFromLocalStorage,
    deleteViewAndViewModelFromLocalStorage,
    getView,
    getViewModel,
    createDefaultViewViewModel,
    updateView,
    updateViewModel
};
export default exports;

var compareDateHours = function( oldDate, newDate ) {
    var difference = ( newDate.getTime() - oldDate.getTime() ) / 1000;
    difference /= 60 * 60;
    return Math.abs( Math.round( difference ) );
};

app.factory( 'viewModelCacheService', () => exports );
