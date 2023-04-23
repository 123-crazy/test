// Copyright (c) 2021 Siemens

/**
 * Note: Many of the the functions defined in this module return a {@linkcode module:angujar~Promise|Promise} object.
 * The caller should provide callback function(s) to the 'then' method of this returned object (e.g. successCallback,
 * [errorCallback, [notifyCallback]]). These methods will be invoked when the associated service result is known.
 *
 * @module soa/sessionService
 */
// NOTE this service is very aw specific which can be moved to aw side

import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import eventBus from 'js/eventBus';
import awConfiguration from 'js/awConfiguration';
import viewModelObjectSvc from 'js/viewModelObjectService';
import localStrg from 'js/localStorage';

let exports;
const api = {
    signIn: {
        namespace: 'Core-2011-06-Session',
        method: 'login'
    },
    signOut: {
        namespace: 'Core-2006-03-Session',
        method: 'logout'
    },
    setUserSessionState: {
        namespace: 'Core-2015-10-Session',
        method: 'setUserSessionStateAndUpdateDefaults'
    },
    setUserSessionStateWithoutDefaults: {
        namespace: 'Core-2007-12-Session',
        method: 'setUserSessionState'
    }
};

/**
 * Local Storage key for session descriminator
 */
const SESSION_DISCRIMINATOR_KEY = 'sessionDiscriminator';

export const loadConfiguration = function() {
    /**
     * registering the context when app context is getting initialize by GWT or by any module
     */
    const awUser = cdm.getUser();
    const awUserSession = cdm.getUserSession();

    appCtxSvc.registerCtx( 'user', awUser );
    appCtxSvc.registerCtx( 'userSession', awUserSession );
    appCtxSvc.registerCtx( 'defaultRoutePath', awConfiguration.get( 'defaultRoutePath' ) );

    /**
     * updating the context for sign out and sign in with other user
     */
    eventBus.subscribe( 'session.updated', () => {
        const awUser = cdm.getUser();
        const awUserSession = viewModelObjectSvc.createViewModelObject( cdm.getUserSession() );

        appCtxSvc.registerCtx( 'user', awUser );
        appCtxSvc.registerCtx( 'userSession', awUserSession );
    }, 'soa_sessionService' );
};

/**
 * Sign In to server
 *
 * @param {String} username - The username to sing in with.
 * @param {String} password - The password for the given username (if not supplied, username assumed as password)
 * @param {String} group - The user's group to sign into (if undefined, empty string assumed)
 * @param {String} role - The user's role to sign into (if undefined, empty string assumed)
 * @param {String} locale -
 * @param {String} sessionDiscriminator -
 * @param {Bool} ignoreHosting - Flag to say ignore hosting when making soa call.
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export const signIn = function( username, password, group, role, locale, sessionDiscriminator, ignoreHosting ) {
    const body = {
        credentials: {
            user: username,
            password: password,
            group: group,
            role: role,
            locale: locale,
            descrimator: sessionDiscriminator ? sessionDiscriminator : 'AWJSK3'
        }
    };
    return soaSvc.postUnchecked( api.signIn.namespace, api.signIn.method, body, {}, ignoreHosting );
};

/**
 * Sign out from server
 *
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export const signOut = function() {
    return soaSvc.postUnchecked( api.signOut.namespace, api.signOut.method, {}, {} ).then( response => {
        soaSvc.setSessionInfo( true );
        // both SSO and UserPw call this, so fire the event here.
        eventBus.publish( 'session.signOut', {} );
        localStrg.removeItem( SESSION_DISCRIMINATOR_KEY );
        return response;
    } );
};

/**
 * Set User Session State.
 *
 * @param {Array} pairs - Array of Name-Value pair objects
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export const setUserSessionState = function( pairs ) {
    return soaSvc.post( api.setUserSessionState.namespace, api.setUserSessionState.method, {
        pairs: pairs
    } ).then( response => {
        soaSvc.setSessionInfo();
        // With a successful change in session, we force a reload for security concerns & memory leaks.
        location.reload( false );
        return response;
    } );
};

/**
 * Set User Session State without affecting default values.
 *
 * @param {Array} pairs - Array of Name-Value pair objects
 * @returns {Promise} This promise will be 'resolved' or 'rejected' when the service is invoked and its response
 *          data is available.
 */
export const setUserSessionStateWithoutDefaults = function( pairs ) {
    return soaSvc.post( api.setUserSessionStateWithoutDefaults.namespace,
        api.setUserSessionStateWithoutDefaults.method, {
            pairs: pairs
        } ).then( response => {
        soaSvc.setSessionInfo();
        // With a successful change in session, we force a reload for security concerns & memory leaks.
        location.reload( false );
        return response;
    } );
};

loadConfiguration();

exports = {
    SESSION_DISCRIMINATOR_KEY,
    signIn,
    signOut,
    setUserSessionState,
    setUserSessionStateWithoutDefaults
};
export default exports;

/**
 * @memberof NgServices
 * @member soa_sessionService
 *
 * @param {soa_kernel_soaService} soaSvc - SOA service
 * @param {soa_kernel_clientDataModel} cdm - Client Data Model service
 * @param {appCtxService} appCtxSvc - Application Context service
 *
 * @returns {soa_sessionService} Ref to this service.
 */
app.factory( 'soa_sessionService', () => exports );
