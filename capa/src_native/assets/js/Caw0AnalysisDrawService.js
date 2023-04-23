// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Caw0AnalysisDrawService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import layoutSvc from 'js/graphLayoutService';
import nodeService from 'js/Caw0AnalysisDrawNode';
import CAW0EditTreeStructure from 'js/CAW0EditTreeStructure';
import _ from 'lodash';
import performanceUtils from 'js/performanceUtils';
import graphConstants from 'js/graphConstants';

import soaSvc from 'soa/kernel/soaService';

import 'js/Rv1RelationBrowserDrawEdge';
import 'soa/kernel/clientDataModel';
import rbUtils from 'js/Rv1RelationBrowserUtils';
import graphStyleUtils from 'js/graphStyleUtils';
import awIconSvc from 'js/awIconService';

import templateService from 'js/Caw0AnalysisTemplateService';
import eventBus from 'js/eventBus';
import graphModelService from 'js/graphModelService';
import cdm from 'soa/kernel/clientDataModel';
import graphDiagramSVGUtiSvc from 'js/CAW0GraphDiagramSVGUtilService';

import msgService from 'js/messagingService';
import _localeSvc from 'js/localeService';

var exports = {};

var resource = app.getBaseUrlPath() + '/i18n/CAW0CapaMessages';
var localTextBundle = _localeSvc.getLoadedText( resource );

var stairCaseLayout = function( graphModel, ctx, newAddedNodes, action ) {
    // If there is no layout or the current layout doesn't match what we want, we set a new one.
    var layoutPromise = AwPromiseService.instance.resolve();
    if( !graphModel.graphControl.layout || graphModel.graphControl.layout.type !== graphConstants.DFLayoutTypes.IncUpdateLayout ) {
        layoutPromise = layoutSvc.createLayout( graphModel.graphControl, graphConstants.DFLayoutTypes.IncUpdateLayout );
    }
    layoutPromise.then( function() {
        // To rearrange the nodes in stair view
        graphModel.graphControl.graph.update( function() {
            var allNodes = graphModel.graphControl.graph.getNodes();

            // allNodes = _.reverse(allNodes);
            var offsetX = 10;
            var offsetY = 10;

            //Resquence Nodes as per Why-sequence
            if( ctx.allNodes && ctx.allNodes.length > 0 ) {
                allNodes = ctx.allNodes.filter( val => allNodes.find( elm => elm === val ) );
            }

            if( ctx.allNodes && ctx.allNodes.length > 0 && ctx.rootObject[ 0 ].metaObject.type === 'CAW05Why' && newAddedNodes.length > 0 ) {
                _.forEach( newAddedNodes, function( addedNode, idx1 ) {
                    allNodes.push( addedNode );
                } );
            }

            if( ctx.rootObject[ 0 ].metaObject.type === 'CAW0Defect' && action !== 'deleting' ) {
                //Removing added nodes
                _.forEach( newAddedNodes, function( addedNode, idx1 ) {
                    _.forEach( allNodes, function( node, idx2 ) {
                        if( node && addedNode.appData.id === node.appData.id ) {
                            allNodes.splice( idx2, 1 );
                            allNodes.join();
                        }
                    } );
                } );

                //Adding new nodes to parent
                _.forEach( newAddedNodes, function( addedNode, idx1 ) {
                    var count = 1;

                    var addedNodeIndexValues = addedNode.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' );
                    var lastObjectSequence = allNodes[ allNodes.length - 1 ].appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' );
                    var addAtLast = false;
                    var increamentIndex = allNodes.length;
                    var flag = true;

                    for( var index = 0; index < lastObjectSequence.length; index++ ) {

                        if( flag && ( JSON.parse( addedNodeIndexValues[ index ] ) > JSON.parse( lastObjectSequence[ index ] ) || ( JSON.parse( addedNodeIndexValues[ index ] ) ===
                                JSON.parse( lastObjectSequence[ index ] ) && addedNodeIndexValues.length > lastObjectSequence.length ) ) ) {
                            addAtLast = true;
                        } else {
                            flag = false;
                            addAtLast = false;
                        }
                    }

                    _.forEach( allNodes, function( node, idx2 ) {
                        if( !addAtLast && node.appData.nodeObject.props.caw0WhySequence && count === 1 ) {

                            var indexValues = ctx.rootObject[ 0 ].metaObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' );
                            var lastIndex = indexValues.length - 1;
                            var newIndex = ( parseInt( indexValues[ lastIndex ] ) + 1 ).toString();
                            indexValues.splice( lastIndex, 1, newIndex );
                            var whyIndex = indexValues.join( '.' );
                            var nextSequence = ctx.rootObject[ 0 ].metaObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 0 ] + '-' + whyIndex;

                            var nextSequenceNodes = allNodes.filter( elm => elm.appData.nodeObject.props.caw0WhySequence && elm.appData.nodeObject.props.caw0WhySequence
                                .dbValues[ 0 ] === nextSequence );
                            var isNextSequencePresent = nextSequenceNodes.length > 0;
                            var newNodeIndexValues = addedNode.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' );
                            newNodeIndexValues.pop();

                            var parentNodeIndex = ctx.rootObject[ 0 ].metaObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 0 ] + '-' + newNodeIndexValues.join(
                                '.' );

                            if( !isNextSequencePresent && node.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ] === parentNodeIndex ) {
                                var index = idx2 + idx1 + 1;
                                allNodes.splice( index, 0, addedNode );
                                allNodes.join();
                                count++;
                            }
                            if( isNextSequencePresent && node.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ] === nextSequence ) {
                                var index = idx2;
                                allNodes.splice( index, 0, addedNode );
                                allNodes.join();
                                count++;
                            }
                        } else {
                            if( addAtLast && count === 1 ) {
                                allNodes.splice( increamentIndex, 0, addedNode );
                                allNodes.join();
                                increamentIndex++;
                                count++;
                            }
                        }
                    } );
                } );
            }

            ctx.allNodes = allNodes;
            _.forEach( allNodes, function( node ) {
                //Update Node outDegree
                var outDegrees = [];
                _.forEach( ctx.edges, function( edge ) {
                    if( node.appData.id === edge.leftId ) {
                        var outDegree = [ edge.relationType, 'Defect' ];
                        outDegrees.push( outDegree );
                    }
                } );

                node.appData.outDegrees = node.appData.outDegrees.length < outDegrees.length ? outDegrees : node.appData.outDegrees;

                // Update the binding data
                nodeService.updateNodeBindingData( graphModel.graphControl.graph, node, { 'inDegrees': node.appData.inDegrees, 'outDegrees': node.appData.outDegrees } );
                node.setRenderingPosition( offsetX, offsetY );
                offsetX += node.getWidthValue() / 2;
                offsetY += node.getHeightValue() + 20;
            } );
        } );
    } );
};

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

export let applyGraphLayout = function( graphModel, newAddedNodes, edges, isInitial, performanceTimer, ctx ) {
    graphModel.graphControl.disableCommand( 'PasteCommand' );
    stairCaseLayout( graphModel, ctx, newAddedNodes );
    var graphData = graphModel.graphData;
    _.forEach( graphData.nodes, function( nodeData, index ) {
        //build node map to help create edges
        var node = newAddedNodes.filter( function( node ) {
            return node.appData.id === nodeData.id;
        } );
        var nodeModel = new graphModelService.NodeModel( nodeData.id, nodeData, nodeData.metaObject.type, nodeData.name );
        graphModel.addNodeModel( node, nodeModel );
    } );
    postApplyGraphLayout( graphModel, newAddedNodes, edges.addedEdges, isInitial, performanceTimer );
};

export let performDeleteFromGraph = function( ctx ) {
    var graphModel = ctx.graph.graphModel;
    //Update selected Object after deleting
    ctx.selected = ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Methodology' ? ctx.xrtSummaryContextObject : ctx.selected;
    if( !graphModel ) {
        return;
    }

    var nodes = graphModel.graphControl.getSelected( 'Node' );
    // var edges = graphModel.graphControl.getSelected( 'Edge' );
    // var ports = graphModel.graphControl.getSelected( 'Port' );
    graphModel.graphControl.graph.removeNodes( nodes, true );
    //remove node from nodes
    var index = graphModel.graphData.nodes.findIndex( function( node ) {
        return node.id === nodes[ 0 ].appData.id;
    } );
    graphModel.graphData.nodes.splice( index, 1 );
    stairCaseLayout( graphModel, ctx, nodes, 'deleting' );
    return { deletedNodes: nodes };
};

export let updateGraphAfterDelete = function( graphModel, deletedNodes ) {
    var nodeObjectIDs = graphModel.graphData.nodes.filter( function( node ) {
        if( node.id !== deletedNodes[ 0 ].appData.id ) {
            return node.id;
        }
    } );
    var ctx = appCtxService.ctx;
    appCtxService.unRegisterCtx( 'doRefresh' );

    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Methodology' ) {
        CAW0EditTreeStructure.getUpdatedWhys( ctx.pselected ).then( function( updatedNodes ) {
            _updateGraphNodes( nodeObjectIDs, graphModel, updatedNodes );
        } );
        ctx.mselected[ 0 ] = cdm.getObject( ctx.pselected.uid );
    } else {
        CAW0EditTreeStructure.updateTreeTableOnDelete( ctx ).then( function( updatedNodes ) {
            _updateGraphNodes( nodeObjectIDs, graphModel, updatedNodes );
        } );
    }
};

/**  Function returns modelObjects
 * @param {object} object -
 * @param {object} relatedWhys -
 * @returns {relatedWhys}
 **/
function _updateGraphNodes( nodeObjectIDs, graphModel, updatedNodes ) {
    if( updatedNodes && updatedNodes.length > 0 ) {
        var graphControl = graphModel.graphControl;

        _.forEach( updatedNodes, function( updatedNode ) {
            var node = graphModel.nodeMap[ updatedNode.uid ];
            if( node ) {
                var nodeObject = cdm.getObject( node.appData.id );
                var props = templateService.getBindPropertyNames( nodeObject );
                var objectBindData = templateService.getBindProperties( nodeObject, false );
                _.forEach( props, function( prop ) {
                    var newBindData = {};
                    newBindData[ prop ] = objectBindData[ prop ];
                    graphControl.graph.updateNodeBinding( node, newBindData );
                } );
            }
            if( updatedNode.leafFlag === undefined || (updatedNode.leafFlag && updatedNode.leafFlag === true) ) {
                node.appData.outDegrees = [];
                // Update the binding data
                nodeService.updateNodeBindingData( graphControl.graph, node, { 'inDegrees': node.appData.inDegrees, 'outDegrees': node.appData.outDegrees } );
            }
        } );
    }
    graphModel.graphControl.fitGraph();
}

/**  Function is to update Graph Node once the selected object is updated from Info Panel
 * @param {object} ctx -
 * @param {object} data -
 **/
export let updateGraphThroughInfo = function( ctx, data ) {
    if( data.eventData.dataSource && data.eventData.dataSource.xrtType && data.eventData.dataSource.xrtType === 'INFO' ) {
        var graphModel = ctx.graph.graphModel;
        var graphControl = graphModel.graphControl;
        var nodeObjectID = data.eventData.dataSource.vmo;
        if( nodeObjectID ) {
            var node = graphModel.nodeMap[ nodeObjectID.uid ];
            if( node ) {
                var nodeObject = node.appData.nodeObject;
                var props = templateService.getBindPropertyNames( nodeObject );
                var objectBindData = templateService.getBindProperties( nodeObject, false );
                _.forEach( props, function( prop ) {
                    var newBindData = {};
                    newBindData[ prop ] = objectBindData[ prop ];
                    graphControl.graph.updateNodeBinding( node, newBindData );
                } );

                //Execute this part when updating Ishikawa graph with cause
                if( ctx.mselected[ 0 ].modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 && ctx.mselected[ 0 ].props.caw0Context.dbValues[ 0 ] === 'Ishikawa' && ctx.updateSelectionForCause !==
                    undefined && ctx.updateSelectionForCause !== ctx.mselected[ 0 ].parentId ) {
                    var layout = graphModel.graphControl.layout;
                    layout.removeNodes( [ node ] );
                    delete graphModel.nodeMap[ ctx.mselected[ 0 ].uid ];
                    var context = {
                        addElementResponse: {
                            ServiceData: {
                                created: [ ctx.mselected[ 0 ].uid ],
                                modelObjects: {
                                    [ ctx.mselected[ 0 ].uid ]: ctx.mselected[ 0 ]
                                }
                            }

                        }
                    };
                    ctx.updateCategoryFromInfo = true;
                    eventBus.publish( 'Caw0IshikawaMethodology.activeViewUpdated', context );
                }
            }
        }
    } else {
        return;
    }
};

export let drawGraph = function( ctx ) {
    var performanceTimer = performanceUtils.createTimer();

    var graphModel = ctx.graph.graphModel;
    var rawGraphData = ctx.graph.graphModel.graphData;

    //Filtering data for removing 5Why
    var graphData = _filterGraphData( ctx, rawGraphData );

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
    addedNodes = nodeService.processNodeData( graphModel, graphData, activeLegendView );
    //edges = _edge.processEdgeData( graphModel, graphData, activeLegendView, bIsConcentrated );

    if( graphModel.isShowLabel === false ) {
        graph.showLabels( graphModel.isShowLabel );
    }

    // This function is potentially asynchronous, anything you wish to execute after this function
    // should go in postApplyGraphLayout().
    exports.applyGraphLayout( graphModel, addedNodes, edges, isInitial, performanceTimer, ctx );
};

/**  Function returns modelObjects
 * @param {object} object -
 * @returns {graphData}
 **/
function _filterGraphData( ctx, rawGraphData ) {

    var nextWhyId = rawGraphData.rootIds[ 0 ];
    var isParent5Why = true;
    var currentId;
    var nextSideWhy;
    var filteredNodes = [];
    ctx.rootObject = rawGraphData.nodes.filter( function( node ) {
        return node.id === rawGraphData.rootIds[ 0 ];
    } );

    ctx.edges = rawGraphData.edges;
    for( var index = 0; index < rawGraphData.nodes.length; index++ ) {
        var node = rawGraphData.nodes[ index ];
        var relation = node.id === rawGraphData.rootIds[ 0 ] && node.metaObject.type === 'CAW0Defect' ? 'SideWhy' : 'RelatedWhy';
        var relationType = node.id === rawGraphData.rootIds[ 0 ] ? relation : 'Why';
        if( node.id === nextWhyId ) {
            filteredNodes.push( node );
            for( var index2 = 0; index2 < rawGraphData.edges.length; index2++ ) {
                var edge = rawGraphData.edges[ index2 ];
                if( edge.leftId === nextWhyId && edge.relationType === relationType ) {
                    nextWhyId = edge.rightId;
                    break;
                }
            }
        }
    }
    rawGraphData.nodes = filteredNodes;
    return rawGraphData;
}

export let printGraph = function( graphModel ) {
    graphModel.graphControl.printGraph();
};

/**
 * Display confirmation message
 * @param {String} message the message text
 * @param {String} confirmButtonName the text to display for the confirm button
 * @param {String} cancelButtonName the text to display for the cancel button
 * @returns {Promise} promise
 */
export function displayConfirmationMessage( ctx, selectedObject ) {
    var deferred = AwPromiseService.instance.defer();
    var buttonArray = [];
    buttonArray.push( createButton( localTextBundle.caw0Cancel, function( $noty ) {
        $noty.close();
        deferred.reject();
        deferred = null;
    } ) );

    buttonArray.push( createButton( localTextBundle.caw0replace, function( $noty ) {
        saveGraph( ctx, ctx.graph.graphModel );
        $noty.close();
        deferred.resolve();
        deferred = null;
    } ) );

    var confirmationMessage = localTextBundle.confirmGraphSave.format( selectedObject, ctx.displayRelation );
    msgService.showWarning( confirmationMessage, buttonArray );
    return deferred.promise;
}

/**
 * Create button for use in notification messages
 *
 * @param {String} label label
 * @param {Function} callback callback
 * @return {Object} button
 */
export function createButton( label, callback ) {
    return {
        addClass: 'btn btn-notify',
        text: label,
        onClick: callback
    };
}

export let confirmSave = function( ctx ) {
    var selectedObject = ctx.xrtSummaryContextObject;
    var objectRelation;
    var displayRelation;
    if( selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ) {
        objectRelation = 'CAW0DefectAttachment';
        displayRelation = 'Defect Attachment';
    } else if( selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ) {
        objectRelation = 'CAW05WhyAttachment';
        displayRelation = '5Why Attachment';
    } else if( selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 ) {
        objectRelation = 'CAW0IshikawaAttachment';
        displayRelation = 'Ishikawa Attachment';
    }
    //adding relation name to ctx for displaying in success message.
    ctx.displayRelation = displayRelation;

    soaSvc.post( 'Core-2007-09-DataManagement', 'expandGRMRelationsForPrimary', {
        primaryObjects: [ ctx.xrtSummaryContextObject ],
        pref: {
            expItemRev: false,
            returnRelations: true,
            info: [ {
                relationTypeName: objectRelation,
                otherSideObjectTypes: [ 'Image' ]
            } ]
        }
    } ).then( function( response ) {
        var secondaryObjects = response.output[ 0 ].relationshipData[ 0 ].relationshipObjects;
        if( secondaryObjects.length > 0 ) {
            var flag = true;
            secondaryObjects.forEach( object => {
                if( flag && object.otherSideObject.props.object_name.dbValues[ 0 ] === ctx.xrtSummaryContextObject.props.object_name.dbValues[ 0 ] ) {
                    displayConfirmationMessage( ctx, ctx.xrtSummaryContextObject.props.object_name.dbValues[ 0 ] );
                    flag = false;
                }
            } );
            if( flag ) {
                saveGraph( ctx, ctx.graph.graphModel );
            }
        } else {
            saveGraph( ctx, ctx.graph.graphModel );
        }
    } );
};

/** -------------------------------------------------------------------
 * Use the printGraph functionality of the graphControl to open a static
 * rendering of the graph in a separate tab for printing from the browser.
 *
 * @param {Object} graphModel - The graph currently in view.
 */

export let saveGraph = function( ctx, graphModel ) {
    if( graphModel && graphModel.graphControl ) {
        var graphControl = graphModel.graphControl;
        // graphControl._diagramView.setCurrentZoomRatio( 1 );
        var diagramExportControl = graphControl.createExportControl();
        diagramExportControl.topLeftOrigin = true;
        diagramExportControl.allSheetElements = true;

        var sheetBounds = graphControl.getSheetBounds();

        var width = Number( sheetBounds.width );
        var height = Number( sheetBounds.height );

        diagramExportControl.graphSize = [ width, height ];
        diagramExportControl.fireDiagramExportingEvent = true;
        var imagesPath = [];

        var svgString = graphControl.exportGraphAsString( diagramExportControl, diagramExportingEvtHandler );

        if( !_.isEmpty( svgString ) ) {
            var parser = new DOMParser();
            var svgRoot = parser.parseFromString( svgString, 'text/html' );
            if( svgRoot ) {
                imagesPath = graphDiagramSVGUtiSvc.getImagesIconElement( svgRoot );

                graphDiagramSVGUtiSvc.getImageSvgContent( imagesPath ).then( function( data ) {
                    try {
                        processClipPathTag( svgRoot, ctx );
                        var imgPreviewSvgStr = graphDiagramSVGUtiSvc.processUseTag( svgRoot, data );
                        imgPreviewSvgStr = imgPreviewSvgStr.replace( /&nbsp;/g, '&#160;' );
                    } catch ( ex ) {
                        //logger.error( 'Error:' + ex.message );
                    } finally {
                        if( imgPreviewSvgStr && !_.isEmpty( imgPreviewSvgStr ) ) {
                            // console.clear();
                            var svgStr = imgPreviewSvgStr.replace( /(\r\n|\n|\r)/gm, '' );
                            // console.log( svgStr );
                            // console.log( height + ' ' + width );
                            var saveDiagramPreviewInfo = {
                                contextObject: { uid: ctx.xrtSummaryContextObject.uid, type: ctx.xrtSummaryContextObject.type },
                                svgString: svgStr,
                                width: String( width ),
                                height: String( height )
                            };
                            soaSvc.post( 'Internal-Capaonawc-2020-12-QualityIssueManagement', 'createPngDatasetFromSvgDiagram', {
                                createPngDatasetInput: saveDiagramPreviewInfo
                            } ).then( function( response ) {
                                    var msg = localTextBundle.CAW0successGraphSave;
                                    msg = msg.replace( '{0}', ctx.xrtSummaryContextObject.props.object_name.dbValues[ 0 ] );
                                    msg = msg.replace( '{1}', ctx.displayRelation );
                                    appCtxService.unRegisterCtx( 'displayRelation' );
                                    msgService.showInfo( msg );

                                    var updatedNode = ctx.graph.graphModel.nodeMap[ ctx.graph.graphModel.rootId ];
                                    var updatedNodeObject = updatedNode.appData.nodeObject;
                                    var imageUrl = awIconSvc.getThumbnailFileUrl( updatedNodeObject );

                                    //show type icon instead if thumbnail doesn't exist
                                    if( !imageUrl ) {
                                        imageUrl = awIconSvc.getTypeIconFileUrl( updatedNodeObject );
                                    }

                                    ctx.graph.graphModel.graphControl.graph.updateNodeBinding( updatedNode, { thumbnail_image: graphStyleUtils.getSVGImageTag( imageUrl ) } );
                                },
                                function( error ) {
                                    var errMessage = msgService.getSOAErrorMessage( error );
                                    msgService.showError( errMessage );
                                } );
                        }
                    }
                } );
            }
        }
    }
};

//Update border stroke-width of the Node to draw node borders
export let processClipPathTag = function( svgRoot, ctx ) {
    var index = ctx.xrtSummaryContextObject.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 ? 2 : 10;
    var nodeBorderElements = svgRoot.getElementsByClassName( 'aw-graph-node-border' );
    _.forEach( nodeBorderElements, function( nodeBorderElement ) {
        nodeBorderElement.style[ 'stroke-width' ] = '3';
        // var rectTag = clipPath.getElementsByTagName( 'rect' )[ 0 ];
        // var height = rectTag.height.baseVal.value;
        // var width = rectTag.width.baseVal.value;
        // rectTag.setAttribute( 'height', String( height + index ) );
        // rectTag.setAttribute( 'width', String( width + index ) );
    } );
};

//Function that replaces the <use> with the actual SVG DOM that <use> is referencing
var diagramExportingEvtHandler = function( args ) {
    var svgRoot = args.getDomElement();
    //adding below logic to move the SDF_printDiv dom generated as part of raster comversion inside
    //main canvas so that the hierarchical is applied to it properly.

    var SDF_printDiv = document.getElementById( 'SDF_printDiv' );
    var graphContainer = document.querySelectorAll( "[data-sdf-id=\'SDF_canvasWrapper\']" ).item( 0 ).parentElement;
    graphContainer.append( SDF_printDiv );

    //#endregion
    var graphModel = appCtxService.ctx.graph.graphModel;
    if( !_.isEmpty( svgRoot.outerHTML ) ) {
        if( svgRoot ) {
            var boundaries = null;
            if( graphModel && graphModel.graphControl ) {
                var graphControl = graphModel.graphControl;
                var graph = graphControl.graph;
                if( graph ) {
                    boundaries = graph.getVisibleBoundaries();
                    graphDiagramSVGUtiSvc.processBoundaries( svgRoot, boundaries );
                }
            }
            graphDiagramSVGUtiSvc.processStyleTags( svgRoot );
        }
    }
};

/**
 * Toggle outgoing edges visibility for the give node
 */
export let toggleOutgoingEdges = function( graphModel, legend, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var performance = performanceUtils.createTimer();

        var newNodeSequence = node.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ];
        var allNodes = appCtxService.ctx.allNodes;

        var nodesToRemove = [];

        var indexValues = node.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' );
        var lastIndex = indexValues.length - 1;
        var newIndex = ( parseInt( indexValues[ lastIndex ] ) + 1 ).toString();
        indexValues.splice( lastIndex, 1, newIndex );
        var whyIndex = indexValues.join( '.' );
        var nextSequence = node.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 0 ] + '-' + whyIndex;
        var toDelete = false;
        _.forEach( allNodes, function( grpNode ) {

            if( grpNode.appData.nodeObject.props.caw0WhySequence && grpNode.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ] === nextSequence ) {
                toDelete = false;
            }
            if( toDelete && ( grpNode.appData.nodeObject.props.caw0WhySequence && grpNode.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ].split( '-' )[ 1 ].split( '.' ).length >=
                    nextSequence.split( '-' )[ 1 ].split( '.' ).length ) ) {
                nodesToRemove.push( grpNode );
            }
            if( grpNode.appData.nodeObject.props.caw0WhySequence && grpNode.appData.nodeObject.props.caw0WhySequence.dbValues[ 0 ] === newNodeSequence ) {
                toDelete = true;
            }
        } );

        if( nodesToRemove.length > 0 ) {
            graphModel.graphControl.graph.removeNodes( nodesToRemove, true );
            //remove node from nodes

            _.forEach( nodesToRemove, function( childNode ) {
                var index = graphModel.graphData.nodes.findIndex( function( node ) {
                    return node.id === childNode.appData.id;
                } );
                graphModel.graphData.nodes.splice( index, 1 );
                delete graphModel.nodeMap[ childNode.appData.id ];
            } );
            appCtxService.ctx.graphToggledObject = {
                toggledObject : node.appData.nodeObject,
                toggleDirection : "Backward"
            };
            graphModel.nodeMap[node.appData.id].appData['isExpanded'] = false;
            stairCaseLayout( graphModel, appCtxService.ctx, nodesToRemove, 'deleting' );
            exports.handleItemsAddedToGraph(graphModel);

        } else {
            appCtxService.ctx.graphToggledObject = {
                toggledObject : node.appData.nodeObject,
                toggleDirection : "Forward"
            };
            graphModel.nodeMap[node.appData.id].appData['isExpanded'] = true;
            eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
                rootIDs: [ node.appData.nodeObject.uid ],
                expandDirection: graphConstants.ExpandDirection.FORWARD
            } );
        }

        performance.endAndLogTimer( 'Graph Expand/Collapse Down Relations', 'toggleOutgoingEdges' );
    }
};

/**
 * Caw0AnalysisDrawService factory
 */

export default exports = {
    handleItemsAddedToGraph,
    applyGraphLayout,
    performDeleteFromGraph,
    updateGraphAfterDelete,
    drawGraph,
    updateGraphThroughInfo,
    confirmSave,
    saveGraph,
    printGraph,
    toggleOutgoingEdges
};
app.factory( 'Caw0AnalysisDrawService', () => exports );
