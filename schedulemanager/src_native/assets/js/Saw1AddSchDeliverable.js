//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * @module js/Saw1AddSchDeliverable
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

export let openAddScheduleDeliverablePanel = function( commandId, location ) {
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Add the selected object to data
 *
 * @param {object} data - The qualified data of the viewModel
 * @param {object} selection - The selected object
 */
export let addSelectedObject = function( data, selection ) {
    if( selection && selection[ 0 ] ) {
        data.selectedObject = selection[ 0 ];
    } else {
        data.selectedObject = null;
    }
};

/**
 * Return type_name of the deliverable selected
 * @param {object} data - Data of ViewModelObject
 * @returns {String} Type name for schedule deliverable
 */
export let schDeliverableTypeString = function( data ) {
    return data.selectedObject.props.type_name.dbValue;
};

exports = {
    openAddScheduleDeliverablePanel,
    addSelectedObject,
    schDeliverableTypeString
};

export default exports;
/**
 * Service to display Add Schedule Deliverable panel.
 *
 * @member Saw1AddSchDeliverableService
 * @memberof NgServices
 */
app.factory( 'Saw1AddSchDeliverable', () => exports );
