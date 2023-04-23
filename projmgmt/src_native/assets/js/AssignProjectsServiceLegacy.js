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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 * 
 * @module js/AssignProjectsServiceLegacy
 */
import app from 'app';
import projectMgmntUtils from 'js/projectMgmntUtils';
import _ from 'lodash';
import $ from 'jquery';

var exports = {};

/**
 * Update the data providers Remove Project cell command initiate the call for this function. Function removes
 * the selected project from the member project list and assign the project back to the available list. It also
 * apply the filter if required
 * 
 * @param {viewModelObject} data - json object
 * 
 * @param {ViewModelObject} vmo- selected project
 * 
 * 
 */

export let addToAvailableProjects = function( data, vmo ) {
    var remainingObjectInMemberOfList = removeFromMemberOfProjects( data, vmo );
    var availModelObjects = _.clone( data.filterResults.soaResult );

    var addedObjectIndex = projectMgmntUtils.getIndexToAddToProjects( availModelObjects,
        remainingObjectInMemberOfList );

    var updateAvailableList = $.grep( availModelObjects, function( n, i ) {
        return $.inArray( i, addedObjectIndex ) === -1;
    } );

    if( data.filterBox.dbValue !== "" ) {
        projectMgmntUtils.setFilterText( data.filterBox.dbValue );
        var arrByID = updateAvailableList.filter( projectMgmntUtils.filterByName );
        updateAvailableList = arrByID;
    }
    data.dataProviders.availableProjects.update( updateAvailableList );

};

/**
 * Removes the project from the member of project list
 * 
 * @param {viewModelObject} data - json object
 * 
 * @param {ViewModelObject} vmo- selected project
 */
function removeFromMemberOfProjects( data, vmo ) {
    var indexOfProject = data.assignedProjectsUid.indexOf( vmo.uid );
    if( indexOfProject > -1 ) {
        data.assignedProjectsUid.splice( indexOfProject, 1 );
    } else {
        data.removeProjectSoaInput.push( vmo.uid );
    }

    data.removeProjectsUid.push( vmo.uid );
    var viewModelObjects = data.dataProviders.memberOfProjectList.viewModelCollection.loadedVMObjects;
    var memberModelObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, data.removeProjectsUid ) === -1;
    } );

    data.dataProviders.memberOfProjectList.update( modelObjects );
    return modelObjects;
}

/**
 * Update the data providers Assign Project cell command initiate the call for this function. Function removes
 * the selected project from the available project list and assign the project back to the member project list.
 * 
 * @param {viewModelObject} data - json object
 * 
 * @param {ViewModelObject} vmo - selected project
 * 
 * 
 */

export let addToMemberOfProjects = function( data, vmo ) {
    removeFromAvailableProjects( data, vmo );
    var selProj = [];
    selProj.push( vmo );
    var availModelObjects = _.clone( data.filterResults.soaResult );
    var addedObjectIndex = projectMgmntUtils.getIndexToAddToProjects( availModelObjects, selProj );

    var viewModelObjectsMemberist = data.dataProviders.memberOfProjectList.viewModelCollection.loadedVMObjects;
    var updateMemberList = _.clone( viewModelObjectsMemberist );
    updateMemberList.push( availModelObjects[ addedObjectIndex ] );
    data.dataProviders.memberOfProjectList.update( updateMemberList );
};

/**
 * Prepares the SOA input for the projects to assign
 * 
 * @param {viewModelObject} data - json object
 * 
 * @param {ViewModelObject} vmo- selected project
 * 
 * 
 */
function removeFromAvailableProjects( data, vmo ) {
    var indexOfProject = data.removeProjectsUid.indexOf( vmo.uid );
    if( indexOfProject > -1 ) {
        data.removeProjectsUid.splice( indexOfProject, 1 );
    }
    var indexOfClickedObject = data.removeProjectSoaInput.indexOf( vmo.uid );
    if( indexOfClickedObject > -1 ) {
        data.removeProjectSoaInput.splice( indexOfClickedObject, 1 );
    }

    data.assignedProjectsUid.push( vmo.uid );
    var viewModelObjects = data.dataProviders.availableProjects.viewModelCollection.loadedVMObjects;
    var availModelObjects = _.clone( viewModelObjects );

    var modelObjects = $.grep( availModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, data.assignedProjectsUid ) === -1;
    } );

    data.dataProviders.availableProjects.update( modelObjects );
}

export default exports = {
    addToAvailableProjects,
    addToMemberOfProjects
};
/**
 * This service update the projects list as required
 * 
 * @memberof NgServices
 * @member AssignProjectsService
 */
app.factory( 'AssignProjectsServiceLegacy', () => exports );
