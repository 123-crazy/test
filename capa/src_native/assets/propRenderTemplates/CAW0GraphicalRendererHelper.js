// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/*
global
define
*/

/**
 * Helper class for graphical renderer for CAPA
 *
 * @module propRenderTemplates/CAW0GraphicalRendererHelper
 * @requires app
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/*
 * @param { Object } vmo - ViewModelObject for which status is being rendered
 * @param { Object } containerElem - The container DOM Element inside which release status will be rendered
 */
export let renderRootCauseFlag = function( vmo, containerElem ) {
    let uid = vmo.uid;
    let object = cdm.getObject( uid );
    if( object.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) >= 0 && object.props.caw0rootCause ) {
        let isRootCause = object.props.caw0rootCause.dbValues[ 0 ];
        if( isRootCause === '1' ) {
            let childElement = getContainerElement();
            containerElem.appendChild( childElement );
        } else {
            return;
        }
    }
};

var getContainerElement = function() {
    let childElement = document.createElement( 'div' );
    let imageElement = document.createElement( 'img' );
    imageElement.className = 'aw-visual-indicator aw-capa-rootcauseIndicator';
    let imagePath = app.getBaseUrlPath() + '/image/';
    imageElement.title = '';
    imagePath += 'indicatorRootCause16.svg';
    imageElement.src = imagePath;
    childElement.appendChild( imageElement );
    return childElement;
};

export default exports = {
    renderRootCauseFlag
};
app.factory( 'CAW0GraphicalRendererHelper', () => exports );
