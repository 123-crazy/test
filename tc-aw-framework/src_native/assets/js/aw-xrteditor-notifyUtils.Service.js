// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 noty,
 define
 */
import app from 'app';
import 'noty';

/**
 * Notification Service Object implementation
 *
 * @module js/aw-xrteditor-notifyUtils.Service
 * @class
 */
var TcNotifyService = function() {
    'use strict';

    var self = this;

    /**
     * Shows an info message at the bottom of the page
     *
     * @memberof TcNotifyService
     *
     * @param {String} msg - The message to display at the bottom of the page
     */
    self.info = function( msg ) {
        noty( {
            text: msg,
            layout: 'bottom',
            type: 'info',
            timeout: 6000,
            closeWith: [ 'button' ]
        } );
    };

    /**
     * Shows a warning message at the bottom of the page
     *
     * @memberof TcNotifyService
     *
     * @param {String} msg - The message to display at the bottom of the page
     */
    self.warning = function( msg ) {
        noty( {
            text: msg,
            layout: 'bottom',
            type: 'warning',
            timeout: 6000,
            closeWith: [ 'button' ]
        } );
    };

    /**
     * Shows an error message at the bottom of the page
     *
     * @memberof TcNotifyService
     *
     * @param {String} msg - The message to display at the bottom of the page
     */
    self.error = function( msg ) {
        noty( {
            text: msg,
            layout: 'bottom',
            type: 'error',
            timeout: 6000,
            closeWith: [ 'button' ]
        } );
    };
}; // End TcNotifyService


var exports = new TcNotifyService();

export default exports;

/**
 * TODO
 *
 * @memberof NgServices
 * @member notifyService
 */
app.factory( 'notifyService', ()=>exports );
