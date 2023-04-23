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
 * @module js/AddParticipant
 */
import * as app from 'app';
import soaSvc from 'soa/kernel/soaService';
import policySvc from 'soa/kernel/propertyPolicyService';
import messagingSvc from 'js/messagingService';
import cdm from 'soa/kernel/clientDataModel';
import awp0WrkflwUtils from 'js/Awp0WorkflowUtils';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the input data object that will be used in SOA
 * to add the respective participants
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 *
 * @return {Object} Input data object
 */
var _getParticipantInputData = function( data, ctx ) {
    var inputData = {};
    var input = [];

    // Check if selection is not null and 0th index object is also not null
    // then only add it to the view model
    if( data && data.selectedObjects ) {

        var selObjects = [];
        var objectUids = [];

        // Filter out the duplicate elements if being added any
        _.forEach( data.selectedObjects, function( object ) {
            if( objectUids.indexOf( object.uid ) === -1 ) {
                selObjects.push( object );
                objectUids.push( object.uid );
            }
        } );

        var selectedObject = ctx.workflow.selectedObject;
        var participantType = ctx.workflow.participantType;
        _.forEach( selObjects, function( object ) {

            // Check if object is selected then only create the input structure
            if( object.selected ) {
                var participantInputData = {
                    wso: {
                        type: selectedObject.type,
                        uid: selectedObject.uid
                    },
                    additionalData: {},
                    participantInputData: [ {
                        clientId: '',
                        assignee: {
                            type: object.type,
                            uid: object.uid
                        },
                        participantType: participantType
                    } ]
                };

                input.push( participantInputData );
            }
        } );

    }
    inputData.input = input;
    return inputData;
};

/**
 * Get the error message string from SOA response that will be displayed to user
 * @param {Object} response - The SOA response object
 *
 * @return {Object} Error message string
 */
var getErrorMessage = function( response ) {
    var err = null;
    var message = "";

    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( response && ( response.ServiceData.partialErrors || response.ServiceData.PartialErrors ) ) {
        err = soaSvc.createError( response.ServiceData );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.partialErrors ) {

        _.forEach( err.cause.partialErrors, function( partErr ) {

            if( partErr.errorValues ) {

                for( var idx = 0; idx < partErr.errorValues.length; idx++ ) {
                    var errVal = partErr.errorValues[ idx ];

                    if( errVal.code ) {
                        // Ignore the duplicate error and related error to that
                        if( errVal.code === 35010 ) {
                            break;
                        } else {
                            if( message && message.length > 0 ) {
                                message += '\n' + errVal.message;
                            } else {
                                message += errVal.message;
                            }
                        }
                    }
                }
            }
        } );
    }

    return message;
};

/**
 * This function checkes if user is trying to add participant type is required
 * then we need to refresh the whole page else we just need to refresh the table. Based on that it
 * will return true /false.
 *
 * @param {Object} ctx App context object
 * @param {Object} selectedObject Selected item revision from UI where participant need to be added
 * @param {String} participantType Particiapnt type user trying to add.
 *
 * @returns {boolean} True/False based on page need to be refresh or not.
 */
var _isRefreshParticipantTab = function( ctx, selectedObject, participantType ) {
    var isRefreshFlag = false;

    if( !selectedObject || !participantType ) {
        return isRefreshFlag;
    }

    // Do we need to refresh the whole page or not. If we are in participant page then we are refreshing
    // the whole page else we don't need it.
    if( ctx.xrtPageContext && ( ctx.xrtPageContext.primaryXrtPageID !== 'tc_xrt_Participants' &&
        ctx.xrtPageContext.secondaryXrtPageID !== 'tc_xrt_Participants') ) {
        return isRefreshFlag;
    }

    // Check if awp0RequiredParticipants is not null and it contains participant type i am trying to add then
    // we need to return true so that whole page will be refresh and required label will be shown
    // correctly else we just return false from here and individual table will get updated.
    var modelObject = cdm.getObject( selectedObject.uid );
    if( modelObject && modelObject.props && modelObject.props.awp0RequiredParticipants ) {
        var requiredParticipants = modelObject.props.awp0RequiredParticipants.dbValues;
        if( requiredParticipants && requiredParticipants.length > 0 && requiredParticipants.indexOf( participantType ) > -1 ) {
            isRefreshFlag = true;
        }
    }
    return isRefreshFlag;
};


/**
 * Add the participants to selected object and show respective error if any
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 */
var addParticipantsInternal = function( data, ctx ) {

    var inputData = null;
    if( data && data.selectedObj ) {
        inputData = _getParticipantInputData( data, ctx );
        //ensure the required objects are loaded
        var policyId = policySvc.register( {
            types: [
                {
                    name: 'Participant',
                    properties: [ {
                        name: 'assignee',
                        modifiers: [ {
                            name: 'withProperties',
                            Value: 'true'
                        } ]
                    } ]
                },
                {
                    name: 'ItemRevision',
                    properties: [ {
                        name: 'awp0RequiredParticipants'
                    } ]
                }
            ]
        } );
        var isRefreshFlag = false;
        // Check if whole page ned to refresh or individual table. This we are doing before making SOA call as
        // proeprty awp0RequiredParticipants value will be updated once add option is done.
        if( ctx.workflow && ctx.workflow.selectedObject && ctx.workflow.participantType ) {
            isRefreshFlag = _isRefreshParticipantTab( ctx, ctx.workflow.selectedObject, ctx.workflow.participantType );
        }

        // SOA call made to add the participant
        soaSvc.postUnchecked( 'Participant-2018-11-Participant', 'addParticipants', inputData ).then( function( response ) {

            if( policyId ) {
                policySvc.unregister( policyId );
            }

            // Check if panel is pinned then we need to refresh the location based on pinned value
            // else after operation is done then we need to close the panel
            var isPanelPinned = false;
            if( data.unpinnedToForm  && data.unpinnedToForm.dbValue ) {
                isPanelPinned = true;
            }

            if( response && response.ServiceData && response.ServiceData.updated ) {
                var updatedObjects = [ ctx.workflow.selectedObject ];
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: updatedObjects,
                    refreshLocationFlag: isRefreshFlag,
                    isPinnedFlag: isPanelPinned
                } );
            }

            // Check if panel is pinned then we don't need to fire this event otherwise panel will be closed.
            if( !isPanelPinned ) {
                eventBus.publish( 'complete', {
                    source: "toolAndInfoPanel"
                } );
            }

            // Reset the participant table only if visible.
            if( !isRefreshFlag && ctx.participantCtx && ctx.participantCtx.isParticipantTable) {
                eventBus.publish( 'workflow.resetParticipantTable' );
            }

            // Parse the SOA data to content the correct user or resource pool data
            var message = getErrorMessage( response );

            if( message && message.length > 0 ) {
                messagingSvc.showError( message );
            }
        } );
    }

};
/**
 * Add the participants to selected object and show respective error if any
 *
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - The application context object
 */
export let addParticipants = function( data, ctx ) {

    awp0WrkflwUtils.getValidObjectsToAdd( data, data.selectedObjects ).then( function( validObjects ) {
        data.selectedObjects = validObjects;
        addParticipantsInternal( data, ctx );
    } );
};

/**
 * This factory creates a service and returns exports
 *
 * @member AddParticipant
 */

export default exports = {
    addParticipants
};
app.factory( 'AddParticipant', () => exports );
