// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Defines the {@link NgControllers.GatewayLocationCtrl}
 *
 * @module js/aw.gateway.location.controller
 */
import * as app from 'app';
import ngModule from 'angular';
import 'js/configurationService';
import 'js/localeService';
import 'js/aw.default.location.controller';
import 'js/appCtxService';

/**
 * Gateway location controller. Extends the {@link NgControllers.DefaultLocationCtrl} with a location panel style
 * override and solution based header title.
 *
 * @class GatewayLocationCtrl
 * @memberOf NgControllers
 */
app.controller( 'GatewayLocationCtrl', [
    '$scope',
    '$controller',
    'configurationService',
    'localeService',
    'appCtxService',
    function( $scope, $controller, cfgSvc, localeService, appCtxSvc ) {
        ngModule.extend( this, $controller( 'DefaultLocationCtrl', {
            $scope: $scope
        } ) );

        /**
         * Override for the location panel style
         *
         * @member locationPanelStyle
         * @memberOf NgControllers.GatewayLocationCtrl
         */
        $scope.locationPanelStyle = 'aw-gateway-locationPanel';

        appCtxSvc.registerCtx( 'fullscreenDisabled', true );

        /**
         * Override for the header title
         *
         * @member headerTitle
         * @memberOf NgControllers.GatewayLocationCtrl
         */
        cfgSvc.getCfg( 'solutionDef' ).then(
            function( solution ) {
                if( solution && solution.browserTitle ) {
                    $scope.headerTitle = solution.browserTitle;
                } else {
                    localeService.getLocalizedText( 'UIMessages', 'browserTitle' ).then(
                        function( result ) {
                            $scope.headerTitle = result;
                        } );
                }
            } );

        $scope.$on( '$destroy', function() {
            appCtxSvc.registerCtx( 'fullscreenDisabled', false );
        } );
    }
] );
