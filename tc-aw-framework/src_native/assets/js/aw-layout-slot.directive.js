// Copyright (c) 2020 Siemens

/**
 * Container directive to add the slots.
 *
 * @module js/aw-layout-slot.directive
 */
import app from 'app';
import _ from 'lodash';
import 'js/layoutSlotService';
import 'js/configurationService';
import 'js/aw-include.directive';
import 'js/appCtxService';
import 'js/exist-when.directive';
import 'js/commandConfigUtils.service';

/**
 * Container  directive to add the slots.
 *
 * @example <aw-layout-slot></aw-layout-slot> *
 *
 * @member aw-layout-slot
 * @memberof NgElementDirectives
 */
app.directive( 'awLayoutSlot', [
    'configurationService',
    'appCtxService',
    'layoutSlotService',
    'commandConfigUtils',
    function( cfgSvc, appCtxSvc, layoutSlotSvc, _commandConfigUtils ) {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                name: '@',
                context: '=?'
            },

            templateUrl: app.getBaseUrlPath() + '/html/aw-layout-slot.directive.html',
            controller: [
                '$scope',
                function( $scope ) {
                    $scope.conditions = {};
                    $scope.ctx = appCtxSvc.ctx;
                    cfgSvc.getCfg( 'layoutSlots' ).then( function( slotJson ) {
                        if( slotJson.slots ) {
                            var allSlots = _.filter( slotJson.slots, {
                                name: $scope.name
                            } );
                            _commandConfigUtils.updateShortConditions( slotJson, slotJson.slots );
                            var activeSlot = layoutSlotSvc.findActiveSlot( allSlots, slotJson );
                            layoutSlotSvc.bindSlot( slotJson, $scope, renderCurrentSlot );
                            $scope.contributedViews = activeSlot !== null ? activeSlot.view : '';
                        }
                    } );
                    /*
                     If slot is tracking the condition change , it will render view again on
                     condition change
                    */

                    var renderCurrentSlot = function renderCurrentSlot( activeSlot, isSlotVisible ) {
                        if( activeSlot && activeSlot.view ) {
                            if( isSlotVisible ) {
                                $scope.contributedViews = activeSlot.view;
                            } else if( $scope.contributedViews === activeSlot.view ) {
                                $scope.contributedViews = '';
                            }
                        }
                    };
                }
            ]
        };
    }
] );
