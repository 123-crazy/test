/* eslint-disable max-lines */
// @<COPYRIGHT>@
// ==================================================
// Copyright 2020.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/**
 * Module for the Import BOM panel
 *
 * @module js/importBOMService
 */

import app from 'app';
import msgSvc from 'js/messagingService';
import uwPropertyService from 'js/uwPropertyService';
import appCtxSvc from 'js/appCtxService';
import notyService from 'js/NotyModule';
import eventBus from 'js/eventBus';
import importPreviewSetActionOnLine from 'js/importPreviewSetActionOnLine';
import localeService from 'js/localeService';
import _ from 'lodash';
import 'js/listBoxService';
import AwPromiseService from 'js/awPromiseService';

let exports = {};
let parentData = {};

let ADD_NEW_INTERNAL = 'add_new';

/**
 * It disables Import Structure button in panel when import operation is in progress.
 *
 * @param {Object} ctx - The global context object
 */
export let registerExcelData = function( ctx ) {
    ctx.awb0ImportFromExcelProgressing = true;
};


/**
 * This API reset awb0ImportFromExcelProgressing flag in context to make
 * sure Import Structure button gets enabled whenever import operation fails.
 *
 * @param {Object} ctx - The global context object
 */
export let enableImportStructureButtonInPanel = function( ctx ) {
    ctx.awb0ImportFromExcelProgressing = false;
};

/**
 * Unregister the flags from view model data for excel import
 *
 * @param {Object} ctx - The global context object
 */
export let unRegisterExcelData = function( ctx ) {
    ctx.awb0ImportFromExcelProgressing = false;
    delete appCtxSvc.ctx.isAwb0ImportButtonIsVisible;
    if( appCtxSvc.ctx.isAwb0ImportFromExcelSubPanelActive ) {
        delete appCtxSvc.ctx.isAwb0ImportFromExcelSubPanelActive;
    }
};

/**
 * Updates view model according to file selected
 * @param {Object} fileData - Data of selected file
 * @param {Object} ctx - The global context object
 *
 */
export let updateFormData = function( fileData, ctx ) {
    if( fileData && fileData.value !== '' ) {
        // In Preview mode, on choosing a different input file, unregister preview context
        let importBOMContext = appCtxSvc.getCtx( 'ImportBOMContext' );
        if( importBOMContext !== undefined && importBOMContext.fileName !== fileData ) {
            appCtxSvc.unRegisterCtx( 'ImportBOMContext' );
            eventBus.publish( 'importBOM.resetExcelImportData' );
        } else if( appCtxSvc.ctx.isAwb0ImportFromExcelSubPanelActive ) {
            eventBus.publish( 'importBOM.resetExcelImportData' );
        }
        let file = fileData.value;
        let filext = file.substring( file.lastIndexOf( '.' ) + 1 );
        if( filext ) {
            if( filext === 'xlsx' || filext === 'xlsm' ) {
                unRegisterExcelData( ctx );
                if( !appCtxSvc.ctx.isAwb0ImportFromExcelSubPanelActive ) {
                    appCtxSvc.registerCtx( 'isAwb0ImportFromExcelSubPanelActive', true );
                }
            } else {
                let resource = 'OccmgmtImportExportConstants';
                let localTextBundle = localeService.getLoadedText( resource );
                let localizedMsg = localTextBundle.invalidFileExtension;
                msgSvc.showError( localizedMsg );
            }
        }
    }
};

/**
 * Reset Data from import from excel panel.
 *
 * @param {Object} data - The view model data
 *
 */
export let resetExcelImportData = function( data ) {
    data.isValidMapping = false;
    data.showPropertiesMap = false;
    data.columnHeaders = [];
    data.typePropInfos = [];
    data.secTypePropInfos = [];
    data.objectSubTypes = [];
    data.propertiesForMapping = [];
    data.viewModelPropertiesForHeader = [];
    data.propertiesToSelect = {};
    data.mappingGroup.dbValue = '';
    data.mappingGroup.uiValue = '';
    data.mappingGroup.dbValues = '';
    data.mappingGroup.uiValues = '';
    data.mappingGroup.dbOriginalValue = '';
    data.mappingGroup.uiOriginalValue = '';
};

/**
 * Reset Header data in panel.
 *
 * @param {Object} data - The view model data
 * @param {Object} ctx - The global context object
 *
 */
export let resetHeader = function( data, ctx ) {
    if( data.activeView === 'Awb0ImportFromExcelSub' && data.mappingGroup.dbValue === '' &&
        data.viewModelPropertiesForHeader && data.viewModelPropertiesForHeader.length > 0 ) {
        //reset the header columns only when user have given any name to saved mapping
        //and then clears it out.
        if( data.mappingGroup.dbOriginalValue !== undefined && data.mappingGroup.dbOriginalValue !== '' ) {
            for( let index = 0; index < data.viewModelPropertiesForHeader.length; index++ ) {
                let viewProp = data.viewModelPropertiesForHeader[ index ];
                    _resetViewModelPropertyValue( viewProp );
            }
        }
        _resetViewModelPropertyValue( data.mappingGroup );
    } else if( ctx.sublocation.clientScopeURI === 'Awb0ImportPreview' ) {
        getImportPreviewData( data );
    }
};

/**
 * This API appends "(Required)" into display name if property is a required.
 * @param {*} propInfo property info
 * @param {*} objectTypeInfo object type info
 * @param {*} required data
 */
let appendRequiredStringForRequiredProperty = function( propInfo, objectTypeInfo, required ) {
    if( propInfo.isRequired ) {
        if( propInfo.isSecondaryObject ) {
            return objectTypeInfo.propDisplayValue + ':' + propInfo.dispPropName + required;
        }
        return propInfo.dispPropName + required;
    }
    return propInfo.dispPropName;
};

/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
let createViewModelObjectForProperty = function( data, objectTypeInfo, propInfo ) {
    let dispPropName = appendRequiredStringForRequiredProperty( propInfo, objectTypeInfo, data.i18n.required );
    let viewProp = uwPropertyService.createViewModelProperty( objectTypeInfo.propInternalValue + '.' + propInfo.realPropName, dispPropName, 'BOOLEAN', [], [] );
    if( propInfo.isSecondaryObject ) {
        viewProp.isSecondaryObject = propInfo.isSecondaryObject;
    }
    uwPropertyService.setIsRequired( viewProp, propInfo.isRequired );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );
    uwPropertyService.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
    if( viewProp.isRequired ) {
        uwPropertyService.setValue( viewProp, true );
        uwPropertyService.setIsEnabled( viewProp, false );
    } else {
        uwPropertyService.setValue( viewProp, false );
        uwPropertyService.setIsEnabled( viewProp, true );
    }
    // attributes required to show property in lov
    viewProp.propDisplayValue = viewProp.propertyDisplayName;
    viewProp.propInternalValue = viewProp.propertyName;
    return viewProp;
};

/**
 * API created the Right side labels of our panel
 * @param {*} data - The view model data
 */
let createPropertyLabelsOnTheRight = function( data ) {
    for( let index = 0; index < data.typePropInfos.length; index++ ) {
        let typePropInfo = data.typePropInfos[ index ];
        let objectType = {
            propDisplayValue: typePropInfo.dispTypeName,
            propInternalValue: typePropInfo.objectType
        };
        data.objectSubTypes.push( objectType );
        let propInfos = typePropInfo.propInfos;
        for( let propInfoIdx = 0; propInfoIdx < propInfos.length; propInfoIdx++ ) {
            propInfos[ propInfoIdx ] = createViewModelObjectForProperty( data, objectType, propInfos[ propInfoIdx ] );
        }
        _sortBooleanList( propInfos );
    }
};

/**
 * If index is 0 then prop Info is a primary object and if it is 1 then it is secondary object
 * @param {*} propInfo property info
 * @param {*} typeInfo type Info object
 * @param {*} index index of response array
 */
let setObjectTypeOnObject = function( propInfo, typeInfo, index ) {
    switch ( index ) {
        case 1:
            if( propInfo ) {
                propInfo.isSecondaryObject = true;
            }
            if( typeInfo ) {
                _.forEach( typeInfo.propInfos, function( propInfo ) {
                    propInfo.isSecondaryObject = true;
                } );
            }
            break;
    }
};

/**
 * Create view model property for the header
 *
 * @param {Object} header - Header string
 * @returns {Object} viewModelObject - view model object for the given header
 */
let createViewModelPropertyForHeader = function( header ) {
    // Create the Viewmodel property for the given attribute type.
    let viewProp = uwPropertyService.createViewModelProperty( header, header, 'STRING', [], [] );
    viewProp.editLayoutSide = true;
    uwPropertyService.setHasLov( viewProp, true );
    uwPropertyService.setIsArray( viewProp, false );
    uwPropertyService.setIsEnabled( viewProp, true );
    uwPropertyService.setIsEditable( viewProp, true );
    uwPropertyService.setIsNull( viewProp, false );
    uwPropertyService.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_SIDE' );
    return viewProp;
};

/**
 * Populates following on data from server response.
 * 1) Type prop info
 * 2) Column Headers
 * 3) Secondary column headers
 * 4) Secondary type prop Info
 * @param {*} data data received from server
 */
let populatePropInfoAndTypeInfoMap = function( data ) {
    for( let index = 0; index < data.mappingGroupResponse.mappingOutputs.length; index++ ) {
        let mappingOutput = data.mappingGroupResponse.mappingOutputs[ index ];
        _.forEach( mappingOutput.propInfos, function( propInfo ) {
            setObjectTypeOnObject( propInfo, undefined, index );
            let viewProp = createViewModelPropertyForHeader( propInfo.propHeader );
            if( propInfo.isSecondaryObject ) {
                viewProp.isSecondaryObject = propInfo.isSecondaryObject;
            }
            data.viewModelPropertiesForHeader.push( viewProp );
            data.columnHeaders.push( propInfo.propHeader );
        } );
        _.forEach( mappingOutput.typePropInfos, function( typePropInfo ) {
            setObjectTypeOnObject( undefined, typePropInfo, index );
            data.typePropInfos.push( typePropInfo );
        } );
        if( index === 1 ) {
            _.forEach( mappingOutput.typePropInfos, function( typePropInfo ) {
                data.secTypePropInfos.push( typePropInfo );
            } );
        }
    }
};

/**
 * Update Properties with selected properties
 * @param {Object} data - The view model data
 */
let updatePropertiesForMapping = function( data ) {
    data.propertiesForMapping = [];
    // Get selected properties
    for( let typePropInfoIndex = 0; typePropInfoIndex < data.typePropInfos.length; typePropInfoIndex++ ) {
        let typePropInfo = data.typePropInfos[ typePropInfoIndex ];
        let propInfos = typePropInfo.propInfos;
        for( let propInfoIndex = 0; propInfoIndex < propInfos.length; propInfoIndex++ ) {
            let propInfo = propInfos[ propInfoIndex ];
            // Add required/selected properties to the list
            if( propInfo.dbValue ) {
                data.propertiesForMapping.push( propInfo );
            }
        }
    }
    // Update lov with selected properties
    for( let index = 0; index < data.viewModelPropertiesForHeader.length; index++ ) {
        let viewProp = data.viewModelPropertiesForHeader[ index ];
        viewProp.lovApi.propertiesForMapping = data.propertiesForMapping;
    }
};

/**
 * API process server response and populates all the maps it required for validation and processing od request
 * Get headers and properties from response data.
 * @param {Object} data - The view model data
 */
export let createPropertiesMap = function( data ) {
    parentData = data;
    data.showPropertiesMap = true;
    data.columnHeaders = [];
    data.typePropInfos = [];
    data.secTypePropInfos = [];
    data.objectSubTypes = [];
    data.propertiesForMapping = [];
    data.viewModelPropertiesForHeader = [];
    if( data.mappingGroupResponse.mappingOutputs[ 0 ].propInfos.length === 0 ) {
        data.columnHeaders = _.clone( data.mappingGroupResponse.columnHeaders, true );
    }
    populatePropInfoAndTypeInfoMap( data );
    // Create view model properties for properties
    createPropertyLabelsOnTheRight( data );
    exports.initMappingCellLovApi( data );
    _.forEach( data.viewModelPropertiesForHeader, function( propHeader ) {
        exports.initNativeCellLovApi( data, propHeader );
    } );
    updatePropertiesForMapping( data );
};

/**
 * Everytime we load new mapping, we need to destroy existing header view model properties and recreate them
 * to make sure UI works consistently.
 * @param {*} data - The view model data
 */
let destroyExistingVMOAndReCreateVMOForHeaders = function( data ) {
    let newViewModelPropertiesForHeader = [];
    for( let index = 0; index < data.columnHeaders.length; index++ ) {
        let header = data.columnHeaders[ index ];
        let viewProp = createViewModelPropertyForHeader( header );
        viewProp.isSecondaryObject = data.viewModelPropertiesForHeader[ index ].isSecondaryObject;
        initNativeCellLovApi( data, viewProp );
        newViewModelPropertiesForHeader.push( viewProp );
    }
    data.viewModelPropertiesForHeader = newViewModelPropertiesForHeader;
};

/**
 * API reads server response and populates all the saved mapping values in LOV view model properties.
 * @param {Object} data - The view model data
 */
let populateValueInLOVFromServerResponse = function( data ) {
    for( let headerVMOIndex = 0; headerVMOIndex < data.viewModelPropertiesForHeader.length; headerVMOIndex++ ) {
        let headerViewModelProp = data.viewModelPropertiesForHeader[ headerVMOIndex ];
        for( let mappingOutputIndex = 0; mappingOutputIndex < data.mappingGroupResponse.mappingOutputs.length; mappingOutputIndex++ ) {
            let mappingOutput = data.mappingGroupResponse.mappingOutputs[ mappingOutputIndex ];
            for( let mappingOutputPropInfoIndex = 0; mappingOutputPropInfoIndex < mappingOutput.propInfos.length; mappingOutputPropInfoIndex++ ) {
                let propInfoFromResp = mappingOutput.propInfos[ mappingOutputPropInfoIndex ];
                if( headerViewModelProp.propertyName === propInfoFromResp.propHeader ) {
                    headerViewModelProp.dbValue = propInfoFromResp.realPropName;
                    headerViewModelProp.uiValue = propInfoFromResp.dispPropName;
                    break;
                }
            }
        }
    }
};

/**
 * API iterates over all the header view model properties and set modifiablity flag as per server response.
 * @param {*} data - The view model data
 */
let setModifiabilityOnHeaderVMProp = function( data ) {
    for( let indexOfHeaderVMP = 0; indexOfHeaderVMP < data.viewModelPropertiesForHeader.length; indexOfHeaderVMP++ ) {
        data.viewModelPropertiesForHeader[ indexOfHeaderVMP ].isEnabled = data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups[ 0 ].isModifiable;
    }
};

/**
 * This API takes value from server property info and populates them in corresponding header property info. If populated property is required then we add
 * (Required) string in its label.
 *
 * @param {*} propInfo : This prop info comes from type Prop info list. It has all the meta data of all the properties of loaded business objects
 * @param {*} data : data on panel which contains header vm properties.
 * @param {*} propInfoComingFromServer propInfo coming from server which could have value which needs to be populated in header view model property
 */
function updateValuesInHeaderVMOAsPerValuesComingFromServer( propInfo, data, propInfoComingFromServer ) {
    if( propInfo.isRequired ) {
        for( let headerVMPropIndex = 0; headerVMPropIndex < data.viewModelPropertiesForHeader.length; headerVMPropIndex++ ) {
            let headerVMProp = data.viewModelPropertiesForHeader[ headerVMPropIndex ];
            if( headerVMProp.uiValue === propInfoComingFromServer.dispPropName ) {
                // Add required/selected properties to the list
                headerVMProp.uiValue += data.i18n.required;
            }
        }
    }
}

/**
 * API checks whether incoming property already exist in propertiesForMapping map or not. If it exists then we do not add it otherwise we
 * add it in properties for mapping array.
 * @param {*} data Import panels data
 * @param {*} propInfoFromTypeInfoMap propInfo which need to be added it already not available in propertiesForMapping map.
 */
let updateDataPropertyMapping = function( data, propInfoFromTypeInfoMap ) {
    let isPropExist = true;
    for( let index = 0; index < data.propertiesForMapping; index++ ) {
        let existingProperty = data.propertiesForMapping[ index ];
        if( _.isEqual( existingProperty.propertyName, propInfoFromTypeInfoMap.propertyName ) ) {
            isPropExist = false;
            break;
        }
    }
    if( isPropExist ) {
        data.propertiesForMapping.push( propInfoFromTypeInfoMap );
    }
};

/**
 * API searches for all required properties and adds Required String in their ui value.
 * @param {Object} data - The view model data
 */
let processUIValuesOfAllReqPropsInLOV = function( data ) {
    for( let mappingOutputIndex = 0; mappingOutputIndex < data.mappingGroupResponse.mappingOutputs.length; mappingOutputIndex++ ) {
        let mappingOutput = data.mappingGroupResponse.mappingOutputs[ mappingOutputIndex ];
        for( let typePropInfoIndex = 0; typePropInfoIndex < data.typePropInfos.length; typePropInfoIndex++ ) {
            let typePropInfo = data.typePropInfos[ typePropInfoIndex ];
            let propInfos = typePropInfo.propInfos;
            for( let propInfoIndexForMappingOut = 0; propInfoIndexForMappingOut < mappingOutput.propInfos.length; propInfoIndexForMappingOut++ ) {
                for( let propInfoIndex = 0; propInfoIndex < propInfos.length; propInfoIndex++ ) {
                    let propInfoFromTypeInfoMap = propInfos[ propInfoIndex ];
                    let propInfoFromServer = mappingOutput.propInfos[ propInfoIndexForMappingOut ];
                    if( propInfoFromServer.realPropName === propInfoFromTypeInfoMap.propInternalValue ) {
                        propInfoFromTypeInfoMap.dbValue = true;
                        updateDataPropertyMapping( data, propInfoFromTypeInfoMap );
                        updateValuesInHeaderVMOAsPerValuesComingFromServer( propInfoFromTypeInfoMap, data, propInfoFromServer );
                        break;
                    }
                }
            }
        }
    }
};

/**
 * Get Mappings for the group selected
 *
 * @param {Object} data - The view model data
 *
 */
export let populateMappingInfoForGroup = function( data ) {
    if( data.mappingGroupResponse.mappingOutputs.length > 0 && data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups.length > 0 ) {
        if( data.mappingGroup.dbValue === data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups[ 0 ].dispName ) {
            destroyExistingVMOAndReCreateVMOForHeaders( data );
            populateValueInLOVFromServerResponse( data );
            processUIValuesOfAllReqPropsInLOV( data );
            setModifiabilityOnHeaderVMProp( data );
            parentData = data;
            let allRequiredPropMapped = doesCurrentMappingHaveAllReqProps();
            appCtxSvc.ctx.isAwb0ImportButtonIsVisible = allRequiredPropMapped;
        }
    }
};

/**
 * Get input data for Import from Excel
 *
 * @param {Object} data - The view model data
 */
export let getExcelImportInput = function( data, ctx ) {
    exports.registerExcelData( ctx );
    data.runInBackgroundOptionForExcel = [];
    let mappingGroupData = {
        groupName: {
            realName: '',
            dispName: '',
            isModifiable: true
        },
        mappingInfo: [],
        actionName: ''
    };
    let mappingGroupData1 = mappingGroupData;
    let mappingInfo = [];

    if( data.mappingGroup.dbValue ) {
        mappingGroupData.groupName.realName = data.mappingGroup.dbValue;
        mappingGroupData.groupName.dispName = data.mappingGroup.dbValue;
    }
    let typeMapInfos = {};
    for( let index = 0; index < data.viewModelPropertiesForHeader.length; index++ ) {
        let viewProp = data.viewModelPropertiesForHeader[ index ];
        if( viewProp.dbValue && !_.isArray( viewProp.dbValue ) ) {
            let dispProp = viewProp.uiValue.replace( data.i18n.required, '' );
            let dbValue = viewProp.dbValue.split( '.' );
            let propertyName = viewProp.dbValue;
            let type = '';
            if( dbValue.length === 2 ) {
                propertyName = dbValue[ 1 ];
                type = dbValue[ 0 ];
            }
            let prop = {
                propHeader: viewProp.propertyName,
                realPropDisplayName: dispProp,
                realPropName: propertyName,
                isRequired: false
            };
            if( dispProp !== viewProp.uiValue ) {
                prop.isRequired = true;
            }
            let propInfos = [];
            if( typeMapInfos && typeMapInfos[ type ] ) {
                propInfos = typeMapInfos[ type ];
            }
            propInfos.push( prop );

            let propForMapping = {
                propHeader: viewProp.propertyName,
                realPropDisplayName: dispProp,
                realPropName: viewProp.dbValue,
                isRequired: false
            };
            mappingInfo.push( propForMapping );
            typeMapInfos[ type ] = propInfos;
        }
    }

    data.headerPropertyMapping = typeMapInfos;
    data.mappedGroupData = mappingGroupData;

    let runInBackgroundOption = 'RunInBackground';

    data.actionInfo = {};
    if( _.isEqual( ctx.sublocation.clientScopeURI, 'Awb0ImportPreview' ) ) {
        importPreviewSetActionOnLine.populateActionInfoMapForImportSOAInput( data );
    }

    if( !data.runInBackgroundExcel.dbValue ) {
        runInBackgroundOption = '';
        exports.registerExcelData( ctx );
    }

    data.runInBackgroundOptionForExcel.push( runInBackgroundOption );

    if( mappingGroupData.groupName.dispName ) {
        mappingGroupData.mappingInfo = mappingInfo;
        if( mappingGroupData.actionName === '' ) {
            mappingGroupData.actionName = _getActionNameForMapping( data, mappingGroupData );
        }
        data.mappedGroupData = mappingGroupData;
        if( data.mappedGroupData.actionName === 'UPDATE' ) {
            _showUpdateNotificationWarning( data );
            return;
        } else if( mappingGroupData.actionName === '' ) {
            data.mappedGroupData = mappingGroupData1;
        }
    }

    eventBus.publish( 'importBOM.importFromExcel' );
};

/**
 * Get ActionName For Mapping
 *
 * @param {Object} data - The view model data
 *
 */
let _getActionNameForMapping = function( data, mappingGroupData ) {
    let headerCount = 0;
    let mappingInfo = {};
    let mappingOutputs = {};
    mappingGroupData.actionName = 'ADD';
    if( data.mappingGroup.lovApi.propertiesForMapping.length > 0 ) {
        for( let j = 0; j < data.mappingGroup.lovApi.propertiesForMapping.length; j++ ) {
            if( data.mappingGroup.dbValue === data.mappingGroup.lovApi.propertiesForMapping[ j ].dispName ) {
                mappingGroupData.actionName = '';
                break;
            }
        }
    }
    if( mappingGroupData.actionName === '' && data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups.length === 1 &&
        data.mappingGroup.dbValue === data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups[ 0 ].dispName ) {
        if( data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups[ 0 ].isModifiable ) {
            mappingGroupData.actionName = 'UPDATE';
            for( let j = 0; j < data.mappingGroupResponse.mappingOutputs[ 0 ].propInfos.length; j++ ) {
                for( let k = 0; k < mappingGroupData.mappingInfo.length; k++ ) {
                    mappingInfo = mappingGroupData.mappingInfo[ k ];
                    mappingOutputs = data.mappingGroupResponse.mappingOutputs[ 0 ].propInfos[ j ];
                    if( mappingInfo.propHeader === mappingOutputs.propHeader ) {
                        headerCount++;
                        mappingGroupData.actionName = '';
                        if( mappingInfo.realPropName !== mappingOutputs.realPropName ||
                            mappingInfo.realPropDisplayName !== mappingOutputs.dispPropName ) {
                            mappingGroupData.actionName = 'UPDATE';
                            break;
                        }
                    }
                }
            }
        } else if( data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups[ 0 ].isModifiable === false ) {
            mappingGroupData.actionName = '';
        }
    }
    if( headerCount !== 0 &&
        ( headerCount < data.mappingGroupResponse.mappingOutputs[ 0 ].propInfos.length || headerCount < mappingGroupData.mappingInfo.length ) ) {
        mappingGroupData.actionName = 'UPDATE';
    }
    return mappingGroupData.actionName;
};

/**
 * Show leave warning message
 *
 * @param {Object} data - The view model data
 */
let _showUpdateNotificationWarning = function( data ) {
    let mappingGroupData = {
        groupName: {
            realName: '',
            dispName: '',
            isModifiable: true
        },
        mappingInfo: [],
        actionName: ''
    };

    let msg = data.i18n.notificationForUpdateMsg.replace( '{0}', data.mappedGroupData.groupName.dispName );
    let buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
            data.mappedGroupData = mappingGroupData;
            eventBus.publish( 'importBOM.importFromExcel' );
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.update,
        onClick: function( $noty ) {
            $noty.close();
            eventBus.publish( 'importBOM.importFromExcel' );
        }
    } ];

    notyService.showWarning( msg, buttons );
};

/**
 * Sort the boolean list. True values first
 *
 * @param {Object} list - List to sort
 */
let _sortBooleanList = function( list ) {
    list.sort( function( a, b ) {
        // true values first
        return a.isRequired === b.isRequired ? 0 : a.isRequired ? -1 : 1;
    } );
};
/**
 * Find the given property in properties list
 *
 * @param {List} properties - list of selected properties
 * @param {String} propName - property display name
 * @returns {Boolean} - true, if property exist in the list
 */
let _getPropertyFromList = function( properties, propName ) {
    for( let index = 0; index < properties.length; index++ ) {
        let property = properties[ index ];
        if( property.propertyDisplayValue === propName || property.propDisplayValue === propName.propertyDisplayName ) {
            return property;
        }
    }
    return null;
};

/**
 * Add the 'lovApi' function on mapping field.
 * @param {Object} data - The view model data
 */
export let initMappingCellLovApi = function( data ) {
    data.mappingGroup.lovApi = {};
    data.mappingGroup.lovApi.propertiesForMapping = data.mappingGroupResponse.mappingOutputs[ 0 ].mappingGroups;
    data.mappingGroup.lovApi.requiredPropertiesList = [];

    data.mappingGroup.lovApi.getInitialValues = function( filterStr, deferred, name ) {
        let lovEntries = _.clone( this.requiredPropertiesList, true );
        if( this.propertiesForMapping ) {
            // First add the all required properties from all subTypes
            for( let index = 0; index < this.propertiesForMapping.length; index++ ) {
                let entry = this.propertiesForMapping[ index ];

                let hasProperty = _getPropertyFromList( lovEntries, entry );
                // Avoid duplicate property in list
                if( !hasProperty ) {
                    lovEntries.push( {
                        propDisplayValue: entry.realName,
                        propInternalValue: entry.dispName
                    } );
                }
            }
        }
        return deferred.resolve( lovEntries );
    };
    data.mappingGroup.lovApi.validateLOVValueSelections = function( values ) {
        let idxOfUserTextInMapping = -1;
        if( data.mappingGroup.dbValue !== '' ) {
            // If a saved mapping was selected first and then the mapping name edited
            // then we want to pickup 'dbValues[0]' value instead of 'dbValue'
            if( data.mappingGroup.dbValues !== '' && data.mappingGroup.dbValues[0] !== data.mappingGroup.dbValue
                && data.mappingGroup.dbValues[0] !== data.mappingGroup.dbOriginalValue ) {
                values[0].propDisplayValue = data.mappingGroup.dbValues[0];
                values[0].propInternalValue = data.mappingGroup.dbValues[0];
            }
            // If user has typed in value then we need to know if it is valid
            idxOfUserTextInMapping = _.findIndex( data.mappingGroup.lovApi.propertiesForMapping,
                function( mapping ) { return mapping.realName === values[0].propInternalValue; }
            );
            if( idxOfUserTextInMapping !== -1 ) {
                // if user entered invalid value and then selected one of the valid values on drop down then data.mappingGroup
                // retains both data - previously entered text as well as the newly selected values
                // hence it is better to clear the dbValues bucket so that we can differentiate in the next call
                data.mappingGroup.dbValues = '';
                eventBus.publish( 'importBOM.populateMappingGroups' );
            } else {
                // If user has entered an invalid value then keep showing it in the drop down and do not update any mappings
                // this is just to support the case where user is creating a new saved mapping and hit Enter by mistake
                data.mappingGroup.uiValue = data.mappingGroup.uiValues[ 0 ];
                data.mappingGroup.dbValue = data.mappingGroup.dbValues[ 0 ];
            }
        } else {
            // parentData and data are references of the same object so only need to clear one
            destroyExistingVMOAndReCreateVMOForHeaders( parentData );
        }

        let allRequiredPropMapped = doesCurrentMappingHaveAllReqProps();
        appCtxSvc.ctx.isAwb0ImportButtonIsVisible = allRequiredPropMapped;
        return false;
    };

    data.mappingGroup.lovApi.getNextValues = function( deferred ) {
        // LOVs do not support paging.
        deferred.resolve( null );
    };
};

/**
 * This API checks whether all required properties of business object have been mapped to the properties of excel header or not.
 * This API will return true only if all required properties have been mapped. Otherwise it will return false.
 * @param {*} propForMapping
 * NOTE : While doing the mapping, we need to take care of secondary objects as well. We have cases where we properties on secondar object
 * and primary object have same names. In that case to avoid confusion about which property has been filled and which one has not
 * we need use the business object type as well.
 */
let isCurrentRequiredPropHasBeenMappedWithExcelHeader = function( propForMapping ) {
    let propertyName = propForMapping.propertyName.split( '.' )[ 1 ];
    let propertyTypeFromMapping = undefined;
    if( propForMapping.isSecondaryObject ) {
        propertyTypeFromMapping = propForMapping.propertyName.split( '.' )[ 0 ];
    }
    let flag = false;
    for( let indexExcelHeaders = 0; indexExcelHeaders < parentData.viewModelPropertiesForHeader.length; indexExcelHeaders++ ) {
        let excelHeader = parentData.viewModelPropertiesForHeader[ indexExcelHeaders ];
        if( excelHeader.dbValue.length > 0 ) {
            let propNameOfExcelHeader = excelHeader.dbValue.split( '.' )[ 1 ];
            let propTypeOfExcelHeader = excelHeader.dbValue.split( '.' )[ 0 ];
            let isPropMappedCondition = _.isUndefined( propertyTypeFromMapping ) ? _.isEqual( propNameOfExcelHeader, propertyName ) && !excelHeader.isSecondaryObject :
                excelHeader.isSecondaryObject && _.isEqual( propTypeOfExcelHeader, propertyTypeFromMapping ) &&
                _.isEqual( propNameOfExcelHeader, propertyName );
            if( isPropMappedCondition ) {
                flag = true;
            }
        }
    }
    return flag;
};

/**
 * This API Return true when all required properties are mapped to some excel header property and Import opeation can happen
 * otherwise return false which hides Import Strcuture buttong in UI.
 * @returns {Boolean} - true, if all required properties are mapped
 *
 */
let doesCurrentMappingHaveAllReqProps = function() {
    for( let indexForPropsForMapping = 0; indexForPropsForMapping < parentData.propertiesForMapping.length; indexForPropsForMapping++ ) {
        let propForMapping = parentData.propertiesForMapping[ indexForPropsForMapping ];
        if( propForMapping.isRequired && propForMapping.propertyName ) {
            if( !isCurrentRequiredPropHasBeenMappedWithExcelHeader( propForMapping ) ) {
                return false;
            }
        }
    }
    return true;
};

/**
 * Fire an event to navigate to the Add Properties panel
 */
let _navigateToAddNewPropertiesPanel = function() {
    // Clone the properties data
    parentData.typePropInfosToAddProperties = _.clone( parentData.typePropInfos, true );

    let destPanelId = 'Awb0AddPropertiesSub';
    let activePanel = parentData.getSubPanel( parentData.activeView );
    if( activePanel ) {
        activePanel.contextChanged = true;
    }

    let context = {
        destPanelId: destPanelId,
        title: parentData.i18n.addProperties,
        supportGoBack: true,
        recreatePanel: true
    };

    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Adds property to the array of it is not already available in the passed array.
 * @param {*} arrayOfProps Array of properties
 * @param {*} vmProp : View Model Property
 */
let addPropertyValueToArray = function( arrayOfProps, vmProp ) {
    let hasProperty1 = _getPropertyFromList( arrayOfProps, vmProp );
    // Avoid duplicate property in list
    if( !hasProperty1 ) {
        arrayOfProps.push( {
            propDisplayValue: vmProp.propertyDisplayName,
            propInternalValue: vmProp.propertyName,
            isRequired: vmProp.isRequired
        } );
    }
};

/**
 * Populates array of properties based on addRequiredPropOnly flag. If true then all the required properties would be added.
 * Else we will add all non required properties added by the user through "Add New..." command.
 * @param {*} lovApi LOV API object coming from framework
 * @param {*} arrayOfProps array of properties which needs to be populated
 * @param {*} addRequiredPropOnly flag which tell whether only required properties need to be added in the list or not.
 */
let populatePropsForLOVWidget = function( lovApi, arrayOfProps, addRequiredPropOnly ) {
    for( let index = 0; index < lovApi.propertiesForMapping.length; index++ ) {
        let vmProp = lovApi.propertiesForMapping[ index ];
        if( addRequiredPropOnly && vmProp.isRequired ) {
            addPropertyValueToArray( arrayOfProps, vmProp );
        } else if( !addRequiredPropOnly && !vmProp.isRequired ) {
            addPropertyValueToArray( arrayOfProps, vmProp );
        }
    }
};

/**
 * Reset ViewModelProperty Value
 *
 * @param {ViewModelProperty} viewProp - view model property
 */
let _resetViewModelPropertyValue = function( viewProp ) {
    viewProp.displayValues = [ '' ];
    viewProp.uiValue = '';
    viewProp.dbValue = '';
    viewProp.dbValues = '';
    viewProp.uiValues = '';
    viewProp.isEnabled = true;
    viewProp.lovNoValsText = '';
};

/**
 * Sorts list in alphabetical order of display name of properties.
 * @param {*} propA First Property
 * @param {*} propB econd property
 */
let sortLOVEntries = function( propA, propB ) {
    let displayNameOfPropA = propA.propDisplayValue.toUpperCase();
    let displayNameOfPropB = propB.propDisplayValue.toUpperCase();
    if( displayNameOfPropA < displayNameOfPropB ) {
        return -1;
    }
    if( displayNameOfPropA > displayNameOfPropB ) {
        return 1;
    }
    return 0;
};

/**
 * API populates required properties in LOV entries and sort the list alphabetically if requiredPropOnly is true
 * else populates not required props.
 * @param {*} lovAPI
 * @param {*} lovEntries lov entries
 * @param {*} requiredPropOnly :  If true then only required props will be added. If false then only non required props will be added
 * @param {*} requiredPropertiesList : list of required properties in LOV widget.
 */
let populatePropsToLOVAndSort = function( lovApi, lovEntries, requiredPropOnly, requiredPropertiesList ) {
    let props = [];
    populatePropsForLOVWidget( lovApi, props, requiredPropOnly );
    if( requiredPropOnly && requiredPropertiesList.length === 0 ) {
        requiredPropertiesList = _.clone( props, true );
    }
    props.sort( sortLOVEntries );
    _.forEach( props, function( prop ) {
        lovEntries.push( {
            propDisplayValue: prop.propDisplayValue,
            propInternalValue: prop.propInternalValue,
            isRequired: prop.isRequired
        } );
    } );
};

/**
 * Add the 'lovApi' function on LOV widget which are going to be used to map properties.
 * @param {data} data - The view model data
 * @param {ViewModelProperty} viewProp - view model property
 */
export let initNativeCellLovApi = function( data, viewProp ) {
    viewProp.lovApi = {};
    viewProp.lovApi.propertiesForMapping = data.propertiesForMapping;
    viewProp.lovApi.requiredPropertiesList = [];
    viewProp.lovApi.getInitialValues = function( filterStr, deferred ) {
        let lovEntries = _.clone( this.requiredPropertiesList, true );
        if( this.propertiesForMapping ) {
            // First add the all required properties from all subTypes
            populatePropsToLOVAndSort( this, lovEntries, true, this.requiredPropertiesList );
            // Add non-required properties,those are selected for mapping
            populatePropsToLOVAndSort( this, lovEntries, false );
            // Add entry for "Add New"
            lovEntries.push( {
                propDisplayValue: data.i18n.addNew,
                propInternalValue: ADD_NEW_INTERNAL
            } );
        }
        return deferred.resolve( lovEntries );
    };

    viewProp.lovApi.getNextValues = function( deferred ) {
        // LOVs do not support paging.
        deferred.resolve( null );
    };

    viewProp.lovApi.validateLOVValueSelections = function( values ) {
        // Deselect the previously selected required lov entry
        for( let index = 0; index < viewProp.lovApi.requiredPropertiesList.length; index++ ) {
            let lovEntry = viewProp.lovApi.requiredPropertiesList[ index ];
            if( lovEntry.propDisplayValue !== values[ 0 ].propDisplayValue ) {
                lovEntry.sel = false;
                lovEntry.attn = false;
            }
        }
        if( values[ 0 ].propInternalValue === ADD_NEW_INTERNAL ) {
            _navigateToAddNewPropertiesPanel();
            _resetViewModelPropertyValue( viewProp );
        }
        let allRequiredPropMapped = doesCurrentMappingHaveAllReqProps();
        // Validate the mapping to ensure all required properties are mapped
        appCtxSvc.ctx.isAwb0ImportButtonIsVisible = allRequiredPropMapped;
        return false;
    };
};

/**
 * Reset the filter, when subType gets changed.
 *
 * @param {Object} data - The view model data
 */
export let resetPropertiesFilter = function( data ) {
    data.filterBox.displayName = '';
    data.filterBox.dbValue = '';
};

/**
 * Add the selected properties in list for mapping
 *
 * @param {Object} data - The view model data
 *
 */
export let addNewPropertiesForMapping = function( data ) {
    // Update the properties
    data.typePropInfos = parentData.typePropInfosToAddProperties;
    updatePropertiesForMapping( data );

    // Switch the active back to the previous panel
    parentData.activeView = data.previousView;
    data.activeView = data.previousView;
};

/**
 * Action on the filter
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - Selected subType
 *
 */
export let actionFilterList = function( data, subType ) {
    //add promise so the Add Panel lifecycle would not complete until this operation returns data.propertiesToSelect
    let deferred = AwPromiseService.instance.defer();

    //adding timer because of timing issues with using aw-listbox (LCS-486403)
    setTimeout( function() {
        let filter = '';
        if( 'filterBox' in data && 'dbValue' in data.filterBox ) {
            filter = data.filterBox.dbValue;
        }
        data.propertiesToSelect = _getFilteredProperties( filter, parentData, subType );
        deferred.resolve( data.propertiesToSelect );
    }, 300 );

    return deferred.promise;
};

/**
 * Get the filtered properties
 *
 * @param {Object} filter - Filter value
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 *
 */
let _getFilteredProperties = function( filter, data, subType ) {
    let propertiesToSelect = [];

    // Get propInfos for the selected subType
    let propInfos = _getPropertiesFromSubType( data, subType );

    let filterValue = filter.toLocaleLowerCase().replace( /\\|\s/g, '' );

    // We have a filter, don't add properties unless the filter matches
    if( filterValue !== '' ) {
        for( let i = 0; i < propInfos.length; i++ ) {
            let propInfo = propInfos[ i ];
            let propertyName = propInfo.propertyName.toLocaleLowerCase().replace( /\\|\s/g, '' );
            let propertyDisplayName = propInfo.propertyDisplayName.toLocaleLowerCase().replace( /\\|\s/g, '' );
            if( propertyName.indexOf( filterValue ) !== -1 || propertyDisplayName.indexOf( filterValue ) !== -1 ) {
                propertiesToSelect.push( propInfo );
            }
        }
    } else {
        propertiesToSelect = propInfos;
    }

    return propertiesToSelect;
};

/**
 * Get all properties for the selected subtype
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 *
 */
let _getPropertiesFromSubType = function( data, subType ) {
    for( let index = 0; index < data.typePropInfosToAddProperties.length; index++ ) {
        let typePropInfo = data.typePropInfosToAddProperties[ index ];
        if( typePropInfo.objectType === subType ) {
            return typePropInfo.propInfos;
        }
    }

    return [];
};

/**
 * Sets the  Import Preview Data. If we are already in importPreview location URI then
 * we clear all updated actions in importPreviewSetActionOnLine list and all loaded VMCs.
 *
 * @param {Object} data - The view model object
 */
export let setImportPreviewData = function( data ) {
    appCtxSvc.registerCtx( 'ImportBOMContext', {
        showPropertiesMap: data.showPropertiesMap,
        fileName: data.fileName,
        fileExt: data.fileExt,
        fileNameNoExt: data.fileNameNoExt,
        files: data.files,
        validFile: data.validFile,
        fmsTicket: data.fmsTicket,
        response: data.response,
        mappingGroupResponse: data.mappingGroupResponse,
        mappingGroup: data.mappingGroup,
        isValidMapping: data.isValidMapping,
        objectSubTypes: data.objectSubTypes,
        viewModelPropertiesForHeader: data.viewModelPropertiesForHeader,
        columnHeaders: data.columnHeaders,
        typePropInfos: data.typePropInfos,
        secTypePropInfos: data.secTypePropInfos,
        runInBackgroundExcel: data.runInBackgroundExcel,
        propertiesForMapping: data.propertiesForMapping
    } );
    if( _.isEqual( appCtxSvc.ctx.sublocation.clientScopeURI, 'Awb0ImportPreview' ) ) {
        appCtxSvc.ctx.ImportBOMContext.isImportPreviewScreenOpened = true;
        let vmc = appCtxSvc.ctx.aceActiveContext.context.vmc;
        vmc.clear();
        importPreviewSetActionOnLine.clearUpdateVMOList();
    }
};

/**
 * Read the import preview data from saved CTX
 *  @param {Object} data - The view model data
 */
export let getImportPreviewData = function( data ) {
    let importBOMContext = appCtxSvc.getCtx( 'ImportBOMContext' );
    parentData = data;
    if( importBOMContext ) {
        data.showPropertiesMap = importBOMContext.showPropertiesMap;
        data.fileName = importBOMContext.fileName;
        data.fileExt = importBOMContext.fileExt;
        data.fileNameNoExt = importBOMContext.fileNameNoExt;
        data.files = importBOMContext.files;
        data.validFile = importBOMContext.validFile;
        data.fmsTicket = importBOMContext.fmsTicket;
        data.response = importBOMContext.response;
        data.mappingGroupResponse = importBOMContext.mappingGroupResponse;
        data.mappingGroup = importBOMContext.mappingGroup;
        data.isValidMapping = importBOMContext.isValidMapping;
        data.objectSubTypes = importBOMContext.objectSubTypes;
        data.viewModelPropertiesForHeader = importBOMContext.viewModelPropertiesForHeader;
        data.columnHeaders = importBOMContext.columnHeaders;
        data.typePropInfos = importBOMContext.typePropInfos;
        data.secTypePropInfos = importBOMContext.secTypePropInfos;
        data.runInBackgroundExcel = importBOMContext.runInBackgroundExcel;
        data.propertiesForMapping = importBOMContext.propertiesForMapping;
    }
};

/**
 * Show leave warning message in Preview Screen
 */
export let closeImportPreview = function( ctx ) {
    let localeTextBundle = localeService.getLoadedText( 'OccmgmtImportExportConstants' );
    let buttons = [ {
            addClass: 'btn btn-notify',
            text: localeTextBundle.stayTitle,
            onClick: function( $noty ) {
                $noty.close();
            }
        },
        {
            addClass: 'btn btn-notify',
            text: localeTextBundle.closeTitle,
            onClick: function( $noty ) {
                $noty.close();
                unRegisterExcelData( ctx );
                eventBus.publish( 'importBOMPreview.navigateToBack' );
                if( appCtxSvc.ctx.ImportBOMContext ) {
                    appCtxSvc.unRegisterCtx( 'ImportBOMContext' );
                }
            }
        }
    ];
    msgSvc.showWarning( localeTextBundle.notificationForImportPreviewClose, buttons );
};

export default exports = {
    registerExcelData,
    updateFormData,
    resetExcelImportData,
    unRegisterExcelData,
    resetHeader,
    createPropertiesMap,
    initNativeCellLovApi,
    initMappingCellLovApi,
    getExcelImportInput,
    populateMappingInfoForGroup,
    resetPropertiesFilter,
    addNewPropertiesForMapping,
    actionFilterList,
    setImportPreviewData,
    getImportPreviewData,
    closeImportPreview,
    enableImportStructureButtonInPanel
};

/**
 * importBOMService panel service utility
 *
 * @memberof NgServices
 * @member importBOMService
 */
app.factory( 'importBOMService', () => exports );
