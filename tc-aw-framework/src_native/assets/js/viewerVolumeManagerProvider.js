// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define JSCom */

/**
 * This Volume service provider
 *
 * @module js/viewerVolumeManagerProvider
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import assert from 'assert';

import 'jscom';

var exports = {};

/**
 * Provides an instance of viewer Volume manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerVolumeManager} Returns viewer Volume manager
 */
export let getVolumeManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerVolumeManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer Volume data
 *
 * @constructor viewerVolumeManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerVolumeManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerContextNamespace = viewerCtxNamespace;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Get target Occurrence list's clone stable UID chain for Volume
     *
     * @return {String[]} clone stable UID chain list
     */
    var _getVolumeTargetOccList = function() {
        var volumeCtx = appCtxService.getCtx( _viewerContextNamespace ).geoAnalysisVolumeSearch;
        var targetListPkdCsids = volumeCtx.targetListPkdCsids; //$NON-NLS-1$
        var occClsIdList = volumeCtx.targetCsidList; //$NON-NLS-1$

        // add packed ids as well
        if( targetListPkdCsids !== undefined && !_.isEmpty( targetListPkdCsids ) ) {
            for( var i = 0; i < targetListPkdCsids.length; i++ ) {
                occClsIdList.push( targetListPkdCsids[ i ] );
            }
        }

        return occClsIdList;
    };

    /**
     * execute Volume search
     *
     * @param {Object} promise promise that resolves on search complete
     * @param {Object} cVs corner values object
     */
    self.executeVolumeSearch = function( promise, cVs ) {
        var minVals = [ cVs[ 0 ], cVs[ 1 ], cVs[ 2 ] ];
        var maxVals = [ cVs[ 3 ], cVs[ 4 ], cVs[ 5 ] ];
        var valSetPromises = [];
        valSetPromises.push( _viewerView.volumeMgr.setMin( minVals ) );
        valSetPromises.push( _viewerView.volumeMgr.setMax( maxVals ) );

        JSCom.jQueryPLMVis.when( valSetPromises ).done( function() {
            _viewerView.volumeMgr.execute().then( function() {
                promise.resolve();
            } );
        } );
    };

    /**
     * Gets corner values based on target occurrences
     *
     * @param {Object} promise promise that resolves to corner values
     */
    self.getCornerValuesFromOccListInCtx = function( promise ) {
        var occObjList = [];
        var cornerValues = {};
        var occList = _getVolumeTargetOccList();

        if( !occList || occList.length === 0 ) {
            promise.resolve( cornerValues );
        } else {
            for( var idx = 0; idx < occList.length; idx++ ) {
                occObjList.push( _viewerContextData.getViewerCtxSvc().createViewerOccurance( occList[ idx ] ) );
            }
        }

        _viewerView.volumeMgr.updateVolumeFromOccurrenceList( occObjList ).then( function() {
            var valGetPromises = [];
            valGetPromises.push( _viewerView.volumeMgr.getMin() );
            valGetPromises.push( _viewerView.volumeMgr.getMax() );
            JSCom.jQueryPLMVis.when( valGetPromises ).done( function( minVals, maxVals ) {
                cornerValues.X1 = minVals[ 0 ];
                cornerValues.Y1 = minVals[ 1 ];
                cornerValues.Z1 = minVals[ 2 ];

                cornerValues.X2 = maxVals[ 0 ];
                cornerValues.Y2 = maxVals[ 1 ];
                cornerValues.Z2 = maxVals[ 2 ];

                promise.resolve( cornerValues );
            } );
        } );
    };

    /**
     * Sets new state of Volume box
     *
     * @param {Object} promise promise that resolves to corner values
     * @param {Boolean} state On/Off
     */
    self.setVolumeFilterOnNative = function( promise, isOn ) {
        _viewerView.volumeMgr.setVisibility( isOn ).then( function() {
            promise.resolve();
        } );
    };

    /**
     * Sets new state of Volume box
     *
     * @param {Object} cornerVals corner values in form of coordinates
     * @param {Object} promise promise that resolves to draw volume box
     *
     */
    self.drawVolumeBox = function( cornerVals, promise ) {
        var minVals = [ cornerVals.X1, cornerVals.Y1, cornerVals.Z1 ];
        var maxVals = [ cornerVals.X2, cornerVals.Y2, cornerVals.Z2 ];
        var valSetPromises = [];
        valSetPromises.push( _viewerView.volumeMgr.setMin( minVals ) );
        valSetPromises.push( _viewerView.volumeMgr.setMax( maxVals ) );

        JSCom.jQueryPLMVis.when( valSetPromises ).done( function() {
            _viewerView.volumeMgr.setVisibility( true ).then( function() {
                promise.resolve();
            } );
        } );
    };
};

export default exports = {
    getVolumeManager
};
/**
 * This service is used to get viewerVolumeManager
 *
 * @memberof NgServices
 */
app.factory( 'viewerVolumeManagerProvider', () => exports );
