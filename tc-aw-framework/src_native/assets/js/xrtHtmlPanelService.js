// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * XRT HtmlPanel service
 *
 * @module js/xrtHtmlPanelService
 */
import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import uwDirectiveHtmlPanelUtils from 'js/uwDirectiveHtmlPanelUtils';
import ngUtils from 'js/ngUtils';
import 'js/aw.customHtmlPanel.controller';

/**
 * ---------------------------------------------------------------------------<BR>
 * Define the public API for the 'xrtHtmlPanelService' Service<BR>
 * ---------------------------------------------------------------------------<BR>
 */

let exports = {};

/**
 * Parses htmlPanel data and initialize ('bootstrap') the angular system and create an angular controller on a
 * new 'child' of the given 'parent' element.
 *
 * @param {Object} htmlPanelData - The JSON definition of the desired DeclDataProvider object from the
 *            DeclViewModel's JSON.
 *
 * @param {Element} parentElement - The associated DeclAction object from the DeclViewModel's JSON.
 */
export let parseHtmlPanelId = function( htmlPanelData, parentElement, data ) {
    var ctrlElement = ngModule
        .element( '<div class="aw-jswidgets-htmlPanelCustomContainer" ng-controller="awCustomHtmlPanelController" ></div>' );
    var innerHtml = '<aw-gwt-presenter type="' + htmlPanelData.id + '" data="data.xrtData"></aw-gwt-presenter>';

    ctrlElement.html( innerHtml );

    $( parentElement ).empty();
    $( parentElement ).append( ctrlElement );

    var ctrlFn = ngUtils.include( parentElement, ctrlElement );

    if( ctrlFn ) {
        ctrlFn.setData( data );
    }
};

/**
 * Populate thumbnail html by creating an img HTML element with thumbnailURL as src and imageAltText as alternate text
 * @param {String} thumbnailURL - view model object
 * @param {String} imageAltText - view model object
 * @return {String} outer HTML of img element if thumbnailURL is defined otherwise null
 */
var _populateThumbnailHTML = function( thumbnailURL, imageAltText ) {
    if( thumbnailURL ) {
        var imgElement = document.createElement( 'img' );
        imgElement.src = thumbnailURL;
        imgElement.setAttribute( 'class', 'aw-base-icon' );
        imgElement.alt = imageAltText;
        return imgElement.outerHTML;
    }

    return null;
};

/**
 * Create Htmlpanel model object overlay based off input viewModelObject
 *
 * @param {Object} viewModelObject - view model object
 *
 * @return {Object} HTMLPanel modelObject which contains information for uid, thumbnailHtml, thumbnailUrl and
 *         properties
 */
export let createHtmlPanelModelObjectOverlay = function( viewModelObject ) {
    if( !viewModelObject ) {
        return null;
    }

    var thumbnailURL = viewModelObject.thumbnailURL;
    if( !thumbnailURL ) {
        thumbnailURL = viewModelObject.typeIconURL;
    }

    var imageAltText = '';
    if( viewModelObject.hasThumbnail ) {
        imageAltText = viewModelObject.cellHeader1;
    } else if( viewModelObject.props && viewModelObject.props.object_type && viewModelObject.props.object_type.uiValue ) {
        imageAltText = viewModelObject.props.object_type.uiValue;
    } else {
        imageAltText = viewModelObject.modelType && viewModelObject.modelType.displayName ? viewModelObject.modelType.displayName : '';
    }

    var thumbnailHtml = _populateThumbnailHTML( thumbnailURL, imageAltText );
    var hpModelObject = null;

    if( !thumbnailURL ) {
        hpModelObject = {
            uid: viewModelObject.uid,
            thumbnailHtml: "",
            thumbnailUrl: "",
            properties: {}
        };
    } else {
        hpModelObject = {
            uid: viewModelObject.uid,
            thumbnailHtml: thumbnailHtml,
            thumbnailUrl: thumbnailURL,
            properties: {}
        };
    }

    var modelObject = cdm.getObject( viewModelObject.uid );
    _.forEach( modelObject.props, function( propObj, propName ) {
        if( propName && viewModelObject.props && viewModelObject.props[ propName ] ) {
            hpModelObject.properties[ propName ] = viewModelObject.props[ propName ];
        }
    } );

    return hpModelObject;
};

export default exports = {
    parseHtmlPanelId,
    createHtmlPanelModelObjectOverlay
};
/**
 * XRT html panel service which parses and compile html panel data
 *
 * @memberof NgServices
 * @member xrtHtmlPanelService
 */
app.factory( 'xrtHtmlPanelService', () => exports );
