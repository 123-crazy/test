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
 * Defines the {@link NgControllers.RecentSearchSubLocationCtrl}
 * 
 * @module js/aw.recentSearch.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/aw.base.sublocation.controller
 * @requires js/aw-sublocation.directive
 */
import app from 'app';
import ngModule from 'angular';
import 'js/aw.base.sublocation.controller';
import 'js/aw-sublocation.directive';

'use strict';

/**
 * Recent Search sublocation controller.
 * 
 * @class RecentSearchSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'RecentSearchSubLocationCtrl', [ '$scope', '$controller', function( $scope, $controller ) {

    var ctrl = this;

    //DefaultSubLocationCtrl will handle setting up context correctly
    ngModule.extend( ctrl, $controller( 'BaseSubLocationCtrl', {
        $scope: $scope
    } ) );

} ] );
