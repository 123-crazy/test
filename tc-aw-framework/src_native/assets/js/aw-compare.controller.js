// Copyright (c) 2020 Siemens

/**
 * @module js/aw-compare.controller
 */
import app from 'app';
import 'js/compare.service';
import 'js/selectionModelFactory';
import 'js/functionalUtility.service';
import 'soa/kernel/propertyPolicyService';
import 'js/declDataProviderService';
import 'js/viewModelService';

// eslint-disable-next-line valid-jsdoc
/**
 * Controller for aw-compare
 */
app.controller( 'awCompareGridController', [
    '$scope', 'compareService2', 'selectionModelFactory', 'functionalUtilityService',
    'soa_kernel_propertyPolicyService', 'declDataProviderService', 'viewModelService',
    function AwCompareController( $scope, compareService, selectionModelFactory, functional,
        propertyPolicyService, declDataProviderService, viewModelService ) {
        var self = this;

        /**
         * The scope that will be used to execute commands. Is manually created and destroyed.
         */
        var commandScope = null;

        /**
         * Build and register a property policy for the current columns so properties are not unloaded
         *
         * @param {*} columns The column data
         */
        self.updatePropertyPolicy = function( columns ) {
            if( self._propertyPolicyId ) {
                propertyPolicyService.unregister( self._propertyPolicyId );
                self._propertyPolicyId = null;
            }
            if( columns ) {
                var policyTypes = columns
                    .filter( functional.getProp( 'typeName' ) )
                    .map( function( column ) {
                        return {
                            name: column.typeName,
                            properties: [ {
                                name: column.name || column.propertyName
                            } ]
                        };
                    } );
                self._propertyPolicyId = propertyPolicyService.register( {
                    types: policyTypes
                } );
            }
        };

        /**
         * Refresh the grid data - rebuild rows and columns
         *
         * @param {*} viewModelObjects The view model objects to display
         * @param {*} columns The column data
         */
        self.refreshGridData = function( viewModelObjects, columns ) {
            if( viewModelObjects && viewModelObjects.length && columns && columns.length ) {
                columns.forEach( function( column ) {
                    column.visible = !column.hasOwnProperty( 'visible' ) || column.visible;
                } );

                var visibleColumns = columns.filter( functional.getProp( 'visible' ) );

                if( !$scope.gridOptions ) {
                    $scope.gridOptions = compareService.getBaseGridOptions();
                    commandScope = $scope.$new( true );
                    commandScope.localContext = {
                        columns: $scope.columns,
                        columnProvider: $scope.columnProvider,
                        dataProvider: $scope.dataprovider
                    };
                    compareService.includeCommands( $scope.gridOptions, 'aw_compare', commandScope );
                }
                // Update rows
                $scope.gridOptions.data = visibleColumns.map( compareService.getRowBuilder( viewModelObjects, self.getSelectionModel() ) );
                // Update columns
                $scope.gridOptions.columnDefs = [ compareService.getFirstColumn( $scope.gridOptions ) ].concat(
                    viewModelObjects.map( compareService.getColumnBuilder( self.getSelectionModel() ) ) );
            } else {
                // Remove the grid if no columns or no VMO
                $scope.gridOptions = null;
                if( commandScope ) {
                    commandScope.$destroy();
                }
            }
            self.updateSelection();
        };

        /**
         * Update selection on the grid
         *
         * @param {Boolean} emitEvents - Whether to emit selection events
         */
        self.updateSelection = function( emitEvents ) {
            var selectionModel = self.getSelectionModel();
            if( $scope.gridOptions ) {
                $scope.gridOptions.columnDefs.slice( 1 )
                    .map( function( column ) {
                        column.awColMaster.selected = selectionModel.isSelected( column.awColMaster );
                    } );

                if( emitEvents ) {
                    var selected = $scope.gridOptions.columnDefs.slice( 1 )
                        .map( functional.getProp( 'awColMaster' ) )
                        .filter( functional.getProp( 'selected' ) );
                    $scope.$emit( 'dataProvider.selectionChangeEvent', {
                        selectionModel: selectionModel,
                        selected: selected
                    } );
                }
            }
        };

        /**
         * Get the current selection model
         *
         * @returns {*} Selection model
         */
        self.getSelectionModel = function() {
            if( $scope.dataprovider ) {
                return $scope.dataprovider.selectionModel;
            }
            if( !$scope.selectionModel ) {
                // Default compare selection model is single select tracked by UID
                $scope.selectionModel = selectionModelFactory.buildSelectionModel( 'single', function( input ) {
                    if( typeof input === 'string' ) {
                        return input;
                    }
                    return input.uid;
                } );
            }
            return $scope.selectionModel;
        };

        /**
         * Do a column load action
         *
         * @param {String} loadActionName The load action
         *
         * @returns {Promise} Promise resolved with the new columns
         */
        self.doLoadColumnAction = function( loadActionName ) {
            var declViewModel = viewModelService.getViewModel( $scope, true );
            var loadAction = declViewModel.getAction( loadActionName );
            return declDataProviderService.executeLoadAction( loadAction, {}, $scope ).then( function() {
                return $scope.columnProvider.columns.map( function( column ) {
                    return {
                        field: column.propDescriptor.propertyName,
                        name: column.propDescriptor.propertyName,
                        columnOrder: column.columnOrder,
                        visible: column.hiddenFlag !== true,
                        pixelWidth: column.pixelWidth,
                        sortDirection: column.colDefSortDirection,
                        sortPriority: column.sortPriority,
                        typeName: column.columnSrcType || column.propDescriptor.srcObjectTypeName,
                        displayName: column.propDescriptor.displayName,
                        sortBy: column.propDescriptor.sortByFlag
                    };
                } );
            } );
        };
    }
] );
