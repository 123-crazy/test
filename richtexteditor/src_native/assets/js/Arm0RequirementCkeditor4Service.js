// Copyright 2021 Siemens Product Lifecycle Management Software Inc.

/* global CKEDITOR */

/**
 * Module for the Ckeditor4 in Requirement Documentation Page
 *
 * @module js/Arm0RequirementCkeditor4Service
 */
import app from 'app';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import iconSvc from 'js/iconService';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';

import Arm0CkeditorConfigProvider from 'js/Arm0CkeditorConfigProvider';

var exports = {};
var resizePromise;
var initCKEditorListener;

/**
 * Generate unique Id for Ck Editor
 *
 * @return {String} random id
 */
function _generateID() {
    // Math.random should be unique because of its seeding algorithm.
    // Convert it to base 36 (numbers + letters), and grab the first 9 characters
    // after the decimal.
    return 'ckeditor-instance-' + Math.random().toString( 36 ).substr( 2, 9 );
}

/**
 * Sets the viewer height
 *
 * @return {Void}
 */
function setEditorHeight( subPanelContext ) {
    var height = 0;
    var element = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' )[ 0 ];
    if( element ) {
        // this means panel section of UV is in the view
        // first try to find if directive is added in main panel, if yes main panel will already have correct height
        var mainLayoutElement = _getMainLayoutPanel( element );
        var commandBarEle = document.getElementsByClassName( 'aw-requirements-commandBarIcon' );
        var commandBarExpanded = true;
        if( commandBarEle && commandBarEle.length > 0 && commandBarEle[0].offsetHeight <= 5 ) {
            commandBarExpanded = false; // If commandBar not expanded yet, skip 40 px for commandbar
        }

        if( appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Overview' ) {
            height = 350;
        } else if( mainLayoutElement ) {
            height = !commandBarExpanded ? mainLayoutElement.offsetHeight - 40 - 1 : mainLayoutElement.offsetHeight - 1;    //1px is to roud up client offset height in decimal.
        } else if( window.innerHeight > element.offsetTop ) {
            height = window.innerHeight - element.offsetTop - 10 - 1;   //1px is to roud up client offset height in decimal.
            height = height > 300 ? height : 300;
        } else {
            // this means panel section of UV is drop downed and have to scroll to view it.
            height = window.innerHeight - 120; // 60px from header + 60px from footer
        }
        var cke_instance = CKEDITOR.instances[ subPanelContext.id ];
        if( cke_instance && cke_instance.document && cke_instance.document.getWindow() && cke_instance.document.getWindow().$ ) {
            cke_instance.resize( cke_instance.width, height );
        }
    }
}

/**
 * Find if given element is added inside the main panel, if yes return main panel element
 *
 * @param {Object} element - html dom element
 * @returns {Object} html dom element or null
 */
function _getMainLayoutPanel( element ) {
    if( !element ) {
        return null;
    }
    if( element.classList.contains( 'aw-layout-panelMain' ) ) {
        return element;
    }
    return _getMainLayoutPanel( element.parentElement );
}

/**
 * Implements promise for window resize event
 *
 * @return {Void}
 */
function _resizeTimer( subPanelContext ) {
    resizePromise = setTimeout( function() {
        if( setEditorHeight ) {
            setEditorHeight( subPanelContext );
        }
    }, 0 );
}

/**
 * Implements handler for window resize event
 *
 * @return {Void}
 */
export let resizeEditor = function( subPanelContext ) {
    if( resizePromise ) {
        clearTimeout( resizePromise );
    }
    _resizeTimer( subPanelContext );
};

/**
 *
 * @param {Object} subPanelContext - Sub panel context
 * @returns {Boolean} true - if Doc tab in ACE
 */
function _isEditorForMultipleRequirements( subPanelContext ) {
    if( subPanelContext && subPanelContext.dbValue && subPanelContext.dbValue.addNavigationCommands === true ) {
        return true;
    }
    return false;
}

/**
 * Controller Init.
 *
 * @return {Void}
 */
export let initCkeditor = function( subPanelContext, data ) {
    if( !subPanelContext ) {
        return;
    }

    data.prop = subPanelContext;
    if( !data.prop.id ) {
        data.prop.id = _generateID();
    }

    registerCkeditorInstanceNotReady( data.prop.id );

    if( data.prop.showCKEditor ) {
        setTimeout( function() {
            _showCkEditor( data );
        }, 100 );
    } else {
        // Register event for initCKEditorEvent
        initCKEditorListener = eventBus.subscribe( 'requirement.initCKEditorEvent', function( eventData ) {
            eventBus.unsubscribe( initCKEditorListener );
            initCKEditorListener = undefined;
            if( eventData && eventData.pageSize && data.prop.dbValue ) {
                data.prop.dbValue.pageSize = parseInt( eventData.pageSize );
            }
            _showCkEditor( data );
        }, data );
    }
};

/**
 * Update ctx, ckeditor is getting instantiated and it is not yet ready
 *
 * @param {String} ckeditorId - ckeditor instance id
 */
function registerCkeditorInstanceNotReady( ckeditorId ) {
    appCtxService.registerCtx( 'AWRequirementsEditor', { ready: false, id: ckeditorId } );
}

/**
 * Update ctx, ckeditor is instantiated and it is ready
 *
 * @param {String} ckeditorId - ckeditor instance id
 */
function registerCkeditorInstanceIsReady( ckeditorId ) {
    appCtxService.updateCtx( 'AWRequirementsEditor', { ready: true, id: ckeditorId } );
}

/**
 * Update ctx, ckeditor is instance destroyed
 */
function ckeditorInstanceDestroyed() {
    appCtxService.unRegisterCtx( 'AWRequirementsEditor' );
}

/**
 *
 */
function _showCkEditor( data ) {
    var ckEditorId = data.prop.id;

    CKEDITOR.dtd.$removeEmpty.span = 0;

    var config = new Arm0CkeditorConfigProvider( data.prop );
    var cke = CKEDITOR.replace( ckEditorId, config.getCkeditor4Config() );

    cke.iconSvc = iconSvc;
    cke.eventBus = eventBus;
    cke.getBaseURL = browserUtils.getBaseURL();
    cke.getBaseUrlPath = app.getBaseUrlPath();

    var resource = 'RichTextEditorCommandPanelsMessages';
    var localTextBundle = localeService.getLoadedText( resource );

    cke.changeTypeTitle = localTextBundle.changeTypeTitle;
    cke.addTitle = localTextBundle.addTitle;
    cke.removeTitle = localTextBundle.removeTitle;
    cke.addSiblingKeyTitle = localTextBundle.addSiblingKeyTitle;
    cke.addChildKeyTitle = localTextBundle.addChildKeyTitle;
    cke.childTitle = localTextBundle.childTitle;
    cke.siblingTitle = localTextBundle.siblingTitle;
    cke.tocSettingsCmdTitle = localTextBundle.tocSettingsCmdTitle;
    cke.update = localTextBundle.update;
    cke.delete = localTextBundle.delete;
    cke.addParameter = localTextBundle.addParameter;
    cke.mapExistingParameter = localTextBundle.mapExistingParameter;
    cke.insertImage = localTextBundle.insertImage;
    cke.insertOLE = localTextBundle.insertOLE;
    cke.nextPage = localTextBundle.nextPage;
    cke.previousPage = localTextBundle.previousPage;
    var imgSrc = app.getBaseUrlPath() + '/image/' + 'cmdAdd24.svg';
    cke.addIconImgElement = '<img class="aw-base-icon" src="' + imgSrc + '" />';
    var coSrc = app.getBaseUrlPath() + '/image/' + 'indicatorCheckedOut16.svg';
    cke.checkoutIconImgElement = '<img class="aw-base-icon" src="' + coSrc + '" />';

    handleEditorInstanceLoaded( ckEditorId, data );
}

/**
 *
 * @param {String} ckEditorId - Editor id
 */
function handleEditorInstanceLoaded( ckEditorId, data ) {
    CKEDITOR.on( 'instanceReady', function( event ) {
        if( event && event.editor && event.editor.name === ckEditorId ) {
            registerCkeditorInstanceIsReady( ckEditorId );

            event.editor.on( 'contentDom', function( ev ) {
                exports.resizeEditor( data.prop );
            } );
        }
    }, ckEditorId );

    CKEDITOR.on( 'instanceLoaded', function( ev ) {
        ev.editor.on( 'contentDom', function( ev ) {
            // get the body of the document in the cdeditor iframe
            if( CKEDITOR.instances[ ckEditorId ] ) {
                var editorDocumentBody = CKEDITOR.instances[ ckEditorId ].document.getBody();
                // set the content editable attributes as false
                if( data.prop.type === 'ADVANCED' || data.prop.type === 'ADVANCED_NODROP' ||
                    data.prop.type === 'MINI' ) {
                    editorDocumentBody.setAttribute( 'contenteditable', 'false' );
                }
                // Add css class for document like view
                var existingClassName = editorDocumentBody.getAttribute( 'class' );
                if( data.prop.a4SizeEditor ) {
                    editorDocumentBody.setAttribute( 'class', existingClassName +
                        ' aw-ckeditor-document aw-ckeditor-a4SizePaper' );
                } else if( data.prop.isWidePanelEditor ) {
                    editorDocumentBody.setAttribute( 'class', existingClassName +
                        ' aw-ckeditor-document aw-ckeditor-documentWidePanelPaper' );
                } else {
                    editorDocumentBody.setAttribute( 'class', existingClassName +
                        ' aw-ckeditor-document aw-ckeditor-documentPaper' );
                }
                var editable = ev.editor.editable();
                if( editable ) {
                    editable.attachListener( editable.getDocument(), 'scroll', function() {
                        // Close tracelink tooltip, if any
                        if( appCtxService.ctx.Arm0TraceLinkTooltipBalloonPopupVisible ) {
                            eventBus.publish( 'Arm0TracelinkTooltip.closeExistingTracelinkTooltipWithoutHoverCheck' );
                        }
                        // Close action panel popup
                        if( appCtxService.ctx.Arm0ShowActionPanelVisible ) {
                            eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
                        }
                    } );
                }
                var editorDocument = ev.editor.document;
                if( editorDocument && editorDocument.$ && editorDocument.$.body ) {
                    editorDocument.$.body.addEventListener( 'click', function() {
                        // Close tracelink tootip, if any
                        if( appCtxService.ctx.Arm0TraceLinkTooltipBalloonPopupVisible ) {
                            eventBus.publish( 'Arm0TracelinkTooltip.closeExistingTracelinkTooltipWithoutHoverCheck' );
                        }

                        // Close action panel popup
                        if( appCtxService.ctx.Arm0ShowActionPanelVisible ) {
                            eventBus.publish( 'requirementDocumentation.closeExistingBalloonPopup' );
                        }
                    } );
                }
                // Handle lov outside ACE
                if( !_isEditorForMultipleRequirements( data.prop ) && editorDocument && editorDocument.$ && editorDocument.$.body ) {
                    handleCkeditorLOVs( editorDocument.$.body );
                }

                // Place the cursor in first editable element outside ACE
                if( !_isEditorForMultipleRequirements( data.prop ) ) {
                    var editor = CKEDITOR.instances[ ckEditorId ];
                    editor.focus();
                    var body = editor.document.getBody();
                    var editableElement = body.$.querySelectorAll( '[contenteditable="true"]' );
                    if( editableElement && editableElement.length > 0 ) {
                        setTimeout( function() {
                            editableElement[ 0 ].focus();
                            var range = editor.createRange();
                            range.moveToPosition( new CKEDITOR.dom.element( editableElement[ 0 ] ), CKEDITOR.POSITION_AFTER_START );
                        }, 0 );
                    }
                }
            }

            // LCS-228664 - Handle mouse move on iframe which is causing an issue while moving splitter
            // Get ckeditor iframe
            var ckeditorFrame = document.getElementsByClassName( 'cke_wysiwyg_frame' );
            if( ckeditorFrame && ckeditorFrame.length > 0 ) {
                handleIframeMouseMove( ckeditorFrame[ 0 ] );
            }

            // Target only IE browsers
            if( CKEDITOR.env.ie && CKEDITOR.instances[ ckEditorId ] ) {
                CKEDITOR.instances[ ckEditorId ].on( 'insertElement', function( eventInsertEle ) {
                    if( eventInsertEle.data && eventInsertEle.data.getName().toUpperCase() === 'SPAN' && eventInsertEle.data.$ && eventInsertEle.data.$.firstElementChild &&
                        eventInsertEle.data.$.firstElementChild.classList.contains( eventInsertEle.editor.config.mathJaxClass ) ) {
                        // Change event is not getting fired on insert equation
                        eventInsertEle.editor.fire( 'change' );
                    }
                } );
            }
        } );

        ev.editor.setKeystroke( CKEDITOR.CTRL + 13, 'addSiblingRequirementWidget' );
        ev.editor.setKeystroke( CKEDITOR.SHIFT + 13, 'addChildRequirementWidget' );
    }, ckEditorId );
}

/**
 * Handles LOV events from CKEditor
 *
 * @param {Object} editorBody - ckeditor document body element
 */
function handleCkeditorLOVs( editorBody ) {
    var lovSpanElements = editorBody.getElementsByClassName( 'aw-requirement-lovProperties' );
    for( var index = 0; index < lovSpanElements.length; index++ ) {
        var span = lovSpanElements[ index ];
        span.removeAttribute( 'contenteditable' );
        var lovElements = span.getElementsByTagName( 'Select' );
        if( lovElements && lovElements.length > 0 ) {
            var lov = lovElements[ 0 ];
            if( lov.hasAttribute( 'multiple' ) ) {
                lov.onchange = function( evt ) {
                    var selectedOptionsObject = this.selectedOptions;
                    var selectedOptions = Object.values( selectedOptionsObject ); //convert to array
                    for( var i = 0; i < this.options.length; i++ ) {
                        var option = this.options[ i ];
                        if( selectedOptions.indexOf( option ) === -1 ) {
                            option.removeAttribute( 'selected' );
                        } else {
                            option.setAttribute( 'selected', 'selected' );
                        }
                    }
                };
            } else {
                lov.onchange = function( evt ) {
                    var selectedOption = this.options[ this.selectedIndex ];
                    selectedOption.setAttribute( 'selected', 'selected' );
                    for( var i = 0; i < this.options.length; i++ ) {
                        var option = this.options[ i ];
                        if( option !== selectedOption ) {
                            option.removeAttribute( 'selected' );
                        }
                    }
                };
            }
        }
    }
}

/**
 * Attach a mousemove listener to iframe
 * @param {Object} iframe - ckeditor iframe
 */
function handleIframeMouseMove( iframe ) {
    // Save any previous onmousemove handler
    var existingOnMouseMove = iframe.contentWindow.onmousemove;

    // Attach a new onmousemove listener
    iframe.contentWindow.onmousemove = function( e ) {
        // Fire any existing onmousemove listener
        if( existingOnMouseMove ) {
            existingOnMouseMove( e );
        }

        // Create a new event for the this window
        var evt = document.createEvent( 'MouseEvents' );

        // Required to offset the mouse move
        var boundingClientRect = iframe.getBoundingClientRect();

        // Initialize the event, copying exiting event values to the new one
        evt.initMouseEvent(
            'mousemove',
            true, // bubbles
            false, // not cancelable
            window,
            e.detail,
            e.screenX,
            e.screenY,
            e.clientX + boundingClientRect.left,
            e.clientY + boundingClientRect.top,
            e.ctrlKey,
            e.altKey,
            e.shiftKey,
            e.metaKey,
            e.button,
            null // no related element
        );

        // Dispatch the mousemove event on the iframe element
        iframe.dispatchEvent( evt );
    };
}

/**
 * Cleanup all watchers and instance members when this is destroyed.
 *
 * @return {Void}
 */
export let destroyCkeditor = function( subPanelContext ) {
    if( initCKEditorListener ) {
        eventBus.unsubscribe( initCKEditorListener );
    }
    var cke_instance = CKEDITOR.instances[ subPanelContext.id ];
    if( cke_instance ) {
        cke_instance.destroy();
        ckeditorInstanceDestroyed();
    }
};

export default exports = {
    destroyCkeditor,
    initCkeditor,
    resizeEditor
};
/**
 * This factory creates a service for ckeditor4
 *
 * @memberof NgServices
 * @member Arm0RequirementCkeditor5Service
 * @param {Object} appCtxSvc app context service
 * @return {Object} service exports exports
 */
app.factory( 'Arm0RequirementCkeditor4Service', () => exports );
