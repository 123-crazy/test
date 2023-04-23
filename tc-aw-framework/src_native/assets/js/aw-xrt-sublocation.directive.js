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
 * @module js/aw-xrt-sublocation.directive
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/aw.base.sublocation.controller';
import 'js/selection.service';
import 'js/aw-sublocation.directive';
import 'js/aw-xrt-2.directive';
import 'js/aw-primary-selection.directive';
import 'js/aw-tab.directive';
import 'js/aw-tab-container.directive';

/**
 * Display a xrt view model that is already loaded
 *
 * @example <aw-xrt-sublocation view-model="viewModel"></aw-xrt-sublocation>
 *
 * @memberof NgDirectives
 * @member aw-xrt
 */
app.directive( 'awXrtSublocation', [ function() {
    return {
        restrict: 'E',
        scope: {
            provider: '=',
            baseSelection: '=',
            xrtViewModel: '=',
            subLocationTabs: '=',
            api: '='
        },
        templateUrl: app.getBaseUrlPath() + '/html/aw-xrt-sublocation.directive.html',
        controller: [ '$scope', '$controller', '$state', 'selectionService',
            function ShowObjectSublocationCtrl( $scope, $controller, $state, selectionService ) {
                var self = this;

                ngModule.extend( self, $controller( 'BaseSubLocationCtrl', {
                    $scope: $scope
                } ) );

                /**
                 * Get what the sublocation believes will be selected once everything is finished
                 * and where it will be selected (base / PWA / SWA)
                 *
                 * The selected object does not have to be a real object. If the selected object
                 * ends up not being what is actually selected it should not cause any failures,
                 * although there may be an extra server call to get server visibility
                 *
                 * @return {Object} A selection event with "source" and "selected"
                 */
                $scope.getInitialSelection = function() {
                    if( $state.params.uid ) {
                        return {
                            selected: [ {
                                uid: $state.params.uid
                            } ],
                            source: 'base'
                        };
                    }
                };

                /**
                 * (Default) Base selection update method. Simple pass through to the selection service when
                 * selection comes from primary work area.
                 *
                 * @function updateSelection
                 * @memberOf NgControllers.BaseSubLocationCtrl
                 *
                 * @param {Object} selection - The new selection
                 */
                $scope.updateSelection = $scope.updateSelection ? $scope.updateSelection : function( selection ) {
                    if( selection ) {
                        if( selection.source === 'primaryWorkArea' ) {
                            selection.selected = selection.selected ? selection.selected : [];
                            if( selection.selected.length > 0 ) {
                                selectionService.updateSelection( selection.selected, $scope.baseSelection,
                                    selection.relationContext );
                            } else {
                                selectionService.updateSelection( $scope.baseSelection );
                            }
                        }
                        if( selection.source === 'base' ) {
                            selectionService.updateSelection( $scope.baseSelection );
                        }
                    } else {
                        selectionService.updateSelection( $scope.baseSelection );
                    }
                };
            }
        ]
    };
} ] );
