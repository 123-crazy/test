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
 * @module js/qfm0UserPanelService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import userPanelUtils from 'js/qfm0UserPanelUtils';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';

var exports = {};

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
        searchResults: response.searchResults,
        totalFound: response.totalFound,
        totalLoaded: response.totalLoaded
    };

    return outputData;
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

export let revealGroupRoleLOV = function( data ) {
    if( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }
    userPanelUtils.populateGroupLOV( data, data.allGroups );
    data.disabledGroup = false;
    data.roleName = '';
    data.groupName = '';
    var defaultGroupValue = data.i18n.qfm0AllGroups;
    var defaultRoleValue = data.i18n.qfm0AllRoles;
    data.searchSubGroup = true;
    if( data.additionalSearchCriteria && data.additionalSearchCriteria.group ) {
        defaultGroupValue = data.additionalSearchCriteria.group;
        data.disabledGroup = true;
        // Set the group value on data to support filtering in LOV. Fix for defect # LCS-223295
        data.groupName = defaultGroupValue;

        // Check if searchSubGroup is true then set this variable on data
        if( data.additionalSearchCriteria.searchSubGroup && data.additionalSearchCriteria.searchSubGroup === 'false' ) {
            data.searchSubGroup = false;
        }
    }

    data.allGroups.dbValue = defaultGroupValue;
    data.allGroups.uiValue = defaultGroupValue;

    userPanelUtils.populateRoleLOV( data, data.allRoles );
    data.disabledRole = false;
    if( data.additionalSearchCriteria && data.additionalSearchCriteria.role ) {
        defaultRoleValue = data.additionalSearchCriteria.role;
        data.disabledRole = true;
        data.roleName = defaultRoleValue;
    }
    data.allRoles.dbValue = defaultRoleValue;
    data.allRoles.uiValue = defaultRoleValue;
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
    if( !dataProvider ) {
        return;
    }

    // Get the policy from data provider and register it
    var policy = dataProvider.action.policy;
    policySvc.register( policy );

    var resourceProviderContentType = 'Users';

    var searchString = data.filterBox.dbValue;
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
        projectId: ''
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
 *
 */
export let performSearch = function( data, dataProvider ) {
    var deferred = AwPromiseService.instance.defer();
    exports.performSearchInternal( data, dataProvider, deferred );
    return deferred.promise;
};

/**
 * This factory creates a service and returns exports
 *
 * @member qfm0UserPanelService
 */

export default exports = {
    revealGroupRoleLOV,
    performSearchInternal,
    performSearch
};
app.factory( 'qfm0UserPanelService', () => exports );
