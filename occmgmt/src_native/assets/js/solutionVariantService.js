//@<COPYRIGHT>@
//==================================================
//Copyright 2020.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/solutionVariantService
 */
import app from 'app';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import appCtxSvc from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import AwStateService from 'js/awStateService';
import cdm from 'soa/kernel/clientDataModel';
import dataManagementSvc from 'soa/dataManagementService';
import localeService from 'js/localeService';
import LocationNavigationService from 'js/locationNavigation.service';
import occmgmtBackingObjProviderSvc from 'js/occmgmtBackingObjectProviderService';
import occmgmtPropertyPolicyService from 'js/occmgmtPropertyPolicyService';
import occMgmtStateHandler from 'js/occurrenceManagementStateHandler';
import occmgmtTreeTableDataService from 'js/occmgmtTreeTableDataService';
import occmgmtUpdatePwaDisplayService from 'js/occmgmtUpdatePwaDisplayService';
import uwPropertyService from 'js/uwPropertyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import soaSvc from 'soa/kernel/soaService';

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};
let _contentUnloadedListener = null;
let _updateUrlFromCurrentStateEventSubscription = null;

/**
 * Get state params
 * This should handle selected as well as refresh URL case
 * @returns {Object} returns object having url UID information
 */
let getStateParams = function () {
    let toParams = {};
    let stateParams = appCtxSvc.getCtx("state.params");
    toParams.pci_uid = stateParams.pci_uid;

    let selectedObj = appCtxSvc.getCtx("selected");
    if (selectedObj && !_.isUndefined(selectedObj.props) && !_.isUndefined(selectedObj.props.awb0Archetype)) {
        //This means Solution Variant button is clicked inside ACE ( no URL refresh)
        toParams.t_uid = stateParams.uid; //current root becomes product for SV Preview
        toParams.uid = selectedObj.props.awb0Archetype.dbValues[0]; //current selection's ItemRev becomes new root for SV Preview
    } else {
        //URL refresh case    
        toParams.uid = stateParams.uid;
        toParams.t_uid = stateParams.t_uid;
    }
    return toParams;
};

/**
 * This method maintains appCtx with commands that need to hidden inside SV Preview UI
 */
let updateHiddenCommandContext = function () {
    let hiddenCommands = {};
    hiddenCommands.Awb0ConfigurationGroup = true;
    hiddenCommands.Awb0ResetStructure = true;
    hiddenCommands.Arm0ImportExcel = true;
    hiddenCommands.Arm0Export = true;
    hiddenCommands.Arm0ExportImport = true;
    appCtxSvc.updatePartialCtx('hiddenCommands', hiddenCommands);
};

/**
 * Unregister event listeners
 */
let unRegisterListeners = function () {
    if (_contentUnloadedListener) {
        eventBus.unsubscribe(_contentUnloadedListener);
        _contentUnloadedListener = null;
    }
    if (_updateUrlFromCurrentStateEventSubscription) {
        eventBus.unsubscribe(_updateUrlFromCurrentStateEventSubscription);
        _updateUrlFromCurrentStateEventSubscription = null;
    }
};

/**
 * Register event listeners
 */
let registerListeners = function () {
    // Register Page Unload listener
    if (!_contentUnloadedListener) {
        _contentUnloadedListener = eventBus.subscribe('solutionVariantPage.contentUnloaded', cleanupSVContext, 'solutionVariantService');
    }
    if (!_updateUrlFromCurrentStateEventSubscription) {
        _updateUrlFromCurrentStateEventSubscription = eventBus.subscribe("appCtx.update", function (event) {
            if (event.name === "SVContext" && event.target === "currentState") {
                updateUrlFromCurrentState(event.name);
            }
        });
    }
};

let createBOMLineVariantRuleInput = function (bomLineUid) {
    let inputData = {
        bomLine: {
            uid: bomLineUid
        },
        validate: true,
        saveVariantRule: true,
        checkCompleteness: true
    };
    return inputData;
};

let populateSVInputConfigParams = function () {
    let currProductContextInfo = appCtxSvc.getCtx('aceActiveContext.context').productContextInfo;
    let currentRevRule = currProductContextInfo.props.awb0CurrentRevRule.dbValues[0];
    let effDate = currProductContextInfo.props.awb0EffDate.dbValues[0];
    let effEndItem = currProductContextInfo.props.awb0EffEndItem.dbValues[0];
    let effUnitNo = currProductContextInfo.props.awb0EffUnitNo.dbValues[0];
    let effectivityGroups = currProductContextInfo.props.awb0EffectivityGroups.dbValues[0];
    let startEffDates = currProductContextInfo.props.awb0StartEffDates.dbValues[0];
    let startEffUnits = currProductContextInfo.props.awb0StartEffUnits.dbValues[0];
    let endEffDates = currProductContextInfo.props.awb0EndEffDates.dbValues[0];
    let endEffUnits = currProductContextInfo.props.awb0EndEffUnits.dbValues[0];

    let _configParams = {
        currentRevRule: currentRevRule,
        effDate: effDate,
        effEndItem: effEndItem,
        effUnitNo: effUnitNo,
        effectivityGroups: effectivityGroups,
        startEffDates: startEffDates,
        startEffUnits: startEffUnits,
        endEffDates: endEffDates,
        endEffUnits: endEffUnits
    };
    appCtxSvc.updatePartialCtx('aceActiveContext.context.svConfigParams', _configParams);
};

/**
 * Async function to get the backing object's for input viewModelObject's.
 * viewModelObject's should be of type Awb0Element.
 * @param {Object} viewModelObjects - of type Awb0Element
 * @return {Promise} A Promise that will be resolved with the requested backing object's when the data is available.
 *
 */
export let getBOMLineUid = function (viewModelObjects) {
    let deferred = AwPromiseService.instance.defer();
    occmgmtBackingObjProviderSvc.getBackingObjects([viewModelObjects]).then(function (response) {
        return deferred.resolve(response[0].uid);
    });
    return deferred.promise;
};

/**
 * This method performs open action for showObjectCellCommand for ACE
 */
export let openSolutionVariant = function (objToOpen, page, pageId) {
    let transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
    let toParams = {};
    toParams.page = page;
    toParams.pageId = pageId;

    let options = {
        inherit: false
    };
    toParams.uid = objToOpen;
    AwStateService.instance.go(transitionTo, toParams, options);
};

export let getMultiLevelSVCreateInput = function (rootUid, dryRunOption) {
    let variantRuleUid = appCtxSvc.getCtx('aceActiveContext.context.productContextInfo').props.awb0CurrentVariantRule.dbValues[0];
    let runInBackground = appCtxSvc.getCtx('aceActiveContext.context.runInBackground');
    let _configPreferences = {
        StopOnError: "0",
        DryRun: dryRunOption,
        NumberOfLinesToProcess: "0",
        allLevel: "1"
    };

    if (runInBackground) {
        _configPreferences.runInBackground = "1";
    }

    let inputData = {
        createMultilevelSVInputList: [{
            createSVItemInput: {
                genericBOMLine: {
                    uid: rootUid
                },
                createSVItemInfo: {
                    svCategoryType: 2,
                    createSVItemDesc: {
                        boName: ""
                    }
                }
            },
            mappedSVBOMLineUID: "",
            bomLineLevel: 0
        }],
        createMultilevelSVConfigParam: {
            pcaVariantRule: {
                uid: variantRuleUid
            },
            configPreferences: _configPreferences
        }
    };
    return inputData;
};

export let createMultiLevelSolutionVariantInput = function (runInBackground) {
    // User selection in ACE will be opened as topElement in SV Preview.
    // This topElement should be sent as input for SV creation.
    if (!_.isUndefined(runInBackground)) {
        appCtxSvc.updatePartialCtx('aceActiveContext.context.runInBackground', true);
    }
    appCtxSvc.updatePartialCtx('aceActiveContext.context.disabledButtonChk', true);
    let viewModelObjects = appCtxSvc.getCtx('aceActiveContext.context.topElement');
    getBOMLineUid(viewModelObjects).then(function (response) {
        let inputData = getMultiLevelSVCreateInput(response, "0");
        appCtxSvc.updatePartialCtx('aceActiveContext.context.createSVInput', inputData);
        eventBus.publish('invokeCreateSVSoa');
    });
};

export let postProcessSearchSVResponse = function (eventData) {
    let aceActiveContext = appCtxSvc.getCtx('aceActiveContext.context');
    if (aceActiveContext && (!_.isUndefined(aceActiveContext.rootSVExists))) {
        delete aceActiveContext.rootSVExists;
    }
    if (eventData.searchSVItemOutputList && eventData.searchSVItemOutputList.length > 0) {
        let responseObj = eventData.searchSVItemOutputList[0];
        if (responseObj.intialSVItemOutputList && responseObj.intialSVItemOutputList.length > 0) {
            appCtxSvc.updatePartialCtx('aceActiveContext.context.rootSVItemRev', responseObj.intialSVItemOutputList[0].svItemRev.uid);
            appCtxSvc.updatePartialCtx('aceActiveContext.context.rootSVExists', true);
        } else {
            exports.launchSolutionVariantPage();
        }
    }
};

export let getSVPreviewHeaderInfo = function (data) {
    let revisionRule = {};
    aceStructureConfigurationService.populateContextKey(data);
    let currentRevisionRule = appCtxSvc.getCtx('aceActiveContext.context').productContextInfo.props.awb0CurrentRevRule;
    if (currentRevisionRule) {
        revisionRule = uwPropertyService.createViewModelProperty(currentRevisionRule.dbValues[0],
            currentRevisionRule.uiValues[0], 'STRING', currentRevisionRule.dbValues[0], currentRevisionRule.uiValues);
    }
    return revisionRule;
};

export let updateUrlFromCurrentState = function (contextKey) {
    let pci_uid = appCtxSvc.getCtx(contextKey).productContextInfo.uid;
    let toParams = {
        pci_uid: pci_uid
    };
    AwStateService.instance.go(AwStateService.instance.current.name, toParams);
};

/**
 * This method uses state params to transition to SV Preview UI
 */
export let launchSolutionVariantPage = function () {
    let transitionTo = 'solutionVariantPreview';
    let toParams = getStateParams();
    let options = {
        inherit: false
    };
    AwStateService.instance.go(transitionTo, toParams, options);
};

/**
 * This method initializes Solution Variant context to launch SV Preview UI
 * @returns {Object} returns model object to open as root in SV Preview UI
 */
export let loadModelObjToOpen = function () {
    let defer = AwPromiseService.instance.defer();

    let taskTitle;
    localeService.getLocalizedText("SolutionVariantConstants", "solutionVariantPreviewTaskTitle").then(function (result) {
        taskTitle = result;
    });

    let stateParams = appCtxSvc.getCtx("state.params");
    let uidsForLoadObject = [stateParams.uid, stateParams.pci_uid, stateParams.t_uid];

    dataManagementSvc.loadObjects(uidsForLoadObject).then(function () {
        let obj = cdm.getObject(uidsForLoadObject[0]);
        let result = {};
        result.modelObjs = [];
        if (obj) {
            result.modelObjs.push(obj);
        }

        let selectedObjString;
        if (obj && obj.modelType && taskTitle) {
            if (obj.modelType.typeHierarchyArray.indexOf("ItemRevision") > -1) {
                taskTitle = taskTitle.replace("{0}", obj.props.object_string.dbValues[0]);
                selectedObjString = obj.props.object_string.dbValues[0];
            } else {
                taskTitle = taskTitle.replace("{0}", obj.props.object_name.dbValues[0]);
                selectedObjString = obj.props.object_name.dbValues[0];
            }
        }

        let variantLabel;
        let productContextInfo = cdm.getObject(uidsForLoadObject[1]);
        if (productContextInfo && productContextInfo.props && productContextInfo.props.awb0CurrentVariantRule) {
            variantLabel = productContextInfo.props.awb0CurrentVariantRule.uiValues[0];
        }
        let topElement = cdm.getObject(uidsForLoadObject[2]);
        let topElementObjString = topElement.props.object_string.dbValues[0];

        let isProductBeingOpenedAsRoot = false;
        if (stateParams.uid === stateParams.t_uid) {
            //This means root product is being opened in SV Preview UI
            isProductBeingOpenedAsRoot = true;
        }
        let requestPref = {
            savedSessionMode: "ignore"
        };
        let configContext = {
            var_uid: appCtxSvc.getCtx("aceActiveContext.context.inputVariantRule"),
            r_uid: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.currentRevRule"),
            de: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.effDate"),
            ei_uid: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.effEndItem"),
            ue: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.effUnitNo"),
            eg_uids: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.effectivityGroups"),
            startDate: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.startEffDates"),
            fromUnit: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.startEffUnits"),
            endDate: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.endEffDates"),
            toUnit: appCtxSvc.getCtx("aceActiveContext.context.svConfigParams.endEffUnits")
        };

        appCtxSvc.registerCtx("SVContext", {
            currentState: {
                uid: stateParams.uid,
                pci_uid: stateParams.pci_uid,
                t_uid: stateParams.t_uid
            },
            requestPref: requestPref,
            configContext: configContext,
            showVariantsInOcc: false,
            startFreshNavigation: true,
            productContextInfo: productContextInfo,
            transientRequestPref: {},
            readOnlyFeatures: {},
            expansionCriteria: {},
            skipAutoBookmark: true,
            taskTitle: taskTitle,
            productTitle: topElementObjString,
            selectedObjString: selectedObjString,
            variantLabel: variantLabel,
            previousState: {},
            pwaSelectionModel: {},
            persistentRequestPref: {
                showExplodedLines: false
            },
            isProductBeingOpenedAsRoot: isProductBeingOpenedAsRoot,
            disabledButtonChk: false
        });
        defer.resolve(result);
    });
    return defer.promise;
};

/**
 * Clean up Solution Variant context upon exit from SV Preview UI
 */
export let cleanupSVContext = function () {
    appCtxSvc.unRegisterCtx('SVContext');
    appCtxSvc.unRegisterCtx('aceActiveContext');
    appCtxSvc.unRegisterCtx('modelObjectsToOpen');
    appCtxSvc.unRegisterCtx('hideRightWall');
    unRegisterListeners();
    occMgmtStateHandler.destroyOccMgmtStateHandler();
    occmgmtUpdatePwaDisplayService.destroy();
    occmgmtTreeTableDataService.destroy();
    aceStructureConfigurationService.destroy();
    occmgmtPropertyPolicyService.unRegisterPropertyPolicy();
    delete appCtxSvc.ctx.hiddenCommands;
    delete appCtxSvc.ctx.skipAutoBookmark;
    delete appCtxSvc.ctx.taskbarfullscreen;
};

export let postProcessSVCreateResponse = function (response) {
    if (response.ServiceData && response.ServiceData.modelObjects) {
        let rootItemRev = appCtxSvc.getCtx('aceActiveContext.context').currentState.uid;
        _.every(response.ServiceData.modelObjects, function (modelObj) {
            if (modelObj && modelObj.props && modelObj.props.Smc0SolutionVariantSource && modelObj.props.Smc0SolutionVariantSource.dbValues[0] === rootItemRev) {
                // This would be root Solution Variant model object
                appCtxSvc.updatePartialCtx('aceActiveContext.context.rootSVItemRev', modelObj.uid);
                return false; //break
            }
            return true; //continue
        });
        eventBus.publish('aceShowObjectForSV');
    }
};

export let openSourceStructure = function (page, pageId) {
    let transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
    let toParams = {};
    toParams.page = page;
    toParams.pageId = pageId;

    let options = {
        inherit: false
    };
    let stateParams = appCtxSvc.getCtx("state.params");
    toParams.uid = stateParams.uid;
    toParams.pci_uid = stateParams.pci_uid;

    AwStateService.instance.go(transitionTo, toParams, options);
};

export let initializeSVContext = function () {
    registerListeners();
    updateHiddenCommandContext();
    appCtxSvc.updatePartialCtx("hideRightWall", true);
    let SVContext = appCtxSvc.getCtx('SVContext');
    appCtxSvc.registerCtx("aceActiveContext", {
        key: "SVContext",
        context: SVContext
    });
    occMgmtStateHandler.initializeOccMgmtStateHandler();
    occmgmtUpdatePwaDisplayService.initialize();
    occmgmtTreeTableDataService.initialize();
    aceStructureConfigurationService.initialize();
    occmgmtPropertyPolicyService.registerPropertyPolicy();
};

export let getSubsetSVR = function () {
    let deferred = AwPromiseService.instance.defer();
    let viewModelObjects = appCtxSvc.getCtx('selected');
    getBOMLineUid(viewModelObjects).then(function (bomLineUid) {
        let inputData = createBOMLineVariantRuleInput(bomLineUid);
        soaSvc.postUnchecked('Internal-StructureManagement-2021-06-SolutionVariantManagement', 'createBOMLineVariantRule', inputData).then(
            function (response) {
                if (response.isValidAndComplete && !response.ServiceData.partialErrors) {
                    appCtxSvc.updatePartialCtx('aceActiveContext.context.isValidSVR', true);
                    appCtxSvc.updatePartialCtx('aceActiveContext.context.inputVariantRule', response.childVariantRule.uid);
                    populateSVInputConfigParams();

                } else {
                    //below will result in showing error message
                    appCtxSvc.updatePartialCtx('aceActiveContext.context.isValidSVR', false);
                }
                return deferred.resolve(response);
            });
    });
    return deferred.promise;
};

export let openSolutionVariantSuccessNotification = function (notificationObject) {
    dataManagementSvc.getProperties([notificationObject.object.uid]).then(
        function () {
            var srcUidToken = notificationObject.object.props.fnd0TargetObject.dbValues[0];
            var toParams = {};
            if (srcUidToken) {
                toParams = {
                    uid: srcUidToken,
                    page: 'Content',
                    pageId: 'tc_xrt_Content'
                };
            } else {
                toParams = {
                    uid: notificationObject.object.uid
                };
            }

            let openObjUid = appCtxSvc.getCtx( 'aceActiveContext.context.currentState.uid' );
            let sublocation = appCtxSvc.getCtx( 'sublocation.nameToken' );
            if( openObjUid && toParams.uid === openObjUid && sublocation && sublocation === 'com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' ) {
                // If the object we are opening is already opened in ACE then there is no need to navigate again.
                // Instead we can just reset the current ACE tree
                appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.startFreshNavigation',  true );
                eventBus.publish( 'acePwa.reset' );
            } else {
                var transitionTo = 'com_siemens_splm_clientfx_tcui_xrt_showObject';
                var options = {
                    inherit: false
                };
                LocationNavigationService.instance.go( transitionTo, toParams, options );
            }
        });
};

export default exports = {
    launchSolutionVariantPage,
    loadModelObjToOpen,
    getSVPreviewHeaderInfo,
    getBOMLineUid,
    openSolutionVariant,
    getMultiLevelSVCreateInput,
    postProcessSearchSVResponse,
    updateUrlFromCurrentState,
    createMultiLevelSolutionVariantInput,
    postProcessSVCreateResponse,
    cleanupSVContext,
    openSourceStructure,
    initializeSVContext,
    getSubsetSVR,
    openSolutionVariantSuccessNotification
};

/**
 * @memberof NgServices
 * @member solutionVariantService
 */
app.factory('solutionVariantService', () => exports);