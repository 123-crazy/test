//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/qfm0FmeaGraphUtil2
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import soaService from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import templateService from 'js/qfm0FmeaGraphTemplateService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';

var exports = {};
 
const CURRENT_CONTROL_ACTION_GROUP = 'CurrentControlActionGroup';
const CURRENT_OPTIMIZATION_ACTION_GROUP = 'OptimizationActionGroup';
const FAILURE_ELEMENT = 'FailureElement';
const PROP_QAM0OCCURRENCE = 'qam0Occurrence';
const PROP_QAM0DETECTION = 'qam0Detection';
const PROP_QFM0SEVERITY = 'qfm0Severity';
const PROP_QFM0_RPN = 'qfm0RPN';
const PROP_QFM0_ACTION_PRIORITY = 'qfm0ActionPriority';
const SEVERITY_PROP = 'Severity';
const RPN_PROP = 'RPN';
const ACTION_PRIORITY_PROP = 'Action_Priority';

export let fetchActionGroupNodesForUpdatingRPNOrAP = function( graphEdittedData ) {
    let actionGrpsUidsForUpdatingRPNAP = [];
    let actionGrpAndEdittedPropertyMappingObj = {};
    let severityUpdatedfailureNodes = [];
    _.forEach( graphEdittedData, function( edittedData ) {
        if( edittedData && edittedData.category && ( edittedData.category === CURRENT_CONTROL_ACTION_GROUP || edittedData.category === CURRENT_OPTIMIZATION_ACTION_GROUP ) ) {
            for( let i = 0; i < edittedData.updatedProperties.length; i++ ) {
                if( edittedData.updatedProperties[i] && ( edittedData.updatedProperties[i].propertyName === PROP_QAM0OCCURRENCE || edittedData.updatedProperties[i].propertyName === PROP_QAM0DETECTION ) ) {
                    if( !actionGrpAndEdittedPropertyMappingObj.hasOwnProperty( edittedData.id ) ) {
                        actionGrpAndEdittedPropertyMappingObj[ edittedData.id ] = [];
                    }

                    if( edittedData.updatedProperties[i].propertyName === PROP_QAM0OCCURRENCE ) {
                        actionGrpAndEdittedPropertyMappingObj[ edittedData.id ].push( PROP_QAM0OCCURRENCE ); 
                    }
                    if( edittedData.updatedProperties[i].propertyName === PROP_QAM0DETECTION ) {
                        actionGrpAndEdittedPropertyMappingObj[ edittedData.id ].push( PROP_QAM0DETECTION );
                    }

                    if( actionGrpsUidsForUpdatingRPNAP.indexOf(edittedData.id) < 0 ) {
                        actionGrpsUidsForUpdatingRPNAP.push( edittedData.id );
                    }
                }
            }
        }
        else if( edittedData && edittedData.category && edittedData.category === FAILURE_ELEMENT ) {
            for( let i = 0; i < edittedData.updatedProperties.length; i++ ) {
                if( edittedData.updatedProperties[i] && edittedData.updatedProperties[i].propertyName === PROP_QFM0SEVERITY ) {
                    severityUpdatedfailureNodes.push( edittedData.id );
                    break;
                }
            }
        }
    } );

    let impactedActionGrpUidsDueToSeverityChange = _getActionGrpsUidsToUpdateDueToSeverityChange( severityUpdatedfailureNodes );

    let riskEvaluationObjectUids = [];
    let actionGrpNodesWithOccOrDetectionChanged = [];
    let actionGrpNodesImpactedBySeverityChange = [];
    let graph = appCtxService.getCtx('graph');
    let riskMethodProperty;

    if( actionGrpsUidsForUpdatingRPNAP.length > 0 ) {
        _updateRiskEvaluationObjectsArray( actionGrpsUidsForUpdatingRPNAP, actionGrpNodesWithOccOrDetectionChanged, graph, riskEvaluationObjectUids );
        if( actionGrpNodesWithOccOrDetectionChanged && actionGrpNodesWithOccOrDetectionChanged.length > 0 && actionGrpNodesWithOccOrDetectionChanged[0] ) {
            riskMethodProperty = _getRiskMethodProperty( actionGrpNodesWithOccOrDetectionChanged[0] );
        }        
    }

    if( impactedActionGrpUidsDueToSeverityChange.length > 0 ) {
        _updateRiskEvaluationObjectsArray( impactedActionGrpUidsDueToSeverityChange, actionGrpNodesImpactedBySeverityChange, graph, riskEvaluationObjectUids );
        if( !riskMethodProperty && actionGrpNodesImpactedBySeverityChange && actionGrpNodesImpactedBySeverityChange.length > 0 && actionGrpNodesImpactedBySeverityChange[0] ) {
            riskMethodProperty = _getRiskMethodProperty( actionGrpNodesImpactedBySeverityChange[0] );
        } 
    }

    
    
    

    // Below forEach is loop for those action group nodes for which occurrence/detection value was changed by editting
    // _.forEach( actionGrpsUidsForUpdatingRPNAP, function( actionGroupUid ) {
    //     let nodeObj = graph.graphModel.nodeMap[ actionGroupUid ];
    //     actionGrpNodesWithOccOrDetectionChanged.push( nodeObj );
    //     riskEvaluationObjectUids.push( nodeObj.appData.nodeObject.qfm0RiskEvaluationObjUid );

    //     if( !riskMethodProperty ) {
    //         riskMethodProperty = _getRiskMethodProperty( nodeObj );
    //     }
    // } );

    // Below forEach loop is for those action group nodes for which effect's severity was changed by editting
    // _.forEach( impactedActionGrpUidsDueToSeverityChange, function( actionGroupUid ) {
    //     let nodeObj = graph.graphModel.nodeMap[ actionGroupUid ];
    //     impactedActionGrpUidsDueToSeverityChange.push( nodeObj );
    //     riskEvaluationObjectUids.push( nodeObj.appData.nodeObject.qfm0RiskEvaluationObjUid );

    //     if( !riskMethodProperty ) {
    //         riskMethodProperty = _getRiskMethodProperty( nodeObj );
    //     }
    // } );

    if( riskEvaluationObjectUids && riskEvaluationObjectUids.length > 0 && riskMethodProperty ) {
        if( actionGrpNodesWithOccOrDetectionChanged && actionGrpNodesWithOccOrDetectionChanged.length > 0 ) {
            // If RPN/AP needs to be updated because occurrence/detection of action groups was chnaged then need to call edit handler SOA, 
            // so that RPN/AP recalculation can be triggered.
            let input = _prepareInputForSOACallForUpdatingRPNAP( actionGrpNodesWithOccOrDetectionChanged, actionGrpAndEdittedPropertyMappingObj );
            if( input && input.length > 0 ) {
                soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', { inputs: input } ).then(
                    function( response ) {
                        // call SOA for getting latest RPN/AP for all risk evaluation objects
                        _getLatestRPNOrAPValueForAllRiskObjects( riskEvaluationObjectUids ).then(
                            function( riskEvaluationObjects ) {
                                // update all action group nodes for showing latest RPN/AP. Here need to include thosed action groups as well for 
                                // which RPN/AP might changed because of severity change of any effect failure
                                let allActionGroupUidsForRPNAPUpdate =  actionGrpsUidsForUpdatingRPNAP.concat( impactedActionGrpUidsDueToSeverityChange );
                                _updateRPNOrAPForActionGrpNodes( graph, riskEvaluationObjects, actionGrpsUidsForUpdatingRPNAP, riskMethodProperty );                   
                            },
                            function( error ) {
                                _showErrorMessage( error );
                            }
                        );                      
                    },
                    function( error ) {
                        _showErrorMessage( error );
                    }
                );
            }
        }
        else if( impactedActionGrpUidsDueToSeverityChange && impactedActionGrpUidsDueToSeverityChange.length > 0 ) {
            // If RPN/AP needs to be updated ONLY because of severity of failures was changed then no need to call edit handler SOA, 
            // and can directly call SOA for getting latest RPN/AP for all risk evaluation objects
            _getLatestRPNOrAPValueForAllRiskObjects( riskEvaluationObjectUids ).then(
                function( riskEvaluationObjects ) {
                    // update all action group nodes for showing latest RPN/AP
                    _updateRPNOrAPForActionGrpNodes( graph, riskEvaluationObjects, impactedActionGrpUidsDueToSeverityChange, riskMethodProperty );                   
                },
                function( error ) {
                    _showErrorMessage( error );
                }
            );
        }       
    }
};

function _showErrorMessage( error ) {
    let errMessage = messagingService.getSOAErrorMessage( error );
    messagingService.showError( errMessage );
    throw error;
}

function _updateRiskEvaluationObjectsArray( actionGroupUids, actionGroupNodes, graph, riskEvaluationObjectUids ) {
    _.forEach( actionGroupUids, function( actionGroupUid ) {
        let nodeObj = graph.graphModel.nodeMap[ actionGroupUid ];
        actionGroupNodes.push( nodeObj );
        riskEvaluationObjectUids.push( nodeObj.appData.nodeObject.qfm0RiskEvaluationObjUid );
    } );
}

function _getActionGrpsUidsToUpdateDueToSeverityChange( failureElements ) {
    let impactedActionGrpUidsDueToSeverityChange = [];
    let failuresHavingImpactedActionGrps = [];
    let graph = appCtxService.getCtx('graph');
    let graphModel = graph.graphModel;
    let structureEdgesData = graphModel.structureEdgeDatas;
    let edgeMap = graphModel.edgeMap;
    let levelOneCauses = _getCausesOfGivenFailures( failureElements, edgeMap );

    failuresHavingImpactedActionGrps = _getCausesOfGivenFailures( levelOneCauses, edgeMap );
    impactedActionGrpUidsDueToSeverityChange = _getActionGroupsOfGivenFailuresInGraph( failuresHavingImpactedActionGrps, structureEdgesData );
    return impactedActionGrpUidsDueToSeverityChange;
}

function _getActionGroupsOfGivenFailuresInGraph( failuresHavingImpactedActionGrps, structureEdgesData ) {
    let actionGroupUids = [];      
    if( structureEdgesData && structureEdgesData.length > 0 && failuresHavingImpactedActionGrps && failuresHavingImpactedActionGrps.length > 0 ) {
        _.forEach( structureEdgesData, function( edgeObject ){
            if( edgeObject && failuresHavingImpactedActionGrps.indexOf( edgeObject.leftId ) > -1 ) {
                actionGroupUids.push( edgeObject.rightId );
            }
        });
    }
    actionGroupUids = _.uniq(actionGroupUids);
    return actionGroupUids;
}

function _getCausesOfGivenFailures( failureElements, edgeMap ) {
    let failureCauses = [];    
    let edgeMapKeys = Object.keys(edgeMap);   
    if( edgeMap && failureElements && failureElements.length > 0 ) {
        _.forEach( edgeMapKeys, function( edgeKey ){
            if( edgeMap[edgeKey] && edgeMap[edgeKey].edgeData && failureElements.indexOf(edgeMap[edgeKey].edgeData.leftId) > -1 ) {
                failureCauses.push(edgeMap[edgeKey].edgeData.rightId);
            }
        });
    }
    failureCauses = _.uniq( failureCauses );
    return failureCauses;
}

function _updateRPNOrAPForActionGrpNodes( graph, riskEvaluationObjects, actionGrpsUidsForUpdatingRPNAP, riskMethodProperty ) {
    let graphModel = graph.graphModel;
    let graphControl = graphModel.graphControl;
    let prop;
    if( riskMethodProperty === PROP_QFM0_RPN ) {
        prop = RPN_PROP;
    } else if( riskMethodProperty === PROP_QFM0_ACTION_PRIORITY) {
        prop = ACTION_PRIORITY_PROP;
    }
    _.forEach( actionGrpsUidsForUpdatingRPNAP, function( actionGrpUid ) {
        let node = graphModel.nodeMap[ actionGrpUid ];
        if( node ) {
            let nodeObject = node.appData.nodeObject;
            let riskEvaluationObjForActionGrp = riskEvaluationObjects[ nodeObject.qfm0RiskEvaluationObjUid ];

            let newBindData = {};
            newBindData[ prop ] = riskEvaluationObjForActionGrp.props[riskMethodProperty].dbValues[0];
            graphControl.graph.updateNodeBinding( node, newBindData );
        }
    } );
}

/**
 * Fetch latest RPN/AP value for risk evaluation objects
 * @param {Array} riskEvaluationObjectUids 
 * @returns Object having risk evaluation object uid as property name and value is risk evaluation model object
 */
function _getLatestRPNOrAPValueForAllRiskObjects( riskEvaluationObjectUids ) {
    let deferred = AwPromiseService.instance.defer();
    let policyId = propertyPolicySvc.register( {
        types: [
            {
                name: 'Qfm0RiskEvaluation',
                properties: [
                    { name: 'qfm0RPN' },
                    { name: 'qfm0ActionPriority' }
                ]
            }
        ]
    } );
    soaSvc.post( 'Core-2007-09-DataManagement', 'loadObjects', { uids: riskEvaluationObjectUids } ).then( function( resp ) {
        let riskEvaluationObjects = {};
        _.forEach( riskEvaluationObjectUids, function( riskObjUid ) {
            let riskObject = cdm.getObject( riskObjUid );
            if( riskObject ) {
                riskEvaluationObjects[riskObjUid] = riskObject;
            }
        });
        propertyPolicySvc.unregister( policyId );
        deferred.resolve(riskEvaluationObjects);
    } );
    return deferred.promise;
}

function _prepareInputForSOACallForUpdatingRPNAP( updatedActionGrpNodes, actionGrpAndEdittedPropertyMappingObj ) {
    let input = [];
    _.forEach( updatedActionGrpNodes, function( actionGrpNode ) {
        let nodeObject = actionGrpNode && actionGrpNode.appData ? actionGrpNode.appData.nodeObject : null ;
        if( nodeObject ) {
            let modelObject = cdm.getObject( nodeObject.uid );
            let occurrenceDbValues = nodeObject.props[ PROP_QAM0OCCURRENCE ] ? nodeObject.props[ PROP_QAM0OCCURRENCE ].dbValues : [];
            let occurrenceUiValues = nodeObject.props[ PROP_QAM0OCCURRENCE ] ? nodeObject.props[ PROP_QAM0OCCURRENCE ].uiValues : [];
            let detectionDbValues = nodeObject.props[ PROP_QAM0DETECTION ] ? nodeObject.props[ PROP_QAM0DETECTION ].dbValues : [];
            let detectionUiValues = nodeObject.props[ PROP_QAM0DETECTION ] ? nodeObject.props[ PROP_QAM0DETECTION ].uiValues : [];
            let lastSaveDate = nodeObject.props.lsd ? nodeObject.props.lsd.dbValues[0] : [];   
            let requestObject = {
                obj: modelObject,
                viewModelProperties: [],
                isPessimisticLock: false,
                workflowData: {}
            };

            let edittedPropertiesArray = actionGrpAndEdittedPropertyMappingObj[ nodeObject.uid ];
            if( edittedPropertiesArray.indexOf(PROP_QAM0OCCURRENCE) > -1 ) {
                let occurrenceViewModelProp = {
                    propertyName: PROP_QAM0OCCURRENCE,
                    dbValues: occurrenceDbValues,
                    uiValues: occurrenceUiValues,
                    intermediateObjectUids: [],
                    srcObjLsd: lastSaveDate,
                    isModifiable: true
                };
                requestObject.viewModelProperties.push(occurrenceViewModelProp);
            }            
            if( edittedPropertiesArray.indexOf(PROP_QAM0DETECTION) > -1 ) {
                let detectionViewModelProp = {
                    propertyName: PROP_QAM0DETECTION,
                    dbValues: detectionDbValues,
                    uiValues: detectionUiValues,
                    intermediateObjectUids: [],
                    srcObjLsd: lastSaveDate,
                    isModifiable: true
                };
                requestObject.viewModelProperties.push(detectionViewModelProp);
            }
            input.push(requestObject);
        }
    });
    return input;
}

function _getRiskMethodProperty( nodeObj ) {
    let riskMethodProperty;
    let nodeObject = nodeObj.appData.nodeObject;
    if( nodeObject.hasOwnProperty(PROP_QFM0_RPN) ) {
        riskMethodProperty = PROP_QFM0_RPN;
    }
    else if( nodeObject.hasOwnProperty(PROP_QFM0_ACTION_PRIORITY) ) {
        riskMethodProperty = PROP_QFM0_ACTION_PRIORITY;
    }
    return riskMethodProperty;
}

export let updateGraphNodesOnRHEditSeverityCommand = function( ctx, data ) {
    let updatedObjectsUids = [];
    if( data && data.eventData && data.eventData.dataSource && data.eventData.dataSource.updatedObjectsUids && data.eventData.dataSource.updatedObjectsUids.length > 0 ) {
        updatedObjectsUids = data.eventData.dataSource.updatedObjectsUids;
    }
    updateGraphNodesOnSeverityCascade( ctx, data, updatedObjectsUids );
};

export let updateGraphNodesOnSeverityCascade = function( ctx, data, updatedObjectsUids, modelObjects = null ) {
    let graph = ctx.graph;
    let graphModel = graph.graphModel;
    let graphControl = graphModel.graphControl;
    
    // Update severity of graph nodes of updated failure elements
    if( graphModel && graphControl && updatedObjectsUids.length > 0 ) {

        let modelObjectsList = null;
        if( data && data.eventData && data.eventData.dataSource && data.eventData.dataSource.modelObjects ) {
            modelObjectsList = data.eventData.dataSource.modelObjects;
        }
        else {
            modelObjectsList = modelObjects;
        }

        if( modelObjectsList ) {
            _.forEach( updatedObjectsUids, function( updatedObjUid ) {
            
                let node = graphModel.nodeMap[ updatedObjUid ];
                if(node) {
                    let modelObject = modelObjectsList[ updatedObjUid ];
                    if(modelObject) {
                        let newBindData = {};
                        newBindData[ SEVERITY_PROP ] = modelObject.props.qfm0Severity.uiValues[0];
                        graphControl.graph.updateNodeBinding( node, newBindData );
                    }                
                }
            } );
        }
    }

    // Update RPN/AP of impacted action group nodes which are already loaded in net view    
    let riskEvaluationObjectUids = [];
    let actionGrpsUidsForUpdatingRPNAP = [];
    let riskMethodProperty;
    let updatedFailureElements = updatedObjectsUids;

    actionGrpsUidsForUpdatingRPNAP = _getActionGrpsUidsToUpdateDueToSeverityChange(updatedFailureElements);
    _.forEach(actionGrpsUidsForUpdatingRPNAP, function( actionGrpUid ){
        riskEvaluationObjectUids.push( graphModel.nodeMap[actionGrpUid].appData.nodeObject.qfm0RiskEvaluationObjUid );
    });

    if( riskEvaluationObjectUids.length > 0 ) {
        if( actionGrpsUidsForUpdatingRPNAP.length > 0 ) {
            riskMethodProperty = _getRiskMethodProperty( graphModel.nodeMap[ actionGrpsUidsForUpdatingRPNAP[0] ] );
        }
        if( riskMethodProperty ) {
            _getLatestRPNOrAPValueForAllRiskObjects( riskEvaluationObjectUids ).then(
                function( riskEvaluationObjects ) {
                    _updateRPNOrAPForActionGrpNodes( graph, riskEvaluationObjects, actionGrpsUidsForUpdatingRPNAP, riskMethodProperty );                   
                },
                function( error ) {
                    let errMessage = messagingService.getSOAErrorMessage( error );
                    messagingService.showError( errMessage );
                    throw error;
                }
            );
        }
    } 
};

/** -------------------------------------------------------------------
 * qfm0FmeaGraphUtil2 factory
 */
export default exports = {
    fetchActionGroupNodesForUpdatingRPNOrAP,
    updateGraphNodesOnRHEditSeverityCommand,
    updateGraphNodesOnSeverityCascade
};
app.factory( 'qfm0FmeaGraphUtil2', () => exports );