// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0FeedFilterService
 */
import app from 'app';
import advancedSearchService from 'js/advancedSearchService';
import advancedSearchLovService from 'js/advancedSearchLovService';
import advancedSearchUtils from 'js/advancedSearchUtils';
import clientDataModel from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import ngModule from 'angular';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import preferredAdvancedSearchService from 'js/preferredAdvancedSearchService';
import _dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';
'use strict';

var dateCreatedAfter = {
    "displayName": "Created After",
    "type": "DATE",
    "isAutoAssignable": false,
    "isDCP": false,
    "isDisplayable": true,
    "isEditable": true,
    "isEnabled": true,
    "isLocalizable": false,
    "isNull": false,
    "isPropertyModifiable": true,
    "isRequired": false,
    "isRichText": false,
    "overlayType": "viewModelPropertyOverlay",
    "dispValue": "",
    "labelPosition": "PROPERTY_LABEL_AT_SIDE",
    "dateApi":{
        "isDateEnabled": true,
        "isTimeEnabled": false
    },
    "editable": true,
    "propertyDisplayName": "Created After",
    "propertyLabelDisplay": "PROPERTY_LABEL_AT_SIDE",
    "propertyName": "dateCreatedAfter"
};

var dateCreatedBefore = {
    "displayName": "Created Before",
    "type": "DATE",
    "isAutoAssignable": false,
    "isDCP": false,
    "isDisplayable": true,
    "isEditable": true,
    "isEnabled": true,
    "isLocalizable": false,
    "isNull": false,
    "isPropertyModifiable": true,
    "isRequired": false,
    "isRichText": false,
    "overlayType": "viewModelPropertyOverlay",
    "dispValue": "",
    "labelPosition": "PROPERTY_LABEL_AT_SIDE",
    "dateApi":{
        "isDateEnabled": true,
        "isTimeEnabled": false
    },
    "editable": true,
    "propertyDisplayName": "Created Before",
    "propertyLabelDisplay": "PROPERTY_LABEL_AT_SIDE",
    "propertyName": "dateCreatedBefore"

};

export let getDateFilterProps = function(){
    var dateProps = {
        "dateCreatedAfter": dateCreatedAfter,
        "dateCreatedBefore": dateCreatedBefore
    };
    return Object.assign( {}, dateProps );
};

export let getFilterPropsFromSelectedQueryCriteria = function( response ){

    var ctxObj = appCtxService.ctx;
    if( typeof ctxObj.ac0FeedFilter !== 'undefined' && ctxObj.ac0FeedFilter.ac0Filters3 ) {
        return ctxObj.ac0FeedFilter.ac0Filters3;
    }

    var modelObject = clientDataModel.getObject( response.advancedQueryCriteria.uid );
    var searchUid = ctxObj.ac0FeedFilter.QueryUID;

    //var tmpData = advancedSearchService.getRealProperties( modelObject, ctxObj, searchUid, '', false );
    var modelObjectForDisplay = {
        uid: searchUid,
        props: advancedSearchService.getRealProperties( modelObject, ctxObj, searchUid, '', false ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };

    modelObjectForDisplay.props.ac0PrivateParticipants = {};

    var feedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );

        var hasProp = false;
        _.forEach( feedQueryViewModelObj.props, function( prop ) {
            hasProp = true;
            if( prop.lovApi ) {
                advancedSearchLovService.initNativeCellLovApi( prop, null, 'Search',
                   feedQueryViewModelObj );
                prop.hint = 'checkboxoptionlov';
                prop.suggestMode = true;
                prop.propertyRequiredText = '';
            }
            if( prop.type === 'BOOLEAN' ) {
                prop.propertyLabelDisplay = 'NO_PROPERTY_LABEL';
                prop.hint = 'triState';
                advancedSearchUtils.initTriState( prop );
            }
        } );

    return Object.assign( {}, feedQueryViewModelObj.props );
};

export let getFilterPropsFromSelectedQueryCriteriaAddUsers = function( response ){
    var ctxObj = appCtxService.ctx;
    if( typeof ctxObj.ac0FeedFilter !== 'undefined' && ctxObj.ac0FeedFilter.ac0Filters2 ) {
        return ctxObj.ac0FeedFilter.ac0Filters2;
    }

    var modelObject = clientDataModel.getObject( response.advancedQueryCriteria.uid );
    var searchUid = ctxObj.ac0FeedFilter.QueryUID2;

    //var tmpData = advancedSearchService.getRealProperties( modelObject, ctxObj, searchUid, '', false );
    var modelObjectForDisplay = {
        uid: searchUid,
        props: advancedSearchService.getRealProperties( modelObject, ctxObj, searchUid, '', false ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };

    var feedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );


        var hasProp = false;
        _.forEach( feedQueryViewModelObj.props, function( prop ) {
            hasProp = true;
            if( prop.lovApi ) {
                advancedSearchLovService.initNativeCellLovApi( prop, null, 'Search',
                   feedQueryViewModelObj );
                prop.hint = 'checkboxoptionlov';
                prop.suggestMode = true;
                prop.propertyRequiredText = '';
                prop.propertyDisplayName = 'Participants';
            }
        } );

    return Object.assign( {}, feedQueryViewModelObj.props );
};

export let doFeedFiltering = function( data ) {
    var context = appCtxService.getCtx( 'ac0FeedFilter' );
    context.ac0Filters2 = data.ac0Filters2;
    context.ac0Filters3 = data.ac0Filters3;

    // Reset the values to undefined
    context.isPrivate = undefined;
    context.priority = undefined;
    context.privateParticipants = undefined;
    context.status = undefined;
    context.dateCreatedBefore = undefined;
    context.dateCreatedAfter = undefined;

    // Check the ac0Filters2 and set the selected values
    if( typeof data.ac0Filters2 !== 'undefined' && typeof data.ac0Filters2.ac0PrivateParticipants !== 'undefined' ) {
        if( typeof data.ac0Filters2.ac0PrivateParticipants.uiValue !== 'undefined' && data.ac0Filters2.ac0PrivateParticipants.uiValue !== null ) {
            context.privateParticipants = data.ac0Filters2.ac0PrivateParticipants.uiValue;
        }
    }

    // Check the ac0Filters3 and set the selected values
    if( typeof data.ac0Filters3 !== 'undefined' ) {
        if( typeof data.ac0Filters3.ac0IsPrivate !== 'undefined' && data.ac0Filters3.ac0IsPrivate.dbValue ) {
            context.isPrivate = 'private';
        } else if( typeof data.ac0Filters3.ac0IsPrivate !== 'undefined' && data.ac0Filters3.ac0IsPrivate.dbValue === false ) {
            context.isPrivate = 'public';
        }
        if( typeof data.ac0Filters3.ac0Priority !== 'undefined' && data.ac0Filters3.ac0Priority.dbValue.length > 0 ) {
            var priorityStr = "";
            for( var i = 0; i < data.ac0Filters3.ac0Priority.dbValue.length; i++ ) {
                priorityStr += data.ac0Filters3.ac0Priority.dbValue[ i ];
                if( i < data.ac0Filters3.ac0Priority.dbValue.length - 1 ) {
                    priorityStr += ",";
                }
            }
            context.priority = priorityStr;
        }

        if( typeof data.ac0Filters3.ac0Status !== 'undefined' && data.ac0Filters3.ac0Status.dbValue.length > 0 ) {
            var statusStr = "";
            for( var i = 0; i < data.ac0Filters3.ac0Status.dbValue.length; i++ ) {
                statusStr += data.ac0Filters3.ac0Status.dbValue[ i ];
                if( i < data.ac0Filters3.ac0Status.dbValue.length - 1 ) {
                    statusStr += ",";
                }
            }
            context.status = statusStr;
        }
        if( typeof data.ac0Filters1.dateCreatedAfter !== 'undefined'
            && typeof data.ac0Filters1.dateCreatedAfter.uiValue !== 'undefined'
            && data.ac0Filters1.dateCreatedAfter.uiValue !== ''
            && data.ac0Filters1.dateCreatedAfter.dbValue > -62135579038000 ) {
            context.dateCreatedAfter = data.ac0Filters1.dateCreatedAfter.uiValue + ' 00:00';
        }
        if( typeof data.ac0Filters1.dateCreatedBefore !== 'undefined'
            && typeof data.ac0Filters1.dateCreatedBefore.uiValue !== 'undefined'
            && data.ac0Filters1.dateCreatedBefore.uiValue !== ''
            && data.ac0Filters1.dateCreatedBefore.dbValue > -62135579038000 ) {
            context.dateCreatedBefore = data.ac0Filters1.dateCreatedBefore.uiValue + ' 00:00';
        }
    }

    appCtxService.updateCtx( 'ac0FeedFilter', context );

    eventBus.publish( 'primaryWorkarea.reset' );
};

let clearProp = function( prop ) {
    prop.searchText = '';
        if( prop.type === 'DATE' ) {
            prop.newDisplayValues = [ '' ];
            prop.newValue = _dateTimeSvc.getNullDate();
            prop.dbValue = _dateTimeSvc.getNullDate();
            prop.dateApi.dateObject = null;
            prop.dateApi.dateValue = '';
            prop.dateApi.timeValue = '';
            prop.dbValues = [];
            prop.displayValues = [ '' ];
            prop.uiValue = '';
            prop.uiValues = [ '' ];
            prop.value = 0;
        } else {
            var propName = prop.propertyName;
            var propDisplayName = prop.propertyDisplayName;
            if( propName && propDisplayName && prop.dbValue !== 'undefined' && prop.dbValue !== null ) {
                if( prop.propertyDescriptor && prop.propertyDescriptor.lovCategory === 1 ) {
                    prop.dbValue = [];
                } else {
                    prop.dbValue = null;
                }
                prop.dbValues = [];
                prop.displayValues = [ '' ];
                prop.uiValue = '';
                prop.uiValues = [ '' ];
                prop.value = null;
            }
        }
};
/**
 * clearAllAction
 * @function clearAllAction
 * @param {Object}data - the view model data
 */
export let clearAllAction = function( data ) {
    if( typeof data !== 'undefined' ){
        _.forEach( data.ac0Filters1, function( prop ) {
            clearProp( prop );
        } );
        _.forEach( data.ac0Filters2, function( prop ) {
            clearProp( prop );
        } );
        _.forEach( data.ac0Filters3, function( prop ) {
            clearProp( prop );
        } );
    }
};

const exports = {
    getFilterPropsFromSelectedQueryCriteria,
    getFilterPropsFromSelectedQueryCriteriaAddUsers,
    getDateFilterProps,
    doFeedFiltering,
    clearAllAction
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member Ac0FeedFilterService
 */
app.factory( 'Ac0FeedFilterService', () => exports );
