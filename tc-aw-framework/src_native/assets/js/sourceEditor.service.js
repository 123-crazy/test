// Copyright (c) 2020 Siemens

/* global monaco */

/**
 * Defines {@link sourceEditorService} which provides services for the sourceEditor
 *
 * @module js/sourceEditor.service
 */
import app from 'app';
import _ from 'lodash';
import 'monaco-editor/esm/vs/editor/editor.api';

/** object to export */
var exports = {};
var sourceEditors = [];
/**
 * Register a source editor to the source editor list
 * @param {String} name - name of the editor.
 * @param {Object} editor - a source editor object.
 */
var setSourceEditor = function( name, editor ) {
    var editorExisted = _.find( sourceEditors, function( item ) {
        return item.name === name;
    } );
    if( editorExisted ) {
        editorExisted.editor = editor;
    } else {
        sourceEditors.push( { name: name, editor: editor } );
    }
};
/**
 * get source editor from the source editor list depend on editor name
 * @param {String} name - name of the editor.
 * @return {Object} an editor object with corresponding name.
 */
export let getSourceEditor = function( name ) {
    var editorObject = _.find( sourceEditors, function( item ) {
        return item.name === name;
    } );
    return editorObject ? editorObject.editor : undefined;
};
/**
 * remove source editor from the source editor list depend on editor name, if name is undefined, then remove all editors
 * @param {String} name - name of the editor.
 */
export let removeSourceEditor = function( name ) {
    if( name ) {
        var removedItem = _.remove( sourceEditors, function( item ) {
            return item.name === name;
        } );
        removedItem[ 0 ].editor.dispose();
        removedItem = null;
    } else {
        sourceEditors.forEach( function( item ) {
            item.editor.dispose();
        } );
        sourceEditors.length = 0;
    }
};
/**
 * Create and register a source editor to the source editor list
 * @param {String} name - name of the editor.
 * @param {Object} elem - an element tne editor append on.
 * @param {Object} config - the configuration for the editor.
 * @return {Object} the created editor.
 */
export let createSourceEditor = function( name, elem, config ) {
    var sourceEditor = monaco.editor.create( elem, config );
    setSourceEditor( name, sourceEditor );
    elem.id = name;
    return sourceEditor;
};
/**
 * set theme for all source editor
 * @param {String} theme - name of the theme.
 */
export let setTheme = function( theme ) {
    monaco.editor.setTheme( theme );
};
/**
 * set language for source editor
 * @param {String} name - name of the editor which need to set/change languages.
 * @param {String} language - id of the language.
 */
export let setLanguage = function( name, language ) {
    if( name ) {
        var editor = getSourceEditor( name );
        if( editor ) {
            const isLanguageIsConfigured = monaco.languages.getLanguages().filter( lang => lang.id === language );
            if( isLanguageIsConfigured && isLanguageIsConfigured.length ) {
                monaco.editor.setModelLanguage( editor.getModel(), language );
            } else {
                // load the language configuration
                import( `monaco-editor/esm/vs/basic-languages/${language}/${language}.contribution` )
                .then( () => {
                    monaco.editor.setModelLanguage( editor.getModel(), language );
                } );
            }
        }
    }
};
/**
 * Register information about a new language
 * @param {String} id - the name of the language.
 * @param {Object} tokenizer - the rule of the language, including keywords, operators etc.
 * @param {Object} completionItems - represents a text snippet that is proposed to complete text that is being typed.
 */
export let registerNewLanguage = function( id, tokenizer, completionItems ) {
    if( id ) {
        monaco.languages.register( { id: id } );
        if( tokenizer ) {
            monaco.languages.setMonarchTokensProvider( id, tokenizer );
        }
        if( completionItems ) {
            monaco.languages.registerCompletionItemProvider( id, completionItems );
        }
    }
};
/**
 * Register information about a new language
 * @param {String} name - the name of the editor.
 * @param {Object} prop - prop of editor need to be updated
 */
export let updateOptions = function( name, prop ) {
    var editor = getSourceEditor( name );
    editor.updateOptions( prop );
};

exports = {
    removeSourceEditor,
    createSourceEditor,
    setTheme,
    setLanguage,
    registerNewLanguage,
    updateOptions,
    getSourceEditor
};
export default exports;
app.factory( 'sourceEditorService', () => exports );
