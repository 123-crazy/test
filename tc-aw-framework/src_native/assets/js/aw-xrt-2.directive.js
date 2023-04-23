// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw-xrt-2.directive
 */
import * as app from 'app';
import logger from 'js/logger';
import 'js/aw-xrt-2.controller';
import 'js/commandPanel.service';

/**
 * Display a xrt view model that is already loaded
 *
 * @example <aw-xrt-2 type="SUMMARY" view-model="viewModel"></aw-xrt-2>
 *
 * @memberof NgDirectives
 * @member aw-xrt
 */
app.directive( 'awXrt2', [
    'commandPanelService',
    function( commandPanelService ) {
        return {
            restrict: 'E',
            scope: {
                /**
                 * An already created and initialized view model to render.
                 */
                viewModel: '='
            },
            controller: 'awXrtController2',
            link: function( $scope, $element, $attrs, $ctrl ) {

                /**
                 * CSS class that will be added to aw-xrt element
                 */
                var cssClass = 'aw-jswidget-summaryPage';

                //Render the already loaded view model
                $scope.$watch( 'viewModel', function( newVm, oldVm ) {
                    if( oldVm && oldVm !== newVm ) {
                        $ctrl.detachViewModel( $element, oldVm );
                    }
                    if( newVm ) {
                        $ctrl.attachViewModel( $element, newVm );
                    }
                    logger.trace( 'View model changed', newVm, oldVm );
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

                $scope.$on( 'dataProvider.selectionChangeEvent', $ctrl.setSelectedData );

                $scope.$on( '$destroy', function() {
                    if( $scope.viewModel ) {
                        $ctrl.detachViewModel( $element, $scope.viewModel );
                    }
                } );

                //Add the expected css classes to $element
                $element.addClass( cssClass );
            }
        };
    }
] );
