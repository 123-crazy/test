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

 * @module js/Apm0ApqpProgramMgtService
 */

import * as app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import soaSvc from 'soa/kernel/soaService';
import editHandlerService from 'js/editHandlerService';
import editHandlerFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import eventBus from 'js/eventBus';
import appCtxService from 'js/appCtxService';
import _selectionService from 'js/selection.service';
import 'jquery';

var exports = {};

var EDIT_HANDLER_CONTEXT_CONSTANT = 'NONE';

/**
 * Static XRT commands that should be active when the view model is visible.
 *
 */
var _staticXrtCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits',
    'Awp0CancelEdits'
];

/**
 * Returns the Sub Type for the Quality Action
 *
 * @member relationType
 */
function getSubtype( relationType ) {
    switch ( relationType ) {
        case 'Apm0ChecklistQualityActRel':
            return 'Checklist';
        case 'Apm0ChecklistQQualityActRel':
            return 'Checklist Question';
    }
}

export let addEditHandler = function( data ) {
    var ChecklistVmo;
    if( appCtxService.ctx.actionViewModel ) {
        var ChecklistObjectVmo = appCtxService.ctx.actionViewModel.viewModel;
        ChecklistVmo = appCtxService.ctx.ChecklistVmo;
        var dataProviders = Object.keys( ChecklistObjectVmo.dataProviders );
        for( var index = 0; index < dataProviders.length; index++ ) {
            ChecklistVmo.dataProviders[ dataProviders[ index ] ] = ChecklistObjectVmo.dataProviders[ dataProviders[ index ] ];
        }
        //create Edit Handler
        var editHandler = editHandlerFactory.createEditHandler( dataSourceService
            .createNewDataSource( {
                declViewModel: ChecklistVmo
            } ) );
        //registerEditHandler
        if( editHandler ) {
            editHandlerService.setEditHandler( editHandler, 'NONE' );
            editHandlerService.setActiveEditHandlerContext( 'NONE' );
            editHandler.startEdit();
        }
    } else {
        var editHandler = editHandlerService.getEditHandler( EDIT_HANDLER_CONTEXT_CONSTANT );
        editHandler.startEdit();
    }
};
export let getResetAssessmentRYGObject = function( ctx ) {
    let inputData = [];
    let rygObject = cdm.getObject( ctx.mselected[ 0 ].uid );
    inputData.push( rygObject );
    return [ {
        rygObject: inputData
    } ];
};

export let getCountOfOverrideRollUpRYGObject = function( response ) {
    if(response.plain) {
        return response.plain.length;
    } else {
        return 0;
    }
 };

 /**
 * Method for getting the selected object.
 *
 * @return {Object} _selectionService.getSelection().selected - The selected object
 */
export let getSelectedObjects = function() {
    return _selectionService.getSelection().selected;
};

/**
 * Method for getting the output.
 */
export let getOutputData = function () {
    let selectedObj = appCtxService.getCtx('selected');
    let pselectedObj = appCtxService.getCtx('pselected');
    if (selectedObj.type === "Apm0QualityChecklist") {
        appCtxService.updateCtx('selected', pselectedObj);
    }
};

export default exports = {
    addEditHandler,
    getResetAssessmentRYGObject,
    getCountOfOverrideRollUpRYGObject,
    getSelectedObjects,
    getOutputData
};
app.factory( 'Apm0ApqpProgramMgtService', () => exports );
