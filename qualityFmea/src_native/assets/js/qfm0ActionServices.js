// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This file is used as utility file for Actions manager for FMEA Module
 *
 * @module js/qfm0ActionServices
 */
import eventBus from 'js/eventBus';
import _ from 'lodash';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import dataManagementSvc from 'soa/dataManagementService';
import messagingService from 'js/messagingService';
import editHandlerSvc from 'js/editHandlerService';
import editHandlerFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import dateTimeSvc from 'js/dateTimeService';
import _localeSvc from 'js/localeService';
import qfm0FmeaManagerUtils2 from 'js/qfm0FmeaManagerUtils2';

var exports = {};

var saveHandler = {};

const _xrtPageContext_secondaryXrtPageID = 'xrtPageContext.secondaryXrtPageID';
const _xrtPageContext_primaryXrtPageID = 'xrtPageContext.primaryXrtPageID';
const tc_xrt_Risk_Analysis = 'tc_xrt_Risk_Analysis';
const tc_xrt_Optimization = 'tc_xrt_Optimization';
const _qfm0ControlAction = 'Qfm0ControlAction';
const _qfm0OptimizationAction = 'Qfm0OptimizationAction';

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
    var deferred = AwPromiseService.instance.defer();
    var input = {};
    input.inputs = getSaveEditInput( dataSource );
    exports.callSaveEditSoa( input ).then( function() {
        deferred.resolve();
        refreshSelectedObjects( null );
    }, function( err ) {
        deferred.reject();
    } );
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
 * Save edits for Current Control Actions
 *
 * @return promise
 */
export let saveEditsActions = function() {
    var deferred = AwPromiseService.instance.defer();
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var input = {};
    input.inputs = getSaveEditInput( dataSource );
    exports.callSaveEditSoa( input ).then( function() {
        refreshSelectedObjects( activeEditHandler );
        deferred.resolve();
    }, function( err ) {
        activeEditHandler.cancelEdits();
        deferred.resolve();
    } );
    return deferred.promise;
};

var getSaveEditInput = function( dataSource ) {
    var inputs = [];
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

    for( var i in modifiedPropsWithoutSubProp ) {
        var viewModelObj = modifiedPropsWithoutSubProp[ i ].viewModelObject;

        var inputAction = dataManagementSvc.getSaveViewModelEditAndSubmitToWorkflowInput( viewModelObj );

        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            if( modifiedVMProperty.type === 'DATE' ) {
                var newDate = exports.getQam0DueDate( modifiedVMProperty.dbValue );
                modifiedVMProperty.dbValue = newDate;
                modifiedVMProperty.newValue = newDate;
            } else {
                modifiedVMProperty.dbValue = modifiedVMProperty.dbValues[ 0 ];
                modifiedVMProperty.newValue = modifiedVMProperty.dbValues[ 0 ];
            }
            dataManagementSvc.pushViewModelProperty( inputAction, modifiedVMProperty );
        } );
        inputs.push( inputAction );
    }
    return inputs;
};

/**
 * Call Versioning SOA for specifications and handle success and failure cases
 *@param {deferred} deferred
 * @return  {promise} promise when all modified Function Specification properties get saved
 */
export let callSaveEditSoa = function( input ) {
    return soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', input ).then(
        function( response ) {
            return response;
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
            throw error;
        }
    );
};

/**
 * Set context to select node after edit complete and reset primary work area
 * @param {ActiveEditHandler} activeEditHandler current active edit handler
 */
var refreshSelectedObjects = function( activeEditHandler ) {
    if( activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( true );
    }

    if( appCtxService.ctx.xrtPageContext.secondaryXrtPageID === tc_xrt_Risk_Analysis || appCtxService.ctx.xrtPageContext.primaryXrtPageID === tc_xrt_Risk_Analysis
        || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === tc_xrt_Optimization || appCtxService.ctx.xrtPageContext.primaryXrtPageID === tc_xrt_Optimization ) {
        if( appCtxService.ctx.pselected !== undefined ) {
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: [
                    appCtxService.ctx.pselected,
                    appCtxService.ctx.selected
                ]
            } );
        }
    } else {
        eventBus.publish( 'cdm.relatedModified', {
            relatedModified: [
                appCtxService.ctx.selected
            ]
        } );
    }
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
var getMessageString = function( messages, msgObj ) {
    msgObj.msg += '<BR/>';
    msgObj.msg += messages.message;
    msgObj.level = _.max( [ msgObj.level, messages.level ] );
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
    if( response && response.partialErrors &&
        ( response.partialErrors[0].errorValues[0].code === 397020 && appCtxService.getCtx( _xrtPageContext_secondaryXrtPageID ) === tc_xrt_Optimization ||
         appCtxService.getCtx( 'pselected' ) === undefined &&  appCtxService.getCtx( _xrtPageContext_primaryXrtPageID ) === tc_xrt_Optimization
            && response.partialErrors[0].errorValues[0].code === 7007  ) ) {
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );
        var errorMessage = localTextBundle.qfm0AddActionGroupFailure;
        msgObj.msg += errorMessage;
    } else if( response && response.partialErrors ) {
        _.forEach( response.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues[ 0 ], msgObj );
        } );
    }

    return msgObj.msg;
};

/**
 * This method returns a count of the total causes/effects removed
 * @param {data} data
 * @param {response} response
 **/
export let getRemovedObjectCount = function( response, totalSelected ) {
    if ( response ) {
        if( response.partialErrors !== undefined ) {
            return totalSelected - response.partialErrors.length;
        }
    }
};

export let removeCauseActionInputs = function( relationType ) {
    var inputData = {};
    var soaInput = [];
    var actionObjectsArray = [];
    var primaryObject = appCtxService.ctx.pselected;
    var secondaryObject = appCtxService.ctx.mselected;
    secondaryObject.forEach( function( selectedObj ) {
        actionObjectsArray.push( {
            uid: selectedObj.uid,
            type: selectedObj.type
        } );
    } );

    if( primaryObject && actionObjectsArray.length > 0 ) {
        inputData = {
            clientId: 'AWClient',
            cause: {
                uid: appCtxService.ctx.fmeaContext.selectedCauseFailure[ 0 ].props.awp0Target.dbValue,
                type: appCtxService.ctx.fmeaContext.selectedCauseFailure[ 0 ].props.object_name.srcObjectTypeName
            },
            effect: {
                uid: primaryObject.uid,
                type: primaryObject.type
            },
            actions: actionObjectsArray,
            relationName: relationType
        };
        soaInput.push( inputData );
    }
    return soaInput;
};

/**
 * This method creates input date required for "createObjects" SOA for relating secondary object with primary
 * object.
 * @param {data} data
 * @return {date} date
 */
export let getQam0DueDate = function( qam0DueDate ) {
    if( qam0DueDate !== undefined || qam0DueDate !== '' ) {
        return dateTimeSvc.formatUTC( qam0DueDate );
    }
};

export let getCreatedRelationObject = function( response, data ) {
    if( response.created && response.created.length > 0 ) {
        return response.modelObjects[ response.created[ response.created.length - 1 ] ];
    }
};

/**
 * This method gives Confirmation and error messages for Drag and drop functionality for Failure Representation object in the tree view
 * @param {ModelObject} targetObject Parent to which the object is to be pasted
 * @param {ModelObject} sourceObjects object to be pasted
 * @param {String} relationType type of relation
 * @return {Object} onject
 */
export let setPastePropertiesForActions = function( targetObject, sourceObjects, relationType ) {
    var deferred = AwPromiseService.instance.defer();
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var errorMessage = localTextBundle.qfm0ActionDragDropError;

    messagingService.showError( errorMessage );

    return deferred.promise;
};

export let setQualityActionTypeSubTypeRelationInfo = function( ctx, isPreventive ) {
    let genericQualityActionRelation = {};
    genericQualityActionRelation.type = 'FMEA';

    if( isPreventive ) {
        genericQualityActionRelation.subType = 'Preventive Action';
    } else{
       genericQualityActionRelation.subType = 'Detection Action';
    }
    genericQualityActionRelation.primaryObj = ctx.selected;
    genericQualityActionRelation.relationType = 'qam0DependentQualityActions';

    appCtxService.updateCtx( 'genericQualityActionRelation', genericQualityActionRelation );
};

export let getActionGroupName = function( ctx, data ) {
    var actionName = {};
    if( appCtxService.getCtx( _xrtPageContext_secondaryXrtPageID ) === tc_xrt_Risk_Analysis || appCtxService.getCtx( _xrtPageContext_primaryXrtPageID ) === tc_xrt_Risk_Analysis ) {
        actionName.object_name = data.i18n.InitialState;
    } else if ( appCtxService.getCtx( _xrtPageContext_secondaryXrtPageID ) === tc_xrt_Optimization || appCtxService.getCtx( _xrtPageContext_primaryXrtPageID ) === tc_xrt_Optimization ) {
        actionName.object_name = data.i18n.RevisionState;
    }
    return actionName.object_name;
};

export let getActionRelation = function( ctx ) {
    var actionRelation = {};
    if( appCtxService.getCtx( _xrtPageContext_secondaryXrtPageID ) === tc_xrt_Risk_Analysis || appCtxService.getCtx( _xrtPageContext_primaryXrtPageID ) === tc_xrt_Risk_Analysis ) {
        actionRelation = 'Qfm0ControlAction';
    } else if ( appCtxService.getCtx( _xrtPageContext_secondaryXrtPageID ) === tc_xrt_Optimization || appCtxService.getCtx( _xrtPageContext_primaryXrtPageID ) === tc_xrt_Optimization ) {
        actionRelation = 'Qfm0OptimizationAction';
    }
    return actionRelation;
};

/**
 * Get FMEA Element objects (SYstem Element/Function/Failure/Actions) from list of created objects UIDs received from SOA
 * @param {object} response - the response Object of SOA
 * @return {Array} Array of created Fmea Elements
 */
export let getCreatedFMEAElements = function( response ) {
    return qfm0FmeaManagerUtils2.getCreatedFMEAElements( response );
};

/**
 * Sort objects of mselectedArray in descending order of their levelNdx (level in tree)
 * @param {Array} mselectedArray
 */
export let sortActionsBeforeDelete = function( mselectedArray ) {
    if( mselectedArray && mselectedArray.length > 0 ) {
        mselectedArray.sort( function( a, b ) {
            return b.levelNdx - a.levelNdx;
        } );
    }
    return mselectedArray;
};

export default exports = {
    getSaveHandler,
    saveEditsActions,
    callSaveEditSoa,
    processPartialErrors,
    getRemovedObjectCount,
    removeCauseActionInputs,
    getQam0DueDate,
    getCreatedRelationObject,
    setPastePropertiesForActions,
    setQualityActionTypeSubTypeRelationInfo,
    getActionGroupName,
    getActionRelation,
    getCreatedFMEAElements,
    sortActionsBeforeDelete
};
app.factory( 'qfm0ActionServices', () => exports );
