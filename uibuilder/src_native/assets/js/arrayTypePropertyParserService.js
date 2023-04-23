// Copyright (c) 2020 Siemens

/**
 * @module js/arrayTypePropertyParserService
 */
import app from 'app';
import _ from 'lodash';
import viewModelObjectService from 'js/viewModelObjectService';

var exports = {};

class PropertyItem {
    constructor() {
        this.viewModelObjects = {};
        this.getUpdatedValue = this.saveArrayTypeProperties;
    }

    createModelObjects( property, propertyValue ) {
        var propertiesArray = [];
        propertyValue.forEach( ( modelProperty ) => {
            var modelObj = exports.generateModelObject( modelProperty[ property.identifier ] );
            property.items.forEach( ( property ) => {
                modelObj.props[ property.name ] = exports.generateModelObjectProps( property, modelProperty );
            } );
            modelObj = viewModelObjectService.constructViewModelObject( modelObj );
            viewModelObjectService.setEditableStates( modelObj, true, true, true );
            propertiesArray.push( modelObj );
        } );
        this.viewModelObjects = propertiesArray;
    }

    saveArrayTypeProperties( property, propertyValue ) {
        var newPropertyValue = [];
        this.viewModelObjects.forEach( ( updatedProperty ) => {
            var isExistingProperty = propertyValue.find( ( existingProperty ) => {
                return existingProperty[ property.identifier ] === updatedProperty.uid;
            } );

            if( isExistingProperty ) {
                if( updatedProperty.props ) {
                    for( var key in updatedProperty.props ) {
                        if( isExistingProperty[ key ] !== updatedProperty.props[ key ].dbValue ) {
                            isExistingProperty[ key ] = updatedProperty.props[ key ].dbValue;
                        }
                    }
                    newPropertyValue.push( isExistingProperty );
                }
            } else {
                var obj = {};
                _.forOwn( updatedProperty.props, ( value, key ) => {
                    obj[ property.identifier ] = value.parentUid;
                    obj[ key ] = value.dbValue;
                } );
                newPropertyValue.push( obj );
            }
        } );

        return newPropertyValue;
    }
}

export let generateModelObject = function( identifier ) {
    return {
        id: identifier,
        uid: identifier,
        modelType: 'dummy',
        props: {}
    };
};

export let generateModelObjectProps = function( property, modelProperty ) {
    return {
        displayname: property.name,
        isEditable: true,
        isModifiable: true,
        isEnabled: true,
        displayValue: [ modelProperty[ property.name ] ],
        value: modelProperty[ property.name ],
        propType: property.type.toUpperCase(),
        type: property.type.toUpperCase()
    };
};

export let parseArrayTypeProperty = ( arrayProperty, propertyValue, localizedValues ) => {
    var propitem = new PropertyItem();
    propitem.createModelObjects( arrayProperty, propertyValue, localizedValues );
    return propitem;
};

exports = {
    generateModelObject,
    generateModelObjectProps,
    parseArrayTypeProperty
};
export default exports;

app.factory( 'arrayTypePropertyParserService', () => exports );
