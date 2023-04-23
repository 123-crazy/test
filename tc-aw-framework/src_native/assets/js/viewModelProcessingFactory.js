// Copyright (c) 2020 Siemens

/**
 * This module is part of declarative UI framework and provides DeclViewModel processing functionalities.
 *
 * @module js/viewModelProcessingFactory
 *
 * @namespace viewModelProcessingFactory
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import modelPropertySvc from 'js/modelPropertyService';
import viewModelObjectSrv from 'js/viewModelObjectService';
import dataProviderFactory from 'js/dataProviderFactory';
import declDataProviderSvc from 'js/declDataProviderService';
import appCtxSvc from 'js/appCtxService';
import clientDataModel from 'soa/kernel/clientDataModel';
import sanitizer from 'js/sanitizer';
import declModelRegistrySvc from 'js/declModelRegistryService';
import editUtilsService from 'js/editUtilsService';
import messagingService from 'js/messagingService';
import mockModeService from 'js/mockModeService';
import AwInterpolateService from 'js/awInterpolateService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import parsingUtils from 'js/parsingUtils';
import declUtils from 'js/declUtils';
import logger from 'js/logger';
import Debug from 'Debug';
import debugService from 'js/debugService';
import editHandlerService from 'js/editHandlerService';
import editHandlerFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import editEventsService from 'js/editEventsService';

import commandsSvc from 'js/command.service';

import 'js/conditionService';

var tokenTrace = new Debug( 'viewModel:token' );

/**
 * Cached reference to AngularJS & AW services
 */

/** List of attributes would be considered for sanitization */
var propertiesToSanitize = {
    dbValue: true,
    dbValues: true,
    displayValues: true,
    error: true,
    propertyDisplayName: true,
    propertyName: true,
    propertyRadioFalseText: true,
    propertyRadioText: true,
    uiValue: true,
    uiValues: true,
    value: true
};

/**
 * Array used to confirm if the property name in a 'declViewModelJson' 'data' object's property is a valid
 * property name in the 'propAttrHolder' object used to create a new 'ViewModelProperty' (kind of a schema
 * checker).
 */
var _attrHolderPropName = [ 'dbValue', 'displayName', 'dispValue', 'isArray', 'isEditable', 'isRequired', 'isEnabled', 'displayValue', 'value', 'isModifiable', 'isAutoAssignable',
    'labelPosition', 'requiredText', 'type', 'propName', 'hasLov', 'dataProvider', 'isSelectOnly', 'isRichText', 'referenceTypeName', 'maxLength', 'maxArraySize', 'renderingHint',
    'autofocus', 'patterns', 'preferredPattern', 'condition', 'validationCriteria', 'oldValue', 'oldValues', 'vertical', 'propertyRadioTrueText', 'propertyRadioFalseText', 'numberOfLines'
];

var _compoundPropNameDelimiter = '__';
var _compoundPropValueDelimiter = ':';

/**
 * Perform the given 'action'.
 *
 * @param {Object} jsonData - Object loaded from the DeclViewModel JSON file
 * @param {Object} jsonDataProvider - A specific dataProvider's definition within 'jsonData'.
 * @param {String} dpName - The name of the 'declDataProvider' where the action is defined.
 * @param {String} actionName - The name of the action to look for in the 'jsonData'
 * @param {StringMap} actionMap - Map of action name to the action object from a declViewModel's JSON definition
 *            to be updated by this function.
 */
function _processAction( jsonData, jsonDataProvider, dpName, actionName, actionMap ) {
    var actionRef = jsonDataProvider[ actionName ];

    if( actionRef ) {
        if( jsonData.actions ) {
            actionMap[ actionName ] = jsonData.actions[ actionRef ];
        }

        if( !actionMap[ actionName ] ) {
            logger.error( 'DataProvider ' + dpName + ' references a missing action: ' + actionName +
                '...continuing' );
        }
    }
} // _processAction

/**
 * Define the base object used to provide all of this module's external API on.
 *
 * @private
 */
var exports = {};

/**
 * Evaluate dataProviders from JSON, load any dependencies and set on the given 'declViewModel'.
 *
 * @param {DeclViewModelJson} declViewModelJson - Object loaded from the DeclViewModel JSON file.
 *
 * @param {DeclViewModel} declViewModel - The 'DeclViewModel' to populate with the dataProvider properties of
 *            the given JSON object.
 * @param {Object} subPanelContext - (Optional) Subpanlecontext attribute of aw-include directive
 *
 * @return {Promise} The promise is resolved with the given 'declViewModel' once any data provider dependencies
 *         are all resolved.
 */
var _populateDataProviders = function( declViewModelJson, declViewModel, subPanelContext ) {
    var jsonData = declViewModelJson;

    var promises = [];

    if( jsonData.dataProviders ) {
        if( !declViewModel.dataProviders ) {
            declViewModel.dataProviders = {};
        }

        var dataProvidersClone = _.cloneDeep( jsonData.dataProviders );
        var mockedDataProvider = mockModeService.isMockModeActive() && jsonData.mock && jsonData.mock.dataProviders;

        exports.initViewModel( dataProvidersClone, subPanelContext );

        _.forEach( dataProvidersClone, function( jsonDataProvider, dpName ) {
            var actionMap = {};

            if( mockedDataProvider && mockedDataProvider[ dpName ] ) {
                jsonDataProvider = mockedDataProvider[ dpName ];
            }

            _processAction( jsonData, jsonDataProvider, dpName, 'action', actionMap ); // legacy init/getNext action
            _processAction( jsonData, jsonDataProvider, dpName, 'initializeAction', actionMap );
            _processAction( jsonData, jsonDataProvider, dpName, 'nextAction', actionMap );
            _processAction( jsonData, jsonDataProvider, dpName, 'previousAction', actionMap );
            _processAction( jsonData, jsonDataProvider, dpName, 'focusAction', actionMap );
            _processAction( jsonData, jsonDataProvider, dpName, 'expandAction', actionMap );
            _processAction( jsonData, jsonDataProvider, dpName, 'validateAction', actionMap );
            _processAction( jsonData, jsonDataProvider, dpName, 'filterFacetAction', actionMap );

            /**
             * Create the DeclDataProvider based on the JSON data.
             */
            declViewModel.dataProviders[ dpName ] = dataProviderFactory.createDataProvider(
                jsonDataProvider, actionMap.action, dpName, declDataProviderSvc, actionMap );

            if( jsonDataProvider.uidInResponse ) {
                declViewModel.dataProviders[ dpName ].uidInResponse = jsonDataProvider.uidInResponse;
            }

            if( !declUtils.isNil( jsonDataProvider.preSelection ) ) {
                declViewModel.dataProviders[ dpName ].preSelection = jsonDataProvider.preSelection;
            } else {
                declViewModel.dataProviders[ dpName ].preSelection = true;
            }

            if( declViewModel.objectSetSource && declViewModel.objectSetSource[ dpName ] ) {
                declViewModel.dataProviders[ dpName ]
                    .setValidSourceTypes( declViewModel.objectSetSource[ dpName ] );
            }

            if( subPanelContext && subPanelContext.editSupportParamKeys ) {
                _.forEach( dataProvidersClone, function( jsonDataProvider ) {
                    if( !jsonDataProvider.inputData ) {
                        jsonDataProvider.inputData = {};
                    }
                    if( !jsonDataProvider.inputData.editSupportParamKeys ) {
                        jsonDataProvider.inputData.editSupportParamKeys = subPanelContext.editSupportParamKeys;
                    }
                } );
            }

            /**
             * Process cell commands
             */
            if( jsonDataProvider.commands ) {
                declViewModel.dataProviders[ dpName ].commands = [];

                _.forEach( jsonDataProvider.commands, function( command, cmdId ) {
                    if( jsonDataProvider.commandsAnchor ) {
                        logger.error( 'Commands in dataProviders are not supported when using commandsAnchor.' + '\n' +
                            'cmdId=' + cmdId + '\n' +
                            'commandsAnchor=' + jsonDataProvider.commandsAnchor );
                    } else {
                        if( command.dependencies && command.dependencies.length > 0 ) {
                            var cmdOverlay;
                            var promise = declUtils.loadImports( command.dependencies, AwPromiseService.instance )
                                .then(
                                    function( handlers ) {
                                        cmdOverlay = {
                                            position: command.position,
                                            displayOption: command.displayOption,
                                            handler: handlers[ 0 ],
                                            condition: command.condition
                                        };

                                        declViewModel.dataProviders[ dpName ].commands
                                            .push( cmdOverlay );

                                        return commandsSvc.getCommand( cmdId );
                                    } ).then(
                                    function( commandOverlay ) {
                                        /**
                                         * Update the icon and title once the command overlay is
                                         * returned
                                         */
                                        if( commandOverlay ) {
                                            cmdOverlay.iconId = commandOverlay.iconId || command.id;
                                            cmdOverlay.title = commandOverlay.title || command.title;
                                        }

                                        return cmdOverlay; // Include return to assure async
                                    } );

                            promises.push( promise );
                        } else if( command.action ) {
                            command.iconId = command.id;
                            declViewModel.dataProviders[ dpName ].commands.push( command );
                        }
                    }
                } );
            }
        } );
    }

    return AwPromiseService.instance.all( promises ).then( function() {
        return declViewModel;
    } );
};

var sharedViewModelToken = 0;

/**
 * Token for tracking execution within the view model
 */
var DeclViewModelToken = function() {
    var activeActionCount = 0;

    this.addAction = function( action ) {
        tokenTrace( 'Action started', action );
        activeActionCount++;
        sharedViewModelToken++;
    };

    this.removeAction = function( action ) {
        tokenTrace( 'Action completed', action );
        activeActionCount--;
        sharedViewModelToken = sharedViewModelToken <= 1 ? 0 : sharedViewModelToken - 1;
    };

    this.isActive = function() {
        return activeActionCount !== 0;
    };
};

/**
 * Creates a new instance of this class.
 *
 * @class DeclViewModel
 *
 * @param {DeclViewModelJson} declViewModelJson - (Optional) The object returned from loading the JSON resource
 *            for this DeclViewModel.
 *            <P>
 *            Note: A clone (deep copy) of this object will be set into the new object.
 */
var DeclViewModel = function( declViewModelJson ) {
    var vmSelf = this; // eslint-disable-line consistent-this

    /**
     * This object is used to hold properties and states that are not intended to be exposed to the
     * 'dataCtxTree'.
     */
    vmSelf._internal = {

        /**
         * Token for tracking execution within the view model
         */
        token: new DeclViewModelToken(),

        /**
         * {Number} An increasing number assigned to this declViewModel when created and use to identify it
         * (only for debug purposes).
         */
        modelId: -1,

        /**
         * {String} The ID used to load the JSON (e.g. from the 'panelContentService').
         */
        panelId: 'undefined',

        /**
         * {String} The unique Id to identify the view
         */
        viewId: 'undefined',

        /**
         * {Boolean} TRUE if 'destroy' has been invoked on this instance.
         */
        isDestroyed: false,

        /**
         * {EventSubscriptionArray} Array of 'eventSubscriptions' currently registerd against this
         * 'declViewModel'.
         */
        eventSubscriptions: [],

        /**
         * {SubPanelId2EventSubscriptionsMap} a map of <subPanelId,EventSubscriptions>.
         */
        subPanelId2EventSubscriptionsMap: {},

        /**
         * {DeclViewModelJson} The object returned from loading the JSON resource for this 'declViewModel'.
         */
        origDeclViewModelJson: null,

        /**
         * {Object} A map of a 'conditionName' property to its current true/false state.
         */
        conditionStates: {},

        /**
         * {Object} A map of a 'conditionExpressions' property to its current vaule.
         */
        conditionExpressions: {},

        /**
         * Ref to: conditions
         */
        conditions: null,

        /**
         * Ref to: jasonData.actions
         */
        actions: null,

        /**
         * Ref to: jasonData.dataParseDefinitions
         */
        dataParseDefinitions: null,

        /**
         * Ref to: jasonData.functions
         */
        functions: null,

        /**
         * Ref to: jasonData.messages
         */
        messages: null,

        /**
         * Ref to: jasonData.onEvent
         */
        onEvent: null,

        /**
         * Ref to: jasonData.onEvent
         */
        grids: null,

        /**
         * Ref to: jasonData.onEvent
         */
        chartProviders: null,

        /**
         * {StringArray} The array of sub-panel IDs that have been 'merged' into this 'target' 'declViewModel'.
         */
        subPanels: null,

        /**
         * {ObjectArray} An array of data objects that specify the propertyValue/propertyPath of all non-action
         * properties in the original declViewModel JSON definition that are 'data bound' to any changes in the
         * appContext state (e.g. propValue = {{ctx.selected}}, etc.).
         */
        declViewModelJsonBoundProps: null,

        /**
         * {ObjectMap} Map of appContext changes that have been collected since this declViewModel was created
         * or after the last 'update debound' was processed.
         */
        pendingContextChanges: null,

        /**
         * edit configuration map. This holds the configuration for start/cancel/save edit actions
         */
        editConfig: null,

        /**
         * ports for sync strategy
         */
        ports: null,
        /**
         * This function will be called then the 'dataCtxNode' ( aka '$scope' ) this 'declViewModel'
         * is placed on is destroyed.
         *
         * @param {Boolean} destroyDataProviders - TRUE if all associated dataProviders should have their 'destroy' method called.
         */
        destroy: function( destroyDataProviders ) {
            vmSelf._internal.isDestroyed = true;

            // Any active actions or messages are going to be cut off, force clear out token
            while( vmSelf._internal.token.isActive() ) {
                vmSelf._internal.token.removeAction( null );
            }

            declModelRegistrySvc.unregisterModel( 'DeclViewModel', vmSelf, '_internal.panelId',
                '_internal.modelId' );

            _.forEach( this.eventSubscriptions, function( subDef ) {
                eventBus.unsubscribe( subDef );
            } );

            _.forEach( this.subPanelId2EventSubscriptionsMap, function( subDefs ) {
                _.forEach( subDefs, function( subDef ) {
                    eventBus.unsubscribe( subDef );
                } );
            } );

            this.eventSubscriptions = [];
            this.subPanelId2EventSubscriptionsMap = {};

            /**
             * Stop debounce for ctx change events.
             */
            if( vmSelf._internal.pingUpdateViewModel && vmSelf._internal.pingUpdateViewModel.cancel ) {
                vmSelf._internal.pingUpdateViewModel.cancel();
                vmSelf._internal.pingUpdateViewModel = null;
            }

            /**
             * Clean up all dataProviders
             */
            if( destroyDataProviders ) {
                _.forEach( vmSelf.dataProviders, function( uwDataProvider, dpName ) {
                    uwDataProvider.destroy();
                    vmSelf.dataProviders[ dpName ] = null;
                } );
            }

            /**
             * Clean up all subPanels
             */
            _.forEach( vmSelf._internal.subPanels, function( subPanel ) {
                declModelRegistrySvc.unregisterModel( 'SubPanel', subPanel, 'panelId', 'id' );
            } );

            vmSelf._internal.subPanels = null;
            vmSelf._internal.declViewModelJsonBoundProps = null;
            vmSelf._internal.pendingContextChanges = null;

            /**
             * Clean up edit config
             */
            if( vmSelf._internal.editConfig ) {
                editUtilsService._removeListeners( vmSelf._internal.editConfig.sourceModel );
            }
            vmSelf._internal.editConfig = null;

            /**
             * Clean up edit handler
             */
            if( vmSelf._internal.editContext ) {
                editHandlerService.removeEditHandler( vmSelf._internal.editContext );
            }

            /**
             * Clean up references to external resources
             */
            vmSelf._internal.origCtxNode = null;
            vmSelf.vmo = null;
            vmSelf.objects = null;
        },

        /**
         * Based on the value of the 'skipClone' property of the given JSON object, clone a copy of the given
         * JSON object (if necessary) and save it in a local property.
         *
         * @param {DeclViewModelJson} declViewModelJsonIn - The object returned from loading the JSON resource for
         *            this 'declViewModel'.
         */
        setViewModelJson: function( declViewModelJsonIn ) {
            if( declViewModelJsonIn.skipClone ) {
                vmSelf._internal.origDeclViewModelJson = declViewModelJsonIn;
            } else {
                vmSelf._internal.origDeclViewModelJson = _.cloneDeep( declViewModelJsonIn );
            }

            if( declViewModelJsonIn._viewModelId ) {
                vmSelf._internal.panelId = declViewModelJsonIn._viewModelId;
            } else {
                logger.error( 'setViewModelJson: No panelId given' );
            }

            if( declViewModelJsonIn._uniqueViewModelId ) {
                vmSelf._internal.viewId = declViewModelJsonIn._uniqueViewModelId;
            }
        },

        /**
         * Set all the properties in this object to all the valid corresponding properties in the given
         * 'jsonData' object.
         *
         * @param {DeclViewModelJson} jsonData - The '.data' property of the object returned from loading the
         *            JSON resource for this 'declViewModel'.
         */
        setJsonData: function( jsonData ) {
            if( jsonData.actions ) {
                /**
                 * Note: For debug purposes ONLY...Include the name of the action in the action object as the
                 * 'actionId' property.
                 */
                _.forEach( jsonData.actions, function( value, name ) {
                    value.actionId = name;
                } );

                vmSelf._internal.actions = jsonData.actions;
            }

            if( jsonData.conditions ) {
                vmSelf._internal.conditions = jsonData.conditions;
            }

            if( jsonData.ports ) {
                vmSelf._internal.ports = jsonData.ports;
            }

            if( jsonData.dataParseDefinitions ) {
                vmSelf._internal.dataParseDefinitions = jsonData.dataParseDefinitions;
            }

            if( jsonData.functions ) {
                vmSelf._internal.functions = jsonData.functions;
            }

            if( jsonData.messages ) {
                vmSelf._internal.messages = jsonData.messages;
            }

            if( jsonData.onEvent ) {
                vmSelf._internal.onEvent = jsonData.onEvent;
            }

            if( jsonData.grids ) {
                vmSelf._internal.grids = jsonData.grids;
            }

            if( jsonData.chartProviders ) {
                vmSelf._internal.chartProviders = jsonData.chartProviders;
            }

            if( jsonData.editConfig ) {
                vmSelf._internal.editConfig = jsonData.editConfig;
            }

            if( jsonData.lifecycleHooks ) {
                vmSelf._internal.lifecycleHooks = jsonData.lifecycleHooks;
            }

            if( jsonData.editContext ) {
                vmSelf._internal.editContext = jsonData.editContext;
            }
        },
        /**
         * Consolidate (i.e. merge) all the properties in this object to all the valid corresponding properties
         * in the given 'jsonData' object.
         *
         * @param {DeclViewModelJson} jsonData - The '.data' property of the object returned from loading the
         *            JSON resource for this 'declViewModel'.
         */
        consolidateJsonData: function( jsonData ) {
            vmSelf._internal.actions = declUtils
                .consolidateObjects( vmSelf._internal.actions, jsonData.actions );

            vmSelf._internal.dataParseDefinitions = declUtils.consolidateObjects(
                vmSelf._internal.dataParseDefinitions, jsonData.dataParseDefinitions );

            vmSelf._internal.conditions = declUtils.consolidateObjects( vmSelf._internal.conditions,
                jsonData.conditions );

            vmSelf._internal.functions = declUtils.consolidateObjects( vmSelf._internal.functions,
                jsonData.functions );

            vmSelf._internal.messages = declUtils.consolidateObjects( vmSelf._internal.messages,
                jsonData.messages );

            vmSelf._internal.onEvent = declUtils
                .consolidateObjects( vmSelf._internal.onEvent, jsonData.onEvent );

            vmSelf._internal.grids = declUtils.consolidateObjects( vmSelf._internal.grids, jsonData.grids );

            vmSelf._internal.chartProviders = declUtils.consolidateObjects( vmSelf._internal.chartProviders, jsonData.chartProviders );

            vmSelf._internal.editConfig = declUtils.consolidateObjects( vmSelf._internal.editConfig, jsonData.editConfig );

            if( jsonData.ports ) {
                vmSelf._internal.ports = declUtils.consolidateObjects( vmSelf._internal.ports, jsonData.ports );
            }

            vmSelf._internal.lifecycleHooks = declUtils.consolidateObjects( vmSelf._internal.lifecycleHooks, jsonData.lifecycleHooks );
        }
    };

    /**
     * ----------------------------------------------------<br>
     * Define public API <BR>
     * ----------------------------------------------------<br>
     */
    /**
     * Override the default implementation to return more helpful information.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {String} Text used to identify the ID of the DeclViewModel (e.g. 'modelId' + an optional 'url').
     */
    vmSelf.toString = function() {
        if( vmSelf.getPanelId() ) {
            return vmSelf._internal.modelId + '  modelName: ' + vmSelf.getPanelId();
        }

        return vmSelf._internal.modelId + '  modelName: ' + '???';
    };

    /**
     * Get the tracking token for the view model
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {DeclViewModelToken} token
     */
    vmSelf.getToken = function() {
        return vmSelf._internal.token;
    };

    /**
     * Get ID/Name of this declViewModel.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {String} The ID used to load the JSON (e.g. from the 'panelContentService').
     */
    vmSelf.getPanelId = function() {
        return vmSelf._internal.panelId;
    };

    /**
     * Get ID of this declViewModel.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {String} The ID used for unique with aw-include
     */
    vmSelf.getViewId = function() {
        return vmSelf._internal.viewId;
    };

    /**
     * Get DeclAction with the given ID.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} actionId - The ID of the DeclAction to return.
     * @return {DeclAction} The DeclAction with the given ID (or FALSEY if not found);
     */
    vmSelf.getAction = function( actionId ) {
        return vmSelf._internal.actions[ actionId ];
    };

    /**
     * Get port's obj with the given name.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} portName - The name of the port.
     * @return {Object} The port's sync object and action.
     */
    vmSelf.getPortById = function( portName ) {
        return vmSelf._internal.ports[ portName ];
    };

    /**
     * Get the DataParseDefinition in the DeclViewModel
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @param {String} id - The ID of the DataParseDefinition to return.
     * @return {Object} The dataParseDefinition
     */
    vmSelf.getDataParseDefinition = function( id ) {
        return vmSelf._internal.dataParseDefinitions[ id ];
    };

    /**
     * Get the functions in the DeclViewModel
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {Object} The functions
     */
    vmSelf.getFunctions = function() {
        return vmSelf._internal.functions;
    };

    /**
     * Get array of any subPanels defined.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {ObjectArray} The array of sub-panel that have been 'merged' into this 'target' 'declViewModel'
     *         (or NULL if no panels have been added).
     */
    vmSelf.getSubPanels = function() {
        return vmSelf._internal.subPanels;
    };

    /**
     * Get sub panel of the given panel ID
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} subPanelId - The ID of the sub-panel
     * @return {Object} The sub-panel state object
     */
    vmSelf.getSubPanel = function( subPanelId ) {
        return _.find( vmSelf._internal.subPanels, {
            panelId: subPanelId
        } );
    };

    /**
     * Gets the edit configuration object
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @return {Object} The edit configuration object
     */
    vmSelf.getEditConfiguration = function() {
        return vmSelf._internal.editConfig;
    };

    /**
     * Get lifecycle hooks
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {Object} The lifecycle hooks
     */
    vmSelf.getLifecycleHooks = function() {
        return vmSelf._internal.lifecycleHooks;
    };

    /**
     * Add a sub-panel.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} subPanelId - The ID of the sub-panel that has been 'merged' into this 'target'
     *            'declViewModel'.
     */
    vmSelf.addSubPanel = function( subPanelId ) {
        if( !vmSelf._internal.subPanels ) {
            vmSelf._internal.subPanels = [];
        }

        // remove the old panel with the input ID if exist
        if( vmSelf.getSubPanel( subPanelId ) ) {
            vmSelf.removeSubPanel( subPanelId );
        }

        var subPanel = {
            panelId: subPanelId,
            contextChanged: false
        };

        if( logger.isDeclarativeLogEnabled() ) {
            logger.declarativeLog( 'DECLARATIVE TRACE - Add Subpanel ' + subPanelId );
        }

        declModelRegistrySvc.registerModel( 'SubPanel', subPanel, 'panelId', 'id' );

        vmSelf._internal.subPanels.push( subPanel );
    };

    /**
     * Remove specified sub panel
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} subPanelId - The ID of the sub-panel
     */
    vmSelf.removeSubPanel = function( subPanelId ) {
        if( logger.isDeclarativeLogEnabled() ) {
            logger.declarativeLog( 'DECLARATIVE TRACE - Remove Subpanel ' + subPanelId );
        }

        // un-subscribe events for the sub-panel
        var subscriptions = vmSelf._internal.subPanelId2EventSubscriptionsMap[ subPanelId ];

        _.forEach( subscriptions, function( subDef ) {
            eventBus.unsubscribe( subDef );
        } );

        delete vmSelf._internal.subPanelId2EventSubscriptionsMap[ subPanelId ];

        _.remove( vmSelf._internal.subPanels, function( subPanel ) {
            if( subPanel.panelId === subPanelId ) {
                declModelRegistrySvc.unregisterModel( 'SubPanel', subPanel, 'panelId', 'id' );

                return true;
            }

            return false;
        } );
    };

    /**
     * Add the given event subscription to the collection of event subscriptions for a given subPanel ID.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} subPanelId - The ID of the sub-panel
     * @param {Object} subDef - The event subscription to add
     */
    vmSelf.addSubPanelEventSubscription = function( subPanelId, subDef ) {
        var subDefs = vmSelf._internal.subPanelId2EventSubscriptionsMap[ subPanelId ];

        if( !subDefs ) {
            subDefs = [];

            vmSelf._internal.subPanelId2EventSubscriptionsMap[ subPanelId ] = subDefs;
        }

        subDefs.push( subDef );
    };

    /**
     * ----------------------------------------------------<br>
     * ----------------------------------------------------<br>
     */

    /**
     * Get current condition states map.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @return {Object} A map of a 'conditionName' property to its current true/false state.
     */
    vmSelf.getConditionStates = function() {
        if( vmSelf._internal.conditionStates ) {
            return vmSelf._internal.conditionStates;
        }

        return {};
    };

    /**
     * This method subscribes CDM update/modify event in declViewModelObject and also register corresponding
     * handler to that.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     */
    vmSelf.attachEvents = function() {
        var handler = function( data ) {
            var objs = data.updatedObjects;
            if( !objs ) {
                objs = data.modifiedObjects;
            }

            var operationName = null;
            if( vmSelf && vmSelf.vmo ) {
                operationName = vmSelf.vmo.operationName;
            }

            _.forEach( objs, function( object ) {
                if( object && vmSelf.objects ) {
                    const newVmo = viewModelObjectSrv.createViewModelObject( object.uid, operationName );
                    viewModelObjectSrv.updateSourceObjectPropertiesByViewModelObject( newVmo,
                        vmSelf.objects );
                }
            } );
        };

        var cdmUpdateEventDef = vmSelf._internal.subPanelId2EventSubscriptionsMap[ 'cdm.updated' ];
        if( !cdmUpdateEventDef ) {
            vmSelf._internal.subPanelId2EventSubscriptionsMap[ 'cdm.updated' ] = [ eventBus.subscribe(
                'cdm.updated', handler ) ];
        }
        var cdmModifiedEventDef = vmSelf._internal.subPanelId2EventSubscriptionsMap[ 'cdm.modified' ];
        if( !cdmModifiedEventDef ) {
            vmSelf._internal.subPanelId2EventSubscriptionsMap[ 'cdm.modified' ] = [ eventBus.subscribe(
                'cdm.modified', handler ) ];
        }
    };

    /**
     * Attach a model object to this DeclViewModel. All the properties of the model object will be consolidated
     * to DeclViewModel.
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     *
     * @param {String} uid - The UID of model object to attach
     * @param {String} operationName - The operation being performed on model object
     * @param {String} owningObjUid - The UID of owning object
     * @param {Object} serverVMO - The VMO which was returned from the server.
     *
     * @returns {ViewModelObject} The object created to wrap the IModelObject specified by the given model information.
     */
    vmSelf.attachModelObject = function( uid, operationName, owningObjUid, serverVMO ) {
        if( uid ) {
            // Build the vmo.
            var vmo = viewModelObjectSrv.createViewModelObject( uid, operationName, owningObjUid, serverVMO );
            if( vmo ) {
                vmo.operationName = operationName;
                vmSelf = declUtils.consolidateObjects( vmSelf, vmo.props );
                vmSelf.attachEvents();

                // Update the underlying object properties.
                if( vmo.type === 'Awp0XRTObjectSetRow' ) {
                    // Get underlying target object's UID if 'awp0Target' property exists
                    if( vmo.props && vmo.props.awp0Target ) {
                        var targetUID = vmo.props.awp0Target.dbValue;
                        var targetMO = clientDataModel.getObject( targetUID );
                        if( targetMO ) {
                            var targetVMO = viewModelObjectSrv.constructViewModelObjectFromModelObject( targetMO, operationName, null, null, true );
                            var props = targetVMO.props;
                            _.forEach( props, function( prop ) {
                                if( prop && !vmo.props.hasOwnProperty( prop.propertyName ) ) {
                                    if( prop.intermediateObjectUids ) {
                                        prop.intermediateObjectUids.push( targetUID );
                                    } else {
                                        prop.intermediateObjectUids = [ targetUID ];
                                    }
                                    vmo.props[ prop.propertyName ] = prop;
                                }
                            } );
                        }
                    }
                }
            }

            return vmo;
        }
        return undefined;
    };

    // ======================== Edit Handler Interface ===================================================//

    if( !vmSelf._internal.eventTopicEditInProgress ) {
        vmSelf._internal.eventTopicEditInProgress = declViewModelJson && declViewModelJson._viewModelId ?
            declViewModelJson._viewModelId + '_editInProgress' : '_editInProgress';
    }

    /**
     * @param {*} stateName edit handler state name
     * @param {*} dvmSelf declViewModel itself
     */
    var _notifyEditStateChange = function( stateName, dvmSelf ) {
        dvmSelf._editingState = stateName;
        dvmSelf._editing = stateName === 'starting';

        setSelectionEnabled( dvmSelf, dvmSelf._editing );

        // Add to the appCtx about the editing state
        appCtxSvc.updateCtx( dvmSelf._internal.eventTopicEditInProgress, dvmSelf._editing );

        eventBus.publish( dvmSelf._internal.eventTopicEditInProgress, vmSelf._editing );
    };

    appCtxSvc.unRegisterCtx( vmSelf._internal.eventTopicEditInProgress );

    /**
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @param {*} dvmSelf declViewModel instance
     * @returns {*} viewModelCollection view model collection as array
     */
    var collectViewModelObjects = function( dvmSelf ) {
        var dataProviders = dvmSelf.dataProviders;
        var viewModelCollection = [];
        _.forOwn( dataProviders, function( dataProvider ) {
            viewModelCollection = viewModelCollection.concat( dataProvider.viewModelCollection.getLoadedViewModelObjects() );
        } );
        return viewModelCollection;
    };
    /**
     * @param {*} dvmSelf declViewModel instance
     * @param {*} isEnabled true/false
     */
    var setSelectionEnabled = function( dvmSelf, isEnabled ) {
        var dataProviders = dvmSelf.dataProviders;
        _.forOwn( dataProviders, function( dataProvider ) {
            dataProvider.setSelectionEnabled( isEnabled );
        } );
    };

    /**
     * isDirty implementation of edit-handler interface
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @returns {*} AwPromiseService.instance promise
     */
    vmSelf.isDirty = function() {
        var viewModelCollection = collectViewModelObjects( vmSelf );
        return editUtilsService._isDirty( viewModelCollection );
    };

    /**
     *This function implements the start edit function edit handler interface
     *@memberof viewModelProcessingFactory.DeclViewModel
     *@param {Object} editOptions - additional options object to specify specfic prop to edit and autosave mode { vmo, propertyNames, autoSave } (Optional)
     *@returns {*} AwPromiseService.instance promise
     */
    vmSelf.startEdit = function( editOptions ) {
        var viewModelCollection = collectViewModelObjects( vmSelf );
        var editConfig = vmSelf.getEditConfiguration();
        editConfig.sourceModel = vmSelf.getViewId();
        var dataCtxNode = {
            data: vmSelf,
            ctx: appCtxSvc.ctx
        };
        const saveEditStateChangeCallback = function() {
            _notifyEditStateChange( 'saved', vmSelf );
        };
        return editUtilsService._startEdit( dataCtxNode, vmSelf, viewModelCollection, editConfig, saveEditStateChangeCallback, editOptions ).then( function() {
            if( !editOptions ) {
                _notifyEditStateChange( 'starting', vmSelf );
            }
        } );
    };

    /**
     * This is the cancel edits implementation of edit-handler interface.
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @returns {*} AwPromiseService.instance promise
     */
    vmSelf.cancelEdits = function() {
        var viewModelCollection = collectViewModelObjects( vmSelf );
        var dataCtxNode = {
            data: vmSelf,
            ctx: appCtxSvc.ctx
        };
        var editConfig = vmSelf.getEditConfiguration();
        return editUtilsService._cancelEdits( dataCtxNode, vmSelf, viewModelCollection, editConfig ).then( function() {
            _notifyEditStateChange( 'canceling', vmSelf );
        } );
    };

    /**
     * This function implements the save edits function edit handler interface
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @returns {*} AwPromiseService.instance promise
     */
    vmSelf.saveEdits = function() {
        var viewModelCollection = collectViewModelObjects( vmSelf );
        var editConfig = vmSelf.getEditConfiguration();
        var dataCtxNode = {
            data: vmSelf,
            ctx: appCtxSvc.ctx
        };
        return editUtilsService._saveEdits( dataCtxNode, vmSelf, viewModelCollection, editConfig ).then( function() {
            _notifyEditStateChange( 'saved', vmSelf );
        } );
    };

    /**
     *
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @return {*} boolean
     */
    vmSelf.editInProgress = function() {
        return vmSelf._editing;
    };

    // ======================== End of Edit Handler Interface ===================================================//

    /**
     * Check if this 'declViewModel' is 'destroyed' and should not be used.
     * @memberof viewModelProcessingFactory.DeclViewModel
     * @return {Boolean} TRUE if this DeclViewModel has had it's 'destroy' method called and should no longer be
     *         used or accessed for any purpose.
     */
    vmSelf.isDestroyed = function() {
        return vmSelf._internal.isDestroyed;
    };

    /**
     * ---------------------------------------------------------------------------<BR>
     * Property & Function definition complete....Finish initialization. <BR>
     * ---------------------------------------------------------------------------<BR>
     */
    if( declViewModelJson ) {
        vmSelf._internal.setViewModelJson( declViewModelJson );
    }

    declModelRegistrySvc.registerModel( 'DeclViewModel', vmSelf, '_internal.panelId', '_internal.modelId' );
}; // DeclViewModel

/**
 * Update the property in the 'target' object with the same value as the 'source' object based on the given
 * 'path' to that property.
 * <P>
 * Note: This function handles the 'special' property names used in the 'attrHolder' object used by the
 * 'modelPropertyService' during the initial property creation.
 *
 * @param {String} dataPath - The path to the property in the original 'declViewModelJson' 'data' object used as
 *            the basis of the property in the 'source' & 'target' to be updated.
 *
 * @param {ViewModelObject} sourceObject - The 'source' object of the value to apply.
 *
 * @param {ViewModelObject} targetObject - The 'target' object the value will be applies to.
 *
 * @return {Boolean} TRUE if the updated value requires i18n processing.
 */
export let updateDataProperty = function( dataPath, sourceObject, targetObject ) {
    /**
     * Check if it is a 'special' name that should use the mapped property name.
     */
    var lastDotNdx = dataPath.lastIndexOf( '.' );

    var leafPropName = dataPath.substring( lastDotNdx + 1 );

    if( _attrHolderPropName.indexOf( leafPropName ) > -1 ) {
        var parentPath = dataPath.substring( 0, lastDotNdx );

        modelPropertySvc.updateProperty( parentPath, leafPropName, sourceObject, targetObject );

        return false;
    }

    var newValue = _.get( sourceObject, dataPath );

    _.set( targetObject, dataPath, newValue );

    return _.isString( newValue ) && /^{{i18n\./.test( newValue ) || _.isObject( newValue ) && /^{{i18n\./.test( newValue.text );
};

/**
 * Return a new instance of a {DeclVideModel} initialized based on the given information.
 *
 * @param {DeclViewModelJson} declViewModelJson - (Optional) The object returned from loading the JSON resource
 *            for this DeclViewModel.
 *            <P>
 *            Note: A clone (deep copy) of this object will be set into the new object.
 *
 * @return {DeclViewModel} A newly created DeclViewModel object with all properties set to their default values
 *         other than those set via any given JSON object..
 */
export let createDeclViewModel = function( declViewModelJson ) {
    return new DeclViewModel( declViewModelJson );
};

/**
 * Resolve value of ctx and subPanelContext
 * @param {String} propValue - Prop Value like {{ctx.title}} or {{subPanelContext.title}}.
 * @param {String} propName - Prop name of element.
 * @param {Object} dataObj - data object which will have ctx obj or subcontext.
 * @param {Object} parentJsonObject - The current 'parent' JSON object to visit the 'child' properties of.
 */
function resolvePropValue( propValue, propName, dataObj, parentJsonObject ) {
    var newVal = parsingUtils.getStringBetweenDoubleMustaches( propValue );
    var val = _.get( dataObj, newVal );
    if( val ) {
        parentJsonObject[ propName ] = val;
    } else {
        val = AwInterpolateService.instance( propValue )( dataObj );
        if( val ) {
            parentJsonObject[ propName ] = val;
        } else {
            parentJsonObject[ propName ] = '';
        }
    }
}

/**
 * Recursively initialize the property values of the given JSON data object with the current value of any bound
 * appContext properties (bound via {{ctx.*}}).
 * <P>
 * Note: While on the 'exports' object, this API is only meant for internal/testing use.
 *
 * @param {Object} parentJsonObject - The current 'parent' JSON object to visit the 'child' properties of.
 *
 * @param {Object} subPanelContext - (Optional) Subpanlecontext attribute of aw-include directive
 */
export let initViewModel = function( parentJsonObject, subPanelContext ) {
    _.forEach( parentJsonObject, function( propValue, propName ) {
        // Check if starts with '{{ctx.' and ends with '}}'
        if( _.isString( propValue ) && /^{{ctx\..*}}$/.test( propValue ) ) {
            resolvePropValue( propValue, propName, appCtxSvc, parentJsonObject );
        } else if( _.isString( propValue ) && /^{{subPanelContext\..*}}$/.test( propValue ) ) {
            // Check if starts with '{{subPanelContext.' and ends with '}}'
            resolvePropValue( propValue, propName, { subPanelContext: subPanelContext }, parentJsonObject );
        } else if( _.isObject( propValue ) ) {
            exports.initViewModel( propValue, subPanelContext );
        }
    } );
};

/**
 * Sanitize String properties of viewModelProperty.
 *
 * @param {Object} viewModelProperty - Object to check.
 *
 * @return {ViewModelProperty} sanitized viewModelProperty.
 */
function _sanitize( viewModelProperty ) {
    _.forOwn( viewModelProperty, function( value, key ) {
        if( propertiesToSanitize[ key ] ) {
            if( _.isString( value ) ) {
                viewModelProperty[ key ] = sanitizer.sanitizeHtmlValue( value );
            } else if( _.isArray( value ) ) {
                viewModelProperty[ key ] = sanitizer.sanitizeHtmlValues( value );
            }
        }
    } );

    return viewModelProperty;
}
/**
 * Process JSON data, create 'ViewModelProperty' object and fill in data for further processing.
 *
 * @param {DeclViewModelJson} declViewModelJson - Object loaded from the DeclViewModel JSON file.
 *
 * @param {Object} subPanelContext - (Optional) Subpanlecontext attribute of aw-include directive
 *
 * @return {Promise} The promise will be resolved with a new 'declViewModel' object populated with information
 *         from the given 'declViewModelJson'.
 */
export let processViewModel = function( declViewModelJson, subPanelContext ) {
    var jsonData = declViewModelJson;

    debugService.debug( 'lifeCycles', declViewModelJson._viewModelId, 'init' );

    var newDeclViewModel = exports.createDeclViewModel( declViewModelJson );

    /**
     * Check if we have any 'data' objects we need to apply appContext to.
     */
    if( !_.isEmpty( jsonData.data ) ) {
        /**
         * Since 'initViewModel' changes the object given to it, make a clone now to leave the original JSON
         * object untouched.
         */
        var dataClone = _.cloneDeep( jsonData.data );

        exports.initViewModel( dataClone, subPanelContext );

        /**
         *
         */
        var compoundObjectMap = {};
        var compoundViewModelObjectMap = {};

        // If 'uid' is given in view model data, attach the model object to this DeclViewModel
        if( dataClone.uid ) {
            newDeclViewModel.vmo = newDeclViewModel.attachModelObject( dataClone.uid, dataClone.operationName,
                dataClone.owningObjUid );
            newDeclViewModel.uid = dataClone.uid;
        }

        _.forEach( dataClone, function( dataProp, propName ) { // eslint-disable-line complexity
            /**
             * We do not want model objects as declViewModelObjects, so do not allow this 'marker' property on
             * the new object. This case was already handled above.
             */
            if( propName === 'uid' ) {
                return;
            }

            /**
             * Do not process properties beginning with underscore as view model properties.
             */
            if( _.startsWith( propName, '_' ) ) {
                newDeclViewModel[ propName ] = dataProp;
                return;
            }

            if( propName === 'objects' ) {
                if( !newDeclViewModel.objects ) {
                    newDeclViewModel.objects = {};
                }

                _.forEach( dataProp, function( dataPropValues, dataPropName ) {
                    var vmos = [];
                    dataPropValues.forEach( function( dataPropValue ) {
                        var viewModelObject = newDeclViewModel.attachModelObject( dataPropValue.uid,
                            dataClone.operationName, dataClone.owningObjUid, dataPropValue );

                        if( dataPropValue.selected ) {
                            newDeclViewModel.vmo = viewModelObject;
                        }
                        vmos.push( viewModelObject );
                    } );

                    // same uid may map to multiple vmo
                    if( vmos.length > 1 ) {
                        newDeclViewModel.objects[ dataPropName ] = vmos;
                    } else {
                        newDeclViewModel.objects[ dataPropName ] = vmos[ 0 ];
                    }
                } );

                return;
            }

            /**
             * Create a new viewModelProperty based on the JSON data's 'data' properties
             */
            var propAttrHolder = {};

            _.forEach( dataProp, function( dataPropValue, dataPropName ) {
                if( _attrHolderPropName.indexOf( dataPropName ) > -1 ) {
                    propAttrHolder[ dataPropName ] = dataPropValue;
                }
            } );

            // If this is not a view model prop, just save the object to the data.
            if( _.isEmpty( propAttrHolder ) ) {
                newDeclViewModel[ propName ] = dataProp;
                return;
            }

            /**
             * Make sure we have a 'propName' set.
             */
            if( !propAttrHolder.propName ) {
                propAttrHolder.propName = propName;
            }

            // process compound property, like revision:item_revision_id
            var isCompoundProp = false;

            var vmProp = null;

            if( propName.indexOf( _compoundPropNameDelimiter ) > 0 &&
                propAttrHolder.dbValue.indexOf( _compoundPropValueDelimiter ) > 0 ) {
                var compoundProps = propAttrHolder.dbValue.split( _compoundPropValueDelimiter );

                var objectRefProp = _.get( newDeclViewModel, compoundProps[ 0 ] );

                if( objectRefProp.type === 'OBJECT' || objectRefProp.type === 'OBJECTARRAY' ) {
                    isCompoundProp = true;

                    var modelObject = null;
                    var childFullPropertyName = '';
                    var i = 0;

                    for( i = 0; i < compoundProps.length - 1; i++ ) {
                        if( i === 0 ) {
                            modelObject = clientDataModel.getObject( objectRefProp.dbValues[ 0 ] );
                        } else if( modelObject ) {
                            childFullPropertyName += '__';
                            objectRefProp = _.get( modelObject.props, compoundProps[ i ] );
                            modelObject = clientDataModel.getObject( objectRefProp.dbValues[ 0 ] );
                        }
                        childFullPropertyName += compoundProps[ i ];

                        if( !compoundObjectMap.hasOwnProperty( childFullPropertyName ) ) {
                            _.set( compoundObjectMap, childFullPropertyName, modelObject );
                        }
                    }

                    var compoundViewModelObject = _.get( compoundViewModelObjectMap, childFullPropertyName );

                    if( !compoundViewModelObject && modelObject ) {
                        compoundViewModelObject = viewModelObjectSrv.createViewModelObject( modelObject.uid,
                            dataClone.operationName );
                        _.set( compoundViewModelObjectMap, childFullPropertyName, compoundViewModelObject );
                    }

                    if( compoundViewModelObject ) {
                        vmProp = _.get( compoundViewModelObject.props, compoundProps[ i ] );
                        if( !vmProp ) {
                            // skip this view model property when the compound property doesn't exist in referenced object
                            return;
                        }

                        _.set( vmProp, 'intermediateCompoundObjects', compoundObjectMap );
                    }
                }
            }

            if( !vmProp ) {
                vmProp = modelPropertySvc.createViewModelProperty( propAttrHolder );
            }

            // other properties
            if( !isCompoundProp && !declUtils.isNil( dataProp.dbValue ) ) {
                vmProp.dbValue = dataProp.dbValue;
            }

            if( dataProp.dataProvider ) {
                // we have an lov, but the api is defined using the dataProvider
                vmProp.dataProvider = dataProp.dataProvider;
                // initialize lovApi here? we could if we had the prop scope...
                // instead, postpone till first expand
                vmProp.hasLov = true;
                // allow empty LOV entry
                vmProp.emptyLOVEntry = dataProp.emptyLOVEntry;
            }

            if( !declUtils.isNil( dataProp.uiValue ) ) {
                vmProp.uiValue = dataProp.uiValue;
            }

            if( !declUtils.isNil( dataProp.propertyLabelDisplay ) ) {
                vmProp.propertyLabelDisplay = dataProp.propertyLabelDisplay;
            }

            // attach method for accessing the viewModel
            vmProp.getViewModel = function() {
                return newDeclViewModel;
            };

            newDeclViewModel[ propName ] = _sanitize( vmProp );
        } );
    }

    if( jsonData.grids ) {
        newDeclViewModel.grids = jsonData.grids;
        exports.initViewModel( newDeclViewModel.grids, subPanelContext );
    }

    if( jsonData.columnProviders ) {
        newDeclViewModel.columnProviders = {};
        var mockedColumnProvider = mockModeService.isMockModeActive() && jsonData.mock && jsonData.mock.columnProviders;
        _.forEach(
            jsonData.columnProviders,
            function( jsonColumnProvider, cpName ) {
                if( mockedColumnProvider && mockedColumnProvider[ cpName ] ) {
                    jsonColumnProvider = mockedColumnProvider[ cpName ];
                }
                newDeclViewModel.columnProviders[ cpName ] = jsonColumnProvider;
            } );
    }

    if( jsonData.chartProviders ) {
        if( !newDeclViewModel.chartProviders ) {
            newDeclViewModel.chartProviders = {};
        }
        newDeclViewModel.chartProviders = jsonData.chartProviders;
        exports.initViewModel( newDeclViewModel.chartProviders, subPanelContext );

        _.forEach( newDeclViewModel.chartProviders, function( jsonChartProvider, chartProviderName ) {
            newDeclViewModel.chartProviders[ chartProviderName ].name = chartProviderName;
        } );
    }

    if( jsonData.commands ) {
        newDeclViewModel.commands = _.cloneDeep( jsonData.commands );

        exports.initViewModel( newDeclViewModel.commands );
    }

    if( jsonData.commandHandlers ) {
        newDeclViewModel.commandHandlers = jsonData.commandHandlers;
    }

    if( jsonData.commandPlacements ) {
        newDeclViewModel.commandPlacements = jsonData.commandPlacements;
    }

    if( jsonData.objectSetSource ) {
        newDeclViewModel.objectSetSource = jsonData.objectSetSource;
    }

    if( jsonData.objectSetSource ) {
        newDeclViewModel.objectSetSource = jsonData.objectSetSource;
    }

    if( jsonData.editContext ) {
        editHandlerService.setEditHandler( editHandlerFactory.createEditHandler( dataSourceService
            .createNewDataSource( {
                declViewModel: newDeclViewModel
            } ) ), jsonData.editContext );
        // set this handler active
        editHandlerService.setActiveEditHandlerContext( jsonData.editContext );
    }

    return _populateDataProviders( declViewModelJson, newDeclViewModel, subPanelContext );
};

/**
 * Update localization texts on the properties created based on data section
 *
 * @param {DeclViewModel} objectRoot - The 'declViewModel' to scan for possible I18n string replacements and the
 *            model to apply those replacements to.
 *
 * @param {Object} i18nValueMap - Context to search the input string from.
 *            <P>
 *            Note: All property names in this object are possible to be used as string replacements. However,
 *            most uses of this service will use 'i18n.' as the prefix in their text 'path'. Therefore, the
 *            'i18n' property of this object is the most important property.
 *
 * @param {Number} level - Level in the recursive walk of the i18n properties.
 *
 * @param {StringMap} paramValues -
 */
export let updateI18nTexts = function( objectRoot, i18nValueMap, level, paramValues ) {
    _.forEach( objectRoot, function( propValue, propName ) {
        /**
         * Check if <BR>
         * There is NO property value OR <BR>
         * It is a property that is 'reserved' (scope, ctx, data) OR<BR>
         * It is known to be invalid to traverse (propertyDescriptor*, props, modelType, etc.)
         * <P>
         * Note: We are doing this to avoid cyclic traversals and data known to not contains i18n bindings.
         */
        if( !propValue || propValue.propertyDescriptor ||
            /^(scope|ctx|data|props|eventData|eventMap|propertyDescriptor(|s|sMaps)|modelType|_internal|\$.*)$/.test( propName ) ||
            _.isFunction( propValue ) || _.isNumber( propValue ) || _.isBoolean( propValue ) ||
            level === 1 && propName === 'action' ) {
            return true;
        }

        /**
         * Skip binding to any '_internal' properties or those starting with '$' or those with 'null' values, or
         * properties from a model object
         */
        if( _.isString( propValue ) ) {
            if( /^{{i18n\./.test( propValue ) ) {
                var results = propValue.match( parsingUtils.REGEX_DATABINDING );

                if( results && results.length === 4 ) {
                    var textPath = results[ 2 ];

                    var val = _.get( i18nValueMap, textPath );

                    if( paramValues && !_.isEmpty( paramValues ) ) {
                        val = messagingService.applyMessageParamsWithoutContext( val, paramValues );
                    }

                    if( val ) {
                        objectRoot[ propName ] = val;
                    } else {
                        // use i18n key as fall back if no i18n text found, slice the leading 'i18n.' in textPath to get key
                        objectRoot[ propName ] = textPath.slice( 5 );
                    }
                }
            }
        } else if( _.isObject( propValue ) && propValue.text && propValue.params ) {
            objectRoot[ propName ] = propValue.text;
            exports.updateI18nTexts( objectRoot, i18nValueMap, nextLevel, propValue.params );
        } else {
            if( !_.isEmpty( propValue ) ) {
                var nextLevel = level + 1;

                if( propName === 'dataProviders' ) {
                    /**
                     * Resolve any i18n bindings in dataProvider command titles.
                     */
                    _.forEach( propValue, function( propValue2 ) {
                        if( propValue2 && propValue2.commands ) {
                            exports.updateI18nTexts( propValue2.commands, i18nValueMap, nextLevel );
                        }
                    } );
                } else {
                    exports.updateI18nTexts( propValue, i18nValueMap, nextLevel );
                }
            }
        }
    } );
};

/**
 * Check if any view model on the page is currently active
 *
 * @returns {Boolean} true if active
 */
export let isAnyViewModelActive = function() {
    return sharedViewModelToken !== 0;
};

exports = {
    updateDataProperty,
    createDeclViewModel,
    initViewModel,
    processViewModel,
    updateI18nTexts,
    isAnyViewModelActive
};
export default exports;
/**
 * The service to process the view model.
 *
 * @member viewModelProcessingFactory
 * @memberof NgServices
 */
app.factory( 'viewModelProcessingFactory', () => exports );
