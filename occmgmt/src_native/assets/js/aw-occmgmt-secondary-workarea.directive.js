// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display the occmgmt secondary workarea.
 *
 * @module js/aw-occmgmt-secondary-workarea.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import 'js/aw-tab-container.directive';
import 'js/aw-tab.directive';
import 'js/aw-include.directive';
import 'js/exist-when.directive';
import 'js/aw-occmgmt-secondary-workarea.controller';
import _ from 'lodash';

'use strict';

/**
 * Directive to display the occmgmt secondary workarea.
 *
 * @example <aw-occmgmt-secondary-workarea selected="modelObjects"></aw-occmgmt-secondary-workarea>
 *
 * @member aw-occmgmt-secondary-workarea
 * @memberof NgElementDirectives
 */
app.directive( 'awOccmgmtSecondaryWorkarea', [
    function() {
        return {
            restrict: 'E',
            templateUrl: app.getBaseUrlPath() + '/html/aw-occmgmt-secondary-workarea.directive.html',
            scope: {
                //The currently selected model objects
                selected: '=?',
                contextKey: '=',
                showXrt: '='
            },
            link: function( $scope, $element, $attr, $controller ) {
                $scope.ctx = appCtxService.ctx;
                $scope.subPanelContext = {
                    contextKey: $scope.contextKey,
                    isXrtApplicable: _.isUndefined( $scope.showXrt ) ? true : $scope.showXrt
                };

                $scope.$watchCollection( 'selected', function( selected ) {
                    //Must always be given at least one object
                    $scope.subPanelContext.selectedModelObjects = selected;
                } );

                //Set selection source to secondary workarea
                $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
                    data.source = 'secondaryWorkArea';
                } );

                var onSwaRefreshTabsEventReceived = eventBus.subscribe(
                    $scope.contextKey + '.refreshTabs',
                    function( eventData ) {
                        $controller.refreshAceSwaViewWithProvidedTabs( eventData );
                    } );

                $scope.$on( '$destroy', function() {
                    //If the current view model is the active edit handler clear on destroy
                    //And remove listener
                    eventBus.unsubscribe( onSwaRefreshTabsEventReceived );
                } );
            },
            controller: 'awOccmgmtSecondaryWorkareaCtrl'
        };
    }
] );
