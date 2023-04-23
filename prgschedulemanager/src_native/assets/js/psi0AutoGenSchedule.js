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
 * @module js/psi0AutoGenSchedule
 */
import app from 'app';
import selectionService from 'js/selection.service';
import soaServ from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';
import _dateTimeSvc from 'js/dateTimeService';
import _uwDirectiveDateTimeSvc from 'js/uwDirectiveDateTimeService';
import appCtxService from 'js/appCtxService';

var exports = {};

export let getGenerateSchedulePanel = function( commandId, location ) {
    var jso = 'jso';

    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 ) {
        var parent = selectionService.getSelection().parent;
        var eventArray = [ cdm.getObject( parent.uid ) ];
        soaServ.getProperties( [ eventArray[ 0 ].uid ], [ 'prg0PlannedDate' ] ).then( function() {
            var plannedDate = eventArray[ 0 ].props.prg0PlannedDate.dbValues[0];
            var jsoObj = {
                sourceObj: selection,
                eventObj: parent,
                refDate: plannedDate
            };
            appCtxService.registerCtx( jso, jsoObj );
        } );
    } else {
        appCtxService.unRegisterCtx( jso );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};
var insertListModelObject = function( listModels, displayValue, internalValue ) {
    var listModel = {
        propDisplayValue: displayValue,
        propInternalValue: internalValue,
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
    listModels.push( listModel );
};

export let populateListModelObject = function( data ) {
    var listModels = [];
    insertListModelObject( listModels, data.i18n.ProgramDeliverable, 'Program Deliverable' );
    insertListModelObject( listModels, data.i18n.DeliverableInstances, 'Deliverable Instances' );
    return listModels;
};

export let getSourceTypeValue = function( deliverable, change ) {
    var selection = selectionService.getSelection().selected;
    var sourceTypeValue = null;
    if( selection && selection.length > 0 ) {
        if( selection[ 0 ].modelType.typeHierarchyArray.indexOf( 'Psi0PrgDelRevision' ) > -1 ) {
            sourceTypeValue = deliverable;
        } else {
            sourceTypeValue = change;
        }
    }
    return sourceTypeValue;
};

/**
 * Checks validity for given date
 * @param {Date} date : Date
 * @returns {boolean} : Returns true if valid date
 */
var isValidDate = function( date ) {
    var isValidDate = true;
    if( date.dateValue ) {
        try {
            _uwDirectiveDateTimeSvc.parseDate( date.dateValue );
        } catch ( ex ) {
            isValidDate = false;
        }
    }
    return isValidDate;
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {dateObject} refDate - The date object
 * @return {dateValue} The date string value
 */
export let getDateString_refDate = function( refDate ) {
    if( !isValidDate( refDate ) ) {
        throw 'invalidRefDate';
    }

    var dateValue = _dateTimeSvc.formatUTC( refDate.dateObject );

    if( dateValue === '' || typeof dateValue === typeof undefined ) {
        throw 'invalidRefDate';
    }
    return dateValue;
};

/**
 * Get Schedule Method from Radio Button Selection
 * @param {Date} date : Date
 * @returns {String} : Return StartDate or FinishDate based on selection
 */
export let getScheduleMethod = function( data ) {
    var selectedMethod;

    if( data.scheduleMethod.dbValue ) {
        selectedMethod = 'StartDate';
    } else {
        selectedMethod = 'FinishDate';
    }
    return selectedMethod;
};

/**
 * Checks validity for given timeValue
 * @param {string} timeValue : timeValue
 * @returns {boolean} : Returns true if valid time
 */
 var isValidTime = function( timeValue ) {
    var isValidTime = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])(:[0-5]?[0-9])?$/.test(timeValue);

    return isValidTime;
};

/**
 * On every datetime change validate Date & Time and return true if it's valid
 * @param {Date} date : Date
 */
export let handleDateOrTimeChange = function( data ) {
    if( isValidDate( data.referenceDate.dateApi ) && isValidTime( data.referenceDate.dateApi.timeValue ) ) {
        return true;
    }
    return false;
};

export default exports = {
    getGenerateSchedulePanel,
    populateListModelObject,
    getSourceTypeValue,
    getDateString_refDate,
    getScheduleMethod,
    handleDateOrTimeChange
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member psi0AutoGenSchedule
 */
app.factory( 'psi0AutoGenSchedule', () => exports );
