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
 * This file is used as utility file for Specification manager from quality center foundation module
 *
 * @module js/qfm0SpecificationUtils
 */
import eventBus from 'js/eventBus';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import editHandlerSvc from 'js/editHandlerService';
import messagingSvc from 'js/messagingService';
import dataSourceService from 'js/dataSourceService';
import appCtxService from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import editHandlerFactory from 'js/editHandlerFactory';
import commandPanelService from 'js/commandPanel.service';
import _ from 'lodash';
import commandService from 'js/command.service';
import cdm from 'soa/kernel/clientDataModel';

var exports = {};

/**
 * This method is used to get the input for the versioning soa
 *
 * @param {Object} ctxObj for the current selected object
 * @param {Object} dataSource dataSource of the active edit handler
 */
export let getVersionInput = function( dataSource, selectedSpecificationVmo ) {

    // Prepare versionInput
    var versionInput = {
        "data": {}
    };
    versionInput.clientId = 'AWClient';
    versionInput.sourceSpecification = {
        'type': selectedSpecificationVmo.type,
        'uid': selectedSpecificationVmo.uid
    };
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

    versionInput.data.stringProps = {};
    versionInput.data.boolProps = {};
    versionInput.data.intProps = {};
    for( var i in modifiedPropsWithoutSubProp ) {
        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            createInputForVersion( modifiedVMProperty, versionInput );
        } );
    }
    return [ versionInput ];
};

var createInputForVersion = function( PropsVmo, versionInput ) {
    switch ( PropsVmo.type ) {
        case 'STRING':
            versionInput.data.stringProps[ PropsVmo.propertyName ] = PropsVmo.dbValue;
            break;
        case 'INTEGER':
            versionInput.data.intProps[ PropsVmo.propertyName ] = PropsVmo.dbValue;
            break;
        case 'BOOLEAN':
            versionInput.data.boolProps[ PropsVmo.propertyName ] = PropsVmo.dbValue;
            break;
    }
    return versionInput;
};

/**
 * Save edits for versioning from info panel save button
 *@param {data} data
 * @return  {promise} promise when all modified Function Specification properties get saved
 */
export let infoPanelSaveEdit = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    editHandlerSvc.setActiveEditHandlerContext( 'INFO_PANEL_CONTEXT' );
    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();

    var input = {};
    input.specificationInputs = exports.getVersionInput( dataSource, data.vmo );
    exports.callVersioningSoa( input ).then( function( newSpecification ) {
        deferred.resolve( newSpecification );
        exports.setEditedObjectInContextAndReset( newSpecification, activeEditHandler );
    }, function( err ) {
        activeEditHandler.cancelEdits();
        deferred.resolve();
    } );
    return deferred.promise;
};

/**
 * Call Versioning SOA for specifications and handle success and failure cases
 *@param {deferred} deferred
 * @return  {promise} promise when all modified Function Specification properties get saved
 */
export let callVersioningSoa = function( input ) {
    return soaSvc.post( 'Internal-CharManagerAW-2018-12-QualityManagement', 'createSpecificationVersion', input ).then(
        function( response ) {
            return response.specificationsOutput[ 0 ].newSpecification;
        },
        function( error ) {
            var errMessage = messagingSvc.getSOAErrorMessage( error );
            messagingSvc.showError( errMessage );
            throw error;
        }
    );

};

export let removeSelectedNodeContext = function() {
    if( appCtxService.ctx.functionSpecManagerContext !== undefined ) {
        appCtxService.ctx.functionSpecManagerContext.selectedNodes = [];
    }
    if( appCtxService.ctx.systemEleSpecManagerContext !== undefined &&
        appCtxService.ctx.systemEleSpecManagerContext !== '' ) {
        appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = [];
    }
};

/**
 * Set context to select node after edit complete and reset primary work area
 *@param {ModelObject} selectedModelObject view mdoel that is selected after edit complete
 * @param {ActiveEditHandler} activeEditHandler current active edit handler
 */
export let setEditedObjectInContextAndReset = function( selectedModelObject, activeEditHandler ) {
    if( selectedModelObject.type === 'Qfm0SystemEleSpec' ) {
        if( appCtxService.ctx.systemEleSpecManagerContext === undefined || appCtxService.ctx.systemEleSpecManagerContext === '' ) {
            appCtxService.ctx.systemEleSpecManagerContext = {};
        }
        appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = [];
        appCtxService.ctx.systemEleSpecManagerContext.selectedNodes.push( selectedModelObject );
    } else if( selectedModelObject.type === 'Qfm0FunctionEleSpec' ) {
        if( appCtxService.ctx.functionSpecManagerContext === undefined ) {
            appCtxService.ctx.functionSpecManagerContext = {};
        }
        appCtxService.ctx.functionSpecManagerContext.selectedNodes = [];
        appCtxService.ctx.functionSpecManagerContext.selectedNodes.push( selectedModelObject );
    }
    if( activeEditHandler ) {
        activeEditHandler.saveEditsPostActions( true );
    } else if(activeEditHandler === null || activeEditHandler === undefined ){
        //This block of code will be entered while edit of function and system spec when TC version>=13.2 from commandviewmodel
        var saveActvEditHandler = editHandlerSvc.getActiveEditHandler();
        saveActvEditHandler.cancelEdits();
        saveActvEditHandler.saveEditsPostActions( true );
    }
    if( appCtxService.ctx.pselected !== undefined ) {
        eventBus.publish( 'cdm.relatedModified', {
            relatedModified: [
                appCtxService.ctx.pselected,
                appCtxService.ctx.selected
            ]
        } );
    } else {
        eventBus.publish( 'primaryWorkarea.reset' );
    }
};
export let  subscribeContentLoadedforAutoEdit = function() {
    eventBus.subscribe( 'awXRT2.contentLoaded', function(
        ) {
            //Open object in edit mode after create or version operation.
            if( appCtxService.ctx.newlyCeatedObj ) {
                appCtxService.ctx.newlyCeatedObj = false;
                var viewMode = appCtxService.ctx.ViewModeContext.ViewModeContext;
                var executeCommandId = viewMode === 'TreeSummaryView' ? 'Awp0StartEditSummary' : 'Awp0StartEdit';
                commandService.executeCommand( executeCommandId );
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

 /**
* Method to prepare revise input
* @param selectedObj Selected Object
* @return reviseInputs Revise inpt
*/
export let getVersionInputsForSpecification = function( selectedObj ) {
    var qc0BasedOnIdProp = Number( selectedObj.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;
    var reviseInputs = {
        qc0BasedOnId : [qc0BasedOnIdProp.toString()]
    };
    return reviseInputs;
};
/**
* Method to perform the revise operation
* @param selectedObj Selected Object
* @param reviseInputs Revise input
*/
export let performVersioningForSpecification = function( data, selectedObj ) {
    var reviseInputs = exports.getVersionInputsForSpecification(selectedObj);
    exports.callReviseAndDeepCopySOAforVersioning(reviseInputs,selectedObj,data);
};
/**
* Method to call the revise and deep copydata
* @param reviseInputs Revise Input
* @param selectedObj Selected Object
* @data data View Model Data
*/
export let callReviseAndDeepCopySOAforVersioning = function( reviseInputs, selectedObj, data ) {
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
                appCtxService.ctx.newlyCeatedObj = true;
                //Refresh Specification sublocation after revise
                if( appCtxService.ctx.systemEleSpecManagerContext !== undefined ) {
                    exports.pushSelectedNodeInSysEpcManagerContext( data );
                    eventBus.publish( 'primaryWorkarea.reset' );
                }
                if( appCtxService.ctx.functionSpecManagerContext !== undefined ) {
                    exports.pushSelectedNodeInFunctionSpecManagerContext( data );
                    eventBus.publish( 'primaryWorkarea.reset' );
                }
            }, ( error )=> {
               var errMessage = messagingSvc.getSOAErrorMessage( error );
               messagingSvc.showError( errMessage );
            } );
        }
    } );
};

/**
 * Set the selected node value when doing the system spec Version.
 */
export let pushSelectedNodeInSysEpcManagerContext = function( data ) {
    appCtxService.ctx.systemEleSpecManagerContext.selectedNodes = [];
    appCtxService.ctx.systemEleSpecManagerContext.selectedNodes.push( data.createdObject );
};

/**
 * Set the selected node value when doing the function spec Version.
 */
export let pushSelectedNodeInFunctionSpecManagerContext = function( data ) {
    appCtxService.ctx.functionSpecManagerContext.selectedNodes = [];
    appCtxService.ctx.functionSpecManagerContext.selectedNodes.push( data.createdObject );
};

/**
* This method to create save edit SOA input preperation
*
* @param dataSource Data Source
*/
export let buildInputForSaveEditingFunNSysSpec = function() {
    editHandlerSvc.setActiveEditHandlerContext('NONE');

    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
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

export default exports = {
    getVersionInput,
    infoPanelSaveEdit,
    callVersioningSoa,
    removeSelectedNodeContext,
    setEditedObjectInContextAndReset,
    performVersioningForSpecification,
    subscribeContentLoadedforAutoEdit,
    getVersionInputsForSpecification,
    callReviseAndDeepCopySOAforVersioning,
    pushSelectedNodeInSysEpcManagerContext,
    pushSelectedNodeInFunctionSpecManagerContext,
    buildInputForSaveEditingFunNSysSpec
};
app.factory( 'qfm0SpecificationUtils', () => exports );
