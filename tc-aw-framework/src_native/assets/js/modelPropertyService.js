// Copyright (c) 2020 Siemens

/**
 * @module js/modelPropertyService
 */
import app from 'app';
import viewModelObjectService from 'js/viewModelObjectService';
import _ from 'lodash';

/**
 * Cached reference to the View Model Property Object service
 */

var exports = {};

/**
 * Update the property in the 'target' object with the same value as the 'source' object based on the given
 * 'path' to that property.
 *
 * @param {String} parentPath - Property path to the holder of the value in the 'source' & 'target' Objects.
 *
 * @param {String} attrHolderPropName - Name of the property in the 'propAttrHolder' class to apply.
 *
 * @param {ViewModelObject} sourceObject - The 'source' of the value to apply.
 *
 * @param {ViewModelObject} targetObject - The 'target' the value will be applies to.
 */
export let updateProperty = function( parentPath, attrHolderPropName, sourceObject, targetObject ) {
    var paths = [];

    var prefix = parentPath + '.';

    switch ( attrHolderPropName ) {
        case 'dbValue':
            paths.push( prefix + 'dbValues' );
            paths.push( prefix + 'dbValue' );
            paths.push( prefix + 'value' );
            break;

        case 'displayName':
            paths.push( prefix + 'propertyName' );
            paths.push( prefix + 'propertyDisplayName' );
            break;

        case 'dispValue':
            paths.push( prefix + 'displayValues' );
            paths.push( prefix + 'uiValue' );
            paths.push( prefix + 'uiValues' );
            break;

        case 'isArray':
            paths.push( prefix + 'isArray' );
            break;

        case 'isEditable':
            paths.push( prefix + 'isEditable' );
            break;

        case 'isRequired':
            paths.push( prefix + 'isRequired' );
            break;

        case 'labelPosition':
            paths.push( prefix + 'propertyLabelDisplay' );
            break;

        case 'requiredText':
            paths.push( prefix + 'requiredText' );
            break;

        case 'type':
            paths.push( prefix + 'type' );
            break;
    }

    _.forEach( paths, function( path ) {
        var newValue = _.get( sourceObject, path );

        _.set( targetObject, path, newValue );
    } );
};

/**
 * @param {Object} propAttrHolder - An object that holds the following attributes:
 *
 * <pre>
 *           - {String} displayName - Display name of the property.
 *           - {String} type - {'STRING', 'INTEGER', 'BOOLEAN', 'DATE', 'FLOAT', 'CHAR'}
 *           - {Boolean} isRequired - If the property is required or not
 *           - {Boolean} isEditable - If the Property is editable or not
 *           - {Object} dbValue - Default value
 *           - {String} dispValue - Display Value
 *           - {Object} labelPosition - Position on panel.
 *           - {Boolean} isArray - If the Property is an array or not
 *           - {String} requiredText - The text to display in the required field     *
 * </pre>
 *
 * @return {ViewModelProperty} returns newly created ViewModelProperty
 */
export let createViewModelProperty = function( propAttrHolder ) { // eslint-disable-line
    /**
     * Use the given 'propName' if 'propAttrHolder' has one, else, use the 'displayName' as the 'propName'.
     */
    var prop = _.cloneDeep( propAttrHolder );
    prop.displayName = _.isUndefined( propAttrHolder.displayName ) ? '' : propAttrHolder.displayName;
    var propName = _.isUndefined( propAttrHolder.propName ) ? prop.displayName : propAttrHolder.propName;

    var type = propAttrHolder.type;
    var hasLOV = false;

    prop.isArray = _.isBoolean( propAttrHolder.isArray ) ? propAttrHolder.isArray :
        propAttrHolder.isArray === 'true';

    prop.isEditable = _.isBoolean( propAttrHolder.isEditable ) ? propAttrHolder.isEditable :
        propAttrHolder.isEditable !== 'false';

    prop.isRequired = _.isBoolean( propAttrHolder.isRequired ) ? propAttrHolder.isRequired :
        propAttrHolder.isRequired === 'true';

    if( propAttrHolder.isEnabled ) {
        prop.isEnabled = _.isBoolean( propAttrHolder.isEnabled ) ? propAttrHolder.isEnabled :
            propAttrHolder.isEnabled !== 'false';
    } else {
        prop.isEnabled = prop.isEditable;
    }

    var displayValues = [];
    var uw_dbValue = propAttrHolder.dbValue;
    if( propAttrHolder.value ) {
        uw_dbValue = propAttrHolder.value;
    }
    var tempDisplayValues = propAttrHolder.dispValue;
    if( propAttrHolder.displayValue ) {
        tempDisplayValues = propAttrHolder.displayValue;
    }

    if( !uw_dbValue && type === 'DATE' || propAttrHolder.type === 'DATETIME' ) {
        if( uw_dbValue !== '' && !isNaN( Date.parse( uw_dbValue ) ) ) {
            var date = new Date( uw_dbValue );
            uw_dbValue = date.getTime();
        }
        type = 'DATE';
    }

    if( !_.isUndefined( tempDisplayValues ) ) {
        if( _.isArray( tempDisplayValues ) ) {
            displayValues = tempDisplayValues;
        } else {
            displayValues.push( tempDisplayValues );
        }
    }

    /**
     * If this is an array property, and the type does not contain the 'ARRAY' postfix, add it automatically.
     */
    if( prop.isArray && type && type.search( 'ARRAY' ) === -1 ) {
        type += 'ARRAY';
    }

    if( propAttrHolder.hasLov ) {
        hasLOV = true;
    }
    prop.propType = type;
    prop.hasLOV = hasLOV;
    prop.value = uw_dbValue;
    prop.displayValue = displayValues;
    prop.dbValues = propAttrHolder.dbValue ? propAttrHolder.dbValue : [];

    var viewProp = viewModelObjectService.constructViewModelProperty( prop, propName, null, true );

    if( type === 'DATE' ) {
        viewProp.dateApi = viewProp.dateApi || {};
        viewProp.dateApi.isDateEnabled = true;
        viewProp.dateApi.isTimeEnabled = false;
        if( propAttrHolder.type === 'DATETIME' ) {
            viewProp.dateApi.isTimeEnabled = true;
        }
    }

    if( type === 'DATETIME' ) {
        viewProp.dateApi = viewProp.dateApi || {};
        viewProp.dateApi.isDateEnabled = true;
        viewProp.dateApi.isTimeEnabled = true;
    }

    return viewProp;
};

exports = {
    updateProperty,
    createViewModelProperty
};
export default exports;
/**
 * Service to define for creating the model data in view model format in panel.
 *
 * @member modelPropertyService
 * @param viewModelObjectService
 * @memberof NgServices
 */
app.factory( 'modelPropertyService', () => exports );
