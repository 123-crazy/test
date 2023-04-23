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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0CreateProcessAssignment
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import listBoxService from 'js/listBoxService';
import cdm from 'soa/kernel/clientDataModel';
import workflowAssinmentUtilSvc from 'js/Awp0WorkflowAssignmentUtils';
import _ from 'lodash';

var exports = {};

/**
 * Filter out the workflow template that are configured for using the participant.
 *
 * @param {Array} templatesObjects Workflow templates that need to be filtered
 *
 * @returns {Array} Filtered template objects
 */
var _getFilteredWorkflowTemplates = function( templatesObjects ) {
    var filterTemplates = [];
    var isAtleastTC131Release = workflowAssinmentUtilSvc.isTCReleaseAtLeast131(  appCtxSvc.ctx );
    if( isAtleastTC131Release ) {
        return templatesObjects;
    }
    // Iterate for each template objects and populate the template description
    // that will be shown on panel
    _.forEach( templatesObjects, function( templateObject ) {
        var optionalParticipants = templateObject.props.fnd0OptionalParticipants.dbValues;
        var requiredParticipants = templateObject.props.fnd0RequiredParticipants.dbValues;
        if( _.isEmpty( optionalParticipants ) && _.isEmpty( requiredParticipants ) ) {
            filterTemplates.push( templateObject );
        }
    } );
    return filterTemplates;
};

/**
 * Populate the create assignment list panel to populate all available
 * templates.
 *
 * @param {Object} data object
 * @return {Object} All available workflow template objects
 */
export let populatePanelData = function( data ) {
    var templatesObjects = data.allTemplates;

    if( templatesObjects && templatesObjects.length > 0 ) {
        var filterTemplates = _getFilteredWorkflowTemplates( templatesObjects );
        // Create the list model object that will be displayed
        templatesObjects = listBoxService.createListModelObjects( filterTemplates, 'props.template_name' );
        var templatesObject = templatesObjects[ 0 ];
        var isFnd0InstructionsAvailable = false;

        //Check if fnd0Instructions property is available.
        //If available use fnd0Instructions property as description
        if( templatesObject && templatesObject.propInternalValue && templatesObject.propInternalValue.props.fnd0Instructions ) {
            isFnd0InstructionsAvailable = true;
        }

        // Iterate for each template objects and populate the template description
        // that will be shown on panel
        _.forEach( templatesObjects, function( templateObject ) {
            var descValue = templateObject.propInternalValue.props.object_desc.uiValues[ 0 ];
            if( isFnd0InstructionsAvailable ) {
                descValue = templateObject.propInternalValue.props.fnd0Instructions.uiValues[ 0 ];
            }
            templateObject.propDisplayDescription = descValue;
        } );
    }
    data.workflowTemplates.dbValue = '';
    data.workflowTemplates.uiValue = '';

    // Select the default selected process name
    if( templatesObjects && templatesObjects.length > 0 && templatesObjects[ 0 ] ) {
        data.workflowTemplates.dbValue = templatesObjects[ 0 ];
        data.workflowTemplates.uiValue = templatesObjects[ 0 ].propDisplayValue;
    }

    data.templates = templatesObjects;
    return templatesObjects;
};

/**
 * Return the object array that need to be loaded.
 *
 * @param {Object} selTemplate Selected workflow template selected from UI
 * @param {Object} groupMember Group member whose proeprty need to be loaded
 * @return {Array} objectToLoad Object array
 */
export let getObjectsToLoad = function( selTemplate, groupMember ) {
    var objectToLoad = [];
    objectToLoad.push( selTemplate );
    if( groupMember ) {
        var groupMemberObject = cdm.getObject( groupMember );
        if( groupMemberObject ) {
            objectToLoad.push( groupMemberObject );
        }
    }
    return objectToLoad;
};

/**
 * To check if logged in user is DBA group user or current logged in user
 * is group admin for specific group. Based on those validation return true/false.
 *
 * @return {boolean} True/False
 */
var _isPriviledgeUser = function() {
    var isGroupAdmin = false;
    var groupName = appCtxSvc.ctx.userSession.props.group_name.dbValue;
    var groupMember = appCtxSvc.ctx.userSession.props.fnd0groupmember.dbValue;
    var groupMemberObject = cdm.getObject( groupMember );
    // Check if group member obejct is not null and ga property is not 0.
    if( groupMemberObject && groupMemberObject.props.ga && groupMemberObject.props.ga.dbValues ) {
        isGroupAdmin = parseInt( groupMemberObject.props.ga.dbValues[ 0 ] ) !== 0;
    }

    if( isGroupAdmin || groupName === 'dba' ) {
        return true;
    }
    return false;
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * Populate the existing assignment list for specific selected template
 *
 * @param {Object} data object
 * @param {Object} selectedTemplate object from panel
 */
export let populateAssignmentList = function( data, selectedTemplate ) {
    data.assignments = [];
    if( selectedTemplate ) {
        selectedTemplate = cdm.getObject( selectedTemplate.uid );
        var processAssignmentListObj = [];

        // Check if assignment list on selected template is not null then only go further
        // to populate the assignment list for template
        if( selectedTemplate && selectedTemplate.props.assignment_lists && selectedTemplate.props.assignment_lists.dbValues &&
            selectedTemplate.props.assignment_lists.dbValues.length > 0 ) {
            var assingmentListDBValues = selectedTemplate.props.assignment_lists.dbValues;
            _.forEach( assingmentListDBValues, function( assingmentListDBValue ) {
                processAssignmentListObj.push( cdm.getObject( assingmentListDBValue ) );
            } );

            // Add the default PAL to list with None interanl and dispaly value.
            var emptyProjectListModel = _getEmptyListModel();
            emptyProjectListModel.propDisplayValue = data.i18n.none;
            emptyProjectListModel.propInternalValue = 'None';
            data.assignments.push( emptyProjectListModel );
            if( processAssignmentListObj.length > 0 ) {
                var palsList = listBoxService.createListModelObjects( processAssignmentListObj, 'props.object_string' );
                data.assignments = data.assignments.concat( palsList );
            }
        }

        // Check for value is user is priviledge user for create assignment or not
        if( !data.isPrivilegeUser ) {
            data.isPrivilegeUser = _isPriviledgeUser();
        }
    }
};

export default exports = {
    populatePanelData,
    getObjectsToLoad,
    populateAssignmentList
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServices
 * @member Awp0CreateProcessAssignment
 */
app.factory( 'Awp0CreateProcessAssignment', () => exports );
