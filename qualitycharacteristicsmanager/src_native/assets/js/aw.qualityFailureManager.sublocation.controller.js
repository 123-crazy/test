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
 * Defines the {@link NgControllers.QualityFailureManagerSublocationCtrl}
 *
 * @module js/aw.qualityFailureManager.sublocation.controller
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
 * Failure Manager controller. Extends the {@link  NgControllers.NativeSubLocationCtrl}.
 *
 * @class NgControllers.QualityCharManagerSublocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - controller service
 * @param $appCtxService {Object} - App context service
 * @memberOf NgControllers
 */
app.controller( 'QualityFailureManagerSublocationCtrl', [
    '$scope',
    '$controller',
    'appCtxService',
    function( $scope, $controller, appCtxService ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        //failure manager context key
        var _failureManagerContext = 'failureManagerContext';

        //Setup the failure manager context 
        appCtxService.registerCtx( _failureManagerContext, {} );

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
            }
        } );

        $scope.$on( '$destroy', function() {
            //Clear the failure manager context when sublocation is removed
            appCtxService.unRegisterCtx( _failureManagerContext );
            // Remove the model object related data modified listner when scope is destryoed.
            eventBus.unsubscribe( modelObjectRelatedDataModifiedEventListener );
        } );

    }
] );
