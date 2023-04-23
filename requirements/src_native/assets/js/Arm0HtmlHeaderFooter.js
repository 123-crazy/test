// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Header Footer Template object
 *
 * @module js/Arm0HtmlHeaderFooter
 */
import app from 'app';
import reqUtils from 'js/requirementsUtils';
import ckeditorOperations from 'js/ckeditorOperations';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import leavePlaceService from 'js/leavePlace.service';
import Arm0RequirementDocumentation from 'js/Arm0RequirementDocumentation';
import messagingService from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';
import $ from 'jquery';
import rmCkeditorService from 'js/Arm0CkeditorService';
import 'js/command.service';

var exports = {};
var _data = null;

var eventInsertImage = null;

var saveHandler = {};

/**
 * Check CKEditor content changed / Dirty.
 *
 * @param {String} id- CKEditor ID
 * @return {Boolean} isDirty
 *
 */
var _checkCKEditorDirty = function( id ) {
    return ckeditorOperations.checkCKEditorDirty( id, appCtxService.ctx );
};

/**
 * process HTML BodyText before save.
 *
 * @param {String} bodyText - body text
 * @return {String} updated bodyText
 */
var _preProcessBeforeSave = function( content ) {
    var htmlElement = document.createElement( 'div' );
    htmlElement.innerHTML = content;

    addStyleToFigure( htmlElement );

    var headerFooterDiv = htmlElement.getElementsByClassName( 'aw-requirement-bodytext' );

    var headerContent = '<header>' + headerFooterDiv[0].innerHTML + '</header>';
    var coverPageContent = '<coverPage>' + headerFooterDiv[1].innerHTML + '</coverPage>';
    var footerContent = '<footer>' + headerFooterDiv[2].innerHTML + '</footer>';

    var bodyText = '<div class="aw-requirement-bodytext">' + headerContent + coverPageContent + footerContent + '</div>';
    bodyText = reqUtils.processHTMLBodyText( bodyText );

    return bodyText;
};
/**
 * Method to apply style to figure element in ckeditor 5
 * @param {Element} htmlElement the root of the specification template
 */
function addStyleToFigure( htmlElement ) {
    var figures = htmlElement.getElementsByTagName( 'figure' );
    if( figures.length > 0 ) {
        for( var i = 0; i < figures.length; i++ ) {
            var figElement = figures.item( i );
            figElement.style.margin = '1em auto';
            figElement.style.textAlign = 'center';
            if( figElement.classList.contains( 'table' ) ) {
                figElement.style.display = 'table';
                if( figElement.firstElementChild.style.border === '' ) {
                    figElement.firstElementChild.style.borderCollapse = 'collapse';
                    figElement.firstElementChild.style.margin = '1em auto';
                    figElement.firstElementChild.style.border = '1px solid black';
                    var rows = figElement.getElementsByTagName( 'tr' );
                    for( var k = 0; k < rows.length; k++ ) {
                        var row = rows[k];
                        updateTableStyle( row, 'th' );
                        updateTableStyle( row, 'td' );
                    }
                }
            }
        }
    }
}
/**
 *
 * @param {Element} element the dom element
 * @param {String} tagName the tag name
 */
function updateTableStyle( element, tagName ) {
    var datas = element.getElementsByTagName( tagName );
    for( var j = 0; j < datas.length; j++ ) {
        var data = datas[j];
        data.style.border = '1px solid black';
    }
}

/**
 * custom save handler save edits called by framework
 *
 * @return promise
 */
saveHandler.saveEdits = function( dataSource ) {
    var deferred = AwPromiseService.instance.defer();

    if( _checkCKEditorDirty( _data.editorProps.id ) ) {
        var _modelObj = dataSource.getContextVMO();

        var content = ckeditorOperations.getCKEditorContent( _data.editorProps.id, appCtxService.ctx );
        var bodyText = _preProcessBeforeSave( content );

        var input = {
            inputs: [ {
                objectToProcess: Arm0RequirementDocumentation.getRevisionObject( _modelObj ),
                bodyText: bodyText,
                lastSavedDate: Arm0RequirementDocumentation.getRevisionObjectLsd( _modelObj ),
                contentType: Arm0RequirementDocumentation.getContentType( _data ),
                isPessimisticLock: true
            } ]
        };

        var promise = soaSvc.post( 'Internal-AWS2-2016-12-RequirementsManagement',
            'setRichContent2', input );

        promise.then( function( response ) {
            var relatedObjects = response.updated;
            deferred.resolve( relatedObjects );
        } )
            .catch( function( error ) {
                var errorCode = error.cause.partialErrors['0'].errorValues['0'].code;
                if ( errorCode === 141023 ) {
                    var errorMsg = _data.i18n.multiUserEditError.replace( '{0}', _data.selected.cellHeader1 );
                    messagingService.showError( errorMsg );
                    error = null;
                }
                deferred.reject( error );
            } );
    } else {
        deferred.resolve( null );
    }
    return deferred.promise;
};

/**
 * Return true for ckeditor content modification
 *
 * @return {boolean} true if editor is dirty
 */
saveHandler.isDirty = function() {
    return _checkCKEditorDirty( _data.editorProps.id );
};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * Creates html for HeaderFooter widget
 *
 * @param {String} id - html element id
 * @param {String} objType - html element object type
 * @param {String} title - html element title
 * @param {Object} bodyText - html element bodyText
 * @param {boolean} viewOnly - flag that contains if it is in view/edit mode
 */
var _getHeaderFooterWidgetHtml = function( id, objType, title, bodyText, viewOnly ) {
    var htmlWidget = '<div class="requirement" id="' + id + '" objecttype="' + objType + '" >';
    if ( appCtxService.ctx.Arm0Requirements.Editor === 'CKEDITOR_5' && !viewOnly ) {
        htmlWidget += '<div class="aw-requirement-header" contenttype="TITLE"  contenteditable="false">';
    } else {
        htmlWidget += '<div class="aw-requirement-header" contenttype="TITLE" style="outline:none;background-color:#f0f0f0;" contenteditable="false">';
    }
    htmlWidget += '<h3 contenteditable="false"><span contenteditable="false" style="outline:none;background-color:#f0f0f0;"></span> <label data-placeholder="Title">' + title + ' </label></h3></div>';
    htmlWidget += '<div class="aw-requirement-content" contenteditable="false" style="cursor:pointer;"><div class="aw-requirement-bodytext" contenteditable=';
    if( viewOnly ) {
        htmlWidget += '"false">';
    } else {
        htmlWidget += '"true">';
    }
    htmlWidget += bodyText;
    htmlWidget += '</div></div></div>';
    return htmlWidget;
};

/**
 * Creates widget for HeaderFooter revision
 *
 * @param {Object} elementHeaderFooter - html object
 * @param {Object} viewOnly - flag that contains if it is in view/edit mode
 */
var _updateHeaderFooterWidget = function( elementHeaderFooter, viewOnly ) {
    var headerDiv = elementHeaderFooter[ 0 ].getElementsByTagName( 'header' );
    var footerDiv = elementHeaderFooter[ 0 ].getElementsByTagName( 'footer' );
    var coverPageDiv = elementHeaderFooter[ 0 ].getElementsByTagName( 'coverPage' );
    var htmlHeaderWidget = _getHeaderFooterWidgetHtml( 'header', 'header', _data.i18n.headerLabel, headerDiv[ 0 ].innerHTML, viewOnly );
    var htmlFooterWidget = _getHeaderFooterWidgetHtml( 'footer', 'footer', _data.i18n.footerLabel, footerDiv[ 0 ].innerHTML, viewOnly );
    var coverPageTeamplate;
    if( coverPageDiv && coverPageDiv.length > 0 ) {
        coverPageTeamplate = _getHeaderFooterWidgetHtml( 'cover page', 'cover page', _data.i18n.coverPageLabel, coverPageDiv[0].innerHTML, viewOnly );
        elementHeaderFooter[ 0 ].innerHTML = htmlHeaderWidget + coverPageTeamplate + htmlFooterWidget;
    } else{
        coverPageTeamplate = _getHeaderFooterWidgetHtml( 'cover page', 'cover page', _data.i18n.coverPageLabel, '<p></p>', viewOnly );
        elementHeaderFooter[ 0 ].innerHTML = htmlHeaderWidget + coverPageTeamplate + htmlFooterWidget;
    }
};

/**
 * Get initial html content for HeaderFooter revision
 *
 * @return {String} HTML content
 */
var _getInitialHeaderFooterHtml = function() {
    return '<header><p></p></header><coverPage><p></p></coverPage><footer><p></p></footer>';
};

/**
 * Get Requirement top Element of Panel.
 *
 * @return {Object} HTML element
 */
var _getRMElement = function() {
    var element = document.getElementsByClassName( 'aw-requirements-xrtRichText' );
    if( !element || element.length <= 0 ) {
        return null;
    }
    return element;
};

/**
 * Set viewer content
 *
 * @param {String} htmlContent - html Content
 */
var _setViewerContent = function( htmlContent ) {
    var requirementElement = _getRMElement();
    requirementElement[0].classList.add( 'aw-requirementsCkeditor-panel' );
    var element = requirementElement[0].getElementsByClassName( 'aw-requirement-a4SizePaper aw-richtexteditor-document aw-richtexteditor-documentPanel' );
    if ( !element || element.length <= 0 ) {
        var elementChild = document.createElement( 'div' );
        elementChild.className += ' aw-requirement-a4SizePaper aw-richtexteditor-document aw-richtexteditor-documentPanel';
        elementChild.innerHTML = htmlContent;
        requirementElement[ 0 ].appendChild( elementChild );
    } else {
        element[ 0 ].innerHTML = htmlContent;
    }
};

/**
 * Set CKEditor Content.
 *
 * @param {Object} data - The panel's view model object
 * @param {String} id- CKEditor ID
 * @param {String} content - content to set in CK Editor
 */
var _setCKEditorContent = function( data, id, content ) {
    setTimeout( function() {
        var editorInstance = document.getElementsByClassName( 'aw-richtexteditor-editorPanel aw-ckeditor-panel aw-requirements-mainPanel' );
        if( editorInstance.length > 0 ) {
            editorInstance[0].setAttribute( 'class', 'aw-requirement-a4SizePaper aw-ckeditor-panel aw-requirements-mainPanel' );
        }
        ckeditorOperations.setCKEditorContent( id, content, appCtxService.ctx );
    }, 1000 ); // TODO:: This timeout needs to be removed
};

/**
 * Pre-process the contetns and set it to editor
 * @param {Object} data - view model object data
 */
var _preprocessContentsAndSetToEditor = function( data ) {
    var htmlContent = data.htmlContent;
    var htmlElement = document.createElement( 'div' );
    htmlElement.innerHTML = htmlContent;
    var headerFooterDiv = htmlElement.getElementsByClassName( 'aw-requirement-bodytext' );

    if( headerFooterDiv[ 0 ].getElementsByTagName( 'header' ).length < 1 || headerFooterDiv[ 0 ].getElementsByTagName( 'footer' ).length < 1 ) {
        headerFooterDiv[ 0 ].innerHTML = '';
    }

    if( headerFooterDiv[ 0 ].innerHTML === '' ) {
        headerFooterDiv[ 0 ].innerHTML = _getInitialHeaderFooterHtml();
    }
    _updateHeaderFooterWidget( headerFooterDiv, !data.editMode );

    if( !data.editMode ) {
        _setViewerContent( headerFooterDiv[ 0 ].innerHTML );
    } else {
        _setCKEditorContent( data, data.editorProps.id, headerFooterDiv[ 0 ].innerHTML );
    }
};

/**
 * Initialize Ckeditor
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Context object
 */
export let initCkeditor = function( data ) {
    data.editorProps.id = reqUtils.generateCkeditorID();
    data.editorProps.preferences = data.preferences;
    data.editorProps.a4SizeEditor = true;
    rmCkeditorService.isCkeditorLoaded().then(
        function() {
            data.editorProps.showCKEditor = true;
            eventBus.publish( 'requirement.initCKEditorEvent' );
        } );
};

/**
 * Initialize HTML content
 *
 * @param {Object} data - The panel's view model object
 */
export let initContent = function( data ) {
    _data = data;
    if( !data.editMode ) {
        data.showCKEditor = false;
    } else {
        data.showCKEditor = true;
    }
    _preprocessContentsAndSetToEditor( data );
};

/**
 * Cancel all edits made in document
 */
export let cancelEdits = function() {
    exports.unloadContent();

    // Event to load the saved contents
    eventBus.publish( 'Arm0HtmlHeaderFooter.initContent' );
};

/**
 * Remove the handlers and events on content unloading
 */
export let unloadContent = function() {
    leavePlaceService.registerLeaveHandler( null );
};

/**
 * update data for fileData
 *
 * @param {Object} fileDate - key string value the location of the file
 * @param {Object} data - the view model data object
 */
export let updateFormData = function( fileData, data ) {
    if( fileData && fileData.value ) {
        var form = data.form;
        data.formData = new FormData( $( form )[ 0 ] );
        data.formData.append( fileData.key, fileData.value );
    }
};

/**
 * Get file URL from ticket.
 *
 * @param {String} ticket - File ticket.
 * @return file URL
 */

var _getFileURL = function( ticket ) {
    if( ticket ) {
        return browserUtils.getBaseURL() + fmsUtils.getFMSUrl() + fmsUtils.getFilenameFromTicket( ticket ) +
            '?ticket=' + ticket;
    }
    return null;
};

/**
 * Insert Image
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let insertImage = function( data ) {
    if( data.fmsTicket ) {
        var imageURL = _getFileURL( data.fmsTicket );
        var uid = data.createdObject.uid;
        if ( imageURL !== null ) {
            ckeditorOperations.insertImage( data.editorProps.id, imageURL, uid, appCtxService.ctx );
        }
    }
};

/**
 * get Export options.
 *
 * @param {Object} data - data
 * @return {Any} array of export options
 */
export let getExportOptions = function( data ) {
    var options = [];
    var baseURL = browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
    var requestPref = {
        option: 'base_url',
        optionvalue: baseURL
    };
    options.push( requestPref );

    return options;
};

/**
 * Process EditHandlerStateChanged Event
 *
 * @param {Object} data - The panel's view model object
 */
export let processEditHandlerStateChanged = function( data, source ) {
    if ( data.eventData.dataSource.xrtType === source ) {
        if ( data.eventData.state === 'starting' ) {
            _data = data;
            data.editMode = true;
            appCtxService.registerCtx( 'editHeaderFooterSaveHandler', true );
            eventBus.publish( 'Arm0HtmlHeaderFooter.getHTMLTextContent' );

            // Insert Image Event
            eventInsertImage = eventBus.subscribe( 'requirementDocumentation.InsertImageInCKEditor',
                function( eventData ) {
                    var fileName = 'fakepath\\' + eventData.file.name;

                    if ( reqUtils.stringEndsWith( fileName.toUpperCase(), '.gif'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.png'.toUpperCase() ) ||
                        reqUtils.stringEndsWith( fileName.toUpperCase(), '.jpg'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.jpeg'.toUpperCase() ) ||
                        reqUtils.stringEndsWith( fileName.toUpperCase(), '.bmp'.toUpperCase() ) || reqUtils.stringEndsWith( fileName.toUpperCase(), '.wmf'.toUpperCase() ) ) {
                        data.form = eventData.form;

                        var datasetInfo = {
                            clientId: eventData.clientid,
                            namedReferenceName: 'Image',
                            fileName: fileName,
                            name: eventData.clientid,
                            type: 'Image'
                        };

                        data.datasetInfo = datasetInfo;

                        eventBus.publish( 'Arm0HtmlHeaderFooter.InsertObjInCKEditor' );
                    } else {
                        messagingService.reportNotyMessage( data, data._internal.messages,
                            'notificationForImageErrorWrongFile' );
                    }
                }, 'Arm0HtmlHeaderFooter' );
        } else if ( data.eventData.state === 'canceling' && data.editMode ) {
            data.editMode = false;

            appCtxService.updateCtx( 'editHeaderFooterSaveHandler', false );
            appCtxService.unRegisterCtx( 'editHeaderFooterSaveHandler' );

            if ( eventInsertImage ) {
                eventBus.unsubscribe( eventInsertImage );
                eventInsertImage = null;
            }
            eventBus.publish( 'Arm0HtmlHeaderFooter.getHTMLTextContent' );
        } else if ( data.eventData.state === 'saved' && data.editMode ) {
            data.editMode = false;

            appCtxService.updateCtx( 'editHeaderFooterSaveHandler', false );
            appCtxService.unRegisterCtx( 'editHeaderFooterSaveHandler' );

            if ( eventInsertImage ) {
                eventBus.unsubscribe( eventInsertImage );
                eventInsertImage = null;
            }
            eventBus.publish( 'Arm0HtmlHeaderFooter.getHTMLTextContent' );
        }
    }
};

export default exports = {
    getSaveHandler,
    initContent,
    cancelEdits,
    unloadContent,
    updateFormData,
    insertImage,
    getExportOptions,
    processEditHandlerStateChanged,
    initCkeditor
};
/**
 * This is Custom Preview for Requirement revision.
 *
 * @memberof NgServices
 * @member Arm0HtmlHeaderFooter
 */
app.factory( 'Arm0HtmlHeaderFooter', () => exports );
