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
 * @module js/Awp0ShowSaveAsService
 */
import * as app from 'app';
import dateTimeSvc from 'js/dateTimeService';
import autoAssignSvc from 'js/autoAssignService';
import adapterSvc from 'js/adapterService';
import appCtxSvc from 'js/appCtxService';
import cfgSvc from 'js/configurationService';
import commandsSvc from 'js/command.service';
import _ from 'lodash';
import AwStateService from 'js/awStateService';
import editHandlerService from 'js/editHandlerService';

var exports = {};

/**
 * Return string value for given property value
 *
 * @param {String|Number|Object} propVal - The property valuecheck box selection.
 * @param {String} propType - The property type
 * @return {String} The stringified property value.
 */
var _convertPropValToString = function( propVal, propType ) {
    if( _.isNull( propVal ) || _.isUndefined( propVal ) ) {
        return '';
    }
    if( propType.indexOf( 'DATE' ) === 0 ) { // 'DATE' or 'DATEARRAY'
        return dateTimeSvc.formatUTC( propVal );
    } else if(  propType.indexOf( 'INTEGER' ) === 0  ||  propType.indexOf( 'DOUBLE' ) === 0  ) { // 'INTEGER', 'DOUBLE' and their 'ARRAY'
        return String( propVal );
    } else if( propType.indexOf( 'BOOLEAN' ) === 0 ) { // 'BOOLEAN' or 'BOOLEANARRAY'
        return propVal ? '1' : '0';
    } else if(  propType.indexOf( 'CHAR' ) === 0  ||  propType.indexOf( 'STRING' ) === 0  ) { // 'STRING', 'CHAR' and their 'ARRAY'
        return propVal;
    } else if( propVal.uid && propVal.type && propVal.modelType && propVal.props ) { // Model Object
        return propVal.uid;
    }

    return '';
};

/**
 * Process the deep copy data for user's choice in check box
 *
 * @param {ObjectArray} deepCopyDataArr - The deep copy data array
 * @param {Object} data - The vm data
 * @param {Boolean} copyOverEnabled - true, if copy over is enabled; false, otherwise
 */
var _processDeepCopyData = function( deepCopyDataArr, data, copyOverEnabled ) {
    _.forEach( deepCopyDataArr, function( deepCopyData ) {
        if( copyOverEnabled && !deepCopyData.isRequired ) {
            var checkBoxPropName = deepCopyData.propertyName + '_checkbox';
            if( data[ checkBoxPropName ] && !data[ checkBoxPropName ].dbValue ) {
                deepCopyData.copyAction = 'NoCopy';
            }
        }

        if( deepCopyData.attachedObject ) {
            if( !deepCopyData.saveAsInput ) {
                deepCopyData.saveAsInput = {};
            }
            deepCopyData.saveAsInput.boName = deepCopyData.attachedObject.type;
        }

        if( _.isArray( deepCopyData.childDeepCopyData ) ) {
            _processDeepCopyData( deepCopyData.childDeepCopyData, data, copyOverEnabled );
        }
    } );
};

var _typeToPlace = {
    CHAR: 'stringProps',
    STRING: 'stringProps',
    STRINGARRAY: 'stringArrayProps',
    BOOLEAN: 'boolProps',
    BOOLEANARRAY: 'boolArrayProps',
    DATE: 'dateProps',
    DATEARRAY: 'dateArrayProps',
    OBJECT: 'tagProps',
    OBJECTARRAY: 'tagArrayProps',
    DOUBLE: 'doubleProps',
    DOUBLEARRAY: 'doubleArrayProps',
    INTEGER: 'intProps',
    INTEGERARRAY: 'intArrayProps'
};

/**
 * Add given property to SaveAsInput structure
 *
 * @param {Object} saveAsInputIn - The SaveAsInput structure
 * @param {String} propName - The property name
 * @param {Object} vmProp - The VM property
 */
var _setProperty = function( saveAsInputIn, propName, vmProp ) {
    var place = _typeToPlace[ vmProp.type ];
    if( _.isUndefined( saveAsInputIn[ place ] ) ) {
        saveAsInputIn[ place ] = {};
    }

    switch ( vmProp.type ) {
        case 'STRING':
        case 'STRINGARRAY':
        case 'BOOLEAN':
        case 'BOOLEANARRAY':
        case 'DOUBLE':
        case 'DOUBLEARRAY':
        case 'INTEGER':
        case 'INTEGERARRAY':
            saveAsInputIn[ place ][ propName ] = vmProp.dbValue;
            break;
        case 'DATE':
            saveAsInputIn[ place ][ propName ] = dateTimeSvc.formatUTC( vmProp.dbValue );
            break;
        case 'DATEARRAY':
            var rhs = [];
            _.forEach( vmProp.dbValue, function( val ) {
                rhs.push( dateTimeSvc.formatUTC( val ) );
            } );
            saveAsInputIn[ place ][ propName ] = rhs;
            break;
        case 'OBJECT':
            var objectValue = vmProp.dbValue;
            if( _.isString( vmProp.dbValue ) ) {
                objectValue = { uid: vmProp.dbValue };
            }
            saveAsInputIn[ place ][ propName ] = objectValue;
            break;
        case 'OBJECTARRAY':
            rhs = [];
            _.forEach( vmProp.dbValue, function( val ) {
                var objectValue = val;
                if( _.isString( val ) ) {
                    objectValue = { uid: val };
                }
                rhs.push( objectValue );
            } );
            saveAsInputIn[ place ][ propName ] = rhs;
            break;
        default:
            saveAsInputIn.stringProps[ propName ] = vmProp.dbValue;
            break;
    }
};

/**
 * Get the deep copy data for the given property name
 *
 * @param {ObjectArray} deepCopyDataArr - The deep copy data array
 * @param {String} targetPropName - The property name
 * @returns {Object} deep copy data
 */
var _getDeepCopyDataForProp = function( deepCopyDataArr, targetPropName ) {
    var dcd = {};
    var colonIdx = targetPropName.indexOf( ':' );
    var propToFind = targetPropName.substring( 0, colonIdx );
    var remainder = targetPropName.substring( colonIdx + 1 );
    for( var id in deepCopyDataArr ) {
        var deepCopyData = deepCopyDataArr[ id ];
        if( deepCopyData.propertyName === propToFind ) {
            if( remainder.indexOf( ':' ) > 0 ) {
                var childDeepCopyData = deepCopyData.childDeepCopyData;
                if( _.isArray( childDeepCopyData ) ) {
                    dcd = _getDeepCopyDataForProp( childDeepCopyData, remainder );
                    break;
                }
            } else {
                dcd = deepCopyData;
                break;
            }
        }
    }

    return dcd;
};

/**
 * Adapt and update context
 *
 * @param {Array} selectedObj - array of selected objects
 * @param {Boolean} openNewRevision -
 * @param {Boolean} showOpenNewRevisionCheckbox -
 */
export let updateSaveAsContext = function( selectedObj, openNewRevision, showOpenNewRevisionCheckbox ) {
    cfgSvc.getCfg( 'saveAsRevise' ).then( function( saveAsRevise ) {
        var selectedObjs = [];
        selectedObjs.push( selectedObj );
        var adaptedObjsPromise = adapterSvc.getAdaptedObjects( selectedObjs );
        adaptedObjsPromise.then( function( adaptedObjs ) {
            var type;
            adaptedObjs[ 0 ].modelType.typeHierarchyArray.forEach( function( element ) {
                if( saveAsRevise[ element ] ) {
                    type = saveAsRevise[ element ];
                }
            } );
            if( type ) {
                type.SelectedObjects = [ adaptedObjs[ 0 ] ];
            } else {
                type = {
                    SelectedObjects: [ adaptedObjs[ 0 ] ]
                };
            }
            if( openNewRevision === undefined ) {
                openNewRevision = true;
            }
            if( showOpenNewRevisionCheckbox === undefined ) {
                showOpenNewRevisionCheckbox = true;
            }
            type.OpenNewRevision = openNewRevision;
            type.showOpenNewRevisionCheckbox = showOpenNewRevisionCheckbox;
            appCtxSvc.updateCtx( 'SaveAsReviseWorkSpace', type );
        } );
    } );
};

/**
 * Execute a command with the given arguments
 *
 * @param {String} commandId - Command id
 * @param {String|String[]} commandArgs -
 * @param {Object} commandContext - command context
 */
export let saveAsComplete = function( commandId, commandArgs, commandContext ) {
    commandsSvc.executeCommand( commandId, commandArgs, null, commandContext );
};

/**
 * update edit state in url
 */
export let updateEditStateInURL = function() {
    var navigationParam = AwStateService.instance.params;
    navigationParam.edit = '';
    AwStateService.instance.go( '.', navigationParam, { location: 'replace' } );
};

/**
 * Get the saveAsInput for saveAsObjectAndRelate SOA
 *
 * @param {Object} data - The data
 * @param {Object} xrtContext - The XRT context
 * @return {Object} The saveAsInput
 */
export let getSaveAsInput = function( data, xrtContext ) {
    var ctxObj = xrtContext.SelectedObjects[ 0 ];

    // Prepare DeepCopyData
    var deepCopyDataArr = _.clone( data.deepCopyDatas.dbValue );
    _processDeepCopyData( deepCopyDataArr, data, xrtContext.CopyOverEnabled === 'true' );

    // Prepare saveAsInput
    var saveAsInputIn = {
        boName: ctxObj.type
    };

    _.forEach( data.saveAsInputs.dbValue, function( propName ) {
        var vmProp = data[ propName ];

        // Check if the property is compound
        var isCompound = false;
        var leafPropName = '';
        if( propName.indexOf( ':' ) > 0 ) {
            isCompound = true;
            var compoundPropName = propName.replace( /:/g, '__' );
            leafPropName = propName.substring( propName.lastIndexOf( ':' ) + 1 );
            vmProp = data[ compoundPropName ];
            if( !vmProp ) {
                vmProp = data[ leafPropName ];
            }
        }

        // If the property is modified, or is auto assignable (it has been already auto-assigned),
        // then it qualifies to be added to saveAsInputs.
        if( vmProp && ( vmProp.valueUpdated || vmProp.isAutoAssignable ) ) {
            if( isCompound ) {
                var deepCopyData = _getDeepCopyDataForProp( deepCopyDataArr, propName );
                _setProperty( deepCopyData.saveAsInput, leafPropName, vmProp );
            } else {
                _setProperty( saveAsInputIn, propName, vmProp );
            }
        }
    } );

    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( customPanelVMData, function( propVal, propName ) {
            if( _.has( oriVMData, propName ) ) {
                _setProperty( saveAsInputIn, propName, propVal );
            }
        } );
    } );

    return [ {
        targetObject: ctxObj,
        saveAsInput: saveAsInputIn,
        deepCopyDatas: deepCopyDataArr
    } ];
};

/**
 * Get the newly created Item created by saveAsObjectAndRelate SOA
 *
 * @param {Object} response - The response of saveAsObjectAndRelate SOA
 * @return {Object} The newly created object
 */
export let getNewCreatedObject = function( response ) {
    if( response && response.ServiceData && response.ServiceData.created ) {
        var position = response.ServiceData.created.length - 2;
        return response.output[0].objects[position];
    }
};

/**
 * Get the reviseInput for revideObjects SOA
 *
 * @param {Object} data - The data.
 * @return {Object} The reviseInput
 */
export let getReviseInputs = function( data ) {
    var reviseInputs = {};
    _.forEach( data.reviseInputs.dbValue, function( propName ) {
        // Consider if the property is modified, or is auto assignable (it has been already auto-assigned)
        var vmProp = data[ propName ];
        if( vmProp && ( vmProp.valueUpdated || vmProp.isAutoAssignable ) ) {
            var propVal = vmProp.dbValue;
            var reviseInputVal = [];
            if( _.isArray( propVal ) ) {
                _.forEach( propVal, function( val ) {
                    reviseInputVal.push( _convertPropValToString( val, vmProp.type ) );
                } );
            } else {
                reviseInputVal.push( _convertPropValToString( propVal, vmProp.type ) );
            }

            reviseInputs[ propName ] = reviseInputVal;
        }
    } );

    _.forEach( data.customPanelInfo, function( customPanelVMData ) {
        var oriVMData = customPanelVMData._internal.origDeclViewModelJson.data;
        _.forEach( customPanelVMData, function( propVal, propName ) {
            if( _.has( oriVMData, propName ) ) {
                reviseInputs[ propName ] = [];
                reviseInputs[ propName ].push( _convertPropValToString( propVal.dbValue, propVal.type ) );
            }
        } );
    } );

    return reviseInputs;
};
export let setActiveView = function( data ) {
    data.activeView = data.selectedTab.panelId;
};
/**
 * Gets the entered description string for baselineDescription
 *
 * @param {Object} data - The panel's view model object
 * @return {String} The description string
 */
export let getDescription = function( data ) {
    var description = '';
    if( data.baselineDescription.dbValue ) {
        description = data.baselineDescription.dbValue;
    }

    return description;
};

/**
 * Gets the entered isPreciseBaseline logical for baselinePrecise
 *
 * @param {Object} data - The panel's view model object
 * @return {String} The description string
 */
export let getPreciseBaseline = function( data ) {
    var isPreciseBaseline = '';
    if( data.baselinePrecise.dbValue ) {
        isPreciseBaseline = data.baselinePrecise.dbValue;
    } else {
        isPreciseBaseline = false;
    }
    return isPreciseBaseline;
};
export const updateRedlineProps = () => {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if( activeEditHandler ) {
        var dataSource = activeEditHandler.getDataSource();
        var modifiedProps = !( _.isNull( dataSource ) || _.isUndefined( dataSource ) ) ? dataSource.getAllModifiedProperties() : [];
        for( const modifiedProp of modifiedProps ) {
            if( appCtxSvc.getCtx( 'isRedLineMode' ) === 'true' ) {
                let { isArray, oldValue, oldValues, displayValues, prevDisplayValues, type } = modifiedProp;
                if( isArray ) {
                    if( oldValues === undefined ) {
                        modifiedProp.oldValues = prevDisplayValues === null || prevDisplayValues === undefined ? [] : prevDisplayValues;
                    } else if( _.isEqual( oldValues, displayValues ) ) {
                        //oldValue and new value become same
                        delete modifiedProp.oldValues;
                    }
                } else {
                    if( oldValue === undefined && !isEqual( type, prevDisplayValues, displayValues ) ) {
                        modifiedProp.oldValue = _.isArray( prevDisplayValues ) && prevDisplayValues.length > 0 ? prevDisplayValues[ 0 ] : '';
                    } else if( oldValue !== undefined && isEqual( type, [ oldValue ], displayValues ) ) {
                        delete modifiedProp.oldValue;
                    }
                }
            }
        }
    }
};

const isEqual = ( type, oldValues, newValues ) => {
    let equal = false;
    let oldValue = _.isArray( oldValues ) && oldValues.length > 0 ? oldValues[ 0 ] : '';
    let newValue = _.isArray( newValues ) && newValues.length > 0 ? newValues[ 0 ] : '';
    switch ( type ) {
        case 'DOUBLE':
            //50.0000 = 50
            equal = parseFloat( oldValue ) === parseFloat( newValue );
            break;
        default:
            equal = oldValue.toLowerCase() === newValue.toLowerCase();
            break;
    }
    return equal;
};
export default exports = {
    updateSaveAsContext,
    saveAsComplete,
    getSaveAsInput,
    getReviseInputs,
    getPreciseBaseline,
    getDescription,
    updateEditStateInURL,
    setActiveView,
    getNewCreatedObject,
    updateRedlineProps
};

/**
 * Save As panel service
 *
 * @memberof NgServices
 * @member saveAsService
 */
app.factory( 'saveAsService', () => exports );
