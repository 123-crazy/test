// Copyright (c) 2022 Siemens

/**
 * native impl for sessionContextService. This is native impl for the GWT component. This is core AW framework so it's
 * TC agnostic
 *
 * @module js/sessionContext.service
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import sessionService from 'soa/sessionService';
import localStrg from 'js/localStorage';
import soaSvc from 'soa/kernel/soaService';

let exports = {};

/**
 * module reference to client data model
 */

/**
 * The client version string - This value must match what is defined for clientVersion in web.xml.
 */
const _clientVersion = '10000.1.2';

/**
 * The user name of the authenticated user
 *
 * @return {String} user name if available else USER_NAME_NOTSET
 */
export let getUserName = function() {
    const userSession = cdm.getUserSession();
    if( userSession && userSession.props && userSession.props.user_id ) {
        return userSession.props.user_id.getDisplayValue();
    }
    return '';
};

/**
 * The current role of the logged in user
 *
 * @return {String} current role of the user if available else USER_ROLE_NOTSET
 */
export let getUserRole = function() {
    const userSession = cdm.getUserSession();
    if( userSession && userSession.props && userSession.props.role_name ) {
        return userSession.props.role_name.getDisplayValue();
    }
    return '';
};

/**
 * The current group of the logged in user
 *
 * @return {String} current group of the user if available else USER_GROUP_NOTSET
 */
export let getUserGroup = function() {
    const userSession = cdm.getUserSession();
    if( userSession && userSession.props && userSession.props.group ) {
        return userSession.props.group.getDisplayValue();
    }
    return '';
};

/**
 * locale of the logged in user if available else USER_LOCALE_NOTSET
 *
 * @return {String} locale
 */
export let getUserLocale = function() {
    const userSession = cdm.getUserSession();
    if( userSession && userSession.props && userSession.props.fnd0locale ) {
        return userSession.props.fnd0locale.getDisplayValue();
    }
    return '';
};

/**
 * Client session discriminator
 *
 * @return {String} clientSessionDiscriminator (if set)
 */
export let getSessionDiscriminator = function() {
    return localStrg.get( sessionService.SESSION_DISCRIMINATOR_KEY );
};

/**
 * Client identifier for this client
 *
 * @return {String} clientID
 */
export let getClientID = function() {
    return soaSvc.getClientIdHeader();
};

/**
 * Client version string
 *
 * @return {String} clientVersion
 */
export let getClientVersion = function() {
    return _clientVersion;
};

exports = {
    getUserName,
    getUserRole,
    getUserGroup,
    getUserLocale,
    getSessionDiscriminator,
    getClientID,
    getClientVersion
};
export default exports;
/**
 * Definition for the service.
 *
 * @member SessionContextService
 * @memberof NgServices
 *
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 *
 * @returns {SessionContextService} Reference to service API Object.
 */
app.factory( 'SessionContextService', () => exports );
