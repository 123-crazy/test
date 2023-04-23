// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 define
 */

/**
 * JS Service defined to handle Configuration related method execution only.
 *
 *
 * @module js/configureReportService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import listBoxService from 'js/listBoxService';
import messagingService from 'js/messagingService';
import uwPropSrv from 'js/uwPropertyService';
import filterPanelUtils from 'js/filterPanelUtils';
import cmm from 'soa/kernel/clientMetaModel';
import _ from 'lodash';
import angular from 'angular';
import eventBus from 'js/eventBus';

import 'js/modelPropertyService';
import reportsCommonService from 'js/reportsCommonService';

var exports = {};

var _selectedReportTab = null;

/**
 * @param  {any} data - The data
 */
export let populateReportsContext = function( data ) {
    if( appCtxService.ctx.state.params.configure === 'false' ) {
        return;
    }
    var _reportCtx = {
        ChartVisibility: {
            chart1Visible: false,
            chart2Visible: false,
            chart3Visible: false
        },
        RuntimeInformation: {}
    };
    //check if ctx is set..
    var reportExtCtx = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    if( reportExtCtx === undefined || reportExtCtx.RuntimeInformation === undefined ) {
        //Build a list of Color and Font properties.
        var colorList = [];
        colorList.push( data.i18n.Black );
        colorList.push( data.i18n.DarkGray );
        colorList.push( data.i18n.Gray );
        colorList.push( data.i18n.LightGray );
        colorList.push( data.i18n.Blue );
        colorList.push( data.i18n.LightBlue );
        colorList.push( data.i18n.Orange );
        colorList.push( data.i18n.Yellow );
        var fontList = [];
        fontList.push( data.i18n.SegoeUI );
        fontList.push( data.i18n.Arial );
        fontList.push( data.i18n.ArialBlack );
        fontList.push( data.i18n.CourierNew );
        fontList.push( data.i18n.Helvetica );
        fontList.push( data.i18n.HelveticaNeue );
        fontList.push( data.i18n.Georgia );
        fontList.push( data.i18n.LucidaSansUnicode );
        fontList.push( data.i18n.Tahoma );
        fontList.push( data.i18n.TimesNewRoman );
        fontList.push( data.i18n.TrebuchetMS );
        fontList.push( data.i18n.Verdana );
        var vmColorList = listBoxService.createListModelObjectsFromStrings( colorList );
        for( var index = 0; index < vmColorList.length; index++ ) {
            vmColorList[ index ].propInternalValue = data.colorInternalNameList[ index ];
        }
        _reportCtx.RuntimeInformation.ColorVmProps = vmColorList;
        var vmFontList = listBoxService.createListModelObjectsFromStrings( fontList );
        for( index = 0; index < vmFontList.length; index++ ) {
            vmFontList[ index ].propInternalValue = data.fontInternalNameList[ index ];
        }
        _reportCtx.RuntimeInformation.FontVmProps = vmFontList;
        var vmChartTypeList = [];
        vmChartTypeList.push( data.i18n.Column );
        vmChartTypeList.push( data.i18n.Line );
        vmChartTypeList.push( data.i18n.Pie );
        vmChartTypeList = listBoxService.createListModelObjectsFromStrings( vmChartTypeList );
        vmChartTypeList[ 0 ].propInternalValue = 'column';
        vmChartTypeList[ 1 ].propInternalValue = 'line';
        vmChartTypeList[ 2 ].propInternalValue = 'pie';
        _reportCtx.RuntimeInformation.ChartTypeVmProps = vmChartTypeList;
        _reportCtx.RuntimeInformation.ColumnWSOPros = exports.getWSOPreferenceProps( data );
        data.ReportParameters = _reportCtx;
        if( reportExtCtx !== undefined && reportExtCtx.ReportDefProps ) {
            _reportCtx.ReportDefProps = reportExtCtx.ReportDefProps;
        }
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', data.ReportParameters );
    }
};

export let getWSOPreferenceProps = function( data ) {
    //Get the prop names from preference for WorkspaceObject.
    var commonList = [];
    if( 'preferences' in data && 'WORKSPACEOBJECT_object_columns_shown' in data.preferences ) {
        commonList.push.apply( commonList, data.preferences.WORKSPACEOBJECT_object_columns_shown );
    }
    if( 'preferences' in data && 'WORKSPACEOBJECT_object_columns_hidden' in data.preferences ) {
        commonList.push.apply( commonList, data.preferences.WORKSPACEOBJECT_object_columns_hidden );
    }
    if( commonList.length > 0 ) {
        var wsoType = cmm.getType( 'WorkspaceObject' );
        var wsoProps = [];
        var wsoPropInterName = [];
        _.forEach( commonList, function( currPropName ) {
            if( wsoType !== null && wsoType.propertyDescriptorsMap[ currPropName ] ) {
                wsoProps.push( wsoType.propertyDescriptorsMap[ currPropName ].displayName );
                wsoPropInterName.push( 'WorkspaceObject.' + wsoType.propertyDescriptorsMap[ currPropName ].name );
            }
        } );
        wsoProps.push( data.i18n.objectStrColumnName );
        wsoPropInterName.push( 'WorkspaceObject.object_string' );
        var vmWsoPros = listBoxService.createListModelObjectsFromStrings( wsoProps );
        for( var index = 0; index < vmWsoPros.length; index++ ) {
            vmWsoPros[ index ].propInternalValue = wsoPropInterName[ index ];
        }
        return vmWsoPros;
    }
};

/**
 * set the pin on the data
 *
 * @return {Object} the model object
 */
/**
 * @param  {any} pinnedToForm - The Pinned status
 * @param  {any} unpinnedToForm - The Un-Pinned status
 */
export let setPinnedToForm = function( pinnedToForm, unpinnedToForm ) {
    pinnedToForm.dbValue = false;
    unpinnedToForm.dbValue = true;
};

/**
 * set the un-pin on the data
 *
 * @return {Object} the model object
 */
/**
 * @param  {any} pinnedToForm - The Pinned status
 * @param  {any} unpinnedToForm - The Un-Pinned status
 */
export let setUnPinnedToForm = function( pinnedToForm, unpinnedToForm ) {
    pinnedToForm.dbValue = true;
    unpinnedToForm.dbValue = false;
};

/**
 * @returns {any} filtersList
 */
export let getChartByPropertiesList = function() {
    var searchContext = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    var filtersList = [];
    if( searchContext && searchContext.searchFilterCategories ) {
        var searchFilterCategories = searchContext.searchFilterCategories;
        for( var index = 0; index < searchFilterCategories.length; index++ ) {
            var filterProp = searchFilterCategories[ index ].displayName;
            filtersList.push( filterProp );
        }
        filtersList = listBoxService.createListModelObjectsFromStrings( filtersList );
        for( index = 0; index < searchFilterCategories.length; index++ ) {
            var filterCat = searchFilterCategories[ index ];
            filtersList[ index ].propInternalValue = filterCat.internalName;
        }
    }
    return filtersList;
};

/**
 * Filter properties list
 *
 * @param {any} data - the data
 * @returns {any} filetrProps
 */
var populateFilterPropList = function( schema, scope, filter, data ) {
    var reportsRuntimeInfo = appCtxService.getCtx( 'ReportsContext.reportParameters.RuntimeInformation' );
    var propsList = [];
    if( reportsRuntimeInfo && reportsRuntimeInfo.searchFilterChartProps ) {
        propsList = reportsRuntimeInfo.searchFilterChartProps;
    } else if( reportsRuntimeInfo && reportsRuntimeInfo.SearchDataInfo && reportsRuntimeInfo.SearchDataInfo.SearchPerformed ) {
        propsList = getChartByPropertiesList();
    }
    //Do we need to show message to perform search?
    //if( propsList.length === 0 ) {
    //    messagingService.reportNotyMessage( data, data._internal.messages, 'showSearchNotRunMessage' );
    //}
    data.filterProps = propsList;
};

export let populateFilterrColumnPropList = function( schema, scope, filter, data ) {
    var reportsRuntimeInfo = appCtxService.getCtx( 'ReportsContext.reportParameters.RuntimeInformation' );
    var propsList = [];
    if( reportsRuntimeInfo && reportsRuntimeInfo.searchFilterColumnProps ) {
        propsList = reportsRuntimeInfo.searchFilterColumnProps;
        propsList.sort((data1, data2) => {return data1.propDisplayValue.localeCompare(data2.propDisplayValue);});
    } else if( reportsRuntimeInfo && reportsRuntimeInfo.SearchDataInfo && reportsRuntimeInfo.SearchDataInfo.SearchPerformed ) {
        propsList = this.getChartByPropertiesList();
    }
    if( propsList.length === 0 ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'showSearchNotRunColumnMessage' );
    } else if( filter !== '' ) {
        propsList = propsList.filter( function( prop ) {
            return prop.propDisplayValue.toLowerCase().indexOf( filter.toLowerCase() ) >= 0;
        } );
    }
    return { filterColumnProps: propsList };
};

/**
 *
 * @param {*} data
 */
export let populatePropetiesOnItemRepEdit = function( data ) {
    updateReportsCtxForFilters( data );
    populateFilterPropList( '', '', '', data );
};

/**
 * update the performSearch searchCriteria variable
 * also removes the list of expanded categories from the search criteria when performing a new search
 * @param {Object} data the view model data object
 *
 */
var updateSearchCriteria = function( data ) {
    if( data.searchBox ) {
        if( !appCtxService.ctx.searchInfo ) {
            appCtxService.ctx.searchInfo = {};
        }
        appCtxService.ctx.searchInfo.incontextSearchNew = 'true';
        appCtxService.ctx.searchCriteria = data.searchBox.dbValue;
        var incontextSearchFilterPanelCtx = appCtxService.getCtx( 'incontextSearchFilterPanel' );
        if( incontextSearchFilterPanelCtx && incontextSearchFilterPanelCtx.listOfExpandedCategories ) {
            delete incontextSearchFilterPanelCtx.listOfExpandedCategories;
            appCtxService.updatePartialCtx( 'incontextSearchFilterPanel', incontextSearchFilterPanelCtx );
        }
    }
};

/**
 * JS function to set type filter used for search
 *
 * @param {Object} data - The panel's view model object
 * @param {Object} typeFilter - object type
 */
export let callPerformSearch = function( data ) {
    if( data ) {
        var reportsRuntimeInfo = appCtxService.getCtx( 'ReportsContext.reportParameters.RuntimeInformation' );
        if( reportsRuntimeInfo !== undefined ) {
            var SearchDataInfo = {
                SearchPerformed: true
            };
            reportsRuntimeInfo.SearchDataInfo = SearchDataInfo;
        }
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.RuntimeInformation', reportsRuntimeInfo );
        //appCtxService.updatePartialCtx( 'searchInfo.incontextSearchNew', 'true' );
        //addObjectUtils.findSubBusinessObjectsAndInvokeSearch( data );
        var reportsDefProps = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
        if( reportsDefProps && reportsDefProps.ReportSearchInfo !== undefined ) {
            data.searchFilterMap = reportsDefProps.ReportSearchInfo.activeFilterMap;
        } else {
            data.searchFilterMap = {};
        }

        updateSearchCriteria( data );
        data.showSearchFilter = true;
        eventBus.publish( 'reportSearchResultItems.doSearch' );
    }
};

export let setReportElementPropertyValue = function( property, displayValue, value ) {
    uwPropSrv.setDisplayValue( property, displayValue );
    uwPropSrv.setDirty( property, true );
    if( value !== undefined ) {
        uwPropSrv.setValue( property, value );
    }
};

export let collapseGivenSection = function( sectionName ) {
    if( angular.element( sectionName ).isolateScope().collapsed === 'true' ) {
        angular.element( sectionName ).isolateScope().flipSectionDisplay();
    }
};

/**
 * @param  {any} data -
 * @param  {any} reportDefProps -
 * @param  {any} reportsRuntimeInfo -
 * @param  {any} ChartVisibility -
 *
 * @todo Need to set dbValue and display value differenty in case of L10N property values.
 * @todo collapse filled section needs to be handled when reveal is complete.
 *
 */
export let setupExistingLayoutElements = function( data, reportDefProps, reportsRuntimeInfo, ChartVisibility ) {
    var isThumbnailChartExist = false;
    for( var key in reportDefProps ) {
        if( key === 'ReportTitle' ) {
            data.titleColorList = reportsRuntimeInfo.ColorVmProps;
            data.titleFontList = reportsRuntimeInfo.FontVmProps;
        } else if( key === 'ReportChart1' ) {
            //exports.setReportElementPropertyValue( data.chart1ByProperty, reportDefProps[ key ].ChartPropName, reportDefProps[ key ].ChartPropInternalName );

            data.addChart1.dbValue = false;
            data.removeChart1.dbValue = true;
            data.chartTypeList = reportsRuntimeInfo.ChartTypeVmProps;
            ChartVisibility.chart1Visible = true;
        } else if( key === 'ReportChart2' ) {
            //exports.setReportElementPropertyValue( data.chart2ByProperty, reportDefProps[ key ].ChartPropName, reportDefProps[ key ].ChartPropInternalName );

            data.addChart2.dbValue = false;
            data.removeChart2.dbValue = true;
            data.chartTypeList = reportsRuntimeInfo.ChartTypeVmProps;
            ChartVisibility.chart2Visible = true;
        } else if( key === 'ReportChart3' ) {
            //exports.setReportElementPropertyValue( data.chart3ByProperty, reportDefProps[ key ].ChartPropName, reportDefProps[ key ].ChartPropInternalName );

            data.addChart3.dbValue = false;
            data.removeChart3.dbValue = true;
            data.chartTypeList = reportsRuntimeInfo.ChartTypeVmProps;
            ChartVisibility.chart3Visible = true;
        } else if( key === 'ReportTable1' ) {
            exports.setReportElementPropertyValue( data.tableColumnList, reportDefProps[ key ].ColumnPropName, reportDefProps[ key ].ColumnPropInternalName );
        } else if( key === 'ThumbnailChart' ) {
            if( reportDefProps[ key ].ChartName === reportsCommonService.getReportChart1() ) {
                data.chart1Thumbnail.dbValue = true;
            } else if( reportDefProps[ key ].ChartName === reportsCommonService.getReportChart2() ) {
                data.chart2Thumbnail.dbValue = true;
            } else if( reportDefProps[ key ].ChartName === reportsCommonService.getReportChart3() ) {
                data.chart3Thumbnail.dbValue = true;
            } else if( reportDefProps[ key ].ChartName === reportsCommonService.getReportTable1() ) {
                data.table1Thumbnail.dbValue = true;
            }
            isThumbnailChartExist = true;
        }
    }
    if( !isThumbnailChartExist ) {
        data.chart1Thumbnail.dbValue = true;
    }
};

export let setupLayoutPanelProperties = function( data ) {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    if( reportsCtx.ReportDefProps ) {
        var ChartVisibility = {
            chart1Visible: false,
            chart2Visible: false,
            chart3Visible: false
        };
        var reportConfProps = JSON.parse( JSON.stringify( reportsCtx.ReportDefProps ) );
        var reportsRuntimeInfo = JSON.parse( JSON.stringify( reportsCtx.RuntimeInformation ) );
        exports.setupExistingLayoutElements( data, reportConfProps, reportsRuntimeInfo, ChartVisibility );
        reportsCtx.ChartVisibility = ChartVisibility;
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportsCtx );
        if( appCtxService.ctx.state.params.referenceId === 'edit' && appCtxService.ctx.ReportsContext.showPreview === false ) {
            eventBus.publish( 'ShowReportService.InitiateReportDisplay' );
        }
    }
    if( data.titleColorList === undefined && data.titleFontList === undefined ) {
        reportsRuntimeInfo = JSON.parse( JSON.stringify( reportsCtx.RuntimeInformation ) );
        data.titleColorList = reportsRuntimeInfo.ColorVmProps;
        data.titleFontList = reportsRuntimeInfo.FontVmProps;
    }
    populateFilterPropList( '', '', '', data );
    if( data.titleText.dbValue === '' ) {
        var stateCtx = appCtxService.getCtx( 'state' );
        exports.setReportElementPropertyValue( data.titleText, [ '' ], stateCtx.params.title );
    }
};

/**
 * @param  {string} chartId - Id
 * @param  {any} reportsCtx - reports ctx
 * @param  {string} chartTitle - The title property
 * @param  {string} chartType - The type property
 * @param  {boolean} addChart - add chart?
 * @param  {boolean} removeChart - remove chart?
 * @param {boolean}
 */
export let genericChartAddParameterUpdate = function( chartId, reportsCtx, chartTitle, chartType, addChart, removeChart, chartByProp, data ) {
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportsCtx.reportParameters );

    addChart.dbValue = false;
    removeChart.dbValue = true;
    chartTitle.dbValue = '';
    if( data.chartTypeList.length !== 0 ) {
        chartType.dbValue = data.chartTypeList[0].propInternalValue;
        chartType.uiValue = data.chartTypeList[0].propDisplayValue;
    }

    if( data.filterProps.length !== 0 ) {
        chartByProp.dbValue = data.filterProps[0].propInternalValue;
        chartByProp.uiValue = data.filterProps[0].propDisplayValue;
    }

    if( angular.element( chartId ).isolateScope() && angular.element( chartId ).isolateScope().collapsed === 'true' ) {
        angular.element( chartId ).isolateScope().flipSectionDisplay();
    }
};

/**
 * @param  {string} chartId - id
 * @param  {string} reportsCtx - reports context
 * @param  {boolean} addChart - add chart?
 * @param  {boolean} removeChart - remove chart?
 * @param  {string} chartByProp - The ChartBy property
 */
export let genericChartRemoveParameterUpdate = function( chartId, reportsCtx, addChart, removeChart, chartByProp ) {
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportsCtx.reportParameters );

    addChart.dbValue = true;
    removeChart.dbValue = false;
    chartByProp.dbValue = '';
    chartByProp.uiValue = '';
};

/**
 * Add a new chart section on Set Layout Panel
 * Additionally set properties.
 *
 * @param {*} data
 */
export let setLayoutAddNewChart = function( data ) {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );
    if( data.chartTypeList.length === 0 ) {
        data.chartTypeList = reportsCtx.reportParameters.RuntimeInformation.ChartTypeVmProps;
    }
    if( data.addChart1.dbValue ) {
        reportsCtx.reportParameters.ChartVisibility.chart1Visible = true;
        genericChartAddParameterUpdate( '#ReportsChart1', reportsCtx, data.chart1Title, data.chart1Type, data.addChart1, data.removeChart1, data.chart1ByProperty, data );

        //Set Chart1 as default Thumbnail Chart
        if(  data.chart1Thumbnail.dbValue === '' && data.chart2Thumbnail.dbValue === '' && data.chart3Thumbnail.dbValue === ''  ) {
            data.chart1Thumbnail.dbValue = true;
        }
    } else if( data.addChart2.dbValue ) {
        reportsCtx.reportParameters.ChartVisibility.chart2Visible = true;
        genericChartAddParameterUpdate( '#ReportsChart2', reportsCtx, data.chart2Title, data.chart2Type, data.addChart2, data.removeChart2, data.chart2ByProperty, data );
    } else if( data.addChart3.dbValue ) {
        reportsCtx.reportParameters.ChartVisibility.chart3Visible = true;
        genericChartAddParameterUpdate( '#ReportsChart3', reportsCtx, data.chart3Title, data.chart3Type, data.addChart3, data.removeChart3, data.chart3ByProperty, data );
    }
};

/**
 * @param  {any} addChart1 - Add Chart?
 * @param  {any} removeChart1 - Remove Chart?
 * @param  {string} chartByProp - The ChartBy property
 */
export let setRemoveChart1ReportParameter = function( addChart1, removeChart1, chartByProp ) {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );
    reportsCtx.reportParameters.ChartVisibility.chart1Visible = false;
    this.genericChartRemoveParameterUpdate( '#ReportsChart1', reportsCtx, addChart1, removeChart1, chartByProp );
};

/**
 * @param  {any} addChart2 - Add Chart?
 * @param  {any} removeChart2 - Remove Chart?
 * @param  {string} chartByProp - The ChartBy property
 */
export let setRemoveChart2ReportParameter = function( addChart2, removeChart2, chartByProp ) {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );
    reportsCtx.reportParameters.ChartVisibility.chart2Visible = false;
    this.genericChartRemoveParameterUpdate( '#ReportsChart2', reportsCtx, addChart2, removeChart2, chartByProp );
};

/**
 * @param  {any} addChart3 - Add Chart?
 * @param  {any} removeChart3 - Remove Chart?
 * @param  {string} chartByProp - The ChartBy property
 */
export let setRemoveChart3ReportParameter = function( addChart3, removeChart3, chartByProp ) {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );
    reportsCtx.reportParameters.ChartVisibility.chart3Visible = false;
    this.genericChartRemoveParameterUpdate( '#ReportsChart3', reportsCtx, addChart3, removeChart3, chartByProp );
};

export let getTitleElement = function( data ) {
    return {
        TitleText: data.titleText.dbValue,
        TitleColor: data.titleColor.dbValue,
        TitleDispColor: data.titleColor.displayValues[ 0 ],
        TitleFont: data.titleFont.dbValue,
        TitleDispFont: data.titleFont.displayValues[ 0 ]
    };
};

export let checkIfTitleNeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var title = reportsCtx.reportParameters.ReportDefProps.ReportTitle;
    if( title && data.titleText.dbValue === '' ) {
        // Title is removed
        delete reportsCtx.reportParameters.ReportDefProps.ReportTitle;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportTitle' );
    } else if( title && ( title.TitleText !== data.titleText.dbValue || title.TitleColor !== data.titleColor.dbValue || title.TitleFont !== data.titleFont.dbValue ) ) {
        // Title is updated
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportTitle' );
        reportsCtx.reportParameters.ReportDefProps.ReportTitle = exports.getTitleElement( data );
    } else if( title === undefined && data.titleText.dbValue !== undefined && data.titleText.dbValue !== '' ) {
        //Title is newly added
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportTitle' );
        reportsCtx.reportParameters.ReportDefProps.ReportTitle = exports.getTitleElement( data );
    }
};

export let getChart1Element = function( data ) {
    return {
        ChartTitle: data.chart1Title.dbValue,
        ChartType: data.chart1Type.uiValue,
        ChartTpIntName: data.chart1Type.dbValue,
        ChartPropName: data.chart1ByProperty.uiValue,
        ChartPropInternalName: data.chart1ByProperty.dbValue
    };
};

export let checkIfChart1NeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var chart1 = reportsCtx.reportParameters.ReportDefProps.ReportChart1;
    var newChartObj = null;
    if( chart1 && data.chart1ByProperty.uiValue.length === 0 ) {
        //Chart1 mandatory property is removed.
        delete reportsCtx.reportParameters.ReportDefProps.ReportChart1;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportChart1' );
    } else if( chart1 && ( chart1.ChartTitle !== data.chart1Title.dbValue || chart1.ChartType !== data.chart1Type.uiValue ||
            JSON.stringify( data.chart1ByProperty.uiValue ) !== JSON.stringify( chart1.ChartPropName ) ) ) {
        //Chart1 is updated
        newChartObj = JSON.parse( JSON.stringify( exports.getChart1Element( data ) ) );
    } else if( chart1 === undefined && reportsCtx.reportParameters.ChartVisibility.chart1Visible && data.chart1ByProperty.dbValue.length !== 0 ) {
        newChartObj = JSON.parse( JSON.stringify( exports.getChart1Element( data ) ) );
    }
    if( newChartObj !== null ) {
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportChart1' );
        reportsCtx.reportParameters.ReportDefProps.ReportChart1 = newChartObj;
    }
};

export let getChart2Element = function( data ) {
    return {
        ChartTitle: data.chart2Title.dbValue,
        ChartType: data.chart2Type.uiValue,
        ChartTpIntName: data.chart2Type.dbValue,
        ChartPropName: data.chart2ByProperty.uiValue,
        ChartPropInternalName: data.chart2ByProperty.dbValue
    };
};

export let checkIfChart2NeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var chart2 = reportsCtx.reportParameters.ReportDefProps.ReportChart2;
    var newChartObj = null;
    if( chart2 && data.chart2ByProperty.uiValue.length === 0 ) {
        //Chart1 mandatory property is removed.
        delete reportsCtx.reportParameters.ReportDefProps.ReportChart2;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportChart2' );
    } else if( chart2 && ( chart2.ChartTitle !== data.chart2Title.dbValue || chart2.ChartType !== data.chart2Type.uiValue ||
            JSON.stringify( data.chart2ByProperty.uiValue ) !== JSON.stringify( chart2.ChartPropName ) ) ) {
        //Chart1 is updated
        newChartObj = JSON.parse( JSON.stringify( exports.getChart2Element( data ) ) );
    } else if( chart2 === undefined && reportsCtx.reportParameters.ChartVisibility.chart2Visible && data.chart2ByProperty.dbValue.length !== 0 ) {
        newChartObj = JSON.parse( JSON.stringify( exports.getChart2Element( data ) ) );
    }
    if( newChartObj !== null ) {
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportChart2' );
        reportsCtx.reportParameters.ReportDefProps.ReportChart2 = newChartObj;
    }
};

export let getChart3Element = function( data ) {
    return {
        ChartTitle: data.chart3Title.dbValue,
        ChartType: data.chart3Type.uiValue,
        ChartTpIntName: data.chart3Type.dbValue,
        ChartPropName: data.chart3ByProperty.uiValue,
        ChartPropInternalName: data.chart3ByProperty.dbValue
    };
};

export let checkIfChart3NeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var chart3 = reportsCtx.reportParameters.ReportDefProps.ReportChart3;
    var newChartObj = null;
    if( chart3 && data.chart3ByProperty.uiValue.length === 0 ) {
        //Chart3 mandatory property is removed.
        delete reportsCtx.reportParameters.ReportDefProps.ReportChart3;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportChart3' );
    } else if( chart3 && ( chart3.ChartTitle !== data.chart3Title.dbValue || chart3.ChartType !== data.chart3Type.uiValue ||
            JSON.stringify( data.chart3ByProperty.uiValue ) !== JSON.stringify( chart3.ChartPropName ) ) ) {
        //Chart3 is updated
        newChartObj = JSON.parse( JSON.stringify( exports.getChart3Element( data ) ) );
    } else if( chart3 === undefined && reportsCtx.reportParameters.ChartVisibility.chart3Visible && data.chart3ByProperty.dbValue.length !== 0 ) {
        newChartObj = JSON.parse( JSON.stringify( exports.getChart3Element( data ) ) );
    }
    if( newChartObj !== null ) {
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportChart3' );
        reportsCtx.reportParameters.ReportDefProps.ReportChart3 = newChartObj;
    }
};

export let getTable1Element = function( data ) {
    return {
        ColumnPropInternalName: data.tableColumnList.dbValue,
        ColumnPropName: data.tableColumnList.displayValues
    };
};

export let checkIfTable1NeedsUpdate = function( reportsCtx, data, UpdatedLayoutElement ) {
    var table1 = reportsCtx.reportParameters.ReportDefProps.ReportTable1;
    var newTableObj = null;
    if( table1 && data.tableColumnList.dbValue.length === 0 ) {
        //Table1 mandatory property is removed.
        delete reportsCtx.reportParameters.ReportDefProps.ReportTable1;
        UpdatedLayoutElement.ElementToRemove.push( 'ReportTable1' );
    } else if( table1 && JSON.stringify( table1.ColumnPropName ) !== JSON.stringify( data.tableColumnList.displayValues ) ) {
        //Table1 is updated
        newTableObj = JSON.parse( JSON.stringify( exports.getTable1Element( data ) ) );
    } else if( table1 === undefined && data.tableColumnList.dbValue.length !== 0 ) {
        newTableObj = JSON.parse( JSON.stringify( exports.getTable1Element( data ) ) );
    }

    if( newTableObj !== null ) {
        UpdatedLayoutElement.ElementToUpdate.push( 'ReportTable1' );
        reportsCtx.reportParameters.ReportDefProps.ReportTable1 = newTableObj;
    }
};

var getNumericFilterValue = function( filter ) {
    if( filter.categoryType !== undefined && filter.categoryType === 'NumericRangeFilter' ) {
        var range = filter.name.split( ' - ' );
        return {
            searchFilterType: filter.type,
            stringValue: filter.internalName,
            startNumericValue: Number( range[ 0 ] ),
            endNumericValue: Number( range[ 1 ] ),
            startEndRange: 'NumericRange'
        };
    }
        return {
            searchFilterType: filter.type,
            stringValue: filter.internalName,
            startNumericValue: Number( filter.internalName ),
            endNumericValue: Number( filter.internalName )
        };
};

var getSearchCriteria = function( reportsCtx ) {
    var searchCriteria = appCtxService.getCtx( 'searchCriteria' );
    if( searchCriteria === undefined && reportsCtx.reportParameters && reportsCtx.reportParameters.ReportDefProps ) {
        searchCriteria = reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
    }
    return searchCriteria;
};

export let updateReportSearchInfo = function( reportsCtx ) {
    var searchInContext = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    if( searchInContext && searchInContext.searchResultFilters ) {
        var ReportSearchInfo = {};

        ReportSearchInfo.SearchCriteria = getSearchCriteria( reportsCtx );

        var activeFilterMap = {};
        var activeDateFilters = [];
        searchInContext.searchResultFilters.forEach( element => {
            var filterCategory = element.searchResultCategoryInternalName;
            var compiledfilters = [];
            element.filterValues.forEach( filter => {
                var filterVals = {};
                if( filter.type !== 'DateFilter' && filter.type !== 'DrilldownDateFilter' ) {
                    if( filter.type === 'NumericFilter' ) {
                        filterVals = getNumericFilterValue( filter );
                    } else {
                        filterVals.searchFilterType = filter.type;
                        filterVals.stringValue = filter.internalName;
                    }
                    compiledfilters.push( filterVals );
                } else {
                    if( !activeDateFilters.includes( element ) ) {
                        activeDateFilters.push( element );
                    }
                }
            } );
            if( compiledfilters.length > 0 ) {
                activeFilterMap[ filterCategory ] = compiledfilters;
            }
        } );

        if( activeDateFilters.length > 0 ) {
            activeDateFilters.forEach( element => {
                element.filterValues.forEach( filter => {
                    var filterVals = {};
                    var filterType = 'DateFilter';
                    var filterCategory = filter.categoryName;
                    if( ( filter.type === 'DrilldownDateFilter' || filter.type === 'DateFilter' ) && filter.categoryName !== undefined && ( filter.categoryName.endsWith( '0Z0_week' ) || filter.categoryName.endsWith( '0Z0_year_month_day' ) ||
                            filter.categoryName.endsWith( '0Z0_year' ) || filter.categoryName.endsWith( '0Z0_year_month' ) ) ) {
                        filterType = 'StringFilter';
                        filterVals.searchFilterType = filterType;
                        filterVals.stringValue = filter.internalName;
                    } else if( filter.categoryType !== undefined && filter.categoryType === 'DateRangeFilter' ) {
                        filterCategory = element.searchResultCategoryInternalName;
                        filterVals.searchFilterType = filter.type;
                        var dateCat = searchInContext.searchFilterCategories.filter( function( category ) {
                            return category.internalName === element.searchResultCategoryInternalName;
                        } );
                        var startValue = dateCat[ 0 ].daterange.startDate.dateApi.dateObject;
                        var endValue = dateCat[ 0 ].daterange.endDate.dateApi.dateObject;
                        var internalName = filterPanelUtils.getDateRangeString( startValue, endValue );
                        var dateRangeFilter = filterPanelUtils.getDateRangeFilter( internalName.substring( 12, internalName.length ) );
                        filterVals.startDateValue = dateRangeFilter.startDateValue;
                        filterVals.endDateValue = dateRangeFilter.endDateValue;
                    }
                    var tempArray = [];
                    tempArray.push( filterVals );
                    if( activeFilterMap.hasOwnProperty( filterCategory ) ) {
                        var existArray = activeFilterMap[ filterCategory ];
                        existArray.push( filterVals );
                        activeFilterMap[ filterCategory ] = existArray;
                    } else {
                        activeFilterMap[ filterCategory ] = tempArray;
                    }
                } );
            } );
        }

        ReportSearchInfo.activeFilterMap = activeFilterMap;
        reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo = ReportSearchInfo;
    }
};

var getItemReportClassParameters = function( reportParams ) {
    return {
        rootClassUid: reportParams.rootObjectSelected.uid,
        rootSampleUid: reportParams.rootSampleObjectSelected.uid
    };
};

/**
 *  Store Segment information.
 *
 * @param {*} data  -
 * @param {*} existSegment -
 * @returns {*} segement parameters
 */
var getItemReportSegmentTreeParams = function( data, existSegment ) {
    var treeSegment = data.dataforSegmentTree[ 0 ].children[ 0 ];
    var segmentParams = [];
    for( var i = 0; i < data.segments.length; i++ ) {
        var segment = data.segments[ i ];
        var relRefType = reportsCommonService.getRelationTraversalType( segment, existSegment );
        segmentParams.push( {
            TreeVal: treeSegment.label,
            Direction: segment.props.fnd0Direction.dbValue,
            Destination: segment.props.fnd0DestinationType.dbValue,
            RelOrRef: segment.props.fnd0RelationOrReference.dbValue,
            Source: segment.props.fnd0SourceType.dbValue,
            RelRefType: relRefType
        } );
        treeSegment = treeSegment.children[ 0 ];
    }
    return segmentParams;
};

/**
 * Function to set report ctx parameters.
 *
 * @param  {any} data - The data
 */
export let setupReportxContext = function( data ) {
    var ReportDefProps = {};
    var UpdatedLayoutElement = {
        ElementToRemove: [],
        ElementToUpdate: []
    };

    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );

    if( data.totalFound === 0 ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'previewFailedNoObjectMessage' );
        return;
    }

    if( reportsCtx.reportParameters.ReportDefProps === undefined ) {
        //Setup Context for initial Report Preview..
        //Report Title Properties.
        if( data.titleText.dbValue !== undefined && data.titleText.dbValue !== '' ) {
            ReportDefProps.ReportTitle = exports.getTitleElement( data );
        }
        //Report Charts Properties
        if( reportsCtx.reportParameters.ChartVisibility.chart1Visible && data.chart1ByProperty.dbValue.length !== 0 ) {
            ReportDefProps.ReportChart1 = exports.getChart1Element( data );
        }

        if( reportsCtx.reportParameters.ChartVisibility.chart2Visible && data.chart2ByProperty.dbValue.length !== 0 ) {
            ReportDefProps.ReportChart2 = exports.getChart2Element( data );
        }

        if( reportsCtx.reportParameters.ChartVisibility.chart3Visible && data.chart3ByProperty.dbValue.length !== 0 ) {
            ReportDefProps.ReportChart3 = exports.getChart3Element( data );
        }

        // Report Tables..
        if( data.tableColumnList.dbValue.length !== 0 ) {
            ReportDefProps.ReportTable1 = JSON.parse( JSON.stringify( exports.getTable1Element( data ) ) );
        }

        if( reportsCtx.reportParameters.RuntimeInformation.ThumbnailChart !== undefined ) {
            ReportDefProps.ThumbnailChart = reportsCtx.reportParameters.RuntimeInformation.ThumbnailChart;
        }

        if( reportsCtx.reportParameters.rootObjectSelected &&  reportsCtx.reportParameters.rootSampleObjectSelected ) {
            ReportDefProps.ReportClassParameters = getItemReportClassParameters( reportsCtx.reportParameters );
        }

        if( data.dataforSegmentTree && data.dataforSegmentTree.length > 0 ) {
            ReportDefProps.ReportSegmentParams = getItemReportSegmentTreeParams( data, null );
        }

        reportsCtx.reportParameters.ReportDefProps = ReportDefProps;
    } else {
        //Its an update into layout panel, identify modified element
        exports.checkIfTitleNeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        //Check if chart1 is updated.
        exports.checkIfChart1NeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        //Check if chart2 is updated
        exports.checkIfChart2NeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        //Check if chart3 is updated
        exports.checkIfChart3NeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        //Check if Table is updated
        exports.checkIfTable1NeedsUpdate( reportsCtx, data, UpdatedLayoutElement );

        reportsCtx.reportParameters.UpdatedLayoutElement = UpdatedLayoutElement;
        if( reportsCtx.reportParameters.RuntimeInformation.ThumbnailChart !== undefined ) {
            reportsCtx.reportParameters.ReportDefProps.ThumbnailChart = reportsCtx.reportParameters.RuntimeInformation.ThumbnailChart;
        }

        if( reportsCtx.reportParameters.rootObjectSelected &&  reportsCtx.reportParameters.rootSampleObjectSelected ) {
            reportsCtx.reportParameters.ReportDefProps.ReportClassParameters = getItemReportClassParameters( reportsCtx.reportParameters );
        }

        if( data.segments ) {
            reportsCtx.reportParameters.ReportDefProps.ReportSegmentParams = getItemReportSegmentTreeParams( data, reportsCtx.reportParameters );
        }
    }

    // Add Search Parameters....
    exports.updateReportSearchInfo( reportsCtx );

    //Update totalFound-
    reportsCtx.reportParameters.totalFound = data.totalFound;

    //Finally Update then in Ctx
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportsCtx.reportParameters );

    //ReportsContext set now preview can be rendered/updated.
    eventBus.publish( 'ConfigureReportPanel.showReportPreview' );
};

/* *
 *
 * Get parameters for ReportDefinition properties.
 *
 * @param  {any} data - Data
 *
 */
export let getReportParameterAndValues = function( data ) {
    var vecNameVal = [];

    if( data.totalFound === 0 ) {
        messagingService.reportNotyMessage( data, data._internal.messages, 'saveFailedNoObjectMessage' );
        return vecNameVal;
    }

    //Ensure Preview is updated before going to Save the report.
    exports.setupReportxContext( data );

    var reportsDefProps = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    var params = [];
    var paramValues = [];

    //Currently we need to break Filter and table columns strings due to size restrictions from
    //setProperties() SOA. We may need to find better solution in future releases.
    for( var key in reportsDefProps ) {
        if( key === 'ReportSearchInfo' ) {
            var counter = 0;
            for( var actvFilter in reportsDefProps[ key ].activeFilterMap ) {
                var filterName = 'ReportFilter_' + counter.toString();
                params.push( filterName );
                paramValues.push( actvFilter );

                //start processing filters, max filter string length can be 240
                var filterStr = JSON.stringify( reportsDefProps[ key ].activeFilterMap[ actvFilter ] );
                var filterValue;
                if( filterStr.length < 240 ) {
                    filterValue = 'ReportFilterValue_' + counter.toString();
                    params.push( filterValue );
                    paramValues.push( JSON.stringify( reportsDefProps[ key ].activeFilterMap[ actvFilter ] ) );
                    counter++;
                } else {
                    var filtCounter = 0;
                    filterValue = 'ReportFilterLargeValue_' + counter.toString() + '_';
                    var filterValues = reportsDefProps[ key ].activeFilterMap[ actvFilter ];
                    filterValues.forEach( val => {
                        params.push( filterValue + filtCounter );
                        paramValues.push( JSON.stringify( val ) );
                        filtCounter++;
                    } );
                }
            }
            params.push( 'ReportSearchCriteria' );
            paramValues.push( reportsDefProps[ key ].SearchCriteria );

            if ( appCtxService.ctx.ReportsContext.translatedSearchCriteria && appCtxService.ctx.ReportsContext.translatedSearchCriteria.length > 0 ) {
                _.forEach( appCtxService.ctx.ReportsContext.translatedSearchCriteria, function( value ) {
                    if ( value && value.length > 0 ) {
                        params.push( 'ReportTranslatedSearchCriteria' );
                        paramValues.push( value );
                    }
                } );
            }
        } else if( key === 'ReportTable1' ) {
            params.push( 'ReportTable1ColumnPropName' );
            paramValues.push( JSON.stringify( reportsDefProps[ key ].ColumnPropName ) );

            //Divide columns in half and then convert its string.
            var halfLen = Math.ceil( reportsDefProps[ key ].ColumnPropInternalName.length / 2 );
            var PropNameList1 = reportsDefProps[ key ].ColumnPropInternalName.slice( 0, halfLen );
            var PropNameList2 = reportsDefProps[ key ].ColumnPropInternalName.slice( halfLen, reportsDefProps[ key ].ColumnPropInternalName.lengthF );

            params.push( 'ReportTable1ColumnPropInternalName_0' );
            paramValues.push( JSON.stringify( PropNameList1 ) );

            params.push( 'ReportTable1ColumnPropInternalName_1' );
            paramValues.push( JSON.stringify( PropNameList2 ) );
        } else if( key === 'ReportChart1' || key === 'ReportChart2' || key === 'ReportChart3' ) {
            var newChartObj1 = JSON.parse( JSON.stringify( reportsDefProps[ key ] ) );

            var chrtIntProps = JSON.stringify( newChartObj1.ChartPropInternalName );
            //now remove chart props
            delete newChartObj1.ChartPropInternalName;
            var remainChartStr = JSON.stringify( newChartObj1 );
            params.push( key + '_0' );
            paramValues.push( remainChartStr );

            params.push( key + '_1' );
            paramValues.push( chrtIntProps );
        } else if( key === 'ThumbnailChart' ) {
            params.push( key );
            paramValues.push( reportsDefProps[ key ].ChartName );
        } else if( key === 'ReportSegmentParams' ) {
            counter = 0;
            _.forEach( reportsDefProps[ key ], function( value ) {
                params.push( 'ReportSegment' + ( 1 + counter ) );
                paramValues.push( JSON.stringify( value ) );
                counter++;
            } );
        } else {
            params.push( key );
            paramValues.push( JSON.stringify( reportsDefProps[ key ] ) );
        }
    }

    vecNameVal.push( {
        name: 'rd_parameters',
        values: params
    } );

    vecNameVal.push( {
        name: 'rd_param_values',
        values: paramValues
    } );

    if( appCtxService.ctx.state.params.reportType === '1' ) {
        var selectedRoot = appCtxService.getCtx( 'ReportsContext.reportParameters.rootSampleObjectSelected' );
        var rootType = selectedRoot ? selectedRoot.type : '';
        vecNameVal.push( {
            name: 'rd_class',
            values: [ rootType ]
        } );

        vecNameVal.push( {
            name: 'fnd0IsClassOnly',
            values: [ 'true' ]
        } );
    }

    return vecNameVal;
};

/**
 * @param  {any} data - the
 */
export let searchPageRevealed = function( data ) {
    var reportsDefProps = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    if( reportsDefProps && reportsDefProps.ReportSearchInfo !== undefined ) {
        uwPropSrv.updateDisplayValues( data.searchBox, [ reportsDefProps.ReportSearchInfo.SearchCriteria ] );
        uwPropSrv.setValue( data.searchBox, [ reportsDefProps.ReportSearchInfo.SearchCriteria ] );

        // showSearchFilter is set for the condition of showing the Search-Filter panel
        data.showSearchFilter = true;
        data.selectedSearchFilters = [];
        updateSearchCriteria( data );
    }
};

export let resultsPageRevealed = function( data ) {
    var reportsDefProps = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps' );
    if( reportsDefProps && reportsDefProps.ReportSearchInfo !== undefined ) {
        //prepare searchFilterMap
        data.searchFilterMap = reportsDefProps.ReportSearchInfo.activeFilterMap;

        filterPanelUtils.setHasTypeFilter( false );
        filterPanelUtils.setPresetFilters( true );
        filterPanelUtils.saveIncontextFilterMap( data );
        eventBus.publish( 'searchResultItems.doConfigureReportSearch' );
    }
};

export let getObjectTypeList = function() {
    var searchContext = appCtxService.getCtx( 'ReportsContext.searchIncontextInfo' );
    var objectTypes = [];
    if( searchContext && searchContext.searchFilterMap ) {
        if( searchContext.searchResultFilters && searchContext.searchResultFilters.length > 1 ) {
            searchContext.searchResultFilters.forEach( resultFilter => {
                if( resultFilter.searchResultCategoryInternalName === 'WorkspaceObject.object_type' ) {
                    resultFilter.filterValues.forEach( filter => {
                        objectTypes.push( filter.internalName );
                    } );
                }
            } );
        }
        if( objectTypes.length === 0 ) {
            var typeFilters = searchContext.searchFilterMap[ 'WorkspaceObject.object_type' ];
            if( typeFilters !== undefined && typeFilters.length > 0 ) {
                typeFilters.forEach( filter => {
                    objectTypes.push( filter.stringValue );
                } );
            }
        }
    }
    return objectTypes;
};

export let getObjectPropertyListFromPreference = function( data ) {
    var prefObjPropList = [];
    if( 'preferences' in data && 'REPORT_AW_ObjectType_Properties' in data.preferences ) {
        prefObjPropList = data.preferences.REPORT_AW_ObjectType_Properties;
    }

    var prefObjProps = {};
    _.forEach( prefObjPropList, function( objPropStr ) {
        var objPropStrSplit = objPropStr.split( ':' );
        //TODO remove {} from prop list, need to change once server CP is modified.
        var propList = objPropStrSplit[ 1 ].replace( '{', '' ).replace( '}', '' );
        prefObjProps[ objPropStrSplit[ 0 ] ] = propList.split( ',' );
    } );
    return prefObjProps;
};

export let getVMObjectPropertyListFromPreference = function( data ) {
    //Object types returned in search
    var objTypes = exports.getObjectTypeList();

    //Now get the prop names from Report preferences...
    var prefObjProps = exports.getObjectPropertyListFromPreference( data );

    var allObjProps = [];
    if( objTypes.length > 0 && prefObjProps ) {
        for( var key in prefObjProps ) {
            //Check if ObjectType is specified in preferences.
            if( _.includes( objTypes, key ) ) {
                //Get cached type value
                var propList = prefObjProps[ key ];
                var objType = cmm.getType( key );

                var objProps = [];
                var objPropInterName = [];
                //Get property display and internal name..
                _.forEach( propList, function( currPropName ) {
                    if( objType !== null && objType.propertyDescriptorsMap[ currPropName ] ) {
                        objProps.push( objType.propertyDescriptorsMap[ currPropName ].displayName );
                        objPropInterName.push( key + '.' + currPropName );
                    }
                } );
                if( objProps.length > 0 ) {
                    //Create VM props
                    var vmObjPros = listBoxService.createListModelObjectsFromStrings( objProps );
                    for( var index = 0; index < vmObjPros.length; index++ ) {
                        vmObjPros[ index ].propInternalValue = objPropInterName[ index ];
                    }
                    //get
                    allObjProps.push.apply( allObjProps, vmObjPros );
                }
            }
        }
    }
    return allObjProps;
};

export let getFileredWsoProps = function( data, wsoProps, serchFiltrProps ) {
    var filteredWsoProp = [];
    if( wsoProps && wsoProps.length === 0 ) {
        wsoProps = exports.getWSOPreferenceProps( data );
    }
    if( wsoProps.length > 0 && serchFiltrProps.length > 0 ) {
        wsoProps.forEach( function( wsoProp ) {
            var propFound = false;
            serchFiltrProps.forEach( function( filtrProp ) {
                if( filtrProp.propDisplayValue === wsoProp.propDisplayValue ) {
                    propFound = true;
                }
            } );
            if( propFound ) {
                filteredWsoProp.push( wsoProp );
            }
        } );

        filteredWsoProp.forEach( function( propToRemove ) {
            wsoProps.splice( wsoProps.indexOf( propToRemove ), 1 );
        } );
        filteredWsoProp = wsoProps;
    }
    return filteredWsoProp;
};

export let updateReportsCtxForFilters = function( data ) {
    if( appCtxService.ctx.state.params.configure === 'true' ) {
        var reportsCtxRtInfo = appCtxService.getCtx( 'ReportsContext.reportParameters.RuntimeInformation' );

        //process preference 'REPORT_AW_ObjectType_Properties' values and object types found
        //It should generate a common list of VM properties.
        var allObjPropsFromPref = exports.getVMObjectPropertyListFromPreference( data );
        var chartByFilterList = getChartByPropertiesList();
        var finalFilterList = [];
        finalFilterList.push.apply( finalFilterList, chartByFilterList );
        if( reportsCtxRtInfo.ColumnWSOPros ) {
            var filteredWsoProps = exports.getFileredWsoProps( data, reportsCtxRtInfo.ColumnWSOPros, chartByFilterList );
            //TODO Temporary change to use Columns in Item report.
            if( appCtxService.ctx.state.params.reportType === '4' ) {
            finalFilterList.push.apply( finalFilterList, filteredWsoProps );
            }else{
                finalFilterList.push.apply( finalFilterList, reportsCtxRtInfo.ColumnWSOPros );
            }
        }
        if( allObjPropsFromPref.length > 0 ) {
            finalFilterList.push.apply( finalFilterList, allObjPropsFromPref );
        }

        finalFilterList = _.uniqBy( finalFilterList, 'propInternalValue' );
        reportsCtxRtInfo.searchFilterColumnProps = finalFilterList;
        reportsCtxRtInfo.searchFilterChartProps = chartByFilterList;
        data.filterProps = chartByFilterList;
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.RuntimeInformation', reportsCtxRtInfo );

        if( appCtxService.ctx.state.params.referenceId === 'edit' && appCtxService.ctx.ReportsContext.showPreview === false  ) {
            var tab = {
                tabKey: 'layout'
            };
            eventBus.publish( 'awTab.setSelected', tab );
        }
    }

    if( appCtxService.ctx.ReportsContext.showPreview ) {
        eventBus.publish( 'showReportImage.updatePrviewForFilterUpdate' );
    }

    //Need to store Results tab object. So that it can be set as a selectedTab
    //When user navigated back to Search Data from Set Layout
    if( data.selectedTab && data.selectedTab.tabKey === 'results' ) { _selectedReportTab = data.selectedTab; }
};

export let updateTotalFoundCtxValue = function( data ) {
    appCtxService.ctx.ReportsContext.reportParameters.totalFound = data.totalFound;
    eventBus.publish( 'configureReportService.totalFoundUpdateDone' );
};

/**
 * Set Results as a currently selected tab. So the search objects list can be
 * maintained.
 *
 * @param  {any} data - Data
 */
export let setResultsSelectedTab = function( data ) {
    if( _selectedReportTab !== null && _selectedReportTab.tabKey === 'results' ) {
        data.selectedTab = _selectedReportTab;
        data.selectedTab.selectedTab = true;
        eventBus.publish( 'awTab.setSelected', data.selectedTab );
    }
};

var resetThumbnailSelection = function( selectedChart, reportParams, data ) {
    if( selectedChart.propertyName === 'chart1Thumbnail' && reportParams.RuntimeInformation.ThumbnailChart.ChartName === reportsCommonService.getReportChart1() ) {
        data.chart1Thumbnail.dbValue = true;
    } else if( selectedChart.propertyName === 'chart2Thumbnail' && reportParams.RuntimeInformation.ThumbnailChart.ChartName === reportsCommonService.getReportChart2() ) {
        data.chart2Thumbnail.dbValue = true;
    } else if( selectedChart.propertyName === 'chart3Thumbnail' && reportParams.RuntimeInformation.ThumbnailChart.ChartName === reportsCommonService.getReportChart3() ) {
        data.chart3Thumbnail.dbValue = true;
    } else if( selectedChart.propertyName === 'table1Thumbnail' && reportParams.RuntimeInformation.ThumbnailChart.ChartName === reportsCommonService.getReportTable1() ) {
        data.table1Thumbnail.dbValue = true;
    }
};

/**
 * Multiple scenarios handled in this function. Called when user selected Checkbox for setting particular chart as thumbnail.
 * When Chart is selected, other check-boxes are de-selected.
 * When user tries to manually de-select any check-box, it is reset to selected.
 * @param {*} selectedChart - Chart as thumbnail
 * @param {*} data  - Data
 */
export let setChartThumbnailValue = function( selectedChart, data ) {
    var reportParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    if( reportParams.RuntimeInformation.ThumbnailChart === undefined ) {
        reportParams.RuntimeInformation.ThumbnailChart = {};
    }

    if( selectedChart.dbValue ) {
        if( selectedChart.propertyName === 'chart1Thumbnail' ) {
            reportParams.RuntimeInformation.ThumbnailChart.ChartName = reportsCommonService.getReportChart1();
            if( data.chart2Thumbnail.dbValue ) {
                data.chart2Thumbnail.dbValue = false;
            } else if( data.chart3Thumbnail.dbValue ) {
                data.chart3Thumbnail.dbValue = false;
            } else if( data.table1Thumbnail.dbValue ) {
                data.table1Thumbnail.dbValue = false;
            }
        } else if( selectedChart.propertyName === 'chart2Thumbnail' ) {
            reportParams.RuntimeInformation.ThumbnailChart.ChartName = reportsCommonService.getReportChart2();
            if( data.chart1Thumbnail.dbValue ) {
                data.chart1Thumbnail.dbValue = false;
            } else if( data.chart3Thumbnail.dbValue ) {
                data.chart3Thumbnail.dbValue = false;
            } else if( data.table1Thumbnail.dbValue ) {
                data.table1Thumbnail.dbValue = false;
            }
        } else if( selectedChart.propertyName === 'chart3Thumbnail' ) {
            reportParams.RuntimeInformation.ThumbnailChart.ChartName = reportsCommonService.getReportChart3();
            if( data.chart1Thumbnail.dbValue ) {
                data.chart1Thumbnail.dbValue = false;
            } else if( data.chart2Thumbnail.dbValue ) {
                data.chart2Thumbnail.dbValue = false;
            } else if( data.table1Thumbnail.dbValue ) {
                data.table1Thumbnail.dbValue = false;
            }
        } else if( selectedChart.propertyName === 'table1Thumbnail' ) {
            reportParams.RuntimeInformation.ThumbnailChart.ChartName = reportsCommonService.getReportTable1();
            if( data.chart1Thumbnail.dbValue ) {
                data.chart1Thumbnail.dbValue = false;
            } else if( data.chart2Thumbnail.dbValue ) {
                data.chart2Thumbnail.dbValue = false;
            } else if( data.chart3Thumbnail.dbValue ) {
                data.chart3Thumbnail.dbValue = false;
            }
        }
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportParams );
    } else if( !selectedChart.dbValue ) {
        resetThumbnailSelection( selectedChart, reportParams, data );
    }
};

export let updateLayoutPanelForItemReports = function( data ) {
    updateReportsCtxForFilters( data );
    populateFilterPropList( '', '', '', data );
};

/**
 * Service variable initialization
/**
 * @param {any} appCtxService - the
 * @param  {any} listBoxService - the
 *
 * @returns {any} exports - the Exports.
 */

export default exports = {
    populateReportsContext,
    getWSOPreferenceProps,
    setPinnedToForm,
    setUnPinnedToForm,
    getChartByPropertiesList,
    populateFilterPropList,
    populateFilterrColumnPropList,
    callPerformSearch,
    setReportElementPropertyValue,
    collapseGivenSection,
    setupExistingLayoutElements,
    setupLayoutPanelProperties,
    genericChartAddParameterUpdate,
    genericChartRemoveParameterUpdate,
    setRemoveChart1ReportParameter,
    setRemoveChart2ReportParameter,
    setRemoveChart3ReportParameter,
    getTitleElement,
    checkIfTitleNeedsUpdate,
    getChart1Element,
    checkIfChart1NeedsUpdate,
    getChart2Element,
    checkIfChart2NeedsUpdate,
    getChart3Element,
    checkIfChart3NeedsUpdate,
    getTable1Element,
    checkIfTable1NeedsUpdate,
    updateReportSearchInfo,
    setupReportxContext,
    getReportParameterAndValues,
    searchPageRevealed,
    resultsPageRevealed,
    getObjectTypeList,
    getObjectPropertyListFromPreference,
    getVMObjectPropertyListFromPreference,
    getFileredWsoProps,
    updateReportsCtxForFilters,
    updateTotalFoundCtxValue,
    setResultsSelectedTab,
    setChartThumbnailValue,
    setLayoutAddNewChart,
    populatePropetiesOnItemRepEdit
};
app.factory( 'configurereportservice', () => exports );
