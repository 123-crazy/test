// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * @module js/qa0AuditTeamService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import qa0AuditTeamLOVUtils from 'js/qa0AuditTeamLOVUtils';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

import appCtxService from 'js/appCtxService';

var exports = {};

/**
 * Initialize the view model for the audit team member search (populate LOVs)
 * @param {data} data - viewModel data
 */
export let initializeVieModelData = function( data ) {
    if( !data.additionalSearchCriteria ) {
        data.additionalSearchCriteria = {};
    }

    // Initialize Group LOV
    qa0AuditTeamLOVUtils.initializeGroupLOV( data, data.allGroups );

    // Get default audit team group from the guideline object
    var guidelineUID = data.parentAudit.value.props.qa0AuditGuideline.dbValues[0];
    var guidelineObj = cdm.getObject(guidelineUID);

    // If default audit team group is configured, use it for preselecting group in panel
    if (guidelineObj && guidelineObj.props.qa0AuditTeamGroup && guidelineObj.props.qa0AuditTeamGroup.uiValues) {
        data.additionalSearchCriteria.group = guidelineObj.props.qa0AuditTeamGroup.uiValues[0];
    }

    data.disabledGroup = false;
    data.roleName = '';
    data.groupName = '';

    var defaultGroupValue = data.i18n.qfm0AllGroups;
    var defaultRoleValue = data.i18n.qfm0AllRoles;

    data.searchSubGroup = true;

    if( data.additionalSearchCriteria && data.additionalSearchCriteria.group ) {
        defaultGroupValue = data.additionalSearchCriteria.group;
        data.disabledGroup = true;
        data.groupName = defaultGroupValue;

        // Check if searchSubGroup is true then set this variable on data
        if( data.additionalSearchCriteria.searchSubGroup && data.additionalSearchCriteria.searchSubGroup === 'false' ) {
            data.searchSubGroup = false;
        }
    }

    data.allGroups.dbValue = defaultGroupValue;
    data.allGroups.uiValue = defaultGroupValue;

    // Initialize Role LOV
    qa0AuditTeamLOVUtils.initializeRoleLOV( data, data.allRoles );

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
 * Perform the user search
 *
 * @param {data} data - The view model for the audit team panel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * @param {Object} deferred - The deferred object
 * @returns {Object} Promise for the SOA result
 */
export let performSearch = function( data, dataProvider ) {
    var deferred = AwPromiseService.instance.defer();

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

    // Call SOA service to retrieve the result of the user search
    soaService.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
        if( policy ) {
            policySvc.unregister( policy );
        }

        // Parse the SOA data to content the correct user or resource pool data
        var outputData = parseUserSearchResult( data, response );

        return deferred.resolve( outputData );
    } );

    return deferred.promise;
};


/**
 * Parse user search result
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} response - The response of performSearch SOA call
 * @return {Object} - outputData object that holds the correct values .
 */
var parseUserSearchResult = function( data, response ) {
    var outputData = null;
    // Check if response is not null and it has some search results then iterate for each result to formulate the
    // correct response
    if( response && response.searchResults ) {
        _.forEach( response.searchResults, function( result ) {
            // Get the model object for search result object UID present in response
            var resultObject = cdm.getObject( result.uid );

            if( resultObject ) {
                var props = null;

                // Set cell properties for user object
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

/**
 * Get the user properties to be shown in UI
 *
 * @param {Object} resultObject - The model object for property needs to be populated
 * @return {Array} Property array that will be visible on UI
 */
var getUserProps = function( resultObject ) {
    var userCellProps = [];
    var userObject = null;
    var userName = null;
    var groupRoleName = null;

    // Check if user property is loaded for group member object then get the user
    // object first and then populate the user name for that
    if( resultObject.props.user && resultObject.props.user.dbValues ) {
        userObject = cdm.getObject( resultObject.props.user.dbValues[ 0 ] );
        userName = resultObject.props.user.uiValues[ 0 ];

        if( userObject && userObject.props.user_name && userObject.props.user_name.uiValues ) {
            userName = userObject.props.user_name.uiValues[ 0 ];
        }
    }

    // Check if group and role properties are not null and loaded then populate the group and role string to be shown on UI
    if( resultObject.props.group && resultObject.props.group.uiValues && resultObject.props.role &&
        resultObject.props.role.uiValues ) {
        groupRoleName = resultObject.props.group.uiValues[ 0 ] + '/' + resultObject.props.role.uiValues[ 0 ];
    }

    if( userName && groupRoleName ) {
        userCellProps.push( ' User Name \\:' + userName );
        userCellProps.push( ' Group Role Name \\:' + groupRoleName );
    }

    return userCellProps;
};

/**
 * This function will create the SOA input for createRelation for adding audit team members.
 * @param {String} relation Destination relation
 * @param {Array} groupMembers Array of selected GroupMember objects
 * @param {Object} auditObject The audit object, to which the audit team members should be added to
 * @return {Array} Returns inputData array for createRelation service
 */
export let createAuditTeamMemberRelations = function( relation, groupMembers, auditObject ) {
    var inputData = {};
    var secondaryObject = {};
    var soaInput = [];

    if ( groupMembers && groupMembers.length > 0 ) {
        groupMembers.forEach( function( selectedObj ) {
            secondaryObject = { uid: selectedObj.uid, type: selectedObj.type };
            inputData = {
                clientId: 'AWClient',
                primaryObject: auditObject,
                relationType: relation,
                secondaryObject: secondaryObject,
                userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
            };
            soaInput.push( inputData );
        } );
    }
    return soaInput;
};

/**
 * This function will create the SOA input for deleteRelations for removing audit team members.
 * @param {Object} auditObject Audit object, that contains the audit team relation
 * @param {String} relation name of the audit team relation
 * @param {Array} selectedUsers Array of selected audit team members to be removed
 * @return {Array} Returns inputData array for deleteRelations service
 */
export let createRemoveAuditTeamMemberInput = function( auditObject, relation, selectedUsers ) {
    var inputData = {};
    var soaInput = [];
    if ( auditObject && selectedUsers && selectedUsers.length > 0 ) {
        selectedUsers.forEach( function( selectedObj ) {
            inputData = {
                clientId: 'AWClient',
                primaryObject: auditObject,
                relationType: relation,
                secondaryObject: selectedObj,
                userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
            };
            soaInput.push( inputData );
        } );
    }
    return soaInput;
};

/**
 * This factory creates a service and returns exports
 *
 * @member qa0AuditTeamService
 */

export default exports = {
    initializeVieModelData,
    performSearch,
    createAuditTeamMemberRelations,
    createRemoveAuditTeamMemberInput
};
app.factory( 'qa0AuditTeamService', () => exports );
