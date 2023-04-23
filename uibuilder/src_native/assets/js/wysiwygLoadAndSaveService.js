// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwygLoadAndSaveService
 */
import app from 'app';
import Debug from 'Debug';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import appCtxService from 'js/appCtxService';
import viewModelCacheService from 'js/viewModelCacheService';
import wysiwygUtilService from 'js/wysiwygUtilService';
import AwPromiseService from 'js/awPromiseService';
// Service
import AwHttpService from 'js/awHttpService';

var exports = {};
var trace = new Debug( 'wysiwygLoadAndSaveService' );

export let saveViewAndViewModel = function( viewName ) {
    var deferred = AwPromiseService.instance.defer();

    exports.getViewModelData().then( function( viewModel ) {
        var request = {};
        request.method = 'PUT';
        request.url = browserUtils.getBaseURL() + 'darsi/views/' + viewName;
        request.data = {};
        request.data.html = exports.getViewData();

        // delete unnecessary properties in viewmodel before saving the view model
        delete viewModel.skipClone;
        delete viewModel._viewModelId;
        delete viewModel._uniqueViewModelId;
        if( viewModel.actions ) {
            Object.values( viewModel.actions ).forEach( actionObj => delete actionObj.actionId );
        }

        request.data.model = viewModel;
        request.withCredentials = false;
        AwHttpService.instance( request ).then( function() {
            deferred.resolve();
        } ).catch( error => {
            deferred.reject( error );
        } );
    } );

    return deferred.promise;
};

/**
 */
export let getCurrentPanelId = function() {
    var loadedPanel = appCtxService.getCtx( 'wysiwygCurrentPanel' );
    return loadedPanel ? loadedPanel.id : 'Untitled';
};

export let setCurrentPanelId = function( newViewViewModelFileName, currentPanelIdStatus ) {
    var panelId = exports.getCurrentPanelId();
    if( newViewViewModelFileName && newViewViewModelFileName !== panelId || !appCtxService.getCtx( 'wysiwygCurrentPanel' ) ) {
        appCtxService.registerCtx( 'wysiwygCurrentPanel', {
            id: newViewViewModelFileName,
            status: currentPanelIdStatus
        } );
        wysiwygUtilService.unregisterHandler();
    }
    appCtxService.registerCtx( 'selected', {
        uid: newViewViewModelFileName
    } );
};

export let cleanLoadedViewViewModel = function() {
    var panelId = exports.getCurrentPanelId();
    if( panelId ) {
        viewModelCacheService.deleteViewAndViewModelFromLocalStorage( panelId );
    }
};

export let cloneLoadedViewViewModel = function( newpanelId ) {
    var currentPanelId = exports.getCurrentPanelId();
    var loadedPanelViewData = viewModelCacheService.getViewFromLocalStorage( currentPanelId );

    viewModelCacheService.getViewModel( currentPanelId ).then( function( loadedPanelViewModelData ) {
        viewModelCacheService.deleteViewAndViewModelFromLocalStorage( currentPanelId );
        if( loadedPanelViewData && loadedPanelViewModelData ) {
            viewModelCacheService.updateView( newpanelId, loadedPanelViewData, false );
            viewModelCacheService.updateViewModel( newpanelId, loadedPanelViewModelData, false );
        }
    } );
};

/**
 *
 */
export let updateViewAndViewModel = function( viewXML, viewModelJson ) {
    exports.updateView( viewXML );
    exports.updateViewModel( viewModelJson );
};

export let updateView = function( viewXML ) {
    try {
        if( _.isString( viewXML ) ) {
            var currentPanelId = exports.getCurrentPanelId();
            var previousViewXML = viewModelCacheService.getViewFromLocalStorage( currentPanelId );
            if( previousViewXML !== null && previousViewXML !== viewXML ) {
                appCtxService.updatePartialCtx( 'wysiwygCurrentPanel.isDirty', true );
                wysiwygUtilService.registerLeaveHandler();
            }
            viewModelCacheService.updateView( currentPanelId, viewXML, false );
        }
    } catch ( e ) {
        trace( 'viewXML has to be in string format' );
    }
};

export let updateViewModel = function( viewModelJson ) {
    try {
        var currentPanelId = exports.getCurrentPanelId();
        viewModelCacheService.getViewModel( currentPanelId ).then( function( previousViewModelJson ) {
            if( _.isString( viewModelJson ) ) {
                if( previousViewModelJson !== null && previousViewModelJson !== viewModelJson ) {
                    appCtxService.updatePartialCtx( 'wysiwygCurrentPanel.isDirty', true );
                }
                wysiwygUtilService.registerLeaveHandler();
                viewModelJson = JSON.parse( viewModelJson );
            }
            viewModelCacheService.updateViewModel( currentPanelId, viewModelJson, false );
        } );
    } catch ( e ) {
        trace( 'invalid JSON format' );
    }
};

export let getViewData = function() {
    return viewModelCacheService.getViewFromLocalStorage( exports.getCurrentPanelId() );
};

export let getView = function() {
    return viewModelCacheService.getView( exports.getCurrentPanelId() ).then( function( viewData ) {
        return viewData;
    } );
};


export let getViewModelData = function() {
    return viewModelCacheService.getViewModel( exports.getCurrentPanelId() ).then( function( viewModelData ) {
        try {
            var jsonString = JSON.stringify( viewModelData );
            var matchArray = /".*.contentLoaded/gm.exec( jsonString );
            if( matchArray !== null ) {
                matchArray.forEach( function( element ) {
                    var strToReplace = element.substring( element.lastIndexOf( ':' ), element.lastIndexOf( '.contentLoaded' ) );
                    if ( !strToReplace.includes( 'awXRT' ) ) {
                        jsonString = jsonString.replace( strToReplace, ': "' + exports.getCurrentPanelId() );
                    }
                } );
            }
            viewModelData = JSON.parse( jsonString );
        } catch ( e ) {
            trace( 'JSON Parsing error in getViewModelData' );
        }
        return viewModelData;
    } );
};

exports = {
    saveViewAndViewModel,
    getCurrentPanelId,
    setCurrentPanelId,
    cleanLoadedViewViewModel,
    cloneLoadedViewViewModel,
    updateViewAndViewModel,
    updateView,
    updateViewModel,
    getView,
    getViewData,
    getViewModelData
};
export default exports;
/**
 * @memberof NgServices
 * @member createChangeService
 */
app.factory( 'wysiwygLoadAndSaveService', () => exports );
