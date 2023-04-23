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
 * @module js/Awp0ReplaceMultipleParticipants
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import messagingSvc from 'js/messagingService';
import listBoxService from 'js/listBoxService';
import appCtxSvc from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import soaService from 'soa/kernel/soaService';
import dmSvc from 'soa/dataManagementService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * Populate the panel data based on selection
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let populatePanelData = function( data ) {
    data.activeView = "Awp0ReplaceMultipleParticipantsSub";
    data.isAddButtonVisible = true;

};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: "",
        propInternalValue: "",
        propDisplayDescription: "",
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * Populate the Participant property on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selectedObjects - the current selected objects
 *
 */
export let openReassignMultipleParticipantsPanel = function( data, selectedObjects ) {
    if( selectedObjects && selectedObjects.length > 0 ) {
        var allObjectUid = [];
        for( var i = 0; i < selectedObjects.length; ++i ) {
            allObjectUid.push( selectedObjects[ i ].uid );
        }

        dmSvc.getProperties( allObjectUid, [ 'assignable_participant_types' ] ).then( function() {
            exports.populateParticipantTypes( data, selectedObjects );
        } );
    }

};

/**
 * Populate the Participant property on the panel.
 *
 * @param {object} data - the data Object
 * @param {object} selectedObjects - the current selected objects
 *
 */
export let populateParticipantTypes = function( data, selectedObjects ) {

    var firstSelection = null;
    data.participantTypesList = null;
    var localCommonParticipantTypes = null;

    if( selectedObjects && selectedObjects.length > 0 ) {

        firstSelection = cdm.getObject( selectedObjects[ 0 ].uid );

        if( firstSelection && firstSelection.props && firstSelection.props.assignable_participant_types ) {
            localCommonParticipantTypes = firstSelection.props.assignable_participant_types.dbValues;
        }

        _.forEach( selectedObjects, function( selection ) {

            var object = cdm.getObject( selection.uid );
            if( object && object.props && object.props.assignable_participant_types &&
                object.props.assignable_participant_types.dbValues ) {
                var participantTypes = object.props.assignable_participant_types.dbValues;
                if( participantTypes ) {
                    localCommonParticipantTypes = _.intersection( localCommonParticipantTypes, participantTypes );
                }
            }

        } );

        var commonParticipantTypes = [];
        var commonDispTypeNames = [];

        _.forEach( localCommonParticipantTypes, function( typeName ) {
            var type = cmm.extractTypeNameFromUID( typeName );
            var participantObject = cdm.getObject( typeName );
            if( type && participantObject && participantObject.props.object_string ) {

                var typeDispName = participantObject.props.object_string.uiValues[ 0 ];
                var object = {};
                object.key = typeDispName;
                commonDispTypeNames.push( type );
                object.value = [ type ];
                commonParticipantTypes.push( object );

            }
        } );

        var allObject = {};
        allObject.key = data.i18n.All;
        allObject.value = commonDispTypeNames;

        commonParticipantTypes.splice( 0, 0, allObject );
        data.commonParticipantTypes = commonParticipantTypes;

        var participantListModelArray = [];

        // Check if the common partcipant types are not null and have some element then
        // iterate for each element to create the list model object
        if( commonParticipantTypes.length > 0 ) {

            // Iterate for each object object
            _.forEach( commonParticipantTypes, function( participant ) {
                var listModelObject = _getEmptyListModel();

                listModelObject.propDisplayValue = participant.key;

                listModelObject.propInternalValue = participant.value;
                participantListModelArray.push( participant.key );

            } );

        }

        // Assign the participant types list that will be shown on UI
        data.participantTypesList = listBoxService.createListModelObjectsFromStrings( participantListModelArray );
    }
};

export let getParticipantTypes = function( selectedType, data ) {
    var values = [];

    if( selectedType && data.commonParticipantTypes ) {

        for( var idx = 0; idx < data.commonParticipantTypes.length; idx++ ) {
            var participant = data.commonParticipantTypes[ idx ];
            if( participant && participant.key === selectedType ) {
                values = participant.value;
                break;
            }

        }
    }
    return values;
};

/**
 * Get the error message string based on input object
 *
 * @param {input} input - SOA response
 */
var getErrorMessageString = function( input ) {
    var message = "";
    var err = null;
    // Check if input response is not null and contains partial errors then only
    // create the error object
    if( input && ( input.partialErrors || input.PartialErrors ) ) {
        err = soaService.createError( input );
    }

    // Check if error object is not null and has partial errors then iterate for each error code
    // and filter out the errors which we don't want to display to user
    if( err && err.cause && err.cause.partialErrors ) {
        _.forEach( err.cause.partialErrors, function( partErr ) {
            if( partErr.errorValues ) {
                _.forEach( partErr.errorValues, function( errVal ) {
                    if( errVal.code ) {
                        if( message && message.length > 0 ) {
                            message += '\n' + errVal.message;
                        } else {
                            message += errVal.message + '\n';
                        }
                    }
                } );
            }
        } );
    }
    return message;
};

/**
 * Populate the error message based on the SOA response output and filters the partial errors and shows the correct
 * errors only to the user.
 *
 * @param {data} data - declarative view modal
 * @param {selections} selections - selected objects
 * @param {input} input - SOA response
 */
export let generateNotificationsToUser = function( data, selections, input ) {

    var message = "";
    var updatedModelObjects = [];
    var selectedObjs = [];
    var isReloadNeeded = false;
    var updatedObjectsCount = 0;
    var failedCount = 0;

    updatedModelObjects = input.updated;

    _.forEach( selections, function( selection ) {

        selectedObjs.push( selection.uid );
    } );
    if( updatedModelObjects ) {

        var updatedSelectedObjs = _.intersection( updatedModelObjects, selectedObjs );

        if( updatedSelectedObjs && updatedSelectedObjs.length > 0 ) {
            updatedObjectsCount = updatedSelectedObjs.length;
            isReloadNeeded = true;
        }

        if( updatedObjectsCount === 1 && updatedSelectedObjs && updatedSelectedObjs.length > 0 ) {

            data.updatedSelObjsname = cdm.getObject( updatedSelectedObjs[ 0 ] ).props.object_string;
            message += data.i18n.oneSelectedSuccess;

            messagingSvc.reportNotyMessage( data, data._internal.messages, "oneSelectedSuccess" );
        }
    }

    if( data.output.reassignParticipantOutput && data.output.reassignParticipantOutput.failedItemRevs ) {
        var failedObjs = data.output.reassignParticipantOutput.failedItemRevs;

        if( failedObjs && failedObjs.length > 0 ) {
            failedCount = failedObjs.length;
        }

    }

    if( failedCount === 1 ) {

        data.failedSelObjsname = cdm.getObject( failedObjs[ 0 ] ).props.object_string;
        message += data.i18n.oneSelectedFailure;

        messagingSvc.reportNotyMessage( data, data._internal.messages, "oneSelectedFailure" );
    }
    if( ( updatedObjectsCount > 1 ) || ( failedCount > 1 ) ) {
        if( updatedObjectsCount > 1 ) {

            data.updatedCount = updatedObjectsCount;
            data.selectedCount = selections.length;
            messagingSvc.reportNotyMessage( data, data._internal.messages, "moreThanOneSuccess" );
        }

        // Get the error message string from SOA output structure
        message = getErrorMessageString( input );

        if( message && message.length > 0 ) {
            messagingSvc.showError( message );
        }
    }

    // Close Panel
    var eventData = {
        source: "toolAndInfoPanel"
    };

    eventBus.publish( "complete", eventData );
    eventBus.publish( 'ReassignParticipants.unRegisterCtx' );

    // Check if boolean value is true that means reassign action got completed successfully. SO if sub location is change location
    // then we should reload the location to see correct set of results. Fix for defect # D-31013.
    if( isReloadNeeded ) {
        var locationContext = appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:Location' );

        if( locationContext && locationContext === 'com.siemens.splm.client.change:changesLocation' ) {
            //Reload the primary work area data
            eventBus.publish( 'primaryWorkarea.reset' );
        }
    }
};

/*******************************************************************************************************************
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer will
 * be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let addSelectedUsers = function( data ) {
    data.isAddButtonVisible = true;
    var dataProvider = null;
    var selectedObjects = null;

    if( data.selectedObjects && data.selectedObjects[ 0 ] ) {
        data.selectedObjects[ 0 ].selected = false;
    }

    if( data.isFromSectionSelected ) {
        data.fromUsers = [];
        data.fromUsers = data.selectedObjects;
        dataProvider = data.dataProviders.fromUser;
        selectedObjects = data.fromUsers;
    } else {
        data.toUsers = [];
        data.toUsers = data.selectedObjects;
        dataProvider = data.dataProviders.toUser;
        selectedObjects = data.toUsers;
    }

    if( dataProvider && selectedObjects ) {

        //update data provider
        dataProvider.update( selectedObjects, selectedObjects.length );

        //clear selection
        dataProvider.selectNone();

    }

};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer will
 * be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} isFromSectionSelected - the current selection object
 */
export let openUserPanel = function( data, isFromSectionSelected ) {
    data.isFromSectionSelected = isFromSectionSelected;
    var panelTitle = data.i18n.assignFrom;

    if( !isFromSectionSelected ) {
        panelTitle = data.i18n.assignTo;
    }

    var context = {
        destPanelId: 'Users',
        title: panelTitle,
        recreatePanel: true,
        supportGoBack: true
    };

    eventBus.publish( "awPanel.navigate", context );

};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0ReplaceMultipleParticipants
 */

export default exports = {
    populatePanelData,
    openReassignMultipleParticipantsPanel,
    populateParticipantTypes,
    getParticipantTypes,
    generateNotificationsToUser,
    addSelectedUsers,
    openUserPanel
};
app.factory( 'Awp0ReplaceMultipleParticipants', () => exports );
