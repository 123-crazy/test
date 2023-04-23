/* eslint-disable max-lines */
/* eslint-disable complexity */
/* eslint-disable no-console */
/* eslint-disable no-nested-ternary */
// Copyright 2022 Siemens Product Lifecycle Management Software Inc.

/* global CKEDITOR */

/**
 * AW Markup service
 *
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0MarkupService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import localeSvc from 'js/localeService';
import iconSvc from 'js/iconService';
import messageService from 'js/messagingService';
import awIconService from 'js/awIconService';
import commandPanelSvc from 'js/commandPanel.service';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import _ from 'lodash';
import markupViewModel from 'js/MarkupViewModel';
import markupOperation from 'js/MarkupOperation';
import awEditorService from 'js/awRichTextEditorService';

//=============== cached AW directives, services, and objects =================

var _defaultNonTcUser = { typeIconURL: app.getBaseUrlPath() + '/image/typePersonGray48.svg' };
var _i18n = {};
let ckeEditor;
let overrideLoad = {};
let overrideSave = {};
let overrideUiOptions = {};

//======================= exported vars and functions =========================
let exports;
export let i18n = _i18n;
const supportedViewerTypes = [ 'aw-pdf-viewer', 'aw-image-viewer', 'aw-html-viewer',
    'aw-text-viewer', 'aw-2d-viewer', 'aw-onscreen-3d-markup-viewer' ];

/**
 * Set context for markup module
 */
export let setContext = function() {
    var markupCtx = exports.getMarkupContext();
    var viewerCtx = exports.getContext( 'viewerContext' );

    if( viewerCtx && viewerCtx.type && viewerCtx.type !== '' ) {
        markupCtx.viewerType = viewerCtx.type;
        if( markupCtx.viewerType === 'aw-pdf-viewer' ) {
            markupOperation.setPdfFrame( viewerCtx.pdfFrame );
        }

        if( viewerCtx.vmo !== markupCtx.baseObject ) {
            markupCtx.baseObject = viewerCtx.vmo;
            markupCtx.version = '';
            markupCtx.count = 0;
            markupCtx.currentSelection = null;
        }

        markupCtx.keep = $( 'button.aw-viewerjs-controlArrow' ).length > 0;
        if( supportedViewerTypes.includes( markupCtx.viewerType ) ) {
            loadMarkups();
        }

        if( !markupCtx.stampsLoaded ) {
            loadStamps();
        }
    }
};

/**
 * Get the context
 *
 * @param {String} name - the context name
 * @return {Object} the context
 */
export let getContext = function( name ) {
    return appCtxSvc.getCtx( name );
};

/**
 * Get the markup context, if not found, register a new one
 *
 * @return {Object} the markup context
 */
export let getMarkupContext = function() {
    var markupCtx = exports.getContext( 'markup' );
    if( !markupCtx ) {
        appCtxSvc.registerCtx( 'markup', {} );
    }
    return exports.getContext( 'markup' );
};

/**
 * Show the Markup panel
 */
export let showPanel = function() {
    var markupCtx = exports.getMarkupContext();
    markupCtx.showPanel = true;
    exports.setContext();
};

/**
 * Hide the Markup panel
 */
export let hidePanel = function() {
    var markupCtx = exports.getMarkupContext();
    markupCtx.showPanel = false;
    markupCtx.keep = false;

    exports.endMarkupEdit();
    if( !markupCtx.showMarkups ) {
        clearMarkups();
    } else if( markupViewModel.setFilter( '' ) ) {
        exports.updateMarkupList();
    }
};

/**
 * Show Markups even without the Markup panel, toggle true and false
 */
export let showMarkups = function() {
    var markupCtx = exports.getMarkupContext();
    markupCtx.showMarkups = !markupCtx.showMarkups;
    setShowMarkupsInfo();

    if( !markupCtx.showPanel ) {
        if( markupCtx.showMarkups ) {
            exports.setContext();
        } else {
            clearMarkups();
        }
    }
};

/**
 * Process Markups
 *
 * @param {Object} response - The soa response
 * @return {Object} the markup data
 */
export let processMarkups = function( response ) {
    exports.setLoginUser();
    var markupCtx = exports.getMarkupContext();
    var message = response.properties && response.properties.message || response.message || '';

    markupCtx.version = response.version;
    markupViewModel.processMarkups( response.version, message, response.markups );
    var markupList = markupViewModel.updateMarkupList();
    if( !markupViewModel.isUpToDate() ) {
        markupList.forEach( function( m ) {
            markupViewModel.updateMarkupHtml( m );
        } );
    }

    setShowMarkupsInfo();
    markupCtx.userNames = markupViewModel.findUsersToLoad();
    markupViewModel.setUserObj( '', _defaultNonTcUser );
    setSupportedTools( true );

    if( markupViewModel.getRole() === 'reader' ) {
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: _i18n.cancel,
            onClick: function( btn ) {
                btn.close();
            }
        } ];
        messageService.showWarning( _i18n.noMarkupPrivilege, buttons );
    }

    initOperation( 5 );

    if( markupCtx.showPanel ) {
        eventBus.publish( 'awp0Markup.resetTabFilter' );
        eventBus.publish( 'awp0Markup.callDataProvider' );

        if( markupCtx.userNames.length > 0 ) {
            eventBus.publish( 'awp0Markup.loadUsers' );
        }

        // the markup is currently selected before showPanel
        if( markupCtx.currentSelection && markupCtx.currentSelection.visible ) {
            listEvalAsync( function() {
                selectInDataProvider( markupCtx.currentSelection, true );
                scrollIntoView( markupCtx.currentSelection );
            } );
        }
    }

    if( markupCtx.currentPos ) {
        for( var i = 0; i < markupList.length; i++ ) {
            var markup = markupList[i];
            if( markup.created === markupCtx.currentPos.created &&
                markup.displayname === markupCtx.currentPos.displayname ) {
                markupCtx.currentPos = markup;
                markupOperation.setTool( 'position' );
                markupOperation.setPositionMarkup( markup );
                break;
            }
        }
    }

    return markupViewModel.getMarkupList();
};

/**
 * Process Users
 *
 * @param {Object} response - The soa response
 */
export let processUsers = function( response ) {
    if( response && response.result ) {
        response.result.forEach( function( mo ) {
            var userObj = cdm.getObject( mo.uid );
            if( userObj ) {
                setUserIcon( userObj );
                markupViewModel.setUserObj( userObj.props.user_id.dbValues[ 0 ], userObj );
            }
        } );
    }
};

/**
 * Select the markup if it is in the markupList
 *
 * @param {object} markup - the markup to be selected
 * @param {boolean} toScroll - true to scroll into view
 */
export let selectMarkup = function( markup, toScroll ) {
    var markupCtx = exports.getMarkupContext();
    if( markup.visible && markup !== markupCtx.currentSelection ) {
        if( markupCtx.showPanel ) {
            selectInDataProvider( markup, true );
            if( toScroll ) {
                scrollIntoView( markup );
            }
        } else {
            exports.markupSelected( { selectedObjects: [ markup ] } );
        }
    }
};

/**
 * Unselect the current selection
 */
export let unselectCurrent = function() {
    var markupCtx = exports.getMarkupContext();
    if( markupCtx.currentSelection && markupCtx.currentSelection.visible ) {
        markupCtx.previousSelection = markupCtx.currentSelection;
        if( markupCtx.showPanel ) {
            selectInDataProvider( markupCtx.currentSelection, false );
        } else {
            exports.markupSelected( { selectedObjects: [] } );
        }
    } else {
        markupCtx.previousSelection = null;
    }
};

/**
 * Select the previous selection
 *
 */
export let selectPrevious = function() {
    var markupCtx = exports.getMarkupContext();
    if( markupCtx.previousSelection && markupCtx.previousSelection.visible ) {
        exports.selectMarkup( markupCtx.previousSelection, true );
    } else {
        markupCtx.previousSelection = null;
    }
};

/**
 * Markup in tool panel is selected or unselected
 *
 * @param {EventData} eventData - the eventData
 */
export let markupSelected = function( eventData ) {
    if( eventData ) {
        var markupCtx = exports.getMarkupContext();
        var selected = eventData.selectedObjects.length > 0 ? eventData.selectedObjects[ 0 ] : null;
        if( selected !== markupCtx.currentSelection ) {
            if( markupCtx.currentSelection && markupCtx.currentSelection.visible ) {
                markupOperation.showAsSelected( markupCtx.currentSelection, 1 );
                markupCtx.currentSelection = null;
            }

            if( selected && selected.date ) {
                markupOperation.showAsSelected( selected, 0 );
                if( eventData.scope ) {
                    markupOperation.ensureVisible( selected );
                }
                markupCtx.currentSelection = selected;
            }
        }
    }
};

/**
 * Update the markup list
 */
export let updateMarkupList = function() {
    exports.unselectCurrent();
    var markupList = markupViewModel.updateMarkupList();
    listUpdate( markupList );
    listEvalAsync( function() {
        exports.selectPrevious();
    } );
};

/**
 * Toggle group between expanded and collapsed
 *
 * @param {Group} group - The group to be toggled
 */
export let toggleGroup = function( group ) {
    exports.unselectCurrent();
    var markupList = markupViewModel.toggleGroup( group );
    listUpdate( markupList );
};

/**
 * Select a tool, if it is the current tool, unselect it. If null, unselect all.
 *
 * @param {String} tool - the tool to be selected
 * @param {String} subTool - the subTool, defined only when tool is shape
 */
export let selectTool = function( tool, subTool ) {
    const markupCtx = exports.getMarkupContext();
    const newTool = tool === markupCtx.selectedTool && subTool === markupCtx.subTool ? null : tool;
    const newSubTool = tool === 'shape' ? subTool : undefined;

    // for stamp tool, show/hide the Stamp panel
    if( newTool === 'stamp' ) {
        if( markupCtx.showPanel ) {
            eventBus.publish( 'awPanel.navigate', {
                destPanelId: 'Awp0MarkupStamp',
                title: _i18n.stamp,
                supportGoBack: true,
                recreatePanel: true
            } );
        } else {
            commandPanelSvc.activateCommandPanel(
                'Awp0MarkupStampMain', 'aw_toolsAndInfo', null, false );
        }
    } else if( markupCtx.selectedTool === 'stamp' ) {
        if( markupCtx.showPanel ) {
            eventBus.publish( 'awPanel.navigate', { destPanelId: 'Awp0Markup' } );
        } else {
            eventBus.publish( 'complete', { source: 'toolAndInfoPanel' } );
        }
    }

    markupOperation.setTool( newTool, newSubTool );
    markupOperation.setPositionMarkup( null );
    markupCtx.selectedTool = newTool;
    markupCtx.subTool = newSubTool;
    markupCtx.currentPos = null;

    if( newTool === 'highlight' ) {
        // For preselected text, add a new markup
        selectionEndCallback( 'highlight' );
    }

    if( newTool === 'stamp' ) {
        // For stamp, set canvas and drop event handler
        markupOperation.showCurrentPage();
    }
};

/**
 * Reply a markup
 *
 * @param {Markup} markup - the current markup
 */
export let replyMarkup = function( markup ) {
    if( markup ) {
        exports.markupSelected( { selectedObjects: [ markup ] } );
    }

    var markupCtx = exports.getMarkupContext();
    var replyMarkup = markupViewModel.addReplyMarkup( markupCtx.currentSelection );
    if( replyMarkup ) {
        exports.selectTool( null );

        var markupList = markupViewModel.getMarkupList();
        listUpdate( markupList );
        listEvalAsync( function() {
            exports.selectMarkup( replyMarkup, true );
        } );

        markupCtx.currentEdit = replyMarkup;

        if( markupCtx.showPanel ) {
            eventBus.publish( 'awPanel.navigate', {
                destPanelId: 'Awp0MarkupEdit',
                title: _i18n.reply,
                supportGoBack: true,
                recreatePanel: true
            } );
        } else {
            commandPanelSvc.activateCommandPanel(
                'Awp0MarkupEditMain', 'aw_toolsAndInfo', null, false );
        }
    }
};

/**
 * Event handler on tab selected: 'page', 'user', 'date', or 'status'
 *
 * @param {Data} data - the input data
 */
export let onTabSelected = function( data ) {
    if( data.activeView === 'Awp0Markup' && data.selectedTab ) {
        var key = data.selectedTab.tabKey;
        if( key === 'page' || key === 'user' || key === 'date' || key === 'status' ) {
            sortMarkupList( key );
        }
    }
};

/**
 * Reset the tab to page, and filter to empty
 *
 * @param {Data} data - the data
 */
 export let resetTabFilter = function( data ) {
    if( data.tabsModel && data.tabsModel.dbValue ) {
        data.tabsModel.dbValue.forEach( ( t, i ) => { t.selectedTab = i === 0; } );
    }

    if( data.filterBox ) {
        data.filterBox.dbValue = '';
    }
};

/**
 * Get the current sortBy
 *
 * @return {String} the current sortBy: 'page', 'user', 'date', or 'status'
 */
export let getSortBy = function() {
    return markupViewModel.getSortBy();
};

/**
 * Filter markups
 *
 * @param {Data} data - the input data
 * @returns {MarkupList} the markup list
 */
export let filterMarkups = function( data ) {
    if( markupViewModel.setFilter( data.filterBox.dbValue ) ) {
        exports.updateMarkupList();
    }

    data.markupList = markupViewModel.getMarkupList();
    return data.markupList;
};

/**
 * Set login user
 *
 * @param {String} userid - the user id
 * @param {String} username - the user name
 */
export let setLoginUser = function( userid, username ) {
    if( userid && username ) {
        markupViewModel.setLoginUser( userid, username );
    } else {
        var session = exports.getContext( 'userSession' );
        if( session ) {
            var userId = session.props.user_id.dbValues[ 0 ];
            var userName = session.props.user.uiValues[ 0 ].replace( /\s*\(\w+\)$/, '' );
            markupViewModel.setLoginUser( userId, userName );
        }
    }
};

/**
 * Viewer content changed
 *
 * @param {EventData} eventData - the event data
 */
export let viewerChanged = function( eventData ) {
    var markupCtx = exports.getMarkupContext();
    if( markupCtx.showPanel || markupCtx.showMarkups ) {
        if( eventData.value ) {
            exports.setContext();
        } else {
            exports.endMarkupEdit();
            clearMarkups();
            if( markupCtx.showPanel && !markupCtx.keep ) {
                eventBus.publish( 'complete', { source: 'toolAndInfoPanel' } );
            }
        }
    }
};

/**
 * Delete the current markup
 *
 * @param {Markup} markup - the current markup
 */
export let deleteMarkup = function( markup ) {
    if( markup ) {
        exports.markupSelected( { selectedObjects: [ markup ] } );
    }

    var markupCtx = exports.getMarkupContext();
    if( markupCtx.currentSelection ) {
        const buttons = [ {
            addClass: 'btn btn-notify',
            text: _i18n.cancel,
            onClick: function( btn ) {
                btn.close();
            }
        }, {
            addClass: 'btn btn-notify',
            text: _i18n.del,
            onClick: function( btn ) {
                btn.close();
                markupViewModel.deleteMarkup( markupCtx.currentSelection );
                exports.updateMarkupList();
                saveMarkups( markupCtx.currentSelection );
            }
        } ];
        messageService.showWarning( _i18n.confirmDeleteMarkup, buttons );
    }
};

/**
 * Edit the current markup
 *
 * @param {Markup} markup - the current markup
 */
export let editMarkup = function( markup ) {
    if( markup ) {
        exports.markupSelected( { selectedObjects: [ markup ] } );
    }

    var markupCtx = exports.getMarkupContext();
    if( markupCtx.currentSelection ) {
        markupCtx.currentEdit = markupCtx.currentSelection;
        markupCtx.currentEdit.editMode = 'edit';

        if( markupCtx.showPanel ) {
            eventBus.publish( 'awPanel.navigate', {
                destPanelId: 'Awp0MarkupEdit',
                title: _i18n.edit,
                supportGoBack: true,
                recreatePanel: true
            } );
        } else {
            commandPanelSvc.activateCommandPanel(
                'Awp0MarkupEditMain', 'aw_toolsAndInfo', null, false );
        }
    }
};

/**
 * Start Edit Main, when the MarkupPanel is not shown
 *
 * @param {Data} data - the input data
 */
export let startEditMain = function( data ) {
    var currentEdit = exports.getMarkupContext().currentEdit;
    if( currentEdit ) {
        data.title = currentEdit.editMode === 'edit' ? _i18n.editMarkup :
                     currentEdit.editMode === 'reply' ? _i18n.replyMarkup : _i18n.addMarkup;
    }
};

/**
 * Start Edit the current markup
 *
 * @param {Data} data - the input data
 */
export let startMarkupEdit = function( data ) {
    var markupCtx = exports.getMarkupContext();
    if( markupCtx.currentEdit ) {
        markupCtx.needUpdateHtml = false;
        markupCtx.needUpdateGeom = false;

        data.markup = markupCtx.currentEdit;
        data.saveButtonText = data.markup.editMode === 'new' ? data.i18n.create :
            data.markup.editMode === 'reply' ? data.i18n.reply : data.i18n.save;
        data.showGdnt = data.markup.editMode !== 'reply' &&
            data.markup.type === '2d' && data.markup.geometry.list[ 0 ].shape === 'gdnt';
        data.showWeld = data.markup.editMode !== 'reply' &&
            data.markup.type === '2d' && data.markup.geometry.list[ 0 ].shape === 'weld';
        data.showLeader = data.markup.editMode !== 'reply' &&
            data.markup.type === '2d' && data.markup.geometry.list[ 0 ].shape === 'leader';
        data.showCreateStamp = canCreateStamp( data.markup );
        data.shareStamp = markupViewModel.getStampShare() === 'public';

        if( data.markup.status !== 'open' ) {
            data.status.dbValue = data.markup.status;
            data.status.uiValue = findLovUiValue( data.status.dbValue, data.statusValues.dbValue );
        }

        data.showOnPageVisible = data.markup.status === 'open' && data.markup.type === '2d' &&
            !data.showGdnt && !data.showWeld;

        if( data.showLeader ) {
            data.showOnPageValues.dbValue.splice( 0, 3 );
        } else {
            data.showOnPageValues.dbValue.splice( 3, 2 );
        }
        data.showOnPage.dbValue = data.markup.showOnPage ? data.markup.showOnPage : data.showLeader ? 'centered' : 'none';
        data.showOnPage.uiValue = findLovUiValue( data.showOnPage.dbValue, data.showOnPageValues.dbValue );

        data.showShareAs = true;
        if( data.shareAs && data.shareAsValues ) {
            var shareWords = data.markup.share.split( ' ' );
            data.shareAs.dbValue = shareWords[ 0 ];
            data.shareAs.uiValue = findLovUiValue( data.shareAs.dbValue, data.shareAsValues.dbValue );

            if( markupViewModel.getRole() !== 'author' ) {
                data.shareAsValues.dbValue.splice( 3, 1 );
                data.shareAsValues.dbValue.splice( 1, 1 );
            }

            var users = markupViewModel.getUsers();
            for( var i = 0; i < users.length; i++ ) {
                var usr = $.extend( {}, data.shareWith );
                usr.propertyDisplayName = users[ i ].displayname;
                usr.userId = users[ i ].userid;
                usr.dbValue = i === 0 || shareWords.indexOf( users[ i ].userid ) > 0;
                usr.isEnabled = i > 0;

                data.shareWithValues.push( usr );
            }
        }

        geomOptionMarkupToUI( data.markup, data );
        markupCtx.origMarkup = _.cloneDeep( markupCtx.currentEdit );

        data.allowInsertImage = true;
        data.showTextTab = true;
        data.showStyleTab = data.allowFill || data.allowLine;

        const callback = overrideUiOptions[ markupCtx.viewerType ];
        if( callback ) {
            const uiOptions = callback( markupCtx.baseObject, markupCtx.version, data.markup );
            for( const option in uiOptions ) {
                data[ option ] = uiOptions[ option ];
            }
        }

        data.tabsEditModel.dbValue.forEach( ( t, i ) => {
            t.selectedTab = i === 0 && data.showTextTab ||
                i === 1 && !data.showTextTab && data.showStyleTab;
        } );

        var ckEditorElement = $( '#mrkeditor' );
        var ckEditorToolbarButtons = [ 'Bold', 'Italic', '|',
            'FontFamily', 'FontSize', '|',
            'FontColor', 'FontBackgroundColor', '|',
            'Alignment', 'ImageUpload' ];

        if ( !data.allowInsertImage ) {
            // some users do not support insert image, so remove it from cd-editor
            ckEditorToolbarButtons.pop();
        }

        if( data.showGdnt ) {
            data.gdntValue.dbValue = data.markup.comment;
        } else if( data.showWeld ) {
            data.weldValue.dbValue = data.markup.comment;
        } else if( data.showLeader ) {
            data.leaderValue.dbValue = data.markup.comment;
        } else if( ckEditorElement.length > 0 ) {
            awEditorService.createInline( ckEditorElement[0], {
                toolbar: ckEditorToolbarButtons,
                linkShowTargetTab: false,
                toolbarCanCollapse: false,
                skin: 'moono_cus',
                height: 250,
                language: _i18n._locale,
                extraPlugins: [ 'clientImage' ],
                removePlugins: [ 'resize', 'flash', 'save', 'iframe', 'pagebreak', 'horizontalrule', 'elementspath', 'div', 'scayt', 'wsc', 'ImageCaption', 'ImageResize' ],
                allowedContent: 'p img div span br strong em table tr td[*]{*}(*)',
                fontSize: {
                    options: [ 'default', 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72 ]
                },
                image: {
                    resizeUnit: 'px'
                }
            } ).then( cke => {
                if( 'CKEDITOR' in window ) {
                    // Add override CSS styles for inside editable contents area for iPad.
                    CKEDITOR.addCss( '@media only screen and (min-device-width : 768px) and (max-device-width : 1024px) { html { background-color: #eeeeee; }}' );
                }

                var imageMaxSize = markupViewModel.getMarkupFillSize( data.markup );
                if( imageMaxSize ) {
                    cke.setMaxSizeForImage( imageMaxSize );
                }
                ckeEditor = cke;
                cke.setData( data.markup.comment );
            } );
        }

        if( data.markup.status === 'open' && data.markup.geometry &&
            ( data.markup.editMode === 'edit' || data.markup.editMode === 'new' ) ) {
            markupOperation.setTool( 'position' );
            markupCtx.selectedTool = 'position';
            markupOperation.setPositionMarkup( data.markup );
        }
    }
};

/**
 * Save the edited current markup
 *
 * @param {Data} data - the input data
 */
export let saveMarkupEdit = function( data ) {
    if( data.markup ) {
        var markupCtx = exports.getMarkupContext();
        var dirty = markupCtx.currentEdit.editMode !== 'edit';

        if( data.showGdnt ) {
            if( data.markup.comment !== data.gdntValue.dbValue ) {
                data.markup.comment = data.gdntValue.dbValue;
                data.markup.showOnPage = 'all';
                markupViewModel.updateMarkupHtml( data.markup, true );
                dirty = true;
            }
        } else if( data.showWeld ) {
            if( data.markup.comment !== data.weldValue.dbValue ) {
                data.markup.comment = data.weldValue.dbValue;
                data.markup.showOnPage = 'all';
                markupViewModel.updateMarkupHtml( data.markup, true );
                dirty = true;
            }
        } else if( data.showLeader ) {
            if( data.markup.comment !== data.leaderValue.dbValue ) {
                data.markup.comment = data.leaderValue.dbValue;
                data.markup.showOnPage = data.showOnPage.dbValue;
                markupViewModel.updateMarkupHtml( data.markup, true );
                dirty = true;
            }
        } else if( ckeEditor ) {
            var newComment = ckeEditor.getData();
            newComment = newComment.replace( /<em>/g, '<em style="font-style: italic;">' );
            newComment = newComment.replace( /<i>/g, '<i style="font-style: italic;">' );
            if( newComment !== data.markup.comment ) {
                data.markup.comment = newComment;
                dirty = true;
                if( data.markup.showOnPage !== 'none' ) {
                    markupCtx.needUpdateHtml = true;
                }
            }
        }

        if( data.markup.status !== 'open' && data.markup.status !== data.status.dbValue ) {
            data.markup.status = data.status.dbValue;
            dirty = true;
        }

        if( data.shareAs ) {
            var newShare = data.shareAs.dbValue;
            if( newShare === 'users' ) {
                for( var i = 0; i < data.shareWithValues.length; i++ ) {
                    if( data.shareWithValues[ i ].dbValue ) {
                        newShare += ' ' + data.shareWithValues[ i ].userId;
                    }
                }
            }

            if( newShare !== data.markup.share ) {
                data.markup.share = newShare;
                dirty = true;
            }
        }

        if( markupCtx.needUpdateGeom || markupCtx.needUpdateHtml ) {
            dirty = true;
        }

        if( dirty ) {
            data.markup.date = new Date();
            markupOperation.generateRefImage( data.markup, 400, 200 );
            saveMarkups( data.markup );
        }

        if( data.showCreateStamp && ( data.createSharedStamp.dbValue || data.createMyStamp.dbValue ) ) {
            data.createSharedStamp.dbValue = false;
            data.createMyStamp.dbValue = false;

            var stampShare = markupViewModel.getStampShare();
            var stampError = !data.stampName.dbValue ? _i18n.stampNameEmpty :
                stampShare === 'private' && markupViewModel.findStamp( data.stampName.dbValue, 'public' ) ?
                    _i18n.stampNameExist.replace( '{0}', data.stampName.dbValue ) : '';

            if( stampError ) {
                messageService.showError( stampError );
            } else {
                var stamp = markupViewModel.copyMarkupAsStamp( data.markup, data.stampName.dbValue, stampShare );
                saveStamps( stamp );
            }
        }

        data.markup.editMode = 'saved';

        var markupCtx = exports.getMarkupContext();
        if( markupCtx.showPanel ) {
            eventBus.publish( 'awPanel.navigate', { destPanelId: 'Awp0Markup' } );
        } else {
            eventBus.publish( 'complete', { source: 'toolAndInfoPanel' } );
        }
    }
};

/**
 * Event handler for showOnPage option changed
 *
 * @param {Data} data - the data
 */
export let showOnPageChanged = function( data ) {
    var markupCtx = exports.getMarkupContext();
    var newValue = data.showOnPage.dbValue === 'none' ? undefined : data.showOnPage.dbValue;
    if( newValue !== data.markup.showOnPage ) {
        if( data.showLeader ) {
            data.markup.comment = data.leaderValue.dbValue;
        } else if( ckeEditor ) {
            data.markup.comment = ckeEditor.getData();
        }
        data.markup.showOnPage = newValue;
        markupViewModel.updateMarkupHtml( data.markup, true );
        markupCtx.needUpdateHtml = true;
    }
};

/**
 * Event handler for Apply Text On Page button pressed
 *
 * @param {Data} data - the data
 */
export let onApplyTextOnPage = function( data ) {
    var markupCtx = exports.getMarkupContext();
    if( ckeEditor ) {
        data.markup.comment = ckeEditor.getData();
    }
    markupViewModel.updateMarkupHtml( data.markup, true );
    markupCtx.needUpdateHtml = true;
};

/**
 * Handle Geometry Option Changed
 * @param {Data} data - the data
 */
export let geomOptionChanged = function( data ) {
    var markupCtx = exports.getMarkupContext();
    geomOptionUIToMarkup( data.markup, data );
    markupViewModel.updateMarkupGeom( data.markup, true );
    markupCtx.needUpdateGeom = true;
};

/**
 * End the current markup edit
 *
 * @param {Data} data - the data
 */
export let endMarkupEdit = function( data ) {
    var markupCtx = exports.getMarkupContext();
    if( markupCtx.currentEdit ) {
        if( markupCtx.currentEdit.editMode === 'edit' ) {
            // if save button is not clicked, recover the original geometry and showOnPage
            if( markupCtx.needUpdateGeom ) {
                markupCtx.currentEdit.geometry = markupCtx.origMarkup.geometry;
                markupCtx.currentEdit.textParam = markupCtx.origMarkup.textParam;
            }

            if( markupCtx.needUpdateHtml ) {
                markupCtx.currentEdit.comment = markupCtx.origMarkup.comment;
                markupCtx.currentEdit.showOnPage = markupCtx.origMarkup.showOnPage;
                markupCtx.currentEdit.textParam = markupCtx.origMarkup.textParam;
            }
        }

        if( markupCtx.currentEdit.editMode === 'new' || markupCtx.currentEdit.editMode === 'reply' ) {
            // if create/reply button is not clicked, delete it
            markupCtx.currentEdit.editMode = null;
            markupViewModel.deleteMarkup( markupCtx.currentEdit );
            exports.updateMarkupList();
        }

        markupCtx.currentEdit.editMode = null;
        scrollIntoView( markupCtx.currentEdit );
        if( markupCtx.needUpdateHtml ) {
            markupViewModel.updateMarkupHtml( markupCtx.currentEdit, false );
        }

        if( markupCtx.needUpdateGeom ) {
            markupViewModel.updateMarkupGeom( markupCtx.currentEdit, false );
        }

        markupViewModel.updateMarkupList();
        markupOperation.showCurrentPage();
        markupCtx.currentEdit = null;

        markupOperation.setTool( null );
        markupOperation.setPositionMarkup( null );
        markupCtx.selectedTool = null;
        markupCtx.currentPos = null;
    }
};

/**
 * Handle ShareAs changed
 *
 * @param {Data} data - the input data
 * @returns {Promise} - the promise
 */
export let shareAsChanged = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    if( data.shareAs.dbValue === 'official' ) {
        deferred.resolve();
    }
    return deferred.promise;
};

/**
 * Handle Cancel Official
 * @param {Data} data - the data
 */
export let cancelOfficial = function( data ) {
    data.shareAs.dbValue = data.shareAs.dbOriginalValue;
    data.shareAs.uiValue = data.shareAs.uiOriginalValue;
};

/**
 * Get the list scope
 * @returns {Scope} the scope
 */
export let getListScope = function() {
    return $( 'aw-list-filter[dataprovider="data.dataProviders.visibleMarkups"] ul' ).scope();
};

/**
 * Show the Stamp panel
 */
export let showStampPanel = function() {
    loadStamps();
};

/**
 * Hide the Stamp panel
 */
export let hideStampPanel = function() {
    var markupCtx = exports.getMarkupContext();
    markupOperation.setTool( null );
    markupOperation.setPositionMarkup( null );
    markupCtx.selectedTool = null;
    markupCtx.currentPos = null;
};

/**
 * Filter stamps
 *
 * @param {Data} data - the input data
 * @returns {Markup[]} the stamps list
 */
export let filterStamps = function( data ) {
    if( markupViewModel.setFilter( data.filterStamp.dbValue ) ) {
        markupViewModel.updateStampList();
    }

    data.stampList = markupViewModel.getStampList();
    return data.stampList;
};

/**
 * Toggle stamp group between expanded and collapsed
 *
 * @param {Group} group - The group to be toggled
 */
export let toggleStampGroup = function( group ) {
    var stampList = markupViewModel.toggleGroup( group, true );
    var scope = $( 'aw-list-filter[dataprovider="data.dataProviders.visibleStamps"] ul' ).scope();

    if( scope && scope.dataprovider ) {
        scope.dataprovider.update( stampList, stampList.length );
    }
};

/**
 * Stamp in tool panel is selected or unselected
 *
 * @param {EventData} eventData - the eventData
 */
export let stampSelected = function( eventData ) {
    if( eventData ) {
        var markupCtx = exports.getMarkupContext();
        var selected = eventData.selectedObjects.length > 0 ? eventData.selectedObjects[ 0 ] : null;
        selected = selected && selected.stampName ? selected : null;
        markupCtx.stamp = selected;
        markupOperation.setTool( selected ? 'stamp' : null );
        markupOperation.setPositionMarkup( selected );
    }
};

/**
 * Delete the selected stamp
 *
 * @param {Markup} stamp - the selected or hovered stamp
 */
export let deleteStamp = function( stamp ) {
    var markupCtx = exports.getMarkupContext();
    const currentStamp = stamp ? markupViewModel.findStamp( stamp.stampName ) : markupCtx.stamp;
    if( currentStamp ) {
        const msg = _i18n.confirmDeleteStamp.replace( '{0}', currentStamp.stampName );
        const buttons = [ {
            addClass: 'btn btn-notify',
            text: _i18n.cancel,
            onClick: function( btn ) {
                btn.close();
            }
        },
        {
            addClass: 'btn btn-notify',
            text: _i18n.del,
            onClick: function( btn ) {
                btn.close();
                currentStamp.deleted = true;
                saveStamps( currentStamp );
            }
        } ];
        messageService.showWarning( msg, buttons );
    }
};

/**
 * Event handler for Stamp Checkbox checked
 *
 * @param {Data} data - the data
 */
export let stampChecked = function( data ) {
    if( data.createSharedStamp.dbValue || data.createMyStamp.dbValue ) {
        $( 'div[prop="data.stampName"]' ).find( 'input[type="text"]' ).focus();

        if( !data.showGdnt && data.showOnPage.dbValue === 'none' ) {
            messageService.showWarning( _i18n.stampNoTextShown );
        }
    }
};

/**
 * Print markups
 */
export let printMarkups = function() {
    var markupCtx = exports.getMarkupContext();
    var option = markupCtx.currentSelection ? markupCtx.currentSelection :
                 markupCtx.showPanel ? 'visible' : markupCtx.showMarkups ? 'all' : undefined;
    if( option ) {
        markupViewModel.generatePrintPage( option, _i18n, function( html ) {
            var w = 1000;
            var h = 600;
            var width = window.innerWidth || document.documentElement.clientWidth || screen.width;
            var height = window.innerHeight || document.documentElement.clientHeight || screen.height;
            var left = ( width - w ) / 2;
            var top = ( height - h ) / 2;
            var position = 'scrollbars=1,height=' + h + ',width=' + w + ',top=' + top + ',left=' + left;
            var newWin = window.open( '', 'PrintMarkup', position );

            if( newWin ) {
                newWin.document.open( 'text/html', 'replace' );
                newWin.document.write( html );
                newWin.document.close();
            }
        } );
    }
};

export let setOverrideLoad = function( viewerType, callback ) {
    overrideLoad[ viewerType ] = callback;
};

export let setOverrideSave = function( viewerType, callback ) {
    overrideSave[ viewerType ] = callback;
};

export let setOverrideUiOptions = function( viewerType, callback ) {
    overrideUiOptions[ viewerType ] = callback;
};

//======================= private functions =========================
/**
 * Set supported tools
 *
 * @param {boolean} visible - If true, check each tool supported or not. If false, all invisible
 */
function setSupportedTools( visible ) {
    var markupCtx = exports.getMarkupContext();
    if( !markupCtx.supportedTools ) {
        markupCtx.supportedTools = {};
    } else {
        markupCtx.supportedTools.highlight = false;
        markupCtx.supportedTools.freehand = false;
        markupCtx.supportedTools.shape = false;
        markupCtx.supportedTools.stamp = false;
    }

    var viewerType = markupCtx.viewerType;
    if( visible && markupViewModel.canMarkup() ) {
        markupCtx.supportedTools.highlight = viewerType === 'aw-pdf-viewer' || viewerType === 'aw-text-viewer' || viewerType === 'aw-html-viewer';
        markupCtx.supportedTools.freehand = viewerType === 'aw-pdf-viewer' || viewerType === 'aw-2d-viewer' || viewerType === 'aw-image-viewer' || viewerType === 'aw-onscreen-3d-markup-viewer';
        markupCtx.supportedTools.shape = markupCtx.supportedTools.freehand;
        markupCtx.supportedTools.stamp = markupCtx.supportedTools.freehand;
    }
}

/**
 * Initialize MarkupOperation
 *
 * @params {Number} tryTimes - try times before quit, if undefined, same as 1
 */
function initOperation( tryTimes ) {
    var markupCtx = exports.getMarkupContext();
    if( markupOperation.init( markupCtx.viewerType ) ) {
        markupOperation.setSelectCallback( selectCallback );
        markupOperation.setSelectionEndCallback( selectionEndCallback );
        markupOperation.setCommandCallback( commandCallback );

        markupCtx.playing = undefined;
        markupOperation.setPlayChangeCallback( function( playing ) {
            markupCtx.playing = playing ? true : undefined;
        } );

        markupOperation.addResource( 'imgDone', iconSvc.getMiscIcon( 'AcceptMarkup' ) );
        markupOperation.addResource( 'imgUndo', iconSvc.getMiscIcon( 'UndoMarkup' ) );
        markupOperation.addResource( 'imgRedo', iconSvc.getMiscIcon( 'RedoMarkup' ) );
        markupOperation.addResource( 'imgDelete', iconSvc.getMiscIcon( 'DeleteMarkup' ) );
        markupOperation.addResource( 'cmdEdit', iconSvc.getCmdIcon( 'Edit' ) );
        markupOperation.addResource( 'cmdDelete', iconSvc.getCmdIcon( 'Delete' ) );
        markupOperation.addResource( 'cmdReply', iconSvc.getCmdIcon( 'Reply' ) );
        markupOperation.addResource( 'i18n', _i18n );

        markupOperation.setRevealed( true );
        markupOperation.showCurrentPage();
    } else if( tryTimes > 1 ) {
        window.setTimeout( initOperation, 200, tryTimes - 1 );
    }
}

/**
 * Select callback
 *
 * @param {Markup} markup - the markup being selected in the left panel
 */
function selectCallback( markup ) {
    var markupCtx = exports.getMarkupContext();
    if( !markupCtx.currentEdit && ( markupCtx.showPanel || markupCtx.showMarkups ) ) {
        if( markupCtx.currentSelection === markup ) {
            exports.unselectCurrent();
        } else {
            exports.selectMarkup( markup, true );
        }
    }
}

/**
 * Select markup in the data provider
 *
 * @param {Markup} markup - the markup to be selected
 * @param {boolean} selected - true to select it, false to unselected it
 */
function selectInDataProvider( markup, selected ) {
    var index = findIndexInDataProvider( markup );
    if( index >= 0 ) {
        listChangeSelection( index, selected );
    }
}

/**
 * Scroll markup into View
 *
 * @param {Markup} markup - the markup to be seen
 */
function scrollIntoView( markup ) {
    var index = findIndexInDataProvider( markup );
    if( index >= 0 ) {
        listEvalAsync( function() {
            var el = $( 'aw-list-filter[dataprovider="data.dataProviders.visibleMarkups"] li' ).get( index );
            if( el ) {
                el.scrollIntoView();
            }
        } );
    }
}

/**
 * List update
 * @param {MarkupList} markupList - the markup list
 */
function listUpdate( markupList ) {
    var scope = exports.getListScope();
    if( scope && scope.dataprovider ) {
        scope.dataprovider.update( markupList, markupList.length );
    }
}

/**
 * List change selection
 * @param {Number} index - the index of the item in the list
 * @param {Boolean} selected - true for selected, false for unselected
 */
function listChangeSelection( index, selected ) {
    var scope = exports.getListScope();
    if( scope && scope.dataprovider ) {
        scope.dataprovider.changeObjectsSelection( index, index, selected );
    }
}

/**
 * List evaluate async
 * @param { Function } func - the function to be evaluated
 */
function listEvalAsync( func ) {
    var scope = exports.getListScope();
    if( scope ) {
        scope.$evalAsync( func );
    } else {
        window.setTimeout( func, 10 );
    }
}

/**
 * Find the index of the markup in the data provider
 *
 * @param {Markup} markup - the markup
 * @return {Number} the index, or -1 if not found
 */
function findIndexInDataProvider( markup ) {
    if( markup ) {
        var scope = exports.getListScope();
        if( scope && scope.dataprovider && scope.dataprovider.viewModelCollection ) {
            var list = scope.dataprovider.viewModelCollection.getLoadedViewModelObjects();
            for( var i = 0; i < list.length; i++ ) {
                if( markup === list[ i ] ) {
                    return i;
                }
            }
        }
    }

    return -1;
}

/**
 * SelectionEndCallback, create a new markup
 *
 * @param {String} tool - the tool caused the selection end
 */
function selectionEndCallback( tool ) {
    var markupCtx = exports.getMarkupContext();
    if( tool === 'position' ) {
        if( markupCtx.currentPos ) {
            markupCtx.currentPos.date = new Date();
            markupOperation.generateRefImage( markupCtx.currentPos, 400, 200 );
            saveMarkups( markupCtx.currentPos );
        } else {
            markupCtx.needUpdateGeom = true;
        }
    } else if( tool === 'stamp' ) {
        var userSelection = markupOperation.getUserSelection();
        if( userSelection && userSelection.geometry ) {
            var stamp = !userSelection.stampName ? markupCtx.stamp :
                        markupViewModel.findStamp( userSelection.stampName );
            var markup = markupViewModel.copyStampAsMarkup( stamp, userSelection.geometry.list[0] );
            exports.updateMarkupList();
            markupOperation.generateRefImage( markup, 400, 200 );
            saveMarkups( markup );
            deselectAllStamps();
            markupCtx.currentPos = markup;
        }
    } else if( tool === 'highlight' || tool === 'freehand' || tool === 'shape' ) {
        var newMarkup = markupViewModel.addNewMarkup();
        if( newMarkup ) {
            exports.selectTool( null );
            markupCtx.currentEdit = newMarkup;
            var markupList = markupViewModel.getMarkupList();
            listUpdate( markupList );
            listEvalAsync( function() {
                exports.selectMarkup( newMarkup, true );
            } );

            if( markupCtx.showPanel ) {
                eventBus.publish( 'awPanel.navigate', {
                    destPanelId: 'Awp0MarkupEdit',
                    title: _i18n.add,
                    supportGoBack: true,
                    recreatePanel: true
                } );
            } else {
                markupOperation.showCurrentPage();
                commandPanelSvc.activateCommandPanel(
                    'Awp0MarkupEditMain', 'aw_toolsAndInfo', null, false );
            }
        }
    }
}

/**
 * Sort the markup list
 *
 * @param {String} sortBy - the sort by order 'page', 'user', 'date', or 'status'
 */
function sortMarkupList( sortBy ) {
    markupViewModel.setSortBy( sortBy );
    var markupList = markupViewModel.sortMarkupList();
    var markupCtx = exports.getMarkupContext();

    listUpdate( markupList );
    scrollIntoView( markupCtx.currentSelection );
}

/**
 * Command callback
 *
 * @param {String} cmd - the command: cmdEdit, cmdReply, or cmdDelete
 * @param {Markup} markup - the markup of the command
*/
function commandCallback( cmd, markup ) {
    if( cmd === 'cmdEdit' ) {
        exports.editMarkup( markup );
    } else if( cmd === 'cmdDelete' ) {
        exports.deleteMarkup( markup );
    } else if( cmd === 'cmdReply' ) {
        exports.replyMarkup( markup );
    }
}

/**
 * Clear markups in the left panel
 */
function clearMarkups() {
    exports.selectTool( null );
    setSupportedTools( false );
    exports.unselectCurrent();

    markupOperation.setRevealed( false );
    markupViewModel.clearMarkupList();
    eventBus.publish( 'awp0Markup.callDataProvider' );
}

/**
 * Save the markups
 *
 * @param {Markup} markup - the markup to be saved, or undefined for single_user
 */
function saveMarkups( markup ) {
    const markupCtx = exports.getMarkupContext();
    const callback = overrideSave[ markupCtx.viewerType ];

    if( callback ) {
        callback( markupCtx.baseObject, markupCtx.version, markup );
    } else if( markupCtx.baseObject ) {
        var json = !markup ? markupViewModel.stringifyMarkups( false ) :
            '[' + markupViewModel.stringifyMarkup( markup ) + ']';
        var msg = !markup ? 'single_user' : markup.deleted ? 'delete' :
            markup.date.toISOString() === markup.created ? 'add' : 'modify';

        var inputData = {
            baseObject: markupCtx.baseObject,
            version: markupCtx.version,
            properties: {
                message: msg,
                action: 'save',
                viewerType: markupCtx.viewerType
            },
            markups: json
        };

        var promise = soaSvc.postUnchecked( 'Internal-DocMgmtAw-2019-06-DocMgmt', 'processMarkups', inputData );
        promise.then( function( response ) {
            if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
                var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
                var buttons;
                if( errValue.code === 262054 || errValue.code === 262055 ) {
                    buttons = [ {
                            addClass: 'btn btn-notify',
                            text: _i18n.cancel,
                            onClick: function( btn ) {
                                btn.close();
                            }
                        },
                        {
                            addClass: 'btn btn-notify',
                            text: _i18n.save,
                            onClick: function( btn ) {
                                btn.close();
                                saveMarkups( markup );
                            }
                        }
                    ];
                }
                messageService.showWarning( errValue.message, buttons );
            } else {
                exports.processMarkups( response );
            }
        } ).catch( function( err ) {
            console.error( err );
            messageService.showError( _i18n.serverOrNetworkError );
        } );
    } else {
        setShowMarkupsInfo();
    }
}

/**
 * Load the markups
 */
function loadMarkups() {
    const markupCtx = exports.getMarkupContext();
    const callback = overrideLoad[ markupCtx.viewerType ];

    if( callback ) {
        callback( markupCtx.baseObject, markupCtx.version );
    } else if( markupCtx.baseObject ) {
        var inputData = {
            baseObject: markupCtx.baseObject,
            version: markupCtx.version,
            properties: {
                message: 'json',
                action: 'load',
                viewerType: markupCtx.viewerType
            },
            markups: ''
        };

        var promise = soaSvc.postUnchecked( 'Internal-DocMgmtAw-2019-06-DocMgmt', 'processMarkups', inputData );
        promise.then( function( response ) {
            exports.processMarkups( response );
        } );
    } else {
        setShowMarkupsInfo();
    }
}

/**
 * Save the stamps
 *
 * @param {Markup} stamp - the stamp to be saved
 */
function saveStamps( stamp ) {
    var markupCtx = exports.getMarkupContext();
    var json = '[' + markupViewModel.stringifyMarkup( stamp ) + ']';
    var msg = stamp.deleted ? 'delete' :
        stamp.date.toISOString() === stamp.created ? 'add' : 'modify';

    var inputData = {
        version: markupCtx.stampVersion,
        properties: {
            message: msg,
            action: 'saveStamps'
        },
        markups: json
    };

    var promise = soaSvc.postUnchecked( 'Internal-DocMgmtAw-2019-06-DocMgmt', 'processMarkups', inputData );
    promise.then( function( response ) {
        if( response.ServiceData && response.ServiceData.partialErrors && response.ServiceData.partialErrors.length ) {
            var errValue = response.ServiceData.partialErrors[ 0 ].errorValues[ 0 ];
            messageService.showWarning( errValue.message );
        } else {
            processStamps( response );
            if( msg === 'add' || msg === 'modify' ) {
                var message = msg === 'add' ? _i18n.stampAdded : _i18n.stampReplaced;
                var where = stamp.share === 'public' ? _i18n.sharedStamps : _i18n.myStamps;
                var info = message.replace( '{0}', stamp.stampName ).replace( '{1}', where );
                messageService.showInfo( info );
            }
        }
    } );
}

/**
 * Load the stamps
 */
function loadStamps() {
    var markupCtx = exports.getMarkupContext();
    var inputData = {
        version: markupCtx.stampVersion,
        properties: {
            message: 'json',
            action: 'loadStamps'
        },
        markups: ''
    };

    var promise = soaSvc.postUnchecked( 'Internal-DocMgmtAw-2019-06-DocMgmt', 'processMarkups', inputData );
    promise.then( function( response ) {
        processStamps( response );
    } );
}

/**
 * Process Stamps
 *
 * @param {Object} response - The soa response
 * @return {Object} the markup data
 */
function processStamps( response ) {
    var markupCtx = exports.getMarkupContext();
    var message = '';
    if( response.properties && response.properties.message ) {
        message = response.properties.message;
    }

    markupCtx.stampsLoaded = true;
    markupCtx.stampVersion = response.version;
    markupViewModel.processStamps( response.version, message, response.markups );
    markupViewModel.updateStampList();

    eventBus.publish( 'awp0Markup.callStampDataProvider' );
    var stampList = markupViewModel.getStampList();
    if( message.indexOf( 'up_to_date' ) < 0 ) {
        stampList.forEach( function( s ) {
            markupViewModel.updateMarkupHtml( s );
        } );
    }

    return stampList;
}

function canCreateStamp( markup ) {
    if( markup.editMode !== 'reply' && markup.geometry && markup.geometry.list.length === 1 ) {
        var shape = markup.geometry.list[0].shape;
        return shape === 'rectangle' || shape === 'ellipse' ||
               shape === 'circle' || shape === 'gdnt';
    }

    return false;
}

/**
 * Set the thumbnail and type icon for a specific user
 *
 * @param {User} user - the user object
 */
function setUserIcon( user ) {
    var thumbnailUrl = awIconService.getThumbnailFileUrl( user );
    var typeIconURL = awIconService.getTypeIconFileUrl( user );

    if( thumbnailUrl ) {
        user.hasThumbnail = true;
    }
    user.thumbnailURL = thumbnailUrl;
    user.typeIconURL = typeIconURL;
}

/**
 * Geometry options from markup to UI
 *
 * @param {Markup} markup - the markup to get geom options
 * @param {Data} data - the input data
 */
function geomOptionMarkupToUI( markup, data ) {
    data.allowFill = false;
    data.allowEdge = false;
    data.allowLine = false;
    data.allowStartArrow = false;
    data.allowEndArrow = false;
    data.allowCorner = false;

    if( markup && markup.geometry && markup.geometry.list ) {
        markup.geometry.list.forEach( function( e ) {
            if( e.shape === 'circle' || e.shape === 'ellipse' ||
                e.shape === 'rectangle' || e.shape === 'polygon' || e.shape === 'closed-curve' ) {
                data.allowFill = true;
                data.allowEdge = true;
                data.fillStyle.dbValue = e.fill ? e.fill.style : 'none';
                data.fillStyle.uiValue = findLovUiValue( data.fillStyle.dbValue, data.fillStyleValues.dbValue );
                data.fillColor.dbValue = e.fill && e.fill.color ? e.fill.color.substring( 0, 7 ) : '#ffa500';
                data.fillColor.uiValue = findLovUiValue( data.fillColor.dbValue, data.fillColorValues.dbValue );
                data.hatchColor.dbValue = e.fill && e.fill.color ? e.fill.color.substring( 0, 7 ) : '';
                data.hatchColor.uiValue = findLovUiValue( data.hatchColor.dbValue, data.strokeColorValues.dbValue );
                data.fillSlider.dbValue[ 0 ].sliderOption.value = e.fill && e.fill.color ? getTransparencyFromColor( e.fill.color ) : 128;
                data.edgeStyle.dbValue = e.stroke ? e.stroke.style : 'solid';
                data.edgeStyle.uiValue = findLovUiValue( data.edgeStyle.dbValue, data.strokeStyleValues.dbValue );
                data.edgeWidth.dbValue = e.stroke ? e.stroke.width : 'mid';
                data.edgeWidth.uiValue = findLovUiValue( data.edgeWidth.dbValue, data.strokeWidthValues.dbValue );
                data.edgeColor.dbValue = e.stroke ? e.stroke.color : '';
                data.edgeColor.uiValue = findLovUiValue( data.edgeColor.dbValue, data.strokeColorValues.dbValue );

                if( e.shape === 'rectangle' ) {
                    data.allowCorner = true;
                    data.cornerSlider.dbValue[ 0 ].sliderOption.value = e.cornerRadius ? e.cornerRadius * 100 : 0;
                }

                if( e.shape !== 'polygon' ) {
                    data.strokeStyleValues.dbValue.splice( 6, 1 );
                }
            } else if( e.shape === 'polyline' || e.shape === 'curve' || e.shape === 'freehand' ||
                       e.shape === 'gdnt' || e.shape === 'weld' || e.shape === 'leader' ) {
                data.allowLine = true;
                data.lineStyle.dbValue = e.stroke ? e.stroke.style : 'solid';
                data.lineStyle.uiValue = findLovUiValue( data.lineStyle.dbValue, data.strokeStyleValues.dbValue );
                data.lineWidth.dbValue = e.stroke ? e.stroke.width : 'mid';
                data.lineWidth.uiValue = findLovUiValue( data.lineWidth.dbValue, data.strokeWidthValues.dbValue );
                data.lineColor.dbValue = e.stroke ? e.stroke.color : '';
                data.lineColor.uiValue = findLovUiValue( data.lineColor.dbValue, data.strokeColorValues.dbValue );

                if( e.shape !== 'freehand' ) {
                    data.allowStartArrow = true;
                    data.startArrow.dbValue = e.startArrow === true ? 'open' : e.startArrow ? e.startArrow.style : 'none';
                    data.startArrow.uiValue = findLovUiValue( data.startArrow.dbValue, data.startArrowValues.dbValue );

                    if( e.shape === 'polyline' || e.shape === 'curve' ) {
                        data.allowEndArrow = true;
                        data.endArrow.dbValue = e.endArrow === true ? 'open' : e.endArrow ? e.endArrow.style : 'none';
                        data.endArrow.uiValue = findLovUiValue( data.endArrow.dbValue, data.endArrowValues.dbValue );
                    }
                }

                data.strokeStyleValues.dbValue.splice( 6, 1 );
            }
        } );
    }
}

/**
 * Geometry options from UI to markup
 *
 * @param {Markup} markup - the markup to set geom options
 * @param {Data} data - the input data
 */
function geomOptionUIToMarkup( markup, data ) {
    if( markup && markup.geometry && markup.geometry.list ) {
        markup.geometry.list.forEach( function( e ) {
            if( e.shape === 'circle' || e.shape === 'ellipse' ||
                e.shape === 'rectangle' || e.shape === 'polygon' || e.shape === 'closed-curve' ) {
                e.fill = data.fillStyle.dbValue === 'none' ? undefined : {
                    style: data.fillStyle.dbValue,
                    color: data.fillStyle.dbValue === 'solid' ?
                        addTransparencyToColor( data.fillSlider.dbValue[ 0 ].sliderOption.value, data.fillColor.dbValue ) : data.hatchColor.dbValue
                };
                e.stroke = data.edgeStyle.dbValue === 'solid' &&
                    data.edgeWidth.dbValue === 'mid' &&
                    data.edgeColor.dbValue === '' ? undefined : {
                        style: data.edgeStyle.dbValue,
                        width: data.edgeWidth.dbValue,
                        color: data.edgeColor.dbValue
                    };
                e.cornerRadius = data.allowCorner ? data.cornerSlider.dbValue[ 0 ].sliderOption.value / 100 : undefined;
            } else if( e.shape === 'polyline' || e.shape === 'curve' || e.shape === 'freehand' ||
                      e.shape === 'gdnt' || e.shape === 'weld' || e.shape === 'leader' ) {
                e.stroke = data.lineStyle.dbValue === 'solid' &&
                    data.lineWidth.dbValue === 'mid' &&
                    data.lineColor.dbValue === '' ? undefined : {
                        style: data.lineStyle.dbValue,
                        width: data.lineWidth.dbValue,
                        color: data.lineColor.dbValue
                    };
                if( e.shape !== 'freehand' ) {
                    e.startArrow = data.startArrow.dbValue === 'none' ? undefined : {
                        style: data.startArrow.dbValue
                    };
                    e.endArrow = data.endArrow.dbValue === 'none' ? undefined : {
                        style: data.endArrow.dbValue
                    };
                }
            }
        } );
    }
}

/**
 * Find uiValue from given dbValue and a list of values
 *
 * @param {String} dbValue - the dbValue
 * @param {LOV} listOfValues - the list of values
 *
 * @returns {String} the found uiValue
 */
 function findLovUiValue( dbValue, listOfValues ) {
    for( let i = 0; i < listOfValues.length; i++ ) {
        if( dbValue === listOfValues[i].propInternalValue ) {
            return listOfValues[i].propDisplayValue;
        }
    }

    return dbValue;
}

/**
 * Get transparency from color
 * @param {Color} color - the input color #RRGGBB or #RRGGBBAA
 * @return {Number} transparency value 0 (opaque) to 255 (transparent)
 */
function getTransparencyFromColor( color ) {
    return color.length > 7 ? 255 - parseInt( color.substring( 7 ), 16 ) : 0;
}

/**
 * Add transparency to color
 * @param {Number} transparency value 0 (opaque) to 255 (transparent)
 * @param {Color} color - the input color #RRGGBB
 * @return {Color} the output color #RRGGBB or #RRGGBBAA
 */
function addTransparencyToColor( transparency, color ) {
    return transparency === 0 ? color : color + Number( 0x1ff - transparency ).toString( 16 ).substring( 1 );
}

/**
 * Set the Awp0ShowMarkup command info: indicator
 */
function setShowMarkupsInfo() {
    var markupCtx = exports.getMarkupContext();
    markupCtx.count = markupViewModel.getCount();

    var fill = markupCtx.showMarkups && markupCtx.count > 0 ? '#eb780a' : 'none';
    var svg = $( 'button[button-id="Awp0ShowMarkups"] svg' );
    var indicator = svg.find( '#indicator' );

    if( indicator.length === 0 ) {
        indicator = $( document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' ) );
        indicator.attr( { id: 'indicator', cx: 5, cy: 5, r: 5 } );
        svg.append( indicator );
    }

    indicator.attr( 'fill', fill );
}

/**
 * Deselect all stamps in the data provider
 */
function deselectAllStamps() {
    var scope = $( 'aw-list-filter[dataprovider="data.dataProviders.visibleStamps"] ul' ).scope();
    if( scope && scope.dataprovider && scope.dataprovider.viewModelCollection ) {
        var list = scope.dataprovider.viewModelCollection.getLoadedViewModelObjects();
        scope.dataprovider.changeObjectsSelection( 0, list.length - 1, false );
    }
}

/**
 * @returns {String} - get current locale code
 */
let getLocaleCode = function() {
    var currentLocale = localeSvc.getLocale();

    var localeName = currentLocale.substring( 0, 2 );

    // Normally first 2 characters, but we have 2 exceptions. And yes there is a dash and not an underscore.
    if( currentLocale === 'pt_BR' || currentLocale === 'zh_CN' ) {
        localeName = currentLocale.replace( /_/g, '-' );
    }
    return localeName;
};

let loadConfiguration = function() {
    localeSvc.getTextPromise( 'MarkupMessages', true ).then( function( textBundle ) {
        $.extend( _i18n, textBundle );
    } );

    localeSvc.getTextPromise( 'dateTimeServiceMessages', true ).then(
        function( textBundle ) {
            $.extend( _i18n, textBundle );
        } );

    _i18n._locale = getLocaleCode();

    /**
     * Listening to viewer context value changed
     */
    eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if( eventData && eventData.name === 'viewerContext' ) {
            exports.viewerChanged( eventData );
        }
    }, 'Awp0MarkupService' );
};

loadConfiguration();

//======================= app factory and filters =========================

export default exports = {
    i18n,
    setContext,
    getContext,
    getMarkupContext,
    showPanel,
    hidePanel,
    showMarkups,
    processMarkups,
    processUsers,
    selectMarkup,
    unselectCurrent,
    selectPrevious,
    markupSelected,
    updateMarkupList,
    toggleGroup,
    selectTool,
    replyMarkup,
    onTabSelected,
    resetTabFilter,
    getSortBy,
    filterMarkups,
    setLoginUser,
    viewerChanged,
    deleteMarkup,
    editMarkup,
    startEditMain,
    startMarkupEdit,
    saveMarkupEdit,
    showOnPageChanged,
    geomOptionChanged,
    endMarkupEdit,
    shareAsChanged,
    cancelOfficial,
    getListScope,
    showStampPanel,
    hideStampPanel,
    filterStamps,
    toggleStampGroup,
    stampSelected,
    deleteStamp,
    stampChecked,
    printMarkups,
    onApplyTextOnPage,
    setOverrideLoad,
    setOverrideSave,
    setOverrideUiOptions
};

/**
 * The factory
 *
 * @memberof NgServices
 * @member Awp0MarkupService
 */
app.factory( 'Awp0MarkupService', () => exports );

app.filter( 'toOneLine', function() {
    return function( text ) {
        return $( text ).text();
    };
} );

app.filter( 'toTrusted', [ '$sce', function( $sce ) {
    return function( text ) {
        return $sce.trustAsHtml( text );
    };
} ] );

app.filter( 'toI18n', function() {
    return function( text ) {
        var array = text.split( ' ' );
        var replaced = false;

        array.forEach( function( word, i ) {
            if( _i18n[ word ] ) {
                array[ i ] = _i18n[ word ];
                replaced = true;
            }
        } );

        return replaced ? array.join( ' ' ) : text;
    };
} );

app.filter( 'toStatus', function() {
    return function( markup ) {
        var status = markupViewModel.getStatus( markup );
        return _i18n[ status ];
    };
} );

app.filter( 'toShareInfo', function() {
    return function( markup ) {
        var info = '';
        if( markup.share ) {
            var share = markup.share.split( ' ' )[ 0 ];
            info += markupViewModel.isEditable( markup ) ? _i18n.markupIsEditable : _i18n.markupIsReadonly;
            info += '\n' + _i18n.sharedAs + ' ' + _i18n[ share ] + ': ' + _i18n[ share + 'Tip' ];

            if( share === 'users' ) {
                var userids = markup.share.split( ' ' );
                for( var i = 1; i < userids.length; i++ ) {
                    var user = markupViewModel.findUser( userids[ i ] );
                    if( user ) {
                        info += '\n\t' + user.displayname;
                    }
                }
            }
        }

        return info;
    };
} );

