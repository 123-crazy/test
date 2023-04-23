// Copyright (c) 2020 Siemens

/**
 * @module js/aw.master.details.panel.controller
 */
import app from 'app';
import eventBus from 'js/eventBus';

/**
 * Defines the masterDetailsPanel controller.
 *
 * @member awMasterDetailsPanelController
 * @memberof NgControllers
 */
app.controller( 'awMasterDetailsPanelController', [ '$scope',
    function( $scope ) {
        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            var newSelection = data.selected[ 0 ];

            eventBus.publish( 'detailsPanel.inputChangedEvent', {
                selectedObject: newSelection
            } );
        } );

        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( 'detailsPanel' );
        } );
    }
] );
