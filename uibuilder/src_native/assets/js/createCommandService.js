// Copyright (c) 2020 Siemens

/**
 * @module js/createCommandService
 */
import app from 'app';
import browserUtils from 'js/browserUtils';
import localeSvc from 'js/localeService';

// eslint-disable-next-line valid-jsdoc
/**
 * This service handles create command panel
 *
 * @member createCommandService
 * @memberof NgService
 */

/**
 * Setup to map labels to local names.
 */
var localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.openCommandPanel', true ).then( result => localeMap.openCommandPanel = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.displayMessage', true ).then( result => localeMap.displayMessage = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.navigateUrl', true ).then( result => localeMap.navigateUrl = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.emptyAction', true ).then( result => localeMap.emptyAction = result );
};

var exports = {};

export let createDefaultPanel = function( commandID ) {
    var request = {};
    request.method = 'PUT';
    request.url = browserUtils.getBaseURL() + 'darsi/views/' + commandID;
    request.data = {};
    request.data.html = exports.getDefaultHTML();
    request.data.model = exports.getDefaultViewModelData();
    request.withCredentials = false;
    return request;
};

export let getDefaultHTML = function() {
    return '<aw-command-panel><aw-panel-body></aw-panel-body><aw-panel-footer></aw-panel-footer></aw-command-panel>';
};

export let getDefaultViewModelData = function() {
    return {
        schemaVersion: '1.0.0',
        imports: [
            'js/aw-command-panel.directive',
            'js/aw-panel-body.directive',
            'js/aw-panel-footer.directive'
        ],
        data: {},
        actions: {},
        dataProviders: {},
        onEvent: [],
        i18n: {},
        messages: {},
        conditions: {}
    };
};

export let getDefaultActions = function() {
    return [ {
            propDisplayValue: localeMap.openCommandPanel,
            propInternalValue: 'CommandPanel'
        },
        {
            propDisplayValue: localeMap.displayMessage,
            propInternalValue: 'Message'
        },
        {
            propDisplayValue: localeMap.navigateUrl,
            propInternalValue: 'Navigate'
        },
        {
            propDisplayValue: localeMap.emptyAction,
            propInternalValue: 'Empty'
        }
    ];
};

exports = {
    loadConfiguration,
    createDefaultPanel,
    getDefaultHTML,
    getDefaultViewModelData,
    getDefaultActions
};
export default exports;

loadConfiguration();

app.factory( 'createCommandService', () => exports );
