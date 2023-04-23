// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/CAW0MaturityProgressBarService
 */
import app from 'app';
import _appCtxService from 'js/appCtxService';
import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import dateTimeSvc from 'js/dateTimeService';
import cmm from 'soa/kernel/clientMetaModel';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import _ from 'js/eventBus';


var exports = {};
export let maturityPropLoad = function() {};

export let setMaturityValues = function( data, filterData, lov, lovInput, propertyName ) {
    soaSvc.post( 'Core-2013-05-LOV', 'getInitialLOVValues', { initialData: { filterData: filterData, lov: lov, lovInput: lovInput, propertyName: propertyName } } ).then( function( responseData ) {
        var allLovEntries = [];
        var i = 0;
        var allLovKeys = responseData.lovValues;
        data.steps = [];
        var currentVal = _appCtxService.ctx.mselected[ 0 ].props.CMMaturity.dbValues[ 0 ];
        Object.keys( allLovKeys ).forEach( function( allLovValues ) {
            allLovEntries[ i ] = allLovKeys[ allLovValues ].propDisplayValues.lov_values[ 0 ];
            i++;
        } );

        showSteps( data, allLovEntries, currentVal );
    } );
};

function showSteps( data, allLovEntries, currentVal ) {
    var beg = 0;
        var end = 0;
    var i;
    var positions = getBegEndPosition( allLovEntries, currentVal );
    beg = positions[ 0 ];
    end = positions[ 1 ];
    var maturityState = [];
    var lovEntries = [];
    var currentElemPos = positions[ 2 ];
    for( var i = beg; i <= end; ++i ) {
        // lovEntries.push({ value: allLovEntries[i] , isActive: true });
        if( i === currentElemPos ) {
            maturityState.push( 0 );
            lovEntries.push( { value: allLovEntries[ i ], isActive: true } );
        } else if( i < currentElemPos ) {
            maturityState.push( -1 );
            lovEntries.push( { value: allLovEntries[ i ], isActive: false } );
        } else {
            maturityState.push( 1 );
            lovEntries.push( { value: allLovEntries[ i ], isActive: false } );
        }
    }
    for( i = 0; i < lovEntries.length; i++ ) {
        data.steps[ i ] = {
            dbValue: lovEntries[ i ].value,
            isCurrentActive: lovEntries[ i ].isActive,
            propertyDisplayName: lovEntries[ i ].value
        };
    }
}

function getBegEndPosition( allLovEntries, currValue ) {
    var length = allLovEntries.length;
    var beg = 0;
    var end = length - 1;

    var currentElemPos = -1;
    for( var k = 0; k < length; ++k ) {
        if( allLovEntries[ k ] === currValue ) {
            currentElemPos = k;
            break;
        }
    }

    return [ beg, end, currentElemPos ];
}

export default exports = {
    maturityPropLoad,
    setMaturityValues
};
app.factory( 'CAW0MaturityProgressBarService', () => exports );
