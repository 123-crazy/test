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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0AddSignoffCommandHandler
 */
import app from 'app';
import $ from 'jquery';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} signoffAction - Signoff action string that needs to be used to add the signoff
 * @param {Object} originType - Origin type string string that needs to be used to add the signoff
 */
export let execute = function( vmo, signoffAction, originType ) {

    var eventData = {
        selectedProfile: vmo,
        signoffAction: signoffAction,
        originType: originType
    };

    // Fire the event to add the signoff with input details
    eventBus.publish( "Awp0AddSignoff.addSignoffData", eventData );
};

/**
 * Set command context for show object cell command which evaluates isVisible and isEnabled flags
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
};

export default exports = {
    execute,
    setCommandContext
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Awp0AddSignoffCommandHandler', () => exports );
