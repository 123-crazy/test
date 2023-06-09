// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * @module js/AssignTaskDeliverable
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import smConstants from 'js/ScheduleManagerConstants';
import dms from 'soa/dataManagementService';
import commandPanelService from 'js/commandPanel.service';
import _ from 'lodash';

import 'js/listBoxService';
import 'js/appCtxService';

var exports = {};

/**
 * Check is selected object from same Schedule.
 *
 * @param {data} data - The qualified data of the viewModel
 * @throw deliverableDiffSchError - if selected object are from different schedule.
 */

var checkScheduleTags = function( selected ) {
    var _temp = selected[ '0' ].props.schedule_tag.dbValues[ 0 ];
    if( selected.length > 0 ) {
        for( var i = 1; i < selected.length; i++ ) {
            if( _temp.indexOf( selected[ i ].props.schedule_tag.dbValues[ 0 ] ) === -1 ) {
                throw 'deliverableDiffSchError';
            }
        }
    }
};

/**
 * Check the object type of selected object
 *
 * @param {data} data - The qualified data of the viewModel
 * @throw deliverableTaskTypeError - Selected object type is not valid type for use case
 */

var checkForObjectTypes = function( selected ) {
    for( var i = 0; i < selected.length; i++ ) {
        if( cmm.isInstanceOf( 'Fnd0ProxyTask', selected[ i ].modelType ) ) {
            throw 'deliverableTaskTypeError';
        }
        var taskType = selected[ i ].props.task_type.dbValues[ 0 ];

        if( taskType !== smConstants.TASK_TYPE.T && taskType !== smConstants.TASK_TYPE.M &&
            taskType !== smConstants.TASK_TYPE.G ) {
            throw 'deliverableTaskTypeError';
        }
    }
};

/**
 * Validation for assign Schedule Deliverable to Task
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - Context Object
 */
var assignSchDelValidation = function( data, ctx ) {
    var selected = ctx.mselected;
    checkForObjectTypes( selected );
    checkScheduleTags( selected );

    for( var i = 0; i < selected.length; i++ ) {
        var workflowProcess = selected[ i ].props.workflow_process.dbValues[ 0 ];
        if( workflowProcess !== null && workflowProcess.length > 0 ) {
            throw 'deliverableWorkflowError';
        }
    }
};

export let openAssignScheduleDeliverablePanel = function( commandId, location, ctx, data ) {
    assignSchDelValidation( data, ctx );
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Parse the perform search response and return the correct output data object
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} response - The response of performSearch SOA call
 * @return {Object} - outputData object that holds the correct values .
 */
var processProviderResponse = function( data, response ) {
    var outputData;
    // Check if response is not null and it has some search results then iterate for each result to formulate the
    // correct response
    if( response && response.searchResults ) {
        _.forEach( response.searchResults, function( result ) {
            // Get the model object for search result object UID present in response
            var resultObject = cdm.getObject( result.uid );

            if( resultObject ) {
                var props = [];
                var cellHeader1 = resultObject.props.object_string.uiValues[ 0 ];
                props.push( ' Deliverable Name \\:' + cellHeader1 );
                var cellHeader2 = resultObject.props.deliverable_type.uiValues[ 0 ];
                props.push( ' Deliverable type \\:' + cellHeader2 );
                resultObject.props.awp0CellProperties.dbValues = props;
                resultObject.props.awp0CellProperties.uiValues = props;
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
 * Do the perform search on schedule to get SchDeliverable object values
 * @param {Object} data - The qualified data of the viewModel
 * @param {Object} ctx - Context Object
 * @returns {Promise} Promise for getting schedule deliverable
 */
export let getSchDeliverable = function( data, ctx ) {
    var dataProvider = data.dataProviders.scheduleDeliverableSearch;

    var parentUid = ctx.mselected[ '0' ].props.schedule_tag.dbValues[0];

    // Check is data provider is null or undefined then no need to process further
    // and return from here
    if( !dataProvider ) {
        return;
    }

    // Get the policy from data provider and register it
    var policy = dataProvider.action.policy;
    policySvc.register( policy );
    var searchString = data.filterBox.dbValue;

    var inputData = {
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Saw1TaskSearchProvider',
            searchCriteria: {
                searchContentType: 'SchDeliverable',
                searchProperty: 'deliverable_name',
                searchString: searchString,
                parentUid: parentUid
            },
            searchFilterFieldSortType: 'Alphabetical',
            searchFilterMap: {},
            searchSortCriteria: [],

            startIndex: dataProvider.startIndex
        }
    };

    var deferred = AwPromiseService.instance.defer();

    // SOA call made to get the content
    soaService.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
        // Parse the SOA data to content the correct user or resource pool data
        var outputData = processProviderResponse( data, response );
        deferred.resolve( outputData );
    } );
    return deferred.promise;
};

var getSubmitTypeData = function( data ) {
    if( data.submitType.dbValue === data.i18n.submitType ) {
        data.submitTypeInt = 0;
    } else if( data.submitType.dbValue === data.i18n.reference ) {
        data.submitTypeInt = 1;
    } else if( data.submitType.dbValue === data.i18n.doNotSubmit ) {
        data.submitTypeInt = 3;
    }

    return data.submitTypeInt;
};

/**
 * Return input for createTaskDeliverable SOA
 * @param {Object} data - Data of ViewModelObject
 * @param {Object} ctx - Context Object
 * @returns {Object} Input structure for SOA
 */
export let getSchTaskDeliverable = function( data, ctx ) {
    var input = [];
    var inputData;
    var finalSelected = ctx.mselected;

    assignSchDelValidation( data, ctx );

    for( var j = 0; j < ctx.mselected.length; j++ ) {
        var schTaskDeliList = ctx.mselected[ j ].props.sch_task_deliverable_list;

        for( var k = 0; k < schTaskDeliList.dbValues.length; k++ ) {
            var taskDeliverable = cdm.getObject( schTaskDeliList.dbValues[ k ] );
            var scheduleDeliverable = taskDeliverable.props.schedule_deliverable;

            if( scheduleDeliverable.dbValues[ 0 ] === data.dataProviders.scheduleDeliverableSearch.selectedObjects[ 0 ].uid ) {
                finalSelected.splice( j, 1 );
            }
        }
    }
    for( var i = 0; i < finalSelected.length; i++ ) {
        inputData = {
            scheduleTask: finalSelected[ i ],
            scheduleDeliverable: data.dataProviders.scheduleDeliverableSearch.selectedObjects[ 0 ],
            submitType: getSubmitTypeData( data )
        };
        input.push( inputData );
    }
    return input;
};

// Make includeType as comma separated string
export let populateValidIncludeTypes = function( data, ctx ) {
    var prefValues = ctx.preferences.ScheduleDeliverableWSOTypes;

    var includeDataTypes = '';

    for( var i = 0; prefValues && i < prefValues.length; i++ ) {
        if( i === prefValues.length - 1 ) {
            includeDataTypes = includeDataTypes.concat( prefValues[ i ] );
        } else {
            includeDataTypes = includeDataTypes.concat( prefValues[ i ], ',' );
        }
    }

    data.includeTypes = includeDataTypes;
};

/**
 * Check Schedule Deliverable Name of the Deliverable to be added
 * @param {Object} data - Data of ViewModelObject
 * @param {Object} ctx - Context Object
 * @returns {Promise} Promise for getting sch_task_deliverable_list property
 */
export let checkSchDeliverableName = function( data, ctx ) {
    var deferred = AwPromiseService.instance.defer();

    dms
        .getProperties( [ ctx.selected.uid ], [ 'sch_task_deliverable_list' ] )
        .then(
            function() {
                if( ctx.selected.props.sch_task_deliverable_list &&
                    data.dataProviders.scheduleDeliverableSearch.selectedObjects &&
                     ctx.selected.props.sch_task_deliverable_list.uiValue === data.dataProviders.scheduleDeliverableSearch.selectedObjects[ '0' ].props.object_name.uiValue  ) {
                    deferred.reject( data.i18n.sameInstanceNameErrorMsg );
                }
                deferred.resolve();
            } );
    return deferred.promise;
};

exports = {
    openAssignScheduleDeliverablePanel,
    getSchDeliverable,
    getSchTaskDeliverable,
    populateValidIncludeTypes,
    checkSchDeliverableName
};
export default exports;
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member AssignTaskDeliverable
 */
app.factory( 'AssignTaskDeliverable', () => exports );
