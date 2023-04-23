// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Dpv1Awb0ImportFtrDataService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

var m_selectedobject = null;

var m_modelObjects = [];
var m_modelType = null;
var m_attachmentTypes = [];
var m_pselectedobject = null;

var exports = {};
var self = {};

/**
 * Update the data object from Application Context
 *
 */
export let getSelectedObject = function() {
    var undelineObjectUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject;
    if( undelineObjectUid && undelineObjectUid !== null && undelineObjectUid !== "" ) {

        m_selectedobject = cdm.getObject( undelineObjectUid.dbValues[ 0 ] );
    } else {
        m_selectedobject = appCtxSvc.ctx.selected;
    }
    return m_selectedobject;
};

/**
 * Update the parent data object from Application Context
 *
 */
self.getParentSelectedObject = function() {
    var parentObject = null;
    var selectedUO = appCtxSvc.ctx.selected.props.awb0UnderlyingObject;
    if( selectedUO && selectedUO !== null && selectedUO !== "" ) {

        parentObject = cdm.getObject( appCtxSvc.ctx.selected.props.awb0Parent.dbValues[ 0 ] );

    }

    var parentUndelineObjectUid = parentObject.props.awb0UnderlyingObject;
    if( parentUndelineObjectUid && parentUndelineObjectUid !== null && parentUndelineObjectUid !== "" ) {

        m_pselectedobject = cdm.getObject( parentUndelineObjectUid.dbValues[ 0 ] );
    }
    //}

    return m_pselectedobject;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the correct
 * errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnPerformAction = function( response ) {
    var err = null;
    var message = "";

    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( response && response.ServiceData &&
        ( response.ServiceData.partialErrors || response.ServiceData.PartialErrors ) ) {
        err = soaService.createError( response );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.ServiceData && err.cause.ServiceData.partialErrors ) {
        _.forEach( err.cause.ServiceData.partialErrors, function( partErr ) {

            if( partErr.errorValues ) {

                _.forEach( partErr.errorValues, function( errVal ) {
                    if( errVal.code ) {
                        if( message && message.length > 0 ) {
                            message += '\n' + errVal.message;
                        } else {
                            message += errVal.message + '\n';
                        }
                    }
                } );
            }
        } );
    }

    return message;
};

export let getFileNameFromSelectedDataset = function( data ) {
    return data.fileName;
};

self.getTypeObject = function() {
    var modelObject = null;
    modelObject = exports.getSelectedObject();
    m_modelType = modelObject.type;

    return m_modelType;
};

/**
 * Get the model objects based on conditions
 *
 */
self.getModelObject = function() {

    m_modelObjects = [];
    var modelObjectType = null;
    modelObjectType = self.getTypeObject();

    if( modelObjectType && modelObjectType !== null && modelObjectType === "InspectionDevice Revision" ) {
        m_pselectedobject = self.getParentSelectedObject();
        m_modelObjects.push( m_selectedobject );
        m_modelObjects.push( m_pselectedobject );
    } else {
        m_modelObjects.push( m_selectedobject );
    }
    return m_modelObjects;
};

/**
 * Get The Attachment count
 *
 */
export let getAttachmentCount = function() {
    var moAttachment = [];
    moAttachment = self.getModelObject();
    var attachmentcount = moAttachment.length;
    return attachmentcount;
};

/**
 * Get The Attachment Uids
 *
 */
export let getAttachmentUids = function() {
    var attachments = null;
    var attachmentUids = [];
    m_attachmentTypes = [];
    attachments = self.getModelObject();
    for( var i in attachments ) {
        attachmentUids.push( attachments[ i ].uid );
        m_attachmentTypes.push( 1 );
    }
    return attachmentUids;
};

/**
 * Get the Attachment Types
 *
 */
export let getAttachmentTypes = function() {
    return m_attachmentTypes;
};

/**
 * Get The workflow templates
 *
 */
export let getWorkflowTemplate = function() {
    var workflowTemplate = null;

    var modelObjectType = self.getTypeObject();

    if( modelObjectType === "MEInspection Revision" || modelObjectType === "MECMMInspection Revision" ||
        modelObjectType === "MEHHInspection Revision" || modelObjectType === "MEVisInspection Revision" ) {
        return "ExportRoutine_To_AI";
    } else if( modelObjectType === "InspectionDevice Revision" ) {
        return "ExportDevice_To_AI";
    } else if( modelObjectType === "MEPrPlantProcessRevision" ) {
        return "ExportPlant_To_AI";
    } else if( modelObjectType === "Dpv0CommonDeviceRevision" ) {
        return "ExportCommonDevice_To_AI";
    }

    return workflowTemplate;
};

/**
 * Gets the updated objects from importFeatureData soa response
 *
 * @param {Object} the response of importFeatureData soa
 * @return the created object
 */
export let getUpdatedObjects = function( response ) {
    var updatedObjects = [];
    if( response && response.ServiceData && response.ServiceData.updated ) {
        for( var i = 0; i < response.ServiceData.updated.length; i++ ) {
            updatedObjects.push( cdm.getObject( response.ServiceData.updated[ i ] ) );
        }
    }
    return updatedObjects;
};

/**
 * Sets the file name
 */
export let initDSCreateParams = function( data ) {
    data.objectName.dbValue = "";
    if( data.fileNameNoExt ) {
        data.objectName.dbValue = data.fileNameNoExt;
    }
};

export default exports = {
    getSelectedObject,
    populateErrorMessageOnPerformAction,
    getFileNameFromSelectedDataset,
    getAttachmentCount,
    getAttachmentUids,
    getAttachmentTypes,
    getWorkflowTemplate,
    getUpdatedObjects,
    initDSCreateParams
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Dpv1Awb0ImportFtrDataService
 */
app.factory( 'Dpv1Awb0ImportFtrDataService', () => exports );
