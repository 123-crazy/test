// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/tcooUserPanelService
 */
import * as app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';

import logger from 'js/logger';
import _ from 'lodash';
import AwStateService from 'js/awStateService';

var exports = {};

/**
 * Add the selected users to the users list
 * @param {data} data - The qualified data of the viewModel
 *
 */
export let addSelectedUsers = function( data ) {
    if( data && data.dataProviders.userPerformSearch.selectedObjects && data.dataProviders.userPerformSearch.selectedObjects.length > 0 ) {
        exports.addUser( data, data.dataProviders.userPerformSearch.selectedObjects );
        // clear selection on the original list. So that the following selection in this list will not have the previous
        // selection also included.
        data.dataProviders.userPerformSearch.selectionModel.setSelection( [] );
    }
};

export let addUser = function( data, selection ) {
    if( data && selection ) {
        if( !data.users ) {
            data.users = [];
        }
        try {
            if( selection ) {
                for( let i = 0; i < selection.length; i++ ) {
                    if( isValidToAdd( data, selection[ i ].props.user.dbValue ) ) {
                        selection[ i ].selected = false;
                        // clear the selection on the object before adding it to the new list. So the object in the
                        // new list will not be selected.
                        var clonedUser = _.clone( selection[ i ] );
                        data.users.push( clonedUser );
                    }
                }
            }
            if( data.dataProviders && data.dataProviders.getUsers ) {
                //update data provider
                data.dataProviders.getUsers.update( data.users, data.users.length );
                //clear selection
                data.dataProviders.getUsers.changeObjectsSelection( 0, data.dataProviders.getUsers.getLength() - 1, false );
            }
        } catch ( exception ) {
            logger.error( 'exception = ' + exception );
            throw exception;
        }
    }
};

/**
 * Remove the selected users from the users list
 * @param {data} data - The qualified data of the viewModel
 *
 */
export let removeSelectedUsers = function( data ) {
    // return when list is empty
    if( !data.users || data.users.length < 1 ) {
        return;
    }
    // return when there is no selection
    if( !data.users.some( u => u.selected ) ) {
        return;
    }
    // remove selected from list
    data.users = data.users.filter( user => !user.selected );
    // update UI
    if( data.dataProviders && data.dataProviders.getUsers ) {
        //update data provider
        data.dataProviders.getUsers.update( data.users, data.users.length );
        //clear selection
        data.dataProviders.getUsers.changeObjectsSelection( 0, data.dataProviders.getUsers.getLength() - 1, false );
    }
};

var isValidToAdd = function( data, selectedUserUid ) {
    var needToAdd = true;

    if( data.users.some( u => u.props.user.dbValue === selectedUserUid ) ) {
        needToAdd = false;
    }

    return needToAdd;
};

export let getDocumentName = function( modelObject ) {
    return modelObject.props.object_string.uiValues[ 0 ];
};

/**
 *
 * Build the list of attachments for the workflow task including the
 * attached object and reviewers.
 *
 * @param {ModelObject} moItem - This is the target ItemRev
 * @param {ModelObject} moDataset - This is the target dataset
 * @param {User[]} selectedUsers - The GroupMember objects selected in UserList
 * @param {String} currentUserUid - The UID of the current session GroupMember
 * @return {object[]} List of attachments
 */
export let getAttachments = function( moItem, moDataset, selectedUsers, currentUserUid ) {
    var attachments = [];

    // first, check to see if need to add the ItemRev as attachment
    if( moItem && moItem.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) >= 0 ) {
        // in case of a standalone dataset, the selected is also the dataset. So only
        // add the selected when it is an ItemRev or its subtype
        attachments.push( moItem.uid );
    }

    // then, add dataset
    attachments.push( moDataset.uid );

    // then, add the selected users as attachment
    var userUids = '';
    for( var i in selectedUsers ) {
        if( selectedUsers[ i ] && selectedUsers[ i ].uid ) {
            if( selectedUsers[ i ].uid !== currentUserUid ) {
                userUids += selectedUsers[ i ].uid + ',';
            }
        }
    }
    // make sure add the current user last
    userUids += currentUserUid;
    var userAttachmentString = 'ProposedReviewer,' + userUids;
    attachments.push( userAttachmentString );
    return attachments;
};

export let getAttachmentTypes = function( modelObject ) {
    // Attachment types: There are different attachment types that the CreateInstance SOA
    // server code expects and handles differently.
    // type 1: This is the type of the real attachment objects. These objects will be set as
    //         target of the task
    // type 100: This is the type for users. The users (GroupMemeber objects) will be set
    //         as "ProposedReviewer" on the task

    var attachmentTypes = [];
    if( modelObject && modelObject.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) >= 0 ) {
        attachmentTypes.push( 1 ); // itemRev
    }

    attachmentTypes.push( 1 ); // dataset

    // 100 is the type for the target reviewers
    attachmentTypes.push( 100 );

    return attachmentTypes;
};

/**
 *
 * navigate to user's inbox
 *
 * @function navigate
 */
export let navigate = function() {
    var stateSvc = AwStateService.instance;
    var showObject = 'myTasks';
    var toParams = {};
    var options = {};

    options.inherit = false;
    stateSvc.go( showObject, toParams, options );
};

/**
 * Based on preference value check that we need to load project data or not. If preference exist and not equals to
 * org_only then project data will be loaded on UI.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let populatePanelData = function( data ) {

};

/**
 * Return if load filtered.
 *
 * @param {Object} isAll - To define that multi select mode is enabled or not
 *
 * @return {boolean} The boolean value to tell that multi select mode is enabled or not
 */

export let getMultiSelectMode = function( multiSelectMode, data ) {
    if( multiSelectMode && multiSelectMode === 'multiple' ) {
        return true;
    }
    return false;
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
    var resourceProviderContentType = 'Users';
    //var resourceProviderContentType = 'UniqueUsers';
    if( data.dataProviders ) {
        var selModel = appCtxSvc.ctx.workflow.selectionModelMode;
        var isMultiSelectMode = exports.getMultiSelectMode( selModel, data );
        data.dataProviders.userPerformSearch.selectionModel.setMultiSelectionEnabled( isMultiSelectMode );
        data.dataProviders.userPerformSearch.selectionModel.setMode( selModel );
    }

    var searchString = data.filterBox.dbValue;

    // Create the search criteria to be used
    var searchCriteria = {
        parentUid: '',
        searchString: searchString,
        resourceProviderContentType: resourceProviderContentType,
        group: '',
        role: '',
        searchSubGroup: 'true',
        projectId: '',
        participantType: ''
    };

    // By default resource provider will be Awp0ResourceProvider if other resource provider exist in
    // ctx tthen it will use that
    var resourceProvider = 'Awp0ResourceProvider';
    if( appCtxSvc.ctx.workflow && appCtxSvc.ctx.workflow.resourceProvider ) {
        resourceProvider = appCtxSvc.ctx.workflow.resourceProvider;
    }

    var inputData = {
        searchInput: {
            maxToLoad: 100,
            maxToReturn: 25,
            providerName: resourceProvider,
            searchCriteria: searchCriteria,
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap: {},

            searchSortCriteria: [

            ],

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
 * @return {Promise} promise
 */
export let performSearch = function( data, dataProvider, participantType ) {
    var deferred1 = AwPromiseService.instance.defer();
    exports.performSearchInternal( data, dataProvider, participantType, deferred1 );

    return deferred1.promise;
};

export default exports = {
    addSelectedUsers,
    addUser,
    removeSelectedUsers,
    getDocumentName,
    getAttachments,
    getAttachmentTypes,
    navigate,
    populatePanelData,
    getMultiSelectMode,
    performSearchInternal,
    performSearch
};

/**
 * This factory creates a service and returns exports
 *
 * @member tcooUserPanelService
 */
app.factory( 'tcooUserPanelService', () => exports );
