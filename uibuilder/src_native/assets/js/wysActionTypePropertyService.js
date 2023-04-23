// Copyright (c) 2020 Siemens

/**
 * @module js/wysActionTypePropertyService
 */
import app from 'app';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';

var exports = {};

export let convertActionsToLovEntries = function( viewModelActions ) {
    var actionsList = _.get( viewModelActions, 'actions' );

    if( actionsList ) {
        return actionsList.map( action => {
            return {
                propInternalValue: action.id,
                propDisplayValue: action.id
            };
        } );
    }

    return [];
};

export let openActionBuilder = function( actionName, viewModelId ) {
    if( !viewModelId ) {
        viewModelId = 'Untitled';
    }
    window.open( browserUtils.getBaseURL() + '#/wysiwygActions?s_uid=' + actionName + '&viewModelId=' + viewModelId, '', '' );
};

export let createActionObj = ( viewModel, actionName ) => {
    if( !viewModel.actions ) {
        viewModel.actions = {};
    }
    let actionExists = _.get( viewModel, actionName );
    if( !actionExists && actionName ) {
        _.set( viewModel.actions, actionName, {} );
    }
};

exports = {
    convertActionsToLovEntries,
    openActionBuilder,
    createActionObj
};
export default exports;

app.factory( 'wysActionTypePropertyService', () => exports );
