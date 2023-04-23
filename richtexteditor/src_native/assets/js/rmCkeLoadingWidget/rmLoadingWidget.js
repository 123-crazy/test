// Copyright (c) 2020 Siemens
/* global
   CKEDITOR5
*/

import localeService from 'js/localeService';

var testDocument = document.implementation.createHTMLDocument( 'Test Doc' );

export default class RmLoadingWidget extends CKEDITOR5.Plugin {
    init() {
        this._defineSchema();
        var resource = 'RichTextEditorCommandPanelsMessages';
        const localTextBundle = localeService.getLoadedText( resource );
        this._defineConversion( localTextBundle );
    }

    _defineSchema() {
        const schema = this.editor.model.schema;

        schema.register( 'loading', {
            allowWhere: '$block',
            allowAttributes:[ 'class', 'id', 'object_string', 'parentid' ],
            isObject: true,
            isBlock: true
        } );
    }

    _defineConversion( localTextBundle ) {
        const conversion = this.editor.conversion;

        conversion.for( 'upcast' ).elementToElement( {
            view: 'loading',
            model: ( viewElement, conversionApi ) => {
                const modelWriter = conversionApi.writer;
                return modelWriter.createElement( 'loading', viewElement.getAttributes() );
            },
            converterPriority: 'high'
        } );

        conversion.for( 'downcast' ).elementToElement( {
            model: 'loading',
            view: ( modelElement, conversionApi ) => {
                const viewWriter = conversionApi.writer;
                return this._renderForLoading( viewWriter, modelElement, localTextBundle );
            },
            converterPriority: 'high'
        } );
    }

    _renderForLoading( viewWriter, modelElement, localTextBundle ) {
        const editor = this.editor;

        var id = modelElement.getAttribute( 'id' );
        var object_string = modelElement.getAttribute( 'object_string' );
        var parentId = modelElement.getAttribute( 'parentid' );

        const header = viewWriter.createContainerElement( 'loading', {
            class: 'requirement',
            id: id,
            parentid: parentId
        } );

        const headerTitle = viewWriter.createUIElement( 'h3', {}, function( domDocument ) {
            const domElement = this.toDomElement( domDocument );
            var tempEle = testDocument.createElement( 'p' );
            tempEle.innerHTML = object_string;
            domElement.innerHTML = tempEle.innerText;
            return domElement;
        } );

        const loadingSpan = viewWriter.createUIElement( 'span', {}, function( domDocument ) {
            const domElement = this.toDomElement( domDocument );
            domElement.innerHTML = localTextBundle.loadingMsg;
            return domElement;
        } );

        viewWriter.insert( viewWriter.createPositionAt( header, 0 ), headerTitle );
        viewWriter.insert( viewWriter.createPositionAt( header, 1 ), loadingSpan );

        return header;
    }
}
