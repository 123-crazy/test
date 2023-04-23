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
 * Defines the {@link NgControllers.ClassificationSubLocationCtrl}
 *
 * @module js/aw.classification.sublocation.controller
 * @requires app
 * @requires angular
 * @requires js/eventBus
 * @requires js/aw.native.location.controller
 * @requires js/appCtxService
 */
import app from 'app';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import $ from 'jquery';
import 'js/aw.native.sublocation.controller';
import 'js/appCtxService';


/**
 * Search sublocation controller.
 *
 * @class ClassificationSubLocationCtrl
 * @param $scope {Object} - Directive scope
 * @param $controller {Object} - $controller service
 * @memberOf NgControllers
 */
app.controller( 'ClassificationSubLocationCtrl', [ '$scope', '$state', '$q', '$controller', 'appCtxService',
    'commandService',
    function( $scope, $state, $q, $controller, appCtxService, commandService ) {
        var ctrl = this;

        //DefaultSubLocationCtrl will handle setting up context correctly
        ngModule.extend( ctrl, $controller( 'NativeSubLocationCtrl', {
            $scope: $scope
        } ) );

        commandService.executeCommand( 'Awp0ClassificationSearchNavigate', null, $scope );
    }
] );
