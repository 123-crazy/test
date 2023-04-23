// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display a favorite section of a panel.
 *
 * @module js/aw-favorite.directive
 */
import * as app from 'app';
import _ from 'lodash';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';
import 'js/aw-panel-section.directive';
import 'js/viewModelService';
import 'js/declDataProviderService';
import 'js/dataProviderFactory';
import 'js/panelContentService';
import 'js/appCtxService';
import 'js/favoritesService';
import 'js/tcFilterService';

/**
 * Directive to display a panel section.
 *
 * @example <aw-favorite filter-types= "ItemRevision,Folder" selection-mode="single"></aw-favorite>
 *
 * 1. filter-types: List of types separated by comma which are used as filters on the favorites content.
 *
 * 2. selection-mode : optional, default is multiselect, to constrain selection or multiple selection
 *
 * 3. isIncludeSubTypes: optional, Default true, it will check the sourceObject's typeHierarchy with given
 * filterTypes.
 *
 * @member aw-favorite
 * @memberof NgElementDirectives
 */
app.directive( 'awFavorite', [
    'viewModelService',
    'declDataProviderService',
    'dataProviderFactory',
    'panelContentService',
    'appCtxService',
    'soa_favoritesService',
    'tcFilterService',
    function( viewModelSvc, declDataProviderSvc, dataProviderFactory, panelContentSvc, appCtxService, favoriteSrv,
        tcFilterService ) {
        return {
            restrict: 'E',
            scope: {
                filterTypes: '@?', // optional
                selectionMode: '@?',
                isIncludeSubTypes: '@?'
            },
            controller: [
                '$scope',
                function( $scope ) {
                    //read the data from json file 'paletteServicePageSub'gulp audit
                    panelContentSvc.getViewModelById( 'awFavoriteDirective' ).then( function( response ) {
                        viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then( function( declViewModel ) {
                            viewModelSvc.setupLifeCycle( $scope, declViewModel );

                            $scope.data.favoriteObjects = [];

                            //get the favorite objects
                            favoriteSrv.getFavorites( true ).then(
                                function( response ) {
                                    $scope.data.favoriteObjects = response;

                                    // filter the favorite items by filter types
                                    var filterTypes = [];
                                    if( $scope.filterTypes ) {
                                        filterTypes = $scope.filterTypes.split( ',' );
                                    }
                                    var isIncludeSubTypes = !($scope.isIncludeSubTypes &&
                                        $scope.isIncludeSubTypes === "false");
                                    if( filterTypes.length > 0 ) {
                                        tcFilterService.getFilteredObjects( $scope.data.favoriteObjects,
                                            filterTypes, isIncludeSubTypes ).then(
                                            function( filteredFavoriteObjects ) {
                                                $scope.data.favoriteObjects = filteredFavoriteObjects;
                                                _updateDataProvider();
                                            } );
                                    } else {
                                        _updateDataProvider();
                                    }
                                } );

                            /**
                             */
                            function _updateDataProvider() {
                                if( $scope.selectionMode === 'single' ||
                                    $scope.selectionMode === 'multiple' ) {
                                    $scope.data.dataProviders.getFavoriteProvider.selectionModel
                                        .setMode( $scope.selectionMode );
                                } else {
                                    $scope.data.dataProviders.getFavoriteProvider.selectionModel
                                        .setMode( 'multiple' );
                                }

                                var favoriteObj = $scope.data.favoriteObjects;

                                $scope.data.dataProviders.getFavoriteProvider.update( favoriteObj,
                                    favoriteObj.length );

                                //make the dataProider initialize
                                $scope.data.dataProviders.getFavoriteProvider.initialize( $scope );

                                appCtxService.registerCtx( 'getFavoriteProvider',
                                    $scope.data.dataProviders.getFavoriteProvider );
                            }
                        } );
                    } );

                    $scope.$on( '$destroy', function() {
                        appCtxService.unRegisterCtx( 'getFavoriteProvider' );
                    } );
                }
            ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-favorite.directive.html'
        };
    }
] );
