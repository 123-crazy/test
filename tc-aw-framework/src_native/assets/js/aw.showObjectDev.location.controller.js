// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Copied from aw.inbox.sublocation.controller.js to get started with decl showObject...
 *
 * Defines the {@link NgControllers.ShowObjectSubLocationCtrl}
 *
 * @module js/aw.showObjectDev.location.controller
 * @requires app
 * @requires angular
 * @requires js/aw.default.location.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import 'js/aw.native.sublocation.controller';
import 'soa/kernel/clientDataModel';
import 'js/selection.service';
import 'soa/kernel/propertyPolicyService';
import 'soa/kernel/clientDataModel';
import 'soa/dataManagementService';
import 'js/appCtxService';
import 'js/typeDisplayName.service';
import 'js/showObjectDevConfigService';
import 'js/viewModelObjectService';

/**
 * showObject sublocation controller. Extends the {@link  NgControllers.NativeSubLocationCtrl} to call
 * performAction3 when the XRTSummaryView is displayed for the selected object in the primaryWorkArea.
 *
 * @class NgControllers.ShowObjectSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'ShowObjectSubLocationCtrl', [
    '$scope',
    '$state',
    '$controller',
    'soa_kernel_propertyPolicyService',
    'soa_kernel_clientDataModel',
    'soa_dataManagementService',
    'appCtxService',
    'typeDisplayNameService',
    'selectionService',
    'showObjectDevConfigService',
    'viewModelObjectService',
    function( $scope, $state, $controller, propertyPolicyService, cdm, dataManagementService, appCtxSvc,
        typeDisplayNameService, selectionService, showObjectDevConfigSvc, viewModelObjectSvc ) {

        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * The id of the context for the location
         *
         * @private
         * @member _locationContext
         * @memberOf NgControllers.ShowObjectLocationCtrl
         */
        var _locationContext = 'locationContext';

        /**
         * Refresh the scope based on the parameters
         *
         * @method _refreshState
         * @memberOf NgControllers.ShowObjectSubLocationCtrl
         */
        var _refreshState = function() {
            if( $state.params.uid ) {

                //The model object is about to change so remove active model object from parent selection
                if( $scope.modelObject ) {
                    if( logger.isTraceEnabled() ) {
                        logger.trace( 'Removing ' + $scope.modelObject.uid + ' from parent selection' );
                    }

                    propertyPolicyService.removeFromParentSelection( $scope.modelObject.uid );
                }

                //Get or load the object and refresh
                var modelObject = cdm.getObject( $state.params.uid );

                if( !modelObject ) {
                    if( $state.current.data.propertyPolicyPromise ) {
                        $state.current.data.propertyPolicyPromise.then( function() {
                            dataManagementService.loadObjects( [ $state.params.uid ] ).then(
                                function( serviceData ) {

                                    $scope.modelObject = serviceData.modelObjects[ $state.params.uid ];

                                    _refreshModelObject();
                                },
                                function() {
                                    $scope.errorMessage = $scope.xrtMessages.FailureLoadingSummary;
                                } );
                        } );
                    } else {
                        dataManagementService.loadObjects( [ $state.params.uid ] ).then( function( serviceData ) {

                            $scope.modelObject = serviceData.modelObjects[ $state.params.uid ];

                            _refreshModelObject();
                        }, function() {
                            $scope.errorMessage = $scope.xrtMessages.FailureLoadingSummary;
                        } );
                    }
                } else {
                    $scope.modelObject = modelObject;

                    _refreshModelObject();
                }
            } else {
                $scope.errorMessage = $scope.xrtMessages.uidParameterMissingInURL;
            }

        };

        /**
         * Update the primary workarea selection
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         */
        var _updatePrimarySelection = $scope.updatePrimarySelection;
        $scope.updatePrimarySelection = function( selection ) {
            if( !selection.length ) {
                $scope.vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( $scope.modelObject, "Edit" );
                _updatePrimarySelection( [ $scope.vmo ] );
            } else {
                _updatePrimarySelection( selection );
            }

        };

        /**
         * Refresh the location based on model object changes. Resets all $scope properties to the default and
         * rebuilds from the current model object.
         *
         * @method _refreshModelObject
         * @memberOf NgControllers.ShowObjectSubLocationCtrl
         */
        var _refreshModelObject = function() {
            //If the object was set to null show error
            if( !$scope.modelObject ) {
                $scope.errorMessage = $scope.xrtMessages.objectNotFound;
            } else {

                var locationCtx = appCtxSvc.getCtx( _locationContext );

                appCtxSvc.updateCtx( _locationContext, {
                    'ActiveWorkspace:Location': locationCtx[ 'ActiveWorkspace:Location' ],
                    'ActiveWorkspace:SubLocation': locationCtx[ 'ActiveWorkspace:SubLocation' ],
                    'modelObject': $scope.modelObject
                } );

                $scope.vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( $scope.modelObject, "Edit" );
                selectionService.updateSelection( $scope.vmo );

                //Update the display name
                var objectDisplayName = typeDisplayNameService.getDisplayName( $scope.modelObject );
                $scope.headerTitle = objectDisplayName;
                $scope.browserSubTitle = objectDisplayName;
                //Get the current context
                var ctx = appCtxSvc.getCtx( 'location.titles' );

                //Update title
                ctx.headerTitle = objectDisplayName;
                ctx.modelObject = $scope.modelObject;
                ctx.browserSubTitle = objectDisplayName;
                appCtxSvc.updateCtx( 'location.titles', ctx );

                //Add to parent selection
                if( logger.isTraceEnabled() ) {
                    logger.trace( 'Adding ' + $scope.modelObject.uid + ' to parent selection' );
                }

                propertyPolicyService.addToParentSelection( $scope.modelObject.uid );
            }
        };

        /**
         * If the object currently loaded is modified update the title
         *
         * @method handleObjectsModifiedListener
         * @memberOf NgControllers.ShowObjectSubLocationCtrl
         */
        var _handleObjectsModifiedListener = function() {
            //Add listener
            var onObjectsModifiedListener = eventBus.subscribe( "cdm.modified", function( data ) {
                if( data.modifiedObjects && data.modifiedObjects.length > 0 ) {
                    data.modifiedObjects.forEach( function( mo ) {
                        if( mo.uid === $state.params.uid ) {
                            $scope.$evalAsync( function() {
                                typeDisplayNameService.getDisplayName( $scope.modelObject ).then(
                                    function( objectDisplayName ) {
                                        $scope.headerTitle = objectDisplayName;
                                        $scope.browserSubTitle = objectDisplayName;
                                    } );
                            } );
                        }
                    } );
                }
            } );

            //And remove it when the scope is destroyed
            $scope.$on( '$destroy', function() {
                eventBus.unsubscribe( onObjectsModifiedListener );
            } );
        };

        /**
         * ---------------------------------------------------------------------------<BR>
         * Property & Function definition complete....Finish initialization. <BR>
         * ---------------------------------------------------------------------------<BR>
         */

        /**
         * Handle the view changing with a single object selected - should be marked as read if the secondary work
         * area is not visible.
         */
        $scope.$watch( 'showSecondaryWorkArea', function _watchShowSecondaryWorkArea( a, b ) {
            //Ignore the initial update
            if( a !== b ) {
                //If the secondary workarea becomes visible and a single object is selected
                if( $scope.showSecondaryWorkArea && $scope.modelObjects && $scope.modelObjects.length === 1 ) {
                    //Mark the task as read
                    //awInboxSvc.setViewedByMeIfNeeded( $scope.modelObjects[0] );
                }
            }
        } );

        //Remove from parent selection when leaving location
        $scope.$on( '$destroy', function() {
            if( $scope.modelObject ) {
                if( logger.isTraceEnabled() ) {
                    logger.trace( 'Removing ' + $scope.modelObject.uid + ' from parent selection' );
                }

                propertyPolicyService.removeFromParentSelection( $scope.modelObject.uid );

                $scope.modelObject = null;
            }
        } );

        /**
         * All of the initial setup of the $scope. Sets the context and registers it with the appCtxService. Loads
         * the localized error messages and sets the required property policies before loading the model object from
         * the $state parameters
         */
        showObjectDevConfigSvc.updateFromSaved();

        _handleObjectsModifiedListener(); //ModelObjectModifiedEvent

        ctrl.init.then( _refreshState );
    }
] );
