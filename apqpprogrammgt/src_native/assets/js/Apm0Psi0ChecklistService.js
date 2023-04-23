// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**

 * @module js/Apm0Psi0ChecklistService
 */

import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';

import 'jquery';

var exports = {};

/**
 * Processes the responce of expandGRMRelations and returns list of secondary Objects
 *
 * @param {responce}response responce of expandGRMRelations
 * @returns {List} availableSecondaryObject return list of secondary objects
 */
export let processSecondaryObject = function( response ) {
    var availableSecondaryObject = [];
    if( response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
        for( var i in response.output[ 0 ].relationshipData[ 0 ].relationshipObjects ) {
            availableSecondaryObject[ i ] = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects[ i ].otherSideObject;
        }
    }

    appCtxService.ctx.search.totalFound = availableSecondaryObject.length;
    appCtxService.ctx.search.totalLoaded = availableSecondaryObject.length;
    return availableSecondaryObject;
};

export let setRelationContext = function( ctx ) {
    var relationInfo;
    relationInfo = {
        relationInfo: [ {
            primaryObject: ctx.locationContext.modelObject,
            relationObject: null,
            relationType: 'Psi0EventChecklistRelation',
            secondaryObject: ctx.selected
        } ]
    };
    appCtxService.registerCtx( 'relationContext', relationInfo );
};

export default exports = {
    processSecondaryObject,
    setRelationContext
};
app.factory( 'Apm0Psi0ChecklistService', () => exports );