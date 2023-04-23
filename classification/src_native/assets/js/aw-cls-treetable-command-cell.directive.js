// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * This directive supports commands inside tree-table cells.
 *
 * @module js/aw-cls-treetable-command-cell.directive
 */
import app from 'app';
import parsingUtils from 'js/parsingUtils';
import 'js/aw-property-non-edit-val.directive';
import 'js/aw-property-val.directive';
import 'js/aw-list-command.directive';
import 'js/aw-icon.directive';
import 'js/aw-table-command-bar.directive';
import 'js/awTableService';
import 'js/editHandlerService';
import 'js/aw-parse-html.directive';


/**
 * Definition for the 'aw-cls-treetable-command-cell' directive used for as a container for the tree navigation column
 * edit & non-edit property directives.
 *
 * @example <aw-cls-treetable-command-cell prop="prop" commands="commands" vmo="vmo" ></aw-cls-treetable-command-cell>
 *
 * @member aw-cls-treetable-command-cell
 * @memberof NgElementDirectives
 */
app.directive( 'awClsTreetableCommandCell', function() {
    /*eslint-disable-next-line valid-jsdoc*/
    /**
     * Controller used for prop update or pass in using &?
     */
    function myController( $scope, uiGridTreeBaseSvc, awTableSvc, editHandlerSvc, appCtxService, localeService ) {
        localeService.getLocalizedText( 'treeTableMessages', 'visibilityControlsTitle' ).then( function( result ) {
            $scope.cellTitle = result;
        } );
        $scope.ctx = appCtxService.ctx;

        /**
         * During construction we want to have 'isMultiSelectEnabled' set by the current state in the dataProvider
         * (or set OFF by default otherwise).
         */
        $scope.dataProvider = parsingUtils.parentGet( $scope, 'dataprovider' );

        /**
         * Called when the expand/collapse twistie in the tree-table comment cell is 'clicked'.
         *
         * @param {Object} row - The object that represents the row in the table being clicked.
         * @param {Object} evt - The click event.
         */
        $scope.treeButtonClick = function( row, evt ) {
            // don't expand leaves and don't expand/collapse during edit
            if( !row.entity.isLeaf ) {
                evt.stopPropagation();
                if( editHandlerSvc && !editHandlerSvc.editInProgress().editInProgress ) {
                    uiGridTreeBaseSvc.toggleRowTreeState( row.grid, row );
                }
            }
        };

        /**
         * Called when the icon image in the tree-table comment cell is 'clicked'.
         * <P>
         * Note: This function currently does nothing. Is a place holder for when visibility is being controlled by
         * clicks on the icon.
         *
         * @param {Object} row - The object that represents the row in the table being clicked.
         * @param {Object} evt - The click event.
         */
        $scope.imageButtonClick = function( row, evt ) { //eslint-disable-line
            // Stop event propagation to avoid selecting the entire row the icon is within.
            evt.stopPropagation();

            //Fires off an event up the scope hierarchy the VMO object selected
            $scope.$emit( 'awTable.imageButtonClick', row.entity );
        };

        /**
         * This function is called when the container scope "broadcasts" down a visibilityStateChangedEvent. An api
         * object that can be called to determine the visibility of the cell is called
         */
        $scope.$on( 'visibilityStateChanged', function( event, api ) {
            if( api && $scope.vmo ) {
                $scope.vmo.visible = api.getVisibility( $scope.vmo.uid );
            }
        } );

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
            //$scope.commandContext cannot change - object is used directly by GWT
            //this whole watch could be removed once GWT is gone - zero compile does not need it
            $scope.commandContext.vmo = $scope.vmo;
        } );
    }

    myController.$inject = [ '$scope', 'uiGridTreeBaseService', 'awTableService', 'editHandlerService', 'appCtxService', 'localeService' ];

    return {
        restrict: 'E',
        scope: {
            // 'prop' is defined in the parent (i.e. controller's) scope
            commands: '<',
            vmo: '<',
            row: '<',
            anchor: '<?'
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-cls-treetable-command-cell.directive.html',
        controller: myController
    };
} );
