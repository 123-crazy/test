// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * @module js/hosting/hostLogging
 * @namespace hostLogging
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import _ from 'lodash';
import io from 'lib/socket.io-client/socket.io';

let exports = {};

export let addHostingLogging = function() {
    let deferred = AwPromiseService.instance.defer();

    logger.setEventBus( eventBus );

    const socket = io( '/hosting-logging' );

    socket.on( 'connect', () => {
        deferred.resolve();
    } );

    eventBus.subscribe( 'log', ( { output } ) => {
        socket.emit( 'send-client-message', {
            message: output
        } );
    } );

    return deferred.promise;
};

export default exports = {
    addHostingLogging
};

/**
 * Register service.
 *
 * @member hostLogging
 * @memberof NgServices
 */
app.factory( 'hostLogging', () => exports );
