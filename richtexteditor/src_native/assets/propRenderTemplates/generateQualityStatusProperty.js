// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateQualityStatusProperty
 * @requires app
 */
import app from 'app';
import localeService from 'js/localeService';

var exports = {};
var localTextBundle = localeService.getLoadedText( 'RichTextEditorCommandPanelsMessages' );
/**
 * @param { Object } vmo - ViewModelObject
 * @param { Object } containerElem - The container DOM Element
 */
export let generateCorrectnessRendererFn = function( vmo, containerElem ) {
    if( vmo && vmo.props && vmo.props.qualityCorrectness && vmo.props.qualityCorrectness.value ) {
        if( vmo.props.qualityCorrectness.value === '3' ) {
            containerElem.appendChild( _getFilledStarImgElement() );
            containerElem.appendChild( _getEmptyStarImgElement() );
            containerElem.appendChild( _getEmptyStarImgElement() );
        } else if( vmo.props.qualityCorrectness.value === '2' ) {
            containerElem.appendChild( _getFilledStarImgElement() );
            containerElem.appendChild( _getFilledStarImgElement() );
            containerElem.appendChild( _getEmptyStarImgElement() );
        } else {
            containerElem.appendChild( _getFilledStarImgElement() );
            containerElem.appendChild( _getFilledStarImgElement() );
            containerElem.appendChild( _getFilledStarImgElement() );
        }
    }
};

var _getFilledStarImgElement = function() {
    var cellImg =  _getImgElement( 'cmdFilledStar24.svg' );
    cellImg.alt = localTextBundle.filledStarTitle;
    return cellImg;
};

var _getEmptyStarImgElement = function() {
    var cellImg =  _getImgElement( 'cmdEmptyStar24.svg' );
    cellImg.alt = localTextBundle.emptyStarTitle;
    return cellImg;
};

var _getImgElement = function( svgName ) {
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-commands-command';
    var imgSrc = app.getBaseUrlPath() + '/image/' + svgName;
    cellImg.src = imgSrc;
    return cellImg;
};

export default exports = {
    generateCorrectnessRendererFn
};
app.factory( 'generateQualityStatusProperty', () => exports );
