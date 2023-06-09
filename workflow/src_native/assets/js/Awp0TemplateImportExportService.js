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
 * This file provided the method that will be used for import / export for workflow templates.
 *
 * @module js/Awp0TemplateImportExportService
 */
import * as app from 'app';
import appCtxSvc from 'js/appCtxService';
import messagingService from 'js/messagingService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

/**
 * Define public API
 */
var exports = {};

/**
 * Get the import case template option based on selected options from UI.
 *
 * @param {Object} data View model object
 */
export let populateImportTemplateData = function( data ) {
    var userOption = '';
    var context = null;
    if( data.ignoreOriginIdCheck.dbValue ) {
        context = 'workflow_template_overwrite';
        userOption = 'IGNORE_ORIGINID';
    } else if( data.updateInBackground.dbValue ) {
        context = 'workflow_template_overwrite';
        userOption = 'APPLY_TEMPLATE_BACKGROUND';
    } else if( data.applyChangesToActiveProcesses.dbValue ) {
        context = 'workflow_template_overwrite';
        userOption = 'APPLY_TEMPLATE';
    } else if( data.overwriteDuplicateTemplates.dbValue ) {
        if( appCtxSvc.ctx.preferences.EPM_enable_apply_template_changes &&
            appCtxSvc.ctx.preferences.EPM_enable_apply_template_changes[ 0 ] === 'AUTOMATIC' ) {
            context = 'workflow_template_overwrite';
            userOption = 'APPLY_TEMPLATE';
        } else {
            context = 'workflow_template_overwrite';
        }
    } else {
        context = 'workflow_template_import';
    }
    data.context = context;
    data.sessionOptions = [ {
            name: 'userSelectedOption',
            value: userOption
        },
        {
            name: 'AuthorizationOption',
            value: 'BYPASS_AUTHORIZATION'
        }
    ];
};

/**
 * Update the import options when user is changing the value for overwrite templates option
 *
 * @param {Object} data View model object
 */
export let updateImportOptions = function( data ) {
    // Check if value is true then no need to do anything and return from here
    // else reset the other options value to false
    if( data.overwriteDuplicateTemplates.dbValue ) {
        return;
    }
    data.ignoreOriginIdCheck.dbValue = false;
    data.applyChangesToActiveProcesses.dbValue = false;
    data.updateInBackground.dbValue = false;
};

/**
 * Get the transfer mode object based on import or export case and selected options from UI .
 *
 * @param {Object} data View model object
 * @return {Object} Transfer mode obejct that will be used for import/export
 */
export let getTransferModeUid = function( data ) {
    if( !data.transferModeObjects || data.transferModeObjects.length <= 0 ) {
        return null;
    }
    var modelObject = null;
    // Iterate for all transfer modes to find the valid transfer mode and return
    for( var idx = 0; idx < data.transferModeObjects.length; idx++ ) {
        var transferMode = data.transferModeObjects[ idx ];
        if( transferMode && transferMode.props && transferMode.props.object_name.dbValues[ 0 ] === data.context ) {
            modelObject = transferMode;
            break;
        }
    }
    // Check if no match found and model obejct is null then return null from here
    if( !modelObject ) {
        return modelObject;
    }
    return {
        uid: modelObject.uid,
        type: modelObject.type
    };
};

/**
 * Get the object that need to be exported.
 *
 * @param {Object} ctx App context object
 * @return {Array} Selected Objects array
 */
export let getExportObjects = function( ctx ) {
    var objects = [];
    var selectedObjects = ctx.mselected;
    var parentSelected = ctx.pselected;
    // Check if parent selection is not null then use that else use mselected
    if( parentSelected ) {
        selectedObjects = [ parentSelected ];
    }
    _.forEach( selectedObjects, function( selObj ) {
        objects.push( {
            uid: selObj.uid,
            type: selObj.type
        } );
    } );
    return objects;
};

/**
 * Populate the master locale label so that user will know that this language will
 * be used always to export the template
 *
 * @param {Object} data View model object
 * @param {Object} defaultMasterLanguage Default master language that will be always exported
 *
 */
export let populateMasterLanguage = function( data, defaultMasterLanguage ) {
    // Check if data is null or master language is null then no need to proceed
    // furhter
    if( !data || !defaultMasterLanguage ) {
        return;
    }

    // Find the index for default master language.
    var index = _.findIndex( data.allLanguageList, function( languageItem ) {
        return languageItem.languageCode === defaultMasterLanguage;
    } );

    // Check if index > -1 then only populate the master language value
    if( index > -1 && data.allLanguageList[ index ] ) {
        var masterItem = data.allLanguageList[ index ];
        data.masterLanguageObject = masterItem;
        var propValue = masterItem.languageName + ' [' + masterItem.languageCode + '] ';
        var message = messagingService.applyMessageParams( data.i18n.masterLanguageValue, [ '{{masterLanguage}}' ], {
            masterLanguage: propValue
        } );
        data.masterLanguage.dbValue = message;
        data.masterLanguage.uiValue = message;
    }
};

/**
 * Get file name extension from file name
 *
 * @param {String} fileName file name
 * @return {String} file name extension
 */
var _getFileExtension = function( fileName ) {
    // Check if input file name nds with .xml extension or not
    if( _.endsWith( fileName, '.xml' ) ) {
        var extIndex = fileName.lastIndexOf( '.' );
        if( extIndex > -1 ) {
            return fileName.substring( extIndex + 1 );
        }
    }
    return null;
};

/**
 * Get the file name user entered in UI. If file name doesn't have
 * extension then it will add extension .xml by default.
 *
 * @param {String} fileName File name user entered
 * @return {String} File name user entered with extension if not present
 */
export let getExportFileName = function( fileName ) {
    if( !fileName ) {
        return null;
    }

    // Get the file extension and if extension is not present
    // then add the extension.
    var fileExtensionPresent = _getFileExtension( fileName );
    if( !fileExtensionPresent ) {
        fileName += '.xml';
    }
    return fileName;
};

/**
 * This is needed to download exported XML file and log file. It will just delay
 * the export log file option so that both files can be downloaded.
 */
export let viewExportedLogFile = function() {
    setTimeout( function() {
        eventBus.publish( 'exportTemplate.openLogFile' );
    }, 1000 );
};

/**
 * Get the languages selected from UI for export option.
 *
 * @param {Array} selectedLanguages Selected languages from UI
 * @param {Object} defaultMasterLanguage Default master language that will be always exported
 * @return {Array} Language list Array
 */
export let getExportLanguageOptions = function( selectedLanguages, defaultMasterLanguage ) {
    var langaugeOptions = [];

    if( defaultMasterLanguage ) {
        langaugeOptions = [ defaultMasterLanguage ];
    }
    // Check if input is null or empty then return empty array from here
    if( !selectedLanguages || selectedLanguages.length <= 0 ) {
        return langaugeOptions;
    }

    // Iterate for each language selected and populate the language list
    _.forEach( selectedLanguages, function( language ) {
        if( defaultMasterLanguage !== language.languageCode ) {
            langaugeOptions.push( language.languageCode );
        }
    } );
    return langaugeOptions;
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0TemplateImportExportService
 */

export default exports = {
    populateImportTemplateData,
    updateImportOptions,
    getTransferModeUid,
    getExportObjects,
    populateMasterLanguage,
    getExportFileName,
    viewExportedLogFile,
    getExportLanguageOptions
};
app.factory( 'Awp0TemplateImportExportService', () => exports );
