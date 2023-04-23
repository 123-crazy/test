// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This file is used as utility file for Function manager from quality center foundation module
 *
 * @module js/qfm0FunctionManagerUtils
 */
import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import dataManagementSvc from 'soa/dataManagementService';
import messagingService from 'js/messagingService';
import commandPanelService from 'js/commandPanel.service';
import AwStateService from 'js/awStateService';
import viewModelObjectService from 'js/viewModelObjectService';
import editHandlerSvc from 'js/editHandlerService';
import qfm0SpecificationUtils from 'js/qfm0SpecificationUtils';
import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
import _localeSvc from 'js/localeService';
import _ from 'lodash';

var exports = {};

var saveHandler = {};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function () {
    return saveHandler;
};

/**
 * set the variablity for Add child Panel
 */
export let setCtxAddElementInputParentElementToSelectedElement = function () {
    var addElementInput = {};

    addElementInput = viewModelObjectService
        .createViewModelObject(appCtxService.ctx.selected.uid);
    appCtxService.ctx.functionSpecManagerContext.parentElement = addElementInput;
};

/**
 * set the variablity for Add sibling Panel
 */
export let updateCtxForFunctionAddSiblingPanel = function () {
    var addElementInput = {};
    addElementInput = viewModelObjectService
        .createViewModelObject(cdm.getObject(appCtxService.ctx.selected.uid).props.qfm0ParentTag.dbValues[0]);
    appCtxService.ctx.functionSpecManagerContext.parentElement = addElementInput;
};

export let setCtxAddElementInputParentElementNull = function () {
    appCtxService.ctx.functionSpecManagerContext.parentElement = null;
};

/**
 * Call the SOA createSpecificationVersion for modified Object in data Source
 *
 * @param {datasource} datasource viewModel of view
 * @returns {promise} promise when all modified Function Specification properties get saved
 */
saveHandler.saveEdits = function (dataSource) {
    var deferred = AwPromiseService.instance.defer();
    var vmo = dataSource.getDeclViewModel().vmo;
    editHandlerSvc.setActiveEditHandlerContext('NONE');
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var input = {};
    input.specificationInputs = qfm0SpecificationUtils.getVersionInput(dataSource, vmo);
    qfm0SpecificationUtils.callVersioningSoa(input).then(function (newSpecification) {
        deferred.resolve(newSpecification);
        if (vmo.uid === appCtxService.ctx.selected.uid) {
            qfm0SpecificationUtils.setEditedObjectInContextAndReset(newSpecification, activeEditHandler);
        } else {
            qfm0SpecificationUtils.setEditedObjectInContextAndReset(appCtxService.ctx.selected, activeEditHandler);
        }
    }, function (err) {
        deferred.resolve();
    });
    return deferred.promise;
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
saveHandler.isDirty = function (dataSource) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if (modifiedPropCount === 0) {
        return false;
    }
    return true;
};

/**
 * Call the SOA createSpecificationVersion for modified Object in data Source
 *
 * @returns {promise} promise when all modified Function Specification properties get saved
 */
export let saveEditsInFunction = function () {
    var deferred = AwPromiseService.instance.defer();
    var editedVmo = appCtxService.ctx.selected;
    editHandlerSvc.setActiveEditHandlerContext('NONE');
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var input = {};
    input.specificationInputs = qfm0SpecificationUtils.getVersionInput(dataSource, editedVmo);
    qfm0SpecificationUtils.callVersioningSoa(input).then(function (newSpecification) {
        deferred.resolve(newSpecification);
        qfm0SpecificationUtils.setEditedObjectInContextAndReset(newSpecification, activeEditHandler);
    }, function (err) {
        activeEditHandler.cancelEdits();
        deferred.resolve();
    });
    return deferred.promise;
};

/**
 * Save show inactive/active Function Specifications flag in context to show the objects in the tree based on configuration.
 * @param {data} data  The view model data
 */
export let setToggleInputToFunctionSpecCtx = function (data) {
    var showInactive = {};
    showInactive.showInactive = data.showInactiveFunctionSpec.dbValue;
    appCtxService.updateCtx('functionSpecManagerContext', showInactive);
};

/**
 * Drag and drop functionality for cut and paste the object in the tree view
 * @param {ModelObject} targetObject Parent to which the object is to be pasted
 * @param {ModelObject} sourceObjects object to be pasted
 * @returns {promise} promise when all Function Specifications are moved to new structure
 */
export let setPropertiesForPaste = function (targetObject, sourceObjects) {
    var deferred = AwPromiseService.instance.defer();
    var inputData = [];

    if (targetObject.type === 'Qfm0FunctionEleSpec' && sourceObjects.length > 0 && (appCtxService.ctx.locationContext['ActiveWorkspace:SubLocation'] === 'qualityfunctionspecificationmanager' || appCtxService.ctx.locationContext['ActiveWorkspace:SubLocation'] === 'FunctionSpecificationSubLocation')) {
        _.forEach(sourceObjects, function (sourceObject) {
            if (targetObject.type === 'Qfm0FunctionEleSpec' && sourceObject.type === 'Qfm0FunctionEleSpec' && targetObject.uid !== sourceObject.uid) {
                var input = {
                    object: sourceObject,
                    timestamp: '',
                    vecNameVal: [{
                        name: 'qfm0ParentTag',
                        values: [
                            targetObject.uid
                        ]
                    }]
                };
                inputData.push(input);
            }
        });
        soaSvc.post('Core-2010-09-DataManagement', 'setProperties', {
            info: inputData
        }).then(
            function () {
                deferred.resolve();
                eventBus.publish('primaryWorkarea.reset');
            },
            function (error) {
                var errMessage = messagingSvc.getSOAErrorMessage(error);
                messagingSvc.showError(errMessage);
                deferred.reject(error);

                eventBus.publish('primaryWorkarea.reset');
            }
        );
    } else {
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText(resource);
        var errorMessage = localTextBundle.qfm0DragAndDrop;
        messagingSvc.showError(errorMessage);
    }
    return deferred.promise;
};


/**
 * This method is used for calling Drag and drop functionality for Function Representation object
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 */
export let setPropertiesForDragDropFunctionElementAsHigherLower = function (targetObject, sourceObjects, relationType) {
    var deferred = AwPromiseService.instance.defer();
    var propertiesToBeLoaded = ['qfm0FmeaRoot'];
    if (sourceObjects && sourceObjects[0] && sourceObjects[0].props && !sourceObjects[0].props.object_string) {
        propertiesToBeLoaded.push('object_string');
    }
    dataManagementSvc.getProperties([sourceObjects[0].uid], propertiesToBeLoaded).then(function () {
        setPropertiesForDragDropFunctionAsHigherLower(targetObject, sourceObjects, relationType);
    });

    return deferred.promise;
};

/**
 * This method gives Confirmation and error messages for Drag and drop functionality for Function Representation/Specification object
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 */
export let setPropertiesForDragDropFunctionAsHigherLower = function (targetObject, sourceObjects, relationType) {
    var finalMessage;
    var sourceObjectString = '';
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText(resource);
    var errorMessage = localTextBundle.qfm0DragDropError;
    var targetObjectString = targetObject.props.object_string.uiValues[0];
    if (sourceObjects && sourceObjects.length > 0 && sourceObjects.length === 1) {
        if (sourceObjects[0].modelType.typeHierarchyArray.indexOf('Qfm0FunctionEleSpec') > -1 || (sourceObjects[0].modelType.typeHierarchyArray.indexOf('Qfm0FunctionElement') > -1 && sourceObjects[0].props.qfm0FmeaRoot !== undefined && targetObject.props.qfm0FmeaRoot !== undefined && sourceObjects[0].props.qfm0FmeaRoot.dbValues[0] === targetObject.props.qfm0FmeaRoot.dbValues[0])) {
            if (relationType === 'Qfm0Calling' || relationType === 'Qfm0CalledBy') {
                if (sourceObjects[0].props.object_string !== undefined) {
                    sourceObjectString = sourceObjects[0].props.object_string.uiValues[0];
                }
                if (relationType === 'Qfm0Calling') {
                    finalMessage = localTextBundle.qfm0LowerLevelFunctionDragDropConfirmation;
                    finalMessage = finalMessage.replace('{0}', sourceObjectString);
                    finalMessage = finalMessage.replace('{1}', targetObjectString);
                } else if (relationType === 'Qfm0CalledBy') {
                    finalMessage = localTextBundle.qfm0HigherLevelFunctionDragDropConfirmation;
                    finalMessage = finalMessage.replace('{0}', sourceObjectString);
                    finalMessage = finalMessage.replace('{1}', targetObjectString);
                }
                showConfirmationMessageForDragDrop(targetObject, sourceObjects, relationType, finalMessage, localTextBundle);
            }
            else {
                handleDragDropForNoRelation(relationType);
            }
        }
        else if ((relationType === 'Qfm0Calling' || relationType === 'Qfm0CalledBy') && sourceObjects[0].modelType.typeHierarchyArray.indexOf('Qfm0FunctionElement') > -1 && sourceObjects[0].props.qfm0FmeaRoot && targetObject.props.qfm0FmeaRoot && sourceObjects[0].props.qfm0FmeaRoot.dbValues[0] !== targetObject.props.qfm0FmeaRoot.dbValues[0]) {
            // if relation type is higher/lower level function and source object is function element but source and target function elements don't exist in same FMEA
            var droppedInAnotherFMEAErrorMsg = localTextBundle.qfm0FunctionDroppedInAnotherFMEA;
            messagingService.showError(droppedInAnotherFMEAErrorMsg);
        }
        else {
            handleDragDropForNoRelation(relationType);
        }
    }
    else if (sourceObjects && sourceObjects.length > 1) {
        if (relationType === 'Qfm0Calling' || relationType === 'Qfm0CalledBy') {
            if (relationType === 'Qfm0Calling') {
                finalMessage = localTextBundle.qfm0MultipleLowerLevelFunctionDragDropConfirmation;
                finalMessage = finalMessage.replace('{0}', sourceObjects.length);
                finalMessage = finalMessage.replace('{1}', targetObjectString);
            } else if (relationType === 'Qfm0CalledBy') {
                finalMessage = localTextBundle.qfm0MultipleHigherLevelFunctionDragDropConfirmation;
                finalMessage = finalMessage.replace('{0}', sourceObjects.length);
                finalMessage = finalMessage.replace('{1}', targetObjectString);
            }
            showConfirmationMessageForDragDrop(targetObject, sourceObjects, relationType, finalMessage, localTextBundle);
        }
        else {
            handleDragDropForNoRelation(relationType);
        }
    }
    else {
        messagingService.showError(errorMessage);
    }
};

/**
 * Refresh target object related view
 * @param {ModelObject} targetObject Parent to which the object was dropped
 */
var refreshTargetObject = function (targetObject, relationType) {
    if ( targetObject !== undefined ) {
        if(appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 && relationType === 'Qfm0CalledBy'){
                eventBus.publish('higherLevelFunctionTable.plTable.reload');
            }
            else if(appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 && relationType === 'Qfm0Calling'){
                eventBus.publish('lowerLevelFunctionTable.plTable.reload');
            }
            else{
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: [ targetObject ],
                    refreshLocationFlag: false
                } );
            }
        }
};

/**
 * Handle error conditions and show appropriate error message
 * @param {String} relationType relationType
 */
export let handleDragDropForNoRelation = function (relationType) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText(resource);
    var errorMessage = localTextBundle.qfm0DragDropError;
    if (!relationType) {
        // If there is no relation type then show error message
        var droppedInFunctionErrorMsg = localTextBundle.qfm0DroppedInFunction;
        messagingService.showError(droppedInFunctionErrorMsg);
    }
    else {
        messagingService.showError(errorMessage);
    }
};

/**
 * Show confirmation message for drag and drop functionality for Function Representation/Specification object to higher/lower level functions table
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 * @param {String} finalMessage message string
 * @param {Service} localTextBundle localization service instance
 */
var showConfirmationMessageForDragDrop = function (targetObject, sourceObjects, relationType, finalMessage, localTextBundle) {
    var cancelString = localTextBundle.qfm0Cancel;
    var proceedString = localTextBundle.qfm0Proceed;
    var buttons = [{
        addClass: 'btn btn-notify',
        text: cancelString,
        onClick: function ($noty) {
            $noty.close();
        }
    },
    {
        addClass: 'btn btn-notify',
        text: proceedString,
        onClick: function ($noty) {
            $noty.close();
            dragAndDropToHigherLowerLevelTable(targetObject, sourceObjects, relationType);
        }

    }
    ];
    messagingService.showWarning(finalMessage, buttons);
};

/**
 * Drag and drop functionality for Function Representation/Specification object to higher/lower level functions table
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 */
export let dragAndDropToHigherLowerLevelTable = function (targetObject, sourceObjects, relationType) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText(resource);
    var deferred = AwPromiseService.instance.defer();
    var relInput = {
        inputs: qfm0FmeaManagerUtils.getSoaInputsForHigherLowerFunction(relationType, sourceObjects, targetObject)
    };
    soaSvc.post('Internal-FmeaManager-2020-05-FMEADataManagement', 'addHigherLowerLevelFunctions', relInput).then(
        function (response) {
            if (response.created !== undefined) {
                var objectString = sourceObjects[0].props && sourceObjects[0].props.object_string && sourceObjects[0].props.object_string.uiValues && sourceObjects[0].props.object_string.uiValues[0] ? sourceObjects[0].props.object_string.uiValues[0] : "";
                var message = '';
                if (relationType === 'Qfm0Calling') {
                    if (sourceObjects && sourceObjects.length === 1) {
                        message = localTextBundle.qfm0LowerFunctionSingleSelectionSuccessMessage;
                        message = message.replace('{0}', objectString);
                    }
                    else if (sourceObjects && sourceObjects.length > 1) {
                        message = localTextBundle.qfm0LowerFunctionMultipleSelectionSuccessMessage;
                        message = message.replace('{0}', sourceObjects.length);
                    }

                } else if (relationType === 'Qfm0CalledBy') {
                    if (sourceObjects && sourceObjects.length === 1) {
                        message = localTextBundle.qfm0HigherFunctionSingleSelectionSuccessMessage;
                        message = message.replace('{0}', objectString);
                    }
                    else if (sourceObjects && sourceObjects.length > 1) {
                        message = localTextBundle.qfm0HigherFunctionMultipleSelectionSuccessMessage;
                        message = message.replace('{0}', sourceObjects.length);
                    }
                }
                messagingService.showInfo(message);
                deferred.resolve();
                refreshTargetObject(targetObject, relationType);
            }
        },
        function (error) {
            var errMessage = messagingService.getSOAErrorMessage(error);
            var partialSuccessMessage = "";
            if (sourceObjects && sourceObjects.length > 1) {
                var successfullyPastedObjectCount = error && error.cause && error.cause.partialErrors ? sourceObjects.length - error.cause.partialErrors.length : "";
                if (relationType === 'Qfm0Calling') {
                    partialSuccessMessage = localTextBundle.qfm0LowerFunctionMultiSelectPartialSuccessMessage;
                    partialSuccessMessage = partialSuccessMessage.replace('{0}', successfullyPastedObjectCount);
                    partialSuccessMessage = partialSuccessMessage.replace('{1}', sourceObjects.length);
                }
                else if (relationType === 'Qfm0CalledBy') {
                    partialSuccessMessage = localTextBundle.qfm0HigherFunctionMultiSelectPartialSuccessMessage;
                    partialSuccessMessage = partialSuccessMessage.replace('{0}', successfullyPastedObjectCount);
                    partialSuccessMessage = partialSuccessMessage.replace('{1}', sourceObjects.length);
                }
                messagingService.showInfo(partialSuccessMessage);
            }
            messagingService.showError(localTextBundle.qfm0DragDropError + ':</br>' + errMessage);
            refreshTargetObject(targetObject, relationType);
            throw error;
        });
    return deferred.promise;
};

export let createPasteInputForFunctionSpec = function (ctx, dataValues) {
    var input = [];
    var object ={};
    object = {
        clientId: '',
        data: {
            boName: 'Qfm0FunctionEleSpec',
            stringProps: {
                qfm0Id: dataValues.nextId,
                object_name: ctx.awClipBoardProvider[0].props.object_name.dbValues[0],
                object_desc: ctx.awClipBoardProvider[0].props.object_desc.dbValues[0]
            },
            tagProps: {
                qfm0ParentTag: ctx.selected
            }
        }
    };

    if (ctx.tcSessionData.tcMajorVersion < 13) {
        object.data.boolProps = {
            qfm0Status: true
        };
    } else {
        object.data.boolProps = {
            qc0Status: true
        };
    }
    input.push(object);
    return input;
};

/**
 * Paste copied objects on inspection definition table
 * @param {Object} primaryObject
 * @param {Array[Object]} copiedObjects
 */
export let pasteInspectionDefinition = function ( primaryObject, copiedObjects ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var secondaryObjects = [];
    var nonInspectionDefinitionObjects = [];
    copiedObjects.forEach( function( selectedObj ) {
        if( selectedObj && selectedObj.modelType.typeHierarchyArray.indexOf( 'Aqc0QcElement' ) > -1 )
        {
            // If selected object is of type Aqc0QcElement i.e. run time object for inspection definition then
            // find it's persistent underlying object before pasting
            var underlyingObj = null;
            var underlyingObjProp = selectedObj.props.awb0UnderlyingObject;
            if( !_.isUndefined( underlyingObjProp ) ) {
                underlyingObj = cdm.getObject( underlyingObjProp.dbValues[ 0 ] );
            } else {
                underlyingObj = selectedObj;
            }
            selectedObj = underlyingObj;
        }

        if( selectedObj.modelType.typeHierarchyArray.indexOf( 'Aqc0CharElementRevision' ) > -1 ) {
            secondaryObjects.push( selectedObj );
        }
        else {
            nonInspectionDefinitionObjects.push( selectedObj );
        }
    } );

    if( secondaryObjects.length > 0 ) {
        createRelationInspectionDefinition( primaryObject, secondaryObjects, nonInspectionDefinitionObjects, localTextBundle );
    }
    else {
        showErrorMessageForInspDefPasteFailure( nonInspectionDefinitionObjects, localTextBundle, '' );
    }

};

/**
 * Call create relations SOA for creating relation as inspection definition
 * @param {Object} primaryObject
 * @param {Array[Object]} secondaryObjects
 * @param {Array[Object]} nonInspectionDefinitionObjects
 * @param {Object} localTextBundle
 */
export let createRelationInspectionDefinition = function ( primaryObject, secondaryObjects, nonInspectionDefinitionObjects, localTextBundle ) {
    var deferred = AwPromiseService.instance.defer();
    var inputArray = [];
    var copiedObjectsTotalCount = secondaryObjects && nonInspectionDefinitionObjects ? secondaryObjects.length + nonInspectionDefinitionObjects.length : 0;
    secondaryObjects.forEach( function( selectedObj ) {
        var input = {
            clientId: 'AWClient',
            relationType: "Qfm0InspectionDefinition",
            primaryObject: {
                uid: primaryObject.uid,
                type: primaryObject.type
            },
            secondaryObject: {
                uid: selectedObj.uid,
                type: selectedObj.type
            }
        };
        inputArray.push( input );
    } );
    soaSvc.post( 'Core-2006-03-DataManagement', 'createRelations', {input: inputArray} ).then(
        function( response ) {
            deferred.resolve();
            if ( nonInspectionDefinitionObjects && nonInspectionDefinitionObjects.length > 0 ) {
                showPartialSuccessMsg( secondaryObjects.length, copiedObjectsTotalCount, localTextBundle );
                showErrorMessageForInspDefPasteFailure( nonInspectionDefinitionObjects, localTextBundle, '' );
            }
            refreshTargetObject(primaryObject);
        },
        function( error ) {
            var partialSuccessMessage = "";
            var successfullyPastedObjectCount = error && error.cause && error.cause.partialErrors ? secondaryObjects.length - error.cause.partialErrors.length : "";

            if( successfullyPastedObjectCount > 0 ) {
                showPartialSuccessMsg( successfullyPastedObjectCount, copiedObjectsTotalCount, localTextBundle );
            }
            var errMessage = processPartialErrorsForInspDefPaste( error, secondaryObjects, localTextBundle );
            showErrorMessageForInspDefPasteFailure( nonInspectionDefinitionObjects, localTextBundle, errMessage );

            refreshTargetObject(primaryObject);
            throw error;
        } );
    return deferred.promise;
};

/**
 * Process the partial errors coming from server
 * @param {Object} error
 * @param {Array[Object]} secondaryObjects
 * @param {Object} localTextBundle
 */
export let processPartialErrorsForInspDefPaste = function( error, secondaryObjects, localTextBundle ) {
    var partialErrors = error && error.cause && error.cause.partialErrors ? error.cause.partialErrors : [];
    var partialErrorMessage = '';
    var errMsgTemplateForAlreadyExisting = localTextBundle.qfm0AddFailAsAlreadyExists;
    partialErrors.forEach(function(err) {
        if( err && err.errorValues && err.errorValues.length > 0 && err.errorValues[0] ) {
            // if error code matches with the required one, then replace that server error message text by custom message text, else show server message text as it is
            if( err.errorValues[0].code === 35010 ) {
                var objectName = '';
                for( let i = 0; i < secondaryObjects.length; i++ ) {
                    var objectString = secondaryObjects[i].props && secondaryObjects[i].props.object_string && secondaryObjects[i].props.object_string.uiValues && secondaryObjects[i].props.object_string.uiValues[0] ? secondaryObjects[i].props.object_string.uiValues[0] : "";
                    if( err.errorValues[0].message.indexOf( objectString ) > -1 ) {
                        objectName = objectString;
                        break;
                    }
                }
                var errMsg = errMsgTemplateForAlreadyExisting;
                errMsg = errMsg.replace( '{0}', objectName );
                partialErrorMessage = partialErrorMessage + errMsg + '</br>';
            }
            else {
                partialErrorMessage = partialErrorMessage + err.errorValues[0].message + '</br>';
            }
        }
    });
    return partialErrorMessage;
};

/**
 * Show partial success message for inspection definition paste
 * @param {Number} successCount
 * @param {Number} totalCount
 * @param {Object} localTextBundle
 */
var showPartialSuccessMsg = function( successCount, totalCount, localTextBundle ) {
    var partialSuccessMsg = localTextBundle.qfm0AddPartialSuccess;
    partialSuccessMsg = partialSuccessMsg.replace( '{0}', successCount );
    partialSuccessMsg = partialSuccessMsg.replace( '{1}', totalCount );
    messagingService.showInfo( partialSuccessMsg );
};

/**
 * Show error message in case of any error or failure in paste of inspection definition
 * @param {Array[Object]} nonInspectionDefinitionObjects
 * @param {Object} localTextBundle
 * @param {String} errorMsgFromServer
 */
var showErrorMessageForInspDefPasteFailure = function ( nonInspectionDefinitionObjects, localTextBundle, errorMsgFromServer ) {
    var fullErrorMsg = '';
    var errorMsgTemplateForSingleObject = localTextBundle.qfm0NotInspectionDefinition;
    var errorMsgForSingleObject = '';
    nonInspectionDefinitionObjects.forEach( function(selectedObj) {
        var objectString = selectedObj.props && selectedObj.props.object_string && selectedObj.props.object_string.uiValues && selectedObj.props.object_string.uiValues[0] ? selectedObj.props.object_string.uiValues[0] : "";
        errorMsgForSingleObject = errorMsgTemplateForSingleObject;
        errorMsgForSingleObject = errorMsgForSingleObject.replace( '{0}', objectString );
        errorMsgForSingleObject = errorMsgForSingleObject + '</br>';
        fullErrorMsg = fullErrorMsg + errorMsgForSingleObject;
    });
    fullErrorMsg = errorMsgFromServer ? fullErrorMsg + errorMsgFromServer : fullErrorMsg;
    messagingService.showError( fullErrorMsg );
};

/**
 * Paste copied objects on Function Requirement table
 * @param {Object} primaryObject
 * @param {Array[Object]} copiedObjects
 */
export let pasteFunctionRequirement = function ( primaryObject, copiedObjects ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );

    if( copiedObjects.length > 0 ) {
        createRelationFunctionRequirement( primaryObject, copiedObjects, localTextBundle );
    }

};

/**
 * Call create relations SOA for creating relation as Function Requirement
 * @param {Object} primaryObject
 * @param {Array[Object]} secondaryObjects
 * @param {Object} localTextBundle
 */
export let createRelationFunctionRequirement = function ( primaryObject, secondaryObjects, localTextBundle ) {
    var deferred = AwPromiseService.instance.defer();
    var inputArray = [];
    var copiedObjectsTotalCount = secondaryObjects ? secondaryObjects.length : 0;
    secondaryObjects.forEach( function( selectedObj ) {
        var input = {
            clientId: 'AWClient',
            relationType: "Qfm0FunctionRequirement",
            primaryObject: {
                uid: primaryObject.uid,
                type: primaryObject.type
            },
            secondaryObject: {
                uid: selectedObj.uid,
                type: selectedObj.type
            }
        };
        inputArray.push( input );
    } );
    soaSvc.post( 'Core-2006-03-DataManagement', 'createRelations', {input: inputArray} ).then(
        function( response ) {
            deferred.resolve();
            refreshTargetObject(primaryObject);
        },
        function( error ) {
            var partialSuccessMessage = "";
            var successfullyPastedObjectCount = error && error.cause && error.cause.partialErrors ? secondaryObjects.length - error.cause.partialErrors.length : "";

            if( successfullyPastedObjectCount > 0 ) {
                showPartialSuccessMsg( successfullyPastedObjectCount, copiedObjectsTotalCount, localTextBundle );
            }
            var errMessage = processPartialErrorsForFunReqPaste( error, secondaryObjects, localTextBundle );
            messagingService.showError( errMessage );

            refreshTargetObject(primaryObject);
            throw error;
        } );
    return deferred.promise;
};

/**
 * Process the partial errors coming from server
 * @param {Object} error
 * @param {Array[Object]} secondaryObjects
 * @param {Object} localTextBundle
 */
export let processPartialErrorsForFunReqPaste = function( error, secondaryObjects, localTextBundle ) {
    var partialErrors = error && error.cause && error.cause.partialErrors ? error.cause.partialErrors : [];
    var partialErrorMessage = '';
    var errMsgTemplateForAlreadyExisting = localTextBundle.qfm0AddFailAsAlreadyExists;
    partialErrors.forEach(function(err) {
        if( err && err.errorValues && err.errorValues.length > 0 && err.errorValues[0] ) {
            // if error code matches with the required one, then replace that server error message text by custom message text, else show server message text as it is
            if( err.errorValues[0].code === 35010 ) {
                var objectName = '';
                for( let i = 0; i < secondaryObjects.length; i++ ) {
                    var objectString = secondaryObjects[i].props && secondaryObjects[i].props.object_string && secondaryObjects[i].props.object_string.uiValues && secondaryObjects[i].props.object_string.uiValues[0] ? secondaryObjects[i].props.object_string.uiValues[0] : "";
                    if( err.errorValues[0].message.indexOf( objectString ) > -1 ) {
                        objectName = objectString;
                        break;
                    }
                }
                var errMsg = errMsgTemplateForAlreadyExisting;
                errMsg = errMsg.replace( '{0}', objectName );
                partialErrorMessage = partialErrorMessage + errMsg + '</br>';
            }
            else {
                partialErrorMessage = partialErrorMessage + err.errorValues[0].message + '</br>';
            }
        }
    });
    return partialErrorMessage;
};

export default exports = {
    getSaveHandler,
    setCtxAddElementInputParentElementToSelectedElement,
    updateCtxForFunctionAddSiblingPanel,
    setCtxAddElementInputParentElementNull,
    saveEditsInFunction,
    setToggleInputToFunctionSpecCtx,
    setPropertiesForPaste,
    setPropertiesForDragDropFunctionElementAsHigherLower,
    setPropertiesForDragDropFunctionAsHigherLower,
    handleDragDropForNoRelation,
    dragAndDropToHigherLowerLevelTable,
    createPasteInputForFunctionSpec,
    pasteInspectionDefinition,
    createRelationInspectionDefinition,
    processPartialErrorsForInspDefPaste,
    processPartialErrorsForFunReqPaste,
    createRelationFunctionRequirement,
    pasteFunctionRequirement
};
app.factory('qfm0FunctionManagerUtils', () => exports);
