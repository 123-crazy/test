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
 * Module for the Preview of Header Footer Template object
 *
 * @module js/Arm0HtmlHeaderFooterPreview
 */
import app from 'app';
import browserUtils from 'js/browserUtils';
import fmsUtils from 'js/fmsUtils';

var exports = {};

/**
 * Get initial html content for HeaderFooter revision
 *
 * @return {String} HTML content
 */
var _getInitialHeaderFooterHtml = function() {
    return '<header><p></p></header><footer><p></p></footer>';
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

    var element = requirementElement[ 0 ].getElementsByClassName( 'aw-richtexteditor-documentPaper aw-richtexteditor-document aw-richtexteditor-documentPanel' );
    if( !element || element.length <= 0 ) {
        var elementChild = document.createElement( 'div' );
        elementChild.className += ' aw-richtexteditor-documentPaper aw-richtexteditor-document aw-richtexteditor-documentPanel';
        elementChild.innerHTML = htmlContent;
        requirementElement[ 0 ].appendChild( elementChild );
    } else {
        element[ 0 ].innerHTML = htmlContent;
    }
};

/**
 * Creates html for HeaderFooter widget
 *
 * @param {Object} id - html element id
 * @param {Object} objType - html element object type
 * @param {Object} title - html element title
 * @param {Object} bodyText - html element bodyText
 */
var _getHeaderFooterWidgetHtml = function( id, objType, title, bodyText ) {
    var htmlWidget = '<div class="requirement" id="' + id + '" objecttype="' + objType + '" >';
    htmlWidget += '<div class="aw-requirement-header" contenttype="TITLE" style="outline:none;background-color:#f0f0f0;" contenteditable="false">';
    htmlWidget += '<h3 contenteditable="false"><span contenteditable="false" style="outline:none;background-color:#f0f0f0;"></span> <label data-placeholder="Title">' + title + ' </label></h3></div>';
    htmlWidget += '<div class="aw-requirement-content" contenteditable="false" style="cursor:pointer;"><div class="aw-requirement-bodytext" contenteditable="false" >';
    htmlWidget += bodyText;
    htmlWidget += '</div></div></div>';
    return htmlWidget;
};

/**
 * Creates widget for HeaderFooter revision
 *
 * @param {Object} elementHeaderFooter - html object
 */
var _updateHeaderFooterWidget = function( elementHeaderFooter, data ) {
    var headerDiv = elementHeaderFooter[ 0 ].getElementsByTagName( 'header' );
    var footerDiv = elementHeaderFooter[ 0 ].getElementsByTagName( 'footer' );
    var coverPageDiv = elementHeaderFooter[ 0 ].getElementsByTagName( 'coverPage' );
    var htmlHeaderWidget = _getHeaderFooterWidgetHtml( 'header', 'header', data.i18n.headerLabel, headerDiv[ 0 ].innerHTML );
    var htmlFooterWidget = _getHeaderFooterWidgetHtml( 'footer', 'footer', data.i18n.footerLabel, footerDiv[ 0 ].innerHTML );
    var coverPageTeamplate;
    if( coverPageDiv && coverPageDiv.length > 0 ) {
        coverPageTeamplate = _getHeaderFooterWidgetHtml( 'cover page', 'cover page', data.i18n.coverPageLabel, coverPageDiv[0].innerHTML );
        elementHeaderFooter[ 0 ].innerHTML = htmlHeaderWidget + coverPageTeamplate + htmlFooterWidget;
    } else{
        coverPageTeamplate = _getHeaderFooterWidgetHtml( 'cover page', 'cover page', data.i18n.coverPageLabel, '<p></p>' );
        elementHeaderFooter[ 0 ].innerHTML = htmlHeaderWidget + coverPageTeamplate + htmlFooterWidget;
    }
    elementHeaderFooter[ 0 ].innerHTML = htmlHeaderWidget + coverPageTeamplate +  htmlFooterWidget;
};

/**
 * Pre-process the contents and set it to editor
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
    _updateHeaderFooterWidget( headerFooterDiv, data );
    _setViewerContent( headerFooterDiv[ 0 ].innerHTML );
};

/**
 * Initialize HTML content
 *
 * @param {Object} data - The panel's view model object
 */
export let initContent = function( data ) {
    _preprocessContentsAndSetToEditor( data );
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

export default exports = {
    initContent,
    getExportOptions
};
/**
 * This is Custom Preview for Header Footer revision.
 *
 * @memberof NgServices
 * @member Arm0HtmlHeaderFooterPreview
 */
app.factory( 'Arm0HtmlHeaderFooterPreview', () => exports );
