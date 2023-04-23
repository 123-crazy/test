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
 * @module js/Acp0BCTService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import soaSvc from 'soa/kernel/soaService';
import messagingSvc from 'js/messagingService';
import logger from 'js/logger';
import appCtxService from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import AwPromiseService from 'js/awPromiseService';
import acp0BCTInspCompRenderService from 'js/Acp0BCTInspCompRenderService';
import preferenceSvc from 'soa/preferenceService';
import tcSessionData from 'js/TcSessionData';
import acp0BCTInspUtilService from 'js/Acp0BCTInspUtilService';
import awSvrVer from 'js/TcAWServerVersion';
import viewModelObjectService from 'js/viewModelObjectService';
import ruleNCCondUtils from 'js/Acp0RuleNCCondUtils';

//Register the default value to show reference part list to show panel
appCtxService.registerCtx('showReferencePartList', true);
//Register the part list view mode initial value
appCtxService.registerCtx('refPartListView', true);
//Map of property name and disply value for reference part table in part to inspect table
var _mapOfColPropNameAndDisplayNameForRefPart = new Map();
//Pref value for tolerence type
var _mprefValueForTolarence;
var _mprefNames = ['AQC_VarCharSpecToleranceType'];
//Direct drawing rendering required class level variables
var _selectedPartForDirectDrawing;
var _charUidsOfImpPMIForDirectDrawing;
//Pref value for default PSE_default_view_type to get PMI object
var _mprefPSEdefaultviewtypeValue;
var _mprefPSEdefaultviewtype = 'PSE_default_view_type';
//Register objectset to get MCI0Pmi object to render direct drawing in PMI Tab
appCtxService.registerCtx('viewMci0PMIObjectSet');
//Register the default value to show compare part revisions list to show panel
appCtxService.registerCtx('showComparePartRevisionsList', false);
//Base revision Project selection default value
appCtxService.registerCtx('baseRevisionSelection', undefined);
//Base part selection
appCtxService.registerCtx( 'baseSelectedPart', undefined );

var exports = {};

/*
 *  @param {Object} ctx context Object
 */
export let getPartCharacteristics = function (ctx, data) {
    //Check and set the BCT License key
    acp0BCTInspCompRenderService.readAndSetLicenseKey();
    ctx.selectedPart = undefined;
    appCtxService.updateCtx('baseRevisionSelection', undefined);
    appCtxService.updateCtx('baseSelectedPart', undefined);
    //Call preference service to read preference for tolarence type
    if (!_mprefValueForTolarence) {
        exports.getPreferenceValues(_mprefNames);
    }
    //Version check required as import PMI itk implementation changed from tc13.1 onwards, It impacts the import PMI SOA input
    if (ctx.isAW13X_OnwardsSupported === undefined || ctx.isTC13_1OnwardsSupported === undefined) {
        exports.getSupportedTCVersion();
    }
    //To Call Part List Data Provider once loaded the Ballooning tab for backportsupport on AW5.2
    if (ctx.isTC13_1OnwardsSupported === false && ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_CAD_View') {
        eventBus.publish('Acp0.callPartListDataProvider');
    }
    //Reset the BCT Inspector Balloon selection, charUId of imported PMI, selectedsheet,file type and project object.
    ctx.bctInspSelection = undefined;
    ctx.charUidOfImpPMI = undefined;
    ctx.selectedSheet = undefined;
    ctx.fileTypeOfProject = undefined;
    ctx.projectToRenderBctComponent = undefined;
    ctx.showReferencePartList = true;
    ctx.showComparePartRevisionsList = false;
    ctx.renderingErrorMessage = undefined;
    var SplmTableElement;
    var objectSetElement;
    var objectSets = document.getElementsByTagName('aw-walker-objectset');
    //Get the Part from Inspection Definition
    if (ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_PMI') {
        exports.readDefaultPSEViewTypeForPMI();
    }
    //Read object set titlekey to verify Drawing section in PMI tab
    if (objectSets && objectSets.length > 0 ) {
        objectSets.forEach(function (objectSet) {
            objectSetElement = objectSet.getAttribute('titlekey');
            if (appCtxService.ctx.isTC13_1OnwardsSupported === false && objectSetElement === 'tc_xrt_Drawings' || objectSetElement === 'tc_xrt_PMI') {
                SplmTableElement = objectSet.getElementsByTagName('aw-splm-table')[0];
            }
        });
    }
    var objectSet = !SplmTableElement ? '' : SplmTableElement.attributes.gridid.value;
    //Add event on splm table row if it is part of PMI section(XRT)
    var dataProviderArr = [objectSet, 'partListProvider', 'refPartsProvider', 'partRevisionListProvider'];
    _.forEach(dataProviderArr, function (dp) {
        eventBus.subscribe(dp + '.selectionChangeEvent', function (eventData) {
            //Reset the BCT Inspector Balloon selection
            ctx.bctInspSelection = undefined;
            ctx.charUidOfImpPMI = undefined;
            ctx.renderingErrorMessage = undefined;
            if (eventData.selectedUids.length !== 0) {
                var selectedObject = objectSetElement === 'tc_xrt_PMI' || objectSetElement === 'tc_xrt_Drawings' ? cdm.getObject(eventData.selectedUids[0]) : cdm.getObject(eventData.selectedUids[0].uid);
            }
            if (objectSetElement === 'tc_xrt_PMI' && selectedObject) {
                ctx.inspCombineViewMode = false;
                ctx.inspDrawingViewMode = true;
                ctx.inspTableViewMode = false;
                ctx.selectedPart = cdm.getObject(selectedObject.props.mci0PMIReferencePart.dbValues[0]);
                ctx.charUidOfImpPMI = [selectedObject.props.mci0PMICharacteristicsUid.dbValues[0]];
                //Prepare and Render the BCT Inspector based on view mode selection.
                acp0BCTInspCompRenderService.getProjectAndRenderBCTInspViewer(ctx, data);
            }
            //As part of direct drawing rendering in PMI tab on deselection /cleare selection also drawing should be rendered
            else if (objectSetElement === 'tc_xrt_PMI' && !selectedObject) {
                ctx.selectedPart = _selectedPartForDirectDrawing;
                ctx.charUidOfImpPMI = _charUidsOfImpPMIForDirectDrawing;
                //Prepare and Render the BCT Inspector based on view mode selection.
                acp0BCTInspCompRenderService.getProjectAndRenderBCTInspViewer(ctx, data);
            } else {
                if (!ctx.selectedPart || (!selectedObject && !eventData.selectedObjects[0]) //
                || (selectedObject && ctx.selectedPart.uid !== selectedObject.uid) || (eventData.selectedObjects[0] && ctx.selectedPart.uid !== eventData.selectedObjects[0].uid)) {
                    ctx.selectedPart = selectedObject === null ? eventData.selectedObjects[0] : selectedObject;
                    //Prepare and render BCTInspector including highlighted ballooninformation
                    exports.highlightImportedBalloons(ctx, data, eventData);
                }
            }
        });
    });
};

/*
  This function is to highlight all imported balloons while rendering drawing
*/
export let highlightImportedBalloons = function (ctx, data, eventData) {
    var inspDefs = [];
    var allChilds = [];
    var balloonsTohighlight = [];
    var propsToLoad = ['aqc0PMICharacteristicsUid', 'Aqc0LinkToPartReference'];

    if (eventData.selectedUids && eventData.selectedUids.length > 0) {
        var selectedContext = ctx.selected;
        var ctxObj = ctx;
        if (/*ctx.selectedPart.uid === ctx.selected.uid &&*/ ctx.selected.type === 'ItemRevision') {
            selectedContext = ctx.pselected;
        }
        var vmObj = viewModelObjectService.createViewModelObject(selectedContext.props.awb0UnderlyingObject.dbValues[0]);
        var input = {
            inputData: {
                product: {
                    type: vmObj.type,
                    uid: vmObj.uid
                },
                requestPref:
                {
                    firstLevelOnly: ["false"]
                }
            }
        };
        soaSvc.post('Internal-ActiveWorkspaceBom-2022-06-OccurrenceManagement', 'getOccurrences4', input
        ).then(function (response) {
            if (response.parentChildrenInfos[0].childrenInfo &&
                response.parentChildrenInfos[0].childrenInfo.length > 0) {
                for (var i = 0; i < response.parentChildrenInfos[0].childrenInfo.length; i++) {
                    var child = response.parentChildrenInfos[0].childrenInfo[i].occurrence;
                    allChilds.push(response.parentChildrenInfos[0].childrenInfo[i].occurrence);
                }
                for (var i = 0; i < allChilds.length; i++) {
                    var child = allChilds[i];
                    // We directly want to look for Mci0PMI but getOcuurance3 soa restricts the filtering of Mci0PMI object
                    // So currently we are dealing with insp def object to collect imported PMI char uid.
                    if (child.type === 'Aqc0QcElement') {
                        var inspVMO = viewModelObjectService.createViewModelObject(allChilds[i].props.awb0UnderlyingObject.dbValues[0]);
                        propsToLoad = ruleNCCondUtils._toPreparePropstoLoadData(inspVMO, propsToLoad);
                        inspDefs.push(inspVMO.uid);
                    }
                }
                if (inspDefs.length > 0 && propsToLoad.length > 0) {
                    dms.getProperties(inspDefs, propsToLoad).then(function () {
                        _setCharUIDOfImpPMI(inspDefs, ctx, data);

                    });
                }
                else if (inspDefs.length > 0 && propsToLoad.length === 0) {
                    _setCharUIDOfImpPMI(inspDefs, ctx, data);
                }
                else {
                    //Prepare and Render the BCT Inspector based on view mode selection.
                    acp0BCTInspCompRenderService.getProjectAndRenderBCTInspViewer(ctx, data);
                }
            } else {
                //Prepare and Render the BCT Inspector based on view mode selection.
                acp0BCTInspCompRenderService.getProjectAndRenderBCTInspViewer(ctx, data);
            }
        })
            .catch(function (exception) {
                logger.error(exception);
            });
    }
};

/*
 *This Function set the characteristics UID for already Imported PMI
 */
function _setCharUIDOfImpPMI(inspDefs, ctx, data) {
    var balloonsTohighlight = [];
    inspDefs.forEach(uid => {
        var inspObj = cdm.getObject(uid);
        //var partFromWherePMISImported = inspObj.props.Aqc0LinkToPartReference.dbValues[0];
        //if(partFromWherePMISImported === ctx.selectedPart.uid){
        balloonsTohighlight.push(inspObj.props.aqc0PMICharacteristicsUid.dbValues[0]);
        //}
    });
    if (balloonsTohighlight && balloonsTohighlight.length > 0) {
        ctx.charUidOfImpPMI = balloonsTohighlight;
    }
    //Prepare and Render the BCT Inspector based on view mode selection.
    acp0BCTInspCompRenderService.getProjectAndRenderBCTInspViewer(ctx, data);
}

/**
 * This method to get pref PSE_default_view_type value
 */
export let readDefaultPSEViewTypeForPMI = function () {
    if (!_mprefPSEdefaultviewtypeValue) {
        preferenceSvc.getStringValue(_mprefPSEdefaultviewtype).then(function (result) {
            if (result !== '' && result !== null) {
                _mprefPSEdefaultviewtypeValue = result;
            } else {
                _mprefPSEdefaultviewtypeValue = 'view';
            }
            appCtxService.ctx.viewMci0PMIObjectSet = _mprefPSEdefaultviewtypeValue + '.Mci0PMI';
            eventBus.publish('Acp0.getPartForDirectRenderingInPMITab');
        });
    } else {
        eventBus.publish('Acp0.getPartForDirectRenderingInPMITab');
    }
};

/*
 * To get Referenced part from Inspection definition in PMI Tab
 */
export let getPartFromSearchResultsAndRenderDrawing = function (searchResultsForPartList, data) {
    var ctx = appCtxService.ctx;
    ctx.selectedPart = undefined;
    if (searchResultsForPartList[0]) {
        var mci0PMIObj = searchResultsForPartList[0] ? cdm.getObject(searchResultsForPartList[0].props.awp0Secondary.dbValues[0]) : undefined;
        ctx.selectedPart = cdm.getObject(mci0PMIObj.props.mci0PMIReferencePart.dbValues[0]);
        ctx.inspCombineViewMode = false;
        ctx.inspDrawingViewMode = true;
        ctx.inspTableViewMode = false;
        ctx.charUidOfImpPMI = [mci0PMIObj.props.mci0PMICharacteristicsUid.dbValues[0]];
        //As part of direct drawing rendering in PMI tab on deselection /cleare selection also drawing should be rendered
        _selectedPartForDirectDrawing = ctx.selectedPart;
        _charUidsOfImpPMIForDirectDrawing = ctx.charUidOfImpPMI;
        //Prepare and Render the BCT Inspector based on view mode selection.
        acp0BCTInspCompRenderService.getProjectAndRenderBCTInspViewer(ctx, data);
    }
};

/*
 * To read the preference and preference values
 */
export let getPreferenceValues = function (prefNames) {
    var prefPromise = preferenceSvc.getStringValues(prefNames);
    if (prefPromise) {
        prefPromise.then(function (prefValues) {
            if (!prefValues) {
                return _mprefValueForTolarence = 'Relative';
            }
            return _mprefValueForTolarence = prefValues[0];
        });
    } else {
        return _mprefValueForTolarence = 'Relative';
    }
};

// Method to check the version support
export let getSupportedTCVersion = function () {
    var tcMajor = tcSessionData.getTCMajorVersion();
    var tcMinor = tcSessionData.getTCMinorVersion();
    // tc 13.1 onwards supported
    if (tcMajor === 13 && tcMinor >= 1 || tcMajor > 13) {
        appCtxService.ctx.isTC13_1OnwardsSupported = true;
    } else {
        appCtxService.ctx.isTC13_1OnwardsSupported = false;
    }
    //tc 13.0 onwards/AW5.2_13X support
    //get Aw Server version
    var awServerVersion = awSvrVer.baseLine;
    awServerVersion = awServerVersion.split('x')[0];
    if (awServerVersion >= 'aw5.2.0.13') {
        appCtxService.ctx.isAW13X_OnwardsSupported = true;
    } else {
        appCtxService.ctx.isAW13X_OnwardsSupported = false;
    }
};

/*
 * @param {Object} ctx context Object
 * @param {Object} data from declarative view model
 */
export let callBCTServiceToGetReduceIpxml = function (ctx, data) {
    //Version check required as import PMI itk implementation changed from tc13.1 onwards, It impacts the import PMI SOA input
    if (appCtxService.ctx.isTC13_1OnwardsSupported === undefined) {
        exports.getSupportedTCVersion();
    }
    //Based on version check import PMI SOA inputs changes to process the import PMI functinality.
    appCtxService.ctx.isTC13_1OnwardsSupported === false ? exports.callBCTServiceToGetReduceIpxml_TCVersionBackPortSupport(ctx, data) : callSOAForimportPMIInControlPlanStruct(appCtxService.ctx,
        data);
};

/*
 * To support functionality AW5.2 + tc13.0 or applicable prior versions. Its backport Support.
 * @param {Object} ctx context Object
 * @param {Object} data from declarative view model
 */
export let callBCTServiceToGetReduceIpxml_TCVersionBackPortSupport = function (ctx, data) {
    // To create Map of charUIdBalloonObject
    var charUIdBalloonObjectMap = new Map();
    var CharUIdReduceIpxmlFileStringMap = new Map();
    if (ctx.bctInspSelection) {
        for (var sc = 0; sc < ctx.bctInspSelection.length; sc++) {
            var selectedBalloon = ctx.bctInspSelection[sc];
            if (selectedBalloon) {
                //To fix customer specific data that colum "K2504" should have value 2 to create PMI object
                if (selectedBalloon.props.get('K2504') !== '2') {
                    selectedBalloon.props.set('K2504', '2');
                }
                charUIdBalloonObjectMap.set(selectedBalloon.id, selectedBalloon);
            }
        }
    }
    //Call BCT service API for to get reduce ipxml as string.
    var charToIpxmlInput = {
        itemId: ctx.selectedPart.props.item_id.dbValues[0],
        itemRevisionId: ctx.selectedPart.props.item_revision_id.dbValues[0],
        characteristics: charUIdBalloonObjectMap
    };
    acp0BCTInspUtilService.characteristicToIPXML(charToIpxmlInput).then(values => {
        for (var each of values.entries()) {
            CharUIdReduceIpxmlFileStringMap.set(each[0], each[1]);
        }
        ctx.CharUIdReduceIpxmlFileStringMapInContext = CharUIdReduceIpxmlFileStringMap;
        callSOAForimportPMIInControlPlanStruct(appCtxService.ctx, data);
    });
};

/*
 * @param {Object} ctx context Object
 */
export let importPmiInControlPlanStructInput = function (ctx) {
    //Process the BCT Inspector selection event data to Import PMI
    var importPmiInControlPlanStructInputs = [];
    if (ctx.bctInspSelection) {
        for (var sc = 0; sc < ctx.bctInspSelection.length; sc++) {
            var importPmiInControlPlanStructInput = {
                createcharInput: {
                    boName: 'String',
                    stringProps: {},
                    boolArrayProps: {},
                    tagProps: {},
                    tagArrayProps: {},
                    stringArrayProps: {},
                    doubleProps: {},
                    doubleArrayProps: {},
                    floatProps: {},
                    floatArrayProps: {},
                    intProps: {},
                    intArrayProps: {},
                    boolProps: {}
                },
                bctCharUID: ''
            };
            var qc0LowerTolerance;
            var qc0UpperTolerance;
            var qc0LowerToleranceString = '';
            var qc0UpperToleranceString = '';
            var mci0IsAbsolutePMI;
            var qc0ToleranceType;
            var selectedBalloon = ctx.bctInspSelection[sc];
            if (selectedBalloon) {
                // When we create ipxml file through workflow then in this ipxml file keys are not added if no value
                // exists corresponding to it, In such case we need to set required key with defult value.
                // Set default value for required keys if corresponding value is missing on selected balloon.
                const numKeys = ['K2101', 'K2110', 'K2111', 'K2112', 'K2113'];
                for (var keyIndex = 0; keyIndex < numKeys.length; keyIndex++) {
                    if (!selectedBalloon.props.get(numKeys[keyIndex])) {
                        selectedBalloon.props.set(numKeys[keyIndex], '0');
                    }
                }
                const textKeys = ['B2005', 'B2009'];
                for (var keyIndex = 0; keyIndex < textKeys.length; keyIndex++) {
                    if (!selectedBalloon.props.get(textKeys[keyIndex])) {
                        selectedBalloon.props.set(textKeys[keyIndex], '');
                    }
                }
                if (!selectedBalloon.props.get('K2504')) {
                    selectedBalloon.props.set('K2504', '2');
                }

                //Based on tolerance type preparing the input
                switch (_mprefValueForTolarence) {
                    case 'Relative':
                        qc0LowerTolerance = Number(selectedBalloon.props.get('K2112'));
                        qc0UpperTolerance = Number(selectedBalloon.props.get('K2113'));
                        qc0LowerToleranceString = selectedBalloon.props.get('K2112').toString();
                        qc0UpperToleranceString = selectedBalloon.props.get('K2113').toString();
                        mci0IsAbsolutePMI = 'False';
                        qc0ToleranceType = _mprefValueForTolarence;
                        break;
                    case 'Absolute':
                        qc0LowerTolerance = Number(selectedBalloon.props.get('K2110'));
                        qc0UpperTolerance = Number(selectedBalloon.props.get('K2111'));
                        qc0LowerToleranceString = selectedBalloon.props.get('K2110').toString();
                        qc0UpperToleranceString = selectedBalloon.props.get('K2111').toString();
                        mci0IsAbsolutePMI = 'True';
                        qc0ToleranceType = _mprefValueForTolarence;
                        break;
                    default:
                    //Nothing to do
                }
                var bctCharUId = selectedBalloon.id;
                //Start to create input for acp0 importPmi Soa
                importPmiInControlPlanStructInput.bctCharUID = bctCharUId;
                //This check is for deciding type of characteristics.Value of K2009 is in between 200-203 then its "Qc0VariableCharSpec" otherwise "Qc0AttributiveCharSpec"
                var K2009ColValue = Number(selectedBalloon.props.get('K2009'));
                var charType;
                //Added OR condition to full fill the requirement 'LCS-578384 - Support Geometrical tolerances as a part of Variable Chx while importing PMI'.
                if (K2009ColValue >= 200 && K2009ColValue <= 203 || K2009ColValue >= 100 && K2009ColValue <= 122) {
                    charType = 'Qc0VariableCharSpec';
                } else {
                    charType = 'Qc0AttributiveCharSpec';
                }
                importPmiInControlPlanStructInput.createcharInput.boName = charType;
                //Passing selected Part uid to support Inspection Definition naming pattern.'LCS-555523 - Inspection Definition Naming to generic'.
                importPmiInControlPlanStructInput.createcharInput.stringProps.selectedPartUid = ctx.selectedPart.uid;
                //importPmiInControlPlanStructInput.createcharInput.stringProps.object_name = ''; //if required then add
                importPmiInControlPlanStructInput.createcharInput.stringProps.object_desc = selectedBalloon.props.get('B2009');
                importPmiInControlPlanStructInput.createcharInput.intProps.qc0BasedOnId = 1;
                importPmiInControlPlanStructInput.createcharInput.stringProps.qc0Context = 'Product';
                importPmiInControlPlanStructInput.createcharInput.stringProps.qc0Criticality = selectedBalloon.props.get('B2005');
                if (!selectedBalloon.props.get('B2005')) {
                    importPmiInControlPlanStructInput.createcharInput.stringProps.qc0Criticality = 'Minor';
                }
                if (charType === 'Qc0VariableCharSpec') {
                    //Values comming form BCT  for this attribute is not match(Some times empty) TC LOV Values so made modification for proper input
                    switch (selectedBalloon.props.get('K2142')) {
                        case 'MM':
                            importPmiInControlPlanStructInput.createcharInput.stringProps.qc0UnitOfMeasure = 'qc-mm';
                            break;

                        case 'CM':
                            importPmiInControlPlanStructInput.createcharInput.stringProps.qc0UnitOfMeasure = 'qc-cm';
                            break;

                        case 'M':
                            importPmiInControlPlanStructInput.createcharInput.stringProps.qc0UnitOfMeasure = 'qc-m';
                            break;

                        case 'FT':
                            importPmiInControlPlanStructInput.createcharInput.stringProps.qc0UnitOfMeasure = 'qc-ft';
                            break;

                        case 'IN':
                            importPmiInControlPlanStructInput.createcharInput.stringProps.qc0UnitOfMeasure = 'qc-in';
                            break;

                        default:
                            importPmiInControlPlanStructInput.createcharInput.stringProps.qc0UnitOfMeasure = 'qc-cm';
                    }
                    importPmiInControlPlanStructInput.createcharInput.doubleProps.qc0NominalValue = Number(selectedBalloon.props.get('K2101'));
                    importPmiInControlPlanStructInput.createcharInput.doubleProps.qc0LowerTolerance = qc0LowerTolerance;
                    importPmiInControlPlanStructInput.createcharInput.doubleProps.qc0UpperTolerance = qc0UpperTolerance;
                    importPmiInControlPlanStructInput.createcharInput.doubleProps.qc0LowerAllowance = qc0LowerTolerance;
                    importPmiInControlPlanStructInput.createcharInput.doubleProps.qc0UpperAllowance = qc0UpperTolerance;
                    importPmiInControlPlanStructInput.createcharInput.stringProps.qc0ToleranceType = qc0ToleranceType;
                }
                if (charType === 'Qc0AttributiveCharSpec') {
                    importPmiInControlPlanStructInput.createcharInput.stringProps.qc0OkDescription = selectedBalloon.props.get('B2005');
                    importPmiInControlPlanStructInput.createcharInput.stringProps.qc0NokDescription = '';
                }
                //For single SOA call we dont need to cache the selection and ballon object against the BCT CHX_UID..
                //Passing the reduce ipxmlFile as a string in the form of String property as currently(AW5.0) we dont have input of soa as map<'string',balloonObject>
                if (appCtxService.ctx.isTC13_1OnwardsSupported === false) {
                    importPmiInControlPlanStructInput.createcharInput.stringProps.bctCharInfo = ctx.CharUIdReduceIpxmlFileStringMapInContext.get(bctCharUId);
                }
                if (appCtxService.ctx.isTC13_1OnwardsSupported === true) {
                    var mci0ChangeStatusText = [ selectedBalloon.props.get( 'K2504' ).toString() ];
                    //Check the actually prop values which are changed by ignoring "k2504" status column value
                    if (mci0ChangeStatusText !== '1' && acp0BCTInspCompRenderService._mUpdatedImportedPMICharUId && acp0BCTInspCompRenderService._mUpdatedImportedPMICharUId.indexOf(bctCharUId) !== -1) {
                        mci0ChangeStatusText = ['1'];
                    }
                    importPmiInControlPlanStructInput.createcharInput.stringProps.bctCharInfo = '';
                    //Set the data for PMI creation and to find char group using rule condition.
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0NominalValue = [selectedBalloon.props.get('K2101').toString()];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0IsAbsolutePMI = [mci0IsAbsolutePMI];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0UpperSpecLimit = [qc0UpperToleranceString];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0LowerSpecLimit = [qc0LowerToleranceString];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0DimensionType = [selectedBalloon.props.get('B2009')];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0ChangeStatusText = mci0ChangeStatusText;
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0BCTUniqueObjHandle = [selectedBalloon.props.get('BCT_UNIQUE_OBJ_HANDLE')];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0PMICharacteristicsUid = [bctCharUId];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0PmiID = [selectedBalloon.props.get('K2002')];
                    importPmiInControlPlanStructInput.createcharInput.stringArrayProps.mci0PMIReferencePart = [ctx.selectedPart.uid];
                }
                importPmiInControlPlanStructInputs.push(importPmiInControlPlanStructInput);
            }
        }
    }
    return importPmiInControlPlanStructInputs;
};
/*
 * @param {Object} ctx context Object
 */
export let getContextObject = function (ctx) {
    var contextObject = ctx.selected;
    if (contextObject.type !== 'Acp0ControlPlanElement' && contextObject.type !== 'Acp0InspOpElement' && contextObject.type !== 'Aqc0QcElement') {
        contextObject = ctx.pselected;
    }
    return contextObject;
};

export let getContextObjectUid = function (ctx) {
    var contextObject = getContextObject(ctx);
    return contextObject.props.awb0UnderlyingObject.dbValues[0];
};
/*
 * @param {Object} ctx context Object
 * @param {Object} data from declarative view model
 */
export let callSOAForimportPMIInControlPlanStruct = function (ctx, data) {
    var methodReturnInput = importPmiInControlPlanStructInput(ctx);
    var inputData = {
        importPMIInControlPlanStructInputs: methodReturnInput,
        contextObject: getContextObject(ctx),
        inspectionDefsIPXMLMap: [
            [],
            []
        ]
    };
    soaSvc.post('Internal-ControlPlan-2020-05-ControlPlanPmiImport', 'importPMIInControlPlanStruct', inputData).then(function (response) {
        if (response.createdPMIs) {
            var pmiNameList = getPMINameList(response.createdPMIs, data);
        } else if (response.ServiceData.partialErrors) {
            messagingSvc.showError(data.i18n.FailedToImportPMIs);
        }
        if (inputData.contextObject !== undefined) {
            eventBus.publish('cdm.relatedModified', {
                relatedModified: [
                    inputData.contextObject
                ]
            });
        }
        eventBus.publish('aceSecondaryWorkArea.refreshTabs');
        eventBus.publish('primaryWorkarea.reset');
        appCtxService.updateCtx( 'baseRevisionSelection', undefined );
        appCtxService.updateCtx('baseSelectedPart', undefined);
    }, function (error) {
        var errMessage = messagingSvc.getSOAErrorMessage(error);
        messagingSvc.showError(errMessage);
    })
        .catch(function (exception) {
            logger.error(data.i18n.FailedToImportPMIs);
            logger.error(exception);
        });
};
/*
 * @param {Object} createdPMIS context Object
 * @param {object} data object for read messages
 */
export let getPMINameList = function (createdPMIs, data) {
    var propsToLoad = [];
    var uids = [];
    for (var c = 0; c < createdPMIs.length; c++) {
        uids.push(createdPMIs[c].uid);
        if (!createdPMIs[c].props.bl_line_name) {
            propsToLoad.push('bl_line_name');
        }
    }
    if (propsToLoad.length > 0) {
        dms.getProperties(uids, propsToLoad)
            .then(
                function () {
                    self.preparePMINameList(createdPMIs, data);
                }
            );
    } else {
        self.preparePMINameList(createdPMIs, data);
    }
};
/*
 * @param {Object} createdPMIS context Object
 * @param {object} data object for read messages
 */
self.preparePMINameList = function (createdPMIs, data) {
    var pmiNameList = '';
    for (var c = 0; c < createdPMIs.length; c++) {
        var createdPMIsName = createdPMIs[c].props.bl_line_name.dbValues[0];
        // Changes as part of LCS-528108 - I18N: Enhancement request - the message is easy to understand
        createdPMIsName = createdPMIsName.replace('}}', ')').replace('{{', ' (');
        if (c !== createdPMIs.length - 1) {
            pmiNameList = pmiNameList + createdPMIsName + ', ';
        } else {
            pmiNameList += createdPMIsName;
        }
    }
    if (createdPMIs && createdPMIs.length > 0) {
        if (createdPMIs.length === appCtxService.ctx.bctInspSelection.length && data.i18n.AllImportedPMIs) {
            var message = data.i18n.AllImportedPMIs.replace('{0}', pmiNameList);
            messagingSvc.showInfo(message);
        } else {
            var message = data.i18n.PartiallyImportedPMIs.replace('{0}', pmiNameList);
            messagingSvc.showInfo(message);
        }
    }
    return pmiNameList;
};

/*
 * @param {Object} ctx context view model
 * @param {object} data object for read required information
 * @param {string} inspViewMode object for read required information
 */
export let setRefPartsViewMode = function (ctx, data, partToInspspectView) {
    ctx.refPartListView = false;
    ctx.refPartTableView = false;
    switch (partToInspspectView) {
        case data.i18n.Acp0RefPartsListViewTitle:
            ctx.refPartListView = true;
            break;
        case data.i18n.Acp0RefPartsTableViewTitle:
            ctx.refPartTableView = true;
            break;
        default:
            ctx.refPartListView = true;
    }
};

/*
 * @param {Object} ctx context view model
 * @param {object} data object for read required information
 */
export let showHidePartsListPanel = function (ctx, data) {
    appCtxService.updateCtx('showReferencePartList', !ctx.showReferencePartList);
    if (ctx.showComparePartRevisionsList) {
        //Reset the impacted values based on switchig the panels
        appCtxService.updateCtx('showComparePartRevisionsList', false);
        appCtxService.updateCtx('baseRevisionSelection', undefined);
        appCtxService.updateCtx('baseSelectedPart', undefined);
    }
    ctx.selectedPart = undefined;
    if (data.dataProviders) {
        data.dataProviders.partListProvider.selectNone();
        data.dataProviders.refPartsProvider.selectNone();
    }
    if (ctx.showReferencePartList === false) {
        eventBus.publish('Acp0.callPartListDataProvider');
    }
};

/*
 * Manage visibility of Compare Part Revision Panel.
 */
export let renderAcp0ComparePartRevisionsPanel = function( dataI18n ) {
    //Check to reduce dataprovider call if the Compare Part revision panel is up and user triggers the command on same panel
    if (!appCtxService.ctx.showComparePartRevisionsList) {
        appCtxService.updateCtx('showComparePartRevisionsList', true);
        appCtxService.updateCtx('showReferencePartList', false);
        eventBus.publish('Acp0.getPartItemTagFromSelectedPartRev');
    }
    //Update Base revision Selection change
    appCtxService.updateCtx('baseRevisionSelection', appCtxService.ctx.projectToRenderBctComponent);
    appCtxService.updateCtx( 'baseSelectedPart', appCtxService.ctx.selectedPart );
    //Due to async call for getting project data below block is important based on value check
    if ( !appCtxService.ctx.baseRevisionSelection && appCtxService.ctx.selectedPart ) {
        //Get Project as an input of inspector view to compare with base selected revision
        acp0BCTInspUtilService.getPartAttachmentProject( appCtxService.ctx.baseSelectedPart.uid, dataI18n ).then( values => {
            appCtxService.updateCtx( 'baseRevisionSelection', values.project );
        } );
    }
};

/*
 * To get the Item tag Uid from selected Part revision(Item Revision)
 */
export let getPartItemTagFromSelectedPartRev = function () {
    var partItemTag = appCtxService.ctx.selectedPart;
    return partItemTag.props.items_tag.dbValues[0];
};
/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 * @param {Object} data - the data
 * @returns {boolean} promise.
 */
export let loadColumns = function (data, dataprovider) {
    var colInfos = [];
    if (_mapOfColPropNameAndDisplayNameForRefPart.size === 0) {
        _mapOfColPropNameAndDisplayNameForRefPart.set('object_name', data.i18n.Acp0ObjectName);
        _mapOfColPropNameAndDisplayNameForRefPart.set('item_id', data.i18n.Acp0ItemId);
        _mapOfColPropNameAndDisplayNameForRefPart.set('object_desc', data.i18n.Acp0ObjectDesc);
        _mapOfColPropNameAndDisplayNameForRefPart.set('object_type', data.i18n.Acp0ItemRevisionType);
    }
    if (_mapOfColPropNameAndDisplayNameForRefPart.size > 0) {
        _mapOfColPropNameAndDisplayNameForRefPart.forEach(function (colPropDisplay, colPropName, map) {
            colInfos.push(_getColumnInfoForRespectivePropColumn(colPropName, colPropDisplay, data));
        });
    }
    dataprovider.columnConfig = {
        columns: colInfos
    };

    var deferred = AwPromiseService.instance.defer();

    deferred.resolve({
        columnInfos: colInfos
    });
    return deferred.promise;
};

/*
 *This Function returns the column info for respective column property
 */
function _getColumnInfoForRespectivePropColumn(colPropName, colPropDisplay, data) {
    return {
        name: colPropName,
        typeName: 'ItemRevision',
        displayName: colPropDisplay,
        maxWidth: 400,
        minWidth: 40,
        width: 120,
        enableColumnMenu: true,
        enableColumnMoving: true,
        enableColumnResizing: true,
        enableSorting: true,
        headerTooltip: true
    };
}

export default exports = {
    callBCTServiceToGetReduceIpxml,
    callBCTServiceToGetReduceIpxml_TCVersionBackPortSupport,
    callSOAForimportPMIInControlPlanStruct,
    getContextObject,
    getContextObjectUid,
    getPartCharacteristics,
    getPartFromSearchResultsAndRenderDrawing,
    getPartItemTagFromSelectedPartRev,
    getPMINameList,
    getPreferenceValues,
    getSupportedTCVersion,
    highlightImportedBalloons,
    importPmiInControlPlanStructInput,
    loadColumns,
    readDefaultPSEViewTypeForPMI,
    renderAcp0ComparePartRevisionsPanel,
    setRefPartsViewMode,
    showHidePartsListPanel
};
/**
 *
 * @memberof NgServices
 * @member Acp0BCTService
 */
app.factory('Acp0BCTService', () => exports);

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which service
 * should be injected to provide the API for this module.
 */
export let moduleServiceNameToInject = 'Acp0BCTService';
