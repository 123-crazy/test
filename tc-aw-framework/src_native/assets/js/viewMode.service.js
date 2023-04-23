// Copyright (c) 2020 Siemens

/**
 * @module js/viewMode.service
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';

let exports = {};

export let _viewModeContext = 'ViewModeContext';

var _availableViewModeContext = 'supportedViewModes';

var _getViewModeContext = function() {
    var ctx = appCtxService.getCtx( _viewModeContext );
    return ctx ? ctx : {};
};

/**
 * Change view mode
 *
 * @param {String} newViewMode - View mode key to change to.
 */
export let changeViewMode = function( viewMode ) {
    var currentCtx = _getViewModeContext();
    currentCtx[ _viewModeContext ] = viewMode;
    appCtxService.registerCtx( _viewModeContext, currentCtx );
};

/**
 * Get the current view mode
 *
 * @return {String} The current view mode
 */
export let getViewMode = function() {
    return _getViewModeContext()[ _viewModeContext ];
};

/**
 * Update which view modes are supported
 *
 * @param {String[]} viewModes - View modes that are available. Converted to Object to make conditions easier.
 */
export let setAvailableViewModes = function( viewModes ) {
    var currentCtx = _getViewModeContext();
    // Convert array to object - makes declarative conditions simpler
    currentCtx[ _availableViewModeContext ] = {};
    if( _.isArray( viewModes ) ) {
        viewModes.map( function( x ) {
            currentCtx[ _availableViewModeContext ][ x ] = {};
        } );
    }
    appCtxService.updateCtx( _viewModeContext, currentCtx );
};

/**
 * Get the available view modes
 *
 * @return {String[]} The supported view modes
 */
export let getAvailableViewModes = function() {
    var viewModes = _getViewModeContext()[ _availableViewModeContext ];
    return viewModes ? Object.keys( viewModes ) : [];
};

exports = {
    changeViewMode,
    getViewMode,
    setAvailableViewModes,
    getAvailableViewModes,
    _viewModeContext
};
export default exports;
/**
 * View mode service
 *
 * @memberof NgServices
 */
app.factory( 'viewModeService', () => exports );
