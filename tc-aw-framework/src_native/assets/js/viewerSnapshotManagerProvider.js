// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define JSCom */

/**
 * This Snapshot service provider
 *
 * @module js/viewerSnapshotManagerProvider
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import assert from 'assert';

import 'jscom';

var exports = {};

/**
 * Provides an instance of viewer Snapshot manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerSnapshotManager} Returns viewer Snapshot manager
 */
export let getSnapshotManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerSnapshotManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer Snapshot data
 *
 * @constructor ViewerSnapshotManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerSnapshotManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Create snapshot
     *
     * @return {Promise} promise
     */
    self.createSnapshot = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.snapshotMgr.CreateSnapshot()
            .then( function( newSnapshotObject ) {
                deferred.resolve( newSnapshotObject );
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };

    /**
     * Fetches snapshots from server
     * @return {Promise} promise
     */
    self.getAllSnapshots = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.snapshotMgr.getAllSnapshots()
            .then( function( snapshotList ) {
                deferred.resolve( snapshotList );
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };

    /**
     * Deletes all snapshots
     * @return {Promise} promise
     */
    self.deleteAllSnapshots = function() {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.snapshotMgr.getAllSnapshots()
            .then( function( snapshotList ) {
                return snapshotList.deleteAllSnapshots();
            } )
            .then( function() {
                deferred.resolve();
            } ).catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };
};

export default exports = {
    getSnapshotManager
};
/**
 * This service is used to get viewerSnapshotManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerSnapshotManagerProvider', () => exports );
