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
 * This module provides access to service APIs which contains the logic for the classification contribution to the
 * compare & arrange panels. It primarily handles communication and syncing states between the compare and arrange
 * widgets.
 * 
 * @module js/classificationPropsService
 * @requires app
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import _ from 'lodash';

let exports = {};

var ICS_SUBCLASS_NAME = 'ics_subclass_name';
var HIDE = 'HIDE';

var currentState = null;

var REGEX_CLASSIFY_PROP = new RegExp( '^CLS_ATTR:(-|)\\d+', 'i' );

/**
 * Removes any classification fields from the fieldList
 * 
 * @param {Array} fieldList - The list of fields to remove classification fields from
 * @return {Array} the list of fields with all classification fields removed.
 */
export let removeClassificationFields = function( fieldList ) {
    //Remove any previously added classification properties. They may not be applicable to the currently selected items.
    _.forEach( fieldList, function( field ) {
        if( field && field.name && REGEX_CLASSIFY_PROP.test( field.name ) ) {
            _.remove( fieldList, field );
        }
    } );

    return fieldList;
};

/**
 * Called when the field definitions are set. If we're showing classification properties, they should be added
 * to the list and returned. Else return the list un-modified.
 * 
 * @param {Array} fieldList - The incoming field list
 * @param {Boolean} showClassificationArrangePanel - TRUE for show classification arrange panel
 * 
 * @return {Array} the field list with classification properties, or the original unmodified list.
 */
export let setFieldDefinitions = function( fieldList, showClassificationArrangePanel ) {
    if( showClassificationArrangePanel ) {
        showClassificationArrangePanel = false;
        //If we're set to show classification props, check to see if the 'master switch' is in place to enable/disable the properties.
        _.forEach( fieldList, function( field ) {
            if( field && field.name === ICS_SUBCLASS_NAME ) {
                showClassificationArrangePanel = true;
                return false;
            }
        } );
    }

    if( !showClassificationArrangePanel || currentState === HIDE ) {
        return exports.removeClassificationFields( fieldList );
    }

    return fieldList;
};

/**
 * Finish load classification properties
 * 
 * @param {Array} classifiedObjectsMap - array of selected objects for compare
 * @param {Array} fieldList - array of field names
 * @param {Object} deferred - A promise object resolved with the classification properties if success or failure
 *            with a reason
 */
export let finishLoadClassificationProperties = function( classifiedObjectsMap, fieldList, deferred ) {
    // Trigger loadClassificationProperties SOA call
};

/**
 * Load classification properties
 * 
 * @param {Array} selectedObjects - array of selected objects for compare
 * @param {Array} fieldList - array of field names
 * 
 * @return {Promise} A promise object resolved with the classification properties
 */
export let loadClassificationProperties = function( selectedObjects, fieldList ) {
    var deferred = AwPromiseService.instance.defer();

    var classifiedObjectsMap = {};
    _.forEach( selectedObjects, function( selObject ) {
        if( selObject ) {
            // Check if the object is classified.
            var subclassName = selObject.props.ics_subclass_name;
            if( subclassName ) {
                var stringDbValue = subclassName.value;
                if( subclassName.valueUpdated ) {
                    stringDbValue = subclassName.newValue;
                }

                if( stringDbValue === '' ) {
                    classifiedObjectsMap[ selObject.uid ] = selObject;
                }
            }
        }
    } );

    //Less than 2 classified objects. Don't load CLS props.
    if( _.keys( classifiedObjectsMap ).length < 2 ) {
        exports.removeClassificationFields( fieldList );
        exports.setFieldDefinitions( fieldList, true );

        deferred.resolve( null );
        return;
    }

    exports.finishLoadClassificationProperties( classifiedObjectsMap, fieldList, deferred );

    return deferred.promise;
};

export default exports = {
    removeClassificationFields,
    setFieldDefinitions,
    finishLoadClassificationProperties,
    loadClassificationProperties
};
/**
 * Provides access to the classificationPropsService
 * 
 * @class classificationPropsService
 * @memberOf NgServices
 */
app.factory( 'classificationPropsService', () => exports );
