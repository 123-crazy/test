// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateParameterCountProperty
 * @requires app
 */
import app from 'app';
import localeSvc from 'js/localeService';
import arm0SplitPanelService from 'js/Arm0SplitPanelService';
import cdm from 'soa/kernel/clientDataModel';
var exports = {};

/**
 * Generates Parameter icon DOM Element for Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which Parameter text is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Parameter text will be rendered
 */
export let generateRmParameterCountRendererFn = function( vmo, containerElem ) {
    var parameterProp = null;
    var parameterCount = '0';
    if ( vmo.props && vmo.props.arm0ParameterCount ) {
        parameterProp = vmo.props.arm0ParameterCount;
    }
    if ( parameterProp && parameterProp.dbValues && parameterProp.dbValues.length > 0 ) {
        parameterCount = parameterProp.dbValues[0];
    }

    var objectUid = vmo.uid;
    if( vmo.modelType.name === 'Arm0SummaryTableProxy' && vmo.props.arm0SourceElement ) {
        objectUid = vmo.props.arm0SourceElement.dbValues[0];
    }

    if ( parameterCount ) {
        _renderParameterIndicator( objectUid, containerElem, parseInt( parameterCount ) );
    }
};

/**
 * @param {String} objectUid - object uid
 * @param { Object } containerElem - The container DOM Element inside which parameter indicator will be rendered
 * @param {String} parameterCount - the number of parameter that exist
 */
var _renderParameterIndicator = function( objectUid, containerElem, parameterCount ) {
    if ( parameterCount > 0 ) {
        var resource = 'RichTextEditorCommandPanelsMessages';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var parentDiv = document.createElement( 'div' );
        parentDiv.className = 'aw-requirementsmanager-summaryTableContent';
        var cellImg = document.createElement( 'img' );
        cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon';
        cellImg.title = localTextBundle.showParameters;
        var imgSrc = app.getBaseUrlPath() + '/image/typeMeasurableAttribute48.svg';
        cellImg.src = imgSrc;
        parentDiv.appendChild( cellImg );
        containerElem.appendChild( parentDiv );

        [ 'click', 'keypress' ].forEach( ( eventType ) => {
            cellImg.addEventListener( eventType, function() {
                if ( arm0SplitPanelService ) {
                    var obj =  cdm.getObject( objectUid );
                    arm0SplitPanelService.changePanelLocation( 'bottom', null, obj );
                }
            } );
        } );
    }
};

export default exports = {
    generateRmParameterCountRendererFn
};
app.factory( 'generateParameterCountProperty', () => exports );
