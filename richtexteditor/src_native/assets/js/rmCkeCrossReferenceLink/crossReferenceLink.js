//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/**
 * Plugin will Allow user to copy the cross reference link to clipboard
 */
/* global
   CKEDITOR5
*/
import eventBus from 'js/eventBus';

let eventToHandleClickOnCrossReferenceLink;

export default class RMCrossReferenceLink extends CKEDITOR5.Plugin {
    init() {
        const editor = this.editor;
        editor.ui.componentFactory.add( 'rmCrossReferenceLink', new RMCrossReferenceLink( editor ) );
        var viewDocument = editor.editing.view.document;


        editor.listenTo( viewDocument, 'clipboardInput', ( evt, data ) => {
            if ( localStorage.getItem( 'rmCrossRefLinkClipboard' ) !== null ) {
                evt.stop();
            }
        } );

        editor.listenTo( viewDocument, 'paste', ( evt, data ) => {
            if ( localStorage.getItem( 'rmCrossRefLinkClipboard' ) !== null ) {
                eventBus.publish( 'requirementDocumentation.canShowPasteCrossRefLinkPopup' );
            }
        } );

        editor.listenTo( viewDocument, 'copy', ( evt, data ) => {
            var crossRefLinkData = JSON.parse( localStorage.getItem( 'rmCrossRefLinkClipboard' ) );
            if ( crossRefLinkData ) {
                localStorage.removeItem( 'rmCrossRefLinkClipboard' );
            }
        } );

        eventToHandleClickOnCrossReferenceLink =  eventBus.subscribe( 'ckeditor.handleClickOnCrossReferenceLink', function( eventData ) {
            eventBus.publish( 'requirementDocumentation.openCrossRefLinkInNewTab', {
                crossRefLinkElement: eventData.requirementElement,
                id: ''
            } );
        } );
    }

    destroy() {
        super.destroy();
        eventBus.unsubscribe( eventToHandleClickOnCrossReferenceLink );
    }
}
