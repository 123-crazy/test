// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */
/**
 * @module js/qfm0DragAndDropWidgetService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import awTableSvc from 'js/awTableService';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import awColumnSvc from 'js/awColumnService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import dmSvc from 'soa/dataManagementService';
import iconSvc from 'js/iconService';
import colorDecoratorSvc from 'js/colorDecoratorService';
import pasteSvc from 'js/pasteService';
import tcVmoService from 'js/tcViewModelObjectService';
import messageSvc from 'js/messagingService';
import localeSvc from 'js/localeService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import AwHttpService from 'js/awHttpService';
import browserUtils from 'js/browserUtils';
import localStrg from 'js/localStorage';
import domUtils from 'js/domUtils';
import awDragAndDropUtils from 'js/awDragAndDropUtils';


const DOM = domUtils.DOMAPIs;
let exports = {};

import parsingUtils from 'js/parsingUtils';
import 'soa/kernel/clientMetaModel';
import $ from 'jquery';



/**
 * "dropHandlers" are used to enable and customize the drop operation for a view and
 * the components inside it. If a dropHandler is activated for a certain view, then
 * the same dropHandler becomes applicable to all the components inside the view.
 * This means, we can handle any drop/dragEnter/dragOver operation for any component
 * inside a view at the view level. Not all the components used inside a view have
 * drop configured, when a dropHandler is active for a view.
 * The action associated bind-ed with drag actions is expected to be a synchronous
 * javascript action. we can only associate declarative action type syncFunction with
 * drag actions. At runtime the js function (bind-ed with drag action) receives a system
 * generated object as the last parameter of the function.
 *
 * For more info  :- http://swf/showcase/#/showcase/Declarative%20Configuration%20Points/dragAndDrop
 *
 * @param {default parameters for DnD} dragAndDropParams
 */
/*export let tableViewDragOver = ( dragAndDropParams ) => {
    let targetObjects = dragAndDropParams.targetObjects;
    if( dragAndDropParams.dataProvider && !targetObjects ) {
            return {
                dropEffect: 'copy',
                stopPropagation: true,
                preventDefault : true
            };
   }
   return {
        dropEffect: 'none',
        stopPropagation: true
    };
};*/

/**
 * Clear the cache after drop option is completed
 */
var getSourceObjects = function(){
    var sourceObjects =[];
    var sourceUids = awDragAndDropUtils.getCachedSourceUids();
    for( var i = 0; i < sourceUids.length; i++ ) {
        let sourceObject = clientDataModelSvc.getObject( sourceUids[i] );
        if( sourceObject ) {
            sourceObjects.push( sourceObject );
        }
    }
    return sourceObjects;
};


/**
 * Function (dropHandler) to create a relation between the impacted item dragged over on persisted
 * impacted table, and the change object, when that item is dropped over the table.
 */
export let failureCauseAnalysisTableViewDropOver = ( dragAndDropParams ) => {
    let curr = {};
    var sourceObjects = [];
    sourceObjects = getSourceObjects();

    curr.targetObject = appCtxService.ctx.mselected[0];
    curr.relationType = 'Qfm0Cause';
    curr.sourceObjects = sourceObjects;
    eventBus.publishOnChannel( {
        channel: 'paste',
        topic: 'drop',
        data: {
            pasteInput: [ curr ]
        }
    } );
    awDragAndDropUtils._clearCachedData();
    return {
        preventDefault: true,
        stopPropagation: true
    };
};

/**
 * Function (dropHandler) to create a relation between the impacted item dragged over on persisted
 * impacted table, and the change object, when that item is dropped over the table.
 */
export let failureEffectAnalysisTableViewDropOver = ( dragAndDropParams ) => {
    let curr = {};

    var sourceObjects = [];
    sourceObjects = getSourceObjects();

    curr.targetObject = appCtxService.ctx.mselected[0];
    curr.relationType = 'Qfm0Effect';
    curr.sourceObjects =sourceObjects;
    eventBus.publishOnChannel( {
        channel: 'paste',
        topic: 'drop',
        data: {
            pasteInput: [ curr ]
        }
    } );
    awDragAndDropUtils._clearCachedData();
    return {
        preventDefault: true,
        stopPropagation: true
    };
};

/**
 * Function (dropHandler) to create a relation between the impacted item dragged over on persisted
 * impacted table, and the change object, when that item is dropped over the table.
 */
export let higherFunctionAnalysisTableViewDropOver = ( dragAndDropParams ) => {
    let curr = {};
    var sourceObjects = [];
    sourceObjects = getSourceObjects();

    curr.targetObject = appCtxService.ctx.mselected[0];
    curr.relationType = 'Qfm0CalledBy';
    curr.sourceObjects = sourceObjects;
    eventBus.publishOnChannel( {
        channel: 'paste',
        topic: 'drop',
        data: {
            pasteInput: [ curr ]
        }
    } );
    awDragAndDropUtils._clearCachedData();
    return {
        preventDefault: true,
        stopPropagation: true
    };
};


/**
 * Function (dropHandler) to create a relation between the impacted item dragged over on persisted
 * impacted table, and the change object, when that item is dropped over the table.
 */
export let lowerFunctionAnalysisTableViewDropOver = ( dragAndDropParams ) => {
    let curr = {};
    var sourceObjects = [];
    sourceObjects = getSourceObjects();

    curr.targetObject = appCtxService.ctx.mselected[0];
    curr.relationType = 'Qfm0Calling';
    curr.sourceObjects = sourceObjects;
    eventBus.publishOnChannel( {
        channel: 'paste',
        topic: 'drop',
        data: {
            pasteInput: [ curr ]
        }
    } );
    awDragAndDropUtils._clearCachedData();
    return {
        preventDefault: true,
        stopPropagation: true
    };
};

export const tableViewDragOver = ( dragAndDropParams ) => {

    let eventTarget = dragAndDropParams.targetElement;
    //Look for splm table as the target
    let target = eventTarget && eventTarget.classList.contains( 'aw-splm-table' ) ? eventTarget : DOM.closest( eventTarget, 'aw-splm-table' );
    if( target ) {
        dragAndDropParams.callbackAPIs.highlightTarget( {
            isHighlightFlag: true,
            targetElement: target
        } );
        return {
            dropEffect: 'copy',
            preventDefault: true
        };
    }
    dehighlightHighlightedElements();
    return {
        dropEffect: 'none',
        stopPropagation: true
    };
};

const dehighlightHighlightedElements = () => {
    var allHighlightedTargets = document.body.querySelectorAll( '.aw-theme-dropframe.aw-widgets-dropframe' );
    if( allHighlightedTargets ) {
        _.forEach( allHighlightedTargets, function( target ) {
            eventBus.publish( 'dragDropEvent.highlight', {
                event: event,
                isGlobalArea: true,
                isHighlightFlag: false,
                targetElement: target
            } );
        } );
    }
};

export const dragEnterHandler = ( dragAndDropParams ) => {
    return {
        preventDefault: true
    };
};

export default exports = {
    tableViewDragOver,
    failureCauseAnalysisTableViewDropOver,
    failureEffectAnalysisTableViewDropOver,
    higherFunctionAnalysisTableViewDropOver,
    lowerFunctionAnalysisTableViewDropOver,
    dragEnterHandler
};


/**
 *
 * @memberof NgServices
 * @member Cm1ImpactedWidgetService
 *
 *  @param {Object} $q: Queue service
 *  @param {Object} clientDataModelSvc: client data model service
 *  @param {Object} awTableSvc: AW Table service
 *  @param {Object} soaSvc: SOA service
 *  @param {Object} appCtxSvc: appCtxService
 *  @param {Object} treeTableUtil: Tree Table Util
 *  @return {Object} service exports exports
 *
 */
app.factory( 'qfm0DragAndDropWidgetService', () => exports );
