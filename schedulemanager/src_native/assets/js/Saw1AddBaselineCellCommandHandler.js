// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */
/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Saw1AddBaselineCellCommandHandler
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import smConstants from 'js/ScheduleManagerConstants';

var exports = {};
var _assignBaseline = null;

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
        _assignBaseline = vmo;

        let scheduleNavigationCtx = appCtxSvc.getCtx( 'scheduleNavigationCtx' );
        if( scheduleNavigationCtx.selectedBaselines.length < 2 ) {
            scheduleNavigationCtx.selectedBaselines.push( vmo );
            appCtxSvc.updateCtx( 'scheduleNavigationCtx', scheduleNavigationCtx );
            eventBus.publish( 'Saw1BaselineCommand.addBaseline' );
        }
    }
};

/**
 * Add Baseline .Called when clicked on the add cell.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let addBaseline = function( data ) {
    data.saw1viewBtn = true;
    var updateBaselineList = data.dataProviders.selectedBaseline.viewModelCollection.loadedVMObjects;

    removeFromAvailableBaseline( data, _assignBaseline );
    // set decorator
    let scheduleNavigationCtx = appCtxSvc.getCtx( 'scheduleNavigationCtx' );
    if( _.isEmpty( scheduleNavigationCtx.selectedBaselines ) ) // first time add
    {
        _assignBaseline.cellDecoratorStyle = smConstants.VIEW_BASELINE_DECORATOR_STYLE[ 0 ];
    } else {
        let idx = _.findIndex( scheduleNavigationCtx.selectedBaselines, function( obj ) { return obj.uid === _assignBaseline.uid; } );
        _assignBaseline.cellDecoratorStyle = smConstants.VIEW_BASELINE_DECORATOR_STYLE[ idx ];
    }
    updateBaselineList.push( _assignBaseline );
    data.dataProviders.selectedBaseline.update( updateBaselineList );
    data.visibleSaveBtn = true;
};

/**
 * Method to remove  Baseline from available section of panel
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
function removeFromAvailableBaseline( data, vmo ) {
    var assignedBaselineUid = [];
    assignedBaselineUid.push( vmo.uid );
    var availModelObjects = data.dataProviders.getBaselines.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( availModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, assignedBaselineUid ) === -1;
    } );

    data.dataProviders.getBaselines.update( modelObjects );
}

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

exports = {
    execute,
    addBaseline,
    setCommandContext
};

export default exports;
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Saw1AddBaselineCellCommandHandler', () => exports );
