// Copyright (c) 2019 Siemens

/* global
 define
 */
/**
 * This module contains graph initialization API
 *
 * @module js/awGraphService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import AwInjectorService from 'js/awInjectorService';
import graphTemplateSrv from 'js/graphTemplateService';
import graphLayoutSrv from 'js/graphLayoutService';
import graphControlFactory from 'js/graphControlFactory';
import graphSrv from 'js/graphService';
import groupGraphSrv from 'js/groupGraphService';
import _ from 'lodash';
import logSvc from 'js/logger';
import graphStyleUtils from 'js/graphStyleUtils';
import declUtils from 'js/declUtils';
import graphConstants from 'js/graphConstants';
import graphCommandService from 'js/graphCommandService';
import SDFExtension from 'js/SDFExtension';
import graphUtils from 'js/graphUtils';
import graphAlignment from 'js/graphAlignment';
import graphGrid from 'js/graphGrid';
import graphShadowEffect from 'js/graphShadowEffect';
import performanceUtils from 'js/performanceUtils';
import CustomPanCommand from 'js/CustomPanCommand';
import CreatePortCommand from 'js/CreatePortCommand';

import 'js/iconService';
import '@diagramming/foundation';
import '@diagramming/globallayout';
import '@diagramming/layoutcore';
import '@diagramming/yfileswrapper';
import 'js/EdgeLabelMoveStrategy';
import 'js/CustomConnectionStyleProvider';
import 'js/HotspotLocationRule';
import 'js/InlineElementLocationRule';
import 'js/CustomDisplayStrategy';
import 'js/GraphOverlay';

var exports = {};

// Diagram Foundation module will be initialized after graph libraries loaded
var SDF = null;

/**
 * Create diagram view object
 *
 * @param element the container DOM element to hold the graph widget
 * @param graphConfig the graph configuration object
 * @return the diagram view object
 */
var createDiagramView = function( element, graphConfig ) {
    // Set the license of DF
    window.SDF.setLicenseKey( 'eyJhcHBsaWNhdGlvbiIjIkdyYXBoaW5nIENvbXBvbmVudCIkImNvbnRhY3QiIyJUZXJyeSBOaSJ8ImRhdGUiPiIyMDIwLzEyLzE2IiQiZW1haWwiIyJ0ZXJyeS5uaUBzaWVtZW5zLmNvbSJ9e3YxLjB9' );

    //
    var diagramView = new window.SDF.DiagramView( element, 1212, 633, window.SDF.RenderingMode.Svg );

    // init rendering performance watcher
    diagramView.initRenderingPerformanceStopWatch();

    var config = diagramView.getSheetConfigurationData();
    config.showSheetBorder = false; // Unlimited sheets do not have borders
    config.nestedNodeCollapsedHeight = 135;
    config.nestedNodeTitleBarHeight = 135;
    config.nestedNodePadding = 10;
    config.portIndicatorWidth = 0;
    config.svgTemplateSettings = {
        interpolate: /{([\s\S]+?)}/g
    };

    // other default configurations
    config.autoAlignmentEnabled = graphConfig.enableAlignment;
    config.allowObjectArrangement = graphConfig.enableObjectArrangement !== undefined ? graphConfig.enableObjectArrangement :
        true;
    config.snapToGridByAnchorPoint = graphConfig.snapToGridByAnchorPoint || false;
    config.defaultAnchorX = 0;
    config.defaultAnchorY = 0;
    if( graphConfig.defaultTextCapHeightFactor ) {
        config.defaultTextCapHeightFactor = graphConfig.defaultTextCapHeightFactor;
    }

    if( graphConfig.doubleClickSpeed ) {
        config.doubleClickSpeed = graphConfig.doubleClickSpeed;
    }

    // Controls the length of time which a tooltip will be up (ms).
    // A negative number means that the tooltip will be shown until the mouse exits the SheetElement's Bounding Box
    // LCS-356908 - tool tip in graphical viewer displays for only 2 seconds where other tool tips display until cursor is moved
    //
    config.tooltipStayTime = -1;

    // TODO: try to remove it
    config.initViewportHeight = 633;
    config.initViewportWidth = 1212;

    config.fitMargin = 1;

    return diagramView;
};

/**
 * Initialize graph APIs and expose to graph model
 * @returns promise resolved to initialize graph
 */
var initGraphApi = function( graphModel, diagramView, graphContainer, deferred ) {
    var promises = [];
    var graph = graphSrv.createGraph( graphModel, diagramView, graphContainer );
    var graphControl = graphControlFactory.createGraphControl( graph, graphContainer );
    graphControl.groupGraph = groupGraphSrv.createGroupGraph( graph );

    graphControl.grid = graphGrid.create( graphModel.config.grid, diagramView );
    if( graphModel.config.showGrid ) {
        graphControl.grid.preferences.enabled = true;
    }
    graphControl.alignment = graphAlignment.create( graphModel.config.alignment, diagramView );

    // initialize layout if it's configured
    var layoutConfig = graphModel.config.layout;
    if( layoutConfig ) {
        var layoutPromise = graphLayoutSrv.createLayout( graphControl, layoutConfig.layoutMode, layoutConfig.config ).then( function( layout ) {
            // set default layout type and direction
            if( layout && layoutConfig.defaultOption ) {
                graphLayoutSrv.setLayoutOption( layout, layoutConfig.defaultOption );
            }
        } );

        promises.push( layoutPromise );
    }
    graphModel.graphControl = graphControl;

    // set customerFilter
    if( graphModel.config.customerFilter ) {
        var customFilterPromise = declUtils.loadImports( [ graphModel.config.customerFilter ], AwPromiseService.instance ).then( function( fn ) {
            graphModel.customFilterApi = fn[ 0 ];
        } );
        promises.push( customFilterPromise );
    }

    registerShadowEffects( graphModel );

    // init graph data model
    graphModel.dataModel = {
        nodeModels: {},
        edgeModels: {},
        portModels: {},
        boundaryModels: {}
    };

    graphModel.clearGraph = function() {
        this.dataModel.nodeModels = {};
        this.dataModel.edgeModels = {};
        this.dataModel.portModels = {};
        this.dataModel.boundaryModels = {};

        if( this.graphControl ) {
            this.graphControl.clear();
        }
    };

    var addItemModel = function( itemModels, item, itemModel ) {
        if( itemModel ) {
            itemModels[ itemModel.id ] = itemModel;
            if( item ) {
                item.model = itemModel;
                itemModel.graphItem = item;
            }
        }
    };

    graphModel.addNodeModel = function( node, nodeModel ) {
        addItemModel( this.dataModel.nodeModels, node, nodeModel );
    };
    graphModel.addEdgeModel = function( edge, edgeModel ) {
        addItemModel( this.dataModel.edgeModels, edge, edgeModel );
    };
    graphModel.addPortModel = function( port, portModel ) {
        addItemModel( this.dataModel.portModels, port, portModel );
    };
    graphModel.addBoundaryModel = function( boundary, boundaryModel ) {
        addItemModel( this.dataModel.boundaryModels, boundary, boundaryModel );
    };

    var removeItemModels = function( itemModels, toRemoveModels ) {
        if( itemModels && toRemoveModels ) {
            toRemoveModels.forEach( function( model ) {
                if( model && itemModels.hasOwnProperty( model.id ) ) {
                    delete itemModels[ model.id ];
                }
            } );
        }
    };
    graphModel.removeNodeModels = function( nodeModels ) {
        removeItemModels( this.dataModel.nodeModels, nodeModels );
    };
    graphModel.removeEdgeModels = function( edgeModels ) {
        removeItemModels( this.dataModel.edgeModels, edgeModels );
    };
    graphModel.removePortModels = function( portModels ) {
        removeItemModels( this.dataModel.portModels, portModels );
    };

    graphModel.getGroupRelationModel = function( childNodeModel ) {
        if( !childNodeModel ) {
            return null;
        }

        var groupRelationCategory = graphModel.categoryApi.getGroupRelationCategory();
        return _.find( this.dataModel.edgeModels, function( edgeModel ) {
            return edgeModel.category === groupRelationCategory && edgeModel.targetNode.id === childNodeModel.id;
        } );
    };

    return AwPromiseService.instance.all( promises ).then( function() {
        deferred.resolve();
    }, function( error ) {
        deferred.reject( error );
    } );
};

/**
 * Update node template cache with loaded template content.
 *
 * @param graphModel the graph model object
 * @param templateMap the template ID to template content map
 */
var updateNodeTemplates = function( graphModel, templateMap ) {
    _.forEach( templateMap, function( templateContent, templateId ) {
        if( templateId && templateContent && graphModel.nodeTemplates[ templateId ] ) {
            var template = graphModel.nodeTemplates[ templateId ];
            template.templateId = templateId;
            template.templateContent = templateContent;
        }
    } );
};

/**
 * Register shadow effects for label shadow
 * @param {Object} graphModel the graph model
 */
var registerShadowEffects = function( graphModel ) {
    var shadowEffects = graphModel.config.shadowEffects;
    if( !shadowEffects ) {
        return;
    }

    // call an API of DF to get the symbol defs element instead of getElementById to remove the dependency on element id
    var element = graphModel.graphControl._diagramView.getVirtualCanvas().getSymbolDefs();
    _.forEach( shadowEffects, function( shadowEffect ) {
        graphShadowEffect.registerEffect( shadowEffect.effectId, element, shadowEffect.xOffset,
            shadowEffect.yOffset, shadowEffect.blurDeviation, shadowEffect.colorMatrix );
    } );

    // register the default drop shadow filter for tile node
    graphShadowEffect.registerEffect( 'graph-node-drop-shadow', element, 0, 1, 2 );
    graphShadowEffect.registerEffect( 'graph-node-drop-shadow-hover', element, 0, 4, 8, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0' );
    graphShadowEffect.registerEffect( 'graph-node-drop-shadow-selected', element, 0, 4, 8, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0' );

    // register the default drop shadow filter for port
    graphShadowEffect.registerEffect( 'graph-port-drop-shadow', element, 0, 1, 2, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0' );
    graphShadowEffect.registerEffect( 'graph-port-drop-shadow-hover', element, 0, 3, 6, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0' );
    graphShadowEffect.registerEffect( 'graph-port-drop-shadow-selected', element, 0, 3, 6, '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0' );
};

/**
 * Initialize graph object.
 * @param {*} graphModel the graph model
 * @param {*} graphContainer the container element of graph canvas
 * @returns promise resolved to initialize graph
 */
export let initGraph = function( graphModel, graphContainer ) {
    // start performance timer
    var performanceTimer = performanceUtils.createTimer();

    var promises = [];
    var deferred = AwPromiseService.instance.defer();
    // extend DF models to add more useful APIs
    SDFExtension.extend( window.SDF );

    var diagramView = createDiagramView( graphContainer, graphModel.config );

    // LCS-295608 - Not able to move blocks in architecture tab after expand relations
    // Workaround for both customized commands: CustomPanCommand and CreaetPortCommand
    // Prevent the customized command from being hooked multiple times when init graph mulitple times
    var customPanCommandInstance = diagramView.getManager().getCommandManager().getCommand( 'CustomPanCommand' );

    if( !customPanCommandInstance || !customPanCommandInstance.isHooked() ) {
        customPanCommandInstance = new CustomPanCommand();
        customPanCommandInstance.setCursor( 'pan' );
        customPanCommandInstance.setEnabled( true );
        diagramView.registerCommandByInstance( customPanCommandInstance );
    }

    // load CreatePortCommand on demand
    var inputModes = graphModel.inputModes;
    if( inputModes && inputModes.portCreationMode && inputModes.portCreationMode.creatableItem === 'Port' ) {
        var createPortCommandInstance = diagramView.getManager().getCommandManager().getCommand( 'CreatePortCommand' );
        if( !createPortCommandInstance || !createPortCommandInstance.isHooked() ) {
            createPortCommandInstance = new CreatePortCommand();
            createPortCommandInstance.setCursor( 'crosshair' );
            createPortCommandInstance.setEnabled( true );
            diagramView.registerCommandByInstance( createPortCommandInstance );
        }
    }

    initGraphApi( graphModel, diagramView, graphContainer, deferred ).then( function() {
        performanceTimer.endAndLogTimer( 'Graph Load Library', 'graphLoadLibrary' );
    } );

    promises.push( deferred.promise );

    // initialize node templates
    var templatePromise = graphTemplateSrv.loadTemplates( graphModel.nodeTemplates ).then( function( templateMap ) {
        updateNodeTemplates( graphModel, templateMap );
    } );
    promises.push( templatePromise );

    return AwPromiseService.instance.all( promises );
};

export let initOverview = function( graphModel, overviewContainer ) {
    // get overview element
    if( graphModel.graphControl && overviewContainer ) {
        graphModel.graphControl.createOverview( overviewContainer );
    }
};

export let setActiveLayout = function( graphModel, layoutCommandId ) {
    // if no layout supported.
    if( !graphModel.config.layout ) {
        logSvc.warn( 'No layout configured in your settings, option cancelled' );
        return;
    }

    var option = graphConstants.LayoutOptions[ layoutCommandId ] || 'TopToBottom';
    graphModel.config.layout.defaultOption = option;

    // apply common layout functions
    var layout = graphModel.graphControl.layout;
    if( layout ) {
        var isActive = layout.isActive();
        graphLayoutSrv.setLayoutOption( layout, option );
        layout.applyLayout();
        if( !isActive ) {
            // make edge routing without layout active
            if( layout.activate && layout.deactivate ) {
                layout.activate();
                layout.deactivate();
            }
        }
        graphModel.graphControl.fitGraph();
    }
};

export let clearGraph = function( graphModel ) {
    if( graphModel && graphModel.graphControl ) {
        graphModel.graphControl.clear();
    }
};

export default exports = {
    initGraph,
    initOverview,
    setActiveLayout,
    clearGraph
};
/**
 * The graph service
 *
 * @member graphService
 * @memberof NgServices
 */
app.factory( 'awGraphService', () => exports );
