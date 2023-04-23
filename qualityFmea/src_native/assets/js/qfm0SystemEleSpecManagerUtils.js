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
 * This file is used as utility file for System Element Specification manager from quality center foundation module
 *
 * @module js/qfm0SystemEleSpecManagerUtils
 */
import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';
import messagingSvc from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import viewModelObjectService from 'js/viewModelObjectService';
import editHandlerSvc from 'js/editHandlerService';
import qfm0SpecificationUtils from 'js/qfm0SpecificationUtils';
import _ from 'lodash';

var exports = {};

var saveHandler = {};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * Call the SOA createSpecificationVersion for modified Object in data Source
 *
 * @param {datasource} datasource viewModel of view
 * @returns {promise} promise when all modified Function Specification properties get saved
 */
saveHandler.saveEdits = function( dataSource ) {
    var deferred = AwPromiseService.instance.defer();
    var vmo = dataSource.getDeclViewModel().vmo;
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var input = {};
    input.specificationInputs = qfm0SpecificationUtils.getVersionInput( dataSource, vmo );
    qfm0SpecificationUtils.callVersioningSoa( input ).then( function( newSpecification ) {
        deferred.resolve( newSpecification );
        if( vmo.uid === appCtxService.ctx.selected.uid ) {
            qfm0SpecificationUtils.setEditedObjectInContextAndReset( newSpecification, activeEditHandler );
        } else {
            qfm0SpecificationUtils.setEditedObjectInContextAndReset( appCtxService.ctx.selected, activeEditHandler );
        }
    }, function( err ) {
        deferred.resolve();
    } );
    return deferred.promise;
};

/**
 * Call the SOA createSpecificationVersion for modified Object in data Source
 *
 * @returns {promise} promise when all modified System Specification properties get saved
 */
export let saveEditsInSysEleSpec = function() {
    var deferred = AwPromiseService.instance.defer();
    var editedVmo = appCtxService.ctx.selected;
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var input = {};
    input.specificationInputs = qfm0SpecificationUtils.getVersionInput( dataSource, editedVmo );
    qfm0SpecificationUtils.callVersioningSoa( input ).then( function( newSpecification ) {
        deferred.resolve( newSpecification );
        qfm0SpecificationUtils.setEditedObjectInContextAndReset( newSpecification, activeEditHandler );
    }, function( err ) {
        activeEditHandler.cancelEdits();
        deferred.resolve();
    } );
    return deferred.promise;
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
saveHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if( modifiedPropCount === 0 ) {
        return false;
    }
        return true;
};

/**
 * Save show inactive/active System Element Specifications flag in context to show the objects in the tree based on configuration.
 * @param {data} data  The view model data
 */
export let setToggleInputToSystemEleSpecCtx = function( data ) {
    var showInactive = {};
    showInactive.showInactive = data.showInactiveSystemEleSpec.dbValue;
    appCtxService.updateCtx( 'systemEleSpecManagerContext', showInactive );
};

/**
 * This makes sure, edited object is selected
 * @param {data} data
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let processPWASelection = function( data, selectionModel ) {
    var selectedModelObject = appCtxService.ctx.systemEleSpecManagerContext.selectedNodes;
    if( data.systemEleSpecList.objects.length > 0 && selectedModelObject && selectedModelObject.length > 0 ) {
        _.forEach( selectedModelObject, function( selectedObject ) {
            if( selectedObject.props.qc0Status === undefined && selectedObject.props.qfm0Status.dbValues[0] === '1' || selectedObject.props.qc0Status !== undefined && selectedObject.props.qc0Status.dbValues[0] === '1' || appCtxService.ctx.systemEleSpecManagerContext.showInactive === true ) {
                selectionModel.addToSelection( selectedObject );
            } else if( ( selectedObject.props.qc0Status === undefined && selectedObject.props.qfm0Status.dbValues[0] === '0' || selectedObject.props.qc0Status !== undefined && selectedObject.props.qc0Status.dbValues[0] === '0' ) &&
                ( appCtxService.ctx.systemEleSpecManagerContext.showInactive === false || appCtxService.ctx.systemEleSpecManagerContext.showInactive === undefined ) ) {
                selectionModel.setSelection( [] );
            }
        } );
    } else if( !selectedModelObject ||  selectedModelObject && selectedModelObject.length === 0  ) {
        selectionModel.setSelection( [] );
    }
    if( selectionModel.getSelection().length === 0 || selectionModel.getSelection().length > 1 ) {
        var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand && toolsAndInfoCommand.commandId === 'qfm0ObjectInfo' ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
    }
};

/**
 * This wll close any tools and info panel if any open
 * @param {ArrayList} selectionModel selection model of pwa
 */
export let selectionChanged = function( data, selectionModel ) {
    var selectedNodes = data.eventData.selectedObjects;
    if( selectedNodes.length > 0 ) {
        if( appCtxService.ctx.systemEleSpecManagerContext === undefined ||
            appCtxService.ctx.systemEleSpecManagerContext === '' ) {
            appCtxService.ctx.systemEleSpecManagerContext = {};
        }
        appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = selectedNodes;
    }
    var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
    if( toolsAndInfoCommand && toolsAndInfoCommand.commandId === 'qfm0AddSystemEleSpec' ) {
        eventBus.publish( 'awsidenav.openClose', {
            id: 'aw_toolsAndInfo',
            commandId: toolsAndInfoCommand.commandId
        } );
    }
    if( selectionModel.getSelection().length === 0 || selectionModel.getSelection().length > 1 ) {
        if( selectionModel.getSelection().length === 0 ) {
            appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = [];
        }
        var toolsAndInfoCommand = appCtxService.getCtx( 'activeToolsAndInfoCommand' );
        if( toolsAndInfoCommand && toolsAndInfoCommand.commandId === 'qfm0ObjectInfo' ) {
            eventBus.publish( 'awsidenav.openClose', {
                id: 'aw_toolsAndInfo',
                commandId: toolsAndInfoCommand.commandId
            } );
        }
    }
};

export let selectNewlyAddedElement = function( data ) {
    appCtxService.ctx.systemEleSpecManagerContext = {};
    appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = [];
    if( data.pinnedToForm.dbValue ) {
        appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = data.selectedNodes;
    }
};

export default exports = {
    getSaveHandler,
    saveEditsInSysEleSpec,
    setToggleInputToSystemEleSpecCtx,
    processPWASelection,
    selectionChanged,
    selectNewlyAddedElement
};
app.factory( 'qfm0SystemEleSpecManagerUtils', () => exports );
