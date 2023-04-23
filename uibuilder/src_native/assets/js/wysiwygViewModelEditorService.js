// Copyright (c) 2020 Siemens

/**
 * @module js/wysiwygViewModelEditorService
 */
import app from 'app';
import wygVMEditUtilsSvc from 'js/wysiwyg-view-editorUtils.service';
import wysiwygLoadAndSaveService from 'js/wysiwygLoadAndSaveService';
import _ from 'lodash';

var exports = {};

export let updateMasterViewModel = function( data ) {
    wysiwygLoadAndSaveService.updateViewModel( data.eventData.content );
};

export let setViewModelEditorValue = function( data ) {
    var declViewModelId = wysiwygLoadAndSaveService.getCurrentPanelId();
    if( declViewModelId ) {
        wysiwygLoadAndSaveService.getViewModelData().then( function( viewModel ) {
            viewModel = !viewModel ? wygVMEditUtilsSvc.getViewModelTemplate() : viewModel;
            data.viewModelSrc.data = JSON.stringify( viewModel, null, '\t' );
        } );
    }
};

export let redrawVMEditor = function( data ) {
    var newViewModelJSON = wygVMEditUtilsSvc.generateViewModel( data.editorModel.htmlModel );
    var currentViewModelJSON = _.isObject( data.viewModelSrc.data ) ? data.viewModelSrc.data : JSON.parse( data.viewModelSrc.data );
    mergeViewModels( newViewModelJSON, currentViewModelJSON );
    data.viewModelSrc.data = JSON.stringify( currentViewModelJSON, null, '\t' );
    wysiwygLoadAndSaveService.updateViewModel( currentViewModelJSON );
};

var mergeViewModels = function( newVMJSON, currentVMJSON ) {
    currentVMJSON.imports = newVMJSON.imports;
    var sections = [ 'data', 'actions', 'dataProviders', 'i18n', 'messages', 'conditions' ];
    // Iterarte through the new View Model
    _.forEach( sections, function( section ) {
        var sectionObjs = newVMJSON[ section ];
        _.forOwn( sectionObjs, function( sectionObject, sectionName ) {
            // if entry exist, do not override it.
            // if entry does not exist, add it
            if( !currentVMJSON[ section ] ) {
                currentVMJSON[ section ] = {};
            }
            if( !currentVMJSON[ section ][ sectionName ] && sectionName !== '' ) {
                currentVMJSON[ section ][ sectionName ] = sectionObject;
            }
        } );
    } );
};

/**
 * @member wysiwygViewModelEditorService
 */

exports = {
    updateMasterViewModel,
    setViewModelEditorValue,
    redrawVMEditor
};
export default exports;
app.factory( 'wysiwygViewModelEditorService', () => exports );
