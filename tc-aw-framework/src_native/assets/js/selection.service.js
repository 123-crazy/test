// Copyright (c) 2020 Siemens

/**
 * Defines {@link NgServices.selectionService} which helps manage selection.
 *
 * @module js/selection.service
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxService from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectSrv from 'js/viewModelObjectService';
import _ from 'lodash';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

let exports = {}; // eslint-disable-line no-invalid-this

/**
 * selection name space
 */
var _selected = 'selected';

/**
 * multi selection name space
 */
var _mselected = 'mselected';

/**
 * parent selection name space
 */
var _pselected = 'pselected';

/**
 * relation info name space
 */
var _relationInfo = 'relationContext';

export let updateSelection = function( selection, parentSelection, relationInformation ) {
    var currentSelection = exports.getSelection();

    var rInfo = relationInformation ? {
        relationInfo: relationInformation
    } : undefined;

    var singleSelection = null;
    var multiSelection = [];
    if( _.isArray( selection ) ) {
        singleSelection = selection[ 0 ];
        for( var i = 0; i < selection.length; i++ ) {
            multiSelection.push( selection[ i ] );
        }
    } else if( selection ) {
        singleSelection = selection;
        multiSelection = [ selection ];
    }

    var contextChanged = false;
    if( !currentSelection.selected || !ngModule.equals( singleSelection, currentSelection.selected[ 0 ] ) ) {
        appCtxService.registerCtx( _selected, singleSelection );
        contextChanged = true;
    }
    if( !ngModule.equals( multiSelection, currentSelection.selected ) ) {
        appCtxService.registerCtx( _mselected, multiSelection );
        contextChanged = true;
    }
    if( !ngModule.equals( parentSelection, currentSelection.parent ) ) {
        appCtxService.registerCtx( _pselected, parentSelection );
        contextChanged = true;
    }
    if( !ngModule.equals( rInfo, currentSelection.relationInfo ) ) {
        appCtxService.registerCtx( _relationInfo, rInfo );
        contextChanged = true;
    }

    if( contextChanged ) {
        return exports.updateCommandContext();
    }
    return AwPromiseService.instance.resolve();
};

export let getSelection = function() {
    return {
        selected: appCtxService.getCtx( _mselected ),
        parent: appCtxService.getCtx( _pselected ),
        relationInfo: appCtxService.getCtx( _relationInfo )
    };
};

export let getAlternateSelectedObjects = function( propObjects ) {
    var modelObjects = [];
    var uidsToLoad = [];

    if( propObjects ) {
        _.forEach( propObjects, function( property ) {
            if( property && property.dbValues ) {
                _.forEach( property.dbValues, function( dbValue ) {
                    var modelObject = cdm.getObject( dbValue );
                    if( modelObject && !_.isEmpty( modelObject.props ) ) {
                        modelObjects.push( modelObject );
                    } else {
                        uidsToLoad.push( dbValue );
                    }
                } );
            }
        } );

        if( !_.isEmpty( uidsToLoad ) ) {
            _.forEach( uidsToLoad, function( uid ) {
                var modelObject = cdm.getObject( uid );
                modelObjects.push( modelObject );
            } );
        }
    }

    return modelObjects;
};

export let updateCommandContext = function() {
    return AwPromiseService.instance.resolve();
};

exports = {
    updateSelection,
    getSelection,
    getAlternateSelectedObjects,
    updateCommandContext
};
export default exports;
/**
 * Set of utility functions to manage selection
 *
 * @member selectionService
 * @memberof NgServices
 *
 * @param {AwPromiseService.instance} AwPromiseService.instance - Service to use.
 * @param {appCtxService} appCtxService - Service to use.
 * @param {soa_kernel_clientDataModel} cdm - Service to use.
 */
/**
 * Update the selection context
 *
 * @function updateSelection
 * @memberOf NgServices.selectionService
 *
 * @param {Object | Object[]} selection - The new selection
 * @param {Object} parentSelection - The new parent selection
 * @param {Object[]} relationInformation - The new relation information
 *
 * @return {Promise} A promise resolved once selection and command context are updated.
 */
/**
 * Get the selection from the context
 *
 * @function getSelection
 * @memberOf NgServices.selectionService
 *
 * @return {Object} An object containing the selection and the parent selection
 */
/**
 * Returns the model objects based off input property objects
 *
 * @function getTargetModelObjects
 * @memberOf NgServices.selectionService
 *
 * @param {Array} propObjects - array of property objects
 *
 * @return {Array} array of alternate selected model objects containing the results
 */
/**
 * Update the command context
 *
 * @function updateCommandContext
 * @memberOf NgServices.selectionService
 *
 * @return {Promise} A promise resolved once command context is updated.
 */
app.factory( 'selectionService', () => exports );

eventBus.subscribe( 'cdm.modified', function( event ) {
    // Update the VMOs in context for the modified model objects
    var mSelectedInCtx = appCtxService.getCtx( _mselected );
    var selectedInCtx = appCtxService.getCtx( _selected );
    _.forEach( event.modifiedObjects, function _iterateModifiedObjects( updatedObj ) {
        _.forEach( mSelectedInCtx, function _updateAppCtxSelection( selectedObj ) {
            // Verifying the object is same. Also, we need to ensure that object is a View Model object.
            // For model objects, the data binding should be handled already. So we don't need this
            if( updatedObj.uid === selectedObj.uid && viewModelObjectSrv.isViewModelObject( selectedObj ) ) {
                var updatedVmo = viewModelObjectSrv.createViewModelObject( updatedObj, 'EDIT' );

                if( updatedVmo && updatedVmo.props ) {
                    viewModelObjectSrv.updateSourceObjectPropertiesByViewModelObject( updatedVmo, mSelectedInCtx );
                    // No need for object name check here because if 'mselected' is a VMO, 'selected' has to be VMO
                    if( selectedInCtx.uid === selectedObj.uid ) {
                        viewModelObjectSrv.updateSourceObjectPropertiesByViewModelObject( updatedVmo, [ selectedInCtx ] );
                    }
                }
            }
        } );
    } );
} );
