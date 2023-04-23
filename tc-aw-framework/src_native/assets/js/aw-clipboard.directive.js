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
 * Directive to display a clipboard section of a panel.
 *
 * @module js/aw-clipboard.directive
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
import 'js/clipboardService';
import 'js/tcFilterService';
import 'js/awConfiguredRevService';

/**
 * Directive to display a panel section.
 *
 * @example <aw-clipboard filter-types= "ItemRevision,Folder" selection-mode="single"></aw-clipboard>
 *
 * 1. filter-types: List of types separated by comma which are used as filters on the clipboard content.
 *
 * 2. selection-mode : optional, default is multiselect, to constrain selection or multiple selection
 *
 * 3. isIncludeSubTypes: optional, Default true, it will check the sourceObject's typeHierarchy with given
 * filterTypes.
 *
 * @member aw-clipboard
 * @memberof NgElementDirectives
 */
app
    .directive(
        'awClipboard', //
        [
            'viewModelService',
            'declDataProviderService',
            'dataProviderFactory',
            'panelContentService',
            'appCtxService',
            'clipboardService',
            'tcFilterService',
            'awConfiguredRevService',
            function( viewModelSvc, declDataProviderSvc, dataProviderFactory, panelContentSvc, appCtxService,
                clipboardSrv, tcFilterService, awConfiguredRevService ) { //
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
                            //read the data from json file 'paletteServicePageSub'
                            panelContentSvc
                                .getViewModelById( 'awClipboardDirective' )
                                .then(
                                    function( response ) {
                                        viewModelSvc
                                            .populateViewModelPropertiesFromJson( response.viewModel )
                                            .then(
                                                function( declViewModel ) {
                                                    viewModelSvc.setupLifeCycle( $scope, declViewModel );

                                                    var clipboardObjects = clipboardSrv.getCachableObjects();

                                                    $scope.data.clipboardObjects = clipboardObjects;

                                                    // filter the favorite items by filter types
                                                    var filterTypes = [];
                                                    if( $scope.filterTypes ) {
                                                        filterTypes = $scope.filterTypes.split( ',' );
                                                    }
                                                    var isIncludeSubTypes = !( $scope.isIncludeSubTypes &&
                                                        $scope.isIncludeSubTypes === 'false' );

                                                    if( filterTypes.length > 0 ) {
                                                        tcFilterService
                                                            .getFilteredObjects( $scope.data.clipboardObjects,
                                                                filterTypes, isIncludeSubTypes )
                                                            .then(
                                                                function( filteredClipboardObjects ) {
                                                                    if( awConfiguredRevService.getShowConfiguredRev() === 'true' ) {
                                                                        filteredClipboardObjects = awConfiguredRevService.filterClipboardObjectsForConfRev( filteredClipboardObjects );
                                                                    }
                                                                    $scope.data.clipboardObjects = filteredClipboardObjects;
                                                                    _updateDataProvider();
                                                                } );
                                                    } else {
                                                        _updateDataProvider();
                                                    }
                                                } );

                                        function _updateDataProvider() {
                                            var selectedIndices = $scope.data.dataProviders.getClipboardProvider
                                                .getSelectedIndices();
                                            $scope.data.dataProviders.getClipboardProvider.update(
                                                $scope.data.clipboardObjects,
                                                $scope.data.clipboardObjects.length );
                                            var vmoToSelect = $scope.data.dataProviders.getClipboardProvider.viewModelCollection
                                                .getLoadedViewModelObjects().filter( function( vmo, idx ) {
                                                    return selectedIndices.indexOf( idx ) !== -1;
                                                } );

                                            $scope.data.dataProviders.getClipboardProvider.selectionModel
                                                .setSelection( vmoToSelect );

                                            if( $scope.selectionMode === 'single' ||
                                                $scope.selectionMode === 'multiple' ) {
                                                $scope.data.dataProviders.getClipboardProvider.selectionModel
                                                    .setMode( $scope.selectionMode );
                                            } else {
                                                $scope.data.dataProviders.getClipboardProvider.selectionModel
                                                    .setMode( 'multiple' );
                                            }

                                            //make the dataProider initialize
                                            $scope.data.dataProviders.getClipboardProvider.initialize( $scope );
                                            appCtxService.registerCtx( 'getClipboardProvider',
                                                $scope.data.dataProviders.getClipboardProvider );
                                        }
                                    } );

                            $scope.$on( '$destroy', function() {
                                appCtxService.unRegisterCtx( 'getClipboardProvider' );
                            } );
                        }
                    ],
                    templateUrl: app.getBaseUrlPath() + '/html/aw-clipboard.directive.html'
                };
            }
        ] );
