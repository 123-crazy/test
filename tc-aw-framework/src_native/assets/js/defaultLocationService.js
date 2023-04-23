// Copyright (c) 2020 Siemens

/**
 * @module js/defaultLocationService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import keyboardService from 'js/keyboardService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

// Service
import AwStateService from 'js/awStateService';

let exports;

export let getCurrentState = function() {
    return AwStateService.instance.current;
};

export let normalizeStateName = function() {
    // note the this is here before conversion
    return exports.getCurrentState().parent.replace( /_/g, '.' );
};

export let subscribeForLocationUnloadEvent = function( name ) {
    var locContUnLoadedSub = eventBus.subscribe( name + '.contentUnloaded', function() {
        appCtxService.unRegisterCtx( 'locationContext' );
        keyboardService.unRegisterKeyDownEvent();
        eventBus.unsubscribe( locContUnLoadedSub );
    } );
};

export let updateTabs = function( data ) {
    if( _.isObject( data ) ) {
        var stateName = exports.getCurrentState().name;
        data.subLocationTabCond = data.subLocationTabCond || {};
        data.subLocationTabCond.currentTab = stateName;
    }
};

exports = {
    getCurrentState,
    normalizeStateName,
    subscribeForLocationUnloadEvent,
    updateTabs
};
export default exports;
/**
 * @memberof NgServices
 * @member defaultLocationService
 *
 */
app.factory( 'defaultLocationService', () => exports );
