// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Caw0AnalysisService
 */
import app from 'app';
import legendSvc from 'js/Rv1RelationBrowserLegendService';
import localeSvc from 'js/localeService';
import notyService from 'js/NotyModule';
import editHandlerService from 'js/editHandlerService';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import graphConstants from 'js/graphConstants';
import Rv1RelationBrowserService from 'js/Rv1RelationBrowserService';
import cdmSvc from 'soa/kernel/clientDataModel';

import templateService from 'js/Caw0AnalysisTemplateService';

var exports = {};

var _missingActiveViewMsg;
var _editHandlerService = null;

export let startGraphEdit = function( ctx, graphModel ) {
    if( graphModel ) {
        var editInputMode = 'editInputMode';
        // set edit input mode
        graphModel.config.inputMode = editInputMode;
        ctx.graphEdittedData = [];
    }
};

export let saveGraphEdit = function( ctx, graphModel ) {
    if( ctx.graphEdittedData ) {
        var editHandler = editHandlerService.getActiveEditHandler( 'METHODOLOGY_EDIT_CONTEXT' );
        if( editHandler ) {
            editHandler.saveEdits();
        } else {
            editHandler = editHandlerService.getActiveEditHandler( '' );
            editHandler.saveEdits();
        }

        //eventBus.publish( 'setGraphProperties' );
        if( graphModel ) {
            var graphViewerInputMode = 'viewInputMode';
            // set view input mode
            graphModel.config.inputMode = graphViewerInputMode;
        }
    }
};

export let getGraphPropertyInput = function( data, ctx ) {
    var edittedObjects = [];
    ctx.graphEdittedData.map( function( obj ) {
        var type;
        switch ( obj.category ) {
            case 'Cause':
                type = 'CAW0Defect';
                break;
            case 'Why':
                type = 'CAW0Defect';
                break;
            case 'Ishikawa':
                type = 'CAW0Ishikawa';
                break;
            case '5Why':
                type = 'CAW05Why';
                break;
        }
        var vecNameVal = [];
        obj.updatedProperties.forEach( property => {
            var updatedProp = {
                name: property.propertyName,
                values: [
                    property.newValue
                ]
            };
            vecNameVal.push( updatedProp );
        } );
        edittedObjects.push( {
            object: {
                uid: obj.id,
                type: type
            },
            timestamp: '',
            vecNameVal: vecNameVal
        } );
    } );

    return edittedObjects;
};

export let cancleGraphEdit = function( graphModel ) {
    if( graphModel ) {
        var graphViewerInputMode = 'viewInputMode';

        // set view input mode
        graphModel.config.inputMode = graphViewerInputMode;
        var nodeObjectIDs = graphModel.graphData.nodes;
        if( nodeObjectIDs && nodeObjectIDs.length > 0 ) {
            var graphControl = graphModel.graphControl;

            _.forEach( nodeObjectIDs, function( nodeObjectID ) {
                var node = graphModel.nodeMap[ nodeObjectID.id ];
                if( node ) {
                    var nodeObject = node.appData.nodeObject;
                    var props = templateService.getBindPropertyNames( nodeObject );
                    var objectBindData = templateService.getBindProperties( nodeObject, false );
                    _.forEach( props, function( prop ) {
                        var newBindData = {};
                        newBindData[ prop ] = objectBindData[ prop ];
                        graphControl.graph.updateNodeBinding( node, newBindData );
                    } );
                }
            } );
        }
        var editHandler = editHandlerService.getActiveEditHandler( 'METHODOLOGY_EDIT_CONTEXT' );
        if( editHandler ) {
            editHandler.cancelEdits();
        }
    }
};

export let onNodeEditCommitted = function( ctx, graphModel, eventData, legendState ) {
    var edittedData = {};
    var updatedProperty;
    //check if Cause or Ishikawa Object is updated
    if( eventData.editNode && eventData.editNode.appData.category === 'Defect' && eventData.editNode.appData.nodeObject.props.caw0Context.dbValues[ 0 ] === 'Ishikawa' || eventData.editNode.appData.category === 'Ishikawa' ) {
        edittedData = {
            category: eventData.editNode.appData.category === 'Defect' ? 'Cause' : 'Ishikawa',
            id: eventData.editNode.appData.id,
            updatedProperties: []
        };
        updatedProperty = {
            newValue: eventData.newValue,
            oldValue: eventData.oldValue,
            propertyName: eventData.propertyName === 'Name' ? 'object_name' : 'object_desc'
        };
        //If User updated Problem Defination ingraph
        if( edittedData.category === 'Ishikawa' && eventData.propertyName === 'Name' ) {
            updatedProperty.propertyName = 'caw0ProbDefinition';
        }
    } else if( eventData.editNode && eventData.editNode.appData.category === 'Defect' && (eventData.editNode.appData.nodeObject.props.caw0Context.dbValues[ 0 ] === '5Why' || eventData.editNode.appData.nodeObject.props.caw0Context.dbValues[ 0 ] === 'Why') || eventData.editNode.appData.category === '5Why' ) {
        edittedData = {
            category: eventData.editNode.appData.category === 'Defect' ? 'Why' : '5Why',
            id: eventData.editNode.appData.id,
            updatedProperties: []
        };
        updatedProperty = {
            newValue: eventData.newValue,
            oldValue: eventData.oldValue,
            propertyName: eventData.propertyName === 'Name' || eventData.propertyName === 'Description' ? 'object_name' : 'caw0ProbDefinition'
        };
    }
    var isPresent = false;
    if(edittedData.updatedProperties) {
        edittedData.updatedProperties.push( updatedProperty );
    }
    if( ctx.graphEdittedData.length === 0 && eventData.newValue !== '' ) {
        ctx.graphEdittedData.push( edittedData );
        eventBus.publish( 'caw0MethodologyGraph.Modified', {} );
    } else {
        var isPropertyPresent = false;
        ctx.graphEdittedData.map( function( obj ) {
            if( obj.id === edittedData.id ) {
                if( obj.updatedProperties.length > 0 ) {
                    obj.updatedProperties.forEach( property => {
                        if( property.propertyName === edittedData.updatedProperties[ 0 ].propertyName ) {
                            property.newValue = edittedData.updatedProperties[ 0 ].newValue;
                            property.oldValue = edittedData.updatedProperties[ 0 ].oldValue;
                            isPropertyPresent = true;
                        }
                    } );
                    if( !isPropertyPresent && eventData.newValue !== '' ) {
                        obj.updatedProperties.push( edittedData.updatedProperties[ 0 ] );
                    }
                    isPresent = true;
                }
            }
        } );
        if( !isPresent && eventData.newValue !== '' ) {
            ctx.graphEdittedData.push( edittedData );
        }
    }
};

/**
 * Get input for queryNetwork SOA input. The given graph object UIDs will be returned if it's an valid array,
 * otherwise return the primary context object UID.
 *
 * @param ctx the application context object
 * @param data the view model object
 *
 * @return the queryNetwork SOA input
 */
export let getQueryNetworkInput = function( ctx, data ) {
    try {
        if( !ctx || !data ) {
            return;
        }

        // The object UIDs will be used as query network input if it's an valid array, otherwise take the selected object in context as root object.
        var seedIDs;
        //If User on Methodology and selected is not 5Why or Ishikawa

        if( ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) === -1 && data.eventMap && data.eventMap.hasOwnProperty( 'Rv1RelationsBrowser.expandGraph' ) ) {
            seedIDs = data.eventMap[ 'Rv1RelationsBrowser.expandGraph' ].rootIDs;
        } else if( ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) === -1 && data.eventMap && data.eventMap.hasOwnProperty( 'addElement.added' ) ) {
            seedIDs = [ ctx.selected.uid ];
        } else if( ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 && ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Methodology' || ctx.updateCategoryFromInfo ) {
            seedIDs = [ ctx.xrtSummaryContextObject.uid ];
        } else {
            seedIDs = ctx.selected.type === 'CauseGroup' ? [ ctx.selected.parentId ] : [ ctx.selected.uid ];
        }
        var expandDirection = graphConstants.ExpandDirection.FORWARD;
        var isInitial = false;
        var expandLevel = '1';
        if( !ctx.graph.graphModel.nodeMap ) {
            isInitial = true;
        }
        if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) === -1 && ctx.selected.type !== 'CauseGroup' ) {
            var parentNode = ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Methodology' || ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ? cdmSvc.getObject( ctx
                .xrtSummaryContextObject.uid ) : cdmSvc.getObject( ctx.selected.uid );
            if( parentNode.hasOwnProperty( '$$treeLevel' ) ) {
                expandLevel = typeof parentNode.totalChildCount === 'number' ? String( parentNode.totalChildCount ) : parentNode.totalChildCount;
            } else {
                expandLevel = parentNode.props.caw0NumOfWhy === undefined || parentNode.props.caw0NumOfWhy.dbValues[ 0 ] === null ? '0' : parentNode.props.caw0NumOfWhy.dbValues[ 0 ];
            }
        }
        expandLevel = isInitial ? expandLevel : String( parseInt( expandLevel, 10 ) + 1 );
        expandLevel = '100';
        var legendState = ctx.graph.legendState;
        if( legendState && legendState.activeView ) {
            // get active view name from legend state
            var viewName = legendState.activeView.internalName;

            // Remove duplicate entries.
            seedIDs = _.uniq( seedIDs );

            // cache the seedIDs and expandDirection
            data.seedIDs = seedIDs;
            data.expandDirection = expandDirection;

            return {
                graphParamMap: {
                    direction: [ data.expandDirection ],
                    level: [ expandLevel ]
                },
                inquiries: [],
                queryMode: 'ExpandAndDegree',
                rootIds: data.seedIDs,
                serviceCursor: 0,
                viewName: viewName
            };
        }

        logger.error( 'Graph display issue: unable to find the Legend\'s active view name.' );
        notyService.showError( _missingActiveViewMsg );
    } catch ( ex ) {
        logger.error( ex );
    }
};

// eslint-disable-next-line valid-jsdoc
/**
 * Get input for queryNetwork SOA input. The given graph object UIDs will be returned if it's an valid array,
 * otherwise return the primary context object UID.
 *
 * @param ctx the application context object
 * @param data the view model object
 *
 * @return the queryNetwork SOA input
 */
// eslint-disable-next-line complexity
export let getQueryNetworkInputForRelations = function( ctx, data, eventData ) {
    try {
        if( !ctx || !data ) {
            return;
        }
        if( ctx.pselected && ctx.pselected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 ) {
            ctx.parentCAPA = ctx.pselected;
        }
        // The object UIDs will be used as query network input if it's an valid array, otherwise take the selected object in context as root object.
        var seedIDs = null;
        if( ctx.initRelationsBrowserCtx && ctx.initRelationsBrowserCtx.rootId && ctx.initRelationsBrowserCtx.rootId !== '' ) {
            seedIDs = [ ctx.initRelationsBrowserCtx.rootId ];
        } else {
            seedIDs = [ ctx.selected.uid ];
        }

        var expandDirection = _.get( ctx.graph, 'legendState.activeView.defaultExpandDirection', null );
        if( !expandDirection || !expandDirection.length ) {
            expandDirection = graphConstants.ExpandDirection.FORWARD;
        }

        var expandedObject = eventData && eventData.rootIDs && eventData.rootIDs.length > 0 ? cdmSvc.getObject( eventData.rootIDs[ 0 ] ) : undefined;
        var expandLevel;
        if( expandedObject && expandedObject.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
            expandLevel = expandedObject.props.caw0NumOfWhy && expandedObject.props.caw0NumOfWhy.dbValues[ 0 ] === null ? '0' : expandedObject.props.caw0NumOfWhy.dbValues[ 0 ];
        } else if( eventData && eventData.addElementResponse && eventData.addElementResponse.output[ 0 ].objects[ 0 ].props.caw0Context && eventData.addElementResponse.output[ 0 ].objects[ 0 ].props
            .caw0Context.dbValues[ 0 ] === '5Why' && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
            expandLevel = ctx.selected.props.caw0NumOfWhy.dbValues[ 0 ] === null ? '1' : ( parseInt( ctx.selected.props.caw0NumOfWhy.dbValues[ 0 ] ) + 1 ).toString();
        } else {
            expandLevel = '1';
        }

        if( typeof ctx.selected.props.awb0UnderlyingObject !== 'undefined' ) {
            seedIDs = ctx.selected.props.awb0UnderlyingObject.dbValues;
        }
        var customFact = [];
        if( eventData ) {
            if( eventData.commandId ) {
                if( eventData.commandId === 'Rv1ExpandAll1Level' ) {
                    _.each( ctx.graph.graphModel.nodeMap, function( node ) {
                        if( node.appData && node.appData.id ) {
                            seedIDs.push( node.appData.id );
                        }
                    } );

                    expandDirection = graphConstants.ExpandDirection.ALL;
                } else if( eventData.commandId === 'Rv1ExpandSelected1Level' ) {
                    _.each( ctx.graph.graphModel.nodeMap, function( node ) {
                        if( node.appData && node.appData.id && node.isSelected() ) {
                            seedIDs.push( node.appData.id );
                        }
                    } );

                    expandDirection = graphConstants.ExpandDirection.ALL;
                } else if( _.startsWith( eventData.commandId, 'Rv1OneStepShowIncoming' ) ||
                    _.startsWith( eventData.commandId, 'Rv1OneStepShowOutgoing' ) ) {
                    expandLevel = Rv1RelationBrowserService.getMultiLevelExpandLevel( eventData );
                    expandDirection = Rv1RelationBrowserService.getMultiLevelExpandDirection( eventData );

                    _.each( ctx.graph.graphModel.nodeMap, function( node ) {
                        if( node.appData && node.appData.id && node.isSelected() ) {
                            seedIDs.push( node.appData.id );
                        }
                    } );
                }
            } else {
                if( eventData.customFact ) {
                    customFact = eventData.customFact;
                }
                if( eventData.rootIDs ) {
                    seedIDs = eventData.rootIDs;
                }

                if( eventData.expandDirection ) {
                    expandDirection = eventData.expandDirection;
                }

                if( eventData.level ) {
                    expandLevel = eventData.level;
                }
            }
        }

        var legendState = ctx.graph.legendState;
        if( legendState && legendState.activeView ) {
            // get active view name from legend state
            var viewName = legendState.activeView.internalName;

            // Remove duplicate entries.
            seedIDs = _.uniq( seedIDs );

            // cache the seedIDs and expandDirection
            data.seedIDs = seedIDs;
            data.expandDirection = expandDirection;

            var graphParamMap = {
                direction: [ data.expandDirection ],
                level: [ expandLevel ]
            };
            if( customFact && customFact.length > 0 ) {
                graphParamMap.customFact = customFact;
            }

            return {
                graphParamMap: graphParamMap,
                inquiries: [],
                queryMode: 'ExpandAndDegree',
                rootIds: data.seedIDs,
                serviceCursor: 0,
                viewName: viewName
            };
        }

        logger.error( 'Graph display issue: unable to find the Legend\'s active view name.' );
        notyService.showError( _missingActiveViewMsg );
    } catch ( ex ) {
        logger.error( ex );
    }
};

/**
 * Get policy for queryNetwork SOA.
 *
 * @param ctx the application context object
 * @param filterList the preference filter list
 *
 * @return the queryNetwork SOA policy
 */
export let getQueryNetworkPolicy = function( ctx, filterList ) {
    var policy = [];

    if( !ctx || !filterList ) {
        return policy;
    }

    try {
        var filterMap = legendSvc.getFilterMap( ctx, filterList );

        for( var typeName in filterMap ) {
            if( filterMap.hasOwnProperty( typeName ) ) {
                var policyType = {
                    name: typeName,
                    properties: []
                };

                _.forEach( filterMap[ typeName ], function( propertyName ) {
                    var property = { name: propertyName };
                    policyType.properties.push( property );
                } );

                policy.push( policyType );
            }
        }
        policy.push( {
            name: 'WorkspaceObject',
            properties: [ { name: 'object_desc' } ]
        } );
    } catch ( ex ) {
        logger.error( ex );

        policy = [ {
            name: 'WorkspaceObject',
            properties: [
                { name: 'object_type' },
                { name: 'owning_user' },
                { name: 'owning_group' },
                { name: 'release_status_list' },
                { name: 'date_released' },
                { name: 'last_mod_user' },
                { name: 'last_mod_date' }
            ]
        } ];
    }

    return policy;
};

/**
 * Initialization
 */
const loadConfiguration = () => {
    localeSvc.getTextPromise( 'RelationBrowserMessages', true ).then(
        function( localTextBundle ) {
            _missingActiveViewMsg = localTextBundle.missingActiveView;
        } );
};

loadConfiguration();

/**
 * Caw0AnalysisService factory
 */

export default exports = {
    startGraphEdit,
    saveGraphEdit,
    getGraphPropertyInput,
    cancleGraphEdit,
    onNodeEditCommitted,
    getQueryNetworkInput,
    getQueryNetworkPolicy,
    getQueryNetworkInputForRelations
};
app.factory( 'Caw0AnalysisService', () => exports );
