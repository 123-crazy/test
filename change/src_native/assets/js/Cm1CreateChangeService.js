/* eslint-disable max-lines */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Cm1CreateChangeService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import propertyPolicySvc from 'soa/kernel/propertyPolicyService';
import dmSvc from 'soa/dataManagementService';
import addObjectUtils from 'js/addObjectUtils';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import cmm from 'soa/kernel/clientMetaModel';
import localeSvc from 'js/localeService';
import soaSvc from 'soa/kernel/soaService';
import showObjectCommandHandler from 'js/showObjectCommandHandler';
import cdm from 'soa/kernel/clientDataModel';
import commandsMapService from 'js/commandsMapService';
import constService from 'soa/constantsService';
import tcSessionData from 'js/TcSessionData';
import _ from 'lodash';
import browserUtils from 'js/browserUtils';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import cmUtils from 'js/changeMgmtUtils';
import AwStateService from 'js/awStateService';

var exports = {};

var parentData = {};
var _reviseEventListener = null;

/**
 * flag used to turn on trace level logging
 */
var _debug_logIssuesActivity = browserUtils.getWindowLocationAttributes().logIssuesActivity !== undefined;

/**
 * return Data
 *
 */
export let getData = function() {
    return parentData;
};

/**
 * Store data member for main create change panel which will be used to updated attachement list
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let initData = function( declViewModel ) {
    var self = this;

    self._declViewModel = declViewModel;

    //Initialize some data
    if( declViewModel.attachments === null || declViewModel.attachments === undefined ) {
        console.log( 'UnExpected NULL attachement found.' );
    }

    if( declViewModel.attachments !== undefined && declViewModel.attachments !== null ) {
        declViewModel.dataProviders.getAttachements.update( declViewModel.attachments,
            declViewModel.attachments.length );
    }

    var isDerive = appCtxSvc.ctx.CreateChangePanel.isDerive;

    //Show Copy Option Or not
    if( isDerive ) {
        var selectedChangeObjects = appCtxSvc.ctx.mselected;
        if( selectedChangeObjects && selectedChangeObjects.length === 1 ) {
            var isCopyOptionValid = true;
            if( cmm.isInstanceOf( 'GnProblemReportRevision', selectedChangeObjects[ 0 ].modelType ) && cmUtils.callNewSOAForDerive() === false ) {
                isCopyOptionValid = false;
            }

            if( isCopyOptionValid ) {
                declViewModel.showCopyOptions.dbValue = true;
            } else {
                declViewModel.showCopyOptions.dbValue = false;
            }
            cmUtils.populateImplementsSection( selectedChangeObjects, declViewModel );
        }
    }

    //store create change panel data to a variable.
    parentData = declViewModel;

    if( declViewModel.activeView ) {
        //when there is only one type we need to show directly create form. Following event handeling will do the same.
        var subDef = eventBus
            .subscribe(
                declViewModel.dataProviders.getCreatableChangeTypes.name + '.modelObjectsUpdated',
                function() {
                    if( self._declViewModel.dataProviders.getCreatableChangeTypes.viewModelCollection.totalFound === 1 ) {
                        self._declViewModel.dataProviders.getCreatableChangeTypes.changeObjectsSelection( 0, 0,
                            true );
                    }
                } );

        var subDefs = self._declViewModel._internal.subPanelId2EventSubscriptionsMap[ declViewModel.activeView ];

        if( !subDefs ) {
            subDefs = [];

            self._declViewModel._internal.subPanelId2EventSubscriptionsMap[ declViewModel.activeView ] = subDefs;
        }

        subDefs.push( subDef );
    }
};

/**
 * Return create input for create change operation.
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} isSubmit
 */
export let getCreateInput = function( data, isSubmit ) {
    var deferred = AwPromiseService.instance.defer();

    var soaInput = {};
    var isDerive = appCtxSvc.ctx.CreateChangePanel.isDerive;
    if( !isDerive ) {
        soaInput = _getInputForCreateOperation( data, isSubmit );
        deferred.resolve( soaInput );
    } else {
        if( cmUtils.callNewSOAForDerive() ) {
            soaInput = _getInputForDeriveOperationNewSOA( data, isSubmit );
            deferred.resolve( soaInput );
        } else {
            _getInputForDeriveOperationOldSOA( data, isSubmit )
                .then( function( soaInput ) {
                    deferred.resolve( soaInput );
                } );
        }
    }

    return deferred.promise;
};
var _getInputForCreateOperation = function( data, isSubmit ) {
    var deferred = AwPromiseService.instance.defer();
    var soaInput = {};
    var allObjectUid = [];
    var selectedChangeObjects = appCtxSvc.ctx.mselected;
    if( selectedChangeObjects ) {
        selectedChangeObjects = cmUtils.getAdaptedObjectsForSelectedObjects( selectedChangeObjects );
        for( var i = 0; i < selectedChangeObjects.length; ++i ) {
            allObjectUid.push( selectedChangeObjects[ i ].uid );
 }
    }

    //Reset workflow data else Pin panel will always take last value from data.
    data.workflowData = {};

    if( isSubmit === true ) {
        data.workflowData = {
            submitToWorkflow: [ '1' ]
        };
    }
    cmUtils.populateDataToBePopulated( parentData, data );

    //add cm0InContextObjects property
    //cm0InContextObjects property was added to the create input of ChangeItemRevision in Tc12.2
    //It contains the in context objects for the change being created
    //These objects are created in the change item revision default relation folder
    var isInContextObjectssupported = exports.isSupportedTCVersionForInContextObjects();
    if( isInContextObjectssupported ) {
        data.objCreateInfo.propNamesForCreate.push( 'revision__cm0InContextObjects' );
        data.revision__cm0InContextObjects = {};
        data.revision__cm0InContextObjects.dbValue = [];
        if( selectedChangeObjects ) {
            for( var k = 0; k < selectedChangeObjects.length; k++ ) {
                if( cmm.isInstanceOf( 'BOMLine',
                selectedChangeObjects[ k ].modelType ) ) {
                    data.revision__cm0InContextObjects.dbValue.push( selectedChangeObjects[ k ].props.bl_revision.dbValues );
                    } else{
                        data.revision__cm0InContextObjects.dbValue.push( selectedChangeObjects[ k ].uid );
                    }
            }
        }

        data.revision__cm0InContextObjects.valueUpdated = true;
        data.revision__cm0InContextObjects.isArray = true;

        //selectedResponsibleUser property work for Plant Problem Report.
        //It will get pushed in compound create input i.e. 'participants' property on pdm1ProblemItemRevision BO.
        if( data.selectedResponsibleUser && data.selectedResponsibleUser.length > 0 ) {
            data.objCreateInfo.propNamesForCreate.push( 'revision__participants' );
            data.revision__participants = {};
            data.revision__participants.dbValue = [];
            data.revision__participants.dbValue.push( data.selectedResponsibleUser[ 0 ].uid );
            data.revision__participants.valueUpdated = true;
            data.revision__participants.isArray = true;
        }

        //selected Finding Guideline for Quality Audit (used in Qa0QualityAudit template)
        if( appCtxSvc.getCtx( 'selectedFindingGuideline' ) && data.selectedType && data.selectedType.dbValue === 'C2Issue' ) {
            data.objCreateInfo.propNamesForCreate.push( 'qa0FindingGuideline' );
            data.qa0FindingGuideline = {};
            data.qa0FindingGuideline.dbValue = [];
            data.qa0FindingGuideline.dbValue.push( appCtxSvc.getCtx( 'selectedFindingGuideline' ) );
            data.qa0FindingGuideline.valueUpdated = true;
            data.qa0FindingGuideline.isArray = true;
        } else {
            if( data.qa0FindingGuideline ) {
                data.qa0FindingGuideline = {};
                data.qa0FindingGuideline.dbValue = [];
                data.qa0FindingGuideline.valueUpdated = true;
            }
        }
    }

    var returnedinput = addObjectUtils.getCreateInput( data );

    //This will create change object in selected folder. In case of Change Incontext or Derive It will create change object in changes tab
    if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
        returnedinput[ 0 ].pasteProp = 'contents';
        var targetObject = {
            uid: appCtxSvc.ctx.selected.uid,
            type: 'Folder'
        };
        returnedinput[ 0 ].targetObject = targetObject;
    }

    soaInput = returnedinput;

    deferred.resolve( soaInput );
    return deferred.promise;
};

/**
 * This method is used to get the DeriveInput from getDeepCopyData SOA
 * @param {Object} selectedChangeObject the object to get deepcopydata
 * @returns {Object} DeepCopy Rules
 */
var _getInputForDeriveOperationNewSOA = function( data, isSubmit ) {
    var deferred = AwPromiseService.instance.defer();
    var soaInput = {};
    var workflowString = '';
    var isPropagateRelation = true;

    //selected change objects which needs to be derived.
    var selectedChangeObjectsToDerive = appCtxSvc.ctx.mselected;
    var selectedChangeObjectsToDeriveUids = [];
    _.forEach( selectedChangeObjectsToDerive, function( vmo ) {
        var sObject = {
            type: vmo.type,
            uid: vmo.uid
        };
        selectedChangeObjectsToDeriveUids.push( sObject );
    } );

    //set cm0DerivedFrom to data so that getCreateInputForDerive method will populate create Input.
    data.objCreateInfo.propNamesForCreate.push( 'revision__cm0DerivedFrom' );
    data.revision__cm0DerivedFrom = {};
    data.revision__cm0DerivedFrom.dbValue = [];
    for( var k = 0; k < selectedChangeObjectsToDerive.length; k++ ) {
        data.revision__cm0DerivedFrom.dbValue.push( selectedChangeObjectsToDerive[ k ].uid );
    }
    data.revision__cm0DerivedFrom.valueUpdated = true;
    data.revision__cm0DerivedFrom.isArray = true;

    //Get input property from panel.
    var derivePropertyData = cmUtils.getCreateInputFromDerivePanel( data );

    //This is for a PR fix when revision_id was not present on stylesheet. if revision property is not present than also we need to return cm0DerivableFrom
    if( !derivePropertyData.compoundDeriveInput.revision ) {
        var typeName = data.objCreateInfo.createType + 'Revision';
        var derivedFromObjects = [];
        for( var k = 0; k < selectedChangeObjectsToDerive.length; k++ ) {
            derivedFromObjects.push( selectedChangeObjectsToDerive[ k ].uid );
        }
        var revision = {
            boName: typeName,
            propertyNameValues: {
                cm0DerivedFrom: derivedFromObjects
            }
        };
        derivePropertyData.compoundDeriveInput.revision = [];
        derivePropertyData.compoundDeriveInput.revision[ 0 ] = revision;
    }

    //we only process deepcopy in case of single select Derive from ECR to ECN
    var processDeepCopy = false;
    if( appCtxSvc.ctx.mselected.length === 1 ) {
        processDeepCopy = true;
    }

    var deepCopyDatas = [];
    var deepCopyDataForType = appCtxSvc.ctx.deepCopyData;

    if( appCtxSvc.ctx && appCtxSvc.ctx.deriveRelationsDataProviders && processDeepCopy ) {
        var deriveRelationProviders = appCtxSvc.ctx.deriveRelationsDataProviders;
        if( deriveRelationProviders && deriveRelationProviders.length > 0 ) {
            for( var i = 0; i < deriveRelationProviders.length; i++ ) {
                var deriveRelProvider = deriveRelationProviders[ i ];
                var relName = deriveRelProvider.relationName;

                for( var a in deepCopyDataForType ) {
                    var deepCopyRelation = deepCopyDataForType[ a ].propertyValuesMap.propertyName[ 0 ];
                    if( relName !== deepCopyRelation ) {
                        continue;
                    }

                    var dataProvider = deriveRelProvider.dataProvider;
                    var selectedObjects = dataProvider.selectedObjects;

                    var selectedObjectUids = [];
                    if( selectedObjects && selectedObjects.length > 0 ) {
                        for( var j = 0; j < selectedObjects.length; j++ ) {
                            selectedObjectUids.push( selectedObjects[ j ].uid );
                        }
                    }

                    var deepCopyObjUid = deepCopyDataForType[ a ].attachedObject.uid;
                    var found = selectedObjectUids.includes( deepCopyObjUid );
                    if( !found ) { // we only pass information about object which are not selected. selected object will be processed as per deepcopy rule.
                        //set deepcopy action as NoCopy for non-selected objects
                        deepCopyDataForType[ a ].propertyValuesMap.copyAction[ 0 ] = 'NoCopy';

                        var attachedObjectUid = {
                            type: deepCopyDataForType[ a ].attachedObject.type,
                            uid: deepCopyDataForType[ a ].attachedObject.uid
                        };
                        var deepCopyData = {
                            attachedObject: attachedObjectUid,
                            deepCopyProperties: deepCopyDataForType[ a ].propertyValuesMap,
                            operationInputType: deepCopyDataForType[ a ].operationInputTypeName,
                            childDeepCopyData: deepCopyDataForType[ a ].childDeepCopyData,
                            inputProperties: deepCopyDataForType[ a ].operationInputs
                        };
                        deepCopyDatas.push( deepCopyData );
                    }
                }
            }
        }
    }

    soaInput = {
        selectedObjects: selectedChangeObjectsToDeriveUids,
        derivePropertyData,
        deepCopyDatas,
        submitToWorkflow: isSubmit,
        workflowTemplateName: workflowString,
        propagateRelation: isPropagateRelation
    };

    deferred.resolve( soaInput );

    return deferred.promise;
};

/**
 * Return deriveOptions in input for derive operation of CAPA.
 *
 * @param {Object} data - The panel's view model object
 */
export let getDeriveOptions = function( data ) {
    var selectedSymptomDefect = data.dataProviders.getSymptomDefectProvider.viewModelCollection.loadedVMObjects[ 0 ];
    var copyAction = Boolean( data.deriveType && data.deriveType.dbValue === 'Duplicate' ||  appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'C2CapaRevision' ) > -1 );
    var UID = selectedSymptomDefect ? selectedSymptomDefect.uid : 'AAAAAAA';
    var attachedObjectUid = {
        type: 'CAW0Defect',
        uid: UID
    };
    return {
        targetObject: attachedObjectUid,
        targetRelation: 'CPA0ProblemDescription',
        targetAsDuplicate: copyAction
    };
};

/**
 * Return create input for create change operation.
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} isSubmit
 */
var _getInputForDeriveOperationOldSOA = function( data, isSubmit ) {
    var deferred = AwPromiseService.instance.defer();
    var allObjectUid = [];
    var selectedChangeObjects = appCtxSvc.ctx.mselected;
    var isDerive = appCtxSvc.ctx.CreateChangePanel.isDerive;
    var ismultiSelectDerive = false;
    if( isDerive && appCtxSvc.ctx.mselected.length > 1 &&
        commandsMapService.isInstanceOf( 'GnChangeRequestRevision', appCtxSvc.ctx.selected.modelType ) ) {
        ismultiSelectDerive = true;
    }

    var relationsToPropagate = [];

    if( ismultiSelectDerive ) {
        relationsToPropagate = appCtxSvc.ctx.relationToPropagate;
    }

    for( var i = 0; i < selectedChangeObjects.length; ++i ) {
        allObjectUid.push( selectedChangeObjects[ i ].uid );
    }
    dmSvc
        .getProperties( allObjectUid, relationsToPropagate )
        .then(
            function() {
                //Reset workflow data else Pin panel will always take last value from data.
                data.workflowData = {};

                if( isSubmit === true ) {
                    data.workflowData = {
                        submitToWorkflow: [ '1' ]
                    };
                }
                // For derive add cm0DerivedFrom property on revision create input.
                //add cm0DeriveFrom property

                data.objCreateInfo.propNamesForCreate.push( 'revision__cm0DerivedFrom' );
                data.revision__cm0DerivedFrom = {};
                data.revision__cm0DerivedFrom.dbValue = [];
                var selectedChangeObjects = appCtxSvc.ctx.mselected;
                for( var k = 0; k < selectedChangeObjects.length; k++ ) {
                    data.revision__cm0DerivedFrom.dbValue.push( selectedChangeObjects[ k ].uid );
                }

                data.revision__cm0DerivedFrom.valueUpdated = true;
                data.revision__cm0DerivedFrom.isArray = true;

                //add relation from copy option panel
                data.dataToBeRelated = {};

                if( appCtxSvc.ctx && appCtxSvc.ctx.deriveRelationsDataProviders && appCtxSvc.ctx.mselected.length === 1 ) {
                    var deriveRelationProviders = appCtxSvc.ctx.deriveRelationsDataProviders;

                    if( deriveRelationProviders && deriveRelationProviders.length > 0 ) {
                        for( var i = 0; i < deriveRelationProviders.length; i++ ) {
                            var deriveRelProvider = deriveRelationProviders[ i ];
                            var relName = deriveRelProvider.relationName;

                            var dataProvider = deriveRelProvider.dataProvider;
                            var selectedObjects = dataProvider.selectedObjects;

                            var selectedObjectUids = [];
                            if( selectedObjects && selectedObjects.length > 0 ) {
                                for( var j = 0; j < selectedObjects.length; j++ ) {
                                    selectedObjectUids.push( selectedObjects[ j ].uid );
                                }
                            }

                            if( selectedObjectUids.length > 0 ) {
                                data.dataToBeRelated[ relName ] = selectedObjectUids;
                            }
                        }
                    }
                    appCtxSvc.ctx.deriveRelationsDataProviders = [];
                } else if( appCtxSvc.ctx.mselected.length > 1 &&
                    commandsMapService.isInstanceOf( 'GnChangeRequestRevision',
                        appCtxSvc.ctx.selected.modelType ) ) {
                    var allObjectUid = [];
                    var selectedChangeObjects = appCtxSvc.ctx.mselected;
                    var relationsToPropagate = appCtxSvc.ctx.relationToPropagate;
                    for( var i = 0; i < selectedChangeObjects.length; ++i ) {
                        allObjectUid.push( selectedChangeObjects[ i ].uid );
                    }

                    for( var i in relationsToPropagate ) {
                        if( relationsToPropagate[ i ] !== '' ) {
                            var relName = relationsToPropagate[ i ];
                            var selectedObjectUids = [];

                            for( var j = 0; j < selectedChangeObjects.length; ++j ) {
                                selectedChangeObjects[ j ] = cdm.getObject( selectedChangeObjects[ j ].uid );
                                if( selectedChangeObjects[ j ].props[ relName ] ) {
                                    var numOfRelatedObjects = selectedChangeObjects[ j ].props[ relName ].dbValues.length;
                                    for( var k = 0; k < numOfRelatedObjects; ++k ) {
                                        selectedObjectUids
                                            .push( selectedChangeObjects[ j ].props[ relName ].dbValues[ k ] );
                                    }
                                }
                            }

                            if( selectedObjectUids.length > 0 ) {
                                data.dataToBeRelated[ relName ] = selectedObjectUids;
                            }
                        }
                    }
                }

                var returnedinput = addObjectUtils.getCreateInput( data );

                if( !returnedinput[ 0 ].createData.compoundCreateInput.revision ) {
                    var typeName = data.objCreateInfo.createType + 'Revision';
                    var derivedFromObjects = [];
                    for( var k = 0; k < selectedChangeObjects.length; k++ ) {
                        derivedFromObjects.push( selectedChangeObjects[ k ].uid );
                    }
                    var revision = {
                        boName: typeName,
                        propertyNameValues: {
                            cm0DerivedFrom: derivedFromObjects
                        }
                    };
                    returnedinput[ 0 ].createData.compoundCreateInput.revision = [];
                    returnedinput[ 0 ].createData.compoundCreateInput.revision[ 0 ] = revision;
                }

                //This will create change object in selected folder. In case of Change Incontext or Derive It will create change object in changes tab
                if( appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
                    returnedinput[ 0 ].pasteProp = 'contents';
                    var targetObject = {
                        uid: appCtxSvc.ctx.selected.uid,
                        type: 'Folder'
                    };
                    returnedinput[ 0 ].targetObject = targetObject;
                }
                deferred.resolve( returnedinput );
            } );

    return deferred.promise;
};
/**
 * Action handler used by BIOS service for creating IssueReports for hosted AW. Get typename for object type to
 * create from the CreateIssueHostedMode context.
 *
 * @param {Object} data - The panel's view model object
 *
 * @returns {Promise} Resolved when 'data' is set with
 */
export let handleHostedModeIssueTypeCreation = function( data ) {
    var hostedMode = appCtxSvc.getCtx( 'CreateIssueHostedMode' );
    var issueTypeName = 'IssueReport';
    if( _debug_logIssuesActivity ) {
        logger.info( 'hostIssues: ' + 'Entered Cm1CreateChangeService::handleHostedModeIssueTypeCreation' );
    }
    if( hostedMode ) {
        if( _debug_logIssuesActivity ) {
            logger.info( 'hostIssues: ' + 'CreateIssueHostedMode ctx exists.' );
        }
        if( hostedMode.IssueTypeName ) {
            issueTypeName = hostedMode.IssueTypeName;
            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'Supplied IssueTypeName = \'' + issueTypeName + '\'' );
            }
        }
    }
    var modelType = cmm.getType( issueTypeName );
    if( modelType ) {
        if( _debug_logIssuesActivity ) {
            logger.info( 'hostIssues: ' + 'We were able to obtain modelType for ' + issueTypeName );
            logger.info( 'hostIssues: ' + 'modelType displayName is \'' + modelType.displayName + '\'' );
        }
        data.selectedType.dbValue = issueTypeName;
        data.selectedTypeDisplayName.dbValue = modelType.displayName;
        if( _debug_logIssuesActivity ) {
            logger.info( 'hostIssues: ' + 'About to call uwPropertyService.createViewModelProperty.' );
        }
        var vmProperty = uwPropertyService.createViewModelProperty( issueTypeName, modelType.displayName, 'STRING', '', '' );
        if( !vmProperty ) {
            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'createViewModelProperty did not return a vmProperty.' );
            }
        }
        data.displayedType = vmProperty;
        return AwPromiseService.instance.resolve();
    }
    return soaSvc.ensureModelTypesLoaded( [ issueTypeName ] ).then( function() {
        if( _debug_logIssuesActivity ) {
            logger.info( 'hostIssues: ' + 'Had to call ensureModelTypesLoaded and it succeeded.' );
        }
        var modelType = cmm.getType( issueTypeName );
        if( modelType ) {
            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'We were able to obtain modelType for ' + issueTypeName );
                logger.info( 'hostIssues: ' + 'modelType displayName is \'' + modelType.displayName + '\'' );
            }
            data.selectedType.dbValue = issueTypeName;
            data.selectedTypeDisplayName.dbValue = modelType.displayName;

            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'About to call uwPropertyService.createViewModelProperty.' );
            }
            var vmProperty = uwPropertyService.createViewModelProperty( issueTypeName, modelType.displayName, 'STRING', '', '' );

            if( !vmProperty ) {
                if( _debug_logIssuesActivity ) {
                    logger.info( 'hostIssues: ' + 'createViewModelProperty did not return a vmProperty.' );
                }
            }
            data.displayedType = vmProperty;
        } else {
            if( _debug_logIssuesActivity ) {
                logger.info( 'hostIssues: ' + 'Had to call ensureModelTypesLoaded and it failed.' );
            }
            return AwPromiseService.instance.reject( 'Unknown issueTypeName: ' + issueTypeName );
        }
    } );
};

/**
 * Check if user is trying to create simple change object and based on that return true or false.
 *
 * @param {Object} selectedType Type object that need to be created
 *
 * @returns {boolean} True/False based on simple change object in creation or not.
 */
var _isSimpleChangeObjectCreation = function( selectedType ) {
    var isCreateSimpleChange = false;
    if( !selectedType || !selectedType.props || !selectedType.props.type_name ) {
        return isCreateSimpleChange;
    }
    isCreateSimpleChange = selectedType.props.type_name.dbValue === 'Cm0SimpleChange' ||
      selectedType.props.parent_types && selectedType.props.parent_types.dbValues.indexOf( 'TYPE::Cm0SimpleChange::Cm0SimpleChange::ChangeNotice' ) > -1;
    return isCreateSimpleChange;
};

/**
 * When user select type from type selection panel of change we need to navigate to create form. This method
 * will set few variable to hide type selector panel and to show create form.
 *
 * @param {Object} data - The panel's view model object
 */
export let handleTypeSelectionJs = function( data ) {
    //Initialize isContentLoaded to false every time type is selected from type selection panel.
    data.isContentLoaded.dbValue = false;
    data.isSimpleChangeObjectCreation = false;
    var selectedType = data.dataProviders.getCreatableChangeTypes.selectedObjects;
    if( data.dataProviders.getCreatableChangeTypes !== undefined && data.dataProviders.getCreatableChangeTypes !== null &&
        data.dataProviders.getCreatableChangeTypes.selectedObjects.length > 0 ) {
        selectedType = data.dataProviders.getCreatableChangeTypes.selectedObjects;
    } else if( data.eventData !== undefined && data.eventData !== null && data.eventData.selectedObjects.length > 0 ) {
        selectedType = data.eventData.selectedObjects;
    }
    if( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[ 0 ].props.type_name.dbValue;
        if( selectedType[ 0 ].props.parent_types ) {
            data.parent_types.dbValue = selectedType[ 0 ].props.parent_types.dbValue;
        }
        data.selectedTypeDisplayName.dbValue = selectedType[ 0 ].props.object_string.dbValue;
        data.isSimpleChangeObjectCreation = _isSimpleChangeObjectCreation( selectedType[ 0 ] );
        var vmProperty = uwPropertyService.createViewModelProperty( selectedType[ 0 ].props.object_string.dbValue,
            selectedType[ 0 ].props.object_string.dbValue, 'STRING', '', '' );
        data.displayedType = vmProperty;
        //Get Type Constant to hide Submit button
        var getTypeConstInput = [];
        getTypeConstInput.push( {
            typeName: data.selectedType.dbValue,
            constantName: 'Awp0EnableSubmitForCreate'
        } );
        // adding to Awp0EnableCreateForCreatePanel : getTypeConstInput LCS-139108
        getTypeConstInput.push( {
            typeName: data.selectedType.dbValue,
            constantName: 'Awp0EnableCreateForCreatePanel'
        } );


        //Get create input from constants map
        var creIType = cmm.getType( data.selectedType.dbValue );
        var createInputTypeName = data.selectedType.dbValue;
        if( creIType ) {
            createInputTypeName = creIType.constantsMap.CreateInput;
        }

         // adding to Fnd0EnableAssignProjects : getTypeConstInput
         getTypeConstInput.push( {
            typeName: createInputTypeName,
            constantName: 'Fnd0EnableAssignProjects'
        } );

        //For Simple Change, we don't want to show "Dataset" in attachement panel.
        if ( data.isSimpleChangeObjectCreation ) {
            var attachementTypeStringWithComma = '';
            attachementTypeStringWithComma = appCtxSvc.getCtx( 'CreateChangePanel.typesForAttachement' );
            var attachementTypeArray = attachementTypeStringWithComma.split( ',' );
            if ( attachementTypeArray && attachementTypeArray.length > 0 ) {
                const index = attachementTypeArray.indexOf( 'Dataset' );
                if ( index > -1 ) {
                    attachementTypeArray.splice( index, 1 );
                }

                var attachmentTypes = '';
                for ( var j = 0; j < attachementTypeArray.length; j++ ) {
                    attachmentTypes += attachementTypeArray[j];
                    if ( j !== attachementTypeArray.length - 1 ) {
                        attachmentTypes += ',';
                    }
                }

                appCtxSvc.updatePartialCtx( 'CreateChangePanel.typesForAttachement', attachmentTypes );
            }
        }

        //Retrieve typeConstant Awp0EnableSubmitForCreate
        data.showSubmitButton.dbValue = true;
        //Retrieve typeConstant Awp0EnableCreateForCreatePanel :  LCS-139108
        data.showCreateButton.dbValue = true;
        //Retrieve typeConstant Fnd0EnableAssignProjects
        data.isEnableAssignProjects = true;

        constService.getTypeConstantValues( getTypeConstInput ).then( function( response ) {
            if( response && response.constantValues && response.constantValues.length > 0 ) {
                for( var i = 0; i < response.constantValues.length; i++ ) {
                    var responseConstantName = response.constantValues[ i ].key.constantName;
                    var responseConstantValue = response.constantValues[ i ].value;

                    if( responseConstantValue === 'false' ) {
                        if( responseConstantName === 'Awp0EnableSubmitForCreate' ) {
                            data.showSubmitButton.dbValue = false;
                        } else if( responseConstantName === 'Awp0EnableCreateForCreatePanel' ) {
                            data.showCreateButton.dbValue = false;
                        } else if( responseConstantName === 'Fnd0EnableAssignProjects' ) {
                            data.isEnableAssignProjects = false;
                        }
                    }
                    // For simple change this button should not be visible.
                    if( data.isSimpleChangeObjectCreation && responseConstantName === 'Awp0EnableCreateForCreatePanel' ) {
                        data.showCreateButton.dbValue = false;
                    }
                }
            }
        } );
    } else {
        data.selectedType.dbValue = '';
        data.selectedTypeDisplayName.dbValue = '';
        data.parent_types.dbValue = [];
    }
};

/**
 * Clear selected type when user click on type link on create form
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let clearSelectedType = function( data ) {
    data.selectedType.dbValue = '';
    data.selectedTypeDisplayName.dbValue = '';
    data.parent_types.dbValue = [];
};

/**
 * Initialize variables and methods when create change panle is loaded.
 *
 * @param {Object} data - data
 */
export let initializeCreateChangePanel = function( data ) {
    // handler to listen on click on type on create form. On click it will again show type selection panel.
    data.clearSelectedTypeHandler = function() {
        data.selectedType.dbValue = '';
        data.selectedTypeDisplayName.dbValue = '';
    };
    //reset attachement variables.
    if( !data.attachments ) {
        data.attachments = [];
    } else {
        data.attachments.splice( 0, data.attachments.length );
    }
    if( !data.attachmentsUids ) {
        data.attachmentsUids = [];
    } else {
        data.attachmentsUids.splice( 0, data.attachmentsUids.length );
    }
    //If this is create change in context show selected objects in attachement panel.
    if( appCtxSvc.ctx && appCtxSvc.ctx.CreateChangePanel ) {
        var selectedObjects = appCtxSvc.ctx.CreateChangePanel.selectedObjects;
        if( selectedObjects && selectedObjects.length > 0 ) {
            for( var i = 0; i < selectedObjects.length; i++ ) {
                if( selectedObjects[ i ] !== null && selectedObjects[ i ].modelType.typeHierarchyArray.indexOf( 'Folder' ) <= -1 ) {
                    data.attachments.push( selectedObjects[ i ] );
                    data.attachmentsUids.push( selectedObjects[ i ].uid );
                }
            }
        }
    }
};

/**
 * Get input for creatable change type
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let getInputForCreatableChangeType = function( data ) {
    //Initialize data
    exports.initData( data );
    //Get SOA input
    var creatableChangeTypeInput = [];
    if( appCtxSvc.ctx && appCtxSvc.ctx.CreateChangePanel ) {
        var selectedObjects = appCtxSvc.ctx.CreateChangePanel.selectedObjects;
        if( selectedObjects && selectedObjects.length > 0 ) {
            for( var i = 0; i < selectedObjects.length; i++ ) {
                if( selectedObjects[ i ] !== null ) {
                    var input = {
                        baseTypeName: appCtxSvc.ctx.CreateChangePanel.baseType,
                        clientId: '',
                        exclusionTypeNames: [],
                        object: selectedObjects[ i ].uid
                    };
                    creatableChangeTypeInput.push( input );
                }
            }
        } else {
            var input2 = {
                baseTypeName: appCtxSvc.ctx.CreateChangePanel.baseType,
                clientId: '',
                exclusionTypeNames: [],
                object: ''
            };
            creatableChangeTypeInput.push( input2 );
        }
    }
    return creatableChangeTypeInput;
};

export let getInputForAssignAndRemoveObjectsSOA = function( data ) {
    if( data.derivedObjectUid ) {
        let uid = data.derivedObjectUid;
        let requiredObj = cdm.getObject( uid );
        data.createdChangeObject = requiredObj;
    }
    return [ data.createdChangeObj ];
};

/**
 * Process returned type
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let processResponseForTypeNames = function( response ) {
    var displayableChangeTypes = [];
    for( var r = 0; r < response.output.length; r++ ) {
        var outputTypesList = response.output[ r ];
        var allowedChangeTypesList = outputTypesList.allowedChangeTypes;
        if( allowedChangeTypesList && allowedChangeTypesList.length > 0 ) {
            for( var i = 0; i < allowedChangeTypesList.length; i++ ) {
                displayableChangeTypes.push( allowedChangeTypesList[ i ].typeName );
            }
        }
    }
    //get Unique type list from list of types
    displayableChangeTypes = _.uniq( displayableChangeTypes, true );
    return displayableChangeTypes;
};

/**
 * ensure types are present in cache
 *
 * @param {Object} data - The create change panel's view model object
 *
 */
export let ensureChangeTypesLoadedJs = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var returnedTypes = [];
    var displayableChangeTypes = data.changeTypeNames;
    var promise = soaSvc.ensureModelTypesLoaded( displayableChangeTypes );
    if( promise ) {
        promise.then( function() {
            var typeUids = [];
            for( var i = 0; i < displayableChangeTypes.length; i++ ) {
                var modelType = cmm.getType( displayableChangeTypes[ i ] );
                returnedTypes.push( modelType );
                typeUids.push( modelType.uid );
            }
            //ensure the ImanType objects are loaded
            propertyPolicySvc.register( {
                types: [ {
                    name: 'ImanType',
                    properties: [ {
                        name: 'parent_types'
                    }, {
                        name: 'type_name'
                    } ]
                } ]
            } );
            dmSvc.loadObjects( typeUids ).then( function() {
                var returneddata = {
                    searchResults: returnedTypes,
                    totalFound: returnedTypes.length
                };
                data.changeObjectTypes = displayableChangeTypes.toString();
                data.gotTypes = true;
                deferred.resolve( returneddata );
            } );
        } );
    }
    return deferred.promise;
};

/**
 * GetCreatable Change Types when performing a create issue from hosted AW
 *
 * @param {Object} data - view model data
 */
export let getCreatableChangeTypesProvided = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var providedTypeName = '';
    if( appCtxSvc.ctx.CreateIssueHostedMode && appCtxSvc.ctx.CreateIssueHostedMode.IssueTypeName ) {
        providedTypeName = appCtxSvc.ctx.CreateIssueHostedMode.IssueTypeName;
    } else {
        if( appCtxSvc.ctx.CreateChangePanel.exactTypeToCreate && appCtxSvc.ctx.CreateChangePanel.baseTypeForDeriv !== '' ) {
            providedTypeName = appCtxSvc.ctx.CreateChangePanel.exactTypeToCreate;
        }
    }
    //Initialize data
    exports.initData( data );
    data.changeTypeNames = [];
    data.changeTypeNames.push( providedTypeName );
    deferred.resolve( null );
    return deferred.promise;
};

/**
 * GetCreatable Change Types
 *
 * @param {Object} data - view model data
 */
export let getCreatableChangeTypesForDerive = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var allObjectUid = [];
    var propToLoad = [ 'cm0DerivableTypes', 'cm0RelationsToPropagate', 'cm0AutoPropagateRelations',
        'object_name', 'object_desc'
    ];
    var selectedChangeObjects = appCtxSvc.ctx.mselected;
    for( var i = 0; i < selectedChangeObjects.length; i++ ) {
        allObjectUid.push( selectedChangeObjects[ i ].uid );
    }
    propertyPolicySvc.register( {
        types: [ {
            name: 'ChangeItemRevision',
            properties: [ {
                name: 'object_name'
            }, {
                name: 'object_desc'
            }, {
                name: 'cm0DerivableTypes'
            }, {
                name: 'cm0RelationsToPropagate'
            }, {
                name: 'cm0DerivableTypes'
            }, {
                name: 'cm0AutoPropagateRelations'
            } ]
        } ]
    } );
    dmSvc
        .getProperties( allObjectUid, propToLoad )
        .then(
            function() {
                //Initialize data
                exports.initData( data );
                data.changeTypeNames = [];
                var selectedChangeObjects = [];
                for( var u in allObjectUid ) {
                    if( allObjectUid[ u ] !== '' ) {
                        selectedChangeObjects.push( cdm.getObject( allObjectUid[ u ] ) );
                    }
                }
                var initialTypes = [];
                var initialTypes = cmUtils.getInitialChangeTypesForDerivePanel( initialTypes, selectedChangeObjects );

                for( var i in initialTypes ) {
                    if( initialTypes[ i ] !== '' && initialTypes[ i ] !== null ) {
                        var typeString = initialTypes[ i ];
                        var parsedStr = typeString.split( '/' );
                        var actualTypeName = parsedStr[ 0 ];
                        data.changeTypeNames.push( actualTypeName );
                    }
                }
                var selectedChangeObject = selectedChangeObjects[ 0 ];
                if( selectedChangeObject.props.cm0RelationsToPropagate.dbValues ) {
                    appCtxSvc.ctx.relationToPropagate = selectedChangeObject.props.cm0RelationsToPropagate.dbValues;
                }
                // cm0AutoPropagateRelations.dbValue/dbValues has string value- "0"/"1"
                // and is not evaluated correcty based on its logical value
                // fixing for a defect.
                if ( selectedChangeObject.props.cm0AutoPropagateRelations.dbValue ) {
                    var isAutoPropagate = selectedChangeObject.props.cm0AutoPropagateRelations.dbValue;
                    appCtxSvc.ctx.autoPropagateRel = _.isString( isAutoPropagate ) ? cmUtils.isPropertyValueTrue( isAutoPropagate ) : isAutoPropagate;
                } else {
                    if ( selectedChangeObject.props.cm0AutoPropagateRelations.dbValues &&
                        selectedChangeObject.props.cm0AutoPropagateRelations.dbValues.length > 0 ) {
                        var isAutoPropagate = selectedChangeObject.props.cm0AutoPropagateRelations.dbValues[0];
                        appCtxSvc.ctx.autoPropagateRel = _.isString( isAutoPropagate ) ? cmUtils.isPropertyValueTrue( isAutoPropagate ) : isAutoPropagate;
                    }
                }

                deferred.resolve( null );
            } );

    return deferred.promise;
};

/**
 * Add new attachment to attachment list.
 *
 * @param {String} data - The view model data
 * @param {String} newAttachment - The new attachment to be added
 */
export let addAttachment = function( data, eventData ) {
    if( eventData && data ) {
        if( !parentData.attachments ) {
            parentData.attachments = [];
        }
        if( !parentData.attachmentsUids ) {
            parentData.attachmentsUids = [];
        }
        if( eventData.length > 0 ) {
            for( var i = 0; i < eventData.length; i++ ) {
                var indexOfAttachment = parentData.attachmentsUids.indexOf( eventData[ i ].uid );
                if( indexOfAttachment === -1 ) {
                    parentData.attachments.push( eventData[ i ] );
                    parentData.attachmentsUids.push( eventData[ i ].uid );
                }
            }
        }
        if( parentData.dataProviders && parentData.dataProviders.getAttachements ) {
            //update data provider
            parentData.dataProviders.getAttachements.update( parentData.attachments,
                parentData.attachments.length );

            //clear selection
            parentData.dataProviders.getAttachements.changeObjectsSelection( 0,
                parentData.dataProviders.getAttachements.getLength() - 1, false );
        }
    }
};

/**
 *  Update data provider with Responsible User.
 *  @param {Object} selectedObjects - Selected Responsible User
 */
export let updateResponsibleUserDataProvider = function( selectedObjects ) {
    if( selectedObjects ) {
        selectedObjects.selected = false;
        parentData.selectedResponsibleUser = [ selectedObjects ];
        if( parentData.dataProviders && parentData.dataProviders.getAssignedResponsibleUser ) {
            // Update data provider
            parentData.dataProviders.getAssignedResponsibleUser.update( parentData.selectedResponsibleUser,
                1 );
        }
    }
};

/**
 *  Remove Responsible User from the dataProvider when user clicked on 'Remove Responsible User' button.
 *  @param {Object} dataProvider - dataProvider
 */
export let removeResponsibleUser = function( dataProvider ) {
    if( dataProvider.selectedResponsibleUser ) {
        dataProvider.selectedResponsibleUser = [];
        dataProvider.dataProviders.getAssignedResponsibleUser.update( dataProvider.selectedResponsibleUser, 0 );
    }
};

/**
 *  Update 'selectedObjects' on selection of Responsible User from Create Change Panel.
 */
export let addUserInSelectedObjects = function() {
    parentData.selectedObjects = parentData.selectedResponsibleUser;
};

/**
 * Add new attachment to attachment list.
 *
 * @param {String} data - The view model data
 * @param {String} newAttachment - The new attachment to be added
 */
export let addCreatedAttachement = function( data ) {
    if( data ) {
        if( !parentData.attachments ) {
            parentData.attachments = [];
        }
        if( !parentData.attachmentsUids ) {
            parentData.attachmentsUids = [];
        }
        if( data.createdObject ) {
            parentData.attachments.push( data.createdObject );
            parentData.attachmentsUids.push( data.createdObject.uid );
            if( parentData.dataProviders && parentData.dataProviders.getAttachements ) {
                parentData.dataProviders.getAttachements.update( parentData.attachments,
                    parentData.attachments.length );
            }
        }
    }
};

/**
 * Remove given attachment from attachment list.
 *
 * @param {String} data - The view model data
 * @param {String} attachment - The attachment to be removed
 */
export let removeAttachementJs = function( selectedAttachement ) {
    if( selectedAttachement && selectedAttachement.length > 0 ) {
        if( parentData.attachments && parentData.attachmentsUids ) {
            for( var i = 0; i < selectedAttachement.length; i++ ) {
                var index = parentData.attachmentsUids.indexOf( selectedAttachement[ i ].uid );
                if( index > -1 ) {
                    parentData.attachments.splice( index, 1 );
                    parentData.attachmentsUids.splice( index, 1 );
                }
            }
        }

        if( parentData.dataProviders && parentData.dataProviders.getAttachements ) {
            parentData.dataProviders.getAttachements.update( parentData.attachments,
                parentData.attachments.length );
        }
    }
};

/**
 * SelectAll/ClearAll currently loaded related objects
 *
 * @param {Object} data - view model data
 * @param {String} selectionMode - Selection Mode
 */
export let selectCells = function( data, selectionMode ) {
    if( selectionMode === 'selectAll' ) {
        data.dataProviders.getPropagateRelationProvider.selectAll();
    } else if( selectionMode === 'selectNone' ) {
        data.dataProviders.getPropagateRelationProvider.selectNone();
    }
};

/**
 * handle selection event in relation list to update count label.
 *
 * @param {Object} data - view model data
 */
export let handleSelectionModel = function( data ) {
    data.dataProviders.getPropagateRelationProvider.selectionModel
        .evaluateSelectionStatusSummary( data.dataProviders.getPropagateRelationProvider );
    data.canSelectAll.dbValue = data.dataProviders.getPropagateRelationProvider.selectionModel
        .getCanExecuteSelectLoaded();
    data.canDeselectAll.dbValue = data.dataProviders.getPropagateRelationProvider.selectionModel
        .getCanExecuteDeselect();
    var selectedCount = data.dataProviders.getPropagateRelationProvider.selectionModel
        .getCurrentSelectedCount();
    var resource = 'ChangeMessages';
    var localTextBundle = localeSvc.getLoadedText( resource );
    var countLabel = localTextBundle.countLabel;
    countLabel = countLabel.replace( '{0}', selectedCount );
    countLabel = countLabel.replace( '{1}',
        data.dataProviders.getPropagateRelationProvider.viewModelCollection.totalFound );
    var countDisplayProp = data.countLabel;
    countDisplayProp.propertyDisplayName = countLabel;
    data.countLabel = countDisplayProp;
};

/**
 * Enables submit or create buttons after XRT page is loaded in create panel.
 *
 * @param {Object} data - view model data
 */
export let enableButtons = function( data ) {
    // mask the viewProperty
    data.isContentLoaded.dbValue = true;
};

/**
 * Initialize default values in case of derive operation.
 *
 * @param {Object} data - view model data
 */
export let initializeDefaultValues = function( data ) {
    var isDerive = appCtxSvc.ctx.CreateChangePanel.isDerive;
    if( isDerive ) {
        var selectedChangeObject = cdm.getObject( appCtxSvc.ctx.selected.uid );
        cmUtils.populateCreatePanelPropertiesOnDerive( data );
    }
};

/**
 * Open Object in Edit Mode.
 *
 * @param {String} newObjectUid - object to open ( uid or object it self )
 */
export let openNewObjectInEditMode = function( data ) {
    var uidToConsider = '';
    if( data.derivedObjectUid ) {
        uidToConsider = data.derivedObjectUid;
    } else {
        uidToConsider = data.createdChangeObject.uid;
    }
    var vmo = cdm.getObject( uidToConsider );
    var isSelectedObjectSupportInContext = false;
    var isCreatedObjectSupportInContext = false;
    var openInEdit = true;
    var stateSvc = AwStateService.instance;
    if( stateSvc && stateSvc.params ) {
        var params = stateSvc.params;
        if( params.uid ) {
            var openedObjectUid = params.uid;
            var openObjecyVmo = cdm.getObject( openedObjectUid );
            if( openObjecyVmo && cmm.isInstanceOf( 'Cpd0CollaborativeDesign', openObjecyVmo.modelType ) ) {
                isSelectedObjectSupportInContext = true;
            }
        }
    }
    if( isSelectedObjectSupportInContext ) {
        if( cmm.isInstanceOf( 'ChangeNoticeRevision', vmo.modelType ) ||
            cmm.isInstanceOf( 'Fnd0AbstractMarkupSpace', vmo.modelType ) ) {
            isCreatedObjectSupportInContext = true;
        }
        if( isCreatedObjectSupportInContext ) {
            openInEdit = false;
        }
    }
    if( openInEdit ) {
        showObjectCommandHandler.execute( vmo, null, true );
    }
};

/**
 * Validate data for Change Context Provider
 *
 * @param {Object} data - view model data
 */
export let getChangeContextProvider = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    var changeContextToReturn = data.fnd0ContextProvider;
    if( !_reviseEventListener ) {
        _reviseEventListener = eventBus.subscribe( 'reviseObject.assignProjects',
            function( eventData ) {
                if( appCtxSvc.getCtx( 'pselected' ) !== undefined &&
                    appCtxSvc.getCtx( 'pselected' ).modelType.typeHierarchyArray.indexOf( 'GnChangeNoticeRevision' ) > -1 &&
                    eventData.scope.data.openNewRevision.dbValue === false ) {
                    eventBus.publish( 'cdm.relatedModified', {
                        refreshLocationFlag: true,
                        relatedModified: [ appCtxSvc.getCtx( 'pselected' ) ]
                    } );
                }
            } );
    }
    var isLocalChangeContextsuported = exports.isSupportedTCVersionForLocalChangeContext();
    if( !isLocalChangeContextsuported ) {
        changeContextToReturn.dbValue = null;
        changeContextToReturn.dbValues[ 0 ] = null;
        data.fnd0ContextProvider = changeContextToReturn;
        deferred.resolve( changeContextToReturn );
    } else {
        if( appCtxSvc.getCtx( 'pselected' ) === null || appCtxSvc.getCtx( 'pselected' ) === undefined ) {
            changeContextToReturn.dbValue = null;
            changeContextToReturn.dbValues[ 0 ] = null;
            data.fnd0ContextProvider = changeContextToReturn;
            deferred.resolve( changeContextToReturn );
        } else {
            var selectedObject = appCtxSvc.getCtx( 'selected' );
            var changeContextObject = null;
            // We got an Awb0Element as input
            //if awb0Parent property is NULL, means we are revising top most line. In case of top most line there is no local context which can come from parent.
            if( selectedObject.props.awb0UnderlyingObject !== undefined && selectedObject.props.awb0Parent !== undefined && selectedObject.props.awb0Parent.dbValues[ 0 ] !== null ) {
                //Get parent as local change context
                var parentObjectUid = selectedObject.props.awb0Parent.dbValues[ 0 ];
                var parentObject = cdm.getObject( parentObjectUid );
                if( parentObject && parentObject.props.awb0UnderlyingObject !== undefined ) {
                    changeContextObject = cdm.getObject( parentObject.props.awb0UnderlyingObject.dbValues[ 0 ] );
                }
                var allObjectUid = [];
                allObjectUid.push( changeContextObject.uid );
                var propToLoad = [ 'cm0AuthoringChangeRevision' ];
                dmSvc
                    .getProperties( allObjectUid, propToLoad )
                    .then(
                        function() {
                            var parentUnderlyingObject = cdm.getObject( parentObject.props.awb0UnderlyingObject.dbValues[ 0 ] );
                            var ecnUidFromParentPart = parentUnderlyingObject.props.cm0AuthoringChangeRevision.dbValues[ 0 ];
                            if( ecnUidFromParentPart === '' || ecnUidFromParentPart === null ) {
                                // If No ECN found pass topmost part as local change context
                                changeContextObject = cdm.getObject( appCtxSvc.ctx.aceActiveContext.context.topElement.props.awb0UnderlyingObject.dbValues[ 0 ] );
                            }
                            if( changeContextObject !== null ) {
                                changeContextToReturn.dbValue = changeContextObject;
                                changeContextToReturn.dbValues = changeContextObject;
                                data.fnd0ContextProvider = changeContextToReturn;
                                deferred.resolve( changeContextToReturn );
                            }
                        } );
            }
        }
    }
    return deferred.promise;
};

/**
 * Validate data for Change Context Provider
 *
 * @param {Object} data - view model data
 */
export let getChangeContextProviderForCreate = function( data ) {
    var isLocalChangeContextsuported = exports.isSupportedTCVersionForLocalChangeContext();
    if( !isLocalChangeContextsuported ) {
        data.revision__fnd0ContextProvider.dbValue = null;
        data.revision__fnd0ContextProvider.dbValues = null;
    } else {
        if( appCtxSvc.getCtx( 'selected' ) !== undefined && appCtxSvc.getCtx( 'selected' ) !== null ) {
            var isChangeItemRevision = false;
            if( cmm.isInstanceOf( 'ChangeItemRevision', appCtxSvc.getCtx( 'selected' ).modelType ) ) {
                isChangeItemRevision = true;
            }

            if( isChangeItemRevision && appCtxSvc.getCtx( 'selected' ).props.items_tag !== undefined ) {
                data.revision__fnd0ContextProvider.dbValue = appCtxSvc.getCtx( 'selected' ).props.items_tag.dbValues[ 0 ];
                data.revision__fnd0ContextProvider.dbValues = appCtxSvc.getCtx( 'selected' ).props.items_tag.dbValues[ 0 ];
            }
        }
        //Handle creating content inside structure.
        if( appCtxSvc.getCtx( 'pselected' ) !== undefined &&
            appCtxSvc.getCtx( 'pselected' ).props &&
            appCtxSvc.getCtx( 'pselected' ).props.awb0UnderlyingObject !== undefined &&
            appCtxSvc.ctx.sidenavCommandId !== null && ( appCtxSvc.ctx.sidenavCommandId === 'Awb0AddChildElementDeclarative' ||
                appCtxSvc.ctx.sidenavCommandId === 'Awb0AddSiblingElementDeclarative' ||
                appCtxSvc.ctx.sidenavCommandId === 'Awb0ReplaceElementDeclarative' ) || appCtxSvc.ctx.sidenavCommandId === 'Awb0InsertLevel' ) {
            var selectedObject = appCtxSvc.getCtx( 'selected' );
            var changeContextObjectUid = '';
            if( appCtxSvc.ctx.sidenavCommandId === 'Awb0AddChildElementDeclarative' ) {
                changeContextObjectUid = selectedObject.props.awb0UnderlyingObject.dbValues[ 0 ];
            }
            if( appCtxSvc.ctx.sidenavCommandId === 'Awb0ReplaceElementDeclarative' || appCtxSvc.ctx.sidenavCommandId === 'Awb0AddSiblingElementDeclarative' || appCtxSvc.ctx.sidenavCommandId === 'Awb0InsertLevel' ) {
                var parentObjectUid = selectedObject.props.awb0Parent.dbValues[ 0 ];
                var parentObject = cdm.getObject( parentObjectUid );
                if( parentObject && parentObject.props.awb0UnderlyingObject !== undefined ) {
                    changeContextObjectUid = parentObject.props.awb0UnderlyingObject.dbValues[ 0 ];
                }
            }
            data.revision__fnd0ContextProvider.dbValue = changeContextObjectUid;
            data.revision__fnd0ContextProvider.dbValues = changeContextObjectUid;
        }
    }
};

/**
 * Checks the TC version and returns the boolean for local change context functionality
 * Local change context is supported from Tc11.5.
 *
 * @returns {Boolean} true if TC version is supported for local change context
 */
export let isSupportedTCVersionForLocalChangeContext = function() {
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    var qrmNumber = tcSessionData.getTCQRMNumber();
    //Internal name for Tc11.5 is 11.2.6
    if( tcMajor === 11 && tcMinor >= 2 && qrmNumber >= 6 ) {
        return true;
    }
    //For Tc12 and newer releases
    if( tcMajor > 11 ) {
        return true;
    }
    return false;
};

/**
 * Checks the TC version and returns the boolean for in context objects functionality
 * In context objects is supported from Tc12.2.
 *
 * @returns {Boolean} true if TC version is supported for in context objects
 */
export let isSupportedTCVersionForInContextObjects = function() {
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    var qrmNumber = tcSessionData.getTCQRMNumber();
    //Internal name for Tc12.2
    if( tcMajor === 12 && tcMinor >= 2 && qrmNumber >= 0 ) {
        return true;
    }
    //For Tc13 and newer releases
    if( tcMajor > 12 ) {
        return true;
    }
    return false;
};

/**
 * set isCreatePinEvent to true  during create / submit change flow. Create/ Submit change triggers primaryWorkArea.selectionChangeEvent which indeed close the panel
 *  To preventing close panel when panel is pinned isCreatePinEvent set to true and checked before panel close
 *
 */
export let setConditionToPin = function( data ) {
    if( data.unpinnedToForm.dbValue === true ) {
        data.isCreatePinEvent = true;
    }
};

/**
 * This function check primaryWorkArea.selectionChangeEvent event occure. If primaryWorkArea.selectionChangeEvent event occure
 * during create/ submit change it will not close the pinned panel else it will call complete to close the panel
 *
 */
export let panelUnpinClose = function( data ) {
    if( appCtxSvc.ctx.CreateChangePanel.selectedObjects !== undefined ) {
        if( data.isCreatePinEvent !== true || appCtxSvc.ctx.CreateChangePanel.selectedObjects.length !== appCtxSvc.ctx.mselected.length ) {
            eventBus.publish( 'change.complete' );
        }
    }
    if( data.isCreatePinEvent !== undefined ) {
        data.isCreatePinEvent = false;
    }
};

/**
 * Remove SymptomDefect .Called when clicked on the remove cell.
 *
 * @param {data} data - The qualified data of the viewModel
 */
 export let removeSymptomDefect = function( data ) {
    var allLoadedObjects = data.dataProviders.getSymptomDefectProvider.viewModelCollection.getLoadedViewModelObjects();
    var remainObjects = _.difference( allLoadedObjects, appCtxSvc.ctx.Caw0RemovedDefect );
    data.dataProviders.getSymptomDefectProvider.update( remainObjects, remainObjects.length );
    appCtxSvc.unRegisterCtx( 'Caw0RemovedDefect' );
};

export default exports = {
    getData,
    initData,
    getCreateInput,
    handleHostedModeIssueTypeCreation,
    handleTypeSelectionJs,
    clearSelectedType,
    initializeCreateChangePanel,
    getInputForCreatableChangeType,
    getInputForAssignAndRemoveObjectsSOA,
    processResponseForTypeNames,
    ensureChangeTypesLoadedJs,
    getCreatableChangeTypesProvided,
    getCreatableChangeTypesForDerive,
    addAttachment,
    updateResponsibleUserDataProvider,
    removeResponsibleUser,
    addUserInSelectedObjects,
    addCreatedAttachement,
    removeAttachementJs,
    selectCells,
    handleSelectionModel,
    enableButtons,
    initializeDefaultValues,
    openNewObjectInEditMode,
    getChangeContextProvider,
    getChangeContextProviderForCreate,
    isSupportedTCVersionForLocalChangeContext,
    isSupportedTCVersionForInContextObjects,
    setConditionToPin,
    panelUnpinClose,
    getDeriveOptions,
    removeSymptomDefect
};
/**
 * @member Cm1CreateChangeService
 * @memberof NgServices
 */
app.factory( 'Cm1CreateChangeService', () => exports );
