//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Arm1PasteOperationService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import addElementService from 'js/addElementService';
import ClipboardService from 'js/clipboardService';
import viewModelSvc from 'js/viewModelService';
import panelContentSvc from 'js/panelContentService';
import AwRootScopeService from 'js/awRootScopeService';
import viewModelObjectService from 'js/viewModelObjectService';
import 'js/eventBus';
import messagingService from 'js/messagingService';

var exports = {};
var _currentScope = null;

/**
 * Adds intent for pasting object
 *
 */
var addIntentForPaste = function( addElementInput ) {
    if ( appCtxService.ctx.cutIntent && appCtxService.ctx.cutIntent === true ) {
        appCtxService.ctx.aceActiveContext.context.addObjectIntent = 'MoveIntent';
    } else {
        appCtxService.ctx.aceActiveContext.context.addObjectIntent = 'paste';
    }

    if ( appCtxService.ctx.aceActiveContext.context.addObjectIntent ) {
        if ( appCtxService.ctx.aceActiveContext.context.addObjectIntent === 'MoveIntent' ) {
            addElementInput.addObjectIntent = 'MoveIntent';
            delete appCtxService.ctx.aceActiveContext.context.addObjectIntent;
        } else if ( appCtxService.ctx.aceActiveContext.context.addObjectIntent === 'paste' ) {
            addElementInput.addObjectIntent = '';
            delete appCtxService.ctx.aceActiveContext.context.addObjectIntent;
        }
    } else { addElementInput.addObjectIntent = 'DragAndDropIntent'; }
};

/**
 * Paste object as child. Pastes the objects in clipboard as child to the selected object.
 *
 */
export let pasteObjectAsChild = function() {
    var addElementInput = {};
    var clipboardObjects = ClipboardService.instance.getContents();

    addIntentForPaste( addElementInput );

    appCtxService.ctx.occmgmtContext = appCtxService.ctx.occmgmtContext || {};
    appCtxService.ctx.occmgmtContext.addElementInput = addElementInput;

    addElementService.processAddElementInput();
    _addElement( clipboardObjects );
};

/**
 * Paste object as sibling. Paste the objects in clipboard as sibling to the selected object.
 *
 */
export let pasteObjectAsSibling = function() {
    var addElementInput = {};
    var clipboardObjects = ClipboardService.instance.getContents();

    addIntentForPaste( addElementInput );
    addElementInput.parentElement = viewModelObjectService
        .createViewModelObject( appCtxService.ctx.selected.props.awb0Parent.dbValues[ 0 ] );
    addElementInput.siblingElement = appCtxService.ctx.selected;

    appCtxService.ctx.occmgmtContext = appCtxService.ctx.occmgmtContext || {};
    appCtxService.ctx.occmgmtContext.addElementInput = addElementInput;

    addElementService.processAddElementInput();
    _addElement( clipboardObjects );
};

var _addElement = function( sourceObjects ) {
    panelContentSvc.getViewModelById( 'AceAddOperation' ).then(
        function( response ) {
            viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                function( declViewModel ) {
                    _currentScope = AwRootScopeService.instance.$new();
                    declViewModel.sourceObjects = sourceObjects;
                    declViewModel.addElementInput = appCtxService.ctx.aceActiveContext.context.addElement;
                    viewModelSvc.setupLifeCycle( _currentScope, declViewModel );
                    viewModelSvc.executeCommand( declViewModel, 'addElements', _currentScope ).then( function() {
                        _currentScope.$destroy();
                        _currentScope = null;
                    }, function( error ) {
                        _currentScope.$destroy();
                        _currentScope = null;
                        if( error ) {
                            var errMsg = messagingService.getSOAErrorMessage( error );
                            messagingService.showError( errMsg );
                        }
                    } );
                } );
        } );
};

/**
 * Add element services
 */

export default exports = {
    pasteObjectAsChild,
    pasteObjectAsSibling
};
app.factory( 'Arm1PasteOperationService', () => exports );
