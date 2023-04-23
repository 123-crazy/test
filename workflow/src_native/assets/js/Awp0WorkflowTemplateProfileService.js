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
 * This implements the template signoff profile functionalities.
 *
 * @module js/Awp0WorkflowTemplateProfileService
 */
import * as app from 'app';
import clientDataModel from 'soa/kernel/clientDataModel';
import wrkflwUtils from 'js/Awp0WorkflowUtils';
import Awp0WorkflowDesignerUtils from 'js/Awp0WorkflowDesignerUtils';

var exports = {};

/**
 * Populate the value and update the widget value with respective value.
 *
 * @param {Object} modelObject Selected Model object
 * @param {String} propName Property name whose value needs to be fetched
 * @param {Object} propDispObject Property widget where value needs to be populated
 * @param {boolean} isBoolean True/False, True will only be for boolean property
 * @param {boolean} isEditable True/False, True when value needs to be in edit or not
 * @param {String} defaultDispValue Default property value
 */
var _populatePropValue = function( modelObject, propName, propDispObject, isBoolean, isEditable, defaultDispValue ) {
    var dbValue = '';
    var uiValue = '';
    if( modelObject && propName && modelObject.props[ propName ] ) {
        var propObject = modelObject.props[ propName ];
        if( propObject && propObject.dbValues && propObject.dbValues[ 0 ] ) {
            dbValue = propObject.dbValues[ 0 ];

            if( isBoolean ) {
                dbValue = dbValue === '1';
            }
        }

        if( propObject && propObject.uiValues && propObject.uiValues[ 0 ] ) {
            uiValue = propObject.uiValues[ 0 ];
        }
        // Check if default display value is not null that means we are trying to populate
        // group and role UI widgets so get the actual modle object based on DB value and set it
        // on the proerpty object.
        if( defaultDispValue ) {
            dbValue = clientDataModel.getObject( dbValue );
        }
        // Check if dbValue is not valid then set the dbValue to * as default value and set the
        // UI value as input default display value
        if( !dbValue ) {
            dbValue = '*';
        }
        if( dbValue === '*' && defaultDispValue ) {
            uiValue = defaultDispValue;
        }
    }
    propDispObject.dbValue = dbValue;
    propDispObject.uiValue = uiValue;
    propDispObject.isEditable = isEditable;
    propDispObject.isEnabled = isEditable;
    propDispObject.parentUid = modelObject.uid;
    propDispObject.propInternalName = propName;
};

/**
 * Populate the profile UI with all values present on profile obejct.
 * @param {Object} data view model Object
 * @param {Object} profileObject Selected profile object from UI.
 * @param {Object} ctx Context object.
 */
export let populateProfilePanelData = function( data, profileObject, ctx ) {
    // Get the tempalte is in edit mode or not and based on that populate the panel.
    var isPanelEditable = Awp0WorkflowDesignerUtils.isTemplateEditMode( ctx.xrtSummaryContextObject, ctx );
    data.isPanelEditable = isPanelEditable;

    // Check if any one widget is not defined then no need to process further and return from here
    if( !data.allGroups || !data.allRoles ) {
        return;
    }
    wrkflwUtils.populateGroupLOV( data, data.allGroups );
    wrkflwUtils.populateRoleLOV( data, data.allRoles );

    var defaultGroupValue = data.i18n.allGroups;
    var defaultRoleValue = data.i18n.allRoles;

    _populatePropValue( profileObject, 'group', data.allGroups, false, isPanelEditable, defaultGroupValue );
    if( data.allGroups.dbValue && data.allGroups.dbValue.uid && data.allGroups.dbValue.props && data.allGroups.dbValue.props.object_full_name ) {
        data.groupName = data.allGroups.dbValue.props.object_full_name.dbValues[ 0 ];
    }
    _populatePropValue( profileObject, 'role', data.allRoles, false, isPanelEditable, defaultRoleValue );
    if( data.allRoles.dbValue && data.allRoles.dbValue.uid && data.allRoles.dbValue.props && data.allRoles.dbValue.props.role_name ) {
        data.roleName = data.allRoles.dbValue.props.role_name.dbValues[ 0 ];
    }
    _populatePropValue( profileObject, 'allow_subgroups', data.allowSubGroupMembers, true, isPanelEditable );
    _populatePropValue( profileObject, 'number_of_signoffs', data.numberOfReviewers, false, isPanelEditable );
};

/**
 * Reset the role property when user changed the group UI field.
 * @param {Object} data Data view model object
 * @param {Object} groupProp Group UI widget from UI
 * @param {Object} roleProp Role UI widget from UI.
 * @param {Object} changedProp Changed widget object from UI.
 */
export let resetGroupRoleValue = function( data, groupProp, roleProp, changedProp ) {
    // Check if user has changed the group then set the role to default value
    if( changedProp === groupProp ) {
        roleProp.dbValue = data.i18n.allRoles;
        roleProp.uiValue = data.i18n.allRoles;
        // This is needed so that all groups can be shown in group LOV.
        data.roleName = null;
    }
};

/**
 * Create profile input structure and set it on data object
 * @param {Object} data Data view model object
 * @param {Object} selectedTemplate Selected template object from UI.
 *
 */
var _createProfileInputStructure = function( data, selectedTemplate ) {
    if( !data || !selectedTemplate ) {
        return;
    }
    var input = [];
    // Get the Template Uid that where profile need to be created. If template uid is null then no need to process further
    var templateUid = Awp0WorkflowDesignerUtils.getValidTemplateObjectUid( selectedTemplate, 'EPMSelectSignoffTaskTemplate' );
    var updateAdditionalData = {};
    if( !templateUid ) {
        return;
    }

    // Get the group and role values and if values are valid then only add it to
    // additional data and add other properties values to additional data
    var groupValue = data.allGroups.dbValue;
    var roleValue = data.allRoles.dbValue;

    updateAdditionalData.template_profiles_num_reviewers = [ data.numberOfReviewers.dbValue.toString() ];
    updateAdditionalData.template_profiles_allow_sub_groups = [ data.allowSubGroupMembers.dbValue.toString() ];
    updateAdditionalData.template_profile_quorum = [ '-1' ];
    if( groupValue && groupValue.uid ) {
        updateAdditionalData.template_profile_groups = [ groupValue.uid ];
    } else {
        updateAdditionalData.template_profile_groups = [ '*' ];
    }

    if( roleValue && roleValue.uid ) {
        updateAdditionalData.template_profile_roles = [ roleValue.uid ];
    } else {
        updateAdditionalData.template_profile_roles = [ '*' ];
    }

    var createObject = {
        clientID: 'createProfile -' + selectedTemplate.uid,
        templateToUpdate: templateUid,
        additionalData: updateAdditionalData
    };
    input.push( createObject );
    if( input && input.length > 0 ) {
        data.createProfileInputData = input;
    }
};

/**
 * Set the update profile input structure on data object that will be used to update
 * the profile object
 * Update profile input structure
 * @param {Object} data Data view model object
 */
var _updateProfileInputStructure = function( data ) {
    var propVector = [];
    if( data.numberOfReviewers && data.numberOfReviewers.valueUpdated ) {
        var reviewer = {
            name: 'number_of_signoffs',
            values: [ data.numberOfReviewers.dbValue.toString() ]
        };
        propVector.push( reviewer );
    }
    if( data.allowSubGroupMembers && data.allowSubGroupMembers.valueUpdated ) {
        var allowSubgroups = {
            name: 'allow_subgroups',
            values: [ data.allowSubGroupMembers.dbValue.toString() ]
        };
        propVector.push( allowSubgroups );
    }
    if( propVector && propVector.length > 0 ) {
        data.updateProfileInputVector = propVector;
    }
};

/**
 * Either create the new profile and delete the selected profile or else update the profile. So based
 * on user selected option create the input structure and set it on data object
 * @param {Object} data view model Object
 * @param {Object} selectedTemplate Selected template object from UI.
 *
 */
export let createOrUpdateProfile = function( data, selectedTemplate ) {
    // Check if user has updated the group or role fields from UI that means we need to delete
    // the existing profile and create new profile.
    if( data.allGroups && data.allGroups.valueUpdated || data.allRoles && data.allRoles.valueUpdated ) {
        _createProfileInputStructure( data, selectedTemplate );
        return;
    }
    _updateProfileInputStructure( data );
};

export default exports = {
    populateProfilePanelData,
    resetGroupRoleValue,
    createOrUpdateProfile
};
/**
 * Define signoff profile methods
 *
 * @memberof NgServices
 * @member Awp0WorkflowTemplateProfileService
 */
app.factory( 'Awp0WorkflowTemplateProfileService', () => exports );
