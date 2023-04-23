// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Qam0AssignResponsibleUserService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import tcServerVersion from 'js/TcServerVersion';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';

import 'js/selection.service';
import 'js/commandPanel.service';

var exports = {};

/**
 * Get the select object from provider from UI and add to the data
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {selection} Array - The selection object array
 */
export let addSelectedObject = function( data, selection ) {

    // Check if selection is not null and 0th index object is also not null
    // then only add it to the view model
    if( selection && selection[ 0 ] ) {
        data.selectedObject = selection[ 0 ];
        var resultObject = cdm.getObject( selection[ 0 ].uid );
        data.userObject = cdm.getObject( resultObject.props.user.dbValues[ 0 ] );
    } else {
        data.selectedObject = null;
        data.userObject = null;
    }
};

var prepareUserCell = function( cellHeader1, cellHeader2 ) {
    var userCellProps = [];
    if( cellHeader1 && cellHeader2 ) {
        userCellProps = [];
        userCellProps.push( " User Name \\:" + cellHeader1 );
        userCellProps.push( " Group Role Name \\:" + cellHeader2 );
    }
    return userCellProps;
};

/**
 * Get the user cell property that needs to be shown on UI
 *
 * @param {Object} resultObject - The model object for property needs to be populated
 * @return {Array} Property array that will be visible on UI
 */
var getUserProps = function( resultObject ) {

    var userCellProps = null;
    var userObject = null;
    var cellHeader1 = null;
    var cellHeader2 = null;

    // Check if user property is loaded for group member object then get the user
    // object first and then populate the user name for that
    if( resultObject.props.user && resultObject.props.user.dbValues ) {
        userObject = cdm.getObject( resultObject.props.user.dbValues[ 0 ] );
        cellHeader1 = resultObject.props.user.uiValues[ 0 ];

        if( userObject && userObject.props.user_name && userObject.props.user_name.uiValues ) {
            cellHeader1 = userObject.props.user_name.uiValues[ 0 ];
        }
    }

    // Check if group and role properties are not null and loaded then populate the group and role string to be shown on UI
    if( resultObject.props.group && resultObject.props.group.uiValues && resultObject.props.role &&
        resultObject.props.role.uiValues ) {
        cellHeader2 = resultObject.props.group.uiValues[ 0 ] + "/" + resultObject.props.role.uiValues[ 0 ];
    }
    userCellProps = prepareUserCell( cellHeader1, cellHeader2 );

    return userCellProps;

};

/**
 * To process the selected objects
 *
 * @param {Object} ctx - The Context object
 */
export let processSelectedObjects = function( ctx ) {

    var inputGetProperties = [];
    var selectedObj = ctx.mselected;

    if( selectedObj.length ) {

        for( var i = 0; i < selectedObj.length; i++ ) {
            inputGetProperties.push( selectedObj[ i ] );

        }

    } else {
        inputGetProperties.push( selectedObj );
    }

    return inputGetProperties;
};

var _getEmptyListModel = function() {
    var listModel = {
        propDisplayValue: "",
        propInternalValue: "",
        propDisplayDescription: "",
        hasChildren: false,
        children: {},
        sel: false
    };

    return listModel;
};

/**
 * Populate the project list based on the selection
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Array} selectedArray - The selected objects array
 */
export let populateProjectData = function( data, selectedArray ) {

    // Initialize the project object list to empty array for now
    var projectListModelArray = [];

    var selectedArrayUids = [];

    var projectFlag = false;

    selectedArray.forEach( function( selected ) {
        selectedArrayUids.push( selected.uid );
    } );

    for( var object in data.objectsWithProjectList ) {
        if( selectedArrayUids.indexOf( object ) > -1 ) {
            if( data.objectsWithProjectList[ object ].props.project_list.dbValues.length > 0 ) {
                projectFlag = true;
            }
        }
    }

    if( data.commonProjectList || projectFlag ) {
        _.forEach( data.availableProjectsList, function( project ) {
            var found = false;
            if( data.commonProjectList ) {
                for( var i = 0; i < data.commonProjectList.length; i++ ) {
                    if( project.uid === data.commonProjectList[ i ].uid ) {
                        found = true;
                        break;
                    }
                }
            }
            if( found ) {
                var listModelObject = _getEmptyListModel();
                listModelObject.propDisplayValue = project.props.object_string.uiValues[ 0 ];
                listModelObject.propInternalValue = project.props.project_id.dbValues[ 0 ];
                projectListModelArray.push( listModelObject );
            }
        } );
    } else {
        var emptyProjectListModel = _getEmptyListModel();
        emptyProjectListModel.propDisplayValue = data.i18n.none;
        emptyProjectListModel.propInternalValue = "";
        projectListModelArray.push( emptyProjectListModel );
    }
    // Assign the project object list that will be shown on UI
    data.projectObjectList = projectListModelArray;
};

/**
 * Parse the perform search response and return the correct output data object
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} response - The response of performSearch SOA call
 * @return {Object} - outputData object that holds the correct values .
 */
var processSoaResponse = function( data, response ) {
    var outputData = null;
    // Check if response is not null and it has some search results then iterate for each result to formulate the
    // correct response
    if( response && response.searchResults ) {

        _.forEach( response.searchResults, function( result ) {

            // Get the model object for search result object UID present in response
            var resultObject = cdm.getObject( result.uid );

            if( resultObject ) {

                var props = null;

                // Check if result object type is not null
                // then set the correct cell properties for User object
                if( resultObject.type ) {
                    props = getUserProps( resultObject );
                }
                if( props ) {
                    resultObject.props.awp0CellProperties.dbValues = props;
                    resultObject.props.awp0CellProperties.uiValues = props;
                }
            }
        } );
    }
    // Construct the output data that will contain the results
    outputData = {
        "searchResults": response.searchResults,
        "totalFound": response.totalFound,
        "totalLoaded": response.totalLoaded
    };
    return outputData;
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 */
export let performSearch = function( data, dataProvider ) {

    // Check is data provider is null or undefined then no need to process further
    // and return from here
    if( !dataProvider ) {
        return;
    }

    // Get the policy from data provider and register it
    var policy = dataProvider.action.policy;
    policySvc.register( policy );

    var resourceProviderContentType = "Users";
    var searchString = data.filterBox.dbValue;
    var projectId = data.userProjectObject.dbValue;

    var inputData = {
        "searchInput": {
            "maxToLoad": 100,
            "maxToReturn": 25,
            "providerName": "Awp0ResourceProvider",
            "searchCriteria": {
                "parentUid": "",
                "searchString": searchString,
                "resourceProviderContentType": resourceProviderContentType,
                "group": "",
                "role": "",
                "searchSubGroup": "false",
                "projectId": projectId,
                "participantType": ""
            },

            "searchFilterFieldSortType": "Alphabetical",
            "searchFilterMap": {},

            "searchSortCriteria": [],

            "startIndex": dataProvider.startIndex
        }
    };

    var deferred = AwPromiseService.instance.defer();

    // SOA call made to get the content
    soaService.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
        // Parse the SOA data to content the correct user or resource pool data
        var outputData = processSoaResponse( data, response );
        deferred.resolve( outputData );
    } );
    return deferred.promise;
};

/**
 * prepare the input for saveViewModelEditAndSubmitWorkflow2 SOA call to add the responsible User
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 */
export let qamAssignResponsibleUser = function( data, ctx ) {

    var inputs = [];

    var selectedObjs = ctx.mselected;

    for (var i = 0; i < selectedObjs.length; ++i) {

        var selected = selectedObjs[i];

        var input = {};
        var obj = {};

        obj["uid"] = selected.uid;
        obj["type"] = selected.type;

        var viewModelProperties = [];
        var prop1 = {};

        prop1["propertyName"] = "fnd0ResponsibleUser";
        prop1["dbValues"] = [ data.dataProviders.userPerformSearch.selectedObjects[0].props.user.dbValue ];
        prop1["srcObjLsd"] = selected.props.last_mod_date.dbValues[0];
        prop1["intermediateObjectUids"] = [];
        prop1["isModifiable"] = true;

        viewModelProperties.push(prop1);

        input["isPessimisticLock"] = false;
        input["workflowData"] = {};
        input["obj"] = obj;
        input["viewModelProperties"] = viewModelProperties;

        inputs.push(input);
    }
    return inputs;
};

export let checkVersionSupportForProject = function( major, minor, qrm ) {
    if( tcServerVersion.majorVersion > major ) {
        // For TC versions like TC12
        return true;
    }
    if( tcServerVersion.majorVersion < major ) {
        // For TC versions like TC10
        return false;
    }
    if( tcServerVersion.minorVersion > minor ) {
        // For TC versions like TC11.3
        return true;
    }
    if( tcServerVersion.minorVersion < minor ) {
        // For TC versions like TC11.1
        return false;
    }
    //compare only versions like TC11.2.2, TC11.2.3....
    return tcServerVersion.qrmNumber >= qrm;
};

export let setResponsibleUserAssignmentDate = function( ctx ) { 
    var inputData = [];

    var selected = ctx.mselected;

    selected.forEach( function( selectedTask ) {
        var infoObj = {};

        infoObj[ "object" ] = cdm.getObject( selectedTask.uid );

        infoObj[ "timestamp" ] = "";

        var temp = {};

        temp[ "name" ] = "qam0AssignmentDate";
        var curDate = new Date();
        var curDateInUTC = dateTimeSvc.formatUTC( curDate );
        temp[ "values" ] = [curDateInUTC];

        var vecNameVal = [];
        vecNameVal.push( temp );

        infoObj[ "vecNameVal" ] = vecNameVal;

        inputData.push( infoObj );
    } );

    return inputData;
};


export default exports = {
    addSelectedObject,
    processSelectedObjects,
    populateProjectData,
    performSearch,
    qamAssignResponsibleUser,
    checkVersionSupportForProject,
    setResponsibleUserAssignmentDate
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Qam0AssignResponsibleUserService
 */
app.factory( 'Qam0AssignResponsibleUserService', () => exports );
