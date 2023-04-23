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
 * @module js/CAW0capaUtilsService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import xrtParserService from 'js/xrtParser.service';
import AwPromiseService from 'js/awPromiseService';
import editHandlerService from 'js/editHandlerService';
import editHandlerFactory from 'js/editHandlerFactory';
import dataSourceService from 'js/dataSourceService';
import cmm from 'soa/kernel/clientMetaModel';
import _dms from 'soa/dataManagementService';
import _cdm from 'soa/kernel/clientDataModel';
import uwPropertySvc from 'js/uwPropertyService';
import pasteSvc from 'js/pasteService';
import messagingSvc from 'js/messagingService';
import dateTimeSvc from 'js/dateTimeService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import cdmSvc from 'soa/kernel/clientDataModel';
import _soaSvc from 'soa/kernel/soaService';
import commandService from 'js/command.service';

import 'js/viewModelObjectService';
import propPolicySvc from 'soa/kernel/propertyPolicyService';

import 'soa/kernel/soaService';
import _localeSvc from 'js/localeService';

var exports = {};
var eventSubs = null;
var eventSubsComplete = null;

var resource = app.getBaseUrlPath() + '/i18n/CAW0CapaMessages';
var localTextBundle = _localeSvc.getLoadedText( resource );

/** This method creates input to attach targets for Quality Action */

var getSelectedObjects = function( data ) {
    var tarObject = [];
    if( data.sourceObjects.length !== 0 ) {
        for( var i = 0; i < data.sourceObjects.length; i++ ) {
            var uid = data.sourceObjects[ i ].uid;
            var type = data.sourceObjects[ i ].type;
            tarObject[ i ] = {
                uid: uid,
                type: type
            };
        }
    }
    return tarObject;
};

/**
 * This method creates input data required for "createObjects" SOA for relating secondary object with primary
 * object.
 *
 * @param {data} data
 * @return {ObjectArray} input data
 */
export let getInputForCreateObject = function( data ) {
    var doubleObj = {};
    var boolObj = {};
    var strObj = {};
    var dateObj = {};
    var objArrObj = {};
    var objectObj = {};
    var inputData = [];

    _.forEach( data.objCreateInfo.propNamesForCreate, function( propName ) {
        var vmProp = _.get( data, propName );

        if( vmProp.type === 'DOUBLE' && vmProp.dbValue !== null ) {
            doubleObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
        if( vmProp.type === 'BOOLEAN' && vmProp.dbValue !== null ) {
            boolObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
        if( vmProp.type === 'STRING' && vmProp.dbValue !== null ) {
            strObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
        if( vmProp.type === 'DATE' && vmProp.dbValue !== null ) {
            dateObj[ vmProp.propertyName ] = dateTimeSvc.formatUTC( vmProp.dbValue );
        }
        if( vmProp.type === 'OBJECTARRAY' && vmProp.dbValue.length !== 0 ) {
            objArrObj[ vmProp.propertyName ] = getSelectedObjects( data );
        }
        if( vmProp.type === 'OBJECT' && vmProp.dbValue !== null ) {
            objectObj[ vmProp.propertyName ] = vmProp.dbValue;
        }
    } );

    var dataVal = {
        boName: 'Qam0QualityAction',
        doubleProps: doubleObj,
        boolProps: boolObj,
        stringProps: strObj,
        dateProps: dateObj,
        tagProps: objectObj,
        tagArrayProps: objArrObj
    };

    var input = {
        clientId: 'createObjects',
        data: dataVal
    };

    inputData.push( input );
    return inputData;
};

export let getPropertyInput = function( data ) {
    var relationName = data.creationRelation === undefined && data.getPanelId() === 'CAW0AddCorrectiveAction' ? 'CPA0CorrectiveAction' : data.creationRelation.dbValue;
    var subType = _getSubtype( relationName );
    return [ {
        object: data.createdMainObject,
        timestamp: '',
        vecNameVal: [ {
                name: 'qam0QualityActionType',
                values: [
                    '8D'
                ]
            },
            {
                name: 'qam0QualityActionSubtype',
                values: [
                    subType
                ]
            }
        ]
    } ];
};

/**
 * This method creates input setProperties of Defect and 5Why
 * object
 * @param {data} data
 * @return {date} date
 */
export let getPropertyInputForDefect5Why = function( data, ctx ) {
    var relationName = ctx.relationType;
    //if user is adding COE action set target as it's parent QA
    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_CorrectiveAction' && ctx.panelContext === undefined || ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_CorrectiveAction' && ctx.panelContext
        .destPanelId === 'CAW0AddQualityActionSub' && ctx.relationType !== 'CPA0ImplCorrAction' ) {
        ctx.modifiedObject = ctx.selectedCorrectiveAction;
    } else {
        ctx.modifiedObject = ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) > -1 ? ctx.pselected : ctx.selected;
    }

    var subType = _getSubtype( relationName );
    var curDate = new Date();
    var curDateInUTC = dateTimeSvc.formatUTC( curDate );
    var dateObject = {
        name: 'qam0AssignmentDate',
        values: [
            curDateInUTC
        ]
    };

    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' && ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_QualityAction' || ctx.xrtPageContext.primaryXrtPageID ===
        'tc_xrt_QualityAction' ) {
        if( data.dataProviders.userPerformSearch || data.dataProviders.load8DTeamDataprovider ) {
            if( data.dataProviders.userPerformSearch.selectedObjects.length === 1 || data.dataProviders.load8DTeamDataprovider.selectedObjects.length === 1 ) {
                return [ {
                    object: data.createdMainObject,
                    timestamp: '',
                    vecNameVal: [ dateObject ]

                } ];
            }
        }
        return;
    } else if( data.dataProviders.userPerformSearch || data.dataProviders.load8DTeamDataprovider ) {
        if( data.dataProviders.userPerformSearch.selectedObjects.length === 1 || data.dataProviders.load8DTeamDataprovider.selectedObjects.length === 1 ) {
            return [ {
                object: data.createdMainObject,
                timestamp: '',
                vecNameVal: [ {
                        name: 'qam0QualityActionType',
                        values: [
                            '8D'
                        ]
                    },
                    {
                        name: 'qam0QualityActionSubtype',
                        values: [
                            subType
                        ]
                    },
                    dateObject
                ]
            } ];
        }
    }
    return [ {
        object: data.createdMainObject,
        timestamp: '',
        vecNameVal: [ {
                name: 'qam0QualityActionType',
                values: [
                    '8D'
                ]
            },
            {
                name: 'qam0QualityActionSubtype',
                values: [
                    subType
                ]
            }
        ]
    } ];
};

var getAllTeamdata = function( data, ctx ) {
    var input = {
        object: data.createdMainObject,
        vecNameVal: [ {
            name: 'fnd0ResponsibleUser',
            values: [ data.dataProviders.getAssignedResponsibleUserProvider.viewModelCollection.loadedVMObjects[ 0 ].props.user.dbValue ]
        } ]
    };
    _dms.setProperties( [ input ] );
};

export let get8DUser = function( ctx, data ) {
    if( data.selectedTeam === data.i18n.caw08DTeam && data.dataProviders.getAssignedResponsibleUserProvider.viewModelCollection.loadedVMObjects.length > 0 ) {
        var uid = data.dataProviders.getAssignedResponsibleUserProvider.viewModelCollection.loadedVMObjects[ 0 ].uid;
        if( uid !== undefined ) {
            var modelObject = _cdm.getObject( uid );
            if( modelObject ) {
                var propNames = [ 'fnd0AssigneeUser' ];
                // Cached model object
                _.forEach( propNames, function( propName ) {
                    if( modelObject.modelType.propertyDescriptorsMap.hasOwnProperty( propName ) ) {
                        _dms.getPropertiesUnchecked( [ modelObject ], propNames ).then( function( response ) {
                            var input = {
                                object: data.createdMainObject,
                                vecNameVal: [ {
                                    name: 'fnd0ResponsibleUser',
                                    values: [ response.modelObjects[ modelObject.uid ].props.fnd0AssigneeUser.dbValues[ 0 ] ]
                                } ]
                            };
                            _dms.setProperties( [ input ] );
                        } );
                    }
                } );
            }
        }
    }
    if( data.selectedTeam === data.i18n.caw0All ) {
        getAllTeamdata( data, ctx );
    }
};

/**
 * This method creates input date required for "createObjects" SOA for relating secondary object with primary
 * object.
 * @param {data} data
 * @return {date} date
 */
export let getQam0DueDate = function( data ) {
    if( data.qam0DueDate !== undefined || data.qam0DueDate !== '' ) {
        return dateTimeSvc.formatUTC( data.qam0DueDate.dbValue );
    }
};

/**
 * This method creates input date required for "createObjects" SOA for relating secondary object with primary
 * object.
 * @param {data} data
 * @return {date} object array
 **/
export let getTargetObjects = function( data ) {
    var getObject = {};
    var targetObjectsArray = [];
    if( data.qam0Targets !== undefined || data.qam0Targets !== '' ) {
        var objectarray = [];
        objectarray = data.qam0Targets.dbValue;
        objectarray.forEach( function( object ) {
            getObject = cdmSvc.getObject( object );
            targetObjectsArray.push( {
                uid: getObject.uid,
                type: getObject.type
            } );
        } );
    }

    return targetObjectsArray;
};

// eslint-disable-next-line complexity
export let getQARelation = function( ctx ) {
    var relationType;
    if( ctx.panelContext && ctx.panelContext.destPanelId !== 'CAW0AddResponsibleUserToQA' && ctx.panelContext.destPanelId !== 'assignProjectSub' && ctx.panelContext.destPanelId !== 'addReferenceSub' ) {
        if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) > -1 ) {
            ctx.parentCAPA = ctx.pselected;
            ctx.primaryObject = _.clone( ctx.pselected );
        }
        if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 ) {
            ctx.parentCAPA = ctx.selected;
            ctx.primaryObject = _.clone( ctx.parentCAPA );
        }
        if( ctx.panelContext.modelTypeRelationListMap !== undefined ) {
            relationType = ctx.panelContext.modelTypeRelationListMap.Qam0QualityAction[ 0 ];
        }

        switch ( relationType ) {
            case 'CPA0ContainmentAction':
                ctx.relationType = 'CPA0ContainmentAction';
                break;
            case 'CPA0CorrectiveAction':
                ctx.relationType = 'CPA0CorrectiveAction';
                break;
            case 'qam0DependentQualityActions':
                ctx.relationType = 'qam0DependentQualityActions';
                break;
            case 'CPA0PreventiveAction':
                ctx.relationType = 'CPA0PreventiveAction';
                break;
            case 'CPA0ImplCorrAction':
                ctx.relationType = 'CPA0ImplCorrAction';
                break;
        }
    }

    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_RootCauseAnalysis' && ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_QualityAction' ||
        ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_QualityAction' && ( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ||
            ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW05Why' ) > -1 || ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 || ctx.selected.modelType.typeHierarchyArray
            .indexOf( 'Qam0QualityAction' ) > -1 ) ) {
        if( ctx.selected.modelType && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Qam0QualityAction' ) > -1 ) {
            ctx.primaryObject = _.clone( ctx.pselected );
        } else {
            ctx.primaryObject = _.clone( ctx.selected );
        }
        ctx.relationType = 'CAW0QualityActionRel';
    }

    //If user is on Corrective Action and trying to add COE Action
    if( ( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_CorrectiveAction' || ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_CorrectiveAction' ) && ( ctx.panelContext === undefined || ctx
            .panelContext.objectSetSource !== 'CPA0ImplCorrAction.Qam0QualityAction' && ( ctx.panelContext && ctx.panelContext.destPanelId !== 'CAW0AddResponsibleUserToQA' && ctx.panelContext
                .destPanelId !== 'assignProjectSub' && ctx.panelContext.destPanelId !== 'addReferenceSub' ) ) ) {
        ctx.parentCAPA = ctx.selectedCAPA;
        ctx.primaryObject = _.clone( ctx.selectedCorrectiveAction );
        ctx.relationType = 'qam0DependentQualityActions';
    }
};

export let relateObjects = function( data, ctx ) {
    ctx.isCOETableUpdated = true;
    if( data.createdObject !== undefined || data.createdMainObject !== undefined ) {
        eventBus.publish( 'setProperties' );
    } else {
        eventBus.publish( 'refreshLocation' );
    }
};

export let updateID = function( data, ctx ) {
    data.fnd0ActionItemId.dbValue = ctx.getQAActionId;
    data.fnd0ActionItemId.uiValue = ctx.getQAActionId;
};

/**
 * This method set values for property qam0Targets
 * object.        *
 * @param {data} data
 * @param {ctx} ctx
 */
export let updateEndItem = function( data, ctx, eventData, action ) {
    var vmProp = _.get( data, 'qam0Targets' );

    if( !ctx.setFlagCheckForTarget ) {
        appCtxService.registerCtx( 'setFlagCheckForTarget' );
    }

    var targetObject;
    //if user is adding COE action set target as it's parent QA
    if( ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_CorrectiveAction' && ctx.panelContext === undefined || ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_CorrectiveAction' && ctx.panelContext
        .destPanelId === 'CAW0AddQualityActionSub' ) {
        targetObject = ctx.selectedCorrectiveAction;
    } else {
        targetObject = ctx.selected;
    }

    if( data.qam0Targets && data.qam0Targets.dbValue[ 0 ] !== targetObject.uid && ctx.setFlagCheckForTarget !== 1 ) {
        var selectedObjsUid = [ targetObject.uid ];
        ctx.setFlagCheckForTarget = 1;
        uwPropertySvc.setValue( vmProp, selectedObjsUid );
        uwPropertySvc.setWidgetDisplayValue( vmProp, targetObject.props.object_name.dbValues );
        uwPropertySvc.setDirty( vmProp, true );
    }
};

var _getSubtype = function( relationType ) {
    switch ( relationType ) {
        case 'CPA0ContainmentAction':
            return 'Containment Action';
        case 'CPA0CorrectiveAction':
            return 'Corrective Action';
        case 'qam0DependentQualityActions':
            return 'Confirmation of Effectiveness';
        case 'CPA0PreventiveAction':
            return 'Preventive Action';
        case 'CPA0ImplCorrAction':
            return 'Corrective Action';
    }
};

/**
 * This method is used to get the LOV values for the QA panel.
 * @param {Object} response the response of the getLov soa
 * @returns {Object} value the LOV value
 */
export let getLOVListOfQAStatus = function( response, data, ctx ) {
    var value = response.lovValues.map( function( obj ) {
        return {
            propDisplayValue: obj.propDisplayValues.lov_values[ 0 ],
            propDisplayDescription: obj.propDisplayValues.lov_value_descriptions ? obj.propDisplayValues.lov_value_descriptions[ 0 ] : obj.propDisplayValues.lov_values[ 0 ],
            propInternalValue: obj.propInternalValues.lov_values[ 0 ]
        };
    } );

    for( let index = 0; index < value.length; index++ ) {
        if( value[ index ].propInternalValue === 'Draft' ) {
            data.qam0QualityActionStatus.dbValue = value[ index ].propInternalValue;
            data.qam0QualityActionStatus.uiValue = value[ index ].propDisplayValue;
            if( ctx.tcSessionData.tcMajorVersion < 13 ) {
                data.qam0QualityActionStatus.selectedLovEntrie = [];
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ] = value[ index ];
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ].sel = true;
            } else {
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ] = value[ index ];
                data.qam0QualityActionStatus.selectedLovEntries[ 0 ].sel = true;
            }
        }
    }

    return value;
};

export let pasteCOE = function( targetObject, sourceObjects, relationType, ctx ) {
    var dependentAction = targetObject.props.qam0DependentQualityActions.dbValues;
    var presentActions = [];
    var newActions = [];

    sourceObjects.map( function( object ) {
        for( var i = 0; i < dependentAction.length; i++ ) {
            if( dependentAction[ i ] === object.uid ) {
                presentActions.push( sourceObjects[ i ].uid );
            } else {
                newActions.push( sourceObjects[ i ].uid );
                break;
            }
        }
    } );
    if( presentActions.length > 0 ) {
        messagingSvc.showError( 'Paste failed' );
        ctx.isCOEPresent = true;
    } else {
        return pasteSvc.execute( targetObject, sourceObjects, relationType );
    }
};

export let loadViewModel = function( ctx, data ) {
    appCtxService.registerCtx( 'unSubEventsQuality', [] );
    var tableElement = document.getElementsByTagName( 'aw-table' ).length > 0 ? document.getElementsByTagName( 'aw-table' ) : document.getElementsByTagName( 'aw-splm-table' );
    var objectSet = tableElement[ 0 ].attributes.gridid.value;
    ctx.selectedCAPA = ctx.xrtSummaryContextObject;
    var editHandler = editHandlerService.getActiveEditHandler();
    var dataSource = editHandler.getDataSource();
    ctx.CapaVmo = dataSource.getDeclViewModel();
    eventBus.subscribe( objectSet + '.selectionChangeEvent', function( eventData ) {
        if( ctx.editInProgress ) {
            var activeEditHandler = editHandlerService.getActiveEditHandler();
            activeEditHandler.isDirty().then( function( response ) {
                if( response ) {
                    activeEditHandler.leaveConfirmation().then( function() {
                        updateSelectionOfCorrectiveAction( ctx, eventData );
                    } );
                } else {
                    activeEditHandler.cancelEdits();
                    updateSelectionOfCorrectiveAction( ctx, eventData );
                    commandService.executeCommand( 'Awp0StartEdit' );
                }
            } );
        } else {
            updateSelectionOfCorrectiveAction( ctx, eventData );
        }
    } );
    ctx.selectedCorrectiveAction = null;
    eventBus.subscribe( 'cdm.deleted', function() {
        ctx.selectedCorrectiveAction = null;
        eventBus.publish( 'CorrectiveActionSelectionChanged' );
    } );
    eventBus.subscribe( 'updateCOeTableOnComplete', function() {
        eventBus.publish( 'CorrectiveActionSelectionChanged' );
    } );

    eventBus.subscribe( 'appCtx.register', function( eventData ) {
        if( eventData.name === 'sublocation' || eventData.name === 'selected' || eventData.name === 'state' ) {
            if( ctx.CapaVmo && eventData.value && ctx.CapaVmo.vmo && eventData.value.type === 'C2CapaRevision' && eventData.value.uid !== ctx.CapaVmo.vmo.uid ) {
                cleanup();
            }
            if( eventData.name === 'sublocation' ) {
                cleanup();
            }
        }
    } );
    eventBus.subscribe( 'editHandlerStateChange', function( eventData ) {
        if( eventData.state === 'saved' || eventData.state === 'canceling' ) {
            //update CAPA vmo to remove COE dataprovider from it
            var CapaVmo = appCtxService.ctx.CapaVmo;
            if( CapaVmo ) {
                delete CapaVmo.dataProviders[ appCtxService.ctx.COEActionTableProvider.name ];
                cleanup();
            }
        }
    } );
};

export let SetSelectionOfCorrectiveAction = function( ctx, eventData ) {
    if( ctx.editInProgress ) {
        var activeEditHandler = editHandlerService.getActiveEditHandler();
        activeEditHandler.isDirty().then( function( response ) {
            if( response ) {
                activeEditHandler.leaveConfirmation().then( function() {
                    updateSelectionOfCorrectiveAction( ctx, eventData );
                } );
            } else {
                activeEditHandler.cancelEdits();
                updateSelectionOfCorrectiveAction( ctx, eventData );
                eventBus.subscribe( 'COEEditProviderUpdated', function( eventData ) {
                    commandService.executeCommand( 'Awp0StartEdit' );
                } );
            }
        } );
    } else {
        updateSelectionOfCorrectiveAction( ctx, eventData );
    }
};

var updateSelectionOfCorrectiveAction = function( ctx, eventData ) {
    ctx.isCorrectiveActionSelected = eventData.selectedUids.length !== 0;

    var previousSelection = ctx.selectedCorrectiveAction;
    ctx.CapaVmo = eventData.scope.viewModel;
    var selectedCorrectiveAction = _cdm.getObject( eventData.selectedUids );
    ctx.selectedCorrectiveAction = selectedCorrectiveAction ? selectedCorrectiveAction : ctx.selectedCorrectiveAction;
    ctx.selectedCorrectiveAction = selectedCorrectiveAction;
    ctx.primaryObject = selectedCorrectiveAction;
    if( previousSelection === null || previousSelection && previousSelection.uid !== eventData.selectedUids[ 0 ] || ctx.isCOETableUpdated ) {
        ctx.isCOETableUpdated = false;
        eventBus.publish( 'CorrectiveActionSelectionChanged' );
    }
};

export let SetSelectionOfImplCorrectiveAction = function( ctx, eventData ) {
    ctx.isImplCorrectiveActionSelected = eventData.selectedUids.length !== 0;
    if( ctx.isImplCorrectiveActionSelected ) {
        ctx.relationName = 'CPA0ImplCorrAction';
    }
};

//This function subscribe the event 'reportbuilder.generateitemreportcomplete' of report and call custom soa to attach genrated report to attachment tab of CAPA
export let subscribeEventOfReport = function( ctx, data ) {
    if( !eventSubs ) {
        eventSubs = eventBus.subscribe( 'reportbuilder.generateitemreportcomplete', function( eventData ) {
            var fileName = eventData.reportInfo.reportFileName.split( '.' );
            var datasetType;
            var nameRefType;
            var typeToRemove;
            var selectCAPAForReport;
            if( fileName[ fileName.length - 1 ] === 'html' ) {
                datasetType = 'HTML';
                nameRefType = 'HTML';
                typeToRemove = 'CrfOutputHtml';
            } else {
                datasetType = 'MSExcel';
                nameRefType = 'excel';
                typeToRemove = 'CrfOutputExcel';
            }

            // This if code requieds when user try to create generateReport after sleceting any defect, 5Why or report, hence we need to select CAPA manually
            if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 ) {
                selectCAPAForReport = ctx.selected;
            } else if( ctx.pselected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 ) {
                selectCAPAForReport = ctx.pselected;
            } else if( ctx.parentCAPA ) {
                selectCAPAForReport = ctx.parentCAPA;
            } else {
                selectCAPAForReport = ctx.selected;
            }
            var request = {
                attachCapaReportsInput: {
                    contextObject: selectCAPAForReport,
                    datasetTypeToCreate: datasetType,
                    relationName: 'CPA0CapaReports',
                    fmsFileTicket: eventData.reportInfo.fileTicket,
                    datasetTypeToRemove: typeToRemove,
                    namedReferenceType: nameRefType
                }
            };
            _soaSvc.post( 'Internal-Capaonawc-2020-05-QualityIssueManagement', 'attachCapaReports', request ).then( function( response ) {
                eventBus.publish( 'cdm.relatedModified', {
                    refreshLocationFlag: false,
                    relatedModified: [ ctx.selected ]
                } );
            } );
        } );

        if( !eventSubsComplete ) {
            eventSubsComplete = eventBus.subscribe( 'Awp0InContextReports.contentUnloaded', function() {
                eventBus.unsubscribe( eventSubs );
                eventBus.unsubscribe( eventSubsComplete );
                eventSubs = null;
                eventSubsComplete = null;
            } );
        }
    }
};

export let unscribeGetGenerateItemReportComplete = function( eventData ) {
    var data = eventData;
};

export let setProviderForEdit = function( data, ctx ) {
    ctx.COEActionTableProvider = data.dataProviders.COEActionProvider;
};

export let updateCOETable = function( ctx ) {
    ctx.isCOETableUpdated = true;
};

/**
 * This handler is invoke from Corrective action sublocation to make all splm-table editable
 **/
export let addEditHandler = function() {
    var CapaVmo;
    var editHandler;
    if( appCtxService.ctx.CapaVmo && appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) === -1 ) {
        CapaVmo = appCtxService.ctx.CapaVmo;

        CapaVmo.dataProviders[ appCtxService.ctx.COEActionTableProvider.name ] = appCtxService.ctx.COEActionTableProvider;

        //create Edit Handler
        editHandler = editHandlerFactory.createEditHandler( dataSourceService
            .createNewDataSource( {
                declViewModel: CapaVmo
            } ) );
        //registerEditHandler
        if( editHandler ) {
            editHandlerService.setEditHandler( editHandler, 'NONE' );
            editHandlerService.setActiveEditHandlerContext( 'NONE' );
            editHandler.startEdit();
        }
    } else {
        var handler = 'NONE';
        editHandlerService.setActiveEditHandlerContext( handler );
        if( !editHandlerService.isEditEnabled() ) {
            editHandler = editHandlerService.getEditHandler( handler );
            if( editHandler.canStartEdit() && !editHandler.editInProgress() ) {
                editHandler.startEdit();
            }
        }
    }
};

/**
 * @param {Sting} data Model Object Type.
 * @returns {response} response returnsvmo of modified object.
 **/
export let addEdit5whyHandler = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );
    var inputs = [];
    var selectedObject = activeEditHandler.getSelection();
    var input = {};
    for( var i in modifiedPropsWithoutSubProp ) {
        var viewModelObj = modifiedPropsWithoutSubProp[ i ].viewModelObject;

        input = _dms.getSaveViewModelEditAndSubmitToWorkflowInput( viewModelObj );

        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            modifiedVMProperty.dbValue = modifiedVMProperty.dbValues[ 0 ];
            modifiedVMProperty.newValue = modifiedVMProperty.dbValues[ 0 ];

            /*
            // Commenting this as updating Name prop through server
            */
            if( modifiedVMProperty.propertyName === 'caw05WhyType' && modifiedVMProperty.valueUpdated === true && appCtxService.ctx.tcSessionData.tcMajorVersion < 13 ) {
                var propertyName = 'object_name';
                var propertyDisplayName = 'Name';
                var type = 'STRING';
                var dbValues = '5Why-' + modifiedVMProperty.uiOriginalValue;
                var uiValues = [ '5Why-' + modifiedVMProperty.uiOriginalValue ];

                var vmProp = uwPropertySvc.createViewModelProperty( propertyName, propertyDisplayName, type, dbValues, uiValues );
                vmProp.newValue = dbValues;
                vmProp.sourceObjectLastSavedDate = modifiedVMProperty.sourceObjectLastSavedDate;
                _dms.pushViewModelProperty( input, vmProp );
            }

            if( modifiedVMProperty.propertyName !== 'caw0IshikawaCauseGroup' ) {
                _dms.pushViewModelProperty( input, modifiedVMProperty );
            }
        } );
        inputs.push( input );
    }
    if( selectedObject.modelType.typeHierarchyArray.indexOf( 'CAW0Ishikawa' ) > -1 && appCtxService.ctx.caw0CauseGroup ) {
        var propObject = {
            dbValues: appCtxService.ctx.caw0CauseGroup.dbValue,
            isModifiable: true,
            propertyName: 'caw0IshikawaCauseGroup',
            uiValues: appCtxService.ctx.caw0CauseGroup.dbValue,
            intermediateObjectUids: [],
            srcObjLsd: selectedObject.props.last_mod_date.dbValues[ 0 ]
        };
        //check if no other property is editied then use new input with only ICG property to be updated else add updated ICG to other properties
        if( input === undefined || input.viewModelProperties === undefined ) {
            input = {};
            inputs = [];
            input.obj = selectedObject;
            input.viewModelProperties = [ propObject ];
            inputs.push( input );
        } else {
            input.viewModelProperties.push( propObject );
        }
    }

    if( appCtxService.ctx.updateSelectionForCause && appCtxService.ctx.selected.modelType.typeHierarchyArray.indexOf( 'CAW0Defect' ) > -1 ) {
        input.obj = activeEditHandler.getSelection();
        if( input.viewModelProperties ) {
            for( let index = 0; index < input.viewModelProperties.length; index++ ) {
                if( input.viewModelProperties[ index ].propertyName === 'caw0CauseGroup' ) {
                    input.viewModelProperties[ index ].dbValues = [ appCtxService.ctx.updateSelectionForCause ];
                }
            }
            inputs = [];
            uwPropertySvc.updateViewModelProperty( input.viewModelProperties[ 0 ].dbValues );
            inputs.push( input );
        }
    }

    deferred.resolve( {
        inputs: inputs
    } );

    return deferred.promise;
};

export let addEditCauseHandler = function( data ) {
    data.inputs[ 0 ].obj.props.caw0CauseGroup.dbValues[ 0 ] = data.inputs[ 0 ].viewModelProperties[ 0 ].dbValues[ 0 ];
};

export let addEditRootCauseHandler = function() {
    var editHandler = editHandlerService.getEditHandler( 'TABLE_CONTEXT' );
    editHandler.startEdit();
};

export let updateSelection = function( data, ctx ) {
    if( data.eventData ) {
        ctx.selected = data.eventData.selectedObjects.length > 0 ? data.eventData.selectedObjects[ 0 ] : ctx.selectedCorrectiveAction;
        ctx.mselected = data.eventData.selectedObjects.length > 0 ? data.eventData.selectedObjects : ctx.selectedCorrectiveAction;
        ctx.relationName = 'qam0DependentQualityActions';
    } else {
        return;
    }
};

var cleanup = function() {
    for( var index = 0; index < appCtxService.ctx.unSubEventsQuality.length; index++ ) {
        eventBus.unsubscribe( appCtxService.ctx.unSubEventsQuality[ index ] );
    }
    eventBus.unsubscribe( 'updateCOeTableOnComplete' );
    eventBus.unsubscribe( 'COEEditProviderUpdated' );
    eventBus.unsubscribe( 'qam0QARelationCreated' );
    appCtxService.unRegisterCtx( 'selectedCorrectiveAction' );
    appCtxService.unRegisterCtx( 'actionViewModel' );
    appCtxService.unRegisterCtx( 'isCorrectiveActionSelected' );
};
/**
 * This method returns the localised display names for the given properties.
 * This method assumes that the type information is already loaded in client meta model.
 *
 * @param {Sting} type Model Object Type
 * @param {StingArray} propertyNames Array of internal property names
 * @returns {StingArray}  Array of localised property display names
 */
export let getSavedQueryEntries = function( type, propertyNames ) {
    var propertyDisplayNames = [];
    propertyNames = propertyNames.slice( 1, -1 ).split( ',' );
    if( type && propertyNames && propertyNames.length ) {
        var modelType = cmm.getType( type );
        for( var i = 0; i < propertyNames.length; i++ ) {
            var propDesc = modelType.propertyDescriptorsMap[ propertyNames[ i ] ];
            propertyDisplayNames.push( propDesc.displayName );
        }
    }
    return propertyDisplayNames;
};

/**
 *Returns the search filter string .wild character is returned if an empty string is passed.
 *
 * @param {Sting} filterString filter string
 * @returns {Sting}  filter string or wild character
 */
export let getSearchFailureFilterBoxValue = function( filterString ) {
    if( filterString && filterString.trim() !== '' ) {
        return '*' + filterString + '*';
    }
    return '*';
};

export let updateSelectedFailure = function( data, ctx ) {
    ctx.selectedFailure = data.selectedObjects[ 0 ];
};

/**
 *This function unregister the setFlagCheckForTarget flag.
 */
export let clearCtxFlagValue = function( ctx ) {
    appCtxService.unRegisterCtx( 'setFlagCheckForTarget' );
    appCtxService.unRegisterCtx( 'currentQam0QualityActionStatus' );
};

export let getQualityActionStatus = function( data, ctx ) {
    if( data.activeView === 'addObjectPrimarySub' ) {
        if( !ctx.currentQam0QualityActionStatus ) {
            appCtxService.registerCtx( 'currentQam0QualityActionStatus' );
        }
        ctx.currentQam0QualityActionStatus = data.qam0QualityActionStatus.dbValue;
    }
};

export let cleanDataProvider = function( ctx, data ) {
    data.dataProviders.getAssignedResponsibleUserProvider = '';
};

//To set the CAPA as parent, to use in PD location's QA
export let addparentCAPA = function( ctx ) {
    ctx.parentCAPA = ctx.selected;
};

//To set the input for setProperties for setting problemContextProperty
export let getProblemContextSetInput = function( data ) {
    var selectedObject = _cdm.getObject( appCtxService.ctx.selected.uid );
    var probContext = selectedObject.props.caw0ProblemContext && selectedObject.props.caw0ProblemContext.dbValues[ 0 ] ? [ selectedObject.props.caw0ProblemContext.dbValues[ 0 ] ] : null;
    return [ {
        object: data.createdObject,
        timestamp: '',
        vecNameVal: [ {
            name: 'caw0ProblemContext',
            values: probContext
        } ]
    } ];
};

export let validateVisibleInReport = function( ctx, data ) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    var dataSource = activeEditHandler.getDataSource();
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsWithoutSubProp = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

    var totalObjCount = 0;
    var savedObjCount = 0;
    var unSavedObjCount = 0;
    var objectNameArr = [];
    var typeAllowedArr = [ 'Image', 'JPEG', 'GIF' ];
    var savedObjectName = '';
    var errorMsg = '';
    for( var i in modifiedPropsWithoutSubProp ) {
        var viewModelObj = modifiedPropsWithoutSubProp[ i ].viewModelObject;

        modifiedPropsWithoutSubProp[ i ].viewModelProps.forEach( function( modifiedVMProperty ) {
            if( modifiedVMProperty.dbValues[ 0 ] === true && !typeAllowedArr.includes( viewModelObj.props.object_type.dbValues[ 0 ] ) ) {
                /// set false again, if user try to make it true for non image object
                modifiedVMProperty.dbValue = false;
                modifiedVMProperty.newValue = false;

                var objectName = viewModelObj.props.object_string.dbValues[ 0 ];
                objectNameArr.push( objectName );
                unSavedObjCount++;
            } else {
                savedObjectName = viewModelObj.props.object_string.dbValues[ 0 ];
                savedObjCount++;
            }
        } );
        totalObjCount++;
    }

    //show this message only for multiple invalid case
    if( savedObjCount === 0 && unSavedObjCount > 1 ) {
        errorMsg += unSavedObjCount + ' of ' + totalObjCount + ' selections were not saved <br/>';
    }

    // show this message when multiple valid and invalid case and also when object count is atleast 3
    if( savedObjCount > 0 && unSavedObjCount > 0 && totalObjCount > 2 ) {
        errorMsg += savedObjCount + ' of ' + totalObjCount + ' selections were saved. <br/>';
        errorMsg += unSavedObjCount + ' of ' + totalObjCount + ' selections were not saved. <br/>';
    }

    // show message when only 1 valid and 1 invalid case
    if( savedObjCount === 1 && unSavedObjCount === 1 ) {
        errorMsg += savedObjectName + ' was saved. <br/>';
    }

    // show this message when user try to make Visible in report TRUE for Non Image object
    objectNameArr.forEach( function( objectName, index ) {
        errorMsg += objectName + ' was not saved because it is not a valid data set. <br/>';
    } );

    if( errorMsg !== '' ) {
        messagingSvc.showError( errorMsg );
    }
};

//To set the input for setProperties for setting problemContextProperty
export let presetFilter = function( data ) {
    if( !data.searchFilterMap ) {
        data.typeFilter = 'Qc0Failure';
    } else {
        appCtxService.ctx.searchIncontextInfo = data.searchFilterMap;
    }
};

//To set the input for setProperties for setting problemContextProperty
export let udpateFiltersForFailure = function( data, ctx ) {
    if( data.categories !== undefined && data.categories.length > 0 ) {
        var categoryIndex = _.findIndex( data.categories, function( category ) {
            return category.internalName === 'WorkspaceObject.object_type';
        } );
        var results = data.categories[ categoryIndex ].results;
        var failureCategoryIndex = _.findIndex( results, function( type ) {
            return type.internalName === 'Qc0Failure';
        } );
        var updatedFilterCategory = [ data.categories[ categoryIndex ].results[ failureCategoryIndex ] ];
        data.categories[ categoryIndex ].results = updatedFilterCategory;
        ctx.searchIncontextInfo.searchFilterCategories.results = updatedFilterCategory;
    }
};

export let updateTextMessage = function( data ) {
    var selectedObjectName = appCtxService.ctx.selectedParentFailure.props.object_name.uiValues[ 0 ];
    var confirmationMessage = localTextBundle.caw0NoFailureFound.format( selectedObjectName );
    data.caw0NoFailureFoundMessage = confirmationMessage;
};

export let clearTextMessage = function( data ) {
    data.caw0NoFailureFoundMessage = '';
};

export let setObjectSourceCommandContext = function( ctx, $scope ) {
    if( $scope.commandContext.objectSetSourceArray ) {
        ctx.selectedTableObjectSource = $scope.commandContext.objectSetSourceArray;
    }
    if( $scope.commandContext.modelTypeRelations ) {
         ctx.modelTypeRelations = $scope.commandContext.modelTypeRelations;
    }
};

export let setStateParameterForProblemSolving = function( ctx ) {
    if( ctx.search.criteria.objectType === 'C2CapaRevision' ) {
        ctx.state.params.defaultTypeForCreate = 'C2Capa';
    } else if( ctx.search.criteria.objectType === 'C2IssueRevision' ) {
        ctx.state.params.defaultTypeForCreate = 'C2Issue';
    }
};

export default exports = {
    getInputForCreateObject,
    getPropertyInput,
    getPropertyInputForDefect5Why,
    getQam0DueDate,
    relateObjects,
    updateEndItem,
    getLOVListOfQAStatus,
    pasteCOE,
    loadViewModel,
    setProviderForEdit,
    updateCOETable,
    addEditHandler,
    addEdit5whyHandler,
    addEditCauseHandler,
    addEditRootCauseHandler,
    updateSelection,
    getSavedQueryEntries,
    getSearchFailureFilterBoxValue,
    updateSelectedFailure,
    clearCtxFlagValue,
    getQualityActionStatus,
    getQARelation,
    get8DUser,
    updateID,
    cleanDataProvider,
    subscribeEventOfReport,
    getTargetObjects,
    unscribeGetGenerateItemReportComplete,
    addparentCAPA,
    getProblemContextSetInput,
    validateVisibleInReport,
    presetFilter,
    udpateFiltersForFailure,
    updateTextMessage,
    clearTextMessage,
    SetSelectionOfCorrectiveAction,
    SetSelectionOfImplCorrectiveAction,
    setObjectSourceCommandContext,
    setStateParameterForProblemSolving
};
app.factory( 'CAW0capaUtilsService', () => exports );
