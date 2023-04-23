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
 * @module js/qfm0FmeaManagerUtils
 */
import eventBus from 'js/eventBus';
import _ from 'lodash';
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import cdm from 'soa/kernel/clientDataModel';
import cmm from 'soa/kernel/clientMetaModel';
import appCtxService from 'js/appCtxService';
import commandPanelService from 'js/commandPanel.service';
import dataManagementSvc from 'soa/dataManagementService';
import xrtParserService from 'js/xrtParser.service';
import messagingService from 'js/messagingService';
import _localeSvc from 'js/localeService';
import viewModelObjectService from 'js/viewModelObjectService';
import qfm0FmeaManagerUtils2 from 'js/qfm0FmeaManagerUtils2';
import editHandlerService from 'js/editHandlerService';
import editHandlerFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import commandService from 'js/command.service';

var exports = {};

const _qfm0FMEANode = 'Qfm0FMEANode';
const _qfm0FailureElement = 'Qfm0FailureElement';
const _qfm0FunctionElement = 'Qfm0FunctionElement';
const _qfm0SystemElement = 'Qfm0SystemElement';
const _fmeaContextSelectedCauseFailure = 'fmeaContext.selectedCauseFailure';
const _fmeaContextSelectedUidsCauseFailure = 'fmeaContext.selectedUidsCauseFailure';
const _qam0QualityAction = 'Qam0QualityAction';

var occContextKey = 'occmgmtContext';
var _staticXrtCommandIds = [ 'Awp0StartEdit', 'Awp0StartEditGroup', 'Awp0SaveEdits',
    'Awp0CancelEdits', 'Awp0Cut'
];
var VAR_CHAR_TYPE = 'Qc0VariableCharSpec';
var VIS_CHAR_TYPE = 'Qc0VisualCharSpec';
var ATT_CHAR_TYPE = 'Qc0AttributiveCharSpec';

/**
 *
 * @param {String} commandId - this is commandID to activate command panel
 * @param {String} location - this is for panel location
 * @param {ViewModel} parentObj - this is VM of parent
 */
export let getAddFmeaElementPanel = function( commandId, location, parentObj ) {
    if ( parentObj.type === '' || parentObj.type === null ) {
        dataManagementSvc.loadObjects( [ parentObj.uid ] ).then( function() {
            parentObj.type = cdm.getObject( parentObj.uid ).type;
            appCtxService.ctx.parentObj = parentObj;
        } );
    }
    if( ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_ProcessFlowChart' || appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_ProcessFlowChart' ) && appCtxService.ctx.selected === null && appCtxService.ctx.pselected === null && appCtxService.ctx.mselected[0] === null ) {
        appCtxService.registerCtx( 'pselected', appCtxService.ctx.treeVMO.selectedObjects[0] );
        appCtxService.registerCtx( 'selected', appCtxService.ctx.treeVMO.selectedObjects[0] );
    }
    appCtxService.registerCtx( 'parentObject', parentObj );
    commandPanelService.activateCommandPanel( commandId, location );
};

/**
 * Clear context of parentObject.
 */
export let clearCtx = function() {
    appCtxService.unRegisterCtx( 'parentObject' );
};

/**
 * Reset fmeaContext.
 */
export let clearFmeaCtx = function() {
    appCtxService.unRegisterCtx( 'fmeaContext' );
};

/**
 * This function will return the Soa Input for "addCausesAndEffects" SOA and triggers event for calling this SOA
 * @param {String} relation name of the relation object
 * @param {Array} secondaryObjects Arrays of the failure representation/specification
 * @param {Object} priObj (optional parameter) Primary failure representation object with which relation is being created
 */
export let getSoaInputsForEffectAndCauseObj = function( relation, secondaryObjects, priObj ) {
    var inputData = {};
    var soaInput = [];
    var secondaryObjectsArray = [];
    var primaryObj;
    primaryObj = qfm0FmeaManagerUtils2.setPrimaryObjectForCreatingRelation( priObj );

    secondaryObjects.forEach( function( selectedObj ) {
        secondaryObjectsArray.push( {
            uid: selectedObj.uid,
            type: selectedObj.type
        } );
    } );
    if ( primaryObj && secondaryObjects.length > 0 ) {
        inputData = {
            clientId: 'AWClient',
            failureModeObject: {


                uid: primaryObj.uid,
                type: primaryObj.type
            },
            failureObjects: secondaryObjectsArray,
            relationName: relation
        };
        soaInput.push( inputData );
    }
    return soaInput;
};

/**
 * This API is added to form the message string from the Partial error being thrown from the SOA
 *
 * @param {Object} messages - messages array
 * @param {Object} msgObj - message object
 */
export let getMessageString = function( messages, msgObj ) {
    _.forEach( messages, function( object ) {
        if(object.code !== 397102 && object.code !== 397103 ){
            msgObj.msg += '<BR/>';
            msgObj.msg += object.message;
            msgObj.level = _.max( [ msgObj.level, object.level ] );
        }
    } );
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let processPartialErrors = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    var informationMsg = {
        compltdMsg: '',
        inProgressMsg: ''
    };
      
if( response ) {
        if ( response.partialErrors ) {
            _.forEach( response.partialErrors, function( partialError ) {
                getMessageString( partialError.errorValues, msgObj );
                getInformationMessageString( partialError.errorValues, informationMsg );
            } );
        } else if(  response.ServiceData && response.ServiceData.partialErrors ) {
            _.forEach( response.ServiceData.partialErrors, function( partialError ) {
                getMessageString( partialError.errorValues, msgObj );
                getInformationMessageString( partialError.errorValues, informationMsg );
            } );
    }
}
if(informationMsg.compltdMsg || informationMsg.inProgressMsg){
    if(informationMsg.compltdMsg && informationMsg.inProgressMsg){
        var combinedMessage = {};
        combinedMessage += informationMsg.compltdMsg;
        combinedMessage += '<BR/>';
        combinedMessage += informationMsg.inProgressMsg;
        messagingService.showInfo(combinedMessage);
    }else if(informationMsg.compltdMsg){
        messagingService.showInfo(informationMsg.compltdMsg);
    }else if(informationMsg.inProgressMsg){
        messagingService.showInfo(informationMsg.inProgressMsg);
    }    
}
    return msgObj.msg;
};

/**
 * This API is added to identify information message from server and display it accordningly
 *
 * @param {Object} messages - messages array
 * @param {Object} informationObj - message object
 */
 export let getInformationMessageString = function( messages, informationMsg ) {
    _.forEach( messages, function( object ) {
        if(object.code === 397103){
            informationMsg.compltdMsg = object.message;
        }else if(object.code === 397102){
            informationMsg.inProgressMsg = object.message;
        }        
    } );
};

/**
 * This method returns a count of the total failure representation/specification added
 * @param {data} data
 * @param {response} response
 **/
export let getSuccessAttachObjectCount = function( response, data ) {
    if ( response.partialErrors !== undefined ) {
        var realPartialErrorCount = 0;
        for (var i = 0; i < response.partialErrors.length; i++) {
            if(response.partialErrors[i].errorValues[0].code !== 397103 && response.partialErrors[i].errorValues[0].code !== 397102 ){
                realPartialErrorCount++;
            }           
        }   
        return data.dataProviders.loadFilteredList.selectedObjects.length - realPartialErrorCount;
    }
};

/**
 * This method returns a count of the total causes/effects removed
 * @param {data} data
 * @param {response} response
 **/
export let getRemovedObjectCount = function( response, totalSelected ) {
    if ( response ) {
        var realPartialErrorCount = 0;
        if ( response.partialErrors !== undefined ) {            
            for (var i = 0; i < response.partialErrors.length; i++) {
                if(response.partialErrors[i].errorValues[0].code !== 397103 && response.partialErrors[i].errorValues[0].code !== 397102 ){
                    realPartialErrorCount++;
                }           
            }   
        }
        return response.partialErrors ? totalSelected - realPartialErrorCount : totalSelected;
    }
};

/**
 * This method returns FMEA Root Node
 **/
export let getFmeaRootNode = function( data ) {
    var fmeaRootNodeUid = fetchFmeaRootNodeUid();
    var fmeaRootNode = fetchFmeaRootNode( fmeaRootNodeUid );
    dataManagementSvc.getProperties( [ fmeaRootNode.uid ], [ 'object_name' ] ).then( function() {
        if ( data.i18n.qfm0HintExistingCause !== undefined && data.i18n.qfm0HintExistingEffect !== undefined ) {
            data.i18n.qfm0HintExistingCause = data.i18n.qfm0HintExistingCause.replace( '{0}', fmeaRootNode.props.object_name.dbValues[0] );
            data.i18n.qfm0HintExistingEffect = data.i18n.qfm0HintExistingEffect.replace( '{0}', fmeaRootNode.props.object_name.dbValues[0] );
        }

        // If "Failure Analysis" or "Function Analysis" tab is open then update fmea root node checkbox's label text by actual fmea root node's name
        if ( data.fmeaRootNodeSelected && fmeaRootNode ) {
            data.fmeaRootNodeSelected.displayValues = data.fmeaRootNodeSelected.uiValues = [ fmeaRootNode.props.object_name.dbValues[0] ];
            data.fmeaRootNodeSelected.uiValue = data.fmeaRootNodeSelected.propertyDisplayName = fmeaRootNode.props.object_name.dbValues[0];
        }
        return fmeaRootNode;
    } );
};

/**
 * This method fetches FMEA Root Node object from client data model
 **/
var fetchFmeaRootNode = function( nodeId ) {
    return cdm.getObject( nodeId );
};

/**
 * This method returns FMEA Root Node uid
 **/
export let getFmeaRootNodeUid = function() {
    return fetchFmeaRootNodeUid();
};

/**
 * This method returns FMEA Root Node's name
 **/
export let getFmeaRootNodeName = function( data ) {
    let fmeaRootNode = getFmeaRootNode( data );
    if ( fmeaRootNode && fmeaRootNode.props && fmeaRootNode.props.object_name ) {
        return fmeaRootNode.props.object_name.dbValues[0];
    }

    return '';
};

/**
 * Get Primary object for create Effect and Cause Relation based on current selection
 */
export let getPrimaryObject = function() {
    var primaryObj = null;
    var pselected = appCtxService.ctx.pselected;
    if ( pselected !== undefined ) {
        if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 ) {
            primaryObj = appCtxService.ctx.selected;
        } else if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1 ) {
            primaryObj = appCtxService.ctx.pselected;
        } else if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FunctionElement ) > -1 ) {
            primaryObj = appCtxService.ctx.pselected;
        } else if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0SystemElement ) >-1  ) {
            primaryObj = appCtxService.ctx.selected;
        }
    } else {
        primaryObj = appCtxService.ctx.selected;
    }
    return primaryObj;
};

/**
 * This method evaluates FMEA Root Node uid based on current selection and pselection
 **/
var fetchFmeaRootNodeUid = function() {
    var fmeaRootNodeUid = null;
    var pselected = null;
    pselected = appCtxService.ctx.pselected;
    var selected = appCtxService.ctx.selected;
    if ( pselected && pselected.modelType) {
        if (pselected.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 ) {
            fmeaRootNodeUid = pselected.uid;
        } else if ( selected.modelType && selected.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1  ) {
            fmeaRootNodeUid = selected.uid;
        } else if ((pselected.modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1) 
        || (pselected.modelType.typeHierarchyArray.indexOf( _qfm0FunctionElement ) > -1)
        || (pselected.modelType.typeHierarchyArray.indexOf( _qfm0SystemElement ) > -1) ) {
            fmeaRootNodeUid = appCtxService.ctx.pselected.props.qfm0FmeaRoot.dbValues[0];
        }
    } else {
        if ( selected && selected.modelType && selected.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 ) {
            fmeaRootNodeUid = selected.uid;
        } else {
            fmeaRootNodeUid = selected && selected.props && selected.props.qfm0FmeaRoot && selected.props.qfm0FmeaRoot.dbValues ? selected.props.qfm0FmeaRoot.dbValues[0] : '';
        }
    }
    return fmeaRootNodeUid;
};

/**
 * The method gets the view model for current Prevention and Detection control and optimization actions for selected failure cause
 * @param {eventData} eventData selected failure cause is passed as eventdata
 */
 export let getViewModel = function( eventData ) {
    appCtxService.registerPartialCtx( 'fmeaContext.causeVMO', eventData.scope.viewModel );
    var previousSelection = appCtxService.getCtx( _fmeaContextSelectedUidsCauseFailure );
    let selectedHierarchy = appCtxService.getCtx( 'selected.modelType.typeHierarchyArray' );
    if ( selectedHierarchy.indexOf( _qam0QualityAction ) === -1 ) {
        if ( eventData.selectedObjects.length === 1 ) {
            appCtxService.registerPartialCtx( _fmeaContextSelectedCauseFailure, eventData.selectedObjects );
            appCtxService.registerPartialCtx( _fmeaContextSelectedUidsCauseFailure, eventData.selectedUids );
            if ( previousSelection === undefined || previousSelection === null || previousSelection && previousSelection[0] !== eventData.selectedUids[0] ) {
                eventBus.publish( 'qfm0ActionGroupAndDependentActionsGrid.plTable.reload' );
            }
        } else if ( eventData.selectedObjects.length === 0 || eventData.selectedObjects.length > 1 ) {
            appCtxService.updatePartialCtx( _fmeaContextSelectedCauseFailure, [] );
            appCtxService.updatePartialCtx( _fmeaContextSelectedUidsCauseFailure, [] );
        }
    }
};

/**
 * The method registers change of failure cause to load current control actions accordingly
 * @param {ctx} ctx appCtxService.ctx object
 */
 export let loadViewModel = function( ctx ) {
    var tableElement = document.getElementsByTagName( 'aw-table' ).length > 0 ? document.getElementsByTagName( 'aw-table' ) : document.getElementsByTagName( 'aw-splm-table' );
    let objectSet;
    if ( appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Content' && ( appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Risk_Analysis' || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Optimization' ) ) {
        objectSet = tableElement[1].attributes.gridid.value;
    } else if ( appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Risk_Analysis' || appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Optimization' ) {
        objectSet = tableElement[0].attributes.gridid.value;
    }
    var editHandler = editHandlerService.getActiveEditHandler();
    var dataSource = editHandler.getDataSource();
    appCtxService.registerPartialCtx( 'fmeaContext.causeVMO', dataSource.getDeclViewModel() );
    eventBus.subscribe( objectSet + '.selectionChangeEvent', function( eventData ) {
        if ( ctx.editInProgress ) {
            var activeEditHandler = editHandlerService.getActiveEditHandler();
            activeEditHandler.isDirty().then( function( response ) {
                if ( response ) {
                    activeEditHandler.leaveConfirmation().then( function() {
                        getViewModel( eventData );
                    } );
                } else {
                    activeEditHandler.cancelEdits();
                    getViewModel( eventData );
                    commandService.executeCommand( 'Awp0StartEdit' );
                }
            } );
        } else {
            getViewModel( eventData );
        }
    } );
};

export let cleanup = function() {
    appCtxService.updatePartialCtx( _fmeaContextSelectedCauseFailure, [] );
    appCtxService.updatePartialCtx( _fmeaContextSelectedUidsCauseFailure, [] );
    appCtxService.updatePartialCtx( 'fmeaContext.causeVMO', {} );
};

/**
 * This method returns the Action Item Id
 **/
export let getId = function( response, data ) {
    if ( response.generatedValues[0].generatedValues.fnd0ActionItemId.nextValue !== undefined || response.generatedValues[0].generatedValues.fnd0ActionItemId.nextValue !== null ) {
        data.nextId.uiValue = response.generatedValues[0].generatedValues.fnd0ActionItemId.nextValue;
        data.nextId.dbValue = response.generatedValues[0].generatedValues.fnd0ActionItemId.nextValue;
        return data.nextId;
    }
};

/**
 * Get Property descriptor for Qam0QualityAction object
 * @param {String} commandId panel id to activate the command panel
 * @param {String} location location name
 *@param {CommandContext} commandContext - the command context
 */
export let getPropertyDescriptorAndLaunchPanel = function( commandId, location, commandContext ) {
    var promise = soaSvc.ensureModelTypesLoaded( [ 'Qam0QualityAction' ] );
    if ( promise ) {
        promise.then( function() {
            if ( appCtxService.ctx.fmeaContext === undefined ) {
                appCtxService.ctx.fmeaContext = {};
            }
            appCtxService.ctx.fmeaContext.QualityAction = {};
            appCtxService.ctx.fmeaContext.QualityAction.ModelType = cmm.getType( 'Qam0QualityAction' );
            commandPanelService.activateCommandPanel( commandId, location, commandContext );
        } );
    }
};

/**
 * This method returns uid of selected Failure representation from PWA
 **/
export let getExcludeElements = function() {
    var selectedElement = null;
    var pselected = null;
    pselected = appCtxService.ctx.pselected;
    if ( pselected !== undefined ) {
        if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 ) {
            selectedElement = appCtxService.ctx.selected.uid;
        } else if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1 ) {
            selectedElement = appCtxService.ctx.pselected.uid;
        } else if ( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FunctionElement ) > -1 ) {
            selectedElement = appCtxService.ctx.pselected.uid;
        }else if (pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0SystemElement ) >-1 && appCtxService.ctx.locationContext['ActiveWorkspace:SubLocation'] === 'qualitySystemElementManagerSublocation') {
            selectedElement = appCtxService.ctx.selected.uid;
        }
    } else {
        selectedElement = appCtxService.ctx.selected.uid;
    }
    return selectedElement;
};

/**
 * This function will return the Soa Input for createRelations
 * @param {Array} secondaryObjects Arrays of the Group member objects selected in Add user Panel
 * @param {String} relation name of the relation object
 * @return {Object} Retuns inputData for Create Relation SOA
 */
export let createCrossFunctionUserInput = function( relation, secondaryObjects ) {
    var inputData = {};
    var secondaryObject = {};
    var soaInput = [];
    var primaryObj = {};
    var fmeaRootNode = appCtxService.ctx.selected;
    if ( primaryObj && secondaryObjects.length > 0 ) {
        secondaryObjects.forEach( function( selectedObj ) {
            secondaryObject = { uid: selectedObj.uid, type: selectedObj.type };
            inputData = {
                clientId: 'AWClient',
                primaryObject: fmeaRootNode,
                relationType: relation,
                secondaryObject: secondaryObject,
                userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
            };
            soaInput.push( inputData );
        } );
    }
    return soaInput;
};

/**
 * This function will return the Soa Input for deleteRelations
 * @param {Object} primaryObject Primary object in delete relation
 * @param {String} relation name of the relation object
 * @param {Array} secondaryObjects Arrays of the objects selected for removal
 * @return {Object} Retuns inputData for Delete Relation SOA
 */
export let getRemoveInput = function( primaryObject, relation, secondaryObjects ) {
    var inputData = {};
    var soaInput = [];
    if ( primaryObject && secondaryObjects.length > 0 ) {
        secondaryObjects.forEach( function( selectedObj ) {
            inputData = {
                clientId: 'AWClient',
                primaryObject: primaryObject,
                relationType: relation,
                secondaryObject: selectedObj,
                userData: { uid: 'AAAAAAAAAAAAAA', type: 'unknownType' }
            };
            soaInput.push( inputData );
        } );
    }
    return soaInput;
};

/**
 * This method is used for calling Drag and drop functionality for Failure Representation object
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 */
export let setPropertiesForDragDropFailureElementAsCauseEffect = function( targetObject, sourceObjects, relationType ) {
    var deferred = AwPromiseService.instance.defer();
    var propertiesToBeLoaded = [ 'qfm0FmeaRoot' ];
    if ( sourceObjects && sourceObjects[0] && sourceObjects[0].props && !sourceObjects[0].props.object_string ) {
        propertiesToBeLoaded.push( 'object_string' );
    }
    dataManagementSvc.getProperties( [ sourceObjects[0].uid ], propertiesToBeLoaded ).then( function() {
        setPropertiesForDragDropFailureAsCauseEffect( targetObject, sourceObjects, relationType );
    } );

    return deferred.promise;
};

/**
 * This method gives Confirmation and error messages for Drag and drop functionality for Failure Representation/Specification object
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 */
export let setPropertiesForDragDropFailureAsCauseEffect = function( targetObject, sourceObjects, relationType ) {
    var finalMessage;
    var sourceObjectString = '';
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var errorMessage = localTextBundle.qfm0DragDropError;
    var targetObjectString = targetObject && targetObject.props && targetObject.props.object_string && targetObject.props.object_string.uiValues ? targetObject.props.object_string.uiValues[0] : '';
    if ( sourceObjects && sourceObjects.length > 0 && sourceObjects.length === 1 ) {
        if ( sourceObjects[0].modelType.typeHierarchyArray.indexOf( 'Qc0Failure' ) > -1 || sourceObjects[0].modelType.typeHierarchyArray.indexOf( 'Qfm0FailureElement' ) > -1 && sourceObjects[0].props.qfm0FmeaRoot && targetObject.props.qfm0FmeaRoot && sourceObjects[0].props.qfm0FmeaRoot.dbValues[0] === targetObject.props.qfm0FmeaRoot.dbValues[0] ) {
            if ( relationType === 'Qfm0Cause' || relationType === 'Qfm0Effect' ) {
                if ( sourceObjects[0].props.object_string !== undefined ) {
                    sourceObjectString = sourceObjects[0].props.object_string.uiValues[0];
                }
                if ( relationType === 'Qfm0Cause' ) {
                    finalMessage = localTextBundle.qfm0CauseDragDropConfirmation;
                    finalMessage = finalMessage.replace( '{0}', sourceObjectString );
                    finalMessage = finalMessage.replace( '{1}', targetObjectString );
                } else if ( relationType === 'Qfm0Effect' ) {
                    finalMessage = localTextBundle.qfm0EffectDragDropConfirmation;
                    finalMessage = finalMessage.replace( '{0}', sourceObjectString );
                    finalMessage = finalMessage.replace( '{1}', targetObjectString );
                }

                showConfirmationMessageForDragDrop( targetObject, sourceObjects, relationType, finalMessage, localTextBundle );
            } else {
                handleDragDropForNoRelation( relationType );
            }
        } else if ( ( relationType === 'Qfm0Cause' || relationType === 'Qfm0Effect' ) && sourceObjects[0].modelType.typeHierarchyArray.indexOf( 'Qfm0FailureElement' ) > -1 && sourceObjects[0].props.qfm0FmeaRoot && targetObject.props.qfm0FmeaRoot && sourceObjects[0].props.qfm0FmeaRoot.dbValues[0] !== targetObject.props.qfm0FmeaRoot.dbValues[0] ) {
            // if relation type is cause/effect and source object is failure element but source and target failure elements don't exist in same FMEA
            var droppedInAnotherFMEAErrorMsg = localTextBundle.qfm0DroppedInAnotherFMEA;
            messagingService.showError( droppedInAnotherFMEAErrorMsg );
        } else {
            handleDragDropForNoRelation( relationType );
        }
    } else if ( sourceObjects && sourceObjects.length > 1 ) {
        if ( relationType === 'Qfm0Cause' || relationType === 'Qfm0Effect' ) {
            if ( relationType === 'Qfm0Cause' ) {
                finalMessage = localTextBundle.qfm0MultipleCauseDragDropConfirmation;
                finalMessage = finalMessage.replace( '{0}', sourceObjects.length );
                finalMessage = finalMessage.replace( '{1}', targetObjectString );
            } else if ( relationType === 'Qfm0Effect' ) {
                finalMessage = localTextBundle.qfm0MultipleEffectDragDropConfirmation;
                finalMessage = finalMessage.replace( '{0}', sourceObjects.length );
                finalMessage = finalMessage.replace( '{1}', targetObjectString );
            }
            showConfirmationMessageForDragDrop( targetObject, sourceObjects, relationType, finalMessage, localTextBundle );
        } else {
            handleDragDropForNoRelation( relationType );
        }
    } else {
        messagingService.showError( errorMessage );
    }
};

/**
 * Refresh target object related view
 * @param {ModelObject} targetObject Parent to which the object was dropped
 */
var refreshTargetObject = function( targetObject, relationType ) {
    if ( targetObject !== undefined ) {
        if ( appCtxService.ctx.tcSessionData.tcMajorVersion < 13 ) {
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: [ targetObject ],
                refreshLocationFlag: false
            } );
        }
        if ( appCtxService.ctx.tcSessionData.tcMajorVersion >= 13 ) {
            if ( relationType === 'Qfm0Cause' ) {
                if ( appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Risk_Analysis'
                    || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Risk_Analysis'
                    || appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Optimization'
                    || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Optimization'){ 
                        eventBus.publish( 'cdm.relatedModified', {
                            relatedModified: [ targetObject ],
                            refreshLocationFlag: false
                        } );                       
                }
                eventBus.publish( 'failureCauseTable.plTable.reload' );
            }
            if ( relationType === 'Qfm0Effect' ) {
                eventBus.publish( 'failureEffectTable.plTable.reload' );
            }
        }
    }
};

/**
 * Handle error conditions and show appropriate error message
 * @param {String} relationType relationType
 */
export let handleDragDropForNoRelation = function( relationType ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var errorMessage = localTextBundle.qfm0DragDropError;
    if ( !relationType ) {
        // If there is no relation type then show error message
        var droppedInFailureErrorMsg = localTextBundle.qfm0DroppedInFailure;
        messagingService.showError( droppedInFailureErrorMsg );
    } else {
        messagingService.showError( errorMessage );
    }
};

/**
 * Show confirmation message for drag and drop functionality for Failure Representation/Specification object to cause/effect table
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 * @param {String} finalMessage message string
 * @param {Service} localTextBundle localization service instance
 */
var showConfirmationMessageForDragDrop = function( targetObject, sourceObjects, relationType, finalMessage, localTextBundle ) {
    var cancelString = localTextBundle.qfm0Cancel;
    var proceedString = localTextBundle.qfm0Proceed;
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: cancelString,
        onClick: function( $noty ) {
            $noty.close();
        }
    },
    {
        addClass: 'btn btn-notify',
        text: proceedString,
        onClick: function( $noty ) {
            $noty.close();
            exports.dragAndDrop( targetObject, sourceObjects, relationType );
        }

    }
    ];
    messagingService.showWarning( finalMessage, buttons );
};

/**
 * Drag and drop functionality for Failure Representation/Specification object to cause/effect table
 * @param {ModelObject} targetObject Parent to which the object is to be dropped
 * @param {ModelObject} sourceObjects objects being dragged
 * @param {String} relationType relationType
 */
export let dragAndDrop = function( targetObject, sourceObjects, relationType ) {
    var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
    var localTextBundle = _localeSvc.getLoadedText( resource );
    var deferred = AwPromiseService.instance.defer();
    var relInput = {
        inputs: exports.getSoaInputsForEffectAndCauseObj( relationType, sourceObjects, targetObject )
    };
    soaSvc.post( 'Internal-FmeaManager-2019-12-FailureModeManagement', 'addCausesAndEffects', relInput ).then(
        function( response ) {
            if ( response.created !== undefined ) {
                var objectString = sourceObjects[0].props && sourceObjects[0].props.object_string && sourceObjects[0].props.object_string.uiValues && sourceObjects[0].props.object_string.uiValues[0] ? sourceObjects[0].props.object_string.uiValues[0] : '';
                var message = '';
                if ( relationType === 'Qfm0Cause' ) {
                    if ( sourceObjects && sourceObjects.length === 1 ) {
                        message = localTextBundle.qfm0CauseSingleSelectionSuccessMessage;
                        message = message.replace( '{0}', objectString );
                    } else if ( sourceObjects && sourceObjects.length > 1 ) {
                        message = localTextBundle.qfm0CauseMultipleSelectionSuccessMessage;
                        message = message.replace( '{0}', sourceObjects.length );
                    }
                } else if ( relationType === 'Qfm0Effect' ) {
                    if ( sourceObjects && sourceObjects.length === 1 ) {
                        message = localTextBundle.qfm0EffectSingleSelectionSuccessMessage;
                        message = message.replace( '{0}', objectString );
                    } else if ( sourceObjects && sourceObjects.length > 1 ) {
                        message = localTextBundle.qfm0EffectMultipleSelectionSuccessMessage;
                        message = message.replace( '{0}', sourceObjects.length );
                    }
                }
                messagingService.showInfo( message );
                deferred.resolve();
                refreshTargetObject( targetObject, relationType );
            }
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            var partialSuccessMessage = '';
            if ( sourceObjects && sourceObjects.length > 1 ) {
                var realPartialErrorCount = 0;
                var partialErrors = error.cause.partialErrors;
                for (var i = 0; i < partialErrors.length; i++) {
                    if(partialErrors[i].errorValues[0].code !== 397103 && partialErrors[i].errorValues[0].code !== 397102 ){
                    realPartialErrorCount++;
                    }
                }
                var successfullyPastedObjectCount = error && error.cause && error.cause.partialErrors ? sourceObjects.length - realPartialErrorCount : '';
                if(successfullyPastedObjectCount > 0){
                    if ( relationType === 'Qfm0Cause' ) {
                        partialSuccessMessage = localTextBundle.qfm0CauseMultiSelectPartialSuccessMessage;
                        partialSuccessMessage = partialSuccessMessage.replace( '{0}', successfullyPastedObjectCount );
                        partialSuccessMessage = partialSuccessMessage.replace( '{1}', sourceObjects.length );
                    } else if ( relationType === 'Qfm0Effect' ) {
                        partialSuccessMessage = localTextBundle.qfm0EffectMultiSelectPartialSuccessMessage;
                        partialSuccessMessage = partialSuccessMessage.replace( '{0}', successfullyPastedObjectCount );
                        partialSuccessMessage = partialSuccessMessage.replace( '{1}', sourceObjects.length );
                    }
                }                
                messagingService.showInfo( partialSuccessMessage );
            }

            //check if any information message sent for severity cascading and filter the message
            var msgObj = {
                msg: '',
                level: 0
            };
            var informationMsg = {
                compltdMsg: '',
                inProgressMsg: ''
            };

            if( error.cause ) {
                if ( error.cause.partialErrors ) {
                    var partialErrors = error.cause.partialErrors;
                    for (var i = 0; i < partialErrors.length; i++) {
                        getMessageString( partialErrors[i].errorValues, msgObj );
                        getInformationMessageString( partialErrors[i].errorValues, informationMsg );
                    }                  
                } 
            }         

            if(informationMsg.compltdMsg || informationMsg.inProgressMsg){
                if(informationMsg.compltdMsg && informationMsg.inProgressMsg){
                    var combinedMessage = {};
                    combinedMessage += informationMsg.compltdMsg;
                    combinedMessage += '<BR/>';
                    combinedMessage += informationMsg.inProgressMsg;
                    messagingService.showInfo(combinedMessage);
                }else if(informationMsg.compltdMsg){
                    messagingService.showInfo(informationMsg.compltdMsg);
                }else if(informationMsg.inProgressMsg){
                    messagingService.showInfo(informationMsg.inProgressMsg);
                }    
            }
            if(msgObj.msg){
                messagingService.showError( localTextBundle.qfm0DragDropError + ':</br>' + msgObj.msg );
            } 
            refreshTargetObject( targetObject, relationType );
        } );
    return deferred.promise;
};

/**
 * This function will return the Soa Input for removeCausesAndEffects relations
 * @param {Object} failureModeObject Primary object from which Causes And Effects needs to be removed.
 * @param {String} relation name of the relation object
 * @param {Array} failureObjects Arrays of the objects selected for removal
 * @return {Object} Retuns inputData for delete Relation SOA
 */
export let getRemoveEffectCauseInputs = function( failureModeObject, relation, failureObjects ) {
    var inputData = {};
    var soaInput = [];
    var failureObjectsArray = [];
    failureObjects.forEach( function( selectedObj ) {
        failureObjectsArray.push( {
            uid: selectedObj.uid,
            type: selectedObj.type
        } );
    } );
    if ( failureModeObject && failureObjects.length > 0 ) {
        inputData = {
            clientId: 'AWClient',
            failureModeObject: {
                uid: failureModeObject.uid,
                type: failureModeObject.type
            },
            failureObjects: failureObjectsArray,
            relationName: relation
        };
        soaInput.push( inputData );
    }
    return soaInput;
};

/**
 * Get current action type that is to be created
 */
export let getActionSubType = function() {
    if ( appCtxService.ctx.activeToolsAndInfoCommand.commandId === 'qfm0AddPreventionOptimizationAction' ) {
        return 'Preventive Action';
    } else if ( appCtxService.ctx.activeToolsAndInfoCommand.commandId === 'qfm0AddDetectionOptimizationAction' ) {
        return 'Detection Action';
    }
    return '';
};

/**
 * This method returns a count of the successfully pasted objects
 * @param {data} data
 * @param {response} response
 **/
export let getSuccessPastedObjectCount = function( response ) {
    if ( response.partialErrors !== undefined ) {
        var realPartialErrorCount = 0;
        for (var i = 0; i < response.partialErrors.length; i++) {
            if(response.partialErrors[i].errorValues[0].code !== 397103 && response.partialErrors[i].errorValues[0].code !== 397102 ){
                realPartialErrorCount++;
            }           
        } 
        return appCtxService.ctx.awClipBoardProvider.length - realPartialErrorCount;
    }
};

export let getCreatedRelationObject = function( response, data ) {
    if ( response.created && response.created.length > 0 ) {
        return response.modelObjects[response.created[response.created.length - 1]];
    }
};

/**
* Sets the selected neutral part
* @param {Object} data - The data Object
* @return {Object} The updated data object
*/
export let setSelectedObject = function( data ) {
    var currentContext = appCtxService.ctx[occContextKey];
    var neutralPartRevision;
    if ( currentContext ) {
        neutralPartRevision = cdm.getObject( currentContext.currentState.uid );
    } else {
        neutralPartRevision = cdm.getObject( appCtxService.ctx.selected.uid );
    }
    data.selectedNeutralPartRevisionList = [ neutralPartRevision ];
    data.selectedNeutralPart = neutralPartRevision;
    exports.data = data;
};


/**
* The method gets the view model for current Prevention and Detection control actions for selected failure cause
* @param {ctx} appCtxService.ctx object
* @param {eventData} selected failure cause is passed as eventdata
* @return {vmo} Retuns view model for current control actions
*/
export let getCharViewModel = function( ctx, eventData, data ) {
    var deferred = AwPromiseService.instance.defer();

    if ( eventData === undefined ) {
        appCtxService.unRegisterCtx( 'InspectionViewModel' );
    } else {
        var loadChxObjectInput = {
            objects: [ {
                type: 'Aqc0CharElementRevision',
                uid: eventData.selectedUids[0]
            } ],
            attributes: [ 'Aqc0LinkToSpec' ]
        };
        data.charRepRev = loadChxObjectInput.objects[0];
        soaSvc.post( 'Core-2006-03-DataManagement', 'getProperties', loadChxObjectInput ).then( function( getPropertiesResponse ) {
            var result = null;
            Object.keys( getPropertiesResponse.modelObjects ).map( function( key ) {
                if ( getPropertiesResponse.modelObjects[key].type === VIS_CHAR_TYPE || getPropertiesResponse.modelObjects[key].type === ATT_CHAR_TYPE ||
                    getPropertiesResponse.modelObjects[key].type === VAR_CHAR_TYPE ) {
                    result = getPropertiesResponse.modelObjects[key];
                }
            } );

            data.currentCharSpec = result;
            var currentCharSpec = viewModelObjectService.constructViewModelObjectFromModelObject( result );
            getXrtViewModelForCharSpec( currentCharSpec );

            deferred.resolve();
        }, function( reason ) {
            deferred.reject( reason );
        } );

        return deferred.promise;
    }
};

/**
 *This method ensures that it used to create xrt view model for charestics.
 */
var getXrtViewModelForCharSpec = function( charSpecObj ) {
    xrtParserService.getXrtViewModel( 'SUMMARY', 'tc_xrt_Overview', charSpecObj, _staticXrtCommandIds ).then(
        function( xrtViewModelforCharSpec ) {
            appCtxService.ctx.InspectionViewModel = xrtViewModelforCharSpec;
            return {
                vmo: xrtViewModelforCharSpec
            };
        } );
};


/**
 * The method registers change of failure cause to load current control actions accordingly
 * @param {ctx} appCtxService.ctx object
 */
export let loadCharViewModel = function( ctx ) {
    if ( ctx.fmeaContext === undefined ) {
        ctx.fmeaContext = {};
    }
    ctx.fmeaContext.selectedCauseFailure = [];
    var tableElement = document.getElementsByTagName( 'aw-table' ).length > 0 ? document.getElementsByTagName( 'aw-table' ) : document.getElementsByTagName( 'aw-splm-table' );

    if ( appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Content' && appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Characteristics' ) {
        var objectSet = tableElement[1].attributes.gridid.value;
    } else if ( appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Characteristics' ) {
        var objectSet = tableElement[0].attributes.gridid.value;
    }

    ctx.selectedFunctionElement = ctx.xrtSummaryContextObject;
    eventBus.subscribe( objectSet + '.selectionChangeEvent', function( eventData ) {
        ctx.fmeaContext.insDefVMO = eventData.scope.viewModel;

        if ( eventData.selectedUids.length !== 0 ) {
            var eventData1 = {
                selectedObjects: eventData.selectedObjects,
                selectedUids: eventData.selectedUids
            };
            eventBus.publish( 'InspectionDefinitionSelectionChanged', eventData1 );
        } else {
            ctx.selectedObjects = [];
            eventBus.publish( 'InspectionDefinitionSelectionChanged' );
        }
    } );
    appCtxService.unRegisterCtx( 'InspectionViewModel' );
};

/**
 * Clear context of InspectionViewModel.
 */
export let clearInspectionDefinitionContext = function() {
    appCtxService.unRegisterCtx( 'InspectionViewModel' );
};

/**
 * This function will return the Soa Input for createRelations
 * @param {Array} secondaryObjects Arrays of the function representation/specification
 * @param {String} relation name of the relation object
 */
export let getSoaInputsForHigherLowerFunction = function( relation, secondaryObjects, priObj ) {
    var inputData = {};
    var soaInput = [];
    var secondaryObjectsArray = [];
    var primaryObj;
    primaryObj = qfm0FmeaManagerUtils2.setPrimaryObjectForCreatingRelation( priObj );

    secondaryObjects.forEach( function( selectedObj ) {
        secondaryObjectsArray.push( {
            uid: selectedObj.uid,
            type: selectedObj.type
        } );
    } );
    if ( primaryObj && secondaryObjects.length > 0 ) {
        inputData = {
            focusElementFunction: {


                uid: primaryObj.uid,
                type: primaryObj.type
            },
            functions: secondaryObjectsArray,
            relationName: relation
        };
        soaInput.push( inputData );
    }
    return soaInput;
};

/**
 * This function will return the Soa Input for deleteRelations
 * @param {Object} focusElementFunction Primary or focus function object
 * @param {String} relation name of the relation object
 * @param {Array} functionsToBeRemoved Arrays of the objects of higher/lower level functions selected for removal
 * @return {Object} Retuns inputData required for removeHigherLowerLevelFunctions SOA
 */
export let getSoaInputForRemovingHigherLowerLevelFunctions = function( focusElementFunction, relation, functionsToBeRemoved ) {
    var soaInput = [];
    if ( focusElementFunction && functionsToBeRemoved && functionsToBeRemoved.length > 0 ) {
        var inputData = {
            focusElementFunction: focusElementFunction,
            functions: functionsToBeRemoved,
            relationName: relation
        };
        soaInput.push( inputData );
    }
    return soaInput;
};

/**
 * This method is used to get the LOV values for the versioning panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVList = function( response ) {
    return response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.object_name[0],
            propDisplayDescription: obj.propDisplayValues.qfm0FMEAType ? obj.propDisplayValues.qfm0FMEAType[0] : obj.propDisplayValues.object_desc[0],
            propInternalValue: obj.propInternalValues.object_name[0]
        };
    } );
};
/**
 * This function will return the Soa Input for checkaccessorsprivileges
 * @return {Object} Retuns groupmember object required for checkaccessorsprivileges SOA
 */
export let getGrpMbrForAccessPrivilegeSoa = function() {
    return cdm.getGroupMember();
};
/**
 * This function will return the Soa Input for checkaccessorsprivileges
 * @return {Object} Retuns objects array required for checkaccessorsprivileges SOA
 */
export let getobjArryForAccessPrivilegeSoa = function() {
    var ObjectsArray = [];
    var primaryObj = getPrimaryObject();
    if ( primaryObj ) {
        ObjectsArray.push( {
            uid: primaryObj.uid,
            type: primaryObj.type
        } );
    }
    var fmeaRootNodeUid = fetchFmeaRootNodeUid();
    var fmeaRootNode = fetchFmeaRootNode( fmeaRootNodeUid );
    ObjectsArray.push( {
        uid: fmeaRootNode.uid,
        type: fmeaRootNode.type
    } );
    return ObjectsArray;
};
/**
 * This function will return the Soa Input for checkaccessorsprivileges
 * @return {string} Retuns privilege list required for checkaccessorsprivileges SOA
 */
export let getPrvlgForAccessPrivilegeSoa = function() {
    return [ 'WRITE' ];
};

/**
 * This function will return "true" if specifications need to be included for search otherwise "false"
 * @param {Boolean} isLibrarySelected - true if checkbox is checked otherwise false
 * @return {String} "true" or "false"
 */
export let isSearchWithSpecsEnabled = function( isLibrarySelected ) {
    return isLibrarySelected ? 'true' : 'false';
};

/**
 * This function will return FMEA Root Node's ID if FMEA Root Node Checkbox is checked otherwise empty string
 * @param {Boolean} isFmeaRootNodeSelected - true if checkbox is checked otherwise false
 * @return {String} FMEA root node id or empty string
 */
export let isFmeaRootNodeCheckboxSelected = function( isFmeaRootNodeSelected ) {
    if ( isFmeaRootNodeSelected ) {
        return getFmeaRootNodeUid();
    }

    return '';
};

export let createVecNameInputForRep = function( data ) {
    var vecName = [];
    var relationObj = {};
    relationObj.name = 'qfm0SourceSpecification';
    relationObj.values = [ data.dataProviders.loadFilteredList.selectedObjects[0].uid ];
    vecName.push( relationObj );

    if ( data.updateRepNameBasisSpec.dbValue === true ) {
        var nameObj = {};
        nameObj.name = 'object_name';
        nameObj.values = [ data.dataProviders.loadFilteredList.selectedObjects[0].props.object_name.dbValue ];
        vecName.push( nameObj );
    }

    return vecName;
};

/**
 * This function returns the array of added or updated object IDs after relation creation in net view
 * @param {object} response - the response Object of SOA () addCauseEffect SOA / addHigherLowerLevelFunctions SOA
 */
export let getObjectIDsToUpdateOrAddInNetViewForRelations = function( response ) {
    var nodesToBeAddedOrUpdated = [];
    var relationsArray = [ 'Qfm0Cause', 'Qfm0Effect', 'Qfm0Calling', 'Qfm0CalledBy' ];
    if ( response ) {
        if ( response.updated && response.updated.length > 0 ) {
            response.updated.forEach( function( objectUid ) {
                nodesToBeAddedOrUpdated.push( objectUid );
            } );
        }
        if ( response.created && response.created.length > 0 && response.modelObjects ) {
            var modelObjectsKeysArray = Object.keys( response.modelObjects );
            response.created.forEach( function( createdObjUid ) {
                var index = modelObjectsKeysArray.indexOf( createdObjUid );
                if ( index > -1 ) {
                    var type = response.modelObjects[createdObjUid].type;
                    if ( relationsArray.indexOf( type ) < 0 ) {
                        nodesToBeAddedOrUpdated.push( createdObjUid );
                    }
                }
            } );
        }
    }
    return nodesToBeAddedOrUpdated;
};

/**
 * Prepare SOA input required for removing cause/effect SOA or for removing higher/lower level functions SOA
 * @param {Object} ctx
 * @param {String} relationType
 */
export let getSoaInputForRemovingRelationsInNetView = function( ctx, relationType ) {
    return qfm0FmeaManagerUtils2.prepareSoaInputForRemovingRelationsInNetView( ctx, relationType );
};

/**
 * This handler is invoke from Failure Element in primary view to make all failure cause and effect tables
 **/
export let addEditHandler = function() {
    var editHandler;

    var declVM = appCtxService.ctx.NONE.getDataSource().getDeclViewModel();

    declVM.dataProviders[appCtxService.ctx.fmeaContext.failureCauseTableProvider.name] = appCtxService.ctx.fmeaContext.failureCauseTableProvider;
    declVM.dataProviders[appCtxService.ctx.fmeaContext.failureEffectTableProvider.name] = appCtxService.ctx.fmeaContext.failureEffectTableProvider;

    //create Edit Handler
    editHandler = editHandlerFactory.createEditHandler( dataSourceService
        .createNewDataSource( {
            declViewModel: declVM
        } ) );
    //registerEditHandler
    if ( editHandler ) {
        editHandlerService.setEditHandler( editHandler, 'NONE' );
        editHandlerService.setActiveEditHandlerContext( 'NONE' );
        editHandler.startEdit();
    }
};

/**
 * This method creates input data required for "createObjects" SOA in order to create FMEA Elements.
 * @param {Object} data
 * @param {Object} ctx context object
 * @returns {ObjectArray} Input data array for "createObjects" SOA
 */
 export let getCreateObjectsInputforFMEAObjects = function( data, ctx ) {
    var inputData = [];
    inputData = qfm0FmeaManagerUtils2.getCreateObjectsInputforFMEAObjects( data, ctx );
    return inputData;
};

/**
 * This method creates input data required for "generateNextValuesForProperties" SOA.
 * @param {Object} data
 */
export let getCreateObjectsInputforgenerateID = function( data ) {
    var inputData = [];
    inputData = qfm0FmeaManagerUtils2.getCreateObjectsInputforgenerateID( data );
    return inputData;
};

/**
 * This API is added to process the Partial error being thrown from the SOA
 *
 * @param {object} response - the response Object of SOA
 * @return {String} message - Error message to be displayed to user
 */
export let populateErrorString = function( response ) {
    var msgObj = {
        msg: '',
        level: 0
    };
    if ( response && response.ServiceData.partialErrors ) {
        _.forEach( response.ServiceData.partialErrors, function( partialError ) {
            getMessageString( partialError.errorValues, msgObj );
        } );
    }
    return msgObj.msg;
};

export let getUpdatedFailureElementsUidsOnRemovingCause = function(response) {
    return qfm0FmeaManagerUtils2.getUpdatedFailureElementsUidsOnRemovingCause(response);
};

export default exports = {
    getAddFmeaElementPanel,
    clearCtx,
    clearFmeaCtx,
    getSoaInputsForEffectAndCauseObj,
    processPartialErrors,
    getSuccessAttachObjectCount,
    getRemovedObjectCount,
    getFmeaRootNode,
    getFmeaRootNodeUid,
    getViewModel,
    loadViewModel,
    getId,
    getPropertyDescriptorAndLaunchPanel,
    getExcludeElements,
    createCrossFunctionUserInput,
    getRemoveInput,
    setPropertiesForDragDropFailureElementAsCauseEffect,
    dragAndDrop,
    getRemoveEffectCauseInputs,
    getActionSubType,
    getSuccessPastedObjectCount,
    getCreatedRelationObject,
    setSelectedObject,
    getCharViewModel,
    loadCharViewModel,
    clearInspectionDefinitionContext,
    getSoaInputsForHigherLowerFunction,
    getSoaInputForRemovingHigherLowerLevelFunctions,
    getLOVList,
    getobjArryForAccessPrivilegeSoa,
    getGrpMbrForAccessPrivilegeSoa,
    getPrvlgForAccessPrivilegeSoa,
    isSearchWithSpecsEnabled,
    isFmeaRootNodeCheckboxSelected,
    getFmeaRootNodeName,
    createVecNameInputForRep,
    getPrimaryObject,
    setPropertiesForDragDropFailureAsCauseEffect,
    handleDragDropForNoRelation,
    getObjectIDsToUpdateOrAddInNetViewForRelations,
    getSoaInputForRemovingRelationsInNetView,
    addEditHandler,
    getMessageString,
    cleanup,
    getCreateObjectsInputforFMEAObjects,
    getCreateObjectsInputforgenerateID,
    populateErrorString,
    getInformationMessageString,
    getUpdatedFailureElementsUidsOnRemovingCause
};
app.factory( 'qfm0FmeaManagerUtils', () => exports );
