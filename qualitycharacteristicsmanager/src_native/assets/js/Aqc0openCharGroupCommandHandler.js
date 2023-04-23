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
 * @module js/Aqc0openCharGroupCommandHandler
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import viewModelService from 'js/viewModelService';

var exports = {};

var _customAddSpecificationPanel = 'Aqc0LinkSpecToRepresentation';

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
    var declViewModel = getViewModel( $scope, true );
    declViewModel.selectedCharGroup = $scope.vmo;

    var context = {
        destPanelId: 'Aqc0ShowSpecificationsList',
        recreatePanel: true,
        supportGoBack: false
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Navigates from characteristics group to create representation panel
 * @param{ data } vmo - declarative viewmodel data
 */
export let navBackToMainPanel = function( data ) {
    data.activeView = 'Aqc0AddCharRepresentation';
    var context = {
        source: 'Aqc0AddSpecificationsToRepresentation'
    };
    eventBus.publish( 'complete.subPanel', context );
};

/**
 * Saves the selected specification on the data before navigating to the create representation panel
 * @param{ data } vmo - declarative viewmodel data
 */
export let selectSpecificationAndNavigateToMainPanel = function( data ) {
    data.activeView = 'Aqc0AddCharRepresentation';
    data.customPanelInfo[ _customAddSpecificationPanel ].selectedSpecificationObject = data.dataProviders.showSpecificationsListProvider.selectedObjects[ 0 ];
    data.selectedSpecificationObject = data.dataProviders.showSpecificationsListProvider.selectedObjects[ 0 ];
    var context = {
        source: 'Aqc0ShowSpecificationsList'
    };
    eventBus.publish( 'complete.subPanel', context );
};

export default exports = {
    setCommandContext,
    execute,
    navBackToMainPanel,
    selectSpecificationAndNavigateToMainPanel
};
app.factory( 'Aqc0openCharGroupCommandHandler', () => exports );

/**
 */
