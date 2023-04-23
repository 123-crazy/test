//@<COPYRIGHT>@
//==================================================
//Copyright 2016.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * Module for the Export to Office panel
 *
 * @module js/Arm0ExportToOfficeApp
 */

import app from 'app';
import listBoxService from 'js/listBoxService';
import openInVisProductContextInfoProvider from 'js/openInVisualizationProductContextInfoProvider';
import uwPropertySvc from 'js/uwPropertyService';
import appCtxService from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

var allColumns = {};
var selectedColumns = {};

export let getInputObjects = function() {
    var inputObjects = _.get( appCtxService, 'ctx.panelContext', undefined );
    if ( !inputObjects || !_.isArray( inputObjects ) ) {
        inputObjects = _.get( appCtxService, 'ctx.mselected', undefined );
    }

    return inputObjects;
};

/**
 * Add new overrideType to overrideType list.
 *
 * @param {Object} data - The view model data
 * @param {Object} newOverrideType - The new overrideType to be added
 */
export let addOverride = function( data, newOverrideType ) {
    var flagAdd = true;

    if ( newOverrideType ) {
        for ( var i = data.overrideTypes.dbValue.length - 1; i >= 0; i-- ) {
            if ( data.overrideTypes.dbValue[i].cellHeader1InVal === newOverrideType.cellHeader1InVal &&
                data.overrideTypes.dbValue[i].cellHeader2InVal === newOverrideType.cellHeader2InVal ) {
                flagAdd = false;
            }
        }
        if ( flagAdd ) {
            data.overrideTypes.dbValue.push( newOverrideType );
        }
        data.activeView = 'Arm0ExportToOfficeAppSub';
    }
};

/**
 * Remove given overrideType from overrideType list.
 *
 * @param {Object} data - The view model data
 * @param {Object} overrideType - The overrideType to be removed
 */
export let removeOverride = function( data, overrideType ) {
    if ( overrideType ) {
        for ( var i = data.overrideTypes.dbValue.length - 1; i >= 0; i-- ) {
            if ( data.overrideTypes.dbValue[i] === overrideType ) {
                data.overrideTypes.dbValue.splice( i, 1 );
            }
        }
    }
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
 * Get objects to Export
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} toCompare - is export to compare
 * @param {Object} ctx - context object
 * @return {Any} Array of objects to export
 */
var _getSelectedObjectsType = function( ctx ) {
    var has_item_type = false;
    var has_requirement_type = false;

    var structure_type = 'ITEM_TYPE';
    var selectedObjects = ctx.mselected;

    for ( var i = 0; i < selectedObjects.length; i++ ) {
        var obj = selectedObjects[i];

        if ( obj.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementElement' ) > -1 ||
            obj.modelType.typeHierarchyArray.indexOf( 'Arm0ParagraphElement' ) > -1 ||
            obj.modelType.typeHierarchyArray.indexOf( 'Arm0RequirementSpecElement' ) > -1 ||
            obj.modelType.typeHierarchyArray.indexOf( 'SpecElementRevision' ) > -1 ) {
            has_requirement_type = true;
        } else {
            has_item_type = true;
        }
    }

    if ( has_item_type === true && has_requirement_type === true ) {
        structure_type = 'HYBRID';
    } else if ( has_item_type === true ) {
        structure_type = 'ITEM_TYPE';
    } else if ( has_requirement_type === true ) {
        structure_type = 'REQUIREMENT_TYPE';
    }

    return structure_type;
};

/**
 * Given an array of Strings to be represented in listbox, this function returns an array of ListModel objects for
 * consumption by the listbox widget.
 *
 * @param {ObjectArray} strings - The Strings array
 * @return {ObjectArray} - Array of ListModel objects.
 */
export let createListModelObjectsFromStrings = function( strings ) {
    var listModels = [];
    for ( var i in strings ) {
        if ( i ) {
            var listModel = _getEmptyListModel();
            var splits = strings[i].split( ',' );

            listModel.propDisplayValue = splits[0];
            listModel.propInternalValue = splits[1];
            listModels.push( listModel );
        }
    }
    return listModels;
};

/**
 * Get the override types
 *
 * @param {Object} data - The panel's view model object
 * @return {Any} Array of export options
 */
export let getOverrideType = function( data, toCompare ) {
    var arrOverrideType = [];
    if ( !data.exportOption.dbValue && !toCompare ) {
        for ( var i = 0; i < data.overrideTypes.dbValue.length; i++ ) {
            var objOverrideType = {
                boType: data.overrideTypes.dbValue[i].cellHeader1InVal,
                objectTemplateName: data.overrideTypes.dbValue[i].cellHeader2InVal
            };
            arrOverrideType.push( objOverrideType );
        }
    }
    return arrOverrideType;
};

/**
 * Get is include Attachment
 *
 * @param {Object} data - The panel's view model object
 * @return {Boolean} is include Attachment
 */
export let getIsIncludeAttachment = function( data, toCompare ) {
    if ( !data.exportOption.dbValue && !toCompare ) {
        if ( data.exportWordActivity.dbValue === data.i18n.withAttachment ) {
            return true;
        }
        return false;
    }
    return false;
};

/**
 * Get the selected Spec template name
 *
 * @param {Object} data - The panel's view model object
 * @return {String} The Spec template name
 */
export let getTemplateName = function( data ) {
    var templateName = '';
    if ( !data.exportOption.dbValue ) {
        templateName = data.specTemplates.dbValue; // Word
    } else {
        templateName = data.excelTemplates.dbValue; // Excel
    }

    return templateName;
};

/**
 * Get checkout option value
 *
 * @param {Object} data - The panel's view model object
 * @return {Boolean} true if checkout supported
 */
var _getCheckoutOptionValue = function( data ) {
    if ( !data.exportOption.dbValue ) {
        //Word
        if ( data.checkOutWord.dbValue && data.exportWordActivity.dbValue === data.i18n.liveEdit ) {
            return true;
        }
    } else {
        // Excel
        if ( data.checkOutExcel.dbValue &&
            ( data.activity.dbValue === data.i18n.liveEdit || data.activity.dbValue === data.i18n.bulkliveEdit ) ) {
            return true;
        }
    }

    return false;
};

/**
 * Get Run in Background option value
 *
 * @param {Object} data - The panel's view model object
 * @return {Boolean} true if checkout supported
 */
var _getRunInBackgroundOptionValue = function( data ) {
    if ( !data.exportOption.dbValue &&
        ( data.runInBackgroundWord.dbValue || data.exportWordActivity.dbValue === data.i18n.withAttachment ) ) {
        return true;
    }
    if ( data.exportOption.dbValue && data.runInBackgroundExcel.dbValue ) {
        return true;
    }
    return false;
};

/**
 * Get Edit in word option values
 *
 * @return {Any} Array of export options
 */
export let getEditInWordOptionValues = function() {
    var exportOptions = [];
    var strOption = {
        option: 'CheckOutObjects',
        optionvalue: 'CheckOutObjects'
    };
    exportOptions.push( strOption );
    var strOption1 = {
        option: 'RunInBackground',
        optionvalue: 'RunInBackground'
    };
    exportOptions.push( strOption1 );

    return exportOptions;
};

/**
 * Get the export options
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} toCompare - is export to compare
 * @return {Any} Array of export options
 */
export let getExportOptionValue = function( data, toCompare ) {
    var exportOptions = [];

    if ( toCompare ) {
        return exportOptions;
    }
    var isCheckoutExport = _getCheckoutOptionValue( data );

    if ( isCheckoutExport ) {
        var strOption = {
            option: 'CheckOutObjects',
            optionvalue: 'CheckOutObjects'
        };
        exportOptions.push( strOption );
    }
    var toRunInBackground = _getRunInBackgroundOptionValue( data );
    if ( toRunInBackground ) {
        var strOption1 = {
            option: 'RunInBackground',
            optionvalue: 'RunInBackground'
        };
        exportOptions.push( strOption1 );
    }
    return exportOptions;
};

/**
 * Get the selected application format
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} toCompare - is export to compare
 * @return {String} The application format
 */
export let getApplicationFormat = function( data, toCompare ) {
    var appFormat = '';
    if ( !data.exportOption.dbValue ) { // Word
        if ( toCompare ) {
            appFormat = 'MSWordCompare';
        } else if ( data.exportWordActivity.dbValue === data.i18n.withAttachment ||
            data.exportWordActivity.dbValue === data.i18n.view ) {
            appFormat = 'MSWordXML';
        } else {
            appFormat = 'MSWordXMLLive';
        }
    } else { // Excel
        if ( data.activity.dbValue === data.i18n.view ) {
            appFormat = 'MSExcel';
        } else if ( data.activity.dbValue === data.i18n.liveEdit ) {
            appFormat = 'MSExcelLive';
        } else if ( data.activity.dbValue === data.i18n.bulkliveEdit ) {
            appFormat = 'MSExcelLiveBulkMode';
        } else if ( data.activity.dbValue === data.i18n.editImport ) {
            appFormat = 'MSExcelReimport';
        }
    }
    return appFormat;
};

/**
 * Get objects to Export
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} toCompare - is export to compare
 * @param {Object} ctx - context object
 * @return {Any} Array of objects to export
 */
export let getObjectsToExport = function( data, toCompare, ctx ) {
    var arrObjects = [];
    // Word compare
    if ( !data.exportOption.dbValue && toCompare ) {
        arrObjects.push( ctx.mselected[0] );
    }
    // Word or Excel Export
    else {
        arrObjects = ctx.mselected;
    }

    return arrObjects;
};

/**
 * Get target objects to Export
 *
 * @param {Object} data - The panel's view model object
 * @param {Boolean} toCompare - is export to compare
 * @param {Object} ctx - context object
 * @return {Any} Array of target objects to export
 */
export let getTargetObjectsToExport = function( data, toCompare, ctx ) {
    var arrObjects = [];
    var productContextInfo;
    // Word Compare
    if ( !data.exportOption.dbValue && toCompare ) {
        arrObjects.push( ctx.mselected[1] );
    }
    // Word or Excel Export with diagram nodes
    else if ( openInVisProductContextInfoProvider.getProductContextInfo ) {
        productContextInfo = openInVisProductContextInfoProvider.getProductContextInfo();
        if ( productContextInfo && productContextInfo.length > 0 ) {
            arrObjects = productContextInfo[0].selections;
        }
    }
    return arrObjects;
};
/**
 * Update Checkout button state when checkout is enabled
 *
 * @param {Object} data - The panel's view model object
 *
 */
var _checkoutOptionEnabled = function( data, ctx ) {
    data.checkOutExcel.isEnabled = true;
    // For ACE Mode
    if ( ctx.occmgmtContext ) {
        if ( data.preferences.TC_Enable_Implicit_CO[0] === 'true' ) {
            data.checkOutExcel.dbValue = false;
        } else {
            var structure_type = _getSelectedObjectsType( ctx );
            if ( structure_type === 'HYBRID' || structure_type === 'REQUIREMENT_TYPE' ) {
                data.checkOutExcel.dbValue = true;
            } else if ( structure_type === 'ITEM_TYPE' ) {
                data.checkOutExcel.dbValue = false;
            }
        }
    } else {
        // Non Ace mode
        if ( data.preferences.TC_Enable_Implicit_CO[0] === 'true' ) {
            data.checkOutExcel.dbValue = false;
        } else {
            data.checkOutExcel.dbValue = true;
        }
    }
};

/**
 * check if to show live option
 *
 * @param {Object} data - The panel's view model object
 *
 */
var _isToShowLiveOption = function( data, ctx ) {

};

/**
 * Update Checkout button state as per preference value
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let updateCheckoutButtonState = function( data, ctx ) {
    //  Word checkOut preference
    if ( data.preferences.REQ_checkout_objects_before_export[0] === 'default' ) {
        data.checkOutWord.dbValue = false;
        data.checkOutWord.isEnabled = true;
    } else if ( data.preferences.REQ_checkout_objects_before_export[0] === 'default_hide' ) {
        data.checkOutWord.dbValue = false;
        data.checkOutWord.isEnabled = false;
    } else if ( data.preferences.REQ_checkout_objects_before_export[0] === 'default_checkout' ) {
        data.checkOutWord.dbValue = true;
        data.checkOutWord.isEnabled = false;
    }

    // Excel checkOut preference
    if ( data.preferences.Show_Checkout_option[0] === 'true' ) {
        _checkoutOptionEnabled( data, ctx );
    } else if ( data.preferences.Show_Checkout_option[0] === 'false' ) {
        data.checkOutExcel.dbValue = false;
        data.checkOutExcel.isEnabled = false;
    }
};

/**
 * Clear the list db values before updating the lists
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let clearListDbValues = function( data ) {
    data.specTemplates.dbValue = null;
    data.excelTemplates.dbValue = null;
    data.activity.dbValue = null;
};

/**
 * Update specTemplates, excelTemplates, activity list
 *
 * @param {Object} data - The panel's view model object
 *
 */
export let prepareTemplateLists = function( data, ctx ) {
    if( data.specTemplatesListIn && data.specTemplatesListIn.length > 0 ) {
        data.specTemplatesList = listBoxService.createListModelObjectsFromStrings( data.specTemplatesListIn );
        data.specTemplates.dbValue = data.specTemplatesList[ 0 ].propInternalValue;
    }
    if( ctx && ctx.excelTemplateForExport ) {
        var defaultTemplate = ctx.excelTemplateForExport.parameterTemplate;
        var allExcelTemplatesList = listBoxService.createListModelObjectsFromStrings( data.excelTemplatesListIn );
        var exportToExcelTemplate;
        for( var template in allExcelTemplatesList ) {
            if( allExcelTemplatesList[ template ].propInternalValue === defaultTemplate ) {
                exportToExcelTemplate = allExcelTemplatesList[ template ];
                allExcelTemplatesList.splice( template, 1 );
            }
        }
        if( exportToExcelTemplate ) {
            allExcelTemplatesList.unshift( exportToExcelTemplate );
        }
        data.excelTemplatesList = allExcelTemplatesList;
        data.excelTemplates.dbValue = data.excelTemplatesList[ 0 ].propInternalValue;
    } else if( data.excelTemplatesListIn && data.excelTemplatesListIn.length > 0 ) {
        if( ctx.preferences && ctx.preferences.AWC_REQ_default_excel_template_for_export ) {
            var defaultTemplate = ctx.preferences.AWC_REQ_default_excel_template_for_export[ 0 ];

            var allExcelTemplatesList = listBoxService.createListModelObjectsFromStrings( data.excelTemplatesListIn );
            var exportToExcelTemplate;
            for( var template in allExcelTemplatesList ) {
                if( allExcelTemplatesList[ template ].propInternalValue === defaultTemplate ) {
                    exportToExcelTemplate = allExcelTemplatesList[ template ];
                    allExcelTemplatesList.splice( template, 1 );
                }
            }
            if( exportToExcelTemplate ) {
                allExcelTemplatesList.unshift( exportToExcelTemplate );
            }
            data.excelTemplatesList = allExcelTemplatesList;
            data.excelTemplates.dbValue = data.excelTemplatesList[ 0 ].propInternalValue;
        } else {
            data.excelTemplatesList = listBoxService.createListModelObjectsFromStrings( data.excelTemplatesListIn );
            data.excelTemplates.dbValue = data.excelTemplatesList[ 0 ].propInternalValue;
        }
    }
    if( data.activityListIn ) {
        if( ctx.preferences.REQ_Export_WithAddin[ 0 ] === 'true' ) {
            data.activityList = listBoxService.createListModelObjectsFromStrings( data.activityListIn.dbValue );
        }else{
            var activityListIn = [ data.activityListIn.dbValue[ 0 ] ];
        data.activityList = listBoxService.createListModelObjectsFromStrings( activityListIn );
        }
    }
    if( data.exportWordActivityListIn  ) {
        var exportWordActivityListIn = data.exportWordActivityListIn.dbValue;
        if( ctx.preferences.REQ_Export_WithAddin[ 0 ] !== 'true' ) {
            exportWordActivityListIn = [
                data.exportWordActivityListIn.dbValue[ 0 ], data.exportWordActivityListIn.dbValue[ 2 ]
            ];
        }

        var structure_type = _getSelectedObjectsType( ctx );
        if( structure_type !== 'REQUIREMENT_TYPE' ) {
            exportWordActivityListIn = [
                data.exportWordActivityListIn.dbValue[ 0 ]
            ];
        }
        data.exportWordActivityList = listBoxService
            .createListModelObjectsFromStrings( exportWordActivityListIn );
        if( structure_type === 'REQUIREMENT' ) {
            data.exportWordActivity.dbValue = data.exportWordActivityList[ 1 ].propInternalValue;
        }
        data.activity.dbValue = data.activityList[0].propInternalValue;
    }
};

/**
 * Get the selected Spec template name
 * @param {Object} data - The panel's view model object
 * @return {String} The Spec template name
 */
export let getTemplateNameForExport = function( data ) {
    var template = '';
    if ( data.exportExcelOptions.dbValue ) {
        template = data.excelTemplates.dbValue;
    }
    return template;
};
/**
 * Get the export options
 *
 * @param {Object} data - The panel's view model object
 * @return {Any} Array of export options
 */
export let getExportOptionValueForExcel = function( data ) {
    var exportOptions = [];
    if ( data.runInBackgroundExcelExport.dbValue ) {
        exportOptions.push( {
            option: 'RunInBackground',
            optionvalue: 'RunInBackground'
        } );
    }
    exportOptions.push( {
        option: 'docStructure',
        optionvalue: data.docStructure.dbValue.toString()
    },
    {
        option: 'idHyperlink',
        optionvalue: data.idHyperlink.dbValue.toString()
    },
    {
        option: 'outlineNumbers',
        optionvalue: data.outlineNumbers.dbValue.toString()
    }
    );

    //check for extra custom export options added by consumers.
    var extraExportOptions = appCtxService.getCtx( 'extraExportOptions' );
    if( extraExportOptions && extraExportOptions.length > 0 ) {
        for( var i = 0; i < extraExportOptions.length; i++ ) {
            exportOptions.push( {
                option: extraExportOptions[ i ].option,
                optionvalue: extraExportOptions[ i ].optionvalue
            } );
        }
        appCtxService.unRegisterCtx( 'extraExportOptions' );
    }

    return exportOptions;
};
/**
 * Move one down or up from list
 *
 * @param {Object} dataProvider - dataprovider
 * @param {Object} moveTo - Direction to move to
 */
export let moveUpDown = function( dataProvider, moveTo ) {
    var sortColumns = dataProvider.exportColumnList;
    var selectedCount = sortColumns.getSelectedIndexes()[0];
    if ( moveTo === 'Down' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount + 1 );
    }
    if ( moveTo === 'Up' ) {
        selectedColumns = move( selectedColumns, selectedCount, selectedCount - 1 );
    }
    eventBus.publish( 'exportExcel.updatedColumnList' );
};
var move = function( arr, old_index, new_index ) {
    while ( old_index < 0 ) {
        old_index += arr.length;
    }
    while ( new_index < 0 ) {
        new_index += arr.length;
    }
    if ( new_index >= arr.length ) {
        var k = new_index - arr.length;
        while ( k-- + 1 ) {
            arr.push( undefined );
        }
    }
    arr.splice( new_index, 0, arr.splice( old_index, 1 )[0] );
    return arr;
};
/**
 * Get objects to Export
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} ctx - context object
 * @return {Any} Array of objects to export
 */
export let getObjectsToExportForExcel = function( data, ctx ) {
    return ctx.mselected;
};
/**
 * Get target objects to Export
 * @return {Any} Array of target objects to export
 */
export let getTargetObjectsToExportForExcel = function() {
    var aceProductContext = [];
    var aceActiveContext = appCtxService.getCtx( 'aceActiveContext' );
    if ( aceActiveContext ) {
        aceProductContext.push( aceActiveContext.context.productContextInfo );
    }
    return aceProductContext;
};

/**
 * Prepare column list
 *
 * @param {Object} data - The panel's view model object
 */
export let prepareColumnList = function( data ) {
    var searchResInfo =  appCtxService.ctx.reqSummaryTable ? appCtxService.ctx.reqSummaryTable : appCtxService.ctx.searchResponseInfo;
    if ( searchResInfo ) {
        var columns = searchResInfo.columnConfig.columns;
        if ( columns.length ) {
            data.isExportColumnEmpty.dbValue = false;
        }
        if ( appCtxService.ctx.reqSummaryTable && columns ) {
            var finalColumns = [];
            for( var i = 0; i < columns.length; i++ ) {
                var propName = columns[i].propertyName;
                var typeName = columns[i].typeName;
                if( columns[i].typeName === 'Arm0SummaryTableProxy' && propName && propName.indexOf( 'REF' ) !== -1 ) {
                    var type = propName.substring( propName.indexOf( ',' ) + 1, propName.indexOf( ')' ) );
                    var property = propName.substring( propName.indexOf( '.' ) + 1 );
                    columns[i].typeName = type;
                    columns[i].propertyName = property;
                    if( type.indexOf( 'Awb0Element' ) !== -1 || type.indexOf( 'Awb0ConditionalElement' ) !== -1 ) {
                        finalColumns.push( columns[i] );
                    }
                } else if( typeName && typeName.indexOf( 'Awb0Element' ) !== -1 || typeName.indexOf( 'Awb0ConditionalElement' ) !== -1 ) {
                    finalColumns.push( columns[i] );
                }
            }
            columns = finalColumns;
        }
        if ( columns ) {
            const uniqueColumns = Array.from( new Set( columns.map( a => a.propertyName ) ) )
                .map( propertyName => {
                    return columns.find( a => a.propertyName === propertyName );
                } );
            _.forEach( uniqueColumns, function( column ) {
                if( !_checkIfDCPProperty( column.propertyName ) ) {  // DCP not supported to export
                    var displayedLogicalProp = _createViewModelObjectForProperty( column );
                    data.exportColumns.dbValue.push( displayedLogicalProp );
                }
            } );
            eventBus.publish( 'exportExcel.refreshColumnList' );
            allColumns = _.clone( data.exportColumns.dbValue, true );
            selectedColumns = data.exportColumns.dbValue;
        }
    }
};

/**
 * checks if the property name is of type DCP ( Dynamic Compound Property )
 * @function checkIfDCPProperty
 * @param {String} propertyName - name of the property
 * @returns {Boolean} - returns whether the property is a dynamic compound property or not.
 */
 var _checkIfDCPProperty = function( propertyName ) {
     if( propertyName && propertyName.indexOf( '.' ) !== -1 &&
         propertyName.indexOf( '(' ) !== -1 &&
         ( propertyName.indexOf( 'GRM' ) !== -1 ||
             propertyName.indexOf( 'GRMS2P' ) !== -1 ||
             propertyName.indexOf( 'REF' ) !== -1 ||
             propertyName.indexOf( 'REFBY' ) !== -1 ||
             propertyName.indexOf( 'GRMREL' ) !== -1 ||
             propertyName.indexOf( 'GRMS2PREL' ) !== -1 )
     ) {
         return true;
     }
     return false;
 };

/**
 * Create view model property for the property info
 *
 * @param {Object} propInfo - Property info
 * @returns {Object} viewModelObject - view model object for the given property info
 */
var _createViewModelObjectForProperty = function( propInfo ) {
    var dispPropName = propInfo.displayName;
    var propName = propInfo.propertyName + ':' + propInfo.typeName;
    var viewProp = uwPropertySvc.createViewModelProperty( propName, dispPropName, 'BOOLEAN', [],
        [] );
    uwPropertySvc.setIsRequired( viewProp, true );
    uwPropertySvc.setIsArray( viewProp, false );
    uwPropertySvc.setIsEditable( viewProp, true );
    uwPropertySvc.setIsNull( viewProp, false );
    uwPropertySvc.setPropertyLabelDisplay( viewProp, 'PROPERTY_LABEL_AT_RIGHT' );
    uwPropertySvc.setValue( viewProp, true );
    return viewProp;
};

/**
 * Remove given column from coulmn list.
 * @param {Object} data - The panel's view model object
 * @param {Object} columnToRemove - column to remove
 */
export let removeColumn = function( data, columnToRemove ) {
    if ( columnToRemove ) {
        for ( var i = data.exportColumns.dbValue.length - 1; i >= 0; i-- ) {
            if ( data.exportColumns.dbValue[i] === columnToRemove ) {
                data.exportColumns.dbValue.splice( i, 1 );
            }
        }
        if ( data.exportColumns.dbValue.length === 0 ) {
            data.isExportColumnEmpty.dbValue = true;
        }
    }
};

export let setSelectionVariable = function( data ) {
    if ( data.isExportColumnEmpty.dbValue ) {
        data.areAllPropertiesDeselected = true;
    }
};

export let changeColumnSelectionForProperties = function( data ) {
    for ( var i = 0; i < data.allProperties.length; i++ ) {
        if ( data.allProperties[i].dbValue === true ) {
            data.areAllPropertiesDeselected = false;
            break;
        } else {
            data.areAllPropertiesDeselected = true;
        }
    }
};
/* Add columns in coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let addColumns = function( data ) {
    selectedColumns = [];
    if ( allColumns ) {
        for ( var i = 0; i < allColumns.length; i++ ) {
            if ( allColumns[i].dbValue === true ) {
                selectedColumns.push( allColumns[i] );
            }
        }
        var destPanelId = 'Arm0Export';
        var eventData = {
            destPanelId: destPanelId,
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', eventData );
        eventBus.publish( 'exportExcel.updatedColumnList' );
    }
};
/* Update coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let updateColumnList = function( data ) {
    data.exportColumns.dbValue = selectedColumns;
    if ( data.exportColumns.dbValue.length ) {
        data.isExportColumnEmpty.dbValue = false;
    }

    eventBus.publish( 'exportExcel.refreshColumnList' );
};
/* Set coulmn list.
 *
 * @param {Object} data - The view model data
 */
export let setColumns = function( data ) {
    var selectColumns = _.difference( allColumns, selectedColumns );
    _.forEach( selectColumns, function( column ) {
        uwPropertySvc.setValue( column, false );
    } );
    _.forEach( selectedColumns, function( column ) {
        uwPropertySvc.setValue( column, true );
    } );
    data.allProperties = allColumns;
    for ( var i = 0; i < data.allProperties.length; i++ ) {
        if ( data.allProperties[i].dbValue === true ) {
            data.areAllPropertiesDeselected = false;
            break;
        } else {
            data.areAllPropertiesDeselected = true;
        }
    }
};
/* Change move up/down command state on selection change
 *
 * @param {Object} data - The view model data
 */
export let columnSelectionChanged = function( data ) {
    var excelCntx = appCtxService.getCtx( 'excelListCommands' );
    var columnListLength = data.exportColumnList.getLength();
    var selectedColumn = data.exportColumnList.selectedObjects[0];
    if ( data.exportColumnList.getItemAtIndex( 0 ) === selectedColumn ) {
        excelCntx.enableMoveUp = false;
    } else {
        excelCntx.enableMoveUp = true;
    }
    if ( data.exportColumnList.getItemAtIndex( columnListLength - 1 ) === selectedColumn ) {
        excelCntx.enableMoveDown = false;
    } else {
        excelCntx.enableMoveDown = true;
    }
};
/* Register context to update command state
 */
export let registerCmdContext = function() {
    var jso = {
        enableMoveUp: true,
        enableMoveDown: true
    };
    appCtxService.registerCtx( 'excelListCommands', jso );
};
/* unregister context to update command state
 */
export let unRegisterCmdContext = function() {
    appCtxService.unRegisterCtx( 'excelListCommands' );
};
/* return selected properties
 * @param {Object} data - The view model data
 */
export let getSelectedProperties = function( data ) {
    var properties = [];
    if ( !data.exportExcelOptions.dbValue ) {
        _.forEach( selectedColumns, function( column ) {
            properties.push( column.propertyName );
        } );
    }
    return properties;
};

export default exports = {
    getInputObjects,
    addOverride,
    removeOverride,
    createListModelObjectsFromStrings,
    getOverrideType,
    getIsIncludeAttachment,
    getTemplateName,
    getEditInWordOptionValues,
    getExportOptionValue,
    getApplicationFormat,
    getObjectsToExport,
    getTargetObjectsToExport,
    updateCheckoutButtonState,
    clearListDbValues,
    prepareTemplateLists,
    getTemplateNameForExport,
    getExportOptionValueForExcel,
    moveUpDown,
    getObjectsToExportForExcel,
    getTargetObjectsToExportForExcel,
    prepareColumnList,
    removeColumn,
    addColumns,
    updateColumnList,
    setColumns,
    columnSelectionChanged,
    registerCmdContext,
    unRegisterCmdContext,
    getSelectedProperties,
    changeColumnSelectionForProperties,
    setSelectionVariable
};
/**
 * Export panel service utility
 *
 * @memberof NgServices
 * @member Arm0ExportToOfficeApp
 */
app.factory( 'Arm0ExportToOfficeApp', () => exports );
