/* eslint-disable valid-jsdoc */
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
 * Directive to display a list of available business object types with a filter box on top of the list. The displayed
 * list can be filtered by entering search text in the filter box. User can select a single type from the list. Upon
 * selection, an event 'awTypeSelector.selectionChangeEvent' will be published. The selected type object can be found in
 * the event data at the eventData.selectedObjects array. Upon de-selection, same event will be published. However in
 * this event data, the eventData.selectedObjects array will be empty.<br>
 * Example usage: <aw-type-selector prop="data.filterBox"></aw-type-selector>
 *
 * To fetch the list from server, this directive uses the Awp0TypeSearchProvider. This data provider uses the root types
 * specified in preference AWC_DefaultCreateTypes to obtain the list of types. From the list, the types specified in
 * preference AWC_TypeSelectorExclusionTypeList are excluded.
 *
 * This directive can further be configured by using optional attributes as follows:<br>
 * 1. include: This attribute can specify a list of comma-separated business object types. This list will override the
 * list in preference AWC_DefaultCreateTypes. However, the resulting list will exclude the types specified in preference
 * AWC_TypeSelectorExclusionTypeList.<br>
 * Example usage: <aw-type-selector prop="data.filterBox" include="CAEItem,PSConnection"></aw-type-selector>
 *
 * 2. override-id: This attribute can specify an identifier to override the default preferences. The data provider will
 * then look up two preferences, namely AWC_[override-id]_TypeSelectorInclusionTypeList and
 * AWC_[override-id]_TypeSelectorExclusionTypeList, for the list of root types and excluded types, respectively.<br>
 * Example usage: <aw-type-selector prop="data.filterBox" override-id="CreateReport"></aw-type-selector>
 *
 * 3. load-sub-types: This attribute can specify whether sub types needs to be shown. This is an optional attribute. If
 * the attribute is not provided, all sub types will be loaded by default.<br>
 * Example usage: <aw-type-selector prop="data.filterBox" override-id="CreateReport" load-sub-types="false"></aw-type-selector>
 *
 * 4. auto-select-on-unique-type: This attribute is used to specify whether to auto select type if there is only one
 * type in the list. This is an optional attribute. If the attribute is not provided, auto selection won't happen.<br>
 * Example usage: <aw-type-selector prop="data.filterBox" override-id="CreateReport" auto-select-on-unique-type="true"></aw-type-selector>
 *
 * 5. preferred-type : optional, if provided loads the related xrt directly instead of showing Types panel
 *
 * Note: It must be ensured that the types specified in "include" attribute and the types in preference
 * AWC_TypeSelectorExclusionTypeList are mutually exclusive. Otherwise, the resulting list of available types will be
 * unpredictable. For example, consider this usage: <aw-type-selector prop="data.filterBox" include="MEOP,MEProocess"></aw-type-selector>
 * The resulting list of types will be empty because "MEOP" and "MEProocess" are both present in the out-of-the-box
 * value of preference AWC_TypeSelectorExclusionTypeList. In such case, one of the two below solutions can be employed:<br>
 * 1. Modify the AWC_TypeSelectorExclusionTypeList preference and remove "MEOP" and "MEProocess".<br>
 * 2. Create two override preferences, i.e. (i) "AWC_ME_TypeSelectorInclusionTypeList" with values "MEOP" and
 * "MEProocess", and (ii) "AWC_ME_TypeSelectorInclusionTypeList" with an empty list. Then use the type selector
 * directive as below:<br>
 * <aw-type-selector prop="data.filterBox" override-id="ME" preferred-type="Item"></aw-type-selector>
 *
 * @module js/aw-type-selector.directive
 */
import * as app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/declDataProviderService';
import 'js/dataProviderFactory';
import 'js/aw-textbox.directive';
import 'js/aw-list.directive';
import 'js/aw-type-cell.directive';
import 'js/visible-when.directive';
import 'js/localeService';
import 'js/viewModelService';

/**
 * Directive to display a list of available business object types with a filter box on top of the list. The
 * displayed list can be filtered by entering search text in the filter box. User can select a single type from
 * the list. This directive uses the Awp0TypeSearchProvider which uses two preferences named
 * AWC_DefaultCreateTypes and AWC_TypeSelectorExclusionTypeList for the list of root types and excluded types,
 * respectively. It can be configured using either of the optional attributes namely 'include' and
 * 'override-id'.
 *
 * @example <aw-type-selector prop="data.filterBox"></aw-type-selector>
 * @example <aw-type-selector prop="data.filterBox" include="CAEItem,PSConnection"></aw-type-selector>
 * @example <aw-type-selector prop="data.filterBox" override-id="CreateReport"></aw-type-selector>
 * @example <aw-type-selector prop="data.filterBox" preferred-type="Item" hide-search-box = "condition.hide"></aw-type-selector>
 *
 * @member aw-type-selector
 * @memberof NgElementDirectives
 */
app.directive( 'awTypeSelector', [ 'declDataProviderService', 'dataProviderFactory',
    'viewModelService', 'localeService',
    function( declDataProviderSvc, dataProviderFactory, viewModelSvc, localeSvc ) {
        return {
            restrict: 'E',
            scope: {
                prop: '=',
                include: '@?', // optional
                loadSubTypes: '=?', // optional, boolean
                autoSelectOnUniqueType: '=?', // optional, boolean
                overrideId: '@?', // optional
                preferredType: '@?', // optional string
                hideSearchBox: '=?' //optional boolean
            },
            controller: [ '$scope', '$timeout', function( $scope, $timeout ) {
                if( _.isUndefined( $scope.hideSearchBox ) ) {
                    $scope.hideSearchBox = false;
                }

                $scope.isInitialized = false;
                $scope.loadingText = '';
                $scope.noMatchesText = '';
                $scope.noAccessibleTypesText = localeSvc.getLoadedTextFromKey( 'TCUICommandPanelsMessages.noAccessibleTypes' );
                localeSvc.getTextPromise().then( function( localTextBundle ) {
                    $scope.loadingText = localTextBundle.LOADING_TEXT;
                    $scope.noMatchesText = localTextBundle.NO_LOV_VALUES;
                } );

                var declViewModel = viewModelSvc.getViewModel( $scope, true );

                var dataProviderName = 'awTypeSelector';
                var dataProviderJson = {
                    action: 'search',
                    response: '{{data.searchResults}}',
                    totalFound: '{{data.totalFound}}'
                };

                var dataProviderAction = {
                    actionType: 'TcSoaService',
                    serviceName: 'Internal-AWS2-2016-03-Finder',
                    method: 'performSearch',
                    inputData: {
                        columnConfigInput: {
                            clientName: 'AWClient',
                            clientScopeURI: 'Awp0SearchResults',
                            columnsToExclude: [],
                            hostingClientName: '',
                            operationType: 'intersection'
                        },
                        saveColumnConfigData: {
                            columnConfigId: '',
                            clientScopeURI: '',
                            columns: [],
                            scope: '',
                            scopeName: ''
                        },
                        searchInput: {
                            attributesToInflate: [ 'parent_types', 'type_name' ],
                            internalPropertyName: '',
                            maxToLoad: 25,
                            maxToReturn: 25,
                            providerName: 'Awp0TypeSearchProvider',
                            searchCriteria: {
                                searchString: $scope.prop.dbValue,
                                typeSelectorId:  $scope.overrideId === undefined  ? '' : $scope.overrideId,
                                listOfIncludeObjectTypes: $scope.include,

                                // Only when $scope.loadSubTypes is set to boolean false, then set the flag to 'false'.
                                // In all other cases including 'undefined', flag defaults to 'true'
                                loadSubTypes: $scope.loadSubTypes === false ? 'false' : 'true'
                            },
                            searchFilterFieldSortType: 'Alphabetical',
                            searchFilterMap: {},
                            searchSortCriteria: [],
                            startIndex: '{{data.dataProviders.' + dataProviderName +
                                '.startIndex}}'
                        }
                    },
                    outputData: {
                        totalFound: 'totalFound',
                        searchResults: 'searchResults'
                    }
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

                if( $scope.preferredType ) {
                    $scope.dataprovider.action.inputData.searchInput.searchCriteria.loadSubTypes = 'false';
                    $scope.dataprovider.action.inputData.searchInput.searchCriteria.listOfIncludeObjectTypes = $scope.preferredType;
                }
                // Initialize the dataProvider
                $scope.dataprovider.initialize( $scope ).then( function() {
                    $scope.isInitialized = true;
                } );

                // Take care of Ux standards:
                // The filter box must not have a display label
                if( _.isString( $scope.prop.propertyDisplayName ) ) {
                    $scope.prop.propertyDisplayName = undefined;
                }

                // Per Ux standard, ensure place holder text if not already
                if( _.isUndefined( $scope.prop.propertyRequiredText ) ||
                    $scope.prop.propertyRequiredText.length === 0 ) {
                    localeSvc.getTextPromise().then( function( localTextBundle ) {
                        $scope.prop.propertyRequiredText = localTextBundle.FILTER_TEXT;
                    } );
                }

                // Upon user entry in filter box, delay of 1.5 seconds before re-initiating dataprovider.
                var filterTimeout = null;
                $scope.$watch( 'prop.dbValue', function _watchProp( newValue, oldValue ) {
                    if( !_.isNull( filterTimeout ) ) {
                        $timeout.cancel( filterTimeout );
                    }

                    if( !( _.isNull( newValue ) || _.isUndefined( newValue ) ) &&
                        newValue !== oldValue ) {
                        filterTimeout = $timeout( function() {
                            $scope.dataprovider.action.inputData.searchInput.searchCriteria.searchString = newValue;
                            $scope.dataprovider.initialize( $scope );
                        }, 500 );
                    }
                } );

                var objectUpdatedEventDef = eventBus.subscribe( 'awTypeSelector.modelObjectsUpdated', function() {
                    if( $scope.hideSearchBox ) {
                        var eventData = {
                            hideCaptionTitle: true
                        };
                        $scope.$emit( 'captionTitleState.updated', eventData );
                    }

                    if( $scope.autoSelectOnUniqueType || $scope.preferredType ) {
                        if( $scope.dataprovider.viewModelCollection.totalFound === 1 ) {
                            $scope.dataprovider.selectionModel.setSelection(
                                $scope.dataprovider.getViewModelCollection().getViewModelObject( 0 ), $scope );
                        }

                        // The autoSelectOnUniqueType is valid only first time types are loaded.
                        if( $scope.autoSelectOnUniqueType ) {
                            $scope.autoSelectOnUniqueType = false;
                        }

                        if( $scope.preferredType ) {
                            // The preferred type is valid only first time you open the panel, when come back to types panel by clicking type( ex. Item )
                            // on xrt, it should load the types panel.
                            // if we do not delete the declViewModel.preferredType, it will come back to types panel and immediately navigate
                            // to preferred type as we have not deleted.
                            delete declViewModel.preferredType;
                            if( $scope.dataprovider.viewModelCollection.totalFound === 0 ) {
                                $scope.dataprovider.action.inputData.searchInput.searchCriteria.loadSubTypes = $scope.loadSubTypes === false ? 'false' :
                                    'true';
                                $scope.dataprovider.action.inputData.searchInput.searchCriteria.listOfIncludeObjectTypes = $scope.include;
                                $scope.dataprovider.initialize( $scope );
                            }
                        }
                    }
                } );
                $scope.$on( '$destroy', function() {
                    if( objectUpdatedEventDef ) {
                        eventBus.unsubscribe( objectUpdatedEventDef );
                        objectUpdatedEventDef = null;
                    }
                } );
            } ],
            templateUrl: app.getBaseUrlPath() + '/html/aw-type-selector.directive.html'
        };
    }
] );
