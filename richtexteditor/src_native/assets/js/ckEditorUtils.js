/* eslint-disable  max-lines */
//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define,
 CKEDITOR
 */

/**
 * @module js/ckEditorUtils
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import localeService from 'js/localeService';
import appCtxSvc from 'js/appCtxService';
import requirementsUtils from 'js/requirementsUtils';
import reqACEUtils from 'js/requirementsACEUtils';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import ckeditorOperations from 'js/ckeditorOperations';
import _ from 'lodash';
import markupText from 'js/MarkupText';
import markupThread from 'js/MarkupThread';
import markupRequirement from 'js/MarkupRequirement';
import markupViewModel from 'js/Arm0MarkupViewModel';
import markupService from 'js/Arm0MarkupService';
import markupData from 'js/MarkupData';

var exports = {};
// MarkukText instance
let _markupTextInstance = markupText;

/**
 * Set CKEditor Content.
 *
 * @param {String} id- CKEditor ID
 * @param {String} content - content to set in CK Editor
 */

export let setCKEditorContent = function( id, content ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor ) {
        ckEditor.fire( 'lockSnapshot' );
        ckEditor.setData( content, function() {
            ckEditor.updateElement();
            ckEditor.resetDirty();
            ckEditor.fire( 'unlockSnapshot' );
        } );
    }
    exports.resetUndo( id );
};

export let replaceObjectPlaceHolderWithContent = function( id, contents, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id ) {
        var editor = CKEDITOR.instances[id];

        var idsToBeReplaced = Array.from( contents.children ).map( s=>s.id );
        let reqModelElements = getCKEditorModelElementsByUIDs( idsToBeReplaced );

        for ( let index = 0; index < contents.children.length; index++ ) {
            if( reqModelElements[index].wrapper && reqModelElements[index].wrapper.$.parentNode ) {
                var widgetDef = editor.widgets.registered.requirementWidget;
                var element = CKEDITOR.dom.element.createFromHtml( contents.children[index].outerHTML );
                var wrapper = editor.widgets.wrapElement( element, widgetDef.name );
                var documentFragment = new CKEDITOR.dom.documentFragment( wrapper.getDocument() );
                documentFragment.append( wrapper );
                var instance = editor.widgets.initOn( element, widgetDef );
                // wrapper.insertAfter( reqModelElements[index].wrapper );
                wrapper.replace( reqModelElements[index].wrapper );
                instance.ready = true;
                instance.fire( 'ready' );
                // reqModelElements[index].wrapper.remove();
            }
        }

        deferred.resolve();
    } else {
        deferred.reject();
    }
    return deferred.promise;
};

var _replaceGivenObjectPlaceHolderWithContent = function( loadingElementsTobeRemoved, domElementContainerTobeInserted, editor ) {
    var widgetDef = editor.widgets.registered.requirementWidget;
    var element = CKEDITOR.dom.element.createFromHtml( domElementContainerTobeInserted.innerHTML );
    var wrapper = editor.widgets.wrapElement( element, widgetDef.name );
    var documentFragment = new CKEDITOR.dom.documentFragment( wrapper.getDocument() );
    documentFragment.append( wrapper );
    var instance = editor.widgets.initOn( element, widgetDef );
    wrapper.insertAfter( loadingElementsTobeRemoved[0].wrapper );
};

/**
 * Get List of ckeditor model objects from given uids (array)
 * @param {Array} uids - array
 * @param {Object} editor - editor instance
 * @returns {Array} -
 */
 export let getCKEditorModelElementsByUIDs = function( uids ) {
    var widgets = [];
    if( appCtxSvc.ctx.AWRequirementsEditor ) {
        var editor = CKEDITOR.instances[appCtxSvc.ctx.AWRequirementsEditor.id];
        var widgets_array = editor.widgets.instances;

        for ( const uid of uids ) {
            for( var i in widgets_array ) {
                var instance = widgets_array[ i ];
                if( uid === instance.element.$.id ) {
                    widgets.push( instance );
                    break;
                }
            }
        }
      }
     return widgets;
};

/**
 * Get Ckeditor model object from given uid
 * @param {String} uid -
 * @param {Object} editor - editor instance
 * @returns {Object} -
 */
 export let getCKEditorModelElementByUID = function( uid ) {
    var editor = CKEDITOR.instances[appCtxSvc.ctx.AWRequirementsEditor.id];
    var widgets_array = editor.widgets.instances;
    for( var i in widgets_array ) {
        var instance = widgets_array[ i ];
        if( uid === instance.element.$.id ) {
            return instance;
        }
    }
};

export let getIdFromCkeModelElement = function( ckeelement ) {
    return ckeelement.element.$.id;
};

/**
 * Set CKEditor Content.
 *
 * @param {String} id- CKEditor ID
 * @param {String} content - content to set in CK Editor
 * @return {String} Return when content gets loaded in ckeditor
 */

export let setCKEditorContentAsync = function( id, content ) {
    var ckEditor = CKEDITOR.instances[ id ];
    var deferred = AwPromiseService.instance.defer();

    if( ckEditor ) {
        ckEditor.fire( 'lockSnapshot' );
        ckEditor.setData( content, function() {
            ckEditor.updateElement();
            ckEditor.resetDirty();
            ckEditor.fire( 'unlockSnapshot' );
            deferred.resolve();
        } );
    }
    return deferred.promise;
};

export let updateHtmlDivs = function( id, updatedObjects, updatedContents ) {
    var editor = CKEDITOR.instances[ id ];
    var bodyTextClass = 'aw-requirement-bodytext';
    for( var i = 0; i < updatedObjects.length; i++ ) {
        var element = document.createElement( 'div' );
        element.innerHTML = updatedContents[i].trim();
        var requirementElement = element.getElementsByClassName( 'requirement' );
        if( requirementElement && requirementElement.length > 0 ) {
            var updatedRequirement = requirementElement[0];
            var ckeditorRequirement = editor.document.$.getElementById( updatedObjects[i].uid );
            ckeditorRequirement.removeAttribute( 'checkedOutBy' );
            ckeditorRequirement.removeAttribute( 'checkedOutTime' );
            var widget = editor.widgets.getByElement( new CKEDITOR.dom.element( ckeditorRequirement ) );
            widget.setCheckedOutIcon();
            var updatedReqBodyText = updatedRequirement.getElementsByClassName( bodyTextClass );
            var ckeditorReqBodyText = ckeditorRequirement.getElementsByClassName( bodyTextClass );
            if( ckeditorReqBodyText && updatedReqBodyText ) {
                ckeditorReqBodyText[0].innerHTML = updatedReqBodyText[0].innerHTML;
                ckeditorReqBodyText[0].setAttribute( 'isdirty', 'false' );
                widget.setTOCSettingsIcon();
            }
            var ckeditorProperties = ckeditorRequirement.getElementsByClassName( 'aw-requirement-properties' );
            if( ckeditorProperties && ckeditorProperties.length > 0 ) {
                for( var j = 0; j < ckeditorProperties.length; j++ ) {
                    var isTitle = ckeditorProperties[j].classList.contains( 'aw-requirement-title' );
                    if( !isTitle ) {
                        ckeditorProperties[j].setAttribute( 'isdirty', 'false' );
                    }
                }
            }
            if( ckeditorReqBodyText ) {
                widget.updateContents( ckeditorReqBodyText[0].outerHTML );
            }
    }
}
};

/**
 * Method to update the widget locally when user overwrite the object in derived specification
 * @param {Object} ctx the active workspace contect object
 */
export let makeRequirementEditable = function( ctx ) {
    var selectedObjects = getSelected( ctx );
    for ( let index = 0; index < selectedObjects.length; index++ ) {
        var overwrittenObject = selectedObjects[index];
        var editor = getCKEditorInstance( ctx.AWRequirementsEditor.id );
        var element = editor.document.$.getElementById( overwrittenObject.uid );
        var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
        reqBodyText.setAttribute( 'contenteditable', 'TRUE' );
        var isOverwrite = reqBodyText.getAttribute( 'isOverwrite' );
        if( !isOverwrite ) {
            reqBodyText.setAttribute( 'isOverwrite', 'true' );
        }
        var indicatorElement = element.getElementsByClassName( 'aw-requirement-readOnly' )[ 0 ];
        indicatorElement.classList.add( 'aw-requirements-editable' );
        indicatorElement.classList.remove( 'aw-requirements-frozenToLatest' );
        indicatorElement.classList.remove( 'aw-requirements-masterChanged' );
        var resource = 'RequirementsCommandPanelsMessages';
        var localeTextBundle = localeService.getLoadedText( resource );
        indicatorElement.setAttribute( 'title', localeTextBundle.overwrittenTooltip );
        element.style.backgroundColor = 'transparent';
    }
};

/**
 * Reset ckeditor's undo state
 *
 * @param {String} id - CKEditor ID
 */
export let resetUndo = function( id ) {
    var ckEditor = CKEDITOR.instances[ id ];
    if( ckEditor && ckEditor.undoManager ) {
        var undoManager = ckEditor.undoManager;
        undoManager.reset();
        undoManager.refreshState();
    }
};

var scrollEventAttached = false;

/**
 * Set the content scroll event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} scrollHandler - function to handel the scroll event
 */
 export let setScrollEventForViewPort = function( id, scrollHandler ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor && !scrollEventAttached ) {
        var editable = ckEditor.editable();
        editable.attachListener( editable.getDocument(), 'scroll', function( evt ) {
            scrollHandler( { srcElement: ckEditor.document.$.children[0].children[1] } );
        } );
     }
};

export let removeScrollEventForViewPort = function( id, scrollHandler ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor ) {
        //
    }
};

/**
 * Set the content change event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} clickHandler - function to handel the click event
 */
export let setCkeditorChangeHandler = function( id, clickHandler ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor ) {
        // Remove existing lister if already set
        ckEditor.removeListener( 'change', clickHandler );
        ckEditor.on( 'change', clickHandler );
    }
};

/**
 * Set the content undo event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} undoHandler - function to handel the undo event
 */
export let setCkeditorUndoHandler = function( id, undoHandler ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor ) {
        ckEditor.on( 'beforeCommandExec', function( e ) {
            if( e.data.name === 'undo' ) {
                // handle before undo
                undoHandler();
            }
            if( e.data.name === 'redo' ) {
                // handle before redo
                undoHandler();
            }
        } );
    }
};

/**
 * Scroll ckeditor content to given object element.
 *
 * @param {String} id - CKEditor ID
 * @param {String} objectUid - object uid
 */
export let scrollCKEditorToGivenObject = function( id, objectUid, isPagingEnabled ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( objectUid.length === 1 ) {    // No pagination in case of multi-select
        if( ckEditor && ckEditor.document ) {
            var element = ckEditor.document.getById( objectUid[0] );
            if( element ) {
                element.scrollIntoView();
                eventBus.publish( 'ckeditor.handleSelectionChange', {
                    objectUid: objectUid
                } );
            } else if( isPagingEnabled ) {
                eventBus.publish( 'requirementDocumentation.handleLoadSelectedObjectContentFromServer' );
            }
        }
    } else {
        eventBus.publish( 'ckeditor.handleSelectionChange', {
            objectUid: objectUid
        } );
    }
};

/**
 * Set CKEditor Template.
 *
 * @param {String} id - CKEditor ID
 * @param {String} template - template to set in CK Editor
 * @param {map} templateMap - template map
 * @param {function} callback - callback function
 */
export let setCKEditorSafeTemplate = function( id, template, templateMap, ctx ) {
    var editor = CKEDITOR.instances[ id ];
    if( !editor.config.objectTemplateGlobalMap ) {
        editor.config.objectTemplateGlobalMap = [];
    }

    //Sanitize the template. Detect any special "{%keywords}"" here and replace them with "keywords".
    var regex = new RegExp( /\{%(.*?)\}/g );

    for( var jj = 0; jj < templateMap.length; jj++ ) {
        var realTypeName = templateMap[ jj ].realTypeName;
        var template = templateMap[ jj ].template;

        var oldtemplate = template.toString();
        var newtemplate = null;
        var reqkeywords = oldtemplate.match( regex );
        if( reqkeywords && reqkeywords.length > 0 ) {
            reqkeywords = reqkeywords.toString();
            var splitkeywords = reqkeywords.split( ',' );
            var safeTemplate = oldtemplate;
            //Remove special chars "{%"" and "}" but leave clean prop name.
            for( var ii = 0; ii < splitkeywords.length; ii++ ) {
                var cleanprop = splitkeywords[ ii ].replace( '{%', '' );
                cleanprop = cleanprop.replace( '}', '' );
                safeTemplate = safeTemplate.replace( splitkeywords[ ii ], cleanprop );
            }
            newtemplate = new CKEDITOR.template( safeTemplate );
        }
        editor.config.objectTemplateGlobalMap.push( {
            realTypeName: realTypeName,
            template: newtemplate ? newtemplate : new CKEDITOR.template( oldtemplate )
        } );

        if( template.toLowerCase() === realTypeName.toLowerCase() ) {
            var reqwidget = editor.widgets.registered.requirementWidget;
            reqwidget.template = newtemplate ? newtemplate : new CKEDITOR.template( oldtemplate );
        }
    }
};
/**
 * Get Html spec template
 *
 * @param {String} id- CKEditor ID
 * @return content of CKEditor
 */

export let getObjHtmlTemplate = function( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText ) {
    return '<div class="requirement" hastracelink="FALSE" id="' + uniqueID + '" objecttype="' + objType + '" itemtype="' + objType + '" parentid="' + parentId + '" parenttype="' + parentType + '" parentItemType="' + parentType + '">' +

    '<div class = "aw-requirement-header" contenttype="TITLE" contenteditable="false">' +
    '<h3 contenteditable="true" data-cke-enter-mode="1" data-cke-widget-editable="content" class="cke_widget_editable_focused"><span contenteditable="false" style="cursor:pointer;">' +
    strLevel + '</span><label data-placeholder="Title"> ' + objName + '</label></h3>' +
    '</div>' +
    '<div class="aw-requirement-content" contenteditable="FALSE" style="outline:none;">' +
    updatedBodyText +
    '</div>' +
    '</div>';
};

/**
 * Get CKEditor Content.
 *
 * @param {String} id- CKEditor ID
 * @return content of CKEditor
 */

export let getCKEditorContent = function( id ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor ) {
        return ckEditor.getData();
    }
};

/**
 * Check CKEditor content changed / Dirty.
 *
 * @param {String} id- CKEditor ID
 * @return {Boolean} isDirty
 *
 */

export let checkCKEditorDirty = function( id ) {
    var ckEditor = CKEDITOR.instances[ id ];

    if( ckEditor ) {
        return ckEditor.checkDirty();
    }
    return false;
};

export let setCkeditorDirtyFlag = function() {

};

/**
 * Get the instance of ckeditor for given id
 *
 * @param {String} id- CKEditor ID
 * @return {Object} editor
 *
 */

export let getCKEditorInstance = function( id ) {
    return CKEDITOR.instances[ id ];
};

/**
 * Return the element from ckeditor frame from given element id
 * @param {String} ckeditorId - Ckeditor id
 * @param {String} elementId - element id which needs to be searched in ckeditor
 * @returns {Object} - Dom element
 */
export let getElementById = function( ckeditorId, elementId ) {
    var editor = CKEDITOR.instances[ ckeditorId ];
    return editor.document.$.getElementById( elementId );
};

/**
 * Clear the highlighting of quality metric data
 * @param {String} id - ckeditor instance id
 */
export let clearQualityHighlighting = function( id ) {
    var ckEditor = CKEDITOR.instances[ id ];
    if( ckEditor ) {
        ckEditor.fire( 'clearHighlightInvalidMetricData' );
    }
};

/**
 * set FullText object of Requirement Revision
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let insertImage = function( id, imageURL, img_id ) {
    var imgHtml = CKEDITOR.dom.element.createFromHtml( '<img src=' + imageURL + ' id=' + img_id + ' alt="" />' );
    CKEDITOR.instances[ id ].insertElement( imgHtml );
};

export let insertCrossReferenceLink = function( id, reqObjectID, revID, name, iconURL ) {
    var htmlToInsert = '<p class=\'aw-requirement-crossRefLink\' revid="' + revID + '" occid="' + reqObjectID + '">';
    if( iconURL ) {
        htmlToInsert = htmlToInsert + '<span><img crossRefImg=true src="' + iconURL + '" style="cursor:pointer;height:16px;width:16px;float:left;"/>';
    }
    htmlToInsert = htmlToInsert + '<span>' + name + '</span> </span> </p>';

    var crossReferenceLink = CKEDITOR.dom.element.createFromHtml( htmlToInsert );
    crossReferenceLink.$.addEventListener( 'click', function( evt ) {
        exports.navigateToCrossReferencedObject( crossReferenceLink.$, id );
    }, id );
    CKEDITOR.instances[ id ].insertElement( crossReferenceLink );
};

export let navigateToCrossReferencedObject = function( crossRefLinkElement, id ) {
    var widgets = CKEDITOR.instances[ id ].widgets.instances;
    //If element present in document then scroll to it and select else open it in new tab
    for( var w in widgets ) {
        var widget = widgets[ w ];
        var openInNewTab = true;
        if( widget.element.$.getAttribute( 'id' ) === crossRefLinkElement.getAttribute( 'occid' ) ) {
            widget.element.scrollIntoView( true );
            var eventDataForuid = {
                objectsToSelect: [ { uid: widget.element.$.id } ]
            };
            eventBus.publish( 'aceElementsSelectionUpdatedEvent', eventDataForuid );
            openInNewTab = false;
            break;
        }
    }
    if( openInNewTab ) {
        if( localeService ) {
            localeService.getTextPromise( 'RequirementsCommandPanelsMessages' ).then(
                function( textBundle ) {
                    var documentationTitle = textBundle.documentationTitle;
                    var urlToNavigate = browserUtils.getBaseURL();
                    urlToNavigate = urlToNavigate + '#/com.siemens.splm.clientfx.tcui.xrt.showObject?uid=' + crossRefLinkElement.getAttribute( 'revID' ) + '&spageId=' + documentationTitle;
                    window.open( urlToNavigate, '_blank' );
                } );
        }
    }
};

/**
 * Inser OLE object
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let insertOLE = function( id, ole_id, thumbnailURL, fileName, type ) {
    var imgHtml = CKEDITOR.dom.element
        .createFromHtml( '<span><img oleID=' + ole_id + ' style="width:48px;height:48px;cursor:pointer;" src= ' +
            thumbnailURL + ' alt="" ' + 'datasetType=' + type + ' />' + fileName + '</span>' );
    CKEDITOR.instances[ id ].insertElement( imgHtml );
};

/**
 * Check if given object is visible in ckeditor
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @return {boolean} true, if object with given uid is visible in editor.
 */
export let isObjectVisibleInEditor = function( id, objId ) {
    var editor = CKEDITOR.instances[ id ];
    if( editor && editor.document && editor.document.$ ) {
        var element = editor.document.$.getElementById( objId );
        if( element ) {
            return true;
        }
    }

    return false;
};

/**
 * Get all properties for given object
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @return {Array} - array of properties
 */
export let getPropertiesFromEditor = function( ckeditorelement ) {
    var props = [];
    if( ckeditorelement && ckeditorelement.name !== 'rmLoadingWidget' && ckeditorelement.element.$ ) {
        var element = ckeditorelement.element.$;
        props.push( { name:'revisionid', value:element.getAttribute( 'revisionid' ) } );
        var properties = element.getElementsByClassName( 'aw-requirement-properties' );
        _.forEach( properties, function( property ) {
            var prop = {
                name: property.getAttribute( 'internalname' ),
                value: property.textContent
            };
            props.push( prop );
        } );
    }
    return props;
};

/**
 * Update the given properties
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @param {Array} updatedProperties array of updated properties.
 */
export let updateObjectProperties = function( id, modelElementsTobeUpdated, data ) {
    for ( const object of modelElementsTobeUpdated ) {
        if( object.name === 'rmLoadingWidget' ) {
            continue;
        }
        var widget = object.item;
        var element = widget.element.$;
        var updatedProperties = object.props;

        var isWidgetDataModified = true;
        if( !widget.checkHeaderDirty() && !widget.checkDirty() ) {
            isWidgetDataModified = false;
        }
        var propertiesCorrected = {};
        if( element ) {
            if( updatedProperties.date_released ) {
                var bodyText = element.getElementsByClassName( 'aw-requirement-bodytext' );
                if( bodyText && bodyText[0] ) {
                    bodyText[0].setAttribute( 'contentType', 'READONLY' );
                }
                reqACEUtils.setReadOnlyForRequirement( data, element, true );
                widget.syncOriginalContents();
            }
            var properties = element.getElementsByClassName( 'aw-requirement-properties' );
            _.forEach( properties, function( property ) {
                if( property.getAttribute( 'internalname' ) in updatedProperties ) {
                    var newContent = updatedProperties[ property.getAttribute( 'internalname' ) ] ? updatedProperties[ property.getAttribute( 'internalname' ) ] : ' ';

                    if( property.classList.contains( 'aw-requirement-title' ) ) {
                        // Reset header state
                        widget.setOriginalTitleText( newContent );
                    } else {
                        property.textContent = newContent;

                        if( property.hasAttribute( 'isdirty' ) ) {
                            // Reset property state
                            property.setAttribute( 'isdirty', 'false' );
                        }
                    }

                    propertiesCorrected[ property.getAttribute( 'internalname' ) ] = property.textContent;

                    // Set flag to avoide content change event in editor
                    if( !appCtxSvc.ctx.propertiesUpdatedInDocumentation ) {
                        appCtxSvc.registerCtx( 'propertiesUpdatedInDocumentation', true );
                    }
                }
            } );
        }
        if( Object.keys( propertiesCorrected ).length > 0 ) {
            if( !isWidgetDataModified ) {
                widget.syncOriginalContents();
            } else {
                widget.syncUpdatedPropertiesData( propertiesCorrected );
            }
        }
    }
};

/**
 * Gets all the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param frame The frame element.
 * @param id The editor instance ID.
 * @return The editor data.
 */
export let getAllWidgetData = function( id ) {
    var editor = CKEDITOR.instances[ id ];
    var addedWidgets = [];

    var widgets = editor.document.$.body.getElementsByClassName( 'requirement' );

    for( var index = 0; index < widgets.length; index++ ) {
        var domElement = widgets[ index ];
        var widgetElement = new CKEDITOR.dom.element( domElement );
        var widget = editor.widgets.getByElement( widgetElement );
        addedWidgets.push( widget );
    }

    var allObjects = [];
    // Add created objects in list
    for( var index = 0; index < addedWidgets.length; index++ ) {
        var widget = addedWidgets[ index ];
        var newElementId = widget.element.$.id;
        var pId = widget.element.$.getAttribute( 'parentId' );

        var parentId = null;
        parentId = pId;

        var widgetName = widget.getTitle();
        var widgetType = widget.getType();
        var widgetData = widget.getData();
        widgetData = widgetData.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor

        // If contents of the created object is plain text, wrap it in p tag to make it as a html.
        widgetData = _wrapPlainContentsIntoP( widgetData );

        allObjects.push( {
            elementID: newElementId,
            name: widgetName,
            type: widgetType,
            contents: widgetData,
            parentID: parentId
        } );
    }

    return {
        elements: allObjects
    };
};

/**
 * Add created objects in list
 *
 * @param {Array} addedWidgets - the added widgets
 * @param {Array} createdInput - input created with the widgets
 */
var _addCreatedObjectsInList = function( addedWidgets, createdInput ) {
    for( var index = 0; index < addedWidgets.length; index++ ) {
        var widget = addedWidgets[ index ];
        var newElementId = widget.element.$.id;
        var pId = widget.element.$.getAttribute( 'parentId' );
        var pType = widget.element.$.getAttribute( 'parentType' );
        var sId = widget.element.$.getAttribute( 'siblingId' );
        var sType = widget.element.$.getAttribute( 'siblingType' );
        var position = widget.element.$.getAttribute( 'position' );

        var siblingElement = {};
        var parentElement = {};
        var parentId = null;
        var siblingId = null;
        // if sibling uid is not present, then the current element is a added as a child
        if( pId && pId.indexOf( 'RM::NEW::' ) === -1 ) {
            parentElement = {
                uid: pId,
                type: pType
            };
        }
        if( sId && sId.indexOf( 'RM::NEW::' ) === -1 ) {
            siblingElement = {
                uid: sId,
                type: sType
            };
        }
        if( pId && pId.indexOf( 'RM::NEW::' ) >= 0 ) {
            parentId = pId;
        }
        if( sId && sId.indexOf( 'RM::NEW::' ) >= 0 ) {
            siblingId = sId;
        }

        var widgetName = widget.getTitle();
        var widgetName_temp = requirementsUtils.correctCharactersInText( widgetName );
        if ( widgetName_temp === '' ) {
            return null;
        }
        var widgetType = widget.getType();
        var widgetData = widget.getData();
        widgetData = widgetData.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor

        // If contents of the created object is plain text, wrap it in p tag to make it as a html.
        widgetData = _wrapPlainContentsIntoP( widgetData );

        // encode special characters in html text
        widgetData = _encodeBodyTextString( widgetData );

        createdInput.push( {
            elementID: newElementId,
            name: widgetName,
            type: widgetType,
            contents: widgetData,
            siblingElement: siblingElement,
            parentElement: parentElement,
            position: parseInt( position ),
            parentID: parentId,
            siblingID: siblingId
        } );
    }
};
/**
 * Gets the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param frame The frame element.
 * @param id The editor instance ID.
 * @returns {Object} The widgets to be saved
 */
export let getWidgetData = function( id ) {
    var editor = CKEDITOR.instances[ id ];
    var addedWidgets = [];
    var updatedInput = [];

    var widgets = editor.document.$.body.getElementsByClassName( 'requirement' );

    for( var index = 0; index < widgets.length; index++ ) {
        var domElement = widgets[ index ];
        var widgetElement = new CKEDITOR.dom.element( domElement );
        var widget = editor.widgets.getByElement( widgetElement );

        // If newly added requirement is not valid; (e.g. No title provided)
        if( !widget.isValidObjectToSave ) {
            return null;
        }

        var uid = widget.element.$.id;

        // if existing requirement
        if( uid && !uid.startsWith( 'RM::NEW::' ) ) {
            var isDirty = widget.checkDirty();
            var isHeaderDirty = widget.checkHeaderDirty();
            if( isDirty || isHeaderDirty ) {
                var data = '';
                var updatedHeader = '';

                var objectAddedToRefresh = false;

                if( isHeaderDirty ) {
                    var headerData = widget.getHeaderDataWithoutClass();
                    var startindex = headerData.split( 'span', 3 ).join( 'span' ).length;
                    var endIndex = headerData.split( 'h3', 2 ).join( 'h3' ).length;
                    updatedHeader = '<p>' + headerData.substring( startindex - 1, endIndex - 2 ) + '</p>';

                    var d = document.createElement( 'div' );
                    d.innerHTML = updatedHeader;

                    // Add only text to header LCS-328356
                    var titleEle = d.getElementsByClassName( 'aw-requirement-properties' );
                    var titleText = titleEle[0].innerText;
                    titleEle[0].innerHTML = 'HEADER_PLACEHOLDER';
                    updatedHeader = d.innerHTML;

                    if( d.innerText === '' || titleText.trim() === '' ) {
                        return null;
                    }

                    // Replace placeholder with correct text // escape to encode user entered html special chars
                    updatedHeader = updatedHeader.replace( 'HEADER_PLACEHOLDER', _.escape( titleText ).trim() );

                    // Add uid in ctx to refresh the object in tree after save
                    _UpdateCtxToRefreshOccurrances( uid );
                    objectAddedToRefresh = true;
                }

                if( !isDirty && isHeaderDirty ) {
                    data = updatedHeader;
                } else if( isDirty && !isHeaderDirty ) {
                    var rContent = widget.getData();
                    rContent = _encodeBodyTextString( rContent );
                    data = rContent;
                } else {
                    var rContent1 = widget.getData();
                    rContent1 = _encodeBodyTextString( rContent1 );
                    data = updatedHeader + rContent1;
                }
                data = data.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor
                updatedInput.push( {
                    uid: uid,
                    contents: data
                } );

                // Check properties only if object is not added to refresh list
                if( !objectAddedToRefresh ) {
                    // Check if any property is dirty
                    var properties = widget.editables.content.$.getElementsByClassName( 'aw-requirement-properties' );
                    _.forEach( properties, function( property ) {
                        if( property.getAttribute( 'isDirty' ) && property.getAttribute( 'isDirty' ) === 'true' ) {
                            // Add uid in ctx to refresh the object in tree after save
                            _UpdateCtxToRefreshOccurrances( uid );
                        }
                    } );
                }
            }
        }
        // if siblings added for this element
        if( widget.getCreatedSiblingElements() ) {
            addedWidgets.push.apply( addedWidgets, widget.getCreatedSiblingElements() );
        }
        // if child added for this element
        if( widget.getCreatedChildElements() ) {
            addedWidgets.push.apply( addedWidgets, widget.getCreatedChildElements() );
        }
    }

    var createdInput = [];
    _addCreatedObjectsInList( addedWidgets, createdInput );

    return {
        setContentInput: updatedInput,
        createInput: createdInput
    };
};

/**
 * Get requirementContent from dom element
 *
 * @param {Object} domElement - the added widgets
 * @returns {HTMLElement} reqContent
 */
var _getBodyTextContent = function( domElement ) {
    var bodyTextElement = domElement.getElementsByClassName( 'aw-requirement-bodytext' );
    return bodyTextElement ? bodyTextElement[0] : null;
};

/**
 * Get html from bodytext element
 *
 * @param {Object} reqBodyText - the added widgets
 * @returns {HTMLElement} reqHtml
 *
 */
var _getBodyTextHtml = function( reqBodyText ) {
    var reqHtml = reqBodyText.innerHTML;
    reqHtml = '<div class="aw-requirement-bodytext">' + reqHtml + '</div>';
    return reqHtml;
};

/**
 * Gets the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param {String} id The editor instance ID.
 * @param {Object} ctx - context object
 * @returns {Object} The widgets to be saved
 */
export let getWidePanelWidgetData = function( id, ctx ) {
    var editor = CKEDITOR.instances[ id ];
    var updatedInput = [];
    var createdInput = [];
    var widgets = editor.document.$.body.getElementsByClassName( 'requirement' );
    var obj = appCtxSvc.getCtx( 'selected' );
    var uid = obj.uid;
    var rContent = '';
    // rContent = _getBodyTextContent( widgets[0] );
    var rContent = _getBodyTextHtml( _getBodyTextContent( widgets[0] ) );
    rContent = rContent.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor
    updatedInput.push( {
        uid: uid,
        contents: rContent
    } );
    return {
        setContentInput: updatedInput,
        createInput: createdInput
    };
};

/**
 * Encode body text from the given html string
 *
 * @param {String} content - html string
 * @returns {String} html string
 */
var _encodeBodyTextString = function( content ) {
    //Code to process only body_text
    var contentDiv = document.createElement( 'div' );
    contentDiv.innerHTML = content;
    var bodytextDiv = contentDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    var bodyText = '';
    if( bodytextDiv && bodytextDiv.length > 0 ) {
        bodyText = bodytextDiv[0].outerHTML;
        bodytextDiv[0].outerHTML = 'BODY_TEXT_PLACEHOLDER';
    }
    return contentDiv.innerHTML.replace( 'BODY_TEXT_PLACEHOLDER', bodyText );
};

/**
 * Update the ctx with given uid
 *
 * @param {String} uid - model object uid
 */
var _UpdateCtxToRefreshOccurrances = function( uid ) {
    var updatedHeaderUids = appCtxSvc.getCtx( 'arm0ReqDocACEUpdatedHeaderOccUids' );
    if( updatedHeaderUids ) {
        updatedHeaderUids.push( uid );
        appCtxSvc.updatePartialCtx( 'arm0ReqDocACEUpdatedHeaderOccUids', updatedHeaderUids );
    } else {
        updatedHeaderUids = [ uid ];
        appCtxSvc.updatePartialCtx( 'arm0ReqDocACEUpdatedHeaderOccUids', updatedHeaderUids );
    }
};

/**
 * If contents of the created object is plain text, wrap it in p tag to make it as a html.
 *
 * @param {String} widgetData - widget content data
 * @returns {String} html contents
 */
var _wrapPlainContentsIntoP = function( widgetData ) {
    var dummyDiv = document.createElement( 'div' );
    dummyDiv.innerHTML = widgetData;
    var reqDiv = dummyDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    if( reqDiv && reqDiv.length > 0 ) {
        var div = reqDiv[ 0 ];
        if ( div.childNodes && div.childNodes.length > 0 && div.childNodes[0].nodeType === Node.TEXT_NODE ) {
            var node = div.childNodes[ 0 ];
            if( node.nodeType === Node.TEXT_NODE ) {
                var dummyP = document.createElement( 'p' );
                dummyP.innerHTML = node.nodeValue;
                node.parentNode.replaceChild( dummyP, node );
                widgetData = dummyDiv.innerHTML;
            }
        }
    }
    return widgetData;
};

/**
 * Creates a span inside document object model
 * * @param {Object} markup - markup object
 */
export let renderComment = function( markup, markupList, allMarkups ) {
    markupList.push( markup );
    markupThread.add( markup );
    markupRequirement.show( markup, 0 );
    markupViewModel.sortMarkupList();
};

/**
 * Highlight comments when save-reload page
 * * @param {Object} reqMarkupCtx - requirement markup context
 */
export let initialiseMarkupInput = function( reqMarkupCtx ) {

};

/**
 * Remove markup spans if present
 * * @param {Object} widgetsToSave - widgets to save in server side
 */
export let removeMarkupSpans = function( widgetsToSave ) {

};

/**
 * Set Viewer Container for ckeditor and adjust coordinates
 ** @param {Object} viewerContainer - viewerContainer
 */
export let setViewerContainer = function( viewerContainer ) {
    markupText.setViewerContainer( viewerContainer, true );
};

/**
 * Recalculate markups
 */
export let recalculateMarkups = function(  ) {

};

/**
* Returns Arm0MarkupText Instance
** @return {Object} Arm0MarkupText - Instance
*/
export let getMarkupTextInstance = function(  ) {
    return _markupTextInstance;
};

/**
 * Shows comments panel
 */
export let showPanelforComments = function(  ) {
    markupService.setContext();
};

/**
 * Saves markup edit
 */
export let saveCommentEdit = function( data ) {
    markupService.saveMarkupEdit( data );
};

/**
 * Ends markup edit
 */
export let endCommentEdit = function( data ) {
    markupService.endMarkupEdit( data );
};

/**
 * initialization for comments
 */
export let initializationForComments = function() {
    var markupCtx = appCtxSvc.getCtx( 'markup' );
    if ( markupCtx && markupCtx.showMarkups ) {
        markupCtx.showMarkups = false;
        appCtxSvc.updateCtx( 'markup', markupCtx );
    }
    markupService.setContext();
};

/**
 * shows the current selected markup
 */
export let markupSelected = function( eventData ) {
    markupService.markupSelected( eventData );
};

/**
 * Delete selected Markup
 */
export let deleteMarkup = function( ) {
    markupService.deleteMarkup( );
};

/**
 * et Status of Comments
 */
export let getStatusComments = function( markup ) {
    return markupViewModel.getStatus( markup );
};

/**
 * compare status of comments
 */
export let compareStatusComments = function( markup0, markup1 ) {
    return markupThread.compareStatus( markup0, markup1 );
};

/**
 * populate user object in the comment object
 */
export let populateUserObjectInComment = function( userId, obj ) {

};

/**
 * load Users on Comments object
 */
export let loadUsersOnComments = function( ) {

};

/**
 * set markup context
 * @param {Object} data - data
 */
export let initializationMarkupContext = function( data ) {

};

/************************************************************************************************************************
 * This section has functions necessary for Reuse Tool Integration
 * **********************************************************************************************************************
 */

 /**
 * Get contents of the selected Requirement
 *
 */
export let getRequirementContent = function( ) {
    var ckeditorId = appCtxSvc.ctx.AWRequirementsEditor.id;
    var editor = CKEDITOR.instances[ ckeditorId ];
    var selectedWidget = _getSelectedRequirement( editor );
    if( selectedWidget ) {
        var contentElement = selectedWidget.editables.content.$;
        var bodyText = contentElement.getElementsByClassName( 'aw-requirement-bodytext' );
        if( bodyText && bodyText.length > 0 ) {
            return bodyText[ 0 ].textContent || bodyText[ 0 ].innerText;
        }
    }
    return '';
};

 /**
 * Get header of the selected Requirement
 *
 */
export let getRequirementHeader = function( ) {
    var ckeditorId = appCtxSvc.ctx.AWRequirementsEditor.id;
    var editor = CKEDITOR.instances[ ckeditorId ];
    var selectedWidget = _getSelectedRequirement( editor );
    if( selectedWidget ) {
        return selectedWidget.getTitle();
    }
    return '';
};

 /**
 * Update the CkEditor instance
 *
 */
export let updateCKEditorInstance = function( qualityShown, calculateInProcess ) {
    var ckEditor = CKEDITOR.instances[ appCtxSvc.ctx.AWRequirementsEditor.id ];
    if( ckEditor && qualityShown ) {
        ckEditor.RAT = {};
        ckEditor.RAT.SHOW_QUALITY_VISIBLE = qualityShown;
        ckEditor.RAT.CALCULATE_QUALITY_IN_PROCESS = calculateInProcess;
    } else if( ckEditor ) {
        ckEditor.RAT = undefined;
    }
};

 /**
 * showReqQualityData
 *
 */
export let showReqQualityData = function( data, _reConnecting ) {
    if( !appCtxSvc.ctx.showRequirementQualityData ) {
        // Subscribe an event to know when quality metric tables are visible
        var _registerEventQualityMetricTableVisible = eventBus.subscribe( 'Arm0ShowQualityMetricData.contentLoaded', function() {
            // Fire an event to resize editor once quality metric tables are visible
            eventBus.publish( 'Arm0ShowQualityMetricData.reveal', { ReuseSessionId: data.ReuseSessionId } );
            eventBus.publish( 'requirementsEditor.resizeEditor' );
            eventBus.unsubscribe( _registerEventQualityMetricTableVisible );
        } );

        // Subscribe an event to know when quality metric tables are removed/hidden
        var _registerEventQualityMetricTableHidden = eventBus.subscribe( 'Arm0ShowQualityMetricData.contentUnloaded', function() {
            // Fire an event to resize editor once quality metric tables are hidden
            eventBus.publish( 'requirementsEditor.resizeEditor' );
            eventBus.unsubscribe( _registerEventQualityMetricTableHidden );
            data.ReuseSessionId = null;
            appCtxSvc.unRegisterCtx( 'showRequirementQualityData' );

            // Inform to ckeditor that, Reuse API is disconnected.
            //_updateCKEditorInstance( false, false ); // <--- make this as a common for both
            ckeditorOperations.updateCKEditorInstance( false, false );
        } );

        appCtxSvc.registerCtx( 'showRequirementQualityData', true );
    } else if( _reConnecting ) {
        eventBus.publish( 'Arm0ShowQualityMetricData.reveal', { ReuseSessionId: data.ReuseSessionId } );
    } else {
        data.ReuseSessionId = null;
        appCtxSvc.unRegisterCtx( 'showRequirementQualityData' );
    }
};

 /**
 * qualityRuleSelected
 *
 */
export let qualityRuleSelected = function( selectedRule ) {
    var ckEditor = CKEDITOR.instances[ appCtxSvc.ctx.AWRequirementsEditor.id ];
    if( selectedRule && selectedRule.length > 0 && selectedRule[ 0 ].props && selectedRule[ 0 ].props.instances ) {
        var instances = selectedRule[ 0 ].props.instances.uiValue;
        if( ckEditor ) {
            ckEditor.fire( 'highlightInvalidMetricData', instances );
        }
    } else if( selectedRule && selectedRule.length === 0 ) {
        if( ckEditor ) {
            ckEditor.fire( 'clearHighlightInvalidMetricData' );
        }
    }
};

 /**
 * clearHighlighting
 *
 */
export let clearHighlighting = function( ) {
    var ckEditor = CKEDITOR.instances[ appCtxSvc.ctx.AWRequirementsEditor.id ];
    if( ckEditor ) {
        ckEditor.fire( 'clearHighlightInvalidMetricData' );
    }
};


/************************************************************
 * Private functions
 */

 var _getSelectedRequirement = function( editor ) {
    var widgets_array = editor.widgets.instances;
    var selectedWidget;
    for( var i in widgets_array ) {
        var instance = widgets_array[ i ];
        if( instance.isWidgetSelected || instance.editables && instance.editables.title && instance.editables.title.$ && instance.editables.title.$.classList.contains( 'aw-requirement-headerSelected' ) ) {
            selectedWidget = instance;
            return selectedWidget;
        }
    }
};

export let downloadReqQualityReport = function( data ) {
    var jsonRequestData = {};
    jsonRequestData.sessionId = data.ReuseSessionId;
    jsonRequestData.reportRequirements = [];

    var ckeditorId = appCtxSvc.ctx.AWRequirementsEditor.id;
    var editor = CKEDITOR.instances[ ckeditorId ];
    var widgets = editor.widgets.instances;
    for( var w in widgets ) {
        var widget = widgets[ w ];
        if( widget.getData ) {
            var req_data = widget.getData();
            var dom = document.createElement( 'DIV' );
            dom.innerHTML = req_data;
            var plain_text = dom.textContent || dom.innerText;

            var re = new RegExp( String.fromCharCode( 160 ), 'g' );
            plain_text = plain_text.replace( re, ' ' );
            // Remove formatting spaces
            plain_text = plain_text.replace( /[\n\r]+|[\s]{2,}/g, ' ' ).trim();

            var reqHeader = widget.editables.title.$;
            var obj_header = reqHeader.textContent || reqHeader.innerText;
            var url = '/' + data.ProductInfo.projectName + '/' + obj_header.split( ' ' )[ 0 ];

            jsonRequestData.reportRequirements.push( {
                AbsoluteNumber: obj_header,
                Header: '',
                Description: plain_text,
                URL: url,
                AuthorName: '',
                UserName: '',
                LastModificationUser: '',
                Level: 0,
                Code: obj_header,
                VersionCount: 0,
                NumOleObjects: 0,
                ModuleVolatilityCount: 0,
                AuthorEmailAddress: ''
            } );
        }
    }
    return jsonRequestData;
};

export let processAfterResponse = function( response ) {
    return;
};

/**
 * Gets the modified requirement div for checkout
 *
 * @param {String} id - CKEditor ID
 * @param {Object} changeEvent - changeEvent
 *
 * @return  requirement html element
 */
export let getSelectedReqDiv = function( id, changeEvent ) {
    var selElement = changeEvent.editor.getSelection().getStartElement();
    var widget = changeEvent.editor.widgets.getByElement( selElement );
    var reqDiv = widget && widget.element ? widget.element : null;
    if ( !reqDiv || reqDiv.getAttribute( 'checkedOutBy' ) || !widget ||
        !( widget.checkDirty() || widget.checkHeaderDirty() ) ) {
        return null;
    }
    return {
        widget: widget,
        reqDiv: reqDiv
    };
};
/**
 * Sets the contents of the widget to latest or makes it read-only after a failed checkout
 *
 * @param {String} id - CKEditor ID
 * @param {Object} reqDiv requirement html element
 * @param {IModelObject} reqRev requirement revision
 * @param {Widget} widget CKEditor widget representing the requirement
 * @param {Object} input input data
 */
export let setSelectedReqDivData = function( id, reqDiv, reqRev, widget, input ) {
    if ( input.mode === 'reset' ) {
        widget.resetContents();
        if ( input.checkedOutByUpd ) {
            reqDiv.setAttribute( 'checkedOutBy', input.checkedOutByUpd );
            reqDiv.setAttribute( 'checkedOutTime', reqRev.props.checked_out_date.uiValues[0] );
            widget.setCheckedOutIcon();
        }
        var bodyText = reqDiv.$.getElementsByClassName( 'aw-requirement-bodytext' );
        if ( bodyText && bodyText.length ) {
            bodyText[0].setAttribute( 'contentType', 'READONLY' );
        }
        reqACEUtils.setReadOnlyForRequirement( input._data, reqDiv.$ );
    } else {
        reqDiv.setAttribute( 'checkedOutBy', reqRev.props.checked_out_user.uiValues[0] );
        reqDiv.setAttribute( 'checkedOutTime', reqRev.props.checked_out_date.uiValues[0] );
        widget.setCheckedOutIcon();
        if ( input.contents !== '' ) {
            var reqSpan = document.createElement( 'div' );
            reqSpan.innerHTML = input.contents;
            var bodyText = reqSpan.getElementsByClassName( 'aw-requirement-bodytext' );
            widget.setOriginalBodyText( bodyText[0].innerHTML );
            var titleText = reqSpan.getElementsByClassName( 'aw-requirement-title' );
            widget.setOriginalTitleText( titleText[0].innerHTML );
        }
    }
};

export let handleMarkupDeleted = function( eventData ) {
};

/**
 * Function to get string representation of the markups
 * @return {String} the markups string
 */
export function stringifyMarkups() {
    return  markupData.stringifyMarkups( true );
}

/**
 * Method to update the body text and attributes
 *  @param {String} bodyText - the body text html
 *  @param {String} uid - the uid of the object to update
 *  @param {Array} attrsToAdd - the array of attributes to add
 *  @param {Array} attrsToRemove - the array of attributes to remove
 *  @returns {Element} the requirement body text element
 */
export let updateBodyTextContentAndAttributes = function( bodyText, uid, attrsToAdd, attrsToRemove, isMaterChanged, isFrozenToLatestRev ) {
    var editor = getCKEditorInstance( appCtxSvc.ctx.AWRequirementsEditor.id );
    var element = editor.document.$.getElementById( uid );
    var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
    updateAttributes( reqBodyText, attrsToAdd, true );
    updateAttributes( reqBodyText, attrsToRemove, false );
    reqBodyText.innerHTML = bodyText;
    var indicatorElement = element.getElementsByClassName( 'aw-requirement-readOnly' )[0];
    var resource = 'RequirementsCommandPanelsMessages';
    var localeTextBundle = localeService.getLoadedText( resource );
    if( isMaterChanged ) {
        indicatorElement.classList.remove( 'aw-requirements-frozenToLatest' );
        indicatorElement.classList.add( 'aw-requirements-masterChanged' );
        indicatorElement.setAttribute( 'title', localeTextBundle.FrozenToNonLatestTooltip );
    }else if( isFrozenToLatestRev ) {
        indicatorElement.classList.remove( 'aw-requirements-masterChanged' );
        indicatorElement.classList.add( 'aw-requirements-frozenToLatest' );
        indicatorElement.setAttribute( 'title', localeTextBundle.FrozenToLatestTooltip );
    } else{
        indicatorElement.classList.remove( 'aw-requirements-masterChanged' );
        indicatorElement.classList.remove( 'aw-requirements-frozenToLatest' );
        indicatorElement.classList.add( 'aw-requirements-readOnly' );
        indicatorElement.setAttribute( 'title', localeTextBundle.UnfrozenTooltip );
    }

    return element;
};

/**
 * Method to update the attributes on requirement body text element
 * @param {Element} reqBodyText - the body text element
 * @param {Array} attrs - the array of attributes
 * @param {Boolean} isAdd - the flag to decide whether to add or remove the attributes
 */
function updateAttributes( reqBodyText, attrs, isAdd ) {
    for( var i = 0; i < attrs.length; i++ ) {
        var attrObject = attrs[i];
        if( isAdd ) {
            reqBodyText.setAttribute( attrObject.attrName, attrObject.attrValue );
        } else {
            reqBodyText.removeAttribute( attrObject.attrName );
        }
    }
}

/*
 * Create input for exportToApplication soa
 *@param {appCtx} ctx the application context
 */
export let getSelectedDerivedObject = function( ctx ) {
    var selectedDerivedRev = [];
    var selectedObjects = getSelected( ctx );

    var editor = getCKEditorInstance( appCtxSvc.ctx.AWRequirementsEditor.id );
    for( let index = 0; index < selectedObjects.length; index++ ) {
        var objectToProcess = {};
        var domElement = editor.document.$.getElementById( selectedObjects[ index ].uid );
        objectToProcess.uid = domElement.getAttribute( 'revisionid' );
        objectToProcess.type = domElement.getAttribute( 'objecttype' );
        selectedDerivedRev.push( objectToProcess );
    }
    return selectedDerivedRev;
};

/*
 * Get selected SRUid to update its content
 *@param {appCtx} ctx the application context
 */
export let getSRIdOfSelected = function( ctx ) {
    var selectedSRid = [];
    var selectedObjects = getSelected( ctx );

    var editor = getCKEditorInstance( appCtxSvc.ctx.AWRequirementsEditor.id );
    for( let index = 0; index < selectedObjects.length; index++ ) {
        var objectToProcess = {};
        var domElement = editor.document.$.getElementById( selectedObjects[ index ].uid );
        objectToProcess.SRUid = domElement.getAttribute( 'id' );
        selectedSRid.push( objectToProcess );
    }
    return selectedSRid;
};
/*
 * Get map of masterRevId and SRUid of selected derived object
 *@param {appCtx} ctx the application context
 *@param {Object} data - The panel's view model object
 */
export let getMapOfMasterIdSRUid = function( ctx, data ) {
    //create map of masterRevId and SRUid of selected derived object
    let masterIdSRUid = new Map();
    data.requirementId = [];
    var selectedObjects = getSelected( ctx );
    var editor = getCKEditorInstance( appCtxSvc.ctx.AWRequirementsEditor.id );
    for( let index = 0; index < selectedObjects.length; index++ ) {
        var element = editor.document.$.getElementById( selectedObjects[ index ].uid );
        var bodytext = element.getElementsByClassName( 'aw-requirement-bodytext' );
        var reqId = bodytext[ 0 ].getAttribute( 'masterreqname' ).split( /(.+)-/ )[ 1 ];
        data.requirementId.push( reqId );
        masterIdSRUid.set( reqId, selectedObjects[ index ].uid );
    }
    return masterIdSRUid;
};

/*
 * Get selected objects
 *@param {appCtx} ctx the application context
 */
export let getSelected = function( ctx ) {
    var isOperationPerformedFromCkeditor = appCtxSvc.getCtx( 'operationPerformedFromCkeditor' );
    if( isOperationPerformedFromCkeditor ) {
        var selected = ctx.rmselected;
    }else{
        var selected = ctx.mselected;
    }
    return selected;
};
/**
 * Service for ckEditorUtils.
 *
 * @member ckEditorUtils
 */

export default exports = {
    getCKEditorModelElementsByUIDs,
    getCKEditorModelElementByUID,
    getIdFromCkeModelElement,
    setCKEditorContent,
    replaceObjectPlaceHolderWithContent,
    setCKEditorContentAsync,
    resetUndo,
    setCkeditorChangeHandler,
    setScrollEventForViewPort,
    removeScrollEventForViewPort,
    setCkeditorUndoHandler,
    scrollCKEditorToGivenObject,
    setCKEditorSafeTemplate,
    getCKEditorContent,
    checkCKEditorDirty,
    setCkeditorDirtyFlag,
    getCKEditorInstance,
    getElementById,
    clearQualityHighlighting,
    insertImage,
    insertCrossReferenceLink,
    navigateToCrossReferencedObject,
    insertOLE,
    isObjectVisibleInEditor,
    getPropertiesFromEditor,
    updateObjectProperties,
    getAllWidgetData,
    getWidgetData,
    getWidePanelWidgetData,
    updateHtmlDivs,
    getRequirementContent,
    getRequirementHeader,
    updateCKEditorInstance,
    showReqQualityData,
    qualityRuleSelected,
    clearHighlighting,
    downloadReqQualityReport,
    processAfterResponse,
    getObjHtmlTemplate,
    getSelectedReqDiv,
    setSelectedReqDivData,
    renderComment,
    initialiseMarkupInput,
    removeMarkupSpans,
    handleMarkupDeleted,
    setViewerContainer,
    recalculateMarkups,
    makeRequirementEditable,
    getMarkupTextInstance,
    showPanelforComments,
    saveCommentEdit,
    endCommentEdit,
    initializationForComments,
    markupSelected,
    deleteMarkup,
    getStatusComments,
    stringifyMarkups,
    updateBodyTextContentAndAttributes,
    compareStatusComments,
    populateUserObjectInComment,
    loadUsersOnComments,
    initializationMarkupContext,
    getSelectedDerivedObject,
    getSRIdOfSelected,
    getMapOfMasterIdSRUid,
    getSelected
};
app.factory( 'ckEditorUtils', () => exports );
