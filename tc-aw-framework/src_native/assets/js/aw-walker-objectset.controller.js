// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw-walker-objectset.controller
 */
import * as app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import browserUtils from 'js/browserUtils';
import awContentFilter from 'js/awContentFilter';
import tcColumnUtils from 'js/tcColumnUtils';
import xrtObjectSetSvc from 'js/xrtObjectSetService';
import adapterService from 'js/adapterService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import selModelFactory from 'js/selectionModelFactory';
import appCtxSvc from 'js/appCtxService';
import xrtObjectSetAutoResizeService from 'js/xrtObjectSetAutoResizeService';
import xrtUtilities from 'js/xrtUtilities';
import functional from 'js/functionalUtility.service';
import commandConfigurationService from 'js/commandConfigurationService'; //'js/commandConfiguration.command-provider';
import columnArrangeSvc from 'js/columnArrangeService';
import AwPromiseService from 'js/awPromiseService';
import AwTimeoutService from 'js/awTimeoutService';
import declDataCtxSvc from 'js/declarativeDataCtxService';

var $q = null;
var $timeout = null;
var cmdConfigSvc = null;

var xrtCommandAliasMap = {
    'com.teamcenter.rac.common.XShare': 'XcShareData',
    'com.teamcenter.rac.common.ReplaceDataset': 'Awp0ReplaceDataset',
    'com.teamcenter.rac.common.AddNew': 'Awp0ShowAddObject',
    'com.teamcenter.rac.common.AddReference': 'Awp0ShowAddObject',
    'com.teamcenter.rac.viewer.pastewithContext': 'Awp0Paste'

};

/**
 * Controller referenced from the 'div' <aw-walker-objectset>
 *
 * @memberof NgController
 * @member awWalkerObjectsetController
 */
app.controller( 'awWalkerObjectsetController', [
    '$scope',
    '$element',
    function( $scope, $element ) {
        var self = this;
        $q = AwPromiseService.instance;
        $timeout = AwTimeoutService.instance;
        cmdConfigSvc = commandConfigurationService.instance;

        //TODO - Post 4.0 cleanup - convert to zero compile command similar to PWA view mode
        var displayModesMap = {
            List: 'listDisplay',
            Table: 'tableDisplay',
            Compare: 'compareDisplay',
            Images: 'thumbnailDisplay'
        };

        var displayModesMapDbValue = {
            cmdListView: 'listDisplay',
            cmdTableView: 'tableDisplay',
            cmdCompareView: 'compareDisplay',
            cmdImage: 'thumbnailDisplay'
        };

        var displayMap = {
            listDisplay: {
                dbValue: 'cmdListView',
                uiValue: 'List'
            },
            tableDisplay: {
                dbValue: 'cmdTableView',
                uiValue: 'Table'
            },
            thumbnailDisplay: {
                dbValue: 'cmdImage',
                uiValue: 'Image'
            },
            compareDisplay: {
                dbValue: 'cmdCompareView',
                uiValue: 'Compare'
            }
        };

        var OBJECT_SET_VIEWMODE_CONTEXT = 'objectSetViewModeContext';
        var OBJECT_SET_DEFAULT_SELECTION_CONTEXT = 'objectSetDefaultSelection';
        var simplifiedSource = null;
        var _secondarySelectionChanged = false;

        var _eventBusSubDefs = [];

        $scope.contentFilter = awContentFilter;

        // Add the context for the commands
        var commandIdMap = $scope.objsetdata.commands.map( functional.getProp( 'commandId' ) )
            .reduce( functional.toBooleanMap, {} );

        // add aliases to commandIdMap
        var commandIdKeys = _.keys( commandIdMap );
        _.forEach( commandIdKeys, function( currentCommandId ) {
            var aliasCommandId = xrtCommandAliasMap[ currentCommandId ];
            if( aliasCommandId ) {
                commandIdMap[ aliasCommandId ] = true;
            }
        } );

        var parameterMap = $scope.objsetdata.commands.reduce( function( acc, nxt ) {
            var k = xrtCommandAliasMap[ nxt.commandId ] ? xrtCommandAliasMap[ nxt.commandId ] :
                nxt.commandId;
            acc[ k ] = nxt.parameters ? nxt.parameters : {};
            return acc;
        }, {} );
        $scope.commandContext = {
            displayModes: $scope.objsetdata.displayModes,
            displayModesCount: Object.keys( $scope.objsetdata.displayModes ).length,
            currentDisplay: null, //set later when activeDisplay is set
            xrtCommands: commandIdMap,
            objectSetSource: $scope.objsetdata.source,
            objectSetSourceHasDataset: $scope.objsetdata.sourceHasDataset,
            isObjectSetSourceS2P: $scope.objsetdata.source.includes( 'S2P:' ),
            objectSetSourceArray: $scope.objsetdata.source ? $scope.objsetdata.source.split( ',' ) : [],
            modelTypeRelationListMap: xrtObjectSetSvc
                .getModelTypeRelationListMap( $scope.objsetdata.source ),
            objectSetTitleKey: $scope.titlekey,
            displayTitle: $scope.displaytitle,
            vmo: $scope.viewModel.vmo,
            dataProvider: $scope.viewModel.dataProviders[ $scope.objsetdata.id + '_Provider' ],
            columnProvider: $scope.viewModel.columnProviders[ $scope.objsetdata.id + '_ColumnProvider' ],
            providerName: 'Awp0ObjectSetRowProvider',
            parameterMap: parameterMap
        };
        $scope.commandContext.modelTypeRelations = Object
            .keys( $scope.commandContext.modelTypeRelationListMap );

        var dataProviderAction = $scope.commandContext.dataProvider.action;

        if( dataProviderAction && dataProviderAction.inputData && dataProviderAction.inputData.searchInput &&
            dataProviderAction.inputData.searchInput.searchCriteria ) {
            var searchCriteria = _.clone( dataProviderAction.inputData.searchInput.searchCriteria );
            let functions = _.isFunction( $scope.viewModel.getFunctions ) ? $scope.viewModel.getFunctions() : null;
            declDataCtxSvc.applyScope( $scope.viewModel, searchCriteria, functions, $scope, xrtUtilities );
            $scope.commandContext.searchCriteria = searchCriteria;
        } else {
            $scope.commandContext.searchCriteria = appCtxSvc.getCtx( 'search.criteria' );
        }

        /**
         * Generate placements specific to the current object set.
         */
        var idAliasMap = {
            'com.teamcenter.rac.common.XShare': 'XcShareData',
            'com.teamcenter.rac.common.AddNew': 'Awp0ShowAddObject',
            'com.teamcenter.rac.common.AddReference': 'Awp0ShowAddObject',
            'com.teamcenter.rac.common.ReplaceDataset': 'Awp0ReplaceDataset'
        };
        var dynamicPlacements = $scope.objsetdata.commands.map( function( command, idx ) {
            return {
                id: idAliasMap[ command.commandId ] || command.commandId,
                priority: idx * 10,
                uiAnchor: $scope.objsetdata.id
            };
        } );
        cmdConfigSvc.addPlacements( dynamicPlacements ).then(
            function( placementRemover ) {
                $scope.placementsCreated = true;
                //async so scope might have been destroyed while this was happening
                if( $scope.$$destroyed ) {
                    placementRemover();
                } else {
                    $scope.$on( '$destroy', placementRemover );
                }
            } );

        /**
         * Set Objectset height and width
         */
        function _setObjectSetHeightAndWidth() {
            $timeout( _setObjectSetHeightAndWidthInternal, 250, false );
        }

        /**
         * Set Objectset height and width
         */
        function _setObjectSetHeightAndWidthInternal() {
            // LCS-138303 - Performance tuning for 14 Objectset Table case - implementation
            // - Move height calcluation logic to separate function without timeout.
            // - Add logic for stop event publish when height is not changed.
            // - We can tune it later by deprecate _setObjectSetHeightAndWidth - don't see any
            //   reason we need a $timout here from all callers in this file
            var newHeight = xrtObjectSetSvc.calculateObjectsetHeight(
                $scope.activeDisplay, $scope.objsetdata, $scope.viewModel, $element );

            $scope.objectSetWidth = browserUtils.isIE ? 'calc(100% - 10px)' : '100%';
            if( $scope.objectSetHeight !== newHeight ) {
                $scope.objectSetHeight = newHeight;
                eventBus.publish( $scope.gridId + '.plTable.containerHeightUpdated', $scope.objectSetHeight - 5 );
            }
        }

        /**
         * update Objectset height
         */
        function _updateObjectSetHeightAndWidth() {
            var objSetData = $scope.objsetdata;
            var viewModel = $scope.viewModel;
            var displayMode = objSetData.displayModes[ objSetData.defaultDisplay ];
            if( displayMode ) {
                var dataProvider = viewModel.dataProviders[ displayMode.dataProvider ];
                if( objSetData.defaultDisplay === 'tableDisplay' ) {
                    var grid = viewModel.grids[ displayMode.gridProvider ];
                    dataProvider = viewModel.dataProviders[ grid.dataProvider ];
                }
                var event = dataProvider.name + '.modelObjectsUpdated';
                var eventExists = _.find( _eventBusSubDefs, ( value ) => { return value.topic === event; } );
                if( !eventExists ) {
                    _eventBusSubDefs.push( eventBus.subscribe( event, function() {
                        _setObjectSetHeightAndWidth();

                        /**
                         * Swap selection model after dataProvider updates
                         */
                        var dataProvider = $scope.dataProvider;
                        if( $scope.activeDisplay === displayModesMap.Table ) {
                            dataProvider = $scope.viewModel.dataProviders[ $scope.gridId ];
                        }

                        if( dataProvider ) {
                            dataProvider.swapSelectionModel( $scope.selectionModel, $scope );
                        }
                    } ) );
                }
            }
        }

        /**
         * Manually set attributesToInflate and reload the dat
         *
         * Only table does this hack currently, but since data is shared between table/list/compare the
         * hack must always hapen
         */
        function _reloadData() {
            if( $scope.dataProvider && $scope.dataProvider.action &&
                $scope.dataProvider.action.inputData &&
                $scope.dataProvider.action.inputData.searchInput ) {
                var searchInput = $scope.dataProvider.action.inputData.searchInput;

                var colProviders = Object.keys( $scope.viewModel.columnProviders ).map( function( i ) {
                    return $scope.viewModel.columnProviders[ i ];
                } );
                var columnAttrsMap = colProviders
                    //Get 2d array of properties required for each column provider
                    .map( function( colProvider ) {
                        return tcColumnUtils.retrieveColumnNames( colProvider );
                    } )
                    //Flatten the array
                    .reduce( function( acc, nxt ) {
                        return acc.concat( nxt );
                    }, [] )
                    //Merge the lists into a set (boolean map)
                    .reduce( function( acc, nxt ) {
                        acc[ nxt ] = true;
                        return acc;
                    }, {} );

                var columnAttrs = Object.keys( columnAttrsMap );
                if( searchInput.attributesToInflate ) {
                    searchInput.attributesToInflate = _.union( searchInput.attributesToInflate,
                        columnAttrs );
                } else {
                    searchInput.attributesToInflate = columnAttrs;
                }
            }
            $scope.$broadcast( 'dataProvider.reset' );
        }

        /**
         * Setup event subscriptions
         */
        function _setupEventSubscriptions() {
            $scope.$watch( 'commandContext.currentDisplay', function( displayMode, oldDisplayMode ) {
                if( displayMode !== oldDisplayMode ) {
                    _updateObjectSetHeightAndWidth();
                    if( displayMode === 'compareDisplay' ) {
                        self.changeDisplayMode( displayMode, $scope.objsetdata.displayModes[ displayModesMap.Table ] );
                    } else {
                        self.changeDisplayMode( displayMode, $scope.objsetdata.displayModes[ displayMode ] );
                    }
                }
            } );

            $scope.$watch( 'selectionModel.multiSelectEnabled', function( newValue, oldValue ) {
                if( newValue !== oldValue ) {
                    $scope.showCheckBox = newValue;
                    eventBus.publish( $scope.gridId + '.plTable.clientRefresh' );
                }
            } );

            //Listen for the Related data modified event, and tell dataproviders to update.
            _eventBusSubDefs.push( eventBus.subscribe( 'cdm.relatedModified', function( data ) {
                if( $scope.viewModel.vmo ) {
                    var containsS2PRelation = false;
                    if( data.relations && data.relations.dbValue ) {
                        var isS2PRelation = _.includes( data.relations.dbValue, 'S2P:' );
                        if( isS2PRelation ) {
                            containsS2PRelation = _.includes( $scope.objsetdata.source,
                                data.relations.dbValue );
                        }
                    }

                    var matches = data.relatedModified.filter( function( mo ) {
                        return mo.uid === $scope.viewModel.vmo.uid;
                    } );

                    //If current model object was modified
                    if( matches.length || containsS2PRelation ) {
                        //Reload just XRT data
                        if( !data.refreshLocationFlag ) {
                            //If the panel isn't pinned update the selection
                            if( !data.isPinnedFlag && data.createdObjects ) {
                                //Select the newly created objects
                                if( data.createdObjects ) {
                                    if( data.createdObjects.length > 1 || $scope.selectionModel.getCurrentSelectedCount() > 1 || $scope.selectionModel.multiSelectEnabled ) {
                                        $scope.selectionModel.addToSelection( data.createdObjects );
                                    } else {
                                        $scope.selectionModel.setSelection( data.createdObjects );
                                    }
                                }
                            }

                            _updateObjectSetHeightAndWidth();
                            _reloadData();
                        } else {
                            //Or offload a tracker to remember default selection while xrt is reloaded
                            var ctx = appCtxSvc.getCtx( OBJECT_SET_DEFAULT_SELECTION_CONTEXT ) || {};
                            if( data.createdObjects ) {
                                ctx[ simplifiedSource ] = data.createdObjects.map( function( x ) {
                                    return x.uid;
                                } );
                            }
                            appCtxSvc.registerCtx( OBJECT_SET_DEFAULT_SELECTION_CONTEXT, ctx );
                        }
                    }
                }
            } ) );

            //Listen for the Related data modified event, and tell dataproviders to update.
            _eventBusSubDefs.push( eventBus.subscribe( 'cdm.modified', function( data ) {
                if( $scope.viewModel.vmo ) {
                    var matches = data.modifiedObjects.filter( function( mo ) {
                        return mo.uid === $scope.viewModel.vmo.uid;
                    } );

                    //If current model object was modified
                    if( matches.length ) {
                        _.forEach( $scope.viewModel.vmo.props,
                            function( vmoProp ) {
                                if( vmoProp.type === 'OBJECT' && vmoProp.valueUpdated ) {
                                    if( _.includes( $scope.objsetdata.source, vmoProp.propertyName ) ) {
                                        //If the panel isn't pinned update the selection
                                        if( !data.isPinnedFlag && data.createdObjects ) {
                                            //Select the newly created objects
                                            if( data.createdObjects ) {
                                                if( data.createdObjects.length > 1 || $scope.selectionModel.getCurrentSelectedCount() > 1 || $scope.selectionModel
                                                    .multiSelectEnabled ) {
                                                    $scope.selectionModel.addToSelection( data.createdObjects );
                                                } else {
                                                    $scope.selectionModel.setSelection( data.createdObjects );
                                                }
                                            }
                                        }

                                        _updateObjectSetHeightAndWidth();
                                        _reloadData();
                                        return; //Do this only once.
                                    }
                                }
                            } );
                    }
                }
            } ) );

            _eventBusSubDefs.push( eventBus.subscribe( 'appCtx.register', function( eventData ) {
                if( eventData && eventData.name && eventData.name === 'ActiveWorkspace:xrtContext' ) {
                    _reloadData();
                }
            } ) );

            _eventBusSubDefs.push( eventBus.subscribe( 'appCtx.update', function( eventData ) {
                if( eventData && eventData.name && eventData.name === 'ActiveWorkspace:xrtContext' ) {
                    _reloadData();
                }
            } ) );

            _eventBusSubDefs.push( eventBus.subscribe( 'columnArrange', function( eventData ) {
                if( eventData && $scope.gridId === eventData.name ) {
                    columnArrangeSvc.arrangeColumns( $scope.viewModel, eventData );
                }
            } ) );

            _eventBusSubDefs.push( eventBus.subscribe( $scope.objsetdata.id + '.resizeCheck', function() {
                let newHeight = xrtObjectSetSvc.calculateObjectsetHeight( $scope.activeDisplay, $scope.objsetdata, $scope.viewModel, $element );
                if( $scope.objectSetHeight !== newHeight ) {
                    $scope.objectSetHeight = newHeight;
                    eventBus.publish( $scope.gridId + '.plTable.containerHeightUpdated', $scope.objectSetHeight - 5 );
                    $scope.$digest();
                }
            } ) );

            _eventBusSubDefs.push( eventBus.subscribe( $scope.objsetdata.id + '_Provider.selectionChangeEvent', function() {
                // on actual selection change, make a note of it so we can correctly publish event later
                _secondarySelectionChanged = true;
            } ) );
        }

        _setupEventSubscriptions();

        /**
         * Utility to create relation info object
         *
         * @param {Object} baseSelection - base selection
         * @param {Array} childSelections - array of child selections
         *
         * @return {Object} An object which contains primaryObject, relationObject, relationType and
         *         secondaryObject
         */
        var _getRelationInfo = function( baseSelection, childSelections ) {
            if( childSelections ) {
                return childSelections.map( function( mo ) {
                    var priObj = baseSelection;
                    var secObj = mo;
                    var relObj = null;
                    var relStr = null;

                    if( mo.type === 'Awp0XRTObjectSetRow' && mo.props && mo.props.awp0Target ) {
                        if( cdm.isValidObjectUid( mo.props.awp0Primary.dbValue ) ) {
                            priObj = viewModelObjectService.createViewModelObject( cdm
                                .getObject( mo.props.awp0Primary.dbValue ) );
                        }

                        if( cdm.isValidObjectUid( mo.props.awp0Secondary.dbValue ) ) {
                            secObj = viewModelObjectService.createViewModelObject( cdm
                                .getObject( mo.props.awp0Secondary.dbValue ) );
                        }

                        if( cdm.isValidObjectUid( mo.props.awp0Relationship.dbValue ) ) {
                            relObj = viewModelObjectService.createViewModelObject( cdm
                                .getObject( mo.props.awp0Relationship.dbValue ) );
                        }

                        relStr = mo.props.relation.dbValue;
                    }
                    return {
                        primaryObject: priObj,
                        relationObject: relObj,
                        relationType: relStr,
                        secondaryObject: secObj
                    };
                } );
            }

            return null;
        };

        $scope.$on( 'dataProvider.selectionChangeEvent', function( event, data ) {
            if( data.clearSelections ) {
                let dp = $scope.viewModel.dataProviders[ $scope.objsetdata.id + '_Provider' ];
                dp.selectNone();
                return;
            }
            if( !data.secondEmit ) {
                event.stopPropagation();

                if( $scope.objsetdata.showConfiguredRev ) {
                    if( !_.isEmpty( data.selected ) ) {
                        appCtxSvc.registerCtx( 'showConfiguredRev', $scope.objsetdata.showConfiguredRev );
                    } else {
                        appCtxSvc.unRegisterCtx( 'showConfiguredRev' );
                    }
                }

                data.relationContext = _getRelationInfo( $scope.viewModel.vmo, data.dataProvider
                    .getSelectedObjects() );

                var adaptedObjsPromise = adapterService.getAdaptedObjects( data.selected );
                adaptedObjsPromise.then( function( adaptedObjs ) {
                    var adaptedVmos = [];
                    _.forEach( adaptedObjs, function( adaptedObject ) {
                        if( adaptedObject ) {
                            if( viewModelObjectService.isViewModelObject( adaptedObject ) ) {
                                adaptedVmos.push( adaptedObject );
                            } else {
                                adaptedVmos.push( viewModelObjectService
                                    .constructViewModelObjectFromModelObject( adaptedObject, 'EDIT' ) );
                            }
                        }
                    } );

                    data.selected = adaptedVmos;
                    data.secondEmit = true;
                    $scope.$emit( 'dataProvider.selectionChangeEvent', data );

                    if( _secondarySelectionChanged ) {
                        _secondarySelectionChanged = false;
                        eventBus.publish( 'objectSet.selectionChangeEvent', data );
                    }
                } );
            }
        } );

        /**
         * Create selection model which is maintained by objectSet to persist selections across display
         * modes
         *
         * @param {String} displayModeKey - display mode key which refers to list/image/compare/grid
         * @param {Object} displayModeValue - dataProvider or gridId based on the display mode
         */
        self.createSelectionModel = function( displayModeKey, displayModeValue ) {
            if( $scope.viewModel.dataProviders && displayModeKey && displayModeValue ) {
                /**
                 * How the sublocation tracks selection. The PWA selection model will use just the uid
                 * to track selection.
                 *
                 * @param input {Any} - The object that needs to be tracked.
                 */
                var selectionTracker = function( input ) {
                    if( typeof input === 'string' ) {
                        return input;
                    }

                    if( input && input.type === 'Awp0XRTObjectSetRow' ) {
                        var targetObj = _.get( input, 'props.awp0Target' );
                        if( targetObj && targetObj.dbValue ) {
                            return targetObj.dbValue;
                        }
                    }

                    return input.uid;
                };
                var dataProvider = $scope.viewModel.dataProviders[ displayModeValue.dataProvider ];

                if( displayModeKey !== displayModesMap.List &&
                    displayModeKey !== displayModesMap.Images ) {
                    dataProvider = $scope.viewModel.dataProviders[ displayModeValue.gridProvider ];
                }

                if( dataProvider ) {
                    $scope.selectionModel = selModelFactory.buildSelectionModel(
                        dataProvider.selectionMode ? dataProvider.selectionMode : 'multiple',
                        selectionTracker );
                    dataProvider.swapSelectionModel( $scope.selectionModel, $scope );
                }
            } else {
                $scope.selectionModel = selModelFactory.buildSelectionModel( 'multiple',
                    selectionTracker );
            }
        };

        /**
         * Set first page json into the data providers
         *
         * @param {Object} provider - provider to update
         * @param {Object[]} firstPageObjs - objects to insert
         */
        self.updateDataProvider = function( provider, firstPageObjs ) {
            var defaultSelection = appCtxSvc.getCtx( OBJECT_SET_DEFAULT_SELECTION_CONTEXT + '.' +
                simplifiedSource );

            if( firstPageObjs.length > 0 ) {
                if( defaultSelection ) {
                    var ctx = appCtxSvc.getCtx( OBJECT_SET_DEFAULT_SELECTION_CONTEXT ) || {};
                    delete ctx[ simplifiedSource ];

                    return adapterService.getAdaptedObjects( firstPageObjs ).then( function( adaptedObjs ) {
                        var objsToSelect = adaptedObjs.map( function( x, idx ) {
                            //Get the runtime object for the underlying object if it is selected
                            if( defaultSelection.indexOf( x.uid ) !== -1 ) {
                                return firstPageObjs[ idx ];
                            }
                        } ).filter( function( x ) {
                            return x;
                        } );
                        $scope.selectionModel.setSelection( objsToSelect );
                        provider.update( firstPageObjs, firstPageObjs.length + 1 );

                        return provider;
                    } );
                }
                provider.update( firstPageObjs, firstPageObjs.length + 1 );
            } else {
                provider.update( firstPageObjs, firstPageObjs.length );
            }
            return $q.when( provider );
        };

        /**
         * Add or remove scroll panel based on the input paramater
         *
         * @param {Element} $element - parent container element
         * @param {String} add - TRUE if scrollPanel css class needs to be added, FALSE otherwise
         */
        function _addorRemoveScrollPanel( $element, add ) {
            if( $element ) {
                var objSetContentElem = $element.find( '.aw-xrt-objectSetContent' );
                if( objSetContentElem && objSetContentElem.length > 0 ) {
                    if( add ) {
                        $( objSetContentElem[ 0 ] ).addClass( 'aw-base-scrollPanel' );
                    } else {
                        $( objSetContentElem[ 0 ] ).removeClass( 'aw-base-scrollPanel' );
                    }
                }
            }
        }

        /**
         * Update object set view mode context in 'ctx' object
         *
         * @param {String} displayModeKey - display mode key which refers to list/image/compare/grid
         */
        function _updateViewModeContext( displayModeKey ) {
            if( displayModeKey ) {
                $scope.activeDisplay = displayModeKey;

                var objectSetViewModeContext = appCtxSvc.getCtx( OBJECT_SET_VIEWMODE_CONTEXT );
                if( !objectSetViewModeContext ) {
                    objectSetViewModeContext = {};
                }

                objectSetViewModeContext[ simplifiedSource ] = displayModeKey;
                appCtxSvc.registerCtx( OBJECT_SET_VIEWMODE_CONTEXT, objectSetViewModeContext );
            }
        }

        /**
         * Update display based on displayMode input parameter
         *
         * @param {String} displayModeKey - display mode key which refers to list/image/compare/grid
         * @param {Object} displayModeValue - dataProvider or gridId based on the display mode
         * @param {dataProvider} provider - data provider
         */
        function _updateDisplay( displayModeKey, displayModeValue, provider ) {
            if( ( displayModeKey === displayModesMap.List || displayModeKey === displayModesMap.Images ) &&
                provider ) {
                _addorRemoveScrollPanel( $element, true );

                $scope.dataProvider = provider;
            } else if( displayModeKey === displayModesMap.Table ) {
                _addorRemoveScrollPanel( $element, true );

                $scope.gridId = displayModeValue.gridProvider;
            } else if( displayModeKey === displayModesMap.Compare ) {
                _addorRemoveScrollPanel( $element, true );
                $scope.gridId = displayModeValue.gridProvider + '_compare';
                const columnProviderName = $scope.viewModel.grids[ displayModeValue.gridProvider ].columnProvider;
                const dataProviderName = $scope.viewModel.grids[ displayModeValue.gridProvider ].dataProvider;
                if( !$scope.viewModel.grids[ $scope.gridId ] ) {
                    $scope.viewModel.grids[ $scope.gridId ] = {
                        dataProvider: dataProviderName,
                        columnProvider: columnProviderName,
                        enableArrangeMenu: true
                    };
                }
                _setObjectSetHeightAndWidth();
            }
        }

        /**
         * Process and update data providers on initialize
         *
         * @param {String} displayModeKey - display mode key which refers to list/image/compare/grid
         * @param {Object} displayModeValue - dataProvider or gridId based on the display mode
         */
        function _processDataProviders( displayModeKey, displayModeValue ) {
            var displayModeValueIn = displayModeValue;
            if( displayModeKey === displayModesMap.Compare ) {
                displayModeValueIn = $scope.objsetdata.displayModes[ displayModesMap.Table ];
            }

            var provider = null;
            var finish = function( retProvider ) {
                var type = $scope.viewModel.xrtType;

                _updateDisplay( displayModeKey, displayModeValueIn, retProvider );

                // if it is info panel, then don't set the height of list/table widget
                if( type !== 'INFO' ) {
                    _setObjectSetHeightAndWidth();
                }
            };

            if( $scope.viewModel.dataProviders ) {
                provider = $scope.viewModel.dataProviders[ displayModeValueIn.dataProvider ];
                if( !provider ) {
                    provider = $scope.viewModel.dataProviders[ displayModeValueIn.gridProvider ];
                }

                if( provider && $scope.objsetdata && $scope.objsetdata.source ) {
                    provider.setValidSourceTypes( $scope.objsetdata.source );
                }

                if( provider && provider.json.firstPage && !_.isEmpty( provider.json.firstPage ) ) {
                    var firstPageObjs = [];
                    _.forEach( provider.json.firstPage, function( uid ) {
                        var vmos = $scope.viewModel.objects[ uid ];
                        if( vmos ) {
                            if( Array.isArray( vmos ) ) {
                                Array.prototype.push.apply( firstPageObjs, vmos );
                            } else {
                                firstPageObjs.push( vmos );
                            }
                        }
                    } );
                    self.updateDataProvider( provider, firstPageObjs ).then( finish );
                } else if( provider.viewModelCollection.getTotalObjectsFound() === 0 ) {
                    self.updateDataProvider( provider, [] ).then( finish );
                }
            }
        }

        /**
         * Initialize display mode
         *
         * @param {String} displayModeKey - display mode key which refers to list/image/compare/grid
         * @param {Object} displayModeValue - dataProvider or gridId based on the display mode
         */
        function _initDisplayMode( displayModeKey, displayModeValue ) {
            if( displayModeKey ) {
                _updateViewModeContext( displayModeKey );
                _processDataProviders( displayModeKey, displayModeValue );
            }
        }

        /**
         * Handle display mode change in objectSet.
         *
         * @param {String} displayModeKey - display mode key which refers to list/image/compare/grid
         * @param {Object} displayModeValue - dataProvider or gridId based on the display mode
         */
        self.changeDisplayMode = function( displayModeKey, displayModeValue ) {
            if( displayModeKey ) {
                _updateViewModeContext( displayModeKey );

                var provider = null;
                var displayModeValueIn = displayModeValue;
                if( $scope.viewModel.dataProviders ) {
                    provider = $scope.viewModel.dataProviders[ displayModeValueIn.dataProvider ];
                    if( !provider ) {
                        provider = $scope.viewModel.dataProviders[ displayModeValueIn.gridProvider ];
                    }
                }

                _updateDisplay( displayModeKey, displayModeValueIn, provider );
            }
        };

        /**
         * Initialize setup for objectset
         */
        self.initialize = function() {
            if( $scope.objsetdata ) {
                if( $scope.objsetdata.source ) {
                    /**
                     * Convert all special characters in objectSet source to underscore '_' so that we
                     * can add it as a key in appCtxService to persist the displayMode state
                     */
                    simplifiedSource = $scope.objsetdata.source.replace( /[^A-Z0-9]/ig, '_' );
                }

                /**
                 * Add compare display mode to displayModes because compare is a client side option and
                 * not coming from XRT.
                 */
                $scope.objsetdata.displayModes[ displayModesMap.Compare ] = $scope.objsetdata.displayModes[ displayModesMap.Table ];

                var objectSetViewMode = appCtxSvc.getCtx( OBJECT_SET_VIEWMODE_CONTEXT + '.' +
                    simplifiedSource );

                if( objectSetViewMode && $scope.objsetdata.displayModes[ objectSetViewMode ] ) {
                    $scope.activeDisplay = objectSetViewMode;
                } else if( $scope.objsetdata.defaultDisplay ) {
                    $scope.activeDisplay = $scope.objsetdata.defaultDisplay;
                } else {
                    $scope.activeDisplay = displayModesMap.List;
                }
                $scope.commandContext.currentDisplay = $scope.activeDisplay;

                $scope.showCheckBox = undefined;

                self.createSelectionModel( $scope.activeDisplay,
                    $scope.objsetdata.displayModes[ $scope.activeDisplay ] );

                _initDisplayMode( $scope.activeDisplay,
                    $scope.objsetdata.displayModes[ $scope.activeDisplay ] );

                // LCS-138303 - Performance tuning for 14 Objectset Table case - implementation
                // Do height inintialization at once to save table bouncing
                $scope.objectSetHeight = xrtObjectSetSvc.calculateObjectsetHeight(
                    $scope.activeDisplay, $scope.objsetdata, $scope.viewModel, $element );

                if( $scope.objsetdata.smartObjSet ) {
                    xrtObjectSetAutoResizeService.startResizeWatcher( $scope );
                }
            }
        };

        $scope.$on( '$destroy', function() {
            _.forEach( _eventBusSubDefs, function( subDef ) {
                eventBus.unsubscribe( subDef );
            } );
        } ); // $destroy
    }
] );
