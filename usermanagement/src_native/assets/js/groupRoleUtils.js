// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global
 */

/**
 * This service is used to filter the roles depending on the group selection. Logic is same as the file
 * GroupRoleSegmentUtil.java
 * <P>
 *
 * @module js/groupRoleUtils
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';

var exports = {};
var contextData;
var groupObjects;

/**
 * This function will initialize context variable . Context variable will be container for storing the list of
 * unique roles and unique groups. Event will get unsubscribe on the destroy of the aw-context-control
 */

export let initContext = function() {
    return eventBus.subscribe( 'awContext.reveal', function( context ) {
        contextData = context;
    } );
};

/**
 * The function will get all the group object from the group members. This logic is same as the getGroupMembers
 *
 * @param {Object} response - Response object from the getGroup SOA
 * @return {object} Array of the unique groups
 */
export let getGroups = function( response ) {
    var groupArray = response.groupMembers;
    groupObjects = response.ServiceData.modelObjects;
    var defaultGropus = [];
    var uniqueGroups = [];
    var listGroups = [];
    var listRoles = [];
    var sessionGroup = appCtxSvc.ctx.userSession.props.group;

    _.forEach( groupArray, function( groupObject ) {
        if( groupObject && groupObject.props && groupObject.type === 'GroupMember' ) {
            var group_status = groupObject.props.status;
            var group = groupObject.props.group;
            var role = groupObject.props.role;
            var isFalseStaus = group_status.dbValues[ 0 ] !== '0';
            if( group_status && !isFalseStaus ) { // process only active group members
                if( group && role ) {
                    var default_role = groupObject.props.default_role;
                    var grp_value = group.uiValues[ 0 ];
                    var isFalseRole = default_role.dbValues[ 0 ] !== '0';
                    if( default_role && isFalseRole ) {
                        defaultGropus[ grp_value ] = groupObject;
                        listGroups[ grp_value ] = groupObject;
                    } else {
                        var gobj = _.get( defaultGropus, group );
                        if( gobj ) {
                            listGroups[ grp_value ] = gobj;
                        } else {
                            listGroups[ grp_value ] = groupObject;
                        }
                    }

                    // make the role list
                    if( sessionGroup.uiValue === group.uiValues[ 0 ] ) {
                        if( role.uiValues[ 0 ] ) {
                            listRoles[ role.uiValues[ 0 ] ] = groupObject;
                        }
                    }
                }
            }
        }
    } );

    for( var group in listGroups ) {
        uniqueGroups.push( listGroups[ group ] );
    }

    return uniqueGroups;
};

/**
 * The function will add the 'no project' string in the popup list.
 *
 * @param {Object} response - Response object from the getUserProjects SOA
 * @return {object} Array of the unique projects
 */
export let getProjectInfo = function( response ) {
    var projectList = response.userProjectInfos[ 0 ].projectsInfo;
    var projectPath = 'project';
    var project_list = [];

    _.forEach( projectList, function( projectObject ) {
        var projObj = _.get( projectObject, projectPath );
        project_list.push( projObj );
    } );
    var noProjectObj = {
        uiValue: contextData.i18n.noProject
    };
    var props = {
        object_string: noProjectObj
    };
    var noProject = {
        props: props,
        value: 'noProject'
    };
    project_list.push( noProject );
    return project_list;
};

export let getGroupMemberObjectWithDefaultRoleSet = function( data, pairs ) {
    var selectedGroup;

    _.forEach( groupObjects, function( groupMemberObject ) {
        if( groupMemberObject && groupMemberObject.props && groupMemberObject.type === 'GroupMember' ) {
            if( groupMemberObject.uid === pairs[ 0 ].value ) {
                selectedGroup = groupMemberObject.props.group;
            }
        }
    } );

    var groupWithDefaultRole;
    _.forEach( groupObjects, function( groupMemberObject ) {
        if( groupMemberObject && groupMemberObject.props && groupMemberObject.type === 'GroupMember' ) {
            if( groupMemberObject.props.group.dbValues[ 0 ] === selectedGroup.dbValues[ 0 ] &&
                groupMemberObject.props.default_role.dbValues[ 0 ] === '1' ) {
                var pairs = [];
                pairs[ 0 ] = {
                    name: 'groupMember',
                    value: groupMemberObject.uid
                };
                data.pairs = pairs;
                groupWithDefaultRole = groupMemberObject.uid;
            }
        }
    } );

    if( groupWithDefaultRole ) {
        return true;
    }
        return false;
};

/**
 * The function will get all the role object from the group members. This logic is same as the getGroupMembers
 *
 * @param {Object} response - Response object from the getGroup SOA
 * @return {object} Array of the unique groups
 */
export let getRoles = function( response ) {
    var groupArray = response.groupMembers;
    groupObjects = response.ServiceData.modelObjects;
    var defaultGropus = [];
    var listGroups = [];
    var uniqueRoles = [];
    var listRoles = [];
    var sessionGroup = appCtxSvc.ctx.userSession.props.group;

    _.forEach( groupArray, function( groupObject ) {
        if( groupObject && groupObject.props && groupObject.type === 'GroupMember' ) {
            var groupStatus = groupObject.props.status;
            var group = groupObject.props.group;
            var role = groupObject.props.role;
            var isFalseStatus = groupStatus.dbValues[ 0 ] !== '0';
            if( groupStatus && !isFalseStatus ) { // process only active grp members
                if( group && role ) {
                    var default_role = groupObject.props.default_role;
                    var grp_value = group.uiValues[ 0 ];
                    var isFalseRole = default_role.dbValues[ 0 ] !== '0';
                    if( default_role && isFalseRole ) {
                        defaultGropus[ grp_value ] = groupObject;
                        listGroups[ grp_value ] = groupObject;
                    } else {
                        var gobj = _.get( defaultGropus, group );
                        if( gobj ) {
                            listGroups[ grp_value ] = gobj;
                        } else {
                            listGroups[ grp_value ] = groupObject;
                        }
                    }

                    // make the role list
                    if( sessionGroup.uiValue === group.uiValues[ 0 ] ) {
                        if( role.uiValues[ 0 ] ) {
                            listRoles[ role.uiValues[ 0 ] ] = groupObject;
                        }
                    }
                }
            }
        }
    } );

    for( var role in listRoles ) {
        uniqueRoles.push( listRoles[ role ] );
    }

    return uniqueRoles;
};

export default exports = {
    initContext,
    getGroups,
    getProjectInfo,
    getGroupMemberObjectWithDefaultRoleSet,
    getRoles
};
app.factory( 'groupRoleUtils', () => exports );
