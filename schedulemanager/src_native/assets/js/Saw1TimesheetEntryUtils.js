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
 * @module js/Saw1TimesheetEntryUtils
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import policySvc from 'soa/kernel/propertyPolicyService';
import dateTimeSvc from 'js/dateTimeService';
import soaService from 'soa/kernel/soaService';
import _ from 'lodash';

var exports = {};

/**
 * Parse the perform search response and return the correct output data object
 *
 * @param {Object} response - The response of performSearch SOA call
 * @return {Object} - outputData object that holds the correct values .
 */
var processProviderResponse = function( response, data ) {
    var outputData;

    // Check if response is not null and it has some search results then iterate for each result to formulate the
    // correct response
    if( response && response.searchResults ) {
        _.forEach( response.searchResults, function( result ) {
            // Get the model object for search result object UID present in response
            var resultObject = cdm.getObject( result.uid );

            if( resultObject ) {
                var props = [];
                // first two properties are considered as cellHeader1 and cellHeader2 and in this use case there is no headers so kept two dummy values for cell headers.
                var cellHeader1 = '';
                props.push( 'cellHeader1 \\:' + cellHeader1 );

                var cellHeader2 = '';
                props.push( 'cellHeader2 \\:' + cellHeader2 );

                var cellProp1 = resultObject.props.object_desc.uiValues[ 0 ];

                props.push( data.i18n.description + ' \\:' + cellProp1 );

                var timesheetMinutesValue = resultObject.props.minutes.dbValues[ 0 ] % 60;
                var timesheetHoursValue = ( resultObject.props.minutes.dbValues[ 0 ] - timesheetMinutesValue ) / 60;
                var cellProp2 = timesheetHoursValue + 'h' + ' ' + timesheetMinutesValue + 'm';
                props.push( data.i18n.timesheetTimeSpent + ' \\:' + cellProp2 );

                var dateUiValue = resultObject.props.date.uiValues[ 0 ];

                var indexOfSpace = dateUiValue.lastIndexOf( ' ' );
                var cellProp3 = dateUiValue.substring( 0, indexOfSpace + 1 );
                props.push( data.i18n.timesheetWorkDate + ' \\:' + cellProp3 );

                var cellProp4 = resultObject.props.saw1EntryStatus.uiValues[ 0 ];
                props.push( data.i18n.timesheetStatus + ' \\:' + cellProp4 );

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

// Register the policy before SOA call
var registerPolicy = function() {
    return policySvc.register( {
        types: [ {
            name: 'TimeSheetEntry',
            properties: [ {
                    name: 'object_desc'
                },
                {
                    name: 'date'
                },
                {
                    name: 'minutes'
                },
                {
                    name: 'saw1EntryStatus'
                },
                {
                    name: 'process_stage_list'
                },
                {
                    name: 'release_status_list'
                }
            ]
        } ]
    } );
};

export let searchTimesheetEntries = function( dataProvider, ctx, data ) {
    if( !dataProvider ) {
        return;
    }
    if( ctx.selected ) {
        var parentUid = ctx.selected.uid;
        var policyId = registerPolicy();
        var inputData = {
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Saw1TaskSearchProvider',
                searchCriteria: {
                    searchContentType: 'TimeSheetEntry',
                    parentUid: parentUid
                },

                startIndex: dataProvider.startIndex
            }
        };

        var deferred = AwPromiseService.instance.defer();

        // SOA call made to get the content
        soaService.post( 'Query-2014-11-Finder', 'performSearch', inputData ).then( function( response ) {
            if( policyId ) {
                policySvc.unregister( policyId );
            }
            // Parse the SOA data to content the correct user or resource pool data
            var outputData = processProviderResponse( response, data );
            deferred.resolve( outputData );
        } );
        return deferred.promise;
    }
};
export let validateTimesheetTimeInput = function( submitFlag, minutes, hours ) {
    if(  hours === 24 && minutes !== 0  ||  hours > 24 && minutes > 59  ) {
        if( submitFlag === true ) {
            throw 'timesheetSubmitErrorMsg';
        }else{
            throw 'timesheetSaveErrorMsg';
        }
    }else if( /^(\d|1\d|2[0-4])?$/.test( hours )  === false ) {
        if( submitFlag === true ) {
            throw 'timesheetHoursSubmitErrorMsg';
        }else{
            throw 'timesheetHoursSaveErrorMsg';
        }
    }else if( /^(\d|1\d|2\d|3\d|4\d|5\d)?$/.test( minutes ) === false ) {
        if( submitFlag === true ) {
            throw 'timesheetMinutesSubmitErrorMsg';
        }else{
            throw 'timesheetMinutesSaveErrorMsg';
        }
    }
};
export let getTimesheetTimeSpent = function( data ) {
    var submitFlag = data.eventData.isSubmitFlag;
    var minutes = data.timesheetMinutes.dbValue;
    var hours = data.timesheetHours.dbValue;
    validateTimesheetTimeInput( submitFlag, minutes, hours );
    var timesheetHoursValue = hours * 60;
    var timesheetTimeSpent = timesheetHoursValue + parseInt( minutes );
    return timesheetTimeSpent.toString();
};
export let getTimesheetTimeSpentEdit = function( minutes ) {
    var timesheetTimeSpent =  parseInt( minutes );
    return timesheetTimeSpent.toString();
};

export let getUpdatedObject = function( updatedObjectUid ) {
    return cdm.getObject( updatedObjectUid );
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {dateObject} dateObject - The date object
 */
export let getDateString = function( dateObject ) {
    return dateTimeSvc.formatUTC( dateObject );
};

export let getTimesheetEntryObjectName = function( object_name, propMaxLength ) {
    if( object_name.length > propMaxLength - 4 ) {
        object_name = object_name.substring( 0, propMaxLength - 4 );
    }
    return object_name.concat( ':TSE' );
};

export let getTimesheetEntriesInput = function( selectedObjects ) {
    return cdm.getObject( selectedObjects[ 0 ].uid );
};

export let getStatusOfSelectedEntries = function( data ) {
    var selectedEntries = data.dataProviders.getTimesheetEntries.selectedObjects;
    if( selectedEntries ) {
        for( var selectedEntry in selectedEntries ) {
           if( selectedEntries[ selectedEntry ].props && selectedEntries[ selectedEntry ].props.process_stage_list
            && selectedEntries[ selectedEntry ].props.release_status_list ) {
                var processStageLen = selectedEntries[ selectedEntry ].props.process_stage_list.dbValues.length;
                var releaseStatusLen = selectedEntries[ selectedEntry ].props.release_status_list.dbValues.length;
                if( processStageLen === 0 && releaseStatusLen === 0 ) { //i.e status is Entered
                    data.submit = true;
                    break;
                } else {
                    data.submit = false;
                }
            }
        }
    }
};

/**
* Resets cell properties of TimesheetEntry object
*
* @param {object} data - Data of ViewModelObject

*/
export let resetCellPropertiesOfTimesheetEntry = function( data ) {
    var timesheetEntryObjects = data.dataProviders.getTimesheetEntries.viewModelCollection.loadedVMObjects;

    var index = timesheetEntryObjects.indexOf( data.selectedVMO );
    var timesheetEntryObject = timesheetEntryObjects[ index ];
    if( index > -1 ) {
        var props = [];
        // first two properties are considered as cellHeader1 and cellHeader2 and in this use case there is no headers so kept two dummy values for cell headers.
        var cellHeader1 = '';
        props.push( 'cellHeader1 \\:' + cellHeader1 );

        var cellHeader2 = '';
        props.push( 'cellHeader2 \\:' + cellHeader2 );

        var cellProp1 = timesheetEntryObject.props.object_desc.uiValues[ 0 ];
        props.push( data.i18n.description + ' \\:' + cellProp1 );

        var timesheetMinutesValue = timesheetEntryObject.props.minutes.dbValues[ 0 ] % 60;
        var timesheetHoursValue = ( timesheetEntryObject.props.minutes.dbValues[ 0 ] - timesheetMinutesValue ) / 60;
        var cellProp2 = timesheetHoursValue + 'h' + ' ' + timesheetMinutesValue + 'm';
        props.push( data.i18n.timesheetTimeSpent + ' \\:' + cellProp2 );

        var dateUiValue = timesheetEntryObject.props.date.uiValues[ 0 ];

        var indexOfSpace = dateUiValue.indexOf( ' ' );
        var cellProp3 = dateUiValue.substring( 0, indexOfSpace + 1 );
        props.push( data.i18n.timesheetWorkDate + ' \\:' + cellProp3 );

        var cellProp4 = timesheetEntryObject.props.saw1EntryStatus.uiValues[ 0 ];
        props.push( data.i18n.timesheetStatus + ' \\:' + cellProp4 );

        if( props ) {
            timesheetEntryObject.props.awp0CellProperties.dbValue = props;
            timesheetEntryObject.props.awp0CellProperties.dbValues = props;
            timesheetEntryObject.props.awp0CellProperties.displayValsModel = props;
            timesheetEntryObject.props.awp0CellProperties.displayValues = props;
            timesheetEntryObject.props.awp0CellProperties.prevDisplayValues = props;
            timesheetEntryObject.props.awp0CellProperties.uiValue = props;
            timesheetEntryObject.props.awp0CellProperties.uiValues = props;
            timesheetEntryObject.props.awp0CellProperties.value = props;
            timesheetEntryObject.props.awp0CellProperties.values = props;
        }

        if( timesheetEntryObject.props && timesheetEntryObject.props.awp0CellProperties ) {
            // We should look up for dbValue always,'dbValues' is redundant and need to cleanup any dependency on that
            // dbValue could be array or string based on the mode object
            var dbValue = timesheetEntryObject.props.awp0CellProperties.dbValue;

            timesheetEntryObject.cellProperties = {};
            for( var ii = 0; ii < dbValue.length; ii++ ) {
                var keyValue = dbValue[ ii ].split( '\\:' );

                var value = keyValue[ 1 ] || '';

                if( ii === 0 ) {
                    timesheetEntryObject.cellHeader1 = value;
                } else if( ii === 1 ) {
                    timesheetEntryObject.cellHeader2 = value;
                } else if( value ) {
                    var key = keyValue[ 0 ];

                    timesheetEntryObject.cellProperties[ key ] = {
                        key: key,
                        value: value
                    };
                }
            }
        }
    }
};

export default exports = {
    searchTimesheetEntries,
    getTimesheetTimeSpent,
    getTimesheetTimeSpentEdit,
    getUpdatedObject,
    getDateString,
    getTimesheetEntryObjectName,
    getTimesheetEntriesInput,
    getStatusOfSelectedEntries,
    resetCellPropertiesOfTimesheetEntry,
    validateTimesheetTimeInput
};
app.factory( 'Saw1TimesheetEntryUtils', () => exports );
