// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * This file is used for calling data service provider for Target Entity.
 *
 * @module js/tq0AssignTargetEntity
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';

'use strict';
var exports = {};


/**
 * prepare the input for set properties SOA call to add the target Entity
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} ctx - The data provider that will be used to get the correct content
 */

export let addTargetEntity = function (data, ctx) {
    var inputData = [];

    var selected = ctx.mselected;

    selected.forEach(function (selectedTask) {
        var infoObj = {};

        infoObj["object"] = cdm.getObject(selectedTask.uid);
        infoObj.timestamp = '';

        var temp = {};
        temp.name = 'tq0TargetEntity';

        switch (data.selectedTab.name) {
            case 'User':
                //For adding User as Target Entity.
                temp.values = [data.dataProviders.userPerformSearch.selectedObjects[0].props.user.dbValue];
                break;
            case 'Palette':
                //For adding Palette as Target Entity.
                temp.values = [data.dataProviders.paletteObjectProvider.selectedObjects[0].uid];
                break;
            case 'Results':
                //For adding Results tab value under 'Machine' tab as Target Entity.
                temp.values = [data.dataProviders.performSearch.selectedObjects[0].uid];
                break;
        }

        var vecNameVal = [];
        vecNameVal.push(temp);

        infoObj.vecNameVal = vecNameVal;

        inputData.push(infoObj);
    });

    return inputData;
};

/**
 * prepare the input for set properties SOA call to add the target Entity
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} ctx - The data provider that will be used to get the correct content
 */

export let replaceTargetEntity = function (data, ctx) {
    var inputData = [];

    var infoObj = {};

    infoObj.object = ctx.pselected;
    infoObj.timestamp = '';

    var temp = {};
    temp.name = 'tq0TargetEntity';

    switch (data.selectedTab.name) {
        case 'User':
            //For replacing User as Target Entity.
            temp.values = [data.dataProviders.userPerformSearch.selectedObjects[0].props.user.dbValue];
            break;
        case 'Palette':
            //For replacing Palette as Target Entity.
            temp.values = [data.dataProviders.paletteObjectProvider.selectedObjects[0].uid];
            break;
        case 'Results':
            //For replacing Results tab value under 'Machine' tab as Target Entity.
            temp.values = [data.dataProviders.performSearch.selectedObjects[0].uid];
            break;
    }

    var vecNameVal = [];
    vecNameVal.push(temp);

    infoObj.vecNameVal = vecNameVal;

    inputData.push(infoObj);


    return inputData;
};

/**
 * prepare the input for set properties SOA call to add the target Entity
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {Object} ctx - The data provider that will be used to get the correct content
 */

export let setFlagSeachShowFilter = function (data) {
    // Check if data is not null and selected tab is true then only set
    // the selected object to null always if user selected some object earlier before tab selection
    if (data && data.selectedTab.tabKey === 'equipmentPage') {
        data.showSearchFilter = false;
    }
};

export default exports = {
    addTargetEntity,
    replaceTargetEntity,
    setFlagSeachShowFilter
};
app.factory('tq0AssignTargetEntity', () => exports);
