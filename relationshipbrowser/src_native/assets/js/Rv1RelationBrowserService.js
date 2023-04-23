// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Rv1RelationBrowserService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import legendSvc from 'js/Rv1RelationBrowserLegendService';
import localeSvc from 'js/localeService';
import notyService from 'js/NotyModule';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import performanceUtils from 'js/performanceUtils';
import logger from 'js/logger';
import rbUtils from 'js/Rv1RelationBrowserUtils';
import graphConstants from 'js/graphConstants';
import templateService from 'js/Rv1RelationBrowserTemplateService';
import graphLayout from 'js/Rv1RelationBrowserLayout';

import 'js/selection.service';
import 'js/Rv1RelationBrowserDrawEdge';

var exports = {};

// License check flag.
var _hasLicense = null;
var _missingActiveViewMsg = null;
var _ModelObjectToNodeMap = {};

/**
 * Get the Multi Level Expand Level
 *
 * @param activeCommand the active command
 *
 * @return the level to expand
 */
var getMultiLevelExpandLevel = function( activeCommand ) {
    var expandLevel = '1';

    if( activeCommand && activeCommand.expandLevel ) {
        expandLevel = activeCommand.expandLevel;
    }

    return expandLevel;
};

/**
 * Get the Multi Level Expand Direction
 *
 * @param activeCommand the active command
 *
 * @return the direction to expand
 */
var getMultiLevelExpandDirection = function( activeCommand ) {
    var expandDirection = graphConstants.ExpandDirection.FORWARD;
    if( activeCommand ) {
        if( activeCommand.commandId.search( 'Incoming' ) > -1 ) {
            expandDirection = graphConstants.ExpandDirection.BACKWARD;
        } else {
            expandDirection = graphConstants.ExpandDirection.FORWARD;
        }
    }
    return expandDirection;
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
export let getQueryNetworkInput = function( ctx, data, eventData ) {
    try {
        if( !ctx || !data ) {
            return;
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

        var expandLevel = '1';

        if( typeof ctx.selected.props.awb0UnderlyingObject !== 'undefined' ) {
            seedIDs = ctx.selected.props.awb0UnderlyingObject.dbValues;
        }

        // Check for behaviour modelling object
        if( typeof ctx.selected.props.bhv1OwningObject !== 'undefined' ) {
            seedIDs = ctx.selected.props.bhv1OwningObject.dbValues;
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
                    expandLevel = getMultiLevelExpandLevel( eventData );
                    expandDirection = getMultiLevelExpandDirection( eventData );

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
 * Toggle incoming edges visibility for the give node
 */
export let toggleIncomingEdges = function( graphModel, legend, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var performance = performanceUtils.createTimer();

        var edges = node.getEdges( graphConstants.EdgeDirection.IN );
        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isVisible();
        } );

        if( visibleEdges.length > 0 ) {
            var graph = graphModel.graphControl.graph;

            graph.removeEdges( edges );
            rbUtils.resolveConnectedGraph( graphModel );
        } else {
            eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
                rootIDs: [ node.appData.nodeObject.uid ],
                expandDirection: graphConstants.ExpandDirection.BACKWARD
            } );
        }

        performance.endAndLogTimer( 'Graph Expand/Collapse Up Relations', 'toggleIncomingEdges' );
    }
};

/**
 * Toggle outgoing edges visibility for the give node
 */
export let toggleOutgoingEdges = function( graphModel, legend, node ) {
    if( graphModel && node && node.appData.nodeObject ) {
        var performance = performanceUtils.createTimer();

        var edges = node.getEdges( graphConstants.EdgeDirection.OUT );
        var visibleEdges = _.filter( edges, function( edge ) {
            return edge.isVisible();
        } );

        if( visibleEdges.length > 0 ) {
            var graph = graphModel.graphControl.graph;

            graph.removeEdges( edges );
            rbUtils.resolveConnectedGraph( graphModel );
        } else {
            eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
                rootIDs: [ node.appData.nodeObject.uid ],
                expandDirection: graphConstants.ExpandDirection.FORWARD
            } );
        }

        performance.endAndLogTimer( 'Graph Expand/Collapse Down Relations', 'toggleOutgoingEdges' );
    }
};

var incUpdateLayoutActive = function( layout ) {
    return layout && layout.type === 'IncUpdateLayout' && layout.isActive();
};

var sortedLayoutActive = function( layout ) {
    return layout && layout.type === 'SortedLayout' && layout.isActive();
};

/**
 * hook to event awGraph.visibilityChanged
 *
 * a sample here only take care sortedLayout to
 * illustrate solution for LCS-92460.
 *
 * application could extend the function to take care all layout types when graph has visibility changes.
 * For complete implementation please reference:
 * src\thinclient\gc\gctestjs\src\js\Gc1TestHarnessService.js: onVisibilityChanged
 */
export let onVisibilityChanged = function( graphModel, eventData ) {
    if( !graphModel || !eventData ) {
        return;
    }

    //handle layout
    var layout = graphModel.graphControl.layout;
    if( !sortedLayoutActive( layout ) ) {
        return;
    }

    // collect all the visibility changed nodes to layout data
    graphLayout.updateToLayout( layout, 'visibilityChanged', eventData );
};

/**
 * hook to event awGraph.filterApplied
 *
 * a sample here only take care sortedLayout to
 * illustrate solution for LCS-92460.
 *
 * application has the chance to perfrom a bunch layout update when filtre finished.
 */
export let onFilterApplied = function( graphModel ) {
    try {
        if( !graphModel ) {
            return;
        }

        //handle layout
        var layout = graphModel.graphControl.layout;
        if( !sortedLayoutActive( layout ) ) {
            return;
        }

        graphLayout.applyLayoutUpdate( graphModel.graphControl );
    } catch ( ex ) {
        logger.error( ex );
    }
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
 * Hook to forward events coming from the commandsViewModel.
 *
 * Whenever a command is issued from the command toolbar, the corresponding
 * action/event/function is executed on the scope of that command's ViewModel
 * instead of the ViewModel that is registered for the event. Because of this,
 * we won't know at runtime which command was issued or its eventdata.
 *
 * A work-around for this (maybe?) issue is to use a JS function as an
 * intermediary step which will aggregate all of the arguments it recieves,
 * then publish an event on the eventbus with those arguments. Since this
 * method "deallocates" the calling commandViewModel, the following action
 * executes on the view model that is listening for the event, like we'd
 * expect in the first place.
 *
 * In this case, we really just want to "forward" the name of the command.
 */
export let publishExpandFromCommandViewModel = function( commandId, expandLevel ) {
    eventBus.publish( 'Rv1RelationsBrowser.expandGraph', {
        commandId: commandId,
        expandLevel: expandLevel
    } );
};

/**
 * Hook to event awGraph.itemsRemoved
 *
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

/**
 * Hook to event awGraph.graphItemsMoved
 *
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
 *
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

var clearGraph = function( graphModel ) {
    if( graphModel ) {
        graphModel.nodeMap = null;

        //clear the graph
        var graph = graphModel.graphControl.graph;
        graph.update( function() {
            graph.clear();
        } );

        graphModel.graphControl.layout = null;
    }
};

/** -------------------------------------------------------------------
 * Use the printGraph functionality of the graphControl to open a static
 * rendering of the graph in a separate tab for printing from the browser.
 *
 * @param {Object} graphModel - The graph currently in view.
 */
export let openGraphInPrintView = function( graphModel ) {
    try {
        graphModel.graphControl.printGraph();
    } catch ( ex ) {
        logger.error( ex );
    }
};

export let updateActiveView = function( graphModel ) {
    try {
        clearGraph( graphModel );
        eventBus.publish( 'Rv1RelationsBrowser.activeViewUpdated' );
    } catch ( ex ) {
        logger.error( ex );
    }
};

export let edgeHotspotClicked = function( graphModel, edge ) {
    try {
        if( edge ) {
            var graph = graphModel.graphControl.graph;
            graph.removeEdges( [ edge ] );

            rbUtils.resolveConnectedGraph( graphModel );
        }
    } catch ( ex ) {
        logger.error( ex );
    }
};

export let getNodeFromModelObjectId = function( modelObjectId ) {
    return _ModelObjectToNodeMap[ modelObjectId ];
};

export let handleModelObjectUpdated = function( graphModel, eventData ) {
    if( !graphModel || !eventData ) {
        return;
    }

    if( eventData.updatedObjects ) {
        _.forEach( eventData.updatedObjects, function( modelObject ) {
            if( modelObject.uid ) {
                var node = exports.getNodeFromModelObjectId( modelObject.uid );

                if( node ) {
                    // Get the updated binding data from the model object.
                    var bindData = templateService.getBindProperties( modelObject );

                    // Update the node with the new data.
                    graphModel.graphControl.graph.updateNodeBinding( node, bindData );
                }
            }
        } );
    }
    if( eventData.relatedModified ) {
        _.forEach( eventData.relatedModified, function( modelObject ) {
            if( modelObject.uid ) {
                var node = exports.getNodeFromModelObjectId( modelObject.uid );

                if( node ) {
                    // Get the updated binding data from the model object.
                    var bindData = templateService.getBindProperties( modelObject );

                    // Update the node with the new data.
                    graphModel.graphControl.graph.updateNodeBinding( node, bindData );
                }
            }
        } );
    }
};

/**
 * Returns a promise detailing whether or not this session has the license features enabled.
 *
 * @return {Promise} returns a promise that is resolved or rejected if the license check passes or
 * fails, respectively, and without any additional errors or details.
 */
export let licenseCheck = function() {
    var deferred = AwPromiseService.instance.defer();

    if( _hasLicense.promise ) {
        _hasLicense.promise.then(

            function() {
                deferred.resolve();
            },
            function() {
                deferred.reject();
            } );
    } else {
        deferred.reject();
    }

    return deferred.promise;
};

/**
 * Creates an SOA request for the System Modeler license. If the
 * key is valid, we resolve the hasAdvancedFeatures promise. Otherwise,
 * we reject.
 */
var checkSystemModelerLicense = function() {
    soaSvc.postUnchecked( 'Core-2019-06-Session', 'licenseAdmin', { licAdminInput: [ { featureKey: 'tc_system_modeler', licensingAction: 'get' } ] } )
        .then(
            function( response ) {
                    _hasLicense.resolve();
            }
        )
        .catch(
            function( exception ) {
                logger.error( 'Failed to get the System Modeler license.' );
                logger.error( exception );
                _hasLicense.reject();
            }
        );
};

/**
 * Creates an SOA request for the Impact Analysis license. If the
 * key is valid, we resolve the hasAdvancedFeatures promise. Otherwise,
 * we attempt to validate the System Modeler license.
 */
var checkImpactAnalysisLicense = function() {
    soaSvc.postUnchecked( 'Core-2019-06-Session', 'licenseAdmin', { licAdminInput: [ { featureKey: 'impact_analysis', licensingAction: 'get' } ] } )
        .then(
            function( response ) {
                _hasLicense.resolve();
            }
        )
        .catch(
            function( exception ) {
                logger.error( 'Failed to get the Impact Analysis license.' );
                logger.error( exception );

                checkSystemModelerLicense();
            }
        );
};

/**
 * Checks if the session has valid licenses to enable the
 * Advanced Features. If yes, it sets ctx.RelationBrowser.hasAdvancedLicense to true.
 *
 * @param {Object} ctx - application context
 */
export let checkForAdvancedFeaturesLicenses = function( ctx ) {
    if( typeof ctx.RelationBrowser !== 'undefined' && typeof ctx.RelationBrowser.hasAdvancedLicense !== 'undefined' ) {
        return;
    }

    _hasLicense = AwPromiseService.instance.defer();
    checkImpactAnalysisLicense();
    _hasLicense.promise.then( function() { // resolve
            if( !ctx.RelationBrowser ) {
                ctx.RelationBrowser = {};
            }
            ctx.RelationBrowser.hasAdvancedLicense = true;
        },
        function() { // reject
            if( !ctx.RelationBrowser ) {
                ctx.RelationBrowser = {};
            }
            ctx.RelationBrowser.hasAdvancedLicense = false;
        }
    );
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
 * Rv1RelationBrowserService factory
 */

export default exports = {
    getQueryNetworkInput,
    getQueryNetworkPolicy,
    toggleIncomingEdges,
    toggleOutgoingEdges,
    onVisibilityChanged,
    onFilterApplied,
    publishExpandFromCommandViewModel,
    handleItemsRemovedFromGraph,
    handleGraphItemsMoved,
    handleItemsAddedToGraph,
    openGraphInPrintView,
    updateActiveView,
    edgeHotspotClicked,
    getNodeFromModelObjectId,
    handleModelObjectUpdated,
    licenseCheck,
    checkForAdvancedFeaturesLicenses
};
app.factory( 'Rv1RelationBrowserService', () => exports );
