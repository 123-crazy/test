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
 * @module js/updateProjectMembersDetails
 */
import app from 'app';
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';

 var exports = {};

 /**
  * Remove the selected group and group members to selected Project
  * @param {object} uwDataProvider data provider
  * @param {Object} context context
  */
export let removeSelectedMembers = function( uwDataProvider, context , data ) {

    var inputs = [];
    var gms = [];
    var groups = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoles = [];
    var i;

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === "Group" ) {
            groups[ groupCount ] = uwDataProvider.selectedObjects[ i ].grp;
            groupCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === "Role" ) {
            groupRoles[ roleCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].grp,
                tcRole: uwDataProvider.selectedObjects[ i ].role,
                isRemovable: uwDataProvider.selectedObjects[ i ].isRemovable
            };
            roleCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === "User" ) {
            var currGroupMember = {
                type: uwDataProvider.selectedObjects[ i ].type,
                uid: uwDataProvider.selectedObjects[ i ].uid
            };
            gms[ gmCount ] = currGroupMember;
            gmCount++;
        }
    }
    inputs[ 0 ] = {
        "project": context.pselected,
        "gms": gms,
        "groups": groups,
        "groupRoles": groupRoles,
        "addOrRemove": false
    };
    data.nodes = _.cloneDeep(inputs);

    return inputs;
};

/**
 * set non privilege for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setNonPrivilegeStatus = function( uwDataProvider, context ) {

    var inputs;
    var privilegeStatus = 0;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, context );
    return inputs;

};

export let createInputStructure = function( uwDataProvider, privilegeStatus, context ) {
    var inputs = [];
    var users = [];
    var groupNode = [];
    var groupCount = 0;
    var gmCount = 0;
    var roleCount = 0;
    var groupRoleNode = [];
    var i;

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === "Group" ) {

            groupNode[ groupCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].grp,
                isRemovable: true
            };
            groupCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === "Role" ) {
            groupRoleNode[ roleCount ] = {
                tcGroup: uwDataProvider.selectedObjects[ i ].grp,
                tcRole: uwDataProvider.selectedObjects[ i ].role,
                isRemovable: uwDataProvider.selectedObjects[ i ].isRemovable
            };
            roleCount++;
        }
        else if( uwDataProvider.selectedObjects[ i ].type === "User" ) {
            var currUser = {
                type: "user",
                uid: uwDataProvider.selectedObjects[ i ].user.dbValues[ 0 ]
            };
            users[ gmCount ] = currUser;
            gmCount++;
        }
    }
    inputs[ 0 ] = {
        "project": context.pselected,
        "users": users,
        "groupNode": groupNode,
        "groupRoleNode": groupRoleNode,
        "privilegeStatus": privilegeStatus
    };
    return inputs;
};

/**
 * set privilege status for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setPrivilegeStatus = function( uwDataProvider, context ) {

    var inputs;
    var privilegeStatus = 1;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, context );
    return inputs;
};

/**
 * set project team admin status for the selected group and group members for projects
 * @param {object} uwDataProvider data provider
 * @param {Object} context context
 */
export let setProjectTeamAdmin = function( uwDataProvider, context ) {

    var inputs;
    var privilegeStatus = 2;
    inputs = exports.createInputStructure( uwDataProvider, privilegeStatus, context );
    return inputs;
};

/**
 * This function to prepare the input users node for the setDefaultProjectForProjectMembers SOA.
 * @param {object} uwDataProvider data provider
 */
export let loadDefaultProject = function( uwDataProvider ) {

    var users = [];
    var gmCount = 0;
    var i;
    var isOnlyUsersSelected = false;
    var deferred = AwPromiseService.instance.defer();

    for( i = 0; i < uwDataProvider.selectedObjects.length; i++ ) {
        if( uwDataProvider.selectedObjects[ i ].type === "User" ) {
            var currUser = {
                type: "user",
                uid: uwDataProvider.selectedObjects[ i ].user.dbValues[ 0 ]
            };
            users[ gmCount ] = currUser;
            gmCount++;
        }
    }

    if(users.length > 0){
        if(users.length === uwDataProvider.selectedObjects.length){
            isOnlyUsersSelected = true;
        }
        deferred.resolve({
            "users" : users,
            "isOnlyUsersSelected" : isOnlyUsersSelected
        });
    }
    else{
        // It need to return something to invoke the failure event 
        deferred.reject(true);        
    }
    return deferred.promise;    
};


/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

export default exports = {
    removeSelectedMembers,
    setNonPrivilegeStatus,
    createInputStructure,
    setPrivilegeStatus,
    setProjectTeamAdmin,
    loadDefaultProject,
    setCommandContext
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'updateProjectMembersDetails', () => exports );
