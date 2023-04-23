// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
*/

/**
 * @module js/Saw1CreateProgramViewDatasetService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import prgDataSource from 'js/Saw1ProgramViewDataSource';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import _ from 'lodash';

var exports = {};
var _addSchedule = null;
var _removeSchedule = null;

export let getProgramViewObject = function( ctx ) {
    return prgDataSource.instance.getProgramViewObject( ctx );
};

/**
 * Add the Selected Schedules in Data provider
 *
 * @param {data} data - The data of view model
 */
export let addIntoSelectedSchedulesProvider = function( data ) {
    if( data.dataProviders && _addSchedule ) {
        var schedules = data.dataProviders.selectedSchedules.viewModelCollection.loadedVMObjects;
        schedules.push( _addSchedule );
        data.dataProviders.selectedSchedules.update( schedules );
    }
};

/**
 * Get the Schedules of Program View
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The data of view model
 */
export let getSelectedSchedules = function( ctx, data ) {
    if( data.programView ) {
        data.programViewName.dbValue = data.programView;
    }
    if( data.openOnCreate ) {
        data.isOpenOnCreate.dbValue = data.openOnCreate;
    }
    if( data.desc ) {
        data.description.dbValue = data.desc;
    }

    if( data.currentSchedules ) {
        return data.currentSchedules;
    } else if( ctx.programViewConfiguration && ctx.programViewConfiguration.configFromSOA ) {
        var currentSchedules = [];
        currentSchedules = ctx.programViewConfiguration.configFromSOA.scheduleUIDs;

        currentSchedules = _.uniq( currentSchedules );
        var schedules = [];
        for( var index = 0; index < currentSchedules.length; index++ ) {
            schedules.push( cdm.getObject( currentSchedules[ index ] ) );
        }
        return schedules;
    }
    return [];
};

/**
 * Filter search results: Remove current schedules
 * @param {response} response - The response of PerformSearchView call
 * @param {data} data - The data of view model
 */
export let filterSearchResults = function( response, data ) {
    let searchResults = JSON.parse(response.searchResultsJSON);
    let uniqueObjects = _.differenceBy( searchResults.objects, data.currentSchedules, 'uid' );
    let difference = searchResults.objects.length - uniqueObjects.length;
    searchResults.objects = uniqueObjects;
    data.totalFound = response.totalFound - difference;
    data.totalLoaded = response.totalLoaded - difference;
    data.lastEndIndex = response.endIndex - difference;
    data.dataProviders.availableSchedules.selectionModel.multiSelectEnabled = true;
    data.dataProviders.availableSchedules.selectionModel.mode = 'multiple';
    return searchResults.objects;
};

/**
 * check is program view updated with schedules.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The data of view model
 */
export let isProgramViewUpdated = function( ctx, data ) {
    var currentSchedules = [];
    currentSchedules = data.currentSchedules;

    for( var index = 0; index < currentSchedules.length; index++ ) {
        if( ctx.programViewConfiguration && ctx.programViewConfiguration.configFromSOA ) {
            var isNew = _.indexOf( ctx.programViewConfiguration.configFromSOA.scheduleUIDs, currentSchedules[ index ].uid );
            if( isNew === -1 ) {
                return true;
            }
        }
        return true;
    }
    return false;
};

/**
 * Get filter box text
 *
 * @param {data} data - The data of view model
 */
export let getFilterValue = function( data ) {
    var empty = '*';
    if( data.filterBox.dbValue !== '' ) {
        return data.filterBox.dbValue;
    }

    return empty;
};

/**
 * Add the Selected Schedules from available schedules in currentSchedules
 *
 * @param {data} data - The data of view model
 */
export let addSchedules = function( data ) {
    var selectedSchedules = data.dataProviders.availableSchedules.selectedObjects;

    var newSchedules = _.differenceBy( selectedSchedules, data.currentSchedules, 'uid' );

    for( var index = 0; index < newSchedules.length; index++ ) {
        var scheduleVMO = cdm.getObject( selectedSchedules[ index ].uid );
        if( scheduleVMO ) {
            data.currentSchedules.push( scheduleVMO );
        }
    }
    data.programView = data.programViewName.dbValue;
    data.openOnCreate = data.isOpenOnCreate.dbValue;
    data.desc = data.description.dbValue;
};

/**
 * Remove the Selected Schedules from Data Provider
 *
 * @param {data} data - The data of view model
 */
export let removeFromSelectedSchedulesProvider = function( data ) {
    var dataProvider = data.dataProviders.selectedSchedules;
    if( _removeSchedule && _removeSchedule.uid && dataProvider ) {
        var deletedUid = _removeSchedule.uid;
        var selectedSchedules = dataProvider.viewModelCollection.loadedVMObjects;
        var modelObjects = $.grep( selectedSchedules, function( selectedSchedule ) {
            return selectedSchedule.uid !== deletedUid;
        } );
        dataProvider.update( modelObjects );
        data.currentSchedules = modelObjects;
    }
    data.isPrograViewUpdated = true;
};

/**
 * Execute the command.
 * <P>
 * This command is used to add Schedule into Selected Data Provider
 *
 * @param {ViewModelObject} vmo - Schdedule VMO
 */
export let addSchedule = function( vmo ) {
    if( vmo && vmo.uid ) {
        _addSchedule = vmo;
        eventBus.publish( 'Saw1CreateProgramView.addSchedule' );
    }
};

/**
 * Used to get Selected Schedule UIDs for manageProgramView SOA
 *
 * @param {data} data - The View model data
 * @returns {object} object - The valied Schedule UIDs or undefined
 */
export let getScheduleUIDs = function( data ) {
    var scheduleUIDs = [];
    if( data.dataProviders && data.dataProviders.selectedSchedules ) {
        var dataProvider = data.dataProviders.selectedSchedules.viewModelCollection.loadedVMObjects;
        if( dataProvider ) {
            for( var i = 0; i < dataProvider.length; i++ ) {
                scheduleUIDs.push( dataProvider[ i ].uid );
            }
        }
    }
    return scheduleUIDs;
};

/**
 * Used to get Selected Schedule UIDs for manageProgramView SOA and retain the program view filters
 *
 * @param {data} data - The View model data
 * @returns {object} object - The valied Schedule UIDs or undefined
 */
export let getConfigurationForAddUpdateSchedule = function( data, ctx ) {
    var programViewConfiguration = {};
    if( ctx.programViewConfiguration ) {
        programViewConfiguration = ctx.programViewConfiguration.configFromSOA;
    }
    programViewConfiguration.scheduleUIDs = exports.getScheduleUIDs( data );
    return programViewConfiguration;
};

/**
 * Execute the command.
 * <P>
 * This command is used to remove Schedule from Selected Data Provider
 *
 * @param {ViewModelObject} vmo - Schdedule VMO
 */
export let removeSchedule = function( vmo ) {
    if( vmo && vmo.uid ) {
        _removeSchedule = vmo;
        eventBus.publish( 'Saw1CreateProgramView.removeSchedule' );
    }
};

/**
 * Getting Last Index.
 * To update the last index of the availableSchedule dataProvider
 *
 * @param {startIndex} startIndex - startIndex of the results
 * @param {data} data - Data
 */
export let getLastIndex = function( startIndex, data ) {
    let lastIndex = 0;
    if( startIndex > 0 ) {
        //it's a scrolling case
        lastIndex = data.lastEndIndex.toString();
    }
    return lastIndex;
};

/**
 * Getting Total Obj Found.
 * To get the Total Obj Found of the availableSchedule dataProvider
 *
 * @param {startIndex} startIndex - startIndex of the results
 * @param {data} data - Data
 */
export let getTotalObjFound = function( startIndex, data ) {
    let totalObjFound = 0;
    if( startIndex > 0 ) {
        //it's a scrolling case
        totalObjFound = data.totalFound.toString();
    }
    return totalObjFound;
};

exports = {
    getProgramViewObject,
    addIntoSelectedSchedulesProvider,
    getSelectedSchedules,
    filterSearchResults,
    isProgramViewUpdated,
    getFilterValue,
    addSchedules,
    removeFromSelectedSchedulesProvider,
    addSchedule,
    getScheduleUIDs,
    getConfigurationForAddUpdateSchedule,
    removeSchedule,
    getLastIndex,
    getTotalObjFound
};

export default exports;
/**
 * Service to Create Program View panel.
 *
 * @member Saw1CreateProgramViewDatasetService
 * @memberof NgServices
 */
app.factory( 'Saw1CreateProgramViewDatasetService', () => exports );
