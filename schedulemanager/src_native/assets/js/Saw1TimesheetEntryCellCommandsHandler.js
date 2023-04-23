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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Saw1TimesheetEntryCellCommandsHandler
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import dateTimeSvc from 'js/dateTimeService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import saw1TimesheetEntryUtils from 'js/Saw1TimesheetEntryUtils';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

var _timesheetEntry = null;

var _allModifiedProperties = [];

export let extractSrcObjsLSD = function( eventData ) {
    let modelObjects = [];
    let lsd = null;
    if( eventData.viewModelObjectsJsonStrings && eventData.viewModelObjectsJsonStrings.length > 0 ) {
        modelObjects = JSON.parse( eventData.viewModelObjectsJsonStrings[ 0 ] ).objects;
        if( modelObjects.length > 0 ) {
            lsd = modelObjects[ 0 ].props[ Object.keys( modelObjects[ 0 ].props )[ 0 ] ].srcObjLsd;
        }
    }
    return lsd;
};

export let execute = function( vmo, destPanelId, title ) {
    if( vmo && vmo.uid ) {
        _timesheetEntry = vmo;
        editTimesheetEntryPanel( destPanelId, title );
    }
};

var editTimesheetEntryPanel = function( destPanelId, title ) {
    var context = {
        destPanelId: destPanelId,
        title: title,
        recreatePanel: true,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

export let populateDataForTimesheetEntry = function( data ) {
    _allModifiedProperties = [];
    var timesheetEntry = cdm.getObject( _timesheetEntry.uid );
    var propsToLoad = [];
    var desciption = timesheetEntry.props.object_desc.dbValues[ 0 ];
    var minutes =  parseInt( timesheetEntry.props.minutes.dbValues[ 0 ] ) % 60;
    var hours = ( parseInt( timesheetEntry.props.minutes.dbValues[ 0 ] ) - minutes ) / 60;
    var workDate = timesheetEntry.props.date.dbValues[ 0 ];
    var descProp = data.object_desc;
    if( descProp ) {
        uwPropertyService.setValue( descProp, desciption );
        uwPropertyService.setIsRequired( descProp, true );
        _allModifiedProperties.push( data.object_desc );
        propsToLoad.push( data.object_desc.propertyName );
    }
    var hoursProp = data.hours;
    if( hoursProp ) {
          uwPropertyService.setValue( hoursProp, hours );
        uwPropertyService.setIsRequired( hoursProp, true );
        hoursProp.uiValue = hours;
    }
    var minutesProp = data.minutes;
    if( minutesProp ) {
        uwPropertyService.setValue( minutesProp, minutes );
        uwPropertyService.setIsRequired( minutesProp, true );
        minutesProp.uiValue = minutes;
        _allModifiedProperties.push( data.minutes );
        propsToLoad.push( data.minutes.propertyName );
    }
    var workDateProp = data.date;
    if( workDateProp ) {
        var date = new Date( workDate );
        workDateProp.dateApi.dateObject = date;
        workDateProp.dateApi.dateValue = dateTimeSvc.formatDate( workDate, dateTimeSvc.getSessionDateFormat() );

        uwPropertyService.setValue( workDateProp, workDate );
        uwPropertyService.setIsRequired( workDateProp, true );
        _allModifiedProperties.push( data.date );
        propsToLoad.push( data.date.propertyName );
    }
    data.openedMO = timesheetEntry; //ModelObject
    data.propsToLoad = propsToLoad;
    data.selectedVMO = _timesheetEntry; //ViewModelObject
};

var convertHoursToMinutes = function( prop ) {
    var vmProperty = uwPropertyService.createViewModelProperty( prop.propertyName, prop.propertyDisplayName, prop.type );
    var propUpdatedValue = parseInt( prop.dbValue );
    vmProperty.dbValue = propUpdatedValue;
    vmProperty.newValue = propUpdatedValue;
    vmProperty.sourceObjectLastSavedDate = prop.sourceObjectLastSavedDate;
    return vmProperty;
};

export let allModifiedProperties = function( data ) {
    var inputs = [];
    var modifiedProperties = [];
    _.forEach( _allModifiedProperties, function( prop ) {
        var editObject = dms.getSaveViewModelEditAndSubmitToWorkflowInput( _timesheetEntry );
        prop.sourceObjectLastSavedDate = data.lsd;
        if( prop.propertyName === 'date' && prop.dateApi ) {
            prop.dbValue = prop.dateApi.dateObject;
            prop.newValue = prop.dateApi.dateObject;
        }
        if( prop.propertyName === 'minutes' && ( data.hours.dbValue || data.minutes.dbValue ) ) {
            var submitFlag = data.eventData.isSubmitFlag;
            var minutesCheck = data.minutes.dbValue;
            var hoursCheck = data.hours.dbValue;
            saw1TimesheetEntryUtils.validateTimesheetTimeInput( submitFlag, minutesCheck, hoursCheck );
            data.minutes.dbValue = parseInt( data.minutes.dbValue )  + parseInt( data.hours.dbValue * 60 );
            saw1TimesheetEntryUtils.getTimesheetTimeSpentEdit( prop.dbValue );
            prop = convertHoursToMinutes( prop );
        }

        dms.pushViewModelProperty( editObject, prop );
        inputs.push( editObject );
    } );

    if( inputs.length > 0 ) {
        for( var x in inputs ) {
            modifiedProperties.push( inputs[ x ].viewModelProperties[ 0 ] );
        }
    }

    var finalModifiedObject = [ {
        obj: _timesheetEntry,
        viewModelProperties: modifiedProperties
    } ];
    data.inputs = finalModifiedObject;
};

export let populateDeleteMsgInput = function( data, vmo ) {
    if( vmo && vmo.uid ) {
        data.vmo = vmo;
        var deleteTimesheetEntry = cdm.getObject( vmo.uid );

        var deleteTimesheetEntries = [];
        deleteTimesheetEntries.push( deleteTimesheetEntry );
        data.deleteTimesheetEntries = deleteTimesheetEntries;
    }
};

export let updateTimesheetEntryDataProvider = function( data, vmo ) {
    if( data ) {
        data.vmo = vmo;

        eventBus.publish( 'updateTimesheetEntryData', data );
    }
};

export let updateTimesheetEntryData = function( data, deletedUid ) {
    var timesheetEntryObjects = data.dataProviders.getTimesheetEntries.viewModelCollection.loadedVMObjects;
    var modelObjects = $.grep( timesheetEntryObjects, function( timesheetEntryObject ) {
        return timesheetEntryObject.uid !== deletedUid;
    } );
    data.dataProviders.getTimesheetEntries.update( modelObjects );
};

export default exports = {
    extractSrcObjsLSD,
    execute,
    populateDataForTimesheetEntry,
    allModifiedProperties,
    populateDeleteMsgInput,
    updateTimesheetEntryDataProvider,
    updateTimesheetEntryData
};
app.factory( 'Saw1TimesheetEntryCellCommandsHandler', () => exports );
