// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Qam0AddGenericQualityActionService
 */

import app from 'app';
import appCtxSvc from 'js/appCtxService';
import dateTimeSvc from 'js/dateTimeService';
import cdmService from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * This method creates input date required for "createObjects" SOA for relating secondary object with primary
 * object.
 * @param {data} data
 * @return {date} date
 */
 export let getQam0DueDate = function ( data ) {
    if( data.qam0DueDate !== undefined || data.qam0DueDate !== '' ) {
        return dateTimeSvc.formatUTC( data.qam0DueDate.dbValue );
    }
};

/**
 * This method creates input date required for "getRelatedReferenceObject" SOA for relating secondary object with primary
 * object.
 * @param {data} data
 * @return {date} date
 */
 export let getRelatedReferenceObject = function ( ctx ) {
    if(!ctx.genericQualityActionRelation || ctx.genericQualityActionRelation === undefined)
    {
        return ctx.xrtSummaryContextObject;
    }
    else
    {
        return ctx.genericQualityActionRelation.primaryObj;
    }
};

/**
 * This method creates input date required for "createObjects" SOA for relating secondary object with primary
 * object.
 * @param {data} data
 * @return {date} object array
 **/
 export let getTargetObjects = function  ( data ) {
    var getObject = {};
    var targetObjectsArray = [];
    if( data.qam0Targets !== undefined || data.qam0Targets !== '' ) {
        var objectarray = [];
        objectarray = data.qam0Targets.dbValue;
        objectarray.forEach( function( object ) {
            getObject = cdmService.getObject( object );
            targetObjectsArray.push( { uid: getObject.uid, type: getObject.type } );
        } );
    }

    return targetObjectsArray;
};

/**
 * This function will return the Soa Input for createRelations
 * @param {Array} secondaryObjects Arrays of the Group member objects selected in Add user Panel
 * @param {String} relation name of the relation object
 * @return {Object} Retuns inputData for Create Relation SOA
 */
export let createQualityActionRelationInput = function( ctx, data ) {
    var inputData = {};
    var secondaryObject = {};
    var soaInput = [];
    var primaryObj = {};
    var relationType;

    if(!ctx.genericQualityActionRelation || ctx.genericQualityActionRelation === undefined)
    {
        primaryObj = ctx.xrtSummaryContextObject;
        relationType = "qam0DependentQualityActions";
    }
    else
    {
        primaryObj = ctx.genericQualityActionRelation.primaryObj;
        relationType = ctx.genericQualityActionRelation.relationType;
    }

    inputData = {
        clientId: 'AWClient',
        primaryObject: primaryObj,
        relationType: relationType,
        secondaryObject: data.createdMainObject,
        userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
    };
    soaInput.push( inputData );

    return soaInput;
};

export let getQualityActionType = function ( ctx ) {
    if(ctx.genericQualityActionRelation) {
    return ctx.genericQualityActionRelation.type;
    }
};

export let getQualityActionSubType = function ( ctx ) {
    if(ctx.genericQualityActionRelation) {
        return ctx.genericQualityActionRelation.subType;
    }
};

export let getSelectedUsers = function( data ) {
    return data.dataProviders.userPerformSearch.selectedObjects;
};

/**
 * prepare the input for set properties SOA call to add the responsible User
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let qam0GetProperties = function( data) {

    var inputData = [];

    var selectedObject = data.createdMainObject;

        var infoObj = {};

        infoObj[ "object" ] = cdmService.getObject( selectedObject.uid );

        infoObj[ "timestamp" ] = "";

        var vecNameVal = [];

    if(data.dataProviders.getAssignedResponsibleUserProvider.viewModelCollection.loadedVMObjects.length>0)
    {
        var temp1 = {};

        temp1[ "name" ] = "fnd0ResponsibleUser";
        temp1[ "values" ] = data.dataProviders.getAssignedResponsibleUserProvider.viewModelCollection.loadedVMObjects[0].props.user.dbValues;

        vecNameVal.push( temp1 );
        var temp2 = {};
        temp2[ "name" ] = "qam0AssignmentDate";
        var curDate = new Date();
        var curDateInUTC = dateTimeSvc.formatUTC( curDate );
        temp2[ "values" ] = [curDateInUTC];
        vecNameVal.push( temp2 );
    }

        infoObj[ "vecNameVal" ] = vecNameVal;

        inputData.push( infoObj );

    return inputData;
};

/**
 * Update fnd0ActionId in data
 *
 * @param {object} data - The qualified data of the viewModel
 * @param {ctx} ctx - The qualified context of the viewModel
 */
export let updateID = function( data, ctx ) {
    data.fnd0ActionItemId.dbValue = ctx.getQAActionId;
    data.fnd0ActionItemId.uiValue = ctx.getQAActionId;
    data.fnd0ActionItemId.dbValues = ctx.getQAActionId;
};

/**
 * Auto select the type if there is single type
 *
 * @param {object} data - The qualified data of the viewModel
 */

export let updatePanel = function( data ) {
    if( data.eventData.selectedObjects.length > 0 ) {
        var type_name = data.eventData.selectedObjects[ 0 ].props.type_name;
        appCtxSvc.ctx.selectedObjectType = type_name.dbValue;
        data.isObjectTypeSelected = true;
        type_name.propertyDisplayName = type_name.uiValue;
        appCtxSvc.ctx.type_name = type_name;
        data.firstTimeLoad = true;
    } else {
        data.isObjectTypeSelected = false;
    }
};

/**
 * Auto select the type if there is single type
 *
 * @param {object} data - The qualified data of the viewModel
 */
export let autoSelectType = function( data ) {
    data.totalTypeFound = data.dataProviders.awTypeSelector.viewModelCollection.totalFound;
    if( data.totalTypeFound === 1 && !data.firstTimeLoad ) {
        var eventData = {
            selectedObjects: [ data.dataProviders.awTypeSelector.getViewModelCollection().getViewModelObject( 0 ) ]
        };
        eventBus.publish( 'awTypeSelector.selectionChangeEvent', eventData );
    }
};

/**
 *This function unregister the clear Selected Object type for creation.
 */

export let clearSelectedType = function( data ) {
    data.isObjectTypeSelected = false;
};

/**
 * This method is used to get the LOV values for the QA panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVListOfQAStatus = function( response, data, ctx ) {
    var value = response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );

    var updatedLovArray = [];

    for( let index = 0; index < value.length; index++ ) {
        if( value[ index ].propInternalValue === 'Draft' ) {
            data.qam0QualityActionStatus.dbValue = value[ index ].propInternalValue;
            data.qam0QualityActionStatus.uiValue = value[ index ].propDisplayValue;
            if( ctx.tcSessionData.tcMajorVersion < 13 ) {
                data.qam0QualityActionStatus.selectedLovEntrie = [];
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ] = value[ index ];
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ].sel = true;
            } else {
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ] = value[ index ];
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ].sel = true;
            }
            updatedLovArray.push(value[index]);
        }
        else if(value[ index ].propInternalValue !== 'Template')
        {
            updatedLovArray.push(value[index]);
        }
    }
    return updatedLovArray;
};

export let clearGenericRelationContextData = function (ctx) {
    appCtxSvc.unRegisterCtx( 'genericQualityActionRelation' );
    appCtxSvc.unRegisterCtx( 'selectedQualityActionTemplate' );
};

/**
 *This function will set decide ObjectName property based on adding context.
 */

export let setObjectNameIfAddingFromTemaplte = function( data, ctx ) {
    if( ctx.sidenavCommandId === 'Qam0addQAFromTemplate' && data.object_name ) {
        data.object_name.dbValue = ctx.selectedQualityActionTemplate[ 0 ].props.object_name.dbValues[ 0 ];
        data.object_name.uiValue = ctx.selectedQualityActionTemplate[ 0 ].props.object_name.dbValues[ 0 ];
        data.object_name.isEditable = false;
        data.object_name.isRequired = false;
        ctx.selectedObjectType = 'Qam0QualityAction';
    }
};

/**
 * This method creates input data required for "createObjects" SOA in order to create Pka0BriefPartnerContactRel object.
 *
 * @param {dat} data
 * @return {ObjectArray} input data
 */
 export let getCreateObjectInput = function( ctx, data ) {
    var inputData = [];
    var dataVal = {};
    var tagpropsVals = {};

    if( ctx.tcSessionData.tcMajorVersion >= 13 ) {
        tagpropsVals = {
            qam0QualityActionTemplate : getqam0QualityActionTemplateObjects(ctx),
            qam0RelatedReference : getRelatedReferenceObject(ctx)
        };
    }
    else
    {
        tagpropsVals = {
            qam0QualityActionTemplate: getqam0QualityActionTemplateObjects(ctx)
        };
    }
    dataVal = {
        boName: ctx.selectedObjectType,
        stringProps: {
            fnd0ActionItemId: data.fnd0ActionItemId.dbValue,
            object_name: data.object_name.dbValue,
            object_desc: data.object_desc.dbValue,
            qam0QualityActionStatus: data.qam0QualityActionStatus.dbValue,
            qam0QualityActionType:getQualityActionType(ctx),
            qam0QualityActionSubtype:getQualityActionSubType(ctx)
        },
        tagArrayProps: {
            qam0Targets: getTargetObjects(data)
        },
        boolProps: {
            qam0AutocompleteByDependent: data.qam0AutocompleteByDependent.dbValue,
            qam0FeedbackAtCompletion: data.qam0FeedbackAtCompletion.dbValue,
            qam0ConfirmationRequired: data.qam0ConfirmationRequired.dbValue
        },
        dateProps: {
            qam0DueDate: getQam0DueDate(data)
        },
        tagProps: tagpropsVals
    };

    var input = {
        clientId: "",
        data: dataVal
    };
    inputData.push( input );

    return inputData;

};

/**
 * This function call updates selectedUserObject if user click on remove buttom for responsible user
 */
 export let getqam0QualityActionTemplateObjects = function (ctx) {
    return ctx.selectedQualityActionTemplate !== undefined ? ctx.selectedQualityActionTemplate[ 0 ] : {};
};

/**
 * Creates input for qfm0.addElement event from using created action object for updating FMEA tree
 */
 export let getCreatedDependentAction = function( createdActionObject ) {
    var result = [];
    if(createdActionObject && createdActionObject.uid) {
        var response = { 
            created: [createdActionObject.uid] 
        };
        if ( response.created ) {
            response.created.forEach( function( objectUid ) {
                var object = cdmService.getObject( objectUid );
                if(object && object.modelType && object.modelType.typeHierarchyArray.indexOf('Qam0QualityAction') > -1) {
                    var createdFmeaElement = {
                        objects:[object]
                    };
                    result.push(createdFmeaElement);
                }
            } );
        }
    }
    return result;
};

export default exports = {
    getQam0DueDate,
    createQualityActionRelationInput,
    getRelatedReferenceObject,
    getTargetObjects,
    getQualityActionType,
    getQualityActionSubType,
    getSelectedUsers,
    qam0GetProperties,
    updateID,
    getLOVListOfQAStatus,
    clearSelectedType,
    updatePanel,
    autoSelectType,
    clearGenericRelationContextData,
    setObjectNameIfAddingFromTemaplte,
    getqam0QualityActionTemplateObjects,
    getCreateObjectInput,
    getCreatedDependentAction
};
app.factory( 'Qam0AddGenericQualityActionService', () => exports );
