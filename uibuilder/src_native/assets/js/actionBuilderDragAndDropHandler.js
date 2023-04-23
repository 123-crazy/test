// Copyright (c) 2020 Siemens

/**
 * This implements the graph edit handler interface APIs defined by aw-graph widget to provide graph authoring
 * functionalities for Architecture tab
 *
 * @module js/actionBuilderDragAndDropHandler
 */
import app from 'app';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import aBuilderGraphEditHdlr from 'js/actionBuilderGraphEditHandler';
import nodeDefSvc from 'js/nodeDefinitionService';
import AwStateService from 'js/awStateService';
import graphLegendService from 'js/graphLegendService';
import saveActionFlowSvc from 'js/saveActionFlowService';
import validateFlowSvc from 'js/validateFlowService';
import actionBuilderUtils from 'js/actionBuilderUtils';
import eventBus from 'js/eventBus';
import notySvc from 'js/NotyModule';
import localeSvc from 'js/localeService';

var exports = {};

/**
 * Setup to map labels to local names.
 */
let localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.duplicateAction', true ).then( result => localeMap.duplicateAction = result );
};


// Why does this exist?
export let onGraphDragOver = function( graphModel, draggingItems, hoveredEdge, inputAction, outItems, cursorLocation ) {
    return true;
};

export let onGraphDrop = function( graphModel, [ dragItemId ], hoveredEdge, inputAction, outItems, cursorLocation ) {
    let graph = graphModel.graphControl.graph;
    if( dragItemId ) {
        // Dragging an existing action already in the graph?
        if( graphModel.dataModel.nodeModels[ dragItemId ] && dragItemId === graphModel.dataModel.nodeModels[ dragItemId ].id ) {
            let localizedErrorMsg = localeMap.duplicateAction;
            localizedErrorMsg = localizedErrorMsg.replace( '{0}', dragItemId );
            notySvc.showError( localizedErrorMsg );
            return;
        }

        let tempNodeModel = {
            category: dragItemId,
            nodeObject: {
                isRoot: false
            }
        };
        let nodeSize = actionBuilderUtils.getNodeSize( graphModel, tempNodeModel );
        nodeDefSvc.getNodeDefinition().then( function( nodeDefs ) {
            let nodeDef = nodeDefs.objectActivities[ dragItemId ];
            if( !nodeDef ) {
                nodeDef = nodeDefs.operators[ dragItemId ];
            }

            if( !nodeDef ) {
                // So this is an action
                let eventData = {
                    uid: dragItemId
                };

                eventBus.publish( 'awGraph.graphActionItemAdded', eventData );
                return;
            }

            let creatingCategory = {
                categoryType: 'objects',
                count: 1,
                creationMode: 0,
                displayName: hoveredEdge ? hoveredEdge.model.edgeObject.category : nodeDef.title,
                internalName: hoveredEdge ? hoveredEdge.model.edgeObject.category : nodeDef.id,
                isAuthorable: true,
                isExpanded: false,
                isFiltered: false,
                isSelected: false,
                style: {
                    borderColor: 'rgb(130,202,237)',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    color: 'rgb(130,202,237)'
                },
                subCategories: []
            };
            let creatingSubCategory = {
                internalName: hoveredEdge ? hoveredEdge.model.edgeObject.category : nodeDef.id
            };

            appCtxSvc.ctx.graph.legendState = {};
            appCtxSvc.ctx.graph.legendState.activeView = {
                categoryTypes: [],
                displayName: 'General2',
                expand: true,
                filteredCategories: [],
                internalName: 'General2',
                showEnabled: true,
                showExpand: true
            };
            let nodeText = nodeDef.id;

            appCtxSvc.ctx.graph.legendState.creatingCategory = creatingCategory;
            appCtxSvc.ctx.graph.legendState.creatingSubCategory = creatingSubCategory;

            if( hoveredEdge && hoveredEdge.model.edgeObject ) {
                let targetNode2 = hoveredEdge.getTargetNode();
                let sourceNode2 = hoveredEdge.getSourceNode();

                // Check edge between sourceNode and dropInNode
                let isValid2 = validateFlowSvc.validateEdge( sourceNode2.model, { category: dragItemId }, nodeDefs );
                if( !isValid2 ) {
                    return;
                }

                // Check edge between dropInNode and targetNode
                isValid2 = validateFlowSvc.validateEdge( { category: nodeDef.id }, targetNode2.model, nodeDefs );
                if( !isValid2 ) {
                    return;
                }

                let srcData = sourceNode2.model;
                let messageTypes = _.pickBy( nodeDefs.objectActivities, function( value, key ) {
                    return validateFlowSvc.validMessageTypes( key );
                } );
                if( srcData.category === 'start' && _.has( messageTypes, dragItemId ) ) {
                    nodeDef.actionDef.actionType = dragItemId;
                }

                // set Graph to dirty state
                appCtxSvc.ctx.graph.isDirty = true;

                graphLegendService.updateCreationCategory( appCtxSvc.ctx.graph.graphModel, appCtxSvc.ctx.graph.legendState, creatingCategory, creatingSubCategory );
                if( hoveredEdge.model.edgeObject.props.startNodeId === 'startNode' ) {
                    let $state = AwStateService.instance;
                    nodeText = $state.params.s_uid;
                }

                aBuilderGraphEditHdlr.createDropInNode( graphModel, null, outItems,
                    nodeSize, nodeDef, nodeText ).then( function( dropNode ) {
                    let edgeStyle = _.clone( actionBuilderUtils.successStyle );
                    var layout = graphModel.graphControl.layout;

                    if( layout.isActive() ) {
                        layout.applyUpdate( function() {
                            // create edge model
                            var srcEdge = graph.createEdgeWithNodesStyleAndLocation( sourceNode2, 'RIGHT', dropNode, 'LEFT', edgeStyle );
                            var tgtEdge = graph.createEdgeWithNodesStyleAndLocation( dropNode, 'RIGHT', targetNode2, 'LEFT', edgeStyle );

                            // update edge to graph model
                            aBuilderGraphEditHdlr.createEdge( graphModel, tgtEdge );
                            aBuilderGraphEditHdlr.createEdge( graphModel, srcEdge );
                            graph.removeEdges( [ hoveredEdge ] );

                            var layout = graphModel.graphControl.layout;
                            layout.removeEdge( hoveredEdge );
                            layout.addNode( dropNode, true );
                            layout.addEdge( srcEdge );
                            layout.addEdge( tgtEdge );

                            actionBuilderUtils.relocateAllPorts( graphModel );
                        } );
                    }
                } );
            } else {
                // set Graph to dirty state
                appCtxSvc.ctx.graph.isDirty = true;

                graphLegendService.updateCreationCategory( appCtxSvc.ctx.graph.graphModel, appCtxSvc.ctx.graph.legendState, creatingCategory, creatingSubCategory );
                aBuilderGraphEditHdlr.createNode( graphModel, null, outItems, nodeSize, nodeDef );
            }
        } );
    }
};

loadConfiguration();

exports = {
    loadConfiguration,
    onGraphDragOver,
    onGraphDrop
};

export default exports;

app.factory( 'actionBuilderDragAndDropHandler', () => exports );
