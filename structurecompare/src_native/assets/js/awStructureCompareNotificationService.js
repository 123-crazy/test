// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */
/**
 * @module js/awStructureCompareNotificationService
 */
import app from 'app';
import 'js/appCtxService';

var exports = {};
var _notificationCounter = 0;

export let resetNotificationCounter = function() {
    _notificationCounter = 0;
};

/**
 * Open compare location from notification object.
 *
 */

/**
 * @member awStructureCompareNotificationService
 */

export default exports = {
    resetNotificationCounter
};
app.factory( 'awStructureCompareNotificationService', () => exports );
