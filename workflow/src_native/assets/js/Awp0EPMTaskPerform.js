// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
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
 * @module js/Awp0EPMTaskPerform
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import viewModelObjSvc from 'js/viewModelObjectService';
import Awp0PerformTask from 'js/Awp0PerformTask';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

var exports = {};

export let getComments = function( data ) {
    return Awp0PerformTask.getComments( data );
};

/**
 * Populate the properties on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let populatePanelData = function( data, selection ) {
    var selectedObject = selection;
    if( !selectedObject ) {
        selectedObject = viewModelObjSvc.createViewModelObject( appCtxSvc.ctx.task_to_perform.task[ 0 ] );
    }

    data.formObject = null;

    // This method is needed to set the correct style for panel when it will be visible in secondary area
    Awp0PerformTask.updateStyleForSecondaryPanel();

    if( typeof selectedObject.props.fnd0PerformForm !== typeof undefined &&
        typeof selectedObject.props.fnd0PerformForm.dbValues !== typeof undefined &&
        selectedObject.props.fnd0PerformForm.dbValues[ 0 ] !== '' ) {
        var fromTaskValue = selectedObject.props.fnd0PerformForm.dbValues[ 0 ];

        if( typeof fromTaskValue !== typeof undefined ) {
            var formObject = cdm.getObject( fromTaskValue );
            if( formObject ) {
                data.formObject = viewModelObjSvc.createViewModelObject( formObject );
            }
        }
    }

    var nameValue = selectedObject.props.object_string.dbValues[ 0 ];
    data.taskName.dbValue = nameValue;
    data.taskName.uiValue = nameValue;

    var commentsValue = selectedObject.props.comments.dbValues[ 0 ];
    data.comments.dbValue = commentsValue;
    data.comments.uiValue = commentsValue;

    Awp0PerformTask.populateDescription( data, selectedObject );

    awp0InboxUtils.populateJobDescription(data, selectedObject);

    var secureTaskValue = selectedObject.props.secure_task.dbValues[ 0 ];
    data.isSecureTask.dbValue = secureTaskValue === '1';

    var hasFailurePathsValue = selectedObject.props.has_failure_paths.dbValues[ 0 ];
    data.hasFailurePaths.dbValue = hasFailurePathsValue === '1';

    data.isDSConfigured = false;

    var deferred = AwPromiseService.instance.defer();
    Awp0PerformTask.getDigitalSignatureService().then( function( awDigitalSignatureService ) {
        deferred.resolve( null );

        if( awDigitalSignatureService ) {
            data.isDSConfigured = true;
            var isApplyDS = awDigitalSignatureService.isApplyDS( selectedObject );
            var isAuthenticationRequired = awDigitalSignatureService.isAuthenticationRequired( selectedObject );

            if( isApplyDS || isAuthenticationRequired ) {
                awDigitalSignatureService.addActiveXObjectElement();
            }
        }
    } );
    return deferred.promise;
};

/**
 * Add that value to localization for confirm message to show correctly.
 *
 * @param {String} taskResult - Slected button from UI
 * @param {object} data - the data Object
 */
export let getSelectedPath = function( taskResult, data ) {
    data.i18n.selectedPath = taskResult;
    return taskResult;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the correct
 * errors only to the user.
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorMessageOnPerformAction = function( response ) {
    return Awp0PerformTask.populateErrorMessageOnPerformAction( response );
};

/**
 * Return the properties that are modified from UI and return those properties.
 *
 * @param {Object} modelObject Modle object whose properties are modified
 *
 * @returns {Array} Proeprties that needs to be saved
 */
export let getPropertiesToSave = function( modelObject ) {
    if( !modelObject ) {
        return [];
    }
    // Get all modified properties from form object and return those dirty props directly so that it
    // can be saved
    var modifiedProperties = modelObject.getDirtyProps();

    // If properties are null then return empty array
    if( !modifiedProperties ) {
        modifiedProperties = [];
    }
    return modifiedProperties;
};


/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        msgObj.msg += '<BR/>';
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let processPartialErrors = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if( response && response.ServiceData && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

export default exports = {
    getComments,
    populatePanelData,
    getSelectedPath,
    populateErrorMessageOnPerformAction,
    getPropertiesToSave,
    processPartialErrors
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Awp0EPMTaskPerform
 */
app.factory( 'Awp0EPMTaskPerform', () => exports );
