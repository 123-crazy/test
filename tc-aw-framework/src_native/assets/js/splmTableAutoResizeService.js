// Copyright (c) 2020 Siemens

/**
 * This service provides angular idle check to delay some critical watcher which impacts the performance
 *
 * @module js/splmTableAutoResizeService
 */
import app from 'app';
import awIdleWatcherService from 'js/awIdleWatcherService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * NOTE: Please run classification tag while touch this file
 */
export let startResizeWatcher = function( tableScope, gridId ) {
    awIdleWatcherService.waitForPageToLoad().then( function() {
        var resizeCheckDebounce = _.debounce( function() {
            eventBus.publish( gridId + '.plTable.resizeCheck' );
        }, 200 );

        tableScope.$watch( function() {
            if( awIdleWatcherService.isRunning() === false ) {
                resizeCheckDebounce();
            }
        } );

        tableScope.$on( '$destroy', function() {
            resizeCheckDebounce.cancel();
        } );
    } );
};

exports = {
    startResizeWatcher
};
export default exports;
app.factory( 'splmTableAutoResizeService', () => exports );
