// Copyright (c) 2019 Siemens

/* global
 define
 */

/**
 * Directive to display graph canvas
 *
 * @module js/aw-graph.directive
 */
import app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logSvc from 'js/logger';
import internalGraphUtils from 'js/internalGraphUtils';
import graphDataProviderSvc from 'js/graphDataProviderService';
import graphLegendService from 'js/graphLegendService';
import 'js/appCtxService';
import 'js/performanceUtils';
import 'js/awGraphService';
import 'js/aw-graph.controller';
import 'js/aw-icon.directive';
import 'js/aw-popup-panel.directive';
import 'js/aw-popup-command-list.directive';

'use strict';

/**
 * Directive to display graph canvas
 */
app.directive( 'awGraph', [ 'awGraphService', 'appCtxService', 'commandService',
    function( awGraphService, appCtxService, commandService ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                graphModel: '=',
                legendData: '=?',
                isMain: '=?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-graph.directive.html',
            controller: 'awGraphController',
            link: function( $scope, $element ) {
                var graphContainer = $element.find( '.aw-graph-container' );
                // prevent default context click
                graphContainer[ 0 ].addEventListener( 'contextmenu', function( evt ) {
                    evt.preventDefault();
                } );

                // Register the graph context only for main graph
                if( $scope.isMain ) {
                    // check for the uniqueness of main graph
                    if( appCtxService.getCtx( 'graph.graphModel' ) ) {
                        throw 'There are more than one main graphs, only one main graph allowed.';
                    }

                    appCtxService.registerCtx( 'graph', {
                        graphModel: $scope.graphModel,
                        legendData: $scope.legendData,
                        legendTabs: $scope.legendTabs,
                        legendState: $scope.legendState,
                        commandContextItem: null
                    } );
                } else if( !appCtxService.getCtx( 'graph' ) ) {
                    appCtxService.registerCtx( 'graph', {} );
                }

                // init graph data provider if exist
                var graphDPListener = null;
                var graphDataProvider = $scope.graphModel.graphDataProvider;
                if( graphDataProvider ) {
                    graphDataProviderSvc.init( $scope.graphModel, graphDataProvider );
                    graphDPListener = eventBus.subscribe( graphDataProvider.name + '.graphDataLoaded', function( context ) {
                        if( context.graphData ) {
                            graphDataProvider.drawGraph( context.graphData );
                        }
                    } );
                }

                // initialize graph and fire "awGraph.initialized" event when graph initialization completed.
                awGraphService.initGraph( $scope.graphModel, graphContainer[ 0 ] ).then( function() {
                    if( $scope.graphModel.config.showOverview ) {
                        var overviewContainer = $element.find( '.aw-graph-overviewContainer' );
                        awGraphService.initOverview( $scope.graphModel, overviewContainer[ 0 ] );

                        // Disable the overview toggle button to get the tab stop temporarily
                        var eleList = overviewContainer[0].nextElementSibling.querySelectorAll( '[type="button"]' );
                        _.forEach( eleList, ( item ) => {
                            item.setAttribute( 'tabindex', -1 );
                        } );
                    }

                    if( $scope.graphModel.graphControl ) {
                        $scope.graphModel.graphControl.setViewportSize( $element.width(), $element.height() );
                    }

                    if( !$scope.legendData ) {
                        $scope.graphModel.initialized = true;
                    }

                    internalGraphUtils.publishGraphEvent( $scope.graphModel, 'awGraph.initialized' );
                } ).catch( function( error ) {
                    logSvc.error( 'Failed to initialize graph.', error );
                } );

                var graphLegendSvc = null;
                var onItemCreateHandled = null;
                if( $scope.legendData && $scope.legendState ) {
                    // update creation mode on 'awGraph.itemCreateHandled' event
                    // the creation mode still need be updated even legend panel is closed
                    graphLegendSvc = graphLegendService;
                    onItemCreateHandled = eventBus.subscribe( 'awGraph.itemCreateHandled', function( eventData ) {
                        if( eventData.sourceGraph === $scope.graphModel ) {
                            graphLegendService.updateCreationMode( $scope.graphModel, $scope.legendState );
                        }
                    } );

                    $scope.$watch( 'legendData.legendViews.length', function( newValue ) {
                        if( newValue && newValue > 0 ) {
                            // initialize legend state
                            graphLegendService.initLegendActiveView( $scope.legendData, $scope.legendState );

                            if( !$scope.graphModel.initialized ) {
                                $scope.graphModel.initialized = true;
                            }
                        }
                    } );
                }

                $scope.$watch( 'graphModel.config.inputMode', function( newValue ) {
                    if( !newValue ) {
                        return;
                    }

                    var graphControl = $scope.graphModel.graphControl;
                    var inputModes = $scope.graphModel.inputModes;
                    if( graphControl && inputModes && newValue ) {
                        var inputModeConfig = inputModes[ newValue ];
                        graphControl.updateInputMode( inputModeConfig );
                    }

                    // reset creation category in legend state
                    if( $scope.legendState && graphLegendSvc && ( newValue === 'viewInputMode' || newValue === 'editInputMode' ) ) {
                        graphLegendSvc.updateCreationCategory( $scope.graphModel, $scope.legendState );
                    }
                } );

                // update view port on graph container resizing
                $scope.$watch( function() {
                    return String( $element.width() ) + ';' + $element.height();
                }, function( newValue ) {
                    if( $scope.graphModel.graphControl ) {
                        $scope.graphModel.graphControl.setViewportSize( $element.width(), $element.height() );
                    }
                } );

                // execute tile node command
                var tileCommandListener = eventBus.subscribe( 'awGraph.executeTileCommand', function( context ) {
                    if( context.sourceGraph !== $scope.graphModel || !context.commandId || !context.commandElement ) {
                        return;
                    }

                    var commandElemRect = context.commandElement.getBoundingClientRect();

                    $scope.executeCommand( context.commandId, context.node, commandElemRect, context.commandElement );
                } );

                var contextMenuListener = eventBus.subscribe( 'awGraph.showContextMenu', function( context ) {
                    if( context.sourceGraph !== $scope.graphModel || !context.groupCommandId || !context.relativeRect ) {
                        return;
                    }

                    $scope.executeCommand( context.groupCommandId, context.graphItem, context.relativeRect );
                } );

                // hide overlay node and context menu if view port changed
                var viewPortChangedListener = eventBus.subscribe( 'awGraph.viewportChanged', function() {
                    // hide the overlay node after click tile command on overlay node
                    $scope.graphModel.graphControl.hideOverlayNode();

                    // hide graph context menu
                    var eventData = {
                        popupUpLevelElement: $element.find( '.aw-graph-contextMenu' )
                    };
                    $scope.$broadcast( 'awPopupWidget.close', eventData );
                } );

                // and unregister on destroy
                $scope.$on( '$destroy', function() {
                    if( $scope.isMain ) {
                        appCtxService.unRegisterCtx( 'graph' );
                    }
                    if( onItemCreateHandled ) {
                        eventBus.unsubscribe( onItemCreateHandled );
                    }
                    if( graphDPListener ) {
                        eventBus.unsubscribe( graphDPListener );
                    }

                    eventBus.unsubscribe( tileCommandListener );
                    eventBus.unsubscribe( contextMenuListener );
                    eventBus.unsubscribe( viewPortChangedListener );

                    // destroy graph control object
                    var graphControl = $scope.graphModel.graphControl;
                    if( graphControl ) {
                        graphControl.destroy();
                        $scope.graphModel.graphControl = null;
                    }
                } );
            },
            replace: true
        };
    }
] );
