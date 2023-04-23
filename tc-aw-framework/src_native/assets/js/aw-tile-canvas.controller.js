// Copyright (c) 2020 Siemens

/**
 * @module js/aw-tile-canvas.controller
 */
import app from 'app';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/tileService';
import 'js/tileDragService';

/**
 * Controller referenced from the 'div' <aw-tile-canvas>
 *
 * @memberof NgController
 * @member awTileCanvasController
 *
 * @param {$scope} $scope - Service to use
 * @param {$element} $element - Service to use
 * @param {tileService} tileSvc - Service to use
 * @param {tileDragService} tileDragSvc - Service to use
 */
app.controller( 'awTileCanvasController', [
    '$scope',
    '$element',
    'tileService',
    'tileDragService',
    function( $scope, $element, tileSvc, tileDragSvc ) {
        var self = this; //eslint-disable-line
        $scope.isGatewayInEditMode = false;

        var panelElement = $( $element[ 0 ] ).find( '.aw-tile-tileCanvasPanel' )[ 0 ];
        $scope.dummyTileGroup = { tiles: [] };

        /**
         * Retrieve the correct tile reference object based off order number of the input parameter
         *
         * @param {Object} tile - tile object
         * @param {Object} groupIndex - group index to find the tile reference object
         * @returns {Object} reference of tile object from tileGroups array
         */
        self.retrieveTileInTileGroup = function( tile, groupIndex ) {
            var retrievedTile;

            if( $scope.tileGroups[ groupIndex ] && !_.isEmpty( $scope.tileGroups[ groupIndex ].tiles ) ) {
                _.forEach( $scope.tileGroups[ groupIndex ].tiles, function( tileObj ) {
                    if( _.isEqual( tileObj, tile ) ) {
                        retrievedTile = tileObj;
                        return false;
                    }
                } );
            }

            return retrievedTile;
        };

        /**
         * Retrieve tileGroup reference object based off the input parameter groupName
         *
         * @param {Object} groupName - group name
         * @returns {Object} reference of tileGroup object from tileGroups array
         */
        self.getTileGroup = function( groupName ) {
            var tileGroupIn;

            _.forEach( $scope.tileGroups, function( tileGroup ) {
                if( tileGroup.groupName === groupName ) {
                    tileGroupIn = tileGroup;
                    return false;
                }
            } );

            return tileGroupIn;
        };

        /**
         * Reorder within same tile group
         *
         * @param {Object} sourceTile - dragged tile object
         * @param {Number} sourceTileIndx - dragged tile index in tiles array
         * @param {Number} targetTile - targetTile - drop target tile object
         * @param {Number} targetTileGroup - dragged/drop target tile group object (dragged and drop tile group will be same here)
         * @param {Number} targetBaseOrder - base order for drop target tile
         * @param {Boolean} inPlace - drop tile in place or after the tile
         */
        self.reOrderInSameGroup = function( sourceTile, sourceTileIndx, targetTile, targetTileGroup, targetBaseOrder, inPlace ) {
            if( targetTileGroup ) {
                targetTileGroup.tiles.splice( sourceTileIndx, 1 );

                var targetTileIndx = targetTileGroup.tiles.indexOf( targetTile );
                if( inPlace ) {
                    targetTileGroup.tiles.splice( targetTileIndx, 0, sourceTile );
                } else {
                    targetTileGroup.tiles.splice( targetTileIndx + 1, 0, sourceTile );
                }

                _.forEach( targetTileGroup.tiles, function reorderTiles( tile, index ) {
                    if( tile ) {
                        tile.orderNumber = targetBaseOrder + index;
                        tile.isDirty = true;
                    }
                } );
            }
        };

        /**
         * Reorder within different tile groups
         *
         * @param {Object} sourceTile - dragged tile object
         * @param {Number} sourceTileIndx - dragged tile index in tiles array
         * @param {Number} sourceGroupIndx - dragged tile group index
         * @param {Number} targetTileIndx - drop target tile index in tiles array
         * @param {Number} targetGroupIndx - drop target tile group index
         * @param {Number} targetBaseOrder - base order for drop target tile
         * @param {Boolean} inPlace - drop tile in place or after the tile

         */
        self.reOrderInDifferentGroup = function( sourceTile, sourceTileIndx, sourceGroupIndx, targetTileIndx,
            targetGroupIndx, targetBaseOrder, inPlace ) {
            var sourceBaseOrder = tileDragSvc.getBaseOrder( sourceTile.orderNumber );
            var srcGroup = $scope.tileGroups[ sourceGroupIndx ];
            var targetGroup = $scope.tileGroups[ targetGroupIndx ];
            // remove tile from source group
            srcGroup.tiles.splice( sourceTileIndx, 1 );
            // add tile to target group
            if( inPlace ) {
                targetGroup.tiles.splice( targetTileIndx, 0, sourceTile );
            } else {
                targetGroup.tiles.splice( targetTileIndx + 1, 0, sourceTile );
            }

            // modify order in source group
            srcGroup.tiles.map( function( tile, index ) {
                tile.orderNumber = sourceBaseOrder + index;
                tile.isDirty = true;
                return tile;
            } );

            // modify order in target group
            targetGroup.tiles.map( function( tile, index ) {
                tile.orderNumber = targetBaseOrder + index;
                tile.isDirty = true;
                return tile;
            } );
        };

        /**
         * Create new tile group when the drop target is separator between tile groups
         *
         * @param {Object} sourceTile - dragged tile object
         * @param {String} sourceGroupName - dragged tile's group name
         * @param {Object} targetTileGroup - drop target tile group
         */
        self.createNewTileGroup = function( sourceTile, sourceGroupName, targetTileGroup ) {
            var sourceGroup = self.getTileGroup( sourceGroupName );
            var sourceGroupIndx = $scope.tileGroups.indexOf( sourceGroup );
            var targetGroupIndx = $scope.tileGroups.indexOf( targetTileGroup );

            var sourceTileIn = self.retrieveTileInTileGroup( sourceTile, sourceGroupIndx );
            var sourceTileIndx = $scope.tileGroups[ sourceGroupIndx ].tiles.indexOf( sourceTileIn );

            var baseOrder = 0;
            var newGroupIncrement = 100;
            if( targetTileGroup && targetTileGroup.tiles.length > 0 ) {
                baseOrder = tileDragSvc.getBaseOrder( targetTileGroup.tiles[ 0 ].orderNumber );
            }

            // remove tile from source group
            var srcGroup = $scope.tileGroups[ sourceGroupIndx ];
            srcGroup.tiles.splice( sourceTileIndx, 1 );

            var srcGroupNull = false;
            // If we removed the last tile in the group
            if( srcGroup.tiles.length === 0 ) {
                srcGroupNull = true;
            }

            // create new group using current time
            var newGroup = {};
            newGroup.groupName = 'group' + new Date().getTime();

            // add sourceTile to newly created group
            newGroup.tiles = [];
            newGroup.tiles.push( sourceTileIn );

            newGroup.tiles.map( function( tile, indx ) {
                tile.orderNumber = baseOrder + newGroupIncrement + indx;
                tile.isDirty = true;
                return tile;
            } );

            // update tileGroups array
            if( sourceGroupIndx === targetGroupIndx && srcGroupNull ) {
                $scope.tileGroups.splice( targetGroupIndx, 0, newGroup );
            } else {
                $scope.tileGroups.splice( targetGroupIndx + 1, 0, newGroup );
            }

            var newGroupIndx = $scope.tileGroups.indexOf( newGroup );

            // update order number for all tiles in each and every tile group
            _.forEach( $scope.tileGroups, function( tileGroup, index ) {
                if( index > newGroupIndx && tileGroup.tiles.length > 0 ) {
                    var grpBaseOrder = tileDragSvc.getBaseOrder( tileGroup.tiles[ 0 ].orderNumber );
                    tileGroup.tiles.map( function( tile, indx ) {
                        tile.orderNumber = grpBaseOrder + newGroupIncrement + indx;
                        tile.isDirty = true;
                        return tile;
                    } );
                }
            } );

            $scope.$evalAsync();
        };

        /**
         * Update order of tiles within same tileGroup or other existing tile groups
         *
         * @param {Object} sourceTile - dragged tile object
         * @param {String} sourceGroupName - dragged tile's group name
         * @param {Object} targetTile - drop target tile object
         * @param {Object} targetTileGroup - drop target tile group object
         * @param {Boolean} inPlace - drop tile in place or after the tile
         */
        self.reorderTiles = function( sourceTile, sourceGroupName, targetTile, targetTileGroup, inPlace ) {
            if( targetTile ) {
                var targetTileOrder = targetTile.orderNumber;

                var targetGroupIndx = $scope.tileGroups.indexOf( targetTileGroup );
                var sourceGroup = self.getTileGroup( sourceGroupName );
                var sourceGroupIndx = $scope.tileGroups.indexOf( sourceGroup );
                var sourceTileIn = self.retrieveTileInTileGroup( sourceTile, sourceGroupIndx );

                var sourceTileIndx = $scope.tileGroups[ sourceGroupIndx ].tiles.indexOf( sourceTileIn );
                var targetTileIndx = targetTileGroup.tiles.indexOf( targetTile );
                var targetBaseOrder = tileDragSvc.getBaseOrder( targetTileOrder );

                if( sourceGroupIndx === targetGroupIndx ) { // same group rearrange
                    self.reOrderInSameGroup( sourceTileIn, sourceTileIndx, targetTile, targetTileGroup, targetBaseOrder, inPlace );
                } else { // different group rearrange
                    self.reOrderInDifferentGroup( sourceTileIn, sourceTileIndx, sourceGroupIndx, targetTileIndx,
                        targetGroupIndx, targetBaseOrder, inPlace );
                }

                $scope.$evalAsync();
            }
        };

        var callBackAPIs = {
            /**
             * Define callBackAPI function to create new tile group when the drop target is separator between tile groups
             *
             * @param {Object} sourceTile - dragged tile object
             * @param {String} sourceGroupName - dragged tile's group name
             * @param {Object} targetTileGroup - drop target tile group
             */
            createNewGroup: function( sourceTile, sourceGroupName, targetTileGroup ) {
                self.createNewTileGroup( sourceTile, sourceGroupName, targetTileGroup );
            },

            /**
             * Define callBackAPI function to update order of tiles with same tileGroup or other existing tile groups
             *
             * @param {Object} sourceTile - dragged tile object
             * @param {String} sourceGroupName - dragged tile's group name
             * @param {Object} targetTile - drop target tile object
             * @param {Object} targetTileGroup - drop target tile group object
             * @param {Boolean} inPlace - drop tile in place or after the tile
             *
             */
            updateOrder: function( sourceTile, sourceGroupName, targetTile, targetTileGroup, inPlace ) {
                self.reorderTiles( sourceTile, sourceGroupName, targetTile, targetTileGroup, inPlace );
            }
        };

        /**
         * Find dirty tile and return the information of dirty tile along with the group information where it belongs
         *
         * @return {Object} dirty tiles which contains modified tiles and its respective groups information
         */
        self.findDirtyTiles = function() {
            var dirtyTiles = {};
            dirtyTiles.tiles = [];
            dirtyTiles.groupNames = [];

            _.forEach( $scope.tileGroups, function( tileGroup ) {
                if( tileGroup && tileGroup.tiles ) {
                    _.forEach( tileGroup.tiles, function( tile ) {
                        if( tile && tile.isDirty ) {
                            // reset dirty state and return the tile info
                            delete tile.isDirty;
                            delete tile.$$hashKey;
                            _.forEach( tile.content, function( content ) {
                                if( content ) {
                                    delete content.$$hashKey;
                                }
                            } );

                            dirtyTiles.tiles.push( tile );
                            dirtyTiles.groupNames.push( tileGroup.groupName );
                        }
                    } );
                }
            } );

            return dirtyTiles;
        };

        /**
         * Reset edit flag for all tiles which is similar to cancel edits for gateway
         *
         * @param {Array} tileGroups - array of tile groups
         */
        self.resetTilesEditFlag = function( tileGroups ) {
            _.forEach( tileGroups, function( tileGroup ) {
                if( tileGroup && tileGroup.tiles ) {
                    _.forEach( tileGroup.tiles, function( tile ) {
                        if( tile ) {
                            delete tile.editing;
                        }
                    } );
                }
            } );
        };

        /**
         * Handler for document click that cancels edit functionality for gateway
         *
         * @param {Event} event - event object
         */
        self.handleDocumentClick = function( event ) {
            if( event && event.target ) {
                var isEditingTile = $( event.target ).closest( '.aw-tile-tileContainer' );
                if( !isEditingTile || isEditingTile.length === 0 ) {
                    self.stopEditing();
                    $scope.$evalAsync( function() {
                        $scope.isGatewayInEditMode = false;
                    } );
                }
            }
        };

        /**
         * Start tile edit
         *
         * @param {Event} event - event object
         * @param {Object} eventData - event data which contains tile object
         */
        self.startTileEdit = function( event, eventData ) {
            $scope.isGatewayInEditMode = true;
            self.resetTilesEditFlag( $scope.tileGroups );

            if( eventData ) {
                eventData.tile.editing = true;
            }
            document.removeEventListener( 'click', self.handleDocumentClick );
            document.removeEventListener( 'touchstart', self.handleDocumentClick );

            document.addEventListener( 'click', self.handleDocumentClick );
            document.addEventListener( 'touchstart', self.handleDocumentClick );
            /* remove drag and reorder listeners before setting up */
            tileDragSvc.removeDragAndReorderListeners( panelElement, callBackAPIs );
            tileDragSvc.setupDragAndReorder( panelElement, callBackAPIs );
        };

        /**
         * Cancel editing for gateway tiles
         */
        self.stopEditing = function() {
            self.resetTilesEditFlag( $scope.tileGroups );

            var dirtyTiles = self.findDirtyTiles();
            if( dirtyTiles && dirtyTiles.tiles.length > 0 ) {
                eventBus.publish( 'gateway.updateTile', dirtyTiles );
            }

            document.removeEventListener( 'click', self.handleDocumentClick );
            document.removeEventListener( 'touchstart', self.handleDocumentClick );
            tileDragSvc.removeDragAndReorderListeners( panelElement, callBackAPIs );
        };

        /**
         * Subscription for tile editing
         */
        $scope.$on( 'gateway.editing', function( event, data ) {
            if( data ) {
                self.startTileEdit( event, data );
            }
        } );

        /**
         * Subscription for tile click
         */
        $scope.$on( 'gateway.tileClick', function( event, data ) {
            if( data && $scope.isGatewayInEditMode ) {
                self.resetTilesEditFlag( $scope.tileGroups );
                data.tile.editing = true;
            }
        } );

        /**
         * Subscription for unpin Tile to reset isGatewayInEditMode flag
         */
        var unpinTileSubDef = eventBus.subscribe( 'gateway.unpinTile', function() {
            $scope.isGatewayInEditMode = false;
        } );

        $scope.$on( '$destroy', function() {
            document.removeEventListener( 'click', self.handleDocumentClick );
            document.removeEventListener( 'touchstart', self.handleDocumentClick );
            eventBus.unsubscribe( unpinTileSubDef );

            tileDragSvc.removeDragAndReorderListeners( panelElement, callBackAPIs );
        } ); // $destroy
    }
] );
