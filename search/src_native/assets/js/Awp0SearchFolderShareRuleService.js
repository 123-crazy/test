// @<COPYRIGHT>@
// ===========================================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ===========================================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * A service that has implementation for the Awp0SearchFolderShareRule business object
 * whose instance is used to render the Shared With table in SWA page for Awp0SearchFolder.
 *
 * @module js/Awp0SearchFolderShareRuleService
 */

import * as app from 'app';
import soaService from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import awColumnService from 'js/awColumnService';
import searchCommonUtils from 'js/searchCommonUtils';

var searchFolderServiceName = 'Internal-Search-2020-12-SearchFolder';
var fullTextServiceName = 'Internal-AWS2-2020-05-FullTextSearch';
var finderServiceName = 'Internal-AWS2-2019-06-Finder';
var searchFolderAccessorSOAName = 'getSearchFolderAccessors';
var createOrEditSearchFoldersSOAName = 'createOrEditSearchFolders';
var performSearchSOAName = 'performSearchViewModel4';
var getSearchSettingsSOAName = 'getSearchSettings';
var removeProjectSOAInputKey = 'remove_project';
var removeAccessorSOAInputKey = 'remove_accessor';

var ruleAccessorTableLoadEvent = 'Awp0SearchFolderShareRuleAccessorsTable.load';

var searchFolderCtxName = 'searchFolder';
var groupTypeName = 'Group';
var accessorTypeName = 'POM_accessor';
var groupMemberTypeName = 'GroupMember';
var projectTypeName = 'TC_Project';
var roleTypeName = 'Role';
var removeButtonName = 'remove';
var addButtonName = 'add';

var typePersonIconName = 'typePerson48.svg';
var typeRoleIconName = 'typeRole48.svg';

var searchFolderAccessorSeparator = '\\';
var objectStringPrefix = 'Object\\:';

/**
 * Properties needed in the SOA response
 */

var policyOverrideForProject = {
    types: [  {
        name: 'TC_Project',
        properties: [ {
            name: 'project_id'
        }, {
            name: 'project_name'
        } ]
    } ]
};

var policyIOverrideForSearchFolder = {
    types: [ {
        name: 'Awp0SearchFolder',
        properties: [ {
            name: 'awp0IsShared'
        } ]
    } ]
};

var policyIOverride = {
    types: [  {
        name: 'POM_accessor',
        properties: [ {
            name: 'group',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        }, {
            name: 'role',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        }, {
            name: 'awp0CellProperties'
        }, {
            name: 'object_string'
        }, {
            name: 'awp0ThumbnailImageTicket'
        } ]
    }, {
        name: 'Group',
        properties: [ {
            name: 'name'
        },{
            name: 'awp0CellProperties'
        }, {
            name: 'object_string'
        }, {
            name: 'awp0ThumbnailImageTicket'
        } ]
    }, {
        name: 'Role',
        properties: [ {
            name: 'role_name'
        }, {
            name: 'awp0CellProperties'
        }, {
            name: 'object_string'
        }, {
            name: 'awp0ThumbnailImageTicket'
        } ]
    }, {
        name: 'TC_Project',
        properties: [ {
            name: 'project_id'
        }, {
            name: 'project_name'
        }, {
            name: 'last_mod_date'
        }, {
            name: 'creation_date'
        }, {
            name: 'owning_user'
        }, {
            name: 'awp0CellProperties'
        }, {
            name: 'object_string'
        }, {
            name: 'awp0ThumbnailImageTicket'
        } ]
    }, {
        name: 'User',
        properties: [ {
            name: 'user_name'
        }, {
            name: 'user_id'
        }, {
            name: 'awp0CellProperties'
        }, {
            name: 'object_string'
        }, {
            name: 'awp0ThumbnailImageTicket'
        } ]
    }, {
        name: 'GroupMember',
        properties: [ {
            name: 'group',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        }, {
            name: 'role',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        }, {
            name: 'user',
            modifiers: [ {
                name: 'withProperties',
                Value: 'true'
            } ]
        }, {
            name: 'awp0CellProperties'
        }, {
            name: 'object_string'
        }, {
            name: 'awp0ThumbnailImageTicket'
        } ]
    } ]
};

/**
 * Sets the active folder uid in app context.
 * @param {String} searchFolderUID - the uid of the selected active folder in the PWA.
 */

export let setSearchFolderUidInCtx = function( searchFolderUID ) {
    var searchFolderCtx = appCtxService.getCtx( searchFolderCtxName );
    if( !searchFolderCtx ) {
        searchFolderCtx = {};
        searchFolderCtx.uid = searchFolderUID;
        appCtxService.registerCtx( searchFolderCtxName, searchFolderCtx );
    } else {
        searchFolderCtx.uid = searchFolderUID;
        appCtxService.updatePartialCtx( searchFolderCtxName, searchFolderCtx );
    }
};

/**
 * filter in the shared with table.
 * @param {Array} modelObjects - modelObjects returned from getSearchFolderAccessors SOA.
 * @param {String} searchString - the search string
 * @returns {Array} results - modelObjects after the search string is applied
 */
export let searchWithinSharedTable = function( modelObjects, searchString ) {
    var results = [];
    if( searchString && searchString.length > 0 ) {
        searchString = searchString.toLowerCase();
    }
    _.forEach( modelObjects, function( accessor ) {
        if( accessor && accessor.props && accessor.props.object_string && accessor.props.object_string.uiValues && accessor.props.object_string.uiValues.length > 0 ) {
            var obj_string = accessor.props.object_string.uiValues[ 0 ];
            obj_string = obj_string.toLowerCase();
            if( obj_string.indexOf( searchString ) !== -1 ) {
                results.push( accessor );
            }
        } else {
            results.push( accessor );
        }
    } );
    return results;
};

/**
 * Gets the active folder accessors model objects by calling SOA getSearchFolderAccessors.
 * @param {Array} uids - the uids of the accessors in the SOA response.
 * @param {Array} modelObjects - the modelObjects returned in the ServiceData of the SOA response.
 * @returns {Array} finalObjects - the view model objects in the SOA response to be consumed by the data provider.
 */
export let getModelObjectsToSetInViewModel = function( uids, modelObjects ) {
    var finalObjects = [];
    _.forEach( uids, function( eachUID ) {
        if( modelObjects ) {
            _.forEach( modelObjects, function( eachModelObject ) {
                if( eachUID === eachModelObject.uid ) {
                    if( eachModelObject.type === accessorTypeName ) {
                        var groupName = eachModelObject.props.group.uiValues[0];
                        var roleName = eachModelObject.props.role.uiValues[0];
                        eachModelObject.props.awp0CellProperties.dbValues = [ objectStringPrefix + groupName + searchFolderAccessorSeparator + roleName];
                        eachModelObject.props.awp0CellProperties.uiValues = [ objectStringPrefix + groupName + searchFolderAccessorSeparator + roleName];
                        eachModelObject.props.object_string.dbValues = [groupName + searchFolderAccessorSeparator + roleName];
                        eachModelObject.props.object_string.uiValues = [groupName + searchFolderAccessorSeparator + roleName];
                        eachModelObject.modelType.constantsMap.IconFileName = typeRoleIconName;
                    } else if( eachModelObject.type === groupMemberTypeName ) {
                        var groupName2 = eachModelObject.props.group.uiValues[0];
                        var roleName2 = eachModelObject.props.role.uiValues[0];
                        var userName = eachModelObject.props.user.uiValues[0];
                        eachModelObject.props.awp0CellProperties.dbValues = [ objectStringPrefix + groupName2 + searchFolderAccessorSeparator + roleName2 + searchFolderAccessorSeparator + userName];
                        eachModelObject.props.awp0CellProperties.uiValues = [ objectStringPrefix + groupName2 + searchFolderAccessorSeparator + roleName2 + searchFolderAccessorSeparator + userName];
                        eachModelObject.props.object_string.dbValues = [groupName2 + searchFolderAccessorSeparator + roleName2 + searchFolderAccessorSeparator + userName];
                        eachModelObject.props.object_string.uiValues = [groupName2 + searchFolderAccessorSeparator + roleName2 + searchFolderAccessorSeparator + userName];
                        eachModelObject.modelType.constantsMap.IconFileName = typePersonIconName;
                    }
                    finalObjects.push( eachModelObject );
                }
            } );
        }
    } );
    return finalObjects;
};

/**
 * Gets the active folder accessors by calling SOA getSearchFolderAccessors.
 * @param {String} selectedSearchFolderUID - the uid of the selected active folder in the PWA.
 * @returns {Array} finalObjects - the view model objects in the SOA response to be consumed by the data provider.
 */
export let getSearchFolderAccessors = function( selectedSearchFolderUID, searchString ) {
    var searchFolders = [ selectedSearchFolderUID ];
    return soaService.post( searchFolderServiceName, searchFolderAccessorSOAName, {
        searchFolders: searchFolders
    }, policyIOverride ).then( function( response ) {
        var objects = response.searchFolderAndItsAccessors[selectedSearchFolderUID];
        var finalObjects = [];
        var uids = [];
        var modelObjects = response.ServiceData.modelObjects;
        var searchFolderCtx = appCtxService.getCtx( searchFolderCtxName );
        if( !searchFolderCtx ) {
            searchFolderCtx = {};
        }
        _.forEach( objects, function( eachObject ) {
            if( eachObject.uid ) {
                uids.push( eachObject.uid );
            }
        } );
        searchFolderCtx.accessors = uids;
        appCtxService.updatePartialCtx( searchFolderCtxName, searchFolderCtx );
        finalObjects = exports.getModelObjectsToSetInViewModel( uids, modelObjects );
        finalObjects = exports.searchWithinSharedTable( finalObjects, searchString );
        return finalObjects;
    } );
};

/**
 * Removes the accessor/project on the selected active folder in the Awp0SearchFolderShareRule object attached to the instance of Awp0SearchFolder.
 * @param {Array} selectedObjects - the selected view model objects in the shared with table.
 * @param {String} selectedSearchFolderUID - the active folder uid selected in the PWA.
 */

export let removeSearchFolderAccessor = function( selectedObjects, selectedSearchFolderUID ) {
    var projectUids = [];
    var accessorUids = [];

    _.forEach( selectedObjects, function( eachSelectedObject ) {
        if( eachSelectedObject && eachSelectedObject.uid && eachSelectedObject.uid.length > 0 && eachSelectedObject.type && eachSelectedObject.type.length > 0 ) {
            if( eachSelectedObject.type === projectTypeName ) {
                projectUids.push( eachSelectedObject.uid );
            } else {
                accessorUids.push( eachSelectedObject.uid );
            }
        }
    } );

    if( projectUids.length > 0 || accessorUids.length > 0 ) {
        var searchFolderAttributes = {};
        searchFolderAttributes[removeProjectSOAInputKey] = projectUids;
        searchFolderAttributes[removeAccessorSOAInputKey] = accessorUids;

        var searchFoldersInputArr = [];
        var searchFolderInput = {};
        searchFolderInput.parentFolderUID = '';
        searchFolderInput.searchFolderUID = selectedSearchFolderUID;
        searchFolderInput.reportDefinitionUID = '';
        searchFolderInput.searchFolderAttributes = searchFolderAttributes;

        searchFolderInput.searchCriteria = [];
        searchFoldersInputArr.push( searchFolderInput );
        var searchFolderCtx = appCtxService.getCtx( searchFolderCtxName );
        searchFolderCtx.disableRemoveButton = true;
        var origValueForAddButton = searchFolderCtx.disableAddButton;
        searchFolderCtx.disableAddButton = true;
        appCtxService.updatePartialCtx( searchFolderCtxName, searchFolderCtx );
        soaService.post( searchFolderServiceName, createOrEditSearchFoldersSOAName, {
            input: searchFoldersInputArr
        }, policyIOverrideForSearchFolder ).then( function( response ) {
            if( !response.ServiceData.partialErrors ) {
                eventBus.publish( ruleAccessorTableLoadEvent );
            }
        } ).then( function() {
            searchFolderCtx.disableRemoveButton = false;
            searchFolderCtx.disableAddButton = origValueForAddButton;
            appCtxService.updatePartialCtx( searchFolderCtxName, searchFolderCtx );
        } );
    }
};

/**
 * Adds the accessor/project on the selected active folder in the Awp0SearchFolderShareRule object attached to the instance of Awp0SearchFolder.
 * @param {Array} selectedObjects - the selected view model objects in the projects/Organization table.
 * @param {String} selectedSearchFolderUID - the active folder uid selected in the PWA.
 */

export let addSearchFolderAccessor = function( selectedObjects, selectedSearchFolderUID ) {
    var uidsForSOACall = [];
    var accessorInfoArray = [];
    _.forEach( selectedObjects, function( eachSelectedObject ) {
        if( eachSelectedObject && eachSelectedObject.uid && eachSelectedObject.type === projectTypeName ) {
            uidsForSOACall.push( eachSelectedObject.uid );
        } else if( eachSelectedObject && eachSelectedObject.uid && eachSelectedObject.type === groupMemberTypeName ) {
            var userAccessorInfo = {};
            userAccessorInfo.userUID = eachSelectedObject.object.uid;
            userAccessorInfo.roleUID = eachSelectedObject.parent.object.uid;
            userAccessorInfo.groupUID = eachSelectedObject.parent.parent.object.uid;
            accessorInfoArray.push( userAccessorInfo );
        } else if( eachSelectedObject && eachSelectedObject.uid && eachSelectedObject.type === roleTypeName ) {
            var roleAccessorInfo = {};
            roleAccessorInfo.roleUID = eachSelectedObject.object.uid;
            roleAccessorInfo.groupUID = eachSelectedObject.parent.object.uid;
            roleAccessorInfo.userUID = '';
            accessorInfoArray.push( roleAccessorInfo );
        } else if( eachSelectedObject && eachSelectedObject.uid && eachSelectedObject.type === groupTypeName ) {
            var groupAccessorInfo = {};
            groupAccessorInfo.groupUID = eachSelectedObject.object.uid;
            groupAccessorInfo.roleUID = '';
            groupAccessorInfo.userUID = '';
            accessorInfoArray.push( groupAccessorInfo );
        }
    } );

    var accessorsCtx = appCtxService.getCtx( searchFolderCtxName );
    if( !accessorsCtx ) {
        accessorsCtx = {};
        appCtxService.updatePartialCtx( searchFolderCtxName, accessorsCtx );
    }

    var searchFolderAttributes = {
        shared_projects: uidsForSOACall
    };

    var searchFoldersInputArr = [];
    var searchFolderInput = {};
    searchFolderInput.parentFolderUID = '';
    searchFolderInput.searchFolderUID = selectedSearchFolderUID;
    searchFolderInput.reportDefinitionUID = '';
    searchFolderInput.searchFolderAttributes = searchFolderAttributes;
    searchFolderInput.searchCriteria = [];
    searchFolderInput.searchFolderAccessors = accessorInfoArray;
    searchFoldersInputArr.push( searchFolderInput );
    accessorsCtx.disableAddButton = true;
    var origValueForRemoveButton = accessorsCtx.disableRemoveButton;
    accessorsCtx.disableRemoveButton = true;
    appCtxService.updatePartialCtx( searchFolderCtxName, accessorsCtx );
    soaService.post( searchFolderServiceName, createOrEditSearchFoldersSOAName, {
        input: searchFoldersInputArr
    }, policyIOverrideForSearchFolder ).then( function( response ) {
        if( !response.ServiceData.partialErrors ) {
            eventBus.publish( ruleAccessorTableLoadEvent );
        }
    } ).then( function() {
        accessorsCtx.disableAddButton = false;
        accessorsCtx.disableRemoveButton = origValueForRemoveButton;
        appCtxService.updatePartialCtx( searchFolderCtxName, accessorsCtx );
    } );
};

/**
 * @param {Object} response - the SOA response from performSearchViewModel4
 * @returns {Array} finalObjects - Model objects of type TC_Project from the SOA response
 */
export let getProjects = function( response ) {
    var searchResults = JSON.parse( response.searchResultsJSON );
    var objects = searchResults.objects;
    var finalObjects = [];
    var uids = [];
    var modelObjects = response.ServiceData.modelObjects;
    _.forEach( objects, function( eachObject ) {
        if( eachObject.uid ) {
            uids.push( eachObject.uid );
        }
    } );
    _.forEach( uids, function( eachUID ) {
        if( modelObjects ) {
            _.forEach( modelObjects, function( eachModelObject ) {
                if( eachUID === eachModelObject.uid ) {
                    finalObjects.push( eachModelObject );
                }
            } );
        }
    } );
    return finalObjects;
};

/**
 *
 * @param {Object} searchInput - search input for the SOA
 * @param {Object} columnConfigInput - column configuration for the SOA
 * @param {Boolean} inflateProperties - boolean flag to send the decision to inflate properties or not
 * @param {*} saveColumnConfigData - the save column config input for the SOA
 * @returns projects - projects found in the SOA output.
 */
export let doProjectTableSearch = function( searchInput, columnConfigInput, inflateProperties, saveColumnConfigData ) {
    return soaService.postUnchecked( finderServiceName, performSearchSOAName, {
        searchInput: searchInput,
        columnConfigInput: columnConfigInput,
        inflateProperties: inflateProperties,
        saveColumnConfigData: saveColumnConfigData
    }, policyOverrideForProject ).then( function( response ) {
        var projects = [];
        if( !response.ServiceData.partialErrors ) {
            projects = exports.getProjects( response );
        }
        return projects;
    } );
};

/**
 * checks if user has write privilege on the active folder so that we can render the add/remove accessor commands based on that.
 * @param {String} objectUID - active folder UID.
 */
export let hasWriteAccessPrivilege = function( objectUID ) {
    var searchFolderCtx = appCtxService.getCtx( searchFolderCtxName );
    if( !searchFolderCtx ) {
        searchFolderCtx = {};
        appCtxService.registerCtx( searchFolderCtxName, searchFolderCtx );
    }
    soaService.post( fullTextServiceName, getSearchSettingsSOAName, {
        searchSettingInput: {
            inputSettings: {
                performAccessCheckOnActiveFolder: [ objectUID ]
            }
        }
    } ).then( function( result ) {
        if( result && result.outputValues && result.outputValues.performAccessCheckOnActiveFolder && result.outputValues.performAccessCheckOnActiveFolder[0] === 'true' ) {
            searchFolderCtx.showAddRemoveButtons = true;
        } else {
            searchFolderCtx.showAddRemoveButtons = false;
        }
        appCtxService.updatePartialCtx( searchFolderCtxName, searchFolderCtx );
    } );
};

/**
 * Get the default page size used for max to load/return.
 * @param {Array|Object} defaultPageSizePreference - default page size from server preferences
 * @returns {Number} The amount of objects to return from a server SOA response.
 */
export let getDefaultPageSize = function( defaultPageSizePreference ) {
    return searchCommonUtils.getDefaultPageSize( defaultPageSizePreference );
};

/**
 * disable the add/remove button according to the selection.
 * If something is selected in Org Table, then remove button should be disabled, if some object is selected in Shared with table, then add button should be disabled.
 * @param {String} buttonName - name of the button ( add/remove )
 * @param {String} dataProvider - dataProvider which is having selected objects is passed.
 */
export let disableButton = function( buttonName, dataProvider ) {
    var searchFolderCtx = appCtxService.getCtx( searchFolderCtxName );
    if( !searchFolderCtx ) {
        searchFolderCtx = {};
    }
    var selection = dataProvider.selectedObjects;
    if( selection && selection.length > 0 ) {
        if( buttonName === removeButtonName ) {
            searchFolderCtx.disableRemoveButton = true;
            searchFolderCtx.disableAddButton = false;
        } else if( buttonName === addButtonName ) {
            searchFolderCtx.disableAddButton = true;
            searchFolderCtx.disableRemoveButton = false;
        }
        appCtxService.updatePartialCtx( searchFolderCtxName, searchFolderCtx );
    }
};

/**
 * To clear all the context related to Organization Tree
 */
export let unRegisterOrgContext = function() {
    appCtxService.unRegisterCtx( 'orgTreeData' );
    appCtxService.unRegisterCtx( 'initialHierarchy' );
    appCtxService.unRegisterCtx( 'parents' );
    appCtxService.unRegisterCtx( 'currentLevel' );
    appCtxService.unRegisterCtx( 'expansionCounter' );
    appCtxService.unRegisterCtx( 'selectedTreeNode' );
    appCtxService.unRegisterCtx( 'treeLoadInput' );
};

/**
 * Loads columns for the org table
 * @param {object} uwDataProvider data provider
 * @param {Object} data vmData
 * @return {object} promise for async call
 */
export let loadColumnsForOrgTable = function( uwDataProvider, data ) {
    var deferred = AwPromiseService.instance.defer();

    var awColumnInfos = [];

    awColumnInfos.push( awColumnService.createColumnInfo( {
        name: 'Test',
        isTreeNavigation: true,
        isTableCommand: false,
        enableSorting: false,
        enableCellEdit: false,
        width: 375,
        minWidth: 365,
        enableColumnMoving: false,
        enableColumnResizing: false,
        enableFiltering: false,
        frozenColumnIndex: -1
    } ) );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );
    data.initialExpand = false;
    return deferred.promise;
};

/* eslint-disable-next-line valid-jsdoc*/
const exports = {
    getSearchFolderAccessors,
    removeSearchFolderAccessor,
    addSearchFolderAccessor,
    setSearchFolderUidInCtx,
    getProjects,
    doProjectTableSearch,
    getDefaultPageSize,
    disableButton,
    getModelObjectsToSetInViewModel,
    hasWriteAccessPrivilege,
    searchWithinSharedTable,
    loadColumnsForOrgTable,
    unRegisterOrgContext
};

export default exports;

/**
 * Register the service
 *
 * @memberof NgServices
 * @member Awp0SearchFolderShareRuleService
 *
 *@return {*} exports
 */
app.factory( 'Awp0SearchFolderShareRuleService', () => exports );
