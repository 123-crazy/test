// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgControllers.PreferenceSubLocationCtrl}
 *
 * @module js/aw.preference.sublocation.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/aw.native.sublocation.controller';
import 'js/selection.service';
import 'js/aw-secondary-workarea.directive';
import 'js/aw-panel.directive';
import 'js/aw-include.directive';

'use strict';

/**
 * Preference sublocation controller.
 *
 * @class PreferenceSubLocationCtrl
 * @memberOf NgControllers
 *
 * @param {Object} $scope sublocation scope
 * @param {Object} $controller sublocation controller
 * @param {Object} selectionService selection service functions
 */
app.controller( 'PreferenceSubLocationCtrl', [
    '$scope',
    '$controller',
    'selectionService',
    function( $scope, $controller, selectionService ) {
        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * Update the primary workarea selection
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.PreferenceSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         */
        $scope.updatePrimarySelection = function( selection ) {
            // If selection is empty revert to base selection
            if( selection.length === 0 ) {
                selectionService.updateSelection( $scope.baseSelection, $scope.baseSelection );

                ctrl.setSelection( $scope.baseSelection && $scope.showBaseSelection ? //
                    [ $scope.baseSelection ] : [] );
            } else {
                // Otherwise use as parent selection
                selectionService.updateSelection( selection, $scope.baseSelection );

                // Update which model objects are selected
                ctrl.setSelection( selection );
            }
        };
    }
] );
