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
 * @module js/qfm0FmeaManagerUtils2
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import selectionService from 'js/selection.service';
import qfm0FmeaManagerUtils from 'js/qfm0FmeaManagerUtils';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import editHandlerSvc from 'js/editHandlerService';
import messagingSvc from 'js/messagingService';
import _localeSvc from 'js/localeService';
import AwPromiseService from 'js/awPromiseService';
import actionSvc from 'js/qfm0ActionServices';
import _ from 'lodash';

var exports = {};
var saveHandler = {};

const FAILURE_CAUSE = 'Qfm0Cause';
const FAILURE_EFFECT = 'Qfm0Effect';
const NEXT_LOWER_LEVEL_FUNCTION = 'Qfm0Calling';
const _qfm0FMEANode = 'Qfm0FMEANode';
const _qfm0FailureElement = 'Qfm0FailureElement';
const _qfm0FunctionElement = 'Qfm0FunctionElement';
const _qfm0FMEAElement = 'Qfm0FMEAElement';
const _qam0QualityAction = 'Qam0QualityAction';
const _qfm0SystemElement = 'Qfm0SystemElement';

/**
 * Prepare SOA input required for removing cause/effect SOA or for removing higher/lower level functions SOA
 * @param {Object} ctx
 * @param {String} relationType
 */
export let prepareSoaInputForRemovingRelationsInNetView = function( ctx, relationType ) {
    if( !ctx.graph ) {
        return;
    }
    var graphModel = ctx.graph.graphModel;
    if( !graphModel ) {
        return;
    }
    var selectedEdges = graphModel.graphControl.getSelected( 'Edge' );
    var inputData;
    var soaInput = [];
    if( relationType === FAILURE_CAUSE ) {
        selectedEdges.forEach( function( edge ) {
            inputData = {};
            if( edge && edge.edgeData ) {
                inputData = {
                    clientId: 'AWClient',
                    failureModeObject: {
                        uid: edge.edgeData.leftId,
                        type: ctx.selected ? ctx.selected.type : ''
                    },
                    failureObjects: [ {
                        uid: edge.edgeData.rightId,
                        type: ctx.selected ? ctx.selected.type : ''
                    } ],
                    relationName: relationType
                };
                soaInput.push( inputData );
            }
        } );
    } else if( relationType === NEXT_LOWER_LEVEL_FUNCTION ) {
        selectedEdges.forEach( function( edge ) {
            inputData = {};
            if( edge && edge.edgeData ) {
                inputData = {
                    clientId: 'AWClient',
                    focusElementFunction: {
                        uid: edge.edgeData.leftId,
                        type: ctx.selected ? ctx.selected.type : ''
                    },
                    functions: [ {
                        uid: edge.edgeData.rightId,
                        type: ctx.selected ? ctx.selected.type : ''
                    } ],
                    relationName: relationType
                };
                soaInput.push( inputData );
            }
        } );
    }
    return soaInput;
};

export let updateShowFailureNetViewCtxValues = function( data, ctx ) {
    ctx.showFailureNetView = true;
};

export let resetShowFailureNetViewCtxValues = function() {
    appCtxService.unRegisterCtx( 'showFailureNetView' );
};

export let updateShowFunctionNetViewCtxValues = function( data, ctx ) {
    ctx.showFunctionNetView = true;
};

export let resetShowFunctionNetViewCtxValues = function() {
    appCtxService.unRegisterCtx( 'showFunctionNetView' );
};

/**
 * This method is to update selection based on  switching to table view.
 * @param {appCtxService} ctx
 */
export let handleViewSelectionChange = function( ctx ) {
    if( ctx.pselected !== null && ctx.pselected !== undefined && ( ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Qfm0FunctionElement' ) > -1 || ctx.pselected.modelType.typeHierarchyArray.indexOf(
            'Qfm0FailureElement' ) > -1 ) ) {
        selectionService.updateSelection( ctx.pselected, ctx.locationContext.modelObject );
    } else {
        selectionService.updateSelection( ctx.selected, ctx.locationContext.modelObject );
    }
};

export let updateCommandClassToSelected = function( ctx ) {
    var functionAnalysisNetView = document.querySelector( 'button[button-id=\'FunctionAnalysisNetView\']' );
    var functionAnalysisTableView = document.querySelector( 'button[button-id=\'FunctionAnalysisTableView\']' );
    var failureAnalysisNetView = document.querySelector( 'button[button-id=\'FailureAnalysisNetView\']' );
    var failureAnalysisTableView = document.querySelector( 'button[button-id=\'FailureAnalysisTableView\']' );

    if( ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Function_Analysis' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Function_Analysis' ) && ctx.showFunctionNetView ) {
        if( functionAnalysisNetView !== null ) {
            functionAnalysisNetView.classList.add( 'aw-state-selected' );
        }
        if( functionAnalysisTableView !== null ) {
            functionAnalysisTableView.classList.remove( 'aw-state-selected' );
        }
    }
    if( ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Function_Analysis' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Function_Analysis' ) && !ctx.showFunctionNetView ) {
        if( functionAnalysisNetView !== null ) {
            functionAnalysisNetView.classList.remove( 'aw-state-selected' );
        }
        if( functionAnalysisTableView !== null ) {
            functionAnalysisTableView.classList.add( 'aw-state-selected' );
        }
    }
    if( ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Failure_Analysis' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Failure_Analysis' ) && !ctx.showFailureNetView ) {
        if( failureAnalysisNetView !== null ) {
            failureAnalysisNetView.classList.remove( 'aw-state-selected' );
        }
        if( failureAnalysisTableView !== null ) {
            failureAnalysisTableView.classList.add( 'aw-state-selected' );
        }
    }
    if( ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Failure_Analysis' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Failure_Analysis' ) && ctx.showFailureNetView ) {
        if( failureAnalysisNetView !== null ) {
            failureAnalysisNetView.classList.add( 'aw-state-selected' );
        }
        if( failureAnalysisTableView !== null ) {
            failureAnalysisTableView.classList.remove( 'aw-state-selected' );
        }
    }
};

/**
 * Get Primary object for creating higher/lower level function and cause/effect relation
 */
export let setPrimaryObjectForCreatingRelation = function( priObj ) {
    var primaryObj = null;
    if( priObj !== undefined ) {
        var pselected = appCtxService.ctx.pselected;
        if( pselected !== undefined ) {
            if(  ( appCtxService.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_Function_Analysis' || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Function_Analysis' ) && appCtxService.ctx.showFunctionNetView  ||  ( appCtxService.ctx
                    .xrtPageContext.primaryXrtPageID === 'tc_xrt_Failure_Analysis' || appCtxService.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_Failure_Analysis' ) && appCtxService.ctx.showFailureNetView  ) {
                primaryObj = priObj;
            } else {
                if( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FMEANode ) > -1 ) {
                    primaryObj = appCtxService.ctx.selected;
                } else if( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FailureElement ) > -1 ) {
                    primaryObj = appCtxService.ctx.pselected;
                } else if( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0FunctionElement ) > -1 ) {
                    primaryObj = appCtxService.ctx.pselected;
                } else if( pselected.modelType && pselected.modelType.typeHierarchyArray.indexOf( _qfm0SystemElement ) > -1 ) {
                    primaryObj = appCtxService.ctx.selected;
                }
            }
        } else {
            primaryObj = priObj;
        }
    } else {
        primaryObj = qfm0FmeaManagerUtils.getPrimaryObject();
    }
    return primaryObj;
};

/**
 * This function when called will auto populate the name and desc field in Create Variant Panel
 * @param {object} data data object
 * @returns {object} returns the modified data object
 */
export let setDataForGenerateFmeaVariant = function( data ) {
    let parentFmeaNodeName = '';
    let parentFmeaNodeDesc = '';

    const objNamePropPathMSelected = 'mselected[0].props.object_name.dbValue';
    const objDescPropPathMSelected = 'mselected[0].props.object_desc.dbValue';

    const objNamePropPathPSelected = 'pselected.props.object_name.dbValue';
    const objDescPropPathPSelected = 'pselected.props.object_desc.dbValue';

    if( data.object_name && data.object_desc ) {
        if( appCtxService.getCtx( 'mselected[0].type' ) === 'Qfm0FMEANode' ) {
            parentFmeaNodeName =  appCtxService.getCtx( objNamePropPathMSelected );
            parentFmeaNodeDesc =  appCtxService.getCtx( objDescPropPathMSelected );
        }else {
            parentFmeaNodeName =  appCtxService.getCtx( objNamePropPathPSelected );
            parentFmeaNodeDesc =  appCtxService.getCtx( objDescPropPathPSelected );
        }
        let clonedDataObjForGenVariantPanel = { ...data };
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );

        clonedDataObjForGenVariantPanel.i18n.qfm0GenerateFmea = localTextBundle.qfm0GenFmeaVariant;

        clonedDataObjForGenVariantPanel.object_name.dbValue = parentFmeaNodeName;
        clonedDataObjForGenVariantPanel.object_name.uiValue = parentFmeaNodeName;
        clonedDataObjForGenVariantPanel.object_name.displayValues[0] = parentFmeaNodeName;

        clonedDataObjForGenVariantPanel.object_desc.dbValue = parentFmeaNodeDesc;
        clonedDataObjForGenVariantPanel.object_desc.uiValue = parentFmeaNodeDesc;
        clonedDataObjForGenVariantPanel.object_desc.displayValues[0] = parentFmeaNodeDesc;

        return clonedDataObjForGenVariantPanel;
    }
};

/**
 * Get FMEA Element objects (SYstem Element/Function/Failure/Action) from list of created objects UIDs received from SOA
 * @param {object} response - the response Object of SOA
 * @return {Array} Array of created Fmea Elements
 */
export let getCreatedFMEAElements = function( response ) {
    var result = [];
    if ( response.created ) {
        response.created.forEach( function( objectUid ) {
            var object = cdm.getObject( objectUid );
            if( object && object.modelType && ( object.modelType.typeHierarchyArray.indexOf( _qfm0FMEAElement ) > -1 || object.modelType.typeHierarchyArray.indexOf( _qam0QualityAction ) > -1 ) ) {
                var createdFmeaElement = {
                    objects:[ object ]
                };
                result.push( createdFmeaElement );
            }
        } );
    }
    return result;
};

/**
* This method to handle save edit SOA for FMEA Node.
*
* @return object
*/
export let callSaveEditForFMEANode = function() {
    editHandlerSvc.setActiveEditHandlerContext( 'NONE' );

    var activeEditHandler = editHandlerSvc.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsMap = [];
    if( modifiedViewModelProperties !== undefined && modifiedViewModelProperties.length > 0 ) {
        modifiedPropsMap = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );
    }else{
        //To handle the case just edit -> save , without modifying any property
        var editableViewModelProperties = dataSource.getAllEditableProperties();
        modifiedPropsMap = dataSource.getModifiedPropertiesMap( editableViewModelProperties );
    }

    var inputs = [];
    var emptyGuideLineObject = false;
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

        var modifiedGuideLineProp = viewModelProps.find( element => element.propertyName === 'qfm0FMEAGuideline' );
        var prevGuideLineProp = input.obj.props.qfm0FMEAGuideline;

        if( modifiedGuideLineProp !== undefined &&
            ( modifiedGuideLineProp.newValue === undefined || modifiedGuideLineProp.newValue === '' ) &&
            //To handle the case just edit -> save , without modifying any property
            ( ( modifiedGuideLineProp.uiValues === null ||  modifiedGuideLineProp.uiValues[0] === null || modifiedGuideLineProp.uiValues[0] === '' ) &&
            ( modifiedGuideLineProp.dbValues === null || modifiedGuideLineProp.dbValues[0] === null || modifiedGuideLineProp.dbValues[0] === '' ) ) ) {
            emptyGuideLineObject = true;
        }else if( modifiedGuideLineProp === undefined &&
            //if other than 'qfm0FMEAGuideline' properties are modified, then while saving need to confirm that the 'qfm0FMEAGuideline' is not empty.
            prevGuideLineProp !== undefined &&
            ( prevGuideLineProp.uiValues === null ||  prevGuideLineProp.uiValues[0] === null || prevGuideLineProp.uiValues[0] === '' ) &&
            ( prevGuideLineProp.dbValues === null || prevGuideLineProp.dbValues[0] === null || prevGuideLineProp.dbValues[0] === '' ) ) {
            emptyGuideLineObject = true;
        }else if( modifiedViewModelProperties.length > 0 ) {
            //for SOA Push the properties only if any property is modified, otherwise just need to call SOA with current properties.
            _.forEach( viewModelProps, function( props ) {
                dms.pushViewModelProperty( input, props );
            } );
        }
        inputs.push( input );
    } );

    var deferred = AwPromiseService.instance.defer();

    if( emptyGuideLineObject ) {
        var resource = app.getBaseUrlPath() + '/i18n/qualityFmeaMessages';
        var localTextBundle = _localeSvc.getLoadedText( resource );
        var errorMessage = localTextBundle.qfm0EmptyFMEAGuideline;
        messagingSvc.showError( errorMessage );
        deferred.resolve();
    }else{
        var soaInput = {};
        soaInput.inputs = inputs;
        actionSvc.callSaveEditSoa( soaInput ).then( function() {
            deferred.resolve();
            activeEditHandler.saveEditsPostActions( true );
        }, function( err ) {
            deferred.resolve();
        } );
    }
    return deferred.promise;
};

/**
 * custom save handler save edits called by framework
 *
 * @return callSaveEditForFMEANode
 */
saveHandler.saveEdits = function( ) {
    return callSaveEditForFMEANode();
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
 saveHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;
    if ( modifiedPropCount === 0 ) {
        return false;
    }
    return true;
};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
 export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * This method creates input data required for "createObjects" SOA in order to create FMEA Elements.
 * @param {Object} data
 * @param {Object} ctx context object
 * @returns {ObjectArray} Input data array for "createObjects" SOA
 */
 export let getCreateObjectsInputforFMEAObjects = function( data, ctx ) {
    var inputData = [];
    var boType;
    var parentUid;
    var parentType;
    var masterDataBoType;
    var isCreateMasterData = false;
    if ( data.selectedTab.panelId === 'qfm0ListFailureSpecification' || data.selectedTab.panelId === 'qfm0CreateFailureRepresentation' || data.selectedTab.panelId === 'qfm0AddCauseOrEffectWithoutSpec' ) {
        boType = 'Qfm0FailureElement';
        if ( data.createFailureSpec && data.createFailureSpec.dbValue === true ) {
            masterDataBoType = 'Qc0Failure';
            isCreateMasterData = true;
        }
    } else if ( data.selectedTab.panelId === 'qfm0ListFunctionSpecification' || data.selectedTab.panelId === 'qfm0CreateFunctionRepresentation' || data.selectedTab.panelId === 'qfm0AddHigherOrLowerFuncWithoutSpec' ) {
        boType = 'Qfm0FunctionElement';
        if ( data.createFunctionSpec && data.createFunctionSpec.dbValue === true ) {
            masterDataBoType = 'Qfm0FunctionEleSpec';
            isCreateMasterData = true;
        }
    } else if ( data.selectedTab.panelId === 'qfm0ListSystemSpecification' || data.selectedTab.panelId === 'qfm0CreateSystemEleRepresentation' ) {
        boType = 'Qfm0SystemElement';
        if ( data.createSystemEleSpec && data.createSystemEleSpec.dbValue === true ) {
            masterDataBoType = 'Qfm0SystemEleSpec';
            isCreateMasterData = true;
        }
    }

    if ( boType === 'Qfm0SystemElement' ) {
        parentUid = ctx && ctx.parentObject ? ctx.parentObject.uid : '';
        parentType = ctx && ctx.parentObject ? ctx.parentObject.type : '';
    } else {
        parentUid = ctx && ctx.selected ? ctx.selected.uid : '';
        parentType = ctx && ctx.selected ? ctx.selected.type : '';
    }

    if ( data.dataProviders.loadFilteredList.selectedObjects.length > 0 ) {
        for ( var i = 0; i < data.dataProviders.loadFilteredList.selectedObjects.length; i++ ) {
            var dataVal = {
                boName: boType,
                stringProps: {
                    qfm0Id: data.nextId[i].generatedValues.qfm0Id.nextValue,
                    object_name: data.dataProviders.loadFilteredList.selectedObjects[i].props.object_name.dbValues[0]
                },
                tagProps: {
                    qfm0ParentElement: {
                        uid: parentUid,
                        type: parentType
                    },
                    qfm0SourceSpecification: data.dataProviders.loadFilteredList.selectedObjects[i],
                    qfm0FmeaRoot: {
                        uid: qfm0FmeaManagerUtils.getFmeaRootNodeUid(),
                        type: 'Qfm0FMEANode'
                    }
                }
            };

            var input = {
                clientId: '',
                data: dataVal
            };
            inputData.push( input );
        }
    } else {
        if ( data.object_name.dbValue ) {
            let tagProperties = {
                qfm0FmeaRoot: {
                    uid: qfm0FmeaManagerUtils.getFmeaRootNodeUid(),
                    type: 'Qfm0FMEANode'
                }
            };
            if ( data.selectedTab.panelId !== 'qfm0AddCauseOrEffectWithoutSpec' && data.selectedTab.panelId !== 'qfm0AddHigherOrLowerFuncWithoutSpec' ) {
                tagProperties.qfm0ParentElement = {
                    uid: parentUid,
                    type: parentType
                };
                tagProperties.qfm0SourceSpecification = '';
            }

            var dataVal = {
                boName: boType,
                stringProps: {
                    qfm0Id: data.nextId[0].generatedValues.qfm0Id.nextValue,
                    object_name: data.object_name.dbValue,
                    object_desc: data.object_desc.dbValue
                },
                tagProps: tagProperties
            };

            if ( isCreateMasterData ) {
                dataVal.compoundCreateInput = {
                    qfm0Specification: [ {
                        boName: masterDataBoType,
                        stringProps: {
                            object_name: data.object_name.dbValue
                        }
                    } ]
                };

                if ( masterDataBoType !== 'Qc0Failure' ) {
                    if ( data.nextId[0] && data.nextId.length > 0 && data.nextId[0].generatedValuesOfSecondaryObjects &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification.length > 0 &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0] &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues.qfm0Id &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues.qfm0Id.nextValue ) {
                            let nextValue =  data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues.qfm0Id.nextValue;
                        dataVal.compoundCreateInput.qfm0Specification[0].stringProps.qfm0Id = nextValue;
                    }
                } else {
                    if ( data.nextId[0] && data.nextId.length > 0 && data.nextId[0].generatedValuesOfSecondaryObjects &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification.length > 0 &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0] &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues.qc0FailureCode &&
                        data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues.qc0FailureCode.nextValue ) {
                        let nextValue = data.nextId[0].generatedValuesOfSecondaryObjects.qfm0SourceSpecification[0].generatedValues.qc0FailureCode.nextValue;
                        dataVal.compoundCreateInput.qfm0Specification[0].stringProps.qc0FailureCode = nextValue;
                    }
                }
            }

            var input = {
                clientId: '',
                data: dataVal
            };
            inputData.push( input );
        }
    }
    return inputData;
};

/**
 * This method creates input data required for "generateNextValuesForProperties" SOA.
 * @param {Object} data
 */
export let getCreateObjectsInputforgenerateID = function( data ) {
    var inputData = [];
    var counter;
    var boType;
    var IdPattern;
    var masterDataBoType;
    var compoundIdPattern;
    var isCreateMasterData = false;
    if ( data.selectedTab.panelId === 'qfm0ListFailureSpecification' || data.selectedTab.panelId === 'qfm0CreateFailureRepresentation' || data.selectedTab.panelId === 'qfm0AddCauseOrEffectWithoutSpec' ) {
        boType = 'Qfm0FailureElement';
        IdPattern = 'XXXX"-"XXX"-"nnnnnnnnn';
        if ( data.createFailureSpec && data.createFailureSpec.dbValue === true ) {
            masterDataBoType = 'Qc0Failure';
            compoundIdPattern = 'XXXX-"nnnnnnn';
            isCreateMasterData = true;
        }
    } else if ( data.selectedTab.panelId === 'qfm0ListFunctionSpecification' || data.selectedTab.panelId === 'qfm0CreateFunctionRepresentation' || data.selectedTab.panelId === 'qfm0AddHigherOrLowerFuncWithoutSpec' ) {
        boType = 'Qfm0FunctionElement';
        IdPattern = 'XXX"-"XXX"-"nnnnnnnnn';
        if ( data.createFunctionSpec && data.createFunctionSpec.dbValue === true ) {
            masterDataBoType = 'Qfm0FunctionEleSpec';
            compoundIdPattern = 'XXX-"XXXXXX';
            isCreateMasterData = true;
        }
    } else if ( data.selectedTab.panelId === 'qfm0ListSystemSpecification' || data.selectedTab.panelId === 'qfm0CreateSystemEleRepresentation' ) {
        boType = 'Qfm0SystemElement';
        IdPattern = 'XX"-"XXX"-"nnnnnnnnn';
        if ( data.createSystemEleSpec && data.createSystemEleSpec.dbValue === true ) {
            masterDataBoType = 'Qfm0SystemEleSpec';
            compoundIdPattern = 'XX-"XXXXXX';
            isCreateMasterData = true;
        }
    }

    if ( data.dataProviders.loadFilteredList.selectedObjects.length > 0 ) {
        counter = data.dataProviders.loadFilteredList.selectedObjects.length;
    } else if ( data.object_name.dbValue ) {
        counter = 1;
    }

    if ( counter > 0 ) {
        for ( var i = 0; i < counter; i++ ) {
            var dataVal = {
                clientId: '',
                operationType: 1,
                businessObjectTypeName: boType,
                propertyNameAttachedPattern: {
                    qfm0Id: IdPattern
                }
            };
            if ( isCreateMasterData ) {
                dataVal.compoundObjectInput =
                {
                    qfm0SourceSpecification: [ {
                        clientId: '',
                        operationType: 1,
                        businessObjectTypeName: masterDataBoType,
                        propertyNameAttachedPattern:
                        {
                            qfm0Id: compoundIdPattern
                        }
                    } ]
                };

                if ( masterDataBoType !== 'Qc0Failure' ) {
                    dataVal.compoundObjectInput.qfm0SourceSpecification[0].propertyNameAttachedPattern = {};
                    dataVal.compoundObjectInput.qfm0SourceSpecification[0].propertyNameAttachedPattern.qfm0Id = compoundIdPattern;
                } else {
                    dataVal.compoundObjectInput.qfm0SourceSpecification[0].propertyNameAttachedPattern = {};
                    dataVal.compoundObjectInput.qfm0SourceSpecification[0].propertyNameAttachedPattern.qc0FailureCode = compoundIdPattern;
                }
            }
            var propertyNamingRuleInfo = dataVal;
            inputData.push( propertyNamingRuleInfo );
        }
    }
    return inputData;
};

/**
 * Build SOA input for aligning FMEA structure
 * @param {Array} SelectedObjects - selected objects
 * @return {Object} Location Context
 */
 export let buildSOAInputForAlignMasterVariant = function( SelectedObjects, locationCtx ) {
    var soaInput = [];
    var inputData = {};
    var refinedSelectedObjs = [];
    if ( SelectedObjects.length > 0 ) {
        SelectedObjects.forEach( function( selectedObj ) {
            if( selectedObj.type !== 'PseudoFolder') {
                refinedSelectedObjs.push( selectedObj );
            }
        } );
    }
    inputData = {
        sourceFMEARootNode: {
            uid: locationCtx.modelObject.props.qfm0SourceFMEANode.dbValues[0],
            type: 'Qfm0FMEANode'
        },
        targetFMEARootNode: {
            uid: locationCtx.modelObject.props.qfm0TargetFMEANode.dbValues[0],
            type: 'Qfm0FMEANode'
        },
        useLatestRevision: true,
        selectedObjects: refinedSelectedObjs
    };
    soaInput.push( inputData );
    return soaInput;
};

/**
 * This function returns the array of added or updated object IDs (function element uids or failure element uids) after relation creation in net view
 * @param {object} response - the response Object of SOA () addCauseEffect SOA / addHigherLowerLevelFunctions SOA
 */
export let getUpdatedFailureElementsUidsOnRemovingCause = function( response ) {
    var nodesToBeAddedOrUpdated = [];
    if ( response ) {
        if ( response.updated && response.updated.length > 0 ) {
            response.updated.forEach( function( objectUid ) {
                nodesToBeAddedOrUpdated.push( objectUid );
            } );
        }
    }
    return nodesToBeAddedOrUpdated;
};

export let getCreatedCauseEffectRelationObjects = function(response) {
    let relationModelObjectsArray = [];
    if ( response && response.created && response.created.length > 0 ) {
        for( let i = 0; i < response.created.length; i++ ) {
            let modelObject = response.modelObjects[response.created[i]];
            if( modelObject && ( modelObject.modelType.typeHierarchyArray.indexOf(FAILURE_CAUSE) > -1 || modelObject.modelType.typeHierarchyArray.indexOf(FAILURE_EFFECT) > -1 )) {
                relationModelObjectsArray.push(modelObject);
            }
        }
    }
    return relationModelObjectsArray;
};

export default exports = {
    prepareSoaInputForRemovingRelationsInNetView,
    updateShowFailureNetViewCtxValues,
    updateShowFunctionNetViewCtxValues,
    handleViewSelectionChange,
    updateCommandClassToSelected,
    setPrimaryObjectForCreatingRelation,
    setDataForGenerateFmeaVariant,
    getCreatedFMEAElements,
    getSaveHandler,
    callSaveEditForFMEANode,
    resetShowFunctionNetViewCtxValues,
    resetShowFailureNetViewCtxValues,
    getCreateObjectsInputforFMEAObjects,
    getCreateObjectsInputforgenerateID,
    buildSOAInputForAlignMasterVariant,
    getUpdatedFailureElementsUidsOnRemovingCause,
    getCreatedCauseEffectRelationObjects
};
app.factory( 'qfm0FmeaManagerUtils2', () => exports );
