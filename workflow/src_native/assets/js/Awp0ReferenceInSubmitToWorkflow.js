// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0ReferenceInSubmitToWorkflow
 */
 import * as app from 'app';
 import appCtxSvc from 'js/appCtxService';
 import _ from 'lodash';
 import 'js/hosting/sol/services/hostComponent_2014_07';
 import popupUtils from 'js/popupUtils';
 
 let exports = {};

 /*
  * Store the references in context
  */
 export let registerReferences = function( ctx ){
    if( ctx.workflow_process_references ){
        return;
    }
    let workflow_process_references = {};
    workflow_process_references.workFlowObjects = [];
    appCtxSvc.registerCtx( 'workflow_process_references', workflow_process_references );
};

export let clearReferences = function(){
   appCtxSvc.unRegisterCtx( 'workflow_process_references' );
};

/*
 * Removes the highlight after adding the selected object to references or targets
 */
export let clearSelections = function( dataProvider ){
    let referenceItems = dataProvider.viewModelCollection.loadedVMObjects;
    for( let i = 0; i < referenceItems.length; i++ ){
        if( dataProvider.selectedObjects.indexOf(referenceItems[i]) === -1 ){
            referenceItems[i].selected = false;
        }
    }
};

/*
 * Stores the context needed for when you select modify on the save or discard assignment prompt
 */
export let registerMessageData = function( data ){
    appCtxSvc.registerCtx('messageData', data);
};

/*
 * Determines if the commands will be hidden or shown when collapsing or expanding a panel section
 */
export let registerAddCommandCtx = function( eventData ) {
    if( eventData.name === "Targets" ){
       if( eventData.isCollapsed === true ) {
           appCtxSvc.registerCtx( 'hideTargetCommands', true );
           return;
       }
       appCtxSvc.registerCtx( 'hideTargetCommands', false );
    }
    else if( eventData.name === "References" ){
       if( eventData.isCollapsed === false ) {
           appCtxSvc.registerCtx( 'showReferenceCommands', true );
           return;
       }
       appCtxSvc.registerCtx( 'showReferenceCommands', false );
    }
};

/*
 *  This will open either the target panel or reference panel depending on the value of targetReference
 */
export let openAddPanel = function( data, ctx, targetReference ){
    //Set the panel to the appropriate size
    let referenceElement = popupUtils.getElement( popupUtils.extendSelector( '.aw-popup-contentContainer .aw-layout-panelContent' ) );
    if ( referenceElement ) {
        referenceElement.style.width = '900px';
    }
    if ( targetReference === 'Target' ){
       if ( ctx.openAddReferencePanel ) {
           ctx.openAddReferencePanel = false; 
           toggleAddReferenceCommand( data, ctx );
       }
       ctx.openAddTargetPanel = true;
  
       //Highlight the add command while the panel is open
       toggleAddTargetCommand( data, ctx );
    }
    else if ( targetReference === 'Reference' ) {
       if ( ctx.openAddTargetPanel ){
           ctx.openAddTargetPanel = false;
           toggleAddTargetCommand( data, ctx );
       }
   
       ctx.openAddReferencePanel = true; 
       toggleAddReferenceCommand( data, ctx );
    }
};

 /*
  *  This will close the target panel or reference panel depending on the value of targetReference
  */
 export let closeAddPanel = function( data, ctx, targetReference ){
    let referenceElement = popupUtils.getElement( popupUtils.extendSelector( '.aw-popup-contentContainer .aw-layout-panelContent' ) );
    if ( referenceElement && !ctx.openUserPickerPanel ) {
        referenceElement.style.width = '600px';
    }
    if ( targetReference === 'Target' ){
        ctx.openAddTargetPanel = false;

        if( data.eventData && (data.eventData.caption === 'Targets' || data.eventData.caption === 'Assignments') ){
            appCtxSvc.registerCtx( 'hideTargetCommands', true );
        }

        //Remove the highlight from the add target command 
        toggleAddTargetCommand( data, ctx );
    }
    else if ( targetReference === 'Reference' ) {
        ctx.openAddReferencePanel = false;
        toggleAddReferenceCommand( data, ctx );
    }
};

/*
 * Changes the add Target command from unselected to selected or selected to unselected
 * depending on whether the add targets panel is open or not
 */
export let toggleAddTargetCommand = function( data, ctx ){
    let addTargetCommand;
    if( data.activeCommandsList !== undefined ) {
        let activeCommands;
        activeCommands = data.activeCommandsList;
        addTargetCommand = activeCommands.find(activeCommands => activeCommands.commandId === 'Awp0AddWorkflowProcessTarget');
    }
   if( addTargetCommand !== undefined ){
       if( addTargetCommand.isSelected === true && !ctx.openAddTargetPanel) {
           addTargetCommand.isSelected = false;
           appCtxSvc.unRegisterCtx( 'addTargetCommand' );
           return;
       }
       if(addTargetCommand.isSelected === false && ctx.openAddTargetPanel) {
           addTargetCommand.isSelected = true;
           appCtxSvc.registerCtx( 'addTargetCommand', addTargetCommand );
           return;
       }
   }
   else if( appCtxSvc.ctx.addTargetCommand !== undefined){
       if( appCtxSvc.ctx.addTargetCommand.isSelected === true && !ctx.openAddTargetPanel) {
           appCtxSvc.ctx.addTargetCommand.isSelected = false;
           appCtxSvc.unRegisterCtx( 'addTargetCommand' );
           return;
       }
   }
};

export let toggleAddReferenceCommand = function( data, ctx ){
   let addReferenceCommand;
   if( data.activeCommandsList !== undefined ) {
       let activeCommands;
       activeCommands = data.activeCommandsList;
       addReferenceCommand = activeCommands.find(activeCommands => activeCommands.commandId === 'Awp0AddReferenceInSubmitToWorkflow');
   }
  if( addReferenceCommand !== undefined ){
      if( addReferenceCommand.isSelected === true && !ctx.openAddReferencePanel) {
       addReferenceCommand.isSelected = false;
          appCtxSvc.unRegisterCtx( 'addReferenceCommand' );
          return;
      }
      if(addReferenceCommand.isSelected === false && ctx.openAddReferencePanel) {
       addReferenceCommand.isSelected = true;
          appCtxSvc.registerCtx( 'addReferenceCommand', addReferenceCommand );
          return;
      }
  }
  else if( appCtxSvc.ctx.addReferenceCommand !== undefined){
      if( appCtxSvc.ctx.addReferenceCommand.isSelected === true && !ctx.openAddReferencePanel) {
          appCtxSvc.ctx.addReferenceCommand.isSelected = false;
          appCtxSvc.unRegisterCtx( 'addReferenceCommand' );
          return;
      }
  }
};

 export default exports = {
    registerReferences,
    registerAddCommandCtx,
    clearSelections,
    registerMessageData,
    openAddPanel,
    closeAddPanel,
    toggleAddTargetCommand,
    toggleAddReferenceCommand
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServices
 * @member Awp0ReferenceInSubmitToWorkflow
 */
app.factory( 'Awp0ReferenceInSubmitToWorkflow', () => exports );