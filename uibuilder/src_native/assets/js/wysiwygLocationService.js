// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwygLocationService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import configurationService from 'js/configurationService';
import AwStateService from 'js/awStateService';
import AwPromiseService from 'js/awPromiseService';
import panelContentService from 'js/panelContentService';
import mockModeService from 'js/mockModeService';
import viewModelCacheService from 'js/viewModelCacheService';

import eventBus from 'js/eventBus';

var exports = {};

/**
 * This function initializes the data before even the state is revealed.
 * The wysiwyg configurattion and contributuons are static data hence loaded and kept in ctx.
 */

export let initializeData = function() {
    mockModeService.setMockMode( true );
    var wysiygConfiguration = appCtxSvc.getCtx( 'wysiwyg.configurations' );
    if( !appCtxSvc.getCtx( 'appBaseUrlPath' ) ) {
        appCtxSvc.registerCtx( 'appBaseUrlPath', app.getBaseUrlPath() );
    }

    if( !wysiygConfiguration ) {
        return configurationService.getCfg( 'wysiwygConfigurations' )
            .then( function( wysiwygConfigurations ) {
                appCtxSvc.registerPartialCtx( 'wysiwyg.configurations', wysiwygConfigurations );
            } ).then( function() {
                return configurationService.getCfg( 'canvasConfigurations' );
            } ).then( function( canvasConfigurations ) {
                appCtxSvc.registerPartialCtx( 'wysiwyg.canvas.configurations', canvasConfigurations );
            } ).then( function() {
                return configurationService.getCfg( 'propPanelConfigurations' );
            } ).then( function( propPanelConfigurations ) {
                appCtxSvc.registerPartialCtx( 'wysiwyg.propPanel.configurations', propPanelConfigurations );
            } ).then( function() {
                return configurationService.getCfg( 'wysiwyg' );
            } ).then( function( widgetConfigurations ) {
                appCtxSvc.registerPartialCtx( 'wysiwyg.widgets.configurations', widgetConfigurations );
            } ).then( function() {
                return configurationService.getCfg( 'viewmodelContributor' );
            } ).then( function( contributions ) {
                appCtxSvc.registerPartialCtx( 'wysiwyg.contributions', contributions );
                appCtxSvc.registerPartialCtx( 'wysiwyg.state', AwStateService.instance );
            } );
    }
    return AwPromiseService.instance.resolve( true );
};

export let locationChanged = function( urlParams, sublocationName ) {
    if( sublocationName === 'Awp0WysiwygActions' ) {
        return;
    }

    var viewModelId = urlParams && urlParams.viewModelId && urlParams.viewModelId !== '' ? urlParams.viewModelId : 'Untitled';
    var subPanelId = urlParams && urlParams.subPanelId && urlParams.subPanelId !== '' ? urlParams.subPanelId : null;
    var currentLoadedPanelId = appCtxSvc.getCtx( 'wysiwygCurrentPanel.id' );

    if( subPanelId && currentLoadedPanelId !== subPanelId ) {
        eventBus.publish( 'wysiwyg.loadPanelInWysiwyg', {
            currentLayoutName: subPanelId
        } );
    } else if( !subPanelId && viewModelId && currentLoadedPanelId !== viewModelId ) {
        eventBus.publish( 'wysiwyg.loadPanelInWysiwyg', {
            currentLayoutName: viewModelId,
            layoutStatus: 'New'
        } );
    }
};

export let getPanelContent = function( panelId ) {
    return panelContentService.getPanelContent( panelId ).then( function( panelContent ) {
        if( panelContent.view.level === 'error' || panelContent.viewModel.level === 'error' ) {
            var defaultViewModel = viewModelCacheService.createDefaultViewViewModel();
            return {
                viewModel: defaultViewModel,
                view: ''
            };
        }
        return panelContent;
    }, function() {
        var defaultViewModel = viewModelCacheService.createDefaultViewViewModel();
        return {
            viewModel: defaultViewModel,
            view: ''
        };
    } );
};

exports = {
    initializeData,
    locationChanged,
    getPanelContent
};
export default exports;
app.factory( 'wysiwygLocationService', () => exports );
