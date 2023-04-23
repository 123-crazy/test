//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define,
 */

/**
 * @module js/tcChangeOwnerService
 */
import * as app from 'app';
import adapterSvc from 'js/adapterService';
import _ from 'lodash';

var exports = {};

/**
 * Cached reference to adapter service
 */

/**
 * Do the changeOwnership call to transfer the owner
 * 
 * @param {data} data - The qualified data of the viewModel
 * @param {selectedObjects} selectedObjects - selected objects
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 * 
 */
export let getChangeOwnerInput = function( data, selectedObjects, dataProvider ) {

    // Check if data provider is null or undefined then no need to process further
    // and return from here
    if( !dataProvider ) {
        return;
    }

    var soaInput = [];
    var groupCriteria = {};
    var objectCriteria = {};
    var ownerCriteria = {};
    var inputCriteria = {};

    var selectedObjFrompanel = data.dataProviders.userPerformSearch.selectedObjects[ 0 ];

    if( selectedObjFrompanel && selectedObjFrompanel.props && selectedObjFrompanel.props.user ) {
        ownerCriteria = {
            "uid": selectedObjFrompanel.props.user.dbValues[ 0 ],
            "type": "User"
        };
    }

    if( selectedObjFrompanel && selectedObjFrompanel.props && selectedObjFrompanel.props.group ) {
        groupCriteria = {
            "uid": selectedObjFrompanel.props.group.dbValues[ 0 ],
            "type": "Group"
        };
    }

    var adaptedObjects = [];
    adaptedObjects = adapterSvc.getAdaptedObjectsSync( selectedObjects );

    if( adaptedObjects && adaptedObjects.length > 0 ) {
        _.forEach( adaptedObjects, function( adaptedObject ) {

            if( adaptedObject && adaptedObject.uid && adaptedObject.type ) {
                objectCriteria = {
                    "uid": adaptedObject.uid,
                    "type": adaptedObject.type
                };
            }

            inputCriteria = {
                "group": groupCriteria,
                "object": objectCriteria,
                "owner": ownerCriteria
            };

            soaInput.push( inputCriteria );
        } );
    }
    return soaInput;
};

/**
 * This factory creates a service and returns exports
 * 
 * @member tcChangeOwnerService
 */

export default exports = {
    getChangeOwnerInput
};
app.factory( 'tcChangeOwnerService', () => exports );
