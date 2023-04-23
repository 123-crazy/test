// Copyright (c) 2020 Siemens

/**
 * @module js/aw-compare.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import 'js/functionalUtility.service';
import 'js/aw-compare.controller';
import 'js/aw-icon.directive';
import 'ui.grid';

// eslint-disable-next-line valid-jsdoc
/**
 * Directive to objects in compare view
 *
 * @example <aw-compare dataprovider="dataprovider" column-provider="columnProvider"></aw-compare>
 *
 * @member aw-compare
 * @memberof NgElementDirectives
 *
 * @deprecated afx@4.0.0, use aw-compare2 instead.
 * @alternative aw-compare2
 * @obsoleteIn afx@6.0.0
 */
app.directive( 'awCompare', [ 'functionalUtilityService', '$ocLazyLoad', function( functional, $ocLazyLoad ) {
    return {
        restrict: 'E',
        scope: {
            // Fixed list of columns to use with compare
            columns: '=?',
            // Or a provider to use to load the columns
            columnProvider: '=?',
            // Data provider to use to load the VMO
            dataprovider: '=',
            // grid options
            gridOptions: '=?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-compare.directive.html',
        controller: 'awCompareGridController',
        link: function( $scope, $element, attrs, ctrl ) {
            /**
             * Refresh the grid with the current objects and columns
             */
            var refreshGrid = function() {
                ctrl.refreshGridData( $scope.dataprovider.getViewModelCollection().getLoadedViewModelObjects(), $scope.columns );
            };

            /**
             * Reload compare - reload data (not columns)
             *
             * @param {Column[]} columns New columns
             */
            var setColumns = function( columns ) {
                $scope.columns = columns;
                if( $scope.dataprovider.json.firstPage ) {
                    delete $scope.dataprovider.json.firstPage;
                }
                // Update the property policy
                ctrl.updatePropertyPolicy( columns );
                $scope.dataprovider.initialize( $scope );
                refreshGrid();
            };

            /**
             * Reset compare - reload columns and data
             */
            var reset = function() {
                if( $scope.columnProvider.loadColumnAction ) {
                    ctrl.doLoadColumnAction( $scope.columnProvider.loadColumnAction )
                        .then( setColumns );
                } else {
                    setColumns( $scope.columns );
                }
            };

            // Event subscriptions to remove on $destroy
            var eventSubDefs = [];

            // Fired when an external tool (such as a command panel) wants to reset the data provider (and selection)
            eventSubDefs.push( eventBus.subscribe( $scope.dataprovider.name + '.reset', reset ) );
            $scope.$on( 'dataProvider.reset', reset );

            $scope.$on( '$destroy', function() {
                // Remove event listeners
                eventSubDefs.map( eventBus.unsubscribe );
                // Remove property policy
                ctrl.updatePropertyPolicy();

                // AW-65681 Fire tableDestroyed event so that arrange panel can be closed
                eventBus.publish( 'tableDestroyed' );
            } );

            $ocLazyLoad.load( [ {
                name: 'ui.grid'
            }, {
                name: 'ui.grid.resizeColumns'
            }, {
                name: 'ui.grid.moveColumns'
            }, {
                name: 'ui.grid.pinning'
            }, {
                name: 'ui.grid.cellNav'
            }, {
                name: 'ui.grid.autoResize'
            } ] ).then( function() {
                import( 'js/aw-table-auto-resize.directive' ).then( function() {
                    // Show the first column in Arrange panel
                    $scope.showFirstColumnInArrange = true;

                    // Automatically add expected classes to avoid lots of step defs + css updates
                    $element.addClass( 'aw-widgets-compareContainer aw-jswidgets-commonGrid' );

                    // Whenever a new object is displayed in aw-compare
                    $scope.$watchCollection( $scope.dataprovider.getViewModelCollection().getLoadedViewModelObjects, refreshGrid );

                    // Refresh the grid whenever the columns change
                    $scope.$watch( 'columns', refreshGrid );

                    // If there is a column provider
                    if( $scope.columnProvider ) {
                        eventSubDefs.push( eventBus.subscribe( 'columnArrange', function( eventData ) {
                            if( eventData.name === $scope.columnProvider.columnConfigId ) {
                                $scope.arrangeEvent = eventData;
                                if( eventData.arrangeType === 'reset' ) {
                                    ctrl.doLoadColumnAction( $scope.columnProvider.resetColumnAction )
                                        .then( setColumns );
                                } else {
                                    // Update columns
                                    $scope.columns = eventData.columns.map( function( column ) {
                                        return {
                                            field: column.propertyName,
                                            name: column.propertyName,
                                            columnOrder: column.columnOrder,
                                            visible: column.hiddenFlag !== true,
                                            pixelWidth: column.pixelWidth,
                                            sortDirection: column.sortDirection,
                                            sortPriority: column.sortPriority,
                                            typeName: column.typeName,
                                            displayName: column.displayName,
                                            sortBy: column.sortByFlag
                                        };
                                    } );
                                    refreshGrid();

                                    // Save new column config
                                    ctrl.doLoadColumnAction( $scope.columnProvider.saveColumnAction );
                                }
                            }
                        } ) );
                    } else {
                        var columnConfigId = $scope.dataprovider.name + 'Compare';
                        $scope.columnProvider = {
                            columnConfigId: columnConfigId
                        };
                        eventSubDefs.push( eventBus.subscribe( 'columnArrange', function( eventData ) {
                            if( eventData.name === columnConfigId ) {
                                // Reorder and update columns
                                // Because the event data is required to be the direct input to a SOA it does not set all properties again (ex display name)
                                var newColumnOrderByName = eventData.columns.map( functional.getProp( 'propertyName' ) );
                                $scope.columns.sort( function( a, b ) {
                                    return newColumnOrderByName.indexOf( a.name ) - newColumnOrderByName.indexOf( b.name );
                                } );
                                eventData.columns.forEach( function( newColData, idx ) {
                                    var currentColData = $scope.columns[ idx ];
                                    currentColData.visible = newColData.hiddenFlag !== true;
                                    currentColData.pixelWidth = newColData.pixelWidth;
                                    currentColData.columnOrder = newColData.columnOrder;
                                    currentColData.sortDirection = newColData.sortDirection;
                                    currentColData.sortPriority = newColData.sortPriority;
                                } );
                                refreshGrid();
                            }
                        } ) );
                    }
                } );
            } );
        }
    };
} ] );
