// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * Defines the {@link NgControllers.NewsFeedSubLocationCtrl}
 *
 * @module js/aw.newsfeed.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.native.sublocation.controller
 * @requires js/awMessageService
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.native.sublocation.controller';
import 'js/awMessageService';

/**
 * News Feed sub location controller. Extends the {@link  NgControllers.NativeSubLocationCtrl} to display
 * XRTSummaryView for the selected object in the primaryWorkArea.
 *
 * @class NgControllers.NewsFeedSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'NewsFeedSubLocationCtrl', [ '$scope', '$controller', 'awMessageService',
    function( $scope, $controller, awMessageSvc ) {
        var ctrl = this;

        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * Handle the view changing with a single object selected - should be marked as read if the secondary work
         * is visible.
         */
        $scope.$watch( 'showSecondaryWorkArea', function( a, b ) {
            if( a !== b && $scope.modelObjects && $scope.modelObjects.length === 1 && $scope.showSecondaryWorkArea ) {
                //If the secondary work area becomes visible and a single object is selected
                //Mark the message as read
                awMessageSvc.setViewedByMeIfNeeded( $scope.modelObjects[ 0 ] );
            }
        } );

        /**
         * Update the primary work area selection
         *
         * @function updatePrimarySelection
         * @memberOf NgControllers.NativeSubLocationCtrl
         *
         * @param {ViewModelObject[]} selection - The new selection
         */
        var _updatePrimarySelection = $scope.updatePrimarySelection;
        $scope.updatePrimarySelection = function( selection ) {
            //Do the parent update which updates the current model objects
            _updatePrimarySelection( selection );
            // If the object is selected from the primary work area and it is not read before than mark the message object as read.
            // If the selected message object is already read than do nothing.
            if( selection.length === 1 && selection[ 0 ].props.fnd0MessageReadFlag ) {
                awMessageSvc.setViewedByMeIfNeeded( selection[ 0 ] );
            }
        };
    }
] );
