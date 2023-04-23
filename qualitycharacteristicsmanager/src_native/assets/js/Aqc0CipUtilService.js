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
 * This file is used as utility file for control inspection plan module from quality center
 *
 * @module js/Aqc0CipUtilService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import soaSvc from 'soa/kernel/soaService';
import appCtxService from 'js/appCtxService';
import viewModelObjectService from 'js/viewModelObjectService';
import dms from 'soa/dataManagementService';
import cmm from 'soa/kernel/clientMetaModel';
import cdm from 'soa/kernel/clientDataModel';
import addObjectUtils from 'js/addObjectUtils';
import tcVmoService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import charManagerUtils from 'js/Aqc0CharManagerUtils';

var exports = {};

/**
 * This method first gets the qc0SpecificationList for characteristics group and loads the object
 *@returns {Object} promise
 */
export let loadObjects = function (data, charSpecFilterBox) {
    var deferred = AwPromiseService.instance.defer();
    var charGroup = {
        type: data.selectedCharGroup.type,
        uid: data.selectedCharGroup.uid
    };

    charManagerUtils.getSupportedTCVersion();

    if (appCtxService.ctx.isTC13_2OnwardsSupported) {
        var inputData = {
            searchInput: {
                maxToLoad: 50,
                maxToReturn: 50,
                providerName: 'Aqc0QualityBaseProvider',
                searchFilterMap6: {
                    'WorkspaceObject.object_type': [{
                        searchFilterType: 'StringFilter',
                        stringValue: "Qc0MasterCharSpec"
                    }]
                },
                searchCriteria: {
                    parentGUID: charGroup.uid,
                    searchStatus: "true",
                    catalogueObjectType: '',
                    objectType: "Qc0MasterCharSpec",
                    objectName: charSpecFilterBox.dbValue ? charSpecFilterBox.dbValue : "*",
                    isReleased: "true"
                },
                searchSortCriteria: []
            }
        };
        soaSvc.post('Internal-AWS2-2019-06-Finder', 'performSearchViewModel4', inputData).then(function (response) {
        var responseData = {};
        if (response.ServiceData.plain) {
            var values = response.ServiceData.plain.map(function (Objuid) {
                return response.ServiceData.modelObjects[Objuid];
            });
            responseData = {
                specificationsList: values,
                totalLoaded: values
            };
            deferred.resolve(responseData);
        }
        deferred.resolve(responseData);
        }, function (reason) {
            deferred.reject(reason);
        });
    } else {
        var loadChxObjectInput = {
            objects: [charGroup],
            attributes: ['qc0SpecificationList']
        };
        soaSvc.post('Core-2006-03-DataManagement', 'getProperties', loadChxObjectInput).then(function (getPropertiesResponse) {
            var specificationObjects = {
                uids: getPropertiesResponse.modelObjects[loadChxObjectInput.objects[0].uid].props.qc0SpecificationList.dbValues
            };
            if (specificationObjects.uids.length > 0) {
                soaSvc.post('Core-2007-09-DataManagement', 'loadObjects', specificationObjects).then(function (response) {
                    var values = response.plain.map(function (Objuid) {
                        return response.modelObjects[Objuid];
                    });

                    var responseData = {
                        specificationsList: values,
                        totalLoaded: values
                    };
                    deferred.resolve(responseData);
                }, function (reason) {
                    deferred.reject(reason);
                });
            } else {
                //If the group doesn't have any specifications then return an empty list
                var responseData = {
                    totalLoaded: []
                };
                deferred.resolve(responseData);
            }
        }, function (reason) {
            deferred.reject(reason);
        });
    }
    return deferred.promise;
};

/**
 *
 * @param {dataprovider} dataprovider for specification list
 * @returns { selected } selecteed specification from the list
 */
function _getSelectedSpecification(dataprovider) {
    var selected = dataprovider.getSelectedObjects();
    return selected[0];
}

/**
 *
 * @returns { Object } primaryObject - Primary Object as an input for createRelations SOA
 */
function _getObjectsForCreateRelations() {
    var primaryObject = {};
    if (appCtxService.ctx.selected.modelType.parentTypeName === 'Qc0MasterCharSpec') {
        if (appCtxService.ctx.pselected.type === 'Aqc0QcElement') {
            primaryObject.type = appCtxService.ctx.pselected.type;
            primaryObject.uid = appCtxService.ctx.pselected.props.awb0UnderlyingObject.dbValues[0];
        } else {
            primaryObject.type = appCtxService.ctx.pselected.type;
            primaryObject.uid = appCtxService.ctx.pselected.uid;
        }
    } else {
        if (appCtxService.ctx.selected.type === 'Aqc0QcElement') {
            primaryObject.type = appCtxService.ctx.selected.type;
            primaryObject.uid = appCtxService.ctx.selected.props.awb0UnderlyingObject.dbValues[0];
        } else if (appCtxService.ctx.selected.type === 'Aqc0CharElementRevision') {
            primaryObject.type = appCtxService.ctx.selected.type;
            primaryObject.uid = appCtxService.ctx.selected.uid;
        } else {
            primaryObject.type = appCtxService.ctx.pselected.type;
            primaryObject.uid = appCtxService.ctx.pselected.uid;
        }
    }
    return primaryObject;
}

export let createRelations = function (data) {
    var selectedSpec = _getSelectedSpecification(data.dataProviders.showSpecificationsListProvider);
    return dms.createRelations([{
        primaryObject: _getObjectsForCreateRelations(),
        secondaryObject: {
            type: selectedSpec.type,
            uid: selectedSpec.uid
        },
        relationType: 'Aqc0LinkToSpec',
        clientId: 'ATTACHSPECIFICATION'
    }]);
};

export let getSpecificationsDetails = function (data) {
    var selectedObject = data.dataProviders.showSpecificationsListProvider.getSelectedObjects();
    data.showDetails = false;
    if (selectedObject.length === 1) {
        var isVariableChar = selectedObject[0].type === 'Qc0VariableCharSpec';
        var isAttributiveChar = selectedObject[0].type === 'Qc0AttributiveCharSpec';
        var props = ['qc0GroupReference', 'qc0Criticality', 'qc0Context', 'qc0BasedOnId', 'object_desc'];
        if (isVariableChar) {
            props.push('qc0NominalValue');
            props.push('qc0UpperTolerance');
            props.push('qc0LowerTolerance');
            props.push('qc0UnitOfMeasure');
        } else if (isAttributiveChar) {
            props.push('qc0NokDescription');
            props.push('qc0OkDescription');
        }
        tcVmoService.getViewModelProperties([selectedObject[0]], props).then(function () {
            data.showDetails = true;
        });
    }
};

export let executeQuery = function (data) {
    var deferred = AwPromiseService.instance.defer();
    var typeNamesToLoad = ['Qc0CharacteristicsGroup'];
    soaSvc.ensureModelTypesLoaded(typeNamesToLoad).then(function () {
        var modelType = cmm.getType(typeNamesToLoad[0]);
        var namePropertyDescriptor = modelType.propertyDescriptorsMap.object_name;
        var chgTypePropertyDescriptor = modelType.propertyDescriptorsMap.qc0CharacteristicsType;
        var inputData = {
            query: data.generalQuery,
            entries: [namePropertyDescriptor.displayName, chgTypePropertyDescriptor.displayName],
            values: [data.filterBox.dbValue === '' ? '*' : '*' + data.filterBox.dbValue + '*', data.groupType.dbValue]
        };
        soaSvc.post('Query-2006-03-SavedQuery', 'executeSavedQuery', inputData).then(function (response) {
            var responseData;
            if (response.ServiceData.modelObjects && response.ServiceData.plain && response.ServiceData.plain.length > 0) {
                var values = response.ServiceData.plain.map(function (Objuid) {
                    return response.ServiceData.modelObjects[Objuid];
                });

                var viewModelObjects = [];
                for (var i = 0; i < values.length; i++) {
                    viewModelObjects[i] = viewModelObjectService.constructViewModelObjectFromModelObject(values[i]);
                }
                values = viewModelObjects;

                responseData = {
                    totalLoaded: values,
                    searchResults: values
                };
                deferred.resolve(responseData);
            } else {
                responseData = {
                    totalLoaded: [],
                    searchResults: []
                };
                deferred.resolve(responseData);
            }
        },
            function (error) {
                deferred.reject(error);
            });
    });
    return deferred.promise;
};

/**
 * Returns the created object of given type from the response from the object response.
 *
 * @param {Object} response - create soa resopnse
 * @param {string} type - create soa resopnse
 */
export let getCreatedObjectOfType = function (response, type) {
    var charRevObject;
    if (response.ServiceData && response.ServiceData.created) {
        _.forEach(response.ServiceData.created, function (uid) {
            if (cdm.getObject(uid) && cdm.getObject(uid).type === type) {
                charRevObject = cdm.getObject(uid);
                return false;
            }
        });
    }
    return charRevObject;
};

/**
 * Returns the created representation revison from the object response.
 *
 * @param {Object} response - create soa resopnse
 */
export let getCreatedRepresentationRevision = function (response) {
    return exports.getCreatedObjectOfType(response, 'Aqc0CharElementRevision');
};

/**
 * Returns the created representation element from the object response.
 *
 * @param {Object} response - addObject soa resopnse
 */
export let getCreatedRepresentationElement = function (response) {
    return exports.getCreatedObjectOfType(response, 'Aqc0QcElement');
};

/**
 * Return create input for char representation.
 *
 * @param {Object} data - The panel's view model object
 */
export let getCreateInput = function (data) {
    var createInput = addObjectUtils.getCreateInput(data);
    if ('com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' !== appCtxService.ctx.sublocation.nameToken) {
        // add the object to fodler
        createInput[0].pasteProp = 'contents';
        createInput[0].targetObject = appCtxService.ctx.selected;
    }
    // we don't need linkSpecificationSectionCommands in the input
    if (createInput[0].createData.propertyNameValues.linkSpecificationSectionCommands) {
        delete createInput[0].createData.propertyNameValues.linkSpecificationSectionCommands;
    }
    return createInput;
};

/**
 * Return create input for char representation.
 *
 * @param {Object} data - The panel's view model object
 */
export let getInspectiondefCreateInput = function (data) {
    var createInput = addObjectUtils.getCreateInput(data);
    if ('com.siemens.splm.client.occmgmt:OccurrenceManagementSubLocation' !== appCtxService.ctx.sublocation.nameToken) {
        // add the object to fodler
        createInput[0].pasteProp = 'Qfm0InspectionDefinition';
        createInput[0].targetObject = appCtxService.ctx.selected;
    }
    // we don't need linkSpecificationSectionCommands in the input
    if (createInput[0].createData.propertyNameValues.linkSpecificationSectionCommands) {
        delete createInput[0].createData.propertyNameValues.linkSpecificationSectionCommands;
    }
    return createInput;
};

export default exports = {
    loadObjects,
    createRelations,
    getSpecificationsDetails,
    executeQuery,
    getCreatedObjectOfType,
    getCreatedRepresentationRevision,
    getCreatedRepresentationElement,
    getCreateInput,
    getInspectiondefCreateInput
};
app.factory('Aqc0CipUtilService', () => exports);
