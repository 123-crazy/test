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
 * @module js/Awp0ClaimTask
 */
import app from 'app';
import cdmSvc from 'soa/kernel/clientDataModel';
import inboxSvc from 'js/aw.inbox.service';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the supporting object for claim action.
 *
 * @param {object} ctx - the Context Object that will contain selected obejct information
 *
 *  @return {Object} Supporting object that need to be claimed
 */
export let getClaimSupportingObject = function( ctx ) {
    var supportingObject = null;
    if( ctx.selected !== null && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1 ) {

        var supportingObjectUid = ctx.selected.uid;
        if( supportingObjectUid !== null && supportingObjectUid !== "" ) {
            supportingObject = cdmSvc.getObject( supportingObjectUid );
        }

    }
    return supportingObject;
};

/**
 * Get the action object for claim action. If user selects the signoff object then it will return
 * parent PS task object
 *
 * @param {object} ctx - the Context Object that will contain selected obejct information
 *
 *  @return {Object} Action object that need to be claimed
 */
export let getActionableObject = function( ctx ) {
    return inboxSvc.getValidEPMTaskObject( ctx.selected.uid );
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0ClaimTask
 */

export default exports = {
    getClaimSupportingObject,
    getActionableObject
};
app.factory( 'Awp0ClaimTask', () => exports );
