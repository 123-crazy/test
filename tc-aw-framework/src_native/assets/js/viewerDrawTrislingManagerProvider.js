// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@
/*global
 define
 JSCom
 */
/**
 * This service is interface for draw manager object in Viewer
 *
 * @module js/viewerDrawTrislingManagerProvider
 */
import * as app from 'app';
import assert from 'assert';
import 'jscom';

var exports = {};

/**
 * Provides an instance of viewer draw manager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 *
 * @return {ViewerDrawManager} Returns viewer draw manager
 */
export let getViewerDrawManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ViewerDrawManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the draw manager attributes
 *
 * @constructor ViewerDrawManager
 *
 * @param {Object} viewerCtxNamespace Viewer context name space
 * @param {Object} viewerView Viewer view
 * @param {Object} viewerContextData Viewer Context data
 */
var ViewerDrawManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    assert( viewerContextData, 'Viewer context data can not be null' );
    var self = this;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * Set triad to be visible or not at the bottom of viewer.
     *
     * @param {Boolean} drawTrihedron - Set visibility of triad in viewer.
     */
    self.drawTrihedron = function( drawTrihedron ) {
        _viewerView.drawMgr.drawTrihedron( drawTrihedron );
    };

    /**
     * Set draw policy
     *
     * @param {boolean} policy policy
     */
    self.enableDrawing = function( isToEnable ) {
        var newPolicy = isToEnable ? window.JSCom.Consts.DrawPolicy.AUTOMATIC : window.JSCom.Consts.DrawPolicy.DISABLED;
        _viewerView.drawMgr.setDrawPolicy( newPolicy );
    };  
    
    /**
     * Get if triad is visible or not at the bottom of viewer.
     *
     * @returns {boolean} true if triad is visible
     */
    self.isTrihedronEnabled = function() {
        return _viewerView.drawMgr.isTrihedronEnabled();
    };
};

export default exports = {
    getViewerDrawManager
};
/**
 * This service is used to get viewerDrawTrislingManagerProvider
 *
 * @memberof NgServices
 */
app.factory( 'viewerDrawTrislingManagerProvider', () => exports );
