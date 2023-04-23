//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0AddResourcePool
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
/**
 * Define public API
 */
var exports = {};
var _resourcePoolNonModifiableCols = [ 'group', 'role' ];

/**
 * get selected radio button
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let getResourcePoolEvent = function( data ) {
    return data.resourcePoolRadioButton.dbValue;
};

/**
 * prepare the input for set properties SOA call to add resource Pool
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 */
export let removeSubscribedResourcePools = function( data, ctx ) {
    var objectlist = data.objectsWithProjectList.modelObjects;
    var selectedUids = [];
    _.forEach( ctx.mselected, function( resPool ) {
        selectedUids.push( resPool.uid );
    } );

    var userInbox;
    var taskInbox = [];
    for( var key in objectlist ) {
        var obj = objectlist[ key ];
        if( obj.type === 'User_Inbox' && obj.props.owning_user.dbValues[0] === ctx.user.uid ) {
            userInbox = obj;
        } else if( obj.type === 'TaskInbox' ) {
            taskInbox.push( obj );
        }
    }

    var deleteInputs = [];
    var relationType = 'contents';
    var clientId = '';
    var userInbox_uid_type = {};

    if( userInbox && userInbox.uid ) {
        userInbox_uid_type.uid = userInbox.uid;
        userInbox_uid_type.type = userInbox.type;
    }

    taskInbox.forEach( function( task_inbox ) {
        var taskowninguser = task_inbox.props.owner.dbValues;
        taskowninguser.forEach( function( task_owninguser ) {
            selectedUids.forEach( function( uid ) {
                if( task_owninguser === uid ) {
                    var inputForDelete = {};
                    var taskInbox_uid_type = {};
                    taskInbox_uid_type.uid = task_inbox.uid;
                    taskInbox_uid_type.type = task_inbox.type;

                    inputForDelete.primaryObject = userInbox_uid_type;
                    inputForDelete.secondaryObject = taskInbox_uid_type;
                    inputForDelete.relationType = relationType;
                    inputForDelete.clientId = clientId;

                    deleteInputs.push( inputForDelete );
                }
            } );
        } );
    } );

    return deleteInputs;
};

/**
 * prepare the input for set properties SOA call to add resource Pool
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} dataProvider - The data provider that will be used to get the correct content
 */
export let prepareSubscribeResourcePoolInput = function( data, ctx ) {
    var inputData = [];

    var infoObj = {};

    infoObj.object = cdm.getObject( ctx.user.uid );
    var temp = {};
    var selected = data.dataProviders.getResourcePool.selectedObjects;
    var vecNameVal = [];
    var values = [];
    temp.name = 'subscribed_resourcepools';
    selected.forEach( function( selectedResPool ) {
        values.push( selectedResPool.uid );
    } );
    temp.values = values;
    vecNameVal.push( temp );

    infoObj.vecNameVal = vecNameVal;

    inputData.push( infoObj );

    return inputData;
};


export let processResourcePoolObjects = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var resourcePools = [];
    if( response.searchResultsJSON ) {
        var searchResults = parsingUtils.parseJsonString( response.searchResultsJSON );
        if( searchResults ) {
            for( var x = 0; x < searchResults.objects.length; ++x ) {
                var uid = searchResults.objects[ x ].uid;
                var obj = response.ServiceData.modelObjects[ uid ];
                if( obj ) {
                    resourcePools.push( obj );
                }
            }
        }
    }
    return resourcePools;
};

export let setNonModifiablePropForResourcePool = function( response ) {
    for( var index = 0; index < response.columnConfig.columns.length; index++ ) {
        if( _resourcePoolNonModifiableCols.indexOf( response.columnConfig.columns[ index ].propertyName ) !== -1 ) {
            response.columnConfig.columns[ index ].modifiable = false;
        }
    }
    return response.columnConfig;
};

export let getRadioButtonString = function( data ) {
    return JSON.stringify( data.resourcePoolRadioButton.dbValue );
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0AddResourcePool
 */

export default exports = {
    getResourcePoolEvent,
    removeSubscribedResourcePools,
    prepareSubscribeResourcePoolInput,
    getRadioButtonString,
    processResourcePoolObjects,
    setNonModifiablePropForResourcePool
};
app.factory( 'Awp0AddResourcePool', () => exports );
