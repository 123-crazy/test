//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Saw1SchTaskDeliverableReplaceRevision
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';

'use strict';

/**
 * Define public API
 */
var exports = {};

export let unSubscribeEvent = function() {
    if( appCtxService.ctx.revisionUnSubEvents ) {
        for( var index = 0; index < appCtxService.ctx.revisionUnSubEvents.length; index++ ) {
            eventBus.unsubscribe( appCtxService.ctx.revisionUnSubEvents[ index ] );
        }
        appCtxService.unRegisterCtx( 'revisionUnSubEvents' );
    }
};

/**
 * This function will subscribe for events.
 *
 * @param {Object} ctx - The current context.
 */
var subscribeEvents = function( ctx ) {
    if( !appCtxService.getCtx( 'revisionUnSubEvents' ) ) {
        appCtxService.registerCtx( 'revisionUnSubEvents', [] );
    }

    var SplmTableElement = document.getElementsByTagName( 'aw-splm-table' );
    var tableElement = document.getElementsByTagName( 'aw-table' );
    if ( SplmTableElement.length || tableElement.length ) {
        var objectSet = !SplmTableElement ? tableElement[ 0 ].attributes.gridid.value : SplmTableElement[ 0 ].attributes.gridid.value;

        var selectionEvent = eventBus.subscribe( objectSet + '.selectionChangeEvent', function() {
            if ( ctx.sidenavCommandId === 'Saw1SchTaskDeliverableReplaceRevision' ) {
                eventBus.publish( 'complete', {
                    source: 'toolAndInfoPanel'
                } );
            }
        } );
        ctx.revisionUnSubEvents.push( selectionEvent );
    }
};

/**
 * Iterate revisions for selected task Deliverable. Remove current revision from the list
 * @param {response} response - Response of getProperties
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The data of the viewModel
 * @returns {object} object - output data
 */
export let loadSchTaskDelRevisions = function( response, ctx, data ) {
    subscribeEvents( ctx );
    var selected = ctx.selected.props.fnd0DeliverableInstance.dbValue;
    var searchResults = [];
    var selectedObj = cdm.getObject( selected );
    if ( selectedObj.props.revision_list && selectedObj.props.revision_list.dbValues.length > 1 ) {
        var revisionsUid = selectedObj.props.revision_list.dbValues;
        for ( var count = 0; count < revisionsUid.length; count++ ) {
            if ( selected !== revisionsUid[count] ) {
                searchResults.push( cdm.getObject( revisionsUid[count] ) );
            }
        }
        // Sort befre returning the ranges.
        var sortedSearchResults = _.sortBy( searchResults, [ function( revision ) { return revision.props.creation_date.dbValues[0]; } ] ).reverse();
        var outputData = {};
        outputData = {
            revisions: sortedSearchResults,
            length: searchResults.length
        };
        data.dataProviders.getRevisionsProvider.noResultsFound = '';
        return outputData;
    }
    data.dataProviders.getRevisionsProvider.noResultsFound = data.i18n.zeroSearchResults;
};

/**
 * get input arrays of UIDs for getProperties.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @returns {object} getPropertiesInput
 */
export let getPropertiesInputUIDs = function( ctx ) {
    var getPropertiesInput = [];
    for( var selCount = 0; selCount < ctx.mselected.length; selCount++ ) {
        var delInstance = {
            type: 'fnd0DeliverableInstance',
            uid: ctx.mselected[selCount].props.fnd0DeliverableInstance.dbValue
        };
        getPropertiesInput.push( delInstance );
    }
    return getPropertiesInput;
};

var prepareReplaceRevisionErrorMessage = function( error, firstParam, secondParam ) {
    var message = error + '<br\>';
    message = message.replace( '{0}', firstParam );
    message = message.replace( '{1}', secondParam );
    return message;
};

export let processSoaResponse = function( response, data, ctx, inputData, noRevisions, releasedRevision ) {
    var finalMessage = '';
    if ( response && response.ServiceData && response.ServiceData.partialErrors ) {
        for( var index in response.ServiceData.partialErrors ) {
            var partialError = response.ServiceData.partialErrors[ index ];
            for( var count in partialError.errorValues ) {
                if ( count === 0 && ctx.mselected.length !== 1 ) {
                    finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.saw1NoOfSelectionsForReplaceRevisionErrorMsg, inputData.length,
                        noRevisions.length + inputData.length + releasedRevision.length );
                }
                if( partialError.errorValues[ count ].code === 230045 ) { // No permission to Replace Revisions.
                    finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.saw1NoPermissionToReplaceRevisionErrorMsg, inputData[i].cellHeader1 );
                }
            }
        }
    } else {
        eventBus.publish( 'cdm.relatedModified', {
            relatedModified: [  ctx.xrtSummaryContextObject ]
        } );
        for ( var i = 0; i < noRevisions.length; i++ ) {
            if ( i === 0 && ctx.mselected.length !== 1 ) {
                finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.saw1NoOfSelectionsForReplaceRevisionErrorMsg, inputData.length,
                    noRevisions.length + inputData.length + releasedRevision.length );
            }
            finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.saw1NoRevisionToReplaceRevisionErrorMsg, noRevisions[i].props.object_name.dbValues[0] );
        }
        for ( var j = 0; j < releasedRevision.length; j++ ) {
            if ( j === 0 && ctx.mselected.length !== 1 && finalMessage.length < 1 ) {
                finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.saw1NoOfSelectionsForReplaceRevisionErrorMsg, inputData.length,
                    noRevisions.length + inputData.length + releasedRevision.length );
            }
            finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.saw1NoPermissionToReplaceRevisionErrorMsg, releasedRevision[j].props.object_name.dbValues[0] );
        }
    }
    if ( finalMessage.length ) {
        messagingSvc.showError( finalMessage );
    }
};

/**
 * SetProperty of relation with latest revision for SchTaskDeliverable.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The data of the viewModel
 */
export let replaceLatestSchTaskDelRevision = function( ctx, data ) {
    var deliverables = [];
    var inputData = [];
    var noRevisions = [];
    var releasedRevision = [];

    for ( var selCount = 0; selCount < ctx.mselected.length; selCount++ ) {
        if ( ctx.mselected[selCount].props.fnd0DeliverableInstance.dbValue && ctx.mselected[selCount].props.fnd0DeliverableInstance.dbValue !== '' ) {
            var selectedObj = cdm.getObject( ctx.mselected[selCount].props.fnd0DeliverableInstance.dbValue );
            deliverables = [];
            if ( selectedObj.props.revision_list && selectedObj.props.revision_list.dbValues.length > 1 &&
                ( selectedObj.props.date_released === undefined || selectedObj.props.date_released.dbValues[0] === null ) ) {
                    deliverables.push( selectedObj.props.revision_list.dbValues[selectedObj.props.revision_list.dbValues.length - 1] );
                    var objectModified = {
                        object: ctx.mselected[ selCount ],
                        timestamp: '',
                        vecNameVal: [ {
                            name: 'fnd0DeliverableInstance',
                            values: deliverables
                        } ]
                    };
                    inputData.push( objectModified );
            } else if ( selectedObj.props.date_released && selectedObj.props.date_released.dbValues[0] !== null ) {
                releasedRevision.push( selectedObj );
            } else {
                noRevisions.push( ctx.mselected[ selCount ] );
            }
        } else {
            noRevisions.push( ctx.mselected[ selCount ] );
        }
    }

    if ( inputData.length ) {
        soaSvc.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', {
            info: inputData
        } ).then( function( response ) {
            exports.processSoaResponse( response, data, ctx, inputData, noRevisions, releasedRevision );
        } );
    } else {
        exports.processSoaResponse( null, data, ctx, inputData, noRevisions, releasedRevision );
    }
};

/**
 * SetProperty of relation with selected revision from panel.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 */
export let replaceSchTaskDelRevision = function( ctx, data ) {
    var inputData = [];
    var objectModified = {
        object: ctx.mselected[0],
        timestamp: '',
        vecNameVal: [ {
            name: 'fnd0DeliverableInstance',
            values: [ data.dataProviders.getRevisionsProvider.selectedObjects[0].uid ]
        } ]
    };
    inputData.push( objectModified );
    soaSvc.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', {
        info: inputData
    } ).then( function( response ) {
        exports.processSoaResponse( response, data, ctx, inputData );
    } );
};

/**
 * This factory creates a service and returns exports
 *
 * @member Saw1SchTaskDeliverableReplaceRevision
 */

export default exports = {
    replaceSchTaskDelRevision,
    replaceLatestSchTaskDelRevision,
    processSoaResponse,
    getPropertiesInputUIDs,
    unSubscribeEvent,
    loadSchTaskDelRevisions
};
app.factory( 'Saw1SchTaskDeliverableReplaceRevision', () => exports );
