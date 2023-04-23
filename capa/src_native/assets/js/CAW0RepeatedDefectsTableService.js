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
 * @module js/CAW0RepeatedDefectsTableService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import awColumnSvc from 'js/awColumnService';
import awTableSvc from 'js/awTableService';
import iconSvc from 'js/iconService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import viewModelObjectService from 'js/viewModelObjectService';
import eventBus from 'js/eventBus';
import assert from 'assert';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';

/**
 */
var _numInitialTopChildren = 147;

/**
 */
var _maxTreeLevel = 3;

var relatedWhys = [];

/**
 * Map of nodeId of a 'parent' TableModelObject to an array of its 'child' TableModelObjects.
 */
var _mapNodeId2ChildArray = {};
var exports = {};
/**
 * @return {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 */
function _getTreeTableColumnInfos( data ) {
    return [ {
            name: 'object_name',
            propertyName: 'object_name',
            displayName: data.i18n.name,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'item_id',
            propertyName: 'item_id',
            displayName: data.i18n.caw0Id,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'object_desc',
            propertyName: 'object_desc',
            displayName: data.i18n.description,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'c2_capa_category',
            propertyName: 'c2_capa_category',
            displayName: data.i18n.caw0Category,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'CMMaturity',
            propertyName: 'CMMaturity',
            displayName: data.i18n.caw0maturity,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'CMDisposition',
            propertyName: 'CMDisposition',
            displayName: data.i18n.caw0disposition,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'creation_date',
            propertyName: 'creation_date',
            displayName: data.i18n.creationDate,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'last_mod_date',
            propertyName: 'last_mod_date',
            displayName: data.i18n.caw0dateModified,
            typeName: 'ItemRevision',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'c2_capa_owner',
            propertyName: 'c2_capa_owner',
            displayName: data.i18n.caw0teamLeader,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        }
    ];
}

/**
 * @param {Object} uwDataProvider - An Object (usually a UwDataProvider) on the DeclViewModel on the $scope this
 *            action function is invoked from.
 * @return {Promise} A Promise that will be resolved with the requested data when the data is available.
 *
 * <pre>
 * {
 *     columnInfos : {AwTableColumnInfoArray} An array of columns related to the row data created by this service.
 * }
 * </pre>
 */
export let loadTreeTableColumns = function( data, uwDataProvider ) {
    var deferred = AwPromiseService.instance.defer();
    var type;
    appCtxService.ctx.treeVMO = uwDataProvider;
    var awColumnInfos = _getTreeTableColumnInfos( data );

    _.forEach( awColumnInfos, function( columnDef ) {
        if( type && type.propertyDescriptorsMap[ columnDef.name ] ) {
            columnDef.displayName = type.propertyDescriptorsMap[ columnDef.name ].displayName;
        }
    } );

    uwDataProvider.columnConfig = {
        columns: awColumnInfos
    };

    deferred.resolve( {
        columnInfos: awColumnInfos
    } );

    return deferred.promise;
};

/**
 * This method first gets the qc0SpecificationList for characteristics group and loads the object
 *@returns {Object} promise
 */
export let loadObjects = function( ctx, searchSortCriteria, columnFilters ) {
    var deferred = AwPromiseService.instance.defer();
    var isNoneflag = !ctx.showProblemItems && !ctx.showFailures ? 'true' : 'false';
    var isOnlyPRflag = ctx.showProblemItems && !ctx.showFailures ? 'true' : 'false';
    var isOnlyFailureflag = !ctx.showProblemItems && ctx.showFailures ? 'true' : 'false';
    var isBothflag = ctx.showProblemItems && ctx.showFailures ? 'true' : 'false';
    var searchCriteria = {
        parentUid: ctx.xrtSummaryContextObject.uid,
        isNoneflag: isNoneflag,
        isOnlyPRflag: isOnlyPRflag,
        isOnlyFailureflag: isOnlyFailureflag,
        isBothflag: isBothflag
    };

    ctx.searchCriteria = searchCriteria;
    ctx.searchSortCriteria = searchSortCriteria;
    ctx.columnFilters = columnFilters;

    var soaInput = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: 'CAW0RepeatedProbDefects'
        },
        searchInput: {
            maxToLoad: 100,
            maxToReturn: 100,
            providerName: 'CAW0RepeatedDefectsProvider',
            searchCriteria: searchCriteria,
            startIndex: 0,
            searchSortCriteria: searchSortCriteria,
            columnFilters: columnFilters
        }
    };
    var policyId = propertyPolicySvc.register( {
        types: [ {
            name: 'Dataset',
            properties: [ {
                    name: 'object_name'
                },
                {
                    name: 'item_id'
                },
                {
                    name: 'object_desc'
                },
                {
                    name: 'c2_capa_category'
                },
                {
                    name: 'CMMaturity'
                },
                {
                    name: 'CMDisposition'
                },
                {
                    name: 'creation_date'
                },
                {
                    name: 'last_mod_date'
                },
                {
                    name: 'c2_capa_owner'
                }
            ]
        } ]
    } );
    soaSvc.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput ).then( function( response ) {
        propertyPolicySvc.unregister( policyId );
        var responseData;
        var rawAttachmentObjects = JSON.parse( response.searchResultsJSON ).objects;
        var attachmentObjects = rawAttachmentObjects.map( function( obj ) {
            return response.ServiceData.modelObjects[ obj.uid ];
        } );
        if( attachmentObjects.length > 0 ) {
            // Convert the loaded model objects into viewmodel objects
            var viewModelObjects = [];
            for( var i = 0; i < attachmentObjects.length; i++ ) {
                viewModelObjects[ i ] = viewModelObjectService.constructViewModelObjectFromModelObject( attachmentObjects[ i ], 'EDIT' );
            }
            attachmentObjects = viewModelObjects;

            responseData = {
                totalLoaded: attachmentObjects,
                columnConfig: response.columnConfig
            };
            deferred.resolve( responseData );
        } else {
            //If the group doesn't have any specifications then return an empty list
            responseData = {
                totalLoaded: []
            };
            deferred.resolve( responseData );
        }
    }, function( reason ) {
        deferred.reject( reason );
    } );

    return deferred.promise;
};

export let toggleFilterValues = function( toggleKey, viewToggleState, ctx ) {
    var isTrue = viewToggleState === 'true';
    if( _.isEqual( toggleKey, 'ShowProblemItems' ) ) {
        ctx.showProblemItems = isTrue;
    } else if( _.isEqual( toggleKey, 'ShowFailures' ) ) {
        ctx.showFailures = isTrue;
    }
    eventBus.publish( 'caw0.refreshRepeatedDefectsObjectSet' );
};

export let updateExportToExcelContext = function( data, dataProvider, columnProvider, ctx ) {
    ctx.updateExportToExcelContext = {
        providerName: 'RepeatedDefectsTableProvider',
        dataProvider: dataProvider,
        columnProvider: columnProvider,
        searchCriteria: ctx.searchCriteria,
        displayTitle: '',
        vmo: ctx.xrtSummaryContextObject
    };
};

/**
 * set command context.
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx}  ctx  - Context Object
 */
export let setCommandContextProbDefectSearchCriteria = function( data, ctx ) {
    if ( !data.commandContext ) {
        data.commandContext = {};
    }

    data.commandContext.searchCriteria = ctx.searchCriteria;

    let contextObjectName = ctx.xrtSummaryContextObject.props.object_name.dbValues[0];
    data.commandContext.displayTitle = contextObjectName.replace( /\s/g, '_' ) + '_probDefects';
};

export default exports = {
    loadTreeTableColumns,
    loadObjects,
    toggleFilterValues,
    updateExportToExcelContext,
    setCommandContextProbDefectSearchCriteria
};
/**
 * @memberof NgServices
 * @member correctiveActionDataService
 */
app.factory( 'CAW0RepeatedDefectsTableService', () => exports );
