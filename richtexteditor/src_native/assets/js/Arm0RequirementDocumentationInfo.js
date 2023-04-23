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
 * Module for the Requirement Documentation Page
 *
 * @module js/Arm0RequirementDocumentationInfo
 */
import app from 'app';
import messagingService from 'js/messagingService';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import ckEditorUtils from 'js/ckEditorUtils';
import rmDocumentation from 'js/Arm0RequirementDocumentation';
import reqUtils from 'js/requirementsUtils';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import $ from 'jquery';

var exports = {};
var _data = null;

var eventInsertImage = null;
var eventInsertOle = null;

var saveHandler = {};

/** Content type Word */
var CONTENT_TYPE_WORD = 'Word';

/**
 * Check CKEditor content changed / Dirty.
 *
 * @param {String} id- CKEditor ID
 * @return {Boolean} isDirty
 *
 */

var _checkCKEditorDirty = function( id ) {

    return ckEditorUtils.checkCKEditorDirty( id );
};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * custom save handler save edits called by framework
 *
 * @return promise
 */
saveHandler.saveEdits = function( dataSource ) {

    var deferred = AwPromiseService.instance.defer();

    if( _checkCKEditorDirty( _data.editorProps.id ) ) {

        var _modelObj = dataSource.getContextVMO();

        var input = {
            "inputs": [ {
                "objectToProcess": rmDocumentation.getRevisionObject( _modelObj ),
                "bodyText": rmDocumentation.getBodyText( _data ),
                "lastSavedDate": rmDocumentation.getRevisionObjectLsd( _modelObj ),
                "contentType": rmDocumentation.getContentType( _data ),
                "isPessimisticLock": true
            } ]
        };

        var promise = soaSvc.post( "Internal-AWS2-2016-12-RequirementsManagement",
            "setRichContent2", input );

        promise.then( function( response ) {
                var relatedObjects = response.updated;
                deferred.resolve( relatedObjects );
            } )
            .catch( function( error ) {

                var errorCode = error.cause.partialErrors[ "0" ].errorValues[ "0" ].code;
                if( errorCode === 141023 ) {
                    var errorMsg = _data.i18n.multiUserEditError.replace( "{0}", _data.selected.cellHeader1 );

                    messagingService.showError( errorMsg );
                    error = null;

                }

                deferred.reject( error );
            } );

    } else {

        deferred.resolve( null );
    }

    return deferred.promise;
};

saveHandler.isDirty = function() {
    return _checkCKEditorDirty( _data.editorProps.id );
};

/**
 * Process EditHandlerStateChanged Event
 *
 * @param {Object} data - The panel's view model object
 */
export let processEditHandlerStateChanged = function( data, source, ctx ) {

    if( data.eventData.dataSource.xrtType === source ) {

        if( data.eventData.state === 'starting' ) {
            _data = data;
            ctx.INFO_PANEL_CONTEXT.INFO_EDIT = true;
            data.editMode = true;

            if( data.editorProps.contentType === CONTENT_TYPE_WORD ) {
                eventBus.publish( "requirementDocumentationInfo.getHTMLTextContent" );

            } else {
                eventBus.publish( "requirementDocumentationInfo.getHTMLTextContent" );

                // Insert OLE Event
                eventInsertOle = eventBus.subscribe( "requirementDocumentation.InsertOLEInCKEditor", function(
                    eventData ) {
                    if( eventData.editor.name === data.editorProps.id ) {
                        data.eventData = eventData;
                        data.form = eventData.form;

                        var fileName = eventData.file.name;
                        data.fileExtensions = fileName.split( '.' ).pop();

                        eventBus.publish( "requirementDocumentationInfo.getDatasetTypesWithDefaultRelation" );
                    }

                }, 'Arm0RequirementDocumentationInfo' );

                // Insert Image Event
                eventInsertImage = eventBus.subscribe( "requirementDocumentation.InsertImageInCKEditor",
                    function( eventData ) {
                        if( eventData.editor.name === data.editorProps.id ) {

                            var fileName = 'fakepath\\' + eventData.file.name;

                            if( reqUtils.stringEndsWith( fileName.toUpperCase(), ".gif".toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), ".png".toUpperCase() ) ||
                                reqUtils.stringEndsWith( fileName.toUpperCase(), ".jpg".toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), ".jpeg".toUpperCase() ) ||
                                reqUtils.stringEndsWith( fileName.toUpperCase(), '.bmp'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.wmf'.toUpperCase() ) ) {
                                data.form = eventData.form;

                                var datasetInfo = {
                                    "clientId": eventData.clientid,
                                    "namedReferenceName": "Image",
                                    "fileName": fileName,
                                    "name": eventData.clientid,
                                    "type": "Image"
                                };

                                data.datasetInfo = datasetInfo;

                                eventBus.publish( "requirementDocumentationInfo.InsertObjInCKEditor" );
                            } else {
                                messagingService.reportNotyMessage( data, data._internal.messages,
                                    'notificationForImageErrorWrongFile' );
                            }
                        }
                    }, 'Arm0RequirementDocumentationInfo' );
            }

        } else if( data.eventData.state === 'canceling' && data.editMode ) {
            data.editMode = false;
            ctx.INFO_PANEL_CONTEXT.INFO_EDIT = false;

            if( eventInsertImage ) {
                eventBus.unsubscribe( eventInsertImage );
                eventInsertImage = null;
            }
            if( eventInsertOle ) {
                eventBus.unsubscribe( eventInsertOle );
                eventInsertOle = null;
            }
            eventBus.publish( "requirementDocumentationInfo.getHTMLTextContent" );
        } else if( data.eventData.state === 'saved' && data.editMode ) {

            data.editMode = false;
            ctx.INFO_PANEL_CONTEXT.INFO_EDIT = false;

            if( eventInsertImage ) {
                eventBus.unsubscribe( eventInsertImage );
                eventInsertImage = null;
            }
            if( eventInsertOle ) {
                eventBus.unsubscribe( eventInsertOle );
                eventInsertOle = null;
            }
            eventBus.publish( "requirementDocumentationInfo.getHTMLTextContent" );
        }
    }

};

export default exports = {
    getSaveHandler,
    processEditHandlerStateChanged
};
/**
 * This is Custom Preview for Requirement revision.
 *
 * @memberof NgServices
 * @member Arm0RequirementDocumentationInfo
 */
app.factory( 'Arm0RequirementDocumentationInfo', () => exports );
