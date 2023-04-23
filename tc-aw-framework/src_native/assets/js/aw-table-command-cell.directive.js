// Copyright (c) 2020 Siemens

/**
 * This directive supports commands inside table cells
 *
 * @module js/aw-table-command-cell.directive
 */
import app from 'app';
import parsingUtils from 'js/parsingUtils';
import 'js/aw-property-val.directive';
import 'js/aw-list-command.directive';
import 'js/aw-icon.directive';
import 'js/aw-table-command-bar.directive';
import 'js/awTableService';
import 'js/aw-clickable-title.directive';

/* eslint-disable-next-line valid-jsdoc*/
/**
 * Definition for the 'aw-table-command-cell' directive used for as a container for the edit & non-edit property
 * directives.
 *
 * @example <aw-table-command-cell prop="prop" commands="commands" vmo="vmo" ></aw-table-command-cell>
 *
 * @member aw-table-command-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awTableCommandCell', [ 'awTableService', function( awTableSvc ) {
    /* eslint-disable-next-line valid-jsdoc*/
    /**
     * Controller used for prop update or pass in using &?
     *
     * @param {Object} $scope - The allocated scope for this controller
     */
    function myController( $scope, $element ) {
        $scope.startEdit = function( event ) {
            awTableSvc.handleCellStartEdit( $scope, $element, event );
        };

        $scope.stopEdit = function( event ) {
            awTableSvc.handleCellStartEdit( $scope, $element, event );
        };

        /**
         * During construction we want to have multi-select OFF by default.
         */
        $scope.dataProvider = parsingUtils.parentGet( $scope, 'dataprovider' );

        /**
         * Create context for nested command bar
         *
         * Watch is necessary as cells are not recreated (making new controller) again when scrolling. The $scope
         * values will just change.
         *
         * Creating anonymous object in the view also does not work as it triggers command bar binding every digest
         * cycle (object identity is never the same)
         */
        $scope.commandContext = {
            vmo: $scope.vmo
        };
        $scope.$watch( 'vmo', function() {
            // $scope.commandContext cannot change - object is used directly by GWT
            // this whole watch could be removed once GWT is gone - zero compile does not need it
            $scope.commandContext.vmo = $scope.vmo;
        } );
    }

    myController.$inject = [ '$scope', '$element' ];

    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            prop: '<',
            commands: '<',
            vmo: '<',
            row: '<',
            rowindex: '<',
            anchor: '<?',
            modifiable: '@?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-table-command-cell.directive.html',
        controller: myController
    };
} ] );
