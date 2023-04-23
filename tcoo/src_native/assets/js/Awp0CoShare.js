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
 * @module js/Awp0CoShare
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * This method will check for fnd0ParentTask proeprty is not null for input model object.
 *
 * @param {object} modelObject - the Object for property need to check
 *
 * @return {boolean} True or false based on property value is loaded or not
 */
var _isParentTaskPropLoaded = function( modelObject ) {
    // Check for input model object is not null and parent task proeprty is loaded then only return true
    // else return false
    if( modelObject && modelObject.props.fnd0ParentTask && modelObject.props.fnd0ParentTask.dbValues ) {
        return true;
    }
    return false;
};

/**
 * This method will update the context that needed for Add reviewer command and open the panel.
 *
 * @param {object} modelObject - the Object for command needs to open
 */
var _updateShareContext = function( modelObject ) {
    var context = {
        selectedObject: modelObject,
        'loadProjectData': false,
        selectionModelMode: 'multiple'
    };

    appCtxSvc.registerCtx( 'workflow', context );
    commandPanelService.activateCommandPanel( 'Awp0CoShare', 'aw_toolsAndInfo' );
};

/**
 * Get the valid selection that need to be used to add the signoff and refresh furhter
 *
 * @param {object} ctx - the ctx Object
 *
 */
export let setContextVariableForShare = function( ctx ) {
    // Check if ctx is undefined then return from here
    if( !ctx ) {
        return;
    }

    var activeCommand = appCtxSvc.getCtx( 'activeToolsAndInfoCommand' );
    if( activeCommand && activeCommand.commandId === 'Awp0CoShare' ) {
        commandPanelService.activateCommandPanel( 'Awp0CoShare', 'aw_toolsAndInfo' );
        return;
    }

    var validSelection = ctx.selected;

    if( ctx && ctx.pselected ) {
        validSelection = ctx.pselected;
    }

    // Check for selection is of type signoff and check it's parent task property is loaded
    // or not. If property is not loaded then load the property and bring the panel otherwise
    // bring the panel
    if( validSelection &&  validSelection.modelType.typeHierarchyArray.indexOf( 'Signoff' ) > -1  &&
        !_isParentTaskPropLoaded() ) {
        dmSvc.getPropertiesUnchecked( [ validSelection ], [ 'fnd0ParentTask' ] ).then( function() {
            var modelObject = cdm.getObject( validSelection.uid );
            _updateShareContext( modelObject );
        } );
        return;
    }
    _updateShareContext( validSelection );
};

export default exports = {
    setContextVariableForShare
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0CoShare
 */
app.factory( 'Awp0CoShare', () => exports );
