// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceEffectivityService
 */
import app from 'app';
import _ from 'lodash';
import appCtxSvc from 'js/appCtxService';
import sharedEffSvc from 'js/sharedEffectivityService';
import dateEffConfigSvc from 'js/dateEffectivityConfigurationService';

var exports = {};

/**
 * Set or clear date effectivity unit
 *
 * @param {Object} data - data
 */
export let setOrClearDateOrUnitEffectivity = function( data ) {
    if( data.flag.dbValue === 'EDIT' ) {
        sharedEffSvc.setDateOrUnitEffectivityInEditPanel( data );
    } else if( data.flag.dbValue === 'AUTHOR' ) {
        sharedEffSvc.clearDateAndUnitEffectivity( data );
    }
    updateEndItemWidgetVisibility( data );
};


export let updateEndItemWidgetVisibility = function( data ) {
    loadOrClearTopLevelAsEndItemForCurrentSublocation( data );
};

var loadOrClearTopLevelAsEndItemForCurrentSublocation = function( data ) {
    var locationContext = appCtxSvc.getCtx( 'locationContext.ActiveWorkspace:SubLocation' );

    if( locationContext === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' && !data.dateOrUnitEffectivityTypeRadioButton.dbValue && ( data.flag.dbValue === 'AUTHOR' || !data.unitRangeText.dbValue ) ) {
        sharedEffSvc.loadTopLevelAsEndItem( data );
    } else if( data.dateOrUnitEffectivityTypeRadioButton.dbValue ) {
        sharedEffSvc.clearSelectedEndItem( data );
    }
};

/**
 * Clear end date
 *
 * @param {Object} data - data
 */
export let clearEndDate = function( data ) {
    if( data.endDateOptions.dbValue !== 'Date' ) {
        var endDateResult = {};
        endDateResult.dateValue = '';
        endDateResult.timeValue = '';
        endDateResult.dbValue = '';

        return endDateResult;
    }
};

/**
 * Get initial date effectivity configuration
 *
 * @param {Object} data - data
 */
export let getInitialDateEffectivityConfigurationData = function( data ) {
    var activeView = data.getViewId();
    dateEffConfigSvc.getInitialDateEffectivityConfigurationData( data );
    var response = {
        activeView: activeView
    };
    return response;
};

/**
 * Update end item value
 *
 * @param {Object} data - data
 */
export let updateEndItemValue = function( data ) {
    sharedEffSvc.updateEndItemValue( data );
};


/**
 * Validate Unit values
 *
 * @param {Object} data - data
 */
export let validateUnitValue = function( data ) {
    var isUnitRangeValid = true;
    var isBadSyntax = false;
    var isPositiveNumber = true;
    var isTooLarge = false;
    var modifiedUnitRangeText;
    var finalFirstNum;

    var unitValue = data.unitRangeText.dbValue;
    var clean = unitValue;

    if( clean ) {
        clean = clean.replace( '/\s+/g', '' ); //remove all spaces from the given string

        if( clean !== null && clean !== '' ) {
            var unitInParts = clean.split( "," );
            var lastValue = -1;
            var i = 0;
            for( i = 0; i < unitInParts.length; i++ ) {
                var units = unitInParts[ i ].split( "-" );

                // if range is given even after UP or SO, lastValue will be NaN
                // pattern like 10-15-20 is invalid
                if( isNaN( lastValue ) ) {
                    isUnitRangeValid = false;
                    break;
                } else if( units.length > 2 ) {
                    isBadSyntax = true;
                    break;
                }

                // CHeck if first number starts with zero.
                var firstNumber = units[ 0 ];

                //var num = Array.from(firstNumber);
                if( units[ 0 ] ) {
                    finalFirstNum = units[ 0 ].trim().replace( /^0+/, '' );
                    if( finalFirstNum === '' ) {
                        finalFirstNum = 0;
                    }
                }

                var isFirstNumberInteger = Number.isInteger( Number( firstNumber ) );

                // check 1st part is number or if it is a negative number
                if( isNaN( units[ 0 ] ) || units[ 0 ] === "" || !isFirstNumberInteger || _.endsWith( units[0], '.' ) ) {
                    isPositiveNumber = false;
                } else if( Number( units[ 0 ] ) <= lastValue ) {
                    isUnitRangeValid = false;
                } else if( parseInt( units[ 0 ] ) > 2147483647 ) {
                    isTooLarge = true;
                }

                lastValue = Number( units[ 0 ] ); // update last value


                // if there is second part
                if( units.length > 1 ) {
                    // check 2nd part is float
                    var secondNumber = units[ 1 ];
                    var isSecondNumberInteger = Number.isInteger( Number( secondNumber ) );

                    // check 1st part is number
                    if( isNaN( units[ 1 ] ) ) {
                        if( units[ 1 ] !== 'UP' && units[ 1 ] !== 'SO' ) {
                            isPositiveNumber = false;
                        }
                    } else if( !isSecondNumberInteger || _.endsWith( units[1], '.' ) ) {
                        isPositiveNumber = false;
                    } else if( Number( units[ 1 ] ) <= lastValue ) {
                        isUnitRangeValid = false;
                    } else if( parseInt( units[ 1 ] ) > 2147483647 ) {
                        isTooLarge = true;
                    }

                    lastValue = Number( units[ 1 ] );
                }
            }
        }
    }
    if( !_.includes( unitValue, '-' ) && finalFirstNum === 0 ) {
        isPositiveNumber = false;
    }

    modifiedUnitRangeText = unitValue.replace(/\b0+/g, "");

    // From above step all preceeding 0's are removed. So if only 0-20 is added as input then -20 will remain, in this case we need to add removed 0.
    if(_.includes(unitValue, '-') && modifiedUnitRangeText.charAt(0) === '-'){
        modifiedUnitRangeText = 0 + modifiedUnitRangeText;
    }

    var response =  {
        isUnitRangeValid : isUnitRangeValid,
        isBadSyntax : isBadSyntax,
        isPositiveNumber : isPositiveNumber,
        isTooLarge : isTooLarge,
        modifiedUnitRangeText : modifiedUnitRangeText
    };

    return response;
};


export default exports = {
    setOrClearDateOrUnitEffectivity,
    updateEndItemWidgetVisibility,
    clearEndDate,
    getInitialDateEffectivityConfigurationData,
    updateEndItemValue,
    validateUnitValue

};
app.factory( 'aceEffectivityService', () => exports );
