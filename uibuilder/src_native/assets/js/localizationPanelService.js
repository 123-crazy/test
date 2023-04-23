// Copyright (c) 2020 Siemens

/**
 * This service handles commands title panel
 *
 * @module js/localizationPanelService
 */
import app from 'app';
import localeSvc from 'js/localeService';
import graphQLModelSvc from 'js/graphQLModelService';
import _ from 'lodash';
import parsingUtils from 'js/parsingUtils';
import graphQLSvc from 'js/graphQLService';

// eslint-disable-next-line valid-jsdoc
/**
 * This service handles handles localization panel
 *
 * @member localizationPanelService
 * @memberof NgService
 */

var exports = {};
var localeMap = {};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.invalidTitle' ).then( result => localeMap.invalidTitle = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.key' ).then( result => localeMap.key = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.source' ).then( result => localeMap.source = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.en' ).then( result => localeMap.en = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.cs_CZ' ).then( result => localeMap.cs_CZ = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.de' ).then( result => localeMap.de = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.es' ).then( result => localeMap.es = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.fr' ).then( result => localeMap.fr = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.it' ).then( result => localeMap.it = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.ja_JP' ).then( result => localeMap.ja_JP = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.ko_KR' ).then( result => localeMap.ko_KR = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.pl_PL' ).then( result => localeMap.pl_PL = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.pt_BR' ).then( result => localeMap.pt_BR = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.ru_RU' ).then( result => localeMap.ru_RU = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.zh_CN' ).then( result => localeMap.zh_CN = result );
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.zh_TW' ).then( result => localeMap.zh_TW = result );
};

/**
 * Convert command title props to ViewModelProperties
 *
 * @param {Object} gqlResult - command definition title object from server.
 * @param {String} i18nKey - key from commandContext.
 * @param {String} i18nSource - source from commandContext.
 * @param {String} value - dbValue from commandContext.
 * @param {String} commandID - commandID from commandContext.
 * @param {Boolean} i18nPropsEditable - flag to decide whether to make i18n properties editable or not
 *
 * @return {Array} array of view model properties
 */
export let convertLocaleStringToVMProps = function( gqlResult, i18nKey, i18nSource, value, commandID, i18nPropsEditable ) {
    var vmPropsList = [];
    var gqlI18nDef = _.get( gqlResult, 'data.i18n' );
    var keySourceProps = [];
    var i18nProps = [];
    var defaultCommandID = commandID ? commandID : '';
    var titleValue = _.camelCase( value );

    //Default key and source
    var keySourceObj = {
        key: i18nKey ? i18nKey : defaultCommandID + '_' + titleValue,
        source: i18nSource ? i18nSource : `${defaultCommandID}BuilderMessages`
    };

    var i18nPropsEditableIn = i18nPropsEditable === 'true';
    if( _.isUndefined( i18nPropsEditable ) ) {
        i18nPropsEditableIn = true;
    }

    //if in create status, titleKey is empty, set en value from dbValue
    //add key and source field here
    var currentLocale = localeSvc.getLanguageCode() ? localeSvc.getLanguageCode() : 'en';
    if( i18nKey === '' && !gqlI18nDef[ currentLocale ] ) {
        gqlI18nDef[ currentLocale ] = value ? value : '';
        keySourceProps = graphQLModelSvc.convertGqlPropsToVMProps( keySourceObj, localeMap, null, true, true );
    } else {
        keySourceProps = graphQLModelSvc.convertGqlPropsToVMProps( keySourceObj, localeMap, null, false, false );
    }
    if( gqlI18nDef ) {
        i18nProps = graphQLModelSvc.convertGqlPropsToVMProps( gqlI18nDef, localeMap, null, i18nPropsEditableIn, false, 'textarea' );
    }
    vmPropsList = _.concat( keySourceProps, i18nProps );
    return vmPropsList;
};

export let retrieveI18NValueFromDarsi = function( i18nKey, i18nSource ) {
    var graphQLQuery = {
        endPoint: 'graphql',
        request: {
            query: '{i18n(input: { source: "' + i18nSource + '", key: "' + i18nKey + '" }) {value}}'
        }
    };

    return graphQLSvc.callGraphQL( graphQLQuery ).then( function( data ) {
        return _.get( data, 'data.i18n.value' );
    } );
};

export let retrieveI18nValue = function( vmProp, viewModel, i18nMsgKey, i18nSource ) {
    vmProp.anchor = 'aw_i18nEditRemoveLocaleAnchor';
    vmProp.isEnabled = false;
    var i18nKey = parsingUtils.getStringBetweenDoubleMustaches( i18nMsgKey ).substring( 5 );
    if( !i18nSource ) {
        i18nSource = _.get( viewModel.i18n, i18nKey )[ 0 ];
    }
    retrieveI18NValueFromDarsi( i18nKey, i18nSource ).then( function( i18nValue ) {
        vmProp.uiValue = i18nValue;
        vmProp.dbValue = i18nValue;
        vmProp.selectedI18nKeyValue = [];
        vmProp.selectedI18nKeyValue.push( { i18nKey: i18nKey, i18nSource: i18nSource } );
    } );
};

export let deleteI18NProperty = function( vmProp ) {
    if( vmProp.selectedI18nKeyValue && vmProp.selectedI18nKeyValue.length > 0 ) {
        vmProp.selectedI18nKeyValue.pop();
        updateI18nCommandAnchor( vmProp );
    }
};

var updateI18nCommandAnchor = function( vmProp ) {
    if( vmProp.selectedI18nKeyValue && vmProp.selectedI18nKeyValue[ 0 ] && vmProp.selectedI18nKeyValue[ 0 ].i18nKey && vmProp.selectedI18nKeyValue[ 0 ].i18nSource ) {
        vmProp.anchor = 'aw_i18nEditRemoveLocaleAnchor';
        vmProp.isEnabled = false;
    } else {
        vmProp.anchor = 'aw_i18nAddLocaleAnchor';
        vmProp.isEnabled = true;
    }
};

export let updateI18NProperty = function( vmProp, updatedI18NData ) {
    var i18nData = updatedI18NData.addI18NMessage ? updatedI18NData.addI18NMessage : updatedI18NData.updateI18NMessage;
    if( _.isEmpty( i18nData ) !== true && i18nData.value ) {
        vmProp.uiValue = i18nData.value;
        vmProp.dbValue = i18nData.value;
        vmProp.selectedI18nKeyValue = [];
        vmProp.selectedI18nKeyValue.push( { i18nKey: i18nData.titleKey, i18nSource: i18nData.titleSource } );
        updateI18nCommandAnchor( vmProp );
    }
};

/**
 * Validate command title selected
 *
 * @param {Boolean} suggestive - true if value selected is suggestive
 *
 * @return {Object} response object valid or not
 */
export let validateSelectedLocale = function( suggestive ) {
    var response = { valid: true };
    if( suggestive ) {
        response.valid = false;
        response.error = localeMap.invalidTitle;
    }

    return response;
};

exports = {
    loadConfiguration,
    convertLocaleStringToVMProps,
    validateSelectedLocale,
    updateI18NProperty,
    deleteI18NProperty,
    retrieveI18nValue
};
export default exports;

loadConfiguration();

app.factory( 'localizationPanelService', () => exports );
