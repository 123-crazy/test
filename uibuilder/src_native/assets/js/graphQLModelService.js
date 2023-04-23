// Copyright (c) 2020 Siemens
// TEST
/**
 * This module provides a way for declarative framework to do outgoing calls like SOA or REST.
 *
 * @module js/graphQLModelService
 *
 * @namespace graphQLModelService
 */
import app from 'app';
import awTableSvc from 'js/awTableService';
import uwPropertySvc from 'js/uwPropertyService';
import viewModelObjectSvc from 'js/viewModelObjectService';
import localeSvc from 'js/localeService';
import _ from 'lodash';

// eslint-disable-next-line valid-jsdoc

/**
 * Path in webserver to directory containing all icon images.
 */
var _imageBaseUrl = 'darsi/static';

/**
 * Locale map for localized string values
 */
var _localeMap = {};

/**
 * Define public API
 */
var exports = {};

/**
 * Type name of common command builder {ViewModelObject} instances.
 */
export let TYPE = {
    Anchor: 'QuickAppAnchor',
    AnchorNode: 'QuickAppAnchorNode',
    ChildCommand: 'QuickAppChildCommand',
    Command: 'QuickAppCommand',
    Handler: 'QuickAppHandler',
    Placement: 'QuickAppPlacement',
    PlacementNode: 'QuickAppPlacementNode'
};

export let loadConfiguration = function() {
    localeSvc.getLocalizedTextFromKey( 'CommandBuilderMessages.commandTitle', true ).then( result => _localeMap.title = result );
};

/**
 * @param {GraphQLObject} gqlResult - An object from a GraphQL query.
 * @param {String} vmoType - The desired type of the resulting object (i.e. memberof exports.TYPE).
 * @param {String} uidPrefix - Prefix to the arbitrary UID to assign.
 * @param {String} uid - The ID to set on the result (appended after any prefix)
 *
 * @returns {IModelObject} New object set with the given properties
 */
export let convertGqlObjectToModelObject = function( gqlResult, vmoType, uidPrefix, uid ) {
    var modelObject = {};

    modelObject.type = vmoType;
    modelObject.uid = uidPrefix ? uidPrefix + uid : uid;

    modelObject.props = {};

    _.forEach( gqlResult, function( propValue, propName ) {
        var dbValue = '';
        var uiValue = '';

        if( propValue !== null && propValue !== undefined ) {
            if( _.isString( propValue ) ) {
                dbValue = propValue;
                uiValue = propValue;
            } else if( _.isNumber( propValue ) ) {
                dbValue = propValue;
                uiValue = propValue.toString();
            } else if( _.isArray( propValue ) ) {
                _.forEach( propValue, function( elemValue ) {
                    _.forEach( elemValue, function( propValue2, propName2 ) {
                        var dbValue2 = '';
                        var uiValue2 = '';
                        var prop = _.get( modelObject.props, propName2 );
                        if( !prop ) {
                            prop = {
                                dbValues: [],
                                uiValues: []
                            };

                            modelObject.props[ propName2 ] = prop;
                        }

                        if( _.isNumber( propValue2 ) ) {
                            dbValue2 = propValue2;
                            uiValue2 = propValue2.toString();
                        } else if( _.isObject( propValue2 ) ) {
                            if( propValue2.id ) {
                                dbValue2 = propValue2.id;
                                uiValue2 = propValue2.id;
                            } else {
                                dbValue2 = propValue2;
                                uiValue2 = propValue2.toString();
                            }
                        }

                        prop.dbValues.push( dbValue2 );
                        prop.uiValues.push( uiValue2 );
                    } );
                } );
            } else if( _.isObject( propValue ) ) {
                dbValue = '';

                if( propValue.en ) {
                    dbValue = propValue.en;
                    uiValue = dbValue.toString();
                } else if( propValue.title ) {
                    dbValue = propValue.id;
                    uiValue = propValue.title.value;
                } else if( propValue.id ) {
                    dbValue = propValue.id;
                    uiValue = dbValue.toString();
                } else if( propValue.value ) {
                    dbValue = propValue.value;
                    uiValue = dbValue.toString();
                } else if( propValue.icon ) {
                    dbValue = propValue.icon.id;
                    uiValue = dbValue.toString();
                }
            }
        }

        modelObject.props[ propName ] = {
            dbValues: [ dbValue ],
            uiValues: [ uiValue ]
        };
    } );

    /**
     * Assure there is a 'cmdId' & 'icon' property when needed.
     */
    var value;

    switch ( vmoType ) {
        case exports.TYPE.Command:
        case exports.TYPE.ChildCommand:
            if( !modelObject.props.cmdId && modelObject.props.id ) {
                value = _.get( modelObject, 'props.id.dbValues.0' );
                if( value ) {
                    modelObject.props.cmdId = {
                        dbValues: [ value ],
                        uiValues: [ value ]
                    };
                }
            }

            if( !modelObject.props.icon && modelObject.props.cmdIcon ) {
                value = _.get( modelObject, 'props.cmdIcon.dbValues.0' );
                if( value ) {
                    modelObject.props.icon = {
                        dbValues: [ value ],
                        uiValues: [ value ]
                    };
                }
            }
            break;

        case exports.TYPE.Placement:
        case exports.TYPE.PlacementNode:
            if( !modelObject.props.cmdId && modelObject.props.parentCommand ) {
                value = _.get( modelObject, 'props.parentCommand.dbValues.0' );

                if( value ) {
                    modelObject.props.cmdId = {
                        dbValues: [ value ],
                        uiValues: [ value ]
                    };
                }
            }
            break;

        default:
            break;
    }

    return modelObject;
};

/**
 * @param {Object} gqlValue - Property value from a {GraphQLObject}
 * @param {String} propName - Name of the property.
 * @param {Boolean} makeEditable - TRUE if the property should be marked as 'editable'
 * @param {Boolean} makeRequired - TRUE if the property should be marked as 'required'
 * @param {String} renderingHint - rendering hint
 *
 * @return {ViewModelProperty} New object initialized with given input.
 */
export let convertGqlPropToVMProp = function( gqlValue, propName, propDisplayNameMap, makeEditable, makeRequired, renderingHint ) {
    var propDispName = propDisplayNameMap[ propName ];
    var propType = 'STRING';
    var dbValue = '';
    var displayValues = [];

    if( gqlValue !== null && gqlValue !== undefined ) {
        if( _.isString( gqlValue ) ) {
            dbValue = gqlValue;
            displayValues.push( gqlValue );
        } else if( _.isNumber( gqlValue ) ) {
            propType = 'INTEGER';
            dbValue = gqlValue;
            displayValues.push( gqlValue.toString() );
        } else if( _.isArray( gqlValue ) ) {
            propType = 'STRINGARRAY';
            dbValue = [];
            var displayValue = '';
            _.forEach( gqlValue, function( arrayElement ) {
                if( _.isString( arrayElement ) ) {
                    propType = 'STRINGARRAY';
                    displayValue = arrayElement;
                } else if( _.isNumber( arrayElement ) ) {
                    propType = 'INTEGERARRAY';
                    displayValue = arrayElement.toString();
                } else if( _.isObject( arrayElement ) ) {
                    propType = 'OBJECTARRAY';
                    displayValue = JSON.stringify( arrayElement );
                }

                dbValue.push( arrayElement );
                displayValues.push( displayValue );
            } );
        } else if( _.isObject( gqlValue ) ) {
            switch ( propName ) {
                case 'title':
                case 'description':
                case 'selectedTitle':
                case 'selectedDescription':
                    dbValue = gqlValue.value ? gqlValue.value : '';
                    displayValues.push( dbValue );
                    break;

                case 'cmdTitle':
                    dbValue = gqlValue.value;
                    displayValues.push( dbValue );
                    propName = 'title';
                    break;

                case 'cmdIcon':
                case 'icon':
                case 'selectedIcon':
                    dbValue = gqlValue.id;
                    displayValues.push( dbValue );
                    break;

                case 'command':
                    propType = 'OBJECT';
                    dbValue = gqlValue;
                    displayValues.push( JSON.stringify( dbValue ) );
                    break;
                default:
                    dbValue = gqlValue.value ? gqlValue.value : '';
                    if( _.isObject( gqlValue ) ) {
                        propType = 'OBJECT';
                        dbValue = gqlValue;
                        displayValues.push( JSON.stringify( dbValue ) );
                    } else {
                        displayValues.push( dbValue );
                    }
                    break;
            }
        }
    }

    var vmProp = uwPropertySvc.createViewModelProperty( propName, propDispName, propType, dbValue, displayValues );

    if( _.isObject( gqlValue ) ) {
        if( propName === 'title' || propName === 'description' ) {
            vmProp.titleKey = gqlValue.titleKey ? gqlValue.titleKey : '';
            vmProp.titleSource = gqlValue.titleSource ? gqlValue.titleSource : '';
        } else if( propName === 'selectedTitle' || propName === 'selectedDescription' ) {
            vmProp.titleKey = gqlValue.selectedTKey ? gqlValue.selectedTKey : '';
            vmProp.titleSource = gqlValue.selectedTSource ? gqlValue.selectedTSource : '';
        }
    } else if( !vmProp.renderingHint ) {
        vmProp.renderingHint = 'textbox';
        if( renderingHint ) {
            vmProp.renderingHint = renderingHint;
        }
    }

    if( makeRequired ) {
        uwPropertySvc.setIsRequired( vmProp, true );
    }

    if( makeEditable ) {
        uwPropertySvc.setIsPropertyModifiable( vmProp, true );
        uwPropertySvc.setEditState( vmProp, true, true );
    }

    return vmProp;
};

/**
 * Convert properties of a {GraohQLObject} to a collection of {ViewModelProperty} objects.
 *
 * @param {GraphQLObject} gqlObject - An object from a GraphQL query.
 * @param {StringMap} propDisplayNameMap - Map of propName to the propDisplayName for current locale.
 * @param {StringArray} skipPropNames - (Optional) Array of property names to skip (presumably to be processed
 * elsewhere) or NULL to processes all properties.
 * @param {Boolean} makeEditable - TRUE if the property should be marked as 'editable'
 * @param {Boolean} makeRequired - TRUE if the property should be marked as 'required'
 * @param {String} renderingHint - rendering hint
 *
 * @returns {ViewModelPropArray} New array of view model properties.
 */
export let convertGqlPropsToVMProps = function( gqlObject, propDisplayNameMap, skipPropNames, makeEditable, makeRequired, renderingHint ) {
    var vmProps = [];

    var makeEditableIn = makeEditable;
    var makeRequiredIn = makeRequired;

    if( _.isUndefined( makeEditableIn ) ) {
        makeEditableIn = false;
    }

    if( _.isUndefined( makeRequiredIn ) ) {
        makeRequiredIn = false;
    }

    _.forEach( gqlObject, function( gqlValue, propName ) {
        if( !skipPropNames || !_.includes( skipPropNames, propName ) ) {
            var vmProp = exports.convertGqlPropToVMProp( gqlValue, propName, propDisplayNameMap, makeEditableIn, makeRequiredIn, renderingHint );
            vmProps.push( vmProp );
        }
    } );

    return vmProps;
};

/**
 * Create a new {ViewModelObject} who's {ViewModelProperty} name/values are set by the given
 * {GraphQLObject}'s properties.
 *
 * Note: A GraphQL 'item' is any {GraphQLObject} with an 'id' and optional 'icon' property.
 *
 * @param {GraphQLObject} gqlItem - A single result object from a GrqphQL Query.
 * @param {String} vmoType - The 'type' to assign the resulting VMO (i.e. memberof exports.TYPE).
 * @param {Boolean} makeEditable - TRUE if all properties should be marked as 'editable'
 *
 * @returns {ViewModelObject} A new VMO initialized based on properties in the given input.
 */
export let convertGqlItemToVMO = function( gqlItem, vmoType, makeEditable ) {
    var modelObject = exports.convertGqlObjectToModelObject( gqlItem, vmoType, '', gqlItem.id );

    var vmo = viewModelObjectSvc.constructViewModelObjectFromModelObject( modelObject );

    _.forEach( vmo.props, function( vmProp ) {
        exports.assureVMPropType( vmProp );

        if( makeEditable ) {
            /**
             * Fix up edit state
             */
            uwPropertySvc.setIsPropertyModifiable( vmProp, true );
            uwPropertySvc.setEditState( vmProp, true, true );
        }
    } );

    var icon = _.get( gqlItem, 'icon' );
    exports.updateIcon( icon, vmo );

    return vmo;
};

/**
 * Update type icon for viewModelObject
 *
 * @param {Icon} icon - graphql icon object
 * @param {ViewModelObject} vmo - viewModelObject where type icon needs to be updated
 */
export let updateIcon = function( icon, vmo ) {
    if( icon && vmo ) {
        vmo.typeIconURL = icon.url ? `${_imageBaseUrl}/${icon.url}` : `${_imageBaseUrl}/image/${icon.id}24.svg`;
    }
};

/**
 * Create a new {ViewModelObject} who's {ViewModelProperty} name/values are set by the given
 * {GraphQLObject}'s properties.
 *
 * Note: A GraphQL 'item' is any {GraphQLObject} with an 'id' and optional 'icon' property.
 *
 * @param {GraphQLObject} gqlItem - A single result object from a GrqphQL Query.
 * @param {String} vmoType - The 'type' to assign the resulting VMO.
 * @param {Boolean} makeEditable - TRUE if all properties should be marked as 'editable'
 * @param {StringMap} propDisplayNameMap - Map of propName to the propDisplayName for current locale.
 * @param {Number} levelNdx - The # of levels down from the 'root' of the tree-table.
 * @param {Number} childNdx - The index to this 'child' within the immediate 'parent'.
 * <P>
 * Note: This 'childNdx' information is meant to help when only a partial (or sparse) range of children have
 * been loaded. This index is stable within the 'parent' and not representative of the order based on the
 * 'id'.
 *
 * @param {StringArray} skipPropNames - Array of property names to skip (presumably to be processed
 * elsewhere) or NULL to processes all properties.
 *
 * @param {String} pathTitle - Object property path within 'gqlItem' to the Title text to use as the
 * 'displayName' (e.g. 'title.value').
 *
 * @param {String} pathIcon - Object property path within 'gqlItem' to the  related icon (e.g.
 * 'icon.id').
 *
 * @returns {ViewModelTreeNode} A new VMO initialized based on properties in the given input.
 */
export let convertGqlItemToVMTreeNode = function( gqlItem, vmoType, makeEditable, propDisplayNameMap,
    levelNdx, childNdx, skipPropNames, pathTitle, pathIcon ) {
    /**
     * Determine displayName as title (or ID is no title)
     */
    var title = _.get( gqlItem, pathTitle );

    var displayName = title || gqlItem.id;

    /**
     * Determine icon URL
     */
    var icon = _.get( gqlItem, pathIcon );
    var iconURL = null;
        if ( icon ) {
            iconURL = icon.url ? `${_imageBaseUrl}/${icon.url}` : `${_imageBaseUrl}/image/${icon.id}24.svg`;
        }

    /**
     * Create node and set its vmProps based on GQL props.
     */
    var vmNode = awTableSvc.createViewModelTreeNode( gqlItem.id, vmoType, displayName, levelNdx, childNdx, iconURL );

    var vmProps = exports.convertGqlPropsToVMProps( gqlItem, propDisplayNameMap );

    vmNode.props = {};

    _.forEach( vmProps, function( vmProp ) {
        if( !skipPropNames || !_.includes( skipPropNames, vmProp.propertyName ) ) {
            exports.assureVMPropType( vmProp );

            if( makeEditable ) {
                /**
                 * Fix up edit state
                 */
                uwPropertySvc.setIsPropertyModifiable( vmProp, true );
                uwPropertySvc.setEditState( vmProp, true, true );
            }

            vmNode.props[ vmProp.propertyName ] = vmProp;
        }
    } );

    return vmNode;
};

/**
 * Convert a collection of {GraphQLObject} to shows the 'id' as 'internal' and 'title' as 'display' in an
 * {LOVEntry}.
 * <P>
 * Note: A GraphQL 'Item' is any object with an 'id' and an optional 'title' property.
 *
 * @param {GraphQLItemArray} gqlItems - Collection of {GraphQL} objects to use.
 *
 * @return {LOVEntryArray} Parsed lov entries array.
 */
export let convertGqlItemsToLovEntries = function( gqlItems ) {
    if( gqlItems ) {
        return gqlItems.map( obj => {
            return {
                propInternalValue: obj.id,
                propDisplayValue: obj.title ? obj.title.value : obj.id,
                propDisplayDescription: obj.id
            };
        } );
    }

    return [];
};

/**
 * Convert objects and parse them in such a way it shows the data correctly in LOVs
 *
 * @param {Object} gqlI18Ns - array of gqlResult objects.
 *
 * @return {Array} Parsed lov entries array
 */
export let convertTitleI18NsToLovEntries = function( gqlI18Ns ) {
    return gqlI18Ns.map( i18nData => {
        return {
            propDisplayValue: i18nData.value,
            propInternalValue: i18nData.value,
            propDisplayDescription: 'Key: ' + i18nData.key + ' \nSource: ' + i18nData.source,
            i18nKey: i18nData.key,
            i18nSource: i18nData.source
        };
    } );
};

/**
 * Assure that the 'type' property of the given {ViewModelProperty} is either already set or is upadated
 * based on the JS type of the current 'dbValue'.
 * <P>
 * The default 'STRING' is no 'dbValue' is currently set.
 *
 * @param {ViewModelProperty} vmProp - The {ViewModelProperty} to test/update.
 */
export let assureVMPropType = function( vmProp ) {
    if( !vmProp.type ) {
        vmProp.type = 'STRING';

        if( _.isNumber( vmProp.dbValue ) ) {
            vmProp.type = 'INTEGER';
        } else if( _.isArray( vmProp.dbValue ) && vmProp.dbValues.length ) {
            /**
             * Use the type of the 1st array entry as the basis for the type.
             */
            if( _.isNumber( vmProp.dbValues[ 0 ] ) ) {
                vmProp.type = 'INTEGER';
            }
        }
    }
};

exports = {
    TYPE,
    convertGqlObjectToModelObject,
    convertGqlPropToVMProp,
    convertGqlPropsToVMProps,
    convertGqlItemToVMO,
    updateIcon,
    convertGqlItemToVMTreeNode,
    convertGqlItemsToLovEntries,
    convertTitleI18NsToLovEntries,
    assureVMPropType
};
export default exports;
/**
 * The service to perform GraphQL calls.
 *
 * @member graphQLService
 * @memberof NgServices
 */
app.factory( 'graphQLModelService', () => exports );
