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
 * @module js/Acp0NamingConventionBuilderService
 */
import _ from 'lodash';
import app from 'app';
import appCtxService from 'js/appCtxService';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import dms from 'soa/dataManagementService';
import editHandlerService from 'js/editHandlerService';
import messagingService from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import uwPropertySvc from 'js/uwPropertyService';
import acp0RuleNCCondition from 'js/Acp0RuleNCCondUtils';

var exports = {};
let invalidPropList = [];
var getSeletedAttributeLOV = function (data) {
    var inputData = {
        initialData: {
            propertyName: 'acp0SourceClassAttribute',
            lovInput: {
                owningObject: {
                    type: 'Acp0NamingConvention',
                    uid: undefined
                },
                operationName: 'Edit',
                boName: 'Acp0NamingConvention',
                propertyValues: {
                    acp0SourceClassAttribute: []
                }
            }
        }
    };
    var propertyValues = inputData.initialData.lovInput.propertyValues;
    if (data.sourceClass.dbValue) {
        propertyValues.acp0SourceClassType = [data.sourceClass.dbValue];
    }
    soaSvc.post('Core-2013-05-LOV', 'getInitialLOVValues', inputData)
    .then(function (responseData) {
            data.selectedAttributeLOV = responseData.lovValues.map(function (obj) {
                return {
                    propDisplayValue: obj.propDisplayValues.lov_values[0],
                    propInternalValue: obj.propDisplayValues.lov_values[0]
                };
            });
        });
    };

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

var getInvalidNCBUilderPropList = function (vmo) {
    var notNullPropList = [
        vmo.props.acp0SourceClassType,
        vmo.props.acp0SelectedAttributes,
        vmo.props.acp0delimiter,
        vmo.props.object_name
    ];
    return notNullPropList.filter(function (propertyName) {
        var dbVal = propertyName.dbValue;
        return !dbVal || Array.isArray(dbVal) && dbVal.length === 0;
    });
};

var saveEditHandler = {};

/**
 * custom save handler save edits called by framework
 * @param {dataSource} dataSource of selected object
 * @returns {promise}
 **/
saveEditHandler.saveEdits = function (dataSource) {
    var deferred = AwPromiseService.instance.defer();
    var vmo = dataSource.getDeclViewModel().vmo;
    invalidPropList = getInvalidNCBUilderPropList(vmo);
    if (invalidPropList.length) {
        if (invalidPropList.length === 1 &&
            invalidPropList[0].propertyName === 'acp0SelectedAttributes' &&
            invalidPropList[0].dirty) {
            var errorMessage = appCtxService.ctx.Acp0invalidNCBErrorMsg;
            messagingService.showError(errorMessage);
        } else {
            var localMsgString = appCtxService.ctx.Acp0nullNCBErrorMsg;
            localMsgString = localMsgString.replace('{1}', vmo.modelType.displayName);
            _.forEach(invalidPropList, function (prop) {
                var errorMessage = localMsgString.replace('{0}', prop.propertyDisplayName);
                messagingService.showError(errorMessage);
            });
        }
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

/**
 * Returns dirty bit.
 * @param {dataSource} dataSource of selected object
 * @returns {Boolean} isDirty bit
 */
saveEditHandler.isDirty = function (dataSource) {
    var vmo = dataSource.getDeclViewModel().vmo;
    var invalidPropList = getInvalidNCBUilderPropList(vmo);
    if (invalidPropList.length) {
        return true;
    }
    return dataSource.getAllModifiedProperties().length;
};

export let getNamingConventionSaveHandler = function () {
    return saveEditHandler;
};

export let loadProperties = function (data) {
    var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
    // list of list; containing object to check, if loadded, and internal property name
    var requiredPropsListOfList = [
        [selectedObject.props.acp0SourceClassType, 'acp0SourceClassType'],
        [selectedObject.props.acp0SelectedAttributes, 'acp0SelectedAttributes'],
        [selectedObject.props.acp0delimiter, 'acp0delimiter'],
        [selectedObject.props.acp0NamingConvention, 'acp0NamingConvention'],
        [selectedObject.props.acp0SourceClassAttribute, 'acp0SourceClassAttribute']
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

    appCtxService.ctx.Acp0nullNCBErrorMsg = data.i18n.Acp0nullNCBErrorMsg;
    appCtxService.ctx.Acp0invalidNCBErrorMsg = data.i18n.Acp0invalidNCBErrorMsg;
};

export let bindProperties = function (data) {
    var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
    data.sourceClass = selectedObject.props.acp0SourceClassType;
    data.seletedAttribute = selectedObject.props.acp0SelectedAttributes;
    data.delim = selectedObject.props.acp0delimiter;
    data.NCString = selectedObject.props.acp0NamingConvention;

    // preview requires no label
    data.NCString.propertyDisplayName = '';

    // fixing selected attribute widget
    data.seletedAttribute.hasLov = true;
    data.seletedAttribute.dataProvider = data.seletedAttributePlaceholder.dataProvider;
    data.seletedAttribute.getViewModel = data.seletedAttributePlaceholder.getViewModel;
    data.seletedAttribute.uiValues = data.seletedAttribute.dbValues;
    data.seletedAttribute.displayValues = data.seletedAttribute.dbValues;

    var activeEditHandler = editHandlerService.getActiveEditHandler();

    uwPropertySvc.setIsEditable(data.sourceClass, activeEditHandler.editInProgress());
    uwPropertySvc.setIsEditable(data.seletedAttribute, activeEditHandler.editInProgress());
    uwPropertySvc.setIsEditable(data.delim, activeEditHandler.editInProgress());
    uwPropertySvc.setIsEditable(data.NCString, false);
};

export let updateSeletedAttribute = function (data) {
    if (appCtxService.ctx.editInProgress) {
        getSeletedAttributeLOV(data);
    }
};

export let updateNamingConvention = function (data) {
    var selectedObject = appCtxService.ctx.xrtSummaryContextObject;
    uwPropertySvc.setValue(selectedObject.props.acp0NamingConvention, data.NCString.uiValue);
    uwPropertySvc.setDirty(selectedObject.props.acp0NamingConvention, true);
};

export let NCBEditStateChanger = function (data) {
    var activeEditHandler = editHandlerService.getActiveEditHandler();
    if (activeEditHandler) {
        uwPropertySvc.setIsRequired(data.sourceClass, activeEditHandler.editInProgress());
        uwPropertySvc.setIsRequired(data.seletedAttribute, activeEditHandler.editInProgress());
        uwPropertySvc.setIsRequired(data.delim, activeEditHandler.editInProgress());
        uwPropertySvc.setIsRequired(data.NCString, activeEditHandler.editInProgress());

        if (activeEditHandler.editInProgress()) {
            getSeletedAttributeLOV(data);
            uwPropertySvc.setIsEditable(data.NCString, false);
        }
        //set default editable mode when we caught any error
        if (invalidPropList.length && !activeEditHandler.editInProgress()) {
            acp0RuleNCCondition.setPropertyInEditMode(data, activeEditHandler,'Acp0NamingConvention');
        }
    }
};

export default exports = {
    getNamingConventionSaveHandler,
    loadProperties,
    bindProperties,
    updateSeletedAttribute,
    updateNamingConvention,
    NCBEditStateChanger
};

app.factory('Acp0NamingConventionBuilderService', () => exports);
