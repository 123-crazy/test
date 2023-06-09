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
 * @module js/Awp0AddSignoff
 */
import app from 'app';
import awp0WrkflwUtils from 'js/Awp0WorkflowUtils';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';

/**
 * Define public API
 */
var exports = {};

/**
 * Set the active view id on current data object and set the add button visible flag to true
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} panelContext - Panel context object
 */
export let populateSignoffPanelData = function( data, panelContext ) {
    var additionalSearchCriteria = {};
    // Check if panel context is not null and it has selected profile object and additional search criteria
    // then use that criteria directly
    if( panelContext && panelContext.selectedProfile && panelContext.selectedProfile.additionalSearchCriteria ) {
        // FIx for defect # LCS-618160. Cloning the additionals search criteria and then set it
        // on context. So that modifying one will not update other value
        additionalSearchCriteria = _.clone( panelContext.selectedProfile.additionalSearchCriteria );
    }
    // Add the additional search criteria on the scope so that it can be consume while generating the SOA input
    data.additionalSearchCriteria = additionalSearchCriteria;
};

/**
 * Get the valid selected objects from input selection and then create the valid SOA input structure
 * to add the additional signoff.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object that can be group member or resource pool object
 *
 */
export let addSignoffInputData = function( data, selection ) {
    if( !selection ) {
        return;
    }
    // Fire the event to add the selected group memebr or resource pool as signoff
    awp0WrkflwUtils.getValidObjectsToAdd( data, selection ).then( function( validObjects ) {
        data.selectedObjects = validObjects;
        eventBus.publish( 'Awp0AddSignoffViewModel.addSignoffs' );
    } );
};

/**
 * This factory creates a service and returns exports
 *
 * @member AddParticipant
 */

export default exports = {
    populateSignoffPanelData,
    addSignoffInputData
};
app.factory( 'Awp0AddSignoff', () => exports );
