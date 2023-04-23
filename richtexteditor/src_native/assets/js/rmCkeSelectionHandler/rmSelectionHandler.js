// Copyright (c) 2020 Siemens

/* global
   CKEDITOR5
*/

/**
 * Plugin to Handle Click event and fire appropriate event
 */
import eventBus from 'js/eventBus';
import RequirementWidgetUtil from 'js/rmCkeRequirementWidget/requirementWidgetUtil';

const REQ_BODYTEXT_CLASS = 'aw-requirement-bodytext';
const REQ_PROPERTY_CLASS = 'aw-requirement-properties';
const REQ_HEADER_CLASS = 'aw-requirement-header';
const REQ_CROSS_REF_LINK = 'aw-requirement-crossRefLink';
var isNewCmtCmdEnabled = false;

export default class RMSelectionHandler extends CKEDITOR5.Plugin {
    init() {
        const editor = this.editor;
        editor.ui.componentFactory.add( 'rmSelectionHandler', new RMSelectionHandler( editor ) );
        const viewDocument = editor.editing.view.document;

        editor.listenTo( viewDocument, 'click', ( evt, data ) => {
            var targetDomElement = data.domTarget;
            var ctrlKey = data.domEvent.ctrlKey;
            var shiftKey = data.domEvent.shiftKey;
            var reqElement = getRequirementElement( targetDomElement );
            var nestedWidget = RequirementWidgetUtil.getRequirementElement( targetDomElement );
            // To fix, selection moves out of the requirement new cmt cmd gets disabled
            _checkIfTextSelectionInDocument( editor );
            if( reqElement ) {
                var eventData = {
                    targetElement: targetDomElement,
                    requirementElement: reqElement,
                    selectedObject: nestedWidget,
                    clickedWithCtrlKey: ctrlKey,
                    clickedWithShiftKey: shiftKey
                };
                if( reqElement.getAttribute && reqElement.getAttribute( 'paramid' ) ) {
                    eventBus.publish( 'ckeditor.clickedOnParameterLink', eventData );
                } else if( reqElement.getAttribute && reqElement.getAttribute( 'id' ) && reqElement.getAttribute( 'id' ).startsWith( 'liid' ) ) {
                    eventBus.publish( 'ckeditor.clickedOnTOCLink', eventData );
                } else if( reqElement.classList.contains( REQ_CROSS_REF_LINK ) ) {
                    eventBus.publish( 'ckeditor.handleClickOnCrossReferenceLink', eventData );
                } else if( targetDomElement.classList.contains( REQ_CROSS_REF_LINK ) && targetDomElement.tagName === 'IMG' ) {
                    //revid and occid is needed to select cross linked object and its present in paragraph element
                    var crossRefDiv = targetDomElement.parentElement;
                    eventData.requirementElement = crossRefDiv.getElementsByTagName( 'p' )[0];
                    eventBus.publish( 'ckeditor.handleClickOnCrossReferenceLink', eventData );
                }else if( reqElement.classList.contains( REQ_PROPERTY_CLASS ) ) {
                    eventBus.publish( 'ckeditor.clickedInsideProperty', eventData );
                    eventBus.publish( 'ckeditor.enableNewCommentCommand', false );
                } else if( reqElement.classList.contains( REQ_HEADER_CLASS ) ) {
                    eventBus.publish( 'ckeditor.clickedInsideHeader', eventData );
                    eventBus.publish( 'ckeditor.enableNewCommentCommand', false );
                } else if( reqElement.classList.contains( REQ_BODYTEXT_CLASS ) ) {
                    _preventBrowserNavigationForLinks( editor, data );
                    eventBus.publish( 'ckeditor.clickedInsideBodyText', eventData );
                    var isReadOnly = _checkIfRequirementReadOnly( reqElement );
                    if( !isReadOnly ) {
                        eventBus.publish( 'requirementDocumentation.selectionChangedinCkEditor', { isSelected: true } );
                        _handleNewCommentCommandVisibility( data );
                    }
                }
            } else {
                eventBus.publish( 'ckeditor.clickedInsideNonRequirementElement', data.domTarget );
                eventBus.publish( 'requirementDocumentation.selectionChangedinCkEditor', { isSelected: false } );
                if( !isNewCmtCmdEnabled ) {
                    eventBus.publish( 'ckeditor.enableNewCommentCommand', false );
                }
            }
            isNewCmtCmdEnabled = false;
        } );
        editor.listenTo( viewDocument, 'mousedown', ( evt, data ) => {
            //Show popup on right click on header
            if( data.domEvent.which === 3 ) {
                var targetDomElement = data.domTarget;
                var reqElement = getRequirementElement( targetDomElement );

                if( reqElement !== undefined && reqElement.classList.contains( REQ_HEADER_CLASS ) ) {
                    var nestedWidget = RequirementWidgetUtil.getRequirementElement( targetDomElement );
                    if( nestedWidget.id.indexOf( 'RM::NEW::' ) === -1 ) {
                        RequirementWidgetUtil.showPopupOnContextClick( editor, nestedWidget, targetDomElement, data );
                    }
                }
            }
        } );


        //Prevents pasting requirement schema as content. Instead paste as plain text
        editor.plugins.get( 'ClipboardPipeline' ).on( 'inputTransformation', ( evt, data ) => {
            if ( data.content._children.length > 0 && data.content._children[0].hasAttribute && data.content._children[0].hasAttribute( 'itemtype' ) && data.content._children[0].hasAttribute( 'revisionid' ) ) {
                const dataTransfer = data.dataTransfer;
                let content = dataTransfer.getData( 'text/plain' );
                data.content = this.editor.data.htmlProcessor.toView( content );
            }
        } );
    }
}

/**
 * Handle New Comment Command Visibility
 *
 * @param {Object} data - dom element
 */
 function _handleNewCommentCommandVisibility( data ) {
    var isCollapsed = data.document.selection.isCollapsed;
    if( isCollapsed ) {
        eventBus.publish( 'ckeditor.enableNewCommentCommand', false );
    }else if( !isCollapsed ) {
        var range = data.document.selection.getFirstRange();
        if( range ) {
            var selectedElement = range.getContainedElement();
            if( selectedElement && selectedElement.name !== 'figure' || !selectedElement ) {
                eventBus.publish( 'ckeditor.enableNewCommentCommand', true );
            }else{
                eventBus.publish( 'ckeditor.enableNewCommentCommand', false );
            }
        }
    }
 }

/**
 * Method checks and returns flag if requirement is read only
 *
 * @param {Object} reqElement - dom element
 * @returns {Boolean} - true if read only object and false if not
 */
function _checkIfRequirementReadOnly( reqElement ) {
    var contentType = reqElement.getAttribute( 'contenttype' );
    if( contentType === 'READONLY' ) {
        eventBus.publish( 'ckeditor.enableNewCommentCommand', false );
        return true;
    }
    return false;
}

/**
 * Return the bodyText div if clicked inside bodyText div, else return null
 *
 * @param {Object} element - dom element
 * @returns {Object} - bodyText dom element
 */
function getRequirementElement( element ) {
    if( !element || element.classList.contains( 'requirement' ) || element.classList.contains( 'ck-content' ) ) {
        return; // Exit if reached to requirement or ckeditor container
    }
    if( element.getAttribute && element.getAttribute( 'id' ) && element.getAttribute( 'id' ).startsWith( 'liid' ) ) {
        return element; // IF table of content link
    }
    if( element.getAttribute && element.getAttribute( 'paramid' ) ) {
        return element; // If parameter link
    }
    if( element.classList.contains( REQ_CROSS_REF_LINK ) ) {
        if( element.tagName === 'IMG' ) {
            //revid and occid is needed to open object in new tab and its present in paragraph element
            return element.parentElement.parentElement;
        }
        return element; // If cross reference link
    }
    if( element.classList.contains( REQ_PROPERTY_CLASS ) || element.classList.contains( REQ_HEADER_CLASS ) ||
        element.classList.contains( REQ_BODYTEXT_CLASS ) ) {
        return element;
    }

    return getRequirementElement( element.parentNode );
}

/**
 * Method to prevent the default browser link event for links starting with '#'
 *
 * @param {Object} editor - The editor instance
 * @param {Object} evt - Dom Event
 */
 function _preventBrowserNavigationForLinks( editor, evt ) {
    const linkHref = editor.model.document.selection.hasAttribute( 'linkHref' );
    if( linkHref ) {
        const linkHrefAttr = editor.model.document.selection.getAttribute( 'linkHref' );
        if( linkHrefAttr && linkHrefAttr.startsWith( '#' ) ) {
            evt.preventDefault();
        }
    }
}

/**
 * Method to prevent, new cmt cmd getting disabled if text selection is present but cursor moves out of the text area
 *
 * @param {Object} editor - The editor instance
 *
 */
 function _checkIfTextSelectionInDocument( editor ) {
    const rangeCollapsed = editor.model.document.selection.isCollapsed;
    if( !rangeCollapsed ) {
        eventBus.publish( 'ckeditor.enableNewCommentCommand', true );
        isNewCmtCmdEnabled = true;
    }
}
