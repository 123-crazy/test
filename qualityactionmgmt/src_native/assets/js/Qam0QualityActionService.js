// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Qam0QualityActionService
 */

import app from 'app';
import dateTimeSvc from 'js/dateTimeService';
import cdmService from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';

var exports = {};

/**
 * Return input for setProperties SOA to execute Quality Action from Overview Page
 *
 * @param {object} data - Data of ViewModelObject
 * @param {contextObject} ctx - Context Object
 * @return {Object} - Input container for setProperties
 */

export let executeQualityAction = function( data, ctx ) {
    var inputData = [];

    var infoObj = {};

    var objectToExecute = ctx.xrtSummaryContextObject;

    infoObj.object = cdmService.getObject( objectToExecute.uid );

    infoObj.timestamp = '';

    var temp = [];

    if( objectToExecute.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Draft' ) {
        setPropertyAndValue( 'qam0QualityActionStatus', 'Active', temp );
        setPropertyAndValue( 'qam0ActivationDate', getCurrentDate(), temp );
    } else if( objectToExecute.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Active' && objectToExecute.props.qam0ConfirmationRequired.dbValues[ 0 ] === '1' ) {
        setPropertyAndValue( 'qam0QualityActionStatus', 'Confirmed', temp );
        setPropertyAndValue( 'qam0ConfirmedBy', ctx.user.uid, temp );
        setPropertyAndValue( 'qam0ConfirmationDate', getCurrentDate(), temp );
        if( data.comment.dbValue === undefined || data.comment.dbValue === null ) {
            data.comment.dbValue = '';
        }
        setPropertyAndValue( 'qam0Comment', data.comment.dbValue, temp );
    } else {
        setPropertyAndValue( 'qam0QualityActionStatus', 'Completed', temp );
        setPropertyAndValue( 'qam0CompletedBy', ctx.user.uid, temp );
        setPropertyAndValue( 'qam0CompletionDate', getCurrentDate(), temp );
        if( data.comment.dbValue === undefined || data.comment.dbValue === null ) {
            data.comment.dbValue = '';
        }
        setPropertyAndValue( 'qam0Comment', data.comment.dbValue, temp );
    }

    infoObj.vecNameVal = temp;
    inputData.push( infoObj );

    return inputData;
};

/**
 * set the comment property on Quality Action on overview page of Quality Action
 * make the comment property editable false if Quality Action status property is Completed or Cancelled
 *
 * @param {object} data - Data of ViewModelObject
 * @param {contextObject} ctx  - Context Object
 */

export let makeCommentNonEditable = function( data, ctx ) {
    data.isActive = false;

    var objectToExecuteQualityAction = ctx.xrtSummaryContextObject;

    if( !ctx.editInProgress &&
        ( objectToExecuteQualityAction.props.qam0QualityActionStatus.dbValues[ 0 ] !== 'Draft' &&
            objectToExecuteQualityAction.props.qam0QualityActionStatus.dbValues[ 0 ] !== 'Template' ) ) {
        data.isActive = true;
        data.comment.dbValue = objectToExecuteQualityAction.props.qam0Comment.dbValues[ 0 ];
        data.comment.uiValue = objectToExecuteQualityAction.props.qam0Comment.dbValues[ 0 ];
    }

    if( objectToExecuteQualityAction.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Completed' ||
        objectToExecuteQualityAction.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Cancelled' ) {
        data.comment.isEditable = false;
    }
};

/**
 * Return input for setProperties SOA to execute Quality Action from Info Panel
 *
 * @param {object} data - Data of ViewModelObject
 * @param {contextObject} ctx - Context Object
 * @return {Object} - Input container for setProperties
 */

export let executeQualityActionOnInfoPanel = function( data, ctx ) {
    var inputData = [];

    var infoObj = {};

    infoObj.object = cdmService.getObject( ctx.selected.uid );

    infoObj.timestamp = '';

    var temp = [];

    if( ctx.selected.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Draft' ) {
        setPropertyAndValue( 'qam0QualityActionStatus', 'Active', temp );
        setPropertyAndValue( 'qam0ActivationDate', getCurrentDate(), temp );
    } else if( ctx.selected.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Active' && ctx.selected.props.qam0ConfirmationRequired.dbValues[ 0 ] === '1' ) {
        setPropertyAndValue( 'qam0QualityActionStatus', 'Confirmed', temp );
        setPropertyAndValue( 'qam0ConfirmedBy', ctx.user.uid, temp );
        setPropertyAndValue( 'qam0ConfirmationDate', getCurrentDate(), temp );
        if( data.comment.dbValue === undefined || data.comment.dbValue === null ) {
            data.comment.dbValue = '';
        }
        setPropertyAndValue( 'qam0Comment', data.comment.dbValue, temp );
    } else {
        setPropertyAndValue( 'qam0QualityActionStatus', 'Completed', temp );
        setPropertyAndValue( 'qam0CompletedBy', ctx.user.uid, temp );
        setPropertyAndValue( 'qam0CompletionDate', getCurrentDate(), temp );
        if( data.comment.dbValue === undefined || data.comment.dbValue === null ) {
            data.comment.dbValue = '';
        }
        setPropertyAndValue( 'qam0Comment', data.comment.dbValue, temp );
    }

    infoObj.vecNameVal = temp;
    inputData.push( infoObj );

    return inputData;
};

/**
 * Return the UTC format date string "yyyy-MM-dd'T'HH:mm:ssZZZ"
 * @return {Date}  - The date string value
 */

var getCurrentDate = function() {
    var curDate = new Date();
    return dateTimeSvc.formatUTC( curDate );
};

/**
 * Set the Properties while executing Quality Action
 *
 * @param {String} propName  - The Property Name
 * @param {String/Date} propValue - The Property Value
 * @return {Map} Temp  - The Map of Property Name and Value
 */

var setPropertyAndValue = function( propName, propValue, Temp ) {
    var prop = {};
    prop.name = propName;
    prop.values = [ propValue ];
    Temp.push( prop );
};

/**
 * set the comment property on Quality Action on Info Panel of Quality Action
 * make the comment property editable false if Quality Action status property is Completed or Cancelled
 *
 * @param {object} data - Data of ViewModelObject
 * @param {contextObject} ctx - Context Object
 */

export let makeCommentNonEditableOnInfoPanel = function( data, ctx ) {
    if( !ctx.editInProgress &&
        ( ctx.selected.props.qam0QualityActionStatus.dbValues[ 0 ] !== 'Draft' &&
            ctx.selected.props.qam0QualityActionStatus.dbValues[ 0 ] !== 'Template' ) ) {
        data.comment.dbValue = ctx.selected.props.qam0Comment.dbValues[ 0 ];
        data.comment.uiValue = ctx.selected.props.qam0Comment.dbValues[ 0 ];
    }
    if( ctx.selected.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Completed' ||
        ctx.selected.props.qam0QualityActionStatus.dbValues[ 0 ] === 'Cancelled' ) {
        data.comment.isEditable = false;
    }
};

/**
 * Set the comment property on Quality Action object to null
 * When Quality Action Status is Activate
 * @param {object} data - Data of ViewModelObject
 */

export let commentActivate = function( data ) {
    data.isActive = true;
    data.comment.dbValue = '';
    data.comment.uiValue = '';
};

/**
 * Update the Ctx of Quality Action object with response return by loadObjects SOA
 * @param {Objects} modelObjects - ViewModelObject
 * @param {Object} Object - The object get modified
 */
export let UpdateObjectCtx = function( modelObjects, plainObject ) {
    var object = plainObject.map( function( uid ) {
        return modelObjects[ uid ];
    } );
    appCtxSvc.updateCtx( 'selected', object[ 0 ] );
};
/**
 * prepare SOA input for createrelation of Quality Action
 *
 * @param {contextObject} ctx - Context Object
 * @param {object} data - Data of ViewModelObject
 * @param {relationtype} location - location where the object will get pasted
 */
export let Qam0SoaInputPasteOperationQualityAction = function( ctx, data, location ) {
    var input = [];

    var pasteFailOtherObject = [];

    var pasteFailSelfDepedent = [];

    var pasteSuccessObjects = [];

    var existQualityAction = [];
    var isExist = false;
    var DependentQAArray = ctx.selected.props.qam0DependentQualityActions.dbValues;

    var TargetArray = ctx.selected.props.qam0Targets.dbValues;

    for( var index = 0; index < ctx.awClipBoardProvider.length; index++ ) {
        var inputData;
        if( location === 'qam0DependentQualityActions' && DependentQAArray ) {
            isExist = checkIfExistOrAddInArray( ctx.awClipBoardProvider[ index ].uid, DependentQAArray );
        } else if( TargetArray ) {
            isExist = checkIfExistOrAddInArray( ctx.awClipBoardProvider[ index ].uid, TargetArray );
        }
        if( isExist === true ) {
            existQualityAction.push( ctx.awClipBoardProvider[ index ].props.object_name.dbValues );

            //messagingService.showError( data.i18n.pasteFailForExistDependentQualityAction.replace( '{0}', ctx.awClipBoardProvider[ index ].props.object_name.dbValues ) );
        } else {
            if( ctx.awClipBoardProvider[ index ].uid !== ctx.selected.uid ) {
                if( ctx.awClipBoardProvider[ index ].modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) > -1 && location === 'qam0DependentQualityActions' ) {
                    inputData = {
                        primaryObject: ctx.selected,
                        relationType: 'qam0DependentQualityActions',
                        secondaryObject: cdmService.getObject( ctx.awClipBoardProvider[ index ].uid ),
                        clientId: '',
                        userData: {
                            uid: 'AAAAAAAAAAAAAA',
                            type: 'unknownType'
                        }
                    };
                    input.push( inputData );
                } else if( location !== 'qam0DependentQualityActions' ) {
                    inputData = {
                        primaryObject: ctx.selected,
                        relationType: 'qam0Targets',
                        secondaryObject: cdmService.getObject( ctx.awClipBoardProvider[ index ].uid ),
                        clientId: '',
                        userData: {
                            uid: 'AAAAAAAAAAAAAA',
                            type: 'unknownType'
                        }
                    };
                    input.push( inputData );
                    pasteSuccessObjects.push( ctx.awClipBoardProvider[ index ] );
                } else if( ctx.awClipBoardProvider[ index ].type !== 'Qam0QualityAction' ) {
                    pasteFailOtherObject.push( ctx.awClipBoardProvider[ index ] );
                }
            } else {
                pasteFailSelfDepedent.push( ctx.selected );
            }
        }
    }

    return {
        input: input,
        pasteFailOtherObject: pasteFailOtherObject,
        pasteFailSelfDepedent: pasteFailSelfDepedent,
        existQualityAction: existQualityAction,
        pasteSuccessObjects: pasteSuccessObjects,
        isExist: isExist
    };
};

/**
 * Check if Current object Exist in Array
 *
 * @param { CurrentQualityAction, QualityAction} data
 */
var checkIfExistOrAddInArray = function( qualityaction, updatedArray ) {
    var index = updatedArray.indexOf( qualityaction );
    var isExist = false;
    if( index !== -1 ) {
        isExist = true;
    }
    return isExist;
};

/**
 * setting the overflow style on main panel. This is needed as we are using
 * aw-panel and it doesn't have correct overflow style
 */
export let updateStyleForQualityActionPanel = function() {
    var element = document.getElementById( 'Qam0QualityAction' );
    if( element && element.style ) {
        element.style.overflow = 'hidden';
    }
};

//To set the input for setProperties for setting problemContextProperty
export let presetFilter = function( data ) {
    if( !data.searchFilterMap ) {
        data.typeFilter = 'Qam0QualityAction';
    } else {
        appCtxSvc.ctx.searchIncontextInfo = data.searchFilterMap;
    }
};

//To set the input for setProperties for setting problemContextProperty
export let presetQualityActionsFilters = function( data, ctx ) {
    var statusFilter;
    var objectTypeFilter;
    var qualityActionType;
    var qualityActionSubType;

    //set isTemplate false
    ctx.isTemplateFound = false;

    if( data.searchFilterMap ) {
        statusFilter = [ {
            searchFilterType: 'StringFilter',
            stringValue: 'Template'
        } ];

        // if( ctx.qaType && ctx.qaSubType ) {
        //     qualityActionType = [ {
        //         searchFilterType: 'StringFilter',
        //         stringValue: ctx.qaType
        //     } ];
        //     qualityActionSubType = [ {
        //         searchFilterType: 'StringFilter',
        //         stringValue: ctx.qaSubType
        //     } ];

        //     data.searchFilterMap[ 'Qam0QualityAction.qam0QualityActionType' ] = qualityActionType;
        //     data.searchFilterMap[ 'Qam0QualityAction.qam0QualityActionSubtype' ] = qualityActionSubType;
        // }

        data.searchFilterMap[ 'Qam0QualityAction.qam0QualityActionStatus' ] = statusFilter;
    } else {
        data.searchFilterMap = {};
        objectTypeFilter = [ {
            searchFilterType: 'StringFilter',
            stringValue: 'Qam0QualityAction'
        } ];
        statusFilter = [ {
            searchFilterType: 'StringFilter',
            stringValue: 'Template'
        } ];
        data.searchFilterMap = {
            'WorkspaceObject.object_type': objectTypeFilter,
            'Qam0QualityAction.qam0QualityActionStatus': statusFilter
        };
    }
};

export let selectQualityAction = function( data ) {
    appCtxSvc.ctx.selectedQualityActionTemplate = data.dataProviders.performSearch.selectedObjects;
};

export let getExecutionReferenceObject = function( ctx ) {
    var executionObject = [];
    executionObject.push( cdmService.getObject( ctx.locationContext.modelObject.props.qam0ExecutionReference.dbValues[0] ) );
    return executionObject;
};

export default exports = {
    executeQualityAction,
    makeCommentNonEditable,
    executeQualityActionOnInfoPanel,
    makeCommentNonEditableOnInfoPanel,
    commentActivate,
    UpdateObjectCtx,
    Qam0SoaInputPasteOperationQualityAction,
    updateStyleForQualityActionPanel,
    presetFilter,
    presetQualityActionsFilters,
    selectQualityAction,
    getExecutionReferenceObject
};
app.factory( 'Qam0QualityActionService', () => exports );
