// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * Note: This module does not return an API object. The API is only available
 * when the service defined this module is injected by AngularJS.
 * 
 * @module js/Awp0AssignProjectsLegacy
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import projectMgmntUtils from 'js/projectMgmntUtils';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import $ from 'jquery';

var exports = {};

var _contextObject = null;

/**
 * return True, when the given model object type matches else false
 * 
 * @param {Array}uniqueMemberProjects - intersection of all the assigned projects of the selected object(s)
 * 
 * @param {Array}user_assignable_projects - objects that can be assigned to the user
 *            
 * @return {Array} - array of valid assigned projects(intersection of the input list)
 */
var findValidAssignedProjects = function( uniqueMemberProjects, user_assignable_projects ) {
    var result = _.intersection( uniqueMemberProjects, user_assignable_projects );
    return result;
};

/**
 * Fetches all projects from the SOA and remove the projects which
 * are already assigned , populate the available project list with
 * the remaining projects.
 * 
 * @param {object}
 *            response - the soa response
 * 
 * @return {Object} objs: Array of projects to populate the
 *         available project list count: Number of projects
 *         soaResult: Soa Response
 * 
 */
export let processAvailableProjects = function( response ) {
    var memberProjectsUID = [];
    var memberProjects = [];
    var availableProjects = [];
    var user_assignable_projects = cdm.getUser().props.assignable_projects.dbValues;

    // this is the "maximum" list of valid projects for this user
    var userObject = appCtxSvc.ctx.user;

    // For available projects
    for( var index = 0; index < user_assignable_projects.length; index++ ) {
        var availableProj = cdm
            .getObject( user_assignable_projects[ index ] );
        availableProjects.push( availableProj );
    }

    // //For assigned projects
    for( var index = 0; index < appCtxSvc.ctx.projects.adaptedObjects.length; index++ ) {
        var selObjectProjList = cdm
            .getObject( appCtxSvc.ctx.projects.adaptedObjects[ index ].uid ).props.project_list.dbValues;
        memberProjectsUID.push( selObjectProjList );
    }

    var uniqueMemberProjects = findUniqueMemberProjects( memberProjectsUID );
    var validAssignedProjects = findValidAssignedProjects(
        uniqueMemberProjects, user_assignable_projects );

    for( var uniqueMember in validAssignedProjects ) {
        memberProjects.push( cdm
            .getObject( validAssignedProjects[ uniqueMember ] ) );
    }
    // setting the assigned projects in context for further use
    exports.setContext( memberProjects, null );

    _contextObject = appCtxSvc.getCtx( "AssignProject" );
    var memberOfList = _contextObject.Project_List;
    var indexesOfObjects = [];

    // /// filters out the assigned projects from the available
    // projects
    for( var i = 0; i < memberOfList.length; i++ ) {
        var memberofProjectUid = memberOfList[ i ].uid;
        indexesOfObjects.push( user_assignable_projects
            .indexOf( memberofProjectUid ) );
    }

    var filteredProjects = $.grep( availableProjects, function(
        eachElement, index ) {
        return $.inArray( index, indexesOfObjects ) === -1;
    } );

    return {
        objs: filteredProjects,
        count: filteredProjects.length,
        soaResult: availableProjects
    };
};

/**
 * return the intersected result of the projects which are assigned
 * to the selected objects
 * 
 * @param {Array}
 *            memberProjectsUID - Array containing arrays of the
 *            assigned projects of the selected objects
 * @return {Array} result - the intersected projects
 */
function findUniqueMemberProjects( memberProjectsUID ) {
    var result = memberProjectsUID[ 0 ];
    for( var i = 0; i < memberProjectsUID.length; i++ ) {
        result = _.intersection( result, memberProjectsUID[ i ] );
    }
    return result;
}

/**
 * set/update the context object
 * 
 * @param {Array}
 *            memberProjects - the project list already assigned to
 *            the selected objects
 * @param {Array}
 *            selObjects - the selected objects
 */
export let setContext = function( memberProjects, selObjects ) {
    _contextObject = appCtxSvc.getCtx( "AssignProject" );
    if( _contextObject === null || _contextObject === undefined ) {
        var _contextObject = {
            "dummy_name": "dummy_value"
        };
        appCtxSvc.registerCtx( "AssignProject", _contextObject );
    }
    if( memberProjects !== null ) {
        _contextObject.Project_List = memberProjects;
    } else if( selObjects !== null ) {
        _contextObject.Owning_Object = selObjects;
    }
    appCtxSvc.updateCtx( "AssignProject", _contextObject );
};

/**
 * Populates the available project list and apply filtering on it if
 * the user has entered filter.
 * 
 * This method takes out the intersection of the soa result and the
 * loaded member projects and assign the remaining to the available
 * list After that it apply filter on the list , if required
 * 
 * @param {viewModelOnject}
 *            data - json object
 * 
 * @return {Array} Array of projects to populate the available
 *         project list
 * 
 * 
 */

export let getAvailableProjects = function( data ) {
    _contextObject = appCtxSvc.getCtx( "AssignProject" );
    data.projectList = _.clone( _contextObject.Project_List );
    data.assignedProjectsUid = _
        .isUndefined( data.assignedProjectsUid ) ? [] :
        data.assignedProjectsUid;
    data.removeProjectsUid = _.isUndefined( data.removeProjectsUid ) ? [] :
        data.removeProjectsUid;
    data.removeProjectSoaInput = _
        .isUndefined( data.removeProjectSoaInput ) ? [] :
        data.removeProjectSoaInput;

    var allResult = _.clone( data.searchResults.soaResult );
    var currentMemberList = _
        .clone( data.dataProviders.memberOfProjectList.viewModelCollection.loadedVMObjects );
    if( currentMemberList.length === 0 ) {
        _contextObject = appCtxSvc.getCtx( "AssignProject" );
        currentMemberList = _.clone( _contextObject.Project_List );
    }

    // // Find the index of the projects which needs to be removed
    // from the soa reult list , to populate the available list of
    // projects

    var addedObjectIndex = projectMgmntUtils.getIndexToAddToProjects(
        allResult, currentMemberList );

    var updateAvailableList = $.grep( allResult, function( n, i ) {
        return $.inArray( i, addedObjectIndex ) === -1;
    } );

    data.filterResults.objs = _.clone( updateAvailableList );
    data.filterResults.count = data.filterResults.objs.length;
    data.filterResults.soaResult = data.searchResults.soaResult;

    // // Apply filter on the remaining list

    if( data.filterBox.dbValue !== "" ) {
        projectMgmntUtils.setFilterText( data.filterBox.dbValue );
        var arrByID = data.filterResults.objs
            .filter( projectMgmntUtils.filterByName );
        data.filterResults.objs = arrByID;
        data.filterResults.count = arrByID.length;
    }

    return data.filterResults;

};

/**
 * Populates the member project list
 * 
 * This method takes out the intersection of the context result *
 * 
 * @param {viewModelOnject}
 *            data - json object
 * 
 * @return {Array} Array of projects to populate the available
 *         project list
 * 
 * 
 */
export let getMemberProjects = function( data ) {
    var memberProjects = [];
    _contextObject = appCtxSvc.getCtx( "AssignProject" );
    var memberofList = _contextObject.Project_List;

    for( var i = 0; i < memberofList.length; i++ ) {
        memberProjects.push( memberofList[ i ] );
    }

    var allResult = _.clone( data.searchResults.soaResult );
    var addedObjectIndex = projectMgmntUtils.getIndexToAddToProjects(
        allResult, memberProjects );

    var finalMemberProjects = [];
    for( var i = 0; i < addedObjectIndex.length; i++ ) {
        finalMemberProjects.push( allResult[ addedObjectIndex[ i ] ] );
    }
    return finalMemberProjects;

};

/**
 * Prepares the SOA input for the projects to assign
 * 
 * @param {viewModelObject}
 *            data - json object
 * 
 * @return {Array} Array of assign projects uid
 * 
 * 
 */

export let projectsToAssign = function( data ) {
    var assignProjectsuid = _.isUndefined( data.assignedProjectsUid ) ? [] :
        data.assignedProjectsUid;
    var assignedProjectsSOAInput = [];
    for( var i = 0; i < assignProjectsuid.length; i++ ) {
        var assignedProjects = {};
        assignedProjects[ "uid" ] = assignProjectsuid[ i ];
        assignedProjects[ "type" ] = "TC_Project";
        assignedProjectsSOAInput.push( assignedProjects );
    }
    return assignedProjectsSOAInput;

};

/**
 * Prepares the SOA input for the objects to assign
 * 
 * @param {viewModelObject}
 *            data - json object
 * 
 * @return {Array} Array of owning object from which the projects
 *         needs to be assigned
 * 
 * 
 */

export let objectToAssign = function( data ) {
    var objectsToAssign = [];
    objectsToAssign = _.clone( appCtxSvc.ctx.projects.adaptedObjects );
    return objectsToAssign;
};

/**
 * Prepares the SOA input for the projects to remove
 * 
 * @param {viewModelObject}
 *            data - json object
 * 
 * @return {Array} Array of removed projects uid
 * 
 * 
 */
export let projectsToRemove = function( data ) {
    var removeProjectsuid = _
        .isUndefined( data.removeProjectSoaInput ) ? [] :
        data.removeProjectSoaInput;
    var removeProjectsSOAInput = [];
    for( var i = 0; i < removeProjectsuid.length; i++ ) {
        var removeProject = {};
        removeProject[ "uid" ] = removeProjectsuid[ i ];
        removeProject[ "type" ] = "TC_Project";
        removeProjectsSOAInput.push( removeProject );
    }
    return removeProjectsSOAInput;

};

/**
 * Prepares the SOA input for the objectToRemove
 * 
 * @param {viewModelObject}
 *            data - json object
 * 
 * @return {Array} Array of owning object from which the projects
 *         needs to be removed
 * 
 * 
 */
export let objectToRemove = function( data ) {
    var objectsToRemove = [];
    objectsToRemove = _.clone( appCtxSvc.ctx.projects.adaptedObjects );
    return objectsToRemove;
};

/**
 * Prepares the SOA input for getProperties call This function is
 * called from the viewModel json
 * 
 * @return {Array} Array of owning object and user for which the
 *         projects needs to be fetched
 * 
 */
export let processSelectedObjects = function() {
    exports.setContext( null, null );
    var selectedObject = [];
    var inputGetProperties = [];
    var selObject = [];
    inputGetProperties.push( appCtxSvc.ctx.user );
    selectedObject = _.clone( appCtxSvc.ctx.projects.adaptedObjects );
    for( var i = 0; i < selectedObject.length; i++ ) {
        inputGetProperties.push( selectedObject[ i ] );
        selObject.push( selectedObject[ i ] );
    }
    exports.setContext( null, selObject );
    return inputGetProperties;
};

export default exports = {
    processAvailableProjects,
    setContext,
    getAvailableProjects,
    getMemberProjects,
    projectsToAssign,
    objectToAssign,
    projectsToRemove,
    objectToRemove,
    processSelectedObjects
};
/**
 * This service creates name value property
 * 
 * @memberof NgServices
 * @member Awp0AssignProjects
 */
app.factory( 'Awp0AssignProjectsLegacy', () => exports );
