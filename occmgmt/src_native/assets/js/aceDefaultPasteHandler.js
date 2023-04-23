// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aceDefaultPasteHandler
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import viewModelSvc from 'js/viewModelService';
import panelContentSvc from 'js/panelContentService';
import AwRootScopeService from 'js/awRootScopeService';
import addElementService from 'js/addElementService';
import occmgmtUtils from 'js/occmgmtUtils';
import contextStateMgmtService from 'js/contextStateMgmtService';
import cdmSvc from 'soa/kernel/clientDataModel';
import pasteService from 'js/pasteService';
import tcDefaultPasteHandler from 'js/tcDefaultPasteHandler';
import adapterSvc from 'js/adapterService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';

var exports = {};
var currentScope = null;

/**
 * set the variablity for Add sibling Panel
 * @param{ModelObject} targetObject Parent to which the object is to be pasted
 * @param{Array} Source objects array that need to be moved or pasted
 */
var updateCtxForAddUsingElementDrop = function ( targetObject, sourceObjects ) {
    var addElementInput = {};

    addElementInput.parentElement = targetObject;
    if ( appCtxService.ctx.aceActiveContext.context.addObjectIntent ) {
        if ( appCtxService.ctx.aceActiveContext.context.addObjectIntent === 'MoveIntent' ) {
            addElementInput.addObjectIntent = 'MoveIntent';
            delete appCtxService.ctx.aceActiveContext.context.addObjectIntent;
        } else if ( appCtxService.ctx.aceActiveContext.context.addObjectIntent === 'paste' ) {
            addElementInput.addObjectIntent = '';
            delete appCtxService.ctx.aceActiveContext.context.addObjectIntent;
        }
    } else {
        addElementInput.addObjectIntent = 'DragAndDropIntent';
        // Check if user is doing drag and drop then we need to get the parent Uids from input source
        // objects and we are storing the parent UID in context where these lines that are being moved
        // need to be removed so that in case if parent needs to be refesh for these lines it can happen.
        if( sourceObjects && !_.isEmpty( sourceObjects ) ) {
            var moveParentElementUids = [];
            _.forEach( sourceObjects, function ( sourceObj ) {
                var parentUid = occmgmtUtils.getParentUid( sourceObj );
                if( parentUid ) {
                    moveParentElementUids.push( parentUid );
                }
            });
            // Get the unique parent element uids that will be moved and set it to context
            moveParentElementUids = _.uniq( moveParentElementUids );
            addElementInput.moveParentElementUids = moveParentElementUids;
        }
    }

    /*
     * Here we are activating target view before proceeding for DnD operation.
     * 1. This will activate correct view in case of different configuration.
     * 2. This might activate wrong view When both view have target object avaialbe in there VMC.
     *    2.1 There is no harm with this as post processing will happen in jitter free way for both views.
     */
    var viewKeys = appCtxService.ctx.splitView ? appCtxService.ctx.splitView.viewKeys : [];
    for ( var i = 0; i < viewKeys.length; i++ ) {
        var vmoID = appCtxService.ctx[viewKeys[i]].vmc.findViewModelObjectById( targetObject.uid );
        if ( vmoID !== -1 ) {
            contextStateMgmtService.updateActiveContext( viewKeys[i] );
            break;
        }
    }

    appCtxService.ctx.aceActiveContext = appCtxService.ctx.aceActiveContext || {
        context: {}
    };
    appCtxService.ctx.aceActiveContext.context.addElementInput = addElementInput;

    addElementService.processAddElementInput();
};

var addElement = function ( sourceObjects ) {
    if ( !currentScope ) {
        panelContentSvc.getViewModelById( 'AceAddOperation' ).then(
            function ( response ) {
                viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                    function ( declViewModel ) {
                        currentScope = AwRootScopeService.instance.$new();
                        declViewModel.sourceObjects = sourceObjects;
                        declViewModel.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
                        viewModelSvc.setupLifeCycle( currentScope, declViewModel );
                        viewModelSvc.executeCommand( declViewModel, 'addElements', currentScope );
                    } );
            } );
    } else {
        currentScope.data.sourceObjects = sourceObjects;
        currentScope.data.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
        viewModelSvc.executeCommand( currentScope.data, 'addElements', currentScope );
    }
};

var addElementToBookmark = function ( sourceObjects, targetObject ) {
    if ( !currentScope ) {
        panelContentSvc.getViewModelById( 'AceAddOperation' ).then(
            function ( response ) {
                viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                    function ( declViewModel ) {
                        currentScope = AwRootScopeService.instance.$new();
                        declViewModel.sourceObjects = sourceObjects;
                        declViewModel.targetObjectToAdd = targetObject;
                        declViewModel.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
                        viewModelSvc.setupLifeCycle( currentScope, declViewModel );
                        viewModelSvc.executeCommand( declViewModel, 'addElementsToBookmark', currentScope );
                    } );
            } );
    } else {
        currentScope.data.sourceObjects = sourceObjects;
        currentScope.data.targetObjectToAdd = targetObject;
        currentScope.data.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
        viewModelSvc.executeCommand( currentScope.data, 'addElementsToBookmark', currentScope );
    }
};
export let aceDefaultPasteHandler = function ( targetObject, sourceObjects ) {
    if( appCtxService.ctx.aceActiveContext.context.isMarkupEnabled && !appCtxService.ctx.aceActiveContext.context.addObjectIntent ) {
        return;
    }
    updateCtxForAddUsingElementDrop( targetObject, sourceObjects );
    addElement( sourceObjects );
};

export let aceDefaultPasteHandlerForSWC = function ( targetObject, sourceObjects ) {
    updateCtxForAddUsingElementDrop( targetObject, sourceObjects );
    addElementToBookmark( sourceObjects, targetObject );
};

export let acePasteObjectsFromClipboard = function () {
    if ( appCtxService.ctx.cutIntent && appCtxService.ctx.cutIntent === true ) {
        appCtxService.ctx.aceActiveContext.context.addObjectIntent = 'MoveIntent';
    } else {
        appCtxService.ctx.aceActiveContext.context.addObjectIntent = 'paste';
    }
    pasteService.execute( appCtxService.ctx.selected, appCtxService.ctx.awClipBoardProvider, '' );
};

export let attachmentOverridePasteHandler = function ( targetObject, sourceObjects, relationType ) {
    var _primaryContextUid = appCtxService.ctx.aceActiveContext.context.currentState.incontext_uid;
    if ( !_primaryContextUid ) {
        return tcDefaultPasteHandler.tcDefaultPasteHandler( targetObject, sourceObjects, relationType );
    }
        //use adapter service to find backing object in case targetobject is RBO
        var objectsToBeAdapted = [];
        objectsToBeAdapted.push( sourceObjects );
        return adapterSvc.getAdaptedObjects( objectsToBeAdapted ).then( function ( adaptedObjs ) {
            if ( adaptedObjs && adaptedObjs.length > 0 ) {
                var sourceObjs = adaptedObjs[0];
                var _targetObjUid = null;
                var pwaSelections = appCtxService.getCtx( 'aceActiveContext.context' ).pwaSelectionModel.getSelection();
                if ( pwaSelections.length === 1 ) {
                    _targetObjUid = pwaSelections[0];
                }
                var attachObjectInput = null;
                _.forEach( sourceObjs, function ( sourceObj ) {
                    if ( sourceObj !== null ) {
                        attachObjectInput = [ {
                            clientId: '',
                            relationType: relationType,
                            primary: {
                                type: 'Awb0Element',
                                uid: _targetObjUid
                            },
                            primaryContext: {
                                type: 'Awb0Element',
                                uid: _primaryContextUid
                            },
                            secondary: {
                                type: sourceObj.type,
                                uid: sourceObj.uid
                            }
                        } ];
                    }
                } );
                return soaSvc.post( 'Internal-ActiveWorkspaceBom-2015-03-OccurrenceManagement', 'attachObjects', {
                    input: attachObjectInput
                } ).then(
                    function ( response ) {
                        return response;
                    } );
            }
            return AwPromiseService.instance.reject( 'Invalid response received' );
        } );
};

/**
 * Add element services
 */

export default exports = {
    aceDefaultPasteHandler,
    aceDefaultPasteHandlerForSWC,
    acePasteObjectsFromClipboard,
    attachmentOverridePasteHandler
};
app.factory( 'aceDefaultPasteHandler', () => exports );
