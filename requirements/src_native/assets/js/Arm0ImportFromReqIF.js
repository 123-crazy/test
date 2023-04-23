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
 * Module for the Import Specification from ReqIF documents
 *
 * @module js/Arm0ImportFromReqIF
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import AwTimeoutService from 'js/awTimeoutService';
import _ from 'lodash';
import $ from 'jquery';
import ngModule from 'angular';
import eventBus from 'js/eventBus';

import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';

var exports = {};

var _ruleName = null;
var _ruleScope = null;

/**
 * Reset Data from import from reqIF panel.
 *
 * @param {Object} data - The view model data
 *
 */
export let resetReqIFImportData = function( data ) {
    data.isValidMapping = false;
    data.isReqIFTypes = false;
    data.isReqIFTraceLinks = false;

    data.viewModelPropForReqIFTypes = [];
    data.typesForMapping = [];
    data.reqIFTypes = [];

    data.viewModelPropForReqIFTraceLinks = [];
    data.traceLinksForMapping = [];
    data.reqIFTraceLinks = [];

    data.viewModelPropForReqIFProperties = {};
    data.reqIFPropertiesForMapping = {};
    data.reqIFProperties = {};

    data.viewModelPropForReqIFLOVPropertyValues = {};
    data.reqIFLovPropertyValuesForMapping = {};
    data.reqIFLovProperyValues = {};

    data.reqIfAttributeMappingInfos = [];

    data.tcTypesInteranlDisplayNameMap = {};

    data.typeLinkMapPropsData = {};

    appCtxSvc.registerPartialCtx( 'saveImportReqIFSaveMappingCmdVisiblity', false );

    // to get the new metadata for another selected reqIF file
    if( data.getSpecificationMetadataResponse ) {
        delete data.getSpecificationMetadataResponse;
    }
};

/**
 * Populate import mapping names
 *
 * @param {Object} data - The view model data
 *
 */
export let initImportReqIFMappingsData = function( data ) {
    data.savedMappings.dbValue = '';
    data.savedMappings.uiValue = '';
    appCtxSvc.registerPartialCtx( 'mappingType', 'ImportReqIF' );
    eventBus.publish( 'importSpecificationReqIF.populateAllImportReqIFMappings' );
};


/**
 * Handles import ReqIF rule selection from listbox
 *
 * @param {Object} data - The view model data
 *
 */
export let importReqIFRuleSelectionChangeInListBox = function( data ) {
    if( data.savedMappings.dbValue !== '' ) {
        var selectedRule = exports.getRuleObjectForSelection( data );
        if( !_.isEmpty( selectedRule ) ) {
            exports.clearAllReqIFData( data );
            eventBus.publish( 'importSpecificationReqIF.populateInfoForMapping' );
        }
    }
    else {
        exports.removeAllMappings( data );
    }
};

/**
 * Add the 'lovApi' function set import reqIF mappings to the given ViewModelProperty
 *
 * @param {Object} data - The view model data
 *
 */
export let initImportReqIFMappingLovApi = function( data ) {
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
    data.savedMappingsListBoxValues = listModels;
};

/**
 * Remove all created reqIF data for import reqIF.
 *
 * @param {Object} data - The view model data
 */
export let clearAllReqIFData = function( data ) {
    data.isValidMapping = false;
    data.isReqIFTypes = false;
    data.isReqIFTraceLinks = false;

    data.viewModelPropForReqIFTypes = [];
    data.typesForMapping = [];
    data.reqIFTypes = [];

    data.viewModelPropForReqIFTraceLinks = [];
    data.traceLinksForMapping = [];
    data.reqIFTraceLinks = [];

    data.viewModelPropForReqIFProperties = {};
    data.reqIFPropertiesForMapping = {};
    data.reqIFProperties = {};

    data.viewModelPropForReqIFLOVPropertyValues = {};
    data.reqIFLovPropertyValuesForMapping = {};
    data.reqIFLovProperyValues = {};

    data.reqIfAttributeMappingInfos = [];
    data.tcTypesInteranlDisplayNameMap = {};

    data.typeLinkMapPropsData = {};

    appCtxSvc.updatePartialCtx( 'saveImportReqIFSaveMappingCmdVisiblity', false );
};

/**
 * Remove all mapping of import reqIF.
 *
 * @param {Object} data - The view model data
 */
export let removeAllMappings = function( data ) {
    data.isValidMapping = false;
    data.isReqIFTypes = data && data.reqIFTypes && data.reqIFTypes.length > 0 ? true : false;
    data.isReqIFTraceLinks = data && data.reqIFTraceLinks && data.reqIFTraceLinks.length > 0 ? true : false;
    if( data.viewModelPropForReqIFTypes && data.viewModelPropForReqIFTypes.length > 0 ) {
        _clearReqIFTypesDisplayValue( data.viewModelPropForReqIFTypes );
    }
    if( data.viewModelPropForReqIFTraceLinks && data.viewModelPropForReqIFTraceLinks.length > 0 ) {
        _clearReqIFTypesDisplayValue( data.viewModelPropForReqIFTraceLinks );
    }
    data.viewModelPropForReqIFProperties = {};
    data.viewModelPropForReqIFLOVPropertyValues = {};
    data.reqIFPropertiesForMapping = {};
    data.reqIFLovPropertyValuesForMapping = {};
    data.reqIFLovProperyValues = {};
    data.reqIfAttributeMappingInfos = [];
    data.typeLinkMapPropsData = {};
    appCtxSvc.updatePartialCtx( 'saveImportReqIFSaveMappingCmdVisiblity', false );
};

/**
 * To retrieve the rule object for the selected configuration name
 *
 * @param {Object} data - The view model data
 *
 */
export let getRuleObjectForSelection = function( data ) {
    var object = {};
    for( var i = 0; i < data.ruleList.length; i++ ) {
        if( data.savedMappings.dbValue === data.ruleList[ i ].ruleName ) {
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
        appCtxSvc.updatePartialCtx( 'importReqIFSavedMapping', data.savedMappings.dbValue );
    }
    return object;
};

/**
 * Populate the mapping for the selected saved mapping name
 *
 * @param {Object} data - The view model data
 *
 */
export let populateRulesFromSavedMappingName = function( data ) {
    exports.initTypeRelationsData( data );
    var rulesData = data.response.rulesData;
    var typeLinkPropsData = [];
    data.typeLinkMapPropsData = {};

    for( var k = 0; k < rulesData.length; k++ ) {
        var singleRulesData = rulesData[ k ];
        typeLinkPropsData = JSON.parse( singleRulesData.rules );
        if( typeLinkPropsData && typeLinkPropsData.length > 0 ) {
            for( var index = 0; index < typeLinkPropsData.length; index++ ) {
                data.typeLinkMapPropsData[ typeLinkPropsData[ index ].reqIfType ] = typeLinkPropsData[ index ];
            }
            if( data && data.viewModelPropForReqIFTypes && data.viewModelPropForReqIFTypes.length > 0 ) {
                for( var l = 0; l < data.viewModelPropForReqIFTypes.length; l++ ) {
                    var reqIFTypeInfo = data.typeLinkMapPropsData[ data.viewModelPropForReqIFTypes[ l ].propertyName ];
                    if( reqIFTypeInfo ) {
                        data.viewModelPropForReqIFTypes[ l ].dbValue = reqIFTypeInfo.tcType;
                        if( data.tcTypesInteranlDisplayNameMap[ reqIFTypeInfo.tcType ] && data.tcTypesInteranlDisplayNameMap[ reqIFTypeInfo.tcType ].dispTypeName ) {
                            data.viewModelPropForReqIFTypes[ l ].uiValue = data.tcTypesInteranlDisplayNameMap[ reqIFTypeInfo.tcType ].dispTypeName;
                        }

                    }
                }
            }
            if( data && data.viewModelPropForReqIFTraceLinks && data.viewModelPropForReqIFTraceLinks.length > 0 ) {
                for( var m = 0; m < data.viewModelPropForReqIFTraceLinks.length; m++ ) {
                    var reqIFTracelinkInfo = data.typeLinkMapPropsData[ data.viewModelPropForReqIFTraceLinks[ m ].propertyName ];
                    if( reqIFTracelinkInfo ) {
                        data.viewModelPropForReqIFTraceLinks[ m ].dbValue = reqIFTracelinkInfo.tcType;
                        if( data.tcTypesInteranlDisplayNameMap[ reqIFTracelinkInfo.tcType ] && data.tcTypesInteranlDisplayNameMap[ reqIFTracelinkInfo.tcType ].dispTypeName ) {
                            data.viewModelPropForReqIFTraceLinks[ m ].uiValue = data.tcTypesInteranlDisplayNameMap[ reqIFTracelinkInfo.tcType ].dispTypeName;
                        }

                    }
                }
            }
            appCtxSvc.updatePartialCtx( 'showImportReqIFSaveMappingVisiblity', true );
        }
    }
};

/**
 * Hide ImportReqIF SaveMapping Visiblity
 *
 *
 */
export let hideImportReqIFSaveMappingVisiblity = function() {
    AwTimeoutService.instance( function() {
        appCtxSvc.updatePartialCtx( 'showImportReqIFSaveMappingVisiblity', false );
    }, 200 );
};

/**
 * Selected object to import
 *
 * @param {Object} ctx -  Application context
 *
 * @return {Object} selected object
 */
export let selectedObjectToImport = function( ctx ) {
    var object = { uid: 'AAAAAAAAAAAAAA' };
    if( ctx.selected.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 ) {
        object.uid = ctx.selected.uid;
        object.type = ctx.selected.type;
    }
    return object;
};

/**
 * Get Base URL
 *
 * @return {string} Base URL
 */
export let getBaseURL = function() {
    return browserUtils.getBaseURL() + fmsUtils.getFMSUrl();
};

/**
 * Get types from response data.
 *
 * @param {Object} data - The view model data
 *
 */
export let createTypesRelationsMap = function( data ) {
    // initialize import reqIF mapping data
    exports.initImportReqIFMappingsData( data );

    //initiailze type relations data
    exports.initTypeRelationsData( data );
};

/**
 * Initialize type relations data
 *
 * @param {Object} data - The view model data
 */
export let initTypeRelationsData = function( data ) {
    // add reqIF objects data in an array
    for( var i = 0; i < data.getSpecificationMetadataResponse.reqIFTypePropInfos.length; i++ ) {
        var listModel = {
            dispTypeName: '',
            objectType: ''
        };
        listModel.dispTypeName = data.getSpecificationMetadataResponse.reqIFTypePropInfos[ i ].dispTypeName;
        listModel.objectType = data.getSpecificationMetadataResponse.reqIFTypePropInfos[ i ].dispTypeName;
        listModel.typeInfo = data.getSpecificationMetadataResponse.reqIFTypePropInfos[ i ].typeInfo;
        if( data.getSpecificationMetadataResponse.reqIFTypePropInfos[ i ].typeInfo !== 'Relation' ) {
            data.reqIFTypes.push( listModel );
        } else {
            data.reqIFTraceLinks.push( listModel );
        }
    }

    // to show map types panel section if types exist
    if( data.reqIFTypes.length > 0 ) {
        data.isReqIFTypes = true;
    }

    // to show map tracelinks panel section if tracelinks exist
    if( data.reqIFTraceLinks.length > 0 ) {
        data.isReqIFTraceLinks = true;
    }

    data.reqIFProperties = _getPropertiesFromReqIFObject( data );

    data.typePropInfos = _.clone( data.getSpecificationMetadataResponse.typePropInfos, true );

    // create map of tc object and property information
    for( var j = 0; j < data.typePropInfos.length; j++ ) {
        var typeInfo = _getTcTypePropsInfoInMap( data.typePropInfos[ j ] );
        data.tcTypesInteranlDisplayNameMap[ data.typePropInfos[ j ].objectType ] = typeInfo;
    }

    data.typesForMapping = [];
    data.viewModelPropForReqIFTraceLinks = [];

    data.traceLinksForMapping = [];
    data.viewModelPropForReqIFTypes = [];

    data.reqIFPropertiesForMapping = {};
    data.viewModelPropForReqIFProperties = {};

    data.reqIFLovPropertyValuesForMapping = {};
    data.viewModelPropForReqIFLOVPropertyValues = {};

    // Create view model properties for types
    if( data && data.reqIFTypes.length > 0 ) {
        _createViewModelPropertyForObjects( data, data.reqIFTypes, data.typesForMapping, data.viewModelPropForReqIFTypes );
    }

    // Create view model properties for trace links
    if( data && data.reqIFTraceLinks.length > 0 ) {
        _createViewModelPropertyForObjects( data, data.reqIFTraceLinks, data.traceLinksForMapping, data.viewModelPropForReqIFTraceLinks );
    }

    //updates Data Mapping
    _updateDataForMapping( data );
};

/**
 * Add the 'lovApi' function set object to the given ViewModelProperty
 *
 * @param {ViewModelProperty} viewProp - view model property
 *
 */
export let initNativeCellLovApi = function( viewProp ) {
    viewProp.lovApi.getInitialValues = function( filterStr, deferred ) {
        var lovEntries = _.clone( this.requiredPropertiesList );
        if( this.dataForMapping ) {
            // First add the all required properties from all subTypes
            if( this.requiredPropertiesList.length === 0 ) {
                _createLovEntries( this, lovEntries );
                this.requiredPropertiesList = _.clone( lovEntries, true );
            }
        }
        return deferred.resolve( lovEntries );
    };

    viewProp.lovApi.getNextValues = function( deferred ) {
        // LOVs do not support paging.
        deferred.resolve( null );
    };

    viewProp.lovApi.validateLOVValueSelections = function() {
        eventBus.publish( 'importSpecificationReqIF.validateMapping' );
        return false;
    };

    viewProp.lovApi.type = 'static';
};

/**
 * Validate if all types and properties are mapped.
 *
 * @param {Object} data - The view model data
 *
 */
export let validateMapping = function( data ) {
    var isValidMappingForTypes = false;
    var isValidMappingForTraceLinks = false;
    isValidMappingForTypes = data && data.viewModelPropForReqIFTypes && data.viewModelPropForReqIFTypes.length > 0 ? _checkValidMapping( data, data.viewModelPropForReqIFTypes ) : true;
    isValidMappingForTraceLinks = data && data.viewModelPropForReqIFTraceLinks && data.viewModelPropForReqIFTraceLinks.length > 0 ? _checkValidMapping( data, data.viewModelPropForReqIFTraceLinks ) : true;
    data.isValidMapping = Boolean( isValidMappingForTypes && isValidMappingForTraceLinks );
    if( data.isValidMapping ) {
        appCtxSvc.updatePartialCtx( 'saveImportReqIFSaveMappingCmdVisiblity', true );
    } else {
        appCtxSvc.updatePartialCtx( 'saveImportReqIFSaveMappingCmdVisiblity', false );
    }
};

/**
 * Get new mappiing input data to Import from ReqIF
 *
 * @param {Object} data - The view model data
 *
 * @return {object} reqIfAttributeMappingInfos
 */
export let getNewReqIFImportInput = function( data ) {
    if( !data.runInBackgroundReqIF.dbValue ) {
        exports.registerReqIFData( data );
    }
    return _getReqIFImportInput( data );
};

/**
 * Register the flags in view model data for ReqIF import
 *
 * @param {Object} data - The view model object
 */
export let registerReqIFData = function( data ) {
    data.importFromReqIFProgressing = true;
};

/**
 * Unregister the flags from view model data for ReqIF import
 *
 * @param {Object} data - The view model object
 */
export let unRegisterReqIFData = function( data ) {
    data.importFromReqIFProgressing = false;
};

/**
 * To set command dimentions to show ballon popup
 *
 * @param {Object} data - The view model data
 */
export let setCmdDimensionForBallonPopup = function( data ) {
    var rect = document.querySelector( 'button[button-id=\'Arm0ImportFromReqIFMappingSubSaveCmd\']' ).getBoundingClientRect();
    var cmdDimension = {
        offsetHeight: rect.height,
        offsetLeft: rect.left,
        offsetTop: rect.top,
        offsetWidth: rect.width,
        popupId: 'Arm0ImportFromReqIFMappingSubSaveCmd'
    };
    data.saveMappingCmdDimension = cmdDimension;
};

/**
 * To fire event for save mapping button click on popup
 *
 * @param {Object} data - The view model data
 */
export let saveImportReqIFMappingPopupButtonClicked = function( data ) {
    _ruleName = data.ruleName.dbValue;
    if( data.globalScopeCheck.dbValue === true ) {
        _ruleScope = 'GLOBAL';
    } else {
        _ruleScope = 'LOCAL';
    }
    eventBus.publish( 'importSpecificationReqIF.createSaveImportReqIFMappingInput' );
};

/**
 * Update existing mapping for import reqIF
 */
export let updateImportReqIFMapping = function() {
    eventBus.publish( 'importSpecificationReqIF.createSaveImportReqIFMappingInput' );
};

/**
 * Create input for saving import reqIF mapping
 *
 * @param {Object} data - The view model data
 */
export let createSaveImportReqIFMappingInput = function( data ) {
    var input = {};
    var rulesData = {};

    // get existing mapping input
    var mappingData = _getReqIFImportInput( data );

    if( data && data.savedMappings && data.savedMappings.dbValue ) {
        rulesData.ruleName = data.savedMappings.dbValue;
        rulesData.ruleDispName = data.savedMappings.dbValue;
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
    input.mappingType = 'ImportReqIF';
    rulesData.rules = '';
    rulesData.rules = JSON.stringify( mappingData );
    input.rulesData = [ rulesData ];
    data.importReqIFMappingInput = input;
    _ruleName = null;
    _ruleScope = null;
    eventBus.publish( 'importSpecificationReqIF.saveImportReqIFMapping' );
};

/**
 * Unregister all context related to import reqIF
 *
 */
export let importReqIFcontentUnloaded = function() {
    appCtxSvc.unRegisterCtx( 'saveImportReqIFSaveMappingCmdVisiblity' );
    appCtxSvc.unRegisterCtx( 'mappingType' );
    appCtxSvc.unRegisterCtx( 'showImportReqIFSaveMappingVisiblity' );
    appCtxSvc.unRegisterCtx( 'importReqIFSavedMapping' );
};

/**
 * Map reqIF to teamcenter properties
 *
 * @param {Object} data - The view model data
 * @param {Object} eventData - event data with reqIF object information
 */
export let mapReqIFToTcProps = function( data, eventData ) {
    if( eventData.reqObjectName && typeof eventData.reqObjectName === 'string' && eventData.reqObjectName !== '' ) {
        _showReqIFProperties( data, eventData );
    } else if( typeof eventData.reqObjectName === 'string' ) {
        // clear previously selected properties
        var removedProperties = data.reqIFPropertiesForMapping[ eventData.reqIfObjectName ];
        if( removedProperties ) {
            delete data.reqIFPropertiesForMapping[ eventData.reqIfObjectName ];
            delete data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ];
        }
    }
};

/**
 * Map reqIF to teamcenter lov values
 *
 * @param {Object} data - The view model data
 * @param {Object} eventData - event data with reqIF object and property information
 * @param {String} eventData - event data with reqIF object and property information
 */
export let mapReqIFToTcLovValues = function( data, eventData, eventName ) {
    if( eventData.reqObjectName && typeof eventData.reqObjectName === 'string' && eventData.reqObjectName !== '' ) {
        var startIndex = eventName.indexOf( '.' );
        var subString = eventName.substr( startIndex + 1, eventName.length - 1 );
        startIndex = subString.indexOf( '.' );
        var awObjectName = subString.substr( 0, startIndex );
        _showReqIFLOVProprtyValues( data, eventData, awObjectName );
    } else if( typeof eventData.reqObjectName === 'string' ) {
        // clear previously selected LOV property values
        var viewModelPropForTypeLink = data.viewModelPropForReqIFProperties[ eventData.reqIFPropertyParentName ];
        if( viewModelPropForTypeLink && viewModelPropForTypeLink.length > 0 ) {
            for( var i = 0; i < viewModelPropForTypeLink.length; i++ ) {
                if( viewModelPropForTypeLink[ i ].propertyDisplayName === eventData.reqIfObjectDisplayName ) {
                    var removedLOVPropertyValues = viewModelPropForTypeLink[ i ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ];
                    if( removedLOVPropertyValues ) {
                        delete viewModelPropForTypeLink[ i ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ];
                        delete viewModelPropForTypeLink[ i ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ];
                    }
                    break;
                }
            }
        }
    }
};

/**
 * Get type property in map format
 *
 * @param {Array} typePropInfo - type propInfo array data
 * @returns {Object} type - return type propInfo map
 *
 */
var _getTcTypePropsInfoInMap = function( typePropInfo ) {
    var type = {
        dispTypeName: '',
        typeInfo: '',
        objectType: '',
        propInfos: {},
        requiredPropInfosArray: []
    };
    var props = {};
    var requiredPropsArray = [];

    if( typePropInfo.propInfos && typePropInfo.propInfos.length > 0 ) {
        for( var j = 0; j < typePropInfo.propInfos.length; j++ ) {
            props[ typePropInfo.propInfos[ j ].propName ] = typePropInfo.propInfos[ j ];
            props[ typePropInfo.propInfos[ j ].propName ].lovInfo = {};
            if( typePropInfo.propInfos[ j ].isRequired && typePropInfo.propInfos[ j ].propName !== 'item_revision_id' ) {
                requiredPropsArray.push( typePropInfo.propInfos[ j ] );
            }
            if( typePropInfo.propInfos[ j ].hasLOV ) {
                if( typePropInfo.propInfos[ j ].lovDispValues && typePropInfo.propInfos[ j ].lovDispValues.length > 0 ) {
                    for( var k = 0; k < typePropInfo.propInfos[ j ].lovDispValues.length; k++ ) {
                        props[ typePropInfo.propInfos[ j ].propName ].lovInfo[ typePropInfo.propInfos[ j ].lovDispValues[ k ] ] = typePropInfo.propInfos[ j ].lovDispValues[ k ];
                    }
                }
            }
        }
    }
    type.objectType = typePropInfo.objectType;
    type.dispTypeName = typePropInfo.dispTypeName;
    type.typeInfo = typePropInfo.typeInfo;
    type.propInfos = props;
    if( typePropInfo.objectType !== 'RequirementSpec' ) {
        type.requiredPropInfosArray = requiredPropsArray;
    }

    return type;
};

/**
 *  Checks if objects or properties are mapped or not .
 *
 * @param {Object} data - The view model data
 * @param {Object} viewModelPropForReqIFTypesTraceLinks - The view model data for types or traceLinks
 * @returns {Boolean} true/false - true, if all objects and properties are mapped
 *
 */
var _checkValidMapping = function( data, viewModelPropForReqIFTypesTraceLinks ) {
    for( var i = 0; i < viewModelPropForReqIFTypesTraceLinks.length > 0; i++ ) {
        if( typeof viewModelPropForReqIFTypesTraceLinks[ i ].dbValue !== 'string' || viewModelPropForReqIFTypesTraceLinks[ i ].dbValue === '' ) {
            return false;
        }
        var reqIFObject = viewModelPropForReqIFTypesTraceLinks[ i ];
        var tcObjectdbValue = reqIFObject.dbValue;

        if( tcObjectdbValue !== "RequirementSpec" ) {
            var reqIFProps = data.viewModelPropForReqIFProperties[ reqIFObject.propertyDisplayName ];
            if( data.tcTypesInteranlDisplayNameMap[ tcObjectdbValue ] && data.tcTypesInteranlDisplayNameMap[ tcObjectdbValue ].requiredPropInfosArray ) {
                var requiredProps = data.tcTypesInteranlDisplayNameMap[ tcObjectdbValue ].requiredPropInfosArray;
                if( requiredProps && requiredProps.length > 0 ) {
                    for( var j = 0; j < requiredProps.length > 0; j++ ) {
                        var reqIFProps = data.viewModelPropForReqIFProperties[ reqIFObject.propertyDisplayName ];
                        var isRequiredPropMap = false;
                        if( reqIFProps && reqIFProps.length > 0 ) {
                            for( var k = 0; k < reqIFProps.length > 0; k++ ) {
                                if( typeof reqIFProps[ k ].dbValue === 'string' && reqIFProps[ k ].dbValue !== '' ) {
                                    if( reqIFProps[ k ].dbValue === requiredProps[ j ].propName ) {
                                        isRequiredPropMap = true;
                                        break;
                                    }
                                }
                            }
                        }
                        if( !isRequiredPropMap ) {
                            return false;
                        }
                    }
                }
            }
            if( reqIFProps && reqIFProps.length > 0 ) {
                for( var l = 0; l < reqIFProps.length > 0; l++ ) {
                    if( reqIFProps[ l ].hasLOVValues ) {
                        if( typeof reqIFProps[ l ].dbValue === 'string' && reqIFProps[ l ].dbValue !== '' ) {
                            var propDisplayname = reqIFProps[ l ].propertyDisplayName;
                            var reqIFLovPropertyValues = reqIFProps[ l ].viewModelPropForReqIFLOVPropertyValues[ propDisplayname ];
                            if( reqIFLovPropertyValues && reqIFLovPropertyValues.length > 0 ) {
                                for( var k = 0; k < reqIFLovPropertyValues.length > 0; k++ ) {
                                    if( typeof reqIFLovPropertyValues[ k ].dbValue !== 'string' || reqIFLovPropertyValues[ k ].dbValue === '' ) {
                                        return false;
                                    }
                                }
                            } else { return false; }
                        }
                    }
                }
            }
        }

    }
    return true;
};

/**
 *  To collect all mappped ReqIF and teamcenter properties
 *
 * @param {Object} data - The view model data
 * @param {Array} viewModelPropForReqIFTypesLinks - The view model data with reqIF and tc object mapping
 *
 */
var _createReqIFAttributeMapForImport = function( data, viewModelPropForReqIFTypesLinks ) {
    for( var i = 0; i < viewModelPropForReqIFTypesLinks.length; i++ ) {
        var reqIfAttributeMappingInfo = {};
        var objectType = viewModelPropForReqIFTypesLinks[ i ];

        var reqIFType = objectType.propertyName;
        var tcType = objectType.dbValue;
        var typeInfo = objectType.typeInfo;
        var reqIfAttrVsTcAttr = {};

        if( data && data.viewModelPropForReqIFProperties && data.viewModelPropForReqIFProperties[ reqIFType ] &&
            data.viewModelPropForReqIFProperties[ reqIFType ].length > 0 ) {
            for( var j = 0; j < data.viewModelPropForReqIFProperties[ reqIFType ].length; j++ ) {
                var tcAttrInfo = {};

                var reqIFTypeProperty = data.viewModelPropForReqIFProperties[ reqIFType ][ j ];
                if( typeof reqIFTypeProperty.dbValue === 'string' && reqIFTypeProperty.dbValue !== '' ) {
                    tcAttrInfo.propName = reqIFTypeProperty.dbValue;
                    tcAttrInfo.hasLov = reqIFTypeProperty.hasLOVValues;
                    tcAttrInfo.reqIfLovValuesVsTcLovValues = {};

                    if( tcAttrInfo.hasLov ) {
                        var viewModelPropValues = reqIFTypeProperty.viewModelPropForReqIFLOVPropertyValues[ reqIFTypeProperty.propertyDisplayName ];
                        if( viewModelPropValues && viewModelPropValues.length > 0 ) {
                            for( var k = 0; k < viewModelPropValues.length; k++ ) {
                                tcAttrInfo.reqIfLovValuesVsTcLovValues[ viewModelPropValues[ k ].propertyName ] = viewModelPropValues[ k ].dbValue;
                            }
                        }
                    }
                    reqIfAttrVsTcAttr[ reqIFTypeProperty.propertyDisplayName ] = tcAttrInfo;
                }

            }
        }

        reqIfAttributeMappingInfo.reqIfType = reqIFType;
        reqIfAttributeMappingInfo.tcType = tcType;
        reqIfAttributeMappingInfo.reqIfAttrVsTcAttr = reqIfAttrVsTcAttr;
        reqIfAttributeMappingInfo.typeInfo = typeInfo;

        data.reqIfAttributeMappingInfos.push( reqIfAttributeMappingInfo );
    }
};

/**
 * Get all properties for the selected reqIF object
 *
 * @param {Object} data - The view model data
 * @return {object} propMap
 *
 */
var _getPropertiesFromReqIFObject = function( data ) {
    var propMap = {};
    for( var index = 0; index < data.getSpecificationMetadataResponse.reqIFTypePropInfos.length; index++ ) {
        var typePropInfo = data.getSpecificationMetadataResponse.reqIFTypePropInfos[ index ];
        var propInfos = typePropInfo.propInfos;
        propMap[ typePropInfo.dispTypeName ] = propInfos;
    }
    return propMap;
};

/**
 * Create view model property for all objects
 * @param {Object} data - The view model data
 * @param {Array} reqIFObjects - array of reqIF objects
 * @param {Array} objectsForMapping - array of mapping reqIF objects to append to LOV
 * @param {Array} viewModelPropForReqIFobjects - array of reqIF objects with view model property
 *
 */
var _createViewModelPropertyForObjects = function( data, reqIFObjects, objectsForMapping, viewModelPropForReqIFobjects ) {
    for( var index = 0; index < reqIFObjects.length; index++ ) {
        var reqIFObject = reqIFObjects[ index ];
        var eventName = 'importReqIFMapProp.' + reqIFObject.objectType;

        // Subscribe event to map reqIF properties to teamcenter properties for selected reqIF object
        eventBus.subscribe( eventName, function( eventData ) {
            if( eventData ) {
                exports.mapReqIFToTcProps( data, eventData );
            }
        } );
        // Show reqIF object list with initilization of lov properties
        var viewProp = _createViewModelObjectForData( reqIFObject );
        viewProp.typeInfo = reqIFObjects[ index ].typeInfo;
        viewProp.lovApi = {};
        viewProp.lovApi.dataForMapping = objectsForMapping;
        viewProp.lovApi.requiredPropertiesList = [];
        exports.initNativeCellLovApi( viewProp );
        viewModelPropForReqIFobjects.push( viewProp );
    }
};

/**
 * Show reqIF Properties of reqIF Object and attach teamcenter properties to its LOV listbox
 *
 * @param {Object} data - The view model data
 * @param {Array} eventData - event Data
 *
 */
var _showReqIFProperties = function( data, eventData ) {
    // covert reqIF properties into view Model properties
    _createViewModelPropertyForProperties( data, data.reqIFProperties, data.reqIFPropertiesForMapping, data.viewModelPropForReqIFProperties, eventData.reqIfObjectName );
    if( data && data.typePropInfos && data.typePropInfos.length > 0 ) {
        for( var i = 0; i < data.typePropInfos.length; i++ ) {
            var typePropInfo = data.typePropInfos[ i ];
            if( typePropInfo.objectType === eventData.reqObjectName ) {
                if( data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ] && data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ].length > 0 ) {
                    for( var j = 0; j < data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ].length; j++ ) {
                        if( typePropInfo.propInfos && typePropInfo.propInfos.length > 0 ) {
                            var propInfos = typePropInfo.propInfos;
                            var viewProps = [];
                            var isLOVProperty = false;

                            // check if both reqIF properties and teamcenter properties of same type or not
                            // of same type or not (LOV or string)
                            if( data.reqIFProperties[ eventData.reqIfObjectName ] && data.reqIFProperties[ eventData.reqIfObjectName ].length > 0 ) {
                                for( var l = 0; l < data.reqIFProperties[ eventData.reqIfObjectName ].length; l++ ) {
                                    var viewModelReqIFPropertyName = data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ][ j ].propertyDisplayName;
                                    var reqIFPropertyName = data.reqIFProperties[ eventData.reqIfObjectName ][ l ].dispPropName;
                                    if( viewModelReqIFPropertyName === reqIFPropertyName ) {
                                        isLOVProperty = data.reqIFProperties[ eventData.reqIfObjectName ][ l ].hasLOV;
                                        if( isLOVProperty ) {
                                            var vmProperty = data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ][ j ];
                                            var eventName = 'importReqIFMapProp.' + eventData.reqObjectName + '.' + vmProperty.propertyDisplayName;
                                            // Subscribe event to map reqIF properties to teamcenter properties for selected reqIF object
                                            eventBus.subscribe( eventName, function( eventData ) {
                                                exports.mapReqIFToTcLovValues( data, eventData, eventName );
                                            }, eventName );
                                        }
                                        break;
                                    }
                                }
                            }
                            if( propInfos && propInfos.length > 0 ) {
                                _sortTcPropsListUsingIsRequiredProp( propInfos );
                                for( var k = 0; k < propInfos.length; k++ ) {
                                    // map only if both properties of same type
                                    if( propInfos[ k ].hasLOV === isLOVProperty ) {
                                        var viewAwProp = _createViewModelObjectForTcProperty( propInfos[ k ], typePropInfo.objectType, data );
                                        viewProps.push( viewAwProp );
                                    }
                                }
                            }
                        }
                        //map reqIF properties to teamcenter properties
                        var viewProperty = data.viewModelPropForReqIFProperties[ eventData.reqIfObjectName ][ j ];
                        viewProperty.lovApi.dataForMapping = viewProps;
                    }

                }

                var isShowImportReqIFSaveMapping = appCtxSvc.getCtx( 'showImportReqIFSaveMappingVisiblity' );
                if( isShowImportReqIFSaveMapping ) {
                    _showMappedReqIFProperties( data, eventData );
                }

                break;
            }
        }
    }
};

/**
 * Show Mapped reqIF Properties of reqIF Object and attach teamcenter properties to its LOV listbox
 *
 * @param {Object} data - The view model data
 * @param {Array} eventData - event Data
 *
 */
var _showMappedReqIFProperties = function( data, eventData ) {
    // map reqIFproperties using existing rule
    if( data.typeLinkMapPropsData[ eventData.reqIfObjectName ] ) {
        var tcObjectName = eventData.reqObjectName;
        var reqIfObjectName = eventData.reqIfObjectName;
        var reqIFTypeInfo = data.typeLinkMapPropsData[ reqIfObjectName ];
        for( var n = 0; n < data.viewModelPropForReqIFProperties[ reqIfObjectName ].length; n++ ) {
            var reqIFPropsList = Object.keys( reqIFTypeInfo.reqIfAttrVsTcAttr );
            for( var m = 0; m < reqIFPropsList.length; m++ ) {
                if( data.viewModelPropForReqIFProperties[ reqIfObjectName ][ n ].propertyDisplayName === reqIFPropsList[ m ] ) {
                    data.viewModelPropForReqIFProperties[ reqIfObjectName ][ n ].dbValue = reqIFTypeInfo.reqIfAttrVsTcAttr[ reqIFPropsList[ m ] ].propName;
                    var propdbName = reqIFTypeInfo.reqIfAttrVsTcAttr[ reqIFPropsList[ m ] ].propName;
                    data.viewModelPropForReqIFProperties[ reqIfObjectName ][ n ].uiValue = //
                        data.tcTypesInteranlDisplayNameMap[ tcObjectName ].propInfos[ propdbName ].dispPropName;
                }
            }
        }
        eventBus.publish( 'importSpecificationReqIF.validateMapping' );
    }
};

/**
 * Show reqIF LOV Property values of reqIF Object and attach teamcenter LOV property values of teamcenter object
 *
 * @param {Object} data - The view model data
 * @param {Array} eventData - event Data
 * @param {String} awObjectName - AW object name
 *
 */
var _showReqIFLOVProprtyValues = function( data, eventData, awObjectName ) {
    var vmProprties = data.viewModelPropForReqIFProperties[ eventData.reqIFPropertyParentName ];
    if( vmProprties && vmProprties.length > 0 ) {
        _initMapReqIFPropLOVWithTcPropLOV( data, vmProprties, eventData );
    }
    if( data.viewModelPropForReqIFProperties[ eventData.reqIFPropertyParentName ] && data.viewModelPropForReqIFProperties[ eventData.reqIFPropertyParentName ].length > 0 ) {
        _mapReqIFPropLOVWithTcPropLOV( data, data.viewModelPropForReqIFProperties[ eventData.reqIFPropertyParentName ], eventData, awObjectName );
    }
    var isShowImportReqIFSaveMapping = appCtxSvc.getCtx( 'showImportReqIFSaveMappingVisiblity' );
    if( isShowImportReqIFSaveMapping ) {
        _showMappedReqIFLOVProprtyValues( data, eventData, awObjectName );
    }

};

/**
 * Show reqIF mapped LOV Property values of reqIF Object and attach teamcenter LOV property values of teamcenter object
 *
 * @param {Object} data - The view model data
 * @param {Array} eventData - event Data
 * @param {String} awObjectName - AW object name
 *
 */
var _showMappedReqIFLOVProprtyValues = function( data, eventData, awObjectName ) {
    // map reqIFpropertyLOVs using existing rule
    var reqIFObjectName = eventData.reqIFPropertyParentName;
    if( data.typeLinkMapPropsData[ reqIFObjectName ] ) {
        var reqIFPropertyName = eventData.reqIfObjectDisplayName;
        var awPropertyName = eventData.reqObjectName;
        var viewModelPropForReqIFProperties = data.viewModelPropForReqIFProperties[ reqIFObjectName ];
        if( viewModelPropForReqIFProperties && viewModelPropForReqIFProperties.length > 0 ) {
            for( var n = 0; n < viewModelPropForReqIFProperties.length; n++ ) {
                var reqIFPropsList = Object.keys( data.typeLinkMapPropsData[ reqIFObjectName ].reqIfAttrVsTcAttr );
                for( var m = 0; m < reqIFPropsList.length; m++ ) {
                    if( viewModelPropForReqIFProperties[ n ].propertyDisplayName === reqIFPropsList[ m ] ) {
                        var reqIFpropVMP = viewModelPropForReqIFProperties[ n ];
                        if( reqIFpropVMP && reqIFpropVMP.viewModelPropForReqIFLOVPropertyValues && reqIFpropVMP.viewModelPropForReqIFLOVPropertyValues[ reqIFPropertyName ] ) {
                            var lovVMP = viewModelPropForReqIFProperties[ n ].viewModelPropForReqIFLOVPropertyValues[ reqIFPropertyName ];
                            for( var p = 0; p < lovVMP.length; p++ ) {
                                var lovValueNames = Object.keys( data.typeLinkMapPropsData[ reqIFObjectName ].reqIfAttrVsTcAttr[ reqIFPropsList[ m ] ].reqIfLovValuesVsTcLovValues );
                                if( lovValueNames && lovValueNames.length > 0 ) {
                                    for( var q = 0; q < lovValueNames.length; q++ ) {
                                        if( lovVMP[ p ].propertyName === lovValueNames[ q ] ) {
                                            var lovdbValue = data.typeLinkMapPropsData[ reqIFObjectName ].reqIfAttrVsTcAttr[ reqIFPropsList[ m ] ].reqIfLovValuesVsTcLovValues[ lovValueNames[ q ] ];
                                            data.viewModelPropForReqIFProperties[ reqIFObjectName ][ n ].viewModelPropForReqIFLOVPropertyValues[ reqIFPropertyName ][ p ].dbValue //
                                            = lovdbValue;
                                            var lovuiValue = data.tcTypesInteranlDisplayNameMap[ awObjectName ].propInfos[ awPropertyName ].lovInfo[ lovdbValue ];
                                            data.viewModelPropForReqIFProperties[ reqIFObjectName ][ n ].viewModelPropForReqIFLOVPropertyValues[ reqIFPropertyName ][ p ].uiValue //
                                            = lovuiValue;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        eventBus.publish( 'importSpecificationReqIF.validateMapping' );
    }
};

/**
 * Initialize mapping of reqIF LOV Property values of reqIF Object to teamcenter LOV property values of teamcenter object
 *
 * @param {Object} data - The view model data
 * @param {Array} vmProprties - view model properties of ReqIF object Properties
 * @param {Array} eventData - event Data
 *
 */
var _initMapReqIFPropLOVWithTcPropLOV = function( data, vmProprties, eventData ) {
    // create view model proprety for lov values for reqIF property
    for( var i = 0; i < vmProprties.length; i++ ) {
        if( vmProprties[ i ].propertyDisplayName === eventData.reqIfObjectDisplayName ) {
            var reqIFPropertyName = vmProprties[ i ].propertyDisplayName;
            var reqIFPropertyLOVValues = [];
            vmProprties[ i ].reqIFLovPropertyValuesForMapping[ reqIFPropertyName ] = [];
            for( var j = 0; j < data.reqIFProperties[ eventData.reqIFPropertyParentName ].length; j++ ) {
                if( data.reqIFProperties[ eventData.reqIFPropertyParentName ][ j ].dispPropName === reqIFPropertyName ) {
                    reqIFPropertyLOVValues = data.reqIFProperties[ eventData.reqIFPropertyParentName ][ j ].lovDispValues;
                    break;
                }
            }
            var viewLOVProps = [];
            for( var k = 0; k < reqIFPropertyLOVValues.length; k++ ) {
                var viewProp = uwPropertyService.createViewModelProperty( reqIFPropertyLOVValues[ k ], reqIFPropertyLOVValues[ k ], 'STRING', [], [] );
                uwPropertyService.setHasLov( viewProp, true );
                uwPropertyService.setIsArray( viewProp, false );
                uwPropertyService.setIsEnabled( viewProp, true );
                uwPropertyService.setIsEditable( viewProp, true );
                uwPropertyService.setIsNull( viewProp, false );
                viewProp.lovApi = {};
                viewProp.lovApi.dataForMapping = vmProprties[ i ].reqIFLovPropertyValuesForMapping[ reqIFPropertyName ];
                viewProp.lovApi.requiredPropertiesList = [];
                exports.initNativeCellLovApi( viewProp );
                viewLOVProps.push( viewProp );
            }
            vmProprties[ i ].viewModelPropForReqIFLOVPropertyValues[ reqIFPropertyName ] = viewLOVProps;
        }
    }
};

/**
 * Map reqIF LOV Property values of reqIF Object to teamcenter LOV property values of teamcenter object
 *
 * @param {Object} data - The view model data
 * @param {Array} viewModelPropForReqIFProps - view Model property of ReqIF type or tracelink
 * @param {Array} eventData - event Data
 * @param {String} awObjectName - AW object name
 *
 */
var _mapReqIFPropLOVWithTcPropLOV = function( data, viewModelPropForReqIFProps, eventData, awObjectName ) {
    var viewProps = [];
    // create view model properties for LOV values of selected property
    if( data && data.typePropInfos && data.typePropInfos.length > 0 ) {
        for( var i = 0; i < data.typePropInfos.length; i++ ) {
            var reqObject = data.typePropInfos[ i ];
            if( reqObject.objectType === awObjectName ) {
                for( var j = 0; j < reqObject.propInfos.length; j++ ) {
                    var reqObjectProperty = reqObject.propInfos[ j ];
                    if( reqObjectProperty.propName === eventData.reqObjectName && reqObjectProperty.hasLOV ) {
                        var lovDispValues = reqObjectProperty.lovDispValues;
                        if( lovDispValues && lovDispValues.length > 0 ) {
                            for( var k = 0; k < lovDispValues.length; k++ ) {
                                var awViewModelPropLOVValue = _createViewModelObjectForPropertyLOVValue( lovDispValues[ k ] );
                                viewProps.push( awViewModelPropLOVValue );
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }
    }
    if( viewModelPropForReqIFProps && viewModelPropForReqIFProps.length > 0 ) {
        for( var l = 0; l < viewModelPropForReqIFProps.length; l++ ) {
            if( viewModelPropForReqIFProps[ l ].propertyDisplayName === eventData.reqIfObjectDisplayName ) {
                if( viewModelPropForReqIFProps[ l ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ] && //
                    viewModelPropForReqIFProps[ l ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ].length > 0 ) {
                    for( var m = 0; m < viewModelPropForReqIFProps[ l ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ].length; m++ ) {
                        var viewProperty = viewModelPropForReqIFProps[ l ].viewModelPropForReqIFLOVPropertyValues[ eventData.reqIfObjectDisplayName ][ m ];
                        viewProperty.lovApi.dataForMapping = viewProps;
                    }
                }
                break;
            }
        }
    }
};

/**
 * Create view model property for all objects
 *
 * @param {Object} data - The view model data
 * @param {Object} reqIFProperties - array of reqIF properties
 * @param {Object} reqIFPropertiesForMapping - array of mapping reqIF properties to append to LOV
 * @param {Object} viewModelPropForReqIFProperties - array of reqIF properties with view model property
 * @param {Object} reqIfObjectName reqIF object name
 *
 */
var _createViewModelPropertyForProperties = function( data, reqIFProperties, reqIFPropertiesForMapping, viewModelPropForReqIFProperties, reqIfObjectName ) {
    for( var index = 0; index < data.getSpecificationMetadataResponse.reqIFTypePropInfos.length; index++ ) {
        var objectType = data.getSpecificationMetadataResponse.reqIFTypePropInfos[ index ].dispTypeName;
        if( objectType === reqIfObjectName ) {
            reqIFPropertiesForMapping[ objectType ] = [];
            var reqIFPropertyList = reqIFProperties[ objectType ];
            var viewProps = [];
            for( var i = 0; i < reqIFPropertyList.length; i++ ) {
                var viewProp = _createViewModelObjectForReqIFProperty( reqIFPropertyList[ i ], objectType );
                viewProp.hasLOVValues = reqIFPropertyList[ i ].hasLOV;
                if( reqIFPropertyList[ i ].hasLOV ) {
                    viewProp.reqIFLovPropertyValuesForMapping = {};
                    viewProp.viewModelPropForReqIFLOVPropertyValues = {};
                    viewProp.viewModelPropForReqIFLOVPropertyValues[ viewProp.propertyDisplayName ] = {};
                }

                viewProp.lovApi = {};
                viewProp.lovApi.dataForMapping = reqIFPropertiesForMapping[ objectType ];
                viewProp.lovApi.requiredPropertiesList = [];
                exports.initNativeCellLovApi( viewProp );
                viewProps.push( viewProp );
            }
            viewModelPropForReqIFProperties[ objectType ] = viewProps;
            break;
        }
    }
};

/**
 * Create view model property for reqIF property
 *
 * @param {Object} dataInfo - data information
 * @param {Object} objectName - objectname of that property
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForReqIFProperty = function( dataInfo, objectName ) {
    var dispPropName = dataInfo.dispPropName;
    return _createViewModelObjectForProperty( dataInfo, dispPropName, objectName );
};

/**
 * Create view model property for teamcenter property
 *
 * @param {Object} dataInfo - data information
 * @param {Object} objectName - objectname of that property
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForTcProperty = function( dataInfo, objectName, data) {
    var dispPropName = dataInfo.dispPropName;
    if( objectName === 'RequirementSpec' && dataInfo.isRequired && dataInfo.propName === 'object_name' ) {
        dispPropName = dataInfo.dispPropName;
    } else if( dataInfo.isRequired && dataInfo.propName !== 'item_revision_id' ) {
        dispPropName = dataInfo.dispPropName + ' ('+ data.i18n.requiredLabel +')';
    }
    return _createViewModelObjectForProperty( dataInfo, dispPropName, objectName );
};

/**
 * Create view model property for data info
 *
 * @param {Object} dataInfo - data information
 *  @param {Object} dispPropName - property display name
 * @param {Object} objectName - objectname of that property
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForProperty = function( dataInfo, dispPropName, objectName ) {
    var viewProp = uwPropertyService.createViewModelProperty( dataInfo.propName, dispPropName, 'STRING', [], [] );
    uwPropertyService.setHasLov( viewProp, true );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEnabled( viewProp, true );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );
    if( objectName ) {
        viewProp.objectName = objectName;
    }
    return viewProp;
};

/**
 * Create view model property for LOV property value
 *
 * @param {Object} propertyValueName - LOV property value name
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForPropertyLOVValue = function( propertyValueName ) {
    var viewProp = uwPropertyService.createViewModelProperty( propertyValueName, propertyValueName, 'STRING', [], [] );
    uwPropertyService.setHasLov( viewProp, true );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEnabled( viewProp, true );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );
    return viewProp;
};

/**
 * Create view model property for data info
 *
 * @param {Object} dataInfo - data information
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForData = function( dataInfo ) {
    var viewProp = uwPropertyService.createViewModelProperty( dataInfo.objectType, dataInfo.dispTypeName, 'STRING', [], [] );

    uwPropertyService.setHasLov( viewProp, true );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEnabled( viewProp, true );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );

    return viewProp;
};

/**
 * Update teamcenter objects with selected reqIF object
 *
 * @param {Object} data - The view model data
 *
 */
var _updateDataForMapping = function( data ) {
    data.typesForMapping = [];
    data.traceLinksForMapping = [];

    // Get selected properties
    for( var i = 0; i < data.typePropInfos.length; i++ ) {
        var typePropInfo = data.typePropInfos[ i ];
        if( typePropInfo.typeInfo !== 'Relation' ) {
            typePropInfo = _createViewModelObjectForData( typePropInfo );
            data.typesForMapping.push( typePropInfo );
        } else {
            typePropInfo = _createViewModelObjectForData( typePropInfo );

            data.traceLinksForMapping.push( typePropInfo );
        }
    }

    // Update types lov with selected propertie
    _updateLOVWithSelectedProperties( data, data.viewModelPropForReqIFTypes, data.typesForMapping );

    // Update trace links  lov with selected properties
    _updateLOVWithSelectedProperties( data, data.viewModelPropForReqIFTraceLinks, data.traceLinksForMapping );

};

/**
 * Update lov with selected properties
 *
 * @param {Object} data - The view model data
 * @param {Array} viewModelPropForReqIFobjects - array of objects with viem model properties
 * @param {Array} dataForMapping - array of data attached to LOV
 *
 */
var _updateLOVWithSelectedProperties = function( data, viewModelPropForReqIFobjects, dataForMapping ) {
    // Update lov with selected properties
    for( var k = 0; k < viewModelPropForReqIFobjects.length; k++ ) {
        var viewProp = viewModelPropForReqIFobjects[ k ];
        viewProp.lovApi.dataForMapping = dataForMapping;
    }
};

/**
 * Find the given property in properties list
 *
 * @param {List} properties - list of selected properties
 * @param {String} propertyRealName - property real name
 * @returns {Boolean} - true, if property exist in the list
 */
var _getPropertyFromList = function( properties, propertyRealName ) {
    for( var index = 0; index < properties.length; index++ ) {
        var property = properties[ index ];
        if( property.propertyName === propertyRealName || property.propInternalValue === propertyRealName ) {
            return property;
        }
    }
    return null;
};

/**
 * Create LOV entries.
 *
 * @param {Object} lovApi - lovApi
 * @param {Array} lovEntries - lovEntries
 *
 */
var _createLovEntries = function( lovApi, lovEntries ) {
    for( var index = 0; index < lovApi.dataForMapping.length; index++ ) {
        var entry = lovApi.dataForMapping[ index ];
        var hasProperty = _getPropertyFromList( lovEntries, entry.propertyName );
        // Avoid duplicate property in list
        if( !hasProperty ) {
            lovEntries.push( {
                propDisplayValue: entry.propertyDisplayName,
                propInternalValue: entry.propertyName,
                propDisplayDescription: '',
                hasChildren: false,
                children: {},
                sel: false,
                isRequired: entry.isRequired
            } );
        }
    }
};

/**
 * Sort the teamcenter properties using IsRequired property.
 *
 * @param {Object} list - List to sort
 */
var _sortTcPropsListUsingIsRequiredProp = function( list ) {
    if( list && list.length > 0 ) {
        list.sort( function( a, b ) {
            // true values first
            if( a.propName === 'item_revision_id' ) {
                return 0;
            }
            return a.isRequired === b.isRequired ? 0 : a.isRequired ? -1 : 1;
        } );
    }
};

/**
 * Get input data to show existing mapping or to Import new mapping from ReqIF
 *
 * @param {Object} data - The view model data
 *
 * @return {object} reqIfAttributeMappingInfos
 */
var _getReqIFImportInput = function( data ) {
    data.reqIfAttributeMappingInfos = [];
    if( data && data.viewModelPropForReqIFTypes && data.viewModelPropForReqIFTypes.length > 0 ) {
        _createReqIFAttributeMapForImport( data, data.viewModelPropForReqIFTypes );
    }
    if( data && data.viewModelPropForReqIFTypes && data.viewModelPropForReqIFTraceLinks.length > 0 ) {
        _createReqIFAttributeMapForImport( data, data.viewModelPropForReqIFTraceLinks );
    }
    var mappingData = _.cloneDeep( data.reqIfAttributeMappingInfos );
    return mappingData;
};

/**
 * Clear display name map to ReqIF types/traceLinks
 *
 * @param {Object} viewModelPropForReqIFTypes - The view model property of reqIF types
 */

var _clearReqIFTypesDisplayValue = function( viewModelPropForReqIFTypes ) {
    for( var index = 0; index < viewModelPropForReqIFTypes.length; index++ ) {
        viewModelPropForReqIFTypes[ index ].dbValue = [];
        viewModelPropForReqIFTypes[ index ].uiValue = '';
    }
};

export default exports = {
    resetReqIFImportData,
    initImportReqIFMappingsData,
    initImportReqIFMappingLovApi,
    clearAllReqIFData,
    removeAllMappings,
    getRuleObjectForSelection,
    populateRulesFromSavedMappingName,
    hideImportReqIFSaveMappingVisiblity,
    selectedObjectToImport,
    getBaseURL,
    createTypesRelationsMap,
    initTypeRelationsData,
    initNativeCellLovApi,
    validateMapping,
    getNewReqIFImportInput,
    registerReqIFData,
    unRegisterReqIFData,
    setCmdDimensionForBallonPopup,
    saveImportReqIFMappingPopupButtonClicked,
    updateImportReqIFMapping,
    createSaveImportReqIFMappingInput,
    importReqIFcontentUnloaded,
    mapReqIFToTcProps,
    mapReqIFToTcLovValues,
    importReqIFRuleSelectionChangeInListBox
};
/**
 * Arm0ImportFromReqIF panel service utility
 *
 * @memberof NgServices
 * @member Arm0ImportFromReqIF
 */
app.factory( 'Arm0ImportFromReqIF', () => exports );
