// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * This is the command handler for deleting the capture from capture list
 *
 * @module js/deleteImageCaptureCommandHandler
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';

var exports = {};

/**
 * Delete the selected capture
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let deleteImageCapture = function( vmo ) {
    var userSession = cdmSvc.getUserSession();
    var objectUser = vmo.props.owning_user.displayValues[ 0 ];
    var loggedInUser = userSession.props.user.uiValues[ 0 ];
    if( _.includes( objectUser, loggedInUser ) ) {
        var imageCaptureToBeDeleted = {};
        imageCaptureToBeDeleted.captureId = vmo.uid;
        imageCaptureToBeDeleted.captureText = vmo.cellHeader1.toString();
        imageCaptureToBeDeleted.selectedModelObject = vmo;

        if( appCtxSvc.getCtx( 'imageCaptureToBeDeleted' ) === null ) {
            appCtxSvc.registerCtx( 'imageCaptureToBeDeleted', imageCaptureToBeDeleted );
        } else {
            appCtxSvc.updateCtx( 'imageCaptureToBeDeleted', imageCaptureToBeDeleted );
        }
        eventBus.publish( "imageCapture.deleteImageCapture", {} );
    } else {
        logger.error( "You do not have permission to delete this Image Capture" );
    }

};

export default exports = {
    deleteImageCapture
};
/**
 * Delete the image capture from the list handler service
 *
 * @memberof NgServices
 * @member removeSearchTargetCommandHandler
 */
app.factory( 'deleteImageCaptureCommandHandler', () => exports );
