// Copyright (c) 2020 Siemens

/**
 * Service to fetch extended type icons Requires typeIconsRegistry.json definition at each module level.
 *
 * @module js/typeIconsRegistryService
 */
import app from 'app';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import adapterService from 'js/adapterService';
import _ from 'lodash';
import expressionParserUtils from 'js/expressionParserUtils';
import cfgSvc from 'js/configurationService';

import 'config/typeIconsRegistry';

let exports;

let _typeIconsRegistry;

/**
 * Returns the custom icon registered against current vmo
 * @param {Object} type --- json type
 * @param {Object} modelType -- ModelType name or array
 * @param { viewmodelObject } obj --- In case of dataparser when modelType and typeHierarchy provided on VMO
 *
 * @return {String} Name of icon to be used against current vmo
 */
export let isObjOfAnyTypeNames = function( type, modelType, obj ) {
    var isValid = false;
    if( type.names ) {
        for( var i = 0; i < type.names.length; i++ ) {
            let typeName = type.names[ i ];
            // If the type is purely a client view model object
            if( type.isClientViewModelObject === true && modelType === typeName ) {
                isValid = true;
            } else {
                isValid = cmm.isInstanceOf( typeName, modelType );
            }
            if( !isValid && obj && obj.typeHierarchy && obj.typeHierarchy.indexOf( typeName ) > -1 ) {
                isValid = true;
            }
            if( isValid ) {
                return true;
            }
        }
    }

    return isValid;
};

export let getIconForType = function( type, obj ) {
    if( type.names && obj && obj.modelType && obj.modelType.name ) {
        // If the type configured in json matches with the object which is being evaluated
        var isValid = exports.isObjOfAnyTypeNames( type, obj.modelType, obj );
        if( isValid ) {
            /* -
             * If its a valid sub type,( in order)
             *     1. check if a icon file name has been associated
             *     2. if a property has been mentioned
             *     3. If a condition has been mentioned to evaluate the property
             *     4. If a nested type has been mentioned for a property
            -*/
            if( type.iconFileName ) {
                return type.iconFileName + '.svg';
            } else if( type.prop && type.prop.names ) {
                var prop = type.prop;
                var propNames = prop.names;
                var conditionVerdict = false;
                for( var index in propNames ) {
                    var propName = propNames[ index ];
                    var vmoPropVal = obj.props[ propName ];
                    if( vmoPropVal ) {
                        if( prop.conditions && prop.iconFileName ) {
                            conditionVerdict = expressionParserUtils.evaluateConditions( prop.conditions,
                                obj );
                            if( conditionVerdict ) {
                                break;
                            }
                        } else if( prop.type ) {
                            // it expects a property to have a OBJECT type of value only
                            var refObjUid = null;
                            if( vmoPropVal.dbValue ) {
                                refObjUid = vmoPropVal.dbValue;
                            } else if( vmoPropVal.dbValues && vmoPropVal.dbValues.length > 0 ) {
                                refObjUid = vmoPropVal.dbValues[ 0 ];
                            }

                            var isType = cmm.isTypeUid( refObjUid );
                            if( isType ) {
                                var typeObj = cmm.getType( refObjUid );
                                if( typeObj ) {
                                    return cmm.getTypeIconFileName( typeObj );
                                }
                            } else {
                                var refObj = cdm.getObject( refObjUid );
                                if( refObj ) {
                                    //call getCustomIcon to ensure type icon configuration on "nested" type is honored
                                    //if that returns null revert to previous behavior
                                    return exports.getIconForType( prop.type, refObj );
                                }
                            }
                        }
                    } else {
                        // this means property is not loaded in client
                    }
                }
                if( prop.conditions && prop.iconFileName ) {
                    if( conditionVerdict ) {
                        return prop.iconFileName + '.svg';
                    }
                }
            } else {
                return cmm.getTypeIconFileName( obj.modelType );
            }
        }
    }
    return null;
};

/**
 * Returns the custom thumbnail current vmo based on thumbnail configuration
 * @param {Object} type - the registry entry
 * @param {Object} obj - the vmo
 *
 * @return {Object} vmo containing the thumbnail information
 */
export let getVmoForThumbnail = function( type, obj ) {
    if( type.names && obj && obj.modelType ) {
        // If the type configured in json matches with the object which is being evaluated
        var isValid = exports.isObjOfAnyTypeNames( type, obj.modelType, obj );

        if( isValid ) {
            if( type.prop && type.prop.names ) {
                var prop = type.prop;
                var propNames = prop.names;
                for( var index in propNames ) {
                    var propName = propNames[ index ];
                    var vmoPropVal = obj.props[ propName ];
                    if( vmoPropVal ) {
                        if( prop.type ) {
                            // it expects a property to have a OBJECT type of value only
                            var refObjUid = null;
                            if( vmoPropVal.dbValue ) {
                                refObjUid = vmoPropVal.dbValue;
                            } else if( vmoPropVal.dbValues && vmoPropVal.dbValues.length > 0 ) {
                                refObjUid = vmoPropVal.dbValues[ 0 ];
                            }

                            var isType = cmm.isTypeUid( refObjUid );
                            if( isType ) {
                                // invalid case
                            } else {
                                var refObj = cdm.getObject( refObjUid );
                                if( refObj ) {
                                    return exports.getVmoForThumbnail( prop.type, refObj );
                                }
                            }
                        }
                    } else {
                        // this means property is not loaded in client
                    }
                }
            } else {
                return obj;
            }
        }
    }
    return null;
};

/**
 * Returns the custom thumbnail registered against current vmo
 *
 * @param {Object} vmo - the vmo to get custom thumbnail for
 *
 * @return {Object} vmo on which thumbnail information is present
 */
export let getCustomVmoForThumbnail = function( vmo ) {
    var customVmo = null;
    if( vmo && vmo.modelType ) {
        _.forEach( _typeIconsRegistry, function( typeObj ) {
            if( typeObj && typeObj.thumbnail ) {
                customVmo = exports.getVmoForThumbnail( typeObj.thumbnail, vmo );
                if( customVmo ) {
                    return false; // break
                }
            }
        } );
    }
    return customVmo;
};

/**
 * Returns the custom icon registered against current vmo
 *
 * @param {Object} vmo - the vmo to check
 *
 * @return {String} Name of icon to be used against current vmo
 */
export let getCustomIcon = function( vmo ) {
    var finalTypeIconFileName = null;
    var finalPriority = -1;
    let adaptedObj = null;
    let adaptedRequired = vmo.type !== getPropsObjectType( vmo );

    if( adaptedRequired ) {
        adaptedObj = adapterService.getAdaptedObjectsSync( [ vmo ] )[ 0 ];
    }

    let relevantDefinitions = getRelevantDefs( vmo, adaptedObj );
    if( vmo && vmo.modelType && relevantDefinitions.length > 0 ) {
        relevantDefinitions.sort( function( def1, def2 ) {
            let priority1 = def1.priority ? def1.priority : 1;
            let priority2 = def2.priority ? def2.priority : 1;

            return priority1 < priority2 ? 1 : -1;
        } );
        _.forEach( relevantDefinitions, function( typeObj ) {
            if( typeObj && typeObj.type ) {
                /* If the current priority is greater than priority of any consecutive definitions, don't need to evaluate... */
                var currPriority = typeObj.priority ? typeObj.priority : 1;
                if( finalPriority > currPriority ) {
                    return;
                }
                var currTypeIconName = null;
                if( adaptedRequired ) {
                    var adaptedIcon = exports.getIconForType( typeObj.type, adaptedObj );
                    if( adaptedIcon ) {
                        currTypeIconName = adaptedIcon;
                        currPriority = typeObj.priority ? typeObj.priority : currPriority + 1;
                    }
                }

                if( !currTypeIconName ) {
                    currTypeIconName = exports.getIconForType( typeObj.type, vmo );
                }

                if( currTypeIconName && currPriority > finalPriority ) {
                    finalPriority = currPriority;
                    finalTypeIconFileName = currTypeIconName;
                }
            }
        } );
    }
    return finalTypeIconFileName;
};

/**
 * Example Case ( List with Summary View, Summary view has 1 objectset table )
 * --------------------------------------------------
 * | Home Folder           |    XRT Objectset Table |
 * |                       |                        |
 * |     SomeItemName123   |        SomeItemName123 |
 * |                       |                        |
 * |                       |                        |
 * --------------------------------------------------
 *
 * Inside of PWA ( List ) the type of "SomeItemName123" = ItemRevision
 * Inside of SWA ( Objectset table ) the type of "SomeItemName123" = Awp0XRTObjectSet
 *
 * Both items need to be able to utilize the custom icon definition for "ItemRevision"
 * Adapting objects is expensive, so check to see if needs to be adapted before doing it anyway.
 * If vmo.props.object_type is equal to vmo.type, adaption is not needed
 * If somewhere along the path is not defined, adaption may be required.
 * If path is present and vmo.type !== vmo.props.object_type, adaption is definitely required.
 * @param {Object} vmo - the vmo to check
 *
 * @returns {String} - undefined or string type of VMO adapted options
 */
function getPropsObjectType( vmo ) {
    let objectType;
    if( vmo.props && vmo.props.object_type ) {
        let ot = vmo.props.object_type;
        if( ot.dbValue ) {
            objectType = ot.dbValue;
        } else if( ot.dbValues && ot.dbValues.length > 0 ) {
            objectType = ot.dbValues[ 0 ];
        }
    }
    if( !objectType && vmo.modelType && vmo.modelType.parentTypeName ) {
        objectType = vmo.modelType.parentTypeName;
    }
    return objectType;
}

/**
 * Gets the typeHierarchy array from object
 * @param {Object} dataObject - The VMO/Object to get type Hierarchy array from
 *
 * @returns {Array|null} - Returns the typeHierarchyArry or null if non-existent
 */
let getTypeHierarchyArray = function( dataObject ) {
    if( dataObject ) {
        if( dataObject.modelType && dataObject.modelType.typeHierarchyArray ) {
            return dataObject.modelType.typeHierarchyArray;
        } else if( dataObject.typeHierarchy ) {
            return dataObject.typeHierarchy;
        } else if( dataObject.type ) {
            return [ dataObject.type ];
        }
    }
    return null;
};

/**
 * Gets the relevant definitions from teh typeIconsRegistry
 *
 * @param {Object} vmo - the view model object
 * @param {Object|null} adaptedObj - The adaptedObject or null
 *
 * @returns {Object[]} - relevant typeIconsRegistry definitions
 */
let getRelevantDefs = function( vmo, adaptedObj ) {
    const typesToCheck = new Set();
    const vmoTypeHierarchyArr = getTypeHierarchyArray( vmo );

    if( vmoTypeHierarchyArr ) {
        for( let i = 0; i < vmoTypeHierarchyArr.length; i++ ) {
            typesToCheck.add( vmoTypeHierarchyArr[ i ] );
        }
    }

    if( adaptedObj ) {
        let adaptedTypeHierarchyArr = getTypeHierarchyArray( adaptedObj );
        if( adaptedTypeHierarchyArr ) {
            for( let j = 0; j < adaptedTypeHierarchyArr.length; j++ ) {
                typesToCheck.add( adaptedTypeHierarchyArr[ j ] );
            }
        }
    }

    return _typeIconsRegistry.filter( ( o ) => {
        if( o.type && o.type.names ) {
            // Check if any items in set are valid here, best way is loop through the registry entry names,
            // Since there are generally only one or two items in each, so this will be faster
            for( let k = 0; k < o.type.names.length; k++ ) {
                if( typesToCheck.has( o.type.names[ k ] ) ) {
                    return true;
                }
            }
        }
        return false;
    } );
};

/**
 * Loads the type Icons registry configuration
 */
export let loadConfiguration = function() {
    //  FIXME this should be loaded async but before the sync API below that uses it is called
    _typeIconsRegistry = cfgSvc.getCfgCached( 'typeIconsRegistry' );
};

exports = {
    isObjOfAnyTypeNames,
    getIconForType,
    getVmoForThumbnail,
    getCustomVmoForThumbnail,
    getCustomIcon,
    loadConfiguration
};
export default exports;

loadConfiguration();

/**
 * This service returns extended type icons
 *
 * @memberof NgServices
 * @member typeIconsRegistryService
 */
app.factory( 'typeIconsRegistryService', () => exports );
