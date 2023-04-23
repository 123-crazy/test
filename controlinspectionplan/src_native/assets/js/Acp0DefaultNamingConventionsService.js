// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@
/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Acp0DefaultNamingConventionsService
 */
import _ from 'lodash';
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import editHandlerService from 'js/editHandlerService';
import listBoxService from 'js/listBoxService';
import messagingService from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import acp0RuleNCCondition from 'js/Acp0RuleNCCondUtils';

var exports = {};
var saveEditHandler = {};
let invalidPropList = [];
var callSaveEditSoa = function (input) {
    return soaSvc.post('Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', input).then(
        function (response) {
            return response;
        },
        function (error) {
            var errMessage = messagingService.getSOAErrorMessage(error);
            messagingService.showError(errMessage);
            return error;
        }
    );
};

var createSaveEditSoaInput = function (dataSource) {
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsMap = dataSource.getModifiedPropertiesMap(modifiedViewModelProperties);

    var inputs = [];
    _.forEach(modifiedPropsMap, function (modifiedObj) {
        var modelObject;
        var viewModelObject = modifiedObj.viewModelObject;

        if (viewModelObject && viewModelObject.uid) {
            modelObject = cdm.getObject(viewModelObject.uid);
        }

        if (!modelObject) {
            modelObject = {
                uid: cdm.NULL_UID,
                type: 'unknownType'
            };
        }

        var viewModelProps = modifiedObj.viewModelProps;
        var input = dms.getSaveViewModelEditAndSubmitToWorkflowInput(modelObject);
        _.forEach(viewModelProps, function (props) {
            if (Array.isArray(props.sourceObjectLastSavedDate)) {
                props.sourceObjectLastSavedDate = props.sourceObjectLastSavedDate[0];
            }
            dms.pushViewModelProperty(input, props);
        });
        inputs.push(input);
    });
    return inputs;
};

/**
 * custom save handler save edits called by framework
 * @param {dataSource} dataSource of selected object
 * @returns {promise}
 **/
saveEditHandler.saveEdits = function (dataSource) {
    var deferred = AwPromiseService.instance.defer();
    var vmo = dataSource.getDeclViewModel().vmo;
    invalidPropList = getInvalidPropList(vmo);
    if (invalidPropList.length) {
        var errorMessage = appCtxService.ctx.Acp0invalidNCBErrorMsg;
        messagingService.showError(errorMessage);
        deferred.resolve({});
    } else {
        var input = {};
        input.inputs = createSaveEditSoaInput(dataSource);
        callSaveEditSoa(input).then(function () {
            deferred.resolve();
        }, function (error) {
            deferred.reject();
            throw error;
        });
    }
    return deferred.promise;
};

var getInvalidPropList = function (vmo) {
    var notNullPropList = [
        vmo.props.acp0DefaultVarNamingConv,
        vmo.props.acp0DefaultAttNamingConv,
        vmo.props.acp0DefaultVisNamingConv,
        vmo.props.object_name
    ];
    return notNullPropList.filter(function (propertyName) {
        return !propertyName.dbValue;
    });
};

/**
 * Returns dirty bit.
 * @param {dataSource} dataSource of selected object
 * @returns {Boolean} isDirty bit
 */
saveEditHandler.isDirty = function (dataSource) {
    var vmo = dataSource.getDeclViewModel().vmo;
    var invalidPropList = getInvalidPropList(vmo);
    if (invalidPropList.length) {
        return true;
    }
    return dataSource.getAllModifiedProperties().length;
};

export let getRuleSaveHandler = function () {
    return saveEditHandler;
};

/*
* To load the Naming Convention LOV Values.
*/
export let loadRequiredLOVValues = function (ctx, data) {
    var inputData = {
        searchInput: {
            maxToLoad: 50,
            maxToReturn: 50,
            providerName: 'Acp0CharsRulesAndNCProvider',
            searchCriteria: {
                type: 'Acp0NamingConvention',
                searchString: ''
            },
            searchSortCriteria: [
                {
                    fieldName: 'creation_date',
                    sortDirection: 'DESC'
                }
            ],
            startIndex: ''
        }
    };
    // SOA call made to get the content
    soaSvc.post('Internal-AWS2-2016-03-Finder', 'performSearch', inputData).then(function (response) {
        var namingConventions = response.searchResults;
        var validNamingConventions = [];
        for (var namingConvention of namingConventions) {
            var ncPropValue = namingConvention.props.acp0NamingConvention.dbValues[0];
            var sctPropValue = namingConvention.props.acp0SourceClassType.dbValues[0];
            if (ncPropValue && ncPropValue !== '' && sctPropValue && sctPropValue !== '') {
                validNamingConventions.push(namingConvention);
            }
        }
        data.NamingConvention = listBoxService.createListModelObjects(validNamingConventions, 'props.acp0NamingConvention');
    });
};


export let loadProperties = function (data) {
    var selectedObject = appCtxService.ctx.xrtSummaryContextObject;

    // list of list; containing object to check, if loadded, and internal property name
    var requiredPropsListOfList = [
        [selectedObject.props.acp0DefaultVarNamingConv, 'acp0DefaultVarNamingConv'],
        [selectedObject.props.acp0DefaultAttNamingConv, 'acp0DefaultAttNamingConv'],
        [selectedObject.props.acp0DefaultVisNamingConv, 'acp0DefaultVisNamingConv']
    ];

    var propsToLoad = [];
    _.forEach(requiredPropsListOfList, function (prop) {
        if (!prop[0]) {
            propsToLoad.push(prop[1]);
        }
    });

    var uids = [selectedObject.uid];
    if (propsToLoad.length > 0) {
        dms.getProperties(uids, propsToLoad)
            .then(
                function () {
                    bindProperties(data);
                }
            );
    } else {
        bindProperties(data);
    }
};

var getNCString = function (obj) {
    var ncString = '';
    if (obj) {
        obj = cdm.getObject(obj);
        ncString = obj.props.acp0NamingConvention.dbValues[0];
    }
    return ncString;
};

export let bindProperties = function (data) {
    var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
    var activeEditHandler = editHandlerService.getActiveEditHandler();


    // bininding acp0DefaultVarNamingConv
    data.acp0DefaultVarNamingConvention.propertyDisplayName = selectedObject.props.acp0DefaultVarNamingConv.propertyDisplayName;
    data.acp0DefaultVarNamingConvention.uiValue = getNCString(selectedObject.props.acp0DefaultVarNamingConv.dbValue);
    uwPropertySvc.setIsEditable(data.acp0DefaultVarNamingConvention, activeEditHandler.editInProgress());
    data.acp0DefaultVarNamingConvention_readonly.propertyDisplayName = data.acp0DefaultVarNamingConvention.propertyDisplayName;
    data.acp0DefaultVarNamingConvention_readonly.uiValue = data.acp0DefaultVarNamingConvention.uiValue;

    // bininding acp0DefaultAttNamingConv
    data.acp0DefaultAttNamingConvention.propertyDisplayName = selectedObject.props.acp0DefaultAttNamingConv.propertyDisplayName;
    data.acp0DefaultAttNamingConvention.uiValue = getNCString(selectedObject.props.acp0DefaultAttNamingConv.dbValue);
    uwPropertySvc.setIsEditable(data.acp0DefaultAttNamingConvention, activeEditHandler.editInProgress());
    data.acp0DefaultAttNamingConvention_readonly.propertyDisplayName = data.acp0DefaultAttNamingConvention.propertyDisplayName;
    data.acp0DefaultAttNamingConvention_readonly.uiValue = data.acp0DefaultAttNamingConvention.uiValue;

    // bininding acp0DefaultVisNamingConv
    data.acp0DefaultVisNamingConvention.propertyDisplayName = selectedObject.props.acp0DefaultVisNamingConv.propertyDisplayName;
    data.acp0DefaultVisNamingConvention.uiValue = getNCString(selectedObject.props.acp0DefaultVisNamingConv.dbValue);
    uwPropertySvc.setIsEditable(data.acp0DefaultVisNamingConvention, activeEditHandler.editInProgress());
    data.acp0DefaultVisNamingConvention_readonly.propertyDisplayName = data.acp0DefaultVisNamingConvention.propertyDisplayName;
    data.acp0DefaultVisNamingConvention_readonly.uiValue = data.acp0DefaultVisNamingConvention.uiValue;

    appCtxService.ctx.Acp0invalidNCBErrorMsg = data.i18n.Acp0invalidNCBErrorMsg;
    data.defaultNCLoaded = true;
};

export let DefNCEditStateChanger = function (data) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if (activeEditHandler) {

        if (activeEditHandler.editInProgress()) {
            loadRequiredLOVValues(appCtxService.ctx, data);
        } else {
            data.acp0DefaultVarNamingConvention_readonly.uiValue = data.acp0DefaultVarNamingConvention.uiValue;
            data.acp0DefaultAttNamingConvention_readonly.uiValue = data.acp0DefaultAttNamingConvention.uiValue;
            data.acp0DefaultVisNamingConvention_readonly.uiValue = data.acp0DefaultVisNamingConvention.uiValue;
        }

        uwPropertySvc.setIsEditable(data.acp0DefaultVarNamingConvention, activeEditHandler.editInProgress());
        uwPropertySvc.setIsEditable(data.acp0DefaultAttNamingConvention, activeEditHandler.editInProgress());
        uwPropertySvc.setIsEditable(data.acp0DefaultVisNamingConvention, activeEditHandler.editInProgress());

        //set default editable mode when we caught any error
        if (invalidPropList.length && !activeEditHandler.editInProgress()) {
            acp0RuleNCCondition.setPropertyInEditMode(data, activeEditHandler,'Acp0Rule');
        }
    }
};


export let varNCChangeAction = function (data) {
    if (data.defaultNCLoaded) {
        var prop = data.acp0DefaultVarNamingConvention;
        if (prop.dbValue || !prop.uiValue) {
            var ncuid = prop.dbValue ? prop.dbValue.uid : '';
            var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
            uwPropertySvc.setValue(selectedObject.props.acp0DefaultVarNamingConv, ncuid);
            uwPropertySvc.setDirty(selectedObject.props.acp0DefaultVarNamingConv, true);
        }
    }
};

export let attNCChangeAction = function (data) {
    if (data.defaultNCLoaded) {
        var prop = data.acp0DefaultAttNamingConvention;
        if (prop.dbValue || !prop.uiValue) {
            var ncuid = prop.dbValue ? prop.dbValue.uid : '';
            var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
            uwPropertySvc.setValue(selectedObject.props.acp0DefaultAttNamingConv, ncuid);
            uwPropertySvc.setDirty(selectedObject.props.acp0DefaultAttNamingConv, true);
        }
    }
};

export let visNCChangeAction = function (data) {
    if (data.defaultNCLoaded) {
        var prop = data.acp0DefaultVisNamingConvention;
        if (prop.dbValue || !prop.uiValue) {
            var ncuid = prop.dbValue ? prop.dbValue.uid : '';
            var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
            uwPropertySvc.setValue(selectedObject.props.acp0DefaultVisNamingConv, ncuid);
            uwPropertySvc.setDirty(selectedObject.props.acp0DefaultVisNamingConv, true);
        }
    }
};


export default exports = {
    loadProperties,
    bindProperties,
    DefNCEditStateChanger,
    loadRequiredLOVValues,
    getRuleSaveHandler,
    varNCChangeAction,
    attNCChangeAction,
    visNCChangeAction
};

app.factory('Acp0DefaultNamingConventionsService', () => exports);
