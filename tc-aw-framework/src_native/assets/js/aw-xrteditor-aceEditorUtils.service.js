// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 editor,
 define,
 require
 */

/**
 * @module js/aw-xrteditor-aceEditorUtils.service
 */
import xrtDOMService from 'js/aw-xrteditor-xrtDOMUtils.service';

var exports = {};

const XHtmlTagInterpreter = function( row, col, session ) {
    this.row = row;
    this.col = col;
    this.session = session;
    this.tagName = null;
    this.attributeName = null;
    this.attributes = [];
};

XHtmlTagInterpreter.setValues = function() {
    var lineString = this.session.getLine( this.row );
    lineString = lineString.substring( lineString.indexOf( '<' ) + 1, lineString.length );
    this.tagName = lineString.substring( -1, lineString.indexOf( ' ' ) );
    lineString = lineString.substring( lineString.indexOf( ' ' ), lineString.indexOf( '>' ) );

    var attributeStrings = [];
    for( var i = 0; i < lineString.length; i++ ) {
        if( lineString[ i ] === '' ) {
            continue;
        }
        attributeStrings.push( lineString[ i ] );
    }

    var type = '';
    var value = '';
    for( var i = 0; i < attributeStrings.length; i++ ) {
        type = attributeStrings[ i ].substring( -1, attributeStrings[ i ].indexOf( '=' ) );
        value = attributeStrings[ i ].substring( attributeStrings[ i ].indexOf( '"' ) + 1, attributeStrings[ i ]
            .indexOf( '"', attributeStrings[ i ].indexOf( '"' ) + 1 ) );
        this.attributes.push( {
            attributeType: type,
            attributeValue: value
        } );
        if( value === '' ) {
            this.attributeName = type;
        }
    }
};

/**
 * @returns {Object} the tag name to be sent to autocompleter service, the type of completion to be done, and
 *          the current list of attributes and their values.
 */
XHtmlTagInterpreter.getCompleteInfo = function() {
    //attrs is list of attributes/values in the tag, tagName is the tag name
    this.setValues();

    if( this.tagName === '' && this.session.getLine( this.row )[ this.col - 1 ] === '<' ) { //if the tag name is being completed
        return {
            tagName: this.tagName,
            attributes: this.attributes,
            attributeName: this.attributeName,
            completeType: 'tag'
        };
    } else if( this.session.getLine( this.row )[ this.col ] === '"' &&
        this.session.getLine( this.row )[ this.col - 1 ] ) { //If Attribute value is being completed
        return {
            tagName: this.tagName,
            attributes: this.attributes,
            attributeName: this.attributeName,
            completeType: 'value'
        };
    } else if( this.tagName //
        &&
        this.col > this.session.getLine( this.row ).indexOf( '"' ) //
        &&
        this.col < this.session.getLine( this.row ).indexOf( '>' ) //
        &&
        this.session.getLine( this.row )[ this.col - 1 ] === ' ' //
        &&
        this.col >= this.session.getLine( this.row ).indexOf( '<' ) ) { //If an attribute type is being completed
        return {
            tagName: this.tagName,
            attributes: this.attributes,
            attributeName: this.attributeName,
            completeType: 'attribute'
        };
    } //If this cursor is at an invalid location for autocomplete
    return 'noComplete';
};

export let loadEditor = function( editor ) {
    var chileCompleter = {
        getCompletions: function( editor, session, pos, prefix, callback ) {
            if( prefix.length === 0 ) {
                var line = session.getLine( pos.row );
                var interpreter = new exports.XHtmlTagInterpreter( pos.row, pos.column, session );
                var completeInfo = interpreter.getCompleteInfo();
                if( undefined !== line ) {
                    if( completeInfo === 'noComplete' ) {
                        return;
                    } else if( undefined === completeInfo || completeInfo === null ||
                        undefined === completeInfo.completeType || completeInfo.completeType === null ||
                        completeInfo.completeType.length === 0 || undefined === completeInfo.tagName ||
                        completeInfo.tagName === null || completeInfo.tagName.length === 0 ) {
                        callback( null, xrtDOMService.getAutocompleteValues( completeInfo ) );
                        return;
                    }

                    if( completeInfo ) {
                        callback( null, xrtDOMService.getAutocompleteValues( completeInfo ) );
                    }
                    return;
                }
                callback( null, xrtDOMService.getAutocompleteValues( completeInfo ) );
            } else {
                if( completeInfo !== 'noComplete' ) {
                    callback( null, xrtDOMService.getAutocompleteValues( completeInfo ) );
                }
            }
        }
    };
    //Need to push it on top of local
    editor.setOptions( {
        enableBasicAutocompletion: [ chileCompleter ],
        enableLiveAutocompletion: false,
        useSoftTabs: true,
        enableSnippets: true,
        fontSize: '16px'
    } );
};

export { XHtmlTagInterpreter };

export default exports = {
    XHtmlTagInterpreter,
    loadEditor
};
