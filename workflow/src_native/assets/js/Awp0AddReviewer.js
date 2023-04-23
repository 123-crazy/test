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
 * @module js/Awp0AddReviewer
 */
import app from 'app';
import awInboxService from 'js/aw.inbox.service';
import appCtxSvc from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import awp0WrkflwUtils from 'js/Awp0WorkflowUtils';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the from participant based on input participant object
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} contentType - The content type for panel will be populated
 * @param {Object} selection - The model object for property needs to be populated
 *
 */
var populateAdditionalSearchCriteria = function( data, contentType, selection ) {
    data.additionalSearchCriteria = {};
    if( data && selection && selection.uid ) {

        // Get the valid EPM task for selection. If selected object is signoff then get
        // the parent task and use it other wise use the selection
        data.validEPMTask = awInboxService.getValidEPMTaskObject( selection.uid );

        // Check for content type is users and valid EPM task is not null then  only add the additional criteria
        if( contentType === "Users" && data.validEPMTask ) {
            var additionalSearchCriteria = {
                "Awp0AddReviewer": data.validEPMTask.uid
            };

            // Add the additional search criteria on the scope so that it can be consume while generating the SOA input
            data.additionalSearchCriteria = additionalSearchCriteria;
        }
    }
};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer will
 * be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} selection - the current selection object
 */
export let populatePanelData = function( data, selection ) {
    populateAdditionalSearchCriteria( data, "Users", selection );
};

/**
 * On Tab Selection change, add the additional search criteria. In case of user tab, then only add the additional
 * search criteria to filter the duplicate
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {object} selection - the current selection object
 */
export let addAddiitonalSearchCriteria = function( data, selection ) {
    var contentType = null;
    // Check if data is not null and selected tab is true then only set
    // the selected object to null always if user selected some object earlier before tab selection
    if( data && data.selectedTab && data.selectedTab.resourceProviderContentType ) {
        contentType = data.selectedTab.resourceProviderContentType;
    }

    populateAdditionalSearchCriteria( data, contentType, selection );
};

/**
 * Get the valid selected objects from input selection and then create the valid SOA input structure
 * to add the additional signoff.
 *
 * @param {object} data - the data Object
 * @param {object} selection - the current selection object
 *
 */
export let addReviewers = function( data, selection ) {

    if( !data || !selection ) {
        return;
    }
    awp0WrkflwUtils.getValidObjectsToAdd( data, selection ).then( function( validObjects ) {
        data.selectedObjects = validObjects;
        eventBus.publish( "Awp0AddReviewerViewModel.addSignoffs" );
    } );

};

/**
 * This method will update the context that needed for Add reviewer command and open the panel.
 *
 * @param {object} modelObject - the Object for command needs to open
 */
var _updateAddReviewerContext = function( modelObject ) {
    var context = {
        "selectedObject": modelObject,
        "loadProjectData": true,
        "selectionModelMode": "multiple"
    };

    appCtxSvc.registerCtx( 'workflow', context );
    commandPanelService.activateCommandPanel( 'Awp0AddReviewer', 'aw_toolsAndInfo' );
};

/**
 * This method will check for fnd0ParentTask proeprty is not null for input model object.
 *
 * @param {object} modelObject - the Object for property need to check
 *
 * @return {boolean} True or false based on property value is loaded or not
 */
var _isParentTaskPropLoaded = function( modelObject ) {

    // Check for input model object is not null and parent task proeprty is loaded then only return true
    // else return false
    if( modelObject && modelObject.props.fnd0ParentTask && modelObject.props.fnd0ParentTask.dbValues ) {
        return true;
    }
    return false;
};

/**
 * Get the valid selection that need to be used to add the signoff and refresh furhter
 *
 * @param {object} ctx - the ctx Object
 *
 */
export let setContextVariableForAddReviewer = function( ctx ) {

    // Check if ctx is undefined then return from here
    if( !ctx ) {
        return;
    }

    var activeCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( activeCommand && activeCommand.commandId === 'Awp0AddReviewer' ) {
        commandPanelService.activateCommandPanel( 'Awp0AddReviewer', 'aw_toolsAndInfo' );
        return;
    }

    var validSelection = ctx.selected;

    // Check if parent selection is present then use that as valid selection
    if( ctx.pselected ) {
        validSelection = ctx.pselected;
    }

    // Check for selection is of type signoff and check it's parent task property is loaded
    // or not. If property is not loaded then load the property and bring the panel otherwise
    // bring the panel
    if( validSelection && ( validSelection.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) &&
        !_isParentTaskPropLoaded() ) {

        dmSvc.getPropertiesUnchecked( [ validSelection ], [ 'fnd0ParentTask' ] ).then( function() {
            var modelObject = cdm.getObject( validSelection.uid );
            _updateAddReviewerContext( modelObject );
        } );
        return;

    }
    _updateAddReviewerContext( validSelection );
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0AddReviewer
 */

export default exports = {
    populatePanelData,
    addAddiitonalSearchCriteria,
    addReviewers,
    setContextVariableForAddReviewer
};
app.factory( 'Awp0AddReviewer', () => exports );
