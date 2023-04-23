// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/qa0AuditSaveAsService
 */

 import _ from 'lodash';
 import app from 'app';
 import dateTimeSvc from 'js/dateTimeService';
 import appCtxSvc from 'js/appCtxService';
 import commandPanelService from 'js/commandPanel.service';
 import selectionService from 'js/selection.service';

 var exports = {};

 /*
  * Method for invoking and registering/unregistering data for the Save As command panel
  *
  * @param {String} commandId - Command Id for the Save As command
  * @param {String} location - Location of the Save As command
  */
 export let getSaveAsPanel = function( commandId, location ) {
     var selection = selectionService.getSelection().selected;
     if( selection && selection.length > 0 ) {
        var jso = {
            selectedobject: selection
        };
         appCtxSvc.registerCtx( 'SaveAsContext', jso );
     } else {
         appCtxSvc.unRegisterCtx( 'SaveAsContext' );
     }
     commandPanelService.activateCommandPanel( commandId, location );
 };

 /**
  * This method updates the SWA on Save As of Audit
  */
export let updateAuditSWA = function(  ) {
        var summaryXRTObject = appCtxSvc.getCtx( 'xrtSummaryContextObject' );
        var SaveAsObject = appCtxSvc.getCtx( 'SaveAsContext' );
        var successorProp = summaryXRTObject.props[ 'GRMREL(Qa0QualityAuditSuccessorRel,Qa0QualityAudit).secondary_object' ];
        var saveAsSuccessorRelProp = SaveAsObject.selectedobject[0].props.Qa0QualityAuditSuccessorRel;
        successorProp.uiValue = saveAsSuccessorRelProp.uiValue;
        successorProp.dbValue = saveAsSuccessorRelProp.dbValue;
        successorProp.displayValues = saveAsSuccessorRelProp.displayValues;
        successorProp.parentUid = saveAsSuccessorRelProp.parentUid;
};
 /**
 * This method prepare SOA input for SaveAsObjectsAndRelate.
 * @param {object} data - Data of ViewModelObject
 * @param {contextObject} ctx - Context Object
 * @return {Object} - Input container for setProperties
 */
export let prepareSaveAsInput = function( data, ctx  ) {
    var saveAsInputIn = {
        boName: ctx.selected.type
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

    var convertedDeepCopyData = self.convertDeepCopyData( data.deepCopyDatas );
    data.deepCopyDatas.dbValues = convertedDeepCopyData;
    return [ {
        targetObject: ctx.selected,
        saveAsInput: saveAsInputIn,
        deepCopyDatas: data.deepCopyDatas.dbValues
    } ];
};

//  /**
//  * Convert Deep Copy Data from client to server format
//  *
//  * @param deepCopyData property name
//  * @return A list of deep copy datas
//  */
  self.convertDeepCopyData = function( deepCopyData ) {
    var deepCopyDataList = [];
    for( var i = 0; i < deepCopyData.length; i++ ) {
        var newDeepCopyData = {};
        newDeepCopyData.attachedObject = deepCopyData[ i ].attachedObject;
        newDeepCopyData.copyAction = deepCopyData[ i ].propertyValuesMap.copyAction[ 0 ];
        newDeepCopyData.propertyName = deepCopyData[ i ].propertyValuesMap.propertyName[ 0 ];
        newDeepCopyData.propertyType = deepCopyData[ i ].propertyValuesMap.propertyType[ 0 ];
        newDeepCopyData.saveAsInputTypeName = '';

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

        var saveAsInput = {};
        saveAsInput.boName = deepCopyData[ i ].attachedObject.type;
        newDeepCopyData.saveAsInput = saveAsInput;

        var aNewChildDeepCopyData = [];
        if( deepCopyData[ i ].childDeepCopyData && deepCopyData[ i ].childDeepCopyData.length > 0 ) {
            aNewChildDeepCopyData = self.convertDeepCopyData( deepCopyData[ i ].childDeepCopyData );
        }
        newDeepCopyData.childDeepCopyData = aNewChildDeepCopyData;
        deepCopyDataList.push( newDeepCopyData );
    }

    return deepCopyDataList;
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
 export default exports = {
     getSaveAsPanel,
     prepareSaveAsInput,
     updateAuditSWA
 };
 app.factory( 'qa0AuditSaveAsService', () => exports );
