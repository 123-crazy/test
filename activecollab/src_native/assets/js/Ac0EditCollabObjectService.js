// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global
define,
CKEDITOR
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0EditCollabObjectService
 */
import app from 'app';
import ac0ConvSvc from 'js/Ac0ConversationService';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import createConvSvc from 'js/Ac0CreateCollabObjectService';
import AwPromiseService from 'js/awPromiseService';
import ac0CreateConvSvc from 'js/Ac0CreateCollabObjectService';
import convUtils from 'js/Ac0ConversationUtils';
import cmdPanelSvc from 'js/commandPanel.service';
import _ from 'lodash';


var exports = {};
var editCommentCompleteEvtStr = 'ac0EditComm.editCommentComplete';

export let doEditConversationCell = function( subPanelContext, title ) {
    var convCtx = convUtils.getAc0ConvCtx();
    convCtx.editConvCtx = subPanelContext; //this is the flag that determines if we are in edit mode for a discussion. Setting this to null will mean edit is either complete or discarded
    if( convCtx.activeCell ) {
        convCtx.activeCell.expandComments = false;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    ac0ConvSvc.destroyActiveCellCkeEditor();
    createConvSvc.modifyCreateCtxFlagsForCollabObjs( true, false );
    if( convUtils.isDiscussionSublocation() ) {
        appCtxSvc.getCtx( 'newConvObj' ).isInEditMode = true;
        cmdPanelSvc.activateCommandPanel( 'ac0EditInDiscussLocationPanel', 'aw_toolsAndInfo' );
        return;
    }
    var navContext = {
        destPanelId: 'Ac0CreateNewCollabObj',
        title: title,
        recreatePanel: true,
        isolateMode: false,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', navContext );
};

export let shareSnapshotInDiscussion = function( commandcontext, mode, entryPoint ) {
    var convCtx = convUtils.getAc0ConvCtx();
    var selectedObj = appCtxSvc.getCtx( 'selected' );
    if( typeof commandcontext.type === 'undefined' && selectedObj && selectedObj.type === 'Fnd0Snapshot' ) {
        convCtx.currentSelectedSnapshot = selectedObj;
    } else{
        convCtx.currentSelectedSnapshot = commandcontext.vmo;
    }
    convCtx.snapshotEntryPoint = entryPoint;
    if ( !convUtils.isMyGallerySublocation() ||  convUtils.isMyGallerySublocation() && mode === 'open' ) {
        convUtils.setSelectedObjectInContext();
    }
    if( convCtx.activeCell ) {
        convCtx.activeCell.expandComments = false;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    ac0ConvSvc.destroyActiveCellCkeEditor();
    createConvSvc.modifyCreateCtxFlagsForCollabObjs( true, false );

    if( mode === 'create' ) {
        convCtx.editConvCtx = null; //coming from create. Make this flag null.
        cmdPanelSvc.activateCommandPanel( 'ac0EditInDiscussLocationPanel', 'aw_toolsAndInfo' );
    } else {
        cmdPanelSvc.activateCommandPanel( 'Ac0UniversalConversationPanel', 'aw_toolsAndInfo' );
    }
};

export let doEditCommentCell = function( subPanelContext, commentVMData, commentItemObj, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    var convCtx = convUtils.getAc0ConvCtx();
    if( convCtx.cmtEdit.activeCommentToEdit && convCtx.cmtEdit.activeCommentToEdit.beingEdited ) {
        convCtx.cmtEdit.activeCommentToEdit.beingEdited = false; //set existing activeComment beingEdited to false
    }
    if( convUtils.isDiscussionSublocation() && !commentItemObj )  {
        commentItemObj = ctx.newConvObj;
    }
    convCtx.cmtEdit.activeCommentToEdit = commentItemObj; //replace activeComment

    convCtx.cmtEdit.activeVMData = commentVMData;
    convCtx.cmtEdit.activeConvObj = subPanelContext;
    convCtx.editConvCtx = null; //in case this var has been set when a discussion has been edited, reset it
    convCtx.cmtEdit.activeCommentToEdit.beingEdited = true;
    if( commentItemObj.isRootComment && commentItemObj.discussionHasSnapshot ) {
        convCtx.cmtEdit.removedSnapshotObj = null; //cell in the process of being put into edit. No snapshot removed yet.
    } else {
        delete convCtx.cmtEdit.removedSnapshotObj;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    ac0CreateConvSvc.showRichTextEditor( commentVMData, commentItemObj.commentCKEId, subPanelContext.ckeImgUploadEvent ).then( function( ckeInstance ) {
        var convContext = convUtils.getAc0ConvCtx();
        convContext.cmtEdit.activeCKEInstance = ckeInstance;
        ac0CreateConvSvc.setCkEditorData( commentItemObj.props.richText.displayValues[0], ckeInstance );
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convContext );
        //convContext.ckeInstance = ckeInstance;
        deferred.resolve( {} );
    } );
    return deferred.promise;
};

export let saveEditComment = function( commentObj ) {
    var convCtx = convUtils.getAc0ConvCtx();
    var convObj = convCtx.cmtEdit.activeConvObj;
    var richText = ac0CreateConvSvc.getRichText( convCtx.cmtEdit.activeCKEInstance.cke._instance );
    var hasSnapshotBeenRemoved = convCtx.cmtEdit.removedSnapshotObj;
    return createConvSvc.postComment( convObj, richText, commentObj, null, hasSnapshotBeenRemoved ).then( function( response ) {
        var convContext = convUtils.getAc0ConvCtx();
        convContext.cmtEdit.activeCommentToEdit.props.richText.displayValues[0] = richText;
        convContext.cmtEdit.activeCommentToEdit.beingEdited = false;
        convContext.cmtEdit.activeCKEInstance = null;
        convContext.cmtEdit.activeVMData = null;
        convContext.cmtEdit.activeConvObj = null;
        convCtx.cmtEdit.removedSnapshotObj = null;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
        eventBus.publish( editCommentCompleteEvtStr );
    }, function( error ) {
        eventBus.publish( editCommentCompleteEvtStr );
    } );
};

export let discardEditComment = function( commentObj ) {
    var convCtx = convUtils.getAc0ConvCtx();
    convCtx.cmtEdit.activeCommentToEdit.beingEdited = false;
    convCtx.cmtEdit.activeCKEInstance = null;
    convCtx.cmtEdit.activeVMData = null;
    convCtx.cmtEdit.rootCmtObj = null;
    if( convCtx.cmtEdit.removedSnapshotObj ) {
        convCtx.cmtEdit.activeConvObj.props.inflatedRelatedObjList = convCtx.cmtEdit.removedSnapshotObj;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    eventBus.publish( editCommentCompleteEvtStr );
};

/*
* @param {Object} vmData view model data
*/
export let editInDiscussionLoctionPanelReveal = function( vmData ) {
    vmData.activeView = 'Ac0CreateNewCollabObj';
 };

export let removeSnapshotFromRootComment = function( commandcontext ) {
    var convCtx = convUtils.getAc0ConvCtx();
    convCtx.cmtEdit.removedSnapshotObj = _.remove( commandcontext.props.inflatedRelatedObjList, function( relatedObj ) {
        return relatedObj.type === 'Fnd0Snapshot';
    } );
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

/**
 * Ac0EditCollabObjectService factory
 */

export default exports = {
    doEditConversationCell,
    doEditCommentCell,
    saveEditComment,
    discardEditComment,
    editInDiscussionLoctionPanelReveal,
    shareSnapshotInDiscussion,
    removeSnapshotFromRootComment
};
app.factory( 'Ac0EditCollabObjectService', () => exports );
