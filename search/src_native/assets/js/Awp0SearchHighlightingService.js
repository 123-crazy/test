// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/Awp0SearchHighlightingService
 */

import app from 'app';
import highlighterSvc from 'js/highlighterService';
import preferenceService from 'soa/preferenceService';
import $ from 'jquery';
import AwSceService from 'js/awSceService';
import sanitizer from 'js/sanitizer';

/**
 * getHighlightKeywords - function to get the keywords for highlighting from performSearchViewModel4 response
 * @param { Object } data
 * @returns { Boolean } true/false
 */

export let getHighlightKeywords = function( data ) {
    if( data.additionalSearchInfoMap !== undefined ) {
        highlighterSvc.highlightKeywords( data.additionalSearchInfoMap.searchTermsToHighlight );
        return true;
    }
    return false;
};

/**
 * toggleHighlightSelection - toggle to turn highlighting on/off
 * @param { Object } prefVals
 * @param { Boolean } toToggle
 * @returns { Boolean } return the preference value of AW_Highlighting
 */

export let toggleHighlightSelection = function( prefVals, toToggle ) {
    if( !prefVals && preferenceService ) {
        prefVals = preferenceService.getLoadedPrefs();
    }

    if( !prefVals.AW_Highlighting ) {
        // if the preference is not (yet) defined. This should not happen in production env.
        prefVals.AW_Highlighting = [ 'true' ];
    }
    var booleanPrefValue = prefVals.AW_Highlighting[ 0 ] === 'true';
    if( toToggle ) {
        booleanPrefValue = !booleanPrefValue;
        prefVals.AW_Highlighting[ 0 ] = booleanPrefValue ? 'true' : 'false';
    }

    if( booleanPrefValue ) {
        $( document.body ).addClass( 'aw-ui-showHighlight' );
    } else {
        $( document.body ).removeClass( 'aw-ui-showHighlight' );
    }
    return prefVals.AW_Highlighting[ 0 ];
};

/**
 * escapeRegexSpecialChars
 *
 * @function escapeRegexSpecialChars
 * @param {Object} regex regex
 * @return {String} escaped regex string
 */
export let escapeRegexSpecialChars = function( regex ) {
    return regex.replace( /[-\/\\^$*+?.()|[\]{}]/g, '\\$&' );
};

/**
 * highlightSearchResults
 *
 * @function highlightSearchResults
 * @param {Object} item item
 * @param {String} text text
 * @return {HTML} HTML string with bold texts
 */
export let highlightSearchResults = function( item, text ) {
    if( item === undefined || item === '' ) {
        return undefined;
    }
    let cleanText = sanitizer.htmlEscapeAllowEntities( text );
    let cleanItem = sanitizer.htmlEscapeAllowEntities( item );
    if( !cleanText ) {
        return AwSceService.instance.trustAsHtml( cleanItem.toString() );
    }
    var words = exports.escapeRegexSpecialChars( cleanText ).split( ' ' ).join( '|' );
    var regExp = new RegExp( '(' + words + ')', 'gi' );
    return AwSceService.instance.trustAsHtml( cleanItem.toString().replace( regExp, '<strong>$1</strong>' ) );
};

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    getHighlightKeywords,
    toggleHighlightSelection,
    escapeRegexSpecialChars,
    highlightSearchResults
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member Awp0SearchHighlightingService
 */
app.factory( 'Awp0SearchHighlightingService', () => exports );
