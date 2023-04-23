// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
  Map
 */

/**
 * @module js/Qam0SaveAsService
 */

import app from 'app';
import dateTimeSvc from 'js/dateTimeService';
import cdmService from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import selectionService from 'js/selection.service';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

var domainInternalNames = new Map();
var QFM0RISKEVALUATION = 'Qfm0RiskEvaluation';

/**
 * This method is used to get the DeepCopyData from getDeepCopyData SOA
 * @param {Object} response the response of the getDeepCopyData soa
 * @returns {Object} DeepCopy Rules
 */
export let getQualityActionDeepCopyData = function( response ) {

    var deepCopyDatas = [];

    response.deepCopyDatas.map( function( deepCopy ) {

        if(deepCopy.attachedObject.modelType.typeHierarchyArray.indexOf(QFM0RISKEVALUATION) === -1){

            var deepCopyRule = {};

            var childDeepCopyData = [];

            deepCopyRule = getQADeepCopyData( deepCopy.attachedObject, deepCopy.propertyValuesMap.propertyName, deepCopy.propertyValuesMap.copyAction );

            if( deepCopy.propertyValuesMap.propertyName[ 0 ] === "qam0DependentQualityActions" && deepCopy.childDeepCopyData.length > 0 ) {
                deepCopy.childDeepCopyData.map( function( childDeepCopy ) {
                    var childDeepCopyRule = {};
                    if( childDeepCopy.propertyValuesMap.propertyName[ 0 ] !== "qam0DependentQualityActions" ) {
                        childDeepCopyRule = getQADeepCopyData( childDeepCopy.attachedObject, childDeepCopy.propertyValuesMap.propertyName, childDeepCopy.propertyValuesMap.copyAction );
                        childDeepCopyData.push( childDeepCopyRule );
                    } else if( childDeepCopy.propertyValuesMap.propertyName[ 0 ] === "qam0DependentQualityActions" ) {
                        childDeepCopyRule = getQADeepCopyData( childDeepCopy.attachedObject, childDeepCopy.propertyValuesMap.propertyName, "NoCopy" );
                        childDeepCopyData.push( childDeepCopyRule );
                    }
                } );
                deepCopyRule.childDeepCopyData = childDeepCopyData;
            }
            deepCopyDatas.push( deepCopyRule );            
        }           

    } );

    return deepCopyDatas;
};

/**
 * This method prepare SOA input for SaveAsObjectsAndRelate.
 * @param {object} data - Data of ViewModelObject
 * @param {contextObject} ctx - Context Object
 * @param {Array of Object} deepCopyDatas - DeepCopyRules related to BO
 * @return {Object} - Input container for setProperties
 */
export let prepareSaveAsInput = function( data, ctx, deepCopyDatas ) {
    var iVecSoaSavAsIn = [];

    var iVecSoaSaveAs = {};

    iVecSoaSaveAs.targetObject = ctx.selected;

    var inputPropValues = {};

    inputPropValues.qam0QualityActionStatus = data.qualityActionStatus.dbValue === null ? [ "" ] : [ data.qualityActionStatus.dbValue.toString() ];
    var dueDate = getDateString_DueDate( data.DueDate.dateApi.dateObject );
    inputPropValues.qam0DueDate = [ dueDate ];
    inputPropValues.qam0FeedbackAtCompletion = ctx.selected.props.qam0FeedbackAtCompletion.dbValues === null ? [ "" ] : [ ctx.selected.props.qam0FeedbackAtCompletion.dbValues.toString() ];
    inputPropValues.qam0ConfirmationRequired = ctx.selected.props.qam0ConfirmationRequired.dbValues === null ? [ "" ] : [ ctx.selected.props.qam0ConfirmationRequired.dbValues.toString() ];
    inputPropValues.qam0AutocompleteByDependent = ctx.selected.props.qam0AutocompleteByDependent.dbValues === null ? [ "" ] : [ ctx.selected.props.qam0AutocompleteByDependent.dbValues.toString() ];
    inputPropValues.qam0QualityActionType = ctx.selected.props.qam0QualityActionType.dbValues === null ? [ "" ] : [ ctx.selected.props.qam0QualityActionType.dbValues.toString() ];
    inputPropValues.qam0QualityActionSubtype = ctx.selected.props.qam0QualityActionSubtype.dbValues === null ? [ "" ] : [ ctx.selected.props.qam0QualityActionSubtype.dbValues.toString() ];
    inputPropValues.qam0IncludeDepQualityActs = ( data.dependentQualityAction.dbValue === null || data.dependentQualityAction.dbValue === undefined ) ? [ "" ] : [ data.dependentQualityAction.dbValue.toString() ];

    iVecSoaSaveAs.inputPropValues = inputPropValues;

    iVecSoaSaveAs.deepCopyDatas = deepCopyDatas;

    for( var deepCopy_index = 0; deepCopy_index < iVecSoaSaveAs.deepCopyDatas.length; deepCopy_index++ ) {
        if( iVecSoaSaveAs.deepCopyDatas[ deepCopy_index ].propertyName === "qam0DependentQualityActions" ) {
            var operationInputs = {};
            operationInputs.qam0QualityActionStatus = data.qualityActionStatus.dbValue === null ? [ "" ] : [ data.qualityActionStatus.dbValue.toString() ];
            operationInputs.qam0DueDate = [ dueDate ];
            iVecSoaSaveAs.deepCopyDatas[ deepCopy_index ].operationInputs = operationInputs;
        }
    }

    iVecSoaSavAsIn.push( iVecSoaSaveAs );

    var iVecSoaRelteInfoIn = [];

    var iVecSoaRelteInfo = {};

    iVecSoaRelteInfo.target = "";

    iVecSoaRelteInfo.relate = true;

    iVecSoaRelteInfoIn.push( iVecSoaRelteInfo );

    var response = {
        "iVecSoaSavAsIn": iVecSoaSavAsIn,
        "iVecSoaRelteInfoIn": iVecSoaRelteInfoIn
    };
    return response;

};

/**
 * This method is used to get the DeepCopyData for Quality Action Business Object.
 * @param {Object} attachedObj the DeepCopydata of attachedObj
 * @param {String} propertyName DeepcopyData property Name
 * @param {String} copyAction DeepCopy CopyAction can be "CopyAsObject","NoCopy"
 * @returns {Object} DeepCopyRule related to property on Quality Action BO
 */
var getQADeepCopyData = function( attachedObj, propertyName, copyAction ) {
    var deepCopyRule = {};
    deepCopyRule.attachedObject = attachedObj;
    deepCopyRule.propertyName = propertyName.toString();
    deepCopyRule.propertyType = "Reference";
    deepCopyRule.copyAction = copyAction.toString();
    deepCopyRule.copyRelations = true;
    deepCopyRule.isRequired = false;
    deepCopyRule.isTargetPrimary = true;
    return deepCopyRule;
};

/**
 * This method is used to get the LOV values for the versioning panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    var value = response.lovValues.map( function( obj ) {
        return {
            "propDisplayValue": obj.propDisplayValues.lov_values[ 0 ],
            "propDisplayDescription": obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            "propInternalValue": obj.propInternalValues.lov_values[ 0 ]
        };
    } );
    return value;
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {dateObject} dateObject - The date object
 * @return {dateValue} The date string value
 */
var getDateString_DueDate = function( dateObject ) {
    var dateValue = {};
    dateValue = dateTimeSvc.formatUTC( dateObject );
    return dateValue;
};
/*
 * Method for invoking and registering/unregistering data for the Save As command panel
 * 
 * @param {String} commandId - Command Id for the Save As command
 * @param {String} location - Location of the Save As command
 */
export let getSaveAsPanel = function( commandId, location ) {

    var selection = selectionService.getSelection().selected;
    if( selection && selection.length > 0 ) {
        var jso = {
            "selectedobject": selection
        };
        appCtxSvc.registerCtx( 'SaveAsContext', jso );

    } else {
        appCtxSvc.unRegisterCtx( 'SaveAsContext' );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    getQualityActionDeepCopyData,
    prepareSaveAsInput,
    getLOVList,
    getSaveAsPanel
};
app.factory( 'Qam0SaveAsService', () => exports );
