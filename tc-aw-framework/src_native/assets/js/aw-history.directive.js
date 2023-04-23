// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Directive to display a history section of a palette panel.
 *
 * @module js/aw-history.directive
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
import 'js/historyService';
import 'js/tcFilterService';
import awConfServ from 'js/awConfiguredRevService';

/**
 * Directive to display a panel section.
 *
 * @example <aw-history></aw-history>
 * @example <aw-history selection-mode="single"></aw-history>
 * @example <aw-history max-length = '5' filter-types= "ItemRevision,Folder"></aw-history>
 *
 * 1. filter-types: List of types separated by comma which are used as filters on the history content.
 *
 * 2. selection-mode : optional, default is multiselect, to constrain selection or multiple selection
 *
 * 3. isIncludeSubTypes: optional, Default true, it will check the sourceObject's typeHierarchy with given
 * filterTypes.
 *
 * @member aw-history
 * @memberof NgElementDirectives
 */
app.directive( 'awHistory', [
    'viewModelService',
    'declDataProviderService',
    'dataProviderFactory',
    'panelContentService',
    'appCtxService',
    'soa_historyService',
    'tcFilterService',
    function( viewModelSvc, declDataProviderSvc, dataProviderFactory, panelContentSvc, appCtxService, historySrv,
        tcFilterService ) { //
        return {
            restrict: 'E',
            scope: {
                maxLength: '@?', // optional
                filterTypes: '@?', // optional
                selectionMode: '@?',
                isIncludeSubTypes: '@?'

            },
            controller: [
                '$scope',
                function( $scope ) {
                    //read the data from json file 'paletteServicePageSub'
                    panelContentSvc.getViewModelById( 'awHistoryDirective' ).then(
                        function( response ) {
                            viewModelSvc.populateViewModelPropertiesFromJson( response.viewModel ).then(
                                function( declViewModel ) {
                                    viewModelSvc.setupLifeCycle( $scope, declViewModel );

                                    $scope.data.historyObjects = [];

                                    //get the recent objects
                                    historySrv.getHistory().then(
                                        function( response ) {
                                            $scope.data.historyObjects = response;

                                            // filter the recent items by filter types
                                            var filterTypes = [];
                                            if( $scope.filterTypes ) {
                                                filterTypes = $scope.filterTypes.split( ',' );
                                            }
                                            var isIncludeSubTypes = !( $scope.isIncludeSubTypes &&
                                                $scope.isIncludeSubTypes === 'false' );
                                            if( filterTypes.length > 0 ) {
                                                tcFilterService.getFilteredObjects( $scope.data.historyObjects,
                                                    filterTypes, isIncludeSubTypes ).then(
                                                    function( filteredHistoryObjects ) {
                                                        $scope.data.historyObjects = filteredHistoryObjects;
                                                        _updateDataProvider();
                                                    } );
                                            } else {
                                                _updateDataProvider();
                                            }
                                        } );

                                    function _updateDataProvider() {
                                        // limit the recent items to input max length
                                        if( $scope.data.historyObjects.length > 0 && $scope.maxLength ) {
                                            $scope.data.historyObjects = _.slice( $scope.data.historyObjects, 0,
                                                $scope.maxLength );
                                        }

                                        if( $scope.selectionMode === 'single' ||
                                            $scope.selectionMode === 'multiple' ) {
                                            $scope.data.dataProviders.getRecentObjsProvider.selectionModel
                                                .setMode( $scope.selectionMode );
                                        } else {
                                            $scope.data.dataProviders.getRecentObjsProvider.selectionModel
                                                .setMode( 'multiple' );
                                        }

                                        var historyObjects = $scope.data.historyObjects;
                                        $scope.data.dataProviders.getRecentObjsProvider.update( historyObjects,
                                            historyObjects.length );

                                        //make the dataProider initialize
                                        $scope.data.dataProviders.getRecentObjsProvider.initialize( $scope );
                                        appCtxService.registerCtx( 'getRecentObjsProvider',
                                            $scope.data.dataProviders.getRecentObjsProvider );
                                    }
                                } );
                        } );
                    $scope.$on( '$destroy', function() {
                        appCtxService.unRegisterCtx( 'getRecentObjsProvider' );
                    } );
                }
            ],

            templateUrl: app.getBaseUrlPath() + '/html/aw-history.directive.html'
        };
    }
] );
