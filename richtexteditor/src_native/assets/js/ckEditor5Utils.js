/* eslint-disable  max-lines */
/* @<COPYRIGHT>@
==================================================
Copyright 2020.
Siemens Product Lifecycle Management Software Inc.
All Rights Reserved.
==================================================
@<COPYRIGHT>@ */

/*global
  CKEDITOR5
 */
/**
 * @module js/ckEditor5Utils
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import browserUtils from 'js/browserUtils';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import localeService from 'js/localeService';
import reqACEUtils from 'js/requirementsACEUtils';
import ckeditorOperations from 'js/ckeditorOperations';
import { attachPatternAssistToggle } from 'js/rmCkeReuseToolIntegration/reuseToolIntegrationUtil';
import markupViewModel from 'js/Arm0MarkupViewModel';
import arm0MarkupText from 'js/Arm0Ck5CommentsHandler';
import _ from 'lodash';
import reqUtils from 'js/requirementsUtils';
import markupService from 'js/Arm0MarkupService';
import markupRequirement from 'js/MarkupRequirement';
import markupUtil from 'js/Arm0MarkupUtil';
import Arm0DocumentationUtil from 'js/Arm0DocumentationUtil';
import awIconService from 'js/awIconService';

'use strict';

var exports = {};

var origCkeditorContentMap = {};
var revisionIDVsOccurenceID = {};
var commentIdVsStartPath = new Map();
var commentIdVsEndPath = new Map();
var processedComments = {};
var halfProcessedComments = {};

// totat RCH parsed in a req Widget
var totalRCHParsed = 0;
// totat Ch parsed for a entire parent node
var totalCharParsed = 0;
// last text parent that was traversed
var lastTextParent;
// elements to ignore for creating model path
var noOfElementToIgnore = 0;
var dirtyFlagforCk5 = false;
var contentUpdatedForPropertyUpdate = false;

// MarkupText instance
let _markupTextInstance = arm0MarkupText;
var commentsMap = new Map();
var finalMarkupParsedInput = [];

 var tempDocument = document.implementation.createHTMLDocument( 'Test Doc1' );

 /**
  * Set CKEditor Content.
  *
  * @param {String} id - CKEditor ID
  * @param {String} content - content to set in CK Editor
  * @param {Object} ctx - context object
  */
 export let setCKEditorContent = function( id, content, ctx ) {
     if( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor && ctx.AWRequirementsEditor.editor.setData ) {
         ctx.AWRequirementsEditor.editor.setData( content );
     }
 };
 export let replaceObjectPlaceHolderWithContent = function( id, contents, ctx ) {
     var deferred = AwPromiseService.instance.defer();
     if ( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
         var editor = ctx.AWRequirementsEditor.editor;

         var idsToBeReplaced = Array.from( contents.children ).map( s=>s.id );
         let reqModelElements = getCKEditorModelElementsByUIDs( idsToBeReplaced );
         replacePlaceHolders( deferred, editor, contents.children, reqModelElements );
     } else {
         deferred.reject();
     }
     return deferred.promise;
 };

 /**
  *
  * @param {*} deferred
  * @param {*} reqDomElements
  * @param {*} placeHolderModelElements
  * @param {*} index
  */
  function replacePlaceHolders( deferred, editor, reqDomElements, placeHolderModelElements ) {
    editor.model.enqueueChange( 'transparent', writer => {
        var editorRoot = editor.model.document.getRoot();
        for ( let index = 0; index < placeHolderModelElements.length; index++ ) {
            const placeHolderEle = placeHolderModelElements[index];
            const reqDomEle = Array.from( reqDomElements ).find( node => node.id === placeHolderEle.getAttribute( 'id' ) );
            origCkeditorContentMap[reqDomEle.id] = reqDomEle.outerHTML;
            var viewFragment = editor.data.processor.toView( reqDomEle.outerHTML );
            viewFragment = editor.data.toModel( viewFragment );

            editor.model.insertContent( viewFragment, writer.createPositionAt( editorRoot, editorRoot.getChildIndex( placeHolderEle ) ) );
            writer.remove( placeHolderEle );
        }
        deferred.resolve();
    } );
  }

 var _replaceGivenObjectPlaceHolderWithContent = function( loadingElementsTobeRemoved, domElementContainerTobeInserted, editor ) {
     var deferred = AwPromiseService.instance.defer();
     var viewFragment = editor.data.processor.toView( domElementContainerTobeInserted.innerHTML );
     viewFragment = editor.data.toModel( viewFragment );
     editor.model.enqueueChange( 'transparent', writer => {
         var editorRoot = editor.model.document.getRoot();
         editor.model.insertContent( viewFragment, writer.createPositionAt( editorRoot, editorRoot.getChildIndex( loadingElementsTobeRemoved[0] ) ) );
         for ( const loadingModelelement of loadingElementsTobeRemoved ) {
             writer.remove( loadingModelelement );
         }
         deferred.resolve();
     } );
     return deferred.promise;
 };

export let replacePlaceHolderObjectWithCreated = function( id, placeHolderObjectUid, createdObjContent ) {
    if (  appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;

        let reqModelElement = getCKEditorModelElementByUID( placeHolderObjectUid );

        var tempContainerElement = document.createElement( 'div' );
        tempContainerElement.innerHTML = createdObjContent;
        var srUid = tempContainerElement.children[0].id;

        origCkeditorContentMap[srUid] = tempContainerElement.outerHTML; // Need To check
        _replaceGivenObjectPlaceHolderWithContent( [ reqModelElement ], tempContainerElement, editor );
    }
};

 /**
  * Get List of ckeditor model objects from given uids (array)
  * @param {Array} uids - array
  * @param {Object} editor - editor instance
  * @returns {Array} -
  */
  export let getCKEditorModelElementsByUIDs = function( uids ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        var root = editor.model.document.getRoot();
        return Array.from( root._children._nodes ).filter( function( node ) { return uids.includes( node.getAttribute( 'id' ) ); } );
    }
    return [];
 };

 /**
  * Get Ckeditor model object from given uid
  * @param {String} uid -
  * @param {Object} editor - editor instance
  * @returns {Object} -
  */
  export let getCKEditorModelElementByUID = function( uid ) {
     var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
     var root = editor.model.document.getRoot();
     return Array.from( root._children._nodes ).find( node => node.getAttribute( 'id' ) === uid );
 };

 export let getIdFromCkeModelElement = function( ckeelement ) {
     return ckeelement.getAttribute( 'id' );
 };

/**
 * Set data in ckeditor 5
 *
 *  @param {String} content - context object
 *  @param {Object} ctx - context object
 */
var _setCkeditorData = function( content, ctx ) {
    eventBus.publish( 'progress.start' );
    appCtxSvc.updateCtx( 'requirementEditorSetData', true );
    ctx.AWRequirementsEditor.editor.setData( content );
    exports.resetUndo( ctx.AWRequirementsEditor.id, ctx );
    appCtxSvc.updateCtx( 'requirementEditorSetData', false );
    eventBus.publish( 'progress.end' );
};

/**
 * Update original content map
 *
 *  @param {Object} htmlContent - html Content
 */
export let updateOriginalContentsMap = function( reqContent ) {
    var origHtmlReq = reqContent.html;
    var contentElement = document.createElement( 'div' );
    contentElement.innerHTML = origHtmlReq;

    _setOriginalReqHtml( origHtmlReq );
};

/**
 * Set CKEditor Content.
 *
 * @param {String} id - CKEditor ID
 * @param {String} content - content to set in CK Editor
 * @param {Object} ctx - context object
 * @return {String} Return when content gets loaded in ckeditor
 */
export let setCKEditorContentAsync = function( id, content, ctx ) {
    var deferred = AwPromiseService.instance.defer();
    if( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        appCtxSvc.registerCtx( 'requirementEditorSetData', false );

        eventBus.publish( 'progress.start' );
        appCtxSvc.updateCtx( 'requirementEditorSetData', true );
        ctx.AWRequirementsEditor.editor.data.on( 'set', () => {
            deferred.resolve();
        } );
        ctx.AWRequirementsEditor.editor.setData( content );
        exports.resetUndo( ctx.AWRequirementsEditor.id, ctx );
        appCtxSvc.updateCtx( 'requirementEditorSetData', false );
        eventBus.publish( 'progress.end' );

        eventBus.publish( 'ckeditor.postLoadSubscription' );

        origCkeditorContentMap = {};
        _setOriginalReqHtml( content );
    } else {
        deferred.reject();
    }
    return deferred.promise;
};

/**
 * Get CKEditor Content.
 *
 * @param {String} id - CKEditor ID
 * @return content of CKEditor
 */
export let getCKEditorContent = function( id, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor && appCtxSvc.ctx.AWRequirementsEditor.editor.getData ) {
        // whenever editor content is empty, an empty string will be returned without outer divs, with default trim:'empty'
        return appCtxSvc.ctx.AWRequirementsEditor.editor.getData( { trim: 'none' } );
    }
};

/**
 * Check CKEditor content changed / Dirty.
 *
 * @param {String} id - CKEditor ID
 * @param {Object} ctx - context object
 * @return {Boolean} isDirty
 *
 */
export let checkCKEditorDirty = function( id, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor && appCtxSvc.ctx.AWRequirementsEditor.editor.checkDirty ) {
        return appCtxSvc.ctx.AWRequirementsEditor.editor.checkDirty();
    }
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor &&
        ( appCtxSvc.ctx.Arm0SingleRequirementWidePanelEditorActive || appCtxSvc.ctx.isRMDocumentationTabActive ) ) {
        return dirtyFlagforCk5;
    }
    // TODO
    return true;
};

/**
 * Set the CKEditor content changed / Dirty.
 *
 * @param {String} id - CKEditor ID
 * @param {Object} ctx - context object
 * @param {String} flagForClose - dirty flag
 */
export let setCkeditorDirtyFlag = function( id, ctx, flagForClose ) {
    if( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        ctx.AWRequirementsEditor.editor.model.document.on( 'change:data', ( eventInfo, batch ) => {
            if( ctx && !ctx.requirementEditorSetData && !appCtxSvc.ctx.AWRequirementsEditor.editor.ignoreDataChangeEvent ) {
                ctx.AWRequirementsEditor.dirtyFlagforCkEditor = true;
                dirtyFlagforCk5 = true;
            }
        } );
    }
    if( flagForClose === 'close' && ctx.AWRequirementsEditor ) {
        dirtyFlagforCk5 = false;
        ctx.AWRequirementsEditor.dirtyFlagforCkEditor = false;
    }
};

/**
 * Method to set thechange evenet listner on all markers.
 * @param {Marker} marker the marker on which event to be added
 */
export let setMarkerChangeEveneListener = function( marker ) {
    if( marker ) {
        marker.on( 'change:range', function( eventInfo, oldRange, data ) {
            var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
            var editor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
            if( data.deletionPosition ) {
                var deletedPath = data.deletionPosition.path;
                var liveRangePath = oldRange.start.path;
                var isEqual = isEqualPath( deletedPath, liveRangePath );
                var isDeleted = isPathDeleted( deletedPath, liveRangePath );
                if( isEqual || isDeleted ) {
                    var marker = getCommentMarker( eventInfo );
                    var markup = markupViewModel.getMarkupFromId( marker.name );
                    markupViewModel.deleteMarkup( markup, true );
                    markupService.updateMarkupList( true );
                    updateDeletedCommentsMap( marker.name, markup );
                    editor.model.change( ( writer ) => {
                        try {
                            writer.removeMarker( marker );
                        } catch ( error ) {
                            //do nothihing. marker not present
                        }
                    } );
                }
            } else {
                var marker = getCommentMarker( eventInfo );
                var start = marker._liveRange.start.path;
                var end = marker._liveRange.end.path;
                var isEqual = isEqualPath( start, end );
                if( isEqual ) {
                    var markup = markupViewModel.getMarkupFromId( marker.name );
                    markupViewModel.deleteMarkup( markup, true );
                    markupService.updateMarkupList( true );
                    updateDeletedCommentsMap( marker.name, markup );
                    editor.model.change( ( writer ) => {
                        try {
                            writer.removeMarker( marker );
                        } catch ( error ) {
                            //do nothihing. marker not present
                        }
                    } );
                }
            }
        } );
    }
};

/**
 * Method to add entry in deleted markups map
 * @param {String} id the is of the markup
 * @param {Object} markup the markup oject
 */
function updateDeletedCommentsMap( id, markup ) {
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( markupCtx && markupCtx.deletedMarkups ) {
        appCtxSvc.ctx.reqMarkupCtx.deletedMarkups.set( id, markup );
    } else if( markupCtx && !markupCtx.deletedMarkups ) {
        var deletedMarkpsMap = new Map();
        deletedMarkpsMap.set( id, markup );
        appCtxSvc.ctx.reqMarkupCtx.deletedMarkups = deletedMarkpsMap;
    }
}

/**
 * Method to get Marker from eventInfo
 */
function getCommentMarker( eventInfo ) {
    var paths = eventInfo.path;
    for( var i = 0; i < paths.length; i++ ) {
        var path = paths[ i ];
        if( path.name && path.name.startsWith( 'RM::Markup' ) ) {
            return path;
        }
    }
}

/**
 * Insert image tag with given info
 *
 * @param {Object} id - ckeditor id
 * @param {Object} imageURL - image url
 * @param {Object} img_id - image id
 *
 */
export let insertImage = function( id, imageURL, img_id, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        const content = '<img src=' + imageURL + ' id=' + img_id + ' alt="" />';
        const viewFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.processor.toView( content );
        const modelFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.toModel( viewFragment );
        appCtxSvc.ctx.AWRequirementsEditor.editor.model.insertContent( modelFragment );
    }
};

/**
 * Insert ole with given info
 *
 * @param {Object} id - ckeditor id
 * @param {Object} ole_id - ole_id
 * @param {Object} thumbnailURL - thumbnailURL
 * @param {Object} fileName - fileName
 * @param {Object} type - type
 * @param {Object} ctx - context
 *
 */
export let insertOLE = function( id, ole_id, thumbnailURL, fileName, type, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        appCtxSvc.ctx.AWRequirementsEditor.editor.model.change( writer => {
            const oleImage = writer.createElement( 'oleimage', {
                src: thumbnailURL,
                datasettype: type,
                style: 'width:48px;height:48px;cursor:pointer;margin-top:10px;margin:0px;',
                oleid: ole_id,
                alt: ''
            } );

            const content = '<span>' + fileName + '</span>';
            const viewFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.processor.toView( content );
            const modelFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.toModel( viewFragment );

            writer.insert( oleImage, writer.createPositionAt( modelFragment.getChild( 0 ), 0 ) );

            appCtxSvc.ctx.AWRequirementsEditor.editor.model.insertContent( modelFragment, appCtxSvc.ctx.AWRequirementsEditor.editor.model.document.selection );
        } );
    }
};

/**
 * Set the content scroll event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} scrollHandler - function to handel the scroll event
 */
 export let setScrollEventForViewPort = function( id, scrollHandler ) {
    var editorContainer = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' )[ 0 ];
    editorContainer = editorContainer.getElementsByClassName( 'ck-content' )[0];
    editorContainer.addEventListener( 'scroll', scrollHandler );
};

export let removeScrollEventForViewPort = function( id, scrollHandler ) {
    var editorContainer = document.getElementsByClassName( 'aw-richtexteditor-editorPanel' )[ 0 ];
    editorContainer = editorContainer.getElementsByClassName( 'ck-content' )[0];
    editorContainer.removeEventListener( 'scroll', scrollHandler );
};

/**
 * Set the content change event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} clickHandler - function to handel the click event
 * @param {Object} ctx - context object
 */
export let setCkeditorChangeHandler = function( id, clickHandler, ctx ) {
    if( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        // Listening the comment thread deletion events
        ctx.AWRequirementsEditor.editor.model.document.on( 'change', ( eventInfo, batch ) => {
            if( appCtxSvc && appCtxSvc.ctx && !appCtxSvc.ctx.requirementEditorSetData && !appCtxSvc.ctx.AWRequirementsEditor.editor.ignoreDataChangeEvent
                && eventInfo.source && eventInfo.source.differ && eventInfo.source.differ._changedMarkers ) {
                for ( let [ key, value ] of eventInfo.source.differ._changedMarkers.entries() ) {
                    if( key.indexOf( 'comment:' ) >= 0 && !value.newRange && !appCtxSvc.ctx.requirementEditorContentChanged ) {
                        appCtxSvc.updateCtx( 'requirementEditorContentChanged', true );
                    }
                }
            }
        } );

        ctx.AWRequirementsEditor.editor.model.document.on( 'change:data', ( eventInfo, batch ) => {
            if( appCtxSvc && appCtxSvc.ctx && !appCtxSvc.ctx.requirementEditorSetData && !appCtxSvc.ctx.AWRequirementsEditor.editor.ignoreDataChangeEvent && batch.type !== 'transparent' ) {
                var isDataChange = true;
                if( eventInfo.path && eventInfo.path[ 0 ] && eventInfo.path[ 0 ].differ && eventInfo.path[ 0 ].differ._changesInElement ) {
                    var reqNode = null;
                    for( let [ key ] of eventInfo.path[ 0 ].differ._changesInElement.entries() ) {
                        //check for Marker change like tracelink create and delete
                        if( key.name === 'requirementMarker' ) {
                            isDataChange = false;
                            break;
                        }
                        // Find changed requirement and mark as dirty
                        if( !reqNode ) {
                            reqNode = getRequirementNode( key );
                            if( !reqNode ) {
                                // See if imidate Child is lov property
                                reqNode = getChildLovPropElement( key );
                            }
                        }
                    }
                    // Below code block listens the document marker change
                    if( !reqNode ) {
                        for ( let [ key, value ] of eventInfo.path[0].differ._changedMarkers.entries() ) {
                            if ( !value.oldRange && value.newRange && key.indexOf( 'mention' ) < 0 && key.indexOf( 'comment' ) < 0 ) {
                                var clonedKey = _.cloneDeep( key );
                                var markerNameArray = clonedKey.split( ':' );
                                var modelBodyTextElement = null;
                                var trackChangesMap = markupViewModel.getTrackChangesMap();
                                if ( trackChangesMap.has( markerNameArray[markerNameArray.length - 2] ) ) {
                                        modelBodyTextElement = value.newRange.getCommonAncestor();
                                    reqNode = getRequirementNode( modelBodyTextElement );
                                }
                            }else if( value.oldRange && value.newRange ) {
                                var isDataChange = false;
                            }
                        }
                    }
                }
                if( reqNode && !contentUpdatedForPropertyUpdate && reqNode.getAttribute( 'isDirty' ) !== true ) {
                    ctx.AWRequirementsEditor.editor.model.change( writer => {
                        try {
                            writer.setAttribute( 'isDirty', true, reqNode );
                        } catch ( error ) {
                            //
                        }
                    } );
                }
                undoCommentsIfAny( eventInfo, ctx.AWRequirementsEditor.editor );
            }
            contentUpdatedForPropertyUpdate = false;

            if( isDataChange ) {
                clickHandler( eventInfo );
            }
        } );
    }
};

/**
 * Methdod to undo the deletedd comments
 * @param {Object} eventInfo the model change event infon
 * @param {CKEDITOR} editor the ckedtor instance
 */
function undoCommentsIfAny( eventInfo, editor ) {
    var markupCtx = appCtxSvc.getCtx( 'reqMarkupCtx' );
    if( markupCtx && markupCtx.deletedMarkups && markupCtx.deletedMarkups.size > 0 ) {
        var undoMarkupsPaths = new Map();
        var changes = eventInfo.path && eventInfo.path[ 0 ].differ.getChanges();
        for( var i = 0; i < changes.length; i++ ) {
            var change = changes[ i ];
            if( change && change.type === 'insert' ) {
                var position = change.position;
                var parent = position.parent;
                if( parent ) {
                    createPathForUndoComments( parent, markupCtx.deletedMarkups, editor, undoMarkupsPaths );
                }
            }
        }
        if( undoMarkupsPaths.size > 0 ) {
            undoComments( markupCtx.deletedMarkups, undoMarkupsPaths, editor );
        }
    }
}

/**
 * Methdod to create path for deleted comments
 * @param {ModelElement} parent the parent of the inserted element in undo operation
 * @param {Map} deletedComments the map of deleted comments
 * @param {CKEDITOR} editor the ckedtor instance
 * @param {Map} undoMarkupsPaths the map to store start and end path of undo markups
 */
function createPathForUndoComments( parent, deletedComments, editor, undoMarkupsPaths ) {
    if( parent && parent._children ) {
        var children = parent._children._nodes;
        if( children ) {
            for( var i = 0; i < children.length; i++ ) {
                var child = children[ i ];
                createPathForUndoComments( child, deletedComments, editor, undoMarkupsPaths );
                var spanId = child._attrs.get( 'spanId' );
                if( spanId ) {
                    var values = spanId.split( ',' );
                    for( var j = 0; j < values.length; j++ ) {
                        var id = values[ j ];
                        if( id ) {
                            var deletedmarkup = deletedComments.get( id );
                            if( deletedmarkup ) {
                                var startPath = child.getPath();
                                var markupData = {};
                                var endPath = _.cloneDeep( startPath );
                                if( !undoMarkupsPaths.has( id ) ) {
                                    endPath[ endPath.length - 1 ] = child.endOffset;
                                    markupData.start = startPath;
                                    markupData.end = endPath;
                                    undoMarkupsPaths.set( id, markupData );
                                } else {
                                    endPath = child.getPath();
                                    endPath[ endPath.length - 1 ] = child.endOffset;
                                    markupData = undoMarkupsPaths.get( id );
                                    markupData.end = endPath;
                                    undoMarkupsPaths.set( id, markupData );
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Method to undo the command and add marker to editor
 * @param {Map} deletedComments the map of deleted comments
 * @param {Map} undoMarkupsPath the map to store start and end path of undo markups
 * @param {CKEDITOR} editor the ckedtor instance
 */
function undoComments( deletedComments, undoMarkupsPath, editor ) {
    const doc = editor.model.document;
    const root = doc.getRoot();
    for( let [ key, value ] of undoMarkupsPath.entries() ) {
        editor.model.change( writer => {
            try {
                const startPos = writer.createPositionFromPath( root, value.start, 'toNext' );
                const endPos = writer.createPositionFromPath( root, value.end, 'toPrevious' );
                const currentRange = writer.createRange( startPos, endPos );
                var preRange = [];
                var postRange = [];
                var isEqualRange = getRangesForOverlappedAndNestedComments( editor, writer, key, currentRange, preRange, postRange );
                createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, key );
                const range = {};
                range.range = currentRange;
                range.usingOperation = false;
                if( !editor.model.markers._markers.get( key ) ) {
                    var marker = writer.addMarker( key, range );
                    setMarkerChangeEveneListener( marker );
                    if( !appCtxSvc.ctx.ckeditor5Markers ) {
                        appCtxSvc.ctx.ckeditor5Markers = [];
                    }
                    appCtxSvc.ctx.ckeditor5Markers.push( marker );
                }
                var markup = markupViewModel.getMarkupFromId( key );
                markupViewModel.undoDeleteMarkup( markup );
                markupService.updateMarkupList( true );
                deletedComments.delete( key );
            } catch ( error ) {
                console.error( 'error occurred while undo comments. Unable to create marker for ' + key );
            }
        } );
    }
}
/**
 * Get the instance of ckeditor for given id
 *
 * @param {String} id - CKEditor ID
 * @param {Object} ctx - context object
 * @return {Object} editor
 */
export let getCKEditorInstance = function( id, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        return appCtxSvc.ctx.AWRequirementsEditor.editor;
    }
};

/**
 * Return the element from ckeditor frame from given element id
 * @param {String} ckeditorId - Ckeditor id
 * @param {String} elementId - element id which needs to be searched in ckeditor
 * @returns {Object} - Dom element
 */
export let getElementById = function( ckeditorId, elementId ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === ckeditorId && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        //var requirementRoot = editor.model.document.getRoot();
        return document.getElementById( elementId );
    }
};

/**
 * Clear the highlighting of quality metric data
 * @param {String} id - ckeditor instance id
 * @param {Object} ctx - context object
 */
export let clearQualityHighlighting = function( id, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        //ctx.AWRequirementsEditor.editor.fire( 'clearHighlightInvalidMetricData' );
    }
};

/**
 * Get recalculate comment position
 *
 * @param {Object} reqBodyText - the added widgets
 */
var recalculateCommentPosition = function( eventInfo ) {
    var changes = eventInfo.source.model.document.differ.getChanges();
    if( changes && changes.length > 1 ) {
        var modelParentNode = changes[ 1 ].position && changes[ 1 ].position.parent;
        if( modelParentNode ) {
            getSpanWIthID( modelParentNode );
        }
    }
    //Recalculating logic will go here: TODO
};

/**
 * Change style for deleted markup
 *
 * @param {Object} reqBodyText - the added widgets
 */
var getSpanWIthID = function( parentNode, spanId ) {
    for( var i = 0; i < parentNode._children._nodes.length; i++ ) {
        var child = parentNode._children._nodes[ i ];
        if( child && child._children &&
            child._children._nodes && child._children._nodes.length > 0 ) {
            var childModel = getSpanWIthID( child, spanId );
            if( childModel ) {
                return childModel;
            }
        }
        if( child.getAttribute( 'spanId' ) === spanId ) {
            return child;
        }
    }
};

/**
 * Change style for deleted markup
 *
 * @param {Object} reqBodyText - the added widgets
 */
var getMarkerSpan = function( parentNode, markerSpanID ) {
    for( var i = 0; i < parentNode._children.length; i++ ) {
        var childern = parentNode._children[ i ];
        if( childern && childern._children && childern._children.length > 0 ) {
            var markerSpan = getMarkerSpan( childern, markerSpanID );
            if( markerSpan ) {
                return markerSpan;
            }
        }
        if( childern && childern.name && childern.name === 'span' ) {
            if( childern._attrs.get( 'id' ) === markerSpanID ) {
                return childern;
            }
        }
    }
};

function getRequirementElement( cSpan ) {
    var parent = cSpan.parentElement;
    while( parent ) {
        if( parent.classList.contains( 'requirement' ) ) {
            return parent;
        }
        parent = parent.parentElement;
    }
}

/**
 * Add created objects in list
 *
 * @param {Array} addedWidgets - the added widgets
 * @param {Array} createdInput - input created with the widgets
 */
var _addCreatedObjectsInList = function( addedWidgets, createdInput, editor ) {
    var isValid = true;
    var maxLength = 128;
    var pSelected = appCtxSvc.getCtx( 'pselected' );
    if( pSelected && pSelected.props && pSelected.props.awb0ArchetypeName && pSelected.props.awb0ArchetypeName.propertyDescriptor ) {
        maxLength = pSelected.props.awb0ArchetypeName.propertyDescriptor.maxLength;
    }
    for( var index = 0; index < addedWidgets.length; index++ ) {
         var widget = addedWidgets[ index ];
         var newElementId = widget.getAttribute( 'id' );
         var pId = widget.getAttribute( 'parentid' );
         var pType = widget.getAttribute( 'parenttype' );
         var sId = widget.getAttribute( 'siblingid' );
         var sType = widget.getAttribute( 'siblingtype' );
         var position = 1; //widget.getAttribute('position');

        var reqDomElement = document.createElement( 'div' );
        reqDomElement.innerHTML = editor.data.stringify( widget );  // Cke Model element to html string

        var widgetName = _getTitle( reqDomElement );
        widgetName = widgetName.slice( 0, maxLength );
        var widgetName_temp = reqUtils.correctCharactersInText( widgetName );
        // If newly added requirement is not valid (e.g. No title provided)
        if( widgetName_temp === '' ) {
            isValid = false;
            break;
        }

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
        var widgetName = _getTitle( reqDomElement );
        widgetName = widgetName.slice( 0, maxLength );

        var widgetType = widget.getAttribute( 'objectType' ) ? widget.getAttribute( 'objectType' ) : widget.getAttribute( 'objecttype' );

        var contentElement = _getRequirementContent( reqDomElement );
         // Get BodyText div and remove cke specific classes before saving
         if( contentElement ) {
             var bodyTextDiv = contentElement.getElementsByClassName( 'aw-requirement-bodytext' );
             if( bodyTextDiv.length > 0 ) {
                 reqUtils.removeCkeditorSpecificClasses( bodyTextDiv[ 0 ] );
             } //aw-requirement-properties
             var propertiesSpans = contentElement.getElementsByClassName( 'aw-requirement-properties' );
             for( var ii = 0; ii < propertiesSpans.length; ii++ ) {
                 reqUtils.removeCkeditorSpecificClasses( propertiesSpans[ ii ] );
             }
         }
         var widgetData;
         if( contentElement && contentElement.innerHTML ) {
             widgetData = contentElement.innerHTML;
         }

         if( widgetData ) {
             widgetData = widgetData.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor
         }

         // If contents of the created object is plain text, wrap it in p tag to make it as a html.
         widgetData = _wrapPlainContentsIntoP( widgetData );

         // encode special characters in html text
         //widgetData = _encodeBodyTextString( widgetData );

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
    return isValid;
 };

/**
 * Get requirementContent from dom element
 *
 * @param {Object} domElement - the added widgets
 */
var _getRequirementContent = function( domElement ) {
    var reqContentElement = domElement.getElementsByClassName( 'aw-requirement-content' );
    return reqContentElement ? reqContentElement[ 0 ] : null;
};
/**
 * Get bodytext from dom element
 *
 * @param {Object} domElement - the added widgets
 */
var _getBodyText = function( domElement ) {
    var reqContent = _getRequirementContent( domElement );
    var reqBodyText;
    if( reqContent ) {
        reqBodyText = reqContent.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
    }
    return reqBodyText;
};
/**
 * Get bodytext from dom element
 *
 * @param {Object} domElement - the added widgets
 */
var _getTitle = function( domElement ) {
    var reqHeader = domElement.getElementsByClassName( 'aw-requirement-header' )[ 0 ];
    var reqTitle = '';
    if( reqHeader && reqHeader.getElementsByClassName( 'aw-requirement-title' )[ 0 ] ) {
        reqTitle = reqHeader.getElementsByClassName( 'aw-requirement-title' )[ 0 ].innerText;
    } else if( reqHeader && reqHeader.getElementsByClassName( 'aw-requirement-properties' )[ 0 ] ) {
        reqTitle = reqHeader.getElementsByClassName( 'aw-requirement-properties' )[ 0 ].innerText;
    }else if( domElement.getAttribute( 'objecttype' ) === 'RequirementSpec' ) {
        reqTitle = reqHeader.getElementsByClassName( 'aw-requirement-headerId' )[0].innerText;
    }
    return reqTitle;
};

/**
 * Get property value from dom element
 *
 * @param {Object} domElement - Dom Element
 */
var _getPropertyValueFromRequirementElement = function( domElement, propertyInternalName ) {
    var propValue = null;
    var contentDiv = domElement.getElementsByClassName( 'aw-requirement-content' );
    if( contentDiv.length > 0 ) {
        var reqProperties = contentDiv[ 0 ].getElementsByClassName( 'aw-requirement-properties' );
        for( let index = 0; index < reqProperties.length; index++ ) {
            const propEle = reqProperties[ index ];
            if( propEle.getAttribute( 'internalname' ) === propertyInternalName ) {
                propValue = propEle.innerText;
                break;
            }
        }
    }
    return propValue;
};

/**
 * Get html from bodytext element
 *
 * @param {Object} reqBodyText - the added widgets
 */
var _getBodyTextHtml = function( reqBodyText ) {
    var reqHtml = reqBodyText.innerHTML;
    reqHtml = '<div class="aw-requirement-bodytext">' + reqHtml + '</div>';
    return reqHtml;
};
/**
 * Gets all the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param frame The frame element.
 * @param id The editor instance ID.
 * @return The editor data.
 */
export let getAllWidgetData = function( id, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var addedWidgets = [];
    var documentData = editor.getData();
    var doc = document.createElement( 'div' );
    doc.innerHTML = documentData;
    var widgets = doc.getElementsByClassName( 'requirement' );
    for( var index = 0; index < widgets.length; index++ ) {
        var domElement = widgets[ index ];
        addedWidgets.push( domElement );
    }
    var allObjects = [];
    // Add created objects in list
    for( var index = 0; index < addedWidgets.length; index++ ) {
        var widget = addedWidgets[ index ];
        var newElementId = widget.id;
        var pId = widget.getAttribute( 'parentId' );
        var parentId = null;
        parentId = pId;
        var widgetName = _getTitle( widget );
        widgetName = widgetName.trim();
        var widgetName_temp = reqUtils.correctCharactersInText( widgetName );
        // If newly added requirement is not valid (e.g. No title provided)
        if( widgetName_temp === '' ) {
            return null;
        }
        var widgetType = widget.getAttribute( 'objectType' );
        var widgetData = _getBodyTextHtml( _getBodyText( widget ) );
        widgetData = widgetData.replace( /\n/g, '' ); //Remove newline chars, added by ckeditor
        allObjects.push( {
            elementID: newElementId,
            name: widgetName_temp,
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
 * Gets the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param {String} id The editor instance ID.
 * @param {Object} ctx - context object
 * @returns {Object} The widgets to be saved
 */
export let getWidePanelWidgetData = function( id, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var updatedInput = [];
    var documentData = editor.getData();
    var doc = document.createElement( 'div' );
    doc.innerHTML = documentData;
    var allwidgets = doc.getElementsByClassName( 'requirement' );
    for( var index = 0; index < allwidgets.length; index++ ) {
        var domElement = allwidgets[ index ];
        var idAttribute = domElement.getAttribute( 'id' );
        var obj = appCtxSvc.getCtx( 'selected' );
        idAttribute = obj.uid;
        var isContentDirty = false;
        var rContent = '';
        var reqContentEle = _getRequirementContent( domElement );
        if( reqContentEle && reqContentEle.innerHTML ) {
            var reqContentHtml = reqContentEle.innerHTML;
        }
        if( reqContentHtml ) {
            isContentDirty = true;
            // Get BodyText div and remove cke specific classes before saving
            var bodyTextDiv = reqContentEle.getElementsByClassName( 'aw-requirement-bodytext' );
            if( bodyTextDiv.length > 0 ) {
                reqUtils.removeCkeditorSpecificClasses( bodyTextDiv[ 0 ] );
            }
            rContent = reqContentEle.innerHTML;
        }

        if( isContentDirty ) {
            updatedInput.push( {
                uid: idAttribute,
                contents: rContent
            } );
        }
    }

    return {
        setContentInput: updatedInput,
        createInput: []
    };
};

export let getOccurenceIDforRevision = function( revId ) {
    return revisionIDVsOccurenceID[revId];
};

 /**
 *
 * @param {Object} editor
 * @returns
 */
function getDirtyReqCkeModelElements( editor ) {
    var root = editor.model.document.getRoot();
    var dirtyRequirements = [];
    Array.from( root._children._nodes ).filter( function( node ) {
        if( node.name !== 'loading' ) {
            var uid = node.getAttribute( 'id' );
            var revId = node.getAttribute( 'revisionid' );
            revisionIDVsOccurenceID[revId] = uid;
            if( uid.startsWith( 'RM::NEW::' ) ) {
                dirtyRequirements.push( node );
            }else {
                const rangeReq = editor.model.createRangeIn( node );
                for( var item of rangeReq.getItems() ) {
                    if( item.name && ( item.name === 'requirementHeader' || item.name === 'requirementBodyText' || item.name === 'requirementProperty' || item.name === 'requirementLovProperty' ) && ( item.getAttribute( 'isDirty' ) === 'true' || item.getAttribute( 'isDirty' ) === true ) ) {
                        dirtyRequirements.push( node );
                        break;
                    }
                }
            }
        }
     } );
     return dirtyRequirements;
}

/**
 * Gets the editor data. The data will be in raw format. It is the same data that is posted by the editor.
 *
 * @param {String} id The editor instance ID.
 * @param {Object} ctx - context object
 * @returns {Object} The widgets to be saved
 */
// eslint-disable-next-line complexity
export let getWidgetData = function( id, ctx, viewModelData ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var updatedInput = [];
    var addedWidgets = [];
    _removeDirtyMarkers( editor, viewModelData );
    var dirtyRequirements = getDirtyReqCkeModelElements( editor );


    for( var index = 0; index < dirtyRequirements.length; index++ ) {
        var dirtyReqModelElement = dirtyRequirements[ index ];
        var idAttribute = dirtyReqModelElement.getAttribute( 'id' );

        if( idAttribute && !idAttribute.startsWith( 'RM::NEW::' ) ) {
            var isContentDirty = false;
            var isHeaderDirty = false;
            var data = '';
            var rContent = '';
            var updatedHeader = '';

            var reqDomElement = document.createElement( 'div' );
            reqDomElement.innerHTML = editor.data.stringify( dirtyReqModelElement );  // Cke Model element to html string
            var reqContentEle = _getRequirementContent( reqDomElement );
            var bodyTextDiv;
            if( reqContentEle ) {
                bodyTextDiv = reqContentEle.getElementsByClassName( 'aw-requirement-bodytext' );
                if( isNonEditableRequirement( bodyTextDiv, viewModelData ) ) {
                    continue;
                }
            }
            if( reqContentEle && ( !bodyTextDiv || bodyTextDiv.length === 0 ) ) {
                bodyTextDiv = reqContentEle.getElementsByClassName( 'aw-requirement-bodytext' );
            }
            if( bodyTextDiv && bodyTextDiv.length > 0 && bodyTextDiv[ 0 ].getAttribute( 'isDirty' ) === 'true' ) {
                isContentDirty = true;
                // Get BodyText div and remove cke specific classes before saving
                reqUtils.removeCkeditorSpecificClasses( bodyTextDiv[ 0 ] );
                rContent = bodyTextDiv[ 0 ].outerHTML;
            }

            // get all updated properties if any
            var propContents = getAllUpdatedProperties( reqContentEle );
            if( propContents !== '' ) {
                isContentDirty = true;
                rContent += propContents;
                _UpdateCtxToRefreshOccurrances( idAttribute );
            }

            var reqHeader = reqDomElement.getElementsByClassName( 'aw-requirement-header' );
            if( reqHeader && reqHeader.length > 0 && reqHeader[ 0 ].getAttribute( 'isDirty' ) === 'true' ) {
                isHeaderDirty = true;

                var headerData = reqHeader[ 0 ].getElementsByClassName( 'aw-requirement-properties' )[ 0 ];
                if( headerData ) {
                    headerData.classList.remove( 'cke_widget_editable_focused' );
                    updatedHeader = '<p>' + headerData.outerHTML + '</p>';
                }
                var widgetName = _getTitle( reqDomElement );
                var widgetName_temp = reqUtils.correctCharactersInText( widgetName );
                // If requirement is not valid (e.g. No title provided)
                if( widgetName_temp === '' ) {
                    return null;
                }
                // Add uid in ctx to refresh the object in tree after save
                _UpdateCtxToRefreshOccurrances( idAttribute );
            }

            if( !isContentDirty && isHeaderDirty ) {
                data = updatedHeader;
            } else if( isContentDirty && !isHeaderDirty ) {
                data = rContent;
            } else if( isContentDirty && isHeaderDirty ) {
                data = updatedHeader + rContent;
            }

            if( isHeaderDirty || isContentDirty ) {
                updatedInput.push( {
                    uid: idAttribute,
                    contents: data
                } );
            }
        } else {
            //newly created requirements
            addedWidgets.push( dirtyReqModelElement );
        }
    }

    var createdInput = [];
    var isValidObjects = _addCreatedObjectsInList( addedWidgets, createdInput, editor );
    if( !isValidObjects ) {
        return null;
    }

    return {
        setContentInput: updatedInput,
        createInput: createdInput
    };
};

/**
 * Return array of updated properties from given requirement content element
 * @param {Object} reqContentEle - Dom element
 * @return {Object} Array of properties elements
 */
function getAllUpdatedProperties( reqContentEle ) {
    var props = '';
    var properties = reqContentEle.getElementsByClassName( 'aw-requirement-properties' );
    _.forEach( properties, function( property ) {
        if( property.getAttribute( 'isDirty' ) === 'true' ) {
            props += property.outerHTML;
        }
    } );
    var lovProperties = reqContentEle.getElementsByClassName( 'aw-requirement-lovProperties' );
    _.forEach( lovProperties, function( property ) {
        if( property.getAttribute( 'isDirty' ) === 'true' ) {
            props += property.outerHTML;
        }
    } );
    return props;
}

/**
 * Method to check whether requirement in non editable
 */
function isNonEditableRequirement( bodyTextDiv, viewModelData ) {
    if( bodyTextDiv && bodyTextDiv.length > 0 && viewModelData && viewModelData.i18n ) {
        var title = bodyTextDiv[ 0 ].getAttribute( 'title' );
        var nonEditableMsg = viewModelData.i18n.readOnlyReqCanNotBeEdited;
        if( title === nonEditableMsg && bodyTextDiv[ 0 ].getAttribute( 'contenttype' ) === 'READONLY' ) {
            return true;
        }
    }
    return false;
}
/**
 * Update the ctx with given uid
 *
 * @param {String} uid - model object uid
 */
 var _UpdateCtxToRefreshOccurrances = function( uid ) {
    var updatedHeaderUids = appCtxSvc.getCtx( 'arm0ReqDocACEUpdatedHeaderOccUids' );
    if( !updatedHeaderUids ) {
        updatedHeaderUids = [ uid ];
        appCtxSvc.updatePartialCtx( 'arm0ReqDocACEUpdatedHeaderOccUids', updatedHeaderUids );
    } else if( !updatedHeaderUids.includes( uid ) ) {
        updatedHeaderUids.push( uid );
        appCtxSvc.updatePartialCtx( 'arm0ReqDocACEUpdatedHeaderOccUids', updatedHeaderUids );
    }
 };

/**
 * Set the content undo event handler
 *
 * @param {String} id - CKEditor ID
 * @param {String} undoHandler - function to handel the undo event
 * @param {object} ctx - context object
 */
export let setCkeditorUndoHandler = function( id, undoHandler, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        const undoCommand = appCtxSvc.ctx.AWRequirementsEditor.editor.commands.get( 'undo' );
        const redoCommand = appCtxSvc.ctx.AWRequirementsEditor.editor.commands.get( 'redo' );

        undoCommand.on( 'execute', eventInfo => {
            // handle before undo
            undoHandler();
        } );

        redoCommand.on( 'execute', eventInfo => {
            // handle before redo
            undoHandler();
        } );
    }
};

/**
 * Scroll ckeditor content to given object element.
 *
 * @param {String} id - CKEditor ID
 * @param {String} objectUid - object uid
 * @param {object} isPagingEnabled - is Paging Enabled
 */
export let scrollCKEditorToGivenObject = function( id, objectUid, isPagingEnabled ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        var ckEditor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        if( objectUid.length === 1 ) { // No pagination in case of multi-select
            // Find Requirement model object
            var element = _getWidgetFromUid( ckEditor, objectUid[ 0 ] );
            if( !element ) {
                var loadingObj = document.getElementById( objectUid );
                if( loadingObj && loadingObj.tagName === 'LOADING' ) {
                    loadingObj.scrollIntoView();    // If obj not loaded yet, scroll to that so it will get loaded
                    return;
                }
            }
            if( element ) {
                eventBus.publish( 'ckeditor.handleSelectionChange', {
                    objectUid: objectUid
                } );
            } else if( isPagingEnabled ) {
                 eventBus.publish( 'requirementDocumentation.handleLoadSelectedObjectContentFromServer' );
            }
        } else {
            eventBus.publish( 'ckeditor.handleSelectionChange', {
                objectUid: objectUid
            } );
        }
    }
};

/**
 * Reset ckeditor's undo state
 *
 * @param {String} id - CKEditor ID
 * @param {object} ctx - context object
 */
export let resetUndo = function( id, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        var ckEditor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        var undocmd = ckEditor.commands.get( 'undo' );
        undocmd.clearStack();
        undocmd.refresh();
    }
};

/**
 * Check if given object is visible in ckeditor
 *
 * @param {String} id The editor instance ID.
 * @param {String} objId model object uid.
 * @param {object} ctx - context object
 * @return {boolean} true, if object with given uid is visible in editor.
 */
export let isObjectVisibleInEditor = function( id, objId, ctx ) {
    if( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        if( origCkeditorContentMap[ objId ] ) {
            return true;
        }
    }
    return false;
};

/**
 * Return Model element which needs to be updated for pargraph number
 *
 * @param {Object} ckeditorModelEle Ckeditor model element.
 * @param {String} updatedParaNumber - updated paragraph number
 * @return {Object} - property element
 */
 export let getElementForUpdatedParaNumberProp = function( ckeditorModelEle, updatedParaNumber ) {
     var reqNamePrefixToBeUpdated;
    if ( ckeditorModelEle ) {
        var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        const rangeReq = editor.model.createRangeIn( ckeditorModelEle );
        for( var item of rangeReq.getItems() ) {
            if( item.name && item.name === 'requirementHeader' ) {
                var headerPrefix = item.getAttribute( 'requirementNamePrefix' );
                var arm1ParaNumber = headerPrefix.split( ' ' )[0];
                var requirementNamePrefix = headerPrefix.split( ' ' )[1];
                if( arm1ParaNumber !== updatedParaNumber ) {
                    reqNamePrefixToBeUpdated =  {
                        item: item,
                        prop: 'requirementNamePrefix',
                        value: updatedParaNumber + ' ' + requirementNamePrefix
                    };
                }
                break;
            }
        }
    }
    return reqNamePrefixToBeUpdated;
 };

/**
 * Get all properties for given object
 *
 * @param {Object} ckeditorModelEle Ckeditor model element.
 * @return {Array} - array of properties
 */
 export let getPropertiesFromEditor = function( ckeditorModelEle ) {
    var props = [];
    if ( ckeditorModelEle ) {
        props.push( { name: 'revisionid', value: ckeditorModelEle.getAttribute( 'revisionid' ) } );
        var headerElement = ckeditorModelEle._children._nodes[1];
        var headerPrefix = headerElement.getAttribute( 'requirementNamePrefix' );
        props.push( { name: 'arm1ParaNumber', value: headerPrefix.split( ' ' )[0] } );
        props.push( { name: 'requirementNamePrefix', value: headerPrefix.split( ' ' )[1] } );
        if( headerElement._children && headerElement._children.length > 0 ) {
            props.push( { name: 'object_name', value: headerElement._children._nodes[0].data } );
        }

        var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        const rangeReq = editor.model.createRangeIn( ckeditorModelEle );
        for( var item of rangeReq.getItems() ) {
            if( item.name && item.name === 'requirementProperty' ) {
                    var prop = {
                        name: item.getAttribute( 'internalname' ),
                        value: item._children._nodes[0].data
                    };
                    props.push( prop );
            }
        }
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
export let updateObjectProperties_old = function( id, objId, updatedProperties, data ) {
    // TODO

    var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
    // Find Requirement model object
    var reqObject = _getWidgetFromUid( editor, objId );
    if( !reqObject ) {
        return;
    }
    if( updatedProperties.date_released ) {
        var element = document.getElementById( objId );
        if( element ) {
            var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
            reqBodyText.setAttribute( 'contenteditable', 'FALSE' );
            reqBodyText.setAttribute( 'contentType', 'READONLY' );
            reqACEUtils.setReadOnlyForRequirement( data, element, true );
            var properties = element.getElementsByClassName( 'aw-requirement-properties' );
            if( properties ) {
                _.forEach( properties, function( property ) {
                    property.setAttribute( 'contenteditable', 'FALSE' );
                } );
            }
            var lovProperties = element.getElementsByClassName( 'aw-requirement-lovProperties' );
            if( lovProperties ) {
                _.forEach( lovProperties, function( lovproperty ) {
                    var selectEle = lovproperty.getElementsByTagName( 'select' );
                    if( selectEle && selectEle.length > 0 ) {
                        var select = selectEle[ 0 ];
                        var selectedValue = select.value;
                        lovproperty.innerHTML = selectedValue;
                    }
                    lovproperty.setAttribute( 'class', 'aw-requirement-properties' );
                    lovproperty.setAttribute( 'contenteditable', 'FALSE' );
                } );
            }
            replaceRequirement( editor, reqObject, element.outerHTML );
        }
    } else {
        var requirementDiv = document.createElement( 'div' );
        requirementDiv.innerHTML = origCkeditorContentMap[ objId ];
        const rangeReq = editor.model.createRangeIn( reqObject );
        for( var item of rangeReq.getItems() ) {
            // Update Object title in header
            if( updatedProperties.object_name && item.name && item.name === 'requirementHeader' ) {
                var originalTitle = _getTitle( requirementDiv );
                if( originalTitle !== updatedProperties.object_name ) {
                    _updateHeaderTitle( editor, item, updatedProperties.object_name );
                }
            } else if( item.name && item.name === 'requirementProperty' && updatedProperties[ item.getAttribute( 'internalname' ) ] && _getPropertyValueFromRequirementElement( requirementDiv, item
                    .getAttribute(
                        'internalname' ) ) !== updatedProperties[ item.getAttribute( 'internalname' ) ] ) {
                // Update object property
                updateTextValueInNode( editor, item, updatedProperties[ item.getAttribute( 'internalname' ) ] );
            } else if( item.name && item.name === 'requirementLovProperty' && updatedProperties[ item.getAttribute( 'internalname' ) ] ) {
                // Update lov property
            }
        }
    }
};

export let updateObjectProperties = function( id, modelElementsTobeUpdated, data ) {
    var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
    var reqNamePrefixToBeUpdated = [];

    for ( const object of modelElementsTobeUpdated ) {
        var reqObject = object.item;
        var updatedProperties = object.props;

        if( updatedProperties.date_released ) {
            var objId = reqObject.getAttribute( 'id' );
            var element = document.getElementById( objId );
            if( element ) {
                var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
                reqBodyText.setAttribute( 'contenteditable', 'FALSE' );
                reqBodyText.setAttribute( 'contentType', 'READONLY' );
                reqACEUtils.setReadOnlyForRequirement( data, element, true );
                var properties = element.getElementsByClassName( 'aw-requirement-properties' );
                if( properties ) {
                    _.forEach( properties, function( property ) {
                        property.setAttribute( 'contenteditable', 'FALSE' );
                    } );
                }
                var lovProperties = element.getElementsByClassName( 'aw-requirement-lovProperties' );
                if( lovProperties ) {
                    _.forEach( lovProperties, function( lovproperty ) {
                        var selectEle = lovproperty.getElementsByTagName( 'select' );
                        if( selectEle && selectEle.length > 0 ) {
                            var select = selectEle[ 0 ];
                            var selectedValue = select.value;
                            lovproperty.innerHTML = selectedValue;
                        }
                        lovproperty.setAttribute( 'class', 'aw-requirement-properties' );
                        lovproperty.setAttribute( 'contenteditable', 'FALSE' );
                    } );
                }
                replaceRequirement( editor, reqObject, element.outerHTML );
            }
        } else {
            const rangeReq = editor.model.createRangeIn( reqObject );
            for( var item of rangeReq.getItems() ) {
                if( updatedProperties.object_name && item.name && item.name === 'requirementHeader' ) {
                    // Update Object title in header
                    _updateHeaderTitle( editor, item, updatedProperties.object_name );
                } else if( item.name && item.name === 'requirementProperty' && updatedProperties[ item.getAttribute( 'internalname' ) ] ) {
                    // Update object property
                    updateTextValueInNode( editor, item, updatedProperties[ item.getAttribute( 'internalname' ) ] );
                } else if( item.name && item.name === 'requirementLovProperty' && updatedProperties[ item.getAttribute( 'internalname' ) ] ) {
                    // Update lov property
                } else if( updatedProperties.requirementNamePrefix && item.name && item.name === 'requirementHeader' ) {
                    reqNamePrefixToBeUpdated.push( {
                        item: item,
                        prop: 'requirementNamePrefix',
                        value: updatedProperties.requirementNamePrefix
                    } );    // Adding Para number to array to execute in bulk
                }
            }
        }
    }

    if( reqNamePrefixToBeUpdated.length > 0 ) {
        _updateAttributeTransparentInBulk( editor, reqNamePrefixToBeUpdated );
    }
};

/**
 *
 */
function _updateAttributeTransparentInBulk( editor, updatedObjects ) {
    editor.model.enqueueChange( 'transparent', writer => {
        for ( const object of updatedObjects ) {
            writer.setAttribute( object.prop, object.value, object.item );
        }
    } );
}

export let updateAttributesInBulk = function( updatedObjects ) {
    var editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
    _updateAttributeTransparentInBulk( editor, updatedObjects );
};

/**
 * Function to update text value in the child of given node
 * @param {Object} editor  - editor instance
 * @param {Object} node - Parent node
 * @param {String} newValue - updated value
 */
function updateTextValueInNode( editor, node, newValue ) {
    var propTxtNode = node.getChild( 0 );

    editor.model.change( writer => {
        if( propTxtNode ) {
            const position = writer.createPositionBefore( propTxtNode );
            const attributes = propTxtNode.getAttributes();
            writer.remove( propTxtNode );
            writer.insertText( _.unescape( newValue ), attributes, position );
        } else {
            writer.insertText( _.unescape( newValue ), node );
        }
        contentUpdatedForPropertyUpdate = true;
    } );
}

/**
 * Set latest tracelink icon from dom element
 *
 * @param {Object} reqElement - the requirement widget element
 * @param {Object} currentElement - the current requirement widget element
 */
var _updateTracelinkMarkers = function( reqElement, currentElement ) {
    var tlIconPlaceHolder = reqElement.getElementsByTagName( 'tracelinkicon' );
    var currentTlIconPlaceHolder = currentElement.getElementsByTagName( 'tracelinkicon' );
    var marker = reqElement.getElementsByClassName( 'aw-requirement-marker' )[ 0 ];
    marker.replaceChild( currentTlIconPlaceHolder[ 0 ], tlIconPlaceHolder[ 0 ] );
};

/**
 *   @param {object} editor - editor
 *  @param {String} uid - object uid
 */
var _getWidgetFromUid = function( editor, uid ) {
    var reqObject = null;
    // Find Requirement model object
    const range = editor.model.createRangeIn( editor.model.document.getRoot() );
    for( var item of range.getItems() ) {
        if( item.name === 'requirement' && item.getAttribute( 'id' ) === uid ) {
            reqObject = item;
            break;
        }
    }
    return reqObject;
};

/**
 * Update Header title
 *   @param {object} editor - editor
 *  @param {object} headerElement - headerElement title to be updated
 *  @param {String} newTitle - new Title
 */
var _updateHeaderTitle = function( editor, headerElement, newTitle ) {
    var position = null;
    var retainCursorPos = false;
    if( headerElement ) {
        const eleRange = editor.model.createRangeIn( headerElement );
        var selectRange = editor.model.document.selection.getFirstRange();

        if( eleRange.containsRange( selectRange ) ) {
            position = editor.model.document.selection.getFirstPosition();
            retainCursorPos = true;
        }
        updateTextValueInNode( editor, headerElement, newTitle );
    }

    if( retainCursorPos && position ) {
        editor.model.change( writer => {
            var newOffset = position.offset > newTitle.length ? newTitle.length : position.offset;
            position.offset = newOffset;
            writer.setSelection( position );
        } );
    }
};

/**
 * Check if to update Body text
 *   @param {String} originalReqHtml - Original requirement HTML
 *  @param {String} newReqHTML - new requirement HTML
 *  @returns {Boolean} true/false
 */
var _isUpdateBodyText = function( originalReqHtml, newReqHTML ) {
    var originalReqDiv = document.createElement( 'div' );
    originalReqDiv.innerHTML = originalReqHtml;

    var newReqDiv = document.createElement( 'div' );
    newReqDiv.innerHTML = newReqHTML;

    var origHtmlBodyText = '';
    var newHtmlBodyText = '';

    var tmpBodyText = originalReqDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    if( tmpBodyText && tmpBodyText.length > 0 ) {
        origHtmlBodyText = tmpBodyText[ 0 ].innerHTML;
        origHtmlBodyText = origHtmlBodyText.replace( /(\r\n|\n|\r)/gm, '' );
    }

    tmpBodyText = newReqDiv.getElementsByClassName( 'aw-requirement-bodytext' );
    if( tmpBodyText && tmpBodyText.length > 0 ) {
        newHtmlBodyText = tmpBodyText[ 0 ].innerHTML;
        newHtmlBodyText = newHtmlBodyText.replace( /(\r\n|\n|\r)/gm, '' );
    }

    if( origHtmlBodyText !== newHtmlBodyText ) {
        return true;
    }

    return false;
};
/**
 * Calculate cursor offset postion in while updating body text
 *   @param {object} editor - editor
 *  @param {object} modleEle - Body text model element to be updated
 *  @param {Number} postion - new requirement HTML
 *  @returns {number} new offset
 */
var _getNewCursorPostion = function( editor, modleEle, postion ) {
    var total_length = 0;
    var offSet = postion;

    const range = editor.model.createRangeIn( modleEle );
    for( const item of range.getItems( { ignoreElementEnd: true } ) ) {
        if( item._data || item.textNode ) {
            var text = item.textNode._data;
            total_length += text.length;
        }
    }
    if( offSet > total_length ) {
        offSet = total_length;
    }
    return offSet;
};
/**
 * Method to return model fragment of html content
 */
var _convertHtmlToModel = function( htmlContent, editor ) {
    const viewFragment = editor.data.processor.toView( htmlContent );
    return editor.data.toModel( viewFragment );
};

// Get Model Element within tree of other model element
var _getModelElement = function( editor, containerElement, nameModelEle ) {
    const range = editor.model.createRangeIn( containerElement );
    for( const modelElement of range.getItems( { ignoreElementEnd: true } ) ) {
        if( modelElement.name === nameModelEle ) {
            return modelElement;
        }
    }
    return null;
};

/**
 *   @param {object} editor - editor
 *  @param {object} currReqWidget - requirement Widget to be updated
 *  @param {String} newReqWidget - new requirement widget
 */
var _updateBodyText = function( editor, currReqWidget, newReqWidget, mode ) {
    if( newReqWidget ) {
        var currBodyText = _getModelElement( editor, currReqWidget, 'requirementBodyText' );
        var newBodyText = _getModelElement( editor, newReqWidget, 'requirementBodyText' );

        var position = null;
        var retainCursorPos = false;

        editor.model.change( writer => {
            try {
                const eleRange = editor.model.createRangeIn( currBodyText );
                var selectRange = editor.model.document.selection.getFirstRange();

                if( eleRange.containsRange( selectRange ) ) {
                    retainCursorPos = true;
                    position = editor.model.document.selection.getFirstPosition();
                }
                var posBodyText = writer.createPositionBefore( currBodyText );
                writer.remove( currBodyText );
                writer.insert( newBodyText, posBodyText );
            } catch ( error ) {
                //nothing to do. failed to update the requirement
            }
        } );

        editor.model.change( writer => {
            if( retainCursorPos && position && mode !== 'reset' ) {
                try {
                    var newOffset = _getNewCursorPostion( editor, newBodyText, position.offset );
                    position.offset = newOffset;
                    writer.setSelection( position );
                } catch ( error ) {
                    //nothing to do. Failed to set the selection on given position
                }
            }
        } );
    }
};

/**
 *   @param {object} editor - editor
 *  @param {object} reqWidget - requirement Widget to be updated
 */
var _updateMarkup = function( editor, reqWidget ) {
    if( reqWidget ) {
        var markupReqModelEle = _getModelElement( editor, reqWidget, 'requirementMarker' );
        if( markupReqModelEle ) {
            editor.model.change( writer => {
                var posBodyText = null;

                var countChild = markupReqModelEle.childCount;
                for( var ii = countChild - 1; ii >= 0; ii-- ) {
                    var child = markupReqModelEle.getChild( ii );
                    if( child.name === 'checkedout' ) {
                        // posBodyText = writer.createPositionBefore( child );
                        writer.remove( child );
                    }
                }

                posBodyText = writer.createPositionAt( markupReqModelEle, 1 );
                if( posBodyText ) {
                    const newCheckoutEle = writer.createElement( 'checkedout', {} );
                    writer.insert( newCheckoutEle, posBodyText );
                }
            } );
        }
    }
};
/**
 *   @param {object} editor - editor
 *  @param {object} currReqWidget - requirement Widget to be updated
 *  @param {String} newReqHtml - new requirement HTML
 */
var _updateRequirement = function( editor, currReqWidget, newReqHtml, mode ) {
    var modelFregment = _convertHtmlToModel( newReqHtml, editor );
    if( !modelFregment || modelFregment.childCount < 1 ) { return; }

    const newReqWidget = modelFregment.getChild( 0 );

    // get original RequirementContent
    if( newReqWidget && currReqWidget ) {
        if( mode === 'reset' ) {
            replaceRequirement( editor, currReqWidget, newReqHtml );
        } else {
            _updateMarkup( editor, currReqWidget );

            var idAttribute = currReqWidget.getAttribute( 'id' );
            var originalReqHtml = _getOriginalReqHtml( idAttribute );

            var newContentDiv = document.createElement( 'div' );
            var oldContentDiv = document.createElement( 'div' );
            newContentDiv.innerHTML = newReqHtml;
            var headerDomElement = newContentDiv.getElementsByClassName( 'aw-requirement-header' )[ 0 ];
            var contentDomElement = newContentDiv.getElementsByClassName( 'aw-requirement-content' )[ 0 ];
            oldContentDiv.innerHTML = originalReqHtml;
            oldContentDiv.getElementsByClassName( 'aw-requirement-header' )[ 0 ].innerHTML = headerDomElement.innerHTML;
            oldContentDiv.getElementsByClassName( 'aw-requirement-content' )[ 0 ].innerHTML = contentDomElement.innerHTML;
            origCkeditorContentMap[ idAttribute ] = oldContentDiv.innerHTML; // Update map

            _updateBodyText( editor, currReqWidget, newReqWidget, mode );
        }
    }
};
/**
 * Set CKEditor Content.
 *
 * @param {String} id- CKEditor ID
 * @param {String} content - content to set in CK Editor
 * @return {String} Return when content gets loaded in ckeditor
 */

export let updateHtmlDivs = function( id, updatedObjects, updatedContents, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    editor.ignoreDataChangeEvent = true;

    for( var i = 0; i < updatedObjects.length; i++ ) {
        var currReqWidget = _getWidgetFromUid( editor, updatedObjects[ i ].uid );
        if( !currReqWidget ) {
            continue;
        }
        editor.model.change( writer => {
            writer.removeAttribute( 'checkedoutby', currReqWidget );
            writer.removeAttribute( 'checkedouttime', currReqWidget );
        } );
        _resetDirtyFlag( editor, currReqWidget );

        _updateRequirement( editor, currReqWidget, updatedContents[ i ].trim() );
    }
    editor.ignoreDataChangeEvent = false;
};

/**
 * Reset isDirtyFlag from requirement elements
 *
 * @param {Object} editor Editor instance
 * @param {Object} reqObject Requirement model object
 */
var _resetDirtyFlag = function( editor, reqObject ) {
    editor.model.change( writer => {
        const rangeReq = editor.model.createRangeIn( reqObject );
        for( var item of rangeReq.getItems() ) {
            // Update Object title in header
            if( ( item.getAttribute( 'isDirty' ) === true || item.getAttribute( 'isDirty' ) === 'true' ) && ( item.name === 'requirementHeader' ||
                    item.name === 'requirementBodyText' || item.name === 'requirementProperty' || item.name === 'requirementLovProperty' ) ) {
                writer.setAttribute( 'isDirty', false, item );
            }
        }
    } );
};

/**
 * Method to update the widget locally when user overwrite the object in derived specification
 * @param {Object} ctx the active workspace contect object
 */
export let makeRequirementEditable = function( ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    editor.ignoreDataChangeEvent = true;
    for( let index = 0; index < ctx.rmselected.length; index++ ) {
        var currReqWidget = _getWidgetFromUid( editor, ctx.rmselected[ index ].uid );
        if( !currReqWidget ) {
            return;
        }
        var originalReqHtml = _getOriginalReqHtml( ctx.rmselected[ index ].uid );
        originalReqHtml = updateStyleForOverwrite( originalReqHtml );
        replaceRequirement( editor, currReqWidget, originalReqHtml );
    }
    editor.ignoreDataChangeEvent = false;
};

/**
 * Method to replace requiement widget with new requirment
 * @param {Object} editor the ckeditor instance
 * @param {Object} currReqWidget - the current requirement widget
 * @param {String} newReqhtml the html of new requirement to be updated
 */
function replaceRequirement( editor, currReqWidget, newReqhtml ) {
    editor.ignoreDataChangeEvent = true;
    var modelFregment = _convertHtmlToModel( newReqhtml, editor );
    if( !modelFregment || modelFregment.childCount < 1 ) { return; }

    const newReqWidget = modelFregment.getChild( 0 );
    editor.model.change( writer => {
        var posBodyText = writer.createPositionBefore( currReqWidget );
        writer.remove( currReqWidget );
        writer.insert( newReqWidget, posBodyText );
    } );

    if( appCtxSvc.ctx.rmselected[ 0 ].uid === appCtxSvc.ctx.mselected[ 0 ].uid ) {
        var contentDivElement = document.createElement( 'div' );
        contentDivElement.innerHTML = newReqhtml;
    var uid = contentDivElement.getElementsByClassName( 'requirement' )[0].getAttribute( 'id' );
        let reqDomElement = document.getElementById( uid );
        let headerDomEle = reqDomElement.getElementsByClassName( 'aw-requirement-header' )[ 0 ];
        let headerViewElement = editor.editing.view.domConverter.domToView( headerDomEle );

        editor.editing.view.change( writer => {
            writer.setAttribute( 'selected', 'true', headerViewElement );
        } );
        appCtxSvc.registerCtx( 'isViewElementReplaced', true );
    } else {
        appCtxSvc.unRegisterCtx( 'isViewElementReplaced' );
    }
    editor.ignoreDataChangeEvent = false;
}

/**
 * Method to update the requirements overwritten object in derived specification
 * @param {String} html - the html to be updated
 * @returns {String} the updated html
 */
function updateStyleForOverwrite( html ) {
    var element = document.createElement( 'div' );
    element.innerHTML = html;
    element = element.firstElementChild;
    var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
    reqBodyText.setAttribute( 'contenteditable', 'TRUE' );
    reqBodyText.removeAttribute( 'contenttype' );
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
    element.style.cursor = 'auto';
    return element.outerHTML;
}
/**
 * Converts the dom markup span into ckeditor5 model
 * * @param {Object} markup - markup object
 */
export let renderComment = function( markup, markupList, allMarkups ) {
    var commentContext = appCtxSvc.getCtx( 'commentContext' );
    if( !commentContext ) {
        appCtxSvc.ctx.isNewComment = true;
        if( markup.editMode === 'reply' ) {
            markupList.push( markup );
            var index = allMarkups.indexOf( markup );
            if( index === -1 ) {
                allMarkups.push( markup );
            }
        } else {
            var commentId = markup.reqData.commentid;
            var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
            var ckeditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
            var commentStyle = 'background-color:rgba(255, 0, 0, 0.125)';
            const selection = ckeditor.model.document.selection;
            if( selection && !selection.isCollapsed ) {
                ckeditor.model.change( writer => {
                    appCtxSvc.ctx.isRequirementsCommentsHighlightInProgress = true;
                    const currentRange = selection.getFirstRange();
                    var preRange = [];
                    var postRange = [];
                    var isEqualRange = getRangesForOverlappedAndNestedComments( ckeditor, writer, commentId, currentRange, preRange, postRange );
                    createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, commentId );
                    const range = {};
                    range.range = currentRange;
                    range.usingOperation = false;
                    if( !ckeditor.model.markers._markers.get( commentId ) ) {
                        var marker = writer.addMarker( commentId, range );
                        setMarkerChangeEveneListener( marker );
                        commentIdVsStartPath.set( commentId, marker._liveRange.start.path );
                        commentIdVsEndPath.set( commentId, marker._liveRange.end.path );
                        if( !appCtxSvc.ctx.ckeditor5Markers ) {
                            appCtxSvc.ctx.ckeditor5Markers = [];
                        }
                        appCtxSvc.ctx.ckeditor5Markers.push( marker );
                    }
                } );
            } else if( selection && selection.isCollapsed ) {
                getSelection( selection, ckeditor, commentId, commentStyle );
            }
            var currentSpanInserted = document.querySelectorAll( 'span[id*="' + commentId + '"]' );
            for( var k = 0; k < currentSpanInserted.length; k++ ) {
                if( currentSpanInserted[ k ] ) {
                    _markupTextInstance.setMarkupEventListeners( currentSpanInserted[ k ] );
                    markupList.push( markup );
                    var index = allMarkups.indexOf( markup );
                    if( index === -1 ) {
                        allMarkups.push( markup );
                    }
                }
            }
        }
        markupViewModel.sortMarkupList();
    } else {
        var commentIndex = allMarkups.indexOf( markup );
        if( commentIndex === -1 ) {
            allMarkups.push( markup );
        }
        markupViewModel.sortMarkupList();
    }
};

/**
 * Method to create span for markup
 */
function createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, commentId ) {
    var comment = markupViewModel.getComment( commentId );
    if( comment && comment.reqData && !comment.reqData.parentCommentid && !comment.reqData.parentCommentid !== '' ) {
        var user = markupViewModel.getUser( comment );
        var commentStyle = 'background-color:' + user.color;
        try {
            if( preRange.length > 0 || postRange.length > 0 ) {
                if( preRange.length > 0 ) {
                    writer.setAttribute( 'spanId', commentId, preRange[ 0 ] );
                    writer.setAttribute( 'spanStyle', commentStyle, preRange[ 0 ] );
                }
                if( postRange.length > 0 ) {
                    writer.setAttribute( 'spanId', commentId, postRange[ 0 ] );
                    writer.setAttribute( 'spanStyle', commentStyle, postRange[ 0 ] );
                }
            } else if( !isEqualRange ) {
                writer.setAttribute( 'spanId', commentId, currentRange );
                writer.setAttribute( 'spanStyle', commentStyle, currentRange );
            }
        } catch ( error ) {
            // Nothing to do. Failed to add attributes on given range
        }
    }
}

/**
 *  Method to get pre and post range that needs to be added to span for the given comemnt id
 *  @param {CKEDITOR} ckeditor - ckeditor instance
 *  @param {ModelWriter} writer - the ckeditor model writer
 *  @param {String} commentId - the newly ceated comment id
 *  @param {Range} currentRange - the range for which comemnt to be added
 *  @param {Array} preRange - the pre range to be added in markup span
 *  @param {Array} postRange - the post range to be added in markup span
 *  @return {Boolean} the lag to indicate selected range is equal to current range
 */
function getRangesForOverlappedAndNestedComments( ckeditor, writer, commentId, currentRange, preRange, postRange ) {
    var preRanges = [];
    var postRanges = [];
    var isEqual = false;
    const markersIntersectingRange = [ ...ckeditor.model.markers.getMarkersIntersectingRange( currentRange ) ];
    if( markersIntersectingRange.length > 0 ) {
        for( const marker of markersIntersectingRange ) {
            const markerRange = marker.getRange();
            var differenceRanges = [ ...currentRange.getDifference( markerRange ) ];
            if( differenceRanges.length === 2 ) {
                preRanges.push( differenceRanges[ 0 ] );
                postRanges.push( differenceRanges[ 1 ] );
            } else if( differenceRanges.length === 1 ) {
                var intersectingRange = currentRange.getIntersection( markerRange );
                if( isStartingWithSamePath( markerRange, currentRange ) ) {
                    addCommentIdToExistingSpan( writer, intersectingRange, commentId );
                    postRanges.push( differenceRanges[ 0 ] );
                } else if( isEndingWithSamePath( markerRange, currentRange ) ) {
                    preRanges.push( differenceRanges[ 0 ] );
                } else {
                    preRanges.push( intersectingRange );
                    postRanges.push( differenceRanges[ 0 ] );
                }
            } else {
                if( currentRange.isEqual( markerRange ) ) {
                    isEqual = true;
                    addCommentIdToExistingSpan( writer, currentRange, commentId );
                }
            }
        }
        if( preRanges.length > 0 ) {
            preRange.push( getIntersectingRange( ckeditor, preRanges ) );
        }
        if( postRanges.length > 0 ) {
            postRange.push( getIntersectingRange( ckeditor, postRanges ) );
        }
    }
    return isEqual;
}

/**
 * Combine new comment id with existing in case of comments starting from same postion or are same
 *  @param {ModelWriter} writer - the ckeditor model writer
 *  @param {Range} intersectingRange - the intersecting range which contains existing span
 *  @param {String} commentId - the newly ceated comment id
 *
 */
function addCommentIdToExistingSpan( writer, intersectingRange, commentId ) {
    var comment = markupViewModel.getComment( commentId );
    if( comment && comment.reqData && !comment.reqData.parentCommentid && !comment.reqData.parentCommentid !== '' ) {
        for( const item of intersectingRange.getItems() ) {
            var existingSpanId = item.getAttribute( 'spanId' );
            writer.setAttribute( 'spanId', existingSpanId + ',' + commentId, item );
        }
    }
}

/**
 * Method to identify whether two range start at same position
 * @param {Range} range1 - the first range
 * @param {Range} range2 - the second range
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isStartingWithSamePath( range1, range2 ) {
    var startPath = range1.start.path;
    var startPathCurreentRange = range2.start.path;
    return isEqualPath( startPath, startPathCurreentRange );
}

/**
 * Method to identify whether two range start at same position
 * @param {Range} firstPath - the first path
 * @param {Range} secondPath - the second path
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isEqualPath( firstPath, secondPath ) {
    var startPath = firstPath;
    var startPathCurreentRange = secondPath;
    return Array.isArray( startPath ) && Array.isArray( startPathCurreentRange ) && startPath.length === startPathCurreentRange.length &&
        startPathCurreentRange.every( ( val, index ) => val === startPath[ index ] );
}

/**
 * Method to identify whether deleted path is ssmaller that the range start path
 * @param {Range} firstPath - the first path
 * @param {Range} secondPath - the second path
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isPathDeleted( deletedPath, rangeStartPath ) {
    var isPathDeleted = false;
    var startPath = deletedPath;
    var startPathCurreentRange = rangeStartPath;
    var isLengthEqual = Array.isArray( startPath ) && Array.isArray( startPathCurreentRange ) && startPath.length === startPathCurreentRange.length;
    if( isLengthEqual ) {
        for( var i = 0; i < startPath.length; i++ ) {
            var deletedPathVal = startPath[ i ];
            var startPathCurreentRangeVal = startPathCurreentRange[ i ];
            if( i < startPath.length - 1 && deletedPathVal === startPathCurreentRangeVal ) {
                continue;
            } else {
                deletedPathVal < startPathCurreentRangeVal ? isPathDeleted = true : isPathDeleted = false;
            }
        }
    }
    return isPathDeleted;
}

/**
 * Method to identify whether two range end at same position
 * @param {Range} range1 - the first range
 * @param {Range} range2 - the second range
 * @returns {Boolean} the value indiccating pathe is equal or not
 */
function isEndingWithSamePath( range1, range2 ) {
    var endPath = range1.end.path;
    var endPathCurreentRange = range2.end.path;
    return Array.isArray( endPath ) && Array.isArray( endPathCurreentRange ) && endPath.length === endPathCurreentRange.length &&
        endPathCurreentRange.every( ( val, index ) => val === endPath[ index ] );
}

/**
 * Method tol find the intersecting range of all ranges
 * @param {CKEDITOR} editor - ckeditor instance
 * @param {Array} ranges - the array of ranges for which intersection needs to be find
 * @returns {Range} the calculated intersecting range
 */
function getIntersectingRange( editor, ranges ) {
    var intersectingRange;
    if( ranges.length > 0 ) {
        intersectingRange = ranges[ 0 ];
        for( var i = 1; i < ranges.length; i++ ) {
            intersectingRange = ranges[ i ].getIntersection( intersectingRange );
        }
    }
    return intersectingRange;
}

/**
 * Get selection in case of range when start and end is same.
 *  @param {Object} selection - markup object
 *  @param {Object} ckeditor - ckeditor instance
 *  @param {Object} modelFragment - modelFragment object
 */
function getSelection( selection, ckeditor, commentId, commentStyle ) {
    var stringNode = selection._ranges[ 0 ].start.textNode._data;
    var cursorPath = selection._ranges[ 0 ].start.path;
    var startOffset = selection._ranges[ 0 ].start.textNode.startOffset;
    var cursorPosition = cursorPath[ cursorPath.length - 1 ];
    var cloneCursorPositionForStart = _.cloneDeep( cursorPosition );
    var cloneCursorPositionForEnd = _.cloneDeep( cursorPosition );

    var startPosition = cloneCursorPositionForStart;
    var endPosition = cloneCursorPositionForEnd;

    var clonedStartPath = _.cloneDeep( cursorPath );
    var clonedEndPath = _.cloneDeep( cursorPath );

    cloneCursorPositionForStart = cloneCursorPositionForStart - startOffset - 1;
    cloneCursorPositionForEnd = cloneCursorPositionForEnd - startOffset - 1;

    if( stringNode.charCodeAt( cloneCursorPositionForStart ) === 32 && stringNode.charCodeAt( cloneCursorPositionForStart - 1 ) === 32 &&
        stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) === 32 ) {
        return;
    } // text | x
    else if( stringNode.charCodeAt( cloneCursorPositionForStart ) === 32 &&
        stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) !== 32 ) { // |Text
        startPosition = cloneCursorPositionForStart;
        clonedStartPath = _.cloneDeep( cursorPath );
        clonedStartPath[ clonedStartPath.length - 1 ] = startPosition + startOffset + 1;

        while( stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) !== 32 && cloneCursorPositionForStart <= stringNode.length ) {
            ++cloneCursorPositionForStart;
        }

        endPosition = cloneCursorPositionForStart;
        clonedEndPath = _.cloneDeep( cursorPath );
        clonedEndPath[ clonedEndPath.length - 1 ] = endPosition + startOffset + 1;
    } else if( stringNode.charCodeAt( cloneCursorPositionForEnd + 1 ) === 32 &&
        stringNode.charCodeAt( cloneCursorPositionForEnd ) !== 32 ) { // Text|
        endPosition = cloneCursorPositionForEnd;
        clonedEndPath = _.cloneDeep( cursorPath );
        clonedEndPath[ clonedEndPath.length - 1 ] = endPosition + startOffset + 1;
        while( stringNode.charCodeAt( cloneCursorPositionForEnd - 1 ) !== 32 && cloneCursorPositionForStart >= 0 ) {
            --cloneCursorPositionForEnd;
        }

        startPosition = cloneCursorPositionForEnd;
        clonedStartPath = _.cloneDeep( cursorPath );
        clonedStartPath[ clonedStartPath.length - 1 ] = startPosition + startOffset;
    } else if( stringNode.charCodeAt( cloneCursorPositionForStart + 1 ) !== 32 &&
        stringNode.charCodeAt( cloneCursorPositionForStart - 1 ) !== 32 ) { // Te|xt
        while( stringNode.charCodeAt( cloneCursorPositionForEnd + 1 ) !== 32 && cloneCursorPositionForStart <= stringNode.length ) {
            ++cloneCursorPositionForEnd;
        }
        endPosition = cloneCursorPositionForEnd;
        clonedEndPath = _.cloneDeep( cursorPath );
        clonedEndPath[ clonedEndPath.length - 1 ] = endPosition + startOffset + 1;

        while( stringNode.charCodeAt( cloneCursorPositionForStart - 1 ) !== 32 && cloneCursorPositionForStart >= 0 ) {
            --cloneCursorPositionForStart;
        }
        startPosition = cloneCursorPositionForStart;
        clonedStartPath = _.cloneDeep( cursorPath );
        clonedStartPath[ clonedStartPath.length - 1 ] = startPosition + startOffset;
    }

    const doc = ckeditor.model.document;
    const root = doc.getRoot();

    ckeditor.model.change( writer => {
        var startPath = clonedStartPath;
        var endPath = clonedEndPath;
        const startPos = writer.createPositionFromPath( root, startPath, 'toNext' );
        const endPos = writer.createPositionFromPath( root, endPath, 'toPrevious' );
        const currentRange = writer.createRange( startPos, endPos );
        writer.setAttribute( 'spanId', commentId, currentRange );
        writer.setAttribute( 'spanStyle', commentStyle, currentRange );
    } );
}


/**
 * Initialise Markup Input
 *  @param {Object} reqMarkupCtx - requirement markup context
 */
export let initialiseMarkupInput = function( reqMarkupCtx ) {
    processedComments = [];
    halfProcessedComments = [];
    commentIdVsStartPath.clear();
    commentIdVsEndPath.clear();
    // clear maps if not empty
    var cmtMap = markupViewModel.getCommentsMap();
    cmtMap.clear();
    var cmtRpyMap = markupViewModel.getReplyCommentsMap();
    cmtRpyMap.clear();
    var finalTrackChangesMap = markupViewModel.getFinalTrackChangesMap();
    finalTrackChangesMap.clear();
    var trackChangesMap = markupViewModel.getTrackChangesMap();
    trackChangesMap.clear();

    var parsedResponse = parseServerResponse( reqMarkupCtx );
    finalMarkupParsedInput = parsedResponse;

    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var editor = exports.getCKEditorInstance( editorId, appCtxSvc.ctx );
    editor.on( 'highlightComments', function( evt ) {
        exports.highlightComments( finalMarkupParsedInput );
        evt.stop();
        evt.off();
    } );
};

/**
 * Initialise Markup Input
 *  @param {Object} reqMarkupCtx - requirement markup context
 */
 export let initialiseAdditionalMarkupInput = function( reqMarkupCtx ) {
    var parsedResponse = parseServerResponse( reqMarkupCtx, true );

    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var editor = exports.getCKEditorInstance( editorId, appCtxSvc.ctx );
    editor.on( 'addSavedContentToEditor.highlightComments', function( evt ) {
        exports.highlightComments( parsedResponse, true );
        evt.stop();
        evt.off();
    } );
 };

/**
 * Highlight comments when save-reload page
 *  @param {Object} reqMarkupCtx - requirement markup context
 */
export let highlightComments = function( finalMarkupParsedInput, highlightAdditionalComments ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var editor = exports.getCKEditorInstance( editorId, appCtxSvc.ctx );
    editor.ignoreDataChangeEvent = true;
    var requirementRoot = editor.model.document.getRoot();
    var commentContext = appCtxSvc.getCtx( 'commentContext' );
    const commentsRepository = editor.plugins._plugins.get( 'CommentsRepository' );
    if( !highlightAdditionalComments && commentsRepository && commentsRepository._threads && commentsRepository._threads.size > 0 ) {
        commentsRepository._threads.clear();
        commentsMap.clear();
    }
    if( highlightAdditionalComments ) {
        _.forEach( finalMarkupParsedInput, function( markupObj ) {
            var markups = _.cloneDeep( markupObj.markups );
            _.forEach( markups, function( markup ) {
                if( commentsRepository.hasCommentThread( markup.threadId ) ) {
                    commentsRepository._threads.delete( markup.threadId );
                }
            } );
        } );
    }
    // Subscribe event to handle Updation of comments on Split Reqirement command execution
    _highlightCommentsForSplitRequirement( editor );
    if( commentContext && !finalMarkupParsedInput ) {
        try {
            //Set the local user into ckeditor users plugin
            var session = appCtxSvc.getCtx( 'userSession' );
            const usersPlugin = editor.plugins.get( 'Users' );
            var userObj = {};
            if( session ) {
                var userUID = session.props.user.dbValues;
                if( userUID ) {
                    var loggedInUser = cdm.getObject( userUID );
                    if( loggedInUser && loggedInUser.props && loggedInUser.props.userid && loggedInUser.props.user_name ) {
                        userObj.id = loggedInUser.props.userid.uiValues[0];
                        userObj.name = loggedInUser.props.user_name.uiValues[0];
                        var thumbnailUrl = awIconService.getThumbnailFileUrl( loggedInUser );
                        if( thumbnailUrl ) {
                            userObj.avatar = thumbnailUrl;
                        }else{
                            userObj.avatar = awIconService.getTypeIconFileUrl( loggedInUser );
                        }
                    }
                }else{
                    userObj.id = session.props.user_id.dbValue;
                    userObj.name = session.props.user_id.dbValue;
                    userObj.avatar = app.getBaseUrlPath() + '/image/typePerson48.svg';
                }
                let currentUser = usersPlugin.getUser( userObj.id );
                if( !currentUser ) {
                    usersPlugin.addUser( userObj );
                }
                let definedUser = usersPlugin.me;
                if( !definedUser ) {
                    usersPlugin.defineMe( userObj.id );
                }
            }
        } catch ( error ) {
            // failure in setting local user
        }
    }
    createCommentsMap( finalMarkupParsedInput, highlightAdditionalComments );
    if( finalMarkupParsedInput && requirementRoot && requirementRoot._children && requirementRoot._children._nodes ) {
        var requirentWidgets = requirementRoot._children._nodes;
        //getting only the requirement widgets which have markups created in them
        _.forEach( finalMarkupParsedInput, function( markupObj ) {
            var revisionId = markupObj.baseObject.uid;
            var markups = _.cloneDeep( markupObj.markups );
            markups.sort( function( a, b ) {
                return a.start.rch - b.start.rch;
            } );
            _.forEach( requirentWidgets, function( requirentWidget ) {
                if( requirentWidget.name === 'requirement' ) {
                    var currentRevisionid = requirentWidget.getAttribute( 'revisionid' );
                    var obj = appCtxSvc.getCtx( 'summaryTableSelectedObjUid' );
                    var selectedObjs = appCtxSvc.getCtx( 'selected' );
                    if( !currentRevisionid && obj && obj.revID ) {
                        currentRevisionid = obj && obj.revID;
                    } else if( !currentRevisionid && !obj ) {
                        var revObject = Arm0DocumentationUtil.getRevisionObject( selectedObjs );
                        currentRevisionid = revObject && revObject.uid;
                    }
                    if( revisionId === currentRevisionid ) {
                        var modelPath = requirentWidget.getPath();
                        var cloneModelPath = _.cloneDeep( modelPath );
                        //We don't get accurate model path for <requirementContent>
                        cloneModelPath[ 1 ] = 2;
                        cloneModelPath.push( 0 );
                        var requirmentContent = getRequirementContentElement( requirentWidget );
                        var requirmentBodyText = getRequirementBodyContent( requirmentContent );
                        totalRCHParsed = 0;
                        totalCharParsed = 0;
                        getModelPath( requirmentBodyText, editor, cloneModelPath, markups, halfProcessedComments );
                        if( commentContext ) {
                            highlightCommentsCk5( editor );
                        } else {
                            highlightComment( editor );
                        }
                    }
                }
            } );
        } );
        //add event on delete command on comment thread
        // for( let [ key, value ] of commentsMap.entries() ) {
        //     markupService.attachEventListenerOnDeleteButton( key );
        // }
        // Clear the undo Stack
        exports.resetUndo( appCtxSvc.ctx.AWRequirementsEditor.id );
    }
    editor.ignoreDataChangeEvent = false;
    // Publish an event to reset Comment/Changes annotation filter map
    eventBus.publish( 'Arm0RequirementCkeditor5.resetFilterAnnotationsBackupMap' );
};

/**
* highlight comments on newly created requirement
*
*  @param {Object} editor - ckeditor instance
*/
function _highlightCommentsForSplitRequirement( editor ) {
    // Handles highlight of the comment on splitted requirement
    editor.on( 'highlightCommentsForSplitRequirement', function( evt, splitReqCommentMap, requirentWidget ) {
        var markups = [];
        commentIdVsStartPath.clear();
        commentIdVsEndPath.clear();
        processedComments = {};
        halfProcessedComments = {};

        var modelPath = requirentWidget.getPath();
        var cloneModelPath = _.cloneDeep( modelPath );
        cloneModelPath[ 1 ] = 2;
        cloneModelPath.push( 0 );

        var requirmentContent = getRequirementContentElement( requirentWidget );
        var requirmentBodyText = getRequirementBodyContent( requirmentContent );
        totalRCHParsed = 0;
        totalCharParsed = 0;

        for( let [ key, value ] of splitReqCommentMap.entries() ) {
            markups.push( value );
        }
        getModelPath( requirmentBodyText, editor, cloneModelPath, markups, halfProcessedComments );
        setTimeout( () => {
            highlightCommentsCk5( editor, true );
        }, 100 );
        _updateCommentsData( splitReqCommentMap, requirentWidget._attrs.get( 'id' ) );
    } );

    // Event to get commentId from thread Id
    editor.on( 'getCommentId', function( evt, threadId ) {
        if( commentsMap.has( threadId ) ) {
            evt.return = commentsMap.get( threadId )[0].reqData.commentid;
        }
    } );
}

/**
 * Update the comment objects after split requirement
 *
 *  @param {Map} commentMap - comments present in selection
 *  @param {String} elementId - element id of the nwly created requirement
 */
 function _updateCommentsData( commentMap, elementId ) {
     if( elementId ) {
        for ( let [ key, value ] of commentMap.entries() ) {
            if( commentsMap.has( key ) ) {
                var commentArray = commentsMap.get( key );
                commentArray.forEach( element => {
                    //update the comment position and obj id with reference to newly created requirement
                    element.start.rch = value.start.rch;
                    element.start.ch = value.start.rch;

                    element.end.rch = value.end.rch;
                    element.end.ch = value.end.rch;

                    element.objId = elementId;

                    var markup = markupViewModel.getMarkupFromId( element.reqData.commentid );
                    if( markup ) {
                        markup.start.rch = value.start.rch;
                        markup.start.ch = value.start.rch;
                        markup.end.rch = value.end.rch;
                        markup.end.ch = value.end.rch;
                        markup.objId = elementId;
                    }
                } );
            }
        }
     }
 }

/**
 * Method to ensure the ckeditor's plugin thread data and cached maps are consistent
 *
 *  @param {Object} editor - ckeditor instance
 */
function ensureCachedCommentsDataValid( editor, thread ) {
    const commentsRepositoryPlugin = editor.plugins.get( 'CommentsRepository' );
    if( commentsRepositoryPlugin ) {
        var isThreadPresent = commentsRepositoryPlugin.getCommentThread( thread );
        if( isThreadPresent ) {
            var commentCollection = isThreadPresent.comments._items;
            for( var i = 0; i < commentCollection.length; i++ ) {
                var commentsMapArray = commentsMap.get( thread );
                if( commentsMapArray ) {
                    commentsMapArray[ i ].ck5CommentId = commentCollection[ i ].id;
                    var cmtMap = markupViewModel.getCommentsMap();
                    if( cmtMap.has( commentsMapArray[ i ].reqData.commentid ) ) {
                        var currentComment = cmtMap.get( commentsMapArray[ i ].reqData.commentid );
                        currentComment.ck5CommentId = commentCollection[ i ].id;
                    }
                }
            }
            //Check if the Requirement Spec is Read-Only - If read only then comment threads should also be read only
            var threadSpan = document.querySelector( `span[data-comment='${thread}']` );
            if( threadSpan && !isThreadPresent.isReadOnly ) {
                var bodyTextNode = getBodyContentNode( threadSpan );
                if( bodyTextNode ) {
                    var attribute = bodyTextNode.getAttribute( 'contenttype' );
                    if( attribute && attribute === 'READONLY' ) {
                        isThreadPresent.isReadOnly = true;
                    }
                }
            }
        }
    }
}

/**
 * Get Body text node from comment marker span
 *  @param {Object} node - ckeditor node
 *  @returns {Object} - ckeditor bodytext node
 */
function getBodyContentNode( node ) {
    if( !node ) {
        return null;
    }
    if( node && node.classList && node.classList.length > 0 && node.classList.contains( 'aw-requirement-bodytext' ) ) {
        return node;
    }
    return getBodyContentNode( node.parentNode );
}

/**
 * Create Comments Map
 *
 *  @param {Array} parsedResponse - comments
 *  @param {Boolean} highlightAdditionalComments - highlightAdditionalComments flag
 */
function createCommentsMap( parsedResponse, highlightAdditionalComments ) {
    var threadId = null;
    var sameThreadComments = [];
    _.forEach( parsedResponse, function( obj ) {
        preprocessResponse( obj );
        if( highlightAdditionalComments ) {
            _removeLastCommentObjectCopy( obj );
        }
        for( var i = 0; i < obj.markups.length; i++ ) {
            threadId = obj.markups[ i ].threadId;
            for( var j = 0; j < obj.markups.length; j++ ) {
                if( obj.markups[ j ].threadId === threadId ) {
                    sameThreadComments.push( obj.markups[ j ] );
                }
            }
            if( !commentsMap.has( threadId ) ) {
                commentsMap.set( threadId, [ ...sameThreadComments ] );
            }
            sameThreadComments = [];
        }
    } );
}

/**
 * Method to remove the last copy of comments
 *
 * @param  {object} obj - comment object
 */
const _removeLastCommentObjectCopy = ( obj ) => {
    for( var i = 0; i < obj.markups.length; i++ ) {
        var threadId = obj.markups[ i ].threadId;
        if( commentsMap.has( threadId ) ) {
            commentsMap.delete( threadId );
        }
    }
};

/**
 * Add threadId, authorId properties into markup object if not present already
 *  @param {Object} currentObj - requirement markup object
 *  @return {String} thread - the threadId
 */
async function preprocessResponse( currentObj ) {
    for( var k = 0; k < currentObj.markups.length; k++ ) {
        var thread = null;
        var markup = null;
        if( !currentObj.markups[ k ].threadId && !currentObj.markups[ k ].reqData.parentCommentid ) {
            thread = Math.random().toString( 36 ).substr( 2, 10 );
            markup = markupViewModel.getMarkupFromId( currentObj.markups[ k ].reqData.commentid );
            if( markup && thread ) {
                currentObj.markups[ k ].threadId = thread;
                currentObj.markups[ k ].authorId = markup.userid;
                currentObj.markups[ k ].content = currentObj.markups[ k ].comment;
                currentObj.markups[ k ].createdAt = currentObj.markups[ k ].created;
                //Update comments json in memory
                markup.threadId = thread;
                markup.authorId = markup.userid;
                markup.content = currentObj.markups[ k ].comment;
                markup.createdAt = currentObj.markups[ k ].created;
            }
        } else if( !currentObj.markups[ k ].threadId && currentObj.markups[ k ].reqData.parentCommentid ) {
            markup = markupViewModel.getMarkupFromId( currentObj.markups[ k ].reqData.parentCommentid );
            if( markup ) {
                thread = markup.threadId;
                currentObj.markups[ k ].threadId = thread;
                var replyMarkup = markupViewModel.getMarkupFromId( currentObj.markups[ k ].reqData.commentid );
                if( replyMarkup ) {
                    //Update comments json in memory
                    replyMarkup.threadId = thread;
                    replyMarkup.authorId = replyMarkup.userid;
                    replyMarkup.content = currentObj.markups[ k ].comment;
                    replyMarkup.createdAt = currentObj.markups[ k ].created;
                }
                currentObj.markups[ k ].authorId = currentObj.markups[ k ].userid;
                currentObj.markups[ k ].content = currentObj.markups[ k ].comment;
                currentObj.markups[ k ].createdAt = currentObj.markups[ k ].created;
            }
        }
    }
    return thread;
}

/**
 * highlight comments
 *  @param {Object} editor - ckeditor instance
 *  @param {Boolean} highlightForSplitReq - flag to highlight in case of split requirement
 */
function highlightCommentsCk5( editor, highlightForSplitReq ) {
    const doc = editor.model.document;
    const root = doc.getRoot();
    const commentsRepositoryPlugin = editor.plugins.get( 'CommentsRepository' );
    if( commentsRepositoryPlugin ) {
        for( let [ key, value ] of commentIdVsStartPath.entries() ) {
            var startPath = value;
            var endPath = commentIdVsEndPath.get( key );
            var markup = markupViewModel.getMarkupFromId( key );
            if( startPath && endPath && doc && root && markup && markup.threadId ) {
                var isThreadPresent = commentsRepositoryPlugin.hasCommentThread( markup.threadId );
                if( !isThreadPresent ) {
                    var values = commentsMap.get( markup.threadId );
                    var commentThreadData = {
                        threadId: markup.threadId,
                        comments: values,
                        isFromAdapter: true
                    };
                    commentsRepositoryPlugin.addCommentThread( commentThreadData );
                    _higlightCommentByPathArray( editor, startPath, endPath, markup, key, root );
                    ensureCachedCommentsDataValid( editor, markup.threadId );
                }
                if( highlightForSplitReq ) {
                    _higlightCommentByPathArray( editor, startPath, endPath, markup, key, root );
                }
            }
        }
        commentIdVsStartPath.clear();
        commentIdVsEndPath.clear();
    }
}

/**
 * Highlight comments with start and end path
 *  @param {Object} editor - ckeditor instance
 *  @param {Object} startPath - Start Position
 *  @param {Object} endPath -  End Position
 *  @param {Object} markup - Comment Object
 *  @param {Object} key - key
 *  @param {Object} root - root element
*/
function _higlightCommentByPathArray( editor, startPath, endPath, markup, key, root ) {
    editor.model.change( writer => {
        const start = writer.createPositionFromPath( root, startPath );
        const end = writer.createPositionFromPath( root, endPath );
        const range = writer.createRange( start, end );
        writer.addMarker( `comment:${markup.threadId}:${key}`, { range, usingOperation: true, affectsData: false } );
    } );
}

/**
 * Convert markup response in json
 *  @param {Object} reqMarkupCtx - requirement markup context
 */
function parseServerResponse( reqMarkupCtx, isAdditionalMarkups ) {
    if( reqMarkupCtx && reqMarkupCtx.response && reqMarkupCtx.response.markups ) {
        var json = reqMarkupCtx.response.markups;
        var commentList = [];
        var escaped = json.replace( /[\u007f-\uffff]/g, function( c ) {
            return '\\u' + ( '0000' + c.charCodeAt( 0 ).toString( 16 ) ).slice( -4 );
        } );

        var objs = JSON.parse( escaped, function( key, value ) {
            return key === 'date' ? new Date( value ) :
                key === 'geometry' && typeof value === 'string' ? JSON.parse( value ) : value;
        } );
        var markups = splitCommentsAndTrackChanges( objs );
        var comments = markups.comments;
        var trackChanges = markups.trackChanges;
        for( var i = 0; i < comments.length; i++ ) {
            var comment = comments[ i ];
            comment.id = String( commentList.length );
            comment.displayname = comment.username +
                ( comment.userid.length > 0 ? ' (' + comment.userid + ')' :
                    ' [' + comment.initial + ']' );

            comment.visible = true;
            comment.editMode = null;
            comment.selected = false;
            commentList.push( comment );
            if( isAdditionalMarkups ) {
                delete processedComments[comment.reqData.commentid];
            }
        }
        if( commentList.length > 0 || trackChanges.length > 0 ) {
            markupViewModel.populateMarkupList( commentList, JSON.stringify( comments ), trackChanges, isAdditionalMarkups );
        }
        return sortedMarkup( commentList, reqMarkupCtx.serverReqMarkupsData );
    }
}

/**
 * Split comment and track changes
 *  @param {Object} markups - markups object
 *  @return {Object} markupObj with comments and trackChanges array separately
 */
function splitCommentsAndTrackChanges( markups ) {
    var comments = [];
    var trackChanges = [];
    for( let index = 0; index < markups.length; index++ ) {
        const element = markups[ index ];
        if( element.attributes ) {
            trackChanges.push( element );
        } else {
            comments.push( element );
        }
    }
    return { comments, trackChanges };
}

/**
 * Get sorted markup object
 *  @param {Object} markups - markups object
 *  @param {Object} serverReqMarkupsData - server requirment markup data
 */
function sortedMarkup( markups, serverReqMarkupsData ) {
    var cloneServerData = _.cloneDeep( serverReqMarkupsData );
    _.forEach( cloneServerData, function( markupObj ) {
        var revisionId = markupObj.baseObject.uid;
        var tempArray = [];
        _.forEach( markups, function( markup ) {
            if( revisionId === markup.objId ) {
                tempArray.push( markup );
            }
        } );
        markupObj.markups = tempArray;
    } );

    return cloneServerData;
}

/**
 * Get the ckeditor model path
 *  @param {Object} modelReq - Requirement Widget
 *  @param {Object} ckeditor - ckeditor instance
 *  @param {Object} cloneModelPath - the ckeditor model path of the requirement widget
 *  @param {Object} markups - markups object
 */
function getModelPath( modelReq, editor, cloneModelPath, markups, halfProcessedComments ) {
    for( var i = 0; i < modelReq._children.length; i++ ) {
        var currentNode = modelReq._children._nodes[ i ];
        updateNodeToSkipCount( currentNode );
        if( isTextModelNode( currentNode ) ) {
            var text = currentNode._data;
            if( lastTextParent !== currentNode.parent ) {
                if( !( lastTextParent && lastTextParent.rootName && lastTextParent.rootName === '$graveyard' ) ) {
                    totalCharParsed = 0;
                }
            }
            var text = currentNode._data;
            var length = text.length;
            totalRCHParsed += length;
            lastTextParent = currentNode.parent;
            totalCharParsed += length;
            for( var j = 0; j < markups.length; j++ ) {
                var startFound = false;
                var endFound = false;
                var markup = markups[ j ];
                var commentId = markup.reqData.commentid;
                var startRch = markup.start.rch;
                var endRch = markup.end.rch;
                var startOffset = -1;
                var endOffset = -1;
                if( startRch <= totalRCHParsed && !processedComments[ commentId ] &&
                    !halfProcessedComments[ commentId ] ) {
                    var position = totalRCHParsed - totalCharParsed;
                    startOffset = startRch - position;
                    startFound = true;
                    createPath( currentNode, startOffset, commentId, commentIdVsStartPath );
                }
                if( endRch <= totalRCHParsed && !processedComments[ commentId ] ) {
                    var position = totalRCHParsed - totalCharParsed;
                    endOffset = endRch - position;
                    endFound = true;
                    createPath( currentNode, endOffset, commentId, commentIdVsEndPath );
                    processedComments[ commentId ] = 'done';
                    delete halfProcessedComments[ commentId ];
                }
                if( startFound && !endFound ) {
                    halfProcessedComments[ commentId ] = markup;
                }
            }
        }
        if( currentNode && currentNode._children && currentNode._children._nodes && currentNode._children._nodes.length > 0 ) {
            getModelPath( currentNode, editor, cloneModelPath, markups, halfProcessedComments );
        }
    }
}

/**
 *
 */
function createPath( currentNode, offset, commentId, mapToAdd ) {
    var path = _.cloneDeep( currentNode.getPath() );
    path[ 3 ] -= noOfElementToIgnore;
    path[ path.length - 1 ] = offset;
    mapToAdd.set( commentId, path );
}

/**
 * highlight comments
 *  @param {Object} ckeditor - ckeditor instance
 *  @param {Object} markups - markups object
 */
function highlightComment( editor ) {
    const doc = editor.model.document;
    const root = doc.getRoot();
    for( let [ key, value ] of commentIdVsStartPath.entries() ) {
        var startPath = value;
        var endPath = commentIdVsEndPath.get( key );
        if( startPath && endPath ) {
            if( doc && root ) {
                editor.model.change( writer => {
                    appCtxSvc.ctx.isRequirementsCommentsHighlightInProgress = true;
                    try {
                        const startPos = writer.createPositionFromPath( root, startPath, 'toNext' );
                        const endPos = writer.createPositionFromPath( root, endPath, 'toPrevious' );
                        const currentRange = writer.createRange( startPos, endPos );
                        var preRange = [];
                        var postRange = [];
                        var isEqualRange = getRangesForOverlappedAndNestedComments( editor, writer, key, currentRange, preRange, postRange );
                        createSpanForRangeWithId( isEqualRange, writer, currentRange, preRange, postRange, key );
                        const range = {};
                        range.range = currentRange;
                        range.usingOperation = false;
                        // set attribute on range
                        /*writer.setAttribute( 'spanId', key, currentRange );
                        writer.setAttribute( 'spanStyle', commentStyle, currentRange );*/
                        if( !editor.model.markers._markers.get( key ) ) {
                            var marker = writer.addMarker( key, range );
                            setMarkerChangeEveneListener( marker );
                            if( !appCtxSvc.ctx.ckeditor5Markers ) {
                                appCtxSvc.ctx.ckeditor5Markers = [];
                            }
                            appCtxSvc.ctx.ckeditor5Markers.push( marker );
                        }
                    } catch ( error ) {
                        //nothing to do here. cannot highlight comment because of invalid range
                    }
                } );
                var currentSpanInserted = document.querySelectorAll( 'span[id*="' + key + '"]' );
                for( var k = 0; k < currentSpanInserted.length; k++ ) {
                    if( currentSpanInserted[ k ] ) {
                        _markupTextInstance.setMarkupEventListeners( currentSpanInserted[ k ] );
                    }
                }
            }
        }
    }
    commentIdVsStartPath.clear();
    commentIdVsEndPath.clear();
}

/**
 *  @param {Object} node - ckeditor node
 */
function updateNodeToSkipCount( node ) {
    if( isImmediateBodyTextModelNode( node ) ) {
        var claaAttr = node._attrs.get( 'class' );
        if( claaAttr === 'ck ck-widget__selection-handle' || claaAttr === 'ck ck-reset_all ck-widget__type-around' ) {
            noOfElementToIgnore++;
        }
    }
}

/**
 *  @param {Object} node - ckeditor node
 */
function isTextModelNode( node ) {
    if( node && node._data ) {
        return true;
    }
    return false;
}

/**
 *  @param {Object} node - ckeditor node
 */
function isBodyTextNodeNode( node ) {
    if( node && node.name ) {
        return node.name === 'requirementBodyText';
    }
    return false;
}

/**
 *  @param {Object} node - ckeditor node
 */
function isImmediateBodyTextModelNode( node ) {
    if( node && isBodyTextNodeNode( node.parent ) ) {
        return true;
    }
    return false;
}

function getRequirementNode( node ) {
    if( !node || node.name === '$root' || node.name === 'requirement' ) {
        return null;
    }
    if( node.name === 'requirementBodyText' || node.name === 'requirementHeader' || node.name === 'requirementProperty' || node.name === 'requirementLovProperty' ) {
        return node;
    }
    return getRequirementNode( node.parent );
}

function getChildLovPropElement( node ) {
    for( var j = 0; j < node._children._nodes.length; j++ ) {
        if( node._children._nodes[ j ].name === 'requirementLovProperty' ) {
            return node._children._nodes[ j ];
        }
    }
}

function getRequirementContentElement( reqWidget ) {
    if( !reqWidget ) {
        return null;
    }

    for( var i = 0; i < reqWidget.childCount; i++ ) {
        for( var j = 0; j < reqWidget._children._nodes.length; j++ ) {
            if( reqWidget._children._nodes[ j ].name === 'requirementContent' ) {
                return reqWidget._children._nodes[ j ];
            }
        }
    }
}

/**
 *  @param {Object} node - ckeditor node
 */
function getRequirementBodyContent( requirmentContent ) {
    if( !requirmentContent ) {
        return null;
    }
    var widget = requirmentContent._children._nodes;
    for( var i = 0; i < widget.length; i++ ) {
        if( widget[ i ].name === 'requirementBodyText' ) {
            return widget[ i ];
        }
    }
}

/**
 * Remove markup spans if present
 * * @param {Object} widgetsToSave - widgets to save
 */
export let removeMarkupSpans = function( widgetsToSave ) {
    var textRoots = widgetsToSave.setContentInput;
    for( var i = 0; i < textRoots.length; i++ ) {
        if( textRoots[ i ] ) {
            var parentDiv = document.createElement( 'DIV' );
            parentDiv.innerHTML = textRoots[ i ].contents;
            removeMarkupSpansForRequirement( parentDiv );
        }
        if( parentDiv && parentDiv.innerHTML ) {
            textRoots[ i ].contents = parentDiv.innerHTML;
        }
    }
    widgetsToSave.setContentInput = textRoots;
};

/**
 * @param {Element} widgetToSave the requirement div to save
 */
function removeMarkupSpansForRequirement( widgetToSave ) {
    var children = widgetToSave.childNodes;
    for( var j = 0; j < children.length; j++ ) {
        var childNode = children[ j ];
        if( isText( childNode ) ) {
            removeMarkupSpan( childNode );
            arm0MarkupText.removeMarkupSpan( childNode );
        }
        if( childNode.childNodes.length > 0 ) {
            removeMarkupSpansForRequirement( childNode );
        }
    }
}

/**
 * Function to get string representation of the markups
 * @return {String} the markups string
 */
export function stringifyMarkups() {
    var markups = markupViewModel.getMarkups();
    return markupUtil._stringifyRequirementMarkup( markups );
}

/**
 * Checks whether the `node` is a
 * CKEDITOR.plugins.widget#editables
 *
 * @param {CKEDITOR.dom.node} node node
 *
 * @returns {Boolean} element present or not
 */
function isBodyContentElement( node ) {
    if( !node ) {
        return null;
    }
    if( node.className && node.className.indexOf( 'aw-requirement-bodytext' ) === 0 ) {
        return true;
    }
    return isBodyContentElement( node.parentNode );
}

/**
 * Remove markup span above a node
 *
 * @param {Node} node - the node to remove markup spans
 */
function removeMarkupSpan( node ) {
    var parent = node.parentNode;
    if( isMarkupSpan( parent ) ) {
        var grandParent = parent.parentNode;
        var prev = parent.previousSibling;
        var next = parent.nextSibling;
        var first = parent.firstChild;

        if( prev && prev.nodeName === 'SPAN' && next && next.nodeName === 'SPAN' && first && parent ) {
            prev.appendChild( first );
            for( var i = 0; i < next.childNodes.length; i++ ) {
                prev.appendChild( next.childNodes[ i ] );
            }
            grandParent.removeChild( parent );
            grandParent.removeChild( next );
        } else if( !prev && next && next.nodeName === 'SPAN' && first ) {
            if( next.childNodes.length > 0 ) {
                next.insertBefore( first, next.childNodes[ 0 ] );
                grandParent.removeChild( parent );
            }
        } else if( prev && prev.nodeName === 'SPAN' && !next && first ) {
            prev.appendChild( first );
            grandParent.removeChild( parent );
        }
    }
}

/**
 * Is object a root?
 *
 * @param {Node} obj The object to be tested
 * @param {boolean} ture if it is
 */
function isRoot( obj ) {
    return !isNaN( obj.rootIndex );
}

/**
 * Is object a span node with markups?
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isMarkupSpan( obj ) {
    return obj.nodeName === 'SPAN' && obj.id.indexOf( 'RM::Markup::' ) >= 0;
}

/**
 * Is object a text node?
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isText( obj ) {
    return obj.nodeType === 3;
}

/**
 * Is object a selectable text node? Ignore the inter-element white space
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isSelectableText( obj ) {
    return obj.nodeType === 3 && obj.parentNode.nodeType === 1 &&
        ( isMarkupSpan( obj.parentNode ) || obj.nodeValue.match( /\S+/ ) || !isInterElement( obj ) );
}

/**
 * Is object inter-element? Given that it is a white space text node
 *
 * @param {Node} obj The object to be tested
 *
 * @return {boolean} true if it is
 */
function isInterElement( obj ) {
    var prev = obj.previousSibling;
    var next = obj.nextSibling;
    var pElem = prev && !isText( prev ) && !isMarkupSpan( prev );
    var nElem = next && !isText( next ) && !isMarkupSpan( next );
    return pElem && nElem || pElem && !next || nElem && !prev;
}

/**
 * Get the first node under the current node
 *
 * @param {Node} node - the current node
 *
 * @return {Node} the first node
 */
function getFirstNode( node ) {
    var first = node;
    while( first.firstChild ) {
        first = first.firstChild;
    }

    return isSelectableText( first ) ? first : getNextNode( first );
}

/**
 * Get the next node following the current node
 *
 * @param {Node} node - the current node
 *
 * @return {Node} the next node
 */
function getNextNode( node ) {
    var next = node;
    while( next ) {
        if( isRoot( next ) ) {
            return null;
        } else if( next.nextSibling ) {
            return getFirstNode( next.nextSibling );
        }
        next = next.parentNode;
    }

    return null;
}

/**
 * Set Viewer Container for ckeditor and adjust coordinates
 ** @param {Object} viewerContainer - viewerContainer
 */
export let setViewerContainer = function( viewerContainer ) {
    _markupTextInstance.setViewerContainer( viewerContainer, false );
};

/**
 * Recalculate markups
 */
export let recalculateMarkups = function() {
    _markupTextInstance.recalcAllMarkupPositions();
};

/**
 * Returns Arm0MarkupText Instance
 ** @return {Object} Arm0MarkupText - Instance
 */
export let getMarkupTextInstance = function() {
    return _markupTextInstance;
};

/**
 * Shows comments panel
 */
export let showPanelforComments = function( markupCtx ) {
    markupService.showPanelforComments();
};

/**
 * Saves markup edit
 */
export let saveCommentEdit = function( data ) {
    markupService.saveMarkupEdit( data, true );
};

/**
 * Ends markup edit
 */
export let endCommentEdit = function( data ) {
    markupService.endCommentEdit( data );
};

/**
 * initialization for comments
 */
export let initializationForComments = function() {
    markupRequirement.initializeCallbacksforCk5();
    _markupTextInstance.setTextRoot();
    var reqMainPanel = document.querySelector( '.aw-requirements-mainPanel.aw-ckeditor-panel' );
    if( reqMainPanel ) {
        exports.setViewerContainer( reqMainPanel );
    }
    markupService.setLoginUser( true );
    markupViewModel.setRole( 'author' );
};

/**
 * shows the current selected markup
 */
export let markupSelected = function( eventData ) {
    markupService.commentSelected( eventData );
};

/**
 * Delete selected Markup
 */
export let deleteMarkup = function() {
    markupService.deleteComment();
};

/**
 * get Status of Comments
 */
export let getStatusComments = function( markup ) {
    return markupService.getStatusComments( markup, _markupTextInstance );
};

/**
 * compare status of comments
 */
export let compareStatusComments = function( markup0, markup1 ) {
    return markupViewModel.compareStatusComments( markup0, markup1 );
};

/**
 * populate user object in the comment object
 */
export let populateUserObjectInComment = function( userId, obj ) {
    markupViewModel.populateUserObjectInComment( userId, obj );
};

/**
 * load Users on Comments object
 */
export let loadUsersOnComments = function() {
    var markupCtx = appCtxSvc.getCtx( 'markup' );
    if( markupCtx && markupCtx.userNames && markupCtx.userNames.length > 0 ) {
        eventBus.publish( 'Arm0Markup.loadUsers' );
    }
};

/**
 * return the comments map
 */
export let getCommentsMap = function() {
    return commentsMap;
};

/**
 * set markup context
 * @param {Object} data - data
 */
export let initializationMarkupContext = function( data ) {
    markupUtil.setMarkupContext( data );
};

/************************************************************************************************************************
 * This section has functions necessary for Reuse Tool Integration
 * **********************************************************************************************************************
 */

/**
 * Get contents of the selected Requirement
 *
 */
export let getRequirementContent = function( data ) {
    var content = '';
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    var selectedElement = ckEditor.selectedRequirement[ 0 ];
    var newSelectedElement = ckEditor.newSelectedRequirement;
    var childrens;
    if( newSelectedElement ) {
        if( newSelectedElement._children._nodes ) {
            childrens = newSelectedElement._children._nodes;
        } else {
            childrens = newSelectedElement._children;
        }
        content = getContent( childrens, 'aw-requirement-content', false );
    } else if( selectedElement ) {
        childrens = selectedElement._children;
        content = getContent( childrens, 'aw-requirement-content', false );
    }
    return content + ' ';
};

function getContent( childrens, classToCheck, isHeader ) {
    var content = '';
    for( var i = 0; i < childrens.length; i++ ) {
        var sub = childrens[ i ];
        var classesList = sub._classes;
        if( classesList && classesList.entries() ) {
            var value = classesList.entries().next().value;
            if( value && value.includes( classToCheck ) ) {
                if( isHeader ) {
                    content = viewToPlainText( sub.getChild( 0 ).getChild( 1 ) );
                    break;
                } else {
                    content = viewToPlainText( sub.getChild( 0 ) );
                    break;
                }
            }
        }
    }
    return content;
}

/**
 * Converts {@link module:engine/view/item~Item view item} and all of its children to plain text.
 *
 * @param {module:engine/view/item~Item} viewItem View item to convert.
 * @returns {String} Plain text representation of `viewItem`.
 */
function viewToPlainText( viewItem ) {
    const smallPaddingElements = [ 'figcaption', 'li' ];
    let text = '';
    if( viewItem.is( 'text' ) || viewItem.is( 'textProxy' ) ) {
        // If item is `Text` or `TextProxy` simple take its text data.
        text = viewItem.data;
    } else if( viewItem.is( 'element', 'img' ) && viewItem.hasAttribute( 'alt' ) ) {
        // Special case for images - use alt attribute if it is provided.
        text = viewItem.getAttribute( 'alt' );
    } else {
        // Other elements are document fragments, attribute elements or container elements.
        // They don't have their own text value, so convert their children.
        let prev = null;
        for( const child of viewItem.getChildren() ) {
            const childText = viewToPlainText( child );
            // Separate container element children with one or more new-line characters.
            if( prev && ( prev.is( 'containerElement' ) || child.is( 'containerElement' ) ) ) {
                if( smallPaddingElements.includes( prev.name ) || smallPaddingElements.includes( child.name ) ) {
                    text += '\n';
                } else {
                    text += '\n\n';
                }
            }
            text += childText;
            prev = child;
        }
    }
    return text;
}

/**
 * Get header of the selected Requirement
 *
 */
export let getRequirementHeader = function( data ) {
    var content = '';
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    var selectedReq = ckEditor.selectedRequirement[ 0 ];
    var newSelectedElement = ckEditor.newSelectedRequirement;
    var childrens;
    if( newSelectedElement ) {
        if( newSelectedElement._children._nodes ) {
            childrens = newSelectedElement._children._nodes;
        } else {
            childrens = newSelectedElement._children;
        }
        content = getContent( childrens, 'aw-requirement-header', true );
    } else if( selectedReq ) {
        childrens = selectedReq._children;
        content = getContent( childrens, 'aw-requirement-header', true );
    }
    return content;
};

/**
 * Update the CkEditor instance
 *
 */
export let updateCKEditorInstance = function( qualityShown, calculateInProcess ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    ckEditor.RATData.CALCULATE_QUALITY_IN_PROCESS = calculateInProcess;
};

/**
 * showReqQualityData
 *
 */
export let showReqQualityData = function( data, _reConnecting ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
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
            data.ReuseSessionId = null;
            appCtxSvc.unRegisterCtx( 'showRequirementQualityData' );
            if( ckEditor ) {
                ckEditor.fire( 'disablePatternAssist' );
            }
            // Fire an event to resize editor once quality metric tables are hidden
            eventBus.publish( 'requirementsEditor.resizeEditor' );
            eventBus.unsubscribe( _registerEventQualityMetricTableHidden );
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
        if( ckEditor ) {
            ckEditor.fire( 'disablePatternAssist' );
        }
    }
    var selectedReqId = ckEditor.selectedRequirement && ckEditor.selectedRequirement.length > 0 ? ckEditor.selectedRequirement[ 0 ]._attrs.get( 'id' ) : '';
    if( selectedReqId.length > 0 && appCtxSvc.ctx.showRequirementQualityData ) {
        attachPatternAssistToggle( document.getElementById( selectedReqId ), ckEditor, false );
    }
};

/**
 * qualityRuleSelected
 *
 */
export let qualityRuleSelected = function( selectedRule ) {
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
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
export let clearHighlighting = function() {
    //not required for ckeditor 5
};

export let processAfterResponse = function( response ) {
    var instancesArray = [];
    var totalInvalidMetric = 0;
    var metricIdArray = [];
    var qualityData = response.qualityData;
    if( qualityData && qualityData.metricInvalid ) {
        _.forEach( qualityData.metricInvalid, function( metric ) {
            if( metric.metricValue && metric.instances.length !== 0 ) {
                var numberMetricValue = parseInt( metric.metricValue );
                totalInvalidMetric += numberMetricValue;
                var tempMetricInstance = metric.instances;
                tempMetricInstance.forEach( function( instance ) {
                    if( !_contains( instancesArray, instance ) ) {
                        instancesArray.push( instance );
                        metricIdArray.push( metric.metricId );
                    }
                } );
            }
        } );
    }
    var editorId = appCtxSvc.getCtx( 'AWRequirementsEditor' ).id;
    var ckEditor = ckeditorOperations.getCKEditorInstance( editorId, appCtxSvc.ctx );
    if( ckEditor ) {
        ckEditor.fire( 'updateCorrectionCount', totalInvalidMetric, instancesArray, metricIdArray );
    }
};

var _contains = function( array, item ) {
    for( var i in array ) {
        if( array[ i ] === item ) {
            return true;
        }
    }
    return false;
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
    var editor = ctx.AWRequirementsEditor.editor;
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
            newtemplate = new CKEDITOR5.template( safeTemplate );
            newtemplate = safeTemplate;
        }
        editor.config.objectTemplateGlobalMap.push( {
            realTypeName: realTypeName,
            template: newtemplate ? newtemplate : oldtemplate
            //template: newtemplate ? newtemplate : new CKEDITOR5.template( oldtemplate )
        } );
        if( template.toLowerCase() === realTypeName.toLowerCase() ) {
            var reqwidget = editor.widgets.registered.requirementWidget;
            reqwidget.template = newtemplate ? newtemplate : oldtemplate;
            //reqwidget.template = newtemplate ? newtemplate : new CKEDITOR5.template( oldtemplate );
        }
    }
};

export let downloadReqQualityReport = function( data ) {
    var jsonRequestData = {};
    jsonRequestData.sessionId = data.ReuseSessionId;
    jsonRequestData.reportRequirements = [];

    var plain_text = '';
    var obj_header = '';
    var url = '';
    var allwidgets = exports.getAllWidgets( appCtxSvc.ctx );
    for( let index = 0; index < allwidgets.length; index++ ) {
        obj_header = allwidgets[ index ].header;
        plain_text = allwidgets[ index ].content;
        url = '/' + data.ProductInfo.projectName + '/' + obj_header.split( ' ' )[ 0 ];
        url = url.replace( / /g, '' );
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

    return jsonRequestData;
};

export let getAllWidgets = function( ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;
    var doc = document;
    doc.innerHTML = editor.getData();
    var id;
    var header;
    var headerDomElement;
    var content;
    var contentDomElement;
    var widgets = [];
    var allRequirements = doc.getElementsByClassName( 'requirement' );
    for( let i = 0; i < allRequirements.length; i++ ) {
        id = allRequirements[ i ].getAttribute( 'id' );
        headerDomElement = allRequirements[ i ].getElementsByClassName( 'aw-requirement-header' );
        contentDomElement = allRequirements[ i ].getElementsByClassName( 'aw-requirement-content' );

        if( headerDomElement[ 0 ].innerText.indexOf( '|' ) > 0 ) {
            header = headerDomElement[ 0 ].innerText.substr( 0, headerDomElement[ 0 ].innerText.indexOf( '|' ) ).trim();
        } else {
            header = headerDomElement[ 0 ].innerText.trim();
        }
        content = contentDomElement[ 0 ].innerText.replace( /[\n\r]+|[\s]{2,}/g, ' ' ).trim();
        widgets.push( {
            header: header,
            headerDom: headerDomElement[ 0 ],
            content: content,
            contentDom: contentDomElement[ 0 ],
            id: id
        } );
    }
    return widgets;
};
/**
 * Method is used to identify and remove the comments from the dirty requirement
 *
 * @param  {Object} editor - The Editor Instance
 * @param  {Object} data - the view model data
 *
 */
const _removeDirtyMarkers = ( editor, data ) => {
    const markers = editor.model.markers._markers;
    let markUpInput = markupUtil.getCreateMarkupInput( data.content );
    markUpInput.forEach( element => {
        if( element.markups ) {
            let comments = JSON.parse( element.markups );
            comments.forEach( comment => {
                for( let [ key, value ] of markers.entries() ) {
                    if( key.indexOf( `comment:${comment.threadId}:` ) >= 0 ) {
                        editor.model.change( ( writer ) => {
                            try {
                                writer.removeMarker( key );
                            } catch ( error ) {
                                //do nothihing. marker not present
                            }
                        } );
                    }
                }
            } );
        }
    } );
};

/**
 * Get Html spec template
 *
 * @param {String} id- CKEditor ID
 * @return content of CKEditor
 */

export let getObjHtmlTemplate = function( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText ) {
    var objHtmlTemplate;
    if( objType === 'RequirementSpec' ) {
        //Top element name in HTML spec template should not be editable
        objHtmlTemplate = '<div class="requirement" hastracelink="FALSE" id="' + uniqueID + '" objecttype="' + objType + '" itemtype="' + objType + '" parentid="' + parentId + '" parenttype="' + parentType +
        '" parentItemType="' + parentType + '">' +

        '<div class = "aw-requirement-header" contenttype="TITLE" contenteditable="false" >' +
        '<h3><span class="aw-requirement-headerId aw-requirement-headerNonEditable" contenteditable="false">' +
         objName + '</span></h3>' +
        '</div>' +
        '<div class="aw-requirement-content" contenteditable="FALSE" style="outline:none;">' +
        updatedBodyText +
        '</div>' +
        '</div>';
    }else{
        objHtmlTemplate = '<div class="requirement" hastracelink="FALSE" id="' + uniqueID + '" objecttype="' + objType + '" itemtype="' + objType + '" parentid="' + parentId + '" parenttype="' + parentType +
        '" parentItemType="' + parentType + '">' +

        '<div class = "aw-requirement-header" contenttype="TITLE" contenteditable="false" >' +
        '<h3><span class="aw-requirement-headerId aw-requirement-headerNonEditable" contenteditable="false">' +
        strLevel + '</span><span><span class="aw-requirement-title aw-requirement-properties" contenteditable="true" internalname="object_name"> ' + objName + '</span></span></h3>' +
        '</div>' +
        '<div class="aw-requirement-content" contenteditable="FALSE" style="outline:none;">' +
        updatedBodyText +
        '</div>' +
        '</div>';
    }
    return objHtmlTemplate;
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
        if( div.childNodes && div.childNodes.length > 0 && div.childNodes[ 0 ].nodeType === Node.TEXT_NODE ) {
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
 * Gets the modified requirement div for checkout
 *
 * @param {String} id - CKEditor ID
 * @param {Object} changeEvent - changeEvent
 * @param {object} ctx - context object
 *
 * @return  requirement html element
 */

export let getSelectedReqDiv = function( id, changeEvent, ctx ) {
    var reqDiv;
    var widget;
    if( ctx.AWRequirementsEditor && ctx.AWRequirementsEditor.id === id && ctx.AWRequirementsEditor.editor ) {
        //one of the differ elements is requirement widget
        var differences = changeEvent.source.model.document.differ;
        var changes = differences && differences.getChanges();
        if( changes ) {
            for( var i = 0; i < changes.length; i++ ) {
                var position = changes[ i ].position;
                var ancestors = position && position.getAncestors();
                if( ancestors ) {
                    for( var i = 0; i < ancestors.length; i++ ) {
                        var modelElement = ancestors[ i ];
                        if( modelElement && modelElement.parent && modelElement.name === 'requirement' ) {
                            reqDiv = modelElement;
                            break;
                        }
                    }
                }
                if( reqDiv ) {
                    break;
                }
            }
        }
        if( !reqDiv || reqDiv.getAttribute( 'checkedoutby' ) ) {
            return null;
        }

        // Return if requirement is not dirty
        if( !_isRequirementDirty( reqDiv ) ) {
            return null;
        }
    }
    return {
        widget: widget,
        reqDiv: reqDiv
    };
};

/**
 * Return true if requirement header/bodytext/property is dirty for given requirement element
 */
var _isRequirementDirty = function( reqNode ) {
    for( var i = 0; i < reqNode._children._nodes.length; i++ ) {
        var childern = reqNode._children._nodes[ i ];
        if( childern && childern._children && childern._children._nodes.length > 0 ) {
            // Resursion on childs of these requirement elements are not required
            if( childern.name !== 'requirementMarker' && childern.name !== 'requirementHeader' && childern.name !== 'requirementBodyText' && childern.name !== 'requirementProperty' && childern.name !==
                'requirementLovProperty' ) {
                var h3 = _isRequirementDirty( childern );
                if( h3 ) {
                    return h3;
                }
            }
        }
        // Return true if requirement element is dirty
        if( childern && childern.getAttribute( 'isDirty' ) === true && ( childern.name === 'requirementHeader' || childern.name === 'requirementBodyText' || childern.name === 'requirementProperty' ||
                childern.name === 'requirementLovProperty' ) ) {
            return true;
        }
    }
};

/**
 * Cache original ckeditor content locally, one or more requirement content can be
 * cached.
 * @param {String} htmlContent - html content
 */
var _setOriginalReqHtml = function( htmlContent ) {
    var doc = document.createElement( 'div' );
    doc.innerHTML = htmlContent;
    var allwidgets = doc.getElementsByClassName( 'requirement' );
    for( var index = 0; index < allwidgets.length; index++ ) {
        var domElement = allwidgets[ index ];
        var reqId = domElement.getAttribute( 'id' );
        origCkeditorContentMap[ reqId ] = domElement.outerHTML;
    }
};
/**
 * Get original Requirement content
 * @param {String} idAttribute - requirement Element ID
 */
var _getOriginalReqHtml = function( idAttribute ) {
    return origCkeditorContentMap[ idAttribute ];
};
/**
 * Sets the contents of the widget to latest or makes it read-only after a failed checkout
 *
 * @param {String} id - CKEditor ID
 * @param {Object} reqDiv requirement html element
 * @param {IModelObject} reqRev requirement revision
 * @param {Widget} widget CKEditor widget representing the requirement
 * @param {Object} input input data
 * @param {object} ctx - context object
 */

export let setSelectedReqDivData = function( id, reqDiv, reqRev, widget, input, ctx ) {
    var editor = ctx.AWRequirementsEditor.editor;

    var idAttribute = reqDiv.getAttribute( 'id' );
    var bodyTextClass = 'aw-requirement-bodytext';

    var originalReqHtml = _getOriginalReqHtml( idAttribute );

    var originalReqDiv = document.createElement( 'div' );
    originalReqDiv.innerHTML = originalReqHtml;

    var ckeditorReqBodyText = originalReqDiv.getElementsByClassName( bodyTextClass )[ 0 ];
    var reqHeader = originalReqDiv.getElementsByClassName( 'aw-requirement-header' )[ 0 ];

    var currReqWidget = _getWidgetFromUid( editor, idAttribute );
    if( currReqWidget ) {
        editor.model.change( writer => {
            writer.removeAttribute( 'checkedoutby', currReqWidget );
            writer.removeAttribute( 'checkedouttime', currReqWidget );
        } );

        if( input.mode === 'reset' ) {
            if( input.checkedOutByUpd ) {
                editor.model.change( writer => {
                    writer.setAttribute( 'checkedoutby', input.checkedOutByUpd, currReqWidget );
                    writer.setAttribute( 'checkedouttime', reqRev.props.checked_out_date.uiValues[ 0 ], currReqWidget );
                } );
            }
            ckeditorReqBodyText.setAttribute( 'contentType', 'READONLY' );
            reqACEUtils.setReadOnlyForRequirement( input.data, originalReqDiv.firstElementChild );
            _updateRequirement( editor, currReqWidget, originalReqDiv.innerHTML, input.mode );
        } else {
            editor.model.change( writer => {
                writer.setAttribute( 'checkedoutby', reqRev.props.checked_out_user.uiValues[ 0 ], currReqWidget );
                writer.setAttribute( 'checkedouttime', reqRev.props.checked_out_date.uiValues[ 0 ], currReqWidget );
            } );

            if( input.contents !== '' ) {
                var reqSpan = document.createElement( 'div' );
                reqSpan.innerHTML = input.contents;
                var bodyText = reqSpan.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
                var titleText = reqSpan.getElementsByClassName( 'aw-requirement-header' )[ 0 ];

                ckeditorReqBodyText.outerHTML = bodyText.outerHTML;
                reqHeader.outerHTML = titleText.outerHTML;
                reqACEUtils.setReadOnlyForRequirement( null, originalReqDiv );
                _updateRequirement( editor, currReqWidget, originalReqDiv.innerHTML );
            } else {
                _updateRequirement( editor, currReqWidget, originalReqDiv.innerHTML );
            }
        }
    }
};

/**
 * Insert the CrossReference Link into the content
 *
 * @param {String} id - CKEditor ID
 * @param {String} reqObjectID - occurence id
 * @param {String} revID - revision id
 * @param {String} name - revision name
 * @param {String} iconURL - the icon URL
 * @param {object} ctx - context object
 */
export let insertCrossReferenceLink = function( id, reqObjectID, revID, name, iconURL, ctx ) {
    if( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === id && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        appCtxSvc.ctx.AWRequirementsEditor.editor.model.change( writer => {
            const htmlToInsert = '<div><p class=\'aw-requirement-crossRefLink\' revid="' + revID + '" occid="' + reqObjectID + '"><span>' + name + '</span></p></div><p></p>';
            const viewFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.processor.toView( htmlToInsert );
            const modelFragment = appCtxSvc.ctx.AWRequirementsEditor.editor.data.toModel( viewFragment );

            if( iconURL ) {
                const crossRefimage = writer.createElement( 'crossRefimage', {
                    src: iconURL,
                    class: 'aw-requirement-crossRefLink',
                    style: 'cursor:pointer;height:16px;width:16px;float:left;',
                    crossrefimg: 'test'
                } );
                const division = modelFragment.getChild( 0 );
                writer.insert( crossRefimage, writer.createPositionAt( division, 0 ) );
            }
            appCtxSvc.ctx.AWRequirementsEditor.editor.model.insertContent( modelFragment, appCtxSvc.ctx.AWRequirementsEditor.editor.model.document.selection );
        } );
    }
};

/**
 * Method to update the body text and attributes
 *  @param {String} bodyText - the body text html
 *  @param {String} uid - the uid of the object to update
 *  @param {Array} attrsToAdd - the array of attributes to add
 *  @param {Array} attrsToRemove - the array of attributes to remove
 *  @returns {Element} the requirement body text element
 */
export let updateBodyTextContentAndAttributes = function( bodyText, uid, attrsToAdd, attrsToRemove, isMaterChanged, isFrozenToLatestRev, data ) {
    var editor = getCKEditorInstance( appCtxSvc.ctx.AWRequirementsEditor.id );
    editor.ignoreDataChangeEvent = true;
    var currReqWidget = _getWidgetFromUid( editor, uid );
    if( !currReqWidget ) {
        return;
    }
    var originalHTML = _getOriginalReqHtml( uid );
    var element = document.createElement( 'div' );
    element.innerHTML = originalHTML;
    var reqBodyText = element.getElementsByClassName( 'aw-requirement-bodytext' )[ 0 ];
    reqBodyText.innerHTML = bodyText;
    updateAttributes( reqBodyText, attrsToAdd, true );
    updateAttributes( reqBodyText, attrsToRemove, false );
    var indicatorElement = element.getElementsByClassName( 'aw-requirement-readOnly' )[ 0 ];
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
    } else {
        indicatorElement.classList.remove( 'aw-requirements-frozenToLatest' );
        indicatorElement.classList.remove( 'aw-requirements-masterChanged' );
        indicatorElement.classList.add( 'aw-requirements-readOnly' );
        indicatorElement.setAttribute( 'title', localeTextBundle.UnfrozenTooltip );
    }
    replaceRequirement( editor, currReqWidget, element.innerHTML );
    editor.ignoreDataChangeEvent = false;
};

/**
 * Method to update the attributes on requirement body text element
 * @param {Element} reqBodyText - the body text element
 * @param {Array} attrs - the array of attributes
 * @param {Boolean} isAdd - the flag to decide whether to add or remove the attributes
 */
function updateAttributes( reqBodyText, attrs, isAdd ) {
    for( var i = 0; i < attrs.length; i++ ) {
        var attrObject = attrs[ i ];
        if( isAdd ) {
            reqBodyText.setAttribute( attrObject.attrName, attrObject.attrValue );
        } else {
            reqBodyText.removeAttribute( attrObject.attrName );
        }
    }
}

/**
 * Navigate to the cross referenced object
 *
 * @param {Object} crossRefLinkElement - cross referenced element
 * @param {String} id - CKEditor ID
 * @param {object} ctx - context object
 */
export let navigateToCrossReferencedObject = function( crossRefLinkElement, id, ctx ) {
    var revID = null;
    var occID = null;

    // This is for internal links
    if( crossRefLinkElement.isLink ) {
        revID = crossRefLinkElement.revisionid;
        occID = crossRefLinkElement.id;
    }else{
        revID = crossRefLinkElement && crossRefLinkElement.getAttribute( 'revid' );
        occID = crossRefLinkElement && crossRefLinkElement.getAttribute( 'occid' );
    }

    var editor = ctx.AWRequirementsEditor.editor;
    var widgetData = editor.model.document.getRoot();

    var objectDivElement;
    for( var iinstance = 0; iinstance < widgetData.childCount; iinstance++ ) {
        var selectedElement = widgetData.getChild( iinstance );
        var idSelEle = selectedElement.getAttribute( 'id' );

        var reqElement = cdm.getObject( idSelEle );
        var reqRevisionUid;
        if( reqElement && reqElement.props && reqElement.props.awb0UnderlyingObject ) {
            reqRevisionUid = reqElement.props.awb0UnderlyingObject.dbValues[ 0 ];
        }
        if( occID && idSelEle && occID === idSelEle || reqRevisionUid && revID === reqRevisionUid ) {
            objectDivElement = selectedElement;
            break;
        }
    }

    var openInNewTab = true;

    if( objectDivElement ) {
        var viewElement = editor.editing.mapper.toViewElement( objectDivElement );
        var view = editor.editing.view; //view.focus();
        var newselection = view.createSelection( viewElement, 0, { fake: true } );
        view.document.selection._setTo( newselection );
        view.scrollToTheSelection();

        var eventData = {
            objectsToSelect: [ { uid: occID } ]
        };
        eventBus.publish( 'aceElementsSelectionUpdatedEvent', eventData );
        openInNewTab = false;
    }
    if( openInNewTab ) {
        if( localeService ) {
            localeService.getTextPromise( 'RequirementsCommandPanelsMessages' ).then(
                function( textBundle ) {
                    var documentationTitle = textBundle.documentationTitle;
                    var urlToNavigate = browserUtils.getBaseURL();
                    var revisionId = crossRefLinkElement.isLink ? crossRefLinkElement.revisionid : crossRefLinkElement.getAttribute( 'revid' );
                    urlToNavigate = urlToNavigate + '#/com.siemens.splm.clientfx.tcui.xrt.showObject?uid=' + revisionId + '&spageId=' + documentationTitle;
                    window.open( urlToNavigate, '_blank' );
                } );
        }
    }
};

/*
 * Create input for exportToApplication soa
 *@param {appCtx} ctx the application context
 */
export let getSelectedDerivedObject = function( ctx ) {
    var selectedDerivedRev = [];
    var selected = getSelected( ctx );
    for( let index = 0; index < selected.length; index++ ) {
        var objectToProcess = {};
        var domElement = document.getElementById( selected[ index ].uid );
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
    var selected = getSelected( ctx );
    for( let index = 0; index < selected.length; index++ ) {
        var objectToProcess = {};
        var domElement = document.getElementById( selected[ index ].uid );
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
    var selected = getSelected( ctx );
    for( let index = 0; index < selected.length; index++ ) {
        var element = document.getElementById( selected[ index ].uid );
        var bodytext = element.getElementsByClassName( 'aw-requirement-bodytext' );
        var reqId = bodytext[ 0 ].getAttribute( 'masterreqname' ).split( /(.+)-/ )[ 1 ];
        data.requirementId.push( reqId );
        masterIdSRUid.set( reqId, selected[ index ].uid );
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
    } else {
        var selected = ctx.mselected;
    }
    return selected;
};

/*
 * Function to get selected objects
 *@param {appCtx} ckeId id the ckeditor
 */
 export let removePlaceholderWidgetOnAdd = function( ckeId, createInput ) {
    if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === ckeId && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
        let editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
        editor.ignoreDataChangeEvent = true;
        for ( var index = 0; index < createInput.length; index++ ) {
            let reqDomElement = document.getElementById( createInput[index].elementID );
            let reqViewElement = editor.editing.view.domConverter.domToView( reqDomElement );
            let reqModelElement = editor.editing.mapper.toModelElement( reqViewElement );
            editor.model.enqueueChange( 'transparent', writer => {
                writer.remove( reqModelElement );
            } );
        }
        editor.ignoreDataChangeEvent = false;
    }
};

/**
 * Function to update text value in the child of given node
 * @param {Object} editor  - editor instance
 * @param {Object} node - Parent node
 * @param {String} newValue - updated value
 * @param {String} attributeName - attribute Name
 */
 function _updateAttribute( editor, node, newValue, attributeName ) {
    editor.editing.model.change( writer => {
        writer.setAttribute( attributeName, newValue, node );
    } );
}

function _updateAttributeTransparent( editor, node, newValue, attributeName ) {
    editor.model.enqueueChange( 'transparent', writer => {
        writer.setAttribute( attributeName, newValue, node );
    } );
}

/**
 * Function to update text value in the child of given node
 * @param {Object} editor  - editor instance
 * @param {Object} node - Parent node
 * @param {String} newValue - updated value
 * @param {String} attributeName - attribute Name
 */
 function _updateModelAttribute( editor, node, newValue, attributeName ) {
    editor.model.change( writer => {
        writer.setAttribute( attributeName, newValue, node );
    } );
}

/**
* @param {*} node - contains the target node clicked
* @returns {*} node - contains the requirement node
*/
function getRequirementElement1( node ) {
    if ( !node ) {
        return null;
    }
    var classesList = node._classes;
    if ( classesList && classesList.entries() ) {
        var value = classesList.entries().next().value;
        if ( value && value.includes( 'requirement' ) ) {
            return node;
        }
    }
    return getRequirementElement1( node.parent );
}

 /**
  * Function to get selected objects
  * @param {object} editor -- ckeditor
  * @param {Array} createdObjects new created Obj
  * @param {Array} objectarr data Array
  * @param {String} nextSiblingUid existing sibling id
  * @param {Number} lengthOfDoc no of existing object
  * @param {Map} modelObjects map of model Objects
  * @param {String} paraNoOfNewObj paragraph number of old parent
  */
  function _promote( editor, createdObjects, objectarr, nextSiblingUid, lengthOfDoc, modelObjects ) {
     let modelPositionElement;
     if( nextSiblingUid ) {
         modelPositionElement = getCKEditorModelElementByUID( nextSiblingUid );
         if( !modelPositionElement ) {
             // Will not available in case of pagination and next location is in another page
            // let reqModelElements = getCKEditorModelElementsByUIDs( objectarr );
            // exports.removeWidgets( reqModelElements );
            // _.defer( function() {
            //     eventBus.publish( 'requirementDocumentation.handleLoadSelectedObjectContentFromServer' );
            // } );
            return;
         }
     } else {
         var editorRoot = editor.model.document.getRoot();
         modelPositionElement = editorRoot.getChild( editorRoot.childCount - 1 );
     }
     //to insert data in new place using model fragment(dom element) and remove old copy using model elememt
     editor.model.enqueueChange( 'transparent', writer => {
         let firstModelElement = getCKEditorModelElementByUID( objectarr[0] );
         let lastModelElement = getCKEditorModelElementByUID( objectarr[objectarr.length - 1] );
         let startPos = writer.createPositionAt( firstModelElement.root, firstModelElement.startOffset  );
         let endPos = writer.createPositionAt( lastModelElement.root, lastModelElement.endOffset  );
         let range = writer.createRange( startPos, endPos );
         if( nextSiblingUid ) {
             writer.move( range, writer.createPositionBefore( modelPositionElement ) );
         } else {
             if( lastModelElement !== modelPositionElement ) { // if same, no need to move
                 writer.move( range, writer.createPositionAfter( modelPositionElement ) );   // Insert at end
             }
         }

         for ( var index = 0; index < objectarr.length; index++ ) {
             var deletedObj = objectarr[index];
             var createdObj = modelObjects[createdObjects[index]];
             var element = document.getElementById( deletedObj );
             let modelElement = getCKEditorModelElementByUID( deletedObj );
             if( element.tagName !== 'LOADING' ) {
                var reqHeaderString = element.getElementsByClassName( 'aw-requirement-headerNonEditable' )[0].innerText.split( ' ' )[1];
                const rangeReq = editor.model.createRangeIn( modelElement );
                for ( var item of rangeReq.getItems() ) {
                    if ( item.name && item.name === 'requirementHeader' ) {
                        writer.setAttribute( 'requirementNamePrefix', createdObj.props.arm1ParaNumber.dbValues[0] + ' ' + reqHeaderString, item );
                    }
                }
             }
             writer.setAttribute( 'parentid', createdObj.props.awb0Parent.dbValues[0], modelElement );
             writer.setAttribute( 'id', createdObj.uid, modelElement );
         }
     } );
 }

 /**
  * Function to get selected objects
  * @param {object} editor -- ckeditor
  * @param {object} createdObjects new created Obj
  * @param {Array} objectarr data Array
  * @param {Map} modelObjects map of model Objects
  * @param {String} parentIdOfCreatedObj new Parent id
  * @param {String} paraNoOfNewObj paragraph number of old parent
  * @param {String} underlyingObject underlyingObject uid
  */
  function _demote( editor, createdObjects, objectarr, modelObjects ) {
     //to insert data in new place using model fragment(dom element) and remove old copy using model elememt
     editor.model.enqueueChange( 'transparent', writer => {
         for ( var index = 0; index < objectarr.length; index++ ) {
             var deletedObj = objectarr[index];
             var createdObj = modelObjects[createdObjects[index]];
             var element = document.getElementById( deletedObj );
             let reqObject = getCKEditorModelElementByUID( deletedObj );
             if( element.tagName !== 'LOADING' ) {
                var reqHeaderString = element.getElementsByClassName( 'aw-requirement-headerNonEditable' )[0].innerText.split( ' ' )[1];
                const rangeReq = editor.model.createRangeIn( reqObject );
                for ( var item of rangeReq.getItems() ) {
                    if ( item.name && item.name === 'requirementHeader' ) {
                        writer.setAttribute( 'requirementNamePrefix', createdObj.props.arm1ParaNumber.dbValues[0] + ' ' + reqHeaderString, item );
                    }
                }
             }
             writer.setAttribute( 'parentid', createdObj.props.awb0Parent.dbValues[0], reqObject );
             writer.setAttribute( 'id', createdObj.uid, reqObject );
         }
     } );
 }

 /**
  * Function to get selected objects
  * @param {object} editor -- ckeditor
  * @param {object} newSib type Move Up/Move Down/Promote/Demote
  * @param {Array} objectarr data Array
  */
  function _moveUp( editor, newSib, objectarr ) {
     let modelPositionElement = getCKEditorModelElementByUID( newSib );
     if( !modelPositionElement ) {
        // Will not available in case of pagination and next location is in another page
        // let reqModelElements = getCKEditorModelElementsByUIDs( objectarr );
        // exports.removeWidgets( reqModelElements );
        _.defer( function() {
            eventBus.publish( 'requirementDocumentation.handleLoadSelectedObjectContentFromServer' );
        } );
        return;
     }

     //to insert data in new place using model fragment(dom element) and remove old copy using model elememt
     editor.model.enqueueChange( 'transparent', writer => {
         let firstModelElement = getCKEditorModelElementByUID( objectarr[0] );
         let lastModelElement = getCKEditorModelElementByUID( objectarr[objectarr.length - 1] );
         let startPos = writer.createPositionAt( firstModelElement.root, firstModelElement.startOffset  );
         let endPos = writer.createPositionAt( lastModelElement.root, lastModelElement.endOffset  );
         let range = writer.createRange( startPos, endPos );
         writer.move( range, writer.createPositionBefore( modelPositionElement ) );

        _.defer( function() {
            var loadingObj = document.getElementById( objectarr[0] );
            if( loadingObj ) {
                loadingObj.scrollIntoView();
            }
        } );
     } );
 }

 /**
  * Function to get selected objects
  * @param {object} editor -- ckeditor
  * @param {object} newSib type Move Up/Move Down/Promote/Demote
  * @param {Array} objectarr data Array
  */
 function _moveDown( editor, newSib, objectarr ) {
     let modelPositionElement;

     if( newSib ) {
         modelPositionElement = getCKEditorModelElementByUID( newSib );
         if( !modelPositionElement ) {
            // Will not available in case of pagination and next location is in another page
            // let reqModelElements = getCKEditorModelElementsByUIDs( objectarr );
            // exports.removeWidgets( reqModelElements );
            _.defer( function() {
                eventBus.publish( 'requirementDocumentation.handleLoadSelectedObjectContentFromServer' );
            } );
            return;
         }
     } else {
         var editorRoot = editor.model.document.getRoot();
         modelPositionElement = editorRoot.getChild( editorRoot.childCount - 1 );
     }

     //to insert data in new place using model fragment(dom element) and remove old copy using model elememt
     editor.model.enqueueChange( 'transparent', writer => {
         let firstModelElement = getCKEditorModelElementByUID( objectarr[0] );
         let lastModelElement = getCKEditorModelElementByUID( objectarr[objectarr.length - 1] );
         let startPos = writer.createPositionAt( firstModelElement.root, firstModelElement.startOffset  );
         let endPos = writer.createPositionAt( lastModelElement.root, lastModelElement.endOffset  );
         let range = writer.createRange( startPos, endPos );
         if( newSib ) {
             writer.move( range, writer.createPositionBefore( modelPositionElement ) );
         } else {
             writer.move( range, writer.createPositionAfter( modelPositionElement ) );   // Insert at end
         }

         _.defer( function() {
            var loadingObj = document.getElementById( objectarr[0] );
            if( loadingObj ) {
                loadingObj.scrollIntoView();
            }
        } );
     } );
 }

 /**
  * Function to get selected objects
  * @param {object} siblingArray -- ckeditor
  * @param {object} operationType type Move 1(Up)/ 2(Down)/ 3(Promote)/ 4(Demote)
  * @param {Array} createdElement data Array
  * @param {Array} modelObjects data Array
  * @param {Array} reqUID data Array
  * @return {Object} object --
  */
  function _getNextDomSiblingObj( siblingArray, operationType, createdElement, modelObjects, reqUID ) {
      let noOfSibling = siblingArray.length;
      let newSibFromServer;
     for ( var i = 0; i < noOfSibling; i++ ) {
         var reqObject = siblingArray[i];
         if ( ( operationType === 1 || operationType === 2 ) && reqObject.childElement.uid === reqUID && i < noOfSibling - 1 ) {
             newSibFromServer = siblingArray[i + 1].childElement.uid;
             break;
         }else if ( ( operationType === 3 || operationType === 4 ) && createdElement && createdElement[0] && reqObject.childElement.uid === createdElement[0] ) {
             if ( i < noOfSibling - 1 ) {
                 newSibFromServer = siblingArray[i + 1].childElement.uid;
             }
         }
     }
     return { newSibFromServer: newSibFromServer };
  }

 /*
  * Function to get selected objects
  * @param {appCtx} ckeId id the ckeditor
  * @param {operationType} Operation type Move 1(Up)/ 2(Down)/ 3(Promote)/ 4(Demote)
  * @param {siblingArray} sibling data Array
  * @param {createdElement} created Element data
  * @param {Map} modelObjects
  */
 export let replaceWidgetOnMove = function( ckeId, eventData ) {
     if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === ckeId && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
         let operationType = eventData.operationType;
         let siblingArray = eventData.siblingArray;
         let createdElement = eventData.createdElement || '';
         let modelObjects = eventData.modelObjects || '';
         if ( appCtxSvc.ctx.AWRequirementsEditor.id === ckeId && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
             let editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
             let reqUID = eventData.movedObject.uid;
             var flag = 0;
             var requirementDivElements = document.getElementsByClassName( 'requirement' );
             var objectarr = [];
             var parentMap = {};
             let lengthOfDoc = requirementDivElements.length;
             var detailsObj = _getNextDomSiblingObj( siblingArray, operationType, createdElement, modelObjects, reqUID );

             for ( var ind = 0; ind < lengthOfDoc; ind++ ) {
                 var requirementDiv = requirementDivElements[ind];
                 var idAttribute = requirementDiv.getAttribute( 'id' );
                 if ( idAttribute === reqUID ) {
                     parentMap[idAttribute] = idAttribute;
                     objectarr.push( idAttribute );
                     flag = 1;
                     continue;
                 }
                 if ( flag === 1 ) {
                     var parentIdAttribute = requirementDiv.getAttribute( 'parentid' );
                     if ( parentMap[parentIdAttribute] ) {
                         objectarr.push( idAttribute );
                         parentMap[idAttribute] = idAttribute;
                     } else {
                         flag = 0;
                         break;
                     }
                 }
             }

             if ( operationType === 1 ) {
                 _moveUp( editor, detailsObj.newSibFromServer, objectarr );
             }else if ( operationType === 2 ) {
                 _moveDown( editor, detailsObj.newSibFromServer, objectarr );
             }else if ( operationType === 4 ) {
                 _demote( editor, createdElement, objectarr, modelObjects );
             } else if ( operationType === 3 ) {
                 _promote( editor, createdElement, objectarr, detailsObj.newSibFromServer, lengthOfDoc, modelObjects );
             }
             _.defer( function() {
                eventBus.publish( 'requirementDocumentation.checkForLoadingOnViewPort' );
             } );
         }
     }
 };

 export let removeWidgets = function( reqModelElements ) {
    let editor = appCtxSvc.ctx.AWRequirementsEditor.editor;
    editor.ignoreDataChangeEvent = true;
    editor.model.enqueueChange( 'transparent', writer => {
        for ( var index = 0; index < reqModelElements.length; index++ ) {
            let reqModelElement = reqModelElements[index];
            if( reqModelElement ) {
                writer.remove( reqModelElement );
            }
        }
    } );
     editor.ignoreDataChangeEvent = false;
  };

 /*
  * Function to get selected objects
  *@param {appCtx} ckeId id the ckeditor
  */
 export let removeWidgetsOnOperation = function( ckeId, removedObjects, operatioName ) {
     if ( appCtxSvc.ctx.AWRequirementsEditor && appCtxSvc.ctx.AWRequirementsEditor.id === ckeId && appCtxSvc.ctx.AWRequirementsEditor.editor ) {
         var idsToBeReplaced;
         if( operatioName === 'remove' ) {
             idsToBeReplaced = Array.from( removedObjects ).map( s=>s.uid );
         }
         if( operatioName === 'add' ) {
             idsToBeReplaced = Array.from( removedObjects ).map( s=>s.elementID );
         }
         let reqModelElements = getCKEditorModelElementsByUIDs( idsToBeReplaced );
         exports.removeWidgets( reqModelElements );
     }
 };

 /**
  * Service for ckEditorUtils.
  *
  * @member ckEditor5Utils
  */
 export default exports = {
    getCKEditorModelElementsByUIDs,
    getCKEditorModelElementByUID,
    replaceObjectPlaceHolderWithContent,
    replacePlaceHolderObjectWithCreated,
    setCKEditorContent,
    getCKEditorContent,
    checkCKEditorDirty,
    setCkeditorDirtyFlag,
    insertImage,
    insertOLE,
    setCkeditorChangeHandler,
    setScrollEventForViewPort,
    removeScrollEventForViewPort,
    getCKEditorInstance,
    setCKEditorContentAsync,
    clearQualityHighlighting,
    getWidgetData,
    setCkeditorUndoHandler,
    isObjectVisibleInEditor,
    getElementForUpdatedParaNumberProp,
    getPropertiesFromEditor,
    updateObjectProperties,
    updateAttributesInBulk,
    scrollCKEditorToGivenObject,
    resetUndo,
    updateHtmlDivs,
    setCKEditorSafeTemplate,
    getRequirementContent,
    getRequirementHeader,
    updateCKEditorInstance,
    showReqQualityData,
    qualityRuleSelected,
    clearHighlighting,
    downloadReqQualityReport,
    getAllWidgets,
    getObjHtmlTemplate,
    getAllWidgetData,
    getSelectedReqDiv,
    setSelectedReqDivData,
    insertCrossReferenceLink,
    navigateToCrossReferencedObject,
    renderComment,
    initialiseMarkupInput,
    highlightComments,
    removeMarkupSpans,
    setViewerContainer,
    recalculateMarkups,
    getWidePanelWidgetData,
    updateOriginalContentsMap,
    makeRequirementEditable,
    showPanelforComments,
    saveCommentEdit,
    endCommentEdit,
    initializationForComments,
    markupSelected,
    deleteMarkup,
    getStatusComments,
    stringifyMarkups,
    getMarkupTextInstance,
    updateBodyTextContentAndAttributes,
    compareStatusComments,
    populateUserObjectInComment,
    loadUsersOnComments,
    getCommentsMap,
    initializationMarkupContext,
    getSelectedDerivedObject,
    getSRIdOfSelected,
    getMapOfMasterIdSRUid,
    getSelected,
    removePlaceholderWidgetOnAdd,
    replaceWidgetOnMove,
    removeWidgets,
    getIdFromCkeModelElement
};

app.factory( 'ckEditor5Utils', () => exports );
