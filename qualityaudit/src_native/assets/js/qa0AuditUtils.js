// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */

/**
 * This file is used as utility file for Audit from quality center foundation module
 *
 * @module js/qa0AuditUtils
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import cdmService from 'soa/kernel/clientDataModel';
import dateTimeSvc from 'js/dateTimeService';
import soaSvc from 'soa/kernel/soaService';
import eventBus from 'js/eventBus';
import messagingService from 'js/messagingService';
import localeService from 'js/localeService';
import _ from 'lodash';

var exports = {};
var eventSubs = null;
var eventSubsComplete = null;

/**
 *This method is to concat all the partialError messages if any
 */
export let failureMessageConcat = function( data ) {
    var errors = data.ServiceData.ServiceData.partialErrors[ 0 ].errorValues;
    var errorMessage = '';

    for( var i = 0; i < errors.length; i++ ) {
        errorMessage += String( errors[ i ].message );
        if( i !== errors.length - 1 ) { errorMessage += '<BR/>'; }
    }

    appCtxService.ctx.ErrorName = errorMessage;
};

/**
 * Resolve array of uids into a tag array that can be used for soa calls as tagArrayProps.
 * @param {Object} Array of object uids
 * @return {Object} Array with tag propertires
 **/
export let resolveTagArrayProps = function( arrayProp ) {
    var resolvedObject = {};
    var tagArray = [];

    if( arrayProp !== undefined || arrayProp !== '' ) {
        var objectarray = arrayProp.dbValue;

        objectarray.forEach( function( obj ) {
            resolvedObject = cdmService.getObject( obj );

            tagArray.push( { uid: resolvedObject.uid, type: resolvedObject.type } );
        } );
    }

    return tagArray;
};

/**
 * Convert datetime dbValue into input string for soa service.
 * @param {date} data - Date to convert
 * @return {string} UTC formatted string
 */
export let getDateString = function( data ) {
    if( data !== undefined && data !== '' ) {
        return dateTimeSvc.formatUTC( data.dbValue );
    }
};

/**
 * Initialize audit norm value list from assigned audit guideline object.
 * @param {object} ctx - Context
*/
export let initializeAllowedAuditNorms = function( ctx ) {
  
    var viewProp = ctx.xrtSummaryContextObject.props.qa0AuditNorms;
    

    viewProp.hasLov = true;
    viewProp.lovApi = {};
     var businessObject = ctx.selected.type;
    // Retrieve Qa0AuditNorms LOV
    soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', {
        initialData: {
            lovInput: {
                operationName: 'Create',
                boName: businessObject
            },
            propertyName: 'qa0AuditNorms'
        }
    } ).then( function( responseData ) {
        viewProp.lovApi.getInitialValues = function( filterStr, deferred ) {
            var lovEntries = [];
            var lovinput = responseData.lovValues;


            for( let i = 0; i < lovinput.length; i++ ) {
                var internalValue = lovinput[ i ].propInternalValues.lov_values[ 0 ];
                var displayValue = lovinput[ i ].propDisplayValues.lov_values[ 0 ];
                var displayDescription = '';

                if ( lovinput[ i ].propDisplayValues.lov_value_descriptions ) {
                    displayDescription = lovinput[ i ].propDisplayValues.lov_value_descriptions[ 0 ];
                }
                if(ctx.selected.type==='Qa0QualityAudit'){
                    var guidelineUID = ctx.xrtSummaryContextObject.props.qa0AuditGuideline.dbValues[ 0 ];
                    // Retrieve allowed norms from assigned guideline object
                    var guidelineObj = cdmService.getObject( guidelineUID );
                    var guidelineNorms = guidelineObj.props.qa0AuditNorms;
                        // Only show norms, that are assigned to the current guideline object and
                        // don't already exist in the qa0AuditNorms property
                        if( !_.includes( viewProp.dbValue, internalValue ) && _.includes( guidelineNorms.dbValues, internalValue ) ) {
                            lovEntries.push( {
                                propDisplayValue: displayValue,
                                propInternalValue: internalValue,
                                propDisplayDescription: displayDescription,
                                hasChildren: false,
                                children: {},
                                sel: false
                            } );
                        }
                    }else if(ctx.selected.type==='Qa0QualityAuditGuideline' && !_.includes( viewProp.dbValue, internalValue )){
                        lovEntries.push( {
                            propDisplayValue: displayValue,
                            propInternalValue: internalValue,
                            propDisplayDescription: displayDescription,
                            hasChildren: false,
                            children: {},
                            sel: false
                        } );
                    }
                }
         

            return deferred.resolve( lovEntries );
        };

        viewProp.lovApi.getNextValues = function( deferred ) {
            deferred.resolve( null );
        };

        viewProp.lovApi.validateLOVValueSelections = function( values ) {
            return false;
        };
    } );
};

//This function subscribe the event 'reportbuilder.generateitemreportcomplete' of report and call custom soa to attach genrated report to attachment tab of Audit
export let subscribeEventOfReport = function( ctx, data ) {
    if ( !eventSubs ) {
        eventSubs = eventBus.subscribe( 'reportbuilder.generateitemreportcomplete', function( eventData, data ) {
            if( eventData && eventData.reportInfo ) {
            const input = [ {
                clientId: 'AuditGenReportCDS',
                type: 'HTML',
                description: '',
                name: eventData.reportInfo.reportFileName,
                relationType: 'Qa0AuditAttachments',
                container: ctx.locationContext.modelObject,
                datasetFileInfos: [ {
                    fileName: eventData.reportInfo.reportFileName,
                    namedReferenceName: 'HTML',
                    isText: true
                } ]
            } ];
            soaSvc.post( 'Core-2010-04-DataManagement', 'createDatasets', {
                input: input
            } ).then( function( response ) {
                    var datasetFileTicketInfos = response.datasetOutput[0].commitInfo[0].datasetFileTicketInfos;
                    var datasetFileInfo = datasetFileTicketInfos[0].datasetFileInfo;
                    var commitInputs = [];
                    var commitInput = {
                        dataset: response.datasetOutput[0].commitInfo[0].dataset,
                        createNewVersion: false,
                        datasetFileTicketInfos:
                            [ {
                                datasetFileInfo:
                                {
                                    clientId: 'AuditGenReportCDF',
                                    fileName: datasetFileInfo.fileName,
                                    namedReferencedName: datasetFileInfo.namedReferenceName,
                                    isText: true,
                                    allowReplace: false
                                },
                                ticket: datasetFileTicketInfos[0].ticket
                            } ]
                    };
                    commitInputs.push( commitInput );
                    soaSvc.post( 'Core-2006-03-FileManagement', 'commitDatasetFiles', {
                        commitInput: commitInputs
                    } ).then( function( response ) {

                    } );
                // } );
            } );
        }
} );

        if ( !eventSubsComplete ) {
            eventSubsComplete = eventBus.subscribe( 'Awp0InContextReports.contentUnloaded', function() {
                eventBus.unsubscribe( eventSubs );
                eventBus.unsubscribe( eventSubsComplete );
                eventSubs = null;
                eventSubsComplete = null;
            } );
        }
    }
};

/**
 * filter objects from modified objects and tree nodes to decorate with RYG rating
 */
export let filterObjectsForDecorators = function(treeNodes, modifiedObjects) {
    var filteredTreeNodes = [];
    var filteredModifiedObject = [];

    if (treeNodes.length > 0) {               
        filteredTreeNodes = _.filter(treeNodes, function(obj) {
            return obj.type !== 'DummyFindingsNode' && obj.modelType.typeHierarchyArray.indexOf('Psi0AbsChecklist') > -1;
        });
    } 

    if (modifiedObjects.length > 0) {          
        filteredModifiedObject = _.filter(modifiedObjects, function(obj) {
            return obj.type !== 'DummyFindingsNode' && obj.modelType.typeHierarchyArray.indexOf('Apm0RYG') > -1 || obj.modelType.typeHierarchyArray.indexOf('Psi0AbsChecklist') > -1;
        });    
    } 

    return { 
        filteredTreeNodes: filteredTreeNodes, 
        filteredModifiedObject: filteredModifiedObject
    };
};

export default exports = {
    failureMessageConcat,
    resolveTagArrayProps,
    getDateString,
    initializeAllowedAuditNorms,
    subscribeEventOfReport,
    filterObjectsForDecorators
};
app.factory( 'qa0AuditUtils', () => exports );
