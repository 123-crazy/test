// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/ShowDeliverableInstances
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

var exports = {};

/**
 * It creates structure of form inputObject - otherSideObject , where
 * inputObject - Deliverable Instance(s) cut from the Deliverable Instances table
 * otherSideObject - List of Primary Objects attached to selected inputObject(s)
 *
 * @param {response} response - SOA response
 * @return {Object} - outputData object that holds the correct values .
 *
 */
export let getListOfPDRs = function( response ) {
    let outputData = [];
    let prgDelRevs = {};
    if( response.output && response.output.length > 0 ) {
        for( let i = 0; i < response.output.length; i++ ) {
            if( response.output[ i ].relationshipData[ 0 ] && response.output[ i ].relationshipData[ 0 ].relationshipObjects ) {
                // Its a Revisable Workspace object attached to Event , appears in Deliverable Instance and has no Secondary object
                //E.g.: 2D CAD is attached as Deliverable to Event and it also appears in Deliverable Instance table
                if( response.output[ i ].relationshipData[ 0 ].relationshipObjects.length === 0 ) {
                    prgDelRevs = {
                        inputObject: response.output[ i ].inputObject
                    };
                    outputData.push( prgDelRevs );
                } else {
                    for( let j = 0; j < response.output[ i ].relationshipData[ 0 ].relationshipObjects.length; j++ ) {
                        prgDelRevs = {
                            primaryObject: response.output[ i ].relationshipData[ 0 ].relationshipObjects[ j ].otherSideObject,
                            inputObject: response.output[ i ].inputObject
                        };
                        outputData.push( prgDelRevs );
                    }
                }
            }
        }
    }
    return outputData;
};

/**
 * Sets the correct relation between input and primary object
 *
 * @param {ctx} ctx - Location context object
 * @param {data} data - Data that conatins information about the primary-secondary objects
 */
export let getInputToCutDelInstance = function( ctx, data ) {
    let input = [];
    let inputData = {};
    for( let i = 0; i < data.primaryObjs.length; i++ ) {
        let primaryObjs;
        let propertyName;
        if( _.isEmpty( data.primaryObjs[ i ].primaryObject ) ) {
            primaryObjs = ctx.xrtSummaryContextObject;
            if( cmm.isInstanceOf( 'Prg0AbsPlan', primaryObjs.modelType ) ) {
                propertyName = 'Psi0PlanPrgDel';
            }else if( cmm.isInstanceOf( 'Prg0AbsEvent', primaryObjs.modelType ) ) {
                propertyName = 'Psi0EventPrgDel';
            }
        } else {
            primaryObjs = data.primaryObjs[ i ].primaryObject;
            propertyName = 'Psi0DelInstances';
        }
        inputData = {
            parentObj: {
                uid: primaryObjs.uid,
                type: primaryObjs.type
            },
            childrenObj: [ {
                uid: data.primaryObjs[ i ].inputObject.uid,
                type: data.primaryObjs[ i ].inputObject.type
            } ],
            propertyName: propertyName
        };
        input.push( inputData );
    }
    return input;
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
                props.push( ' Object Name \\:' + cellHeader1 );

                var cellHeader2 = resultObject.props.object_type.uiValues[ 0 ];
                props.push( ' Object type \\:' + cellHeader2 );

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
 * Do the perform search on schedule to get SchDeliverable object values
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ctx} contextObject - Context Object
 */
export let getDeliverableInstances = function( data, ctx ) {
    var dataProvider = data.dataProviders.deliverableInstanceSearch;

    var parentUid = ctx.mselected[ '0' ].uid;

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
            providerName: 'Psi0ScheduleSearchProvider',
            searchCriteria: {
                searchContentType: 'DeliverableInstances',
                searchProperty: 'object_name',
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

export default exports = {
    getListOfPDRs,
    getDeliverableInstances,
    getInputToCutDelInstance
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member ShowDeliverableInstances
 */
app.factory( 'ShowDeliverableInstances', () => exports );
