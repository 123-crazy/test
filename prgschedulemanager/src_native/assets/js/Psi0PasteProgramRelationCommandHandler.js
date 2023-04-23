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
 * @module js/Psi0PasteProgramRelationCommandHandler
 */
import app from 'app';
import relService from 'js/Psi0ProgramRelationService';
import ClipboardService from 'js/clipboardService';
import _ from 'lodash';

import 'js/ProgramScheduleManagerConstants';
import 'soa/kernel/clientDataModel';

var exports = {};

var isValidClipboardContent = function (ctx, data, copiedObject) {
    relService.populateValidIncludeTypes(data, ctx);
    var includeTypesArray = [];
    if (data.includeTypes) {
        includeTypesArray = data.includeTypes.split(',');
    }
    for (let index = 0; index < includeTypesArray.length; index++) {
        if (copiedObject.modelType.typeHierarchyArray.indexOf(includeTypesArray[index]) > -1) {
            return true;
        }
    }
    return false;
};

/**
 * createRelations SOA input data.
 *
 * @param {object} ctx selected view model object
 * @param {object} data the view model data object
 */
export let getCreateInputForPaste = function (ctx, data) {
    var input = [];

    var copiedObjects = ClipboardService.instance.getContents();
    for (let index = 0; index < copiedObjects.length; index++) {
        var copiedObject = copiedObjects[index];
        var isLinkableObject = isValidClipboardContent(ctx, data, copiedObject);

        if (isLinkableObject) {
            var inputData = {
                primaryObject: ctx.selected,
                secondaryObject: copiedObject,
                relationType: "Psi0ProgramRelation",
                clientId: "",
                userData: ""
            };
            input.push(inputData);
        } else {
            throw "linkObjectErrorMsg";
        }
    }
    return input;
};

export default exports = {
    getCreateInputForPaste
};
/**
 * Service for paste program relation.
 *
 * @member Psi0PasteProgramRelationCommandHandler
 * @memberof NgServices
 *
 * @param {appCtxService} appCtxSvc - Service to use.
 * @param {clipboardService} clipboardService - Service to use.
 *
 */
app.factory( 'Psi0PasteProgramRelationCommandHandler', () => exports );
