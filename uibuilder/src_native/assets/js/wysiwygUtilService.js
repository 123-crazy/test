// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwygUtilService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import leavePlaceService from 'js/leavePlace.service';
import localStorage from 'js/localStorage';
import eventBus from 'js/eventBus';

// Service
import AwStateService from 'js/awStateService';
import AwPromiseService from 'js/awPromiseService';
import AwRootScopeService from 'js/awRootScopeService';

var exports = {};
var layoutConfig = null;
var droppedElementId;
var droppedElementType;
var _newPanelToLoad;
var _newSubPanelToLoad;
var _isUnsavedChangesPopupOpen = false;

export let unsavedChangesAction = function( data ) {
    _isUnsavedChangesPopupOpen = false;
    if( data.action === 'discard' || data.action === 'save' ) {
        // Internal event should not be used outside
        eventBus.publish( 'wysiwyg.leavePlaceNavigation', { success: true } );
    } else if( data.action === 'cancel' ) {
        eventBus.publish( 'wysiwyg.leavePlaceNavigation', { success: false } );
    }
};

export let registerWysiwygChannel = function() {
    localStorage.subscribe( 'wysiwygChannel', function( event ) {
        var panelToLoad = event.newValue;
        if( panelToLoad ) {
            _newPanelToLoad = panelToLoad;
            _newSubPanelToLoad = '';
            navigatePanel();
        }
    } );
};

export let updateUrlSubpanelId = function( newSubPanelId ) {
    var currentLoadedPanel = appCtxSvc.getCtx( 'wysiwygCurrentPanel' );
    if( newSubPanelId && currentLoadedPanel.id !== newSubPanelId ) {
        let _state = AwStateService.instance;
        var parentPanel = _state.params.viewModelId;
        _newPanelToLoad = parentPanel || 'Untitled';
        _newSubPanelToLoad = newSubPanelId !== parentPanel ? newSubPanelId : '';
        navigatePanel();
    }
};

export let updateLocationURL = function( newPanelId ) {
    if( newPanelId && !AwStateService.instance.params.subPanelId && newPanelId !== AwStateService.instance.params.viewModelId ) {
        _newPanelToLoad = newPanelId;
        navigatePanel();
    } else if( AwStateService.instance.params.subPanelId && newPanelId !== AwStateService.instance.params.subPanelId ) {
        _newSubPanelToLoad = newPanelId;
        navigatePanel();
    }
};

/**
 * Navigate Panel
 */
function navigatePanel() {
    AwRootScopeService.instance.$applyAsync( () => {
        let _state = AwStateService.instance;
        _state.go( '.', { viewModelId: _newPanelToLoad, subPanelId: _newSubPanelToLoad }, {
            location: 'replace'
        } );
    } );
}

/**
 * Sets the current layout configuration data.
 *
 * @param {config} latest config to be consumed in preview
 */
export let setLayoutConfigData = function( config ) {
    layoutConfig = config;
};

/**
 * Gets the current layout configuration data.
 *
 * @return {config} returns the latest config
 */
export let getLayoutConfigData = function() {
    return layoutConfig;
};

/**
 * Sets the current layout configuration data.
 *
 * @param {config} id set the id of dropped element
 */
export let setDroppedElementId = function( id ) {
    droppedElementId = id;
};

/**
 * Gets the current dropped element Id.
 *
 * @return {config} returns the id of dropped element
 */
export let getDroppedElementId = function() {
    return droppedElementId;
};

/**
 * Sets the type of dropped element
 *
 * @param {config} type type of dropped element
 */
export let setDroppedElementType = function( type ) {
    droppedElementType = type;
};

/**
 * Gets the current dropped element Type.
 *
 * @return {config} returns the type of dropped element
 */
export let getDroppedElementType = function() {
    return droppedElementType;
};

/**
 * Clear dropped element Id and Type.
 *
 */
export let clearDroppedElementIdAndType = function() {
    droppedElementId = null;
    droppedElementType = null;
};

export let registerLeaveHandler = function() {
    var leaveHandler = {};

    leaveHandler.leaveConfirmation = function( targetNavDetails ) {
        var deferred = AwPromiseService.instance.defer();
        var currentLoadedPanel = appCtxSvc.getCtx( 'wysiwygCurrentPanel' );
        if( currentLoadedPanel.isDirty ) {
            _isUnsavedChangesPopupOpen = true;
            eventBus.publish( 'wysiwyg.confirmLeave', {} );
            var subscriptionId = eventBus.subscribe( 'wysiwyg.leavePlaceNavigation', function( data ) {
                eventBus.unsubscribe( subscriptionId );
                if( data.success ) {
                    return deferred.resolve();
                }
                return deferred.reject();
            } );
            return deferred.promise;
        }
        return AwPromiseService.instance.when( true );
    };
    // de-register any existing handler.
    leavePlaceService.registerLeaveHandler( null );
    // register again
    leavePlaceService.registerLeaveHandler( {
        okToLeave: function( targetNavDetails ) {
            return leaveHandler.leaveConfirmation( targetNavDetails );
        }
    } );

    return leaveHandler;
};

export let unregisterHandler = function() {
    // de-register any existing handler.
    leavePlaceService.registerLeaveHandler( null );
};

exports = {
    unsavedChangesAction,
    registerWysiwygChannel,
    updateUrlSubpanelId,
    updateLocationURL,
    setLayoutConfigData,
    getLayoutConfigData,
    setDroppedElementType,
    getDroppedElementType,
    setDroppedElementId,
    getDroppedElementId,
    clearDroppedElementIdAndType,
    registerLeaveHandler,
    unregisterHandler
};
export default exports;

app.factory( 'wysiwygUtilService', () => exports );
