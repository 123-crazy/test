// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global */

/**
 * Service for managing unit and date effectivity authoring.
 *
 * @module js/expressionEffectivityService
 */
import * as app from 'app';
import AwFilterService from 'js/awFilterService';
import dateTimeService from 'js/dateTimeService';
import localeService from 'js/localeService';
import appCtxSvc from 'js/appCtxService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import effectivityUtils from 'js/effectivityUtils';
import _ from 'lodash';

let exports = {};

/** 
 * "SO" (Stock Out) value for date effectivity with time format in GMT. 
 */
let _SO_DATE_WITH_TIME_IN_GMT = '9999-12-26T00:00:00+00:00';

/** 
 * "UP" value for date effectivity with time format in GMT. 
 */
let _UP_DATE_WITH_TIME_IN_GMT = '9999-12-30T00:00:00+00:00';

/** 
 * "SO" (Stock Out) date object for date effectivity in GMT. 
 */
let _SO_JS_DATE = dateTimeService.getJSDate( _SO_DATE_WITH_TIME_IN_GMT );

/** 
 * "UP" date object for date effectivity in GMT. 
 */
let _UP_JS_DATE = dateTimeService.getJSDate( _UP_DATE_WITH_TIME_IN_GMT );

/**
 * Value of SO for unit effectivity. Value is 1 less than the value of UP.
 */
let SO_UNIT_VAL = '2147483646';

/**
 * Value of UP for unit effectivity. Maximum value that a int can hold in 32 bit system.
 */
let UP_UNIT_VAL = '2147483647';

/**
 * UP display string.
 */
let UP = 'UP';

/**
 * SO display string.
 */
let SO = 'SO';

/**
 * Get the localized value from a given key.
 * @param {String} key: The key for which the value needs to be extracted.
 * @return {String} localized string for the input key.
 */
let getLocalizedValueFromKey = function( key ) {
    let resource = 'PSConstants';
    let localTextBundle = localeService.getLoadedText( resource );
    return localTextBundle[ key ];
};

/**
 * Returns the internal value for open ended unit
 * @param {String} unitValue - unit value.
 * @returns {String} unit internal value.
 */
let getOpenEndedUnitInternalValue = function( unitValue ) {
    let unitInternalValue = unitValue;

    if( !isFinite( unitValue ) ) {
        if( UP === unitValue.toUpperCase() ) {
            unitInternalValue = UP_UNIT_VAL;
        } else if( SO === unitValue.toUpperCase() ) {
            unitInternalValue = SO_UNIT_VAL;
        }
    }

    return unitInternalValue;
};

/**
 * Returns the display value for open ended unit
 * @param {String} unitValue - unit value.
 * @param {Boolean} localized - flag to specify if localized value is needed.
 * @returns {String} unit display value.
 */
let getOpenEndedUnitDisplayValue = function( unitValue, localized ) {
    let unitDisplayValue = unitValue;

    if( Number( unitValue ) === Number( UP_UNIT_VAL ) ) {
        unitDisplayValue = localized ? getLocalizedValueFromKey( 'upText' ) : UP;
    } else if( Number( unitValue ) === Number( SO_UNIT_VAL ) ) {
        unitDisplayValue = localized ? getLocalizedValueFromKey( 'soText' ) : SO;
    }

    return unitDisplayValue;
};

/**
 * Returns the display string for unit range
 * @param {String} unitIn - unit in value.
 * @param {String} unitOut - unit out value.
 * @returns {String} unit range display value.
 */
let getUnitRangeDisplayString = function( unitIn, unitOut ) {
    let unitRangeDisplayString = unitIn + '';
    if( unitIn !== unitOut ) {
        unitRangeDisplayString = unitIn + '-' + unitOut;
    }
    return unitRangeDisplayString;
};

/**
 * Process the response and retrieve effectivity list.
 *
 * @param {Object} response - SOA response
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityDataForDisplay = function( response ) {
    let effectivities = [];

    response.effectivityData.forEach( function( effectivityObjectRow ) {
        if( effectivityObjectRow.effectivity ) {
            effectivityObjectRow.effectivity.forEach( function( effectivityObject ) {
                let effectivityInfo = {};
                effectivityInfo.effObj = effectivityObject;
                var unitIn = (effectivityObject.unitIn !== -1 && effectivityObject.unitIn) || (effectivityObject.unitStart !== -1 && effectivityObject.unitStart) || '';
                var unitOut = (effectivityObject.unitOut !== -1 && effectivityObject.unitOut) || (effectivityObject.unitEnd !== -1 && effectivityObject.unitEnd) || '';
                var dateIn = effectivityObject.dateIn || effectivityObject.dateStart || '';
                var dateOut = effectivityObject.dateOut || effectivityObject.dateEnd || '';

                if( unitIn ) {
                    effectivityInfo.effType = 'Unit';

                    let unitStart = getOpenEndedUnitDisplayValue( unitIn, true );
                    let unitEnd = getOpenEndedUnitDisplayValue( unitOut, true );

                    effectivityInfo.effUnitDisplayString = getUnitRangeDisplayString( unitStart, unitEnd );
                    var endItemUid = (effectivityObject.endItem && effectivityObject.endItem.uid) || (effectivityObject.endItemObject && effectivityObject.endItemObject.uid);
                    var endItemObject = cdm.getObject( endItemUid );

                    if( !_.isUndefined( endItemObject.props.object_string ) ) {
                        effectivityInfo.effEndItem = endItemObject.props.object_string.uiValues[ 0 ];
                    }else{                        
                        dataManagementSvc.getProperties( [ endItemUid ], [ 'object_string' ] ).then( function() {
                            effectivityInfo.effEndItem = cdm.getObject( endItemUid ).props.object_string.uiValues[ 0 ];
                        } );
                    }

                } else {
                    effectivityInfo.effType = 'Date';
                    let startDate = dateTimeService.formatDate( dateIn );
                    let endDate = dateTimeService.formatDate( dateOut );

                    let endJSDate = dateTimeService.getJSDate( dateOut );

                    if( dateTimeService.compare( _UP_JS_DATE, endJSDate ) === 0 ) {
                        effectivityInfo.effEndDate = getLocalizedValueFromKey( 'upText' );
                    } else if( dateTimeService.compare( _SO_JS_DATE, endJSDate ) === 0 ) {
                        effectivityInfo.effEndDate = getLocalizedValueFromKey( 'soText' );
                    } else {
                        effectivityInfo.effEndDate = endDate;
                    }
                    effectivityInfo.effStartDate = startDate;
                }
                effectivities.push( effectivityInfo );
            } );
        }
    } );

    return effectivities;
};

/**
 * Returns the date effectivity object for add or update
 *
 * @param {Object} data - declarative view model object
 *
 * @return {Object} - Effectivity object
 */
let getDateEffectivityDataForAddOrUpdate = function( data ) {
    let startDate = data.startDate.dbValue;
    let endDate = data.endDate.dbValue;

    let endDateString = '';

    let startDateString = AwFilterService.instance( 'date' )( startDate, 'yyyy-MM-dd' ) + 'T' +
        AwFilterService.instance( 'date' )( startDate, 'HH:mm:ssZ' );
    if( data.endDateOptions.dbValue === UP ) {
        endDateString = _UP_DATE_WITH_TIME_IN_GMT;
    } else if( data.endDateOptions.dbValue === SO ) {
        endDateString = _SO_DATE_WITH_TIME_IN_GMT;
    } else {
        endDateString = AwFilterService.instance( 'date' )( endDate, 'yyyy-MM-dd' ) + 'T' +
            AwFilterService.instance( 'date' )( endDate, 'HH:mm:ssZ' );
    }

    return {
        dateIn: startDateString,
        dateOut: endDateString,
        unitIn: -1,
        unitOut: -1
    };
};

/**
 * Returns the unit effectivity object for add or update
 *
 * @param {Object} data - declarative view model object
 *
 * @return {Object} - Effectivity object
 */
let getUnitEffectivityDataForAddOrUpdate = function( data ) {
    let start = '-1';
    let end = '-1';

    if( data.unitRangeText.dbValue ) {
        let tokens = data.unitRangeText.dbValue.split( '-' );
        if( tokens.length >= 1 && tokens[ 0 ].length !== 0 ) {
            start = tokens[ 0 ];
        }
        if( tokens.length === 1 ) {
            // If end unit is not specified, we want to set it as start unit
            end = start;
        } else if( tokens.length === 2 && tokens[ 1 ].length !== 0 ) {
            end = tokens[ 1 ];
        }
    }

    let startUnitValue = Number( getOpenEndedUnitInternalValue( start ) );
    let endUnitValue = Number( getOpenEndedUnitInternalValue( end ) );

    return {
        unitIn: startUnitValue,
        unitOut: endUnitValue,
        endItem: {
            uid: appCtxSvc.ctx.expressionEffectivity.author.endItem.uid,
            type: appCtxSvc.ctx.expressionEffectivity.author.endItem.type
        }
    };
};

/**
 * Returns the expression effectivity data for adding new effectivity.
 *
 * @param {Object} data - data object
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityDataForAddOrUpdate = function( data, inputExistingEffectivities ) {
    let effectivities = [];
    //LCS-537628 - AW_Modifying the 'End Item' for one element effectivity entry,modifies the 'End Item' for all element effectivities on occurrence (expression based)
    //cause: Same effectivity objects was being shared betweern multiple functions and was being updated incorrectly
    let existingEffs = _.clone( inputExistingEffectivities );
    if( existingEffs.length > 0 ) {
        existingEffs.forEach( function( eff ) {
            //If it is edit mode
            if( data.effectivity && data.effectivity.effObj !== eff.effObj ) {
                effectivities.push( eff.effObj );
            }
            if( !data.effectivity ) {
                effectivities.push( eff.effObj );
            }
        } );
    }
    if( data.dateOrUnitEffectivityTypeRadioButton.dbValue && !appCtxSvc.ctx.expressionEffectivity.isOnlyUnitEffectivityApplicable ) {
        let effectivity = getDateEffectivityDataForAddOrUpdate( data );
        effectivities.push( effectivity );
    } else {
        let effectivity = getUnitEffectivityDataForAddOrUpdate( data );
        effectivities.push( effectivity );
    }
    return effectivities;
};

/**
 * Returns the expression effectivity data for removing existing effectivity.
 *
 * @param {Object} existingEffs - existing effectivities
 *
 * @return {Object} - List of effectivities
 */
export let getEffectivityDataForRemove = function( existingEffs ) {
    let effRows = [];

    existingEffs.forEach( function( effRow ) {
        if( !effRow.selected ) {
            effRows.push( effRow.effObj );
        }
    } );

    return effRows;
};

/**
 * Initializes the expression effectivity variables on ctx
 */
let initializeExpressionEffectivityOnCtx = function() {
    appCtxSvc.ctx.expressionEffectivity = appCtxSvc.ctx.expressionEffectivity || {};
    appCtxSvc.ctx.expressionEffectivity.author = appCtxSvc.ctx.expressionEffectivity.author || {};
};

/**
 * Initialize context variables and set default end item
 * @param {Object} data - declarative view model
 */
export let initializeEditPanel = function( data ) {
    initializeExpressionEffectivityOnCtx();
    data.dateOrUnitEffectivityTypeRadioButton.dbValue = true;

    if( data.effectivity.effObj.unitIn !== -1 && data.effectivity.effObj.unitOut !== -1 ) {
        data.dateOrUnitEffectivityTypeRadioButton.dbValue = false;

        let unitIn = getOpenEndedUnitDisplayValue( data.effectivity.effObj.unitIn, false );
        let unitOut = getOpenEndedUnitDisplayValue( data.effectivity.effObj.unitOut, false );

        data.unitRangeText.dbValue = getUnitRangeDisplayString( unitIn, unitOut );

        if( data.effectivity.effObj.endItem ) {
            dataManagementSvc.getProperties( [ data.effectivity.effObj.endItem.uid ], [ 'object_string' ] ).then( function() {
                let uiValue = data.effectivity.effObj.endItem.props.object_string.uiValues[ 0 ];
                //Defect Fix: LCS-537628 - AW_Modifying the 'End Item' for one element effectivity entry,modifies the 'End Item' for all element effectivities on occurrence (expression based)
                //cause: Same effectivity objects was being shared betweern multiple functions and was being updated incorrectly
                if( !appCtxSvc.ctx.expressionEffectivity.author.endItem ) {
                    appCtxSvc.ctx.expressionEffectivity.author.endItem = {};
                }
                appCtxSvc.ctx.expressionEffectivity.author.endItem.uiValue = uiValue;
                data.endItemVal.uiValue = uiValue;
            } );
        }
    } else {
        data.startDate.dbValue = new Date( data.effectivity.effObj.dateIn ).getTime();
        data.endDate.dbValue = new Date( data.effectivity.effObj.dateOut ).getTime();
        data.startDate.dateApi.dateObject = dateTimeService.getJSDate( data.startDate.dbValue );
        data.endDate.dateApi.dateObject = dateTimeService.getJSDate( data.endDate.dbValue );

        let endJSDate = dateTimeService.getJSDate( data.effectivity.effObj.dateOut );
        if( dateTimeService.compare( _UP_JS_DATE, endJSDate ) === 0 ) {
            data.endDateOptions.dbValue = UP;
        } else if( dateTimeService.compare( _SO_JS_DATE, endJSDate ) === 0 ) {
            data.endDateOptions.dbValue = SO;
        }
    }
    effectivityUtils.ps0ReplaceButtonClickListener( data );
};

/**
 * Initialize Add panel
 * @param {Object} data - declarative view model
 */
export let initializeAddPanel = function( data ) {
    initializeExpressionEffectivityOnCtx();
    let nullDate = '0000-00-00T00:00:00';
    data.dateOrUnitEffectivityTypeRadioButton.dbValue = true;
    data.endDateOptions.dbValue = 'Date';
    data.startDate.dbValue = new Date( nullDate ).getTime();
    data.endDate.dbValue = new Date( nullDate ).getTime();
    data.startDate.dateApi.dateObject = dateTimeService.getJSDate( data.startDate.dbValue );
    data.endDate.dateApi.dateObject = dateTimeService.getJSDate( data.endDate.dbValue );
    data.unitRangeText.dbValue = '';
    effectivityUtils.loadTopLevelAsEndItem();
    effectivityUtils.ps0ReplaceButtonClickListener( data );
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
let getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if( msgObj.msg.length > 0 ) {
            msgObj.msg += '<BR/>';
        }
        msgObj.msg += object.message;
        msgObj.level = _.max( [ msgObj.level, object.level ] );
    } );
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} serviceData - the service data Object of SOA
 * @return {object} sreturns message object
 */
export let processPartialErrors = function( serviceData ) {
    var msgObj = {
        msg: '',
        level: 0
    };

    if( serviceData.partialErrors ) {
        _.forEach( serviceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }

    return msgObj.msg;
};

export default exports = {
    getEffectivityDataForDisplay,
    getEffectivityDataForAddOrUpdate,
    getEffectivityDataForRemove,
    initializeEditPanel,
    initializeAddPanel,
    processPartialErrors
};

app.factory( 'expressionEffectivityService', () => exports );
