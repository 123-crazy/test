// Copyright (c) 2020 Siemens

/**
 * @module js/aw-tile.controller
 */
import { set } from 'lodash';
import app from 'app';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import 'js/tileService';
import 'js/localeService';
import wcagSvc from 'js/wcagService';

/**
 * Controller referenced from the 'div' <aw-tile>
 *
 * @memberof NgController
 * @member awTileController
 *
 * @param {$scope} $scope - Service to use
 * @param {$element} tileSvc - Service to use
 * @param {object} localeService - Service to use
 */
app.controller( 'awTileController', [
    '$scope',
    'tileService',
    'localeService',
    function( $scope, tileSvc, localeService ) {
        var self = this; //eslint-disable-line

        $scope.colorClassNames = [ 'aw-theme-adminLocationsTile', 'aw-theme-pinnedObjectsTile',
            'aw-theme-locationsTile', 'aw-theme-commandsActionsTile', 'aw-theme-savedSearchesTile'
        ];
        $scope.textClassNames = [ 'aw-theme-tileText', 'aw-theme-tileText',
            'aw-theme-tileText', 'aw-theme-tileText', 'aw-theme-tileText'
        ];
        $scope.resizeSvgNames = {
            makeSmall: 'homeLeftArrowMakeSmall',
            makeMedium: 'homeUpLeftArrowMakeLarge',
            makeLarge: 'homeDownRightArrowMakeMedium'
        };

        $scope.i18n = {};
        localeService.getLocalizedText( 'UIMessages', 'unpinCommandTitle' ).then( x => set( $scope.i18n, 'unpin', x ) );
        localeService.getLocalizedText( 'UIMessages', 'resizeCommandTitle' ).then( x => set( $scope.i18n, 'resize', x ) );

        /**
         * Evaluate resize svg name according to tileSize
         */
        self.evaluateResizeSvg = function() {
            if( $scope.tile ) {
                if( $scope.tile.tileSize === 0 ) {
                    $scope.resizeSvg = $scope.resizeSvgNames.makeLarge;
                } else if( $scope.tile.tileSize === 1 ) {
                    $scope.resizeSvg = $scope.resizeSvgNames.makeSmall;
                } else if( $scope.tile.tileSize === 2 ) {
                    $scope.resizeSvg = $scope.resizeSvgNames.makeMedium;
                }
            }
        };

        /**
         * Start edit for gateway tiles
         */
        $scope.startEdit = function() {
            $scope.$evalAsync( function() {
                $scope.$emit( 'gateway.editing', { tile: $scope.tile } );
            } );
        };

        /**
         * Handle click event for gateway tile
         */
        $scope.openLocation = function() {
            if( !parsingUtils.parentGet( $scope, 'isGatewayInEditMode' ) ) {
                tileSvc.performAction( $scope.tile.action, $scope );
            }
            $scope.$emit( 'gateway.tileClick', { tile: $scope.tile, dataCtxNode: $scope } );
        };

        /**
         * Handler for 'resize' button, change tile size accordingly and update resize svg name
         *
         * @param {Event} $event - event object
         */
        $scope.toggleTileSize = function( $event ) {
            $event.stopPropagation();
            $scope.tile.isDirty = true;

            if( $scope.tile.tileSize === 1 ) {
                $scope.tile.tileSize = 0;
            } else if( $scope.tile.tileSize === 2 ) {
                $scope.tile.tileSize = 1;
            } else {
                $scope.tile.tileSize = 2;
            }

            self.evaluateResizeSvg();
        };

        /**
         * Handler for un-pin command on the tile
         *
         * @param {Event} $event - event object
         */
        $scope.removeTile = function( $event ) {
            $event.stopPropagation();
            $scope.tile.isDirty = true;

            eventBus.publish( 'gateway.unpinTile', $scope.tile );
        };

        /**
         * Launch tile from keyboard
         *
         * @param {Event} $event - event object
         */
        $scope.handleKeyPress = function( $event ) {
            if ( wcagSvc.isValidKeyPress( $event ) ) {
                $scope.openLocation();
            }
        };

        self.evaluateResizeSvg();
    }
] );
