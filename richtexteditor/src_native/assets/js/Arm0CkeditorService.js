// Copyright (c) 2020 Siemens
/* eslint-env es6 */
/* eslint-disable class-methods-use-this, no-empty-function */

/**
 * This represents the class for aw ckeditor Service
 *
 * @module js/Arm0CkeditorService
 */
import app from 'app';
import localeSvc from 'js/localeService';
import browserUtils from 'js/browserUtils';
import AwPromiseService from 'js/awPromiseService';
import soaPrefSvc from 'soa/preferenceService';
import appCtxSvc from 'js/appCtxService';
import ckeditorOperations from 'js/ckeditorOperations';

/*
global
CKEDITOR
*/

let exports;
let isIE;
let _instances = [];

/**
 * Function to return translation file names from current locale
 *
 * @returns {String} File name from ckeditor5 translation folder
 */
 function _getTranslationFileName() {
    var currentLocale = localeSvc.getLocale();
    switch ( currentLocale ) {
        case 'en_US':
            return null;
        case 'cs_CZ':
            return 'cs';
        case 'ja_JP':
            return 'ja';
        case 'ko_KR':
            return 'ko';
        case 'pl_PL':
            return 'pl';
        case 'pt_BR':
            return 'pt-BR';
        case 'ru_RU':
            return 'ru';
        case 'zh_CN':
            return 'zh-CN';
        case 'zh_TW':
            return 'zh';
        default:
            return currentLocale;
    }
}

/**
 * @returns {Object} -
 */
function _loadCkeditor4() {
    return import( 'ckeditor4' );
}

/**
 * @returns {Object} -
 */
function _loadCkeditor5() {
    var ckeTranslationFileName = _getTranslationFileName();
    if(ckeTranslationFileName) {
        import( 'lib/ckeditor/translations/' + ckeTranslationFileName );
    }
    return import( 'ckeditor' ).then( v => v.default );
}

/**
 * Function to load correct RichText Editor based on browser compatability
 * Ckeditor5 supported on all modern browsers except Internet Explorer
 *
 * @returns {Promise} - Promise that will be resolved when editor js is loaded
 */
function _loadRichTextEditor() {
    return new Promise( ( resolve ) => {
        soaPrefSvc.getLogicalValue( 'Req_ckeditor4_enabled' ).then( function( prefValue ) {
            var cke4Enabled = false;
            if( prefValue !== null && prefValue.length > 0 && prefValue.toUpperCase() === 'TRUE' ) {
                cke4Enabled = true;
            }
            if( browserUtils.isIE || cke4Enabled ) { // Ckeditor4 if IE browser
                appCtxSvc.registerPartialCtx( 'Arm0Requirements.Editor', 'CKEDITOR_4' );
                ckeditorOperations.init( 'CKEDITOR_4' );
                isIE = true;
                _loadCkeditor4().then(
                    function() {
                        resolve();
                    } );
            } else { // Ckeditor5 on other browsers
                appCtxSvc.registerPartialCtx( 'Arm0Requirements.Editor', 'CKEDITOR_5' );
                ckeditorOperations.init( 'CKEDITOR_5' );
                isIE = false;
                _loadCkeditor5().then(
                    function( response ) {
                        window.CKEDITOR5 = response; // Stored on windows, to aceess it globally
                        appCtxSvc.registerPartialCtx( 'Arm0Requirements.EditorLoaded', 'CKEDITOR_5' );
                        resolve( response );
                    } );
            }
        } );
    } );
}

/**
 * Function to create ckeditor instance
 *
 * @param {String} elementId - Dom element id to which ckeditor instance needs to be attached
 * @param {Object} config - Configuration to create instance
 * @returns {Object} - ckeditor instance
 */
export let create = function( elementId, config ) {
    var deferred = AwPromiseService.instance.defer();
    richTextModuleLoadedPromise.then(
        function( CKEDITOR ) {
            if( isIE ) {
                config = config.getCkeditor4Config();
                var editor = CKEDITOR.replace( elementId, config );
                editor = new RMCkeditor4( editor );
                _instances[ elementId ] = editor;
                deferred.resolve( editor );
            } else {
                config = config.getCkeditor5Config();
                config.extraPlugins = config.extraPlugins ? config.extraPlugins : [];

                _loadExtraPluginsForCkeditor5( config.extraPlugins ).then( loadedPlugins => { // Dynamic loading of extra plugins
                    config.extraPlugins = loadedPlugins;
                    CKEDITOR.ClassicEditor.create( document.querySelector( '#' + elementId ), config ).then( editor5 => {
                        editor5 = new RMCkeditor5( editor5 );
                        _instances[ elementId ] = editor5;
                        // Check if default height is given in config, if yes set height, as ckedtiro5 does not support default height in config
                        if( config && config.height ) {
                            editor5.resize( undefined, config.height );
                        }
                        deferred.resolve( editor5 );
                    }, elementId );
                } );
            }
        } );
    return deferred.promise;
};

export let getInstance = function( editorId ) {
    return _instances[ editorId ];
};

/**
 * Function to load extra plugins dynamically
 * @param {Array} extraPlugins - String array
 */
async function _loadExtraPluginsForCkeditor5( extraPlugins ) {
    return await Promise.all(
        extraPlugins
    );
}

/**
 * Interface for AW Ckeditor
 */
class RMCkeditor {
    constructor( editor ) {
        this._instance = editor;
    }
    getData() {}
    setData() {}
    checkDirty() {}
    resize() {}
    on() {}
    destroy() {}
}

/**
 * Class to hold ckeditor5 instance
 */
class RMCkeditor5 extends RMCkeditor {
    constructor( editor ) {
        super( editor );
    }
    getData() {
        return this._instance.getData();
    }

    setData( content ) {
        content = content ? content : '';
        this._instance.setData( content );
    }

    checkDirty() {
        this._instance.checkDirty();
    }

    resize( width, height ) {
        this._instance.editing.view.change( writer => {
            if( height ) {
                writer.setStyle( 'height', height + 'px', this._instance.editing.view.document.getRoot() );
            }
            if( width ) {
                writer.setStyle( 'width', width + 'px', this._instance.editing.view.document.getRoot() );
            }
        } );
    }

    /**
     * Registers a callback function to be executed when an event is fired
     * @param {String} eventName -
     * @param {Object} callbackFunction -
     */
    on( eventName, callbackFunction ) {
        switch ( eventName ) {
            case 'instanceReady':
                callbackFunction( { editor: this._instance } ); // instance is already ready after creation
                break;
            case 'instanceLoaded':
                callbackFunction( { editor: this._instance } );
                break;
            case 'contentDom':
                callbackFunction( { editor: this._instance } );
                break;
            case 'change':
                this._instance.model.document.on( 'change:data', callbackFunction );
                break;
            case 'focus':
                this._instance.model.document.on( 'focus', callbackFunction );
                break;
            case 'blur':
                this._instance.model.document.on( 'blur', callbackFunction );
                break;
            case 'paste':
                this._instance.model.document.on( 'paste', callbackFunction );
                break;
        }
    }

    destroy() {
        this._instance.destroy();
    }
}

/**
 * Class to hold ckeditor4 instance
 */
class RMCkeditor4 extends RMCkeditor {
    constructor( editor ) {
        super( editor );
    }
    getData() {
        return this._instance.getData();
    }

    setData( content ) {
        this._instance.setData( content );
    }

    checkDirty() {
        this._instance.checkDirty();
    }

    resize( width, height ) {
        width = width ? width : this._instance.width;
        height = height ? height : this._instance.height;
        this._instance.resize( width, height );
    }

    on( eventName, callbackFunction ) {
        switch ( eventName ) {
            case 'instanceReady':
                CKEDITOR.on( eventName, callbackFunction ); // instance is already ready after creation
                break;
            case 'instanceLoaded':
                CKEDITOR.on( eventName, callbackFunction );
                break;
            default:
                this._instance.on( eventName, callbackFunction );
        }
    }

    destroy() {
        this._instance.destroy();
    }
}

/**
 * Ckeditor Configuration provider
 * @module js/Arm0CkeditorConfigProviderBase
 */
export class Arm0CkeditorConfigProviderBase {
    getCkeditor4Config() {}
    getCkeditor5Config() {}
}

/**
 * Load correct Rich Text Editor on loading this module
 */
let richTextModuleLoadedPromise = _loadRichTextEditor();

export let isCkeditorLoaded = function() {
    var deferred = AwPromiseService.instance.defer();
    richTextModuleLoadedPromise.then(
        function() {
            deferred.resolve();
        } );
    return deferred.promise;
};

export default exports = {
    create,
    getInstance,
    isCkeditorLoaded
};

app.factory( 'Arm0CkeditorService', () => exports );
