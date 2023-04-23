// Copyright 2020 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * @module js/aw-abstract-tableproperty.controller
 */
import * as app from 'app';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/viewModelObjectService';
import 'js/selectionModelFactory';
import 'soa/kernel/soaService';
import 'soa/kernel/clientDataModel';
import 'soa/kernel/clientMetaModel';
import 'js/editHandlerService';
import 'js/command.service';
import 'js/appCtxService';
import AwTimeoutService from 'js/awTimeoutService';
import xrtTableSvc from 'js/xrtTableHeightService';
import browserUtils from 'js/browserUtils';
import adapterService from 'js/adapterService';

let $timeout = null;

/*
 * Abstract controller for aw-walker-tableproperty.controller and aw-walker-namevalueproperty.controller
 *
 * @member awAbstractTablepropertyController
 * @memberof NgController
 */
app.controller( 'awAbstractTablepropertyController', [
    '$scope',
    'appCtxService',
    'viewModelObjectService',
    'selectionModelFactory',
    'soa_kernel_soaService',
    'soa_kernel_clientDataModel',
    'soa_kernel_clientMetaModel',
    'editHandlerService',
    'commandService', //
    function( $scope, appCtxSvc, viewModelObjectSrv, selModelFactory, soaSvc, cdm, cmm, editService,
        commandService ) {
        /**
         * Controller reference
         */
        let self = this;

        $timeout = AwTimeoutService.instance;

        /**
         * {String} Private member holding the grid id
         */
        let gridId;

        /**
         * {Object} Private member that holds data from inheriting controllers
         */
        let _propertyData;

        /**
         * {String} Private member indicating type of inheriting controller. Example: NameValue or
         * TableProperty
         */
        let _propertyType;

        let _persistentVMOs;

        /**
         * {ObjectArray} Collection of eventBus subscription definitions to be un-subscribed from when
         * this controller is destroyed.
         */
        let _eventBusSubDefs = [];

        /**
         * Sets the property data and type from inheriting controller
         *
         * @param {Object} propertyData object as available on scope of table property or name value
         *            directive
         * @param {String} propertyType string. Example NameValue or TableProperty
         */
        self.setPropertyData = function( propertyData, propertyType ) {
            _propertyData = propertyData;
            _propertyData.initialRowDataInput = _propertyData.id + '_InitialRowDataInput';
            _propertyType = propertyType;
        };

        /**
         * Returns the property data Helper function to enable Karma Jasmine unit tests
         *
         * @return {Object} property data
         */
        self.getPropertyData = function() {
            return _propertyData;
        };

        /**
         * Returns the property type Helper function to enable Karma Jamine unit tests
         *
         * @return {String} property type
         */
        self.getPropertyType = function() {
            return _propertyType;
        };

        /**
         * Initializes the grid provider information with regards to data provider and column provider
         */
        self.initProviders = function() {
            gridId = _propertyData.id + '_Provider';
            let grid = $scope.viewModel.grids[ gridId ];

            $scope.gridId = gridId;
            $scope.dataProvider = $scope.viewModel.dataProviders ? $scope.viewModel.dataProviders[ grid.dataProvider ] :
                null;
            $scope.columnProvider = $scope.viewModel.columnProviders ? $scope.viewModel.columnProviders[ grid.columnProvider ] :
                null;

            if( $scope.dataProvider ) {
                /**
                 * Track selection using uid
                 *
                 * @param {Any} input - The object that needs to be tracked.
                 * @returns {String} string by which selection is tracked
                 */
                const selectionTracker = function( input ) {
                    if( typeof input === 'string' ) {
                        return input;
                    }
                    return input.uid;
                };

                // set the selection tracker
                let absTablePropSelectionModel = selModelFactory.buildSelectionModel(
                    $scope.dataProvider.selectionMode ? $scope.dataProvider.selectionMode :
                    'multiple', selectionTracker );
                $scope.dataProvider.swapSelectionModel( absTablePropSelectionModel, $scope );
            }
        };

        /**
         * Delegates the call to inheriting controller for registering data on application context
         */
        self.initContext = function() {
            let owningObjectUid = self.getPropertyData().parentUid;
            let tablePropertyName = self.getPropertyData().propertyName;
            appCtxSvc.registerCtx( self.getPropertyData().initialRowDataInput, {
                owningObject: {
                    uid: owningObjectUid
                },
                tablePropertyName: tablePropertyName
            } );

            if( $scope.initContext ) {
                $scope.initContext();
            }

            const propertyData = self.getPropertyData();
            if( propertyData ) {
                let fnd0LOVContextPropName = propertyData.propertyName;
                let fnd0LOVContextObjectUid = propertyData.parentUid;
                let additionalProps = {
                    tablePropertyName: fnd0LOVContextPropName,
                    owningObject: fnd0LOVContextObjectUid
                };

                let existingAdditionalProps = appCtxSvc.getCtx( 'InitialSaveDataAdditionalProps' );
                existingAdditionalProps = existingAdditionalProps ? existingAdditionalProps : {};
                existingAdditionalProps[ fnd0LOVContextPropName ] = additionalProps;
                appCtxSvc.registerCtx( 'InitialSaveDataAdditionalProps', existingAdditionalProps );

                $scope.fnd0LOVContextPropName = fnd0LOVContextPropName;
                $scope.fnd0LOVContextObject = fnd0LOVContextObjectUid;

                let parentVmo = cdm.getObject( propertyData.parentUid );
                if( parentVmo ) {
                    let parentVmoType = cmm.getType( parentVmo.type );
                    if( parentVmoType && parentVmoType.propertyDescriptorsMap ) {
                        let prop = parentVmoType.propertyDescriptorsMap[ propertyData.propertyName ];
                        $scope.$evalAsync( function() {
                            $scope.displayName = prop.displayName;
                            self.getPropertyData().propertyRefType = prop.constantsMap.ReferencedTypeName;
                            self.getPropertyData().isPropertyModifiable = prop.constantsMap.modifiable && parseInt( parentVmo.props.is_modifiable.dbValues[ 0 ] );
                            $scope.createCommandEnabled = self.getPropertyData().isPropertyModifiable;
                        } );
                    }
                }
            }
            _setTableHeightAndWidth();
        };

        /**
         * Set tableProperty height and width
         */
        function _setTableHeightAndWidth() {
            $timeout( _setTableHeightAndWidthInternal, 250, false );
        }

        /**
         * Set tableProperty height and width
         */
        function _setTableHeightAndWidthInternal() {
            let newHeight;
            if( $scope.tablepropertydata ) {
                newHeight = xrtTableSvc.calculateTableHeight(
                    $scope.tablepropertydata );
            } else {
                newHeight = xrtTableSvc.calculateTableHeight(
                    $scope.namevaluepropertydata );
            }

            $scope.tableWidth = browserUtils.isIE ? 'calc(100% - 10px)' : '100%';
            if( $scope.tableHeight !== newHeight ) {
                $scope.tableHeight = newHeight;
                eventBus.publish( $scope.gridId + '.plTable.containerHeightUpdated', $scope.tableHeight );
            }
        }

        /**
         * Setup event subscriptions and add to the event subscription definition array
         */
        self.initSubscriptions = function() {
            _eventBusSubDefs.push( eventBus.subscribe( $scope.dataProvider.name + '.selectionChangeEvent',
                self.processGridSelectionEvent ) );
            _eventBusSubDefs.push( eventBus.subscribe( 'cdm.updated', self.processCdmUpdatedEvent ) );
            _eventBusSubDefs.push( eventBus.subscribe( _propertyType + 'RowData.remove',
                self.processRemoveRowDataEvent ) );
            _eventBusSubDefs.push( eventBus.subscribe( _propertyType +
                'InitialRowData.createSuccessful', self.processInitialRowDataEvent ) );
            _eventBusSubDefs.push( eventBus.subscribe( 'editHandlerStateChange',
                self.processCancelEditsEvent ) );
            _eventBusSubDefs.push( eventBus.subscribe( gridId + '.cellStartEdit', self.updateVMOContext ) );
        };

        self.loadStaticCommands = function( uiAnchor, createCmd, removeCmd, duplicateCmd ) {
            /**
             * Load the static commands
             */
            // Get the command overlays
            // Create a new isolated scope to evaluate commands in
            let commandScope = null;
            commandScope = $scope;
            commandScope.ctx = appCtxSvc.ctx;
            commandScope.commandContext = {};

            // TODO: Controller should never have made assumptions about how conditions are evaluated
            // Command service provides a way of getting commands in a specific anchor, consumer cannot
            // make any assumptions about how command service gets those commands or what commands will be returned

            // temporary hack to ensure conditions are being evaluated on current scope
            commandService.getCommand( createCmd, commandScope );
            commandService.getCommand( removeCmd, commandScope );
            commandService.getCommand( duplicateCmd, commandScope );

            // get the commands for graph nodes
            commandService.getCommands( uiAnchor, commandScope ).then( function( commands ) {
                _.forEach( commands, function( command ) {
                    if( command && command.callbackApi ) {
                        if( command.commandId === createCmd ) {
                            $scope._addCommand = command;
                        } else if( command.commandId === removeCmd ) {
                            $scope._removeCommand = command;
                        } else if( command.commandId === duplicateCmd ) {
                            $scope._duplicateCommand = command;
                        }
                    }
                } );
            } );
        };

        /**
         * Entry method to initialize appropriate data members and subscriptions
         */
        self.init = function() {
            self.initProviders();
            self.initContext();
            self.initSubscriptions();
        };

        /**
         * Updates the view model objects in the declVM as well as in the grid {Object} vmos Json object
         * holding viewModelObjects key and value as array of ViewModelObjects
         */
        self.updateVmoData = function() {
            if( $scope.viewModel && $scope.viewModel.objects ) {
                let newViewModelObjs = {};
                // viewModel.objects is a map of uid versus ViewModelObject
                _.forEach( $scope.viewModel.objects, function( object, uid ) {
                    if( object.modelType && !cmm.isInstanceOf( 'Fnd0TableRow', object.modelType ) ) {
                        newViewModelObjs[ uid ] = object;
                    }
                } );

                $scope.viewModel.objects = newViewModelObjs;
            }

            if( $scope.viewModel.vmo && $scope.viewModel.vmo.modelType ) {
                let vmo = $scope.viewModel.vmo;
                if( cmm.isInstanceOf( 'Fnd0TableRow', vmo.modelType ) ) {
                    self.addContextObjectAndProperty( _propertyData, vmo, false );
                }
            }
        };

        /**
         * Processes grid selection event by updating the selection on the application context
         * qualifying it using the property type
         *
         * @param {Object} eventData holding selected objects from the grid
         */
        self.processGridSelectionEvent = function( eventData ) {
            $scope.removeCommandEnabled = false;
            if( eventData && eventData.selectedObjects && eventData.selectedObjects.length > 0 ) {
                if( $scope.dataProvider.viewModelCollection.getLoadedViewModelObjects().indexOf(
                        eventData.selectedObjects[ 0 ] ) > -1 ) {
                    $scope.removeCommandEnabled = self.getPropertyData().isPropertyModifiable;
                }
            }
            appCtxSvc.registerCtx( _propertyType + 'Selection', {
                selectedObjects: eventData.selectedObjects
            } );
        };

        /**
         * Processes the cdm updated event to map initial dummy row of table property and name value to
         * actual persistent object returned by the server or refresh the grid on successful deletion of
         * a persistent table row
         *
         * @param {Object} data holding updated or modified objects array
         */
        self.processCdmUpdatedEvent = function( data ) {
            if( self.syncFromCdmModified ) {
                const propData = self.getPropertyData();
                let updatedObjects = data.updatedObjects || data.modifiedObjects || [];
                let owningTable = _.filter( updatedObjects, { uid: propData.parentUid } )[ 0 ];
                if( owningTable ) {
                    const ownedUids = owningTable.props[ propData.propertyName ].dbValues;

                    updatedObjects = updatedObjects.filter( function( obj ) {
                        if( ownedUids.indexOf( obj.uid ) > -1 ) {
                            return true;
                        }
                        return false;
                    } );
                }
                $scope.$evalAsync( function() {
                    let updatedVMOs = {
                        viewModelObjects: []
                    };

                    updatedObjects.map( function( currentUpdatedObject ) {
                        let updatedVmo = viewModelObjectSrv.createViewModelObject( currentUpdatedObject, 'EDIT' );

                        if( updatedVmo &&
                            cmm.isInstanceOf( self.getPropertyData().propertyRefType,
                                updatedVmo.modelType ) ) {
                            self.addContextObjectAndProperty( _propertyData, updatedVmo, false );
                            updatedVMOs.viewModelObjects.push( updatedVmo );
                        }
                    } );

                    $scope.dataProvider.update( updatedVMOs.viewModelObjects,
                        updatedVMOs.viewModelObjects.length );
                    _persistentVMOs = updatedVMOs.viewModelObjects;
                } );

                self.syncFromCdmModified = false;
            }
        };

        /**
         * Processes remove row data event and updates non-deleted grid rows with context object and
         * property to enable successful deletion of selected grid rows(s)
         *
         * @param {Object} eventData holding selected objects that need to be deleted
         */
        self.processRemoveRowDataEvent = function( eventData ) {
            // process the event only if this instance is meant to
            if( self.getPropertyData().id === appCtxSvc.getCtx( 'ActiveTablePropertyId' ) ) {
                $scope.removeCommandEnabled = false;
                $scope.$evalAsync( function() {
                    let uidsToDelete = [];
                    if( eventData && eventData.selectedObjects ) {
                        _.forEach( eventData.selectedObjects, function( data ) {
                            uidsToDelete.push( data.uid );
                        } );
                    }

                    let viewModelCollection = $scope.dataProvider.viewModelCollection;
                    let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();

                    if( uidsToDelete.length === loadedVMObjs.length ) {
                        // This means all rows or last row of TP/NV is being deleted
                        _.forEach( loadedVMObjs, function( loadedVmo ) {
                            loadedVmo.props = {};
                            loadedVmo.uid = cdm.NULL_UID;
                            self.addContextObjectAndProperty( _propertyData, loadedVmo, false );
                            loadedVmo.type = 'unknownType';
                        } );
                    } else {
                        _.forEach( loadedVMObjs, function( loadedVmo ) {
                            if( !_.includes( uidsToDelete, loadedVmo.uid ) ) {
                                self.addContextObjectAndProperty( _propertyData, loadedVmo, false );
                            }
                        } );
                    }
                    self.syncFromCdmModified = true;
                    editService.saveEdits( 'NONE' );
                } );
            }
        };

        /**
         * Updates the grid with dummy row data as provided by the server
         *
         * @param {ObjectArray} initialTableRowData array holding name and value of property
         * @param {ObjectArray} initialVMOs array of objects currently in the grid
         * @param {Object} modelType holding property descriptions map as available from cmm
         * @param {Object} modelObject - parent model object
         * @param {String} dummyUid string for initial table row before it is persisted to database
         * @param {Boolean} setValueUpdated if the prop should be set as if the value has been updated - useful for duplicating rows
         */
        self.updateGridWithInitialRow = function( initialTableRowData, initialVMOs, modelType,
            modelObject, dummyUid, setValueUpdated ) {
            let updatedVMOs = {
                viewModelObjects: initialVMOs
            };

            for( let i = 0; i < initialTableRowData.length; i++ ) {
                const propName = initialTableRowData[ i ].name;
                const dbValues = initialTableRowData[ i ].dbValues;
                const uiValues = initialTableRowData[ i ].uiValues;
                let prop = {};
                prop.propertyDescriptor = modelType.propertyDescriptorsMap[ propName ];
                prop.dbValues = dbValues;
                prop.uiValues = uiValues;
                prop.displayValues = uiValues;
                prop.newDisplayValues = uiValues;
                prop.modifiable = true;
                prop.editable = true;
                prop.isEditable = true;
                prop.isPropertyModifiable = true;
                prop.parentUid = dummyUid;
                prop.srcObjLsd = '2017-09-01T14:34:12+05:30';
                modelObject.props[ propName ] = prop;
            }

            let initialRowVM = viewModelObjectSrv.constructViewModelObjectFromModelObject( modelObject, 'CREATE' );
            initialRowVM.uid = dummyUid;

            // If duplicating row, set all props with values to have valueUpdated true so they get saved.
            // must be done after VMO is created
            if( setValueUpdated ) {
                _.forEach( initialRowVM.props, function( prop ) {
                    if( !_.isNil( prop.dbValue ) && prop.dbValue !== '' ) {
                        // check uiValue if DATE
                        if( prop.type !== 'DATE' || prop.uiValue !== '' ) {
                            prop.valueUpdated = true;
                            prop.newValue = prop.dbValue;
                        }
                    }
                } );
            }

            self.addContextObjectAndProperty( _propertyData, initialRowVM, true );

            updatedVMOs.viewModelObjects.push( initialRowVM );

            self.updateVmoData();
            $scope.dataProvider.update( updatedVMOs.viewModelObjects,
                updatedVMOs.viewModelObjects.length );

            self.syncFromCdmModified = true;

            // Scroll to new row
            let scrollEventData = {
                gridId: gridId,
                rowUids: [ initialRowVM.uid ]
            };

            eventBus.publish( 'plTable.scrollToRow', scrollEventData );
        };

        /**
         * Processes the editHandlerStateChange event
         * When the state is cancelling Load the original view model objects
         * back into the table thereby discarding any vmo's added via
         * getInitialTableRowData call. If canceling or saving remove the
         * context vmo object added from editing
         *
         * @param {Object} eventData holding the state name and source object
         */
        self.processCancelEditsEvent = function( eventData ) {
            if( eventData ) {
                if( _persistentVMOs && eventData.state === 'canceling' ) {
                    let updatedVMOs = {
                        viewModelObjects: []
                    };

                    let persistentVmoUids = [];
                    _.forEach( _persistentVMOs, function( persistentVmo ) {
                        persistentVmoUids.push( persistentVmo.uid );
                    } );

                    let viewModelCollection = $scope.dataProvider.viewModelCollection;
                    let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();
                    _.forEach( loadedVMObjs, function( loadedVmo ) {
                        if( _.includes( persistentVmoUids, loadedVmo.uid ) ) {
                            updatedVMOs.viewModelObjects.push( loadedVmo );
                        }
                    } );

                    $scope.dataProvider.update( updatedVMOs.viewModelObjects, updatedVMOs.viewModelObjects.length );

                    _persistentVMOs = null;
                } else if( eventData.state === 'partialSave' ) {
                    let vmCollection = $scope.dataProvider.viewModelCollection;
                    let loadedVMOs = vmCollection.getLoadedViewModelObjects();
                    for( let i = 0; i < loadedVMOs.length; i++ ) {
                        let vmo = loadedVMOs[ i ];

                        // Set all vmos to have owning object and tablePropertyName to save properly
                        if( !vmo.props.owningObject ) {
                            self.addContextObjectAndProperty( _propertyData, vmo, false );
                        }
                        _.forEach( vmo.props, function( prop ) {
                            if( prop.newValue || prop.newDisplayValues ) {
                                prop.valueUpdated = true;
                            }
                            } );

                        // put all vmos back into edit
                        viewModelObjectSrv.setEditableStates( vmo, true, true, true );
                    }
                }
            }

            // Remove Edit VMO context if necessary
            self.removeVMOContext( eventData );
        };

        /**
         * Processes the initial row data event and prepares the dummy row to be added to the grid
         *
         * @param {Object} eventData holding tableRowData as returned by the server
         */
        self.processInitialRowDataEvent = function( eventData ) {
            // process the event only if this instance is meant to
            if( self.getPropertyData().id === appCtxSvc.getCtx( 'ActiveTablePropertyId' ) ) {
                $scope.$evalAsync( function() {
                    let viewModelCollection = $scope.dataProvider.viewModelCollection;
                    let loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();
                    let totalFound = loadedVMObjs && loadedVMObjs.length ? loadedVMObjs.length : 0;
                    let initialRowType = eventData.tableRowData.tableRows[ 0 ].tableRowTypeName;
                    let initialTableRowData = eventData.tableRowData.tableRows[ 0 ].tableRowData;

                    let setPropValueUpdated = eventData.tableRowData.tableRows[ 0 ].setPropValueUpdated;

                    if( !_persistentVMOs ) {
                        _persistentVMOs = loadedVMObjs;
                    }

                    let existingAdditionalProps = appCtxSvc.getCtx( 'InitialSaveDataAdditionalProps' );
                    existingAdditionalProps = existingAdditionalProps ? existingAdditionalProps : {};
                    let additionalProps = existingAdditionalProps[ _propertyData.propertyName ];
                    additionalProps = additionalProps ? additionalProps : {};
                    additionalProps.newRowTypeName = initialRowType;
                    appCtxSvc.updateCtx( 'InitialSaveDataAdditionalProps', existingAdditionalProps );

                    if( $scope.initContext ) {
                        $scope.initContext();
                    }
                    // Ensure all loaded VM's of type Fnd0NameValue have the context
                    // object and property set
                    let initialVMOs = [];
                    _.forEach( loadedVMObjs, function( loadedVmo ) {
                        let vmo = null;
                        if( loadedVmo && loadedVmo.props && loadedVmo.props.owningObject ) {
                            vmo = loadedVmo;
                        } else {
                            vmo = viewModelObjectSrv.createViewModelObject( loadedVmo, 'EDIT' );
                        }
                        // Copy existing props form loadedVmo because they may have been updated and cached vmo won't have them
                        // preserve the previous display value as setting editable states corrupts it.
                        let prevDisplayValues = {};
                        _.forEach( loadedVmo.props, function( prop ) {
                            vmo.props[ prop.propertyName ] = prop;
                            prevDisplayValues[ prop.propertyName ] = prop.prevDisplayValues;
                        } );
                        self.addContextObjectAndProperty( _propertyData, vmo, false );
                        viewModelObjectSrv.setEditableStates( vmo, true, true, true );
                        _.forEach( vmo.props, function( prop ) {
                            prop.prevDisplayValues = prevDisplayValues[ prop.propertyName ];
                        } );
                        initialVMOs.push( vmo );
                    } );

                    // Creating a dummy model object for table row
                    let dummyUid = 'prop_' + _propertyData.propertyName + '_' + totalFound;
                    let modelObject = {};
                    modelObject.uid = dummyUid;

                    modelObject.type = initialRowType;

                    modelObject.props = {};
                    let modelType = cmm.getType( initialRowType );
                    if( !modelType ) {
                        let missingTypes = [];
                        missingTypes.push( initialRowType );
                        // need to load from server
                        soaSvc.ensureModelTypesLoaded( missingTypes ).then(
                            function() {
                                modelType = cmm.getType( initialRowType );
                                self.updateGridWithInitialRow( initialTableRowData, initialVMOs,
                                    modelType, modelObject, dummyUid, setPropValueUpdated );
                            } );
                    } else {
                        self.updateGridWithInitialRow( initialTableRowData, initialVMOs, modelType,
                            modelObject, dummyUid, setPropValueUpdated );
                    }
                } );
            }
        };

        /**
         * Sets the application Context for tablePropertyEdit to have the currently focused VMO
         * @param {Object} eventData - Event data containing columnInfo and the row's VMO
         */
        self.updateVMOContext = function( eventData ) {
            appCtxSvc.registerCtx( 'tablePropertyEditData', { vmo: eventData.vmo, gridId: eventData.gridId } );
        };

        /**
         * Removes the application Context for tablePropertyEdit
         * @param {Object} eventData -
         */
        self.removeVMOContext = function( eventData ) {
            if( eventData.state !== 'starting' ) {
                appCtxSvc.unRegisterCtx( 'tablePropertyEditData' );
            }
        };

        /**
         * Adds given property to props array. This is helper method used for setting additional context
         * object and property name on table property objects
         *
         * @param {String} propertyName - property name
         * @param {String} propertyValue - value of the property
         * @param {String} parentUid - uid of the parent i.e. owning object
         * @param {ObjectArray} props - array of properties to which new properties need to be added
         */
        self.addProperty = function( propertyName, propertyValue, parentUid, props ) {
            props[ propertyName ] = {
                dbValue: propertyValue,
                uiValue: propertyValue,
                dbValues: [ propertyValue ],
                uiValues: [ propertyValue ],
                newDisplayValues: [ propertyValue ],
                displayValues: [ propertyValue ],
                modifiable: true,
                editable: true,
                isEditable: true,
                propertyName: propertyName,
                propertyDescriptor: [],
                displayValueUpdated: true,
                parentUid: parentUid
            };
        };

        /**
         * Adds the context object and property to existing object. This is special behavior for table
         * property and name value
         *
         * @param {Object} data that holds details of context object and property name
         * @param {Object} vmo the view model object to which the context object and property needs to
         *            be added
         * @param {Boolean} isDummyRow - value true indicates property newRowTypeName needs to be added
         *            to current vmo.
         */
        self.addContextObjectAndProperty = function( data, vmo, isDummyRow ) {
            if( vmo && vmo.modelType ) {
                if( !cmm.isInstanceOf( 'Fnd0NameValue', vmo.modelType ) &&
                    !cmm.isInstanceOf( 'Fnd0TableRow', vmo.modelType ) ) {
                    return;
                }

                if( vmo.props ) {
                    self.addProperty( 'owningObject', data.parentUid, vmo.uid, vmo.props );
                    self.addProperty( 'tablePropertyName', data.propertyName, vmo.uid, vmo.props );

                    if( isDummyRow ) {
                        self.addProperty( 'newRowTypeName', vmo.type, vmo.uid, vmo.props );

                        // in case of name value, the data is set on panel and then transferred to the grid as initial row
                        // in case of table prop, the data is directly set on the newly added dummy row in the grid
                        // thus, display values updated need to be set only for name value i.e. cases where the data is getting
                        // set from a panel and then transferred to the grid.
                        if( data.setDisplayValuesUpdated ) {
                            _.forEach( vmo.props, function( prop ) {
                                prop.displayValueUpdated = true;
                            } );
                        }
                    }
                }
            }
        };

        $scope.add = function _add() {
            if( $scope.preAdd ) {
                $scope.preAdd();
            }
            appCtxSvc.registerCtx( 'ActiveTablePropertyId', self.getPropertyData().id );
            $scope._addCommand.callbackApi.execute();
        };

        $scope.remove = function _remove() {
            if( $scope.preRemove ) {
                $scope.preRemove();
            }
            appCtxSvc.registerCtx( 'ActiveTablePropertyId', self.getPropertyData().id );
            $scope._removeCommand.callbackApi.execute();
        };

        // Duplicate row on table
        $scope.duplicate = function() {
            if( $scope.preAdd ) {
                $scope.preAdd();
            }
            appCtxSvc.registerCtx( 'ActiveTablePropertyId', self.getPropertyData().id );
            $scope._duplicateCommand.callbackApi.execute();
        };

        // Clean up on scope destruction
        $scope.$on( '$destroy', function() {
            _persistentVMOs = null;

            // unregister from appctx
            appCtxSvc.unRegisterCtx( 'ActiveTablePropertyId', self.getPropertyData().id );
            appCtxSvc.unRegisterCtx( _propertyData.initialRowDataInput );
            appCtxSvc.unRegisterCtx( _propertyType + 'Selection' );
            appCtxSvc.unRegisterCtx( _propertyType + 'InitialRowDataInput' );
            appCtxSvc.unRegisterCtx( 'tablePropertyEditData' );

            // unregister event subscriptions
            _.forEach( _eventBusSubDefs, function( subdef ) {
                eventBus.unsubscribe( subdef );
            } );

            // dereference private variables
            gridId = null;
            _propertyData = null;
            _propertyType = null;
        } );
    }
] );
