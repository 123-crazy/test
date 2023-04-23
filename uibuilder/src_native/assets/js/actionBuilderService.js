// Copyright (c) 2020 Siemens
// eslint-disable-next-line valid-jsdoc

/**
 * @module js/actionBuilderService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import nodeDefSvc from 'js/nodeDefinitionService';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import graphLegendService from 'js/graphLegendService';
import graphLayout from 'js/actionBuilderGraphLayout';
import actionBuilderUtils from 'js/actionBuilderUtils';
import templateService from 'js/actionBuilderTemplateService';
import saveActionFlowSvc from 'js/saveActionFlowService';
import viewModelCacheSvc from 'js/viewModelCacheService';
import localizationPanelSvc from 'js/localizationPanelService';
import messagingSvc from 'js/messagingService';
import localeSvc from 'js/localeService';
import uwPropertySvc from 'js/uwPropertyService';

/**
 * public API
 */
var exports = {};

/**
 * Setup to map labels to local names.
 */
var localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.messageName', true ).then( result => localeMap.messageName = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.messageText', true ).then( result => localeMap.messageText = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.condition', true ).then( result => localeMap.condition = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.messageType', true ).then( result => localeMap.messageType = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.actionType', true ).then( result => localeMap.actionType = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.messageView', true ).then( result => localeMap.messageView = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.messageTextParams', true ).then( result => localeMap.messageTextParams = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.messageData', true ).then( result => localeMap.messageData = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.expression', true ).then( result => localeMap.expression = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.rootNodeDeleteErrorMessage', true ).then( result => localeMap.rootNodeDeleteErrorMessage = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.rootEdgesErrorMessage', true ).then( result => localeMap.rootEdgesErrorMessage = result );
    localeSvc.getLocalizedTextFromKey( 'UIMessages.successInfo', true ).then( result => localeMap.success = result );
    localeSvc.getLocalizedTextFromKey( 'ActionBuilderMessages.failure', true ).then( result => localeMap.failure = result );
};

let messageRegex = /^(showInfoMessage|showWarningMessage|showErrorMessage)$/;
let messageAndOpRegex = /^(start|end|onEvent|showInfoMessage|showWarningMessage|showErrorMessage)$/;
let messageAndEvRegex = /^(showInfoMessage|showWarningMessage|showErrorMessage|onEvent)$/;
let onEvent = 'onEvent';

var buildCategory = function( internalName, displayName, borderColor, color ) {
    return {
        categoryType: 'objects',
        displayName: displayName,
        internalName: internalName,
        isAuthorable: true,
        isExpanded: false,
        isFiltered: false,
        isSelected: false,
        style: {
            borderColor: borderColor,
            borderStyle: 'solid',
            borderWidth: '1px',
            color: color
        },
        subCategories: []
    };
};

var buildTaskCategory = function( internalName, displayName, borderColor, color, nodeFillColor ) {
    var taskCategory = buildCategory( internalName, displayName, borderColor, color );

    taskCategory.style.initialBindData = {
        node_fill_color: nodeFillColor
    };
    taskCategory.style.strokeColorProperty = 'node_fill_color';
    taskCategory.style.borderStyleClass = 'aw-graph-node-border aw-widgets-cellListItemNode';
    taskCategory.borderColor = borderColor;

    return taskCategory;
};

// eslint-disable-next-line no-unused-vars
var updatePortStyle = function( graphModel, portStyle, nodeId ) {
    // Only show ports in edge creation mode
    if( appCtxSvc.ctx.graph.legendState.creatingCategory &&
        appCtxSvc.ctx.graph.legendState.creatingCategory.creationMode === 1 ) {
        if( graphModel.dataModel.portModels ) {
            var activePortModels = {};

            _.forEach( graphModel.dataModel.portModels, function( value, key ) {
                if( value && value.modelObject && value.modelObject.nodeId === nodeId ) {
                    activePortModels[ key ] = value;
                }
            } );

            _.forEach( activePortModels, function( portModel ) {
                if( portModel && portModel.modelObject && portModel.modelObject.nodeId === nodeId ) {
                    if( portStyle && portModel.graphItem && portModel.graphItem.getItemType() === 'Port' ) {
                        graphModel.graphControl.graph.setPortStyle( portModel.graphItem, portStyle );
                    }
                }
            } );
        }
    }
};

/**
 * Initialize the legend data for graph view model
 *
 * @param {Object} ctx - context object
 * @param {Object} data - declarative view model
 */
export let initLegendData = function( ctx, data ) {
    // Set initial state for action palette panel and enable connection
    ctx.toggleActionPalette = true;
    ctx.enableConnection = false;
    delete ctx.actionBuilderEditorIsDirty;
    delete ctx.actionBuilderEditorInvalid;

    nodeDefSvc.getNodeDefinition().then( function( nodeDefs ) {
        let borderColor = 'rgb(202,216,234)';
        var objectCategory = {
            categories: [
                buildCategory( nodeDefs.operators.start.id, nodeDefs.operators.start.title, borderColor, borderColor ),
                buildCategory( nodeDefs.operators.end.id, nodeDefs.operators.end.title, borderColor, borderColor ),
                buildCategory( nodeDefs.operators.onEvent.id, nodeDefs.operators.onEvent.title, 'rgb(136,136,136)', 'rgb(136,136,136)' )
            ],
            displayName: 'Objects',
            internalName: 'objects'
        };

        _.forEach( nodeDefs.objectActivities, function( activity ) {
            objectCategory.categories.push( buildTaskCategory( activity.id, activity.title,
                'rgb(130,202,237)', borderColor, 'rgb(218,239,250)' ) );
        } );

        var edgeCategory = {
            categories: [ {
                categoryType: 'relations',
                displayName: 'Success',
                internalName: 'success',
                isAuthorable: true,
                isExpanded: false,
                isFiltered: false,
                isSelected: false,
                parsedStyle: {},
                style: _.clone( actionBuilderUtils.successStyle ),
                subCategories: []
            }, {
                categoryType: 'relations',
                displayName: 'Failure',
                internalName: 'failure',
                isAuthorable: true,
                isExpanded: false,
                isFiltered: false,
                isSelected: false,
                style: _.clone( actionBuilderUtils.failureStyle ),
                subCategories: []
            } ],
            displayName: 'Relations',
            internalName: 'relations'
        };

        var portCategory = {
            categories: [ {
                categoryType: 'ports',
                displayName: 'Ports',
                internalName: 'port',
                isAuthorable: true,
                isExpanded: false,
                isFiltered: false,
                isSelected: false,
                style: actionBuilderUtils.portStyle,
                subCategories: []
            } ],
            displayName: 'Ports',
            internalName: 'ports'
        };

        var categoryTypes = [ objectCategory, edgeCategory, portCategory ];

        appCtxSvc.ctx.graph.legendState = {};
        appCtxSvc.ctx.graph.legendState.activeView = {
            categoryTypes: categoryTypes,
            displayName: 'General2',
            expand: true,
            filteredCategories: [],
            internalName: 'General2',
            showEnabled: true,
            showExpand: true
        };

        eventBus.publish( 'actionBuilder.legendInitialized' );
    } );
};
/**
 * Enable/Disable toggle state of action palette
 *
 * @param {Object} ctx - context object
 */
export let toggleActionPalette = function( ctx ) {
    ctx.toggleActionPalette = !ctx.toggleActionPalette;
};

/**
 * Enable/Disable toggle state of change activity type panel
 *
 * @param {Object} ctx - context object
 */
export let toggleChangeActivityTypeState = function( ctx ) {
    ctx.toggleChangeActivityType = !ctx.toggleChangeActivityType;
};

/**
 * Enable/Disable drawing edges between nodes
 *
 * @param {Object} ctx - context object
 */
export let toggleConnection = function( ctx ) {
    ctx.enableConnection = !ctx.enableConnection;
    var category = {
        categoryType: 'relations',
        count: 1,
        creationMode: 1,
        displayName: 'Success',
        internalName: 'success',
        isAuthorable: true,
        isExpanded: false,
        isFiltered: false,
        isSelected: false,
        parsedStyle: {},
        style: _.clone( actionBuilderUtils.successStyle ),
        subCategories: [],
        propsView: 'connectionProperties',
        actionDef: {
            actionType: 'success'
        }
    };

    if( ctx.enableConnection ) {
        category.creationMode = 1;

        ctx.graph.legendState = {};
        ctx.graph.legendState.activeView = {
            categoryTypes: [],
            displayName: 'General2',
            expand: true,
            filteredCategories: [],
            internalName: 'General2',
            showEnabled: true,
            showExpand: true
        };
        ctx.graph.legendState.creatingCategory = category;
        graphLegendService.updateCreationCategory( ctx.graph.graphModel, ctx.graph.legendState, category );
    } else {
        category.creationMode = 0;
        ctx.graph.legendState.creatingCategory = category;
        graphLegendService.updateCreationCategory( ctx.graph.graphModel, ctx.graph.legendState, category, {} );
    }
};

/**
 * Return action types to show in the toolbox panel
 * @param {Object} data view model data*
 * @return {Object} object which contains action types array
 */
export let getActionTypes = function( data ) {
    data.dataProviders.getObjectActivitiesProvider.cursorObject = { endReached: true };
    if( data.dataProviders.getOperatorsProvider ) {
        data.dataProviders.getOperatorsProvider.cursorObject = { endReached: true };
    }
    return nodeDefSvc.getNodeDefinition().then( function( nodeDefs ) {
        var objectActivitiesArray = _.values( nodeDefs.objectActivities );
        var operatorsArray = _.values( nodeDefs.operators );

        return {
            operatorsArray: operatorsArray,
            objectActivitiesArray: objectActivitiesArray
        };
    } );
};

// Move elements with incremental / sorted layout update
var moveElements = function( movedNodes, movedPorts, layout ) {
    if( graphLayout.layoutActive( layout ) && ( movedNodes.length > 0 || movedPorts.length > 0 ) ) {
        layout.applyUpdate( function() {
            _.forEach( movedNodes, function( node ) {
                layout.moveNode( node );
            } );

            if( graphLayout.incUpdateActive( layout ) ) {
                _.forEach( movedPorts, function( port ) {
                    layout.movePort( port );
                } );
            }
        } );
    }
};

/**
 * Return action types to show in the toolbox panel
 *
 * @param {Array} items array of moved items
 * @param {Object} graphModel graph model
 */
export let graphItemsMoved = function( items, graphModel ) {
    logger.info( 'graphItemsMoved event trigged' );
    var movedNodes = [];
    var movedPorts = [];
    if( items ) {
        items.forEach( function( element ) {
            if( element.getItemType() === 'Node' ) {
                movedNodes.push( element );
                logger.info( 'moved Nodes:' + element.getAppObj().Name );
            } else if( element.getItemType() === 'Port' ) {
                movedPorts.push( element );
            }
        } );
        var layout = graphModel.graphControl.layout;
        moveElements( movedNodes, movedPorts, layout );
    }
};

/**
 * Update context selection
 *
 * @param {Object} selectedItems selected objects array
 * @param {Object} unSelectedItems previous unselected objects array
 */
export let updateContextSelection = function( selectedItems, unSelectedItems, graphModel,
    isShiftKeyDown, isAltKeyDown, isCtrlKeyDown ) {
    let graphSelEvent = 'graph.selected';
    let nodeSelClass = 'aw-widgets-cellListItemNodeSelected';
    if( selectedItems && selectedItems.length > 0 ) {
        unSelectedItems = appCtxSvc.ctx.graph.selected ? [ appCtxSvc.ctx.graph.selected ] : [];
        appCtxSvc.registerPartialCtx( graphSelEvent, selectedItems[ 0 ] );
    } else {
        appCtxSvc.registerPartialCtx( graphSelEvent, null );
    }

    if( graphModel ) {
        if( selectedItems ) {
            selectedItems.forEach( function( item ) {
                if( item.getItemType() === 'Boundary' && item.style.styleClass.indexOf( nodeSelClass ) < 0 ) {
                    var style = _.clone( item.style, true );
                    style.styleClass += ' ' + nodeSelClass;
                    graphModel.graphControl.graph.setBoundaryStyle( item, style );
                } else if( item.getItemType() === 'Edge' ) {
                    var hoveredEdgeStyle = item.style;
                    if( hoveredEdgeStyle ) {
                        hoveredEdgeStyle.thickness = 3.0;
                        graphModel.graphControl.graph.setEdgeStyle( item, hoveredEdgeStyle );
                    }
                }
            } );
        }

        if( unSelectedItems ) {
            unSelectedItems.forEach( function( item ) {
                if( item.getItemType() === 'Boundary' && item.style.styleClass.indexOf( nodeSelClass ) >= 0 ) {
                    var style = _.clone( item.style, true );
                    style.styleClass = style.styleClass.replace( ' ' + nodeSelClass, '' );
                    graphModel.graphControl.graph.setBoundaryStyle( item, style );
                } else if( item.getItemType() === 'Edge' ) {
                    var unHoveredEdgeStyle = item.style;
                    if( unHoveredEdgeStyle ) {
                        unHoveredEdgeStyle.thickness = 1.0;
                        graphModel.graphControl.graph.setEdgeStyle( item, unHoveredEdgeStyle );
                    }
                }
            } );
        }
    }
    eventBus.publish( 'graph.selectionChangeEvent' );
};

let deleteEventAndMessageReferences = ( action, sectionKey, refValueToBeDeleted ) => {
    if( action[ sectionKey ] ) {
        var sectionInVM = action[ sectionKey ];
        for( var key in sectionInVM ) {
            if( _.isArray( sectionInVM[ key ] ) && sectionInVM[ key ].length > 0 ) {
                var indexOfObjToBeDeleted = null;
                _.forEach( sectionInVM[ key ], function( obj, idx ) {
                    if( _.isEqual( obj, refValueToBeDeleted ) ) {
                        indexOfObjToBeDeleted = idx;
                    }
                } );
                if( indexOfObjToBeDeleted !== null ) {
                    sectionInVM[ key ].splice( indexOfObjToBeDeleted, 1 );
                }
            }
        }
    }
};

let modifyActionDef = ( actionDef, node, onEventDef ) => {
    if( actionDef && node ) {
        if( !messageAndOpRegex.test( node.category ) ) {
            let eventReferences = node.degrees ? node.degrees.in : [];
            let refsToBeDeleted = [];
            let currGraphModel = appCtxSvc.ctx.graph.graphModel;
            if( onEventDef && _.isArray( onEventDef ) ) {
                onEventDef.forEach( ( eventObj, index ) => {
                    if( eventReferences.some( inNode => {
                            var edgeModel = currGraphModel.dataModel.edgeModels[ inNode ];
                            var evtName = edgeModel.sourceNode.modelObject.name;
                            return eventObj.eventId === evtName;
                        } ) && eventObj.action === node.id ) {
                        refsToBeDeleted.push( index );
                    }
                } );
                while( refsToBeDeleted.length ) {
                    onEventDef.splice( refsToBeDeleted.pop(), 1 );
                }
            } else {
                //in case of command builder,maintaining deleted onEvents to save to darsi later on
                if( !currGraphModel.dataModel.deletedOnEvent ) {
                    currGraphModel.dataModel.deletedOnEvent = [];
                }
                _.forEach( eventReferences, function( eventRef ) {
                    var eventId = currGraphModel.dataModel.edgeModels[ eventRef ].sourceNode.modelObject.name;
                    currGraphModel.dataModel.deletedOnEvent.push( {
                        eventId: eventId,
                        action: node.id
                    } );
                } );
            }
        } else if( node.category === onEvent ) {
            let refValueToBeDeleted = node && node.actionDef ? node.actionDef : null;
            if( refValueToBeDeleted ) {
                deleteEventAndMessageReferences( actionDef, 'events', refValueToBeDeleted );
            }
        } else if( messageRegex.test( node.category ) ) {
            let refValueToBeDeleted = node && node.actionDef ? node.actionDef : null;
            if( refValueToBeDeleted ) {
                deleteEventAndMessageReferences( actionDef, 'actionMessages', refValueToBeDeleted );
            }
        }
    }
};

let updateRemoveNodesInCommandsVM = function( node, nodes, edges ) {
    let graphModel = appCtxSvc.ctx.graph.graphModel;
    let actionObj = saveActionFlowSvc.getRespectiveAction( node, graphModel );

    if( actionObj ) {
        let actionNodeModel = actionObj.actionNodeModel;
        if( actionNodeModel ) {
            let actionDef = actionNodeModel.modelObject.actionDef;
            modifyActionDef( actionDef, node, null );
        }
    }

    _.remove( actionObj.actionNodeModel.modelObject.actionDef.events.success, {
        name: node.name
    } );
    _.remove( actionObj.actionNodeModel.modelObject.actionDef.events.failure, {
        name: node.name
    } );

    graphModel.graphControl.graph.removeItems( nodes.concat( edges ), false );
    //remove the node selection
    delete appCtxSvc.ctx.graph.selected;
};

let updateRemovedNodesInViewModel = function( viewModelId, node, nodes, edges ) {
    let actionName = appCtxSvc.ctx.state.params.s_uid;
    let graphModel = appCtxSvc.ctx.graph.graphModel;

    viewModelCacheSvc.getViewModel( viewModelId ).then( function( viewModel ) {
        modifyActionDef( viewModel.actions[ actionName ], node, viewModel.onEvent );

        let actionObj = saveActionFlowSvc.getRespectiveAction( node, graphModel );
        _.remove( viewModel.actions[ actionObj.actionNodeModel.id ].events.success, {
            name: node.name
        } );
        _.remove( viewModel.actions[ actionObj.actionNodeModel.id ].events.failure, {
            name: node.name
        } );

        viewModelCacheSvc.updateViewModel( viewModelId, viewModel, false );

        graphModel.graphControl.graph.removeItems( nodes.concat( edges ), false );
        //remove the node selection
        delete appCtxSvc.ctx.graph.selected;
    } );
};

/**
 * Delete node/edge from graph
 *
 * @param {Object} graphModel graph model
 * @param {Boolean} isAltKeyDown boolean flag whether alt key is down
 * @param {Boolean} isShiftKeyDown boolean flag whether shift key is down
 * @param {Boolean} isCtrlKeyDown boolean flag whether ctrl key is down
 */
export let deleteKeyDown = function( graphModel, isAltKeyDown, isShiftKeyDown, isCtrlKeyDown ) {
    let nodes = graphModel.graphControl.getSelected( 'Node' );
    let edges = graphModel.graphControl.getSelected( 'Edge' );
    let node = {};
    if( nodes.length > 0 ) {
        node = nodes[ 0 ].model.modelObject;
        if( !node.degrees && nodes[ 0 ].model.degrees ) {
            node.degrees = nodes[ 0 ].model.degrees;
            node.category = nodes[ 0 ].model.category;
        }

        if( node.id === appCtxSvc.ctx.state.params.s_uid ) {
            messagingSvc.showError( localeMap.rootNodeDeleteErrorMessage );
            return;
        }
    } else if( edges.length > 0 ) {
        let sourceNode = edges[ 0 ].model.sourceNode;
        let targetNode = edges[ 0 ].model.targetNode;

        if( /^(end)$/.test( targetNode.category ) ) {
            graphModel.graphControl.graph.removeItems( nodes.concat( edges ), false );
            //remove the edge selection
            delete appCtxSvc.ctx.graph.selected;
            return;
        } else if( /^(start)$/.test( sourceNode.category ) && targetNode.id === appCtxSvc.ctx.selected.uid ) {
            messagingSvc.showError( localeMap.rootEdgesErrorMessage );
            return;
        } else if( messageAndEvRegex.test( targetNode.category ) ||
            sourceNode.category === 'event' && !messageAndOpRegex.test( targetNode.category ) ) {
            node = appCtxSvc.ctx.graph.graphModel.dataModel.nodeModels[ targetNode.id ].modelObject;
        }
    }

    if( node ) {
        // set Graph to dirty state
        appCtxSvc.ctx.graph.isDirty = true;

        let viewModelId = appCtxSvc.ctx.state.params.viewModelId;
        //update the view model in case of panel builder
        if( viewModelId ) {
            updateRemovedNodesInViewModel( viewModelId, node, nodes, edges );
        } else {
            updateRemoveNodesInCommandsVM( node, nodes, edges );
        }
    }
};

export let graphItemsResized = function( items, data ) {
    logger.info( 'graphItemsResized event trigged' );
    var graphModel = data.graphModel;
    var resizedNodes = [];

    if( items ) {
        items.forEach( function( element ) {
            if( element.getItemType() === 'Node' ) {
                resizedNodes.push( element );
                logger.info( 'resized Nodes:' + element.getAppObj().Name );
            }
        } );

        resizeElements( resizedNodes, graphModel.graphControl );
    }
};

// Resize elements with incremental / sorted layout update
var resizeElements = function( resizedNodes, graphControl ) {
    var ret = false;
    if( resizedNodes.length > 0 ) {
        var layout = graphControl.layout;
        if( graphLayout.layoutActive( layout ) ) {
            layout.applyUpdate( function() {
                _.forEach( resizedNodes, function( node ) {
                    if( layout.containsNode( node ) && node.getItemType() === 'Node' ) {
                        ret = layout.resizeNode( node, true );
                    }
                } );
            } );
        } else {
            var groupGraph = graphControl.groupGraph;
            var graph = graphControl.graph;
            _.forEach( resizedNodes, function( node ) {
                if( groupGraph.isGroup( node ) && ( graph.isNetworkMode() || !groupGraph.isExpanded( node ) ) ) {
                    graphControl.updateHeaderHeight( node, node.getHeight() );
                }
            } );
        }
    }

    return ret;
};

var setNodeHoverStyle = function( node, hoveredClass, graphModel ) {
    if ( graphModel.graphControl ) {
        if( !node.style ) {
            var style = {
                styleClass: hoveredClass
            };
            graphModel.graphControl.graph.setNodeStyle( node, style );
        } else {
            var bindData = {};
            templateService.setHoverNodeProperty( bindData, hoveredClass );
            graphModel.graphControl.graph.updateNodeBinding( node, bindData );
            graphModel.graphControl.graph.setNodeStyle( node, style );
        }
    }
};

export let hoverChanged = function( hoveredItem, unHoveredItem, graphModel ) {
    logger.info( 'hover change event trigged.' );
    if( unHoveredItem ) {
        if( unHoveredItem.getItemType() === 'Edge' && appCtxSvc.ctx.graph.selected !== unHoveredItem ) {
            var unHoveredEdgeStyle = unHoveredItem.style;
            if( unHoveredEdgeStyle ) {
                unHoveredEdgeStyle.thickness = 1.0;
                graphModel.graphControl.graph.setEdgeStyle( unHoveredItem, unHoveredEdgeStyle );
            }
        } else if( unHoveredItem.getItemType() === 'Node' ) {
            setNodeHoverStyle( unHoveredItem, '', graphModel );
        }
    }
    if( hoveredItem ) {
        if( hoveredItem.getItemType() === 'Edge' ) {
            var hoveredEdgeStyle = hoveredItem.style;
            if( hoveredEdgeStyle ) {
                hoveredEdgeStyle.thickness = 3.0;
                graphModel.graphControl.graph.setEdgeStyle( hoveredItem, hoveredEdgeStyle );
            }
        } else if( hoveredItem.getItemType() === 'Node' ) {
            var nodeHoverStyle = 'aw-widgets-cellListItemNodeHovered';
            if( hoveredItem.style.dropShadow && hoveredItem.style.dropShadow.hoverStyleClass ) {
                nodeHoverStyle = hoveredItem.style.dropShadow.hoverStyleClass;
            }

            setNodeHoverStyle( hoveredItem, nodeHoverStyle, graphModel );
        }
    }
};

export let fireRefreshBreadCrumbEvent = function( viewModelId, selectedObjectId ) {
    var provider = {
        crumbs: [ {
                displayName: viewModelId,
                clicked: false,
                selectedCrumb: false,
                showArrow: Boolean( selectedObjectId ),
                width: 200
            },
            {
                displayName: selectedObjectId,
                clicked: false,
                selectedCrumb: false,
                showArrow: false,
                width: 200
            }
        ]
    };

    //Don't show arrow for last crumb
    if( provider.crumbs && provider.crumbs.length > 0 ) {
        var lastCrumb = provider.crumbs[ provider.crumbs.length - 1 ];
        lastCrumb.selectedCrumb = true;
        lastCrumb.showArrow = false;
    }

    eventBus.publish( 'wysiwygCommonFrameLocation.refreshBreadCrumb', {
        bcProvider: provider
    } );
};

export let applyActionProperties = function( ctx, data, changeActionType ) {
    saveActionFlowSvc.updateGraphModelWithActionProps( ctx, data, changeActionType );
};

export let updateActivityType = function( ctx, data ) {
    eventBus.publish( 'actionBuilder.refreshActivityProperty', {
        viewId: data.dataProviders.getObjectActivitiesProvider.selectedObjects[ 0 ].props.propsView.dbValue,
        uid: data.dataProviders.getObjectActivitiesProvider.selectedObjects[ 0 ].uid
    } );
};

export let resetActionProperties = function( ctx, data ) {
    if( !ctx.graph.selected ) {
        data.propertyViewData = null;
        data.actionProps = [];
    }
};

export let updateActionProperties = function( ctx, data ) {
    if( ctx.graph.selected ) {
        if ( ctx.graph.selected.model.nodeObject && ( ctx.graph.selected.model.nodeObject.messageDef || ctx.graph.selected.model.nodeObject.category === 'onEvent' ) ) {
            data.actionProps = [];
            data.propertyViewData = ctx.graph.selected.model.nodeObject.propsView;
        }
        if ( ctx.graph.selected.model.edgeObject ) {
            data.actionProps = [];
            data.propertyViewData = ctx.graph.selected.model.edgeObject.propsView;
        }
        data.registrationData = ctx.graph.selected.model.modelObject.actionDef;
    } else {
        data.propertyViewData = null;
        data.actionProps = [];
    }
};

export let updateCategoryType = function( ctx, data ) {
    if( ctx.graph.selected ) {
        data.propertyViewData = data.eventData.viewId;
    }
    eventBus.publish( 'changeActionType.closeChangeTypePanel', {} );
    exports.applyActionProperties( ctx, data, true );
};

export let changeNodeCategoryMessage = function() {
    if( appCtxSvc.ctx.graph.selected ) {
        eventBus.publish( 'changeActionType.confirmChangeType', {} );
    }
};

export let saveActionFlow = function( ctx, commandContext ) {
    saveActionFlowSvc.saveActionFlow( ctx, true, commandContext );
};

export let retrieveActions = function( viewModelId, filterString ) {
    return viewModelCacheSvc.getViewModel( viewModelId ).then( function( viewModel ) {
        let filterActions = function( actions, filterStr ) {
            return actions.filter( ( actionId ) => {
                return actionId && actionId.toLowerCase().includes( filterStr );
            } );
        };

        let actions = Object.keys( viewModel.actions );
        if( filterString ) {
            actions = filterActions( actions, filterString );
        }
        return {
            actions: actions.map( actionid => {
                return {
                    id: actionid
                };
            } )
        };
    } );
};

export let getActionDef = function( nodeModels, actionId ) {
    return nodeModels[ actionId ].nodeObject.actionDef;
};

export let setI18nValueAndAnchor = function( vmProp, viewModelId, msgtext, i18nSource ) {
    if( msgtext && msgtext.indexOf( 'i18n.' ) !== -1 ) {
        //For command builder getch the i18n info directly from darsi
        if( i18nSource ) {
            localizationPanelSvc.retrieveI18nValue( vmProp, null, msgtext, i18nSource );
        } else {
            viewModelCacheSvc.getViewModel( viewModelId ).then( function( viewModel ) {
                localizationPanelSvc.retrieveI18nValue( vmProp, viewModel, msgtext, null );
            } );
        }
    } else {
        vmProp.anchor = 'aw_i18nAddLocaleAnchor';
        vmProp.isEnabled = true;
    }
};

export let removeMessageText = function( ctx, data ) {
    data.actionTypeMessageText = uwPropertySvc.createViewModelProperty( 'actionTypeMessageText', localeMap.messageText, 'STRING', null, [] );
    data.actionTypeMessageText.renderingHint = 'textbox';
    data.actionTypeMessageText.maxLength = 128;
    uwPropertySvc.setIsPropertyModifiable( data.actionTypeMessageText, true );
    uwPropertySvc.setEditState( data.actionTypeMessageText, true, true );
};

export let refreshMessageProperties = function( ctx, data ) {
    data.messageName = uwPropertySvc.createViewModelProperty( 'messageName', localeMap.messageName, 'STRING', ctx.graph.selected.model.modelObject.name, [ ctx.graph.selected.model.modelObject.name ] );
    data.messageName.renderingHint = 'textbox';
    data.messageName.maxLength = 128;
    uwPropertySvc.setIsPropertyModifiable( data.messageName, true );
    uwPropertySvc.setEditState( data.messageName, true, true );

    if( ctx.graph.selected.model.modelObject.messageDef ) {
        data.messageText = uwPropertySvc.createViewModelProperty( 'messageText', localeMap.messageText, 'STRING', ctx.graph.selected.model.modelObject.messageDef.messageText, [ ctx.graph.selected.model
            .modelObject.messageDef.messageText
        ] );
        data.messageText.renderingHint = 'textbox';
        data.messageText.maxLength = 128;
        data.messageText.anchor = 'aw_i18nEditRemoveLocaleAnchor';
        uwPropertySvc.setIsPropertyModifiable( data.messageText, true );
        uwPropertySvc.setEditState( data.messageText, true, true );

        data.messageType = uwPropertySvc.createViewModelProperty( 'messageType', localeMap.messageType, 'STRING', ctx.graph.selected.model.modelObject.messageDef.messageType, [ ctx.graph.selected.model
            .modelObject.messageDef.messageType
        ] );
        data.messageType.renderingHint = 'textbox';
        data.messageType.maxLength = 128;
        data.actionType.isEnabled = false;
        uwPropertySvc.setIsPropertyModifiable( data.messageType, true );
        uwPropertySvc.setEditState( data.messageType, true, true );

        data.messageKey = uwPropertySvc.createViewModelProperty( 'messageKey', localeMap.messageView, 'STRING', ctx.graph.selected.model.modelObject.messageDef.messageKey, [ ctx.graph.selected.model
            .modelObject.messageDef.messageKey
        ] );
        data.messageKey.renderingHint = 'textbox';
        data.messageKey.maxLength = 128;
        uwPropertySvc.setIsPropertyModifiable( data.messageKey, true );
        uwPropertySvc.setEditState( data.messageKey, true, true );

        data.messageTextParams = uwPropertySvc.createViewModelProperty( 'messageTextParams', localeMap.messageTextParams, 'STRING', ctx.graph.selected.model.modelObject.messageDef.messageTextParams, [
            ctx.graph.selected.model.modelObject.messageDef.messageTextParams
        ] );
        uwPropertySvc.setIsPropertyModifiable( data.messageTextParams, true );
        uwPropertySvc.setEditState( data.messageTextParams, true, true );

        data.messageData = uwPropertySvc.createViewModelProperty( 'messageData', localeMap.messageData, 'STRING', ctx.graph.selected.model.modelObject.messageDef.messageData, [ ctx.graph.selected.model
            .modelObject.messageDef.messageData
        ] );

        data.messageExpression = uwPropertySvc.createViewModelProperty( 'messageExpression', localeMap.messageExpression, 'STRING', ctx.graph.selected.model.modelObject.messageDef.expression, [ ctx
            .graph.selected.model.modelObject.messageDef.expression
        ] );
        data.messageExpression.renderingHint = 'textbox';
        data.messageExpression.maxLength = 128;
        uwPropertySvc.setIsPropertyModifiable( data.messageExpression, true );
        uwPropertySvc.setEditState( data.messageExpression, true, true );

        exports.setI18nValueAndAnchor( data.messageText, ctx.state.params.viewModelId,
                ctx.graph.selected.model.modelObject.messageDef.messageText, ctx.graph.selected.model.modelObject.messageDef.i18nSource );
    }

    data.condition = uwPropertySvc.createViewModelProperty( 'condition', localeMap.condition, 'STRING', ctx.graph.selected.model.modelObject.actionDef.condition, [ ctx.graph.selected.model.modelObject
        .actionDef.condition
    ] );
    data.condition.renderingHint = 'textbox';
    data.condition.maxLength = 128;
    uwPropertySvc.setIsPropertyModifiable( data.condition, true );
    uwPropertySvc.setEditState( data.condition, true, true );

    data.actionType = uwPropertySvc.createViewModelProperty( 'actionType', localeMap.actionType, 'STRING', ctx.graph.selected.model.modelObject.actionDef.actionType, [ ctx.graph.selected.model
        .modelObject.actionDef.actionType
    ] );
    data.actionType.renderingHint = 'textbox';
    data.actionType.maxLength = 128;
    uwPropertySvc.setIsPropertyModifiable( data.actionType, true );
    uwPropertySvc.setEditState( data.actionType, true, true );
    uwPropertySvc.setIsEnabled( data.actionType, false );

    if( ctx.graph.selected.model.modelObject.actionDef.inputData ) {
        data.actionTypeMessageText = uwPropertySvc.createViewModelProperty( 'actionTypeMessageText', localeMap.messageText, 'STRING', ctx.graph.selected.model.modelObject.actionDef.inputData.message, [
            ctx.graph.selected.model.modelObject.actionDef.inputData.message
        ] );
        data.actionTypeMessageText.renderingHint = 'textbox';
        data.actionTypeMessageText.maxLength = 128;
    }

    data.messageDataLabel = uwPropertySvc.createViewModelProperty( 'messageDataLabel', localeMap.messageData, 'STRING', '', '' );
};

export let loadViewModel = function( viewModelId ) {
    viewModelCacheSvc.getViewModel( viewModelId ).then( function( viewModel ) {
        viewModelCacheSvc.updateViewModel( viewModelId, viewModel );
    } );
};

/**
 * Get action type LOVs
 *
 * @param {Object} type - activities key.
 *
 * @return {Promise} Parsed lov entries array
 */
export let getActionTypeLovs = function( type ) {
    return nodeDefSvc.getNodeDefinition( null, type ).then( function( response ) {
        let actionTypesLovs = [];
        _.forEach( response, function( activity ) {
            var lovEntry = {
                propInternalValue: activity.id,
                propDisplayValue: activity.title,
                propDisplayDescription: activity.title
            };

            actionTypesLovs.push( lovEntry );
        } );

        return actionTypesLovs;
    } );
};

/** Commenting for now until we turn this option on. Please do not delete */
// export let updateSelectedNode = function( lovEntry, data ) {
//     appCtxSvc.registerPartialCtx( 'graph.selected.model.nodeObject.propsView', lovEntry.propInternalValue );
//     appCtxSvc.registerPartialCtx( 'graph.selected.model.nodeObject.type', lovEntry.propInternalValue );

//     var nodeObject = appCtxSvc.ctx.graph.selected.model.nodeObject;
//     var props = templateService.getBindPropertyNames( nodeObject );
//     var bindData = templateService.getBindProperties( nodeObject, props );
//     //get node template for the created node object
//     var flag = templateService.useMultiLevelTemplate( nodeObject );
//     var template = templateService.getNodeTemplate( appCtxSvc.ctx.graph.graphModel.nodeTemplates, props, false, flag, lovEntry.propInternalValue );
//     appCtxSvc.ctx.graph.graphModel.graphControl.graph.setNodeStyle( appCtxSvc.ctx.graph.selected, template, bindData );
// };

exports = {
    initLegendData,
    toggleConnection,
    toggleActionPalette,
    getActionTypes,
    graphItemsMoved,
    updateContextSelection,
    deleteKeyDown,
    graphItemsResized,
    hoverChanged,
    fireRefreshBreadCrumbEvent,
    applyActionProperties,
    saveActionFlow,
    retrieveActions,
    getActionDef,
    setI18nValueAndAnchor,
    loadViewModel,
    updateRemovedNodesInViewModel,
    getActionTypeLovs,
    refreshMessageProperties,
    loadConfiguration,
    updateActivityType,
    resetActionProperties,
    updateActionProperties,
    updateCategoryType,
    toggleChangeActivityTypeState,
    changeNodeCategoryMessage,
    removeMessageText
};
export default exports;

loadConfiguration();

/**
 * This factory creates a service and returns exports
 *
 * @member actionBuilderService
 */
app.factory( 'actionBuilderService', () => exports );
