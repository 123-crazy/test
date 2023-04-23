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
 * This provides functionality related to Word Round-trip: Export the word
 * @module js/Arm0ExportToRoundTripWordDocument
 */

import app from 'app';
import reqACEUtils from 'js/requirementsACEUtils';
import uwPropertyService from 'js/uwPropertyService';
import modelPropertySvc from 'js/modelPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';

import _ from 'lodash';

var exports = {};

var _data = null;

/** Required properties*/
var requiredProperties = [ 'object_name', 'body_text', 'name', 'item_revision_id' ];

/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForProperty = function( propInfo ) {
    // Append "(Required)" to the display name, if property is required
    var dispPropName = propInfo.dispPropName;



    var viewProp = uwPropertyService.createViewModelProperty( propInfo.propName, dispPropName, 'BOOLEAN', [], [] );

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
    } // attributes required to show property in lov

    viewProp.propDisplayValue = viewProp.propertyDisplayName;
    viewProp.propInternalValue = viewProp.propertyName;
    return viewProp;
};

/**
 * Filter selected properties of selected sub type except default properties
 *
 * @param {Array} propList - list of properties
 * @returns {Array} - selected property list
 */
var _filterSelectedProps = function( propList ) {
    var onlySelectedPropList = [];

    if( propList && propList.length > 0 ) {
        for( var j = 0; j < propList.length; j++ ) {
            var propInfo = propList[ j ];
            if( propInfo.dbValue === true && requiredProperties.indexOf( propInfo.propertyName ) < 0 ) {
                onlySelectedPropList.push( '{%' + propList[ j ].propertyName + '}' );
            }
        }
    }
    return onlySelectedPropList;
};
/**
 * Get revision name of selected subtype
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 * @returns {String} - Revision name
 */
var _getRevisionNameFromSubType = function( data, subType ) {
    if( data && data.typePropInfosToAddProperties && data.typePropInfosToAddProperties.length > 0 ) {
        for( var index = 0; index < data.typePropInfosToAddProperties.length; index++ ) {
            var typePropInfo = data.typePropInfosToAddProperties[ index ];
            if( typePropInfo.objectType === subType ) {
                return typePropInfo.objectTypeRev;
            }
        }
    }
    return subType;
};
/**
 * Get all subtype vs Selected properties map
 *
 * @param {Object} data - The view model data
 * @returns {Object} - Json object
 */
var _getTypevsSelectedPropsMap = function( data ) {
    var typeVsPropsMap = {};
    var objTypeList = data.objectTypeList.dbValues;
    for( var index = 0; index < objTypeList.length; index++ ) {
        var objTypeName = objTypeList[ index ].propInternalValue;
        var allPropList = _getPropertiesFromSubType( data, objTypeName );
        var onlySelectedPropList = _filterSelectedProps( allPropList );
        if( onlySelectedPropList.length > 0 ) {
            var objRevisionName = _getRevisionNameFromSubType( data, objTypeName );
            typeVsPropsMap[ objRevisionName ] = onlySelectedPropList;
        }
    }
    return typeVsPropsMap;
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
 * Get the filtered properties
 *
 * @param {Object} filter - Filter value
 * @param {Object} data - The view model data
 * @param {Object} subType - selected subType
 * @returns {Object} - Json object
 *
 */
var _getFilteredProperties = function( filter, data, subType ) {
    var propertiesToSelect = [];

    // Get propInfos for the selected subType
    var propInfos = _getPropertiesFromSubType( data, subType );

    var filterValue = filter.toLocaleLowerCase().replace( /\\|\s/g, '' );

    // We have a filter, don't add properties unless the filter matches
    if( filterValue !== '' ) {
        for( var i = 0; i < propInfos.length; i++ ) {
            var propInfo = propInfos[ i ];

            var propertyDisplayName = propInfo.propertyDisplayName.toLocaleLowerCase().replace( /\\|\s/g, '' );
            if( propertyDisplayName.indexOf( filterValue ) !== -1 ) {
                propertiesToSelect.push( propInfo );
            }
        }
    } else {
        propertiesToSelect = propInfos;
    }
    return propertiesToSelect;
};

/**
 * Get objects to edit in word
 *
 * @param {Object} ctx - context object
 * @return {Any} Array of objects to export
 */
 export let getObjectsToEditInWord = function( ctx ) {
    var arrObjects = [];
    // Word compare
    arrObjects = ctx.mselected;
    return arrObjects;
};

/**
 * Return an empty ListModel object.
 *
 * @return {Object} - Empty ListModel object.
 */
var _getEmptyListModel = function() {
    var listModel = {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        hasChildren: false,
        children: {},
        sel: false
    };
    return listModel;
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
 * Action on the on the object type filter
 *
 * @param {Object} data - The view model data
 * @param {Object} subType - Selected subType
 *
 */
export let actionFilterListForType = function( data, subType ) {
    var filter = '';
    if( 'filterBoxForType' in data && 'dbValue' in data.filterBoxForType ) {
        filter = data.filterBoxForType.dbValue;
    }
    data.typePropertiesToSelect = _getFilteredProperties( filter, data, subType );
};

/**
 * Update object list and its properties to add new objects
 *
 * @param {Object} typePropInfos - Objects with its properties
 *
 * @return {Object} objectTypeListVMP - object type list view model property
 */
var _updateObjectListToAddNewObjects = function( typePropInfos ) {
    var objectTypeList = {};
    var typeValues = {
        type: 'STRING',
        dbValue: []
    };
    var output = {};
    var listModel = {};
    objectTypeList = typeValues;

    // Add all types with its properties
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

    var objectTypeListVMP = modelPropertySvc.createViewModelProperty( objectTypeList );
    return objectTypeListVMP;
};

/**
 *Get all properties for the selected subtype
 *
 * @param {Object} data - The view model data
 *
 */
export let updateObjectTypeList = function( data ) {
    data.objectTypeList = {};
    var objectTypeListVMP = {};

    objectTypeListVMP = _updateObjectListToAddNewObjects( data.objectPropInfos );
    data.objectTypeList = objectTypeListVMP;
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
            var propInfosFinal = [];

            if( propInfos && propInfos.length > 0 ) {
                for( var i = 0; i < propInfos.length; i++ ) {
                    var propInfoTmp = _createViewModelObjectForProperty( propInfos[ i ] );
                    if( propInfoTmp ) {
                        propInfosFinal.push( propInfoTmp );
                    }
                }
            }
            typePropInfo.propInfos = propInfosFinal;
          }
    }

    data.objectPropInfos = [];
    data.traceLinkPropInfos = [];
    if( data.typePropInfos && data.typePropInfos.length > 0 ) {
        for( var j = 0; j < data.typePropInfos.length; j++ ) {
            if( data.typePropInfos[ j ].typeInfo === 'Relation' ) {
                data.traceLinkPropInfos.push( data.typePropInfos[ j ] );
            } else {
                data.objectPropInfos.push( data.typePropInfos[ j ] );
            }
        }
    }
};

export let processResponseOfSpecNavigation = function( response ) {
    _data.htmlContents = response.htmlContent;
    _data.markUpData = response.markUpData;
    _data.headerFooterData = '';
    if( response.specInfo && response.specInfo.HeaderFooterTemplate ) {
        _data.headerFooterData = response.specInfo.HeaderFooterTemplate;
    }

    eventBus.publish( 'Arm0ExportToRoundTripWordDocument.exportToWord' );
};
/**
 * Get Input data for getSpecificationContent.
 *
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationContentForPDFInput = function( ctx ) {
    var specOption = {};
    var typeVsProps = {};
    var inputCtxt = reqACEUtils.getInputContext();

    specOption.EditMode = 'true';
    specOption.IncludeComments = 'true';
    specOption.IncludeParagraphNumbering = 'true';
    var inputData = {
        inputCtxt: inputCtxt,
        inputObjects: [ reqACEUtils.getTopSelectedObject( ctx ) ],
        specOptions: specOption,
        typesPropsMap: typeVsProps
    };
    return inputData;
};
/**
 * Get Input data for getSpecificationContent.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - Application context
 * @returns {Object} - Json object
 */
export let getSpecificationContentInput = function( data, ctx ) {
    _data = data;
    var specOption = {};
    var typeVsProps = {};
    var inputCtxt = reqACEUtils.getInputContext();

    specOption.EditMode = 'true';

    if( data.withoutComment.dbValue ) {
        specOption.IncludeComments = 'true';
    }
    if( data.exportOption.dbValue === 'export_properties' ) {
        specOption.ExportWordOptionProperties = 'true';
        typeVsProps = _getTypevsSelectedPropsMap( data );
    } else if( data.exportOption.dbValue === 'export_as_seen' ) {
        specOption.ExportWordOptionTemplate = 'true';
    }
    if( data.includeParagraphNumbering.dbValue ) {
        specOption.IncludeParagraphNumbering = 'true';
    }
    if( data.headerFooter.dbValue !== '' ) {
        specOption.HeaderFooterTemplate = data.headerFooter.dbValue;
    }

    var inputData = {
        inputCtxt: inputCtxt,
        inputObjects: [ reqACEUtils.getTopSelectedObject( ctx ) ],
        specOptions: specOption,
        typesPropsMap: typeVsProps
    };
    return inputData;
};

/**
 * Initialize header footer list.
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - the Context Object
 */
export let initHeadeFooterList = function( data, ctx ) {
    var arrItems = data.searchResults.objects;
    var arrResult = [];

    var listModel = _getEmptyListModel();
    arrResult.push( listModel );
    if( arrItems && arrItems.length ) {
        for( var i = 0; i < arrItems.length; i++ ) {
            var objHdrFtr = cdm.getObject( arrItems[ i ].uid );
            if( objHdrFtr.props.arm0IsGlobal.dbValues[ 0 ] === '0' ) {
                var user_id = ctx.userSession.props.user.dbValue;
                var owning_user_id = objHdrFtr.props.owning_user.dbValues[ 0 ];

                if( user_id !== owning_user_id ) {
                    continue;
                }
            }

            listModel = _getEmptyListModel();
            listModel.propDisplayValue = objHdrFtr.props.object_name.uiValues[ 0 ];
            listModel.propInternalValue = objHdrFtr.uid;
            arrResult.push( listModel );
        }
        data.headerFooterList.dbValues = arrResult;
    }
};

export default exports = {
    resetTypePropertiesFilter,
    actionFilterListForType,
    updateObjectTypeList,
    setSpecificationMetadata,
    processResponseOfSpecNavigation,
    getSpecificationContentForPDFInput,
    getSpecificationContentInput,
    initHeadeFooterList,
    getObjectsToEditInWord
};
/**
 * Arm0ExportToRoundTripWordDocument panel service utility
 *
 * @memberof NgServices
 * @member Arm0ExportToRoundTripWordDocument
 */
app.factory( 'Arm0ExportToRoundTripWordDocument', () => exports );
