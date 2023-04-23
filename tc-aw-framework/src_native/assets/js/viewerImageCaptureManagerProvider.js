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
 * This is image capture service provider
 *
 * @module js/viewerImageCaptureManagerProvider
 */
import * as app from 'app';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import 'jscom';

var exports = {};

/**
 * Provides an instance of image capture manager
 *
 * @param {String} viewerCtxNamespace - Viewer context name space
 * @param {Object} viewerView - Viewer view
 * @param {Object} viewerContextData - Viewer Context data
 *
 * @returns {Object} Returns Image capture manager
 */
export let getImgCaptureManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    return new ImageCaptureManager( viewerCtxNamespace, viewerView, viewerContextData );
};

/**
 * Class to hold the image capture manager attributes
 *
 * @constructor ImageCaptureManager
 *
 * @param {String} viewerCtxNamespace - Viewer context name space
 * @param {Object} viewerView - Viewer view
 * @param {Object} viewerContextData - Viewer Context data
 */
var ImageCaptureManager = function( viewerCtxNamespace, viewerView, viewerContextData ) {
    var self = this;
    var _viewerView = viewerView;
    var _viewerContextData = viewerContextData;

    /**
     * To create image capture in viewer.
     *
     * @param {String} contextObjectUid - object uid
     * @param {String} viewerCtxNameSpace - registered viewer context name space
     * @param {String} captureName - name of the image capture
     * @param {String} captureDesc - description of the image capture
     * @param {Promise} promise A promise resolved once section is create in viewer in given plane
     */
    self.captureImage = function( contextObjectUid, viewerCtxNameSpace, captureName, captureDesc, promise ) {
        _viewerView.imageCaptureMgr.saveScreenshot( contextObjectUid, captureName, captureDesc,
            window.JSCom.Consts.ImageType.PNG_24, 3520, 1980, 250 ).then( function( resultUid ) {
            var currentViewerCtx = appCtxService.getCtx( viewerCtxNameSpace );
            var imageCaptureCtx = currentViewerCtx.imageCapture;
            if( imageCaptureCtx === undefined || imageCaptureCtx === null ) {
                imageCaptureCtx = {};
            }
            imageCaptureCtx.imageCaptureUids = resultUid;
            currentViewerCtx.imageCapture = imageCaptureCtx;
            appCtxService.updateCtx( viewerCtxNameSpace, currentViewerCtx );
            promise.resolve( resultUid );
        } );
    };

    /**
     * To display image capture in viewer.
     *
     * @param {String} viewerCtxNameSpace - registered viewer context name space
     * @param {String} resultUrl - ticket
     * @param {Object} lastActiveCaptureObj - last selected captured object
     * @param {Boolean} selected -  Indicate whether it is selected or deselected
     */
    self.displayImageCapture = function( viewerCtxNameSpace, resultUrl, lastActiveCaptureObj, selected ) {
        var viewerCtxService = _viewerContextData.getViewerCtxSvc();
        viewerCtxService.updateViewerApplicationContext( viewerCtxNameSpace, viewerCtxService.VIEWER_VIEW_MODE_TOKEN, viewerCtxService.ViewerViewModes.VIEWER2D );
        eventBus.publish( 'imageCapture.updateViewWithCaptureImage', {
            viewerCtxNameSpace: viewerCtxNameSpace,
            fileUrl: resultUrl
        } );
        viewerCtxService.setMarkupCommandVisibility( selected, lastActiveCaptureObj );
    };

    /**
     * To deactivate the selected capture in viewer
     *
     * @param {String} viewerCtxNameSpace - registered viewer context name space
     * @param {Object} lastActiveCaptureObj - last selected captured object
     * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
     */
    self.deactivateCapturedObject = function( viewerCtxNameSpace, lastActiveCaptureObj, deferred ) {
        if( lastActiveCaptureObj !== null ) {
            _viewerView.imageCaptureMgr.applyScreenshotState( lastActiveCaptureObj.uid ).then( function() {
                self.closeImageCaptureView( viewerCtxNameSpace );
                deferred.resolve();
            } );
        } else {
            self.closeImageCaptureView( viewerCtxNameSpace );
            deferred.resolve();
        }
    };

    /**
     * Deactivate image capture in viewer
     *
     * @param {String} viewerCtxNameSpace - registered viewer context name space
     */
    self.closeImageCaptureView = function( viewerCtxNameSpace ) {
        var viewerCtxService = _viewerContextData.getViewerCtxSvc();
        viewerCtxService.updateViewerApplicationContext( viewerCtxNameSpace, viewerCtxService.VIEWER_VIEW_MODE_TOKEN, viewerCtxService.ViewerViewModes.VIEWER3D );
        eventBus.publish( 'imageCapture.deactivateImageCaptureDisplay', {
            viewerCtxNameSpace: viewerCtxNameSpace
        } );
    };

    /**
     * Applies the state stored in the dataset to the 3D view
     *
     * @param {string} datasetUID  UID of image capture dataset for which state needs to be applied
     * @param {Promise} deferred A promise resolved once section is create in viewer in given plane
     */
    self.applyScreenshotState = function( datasetUID, deferred ) {
        _viewerView.imageCaptureMgr.applyScreenshotState( datasetUID )
            .then( function() {
                deferred.resolve();
            }, function( reason ) {
                deferred.reject( reason );
            } );
    };

    /**
     * Generates a 2D captured image of the currently active 3D View. It uploads the 2D image as a dataset to Teamcenter,
     * attaching it to the object defined in the input or the NewStuff folder.
     *
     * @param {String} attachToObjectUID Teamcenter object to attached the 2D dataset to. Could be empty, in which case user's NewStuff folder will be used
     * @param {String} screenshotName name for screenshot
     * @param {String} screenshotDescription description for screenshot
     * @param {JSCom.Consts.ImageType} type enumeration specifying the type of image to generate.
     * @param {Number} xSize width of the image
     * @param {Number} ySize height of the image
     * @param {Number} DPI definition (dots per inch)
     * @param {Promise} deferred A promise resolved once image is captured
     *
     */
    self.saveScreenshot = function( attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI, deferred ) {
        _viewerView.imageCaptureMgr.saveScreenshot( attachToObjectUID, screenshotName, screenshotDescription, type, xSize, ySize, DPI )
            .then( function( resultUid ) {
                deferred.resolve( resultUid );
            }, function( reason ) {
                deferred.reject( reason );
            } );
    };
};

export default exports = {
    getImgCaptureManager
};
/**
 * This service is used to get viewerImageCaptureManagerProvider
 *
 * @memberof NgServices
 *
 * @param {Object} appCtxService application context service
 * @returns {Object} object referring to exposed service api's
 */
app.factory( 'viewerImageCaptureManagerProvider', () => exports );
