// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@


/* *
 * @module js/revOccUtils
 */
import * as app from 'app';

import appCtxService from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import adapterSvc from 'js/adapterService';
import _ from 'lodash';


let exports = {};

/* This function will return part and usages from selection
 * @return {Object} array of change input
*/
export let getPartAndUsageListFromSelection = function() {
    let changeInput = [];
    let selectedObjects = appCtxService.ctx.mselected;
    _.forEach(selectedObjects, function (selectedObject) {
        if (selectedObject.props.awb0Archetype.dbValues.length > 0 && selectedObject.props.awb0Archetype.dbValues[0] !== null && selectedObject.props.awb0Archetype.dbValues[0] !== "") {
            let partObject = cdmSvc.getObject(selectedObject.props.awb0Archetype.dbValues[0]);
            changeInput.push(partObject);
        }


        if (selectedObject.props.usg0UsageOccRev.dbValues.length > 0 && selectedObject.props.usg0UsageOccRev.dbValues[0] !== null && selectedObject.props.usg0UsageOccRev.dbValues[0] !== "") {
            let puObject = cdmSvc.getObject(selectedObject.props.usg0UsageOccRev.dbValues[0]);
            changeInput.push(puObject);
        }
    });
    return changeInput;
};

/* *
 * Revisiable Occurrence utility
 * @member revOccUtils
 *
 * @param {$q} $q - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {adapterSvc} adapterSvc - Adaptor to use.
 * @param {cdmSvc} cdmSvc - Client datamodel service to use.
 *
 * @returns {revOccUtils} Reference to service's API object.
 */

export default exports = {
    getPartAndUsageListFromSelection
};
app.factory( 'revOccUtils', () => exports );
