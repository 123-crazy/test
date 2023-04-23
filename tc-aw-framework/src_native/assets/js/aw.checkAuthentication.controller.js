// Copyright (c) 2020 Siemens

/**
 * This module contains a controller that handles checking authentication
 *
 * @module js/aw.checkAuthentication.controller
 * @class aw.checkAuthentication.controller
 * @memberOf angular_module
 */
import app from 'app';
import 'js/sessionManager.service';

app.controller( 'CheckAuthentication', [
    '$q', '$scope', '$injector', 'authenticator', 'sessionManagerService',
    function( $q, $scope, $injector, authenticator, sessionMgr ) {
        if( authenticator ) {
            authenticator.setScope( $scope, $injector );
            sessionMgr.resetPipeLine();
            authenticator.authenticate( $q ).then( function() {
                sessionMgr.authenticationSuccessful();
            } );
        }
    }
] );
