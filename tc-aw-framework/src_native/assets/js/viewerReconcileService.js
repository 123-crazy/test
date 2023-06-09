// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines {@link NgServices.viewerReconcileService} which provides facility to register reconcile messages
 *
 * @module js/viewerReconcileService
 * @requires app
 * @requires lodash
 */
import * as app from 'app';
import localeSvc from 'js/localeService';
import msgSvc from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import 'jscom';

import 'js/appCtxService';

/**
 * self object pointing to this instance
 */
let exports = {};

/**
 * Get viewer message for key
 *
 * @param {String} key key of which localized value is required
 *
 * @return {Promise} promise returns promise of
 */
var _getViewerMessage = function( keys ) {
    var returnPromise = AwPromiseService.instance.defer();
    localeSvc.getTextPromise( 'Awv0threeDViewerMessages' ).then(
        function( localTextBundle ) {
            var result = {};
            for( var i = 0; i < keys.length; i++ ) {
                result[ keys[ i ] ] = localTextBundle[ keys[ i ] ];
            }
            returnPromise.resolve( result );
        },
        function( error ) {
            returnPromise.reject( error );
        } );
    return returnPromise.promise;
};

/**
 * Posts user messages for reconcile warning
 *
 * @param {String} message Message to be displayed
 */
function _displayMessages( messages ) {
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: messages.OK,
        onClick: function( $noty ) {
            $noty.close();
        }
    } ];
    msgSvc.showWarning( messages.reconcileWarningMessage, buttons );
}

/**
 * Default reconcile handler
 */
var _defaultReconcileHandlerFn = function() {
    _getViewerMessage( [ 'reconcileWarningMessage', 'OK' ] ).then( function( messages ) {
        _displayMessages( messages );
    } );
};

/**
 * Sets up reconcile handle hook
 * @param  {Object} viewerView viewer view
 * @param  {Function} reconcileHandlerFn function that overrides default behaviour
 */
export let setupReconcile = function( viewerView, reconcileHandlerFn ) {
    var handler = undefined;

    if( reconcileHandlerFn && typeof reconcileHandlerFn === 'function' ) {
        handler = reconcileHandlerFn;
    } else {
        handler = _defaultReconcileHandlerFn;
    }

    viewerView.visibilityMgr.addReconcileWarningListener( {
        reconcileWarningFound: handler
    } );
};

export default exports = {
    setupReconcile
};
/**
 * Set of utility functions for viewer
 *
 * @class viewerReconcileService
 * @param appCtxService {Object} - appCtxService
 * @memberOf NgServices
 */
app.factory( 'viewerReconcileService', () => exports );
