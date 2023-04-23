// Copyright (c) 2020 Siemens
/* eslint-disable complexity */

/**
 * This module provides access to service APIs that help to convert the model object to view model object
 * <P>
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/viewModelObjectService
 */
import app from 'app';
import uwPropertySvc from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import lovService from 'js/lovService';
import visualIndicatorSvc from 'js/visualIndicatorService';
import colorDecoratorSvc from 'js/colorDecoratorService';
import cmm from 'soa/kernel/clientMetaModel';
import awIconSvc from 'js/awIconService';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';
import logger from 'js/logger';
import declUtils from 'js/declUtils';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * This is added to handle relational property specified in objectset. prop specified as "relName.relProp", need to
 * extract the actual prop name to extract value from the refModel Object
 *
 * @param {Object} prop - The IViewModelPropObject of an IViewModelObject (from serverVMO or modelObject property)
 * @param {String} propName - The property name
 * @param {IModelObject} refModelObject - The actual IModelObject for which we are creating ViewModelObject
 *
 * @return {ModelObjectProperty|null} The Result.
 */
var getSourceObjectProp = function( prop, propName, refModelObject ) {
    var srcObj = null;

    if( !_.isEmpty( prop.intermediateObjectUids ) ) {
        srcObj = cdm.getObject( prop.intermediateObjectUids[ prop.intermediateObjectUids.length - 1 ] );
    } else {
        srcObj = refModelObject;
    }

    var srcObjProp = srcObj ? srcObj.props[ propName ] : null;

    if( !srcObjProp && /\./.test( propName ) ) {
        var actualPropName = uwPropertySvc.getBasePropertyName( propName );

        srcObjProp = srcObj ? srcObj.props[ actualPropName ] : null;
    }

    return srcObjProp;
};

var getPropValue = function( uw_displayValue, prop, propType, uw_dbValue, isDateAdjusted ) {
    uw_displayValue[ 0 ] = _.isString( prop.displayValue[ 0 ] ) ? prop.displayValue[ 0 ] : new String( prop.displayValue[ 0 ] );
    if( propType === 'DATE' ) { // eslint-disable-line no-lonely-if
        uw_dbValue = new Date( prop.value[ 0 ] ).getTime();
        uw_displayValue[ 0 ] = isDateAdjusted ? dateTimeSvc.formatDate( new Date( prop.displayValue[ 0 ] ).getTime() ) : prop.displayValue[ 0 ];
    } else if( propType === 'DATETIME' ) { // eslint-disable-line no-lonely-if
        uw_dbValue = new Date( prop.value[ 0 ] ).getTime();
        uw_displayValue[ 0 ] = dateTimeSvc.formatSessionDateTime( new Date( prop.displayValue[ 0 ] ).getTime() );
    } else if( ( propType === 'DOUBLE' || propType === 'INTEGER' ) && prop.value[ 0 ] ) {
        uw_dbValue = Number( prop.value[ 0 ] );
    } else if( propType === 'CHAR' && prop.displayValue[ 0 ] ) {
        uw_dbValue = prop.displayValue[ 0 ];
    } else {
        uw_dbValue = prop.value[ 0 ];
    }
    return uw_dbValue;
};

var getPropValueOnArray = function( uw_dbValue, prop, propType, uw_displayValue, isDateAdjusted ) {
    uw_dbValue = [];
    for( var i = 0; i < prop.value.length; i++ ) {
        var isCharArray = false;
        /**
         * For character data types, TC server returns character ASCII values as the property internal
         * value. Since AW doesn't differentiate between character and string types, the property object
         * needs to created with display values as internal values. So passing the UI values as internal
         * value.
         */
        if( propType === 'STRINGARRAY' && prop.isCharArray ) {
            isCharArray = true;
        }
        uw_displayValue[ i ] = prop.displayValue[ i ];
        if( propType === 'DATEARRAY' ) {
            uw_dbValue[ i ] = new Date( prop.value[ i ] ).getTime();
            uw_displayValue[ i ] = isDateAdjusted ? dateTimeSvc.formatDate( new Date( prop.displayValue[ i ] ).getTime() ) : prop.displayValue[ i ];
        } else if( propType === 'DATETIMEARRAY' ) {
            uw_dbValue[ i ] = new Date( prop.value[ i ] ).getTime();
            uw_displayValue[ i ] = dateTimeSvc.formatSessionDateTime( new Date( prop.displayValue[ i ] ).getTime() );
        } else if( ( propType === 'DOUBLEARRAY' || propType === 'INTEGERARRAY' ) && prop.value[ i ] ) {
            uw_dbValue[ i ] = Number( prop.value[ i ] );
        } else if( isCharArray && prop.displayValue[ i ] ) {
            uw_dbValue[ i ] = prop.displayValue[ i ];
        } else {
            uw_dbValue[ i ] = prop.value[ i ];
        }
    }
    return uw_dbValue;
};

var getPropValueNotArray = function( prop, uw_displayValue, propType, uw_dbValue ) {
    if( _.isNil( prop.displayValue[ 0 ] ) ) {
        uw_displayValue[ 0 ] = '';
    } else {
        var tempDisplayValue = new String( prop.displayValue[ 0 ] );
        uw_displayValue[ 0 ] = _.isString( prop.displayValue[ 0 ] ) ? prop.displayValue[ 0 ] : tempDisplayValue;
    }
    if( propType === 'DATE' ) { // eslint-disable-line no-lonely-if
        uw_dbValue = new Date( prop.value ).getTime();
        uw_displayValue[ 0 ] = dateTimeSvc.formatDate( new Date( prop.displayValue[ 0 ] ).getTime() );
    } else if( propType === 'DATETIME' ) { // eslint-disable-line no-lonely-if
        uw_dbValue = new Date( prop.value[ 0 ] ).getTime();
        uw_displayValue[ 0 ] = dateTimeSvc.formatSessionDateTime( new Date( prop.displayValue[ 0 ] ).getTime() );
    } else if( ( propType === 'DOUBLE' || propType === 'INTEGER' ) && prop.value && isFinite( prop.value ) && prop.value !== null && prop.value !== '' && !_.isArray( prop.value ) ) {
        uw_dbValue = Number( prop.value );
    } else if( propType === 'CHAR' && prop.value ) {
        uw_dbValue = prop.displayValue[ 0 ];
    } else {
        uw_dbValue = prop.value;
    }
    return uw_dbValue;
};

/**
 *
 * @param {String} propType - The property type
 * @param {*} prop - The property value as defined in definition
 * @param {boolean} isDateAdjusted - isDateAdjusted
 * @returns {Object} - Object containing value and display value
 */
var getPropertyValues = function( propType, prop, isDateAdjusted ) {
    var uw_dbValue = null;
    var uw_displayValue = null;

    if( !_.isUndefined( prop.value ) && !_.isNull( prop.value ) ) {
        uw_displayValue = [];
        if( prop.isArray ) {
            uw_dbValue = getPropValueOnArray( uw_dbValue, prop, propType, uw_displayValue, isDateAdjusted );
        } else if( _.isArray( prop.value ) && prop.value.length > 0 ) {
            uw_dbValue = getPropValue( uw_displayValue, prop, propType, uw_dbValue, isDateAdjusted );
        } else {
            uw_dbValue = getPropValueNotArray( prop, uw_displayValue, propType, uw_dbValue );
        }
    } else if( !prop.value && propType === 'BOOLEAN' ) {
        uw_displayValue = [];
        if( _.isNil( prop.displayValue[ 0 ] ) ) {
            uw_displayValue[ 0 ] = '';
        } else {
            var tempDisplayValue = new String( prop.displayValue[ 0 ] );
            uw_displayValue[ 0 ] = _.isString( prop.displayValue[ 0 ] ) ? prop.displayValue[ 0 ] : tempDisplayValue;
        }
        uw_dbValue = prop.value;
    } else {
        uw_displayValue = prop.displayValue;
    }

    return {
        value: uw_dbValue,
        displayValue: uw_displayValue
    };
};

/**
 * format serverVMO/modelObject property as par consistent API schema
 *
 * @constructor
 *
 * @param {propObject} prop - The IModelObject to create a ViewModelObject for.
 * @param {string} propName - The IModelObject to create a ViewModelObject for.
 * @param {serverVMO} modelObject - The IModelObject to create a ViewModelObject for.
 * @param {serverVMO} serverVMO - The IModelObject to create a ViewModelObject for.
 * @param {string} operationName - operationName
 */
var formatProperties = function( prop, propName, modelObject, serverVMO, operationName ) {
    var propValue = prop instanceof Object ? Object.assign( {}, prop ) : new Object();
    var hasServerVMO = serverVMO && serverVMO.props && serverVMO.props.hasOwnProperty( propName );
    var initialValue = '';
    var inputDbValues = null;
    var displayValues = null;
    var propDesc = prop.propertyDescriptor;
    propValue.isModifiable = false;
    if( !declUtils.isNil( prop.hasLOV ) ) {
        propValue.hasLOV = prop.hasLOV;
    } else {
        propValue.hasLOV = propDesc && propDesc.lovCategory > 0;
    }
    if( hasServerVMO ) {
        propValue.propType = exports.getClientPropertyType( prop.type, prop.isArray === true );
        propValue.isRequired = prop.required === true;
        propValue.displayName = prop.propertyDisplayName ? prop.propertyDisplayName : null;
        propValue.referenceTypeName = prop.ReferencedTypeName ? prop.ReferencedTypeName : '';
        propValue.isModifiable = prop.isModifiable === true;
        propValue.isCharArray = prop.type === 1;
        initialValue = prop.initialValue ? prop.initialValue : null;
        if( propValue.propType === 'DATE' || propValue.propType === 'DATEARRAY' ) {
            let propFromServerVMO = serverVMO.props[ propName ];
            //for date type property, set default value false to isTimeEnabled
            propValue.isTimeEnabled = false;
            if( propFromServerVMO ) {
                propValue.isTimeEnabled = _.isUndefined( propFromServerVMO.isTimeEnabled ) ? false : propFromServerVMO.isTimeEnabled;
            }
        }
    } else {
        var constantsMap;
        if( propDesc ) {
            propValue.isArray = propDesc.anArray;
            propValue.propType = exports.getClientPropertyType( propDesc.valueType, propValue.isArray );
            propValue.isCharArray = propDesc.valueType === 1;
            propValue.displayName = propDesc.displayName;
            propValue.maxLength = propDesc.maxLength;
            propValue.maxArraySize = propDesc.maxArraySize ? propDesc.maxArraySize : -1;
            constantsMap = propDesc.constantsMap;
        }
        if( constantsMap ) {
            initialValue = constantsMap.initialValue;
            propValue.initialValue = constantsMap.initialValue;
            propValue.isEditable = constantsMap.editable === '1';
            propValue.isRequired = constantsMap.required === '1';
            propValue.isAutoAssignable = constantsMap.autoassignable === '1';
            propValue.isRichText = constantsMap.Fnd0RichText === '1';
            propValue.isEnabled = constantsMap.editable ? constantsMap.editable === '1' : true;
            propValue.referenceTypeName = constantsMap.ReferencedTypeName || '';
            if( propValue.propType === 'DATE' || propValue.propType === 'DATEARRAY' ) {
                //from SOA getTypeDescriptions2, timeEnabled is undefined when Fnd0EnableTimeForDateProperty is default false.
                propValue.isTimeEnabled = _.isUndefined( constantsMap.timeEnabled ) ? false : constantsMap.timeEnabled === '1';
            }
            // If isModifiable is false on the modelObject, use that first over propertyDescriptor's constantsMap default value
            if ( modelObject && modelObject.props
                && modelObject.props.is_modifiable
                && modelObject.props.is_modifiable.dbValues
                && modelObject.props.is_modifiable.dbValues[0] === '0' ) {
                propValue.isModifiable = false;
            } else {
                propValue.isModifiable = constantsMap.modifiable === '1';
            }
        }
    }
    if( _.isNil( propValue.isModifiable ) ) {
        propValue.isModifiable = false;
    }
    if( operationName && _.isString( operationName ) ) {
        if( /^(EDIT|REVISE|CREATE)$/i.test( operationName ) ) {
            propValue.isEditable = prop.modifiable === true;
        }
        // Set isEnabled flag to 'true' for all properties for SaveAs ,Revise and Create operations.
        // <P>
        // Note: Create panel would require the below change when its converted to declarative.
        if( /^(REVISE|CREATE)$/i.test( operationName ) ) {
            propValue.isEnabled = true;
        }
    }
    if( propValue.isDCP ) {
        inputDbValues = prop && prop.dbValues || [];
        displayValues = prop && prop.uiValues || [];
        if( propValue.propType === 'DATE' || propValue.propType === 'DATEARRAY' ) {
            //For DCP property, replace displayValues with the date formatted dbValues value
            var tempDisplayValues = [];
            for( var indx = 0; indx < inputDbValues.length; indx++ ) {
                if( propValue.isTimeEnabled === false ) {
                    tempDisplayValues.push( dateTimeSvc.formatSessionDate( inputDbValues[ indx ] ) );
                } else {
                    tempDisplayValues.push( dateTimeSvc.formatSessionDateTime( inputDbValues[ indx ] ) );
                }
            }
            if( tempDisplayValues.length > 0 ) {
                displayValues = tempDisplayValues;
            }
        }
    } else {
        var srcObjProp = getSourceObjectProp( prop, propName, modelObject );
        inputDbValues = srcObjProp && srcObjProp.dbValues || [];
        displayValues = srcObjProp && srcObjProp.uiValues || [];
    }
    propValue.dbValues = inputDbValues;
    if( inputDbValues && inputDbValues.length > 0 ) {
        propValue.value = inputDbValues;
    } else if( initialValue !== '' ) {
        propValue.value = initialValue;
    } else {
        propValue.value = null;
    }
    propValue.displayValue = displayValues;
    return propValue;
};

/**
 * Processing and assigning modelObject and serverVMO property on ViewModelObject
 * It is post processing.
 *
 * @constructor
 * @param {IModelObject} modelObject - The IModelObject to create a ViewModelObject for.
 * @param {IModelObject} viewModelObject - The IModelObject to create a ViewModelObject for.
 * @param {String} owningObjUid - The intended purpose for the new ViewModelOject (e.g. 'edit').
 */
var alignPropertiesOnVMO = function( modelObject, viewModelObject, owningObjUid ) {
    _.forOwn( modelObject.props, function( propValue, propName ) {
        var propDesc = propValue.propertyDescriptor;
        if( propDesc ) {
            viewModelObject.propertyDescriptors[ propName ] = propDesc;
        }
        viewModelObject.props[ propName ].propertyDescriptor = propValue.propertyDescriptor;
        viewModelObject.props[ propName ].intermediateObjectUids = propValue.intermediateObjectUids;
        viewModelObject.props[ propName ].isDCP = propValue.isDCP || false;
        if( !viewModelObject.props[ propName ].lovApi && viewModelObject.props[ propName ].hasLov ) {
            lovService.initNativeCellLovApi( viewModelObject.props[ propName ], null, viewModelObject.operationName, viewModelObject, owningObjUid );
        }
    } );
    if( modelObject.type === 'Awp0XRTObjectSetRow' && modelObject.props.awp0Target ) {
        const target = cdm.getObject( modelObject.props.awp0Target.dbValues[ 0 ] );
        if( target ) {
            for( const prop of Object.values( modelObject.props ) ) {
                if( !prop.propertyDescriptor && target.props[ prop.propertyName ] ) {
                    prop.propertyDescriptor = target.props[ prop.propertyName ].propertyDescriptor;
                }
            }
            for( const prop of Object.values( viewModelObject.props ) ) {
                if( !prop.propertyDescriptor && target.props[ prop.propertyName ] ) {
                    prop.propertyDescriptor = target.props[ prop.propertyName ].propertyDescriptor;
                }
            }
        }
    }
    return viewModelObject;
};

/**
 * Update this model object's awp cell properties which are stored as key/value inside an array property
 * awp0CellProperties.
 *
 * @param {ViewModelObject} viewModelObject - The object to update properties on.
 */
var updateCellProperties = function( viewModelObject ) {
    /**
     * Pull any cell properties out of their encoded string and have them as 1st class properties of the
     * ViewModelObject.
     */
    if( viewModelObject.props && viewModelObject.props.awp0CellProperties ) {
        // We should look up for dbValue always,'dbValues' is redundant and need to cleanup any dependency on that
        // dbValue could be array or string based on the mode object
        var dbValue = viewModelObject.props.awp0CellProperties.dbValue;
        viewModelObject.cellProperties = {};

        for( var ii = 0; ii < dbValue.length; ii++ ) {
            // Added condition for dbValues[ii] which might be null value
            if( dbValue[ ii ] ) {
                var keyValue = dbValue[ ii ].split( '\\:' );
                var value = keyValue[ 1 ] || '';

                value = value.replace( '{__UTC_DATE_TIME}', '' );

                if( ii === 0 ) {
                    viewModelObject.cellHeader1 = value;
                } else if( ii === 1 ) {
                    viewModelObject.cellHeader2 = value;
                } else if( value ) {
                    var key = keyValue[ 0 ];

                    viewModelObject.cellProperties[ key ] = {
                        key: key,
                        value: value
                    };
                }
            }
        }
    }
};

/**
 * Update this model object's Thumbnail URL based on the FMS ticket stored in the awp0ThumbnailImageTicket property
 *
 * @param {ViewModelObject} viewModelObject - The object to update properties on.
 */
var updateIcons = function( viewModelObject ) {
    if( viewModelObject && viewModelObject.props ) {
        viewModelObject.thumbnailURL = awIconSvc.getThumbnailFileUrl( viewModelObject );
        viewModelObject.typeIconURL = awIconSvc.getTypeIconFileUrl( viewModelObject );

        if( viewModelObject.thumbnailURL ) {
            viewModelObject.hasThumbnail = true;
        } else {
            viewModelObject.hasThumbnail = false;
        }
    }
};

/**
 * Get Model object from uid
 * @param {String} uid - The UID of the object whose Model object is required
 * @returns {modelObj} modelObject
 */
var getModelObject = function( uid ) {
    return cdm.getObject( uid );
};

/**
 * Update this model object's status indicators
 *
 * @param {ViewModelObject} viewModelObject - The object to update properties on.
 */
var updateStatusIndicators = function( viewModelObject ) {
    if( viewModelObject.props ) {
        // Since we dont want to add another dependency in visualIndicatorSvc on cdm, we are passing callback here
        // This will be called from visualIndicatorSvc when there is a need to get model object from UID.
        var getObjCb = getModelObject;
        var adaptedVmo = viewModelObject;

        if( viewModelObject.type === 'Awp0XRTObjectSetRow' ) {
            // Get underlying target object's UID if 'awp0Target' property exists
            if( viewModelObject.props && viewModelObject.props.awp0Target ) {
                var targetUID = viewModelObject.props.awp0Target.dbValue;
                var targetMO = cdm.getObject( targetUID );
                if( targetMO ) {
                    adaptedVmo = exports.constructViewModelObjectFromModelObject( targetMO, 'edit', null, null, true );
                }
            }
        }

        var indicators = visualIndicatorSvc.getVisualIndicators( adaptedVmo, getObjCb );

        viewModelObject.indicators = indicators;
    }
};

/**
 * Update this model object's status indicators
 * @param {ViewModelObject|ViewModelObjectArray} vmoIn - The object(s) to update properties on.
 * @param {Boolean} skipEvent - if true will skip event.
 */
var updateColorDecorators = function( vmoIn, skipEvent ) {
    colorDecoratorSvc.setDecoratorStyles( vmoIn, skipEvent );
};

/**
 * Method to construct VMO from serverVMO and modelObject
 *
 * @constructor
 *
 * @param {IModelObject} modelObject - The IModelObject to create a ViewModelObject for.
 * @param {String} operationName - The intended purpose for the new ViewModelOject (e.g. 'edit').
 * @param {String} owningObjUid - The UID of owning object.
 * @param {Object} serverVMO - (Optional) A property map from the server with values to include on the returned VMO.
 * @param {boolean}  skipIconUpdate - to udpate values
 */
export let constructViewModelObjectFromModelObject = function( modelObject, operationName, owningObjUid, serverVMO, skipIconUpdate ) {
    var basicVMO = {};
    basicVMO.props = {};
    basicVMO.propertyDescriptors = {};
    if( modelObject ) {
        if( serverVMO ) {
            basicVMO.uid = serverVMO.uid || modelObject.uid;
            if( serverVMO.alternateID || modelObject.alternateID ) {
                basicVMO.alternateID = serverVMO.alternateID || modelObject.alternateID;
            }
            basicVMO.type = serverVMO.type || modelObject.type;
            basicVMO.modelType = serverVMO.modelType || modelObject.modelType;
            if( !basicVMO.modelType ) {
                basicVMO.modelType = cmm.getType( basicVMO.type );
            }
            if( serverVMO.rowStatus ) {
                basicVMO.rowStatus = serverVMO.rowStatus;
            }
            var vmoProps = serverVMO.props;
            var moProps = modelObject.props;
            _.forEach( moProps, function( propValue, propName ) {
                if( propValue ) {
                    if( vmoProps[ propName ] ) {
                        var moPropValueClone = _.clone( propValue );

                        _.merge( moPropValueClone, vmoProps[ propName ] );

                        basicVMO.props[ propName ] = formatProperties( moPropValueClone, propName, modelObject, serverVMO, operationName );
                    } else {
                        basicVMO.props[ propName ] = formatProperties( propValue, propName, modelObject, serverVMO, operationName );
                    }
                }
            } );
            /**
             * Check for the case of the serverVMO having a property NOT currently in the modelObject.
             * <P>
             * Note: Not sure when this could happen, but need to handle it.
             */
            _.forEach( vmoProps, function( propValue, propName ) {
                if( propValue && !moProps[ propName ] ) {
                    basicVMO.props[ propName ] = formatProperties( propValue, propName, modelObject, serverVMO, operationName );
                }
            } );
        } else {
            basicVMO.uid = modelObject.uid;
            if( modelObject.alternateID ) {
                basicVMO.alternateID = modelObject.alternateID;
            }
            basicVMO.type = modelObject.type;
            basicVMO.modelType = modelObject.modelType;
            if( !basicVMO.modelType ) {
                basicVMO.modelType = cmm.getType( basicVMO.type );
            }
            basicVMO.props = {};
            _.forEach( modelObject.props, function( propValue, propName ) {
                if( propValue ) {
                    basicVMO.props[ propName ] = formatProperties( propValue, propName, modelObject, serverVMO, operationName );
                }
            } );
        }
    }
    var vmo = exports.constructViewModelObject( basicVMO, false );
    vmo.operationName = operationName;
    if( basicVMO.rowStatus ) {
        vmo.rowStatus = basicVMO.rowStatus;
    }
    var updateVMO = alignPropertiesOnVMO( basicVMO, vmo, owningObjUid );
    updateCellProperties( updateVMO );
    if( !skipIconUpdate ) {
        updateIcons( updateVMO );
        updateStatusIndicators( updateVMO );
        updateColorDecorators( updateVMO, true );
    }
    return updateVMO;
};

/**
 * Update this model object's status indicators
 * @param {prop} prop - The object(s) to update properties on.
 * @param {ViewModelProperty} viewProp - if true will skip event.
 * @param {type} propType - if true will skip event.
 */
var populateViewModelProperty = function( prop, viewProp, propType ) {
    if( !declUtils.isNil( prop.autofocus ) ) {
        uwPropertySvc.setAutoFocus( viewProp, prop.autofocus );
    }
    if( prop.labelPosition ) {
        uwPropertySvc.setPropertyLabelDisplay( viewProp, prop.labelPosition, true );
        if( prop.labelPosition === 'PROPERTY_LABEL_AT_SIDE' ) {
            viewProp.editLayoutSide = true;
        }
    }
    // Add pattern information
    if( prop.patterns ) {
        viewProp.patterns = prop.patterns;
        if( prop.preferredPattern ) {
            viewProp.preferredPattern = prop.preferredPattern;
        }
        if( prop.condition ) {
            viewProp.condition = prop.condition;
        }
    }
    if( prop.validationCriteria ) {
        viewProp.validationCriteria = prop.validationCriteria;
    }
    if( !_.isUndefined( prop.oldValue ) ) {
        viewProp.oldValue = prop.oldValue;
    } else if( prop.oldValues ) {
        viewProp.oldValues = prop.oldValues;
    }
    if( prop.vertical ) {
        viewProp.vertical = prop.vertical;
    }
    if( !viewProp.propApi ) {
        viewProp.propApi = {};
    }
    if( propType === 'BOOLEAN' && prop.propertyRadioTrueText &&
        prop.propertyRadioFalseText ) {
        viewProp.propertyRadioTrueText = prop.propertyRadioTrueText;
        viewProp.propertyRadioFalseText = prop.propertyRadioFalseText;
    }
};

/**
 * @param {Object} prop -
 * @param {String} propName -
 * @param {Object} owningObj -
 * @param {boolean} isDateAdjusted -
 *
 * @returns {ViewModelProperty} New object initialized with the given data.
 */
export let constructViewModelProperty = function( prop, propName, // eslint-disable-line
    owningObj, isDateAdjusted ) {
    var isArray = prop.isArray;
    var propType = prop.propType;
    var displayName = prop.displayName ? prop.displayName : '';
    var isEditable = _.isUndefined( prop.isEditable ) ? false : prop.isEditable;
    var isModifiable = _.isUndefined( prop.isModifiable ) ? true : prop.isModifiable;
    var isRequired = prop.isRequired === true;
    var isAutoAssignable = prop.isAutoAssignable === true;
    var isRichText = prop.isRichText === true;
    var isEnabled = _.isUndefined( prop.isEnabled ) ? true : prop.isEnabled !== false; // default value
    var referenceTypeName = prop.referenceTypeName ? prop.referenceTypeName : '';
    var maxLength = _.isUndefined( prop.maxLength ) ? 0 : prop.maxLength;
    var maxArraySize = prop.maxArraySize ? prop.maxArraySize : -1;
    var hasLov = prop.hasLOV === true;
    var isLocalizable = prop.isLocalizable === true;
    var isNull = false;
    var error = null;
    var renderingHint = prop.renderingHint ? prop.renderingHint : '';
    var numberOfCharacters = -1;
    var numberOfLines = prop.numberOfLines ? prop.numberOfLines : -1;
    var isSelectOnly = false;
    var requiredText = prop.requiredText;
    var isTimeEnabled = prop.isTimeEnabled !== false;

    var values = getPropertyValues( propType, prop, isDateAdjusted );
    if( propType === 'CHAR' || propType === 'STRINGARRAY' && prop.isCharArray ) {
        maxLength = 1;
    }
    if( propType && propType === 'DATETIME' ) {
        propType = 'DATE';
    }
    var viewProp = uwPropertySvc.createViewModelProperty( propName, displayName, propType, values.value,
        values.displayValue );
    if( propType === 'STRING' || propType === 'STRINGARRAY' ) {
        viewProp.inputType = 'text';
    }

    if( requiredText ) {
        uwPropertySvc.setPlaceHolderText( viewProp, requiredText ); // need to add in VMO
    }

    if( prop.isSelectOnly && hasLov ) {
        isSelectOnly = true;
        uwPropertySvc.setIsSelectOnly( viewProp, isSelectOnly, true );
    }

    populateViewModelProperty( prop, viewProp, propType );

    uwPropertySvc.setHasLov( viewProp, hasLov );
    uwPropertySvc.setIsRequired( viewProp, isRequired );
    uwPropertySvc.setIsArray( viewProp, isArray );
    uwPropertySvc.setIsAutoAssignable( viewProp, isAutoAssignable );
    uwPropertySvc.setIsEditable( viewProp, isEditable );
    uwPropertySvc.setIsRichText( viewProp, isRichText );
    uwPropertySvc.setIsEnabled( viewProp, isEnabled );
    uwPropertySvc.setIsLocalizable( viewProp, isLocalizable );
    uwPropertySvc.setIsNull( viewProp, isNull );
    uwPropertySvc.setLength( viewProp, maxLength );
    uwPropertySvc.setRenderingHint( viewProp, renderingHint );
    uwPropertySvc.setError( viewProp, error );
    uwPropertySvc.setNumberOfCharacters( viewProp, numberOfCharacters );
    uwPropertySvc.setNumberOfLines( viewProp, numberOfLines );
    uwPropertySvc.setArrayLength( viewProp, maxArraySize );
    uwPropertySvc.setIsPropertyModifiable( viewProp, isModifiable );
    uwPropertySvc.setReferenceType( viewProp, referenceTypeName );
    uwPropertySvc.setTimeEnabled( viewProp, isTimeEnabled );
    viewProp.initialize = false;
    viewProp.parentUid = owningObj ? owningObj.uid : '';
    viewProp.dbValues = prop.dbValues ? prop.dbValues : prop.value;
    viewProp.uiValues = values.displayValue;
    viewProp.uiValue = uwPropertySvc.getUiValue( viewProp.uiValues );
    viewProp.sourceObjectLastSavedDate = prop.srcObjLsd;
    viewProp.srcObjectTypeName = prop.srcObjectTypeName;
    return viewProp;
}; // constructViewModelProperty

/**
 * Class used to help view specific state information.
 *
 * @constructor
 *
 * @param {IModelObject} modelObject - The IModelObject to create a ViewModelObject for.
 * @param {boolean} isDateAdjusted - isDateAdjusted
 */
var ViewModelObject = function( modelObject, isDateAdjusted ) { // eslint-disable-line complexity
    var self = this;
    self.props = {};
    self.propertyDescriptors = {};
    self.visible = true;
    self.uid = modelObject.uid;
    self.type = modelObject.type;
    self.modelType = modelObject.modelType;

    if( modelObject.alternateID ) {
        self.alternateID = modelObject.alternateID;
    }

    _.forOwn( modelObject.props, function( propValue, propName ) {
        if( propValue ) {
            self.props[ propName ] = exports.constructViewModelProperty( propValue, propName, self, isDateAdjusted );
        }
    } );
};

/**
 * @return {String|Object} Displayable 'id' of this ViewModelObject (if possible, else the UID or '???' is
 *         returned).
 */
ViewModelObject.prototype.toString = function() {
    if( this.cellHeader1 ) {
        return this.cellHeader1;
    } else if( this.props.object_string && this.props.object_string.uiValues[ 0 ] ) {
        return this.props.object_string.uiValues[ 0 ];
    } else if( this.uid ) {
        return this.uid;
    }

    return '???';
};

/**
 * Return array propertyNameValue objects (property name + real prop values) of the properties that have been
 * modified.
 *
 * @return {StringArray} Array of property names.
 */
ViewModelObject.prototype.getDirtyProps = function() {
    var propertyNameValues = [];

    for( var prop in this.props ) {
        if( this.props.hasOwnProperty( prop ) ) {
            if( uwPropertySvc.isModified( this.props[ prop ] ) ) {
                var propNameValue = {};

                propNameValue.name = prop;
                propNameValue.values = uwPropertySvc.getValueStrings( this.props[ prop ] );
                propertyNameValues.push( propNameValue );
            }
        }
    }
    return propertyNameValues;
};

/**
 * Return array propertyNameValue objects (property name + real prop values) of the properties that have been
 * modified. The return objects can be passed to SOA without any further conversion.
 *
 * @return {StringArray} Array of property names.
 */
ViewModelObject.prototype.getSaveableDirtyProps = function() {
    var propertyNameValues = this.getDirtyProps();

    _.forEach( propertyNameValues, function( propObject ) {
        var propVals = propObject.values;
        for( var i = 0; i < propVals.length; i++ ) {
            propVals[ i ] = String( propVals[ i ] );
        }
    } );

    return propertyNameValues;
};

/**
 * Return array propertyNameValue objects (property name + real prop values) of the properties that have been
 * modified. The return objects can be passed to SOA without any further conversion.
 *
 * @return {StringArray} Array of property names.
 */
 ViewModelObject.prototype.getAutoAssignableProps = function() {
    var propertyNameValues = [];

    for( var prop in this.props ) {
        if( this.props.hasOwnProperty( prop ) && this.props[ prop ].isAutoAssignable ) {
            var propNameValue = {};

            propNameValue.name = prop;
            propNameValue.values = uwPropertySvc.getValueStrings( this.props[ prop ] );
            propertyNameValues.push( propNameValue );
        }
    }

    _.forEach( propertyNameValues, function( propObject ) {
        var propVals = propObject.values;
        for( var i = 0; i < propVals.length; i++ ) {
            propVals[ i ] = String( propVals[ i ] );
        }
    } );

    return propertyNameValues;
};

/**
 * This function sets the vmo edit state
 * @param {Object} vmo the view model object.
 * @param {Boolean} editState the edit state.
 */
export const setEditState = function( vmo, editState ) {
    vmo.isEditing = editState;
};

/**
 * Resets the 'isEditable' on the view model (and 'modifiable' flags on the backing model object) for all view
 * properties.
 *
 * @param {Object} vmo - the view model object
 * @param {Boolean} skipDigest - (Optional) TRUE if the 'triggerDigestCycle' function should NOT be called<BR> FALSE
 *            if it SHOULD be called when there is a value change.
 */
export const clearEditableStates = function( vmo, skipDigest ) {
    setEditState( vmo, false );
    _.forEach( vmo.props, function( prop2 ) {
        uwPropertySvc.resetUpdates( prop2 );
        uwPropertySvc.setIsEditable( prop2, false );
    } );

    if( !skipDigest ) {
        uwPropertySvc.triggerDigestCycle();
    }
};

/**
 * Resets the 'isEditable' on the view model (and 'modifiable' flags on the backing model object) for all view
 * properties.
 *
 * @param {Boolean} skipDigest - (Optional) TRUE if the 'triggerDigestCycle' function should NOT be called<BR> FALSE
 *            if it SHOULD be called when there is a value change.
 */
ViewModelObject.prototype.clearEditiableStates = function( skipDigest ) {
    clearEditableStates( this, skipDigest );
};

/**
 * Sets the 'isEditable' of viewModelProperties if property in the associated IModelObject can be modified.
 *
 * @param {Boolean} editable - TRUE if the properties are to be marked as 'editable'.
 * @param {Boolean} override - TRUE if the editing state should be updated an announced even if not currently
 *            different than the desired state.
 * @param {Boolean} skipDigest - (Optional) TRUE if the 'triggerDigestCycle' function should NOT be called.
 */
ViewModelObject.prototype.setEditableStates = function( editable, override, skipDigest ) {
    exports.setEditableStates( this, editable, override, skipDigest );
};

/**
 * Retrieves the id of the object, currently set to uid.
 *
 * Could change in future if each vmo (with cardinality) has their own unique id instead of 'uid'.
 *
 * @returns {String} The ID.
 */
ViewModelObject.prototype.getId = function() {
    return this.uid;
};

/**

 * Retrieve the ViewModelProperty object with the same basePropertyName and sourceObjectUid as the parameters.

 *

 * @param {String} basePropertyName - the base property name trying to be matched

 * @param {String} uid - unique id

 *

 * @returns {ViewModelProperty} The found property.

 */

ViewModelObject.prototype.retrievePropertyWithBasePropertyName = function( basePropertyName, uid ) {
    var foundProperty = null;

    _.forEach( this.props, function( currentProperty, key ) {
        var currentBasePropertyName = uwPropertySvc.getBasePropertyName( key );

        if( currentBasePropertyName === basePropertyName ) {
            var sourceObjectUid = uwPropertySvc.getSourceObjectUid( currentProperty );

            if( sourceObjectUid === uid ) {
                foundProperty = currentProperty;

                return false;
            }
        }
    } );

    return foundProperty;
};

/**

 * create VMO API for all interface such as dataParser , viewModelCollection

 *

 * @constructor

 *

 * @param {IModelObject} modelObject - The IModelObject to create a ViewModelObject for.

 * @param {boolean} isDateAdjusted isDateAdjusted

 */

export let constructViewModelObject = function( modelObject, isDateAdjusted ) {
    return new ViewModelObject( modelObject, isDateAdjusted );
};

/**

 * Get view model property type based on the value type and array flag.

 *

 * @param {Integer} valueType - The valueType for this property

 * @param {Boolean} isArray - array flag

 *

 * @return {propertyType} propertyType based off the integer value of valueType (String/Double/char etc.)

 */

export let getClientPropertyType = function( valueType, isArray ) { // eslint-disable-line complexity
    var propertyType;

    switch ( valueType ) {
        case 1:

            if( isArray ) {
                propertyType = 'STRINGARRAY';
            } else {
                propertyType = 'CHAR';
            }

            break;

        case 2:

            if( isArray ) {
                propertyType = 'DATEARRAY';
            } else {
                propertyType = 'DATE';
            }

            break;

        case 3:
        case 4:

            if( isArray ) {
                propertyType = 'DOUBLEARRAY';
            } else {
                propertyType = 'DOUBLE';
            }

            break;

        case 5:

            if( isArray ) {
                propertyType = 'INTEGERARRAY';
            } else {
                propertyType = 'INTEGER';
            }

            break;

        case 6:

            if( isArray ) {
                propertyType = 'BOOLEANARRAY';
            } else {
                propertyType = 'BOOLEAN';
            }

            break;

        case 7:

            if( isArray ) {
                propertyType = 'INTEGERARRAY';
            } else {
                propertyType = 'SHORT';
            }

            break;

        case 8:

            if( isArray ) {
                propertyType = 'STRINGARRAY';
            } else {
                propertyType = 'STRING';
            }

            break;

        case 9:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:

            if( isArray ) {
                propertyType = 'OBJECTARRAY';
            } else {
                propertyType = 'OBJECT';
            }

            break;

        default:

            propertyType = 'UNKNOWN';

            break;
    }

    return propertyType;
};

/**

 * Sets the 'isEditable' of viewModelProperties if property in the associated IModelObject can be modified.

 *

 * @param {ViewModelObject} vmo - The viewModelObject containing the 'props' to be checked.

 * @param {Boolean} editable - TRUE if the properties are to be marked as 'editable'.

 * @param {Boolean} override - TRUE if the editing state should be updated an announced even if not currently

 *            different than the desired state.

 * @param {Boolean} skipDigest - (Optional) TRUE if the 'triggerDigestCycle' function should NOT be called.

 */

export let setEditableStates = function( vmo, editable, override, skipDigest ) {
    setEditState( vmo, editable );
    var modelObject = cdm.getObject( vmo.uid );

    var changed = false;

    var isEditableNil = declUtils.isNil( editable );

    _.forEach( vmo.props, function( propValue, propName ) {
        if( propValue ) {
            if( isEditableNil ) {
                var modelProp = modelObject.props[ propName ];

                if( modelProp ) {
                    propValue.isEditable = modelProp.modifiable;

                    uwPropertySvc.setEditable( propValue, modelProp.modifiable );

                    /**

                     * Note : uwPropertySvc.setEditable method does not fire any property change event, Calling

                     * uwPropertySvc.setEditState instead. No need to set viewProp.editableInViewModel separately as it

                     * will be taken care by setEditStates method. This change is done as part of handling upload

                     * dataset use case.

                     */

                    uwPropertySvc.setEditState( propValue, modelProp.modifiable, true );

                    changed = true;
                }
            } else {
                propValue.isEditable = editable;

                uwPropertySvc.setEditable( propValue, editable );

                /**

                 * Note : uwPropertySvc.setEditable method does not fire any property change event, Calling

                 * uwPropertySvc.setEditState instead . No need to set viewProp.editableInViewModel separately as it

                 * will be taken care by setEditStates method. This changes is done as part of handling upload

                 * dataset use case.

                 */

                uwPropertySvc.setEditState( propValue, editable, override, true );

                changed = true;
            }
        }
    } );

    if( changed && !skipDigest ) {
        uwPropertySvc.triggerDigestCycle();
    }
};

/**

/**

 * @param {String|Object} input - UID of the ModelObject to create a ViewModelObject wrapper for OR model object

 * @param {String} operationName - if "EDIT", then the VMO is modifiable. (null is acceptable)

 * @param {String} owningObjUid - The UID of owning object

 * @param {ViewModelObject} serverVMO -

 *

 * @return {ViewModelObject} Newly created ViewModelObject wrapper initialized with properties from the given

 *         inputs.

 */

export let createViewModelObject = function( input, operationName, owningObjUid, serverVMO ) {
    var modelObject = input;

    if( _.isString( input ) ) {
        modelObject = cdm.getObject( input );
    } else if( input && input.uid && !serverVMO ) {
        modelObject = cdm.getObject( input.uid );
    }

    if( !modelObject ) {
        logger.error( 'viewModelObject.createViewModelObject: ' +

            'Unable to locate ModelObject in the clientDataModel with UID=' + input );

        return null;
    }

    return exports.constructViewModelObjectFromModelObject( modelObject, operationName, owningObjUid, serverVMO );
};

/**

 * This is a preProcessor to 'updateSourceObjectPropertiesByViewModelObject' to trivially ignore updating existing

 * (loaded) VMOs in the given collection.

 *

 * @param {ViewModelObjectArray} loadedVMOs - Collection of viewModelObjects to consider for updating.

 *

 * @param {IModelObjectArray} updatedCDMObjects - CDM Objects that have been reported as updated or modified.

 */

export let updateViewModelObjectCollection = function( loadedVMOs, updatedCDMObjects ) {
    /**

     * Check if there is nothing to work on or with.

     */

    if( _.isEmpty( loadedVMOs ) || _.isEmpty( updatedCDMObjects ) ) {
        return;
    }

    /**

     * Create a map containing the unique UID of all the loaded viewModelObjects so that we can trivially ignore any

     * changed CDM objects NOT in this viewModelCollection.

     * <P>

     * Note: The map needs to consider all the different UIDs a modified object could be referenced by it. The UID

     * checks mirror the check made in 'updateSourceObjectPropertiesByViewModelObject'.

     */

    var vmoMap = {};

    _.forEach( loadedVMOs,

        function cdmHandlerCheck( vmo ) {
            if( vmo.uid ) {
                vmoMap[ vmo.uid ] = true;

                if( !_.isEmpty( vmo.props ) ) {
                    if( vmo.type === 'Awp0XRTObjectSetRow' && vmo.props.awp0Target &&

                        vmo.props.awp0Target.dbValue ) {
                        vmoMap[ vmo.props.awp0Target.dbValue ] = true;
                    }

                    _.forEach( vmo.props, function( vmProp ) {
                        var sourceObjectUid = uwPropertySvc.getSourceObjectUid( vmProp );

                        if( sourceObjectUid ) {
                            vmoMap[ sourceObjectUid ] = true;
                        }

                        if( vmProp.parentUid ) {
                            vmoMap[ vmProp.parentUid ] = true;
                        }
                    } );
                }
            }
        } );

    /**

     * Check if we ended up with NO viewModelObjects.

     */

    if( _.isEmpty( vmoMap ) ) {
        return;
    }

    /**

     * Loop for each modified object and update any VMOs effected by it.

     */

    _.forEach( updatedCDMObjects, function _updateViewModelCollection( updatedObj ) {
        if( updatedObj.uid && vmoMap[ updatedObj.uid ] ) {
            var updatedVmo = exports.createViewModelObject( updatedObj, 'EDIT' );

            if( updatedVmo && updatedVmo.props ) {
                exports.updateSourceObjectPropertiesByViewModelObject( updatedVmo, loadedVMOs );
            }
        }
    } );
};

/**

 * Updates all the viewModelObjects with the updatedVMO, depending on the property's sourceUid.
 *
 * @param {ViewModelObject} updatedVMO - view model object with updated information
 * @param {ViewModelObjectArray} origVMOs - all the view model objects that need to be updated
 * @param {String[]|null} [propsToUpdate] - (optional) if provided, only update these properties on vmos
 */

export let updateSourceObjectPropertiesByViewModelObject = function( updatedVMO, origVMOs, propsToUpdate ) {
    if( updatedVMO && updatedVMO.props && origVMOs ) {
        var updatedUid = updatedVMO.uid;

        var updatedProps = {};

        _.forEach( origVMOs, function( vmo ) {
            if( vmo && vmo.props ) {
                var vmoChanged = false;

                if( vmo.type === 'Awp0XRTObjectSetRow' && vmo.props.awp0Target &&

                    vmo.props.awp0Target.dbValue === updatedUid ) {
                    _.forEach( vmo.props, function( vmProp, key ) {
                        // If this is not one of the props we want to update, continue
                        if( propsToUpdate && propsToUpdate.length > 0 && propsToUpdate.indexOf( key ) === -1 ) {
                            return true;
                        }
                        var updatedProp = updatedVMO.props[ key ];

                        if( updatedProp ) {
                            uwPropertySvc.copyModelData( vmProp, updatedProp );

                            if( updatedProps[ vmo.uid ] === undefined ) {
                                updatedProps[ vmo.uid ] = [];
                            }

                            updatedProps[ vmo.uid ].push( vmProp.propertyName );

                            vmoChanged = true;
                        }
                    } );
                }

                _.forEach( vmo.props, function( vmProp ) {
                    var sourceObjectUid = uwPropertySvc.getSourceObjectUid( vmProp );

                    // Need to handle both situations, where a DCP property is passed through the DCP object, or the
                    // original object containing the property
                    if( sourceObjectUid === updatedUid || vmProp.parentUid === updatedUid ) {
                        var propertyNameLookup = vmProp.propertyName;
                        if( sourceObjectUid === updatedUid && sourceObjectUid !== vmProp.parentUid ) {
                            propertyNameLookup = uwPropertySvc.getBasePropertyName( propertyNameLookup );
                        }

                        // If this is not one of the props we want to update, continue
                        if( propsToUpdate && propsToUpdate.length > 0 && propsToUpdate.indexOf( propertyNameLookup ) === -1 ) {
                            return true;
                        }

                        var updatedProp = updatedVMO.props[ propertyNameLookup ];
                        if( updatedProp ) {
                            var updatedPropSourceUid = uwPropertySvc.getSourceObjectUid( updatedProp );
                            if( sourceObjectUid === updatedPropSourceUid ) {
                                uwPropertySvc.copyModelData( vmProp, updatedProp );

                                if( updatedProps[ vmo.uid ] === undefined ) {
                                    updatedProps[ vmo.uid ] = [];
                                }
                                updatedProps[ vmo.uid ].push( vmProp.propertyName );
                                vmoChanged = true;
                            }
                        }
                    }
                } );

                _.forEach( updatedVMO.props, function( updatedVmProp ) {
                    var updatedVmPropSourceUid = uwPropertySvc.getSourceObjectUid( updatedVmProp );

                    // Need to handle both situations, where a DCP property is passed through the DCP object, or the
                    // original object containing the property
                    if( vmo.uid === updatedVmPropSourceUid || updatedVmProp.parentUid === vmo.uid ) {
                        var updatedPropNameLookup = updatedVmProp.propertyName;
                        if( updatedVmPropSourceUid === vmo.uid && updatedVmPropSourceUid !== updatedVmProp.parentUid ) {
                            updatedPropNameLookup = uwPropertySvc.getBasePropertyName( updatedPropNameLookup );
                        }

                        // If this is not one of the props we want to update, continue
                        if( propsToUpdate && propsToUpdate.length > 0 && propsToUpdate.indexOf( updatedPropNameLookup ) === -1 ) {
                            return true;
                        }

                        if( !vmo.props[ updatedPropNameLookup ] ) {
                            vmo.props[ updatedPropNameLookup ] = updatedVmProp;

                            if( updatedProps[ vmo.uid ] === undefined ) {
                                updatedProps[ vmo.uid ] = [];
                            }
                            updatedProps[ vmo.uid ].push( updatedPropNameLookup );
                            vmoChanged = true;
                        }
                    }
                } );

                if( vmoChanged ) {
                    updateCellProperties( vmo );

                    updateStatusIndicators( vmo );

                    updateColorDecorators( vmo );

                    updateIcons( vmo );
                }
            }
        } );

        eventBus.publish( 'viewModelObject.propsUpdated', updatedProps );
    }
};

/**

 * Update all existing VMO properties from the underlying CDM object's property value (with the same name).

 *

 * <pre>

 * </pre>

 *

 * @param {Object} vmo view model object

 */

export let updateVMOProperties = function( vmo ) {
    if( !vmo.uid ) {
        return;
    }

    var modelObj = cdm.getObject( vmo.uid );

    if( !modelObj || !modelObj.props ) {
        return;
    }

    _.forEach( vmo.props, function( vmoProp, propName ) {
        if( modelObj.props.hasOwnProperty( propName ) ) {
            var moProp = modelObj.props[ propName ];

            vmoProp.dbValues = moProp.dbValues;

            vmoProp.uiValues = moProp.uiValues;

            vmoProp.uiValue = moProp.getDisplayValue();

            if( moProp.uiValues ) {
                vmoProp.displayValues = moProp.uiValues;
            } else {
                vmoProp.displayValues = [];
            }

            vmoProp.isEditable = moProp.propertyDescriptor.constantsMap.editable === '1' && moProp.modifiable;
            vmoProp.isLocalizable = moProp.propertyDescriptor.constantsMap.localizable === '1';
        }
    } );

    updateCellProperties( vmo );

    updateStatusIndicators( vmo );

    updateColorDecorators( vmo );

    updateIcons( vmo );
};

/**

 * Test if the given object 'is-a' TreeLoadInput created by this service.

 *

 * @param {Object} objectToTest - Object to check prototype history of.

 * @return {Boolean} TRUE if the given object is a TreeLoadInput.

 */

export let isViewModelObject = function( objectToTest ) {
    return objectToTest instanceof ViewModelObject;
};

/**
 * This recursive function returns the given vmos and their cached children if present
 * @param {* } vmObjects the view model objects.
 * @param {* } vmObjectsAcc the accumulation of the view model objects and their cached children.
 * @returns {* } vmObjects and any cached children.
 */
export const getLoadedAndCachedViewModelObjects = function( vmObjects, vmObjectsAcc ) {
    if( !vmObjectsAcc ) {
        vmObjectsAcc = [];
    }

    _.forEach( vmObjects, ( vmo ) => {
        vmObjectsAcc.push( vmo );
        if( vmo.__expandState ) {
            getLoadedAndCachedViewModelObjects( vmo.__expandState.expandedNodes, vmObjectsAcc );
        }
    } );

    return vmObjectsAcc;
};

/**
 * This function gets the vmos that are not in edit
 * @param {* } vmObjects the view model objects.
 * @returns {* } vmObjects that are not in edit.
 */
export const getVmosNotInEdit = function( vmObjects ) {
    return vmObjects.filter( ( vmObject ) => {
        return !vmObject.isEditing;
    } );
};

exports = {
    constructViewModelProperty,
    constructViewModelObject,
    getClientPropertyType,
    setEditableStates,
    clearEditableStates,
    constructViewModelObjectFromModelObject,
    createViewModelObject,
    updateViewModelObjectCollection,
    updateSourceObjectPropertiesByViewModelObject,
    updateVMOProperties,
    isViewModelObject,
    getLoadedAndCachedViewModelObjects,
    getVmosNotInEdit,
    setEditState
};
export default exports;

/**

 * This service provides view model object

 *

 * @memberof NgServices

 * @member viewModelObjectService

 *

 *

 * @param {uwPropertyService} uwPropertySvc - Service to use.

 * @param {soa_kernel_clientDataModel} cdm  - Service to use.

 * @param {lovService} lovService - Service to use.

 * @param {visualIndicatorService} visualIndicatorSvc - Service to use.

 * @param {colorDecoratorService} colorDecoratorSvc - Service to use.

 * @param {soa_kernel_clientMetaModel} cmm - Service to use.

 * @param {awIconService} awIconSvc - Service to use.

 * @param {dateTimeSvc} dateTimeSvc - Service to use.

 *

 * @return {viewModelObjectService} Reference to service API.

 */

app.factory( 'viewModelObjectService', () => exports );
