// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwygViewEditorService
 */
import app from 'app';
import wygVMEditUtilsSvc from 'js/wysiwyg-view-editorUtils.service';
import wysiwygLoadAndSaveService from 'js/wysiwygLoadAndSaveService';
import wysiwygXmlParserService from 'js/wysiwygXmlParserService';

var exports = {};

export let updateMasterView = function( data ) {
    var viewXML = data.eventData.content;
    viewXML = wysiwygXmlParserService.formatXml( viewXML );
    data.editorModel.htmlModel = wygVMEditUtilsSvc.createHTMLModel( viewXML );
    wysiwygLoadAndSaveService.updateView( viewXML );
};

export let setViewEditorValue = function( data ) {
    var declViewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
    if( declViewModelId ) {
        var viewXML = wysiwygLoadAndSaveService.getViewData();
        if( viewXML ) {
            viewXML = wysiwygXmlParserService.formatXml( viewXML );
            data.viewSrc.data = viewXML;
            data.editorModel.htmlModel = wygVMEditUtilsSvc.createHTMLModel( viewXML );
        }
    }
};

/**
 * @member wysiwygViewEditorService
 */

exports = {
    updateMasterView,
    setViewEditorValue
};
export default exports;
app.factory( 'wysiwygViewEditorService', () => exports );
