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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Aqc0UtilService
 */
import _ from 'lodash';
import addObjectUtils from 'js/addObjectUtils';
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import aqc0CharManage from 'js/Aqc0CharManagerUtils';
import aqc0CharLibTreeSvc from 'js/Aqc0CharLibraryTreeTableService';
import awFileNameUtils from 'js/awFileNameUtils';
import AwPromiseService from 'js/awPromiseService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import commandService from 'js/command.service';
import dms from 'soa/dataManagementService';
import eventBus from 'js/eventBus';
import listBoxService from 'js/listBoxService';
import logger from 'js/logger';
import messagingSvc from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import aqc0CharSpecOPSvc from 'js/Aqc0CharSpecOperationsService';


var exports = {};
var QCL_ATT = "Apm0QChecklistAttachments";
var QCL_REF = "Apm0QChecklistReferences";
var CL_ATT = "Qc0ChecklistSpecAttachments";
var CL_REF = "Qc0ChecklistSpecReferences";
var VAR_CHAR_TYPE = 'Qc0VariableCharSpec';
var VIS_CHAR_TYPE = 'Qc0VisualCharSpec';
var ATT_CHAR_TYPE = 'Qc0AttributiveCharSpec';
var CHAR_GROUP_TYPE = 'Qc0CharacteristicsGroup';
var HAS_FAILURE_PROP = 'Qc0HasFailures';
var HAS_ACTION_PROP = 'Qc0HasActions';
var HAS_REFERENCE_PROP = 'Qc0FailureReferences';
var HAS_ATTACHMENT_PROP = 'Qc0FailureAttachments';
var ACTION_TYPE = 'Qam0QualityAction';
var FAILURE_TYPE = 'Qc0Failure';
var REFERENCE_TYPE = 'ItemRevision';
var QC0BASEDONID_PROP = 'qc0BasedOnId';
var IMAN_SPEC_PROP = 'IMAN_specification';
var QC0GROUPREF_PROP = 'qc0GroupReference';
var QC0CONTEXT_PROP = 'qc0Context';
var queryNameInput = {
    inputCriteria: [ {
        queryNames: [
            'CharGroupProvider'
        ]
    } ]
};

export let getSelectedChxType = function() {
    //Need to check group type
    switch ( appCtxSvc.ctx.selected.type ) {
        case ATT_CHAR_TYPE:
            return 'Attributive';

        case VIS_CHAR_TYPE:
            return 'Visual';

        case VAR_CHAR_TYPE:
            return 'Variable';
    }
};

/**
 * Find the saved query
 * @param {queryName} inputs - inputCriteria: [{ queryNames: 'String[]', queryDescs:
 *            'String[]', queryType: 'int' }]
 *  @returns {String} the query data
 */
export let findSavedQueries = function( inputs ) {
    return soaSvc.post( 'Query-2010-04-SavedQuery', 'findSavedQueries', inputs );
};

/**
 * @param {String} data - The view model data
 */
export let getGroupList = function( data ) {
    var charGroupUID;
    if ( appCtxSvc.ctx && appCtxSvc.ctx.selected){
        var groupRefProp = appCtxSvc.ctx.selected.props.qc0GroupReference;
        charGroupUID = groupRefProp ? groupRefProp.dbValue:charGroupUID;
    }
    var selectedCharGroupType = getSelectedChxType();
    var inputData = {
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Acp0CharsRulesAndNCProvider',
            searchCriteria: {
                type: 'Qc0CharacteristicsGroup',
                charGroupType: selectedCharGroupType,
                searchString:''
            },
            searchSortCriteria: [
                {
                    fieldName:'creation_date',
                    sortDirection:'DESC'
                }
            ],
            startIndex: 0
        }
    };
    // SOA call made to get the content
    soaSvc.post( 'Internal-AWS2-2016-03-Finder', 'performSearch', inputData ).then( function( response ) {
        var charGroups = response.searchResults;
        if(charGroupUID)
        {
            var charGroup = cdm.getObject( charGroupUID );
            data.GroupList.dbValue = charGroup;
            data.GroupList.uiValue = charGroup.props.object_name ? charGroup.props.object_name.dbValues[0] : '';

        }
        data.groupList = listBoxService.createListModelObjects( charGroups, 'props.object_name' );


    } );
};
/**
 *
 * @param {String} data - The view model data
 * @param {Object} selectedObjFProp - Selected Object
 * @param {onlyLoadProps} onlyLoadProps - Load Properties Flag
 * @param {relationProp} relationProp Relation Property
 * @param {editOperFlag} editOperFlag Edit Operation Flag
 * @param {deferred} deferred Deferred
 * @param {reviseOperFlag} reviseOperFlag Revise Operation Flag
 * @param {saveDiscardFlag} saveDiscardFlag Save/Discard Operation Flag
 */
export let getPropertiesforSelectedObject = function( data, selectedObjFProp, onlyLoadProps, relationProp, editOperFlag, deferred, reviseOperFlag, saveDiscardFlag ) {
    //To assign selected object to do the required operations
    if( saveDiscardFlag ) {
        selectedObjFProp = data.vmo;
    }
    if( deferred === null || deferred === undefined ) {
        deferred = AwPromiseService.instance.defer();
    }
    var propsToLoad = [];
    var uids = [ selectedObjFProp.uid ];
    propsToLoad = [ HAS_ACTION_PROP, HAS_FAILURE_PROP, HAS_ATTACHMENT_PROP, QCL_ATT, CL_ATT, HAS_REFERENCE_PROP, QCL_REF, CL_REF, QC0BASEDONID_PROP, IMAN_SPEC_PROP, QC0GROUPREF_PROP, QC0CONTEXT_PROP ];
    propsToLoad = _toPreparePropstoLoadData( selectedObjFProp, propsToLoad );

    if( propsToLoad.length > 0 ) {
        dms.getProperties( uids, propsToLoad )
            .then(
                function() {
                    self.performOperationBasedOnVerCheck( data, selectedObjFProp, relationProp, onlyLoadProps, editOperFlag, deferred, reviseOperFlag, saveDiscardFlag );
                }
            );
    } else {
        self.performOperationBasedOnVerCheck( data, selectedObjFProp, relationProp, onlyLoadProps, editOperFlag, deferred, reviseOperFlag, saveDiscardFlag );

    }
};

/**
 * For calling specific function
 *
 * @param {data} data - For retrive the required data
 * @param {object} selectedObjFProp - selected Object
 * @param {relationProp} relationProp Relation Property
 */
self.performOperationsOnSelectedObject = function( data, selectedObjFProp, relationProp ) {
    // To get the required prop values to perform the operation
    var UpdatedPropValues;
    UpdatedPropValues = !data.performAddOperation ? aqc0CharSpecOPSvc.getUpdatedPropValues( selectedObjFProp, relationProp, data )://
    aqc0CharSpecOPSvc.getRequiredValuesForOperation(appCtxSvc.ctx, data, relationProp);
    //Prepare set property SOA Input
    var setPropSOAInput = aqc0CharSpecOPSvc.getSetPropertiesSOAInput( selectedObjFProp, relationProp, UpdatedPropValues);
    //Call Set Properties SOA.
    aqc0CharSpecOPSvc.callSetPropertiesSoa( [setPropSOAInput], data.performAddOperation );
};

/**
 * This function is to check tc version and perform respective action
*  @param {data} data - For retrive the required data
 * @param {object} selectedObjFProp - selected Object
 * @param {relationProp} relationProp Relation Property
 * @param {onlyLoadProps} onlyLoadProps - Load Properties Flag
 * @param {editOperFlag} editOperFlag Edit Operation Flag
 * @param {deferred} deferred Deferred
 * @param {reviseOperFlag} reviseOperFlag Revise Operation Flag
 * @param {saveDiscardFlag} saveDiscardFlag Save/Discard Operation Flag
 */
self.performOperationBasedOnVerCheck = function( data, selectedObjFProp, relationProp, onlyLoadProps, editOperFlag, deferred, reviseOperFlag, saveDiscardFlag ) {
    aqc0CharManage.getSupportedTCVersion();
    if( appCtxSvc.ctx.isTC13_2OnwardsSupported ) {
        !onlyLoadProps ? self.performOperationsOnSelectedObject( data, selectedObjFProp, relationProp ) : 'nothing to do';
        reviseOperFlag ? aqc0CharSpecOPSvc.performReviseSpecification(data, selectedObjFProp) : 'nothing to do';
    }
    if( appCtxSvc.ctx.isTC13_2OnwardsSupported === false ) {
        !onlyLoadProps ? self.addRemoveActionFVersion( data, selectedObjFProp ) : 'nothing to do';
    }
    editOperFlag ? aqc0CharManage.performSaveEdit( data, deferred, selectedObjFProp, saveDiscardFlag ) : 'nothing to do';
};


/**
 * For calling specific function
 *
 * @param {data} data - For retrive the required data
 * @param {object} selectedObjFProp - selected Object
 */
self.addRemoveActionFVersion = function( data, selectedObjFProp ) {
    if( selectedObjFProp === appCtxSvc.ctx.pselected && appCtxSvc.ctx.pselected.type !== 'Qc0Failure' ) {
        exports.getVersionInputFRAction( data );
        exports.removeActionAndCreateVersion( data );
    }
    if( selectedObjFProp === appCtxSvc.ctx.pselected && appCtxSvc.ctx.pselected.type === 'Qc0Failure' ) {
        exports.getVersionInputFailureFRAction( data );
        exports.removeActionAndCreateVersion( data );
    }
    if( selectedObjFProp === appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.type !== 'Qc0Failure' ) {
        exports.getVersionInputFAction( data );
        eventBus.publish( 'aqc0.createVersion' );
    }
    if( selectedObjFProp === appCtxSvc.ctx.selected && appCtxSvc.ctx.selected.type === 'Qc0Failure' ) {
        exports.getVersionInputFFailAction( data );
        eventBus.publish( 'aqc0.createVersion' );
    }
};


/**
 * @param {data} data
 * This method is used to get the input for the versioning soa
 * @returns {ArrayList} the arrayList of the object with input for versioning soa
 */
export let getVersionInputFAction = function( data ) {
    var versionInputData = [ {
        clientId: 'AWClient',
        sourceSpecification: {
            type: appCtxSvc.ctx.selected.type,
            uid: appCtxSvc.ctx.selected.uid
        },
        data: {
            stringProps: {},
            intProps: {},
            doubleProps: {},
            tagArrayProps: {},
            tagProps: {
                qc0GroupReference: {
                    type: 'Qc0CharacteristicsGroup',
                    uid: appCtxSvc.ctx.selected.props.qc0GroupReference.dbValues[ 0 ]
                }
            }
        }
    } ];

    versionInputData[ 0 ].data.stringProps.object_name = appCtxSvc.ctx.selected.props.object_name.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.object_desc = appCtxSvc.ctx.selected.props.object_desc.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.qc0Context = appCtxSvc.ctx.selected.props.qc0Context.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.qc0Criticality = appCtxSvc.ctx.selected.props.qc0Criticality.dbValues[ 0 ];
    versionInputData[ 0 ].data.intProps.qc0BasedOnId = Number( appCtxSvc.ctx.selected.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;

    if( appCtxSvc.ctx.selected.type === 'Qc0VariableCharSpec' ) {
        versionInputData[ 0 ].data.tagProps.qc0UnitOfMeasure = {
            type: 'qc0UnitOfMeasure',
            uid: appCtxSvc.ctx.selected.props.qc0UnitOfMeasure.dbValues[ 0 ]
        };
        if ( appCtxSvc.ctx.isLimitationSupported ) {
            versionInputData[ 0 ].data.stringProps.qc0limitation = appCtxSvc.ctx.selected.props.qc0limitation.dbValues[ 0 ];
        }
        if ( appCtxSvc.ctx.isToleranceTypeSupported ) {
            versionInputData[ 0 ].data.stringProps.qc0ToleranceType = appCtxSvc.ctx.selected.props.qc0ToleranceType.dbValues[ 0 ];
        }
        versionInputData[ 0 ].data.doubleProps.qc0NominalValue = Number( appCtxSvc.ctx.selected.props.qc0NominalValue.dbValues[ 0 ] );
        versionInputData[ 0 ].data.doubleProps.qc0LowerTolerance = Number( appCtxSvc.ctx.selected.props.qc0LowerTolerance.dbValues[ 0 ] );
        versionInputData[ 0 ].data.doubleProps.qc0UpperTolerance = Number( appCtxSvc.ctx.selected.props.qc0UpperTolerance.dbValues[ 0 ] );
    }

    if( appCtxSvc.ctx.selected.type === 'Qc0AttributiveCharSpec' ) {
        versionInputData[ 0 ].data.stringProps.qc0OkDescription = appCtxSvc.ctx.selected.props.qc0OkDescription.dbValues[ 0 ];
        versionInputData[ 0 ].data.stringProps.qc0NokDescription = appCtxSvc.ctx.selected.props.qc0NokDescription.dbValues[ 0 ];
    }

    var actions = [];
    var panelId = data.getPanelId();

    if( panelId === 'Aqc0AddActionForCharSpec' ) {
        actions = [ {
            type: data.createdActionObject.type,
            uid: data.createdActionObject.uid
        } ];
    }
    for( var qa = 0; qa < appCtxSvc.ctx.selected.props.Qc0HasActions.dbValues.length; qa++ ) {
        var hasAction = {};
        hasAction.type = ACTION_TYPE;
        hasAction.uid = appCtxSvc.ctx.selected.props.Qc0HasActions.dbValues[ qa ];
        actions.push( hasAction );
    }
    versionInputData[ 0 ].data.tagArrayProps.qc0Qc0HasActions = actions;

    var failuresToAdd = [];
    if( panelId === 'Aqc0AddFailuresToCharSepc' ) {
        var dataWithFailures = exports.checkDuplicatesAndAddFailures( data );
        failuresToAdd = dataWithFailures.selectedObjects;
    }
    for( var qfailures = 0; appCtxSvc.ctx.selected.props.Qc0HasFailures && qfailures < appCtxSvc.ctx.selected.props.Qc0HasFailures.dbValues.length; qfailures++ ) {
        var hasFailures = {};
        hasFailures.type = FAILURE_TYPE;
        hasFailures.uid = appCtxSvc.ctx.selected.props.Qc0HasFailures.dbValues[ qfailures ];
        failuresToAdd.push( hasFailures );
    }
    versionInputData[ 0 ].data.tagArrayProps.qc0Qc0HasFailures = failuresToAdd;

    if( appCtxSvc.ctx.selected.type === 'Qc0VisualCharSpec' ) {
        var imageDataset = [];
        versionInputData[ 0 ].data.intProps.qc0GridRows = Number( appCtxSvc.ctx.selected.props.qc0GridRows.dbValues[ 0 ] );
        versionInputData[ 0 ].data.intProps.qc0GridColumns = Number( appCtxSvc.ctx.selected.props.qc0GridColumns.dbValues[ 0 ] );
        if( panelId === 'Aqc0AttachImageToVisCharSpec' ) {
            imageDataset = [ {
                type: data.createdImageDatasetObjectInVisChar.type,
                uid: data.createdImageDatasetObjectInVisChar.uid
            } ];
        } else {
            if( appCtxSvc.ctx.selected.props.IMAN_specification.dbValues.length > 0 ) {
                var hasImageDataset = {};
                hasImageDataset.type = 'Image';
                hasImageDataset.uid = appCtxSvc.ctx.selected.props.IMAN_specification.dbValues[ 0 ];
                imageDataset.push( hasImageDataset );
            } else {
                imageDataset.push( null );
            }
        }
        versionInputData[ 0 ].data.tagArrayProps.qc0IMAN_specification = imageDataset;
    }
    data.versionInputDataFVM = versionInputData;
    return versionInputData;
};

/**
 * @param {data} data
 * This method is used to get the input for the versioning soa
 * @returns {ArrayList} the arrayList of the object with input for versioning soa
 */
export let getVersionInputFRAction = function( data ) {
    var versionInputData = [ {
        clientId: 'AWClient',
        sourceSpecification: {
            type: appCtxSvc.ctx.pselected.type,
            uid: appCtxSvc.ctx.pselected.uid
        },
        data: {
            stringProps: {},
            intProps: {},
            doubleProps: {},
            tagArrayProps: {},
            tagProps: {
                qc0GroupReference: {
                    type: 'Qc0CharacteristicsGroup',
                    uid: appCtxSvc.ctx.pselected.props.qc0GroupReference.dbValues[ 0 ]
                }
            }
        }
    } ];

    versionInputData[ 0 ].data.stringProps.object_name = appCtxSvc.ctx.pselected.props.object_name.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.object_desc = appCtxSvc.ctx.pselected.props.object_desc.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.qc0Context = appCtxSvc.ctx.pselected.props.qc0Context.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.qc0Criticality = appCtxSvc.ctx.pselected.props.qc0Criticality.dbValues[ 0 ];
    versionInputData[ 0 ].data.intProps.qc0BasedOnId = Number( appCtxSvc.ctx.pselected.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;

    if( appCtxSvc.ctx.pselected.type === 'Qc0VariableCharSpec' ) {
        versionInputData[ 0 ].data.tagProps.qc0UnitOfMeasure = {
            type: 'qc0UnitOfMeasure',
            uid: appCtxSvc.ctx.pselected.props.qc0UnitOfMeasure.dbValues[ 0 ]
        };
        if ( appCtxSvc.ctx.isLimitationSupported ) {
            versionInputData[ 0 ].data.stringProps.qc0limitation = appCtxSvc.ctx.pselected.props.qc0limitation.dbValues[ 0 ];
        }
        if ( appCtxSvc.ctx.isToleranceTypeSupported ) {
            versionInputData[ 0 ].data.stringProps.qc0ToleranceType = appCtxSvc.ctx.pselected.props.qc0ToleranceType.dbValues[ 0 ];
        }
        versionInputData[ 0 ].data.doubleProps.qc0NominalValue = Number( appCtxSvc.ctx.pselected.props.qc0NominalValue.dbValues[ 0 ] );
        versionInputData[ 0 ].data.doubleProps.qc0LowerTolerance = Number( appCtxSvc.ctx.pselected.props.qc0LowerTolerance.dbValues[ 0 ] );
        versionInputData[ 0 ].data.doubleProps.qc0UpperTolerance = Number( appCtxSvc.ctx.pselected.props.qc0UpperTolerance.dbValues[ 0 ] );
    }

    if( appCtxSvc.ctx.pselected.type === 'Qc0AttributiveCharSpec' ) {
        versionInputData[ 0 ].data.stringProps.qc0OkDescription = appCtxSvc.ctx.pselected.props.qc0OkDescription.dbValues[ 0 ];
        versionInputData[ 0 ].data.stringProps.qc0NokDescription = appCtxSvc.ctx.pselected.props.qc0NokDescription.dbValues[ 0 ];
    }

    var actionProp = '';
    var actionPropSec = '';
    var afobjType = '';
    var afobjTypeSec = '';
    if( appCtxSvc.ctx.mselected[ 0 ].type === 'Qam0QualityAction' ) {
        actionProp = HAS_ACTION_PROP;
        actionPropSec = HAS_FAILURE_PROP;
        afobjType = ACTION_TYPE;
        afobjTypeSec = FAILURE_TYPE;
    } else {
        if( appCtxSvc.ctx.mselected[ 0 ].type === 'Qc0Failure' ) {
            actionProp = HAS_FAILURE_PROP;
            actionPropSec = HAS_ACTION_PROP;
            afobjType = FAILURE_TYPE;
            afobjTypeSec = ACTION_TYPE;
        }
    }

    var selectedPropValues = [];

    if( appCtxSvc.ctx.pselected.props[ actionProp ].dbValues.length === appCtxSvc.ctx.mselected.length && data.updateToLatestFF === undefined ) {
        selectedPropValues.push( null );
    } else {
        for( var qa = 0; qa < appCtxSvc.ctx.pselected.props[ actionProp ].dbValues.length; qa++ ) {
            for( var ms = 0; ms < appCtxSvc.ctx.mselected.length; ms++ ) {
                var hasAction = {};
                hasAction.type = afobjType;
                hasAction.uid = appCtxSvc.ctx.pselected.props[ actionProp ].dbValues[ qa ];

                if( _.findIndex( appCtxSvc.ctx.mselected, [ 'uid', hasAction.uid ] ) === -1 && _.findIndex( selectedPropValues, [ 'uid', hasAction.uid ] ) === -1 ) {
                    selectedPropValues.push( hasAction );
                }
                if( data.updateToLatestFF !== undefined && data.updateToLatestFF.dbValue === 'Update' && _.findIndex( selectedPropValues, [ 'uid', appCtxSvc.ctx.latestFailureVers[ 0 ].uid ] ) === -1 ) {
                    var LatestFailure = {};
                    LatestFailure.type = afobjType;
                    LatestFailure.uid = appCtxSvc.ctx.latestFailureVers[ 0 ].uid;
                    selectedPropValues.push( LatestFailure );
                }
            }
        }
    }
    versionInputData[ 0 ].data.tagArrayProps[ 'qc0' + actionProp ] = selectedPropValues;

    // carry forward
    var CFPropValues = [];
    for( var qa1 = 0; qa1 < appCtxSvc.ctx.pselected.props[ actionPropSec ].dbValues.length; qa1++ ) {
        CFPropValues.push( { type: afobjTypeSec, uid: appCtxSvc.ctx.pselected.props[ actionPropSec ].dbValues[ qa1 ] } );
    }
    versionInputData[ 0 ].data.tagArrayProps[ 'qc0' + actionPropSec ] = CFPropValues;

    if( appCtxSvc.ctx.pselected.type === 'Qc0VisualCharSpec' ) {
        var imageDatasetWR = [];
        versionInputData[ 0 ].data.intProps.qc0GridRows = Number( appCtxSvc.ctx.pselected.props.qc0GridRows.dbValues[ 0 ] );
        versionInputData[ 0 ].data.intProps.qc0GridColumns = Number( appCtxSvc.ctx.pselected.props.qc0GridColumns.dbValues[ 0 ] );
        if( appCtxSvc.ctx.pselected.props.IMAN_specification.dbValues.length > 0 ) {
            var hasImageDataset = {};
            hasImageDataset.type = 'Image';
            hasImageDataset.uid = appCtxSvc.ctx.pselected.props.IMAN_specification.dbValues[ 0 ];
            imageDatasetWR.push( hasImageDataset );
        } else {
            imageDatasetWR.push( null );
        }
        versionInputData[ 0 ].data.tagArrayProps.qc0IMAN_specification = imageDatasetWR;
    }
    data.versionInputDataFVM = versionInputData;
    return versionInputData;
};

/**
 * This method is used to get the input for the versioning soa
 * @param {data} data  The view model data
 */
export let removeActionAndCreateVersion = function( data ) {
    var inputData = {
        specificationInputs: data.versionInputDataFVM
    };
    soaSvc.post( 'Internal-CharManagerAW-2018-12-QualityManagement', 'createSpecificationVersion', inputData ).then( function( response ) {
            data.createdObject = response.specificationsOutput[ 0 ].newSpecification;
            data.createdObjects = data.createdObject;
            //Failure structure refresh
            if( appCtxSvc.ctx.failureManagerContext !== undefined ) {
                exports.pushSelectedNodeInFailureContext( data );
                if( appCtxSvc.ctx.pselected === undefined ) {
                    eventBus.publish( 'primaryWorkarea.reset' );
                }
                if( appCtxSvc.ctx.pselected !== undefined ) {
                    eventBus.publish( 'cdm.relatedModified', {
                        relatedModified: [
                            appCtxSvc.ctx.pselected,
                            appCtxSvc.ctx.selected
                        ]
                    } );
                }
                if( appCtxSvc.ctx.pselected !== undefined && appCtxSvc.ctx.selected.type === 'Qam0QualityAction' ) {
                    eventBus.publish( 'primaryWorkarea.reset' );
                } else if( appCtxSvc.ctx.pselected !== undefined && appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
                    eventBus.publish( 'primaryWorkarea.reset' );
                } else if( appCtxSvc.ctx.pselected !== undefined && appCtxSvc.ctx.selected.modelType.typeHierarchyArray.indexOf( 'Dataset' ) > -1 ) {
                    eventBus.publish( 'primaryWorkarea.reset' );
                }
            }

            if( appCtxSvc.ctx.locationContext.modelObject === undefined && appCtxSvc.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
                eventBus.publish( 'cdm.relatedModified', {
                    relatedModified: [
                        appCtxSvc.ctx.selected
                    ]
                } );
            }
            if( appCtxSvc.ctx.locationContext.modelObject !== undefined && appCtxSvc.ctx.ViewModeContext.ViewModeContext !== 'TreeSummaryView' ) {
                eventBus.publish( 'cdm.relatedModified', {
                    refreshLocationFlag: false,
                    relatedModified: [
                        appCtxSvc.ctx.locationContext.modelObject
                    ],
                    createdObjects: [ data.createdObject ]
                } );
            }
            if( appCtxSvc.ctx.locationContext.modelObject !== undefined && appCtxSvc.ctx.locationContext.modelObject.modelType.typeHierarchyArray.indexOf( 'Qc0MasterCharSpec' ) > -1 ) {
                var commandId = 'Awp0ShowObject';
                var commandArgs = {
                    edit: false
                };
                var commandContext = {
                    vmo: data.createdObject
                };
                aqc0CharManage.openNewObject( commandId, commandArgs, commandContext );
            }
            if( appCtxSvc.ctx.locationContext.modelObject === undefined && appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' ) {
                appCtxSvc.ctx.createdObjectForTreeFromAddAction = data.createdObject;
                appCtxSvc.ctx.versionCreatedFlag =  true;
                eventBus.publish( 'primaryWorkarea.reset' );
            }
            if( response.specificationsOutput[ 0 ] && ( appCtxSvc.ctx.pselected.modelType.typeHierarchyArray.indexOf( 'Qc0MasterCharSpec' ) > -1 || appCtxSvc.ctx.locationContext[ 'ActiveWorkspace:SubLocation' ] === 'FailureSpecificationSubLocation' ) ) {
                //var sucessMessage = '"' + data.createdObject.props.object_name.dbValues[0] + '" version was created';
                var sucessMessage = data.i18n.VersionCreated.replace( '{0}', data.createdObject.props.object_name.dbValues[ 0 ] );
                aqc0CharLibTreeSvc.clearMapOfCharGroupAndSpecification();
                messagingSvc.showInfo( sucessMessage );
            }
        }, function( error ) {
            var errMessage = messagingSvc.getSOAErrorMessage( error );
            messagingSvc.showError( errMessage );
        } )
        .catch( function( exception ) {
            logger.error( data.i18n.FailedToCreateVersion );
            logger.error( exception );
        } );
};


/**
 * @param {data} data
 * This method is used to get the input for the versioning soa
 * @returns {ArrayList} the arrayList of the object with input for versioning soa
 */
export let getVersionInputFailureFRAction = function( data ) {
    var versionInputData = [ {
        clientId: 'AWClient',
        sourceSpecification: {
            type: appCtxSvc.ctx.pselected.type,
            uid: appCtxSvc.ctx.pselected.uid
        },
        data: {
            stringProps: {},
            intProps: {},
            doubleProps: {},
            tagArrayProps: {},
            tagProps: {},
            boolProps: {}
        }
    } ];

    versionInputData[ 0 ].data.stringProps.object_name = appCtxSvc.ctx.pselected.props.object_name.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.object_desc = appCtxSvc.ctx.pselected.props.object_desc.dbValues[ 0 ];
    if( appCtxSvc.ctx.pselected.props.qc0Status.dbValues[ 0 ] === '1' ) {
        versionInputData[ 0 ].data.boolProps.qc0Status = true;
    } else {
        versionInputData[ 0 ].data.boolProps.qc0Status = false;
    }
    versionInputData[ 0 ].data.stringProps.qc0FailureCode = appCtxSvc.ctx.pselected.props.qc0FailureCode.dbValues[ 0 ];
    versionInputData[ 0 ].data.tagProps.qc0ParentFailure = cdm.getObject( appCtxSvc.ctx.pselected.props.qc0ParentFailure.dbValues[ 0 ] );
    versionInputData[ 0 ].data.intProps.qc0BasedOnId = Number( appCtxSvc.ctx.pselected.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;
    versionInputData[ 0 ].data.tagArrayProps[ 'qc0' + HAS_ACTION_PROP ] = _removeAndCarryForwardForFailureSpec( HAS_ACTION_PROP );
    versionInputData[ 0 ].data.tagArrayProps[ 'qc0' + HAS_REFERENCE_PROP ] = _removeAndCarryForwardForFailureSpec( HAS_REFERENCE_PROP );
    versionInputData[ 0 ].data.tagArrayProps[ 'qc0' + HAS_ATTACHMENT_PROP ] = _removeAndCarryForwardForFailureSpec( HAS_ATTACHMENT_PROP );
    data.versionInputDataFVM = versionInputData;
    return versionInputData;
};

/**
 * This method provides the selected failures for adding them to the characteristics specification
 * @param {Object} data data for the selected panel
 * @param {Object} ctx context for the selected panel
 * @returns {ArrayList} ArrayList for the selected failures
 */
export let checkDuplicatesAndAddFailures = function( data ) {
    var loadedVMObjects = data.dataProviders.failureListProvider.viewModelCollection.loadedVMObjects;
    var existingFailures = appCtxSvc.ctx.selected.props.Qc0HasFailures ? appCtxSvc.ctx.selected.props.Qc0HasFailures.dbValues : [];
    data.selectedObjects = [];
    var existingFailuresObject = [];
    for( var index = 0; index < existingFailures.length; index++ ) {
        var failureObject = cdm.getObject( existingFailures[ index ] );
        if( failureObject && failureObject.props.qc0IsLatest.dbValues[ 0 ] !== '1' ) {
            existingFailuresObject.push( failureObject.props.qc0FailureCode.dbValues[ 0 ] );
        }
    }
    _.find( loadedVMObjects, function( viewmodel ) {
        if( viewmodel.selected === true ) {
            if( existingFailures.length === 0 ) {
                data.selectedObjects.push( { type: FAILURE_TYPE, uid: viewmodel.uid } );
            } else if( existingFailuresObject.indexOf( viewmodel.props.qc0FailureCode.dbValues[ 0 ] ) !== -1 ) {
                data.selectedObjects.push( { type: 'Older Version', uid: viewmodel.props.qc0FailureCode.dbValues[ 0 ] } );
                return data;
            }
            if( existingFailures.length !== 0 && !_.includes( existingFailures, viewmodel.uid ) ) {
                data.selectedObjects.push( { type: FAILURE_TYPE, uid: viewmodel.uid } );
            }
        }
    } );
    return data;
};


/**
 * @param {data} data
 * This method is used to get the input for the versioning soa
 * @returns {ArrayList} the arrayList of the object with input for versioning soa
 */
export let getVersionInputFFailAction = function( data ) {
    var versionInputData = [ {
        clientId: 'AWClient',
        sourceSpecification: {
            type: appCtxSvc.ctx.selected.type,
            uid: appCtxSvc.ctx.selected.uid
        },
        data: {
            stringProps: {},
            intProps: {},
            doubleProps: {},
            tagArrayProps: {},
            tagProps: {},
            boolProps: {}
        }
    } ];
    var actions = [];
    var references = [];
    var attchments = [];
    var panelId = data.getPanelId();

    versionInputData[ 0 ].data.stringProps.object_name = appCtxSvc.ctx.selected.props.object_name.dbValues[ 0 ];
    versionInputData[ 0 ].data.stringProps.object_desc = appCtxSvc.ctx.selected.props.object_desc.dbValues[ 0 ];
    if( appCtxSvc.ctx.selected.props.qc0Status.dbValues[ 0 ] === '1' ) {
        versionInputData[ 0 ].data.boolProps.qc0Status = true;
    } else {
        versionInputData[ 0 ].data.boolProps.qc0Status = false;
    }
    versionInputData[ 0 ].data.stringProps.qc0FailureCode = appCtxSvc.ctx.selected.props.qc0FailureCode.dbValues[ 0 ];
    versionInputData[ 0 ].data.tagProps.qc0ParentFailure = cdm.getObject( appCtxSvc.ctx.selected.props.qc0ParentFailure.dbValues[ 0 ] );
    versionInputData[ 0 ].data.intProps.qc0BasedOnId = Number( appCtxSvc.ctx.selected.props.qc0BasedOnId.dbValues[ 0 ] ) + 1;
    if( panelId === 'Aqc0AddActionForCharSpec' ) {
        actions = [ {
            type: data.createdActionObject.type,
            uid: data.createdActionObject.uid
        } ];
    } else if( panelId === 'Aqc0AddReferencesToFailureObject' ) {
        if( data.selectedTab.tabKey !== 'new' ) {
            references = data.sourceModelObjects;
        } else {
            references = [ {
                type: 'AAAAAAAAA',
                uid: data.createdObjectForFailReferences.uid
            } ];
        }
    } else if( panelId === 'Aqc0AddAttachmentToFailureSpec' ) {
        attchments = [ {
            type: data.createdAttachmentObject.type,
            uid: data.createdAttachmentObject.uid
        } ];
    }

    for( var qa = 0; qa < appCtxSvc.ctx.selected.props.Qc0HasActions.dbValues.length; qa++ ) {
        var hasAction = {};
        hasAction.type = ACTION_TYPE;
        hasAction.uid = appCtxSvc.ctx.selected.props.Qc0HasActions.dbValues[ qa ];
        actions.push( hasAction );
    }
    for( var ref = 0; ref < appCtxSvc.ctx.selected.props.Qc0FailureReferences.dbValues.length; ref++ ) {
        var reference = {};
        reference.type = 'AAAAAAAAA';
        reference.uid = appCtxSvc.ctx.selected.props.Qc0FailureReferences.dbValues[ ref ];
        references.push( reference );
    }
    for( var dataset = 0; dataset < appCtxSvc.ctx.selected.props.Qc0FailureAttachments.dbValues.length; dataset++ ) {
        var attchment = {};
        attchment.type = 'AAAAAAAAA';
        attchment.uid = appCtxSvc.ctx.selected.props.Qc0FailureAttachments.dbValues[ dataset ];
        attchments.push( attchment );
    }
    if( actions.length > 0 ) {
        versionInputData[ 0 ].data.tagArrayProps.qc0Qc0HasActions = actions;
    }
    if( references.length > 0 ) {
        versionInputData[ 0 ].data.tagArrayProps.qc0Qc0FailureReferences = references;
    }
    if( attchments.length > 0 ) {
        versionInputData[ 0 ].data.tagArrayProps.qc0Qc0FailureAttachments = attchments;
    }
    data.versionInputDataFVM = versionInputData;
    return versionInputData;
};

/** This method contains the carry forward logic for failure specification when user REMOVES the attachment/reference/quality action
 * @param { Object } prop - identifies the type to carry forward ( attachments/references/QA )
 * @returns { Object } selectedPropValues - this object contains the tagArrayProps which need to be carry forwarded
 */
function _removeAndCarryForwardForFailureSpec( prop ) {
    var selectedPropValues = [];
    var objType = 'AAAAAA';
    for( var qa = 0; qa < appCtxSvc.ctx.pselected.props[ prop ].dbValues.length; qa++ ) {
        for( var ms = 0; ms < appCtxSvc.ctx.mselected.length; ms++ ) {
            var hasProp = {};
            hasProp.type = objType;
            hasProp.uid = appCtxSvc.ctx.pselected.props[ prop ].dbValues[ qa ];

            if( _.findIndex( appCtxSvc.ctx.mselected, [ 'uid', hasProp.uid ] ) === -1 && _.findIndex( selectedPropValues, [ 'uid', hasProp.uid ] ) === -1 ) {
                selectedPropValues.push( hasProp );
            }
        }
    }
    if( selectedPropValues.length === 0 ) {
        selectedPropValues = [ null ];
    }
    return selectedPropValues;
}

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

/** This method passes the values to be considered while fetching the latest released failure spec in comparison mode
 *  @param {Sting} type Model Object Type
 *  @param {StingArray} propertyValues Array of property values to be considered prior to TC13.2
 *  @returns {StingArray}  Array of property values to be considered after TC13.2
 */
export let getValuesToPass = function() {
    var values = [
        "true",
        appCtxSvc.ctx.selected.props.qc0FailureCode.dbValue
   ];
    return values;
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

/**
 * Returns the search criteria with vaild inputs for characteristics library sublocation.
 * It also populates the search filter information.
 */
export let getSearchCriteriaInputForCharLib = function() {
    var searchCriteriaInput = {};
    if( appCtxSvc.ctx.search && appCtxSvc.ctx.search.criteria ) {
        var criteria = appCtxSvc.ctx.search.criteria;
        // Populate the search criteria input
        searchCriteriaInput = {
            queryName: criteria.queryName,
            searchID: criteria.searchID,
            lastEndIndex: criteria.lastEndIndex,
            totalObjectsFoundReportedToClient: criteria.totalObjectsFoundReportedToClient,
            typeOfSearch: criteria.typeOfSearch,
            utcOffset: criteria.utcOffset,
            Type: criteria.Type
        };

        // Add the 'name' key to the search createria only if a vaild search filter is present.
        if( criteria.searchString && criteria.searchString.trim().length > 0 ) {
            searchCriteriaInput.Name = exports.getSearchFailureFilterBoxValue( criteria.searchString );
        }
    }
    return searchCriteriaInput;
};
/**
 * Set the selected node value when doing the Failure Version as part of add/Remove actions,references and attchments.
 */
export let pushSelectedNodeInFailureContext = function( data ) {
    appCtxSvc.ctx.failureManagerContext.selectedNodes = [];
    appCtxSvc.ctx.failureManagerContext.selectedNodes.push( data.createdObject );
};
/**
 * function returns file extension.
 */
export let getFileExtension = function( data ) {
    var fileExtension = awFileNameUtils.getFileExtension( data.fileName );
    data.datasetName.dbValue = data.fileName.split( '.' )[ 0 ];
    data.fileExtension = fileExtension.split( '.' ).pop();
};
/**
 * function returns file update selected dataset type.
 */
export let updateCurrentDatasetType = function( data ) {
    data.datasetType.dbValue = data.datasetTypeList[ 0 ].propInternalValue;
    data.datasetType.uiValue = data.datasetType.dbValue.props.datasettype_name.dbValues[ 0 ];
    data.isText = data.reference[ 0 ].fileFormat === 'TEXT';
};

/**Function is called while creating the naming convention from the characteristics library(when create panel is pinned).
 * @param { String } - Next value for the object name as per naming pattern
 * @param { Object } - Data object is passed to the function to set the next dbValue for creating the object
 */
export let setNewValueForNamingConvention = function( nextValue, data ) {
    data.object_name.dbValue = nextValue;
    data.object_name.dbValues[0] = nextValue;
};

/**
 *  This method creates the input for attaching the references to the failure specification
 *  @param { Object } data - data for getting object name and to put createdObject
 *  @returns { Object } createdObject - created object
 *
 */
export let getCreateInputForCreateObject = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    if( data.selectedTab.tabKey === 'new' ) {
        var createInput = addObjectUtils.getCreateInput( data );
        var Inputs = {
            inputs: createInput
        };
        soaSvc.post( 'Core-2016-09-DataManagement', 'createAttachAndSubmitObjects', Inputs ).then( function( response ) {
                deferred.resolve( response );
                var values = response.ServiceData.created.map( function( Objuid ) {
                    return response.ServiceData.modelObjects[ Objuid ];
                } );
                _.forEach( values, function( val ) {
                    if( val.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
                        data.createdObjectForFailReferences = val;
                        deferred.resolve( data.createdObjectForFailReferences );
                    }
                } );
                eventBus.publish( 'addObject.objectcreated' );
                eventBus.publish( 'getPropertiesForFailureObject' );
            },
            function( error ) {
                eventBus.publish( 'addObject.addOprfailed' );
            }
        );
        return data.createdObjectForFailReferences;
    }
};

export let getCreateInputForCreateChecklistObject = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    if( data.selectedTab.tabKey === 'new' ) {
        var createInput = addObjectUtils.getCreateInput( data );
        var Inputs = {
            inputs: createInput
        };
       soaSvc.post( 'Core-2016-09-DataManagement', 'createAttachAndSubmitObjects', Inputs ).then( function( response ) {
            var values = response.ServiceData.created.map( function( Objuid ) {
                return response.ServiceData.modelObjects[ Objuid ];
            } );
            if( values && values.length > 0 ) {
                _.forEach( values, function( val ) {
                    if( val.modelType.typeHierarchyArray.indexOf( 'ItemRevision' ) > -1 ) {
                        deferred.resolve( val );
                    }
                } );
            } else {
                deferred.resolve( response );
            }
        },
        function( error ) {
            eventBus.publish( 'addObject.addOprfailed' );
            deferred.reject( error );
        } );
    } else {
        data.createdObject = data.sourceObjects[0];
        return data.createdObject;
    }
    return deferred.promise;
};

export let  subscribeContentLoaded = function() {
    eventBus.subscribe( 'awXRT2.contentLoaded', function(
        ) {
            //Open object in edit mode after create or version operation.
            if( appCtxSvc.ctx.newlyCeatedObj ) {
                appCtxSvc.ctx.newlyCeatedObj = false;
                var viewMode = appCtxSvc.ctx.ViewModeContext.ViewModeContext;
                var executeCommandId = viewMode === 'TreeSummaryView' ? 'Awp0StartEditSummary' : 'Awp0StartEdit';
                commandService.executeCommand( executeCommandId );
            }
            //To fix the defect LCS-497880 - Group List not updated on Save As Panel In tree view if selection change is for different type of char spec objects
            // Subscribe xrt2 content loaded event for on revel of SaveAS panel only when action done in tree view.
            if( appCtxSvc.ctx.ViewModeContext.ViewModeContext === 'TreeSummaryView' && appCtxSvc.ctx.activeToolsAndInfoCommand && appCtxSvc.ctx.activeToolsAndInfoCommand.commandId === 'Aqc0SaveAsCharSpecification' ) {
                eventBus.publish( 'aqc0SelectionChangeForSaveAs.refreshGroupList' );
                eventBus.publish( 'aqc0SelectionChangeForSaveAs.loadUnitOfMeasure' );
            }
    } );
};
// Below are the required functions for Specification operations.
/*
* This method to return the property lists which needs to be loaded
*/
function _toPreparePropstoLoadData( selectedCondObj, propsToLoad ) {
    var propsToLoadData = [];
    for( var prop of propsToLoad ) {
        if( !selectedCondObj.props.prop ) {
            propsToLoadData.push( prop );
        }
    }
    return propsToLoadData;
}

export let getLastReleased = function( response, data ) {
    appCtxSvc.ctx.showMessage = true;
    let values = response.ServiceData.plain.map( function( Objuid ) {
        return response.ServiceData.modelObjects[ Objuid ];
    } );

    if(appCtxSvc.ctx.selected.props.qc0BasedOnId.dbValues[0] !== values[0].props.qc0BasedOnId.dbValues[0]){
        appCtxSvc.ctx.showMessage = false;
        return values;
    }
    return;
};

/** This function calls the soa/saved query based on TC version
 *  @param { Object } data - data object from view model
 *  @returns { Object } Promise - promis object containing the response
 */
 export let getFailureObjects = function( data ) {
    var deferred = AwPromiseService.instance.defer();
    aqc0CharManage.getSupportedTCVersion();
    if( appCtxSvc.ctx.isTC13_2OnwardsSupported ) {
        var inputData = {
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Aqc0QualityBaseProvider',
                searchFilterMap6: {
                    'WorkspaceObject.object_type': [ {
                        searchFilterType: 'StringFilter',
                        stringValue: 'Qc0Failure'
                    } ]
                },
                searchCriteria: {
                    objectType: 'Qc0Failure',
                    objectName: exports.getSearchFailureFilterBoxValue( data.filterBox.dbValue ),
                    isReleased: "true"
                },
                searchSortCriteria: []
            }
        };
        soaSvc.post( 'Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData ).then( function( response ) {
            var values = response.ServiceData.plain.map( function( Objuid ) {
                return response.ServiceData.modelObjects[ Objuid ];
            } );
            var responseData = {
                searchResults: values,
                totalLoaded: values.length
            };
            deferred.resolve( responseData );
        }, function( reason ) {
            deferred.reject( reason );
        } );
    } else {
        var inputData = {
            inputCriteria: [ {
                queryNames: [
                    "Failure Specification..."
                ]
            } ]
        };
        soaSvc.post( 'Query-2010-04-SavedQuery', 'findSavedQueries', inputData ).then( function( response ) {
            var savedQuery = response.savedQueries[ 0 ];
            var inputToExecuteQuerySoa = {
                query: savedQuery,
                "limit": 50,
                "entries": getSavedQueryEntries( "Qc0Failure", "[qc0Status,qc0IsLatest,object_name]" ),
                "values": [
                    "true",
                    "true",
                    getSearchFailureFilterBoxValue( data.filterBox.dbValue )
                ]
            };
            if( savedQuery ) {
                soaSvc.post( 'Query-2006-03-SavedQuery', 'executeSavedQuery', inputToExecuteQuerySoa ).then( function( response ) {
                    if( response.ServiceData.plain.length > 0 ) {
                        var values = response.ServiceData.plain.map( function( Objuid ) {
                            return response.ServiceData.modelObjects[ Objuid ];
                        } );

                        var responseData = {
                            searchResults: values,
                            totalLoaded: values.length
                        };
                        deferred.resolve( responseData );
                    }
                }, function( reason ) {
                    deferred.reject( reason );
                } );
            } else {
                //If the group doesn't have any specifications then return an empty list
                var responseData = {
                    totalLoaded: []
                };
                deferred.resolve( responseData );
            }
        }, function( reason ) {
            deferred.reject( reason );
        } );
    }
    return deferred.promise;

};

export default exports = {
    getSelectedChxType,
    findSavedQueries,
    getGroupList,
    getPropertiesforSelectedObject,
    checkDuplicatesAndAddFailures,
    getVersionInputFFailAction,
    getSavedQueryEntries,
    getSearchFailureFilterBoxValue,
    getSearchCriteriaInputForCharLib,
    getVersionInputFAction,
    getVersionInputFRAction,
    getVersionInputFailureFRAction,
    removeActionAndCreateVersion,
    pushSelectedNodeInFailureContext,
    getFileExtension,
    updateCurrentDatasetType,
    setNewValueForNamingConvention,
    getCreateInputForCreateObject,
    getCreateInputForCreateChecklistObject,
    subscribeContentLoaded,
    getLastReleased,
    getFailureObjects,
    getValuesToPass
};
/**
 * TODO
 * @member Aqc0UtilService
 * @memberof NgServices
 * @param {String} $q - $q
 * @param {String} appCtxSvc -context Service
 * @param {String} listBoxService - List Box Service
 * @param {String} soaSvc - soaSvc Service
 * @param {String} dms - dms Service
 * @param {String} aqc0CharManage - aqc0CharManage Service
 * @param {String} messagingSvc - messagingSvc Service
 * @param {String} cdm - cdm Service
 * @param {String} cmm - cmm Service
 * @returns {String} exports
 */
app.factory( 'Aqc0UtilService', () => exports );
