// Copyright (c) 2020 Siemens

/**
 * This service would be responsible for all xml related parsing inside wysiwyg
 * @module js/wysiwygXmlParserService
 */

import app from 'app';
import messagingSvc from 'js/messagingService';
import $ from 'jquery';
import Debug from 'Debug';

var exports = {};

var trace = new Debug( 'wysiwygLoadAndSaveService' );

export let normalizeXML = function( viewXML ) {
    viewXML = exports.formatXml( viewXML );
    viewXML = viewXML.replace( /(visible-when=| exist-when=)"(.+?(>|<).+?)"/g, function( match ) {
        return match.replace( '>', '&gt;' )
            .replace( '<', '&lt;' );
    } );
    viewXML = viewXML.replace( /&(?!(amp;|lt;|gt;|le;|ge;))/g, '&amp;' );
    return viewXML;
};

export let formatXml = function( xml ) {
    var formatted = '';
    if( xml.trim() !== '' ) {
        // replacing all the \n\r with space character, to the make xml single line.
        xml = xml.replace( /(\r\n|\n|\r)/gm, ' ' );
        // remove all the space in between tags
        var regex = /(>)\s*(<)|(>)\t*(<)/g;
        var regexTags = /(>)(<)(\/*)/g;

        // Remove any spaces, line breaks or tabs in the XML between tags.
        xml = xml.replace( regex, '><' );
        // Add a line break / carraige return
        xml = xml.replace( regexTags, '$1\r\n$2$3' );
        //Replace all double quotes from angular expression to single quotes
        xml = xml.replace( /[=]"{{/g, '=\'{{' );
        xml = xml.replace( /}}"/g, '}}\'' );
        //If any attribute value doesnt't have quotes then add single quotes
        xml = xml.replace( /(^|[^!;><'=])(=)($|[^="'])([^"'\s][^\s>]+)/g, '$1$2\'$3$4\'' );
        var pad = 0;
        $.each( xml.split( '\r\n' ), function( index, node ) {
            var indent = 0;
            if( node.match( /.+<\/\w[^>]*>$/ ) ) {
                indent = 0;
            } else if( node.match( /^<\/\w/ ) ) {
                if( pad !== 0 ) {
                    pad -= 1;
                }
            } else if( node.match( /^<\w[^>]*[^/]>.*$/ ) ) {
                indent = 1;
            } else {
                indent = 0;
            }
            var padding = '';
            for( var i = 0; i < pad; i++ ) {
                padding += '  ';
            }
            formatted += padding + node + '\r\n';
            pad += indent;
        } );
    }

    return formatted;
};

export let parseViewXML = function( viewXML ) {
    viewXML = exports.normalizeXML( viewXML );
    try {
        var viewDoc = new DOMParser().parseFromString( viewXML, 'text/xml' );
        if( isParseError( viewDoc ) ) {
            throw new Error();
        }
    } catch ( e ) {
        var dummyRootXML = '<wys-root class=\'wys-dummy-root aw-layout-column\'>' + viewXML + '</wys-root>';
        viewDoc = new DOMParser().parseFromString( dummyRootXML, 'text/xml' );
    }
    return viewDoc;
};

export let parseViewXMLCnavas = function( viewXML ) {
    try {
        var viewDoc = exports.parseViewXML( viewXML );
        if( isParseError( viewDoc ) ) {
            throw new Error();
        }
    } catch ( e ) {
        trace( 'Error during parse: invalid view XML' );
        var errorRootXML = 'View XML is not well defined.';
        viewDoc = '';
        messagingSvc.showError( errorRootXML );
    }
    return viewDoc;
};

export let getElementById = function( xmldocument, id ) {
    return xmldocument.querySelector( `[id=${id}]` );
};

/**
 * Check parsed document contains error or not.
 * @param {xmldocument} xmldocument XML Document
 * @return {boolean} true if xml document contains error otherwise false.
 */
function isParseError( xmldocument ) {
    return xmldocument.getElementsByTagName( 'parsererror' ).length > 0;
}

exports = {
    normalizeXML,
    formatXml,
    parseViewXML,
    parseViewXMLCnavas,
    getElementById
};
export default exports;
app.factory( 'wysiwygXmlParserService', () => exports );
