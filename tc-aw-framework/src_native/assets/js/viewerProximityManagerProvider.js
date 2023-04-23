// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define JSCom */

/**
 * This Proximity service provider
 *
 * @module js/viewerProximityManagerProvider
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import assert from 'assert';

import 'jscom';

var exports = {};

/**
 * Provides an instance of viewer Proximity manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerProximityManager} Returns viewer Proximity manager
 */
export let getProximityManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerProximityManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer Proximity data
 *
 * @constructor ViewerProximityManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerProximityManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Get target Occurrence list's clone stable UID chain for Proximity
     *
     * @return {String[]} clone stable UID chain list
     */
    var _getProximityTargetOccList = function() {
        var proximityCtx = appCtxService.getCtx( _viewerContextNamespace ).geoAnalysisProximitySearch;
        var targetListPkdCsids = proximityCtx.targetListPkdCsids; //$NON-NLS-1$
        var occClsIdList = proximityCtx.targetCsidList; //$NON-NLS-1$

        // add packed ids as well
        if( targetListPkdCsids !== undefined && !_.isEmpty( targetListPkdCsids ) ) {
            for( var i = 0; i < targetListPkdCsids.length; i++ ) {
                occClsIdList.push( targetListPkdCsids[ i ] );
            }
        }

        return occClsIdList;
    };

    /**
     * Executes proximity search on server.
     * @param  {[Object]} occObjList occ objects
     * @param  {Object} promiseToResolveOnComplete promise the resolves on search completion.
     */
    function executeSearchOnServer( occObjList, promiseToResolveOnComplete ) {
        _viewerView.proximityMgr.executeWithTargetOccurrences( occObjList ).then( function() {
            _viewerView.proximityMgr.getClearanceCalcPercentDone()
                .then( function( percentageDone ) {
                    if( percentageDone < 100 ) {
                        executeSearchOnServer( occObjList, promiseToResolveOnComplete );
                    } else {
                        promiseToResolveOnComplete.resolve();
                    }
                }, function( reason ) {
                    promiseToResolveOnComplete.reject( reason );
                } );
            promiseToResolveOnComplete.resolve();
        }, function( reason ) {
            promiseToResolveOnComplete.reject( reason );
        } );
    }

    /**
     * execute proximity search
     *
     * @param {Object} promise promise that resolves on search complete
     */
    self.executeProximitySearch = function( promise ) {
        var occList = _getProximityTargetOccList();
        var occObjList = [];

        for( var idx = 0; idx < occList.length; idx++ ) {
            occObjList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occList[ idx ] ) );
        }
        executeSearchOnServer( occObjList, promise );
    };

    /**
     * Execute proximity search
     *
     * @param {Object} promise promise that resolves on search complete
     * @param {Number} distance the distance
     */
    self.executeProximitySearchInDistance = function( promise, distance ) {
        _viewerView.proximityMgr.setClearanceValue( distance ).then(
            function() {
                var occList = _getProximityTargetOccList();
                var occObjList = [];

                for( var idx = 0; idx < occList.length; idx++ ) {
                    occObjList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occList[ idx ] ) );
                }

                executeSearchOnServer( occObjList, promise );
            },
            function( reason ) {
                promise.reject( reason );
            } );
    };
};

export default exports = {
    getProximityManager
};
/**
 * This service is used to get viewerProximityManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerProximityManagerProvider', () => exports );
