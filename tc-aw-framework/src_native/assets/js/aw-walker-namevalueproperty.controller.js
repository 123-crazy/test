// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * @module js/aw-walker-namevalueproperty.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/appCtxService';
import 'js/aw-abstract-tableproperty.controller';

/*
 * Controller referenced from the 'div' <aw-walker-namevalueproperty>
 *
 * @memberof NgController
 * @member awWalkerNameValuePropertyController
 */
app.controller( 'awWalkerNameValuepropertyController', [
    '$scope',
    '$controller',
    'appCtxService', //
    function( $scope, $controller, appCtxSvc ) {

        var self = this;

        /**
         * Inherit abstract table property controller
         */
        ngModule.extend( self, $controller( 'awAbstractTablepropertyController', {
            $scope: $scope
        } ) );

        /**
         * Describes the scope
         */
        $scope.whoAmI = 'awWalkerNameValuepropertyController';

        /**
         * Flag to indicate whether name value panel is open or closed
         */
        var _isPanelOpen = false;

        /**
         * {ObjectArray} Collection of eventBus subscription definitions to be un-subscribed from when this
         * controller is destroyed.
         */
        var _eventBusSubDefs = [];

        /**
         * Closes the Name Value Create Panel
         */
        var closePanel = function() {
            var eventData = {
                source: 'toolAndInfoPanel'
            };
            eventBus.publish( 'complete', eventData );
            _isPanelOpen = false;
        };

        /**
         * Manage the closing of name value create panel on appropriate conditions
         *
         * @param {Object} eventData published along with the event
         */
        var managePanel = function( eventData ) {
            if( _isPanelOpen ) {
                if( eventData && eventData.name === 'editInProgress' ) {
                    closePanel();
                }
            }

            if( eventData && eventData.name === 'activeToolsAndInfoCommand' && eventData.value &&
                eventData.value.commandId === 'Awp0NameValueCreate' ) {
                _isPanelOpen = true;
            }
        };

        /**
         * Setup name value specific event subscriptions and add to the event subscription definition array
         */
        var initSubscriptions = function() {
            _eventBusSubDefs.push( eventBus.subscribe( 'saveEdits', closePanel ) );
            _eventBusSubDefs.push( eventBus.subscribe( 'appCtx.register', managePanel ) );
            _eventBusSubDefs.push( eventBus.subscribe( 'appCtx.update', managePanel ) );
        };

        /**
         * Initializes the following on the application context: 1. Initial LOV Data addition props : as required by
         * the platform to constrain lov values in the drop down based on the type of parent object and type of name
         * value to be created a. Lov context prop name b. Lov context object
         *
         * 2. Initial row data for name value property Sets the owningObject and tablePropertyName which are
         * consumed by the commands view model and abstract table property controller
         *
         */
        $scope.initContext = function() {
            var fnd0LOVContextPropName = $scope.namevaluepropertydata.propertyName;
            var fnd0LOVContextObjectUid = $scope.namevaluepropertydata.parentUid;
            var additionalProps = {
                fnd0LOVContextPropName: fnd0LOVContextPropName,
                fnd0LOVContextObject: fnd0LOVContextObjectUid
            };
            appCtxSvc.registerCtx( 'InitialLovDataAdditionalProps', additionalProps );

            $scope.fnd0LOVContextPropName = fnd0LOVContextPropName;
            $scope.fnd0LOVContextObject = fnd0LOVContextObjectUid;

            self.loadStaticCommands( 'aw_nameValuePropertyXrtSection', 'Awp0NameValueCreateXRT',
                'Awp0NameValueRemoveXRT' );
            initSubscriptions();
        };

        $scope.addTableProperty = function _addTableProperty() {
            appCtxSvc.registerCtx( 'ActiveTablePropertyId', $scope.getPropertyData().id );
            $scope._addTablePropertyCommand.callbackApi.execute();
        };

        $scope.removeTableProperty = function _removeTableProperty() {
            appCtxSvc.registerCtx( 'ActiveTablePropertyId', $scope.getPropertyData().id );
            $scope._removeTablePropertyCommand.callbackApi.execute();
        };

        // Clean up app context registrations when scope is destroyed
        $scope.$on( '$destroy', function() {
            appCtxSvc.unRegisterCtx( 'InitialLovDataAdditionalProps' );

            // unregister event subscriptions
            _.forEach( _eventBusSubDefs, function( subdef ) {
                eventBus.unsubscribe( subdef );
            } );

            _isPanelOpen = false;
        } );

        // set the name-value property data context
        $scope.namevaluepropertydata.setDisplayValuesUpdated = true;
        self.setPropertyData( $scope.namevaluepropertydata, 'NameValue' );
    }
] );
