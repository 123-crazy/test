//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Saw1ShiftScheduleService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';

var exports = {};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 *
 * @param {date} dateObject {String} dateValue - UTC format date.
 */
export let getDateString_startDate = function (data ,dateObject) {
    if (!data.shiftScheduleByDays.dbValue) {
        var dateValue;
        dateValue = dateTimeSvc.formatUTC(dateObject);
        return dateValue;
    }
};

/**
 * Return input for createTaskDeliverable SOA
 *
 * @param {object} data - Data of ViewModelObject
 * @param {object} schTask - Schedule Task from where Add Deliverable command is invoked
 */
export let getTaskDeliverable = function (data, schTask) {
    var input = [];
    var inputData;
    var deliverableNameOfObject;
    if (data.selectedTab.panelId === 'newTabPageSub') {
        if (data.datasetType.dbValue) {
            deliverableNameOfObject = data.datasetName.dbValue;
        } else {
            deliverableNameOfObject = data.object_name.dbValue;
        }
        inputData = {
            scheduleTask: schTask,
            submitType: 0,
            deliverableReference: data.createdObject,
            deliverableName: deliverableNameOfObject,
            deliverableType: data.createdObject.type
        };
        input.push(inputData);
    } else {
        for (var secondObj in data.sourceObjects) {
            if (data.sourceObjects.hasOwnProperty(secondObj)) {
                inputData = {
                    scheduleTask: schTask,
                    submitType: 0,
                    deliverableReference: data.sourceObjects[secondObj],
                    deliverableName: data.sourceObjects[secondObj].props.object_string.dbValues[0],
                    deliverableType: data.sourceObjects[secondObj].type
                };
                input.push(inputData);
            }
        }
    }
    return input;
};

/**
 * Return input for createMultipleTaskDeliverables SOA
 *
 * @param {object} data - Data of ViewModelObject
 * @param {object} ctx - ctx from where Add Deliverable command is invoked
 */
export let getMultiTaskDeliverable = function (data, ctx) {
    var input = [];
    var inputData;
    var deliverableNameOfObject;
    var schToTaskArrayMap = ctx.assignTaskDelContainer.scheduleToTasksArrayMap;
    for (var schUid in schToTaskArrayMap) {
        if (data.selectedTab.panelId === 'newTabPageSub') {
            if (data.datasetType.dbValue) {
                deliverableNameOfObject = data.datasetName.dbValue;
            } else {
                deliverableNameOfObject = data.object_name.dbValue;
            }
            inputData = {
                schedule: cdm.getObject(schUid),
                scheduleTasks: schToTaskArrayMap[schUid],
                submitType: 0,
                deliverableReference: data.createdObject,
                deliverableName: deliverableNameOfObject,
                deliverableType: data.createdObject.type
            };
            input.push(inputData);
        } else {
            for (var secondObj in data.sourceObjects) {
                if (data.sourceObjects.hasOwnProperty(secondObj)) {
                    inputData = {
                        schedule: cdm.getObject(schUid),
                        scheduleTasks: schToTaskArrayMap[schUid],
                        submitType: 0,
                        deliverableReference: data.sourceObjects[secondObj],
                        deliverableName: data.sourceObjects[secondObj].props.object_string.dbValues[0],
                        deliverableType: data.sourceObjects[secondObj].type
                    };
                    input.push(inputData);
                }
            }
        }
    }
    return input;
};

/**
 * Return string that determines the usecase is dataset or not
 *
 * @param {object} data - Data of ViewModelObject
 */
export let identifyFromWhereAddButtonIsFired = function (data) {
    if (data.datasetType.dbValue) {
        return 'dataset';
    }
    return 'notADataset';
};

export let getScheduleUIDs = function (ctx) {
    var scheduleUids = [];
    for (var selCount = 0; selCount < ctx.mselected.length; selCount++) {
        scheduleUids.push(ctx.mselected[selCount].uid);
    }
    return scheduleUids;
};

export let getDaysToShift = function (data) {
    if (data.shiftScheduleByDays.dbValue) {
        var daysToShift = data.shiftScheduleDays.dbValue;
        if (data.shiftDirection.dbValue === "Backward") {
            daysToShift = daysToShift * -1;
        }
        return daysToShift;
    }

};

export default exports = {
    getDateString_startDate,
    getTaskDeliverable,
    getMultiTaskDeliverable,
    identifyFromWhereAddButtonIsFired,
    getScheduleUIDs,
    getDaysToShift
};
/**
 * Service to display Shift Schedule panel.
 *
 * @member Saw1ShiftScheduleService
 * @memberof NgServices
 */
app.factory('Saw1ShiftScheduleService', () => exports);
