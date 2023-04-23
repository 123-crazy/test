// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Module for the Requirement wide panel page that
 * generate RmBodyClearText Property and attaching image and event listener to it
 *
 * @module propRenderTemplates/generateRmBodyClearTextProperty
 * @requires app
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import reqUtils from 'js/requirementsUtils';
import localeSvc from 'js/localeService';

var exports = {};
/**
 * generate RmBodyClearText Property and attaching image and event listener to it
 * @param { Object } vmo - ViewModelObject of Summary Tab
 * @param { Object } containerElem - The container DOM Element inside which BodyClearText and imgage will rendered
 */
export let generateRmBodyClearTextRendererFn = function( vmo, containerElem ) {
    var bodyTextObj = null;
    var bodyClearText = '';

    if ( vmo.props && vmo.props['REF(arm0UnderlyingObject,SpecElementRevision).body_cleartext'] ) {
        bodyTextObj = vmo.props['REF(arm0UnderlyingObject,SpecElementRevision).body_cleartext'];
    }
    if ( bodyTextObj && bodyTextObj.dbValues && bodyTextObj.dbValues.length > 0 ) {
        bodyClearText = bodyTextObj.dbValues[0];
    }
    var objectUid = vmo.uid;
    var isSpecObject = false;
    if( vmo.modelType.name === 'Arm0SummaryTableProxy' && vmo.props.arm0SourceElement ) {
        objectUid = vmo.props.arm0SourceElement.dbValues[0];
        var tempText = vmo.props.arm0SourceElement.dbValues[0];
        if( tempText.startsWith( 'SR::N::Arm0RequirementSpecElement' ) ) {
            isSpecObject = true;
        }
    }
    var modelObject = cdm.getObject( objectUid );
    if ( modelObject && modelObject.type && !isSpecObject ) {
        _renderEditBodyClearTextIcon( modelObject, containerElem, bodyClearText );
    }
};

/**
 * @param { Object } vmo - ViewModelObject of Summary Tab
 * @param { Object } containerElem -  The container DOM Element inside which BodyClearText and image will rendered
 * @param {String} bodyClearText - BodyClearText
 */
var _renderEditBodyClearTextIcon = function( modelObject, containerElem, bodyClearText ) {
    var resource = 'RichTextEditorCommandPanelsMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    var textDiv = document.createElement( 'div' );
    textDiv.className = 'aw-splm-tableCellText';
    textDiv.innerText = bodyClearText;
    textDiv.title = bodyClearText;
    var cellImg = document.createElement( 'img' );
    cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirement-editIcon aw-aria-border';
    cellImg.title = localTextBundle.edit;
    cellImg.alt = cellImg.title;
    cellImg.tabIndex = 0;
    var imgSrc = null;
    imgSrc = app.getBaseUrlPath() + '/image/homeEdit64.svg';

    // Add click and keypress event to open the Single Requirement Wide Panel Editor
    [ 'click', 'keypress' ].forEach( ( eventType )=>{
        cellImg.addEventListener( eventType, function() {
            var cellProp = [ 'arm1ParaNumber', 'awb0ArchetypeName', 'awb0ArchetypeId', 'awb0UnderlyingObject', 'awb0UnderlyingObjectType' ];
            var arrModelObjs = [ modelObject ];
            reqUtils.loadModelObjects( arrModelObjs, cellProp ).then( function() {
                var selectedRefObj = {
                    paraNum: modelObject.props.arm1ParaNumber.dbValues[0],  //ParaNumber
                    name: modelObject.props.awb0ArchetypeName.dbValues[0], //object_name
                    id: modelObject.props.awb0ArchetypeId.dbValues[0], //item_id
                    type: modelObject.type, //object_type
                    uid: modelObject.uid, // uid of Arm0RequirementElement
                    revID: modelObject.props.awb0UnderlyingObject.dbValues[0], //underlying Object uid
                    revType: modelObject.props.awb0UnderlyingObjectType.dbValues[0], //underlying Object Type
                    modelRevObject: { uid: modelObject.props.awb0UnderlyingObject.dbValues[0], type: modelObject.props.awb0UnderlyingObjectType.dbValues[0] } //underlying Object
                };
                appCtxService.registerCtx( 'summaryTableSelectedObjUid', selectedRefObj );
                eventBus.publish( 'Arm0SingleRequirementWidePanelEditor.showWidePanelEditorPopupPanel' );
            } );
        }, modelObject );
    } );
    cellImg.src = imgSrc;
    containerElem.appendChild( textDiv );
    containerElem.appendChild( cellImg );
};

export default exports = {
    generateRmBodyClearTextRendererFn
};
app.factory( 'generateRmBodyClearTextProperty', () => exports );
