// Copyright (c) 2020 Siemens

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/uwLovDataService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';

var exports = {};

/**
 * Initialize the lov api using a data provider from the view-model
 * @param {Object} lovScope - scope object for the lov
 */
export let initLovApi = function( lovScope ) {
    if( lovScope.prop.dataProvider ) {
        lovScope.prop.lovApi = {};

        // retrieve the initialized dataProvider object for this lov property
        var listProvider = lovScope.prop.getViewModel().dataProviders[ lovScope.prop.dataProvider ];

        if( !listProvider.initializeAction && !listProvider.action ) {
            lovScope.prop.lovApi.type = 'static';
        }

        // map the lovApi to use the provider's initialize method
        lovScope.prop.lovApi.getInitialValues = function( filterStr, deferred ) {
            lovScope.filterStr = filterStr;

            // reset the lov type if necessary
            if( ( listProvider.initializeAction || listProvider.action ) && lovScope.prop && lovScope.prop.lovApi.type === 'static' ) {
                lovScope.prop.lovApi.type = '';
            }

            listProvider.initialize( lovScope )
                .then( function( initProviderResp ) {
                    if( initProviderResp.moreValuesExist === false ) {
                        // since we have all the values, treat as static (enables simplified filtering)
                        lovScope.prop.lovApi.type = 'static';
                    }
                    // conforming to existing data structure here, but note for future:
                    // moreValuesExist should probably be moved off of results since it's not valid json
                    if( initProviderResp.hasOwnProperty( 'moreValuesExist' ) ) {
                        initProviderResp.results.moreValuesExist = initProviderResp.moreValuesExist;
                    }
                    deferred.resolve( initProviderResp.results );
                } );
        };

        // use the provider's getNext method
        lovScope.prop.lovApi.getNextValues = function( promise ) {
            listProvider.accessMode = 'lov';

            listProvider.getNextPage( lovScope )
                .then( function( nextProviderResp ) {
                    if( nextProviderResp.moreValuesExist === false ) {
                        lovScope.prop.lovApi.type = 'static';
                    }

                    if( nextProviderResp.hasOwnProperty( 'moreValuesExist' ) ) {
                        nextProviderResp.results.moreValuesExist = nextProviderResp.moreValuesExist;
                    }
                    promise.resolve( nextProviderResp.results );
                } );
        };

        // use the provider's validate method
        lovScope.prop.lovApi.validateLOVValueSelections = function( selected ) {
            // are the selected value(s) in lovScope.lovEntries?
            // if not, a new value is being suggested which may or may not be allowed
            var suggestion = false;
            selected.forEach( function( sel ) {
                if( sel.suggested ) {
                    suggestion = sel.propDisplayValue;
                }
            } );

            // make server call via lov data provider interface: returns a promise
            return listProvider.validateSelections( lovScope, selected, suggestion );
        };
    }
};

/**
 * Returns an AngularJS promise to fetch the initial LOV values.
 *
 * @param {LOVCallbackAPI} lovApi - Reference to the LOV Callback API to use.
 *
 * @param {String} filterStr - Filter to apply to the results before being returned.
 *
 * @param {String} name - Name of the property we are requesting LOV entries for.
 *
 * @returns {Promise} - Returns an AngularJS promise to fetch the initial LOV values.
 */
export let promiseInitialValues = function( lovApi, filterStr, name ) {
    var deferred = AwPromiseService.instance.defer();
    // make server call via lov data provider interface
    lovApi.getInitialValues( filterStr, deferred, name );
    return deferred.promise;
};

/**
 * Returns an AngularJS promise to fetch the 'next' set of LOV values.
 *
 * @param {LOVCallbackAPI} lovApi - Reference to the LOV Callback API to use.
 *
 * @param {String} name - Name of the property we are requesting LOV entries for.
 *
 * @returns {Promise} - Returns an AngularJS promise to fetch the 'next' set of LOV values.
 */
export let promiseNextValues = function( lovApi, name ) {
    var deferred = AwPromiseService.instance.defer();
    // make server call via lov data provider interface
    lovApi.getNextValues( deferred, name );
    return deferred.promise;
};

/**
 * Validate the given LOV entry value(s).
 *
 * @param {LOVCallbackAPI} lovApi - Reference to the LOV Callback API to use.
 *
 * @param {LovEntryArray} lovEntries - set lov vals
 *
 * @param {String} name - Name of the property we are requesting LOV entries for.
 *
 * @returns {Void} -
 */
export let validateLOVValueSelections = function( lovApi, lovEntries, name ) {
    // make server call via lov data provider interface
    return lovApi.validateLOVValueSelections( lovEntries, name );
};

exports = {
    initLovApi,
    promiseInitialValues,
    promiseNextValues,
    validateLOVValueSelections
};
export default exports;
/**
 * This service is used to wrap the LOV features.
 *
 * @memberof NgServices
 * @member uwLovDataService
 *
 * @param {Object} $q - q
 * @return {uwLovDataService} - service
 */
app.factory( 'uwLovDataService', () => exports );
