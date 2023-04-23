// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/awDigitalSignatureService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import soaService from 'soa/kernel/soaService';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import localeSvc from 'js/localeService';
import policySvc from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';
import logger from 'js/logger';

var _taskCompletionFailure = '';

/**
 * Define public API
 */
var exports = {};

/**
 * Determines whether the browser is valid for digital signatures.
 *
 * @return {Boolean} True/False based on browser type
 */
export let isValidBrowser = function() {
    var ua = window.navigator.userAgent;
    if( ua.indexOf( 'MSIE' ) !== -1 || navigator.appVersion.indexOf( 'Trident/' ) > 0 ) {
        return true;
    }
    return false;
};

/**
 * Determines whether we have data we need to sign.
 *
 * @param {object} modelObject - the current selection object
 * @return {Boolean} True/False based on property value
 */
export let isApplyDS = function( modelObject ) {
    if( modelObject && modelObject.props && modelObject.props.fnd0ObjectsToDigitallySign ) {
        var propValues = modelObject.props.fnd0ObjectsToDigitallySign.dbValues;

        if( propValues && propValues.length > 0 ) {
            return true;
        }
    }
    return false;
};

/**
 * Determines if we need to re-authenticate the user (PKI).
 *
 * @param {object} modelObject - the current selection object
 * @return {Boolean} True/False based on property value
 */
export let isAuthenticationRequired = function( modelObject ) {
    if( modelObject && modelObject.props && modelObject.props.fnd0IsPKIAuthRequired ) {
        var propValues = modelObject.props.fnd0IsPKIAuthRequired.dbValues;
        if( propValues && propValues.length > 0 && propValues[ 0 ] ) {
            return propValues[ 0 ] > 0;
        }
    }
    return false;
};

/**
 * Add activeX object element already not exist. This will be used to allow user to perform the task using PKI.
 */
export let addActiveXObjectElement = function() {
    var axo = document.getElementById( 'OBJ_ACTIVEX' );
    if( !axo ) {
        var divObject = document.createElement( 'div' );
        var content = '<object style="display: none;" id="OBJ_ACTIVEX" classid="CLSID:2E1A0968-3079-4A3B-84AE-0E0D2CFD2B62"></object>';
        divObject.innerHTML = content;
        document.body.appendChild( divObject );
    }
};

/**
 * Check input action string and compare to specific values and based on that return true or false
 *
 * @param {object} actionString - the action string that needs to be check
 * @return {boolean} - True if valid action else false
 */
var _isValidSigningAction = function( actionString ) {
    if( !actionString ) {
        return false;
    }
    if( actionString !== 'SOA_EPM_fail_action' || actionString !== 'SOA_EPM_no_action' ||
        actionString !== 'SOA_EPM_reject_action' ) {
        return true;
    }
    return false;
};


/**
 * Invoke the performActionWithSignature SOA call by constructing the input data from input values and completes
 * the task. In case of error show the error to user.
 *
 * @param {object} data - the data Object
 * @param {object} signatures - the signature object that contains the digital signature information
 */
var _performActionWithSignatureInternal = function( data, signatures ) {
    var deferred = AwPromiseService.instance.defer();
    // Create the input structure
    var input = {
        task: data.inputData.actionableObject,
        action: data.inputData.action,
        comments: data.inputData.comments,
        password: data.inputData.password,
        supportingValue: data.inputData.supportingValue,
        supportingObject: data.inputData.supportingObject
    };
    if( signatures ) {
        input.signatures = signatures;
    }

    var policy = {
        types: [ {
            name: 'EPMTask',
            properties: [ {
                name: 'awp0PerformableByMeBehavior'
            },
            {
                name: 'root_target_attachments'
            } ]
        }, {
            name: 'Signoff',
            properties: [ {
                name: 'awp0PerformableByMeBehavior'
            },
            {
                name: 'root_target_attachments'
            } ]

        },
        {
            name: 'TaskInbox',
            properties: [ {
                name: 'contents'
            } ]
        } ]
    };
    policySvc.register( policy );

    // Call the SOA to complete the task
    soaService.postUnchecked( 'Workflow-2014-06-Workflow', 'performActionWithSignature', input ).then(
        function( response ) {
            if( policy ) {
                policySvc.unregister( policy );
            }
            deferred.resolve( response );
        },
        function( error ) {
            if( policy ) {
                policySvc.unregister( policy );
            }
            deferred.reject( error );
        } );
    return deferred.promise;
};

/**
 * Get the logged in used id from application context service and return the userId value
 *
 * @return {String} userId - Logged in user id value
 */
var _getLoggedInUserId = function() {
    var userId = null;
    var userSession = appCtxSvc.getCtx( 'userSession' );
    if( userSession && userSession.props && userSession.props.user_id ) {
        userId = userSession.props.user_id.dbValues[ 0 ];
    }
    return userId;
};

/**
 * Get the error message to be displayed to user
 *
 * @param {object} data - the data Object
 * @param {object} message - the message that will be shown to user
 */
var _showErrorMessage = function( data, message ) {
    var context = {
        data: data,
        ctx: appCtxSvc.ctx
    };
    var localizedMessage = messagingService.applyMessageParams( message, [ 'data.taskName.uiValue' ], context );
    messagingService.showError( localizedMessage );
};

/**
 * Get the signature from activeX object if exist and those signatures will be used.
 *
 * @param {object} data - the data Object
 * @param {object} textToSign - the user id value for which digital signature needs to be computed
 * @return {object} text - Digital signature information
 */
export let getSignature = function( data, textToSign ) {
    exports.addActiveXObjectElement();
    var axo = document.getElementById( 'OBJ_ACTIVEX' );
    // Do not add axo.ComputeSignature is undefined check in this if block.
    // This condition returns different output for draft with false and draft not set even though axo.computesignature is always undefined.
    // It is implemented by Tcss Team , this axo.ComputeSignature method call triggers pki authentication in else block.
    if( axo === null ) {
        logger
            .error( 'Teamcenter Digital Signature Plugin is not found. Please contact your System Administrator.' );
        return null;
    }
    try {
        //Parameter is the data for which signature needs to be generated. It needs to be utf-8 encoded.
        //The returned value is the signature that needs to be stored in the db and used for verification
        return axo.ComputeSignature( textToSign );
    } catch ( e ) {
        //Exception encountered in getting signature. These exceptions are thrown from MSDN API and a meaningful localized message is returned.
        //This message needs to be displayed to the end-user directly.
        //The message is obtained directly from Microsoft cryptography API
        messagingService.showError( e.message );
        return null;
    }
};

/**
 * Get the logged in user digital signature
 *
 * @param {object} data - the data Object
 * @return {object} signature - Digital signature information for logged in user
 */
export let getLoggedInUserSignature = function( data ) {
    var userId = _getLoggedInUserId();
    return exports.getSignature( data, userId );
};

/**
 * This method will get the attachment that needs to be signed and then get the signature for those attachments
 * and then perform the task.
 *
 * @param {object} data - the data Object
 */
var _signAttachmentsAndCompleteTask = function( data ) {
    var taskObject = data.inputData.actionableObject;
    var attachmentsToSign = [];

    if( taskObject && taskObject.props && taskObject.props.fnd0ObjectsToDigitallySign ) {
        var attachments = taskObject.props.fnd0ObjectsToDigitallySign.dbValues;

        _.forEach( attachments, function( attachment ) {
            var attachmentObject = cdm.getObject( attachment );

            if( attachmentObject ) {
                attachmentsToSign.push( attachmentObject );
            }
        } );
    }

    // Check if attachment to sign array is not null and contain some object then only
    // call the SOA to get the signature for those attachments
    if( attachmentsToSign && attachmentsToSign.length > 0 ) {
        var input = {
            targetObject: attachmentsToSign
        };

        soaService.post( 'Core-2014-06-DigitalSignature', 'getSignatureMessages', input ).then(
            function( response ) {
                var signatures = [];
                if( response ) {
                    // Iterate for each output to get the signature
                    _.forEach( response.output, function( output ) {
                        var message = output.message;
                        var targetObject = output.targetObject;

                        var signedUserID = exports.getSignature( data, message );
                        if( signedUserID ) {
                            var signature = {};
                            signature.base64String = signedUserID;
                            signature.object = targetObject;
                            signatures.push( signature );
                        } else {
                            _showErrorMessage( data, _taskCompletionFailure );
                            return;
                        }
                    } );

                    _performActionWithSignatureInternal( data, signatures );
                }
            },
            function( error ) {
                messagingService.showError( error.message );
                return;
            } );
    }
};

/**
 * This method performs the action with digital signatures.
 *
 * @param {object} data - the data Object
 */
export let performActionWithSignature = function( data ) {
    var applyDS = exports.isApplyDS( data.inputData.actionableObject );
    var authenticationRequired = exports.isAuthenticationRequired( data.inputData.actionableObject );

    if( applyDS && _isValidSigningAction( data.inputData.action ) ) {
        // Get the attachment that needs to be sign and then get the signature for that and then complete the task
        _signAttachmentsAndCompleteTask( data );
    } else if( authenticationRequired ) {
        // Get the digital signature for logged in user and perform the task
        var signedUserID = exports.getLoggedInUserSignature( data );
        if( signedUserID ) {
            var signatures = [];
            var signature = {};
            signature.base64String = signedUserID;
            signature.object = null;
            signatures.push( signature );

            // Call the method to call the performActionWithSignature SOA with signature info
            _performActionWithSignatureInternal( data, signatures );
        } else {
            _showErrorMessage( data, _taskCompletionFailure );
            return;
        }
    } else {
        //  No PKI-based handler.
        // Call the method to call the performActionWithSignature SOA with empty signature info
        return _performActionWithSignatureInternal( data, [] );
    }
};

/**
 * Initialization
 */
const loadConfiguration = () => {
    localeSvc.getTextPromise( 'DigitalSignatureMessages', true ).then(
        function( localTextBundle ) {
            _taskCompletionFailure = localTextBundle.taskCompletionFailure;
        } );
};

loadConfiguration();

export default exports = {
    isValidBrowser,
    isApplyDS,
    isAuthenticationRequired,
    addActiveXObjectElement,
    getSignature,
    getLoggedInUserSignature,
    performActionWithSignature
};
app.factory( 'awDigitalSignatureService', () => exports );
