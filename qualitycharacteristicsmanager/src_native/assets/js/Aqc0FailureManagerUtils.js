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
 * This file is used as utility file for characteristics manager from quality center foundation module
 *
 * @module js/Aqc0FailureManagerUtils
 */
import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import Aqc0CharManagerUtils from 'js/Aqc0CharManagerUtils';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import editHandlerSvc from 'js/editHandlerService';
import _localeSvc from 'js/localeService';
import _ from 'lodash';
import aqc0CharMangrUtils from 'js/Aqc0CharManagerUtils';
import aqc0CharSpecOPSvc from 'js/Aqc0CharSpecOperationsService';

var exports = {};

var saveHandler = {};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * set the variablity for Add child Panel
 */
export let setCtxAddElementInputParentElementToSelectedElement = function() {
    var addElementInput = {};

    addElementInput = viewModelObjectService
        .createViewModelObject( appCtxService.ctx.selected.uid );
    appCtxService.ctx.failureManagerContext.parentElement = addElementInput;
};

/**
 * set the variablity for Add sibling Panel
 */
export let updateCtxForFailureAddSiblingPanel = function() {
    var addElementInput = {};
    addElementInput = viewModelObjectService
        .createViewModelObject( cdm.getObject( appCtxService.ctx.selected.uid ).props.qc0ParentFailure.dbValues[ 0 ] );
    appCtxService.ctx.failureManagerContext.parentElement = addElementInput;
};

export let setCtxAddElementInputParentElementNull = function() {
    appCtxService.ctx.failureManagerContext.parentElement = null;
};

export let removeSelectedNodeContext = function() {
    if( appCtxService.ctx.failureManagerContext !== undefined ) {
        appCtxService.ctx.failureManagerContext.selectedNodes = [];
    }
};

/**
 * This function carry forwards the tagArrayProps (Quality Action / References / Attachments )
 * @param {Object} versionInput - Existing versionInput from getversionInput function
 * @param {Object} ctxObj - Context object
 * @returns {Object} tagArrayProps - properties to carry fwd
 */
export let carryForwardUnTypedReferences = function( versionInput, ctxObj ) {
    versionInput.data.tagArrayProps = {};
    var propsToCarryFwd = [ 'Qc0HasActions', 'Qc0FailureReferences', 'Qc0FailureAttachments' ];
    var actionsArr = [];
    var refsArr = [];
    var attachmentsArr = [];
    for( var prop = 0; prop < propsToCarryFwd.length; prop++ ) {
        _.forEach( ctxObj.props[ propsToCarryFwd[ prop ] ].dbValues, function( dbValue ) {
            var iModelObject = {};
            iModelObject.uid = dbValue;
            if( propsToCarryFwd[ prop ] === 'Qc0HasActions' ) {
                iModelObject.type = 'Qam0QualityAction';
                actionsArr.push( iModelObject );
            } else {
                iModelObject.type = 'AAAAAAAAA';
                if( propsToCarryFwd[ prop ] === 'Qc0FailureReferences' ) {
                    refsArr.push( iModelObject );
                }
                if( propsToCarryFwd[ prop ] === 'Qc0FailureAttachments' ) {
                    attachmentsArr.push( iModelObject );
                }
            }
        } );
    }
    if( actionsArr.length > 0 ) {
        versionInput.data.tagArrayProps.qc0Qc0HasActions = actionsArr;
    }
    if( refsArr.length > 0 ) {
        versionInput.data.tagArrayProps.qc0Qc0FailureReferences = refsArr;
    }
    if( attachmentsArr.length > 0 ) {
        versionInput.data.tagArrayProps.qc0Qc0FailureAttachments = attachmentsArr;
    }
    return versionInput.data.tagArrayProps;
};

/**
 * This method is used to get the input for the versioning soa
 *
 * @param {Object} ctxObj for the current selected object
 *  @param {Object} activeEditHandler the active edit handler
 */
var getVersionInput = function( ctxObj, dataSource ) {
    // Prepare versionInput
    var versionInput = {
        clientId: 'AWClient',
        sourceSpecification: {
            type: ctxObj.type,
            uid: ctxObj.uid
        },
        data: {

        }
    };
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

    versionInput.data.stringProps = {};
    versionInput.data.boolProps = {};
    var modifiedProperties = [];
    for( var i in modifiedPropsWithoutSubProp ) {
        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            modifiedProperties.push( modifiedVMProperty.propertyName );
            if( modifiedVMProperty.propertyName === 'object_name' ) {
                versionInput.data.stringProps.object_name = modifiedVMProperty.dbValue;
            }
            if( modifiedVMProperty.propertyName === 'object_desc' ) {
                versionInput.data.stringProps.object_desc = modifiedVMProperty.dbValue;
            }
            if( modifiedVMProperty.propertyName === 'qc0Status' ) {
                versionInput.data.boolProps.qc0Status = modifiedVMProperty.dbValue;
            }
        } );
    }

    if( modifiedProperties.indexOf( 'object_name' ) === -1 ) {
        versionInput.data.stringProps.object_name = ctxObj.props.object_name.dbValues[ 0 ];
    }
    if( modifiedProperties.indexOf( 'object_desc' ) === -1 ) {
        versionInput.data.stringProps.object_desc = ctxObj.props.object_desc.dbValues[ 0 ];
    }
    if( modifiedProperties.indexOf( 'qc0Status' ) === -1 ) {
        if( ctxObj.props.qc0Status.dbValues[ 0 ] === '1' ) {
            versionInput.data.boolProps.qc0Status = true;
        } else {
            versionInput.data.boolProps.qc0Status = false;
        }
    }
    versionInput.data.stringProps.qc0FailureCode = ctxObj.props.qc0FailureCode.dbValues[ 0 ];

    versionInput.data.intProps = {};
    versionInput.data.intProps.qc0BasedOnId = Number( ctxObj.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;

    versionInput.data.tagProps = {};
    versionInput.data.tagProps.qc0ParentFailure = cdm.getObject( ctxObj.props.qc0ParentFailure.dbValues[ 0 ] );

    //call for carry forward logic
    if( appCtxService.ctx.tcSessionData.tcMajorVersion >= 12 && appCtxService.ctx.tcSessionData.tcMinorVersion >= 3 ) {
        versionInput.data.tagArrayProps = exports.carryForwardUnTypedReferences( versionInput, ctxObj );
    }
    return versionInput;
};

/**
 * custom save handler save edits called by framework
 *
 * @return promise
 */
saveHandler.saveEdits = function( dataSource ) {
    var deferred = AwPromiseService.instance.defer();
    var vmo = dataSource.getDeclViewModel().vmo;
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataFromEditHandler = activeEditHandler.getDataSource();
    var input = {};
    aqc0CharMangrUtils.getSupportedTCVersion();
   if( appCtxService.ctx.isTC13_2OnwardsSupported ) {
        input.inputs = aqc0CharSpecOPSvc.createSaveEditSoaInput( dataFromEditHandler );
        aqc0CharSpecOPSvc.callSaveEditSoa( input ).then( function() {
            deferred.resolve();
            setEditedObjectInContextAndReset( appCtxService.ctx.selected, activeEditHandler );
        }, function( error ) {
            deferred.reject();
            throw error;
        } );
    }
    if( appCtxService.ctx.isTC13_2OnwardsSupported === false ) {
        input.specificationInputs = [ getVersionInput( vmo, dataSource ) ];
        exports.callVersioningSoa( input ).then( function( newSpecification ) {
            deferred.resolve( newSpecification );
            if( vmo.uid === appCtxService.ctx.selected.uid ) {
                setEditedObjectInContextAndReset( newSpecification, activeEditHandler );
            } else {
                setEditedObjectInContextAndReset( appCtxService.ctx.selected, activeEditHandler );
            }
        }, function( err ) {
            deferred.reject();
            throw err;
        } );
    }
    return deferred.promise;
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
saveHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if( modifiedPropCount === 0 ) {
        return false;
    }
    return true;
};

/**
 * Save edits for versioning
 *
 * @return promise
 */
export let saveEditsInFailure = function() {
    var deferred = AwPromiseService.instance.defer();
    var editedVmo = appCtxService.ctx.selected;
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var input = {};
    input.specificationInputs = [ getVersionInput( editedVmo, dataSource ) ];
    exports.callVersioningSoa( input ).then( function( newSpecification ) {
        deferred.resolve( newSpecification );
        setEditedObjectInContextAndReset( newSpecification, activeEditHandler );
    }, function( err ) {
        activeEditHandler.cancelEdits();
        deferred.resolve();
    } );
    return deferred.promise;
};

/**
 * Save edits for versioning from info panel save button
 *@param {data} data
 * @return  {promise} promise when all modified Function Specification properties get saved
 */
export let infoPanelSaveEdit = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    editHandlerSvc.setActiveEditHandlerContext( 'INFO_PANEL_CONTEXT' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var input = {};
    aqc0CharMangrUtils.getSupportedTCVersion();
    if( appCtxService.ctx.isTC13_2OnwardsSupported ) {
        input.inputs = aqc0CharSpecOPSvc.createSaveEditSoaInput( dataSource );
        aqc0CharSpecOPSvc.callSaveEditSoa( input ).then( function() {
            deferred.resolve();
            setEditedObjectInContextAndReset( appCtxService.ctx.selected, activeEditHandler );
        }, function( error ) {
            deferred.reject();
            throw error;
        } );
    }
    if( appCtxService.ctx.isTC13_2OnwardsSupported === false ) {
        input.specificationInputs = [ getVersionInput( data.vmo, dataSource ) ];
        exports.callVersioningSoa( input ).then( function( newSpecification ) {
            deferred.resolve( newSpecification );
            setEditedObjectInContextAndReset( newSpecification, activeEditHandler );
        }, function( err ) {
            activeEditHandler.cancelEdits();
            deferred.resolve();
        } );
    }
    return deferred.promise;
};

/**
 * Call Versioning SOA for specifications and handle success and failure cases
 *@param {deferred} deferred
 * @return  {promise} promise when all modified Function Specification properties get saved
 */
export let callVersioningSoa = function( input ) {
    return soaSvc.post( 'Internal-CharManagerAW-2018-12-QualityManagement', 'createSpecificationVersion', input ).then(
        function( response ) {
            return response.specificationsOutput[ 0 ].newSpecification;
        },
        function( error ) {
            var errMessage = messagingSvc.getSOAErrorMessage( error );
            messagingSvc.showError( errMessage );
            throw error;
        }
    );
};

/**
 * Set context to select node after edit complete and reset primary work area
 *@param {ModelObject} selectedModelObject view mdoel that is selected after edit complete
 * @param {ActiveEditHandler} activeEditHandler current active edit handler
 */
var setEditedObjectInContextAndReset = function( selectedModelObject, activeEditHandler ) {
    if( appCtxService.ctx.failureManagerContext === undefined ) {
        appCtxService.ctx.failureManagerContext = {};
    }
    appCtxService.ctx.failureManagerContext.selectedNodes = [];
    appCtxService.ctx.failureManagerContext.selectedNodes.push( selectedModelObject );
    if( activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( true );
    }

    if( appCtxService.ctx.pselected !== undefined ) {
        eventBus.publish( 'cdm.relatedModified', {
            relatedModified: [
                appCtxService.ctx.pselected,
                appCtxService.ctx.selected
            ]
        } );
    } else {
        eventBus.publish( 'primaryWorkarea.reset' );
    }
};

/**
 * toggle show Inactive checkbox value and save in context
 */
export let setToggleInputToFailureCtx = function( data ) {
    var showInactive = {};
    showInactive.showInactive = data.showInactive.dbValue;
    showInactive.startFreshNavigation = true;
    appCtxService.updateCtx( 'failureManagerContext', showInactive );
};

/**
 * Drag and drop functionality for cut and paste the object in the tree view
 * @param{ModelObject} targetObject Parent to which the object is to be pasted
 * @param{ModelObject} sourceObjects object to be pasted
 */
export let setPropertiesForPaste = function( targetObject, sourceObjects ) {
    var deferred = AwPromiseService.instance.defer();
    var inputData = [];

    if( targetObject.type === 'Qc0Failure' && sourceObjects.length > 0 && ( appCtxService.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'FailureSpecificationSubLocation' || appCtxService.ctx
            .locationContext[ 'ActiveWorkspace:SubLocation' ] === 'qualityfailuremanager' ) ) {
        _.forEach( sourceObjects, function( sourceObject ) {
            if( targetObject.type === 'Qc0Failure' && sourceObject.type === 'Qc0Failure' && targetObject.uid !== sourceObject.uid ) {
                var input = {
                    object: sourceObject,
                    timestamp: '',
                    vecNameVal: [ {
                        name: 'qc0ParentFailure',
                        values: [
                            targetObject.uid
                        ]
                    } ]
                };
                inputData.push( input );
            }
        } );
        soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', {
            info: inputData
        } ).then(
            function() {
                deferred.resolve();
                if( appCtxService.ctx.pselected !== undefined ) {
                    eventBus.publish( 'cdm.relatedModified', {
                        relatedModified: [ appCtxService.ctx.pselected, targetObject ]
                    } );
                } else {
                    eventBus.publish( 'primaryWorkarea.reset' );
                }
            },
            function( error ) {
                var errMessage = messagingSvc.getSOAErrorMessage( error );
                messagingSvc.showError( errMessage );
                deferred.reject( error );
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: [ appCtxService.ctx.pselected, targetObject ]
                } );
            }
        );
    } else {
        var resource = app.getBaseUrlPath() + '/i18n/qualityfailuremanagerMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );
        var errorMessage = localTextBundle.Aqc0FailureSpecDragDropFailed;
        messagingSvc.showError( errorMessage );
    }
    return deferred.promise;
};

/** This function checks the TC version and decides whether the dataprovider need to be called with additional params
 * @returns{ boolean } boolean - true/false
 */
export let getIsReleasedFlag = function() {
    Aqc0CharManagerUtils.getSupportedTCVersion();
    if( appCtxService.ctx.isTC13_2OnwardsSupported ) {
        return appCtxService.ctx.isTC13_2OnwardsSupported.toString();
    }

    return appCtxService.ctx.isTC13_2OnwardsSupported.toString();
};

var getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        msgObj.msg += '<BR/>';
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

export let populateErrorString = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if ( response && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

export default exports = {
    getSaveHandler,
    setCtxAddElementInputParentElementToSelectedElement,
    updateCtxForFailureAddSiblingPanel,
    setCtxAddElementInputParentElementNull,
    removeSelectedNodeContext,
    carryForwardUnTypedReferences,
    saveEditsInFailure,
    infoPanelSaveEdit,
    callVersioningSoa,
    setToggleInputToFailureCtx,
    setPropertiesForPaste,
    getIsReleasedFlag,
    populateErrorString
};
app.factory( 'Aqc0FailureManagerUtils', () => exports );
