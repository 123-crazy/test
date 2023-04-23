// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aceDefaultCutCopyService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import ClipboardService from 'js/clipboardService';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};
var _cutVMOs = [];
var _awClipBoardUpdateEventSubscription = null;
var _aceDataLoadedEventListener = null;
var _addElementListener = null;
var _replaceElementListener = null;
var _treeReloadCompleteEvent = null;

var _setGreyOut = function( VMOs ) {
    var temp = [];
    //set isPendingCut prop on VMO true
    for( var ndx = 0; ndx < VMOs.length; ndx++ ) {
        var index = appCtxService.ctx.aceActiveContext.context.vmc.findViewModelObjectById( VMOs[ ndx ].uid );
        if( index !== -1 ) {
            appCtxService.ctx.aceActiveContext.context.vmc.loadedVMObjects[ index ].isPendingCut = true;
            temp.push( appCtxService.ctx.aceActiveContext.context.vmc.loadedVMObjects[ index ] );
        }
    }

    if( !_.isEmpty( temp ) ) {
        _cutVMOs = temp;
    }

    // refresh the pltable
    var eventData = { refreshAllViews: true };
    eventBus.publish( 'reRenderTableOnClient', eventData );
};

var _resetCutAction = function() {
    // if cut after cut -->keep greyout
    //if copy after cut --> remove greyout
    if( appCtxService.ctx.cutIntent && appCtxService.ctx.cutIntent === true ) {
        delete appCtxService.ctx.cutIntent;

        //already pending for cut ? make it false
        if( !_.isEmpty( _cutVMOs ) ) {
            for( var ndx = 0; ndx < _cutVMOs.length; ndx++ ) {
                if( _cutVMOs[ ndx ].isPendingCut ) {
                    delete _cutVMOs[ ndx ].isPendingCut;
                }
            }
        }

        var eventData = { refreshAllViews: true };
        eventBus.publish( 'reRenderTableOnClient', eventData );
    }
};

var _initializeEventSubscriptions = function() {
    //subscribe to clipboard change event for remove greyout after cut/copy toggle
    if( !_awClipBoardUpdateEventSubscription ) {
        _awClipBoardUpdateEventSubscription = eventBus.subscribe( 'appCtx.register', function( eventData ) {
            if( eventData.name === 'awClipBoardProvider' ) {
                _resetCutAction();
            }
        } );
    }

    //subscribe to occDataLoadedEvent event to know when new vmo's are created
    if( !_aceDataLoadedEventListener ) {
        _aceDataLoadedEventListener = eventBus.subscribe( 'occDataLoadedEvent', function( eventData ) {
            if( eventData && eventData.dataProviderActionType && eventData.dataProviderActionType === 'initializeAction' && appCtxService.ctx.cutIntent ) {
                _resetCutAction();
            }
        } );
    }

    //subscribe to addElement event for remove greyout after element added from add panel
    if( !_addElementListener ) {
        _addElementListener = eventBus.subscribe( 'addElement.elementsAdded', function() {
            if( appCtxService.ctx.cutIntent ) {
                _resetCutAction();
            }
        } );
    }

    //subscribe to addElement event for remove greyout after element added from add panel
    if( !_replaceElementListener ) {
        _replaceElementListener = eventBus.subscribe( 'replaceElement.elementReplacedSuccessfully', function() {
            if( appCtxService.ctx.cutIntent ) {
                _resetCutAction();
            }
        } );
    }

    // occDataLoadedEvent event listener destroy the cut intent on creation of new vmo's(since on creation of new vmo's cut grey out gets removed )
    //after user navigates back and forth between ace/home our listener for occDataLoadedEvent should get destroyed so that our cut intent will not get deleted and is carried to the different structure
    // once new structure is loaded we need our listener back so that on reset the behaviour will be consistent before back forth navigation and after .
    // following subscription happens when user has cut intention and is navigating back-forth from ace and when that newly navigated structure gets completely loaded
    //at this point resubscribe to cut events.
    if( !_treeReloadCompleteEvent ) {
        _treeReloadCompleteEvent = eventBus.subscribe( 'appCtx.update', function( eventData ) {
            if( appCtxService.ctx.cutIntent && appCtxService.ctx.cutIntent === true && eventData.target === 'treeLoadingInProgress' &&
                appCtxService.ctx.aceActiveContext.context.treeLoadingInProgress === false ) {
                _initializeEventSubscriptions();

                if( !_.isEmpty( _cutVMOs ) ) {
                    _setGreyOut( _cutVMOs );
                }
            }
        } );
    }
};

/**
 * Perform cut operation on vmo's
 * @param {Object} selectedObjects - array of selected VMO's on client
 */
export let aceCutContentsToClipboard = function( selectedObjects ) {
    _initializeEventSubscriptions();
    // call set content
    ClipboardService.instance.setContents( selectedObjects );
    _cutVMOs = [];
    //apply cut on new vmo
    _setGreyOut( selectedObjects );
    //populate cut intent
    appCtxService.updatePartialCtx( 'cutIntent', true );
};

/**
 * post successful paste clear out the cut action
 */
export let acePostPasteAction = function() {
    _resetCutAction();
    //empty the clipboard
    ClipboardService.instance.setContents();


    // post paste complete lifycycle of all events and unsubscribe them
    if( appCtxService.ctx.cutIntent ) {
        delete appCtxService.ctx.cutIntent;
    }

    if( _awClipBoardUpdateEventSubscription ) {
        eventBus.unsubscribe( _awClipBoardUpdateEventSubscription );
        _awClipBoardUpdateEventSubscription = null;
    }

    if( _aceDataLoadedEventListener ) {
        eventBus.unsubscribe( _aceDataLoadedEventListener );
        _aceDataLoadedEventListener = null;
    }

    if( _addElementListener ) {
        eventBus.unsubscribe( _addElementListener );
        _addElementListener = null;
    }

    if( _replaceElementListener ) {
        eventBus.unsubscribe( _replaceElementListener );
        _replaceElementListener = null;
    }

    if( _treeReloadCompleteEvent ) {
        eventBus.unsubscribe( _treeReloadCompleteEvent );
        _treeReloadCompleteEvent = null;
    }
};

/**
 * when leaving occmgmt clear the service
 */

export let destroy = function() {
    // destroy all subscription except _treeReloadCompleteEvent which we need to reinitialize subscriptions post tree reload
    // when navigating back into ace

    if( _aceDataLoadedEventListener ) {
        eventBus.unsubscribe( _aceDataLoadedEventListener );
        _aceDataLoadedEventListener = null;
    }

    if( _addElementListener ) {
        eventBus.unsubscribe( _addElementListener );
        _addElementListener = null;
    }

    if( _replaceElementListener ) {
        eventBus.unsubscribe( _replaceElementListener );
        _replaceElementListener = null;
    }
};

export default exports = {
    aceCutContentsToClipboard,
    acePostPasteAction,
    destroy
};

app.factory( 'aceDefaultCutCopyService', () => exports );
