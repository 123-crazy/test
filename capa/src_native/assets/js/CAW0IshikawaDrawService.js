// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/CAW0IshikawaDrawService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import layoutSvc from 'js/graphLayoutService';
import node from 'js/Caw0AnalysisDrawNode';
import CAW0EditTreeStructure from 'js/CAW0EditTreeStructure';
import _ from 'lodash';
import performanceUtils from 'js/performanceUtils';
import graphConstants from 'js/graphConstants';

import 'js/Rv1RelationBrowserDrawEdge';
import 'soa/kernel/clientDataModel';

import templateService from 'js/Caw0AnalysisTemplateService';
import graphModelService from 'js/graphModelService';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * Hook to event awGraph.itemsAdded
 *
 * when app detects node addition event, should update the Model Object to Node mapping table.
 */

export let handleItemsAddedToGraph = function( graphModel ) {
    _.defer( function() {
        graphModel.graphControl.fitGraph();
    } );
};

export let setAddedNode = function( ctx, addElementResponse ) {
    var newElements = addElementResponse.ServiceData.created.map( function( uid ) {
        return addElementResponse.ServiceData.modelObjects[ uid ];
    } );
    ctx.newlyAddedElement = newElements;
};

var postApplyGraphLayout = function( graphModel, newAddedNodes, newAddedEdges, isInitial, performanceTimer ) {
    if( isInitial ) {
        _.defer( function() {
            appCtxService.unRegisterCtx( 'doRefresh' );
            graphModel.graphControl.fitGraph();
        } );
    }

    // apply graph filters and notify item added event
    graphModel.graphControl.graph.updateOnItemsAdded( newAddedNodes.concat( newAddedEdges ) );

    performanceTimer.endAndLogTimer( 'Graph Draw Data', 'drawGraph' );
};

export let applyGraphLayout = function( graphModel, newAddedNodes, edges, isInitial, performanceTimer ) {
    graphModel.graphControl.disableCommand( 'MoveCommand' );
    graphModel.graphControl.disableCommand( 'ResizeCommand' );
    graphModel.graphControl.disableCommand( 'PasteCommand' );
    var deferred = AwPromiseService.instance.defer();

    //switch layout on legend view change
    var graphControl = graphModel.graphControl;
    var layoutConfig = graphModel.config.layout;
    var layoutMode = layoutConfig.layoutMode;
    layoutMode = graphConstants.DFLayoutTypes.IshikawaLayout;

    if( isInitial ) {
        var asynLoader = layoutSvc.createLayout( graphControl, layoutMode, layoutConfig.config ).then( function() {
            layoutSvc.setLayoutOption( graphControl.layout, layoutConfig.defaultOption );
            deferred.resolve();
        } );
        asynLoader.then( function() {
            updateIshikawaLayout( graphModel, isInitial );
            // To fit the graph
            _.defer( function() {
                graphModel.graphControl.fitGraph();
            } );
        } );
    } else {
        updateIshikawaGraph( graphModel );
    }

    postApplyGraphLayout( graphModel, newAddedNodes, edges.addedEdges, isInitial, performanceTimer );
};

export let performDeleteFromIshikawaGraph = function( ctx ) {
    var graphModel = ctx.graph.graphModel;
    if( !graphModel ) {
        return;
    }

    var nodes = graphModel.graphControl.getSelected( 'Node' );
    var layout = graphModel.graphControl.layout;
    layout.removeNodes( nodes );
    layout.applyLayout();
    _.defer( function() {
        graphModel.graphControl.fitGraph();
    } );
    //Update Primary Area after sucessfully deleted cause and graph updated
    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' && ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Methodology' ) {
        CAW0EditTreeStructure.updateTreeTableOnDelete( ctx );
    } else {
        ctx.selected = cdm.getObject( ctx.pselected.uid );
        ctx.mselected[ 0 ] = cdm.getObject( ctx.pselected.uid );
    }
};

var updateIshikawaGraph = function( graphModel ) {
    var layout = graphModel.graphControl.layout;
    var graph = graphModel.graphControl.graph;
    var addedElement = appCtxService.ctx.newlyAddedElement;
    var subcauseStyle = {
        dashStyle: 'solid',
        thickness: 2.0,
        color: '(0,0,0)',
        targetArrow: {
            arrowShape: 'TRIANGLE',
            arrowScale: 1.0,
            fillInterior: true
        }
    };
    var categoryEdgeStyle = {
        dashStyle: 'solid',
        thickness: 2.0,
        color: '(0,0,0)'
    };
    var nodes = graphModel.graphControl.graph.getNodes();
    if( addedElement && addedElement[ 0 ].modelType.typeHierarchyArray.indexOf('CAW0Ishikawa') === -1 ) {
        var newNodes = [];
        if( addedElement ) {
            newNodes = graphModel.graphControl.graph.getNodes().filter( function( node ) {
                return node.appData.id === addedElement[ 0 ].uid;
            } );
        }
        var selectedCat = appCtxService.ctx.updateSelectionForCause ? appCtxService.ctx.updateSelectionForCause : appCtxService.ctx.selectedCategory;
        var selectedCategory = graphModel.graphControl.graph.getNodes().filter( function( node ) {
            return node.appData.nodeObject.id === selectedCat;
        } );
        if( newNodes.length > 0 ) {
            layout.addCauses( selectedCategory[ 0 ], newNodes, [ graph.createIshikawaEdgeStyle( subcauseStyle ) ] );
        }
    } else {
        var groupNodes = _.filter( nodes, function( node ) {
            return node.appData.nodeObject.nodeTemplateType === 'IshikawaGroup';
        } );
        var updatedICG = appCtxService.ctx.ishikawaCauseGroups;
        var removedCategory = groupNodes.filter( e => !updatedICG.includes( e.appData.id ) );
        if( removedCategory.length > 0 ) {
            layout.removeNodes( removedCategory );
            //Remove node from nodeMap
            for( var i = 0; i < removedCategory.length; i++ ) {
                delete graphModel.nodeMap[ removedCategory[ i ].appData.id ];
            }
        }
        groupNodes = groupNodes.filter( e => updatedICG.includes( e.appData.id ) );
        for( var i = 0; i < groupNodes.length; i++ ) {
            for( var j = 0; j < updatedICG.length; j++ ) {
                groupNodes[ i ].appData.id === updatedICG[ j ];
            }
        }

        var categoryStyleArr = [];
        _.forEach( groupNodes, function() {
            categoryStyleArr.push( graph.createIshikawaEdgeStyle( categoryEdgeStyle ) );
        } );
        layout.addCategories( groupNodes, categoryStyleArr );

        //Resequence Categories as per the new sequence;
        var reOrderedCategories = [];
        updatedICG.forEach( function( key ) {
            var found = false;
            layout._ishikawaDataModel.rootNode.categories = layout._ishikawaDataModel.rootNode.categories.filter( function( category ) {
                if( !found && category.node.appData.id === key ) {
                    reOrderedCategories.push( category );
                    found = true;
                    return false;
                }
                return true;
            } );
        } );
        layout._ishikawaDataModel.rootNode.categories = reOrderedCategories;
    }

    appCtxService.unRegisterCtx( 'newlyAddedElement' );
    appCtxService.unRegisterCtx( 'updateSelectionForCause' );

    layout.applyLayout();
};

var updateIshikawaLayout = function( graphModel ) {
    // Find the root node
    var layout = graphModel.graphControl.layout;
    var nodes = graphModel.graphControl.graph.getNodes();
    if( nodes.length > 0 ) {
        var rootNode = _.find( nodes, function( node ) {
            return node.appData.nodeObject.nodeTemplateType === 'IshikawaRoot';
        } );
        var spineEdgeStyle = {
            dashStyle: 'solid',
            thickness: 3.0,
            color: '(0,0,0)',
            targetArrow: {
                arrowShape: 'TRIANGLE',
                arrowScale: 2.0,
                fillInterior: true
            }
        };

        var graph = graphModel.graphControl.graph;

        if( !layout.isActive() ) {
            layout.initIshikawaLayout( rootNode, null, graph.createIshikawaEdgeStyle( spineEdgeStyle ) );
        }

        // Set edge routing type : straight line
        graphModel.graphControl.setAutoRoutingType( graphConstants.AutoRoutingtype.STRAIGHT_LINE );

        var categoryEdgeStyle = {
            dashStyle: 'solid',
            thickness: 2.0,
            color: '(0,0,0)'
        };

        var subcauseStyle = {
            dashStyle: 'solid',
            thickness: 2.0,
            color: '(0,0,0)',
            targetArrow: {
                arrowShape: 'TRIANGLE',
                arrowScale: 1.0,
                fillInterior: true
            }
        };

        var groupNodes = _.filter( nodes, function( node ) {
            return node.appData.nodeObject.nodeTemplateType === 'IshikawaGroup';
        } );

        var childNodes = _.filter( nodes, function( node ) {
            return node.appData.nodeObject.nodeTemplateType === 'IshikawaChild';
        } );

        var groupMap = _.groupBy( childNodes, function( childNode ) {
            return childNode.appData.nodeObject.parentId;
        } );

        var categoryStyleArr = [];
        _.forEach( groupNodes, function() {
            categoryStyleArr.push( graph.createIshikawaEdgeStyle( categoryEdgeStyle ) );
        } );

        layout.addCategories( groupNodes, categoryStyleArr );

        if( groupNodes.length > 0 ) {
            for( var i = 0; i < groupNodes.length; i++ ) {
                var childArr = groupMap[ groupNodes[ i ].appData.nodeObject.id ];
                if( childArr && childArr.length > 0 ) {
                    // In DF, as the arrow is an occurrence of symbol and not be shared between edges
                    // Each edge should have its arrow style
                    var subcauseStyleArr = [];
                    _.forEach( childArr, function() {
                        subcauseStyleArr.push( graph.createIshikawaEdgeStyle( subcauseStyle ) );
                    } );
                    layout.addCauses( groupNodes[ i ], childArr, subcauseStyleArr );
                }
            }
        }

        layout.applyLayout();
    }
};

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _processGraphData( graphData ) {
    var ishikawaGraphData = [];
    var deferred = AwPromiseService.instance.defer();
    // Adding Root Node as first element in Graph
    graphData.nodes[ 0 ].metaObject.isRoot = true;
    graphData.nodes[ 0 ].metaObject.nodeTemplateType = 'IshikawaRoot';
    ishikawaGraphData.push( graphData.nodes[ 0 ] );
    appCtxService.ctx.ishikawaCauseGroups = graphData.nodes[ 0 ].metaObject.props.caw0IshikawaCauseGroup.dbValues;
    //Adding CausesGroup as node in graph data
    graphData.nodes[ 0 ].metaObject.props.caw0IshikawaCauseGroup.dbValues.forEach( causeGroup => {
        var node = {
            id: causeGroup,
            metaObject: {
                props: {
                    object_name: {
                        uiValues: [ causeGroup ]
                    }
                },
                id: causeGroup,
                name: causeGroup,
                type: 'CauseGroup',
                parentId: graphData.nodes[ 0 ].id,
                nodeTemplateType: 'IshikawaGroup'
            },
            props: {
                Group: 'Defect',
                StyleTag: 'WorkspaceStyle',
                in_degree: '0',
                in_degree_string: '',
                out_degree: '0',
                out_degree_string: 'RelatedMs:Defect|RelatedMs:Defect'
            }
        };
        ishikawaGraphData.push( node );
    } );

    //Adding causes in graph data
    for( var index = 1; index < graphData.nodes.length; index++ ) {
        if( graphData.nodes[ index ].metaObject.modelType.typeHierarchyArray.indexOf('CAW0Defect') > -1 && graphData.nodes[ index ].metaObject.props.caw0Context.dbValues[0] === 'Ishikawa' && graphData.nodes[ index ].metaObject.props.caw0CauseGroup ) {
            graphData.nodes[ index ].metaObject.nodeTemplateType = 'IshikawaChild';
            graphData.nodes[ index ].metaObject.parentId = graphData.nodes[ index ].metaObject.props.caw0CauseGroup.dbValues[ 0 ];
            ishikawaGraphData.push( graphData.nodes[ index ] );
        }
    }

    deferred.resolve( ishikawaGraphData );
    return deferred.promise;
}

export let drawGraph = function( ctx ) {
    var performanceTimer = performanceUtils.createTimer();

    var graphModel = ctx.graph.graphModel;
    var graphData = ctx.graph.graphModel.graphData;

    _processGraphData( graphData ).then( function( ishikawaGraphData ) {
        graphData.nodes = ishikawaGraphData;
        var isInitial = false;
        if( !graphModel.nodeMap || ctx.doRefresh ) {
            graphModel.nodeMap = {};
            isInitial = true;
        }

        var activeLegendView = null;
        if( ctx.graph.legendState ) {
            activeLegendView = ctx.graph.legendState.activeView;
        }

        var graphControl = graphModel.graphControl;
        var graph = graphControl.graph;

        var addedNodes = [];
        var edges = [];

        // process the nodes and edges
        addedNodes = node.processNodeData( graphModel, graphData, activeLegendView );
        //edges = _edge.processEdgeData( graphModel, ishikawaGraphData, activeLegendView, bIsConcentrated );

        if( graphModel.isShowLabel === false ) {
            graph.showLabels( graphModel.isShowLabel );
        }

        // This function is potentially asynchronous, anything you wish to execute after this function
        // should go in postApplyGraphLayout().
        exports.applyGraphLayout( graphModel, addedNodes, edges, isInitial, performanceTimer );
    } );
};

/**
 * CAW0IshikawaDrawService factory
 */

export default exports = {
    handleItemsAddedToGraph,
    applyGraphLayout,
    drawGraph,
    setAddedNode,
    performDeleteFromIshikawaGraph
};
app.factory( 'CAW0IshikawaDrawService', () => exports );
