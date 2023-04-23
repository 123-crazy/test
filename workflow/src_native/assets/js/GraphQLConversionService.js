// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/GraphQLConversionService
 */
import app from 'app';
import _ from 'lodash';
import awInboxService from 'js/aw.inbox.service';

var exports = {};

/**
 * Converts the activeFilterMap into an array format that GraphQL can understand.
 *
 * @param {Object} activeFilterMap The active filter map to convert
 *
 * @return {Array} The converted filter map
 */
export let convertSearchFilterMap = function( activeFilterMap ) {
    var out = [];
    _.forEach( Object.keys( activeFilterMap ), function( value, index ) {
        out[ index ] = new Object();
        out[ index ].searchFilterName = value;
        out[ index ].searchFilters = activeFilterMap[ value ];
    } );
    return out;
};

/**
 * Collects the SOA response and sends it to awInboxServices to add unRead property on vmo.
 *
 * @param {Object} data 
 *
 * @return {Array} The modified VMO
 */
export let getSearchResults = function( data ) {
    var searchResults = JSON.stringify(data.inbox.results);
    data.searchResultsJSON = searchResults;
    var vmos = awInboxService.getSearchResults(data);
    return vmos;
};

export default exports = {
    convertSearchFilterMap,
    getSearchResults
};
app.factory( 'GraphQLConversionService', () => exports );
