// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
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
 * @module js/Caw0RemoveSymptomDefectCommandHandler
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';

var exports = {};
var _removeObjects = null;

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
        _removeObjects = [ vmo ];
        appCtxSvc.registerCtx( 'Caw0RemovedDefect', _removeObjects );

        eventBus.publish( 'Caw0RemoveSymptomDefectCommand.removeSymptomDefect' );
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
app.factory( 'Caw0RemoveSymptomDefectCommandHandler', () => exports );
