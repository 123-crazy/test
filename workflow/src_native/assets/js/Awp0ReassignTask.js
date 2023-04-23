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
 * @module js/Awp0ReassignTask
 */
import app from 'app';
import cdmSvc from 'soa/kernel/clientDataModel';
import awp0WrkflwUtils from 'js/Awp0WorkflowUtils';
import eventBus from 'js/eventBus';
import awp0InboxUtils from 'js/Awp0InboxUtils';
import Awp0TasksUtils from 'js/Awp0TasksUtils';
import _ from 'lodash';

/**
 * Define public API
 */
var exports = {};


/**
 * get the supporting object for reassign action. It can be a resource pool or user
 *
 * @param {object} - the selected Object
 * @param {data} - the data Object
 *
 */
function getSupportingObject( object, data ) {
    var supportingObject;
    var gmUID;
    //send groupmember for signoff.  for all other task types, send user
    if( data.selectedObjects !== null && data.selectedObjects.length > 0 ) {
        if( data.selectedObjects[ 0 ].type === 'GroupMember' && object.type !== 'Signoff' ) {
            if( data.selectedObjects[ 0 ].props.user !== null ) {
                gmUID = data.selectedObjects[ 0 ].props.user.dbValues[ 0 ];
                if( gmUID !== null ) {
                    supportingObject = cdmSvc.getObject( gmUID );
                }
            }
        } else {
            gmUID = data.selectedObjects[ 0 ].uid;
            supportingObject = cdmSvc.getObject( gmUID );
        }
    }

    return supportingObject;
}

/**
 * Get the property name and value map that needs to be saved when user do reassign action.
 * To set
 *
 * @param {Object} data - the data Object
 *
 * @returns {Object} Property name and values object that need to be saved
 */
var _getPropertyNameValues = function( data ) {
    var propertyNameValues = {};
    // Check if comment proeprty value is not null then only add it
    // to property name value. It will end when user enter comment as empty string
    // or any value
    if( data.comments && data.comments.dbValue !== null ) {
        propertyNameValues.comments = [ data.comments.dbValue ];
    }
    // Check if release is Tc 13.1 or more then we need to check for project as well
    // and if selcted group member or resource pool comes from project then we need to
    // set it to map as well.
    if( awp0InboxUtils.isTCReleaseAtLeast131() ) {
        var projectReassignObject = _.filter( data.selectedObjects, function( selObject ) {
            return selObject.projectObject;
        } );

        if( projectReassignObject && projectReassignObject[ 0 ] && projectReassignObject[ 0 ].projectObject && projectReassignObject[ 0 ].projectObject.uid ) {
            propertyNameValues.fnd0AssigneeOrigin = [ projectReassignObject[ 0 ].projectObject.uid ];
        } else if( data.selectedObjects && data.selectedObjects[ 0 ] && data.selectedObjects[ 0 ].modelType
            && data.selectedObjects[ 0 ].modelType.typeHierarchyArray.indexOf( 'ResourcePool' ) > -1 ) {
            // Check if selected object is not null and it's a resource pool object then we need to set
            // assignee origin as resource pool so pass it from here.
            propertyNameValues.fnd0AssigneeOrigin = [ data.selectedObjects[ 0 ].uid ];
        }
    }

    return propertyNameValues;
};

/**
 * Get the input data object that will be used in SOA to reassign the tasks
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx} ctx - The application context object
 *
 * @return {Object} Input data object
 */
export let getInputData = function( data, ctx ) {
    var reassignInput = [];

    if( ctx && ctx.mselected !== null ) {
        _.forEach( ctx.mselected, function( object ) {
            var supportingObject = getSupportingObject( object, data );
            var propertyNameValues = _getPropertyNameValues( data );
            var reassignInputInt = {

                actionableObject: {
                    uid: object.uid,
                    type: object.type
                },
                action: 'SOA_EPM_assign_action',
                password: '',
                supportingValue: '',
                supportingObject: supportingObject,
                propertyNameValues: propertyNameValues
            };

            reassignInput.push( reassignInputInt );
        } );
    }

    return reassignInput;
};

/**
 * get the supporting object for reassign action. It can be a resource pool or user
 *
 * @param {data} - the selected Object
 * @param {ctx} - the data Object
 *
 */
export let reassignUser = function( data ) {
    if( data.selectedObjects[ 0 ].type === 'User' ) {
        awp0WrkflwUtils.getValidObjectsToAdd( data, data.selectedObjects ).then( function( validObjects ) {
            data.selectedObjects = validObjects;
            eventBus.publish( 'Awp0ReassignTaskViewModel.reassignTask', {} );
        } );
    } else {
        eventBus.publish( 'Awp0ReassignTaskViewModel.reassignTask', {} );
    }
};

/**
 * This method will return the group for the origin.
 */
var loadOriginGroup = function( origin, group ) {
    if( origin.props.group && origin.props.group.dbValues ) {
        var groupObject = cdmSvc.getObject( origin.props.group.dbValues[ 0 ] );
        if( groupObject && groupObject.props.object_full_name && groupObject.props.object_full_name.dbValues ) {
            group = groupObject.props.object_full_name.dbValues[ 0 ];
        }
    }
    return group;
};

/**
 * This method will return the role for the origin.
 */
var loadOriginRole = function( origin, role ) {
    if( origin.props.role && origin.props.role.dbValues ) {
        var roleObject = cdmSvc.getObject( origin.props.role.dbValues[ 0 ] );
        if( roleObject && roleObject.props.role_name && roleObject.props.role_name.dbValues ) {
            role = roleObject.props.role_name.dbValues[ 0 ];
        }
    }
    return role;
};

/**
 * This method will return the searchSubGroup for the origin.
 */
var loadOriginSearchSubGroup = function( origin, searchSubGroup ) {
    if( origin.props.allow_subgroups && origin.props.allow_subgroups.dbValues ) {
        var allowSubGroupDBValue = origin.props.allow_subgroups.dbValues[ 0 ];
        if( allowSubGroupDBValue && ( allowSubGroupDBValue === '0' || allowSubGroupDBValue === 'false' ) ) {
            searchSubGroup = 'false';
        }
    }
    return searchSubGroup;
};

/**
 * Get the group and role from the profile associated with the selected signoff.
 *
 * @param {Object} modelObject - The model object for property needs to be populated
 *
 */
var populateAdditionalSearchCriteria = function( modelObject, data, ctx  ) {
    var additionalSearchCriteria = {};
    var profileObj = null;
    // Get the additional search criteria based on origin prooeprty value and if origin present
    // then populate the criteria from origin itself.
    if( modelObject && modelObject.props.origin && modelObject.props.origin.dbValues
        && modelObject.props.origin.dbValues[ 0 ] ) {
        var origin = cdmSvc.getObject( modelObject.props.origin.dbValues[ 0 ] );

        // Get the profile object from origin and get the additional search criteria
        if( origin ) {
            profileObj = Awp0TasksUtils.getSignoffProfileObject( origin, data );
        }
    }

    // Check if profile object is not null and it contains additional criteria then get that
    // additional criteria from profile object and set the profile object on workflow context
    // and return the additional search criteria.
    if( profileObj && profileObj.additionalSearchCriteria ) {
        additionalSearchCriteria = _.clone( profileObj.additionalSearchCriteria );
        if( !ctx.workflow ) {
            ctx.workflow = {
                loadProjectData : true
            };
        }
        ctx.workflow.profileObject = profileObj;
    }

    return additionalSearchCriteria;
};

/**
 * Populate the panel data based on selection and add the additional search criteria so that duplicate reviewer will
 * be avoided.
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx} Object - The application context object
 */
export let populatePanelData = function( data, ctx ) {
    // Populate the additional search criterai only in case of one selection and selected object is signoff
    if( ctx && ctx.mselected !== null && ctx.mselected.length === 1 && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {
        data.additionalSearchCriteria = populateAdditionalSearchCriteria( cdmSvc.getObject( ctx.selected.uid ), data, ctx );
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0ReassignTask
 */

export default exports = {
    getInputData,
    reassignUser,
    populatePanelData
};
app.factory( 'Awp0ReassignTask', () => exports );
