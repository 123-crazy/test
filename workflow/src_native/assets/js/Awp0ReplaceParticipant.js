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
 * @module js/Awp0ReplaceParticipant
 */
import * as app from 'app';
import clientDataModel from 'soa/kernel/clientDataModel';
import _ from 'lodash';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the from participant based on input participant object
 *
 * @param {Object} participantObject - The model object for property needs to be populated
 *
 * @return {Object} From participant object that will be replaced
 */
var getFromAssigneeFromParticipant = function( participantObject ) {
    var assignee = null;
    var fromAssignee = null;
    if( participantObject && participantObject.props.assignee && participantObject.props.assignee.dbValues.length > 0 ) {
        assignee = clientDataModel.getObject( participantObject.props.assignee.dbValues[ 0 ] );
        fromAssignee = {
            "type": assignee.type,
            "uid": assignee.uid
        };
    }
    return fromAssignee;
};

/**
 * Get the from participant based on input item revision object
 *
 * @param {Object} itemRevObject - The model object for property needs to be populated
 * @param {Object} participantType the participant type
 * @return {Object} From participant object that will be replaced
 */
var getFromAssigneeFromItemRevision = function( itemRevObject, participantType ) {
    var fromAssignee = null;
    var participants = null;

    // Get all the participants from input item revision object
    if( itemRevObject.props.participants && itemRevObject.props.participants.dbValues.length > 0 ) {
        participants = itemRevObject.props.participants.dbValues;
    }

    // Check if participant objects are not null then iterate for each participant type
    // to find out the correct participant that need to be removed
    if( participants ) {
        // Iterate for each object object
        _.forEach( participants, function( participant ) {
            var participantObj = clientDataModel.getObject( participant );

            if( participantObj && participantObj.type === participantType ) {
                fromAssignee = getFromAssigneeFromParticipant( participantObj );
            }

        } );
    }

    return fromAssignee;
};

/**
 * Get the object whose properties needs to be loaded in the system.
 *
 * @param {Object} Context object
 * @return {Object} Assignee that need to be reassigned
 */
export let getObjectsToLoad = function( ctx ) {
    var objectsToLoad = [];

    // If participant object is selected then add that participant to list.
    if( ctx.workflow.selParticipantObject ) {
        objectsToLoad.push( ctx.workflow.selParticipantObject );
    }

    // In case of EPMTask or signoff selection add as well
    if( ctx.workflow.selectedObject && ctx.workflow.selectedObject.modelType.typeHierarchyArray.indexOf( 'EPMTask' ) > -1 ||
        ctx.workflow.selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
        objectsToLoad.push( ctx.workflow.selectedObject );
    }
    return objectsToLoad;
};

/**
 * Get the from assignee that need to be replaced
 *
 * @param {Object} itemRevObject the selected item revision object
 * @param {Object} participantObject the participant object that need to be replaced
 * @param {Object} participantType the participant type
 * @return {Object} Assignee that need to be reassigned
 */
export let getFromAssignee = function( itemRevObject, participantObject, participantType ) {
    var fromAssignee = null;

    if( participantObject ) {
        var participantObj = clientDataModel.getObject( participantObject.uid );
        fromAssignee = getFromAssigneeFromParticipant( participantObj );
    } else if( itemRevObject ) {
        fromAssignee = getFromAssigneeFromItemRevision( itemRevObject, participantType );
    }

    return fromAssignee;
};
export let getWsoList = function( selectedObject ) {
    var modelObject = null;
    if( selectedObject.props.fnd0StoreParticipantsOnJob && selectedObject.props.fnd0StoreParticipantsOnJob.dbValues[ 0 ] === "0" && selectedObject.props.root_target_attachments ) {
        modelObject = clientDataModel.getObject( selectedObject.props.root_target_attachments.dbValues[ 0 ] );
    } else {
        if( selectedObject.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
            var performSignoffmodelObject = clientDataModel.getObject( selectedObject.props.fnd0ParentTask.dbValues[ 0 ] );
            modelObject = clientDataModel.getObject( performSignoffmodelObject.props.parent_process.dbValues[ 0 ] );
        } else {
            modelObject = clientDataModel.getObject( selectedObject.props.parent_process.dbValues[ 0 ] );
        }
    }
    return {
        "uid": modelObject.uid,
        "type": modelObject.type
    };

};

export let getTaskParticipantsToremove = function( selectedObjects ) {
    var selectedPartcipants = [];
    var selected = {};
    for( var index = 0; index < selectedObjects.length; ++index ) {
        selected = {
            "uid": selectedObjects[ index ].uid,
            "type": selectedObjects[ index ].type
        };
        selectedPartcipants.push( selected );
    }
    return selectedPartcipants;
};

/**
 * This factory creates a service and returns exports
 *
 * @member AddParticipant
 */

export default exports = {
    getObjectsToLoad,
    getFromAssignee,
    getWsoList,
    getTaskParticipantsToremove
};
app.factory( 'Awp0ReplaceParticipant', () => exports );
