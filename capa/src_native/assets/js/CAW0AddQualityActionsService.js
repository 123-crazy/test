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

 * @module js/CAW0AddQualityActionsService
 */

import * as app from 'app';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';
import uwPropSvc from 'js/uwPropertyService';
import _ from 'lodash';
import 'jquery';

var exports = {};

export let caw0SetQualityActionTypeSubTypeRelationInfo = function( ctx, commandContext ) {
    var commandContext = commandContext.objectSetSource === undefined && commandContext.commandContext && commandContext.commandContext.objectSetSource !== undefined ? commandContext.commandContext :
        commandContext;
    if( commandContext && commandContext.objectSetSource ) {
        var objectSetContext = commandContext.objectSetSource.split( '.' );
        var relationName = objectSetContext[ 0 ];

        var genericQualityActionRelation = {
            type: "8D",
            relationType: relationName
        };
        relationName = relationName === 'CPA0CorrectiveAction' || relationName === 'CPA0ImplCorrAction' ? 'CPA0CorrectiveAction' : relationName;
        switch ( relationName ) {
            case 'CPA0ContainmentAction':
                genericQualityActionRelation.subType = 'Containment Action';
                break;
            case 'CPA0CorrectiveAction':
                genericQualityActionRelation.subType = 'Corrective Action';
                break;
            case 'CPA0PreventiveAction':
                genericQualityActionRelation.subType = 'Preventive Action';
                break;
            case 'CAW0QualityActionRel':
                genericQualityActionRelation.subType = 'Root Cause Analysis Action';
                break;
            case 'qam0DependentQualityActions':
                genericQualityActionRelation.subType = 'Confirmation of Effectiveness';
                break;
            default:
                ctx.qaType = '';
                ctx.qaSubType = '';
        }
    }

    if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) > -1 ) {
        ctx.parentCAPA = ctx.pselected;
        ctx.primaryObject = _.clone( ctx.pselected );
        if( genericQualityActionRelation ) {
            genericQualityActionRelation.primaryObj = _.clone( ctx.pselected );
        }
    } else if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 ) {
        ctx.parentCAPA = ctx.selected;
        ctx.primaryObject = _.clone( ctx.parentCAPA );
        if( genericQualityActionRelation ) {
            genericQualityActionRelation.primaryObj = _.clone( ctx.parentCAPA );
        }
    } else if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' && ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_QualityAction' ||
        ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_QualityAction' && ( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ||
            ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 || ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 || ctx.selected.modelType.typeHierarchyArray
            .indexOf( 'Qam0QualityAction' ) > -1 ) ) {
        if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) > -1 ) {
            ctx.primaryObject = _.clone( ctx.pselected );
            if( genericQualityActionRelation ) {
                genericQualityActionRelation.primaryObj = _.clone( ctx.pselected );
            }
        } else {
            ctx.primaryObject = _.clone( ctx.selected );
            if( genericQualityActionRelation ) {
                genericQualityActionRelation.primaryObj = _.clone( ctx.selected );
            }
        }
    } else {
        ctx.primaryObject = _.clone( ctx.selected );
        if( genericQualityActionRelation ) {
            genericQualityActionRelation.primaryObj = _.clone( ctx.selected );
        }
    }

    //If user is on Corrective Action and trying to add COE Action
    if( ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_CorrectiveAction' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_CorrectiveAction' ) ) {
        if( commandContext && commandContext.objectSetSource === 'qam0DependentQualityActions.Qam0QualityAction' ) {
            ctx.parentCAPA = ctx.selectedCAPA;
            if( genericQualityActionRelation ) {
                genericQualityActionRelation.primaryObj = _.clone( ctx.selectedCorrectiveAction );
            }
        } else if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) === -1 && ctx.pselected && ctx.pselected.modelType.typeHierarchyArray.indexOf(
                'C2CapaRevision' ) > -1 ) {
            ctx.parentCAPA = ctx.pselected;
            ctx.primaryObject = _.clone( ctx.pselected );
            if( genericQualityActionRelation ) {
                genericQualityActionRelation.primaryObj = _.clone( ctx.pselected );
            }
        }
    }

    appCtxService.updateCtx( 'genericQualityActionRelation', genericQualityActionRelation );
};

export let updateRootCauseContext = function( data, eventData, actionType ) {

    var eventName;
    var relationName = data.createdRelationObject.type;
    if( actionType !== relationName ) {
        return;
    }
    switch ( relationName ) {
        case 'CPA0CorrectiveAction':
            eventName = 'CorrectiveActionsTable.plTable.reload';
            break;
        case 'CPA0ImplCorrAction':
            eventName = 'ImplCorrectiveActionsTable.plTable.reload';
            break;
        case 'unknownType':
            eventName = 'COEActionTable.plTable.reload';
            break;
    }
    if( appCtxService.ctx.SelectedRootCauseDefect !== undefined && appCtxService.ctx.SelectedRootCauseDefect !== null ) {
        var infoData = [];
        var inputPushObject = {
            object: data.createdRelationObject,
            vecNameVal: [ {
                name: 'caw0RootCause',
                values: [
                    appCtxService.ctx.SelectedRootCauseDefect.uid
                ]
            } ]
        };
        infoData.push( inputPushObject );
        soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', {
            info: infoData
        } ).then( function() {
            eventBus.publish( eventName );
        } );
    } else {
        eventBus.publish( eventName );
    }
};

export let caw0SetSelectedRootCauseDefect = function( data ) {
    appCtxService.ctx.SelectedRootCauseDefect = data.eventData.selectedObjects.length > 0 ? data.eventData.selectedObjects[ 0 ] : null;

};

//Subscribing 'qam0QARelationCreated' event to update Root Context of QA with selected Root Cause
eventBus.subscribe( 'qam0QARelationCreated', function( eventData ) {
    if( appCtxService.ctx.SelectedRootCauseDefect !== undefined && appCtxService.ctx.SelectedRootCauseDefect !== null ) {
        var infoData = [];
        var inputPushObject = {
            object: eventData.createdRelationObject,
            vecNameVal: [ {
                name: 'caw0RootCause',
                values: [
                    appCtxService.ctx.SelectedRootCauseDefect.uid
                ]
            } ]
        };
        infoData.push( inputPushObject );
        soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', {
            info: infoData
        } );
    }
    if( appCtxService.ctx.isCorrectiveActionSelected && eventData.createdRelationObject.type === 'unknownType' ) {
        eventBus.publish( 'CorrectiveActionSelectionChanged' );
    }
} );

export default exports = {
    caw0SetQualityActionTypeSubTypeRelationInfo,
    updateRootCauseContext,
    caw0SetSelectedRootCauseDefect
};
app.factory( 'CAW0AddQualityActionsService', () => exports );
