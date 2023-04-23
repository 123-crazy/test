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
 * @module js/CAW0RelatedAttachmentTableService
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
function _getTreeTableColumnInfos(data) {
    var awColumnInfos = [ {
            name: 'object_name',
            propertyName: 'object_name',
            displayName: data.i18n.name,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'refrence_object',
            propertyName: 'refrence_object',
            displayName: data.i18n.referenceObject,
            typeName: 'String',
            width: 200,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'object_type',
            propertyName: 'object_type',
            displayName: data.i18n.type,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'object_desc',
            propertyName: 'object_desc',
            displayName: data.i18n.description,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'creation_date',
            propertyName: 'creation_date',
            displayName: data.i18n.creationDate,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'owning_user',
            propertyName: 'owning_user',
            displayName: data.i18n.owner,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        }
    ];
    return awColumnInfos;
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
    var awColumnInfos = _getTreeTableColumnInfos(data);

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
export let loadObjects = function() {
    var deferred = AwPromiseService.instance.defer();
    var soaInput = {
        columnConfigInput: {
            clientName: 'AWClient',
            clientScopeURI: ''
        },
        searchInput: {
            maxToLoad: 100,
            maxToReturn: 100,
            providerName: 'CAW0CAPADatasetProvider',
            searchCriteria: {
                parentUid: appCtxService.ctx.selected.uid
            },
            startIndex: 0,
            searchSortCriteria: []
        }
    };
    var policyId = propertyPolicySvc.register({
        types: [{
            name: 'Dataset',
            properties: [{
                name: 'object_name'
            },
            {
                name: 'object_type'
            },
            {
                name: 'object_desc'
            },
            {
                name: 'creation_date'
            },
            {
                name: 'owning_user'
            }
            ]
        }]
    });
    soaSvc.post('Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', soaInput).then(function (response) {
        propertyPolicySvc.unregister(policyId);
        var responseData;
        var rawAttachmentObjects = JSON.parse( response.searchResultsJSON ).objects;
        var attachmentObjects = rawAttachmentObjects.map( function( obj ) {
            return response.ServiceData.modelObjects[ obj.uid ];
        } );
        var attachmentObjectsWithSecondary = _getSecondaryObjects( attachmentObjects );
        if( attachmentObjectsWithSecondary.length > 0 ) {
            // Convert the loaded model objects into viewmodel objects
            var viewModelObjects = [];
            for( var i = 0; i < attachmentObjectsWithSecondary.length; i++ ) {
                viewModelObjects[ i ] = viewModelObjectService.constructViewModelObjectFromModelObject( attachmentObjectsWithSecondary[ i ], 'EDIT' );
            }
            attachmentObjectsWithSecondary = viewModelObjects;

            responseData = {
                totalLoaded: attachmentObjectsWithSecondary
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

/**  Function returns modelObjects
 * @param {response} response -
 * @returns {actionObjects}
 **/
function _getSecondaryObjects( attachmentObjects ) {
    var secondaryObjects = [];
    for( var i = 0; i < attachmentObjects.length; i += 2 ) {
        var primaryObject = attachmentObjects[ i + 1 ];
        if( primaryObject ) {
            var propertyDescriptor = {
                anArray: false,
                basedOn: undefined,
                compoundObjType: undefined,
                displayName: 'Refrence Object',
                fieldType: undefined,
                lovCategory: 0,
                maxArraySize: -1,
                maxLength: 0,
                minValue: undefined,
                name: 'refrence_object',
                propertyType: 2,
                propertyType2: 2,
                valueType: 9,
                constantsMap: {
                    copyFromOriginal: '1',
                    ReferencedTypeName: 'WorkspaceObject',
                    editable: '1',
                    modifiable: '1',
                    displayable: '1'
                }
            };
            var newProp = {
                dbValues: [ primaryObject.uid ],
                uiValues: [ primaryObject.props.object_name.uiValues[ 0 ] ],
                propertyDescriptor: propertyDescriptor
            };
            var temp = _.cloneDeep( cdm.getObject( attachmentObjects[ i ].uid ) );
            temp.props.refrence_object = newProp;
            secondaryObjects.push( temp );
        }
    }
    return secondaryObjects;
}

export default exports = {
    loadTreeTableColumns,
    loadObjects
};
/**
 * @memberof NgServices
 * @member correctiveActionDataService
 */
app.factory( 'CAW0RelatedAttachmentTableService', () => exports );
