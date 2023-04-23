// Copyright (c) 2020 Siemens

/**
 * Defines the {@link NgControllers.DefaultLocationCtrl}
 *
 * @module js/aw.default.location.controller
 */
import app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import logger from 'js/logger';
import 'js/appCtxService';
import 'js/aw-page.directive';
import 'soa/kernel/propertyPolicyService';
import 'js/keyboardService';
import 'js/localeService';
import 'js/page.service';
import 'soa/preferenceService';
import 'js/workspaceValidationService';

/**
 * Default location controller. Manages the global toolbar, header, and tabs. Tabs are created based on states that
 * have the same parent as the active state.
 *
 * @class DefaultLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $state {Object} - $state service
 * @param propertyPolicyService {Object} - property policy service
 * @param localeService {Object} - locale service
 * @param appCtxService {Object} - app context service
 * @memberOf NgControllers
 */
app.controller( 'DefaultLocationCtrl', [
    '$scope',
    '$state',
    'soa_kernel_propertyPolicyService',
    'localeService',
    'appCtxService',
    'keyboardService',
    'pageService',
    'soa_preferenceService',
    'workspaceValidationService',
    function( $scope, $state, propertyPolicyService, localeService, appCtxService, keyboardSvc, pageService,
        preferenceService, workspaceValService ) {
        /**
         * The sublocation context property
         */
        var _locationContext = 'locationContext';

        /**
         * The location context for command visibility. Passed to the sublocation which will set its parent
         * context.
         *
         * @member context
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        $scope.context = $state.current.parent.replace( /_/g, '.' );

        // Listen for KeyDown event to perform keyboard shortcuts
        keyboardSvc.registerKeyDownEvent();

        // Register the location context
        appCtxService.registerCtx( _locationContext, {
            'ActiveWorkspace:Location': $scope.context
        } );
        // and unregister on destroy
        $scope.$on( '$destroy', function() {
            appCtxService.unRegisterCtx( 'locationContext' );
        } );

        /**
         * The location tabs. These are determined by extracting all states that are siblings of the current
         * state from the state service.
         *
         * @member subLocationTabs
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        $scope.subLocationTabs = [];

        preferenceService.queryAll().then(
            function( prefs ) {
                pageService.registerVisibleWhen( $state.current.parent ? $state.current.parent :
                    $state.current.name, $scope, {
                        preferences: prefs
                    } );
            } );

        // Get all states and filter down to only ones with the same parent as the current state
        $state.get().filter( function( state ) {
            return state.parent === $state.current.parent && workspaceValService.isValidPage( state.name );
        } ).forEach(
            function( state, index ) {
                /**
                 * The typical tab object used by the tab widget with some additional properties:
                 *
                 * @param priority {Number} - Used to sort the tabs
                 * @param state {String} - The name of the state to switch to when the tab is selected
                 * @param params {Object} - The state parameters that were active when the user left the tab.
                 *            Restored when the user returns to the tab.
                 */

                var newTab = {
                    classValue: 'aw-base-tabTitle',
                    displayTab: true,
                    pageId: index,
                    priority: state.data.priority,
                    selectedTab: state === $state.current,
                    state: state.name,
                    tabKey: state.name,
                    visible: true
                };
                if( state.visibleWhen ) {
                    $scope.$watch( function() {
                        return state.isVisible;
                    }, function( newValue ) {
                        if( newValue && _.indexOf( $scope.subLocationTabs, newTab ) === -1 ) {
                            $scope.subLocationTabs.push( newTab );
                            $scope.subLocationTabs.sort( function( a, b ) {
                                return a.priority - b.priority;
                            } );
                        } else if( !newValue ) {
                            _.remove( $scope.subLocationTabs, function( object ) {
                                return object === newTab;
                            } );
                        }
                        newTab.displayTab = newValue;
                    } );
                }

                $scope.subLocationTabs.push( newTab );

                // If the label is a string just set it
                var label = state.data.label;
                if( typeof label === 'string' ) {
                    newTab.name = label;
                } else {
                    // Otherwise get the label from the localized file
                    localeService.getLocalizedText( label.source, label.key ).then( function( result ) {
                        newTab.name = result;
                    } );
                }
            } );

        // Sort the sublocation tabs based on priority
        $scope.subLocationTabs.sort( function( a, b ) {
            return a.priority - b.priority;
        } );

        /**
         * Callback from the tab api. Changes state when a new tab is selected.
         *
         * @method api
         * @param pageId {Number} - pageId of the tab to select.
         * @param tabTitle {String} - The name of the tab to select.
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        $scope.api = function( pageId, tabTitle ) {
            var tabToSelect;
            if( tabTitle ) {
                tabToSelect = $scope.subLocationTabs.filter( function( tab ) {
                    return tab.name === tabTitle;
                } )[ 0 ];
            } else {
                // Should only happen when api is called before tapTitle is loaded from i18n file
                tabToSelect = $scope.subLocationTabs.filter( function( tab ) {
                    return tab.pageId === pageId;
                } )[ 0 ];
            }
            if( tabToSelect ) {
                // When the tab widget is forced to update after the state has already changed it will still trigger callback
                if( tabToSelect.state !== $state.current.name ) {
                    // If there is an active tab
                    if( $scope.activeTab ) {
                        // Save the active parameters
                        $scope.activeTab.params = ngModule.copy( $state.params );
                    }
                    // Switch to the new state
                    if( tabToSelect.params ) {
                        $state.go( tabToSelect.state, tabToSelect.params );
                    } else {
                        $state.go( tabToSelect.state );
                    }
                }
                $scope.activeTab = tabToSelect;
            } else {
                logger.error( 'Missing tab was selected: ' + tabTitle );
            }
        };

        /**
         * The property policy for this location. Extracted from the state data. The policy can be embedded
         * directly as an object or it can be a string path to the json file. The policy is registered when the
         * location is activated and unregistered when the location is removed.
         *
         * @member propertyPolicy
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        var propertyPolicy = $state.current.data.propertyPolicy;
        if( propertyPolicy ) {
            $state.current.data.propertyPolicyPromise = propertyPolicyService
                .registerPolicyAsync( propertyPolicy );

            $state.current.data.propertyPolicyPromise.then( function( propertyPolicyId ) {
                $scope.$on( '$destroy', function() {
                    propertyPolicyService.unregister( propertyPolicyId );
                } );
            } );
        }

        /**
         * The current header title. Initially this is set to the headerTitle property of the current state
         * data. This property is also accessible through the 'headerTitle' property on the 'location.titles'
         * context in the appCtxService.
         *
         * @member headerTitle
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        /**
         * The current browser title. Initially this is set to the browserTitle property of the current state
         * data. This property is also accessible through the 'browserTitle' property on the 'location.titles'
         * context in the appCtxService.
         *
         * @member browserTitle
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        /**
         * The current browser sub title. Initially this is set to the browserSubTitle property of the current
         * state data. This property is also accessible through the 'browserSubTitle' property on the
         * 'location.titles' context in the appCtxService.
         *
         * @member browserSubTitle
         * @memberOf NgControllers.DefaultLocationCtrl
         */
        var contextName = 'location.titles';
        var contextProperties = [ 'browserTitle', 'browserSubTitle', 'headerTitle', 'modelObject' ];
        appCtxService.registerCtx( contextName, {
            browserTitle: '',
            browserSubTitle: '',
            headerTitle: ''
        } );

        // Listen for context updates and update scope when they happen
        var contextUpdateSub = eventBus.subscribe( 'appCtx.update', function( data ) {
            if( data.name === contextName ) {
                contextProperties.forEach( function( prop ) {
                    if( data.value[ prop ] ) {
                        $scope.$evalAsync( function() {
                            $scope[ prop ] = data.value[ prop ];
                        } );
                    }
                } );
            }
        } );

        // Remove the context and event bus sub when scope destroyed
        $scope.$on( '$destroy', function() {
            appCtxService.unRegisterCtx( contextName );
            eventBus.unsubscribe( contextUpdateSub );
        } );

        // Remove keydown event listener when leaving location
        $scope.$on( '$destroy', function() {
            keyboardSvc.unRegisterKeyDownEvent();
        } );

        // Get the inital values from the state data
        contextProperties.forEach( function( key ) {
            var property = $state.current.data[ key ];
            if( property ) {
                var update = {};
                if( typeof property === 'string' ) {
                    update[ key ] = property;
                    appCtxService.updateCtx( contextName, update );
                } else {
                    localeService.getLocalizedText( property.source, property.key ).then( function( result ) {
                        update[ key ] = result;
                        appCtxService.updateCtx( contextName, update );
                    } );
                }
            }
        } );
    }
] );
