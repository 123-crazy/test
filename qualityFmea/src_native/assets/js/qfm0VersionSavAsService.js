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
 * This file is used as utility file for Fmea Manager from FMEA module
 *
 * @module js/qfm0VersionSavAsService
 */

import _ from 'lodash';
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import messagingService from 'js/messagingService';
import _localeSvc from 'js/localeService';
import dateTimeSvc from 'js/dateTimeService';

var exports = {};

/**
 * function to make async call for fmea root node versioning.
 * @param {selected} selected object
 */
export let fmeaRootNodeVersion = function( selected ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );

    let message = localTextBundle.qfm0FmeaRootVersionSubmitMessage;
    message = message.replace( '{0}', selected.props.object_string.uiValues[0] );
    messagingService.showInfo( message );

    var inputData = { deepCopyDataInput: [
                   {
                       businessObject: selected,
                       operation: 'Revise'
                   }
               ] };

               soaSvc.post( 'Core-2014-10-DataManagement', 'getDeepCopyData', inputData ).then( ( response )=>{
                   if( response ) {
                       let reviceInputlist = [];
                       let reviceInput = {
                           deepCopyDatas: convertDeepCopyData( response.deepCopyInfoMap[1][0] ),
                           reviseInputs: {},
                           targetObject: selected
                       };
                       reviceInputlist.push( reviceInput );
                       soaSvc.post( 'Core-2013-05-DataManagement', 'reviseObjects', { reviseIn : reviceInputlist } ).then( function( reviseResponse ) {
                           let message = localTextBundle.qfm0FmeaRootVersionSuccessMessage;
                           message = message.replace( '{0}', selected.props.object_string.uiValues[0] );
                           let newVersion = '';
                           if( reviseResponse ) {
                           let reviseObj = reviseResponse.output[0].objects.find( ( obj ) =>  obj.type === 'Qfm0FMEANode' );
                           newVersion = reviseResponse.ServiceData.modelObjects[reviseObj.uid].props.qc0BasedOnId.dbValues[0];
                           }

                           message = message.replace( '{1}', newVersion );
                           messagingService.showInfo( message );
                       }, ( error )=> {
                           var errMessage = messagingService.getSOAErrorMessage( error );
                           messagingService.showError( errMessage );
                       } );
                   }
               } );
};

/**
* Convert Deep Copy Data from client to server format
*
* @param deepCopyData property name
* @return A list of deep copy datas
*/
let convertDeepCopyData = function( deepCopyData ) {
   var deepCopyDataList = [];
   for( var i = 0; i < deepCopyData.length; i++ ) {
       var newDeepCopyData = {};
       newDeepCopyData.attachedObject = deepCopyData[ i ].attachedObject;
       newDeepCopyData.copyAction = deepCopyData[ i ].propertyValuesMap.copyAction[ 0 ];
       newDeepCopyData.propertyName = deepCopyData[ i ].propertyValuesMap.propertyName[ 0 ];
       newDeepCopyData.propertyType = deepCopyData[ i ].propertyValuesMap.propertyType[ 0 ];

       var value = false;
       var tempStrValue = deepCopyData[ i ].propertyValuesMap.copy_relations[ 0 ];
       if( tempStrValue === '1' ) {
           value = true;
       }
       newDeepCopyData.copyRelations = value;

       value = false;
       tempStrValue = deepCopyData[ i ].propertyValuesMap.isTargetPrimary[ 0 ];
       if( tempStrValue === '1' ) {
           value = true;
       }
       newDeepCopyData.isTargetPrimary = value;

       value = false;
       tempStrValue = deepCopyData[ i ].propertyValuesMap.isRequired[ 0 ];
       if( tempStrValue === '1' ) {
           value = true;
       }
       newDeepCopyData.isRequired = value;

       newDeepCopyData.operationInputTypeName = deepCopyData[ i ].operationInputTypeName;

       var operationInputs = {};
       operationInputs = deepCopyData[ i ].operationInputs;
       newDeepCopyData.operationInputs = operationInputs;

       var aNewChildDeepCopyData = [];
       if( deepCopyData[ i ].childDeepCopyData && deepCopyData[ i ].childDeepCopyData.length > 0 ) {
           aNewChildDeepCopyData = convertDeepCopyData( deepCopyData[ i ].childDeepCopyData );
       }
       newDeepCopyData.childDeepCopyData = aNewChildDeepCopyData;
       deepCopyDataList.push( newDeepCopyData );
   }

   return deepCopyDataList;
};

/**
 * function to make async call for fmea root node save as.
 * @param {Object} data
 * @param {Object} selected
 */
export let saveAsforFMEANode = function( data, selected ) {
    var deepCopyDataArr = _.clone( data.deepCopyDatas.dbValue );
    if( data.copyCrossFunctionalTeam.dbValues[0] === false ) {
        let index = deepCopyDataArr.findIndex( ( obj )=>obj.propertyName === 'HasParticipant' );
        if( index >= 0 ) {
            deepCopyDataArr[index].copyAction = 'NoCopy';
        }
    }
    if( data.qfm0FMEAGuideline.valueUpdated ) {
        let index = deepCopyDataArr.findIndex( ( obj )=>obj.propertyName === 'qfm0FMEAGuideline' );
        deepCopyDataArr[index].attachedObject.uid = data.qfm0FMEAGuideline.newValue;
    }
     // Prepare saveAsInput
     var saveAsInputIn = {
        boName: selected.type
    };

    _.forEach( data.saveAsInputs.dbValue, function( propName ) {
        var vmProp = data[ propName ];

        if( vmProp && ( vmProp.valueUpdated || vmProp.isAutoAssignable ) ) {
                _setProperty( saveAsInputIn, propName, vmProp );
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

    let inputData = {
        saveAsInput: [ {
            targetObject: selected,
            saveAsInput: saveAsInputIn,
            deepCopyDatas: deepCopyDataArr
        } ],
        relateInfo: [ {
            relate: true
        } ]
    };
    soaSvc.post( 'Core-2012-09-DataManagement', 'saveAsObjectAndRelate', inputData ).then( function( saveAsResponse ) {
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );
        let message = localTextBundle.qfm0FmeaRootSaveAsSuccessMessage;
        let objName = selected.props.object_string.uiValues[0];
        if( saveAsResponse ) {
            let reviseObj = saveAsResponse.output[0].objects.find( ( obj ) =>  obj.type === 'Qfm0FMEANode' );
            objName = saveAsResponse.ServiceData.modelObjects[reviseObj.uid].props.object_name.dbValues[0];
        }
        message = message.replace( '{0}', objName );
        messagingService.showInfo( message );
    }, ( error )=> {
        var errMessage = messagingService.getSOAErrorMessage( error );
        messagingService.showError( errMessage );
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
 * to show confirmation dialog for version
 * @param {Object} selected - selected object
 */
export let getVersionConfirmationMessageInput = function( selected ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );

    var cancelString = localTextBundle.qfm0Cancel;
    var confirmString = localTextBundle.qfm0Confirm;
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: cancelString,
        onClick: function( $noty ) {
            $noty.close();
        }
    },
    {
        addClass: 'btn btn-notify',
        text: confirmString,
        onClick: function( $noty ) {
            $noty.close();
            exports.fmeaRootNodeVersion( selected );
        }

    }
    ];
    let finalMessage = localTextBundle.qfm0FmeaRootVersionConfirmationMessage;
        finalMessage = finalMessage.replace( '{0}', parseInt( selected.props.qc0BasedOnId.dbValues[0] ) + 1 );
        finalMessage = finalMessage.replace( '{1}', selected.props.object_string.uiValues[0] );
    messagingService.showWarning( finalMessage, buttons );
};

export default exports = {
    fmeaRootNodeVersion,
    saveAsforFMEANode,
    getVersionConfirmationMessageInput
};
app.factory( 'qfm0VersionSaveAsService', () => exports );
