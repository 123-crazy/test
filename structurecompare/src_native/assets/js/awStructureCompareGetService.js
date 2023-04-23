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
 * Wrapper code to process compare soa requests
 *
 * @module js/awStructureCompareGetService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import cdmSvc from 'soa/kernel/clientDataModel';
import compareContextService from 'js/awStructureCompareContextService';
import awCompareUtils from 'js/awStructureCompareUtils';
import _ from 'lodash';

var exports = {};

function _getParentUidForCompare( modelObject ) {
    if( modelObject && modelObject.props ) {
        var props = modelObject.props;
        var uid;

        if( props.awb0Parent && !_.isEmpty( props.awb0Parent.dbValues ) ) {
            uid = props.awb0Parent.dbValues[ 0 ];
        }

        if( cdmSvc.isValidObjectUid( uid ) ) {
            return uid;
        }
    }
    return null;
}

function _getToplevelParent( modelObject ) {
    var oldParent = modelObject;
    var newParent = modelObject;
    while( newParent !== null ) {
        oldParent = newParent;
        newParent = cdmSvc.getObject( _getParentUidForCompare( newParent ) );
    }
    return oldParent;
}

export let isInTreeView = function() {
    var viewModeInfo = appCtxSvc.ctx.ViewModeContext;
    if( viewModeInfo &&
        ( viewModeInfo.ViewModeContext === 'TreeView' || viewModeInfo.ViewModeContext === 'TreeSummaryView' ) ) {
        return true;
    }
    return false;
};

var _getSourceTargetAndContexts = function( depth ) {
    var srcElement = null;
    var tgtElement = null;

    var _contextKeys = awCompareUtils.getContextKeys();
    if( exports.isInTreeView() ) {
        var sc_uid = appCtxSvc.getCtx( _contextKeys.leftCtxKey + '.currentState.c_uid' );
        var tc_uid = appCtxSvc.getCtx( _contextKeys.rightCtxKey + '.currentState.c_uid' );
        if( cdmSvc.isValidObjectUid( sc_uid ) ) {
            srcElement = cdmSvc.getObject( sc_uid );
        }
        if( cdmSvc.isValidObjectUid( tc_uid ) ) {
            tgtElement = cdmSvc.getObject( tc_uid );
        }
    } else {
        srcElement = appCtxSvc.getCtx( 'compareList.cmpSelection1' );
        tgtElement = appCtxSvc.getCtx( 'compareList.cmpSelection2' );
    }

    var srcContext = appCtxSvc.getCtx( _contextKeys.leftCtxKey + '.productContextInfo' );
    var tgtContext = appCtxSvc.getCtx( _contextKeys.rightCtxKey + '.productContextInfo' );

    if( depth <= 0 ) {
        srcElement = _getToplevelParent( srcElement );
        tgtElement = _getToplevelParent( tgtElement );
    }

    return {
        srcElement: srcElement,
        srcContext: srcContext,
        tgtElement: tgtElement,
        tgtContext: tgtContext
    };
};
var _processOptions = function( options ) {
    var outputCollection = [];
    for( var outputVal in options ) {
        if( options.hasOwnProperty( outputVal ) ) {
            outputCollection.push( outputVal );
        }
    }
    return outputCollection;
};

export let createSOAInputForVisibleUids = function( depth, startFreshCompare, backgroundOption, sourceVMOs,
    targetVMOs ) {
    var sourceUids = [];
    _.forEach( sourceVMOs, function( value ) {
        sourceUids.push( value.uid );
    } );

    var targetUids = [];
    _.forEach( targetVMOs, function( value ) {
        targetUids.push( value.uid );
    } );

    var inputDataForCompare = _getSourceTargetAndContexts( depth );

    // Populate the compare options filter
    var displayOptions = compareContextService.getCtx( 'compareContext.displayOptions' );
    // Match Types and Equivalence
    var soaCompareOptionsList = {};
    var matchTypes = _.get( displayOptions, 'MatchType' );
    soaCompareOptionsList.MatchType = _processOptions( matchTypes );
    var equivalenceTypes = _.get( displayOptions, 'Equivalence' );
    soaCompareOptionsList.Equivalence = _processOptions( equivalenceTypes );

    if( soaCompareOptionsList.MatchType.length === 0 && soaCompareOptionsList.Equivalence.length === 0 ) {
        soaCompareOptionsList = undefined;
    }

    return {
        inputData: {
            source: {
                element: inputDataForCompare.srcElement,
                productContextInfo: inputDataForCompare.srcContext,
                visibleUids: sourceUids,
                depth: depth
            },
            target: {
                element: inputDataForCompare.tgtElement,
                productContextInfo: inputDataForCompare.tgtContext,
                visibleUids: targetUids,
                depth: depth
            },
            startFreshCompare: startFreshCompare,
            sourceCursor: {
                startReached: false,
                endReached: false,
                startIndex: -1,
                endIndex: 0,
                pageSize: 40,
                isForward: true
            },
            targetCursor: {
                startReached: false,
                endReached: false,
                startIndex: -1,
                endIndex: 0,
                pageSize: 40,
                isForward: true
            },
            compareInBackground: backgroundOption,
            compareOptions: soaCompareOptionsList
        }
    };
};

export let createSOAInputForPaginationAndVisibleUids = function( depth, startFreshCompare, backgroundOption,
    sourceCursor, targetCursor, sourceVMOs, targetVMOs, datasetUID ) {

    var compareInput = exports.createSOAInputForVisibleUids( depth, startFreshCompare, backgroundOption,
        sourceVMOs, targetVMOs );

    compareInput.inputData.sourceCursor = sourceCursor;
    compareInput.inputData.targetCursor = targetCursor;

    if( datasetUID ) {
        compareInput.inputData.notificationMessage = {
            uid: datasetUID
        };
    }

    return compareInput;
};

/**
 * @member awStructureCompareGetService
 */

export default exports = {
    isInTreeView,
    createSOAInputForVisibleUids,
    createSOAInputForPaginationAndVisibleUids
};
app.factory( 'awStructureCompareGetService', () => exports );
