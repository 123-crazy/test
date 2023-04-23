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
 * @module js/ReplaceRevision
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';

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
            if ( ctx.sidenavCommandId === 'ReplaceRevision' ) {
                eventBus.publish( 'complete', {
                    source: 'toolAndInfoPanel'
                } );
            }
        } );
        ctx.revisionUnSubEvents.push( selectionEvent );
    }
};

/**
 * Iterate revisions for selected PDR/DI. Remove current revision from the list
 * @param response - Response of getProperties
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 */
export let loadRevisions = function( response, ctx, data ) {
    subscribeEvents( ctx );
    var selected = ctx.selected.uid;
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
        return outputData;
    }
    data.dataProviders.getRevisionsProvider.noResultsFound = data.i18n.zeroSearchResults;
};

/**
 * get input arrays of UIDs for getProperties.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 */
export let getPropertiesInputUIDs = function( ctx ) {
    var getPropertiesInput = [];

    for( var selCount = 0; selCount < ctx.mselected.length; selCount++ ) {
        var charGroup = {
            type: ctx.mselected[ selCount ].type,
            uid: ctx.mselected[ selCount ].uid
        };
        getPropertiesInput.push( charGroup );
    }
    var parentGroup = {
        type: ctx.pselected.type,
        uid: ctx.pselected.uid
    };
    getPropertiesInput.push( parentGroup );

    return getPropertiesInput;
};

var prepareReplaceRevisionErrorMessage = function( error, firstParam, secondParam ) {
    var message = error + '<br\>';
    message = message.replace( '{0}', firstParam );
    message = message.replace( '{1}', secondParam );
    return message;
};

export let processSoaResponse = function( response, data, ctx, inputData, noRevisions ) {
    var finalMessage = '';
    if ( response && response.ServiceData && response.ServiceData.partialErrors ) {
        for( var index in response.ServiceData.partialErrors ) {
            var errorMessages = '';
            var partialError = response.ServiceData.partialErrors[ index ];
            for( var count in partialError.errorValues ) {
                if( errorMessages === ''){
                    errorMessages = partialError.errorValues[ count ].message; 
                } else {
                    errorMessages += '\n' + partialError.errorValues[ count ].message;
                }
            }
            finalMessage = prepareReplaceRevisionErrorMessage( data.i18n.psi0ReplaceRevisionSetPropertiesErrorMsg, ctx.mselected.length );
            finalMessage += errorMessages;
        }
    } else {
        eventBus.publish( 'cdm.relatedModified', {
            relatedModified: [  ctx.xrtSummaryContextObject ]
        } );
        for ( var i = 0; i < noRevisions.length; i++ ) {
            if ( i === 0 && ctx.mselected.length !== 1 ) {
                finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.psi0NoOfSelectionsForReplaceRevisionErrorMsg, inputData.length,
                    noRevisions.length + inputData.length );
            }
            finalMessage += prepareReplaceRevisionErrorMessage( data.i18n.psi0NoRevisionToReplaceRevisionErrorMsg, noRevisions[i].props.object_name.dbValues[0] );
        }
    }
    if ( finalMessage.length ) {
        messagingSvc.showError( finalMessage );
    }
};

/**
 * SetProperty of relation with latest revision for PDR\DI.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 */
export let replaceLatestRevision = function( ctx, data ) {
    var deliverables = [];
    var noRevisions =  [];

    var pselectedObj = cdm.getObject( ctx.pselected.uid );

    // check if Psi0PlanPrgDel property exists
    var planPrgDelProp = pselectedObj.props.Psi0PlanPrgDel;

    if( planPrgDelProp ) {
        deliverables = pselectedObj.props.Psi0PlanPrgDel.dbValues;
    }

    // check if Psi0DelInstances property exists
    var delInstancesProp = pselectedObj.props.Psi0DelInstances;

    if( delInstancesProp ) {
        deliverables = pselectedObj.props.Psi0DelInstances.dbValues;
    }

    // check if Psi0EventPrgDel property exists
    var eventPrgDelProp = pselectedObj.props.Psi0EventPrgDel;

    if( eventPrgDelProp ) {
        deliverables = pselectedObj.props.Psi0EventPrgDel.dbValues;
    }

    var setInputData = false;
    for ( var selCount = 0; selCount < ctx.mselected.length; selCount++ ) {
        var selectedObj = cdm.getObject( ctx.mselected[selCount].uid );

        if ( selectedObj.props.revision_list && selectedObj.props.revision_list.dbValues.length > 1 ) {

            var latestRevision = selectedObj.props.revision_list.dbValues[selectedObj.props.revision_list.dbValues.length - 1];
            for ( var delCount = 0; delCount < deliverables.length; delCount++ ) {
                if ( ctx.mselected[selCount].uid === deliverables[delCount] ) {
                    deliverables[delCount] = latestRevision;
                    setInputData = true;
                    break;
                }
            }


        } else {
            noRevisions.push( selectedObj );
        }
    }

    var inputData = [];
    if ( setInputData ) {
        if ( planPrgDelProp ) {
            var objectModified = {
                object: ctx.pselected,
                timestamp: '',
                vecNameVal: [ {
                    name: 'Psi0PlanPrgDel',
                    values: deliverables
                } ]
            };
            inputData.push( objectModified );
        }

        if( delInstancesProp ) {
            var objectModified = {
                object: ctx.pselected,
                timestamp: '',
                vecNameVal: [ {
                    name: 'Psi0DelInstances',
                    values: deliverables
                } ]
            };
            inputData.push( objectModified );
        }

        if( eventPrgDelProp ) {
            var objectModified = {
                object: ctx.pselected,
                timestamp: '',
                vecNameVal: [ {
                    name: 'Psi0EventPrgDel',
                    values: deliverables
                } ]
            };
            inputData.push( objectModified );
        }

        soaSvc.postUnchecked( 'Core-2010-09-DataManagement', 'setProperties', {
            info: inputData
        } ).then( function( response ) {
            exports.processSoaResponse( response, data, ctx, inputData, noRevisions );
        } );
    } else {
        exports.processSoaResponse( null, data, ctx, inputData, noRevisions );
    }
};

/**
 * SetProperty of relation with selected revision from panel.
 *
 * @param {ctx} ctx - The ctx of the viewModel
 * @param {data} data - The qualified data of the viewModel
 */
export let replaceRevision = function( ctx, data ) {
    var deliverables = [];
    var pselectedObj = cdm.getObject( ctx.pselected.uid );
    // check if Psi0PlanPrgDel property exists
    var planPrgDelProp = pselectedObj.props.Psi0PlanPrgDel;

    if( planPrgDelProp ) {
        deliverables = pselectedObj.props.Psi0PlanPrgDel.dbValues;
    }

    // check if Psi0DelInstances property exists
    var delInstancesProp = pselectedObj.props.Psi0DelInstances;

    if( delInstancesProp ) {
        deliverables = pselectedObj.props.Psi0DelInstances.dbValues;
    }

    // check if Psi0EventPrgDel property exists
    var eventPrgDelProp = pselectedObj.props.Psi0EventPrgDel;

    if( eventPrgDelProp ) {
        deliverables = pselectedObj.props.Psi0EventPrgDel.dbValues;
    }
    for( var count = 0; count < deliverables.length; count++ ) {
        if( ctx.mselected[ 0 ].uid === deliverables[ count ] ) {
            deliverables[ count ] = data.dataProviders.getRevisionsProvider.selectedObjects[ 0 ].uid;
            break;
        }
    }

    var inputData = [];
    if( planPrgDelProp ) {
        var objectModified = {
            object: ctx.pselected,
            timestamp: '',
            vecNameVal: [ {
                name: 'Psi0PlanPrgDel',
                values: deliverables
            } ]
        };
        inputData.push( objectModified );
    }

    if( delInstancesProp ) {
        var objectModified = {
            object: ctx.pselected,
            timestamp: '',
            vecNameVal: [ {
                name: 'Psi0DelInstances',
                values: deliverables
            } ]
        };
        inputData.push( objectModified );
    }

    if( eventPrgDelProp ) {
        var objectModified = {
            object: ctx.pselected,
            timestamp: '',
            vecNameVal: [ {
                name: 'Psi0EventPrgDel',
                values: deliverables
            } ]
        };
        inputData.push( objectModified );
    }
    return inputData;
};

/**
 * This factory creates a service and returns exports
 *
 * @member ReplaceRevision
 */

export default exports = {
    loadRevisions,
    getPropertiesInputUIDs,
    replaceLatestRevision,
    replaceRevision,
    unSubscribeEvent,
    processSoaResponse
};
app.factory( 'ReplaceRevision', () => exports );
