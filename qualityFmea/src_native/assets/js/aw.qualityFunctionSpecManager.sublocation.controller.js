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
 * Defines the {@link NgControllers.QualityFunctionSpecManagerSublocationCtrl}
 *
 * @module js/aw.qualityFunctionSpecManager.sublocation.controller
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
 * Function Manager controller. Extends the {@link  NgControllers.NativeSubLocationCtrl}.
 *
 * @class NgControllers.QualityFunctionSpecManagerSublocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - controller service
 * @param $appCtxService {Object} - App context service
 * @memberOf NgControllers
 */
app.controller( 'QualityFunctionSpecManagerSublocationCtrl', [
    '$scope',
    '$controller',
    'appCtxService',
    function( $scope, $controller, appCtxService ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        //function manager context key
        var _functionSpecManagerContext = 'functionSpecManagerContext';

        //Setup the function manager context 
        appCtxService.registerCtx( _functionSpecManagerContext, {} );

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
            //Clear the function manager context when sublocation is removed
            appCtxService.unRegisterCtx( _functionSpecManagerContext );
            // Remove the model object related data modified listner when scope is destryoed.
            eventBus.unsubscribe( modelObjectRelatedDataModifiedEventListener );
        } );

    }
] );
