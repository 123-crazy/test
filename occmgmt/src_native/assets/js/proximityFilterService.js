//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/proximityFilterService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import localeSvc from 'js/localeService';
import prefService from 'soa/preferenceService';
import occmgmtSubsetUtils from 'js/occmgmtSubsetUtils';
import localeService from 'js/localeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

import 'js/uwPropertyService';
import objectToCSIDGeneratorService from 'js/objectToCSIDGeneratorService';

var exports = {};

var distanceUnitLabel = null;

/**
 * Build a single string filter that is displayed as a link.
 *
 * @param {object} filterValueObject The object that contains details about the filter values available.
 * @returns {Object} The string filter
 */
export let getFilterValue = function( filterValueObject ) {
    var filterValue = {};
    filterValue.name = filterValueObject.stringDisplayValue;
    filterValue.count = filterValueObject.count;
    filterValue.endDateValue = filterValueObject.endDateValue;
    filterValue.endNumericValue = filterValueObject.endNumericValue;
    filterValue.selected = filterValueObject.selected;
    filterValue.startDateValue = filterValueObject.startDateValue;
    filterValue.startStartEndRange = filterValueObject.startEndRange;
    filterValue.startNumericValue = filterValueObject.startNumericValue;
    filterValue.stringValue = filterValueObject.stringValue;
    filterValue.type = 'StringFilter';
    filterValue.showCount = false;
    if( filterValue.name === '' && filterValue.stringValue === '$NONE' ) {
        filterValue.name = 'Unassigned';
    }
    if( filterValueObject.hasChildren ) {
        filterValue.suffixIconId = 'cmdChild';
        filterValue.showSuffixIcon = true;
    }
    return filterValue;
};

/**
 * Get the valid objects for proximity filter
 *
 * @returns {Object} Valid proximity target objects
 */
export let getValidProximityTarget = function() {
    return occmgmtSubsetUtils.validateSelectionsToBeInSingleProduct();
};

/**
 * Function to read the Distance unit of measure preference and the get the localized value for it
 *
 * @return {Promise} A promise that get resolved to return distance label
 */
export let getDistanceUnit = function() {
    var deferred = AwPromiseService.instance.defer();
    prefService.getStringValue( 'RDV_user_defined_units_of_measure' ).then( function( preferenceValue ) {
        var distanceLabel = null;
        if( preferenceValue ) {
            var distanceUnit = _.lowerCase( preferenceValue );

            //If Preference value is set to "UNKNOWN" then set the default UOM as "Meters". This is in synch with AW server code
            if( distanceUnit === 'unknown' ) {
                distanceUnit = 'meters';
            }
            var resource = app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants';
            distanceLabel = localeSvc.getLocalizedText( resource, distanceUnit );
        }
        deferred.resolve( distanceLabel );
    } );
    return deferred.promise;
};

/**
 * Function to apply proximity filter
 *          -update the modified recipe on the appContext
 *          -trigger acePwa.reset event to reload content
 *
 *@param {Number} distanceValue distance value
 *@param {Object[]} validTargets valid targets for proximity
 */
export let applyProximityFilterInRecipe = function( distanceValue, validTargets ) {
    var criteriaVal = [ 'SelectedElement' ];

    var targets = [];
    if ( appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 13 && appCtxSvc.ctx.tcSessionData.tcMinorVersion >= 3 || appCtxSvc.ctx.tcSessionData.tcMajorVersion >= 14 ) {
        for( var i = 0; i < validTargets.length; i++ ) {
            targets[ i ] = objectToCSIDGeneratorService.getCloneStableIdChain( validTargets[ i ] );
        }
    } else {
        for( i = 0; i < validTargets.length; i++ ) {
            targets[ i ] = validTargets[ i ].uid;
        }
    }
    for( i = 0; i < targets.length; i++ ) {
        criteriaVal.push( targets[ i ] );
    }
    //Check if true shoudl work and enable.LCS-171974: Use Trueshape with proximity search - Enabled Trueshape by default. Corresponding UI widget will be exposed later based on need.
    criteriaVal.push( 'True' );

    //CriteriaValues is String array
    //It is observed that sometimes viewModelProperty of type Double hold the string value, as a result there was no need to convert it to string.
    //But sometimes it has double value causing JSON parsing error. So convert the proximity double value to String before sending to server.
    criteriaVal.push( distanceValue.toString() );
    // Set recipe operator based on category logic
    var recipeOperator = appCtxSvc.ctx.aceActiveContext.context.recipeOperator;
    if( appCtxSvc.ctx.panelContext.recipeOperator ) {
       recipeOperator = appCtxSvc.ctx.panelContext.recipeOperator;
    }
    var displayString = createTransientProximityDisplayString( distanceValue, validTargets );
    var proximityCriteria = {
        criteriaType: 'Proximity',
        criteriaOperatorType: recipeOperator,
        criteriaDisplayValue: displayString,
        criteriaValues: criteriaVal,
        subCriteria: []
    };

    // Proximity is not a filter on the URL/state but treated as a recipe. Recipes are not added to the URL.
    // Hence just trigger the reload
    eventBus.publish( 'discoveryFilter.recipeAdded', {
        addedRecipe: proximityCriteria } );
};
/**
 * Function to  get the n-Selected Text
 *@param {String } inputLabel i18nLabel displayNSelected
 *@param {Object[]} validTargets valid targets for proximity
 * @returns{String} formatted Label
 */
export let getNSelectedText = function( inputLabel, validTargets ) {
    return inputLabel.replace( '{0}', validTargets.length );
};

/**
 * Function to toggle the n-Selected link
 * @param {Boolean} value isExpanded flag
 *  @return{Boolean} isExpanded flag
 */
export let toggleExpand = function( value ) {
    return  !value;
};

var createTransientProximityDisplayString = function( distanceValue, validTargets ) {
    var proximityDisplayString = '';
     var uomDisplayString = getDistanceText();

     if( validTargets !== null && validTargets.length > 0 ) {
        var targetDisplayString = '';
        for( var i = 0; i < validTargets.length; i++ ) {
            targetDisplayString = targetDisplayString.concat( validTargets[ i ].props.awb0Archetype.uiValues[ 0 ] );

            if ( i !== validTargets.length - 1 ) {
                targetDisplayString = targetDisplayString.concat( '^' );
            }
        }

        var resource = localeService.getLoadedText( app.getBaseUrlPath() + '/i18n/OccurrenceManagementSubsetConstants' );
        proximityDisplayString = resource.proximityDisplayString
                    .format( distanceValue, uomDisplayString, targetDisplayString );
    }
    return proximityDisplayString;
};

/**
 * initialize
 */
export let initialize = function() {
    var promise = exports.getDistanceUnit();
    if( promise ) {
        promise.then( function( distanceLabel ) {
            distanceUnitLabel = distanceLabel;
        } );
    }
};
/**
 * Function to  get the distance unit
 *
 *  @return{String} distance unit
 */
export let getDistanceText = function() {
    return distanceUnitLabel;
};

export default exports = {
    getFilterValue,
    getValidProximityTarget,
    getDistanceUnit,
    applyProximityFilterInRecipe,
    getNSelectedText,
    toggleExpand,
    initialize,
    getDistanceText
};
app.factory( 'proximityFilterService', () => exports );
