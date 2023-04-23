// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 *
 * @module js/Psi0CreatePanelService
 */
 import app from 'app';
 import appCtxService from 'js/appCtxService';
 import dateTimeSvc from 'js/dateTimeService';
 import uwPropertyService from 'js/uwPropertyService';
 import commandPanelService from 'js/commandPanel.service';
 import _ from 'lodash';

var exports = {};

var setDateValueForProp = function( vmoProp, dateVal ) {
    uwPropertyService.setValue( vmoProp, dateVal.getTime() );
    vmoProp.dateApi.dateObject = dateVal;
    vmoProp.dateApi.dateValue = dateTimeSvc.formatDate( dateVal, dateTimeSvc
        .getSessionDateFormat() );
    vmoProp.dateApi.timeValue = dateTimeSvc.formatTime( dateVal, dateTimeSvc
        .getSessionDateFormat() );
};

var selectDate = function( data ) {
    let dateProp;
    if( data.revision__psi0DueDate ) {
        dateProp = data.revision__psi0DueDate;
    } else if( data.psi0TargetDate ) {
        dateProp = data.psi0TargetDate;
    } else if( data.psi0DueDate ) {
        dateProp = data.psi0DueDate;
    }
    return dateProp;
};

/**
 * Populates the default date property in the panel for PDR and RIO objects
 *
 * @param {Object} data is used to fetch the required property on panel which is to be set as default value
 * @param {Object} ctx is used to fetch the event information i.e. sublocation and planned date
 */
 export let populateDefaultValuesFromEvent = function( data, ctx ) {
    let event;
    let dateProp;

    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) > -1 ) {
        event = ctx.selected;
    } else if ( ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) > -1 ) {
        event = ctx.pselected; //while creating Program relation
    }

    if( event && event.props.prg0PlannedDate ) {
        dateProp = selectDate( data );
        if( dateProp ) {
            let dueDate = new Date( event.props.prg0PlannedDate.dbValues[ 0 ] );
            setDateValueForProp( dateProp, dueDate );
        }
    }
};

exports = {
    populateDefaultValuesFromEvent
};

export default exports;

app.factory( 'Psi0CreatePanelService', () => exports );
