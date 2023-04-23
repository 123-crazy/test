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
 * Defines the {@link NgControllers.SubscriptionSettingsSubLocationCtrl}
 *
 * @module js/aw.subscriptionSettings.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.base.sublocation.controller
 * @requires js/aw-sublocation.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.base.sublocation.controller';
import 'js/aw-sublocation.directive';

/**
 * Subscription settings sublocation controller.
 *
 * @class SubscriptionSettingsSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'SubscriptionSettingsSubLocationCtrl', [ '$scope', '$controller', function( $scope, $controller ) {
    var ctrl = this;

    //BaseSubLocationCtrl will handle setting up context correctly
    ngModule.extend( ctrl, $controller( 'BaseSubLocationCtrl', {
        $scope: $scope
    } ) );
} ] );
