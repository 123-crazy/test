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
 * @module js/ShowPanel
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import 'lodash';

var exports = {};

/**
 * Method for invoking and registering/unregistering data for the Add Work Element Panel
 * @param {String} commandId - Command Id for the Add Work Element
 * @param {String} location - Location of the Add Work Element command
 */
export let getAddWorkElementPanel = function( commandId, location ) {
    var Object = 'Object';
    var selection = selectionService.getSelection().selected;
    var Relationtype;
    var workelement;
    if( selection && selection.length > 0 ) {
        if( selection[ 0 ].type === 'Psi0WorkElementRevision' ) {
            Relationtype = 'Psi0PredecessorWorkElement';
        } else {
            Relationtype = 'Psi0WorkElementPDI';
        }
        workelement = {
            CreatePanelIncludeType: 'Psi0WorkElement',
            selectedObject: selection[ 0 ],
            relationType: Relationtype
        };
        appCtxService.registerCtx( Object, workelement );
    } else {
        appCtxService.unRegisterCtx( Object );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Method for invoking registering/unregistering data for the Create Integerated Schedule Panel
 * @param {String} commandId - Command Id for the Add Work Element
 * @param {String} location - Location of the Add Work Element command
 */
export let getCreateIntegratedSchedulePanel = function( commandId, location ) {
    var selection = selectionService.getSelection().selected;
    var m_refDate;
    var dateProp;
    var refDateJSO;
    if( selection && selection.length > 0 ) {
        var obj = {
            eventObj: selection[ 0 ]
        };
        appCtxService.registerCtx( 'eventObj', obj );
        dateProp = selection[ 0 ].props.prg0PlannedDate.dbValues[ 0 ];
        if( typeof dateProp !== 'undefined' ) {
            m_refDate = dateProp;
        }
        refDateJSO = {
            plannedStartDate: m_refDate
        };
        appCtxService.registerCtx( 'plannedStartDate', refDateJSO );
    } else {
        appCtxService.unRegisterCtx( 'plannedStartDate' );
    }
    commandPanelService.activateCommandPanel( commandId, location );
};

export default exports = {
    getAddWorkElementPanel,
    getCreateIntegratedSchedulePanel
};
/**
 * Program Diagramming Panel Service utility
 * @memberof NgServices
 * @member ShowPanel
 */
app.factory( 'ShowPanel', () => exports );
