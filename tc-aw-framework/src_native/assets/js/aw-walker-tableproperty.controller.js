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
 * @module js/aw-walker-tableproperty.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import 'js/aw-abstract-tableproperty.controller';
import 'js/appCtxService';

/**
 * Controller referenced from the 'div' <aw-walker-tableproperty>
 *
 * @memberof NgController
 * @member awWalkerTablepropertyController
 */
app.controller( 'awWalkerTablepropertyController', [
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
        $scope.whoAmI = 'awWalkerTablepropertyController';

        /**
         * Initializes initial row data for table property on the application context. Sets the owningObject and
         * tablePropertyName which are consumed by the commands view model and abstract table property controller
         *
         */
        $scope.initContext = function() {
            self.loadStaticCommands( 'aw_tablePropertyXrtSection', 'Awp0TablePropertyCreate',
                'Awp0TablePropertyRemove', 'Awp0TablePropertyDuplicate' );
        };

        self.setTablePropertyInitiaRowDataInput = function() {
            var owningObjectUid = self.getPropertyData().parentUid;
            var tablePropertyName = self.getPropertyData().propertyName;
            appCtxSvc.registerCtx( 'TablePropertyInitialRowDataInput', {
                owningObject: {
                    uid: owningObjectUid
                },
                tablePropertyName: tablePropertyName
            } );
        };

        $scope.preAdd = function _addTableProperty() {
            self.setTablePropertyInitiaRowDataInput();
        };

        $scope.preRemove = function _removeTableProperty() {
            self.setTablePropertyInitiaRowDataInput();
        };

        // Clean up app context registrations when scope is destroyed
        $scope.$on( '$destroy', function() {} );

        // set the table property data context
        self.setPropertyData( $scope.tablepropertydata, 'TableProperty' );
    }
] );
