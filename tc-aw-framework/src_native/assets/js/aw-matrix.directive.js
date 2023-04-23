// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * @module js/aw-matrix.directive
 */
import * as app from 'app';
import 'js/viewModelService';
import 'js/aw-table-cell.directive';
import 'js/aw-table-icon-cell.directive';
import 'js/aw-table-command-cell.directive';
import 'js/aw-matrix-cell.directive';
import 'js/aw-fill.directive';
import 'js/aw-right-click.directive';
import 'js/aw-long-press.directive';
import 'js/aw-icon.directive';
import 'js/aw-matrix-column-header.directive';
import 'js/aw-matrix-rowheader.directive';
import 'js/aw-matrix-pinned-column.directive';
import 'js/aw.table.controller';
import 'ui.grid';

'use strict';

/**
 * This directive is the root of a high-functionality matrix (grid) widget.
 *
 * @example <aw-matrix gridid="declGridId"></aw-matrix>
 *
 * @member aw-matrix
 * @memberof NgElementDirectives
 */
app.directive( 'awMatrix', [ 'viewModelService', '$ocLazyLoad', //
    function( viewModelSvc, $ocLazyLoad ) {
        return {
            restrict: 'E',
            controller: 'awTableController',
            scope: {
                gridid: '@',
                showDecorators: '@',
                anchor: '@?'
            },
            templateUrl: app.getBaseUrlPath() + '/html/aw-matrix.directive.html',
            link: function( $scope ) {
                $ocLazyLoad.load( [ {
                    name: 'ui.grid'
                }, {
                    name: 'ui.grid.resizeColumns'
                }, {
                    name: 'ui.grid.cellNav'
                }, {
                    name: 'ui.grid.autoResize'
                }, {
                    name: 'ui.grid.infiniteScroll'
                } ] )
                .then( function() {
                    import( 'js/aw-table-auto-resize.directive' ).then( function() {
                        /**
                         * Check if we are using a 'gridid' in the closest 'declViewModel' in the scope tree.<BR>
                         * If so: Use it to display the aw-matrix data<BR>
                         *
                         * @param {Boolean} firstTime - TRUE if initializing first time, FALSE otherwise
                         */
                        var initializeGrid = function( firstTime ) {
                            if( $scope.gridid ) {
                                var declViewModel = viewModelSvc.getViewModel( $scope, true );
                                var declGrid = declViewModel.grids[ $scope.gridid ];

                                if( declGrid && declGrid.dataProvider ) {
                                    $scope.dataprovider = declViewModel.dataProviders[ declGrid.dataProvider ];

                                    /**
                                     * Delete firstPage results only on dataProvider reset
                                     */
                                    if( !firstTime && $scope.dataprovider.json.firstPage ) {
                                        delete $scope.dataprovider.json.firstPage;
                                    }

                                    viewModelSvc.executeCommand( declViewModel, declGrid.dataProvider, $scope );
                                }
                            }
                        };

                        initializeGrid( true );

                        $scope.$on( 'dataProvider.reset', function() {
                            initializeGrid();
                        } );
                    } );
                } );
            }
        };
    }
] );
