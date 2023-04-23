// @<COPYRIGHT>@
// ==================================================
// Copyright 2016.
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
 * @module js/detachLicenseCellCommandHandler
 */
import app from 'app';
import _ from 'lodash';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * Execute the detach command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 * 
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Boolean} openInEditMode - Flag to indicate whether to open in edit mode.
 */
export let execute = function( vmo ) {

    if( vmo && vmo.uid ) {
        var context = {
            "selectedLicenses": [ vmo ]
        };

        eventBus.publish( "awSecurity.selectLicenseForDetach", context );
    }
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
app.factory( 'detachLicenseCellCommandHandler', () => exports );
