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
 *
 * @module js/aw-search-visualnavigationcontent.directive
 */
import app from 'app';
import eventBus from 'js/eventBus';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import visualNavigationContentUtils from 'js/visualNavigationContentUtils';
import 'js/aw-repeat.directive';
import 'js/viewModelService';
import 'js/appCtxService';
import 'js/filterPanelEvents';
import 'soa/kernel/soaService';
import 'js/filterPanelService';
import 'js/iconService';
import _ from 'lodash';

'use strict';

app
    .directive(
        'awSearchVisualnavigationcontent',
        [
            'appCtxService',
            'viewModelService',
            'filterPanelEvents',
            'soa_kernel_soaService',
            'filterPanelService',
            'iconService',
            function( _appCtxSvc, viewModelSvc, filterPanelEvents, soa_kernel_soaService, filterPanelService, _iconSvc ) {
                return {
                    restrict: 'E',
                    controller: [
                        '$scope',
                        function( $scope ) {
                            eventBus.subscribe( 'loadVisualNavigationContent', function() {
                                $scope.loadVNC();
                            } );

                            $scope.loadVNC = function() {
                                if( _appCtxSvc.ctx.searchResponseInfo.searchFilterCategories === undefined ||
                                    _appCtxSvc.ctx.searchResponseInfo.searchFilterMap === undefined ||
                                    _appCtxSvc.ctx.searchResponseInfo.objectsGroupedByProperty.internalPropertyName === undefined ||
                                    _appCtxSvc.ctx.preferences.AWC_ColorFiltering[ 0 ] === undefined ) {
                                    return;
                                }

                                var categories = filterPanelService
                                    .getCategories2(
                                        _appCtxSvc.ctx.searchResponseInfo.searchFilterCategories,
                                        _appCtxSvc.ctx.searchResponseInfo.searchFilterMap,
                                        _appCtxSvc.ctx.searchResponseInfo.objectsGroupedByProperty.internalPropertyName,
                                        _appCtxSvc.ctx.preferences.AWC_ColorFiltering[ 0 ], true );

                                var filters = null;
                                var i;
                                for( i = 0; i < categories.navigateCategories.length; i++ ) {
                                    if( categories.navigateCategories[ i ].internalName === _appCtxSvc.ctx.search.currentChartBy.internalName ) {
                                        filters = categories.navigateCategories[ i ].filterValues.childnodes;
                                        break;
                                    }
                                }

                                if( !filters || filters.length === 0 ) {
                                    return;
                                }

                                if( _appCtxSvc.ctx && _appCtxSvc.ctx.vncResponse && _appCtxSvc.ctx.vncResponse.searchResults && _appCtxSvc.ctx.vncResponse.searchResults[ 0 ] &&
                                    _appCtxSvc.ctx.vncResponse.searchResults[ 0 ].node && filters[ 0 ] && _appCtxSvc.ctx.vncResponse.searchResults[ 0 ].node.stringValue === filters[ 0 ]
                                    .stringValue ) {
                                    return;
                                }

                                var searchCriteria = {};
                                for( i = 0; i < filters.length; i++ ) {
                                    searchCriteria[ filters[ i ].stringValue
                                        .substring( filters[ i ].stringValue.length - 14 ) ] = 'VNCProviderUID';
                                }

                                for( var id in searchCriteria ) {
                                    if( _appCtxSvc.ctx.searchCriteria && _appCtxSvc.ctx.searchCriteria[ id ] && searchCriteria[ id ] && searchCriteria[ id ] === _appCtxSvc.ctx.searchCriteria[
                                            id ] ) {
                                        return;
                                    }
                                    break;
                                }

                                var vnc_threshold = visualNavigationContentUtils.processSearchCriteria( searchCriteria );

                                var input = {
                                    searchInput: {
                                        internalPropertyName: '',
                                        maxToLoad: vnc_threshold,
                                        maxToReturn: vnc_threshold,
                                        providerName: 'Awp0VNCProvider',
                                        searchFilterFieldSortType: 'Alphabetical',
                                        searchCriteria: searchCriteria
                                    }
                                };

                                soa_kernel_soaService
                                    .postUnchecked( 'Query-2014-11-Finder', 'performSearch', input )
                                    .then(
                                        function( response ) {
                                            if( !response.searchResults ) {
                                                return response;
                                            }

                                            // Sorting of visual navigation card based on the preference value

                                            const Sorting = {
                                                Count: 'true',
                                                Ascending: 'false'
                                            };
                                            Object.freeze( Sorting );

                                            var sortingTypeForVNC = Sorting.Count;
                                            sortingTypeForVNC = visualNavigationContentUtils.processSortTypeForVNC( sortingTypeForVNC );

                                            switch( sortingTypeForVNC.toLowerCase() ) {

                                                case Sorting.Count:
                                                    var responseResults1 = response && response.searchResults[ '0' ] && response.searchResults[ '0' ].type === 'Cls0MasterNode';
                                                    var responseResults2 = response && response.searchResults[ '0' ] && response.searchResults[ '0' ].type === 'Cls0GroupNode';
                                                    var categoryName = visualNavigationContentUtils.getCatNameForCaseCount( responseResults1, responseResults2 );

                                                    _.forEach( response.searchResults, function( searchResult ) {
                                                        visualNavigationContentUtils.processSortTypeForCaseCount( searchResult, categoryName );
                                                    } );
                                                    response.searchResults.sort( function( a, b ) {
                                                        return parseFloat( b.count ) - parseFloat( a.count );
                                                    } );
                                                    break;

                                                case Sorting.Ascending:
                                                    response.searchResults.sort( function( a, b ) {
                                                        return visualNavigationContentUtils.processSortTypeForVNCAscending( a, b );
                                                    } );
                                            }



                                            var currentCategory;

                                            _.forEach( _appCtxSvc.ctx.searchResponseInfo.searchFilterCategories , function( cat ){
                                                if( cat.currentCategory === _appCtxSvc.ctx.search.currentChartBy.currentCategory )
                                                {
                                                    currentCategory = cat;
                                                }
                                            });

                                            for( var i = 0; i < response.searchResults.length; i++ ) {
                                                response = visualNavigationContentUtils.processSearchResults( response, currentCategory, i, _iconSvc );
                                            }

                                            return response;
                                        } ).then( function( vncResponse ) {
                                            visualNavigationContentUtils.thenRegisterResponse( vncResponse );
                                    } );
                            };
                            $scope.singleClick = function( node ) {
                                filterPanelEvents.selectHierarchyFilter( _appCtxSvc.ctx.search.currentChartBy,
                                    node );
                            };

                            $scope.$on( '$destroy', function() {
                                _appCtxSvc.unRegisterCtx( 'vncResponse' );
                                _appCtxSvc.unRegisterCtx( 'searchCriteria' );
                                eventBus.unsubscribe( 'aw-chart.contentLoaded' );
                            } );
                        }
                    ],
                    link: function( $scope ) {
                        $scope.loadVNC();
                    },

                    templateUrl: app.getBaseUrlPath() +
                        '/html/aw-search-visualnavigationcontent.directive.html'
                };
            }
        ] );
