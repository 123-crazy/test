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
 * @module js/selectLicenseCellCommandHandler
 */
import app from 'app';
import licenseMgmtService from 'js/licenseMgmtService';
import _ from 'lodash';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

var exports = {};
var _selectedLicenses = null;

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 * 
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let execute = function( vmo ) {

    if( vmo && vmo.uid ) {
        _selectedLicenses = vmo;

        eventBus.publish( "awp0Security.selectLicense" );
    }
};

/**
 * Add projects .Called when clicked on the add projects cell
 * <P>
 * 
 * @param {ViewModelObject} vmo - view model json object execution.
 * 
 */
export let selectLicense = function( data ) {
    licenseMgmtService.addToSelectedLicenses( data, _selectedLicenses );
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
    selectLicense,
    setCommandContext
};
/**
 * This service creates name value property
 * 
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'selectLicenseCellCommandHandler', () => exports );
