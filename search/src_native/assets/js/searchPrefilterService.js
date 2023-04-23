// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global */

/**
 *
 * @module js/searchPrefilterService
 * @requires js/eventBus
 * @requires lodash
 * @requires angular
 * @requires js/appCtxService
 * @requires soa/preferenceService
 * @requires js/localeService
 * @requires js/aw.searchFilter.service
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import preferenceSvc from 'soa/preferenceService';
import searchCommonUtils from 'js/searchCommonUtils';
import eventBus from 'js/eventBus';
import _ from 'lodash';

import localeSvc from 'js/localeService';
import 'js/aw.searchFilter.service';

var _selectPrefilterText = '';
var PREFILTER_PREFIX = 'AWS_SearchPreFilter_Property';
var SELECTED_VALUE = '_SelectedValue';
var _preFilters = [];

/**
 * @function unSetPrefilters
 */
export let unSetPrefilters = function() {
    _preFilters = [];
};

/**
 * @function initialize
 * @param {Object} data data
 * @param {Object} eventData eventData
 */
export let initialize = function( data, eventData ) {
    if( _preFilters.length === 0 ) {
        eventBus.publish( 'awPrefilter.getPrefilters' );
    }
    if( _preFilters.length > 0 ) {
        exports.populateDataProviders( data );
    }
    searchCommonUtils.updateSearchCriteria( data, eventData );
};

/**
 * Populate data providers
 * @function populateDataProviders
 * @param {Object} data data
 */
export let populateDataProviders = function( data ) {
    exports.populatePrefilters2( data );
    exports.setPrefilters( data );
};

/**
 * Populate prefilters
 * @param {*} data data
 * @returns {object} prefilters
 */
export let populatePrefilters2 = function( data ) {
    // If the cache is empty, process the search response
    if( _preFilters.length === 0 ) {
        _preFilters = searchCommonUtils.processSoaResponse( data.response.properties );
    }
    // Read prefilters saved in the context
    var prefilters = appCtxSvc.getCtx( 'searchPreFilters' );
    if( prefilters === undefined ) {
        // populate prefilters again
        prefilters = {};
        prefilters.ownPrefilters = exports.populateOwnerPrefilters();
        prefilters.catPrefilters = exports.populateCategoryPrefilters();

        appCtxSvc.registerCtx( 'searchPreFilters', prefilters );
    }
    // populate the prefilter list that aw-listBox need
    data.prefilterList1 = exports.createListModelObjectsFromPrefilters( prefilters.ownPrefilters.displayName, prefilters.ownPrefilters.response );
    data.prefilterList2 = exports.createListModelObjectsFromPrefilters( prefilters.catPrefilters.displayName, prefilters.catPrefilters.response );

    return prefilters;
};

/**
 * Returns categories from search response
 *
 *
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let populateOwnerPrefilters = function() {
    var ownPrefilters = {};
    ownPrefilters.response = null;
    ownPrefilters.totalFound = 0;

    if( _preFilters.length > 0 ) {
        ownPrefilters.response = _preFilters[ 0 ].listItems;
        ownPrefilters.totalFound = _preFilters[ 0 ].listItems.length;
        ownPrefilters.displayName = _preFilters[ 0 ].displayName;
        ownPrefilters.filterInternalName = _preFilters[ 0 ].internalName;
    }

    ownPrefilters.selectedOwner = null;

    return ownPrefilters;
};

/**
 * Returns categories from search response
 *
 * @returns {ObjectArray} The array of child node objects to be displayed.
 */
export let populateCategoryPrefilters = function() {
    var catPrefilters = {};
    catPrefilters.response = null;
    catPrefilters.totalFound = 0;

    if( _preFilters.length > 0 ) {
        catPrefilters.response = _preFilters[ 1 ].listItems;
        catPrefilters.totalFound = _preFilters[ 0 ].listItems.length;
        catPrefilters.displayName = _preFilters[ 1 ].displayName;
        catPrefilters.filterInternalName = _preFilters[ 1 ].internalName;
    }

    catPrefilters.selectedCategory = null;

    return catPrefilters;
};

/**
 * @function setPrefilters
 * @param {Object} data data
 */
export let setPrefilters = function( data ) {
    exports.setPrefilterText( data.selectPrefilter1, 0, data );
    exports.setPrefilterText( data.selectPrefilter2, 1, data );
};

/**
 * @function setPrefilterText
 * @param {Object} prop prop
 * @param {Integer} id id
 * @param {Integer} data data
 */
export let setPrefilterText = function( prop, id, data ) {
    var defaultText = _selectPrefilterText + ' ' + _preFilters[ id ].displayName;
    exports.getPrefilterValue( prop, id + 1, defaultText,
        _preFilters[ id ], data );
};

/**
 * getPrefilterValue
 * @function getPrefilterValue
 * @param {Object} viewProp viewProp
 * @param {Integer} id id
 * @param {String} defaultText defaultText
 * @param {Object} _preFilter _preFilter
 * @param {Object} data data
 * @returns {Object} updated filter property
 */
export let getPrefilterValue = function( viewProp, id, defaultText, _preFilter, data ) {
    var name = exports.getPrefilterName( id );
    var value = '';
    var deferred = AwPromiseService.instance.defer();

    preferenceSvc.getStringValue( name ).then( function( prefValue ) {
        prefValue = prefValue === null ? value : prefValue;
        viewProp.dbValue = prefValue;
        var tmpProp = exports.getPrefilterText( viewProp, defaultText, _preFilter );
        exports.updatePrefiltersCtx( tmpProp, viewProp, id, prefValue );
        deferred.resolve( prefValue );
    } );
    return deferred.promise;
};

/**
 * getPrefilterName
 * @function getPrefilterName
 * @param {Integer} id id
 * @returns {String} prefilter name
 */
export let getPrefilterName = function( id ) {
    return PREFILTER_PREFIX + id + SELECTED_VALUE;
};

/**
 * @function updatePrefilter1
 * @param {Object} data data
 */
export let updatePrefilter1 = function( data ) {
    exports.updatePrefilterText( data.selectPrefilter1, 0, data, true );
};

/**
 * @function updatePrefilter2
 * @param {Object} data data
 */
export let updatePrefilter2 = function( data ) {
    exports.updatePrefilterText( data.selectPrefilter2, 1, data, true );
};

/**
 * @function updateNarrowModePrefilter1
 * @param {Object} data data
 */
export let updateNarrowModePrefilter1 = function( data ) {
    exports.updatePrefilterText( data.selectPrefilter1, 0, data, false );
    var context = {
        updatedProp: data.selectPrefilter1
    };
    eventBus.publish( 'narrowMode.prefilter1Updated', context );
};

/**
 * @function updateNarrowModePrefilter2
 * @param {Object} data data
 */
export let updateNarrowModePrefilter2 = function( data ) {
    exports.updatePrefilterText( data.selectPrefilter2, 1, data, false );
    var context = {
        updatedProp: data.selectPrefilter2
    };
    eventBus.publish( 'narrowMode.prefilter2Updated', context );
};

/**
 * updatePrefilterText
 * @function updatePrefilterText
 * @param {Object} prop prop
 * @param {Object} id id
 * @param {Object} data data
 * @param {Boolean} updatePreference true to set preference
 */
export let updatePrefilterText = function( prop, id, data, updatePreference ) {
    var eventData = data.eventData;
    if( eventData !== undefined && eventData.updatedProp && eventData.updatedProp !== undefined ) {
        if( prop === eventData.updatedProp ) {
            updatePreference = false;
            eventData.updatedProp = null;
        } else {
            prop = eventData.updatedProp;
        }
    }
    var ctx = appCtxSvc.getCtx( 'searchPreFilters' );
    exports.updateSinglePrefilterText( id, data, prop, ctx );
    if( prop !== undefined && updatePreference ) {
        var name = exports.getPrefilterName( id + 1 );
        var values = [];
        values[ 0 ] = prop.dbValue;
        preferenceSvc.setStringValue( name, values );
    }
    if( ctx !== undefined ) {
        appCtxSvc.updateCtx( 'searchPreFilters', ctx );
    }
};

/**
 * updateSinglePrefilterText
 * @function updateSinglePrefilterText
 * @param {Integer} id id
 * @param {Object} data data
 * @param {Object} property property
 * @param {Object} ctx ctx
 */
export let updateSinglePrefilterText = function( id, data, property, ctx ) {
    // Default text to display
    var defaultText = _selectPrefilterText + ' ' + _preFilters[ id ].displayName;
    var idString = ( id + 1 ).toString();

    var activeProp = data[ 'selectPrefilter' + idString ];
    if( activeProp.propertyName === property.propertyName && activeProp.dbValue !== property.dbValue ) {
        activeProp = property;
        data[ 'selectPrefilter' + idString ] = property;
    }

    // Get property
    var newProperty = exports.getPrefilterText( property, defaultText, _preFilters[ id ] );
    if( newProperty.isDefault ) {
        activeProp.dbValue = '';
    }
    var newProp = newProperty.newProp;
    data[ 'selectPrefilter' + idString ].propertyDisplayName = newProp;

    if( ctx !== undefined ) {
        if( id === 0 ) {
            ctx.ownPrefilters.propDisplayName = newProp;
            ctx.ownPrefilters.selectedOwner = activeProp.dbValue;
        } else {
            ctx.catPrefilters.propDisplayName = newProp;
            ctx.catPrefilters.selectedCategory = activeProp.dbValue;
        }
    }
    _preFilters[ id ].propDisplayName = newProp;
};

/**
 * Given an array of Strings to be represented in listbox, this function returns an array of ListModel objects for
 * consumption by the listbox widget.
 * @param {ObjectArray} listName - the Strings array of Names
 * @param {ObjectArray} listItems - The Strings array of Items
 *
 * @return {ObjectArray} - Array of ListModel objects.
 */
export let createListModelObjectsFromPrefilters = function( listName, listItems ) {
    var listModels = [];
    _.forEach( listItems, function( item ) {
        var listModel = {
            propDisplayValue: '',
            propInternalValue: '',
            propDisplayDescription: '',
            hasChildren: false,
            children: {},
            sel: false
        };
        if( item.staticElementObject === 'ANY' ) {
            listModel.propDisplayValue = _selectPrefilterText + ' ' + listName;
        } else {
            listModel.propDisplayValue = item.staticDisplayValue;
        }

        listModel.propInternalValue = item.staticElementObject;
        listModels.push( listModel );
    } );

    return listModels;
};

/**
 * getPrefilterText
 * @function getPrefilterText
 * @param {Object} property property
 * @param {String} defaultText defaultText
 * @param {Object} _preFilter _preFilter
 * @returns {Object} updated filter property
 */
export let getPrefilterText = function( property, defaultText, _preFilter ) {
    var prop = {};
    prop.isDefault = false;
    if( property.dbValue && property.dbValue !== 'ANY' ) {
        var index = _.findIndex( _preFilter.listItems, function( listItem ) {
            return listItem.staticElementObject === property.dbValue;
        } );
        if( index > -1 ) {
            property.propertyDisplayName = _preFilter.listItems[ index ].staticDisplayValue;
        } else {
            prop.isDefault = true;
        }
    } else {
        prop.isDefault = true;
    }
    prop.newProp = prop.isDefault ? defaultText : property.propertyDisplayName;
    return prop;
};

export let updatePrefiltersCtx = function( tmpProp, viewProp, id, prefValue ) {
    if( tmpProp.isDefault ) {
        viewProp.dbValue = '';
    }

    viewProp.propertyDisplayName = tmpProp.newProp;
    var prefilters = appCtxSvc.getCtx( 'searchPreFilters' );
    if( id === 1 ) {
        prefilters.ownPrefilters.propDisplayName = tmpProp.newProp;
        prefilters.ownPrefilters.selectedOwner = prefValue;
    } else {
        prefilters.catPrefilters.propDisplayName = tmpProp.newProp;
        prefilters.catPrefilters.selectedCategory = prefValue;
    }
    appCtxSvc.updateCtx( 'searchPreFilters', prefilters );
};

var loadConfiguration = function() {
    localeSvc.getTextPromise( 'SearchMessages', true ).then(
        function( localTextBundle ) {
            _selectPrefilterText = localTextBundle.allPrefilters;
        } );
};

loadConfiguration();

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    unSetPrefilters,
    initialize,
    populateDataProviders,
    populatePrefilters2,
    populateOwnerPrefilters,
    populateCategoryPrefilters,
    setPrefilters,
    setPrefilterText,
    getPrefilterValue,
    getPrefilterName,
    updatePrefilter1,
    updatePrefilter2,
    updateNarrowModePrefilter1,
    updateNarrowModePrefilter2,
    updatePrefilterText,
    updateSinglePrefilterText,
    createListModelObjectsFromPrefilters,
    getPrefilterText,
    updatePrefiltersCtx
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member searchPrefilterService
 */
app.factory( 'searchPrefilterService', () => exports );
