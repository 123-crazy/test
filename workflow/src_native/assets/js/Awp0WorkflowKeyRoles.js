// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This implements the Key roles functionality that need to be shown on UI.
 *
 * @module js/Awp0WorkflowKeyRoles
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import listBoxService from 'js/listBoxService';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';

var exports = {};

var parentData = null;

/**
 * Populate the members on UI related to projects and workflow default members.
 *
 * @param {Object} data The qualified data of the viewModel
 * @param {Array} membersList Member lsit array
 *
 * @returns {Promise} Promise object
 */
export let loadMembersData = function( data, membersList ) {
    parentData = data;
    var deferred = AwPromiseService.instance.defer();
    var searchResults = Awp0WorkflowDesignerUtils.createKeyRoleObjects( membersList, false );
    var object = {
        searchResults: searchResults,
        totalFound: searchResults.length
    };
    deferred.resolve( object );
    return deferred.promise;
};

/**
 * Based on input multiSelectMode return true or false.
 *
 * @param {Object} multiSelectMode - To define that multi select mode is enabled or not
 *
 * @return {boolean} The boolean value to tell that multi select mode is enabled or not
 */
export let getMultiSelectMode = function( multiSelectMode ) {
    if( multiSelectMode && multiSelectMode === 'multiple' ) {
        return true;
    }
    return false;
};

/**
 * Get the obejct types that need to be shown on UI.
 * @param {Object} response Response object
 *
 * @returns {Object} Object types list model array
 */
export let getObjectTypeLOVListValues = function( response ) {
    var modelObjects = [];
    if( response && response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults ) {
            for( var i = 0; i < searchResults.objects.length; i++ ) {
                var uid = searchResults.objects[ i ].uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                modelObjects.push( obj );
            }
        }
        var endReached = response.cursor.endReached;
        parentData.moreValuesExist = !endReached;
    }
    return listBoxService.createListModelObjects( modelObjects, 'props.object_string' );
};

/**
 * Get the dynamic participant obejct types that need to be shown on UI based on
 * selected object type.
 * @param {Object} response Response object
 *
 * @returns {Array} Dynamic participant array
 */
export let getDynamicParticipantTypes = function( response ) {
    var dynamicParticipants = [];
    if( response && response.searchFilterCategories ) {
        dynamicParticipants = Awp0WorkflowDesignerUtils.createKeyRoleObjects( response.searchFilterCategories, false );
    }
    return dynamicParticipants;
};

/**
 * Update the data provider based on input dynamic participant objects.
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The qualified data of the viewModel
 * @param {Array} dynamicParticipants - The dynamic participant object array
 */
export let updateProvider = function( data, dataProvider, dynamicParticipants ) {
    data.dynamicParticipantObjects = [];
    if( dynamicParticipants ) {
        data.dynamicParticipantObjects = dynamicParticipants;
    }
    dataProvider.update( data.dynamicParticipantObjects, data.dynamicParticipantObjects.length );
};

/**
 * Add the selected key to selected object list based on input selection mode.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
 * @param {Array} selection - The selection object array
 */
export let addKeyRoleSelectedObject = function( data, multiSelectEnabled, selection ) {
    data.selectedObjects = [];
    if( !selection || selection.length <= 0 ) {
        return;
    }
    if( multiSelectEnabled ) {
        var finalList = [];
        _.forEach( selection, function( object ) {
            // Check if same object is not exist in the list then only add it.
            if( object.selected ) {
                finalList.push( object );
            }
        } );

        data.selectedObjects = finalList;
    } else {
        data.selectedObjects.push( selection[ 0 ] );
    }
};

/**
 * Get the select object from provider from UI and add to the data
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
 * @param {Array} participantSelections - The participant selection object array
 * @param {Array} workflowSelections - The workflow selection object array
 * @param {Array} projectSelections - The project selection object array
 * @param {Object} ctx - The context object
 */
export let addSelectionToMainPanel = function( data, multiSelectEnabled, participantSelections, workflowSelections, projectSelections, ctx ) {
    // If multi selection is enabled then only merge the selections from all data provider else use the last selection
    if( multiSelectEnabled ) {
        data.selectedObjects = [];
        var selectedObjects = [];
        Array.prototype.push.apply( selectedObjects, workflowSelections );
        Array.prototype.push.apply( selectedObjects, participantSelections );
        Array.prototype.push.apply( selectedObjects, projectSelections );
        data.selectedObjects = selectedObjects;
    }
    // Publish the event to show the selected objects on main panel
    eventBus.publish( 'addSelectionToMainPanel', {
        scope: {
            data: data,
            ctx: ctx
        }
    } );
};

export default exports = {
    loadMembersData,
    getMultiSelectMode,
    getObjectTypeLOVListValues,
    getDynamicParticipantTypes,
    updateProvider,
    addKeyRoleSelectedObject,
    addSelectionToMainPanel
};
/**
 * Define workflow key roles handler
 *
 * @memberof NgServices
 * @member Awp0WorkflowDesignerUtils
 * @param {Object} $q - Service to use.
 * @param {Object} listBoxService - Service to use.
 * @param {Object} Awp0WorkflowDesignerUtils - Service to use.
 * @return {Awp0WorkflowDesignerUtils} Reference to service API.
 *
 */
app.factory( 'Awp0WorkflowKeyRoles', () => exports );
