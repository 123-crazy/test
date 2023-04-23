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
 * @module js/qfm0FmeaGraphUtil
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import selectionService from 'js/selection.service';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import localeService from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import soaService from 'soa/kernel/soaService';
import editHandlerService from 'js/editHandlerService';
import dataSourceService from 'js/dataSourceService';
import awIconSvc from 'js/awIconService';
import graphStyleUtils from 'js/graphStyleUtils';
import notyService from 'js/NotyModule';
import messagingService from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import templateService from 'js/qfm0FmeaGraphTemplateService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import qfm0FmeaGraphUtil2 from './qfm0FmeaGraphUtil2';

var exports = {};

var NODE_HOVERED_CLASS = 'relation_node_hovered_style_svg';
var TEXT_HOVERED_CLASS = 'relation_text_hovered_style_svg';
var NODE_DEFAULT_CLASS = 'aw-graph-noeditable-area';
var _ModelObjectToNodeMap = {};
var fmeaContext = 'FMEA_EDIT_CONTEXT';
var THUMBNAIL_URL = 'thumbnail_image';

var
    _previouslySelectedItems = []; // This is to support the selection algorithm in graphSelectionChanged() below.  It holds the items in the selected state the previous time graphSelectionChanged() was called.
var _originalValueOfHasPendingChanges = 0;
var _leavePageListener = null;
var _singleLeaveConfirmation = null;
var _saveTxt = null;
var _discardTxt = null;
/**
 * an array for all the leaveActivators
 */
var LEAVE_ACTIVATORS = [ 'leaveConfirmByHomeOrBack', 'leaveConfirmBySelectionChange' ];

/**
 * Binding the color bar width for node
 */
var COLOR_BAR_WIDTH = 'barWidth';

/**
 * Binding whether this is the root node.
 */
var IS_ROOT = 'is_root';

/**
 * Binding Class Name for root node border style
 */
var ROOTNODE_BORDER_STYLE = 'rootnode_border_style';

const CURRENT_CONTROL_ACTION_GROUP = 'CurrentControlActionGroup';
const CURRENT_OPTIMIZATION_ACTION_GROUP = 'OptimizationActionGroup';
const PROP_QAM0OCCURRENCE = 'qam0Occurrence';
const PROP_QAM0DETECTION = 'qam0Detection';
const PROP_QFM0_RPN = 'qfm0RPN';
const PROP_QFM0_ACTION_PRIORITY = 'qfm0ActionPriority';

/** -------------------------------------------------------------------
 * Handle the awGraph.selectionChanged event.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} eventData - data pertinent to the selectionChanged event.  @see setSelected() in graphControlFactory.js
 */
export let graphSelectionChanged = function( graphModel, eventData ) {
    try {
        var currentSelectedNodes = graphModel.graphControl.getSelected( 'Node' );
        var currentSelectedEdges = graphModel.graphControl.getSelected( 'Edge' );
        var selectedItems = _.concat( currentSelectedNodes, currentSelectedEdges );

        graphModel.numSelected = selectedItems ? selectedItems.length : 0;
        graphModel.selectedEdgesCount = currentSelectedEdges ? currentSelectedEdges.length : 0;
        if( graphModel.selectedEdgesCount === 1 ) {
            graphModel.singleSelectedEdge = currentSelectedEdges[ 0 ];
        } else {
            graphModel.singleSelectedEdge = null;
        }

        // Unset the hover style from all nodes and edges that are, or were, selected.  Otherwise, nodes that get
        // unselected could still have the hover style.
        setHoverStyles( graphModel, _.union( selectedItems, eventData.unSelected ), false );

        updateAWSelectionService( graphModel, selectedItems );

        // Handle edges: Highlighting their source and target nodes.
        // --
        // --!! The selected state returned by getSelected() appears to be accurate and includes all newly selected items and excludes
        // --!! all newly unselected items present in eventData.
        // Don't do any programmatic selection or unselection of edges - only src and target nodes.
        // 1) Based on edges currently selected, determine if there are any more nodes that should be highlighted, and highlight those.
        // 2) Based on edges newly unselected, determine if there are any more nodes that should not be highlighted.
        // Set the edge style (sets to hovered) for all selected edges.  Unset this style for all newly unselected edges.
        // The lists from 1) and 2) may contain more than needed.  E.g., don't remove nodes if they are also listed in the nodes-to-be-added.
        // + There is one special case.  After a single edge and its nodes are selected, clicking one of the already selected nodes should
        //   result in only that node being selected.  stillSelectedNodes below helps resolve this.  Otherwise, it might be necessary to
        //   have reference counting on nodes connected to multiple edges to know whether they should be turned off or on.

        var unSelectedItems = _.filter( eventData.unSelected, function( o ) {
            return typeof o.appData !== 'undefined';
        } );

        var newlyUnselectedItems = _.partition( unSelectedItems, function( o ) { return typeof o.appData.edgeObject !== 'undefined'; } );
        var newlyUnselectedEdges = newlyUnselectedItems[ 0 ];
        var newlyUnselectedNodes = newlyUnselectedItems[ 1 ];

        var addTheseNodes = [];
        if( currentSelectedEdges.length > 0 ) {
            for( var idx = 0; idx < currentSelectedEdges.length; idx++ ) {
                // drawEdgeService.setEdgeStyle( graphModel, currentSelectedEdges[ idx ], true ); // Just the edge style.  _Node_ selected-style is set via binding in the HTML
                addTheseNodes.push( currentSelectedEdges[ idx ].getSourceNode(), currentSelectedEdges[ idx ].getTargetNode() );
            }
            addTheseNodes = _.uniq( addTheseNodes );
        }
        var removeTheseNodes = [];
        if( newlyUnselectedEdges.length > 0 ) {
            for( var jdx = 0; jdx < newlyUnselectedEdges.length; jdx++ ) {
                // drawEdgeService.setEdgeStyle( graphModel, newlyUnselectedEdges[ jdx ], false ); // Just the edge style.  _Node_ selected-style is set via binding in the HTML
                removeTheseNodes.push( newlyUnselectedEdges[ jdx ].getSourceNode(), newlyUnselectedEdges[ jdx ].getTargetNode() );
            }
            removeTheseNodes = _.uniq( removeTheseNodes );
        }

        var stillSelectedNodes = _.intersection( _previouslySelectedItems, currentSelectedNodes );

        _.pullAll( removeTheseNodes, addTheseNodes ); // Pull out nodes that should still be selected because they have a selected edge still connecting them.
        _.pullAll( removeTheseNodes, newlyUnselectedNodes ); // Pull out nodes that are already unselected in the graph.
        if( stillSelectedNodes.length === 1 ) {
            _.pullAll( removeTheseNodes, stillSelectedNodes ); // See explanation above (+).
        }
        _.pullAll( addTheseNodes, currentSelectedNodes ); // Pull out nodes that are already selected in the graph.

        if( removeTheseNodes.length > 0 ) {
            setNodeHoverStyle( graphModel, removeTheseNodes, false );
        }
        if( addTheseNodes.length ) {
            setNodeHoverStyle( graphModel, addTheseNodes, true );
        }

        _previouslySelectedItems = selectedItems;
        eventBus.publish( 'closePanelInNetView' );
    } catch ( ex ) {
        logger.error( ex );
    }
};

/** -------------------------------------------------------------------
 * Update the AW selection service so it knows about the element(s) selected.
 * The AW selection service keeps the model object so it can be used elsewhere
 * to show data from the selected object, such as in the info panel.
 * Only a single element is supported at this time.  If nothing is
 * selected, the root node of the graph is used.
 *
 * @param {Object} graphModel - The graph model object
 * @param {Object} eventData - The list of nodes and edges currently selected in the graph
 */
function updateAWSelectionService( graphModel, selectedItems ) {
    var selectedNodes = [];
    _.forEach( selectedItems, function( selectedObject ) {
        if( selectedObject.getItemType() === 'Node' ) {
            if( !selectedNodes.includes( selectedObject.appData.nodeObject ) ) {
                selectedNodes.push( selectedObject.appData.nodeObject );
            }
        } else {
            var edgeObj = getEdgeModelObject( selectedObject );
            if( edgeObj !== null ) {
                if( !selectedNodes.includes( edgeObj ) ) {
                    selectedNodes.push( edgeObj );
                }
            }
        }
    } );
    // If there is selection but they are not nodes or edge objects then add rootId
    var parent = cdm.getObject( graphModel.rootId );
    if( selectedNodes.length <= 0 ) {
        selectedNodes.push( cdm.getObject( graphModel.rootId ) );
        parent = null;
    }
    selectionService.updateSelection( selectedNodes, parent );
}

/** -------------------------------------------------------------------
 * Return the model object for the given edge.  Note that not all edges have associated model objects.
 * @see processEdgeData() of Rv1RelationBrowserDrawEdge.js
 *
 * @param {Object} edge - The selected edge object.
 * @return {Object} The edge's model object (null if there is no associated model object).
 */
function getEdgeModelObject( edge ) {
    if( !edge.appData || !edge.appData.edgeObject ||
        edge.appData.edgeObject.objectID === '' || edge.appData.edgeObject.type === 'unknownType' ) {
        return null;
    }
    return edge.appData.edgeObject;
}

/** -------------------------------------------------------------------
 * Set the hover style for multiple nodes and edges.
 *
 * @param {Object} graphModel - The graph model object.
 * @param {Array<Object>} elements - The array of nodes and edges on which to set the style.
 * @param {boolean} isHovered - true if the element is being hovered over.
 */
function setHoverStyles( graphModel, elements, isHovered ) {
    if( !elements || elements.length === 0 ) {
        return;
    }
    var edges = elements.filter( function( elem ) { return elem && elem.getItemType() === 'Edge'; } );
    var nodes = elements.filter( function( elem ) { return elem && elem.getItemType() === 'Node'; } );
    for( var i = 0; i < edges.length; i++ ) {
        nodes.push( edges[ i ].getSourceNode() );
        nodes.push( edges[ i ].getTargetNode() );
        // drawEdgeService.setEdgeStyle( graphModel, edges[ i ], isHovered );
    }
    nodes = _.uniq( nodes );
    setNodeHoverStyle( graphModel, nodes, isHovered );
}

/** -------------------------------------------------------------------
 * Graph hover-changed handler
 * @param {Object} graphModel - the graph model object
 * @param {Object} eventData - contains the hovered and/or unhovered items from the graph
 */
export let graphHoverChanged = function( graphModel, eventData ) {
    try {
        if( !graphModel || !eventData ) {
            return;
        }
        var unHoveredItem = eventData.unHoveredItem;
        var hoveredItem = eventData.hoveredItem;

        if( unHoveredItem && !unHoveredItem.isSelected() ) {
            if( unHoveredItem.getItemType() === 'Edge' ) {
                setEdgeHoverStyle( graphModel, unHoveredItem, false );
            } else if( unHoveredItem.getItemType() === 'Node' &&
                !isNodeEdgeSelected( graphModel, unHoveredItem ) ) {
                // do not un-hover nodes of selected edges
                setNodeHoverStyle( graphModel, [ unHoveredItem ], false );
            }
        }
        if( hoveredItem && !hoveredItem.isSelected() ) {
            if( hoveredItem.getItemType() === 'Edge' ) {
                setEdgeHoverStyle( graphModel, hoveredItem, true );
            } else if( hoveredItem.getItemType() === 'Node' ) {
                setNodeHoverStyle( graphModel, [ hoveredItem ], true );
            }
        }
    } catch ( ex ) {
        logger.debug( ex );
    }
};

/** -------------------------------------------------------------------
 * Set the style of an edge and the associated nodes to hovered, or standard depending on parameter isHovered.
 * @param {Object} graphModel - The graph model object.
 * @param {Object} edge - The edge on which to set the style.
 * @param {String} isHovered - true if the edge is being hovered over.
 */
function setEdgeHoverStyle( graphModel, edge, isHovered ) {
    if( !edge.style ) {
        return;
    }

    // drawEdgeService.setEdgeStyle( graphModel, edge, isHovered );
    var nodes = [];
    if( isHovered ) {
        nodes.push( edge.getSourceNode() );
        nodes.push( edge.getTargetNode() );
    } else {
        // do not un-hover nodes if any of their edges is in (multi)selection
        if( !isNodeEdgeSelected( graphModel, edge.getSourceNode() ) ) {
            nodes.push( edge.getSourceNode() );
        }
        if( !isNodeEdgeSelected( graphModel, edge.getTargetNode() ) ) {
            nodes.push( edge.getTargetNode() );
        }
    }
    if( nodes.length ) {
        setNodeHoverStyle( graphModel, nodes, isHovered );
    }
}

/** -------------------------------------------------------------------
 * Checks if any of the edges for the node are selected
 *
 * @param {Object} graphModel - The graph model object.
 * @param {Object} node - The array of nodes and edges on which to set the style.
 * @return {boolean} true if any of the edge is selected
 */
function isNodeEdgeSelected( graphModel, node ) {
    var selectedElements = graphModel.graphControl.getSelected();
    for( var i = 0; selectedElements && i < selectedElements.length; ++i ) {
        if( selectedElements[ i ].getItemType() === 'Edge' &&
            ( selectedElements[ i ].getSourceNode() === node ||
                selectedElements[ i ].getTargetNode() === node ) ) {
            return true;
        }
    }
    return false;
}

/** -------------------------------------------------------------------
 * Set the hovered style of a node.
 *
 * @param {Object} graphModel - the graph model object
 * @param {Object} nodes - the graph nodes on which to apply a style
 * @param {String} isHovered - true if the node is being hovered over
 *
 * Applying a node style, as is done here, is a two step process.  First, update the relevant properties kept by
 * the node.  Then call updateNodeBinding to apply properties to the SVG/DOM.
 * Node (fill, stroke, etc.) and text styling will be specified in the single node-hovered styling class in graphModel.hoverStyle.node.
 */
function setNodeHoverStyle( graphModel, nodes, isHovered ) {
    for( var i = 0; i < nodes.length; i++ ) {
        var node = nodes[ i ];
        if( node ) {
            var bindingData = {};

            if( isHovered ) {
                if( graphModel.hoverStyle ) {
                    bindingData[ NODE_HOVERED_CLASS ] = graphModel.hoverStyle.node;
                    bindingData[ TEXT_HOVERED_CLASS ] = graphModel.hoverStyle.node;
                }
            } else {
                bindingData[ NODE_HOVERED_CLASS ] = NODE_DEFAULT_CLASS;
                bindingData[ TEXT_HOVERED_CLASS ] = '';
            }

            graphModel.graphControl.graph.updateNodeBinding( node, bindingData );
        }
    }
}

/**
 * Hook to event awGraph.itemsRemoved
 * when app detects node removal event, should also remove these nodes from layout to avoid layout crash.
 */
export let handleItemsRemovedFromGraph = function( graphModel, items ) {
    try {
        if( !items ) {
            return;
        }

        var layout = graphModel.graphControl.layout;

        if( incUpdateLayoutActive( layout ) ) {
            removeObjectsFromIncUpdateLayout( layout, items );
        } else if( sortedLayoutActive( layout ) ) {
            removeObjectsFromSortedLayout( layout, items );
        }
        updateNodeMap( graphModel, items.nodes );

        _.forEach( items.nodes, function( node ) {
            // Unset the Model Object to Node mapping.
            if( node.appData && node.appData.id && _ModelObjectToNodeMap[ node.appData.id ] ) {
                delete _ModelObjectToNodeMap[ node.appData.id ];
            }
        } );

        eventBus.publish( 'Rv1RelationsBrowser.itemsRemoved', {
            nodes: items.nodes,
            edges: items.edges
        } );
    } catch ( ex ) {
        logger.error( ex );
    }
};

var incUpdateLayoutActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

var sortedLayoutActive = function( layout ) {
    return layout && layout.type === 'SortedLayout' && layout.isActive();
};

/**
 * Remove objects from layout.
 */
var removeObjectsFromIncUpdateLayout = function( layout, graphItems ) {
    if( !layout || !graphItems ) {
        return;
    }

    try {
        layout.applyUpdate( function() {
            _.each( graphItems.nodes, function( item ) {
                if( layout.containsNode( item ) ) {
                    layout.removeNode( item );
                }
            } );
            _.each( graphItems.edges, function( item ) {
                if( layout.containsEdge( item ) ) {
                    layout.removeEdge( item );
                }
            } );
            _.each( graphItems.ports, function( item ) {
                if( layout.containsPort( item ) ) {
                    layout.removePort( item );
                }
            } );
        } );
    } catch ( ex ) {
        logger.error( ex );
    }
};

var updateNodeMap = function( graphModel, nodes ) {
    if( graphModel && graphModel.graphControl.graph && nodes ) {
        _.forEach( nodes, function( node ) {
            var key = _.findKey( graphModel.nodeMap, node );
            if( key ) {
                delete graphModel.nodeMap[ key ];
            }
        } );
    }
};

/**
 * Remove objects from sorted layout.
 */
var removeObjectsFromSortedLayout = function( layout, graphItems ) {
    if( !layout || !graphItems || !sortedLayoutActive( layout ) ) {
        return;
    }

    layout.applyUpdate( function() {
        _.each( graphItems.nodes, function( item ) {
            if( layout.containsNode( item ) ) {
                layout.removeNode( item );
            }
        } );

        _.each( graphItems.edges, function( item ) {
            if( layout.containsEdge( item ) ) {
                layout.removeEdge( item );
            }
        } );

        _.each( graphItems.ports, function( item ) {
            if( layout.containsPort( item ) ) {
                layout.removePort( item );
            }
        } );
    } );
};

/**
 * Hook to event awGraph.graphItemsMoved
 * When app detects a graph node or port move (preview) event, should re-apply an update
 * and actually execute movement of those elements.
 */
export let handleGraphItemsMoved = function( items, graphModel ) {
    var movedNodes = [];
    var movedPorts = [];
    var movedEdges = [];

    if( items ) {
        items.forEach( function( element ) {
            if( element.getItemType() === 'Node' ) {
                movedNodes.push( element );
            } else if( element.getItemType() === 'Port' ) {
                movedPorts.push( element );
            } else if( element.getItemType() === 'Edge' ) {
                movedEdges.push( element );
            }
        } );

        var layout = graphModel.graphControl.layout;

        if( movedNodes.length > 0 || movedPorts.length > 0 || movedEdges.length > 0 ) {
            layout.applyUpdate( function() {
                _.forEach( movedNodes, function( node ) {
                    layout.moveNode( node );
                } );
                _.forEach( movedPorts, function( port ) {
                    layout.movePort( port );
                } );
                _.forEach( movedEdges, function( edge ) {
                    layout.movePort( edge );
                } );
            } );
        }
    }
};

/**
 * Hook to event awGraph.itemsAdded
 * when app detects node addition event, should update the Model Object to Node mapping table.
 */
export let handleItemsAddedToGraph = function( graphModel, items ) {
    try {
        if( !items ) {
            return;
        }

        _.forEach( items.nodes, function( node ) {
            // Set the Model Object to Node mapping.
            if( node.appData && node.appData.id ) {
                _ModelObjectToNodeMap[ node.appData.id ] = node;
            }
        } );

        eventBus.publish( 'Rv1RelationsBrowser.itemsAdded', {
            nodes: items.nodes,
            edges: items.edges
        } );
    } catch ( ex ) {
        logger.error( ex );
    }
};

export let qfm0StartGraphEdit = function( ctx, graphModel ) {
    if( graphModel ) {
        var editInputMode = 'editInputMode';
        // Set edit Input mode
        graphModel.config.inputMode = editInputMode;
        ctx.graphEdittedData = [];
    }
};

export let qfm0SaveGraphEdit = function( ctx, graphModel ) {
    if( ctx.graphEdittedData ) {
        var editHandler = editHandlerService.getActiveEditHandler( fmeaContext );
        var promise;
        if( editHandler ) {
            promise = editHandler.saveEdits();
        } else {
            var editHandler = editHandlerService.getActiveEditHandler( '' );
            promise = editHandler.saveEdits();
        }

        promise.then( function( response ) {
            //eventBus.publish( 'setGraphProperties' );
            if( graphModel ) {
                var graphViewerInputMode = 'viewInputMode';
                // set view input mode
                graphModel.config.inputMode = graphViewerInputMode;
                qfm0FmeaGraphUtil2.fetchActionGroupNodesForUpdatingRPNOrAP( ctx.graphEdittedData );
            }
        } )
        .catch( function( error ) {
            if( error && error.cause && error.cause.updated && error.cause.updated.length > 0 ) {
                let updatedObjects = ctx.graphEdittedData.filter( obj => error.cause.updated.indexOf( obj.id ) > -1 );
                qfm0FmeaGraphUtil2.fetchActionGroupNodesForUpdatingRPNOrAP( updatedObjects );
            }
        } );
    }
};

export let qfm0CancelGraphEdit = function( graphModel ) {
    if( graphModel ) {
        var graphViewerInputMode = 'viewInputMode';
        // set view input mode
        graphModel.config.inputMode = graphViewerInputMode;
        var nodes = graphModel.graphData.nodes;
        if( nodes && nodes.length > 0 ) {
            var graphControl = graphModel.graphControl;
            _.forEach( nodes, function( graphNode ) {
                var node = graphModel.nodeMap[ graphNode.nodeId ];
                if( node && node.appData.nodeObject ) {
                    var nodeObject = node.appData.nodeObject;
                    var props = templateService.getBindPropertyNames( nodeObject, node.appData.category );
                    var objectBindData = templateService.getBindProperties( nodeObject, false, node.appData.category );
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

/**
 * Get cell property names for the node object.
 *
 * @param nodeObject the node model object
 * @return the array of cell property names
 */
let getBindPropertyNames = function( nodeObject ) {
    var properties = [];
    // if( nodeObject.props && nodeObject.props[ PROPERTY_NAME ] ) {
    //     var propsArray = nodeObject.props[ PROPERTY_NAME ].uiValues;
    //     _.forEach( propsArray, function( prop ) {
    //         var nameValue = prop.split( TEMPLATE_VALUE_CONN_CHAR );
    //         properties.push( nameValue[ 0 ] );
    //     } );
    // }

    if( nodeObject.modelType &&  nodeObject.modelType.typeHierarchyArray.indexOf( 'Qfm0SystemElement' ) > -1  || nodeObject.modelType.typeHierarchyArray.indexOf( 'Qfm0FunctionElement' ) || nodeObject
        .modelType.typeHierarchyArray.indexOf( 'Qfm0FailureElement' ) || nodeObject.modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) ) {
        properties.push( 'Name' );
    }

    return properties;
};

var setNodeThumbnailProperty = function( nodeObject, bindProperties ) {
    if( !awIconSvc ) {
        return;
    }

    var imageUrl = awIconSvc.getThumbnailFileUrl( nodeObject );

    //show type icon instead if thumbnail doesn't exist
    if( !imageUrl ) {
        imageUrl = awIconSvc.getTypeIconFileUrl( nodeObject );
    }

    bindProperties[ THUMBNAIL_URL ] = graphStyleUtils.getSVGImageTag( imageUrl );
};

var setHoverNodeProperties = function( properties, hoveredClass ) {
    if( hoveredClass ) {
        properties[ exports.NODE_HOVERED_CLASS ] = hoveredClass;
        properties[ exports.TEXT_HOVERED_CLASS ] = hoveredClass;
    } else {
        properties[ exports.NODE_HOVERED_CLASS ] = 'aw-graph-noeditable-area';
        properties[ exports.TEXT_HOVERED_CLASS ] = '';
    }
};

var setRootNodeProperties = function( properties, isRoot ) {
    properties[ IS_ROOT ] = isRoot;
    properties[ COLOR_BAR_WIDTH ] = 10;
    properties[ ROOTNODE_BORDER_STYLE ] = 'aw-relations-noneSeedNodeSvg';
};

export let onNodeEditCommitted = function( ctx, graphModel, eventData, legendState ) {
    var edittedData;
    var updatedProperty;
    //check if Cause or Ishikawa Object is updated
    if( eventData.editNode.appData.category === 'SystemElement' || eventData.editNode.appData.category === 'FunctionElement' || eventData.editNode.appData.category === 'FailureElement' || eventData
        .editNode.appData.category === 'OptimizationAction' || eventData.editNode.appData.category === 'CurrentControlAction'
        ||  eventData.editNode.appData.category === CURRENT_CONTROL_ACTION_GROUP || eventData.editNode.appData.category === CURRENT_OPTIMIZATION_ACTION_GROUP || eventData.editNode.appData.category === 'PFC_SystemElement' ) {
        edittedData = {
            category: eventData.editNode.appData.category,
            id: eventData.editNode.appData.id,
            updatedProperties: []
        };
        var editedPropertyInternalName = getEditedPropertyInternalName( eventData.propertyName );
        updatedProperty = {
            newValue: eventData.newValue,
            oldValue: eventData.oldValue,
            propertyName: editedPropertyInternalName
        };
    }
    var isPresent = false;
    if( edittedData ) {
    edittedData.updatedProperties.push( updatedProperty );
 }
    if( ctx.graphEdittedData.length === 0 && eventData.newValue !== '' ) {
        ctx.graphEdittedData.push( edittedData );
        eventBus.publish( 'qfm0Graph.Modified', {} );
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
 *This method is called to get the property internal names when user edits property from info panel
 * @param {eventdata} propertyName
 * @returns{string} - internal name of property
 */
function getEditedPropertyInternalName( propertyName ) {
    switch( propertyName ) {
        case 'Name': return 'object_name';
        case 'Sequence': return 'qfm0Sequence';
        case 'Severity': return 'qfm0Severity';
        case 'Detection': return PROP_QAM0DETECTION;
        case 'Occurrence': return PROP_QAM0OCCURRENCE;
    }
}

/**
 *on specific event from graph viewModel diagram is marked dirty.
    if Graph has update
        then hasPendingChange to true in ctx
 * @param {boolean} hasPendingChanges flag is set To ctx
 */
export let markGraphAsDirty = function( hasPendingChanges ) {
    //going to start save Diagram
    if( hasPendingChanges ) {
        setHasPendingChangeToArchCtx( hasPendingChanges );
        loadConfirmationMessage();
        subscribeLocationChangeListener();
        setEditAndLeaveHandler();
    }
};

/**
 * set values to diagramming context
 * @argument {ctxPath} ctxPath contextPath
 * @argument {String} value value
 */
var setToDiagramCtx = function( ctxPath, value ) {
    var path = 'ctx.architectureCtx.diagram.' + ctxPath;
    _.set( appCtxService, path, value );
};

/**
 *load the message from message bundle
 */
var loadConfirmationMessage = function() {
    if( localeService ) {
        localeService.getTextPromise( 'editHandlerMessages' ).then(
            function( messageBundle ) {
                _singleLeaveConfirmation = messageBundle.leaveGraphConfirmation;
            } );
    }
};

/**
 * subscribe for appCtx.update in from RCA Navigation
 */
var subscribeLocationChangeListener = function() {
    if( !_leavePageListener ) {
        _leavePageListener = eventBus.subscribe( 'appCtx.update', function( eventData ) {
            if( diagramEditInProgress() ) {
                setToDiagramCtx( 'leaveConfirmByHomeOrBack', true );
            }
        } );
    }
};

var setEditAndLeaveHandler = function( data ) {
    var dataSource = dataSourceService.createNewDataSource( {
        declViewModel: data
    } );

    var startEditFunc = function() {
        // function that returns a promise.
        var deferred = AwPromiseService.instance.defer();

        deferred.resolve( {} );
        return deferred.promise;
    };

    //create Edit Handler
    var editHandler = createEditHandler( dataSource, startEditFunc );
    //registerEditHandler
    if( editHandler ) {
        editHandlerService.setEditHandler( editHandler, fmeaContext );
        editHandlerService.setActiveEditHandlerContext( fmeaContext );
        //editHandler.startEdit();
    }
};

/**
 *this function register the diagram editHandler called after draw graph and whenever we make change in diagram
 * @param {Object} data  data
 */
export let registerGraphEditHandler = function( data ) {
    setEditAndLeaveHandler( data );
};

/**
 * remove the leaveActivator from diagramming context
 * @argument {String} leaveConformers value for checkout visibility
 */
var removeAllLeaveActivator = function( leaveConformers ) {
    _.forEach( leaveConformers, function( leaveCausingItem ) {
        checkAndDeactivateLeaveActivator( leaveCausingItem );
    } );
};
/**
 * disable the leaveCausingItem from diagramming context
 * @argument {String} leaveCausingItem value for checkout visibility
 */
var checkAndDeactivateLeaveActivator = function( leaveCausingItem ) {
    var path = 'ctx.architectureCtx.diagram.' + leaveCausingItem;
    if( _.get( appCtxService, path, false ) ) {
        _.set( appCtxService, path, false );
    }
};

var unsubscribeAndLeaveActivatorsEvents = function() {
    if( _leavePageListener ) {
        eventBus.unsubscribe( 'appCtx.update' );
        _leavePageListener = null;
    }
};

//clean and reset vars after save or cancel.
var cleanup = function() {
    _originalValueOfHasPendingChanges = 0;
    setHasPendingChangeToArchCtx( false );
    exports.removeEditAndLeaveHandler();

    removeAllLeaveActivator( LEAVE_ACTIVATORS );
    unsubscribeAndLeaveActivatorsEvents();
};

/**
 * Remove Edit Handler and unregister LEave Handler
 */
export let removeEditAndLeaveHandler = function() {
    editHandlerService.removeEditHandler( fmeaContext );
};
/**
 *
 * @param {Object} dataSource    dataSource
 * @param {Object} startEditFunction startEdit function
 * @returns {Object} editHandler editHandler
 */
var createEditHandler = function( dataSource, startEditFunction ) {
    var editHandler = {
        // Mark this handler as native -
        isNative: true,
        _editing: false
    };
    editHandler.getEditHandlerContext = function() {
        return fmeaContext;
    };
    var _startEditFunction = startEditFunction; // provided function refs for start/save.

    /**
     * @param {String} stateName - edit state name ('starting', 'saved', 'cancelling')
     */
    function _notifySaveStateChanged( stateName ) {
        var context;
        if( dataSource ) {
            switch ( stateName ) {
                case 'starting':
                    break;
                case 'saved':
                    dataSource.saveEditiableStates();
                    break;
                case 'canceling':
                    dataSource.resetEditiableStates();
                    break;
                default:
                    logger.error( 'Unexpected stateName value: ' + stateName );
            }

            editHandler._editing = stateName === 'starting';
            // Add to the appCtx about the editing state

            appCtxService.updateCtx( 'editInProgress', editHandler._editing );

            context = {
                state: stateName
            };
            context.dataSource = dataSource.getSourceObject();
        } else {
            context = {
                state: stateName
            };
        }
        eventBus.publish( 'editHandlerStateChange', context );
    }
    /*Start editing*/
    editHandler.startEdit = function() {
        var defer = AwPromiseService.instance.defer();
        _startEditFunction().then( function( response ) {
            _notifySaveStateChanged( 'starting', true );
            defer.resolve( response );
        }, function( err ) {
            defer.reject( err );
        } );
        return defer.promise;
    };
    /**
     * Can we start editing?
     *
     * @return {Boolean} true if we can start editing
     */
    editHandler.canStartEdit = function() {
        return dataSource.canStartEdit();
    };
    /**
     * Is an edit in progress?
     *
     * @return {Boolean} true if we're editing
     */
    editHandler.editInProgress = function() {
        return false;
    };
    /**
     *
     * @param {boolean} noPendingModifications  pending Notifications
     */
    editHandler.cancelEdits = function( noPendingModifications ) {
        cleanup();
        _notifySaveStateChanged( 'canceling', !noPendingModifications );
    };

    /*Save Edits*/
    editHandler.saveEdits = function() {
        var deffer = AwPromiseService.instance.defer();
        var promise = saveGraphAsync();
        promise.then( function( response ) {
                cleanup();
                var data = {};
                data.serviceData = response;
                //CAW0EditTreeStructure.updateTreeTable( appCtxService.ctx, data );
                deffer.resolve();
            } )
            .catch( function( error ) {
                messagingService.showError( error.message );
                _notifySaveStateChanged( 'saved', false );
                deffer.reject( error );
            } );
        return deffer.promise;
    };

    /**
     * Perform the actions post Save Edit
     *
     * @param {Boolean} Whether the save edit was successful
     */
    editHandler.saveEditsPostActions = function( saveSuccess ) {
        cleanup();
        _notifySaveStateChanged( 'saved', saveSuccess );
    };

    /*Check if diagram IS Dirty */
    editHandler.isDirty = function() {
        var deferred = AwPromiseService.instance.defer();
        var isDirty = diagramEditInProgress();
        deferred.resolve( isDirty );
        return deferred.promise;
    };

    /**
     *
     * @param {String} label button label
     * @param {AsyncFUnction} callback callBack
     * @returns {Object} button Object
     */
    function createButton( label, callback ) {
        return {
            addClass: 'btn btn-notify',
            text: label,
            onClick: callback
        };
    }
    editHandler.getDataSource = function() {
        return dataSource;
    };

    editHandler.destroy = function() {
        dataSource = null;
    };
    //message Showing as Popup
    var displayNotificationMessage = function() {
        //If a popup is already active just return existing promise
        if( !editHandler._deferredPopup ) {
            editHandler._deferredPopup = AwPromiseService.instance.defer();
        }
        if( localeService ) {
            localeService.getTextPromise( 'editHandlerMessages' ).then(
                function( messageBundle ) {
                    _singleLeaveConfirmation = messageBundle.navigationConfirmationMultiple;
                    _saveTxt = messageBundle.save;
                    _discardTxt = messageBundle.discard;
                    var buttonArray = [];
                    buttonArray.push( createButton( _saveTxt, function( $noty ) {
                        $noty.close();
                        editHandler.saveEdits().then( function() {
                            editHandler._deferredPopup.resolve();
                            editHandler._deferredPopup = null;
                            //incase of error
                        }, function() {
                            editHandler._deferredPopup.resolve();
                            editHandler._deferredPopup = null;
                        } );
                    } ) );
                    buttonArray.push( createButton( _discardTxt, function( $noty ) {
                        $noty.close();
                        editHandler.cancelEdits();
                        editHandler._deferredPopup.resolve();
                        editHandler._deferredPopup = null;
                    } ) );

                    notyService.showWarning( _singleLeaveConfirmation, buttonArray );
                } );
        }

        return editHandler._deferredPopup.promise;
    };

    /**
     *   this is editHandler leaveConfirmation in which call comes for editHandlerService
     *   if viewMode Has been Changed to any of the summary view to Non summary view then directly show the PopUp
     *
     *   @param {Object} callback callBack Function
     *   @returns {leaveConfirmation}  promise Object
     */
    editHandler.leaveConfirmation = function( callback ) {
        //update if call made By ViewMode Change
        return leaveConfirmation( callback );
    };

    /**
     * This is the common code of leaveConfirmation
     * if diagram is dirty
     * return promise
     * @param {Object} callback callBack Function
     * @returns {deferred.promise}  promise Object
     */
    var leaveConfirmation = function( callback ) {
        var deferred = AwPromiseService.instance.defer();
        if( diagramEditInProgress() ) {
            displayNotificationMessage().then( function() {
                processCallBack( callback );
                deferred.resolve();
            } );
        } else {
            editHandler.cancelEdits();
        }
        return deferred.promise;
    };
    return editHandler;
};

/**
 *Handle the callback function which has been came in leaveConfirmation
    if call back is a valid callback
    then call callback.
    if leaveConfirmCounter is more than 2 then reset the leaveConfirmBySelectionChange to zero.
    since in case of selection change call comes to leaveConfirmation twice
    we fire events so that edit handler remain register in diagramming context since leave handler is unregistered after some time
 * @param {function} callback callback function to be processed
 */
var processCallBack = function( callback ) {
    if( callback && _.isFunction( callback ) ) {
        callback();
    }
    if( _originalValueOfHasPendingChanges >= 2 ) {
        _originalValueOfHasPendingChanges = 0;
        checkAndDeactivateLeaveActivator( 'leaveConfirmBySelectionChange' );
    }
};

/**
 * @return {Boolean} true if diagram is Dirty or we are editing the diagram
 */
var diagramEditInProgress = function() {
    return _.get( appCtxService, 'ctx.architectureCtx.diagram.hasPendingChanges', false );
};

/**
 *set the hasPendingChange in ctx.
 * @param {boolean}  hasPendingChanges  to context
 */
export let setHasPendingChange = function( hasPendingChanges ) {
    setHasPendingChangeToArchCtx( hasPendingChanges );
    //Since save diagram completed by now,process save working Context if case of explicit save
    if( !hasPendingChanges && _.get( appCtxService, 'ctx.architectureCtx.diagram.isExplicitSaveDiagram', false ) &&
        diagramEditInProgress() ) {
        //also update save working context. only for the case of Save Diagram One-step Command.
        eventBus.publish( 'AMGraphEvent.updateSavedWorkingContext', {} );
        //cleanup after explicit save.
        cleanup();
    }
};

/**
 * @param {boolean} hasPendingChanges  set hasPending Change to ctx
 */
var setHasPendingChangeToArchCtx = function( hasPendingChanges ) {
    setToDiagramCtx( 'hasPendingChanges', hasPendingChanges );
};

/**
 *save diagram from confirmation dialogue on selection of Save
 @returns {Object}  promise
 */
var saveGraphAsync = function() {
    var deferred = AwPromiseService.instance.defer();
    var ctx = appCtxService.ctx;
    var edittedObjects = [];

    appCtxService.registerCtx( 'reArrangeEdgesOnSequenceChange', false );

    ctx.graphEdittedData.map( function( obj ) {
        var type;
        switch ( obj.category ) {
            case 'SystemElement':
            case 'PFC_SystemElement':
                type = 'Qfm0SystemElement';
                break;
            case 'FunctionElement':
                type = 'Qfm0FunctionElement';
                break;
            case 'FailureElement':
                type = 'Qfm0FailureElement';
                break;
            case 'CurrentControlAction':
                type = 'Qam0QualityAction';
                break;
            case 'OptimizationAction':
                type = 'Qam0QualityAction';
                break;
            case CURRENT_CONTROL_ACTION_GROUP:
                type = 'Qam0QualityAction';
                break;
            case CURRENT_OPTIMIZATION_ACTION_GROUP:
                type = 'Qam0QualityAction';
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

    if( ctx.graphEdittedData[0].category === 'PFC_SystemElement' ) {
        _.forEach( edittedObjects, function( object ) {
            _.forEach( object.vecNameVal, function( prop ) {
                if( prop.name === 'qfm0Sequence' ) {
                    appCtxService.updateCtx( 'reArrangeEdgesOnSequenceChange', true );
                }
            } );
        } );
    }
    var updatedPropertiesInput = {
        info: edittedObjects
    };
    var promise = soaService.post( 'Core-2010-09-DataManagement',
        'setProperties', updatedPropertiesInput );

    promise.then( function( response ) {
            //Reset HasPendingChange
            setHasPendingChangeToArchCtx( false );
            if( appCtxService.ctx.reArrangeEdgesOnSequenceChange ) {
                //remove the edges from the graph and call soa to get new edges for which will be sorted according to sequence number
                var visibleEdges = appCtxService.ctx.graph.graphModel.graphControl.graph.getVisibleEdges();
                appCtxService.ctx.graph.graphModel.graphControl.layout.itemsToBeRemoved.edges = visibleEdges;
                appCtxService.ctx.graph.graphModel.graphControl.graph.removeEdges( visibleEdges, true );

                //Below event is published to get the nodes/edges in a sequencial manner.
                //After successful response, just edges will be manipulated and no impact on nodes. (NODES ARE NOT REDRAWN)
                eventBus.publish( 'Gc1TestHarness.queryNetwork' );
                appCtxService.updateCtx( 'reArrangeEdgesOnSequenceChange', false );
            }
            deferred.resolve( response );
        } )
        .catch( function( error ) {
            deferred.reject( error );
        } );
    return deferred.promise;
};

/** -------------------------------------------------------------------
 * qfm0FmeaGraphUtil factory
 */

export default exports = {
    NODE_HOVERED_CLASS,
    TEXT_HOVERED_CLASS,
    graphSelectionChanged,
    graphHoverChanged,
    handleGraphItemsMoved,
    handleItemsRemovedFromGraph,
    handleItemsAddedToGraph,
    qfm0StartGraphEdit,
    qfm0SaveGraphEdit,
    qfm0CancelGraphEdit,
    onNodeEditCommitted,
    markGraphAsDirty,
    registerGraphEditHandler,
    removeEditAndLeaveHandler,
    setHasPendingChange
};
app.factory( 'qfm0FmeaGraphUtil', () => exports );
