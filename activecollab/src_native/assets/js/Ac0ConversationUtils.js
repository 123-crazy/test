// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0ConversationUtils
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import browserUtils from 'js/browserUtils';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import fmsUtils from 'js/fmsUtils';
import uwPropSvc from 'js/uwPropertyService';
import _ from 'lodash';
import AwPromiseService from 'js/awPromiseService';
import soa from 'soa/kernel/soaService';
import ac0CreateConvSvc from 'js/Ac0CreateCollabObjectService';
import AwTimeoutService from 'js/awTimeoutService';
import viewModelObjectSvc from 'js/viewModelObjectService';

var exports = {};

var LESS_CHARACTER_LIMIT = 131;

var stripHtmlTagsFromRichText = function( richTextToClean ) {
    var htmlTagsRegex = /<(?!\/?figure|img(?=>|\s.*>))\/?.*?>/g;
    var removeOpenSpanTags = /<span[^/>]*>*/g;
    return richTextToClean.replaceAll( htmlTagsRegex, '' ).replaceAll( removeOpenSpanTags, '' );
};

export let processRichText = function( richText ) {
    var curtailedRichTextObj = {};
    curtailedRichTextObj.curtailRichText = '';
    curtailedRichTextObj.showMore = false;

    var strippedRichText = stripHtmlTagsFromRichText( richText );
    if( strippedRichText.length < LESS_CHARACTER_LIMIT ) {
        curtailedRichTextObj.curtailRichText = richText;
        return curtailedRichTextObj;
    }

    curtailedRichTextObj.showMore = true;

    //restricting richText length to LESS_CHARACTER_LIMIT
    var charLimitRichText = richText.substring( 0, LESS_CHARACTER_LIMIT + 1 );
    var strippedCharLimitRichText = stripHtmlTagsFromRichText( charLimitRichText );
    var removedLen = 0;

    while( strippedCharLimitRichText.length < LESS_CHARACTER_LIMIT ) {
        removedLen += LESS_CHARACTER_LIMIT - strippedCharLimitRichText.length;
        var updatedStrippedCharLimitRichText = richText.substring( 0, removedLen + LESS_CHARACTER_LIMIT );
        strippedCharLimitRichText = stripHtmlTagsFromRichText( updatedStrippedCharLimitRichText );
    }

    charLimitRichText = richText.substring( 0, LESS_CHARACTER_LIMIT + removedLen );

    //edge case of mangled html due to cutting off text
    if( /<\w*$/.test( charLimitRichText ) || /<\/\w*$/.test( charLimitRichText ) ) {
        charLimitRichText = charLimitRichText.substring( 0, charLimitRichText.lastIndexOf( '<' ) );
    }

    //if text contains special html tags, split at where it begins
    charLimitRichText = charLimitRichText.split( /(?:<ul>)|(?:<ol>)|(?:<img)/ )[ 0 ];

    //check for open tags
    var openTags = [];
    var closeTags = [];
    var appendedTags = '';

    var openTagIt = charLimitRichText.matchAll( /<[^>/]*>/g );
    var closeTagIt = charLimitRichText.matchAll( /<\/[^>]+>/g );

    for( var ot of openTagIt ) {
        openTags.push( ot[ 0 ].substring( ot[ 0 ].indexOf( '<' ) + 1, ot[ 0 ].indexOf( '>' ) ) );
    }

    for( var ct of closeTagIt ) {
        closeTags.push( ct[ 0 ].substring( ct[ 0 ].indexOf( '/' ) + 1, ct[ 0 ].indexOf( '>' ) ) );
    }

    if( openTags.length > 0 && closeTags.length > 0 ) {
        for( var ii = 0; ii < closeTags.length; ii++ ) {
            for( var jj = 0; jj < openTags.length; jj++ ) {
                if( closeTags[ ii ] === openTags[ jj ] ) {
                    openTags[ jj ] = null;
                    break;
                }
            }
        }
        for( var kk = openTags.length - 1; kk >= 0; kk-- ) {
            if( openTags[kk] !== null ) {
                appendedTags += '</' + openTags[kk] + '>';
            }
        }
    }
    curtailedRichTextObj.curtailRichText = charLimitRichText.trim() + ' ...' + appendedTags;

    return curtailedRichTextObj;
};

export let processPlainText = function( plainText ) {
    var curtailedPlainTextObj = {};
    curtailedPlainTextObj.curtailPlainText = '';
    curtailedPlainTextObj.showMore = false;

    if( plainText.length < LESS_CHARACTER_LIMIT ) {
        curtailedPlainTextObj.curtailPlainText = plainText;
        curtailedPlainTextObj.showMore = false;
        return curtailedPlainTextObj;
    }

    curtailedPlainTextObj.showMore = true;
    var charLimitPlainText = plainText.substring( 0, LESS_CHARACTER_LIMIT + 1 );
    curtailedPlainTextObj.curtailPlainText = charLimitPlainText + ' ...';
    return curtailedPlainTextObj;
};

/**
 * getObjectUID - returns the object UID
 * @param {Object} object object whose uid is required
 * @returns {String} uid
 */
export let getObjectUID = function( object ) {
    var uid;

    if( object && object.uid ) {
        uid = object.uid;

        if( object.props && object.props.awb0UnderlyingObject ) {
            uid = object.props.awb0UnderlyingObject.dbValues[0];
        }
    }

    return uid;
};

/**
 * getObjectUID - returns the object UID
 * @param {Object} object object whose uid is required
 * @returns {String} uid
 */
 export let getObjectUIDOnOpenPanel = function( object, ctx ) {
    var uid;

    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    if( typeof convCtx !== 'undefined' && convCtx.selected.type === 'Fnd0Snapshot' ) {
        uid = convCtx.selected.uid;
        return uid;
    }

    if( typeof convCtx !== 'undefined' && typeof convCtx.currentSelectedSnapshot !== 'undefined' ) {
       uid = convCtx.currentSelectedSnapshot.uid;
       return uid;
    }

    if( object && object.uid ) {
        uid = object.uid;

        if( object.props && object.props.awb0UnderlyingObject ) {
            uid = object.props.awb0UnderlyingObject.dbValues[0];
        }
    }

    return uid;
};


/**
 * getObjectUID - returns the object UID
 * @param {Object} object object whose uid is required
 * @returns {String} uid
 */
 export let getSearchMode = function( ) {
    var searchMode;

    var convCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );

    if( typeof convCtx !== 'undefined' && convCtx.selected.type === 'Fnd0Snapshot' ) {
        return 'relatedConversationForObject';
    }

    if( typeof convCtx !== 'undefined' && typeof convCtx.currentSelectedSnapshot !== 'undefined' ) {
        searchMode = 'relatedConversationForObject';
    } else{
        searchMode = 'conversationsForSourceObject';
    }

    return searchMode;
};

/**
 * Return the cursor end index value
 * @param {Object} data Data
 * @returns {Integer} end index value
 */
export let getCursorEndIndexValue = function( data ) {
    var cursorObjectVar = data.cursorObject;
    if( typeof cursorObjectVar !== 'undefined' && cursorObjectVar !== null ) {
        var endValue = cursorObjectVar.endIndex;
        if( typeof endValue !== 'undefined' && endValue !== null ) {
            return endValue;
        }
    }
    return 0;
};

/**
 * Return the cursor end reached value
 * @param {Object} data Data
 * @returns {Boolean} end reached value
 */
export let getCursorEndReachedValue = function( data ) {
    var cursorObjectVar = data.cursorObject;
    if( typeof cursorObjectVar !== 'undefined' && cursorObjectVar !== null ) {
        var endReachedValue = cursorObjectVar.endReached;
        if( typeof endReachedValue !== 'undefined' && endReachedValue !== null ) {
            return endReachedValue;
        }
    }
    return false;
};

/**
 * Return the cursor start reached value
 * @param {Object} data Data
 * @returns {Boolean} start reached value
 */
export let getCursorStartReachedValue = function( data ) {
    var cursorObjectVar = data.cursorObject;
    if( typeof cursorObjectVar !== 'undefined' && cursorObjectVar !== null ) {
        var startReachedValue = cursorObjectVar.startReached;
        if( typeof startReachedValue !== 'undefined' && startReachedValue !== null ) {
            return startReachedValue;
        }
    }
    return false;
};

/**
 * @param {Array} vmos selected vmos to be deleted
 * @param {Object} dataprovider dataprovider that contains list that needs to be updated
 */
export let removeObjectsFromDPCollection = function( vmos, dataprovider ) {
    var allLoadedObjects = dataprovider.viewModelCollection.getLoadedViewModelObjects();
    //var loadedObjectsAfterRemove = _.difference( allLoadedObjects, vmos );
    var removedObjs = _.remove( allLoadedObjects, function( obj ) {
        return vmos[0].uid === obj.uid;
    } );
    dataprovider.update( allLoadedObjects, allLoadedObjects.length );
};

/**
 * getObjectUID - returns the object UID
 * @param {Object} subPanelCtx sub panel context
 * @returns {String} uid
 */
export let getConvObjectUID = function( subPanelCtx,  ctx ) {
    if( isDiscussionSublocation() ) {
        return ctx.selected.uid;
    }
    return subPanelCtx.uid;
};


export let teardownCommentsPanel = function( vmData, convContext ) {
    vmData.hideMoreRepliesButton = true;
    vmData.loadMoreComments = false;
    vmData.hideReplyBox = true;
    vmData.moreCommentsAvailable = false;
    if( convContext !== null ) {
        convContext.cursorStartIndx = convContext.props.numReplies.dbValue;
        convContext.cursorEndIndx = convContext.props.numReplies.dbValue;
    }
};

export let initCommentsPanel = function( vmData, convContext ) {
    var deferred = AwPromiseService.instance.defer();
    var insertImgEvtStr = 'ac0CreateComm.insertImageInCKEditor_' + Math.floor( 100000000 * Math.random() );
    var dpMaxToLoad = vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToLoad;
    var ac0ConvCtx = getAc0ConvCtx();
    ac0ConvCtx.editConvCtx = null; //make sure we're done with edits so that cke is not readOnly
    appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
    if( convContext.cursorStartIndx === 0 && convContext.cursorEndIndx === 0
        || convContext.cursorStartIndx === convContext.cursorEndIndx && convContext.cursorStartIndx <= dpMaxToLoad ) { //no comments available to load or available comments can be fetched in 1 load. No paging required, proceed naturally
        vmData.loadMoreComments = false;
        vmData.hideMoreRepliesButton = true;
        vmData.hideReplyBox = false;
        vmData.moreCommentsAvailable = false;
        ac0CreateConvSvc.showRichTextEditor( vmData, convContext.ckEditorIdRef, insertImgEvtStr ).then( function( ckeInstance ) {
            convContext.ckeInstance = ckeInstance;
            vmData.ckeInstance = ckeInstance;
            deferred.resolve( {} );
        } );
        return deferred.promise;
    }

    if( convContext.cursorStartIndx === convContext.cursorEndIndx ) { // comments available and first load. startIndex > maxToLoad
        //paging required, startIndex = totalNumReplies - maxToLoad, after this point, startIndex should always be < endIndex
        convContext.cursorStartIndx -= dpMaxToLoad;
        vmData.hideReplyBox = false;
        //assume more are available until searchIndex is 0. Taken care of as post action in Ac0ConversationService::modifyComments
        vmData.hideMoreRepliesButton = false;
        vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.cursor.startIndex = convContext.cursorStartIndx;
        ac0CreateConvSvc.showRichTextEditor( vmData, convContext.ckEditorIdRef, insertImgEvtStr ).then( function( ckeInstance ) {
            convContext.ckeInstance = ckeInstance;
            vmData.ckeInstance = ckeInstance;
            deferred.resolve( {} );
        } );
        return deferred.promise;
    }
    //paging required - not 1st load, startIndex has been changed by loadMore action
    vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.cursor.startIndex = convContext.cursorStartIndx;
    vmData.hideReplyBox = true;
    //assume more are available until searchIndex is 0. Taken care of as post action in Ac0ConversationService::modifyComments
    vmData.hideMoreRepliesButton = false;
    if( vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.cursor.startIndex === 0 ) { //last load after paging
        vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToLoad = convContext.cursorEndIndx;
        vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToReturn = convContext.cursorEndIndx;
        vmData.loadMoreComments = false;
        vmData.hideReplyBox = true;     //panel of comments other than 1st. need to hide
        vmData.hideMoreRepliesButton = true;        //no more replies since last load
        vmData.moreCommentsAvailable = false;       //no more comments available since last load
    }
    deferred.resolve( {} );
    return deferred.promise;
};

/**
 * setSelectedObjectInContext - returns the object name value
 * @param {Object} data object whose uid is required
 */
export let setSelectedObjectInContext = function( data ) {
    if( appCtxSvc.ctx.selected ) {
        if( appCtxSvc.ctx.selected.props && appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
            var underlyingUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
            var underlyingObj = cdm.getObject( underlyingUid );
            appCtxSvc.ctx.Ac0ConvCtx.selected = underlyingObj;
        } else {
            appCtxSvc.ctx.Ac0ConvCtx.selected = appCtxSvc.ctx.selected;
        }
    }
};

/**
 * setObjectDisplayData - returns the object name value
 * @param {Object} data object whose uid is required
 */
export let setObjectDisplayData = function( data ) {
    if( appCtxSvc.ctx.selected ) {
        if( appCtxSvc.ctx.selected.props &&
            appCtxSvc.ctx.selected.props.awb0UnderlyingObject && appCtxSvc.ctx.Ac0ConvCtx.selected ) {
            var underlyingUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
            dmSvc.getProperties( [ underlyingUid ], [ 'object_name' ] ).then( function( response ) {
                var underlyingObj = cdm.getObject( underlyingUid );
                var dbStringValue = underlyingObj.props.object_name.dbValues[0];
                var uiStringValue = underlyingObj.props.object_name.uiValues[0];
                appCtxSvc.ctx.Ac0ConvCtx.selected = underlyingObj;
                appCtxSvc.ctx.Ac0ConvCtx.selected.props.object_name.dbValue = dbStringValue;
                appCtxSvc.ctx.Ac0ConvCtx.selected.props.object_name.uiValue = uiStringValue;

                uwPropSvc.setValue( data.selectedObject, uiStringValue );
            } );
        } else {
            appCtxSvc.ctx.Ac0ConvCtx.selected = appCtxSvc.ctx.selected;
        }
    }
};

export let saveDeleteConvItemInContext = function( eventData ) {
    var convCtx = getAc0ConvCtx();
    convCtx.deleteConvObj = [ eventData.data ];
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

/**
 * Return FMS base url
 * @returns {String} url
 */
export let getFmsBaseURL = function() {
    return browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
};

/**
 * Get file URL from ticket.
 *
 * @param {String} ticket - File ticket.
 * @return file URL
 */
// TODO move this into a shared util class
var getFileTickerURL = function( ticket ) {
    if ( ticket ) {
        return browserUtils.getBaseURL() +  ticket;
    }
    return null;
};

/**
 * Utility method that will call a method inside the AC soa list with appropriate serviceInput
 * @param {*} method SOA method
 * @param {*} serviceInput service input for SOA
 * @returns {*} Promise
 */
export let callActiveCollabSoa = function( method, serviceInput ) {
    var deferred = AwPromiseService.instance.defer();
    soa.postUnchecked( 'ActiveCollaboration-2020-12-ActiveCollaboration', method, serviceInput ).then(
        function( responseData ) {
            deferred.resolve( responseData );
        } );

    return deferred.promise;
};

export let confirmDeleteConv = function() {
    var deferred = AwPromiseService.instance.defer();
    var objsToDelete = appCtxSvc.getCtx( 'Ac0ConvCtx' ).deleteConvObj;
    var convDp = appCtxSvc.getCtx( 'Ac0ConvCtx' ).convDP;
    var delSoaInput = {};
    delSoaInput.objsToDelete = objsToDelete;//ctx.Ac0ConvCtx.deleteConvObj
    exports.callActiveCollabSoa( 'deleteConversation', delSoaInput ).then( function( respData ) {
        exports.removeObjectsFromDPCollection( objsToDelete, convDp  );
        deferred.resolve( {} );
    } );

    return deferred.promise;
};

/**
 * Return the cursor start reached value
 * @param {Object} data Data
 * @returns {Boolean} start reached value
 */
let getRequestCriteria = function( data, searchModeValue ) {
    var context = appCtxSvc.getCtx( 'ac0FeedFilter' );
    if( typeof context === 'undefined' ) {
        context = {
            PrivatePublicAny: '',
             hasSnapshot: '',
             CommentCreatedBefore: '',
             CommentCreatedAfter: '',
             Contributors: '',
             Participants: '',
             Actionable: '',
             ActionStatus: '',
             ActionPriority: ''
        };
    }

    var privatePUblicAnyVal = 'any';
    if( typeof context.isPrivate !== 'undefined' && context.isPrivate === 'private' ) {
        privatePUblicAnyVal = 'private';
    } else if( typeof context.isPrivate !== 'undefined' && context.isPrivate === 'public' ) {
        privatePUblicAnyVal = 'public';
    }
    return {
        SearchMode: searchModeValue,
         FmsBaseUrl: getFmsBaseURL(),
         PrivatePublicAny: privatePUblicAnyVal,
         HasSnapshot: context.hasSnapshot,
         CommentCreatedBefore: context.dateCreatedBefore,
         CommentCreatedAfter: context.dateCreatedAfter,
         Contributors: '',
         Participants: context.privateParticipants,
         Actionable: context.actionable,
         ActionStatus: context.status,
         ActionPriority: context.priority

    };
};

export let getActionableFeedCriteria = function( data ) {
    return getRequestCriteria( data, 'actionableConversations' );
};

export let getFeedCriteria = function( data ) {
    return getRequestCriteria( data, 'feedConversations' );
};


export let getAc0ConvCtx = function() {
    var ac0ConvCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    if( typeof  ac0ConvCtx === 'undefined'  ) {
        ac0ConvCtx = { ac0NumSubscriptionsForSelectedObj : 0 };
        appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
    }
    return ac0ConvCtx;
};

export let loadConvSrcObjs = function( ctx ) {
    var deferred = AwPromiseService.instance.defer();
    var response = {};
    response.sourceObjectList = [];
    response.numberOfSourceObjects = 0;
    if( ctx.selected.props.sourceObjList.dbValues.length > 0 ) {
        if( !ctx.selected.props.inflatedSrcObjList
            || ctx.selected.props.inflatedSrcObjList.length !== ctx.selected.props.sourceObjList.dbValues.length ) {
            var srcObjsUids = [];
            ctx.selected.props.inflatedSrcObjList = [];
            for( var ii = 0; ii < ctx.selected.props.sourceObjList.dbValues.length; ii++ ) {
                srcObjsUids.push( ctx.selected.props.sourceObjList.dbValues[ii].uid );
            }
            dmSvc.loadObjects( srcObjsUids ).then( function() {
                var totalNoOfsrc = srcObjsUids.length;
                for( var nn = 0; nn < totalNoOfsrc; nn++ ) { //total no. of participants to be visible initially
                    var srcObj = cdm.getObject( srcObjsUids[nn] );
                    let vmo = viewModelObjectSvc.createViewModelObject( srcObj );
                    ctx.selected.props.inflatedSrcObjList.push( vmo );
                }
                response.sourceObjectList = ctx.selected.props.inflatedSrcObjList;
                response.numberOfSourceObjects = ctx.selected.props.inflatedSrcObjList.length;
                deferred.resolve( response );
            } );
            return deferred.promise;
        }
        response.sourceObjectList = ctx.selected.props.inflatedSrcObjList;
        response.numberOfSourceObjects = ctx.selected.props.inflatedSrcObjList.length;
        deferred.resolve( response );
        return deferred.promise;
    }
    deferred.resolve( response );
    return deferred.promise;
};

export let loadParticipants = function( ctx ) {
    var deferred = AwPromiseService.instance.defer();
    var response = {};
    AwTimeoutService.instance( function() {
        response.participantsList = [];
        response.numberOfParticipants = 0;
        if( ctx.selected && ctx.selected.props && ctx.selected.props.inflatedParticipantObjVMOList ) {
            response.participantsList = ctx.selected.props.inflatedParticipantObjVMOList;
            response.numberOfParticipants = ctx.selected.props.inflatedParticipantObjVMOList.length;
        }
    }, 500 ).then( function() {
        deferred.resolve( response );
    } );
    return deferred.promise;
 };

 export let loadRelatedObjs = function( ctx ) {
    var deferred = AwPromiseService.instance.defer();
    var response = {};
    AwTimeoutService.instance( function() {
        response.relatedObjectList = [];
        response.numberOfRelatedObjects = 0;
        if( ctx.selected && ctx.selected.props && ctx.selected.props.inflatedRelatedObjList ) {
            response.relatedObjectList = ctx.selected.props.inflatedRelatedObjList;
            response.numberOfRelatedObjects = ctx.selected.props.inflatedRelatedObjList.length;
        }
    }, 500 ).then( function() {
        deferred.resolve( response );
    } );
    return deferred.promise;
 };

 export let isDiscussionSublocation = function() {
    if( appCtxSvc.getCtx( 'sublocation.clientScopeURI' ) === 'Ac0CollaborationFeed' || appCtxSvc.getCtx( 'sublocation.clientScopeURI' ) === 'Ac0CollaborationActions' ) {
        return true;
    }
    return false;
 };

 export let isAc0EnableTrackedDiscussions = function() {
    var isTracakble = appCtxSvc.getCtx( 'preferences.Ac0EnableTrackedDiscussions' );
    if( typeof isTracakble !== 'undefined' && isTracakble[0] === 'true' ) {
        return true;
    }
    return false;
 };

 export let isMyGallerySublocation = function() {
    if( appCtxSvc.getCtx( 'sublocation.clientScopeURI' ) === 'Awv0SnapshotSearchResults' ) {
        return true;
    }
    return false;
 };


/**
 * Ac0ConversationUtils factory
 */

export default exports = {
    processRichText,
    processPlainText,
    getObjectUID,
    getCursorEndIndexValue,
    getCursorEndReachedValue,
    getCursorStartReachedValue,
    removeObjectsFromDPCollection,
    getConvObjectUID,
    teardownCommentsPanel,
    initCommentsPanel,
    setSelectedObjectInContext,
    setObjectDisplayData,
    saveDeleteConvItemInContext,
    getFmsBaseURL,
    callActiveCollabSoa,
    confirmDeleteConv,
    getFeedCriteria,
    getActionableFeedCriteria,
    getAc0ConvCtx,
    loadConvSrcObjs,
    loadParticipants,
    loadRelatedObjs,
    isDiscussionSublocation,
    isAc0EnableTrackedDiscussions,
    isMyGallerySublocation,
    getObjectUIDOnOpenPanel,
    getFileTickerURL,
    getSearchMode
};
app.factory( 'Ac0ConversationUtils', () => exports );
