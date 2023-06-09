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
 * @module js/Saw1RemoveBaselineCellCommandHandler
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import smConstants from 'js/ScheduleManagerConstants';

var exports = {};
var _assignBaselines = null;

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
        _assignBaselines = vmo;
        let scheduleNavigationCtx = appCtxSvc.getCtx( 'scheduleNavigationCtx' );
        let selectedBaselines = scheduleNavigationCtx.selectedBaselines;
        let baselineIndex = _.findIndex( selectedBaselines, function( obj ) { return obj.uid === vmo.uid; } );
        selectedBaselines.splice( baselineIndex, 1 );
        scheduleNavigationCtx.selectedBaselines = selectedBaselines;
        appCtxSvc.updateCtx( 'scheduleNavigationCtx', scheduleNavigationCtx );
    }
    eventBus.publish( 'Saw1RemoveBaselineCommand.removeBaseline' );
};

/**
 * Remove User .Called when clicked on the remove cell.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let removeBaseline = function( data ) {
    data.saw1viewBtn = true;
    removeFromViewingBaseline( data, _assignBaselines );
    var updateAvailableList = data.dataProviders.getBaselines.viewModelCollection.loadedVMObjects;
    if( _assignBaselines.cellDecoratorStyle ) {
        _assignBaselines.cellDecoratorStyle = smConstants.VIEW_BASELINE_DECORATOR_STYLE[ 'None' ];
    }
    updateAvailableList.push( _assignBaselines );
    data.dataProviders.getBaselines.update( updateAvailableList );
    data.visibleSaveBtn = true;
};

/**
 * Method to remove Users from available section of panel
 *
 * @param {data} data - The qualified data of the viewModel
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
function removeFromViewingBaseline( data, vmo ) {
    var removeBaselineUid = [];
    removeBaselineUid.push( vmo.uid );
    var memberModelObjects = data.dataProviders.selectedBaseline.viewModelCollection.loadedVMObjects;

    var modelObjects = $.grep( memberModelObjects, function( eachObject ) {
        return $.inArray( eachObject.uid, removeBaselineUid ) === -1;
    } );

      // update decorator
      let idx = _.findIndex( memberModelObjects, function( obj ) { return obj.uid === vmo.uid; } );
      
        idx >=0 ? (modelObjects.length > 0 ? modelObjects[0].cellDecoratorStyle = smConstants.VIEW_BASELINE_DECORATOR_STYLE[0] : '' ) : '';

    data.dataProviders.selectedBaseline.update( modelObjects );
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
    removeBaseline,
    setCommandContext
};

export default exports;

/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0NameValueCreate
 */
app.factory( 'Saw1RemoveBaselineCellCommandHandler', () => exports );
