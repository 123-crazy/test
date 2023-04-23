// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgControllers.QualityCharLibrarySublocationCtrl}
 *
 * @module js/aw.qualityCharacteristicsLibrary.sublocation.controller
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw.native.sublocation.controller';
import appCtxService from 'js/appCtxService';
'use strict';

/**
 * Characteristics Manager controller. Extends the {@link  NgControllers.NativeSubLocationCtrl}.
 *
 * @class NgControllers.QualityCharManagerSublocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - controller service
 * @memberOf NgControllers
 */
app.controller( 'QualityCharLibrarySublocationCtrl', [
    '$scope',
    '$controller',
    function( $scope, $controller ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        //Listen for any aqc0CharGroupCreated events
        var aqc0CharGroupCreatedEventListener = eventBus.subscribe( 'aqc0CharGroupCreated', function(
            data ) {
            //Reload the primary work area data
            eventBus.publish( 'primaryWorkarea.reset' );
            //If new groups were created
            if( data.createdGroups ) {
                //If the panel isn't pinned update the selection
                if( !data.isPinnedFlag ) {
                    //Select the newly created objects
                    appCtxService.registerCtx('createdObjUid',data.createdGroups[0].uid);
                    $scope.pwaSelectionModel.addToSelection( data.createdGroups );
                }
            }
        } );

        $scope.$on( '$destroy', function() {
            // Remove the model object related data modified listner when scope is destryoed.
            eventBus.unsubscribe( aqc0CharGroupCreatedEventListener );
        } );

    }
] );
