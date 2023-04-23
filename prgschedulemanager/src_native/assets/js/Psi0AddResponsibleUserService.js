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
 * @module js/Psi0AddResponsibleUserService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import tcServerVersion from 'js/TcServerVersion';
import prgScheduleManagerUtils from 'js/PrgScheduleManagerUtils';
import _ from 'lodash';
import dmSvc from 'soa/dataManagementService';
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
    if ( selection && selection[0] ) {
        data.selectedObject = selection[0];
        var resultObject = cdm.getObject( selection[0].uid );
        data.userObject = cdm.getObject( resultObject.props.user.dbValues[0] );
    } else {
        data.selectedObject = null;
        data.userObject = null;
    }
};

var prepareUserCell = function( cellHeader1, cellHeader2 ) {
    var userCellProps = [];
    if ( cellHeader1 && cellHeader2 ) {
        userCellProps = [];
        userCellProps.push( ' User Name \\:' + cellHeader1 );
        userCellProps.push( ' Group Role Name \\:' + cellHeader2 );
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
    if ( resultObject.props.user && resultObject.props.user.dbValues ) {
        userObject = cdm.getObject( resultObject.props.user.dbValues[0] );
        cellHeader1 = resultObject.props.user.uiValues[0];

        if ( userObject && userObject.props.user_name && userObject.props.user_name.uiValues ) {
            cellHeader1 = userObject.props.user_name.uiValues[0];
        }
    }

    // Check if group and role properties are not null and loaded then populate the group and role string to be shown on UI
    if ( resultObject.props.group && resultObject.props.group.uiValues && resultObject.props.role &&
        resultObject.props.role.uiValues ) {
        cellHeader2 = resultObject.props.group.uiValues[0] + '/' + resultObject.props.role.uiValues[0];
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

    if ( selectedObj.length ) {
        for ( var i = 0; i < selectedObj.length; i++ ) {
            inputGetProperties.push( selectedObj[i] );
        }
    } else {
        inputGetProperties.push( selectedObj );
    }
    return inputGetProperties;
};

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

    for ( var object in data.objectsWithProjectList ) {
        if ( selectedArrayUids.indexOf( object ) > -1 ) {
            if ( data.objectsWithProjectList[object].props.project_list.dbValues.length > 0 ) {
                projectFlag = true;
            }
        }
    }

    if ( data.commonProjectList || projectFlag ) {
        _.forEach( data.availableProjectsList, function( project ) {
            var found = false;
            if ( data.commonProjectList ) {
                for ( var i = 0; i < data.commonProjectList.length; i++ ) {
                    if ( project.uid === data.commonProjectList[i].uid ) {
                        found = true;
                        break;
                    }
                }
            }
            if ( found ) {
                var listModelObject = _getEmptyListModel();
                listModelObject.propDisplayValue = project.props.object_string.uiValues[0];
                listModelObject.propInternalValue = project.props.project_id.dbValues[0];
                projectListModelArray.push( listModelObject );
            }
        } );
    }

    // Check if preference value is not null and if equals to "org_default" then add the empty list model with "None" value to 0th index
    // and if value is project_default then add the empty list model with "None" value to the end of project list
    let prefValue = data.preferences.WRKFLW_show_user_assignment_options[0];
    if ( prefValue ) {
        let emptyProjectListModel = _getEmptyListModel();
        emptyProjectListModel.propDisplayValue = data.i18n.none;
        emptyProjectListModel.propInternalValue = '';

        if ( prefValue === 'org_default' ) {
            projectListModelArray.splice( 0, 0, emptyProjectListModel );
        } else if ( prefValue === 'project_default' ) {
            projectListModelArray.push( emptyProjectListModel );
        }
    }
    // Assign the project object list that will be shown on UI
    data.projectObjectList = projectListModelArray;
};

/**
 * Parse the perform search response and return the correct output data object
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} response - The response of performSearch SOA call
 *
 * @return {Object} - outputData object that holds the correct values .
 */
var processSoaResponse = function( data, response ) {
    var outputData = null;

    // Construct the output data that will contain the results
    outputData = {
        searchResults: response.searchResults,
        totalFound: response.totalFound,
        totalLoaded: response.totalLoaded
    };

    return outputData;
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 *
 */
export let performSearch = function( data, dataProvider ) {
    var deferred = AwPromiseService.instance.defer();
    exports.performSearchInternal( data, dataProvider, deferred );
    return deferred.promise;
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} deferred - The deferred object
 */
export let performSearchInternal = function( data, dataProvider, deferred ) {
    // Check is data provider is null or undefined then no need to process further
    // and return from here
    if ( !dataProvider ) {
        return;
    }

    // Get the policy from data provider and register it
    var policy = dataProvider.action.policy;
    policySvc.register( policy );

    var resourceProviderContentType = 'Users';

    var searchString = data.filterBox.dbValue;
    var projectId = data.userProjectObject.dbValue;
    var group;
    var role;

    // Create the search criteria to be used
    var searchCriteria = {
        parentUid: '',
        searchString: searchString,
        resourceProviderContentType: resourceProviderContentType,
        group: group,
        role: role,
        searchSubGroup: 'true',
        projectId: projectId
    };

    // Check if additional search criteria exist on the scope then use that as well
    // so merge it with existing search criteria and then pass it to server
    var additionalSearchCriteria = data.additionalSearchCriteria;
    if ( additionalSearchCriteria ) {
        // Iterate for all entries in additional search criteria and add to main search criteria
        for ( var searchCriteriaKey in additionalSearchCriteria ) {
            if ( additionalSearchCriteria.hasOwnProperty( searchCriteriaKey ) ) {
                searchCriteria[searchCriteriaKey] = additionalSearchCriteria[searchCriteriaKey];
            }
        }
    }

    // By default resource provider will be Awp0ResourceProvider
    var resourceProvider = 'Awp0ResourceProvider';

    var inputData = {
        searchInput: {
            maxToLoad: 100,
            maxToReturn: 25,
            providerName: resourceProvider,
            searchCriteria: searchCriteria,
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap: {},
            searchSortCriteria: [],
            startIndex: dataProvider.startIndex
        }
    };

    // SOA call made to get the content
    soaService.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
        if ( policy ) {
            policySvc.unregister( policy );
        }

        // Parse the SOA data to content the correct user or resource pool data
        var outputData = processSoaResponse( data, response );
        return deferred.resolve( outputData );
    } );
};

/**
 * prepare the input for set properties SOA call to add the responsible User
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 */
export let addResponsibleUser = function( data, ctx ) {
    var inputData = [];
    console.log("------------------------------------------------");
    console.log(data);
    console.log(ctx);
    var selected = ctx.mselected;

    selected.forEach( function( selectedTask ) {
        var infoObj = {};

        infoObj.object = cdm.getObject( selectedTask.uid );
        infoObj.timestamp = '';

        var temp = {};
        if ( selectedTask.modelType.typeHierarchyArray.indexOf( 'Psi0Checklist' ) > -1 || selectedTask.modelType.typeHierarchyArray.indexOf( 'Psi0ChecklistQuestion' ) > -1 || selectedTask.modelType.typeHierarchyArray.indexOf( 'Apm0QualityChecklist' ) > -1 ) {
            temp.name = 'psi0ResponsibleUser';
        } else {
            temp.name = 'psi0ResponsibleUsr';
        }
        temp.values = [ data.dataProviders.userPerformSearch.selectedObjects[0].props.user.dbValue ];

        var vecNameVal = [];
        vecNameVal.push( temp );

        infoObj.vecNameVal = vecNameVal;

        inputData.push( infoObj );
    } );
console.log(inputData);
    return inputData;
};

export let checkVersionSupportForProject = function( major, minor, qrm ) {
    if ( tcServerVersion.majorVersion > major ) {
        // For TC versions like TC12
        return true;
    }
    if ( tcServerVersion.majorVersion < major ) {
        // For TC versions like TC10
        return false;
    }
    if ( tcServerVersion.minorVersion > minor ) {
        // For TC versions like TC11.3
        return true;
    }
    if ( tcServerVersion.minorVersion < minor ) {
        // For TC versions like TC11.1
        return false;
    }
    //compare only versions like TC11.2.2, TC11.2.3....
    return tcServerVersion.qrmNumber >= qrm;
};
export let revealGroupRoleLOV = function( data, selectedObj ) {
    if ( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }
    prgScheduleManagerUtils.populateGroupLOV( data, data.allGroups );
    data.disabledGroup = false;
    data.roleName = '';
    data.groupName = '';
    data.searchSubGroup = true;
    prgScheduleManagerUtils.populateRoleLOV( data, data.allRoles );
    data.disabledRole = false;
    setDefaultGroup( data );
    setDefaultRole( data );
    if ( selectedObj.props.psi0ResourceAssignment.dbValues.length > 0 ) {
        var resrcPoolUid = selectedObj.props.psi0ResourceAssignment.dbValues[0];
        return dmSvc.getProperties( [ resrcPoolUid ], [ 'group', 'role' ] ).then( function( response ) {
            var resrcPoolObj = cdm.getObject( resrcPoolUid );
            if ( resrcPoolObj.props.group ) {
                var group = resrcPoolObj.props.group;
                data.additionalSearchCriteria.group = group.uiValues[0];
                data.allGroups.dbValue = group.dbValues[0];
                data.allGroups.uiValue = group.uiValues[0];
                setDefaultGroup( data );
            }
            if ( resrcPoolObj.props.role ) {
                var role = resrcPoolObj.props.role;
                data.additionalSearchCriteria.role = role.uiValues[0];
                data.allRoles.dbValue = role.dbValues[0];
                data.allRoles.uiValue = role.uiValues[0];
                setDefaultRole( data );
            }
        } );
    }
};

/**
 * This method will set Group LOV
 * @param {Object} data data provided
 * JSDoc sets Group LOV
 */
function setDefaultGroup( data ) {
    var defaultGroupValue = data.i18n.allGroups;
    if ( data.additionalSearchCriteria && data.additionalSearchCriteria.group ) {
        defaultGroupValue = data.additionalSearchCriteria.group;
        data.disabledGroup = true;
        // Set the group value on data to support filtering in LOV. Fix for defect # LCS-223295
        data.groupName = defaultGroupValue;
        // Check if searchSubGroup is true then set this variable on data
        if ( data.additionalSearchCriteria.searchSubGroup && data.additionalSearchCriteria.searchSubGroup === 'false' ) {
            data.searchSubGroup = false;
        }
    }
    if ( !data.allGroups.dbValue && !data.allGroups.uiValue ) {
        data.allGroups.dbValue = defaultGroupValue;
        data.allGroups.uiValue = defaultGroupValue;
    }
}
/**
 * This method will set Role LOV
 * @param {Object} data data provided
 * JSDoc sets Role LOV
 */
function setDefaultRole( data ) {
    var defaultRoleValue = data.i18n.allRoles;
    if ( data.additionalSearchCriteria && data.additionalSearchCriteria.role ) {
        defaultRoleValue = data.additionalSearchCriteria.role;
        data.disabledRole = true;
        data.roleName = defaultRoleValue;
    }
    if ( !data.allRoles.dbValue && !data.allRoles.uiValue ) {
        data.allRoles.dbValue = defaultRoleValue;
        data.allRoles.uiValue = defaultRoleValue;
    }
}

export default exports = {
    addSelectedObject,
    processSelectedObjects,
    populateProjectData,
    performSearch,
    addResponsibleUser,
    checkVersionSupportForProject,
    revealGroupRoleLOV,
    performSearchInternal,
    setDefaultGroup,
    setDefaultRole
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Psi0AddResponsibleUserService
 */
app.factory( 'Psi0AddResponsibleUserService', () => exports );
