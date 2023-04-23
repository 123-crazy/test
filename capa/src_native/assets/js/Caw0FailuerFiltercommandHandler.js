// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * This is the command handler for "Open Characteristics Group" cell command
 *
 * @module js/Caw0FailuerFiltercommandHandler
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import viewModelService from 'js/viewModelService';


import _localeSvc from 'js/localeService';
var resource = app.getBaseUrlPath() + '/i18n/CAW0CapaMessages';
var localTextBundle = _localeSvc.getLoadedText(resource);

var exports = {};
var _removeObjects = null;


/**
 * Set command context for "Open Characteristics Group" cell command
 *
 * @param {ViewModelObject} context - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 * @param {Object} $scope - scope object in which isVisible and isEnabled flags needs to be set.
 */
export let setCommandContext = function( context, $scope ) {
    $scope.cellCommandVisiblilty = true;
    if( $scope.cellCommandVisiblilty ) {
        setCommandTitle( $scope );
    }
};

var getViewModel = function( scope ) {
    return viewModelService.getViewModel( scope, true );
};

/**
 * @param {Object} scope - scope
 */
function setCommandTitle( scope ) {
    var declViewModel = getViewModel( scope, true );
    scope.command.title = declViewModel.i18n.openCharGroup;
}

/**
 * Execute the command.
 * @param{ ViewModelObject } vmo - view model object
 * @param{ scope } $scope object
 */
export let execute = function( vmo, $scope ) {
    $scope.ctx.selectedParentFailure = vmo;
    var context;
    if( $scope.ctx.panelContext && $scope.ctx.panelContext.destPanelId === 'Caw0ShowFirstLevelFailureList' ) {
        context = {
            destPanelId: 'Caw0ShowSecondLevelFailureList',
            recreatePanel: true,
            supportGoBack: true,
            title: localTextBundle.caw0Back
        };
    } else {
        context = {
            destPanelId: 'Caw0ShowFirstLevelFailureList',
            recreatePanel: true,
            supportGoBack: true,
            title: localTextBundle.caw0Back
        };
    }
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Execute the command.
 * <P>
 * The command context should be setup before calling isVisible, isEnabled and execute.
 *
 * @param {ViewModelObject} vmo - Context for the command used in evaluating isVisible, isEnabled and during
 *            execution.
 */
export let setContextRemoveFailure = function( vmo ) {
    if( vmo && vmo.uid ) {
        _removeObjects = [ vmo ];

        eventBus.publish( 'Caw0RemoveFailureCommand.removeFailure' );
    }
};

/**
 * Remove SymptomDefect .Called when clicked on the remove cell.
 *
 * @param {data} data - The qualified data of the viewModel
 */
export let removeFailure = function( data ) {
    var allLoadedObjects = data.dataProviders.getFailureProvider.viewModelCollection.getLoadedViewModelObjects();
    var remainObjects = _.difference( allLoadedObjects, _removeObjects );
    data.dataProviders.getFailureProvider.update( remainObjects, remainObjects.length );
    data.selectedFailureObjects = [];
};

export default exports = {
    setCommandContext,
    execute,
    setContextRemoveFailure,
    removeFailure
};
app.factory( 'Caw0FailuerFiltercommandHandler', () => exports );

/**
 */
