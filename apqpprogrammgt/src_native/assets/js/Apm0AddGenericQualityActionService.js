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

 * @module js/Apm0AddGenericQualityActionService
 */

import * as app from 'app';
import appCtxService from 'js/appCtxService';
import 'jquery';

var exports = {};


export let setQualityActionTypeSubTypeRelationInfo = function( ctx )
{
    let genericQualityActionRelation = {};

    genericQualityActionRelation.type = "Program";

    if(ctx.sublocation.clientScopeURI === "Psi0Checklist" || ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Psi0Checklist') > -1 || ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Apm0QualityChecklist') > -1)
    {
        genericQualityActionRelation.subType = "Checklist";
        genericQualityActionRelation.relationType = "Apm0ChecklistQualityActRel";
    }
    else if(ctx.sublocation.clientScopeURI === "Psi0ChecklistQuestion" || ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf('Psi0ChecklistQuestion') > -1)
    {
        genericQualityActionRelation.subType = "Checklist Question";
        genericQualityActionRelation.relationType = "Apm0ChecklistQQualityActRel";
    }
    if(ctx.selected.modelType.typeHierarchyArray.indexOf('Qam0QualityAction') > -1)
    {
        genericQualityActionRelation.primaryObj = ctx.xrtSummaryContextObject;
    }
    else
    {
        genericQualityActionRelation.primaryObj = ctx.selected;
    }
    appCtxService.updateCtx( 'genericQualityActionRelation', genericQualityActionRelation );
};

export default exports = {
    setQualityActionTypeSubTypeRelationInfo
};
app.factory( 'Apm0AddGenericQualityActionService', () => exports );
