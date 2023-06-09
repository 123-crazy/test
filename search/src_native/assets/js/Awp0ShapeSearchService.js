// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * Logic for Shape Search
 * @module js/Awp0ShapeSearchService
 */

import app from 'app';
import appCtxService from 'js/appCtxService';
import AwStateService from 'js/awStateService';
import preferenceService from 'soa/preferenceService';
import _ from 'lodash';

/**
 * Update the state with a single ShapeSearch preference name/value pair
 *
 * @function applyShapeSearchFilter
 *
 * @param {String} prefName - preference name
 * @param {String} value - preference value
 */
export let applyShapeSearchFilter = function( prefName, value ) {
    exports.applyShapeSearchFilterPairs( [ prefName ], [ value ] );
};

/**
 * Update the state with an array of ShapeSearch prefence name/value pairs
 *
 * @function applyShapeSearchFilter
 * @param {ObjectArray} prefNameValuePairArray - preference name value pair
 */
export let applyShapeSearchFilters = function( prefNameValuePairArray ) {
    var prefNames = [];
    var values = [];
    prefNameValuePairArray.map( function( prefNameValuePair ) {
        prefNames.push( prefNameValuePair.prefName );
        values.push( prefNameValuePair.value );
    } );
    exports.applyShapeSearchFilterPairs( prefNames, values );
};

/**
 * Update the state with new ShapeSearch value filters
 *
 * @function applyShapeSearchFilterPairs
 *
 * @param {StringArray} prefNames - preference name
 * @param {StringArray} values - preference value
 */
export let applyShapeSearchFilterPairs = function( prefNames, values ) {
    var params = AwStateService.instance.params;
    var filterParam = params.filter;
    var filters = filterParam.split( '~' );
    var foundFilter = false;
    for( var index = 0; index < prefNames.length; index++ ) {
        var prefName = prefNames[ index ];
        var value = values[ index ];
        for( var i in filters ) {
            var filter = filters[ i ];
            var filterSplit = filter.split( '=' );
            if( filterSplit[ 0 ] === prefName ) {
                foundFilter = true;
                filters[ i ] = prefName + '=' + value;
            }
        }

        if( !foundFilter ) {
            filters.push( prefName + '=' + value );
        }
    }

    var newFilters = '';
    for( var j in filters ) {
        if( filters[ j ] !== '' ) {
            newFilters = newFilters + filters[ j ] + '~';
        }
    }
    AwStateService.instance.go( '.', {
        filter: newFilters
    } );
};

/**
 * Handle slider change event
 *
 * @function handleSS1ShapeSliderChangeEvent
 *
 * @param {Number} sliderValue - new slider value
 * @param {Object} shapeSliderProp - slider property
 */
export let handleSS1ShapeSliderChangeEvent = _.debounce( function( sliderValue, shapeSliderProp ) {
    exports.handleSS1ShapeSliderChangeEvent2( sliderValue, shapeSliderProp );
}, 1000 );

/**
 * Handle slider change event
 *
 * @function handleSS1ShapeSliderChangeEvent2
 *
 * @param {Number} sliderValue - new slider value
 * @param {Object} shapeSliderProp - slider property
 * @returns {Object} updated slider property
 */
export let handleSS1ShapeSliderChangeEvent2 = function( sliderValue, shapeSliderProp ) {
    if( typeof sliderValue !== 'undefined' && !isNaN( sliderValue ) && preferenceService ) {
        // update the preference an trigger the location to perform a search
        var sliderArray = [ sliderValue.toString() ];
        var existingPrefValues = preferenceService.getLoadedPrefs();
        var shapeSearchSizePrefValues = existingPrefValues.SS1_DASS_shape_default;

        if( sliderValue.toString() !== shapeSearchSizePrefValues[ 0 ] ) {
            preferenceService.setStringValue( 'SS1_DASS_shape_default', sliderArray ).then(
                function() {
                    exports.applyShapeSearchFilter( 'SS1partShapeFilter', sliderValue.toString() );
                } );
        }
    }

    return shapeSliderProp;
};

/**
 * Handle slider change event
 *
 * @function handleSS1SizeSliderChangeEvent
 *
 * @param {Number} sliderValue - new slider value
 * @param {Object} floorSliderProp - slider property
 */
export let handleSS1SizeSliderChangeEvent = _.debounce( function( sliderValue, floorSliderProp ) {
    exports.handleSS1SizeSliderChangeEvent2( sliderValue, floorSliderProp );
}, 1000 );

/**
 * Handle slider change event
 *
 * @function handleSS1SizeSliderChangeEvent2
 *
 * @param {Number} sliderValue - new slider value
 * @param {Object} floorSliderProp - slider property
 * @returns {Object} updated slider property
 */
export let handleSS1SizeSliderChangeEvent2 = function( sliderValue, floorSliderProp ) {
    if( typeof sliderValue !== 'undefined' && !isNaN( sliderValue[ 0 ] ) && !isNaN( sliderValue[ 1 ] ) && preferenceService ) {
        // update the preference an trigger the location to perform a search
        var existingPrefValues = preferenceService.getLoadedPrefs();
        var ShapeSearchShapeMinPrefValues = existingPrefValues.SS1_DASS_size_default_min;
        var ShapeSearchShapeMaxPrefValues = existingPrefValues.SS1_DASS_size_default_max;
        var sliderArray;
        if( ShapeSearchShapeMinPrefValues[ 0 ] !== sliderValue[ 0 ].toString() ) {
            sliderArray = [ sliderValue[ 0 ].toString() ];
            preferenceService.setStringValue( 'SS1_DASS_size_default_min', sliderArray ).then( function() {
                exports.applyShapeSearchFilter( 'SS1shapeBeginFilter', sliderValue[ 0 ].toString() );
            } );
        }
        if( ShapeSearchShapeMaxPrefValues[ 0 ] !== sliderValue[ 1 ].toString() ) {
            sliderArray = [ sliderValue[ 1 ].toString() ];
            preferenceService.setStringValue( 'SS1_DASS_size_default_max', sliderArray ).then( function() {
                exports.applyShapeSearchFilter( 'SS1shapeEndFilter', sliderValue[ 1 ].toString() );
            } );
        }
    }
    return floorSliderProp;
};

/**
 * getSS1ShapeValue
 *
 * @function getSS1ShapeValue

 *
 * @return {Number} SS1ShapeValue
 */
export let getSS1ShapeValue = function() {
    var searchContext = appCtxService.getCtx( 'search' );
    var filterMap = searchContext.filterMap;
    if( typeof filterMap.SS1partShapeFilter !== 'undefined' ) {
        return parseInt( filterMap.SS1partShapeFilter[ 0 ].stringValue );
    }

    var existingPrefValues = preferenceService.getLoadedPrefs();
    return parseInt( existingPrefValues.SS1_DASS_shape_default[ 0 ] );
};

/**
 * getSS1SizeMinValue
 *
 * @function getSS1SizeMinValue

 *
 * @return {Number} SS1SizeMinValue
 */
export let getSS1SizeMinValue = function() {
    var searchContext = appCtxService.getCtx( 'search' );
    var filterMap = searchContext.filterMap;
    if( typeof filterMap.SS1shapeBeginFilter !== 'undefined' ) {
        return parseInt( filterMap.SS1shapeBeginFilter[ 0 ].stringValue );
    }

    var existingPrefValues = preferenceService.getLoadedPrefs();
    return parseInt( existingPrefValues.SS1_DASS_size_default_min[ 0 ] );
};

/**
 * getSS1SizeMaxValue
 *
 * @function getSS1SizeMaxValue

 *
 * @return {Number} SS1SizeMaxValue
 */
export let getSS1SizeMaxValue = function() {
    var searchContext = appCtxService.getCtx( 'search' );
    var filterMap = searchContext.filterMap;
    if( typeof filterMap.SS1shapeEndFilter !== 'undefined' ) {
        return parseInt( filterMap.SS1shapeEndFilter[ 0 ].stringValue );
    }

    var existingPrefValues = preferenceService.getLoadedPrefs();
    return parseInt( existingPrefValues.SS1_DASS_size_default_max[ 0 ] );
};

/**
 * getSS1SizeLowerLimit
 *
 * @function getSS1SizeLowerLimit

 *
 * @return {Number} SS1SizeLowerLimit
 */
export let getSS1SizeLowerLimit = function() {
    var existingPrefValues = preferenceService.getLoadedPrefs();
    return parseInt( existingPrefValues.SS1_DASS_size_lower_limit[ 0 ] );
};

/**
 * getSS1SizeUpperLimit
 *
 * @function getSS1SizeUpperLimit

 *
 * @return {Number} SS1SizeUpperLimit
 */
export let getSS1SizeUpperLimit = function() {
    var existingPrefValues = preferenceService.getLoadedPrefs();
    return parseInt( existingPrefValues.SS1_DASS_size_upper_limit[ 0 ] );
};

/**
 * getSS1SizeArrayValues
 *
 * @function getSS1SizeArrayValues

 *
 * @return {Object} SS1SizeArrayValues
 */
export let getSS1SizeArrayValues = function() {
    var searchContext = appCtxService.getCtx( 'search' );
    var filterMap = searchContext.filterMap;
    return [ exports.getSS1SizeMinValue( filterMap ), exports.getSS1SizeMaxValue( filterMap ) ];
};

/**
 * setSliderValues
 *
 * @function setSliderValues

 * @param {Object} data viewModel
 */
export let setSliderValues = function( data ) {
    if( data === undefined ) {
        return;
    }

    var searchContext = appCtxService.getCtx( 'search' );
    var filterMap = searchContext.filterMap;

    data.sliderProp1.dbValue[ 0 ].sliderOption.value = exports.getSS1ShapeValue( filterMap );
    data.sliderProp2.dbValue[ 0 ].sliderOption.values = [ exports.getSS1SizeMinValue( filterMap ),
        exports.getSS1SizeMaxValue( filterMap )
    ];
};

/**
 * updateFilterMapForShapeSearch
 *
 * @function updateFilterMapForShapeSearch
 *
 * @param {Object}prop - prop
 */
export let updateFilterMapForShapeSearch = function( prop ) {
    delete prop.searchStringInContent;
    var existingPrefValues = preferenceService.getLoadedPrefs();
    var ShapeSearchSizePrefValues = existingPrefValues.SS1_DASS_shape_default;
    var ShapeSearchShapeMinPrefValues = existingPrefValues.SS1_DASS_size_default_min;
    var ShapeSearchShapeMaxPrefValues = existingPrefValues.SS1_DASS_size_default_max;

    delete prop.ShapeSearchProvider;
    if( prop[ 'Geolus Criteria' ] ) {
        delete prop[ 'Geolus Criteria' ];
    } else if( prop[ 'Geolus XML Criteria' ] ) {
        delete prop[ 'Geolus XML Criteria' ];
    }

    if( typeof prop.SS1partShapeFilter === 'undefined' ) {
        prop.SS1partShapeFilter = exports.populateShapeSearchFilter( ShapeSearchSizePrefValues[ 0 ] );
    }

    if( typeof prop.SS1shapeBeginFilter === 'undefined' ) {
        prop.SS1shapeBeginFilter = exports.populateShapeSearchFilter( ShapeSearchShapeMinPrefValues[ 0 ] );
    }

    if( typeof prop.SS1shapeEndFilter === 'undefined' ) {
        prop.SS1shapeEndFilter = exports.populateShapeSearchFilter( ShapeSearchShapeMaxPrefValues[ 0 ] );
    }
    return prop;
};

/**
 * populateShapeSearchFilter
 *
 * @function populateShapeSearchFilter

 *
 * @param {Object}stringValuePref - string value for shapeSearch filter
 *
 * @return {Object} shape search filter with values populated
 */
export let populateShapeSearchFilter = function( stringValuePref ) {
    return [ {
        searchFilterType: 'StringFilter',
        stringValue: stringValuePref,
        selected: false,
        stringDisplayValue: '',
        startDateValue: '',
        endDateValue: '',
        startNumericValue: 0,
        endNumericValue: 0,
        count: 0,
        startEndRange: ''
    } ];
};

/**
 * Get Search Criteria for shape search
 *
 * @function getSearchCriteriaForShapeSearch
 * @param {Object}prop - prop
 * @param {Object}searchContext - searchContext
 * @return {Object} search criteria
 */
export let getSearchCriteriaForShapeSearch = function( prop, searchContext ) {
    var shapeSearchCtx = appCtxService.getCtx( 'shapeSearch' );
    if( !shapeSearchCtx ) {
        shapeSearchCtx = {};
        appCtxService.registerCtx( 'shapeSearch', shapeSearchCtx );
    }
    var filterPropArray = null;
    var filterPropValue = null;
    if( prop && Object.keys( prop ).length > 0 ) {
        for( var filterVarName in prop ) {
            if( prop.searchStringInContent && prop.searchStringInContent.length > 0 ) {
                //in-content search is on.
                if( prop.searchStringInContent[ 0 ].stringValue === '*' || prop.searchStringInContent[ 0 ] === '*' ) {
                    filterPropValue = {
                        searchString: shapeSearchCtx.geolusCriteria
                    };
                } else {
                    let searchString = shapeSearchCtx.geolusCriteria;
                    if ( !searchString ) {
                        searchString = prop[ 'Geolus Criteria' ][ 0 ].stringValue;
                    }
                    if ( !searchString ) {
                        searchString = prop[ 'Geolus Criteria' ][ 0 ];
                    }
                    let searchStringInContent = prop.searchStringInContent[ 0 ].stringValue;
                    if ( !searchStringInContent ) {
                        searchStringInContent = prop.searchStringInContent[ 0 ];
                    }
                    filterPropValue = {
                        searchString: searchString,
                        searchStringInContent: searchStringInContent
                    };
                }
                return exports.setSavedSearchUidForShapeSearchCriteria( filterPropValue );
            } else if( searchContext && searchContext.criteria ) {
                shapeSearchCtx.seedObjectName = searchContext.criteria.searchString;
            }
            if( filterVarName === 'Geolus Criteria' ) {
                filterPropArray = prop[ filterVarName ];
                if( filterPropArray && filterPropArray.length > 0 ) {
                    if ( filterPropArray[ 0 ].stringValue ) {
                        filterPropValue = {
                            searchString: filterPropArray[ 0 ].stringValue
                        };
                        shapeSearchCtx.geolusCriteria = filterPropArray[ 0 ].stringValue;
                    }else{
                        filterPropValue = {
                            searchString: filterPropArray[ 0 ]
                        };
                        shapeSearchCtx.geolusCriteria = filterPropArray[ 0 ];
                    }
                    return exports.setSavedSearchUidForShapeSearchCriteria( filterPropValue );
                }
            } else if( filterVarName === 'Geolus XML Criteria' ) {
                filterPropArray = prop[ filterVarName ];
                if( filterPropArray && filterPropArray.length > 0 ) {
                    let searchString = filterPropArray[ 0 ].stringValue;
                    if ( !searchString ) {
                        searchString = filterPropArray[ 0 ];
                    }
                    filterPropValue = {
                        fmsTicketAsSearchString: searchString
                    };
                    shapeSearchCtx.geolusCriteria = searchString;
                    return filterPropValue;
                }
            }
        }
    }
    return undefined;
};

/**
 * set the saved search uid for shape search criteria
 *
 * @function setSavedSearchUidForShapeSearchCriteria
 * @param {Object}filterPropValue - filterPropValue
 * @return {Object} filterPropValue with saved search uid
 */
export let setSavedSearchUidForShapeSearchCriteria = function( filterPropValue ) {
    var savedSearchContext = appCtxService.getCtx( 'savedSearch' );
    if( savedSearchContext && savedSearchContext.savedSearchUid ) {
        var searchSearchCtx = appCtxService.getCtx( 'searchSearch' );
        if( searchSearchCtx && searchSearchCtx.savedSearchUid ) {
            filterPropValue.savedSearchUid = searchSearchCtx.savedSearchUid;
        } else {
            filterPropValue.savedSearchUid = savedSearchContext.savedSearchUid;
        }
    }
    return filterPropValue;
};

/* eslint-disable-next-line valid-jsdoc*/

const exports = {
    applyShapeSearchFilter,
    applyShapeSearchFilters,
    applyShapeSearchFilterPairs,
    handleSS1ShapeSliderChangeEvent,
    handleSS1ShapeSliderChangeEvent2,
    handleSS1SizeSliderChangeEvent,
    handleSS1SizeSliderChangeEvent2,
    getSS1ShapeValue,
    getSS1SizeMinValue,
    getSS1SizeMaxValue,
    getSS1SizeLowerLimit,
    getSS1SizeUpperLimit,
    getSS1SizeArrayValues,
    setSliderValues,
    updateFilterMapForShapeSearch,
    populateShapeSearchFilter,
    getSearchCriteriaForShapeSearch,
    setSavedSearchUidForShapeSearchCriteria
};

export default exports;

/**
 *
 * @memberof NgServices
 * @member Awp0ShapeSearchService
 */
app.factory( 'Awp0ShapeSearchService', () => exports );
