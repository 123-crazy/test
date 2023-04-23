// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * native construct to hold the server version information related to the AW server release.
 *
 * @module propRenderTemplates/generateAttachmentCountProperty
 * @requires app
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import localeSvc from 'js/localeService';
import navigationSvc from 'js/navigationService';
var exports = {};

/**
 * Generates Attachment icon DOM Element for Summary Table Proxy object
 * @param { Object } vmo - ViewModelObject for which Attachment text is being rendered
 * @param { Object } containerElem - The container DOM Element inside which Attachment text will be rendered
 */
export let generateRmAttachmentCountRendererFn = function( vmo, containerElem ) {
    var attachmentProp = null;
    var attachmentCount = '0';
    if ( vmo.props && vmo.props.arm0AttachmentCount ) {
        attachmentProp = vmo.props.arm0AttachmentCount;
    }
    if ( attachmentProp && attachmentProp.dbValues && attachmentProp.dbValues.length > 0 ) {
        attachmentCount = attachmentProp.dbValues[0];
    }

    if ( attachmentCount ) {
        _renderAttachmentIndicator( vmo, containerElem, parseInt( attachmentCount ) );
    }
};

/**
 * @param { Object } vmo - ViewModelObject for which attachment icon is being rendered
 * @param { Object } containerElem - The container DOM Element inside which attachment indicator will be rendered
 * @param {String} attachmentCount - the number of attachment that exist
 */
var _renderAttachmentIndicator = function( vmo, containerElem, attachmentCount ) {
    if ( attachmentCount > 0 ) {
        var resource = 'RequirementsManagerMessages';
        var localTextBundle = localeSvc.getLoadedText( resource );
        var parentDiv = document.createElement( 'div' );
        parentDiv.className = 'aw-requirementsmanager-summaryTableContent';
        var cellImg = document.createElement( 'img' );
        cellImg.className = 'aw-visual-indicator aw-commands-command aw-requirementsmanager-summaryTableIcon';
        cellImg.title = localTextBundle.attachmentsText;
        var imgSrc = app.getBaseUrlPath() + '/image/indicatorAttachment16.svg';
        cellImg.src = imgSrc;
        parentDiv.appendChild( cellImg );
        containerElem.appendChild( parentDiv );

        [ 'click', 'keypress' ].forEach( ( eventType )=>{
            cellImg.addEventListener( eventType, function() {
                var objectUid = vmo.uid;
                if( vmo.modelType.name === 'Arm0SummaryTableProxy' && vmo.props.arm0UnderlyingObject ) {
                    objectUid = vmo.props.arm0UnderlyingObject.dbValues[0];
                }
                var modelObject = cdm.getObject( objectUid );
                var action = { actionType: 'Navigate' };
                action.navigateTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
                action.navigationParams = {
                    uid : modelObject.uid,
                    pageId: 'tc_xrt_Content',
                    spageId: 'Attachments'
                    };
                action.navigateIn = 'newTab';
                navigationSvc.navigate( action, action.navigationParams );
             } );
        } );
    }
};

export default exports = {
    generateRmAttachmentCountRendererFn
};
app.factory( 'generateAttachmentCountProperty', () => exports );
