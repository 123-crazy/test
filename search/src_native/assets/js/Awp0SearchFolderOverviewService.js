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
 * A service that has implementation for Contents Section for Active Folder in Secondary work area.
 *
 * @module js/Awp0SearchFolderOverviewService
 */

import * as app from 'app';
import soaService from 'soa/kernel/soaService';
import searchCommonUtils from 'js/searchCommonUtils';
import searchFolderCommonService from 'js/searchFolderCommonService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var getPropertiesServiceName = 'Core-2006-03-DataManagement';
var getPropertiesSOAName = 'getProperties';
var clientScopeURIFullTextSearch = 'Awp0SearchResults';
var clientScopeURIAdvancedSearch = 'Awp0AdvancedSearch';

var policyForSearchTypeAttribute = {
    types: [  {
        name: 'Awp0SearchFolder',
        properties: [ {
            name: 'awp0SearchType'
        } ]
    } ]
};
/**
 *  update the display for criteria and filters
 * @function updateOverviewCriteriaAndFilters
 *
 * @param {Object}data - view model data
 * @param {Object}eventData - eventData
 */
export let updateOverviewCriteriaAndFilters = function( data, eventData ) {
    let awp0SearchType = eventData.awp0SearchType.dbValues[ 0 ];
    let awp0Rule = eventData.awp0Rule;
    let uiValues = awp0Rule.uiValues;
    if(  awp0SearchType === '1' || awp0SearchType === '3'  ) {
        let criteria = uiValues[ 0 ];
        data.searchFolderCriteria.uiValue = criteria.substring( criteria.indexOf( ':' ) + 1, criteria.length );
    } else if( awp0SearchType === '2' ) {
        data.searchFolderCriteria.uiValue = uiValues[ 0 ];
    }
    if ( awp0SearchType === '2' ) {
        data.searchFolderFilters.displayValues = searchFolderCommonService.processAttributes( uiValues );
    } else{
        data.searchFolderFilters.displayValues = _.slice( uiValues, 1, uiValues.length );
    }
};
/**
 * getProperties SOA call to get the awp0IsShared property for the selected Active Folder.
 * @param {Array} objects - array of objects , each with its uid and type.
 * @param {Array} attributes - array of attributes , which are being asked from the server.
 * @param {Object} data - view model data.
 */
export let getPropertiesForAwp0SearchType = function( objects, attributes, data ) {
    if( appCtxService.ctx.editInProgress ) {
        return;
    }
    var objectUID = objects[0].uid;
    soaService.post( getPropertiesServiceName, getPropertiesSOAName, {
        objects: objects,
        attributes: attributes
    }, policyForSearchTypeAttribute ).then( function( response ) {
        var modelObject = null;
        if( response && response.modelObjects ) {
            modelObject = response.modelObjects[objectUID];
        }

        var defaultValue;
        if( modelObject && modelObject.props ) {
            var props = modelObject.props;
            defaultValue = props.awp0SearchType;
            let eventData = {
                awp0SearchType: props.awp0SearchType,
                awp0Rule: props.awp0Rule
            };
            eventBus.publish( 'searchFolder.updateCriteriaAndFilters', eventData );
        }

        data.clientScopeURI = clientScopeURIFullTextSearch;
        if( defaultValue ) {
            if( defaultValue.dbValues[ 0 ] && ( defaultValue.dbValues[ 0 ] === '1' || defaultValue.dbValues[ 0 ] === '3' ) ) {
                data.clientScopeURI = clientScopeURIFullTextSearch;
                data.columnConfigId = 'searchResultsColConfig';
            } else if ( defaultValue.dbValues[ 0 ] && defaultValue.dbValues[ 0 ] === '2' ) {
                data.clientScopeURI = clientScopeURIAdvancedSearch;
                data.columnConfigId = 'advancedSearchResultsColConfig';
            }
        }
        data.callDataProvider = true;
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
 * Get the correct sortCriteria constructed for Full Text Search related Contents section for Active Folder.
 * @param {Array} sortCriteria - sort criteria constructed from view model.
 * @param {String} clientScopeURI - client scope.
 * @param {Object} columnConfig - columns returned in SOA response.
 * @returns {Array} The sort criteria containing TypeName.propName for Full Text Search, same as input sort criteria if otherwise.
 */
export let getSearchFolderContentsSortCriteria = function( sortCriteria, clientScopeURI, columnConfig ) {
    if( clientScopeURI === clientScopeURIFullTextSearch ) {
        if( columnConfig ) {
            var columns = columnConfig.columns;
            if( columns && columns.length > 0 && sortCriteria && sortCriteria.length > 0 ) {
                var index = _.findIndex( columns, function( o ) {
                    return o.propertyName === sortCriteria[ 0 ].fieldName;
                } );
                if( index > -1 ) {
                    sortCriteria[ 0 ].fieldName = columns[ index ].typeName + '.' + columns[ index ].propertyName;
                }
            }
        }
    }
    return sortCriteria;
};

/**
 * sets the searchFolder with the context which is needed for the export to excel panel and also for the select all/selection mode commands for list/image view.
 * @param {Object} data - viewModel data.
 * @param {Object} dataProviders - dataProvider information.
 * @returns {Object} contextObject - The context object to be set in searchFolder.
 */
export let setExportPanelContextForSearchFolder2 = function( data, dataProviders ) {
    return {
        providerName: 'Awp0ObjectSetRowProvider',
        dataProvider: dataProviders.dataProviders.listDataProvider,
        searchCriteria: {
            objectSet: 'contents.WorkspaceObject',
            parentUid: appCtxService.ctx.xrtSummaryContextObject.uid,
            returnTargetObjs: 'true',
            exportActiveFolderContents: 'true'
        }
    };
};

/**
 * sets the searchFolder with the context which is needed for the export to excel panel and also for the select all/selection mode commands for table/compare view.
 * @param {Object} data - viewModel data.
 * @param {Object} dataProviders - dataProvider information.
 * @returns {Object} contextObject - The context object to be set in searchFolder.
 */
export let setExportPanelContextForSearchFolder1 = function( data, dataProviders ) {
    return {
        providerName: 'Awp0ObjectSetRowProvider',
        dataProvider: dataProviders.dataProviders.gridDataProvider,
        columnProvider: dataProviders.columnProviders.clientScopeUI,
        searchCriteria: {
            objectSet: 'contents.WorkspaceObject',
            parentUid: appCtxService.ctx.xrtSummaryContextObject.uid,
            returnTargetObjs: 'true',
            exportActiveFolderContents: 'true'
        }
    };
};

const exports = {
    updateOverviewCriteriaAndFilters,
    getPropertiesForAwp0SearchType,
    getDefaultPageSize,
    getSearchFolderContentsSortCriteria,
    setExportPanelContextForSearchFolder1,
    setExportPanelContextForSearchFolder2
};

export default exports;

/**
 * Register the service
 *
 * @memberof NgServices
 * @member Awp0SearchFolderOverviewService
 *
 *@return {*} exports
 */
app.factory( 'Awp0SearchFolderOverviewService', () => exports );
