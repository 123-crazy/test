// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define

 */
/**
 * This file is used as utility file for characteristics manager from quality center foundation module
 *
 * @module js/Aqc0CharSpecOperationsService
 */
import app from 'app';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import messagingService from 'js/messagingService';
import appCtxService from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import editHandlerSvc from 'js/editHandlerService';
import _ from 'lodash';
import logger from 'js/logger';
import eventBus from 'js/eventBus';
import uwPropertySvc from 'js/uwPropertyService';
import aqc0CharLibTreeSvc from 'js/Aqc0CharLibraryTreeTableService';
import aqc0CharManage from 'js/Aqc0CharManagerUtils';
import aqc0UtilService from 'js/Aqc0UtilService';

var exports = {};

/**
* Bind the properties for SPecification Edit
*
* @param data View Model Data
*/
export let bindPropertiesForCharSpecEdit = function( data ) {
    var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
    data.objectName = selectedObject.props.object_name;
    data.qc0NominalValue = selectedObject.props.qc0NominalValue;
    data.qc0UpperTolerance = selectedObject.props.qc0UpperTolerance;
    data.qc0LowerTolerance = selectedObject.props.qc0LowerTolerance;
    data.qc0limitation = selectedObject.props.qc0limitation;
    data.qc0ToleranceType = selectedObject.props.qc0ToleranceType;
    data.qc0UnitOfMeasure = selectedObject.props.qc0UnitOfMeasure;
    data.qc0Criticality = selectedObject.props.qc0Criticality;

    var activeEditHandler = editHandlerSvc.getActiveEditHandler();

    if ( appCtxService.ctx.isTC13_2OnwardsSupported ) {
        data.objectName ? uwPropertySvc.setIsEditable(  data.objectName, activeEditHandler.editInProgress() ) : 'nothing to do';
    }
    data.qc0NominalValue ? uwPropertySvc.setIsEditable(  data.qc0NominalValue, activeEditHandler.editInProgress() ) : 'nothing to do';
    data.qc0UpperTolerance ? uwPropertySvc.setIsEditable(  data.qc0UpperTolerance, activeEditHandler.editInProgress() ) : 'nothing to do';
    data.qc0LowerTolerance ? uwPropertySvc.setIsEditable(  data.qc0LowerTolerance, activeEditHandler.editInProgress() ) : 'nothing to do';
    data.qc0limitation ? uwPropertySvc.setIsEditable(  data.qc0limitation, activeEditHandler.editInProgress() ) : 'nothing to do';
    data.qc0ToleranceType ? uwPropertySvc.setIsEditable(  data.qc0ToleranceType, activeEditHandler.editInProgress() ) : 'nothing to do';
    data.qc0UnitOfMeasure ? uwPropertySvc.setIsEditable(  data.qc0UnitOfMeasure, activeEditHandler.editInProgress() ) : 'nothing to do';
    data.qc0Criticality ? uwPropertySvc.setIsEditable(  data.qc0Criticality, activeEditHandler.editInProgress() ) : 'nothing to do';
};

/**
* Method to call the Save Edit SOA
* @param input Input
*/
export let callSaveEditSoa = function( input ) {
    return soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', input ).then(
        function( response ) {
            if ( appCtxService.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' ) {
              //  eventBus.publish('primaryWorkarea.reset');
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: [
                        appCtxService.ctx.selected
                    ]
                } );
            }
            return response;
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
            return error;
        }
    );
};
/**
* This method to create save edit SOA input preperation
*
* @param dataSource Data Source
*/
export let createSaveEditSoaInput = function( dataSource ) {
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsMap = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

    var inputs = [];
    _.forEach( modifiedPropsMap, function( modifiedObj ) {
        var modelObject;
        var viewModelObject = modifiedObj.viewModelObject;

        if( viewModelObject && viewModelObject.uid ) {
            modelObject = cdm.getObject( viewModelObject.uid );
        }

        if( !modelObject ) {
            modelObject = {
                uid: cdm.NULL_UID,
                type: 'unknownType'
            };
        }

        var viewModelProps = modifiedObj.viewModelProps;
        var input = dms.getSaveViewModelEditAndSubmitToWorkflowInput( modelObject );
        _.forEach( viewModelProps, function( props ) {
            if( Array.isArray( props.sourceObjectLastSavedDate ) ) {
                props.sourceObjectLastSavedDate = props.sourceObjectLastSavedDate[0];
            }
            dms.pushViewModelProperty( input, props );
        } );
        inputs.push( input );
    } );
    return inputs;
};

/**
* This method return the value of required property.
* Currently this method is for prepation of add operation data.
* @param ctx Context
* @param data View Model data
* @param requiredPropName Required Property Name
*/
export let getRequiredValuesForOperation = function( ctx, data, requiredPropName ) {
    var propValues = [];
    //Add Action
    if( data.createdActionObject ) {
        propValues = [ data.createdActionObject.uid ];
    }
    //Add Selected Failures
    if( data.selectedObjects ) {
        for( var selectedObject of data.selectedObjects ) {
            propValues.push( selectedObject.uid );
        }
    }
    //Add created/searched References
    if( data.createdObjectForFailReferences ) {
        propValues = [ data.createdObjectForFailReferences.uid ];
    }
    if( data.sourceModelObjects && data.selectedTab.tabKey !== 'new' ) {
        for( var sourceModelObject of data.sourceModelObjects ) {
            propValues.push( sourceModelObject.uid );
        }
    }
    //Add created attachment
    if( data.createdAttachmentObject ) {
        propValues = [ data.createdAttachmentObject.uid ];
    }
    //Fetch the values in which needs to be append new value/values.
    for( var qa = 0; qa < ctx.selected.props[requiredPropName].dbValues.length; qa++ ) {
        propValues.push( ctx.selected.props[requiredPropName].dbValues[ qa ] );
    }
    //Add Image to Visual Char Spec
    if( data.createdImageDatasetObjectInVisChar ) {
        propValues = [ data.createdImageDatasetObjectInVisChar.uid ];
    }
    return propValues;
};

/**
* This method return updated list of given property values.
* Currently this method is for prepation of remove/replace operation data.
* @param selectedObjFProp Selected Object For Property
* @param propName Property Name
* @param data VIew Model Data
* @return getUpdatedPropValuesList Updated Property Value list
*/
export let getUpdatedPropValues = function( selectedObjFProp, propName, data ) {
    //Fetching the specified property values
    var getPropValues = selectedObjFProp.props[propName].dbValues;
    var objNeedsToBeRemoved = [];
    for( var selected of appCtxService.ctx.mselected ) {
        objNeedsToBeRemoved.push( selected.uid );
    }
    //Remove the selected Actions/Failures/attachments/References from fetched data
    var getUpdatedPropValuesList = getPropValues.filter( function( el ) {
        return objNeedsToBeRemoved.indexOf( el ) < 0;
      } );
    //Update To latest failure specification
    if( data.updateToLatestFF !== undefined && data.updateToLatestFF.dbValue === 'Update' && _.findIndex( getUpdatedPropValuesList.indexOf( appCtxService.ctx.latestFailureVers[ 0 ].uid ) === -1 ) ) {
        getUpdatedPropValuesList.push( appCtxService.ctx.latestFailureVers[ 0 ].uid );
    }
    return getUpdatedPropValuesList;
};

/**
* Method is preparing the setProperties SOA Input
* @param requiredObject Required Object
* @param propertyName Property Name
* @param propertyValue Property Value
* @return infoInput SOA input
*/
export let getSetPropertiesSOAInput = function( requiredObject, propertyName, propertyValue ) {
    var infoInput = {
        object: '',
        timestamp: '',
        vecNameVal:
        [
            {
                name: '',
                values:[]
            }
        ]
     };
     infoInput.object = requiredObject;
     infoInput.vecNameVal[0].name = propertyName;
     infoInput.vecNameVal[0].values = propertyValue;
     return infoInput;
};
/**
* Method to call the Save Edit SOA
* @param input Input for set properties SOA
* @param performAddOperation Perform Add Operation flag
*/
export let callSetPropertiesSoa = function( input, performAddOperation ) {
    return soaSvc.post( 'Core-2010-09-DataManagement', 'setProperties', { info:input } ).then(
        function( response ) {
            if( !performAddOperation ) {
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: [
                        appCtxService.ctx.pselected
                    ]
                } );
            }
            if( performAddOperation ) {
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: [
                        appCtxService.ctx.selected
                    ]
                } );
                eventBus.publish( 'complete', {
                    source:'toolAndInfoPanel'
                } );
            }
            if( appCtxService.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' ) {
                aqc0CharLibTreeSvc.clearMapOfCharGroupAndSpecification();
            }
            return response;
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
            eventBus.publish( 'complete', {
                source:'toolAndInfoPanel'
            } );
            return error;
        }
    ).catch( function( exception ) {
        logger.error( exception );
    } );
};
/**
* Method to prepare revise input
* @param selectedObj Selected Object
* @return reviseInputs Revise inpt
*/
export let getReviseInputsForSpecification = function( selectedObj ) {
    var qc0BasedOnIdProp = Number( selectedObj.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;
    return {
        qc0BasedOnId : [ qc0BasedOnIdProp.toString() ]
    };
};
/**
* Method to perform the revise operation
* @param selectedObj Selected Object
* @param reviseInputs Revise input
*/
export let performReviseSpecification = function( data, selectedObj ) {
    var reviseInputs = exports.getReviseInputsForSpecification( selectedObj );
    exports.callReviseAndDeepCopySOA( reviseInputs, selectedObj, data );
};
/**
* Method to call the revise and deep copydata
* @param reviseInputs Revise Input
* @param selectedObj Selected Object
* @data data View Model Data
*/
export let callReviseAndDeepCopySOA = function( reviseInputs, selectedObj, data ) {
    var inputData = { deepCopyDataInput: [
        {
            businessObject: selectedObj,
            operation: 'Revise'
        }
    ] };
    //Calling deepCopy SOA
    soaSvc.post( 'Core-2014-10-DataManagement', 'getDeepCopyData', inputData ).then( ( response )=>{
        if( response ) {
            let reviceInputlist = [];
            let reviceInput = {
                deepCopyDatas: self.convertDeepCopyData( response.deepCopyInfoMap[1][0] ),
                reviseInputs: reviseInputs,
                targetObject: selectedObj
            };
            reviceInputlist.push( reviceInput );
            //Calling reviseObject SOA
            soaSvc.post( 'Core-2013-05-DataManagement', 'reviseObjects', { reviseIn : reviceInputlist } ).then( function( reviseResponse ) {
                data.createdObject = reviseResponse.output[0].objects[0];
                appCtxService.ctx.createdObjectForTreeFromAddAction = reviseResponse.output[0].objects[0];
                appCtxService.ctx.AddSpecificationFlagForTree = true;
                appCtxService.ctx.newlyCeatedObj = true;
                //Refresh Failure Specification sublocation after revise 262-276
                if( appCtxService.ctx.failureManagerContext !== undefined ) {
                    aqc0UtilService.pushSelectedNodeInFailureContext( data );
                    if( appCtxService.ctx.pselected === undefined ) {
                        eventBus.publish( 'primaryWorkarea.reset' );
                    }
                    if( appCtxService.ctx.pselected !== undefined ) {
                        eventBus.publish( 'cdm.relatedModified', {
                            relatedModified: [
                                appCtxService.ctx.pselected,
                                appCtxService.ctx.selected
                            ]
                        } );
                    }
                }

                if( appCtxService.ctx.locationContext.modelObject === undefined && appCtxService.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
                    eventBus.publish( 'cdm.relatedModified', {
                        relatedModified: [
                            appCtxService.ctx.selected
                        ]
                    } );
                }
                if( appCtxService.ctx.locationContext.modelObject !== undefined && appCtxService.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
                    eventBus.publish( 'cdm.relatedModified', {
                        refreshLocationFlag: false,
                        relatedModified: [
                            appCtxService.ctx.locationContext.modelObject
                        ],
                        createdObjects: [ data.createdObject ]
                    } );
                }
                if( appCtxService.ctx.locationContext.modelObject !== undefined && appCtxService.ctx.locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Qc0MasterCharSpec' ) > -1 ) {
                    var commandId = 'Awp0ShowObject';
                    var commandArgs = {
                        edit: false
                    };
                    var commandContext = {
                        vmo: data.createdObject
                    };
                    aqc0CharManage.openNewObject( commandId, commandArgs, commandContext );
                }
                if( appCtxService.ctx.locationContext.modelObject === undefined && appCtxService.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' ) {
                    appCtxService.ctx.createdObjectForTreeFromAddAction = data.createdObject;
                    appCtxService.ctx.versionCreatedFlag =  true;
                    eventBus.publish( 'primaryWorkarea.reset' );
                }
                if( reviseResponse.output[0] ) {
                    //var sucessMessage = '"' + data.createdObject.props.object_name.dbValues[0] + '" version was created';
                    var sucessMessage = data.i18n.VersionCreated.replace( '{0}', data.createdObject.props.object_name.dbValues[ 0 ] );
                    aqc0CharLibTreeSvc.clearMapOfCharGroupAndSpecification();
                    messagingService.showInfo( sucessMessage );
                }
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
self.convertDeepCopyData = function( deepCopyData ) {
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
            aNewChildDeepCopyData = self.convertDeepCopyData( deepCopyData[ i ].childDeepCopyData );
        }
        newDeepCopyData.childDeepCopyData = aNewChildDeepCopyData;
        deepCopyDataList.push( newDeepCopyData );
    }

    return deepCopyDataList;
 };

export default exports = {
    bindPropertiesForCharSpecEdit,
    createSaveEditSoaInput,
    callSaveEditSoa,
    getRequiredValuesForOperation,
    getSetPropertiesSOAInput,
    getUpdatedPropValues,
    callSetPropertiesSoa,
    getReviseInputsForSpecification,
    performReviseSpecification,
    callReviseAndDeepCopySOA
};
app.factory( 'Aqc0CharSpecOperationsService', () => exports );
