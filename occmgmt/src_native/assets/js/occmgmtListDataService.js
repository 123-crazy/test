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
 * @module js/occmgmtListDataService
 */
import app from 'app';
import cdmSvc from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import awTableSvc from 'js/awTableService';
import occmgmtGetSvc from 'js/occmgmtGetService';
import occmgmtGetOccsResponseService from 'js/occmgmtGetOccsResponseService';
import contextStateMgmtService from 'js/contextStateMgmtService';
import aceStaleRowMarkerService from 'js/aceStaleRowMarkerService';
import assert from 'assert';
import eventBus from 'js/eventBus';
import _ from 'lodash';

var exports = {};

/**
 * loadNextData
 *
 * @param {ListLoadInput} listLoadInput -
 * @param {IModelObject} openedObject -
 * @param {OccCursorObject} cursorObject -
 *
 * @return {Promise} Promise resolves with the resulting ListLoadResult object.
 */
export let loadNextData = function( listLoadInput, openedObject, cursorObject, contextKey, declViewModel ) {
    listLoadInput.skipFocusOccurrenceCheck = true;
    return exports.loadData( listLoadInput, openedObject, cursorObject, contextKey, declViewModel );
};

/**
 * loadPrevData
 *
 * @param {ListLoadInput} listLoadInput -
 * @param {IModelObject} openedObject -
 * @param {OccCursorObject} cursorObject -
 *
 * @return {Promise} Promise resolves with the resulting ListLoadResult object.
 */
export let loadPrevData = function( listLoadInput, openedObject, cursorObject, contextKey, declViewModel ) {
    listLoadInput.skipFocusOccurrenceCheck = true;
    listLoadInput.addAfter = false;
    return exports.loadData( listLoadInput, openedObject, cursorObject, contextKey, declViewModel );
};

export let getContextKeyFromParentScope = function( parentScope ) {
    return contextStateMgmtService.getContextKeyFromParentScope( parentScope );
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
export let loadData = function( listLoadInput, openedObject, cursorObject, contextKey, declViewModel ) {
    if( !contextKey || !appCtxSvc.ctx[ contextKey ] ) {
        return;
    }

    var currentContext = appCtxSvc.ctx[ contextKey ];
    appCtxSvc.updatePartialCtx( contextKey + '.vmc' );
    var soaInput = occmgmtGetSvc.getDefaultSoaInput();
    var clearExistingSelections = appCtxSvc.getCtx( contextKey ).clearExistingSelections;

    if( clearExistingSelections ) {
        listLoadInput.clearExistingSelections = true;
        appCtxSvc.updatePartialCtx( contextKey + '.clearExistingSelections', false );
    }

    listLoadInput.parentElement = cdmSvc.NULL_UID;

    /**
     * Determine UID of 'parent' to load from.
     */
    if( listLoadInput.parentUid ) {
        /**
         * listLoadInput specifies what the 'parent' should be. Use it.
         */
        listLoadInput.parentElement = listLoadInput.parentUid;
    } else if( cdmSvc.isValidObjectUid( currentContext.currentState.o_uid ) ) {
        listLoadInput.parentElement = currentContext.currentState.o_uid;
    }

    assert( listLoadInput.parentElement, 'Invalid parent ID' );

    /**
     * Check if the listLoadInput does NOT specifiy a cursorIbject but the dataProvider does.<BR>
     * If so: Use it.
     */
    if( !listLoadInput.cursorObject && cursorObject ) {
        listLoadInput.cursorObject = cursorObject;
    }

    listLoadInput.displayMode = 'List';

    return occmgmtGetSvc
        .getOccurrences( listLoadInput, soaInput, currentContext )
        .then(
            function( response ) {
                if( !declViewModel.isDestroyed() ) {
                    var newState = occmgmtGetOccsResponseService.getNewStateFromGetOccResponse( response,
                        contextKey );

                    var oModelObject = cdmSvc.getObject( newState.o_uid );
                    var tModelObject = cdmSvc.getObject( newState.t_uid );
                    var pModelObject = cdmSvc.getObject( newState.pci_uid );

                    if( listLoadInput.clearExistingSelections ) {
                        currentContext.pwaSelectionModel.selectNone();
                    }

                    if( listLoadInput.clearExistingSelections ) {
                        currentContext.pwaSelectionModel.selectNone();
                    }

                    if( listLoadInput.skipFocusOccurrenceCheck &&
                        appCtxSvc.ctx[ contextKey ].previousState.c_uid ) {
                        delete newState.c_uid;
                        delete newState.o_uid;
                    }

                    if( !cdmSvc.isValidObjectUid( listLoadInput.parentUid ) ) {
                        contextStateMgmtService.syncContextState( contextKey, newState );
                    }

                    var childOccurrences = [];

                    _.forEach( response.occurrences, function( childOccInfo ) {
                        childOccurrences.push( childOccInfo.occurrence );
                    } );

                    var totalChildCount = childOccurrences.length;

                    if( !response.cursor.endReached ) {
                        totalChildCount++;
                    }

                    //showTopNode is parameter that decides whether topNode should be shown for Tree. Deleting this parameter
                    //when in List mode to get avoid unncessary validations of this when in list view.
                    delete appCtxSvc.ctx[ contextKey ].showTopNode;

                    var listLoadResult = awTableSvc.createListLoadResult( response.parentOccurrence,
                        childOccurrences, totalChildCount, 0, response.parentOccurrence );

                    /** Common load result properties */
                    listLoadResult.baseModelObject = oModelObject;
                    listLoadResult.pciModelObject = pModelObject;
                    listLoadResult.openedObject = oModelObject;
                    listLoadResult.openedModelObject = oModelObject;
                    listLoadResult.topModelObject = tModelObject;
                    listLoadResult.changeContext = '';

                    listLoadResult.sublocationAttributes = response.userWorkingContextInfo ? response.userWorkingContextInfo.sublocationAttributes : {};

                    listLoadResult.autoSavedSessiontime = response.userWorkingContextInfo.autoSavedSessiontime;

                    listLoadResult.filter = response.filter;

                    occmgmtGetOccsResponseService.populateSourceContextToInfoMapOnOccmgmtContext( listLoadResult,
                        response );

                    listLoadResult.requestPref = {
                        savedSessionMode: 'restore',
                        startFreshNavigation: false,
                        useGlobalRevRule: false,
                        criteriaType: currentContext.requestPref.criteriaType,
                        showUntracedParts: currentContext.requestPref.showUntracedParts,
                        configContext: {}
                    };

                    listLoadResult.configContext = {};

                    if( response.requestPref && response.requestPref.ignoreIndexForPCIs ) {
                        listLoadResult.requestPref.ignoreIndexForPCIs = response.requestPref.ignoreIndexForPCIs;
                    }

                    /**
                     * Populate the decision for objectQuota loading from the requestPref
                     */
                    listLoadResult.useObjectQuotatoUnload = false;
                    if( response.requestPref && response.requestPref.UseObjectQuotatoUnload ) {
                        if( response.requestPref.UseObjectQuotatoUnload[ 0 ] === 'true' ) {
                            listLoadResult.useObjectQuotatoUnload = true;
                        }
                    }

                    listLoadResult.elementToPCIMap = occmgmtGetOccsResponseService
                        .updateElementToPCIMap( response );

                    /** List Specific load result properties */
                    listLoadResult.cursorObject = response.cursor;

                    listLoadResult.columnConfig = response.columnConfig;

                    aceStaleRowMarkerService.updateCtxWithStaleUids( response.requestPref, response.occurrences );

                    occmgmtGetOccsResponseService.populateRequestPrefInfoOnOccmgmtContext( listLoadResult, response, contextKey );

                    occmgmtGetOccsResponseService.populateFeaturesInfoOnOccmgmtContext( listLoadResult, response, contextKey );

                    return {
                        listLoadResult: listLoadResult
                    };
                }
            } );
};

export default exports = {
    loadNextData,
    loadPrevData,
    getContextKeyFromParentScope,
    loadData
};
/**
 * Register this service with AngularJS.
 *
 * @memberOf NgServices
 * @member occmgmtListDataService
 */
app.factory( 'occmgmtListDataService', () => exports );

/**
 * Return this service's name as the 'moduleServiceNameToInject' property.
 */
