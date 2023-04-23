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
 * Defines the {@link NgControllers.SearchSubLocationCtrl}
 *
 * @module js/aw.search.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/eventBus
 * @requires js/aw.native.location.controller
 * @requires js/appCtxService
 * @requires js/localeService
 * @requires js/awSearchService
 * @requires js/awSearchLocationFilterPanelService
 * @requires js/Awp0SearchHighlightingService
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import _ from 'lodash';
import 'js/aw.native.sublocation.controller';
import 'js/appCtxService';
import 'js/localeService';
import 'js/awSearchService';
import 'js/awSearchLocationFilterPanelService';
import 'js/Awp0SearchHighlightingService';
import searchFilterSvc from 'js/aw.searchFilter.service';
'use strict';

/*eslint-disable-next-line valid-jsdoc*/
/**
 * search sublocation controller.
 * @memberOf NgControllers
 */
app.controller( 'SearchSubLocationCtrl', [
    '$scope',
    '$state',
    '$q',
    '$controller',
    'appCtxService',
    'Awp0SearchHighlightingService',
    'awSearchService',
    'awSearchLocationFilterPanelService',
    function( $scope, $state, $q, $controller, appCtxService, Awp0SearchHighlightingService, awSearchService, awSearchLocationFilterPanelService ) {
        var ctrl = this;

        //DefaultSubLocationCtrl will handle setting up context correctly
        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );
        $scope.ctx = appCtxService.ctx;
        var ctxPreference = appCtxService.getCtx( 'preferences.AWC_ColorFiltering' );
        if( ctxPreference ) {
            appCtxService.updatePartialCtx( 'decoratorToggle', ctxPreference[ 0 ] === 'true' );
        }

        var doSearchListener = eventBus.subscribe( 'search.doSearch', function() {
            eventBus.publish( 'primaryWorkarea.reset' );
        } );
        Awp0SearchHighlightingService.toggleHighlightSelection( undefined, false );
        var searchCommandLoadedListener = eventBus.subscribe( 'soa.getVisibleCommands', function() {
            awSearchService.openSearchPanelAsNeeded( $scope );
        } );

        awSearchLocationFilterPanelService.registerFilterPanelOpenCloseEvent();
        var ctxDisableAutoOpenFilterPanel = appCtxService.getCtx( 'preferences.AW_Disable_Auto_Open_Filter_Panel' );
        if( !ctxDisableAutoOpenFilterPanel || ctxDisableAutoOpenFilterPanel[ 0 ] === 'FALSE' ) {
            awSearchLocationFilterPanelService.filterPanelOpenCloseEvent();
        }

        //Remove listeners on destroy
        $scope.$on( '$destroy', function() {
            eventBus.unsubscribe( doSearchListener );
            eventBus.unsubscribe( searchCommandLoadedListener );
            if( appCtxService.getCtx( 'highlighter' ) ) {
                appCtxService.unRegisterCtx( 'highlighter' );
            }
            $( document.body ).removeClass( 'aw-ui-showHighlight' );
        } );

        var processEachFilter = function( searchSearchContext, searchCriteria, filter, shapeSearchCtx ) {
            var filterSplit = filter.split( '=' );
            if( filterSplit[ 0 ] === 'searchStringInContent' ) {
                searchSearchContext.searchStringPrimary = searchCriteria;
                searchSearchContext.searchStringSecondary = filterSplit[ 1 ];
            } else if( filterSplit[ 0 ] === 'Geolus Criteria' ) {
                shapeSearchCtx.seedObjectName = searchCriteria;
                shapeSearchCtx.geolusCriteria = filterSplit[ 1 ];
            } else if( filterSplit[ 0 ] === 'ShapeSearchProvider' ) {
                var searchCtx = appCtxService.getCtx( 'search' );
                if( !searchCtx ) {
                    searchCtx = {};
                    appCtxService.registerCtx( 'search', searchCtx );
                }
                if( !searchCtx.reqFilters ) {
                    searchCtx.reqFilters = {
                        ShapeSearchProvider: [ 'true' ]
                    };
                } else {
                    searchCtx.reqFilters.ShapeSearchProvider = [ 'true' ];
                }
            }
        };

        var getShapeSearchParams = function( searchSearchContext, searchCriteria, filterString ) {
            var shapeSearchCtx = appCtxService.getCtx( 'shapeSearch' );
            if( !shapeSearchCtx ) {
                shapeSearchCtx = {};
                appCtxService.registerCtx( 'shapeSearch', shapeSearchCtx );
            }
            var filters = filterString.split( searchFilterSvc._filterSeparator );
            _.forEach( filters, function( filter ) {
                processEachFilter( searchSearchContext, searchCriteria, filter, shapeSearchCtx );
            } );
        };

        //Use Case #1. When pinned saved search is executed from gateway,
        //the content in the global searchbox and in-content searchbox from previous search need to be "cleared"
        //Use Case #2. When NAVIGATE back to search results sublocation,
        //the content in the global searchbox and in-content searchbox from previous search need to be "restored"
        //Hence the need of this function
        var clearSearchBox = function( context ) {
            if( context.searchFilterString && context.searchFilterString.indexOf( 'searchStringInContent=' ) > -1 ) {
                getShapeSearchParams( context, context.criteria, context.searchFilterString );
            } else if( context.searchStringPrimary ) {
                if( context.searchStringSecondary ) {
                    if( context.criteria !== context.searchStringPrimary + ' AND ' + context.searchStringSecondary ) {
                        delete context.savedSearchUid;
                        delete context.searchStringPrimary;
                        delete context.searchStringSecondary;
                    }
                } else if( context.criteria === context.searchStringPrimary ) {
                    delete context.savedSearchUid;
                    delete context.searchStringPrimary;
                }
            }
        };

        /**
         * To retrieve the preference value on selecting the first object on search.
         *
         * @member getSelectFirstObjectPreference
         * @memberOf NgControllers.NativeSubLocationCtrl
         * @return {BOOLEAN} true if the preference for selecting the first object is true
         */
        $scope.getSelectFirstObjectPreference = function() {
            let toSelectFirstObject = appCtxService.getCtx( 'preferences.AWC_select_firstobject_inSearchLocation.0' );
            let objectFilterSelected = appCtxService.getCtx( 'searchChart.objectFilterSelected' );
            return toSelectFirstObject === 'TRUE' && !objectFilterSelected;
        };

        //When a state parameter changes
        $scope.$on( '$locationChangeSuccess', function() {
            //Update the provider
            var context = appCtxService.getCtx( 'searchSearch' );
            if( context ) {
                if( $state.params.searchCriteria === undefined || $state.params.searchCriteria === '' ) {
                    $state.go( '.', {
                        filter: context.searchFilterString,
                        searchCriteria: context.criteria
                    } );
                } else {
                    context.criteria = $state.params.searchCriteria;
                    context.searchFilterString = $state.params.filter;
                    clearSearchBox( context );
                    appCtxService.updateCtx( 'searchSearch', context );
                }
            } else if( $state.params.filter && $state.params.filter.indexOf( 'searchStringInContent=' ) > -1 ) {
                context = {};
                appCtxService.registerCtx( 'searchSearch', context );
                getShapeSearchParams( context, $state.params.searchCriteria, $state.params.filter );
            }
        } );
    }
] );
