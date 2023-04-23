//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aw.subscription.settings.service
 */
import app from 'app';
import preferenceSvc from 'soa/preferenceService';
import appCtxService from 'js/appCtxService';
import soaSvc from 'soa/kernel/soaService';
import _ from 'lodash';

/** Preference Name of notification mode */
var SCM_NOTIFICATION_MODE = 'SCM_notification_mode'; //$NON-NLS-1$

/** Preference Name of periodic notification digest */
var SCM_NOTIFICATION_DIGEST = 'SCM_notification_digest'; //$NON-NLS-1$

/** Preference Name of newsfeed message purging threshold */
var SCM_NEWSFEED_PURGE_THRESHOLD = 'SCM_newsfeed_purge_threshold'; //$NON-NLS-1$

/**
 * When user-> profile page is loaded it will read the preference value and mark the checkbox true and false.
 */
export let loadPreference = function( data ) {
    if( appCtxService.ctx.preferences.SCM_notification_digest ) {
        data.usePeriodicDigest.dbValue = appCtxService.ctx.preferences.SCM_notification_digest[ 0 ] === '2';
    }
    soaSvc.postUnchecked( 'Administration-2012-09-PreferenceManagement', 'getPreferences', {
        preferenceNames: [ SCM_NEWSFEED_PURGE_THRESHOLD ],
        includePreferenceDescriptions: false
    }, {} ).then(
        function( result ) {
            if( result.response.length > 0 ) { // Preference Found
                data.isNewsfeedPurgeAvailable = true;
                var dbValue = '';
                var displayValue = '';
                if( result.response[ 0 ].values.values && result.response[ 0 ].values.values > 0 ) {
                    dbValue = result.response[ 0 ].values.values[ 0 ];
                    displayValue = dbValue;
                } else if( result.response[ 0 ].values.values < 0 ) {
                    displayValue = data.i18n.invalidConfigurationValueLabel;
                    dbValue = result.response[ 0 ].values.values[ 0 ];
                } else {
                    displayValue = data.i18n.keepAlwaysValueLabel;
                    dbValue = result.response[ 0 ].values.values ? result.response[ 0 ].values.values[ 0 ] : '';
                }
                data.newsfeedPurgeThreshold.dbValue = dbValue;
                data.newsfeedPurgeThreshold.uiValue = displayValue;
                appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold = [];
                appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold[ 0 ] = dbValue;
            } else { // Preference not found
                data.isNewsfeedPurgeAvailable = false;
            }
        } );
};

/**
 * Sets the purge threshold for newsfeed message preference
 * setPreferences2 to update the preference value.
 */
export let setNewsFeedPurgeThreshold = function( data ) {
    var prefValue = appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold;
    data.newsfeedPurgeError = '';

    if( prefValue && data.newsfeedPurgeThreshold.dbValue === prefValue[ 0 ] ) {
        return null;
    }
    if( data.newsfeedPurgeThreshold.validationCriteria[ 0 ] === null && (
            data.newsfeedPurgeThreshold.error === '' || data.newsfeedPurgeThreshold.error === null ) ) {
        if( data.newsfeedPurgeThreshold.dbValue === '' || data.newsfeedPurgeThreshold.dbValue === 0 ) {
            data.newsfeedPurgeThreshold.uiValue = data.i18n.keepAlwaysValueLabel;
        }
        appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold = [];
        appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold[ 0 ] = data.newsfeedPurgeThreshold.dbValue.toString();
        data.newsfeedPurgeError = '';
        return preferenceSvc.setStringValue( SCM_NEWSFEED_PURGE_THRESHOLD,
            appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold );
    }
    if( prefValue ) {
        data.newsfeedPurgeThreshold.error = null;
        data.newsfeedPurgeError = data.i18n.invalidConfigurationValueLabel;
        data.newsfeedPurgeThreshold.dbValue = prefValue[ 0 ];
        if( prefValue[ 0 ] === '' || prefValue[ 0 ] === 0 || prefValue[ 0 ] === '0' ) {
            data.newsfeedPurgeThreshold.uiValue = data.i18n.keepAlwaysValueLabel;
        } else if( prefValue[ 0 ] < 0 ) {
            data.newsfeedPurgeThreshold.uiValue = data.i18n.invalidConfigurationValueLabel;
        } else {
            data.newsfeedPurgeThreshold.uiValue = prefValue[ 0 ];
        }
    }
    return null;
};

/**
 * Resets the purge threshold for newsfeed message preference
 * On cancel Edits.
 */
export let resetNewsFeedPurgeThreshold = function( data ) {
    var prefValue = appCtxService.ctx.preferences.SCM_newsfeed_purge_threshold;
    data.newsfeedPurgeError = '';
    if( prefValue ) {
        data.newsfeedPurgeThreshold.dbValue = prefValue[ 0 ];
        if( prefValue[ 0 ] === '' || prefValue[ 0 ] === 0 || prefValue[ 0 ] === '0' ) {
            data.newsfeedPurgeThreshold.uiValue = data.i18n.keepAlwaysValueLabel;
        } else if( prefValue[ 0 ] < 0 ) {
            data.newsfeedPurgeThreshold.uiValue = data.i18n.invalidConfigurationValueLabel;
        } else {
            data.newsfeedPurgeThreshold.uiValue = prefValue[ 0 ];
        }
    }
};

/**
 * If user modifies the periodic digest settings than it will update the context value and make a SOA call
 * setPreferences2 to update the preference value.
 */
export let usePeriodicDigestClick = function( data ) {
    var usePeriodicDigestValue = data.usePeriodicDigest.dbValue;
    data.periodicDigest = '1';
    if( usePeriodicDigestValue === true ) {
        data.periodicDigest = '2';
    }
    preferenceSvc.getStringValue( SCM_NOTIFICATION_DIGEST ).then(
        function( prefValue ) {
            if( _.isNull( prefValue ) || _.isUndefined( prefValue ) || prefValue !== data.periodicDigest ) {
                appCtxService.ctx.preferences.SCM_notification_digest = [];
                appCtxService.ctx.preferences.SCM_notification_digest[ 0 ] = data.periodicDigest;
                return preferenceSvc.setStringValue( SCM_NOTIFICATION_DIGEST,
                    appCtxService.ctx.preferences.SCM_notification_digest );
            }
            return null;
        } );
};

/**
 * If user modifies the notification method than it will update the context value and make a SOA call
 * setPreferences2 to update the preference value.
 */
export let notificationModeUpdated = function( data ) {
    preferenceSvc.getStringValue( SCM_NOTIFICATION_MODE )
        .then(
            function( prefValue ) {
                if( _.isNull( prefValue ) || _.isUndefined( prefValue ) ||
                    prefValue !== data.notificationModes.dbValue ) {
                    appCtxService.ctx.preferences.SCM_notification_mode = [];
                    appCtxService.ctx.preferences.SCM_notification_mode[ 0 ] = data.notificationModes.dbValue;
                    return preferenceSvc.setStringValue( SCM_NOTIFICATION_MODE,
                        appCtxService.ctx.preferences.SCM_notification_mode );
                }
                return null;
            } );
};
const exports = {
    loadPreference,
    setNewsFeedPurgeThreshold,
    resetNewsFeedPurgeThreshold,
    usePeriodicDigestClick,
    notificationModeUpdated
};
export default exports;
/**
 * awSubscriptionSettingsService service utility
 *
 * @memberof NgServices
 * @member awSubscriptionSettingsService
 */
app.factory( 'awSubscriptionSettingsService', () => exports );
