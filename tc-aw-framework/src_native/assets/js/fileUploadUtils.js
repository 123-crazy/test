/* eslint-disable require-atomic-updates */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/fileUploadUtils
 */
import * as app from 'app';
import addObjectUtils from 'js/addObjectUtils';
import appCtxSvc from 'js/appCtxService';
import autoAssignSvc from 'js/autoAssignService';
import awConfiguredRevSvc from 'js/awConfiguredRevService';
import AwHttpService from 'js/awHttpService';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import imageOrientationUtils from 'js/imageOrientationUtils';
import messagingSvc from 'js/messagingService';
import pasteSvc from 'js/pasteService';
import soaSvc from 'soa/kernel/soaService';
import logger from 'js/logger';
import localeService from 'js/localeService';
import cdm from 'soa/kernel/clientDataModel';

let exports = {};
let _addPanelCloseEventLsnr;
let _fileUploadCompleted = false;
let _isPanelOpen = true;
const addOprFailedEvent = 'addObject.addOprfailed';
const commitFailedEvent = 'dataset.commitFailed';

/**
 * getCreateDatasetsBody - returns the body for createDatasets given the viewModel data obj
 * @param {Object} data the viewModel data object
 * @return {Object} the body contents
 */
const getCreateDatasetsBody = function( data ) {
    return {
        input: [ {
            clientId: data.datasetName.dbValue,
            container: {
                uid: cdm.NULL_UID,
                type: 'unknownType'
            },
            datasetFileInfos: [ {
                fileName: data.fileName,
                namedReferenceName: data.reference.dbValue.referenceName,
                isText: addObjectUtils.getFileFormat( data )
            } ],
            relationType: '',
            description: data.datasetDesc.dbValue,
            name: data.datasetName.dbValue,
            type: data.datasetType.dbValue.props.object_string.dbValues[ 0 ]
        } ]
    };
};

/**
 * getCommitDatasetFilesBody - returns the body for commitDatasetFiles given the viewModel data obj
 * @param {Object} data the viewModel data object
 * @return {Object} the body contents
 */
const getCommitDatasetFilesBody = function( data ) {
    return {
        commitInput: [ {
            dataset: data.commitInfos.dataset,
            createNewVersion: false,
            datasetFileTicketInfos: [ {
                datasetFileInfo: {
                    clientId: data.commitInfos.datasetFileTicketInfos[ 0 ].datasetFileInfo.clientId,
                    fileName: data.commitInfos.datasetFileTicketInfos[ 0 ].datasetFileInfo.fileName,
                    namedReferencedName: data.commitInfos.datasetFileTicketInfos[ 0 ].datasetFileInfo.namedReferenceName,
                    isText: data.commitInfos.datasetFileTicketInfos[ 0 ].datasetFileInfo.isText,
                    allowReplace: data.commitInfos.datasetFileTicketInfos[ 0 ].datasetFileInfo.allowReplace
                },
                ticket: data.fmsTicket
            } ]
        } ]
    };
};

/**
 * isRefreshRequired - returns if the added object should be refreshed
 * @param {Object} data the viewModel data object
 * @return {Bool} true/false if refresh required
 */
const isRefreshRequired = data => Boolean( appCtxSvc.getCtx( 'addObject.refreshFlag' ) && !data.unpinnedToForm.dbValue );

/**
 * getRelatedModifiedObj - returns the related modified event data as an obj
 * @param {Object} data the viewModel data object
 * @return {Object} related modified event data
 */
const getRelatedModifiedObj = function( data ) {
    return {
        refreshLocationFlag: isRefreshRequired( data ),
        isPinnedFlag: data.unpinnedToForm.dbValue,
        relations: '',
        relatedModified: [ data.targetObject ],
        createdObjects: [ data.createdObject ]
    };
};

/**
 * deleteDataset - call the deleteObjects soa given the viewModel
 * @param {Object} data the viewModel data object
 */
const deleteDataset = async data => await soaSvc.post( 'Core-2006-03-DataManagement', 'deleteObjects', { objects: [ data.createdObject ] } );

/**
 * onBeforeUnload
 * @param {Object} event window event data
 * @return {String} message
 */
const onBeforeUnload = function( event ) {
    let message = 'Uploads will be terminated if you leave this page';
    if( typeof event === 'undefined' ) {
        event = window.event;
    }
    if( event ) {
        event.returnValue = message;
    }
    return message;
};

/**
 * cancelAddProgress - tell the ctx we are no longer doing an add & unsubscribe event listeners
 */
const cancelAddProgress = function() {
    appCtxSvc.unRegisterCtx( 'addItemEventProgressing' );
    window.removeEventListener( 'beforeunload', onBeforeUnload );
    if( _addPanelCloseEventLsnr ) {
        eventBus.unsubscribe( _addPanelCloseEventLsnr );
    }
    _fileUploadCompleted = true;
    _addPanelCloseEventLsnr = null;
};

/**
 * createDatasets - calls the create createDatasets soa and assigns the res values to data
 * @param {Object} data the viewModel data object
 */
const createDatasets = async function( data ) {
    try {
        const { datasetOutput, ServiceData } = await soaSvc.postUnchecked( 'Core-2010-04-DataManagement', 'createDatasets', getCreateDatasetsBody( data ) );
        if( datasetOutput.length > 0 ) {
            data.fmsTicket = datasetOutput[ 0 ].commitInfo[ 0 ].datasetFileTicketInfos[ 0 ].ticket;
            data.commitInfos = datasetOutput[ 0 ].commitInfo[ 0 ];
            data.relatedModified = datasetOutput[ 0 ].dataset;
            data.createdObject = datasetOutput[ 0 ].dataset;
        } else {
            eventBus.publish( addOprFailedEvent );
            const errMessage = messagingSvc.getSOAErrorMessage( ServiceData );
            messagingSvc.showError( errMessage );
            throw new Error( 'fileUploadUtils - createDatasets' );
        }
    } catch ( error ) {
        eventBus.publish( addOprFailedEvent );
        cancelAddProgress();
        throw error;
    }
};

const errorCodesToDisplayToUser = [ -1, 400, 500 ];
const errorCodesWithCustomMessages = {
    416: 'fileSizeException',
    401: 'userNotAuthorized'
};

/**
 * Show the upload error to user
 *
 * @param {Object} error error
 * @param {String} uploadErrorI18n Error message i18n
 * @param {String} fileName File name
 */
 export const displayError = async( error, uploadErrorI18n, fileName ) => {
    const { data: errorData, status } = error;
    if( errorCodesToDisplayToUser.includes( status ) && errorData ) {
        const msg = uploadErrorI18n.replace( '{0}', errorData );
        messagingSvc.showError( msg );
    } else if( errorCodesWithCustomMessages[status] ) {
        const msg = await localeService.getLocalizedText( 'addObjectMessages', errorCodesWithCustomMessages[status] );
        messagingSvc.showError( msg.format( fileName ) );
    } else {
        const msg = await localeService.getLocalizedText( 'BaseMessages', 'SERVER_ERROR' );
        messagingSvc.showError( msg );
    }
};

/**
 * upload - uploads a file to fms with data.formData
 * @param {Object} data the viewModel data object
 */
const upload = async function( data ) {
    try {
        const $http = AwHttpService.instance;
        await $http.post( fmsUtils.getFMSFullUploadUrl(), data.formData, { headers: { 'Content-type': undefined } } );
    } catch ( error ) {
        logger.error( error );
        eventBus.publish( commitFailedEvent );
        eventBus.publish( addOprFailedEvent );
        await displayError( error, data.i18n.fileUploadError, data.fileName );
        cancelAddProgress();
        await deleteDataset( data );
        throw new Error( 'fileUploadUtils - upload' );
    }
};

/**
 * commitDatasetFiles - calls the commitDatasetFiles soa
 * @param {Object} data the viewModel data object
 */
const commitDatasetFiles = async function( data ) {
    try {
        await soaSvc.post( 'Core-2006-03-FileManagement', 'commitDatasetFiles', getCommitDatasetFilesBody( data ) );
    } catch ( error ) {
        eventBus.publish( commitFailedEvent );
        eventBus.publish( addOprFailedEvent );
        cancelAddProgress();
        await deleteDataset( data );
        throw error;
    }
};

/**
 * addObjectToTarget - pastes the obj to the correct target
 * @param {Object} data the viewModel data object
 */
const addObjectToTarget = async function( data ) {
    try {
        const { targetObject, objToRelateBasedOnConfiguredRevRule: sourceObjects } = data;
        const relationType = data.creationRelation.dbValue;
        await pasteSvc.execute( targetObject, sourceObjects, relationType );
    } catch ( error ) {
        eventBus.publish( 'pasteItem.commitFailed' );
        cancelAddProgress();
        throw new Error( 'fileUploadUtils - addObjectToTarget' );
    }
};

/**
 * uploadFilePreinitialized - tell hosting to upload a file
 * @param {Object} data the viewModel data object
 */
const uploadFilePreinitialized = async function( data ) {
    try {
        const { targetObject: { uid }, fmsTicket, fileName } = data;
        await addObjectUtils.uploadFilePreinit( uid, fmsTicket, fileName );
    } catch ( error ) {
        eventBus.publish( commitFailedEvent );
        await deleteDataset( data );
        throw new Error( 'fileUploadUtils - uploadFilePreinitialized' );
    }
};

/**
 * showAddedMessage - show the created/submitted message
 * @param {Object} data the viewModel data object
 */
const showAddedMessage = async function( data ) {
    let msg = '';
    let createdObjTitle = data.createdObject.props.object_string.dbValues[ 0 ];

    if( data.createdObject && data.revision__awp0ProcessTemplates && data.revision__awp0ProcessTemplates.dbValue ) {
        if( _isPanelOpen ) {
            msg = msg.concat( data.i18n.submitSuccessful.replace( '{0}', createdObjTitle ) );
            messagingSvc.showInfo( msg );
        } else {
            msg = msg.concat( data.i18n.submitSuccessfulWithTargetLocation.replace( '{0}', createdObjTitle ) );
            msg = msg.replace( '{1}', data.targetObject.props.object_name.dbValues[ 0 ] );
            messagingSvc.showInfo( msg );
        }
    } else if( data.createdObject ) {
        if( _isPanelOpen ) {
            msg = msg.concat( data.i18n.pasteSuccessful.replace( '{0}', createdObjTitle ) );
            messagingSvc.showInfo( msg );
        } else {
            msg = msg.concat( data.i18n.pasteSuccessfulWithTargetLocation.replace( '{0}', createdObjTitle ) );
            msg = msg.replace( '{1}', data.targetObject.props.object_name.dbValues[ 0 ] );
            messagingSvc.showInfo( msg );
        }
    }
};

/**
 * wrapUpFileUpload - Runs the logic for everything after commitDatasetFiles soa
 * @param {Object} data the viewModel data object
 */
const wrapUpFileUpload = async function( data ) {
    if( data.isDestroyed() ) {
        eventBus.publish( 'gwt.CreateOrAddObjectCompleteEvent', { createdObjs: [ data.createdObject ] } );

        if( data.objCreateInfo && data.objCreateInfo.createType ) {
            addObjectUtils.updateRecentUsedTypes( data.objCreateInfo.createType );
        }

        if( data.targetObject !== undefined ) {
            data.objToRelateBasedOnConfiguredRevRule = awConfiguredRevSvc.evaluateObjsBasedOnConfiguredRevRule( [ data.createdObject ] );

            await addObjectToTarget( data );

            eventBus.publish( 'cdm.relatedModified', getRelatedModifiedObj( data ) );

            if( data.unpinnedToForm.dbValue ) {
                await autoAssignSvc.autoAssignAllProperties( data, 'CREATE' );
            }

            showAddedMessage( data );
        }
    }

    cancelAddProgress();
};

/**
 * uploadFile - Do the upload file routine. This is originally an action flow in newTabPageSubViewModel, but
 * has now been ported to JS because js is async and action flow isn't. Each line of code in this function
 * relates to an action from the original viewModel. This is NOT a best practice. You should use the viewModel
 * design this originally was implemented with. This was a customer escalation.
 * @param {Object} data the viewModel data object
 */
export let uploadFile = async function( data ) {
    _addPanelCloseEventLsnr = eventBus.subscribe( 'appCtx.register', eventData => {
        if( eventData.name === 'activeToolsAndInfoCommand' ) {
            _isPanelOpen = false;

            if( !_fileUploadCompleted ) {
                messagingSvc.showInfo( data.i18n.fileUploadInProgress );
            }

            eventBus.unsubscribe( _addPanelCloseEventLsnr );
            _addPanelCloseEventLsnr = null;
        }
    } );

    window.addEventListener( 'beforeunload', onBeforeUnload );

    _isPanelOpen = true;
    _fileUploadCompleted = false;

    await createDatasets( data );

    if( !appCtxSvc.getCtx( 'HostedFileNameContext.filename' ) ) {
        eventBus.publish( 'fmsTicket.update' );

        declUtils.updateFormData( { key: 'fmsTicket', value: data.fmsTicket }, data );
        eventBus.publish( 'fmsFile.correctFormFileOrientation' );

        await imageOrientationUtils.correctFormFileOrientation( data.formData, 'fmsFile' );
        eventBus.publish( 'dataset.datasetCreated' );

        await upload( data );
        eventBus.publish( 'dataset.fileUploaded' );

        await commitDatasetFiles( data );
        eventBus.publish( 'addObject.objectcreated' );

        if( data.targetObject !== undefined ) {
            eventBus.publish( 'addObject.setTarget' );
        }

        await wrapUpFileUpload( data );
    } else if( appCtxSvc.getCtx( 'HostedFileNameContext.filename' ) ) {
        eventBus.publish( 'dataset.datasetCreatedPreinitialized' );

        await uploadFilePreinitialized( data );
        eventBus.publish( 'dataset.fileUploaded' );

        await commitDatasetFiles( data );
        eventBus.publish( 'addObject.objectcreated' );

        if( data.fmsTicket ) {
            eventBus.publish( 'addObject.datasetCommitted.hosting', {
                createdObject: data.createdObject,
                filename: data.fileName,
                ticket: data.fmsTicket
            } );
        }

        if( data.targetObject !== undefined ) {
            eventBus.publish( 'addObject.setTarget' );
        }

        await wrapUpFileUpload( data );
    }
};

export default exports = {
    uploadFile,
    displayError
};

app.factory( 'fileUploadUtils', () => exports );
