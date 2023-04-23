// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/**
 * This 3D Markup service provider
 *
 * @module js/viewer3dMarkupManagerProvider
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import assert from 'assert';
import 'manipulator';

var exports = {};

/**
 * Provides an instance of viewer 3D Markup manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {Viewer3DMarkupManager} Returns viewer 3D Markup manager
 */
export let getViewer3DMarkupManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new Viewer3DMarkupManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the viewer 3D Markup data
 *
 * @constructor Viewer3DMarkupManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var Viewer3DMarkupManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );

    var self = this;
    var _viewerView = viewerView;



    /**
     * Remove all markups EMM
     */
    self.removeAllAnnotationLayer = function() {
        var deferred = AwPromiseService.instance.defer();

        _viewerView.viewMarkupMgr.removeAllMarkups(  )
             .then( function(  ) {
                 deferred.resolve(  );
             } )
             .catch( function( err ) {
                 deferred.reject( err );
            } );
        return deferred.promise;
    };

    /**
     * Add annotations EMM
     */
    self.addAnnotationLayer = function( jsonData, vpHeight, vpWidth ) {
        var deferred = AwPromiseService.instance.defer();
        _viewerView.viewMarkupMgr.addMarkup( jsonData, vpHeight, vpWidth )
            .then( function( flatBuffer ) {
                deferred.resolve( flatBuffer );
            } )
            .catch( function( err ) {
                deferred.reject( err );
            } );
        return deferred.promise;
    };


    /**
     * clear viewer visibility
     */
    self.cleanUp = function() {

    };
};

export default exports = {
    getViewer3DMarkupManager
};
/**
 * This service is used to get Viewer3DMarkupManager
 *
 * @memberof NgServices
 */
app.factory( 'viewer3DMarkupManagerProvider', () => exports );
