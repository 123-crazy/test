// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/**
 * Defines the ckeditor operation to dispatch ckeditor4 or ckeditor5
 *
 * @module js/ckeditorOperations
 */

/*global
 */

import AwPromiseService from 'js/awPromiseService';

'use strict';

var operation = null;
var operationPromise = null;

/**
 * @returns {Object} - Ckeditor4 utils instance
 */
 function _loadCkeditorUtils4() {
    return import( 'js/ckEditorUtils' );
}

/**
 * @returns {Object} - Ckeditor5 utils instance
 */
 function _loadCkeditorUtils5() {
    return import( 'js/ckEditor5Utils' );
}

/**
 * Initializ the module, set the current operation
 *
 * @param {String} ckeditorType ckeditor4 or ckeditor5
 */
export function init( ckeditorType ) {
    operationPromise = new Promise( ( resolve ) => {
        if( ckeditorType === 'CKEDITOR_5' ) {
            _loadCkeditorUtils5().then(
                function( response ) {
                    operation = response;
                    resolve();
                } );
        } else {
            _loadCkeditorUtils4().then(
                function( response ) {
                    operation = response;
                    resolve();
                } );
        }
    } );
}

/**
 * Function to make sure that ckeditor utils loaded
 */
export let isCkeditorOperationLoaded = function() {
    var deferred = AwPromiseService.instance.defer();
    operationPromise.then(
        function() {
            deferred.resolve();
        } );
    return deferred.promise;
};

export let getOperation = function( ) {
    return operation;
};

export let setOperation = function( utilOperation ) {
    return operation = utilOperation;
};

let exports;

export let setCKEditorContent = function( id, content, ctx ) {
    operation && operation.setCKEditorContent( id, content, ctx );
};

export let getCKEditorContent = function( id, ctx ) {
    return operation.getCKEditorContent( id, ctx );
};

export let checkCKEditorDirty = function( id, ctx ) {
    return operation && operation.checkCKEditorDirty( id, ctx );
};

export let setCkeditorDirtyFlag = function( id, ctx, flagForClose ) {
    return operation && operation.setCkeditorDirtyFlag( id, ctx, flagForClose );
};

export let insertImage = function( id, imageURL, img_id, ctx ) {
    operation && operation.insertImage( id, imageURL, img_id, ctx );
};

export let insertOLE = function( id, ole_id, thumbnailURL, fileName, type, ctx ) {
    operation && operation.insertOLE( id, ole_id, thumbnailURL, fileName, type, ctx );
};

export let setCkeditorChangeHandler = function( id, clickHandler, ctx ) {
    operation && operation.setCkeditorChangeHandler( id, clickHandler, ctx );
};

export let setScrollEventForViewPort = function( id, scrollHandler ) {
    operation && operation.setScrollEventForViewPort( id, scrollHandler );
};

export let removeScrollEventForViewPort = function( id, scrollHandler ) {
    operation && operation.removeScrollEventForViewPort( id, scrollHandler );
};

export let getCKEditorInstance = function( id, ctx ) {
    if( operation ) {
        return operation.getCKEditorInstance( id, ctx );
    }
};

export let getElementById = function( ckeditorId, elementId ) {
    return operation.getElementById( ckeditorId, elementId );
};

export let getIdFromCkeModelElement = function( ckeelement ) {
    return operation.getIdFromCkeModelElement( ckeelement );
};

export let setCKEditorContentAsync = function( id, content, ctx ) {
    if( operation ) {
        return operation.setCKEditorContentAsync( id, content, ctx );
    }
        return new Promise( ( resolve ) => {
            operationPromise.then(
                function() {
                    operation.setCKEditorContentAsync( id, content, ctx ).then(
                        function() {
                            resolve();
                        } );
                } );
        } );
};

export let clearQualityHighlighting = function( id, ctx ) {
    operation && operation.clearQualityHighlighting( id, ctx );
};

export let getWidgetData = function( id, ctx, data ) {
    if( operation ) {
        return operation.getWidgetData( id, ctx, data );
    }
};

export let getWidePanelWidgetData = function( id, ctx ) {
    if( operation ) {
        return operation.getWidePanelWidgetData( id, ctx );
    }
};

export let getAllWidgetData = function( id, ctx ) {
    return operation.getAllWidgetData( id, ctx );
};
export let setCkeditorUndoHandler = function( id, undoHandler, ctx ) {
    operation && operation.setCkeditorUndoHandler( id, undoHandler, ctx );
};

export let scrollCKEditorToGivenObject = function( id, objectUid, ctx ) {
    operation && operation.scrollCKEditorToGivenObject( id, objectUid, ctx );
};

export let resetUndo = function( id, ctx ) {
    operation && operation.resetUndo( id, ctx );
};

export let isObjectVisibleInEditor = function( id, objId, ctx ) {
    return operation && operation.isObjectVisibleInEditor( id, objId, ctx );
};

export let getPropertiesFromEditor = function( id, objId ) {
    return operation.getPropertiesFromEditor( id, objId );
};

export let getElementForUpdatedParaNumberProp = function( ckeditorModelEle, updatedParaNumber ) {
    return operation.getElementForUpdatedParaNumberProp( ckeditorModelEle, updatedParaNumber );
};

export let updateObjectProperties = function( id, objId, updatedProperties, data ) {
    operation.updateObjectProperties( id, objId, updatedProperties, data );
};

export let updateAttributesInBulk = function( updatedObjects ) {
    operation.updateAttributesInBulk( updatedObjects );
};

export let setCKEditorSafeTemplate = function( id, template, templateMap, ctx ) {
    operation && operation.setCKEditorSafeTemplate( id, template, templateMap, ctx );
};

export let updateHtmlDivs = function( id, updatedObjects, updatedContents, ctx ) {
        operation && operation.updateHtmlDivs( id, updatedObjects, updatedContents, ctx );
};

/**
 * Method to update the widget locally when user overwrite the object in derived specification
 * @param {Object} ctx the active workspace contect object
 */
export let makeRequirementEditable = function( ctx ) {
    operation && operation.makeRequirementEditable( ctx );
};

export let getObjHtmlTemplate = function( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText ) {
    return operation && operation.getObjHtmlTemplate( objName, strLevel, objType, uniqueID, parentId, parentType, updatedBodyText );
};

export let getRequirementContent = function( data ) {
    return operation && operation.getRequirementContent( data );
};

export let getRequirementHeader = function( data ) {
    return operation && operation.getRequirementHeader( data );
};

export let updateCKEditorInstance = function( qualityShown, calculateInProcess ) {
    operation && operation.updateCKEditorInstance( qualityShown, calculateInProcess );
};

export let showReqQualityData = function( data, _reConnecting ) {
    operation && operation.showReqQualityData( data, _reConnecting );
};

export let qualityRuleSelected = function( selectedRule ) {
    operation && operation.qualityRuleSelected( selectedRule );
};

export let clearHighlighting = function( ) {
    operation && operation.clearHighlighting( );
};

export let processAfterResponse = function( response ) {
    operation && operation.processAfterResponse( response );
};

export let downloadReqQualityReport = function( data ) {
    return operation && operation.downloadReqQualityReport( data );
};

export let getAllWidgets = function( data ) {
    return operation && operation.getAllWidgets( data );
};

export let getSelectedReqDiv = function( id, changeEvent, ctx ) {
    return operation && operation.getSelectedReqDiv( id, changeEvent, ctx );
};

export let setSelectedReqDivData = function( id, reqDiv, reqRev, widget, input, ctx ) {
    operation && operation.setSelectedReqDivData( id, reqDiv, reqRev, widget, input, ctx );
};

export let insertCrossReferenceLink = function( id, reqObjectID, revID, name, iconURL, ctx ) {
    operation && operation.insertCrossReferenceLink( id, reqObjectID, revID, name, iconURL, ctx );
};

export let navigateToObject = function( crossRefLinkElement, id, ctx ) {
    operation && operation.navigateToCrossReferencedObject( crossRefLinkElement, id, ctx );
};

export let renderComment = function( newMarkup, markupList, allMarkups ) {
    operation && operation.renderComment( newMarkup, markupList, allMarkups );
};

export let initialiseMarkupInput = function( reqMarkupCtx ) {
    operation && operation.initialiseMarkupInput( reqMarkupCtx );
};

export let removeMarkupSpans = function( widgetsToSave ) {
    operation && operation.removeMarkupSpans( widgetsToSave );
};

export let handleMarkupDeleted = function( eventData ) {
    operation && operation.handleMarkupDeleted( eventData );
};

export let setViewerContainer = function( viewerContainer ) {
    operation && operation.setViewerContainer( viewerContainer );
};

export let recalculateMarkups = function(  ) {
    operation && operation.recalculateMarkups( );
};

export let getMarkupTextInstance = function(  ) {
    return operation && operation.getMarkupTextInstance( );
};

export let showPanelforComments = function( ) {
    operation && operation.showPanelforComments( );
};

export let saveCommentEdit = function( data ) {
    operation && operation.saveCommentEdit( data );
};

export let endCommentEdit = function( data ) {
    operation && operation.endCommentEdit( data );
};

export let initializationForComments = function() {
    operation && operation.initializationForComments();
};

export let markupSelected = function( eventData ) {
    operation && operation.markupSelected( eventData );
};

export let deleteMarkup = function( ) {
    operation && operation.deleteMarkup( );
};

export let getStatusComments = function( markup ) {
    return operation && operation.getStatusComments( markup );
};

export let compareStatusComments = function( markup0, markup1  ) {
    return operation && operation.compareStatusComments( markup0, markup1  );
};

export let populateUserObjectInComment = function( userId, obj  ) {
    operation && operation.populateUserObjectInComment( userId, obj );
};

export let loadUsersOnComments = function( ) {
    operation && operation.loadUsersOnComments( );
};

export let initializationMarkupContext = function( data ) {
    operation && operation.initializationMarkupContext( data );
};

/**
 * Function to get string representation of the markups
 * @return {String} the markups string
 */
export function stringifyMarkups() {
    return operation && operation.stringifyMarkups();
}

/**
 * Update initial data in map
 *
 *  @param {Object} htmlContent - html Content
 */
export let updateOriginalContentsMap = function( htmlContent ) {
    operation && operation.updateOriginalContentsMap &&
    operation.updateOriginalContentsMap( htmlContent );
};

export let updateBodyTextContentAndAttributes = function( body_text, uid, attrsToAdd, attrsToRemove, isMaterChanged, isFrozenToLatestRev ) {
    if( operation ) {
        operation.updateBodyTextContentAndAttributes( body_text, uid, attrsToAdd, attrsToRemove, isMaterChanged, isFrozenToLatestRev );
    }
};

/**
 * Function to create input for exportToApplication soa
 * @return {array} returns array of selected derived objects
 */
export let getSelectedDerivedObject = function( ctx ) {
    return operation && operation.getSelectedDerivedObject( ctx );
};
/**
 * Function to get selected SRUid to update its content
 * @return {array} return array of selected SRUID
 */
export let getSRIdOfSelected = function( ctx ) {
    return operation && operation.getSRIdOfSelected( ctx );
};
/**
 * Function to get map of masterRevId and SRUid of selected derived object
 * @return {map} returns map of Master Id and selected SRUID
 */
export let getMapOfMasterIdSRUid = function( ctx, data ) {
    return operation && operation.getMapOfMasterIdSRUid( ctx, data );
};
/*
 * Function to get selected objects
 *@param {appCtx} ctx the application context
 */
export let getSelected = function( ctx ) {
    return operation && operation.getSelected( ctx );
};

export let replaceObjectPlaceHolderWithContent = function( id, content, ctx ) {
    return operation && operation.replaceObjectPlaceHolderWithContent( id, content, ctx );
};

export let replacePlaceHolderObjectWithCreated = function( id, placeHolderObjectUid, createdObjContent ) {
    return operation && operation.replacePlaceHolderObjectWithCreated( id, placeHolderObjectUid, createdObjContent );
};

/*
 * Function to replace objects
 *@param {appCtx} ckeid id the ckeditor
 */
 export let removePlaceholderWidgetOnAdd = function( ckeid, createInput ) {
    return operation && operation.removePlaceholderWidgetOnAdd( ckeid, createInput );
};

/**
 * Function to replace objects
 * @param {appCtx} ckeid id the ckeditor
 * @param {eventData} eventData -
 * @return {function} ckeditorutils file and its implementation
 */
 export let replaceWidgetOnMove = function( ckeid, eventData ) {
    return operation && operation.replaceWidgetOnMove( ckeid, eventData );
};

export let getOccurenceIDforRevision = function( revId ) {
    return operation && operation.getOccurenceIDforRevision( revId );
};

export let removeWidgetsOnOperation = function( ckeid, removedObjects, operatioName ) {
    return operation && operation.removeWidgetsOnOperation( ckeid, removedObjects, operatioName );
};

export let getCKEditorModelElementsByUIDs = function( uids ) {
    return operation && operation.getCKEditorModelElementsByUIDs( uids );
};

export let getCKEditorModelElementByUID = function( uid ) {
    return operation && operation.getCKEditorModelElementByUID( uid );
};

export let initialiseAdditionalMarkupInput = function( reqMarkupCtx ) {
    operation && operation.initialiseAdditionalMarkupInput( reqMarkupCtx );
};

/**
 * Service for ckEditorUtils.
 *
 * @member ckeditorOperations
 */
export default exports = {
    init,
    isCkeditorOperationLoaded,
    getOperation,
    setOperation,
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
    getElementById,
    getIdFromCkeModelElement,
    setCKEditorContentAsync,
    clearQualityHighlighting,
    getWidgetData,
    getWidePanelWidgetData,
    setCkeditorUndoHandler,
    scrollCKEditorToGivenObject,
    resetUndo,
    isObjectVisibleInEditor,
    getElementForUpdatedParaNumberProp,
    getPropertiesFromEditor,
    updateObjectProperties,
    updateAttributesInBulk,
    setCKEditorSafeTemplate,
    updateHtmlDivs,
    getRequirementContent,
    getRequirementHeader,
    updateCKEditorInstance,
    showReqQualityData,
    qualityRuleSelected,
    clearHighlighting,
    processAfterResponse,
    downloadReqQualityReport,
    getAllWidgets,
    getObjHtmlTemplate,
    getAllWidgetData,
    getSelectedReqDiv,
    setSelectedReqDivData,
    insertCrossReferenceLink,
    navigateToObject,
    renderComment,
    initialiseMarkupInput,
    removeMarkupSpans,
    handleMarkupDeleted,
    setViewerContainer,
    recalculateMarkups,
    updateOriginalContentsMap,
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
    getSelectedDerivedObject,
    initializationMarkupContext,
    getSRIdOfSelected,
    getMapOfMasterIdSRUid,
    getSelected,
    replaceObjectPlaceHolderWithContent,
    replacePlaceHolderObjectWithCreated,
    removePlaceholderWidgetOnAdd,
    replaceWidgetOnMove,
    getOccurenceIDforRevision,
    removeWidgetsOnOperation,
    getCKEditorModelElementsByUIDs,
    getCKEditorModelElementByUID,
    initialiseAdditionalMarkupInput
};
