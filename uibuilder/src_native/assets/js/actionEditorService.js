// Copyright (c) 2020 Siemens
// eslint-disable-next-line valid-jsdoc

/**
 * @module js/actionEditorService
 */
import _ from 'lodash';
import editService from 'js/editHandlerService';
import eventBus from 'js/eventBus';
import saveActionFlowSvc from 'js/saveActionFlowService';

/**
 * public API
 */
let exports = {};

export let updateEditorContent = function() {
    let editHandler = editService.getEditHandler( 'NONE' );
    if( editHandler ) {
        editHandler.leaveConfirmation().then( function() {
            eventBus.publish( 'actionEditorSWA.refreshEditor' );
        } );
    }
};

export let setEditorAsInvalid = function( ctx ) {
    ctx.actionBuilderEditorInvalid = true;
};

export let setEditorAsDirty = function( ctx, changedContent, origContent ) {
    ctx.actionBuilderEditorInvalid = false;
    if( !_.isEqual( origContent, changedContent.content ) ) {
        ctx.actionBuilderEditorIsDirty = true;
    }
};

export let resetEditorState = function( ctx ) {
    delete ctx.actionBuilderEditorIsDirty;
    delete ctx.actionBuilderEditorInvalid;

    let handler = saveActionFlowSvc.registerLeaveHandler();
    if( handler ) {
        editService.setEditHandler( handler, 'NONE' );
        editService.setActiveEditHandlerContext( 'NONE' );
    }
};

exports = {
    updateEditorContent,
    setEditorAsInvalid,
    setEditorAsDirty,
    resetEditorState
};
export default exports;
