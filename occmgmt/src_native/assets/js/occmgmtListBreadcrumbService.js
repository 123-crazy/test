// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/occmgmtListBreadcrumbService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import occMgmtListDataSvc from 'js/occmgmtListDataService';
import cdmSvc from 'soa/kernel/clientDataModel';
import occmgmtGetSvc from 'js/occmgmtGetService';
import awTableSvc from 'js/awTableService';
import ctxStateMgmtService from 'js/contextStateMgmtService';
import assert from 'assert';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

//When an object is selected in the breadcrumb popup
export let updateUrlOnObjectSelection = function( data, selection, contextKey ) {
    //The popup should be hidden
    data.showPopup = false;
    eventBus.publish( 'awPopupWidget.close' );
    var chevronCtx = appCtxSvc.getCtx( contextKey + 'Chevron' );
    if( chevronCtx && chevronCtx.clicked ) {
        chevronCtx.clicked = false;
    }

    //And it should navigate to the correct location
    if( selection && selection.length > 0 ) {
        if( chevronCtx && chevronCtx.scopedUid ) {
            var newState = {
                c_uid: selection[ 0 ].uid,
                o_uid: chevronCtx.scopedUid
            };
            ctxStateMgmtService.updateContextState( contextKey, newState, true );
        }
    }
};

/**
 * loadData
 *
 * @param {ListLoadInput} listLoadInput -
 * @param {IModelObject} openedObject -
 * @param {OccCursorObject} cursorObject -
 *
 * @return {Promise} Promise resolves with the resulting ListLoadResult object.
 */
export let loadData = function() {
    /**
     * Extract action parameters from the argument to this function.
     */
    assert( arguments.length === 1, 'Invalid argument count' );
    assert( arguments[ 0 ].listLoadInput, 'Missing argument property' );

    var listLoadInput = arguments[ 0 ].listLoadInput;
    var cursorObject = arguments[ 0 ].cursorObject;

    var contextKey = arguments[ 0 ].contextKey;
    if( !contextKey || !appCtxSvc.ctx[ contextKey ] ) {
        return;
    }
    var currentContext = appCtxSvc.ctx[ contextKey ];
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();

    /**
     * Check if the listLoadInput does NOT specifiy a cursorObject but the dataProvider does.<BR>
     * If so: Use it.
     */
    if( !listLoadInput.cursorObject && cursorObject ) {
        listLoadInput.cursorObject = cursorObject;
    }

    listLoadInput.displayMode = 'List';

    return occmgmtGetSvc.getOccurrences( listLoadInput, soaInput, currentContext ).then(
        function( response ) {
            var childOccurrences = [];

            _.forEach( response.occurrences, function( childOccInfo ) {
                childOccurrences.push( childOccInfo.occurrence );
            } );

            var totalChildCount = childOccurrences.length;

            if( !response.cursor.endReached ) {
                totalChildCount++;
            }

            var listLoadResult = awTableSvc.createListLoadResult( response.parentOccurrence,
                childOccurrences, totalChildCount, 0, response.parentOccurrence );

            /** List Specific load result properties */
            listLoadResult.cursorObject = response.cursor;

            return {
                listLoadResult: listLoadResult
            };
        } );
};

export default exports = {
    updateUrlOnObjectSelection,
    loadData
};
/**
 * Register this service with AngularJS
 *
 * @memberof NgServices
 * @member occmgmtListBreadcrumbService
 */
app.factory( 'occmgmtListBreadcrumbService', () => exports );

/**
 * Return this service name as the 'moduleServiceNameToInject' property.
 */
