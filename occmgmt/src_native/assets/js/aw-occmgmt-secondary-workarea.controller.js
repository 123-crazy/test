// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Controller to display the occmgmt secondary workarea.
 *
 * @module js/aw-occmgmt-secondary-workarea.controller
 */
import app from 'app';
import 'js/appCtxService';
import 'js/tabRegistry.service';
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
app.controller( 'awOccmgmtSecondaryWorkareaCtrl', [
    '$scope',
    'appCtxService',
    'tabRegistryService',
    function AwOccmgmtSecondaryWorkareaCtrl( $scope, appCtxService, tabRegistrySvc ) {
        var self = this;

        /**
         * The tabs that are currently visible
         */
        $scope.summaryTabs = [];

        /**
         * Tab callback
         */
        $scope.api = function( idx, tabTitle ) {
            var tabToSelect = self.getTabFromTabTile( tabTitle );

            if( _.isUndefined( tabToSelect ) ) {
                tabToSelect = $scope.summaryTabs.filter( function( tab ) {
                    return tab.name === tabTitle;
                } )[ 0 ];
            }
            var activeTab = appCtxService.getCtx( $scope.contextKey + '.activeTab' );
            if( !_.isUndefined( tabToSelect ) && !_.isEqual( activeTab.name, tabToSelect.name ) ) {
                appCtxService.updatePartialCtx( $scope.contextKey + '.activeTab', tabToSelect );
                // Update the selection
                $scope.$emit( 'dataProvider.selectionChangeEvent', {
                    selected: []
                } );
            }
        };

        self.getTabFromTabTile = function( tabTitle ) {
            //Determine which tab to select based on the name
            //Index changes as overflow changes tab order
            return tabRegistrySvc.getVisibleTabs( $scope.contextKey ).filter( function( tab ) {
                return tab.name === tabTitle;
            } )[ 0 ];
        };

        /**
         * Refresh the tabs based on the new selection
         */
        self.refreshAceSwaViewWithProvidedTabs = function( eventData ) {
            /**Tab selection can be achieved by just setting selectedTab = true on Tab.
            But calculation of tabs under overflow group is linked with NgTabSelectionUpdate at this point.
            */
            $scope.summaryTabs = eventData.summaryTabs;
            if( eventData.activeTab && !_.isEmpty( $scope.summaryTabs ) ) {
                $scope.$broadcast( 'NgTabSelectionUpdate', eventData.activeTab );
            }

        };

        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            if( data.clearSelections ) {
                $scope.$broadcast( 'dataProvider.selectAction', { selectAll: false } );
            }
        } );
    }
] );
