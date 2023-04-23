// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/responsibleUserPanelService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import tq0Utils from 'js/tq0Utils';
import _ from 'lodash';
import adapterSvc from 'js/adapterService';

/**
 * Get the select object from provider from UI and add to the data
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Boolean} multiSelectEnabled - The multiple select enabled or not
 * @param {selection} Array - The selection object array
 */

var exports = {};
export let addSelectedObject = function( data, multiSelectEnabled, selection ) {
    var deferred = AwPromiseService.instance.defer();
    if( data && selection ) {
        if( selection[ 0 ] && selection[ 0 ].type && selection[ 0 ].type === 'User' ) {
            multiSelectEnabled = false;
        }
        tq0Utils.getValidObjectsToAdd( data, selection ).then( function( validObjects ) {
            // Check for if multiple selection is enabled then only add the selection
            // to list otherwise directly set the list. This is mainly needed when user
            // do one search and select some object using multiple select and then do another
            // search and select another object using CTRL key then both objects should be added
            if( multiSelectEnabled ) {
                _.forEach( validObjects, function( object ) {
                    // Check if same object is not exist in the list then only add it.
                    if( data.selectedObjects && data.selectedObjects.indexOf( object ) === -1 ) {
                        if( !exports.objectIsInList( data.selectedObjects, object ) ) {
                            data.selectedObjects.push( object );
                        }
                    }
                } );
                var finalList = [];
                _.forEach( data.selectedObjects, function( object ) {
                    // Check if same object is not exist in the list then only add it.
                    if( object.selected ) {
                        finalList.push( object );
                    }
                } );

                data.selectedObjects = finalList;
            } else {
                data.selectedObjects = [];
                if( validObjects && validObjects[ 0 ] ) {
                    data.selectedObjects.push( validObjects[ 0 ] );
                }
            }
            deferred.resolve();
        } );
    } else {
        deferred.resolve();
    }
    return deferred.promise;
};

export let objectIsInList = function( objectList, newObject ) {
    var objectFound = false;

    for( var i = 0; i < objectList.length; i++ ) {
        var uid = objectList[ i ].uid;
        var newUid = newObject.uid;
        if( uid === newUid ) {
            objectFound = true;
            break;
        }
    }
    return objectFound;
};

/**
 * Return if load filtered.
 *
 * @param {Object} isAll - To define that multi select mode is enabled or not
 *
 * @return {boolean} The boolean value to tell that multi select mode is enabled or not
 */

export let getMultiSelectMode = function( ) {
    return true;
};

/**
 * To check if input objects are of type participant then
 * return the selectedObject to populate the project data. Else use the
 * input selected array
 * @param {Object} ctx Context object
 * @param {Object} selectionArray Selected object array
 * @returns {Object} Obejct array
 */
export let getObjectsToLoad = function( ctx, selectionArray ) {
    var selectedObjectsArray =  _.cloneDeep( selectionArray );
    // Check if parent selection is not null then get the parent selection
    // adapter service and check if this selection is not in current selection array
    // then add it to that so we can add the selection to array so that project can be loaded
    if( selectedObjectsArray && selectedObjectsArray.length > 0 && ctx.pselected ) {
        var parentSelections = adapterSvc.getAdaptedObjectsSync( ctx.pselected );
        if( parentSelections && parentSelections[ 0 ] && parentSelections[ 0 ].uid ) {
            var index = _.findIndex( selectionArray, function( selObject ) {
                return parentSelections[ 0 ].uid === selObject.uid;
            } );
            if( index <= -1 ) {
                selectedObjectsArray.push( parentSelections[ 0 ] );
            }
        }
    }
    return selectedObjectsArray;
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

export let revealGroupRoleLOV = function( data ) {
    if( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }

    tq0Utils.populateGroupLOV( data, data.allGroups );
    // By default group and role LOV are editable and if group or role are present in
    // additional search criteria then diable it. Fix for defect # LCS-223365
    data.disabledGroup = false;
    data.roleName = '';
    data.groupName = '';
    var defaultGroupValue = data.i18n.allGroups;
    var defaultRoleValue = data.i18n.allRoles;
    var displayedGroupName = '';
    var displayedRoleName = '';
    data.searchSubGroup = true;
    if( data.additionalSearchCriteria && data.additionalSearchCriteria.group ) {
        defaultGroupValue = data.additionalSearchCriteria.group;
        data.disabledGroup = true;
        // Set the group value on data to support filtering in LOV. Fix for defect # LCS-223295
        data.groupName = defaultGroupValue;
        if ( data.additionalSearchCriteria.displayedGroup ) {
            displayedGroupName = data.additionalSearchCriteria.displayedGroup;
        } else {
            displayedGroupName = defaultGroupValue;
        }

        // Check if searchSubGroup is true then set this variable on data
        if( data.additionalSearchCriteria.searchSubGroup && data.additionalSearchCriteria.searchSubGroup === 'false' ) {
            data.searchSubGroup = false;
        }
    }

    data.allGroups.dbValue = defaultGroupValue;
    data.allGroups.uiValue = displayedGroupName;

    tq0Utils.populateRoleLOV( data, data.allRoles );
    data.disabledRole = false;
    if( data.additionalSearchCriteria && data.additionalSearchCriteria.role ) {
        defaultRoleValue = data.additionalSearchCriteria.role;
        data.disabledRole = true;
        // Set the role value on data to support filtering in LOV. Fix for defect # LCS-223295
        data.roleName = defaultRoleValue;

        if ( data.additionalSearchCriteria.displayedRole ) {
            displayedRoleName = data.additionalSearchCriteria.displayedRole;
        } else {
            displayedRoleName = defaultRoleValue;
        }
    }
    data.allRoles.dbValue = defaultRoleValue;
    data.allRoles.uiValue = displayedRoleName;
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} participantType - The participant type user is trying to add
 * @param {Object} deferred - The deferred object
 */
export let performSearchInternal = function( data, dataProvider, participantType, deferred ) {
    // Check is data provider is null or undefined then no need to process further
    // and return from here
    if( !dataProvider ) {
        return;
    }

    // Get the policy from data provider and register it
    var policy = dataProvider.action.policy;
    policySvc.register( policy );

    //Check the user panel content preference to determine whether to get all group members or just single users
    var resourceProviderContentType;
    var searchString = '';
    var projectId = '';
    var group;
    var role;

    // Check if user wants to load theusers content then set the correct provider content type
    resourceProviderContentType = 'Users';
    searchString = data.filterBox.dbValue;
    projectId = data.userProjectObject.dbValue;
    // Create the search criteria to be used
    var searchCriteria = {
        parentUid: '',
        searchString: searchString,
        resourceProviderContentType: resourceProviderContentType,
        group: group,
        role: role,
        searchSubGroup: 'true',
        projectId: projectId,
        participantType: participantType
    };

    // Check if additional search criteria exist on the scope then use that as well
    // so merge it with existing search criteria and then pass it to server
    var additionalSearchCriteria = data.additionalSearchCriteria;
    if( additionalSearchCriteria ) {
        // Iterate for all entries in additional search criteria and add to main search criteria
        for( var searchCriteriaKey in additionalSearchCriteria ) {
            if( additionalSearchCriteria.hasOwnProperty( searchCriteriaKey ) ) {
                searchCriteria[ searchCriteriaKey ] = additionalSearchCriteria[ searchCriteriaKey ];
            }
        }
    }
    // By default resource provider will be Awp0ResourceProvider if other resource provider exist in
    // ctx tthen it will use that
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
        if( policy ) {
            policySvc.unregister( policy );
        }

        // Parse the SOA data to content the correct user or resource pool data
        var outputData = processSoaResponse( data, response );
        return deferred.resolve( outputData );
    } );
};

/**
 * Do the perform search call to populate the user or resource pool based on object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} participantType - The participant type user is trying to add
 *
 * @returns {object} deferred promise
 */
export let performSearch = function( data, dataProvider, participantType ) {
    var deferred = AwPromiseService.instance.defer();
    exports.performSearchInternal( data, dataProvider, participantType, deferred );
    return deferred.promise;
};

/**
 * prepare the input for set properties SOA call to add the responsible User
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx}  ctx - The data provider that will be used to get the correct content
 * @returns {String} Resource provider content type
 */
export let addResponsibleUser = function( data, ctx ) {
    var inputData = [];
    var selected = ctx.mselected;
    var tableVals = ctx.mselected[0].props.tq0ResponsibleUsers.dbValues;
    selected.forEach( function( selectedTask ) {
        var infoObj = {};

        infoObj.object = cdm.getObject( selectedTask.uid );
        infoObj.timestamp = '';

        var temp = {};
        temp.name = 'tq0ResponsibleUsers';
        data.dataProviders.userPerformSearch.selectedObjects.forEach( function( vals ) {
            if( tableVals.indexOf( vals.props.user.dbValue ) === -1 ) {
                tableVals.push( vals.props.user.dbValue );
            }
        } );
        temp.values = tableVals;

        var vecNameVal = [];
        vecNameVal.push( temp );

        infoObj.vecNameVal = vecNameVal;

        inputData.push( infoObj );
    } );

    return inputData;
};

/**
 * This factory creates a service and returns exports
 *
 * @member responsibleUserPanelService
 */

export default exports = {
    addSelectedObject,
    objectIsInList,
    getMultiSelectMode,
    getObjectsToLoad,
    revealGroupRoleLOV,
    performSearchInternal,
    performSearch,
    addResponsibleUser
};
app.factory( 'responsibleUserPanelService', () => exports );
