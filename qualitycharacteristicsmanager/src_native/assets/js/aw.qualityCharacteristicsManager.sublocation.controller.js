// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgControllers.QualityCharManagerSublocationCtrl}
 *
 * @module js/aw.qualityCharacteristicsManager.sublocation.controller
 */
import app from 'app';
import ngModule from 'angular';
import $ from 'jquery';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import 'js/aw.native.sublocation.controller';
import 'js/appCtxService';

'use strict';

/**
 * Characteristics Manager controller. Extends the {@link  NgControllers.NativeSubLocationCtrl}.
 *
 * @class NgControllers.QualityCharManagerSublocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - controller service
 * @param $appCtxService {Object} - App context service
 * @memberOf NgControllers
 */
app.controller( 'QualityCharManagerSublocationCtrl', [
    '$scope',
    '$controller',
    'appCtxService',
    function( $scope, $controller, appCtxService ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        //character manager context key
        var _charManagerContext = 'charManagerContext';

        //Setup the character manager context 
        appCtxService.registerCtx( _charManagerContext, {} );

        //Listen for any related data modified events
        var modelObjectRelatedDataModifiedEventListener = eventBus.subscribe( 'cdm.relatedModified', function(
            data ) {
            var matches = data.relatedModified.filter( function( mo ) {
                return mo.uid === $scope.baseSelection.uid;
            } );

            //If location should reload for the current model object
            if( !data.refreshLocationFlag && matches.length ) {

                //Reload the primary work area data
                eventBus.publish( 'primaryWorkarea.reset' );

                //Add the created objects to charmanager context i.e. in charManagerContext.createdSpecifications
                updateNavigateContext( 'createdSpecifications', data.createdObjects, data.childObjects );

                //If new objects were created
                if( data.createdObjects ) {

                    //If the panel isn't pinned update the selection
                    if( !data.isPinnedFlag ) {
                        //Select the newly created objects
                        $scope.pwaSelectionModel.addToSelection( data.createdObjects );
                        //Set the selection manually to fix the defect LCS-383736
                        $scope.pwaSelectionModel.setSelection( data.createdObjects );
                    }
                }
            }
        } );

        /**
         * This method add the newly created objects to the charmanager context i.e. in charManagerContext.createdSpecifications
         */
        var updateNavigateContext = function( contextkey, newObjects, cutObjects ) {
            var chrMngrCxtkey = _charManagerContext + '.' + contextkey;
            var currentCtx = appCtxService.getCtx( chrMngrCxtkey ) || [];
            //If new objects were added, add them into the context
            if( newObjects ) {
                var newUids = newObjects.map( function( mo ) {
                    return mo.uid;
                } );
                currentCtx = currentCtx.concat( newUids.filter( function( x ) {
                    return currentCtx.indexOf( x ) === -1;
                } ) );
            }
            //If objects were cut/ deleted remove them from the context
            if( cutObjects ) {
                var cutUids = cutObjects.map( function( mo ) {
                    return mo.uid;
                } );
                currentCtx = currentCtx.filter( function( uid ) {
                    return cutUids.indexOf( uid ) === -1;
                } );
            }
            appCtxService.updatePartialCtx( chrMngrCxtkey, currentCtx );
        };

        $scope.$on( '$destroy', function() {
            //Clear the character manager context when sublocation is removed
            appCtxService.unRegisterCtx( _charManagerContext );
            // Remove the model object related data modified listner when scope is destryoed.
            eventBus.unsubscribe( modelObjectRelatedDataModifiedEventListener );
        } );

    }
] );
