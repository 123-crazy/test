// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ac0ConversationService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import uwPropSvc from 'js/uwPropertyService';
import vmoSvc from 'js/viewModelObjectService';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import popUpSvc from 'js/popupService';
import createConvSvc from 'js/Ac0CreateCollabObjectService';
import dms from 'soa/dataManagementService';
import awIconSvc from 'js/awIconService';
import convUtils from 'js/Ac0ConversationUtils';
import policySvc from 'soa/kernel/propertyPolicyService';
import ac0NotySvc from 'js/Ac0NotificationService';
import ac0EditSvc from 'js/Ac0EditCollabObjectService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import graphQLSvc from 'js/graphQLService';
import soaSvc from 'soa/kernel/soaService';
import declUtils from 'js/declUtils';
import dateTimeSvc from 'js/dateTimeService';
import msgSvc from 'js/messagingService';
import browserUtils from 'js/browserUtils';
import sanitizer from 'js/sanitizer';

var exports = {};

var Ac0ConvCtx = {};

var parentData = {};

var selectedConv = {};

/**
 * The rich text that was entered into editor
 *
 * @param {Object} vmData view model data
 */
export let universalConversationPanelReveal = function( vmData ) {
    vmData.activeView = 'Ac0UnivConvPanelSub';
};

export let feedLocationReveal = function( vmData ) {
    vmData.activeView = 'Ac0FeedSummary';
};

// ****************************************************************************
// Begin block of internally called functions
// Generally a function should be declared in a file before it is used.
// ****************************************************************************


/**
 * method to prepare comment cell. This method dresses up the 'root comment' cell as well as other comments.
 * For root comment, all params are passed. For individual comments, index and vmData are optional.
 * @param {*} vmObject ViewModelObject
 * @param {*} plainText plain text comment
 * @param {*} richText rich text comment
 * @param {*} index optional - index of root comment in conversation search result. Necessary for unique id in view.
 * @param {*} vmData optional - ViewModelData where Conversation resides. Needed for i18n strings
 */
var prepareCommentCellViewModelObject = function( vmObject, plainText, richText, index, vmData ) {
    //prep chip data section

    vmObject.isSourceObjVisible = false;
    vmObject.isParticipantObjVisible = false;

    setupTileSourceObjInfo( vmObject, index, vmData );

    setupTileParticipantInfo( vmObject, index, vmData );

    //prep plainText/richText comment setion
    vmObject.props.curtailedComment = plainText;

    setupTileMoreLessSection( vmObject, richText, plainText, vmData );

    vmObject.hasThumbnail = false;
    if( vmObject.thumbnailUrl ) {
        vmObject.hasThumbnail = true;
    }

    if( vmObject.props.userName && vmObject.props.userName.displayValues[0] ) {
        vmObject.props.userName.displayValues[0] = vmObject.props.userName.displayValues[0].split( '(' )[0].trim();
    }

    if( vmObject.props.modifiedDateTime && vmObject.props.modifiedDateTime.dbValues !== null ) {
        var twentyFourHours = 24 * 60 * 60 * 1000;
        var timeInMs = Date.now();
        var conversationModifiedDateTime = new Date( vmObject.props.modifiedDateTime.dbValues ).getTime();
        if ( timeInMs - conversationModifiedDateTime  > twentyFourHours ) {
            vmObject.props.modifiedDateTime.displayValues[0] = vmObject.props.modifiedDateTime.displayValues[0].split( ' ' )[0];
        } else{
            vmObject.props.modifiedDateTime.displayValues[0] = new Date( vmObject.props.modifiedDateTime.dbValues ).toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
        }
    }
     //add ckeditor id ref to vmObject
     vmObject.ckEditorIdRef = 'ckeditor_cmtReply_' + index;

     //Update latest comment dateTime
     vmObject.hasReplies = false;
     vmObject.haslatestCommentThumbnail = false;
     if( vmObject.props.numReplies ) {
        if( vmObject.props.numReplies.dbValue > 0 && vmObject.props.latestCommentmodifiedDateTime ) {
            if( vmObject.latestCommentthumbnailUrl ) {
                vmObject.haslatestCommentThumbnail = true;
            }
            vmObject.hasReplies = true;
            var plainTextLC = vmObject.props.latestCommentplainText ? vmObject.props.latestCommentplainText.displayValues[0] : '';
            var richTextLC = vmObject.props.latestCommentrichText ? vmObject.props.latestCommentrichText.displayValues[0] : '';
            var sanitizedRichTxt = sanitizer.sanitizeHtmlValue( richTextLC );
            richTextLC = sanitizedRichTxt;
            if( typeof vmObject.props.latestCommentrichText !== 'undefined' ) {
                vmObject.props.latestCommentrichText.displayValues[0] = richTextLC;
            }
            setupTileMoreLessSectionLC( vmObject, richTextLC, plainTextLC, vmData );
            if( vmObject.props.latestCommentmodifiedDateTime && vmObject.props.latestCommentmodifiedDateTime.dbValues !== null ) {
                var twentyFourHours = 24 * 60 * 60 * 1000;
                var timeInMs = Date.now();
                var conversationModifiedDateTime = new Date( vmObject.props.latestCommentmodifiedDateTime.dbValues ).getTime();
                if ( timeInMs - conversationModifiedDateTime  > twentyFourHours ) {
                    vmObject.props.latestCommentmodifiedDateTime.displayValues[0] = vmObject.props.latestCommentmodifiedDateTime.displayValues[0].split( ' ' )[0];
                } else{
                    vmObject.props.latestCommentmodifiedDateTime.displayValues[0] = new Date( vmObject.props.latestCommentmodifiedDateTime.dbValues ).toLocaleTimeString( [], { hour: '2-digit', minute: '2-digit' } );
                }
            }
        }
    }
};

var setupTileMoreLessSectionLC = function( vmObject, richText, plainText, vmData ) {
    vmObject.showMoreLC = false;
    vmObject.showMoreLinkLC = false;
    vmObject.showLessLinkLC = false;

    //prep more/less link section
    if( richText && richText.length > 0 ) {
        vmObject.props.latestCommentrichTextObject = convUtils.processRichText( richText );
        vmObject.showMoreLC = vmObject.props.latestCommentrichTextObject.showMore;
    }else {
        vmObject.props.latestCommentplainTextObject = convUtils.processPlainText( plainText );
        vmObject.showMoreLC = vmObject.props.latestCommentplainTextObject.showMore;
    }

    vmObject.showMoreLinkLC = vmObject.showMoreLC;
    vmObject.moreLinkLC = uwPropSvc.createViewModelProperty( 'moreLinkLC', vmData.i18n.more, 'STRING', 'more' );
    vmObject.lessLinkLC = uwPropSvc.createViewModelProperty( 'lessLinkLC', vmData.i18n.less, 'STRING', 'less' );
    vmObject.doShowMoreLC = function( dpItem ) {
        dpItem.showMoreLC = false;
        dpItem.showMoreLinkLC = false;
        dpItem.showLessLinkLC = true;
    };
    vmObject.doShowLessLC = function( dpItem ) {
        dpItem.showMoreLC = true;
        dpItem.showMoreLinkLC = true;
        dpItem.showLessLinkLC = false;
    };
};

var setupTileSourceObjInfo = function( vmObject, index, vmData ) {
    //for conversations-
    //display source obj chips only if
    //query returns sourceObjList and it is not an empty array and
    //if sourceObjList length is more than 1, then display
    //if sourceObjList length equals 1 and sourceObj returned isn't the selected context object, then display

    if( vmObject.props.sourceObjList && vmObject.props.sourceObjList.dbValues && vmObject.props.sourceObjList.dbValues.length > 0 ) {
        //setup isSourceObjVisible - > 1 || == 1 and not selected
        //setup chipData - > 1 || == 1 and not selected
        //setup chipData link - > 1 || == 1 and not selected
        //setup more srcObj link - > 1
        //setup more srcObj chips - > 1
        //setup more srcObj chips link
        vmObject.isSourceObjVisible = true;
        vmObject.srcObjIdRef = 'collabSrcObjs_' + index;
        vmObject.chipData.labelDisplayName = vmObject.props.sourceObjList.dbValues[0].object_string;
        vmObject.chipData.labelInternalName = vmObject.props.sourceObjList.dbValues[0].object_string;
        vmObject.chipData.objUid = vmObject.props.sourceObjList.dbValues[0].uid;
        vmObject.chipData.extendedTooltip = {
            extendedTooltipContent: vmObject.props.sourceObjList.dbValues[0].object_string
        };

        if( vmObject.props.sourceObjList.dbValues.length > 1 ) {
            var moreSourceObjPopupLinkString = '+ ' + ( vmObject.props.sourceObjList.dbValues.length - 1 ).toString() + ' ' + vmData.i18n.more;
            vmObject.moreSourceObjPopupLink = uwPropSvc.createViewModelProperty( 'moreSourceObj', moreSourceObjPopupLinkString, 'STRING', 'more' );
            vmObject.clickSrcObjLink = function( dpItem ) {
                var moreSrcObjList = dpItem.props.sourceObjList.dbValues.slice( 1 );
                var moreSrcObjChipList = [];
                for( var ii = 0; ii < moreSrcObjList.length; ii++ ) {
                    var moreSrcObjChip = {
                        chipType: 'BUTTON',
                        labelDisplayName: moreSrcObjList[ii].object_string,
                        labelInternalName: moreSrcObjList[ii].object_string,
                        objUid: moreSrcObjList[ii].uid,
                        extendedTooltip : {
                            extendedTooltipContent: moreSrcObjList[ii].object_string
                        }
                    };
                    moreSrcObjChipList.push( moreSrcObjChip );
                }
                var data = {
                    declView: 'Ac0MoreSourceObjPopup',
                    options: {
                        reference: dpItem.srcObjIdRef,
                        placement: 'top-start',
                        hasArrow: true,
                        whenParentScrolls: 'close'
                    },
                    subPanelContext: moreSrcObjChipList
                };
                popUpSvc.show( data );
            };
        }
        if( vmObject.props.sourceObjList.dbValues.length === 1 && vmObject.props.sourceObjList.dbValues[0].uid === convUtils.getObjectUID( appCtxSvc.getCtx( 'selected' ) ) ) {
            vmObject.isSourceObjVisible = false;
        }
    }
};

var setupTileParticipantInfo = function( vmObject, index, vmData ) {
    if( vmObject.props.participantObjList && vmObject.props.participantObjList.dbValues && vmObject.props.participantObjList.dbValues.length > 0 && vmObject.props.participantObjList.dbValues[0] ) {
        var participantUids = [];
        vmObject.participantIdRef = 'collabParticipants_' + index;
        for( var ii = 0; ii < vmObject.props.participantObjList.dbValues.length; ii++ ) {
            participantUids.push( vmObject.props.participantObjList.dbValues[ii].uid );
        }
        if( participantUids.length > 0 ) {
            vmObject.props.participantUids = participantUids;
            vmObject.props.inflatedParticipantObjList = [];
            vmObject.props.inflatedParticipantObjVMOList = [];
            dms.loadObjects( participantUids ).then( function() {
                var totalNoOfVisibleParticipants = participantUids.length > 3 ? 3 : participantUids.length;
                for( var nn = 0; nn < participantUids.length; nn++ ) {
                    var usrObj = cdm.getObject( participantUids[nn] );
                    //Create Participant VMOs
                    let vmo = viewModelObjectSvc.createViewModelObject( usrObj );
                    if( nn < totalNoOfVisibleParticipants ) { //total no. of participants to be visible initially
                        usrObj.props.thumbnailUrl = awIconSvc.getThumbnailFileUrl( usrObj );
                        usrObj.props.hasThumbnail = true;
                        if( usrObj.props.object_string && usrObj.props.object_string.dbValues ) {
                            usrObj.props.participantNameTooltip = {
                                extendedTooltipContent: usrObj.props.object_string.dbValues[0].split( '(' )[0].trim()
                            };
                        }
                        vmObject.props.inflatedParticipantObjList.push( usrObj );
                    }
                    vmObject.props.inflatedParticipantObjVMOList.push( vmo );
                }
                vmObject.isParticipantObjVisible = true;

                if( vmObject.props.participantUids.length > 3 ) {
                    var moreParticipantPopupLinkString = '+ ' + ( vmObject.props.participantUids.length - 3 ).toString() + ' ' + vmData.i18n.more;
                    vmObject.moreParticipantPopupLink = uwPropSvc.createViewModelProperty( 'moreParticipant', moreParticipantPopupLinkString, 'STRING', 'more' );
                    vmObject.clickParticipantLink = function( dpItem ) {
                        var moreParticipantList = [];
                        for( var mm = 3; mm < vmObject.props.participantUids.length; mm++ ) {
                            var moreUsrObj = cdm.getObject( participantUids[mm] );
                            moreUsrObj.props.thumbnailUrl = awIconSvc.getThumbnailFileUrl( moreUsrObj );
                            moreUsrObj.props.participantNameTooltip = {
                                extendedTooltipContent: moreUsrObj.props.object_string.dbValues[0].split( '(' )[0].trim()
                            };
                            moreUsrObj.props.displayValue = {
                                propertyDisplayName: moreUsrObj.props.object_string.dbValues[0].split( '(' )[0].trim(),
                                type: 'STRING'
                            };
                            moreParticipantList.push( moreUsrObj );
                        }

                        var data = {
                            declView: 'Ac0MoreParticipantPopup',
                            options: {
                                reference: dpItem.participantIdRef,
                                placement: 'top-start',
                                hasArrow: true,
                                whenParentScrolls: 'close'
                            },
                            subPanelContext: moreParticipantList
                        };
                        popUpSvc.show( data );
                    };
                }
            } );
        }
    }
};

var setupTileMoreLessSection = function( vmObject, richText, plainText, vmData ) {
    vmObject.showMore = false;
    vmObject.showMoreLink = false;
    vmObject.showLessLink = false;

    //prep more/less link section
    if( richText && richText.length > 0 ) {
        vmObject.props.richTextObject = convUtils.processRichText( richText );
        vmObject.showMore = vmObject.props.richTextObject.showMore;
    }else {
        vmObject.props.plainTextObject = convUtils.processPlainText( plainText );
        vmObject.showMore = vmObject.props.plainTextObject.showMore;
    }

    vmObject.showMoreLink = vmObject.showMore;
    vmObject.expandComments = false;
    vmObject.moreLink = uwPropSvc.createViewModelProperty( 'moreLink', vmData.i18n.more, 'STRING', 'more' );
    vmObject.lessLink = uwPropSvc.createViewModelProperty( 'lessLink', vmData.i18n.less, 'STRING', 'less' );
    vmObject.doShowMore = function( dpItem ) {
        dpItem.showMore = false;
        dpItem.showMoreLink = false;
        dpItem.showLessLink = true;
    };
    vmObject.doShowLess = function( dpItem ) {
        dpItem.showMore = true;
        dpItem.showMoreLink = true;
        dpItem.showLessLink = false;
    };
};

var setupMoreCmtCellCmdInfo = function( vmObject, index, performOwningUserVisibilityCheck ) {
    var indx = index ? index : 'AA';
    vmObject.showMoreCmtCellCmds = true;
    if( performOwningUserVisibilityCheck ) {
        vmObject.showMoreCmtCellCmds = vmObject.props.uid.dbValue === appCtxSvc.ctx.user.uid;
    }
    vmObject.moreCmtCellCmdsIdRef = 'collabCmtCmd' + Math.floor( 10000000 * Math.random() ) + '_' + indx;
    vmObject.commentCKEId = 'collabCmtEdit' + Math.floor( 10000000 * Math.random() ) + '_' + indx;
    vmObject.ckeImgUploadEvent = 'ac0EditComm.insertImageInCKEditor_' + vmObject.commentCKEId;
    vmObject.beingEdited = false;
    vmObject.doShowMoreCmtCellCmds = function( dpItem ) {
            var data = {
                declView: 'Ac0MoreCmtCellCmdsPopup',
                options: {
                    reference: dpItem.moreCmtCellCmdsIdRef,
                    placement: 'bottom-start',
                    hasArrow: true,
                    whenParentScrolls: 'close'
                },
                subPanelContext: dpItem
            };
            popUpSvc.show( data ).then( function( popupRef ) {
                var convCtx =  convUtils.getAc0ConvCtx();
                convCtx.moreCellCmtCmdPopupRef = popupRef;
                appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
            } );
        };
};

var setupCmtEditLink = function( vmObject, vmData, index ) {
    vmObject.doSaveEditComment = function( dpItem ) {
        ac0EditSvc.saveEditComment( dpItem );
    };
    vmObject.doDiscardEditComment = function( dpItem ) {
        ac0EditSvc.discardEditComment( dpItem );
    };
};

/**
 * Method that creates a VMO from the root comment properties
 * @param {*} convProps conversation properties
 * @returns {Object} ViewModelObject
 */
var createRootCommentVMO = function( convProps ) {
    var serverVMO = {
        props: {}
    };
    serverVMO.uid = convProps.rootCommentUID ? convProps.rootCommentUID.displayValues[0] : '';
    serverVMO.props[convProps.richText ? convProps.richText.propertyName : 'collabRichText'] = convProps.richText ? convProps.richText.displayValues[0] : '';
    serverVMO.props[convProps.plainText ? convProps.plainText.propertyName : 'collabPlainText'] = convProps.plainText ? convProps.plainText.displayValues[0] : '';
    return vmoSvc.constructViewModelObject( serverVMO );
};

/**
 * Return the source objects
 * @param {Object} data Data
 * @returns {Object} array of sourceObjects
 */
export let getSourceObjects = function( data ) {
    var sourceObjs = [];
    var sourceTags = data.srcObjChips ? data.srcObjChips : parentData.srcObjChips;
    if( sourceTags ) {
        for ( var i = 0; i < sourceTags.length; i++ ) {
            if( sourceTags[i].theObject ) {
                var obj = {
                    uid: sourceTags[i].theObject.uid,
                    type: sourceTags[i].theObject.type
                };
                sourceObjs.push( obj );
            }
        }
    }

    return sourceObjs;
};

/**
 * Return the source objects
 * @param {Object} data Data
 * @returns {Array} users
 */
export let getUserObjects = function( data ) {
    var userObjs = [];
    var userTags = data.userChips ? data.userChips : parentData.userChips;

    if( userTags ) {
        for ( var i = 0; i < userTags.length; i++ ) {
            if( userTags[i].theObject ) {
                var obj = {
                    uid: userTags[i].theObject.uid,
                    type: userTags[i].theObject.type
                };
                userObjs.push( obj );
            }
        }
    }

    return userObjs;
};

/**
 * Method that navigates to Create Conversation Panel
 * @param {*} vmData ViewModelData
 */
export let navigateToCreateConv = function( vmData ) {
    vmData.activeView = 'Ac0CreateNewCollabObj';
    var navContext = {
        destPanelId: 'Ac0CreateNewCollabObj',
        title: vmData.i18n.newConversation,
        recreatePanel: true,
        isolateMode: false,
        supportGoBack: true
    };
    var convCtx = convUtils.getAc0ConvCtx();
    convCtx.editConvCtx = null; //coming from create. Make this flag null.
    if( convCtx.activeCell ) {
        convCtx.activeCell.expandComments = false;
    }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    destroyActiveCellCkeEditor();
    createConvSvc.modifyCreateCtxFlagsForCollabObjs( true, false );

    eventBus.publish( 'awPanel.navigate', navContext );
};

/**
 * Method that navigates to Create Comment panel (When Advanced option is clicked on reply box)
 * @param {*} vmData ViewModel data
 * @param {*} convData Conversation data
 */
export let navigateToCreateComment = function( vmData, convData ) {
    vmData.activeView = 'Ac0CreateNewCollabObj';
    var navContext = {
        destPanelId: 'Ac0CreateNewCollabObj',
        title: vmData.i18n.newComment,
        recreatePanel: true,
        isolateMode: false,
        supportGoBack: true
    };

    createConvSvc.modifyCreateCtxFlagsForCollabObjs( false, true );
    if( convData ) {
        var convCtx = convUtils.getAc0ConvCtx();
        convCtx.createCommentRootCommentObj = convData.rootCommentObj;
        convCtx.createCommentConvId = convData.uid;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    }
    destroyActiveCellCkeEditor();
    eventBus.publish( 'awPanel.navigate', navContext );
};

/**
 * This method removes a chip from a chip array. Taken from chipShowCaseService.js
 * @param {*} chipArray array of chips from the chip dataprovider
 * @param {*} chipToRemove chip that needs to be removed
 */
export let removeChipObj = function( chipArray, chipToRemove ) {
    if( chipToRemove ) {
        _.pullAllBy( chipArray, [ { labelDisplayName: chipToRemove.labelDisplayName } ], 'labelDisplayName' );
        if( parentData.convType.dbValue === 'message' && typeof chipToRemove.theObject.modelType !== 'undefined' && chipToRemove.theObject.modelType.typeHierarchyArray.indexOf( 'User' ) > -1 ) {
            var user = appCtxSvc.getCtx( 'user' );
            var chipExisted = _.find( chipArray, function( chip ) {
                return chip.theObject.uid === user.uid;
            } );
            if( !chipExisted ) {
                parentData.showWarnOnRemovingUserMsg = true;
            }
        }
        eventBus.publish( 'Ac0.validateParticipantSourceReadAccess' );
    }
};

/**
 * Method that handles selection change updates
 * @param {*} eventData event
 * @param {*} vmData view model data
 */
export let onObjectTabSelectionChange = function( eventData, vmData ) {
    //Update the context first
    convUtils.setSelectedObjectInContext( null );

    var convCtx = convUtils.getAc0ConvCtx();
    if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.props &&
        appCtxSvc.ctx.selected.props.awb0UnderlyingObject ) {
        var underlyingUid = appCtxSvc.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
        dmSvc.getProperties( [ underlyingUid ], [ 'object_name' ] ).then( function( response ) {
            var underlyingObj = cdm.getObject( underlyingUid );
            var dbStringValue = underlyingObj.props.object_name.dbValues[0];
            var uiStringValue = underlyingObj.props.object_name.uiValues[0];
            convCtx.selected = underlyingObj;
            convCtx.selected.props.object_name.dbValue = dbStringValue;
            convCtx.selected.props.object_name.uiValue = uiStringValue;

            uwPropSvc.setValue( vmData.selectedObject, uiStringValue );
        } );
    } else {
        //Then update the passed in vm data
        vmData.selectedObject.dbValue = convCtx.selected.props.object_name.dbValue;
        vmData.selectedObject.uiValue = convCtx.selected.props.object_name.uiValue;
    }
};

/**
 * Determine if the user has permission to use the delete command
 */
export let deleteCommandValidForCurrentGroupRole = function() {
    var convCtx =  convUtils.getAc0ConvCtx();
    if( typeof convCtx.deleteCommandValidForCurrentGroupRole !== 'undefined' ) {
        return convCtx.deleteCommandValidForCurrentGroupRole;
    }

    var ctxDeletePrefVerdict = false;
    var prefValueArray = appCtxSvc.ctx.preferences.Ac0DeleteDiscussionGroupRole;
    for( var i = 0; i < prefValueArray.length; i++ ) {
        var delDiscGroupRole = prefValueArray[i];
        var groupVal = delDiscGroupRole.split( '/' )[0];
        var roleVal = delDiscGroupRole.split( '/' )[1];
        if( appCtxSvc.ctx.userSession.props.group_name.dbValue === groupVal
                      && appCtxSvc.ctx.userSession.props.role_name.dbValue === roleVal ) {
            ctxDeletePrefVerdict = true;
            break;
        }
    }

    convCtx.deleteCommandValidForCurrentGroupRole = ctxDeletePrefVerdict;
    appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );

    return ctxDeletePrefVerdict;
};

/**
 * Method that modifies conversations before display.
 * @param {*} vmData view model data that contains conversation search results
 */
export let modifyConversations = function( vmData ) {
    var ctxDeletePrefVerdict = deleteCommandValidForCurrentGroupRole();

    for( var ii = 0; ii < vmData.searchResults.length; ii++ ) {
        vmData.searchResults[ii].chipData = {
            chipType: 'BUTTON',
            labelDisplayName: '',
            labelInternalName: '',
            objUid: ''
        };

        var plainText = vmData.searchResults[ii].props.plainText ? vmData.searchResults[ii].props.plainText.displayValues[0] : '';
        var richText = vmData.searchResults[ii].props.richText ? vmData.searchResults[ii].props.richText.displayValues[0] : '';
        var sanitizedRichTxt = sanitizer.sanitizeHtmlValue( richText );
        richText = sanitizedRichTxt;
        if( typeof vmData.searchResults[ii].props.richText !== 'undefined' ) {
            vmData.searchResults[ii].props.richText.displayValues[0] = richText;
        }
        prepareCommentCellViewModelObject( vmData.searchResults[ii], plainText, richText, ii, vmData );
        vmData.searchResults[ii].isRootComment = true;

        var replyLinkString = '';
        var replyNums = vmData.searchResults[ii].props.numReplies ? vmData.searchResults[ii].props.numReplies.dbValue : '0';
        if( replyNums === 1 ) {
            replyLinkString = replyNums + ' ' + vmData.i18n.reply;
        }else {
            replyLinkString = replyNums + ' ' + vmData.i18n.replies;
        }

        vmData.searchResults[ii].expandCommentsLink = uwPropSvc.createViewModelProperty( 'expandComments', replyLinkString, 'STRING', 'replies' );
        vmData.searchResults[ii].doExpandComments = function( dpItem ) {
            //teardown when comments are collapsed - make cursorStartIndx undefined
            if( dpItem.expandComments && dpItem.cursorStartIndx ) {
                dpItem.cursorStartIndx = dpItem.props.numReplies.dbValue;
            }
            var ac0ConvCtx = convUtils.getAc0ConvCtx();
            if( convUtils.isDiscussionSublocation()  ) { // don't need active cell logic in discussions subloc SWA
                dpItem.expandComments = !dpItem.expandComments;
                return;
             }
            //same cell collapseComment link is clicked
             if( !ac0ConvCtx.activeCell || ac0ConvCtx.activeCell.uid === dpItem.uid ) {
                ac0ConvCtx.activeCell = dpItem;
                ac0ConvCtx.activeCell.expandComments = !ac0ConvCtx.activeCell.expandComments;
                appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
                return;
             }
            //different cell expandComment link is clicked
             if( ac0ConvCtx.activeCell.uid !== dpItem.uid ) {
                 //clean up previous activeCell
                 ac0ConvCtx.activeCell.expandComments = false;
                 ac0ConvCtx.activeCell.cursorStartIndx = ac0ConvCtx.activeCell.props.numReplies.dbValue;
                 //createConvSvc.destroyCkEditorInstance( ac0ConvCtx.activeCell );
                 destroyActiveCellCkeEditor();
                 //cleanup complete
                 ac0ConvCtx.activeCell = dpItem;
                 ac0ConvCtx.activeCell.expandComments = !ac0ConvCtx.activeCell.expandComments;
                 appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
             }
        };
        vmData.searchResults[ii].collapseCommentsLink = uwPropSvc.createViewModelProperty( 'collapseComments', vmData.i18n.collapse, 'STRING', 'collapse' );

        vmData.searchResults[ii].followConvLink = uwPropSvc.createViewModelProperty( 'followConv', vmData.i18n.follow, 'STRING', 'follow' );
        vmData.searchResults[ii].doFollowConv = function( dpItem ) {
            //teardown when comments are collapsed - make cursorStartIndx undefined
            if( dpItem.showFollowConv ) { //if show follow is true, then we need to follow
                ac0NotySvc.collabSubscribeToConversation( dpItem ).then( function( responseData ) {
                    dpItem.showFollowConv = !dpItem.showFollowConv;
                } );
            }else {
                ac0NotySvc.collabUnSubscribeToConversation( dpItem ).then( function( responseData ) {
                    dpItem.showFollowConv = !dpItem.showFollowConv;
                } );
            }
        };
        vmData.searchResults[ ii ].isConvActionable = Boolean( vmData.searchResults[ ii ].props.convStatus && vmData.searchResults[ ii ].props.convStatus.dbValue !== '' );
        vmData.searchResults[ ii ].convStatusModifiable = vmData.searchResults[ ii ].isConvActionable && checkIfLoggedInUserIsParticipant( vmData.searchResults[ ii ] );
        if ( vmData.searchResults[ ii ].props.collabRelatedObjectInfo ) {
            vmData.searchResults[ ii ].discussionHasSnapshot = Boolean( vmData.searchResults[ ii ].props.collabRelatedObjectInfo.dbValue.length > 0 );
            vmData.searchResults[ ii ].convViewSnapshotPerm = vmData.searchResults[ ii ].discussionHasSnapshot && checkIfLoggedInUserIsParticipant( vmData.searchResults[ ii ] );
        }
        vmData.searchResults[ii].unfollowConvLink = uwPropSvc.createViewModelProperty( 'unfollowConv', vmData.i18n.unfollow, 'STRING', 'unfollow' );
        vmData.searchResults[ii].showFollowConv = !vmData.searchResults[ii].props.isConvNotificationSubscribed.dbValue;
        vmData.searchResults[ii].showDeleteLink = ctxDeletePrefVerdict;
        vmData.searchResults[ii].showDeleteLink = true;
        vmData.searchResults[ii].deleteConvLink = uwPropSvc.createViewModelProperty( 'deleteConv', vmData.i18n.delete, 'STRING', 'delete' );
        vmData.searchResults[ii].doDeleteConv = function( dpItem ) {
            eventBus.publish( 'Ac0.initiateDeleteConversationEvent', dpItem );
        };
        //more commands command
        vmData.searchResults[ii].showMoreCellCmds = true;
        vmData.searchResults[ii].moreCellCmdsIdRef = 'collabMoreCellCmds_' + ii;
        vmData.searchResults[ii].doShowMoreCmds = function( dpItem ) {
            var ac0ConvCtx = convUtils.getAc0ConvCtx();
            ac0ConvCtx.convDP = vmData.dataProviders.conversationDataProvider;
            appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
            var data = {
                declView: 'Ac0MoreConvCellCmdsPopup',
                options: {
                    reference: dpItem.moreCellCmdsIdRef,
                    placement: 'bottom-start',
                    hasArrow: true,
                    whenParentScrolls: 'close'
                },
                subPanelContext: dpItem
            };
            popUpSvc.show( data ).then( function( popupRef ) {
                var convCtx = convUtils.getAc0ConvCtx();
                convCtx.moreCellCmdPopupRef = popupRef;
                appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
            } );
        };
        setupMoreCmtCellCmdInfo( vmData.searchResults[ii], ii, true );
        setupCmtEditLink( vmData.searchResults[ii], vmData, ii );
        vmData.searchResults[ii].moreDesc = {
            extendedTooltipContent: vmData.i18n.more
        };
        vmData.searchResults[ii].followConvDesc = {
            extendedTooltipContent: vmData.i18n.followConvDesc
        };
        vmData.searchResults[ii].unFollowConvDesc = {
            extendedTooltipContent: vmData.i18n.unFollowConvDesc
        };

        vmData.searchResults[ii].rootCommentObj = createRootCommentVMO( vmData.searchResults[ii].props );
        vmData.searchResults[ii].showConvCellCmds = false;
        vmData.searchResults[ii].cursorStartIndx = parseInt( replyNums );
        vmData.searchResults[ii].cursorEndIndx = parseInt( replyNums );
    }
};

/**
 * Method that checks if logged in user is participant in given conversation
 * @param {*} convObj conversation vmo
 * @param {*} currentCommentCtx current comment context used to control reply box visibility
 */
export let checkIfLoggedInUserIsParticipant = function( convObj ) {
    var loggedInUserIsParticipant = false;
    var currentUserUid = appCtxSvc.ctx.user.uid;
    var participantsArray = convObj.props.participantObjList.dbValue;
    if( participantsArray && participantsArray.length > 0 ) {
        for( var i = 0; i < participantsArray.length; i++ ) {
            var participant = participantsArray[ i ];
            if( participant && participant.uid === currentUserUid ) {
                loggedInUserIsParticipant = true;
                break;
            }
        }
    }
    return loggedInUserIsParticipant;
};

/**
 * Method that modifies comments within a conversation tile before display.
 * @param {*} vmData view model data
 * @param {*} currentCommentCtx current comment context used to control reply box visibility
 */
export let modifyComments = function( vmData, currentCommentCtx ) {
    for( var ii = 0; ii < vmData.searchResults.length; ii++ ) {
        var plainText = vmData.searchResults[ii].props.plainText ? vmData.searchResults[ii].props.plainText.displayValues[0] : null;
        var richText = vmData.searchResults[ii].props.richText ? vmData.searchResults[ii].props.richText.displayValues[0] : null;
        var sanitizedRichTxt = sanitizer.sanitizeHtmlValue( richText );
        richText = sanitizedRichTxt;
        if( typeof vmData.searchResults[ii].props.richText !== 'undefined' ) {
            vmData.searchResults[ii].props.richText.displayValues[0] = richText;
         }
        prepareCommentCellViewModelObject( vmData.searchResults[ii], plainText, richText, null, vmData );
        setupMoreCmtCellCmdInfo( vmData.searchResults[ii], ii, true );
        setupCmtEditLink( vmData.searchResults[ii], vmData, ii );
    }

    if( currentCommentCtx.cursorStartIndx === 0 ) {
        vmData.moreCommentsAvailable = false;
    }
    vmData.dataProviders.commentsDataProvider.cursorObject.endReached = true; //trick the dp to not page
    vmData.commentsDataProviderNotCalled = false;
};

/**
 * Method that invokes post comment action once reply button is clicked. Does some post processing to update dp on the fly
 * @param {*} convObj conversation object
 * @param {*} vmData view model data
 * @returns {*} Promise
 */

export let replyBoxAction = function( convObj, vmData ) {
    var deferred = AwPromiseService.instance.defer();
    if( typeof convObj.ckeInstance === 'undefined' ) {
        convObj.ckeInstance = vmData.ckeInstance;
    }
    var ckeText = createConvSvc.getRichText( convObj.ckeInstance.cke._instance );
    var respRichText;
    //if reply button is clicked without any text, return
    if( _.isNull( ckeText ) ) {
        deferred.resolve( {} );
        return deferred.promise;
    }
    var policyDef = {
        types: [  {
            name: 'Ac0Comment',
            properties: [ {
                name: 'awp0CellProperties'
            }, {
                name: 'ac0CreateDate'
            }, {
                name: 'ac0DateModified'
            }, {
                name: 'ac0RichText'
            } ]
        } ]
    };
    var policyId = policySvc.register( policyDef );
    createConvSvc.postComment( convObj, ckeText, undefined, vmData ).then( function( responseData ) {
        if( policyId ) {
            policySvc.unregister( policyId );
        }
        var vms = vmData.dataProviders.commentsDataProvider.getViewModelCollection().getLoadedViewModelObjects();
        var svmo = {
            props: {
                richText: '',
                plainText: '',
                modifiedDateTime: ''
            }
        };
        svmo.uid = 'temp888OBJ144';
        svmo.type = 'Ac0Comment';
        var newCommentObj = vmoSvc.constructViewModelObject( svmo );
        newCommentObj.props.plainText = {};
        newCommentObj.props.plainText.displayValues = [];
        newCommentObj.props.richText = {};
        newCommentObj.props.richText.displayValues = [];
        newCommentObj.props.modifiedDateTime = {};
        newCommentObj.props.modifiedDateTime.displayValues = [];
        newCommentObj.props.modifiedDateTime.dbValues = '';
        newCommentObj.props.plainText.displayValues.push( vmData.replyPlaceHolder.dbValue );

        //Handle the response when creating
        if( responseData && !_.isEmpty( responseData.data.createComment )
        && !_.isEmpty( responseData.data.createComment.createdOrUpdatedCollabObject ) &&
        responseData.data.createComment.createdOrUpdatedCollabObject.collabPlainText &&
        responseData.data.createComment.createdOrUpdatedCollabObject.collabPlainText.length > 0 ) {
            newCommentObj.props.modifiedDateTime.displayValues.push( responseData.data.createComment.createdOrUpdatedCollabObject.collabDateModified );
            newCommentObj.props.modifiedDateTime.dbValues = responseData.data.createComment.createdOrUpdatedCollabObject.collabDateModified;
            respRichText = responseData.data.createComment.createdOrUpdatedCollabObject.collabRichText;
            newCommentObj.props.richText.displayValues.push( responseData.data.createComment.createdOrUpdatedCollabObject.collabRichText );
            newCommentObj.uid = responseData.data.createComment.createdOrUpdatedCollabObject.uid;
            newCommentObj.type = responseData.data.createComment.createdOrUpdatedCollabObject.type;
        }

        //Handle the response when updating
        if( responseData && !_.isEmpty( responseData.data.updateComment )
        && !_.isEmpty( responseData.data.updateComment.createdOrUpdatedCollabObject ) &&
        responseData.data.updateComment.createdOrUpdatedCollabObject.collabPlainText &&
        responseData.data.updateComment.createdOrUpdatedCollabObject.collabPlainText.length > 0 ) {
            newCommentObj.props.modifiedDateTime.displayValues.push( responseData.data.updateComment.createdOrUpdatedCollabObject.collabDateModified );
            newCommentObj.props.modifiedDateTime.dbValues = responseData.data.updateComment.createdOrUpdatedCollabObject.collabDateModified;
            respRichText = responseData.data.updateComment.createdOrUpdatedCollabObject.collabRichText;
            newCommentObj.props.richText.displayValues.push( responseData.data.updateComment.createdOrUpdatedCollabObject.collabRichText );
            newCommentObj.uid = responseData.data.updateComment.createdOrUpdatedCollabObject.uid;
            newCommentObj.type = responseData.data.updateComment.createdOrUpdatedCollabObject.type;
        }
        prepareCommentCellViewModelObject( newCommentObj, null, respRichText, null, vmData );
        setupMoreCmtCellCmdInfo( newCommentObj, null, false );
        setupCmtEditLink( newCommentObj, vmData );

        var currentUserObj = appCtxSvc.getCtx( 'user' );
        newCommentObj.props.userName = {
            displayValues: [ '' ]
        };
        newCommentObj.hasThumbnail = false;
        newCommentObj.thumbnailUrl = '';

        if( currentUserObj.props && currentUserObj.props.user_name ) {
            newCommentObj.props.userName.displayValues[0] = currentUserObj.props.user_name.dbValue;
        }

        if( currentUserObj.thumbnailURL ) {
            newCommentObj.hasThumbnail = true;
            newCommentObj.thumbnailUrl = currentUserObj.thumbnailURL;
        }
        vms.push( newCommentObj );
        vmData.dataProviders.commentsDataProvider.update( vms );
        convObj.props.numReplies.dbValue++;
        if( convObj.expandCommentsLink && convObj.expandCommentsLink.propertyDisplayName ) {
            var currNumReply = parseInt( convObj.expandCommentsLink.propertyDisplayName.split( ' ' )[0] );
            //increment total number of replies
            currNumReply++;
            //reply or replies
            if( currNumReply === 1 ) {
                convObj.expandCommentsLink.propertyDisplayName = currNumReply + ' ' + vmData.i18n.reply;
            }else {
                convObj.expandCommentsLink.propertyDisplayName = currNumReply + ' ' + vmData.i18n.replies;
            }
        }

        if ( convObj.props.isConvNotificationSubscribed.dbValue ) {
            convObj.showFollowConv = false;
        }
        // uwPropSvc.setValue( vmData.replyPlaceHolder, '' );
        createConvSvc.setCkEditorData( '', convObj.ckeInstance );
        deferred.resolve( responseData );
    } );
    //Reset PWA on reply in discussion location to refresh PWA and to move discussion to top of list
    if( convUtils.isDiscussionSublocation() ) {
        eventBus.publish( 'primaryWorkarea.reset' );
    }
    return deferred.promise;
};

export let loadMoreAction = function( vmData, convObj ) {
    if( !vmData.loadMoreComments ) {
        vmData.loadMoreComments = true;
    }
    vmData.hideMoreRepliesButton = true;

    //paging necessary
    var nextStartIndex = convObj.cursorStartIndx - vmData.dataProviders.commentsDataProvider.action.inputData.request.variables.searchInput.maxToLoad;
    //last page scenario - set endIndex to startIndex and startIndex to 0
    if( nextStartIndex <= 0 ) {
        convObj.cursorEndIndx = convObj.cursorStartIndx;
        convObj.cursorStartIndx = 0;
        return;
    }
    convObj.cursorStartIndx = nextStartIndex;
    convObj.cursorEndIndx = convObj.props.numReplies.dbValue;
};

export let initUniversalConvPanel = function( data ) {
    Ac0ConvCtx.cmtEdit = {};
    Ac0ConvCtx.isIE = false;
    //check to see if browser is IE
    if( browserUtils.isIE ) {
        Ac0ConvCtx.isIE = true;
     }
    appCtxSvc.registerCtx( 'Ac0ConvCtx', Ac0ConvCtx );

    //set the selected obj (for Awb0Element it will be the underlying object) in Ac0ConvCtx
    if( !convUtils.isDiscussionSublocation() ) {
        convUtils.setSelectedObjectInContext( data );
    }
};

//TODO - this method should be tied to the unMount lifecyclehook. Currently it is being called on navigateBack which is detrimental. Hence not being called now.

export let destroyUniversalConvPanel = function() {
    appCtxSvc.unRegisterCtx( 'Ac0ConvCtx' );
};


/**
 * Add given sub panel
 * @param {String} destPanelId Panel ID
 * @param {String} titleLabel Title
 * @param {Object} data vmData
 */
export let addSubPanelPage = function( destPanelId, titleLabel, data ) {
    var ac0ConvCtx = convUtils.getAc0ConvCtx();
    ac0ConvCtx.createOrEditRichText = createConvSvc.getRichText( data.ckeInstance );
    ac0ConvCtx.invokingPanel = data.activeView;
    createConvSvc.destroyCkEditorInstance( data );
    appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
    var context = {
        destPanelId: destPanelId,
        supportGoBack: true,
        title: titleLabel,
        recreatePanel: true,
        isolateMode: true
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Add source objects from Pallette/Search to dataProvider
 * @param {Object} data Data
 */
export let addSourceObjects = function( data ) {
    if ( data.sourceObjects ) {
        if ( !parentData.srcObjChips ) {
            parentData.srcObjChips = [];
        }

        for ( var i = 0; i < data.sourceObjects.length; i++ ) {
            var srcObject = {
                uiIconId: 'miscRemoveBreadcrumb',
                chipType: 'BUTTON',
                labelDisplayName: data.sourceObjects[i].props.object_string.dbValue,
                labelInternalName: data.sourceObjects[i].props.object_string.dbValue,
                theObject: data.sourceObjects[i]
            };

            var chipExisted = _.find( parentData.srcObjChips, function( chip ) {
                return chip.theObject.uid === data.sourceObjects[i].uid;
            } );

            if( !chipExisted ) {
                parentData.srcObjChips.push( srcObject );
            }
        }
    }
};

/**
 * set data to the parentData
 * @param {Object} data Data
 */
export let setParentData = function( data ) {
    // store create converation panel data to a variable.
    parentData = data;
};

export let getRandObjId = function() {
    var randObjId = '';
    randObjId += Math.floor( 10000 * Math.random() );
    return randObjId;
};

export let getParentData = function() {
    return parentData;
};

export let updateSelectedConversation = function() {
//TODO
};

/**
 * Add user objects to dataProvider
 * @param {Object} data Data
 */
export let addUserObjs = function( data, userData ) {
    if( data && userData || !data && !userData ||  userData && !userData.selectedUsers ) {
        return;
    }

    var selectedUsers = [];
    var user = appCtxSvc.getCtx( 'user' );

    if( data ) {
        selectedUsers = data.dataProviders.userPerformSearch.selectedObjects;
    }
    if( userData ) {
        selectedUsers = userData.selectedUsers;
    }

    if ( !parentData.userChips ) {
        parentData.userChips = [];
        if( data ) {
            parentData.userChips.push( data.loggedInUserChips[0] );
        }
        parentData.showWarnOnRemovingUserMsg = false;
    }

    for ( var i = 0; i < selectedUsers.length; i++ ) {
        var theUserObject = selectedUsers[i];
        var userObject = {
            uiIconId: 'miscRemoveBreadcrumb',
            chipType: 'BUTTON',
            labelDisplayName: theUserObject.props.user_name.uiValue,
            labelInternalName: theUserObject.props.user_name.uiValue,
            theObject: theUserObject
        };

        var chipExisted = _.find( parentData.userChips, function( chip ) {
            return chip.theObject.uid === theUserObject.uid;
        } );

        if( !chipExisted ) {
            if( theUserObject.uid === user.uid ) {
                if( data ) {
                    parentData.userChips.push( data.loggedInUserChips[0] );
                } else {
                    parentData.userChips.push( userObject );
                }
            } else{
                parentData.userChips.push( userObject );
            }
        }

        if( theUserObject.uid === user.uid ) {
            parentData.showWarnOnRemovingUserMsg = false;
        }
    }
};

export let teardownUniversalConvPanel = function() {
    //empty out selected conversation
    selectedConv = {};
    createConvSvc.unSubscribeFromCkeEvents();
    var convCtx = convUtils.getAc0ConvCtx();
    if( convCtx.currentSelectedSnapshot ) {
        unregisterSnapshotDiscussionContextdata();
    }
};

export let conversationSelectionChange = function( event, vmData ) {
    var convCtx = convUtils.getAc0ConvCtx();
    if( event.selectedObjects.length === 1 ) {
        if( !_.isEmpty( selectedConv ) ) {
            selectedConv.showConvCellCmds = false;
        }
        selectedConv = event.selectedObjects[0];
        selectedConv.showConvCellCmds = true;

        convCtx.currentSelectedConversation = selectedConv;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );

        eventBus.publish( 'Ac0Conversation.checkConvSubscriptionEvent' );
    }
    if( event.selectedObjects.length === 0 && !_.isEmpty( selectedConv ) ) {
        selectedConv.showConvCellCmds = false;
        convCtx.currentSelectedConversation = null;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', convCtx );
    }
};

export let setObjectDisplayData = function( data ) {
    convUtils.setObjectDisplayData( data );
};
export let destroyActiveCellCkeEditor = function() {
    var ac0ConvCtx = convUtils.getAc0ConvCtx();
    //not unsub from cke imgupload events here as the replyBox cke instance is still alive
    if( ac0ConvCtx.activeCell && ac0ConvCtx.activeCell.ckeInstance ) {
        ac0ConvCtx.activeCell.ckeInstance.cke._instance.destroy();
        ac0ConvCtx.activeCell.ckeInstance = null;
        appCtxSvc.registerCtx( 'Ac0ConvCtx', ac0ConvCtx );
    }
};

/**
 * Method that updates the Conversation cell in feedList secondary workarea
 * This is to handle context for chip and other link rendering in secondary workarea
 * @param {*} eventData event
 * @param {*} vmData view model data
 * @param {*} context
 */
var updateCoversationCell = function( vmData, eventData, ctx ) {
    var vms = ctx.selected;
    var newConvObj = _.cloneDeep( vms );
    newConvObj.srcObjIdRef = 'ac0_' + vms.srcObjIdRef;
    ctx.newConvObj = newConvObj;
};

/**
 * Method that handles selection change updates, publishes selection chenge event
 * @param {*} eventData event
 * @param {*} vmData view model data
 * @param {*} context
 */
export let feedPrimaryWorkspaceSelection = function( vmData, eventData, ctx ) {
    if ( ctx.selected !== null ) {
        updateCoversationCell( vmData, eventData, ctx );
        //eventBus.publish( 'ac0activeCollaboration.selectionChangeEvent', eventData, ctx );
    }
};

/**
 * Method that invokes updateConversation graphql mutator to update conversation status.
 * @param {*} data view model data
 * @returns {*} Promise
 */
export let updateConvStatusAction = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var convTileObj;
    if ( data.updateFrom === 'ConvLocation' ) {
        convTileObj = appCtxSvc.ctx.selected;
    } else {
        convTileObj = data.eventData.propScope.$parent.$parent.$parent.$parent.$parent.$parent.$parent.$parent.$parent.item;
    }

    var graphQLInput = {};

    // prepare source objects
    var sourceObjs = [];
    var sourceTags = convTileObj.props.inflatedSrcObjList;
    if( sourceTags ) {
        for( var i = 0; i < sourceTags.length; i++ ) {
            if( sourceTags[ i ] ) {
                var srcObj = {
                    uid: sourceTags[ i ].uid,
                    type: sourceTags[ i ].type
                };
                sourceObjs.push( srcObj );
            }
        }
    }
    graphQLInput.sourceObjects = sourceObjs;

    // prepare participants
    var userObjs = [];
    var userTags = convTileObj.props.inflatedParticipantObjList;
    if( userTags ) {
        for( var i = 0; i < userTags.length; i++ ) {
            if( userTags[ i ] ) {
                var usrObj = {
                    uid: userTags[ i ].uid,
                    type: userTags[ i ].type
                };
                userObjs.push( usrObj );
            }
        }
    }
    graphQLInput.listOfParticipants = userObjs;

    graphQLInput.defaultCommentText = convTileObj.props.richText.dbValues;
    graphQLInput.conversation = {
        type: 'Ac0Conversation',
        uid: convTileObj.props.collabUid.dbValues
    };
    graphQLInput.convPrivate = convTileObj.props.isConvPrivate.dbValues;
    if( convUtils.isAc0EnableTrackedDiscussions ) {
        graphQLInput.convActionable = convTileObj.isConvActionable;
        graphQLInput.status = convTileObj.isConvActionable ? data.eventData.property.dbValue.propInternalValue : null;
        graphQLInput.priority = convTileObj.isConvActionable ? convTileObj.props.convPriority.dbValues : null;
        graphQLInput.closingUserId = convTileObj.isConvActionable ? appCtxSvc.ctx.user.uid : null;
        graphQLInput.dateClosed = convTileObj.isConvActionable ? dateTimeSvc.formatUTC( new Date() ) : null;
    }

    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: 'mutation updateConversation($updateConversationInput: AddOrUpdateConversationInput!) { updateConversation(updateConversationInput: $updateConversationInput) { createdOrUpdatedCollabObject { uid type } } }',
            variables: {
                updateConversationInput: graphQLInput
            }
        }
    };

    graphQLSvc.callGraphQL( graphQLQuery ).then( ( response ) => {
        if( !declUtils.isNil( response ) ) {
            let err = null;
            if( response.errors ) {
                err = soaSvc.createError( response.errors[ 0 ] );
            }
            if( err ) {
                var msg = '';
                msg = msg.concat( data.i18n.convUpdateErrorMsg );
                msgSvc.showError( msg );
                deferred.reject( err );
            } else {
                if ( data.updateFrom === 'ConvLocation' ) {
                    convTileObj.props.collabStatus.dbValue = data.eventData.property.dbValue.propDisplayValue;
                    convTileObj.props.convStatus.dbValue = data.eventData.property.dbValue;

                    eventBus.publish( 'cdm.relatedModified', {
                        refreshLocationFlag: true,
                        relatedModified: [ convTileObj ]
                    } );
                } else {
                    let vmos = data.dataProviders.conversationDataProvider.getViewModelCollection().getLoadedViewModelObjects();
                    for ( var i = 0; i <= vmos.length; i++ ) {
                        var vmo = vmos[ i ];
                        if ( vmo.uid === convTileObj.props.collabUid.dbValues ) {
                            vmo.props.collabStatus.dbValue = data.eventData.property.dbValue.propDisplayValue;
                            vmo.props.convStatus.dbValue = data.eventData.property.dbValue.propInternalValue;
                            data.dataProviders.conversationDataProvider.update( vmos, vmos.length );
                            break;
                        }
                    }
                }
                deferred.resolve( response );
            }
        }
    }, ( err ) => {
        deferred.reject( err );
    } );

    if( convUtils.isDiscussionSublocation() ) {
        eventBus.publish( 'primaryWorkarea.reset' );
    }
    return deferred.promise;
};

export let unregisterSnapshotDiscussionContextdata = function() {
    var convoCtx = appCtxSvc.getCtx( 'Ac0ConvCtx' );
    convoCtx.selected = [];
    delete convoCtx.snapshotEntryPoint;
    delete convoCtx.currentSelectedSnapshot;
};

/**
 * Ac0ConversationService factory
 */

export default exports = {
    universalConversationPanelReveal,
    feedLocationReveal,
    navigateToCreateConv,
    removeChipObj,
    onObjectTabSelectionChange,
    modifyConversations,
    replyBoxAction,
    modifyComments,
    loadMoreAction,
    initUniversalConvPanel,
    destroyUniversalConvPanel,
    addSubPanelPage,
    addSourceObjects,
    setParentData,
    getSourceObjects,
    navigateToCreateComment,
    getRandObjId,
    updateSelectedConversation,
    getParentData,
    addUserObjs,
    getUserObjects,
    teardownUniversalConvPanel,
    conversationSelectionChange,
    setObjectDisplayData,
    destroyActiveCellCkeEditor,
    feedPrimaryWorkspaceSelection,
    updateConvStatusAction,
    deleteCommandValidForCurrentGroupRole,
    unregisterSnapshotDiscussionContextdata
};
app.factory( 'Ac0ConversationService', () => exports );
