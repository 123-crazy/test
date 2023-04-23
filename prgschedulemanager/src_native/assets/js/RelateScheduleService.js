//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/RelateScheduleService
 */
import app from 'app';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

/**
 * createRelations SOA input data.
 *
 * @param {object} data the view model data object
 * @param {object} valid schedules which are not templates or unpublished.
 * @param {string} relation type.
 */
export let getCreateInput = function( data, validSchedules, relation ) {
    var input = [];
    for( var secondObj in validSchedules ) {
        if( validSchedules.hasOwnProperty( secondObj ) ) {
            var inputData = {
                primaryObject: data.targetObject,
                secondaryObject: validSchedules[ secondObj ],
                relationType: relation,
                clientId: "",
                userData: {
                    uid: "AAAAAAAAAAAAAA",
                    type: "unknownType"
                }
            };
            input.push( inputData );
        }
    }
    return input;
};

/**
 * Get projects
 *
 * @param {object} response of getProperties SOA call
 */
export let getProps = function( response, data ) {
    var schedules = null;
    var IsNotValidSchedule = true;
    var validSchedules = [];
    var invalidSchedules = [];
    _.forEach(
        data.sourceObjects,
            function( object ) {
                let scheduleObj = cdm.getObject(object.uid);
                if( scheduleObj && cmm.isInstanceOf( 'Schedule', scheduleObj.modelType ) ) {
                    IsNotValidSchedule = ( scheduleObj.props.is_template.dbValues[ 0 ] === '1' || scheduleObj.props.published.dbValues[ 0 ] === '0' );
                    if( !IsNotValidSchedule ) {
                        validSchedules.push( scheduleObj );
                    } else {
                        invalidSchedules.push( scheduleObj );
                    }
                }
            } );
    schedules = {
        "validSchedules": validSchedules,
        "invalidSchedules": invalidSchedules
    };
    return schedules;
};

/**
 * Get Error Message.
 *
 * @param {object} data the view model data object
 * @param {array} The array of schedules.
 */
export let getErrorMessage = function( data, schedules ) {
    _.forEach( schedules, function() {

        throw "invalidScheduleErrorMsg";
    } );

};

/**
 * Get Schedules.
 *
 * @param {object} data the view model data object
 */
export let getSchedules = function( data ) {
    var input = [];
    var inputData;
    for( var objects in data.sourceObjects ) {
        if( data.sourceObjects.hasOwnProperty( objects ) ) {
            inputData = data.sourceObjects[ objects ];
            input.push( inputData );
        }
    }
    return input;
};

export let relateSchedulePanel = function( commandId, location ) {

    var Object = 'Object';
    var selection = appCtxService.ctx.selected;
    var objRelation = null;

    if( selection && selection.modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) > -1 ) {
        objRelation = "Psi0EventScheduleRelation";
    } else {
        objRelation = "Psi0PlanSchedule";
    }
    if( selection ) {

        var jso = {
            relation: objRelation,
            selected: selection
        };
        appCtxService.registerCtx( Object, jso );
    } else {
        appCtxService.unRegisterCtx( Object );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    getCreateInput,
    getProps,
    getErrorMessage,
    getSchedules,
    relateSchedulePanel
};
/**
 * Service for relate schedule panel.
 *
 * @member RelateScheduleService
 * @memberof NgServices
 */
app.factory( 'RelateScheduleService', () => exports );
