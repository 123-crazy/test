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
 * @module js/Qam0AddQualityActionService
 */

import app from 'app';
import dateTimeSvc from 'js/dateTimeService';
import cdmService from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import _ from 'lodash';

var exports = {};

export let setPropertiesSOAinput = function( data, ctx, location ) {
    var inputData = [];

    var infoObj = {};

    infoObj.object = cdmService.getObject( ctx.xrtSummaryContextObject.uid );

    infoObj.timestamp = '';

    var temp = {};

    var addElement = [];

    var isAddToQualityActFlag = true;

    var tempArray = [];

    var arrayToQA = [];

    var isExist = false;

    if( location === 'qam0DependentQualityActions' ) {
        arrayToQA = data.targetObject.props.qam0DependentQualityActions.dbValues;
    } else {
        arrayToQA = data.targetObject.props.qam0Targets.dbValues;
    }
    for( var index2 = 0; index2 < arrayToQA.length; index2++ ) {
        checkIfQualityActionExistOrAddInArray( arrayToQA[ index2 ], tempArray );
    }
    if( data.selectedTab.name !== 'New' ) {
        for( var index = 0; index < data.sourceObjects.length; index++ ) {
            if( data.sourceObjects[ index ].uid === ctx.xrtSummaryContextObject.uid ) {
                isAddToQualityActFlag = false;
                messagingService.showError( data.i18n.addTargetSourceSameFailureMessage );
            } else {
                isExist = checkIfQualityActionExistOrAddInArray( data.sourceObjects[ index ].uid, tempArray );
                if( isExist === true ) {
                    messagingService.showError( data.i18n.pasteFailForExistDependentQualityAction.replace( '{0}', data.sourcObjects[ index ].props.object_name.dbValues ) );
                } else {
                    addElement.push( data.sourceObjects[ index ].props.object_name.dbValue );
                }
            }
        }
    }
    if( location === 'qam0DependentQualityActions' ) {
        temp.name = 'qam0DependentQualityActions';
    } else {
        temp.name = 'qam0Targets';
    }
    temp.values = tempArray;

    var vecNameVal = [];
    vecNameVal.push( temp );

    infoObj.vecNameVal = vecNameVal;
    inputData.push( infoObj );

    return {
        inputData: inputData,
        isAddToQualityActFlag: isAddToQualityActFlag,
        addElement: addElement
    };
};

/**
 * Check if Current Question Exist in Array if not then Add
 *
 * @param { CurrentQuestion, QuestionArray} data
 */
var checkIfQualityActionExistOrAddInArray = function( qualityAction, updatedArray ) {
    var isExistTemp = true;
    var index = updatedArray.indexOf( qualityAction );
    if( index === -1 ) {
        isExistTemp = false;
        updatedArray.push( qualityAction );
    }
    return isExistTemp;
};

export let setCreateRelationType = function (data, location) {
    if (location === 'qam0DependentQualityActions') {
        data.creationRelation.dbValue = 'qam0DependentQualityActions';
    } else if (location === 'qam0ExecutionReference') {
        data.creationRelation.dbValue = 'qam0ExecutionReference';
    } else {
        data.creationRelation.dbValue = 'qam0Targets';
    }
};

export default exports = {
    setPropertiesSOAinput,
    setCreateRelationType
};
app.factory( 'Qam0AddQualityActionService', () => exports );
