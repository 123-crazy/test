// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/*global
 define
 */

/**
 * Directive to filter projects from list
 * 
 * @module js/aw-project-selector.directive
 */

import * as app from 'app';
import _ from 'lodash';
import $ from 'js/declDataProviderService';
import 'js/dataProviderFactory';
import 'js/viewModelService';
import 'js/aw-textbox.directive';
import 'js/aw-list.directive';
import 'js/aw-default-cell.directive';

/**
 * Directive to filter projects from list.
 * 
 * @example <aw-project-selector filterProp="data.projectSearchFilter"></aw-project-selector>
 * 
 * @member aw-project-selector
 * @memberof NgElementDirectives
 */
app.directive( 'awProjectSelector',
    [
        'declDataProviderService',
        'dataProviderFactory',
        'viewModelService',
        function( declDataProviderSvc, dataProviderFactory, viewModelSvc ) {
            return {
                restrict: 'E',
                scope: {
                    filterProp: '=?'
                },
                controller: [ '$scope', '$timeout',
                    function( $scope, $timeout ) {

                        var declViewModel = viewModelSvc.getViewModel( $scope, true );

                        var dataProviderName = "getUserProjectsProvider";
                        var dataProviderJson = {
                            response: "{{data.projects}}",
                            totalFound: "{{data.totalProjectsFound}}",
                            selectionModelMode: "multiple",
                            commandsAnchor: "com.siemens.splm.clientfx.ui.modelObjectDataGridActionCommands"
                        };

                        var dataProviderAction = {
                            actionType: "JSFunctionAsync",
                            method: "getPropertiesProject",
                            inputData: {
                                data: "{{data}}",
                                sortCriteria: "",
                                startIndex: "{{data.dataProviders.getUserProjectsProvider.startIndex}}",
                                filterVal: "{{data.dataProviders.newValue}}"
                            },
                            outputData: {

                            },
                            deps: "js/addObjectUtils"
                        };

                        if( !declViewModel._internal.actions ) {
                            declViewModel._internal.actions = {};
                            declViewModel._internal.actions[ dataProviderName ] = dataProviderAction;
                        }

                        // Instantiate the dataprovider
                        if( !declViewModel.dataProviders ) {
                            declViewModel.dataProviders = {};
                        }
                        $scope.dataprovider = new dataProviderFactory.createDataProvider( dataProviderJson,
                            dataProviderAction, dataProviderName, declDataProviderSvc );
                        declViewModel.dataProviders[ dataProviderName ] = $scope.dataprovider;

                        // Initialize the dataProvider
                        $scope.dataprovider.initialize( $scope );

                        var filterTimeout = null;
                        $scope.$watch( 'filterProp.dbValue', function _watchProjectSearchFilter(
                            newValue, oldValue ) {
                            if( !_.isNull( filterTimeout ) ) {
                                $timeout.cancel( filterTimeout );
                            }

                            if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) &&
                                newValue !== oldValue ) {
                                filterTimeout = $timeout(
                                    function() {
                                        $scope.dataprovider.action.inputData.filterVal = newValue;
                                        $scope.dataprovider.initialize( $scope );
                                    }, 2000 );
                            }
                        } );
                    }
                ],
                templateUrl: app.getBaseUrlPath() + '/html/aw-project-selector.directive.html'
            };
        }
    ] );
