//@<COPYRIGHT>@
//==================================================
//Copyright 2019.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 */

/**
 * Module for the Export to ReqIF panel
 *
 * @module js/Arm0ExportToReqIF
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import reqACEUtils from 'js/requirementsACEUtils';
import modelPropertySvc from 'js/modelPropertyService';
import uwPropertyService from 'js/uwPropertyService';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';
import notyService from 'js/NotyModule';
import cdm from 'soa/kernel/clientDataModel';
import commandPanelService from 'js/commandPanel.service';

var exports = {};

var _ruleName = null;
var _ruleScope = null;

/** Required properties*/
var requiredProperties = [ 'object_name', 'body_text', 'name' ];

/**
 * returns input context input as object
 *
 * @return {String} input object
 */
export let getInputContext = function() {
    return reqACEUtils.getInputContext();
};

/**
 * return input selected objects as an array
 *
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSelectedObjects = function( ctx ) {
    if( ctx.occmgmtContext !== undefined ) {
        var selectedTop = reqACEUtils.getTopSelectedObject( ctx );
        return [ cdm.getObject( selectedTop.uid ) ];
    }
    return ctx.mselected;
};

/**
 * Invokes the Export to ReqIf panel if selected objects are valid.
 *
 * @param {Object} ctx - Application context
 *@param {Object} data - The view model data
 */
export let exportToReqIfCommon = function( ctx, data ) {
    var objectsToExport = getSelectedObjects( ctx );
    var isValid = _validateObjectTypes( objectsToExport, data );

    if( isValid === true ) {
         //Invoke Panel
         commandPanelService.activateCommandPanel( 'Arm0ExportToReqIF', 'aw_toolsAndInfo' );
    }
};

/**
 * get all types and properties
 *
 * @param {Object} data - The view model data
 *
 */
export let setSpecificationMetadata = function( data ) {
    if( data.getSpecificationMetadataResponse && data.getSpecificationMetadataResponse.typePropInfos ) {
        data.typePropInfosToAddProperties = _.cloneDeep( data.getSpecificationMetadataResponse.typePropInfos );
        data.typePropInfos = _.cloneDeep( data.getSpecificationMetadataResponse.typePropInfos );
    }
    if( data.typePropInfosToAddProperties && data.typePropInfosToAddProperties.length > 0 ) {
        for( var index = 0; index < data.typePropInfosToAddProperties.length; index++ ) {
            var typePropInfo = data.typePropInfosToAddProperties[ index ];
            var propInfos = typePropInfo.propInfos;
            if( propInfos && propInfos.length > 0 ) {
                for( var i = 0; i < propInfos.length; i++ ) {
                    propInfos[ i ] = _createViewModelObjectForProperty( propInfos[ i ], data );
                }
            }
            _sortBooleanList( propInfos );
        }
    }

    data.objectPropInfos = [];
    data.traceLinkPropInfos = [];

    data.objectPropInfosMap = {};
    data.traceLinkPropInfosMap = {};
    if( data.typePropInfos && data.typePropInfos.length > 0 ) {
        for( var j = 0; j < data.typePropInfos.length; j++ ) {
            if( data.typePropInfos[ j ].typeInfo === 'Relation' ) {
                data.traceLinkPropInfos.push( data.typePropInfos[ j ] );
                data.traceLinkPropInfosMap[ data.typePropInfos[ j ].objectType ] = {
                    objectType: data.typePropInfos[ j ].objectType,
                    objectInfo: data.typePropInfos[ j ]
                };
            } else {
                data.objectPropInfos.push( data.typePropInfos[ j ] );
                data.objectPropInfosMap[ data.typePropInfos[ j ].objectType ] = {
                    objectType: data.typePropInfos[ j ].objectType,
                    objectInfo: data.typePropInfos[ j ]
                };
            }
        }
    }

    // Filter already mapped object types, if any
    filterMappedAddTypes( data );

    // to set the command visibility for Arm0AddTypeSubCmd, Arm0AddTraceLinkSubCmd
    appCtxSvc.registerPartialCtx( 'Arm0AddTypeSub.addTypeCmdVisibility', false );
    appCtxSvc.registerPartialCtx( 'Arm0AddTraceLinkSub.addTraceLinkCmdVisibility', false );
    _setContextToCheckAddTypeCmdVisibility( data );
    _setContextToCheckAddTraceLinkCmdVisibility( data );

    exports.initExportReqIFConfigurationsData( data );
};

/**
 * Populate export configurations name
 *
 * @param {Object} data - The view model data
 *
 */
export let initExportReqIFConfigurationsData = function( data ) {
    data.savedConfigurations.dbValue = '';
    data.savedConfigurations.uiValue = '';
    _setExportReqIFConfigCommandVisibility( data );

    appCtxSvc.registerPartialCtx( 'mappingType', 'ExportReqIF' );

    eventBus.publish( 'Arm0ExportToReqIF.populateAllExportReqIFConfigrations' );
};

/**
 * Handles export ReqIF rule/configuration selection from listbox
 *
 * @param {Object} data - The view model data
 *
 */
export let exportReqIFRuleSelectionChangeInListBox = function( data ) {
    if( data.savedConfigurations.dbValue !== '' ) {
        var selectedRule = exports.getRuleObjectForSelection( data );
        if( !_.isEmpty( selectedRule ) ) {
            exports.removeAllConfigurations( data );
            eventBus.publish( 'Arm0ExportToReqIF.populateInfoForConfiguration' );
        }
    } else {
        exports.removeAllConfigurations( data );
        appCtxSvc.registerPartialCtx( 'Arm0AddTypeSub.addTypeCmdVisibility', false );
        appCtxSvc.registerPartialCtx( 'Arm0AddTraceLinkSub.addTraceLinkCmdVisibility', false );
        _setContextToCheckAddTypeCmdVisibility( data );
        _setContextToCheckAddTraceLinkCmdVisibility( data );
        _setExportReqIFConfigCommandVisibility( data );
    }
};

/**
 * Add the 'lovApi' function set export configurations to the given ViewModelProperty
 *
 * @param {Object} data - The view model data
 *
 */
export let initConfigsLovApi = function( data ) {
    data.ruleList = data.getRulesInfoResponse.rulesData;
    var listModels = [];
    var listModel1 = {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        sel: false
    };
    listModels.push( listModel1 );
    var propertiesForMapping = data.getRulesInfoResponse.rulesData;
    for( var index = 0; index < propertiesForMapping.length; index++ ) {
        var entry = propertiesForMapping[ index ];

        var listModel = {
            propDisplayValue: '',
            propInternalValue: '',
            propDisplayDescription: '',
            sel: false
        };
        listModel.propDisplayValue = entry.ruleDispName;
        listModel.propInternalValue = entry.ruleName;
        listModels.push( listModel );
    }
    data.exportReqIFSavedConfigListBoxValues = listModels;
};

/**
 * Remove all configuration of export reqIF.
 *
 * @param {Object} data - The view model data
 */
export let removeAllConfigurations = function( data ) {
    if( data.addTypes ) {
        data.addTypes.dbValue = [];
        data.addTypes.dbValues = [];
    }
    if( data.addTraceLinks ) {
        data.addTraceLinks.dbValue = [];
        data.addTraceLinks.dbValues = [];
    }
};
/**
 * To retrieve the rule object for the selected configuration name
 *
 * @param {Object} data - The view model data
 * @returns {Object} - rule object
 */
export let getRuleObjectForSelection = function( data ) {
    var object = {};
    for( var i = 0; i < data.ruleList.length; i++ ) {
        if( data.savedConfigurations.dbValue === data.ruleList[ i ].ruleName ) {
            object = data.ruleList[ i ];
            break;
        }
    }
    if( !_.isEmpty( object ) ) {
        object.ruleObject = {
            uid: object.ruleObject.uid,
            type: object.ruleObject.type
        };

        data.selectedRule = object;
        appCtxSvc.updatePartialCtx( 'exportReqIFSavedMapping', data.savedConfigurations.dbValue );
    }
    return object;
};

/**
 * Populate the configurations for the selected saved configuration
 *
 * @param {Object} data - The view model data
 *
 */
export let populateRulesFromSavedConfigName = function( data ) {
    var rulesData = data.response.rulesData;

    for( var k = 0; k < rulesData.length; k++ ) {
        var singleRulesData = rulesData[ k ];
        var typePropsData = JSON.parse( singleRulesData.rules );

        var typeObjectList = [];
        var traceLinkObjectList = [];

        if( typePropsData && typePropsData.length > 0 ) {
            for( var i = 0; i < typePropsData.length; i++ ) {
                if( typePropsData[ i ].typeInfo === 'Relation' ) {
                    traceLinkObjectList.push( typePropsData[ i ] );
                } else {
                    typeObjectList.push( typePropsData[ i ] );
                }
            }
        }
        if( typeObjectList.length > 0 ) {
            _showOnlyExisitingObjectFromRule( typeObjectList, data.objectPropInfosMap, data.addTypes );
        }

        if( traceLinkObjectList.length > 0 ) {
            _showOnlyExisitingObjectFromRule( traceLinkObjectList, data.traceLinkPropInfosMap, data.addTraceLinks );
        }

        if( typePropsData && typePropsData.length > 0 ) {
            data.activeView = 'Arm0ExportToReqIFSub';
            // to set the command visibility for Arm0AddTypeSubCmd, Arm0AddTraceLinkSubCmd, Arm0ExportToReqIFConfigurationSubSaveCmd
            _setContextToCheckAddTypeCmdVisibility( data );
            _setContextToCheckAddTraceLinkCmdVisibility( data );
            _setExportReqIFConfigCommandVisibility( data );

            if( data.addTypes.dbValue.length > 0 ) {
                eventBus.publish( 'Arm0ExportToReqIF.refreshAddTypeList' );
            }
            if( data.addTraceLinks.dbValue.length > 0 ) {
                eventBus.publish( 'Arm0ExportToReqIF.refreshAddTraceLinkList' );
            }
        }
    }
};

/**
 *Get all properties for the selected subtype
 *
 * @param {Object} data - The view model data
 *Cr
 */
export let updateObjectTypeList = function( data ) {
    data.objectTypeList = {};
    data.tracelinkTypeList = {};
    var objectTypeListVMP = {};
    var isAddTypes = appCtxSvc.getCtx( 'Arm0AddTypeSub.addTypes' );

    // if adding or updating types
    if( isAddTypes ) {
        var selectedType = appCtxSvc.getCtx( 'Arm0AddTypeSub.selectedTypes' );
        // if updating selected types
        if( selectedType && selectedType.selectedObjectInternalName && selectedType.selectedObjectInternalName !== '' ) {
            objectTypeListVMP = _updateObjectListToUpdateExistingObject( data.objectPropInfos, data.typePropertiesToSelect, selectedType );
            data.objectTypeList = objectTypeListVMP;
        } else {
            //if new types to add
            objectTypeListVMP = _updateObjectListToAddNewObjects( data.objectPropInfos, data.addTypes );
            data.objectTypeList = objectTypeListVMP;
        }
    }
    var isAddedTraceLink = appCtxSvc.getCtx( 'Arm0AddTraceLinkSub.addTraceLinks' );

    // if adding or updating tracelinks
    if( isAddedTraceLink ) {
        var selectedTraceLink = appCtxSvc.getCtx( 'Arm0AddTraceLinkSub.selectedTraceLinks' );
        // if updating selected tracelinks
        if( selectedTraceLink && selectedTraceLink.selectedObjectInternalName && selectedTraceLink.selectedObjectInternalName !== '' ) {
            objectTypeListVMP = _updateObjectListToUpdateExistingObject( data.traceLinkPropInfos, data.tracelinkPropertiesToSelect, selectedTraceLink );
            data.tracelinkTypeList = objectTypeListVMP;
        } else {
            //if new tracelinks to add
            objectTypeListVMP = _updateObjectListToAddNewObjects( data.traceLinkPropInfos, data.addTraceLinks );
            data.tracelinkTypeList = objectTypeListVMP;
        }
    }
};

/**
 * Reset the filter, when object type gets changed.
 *
 * @param {Object} data - The view model data
 */
export let resetTypePropertiesFilter = function( data ) {
    data.filterBoxForType.displayName = '';
    data.filterBoxForType.dbValue = '';
};

/**
 * Reset the filter, when tracelink types gets changed.
 *
 * @param {Object} data - The view model data
 */
export let resetTraceLinkPropertiesFilter = function( data ) {
    data.filterBoxForTraceLink.displayName = '';
    data.filterBoxForTraceLink.dbValue = '';
};

/**
 * Action on the on the object type filter
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - Selected subType
 *
 */
export let actionFilterListForType = function( data, subType ) {
    var filter = '';
    data.propInfosSelectedType = [];
    if( 'filterBoxForType' in data && 'dbValue' in data.filterBoxForType ) {
        filter = data.filterBoxForType.dbValue;
    }
    // Get propInfos for the selected subType
    data.propInfosSelectedType = _getPropertiesFromSubType( data, subType );
    data.typePropertiesToSelect = _getFilteredProperties( filter, data.propInfosSelectedType );
};

/**
 * Action on the Trace Link type filter
 *
 * @param {Object} data - The view model data
 * @param {Object} traceLinkType - Selected tracelink type
 *
 */
export let actionFilterListForTraceLink = function( data, traceLinkType ) {
    var filter = '';
    data.propInfosSelectedTraceLink = [];
    if( 'filterBoxForTraceLink' in data && 'dbValue' in data.filterBoxForTraceLink ) {
        filter = data.filterBoxForTraceLink.dbValue;
    }
    // Get propInfos for the selected trace link type
    data.propInfosSelectedTraceLink = _getPropertiesFromSubType( data, traceLinkType );
    data.tracelinkPropertiesToSelect = _getFilteredProperties( filter, data.propInfosSelectedTraceLink );
};

/**
 * Gets objects and properties to be selected
 *
 * @param {Object} data - The view model data
 * @return {Object} propInfos - Return selected object and its properties
 *
 */
export let getObjectsPropsToBeSelected = function( data ) {
    var isAddTypes = appCtxSvc.getCtx( 'Arm0AddTypeSub.addTypes' );
    var isAddedTraceLink = appCtxSvc.getCtx( 'Arm0AddTraceLinkSub.addTraceLinks' );
    var addedObject = {};
    var propInfos = [];

    if( isAddTypes ) {
        if( data && data.propInfosSelectedType && data.propInfosSelectedType.length > 0 ) {
            propInfos = _getPropertyInfo( data.typePropertiesToSelect, data.propInfosSelectedType );
        }

        addedObject.selectedObjectInternalName = data.objectType.dbValue;
        addedObject.selectedObjectDispName = data.objectType.uiValue;
    } else if( isAddedTraceLink ) {
        if( data && data.propInfosSelectedTraceLink && data.propInfosSelectedTraceLink.length > 0 ) {
            propInfos = _getPropertyInfo( data.tracelinkPropertiesToSelect, data.propInfosSelectedTraceLink );
        }
        addedObject.selectedObjectInternalName = data.traceLinkType.dbValue;
        addedObject.selectedObjectDispName = data.traceLinkType.uiValue;
    }
    addedObject.propInfos = propInfos;
    return addedObject;
};

/**
 * Add types and properties to addType list
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedTypeProperties -  selected type and its properties
 *
 */
export let addTypes = function( data, selectedTypeProperties ) {
    if( selectedTypeProperties ) {
        data.addTypes.dbValue.push( selectedTypeProperties );
        _setContextToCheckAddTypeCmdVisibility( data );
        _setExportReqIFConfigCommandVisibility( data );
        appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypes', false );
        data.activeView = 'Arm0ExportToReqIFSub';
    }
};

/**
 * Remove type from addTypesList list
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedTypesWithProps -  selected types with its properties
 *
 */
export let removeType = function( data, selectedTypesWithProps ) {
    if( selectedTypesWithProps ) {
        for( var i = data.addTypes.dbValue.length - 1; i >= 0; i-- ) {
            if( data.addTypes.dbValue[ i ].selectedObjectInternalName === selectedTypesWithProps.selectedObjectInternalName ) {
                data.addTypes.dbValue.splice( i, 1 );
                _setContextToCheckAddTypeCmdVisibility( data );
                break;
            }
        }
    }
    //remove checked properties
    if( selectedTypesWithProps && selectedTypesWithProps.selectedObjectInternalName ) {
        _removedCheckedProperties( data, selectedTypesWithProps.selectedObjectInternalName );
    }

    _setExportReqIFConfigCommandVisibility( data );
};

/**
 * updatePartialCtx to null for NEW add types.
 */
export let unRegisterArm0AddTypesSubCtx = function() {
    appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinks', false );
    appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypes', true );
    appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.selectedTypes', null );
};

/**
 *updatePartialCtx for update Type.
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedTypeProperties - The overrideType to be removed
 */
export let updateTypeFn = function( data, selectedTypeProperties ) {
    _checkedProperties( data, selectedTypeProperties );
    appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypes', true );
    appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.selectedTypes', selectedTypeProperties );
};

/**
 * Update types and properties to addType list
 *
 * @param {Object} data - The view model data
 *
 */
export let updateTypes = function( data ) {
    var selectedType = appCtxSvc.getCtx( 'Arm0AddTypeSub.selectedTypes' );
    if( selectedType ) {
        for( var i = data.addTypes.dbValue.length - 1; i >= 0; i-- ) {
            if( data.addTypes.dbValue[ i ].selectedObjectInternalName === selectedType.selectedObjectInternalName ) {
                if( data && data.propInfosSelectedType && data.propInfosSelectedType.length > 0 ) {
                    var propInfos = _getPropertyInfo( data.typePropertiesToSelect, data.propInfosSelectedType );
                }
                data.addTypes.dbValue[ i ].propInfos = [];
                data.addTypes.dbValue[ i ].propInfos = propInfos;
            }
        }
    }
    data.activeView = 'Arm0ExportToReqIFSub';
};

/**
 * Add types and properties to addType list
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedTraceLinkProperties -  selected TraceLink and its properties
 *
 */
export let addTraceLinks = function( data, selectedTraceLinkProperties ) {
    if( selectedTraceLinkProperties ) {
        data.addTraceLinks.dbValue.push( selectedTraceLinkProperties );
        _setContextToCheckAddTraceLinkCmdVisibility( data );
        _setExportReqIFConfigCommandVisibility( data );
        appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinks', false );
        data.activeView = 'Arm0ExportToReqIFSub';
    }
};

/**
 * Remove type from addTraceLinksList list
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedTraceLinksWithProps -  selected TraceLink with its properties
 *
 */
export let removeTraceLink = function( data, selectedTraceLinksWithProps ) {
    if( selectedTraceLinksWithProps ) {
        for( var i = data.addTraceLinks.dbValue.length - 1; i >= 0; i-- ) {
            if( data.addTraceLinks.dbValue[ i ].selectedObjectInternalName === selectedTraceLinksWithProps.selectedObjectInternalName ) {
                data.addTraceLinks.dbValue.splice( i, 1 );
                _setContextToCheckAddTraceLinkCmdVisibility( data );
                break;
            }
        }
    }

    //remove checked properties
    if( selectedTraceLinksWithProps && selectedTraceLinksWithProps.selectedObjectInternalName ) {
        _removedCheckedProperties( data, selectedTraceLinksWithProps.selectedObjectInternalName );
    }

    _setExportReqIFConfigCommandVisibility( data );
};

/**
 * updatePartialCtx to null for NEW add types.
 */
export let unRegisterArm0AddTraceLinksSubCtx = function() {
    appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypes', false );
    appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinks', true );
    appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.selectedTraceLinks', null );
};

/**
 *updatePartialCtx for update TraceLink.
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedTraceLinkProperties - selected trace link properties
 */
export let updateTraceLinkFn = function( data, selectedTraceLinkProperties ) {
    _checkedProperties( data, selectedTraceLinkProperties );
    appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinks', true );
    appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.selectedTraceLinks', selectedTraceLinkProperties );
};

/**
 * Update traceLinks and properties to addTraceLink list
 *
 * @param {Object} data - The view model data
 *
 */
export let updateTraceLinks = function( data ) {
    var selectedTraceLinks = appCtxSvc.getCtx( 'Arm0AddTraceLinkSub.selectedTraceLinks' );
    if( selectedTraceLinks ) {
        for( var i = data.addTraceLinks.dbValue.length - 1; i >= 0; i-- ) {
            if( data.addTraceLinks.dbValue[ i ].selectedObjectInternalName === selectedTraceLinks.selectedObjectInternalName ) {
                if( data && data.propInfosSelectedTraceLink && data.propInfosSelectedTraceLink.length > 0 ) {
                    var propInfos = _getPropertyInfo( data.tracelinkPropertiesToSelect, data.propInfosSelectedTraceLink );
                }
                data.addTraceLinks.dbValue[ i ].propInfos = [];
                data.addTraceLinks.dbValue[ i ].propInfos = propInfos;
            }
        }
    }
    data.activeView = 'Arm0ExportToReqIFSub';
};

/**
 * Set FLAG to false while navigating to main Export panel
 *
 * @param {Object} data - The view model data
 *
 */
export let resetArm0AddTypesTraceLinksSubCtx = function() {
    appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinks', false );
    appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypes', false );
};

/**
 * Get objects and its property data to export
 *
 * @param {Object} data - The view model data
 *
 * @returns {Array} typePropInfos - return objects and its selected property data
 */
export let getTypePropsData = function( data ) {
    var typePropInfos = [];
    var traceLinkPropInfos = [];
    if( data && data.addTypes && data.addTypes.dbValue.length > 0 && data.objectPropInfos && data.objectPropInfos.length > 0 ) {
        typePropInfos = _getObjectsWithPropsToExport( data.addTypes, data.objectPropInfos );
    }

    if( data && data.addTraceLinks && data.addTraceLinks.dbValue.length > 0 && data.traceLinkPropInfos && data.traceLinkPropInfos.length > 0 ) {
        traceLinkPropInfos = _getObjectsWithPropsToExport( data.addTraceLinks, data.traceLinkPropInfos );
    }
    return typePropInfos.concat( traceLinkPropInfos );
};

/**
 * To set command dimentions to show ballon popup
 *
 * @param {Object} data - The view model data
 */
export let setCmdDimensionForBallonPopup = function( data ) {
    var rect = document.querySelector( 'button[button-id=\'Arm0ExportToReqIFConfigurationSubSaveCmd\']' ).getBoundingClientRect();
    var cmdDimension = {
        offsetHeight: rect.height,
        offsetLeft: rect.left,
        offsetTop: rect.top,
        offsetWidth: rect.width,
        popupId: 'Arm0ExportToReqIFConfigurationSubSaveCmd'
    };
    data.saveRuleCmdDimension = cmdDimension;
};

/**
 * To fire event for save configuration button click on popup
 *
 * @param {Object} data - The view model data
 */
export let saveExportReqIFConfigPopupButtonClicked = function( data ) {
    _ruleName = data.ruleName.dbValue;
    if( data.globalScopeCheck.dbValue === true ) {
        _ruleScope = 'GLOBAL';
    } else {
        _ruleScope = 'LOCAL';
    }
    eventBus.publish( 'Arm0ExportToReqIF.createSaveExportConfigInput' );
};

/**
 * Update existing configuration
 */
export let updateConfigExportReqIF = function() {
    eventBus.publish( 'Arm0ExportToReqIF.createSaveExportConfigInput' );
};

/**
 * Create input for saving export reqIF configuration
 *
 * @param {Object} data - The view model data
 */
export let createSaveExportConfigInput = function( data ) {
    var typePropsData = exports.getTypePropsData( data );
    var input = {};
    var rulesData = {};
    if( data && data.savedConfigurations && data.savedConfigurations.dbValue ) {
        rulesData.ruleName = data.savedConfigurations.dbValue;
        rulesData.ruleDispName = data.savedConfigurations.dbValue;
        rulesData.accessRight = 'WRITE';
        rulesData.ruleObject = data.selectedRule.ruleObject;
        rulesData.ruleScope = data.selectedRule.ruleScope;
        input.actionName = 'UPDATE';
    } else {
        rulesData.ruleName = _ruleName;
        rulesData.ruleDispName = _ruleName;
        rulesData.accessRight = 'WRITE';
        rulesData.ruleObject = {
            uid: '',
            type: ''
        };
        input.actionName = 'CREATE';
        if( _ruleScope ) {
            rulesData.ruleScope = _ruleScope;
        }
    }

    input.mappingType = 'ExportReqIF';
    rulesData.rules = JSON.stringify( typePropsData );
    input.rulesData = [ rulesData ];
    data.exportReqIFRuleInput = input;
    _ruleName = null;
    _ruleScope = null;
    eventBus.publish( 'Arm0ExportToReqIF.saveExportReqIFConfiguration' );
};

/**
 * Unregister all context related to reqIF
 *
 */
export let exportReqIFcontentUnloaded = function() {
    appCtxSvc.unRegisterCtx( 'saveExportReqIFConfigCmdVisiblity' );
    appCtxSvc.unRegisterCtx( 'mappingType' );
    appCtxSvc.unRegisterCtx( 'Arm0AddTypeSub' );
    appCtxSvc.unRegisterCtx( 'Arm0AddTraceLinkSub' );
    appCtxSvc.unRegisterCtx( 'exportReqIFSavedMapping' );
};

/**
 *  Get objects and its property data to export
 *
 * @param {Object} addObjects - Objects and properties list selected to export
 * @param {Array} objectPropInfos - All objects and its properties populated initially
 * @returns {Array} typePropInfos - return objects and its selected property data
 */
var _getObjectsWithPropsToExport = function( addObjects, objectPropInfos ) {
    var typePropInfos = [];
    for( var i = 0; i < addObjects.dbValue.length; i++ ) {
        for( var j = 0; j < objectPropInfos.length; j++ ) {
            if( addObjects.dbValue[ i ].selectedObjectInternalName === objectPropInfos[ j ].objectType ) {
                var objectInfo = {};
                objectInfo.dispTypeName = objectPropInfos[ j ].dispTypeName;
                objectInfo.objectType = objectPropInfos[ j ].objectType;
                objectInfo.objectTypeRev = objectPropInfos[ j ].objectTypeRev;
                objectInfo.typeInfo = objectPropInfos[ j ].typeInfo;
                objectInfo.propInfos = [];
                if( addObjects.dbValue[ i ].propInfos && addObjects.dbValue[ i ].propInfos.length > 0 ) {
                    for( var k = 0; k < addObjects.dbValue[ i ].propInfos.length; k++ ) {
                        if( objectPropInfos[ j ].propInfos && objectPropInfos[ j ].propInfos.length > 0 ) {
                            for( var l = 0; l < objectPropInfos[ j ].propInfos.length; l++ ) {
                                if( addObjects.dbValue[ i ].propInfos[ k ].propertyName === objectPropInfos[ j ].propInfos[ l ].propName ) {
                                    objectInfo.propInfos.push( objectPropInfos[ j ].propInfos[ l ] );
                                }
                            }
                        }
                    }
                }
                typePropInfos.push( objectInfo );
            }
        }
    }
    return typePropInfos;
};

/**
 * Update object list and its properties to add new objects
 *
 * @param {Object} typePropInfos - Objects with its properties
 * @param {Object} addObjects - objects list which is already added
 *
 * @return {Object} objectTypeListVMP - object type list view model property
 */
var _updateObjectListToAddNewObjects = function( typePropInfos, addObjects ) {
    var objectTypeList = {};
    var typeValues = {
        type: 'STRING',
        dbValue: []
    };
    var output = {};
    var listModel = {};
    objectTypeList = typeValues;

    // Add all types with its properties
    if( addObjects.dbValue.length === 0 ) {
        if( typePropInfos && typePropInfos.length > 0 ) {
            for( var j = 0; j < typePropInfos.length; j++ ) {
                output = typePropInfos[ j ];

                listModel = _getEmptyListModel();
                listModel.propDisplayValue = output.dispTypeName;
                listModel.propInternalValue = output.objectType;

                if( output.objectType !== 'RequirementSpec' ) {
                    objectTypeList.dbValue.push( listModel );
                } else {
                    objectTypeList.dbValue.splice( 0, 0, listModel );
                }
            }
        }
    } else {
        // add only not added types and its properties
        if( typePropInfos && typePropInfos.length > 0 ) {
            for( var k = 0; k < typePropInfos.length; k++ ) {
                var typeAlreadyExist = false;
                for( var l = 0; l < addObjects.dbValue.length; l++ ) {
                    if( addObjects.dbValue[ l ].selectedObjectInternalName === typePropInfos[ k ].objectType ) {
                        typeAlreadyExist = true;
                        break;
                    }
                }
                if( !typeAlreadyExist ) {
                    output = typePropInfos[ k ];
                    listModel = _getEmptyListModel();
                    listModel.propDisplayValue = output.dispTypeName;
                    listModel.propInternalValue = output.objectType;
                    if( output.objectType !== 'RequirementSpec' ) {
                        objectTypeList.dbValue.push( listModel );
                    } else {
                        objectTypeList.dbValue.splice( 0, 0, listModel );
                    }
                }
            }
        }
    }
    var objectTypeListVMP = modelPropertySvc.createViewModelProperty( objectTypeList );
    return objectTypeListVMP;
};

/**
 * Update object list and its properties to update exisiting object
 *
 * @param {Object} typePropInfos - Objects with its properties
 * @param {Object} objectPropertiesToSelect - object properties to be select
 * @param {Object} selectedObject - selected object which needs to be updated
 *
 * @return {Object} objectTypeListVMP - object type list view model property
 */
var _updateObjectListToUpdateExistingObject = function( typePropInfos, objectPropertiesToSelect, selectedObject ) {
    var objectTypeList = {};
    var typeValues = {
        type: 'STRING',
        dbValue: []
    };
    var output = {};
    var listModel = {};

    objectTypeList = typeValues;

    if( selectedObject.propInfos.length > 0 ) {
        for( var i = 0; i < selectedObject.propInfos.length; i++ ) {
            if( objectPropertiesToSelect && objectPropertiesToSelect.length > 0 ) {
                for( var j = 0; j < objectPropertiesToSelect.length; j++ ) {
                    if( selectedObject.propInfos[ i ].propertyName === objectPropertiesToSelect[ j ].propInternalValue ) {
                        objectPropertiesToSelect[ j ].dbValue = true;
                        break;
                    }
                }
            }
        }
    }
    if( typePropInfos && typePropInfos.length > 0 ) {
        for( var k = 0; k < typePropInfos.length; k++ ) {
            if( typePropInfos[ k ].objectType === selectedObject.selectedObjectInternalName ) {
                output = typePropInfos[ k ];
                listModel = _getEmptyListModel();
                listModel.propDisplayValue = output.dispTypeName;
                listModel.propInternalValue = output.objectType;
                objectTypeList.dbValue.push( listModel );
            }
        }
    }
    return modelPropertySvc.createViewModelProperty( objectTypeList );
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    return {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
};

/**
 * Get the property inforamtion
 *
 * @param {Array} objectPropertiesToSelect - Filter value
 * @param {Array} propInfosSelectedObject - All property information for selected type
 *
 * @returns {Array} - get property infos
 *
 */
var _getPropertyInfo = function( objectPropertiesToSelect, propInfosSelectedObject ) {
    var propInfos = [];
    if( propInfosSelectedObject && propInfosSelectedObject.length > 0 ) {
        for( var i = 0; i < propInfosSelectedObject.length; i++ ) {
            if( objectPropertiesToSelect && objectPropertiesToSelect.length > 0 ) {
                for( var j = 0; j < objectPropertiesToSelect.length; j++ ) {
                    if( propInfosSelectedObject[ i ].propertyName === objectPropertiesToSelect[ j ].propertyName ) {
                        propInfosSelectedObject[ i ].dbValue = objectPropertiesToSelect[ j ].dbValue;
                    }
                }
            }
            var viewProp = propInfosSelectedObject[ i ];
            if( viewProp.dbValue ) {
                var dispProp = viewProp.propertyDisplayName.replace( ' (Required)', '' );
                var prop = {
                    propertyName: viewProp.propertyName,
                    propertyDisplayName: dispProp
                };
                propInfos.push( prop );
            }
        }
    }
    return propInfos;
};

/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForProperty = function( propInfo, data ) {
    // Append "(Required)" to the display name, if property is required
    var dispPropName = propInfo.dispPropName;

    if( requiredProperties.indexOf( propInfo.propName ) !== -1 ) {
        dispPropName = propInfo.dispPropName + ' ('+ data.i18n.requiredLabel +')';
    }

    var viewProp = uwPropertyService.createViewModelProperty( propInfo.propName, dispPropName, 'BOOLEAN', [], [] );

    //uwPropertyService.setIsRequired( viewProp, propInfo.isRequired );

    uwPropertyService.setIsArray( viewProp, false );

    uwPropertyService.setIsEditable( viewProp, true );

    uwPropertyService.setIsNull( viewProp, false );

    uwPropertyService.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );

    if( requiredProperties.indexOf( viewProp.propertyName ) !== -1 ) {
        uwPropertyService.setValue( viewProp, true );

        uwPropertyService.setIsEnabled( viewProp, false );
    } else {
        uwPropertyService.setValue( viewProp, false );

        uwPropertyService.setIsEnabled( viewProp, true );
    } // attributes required to show property in lov

    viewProp.propDisplayValue = viewProp.propertyDisplayName;
    viewProp.propInternalValue = viewProp.propertyName;
    return viewProp;
};

/**
 * Sort the boolean list. True values first
 *
 * @param {Object} list - List to sort
 */
var _sortBooleanList = function( list ) {
    list.sort( function( a, b ) {
        // true values first
        if( a.isRequired === b.isRequired ) {
            if( a.isRequired ) {
                return 0;
            } else if( requiredProperties.indexOf( a.propertyName ) !== -1 && requiredProperties.indexOf( b.propertyName ) === -1 ) {
                return -1;
            }
        }
        if( a.isRequired ) {
            return -1;
        }
        return 1;
    } );
};

/**
 * Get the filtered properties
 *
 * @param {Object} filter - Filter value
 * @param {Object} propInfos - The view model property information
 * @returns {Object} - Json object
 *
 */
var _getFilteredProperties = function( filter, propInfos ) {
    var propertiesToSelect = [];
    if( propInfos && propInfos.length > 0 ) {
        var filterValue = filter.toLocaleLowerCase().replace( /\\|\s/g, '' );

        // We have a filter, don't add properties unless the filter matches
        if( filterValue !== '' ) {
            for( var i = 0; i < propInfos.length; i++ ) {
                var propInfo = propInfos[ i ];
                var propertyName = propInfo.propertyName.toLocaleLowerCase().replace( /\\|\s/g, '' );
                var propertyDisplayName = propInfo.propertyDisplayName.toLocaleLowerCase().replace( /\\|\s/g, '' );
                if( propertyName.indexOf( filterValue ) !== -1 || propertyDisplayName.indexOf( filterValue ) !== -1 ) {
                    propertiesToSelect.push( propInfo );
                }
            }
        } else {
            propertiesToSelect = propInfos;
        }
    }
    return propertiesToSelect;
};

/**
 * Get all properties for the selected subtype
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 * @returns {Object} - Json object
 */
var _getPropertiesFromSubType = function( data, subType ) {
    if( data && data.typePropInfosToAddProperties && data.typePropInfosToAddProperties.length > 0 ) {
        for( var index = 0; index < data.typePropInfosToAddProperties.length; index++ ) {
            var typePropInfo = data.typePropInfosToAddProperties[ index ];
            if( typePropInfo.objectType === subType ) {
                var propInfos = typePropInfo.propInfos;
                return propInfos;
            }
        }
    }
    return [];
};

/**
 * Set context to check the command visibility for types
 *
 * @param {Object} data - The view model data
 *
 */
var _setContextToCheckAddTypeCmdVisibility = function( data ) {
    if( data.addTypes.dbValue.length === data.objectPropInfos.length ) {
        appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypeCmdVisibility', false );
    } else {
        appCtxSvc.updatePartialCtx( 'Arm0AddTypeSub.addTypeCmdVisibility', true );
    }
};

/**
 * Set context to check the command visibility for trace links
 *
 * @param {Object} data - The view model data
 */
var _setContextToCheckAddTraceLinkCmdVisibility = function( data ) {
    if( data.addTraceLinks.dbValue.length === data.traceLinkPropInfos.length ) {
        appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinkCmdVisibility', false );
    } else {
        appCtxSvc.updatePartialCtx( 'Arm0AddTraceLinkSub.addTraceLinkCmdVisibility', true );
    }
};

/**
 * Get configuration information which has objects and its properties to display on export reqIF panel
 *
 * @param {Object} typePropData - Configuration information
 * @returns {Object} - Json object
 */
var _getTypePropConfigInfoToDisplay = function( typePropData ) {
    var objectInfo = {};
    objectInfo.selectedObjectInternalName = typePropData.objectType;
    objectInfo.selectedObjectDispName = typePropData.dispTypeName;
    objectInfo.getTypeOrTraceLink = typePropData.typeInfo;
    objectInfo.propInfos = [];

    if( typePropData.propInfos && typePropData.propInfos.length > 0 ) {
        for( var index = 0; index < typePropData.propInfos.length; index++ ) {
            var props = {};
            props.propertyDisplayName = typePropData.propInfos[ index ].dispPropName;
            props.propertyName = typePropData.propInfos[ index ].propName;
            objectInfo.propInfos.push( props );
        }
    }
    return objectInfo;
};

/**
 * Removed checked properties
 *
 * @param {Object} data - The view model data
 * @param {String} selectedObjectInternalName - Object internal name
 *
 */
var _removedCheckedProperties = function( data, selectedObjectInternalName ) {
    var propInfos = _getPropertiesFromSubType( data, selectedObjectInternalName );
    if( propInfos && propInfos.length > 0 ) {
        for( var i = 0; i < propInfos.length; i++ ) {
            if( requiredProperties.indexOf( propInfos[ i ].propertyName ) === -1 ) {
                propInfos[ i ].dbValue = false;
            }
        }
    }
};

/**
 * Check already added properties while updating types or trace Links
 *
 * @param {Object} data - The view model data
 * @param {Object} selectedObjectProperties - selected object Properties to update
 *
 */
var _checkedProperties = function( data, selectedObjectProperties ) {
    if( selectedObjectProperties && selectedObjectProperties.selectedObjectInternalName ) {
        var propInfos = _getPropertiesFromSubType( data, selectedObjectProperties.selectedObjectInternalName );
        if( propInfos && propInfos.length > 0 && selectedObjectProperties.propInfos && selectedObjectProperties.propInfos.length > 0 ) {
            for( var i = 0; i < propInfos.length; i++ ) {
                for( var j = 0; j < selectedObjectProperties.propInfos.length; j++ ) {
                    if( propInfos[ i ].propertyName === selectedObjectProperties.propInfos[ j ].propertyName ) {
                        propInfos[ i ].dbValue = true;
                        break;
                    }
                }
            }
        }
    }
};

/**
 * Set export reqIF configuration command visibility
 *
 * @param {Object} data - The view model data
 */
var _setExportReqIFConfigCommandVisibility = function( data ) {
    if( data.addTypes.dbValue.length === data.objectPropInfos.length && data.addTraceLinks.dbValue.length === data.traceLinkPropInfos.length ) {
        var isExportReqIFConfigCommandVisible = true;
        if( data.addTypes.dbValue.length > 0 ) {
            for( var i = 0; i < data.addTypes.dbValue.length; i++ ) {
                if( !data.objectPropInfosMap[ data.addTypes.dbValue[ i ].selectedObjectInternalName ] ) {
                    isExportReqIFConfigCommandVisible = false;
                    break;
                }
            }
        }
        if( isExportReqIFConfigCommandVisible ) {
            if( data.addTraceLinks.dbValue.length > 0 ) {
                for( var j = 0; j < data.addTraceLinks.dbValue.length; j++ ) {
                    if( !data.traceLinkPropInfosMap[ data.addTraceLinks.dbValue[ j ].selectedObjectInternalName ] ) {
                        isExportReqIFConfigCommandVisible = false;
                        break;
                    }
                }
            }
        }
        appCtxSvc.updatePartialCtx( 'saveExportReqIFConfigCmdVisiblity', isExportReqIFConfigCommandVisible );
    } else {
        appCtxSvc.updatePartialCtx( 'saveExportReqIFConfigCmdVisiblity', false );
    }
};

/**
 * Show only Visible object from rule
 *
 * @param {Array} objectListFromRule - All object from rule
 * @param {Object} objectPropInfosMap - existing obejct list getting from metadata
 * @param {Object} objectTypes - object types to be display on panel
 *
 */
var _showOnlyExisitingObjectFromRule = function( objectListFromRule, objectPropInfosMap, objectTypes ) {
    if( objectListFromRule && objectListFromRule.length > 0 ) {
        for( var k = 0; k < objectListFromRule.length; k++ ) {
            if( objectPropInfosMap[ objectListFromRule[ k ].objectType ] ) {
                var typePropInfo = _getTypePropConfigInfoToDisplay( objectListFromRule[ k ] );
                if( typePropInfo ) {
                    objectTypes.dbValue.push( typePropInfo );
                }
            }
        }
    }
};

/**
 * validate if selected objects are valid for ReqIf export
 *
 *  @param {Array} selectedObjects - selected objects for export.
 *  @param {Object} data - The view model data
 *  @returns {Boolean} - true if is valid
 */
var _validateObjectTypes = function( selectedObjects, data ) {
    var isValid = false;
    for( var index = 0; index < selectedObjects.length; index++ ) {
        var typeHierarchy = selectedObjects[index].modelType.typeHierarchyArray;
        if( typeHierarchy.indexOf( 'Arm0RequirementElement' ) > -1 || typeHierarchy.indexOf( 'Arm0RequirementSpecElement' ) > -1 || typeHierarchy.indexOf( 'Arm0ParagraphElement' ) > -1 ||
        typeHierarchy.indexOf( 'RequirementSpec Revision' ) > -1 || typeHierarchy.indexOf( 'Requirement Revision' ) > -1 || typeHierarchy.indexOf( 'Paragraph Revision' ) > -1 ) {
            isValid = true;
        } else {
            isValid = false;
            var msg = data.i18n.reqifNotSupported;
            notyService.showError( msg );
            break;
        }
    }

    return isValid;
};

/**
 * Funtion to filter mapped object types, based of new metadata.
 * It will remove mapped types if not present in metadata
 *
 * @param {Object} data - View model object data
 */
export let filterMappedAddTypes = function( data ) {
    var isTypesFiltered = false;
    var isTracelinksFiltered = false;

    if( data.addTypes && data.addTypes.dbValue && data.addTypes.dbValue.length > 0 ) {
        data.addTypes.dbValue.forEach( type => {
            if( data.objectPropInfosMap[type.selectedObjectInternalName] === undefined ) {
                removeType( data, type );
                isTypesFiltered = true;
            }
        } );
    }

    // clear mapped tracelinked types on every filter
    if( data.addTraceLinks && data.addTraceLinks.dbValue && data.addTraceLinks.dbValue.length > 0 ) {
        data.addTraceLinks.dbValue = [];
        isTracelinksFiltered = true;
    }

    // Refresh dataproviders if any modifications in mapped data
    if( isTypesFiltered ) {
        eventBus.publish( 'Arm0ExportToReqIF.refreshAddTypeList' );
    }
    if( isTracelinksFiltered ) {
        eventBus.publish( 'Arm0ExportToReqIF.refreshAddTraceLinkList' );
    }
};

/**
 * Return options to get metadata, it will add exportLinkedItems option
 *
 * @param {Object} data - View model object data
 * @returns {Array} - array of options
 */
export let getOptionsArrayForMetadata = function( data ) {
    var options = [];
    if( data && data.exportLinkedItems && data.exportLinkedItems.dbValue ) {
        options.push( 'exportLinkedItems' );
    }
    return options;
};

/**
 * Return options to export, it will add name and exportLinkedItems options
 *
 * @param {Object} data - View model object data
 * @returns {Array} - array of options
 */
export let getOptionsArrayForExport = function( data ) {
    var options = [];
    options.push( data.name.dbValue );
    if( data.exportLinkedItems && data.exportLinkedItems.dbValue ) {
        options.push( 'exportLinkedItems' );
    }
    return options;
};

/**
 * Service for Export specification to ReqIF.
 *
 * @member Arm0ExportToReqIF
 */

export default exports = {
    exportToReqIfCommon,
    getOptionsArrayForMetadata,
    getOptionsArrayForExport,
    getInputContext,
    getSelectedObjects,
    setSpecificationMetadata,
    initExportReqIFConfigurationsData,
    initConfigsLovApi,
    removeAllConfigurations,
    getRuleObjectForSelection,
    populateRulesFromSavedConfigName,
    updateObjectTypeList,
    resetTypePropertiesFilter,
    resetTraceLinkPropertiesFilter,
    actionFilterListForType,
    actionFilterListForTraceLink,
    getObjectsPropsToBeSelected,
    addTypes,
    removeType,
    unRegisterArm0AddTypesSubCtx,
    updateTypeFn,
    updateTypes,
    addTraceLinks,
    removeTraceLink,
    unRegisterArm0AddTraceLinksSubCtx,
    updateTraceLinkFn,
    updateTraceLinks,
    resetArm0AddTypesTraceLinksSubCtx,
    getTypePropsData,
    setCmdDimensionForBallonPopup,
    saveExportReqIFConfigPopupButtonClicked,
    updateConfigExportReqIF,
    createSaveExportConfigInput,
    exportReqIFcontentUnloaded,
    exportReqIFRuleSelectionChangeInListBox
};
app.factory( 'Arm0ExportToReqIF', () => exports );
