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

 * @module js/qa0AddGenericQualityActionService
 */

 import * as app from 'app';
 import appCtxService from 'js/appCtxService';
 import 'jquery';

 var exports = {};


 export let prepareAuditFindingActionInformation = function() {
     let genericQualityActionRelation = {};

     genericQualityActionRelation.type = '8D';
     genericQualityActionRelation.subType = 'Containment Action';
     genericQualityActionRelation.relationType = 'CPA0ContainmentAction';
     genericQualityActionRelation.primaryObj = appCtxService.getCtx( 'selected' );

     appCtxService.updateCtx( 'genericQualityActionRelation', genericQualityActionRelation );
 };

 export default exports = {
    prepareAuditFindingActionInformation
 };
 app.factory( 'qa0AddGenericQualityActionService', () => exports );

