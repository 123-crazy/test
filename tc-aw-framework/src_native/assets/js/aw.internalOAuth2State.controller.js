// Copyright (c) 2020 Siemens

/**
 * This module contains a controller that updates sessionManager about Successful authentication so
 *  that session manager could complete its execution pipe line.
 *
 * @module js/aw.internalOAuth2State.controller
 * @class aw.internalOAuth2State.controller
 * @memberOf angular_module
 */
import app from 'app';
import 'js/sessionManager.service';

app.controller( 'internalOAuth2StateController', [
    'sessionManagerService',
    function( sessionMgr ) {
        sessionMgr.authenticationSuccessful();
    }
] );
