// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module provides graph authoring suppport
 *
 * @module js/graphGestureService
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import ngUtils from 'js/ngUtils';

/**
 * Define public API
 */
var exports = {};

export let registerDFEventHandlers = function( diagramView ) {

};

export default exports = {
    registerDFEventHandlers
};
/**
 * The service to perform SOA or REST calls.
 *
 * @member actionService
 * @memberof NgServices
 */
app.factory( 'graphGestureService', () => exports );
