// Copyright (c) 2020 Siemens

/**
 * @module js/aw-compare2.directive
 */
import 'js/aw-splm-table.directive';
import viewModelSvc from 'js/viewModelService';
import app from 'app';

/**
 * This directive is the root of a compare table, which implements aw-splm-table
 * with the necessary options for compare.
 *
 * @example <aw-compare2 gridid="declGridId"></aw-compare2>
 *
 * @member aw-compare2
 * @memberof NgElementDirectives
 */
app.directive( 'awCompare2', [
    function() {
        return {
            restrict: 'E',
            scope: {
                gridid: '@',
                containerHeight: '<?'
            },
            template: '<aw-splm-table gridid="{{gridid}}" container-height=containerHeight>',
            transclude: false,
            replace: false,
            controller: [ '$scope', function( $scope ) {
                if( $scope.gridid ) {
                    const declViewModel = viewModelSvc.getViewModel( $scope, true );
                    const declGrid = declViewModel.grids[ $scope.gridid ];
                    declGrid.addIconColumn = declGrid.addIconColumn ? declGrid.addIconColumn : false;
                    if( !declGrid.gridOptions ) {
                        declGrid.gridOptions = {};
                    }
                    const gridOptions = declGrid.gridOptions;
                    gridOptions.transpose = true;
                    gridOptions.enableHeaderIcon = gridOptions.enableHeaderIcon !== false;
                    gridOptions.enableDragAndDrop = false;
                }
            } ]
        };
    }
] );
