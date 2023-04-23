// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.awPrimaryWorkareaCtrl}
 *
 * @module js/aw-primary-workarea.controller
 * @requires app
 */
import app from 'app';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import logger from 'js/logger';
import 'js/panelContentService';
import 'js/commandPanel.service';

/**
 * Primary workarea controller.
 *
 * @class awPrimaryWorkareaCtrl
 * @param $scope {Object} - Directive scope
 * @param $state {Object} - State service
 * @memberOf NgControllers
 */
app.controller( 'awPrimaryWorkareaCtrl', [
    '$scope', 'viewModelService', 'panelContentService', 'commandPanelService',
    function( $scope, viewModelSvc, panelContentService, commandPanelService ) {
        $scope.$watch( 'view', function() {
            $scope.viewSuffix = _.upperFirst( $scope.view );
        } );

        // When something wants to reset primary workarea
        var primaryWorkAreaResetListener = eventBus.subscribe( 'primaryWorkarea.reset', function() {
            // Broadcast reset only to child data providers
            $scope.$broadcast( 'dataProvider.reset' );
        } );

        // When something wants to select all or select none to primary workarea
        var primaryWorkAreaSelectActionListener = eventBus.subscribe( 'primaryWorkarea.selectAction', function(
            eventData ) {
            // Broadcast reset only to child data providers
            $scope.$broadcast( 'dataProvider.selectAction', {
                selectAll: eventData.selectAll
            } );
        } );

        // When something wants to enable multiselect primary workarea
        var primaryWorkAreaMultiSelectListener = eventBus.subscribe( 'primaryWorkarea.multiSelectAction', function(
            eventData ) {
            // Broadcast reset only to child data providers
            $scope.$broadcast( 'dataProvider.multiSelectAction', {
                multiSelect: eventData.multiSelect
            } );
            $scope.context.showCheckBox = eventData.multiSelect;
        } );

        // This is to support editing reference properties for which a command
        // panel needs to be activated
        $scope.$on( 'awProperty.addObject', function( event, context ) {
            event.stopPropagation();
            // Remove the destPanelId so that any command panel (who maybe listening) should not react.
            context.destPanelId = null;

            if( context.addTypeRef ) {
                commandPanelService.activateCommandPanel( 'Awp0AddReference', 'aw_toolsAndInfo', context );
            }
        } );

        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( primaryWorkAreaResetListener );
            eventBus.unsubscribe( primaryWorkAreaSelectActionListener );
            eventBus.unsubscribe( primaryWorkAreaMultiSelectListener );
        } );

        // use the .breadcrumbConfig.vm to pass value into the aw-include
        if( $scope.breadcrumbConfig && $scope.breadcrumbConfig.vm ) {
            panelContentService
                .getViewModelById( $scope.breadcrumbConfig.vm )
                .then( function( declViewModel ) {
                    viewModelSvc.populateViewModelPropertiesFromJson( declViewModel.viewModel )
                        .then( function( customPanelViewModel ) {
                            $scope.data = customPanelViewModel;
                            viewModelSvc.setupLifeCycle( $scope, customPanelViewModel );
                            viewModelSvc.bindConditionStates( customPanelViewModel, $scope );
                            $scope.conditions = customPanelViewModel.getConditionStates();
                        }, function() {
                            logger.error( 'Failed to resolve declarative view model for search bread crumb' );
                        } );
                } );
        }
        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            // Set source to primary workarea
            data.source = 'primaryWorkArea';

            // Update the selection group command handler
            eventBus.publish( 'primaryWorkArea.selectionChangeEvent', {
                selectionModel: data.selectionModel,
                dataCtxNode: $scope,
                dataProvider: data.dataProvider
            } );
        } );
    }
] );
