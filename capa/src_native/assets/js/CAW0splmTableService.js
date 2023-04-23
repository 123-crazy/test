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
 * @module js/CAW0splmTableService
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
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'qam0Comment',
            propertyName: 'qam0Comment',
            displayName: data.i18n.comment,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'fnd0ResponsibleUser',
            propertyName: 'fnd0ResponsibleUser',
            displayName: data.i18n.caw0ResponsibleUser,
            typeName: 'String',
            width: 200,
            modifiable: false,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'qam0DueDate',
            propertyName: 'qam0DueDate',
            displayName: data.i18n.dueDate,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'qam0QualityActionStatus',
            propertyName: 'qam0QualityActionStatus',
            displayName: data.i18n.qualityActionStatus,
            typeName: 'Qam0QualityAction',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'qam0CompletionDate',
            propertyName: 'qam0CompletionDate',
            displayName: data.i18n.completionDate,
            typeName: 'String',
            width: 200,
            modifiable: true,
            enableColumnResizing: true,
            enableColumnMoving: false
        },
        {
            name: 'caw0visibleInReport',
            propertyName: 'caw0visibleInReport',
            displayName: data.i18n.visibleInReport,
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
export let loadObjects = function() {
    var deferred = AwPromiseService.instance.defer();
    if( appCtxService.ctx.selectedCorrectiveAction && appCtxService.ctx.selectedCorrectiveAction !== null && Object.keys( appCtxService.ctx.selectedCorrectiveAction ).length !== 0 ) {
        soaSvc.post( 'Core-2007-09-DataManagement', 'loadObjects', {
            uids: appCtxService.ctx.selectedCorrectiveAction.props.qam0DependentQualityActions.dbValues
        } ).then( function( response ) {
            var responseData;
            if( response.plain !== undefined ) {
                var values = response.plain.map( function( Objuid ) {
                    return response.modelObjects[ Objuid ];
                } );
                // Convert the loaded model objects into viewmodel objects
                var viewModelObjects = [];
                for( var i = 0; i < values.length; i++ ) {
                    viewModelObjects[ i ] = viewModelObjectService.constructViewModelObjectFromModelObject( values[ i ], 'EDIT' );
                }
                values = viewModelObjects;

                responseData = {
                    totalLoaded: values
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
    } else {
        //If the group doesn't have any specifications then return an empty list
        var responseData = {
            totalLoaded: []
        };
        deferred.resolve( responseData );
    }

    return deferred.promise;
};

/**
 * Method to set properties on failure cause and effect Business Object modifiable
 * @param {Object} columnConfig - columnConfig to set the properties non-modifiable
 * @returns {Object}
 */

export let setNonModifiablePropForCOEActions = function( data ) {
    var config = data;
    if( data.columnInfos.length > 0 ) {
        for( var index = 0; index < data.columnInfos.length; index++ ) {
            //Make status and qam0CompletionDate
            if( data.columnInfos[ index ].propertyName === 'qam0QualityActionStatus' || data.columnInfos[ index ].propertyName === 'qam0CompletionDate' ) {
                data.columnInfos[ index ].modifiable = false;
            }
        }
        return data.columnInfos;
    }
};

export default exports = {
    loadTreeTableColumns,
    loadObjects,
    setNonModifiablePropForCOEActions
};
/**
 * @memberof NgServices
 * @member correctiveActionDataService
 */
app.factory( 'CAW0splmTableService', () => exports );
