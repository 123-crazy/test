// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 $$
 */

/**
 * The controller for Kanban
 *
 * @module js/aw-kanban.controller
 * @requires app
 */

import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import * as webix from 'webix';
import eventBus from 'js/eventBus';
import ctxService from 'js/appCtxService';
import 'js/viewModelService';
import 'js/awColumnService';

'use strict';

app.controller( 'awKanbanCtrl', [ '$scope', 'appCtxService', 'viewModelService', 'awColumnService', function( $scope, appCtxService, viewModelSvc, awColumnSvc ) {
    window.webix = webix;
    import( 'kanban' ).then( function() {} );
    var draggedObjectPrevIndexMap = {};

    var ctrl = this;
    var declViewModel = viewModelSvc.getViewModel( $scope, true );

    ctrl.readDataProvider = function( $scope ) {
        var declKanban = declViewModel.grids[ $scope.kanbanid ];
        var dataProvider;
        if( declKanban && declKanban.dataProvider ) {
            dataProvider = declViewModel.dataProviders[ declKanban.dataProvider ];
        }
        return dataProvider;
    };

    ctrl.readColumnProvider = function( $scope ) {
        var declKanban = declViewModel.grids[ $scope.kanbanid ];
        var columnProvider;
        if( declKanban && declKanban.columnProvider ) {
            columnProvider = declViewModel.columnProviders[ declKanban.columnProvider ];
        }
        return columnProvider;
    };

    ctrl.onListItemClick = function( itemId, ev, node, list ) {
        var eventData = {
            itemId: itemId,
            ev: ev,
            node: node,
            list: list
        };
        eventBus.publish( $scope.kanbanid + '.cardClicked', eventData );
    };

    ctrl.onAfterDrop = function( dragContext, e, list ) {
        // if we move an item from one list to another
        if( dragContext.from !== dragContext.to ) {
            var eventData = {
                dragContext: _.cloneDeep( dragContext ),
                e: e,
                list: list,
                columnMapping: $scope.columnMapping
            };
            eventBus.publish( $scope.kanbanid + '.onAfterDrop', eventData );
        }
    };

    ctrl.onListBeforeDrop = function( dragContext, e, list ) {
        // if we move an item from one list to another
        if( dragContext.from !== dragContext.to ) {
            var draggedObjects = dragContext.source;
            draggedObjects.forEach( function( object ) {
                var index = dragContext.from.data.order.indexOf( object );
                draggedObjectPrevIndexMap[ object ] = index;
            } );
        }
    };

    ctrl.onListAfterSelect = function( id, state, list ) {
        var selectionSvc = app.getInjector().get( 'selectionService' );
        var selectedObjectUids = state._selected;
        var selectedObjects = [];
        var cdm = app.getInjector().get( 'soa_kernel_clientDataModel' );
        for( var i = 0; i < selectedObjectUids.length; i++ ) {
            var object = cdm.getObject( selectedObjectUids[ i ] );
            if( object ) {
                selectedObjects.push( object );
            }
        }
        if( selectedObjects && selectedObjects.length > 0 ) {
            selectionSvc.updateSelection( selectedObjects );
        }
        var eventData = {
            selectedObjectUids: selectedObjectUids,
            state: state,
            list: list
        };

        eventBus.publish( $scope.kanbanid + '.cardSelected', eventData );
    };

    ctrl.readKanbanConfigAndPrepareProvider = function( $scope, $element ) {
        $scope.ctx = appCtxService.ctx;

        var assureCSSInitialization = function() {
            var cssCheck = $( 'head:first > link' ).filter(
                '[href=\'' + app.getBaseUrlPath() + '/lib/webix/kanban/webix/webix.css\']' ).length;
            if( cssCheck === 0 ) {
                var link = document.createElement( 'link' );
                link.type = 'text/css';
                link.rel = 'stylesheet';
                link.href = app.getBaseUrlPath() + '/lib/webix/kanban/webix/webix.css';
                var linkNode = $( 'head:first > link' );
                document.getElementsByTagName( 'head' )[ 0 ].insertBefore( link, linkNode[ 0 ] );
            }

            cssCheck = $( 'head:first > link' ).filter(
                '[href=\'' + app.getBaseUrlPath() + '/lib/webix/kanban/skins/mini.css\']' ).length;
            if( cssCheck === 0 ) {
                var link = document.createElement( 'link' );
                link.type = 'text/css';
                link.rel = 'stylesheet';
                link.href = app.getBaseUrlPath() + '/lib/webix/kanban/skins/mini.css';
                var linkNode = $( 'head:first > link' );
                document.getElementsByTagName( 'head' )[ 0 ].insertBefore( link, linkNode[ 0 ] );
            }
        };

        if( $scope.kanbanid ) {
            var declViewModel = viewModelSvc.getViewModel( $scope, true );
            var declKanban = declViewModel.grids[ $scope.kanbanid ];
            if( declKanban && declKanban.dataProvider ) {
                var dataProvider = declViewModel.dataProviders[ declKanban.dataProvider ];
                var columnProvider = awColumnSvc.createColumnProvider( declViewModel, $scope,
                    dataProvider.commands, $scope.kanbanid, dataProvider.json.commandsAnchor );

                $scope.dataprovider = dataProvider;
                assureCSSInitialization();
                $scope.kanbanOptions = declKanban.gridOptions;
                var providerPromise = initializeProvider( dataProvider, columnProvider, declViewModel );
                registerEventListeners( $element );
                return providerPromise;
            }
        }

        //And remove it when the scope is destroyed
        $scope.$on( '$destroy', function() {
            // The clean up code will go here
        } );
    };

    var registerEventListeners = function( $element ) {
        eventBus.subscribe( $scope.kanbanid + '.updateCards', function( eventData ) {
            if( eventData.updatedKanbanCards ) {
                var updatedKanbanCards = eventData.updatedKanbanCards;
                updatedKanbanCards.forEach( function( card ) {
                    var id = card.id;
                    var kanbanItem = $$( $scope.kanbanid ).getItem( id );
                    if( kanbanItem ) {
                        for( var key in card ) {
                            kanbanItem[ key ] = card[ key ];
                        }
                        $$( $scope.kanbanid ).updateItem( id );
                    }
                } );
            }
        } );
        eventBus.subscribe( $scope.kanbanid + '.resizeKanban', function( eventData ) {
            if( eventData.height ) {
                $$( $scope.kanbanid ).config.height = eventData.height;
            }
            if( eventData.width ) {
                $$( $scope.kanbanid ).config.width = eventData.width;
            }
            $$( $scope.kanbanid ).resize();
            $$( $scope.kanbanid ).resizeChildren();
        } );

        eventBus.subscribe( $scope.kanbanid + '.dragDropFailure', function( eventData ) {
            var dragContext = eventData.data.dragContext;
            var sourceStatus = dragContext.from._settings.status;
            var droppedObjects = eventData.failedUids;
            droppedObjects.forEach( function( object ) {
                var kanbanItem = $$( $scope.kanbanid ).getItem( object );
                if( kanbanItem ) {
                    kanbanItem.status = sourceStatus;
                    $$( $scope.kanbanid ).updateItem( kanbanItem.id );
                    var list = $$( $scope.kanbanid ).getOwnerList( kanbanItem.id );
                    var index = draggedObjectPrevIndexMap[ kanbanItem.id ];
                    if( index >= 0 ) {
                        list.move( kanbanItem.id, index, list );
                    }
                }
            } );
            draggedObjectPrevIndexMap = {};
        } );
    };

    var prepareColumnsForKanban = function( columns ) {
        var kanbanColumns = {};
        var groupColumns = {};
        $scope.columnMapping = {};
        columns.forEach( function( col ) {
            if( col.name !== 'icon' ) {
                if( col.isGroup ) {
                    kanbanColumns[ col.name ] = col;
                } else {
                    if( col.groupID ) {
                        var columnInfo = groupColumns[ col.groupID ];

                        if( !columnInfo ) {
                            columnInfo = [];
                        }
                        columnInfo.push( col );

                        var groupCol = kanbanColumns[ col.groupID ];
                        $scope.columnMapping[ col.name ] = groupCol.groupName;
                        groupColumns[ col.groupID ] = columnInfo;
                    } else {
                        kanbanColumns[ col.name ] = col;
                        $scope.columnMapping[ col.name ] = col.name;
                    }
                }
            }
        } );

        var kanbanLanes = [];
        for( var colName in kanbanColumns ) {
            var col = kanbanColumns[ colName ];
            // kanbanColumns.forEach( function ( col ) {
            var lane = {};
            lane.header = col.displayName;
            var groupCols = groupColumns[ col.name ];
            if( groupCols ) {
                var length = groupCols.length;
                lane.body = {};
                lane.body.cols = [];
                groupCols.forEach( function( grpCol ) {
                    var subLane = {
                        header: grpCol.displayName,
                        body: {
                            status: grpCol.name,
                            multiselect: grpCol.multiselect,
                            view: 'kanbanlist',
                            type: 'cards',
                            minWidth: 250
                        }
                    };
                    lane.body.cols.push( subLane );
                } );
                lane.gravity = length;
                lane.body.type = 'wide';
            } else {
                lane.body = {
                    status: col.name,
                    view: 'kanbanlist',
                    type: 'cards',
                    multiselect: col.multiselect,
                    minWidth: 250
                };
            }
            kanbanLanes.push( lane );
        }
        return kanbanLanes;
    };

    var initializeProvider = function( dataProvider, columnProvider, declViewModel ) {
        return columnProvider.initialize().then( function( columns ) {
            /**
             * Dont re-initialize DP if it already exists
             */
            $scope.kanbanColumns = prepareColumnsForKanban( columns );
            declViewModel.kanbanColumnMap = $scope.columnMapping;
            if( dataProvider.json && dataProvider.json.firstPage ) {
                // Do Nothing
                return null;
            }
            return dataProvider.initialize( $scope ).then( function() {
                if( !dataProvider.cols || dataProvider.cols.length === 0 ) {
                    return columnProvider.buildDynamicColumns( dataProvider.columnConfig.columns, true );
                }
                return null;
            } );
        } );
    };
} ] );
