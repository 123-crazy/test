// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global
define,
CKEDITOR
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0CreateCollabObjectService
 */
import app from 'app';
import ac0CkeditorService from 'js/Ac0CkeditorService';
import notyService from 'js/NotyModule';
import eventBus from 'js/eventBus';
import messageSvc from 'js/messagingService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import Ac0CkeditorConfigProvider from 'js/Ac0CkeditorConfigProvider';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import $ from 'jquery';
import vmoSvc from 'js/viewModelObjectService';
import AwPromiseService from 'js/awPromiseService';
import ac0ConvSvc from 'js/Ac0ConversationService';
import listBoxService from 'js/listBoxService';
import ehFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import ehSvc from 'js/editHandlerService';
import graphQLSvc from 'js/graphQLService';
import soaSvc from 'soa/kernel/soaService';
import declUtils from 'js/declUtils';
import dateTimeSvc from 'js/dateTimeService';
import msgSvc from 'js/messagingService';
import convUtils from 'js/Ac0ConversationUtils';
import AwHttpService from 'js/awHttpService';
import constSvc from 'js/awConstantsService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import sanitizer from 'js/sanitizer';


var exports = {};
var _isTextValid = false;
//var eventInsertImageInCKEditor = null;
var insertImageCKEEvents = [];
var defaultStatusInternalNameDispNameMap = new Map();
var defaultPriorityInternalNameDispNameMap = new Map();

/**
 * Get file URL from ticket.
 *
 * @param {String} ticket - File ticket.
 * @return file URL
 */

var _getFileURL = function( ticket ) {
    if ( ticket ) {
        return browserUtils.getBaseURL() + 'fms/fmsdownload/' + fmsUtils.getFilenameFromTicket( ticket ) +
            '?ticket=' + ticket;
    }
    return null;
};

/**
 * Populate the object from the provided soa return
 * @param {*} soaMap map defined for soa
 * @returns {Object} jsObject
 */
var constructSrcObjUsrJSObj = function( soaMap ) {
    var jsObjFromSoaMap = {};
    if ( !soaMap || soaMap[0].length <= 0 || soaMap[1].length <= 0 || soaMap[0].length !== soaMap[1].length ) {
        return jsObjFromSoaMap;
    }
    for ( var ii = 0; ii < soaMap[0].length; ii++ ) {
        jsObjFromSoaMap[soaMap[0][ii].uid] = soaMap[1][ii];
    }
    return jsObjFromSoaMap;
};


export let showRichTextEditor = function( data, ckEditorDomId, insertImgEvtStr ) {
    var deferred = AwPromiseService.instance.defer();
    var deferredSoa = AwPromiseService.instance.defer();
    var deferredFms = AwPromiseService.instance.defer();
    var config = new Ac0CkeditorConfigProvider();
    var ckeInstResponse = {};

    ac0CkeditorService.create( ckEditorDomId, config, insertImgEvtStr ).then( cke => {
        //ckeditor = cke;
        cke._instance.eventBus = eventBus;
        cke._instance.getBaseURL = browserUtils.getBaseURL();
        cke._instance.getBaseUrlPath = app.getBaseUrlPath();

        $( '.ck-body-wrapper' ).addClass( 'aw-layout-popup' );

        checkCKEInputTextValidityAndPublishEvent( cke );

        cke.on( 'change', function() {
            checkCKEInputTextValidityAndPublishEvent( cke );
        } );
        cke.on( 'notificationShow', function( evt ) {
            notyService.showInfo( evt.data.notification.message );
            evt.cancel();
        } );
        // Insert Image Event

        var eventInsertImageInCKEditor = eventBus.subscribe( insertImgEvtStr,
            function( eventData ) {
                var fileName = 'fakepath\\' + eventData.file.name;

                data.form = eventData.form;
                data.ckeInstance = eventData.ckeInstance;

                var datasetInfo = {
                    clientId: eventData.clientid,
                    namedReferenceName: 'Image',
                    fileName: fileName,
                    name: eventData.clientid,
                    type: 'Image'
                };

                data.datasetInfo = datasetInfo;
                var fileMgmtInput = {};
                fileMgmtInput.transientFileInfos = [
                    {
                        fileName: datasetInfo.fileName,
                        isBinary: true,
                        deleteFlag: false
                    }
                ];

                //eventBus.publish( 'ac0CreateDiss.InsertObjInCKEditor' );
                soaSvc.postUnchecked( 'Core-2007-01-FileManagement', 'getTransientFileTicketsForUpload', fileMgmtInput ).then(
                    function( responseData ) {
                        var fmsTicket = responseData.transientFileTicketInfos[0].ticket;
                        data.fmsTicket = fmsTicket;
                        updateFormData( {
                            key: 'fmsTicket',
                            value: fmsTicket
                        }, data );
                        var fmsinputData = {
                            request: {
                                method: 'POST',
                                url: constSvc.getConstant( 'fmsUrl' ),
                                headers: {
                                    'Content-type': undefined
                                },
                                data: data.formData
                            }
                        };
                        AwHttpService.instance( fmsinputData.request ).then( function( response ) {
                            insertImage( data );
                        }, function( err ) {
                            deferredFms.reject( err );
                        } );
                        deferredSoa.resolve( responseData );
                    }, function( reason ) {
                        deferredSoa.reject( reason );
                    }  );
            } );
        insertImageCKEEvents.push( eventInsertImageInCKEditor );
        ckeInstResponse.cke = cke;
        deferred.resolve( ckeInstResponse );
    } );
    return deferred.promise;
};

/**
 * set FullText object of Requirement Revision
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let insertImage = function( data ) {
    var ckeInstance = data.ckeInstance;
    if ( data.fmsTicket ) {
        var imageURL = _getFileURL( data.fmsTicket );
        const content = '<img src="' + imageURL + '"/>';
        if ( ckeInstance.data ) {
            const viewFragment = ckeInstance.data.processor.toView( content );
            const modelFragment = ckeInstance.data.toModel( viewFragment );
            ckeInstance.model.insertContent( modelFragment );
        } else {
            var imgHtml = CKEDITOR.dom.element.createFromHtml( content );
            ckeInstance.insertElement( imgHtml );
        }
    }
};

/**
 * update data for fileData
 *
 * @param {Object} fileData - key string value the location of the file
 * @param {Object} data - the view model data object
 */
export let updateFormData = function( fileData, data ) {
    if ( fileData && fileData.value ) {
        var form = data.form;
        data.formData = new FormData( $( form )[0] );
        data.formData.append( fileData.key, fileData.value );
    }
};

/**
 * Returns rich text
 * @param {Object} ckeInstance ckeInstance
 * @return {String} richtext richText
 */
export let getRichText = function( ckeInstance ) {
    var _richTextCK = ckeInstance.getData();
    var sanitizedRichTxt = sanitizer.sanitizeHtmlValue( _richTextCK );
    var _richText = sanitizedRichTxt;
    if ( _richText.includes( '<img' ) ) {
        if ( !_richText.includes( 'style=\"width:100%\"' ) ) {
            if ( browserUtils.isIE ) {
                _richText = _richText.replace( /<(\s*)img(.*?)\s*\/>/g, '<$1img$2 style=\"width:100%\"/>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\/\s*>/g, '<$1img$2></img>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\s*>/g, '<$1img$2></img>' );
            } else {
                _richText = _richText.replace( /<(\s*)img(.*?)\s*>/g, '<$1img$2 style=\"width:100%\"/>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\/\s*>/g, '<$1img$2></img>' );
                _richText = _richText.replace( /<(\s*)img(.*?)\/\s*>/g, '<$1img$2></img>' );
            }
        }
    }
    return _richText;
};

/**
 * Returns plain text
 * @param {Object} ckeInstance ckeInstance
 * @return {Object} text string
 */
export let getPlainText = function( ckeInstance ) {
    return ckeInstance.getText();
};


export let setIsTextValid = function( valid ) {
    _isTextValid = valid;
    eventBus.publish( 'isInputTextValidEvent', null );
};

/**
 * Sets variable with whether text was entered. Called by action and value is used by condition to set visibility of
 * post button.
 * @param {String} data vmdata
 * @param {Boolean} isInputTextValidVal is input text valid
 */
export let isInputTextValid = function( data, isInputTextValidVal ) {
    data.isInputTextValid = isInputTextValidVal;
    if( convUtils.isDiscussionSublocation() ) {
        var convCtx = convUtils.getAc0ConvCtx();
        convCtx.isInputTextValid = isInputTextValidVal;
    }
};

export let checkCKEInputTextValidityAndPublishEvent = function( cke ) {
    var theData = cke.getData().replace( /&nbsp;/g, '' );
        theData = theData.replace( /<p>( )*<\/p>/g, '' );
        if ( theData.trim() !== '' ) {
            _isTextValid = true;
        } else {
            _isTextValid = false;
        }
        eventBus.publish( 'isInputTextValidEvent', { isTextValid: _isTextValid } );
};
/**
 * Populate the data structure used to display which participant/source obj
 * combination do not have read access.
 */
export let warnParticipantSourceNoReadAccess = function() {
    var convCtx = convUtils.getAc0ConvCtx();

    var participantSourceMap = constructSrcObjUsrJSObj( convCtx.userObjectMap );
    var participantNames = [];
    var sourceObjNames = [];

    _.forEach( Object.keys( participantSourceMap ), function( participantUid ) {
        var part = cdm.getObject( participantUid ).props.object_string.dbValues[0].split( '(' )[0].trim();
        var sourceObjName = '';
        for ( var ii = 0; ii < participantSourceMap[participantUid].length; ii++ ) {
            sourceObjName += cdm.getObject( participantSourceMap[participantUid][ii].uid ).props.object_string.dbValues[0];
            sourceObjName += ', ';
        }
        sourceObjName = sourceObjName.slice( 0, -2 );
        sourceObjNames.push( sourceObjName );
        participantNames.push( part );
    } );

    convCtx.warnMsgText = '';
    for ( var jj = 0; jj < participantNames.length; jj++ ) {
        convCtx.warnMsgText += messageSvc.applyMessageParamsWithoutContext( convCtx.i18nindividualReadAccessWarnDesc, [ participantNames[jj], sourceObjNames[jj] ] );
        convCtx.warnMsgText += '\n';
    }
    convCtx.warnMsgText.trim();
    if ( participantNames.length > 0 && sourceObjNames.length > 0 ) {
        convCtx.showWarnMsg = true;
    } else {
        convCtx.showWarnMsg = false;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

export let changeConvType = function( data ) {
    var editConvCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' ).editConvCtx;
    if ( data.convType && data.convType.dbValue === '' ) {
        data.convType.dbValue = 'message';
        var chipExisted = _.find( data.userChips, function( chip ) {
            if( typeof data.loggedInUserChips === 'undefined' || typeof data.loggedInUserChips[0].theObject !== 'undefined' ) {
                return chip.theObject.uid === data.loggedInUserChips[0].theObject.uid;
            }
            return undefined;
        } );
        if ( !chipExisted && !editConvCtx ) {
            if ( !data.userChips ) {
                data.userChips = [];
            }
            data.userChips.push( data.loggedInUserChips[0] );
        }
    } else if ( data.convType && data.convType.dbValue === 'message' ) {
        data.convType.dbValue = '';
    }
};

export let changeConvActionable = function( data ) {
    var editConvCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' ).editConvCtx;
    if ( data.convActionable && data.convActionable.dbValue === '' ) {
        data.convActionable.dbValue = 'actionable';
        var chipExisted = _.find( data.userChips, function( chip ) {
            if( typeof data.loggedInUserChips === 'undefined' || typeof data.loggedInUserChips[0].theObject !== 'undefined' ) {
                return chip.theObject.uid === data.loggedInUserChips[0].theObject.uid;
            }
            return undefined;
        } );
        if ( !chipExisted && !editConvCtx ) {
            if ( !data.userChips ) {
                data.userChips = [];
            }
            data.userChips.push( data.loggedInUserChips[0] );
        }
    } else if ( data.convActionable && data.convActionable.dbValue === 'actionable' ) {
        data.convActionable.dbValue = '';
    }

    data.priority.dbValue = 'Low';
    data.priority.uiValue = defaultPriorityInternalNameDispNameMap.get( 'Low' );

    data.status.dbValue = 'Open';
    data.status.uiValue = defaultStatusInternalNameDispNameMap.get( 'Open' );
};

export let initCreateCollabObjectPanel = function( data ) {
    var editConvCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' ).editConvCtx;
    if ( editConvCtx ) {
        data.sourceObjects = editConvCtx.props.sourceObjList.dbValues.map( function( srcObj ) {
            return {
                uid: srcObj.uid,
                props: {
                    object_string: {
                        dbValue: srcObj.object_string
                    }
                }
            };
        } );
        var userData = {
            selectedUsers: editConvCtx.props.participantObjList.dbValues.map( function( user ) {
                return {
                    uid: user.uid,
                    props: {
                        user_name: {
                            uiValue: user.object_string.split( '(' )[0].trim()
                        }
                    },
                    modelType: {
                        typeHierarchyArray: [ 'User' ]
                    }
                };
            } )
        };
    }
    initCreateCollabObjectPanelSub( data );
    if ( editConvCtx ) {
        if ( editConvCtx.props.isConvPrivate.dbValue === true ) {
            changeConvType( data );
            data.convTypeChk.dbValue = true;
        }
        if ( editConvCtx.props.convStatus.dbValue !== '' && editConvCtx.props.convPriority.dbValue !== '' && convUtils.isAc0EnableTrackedDiscussions() ) {
            changeConvActionable( data );
            data.convActionableChk.dbValue = true;

            data.priority.dbValue = editConvCtx.props.convPriority.dbValue;
            data.priority.uiValue = editConvCtx.props.convPriority.displayValues[0];

            data.status.dbValue = editConvCtx.props.convStatus.dbValue;
            data.status.uiValue = editConvCtx.props.convStatus.displayValues[0];
        }
        ac0ConvSvc.setParentData( data );
        editConvCtx.props.participantObjList.dbValues.length > 0 ? ac0ConvSvc.addUserObjs( null, userData ) : {};
        var parentData = ac0ConvSvc.getParentData();
        data.userChips = parentData.userChips;
        editConvCtx.props.sourceObjList.dbValues.length > 0 ? ac0ConvSvc.addSourceObjects( data ) : {};
        var convCtx = convUtils.getAc0ConvCtx();
        convCtx.createOrEditRichText = editConvCtx.props.richText.displayValues[0];
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
        var ac0EditHandler = ehFactory.createEditHandler( dataSourceService
            .createNewDataSource( {
                declViewModel: data
            } ) );
        //ac0EditSvc.addEditHandler( ac0EditHandler );
        ehSvc.setEditHandler( ac0EditHandler, 'AC0_CONVERSATION' );
    }
};

var initCreateCollabObjectPanelSub = function( data ) {
    var convCtx = convUtils.getAc0ConvCtx();
    convCtx.collabDataProviders = data.dataProviders;
    convCtx.showWarnMsg = false;
    convCtx.warnMsgText = '';
    convCtx.createOrEditRichText = '';
    convCtx.i18nparticipantReadAccessWarningMsg = data.i18n.participantReadAccessWarningMsg;
    convCtx.i18nindividualReadAccessWarnDesc = data.i18n.individualReadAccessWarnDesc;
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    if( data.userChips ) {
        delete data.userChips;
    }

    if( data.srcObjChips ) {
        _.remove( data.srcObjChips, function( chip ) {
            return chip.labelDisplayName === '' && chip.labelInternalName === '';
        } );
    }

    //modify the selected obj fnd0roots
    if ( convCtx.currentSelectedSnapshot ) {
        var parentData = ac0ConvSvc.getParentData();
        parentData.srcObjChips = [];
        var srcObj = convCtx.currentSelectedSnapshot.props.fnd0Roots;
        if( typeof srcObj !== 'undefined' ) {
            var testObj = cdm.getObject( srcObj.dbValues[0] );
            let vmo = viewModelObjectSvc.createViewModelObject( testObj );
            data.sourceObjects = vmo.props.object_name.displayValsModel.map( function( ) {
                return {
                    uid: vmo.uid,
                    props: {
                        object_string: {
                            dbValue: vmo.props.object_string.dbValue
                        }
                    }
                };
            } );
            ac0ConvSvc.addSourceObjects( data );
            data.srcObjChips = parentData.srcObjChips;
        }
    }
    ac0ConvSvc.setParentData( data );
};


/**
 * Method that switches flags in the context.
 * @param {*} conv Conversation
 * @param {*} comment Comment
 */
export let modifyCreateCtxFlagsForCollabObjs = function( conv, comment ) {
    var convCtx = convUtils.getAc0ConvCtx();
    convCtx.createNewComment = comment;
    convCtx.createNewConversation = conv;
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
};

/**
 * Method that preps service input before posting a comment
 * @param {*} convObj conversation object
 * @param {*} richText rich text string
 * @returns {*} Promise
 */
export let postComment = function( convObj, richText, commentObj, data, removedRelatedObjList ) {
    var deferred = AwPromiseService.instance.defer();
    var graphQLInput = {};

    var contextConvObj = {};
    var convObjForSoa = {};

    if ( convObj ) {
        contextConvObj = convObj;
    } else {
        contextConvObj.rootCommentObj = appCtxSvc.getCtx( 'Ac0ConvCtx' ).createCommentRootCommentObj;
        contextConvObj.uid = appCtxSvc.getCtx( 'Ac0ConvCtx' ).createCommentConvId;
    }

    convObjForSoa = cdm.getObject( contextConvObj.uid );
    if ( !convObjForSoa ) {
        var svmo = {
            props: {}
        };
        svmo.uid = contextConvObj.uid;
        svmo.type = 'Ac0Conversation';
        convObjForSoa = vmoSvc.constructViewModelObject( svmo );
    }

    var newRichTextString = richText ? richText : getRichText( convObj.ckeInstance );
    // First thing we need to do is parse the richText to determine if there
    // were any pre-existing img tags and replace the now stripped 'id'
    // attribute.
    if( typeof commentObj !== 'undefined' && typeof commentObj.props !== 'undefined' && typeof commentObj.props.richText !== 'undefined' ) {
        let parser = new DOMParser();
        var originalRichTextDoc = parser.parseFromString( commentObj.props.richText.dbValue, 'text/html' );
        if( typeof originalRichTextDoc !== 'undefined' && typeof originalRichTextDoc.images !== 'undefined' && originalRichTextDoc.images.length > 0 ) {
            var newRichTextDoc = parser.parseFromString( newRichTextString, 'text/html' );
            if( typeof newRichTextDoc !== 'undefined' && typeof newRichTextDoc.images !== 'undefined' && newRichTextDoc.images.length > 0 ) {
                for( var i = 0; i < originalRichTextDoc.images.length; i++ ) {
                    for( var j = 0; j < newRichTextDoc.images.length; j++ ) {
                        if( originalRichTextDoc.images[i].src === newRichTextDoc.images[j].src ) {
                            newRichTextDoc.images[j].id = originalRichTextDoc.images[i].id;
                            break;
                        }
                    }
                }
                var tmpRichTextString = new XMLSerializer().serializeToString( newRichTextDoc );
                newRichTextString = tmpRichTextString.substring( tmpRichTextString.indexOf( '<body>' ) + 6, tmpRichTextString.lastIndexOf( '</body>' ) );
            }
        }
    }

    graphQLInput.richText = newRichTextString;
    graphQLInput.rootComment  = {
        uid: contextConvObj.rootCommentObj.uid
    };

    graphQLInput.conversation = {
        uid: convObjForSoa.uid,
        type: convObjForSoa.type
    };

    var relatedObjCopy  = [];
    if( contextConvObj.props && contextConvObj.props.collabRelatedObjectInfo ) {
        relatedObjCopy = [ ...contextConvObj.props.collabRelatedObjectInfo.dbValue ];
    }

    var graphQLQuery;
    if( typeof commentObj !== 'undefined' && commentObj !== null && typeof commentObj.uid !== 'undefined' ) {
        graphQLInput.comment = {
            type: 'Ac0Comment',
            uid: commentObj.isRootComment ? contextConvObj.rootCommentObj.uid : commentObj.uid //if root comment is being edited, then pass rootCommentObj uid. Else pass regular comment uid
        };

        if( removedRelatedObjList ) {
            graphQLInput.options = getRemovedRelatedObjectList( relatedObjCopy, removedRelatedObjList );
        }

        //edit comment
        graphQLQuery = {
            endPoint: 'graphql',
            request: {
                query: 'mutation updateComment($updateCommentInput: UpdateCommentInput!) { updateComment(updateCommentInput: $updateCommentInput) { createdOrUpdatedCollabObject { uid type collabRichText collabDateModified collabPlainText} } }',
                variables: {
                    updateCommentInput: graphQLInput
                }
            }
        };
        //Comment updated, publish event to refresh Discussion sublocation, to reset PWA data
        if( convUtils.isDiscussionSublocation() ) {
            eventBus.publish( 'primaryWorkarea.reset' );
        }
    } else {
        //create comment
        graphQLQuery = {
            endPoint: 'graphql',
            request: {
                query: 'mutation createComment($createCommentInput: CreateCommentInput!) { createComment(createCommentInput: $createCommentInput) { createdOrUpdatedCollabObject { uid type collabRichText collabDateModified collabPlainText} } }',
                variables: {
                    createCommentInput: graphQLInput
                }
            }
        };
    }

    graphQLSvc.callGraphQL( graphQLQuery ).then( ( response ) => {
        if ( !declUtils.isNil( response ) ) {
            //TODO: error handling will be corrected in followup CP. GQL schema for error is being worked upon.
            let err = null;
            if ( response.errors ) {
                err = soaSvc.createError( response.errors[0] );
            }
            if ( err && typeof  data !== 'undefined' ) {
                var msg = '';
                msg = msg.concat( data.i18n.commentCreationErrorMsg );
                msgSvc.showError( msg );
                deferred.reject( err );
            } else {
                deferred.resolve( response );
            }
        }
    }, ( err ) => {
        deferred.reject( err );
    } );
    return deferred.promise;
};

/**
 * Method that preps service input before posting a conversation
 * @param {*} data input data
 * @returns {*} Promise
 */
export let postConversation = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var graphQLInput = {};

    var snapshotObj = appCtxSvc.getCtx( 'viewer.discussionCtx' ) ? appCtxSvc.getCtx( 'viewer.discussionCtx' ).newProductSnapshot : {};
    if ( typeof appCtxSvc.getCtx( 'Ac0ConvCtx' ).currentSelectedSnapshot !== 'undefined' ) {
        snapshotObj = appCtxSvc.getCtx( 'Ac0ConvCtx' ).currentSelectedSnapshot;
    }
    const payloadOptions = {};
    payloadOptions.snapshotObjUid = snapshotObj ? snapshotObj.uid : null;

    graphQLInput.sourceObjects = [];
    graphQLInput.sourceObjects = ac0ConvSvc.getSourceObjects( data );
    graphQLInput.listOfParticipants = ac0ConvSvc.getUserObjects( data );
    graphQLInput.defaultCommentText = getRichText( data.ckeInstance );
    graphQLInput.options = getDiscussionOptions( payloadOptions ); //{"snapshot", "snaphotUID"}
    graphQLInput.conversation = data.editConvUid ? {
        type: 'Ac0Conversation',
        uid: data.editConvUid
    } : {
            type: 'Ac0Conversation',
            uid: 'AAAAAAAAAAAAAA'
        };
    graphQLInput.convPrivate = data.convType.dbValue === 'message';
    graphQLInput.convActionable = data.convActionable.dbValue === 'actionable';
    if( convUtils.isAc0EnableTrackedDiscussions() ) {
        graphQLInput.status = data.convActionable.dbValue === 'actionable' ? data.status.dbValue : null;
        graphQLInput.priority = data.convActionable.dbValue === 'actionable' ? data.priority.dbValue : null;
        graphQLInput.closingUserId = data.convActionable.dbValue === 'actionable' ? data.statusChangedByUserId : null;
        graphQLInput.dateClosed = data.convActionable.dbValue === 'actionable' ? dateTimeSvc.formatUTC( new Date() ) : null;
    }


    var graphQLQuery;
    var editConvCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' ).editConvCtx;
    if ( editConvCtx ) { //edit conversation
        graphQLQuery = {
            endPoint: 'graphql',
            request: {
                query: 'mutation updateConversation($updateConversationInput: AddOrUpdateConversationInput!) { updateConversation(updateConversationInput: $updateConversationInput) { createdOrUpdatedCollabObject { uid type } } }',
                variables: {
                    updateConversationInput: graphQLInput
                }
            }
        };
    } else { //create conversation
        graphQLQuery = {
            endPoint: 'graphql',
            request: {
                query: 'mutation addConversation($addConversationInput: AddOrUpdateConversationInput!) { addConversation(addConversationInput: $addConversationInput) { createdOrUpdatedCollabObject { uid type } } }',
                variables: {
                    addConversationInput: graphQLInput
                }
            }
        };
    }

    graphQLSvc.callGraphQL( graphQLQuery ).then( ( response ) => {
        if ( !declUtils.isNil( response ) ) {
            //TODO: error handling will be corrected in followup CP. GQL schema for error is being worked upon.
            modifyCreateCtxFlagsForCollabObjs( false, false );
            let err = null;
            if ( response.errors ) {
                err = soaSvc.createError( response.errors[0] );
            }
            if ( err ) {
                var msg = '';
                msg = msg.concat( data.i18n.convCreationErrorMsg );
                msgSvc.showError( msg );
                if( !convUtils.isDiscussionSublocation() ) {
                    navigateToOnObjPanel( data );
                }
                deferred.reject( err );
            } else {
                deferred.resolve( response );
            }
        }
    }, ( err ) => {
        deferred.reject( err );
    } );
    return deferred.promise;
};

export let destroyCkEditorInstance = function( data ) {
    if ( data.ckeInstance ) {
        unSubscribeFromCkeEvents();
        data.ckeInstance.destroy();
    }
    data.ckeInstance = null;
};

export let unSubscribeFromCkeEvents = function() {
    if ( insertImageCKEEvents && insertImageCKEEvents.length > 0 ) {
        _.forEach( insertImageCKEEvents, function( insertImageEvt ) {
            eventBus.unsubscribe( insertImageEvt );
        } );
        insertImageCKEEvents = [];
    }
};

export let setCkEditorData = function( data, ckeInstance ) {
    if ( ckeInstance && ckeInstance.cke && ckeInstance.cke._instance ) {
        ckeInstance.cke._instance.setData( data );
    }
    if ( ckeInstance._instance ) {
        ckeInstance._instance.setData( data );
    }
};

export let evalNavPathPriorToCKEDecision = function( data ) {
    if ( data.eventData && data.eventData.destPanelId === 'Ac0UnivConvPanelSub' ) {
        destroyCkEditorInstance( data );
    }
    if ( data.eventData && data.eventData.destPanelId === 'Ac0CreateNewCollabObj' ) {
        eventBus.publish( 'Ac0CreateCollabObj.evalNavCompleteCreateCKE' );
    }
};

export let openAddParticipantsPanel = function( data ) {
    var ac0ConvCtx = convUtils.getAc0ConvCtx();
    ac0ConvCtx.createOrEditRichText = getRichText( data.ckeInstance );
    ac0ConvCtx.invokingPanel = data.activeView;
    destroyCkEditorInstance( data );
    appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
    var navCtx = {
        destPanelId: 'Ac0AddUsersSub',
        title: data.i18n.add,
        supportGoBack: true
    };
    eventBus.publish( 'awPanel.navigate', navCtx );
};

/**
 * Process Status LOV Values.
 *
 * @param {Object} response The soa response
 */
export let processStatusLOV = function( response, data ) {
    var internalValues = [];
    var values = [];
    for ( var i = 0; i < response.lovValues.length; i++ ) {
        internalValues[i] = response.lovValues[i].propInternalValues.lov_values[0];
        values[i] = response.lovValues[i].propDisplayValues.lov_values[0];
    }

    var listOfValues = listBoxService.createListModelObjectsFromStrings( values );
    for ( var j = 0; j < internalValues.length; j++ ) {
        listOfValues[j].propInternalValue = internalValues[j];
        listOfValues[j].propDisplayValue = values[j];
        defaultStatusInternalNameDispNameMap.set( internalValues[j], values[j] );
    }
    return listOfValues;
};

/**
 * Process Priority LOV Values.
 *
 * @param {Object} response The soa response
 */
export let processPriorityLOV = function( response, data ) {
    var internalValues = [];
    var values = [];
    for ( var i = 0; i < response.lovValues.length; i++ ) {
        internalValues[i] = response.lovValues[i].propInternalValues.lov_values[0];
        values[i] = response.lovValues[i].propDisplayValues.lov_values[0];
    }

    var listOfValues = listBoxService.createListModelObjectsFromStrings( values );
    for ( var j = 0; j < internalValues.length; j++ ) {
        listOfValues[j].propInternalValue = internalValues[j];
        listOfValues[j].propDisplayValue = values[j];
        defaultPriorityInternalNameDispNameMap.set( internalValues[j], values[j] );
    }
    return listOfValues;
};

export let selectionChangeCreatePanel = function( data ) {
    //TODO: wire in edithandler leaveConfirmation code here when ready
    var convCtx = convUtils.getAc0ConvCtx();
    if ( !convCtx.editConvCtx ) {
        navigateToOnObjPanel( data );
        return;
    }
    if ( convCtx.editConvCtx ) {
        convCtx.editConvCtx = null;
        var buttons = [ {
            addClass: 'btn btn-notify',
            text: data.i18n.saveEditsGroupPWATitle,
            onClick: function( $noty ) {
                $noty.close();
                exports.postConversation( data ).then( function() {
                    navigateToOnObjPanel( data );
                } );
            }
        },
        {
            //Call soa if clicked on proceed
            addClass: 'btn btn-notify',
            text: data.i18n.discard,
            onClick: function( $noty ) {
                $noty.close();
                navigateToOnObjPanel( data );
            }
        } ];
        messageSvc.showWarning( data.i18n.possibleUnsavedEdits, buttons );
    }
};

var navigateToOnObjPanel = function( data ) {
    destroyCkEditorInstance( data );
    if( convUtils.isDiscussionSublocation() ) {
        eventBus.publish( 'ac0DiscussLocation.saveOrDiscard' );
    } else{
        var navCtx = {
            destPanelId: 'Ac0UnivConvPanelSub'
        };
        eventBus.publish( 'awPanel.navigate', navCtx );
    }
};

var getDiscussionOptions = function( data ) {
    if( typeof data.snapshotObjUid !== 'undefined' && data.snapshotObjUid !== null ) {
       return [ { key : 'Fnd0Snapshot', value : [ data.snapshotObjUid ] } ];
    }
    return null;
};

var getRemovedRelatedObjectList = function( relatedObjList, removedRelatedObjects ) {
    var removedRelatedObjUIDList = removedRelatedObjects.map( ( removedObj ) => { return removedObj.uid; } );
    var relatedObjAfterRemove = relatedObjList.reduce( ( acc, relatedObj ) => {
        if( acc.hasOwnProperty( relatedObj.type ) ) {
            if( !removedRelatedObjUIDList.includes( relatedObj.uid ) ) {
                if( acc[relatedObj.type].length === 0 ) {
                    acc[relatedObj.type] = [];
                }
                acc[relatedObj.type].push( relatedObj.uid );
            }
        }else {
            acc[relatedObj.type] = '';
            if( !removedRelatedObjUIDList.includes( relatedObj.uid ) ) {
                acc[relatedObj.type] = [ relatedObj.uid ];
            }
        }
        return acc;
    }, {} );
    return Object.keys( relatedObjAfterRemove ).map( ( relObjAfterRemoveKey ) => {
        return { key: relObjAfterRemoveKey, value: relatedObjAfterRemove[relObjAfterRemoveKey] };
    } );
};

/**
 * Ac0CreateCollabObjectService factory
 */

export default exports = {
    setIsTextValid,
    showRichTextEditor,
    updateFormData,
    insertImage,
    getRichText,
    getPlainText,
    isInputTextValid,
    warnParticipantSourceNoReadAccess,
    changeConvType,
    changeConvActionable,
    initCreateCollabObjectPanel,
    modifyCreateCtxFlagsForCollabObjs,
    postComment,
    postConversation,
    destroyCkEditorInstance,
    setCkEditorData,
    openAddParticipantsPanel,
    processStatusLOV,
    processPriorityLOV,
    selectionChangeCreatePanel,
    evalNavPathPriorToCKEDecision,
    unSubscribeFromCkeEvents,
    checkCKEInputTextValidityAndPublishEvent
};

/**
 *
 * @memberof NgServices
 * @member Ac0CreateCollabObjectService
 */
app.factory( 'Ac0CreateCollabObjectService', () => exports );
