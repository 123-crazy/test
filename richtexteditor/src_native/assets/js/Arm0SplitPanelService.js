//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * Module for the Parameter in Requirement Documentation Page
 *
 * @module js/Arm0SplitPanelService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
var exports = {};

export let changePanelLocation = function( panelLocation, data, selectedObj ) {
    appCtxSvc.ctx.showRequirementQualityData = undefined;
    var secondaryXrt = appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID;
    if( data && data.eventData && data.eventData.paramid ) {
        data.selectParam = data.eventData.paramid;
    }
    var splitPanelLocation = { splitPanelLocation: panelLocation };
    var requirementCtx = appCtxSvc.getCtx( 'requirementCtx' );
    if( !appCtxSvc.ctx.attributesCtx ) {
        appCtxSvc.ctx.attributesCtx = {};
    }
    if( appCtxSvc.ctx.occmgmtContext ) {
        var pwaSelected = appCtxSvc.ctx.occmgmtContext.selectedModelObjects;
        var firstSelected = pwaSelected[0];
        if( secondaryXrt === 'tc_xrt_summary_table' ) {
            firstSelected = appCtxSvc.getCtx( 'selected' );
            if( selectedObj ) {
                firstSelected = selectedObj;
            }
        }
        if( firstSelected ) {
            var cdmObject = cdm.getObject( firstSelected.uid );
            appCtxSvc.ctx.attributesCtx.objectToFetchParams = [ cdmObject ];
            _.set( appCtxSvc, 'ctx.requirements.selectedObjects', [ cdmObject ] );
        }
    }
    if( !requirementCtx ) {
        appCtxSvc.registerCtx( 'requirementCtx', splitPanelLocation );
        if( data ) {
        appCtxSvc.ctx.requirementCtx.objectsToSelect = data.eventData.objectsToSelect;
        }
    } else if( requirementCtx && requirementCtx.splitPanelLocation && requirementCtx.splitPanelLocation === 'bottom' ) {
        appCtxSvc.updatePartialCtx( 'requirementCtx.splitPanelLocation', 'off' );
    } else {
        appCtxSvc.updatePartialCtx( 'requirementCtx.splitPanelLocation', panelLocation );
    }
    if( secondaryXrt !== 'tc_xrt_summary_table' ) {
        // Event to resize Ckeditor
        eventBus.publish( 'requirementsEditor.resizeEditor' );
    }
};

export default exports = {
    changePanelLocation
};
/**
 * This factory creates a service and returns exports
 *
 * @memberof NgServices
 * @member Arm0SplitPanelService
 * @param {Object} appCtxSvc app context service
 * @return {Object} service exports exports
 */
app.factory( 'Arm0SplitPanelService', () => exports );
