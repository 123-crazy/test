//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 CKEDITOR5
 */

/**
 * Module for the Ckeditor5 in Requirement Documentation Page
 *
 * @module js/Arm0RequirementCkeditor5Service
 */
import app from 'app';
import _appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import iconSvc from 'js/iconService';
import localeService from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import markupService from 'js/Arm0MarkupService';

import Arm0CkeditorConfigProvider from 'js/Arm0CkeditorConfigProvider';
import RMInsertImage from 'js/rmCkeInsertImage/rmInsertImage';
import RMImageSchemaExtender from 'js/rmCkeInsertImage/rmImageSchemaExtender';
import RMInsertOLE from 'js/rmCkeInsertOLE/rmInsertOLE';
import pageDown, { addPageDownCommand } from 'js/rmPageDownHandler/pagedown';
import pageUp, { addPageUpCommand } from 'js/rmPageUpHandler/pageup';
import RequirementWidget from 'js/rmCkeRequirementWidget/requirementWidget';
import RMCrossSelection from 'js/rmCkeCrossSelection/rmCkeCrossSelection';
import RMSpan from 'js/rmCkeSpanHandler/span';
import RMContentTable from 'js/rmCkeRMContentTable/rmContentTable';
import RMSelectionHandler from 'js/rmCkeSelectionHandler/rmSelectionHandler';
import Mathematics from 'js/rmCkeInsertEquation/math';
import RMSplitRequirement from 'js/rmCkeSplitRequirement/rmCkeSplitRequirement';
import RMReuseIntegration from 'js/rmCkeReuseToolIntegration/rmReuseIntegration';
import RMCrossReferenceLink from 'js/rmCkeCrossReferenceLink/crossReferenceLink';
import { ConvertDivAttributes, ConvertParaAttributes } from 'js/rmCkeAttributeHandler/rmAttributeHandler';
import Mention from 'js/rmCkeReuseToolIntegration/rmCkeMentionPlugin/mention';
import RMParamToReqHandler from 'js/rmCkeParamToReqHandler/rmParamToReqHandler';
import CommentsAdapter from 'js/Arm0CommentAdapter';
import TrackChangeAdapter from 'js/Arm0TrackChangeAdapter';
import NewCommentBaseView from 'js/Arm0CommentBaseView';
import NewCommentView from 'js/Arm0CommentView';
import RMInternalLinks from 'js/rmCkeInternalLinks/rmCkeInternalLinks';
import RMLoadingWidget from 'js/rmCkeLoadingWidget/rmLoadingWidget';

var exports = {};

var _data;
var _cke = null;
var resizePromise;

var initCKEditorListener;
var resizeReqViewerOnCmdResizeListener;
var resizeReqViewerOnSplitterUpdateListener;
var resizeReqViewerOnSidePanelOpenListener;
var registerEventListenerToResizeEditor;
var resizeReqViewerOnInitCkeEventListener;

/**
 * Generate unique Id for Ck Editor
 *
 * @return {String} random id
 */
function _generateID() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return 'ckeditor-instance-' + Math.random().toString( 36 ).substr( 2, 9 );
}

/**
 * Sets the viewer height
 *
 * @return {Void}
 */
function setEditorHeight() {
    var height = 0;
    var element = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' )[ 0 ];
    if( element && element.getElementsByClassName( 'ck-editor__top' ).length > 0 && element.getElementsByClassName( 'ck-content' ).length > 0 ) {
        if( _appCtxSvc.ctx.Arm0SingleRequirementWidePanelEditorActive ) {
            if( _cke && _cke.editing && _cke.editing.view ) {
                height = element.offsetHeight - 40 - 2;
                _cke.editing.view.change( writer => {
                    writer.setStyle( 'height', height + 'px', _cke.editing.view.document.getRoot() );
                } );
            }
        } else {
            var top_ele = element.getElementsByClassName( 'ck-editor__top' )[0];
            var content_ele = element.getElementsByClassName( 'ck-content' )[ 0 ];
            var commandBarEle = document.getElementsByClassName( 'aw-requirements-commandBarIcon' );
            var commandBarExpanded = true;
            if( commandBarEle && commandBarEle.length > 0 && commandBarEle[0].offsetHeight <= 5 ) {
                commandBarExpanded = false; // If commandBar not expanded yet, skip 40 px for commandbar
            }
            var mainLayoutElement = _getMainLayoutPanel( content_ele );
            if( _appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Overview' ) {
                height = 350;
            } else if( mainLayoutElement ) {
                height = mainLayoutElement.offsetHeight - top_ele.offsetHeight - 1 - 2; //1px is roud up ad client offset height in decimal. 2px is margin for cke content div
                height = !commandBarExpanded ? height - 40 : height;
            } else if( window.innerHeight > element.offsetTop ) {
                height = window.innerHeight - element.offsetTop - top_ele.offsetHeight - 12;
                height = !commandBarExpanded ? height - 40 : height;
                height = height > 300 ? height : 300;
            } else {
                // this means panel section of UV is drop downed and have to scroll to view it.
                height = window.innerHeight - 120; // 60px from header + 60px from footer
            }

            if( _cke && _cke.editing && _cke.editing.view ) {
                _cke.editing.view.change( writer => {
                    writer.setStyle( 'height', height + 'px', _cke.editing.view.document.getRoot() );
                } );
            }
        }
    }
}

/**
 * Find if given element is added inside the main panel, if yes return main panel element
 *
 * @param {Object} element - html dom element
 * @returns {Object} html dom element or null
 */
function _getMainLayoutPanel( element ) {
    if( !element ) {
        return null;
    }
    if( element.classList.contains( 'aw-layout-panelMain' ) ) {
        return element;
    }
    return _getMainLayoutPanel( element.parentElement );
}

/**
 * Implements promise for window resize event
 *
 * @return {Void}
 */
function _resizeTimer() {
    resizePromise = setTimeout( function() {
        if( self && setEditorHeight ) {
            setEditorHeight();
        }
    }, 0 );
}

/**
 * Implements handler for window resize event
 *
 * @return {Void}
 */
export let resizeEditor = function() {
    if( resizePromise ) {
        clearTimeout( resizePromise );
    }
    _resizeTimer();
};
/**
 * Return true if need to exclude insert ole command
 * @returns {Boolean} -
 */
function _isExcludeInsertOLECommand( editorProp ) {
    if( editorProp.dbValue && editorProp.dbValue.excludeInsertOLECommand === true ) {
        return true;
    }
    return false;
}
/**
 *
 */
function _getAdvanceCKEditorConfig() {
    var config = new Arm0CkeditorConfigProvider( _data.prop );
    config = config.getCkeditor5Config();
    config.extraPlugins = [ RMInsertImage, RMSpan, RequirementWidget, RMCrossSelection, ConvertDivAttributes, ConvertParaAttributes,
        RMReuseIntegration, Mention, RMSelectionHandler, RMCrossReferenceLink, RMContentTable, RMParamToReqHandler, RMImageSchemaExtender, RMSplitRequirement,
        Mathematics, CKEDITOR5.Comments, CommentsAdapter, RMInternalLinks, RMLoadingWidget ];

    if( _data.preferences && _data.preferences.Req_TrackChanges_enabled && _data.preferences.Req_TrackChanges_enabled[0] === 'true' ) {
        config.extraPlugins.push( CKEDITOR5.TrackChanges );
        config.extraPlugins.push( TrackChangeAdapter );
    }
    if( !_isExcludeInsertOLECommand( _data.prop ) ) {
        config.extraPlugins.push( RMInsertOLE );
    }
        var page_size = 0;
    if( _data.prop.preferences && _data.prop.preferences.AWC_req_viewer_page_size_deleted ) {
        page_size = parseInt( _data.prop.preferences.AWC_req_viewer_page_size_deleted[ 0 ] );
    }
    //if( page_size > 0 ) {
        config.extraPlugins.push( pageUp );
        config.toolbar.push( 'pageUp' );
        config.extraPlugins.push( pageDown );
        config.toolbar.push( 'pageDown' );
    //}
    var sidebar = {
        container: document.querySelector( '.aw-richtexteditor-editorSidebar .aw-richtexteditor-commentSidebar' )
    };
    config.sidebar = sidebar;
    // hide ckeditor sidebar
    markupService.hideCkeditorSidebar();

    config.comments = {
        CommentThreadView: NewCommentBaseView,
        CommentView : NewCommentView
    };
    // Track Changes - Production license
    config.licenseKey = 'xlpIW5v2OAuVfBRXs09mfgNGjMfIVhY/mdhx8sPgbYsqLJL0cKLy/iM=';
    // Track Changes - Developement license
    // config.licenseKey = 'ixm9DdzDGBBqGwrBtVGw9tp70TqQziaQJqYlGMmoo72TOZ7a0K5bz6Q=';
    // config.trackChanges.disableComments = true;
    return config;
}

/**
 *
 */
function _showCkEditor() {
    var ckEditorId = _data.prop.id;
    var _advanceNoDropConfig = _getAdvanceCKEditorConfig();
    var config = _advanceNoDropConfig;

    _createInstance( ckEditorId, config ).then(
        function( response ) {
            _cke = response;
            _cke.iconSvc = iconSvc;
            _cke.eventBus = eventBus;
            _cke.getBaseURL = browserUtils.getBaseURL();
            _cke.getBaseUrlPath = app.getBaseUrlPath();

            var resource = 'RichTextEditorCommandPanelsMessages';
            var localTextBundle = localeService.getLoadedText( resource );

            _cke.changeTypeTitle = localTextBundle.changeTypeTitle;
            _cke.requirementRevision = localTextBundle.requirementRevision;
            _cke.addTitle = localTextBundle.addTitle;
            _cke.removeTitle = localTextBundle.removeTitle;
            _cke.addSiblingKeyTitle = localTextBundle.addSiblingKeyTitle;
            _cke.addChildKeyTitle = localTextBundle.addChildKeyTitle;
            _cke.childTitle = localTextBundle.childTitle;
            _cke.siblingTitle = localTextBundle.siblingTitle;
            _cke.createTraceLinkTitle = localTextBundle.createTraceLinkTitle;
            _cke.tocSettingsCmdTitle = localTextBundle.tocSettingsCmdTitle;
            _cke.update = localTextBundle.update;
            _cke.delete = localTextBundle.delete;
            _cke.addParameter = localTextBundle.addParameter;
            _cke.mapExistingParameter = localTextBundle.mapExistingParameter;
            var addImgSrc = app.getBaseUrlPath() + '/image/' + 'cmdAdd24.svg';
            var addImgAlt = _cke.addTitle + '\n' + _cke.addSiblingKeyTitle + '\n' + _cke.addChildKeyTitle;
            var removeImgAlt = _cke.removeTitle;

            _cke.addIconImgElement = '<img class="aw-base-icon" src="' + addImgSrc + '" alt="' + addImgAlt + '" />';
            var removeImgSrc = app.getBaseUrlPath() + '/image/' + 'cmdRemove24.svg';
            _cke.removeIconImgElement = '<img class="aw-base-icon" src="' + removeImgSrc + '" alt="' + removeImgAlt + '"/>';
            var coSrc = app.getBaseUrlPath() + '/image/' + 'indicatorCheckedOut16.svg';
            _cke.checkoutIconImgElement = '<img class="aw-base-icon" src="' + coSrc + '" />';
            _cke.createTraceLinkTitle = localTextBundle.createTraceLinkTitle;
            _cke.createTraceLink = localTextBundle.createTraceLink;
            _cke.indicatorSuspectLink = localTextBundle.indicatorSuspectLink;
            _cke.indicatorTraceLink = localTextBundle.indicatorTraceLink;

            registerCkeditorInstanceIsReady( ckEditorId, response );
            exports.resizeEditor();
        } );
}

/**
 *
 * @param {String} ckeditorid - id
 * @param {Object} config - json object
 */
function _createInstance( ckeditorid, config ) {
    var deferred = AwPromiseService.instance.defer();
    var editorDiv = document.querySelector( '#' + ckeditorid );
    if( !editorDiv ) {
        editorDiv = document.querySelector( '.aw-ckeditor-panel.aw-requirements-mainPanel' );
        editorDiv = editorDiv.firstElementChild;
    }

    CKEDITOR5.ClassicEditor.create( editorDiv, config ).then( editor => {
            editor.editing.view.change( writer => {
                writer.setAttribute( 'contenteditable', 'false', editor.editing.view.document.getRoot() );
            } );

            // Enable custom commands with Track Changes
            if( editor.plugins._availablePlugins.has( 'TrackChanges' ) ) {
                var trackChanges = editor.plugins.get( 'TrackChangesEditing' );
                trackChanges.enableCommand( 'insertRequirement' );
            }

            /**************************** Comment plugin related code *******************************/
                // Switch between inline, narrow sidebar and wide sidebar according to the window size.
                // const annotations = editor.plugins.get( 'Annotations' );
                const annotationsUIs = editor.plugins.get( 'AnnotationsUIs' );
                const sidebarElement = document.querySelector( '.aw-richtexteditor-editorSidebar' );

                /**
                 *
                 */
                function refreshDisplayMode() {
                    // if ( window.innerWidth < 1000 ) {
                        // sidebarElement.classList.remove( 'narrow' );
                        // sidebarElement.classList.add( 'hidden' );
                        // annotationsUIs.switchTo( 'inline' );
                    // } else
                    if ( window.innerWidth < 1300 ) {
                        sidebarElement.classList.remove( 'hidden' );
                        sidebarElement.parentElement.classList.add( 'narrow' );
                        annotationsUIs.switchTo( 'narrowSidebar' );
                    } else {
                        sidebarElement.classList.remove( 'hidden' );
                        sidebarElement.parentElement.classList.remove( 'narrow' );
                        annotationsUIs.switchTo( 'wideSidebar' );
                    }
                }
                // Prevent closing the tab when any action is pending.
                editor.ui.view.listenTo( window, 'beforeunload', ( evt, domEvt ) => {
                    if ( editor.plugins.get( 'PendingActions' ).hasAny ) {
                        domEvt.preventDefault();
                        domEvt.returnValue = true;
                    }
                } );
                editor.ui.view.listenTo( window, 'resize', refreshDisplayMode );
                refreshDisplayMode();
                handlePasteEventOnSidebar();
                handleScrollEventInContent( editor );

            /***************************** Upto Here ********************************/
            deferred.resolve( editor );
        } )
        .catch( error => {
            console.error( error.stack );
        } );

    return deferred.promise;
}

/**
 * Function to add scroll event on editor content area, to update sidebar
 * @param {Object} editor - Editor instance
 */
function handleScrollEventInContent( editor ) {
    var root = editor.editing.view.document.getRoot();
    var domRootElement = editor.editing.view.domConverter.mapViewToDom( root );
    domRootElement.addEventListener( 'scroll', function( ) {
        if( _appCtxSvc.ctx.ckeditorSidebar && _appCtxSvc.ctx.ckeditorSidebar.isOpen ) {
            const annotationsUIs = editor.plugins.get( 'AnnotationsUIs' );
            if( annotationsUIs.isActive( 'wideSidebar' ) ) {
                annotationsUIs.switchTo( 'wideSidebar' );
            } else if( annotationsUIs.isActive( 'narrowSidebar' ) ) {
                annotationsUIs.switchTo( 'narrowSidebar' );
            }
        }
    } );
}

/**
 * Function to handle Paste event on comment/trackchange input
 * Stop propagation of paste event to avoid paste event handling on document
 */
function handlePasteEventOnSidebar() {
    var commentSidebar = document.querySelector( '.aw-richtexteditor-editorSidebar .aw-richtexteditor-commentSidebar' );
    if( commentSidebar ) {
        [ 'keydown', 'keyup' ].forEach( eventName => {
            commentSidebar.addEventListener( eventName, function( event ) {
                // Target element is comment/track change input
                if( event && event.target && event.target.classList.contains( 'ck-editor__editable' ) ) {
                    var keyId = event.keyCode;
                    var ctrl = event.ctrlKey;
                    if ( ctrl && keyId !== 17 && keyId === 86 ) {  // KeyCode: Ctrl - 17, V - 86
                        event.stopPropagation(); // Stop propogation on Ctrl + V
                    }
                }
            } );
        } );
    }
}

/**
 * Cleanup all watchers and instance members when this is destroyed.
 *
 * @return {Void}
 */
export let destroyCkeditor = function() {
    if( initCKEditorListener ) {
        eventBus.unsubscribe( initCKEditorListener );
    }
    if( _cke ) {
        eventBus.unsubscribe( resizeReqViewerOnCmdResizeListener );
        eventBus.unsubscribe( resizeReqViewerOnSplitterUpdateListener );
        eventBus.unsubscribe( resizeReqViewerOnSidePanelOpenListener );
        eventBus.unsubscribe( registerEventListenerToResizeEditor );
        eventBus.unsubscribe( resizeReqViewerOnInitCkeEventListener );
        _cke.destroy();
        ckeditorInstanceDestroyed();
    }
};

/**
 * Controller Init.
 *
 * @return {Void}
 */
export let initCkeditor = function( data ) {
    var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
    if( !subPanelContext ) {
        return;
    }
    // Register the context only when in ACE Viewer
    if( subPanelContext.dbValue && subPanelContext.dbValue.showEditorSidebar ) {
        var ckeditorSidebar = _appCtxSvc.getCtx( 'ckeditorSidebar' );
        if( !ckeditorSidebar ) {
            _appCtxSvc.registerCtx( 'ckeditorSidebar', { isOpen : false } );
        }
    }

    _data = data;
    data.prop = subPanelContext;
    if( !data.prop.id ) {
        data.prop.id = _generateID();
    }

    registerCkeditorInstanceNotReady( _data.prop.id );

    if( data.prop.showCKEditor ) {
        setTimeout( function() {
            _showCkEditor();
        }, 100 );
    } else {
        // Register event for initCKEditorEvent
        initCKEditorListener = eventBus.subscribe( 'requirement.initCKEditorEvent', function() {
            eventBus.unsubscribe( initCKEditorListener );
            initCKEditorListener = undefined;
            _showCkEditor();
        }, data );
    }

    resizeReqViewerOnCmdResizeListener = eventBus.subscribe( 'commandBarResized', function() {
        _resizeTimer();
    } );

    resizeReqViewerOnSplitterUpdateListener = eventBus.subscribe( 'aw-splitter-update', function() {
        _resizeTimer();
    } );

    resizeReqViewerOnSidePanelOpenListener = eventBus.subscribe( 'appCtx.register', function( eventData ) {
        // Resize if user opens/close command panel
        if( eventData && eventData.name === 'activeToolsAndInfoCommand' ) {
            _resizeTimer();
        }
    } );

    registerEventListenerToResizeEditor = eventBus.subscribe( 'requirementsEditor.resizeEditor', function() {
        _resizeTimer();
    } );

    resizeReqViewerOnInitCkeEventListener = eventBus.subscribe( 'requirement.initCKEditorEvent', function() {
        _resizeTimer();
    } );
};

/**
 * Update ctx, ckeditor is getting instantiated and it is not yet ready
 *
 * @param {String} ckeditorId - ckeditor instance id
 */
function registerCkeditorInstanceNotReady( ckeditorId ) {
    _appCtxSvc.registerCtx( 'AWRequirementsEditor', { ready: false, id: ckeditorId } );
}

/**
 * Update ctx, ckeditor is instantiated and it is ready
 *
 * @param {String} ckeditorId - ckeditor instance id
 * @param {Object} editorInstance - ckeditor instance
 */
function registerCkeditorInstanceIsReady( ckeditorId, editorInstance ) {
    _appCtxSvc.updateCtx( 'AWRequirementsEditor', { ready: true, id: ckeditorId, editor: editorInstance } );
}

/**
 * Update ctx, ckeditor is instance destroyed
 */
function ckeditorInstanceDestroyed() {
    _appCtxSvc.unRegisterCtx( 'AWRequirementsEditor' );
}

 export let refreshPageUpDownButtonsVisibility = function( eventData ) {
    addPageUpCommand( _cke, eventData.pageUp );
    addPageDownCommand( _cke, eventData.pageDown );
 };

    /**
  *
  */
 export let toggleSidebarListener = function() {
    var editorElement = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' )[0];
    if( _appCtxSvc.ctx.ckeditorSidebar && _appCtxSvc.ctx.ckeditorSidebar.isOpen ) {
        //Sidebar ON
        if( !editorElement.classList.contains( 'aw-richtexteditor-editorWithSidebar' ) ) {
            editorElement.classList.add( 'aw-richtexteditor-editorWithSidebar' );
        }
    } else {
        //Sidebar OFF
        if( editorElement.classList.contains( 'aw-richtexteditor-editorWithSidebar' ) ) {
            editorElement.classList.remove( 'aw-richtexteditor-editorWithSidebar' );
        }
    }
 };

export default exports = {
    destroyCkeditor,
    initCkeditor,
    resizeEditor,
    refreshPageUpDownButtonsVisibility,
    toggleSidebarListener
};
/**
 * This factory creates a service for ckeditor5
 *
 * @memberof NgServices
 * @member Arm0RequirementCkeditor5Service
 * @param {Object} appCtxSvc app context service
 * @return {Object} service exports exports
 */
app.factory( 'Arm0RequirementCkeditor5Service', () => exports );
